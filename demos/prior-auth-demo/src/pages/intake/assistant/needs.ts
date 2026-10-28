import type { WorkspaceTarget } from "@/data/assess/nav";
import { moduleCompletion } from "@/data/assess/completion";
import { isCoreModule, moduleById } from "@/data/assess/modules";
import { SOURCE_LABEL, VERIFICATION_LABEL, type AssessmentPlan, type ModuleId } from "@/data/assess/types";
import { countBy, isOpen, type CheckItem, type Readiness } from "@/data/intake/checklist";
import { activeModuleIds } from "@/data/intake/scripts";
import { ASSESSMENT_SECTIONS, SECTION_LABEL, type AgentTask, type IntakeRecord, type IntakeSectionId } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { gateCleared } from "@/store/intakeReview";
import { planFor } from "@/store/intakePlan";

/* What the assistant panel asks of the person, and the one-paragraph status at its top. Pure: built from the record, the checklist and readiness. */

/** "Why am I suggesting this": what is behind a need or an action, and where it came from. */
export interface Explain {
  why: string;
  /** The record, document, agent or rule it comes from. */
  source: string;
  /** The assessment rule or policy row behind it, with its status. Left out when none applies. */
  rule?: string;
}

export interface Need {
  key: string;
  text: string;
  detail?: string;
  agent?: AgentKey;
  tone: "risk" | "mid" | "neutral";
  /** Where the decision is made. */
  to?: { section: IntakeSectionId; panel?: "scribe" | "voice" };
  toLabel?: string;
  task?: AgentTask;
  /** Safety items are never approvable from the panel. */
  safety?: boolean;
  /** Opens Settings (a paused agent). */
  settings?: boolean;
  /** An agent run that failed: Retry runs it again. */
  retry?: boolean;
  /** Where the work is done in the new workspace, a module included. Prefer it over `to`, which only names a data section. */
  target?: WorkspaceTarget;
  explain?: Explain;
}

/** The explanation for a need that did not come with one, from what kind of need it is. */
function defaultExplain(r: IntakeRecord, n: Need): Explain {
  if (n.key === "safety") return { why: "A safety alert was raised from what was said or written. A clinician reviews every alert; Psyflo never decides that a person is safe.", source: r.safety?.source?.ref ?? "Safety alert on this record" };
  if (n.key.startsWith("sugg-")) return { why: "Agents proposed these values from documents or conversations. Nothing is written to the record until a person accepts, edits or rejects each one.", source: "Agent suggestions, each with its own source (simulated)" };
  if (n.key === "scribe") return { why: "The AI Scribe drafted a note and proposals from the simulated transcript. A person reviews them before anything is saved.", source: "AI Scribe session (simulated audio)" };
  if (n.key === "voice") return { why: "The Voice Intake Assistant collected answers on a simulated call. Staff confirm the read-back before anything is saved.", source: "Voice Intake Assistant call (simulated)" };
  if (n.key.startsWith("handoff")) return { why: "The authorization handoff is a draft until a person approves it. Nothing is submitted from here.", source: "Authorization readiness on this record" };
  return { why: n.detail ?? "Work on this record waits for a person.", source: "Tasks on this record" };
}
const withExplain = (r: IntakeRecord) => (n: Need): Need => (n.explain ? n : { ...n, explain: defaultExplain(r, n) });

/** "Required by State policy, Not verified (rule cpst-adult, va-assess-2027.1)": the rule behind a module, for "Why this module". */
export function ruleLine(plan: AssessmentPlan | null, id: ModuleId): string | undefined {
  const m = plan?.modules.find((x) => x.id === id);
  const src = m?.sources[0];
  return m && src ? `${m.level === "required" ? "Required" : m.level === "recommended" ? "Recommended" : "Optional"} by ${SOURCE_LABEL[src.source]} (${VERIFICATION_LABEL[src.status]}): ${src.ruleLabel}, version ${src.version}` : undefined;
}

const SPECIAL: ModuleId[] = ["cans", "lon"];

