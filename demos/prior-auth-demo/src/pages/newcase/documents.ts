/* The documents a request needs, what Reader looks for in each one, and a short preview of each for the demo.
   Which documents a payer asks for is the list saved on Payers › Documents for that level of care: Summit asks for 9 for Residential 3.5. */
import type { DocBlock } from "@/components/ui";
import type { DemoFile } from "@/components/ui";
import type { Answer, DocFinding, DocSlotId, DraftDocument, FixedDocSlot, QuestionKey } from "@/data/cases";
import type { DocItem } from "@/data/payerConfig";
import type { PayerId, Program } from "@/data/types";

export interface DocSlotDef {
  id: DocSlotId;
  label: string;
  hint: string;
  sampleName: string;
  keywords: string[];
  checks: string[];
  /** The check at `at` turns amber with this text when the document has a problem. */
  warn: { at: number; text: string; resolvedBy?: QuestionKey; resolvedText?: string };
  /** The sample chart's version of this document has the problem. */
  sampleWarn?: boolean;
}

export const DOC_SLOTS: Record<FixedDocSlot, DocSlotDef> = {
  referral: {
    id: "referral",
    label: "Referral or admission order",
    hint: "Needs to be a referral or an admission order",
    sampleName: "Referral (J.M.).pdf",
    keywords: ["referral", "admission order", "admit order"],
    checks: ["The clinician signature is present", "The document has not expired", "The clinician credentials include an MD, NP, DO, PA or PhD", "The patient's age or date of birth is on the document", "Diagnosis codes are listed (F10.20)"],
    warn: { at: 0, text: "The clinician signature is missing from the document" },
  },
  psych_eval: {
    id: "psych_eval",
    label: "Diagnosis report (psychiatric evaluation)",
    hint: "The latest evaluation with diagnoses and severity scores",
    sampleName: "Psychiatric evaluation and H&P.pdf",
    keywords: ["psychiatric", "psych", "eval", "h&p", "history and physical", "diagnos"],
    checks: ["The evaluation date is within 12 months", "The clinician signature is present", "Diagnosis codes are listed (F10.20, F33.2)", "Symptom severity scores are present (depression 17, anxiety 14)", "The patient's age or date of birth is on the document"],
    warn: { at: 3, text: "Symptom severity scores are missing from the evaluation" },
  },
  asam: {
    id: "asam",
    label: "ASAM assessment",
    hint: "All six dimensions with the recommended level of care",
    sampleName: "ASAM assessment.pdf",
    keywords: ["asam"],
    checks: ["All six dimensions are scored", "The recommended level of care is stated (3.5)", "The assessment is dated within 7 days of admission", "The assessor is credentialed"],
    warn: { at: 2, text: "The assessment is more than 7 days old" },
  },
  psychosocial: {
    id: "psychosocial",
    label: "Psychosocial history",
    hint: "Housing, supports and earlier treatment",
    sampleName: "Psychosocial history.pdf",
    keywords: ["psychosocial", "social"],
    checks: ["Housing and supports are described", "Earlier treatment episodes are listed", "The history is dated and signed"],
    warn: { at: 2, text: "The history has no signature date" },
  },
  nursing: {
    id: "nursing",
    label: "Nursing note with withdrawal scale",
    hint: "A withdrawal scale score from the last 72 hours",
    sampleName: "Nursing notes and withdrawal scale.pdf",
    keywords: ["nursing", "nurse", "withdrawal", "ciwa", "cows"],
    checks: ["A withdrawal scale is present (CIWA-Ar)", "The latest score is within 72 hours (4 on 10/18)", "Vital signs are recorded with each score", "The note is signed by a nurse"],
    warn: { at: 1, text: "The latest withdrawal score is more than 72 hours old" },
  },
  uds: {
    id: "uds",
    label: "Urine drug screen",
    hint: "Collected in the last 7 days",
    sampleName: "Urine drug screen.pdf",
    keywords: ["urine", "drug screen", "uds", "tox"],
    checks: ["The sample was collected in the last 7 days", "A result is listed for each panel", "The lab and the collection date are on the report"],
    warn: { at: 0, text: "The sample was collected more than 7 days ago" },
  },
  meds: {
    id: "meds",
    label: "Medication list",
    hint: "Current medications with doses and start dates",
    sampleName: "Medication list.pdf",
    keywords: ["medication", "med list", "meds"],
    checks: ["Doses and routes are listed", "A start date is listed for each medication", "Allergies are recorded", "Dates match the psychiatric evaluation"],
    warn: { at: 3, text: "Sertraline starts 9/14 here and 9/21 in the psychiatric evaluation", resolvedBy: "sertraline", resolvedText: "Sertraline start date confirmed by you: {answer}" },
  },
  treatment_plan: {
    id: "treatment_plan",
    label: "Treatment plan",
    hint: "A signed plan strengthens the request",
    sampleName: "Treatment plan (draft).pdf",
    keywords: ["treatment plan", "plan of care", "tx plan"],
    checks: ["Goals are measurable", "The plan names a step-down level of care", "The plan is dated", "The clinician signature is present"],
    warn: { at: 3, text: "The clinician signature is missing. The plan is marked draft" },
    sampleWarn: true,
  },
  attendance: {
    id: "attendance",
    label: "Attendance record",
    hint: "Sessions attended in the last 14 days",
    sampleName: "Attendance record.pdf",
    keywords: ["attendance"],
    checks: ["Every session in the last 14 days is listed", "Sessions attended and missed are marked", "The record is signed by the program"],
    warn: { at: 0, text: "The record stops more than 14 days ago" },
  },
  therapy_note: {
    id: "therapy_note",
    label: "Therapy note from the last 14 days",
    hint: "Individual or group, from the last 14 days",
    sampleName: "Therapy note (10/16).pdf",
    keywords: ["therapy", "progress note", "session"],
    checks: ["The note is dated within the last 14 days", "The note is signed", "Progress against goals is described"],
    warn: { at: 0, text: "The latest note is more than 14 days old" },
  },
};

