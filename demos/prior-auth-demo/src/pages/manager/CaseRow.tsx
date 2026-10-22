import { useNavigate } from "react-router-dom";
import { AgentBadge, Button, Chance, Chip, IdLink, Pill } from "@/components/ui";
import { barIndex, currentChance, describeRequest, draftState, dueChip, type CaseDraft, type DraftState } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { agentNow, runLine } from "@/pages/newcase/runText";
import { payerUpdateFor, payerUpdateText } from "./helpers";
import { StepBar } from "./StepBar";

const STATUS: Record<DraftState, { text: string; tone: Tone; cta: string; primary: boolean }> = {
  intake: { text: "Intake not finished", tone: "mid", cta: "Continue", primary: true },
  question: { text: "Needs your input", tone: "mid", cta: "Answer", primary: true },
  working: { text: "Agents working", tone: "neutral", cta: "Watch", primary: false },
  ready: { text: "Ready to sign", tone: "good", cta: "Review and sign", primary: true },
};

/** One case being prepared: where it is in the eight steps, who has it, and the one thing to do next. */
export function CaseRow({ draft }: { draft: CaseDraft }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const updates = useStore((s) => s.payerChangeUpdates);
  const update = payerUpdateFor([draft.id, draft.caseId], updates);
  const state = draftState(draft);
  const status = STATUS[state];
  const due = dueChip(draft, clock);
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const open = () => nav(paths.newCase({ draft: draft.id }));
  const idLabel = draft.caseId ?? "New case";

  return (
    <li className={cn("flex flex-wrap items-start gap-x-5 gap-y-3 rounded-2xl border p-5", due?.tone === "risk" ? "border-risk-edge bg-risk-bg" : "border-edge bg-tile")}>
      <div className="w-[142px] shrink-0 pt-0.5">
        <Chip>{draft.levelLabel ?? (draft.program ? PROGRAM_LABEL[draft.program] : "Level not set")}</Chip>
      </div>
      <div className="min-w-[240px] flex-1">
        <div>
          <IdLink onClick={open}>{idLabel}</IdLink>
          <span className="text-muted"> · {draft.patient.initials ? `${draft.patient.initials}${draft.patient.age ? `, ${draft.patient.age}` : ""}` : "No patient yet"} · {payer?.name ?? "No payer yet"}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {describeRequest(draft)}
          {update ? <Pill tone="neutral">{payerUpdateText(update)}</Pill> : null}
        </div>
        <StepBar current={barIndex(draft)} />
        <div className="flex items-center gap-2.5">
          <AgentBadge agent={agentNow(draft)} size={24} />
          <span className="text-sm">{runLine(draft)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {due ? <Pill tone={due.tone}>{due.text}</Pill> : null}
        <Pill tone={status.tone} dot>
          {status.text}
        </Pill>
      </div>
      <div className="w-[100px] shrink-0">{state === "intake" ? <span className="text-sm text-muted">Not started</span> : <Chance value={currentChance(draft)} />}</div>
      <div className="w-[128px] shrink-0 text-right">
        <Button size="sm" variant={status.primary ? "primary" : "outline"} onClick={open} aria-label={`${status.cta} ${idLabel}`}>
          {status.cta}
        </Button>
      </div>
    </li>
  );
}
