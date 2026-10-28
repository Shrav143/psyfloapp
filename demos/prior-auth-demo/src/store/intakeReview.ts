import type { StateCreator } from "zustand";
import { completeness, type CheckItem } from "@/data/intake/checklist";
import { CLINICIAN_AT, staffOf, type LegacyClient } from "@/data/intake/seed";
import { SECTION_LABEL, type AgentTask, type IntakeRecord, type ServiceRecommendation, type TaskGate } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate } from "@/lib/time";
import type { OrgRule } from "@/pages/intake/policy/match";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* Intake: documentation & review, readiness, the handoff to New Case, the AI Assistant's task controls (cancel, undo, approve where the
   approval is the decision itself), organization rules and the July 2027 transition view. Every change by a person writes an audit event. */

export interface IntakeReviewSlice {
  /** An administrator's local rules, labeled "Organization rule, unverified". They never change a DMAS rule. */
  orgRules: OrgRule[];
  addOrgRule: (rule: Omit<OrgRule, "id" | "addedBy" | "addedAt">) => void;
  removeOrgRule: (ruleId: string) => void;

  /** The authorization packet becomes a draft summary. `by` is the agent or person who prepared it. Prepare Authorization (Care planning) opens the linked draft in New Authorization. */
  prepareHandoffDraft: (id: string, by: string) => void;

  /** Closes "needs you" tasks whose decision was made where it belongs (suggestions reviewed, pathway selected...). */
  closeClearedTasks: (id: string, now: number) => void;
  cancelIntakeTask: (id: string, taskId: string) => void;
  /** Undo for the task kinds that define it: a handoff draft goes back to not started; follow-ups are withdrawn. */
  undoIntakeTask: (id: string, taskId: string) => void;
  /** Approve or reject a task whose approval is the decision itself (a simulated message). Never safety, never a field. */
  decideIntakeTask: (id: string, taskId: string, decision: "approved" | "rejected") => void;
  /** A person's own to-do (a registration, a renewal) is done outside Psyflo. */
  completeIntakeTask: (id: string, taskId: string, note: string) => void;
  /** One follow-up task per open item. Returns their ids. */
  createFollowUps: (id: string, items: CheckItem[]) => string[];
  createPersonTask: (id: string, t: { kind: "registration" | "renewal"; action: string; result: string }) => void;

  /** The July 2027 roster status of a legacy client; the linked intake's audit records it. */
  updateTransitionStatus: (clientId: string, status: LegacyClient["status"]) => void;
  /** Opens a transition intake for a client on a retiring service and returns its id. */
  startTransitionIntake: (clientId: string, serviceId: VaServiceId, serviceDate: number) => string | null;
}

export const TRANSITION_LABEL: Record<LegacyClient["status"], string> = {
  not_started: "Not started", review_scheduled: "Review scheduled", assessment_prep: "Assessment preparation", intake_open: "Intake open", pathway_selected: "Pathway selected",
};

let n = 0;
const uidR = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;

/** Whether the decision a task waits on has been made. */
export function gateCleared(r: IntakeRecord, g: TaskGate, now: number): boolean {
  switch (g.kind) {
    case "suggestions": {
      const relevant = r.suggestions.filter((s) => (g.ids ? g.ids.includes(s.id) : !g.sections || g.sections.includes(s.section)));
      return relevant.length > 0 && relevant.every((s) => s.status !== "pending");
    }
    case "pathway":
      return r.pathways.some((p) => p.status === "selected") || (r.pathways.length > 0 && r.pathways.every((p) => p.status === "not_selected"));
    case "handoff":
      return r.handoff.status === "ready" || r.handoff.status === "in_new_case";
    case "assessment":
      return r.assessment.status === "signed";
    case "cans":
      return r.cans?.status === "signed";
    case "safety":
      return !r.safety || r.safety.status !== "open";
    case "check": {
      const items = completeness(r, now);
      return (g.ids ?? []).every((id) => { const i = items.find((x) => x.id === id); return !i || i.status === "complete" || i.status === "na"; });
    }
  }
}