/** Needs that come from the assessment modules the intake uses: evidence waiting for a decision, and modules ready for a clinician to sign. */
function moduleNeeds(r: IntakeRecord, plan: AssessmentPlan | null): Need[] {
  if (!r.config) return [];
  const out: Need[] = [];
  const label = (id: ModuleId) => plan?.modules.find((m) => m.id === id)?.label ?? moduleById(id).label;
  const ids = activeModuleIds(r.config).filter((id) => !isCoreModule(id) && !SPECIAL.includes(id));
  for (const id of ids) {
    const inst = r.instruments?.[id];
    const c = moduleCompletion(id, inst);
    if (c.pending) {
      out.push({
        key: `ev:${id}`, text: `${c.pending} ${c.pending === 1 ? "piece" : "pieces"} of evidence in ${label(id)} ${c.pending === 1 ? "waits" : "wait"} for a decision`, detail: "Accept, edit or reject each one. Nothing fills a field until a person decides.",
        tone: "mid", agent: "scribe", target: { section: "instrument", module: id }, toLabel: "Review the evidence",
        explain: { why: "Evidence was proposed for this module and no person has decided on it yet.", source: "Proposed by the AI Scribe or the evidence reader (simulated), each with its source", rule: ruleLine(plan, id) },
      });
    } else if (inst?.status === "awaiting_review") {
      out.push({
        key: `sign:${id}`, text: `${label(id)} is ready for a clinician to sign`, tone: "neutral", target: { section: "instrument", module: id }, toLabel: "Open the module",
        explain: { why: "The module was marked ready for review. Only a qualified clinician signs.", source: "Marked ready for review on this record", rule: ruleLine(plan, id) },
      });
    }
  }
  const idle = ids.filter((id) => plan?.modules.find((m) => m.id === id)?.level === "required" && !plan.modules.find((m) => m.id === id)?.preparation && (r.instruments?.[id]?.status ?? "not_started") === "not_started");
  if (idle.length) {
    out.push({
      key: "modules-idle", text: `${idle.length} required ${idle.length === 1 ? "module has" : "modules have"} not been started`, detail: idle.slice(0, 3).map(label).join(", ") + (idle.length > 3 ? ` and ${idle.length - 3} more` : ""),
      tone: "neutral", target: { section: "instrument", module: idle[0] }, toLabel: `Open ${label(idle[0])}`,
      explain: { why: "The plan for this program requires these modules before the assessment can be signed.", source: "Assessment plan for this intake", rule: ruleLine(plan, idle[0]) },
    });
  }
  return out;
}

/** Safety content in a task: the clinician decides in the assessment, never from the assistant. */
export const isSafetyTask = (t: AgentTask): boolean => t.gate?.kind === "safety" || /safety|risk/i.test(`${t.action} ${t.result ?? ""}`);

