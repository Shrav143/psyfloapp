import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, FastForward, PauseCircle, PlayCircle } from "lucide-react";
import { AgentBadge, Banner, Button, Card, CardHeader, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { QUESTIONS, RUN_STEPS, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { clockText } from "@/pages/eligibility/verifySteps";
import { useStore } from "@/store";
import { AgentRow, type RowState } from "./AgentRow";
import { ChancePanel, RaiseFurther } from "./ChancePanel";
import { QuestionModal } from "./QuestionModal";
import { rowText } from "./runText";
import { StepFooter } from "./StepFooter";
import { useAgentRun } from "./useAgentRun";

/** Step 2: the agents work in order, about 13 seconds. They stop for a question, and a person can pause them all or skip ahead. */
export function AgentsStep({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { finished, secs } = useAgentRun(draft, paused, fast);
  const { done, question } = draft.run;
  const payer = draft.payerId ? payerById(draft.payerId) : null;

  useEffect(() => setDismissed(false), [question]);

  const stateOf = (i: number): RowState => {
    if (i < done) return "done";
    if (i > done) return "waiting";
    if (question) return "asking";
    return paused ? "paused" : "working";
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title={`Agents at work on ${draft.caseId ?? "this case"}`}
              subtitle={`${draft.levelLabel ?? (draft.program ? PROGRAM_LABEL[draft.program] : "")} ${draft.type?.toLowerCase() ?? ""} · ${payer?.name ?? ""}`}
              right={<Pill tone="neutral">{clockText(secs)}</Pill>}
            />
            <ul>
              {RUN_STEPS.map((s, i) => (
                <AgentRow key={s.agent} agent={s.agent} state={stateOf(i)} text={rowText(s.agent, draft)} elapsed={draft.run.elapsed[i]} onAnswer={() => setDismissed(false)} />
              ))}
            </ul>
          </Card>
          {paused ? (
            <Banner tone="mid" icon={PauseCircle} title="All agents are paused">
              Nothing is read, checked or drafted until you resume them. Nothing has been sent to the payer.
            </Banner>
          ) : null}
          {question ? (
            <div className="flex items-center gap-3.5 rounded-2xl border border-good-edge bg-good-bg px-[18px] py-3.5">
              <AgentBadge agent={QUESTIONS[question].agent} size={36} />
              <div className="flex-1 text-sm">
                <b>One question from {AGENTS[QUESTIONS[question].agent].name}.</b> {QUESTIONS[question].text(payer?.shortName ?? "the payer")}
              </div>
            </div>
          ) : null}
          {draft.answers.map((a) => (
            <div key={a.key} className="flex items-center gap-2.5 rounded-2xl border border-edge bg-white px-[18px] py-3 text-sm">
              <CircleCheck size={18} className="ico text-good" />
              <span>
                You answered {AGENTS[a.agent].name}: <b>{a.answer}</b>
                {a.note ? <span className="text-muted"> · {a.note}</span> : null}. It is in the draft.
              </span>
            </div>
          ))}
          {finished ? (
            <Banner tone="good" title="All ten agents are done">
              The draft and the four checks are ready. Nothing has been sent to the payer.
            </Banner>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <ChancePanel draft={draft} />
          <RaiseFurther draft={draft} />
        </div>
      </div>
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, { step: 0 })}>
              Back
            </Button>
            <Button icon={paused ? PlayCircle : PauseCircle} variant={paused ? "primary" : "danger"} disabled={finished} onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume agents" : "Pause all agents"}
            </Button>
            <Button icon={FastForward} disabled={finished || paused || fast} onClick={() => setFast(true)}>
              Skip ahead
            </Button>
            <Button variant="primary" trailing={ArrowRight} disabled={!finished} onClick={() => patch(draft.id, { step: 2 })}>
              Review and sign
            </Button>
          </>
        }
        hint={finished ? "Read the draft and sign it on the next step." : question ? "The agents are waiting for your answer." : paused ? "Paused." : "The agents work on their own. You can leave and come back."}
      />
      <QuestionModal draft={draft} open={!!question && !dismissed} onClose={() => setDismissed(true)} />
    </>
  );
}
