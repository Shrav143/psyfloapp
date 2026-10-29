import { isRequired, specsFor, type FieldSpec } from "@/data/intake/fields";
import type { FieldValue, IntakeRecord, Suggestion } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { toDate } from "@/lib/time";
import type { RequestedField } from "@/store/intakeProfile";
import { hasPlanConflict } from "./coverageModel";

/* What the profile and coverage screens count and show: which fields apply to this person, which are done, what consent says,
   and the answers a simulated secure form brings back. Pure functions, so the review checklist can use the same rules. */

export const PROFILE_GROUPS = ["Demographics", "Contact", "Guardian and consent"] as const;
export const HISTORY_GROUP = "Clinical and psychosocial history";

/** School-based services (CPST: Youth, School Setting and TDT) need a school release. */
export const schoolBasedOf = (r: IntakeRecord): boolean => serviceById(r.serviceId).setting === "school";
export const ctxOf = (r: IntakeRecord) => ({ age: r.age, schoolBased: schoolBasedOf(r) });
export const groupSpecs = (section: "profile" | "coverage", group: string): FieldSpec[] => specsFor(section).filter((s) => s.group === group);
export const valueAt = (r: IntakeRecord, spec: Pick<FieldSpec, "section" | "key">): FieldValue | undefined => (spec.section === "coverage" ? r.coverage[spec.key] : spec.section === "profile" ? r.profile[spec.key] : r.referral[spec.key]);

/** Whether a conditional field applies: guardian fields to a minor, the school release to a school-based service. "unknown" while the age is not known. */
export function applies(spec: FieldSpec, r: IntakeRecord): "yes" | "no" | "unknown" {
  if (spec.required === "minor") return r.age === null ? "unknown" : r.age < 18 ? "yes" : "no";
  if (spec.required === "school") return schoolBasedOf(r) ? "yes" : "no";
  return "yes";
}

/** Consent fields are done only when the paper is signed or not needed; every other field when it holds a value nobody still has to confirm. */
const CONSENT_DONE: Record<string, string[]> = { consentTreatment: ["Signed"], roi: ["On file", "Not needed"], schoolConsent: ["On file", "Not applicable"] };
export function isDone(key: string, fv?: FieldValue): boolean {
  if (!fv) return false;
  if (fv.state === "not_applicable") return true;
  if (!fv.value.trim() || fv.state === "not_collected" || fv.state === "needs_confirmation" || fv.state === "ai_suggested") return false;
  return CONSENT_DONE[key] ? CONSENT_DONE[key].includes(fv.value) : true;
}

/** "3 of 5 required" for a set of fields. The coverage type counts as done with the plan, since it follows the plan. */
export function requiredProgress(r: IntakeRecord, specs: FieldSpec[]): { done: number; total: number } {
  const req = specs.filter((s) => isRequired(s, ctxOf(r)));
  /* A plan that other records contradict is not done until a person chooses the current one. */
  const planOk = isDone("plan", r.coverage.plan) && !hasPlanConflict(r);
  const done = req.filter((s) => (s.key === "coverageType" || s.key === "plan" ? planOk : isDone(s.key, valueAt(r, s)))).length;
  return { done, total: req.length };
}

/** Optional, empty and with nothing waiting for review: folded under "Show optional fields". */
export const foldable = (r: IntakeRecord, s: FieldSpec): boolean =>
  !isRequired(s, ctxOf(r)) && applies(s, r) !== "no" && !valueAt(r, s) && !r.suggestions.some((x) => x.status === "pending" && x.section === s.section && x.field === s.key);

export interface ConsentView {
  key: string;
  label: string;
  word: string;
  tone: Tone;
  fv?: FieldValue;
}
/** What is signed, verbal, missing or declined, in words. */
export function consentView(r: IntakeRecord): ConsentView[] {
  const school = schoolBasedOf(r);
  const v = (k: string) => r.profile[k];
  const treat = v("consentTreatment")?.value ?? "";
  const roi = v("roi")?.value ?? "";
  const sch = v("schoolConsent")?.value ?? "";
  const out: ConsentView[] = [
    { key: "consentTreatment", label: r.age !== null && r.age < 18 ? "Consent to treatment (guardian signs)" : "Consent to intake and treatment", fv: v("consentTreatment"),
      ...(treat === "Signed" ? { word: "Signed", tone: "good" } : treat.startsWith("Verbal") ? { word: "Verbal, to be signed", tone: "mid" } : treat === "Declined" ? { word: "Declined", tone: "risk" } : { word: "Missing", tone: "risk" }) },
    { key: "roi", label: "Release of information", fv: v("roi"),
      ...(roi === "On file" ? { word: "Signed, on file", tone: "good" } : roi.startsWith("Needed") ? { word: "Needed", tone: "mid" } : roi === "Not needed" ? { word: "Not needed", tone: "neutral" } : roi === "Declined" ? { word: "Declined", tone: "risk" } : { word: "Not collected", tone: "neutral" }) },
  ];
  if (school || sch) {
    out.push({ key: "schoolConsent", label: "School release", fv: v("schoolConsent"),
      ...(sch === "On file" ? { word: "Signed, on file", tone: "good" } : sch === "Declined" ? { word: "Declined", tone: "risk" } : sch === "Not applicable" ? { word: "Not applicable", tone: "neutral" } : school ? { word: "Missing", tone: "risk" } : { word: "Needed", tone: "mid" }) });
  }
  return out;
}