export function needsOf(r: IntakeRecord, rd: Readiness, now: number): Need[] {
  const out: Need[] = [];
  const explainTask = (t: AgentTask): Explain => ({ why: t.result ?? "An agent finished work that needs a person's decision.", source: `${t.source ?? "Agent task"} (simulated agent work)` });
  if (r.safety?.status === "open") {
    out.push({ key: "safety", text: "Safety alert: a clinician reviews it before routine scheduling", detail: "Psyflo does not decide that a person is safe.", tone: "risk", to: { section: "assessment" }, toLabel: "Review safety", safety: true });
  }
  const covered = new Set<IntakeSectionId>();
  for (const t of r.tasks) {
    if (t.status === "needs_you" && !(t.gate && gateCleared(r, t.gate, now))) {
      const safety = isSafetyTask(t);
      if (t.gate?.kind === "suggestions") (t.gate.sections ?? (t.section ? [t.section] : [])).forEach((s) => covered.add(s));
      if (t.gate?.kind === "suggestions" && t.gate.ids) r.suggestions.filter((s) => t.gate?.ids?.includes(s.id)).forEach((s) => covered.add(s.section));
      out.push({
        key: t.id, text: t.action, detail: t.result, agent: t.agent, tone: safety ? "risk" : "mid", task: t, safety, explain: explainTask(t),
        to: t.section ? { section: t.section } : undefined,
        toLabel: safety ? "Clinician review" : t.section === "review" ? "Go to review" : t.section ? `Review in ${SECTION_LABEL[t.section]}` : undefined,
      });
    }
    if (t.status === "error" && !t.retriedAs) out.push({ key: t.id, text: `Error: ${t.action}`, detail: t.error, agent: t.agent, tone: "risk", task: t, retry: true });
    if (t.status === "blocked") out.push({ key: t.id, text: `Blocked: ${t.action}`, detail: t.result, agent: t.agent, tone: "neutral", task: t, settings: /paused/i.test(t.result ?? "") });
  }
  const pending = r.suggestions.filter((s) => s.status === "pending" && !covered.has(s.section));
  const bySection = new Map<IntakeSectionId, number>();
  for (const s of pending) bySection.set(s.section, (bySection.get(s.section) ?? 0) + 1);
  for (const [section, n] of bySection) {
    const safety = pending.some((s) => s.section === section && s.field === "safety");
    out.push({
      key: `sugg-${section}`, text: `${n} AI ${n === 1 ? "suggestion" : "suggestions"} in ${SECTION_LABEL[section]}`, detail: safety ? `Includes the ${ASSESSMENT_SECTIONS.find((a) => a.id === "safety")?.label.toLowerCase()}: a clinician reviews it.` : "Accept, edit or reject each one. Nothing is written until you decide.",
      tone: safety ? "risk" : "mid", to: { section }, toLabel: "Review", safety,
    });
  }
  if (r.scribe && (r.scribe.status === "stopped" || r.scribe.status === "reviewing")) out.push({ key: "scribe", text: "AI Scribe draft waits for review", tone: "mid", agent: "scribe", to: { section: "assessment", panel: "scribe" }, toLabel: "Open AI Scribe" });
  if (r.voice && (r.voice.status === "summary" || r.voice.status === "confirm")) out.push({ key: "voice", text: "Voice intake summary waits for confirmation", tone: "mid", to: { section: "profile", panel: "voice" }, toLabel: "Open voice intake" });
  out.push(...moduleNeeds(r, planFor(r, now)));
  const handoffTask = out.some((n) => n.task?.kind === "handoff");
  if (!handoffTask && rd.status === "ready" && r.handoff.status !== "ready") out.push({ key: "handoff", text: r.handoff.status === "draft" ? "Approve the handoff packet" : "Ready for handoff: prepare and approve the packet", tone: "mid", to: { section: "review" }, toLabel: "Go to review" });
  if (r.handoff.status === "ready") out.push({ key: "handoff-open", text: "Handoff approved: open it in New Authorization", tone: "neutral", to: { section: "review" }, toLabel: "Go to review" });
  return out.map(withExplain(r));
}

/** "Referral reviewed. Insurance information found. Guardian phone missing. Clinical assessment has 10 sections without content. Not ready for handoff." */
export function summaryOf(r: IntakeRecord, items: CheckItem[], rd: Readiness): string {
  const inCat = (c: CheckItem["category"]) => items.filter((i) => i.category === c);
  const open = (xs: CheckItem[]) => xs.filter((i) => isOpen(i.status));
  const parts: string[] = [];
  const ref = open(inCat("referral"));
  parts.push(!ref.length ? "Referral reviewed." : ref.some((i) => i.status === "pending" || i.status === "verify") ? `Referral has ${ref.length} ${ref.length === 1 ? "item" : "items"} to review.` : `Referral is missing ${ref.length === 1 ? ref[0].label.toLowerCase() : `${ref.length} items`}.`);
  parts.push(r.payerId ? "Insurance information found." : "No insurance on file.");
  const missing = items.filter((i) => i.status === "missing" && (i.category === "patient" || i.category === "coverage"));
  if (missing.length) parts.push(`${missing.slice(0, 2).map((i) => i.label).join(" and ")}${missing.length > 2 ? ` and ${missing.length - 2} more` : ""} missing.`);
  const content = items.find((i) => i.id === "assess-content");
  const sign = items.find((i) => i.id === "assess-sign");
  if (sign?.status === "complete") parts.push("Clinical assessment attested.");
  else if (content) parts.push(content.status === "missing" ? `Clinical assessment: ${content.detail.toLowerCase()}.` : `Clinical assessment: ${content.detail.split(";")[0].toLowerCase()}, not attested.`);
  if (items.some((i) => i.id === "safety-alert" && i.status === "blocked")) parts.push("Safety alert open.");
  const c = countBy(items);
  if (c.pending) parts.push(`${c.pending} ${c.pending === 1 ? "item waits" : "items wait"} for approval.`);
  parts.push(rd.status === "ready" ? "Ready for coordinator review of the handoff." : rd.status === "handed_off" ? "Handed off to New Case." : rd.status === "not_needed" ? "No authorization handoff needed." : "Not ready for handoff.");
  return parts.join(" ");
}
