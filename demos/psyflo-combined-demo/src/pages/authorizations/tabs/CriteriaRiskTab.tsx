import { useEffect, useState } from "react";
import { ArrowRight, ChartColumn, Check, CircleAlert, CircleCheck, CircleHelp, CircleX, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader, InfoTip, Label, Pill } from "@/components/ui";
import type { Rec } from "@/data/caseDetail";
import { criteriaView, gainOf, groupRecs, rangeOf, type CriterionView } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import { band as chanceBand, plural } from "@/lib/format";
import { useStore } from "@/store";
import type { CaseCtx } from "../caseTypes";
import { EvidenceChip } from "../EvidenceChip";
import { Fold } from "../Fold";
import { useBusy } from "../useBusy";
import { BreakdownModal } from "./BreakdownModal";
import { HowCalculatedModal, SeeAllModal } from "./RiskModals";

/** The risk each open action closes, in a few words, for the chips at the top. */
const RISK_LABEL: Record<string, string> = {
  stepdown: "No named step-down", iop: "Earlier IOP summary not attached", summary: "Earlier treatment summary not attached", sertraline: "Conflicting sertraline date",
  dates: "Conflicting medication date", therapy: "No therapy note in 14 days", home: "Home not described plainly", scores: "Scores not dated in the draft", coverage: "Coverage gap",
  "focus-necessity": "Risk at a lower level not stated", "focus-criteria": "Requirements not listed by page", "focus-denial": "No peer-to-peer note ready",
};
const riskOf = (r: Rec): string => RISK_LABEL[r.id] ?? r.title;

type Status = "met" | "partial" | "not_met";
const STATUS: Record<Status, { word: string; color: string; Icon: typeof CircleCheck }> = {
  met: { word: "Met", color: "text-good", Icon: CircleCheck }, partial: { word: "Partial", color: "text-mid", Icon: CircleAlert }, not_met: { word: "Not met", color: "text-risk", Icon: CircleX },
};
const statusOf = (c: CriterionView): Status => (c.met ? "met" : c.notMet ? "not_met" : "partial");

/** Criteria & risk: does the documentation meet the payer's criteria, and how strong is it. Two figures and the biggest risks first,
    then one row per criterion that opens to its evidence and, when it is not met, the risk it carries and the action that closes it. */
