import { useEffect, useRef, useState } from "react";
import { chanceOfDraft, draftState, FLAKY_PORTAL, RUN_STEPS, type CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { pendingFor } from "./questions";
import { agentNow, dashboardNote } from "./runText";

/** How much of a step runs before Scribe (or Packet) stops to ask, and how much after the answer. Verify gets this far before it cannot reach the portal. */
const BEFORE_QUESTION = 0.45;
const BEFORE_FAILURE = 0.6;
const FAST_MS = 140;

/** Drives the agents one step at a time while the page is open. All progress is written to the draft, so leaving and coming back resumes.
    The run holds while an agent waits for an answer or for Retry or Skip, and while the agent at this step is paused in Settings.
    Verify cannot reach Anthem's portal the first time a case runs: the row says so, and Retry then works. */
export function useAgentRun(draft: CaseDraft, fast: boolean) {
  const advance = useStore((s) => s.advanceCaseRun);
  const ask = useStore((s) => s.askCaseQuestion);
  const fail = useStore((s) => s.failCaseStep);
  const { done, asked, question, failed } = draft.run;
  const step = RUN_STEPS[done];
  const finished = done >= RUN_STEPS.length;
  /** The agent whose turn it is is paused in Settings. */
  const holding = useStore((s) => !!step && s.agentPaused[step.agent]);
  const due = !!step && !question && pendingFor(draft, step.agent).length > 0;
  const fails = !!step && step.agent === "verify" && draft.payerId === FLAKY_PORTAL && !draft.run.retried && !draft.run.skipped.includes("verify");
  const running = !finished && !question && !failed && !holding;

  useEffect(() => {
    if (!running || !step) return;
    const share = due ? (asked ? 0 : BEFORE_QUESTION) : fails ? BEFORE_FAILURE : asked ? 1 - BEFORE_QUESTION : 1;
    const act = () => (due ? ask(draft.id) : fails ? fail(draft.id, step.agent) : advance(draft.id, Math.max(1, Math.round(step.ms / 1000))));
    const t = setTimeout(act, fast ? FAST_MS : step.ms * share);
    return () => clearTimeout(t);
  }, [running, step, due, fails, asked, fast, ask, fail, advance, draft.id]);

  /* The Dashboard shows the agent and the note of a request that is being prepared; keep them in step with the run. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const st = useStore.getState();
    const d = st.caseDrafts.find((x) => x.id === draft.id);
    if (d?.caseId && st.requests.some((r) => r.id === d.caseId)) st.updateRequest(d.caseId, { agent: agentNow(d), next: dashboardNote(d), needsYou: draftState(d) === "question" || !!d.run.failed, chance: chanceOfDraft(d) ?? undefined });
  }, [done, question, failed, draft.id]);

  /* The clock chip counts up while agents work. */
  const [secs, setSecs] = useState(() => draft.run.elapsed.reduce((a, b) => a + b, 0));
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  return { finished, running, secs, holding };
}
