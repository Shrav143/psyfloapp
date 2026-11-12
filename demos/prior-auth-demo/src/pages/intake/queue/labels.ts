import type { Tone, Urgency } from "@/data/types";

/* Words and tones the worklists share. Every tone has a word beside it on screen. */

export const URGENCY_LABEL: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };
export const URGENCY_TONE: Record<Urgency, Tone> = { routine: "neutral", urgent: "mid", emergent: "risk" };
