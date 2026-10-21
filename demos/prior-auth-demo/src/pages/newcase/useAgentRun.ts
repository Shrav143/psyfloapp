import { useEffect, useRef, useState } from "react";
import { currentChance, draftState, QUESTIONS, RUN_STEPS, type CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { agentNow, dashboardNote } from "./runText";

/** How much of a step runs before Scribe (or Packet) stops to ask, and how much after the answer. */
const BEFORE_QUESTION = 0.45;
const FAST_MS = 140;

/** Drives the agents one step at a time while the page is open. All progress is written to the draft, so leaving and coming back resumes.
    The run stops on its own while an agent waits for an answer or the person pauses all agents. */
export function useAgentRun(draft: CaseDraft, paused: boolean, fast: boolean) {
  const advance = useStore((s) => s.advanceCaseRun);
  const ask = useStore((s) => s.askCaseQuestion);
  const { done, asked, question } = draft.run;
  const step = RUN_STEPS[done];
  const finished = done >= RUN_STEPS.length;
  const questionStep = !!step && !!draft.questionKey && QUESTIONS[draft.questionKey].agent === step.agent;
  const asking = questionStep && !asked;
  const running = !finished && !question && !paused;

  useEffect(() => {
    if (!running || !step) return;
    const share = questionStep ? (asked ? 1 - BEFORE_QUESTION : BEFORE_QUESTION) : 1;
    const t = setTimeout(() => (asking ? ask(draft.id) : advance(draft.id, Math.max(1, Math.round(step.ms / 1000)))), fast ? FAST_MS : step.ms * share);
    return () => clearTimeout(t);
  }, [running, step, questionStep, asked, asking, fast, ask, advance, draft.id]);

  /* The Dashboard shows the agent and the note of a request that is being prepared; keep them in step with the run. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const st = useStore.getState();
    const d = st.caseDrafts.find((x) => x.id === draft.id);
    if (d?.caseId && st.requests.some((r) => r.id === d.caseId)) st.updateRequest(d.caseId, { agent: agentNow(d), next: dashboardNote(d), needsYou: draftState(d) === "question", chance: currentChance(d) });
  }, [done, question, draft.id]);

  /* The clock chip counts up while agents work. */
  const [secs, setSecs] = useState(() => draft.run.elapsed.reduce((a, b) => a + b, 0));
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  return { finished, running, secs };
}
