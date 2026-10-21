import { CalendarPlus, Check, MessageSquarePlus, Send, RotateCcw } from "lucide-react";
import { Button, Dropdown, Pill, Stepper } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { STAFF, STATUS_LABEL, isOpen, type Referral, type StaffId } from "@/data/referrals";
import { payerById } from "@/data/seed";
import { blockedInHosted } from "@/lib/hosted";
import { ago, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { ChannelTag, StatusPill, UrgencyPill } from "./Chips";
import { pastTarget } from "./metrics";

type MoreChoice = "" | "reply" | "download" | "copy";
type OwnerChoice = StaffId | "none";

interface Props {
  r: Referral;
  onAccept: () => void;
  onInfo: () => void;
  onDecline: () => void;
  onNote: () => void;
  onSchedule: () => void;
}

function stepsFor(r: Referral): { steps: string[]; current: number } {
  if (r.status === "declined") return { steps: ["Received", "Reviewed", "Declined"], current: 3 };
  const steps = ["Received", "Reviewed", "Decided", "Admitted"];
  if (r.status === "admitted") return { steps, current: 4 };
  if (r.status === "accepted" || r.status === "scheduled") return { steps, current: 3 };
  return { steps, current: 1 };
}

/** The top card: who, where it came from, where it stands, and what a person can do next. */
export function ReferralHeader({ r, onAccept, onInfo, onDecline, onNote, onSchedule }: Props) {
  const clock = useStore((s) => s.clock);
  const assign = useStore((s) => s.assignReferrals);
  const admit = useStore((s) => s.markAdmitted);
  const reopen = useStore((s) => s.reopenReferral);
  const reply = useStore((s) => s.simulateReferrerReply);
  const toast = useStore((s) => s.toast);
  const open = isOpen(r.status);
  const { steps, current } = stepsFor(r);

  const more = (v: MoreChoice) => {
    if (v === "reply") {
      if (r.status === "awaiting_info") reply(r.id);
      else toast({ title: "Nothing to answer yet", body: "Use Request information first. The demo reply answers an open request.", tone: "neutral" });
    } else if (v === "download") toast({ title: "Downloading the original", body: `${r.id}.pdf, ${r.plan.pages + 1} pages. This is a demo, so no file is saved.`, tone: "neutral" });
    else if (v === "copy") {
      if (blockedInHosted("Copy link")) return;
      void navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
      toast({ title: "Link copied", body: "It opens this referral for anyone on your team.", tone: "good" });
    }
  };

  return (
    <div className="rounded-[20px] border border-edge bg-white px-7 py-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-semibold text-neutral-ink">{PROGRAM_LABEL[r.program]} requested</span>
            <h1 className="font-serif text-[36px] leading-none font-semibold tracking-tight">{r.id}</h1>
            <StatusPill status={r.status} />
            <UrgencyPill urgency={r.urgency} />
            {pastTarget(r, clock) ? <Pill tone="risk">Past response target</Pill> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted">
            <span className="text-ink">{r.patient.initials}, {r.patient.age}</span>
            <span aria-hidden="true">·</span>
            <span>{r.source.name}</span>
            <ChannelTag channel={r.channel} className="text-[13px]" />
            <span aria-hidden="true">·</span>
            <span>received {ago(r.receivedAt, clock)}, {stamp(r.receivedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{r.payerId ? payerById(r.payerId).name : "No payer listed"}</span>
          </div>
        </div>
        <Stepper steps={steps} current={current} className="shrink-0 pt-1" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5" role="group" aria-label={`Actions, status ${STATUS_LABEL[r.status]}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          {open ? <Button variant="primary" icon={Check} onClick={onAccept}>Accept referral</Button> : null}
          {r.status === "new" || r.status === "in_review" ? <Button icon={Send} onClick={onInfo}>Request information</Button> : null}
          {open ? <Button variant="danger" onClick={onDecline}>Decline</Button> : null}
          {r.status === "accepted" ? <Button variant="primary" icon={CalendarPlus} onClick={onSchedule}>Schedule intake</Button> : null}
          {r.status === "scheduled" ? (
            <>
              <Button variant="primary" icon={Check} onClick={() => admit(r.id)}>Mark admitted</Button>
              <Button icon={CalendarPlus} onClick={onSchedule}>Change intake</Button>
            </>
          ) : null}
          {r.status === "declined" ? <Button icon={RotateCcw} onClick={() => reopen(r.id)}>Reopen referral</Button> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-muted">Owner</span>
          <Dropdown<OwnerChoice>
            ariaLabel="Assign"
            value={r.owner ?? "none"}
            options={[...STAFF.map((s) => ({ value: s.id as OwnerChoice, label: s.name })), { value: "none", label: "Unassigned" }]}
            onChange={(v) => assign([r.id], v === "none" ? null : v)}
          />
          <Button icon={MessageSquarePlus} onClick={onNote}>Add note</Button>
          <Dropdown<MoreChoice>
            ariaLabel="More actions"
            value=""
            placeholder="More"
            menuWidth={290}
            options={[
              { value: "reply", label: "Demo: simulate the referrer's reply" },
              { value: "download", label: "Download the source document" },
              { value: "copy", label: "Copy link to this referral" },
            ]}
            onChange={more}
          />
        </div>
      </div>
    </div>
  );
}