/* ---------------------------------------------------------------- secure form to the patient or guardian */

/** The fields a secure form may ask for. Clinical and psychosocial history is never sent by form: staff ask in person (minimum necessary). */
export function requestable(r: IntakeRecord): FieldSpec[] {
  const prof = PROFILE_GROUPS.flatMap((g) => groupSpecs("profile", g)).filter((s) => applies(s, r) !== "no");
  const cov = specsFor("coverage").filter((s) => s.key === "medicaidId" || s.key === "secondary" || s.key === "otherCoverage");
  return [...prof, ...cov];
}
const pendingOf = (r: IntakeRecord, s: FieldSpec): Suggestion | undefined => r.suggestions.find((x) => x.status === "pending" && x.section === s.section && x.field === s.key);
/** Asked by default: required fields that are not done and have no suggestion waiting. */
export const defaultAsk = (r: IntakeRecord): string[] => requestable(r).filter((s) => isRequired(s, ctxOf(r)) && !isDone(s.key, valueAt(r, s)) && !pendingOf(r, s)).map((s) => s.key);
export function askStatus(r: IntakeRecord, s: FieldSpec): string {
  if (pendingOf(r, s)) return "Suggestion waiting";
  const fv = valueAt(r, s);
  if (!fv || !fv.value.trim()) return isRequired(s, ctxOf(r)) ? "Missing" : "Not collected";
  if (fv.state === "needs_confirmation" || fv.state === "ai_suggested") return "Needs confirmation";
  return isDone(s.key, fv) ? "On file" : "Not complete";
}

/* Synthetic answers. Only the legal-name field carries an invented full name; contacts use initials and 555-01xx numbers. */
const FIRST = ["Avery", "Blair", "Casey", "Devon", "Emery", "Finley", "Gray", "Harper", "Indigo", "Jules", "Kendall", "Logan", "Marlo", "Noel", "Oakley", "Parker", "Quinn", "Rowan", "Sage", "Tatum", "Umi", "Vale", "Wren", "Xan", "Yael", "Zion"];
const LAST = ["Abbott", "Barlow", "Carver", "Dalton", "Ellison", "Fairley", "Garland", "Hollis", "Ingram", "Jessup", "Kessler", "Lowell", "Marsh", "Norwood", "Oakes", "Prescott", "Quill", "Radley", "Sutton", "Thorne", "Upton", "Vance", "Whitlock", "Xu", "Yardley", "Zeller"];
const letter = (c: string | undefined) => Math.max(0, (c ?? "A").toUpperCase().charCodeAt(0) - 65) % 26;
const numOf = (r: IntakeRecord) => Number(r.id.replace(/\D/g, "").slice(-2)) || 7;
const phone = (r: IntakeRecord, offset: number) => `(${r.site === "B" ? "757" : "804"}) 555-01${String((numOf(r) + offset) % 100).padStart(2, "0")}`;

/** What the simulated reply says for one field, or null when the person left it blank. */
export function replyValue(r: IntakeRecord, key: string, now: number): string | null {
  const cur = (k: string) => r.profile[k]?.value || "";
  const [fi, li] = r.initials.replace(/[^A-Za-z.]/g, "").split(".").filter(Boolean);
  const minor = r.age !== null && r.age < 18;
  switch (key) {
    case "legalName": return cur("legalName") || (fi ? `${FIRST[letter(fi)]} ${LAST[letter(li)]}` : null);
    case "preferredName": return cur("legalName") ? cur("legalName").split(" ")[0] : null;
    case "dob": return cur("dob") || (r.age !== null ? `${toDate(now).getFullYear() - r.age}-01-15` : null);
    case "phone": return phone(r, 61);
    case "address": return `${r.site === "B" ? "Norfolk" : "Henrico"}, VA (synthetic address)`;
    case "language": return cur("language") || "English";
    case "interpreter": return "No";
    case "commPrefs": return "Text messages after 3 pm";
    case "emergencyContact": return minor ? "Same as the guardian" : `Family member, ${phone(r, 73)}`;
    case "guardianName": return cur("guardianName") || `${"KLMDRS"[numOf(r) % 6]}.${li ?? "A"}. (parent)`;
    case "guardianPhone": return r.suggestions.find((x) => x.status === "pending" && x.field === "guardianPhone")?.value ?? phone(r, 42);
    case "consentTreatment": return "Signed";
    case "roi": return "On file";
    case "schoolConsent": return "On file";
    case "medicaidId": return r.coverage.medicaidId?.value || `•••• ${String(1000 + ((numOf(r) * 389) % 9000))}`;
    case "secondary": return "None";
    case "otherCoverage": return "None";
    default: return null;
  }
}
export function replyAnswers(r: IntakeRecord, fields: RequestedField[], now: number) {
  const answers = fields.map((f) => ({ section: f.section, field: f.key, value: replyValue(r, f.key, now) }));
  return { answers: answers.filter((a): a is typeof a & { value: string } => a.value !== null), blank: answers.filter((a) => a.value === null).length };
}

/** "Sentara Community Plan, through its plan provider portal" or "Acentra Health, through Atrezzo Next Generation in the DMAS MES portal". */
export function reviewerOf(payerId?: string | null): string | null {
  const p = payerId ? vaPlanOf(payerId) : undefined;
  if (!p) return null;
  return p.coverage === "ffs" ? `${p.reviewer}, through ${p.channel}` : `${p.reviewer}, through its ${p.channel.toLowerCase()}`;
}
