import type { IntakeRecord } from "@/data/intake/types";
import { cansFor, REDESIGN_START, vaDate, type CansApplies, type PolicyRule } from "@/data/va/policy";
import type { Tone } from "@/data/types";
import { toDate } from "@/lib/time";

/* What the CANS section may say. Every sentence about the CANS Lifetime's content says that it is not configured: the official items, domains,
   scoring, frequency and assessor qualifications come from DMAS, and Psyflo invents none of them. */

export const CANS_THEMES = ["Functioning", "Symptoms", "Risk (needs clinician review)", "Supports and strengths", "School", "Family", "Substance use", "Other"] as const;
export type CansTheme = (typeof CANS_THEMES)[number];
export const RISK_THEME: CansTheme = "Risk (needs clinician review)";
export const isTheme = (t: string | undefined): t is CansTheme => !!t && (CANS_THEMES as readonly string[]).includes(t);

export const TEMPLATE_VERSION = "awaiting-dmas-mapping";
export const NO_ITEMS = "No items are configured. Psyflo does not invent CANS Lifetime items, domains, scoring, rating frequency or assessor qualifications.";
export const TEMPLATE_FAIL = "Cannot validate: the official DMAS item mapping is not available in this demo";
export const NO_RATINGS = "No ratings. Missing evidence is never scored as zero.";
export const THEMES_NOTE = "Themes organize evidence. They are not CANS domains.";
export const ASSESSOR_PENDING = "Assessor qualifications pending DMAS policy";
export const REASSESS_PENDING = "No interval set: pending DMAS policy";
export const SIGN_BLOCKED = "Signing is off: the official CANS Lifetime template is not configured, so there is nothing to sign.";

/** CANS applicability for the record as of `now`. `cansFor` decides by the planned service date; before July 1, 2027 a required CANS is
    still preparation only, because the redesigned service is not in effect yet (the policy preview moves `now` to July 1, 2027). */
export function cansApplies(r: IntakeRecord, now: number): { applies: CansApplies; rule?: PolicyRule } {
  const c = cansFor(r.serviceId, r.serviceDate);
  if (c.applies === "required" && now < REDESIGN_START) return { ...c, applies: "upcoming" };
  return c;
}

export const APPLIES_LABEL: Record<CansApplies, string> = {
  required: "Required (draft policy)",
  upcoming: "Preparation only",
  unresolved: "Not confirmed",
  not_applicable: "Does not apply",
};
export const APPLIES_TONE: Record<CansApplies, Tone> = { required: "mid", upcoming: "neutral", unresolved: "mid", not_applicable: "neutral" };

export const CANS_STATUS_LABEL: Record<NonNullable<IntakeRecord["cans"]>["status"], string> = {
  not_started: "Not started",
  in_progress: "Gathering evidence",
  ready_for_review: "Ready for review",
  signed: "Signed",
};

/** Psyflo's own prompts for a theme with no evidence yet. Questions for staff to ask, not CANS items. */
export const THEME_PROMPT: Record<CansTheme, string> = {
  Functioning: "Ask how daily routines, work or school, and self-care are going.",
  Symptoms: "Ask what has changed recently and what worries the person most.",
  "Risk (needs clinician review)": "A clinician reviews any safety concern directly. Psyflo does not assess risk.",
  "Supports and strengths": "Ask who helps, and what the person is good at or enjoys.",
  School: "Ask about attendance, grades and school supports, if relevant.",
  Family: "Ask who lives at home and how the family is doing.",
  "Substance use": "Ask about alcohol and drug use, if not already documented.",
  Other: "Anything else the person wants the team to know.",
};

/* Keyword rules that place a sentence under a Psyflo theme. Order matters: risk wording always goes to clinician review first. */
const THEME_RULES: [CansTheme, RegExp][] = [
  ["Risk (needs clinician review)", /\b(safety|suicid|self-harm|thoughts of death|harm to|aggress|does not care what happens)/i],
  ["Substance use", /\b(alcohol|drinking|opioid|buprenorphine|methamphetamine|substance|cannabis)/i],
  ["Symptoms", /\b(mood|tearful|withdrawn|sleep|voices|hallucinat|suspicious|panic|depress|anxi|psychos)/i],
  ["Supports and strengths", /\b(friends|gets on well|strength|goals?:|involved|enjoys)/i],
  ["School", /\b(school|class|grades?|teacher|504|student|college)/i],
  ["Family", /\b(mother|father|parent|guardian|family|at home)/i],
  ["Functioning", /\b(daily living|routines|budget|works?\b|job|apartment|lives alone|skills)/i],
  ["Other", /\b(hospital|admission|medication|risperidone|diagnos|counselor|therap)/i],
];
export function themeOf(text: string): CansTheme | null {
  return THEME_RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

const pad = (x: number) => String(x).padStart(2, "0");
/** Demo minutes as "YYYY-MM-DD" for a date input. */
export function isoOf(m: number): string {
  const d = toDate(m);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** A date input's value as demo minutes (midnight), or null when empty or invalid. */
export const fromIso = (iso: string): number | null => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? vaDate(iso) : null);
