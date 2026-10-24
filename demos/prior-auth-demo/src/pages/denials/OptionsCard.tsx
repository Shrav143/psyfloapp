import type { MouseEvent, ReactNode } from "react";
import { ArrowRight, CalendarPlus, FileSignature, Handshake, Scale, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, CardHeader, Pill } from "@/components/ui";
import { APPEAL_LEVELS, levelOf } from "@/data/denials";
import type { Tone } from "@/data/types";
import { band } from "@/lib/format";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import type { DenialOption, OptionId } from "./lib/analysis";
import { capitalize, isClosed, isFiled } from "./lib/format";
import type { RecommendedStep } from "./lib/step";
import type { DenialView } from "./lib/useDenialView";

/** The button that starts each route: it opens the confirm dialog for it. */
export const GO: Record<OptionId, { label: string; icon: LucideIcon }> = {
  p2p: { label: "Book a call", icon: CalendarPlus },
  appeal: { label: "Draft the appeal", icon: FileSignature },
  accept: { label: "Accept the decision", icon: Handshake },
};

export interface OptionHandlers {
  onChoose: (id: OptionId) => void;
  onOpenAppeal: () => void;
  onChangeTime: () => void;
  onRecordDecision: () => void;
  onCompare: (e: MouseEvent<HTMLElement>) => void;
}

/** What one choice shows under its chance: its button, where it stands when it is the route under way or the one that settled the denial, or nothing when it is not open. */
type ChoiceState =
  | { kind: "open" }
  | { kind: "active"; status: ReactNode; actions: ReactNode }
  | { kind: "done"; status: string; tone: Tone; actions?: ReactNode }
  | { kind: "off"; status?: string };

/** The title of the written route: the appeal level it is on, or "Correct and resubmit" when the request is sent again rather than appealed. */
export function writtenTitle(view: DenialView, step: RecommendedStep): string {
  const level = levelOf(view.req.chip, view.work);
  if (level > 0) return APPEAL_LEVELS[level].name;
  return step.word === "Correct and resubmit" ? "Correct and resubmit" : "Written appeal";
}

