import { ArrowLeft, LayoutDashboard, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentBadge, Button, Card, Chip, Label, Pill, Ring } from "@/components/ui";
import { confidenceWord, daysLikely, isBenchmarkOnly, rangeOf, similarTotal } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import { siteName } from "@/data/sites";
import type { Tone } from "@/data/types";
import { band as chanceBand } from "@/lib/format";
import { HOUR } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthFacts } from "./AuthFacts";
import type { CaseCtx } from "./caseTypes";
import { InfoTip } from "@/components/ui/InfoTip";
import { nextActionOf } from "./nextAction";
import { NextBlock } from "./NextBlock";
import { dueText } from "./queueLogic";
import { Scores } from "./Scores";
import { StatusHelp } from "./StatusHelp";
import { useAnimatedNumber } from "./useAnimatedNumber";
import { useAuthFacts } from "./useAuthFacts";

/** The header card (title, the next action, the authorization facts, the clinical line), the three tiles and one line of notice. They stay the same on all five tabs. */
export function CaseHeader({ ctx }: { ctx: CaseCtx }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const note = useStore((s) => s.queueItems.find((i) => i.id === ctx.detail.id)?.rule);
  const { detail, work, chance, projected, canSend, live, send } = ctx;
  const moved = live?.moved ? live : null; // the request is past where this page's own wording stops: show its own chip and line
  const payer = payerById(detail.payerId);
  const shown = useAnimatedNumber(chance);
  const b = chanceBand(chance);
  const [lo, hi] = rangeOf(detail, chance);
  const applied = work.applied.length > 0;
  const left = detail.dueAt === undefined ? null : detail.dueAt - clock;
  const dueTone: Tone = left === null ? "neutral" : left < 6 * HOUR ? "risk" : left < 24 * HOUR ? "mid" : "neutral";
  const benchmark = isBenchmarkOnly(detail);
  const sim = detail.similar;
  const denial = detail.phase === "denial";
  const ready = canSend && detail.phase === "preparing";
  const statusChip = moved ? { text: moved.chip, tone: moved.tone } : detail.chip ?? null;

  const { facts, site } = useAuthFacts(detail, work, live);
  const next = nextActionOf({ detail, work, live, canSend });
  const unit = detail.program === "IOP" ? "units" : "days";

  return (
    <>
      <Card className="flex flex-col gap-5 px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="flex flex-wrap items-center gap-3 font-serif text-[32px] leading-[1.15] font-semibold tracking-tight">
                <Chip className="font-sans tracking-normal">{detail.levelLabel}</Chip>
                <span>{detail.id}</span>
                <Chip className="font-sans tracking-normal">{detail.type}</Chip>
                {statusChip ? <Pill tone={statusChip.tone} dot className="font-sans tracking-normal">{statusChip.text}</Pill> : left !== null ? <Pill tone={dueTone} dot className="font-sans tracking-normal">{dueText(detail.dueVerb, detail.dueAt ?? 0, clock)}</Pill> : null}
              </h1>
              {statusChip ? <StatusHelp /> : null}
            </div>
            <div className="mt-2 text-[15px] text-muted">{detail.initials}, {detail.age} · {payer.name} · {detail.levelLabel} · {detail.days} {unit} requested{site ? <span data-testid="case-site"> · {siteName(site)}</span> : null}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button icon={PenLine} onClick={send}>Open in review and sign</Button>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(paths.authorizations())}>Back to queue</Button>
          </div>
        </div>

        <NextBlock ctx={ctx} next={next} />
        <AuthFacts facts={facts} />

        <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-[13.5px] text-ink2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <b className="font-semibold text-ink">At a glance</b>
            <span>{detail.dx}</span>
            <Scores scores={detail.scores} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <AgentBadge agent={ready ? "integrity" : moved ? moved.agent : detail.agent} size={22} />
              {ready ? "Ready to sign. Integrity passed all four checks" : moved ? moved.line : detail.statusLine}
            </span>
            {note ? <span className="text-forest">Payer note: {note}</span> : null}
            {live && next.button?.go.to !== "dashboard" ? <Button size="sm" variant="ghost" icon={LayoutDashboard} onClick={() => navigate(paths.dashboard({ request: live.requestId }))}>Open on the Dashboard</Button> : null}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="px-6 py-5">
          <Label>{denial ? "Chance to overturn" : "Approval chance"}</Label>
          <div className="mt-3 flex items-center gap-4">
            <Ring value={shown} size={72} stroke={8} />
            <div>
              <div className="text-xl font-semibold" aria-live="polite">{detail.baseChance}% → {applied ? chance : projected}%</div>
              <div className="text-sm text-muted">{!applied ? "if every action is applied" : projected > chance ? `up to ${projected}% with the rest` : "after the agents' checks"}</div>
            </div>
          </div>
          <Pill tone={b.tone} dot className="mt-3 w-full justify-start">{b.word} · likely range {lo}–{hi}%</Pill>
        </Card>
        <Card className="px-6 py-5">
          <Label>How sure are we</Label>
          <div className="mt-3 text-[28px] leading-none font-semibold">{confidenceWord(detail)}</div>
          <div className="mt-2 text-sm text-muted">
            {benchmark
              ? `Little history for this payer and level of care, so this is a benchmark estimate from ${sim.benchmark} benchmark cases. Only ${sim.own + sim.network} are yours or the network's.`
              : `Based on ${similarTotal(detail).toLocaleString("en-US")} similar cases: ${sim.own} yours, ${sim.network} from the network, ${sim.benchmark} benchmark`}
          </div>
        </Card>
        <Card className="px-6 py-5">
          <Label>{denial ? `${unit === "units" ? "Units" : "Days"} in question` : `${unit === "units" ? "Units" : "Days"} likely granted`}</Label>
          <div className="mt-3 text-[28px] leading-none font-semibold">
            {denial ? Math.round(detail.days / 2) : daysLikely(shown, detail.days)} <span className="text-base font-medium text-muted">of {detail.days} {denial ? unit : `${unit} likely`}</span>
          </div>
          <div className="mt-2 text-sm text-muted">{denial ? "The payer approved part of the stay. The other days are what the call is about." : `${chance}% chance of all ${detail.days}, otherwise most likely ${Math.round(detail.days / 2)}`}</div>
        </Card>
      </div>

      <p className="-mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        Decision support for documentation and workflow only. It does not recommend or decide care.
        <InfoTip label="About the approval chance">The approval chance estimates how well the paperwork fits this payer's past decisions. It never blocks a request and is never shown to payers or patients.</InfoTip>
      </p>
    </>
  );
}
