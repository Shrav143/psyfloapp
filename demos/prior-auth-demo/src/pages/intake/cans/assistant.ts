import type { CansAssessment, EvidenceRef, IntakeRecord, SourceRef } from "@/data/intake/types";
import { CANS_THEMES, RISK_THEME, isTheme, type CansTheme } from "./cansModel";

/* The CANS assistant's reading of one record (pure). It works only with what the record holds: no official items are configured, so every
   item is unanswered and nothing is rated. It points at gaps by Psyflo evidence theme, suggests interview follow-ups (Psyflo prompts, never
   CANS items), finds statements that disagree, and says why accepted evidence still needs a person's review. */

/** Interview prompts for a theme with no evidence yet. Plain questions a clinician may ask; not CANS items, not scored. */
const FOLLOW_UPS: Record<Exclude<CansTheme, "Other">, string[]> = {
  Functioning: ["How are day-to-day routines going: sleep, meals, getting out of the house?", "What has been harder to do in the last month than before?"],
  Symptoms: ["What has been bothering you most, and since when?", "How often does it happen, and what makes it better or worse?"],
  "Risk (needs clinician review)": ["A clinician asks the clinic's own safety screening questions in person. The assistant does not ask them."],
  "Supports and strengths": ["Who do you count on when things are hard?", "What are you good at, or proud of?"],
  School: ["How is school going: attendance, grades, getting along with teachers and classmates?", "Is there a school plan (504 or IEP) in place?"],
  Family: ["Who lives at home, and how are things between you?", "Has anything changed at home recently?"],
  "Substance use": ["Has alcohol or drug use come up? The clinic's own screening tool is used if so."],
};

export interface Contradiction {
  id: string;
  topic: string;
  a: { text: string; source: SourceRef };
  b: { text: string; source: SourceRef };
}
export interface ReviewNote {
  evidenceId: string;
  text: string;
  why: string;
}
export interface CansReading {
  /** Items mapped from the official template: none until DMAS's mapping is loaded (the demo placeholder's blank prompts are not official items). */
  itemsMapped: number;
  gaps: { theme: CansTheme; questions: string[] }[];
  contradictions: Contradiction[];
  review: ReviewNote[];
}

/** Pairs of statements that cannot both be true as written. Each rule has a "says yes" and a "says no" pattern on the same topic. */
const RULES: { topic: string; yes: RegExp; no: RegExp }[] = [
  { topic: "Thoughts of death or self-harm", yes: /\b(thoughts? of death|hurt (him|her|them)?self|suicid|not safe|kill)/i, no: /\b(no (current )?(plan|thoughts of|suicidal)|denies (any )?(thoughts|plan|suicid|self-harm|risk)|no current thoughts)/i },
  { topic: "Hospitalizations", yes: /\b(admitted|admission|hospitali[sz]ation|inpatient)\b/i, no: /\bno hospitali[sz]ations?\b/i },
  { topic: "Medications", yes: /\b(mg|risperidone|sertraline|fluoxetine|aripiprazole|started on|takes? (his|her|their)? ?medication)/i, no: /\bno (current )?medications?\b/i },
  { topic: "Current therapist", yes: /\b(sees|seeing|current) (a |an )?(therapist|counselor)\b/i, no: /\bno current therapist\b/i },
];

interface Statement {
  text: string;
  source: SourceRef;
}

function statements(r: IntakeRecord, cans: CansAssessment): Statement[] {
  const out: Statement[] = cans.evidence.map((e) => ({ text: e.text, source: e.source }));
  for (const [key, fv] of Object.entries(r.assessment.fields)) if (fv?.value) out.push({ text: fv.value, source: fv.source ?? { kind: "staff", ref: `Clinical assessment: ${key}` } });
  for (const key of ["medications", "psychHistory", "substanceUse"]) {
    const fv = r.profile[key];
    if (fv?.value) out.push({ text: fv.value, source: fv.source ?? { kind: "staff", ref: `Patient profile: ${key}` } });
  }
  for (const key of ["previousServices", "hospitalization", "symptoms", "concerns"]) {
    const fv = r.referral[key];
    if (fv?.value) out.push({ text: fv.value, source: fv.source ?? { kind: "staff", ref: `Referral: ${key}` } });
  }
  return out;
}

/** A statement that cannot be true together with one already on the record, as written: the topic and who says otherwise, or null. */
export function disagreementOf(r: IntakeRecord, cans: CansAssessment, text: string): string | null {
  const all = statements(r, cans);
  for (const rule of RULES) {
    const says = rule.no.test(text) ? "no" : rule.yes.test(text) ? "yes" : null;
    if (!says) continue;
    const other = all.find((s) => s.text !== text && (says === "yes" ? rule.no.test(s.text) : rule.yes.test(s.text) && !rule.no.test(s.text)));
    if (other) return `${rule.topic}: ${other.source.ref} says otherwise`;
  }
  return null;
}

export function readCans(r: IntakeRecord, cans: CansAssessment): CansReading {
  const themeOfEv = (e: EvidenceRef): CansTheme => (isTheme(e.theme) ? e.theme : "Other");
  const minor = r.age !== null && r.age < 18;
  const gaps = CANS_THEMES.filter((t) => t !== "Other" && !cans.evidence.some((e) => themeOfEv(e) === t))
    .filter((t) => minor || t !== "School")
    .map((t) => ({ theme: t, questions: FOLLOW_UPS[t as Exclude<CansTheme, "Other">] }));

  const all = statements(r, cans);
  const contradictions: Contradiction[] = [];
  for (const rule of RULES) {
    const yes = all.find((s) => rule.yes.test(s.text) && !rule.no.test(s.text));
    const no = all.find((s) => rule.no.test(s.text));
    if (yes && no && yes.text !== no.text) contradictions.push({ id: `${rule.topic}`, topic: rule.topic, a: yes, b: no });
  }

  const review: ReviewNote[] = [];
  for (const e of cans.evidence) {
    if (themeOfEv(e) === RISK_THEME) review.push({ evidenceId: e.id, text: e.text, why: "Risk statements always need a clinician's review. Psyflo does not decide whether a person is safe." });
    else if (e.source.kind === "transcript" || e.source.kind === "voice") review.push({ evidenceId: e.id, text: e.text, why: "Taken from a conversation: confirm the wording and who said it." });
    else if (e.source.kind === "document" && /\b(may|might|possibly|reported|says)\b/i.test(e.text)) review.push({ evidenceId: e.id, text: e.text, why: "Hedged or second-hand in the source: confirm before it is used." });
  }
  return { itemsMapped: cans.template ? 0 : cans.items.length, gaps, contradictions, review };
}
