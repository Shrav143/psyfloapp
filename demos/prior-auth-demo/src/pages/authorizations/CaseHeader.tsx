import { ArrowLeft, LayoutDashboard, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Chip, InfoTip, Label, Pill, Ring } from "@/components/ui";
import { confidenceWord, daysLikely, isBenchmarkOnly, rangeOf, similarTotal } from "@/data/caseModel";
import { STATUS_LABEL } from "@/data/queue";
import { payerById } from "@/data/seed";
import { siteName } from "@/data/sites";
import type { Tone } from "@/data/types";
import { band as chanceBand } from "@/lib/format";
import { HOUR } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthFacts } from "./AuthFacts";
import type { CaseCtx } from "./caseTypes";
import { nextActionOf } from "./nextAction";
import { NextBlock } from "./NextBlock";
import { PHASE_TONE, dueText } from "./queueLogic";
import { Scores } from "./Scores";
import { StatusHelp } from "./StatusHelp";
import { useAnimatedNumber } from "./useAnimatedNumber";
import { useAuthFacts } from "./useAuthFacts";

/** The title line names the request type, the patient, the payer, the days and the site, so the facts row does not repeat them. */
const SAID_IN_TITLE = ["Request type", "Requested", "Site"];

/** The header card (title, the next action, the authorization facts, the diagnosis and scores) and one strip of three figures. They stay the same on every tab. */
export function CaseHeader({ ctx }: { ctx: CaseCtx }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const { detail, work, chance, projected, canSend, live, send } = ctx;
  const payer = payerById(detail.payerId);
  const shown = useAnimatedNumber(chance);
  const b = chanceBand(chance);
  const [lo, hi] = rangeOf(detail, chance);
  const applied = work.applied.length > 0;
  const left = detail.dueAt === undefined || detail.chip || live?.stage === "decided" ? null : detail.dueAt - clock;
  const dueTone: Tone = left === null ? "neutral" : left < 6 * HOUR ? "risk" : left < 24 * HOUR ? "mid" : "neutral";
  const benchmark = isBenchmarkOnly(detail);
  const sim = detail.similar;
  const denial = detail.phase === "denial";
  const phase = detail.phase === "preparing" && canSend ? "ready" : detail.phase;
  // Once the request is with the payer, its own chip (Received, Under review, Approved) says more than the queue's word.
  const status = live ? { text: live.chip, tone: live.tone } : detail.chip ?? { text: STATUS_LABEL[phase], tone: PHASE_TONE[phase] };

  const { facts, site } = useAuthFacts(detail, work, live);
  const next = nextActionOf({ detail, work, live, canSend });
  const unit = detail.program === "IOP" ? "units" : "days";
  const n = similarTotal(detail);

  return (
    <>
      <Card className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-[24px] leading-[1.15] font-semibold tracking-tight">{detail.id}</h1>
              <Chip>{detail.levelLabel}</Chip>
              <Chip>{detail.type}</Chip>
              <Pill tone={status.tone} dot>{status.text}</Pill>
              {left !== null ? <Pill tone={dueTone} dot>{dueText(detail.dueVerb, detail.dueAt ?? 0, clock)}</Pill> : null}
              <StatusHelp />
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {detail.initials}, {detail.age} · {payer.name} · {detail.days} {unit} requested{site ? <span data-testid="case-site"> · {siteName(site)}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" icon={PenLine} onClick={send}>Open in review and sign</Button>
            <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => navigate(paths.authorizations())}>Back to queue</Button>
          </div>
        </div>

        <NextBlock ctx={ctx} next={next} />
        <AuthFacts facts={facts.filter((f) => !SAID_IN_TITLE.includes(f.label))} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[13px] text-ink2">
          <span>{detail.dx}</span>
          <Scores scores={detail.scores} />
          {live && next.button?.go.to !== "dashboard" ? <Button size="sm" variant="ghost" icon={LayoutDashboard} onClick={() => navigate(paths.dashboard({ request: live.requestId }))}>Open on the Dashboard</Button> : null}
        </div>
      </Card>

      <Card className="grid grid-cols-1 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0" data-testid="case-figures">
        <div className="flex items-center gap-3 px-5 py-3">
          <Ring value={shown} size={50} stroke={6} />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Label>{denial ? "Chance to overturn" : "Approval chance"}</Label>
              <InfoTip label="About the approval chance">Decision support for documentation and workflow only. It does not recommend or decide care, never blocks a request and is never shown to payers or patients.</InfoTip>
            </div>
            <div className="text-[18px] leading-tight font-semibold" aria-live="polite">{detail.baseChance}% → {applied ? chance : projected}%</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Pill tone={b.tone} dot>{b.word} · {lo}–{hi}%</Pill>
              <span className="text-[12px] text-muted">{!applied ? "with every action" : projected > chance ? `up to ${projected}% with the rest` : "now"}</span>
            </div>
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="flex items-center gap-1">
            <Label>How sure are we</Label>
            <InfoTip label="About the similar cases">
              {benchmark ? `Little history for this payer and level of care: ${sim.benchmark} of ${n} are benchmark cases.` : `${sim.own} yours, ${sim.network} from the network, ${sim.benchmark} benchmark.`}
            </InfoTip>
          </div>
          <div className="text-[18px] leading-tight font-semibold">{confidenceWord(detail)}</div>
          <div className="text-[12px] text-muted">{n.toLocaleString("en-US")} similar cases</div>
        </div>
        <div className="px-5 py-3">
          <div className="flex items-center gap-1">
            <Label>{denial ? `${unit === "units" ? "Units" : "Days"} in question` : `${unit === "units" ? "Units" : "Days"} likely granted`}</Label>
            {denial ? null : <InfoTip label="About the days likely granted">{chance}% chance of all {detail.days}, otherwise most likely {Math.round(detail.days / 2)}.</InfoTip>}
          </div>
          <div className="text-[18px] leading-tight font-semibold">
            {denial ? Math.round(detail.days / 2) : daysLikely(shown, detail.days)} <span className="text-[13px] font-medium text-muted">of {detail.days} {unit}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
