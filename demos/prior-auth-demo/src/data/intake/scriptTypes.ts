import type { ProgramId } from "../assess/types";
import type { ScribeField } from "./scriptBlocks";
import type { AssessmentSectionId, NoteSectionId, TranscriptTurn } from "./types";

/* The shapes of the simulated conversations, and the two helpers the fixed scripts and the voice assistant use to say what a line extracts. */

export type Speaker = TranscriptTurn["speaker"];
export type FieldTarget = "referral" | "profile" | "coverage" | "assessment";
export interface Extract { section: FieldTarget; field: string; label: string; value: string; confidence: "high" | "medium" | "low" }

/* ------------------------------------------------------------------ AI Scribe */

export interface ScribeTurn {
  /** Seconds into the conversation. */
  at: number;
  speaker: Speaker;
  /** What speaker identification labeled it, when it got it wrong. */
  heardAs?: Speaker;
  text: string;
  /** Text the Clinical Documentation Agent adds to each note section. */
  note?: Partial<Record<NoteSectionId, string>>;
  /** What the scribe proposes from this turn: values for shared fields, evidence for an assessment module, or CANS evidence themes. */
  fields?: ScribeField[];
  /** The topic of the conversation this turn belongs to ("Withdrawal concerns"), for the scribe's "detected documentation" list. */
  block?: string;
  /** A statement about risk. It goes to "Risk information requiring review"; `alert` raises a safety alert for a clinician. */
  risk?: { text: string; alert: boolean };
  /** Information the conversation shows is missing, and items it answered. */
  missing?: string[];
  resolves?: string[];
}
export interface ScribeScript {
  id: string;
  /** Display label for each speaker. */
  labels: Partial<Record<Speaker, string>>;
  /** Who can give consent to the recording. */
  consenters: string[];
  encounterType: string;
  others: string;
  initialMissing: string[];
  turns: ScribeTurn[];
  /** What the agent writes when the recording stops. */
  closing: { summary: string; plan: string };
  /** The topics this interview covers, in order: the scribe's "detected documentation" list shows which have come up. Left out for the fixed scripts. */
  categories?: string[];
  /** The program the interview was composed for. Left out for the fixed scripts. */
  program?: ProgramId;
}

export const A = (section: FieldTarget, field: string, label: string, value: string, confidence: Extract["confidence"] = "medium"): Extract => ({ section, field, label, value, confidence });
const L = Object.fromEntries((
  [["presenting", "Presenting problem"], ["symptoms", "Current symptoms"], ["history", "Clinical history"], ["functional", "Functional limitations"], ["strengths", "Strengths"], ["sdoh", "Social determinants and barriers"], ["prior", "Prior treatment"], ["goals", "Patient goals"], ["needs", "Preliminary service needs"]] as const
)) as Record<Exclude<AssessmentSectionId, "mse" | "safety" | "narrative">, string>;
export const as = (id: keyof typeof L, value: string, c: Extract["confidence"] = "medium") => A("assessment", id, L[id], value, c);
