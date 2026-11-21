import { programForService } from "../assess/programs";
import type { ProgramId, Population } from "../assess/types";
import type { CoreProgram } from "../types";
import { serviceById, type VaServiceId } from "../va/services";
import { toDate } from "@/lib/time";
import type { FieldValue, IntakeRecord } from "./types";

/* Pure facts a referral is judged on: the person's population from age, the program a service maps to, risk language in the words the referral
   used, whether the 42 CFR Part 2 protocol applies, who looks like a duplicate, and demo capacity. Nothing here decides anything about a person:
   it only finds what a human reviewer should look at. */

/** Whole years from a date of birth (yyyy-mm-dd) to a demo minute. Null when the date cannot be read. */
export function ageFromDob(dob: string, clock: number): number | null {
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const now = toDate(clock);
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export const populationOfAge = (age: number | null): Population | null => (age === null ? null : age >= 18 ? "adult" : age >= 12 ? "adolescent" : "child");

/** The program a Virginia service stands for. Youth IOP shares mental health IOP's service, so the first match is the general one. */
export const programIdOf = (serviceId: VaServiceId): ProgramId | null => programForService(serviceId)?.id ?? null;

/** The four levels of care of the older referral list, as the Virginia services they stand for. */
export const SERVICE_OF_CORE: Record<CoreProgram, VaServiceId> = { RES: "arts-res", IOP: "arts-iop", PHP: "arts-php", WM: "arts-wm" };

/* ------------------------------------------------------------------ risk language */
const RISK_WORDS = /\b(suicid\w*|self-harm|harm (?:him|her|them)self|kill\w*|thoughts of (?:death|dying|self-harm)|wish\w* (?:she|he|they|i) (?:could )?(?:go to sleep|were dead|was dead)|not wake up|end (?:his|her|their|my) life|overdose\w*|weapon\w*|passive thoughts)\b/i;
const NEGATED = /^\s*(?:no|denies|denied|none|not)\b/i;

/** The sentences of a text that mention risk, leaving out the ones that say there is none ("No thoughts of self-harm."). */
export function riskSentences(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && RISK_WORDS.test(s) && !NEGATED.test(s));
}

/** Every risk sentence across a record's referral, profile and coverage values and its pending suggestions. */
export function riskFindings(r: Pick<IntakeRecord, "referral" | "profile" | "coverage" | "suggestions">): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  for (const m of [r.referral, r.profile, r.coverage]) for (const [k, v] of Object.entries(m)) for (const t of riskSentences(v?.value)) out.push({ field: k, text: t });
  for (const s of r.suggestions) if (s.status === "pending") for (const t of riskSentences(s.value)) out.push({ field: s.field, text: t });
  return out;
}

/* ------------------------------------------------------------------ Part 2 */
/** Whether the substance use disorder protocol applies: an ARTS service, or a substance use history on the referral. Organization protocol, not legal advice. */
export function partTwoApplies(r: Pick<IntakeRecord, "serviceId" | "profile" | "referral">): boolean {
  if (serviceById(r.serviceId).track === "sud") return true;
  const sud = r.profile.substanceUse?.value;
  return !!sud && !/^(none|no\b)/i.test(sud.trim());
}

export type ConsentState = "on_file" | "missing" | "not_needed";
export interface ConsentRow {
  key: string;
  label: string;
  state: ConsentState;
  value?: string;
}

const present = (fv: FieldValue | undefined): boolean => !!fv && fv.state !== "not_collected" && !!fv.value.trim();

/** The consents a referral needs and whether each is on file, from the fields the record holds. */
export function consentRows(r: Pick<IntakeRecord, "age" | "serviceId" | "profile" | "referral">): ConsentRow[] {
  const rows: ConsentRow[] = [];
  const tx = r.profile.consentTreatment;
  rows.push({ key: "consentTreatment", label: "Consent to intake and treatment", state: present(tx) && /^(signed|verbal)/i.test(tx?.value ?? "") ? "on_file" : "missing", value: tx?.value || undefined });
  const roi = r.profile.roi;
  rows.push({ key: "roi", label: "Release of information to the referrer", state: roi?.value === "On file" ? "on_file" : roi?.value === "Not needed" ? "not_needed" : "missing", value: roi?.value || undefined });
  if (r.age !== null && r.age < 18) {
    const g = r.profile.guardianName;
    rows.push({ key: "guardianName", label: "Guardian or legal representative", state: present(g) ? "on_file" : "missing", value: g?.value || undefined });
  }
  if (serviceById(r.serviceId).setting === "school") {
    const sc = r.profile.schoolConsent;
    rows.push({ key: "schoolConsent", label: "Release of school records", state: sc?.value === "On file" ? "on_file" : sc?.value === "Not applicable" ? "not_needed" : "missing", value: sc?.value || undefined });
  }
  return rows;
}

/* ------------------------------------------------------------------ duplicates */
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
const last4 = (v: string | undefined) => (v ?? "").replace(/\D/g, "").slice(-4);

export interface DuplicateHit {
  record: IntakeRecord;
  /** strong: the same initials and date of birth. likely: the same initials and age, or the same initials and member ID. */
  match: "strong" | "likely";
  why: string;
}

/** Records that look like the same person: the same initials and date of birth first, then the same initials with the same age or member ID.
    Only the records the caller passes are searched (the viewer's sites). Closed, declined and redirected records still count: the history matters. */
export function findReferralDuplicates(records: readonly IntakeRecord[], who: { initials: string; dob?: string; age: number | null; memberLast4?: string }, ignoreId?: string): DuplicateHit[] {
  const ini = norm(who.initials);
  if (ini.length < 2) return [];
  const m4 = last4(who.memberLast4);
  const hits: DuplicateHit[] = [];
  for (const r of records) {
    if (r.id === ignoreId || norm(r.initials) !== ini) continue;
    const dob = r.profile.dob?.value;
    if (who.dob && dob && who.dob === dob) {
      hits.push({ record: r, match: "strong", why: "the same initials and date of birth" });
      continue;
    }
    if (who.dob && dob && who.dob !== dob) continue;
    const onFile = last4(r.coverage.medicaidId?.value);
    if (m4.length === 4 && onFile === m4) hits.push({ record: r, match: "likely", why: `the same initials and member ID ending ${m4}` });
    else if (who.age !== null && r.age === who.age) hits.push({ record: r, match: "likely", why: "the same initials and age" });
  }
  return hits.sort((a, b) => (a.match === b.match ? 0 : a.match === "strong" ? -1 : 1));
}

/* ------------------------------------------------------------------ capacity (demo configuration) */
export interface Capacity {
  total: number;
  open: number;
  unit: "bed" | "slot" | "caseload place";
}
/** Demo capacity by program. Labeled "Demo configuration" wherever it shows: no real census is connected. A program not listed has no limit in the demo. */
export const CAPACITY_SEED: Partial<Record<ProgramId, Capacity>> = {
  "sud-res": { total: 16, open: 2, unit: "bed" },
  "sud-wm": { total: 8, open: 1, unit: "bed" },
  "sud-php": { total: 24, open: 5, unit: "slot" },
  "sud-iop": { total: 40, open: 11, unit: "slot" },
  "mh-php": { total: 20, open: 4, unit: "slot" },
  "mh-iop": { total: 30, open: 8, unit: "slot" },
  "mh-res": { total: 10, open: 0, unit: "bed" },
  prtf: { total: 12, open: 0, unit: "bed" },
  act: { total: 60, open: 0, unit: "caseload place" },
};