export const createIntakeReviewSlice: StateCreator<AppState, [], [], IntakeReviewSlice> = (set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const task = (id: string, taskId: string) => rec(id)?.tasks.find((t) => t.id === taskId);
  const me = () => meOf(get());
  const myName = () => staffOf(me())?.name ?? "a person";
  const audit = (id: string, action: string, detail?: string, section: AgentTask["section"] = "review") => get().addIntakeAudit(id, { actor: me(), action, detail, section });

  return {
    orgRules: [],
    addOrgRule: (rule) => set((s) => ({ orgRules: [...s.orgRules, { ...rule, id: uidR("org"), addedBy: meOf(s), addedAt: s.clock }] })),
    removeOrgRule: (ruleId) => set((s) => ({ orgRules: s.orgRules.filter((r) => r.id !== ruleId) })),

    prepareHandoffDraft: (id, by) => {
      const r = rec(id);
      if (!r || r.handoff.status !== "not_started") return;
      get().patchIntake(id, (x) => ({ ...x, handoff: { ...x.handoff, status: "draft", createdAt: get().clock, preparedBy: by } }));
      if (by === me()) audit(id, "Prepared the handoff draft");
    },

    closeClearedTasks: (id, now) => {
      const r = rec(id);
      if (!r) return;
      const done = r.tasks.filter((t) => t.status === "needs_you" && t.gate && gateCleared(r, t.gate, now));
      if (!done.length) return;
      get().patchIntake(id, (x) => ({
        ...x,
        tasks: x.tasks.map((t) => {
          if (!done.some((d) => d.id === t.id)) return t;
          const rejected = t.gate?.kind === "suggestions" && x.suggestions.filter((s) => (t.gate?.ids ? t.gate.ids.includes(s.id) : !t.gate?.sections || t.gate.sections.includes(s.section))).every((s) => s.status === "rejected");
          return { ...t, status: "done", approval: t.approval === "required" ? (rejected ? "rejected" : "approved") : t.approval, result: `${t.result ? `${t.result}. ` : ""}Closed: a person decided in ${SECTION_LABEL[t.section ?? "review"]}` };
        }),
      }));
    },
    cancelIntakeTask: (id, taskId) => {
      const t = task(id, taskId);
      if (!t || (t.status !== "queued" && t.status !== "running")) return;
      get().updateIntakeTask(id, taskId, { status: "cancelled", result: `Cancelled by ${myName()}. Nothing was changed.` });
      audit(id, `Cancelled: ${t.action}`, undefined, t.section);
    },
    undoIntakeTask: (id, taskId) => {
      const t = task(id, taskId);
      const r = rec(id);
      if (!t || !r || !t.undoable) return;
      if (t.kind === "handoff") {
        if (r.handoff.status !== "draft") return;
        get().patchIntake(id, (x) => ({ ...x, handoff: { status: "not_started" } }));
      } else if (t.kind === "followups") {
        get().patchIntake(id, (x) => ({ ...x, tasks: x.tasks.map((y) => (t.created?.includes(y.id) && y.status === "needs_you" ? { ...y, status: "cancelled", result: "Withdrawn by Undo" } : y)) }));
      } else return;
      get().updateIntakeTask(id, taskId, { status: "cancelled", undoable: false, result: `${t.result ? `${t.result}. ` : ""}Undone by ${myName()}` });
      audit(id, `Undid: ${t.action}`, t.kind === "handoff" ? "The handoff draft went back to not started" : "The follow-up tasks were withdrawn", t.section);
    },
    decideIntakeTask: (id, taskId, decision) => {
      const t = task(id, taskId);
      if (!t || !t.approveHere || t.status !== "needs_you" || t.gate?.kind === "safety") return;
      get().updateIntakeTask(id, taskId, {
        status: "done", approval: decision, undoable: false,
        result: decision === "approved" ? `Approved by ${myName()} and sent by secure message (simulated)` : `Rejected by ${myName()}. Nothing was sent`,
      });
      audit(id, decision === "approved" ? `Approved and sent (simulated): ${t.action}` : `Rejected: ${t.action}`, decision === "approved" ? "Simulated delivery; no message left the demo" : undefined, t.section);
    },
    completeIntakeTask: (id, taskId, note) => {
      const t = task(id, taskId);
      if (!t || t.status !== "needs_you") return;
      get().updateIntakeTask(id, taskId, { status: "done", result: `${note} Recorded by ${myName()}.` });
      audit(id, `Recorded as done: ${t.action}`, note, t.section);
    },
    createFollowUps: (id, items) =>
      items.map((i) => get().addIntakeTask(id, { role: "completion", action: `Follow up: ${i.label.toLowerCase()}`, section: i.section, status: "needs_you", approval: "none", result: i.detail, kind: "followup", gate: { kind: "check", ids: [i.id] } })),
    createPersonTask: (id, t) => {
      const r = rec(id);
      if (!r || r.tasks.some((x) => x.kind === t.kind && x.status === "needs_you")) return;
      get().addIntakeTask(id, { role: t.kind === "registration" ? "completion" : "coordination", action: t.action, section: "review", status: "needs_you", approval: "none", result: t.result, kind: t.kind });
      audit(id, `Created a task: ${t.action}`);
    },

    updateTransitionStatus: (clientId, status) => {
      const c = get().legacyRoster.find((x) => x.id === clientId);
      if (!c || c.status === status) return;
      get().setLegacyStatus(clientId, status);
      if (c.intakeId && rec(c.intakeId)) audit(c.intakeId, `Transition status: ${TRANSITION_LABEL[status].toLowerCase()}`, `${c.id} on the July 2027 roster`);
    },
    startTransitionIntake: (clientId, serviceId, serviceDate) => {
      const s = get();
      const c = s.legacyRoster.find((x) => x.id === clientId);
      if (!c) return null;
      if (c.intakeId && s.intakes.some((r) => r.id === c.intakeId)) return c.intakeId;
      const legacy = serviceById(c.serviceId);
      const plan = vaPlanOf(c.payerId);
      const mine = meOf(s);
      const at = s.clock;
      const pathways: ServiceRecommendation[] = c.candidates.map((cand, i) => ({
        id: `pw-${clientId}-${i}`, serviceId: cand, externalLabel: cand === "external" ? "External program (to be named)" : undefined, fit: "not_assessed",
        rationale: `${legacy.short} retires June 30, 2027. An option to review, not a mapping: a clinician decides what fits.`, evidence: [], outstanding: ["Clinical review"],
        availability: cand === "external" ? "external" : serviceById(cand).status === "redesign" ? "not_yet" : "available", referralReqs: [], status: "suggested", suggestedBy: "placement", addedAt: at,
      }));
      const id = s.createIntake({
        serviceId, method: "emr", site: c.site, serviceDate, legacy: { serviceId: c.serviceId, authorizationId: c.authorizationId, authEnds: c.authEnds },
        title: `Existing ${legacy.short} client (${legacy.code}): plan the move before June 30, 2027`, sourceOrg: `Psyflo demo clinic, Site ${c.site} (existing client)`,
        triage: "clinical_review", payerId: c.payerId, initials: c.initials, age: c.age, assignedTo: mine,
        referral: {
          sourceOrg: { value: `Psyflo demo clinic, Site ${c.site} (existing client)`, state: "verified", at, by: mine, reviewedBy: mine, reviewedAt: at },
          reason: { value: `Receives ${legacy.label} (${legacy.code}), which retires June 30, 2027. Needs a clinical review of what fits from July 1, 2027.`, state: "verified", at, by: mine, reviewedBy: mine, reviewedAt: at },
          referringClinician: { value: staffOf(CLINICIAN_AT[c.site])?.name ?? "Site clinician", state: "needs_confirmation", at, by: mine },
        },
        coverage: {
          plan: { value: plan?.name ?? c.payerId, state: "needs_confirmation", at, by: "system", source: { kind: "emr", ref: `Current authorization ${c.authorizationId}` } },
          existingAuths: { value: `${c.authorizationId}: ${legacy.label}, through ${longDate(c.authEnds)}`, state: "document_extracted", at, by: "system", source: { kind: "emr", ref: "Current service record (simulated EMR)" } },
        },
        pathways,
      });
      get().setLegacyStatus(clientId, "intake_open", id);
      get().addIntakeAudit(id, { actor: mine, action: "Started a transition intake from the July 2027 roster", detail: `${c.id} · ${legacy.short} → ${serviceById(serviceId).short} as the first option to review, planned start ${longDate(serviceDate)}`, section: "referral" });
      return id;
    },
  };
};
