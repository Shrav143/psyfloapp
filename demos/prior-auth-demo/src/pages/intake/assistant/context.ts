import { LEGACY_SECTION, type WorkspaceTarget } from "@/data/assess/nav";
import { moduleCompletion } from "@/data/assess/completion";
import { moduleById } from "@/data/assess/modules";
import { overallSignoff } from "@/data/assess/status";
import type { AssessmentPlan, ModuleId } from "@/data/assess/types";
import { completeness, isOpen, readiness } from "@/data/intake/checklist";
import { staffOf } from "@/data/intake/seed";
import { ASSESSMENT_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import { shortDate } from "@/lib/time";
import { feedCount } from "../assessment/feed";
import { GROUPS, groupProgress, sectionLabel } from "../assessment/groups";
import { needsOf, ruleLine, type Explain, type Need } from "./needs";

/* What the assistant says about the section that is open: "What this section needs", and the next actions that fit it. Pure: built from the record, the plan
   and the target, so the panel changes when the section or the module changes. Every line and every action carries its own explanation (source and rule). */

export type ActionId = "record-intake" | "feed" | "request" | "missing" | "followups" | "find-evidence" | "cans-evidence" | "handoff" | "task";
export interface ActionSpec {
  id: ActionId;
  label: string;
  explain: Explain;
  /** Why it cannot run right now. */
  disabled?: string;
  module?: ModuleId;
}
export interface ContextLine {
  key: string;
  text: string;
  detail?: string;
  tone: "risk" | "mid" | "neutral";
  target?: WorkspaceTarget;
  toLabel?: string;
  explain: Explain;
}
export interface Context {
  /** "What the clinical assessment needs" */
  title: string;
  lines: ContextLine[];
  actions: ActionSpec[];
  /** The lines would repeat "Needs you" in the same panel, so the panel leaves them out and shows only the heading's actions. */
  listedBelow?: true;
}

const ex = (why: string, source: string, rule?: string): Explain => ({ why, source, ...(rule ? { rule } : {}) });
const TASK: ActionSpec = { id: "task", label: "Add a task", explain: ex("A task is your own reminder on this record. It is not an agent and sends nothing.", "You, on this record") };
const MISSING: ActionSpec = { id: "missing", label: "What's missing?", explain: ex("Checks every required item on this record and lists what is open.", "The intake checklist, read from this record") };
const documentedBy = (r: IntakeRecord): boolean => !!r.assessment.fields.safety?.value && !!staffOf(r.assessment.fields.safety.by);
const asLine = (n: Need): ContextLine => ({
  key: n.key, text: n.text, detail: n.detail, tone: n.tone, target: n.target ?? (n.to ? LEGACY_SECTION[n.to.section] : undefined), toLabel: n.toLabel,
  explain: n.explain ?? ex(n.detail ?? "Work on this record waits for a person.", "Tasks on this record"),
});

function clinical(r: IntakeRecord, plan: AssessmentPlan | null): Context {
  const lines: ContextLine[] = [];
  const to: WorkspaceTarget = { section: "clinical" };
  for (const g of GROUPS) {
    if (g.id === "safety") continue;
    const p = groupProgress(r, g);
    if (p.done >= p.total) continue;
    const gaps = g.sections.filter((s) => !r.assessment.fields[s]?.value).map((s) => sectionLabel(s).toLowerCase());
    lines.push({
      key: `g:${g.id}`, text: `${g.label}: ${p.done} of ${p.total} documented`, detail: `Not documented: ${gaps.join(", ")}`, tone: "neutral", target: to, toLabel: "Open",
      explain: ex("This part of the shared interview is asked once, and its answers feed the modules that read them.", "Clinical assessment, shared interview", ruleLine(plan, g.module)),
    });
  }
  if (!documentedBy(r)) {
    lines.unshift({
      key: "safety-doc", text: "A clinician documents the safety and risk screening", detail: "AI never decides that a person is safe.", tone: r.safety?.status === "open" ? "risk" : "mid", target: to, toLabel: "Open safety",
      explain: ex("Safety and risk are documented by a clinician in every intake. AI may draft what it heard; it never finalizes risk.", "Core module: Safety assessment", ruleLine(plan, "safety")),
    });
  }
  const drafts = r.suggestions.filter((s) => s.section === "assessment" && s.status === "pending" && s.field !== "safety").length;
  if (drafts) lines.push({ key: "drafts", text: `${drafts} AI ${drafts === 1 ? "draft" : "drafts"} to review`, detail: "Accept, edit or reject each one.", tone: "mid", target: to, toLabel: "Review", explain: ex("Agents proposed these from documents or conversations. Nothing is written until a person decides.", "Agent suggestions, each with its source (simulated)") });
  if (r.scribe && (r.scribe.status === "reviewing" || r.scribe.status === "stopped")) lines.push({ key: "scribe", text: "The Record Intake draft waits for review", tone: "mid", target: to, toLabel: "Open Record Intake", explain: ex("The AI Scribe drafted a note and proposals from the simulated transcript.", "Record Intake session (simulated audio)") });
  const all = ASSESSMENT_SECTIONS.every((s) => !!r.assessment.fields[s.id]?.value);
  if (all && r.assessment.status !== "signed") lines.push({ key: "sign", text: "A qualified clinician signs the assessment", tone: "neutral", target: to, toLabel: "Open", explain: ex("The attestation confirms a clinician reviewed the assessment, including AI-drafted content.", "Core module: Review & sign-off", ruleLine(plan, "review-signoff")) });
  const reuse = feedCount(r);
  return {
    title: "What the clinical assessment needs",
    lines,
    actions: [
      { id: "record-intake", label: "Record Intake", explain: ex("The scribe listens (simulated) for this program's topics and proposes what it hears to the assessment modules. A person accepts each proposal.", "Interview composed from the program and the plan's modules", plan ? `Plan version ${plan.version}` : undefined), disabled: r.assessment.status === "signed" ? "The assessment is signed. Amend it to record again." : undefined },
      { id: "feed", label: reuse ? `Propose ${reuse} answers to the modules` : "Propose answers to the modules", explain: ex("What is documented here is proposed, as pending evidence, to each module that reads it, so nothing is asked twice.", "Clinical assessment answers on this record"), disabled: !r.config ? "Configure the intake first" : reuse ? undefined : "Nothing new to propose" },
      { id: "request", label: "Draft a request for missing information", explain: ex("Drafts a message to the referrer asking for what is missing. Nothing is sent until a person approves it.", "Referral items open on the checklist") },
      TASK,
    ],
  };
}

function instrument(r: IntakeRecord, plan: AssessmentPlan | null, id: ModuleId, now: number): Context {
  const def = moduleById(id);
  const pm = plan?.modules.find((m) => m.id === id);
  const label = pm?.label ?? def.label;
  const rule = ruleLine(plan, id);
  const to: WorkspaceTarget = { section: "instrument", module: id };
  const lines: ContextLine[] = [];
  if (def.special) {
    const open = completeness(r, now).filter((i) => (i.category === "cans" || i.category === "lon") && isOpen(i.status));
    for (const i of open) lines.push({ key: i.id, text: i.label, detail: i.detail, tone: i.status === "blocked" ? "risk" : "mid", target: to, explain: ex(i.detail, "Intake checklist: CANS and Level of Need", rule) });
    return { title: `What ${label} needs`, lines, actions: [{ id: "cans-evidence", label: "Find evidence", explain: ex("The CANS Evidence Agent reads the record and proposes statements under Psyflo evidence themes. It never rates an item.", "Documents, assessment and transcripts on this record (simulated reader)", rule), disabled: def.special === "cans" ? undefined : "Only the CANS has an evidence reader" }, MISSING, TASK] };
  }
  const inst = r.instruments?.[id];
  const c = moduleCompletion(id, inst);
  if (pm?.preparation) lines.push({ key: "prep", text: "Preparation only: the rule takes effect after the policy date", tone: "neutral", target: to, explain: ex("The rule that asks for this module starts later. It is shown now so the work can begin.", "Assessment plan", rule) });
  if (c.missing.length) lines.push({ key: "req", text: `${c.missing.length} required ${c.missing.length === 1 ? "field is" : "fields are"} empty`, detail: c.missing.slice(0, 3).map((f) => f.label).join(", ") + (c.missing.length > 3 ? ` and ${c.missing.length - 3} more` : ""), tone: "mid", target: to, explain: ex(pm?.sources[0]?.reason ?? "The module's form marks these fields as required before it can be signed.", "The module's form", rule) });
  if (c.scoreMissing) lines.push({ key: "score", text: "The result of the administered instrument is not entered", detail: "Enter the result from your licensed tool. Psyflo never computes it.", tone: "mid", target: to, explain: ex("This module records a result a clinician obtained elsewhere. Psyflo does not reproduce or score the instrument.", "The module's form", rule) });
  if (c.locMissing) lines.push({ key: "loc", text: "A clinician has not confirmed the level of care", detail: "The level is chosen from names only. Psyflo never selects it.", tone: "mid", target: to, explain: ex("A level-of-care review ends with a level a clinician confirms. The licensed criteria are not loaded.", "The module's level-of-care review", rule) });
  if (c.pending) lines.push({ key: "ev", text: `${c.pending} ${c.pending === 1 ? "piece" : "pieces"} of evidence ${c.pending === 1 ? "waits" : "wait"} for a decision`, detail: "Accept, edit or reject each one.", tone: "mid", target: to, explain: ex("Evidence was proposed for fields in this module. A person decides before anything fills a field.", "The AI Scribe, the evidence reader or the clinical assessment (simulated), each with its source", rule) });
  for (const p of (r.priorAssessments ?? []).filter((x) => x.moduleId === id && !x.decision)) lines.push({ key: `prior:${p.id}`, text: `An earlier ${p.label} was found (${shortDate(p.date)})`, detail: `${p.provider}. Review it, reuse it as a starting point, or start a new one.`, tone: "neutral", target: to, explain: ex(p.note, `${p.provider}, version ${p.version}`, `Reuse: ${p.reuse}`) });
  if (inst?.status === "awaiting_review") lines.push({ key: "sign", text: "Ready for a clinician to sign", tone: "neutral", target: to, explain: ex("The module was marked ready for review. Only a qualified clinician signs.", "Review & sign-off", rule) });
  const reuse = !!r.config && feedCount(r) > 0;
  return {
    title: `What ${label} needs`,
    lines,
    actions: [
      { id: "find-evidence", module: id, label: "Find evidence", explain: ex("The simulated evidence reader looks through the documents, the referral, the profile, the assessment and the transcripts for sentences that match each field. It proposes; it never fills a field.", "This record's documents and fields", rule) },
      { id: "feed", label: "Propose assessment answers", explain: ex("Answers already documented in the clinical assessment are proposed here as pending evidence so nothing is asked twice.", "Clinical assessment answers on this record"), disabled: reuse ? undefined : "Nothing new to propose" },
      TASK,
    ],
  };
}

function simple(title: string, lines: ContextLine[], actions: ActionSpec[]): Context {
  return { title, lines, actions };
}

/** What the section named by `target` needs, and the actions that fit it. */
export function contextOf(r: IntakeRecord, plan: AssessmentPlan | null, target: WorkspaceTarget, now: number): Context {
  const items = completeness(r, now);
  const openIn = (pred: (i: (typeof items)[number]) => boolean, to: WorkspaceTarget): ContextLine[] =>
    items.filter((i) => pred(i) && isOpen(i.status)).map((i) => ({ key: i.id, text: i.label, detail: i.detail, tone: i.status === "blocked" ? "risk" : i.status === "missing" ? "mid" : "neutral", target: to, toLabel: "Open", explain: ex(i.detail, "Intake checklist") }));
  switch (target.section) {
    case "clinical": return clinical(r, plan);
    case "instrument": return target.module ? instrument(r, plan, target.module, now) : simple("Assessment instruments", asLines(needsOf(r, readiness(r, now), now).filter((n) => n.target?.section === "instrument")), [MISSING, TASK]);
    case "referral": {
      const lines = openIn((i) => i.category === "referral" || i.category === "disposition", { section: "referral" });
      return simple("What the referral needs", lines, [
        { id: "request", label: "Draft a request to the referrer", explain: ex("Drafts a message to the referring organization for the missing items. A person approves it before anything is sent.", "Referral items open on the checklist") },
        MISSING, TASK,
      ]);
    }
    case "patient":
      return simple("What the patient and coverage need", openIn((i) => i.category === "patient" || i.category === "coverage" || i.category === "consent", { section: "patient", tab: target.tab }), [
        { id: "followups", label: "Create follow-up tasks", explain: ex("Makes one internal task for each missing item so none is forgotten.", "Missing items on the checklist"), disabled: items.some((i) => i.status === "missing") ? undefined : "Nothing is missing" },
        MISSING, TASK,
      ]);
    case "signoff": {
      const ids = r.config ? r.config.modules.filter((m) => m.state === "active" && m.level === "required").map((m) => m.id) : [];
      const lines: ContextLine[] = [];
      const unsigned = ids.filter((m) => !["patient-referral", "insurance", "clinical-history", "safety", "social-functional", "clinical-notes", "review-signoff", "cans", "lon"].includes(m) && r.instruments?.[m]?.status !== "signed");
      if (unsigned.length) lines.push({ key: "unsigned", text: `${unsigned.length} required ${unsigned.length === 1 ? "module is" : "modules are"} not signed`, detail: unsigned.slice(0, 3).map((m) => plan?.modules.find((x) => x.id === m)?.label ?? moduleById(m).label).join(", "), tone: "mid", target: { section: "instrument", module: unsigned[0] }, toLabel: "Open the first", explain: ex("Every required module is signed by a qualified clinician before care planning.", "Assessment plan for this intake", ruleLine(plan, unsigned[0])) });
      if (r.assessment.status !== "signed") lines.push({ key: "attest", text: "The clinical assessment is not signed", tone: "mid", target: { section: "clinical" }, toLabel: "Open", explain: ex("The assessment attestation is a clinician's signature.", "Core module: Review & sign-off", ruleLine(plan, "review-signoff")) });
      if (!unsigned.length && r.assessment.status === "signed" && !overallSignoff(r, now).done) lines.push({ key: "overall", text: "A clinician signs off the whole assessment", detail: "Care planning follows the overall sign-off.", tone: "mid", target: { section: "signoff" }, toLabel: "Open", explain: ex("The overall sign-off confirms a clinician reviewed every required module. It is not a finding of medical necessity.", "Core module: Review & sign-off", ruleLine(plan, "review-signoff")) });
      if (r.safety?.status === "open") lines.unshift({ key: "alert", text: "A safety alert is open", detail: "A clinician reviews it first. Psyflo never decides that a person is safe.", tone: "risk", explain: ex("A safety alert was raised from what was said or written.", r.safety.source?.ref ?? "Safety alert on this record") });
      return simple("What review and sign-off need", lines, [MISSING, TASK]);
    }
    case "care": {
      const cp = r.carePlan;
      const lines: ContextLine[] = [];
      if (r.assessment.status !== "signed") lines.push({ key: "after", text: "Care planning follows a signed assessment", tone: "neutral", target: { section: "clinical" }, toLabel: "Open the assessment", explain: ex("The care plan is written from the assessment, so the assessment is signed first.", "Workflow order of this intake") });
      else if (!overallSignoff(r, now).done) lines.push({ key: "after-signoff", text: "Care planning follows the overall sign-off", tone: "neutral", target: { section: "signoff" }, toLabel: "Open review & sign-off", explain: ex("The plan's sign-off rule: a clinician signs off the assessment before care planning.", "Core module: Review & sign-off", ruleLine(plan, "review-signoff")) });
      if (!cp || cp.status === "not_started") lines.push({ key: "none", text: "No care plan yet", detail: "A clinician selects the program and writes the goals.", tone: "neutral", target: { section: "care" }, explain: ex("The service and the plan are a clinician's decisions. The assistant only organizes what is documented.", "Care plan on this record") });
      else if (cp.status === "draft") lines.push({ key: "draft", text: "The care plan is a draft", detail: "A clinician approves it.", tone: "mid", target: { section: "care" }, explain: ex("A care plan is approved by a person, never by an agent.", "Care plan on this record") });
      return simple("What care planning needs", lines, [
        { id: "handoff", label: "Draft the authorization packet", explain: ex("Assembles the authorization packet as a draft from this record. Prepare Authorization (opens after the care plan is approved) opens it in New Authorization, where a person reviews and signs it. Nothing is submitted.", "Readiness on this record"), disabled: readiness(r, now).requirement === "authorization" || readiness(r, now).requirement === "pending" ? (r.handoff.status === "not_started" ? undefined : "A handoff draft exists") : "No authorization handoff is needed" },
        MISSING, TASK,
      ]);
    }
    case "documents":
      return simple("What the documents need", openIn((i) => i.category === "documents", { section: "documents" }), [{ id: "request", label: "Draft a request for documents", explain: ex("Drafts a message to the referrer for what is missing. Nothing is sent until a person approves it.", "Referral items open on the checklist") }, MISSING, TASK]);
    default: {
      const needs = needsOf(r, readiness(r, now), now);
      return { ...simple("Where to start", asLines(needs), [MISSING, { id: "request", label: "Draft a request to the referrer", explain: ex("Drafts a message for the missing referral items. A person approves it before it is sent.", "Referral items open on the checklist") }, { id: "followups", label: "Create follow-up tasks", explain: ex("Makes one internal task for each missing item.", "Missing items on the checklist"), disabled: items.some((i) => i.status === "missing") ? undefined : "Nothing is missing" }, TASK]), listedBelow: true as const };
    }
  }
}
const asLines = (needs: Need[]): ContextLine[] => needs.map(asLine);
