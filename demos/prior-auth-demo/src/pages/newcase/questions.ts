/* Which questions the agents will ask in a run. Scribe (or Packet) asks one, or two when the chart cannot answer on its own. */
import { defaultQuestion, QUESTIONS, RUN_STEPS, type CaseDraft, type QuestionKey } from "@/data/cases";
import type { AgentKey } from "@/data/types";
import { levelSources } from "./narrative";

const stepOf = (key: QuestionKey): number => RUN_STEPS.findIndex((s) => s.agent === QUESTIONS[key].agent);

/** The first question comes from the chart's own conflict (sertraline) or from the level of care. A second one is asked when the chart leaves a gap:
    no psychiatric evaluation to read how long the diagnosis has been present, or no document (or reason) behind "why a lower level of care is not enough". */
export function planQuestions(d: CaseDraft): QuestionKey[] {
  const conflict = d.documents.some((x) => x.slot === "meds" && x.findings.some((f) => !f.ok && f.resolvedBy === "sertraline"));
  const first: QuestionKey = conflict ? "sertraline" : defaultQuestion(d.program);
  const inCase = (slot: string): boolean => d.documents.some((x) => x.slot === slot);
  const levelDoc = levelSources(d.program ?? "RES")[0][0];
  const extra: QuestionKey | null = !inCase("psych_eval") ? "duration" : !inCase(levelDoc) || !d.reason.trim() ? "lowerlevel" : null;
  return [first, ...(extra ? [extra] : [])].sort((a, b) => stepOf(a) - stepOf(b));
}

/** The planned questions an agent has not asked yet, in order. */
export const pendingFor = (d: CaseDraft, agent: AgentKey): QuestionKey[] => d.questions.filter((k) => QUESTIONS[k].agent === agent && !d.answers.some((a) => a.key === k));

/** "Question 1 of 2": which one this is, and how many this run has. */
export function questionCount(d: CaseDraft): { n: number; of: number } {
  const answered = d.questions.filter((k) => d.answers.some((a) => a.key === k)).length;
  return { n: Math.min(answered + 1, d.questions.length), of: d.questions.length };
}
