import { ArrowRight, CalendarCheck, CheckCircle2, FileSignature, Gavel, Hourglass, ScrollText, Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Disclosure, Label } from "@/components/ui";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { capitalize, isClosed, isFiled } from "./lib/format";
import type { OptionId } from "./lib/analysis";
import type { RecommendedStep } from "./lib/step";
import type { DenialView } from "./lib/useDenialView";
import { GO } from "./OptionsCard";
import { ReviewNote } from "./ReviewNote";

const BG: Record<Tone, string> = { good: "bg-good-bg", mid: "bg-mid-bg", risk: "bg-risk-bg", neutral: "bg-tile" };

interface Props {
  view: DenialView;
  step: RecommendedStep;
  onChoose: (id: OptionId) => void;
  onOpenAppeal: () => void;
  onChangeTime: () => void;
  onRecordDecision: () => void;
  onFindings: () => void;
}

interface Shown {
  eyebrow: string;
  title: ReactNode;
  tone: Tone;
  body: ReactNode;
  icon?: LucideIcon;
  /** The buttons, primary first. */
  actions?: ReactNode;
  /** A generated letter, brief or recommendation is on show: say who reviews it. */
  generated?: boolean;
  why?: string[];
}

/** One block under the header: the recommended next step in plain words with its primary button first, or, once a step is under way or settled, where it stands. */
export function NextStep({ view, step, onChoose, onOpenAppeal, onChangeTime, onRecordDecision, onFindings }: Props) {
  const { req, work } = view;
  const nav = useNavigate();
  const when = work.slot?.label ?? view.meta.bookedWindow;
  let s: Shown;

  if (work.accepted)
    s = { eyebrow: "Where it stands", title: "Closed. You accepted the decision", tone: "neutral", icon: CheckCircle2, body: `Reason: ${work.accepted.reason}. Analytics logs it as an accepted denial.`, actions: <Link to={paths.manager("cases")} className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline">Plan the step-down<ArrowRight size={14} className="ico" /></Link> };
  else if (work.decision && work.decision.result !== "upheld")
    s = { eyebrow: "Where it stands", title: work.decision.result === "overturned" ? "Overturned on appeal" : "Partly overturned on appeal", tone: work.decision.result === "overturned" ? "good" : "mid", body: work.decision.note || "The ledger is updated and the next review is booked." };
  else if (isClosed(work))
    s = { eyebrow: "Where it stands", title: work.outcome?.kind === "overturned" ? "Overturned on the call" : "Partly restored on the call", tone: "good", body: work.outcome?.note || "The ledger is updated and the next review is booked." };
  else if (isFiled(req))
    s = {
      eyebrow: "Where it stands",
      title: `${req.chip}. Waiting on the payer`,
      tone: "neutral",
      icon: Hourglass,
      body: `${req.clockSub ? `${capitalize(req.clockSub)}, ` : ""}${req.clockNote ?? "decision date not set"}. Navigator checks every day. When the payer answers, record the decision here.`,
      actions: <><Button variant="primary" icon={Gavel} onClick={onRecordDecision}>Record the payer's decision</Button><Button icon={ScrollText} onClick={onOpenAppeal}>View the appeal</Button></>,
    };
  else if (req.chip === "Appeal drafting")
    s = {
      eyebrow: `Next step · ${step.word}`,
      title: work.appealDraft ? "The appeal is drafted and waiting for a clinician's signature" : "Advocate is drafting the appeal",
      tone: "mid",
      icon: FileSignature,
      body: work.appealDraft ? "Review the letter, change anything you like, then sign and file." : "Open the draft to see it come together.",
      actions: <Button variant="primary" onClick={onOpenAppeal}>Open the draft</Button>,
      generated: true,
    };
  else if (req.chip === "Call booked")
    s = {
      eyebrow: `Next step · ${step.word}`,
      title: when ? `Call booked: ${when}` : "Call booked",
      tone: "neutral",
      icon: CalendarCheck,
      body: `Cadence booked the window with ${view.analysis.ctx.payer}. The brief is ready, written by Advocate and checked by Integrity.`,
      actions: <><Button variant="primary" onClick={() => nav(paths.brief(req.id))}>Open the brief</Button><Button onClick={onChangeTime}>Change the time</Button></>,
      generated: true,
    };
  else {
    const opt = step.option;
    const go = opt ? GO[opt] : null;
    s = {
      eyebrow: "Recommended next step",
      title: step.word,
      tone: "neutral",
      body: step.line,
      actions: go && opt ? <Button variant="primary" icon={go.icon} onClick={() => onChoose(opt)}>{step.word === "Correct and resubmit" ? "Draft the corrected request" : go.label}</Button> : <Button variant="primary" icon={Search} onClick={onFindings}>Read the findings</Button>,
      generated: true,
      why: step.why,
    };
  }

  const Icon = s.icon;
  return (
    <div className="border-t border-edge">
      <div className={cn("px-6 py-5", BG[s.tone], !s.why && "rounded-b-[20px]")} data-step={s.why ? step.word : undefined}>
        <Label>{s.eyebrow}</Label>
        <h2 className="mt-1 flex items-center gap-2.5 font-serif text-[24px] leading-tight font-semibold">
          {Icon ? <Icon size={22} className="ico" aria-hidden="true" /> : null}
          {s.title}
        </h2>
        <p className="mt-1.5 max-w-[70ch] text-[15px] text-ink2">{s.body}</p>
        {s.actions ? <div className="mt-4 flex flex-wrap items-center gap-2.5">{s.actions}</div> : null}
        {s.generated ? <ReviewNote className="mt-3.5" /> : null}
      </div>
      {s.why ? (
        <Disclosure variant="plain" title="Why FLO suggests this" summary="The reasons, from the chart and the clock. A recommendation, not a payer rule." className="rounded-b-[20px]">
          <ul className="flex list-disc flex-col gap-1.5 px-10 py-4 text-[14px] text-ink2">
            {s.why.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}