function states(view: DenialView, h: OptionHandlers, goBrief: () => void): Record<OptionId, ChoiceState> {
  const { req, work, clock, meta } = view;
  const callWindowClosed = req.clockSub === "peer-to-peer window" && req.deadlineAt !== undefined && req.deadlineAt - clock <= 0;
  const callUpheld: ChoiceState | null = work.outcome?.kind === "upheld" ? { kind: "off", status: "Upheld on the call" } : null;
  const p2pOpen: ChoiceState = callUpheld ?? (callWindowClosed ? { kind: "off", status: "Window closed" } : { kind: "open" });

  if (isClosed(work)) {
    const off: ChoiceState = { kind: "off" };
    if (work.accepted)
      return { p2p: callUpheld ?? off, appeal: off, accept: { kind: "done", status: `Accepted ${shortDate(work.accepted.at)}`, tone: "neutral", actions: <Link to={paths.manager("cases")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest hover:underline">Plan the step-down<ArrowRight size={14} className="ico" /></Link> } };
    if (work.decision && work.decision.result !== "upheld")
      return { p2p: callUpheld ?? off, appeal: { kind: "done", status: work.decision.result === "overturned" ? "Overturned on appeal" : "Partly overturned on appeal", tone: work.decision.result === "overturned" ? "good" : "mid" }, accept: off };
    return { p2p: { kind: "done", status: work.outcome?.kind === "overturned" ? "Overturned on the call" : "Partly restored on the call", tone: "good" }, appeal: off, accept: off };
  }
  if (isFiled(req))
    return {
      p2p: callUpheld ?? { kind: "off" },
      appeal: {
        kind: "active",
        status: <>{req.chip}{req.clockSub ? ` ${req.clockSub.replace(/^filed |^requested /, "")}` : ""}{req.clockNote ? ` · ${req.clockNote}` : ""}</>,
        actions: <><Button size="sm" variant="primary" onClick={h.onRecordDecision}>Record the payer's decision</Button><Button size="sm" onClick={h.onOpenAppeal}>View the appeal</Button></>,
      },
      accept: { kind: "off" },
    };
  if (req.chip === "Call booked") {
    const when = work.slot?.label ?? meta.bookedWindow;
    return {
      p2p: { kind: "active", status: when ? `Call booked ${when}` : "Call booked", actions: <><Button size="sm" variant="primary" onClick={goBrief}>Open the brief</Button><Button size="sm" onClick={h.onChangeTime}>Change the time</Button></> },
      appeal: { kind: "open" },
      accept: { kind: "open" },
    };
  }
  if (req.chip === "Appeal drafting")
    return {
      p2p: p2pOpen,
      appeal: { kind: "active", status: <>{work.appealDraft ? "Drafted, ready to sign" : "Advocate is drafting"}{req.deadlineAt !== undefined ? ` · due ${shortDate(req.deadlineAt)}` : ""}</>, actions: <Button size="sm" variant="primary" onClick={h.onOpenAppeal}>Open the draft</Button> },
      accept: { kind: "open" },
    };
  return { p2p: p2pOpen, appeal: { kind: "open" }, accept: { kind: "open" } };
}

function Chance({ o }: { o: DenialOption }) {
  if (!o.chance) return <div className="text-[13px] text-muted">{o.gain}</div>;
  const b = band(o.chance.value);
  return (
    <div className="text-[13px] text-muted">
      <b className="text-[14px] tabular-nums" style={{ color: b.color }}>{o.chance.value}%</b> · likely {o.chance.low}–{o.chance.high}% · {o.gain}
    </div>
  );
}

/**
 * Your options: the three routes side by side, each with its chance and what it gets back. The route under way says where it stands inside its own choice
 * ("Call booked Wed 10/21, 9–11 am" with Open the brief), so there is no separate next-step block. The detail of each route is behind Compare the options.
 */
export function OptionsCard({ view, step, ...h }: { view: DenialView; step: RecommendedStep } & OptionHandlers) {
  const nav = useNavigate();
  const { analysis, req, work } = view;
  const st = states(view, h, () => nav(paths.brief(req.id)));
  const live = !isClosed(work) && !isFiled(req);
  const label = (id: OptionId) => (id === "appeal" && step.word === "Correct and resubmit" ? "Draft the corrected request" : GO[id].label);
  return (
    <Card>
      <CardHeader
        title="Your options"
        subtitle={analysis.benchmark ? `Benchmark estimate, ${analysis.similar} similar decisions` : `From ${analysis.similar} similar ${analysis.ctx.payer} decisions`}
        right={live ? <>{step.option === null ? <Pill tone="mid">{step.word}</Pill> : null}<Button size="sm" icon={Scale} onClick={h.onCompare}>Compare the options</Button></> : undefined}
      />
      <ul aria-label="Your options" className="m-0 grid list-none grid-cols-1 gap-3 px-5 py-4 min-[1180px]:grid-cols-3">
        {analysis.options.map((o) => {
          const s = st[o.id];
          const title = o.id === "appeal" ? writtenTitle(view, step) : o.title;
          return (
            <li key={o.id} data-option={o.id} className={cn("flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3", s.kind === "active" ? "border-forest" : "border-edge", s.kind === "off" && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[14px] leading-snug">{title}</b>
                {live && step.option === o.id ? <Pill tone="good">Recommended</Pill> : null}
              </div>
              <Chance o={o} />
              {s.kind === "open" ? (
                <div className="mt-2"><Button size="sm" variant={live && step.option === o.id && Object.values(st).every((x) => x.kind !== "active") ? "primary" : "outline"} icon={GO[o.id].icon} onClick={() => h.onChoose(o.id)}>{label(o.id)}</Button></div>
              ) : s.kind === "active" ? (
                <div className="mt-2 border-t border-line pt-2">
                  <div className="text-[13px] font-medium">{s.status}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">{s.actions}</div>
                </div>
              ) : s.kind === "done" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2"><Pill tone={s.tone}>{capitalize(s.status)}</Pill>{s.actions}</div>
              ) : s.status ? (
                <div className="mt-2 text-[13px] text-muted">{s.status}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