export function CriteriaRiskTab({ ctx, section }: { ctx: CaseCtx; section: "picture" | "risk" | null }) {
  const { detail, work, chance, goTab } = ctx;
  const payer = payerById(detail.payerId);
  const rows = criteriaView(detail, work);
  const met = rows.filter((r) => r.met).length;
  const open = groupRecs(detail, work).open;
  const risks = [...open].sort((a, b) => gainOf(b) - gainOf(a)).slice(0, 3);
  const b = chanceBand(chance);
  const [lo, hi] = rangeOf(detail, chance);
  const [breakdown, setBreakdown] = useState(false);
  const [how, setHow] = useState(false);
  const [all, setAll] = useState(false);
  const [checking, run] = useBusy();
  const recById = (id?: string) => detail.recs.find((r) => r.id === id);
  const payerNote = useStore((s) => s.queueItems.find((i) => i.id === detail.id)?.rule);
  const recheck = () =>
    run(1600, () =>
      useStore.getState().toast({ title: "Criteria re-checked", body: `${payer.shortName} policy ${detail.policy}: ${met} of ${rows.length} met`, tone: met === rows.length ? "good" : "mid" }),
    );

  // An old ?tab=risk link lands here on the figures.
  useEffect(() => {
    if (section !== "risk") return;
    const t = setTimeout(() => document.getElementById("risk")?.scrollIntoView({ block: "start" }), 60); // after the shell's scroll to the top
    return () => clearTimeout(t);
  }, [section]);

  return (
    <div className="flex flex-col gap-5">
      <Card id="risk" className="scroll-mt-4 px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-testid="criteria-met">
            <Label>Criteria met</Label>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] leading-tight font-semibold">{met} of {rows.length}</span>
              {met < rows.length ? <Pill tone="mid" dot>{rows.length - met} partial</Pill> : <Pill tone="good" dot>All met</Pill>}
            </div>
          </div>
          <div data-testid="chance-figure">
            <Label>{detail.phase === "denial" ? "Chance to overturn" : "Approval chance"}</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[18px] leading-tight font-semibold">{chance}%</span>
              <Pill tone={b.tone} dot>{b.word} · {lo}–{hi}%</Pill>
              <Button size="sm" variant="ghost" icon={ChartColumn} onClick={() => setBreakdown(true)}>See the breakdown</Button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3" data-testid="risks">
          <span className="mr-1 inline-flex items-center gap-1">
            <Label>Biggest risks</Label>
            <InfoTip label="About the biggest risk">{detail.biggest.title}. {detail.biggest.text} {detail.biggest.seen}.</InfoTip>
          </span>
          {risks.length === 0 ? <Pill tone="good" dot>None open</Pill> : null}
          {risks.map((r) => (
            <button key={r.id} type="button" onClick={() => goTab("actions", r.id)} title={r.title} className="inline-flex items-center gap-1.5 rounded-full border border-risk-edge bg-risk-bg px-2.5 py-[3px] text-[12px] font-semibold text-risk-ink hover:brightness-[0.98]">
              {riskOf(r)} <span className="font-normal">· {plural(gainOf(r), "pt")}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-1">What {payer.shortName} requires{payerNote ? <InfoTip label="Payer note">{payerNote}</InfoTip> : null}</span>}
          subtitle={`Policy ${detail.policy} · ${payer.approvedAsAsked}% approved as asked, last 90 days · ${detail.tool}`}
          right={<Button size="sm" icon={RefreshCw} loading={checking} onClick={recheck}>Re-check criteria</Button>}
        />
        <ul className="m-0 list-none px-5 py-1" aria-label="Criteria" data-testid="criteria">
          {rows.map((c) => {
            const st = STATUS[statusOf(c)];
            const fix = recById(c.fixRec);
            const fixOpen = !!fix && !c.met;
            return (
              <li key={c.id} className="border-b border-line last:border-b-0" data-testid={`criterion-${c.id}`}>
                <Fold
                  head={
                    <span className="flex items-start gap-2.5">
                      <span className={`inline-flex w-[78px] shrink-0 items-center gap-1 text-[12px] font-semibold ${st.color}`}><st.Icon size={15} className="ico" aria-hidden="true" />{st.word}</span>
                      <span className="text-[13px] font-medium text-ink">{c.text}</span>
                    </span>
                  }
                  right={fixOpen ? <span className="shrink-0 text-[12px] font-semibold text-risk-ink">{plural(gainOf(fix), "pt")} at risk</span> : null}
                >
                  <div className="flex flex-col gap-1.5 pb-3 pl-[88px] text-[13px]">
                    <div className="text-ink2">{c.evidence}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-tile px-2 py-1 text-[12px] text-ink2">“{c.source.quote}”</span>
                      <EvidenceChip evidence={c.source} detail={detail} />
                    </div>
                    <div className="text-[12px] text-muted">Criteria: {c.note}</div>
                    {fixOpen ? (
                      <div>
                        <Button size="sm" variant="ghost" trailing={ArrowRight} onClick={() => goTab("actions", fix.id)}>{fix.title}</Button>
                      </div>
                    ) : null}
                  </div>
                </Fold>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="px-5 py-1">
        <Fold head={<span className="text-[13px] font-semibold">Similar decisions <span className="font-normal text-muted">{detail.comparable.length} closest</span></span>}>
          <div className="pb-3">
            {detail.comparable.map((c) => (
              <div key={c.what} className="flex items-center gap-3 border-b border-line py-2 text-[13px] last:border-b-0">
                <div className="min-w-0 flex-1"><span className="font-semibold">{c.what}</span> <span className="text-muted">· {c.who} · {c.match}</span></div>
                <Pill tone={c.tone}>{c.outcome}</Pill>
              </div>
            ))}
            <Label className="mt-3 mb-1">What the approved ones had</Label>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
              {detail.common.map((t) => <li key={t} className="flex items-center gap-2"><Check size={13} className="ico text-good" aria-hidden="true" />{t}</li>)}
            </ul>
            <div className="mt-3 text-[13px]" data-testid="calibration">
              Forecaster said <b>{detail.calibration.said}</b> · <b>{detail.calibration.actual}%</b> approved in full · {detail.calibration.n} {payer.shortName} decisions
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setAll(true)}>See all</Button>
              <Button size="sm" variant="ghost" icon={CircleHelp} onClick={() => setHow(true)}>How it is calculated</Button>
            </div>
          </div>
        </Fold>
      </Card>

      {breakdown ? <BreakdownModal ctx={ctx} onClose={() => setBreakdown(false)} /> : null}
      {how ? <HowCalculatedModal detail={detail} onClose={() => setHow(false)} /> : null}
      {all ? <SeeAllModal detail={detail} onClose={() => setAll(false)} /> : null}
    </div>
  );
}
