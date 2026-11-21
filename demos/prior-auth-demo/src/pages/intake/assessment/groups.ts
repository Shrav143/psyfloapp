import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import { ASSESSMENT_SECTIONS, type AssessmentSectionId, type IntakeRecord } from "@/data/intake/types";

/* The clinical interview is shared by every program, so it is asked once. Its twelve sections are grouped by the shared modules of the plan
   (presenting problem, history, safety, functioning, supports, strengths and needs), and each answer says which modules it feeds. The program-specific
   questions stay in the instruments. */

export interface AssessmentGroup {
  id: string;
  label: string;
  /** The core module the group belongs to. */
  module: ModuleId;
  sections: AssessmentSectionId[];
}
export const GROUPS: AssessmentGroup[] = [
  { id: "presenting", label: "Presenting problem", module: "patient-referral", sections: ["presenting", "symptoms", "mse"] },
  { id: "history", label: "History", module: "clinical-history", sections: ["history", "prior"] },
  { id: "safety", label: "Safety", module: "safety", sections: ["safety"] },
  { id: "functioning", label: "Functioning", module: "social-functional", sections: ["functional"] },
  { id: "supports", label: "Supports and barriers", module: "social-functional", sections: ["strengths", "sdoh"] },
  { id: "needs", label: "Goals, needs and narrative", module: "clinical-notes", sections: ["goals", "needs", "narrative"] },
];
export const groupOf = (section: AssessmentSectionId): AssessmentGroup => GROUPS.find((g) => g.sections.includes(section)) as AssessmentGroup;
export const sectionLabel = (id: AssessmentSectionId): string => ASSESSMENT_SECTIONS.find((s) => s.id === id)?.label ?? id;

/** ASAM documentation headings (titles only; the licensed criteria are not reproduced). */
export const ASAM_DIMENSION: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "Intoxication, Withdrawal and Addiction Medications", 2: "Biomedical Conditions", 3: "Psychiatric and Cognitive Conditions",
  4: "Substance Use-Related Risks", 5: "Recovery Environment Interactions", 6: "Person-Centered Considerations",
};

export interface Feed {
  id: ModuleId;
  /** Words that find the field of that module's form the answer is proposed to. */
  words: string[];
}
const f = (id: ModuleId, ...words: string[]): Feed => ({ id, words });
/** The assessment modules each answer can be reused in. Core modules always read it and are not listed. */
export const FEEDS: Record<AssessmentSectionId, { modules: Feed[]; asam?: 1 | 2 | 3 | 4 | 5 | 6 }> = {
  presenting: { modules: [f("psychiatric", "presenting", "reason", "chief"), f("cpst-review", "reason", "why", "request"), f("biopsychosocial", "narrative", "presenting")], asam: 6 },
  symptoms: { modules: [f("psychiatric", "symptom", "current"), f("symptom-severity", "symptom", "frequency", "describe"), f("acute-symptoms", "recent", "onset", "symptom")], asam: 3 },
  history: { modules: [f("psychiatric", "history", "hospital"), f("psych-history", "history", "hospital"), f("sud-history", "history", "onset"), f("psychosis-course", "onset", "course"), f("developmental-history", "history", "milestone")], asam: 2 },
  mse: { modules: [f("psychiatric", "mental status", "observation")], asam: 3 },
  functional: { modules: [f("functional-assessment", "daily", "functioning", "work", "relationship"), f("functional-needs", "need", "help", "daily"), f("functional-changes", "change", "since"), f("adaptive-functioning", "daily", "skills")], asam: 6 },
  safety: { modules: [], asam: 4 },
  strengths: { modules: [f("community-living", "support", "strength", "living"), f("family-supports", "family", "support"), f("recovery-env", "support", "strength")], asam: 5 },
  sdoh: { modules: [f("recovery-env", "housing", "transport", "environment"), f("community-living", "housing", "living"), f("school-functioning", "support", "barrier")], asam: 5 },
  prior: { modules: [f("treatment-history", "prior", "previous", "outcome"), f("sud-history", "treatment history", "treatment")], asam: 1 },
  goals: { modules: [f("cpst-review", "goals", "requested"), f("aba-goals", "goal", "skill"), f("multidisciplinary-plan", "goal", "plan")], asam: 6 },
  needs: { modules: [f("cpst-review", "services", "needs", "requested"), f("functional-needs", "need", "help")], asam: 6 },
  narrative: { modules: [f("biopsychosocial", "narrative", "summary")] },
};
/** The core module (a workspace area) each answer is part of. */
export const CORE_OF: Record<AssessmentSectionId, ModuleId> = {
  presenting: "patient-referral", symptoms: "clinical-history", history: "clinical-history", mse: "clinical-notes", functional: "social-functional", safety: "safety",
  strengths: "social-functional", sdoh: "social-functional", prior: "clinical-history", goals: "clinical-notes", needs: "clinical-notes", narrative: "clinical-notes",
};

/** "Feeds: Safety assessment, ASAM Dimension 4": the labels of the modules in use that read this answer. `labelOf` gives a module its name in this plan. */
export function feedsOf(section: AssessmentSectionId, active: ModuleId[], labelOf: (id: ModuleId) => string = (id) => moduleById(id).label): string[] {
  const on = new Set(active);
  const spec = FEEDS[section];
  const out = [labelOf(CORE_OF[section])];
  for (const m of spec.modules) if (on.has(m.id) && !out.includes(labelOf(m.id))) out.push(labelOf(m.id));
  if (spec.asam && on.has("asam")) out.push(`ASAM Dimension ${spec.asam}`);
  return out;
}

/** How many of the group's sections are documented (a value on file, not an unreviewed AI draft). */
export function groupProgress(r: IntakeRecord, g: AssessmentGroup): { done: number; total: number } {
  const done = g.sections.filter((s) => !!r.assessment.fields[s]?.value).length;
  return { done, total: g.sections.length };
}
