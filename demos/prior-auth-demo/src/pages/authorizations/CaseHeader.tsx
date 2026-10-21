import { ArrowLeft, Check, LayoutDashboard, PenLine, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentBadge, Banner, Button, Card, Chip, Label, PageHeader, Pill, Ring } from "@/components/ui";
import { confidenceWord, daysLikely, isBenchmarkOnly, rangeOf, similarTotal } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import type { Tone } from "@/data/types";
import { band as chanceBand } from "@/lib/format";
import { HOUR } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseCtx } from "./caseTypes";
import { dueText } from "./queueLogic";
import { Scores } from "./Scores";
import { useAnimatedNumber } from "./useAnimatedNumber";

/** The header card, the three tiles and the two notes. They stay the same on all five tabs. */
export function CaseHeader({ ctx }: { ctx: CaseCtx }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const { detail, work, chance, projected, canSend, sendReason, sent, live, send } = ctx;
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

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Chip className="font-sans tracking-normal">{detail.levelLabel}</Chip>
            <span>{detail.id}</span>
            <Chip className="font-sans tracking-normal">{detail.type}</Chip>
            {moved ? <Pill tone={moved.tone} dot className="font-sans tracking-normal">{moved.chip}</Pill> : detail.chip ? <Pill tone={detail.chip.tone} dot className="font-sans tracking-normal">{detail.chip.text}</Pill> : left !== null ? <Pill tone={dueTone} dot className="font-sans tracking-normal">{dueText(detail.dueVerb, detail.dueAt ?? 0, clock)}</Pill> : null}
          </span>
        }
        sub={
          <div className="flex flex-col gap-1">
            <span>{detail.initials}, {detail.age} · {payer.name} · {detail.levelLabel} · {detail.days} days requested</span>
            <span className="text-base text-ink">{detail.dx}</span>
            <Scores scores={detail.scores} />
            <span className="mt-1 flex items-center gap-2 text-[13px] text-ink2">
              <AgentBadge agent={ready ? "integrity" : moved ? moved.agent : detail.agent} size={22} />
              {ready ? "Ready to sign. Integrity passed all four checks" : moved ? moved.line : detail.statusLine}
              {live ? <Button size="sm" variant="ghost" icon={LayoutDashboard} onClick={() => navigate(paths.dashboard({ request: live.requestId }))}>Open on the Dashboard</Button> : null}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <Button icon={PenLine} onClick={send}>Open in review and sign</Button>
              {sent ? (
                <Button variant="primary" icon={Check} disabled title={sendReason}>Sent to payer</Button>
              ) : (
                <Button variant="primary" icon={Send} disabled={!canSend} title={canSend ? undefined : sendReason} onClick={send}>Send to payer</Button>
              )}
              <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(paths.authorizations())}>Back to queue</Button>
            </div>
            <span className="max-w-[420px] text-right text-xs text-muted">{canSend ? "Sending opens review and sign. Nothing goes to the payer until a clinician signs." : sendReason}</span>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
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
          <Label>{denial ? "Days in question" : "Days likely granted"}</Label>
          <div className="mt-3 text-[28px] leading-none font-semibold">
            {denial ? Math.round(detail.days / 2) : daysLikely(shown, detail.days)} <span className="text-base font-medium text-muted">of {detail.days} {denial ? "days" : "days likely"}</span>
          </div>
          <div className="mt-2 text-sm text-muted">{denial ? "The payer approved part of the stay. The other days are what the call is about." : `${chance}% chance of all ${detail.days}, otherwise most likely ${Math.round(detail.days / 2)}`}</div>
        </Card>
      </div>

      {detail.denialId ? (
        <Banner tone="mid" title="This request was denied" action={<Button size="sm" onClick={() => navigate(paths.denials(detail.denialId))}>Open in Denial Intelligence</Button>}>
          Advocate owns the next step. The peer-to-peer brief and the appeal live in Denial Intelligence. This page keeps the draft and the evidence the call will use.
        </Banner>
      ) : null}
      <Banner>The approval chance estimates how well the paperwork fits this payer's past decisions. It never blocks a request and is never shown to payers or patients.</Banner>
      <Banner tone="mid">Decision support for documentation and workflow only. It does not recommend or decide care.</Banner>
    </>
  );
}
