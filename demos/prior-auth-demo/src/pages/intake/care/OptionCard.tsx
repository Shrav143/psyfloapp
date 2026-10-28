import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, CircleX, RotateCcw, Send } from "lucide-react";
import { AgentChip, Button, Card, Checkbox, Chip, Pill, TextArea } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { programChange, serviceName, type OptionView } from "@/data/assess/carePlan";
import type { IntakeRecord } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { serviceById } from "@/data/va/services";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { NotSelectedModal } from "../pathway/PathwayModals";
import { PW_STATUS_LABEL } from "../pathway/pathwayModel";
import { actorName, SourceLink } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";
import { SourceAnchor } from "../review/pills";

const STATUS_TONE: Record<string, "neutral" | "mid" | "good"> = { suggested: "neutral", under_review: "mid", selected: "good", not_selected: "neutral" };
const REQ_TONE = { on_file: "good", draft: "mid", not_verified: "neutral" } as const;
const REQ_LABEL = { on_file: "Policy row on file", draft: "Draft or unresolved", not_verified: "Not verified" } as const;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** One service option: the service, whether it is available on the policy date, the evidence behind it, what is missing and the payer requirement. No badge ranks it. "Considered by the clinician" is a checkbox; selecting is a clinician's signature. */
export function OptionCard({ record, view, now, locked, onRefer }: { record: IntakeRecord; view: OptionView; now: number; locked: boolean; onRefer: (pwId: string) => void }) {
  const consider = useStore((s) => s.setOptionConsidered);
  const select = useStore((s) => s.selectService);
  const reopen = useStore((s) => s.setPathwayStatus);
  const { pw } = view;
  const [panel, setPanel] = useState(false);
  const [reason, setReason] = useState("");
  const [signing, setSigning] = useState(false);
  const [notSelected, setNotSelected] = useState(false);
  const svc = pw.serviceId === "external" ? null : serviceById(pw.serviceId);
  const byAgent = pw.suggestedBy in AGENTS;
  const prev = record.carePlan?.selectedServiceId ?? null;
  const needsReason = !view.requested || (prev !== null && prev !== pw.serviceId);
  const change = pw.serviceId === "external" ? null : programChange(record, pw.serviceId, now);
  const refs = record.referralsOut.filter((x) => x.pathwayId === pw.id);

  return (
    <Card data-option={pw.serviceId} data-status={pw.status} className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[16px] font-semibold leading-snug text-ink">{view.name}{svc?.code ? <span className="font-normal text-muted"> ({svc.code})</span> : null}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={view.availability.ok === false ? "mid" : "neutral"}>{view.availability.text}</Pill>
            {view.requested ? <Chip>Requested by the referral</Chip> : null}
            {pw.status !== "suggested" ? <Pill tone={STATUS_TONE[pw.status]} dot={pw.status === "selected"}>{pw.status === "under_review" ? "Considered" : PW_STATUS_LABEL[pw.status]}</Pill> : null}
          </div>
        </div>
        <span className="text-[12px] text-muted">{byAgent ? <AgentChip agent={pw.suggestedBy as AgentKey} /> : `Added by ${actorName(pw.suggestedBy)}`}</span>
      </div>
      <p className="mt-2.5 text-[14px] text-ink2">{pw.rationale}</p>

      {pw.status !== "not_selected" ? (
        <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
          <Item label="Evidence from the record">
            {view.evidence.length ? (
              <ul className="space-y-0.5">
                {view.evidence.slice(0, 4).map((e, i) => (
                  <li key={i}>
                    {e.module ? <Link to={paths.intakeRecord(record.id, `m:${e.module}`)} className="font-medium text-forest hover:underline">{e.label}</Link> : e.source ? <SourceLink record={record} source={e.source} /> : e.label}
                  </li>
                ))}
                {view.evidence.length > 4 ? <li className="text-muted">and {view.evidence.length - 4} more</li> : null}
              </ul>
            ) : <span className="text-muted">No signed work linked yet</span>}
          </Item>
          <Item label="Still missing">
            {view.missing.length ? <ul className="list-disc space-y-0.5 pl-4">{view.missing.map((m) => <li key={m}>{m}</li>)}</ul> : "Nothing listed"}
          </Item>
          <Item label="Payer requirement">
            <span className="flex flex-wrap items-center gap-1.5">{view.requirement.text}<Pill tone={REQ_TONE[view.requirement.status]}>{REQ_LABEL[view.requirement.status]}</Pill></span>
            {view.requirement.rules[0] ? <SourceAnchor rule={view.requirement.rules[0]} /> : null}
          </Item>
          <Item label="Applicable criteria">{view.criteria}</Item>
          <Item label="Clinical review">{pw.status === "selected" ? "Selected by a clinician" : pw.status === "under_review" ? "Considered; a clinician selects or sets it aside" : "Not yet considered"}</Item>
        </dl>
      ) : null}

      {pw.decidedBy && pw.status !== "suggested" ? (
        <p className="mt-3 rounded-lg bg-tile px-3 py-2 text-[12px] text-ink2">
          {pw.status === "selected" ? "Selected" : pw.status === "not_selected" ? "Not selected" : "Considered"} by {actorName(pw.decidedBy)}{pw.decidedAt !== undefined ? ` · ${stamp(pw.decidedAt)}` : ""}{pw.rolePlay ? " · demo role-play" : ""}
          {pw.note && pw.status !== "under_review" ? <span className="block text-ink">Reason: {pw.note}</span> : null}
        </p>
      ) : null}

      {panel && !locked ? (
        <div className="mt-3 space-y-2 rounded-xl border border-forest/30 bg-sage-bg/40 px-4 py-3" data-testid="select-panel">
          <p className="text-[13px] font-semibold text-ink">Select {serviceName(pw.serviceId, pw.externalLabel)}</p>
          {change ? <p className="text-[13px] text-ink2">This moves the intake to {change.label}. Completed assessment work is kept.{change.added.length ? ` New required modules: ${change.added.join(", ")}.` : ""}</p> : null}
          <TextArea aria-label="Why this service" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={needsReason ? "Why this service (required: it differs from the request or replaces an earlier selection)" : "Why this service (optional)"} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" disabled={needsReason && !reason.trim()} onClick={() => setSigning(true)}>Continue to sign-off</Button>
            <Button size="sm" onClick={() => setPanel(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {pw.status !== "not_selected" ? <Checkbox checked={view.considered} disabled={locked || pw.status === "selected"} onChange={(v) => consider(record.id, pw.id, v)} label="Considered by the clinician" /> : null}
        {pw.status !== "selected" && pw.status !== "not_selected" ? <Button size="sm" variant="primary" icon={CircleCheck} disabled={locked} title={locked ? "Revise the care plan to change the service" : undefined} onClick={() => setPanel(true)}>Select this service</Button> : null}
        {pw.status === "suggested" || pw.status === "under_review" ? <Button size="sm" icon={CircleX} disabled={locked} onClick={() => setNotSelected(true)}>Set aside</Button> : null}
        {pw.status === "not_selected" ? <Button size="sm" icon={RotateCcw} disabled={locked} onClick={() => reopen(record.id, pw.id, "under_review")}>Reopen</Button> : null}
        {pw.status !== "not_selected" ? <Button size="sm" variant="ghost" icon={Send} onClick={() => onRefer(pw.id)}>Create referral</Button> : null}
        {refs.length ? <span className="text-[12px] text-muted">Referrals: {refs.map((x) => x.id).join(", ")}</span> : null}
      </div>

      {notSelected ? <NotSelectedModal name={view.name} onClose={() => setNotSelected(false)} onSave={(why) => reopen(record.id, pw.id, "not_selected", why)} /> : null}
      <SignOffDialog
        open={signing} onClose={() => setSigning(false)} record={record} title={`Select the service: ${view.name}`}
        attestation="I selected this service after clinical review. The options Psyflo listed are not a placement decision."
        signLabel="Select service"
        onSign={(signer, rolePlay) => { if (select(record.id, pw.id, { signerId: signer.id, rolePlay, reason })) { setPanel(false); setReason(""); } }}
      />
    </Card>
  );
}
