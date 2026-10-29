import type { CaseDetail } from "@/data/caseDetail";
import { FRAMEWORKS, type FrameworkId } from "@/data/frameworks";
import type { Tone } from "@/data/types";

/** The words a rating reads as. ASAM rates risk 0 (none) to 4 (severe); LOCUS and CALOCUS-CASII rate 1 (minimal) to 5 (extreme). */
const ASAM_WORD: [string, Tone][] = [["None", "good"], ["Low", "good"], ["Moderate", "mid"], ["High", "risk"], ["Severe", "risk"]];
const LOCUS_WORD: [string, Tone][] = [["Minimal", "good"], ["Mild", "good"], ["Moderate", "mid"], ["Serious", "risk"], ["Extreme", "risk"]];

export function ratingOf(framework: FrameworkId, rating: number): { word: string; tone: Tone } {
  const fw = FRAMEWORKS[framework];
  const [word, tone] = (framework === "asam" ? ASAM_WORD : LOCUS_WORD)[Math.max(0, Math.min(4, rating - fw.scale.min))];
  return { word, tone };
}

/** "LOCUS · adult mental health", shown where the dimensions are. */
export const frameworkTitle = (framework: FrameworkId): string => (framework === "asam" ? "ASAM Criteria" : framework === "locus" ? "LOCUS · adult mental health" : "CALOCUS-CASII · child and adolescent");

/** Which framework applies and why, in one line. */
export function frameworkWhy(d: Pick<CaseDetail, "framework" | "program" | "levelLabel">): string {
  if (d.framework !== "asam") return `${FRAMEWORKS[d.framework].short} applies: a mental health condition with no substance use disorder, ${d.framework === "locus" ? "adult" : "under 18"}, at ${d.levelLabel}.`;
  if (d.program === "RES" || d.program === "WM") return `ASAM Criteria applies: ${d.levelLabel} is an ASAM level of care for substance use.`;
  return "ASAM Criteria applies: a substance use disorder is part of the diagnosis.";
}