/* ------------------------------------------------------------------ what each payer asks for */
export const isFixedSlot = (slot: DocSlotId): slot is FixedDocSlot => slot in DOC_SLOTS;
const CUSTOM_CHECKS = ["The document is dated", "It is for this patient", "It is complete"];
/** The slot's own words. A document with no fixed slot takes its title from the slot id. */
export function slotDef(slot: DocSlotId): DocSlotDef {
  if (isFixedSlot(slot)) return DOC_SLOTS[slot];
  const title = slot.slice(5);
  return { id: slot, label: title, hint: "Asked for by the payer", sampleName: `${title}.pdf`, keywords: [], checks: CUSTOM_CHECKS, warn: { at: 0, text: "The document does not match this patient" } };
}
export const slotLabel = (slot: DocSlotId): string => slotDef(slot).label;

/** One line of the list the payer asks for. `hint` is the payer's own wording of what the document must show. */
export interface DocEntry {
  slot: DocSlotId;
  label: string;
  hint: string;
  required: boolean;
}
const T = true;
const F = false;
/* Built-in lists, used for a payer that has no saved configuration. */
const BY_PROGRAM: Record<Program, [FixedDocSlot, boolean][]> = {
  RES: [["referral", T], ["psych_eval", T], ["asam", T], ["psychosocial", T], ["nursing", T], ["uds", T], ["meds", T], ["treatment_plan", F], ["therapy_note", F]],
  IOP: [["referral", T], ["psych_eval", T], ["asam", T], ["meds", T], ["treatment_plan", T], ["attendance", F]],
  PHP: [["referral", T], ["psych_eval", T], ["asam", T], ["meds", T], ["treatment_plan", T], ["attendance", F], ["psychosocial", F]],
  WM: [["referral", T], ["psych_eval", T], ["asam", T], ["nursing", T], ["uds", T], ["meds", T]],
};
const DROP: Partial<Record<PayerId, Partial<Record<Program, FixedDocSlot[]>>>> = {
  cardinal: { RES: ["psychosocial"] },
  beacon: { RES: ["psychosocial", "therapy_note"] },
  harborview: { RES: ["psychosocial"] },
  lakeshore: { RES: ["therapy_note"] },
};
/** Payers list every document alike, so these are the ones that strengthen a request but do not hold it up. */
const RECOMMENDED: Record<Program, FixedDocSlot[]> = { RES: ["treatment_plan", "therapy_note"], IOP: ["attendance"], PHP: ["attendance", "psychosocial"], WM: [] };
/** The referral line on a payer's list ("Insurance card and referral") speaks of the card, which has its own rows, so the referral keeps its own hint. */
const entry = (slot: FixedDocSlot, required: boolean, hint?: string): DocEntry => ({ slot, label: DOC_SLOTS[slot].label, hint: slot === "referral" ? DOC_SLOTS.referral.hint : (hint ?? DOC_SLOTS[slot].hint), required });
const MINIMUM: DocEntry[] = [entry("referral", true), entry("psych_eval", true)];

