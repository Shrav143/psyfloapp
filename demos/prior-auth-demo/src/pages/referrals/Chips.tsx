import { Globe, Mail, Phone, Printer, Send, type LucideIcon } from "lucide-react";
import { Pill } from "@/components/ui";
import { CHANNEL_LABEL, STATUS_LABEL, STATUS_TONE, URGENCY_LABEL, URGENCY_TONE, staffById, type Channel, type ReferralStatus, type StaffId } from "@/data/referrals";
import type { Urgency } from "@/data/types";
import { cn } from "@/lib/cn";

const CHANNEL_ICON: Record<Channel, LucideIcon> = { fax: Printer, eReferral: Send, portal: Globe, phone: Phone, email: Mail };

export const StatusPill = ({ status }: { status: ReferralStatus }) => (
  <Pill tone={STATUS_TONE[status]} dot>
    {STATUS_LABEL[status]}
  </Pill>
);

export const UrgencyPill = ({ urgency }: { urgency: Urgency }) => <Pill tone={URGENCY_TONE[urgency]}>{URGENCY_LABEL[urgency]}</Pill>;

export function ChannelTag({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <Icon size={13} className="ico" />
      {CHANNEL_LABEL[channel]}
    </span>
  );
}

export function OwnerAvatar({ owner, showName }: { owner: StaffId | null; showName?: boolean }) {
  if (!owner) return <span className="text-[13px] text-muted">Unassigned</span>;
  const s = staffById(owner);
  return (
    <span className="inline-flex items-center gap-2">
      <span title={s.name} className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: s.color }}>
        {s.initials}
      </span>
      {showName ? <span className="text-sm">{s.name}</span> : null}
    </span>
  );
}
