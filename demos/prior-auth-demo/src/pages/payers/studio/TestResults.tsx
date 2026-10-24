import { ArrowUpRight, RotateCcw, ShieldAlert } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { VERIFICATION_LABEL, type RunResult, type RunStatus, type Workflow } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { OUTCOME_TONE, OUTCOME_WORD, STATUS_TONE, STATUS_WORD, VERIFICATION_TONE } from "./lib/ui";
import type { Tone } from "@/data/types";

const STATUS: Record<RunStatus, { word: string; tone: Tone }> = {
  completed: { word: "Completed", tone: "good" },
  no_authorization: { word: "No authorization needed", tone: "neutral" },
  paused: { word: "Paused", tone: "mid" },
  manual_review: { word: "Manual review", tone: "mid" },
  failed: { word: "Failed", tone: "risk" },
};

/* What a test run found: the outcome in one sentence, each step in the order it ran, the rules it read and what is missing. */

export function TestResults({ workflow, result, revealed, onFix, onAgain, onSkip }: { workflow: Workflow; result: RunResult; revealed: number; onFix: () => void; onAgain: () => void; onSkip: () => void }) {
  const total = result.steps.length;
  const done = revealed >= total;
  const shown = result.steps.slice(0, revealed);
  const ruleOf = (id: string) => result.rulesUsed.find((r) => r.id === id);
  const unverified = result.rulesUsed.filter((r) => r.verification !== "verified");

  return (
    <section aria-label="Test result" className="rounded-[20px] border border-edge bg-white">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 py-4">
        <h3 className="m-0 font-serif text-[18px] leading-tight font-semibold">What happened</h3>
        {workflow.status !== "published" ? <Pill tone="mid" dot>Draft: not used for cases yet</Pill> : <Pill tone={STATUS_TONE[workflow.status]} dot>{STATUS_WORD[workflow.status]}</Pill>}
        <span className="text-[13px] text-muted">{workflow.name}, version {workflow.version}</span>
        <div className="ml-auto flex gap-2">
          {done ? null : <Button size="sm" onClick={onSkip}>Skip the animation</Button>}
          <Button size="sm" icon={RotateCcw} onClick={onAgain}>Run again</Button>
        </div>
      </header>

      <div className="px-5 py-4">
        {done ? (
          <div className="mb-4 rounded-2xl bg-tile/70 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={STATUS[result.status].tone} dot>{STATUS[result.status].word}</Pill>
              {result.endResult ? <span className="text-xs text-muted">Ended as: {result.endResult.replace("_", " ")}</span> : null}
            </div>
            <p role="status" className="mt-2 mb-0 font-serif text-[18px] leading-snug font-semibold text-ink">{result.outcomeText}</p>
            {result.reason ? <p className="mt-1.5 mb-0 text-[13px] text-ink2"><span className="font-semibold">Why it stopped: </span>{result.reason}</p> : null}
          </div>
        ) : (
          <p className="mb-4 mt-0 text-[13px] text-muted" aria-live="polite">Running the steps, one at a time…</p>
        )}

        <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Steps in the order they ran">
          {shown.map((s, i) => (
            <li key={`${s.seq}-${s.nodeId}`} className={cn("rounded-xl border px-3.5 py-2.5", i === shown.length - 1 && !done ? "border-forest bg-[#F3F7F4]" : "border-line bg-white")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
                <span className="text-[14px] font-semibold">{s.title}</span>
                <Pill tone={OUTCOME_TONE[s.outcome]} dot>{OUTCOME_WORD[s.outcome]}</Pill>
                {s.support && s.support !== "live" ? <span className="text-xs text-muted">{s.support === "simulated" ? "Demo simulation" : "Not configured"}</span> : null}
              </div>
              <p className="mt-1 mb-0 pl-8 text-[13px] text-ink2">{s.message}</p>
              {s.ruleRefs.length ? (
                <p className="mt-1.5 mb-0 flex flex-wrap items-center gap-1.5 pl-8">
                  {s.ruleRefs.map((id) => {
                    const r = ruleOf(id);
                    return r ? (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pr-1 pl-2.5 text-xs">
                        {r.title}
                        <Pill tone={VERIFICATION_TONE[r.verification]} className="!px-2 !py-px">{VERIFICATION_LABEL[r.verification]}</Pill>
                      </span>
                    ) : null;
                  })}
                </p>
              ) : null}
              {s.warnings.length ? (
                <ul className="mt-1.5 mb-0 list-disc pl-12 text-[13px] text-mid-ink">
                  {s.warnings.map((w, k) => (
                    <li key={k}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>

        {done ? (
          <div className="mt-4 flex flex-col gap-4">
            {result.warnings.length ? (
              <div>
                <h4 className="m-0 mb-1.5 text-[14px] font-semibold">Warnings</h4>
                <ul className="m-0 list-disc pl-5 text-[13px] text-mid-ink">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <h4 className="m-0 mb-1.5 text-[14px] font-semibold">Rules it read</h4>
              {result.rulesUsed.length ? (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {result.rulesUsed.map((r) => (
                    <li key={r.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pr-1 pl-3 text-[13px]">
                      {r.title}
                      <Pill tone={VERIFICATION_TONE[r.verification]} dot>{VERIFICATION_LABEL[r.verification]}</Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[13px] text-muted">No payer rule was read on this path.</p>
              )}
              {unverified.length ? (
                <p className="mt-2 mb-0 flex items-start gap-2 text-[13px] text-mid-ink"><ShieldAlert size={15} className="ico mt-0.5" aria-hidden="true" />{unverified.length} of these {unverified.length === 1 ? "is" : "are"} not verified. A person should confirm {unverified.length === 1 ? "it" : "them"} with the payer before relying on this result.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button variant={result.stoppedAt ? "primary" : "outline"} icon={ArrowUpRight} onClick={onFix}>Fix in builder</Button>
              <span className="text-[13px] text-muted">{result.stoppedAt ? "Opens the builder at the step where it stopped." : "Opens the builder on this workflow."}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
