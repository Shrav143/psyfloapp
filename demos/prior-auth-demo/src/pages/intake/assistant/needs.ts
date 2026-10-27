import { countBy, isOpen, type CheckItem, type Readiness } from "@/data/intake/checklist";
import { ASSESSMENT_SECTIONS, SECTION_LABEL, type AgentTask, type IntakeRecord, type IntakeSectionId } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { gateCleared } from "@/store/intakeReview";

/* What the assistant panel asks of the person, and the one-paragraph status at its top. Pure: built from the record, the checklist and readiness. */

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
}

/** Safety content in a task: the clinician decides in the assessment, never from the assistant. */
export const isSafetyTask = (t: AgentTask): boolean => t.gate?.kind === "safety" || /safety|risk/i.test(`${t.action} ${t.result ?? ""}`);

export function needsOf(r: IntakeRecord, rd: Readiness, now: number): Need[] {
  const out: Need[] = [];
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
        key: t.id, text: t.action, detail: t.result, agent: t.agent, tone: safety ? "risk" : "mid", task: t, safety,
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
  const handoffTask = out.some((n) => n.task?.kind === "handoff");
  if (!handoffTask && rd.status === "ready" && r.handoff.status !== "ready") out.push({ key: "handoff", text: r.handoff.status === "draft" ? "Approve the handoff packet" : "Ready for handoff: prepare and approve the packet", tone: "mid", to: { section: "review" }, toLabel: "Go to review" });
  if (r.handoff.status === "ready") out.push({ key: "handoff-open", text: "Handoff approved: open it in New Case", tone: "neutral", to: { section: "review" }, toLabel: "Go to review" });
  return out;
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
