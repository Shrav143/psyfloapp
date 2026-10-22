import type { ReactNode } from "react";
import { History, PenLine } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { DEMO_RULES_LABEL, policyStatus, requestNeeds, type RequestNeed } from "@/data/payerConfigPlan";
import { PROGRAM_LABEL } from "@/data/types";
import { InfoTip } from "@/pages/eligibility/InfoTip";
import type { PayerRow } from "./lib/payers";

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

/** The payer's name with the one quiet label that says its rules are demo data, then what a coordinator needs to know first: plan type, programs,
    whether an initial request or a continued-stay review is needed, and the policy status. All of it is read from the payer and its saved configuration. */
export function PayerHeader({ row, cfg, edits, onEdit, onLog }: { row: PayerRow; cfg: PayerConfig; edits: number; onEdit: () => void; onLog: () => void }) {
  const needs = requestNeeds(cfg);
  const status = policyStatus(cfg);
  const ack = cfg.pending?.acknowledged;
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <h2 className="min-w-[240px] flex-1 font-serif text-[28px] leading-tight font-semibold">{row.name}</h2>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" icon={History} onClick={onLog}>Edit log{edits ? ` (${edits})` : ""}</Button>
            <Button icon={PenLine} onClick={onEdit}>Edit</Button>
          </div>
        </div>
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
          <span className="rounded-xl border border-field px-2.5 py-0.5 leading-snug">{DEMO_RULES_LABEL}</span>
          <InfoTip label="About these rules">
            Everything on Payers is sample data for this demo. None of it was read from, or checked against, a payer's current policy. Where a rule has a source in the data, the Rules tab shows it.
          </InfoTip>
        </div>
        <p className="mt-2 text-muted">{cfg.planLine}</p>
        <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
          {row.plan ? <Row label="Plan type">{row.plan.label}<span className="text-muted">. {row.plan.routing}.</span></Row> : null}
          <Row label="Programs">{row.programs.length ? row.programs.map((p) => PROGRAM_LABEL[p]).join(", ") : <span className="text-muted">None on file</span>}</Row>
          <Row label="Needs">
            <Need label="Initial request" need={needs.initial} />
            <Need label="Continued-stay review" need={needs.review} />
          </Row>
          <Row label="Notice and reach">Notice due {cfg.facts.noticeDue} {cfg.facts.noticeNote}. <span className="text-muted">Reached by {cfg.reachedBy.toLowerCase()}, {cfg.facts.backup}.</span></Row>
        </dl>
        <p className="mt-4 border-t border-line pt-3.5 text-[13px]">
          <b className="font-semibold">Policy status:</b>{" "}
          {status.waiting ? (ack ? `Change acknowledged, drafts not updated yet (${status.waiting.title}).` : `Change waiting for you (${status.waiting.title}, effective ${status.waiting.effective}).`) : "No change waiting."}{" "}
          {status.last ? <span className="text-muted">Last acknowledged or applied in Psyflo {status.last.date}. </span> : <span className="text-muted">Nothing acknowledged or applied in Psyflo yet. </span>}
          <span className="text-muted">Source: {status.source}.</span>
        </p>
      </CardBody>
    </Card>
  );
}
