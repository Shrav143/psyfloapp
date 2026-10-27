import { useState, type ReactNode } from "react";
import { ArrowRightLeft, ChevronDown, CircleCheck, CircleX, Eye, RotateCcw, Send } from "lucide-react";
import { AgentChip, Button, Card, Chip, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { IntakeRecord, ServiceRecommendation } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { PERIOD_LABEL } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { PolicyStatusPill } from "../cans/ui";
import { actorName, SourceLink } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";
import { MakeRequestedModal, NotSelectedModal } from "./PathwayModals";
import { AVAIL_LABEL, FIT_LABEL, nextActionOf, onPlannedStart, pathwayName, pathwayPolicy, PW_STATUS_LABEL, rulesFor, serviceWindow } from "./pathwayModel";

const STATUS_TONE: Record<ServiceRecommendation["status"], "neutral" | "mid" | "good"> = { suggested: "neutral", under_review: "mid", selected: "good", not_selected: "neutral" };

/** One care pathway option, with everything a clinician needs to review it and the actions they can take. */
export function PathwayCard({ record, pw, now, onRefer }: { record: IntakeRecord; pw: ServiceRecommendation; now: number; onRefer: (pwId: string) => void }) {
  const setStatus = useStore((s) => s.setPathwayStatus);
  const select = useStore((s) => s.selectPathway);
  const [modal, setModal] = useState<"not_selected" | "requested" | "select" | null>(null);
  const [more, setMore] = useState(false);
  const win = serviceWindow(pw.serviceId);
  const start = onPlannedStart(pw.serviceId, record);
  const { period, version } = pathwayPolicy(pw, record, now);
  const rules = rulesFor(pw, record);
  const requested = pw.serviceId === record.serviceId;
  const refs = record.referralsOut.filter((x) => x.pathwayId === pw.id);
  const byAgent = pw.suggestedBy in AGENTS;
  const svc = pw.serviceId === "external" ? null : serviceById(pw.serviceId);
  return (
    <Card data-pathway={pw.serviceId} data-status={pw.status} className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[16px] font-semibold leading-snug text-ink">{pathwayName(pw)}{svc?.code ? <span className="font-normal text-muted"> ({svc.code})</span> : null}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={win.tone}>{win.label}</Pill>
            <Pill tone="neutral">{FIT_LABEL[pw.fit]}</Pill>
            <Pill tone={STATUS_TONE[pw.status]} dot={pw.status === "selected"}>{PW_STATUS_LABEL[pw.status]}</Pill>
            {requested ? <Chip>Requested service</Chip> : null}
          </div>
        </div>
        <span className="text-[12px] text-muted">
          {byAgent ? <AgentChip agent={pw.suggestedBy as AgentKey} /> : `Added by ${actorName(pw.suggestedBy)}`}
        </span>
      </div>
      <p className="mt-2.5 text-[14px] text-ink">{pw.rationale}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {pw.evidence.length ? pw.evidence.map((e, i) => <SourceLink key={i} record={record} source={e} />) : <span className="text-[12px] text-muted">No evidence linked yet</span>}
      </div>
      {pw.status !== "not_selected" ? (
        <>
          <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
            <Item label="Outstanding">
              {pw.outstanding.length ? <ul className="list-disc space-y-0.5 pl-4">{pw.outstanding.map((o) => <li key={o}>{o}</li>)}</ul> : "Nothing listed"}
            </Item>
            <Item label="On the planned start">
              <span className={start.ok === false ? "text-risk-ink" : undefined}>{start.text}</span>
              <span className="block text-[12px] text-muted">{AVAIL_LABEL[pw.availability]}</span>
            </Item>
            <Item label="Policy period">
              {period ? <span className="inline-flex flex-wrap items-center gap-1.5">{PERIOD_LABEL[period]}{version ? <PolicyStatusPill status={version.status} /> : null}</span> : "Set by the receiving program"}
              {version ? <span className="block text-[12px] font-normal text-muted">{version.label}</span> : null}
            </Item>
            <Item label="Clinical review">Required before selection</Item>
          </dl>
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">
            <ChevronDown size={14} className={cn("ico transition-transform", more && "rotate-180")} aria-hidden="true" />
            Authorization and referral requirements
          </button>
          {more ? (
            <dl className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
              <Item label="Authorization">
                {rules.length ? (
                  <ul className="space-y-0.5">{rules.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-1.5">{r.label} <PolicyStatusPill status={r.status} /></li>)}</ul>
                ) : pw.serviceId === "external" ? "Ask the program and the member's plan" : "No authorization rule on file"}
              </Item>
              <Item label="Referral requirements">
                {pw.referralReqs.length ? <ul className="list-disc space-y-0.5 pl-4">{pw.referralReqs.map((o) => <li key={o}>{o}</li>)}</ul> : "None listed"}
              </Item>
            </dl>
          ) : null}
        </>
      ) : null}
      {pw.decidedBy && pw.status !== "suggested" ? (
        <p className="mt-3 rounded-lg bg-tile px-3 py-2 text-[12px] text-ink2">
          {pw.status === "selected" ? "Selected" : pw.status === "not_selected" ? "Not selected" : "Review started"} by {actorName(pw.decidedBy)}{pw.decidedAt !== undefined ? ` · ${stamp(pw.decidedAt)}` : ""}{pw.rolePlay ? " · demo role-play" : ""}
          {pw.status === "not_selected" && pw.note ? <span className="block text-ink">Reason: {pw.note}</span> : null}
        </p>
      ) : null}
      <p className="mt-3 text-[13px] text-ink2"><span className="font-semibold text-ink">Next action:</span> {nextActionOf(pw, record)}{refs.length ? ` · Referrals: ${refs.map((x) => x.id).join(", ")}` : ""}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {pw.status === "suggested" ? <Button size="sm" icon={Eye} onClick={() => setStatus(record.id, pw.id, "under_review")}>Mark under review</Button> : null}
        {pw.status === "under_review" ? <Button size="sm" variant="primary" icon={CircleCheck} onClick={() => setModal("select")}>Select pathway</Button> : null}
        {pw.status === "suggested" || pw.status === "under_review" ? <Button size="sm" icon={CircleX} onClick={() => setModal("not_selected")}>Mark not selected</Button> : null}
        {pw.status === "selected" || pw.status === "not_selected" ? <Button size="sm" icon={RotateCcw} onClick={() => setStatus(record.id, pw.id, "under_review")}>Reopen review</Button> : null}
        {pw.status !== "not_selected" ? <Button size="sm" icon={Send} onClick={() => onRefer(pw.id)}>Create referral</Button> : null}
        {pw.serviceId !== "external" && !requested && pw.status !== "not_selected" ? <Button size="sm" variant="ghost" icon={ArrowRightLeft} onClick={() => setModal("requested")}>Make this the requested service</Button> : null}
      </div>
      {modal === "not_selected" ? <NotSelectedModal name={pathwayName(pw)} onClose={() => setModal(null)} onSave={(reason) => setStatus(record.id, pw.id, "not_selected", reason)} /> : null}
      {modal === "requested" && pw.serviceId !== "external" ? <MakeRequestedModal record={record} serviceId={pw.serviceId} pwId={pw.id} onClose={() => setModal(null)} /> : null}
      <SignOffDialog
        open={modal === "select"}
        onClose={() => setModal(null)}
        record={record}
        title={`Select the pathway: ${pathwayName(pw)}`}
        attestation="I selected this pathway after clinical review. The agent's options are not a placement decision."
        signLabel="Select pathway"
        onSign={(signer, rolePlay) => select(record.id, pw.id, signer.id, rolePlay)}
      />
    </Card>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[13px] text-ink">{children}</dd>
    </div>
  );
}
