import type { PayerId } from "./types";

export type StepState = "completed" | "in_progress" | "gate" | "pending";

export type AppealStep = {
  key: string;
  title: string;
  state: StepState;
  at?: string;
  note?: string;
};

export type AppealDoc = {
  name: string;
  part: 1 | 2 | 3;
  pages: number;
  status: "ready" | "missing" | "needs_signature";
};

export type ReasoningCard = {
  title: string;
  body: string;
  tone: "info" | "good" | "warn";
};

export type Appeal = {
  id: string;
  denialId: string;
  mrn: string;
  payerId: PayerId;
  level: "P2P" | "Level 1" | "Level 2" | "External review";
  channel: "fax" | "portal" | "email";
  destination: string;
  deadline: string;
  filedAt?: string;
  receiptConfirmedAt?: string;
  decisionDueAt?: string;
  outcome?: "won" | "lost";
  freeCareDays: number;
  steps: AppealStep[];
  docs: AppealDoc[];
  reasoning: ReasoningCard[];
  coverLetter: string;
  appealLetterExcerpt: string;
  callTranscript?: { who: string; text: string }[];
};
