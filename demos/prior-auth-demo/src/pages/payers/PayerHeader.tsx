import { useState, type ReactNode } from "react";
import { ChevronDown, History, PenLine } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { InfoTip } from "@/components/ui/InfoTip";
import type { PayerConfig } from "@/data/payerConfig";
import { DEMO_RULES_LABEL, policyStatus, requestNeeds, type RequestNeed } from "@/data/payerConfigPlan";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import type { PayerRow } from "./lib/payers";
import { stateName } from "./lib/states";

const sentence = (s: string): string => (/[.!?]$/.test(s) ? s : `${s}.`);

function Need({ label, need }: { label: string; need: RequestNeed }) {
  return (
    <div>
      <b className="font-semibold">{label}:</b> {need.needed ? "required" : "not on file"}.{need.needed ? <span className="text-muted"> {sentence(need.note)}</span> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 min-[560px]:grid-cols-[120px_minmax(0,1fr)]">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** With `compact` (Workflow Builder and Test Workflow, which need the height for the canvas) the plan line and a quiet policy status move under "Plan details"; a change waiting still shows.

    The payer's name with its organization, product and state, the one quiet label that says its rules are demo data, the policy status, and the buttons
    Edit log and Edit payer. What a coordinator needs next (plan type, programs, whether an initial request or a continued-stay review is needed, notice and reach)
    sits one click down under "Plan details", so the four views start high on the page. All of it is read from the payer and its saved configuration. */
export function PayerHeader({ row, cfg, edits, onEdit, onLog, compact = false }: { row: PayerRow; cfg: PayerConfig; edits: number; onEdit: () => void; onLog: () => void; compact?: boolean }) {
  const [more, setMore] = useState(false);
  const needs = requestNeeds(cfg);
  const status = policyStatus(cfg);
  const ack = cfg.pending?.acknowledged;
  const statusLine = (
    <p className={compact ? "text-[13px]" : "mt-3 border-t border-line pt-3 text-[13px]"}>
      <b className="font-semibold">Policy status:</b>{" "}
      {status.waiting ? (ack ? `Change acknowledged, drafts not updated yet (${status.waiting.title}).` : `Change waiting for you (${status.waiting.title}, effective ${status.waiting.effective}).`) : "No change waiting."}{" "}
      {status.last ? <span className="text-muted">Last acknowledged or applied in Psyflo {status.last.date}. </span> : <span className="text-muted">Nothing acknowledged or applied in Psyflo yet. </span>}
      <span className="text-muted">Source: {status.source}.</span>
    </p>
  );
  return (
    <Card>
      <CardBody className={compact ? "py-4" : undefined}>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <div className="min-w-[240px] flex-1">
            <h1 className={cn("font-serif leading-tight font-semibold", compact ? "text-[24px]" : "text-[28px]")}>{row.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink2">
              <span>{row.org !== row.name ? <>{row.org} <span className="text-muted">·</span> </> : null}{row.product} <span className="text-muted">·</span> {stateName(row.state)}</span>
              {compact ? <DemoRulesNote /> : null}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" icon={History} onClick={onLog}>Edit log{edits ? ` (${edits})` : ""}</Button>
            <Button icon={PenLine} onClick={onEdit}>Edit payer</Button>
          </div>
        </div>
        {compact ? null : (
          <>
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted"><DemoRulesNote /></div>
            <p className="mt-2 text-muted">{cfg.planLine}</p>
            {statusLine}
          </>
        )}
        {compact && status.waiting ? <div className="mt-2">{statusLine}</div> : null}
        <button type="button" aria-expanded={more} onClick={() => setMore((m) => !m)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-forest hover:underline">
          Plan details
          <ChevronDown size={15} className={cn("ico transition-transform", more && "rotate-180")} aria-hidden="true" />
        </button>
        {more ? (
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {compact ? <Row label="About">{cfg.planLine}</Row> : null}
            {compact && !status.waiting ? <Row label="Policy status">{statusLine}</Row> : null}
            {row.plan ? <Row label="Plan type">{row.plan.label}<span className="text-muted">. {row.plan.routing}.</span></Row> : null}
            <Row label="Programs">{row.programs.length ? row.programs.map((p) => PROGRAM_LABEL[p]).join(", ") : <span className="text-muted">None on file</span>}</Row>
            <Row label="Needs">
              <Need label="Initial request" need={needs.initial} />
              <Need label="Continued-stay review" need={needs.review} />
            </Row>
            <Row label="Notice and reach">Notice due {cfg.facts.noticeDue} {cfg.facts.noticeNote}. <span className="text-muted">Reached by {cfg.reachedBy.toLowerCase()}, {cfg.facts.backup}.</span></Row>
          </dl>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** The one quiet label that says the rules on this page are demo data. */
function DemoRulesNote() {
  return (
    <span className="inline-flex items-start gap-1.5 text-xs text-muted">
      <span className="rounded-xl border border-field px-2.5 py-0.5 leading-snug">{DEMO_RULES_LABEL}</span>
      <InfoTip label="About these rules">
        Everything on Payers is sample data for this demo. None of it was read from, or checked against, a payer's current policy. Where a rule has a source in the data, Rules & Instructions shows it, and only a person can mark a rule Verified.
      </InfoTip>
    </span>
  );
}
