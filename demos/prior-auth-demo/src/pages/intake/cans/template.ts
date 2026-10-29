import type { CansAssessment, CansItem } from "@/data/intake/types";
import type { CansTheme } from "./cansModel";

/* The demo placeholder template: the structure an administrator can load so the item, evidence and rating workflow can be shown while the official
   DMAS CANS Lifetime item mapping is not available. It is NOT CANS content. Its domain headings and prompts are generic words chosen for this demo;
   the prompts carry no official wording, no rating anchors and no scale, and nothing is computed from what a clinician types. */

export const DEMO_TEMPLATE_VERSION = "demo-placeholder-1";
export const DEMO_TEMPLATE_LABEL = "Demo placeholder (not CANS content)";

/** What the official template needs before it can replace this one. Shown wherever the placeholder is shown. */
export const OFFICIAL_NEEDS = [
  "The DMAS-supplied item mapping: domains, items, rating options and instructions",
  "Assessor credentials DMAS accepts to complete and sign it",
  "The effective dates, version and reassessment interval",
];
export const OFFICIAL_NOT_VERIFIED = "Not verified: none of these are loaded in this demo.";
/** The same needs as one sentence, for the banner over the placeholder items. */
export const OFFICIAL_NEEDS_LINE = "The official template needs the DMAS-supplied item mapping, qualified assessor credentials and effective dates. Not verified: none are loaded.";

interface DemoItem { id: string; name: string; words: string[] }
export interface DemoDomain { id: string; label: string; theme: CansTheme; clinician?: boolean; items: DemoItem[] }

const item = (id: string, name: string, words: string[] = []): DemoItem => ({ id, name, words });

export const DEMO_DOMAINS: DemoDomain[] = [
  { id: "d-functioning", label: "Functioning", theme: "Functioning", items: [item("d-functioning.1", "Daily routines and self-care", ["routine", "sleep", "hygiene", "meals", "self-care", "skills"]), item("d-functioning.2", "Roles at home, work or school", ["work", "job", "school", "chores", "class", "college"])] },
  { id: "d-symptoms", label: "Symptoms and emotions", theme: "Symptoms", items: [item("d-symptoms.1", "What the person is experiencing", ["mood", "voices", "hallucinat", "panic", "anxi", "depress", "suspicious", "tearful"]), item("d-symptoms.2", "How it affects the day", ["withdrawn", "missed", "unable", "affects", "sleep"])] },
  { id: "d-strengths", label: "Strengths", theme: "Supports and strengths", items: [item("d-strengths.1", "What the person does well", ["enjoys", "good at", "strength", "talent", "art"]), item("d-strengths.2", "Who and what helps", ["friends", "supportive", "involved", "gets on well", "helps"])] },
  { id: "d-risk", label: "Risk behaviors (clinician review)", theme: "Risk (needs clinician review)", clinician: true, items: [item("d-risk.1", "Safety information in the record", ["safety", "suicid", "self-harm", "thoughts of death", "aggress", "harm"])] },
  { id: "d-family", label: "Caregiver and family", theme: "Family", items: [item("d-family.1", "Caregiver involvement and resources", ["mother", "father", "parent", "guardian", "caregiver"]), item("d-family.2", "Family circumstances", ["family", "at home", "lives with", "household", "moved"])] },
  { id: "d-education", label: "Education", theme: "School", items: [item("d-education.1", "Attendance and participation", ["attendance", "missed", "class", "school days", "removed from class"]), item("d-education.2", "Supports in place", ["504", "iep", "teacher", "counselor", "plan"])] },
  { id: "d-substance", label: "Substance use", theme: "Substance use", items: [item("d-substance.1", "Use documented in the record", ["alcohol", "drinking", "opioid", "cannabis", "substance", "methamphetamine"])] },
  { id: "d-daily", label: "Daily living and independence", theme: "Functioning", items: [item("d-daily.1", "Housing and money", ["apartment", "housing", "lives alone", "budget", "rent", "income"]), item("d-daily.2", "Health care and medications", ["medication", "appointments", "pharmacy", "risperidone", "adherence"])] },
  { id: "d-community", label: "Community and relationships", theme: "Supports and strengths", items: [item("d-community.1", "Connections and activities", ["friends", "community", "club", "activities", "peers", "church"])] },
  { id: "d-other", label: "Other concerns", theme: "Other", items: [item("d-other.1", "Anything else the assessor records", [])] },
];

const COMMUNITY_WORDS = /\b(friends?|community|club|activities|peers?|church|neighbou?rs?)\b/i;
const DAILY_WORDS = /\b(apartment|housing|lives alone|budget|rent|income|medications?|pharmacy|appointments?|risperidone)\b/i;

export const domainById = (id: string): DemoDomain | undefined => DEMO_DOMAINS.find((d) => d.id === id);
export const domainOfItem = (itemId: string): DemoDomain | undefined => DEMO_DOMAINS.find((d) => d.items.some((i) => i.id === itemId));

/** The template domain a Psyflo evidence theme belongs under (with the statement, to tell Daily living and Community from Functioning and Strengths). */
export function domainForTheme(theme: string | undefined, text: string): DemoDomain {
  const pick = (id: string) => domainById(id) as DemoDomain;
  switch (theme) {
    case "Functioning": return DAILY_WORDS.test(text) ? pick("d-daily") : pick("d-functioning");
    case "Symptoms": return pick("d-symptoms");
    case "Risk (needs clinician review)": return pick("d-risk");
    case "Supports and strengths": return COMMUNITY_WORDS.test(text) ? pick("d-community") : pick("d-strengths");
    case "School": return pick("d-education");
    case "Family": return pick("d-family");
    case "Substance use": return pick("d-substance");
    default: return pick("d-other");
  }
}

/** The item of a domain whose words the statement uses most; the domain's first item when none match. The agent only points at it: a person ties evidence to an item. */
export function relevantItem(domainId: string, text: string): { id: string; name: string; matched: string[] } | null {
  const d = domainById(domainId);
  if (!d) return null;
  const lower = text.toLowerCase();
  let best = d.items[0];
  let bestHits: string[] = [];
  for (const it of d.items) {
    const hits = it.words.filter((w) => lower.includes(w));
    if (hits.length > bestHits.length) {
      best = it;
      bestHits = hits;
    }
  }
  return { id: best.id, name: best.name, matched: bestHits };
}

/** The blank items and domains a record starts with when the template is loaded: no ratings, no options, nothing computed. */
export function buildDemoItems(): Pick<CansAssessment, "domains" | "items"> {
  return {
    domains: DEMO_DOMAINS.map((d) => ({ id: d.id, label: d.label, itemIds: d.items.map((i) => i.id) })),
    items: DEMO_DOMAINS.flatMap((d) => d.items.map((i): CansItem => ({ id: i.id, domainId: d.id, name: i.name, options: null, response: null, state: "unrated", evidence: [], placeholder: true }))),
  };
}
