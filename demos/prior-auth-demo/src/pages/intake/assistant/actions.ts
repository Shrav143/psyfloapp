import { completeness, countBy, readiness, type CheckItem } from "@/data/intake/checklist";
import { ROLE_AGENT, type AgentTask, type IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { findEvidence as findCansEvidence } from "../cans/evidence";
import { runAgent, type RunAgentOptions } from "../lib/agents";

/* The assistant's quick actions. Each is an agent run (lib/agents.ts) whose work only summarizes, drafts or creates internal tasks; anything
   that changes the record or leaves the clinic waits for a person. Retry re-runs a task from its kind; Undo is defined in the store. */

export type QuickKind = "missing" | "handoff" | "followups" | "request" | "auth-lookup";

const get = (id: string): IntakeRecord | undefined => useStore.getState().intakes.find((r) => r.id === id);

/** "12 complete. Missing: guardian phone, consent. 3 need verification. 2 wait for approval. Blocked: safety alert." */
export function summarize(items: CheckItem[]): string {
  const c = countBy(items);
  const names = (s: CheckItem["status"]) => items.filter((i) => i.status === s).map((i) => i.label.toLowerCase());
  const parts = [`${c.complete} complete`];
  if (c.missing) parts.push(`Missing: ${names("missing").slice(0, 4).join(", ")}${c.missing > 4 ? ` and ${c.missing - 4} more` : ""}`);
  if (c.verify) parts.push(`${c.verify} need verification`);
  if (c.pending) parts.push(`${c.pending} wait for approval`);
  if (c.blocked) parts.push(`Blocked: ${names("blocked").join(", ")}`);
  return `${parts.join(". ")}.`;
}

/** What the referrer can send: missing referral items, consents and releases. */
export function requestable(items: CheckItem[]): CheckItem[] {
  return items.filter((i) => i.status === "missing" && (i.category === "referral" || i.id === "field:profile.schoolConsent" || i.id === "field:profile.consentTreatment" || i.id === "field:profile.guardianPhone" || i.id === "field:profile.guardianName") && i.id !== "triage");
}

function options(kind: QuickKind, recordId: string, now: number, setTask: (patch: Partial<AgentTask>) => void): RunAgentOptions {
  const st = () => useStore.getState();
  switch (kind) {
    case "missing":
      return {
        role: "completion", action: "Check what is missing", section: "review", ms: 1300,
        work: () => { const r = get(recordId); return r ? summarize(completeness(r, now)) : undefined; },
      };
    case "handoff":
      return {
        role: "coordination", action: "Draft the authorization packet", section: "review", ms: 1600,
        work: () => {
          const r = get(recordId);
          if (!r) return undefined;
          st().prepareHandoffDraft(recordId, "navigator");
          const rd = readiness(r, now);
          return `Packet drafted: ${rd.blockers.length ? `${rd.blockers.length} items still stop the handoff` : "nothing stops the handoff"}. Prepare Authorization (opens after the care plan is approved) opens it in New Authorization`;
        },
      };
    case "followups":
      return {
        role: "completion", action: "Create follow-up tasks for the missing items", section: "review", ms: 1200,
        work: () => {
          const r = get(recordId);
          if (!r) return undefined;
          const open = completeness(r, now).filter((i) => i.status === "missing" && !r.tasks.some((t) => t.status === "needs_you" && t.gate?.kind === "check" && t.gate.ids?.includes(i.id)));
          const ids = st().createFollowUps(recordId, open);
          setTask({ created: ids });
          return ids.length ? `Created ${ids.length} internal follow-up tasks: ${open.map((i) => i.label.toLowerCase()).slice(0, 3).join(", ")}${open.length > 3 ? "…" : ""}` : "Nothing missing to follow up";
        },
      };
    case "request":
      return {
        role: "coordination", action: "Draft a request to the referrer for the missing items (simulated message)", section: "referral", approval: "required", ms: 1500,
        work: () => {
          const r = get(recordId);
          if (!r) return undefined;
          const want = requestable(completeness(r, now));
          const to = r.referral.referringClinician?.value || r.sourceOrg;
          return `To ${to}: asks for ${want.map((i) => i.label.toLowerCase()).join(", ") || "the missing items"}. Nothing is sent until a person approves`;
        },
      };
    case "auth-lookup":
      return {
        role: "eligibility", action: "Look up the current MHSS authorization in the plan portal (simulated)", section: "coverage", ms: 1400,
        work: () => {
          const r = get(recordId);
          return r?.legacy ? `Found ${r.legacy.authorizationId} with ${r.payerId ? vaPlanOf(r.payerId)?.name : "the plan"} (simulated): ends ${longDate(r.legacy.authEnds)}` : "Nothing found (simulated)";
        },
      };
  }
}

/** Runs a quick action on a record. Returns the task id, or null when the agent is paused. */
export function runQuick(kind: QuickKind, recordId: string, now: number): string | null {
  let taskId: string | null = null;
  const setTask = (patch: Partial<AgentTask>) => { if (taskId) useStore.getState().updateIntakeTask(recordId, taskId, patch); };
  const o = options(kind, recordId, now, setTask);
  taskId = runAgent(recordId, o);
  if (taskId) {
    const tags: Partial<AgentTask> = { kind };
    if (kind === "handoff") tags.undoable = true;
    if (kind === "followups") tags.undoable = true;
    if (kind === "request") tags.approveHere = true;
    useStore.getState().updateIntakeTask(recordId, taskId, tags);
  }
  return taskId;
}

/** Retry: a new run of the same action. Known kinds re-run their work; any other task re-runs as it was asked. */
export function retryTask(recordId: string, t: AgentTask, now: number): string | null {
  const known: QuickKind[] = ["missing", "handoff", "followups", "request", "auth-lookup"];
  const next = known.includes(t.kind as QuickKind)
    ? runQuick(t.kind as QuickKind, recordId, now)
    : runAgent(recordId, { role: t.role, action: t.action, section: t.section, source: t.source, approval: t.approval === "none" ? "none" : "required" });
  if (next) useStore.getState().updateIntakeTask(recordId, t.id, { retriedAs: next });
  return next;
}

/** Proposes what the clinical assessment already documents to the modules that read it, as pending evidence. Nothing is filled. Returns the task id, or null when the agent is paused. */
export function runFeed(recordId: string): string | null {
  return runAgent(recordId, {
    role: "documentation", action: "Propose the clinical assessment's answers to the assessment modules", section: "assessment", source: "Clinical assessment answers on this record", ms: 1200,
    work: () => {
      const n = useStore.getState().feedModulesFromAssessment(recordId);
      return n ? `${n} ${n === 1 ? "piece" : "pieces"} of evidence wait in their modules for a person to decide` : "Nothing new to propose: every answer has reached the modules that read it";
    },
  });
}

/** The CANS Evidence Agent's simulated reading of the record: statements under Psyflo evidence themes, as proposals a person keeps or discards. Never a rating. */
export function runCansEvidence(recordId: string): string | null {
  return runAgent(recordId, {
    role: "cans", action: "Find evidence for the CANS (simulated reader)", section: "cans", source: "Documents, assessment and transcripts on this record", ms: 1400,
    work: () => {
      const st = useStore.getState();
      const r = get(recordId);
      if (!r) return undefined;
      const items = findCansEvidence(r);
      if (!items.length) return "Nothing new found";
      if (!r.cans) st.startCans(recordId);
      const ids = st.proposeCansEvidence(recordId, items, ROLE_AGENT.cans);
      return `${ids.length} evidence ${ids.length === 1 ? "proposal waits" : "proposals wait"} for a person to keep or discard`;
    },
  });
}

/** A person's own task on the record: it waits as a "needs you" item until they mark it done. It is not an agent and sends nothing. */
export function addPersonalTask(recordId: string, text: string): string {
  const st = useStore.getState();
  const id = st.addIntakeTask(recordId, { role: "completion", action: text, status: "needs_you", approval: "none", result: "Added by a person on this record", kind: "manual" });
  st.addIntakeAudit(recordId, { actor: meOf(st), action: "Added a task", detail: text });
  return id;
}