/** The fixed slot a line on the payer's list belongs to, or null when none fits. */
export const slotForTitle = (title: string): FixedDocSlot | null => slotForFile(title);

/** The documents a request needs. `items` is the payer's saved list for the level of care (Payers › Documents), or null when the payer has none saved.
    A line that fits no fixed slot, or repeats one, becomes its own document. Without a payer and level of care only the two every payer wants are listed. */
export function docEntries(payerId: PayerId | null, program: Program | null, items: DocItem[] | null): DocEntry[] {
  if (!payerId || !program) return MINIMUM;
  if (!items) {
    const drop = DROP[payerId]?.[program] ?? [];
    return BY_PROGRAM[program].filter(([slot]) => !drop.includes(slot)).map(([slot, required]) => entry(slot, required));
  }
  const taken = new Set<DocSlotId>();
  const out: DocEntry[] = [];
  for (const item of items) {
    const fixed = slotForTitle(item.title);
    const slot: DocSlotId = fixed && !taken.has(fixed) ? fixed : `item:${item.title}`;
    if (taken.has(slot)) continue;
    taken.add(slot);
    out.push(isFixedSlot(slot) ? entry(slot, !RECOMMENDED[program].includes(slot), item.requirement) : { slot, label: item.title, hint: item.requirement, required: true });
  }
  return out;
}
/** The referral first, then the required documents, then the recommended ones, each in the payer's own order. This is how the checklist and the validation summary list them. */
const rank = (e: DocEntry): number => (e.slot === "referral" ? 0 : e.required ? 1 : 2);
export const requiredFirst = (list: DocEntry[]): DocEntry[] => [...list].sort((a, b) => rank(a) - rank(b));

/* ------------------------------------------------------------------ validation findings */
const hash = (s: string): number => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);

/** Findings for one file. The sample files are scripted. Any other file gets one amber finding in about one case in five.
    A document that came in with a referral was already checked there, so it is never flagged. */
export function makeFindings(slot: DocSlotId, sample: boolean, fileName: string, sertralineConflict = false, clean = false): DocFinding[] {
  const def = slotDef(slot);
  const flawed = !clean && (sample ? !!def.sampleWarn || (sertralineConflict && slot === "meds") : hash(fileName) % 5 === 0);
  return def.checks.map((text, i) =>
    i === def.warn.at && flawed
      ? { id: `${slot}-${i}`, ok: false, text: def.warn.text, resolvedBy: def.warn.resolvedBy, resolvedText: def.warn.resolvedText }
      : { id: `${slot}-${i}`, ok: true, text },
  );
}
/** `fresh` is a file the person chose to replace a flagged one: the demo reads it clean. */
export function makeDocument(slot: DocSlotId, file: DemoFile, sertralineConflict = false, status: DraftDocument["status"] = "validating", fresh = false): DraftDocument {
  const sample = file.name === slotDef(slot).sampleName;
  return { slot, file, sample, status, findings: makeFindings(slot, sample, file.name, sertralineConflict, fresh || file.id.startsWith("ref-")) };
}
/** The document that came in with the attached referral: attachReferral gives its file the id `ref-<referral id>`. */
export const isReferralDoc = (referralId: string | undefined, doc: DraftDocument | undefined): boolean => !!referralId && doc?.file.id === `ref-${referralId}`;
export const sampleFile = (slot: DocSlotId): DemoFile => ({ id: `sample-${slot}`, name: slotDef(slot).sampleName, sizeKb: 120 + ((hash(slot) * 7) % 260) });

/** A finding is open until the person answers the question that settles it. */
export const isOpen = (f: DocFinding, answers: Answer[]): boolean => !f.ok && !(f.resolvedBy && answers.some((a) => a.key === f.resolvedBy));
export function findingText(f: DocFinding, answers: Answer[]): string {
  const a = f.resolvedBy ? answers.find((x) => x.key === f.resolvedBy) : undefined;
  return a && f.resolvedText ? f.resolvedText.replace("{answer}", a.answer) : f.text;
}
export const openFindings = (doc: DraftDocument, answers: Answer[]): number => doc.findings.filter((f) => isOpen(f, answers)).length;

