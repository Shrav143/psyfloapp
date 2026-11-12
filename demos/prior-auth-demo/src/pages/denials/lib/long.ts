import { AUTHORED_TEXT, type DenialType } from "@/data/denials";
import { DIMS_LONG, DIMS_LONG_AUTHORED, ELABORATED, ELABORATED_AUTHORED, type Elaborated, type LongRecommendation } from "@/data/denialsElaborated";
import type { Tone } from "@/data/types";
import { fill, type DenialAnalysis } from "./analysis";

/** `label` is the dimension's number and its framework name ("D1 Acute intoxication and withdrawal potential"). */
export interface LongDim { label: string; tone: Tone; text: string }

/** The long version of one denial's analysis, ready to show or print. Every field has a fallback built from the short text,
    so the pop-ups and the report still read well when a denial has no long text yet. */
export interface LongText {
  /** What the chart shows as a whole. Paragraphs are separated by a blank line (see `paragraphs`). */
  synthesis: string;
  /** One long paragraph per finding, in the order of `analysis.findings`. */
  findings: string[];
  recommendations: LongRecommendation[];
  criteria: string[];
  evidence: string[];
  outlook: string;
  dims: LongDim[];
}

const NONE: Elaborated = { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" };

/** Splits a text with blank lines into paragraphs. */
export const paragraphs = (s: string): string[] => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** A denial with hand-written long text uses it; every other one uses the default for its kind of denial. A line left empty falls back to the short text.
    A denial with hand-written short text but no long text yet does not borrow the default: its findings would not line up with the default's paragraphs. */
export function buildLong(denialId: string, type: DenialType, a: DenialAnalysis): LongText {
  const byType = ELABORATED[type] ?? NONE;
  // The type texts cite ASAM dimensions by number, so a denial under LOCUS or CASII keeps their reading of the chart but builds its own advice and criteria.
  const src = ELABORATED_AUTHORED[denialId] ?? (AUTHORED_TEXT[denialId] ? NONE : a.framework.id === "asam" ? byType : { ...byType, recommendations: [], criteria: [] });
  const f = (s: string) => fill(s, a.ctx);
  const pick = (list: string[], own: string[]) => (list.length ? list.map(f) : own);

  const recommendations = src.recommendations.length
    ? src.recommendations.map((r) => ({ title: f(r.title), text: f(r.text) }))
    : [...a.points.map((p) => ({ title: p.title, text: `${p.detail} Source: ${p.source}.` })), { title: "Make the ask", text: a.ask }];
  const outlook = src.outlook ? f(src.outlook) : `${a.verdictLine} ${a.benchmark ? "The chance is a benchmark estimate, so expect to adjust it as more decisions come in." : `The chance comes from ${a.similar} similar ${a.ctx.payer} decisions.`}`;
  const own = DIMS_LONG_AUTHORED[denialId];

  return {
    synthesis: src.synthesis ? f(src.synthesis) : a.chartShows,
    findings: a.findings.map((x, i) => (src.findings[i] ? f(src.findings[i]) : x.detail)),
    recommendations,
    criteria: pick(src.criteria, [`${a.ctx.payerName}'s own criteria for ${a.ctx.program}`, ...(a.dims.length ? [`${a.framework.name}, read across all six dimensions`] : [])]),
    evidence: pick(src.evidence, a.findings.map((x) => x.source)),
    outlook,
    dims: a.dims.map((d) => ({ label: d.label, tone: d.tone, text: f(own?.[d.key] || DIMS_LONG[d.key]?.[d.tone] || d.text) })),
  };
}

/** The plain word for the dot on a framework dimension: colour is never the only signal. */
export const DIM_TONE_WORD: Record<Tone, string> = { good: "Low concern", mid: "Some concern", risk: "High concern", neutral: "Not rated" };
