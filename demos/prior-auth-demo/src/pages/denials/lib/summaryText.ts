import type { Tone } from "@/data/types";
import { DIM_TONE_WORD, paragraphs, type LongText } from "./long";
import type { DenialView } from "./useDenialView";

/* Plain-text versions of the two "Full summary" pop-ups, for Copy all. Headings in capitals and numbered lines, so they paste cleanly into a note or an email. */

const head = (view: DenialView, title: string): string[] => [title, `${view.req.id} · ${view.analysis.ctx.who} · ${view.analysis.ctx.payerName} · ${view.analysis.ctx.program}`, ""];
const bullets = (items: string[]): string[] => [...items.map((c) => `- ${c}`), ""];

/** One numbered recommendation, as copied by its own Copy button. */
export const recommendationText = (r: { title: string; text: string }): string => `${r.title}\n${r.text}`;

export function dimensionText(d: { name: string; tone: Tone; text: string }): string {
  return `${d.name} (${DIM_TONE_WORD[d.tone]})\n${d.text}`;
}

export function weakSummaryText(view: DenialView, long: LongText): string {
  const { analysis } = view;
  return [
    ...head(view, "Where the denial is weak, full summary"),
    "WHAT THE CHART SHOWS AS A WHOLE",
    ...paragraphs(long.synthesis).flatMap((p) => [p, ""]),
    "FINDINGS",
    ...analysis.findings.flatMap((f, i) => [`${i + 1}. [${f.sev}] ${f.title}`, long.findings[i], `Source: ${f.source}`, ""]),
    "WHAT WE WOULD DO",
    ...long.recommendations.flatMap((r, i) => [`${i + 1}. ${r.title}`, r.text, ""]),
    "CRITERIA TO CITE",
    ...bullets(long.criteria),
    "DOCUMENTS TO ATTACH",
    ...bullets(long.evidence),
    "IF THE PAYER PUSHES BACK",
    long.outlook,
  ].join("\n");
}

export function dimsSummaryText(view: DenialView, long: LongText): string {
  return [
    ...head(view, "The six ASAM dimensions, full summary"),
    ...long.dims.flatMap((d) => [`${d.name.toUpperCase()} (${DIM_TONE_WORD[d.tone]})`, d.text, ""]),
  ].join("\n").trimEnd();
}
