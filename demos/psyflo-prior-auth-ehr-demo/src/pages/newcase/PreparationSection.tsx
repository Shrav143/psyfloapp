import { useEffect, useState } from "react";
import { CircleCheck, FastForward, PauseCircle, PlayCircle } from "lucide-react";
import { AgentBadge, Banner, Button, Card, Disclosure, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { QUESTIONS, RUN_STEPS, SCRIBE_STEP, runStarted, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { clockText } from "@/pages/eligibility/verifySteps";
import { useStore } from "@/store";
import { selectAllAgentsPaused, selectAnyAgentPaused } from "@/store/agentSettings";
import { AgentRow, type RowState } from "./AgentRow";
import type { CaseEnv } from "./caseEnv";
import { ChancePanel, RaiseFurther } from "./ChancePanel";
import { JustificationCard } from "./JustificationCard";
import { QuestionModal } from "./QuestionModal";
import { questionCount } from "./questions";
import { rowText } from "./runText";
import { PREPARATION_ID } from "./steps";
import { useAgentRun } from "./useAgentRun";

const TITLE = "Authorization preparation";

/** The last section of Clinical documentation: the agents' run. Before it starts it is one line and the Start the agents button (the confirm gate). While it runs, one row per agent, the
    question an agent asks, and the approval chance. Once every agent is done the rows fold away under one line. Opening the step never starts anything. */
export function PreparationSection({ draft, env, onStart }: { draft: CaseDraft; env: CaseEnv; onStart: () => void }) {
  if (!runStarted(draft)) {
    return (
      <section id={PREPARATION_ID} aria-label={TITLE} className="scroll-mt-[84px]">
        <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h3 className="font-serif text-[18px] font-semibold tracking-tight">{TITLE}</h3>
          <Button variant="primary" onClick={onStart}>Start the agents</Button>
        </Card>
      </section>
    );
  }
  return <AgentsRun draft={draft} env={env} />;
}

function AgentsRun({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const retry = useStore((s) => s.retryCaseStep);
  const skip = useStore((s) => s.skipCaseStep);
  const pauseAll = useStore((s) => s.pauseAllAgents);
  const resumeAll = useStore((s) => s.resumeAllAgents);
  const setPaused = useStore((s) => s.setAgentPaused);
  const anyPaused = useStore(selectAnyAgentPaused);
  const allPaused = useStore(selectAllAgentsPaused);
  const [fast, setFast] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { finished, secs, holding } = useAgentRun(draft, fast);
  const { done, question, failed } = draft.run;
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const now = RUN_STEPS[done]?.agent;
  const q = questionCount(draft);

  useEffect(() => setDismissed(false), [question]);

  const stateOf = (i: number): RowState => {
    if (i < done) return "done";
    if (i > done) return "waiting";
    if (question) return "asking";
    if (failed) return "failed";
    return holding ? "paused" : "working";
  };
  const rows = (
    <ul>
      {RUN_STEPS.map((s, i) => (
        <AgentRow key={s.agent} agent={s.agent} state={stateOf(i)} text={rowText(s.agent, draft)} elapsed={draft.run.elapsed[i]} skipped={draft.run.skipped.includes(s.agent)} onAnswer={() => setDismissed(false)} onRetry={() => retry(draft.id)} onSkip={() => skip(draft.id)} />
      ))}
    </ul>
  );
  const status = finished ? (
    <Pill tone={draft.run.skipped.length ? "mid" : "good"} dot>{draft.run.skipped.length ? "Done, 1 skipped" : "Done"}</Pill>
  ) : (
    <Pill tone="neutral">{`${done} of ${RUN_STEPS.length} · ${clockText(secs)}`}</Pill>
  );

  return (
    <section id={PREPARATION_ID} aria-label={TITLE} className="flex scroll-mt-[84px] flex-col gap-4">
      {holding && now && !question ? (
        <Banner
          tone="mid"
          icon={PauseCircle}
          title={allPaused ? "Agents are paused in Settings" : `${AGENTS[now].name} is paused in Settings`}
          action={
            <Button size="sm" icon={PlayCircle} onClick={allPaused ? resumeAll : () => setPaused(now, false)}>
              {allPaused ? "Resume agents" : `Resume ${AGENTS[now].name}`}
            </Button>
          }
        />
      ) : null}
      {draft.recordsChanged && !finished ? <Banner tone="neutral">Records changed after the last run. The agents are running again.</Banner> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-serif text-[18px] font-semibold tracking-tight">{TITLE}</h3>
            {status}
          </div>
          {finished ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={anyPaused ? PlayCircle : PauseCircle} variant={anyPaused ? "primary" : "danger"} onClick={anyPaused ? resumeAll : pauseAll}>
                {anyPaused ? "Resume agents" : "Pause all agents"}
              </Button>
              <Button size="sm" icon={FastForward} disabled={holding || fast} onClick={() => setFast(true)}>
                Skip ahead
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {finished ? (
              <Disclosure variant="plain" className="border-t-0" title={<span className="font-sans text-[14px] font-semibold">All ten agents</span>} summary={`${clockText(draft.run.elapsed.reduce((a, b) => a + b, 0))} in all`}>
                {rows}
              </Disclosure>
            ) : (
              rows
            )}
            {question ? (
              <div className="mx-5 my-3 flex items-center gap-3 rounded-2xl border border-good-edge bg-good-bg px-4 py-3">
                <AgentBadge agent={QUESTIONS[question].agent} size={28} />
                <div className="flex-1 text-[14px]">
                  <b>
                    {AGENTS[QUESTIONS[question].agent].name}, question {q.n} of {q.of}.
                  </b>{" "}
                  {QUESTIONS[question].text(payer?.shortName ?? "the payer")}
                </div>
                <Button size="sm" variant="primary" onClick={() => setDismissed(false)}>
                  Answer
                </Button>
              </div>
            ) : null}
            {draft.answers.length ? (
              <ul className="flex flex-col gap-1 px-5 py-3">
                {draft.answers.map((a) => (
                  <li key={a.key} className="flex items-center gap-2 text-[13px]">
                    <CircleCheck size={15} className="ico shrink-0 text-good" aria-hidden="true" />
                    <span>
                      {AGENTS[a.agent].name}: <b className="font-medium">{a.answer}</b>
                      {a.note ? <span className="text-muted"> · {a.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 border-line px-5 py-4 max-[1099px]:border-t min-[1100px]:border-l">
            <ChancePanel draft={draft} />
            <RaiseFurther draft={draft} />
          </div>
        </div>
      </Card>
      {done > SCRIBE_STEP ? <JustificationCard draft={draft} env={env} /> : null}
      <QuestionModal draft={draft} open={!!question && !dismissed} onClose={() => setDismissed(true)} />
    </section>
  );
}
