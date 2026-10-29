import { specOf } from "@/data/intake/fields";
import { ASSESSMENT_SECTIONS, type AgentTask, type IntakeRecord, type Suggestion } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { isMissingValue } from "./missing";
import { missingRequired } from "./requiredFields";

/* Pure rules for the Referral section: what counts as safety-related, what "Accept all high-confidence" may take, what to ask the referrer. */

/** The tasks that wait for a referrer's reply. The queue reads them for "Waiting on the referrer". */
export const openInfoRequests = (r: IntakeRecord): AgentTask[] => r.tasks.filter((t) => t.role === "coordination" && t.action === REPLY_TASK_ACTION && (t.status === "running" || t.status === "queued"));

/** A field's label wherever it lives (referral, profile, coverage, an assessment section). */
export function fieldLabel(field: string): string {
  return specOf(field)?.label ?? ASSESSMENT_SECTIONS.find((s) => s.id === field)?.label ?? field;
}

const SAFETY_WORDS = /\b(safety|suicid\w*|self-harm|harm (him|her|them)self|kill|die|death|dead|not wake up|end (his|her|their|my) life|overdose|weapon|danger)\b/i;

/** Safety-related suggestions never go through a bulk accept: the risk section, anything quoting the open alert's evidence, or safety words. */
export function isSafetyRelated(sg: Suggestion, r: IntakeRecord): boolean {
  if (sg.field === "safety") return true;
  const alertSrc = r.safety?.source;
  if (alertSrc?.docId && alertSrc.docId === sg.source.docId && alertSrc.blockId === sg.source.blockId) return true;
  return SAFETY_WORDS.test(sg.value) || SAFETY_WORDS.test(sg.source.quote ?? "");
}

export interface BulkSplit {
  accept: Suggestion[];
  conflicts: Suggestion[];
  safety: Suggestion[];
  lower: Suggestion[];
}

/** What "Accept all high-confidence" would take from the given suggestions, and what it leaves for one-by-one review. */
export function splitForBulk(r: IntakeRecord, pending: Suggestion[]): BulkSplit {
  const out: BulkSplit = { accept: [], conflicts: [], safety: [], lower: [] };
  for (const sg of pending) {
    if (isSafetyRelated(sg, r)) out.safety.push(sg);
    else if (sg.conflict) out.conflicts.push(sg);
    else if (sg.confidence !== "high") out.lower.push(sg);
    else out.accept.push(sg);
  }
  return out;
}

/** The suggestions the Referral section reviews: its own, and those for the profile and coverage that came from a document. */
export const referralPending = (r: IntakeRecord): Suggestion[] =>
  r.suggestions.filter((s) => s.status === "pending" && (s.section === "referral" || ((s.section === "profile" || s.section === "coverage") && s.source.kind === "document")));

/** What staff could ask the referrer for: required referral fields not on file (and not already suggested), and the documents the record waits on. */
export function itemsToRequest(r: IntakeRecord): string[] {
  const suggested = (field: string) => r.suggestions.some((s) => s.field === field && s.status === "pending");
  const items = missingRequired(r, "referral").filter((s) => !suggested(s.key)).map((s) => s.label);
  if (serviceById(r.serviceId).setting === "school" && isMissingValue(r.profile.schoolConsent) && !suggested("schoolConsent")) items.push("Signed parent release of school records");
  if (r.age !== null && r.age < 18 && isMissingValue(r.profile.guardianPhone) && !suggested("guardianPhone")) items.push("Guardian phone number");
  return items;
}

/** Fields short enough that a different value on file is a contradiction, not just a second wording. */
const CONFLICT_FIELDS = ["plan", "medicaidId", "dob", "guardianName", "guardianPhone", "referrerContact", "language", "coverageType", "legalName"];

/** The conflict note for a newly extracted value, when the record already says something else. */
export function conflictWith(r: IntakeRecord, section: Suggestion["section"], field: string, value: string): string | undefined {
  if (!CONFLICT_FIELDS.includes(field) || (section !== "referral" && section !== "profile" && section !== "coverage")) return undefined;
  const onFile = r[section][field]?.value?.trim();
  if (!onFile || onFile.toLowerCase() === value.trim().toLowerCase()) return undefined;
  return `On file: "${onFile}". The new document says "${value}". Confirm which is current.`;
}
