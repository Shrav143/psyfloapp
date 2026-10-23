import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, FastForward, PauseCircle, PlayCircle } from "lucide-react";
import { AgentBadge, Banner, Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { QUESTIONS, RUN_STEPS, SCRIBE_STEP, runStarted, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { clockText } from "@/pages/eligibility/verifySteps";
import { useStore } from "@/store";
import { selectAllAgentsPaused, selectAnyAgentPaused } from "@/store/agentSettings";
import { AgentRow, type RowState } from "./AgentRow";
import type { CaseEnv } from "./caseEnv";
import { ChancePanel, RaiseFurther } from "./ChancePanel";
import { JustificationCard } from "./JustificationCard";
import { PayerChangeNote } from "./PayerChangeNote";
import { QuestionModal } from "./QuestionModal";
import { questionCount } from "./questions";
import { rowText } from "./runText";
import { StartAgentsModal } from "./StartAgentsModal";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useAgentRun } from "./useAgentRun";
import { useUnmetSync } from "./useUnmetSync";
import { foldWorkflow } from "./workflow/fold";

/** Step 4, Authorization preparation, before the agents were started: nothing has run, so the step says so and offers the one button. Opening a step never starts anything. */
function NotStarted({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const start = useStore((s) => s.startCaseRun);
  const patch = useStore((s) => s.patchCaseDraft);
  const [confirm, setConfirm] = useState(false);
  const gaps = env.readiness.missingRequired.length;
  return (
    <>
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <h2 className="font-serif text-[18px] font-semibold">The agents have not started</h2>
            <p className="max-w-[520px] text-[14px] text-muted">
              They read the chart, check the payer's rules, match the evidence to the criteria and prepare the justification.
              {gaps ? ` ${gaps} required ${gaps === 1 ? "document is" : "documents are"} not in the case yet. They will flag ${gaps === 1 ? "it" : "them"} rather than guess.` : ""} Nothing is sent to the payer until a clinician signs.
            </p>
            <Button variant="primary" onClick={() => setConfirm(true)}>Start the agents</Button>
          </CardBody>
        </Card>
        <StepFooter actions={<Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(2))}>Back</Button>} hint="Go back to add what is missing, or start now and review the gaps later." />
      </div>
      <StartAgentsModal draft={draft} open={confirm} onClose={() => setConfirm(false)} onStart={() => { setConfirm(false); start(draft.id); }} />
    </>
  );
}

/** Step 4, Authorization preparation: the agents work in order, about 13 seconds. They stop for a question, hold while an agent is paused in Settings, and a person can pause them all or skip ahead.
    Scribe prepares the justification for the type of request; what the chart does not support is flagged, never invented. */
export function PreparationStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  if (!runStarted(draft)) return <NotStarted draft={draft} env={env} />;
  return <AgentsRun draft={draft} env={env} />;
}

function AgentsRun({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
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
  useUnmetSync(draft);

  useEffect(() => setDismissed(false), [question]);

  /* One message at a time, the most important first: a question for you (its own card below), an agent paused in Settings, records that changed, then "all done". */
  const notice = question ? null : holding && now ? "paused" : draft.recordsChanged ? "changed" : finished ? "done" : null;

  const stateOf = (i: number): RowState => {
    if (i < done) return "done";
    if (i > done) return "waiting";
    if (question) return "asking";
    if (failed) return "failed";
    return holding ? "paused" : "working";
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="flex flex-col gap-4">
          <PayerChangeNote draft={draft} />
          {notice === "changed" ? <Banner tone="neutral">Records changed after the last run. The agents re-checked.</Banner> : null}
          {notice === "paused" && now ? (
            <Banner
              tone="mid"
              icon={PauseCircle}
              title={allPaused ? "Agents are paused in Settings" : `${AGENTS[now].name} is paused in Settings`}
              action={
                <Button size="sm" icon={PlayCircle} onClick={allPaused ? resumeAll : () => setPaused(now, false)}>
                  {allPaused ? "Resume agents" : `Resume ${AGENTS[now].name}`}
                </Button>
              }
            >
              Nothing is read, checked or drafted until it is resumed. Nothing has been sent to the payer.
            </Banner>
          ) : null}
          <Card>
            <CardHeader
              title={`Agents at work on ${draft.caseId ?? "this case"}`}
              subtitle={`${draft.levelLabel ?? (draft.program ? PROGRAM_LABEL[draft.program] : "")} ${draft.type?.toLowerCase() ?? ""} · ${payer?.name ?? ""}`}
              right={<Pill tone="neutral">{clockText(secs)}</Pill>}
            />
            <ul>
              {RUN_STEPS.map((s, i) => (
                <AgentRow key={s.agent} agent={s.agent} state={stateOf(i)} text={rowText(s.agent, draft)} elapsed={draft.run.elapsed[i]} skipped={draft.run.skipped.includes(s.agent)} onAnswer={() => setDismissed(false)} onRetry={() => retry(draft.id)} onSkip={() => skip(draft.id)} />
              ))}
            </ul>
          </Card>
          {question ? (
            <div className="flex items-center gap-3.5 rounded-2xl border border-good-edge bg-good-bg px-[18px] py-3.5">
              <AgentBadge agent={QUESTIONS[question].agent} size={36} />
              <div className="flex-1 text-sm">
                <b>Question {q.n} of {q.of} from {AGENTS[QUESTIONS[question].agent].name}.</b> {QUESTIONS[question].text(payer?.shortName ?? "the payer")}
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
          {notice === "done" ? (
            <Banner tone="good" title="All ten agents are done">
              The draft and the four checks are ready. Nothing has been sent to the payer.
            </Banner>
          ) : null}
          {done > SCRIBE_STEP ? <JustificationCard draft={draft} env={env} /> : null}
        </div>
        <div className="flex flex-col gap-4">
          <ChancePanel draft={draft} />
          <RaiseFurther draft={draft} />
        </div>
      </div>
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(2))}>
              Back
            </Button>
            <Button icon={anyPaused ? PlayCircle : PauseCircle} variant={anyPaused ? "primary" : "danger"} disabled={finished} onClick={anyPaused ? resumeAll : pauseAll}>
              {anyPaused ? "Resume agents" : "Pause all agents"}
            </Button>
            <Button icon={FastForward} disabled={finished || holding || fast} onClick={() => setFast(true)}>
              Skip ahead
            </Button>
            <Button variant="primary" trailing={ArrowRight} disabled={!finished} onClick={() => patch(draft.id, stepPatch(4))}>
              Review &amp; submit
            </Button>
          </>
        }
        hint={foldWorkflow(finished ? "Read the draft and sign it on the next step." : question ? "The agents are waiting for your answer." : failed ? `${AGENTS[failed].name} could not finish. Retry it, or skip it and note it.` : holding ? "Paused in Settings." : "The agents work on their own. You can leave and come back.", env)}
      />
      <QuestionModal draft={draft} open={!!question && !dismissed} onClose={() => setDismissed(true)} />
    </>
  );
}