/** The order a tie between two slots is settled in: the specific documents first, the general ones last. */
const MATCH_ORDER: FixedDocSlot[] = ["referral", "asam", "uds", "nursing", "meds", "treatment_plan", "therapy_note", "attendance", "psychosocial", "psych_eval"];

/** Reader sorts a file into a slot by what its name says. The longest matching word wins, so "psychosocial" beats "psych". Null when the name says nothing. */
export function slotForFile(name: string): FixedDocSlot | null {
  const n = name.toLowerCase();
  let best: FixedDocSlot | null = null;
  let bestLen = 0;
  for (const id of MATCH_ORDER) {
    const len = Math.max(0, ...DOC_SLOTS[id].keywords.filter((k) => n.includes(k)).map((k) => k.length));
    if (len > bestLen) {
      best = id;
      bestLen = len;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ previews (the eye icon and the source chips) */
const BODY: Partial<Record<string, DocBlock[]>> = {
  referral: [{ kind: "p", id: "evidence", text: "Referred for residential care after a relapse on 9/28 that followed eleven months of abstinence. Co-occurring depression is active." }],
  psych_eval: [{ kind: "p", id: "evidence", text: "Depression score 17 and anxiety score 14. Craving was 7 of 10 on 10/17. Relapse on 9/28 after eleven months of abstinence." }],
  asam: [{ kind: "table", id: "evidence", head: ["Dimension", "Risk"], rows: [["1 Withdrawal", "High"], ["2 Medical", "Moderate"], ["3 Emotional", "High"], ["4 Readiness", "Moderate"], ["5 Relapse", "High"], ["6 Environment", "High"]] }],
  psychosocial: [{ kind: "p", id: "evidence", text: "An intensive outpatient program in 2025 ended in week 3 when housing was lost. Lives with a partner who drinks daily and has no transport to outpatient visits." }],
  nursing: [{ kind: "p", id: "evidence", text: "Withdrawal scores peaked at 14 on 10/17 and fell to 4 by 10/18 with medication." }],
  uds: [{ kind: "table", id: "evidence", head: ["Panel", "Result"], rows: [["Alcohol (EtG)", "Positive"], ["Opioids", "Negative"], ["Benzodiazepines", "Negative"], ["Stimulants", "Negative"]] }],
  meds: [{ kind: "table", id: "evidence", head: ["Medication", "Dose", "Start"], rows: [["Sertraline", "100 mg daily", "9/14"], ["Naltrexone", "50 mg daily", "10/15"], ["Thiamine", "100 mg daily", "10/14"]] }],
  treatment_plan: [{ kind: "p", id: "evidence", text: "Fourteen days of residential care, then a named step-down to partial hospitalization." }],
  attendance: [{ kind: "table", id: "evidence", head: ["Week", "Attended", "Missed"], rows: [["10/05", "4", "0"], ["10/12", "4", "1"]] }],
  therapy_note: [{ kind: "p", id: "evidence", text: "Engaged in group and individual sessions. Craving is lower. Needs a structured setting to hold gains." }],
};

export function previewBlocks(slot: DocSlotId, who: string, fileName: string): DocBlock[] {
  const def = slotDef(slot);
  return [
    { kind: "letterhead", org: def.label, sub: "Chart document, shown in privacy mode" },
    { kind: "meta", items: [["Patient", `${who} (Privacy mode)`], ["File", fileName], ["Dated", "10/17/2026"], ["Author", "Treating clinician"]] },
    { kind: "h", text: "Evidence" },
    ...(BODY[slot] ?? []),
    { kind: "h", text: "What Reader checked" },
    { kind: "list", items: def.checks },
    { kind: "sig", text: "Signed electronically", missing: slot === "treatment_plan" },
  ];
}

/** Source chips in the summary say where a sentence came from, for example "Psychiatric eval p.3". */
export function slotOfSource(label: string): FixedDocSlot | null {
  const l = label.toLowerCase();
  if (l.startsWith("psychiatric")) return "psych_eval";
  if (l.startsWith("nursing")) return "nursing";
  if (l.startsWith("psychosocial")) return "psychosocial";
  if (l.startsWith("treatment")) return "treatment_plan";
  if (l.startsWith("medication")) return "meds";
  if (l.startsWith("asam")) return "asam";
  if (l.startsWith("referral")) return "referral";
  if (l.startsWith("urine")) return "uds";
  if (l.startsWith("therapy")) return "therapy_note";
  if (l.startsWith("attendance")) return "attendance";
  return null;
}
