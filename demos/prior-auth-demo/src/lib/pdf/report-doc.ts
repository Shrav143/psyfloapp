/* The appeal analysis report as plain data. Denial Intelligence builds it once (pages/denials/lib/report.ts); the screen, Copy report and the PDF all read it,
   so the three always say the same thing. */

export type ReportTone = "good" | "mid" | "risk" | "neutral";

/** A label and its value, shown as a row. */
export type ReportFact = [label: string, value: string];
export interface ReportFinding {
  n: number;
  sev: "Critical" | "Strong";
  title: string;
  text: string;
  source: string;
  excerpt: string;
  fix: string;
  /** The person added this fix to the evidence on the denial page. */
  added: boolean;
}
export interface ReportDim { name: string; tone: ReportTone; toneWord: string; text: string }
export interface ReportOption { title: string; recommended: boolean; chance: string; time: string; gain: string; needs: string[] }
export interface ReportFix { text: string; source: string; added: boolean }

export interface ReportDoc {
  id: string;
  fileName: string;
  /** Shown beside the title only for the paraphrased worked example. */
  workedExample: boolean;
  payerName: string;
  /** "Mon 10/19/2026" style date from the demo clock. */
  generatedOn: string;
  facts: ReportFact[];
  verdict: { word: string; tone: ReportTone; line: string };
  /** Approval chance lines, and a note when the estimate rests on fewer than 60 similar decisions. */
  chances: ReportFact[];
  chanceNote?: string;
  reasoning: { quote: string; gap: string };
  synthesis: string[];
  findings: ReportFinding[];
  /** Empty for denials with no framework dimensions (late notice, retro-authorization). */
  dims: ReportDim[];
  dimsSub: string;
  /** The heading of the dimensions section, named after the denial's framework ("ASAM Criteria dimensions", "LOCUS dimensions"). Falls back to REPORT_HEADINGS.dims. */
  dimsTitle?: string;
  recommendations: { title: string; text: string }[];
  options: ReportOption[];
  criteria: string[];
  documents: string[];
  fixes: ReportFix[];
  pushback: [string, string][];
  ask: string;
  outlook: string;
  timeline: ReportFact[];
  agents: { name: string; text: string }[];
  method: string[];
}

/** The section headings, in order. The screen, the text and the PDF all use these words. */
export const REPORT_HEADINGS = {
  reasoning: "The payer's reasoning",
  synthesis: "What the chart shows as a whole",
  weak: "Where the denial is weak",
  dims: "The six ASAM dimensions",
  todo: "What we would do",
  options: "Your options compared",
  criteria: "Criteria to cite",
  documents: "Documents to attach",
  pushback: "Likely pushback and replies",
  ask: "The ask",
  outlook: "Outlook",
  timeline: "Timeline and deadlines",
  method: "How this report was made",
} as const;

export const REPORT_TITLE = "Appeal analysis report";
/** The one sentence that sits next to every letter, brief, report and recommendation FLO's agents generate. */
export const REVIEW_NOTE = "Draft by FLO's agents. A clinician reviews and signs before anything is sent.";
export const REPORT_FOOTER = REVIEW_NOTE;
