import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Pill } from "@/components/ui";
import { CHANNEL_LABEL } from "@/data/intake/destinations";
import { REFERRAL_OUT_LABEL, type IntakeRecord, type ReferralOut } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { clockTime, longDate, stamp, toDate } from "@/lib/time";
import { useStore } from "@/store";
import { Facts, Select } from "../../cans/ui";
import { actorName } from "../../shared/provenance";
import { ReferralActions } from "./ReferralActions";
import { ReferralDocs } from "./ReferralDocs";
import { isOverdue, STATUS_TONE, stepOf, STEPS } from "./referralModel";

/** One referral out: its status track, details, documents, actions and its own activity timeline. */
export function ReferralCard({ record, ro, open, onToggle, onRedirect }: { record: IntakeRecord; ro: ReferralOut; open: boolean; onToggle: () => void; onRedirect: () => void }) {
  const clock = useStore((s) => s.clock);
  const update = useStore((s) => s.updateReferralOut);
  const overdue = isOverdue(ro, clock);
  const editable = ro.status === "draft" || ro.status === "ready";
  const acceptance = ro.status === "accepted" || ro.status === "scheduled" || ro.status === "completed" ? "Accepted" : ro.status === "declined" ? "Declined" : ro.status === "needs_info" ? "Needs information" : "Pending";
  const [showAll, setShowAll] = useState(false);
  const events = [...ro.timeline].sort((a, b) => b.at - a.at);
  const shown = showAll ? events : events.slice(0, 4);
  return (
    <li data-referral={ro.id} data-status={ro.status} className="rounded-2xl border border-edge bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-left hover:bg-tile">
        <span className="text-[14px] font-semibold text-ink">{ro.id}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{ro.destination.org}</span>
        <Pill tone={STATUS_TONE[ro.status]}>{REFERRAL_OUT_LABEL[ro.status]}</Pill>
        {ro.priority === "urgent" ? <Pill tone="risk">Urgent</Pill> : null}
        {overdue ? <Pill tone="risk">Follow-up overdue</Pill> : null}
        <ChevronDown size={16} className={cn("ico text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-line px-4 py-3">
          <ol aria-label="Referral status" className="flex flex-wrap gap-x-1.5 gap-y-1 text-[12px]">
            {STEPS.map((s, i) => {
              const cur = stepOf(ro.status);
              const label = i === 5 && cur >= 5 && ["accepted", "needs_info", "declined"].includes(ro.status) ? REFERRAL_OUT_LABEL[ro.status] : s;
              return (
                <li key={s} aria-current={i === cur ? "step" : undefined} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", i < cur ? "bg-good-bg text-good-ink" : i === cur ? "bg-forest text-white" : "bg-neutral-bg text-muted")}>
                  {i < cur ? <Check size={11} className="ico" aria-hidden="true" /> : null}
                  {label}
                </li>
              );
            })}
          </ol>
          <Facts
            items={[
              ["Receiving organization", ro.destination.org],
              ["Requested service", ro.serviceId === "external" ? "External program" : serviceById(ro.serviceId).label],
              ["Referral date", longDate(ro.createdAt)],
              ["Referring clinician", ro.referringClinician],
              ["Receiving contact", `${ro.destination.contact}${ro.destination.phone ? ` · ${ro.destination.phone}` : ""}`],
              ["Channel", `${CHANNEL_LABEL[ro.destination.channel]} (simulated)`],
              ["Acceptance", acceptance],
              ["Appointment", ro.appointmentAt !== undefined ? `${longDate(ro.appointmentAt)} · ${clockTime(toDate(ro.appointmentAt))}` : "Not scheduled"],
              ["Reason for redirection or decline", ro.reason ?? "None"],
              ["Final disposition", ro.disposition ?? "Open"],
              ["Approved to send by", ro.approvedBy ? actorName(ro.approvedBy) : "Not sent yet"],
              ["Follow-up", ro.followUpAt !== undefined ? longDate(ro.followUpAt) : "Not set"],
            ]}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink2">Consent or release</span>
              <Select label="Consent or release" disabled={!editable} value={ro.consent} onChange={(v) => update(record.id, ro.id, { consent: v as ReferralOut["consent"] }, { action: `Consent recorded as ${v === "on_file" ? "on file" : v}` })} options={[{ value: "on_file", label: "On file" }, { value: "needed", label: "Needed" }, { value: "declined", label: "Declined" }]} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink2">Priority</span>
              <Select label="Priority" disabled={!editable} value={ro.priority} onChange={(v) => update(record.id, ro.id, { priority: v as ReferralOut["priority"] }, { action: `Priority set to ${v}` })} options={[{ value: "routine", label: "Routine" }, { value: "urgent", label: "Urgent" }]} />
            </label>
          </div>
          <div>
            <h5 className="mb-1.5 text-[13px] font-semibold text-ink2">Required documents</h5>
            <ReferralDocs record={record} ro={ro} />
          </div>
          {ro.packet ? (
            <div className="rounded-xl bg-tile px-3.5 py-3">
              <p className="text-[12px] font-semibold text-muted">Packet prepared by {actorName("navigator")} · {stamp(ro.packet.preparedAt)}{ro.packet.missing.length ? ` · still missing: ${ro.packet.missing.join("; ")}` : ""}</p>
              <p className="mt-1 text-[13px] text-ink">{ro.packet.message}</p>
            </div>
          ) : null}
          <ReferralActions record={record} ro={ro} onRedirect={onRedirect} />
          <div>
            <h5 className="mb-1 text-[13px] font-semibold text-ink2">Activity</h5>
            <ol aria-label={`${ro.id} activity`} className="space-y-1.5">
              {shown.map((e) => (
                <li key={e.id} className="text-[13px]">
                  <span className="text-[12px] text-muted">{stamp(e.at)} · {e.actor === "destination" ? ro.destination.org : actorName(e.actor)}{e.ai ? " · Agent" : ""}</span>
                  <span className="block text-ink">{e.action}</span>
                  {e.detail ? <span className="block text-[12px] text-ink2">{e.detail}</span> : null}
                </li>
              ))}
            </ol>
            {events.length > 4 ? <button type="button" onClick={() => setShowAll((x) => !x)} className="mt-1 text-[12px] font-semibold text-forest hover:underline">{showAll ? "Show less" : `Show all ${events.length}`}</button> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
