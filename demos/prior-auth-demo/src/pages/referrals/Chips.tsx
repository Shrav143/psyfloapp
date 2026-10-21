import { Globe, Mail, Phone, Printer, Send, type LucideIcon } from "lucide-react";
import { Chip, Pill } from "@/components/ui";
import { CHANNEL_LABEL, STATUS_LABEL, STATUS_TONE, URGENCY_LABEL, URGENCY_TONE, issueCount, hasFail, staffById, type Channel, type ReferralStatus, type Referral, type StaffId } from "@/data/referrals";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type Urgency } from "@/data/types";
import { cn } from "@/lib/cn";
import { clockInfo, coverageVerdict } from "./metrics";

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

export const ProgramChip = ({ program }: { program: Referral["program"] }) => <Chip>{PROGRAM_LABEL[program]}</Chip>;

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

/** "2 issues" in ochre, terracotta when one is a hard fail, "All clear" in green. */
export function DocCheckPill({ r }: { r: Referral }) {
  const n = issueCount(r.checks);
  if (!n) return <Pill tone="good">All clear</Pill>;
  return <Pill tone={hasFail(r.checks) ? "risk" : "mid"}>{n === 1 ? "1 issue" : `${n} issues`}</Pill>;
}

export function CoverageCell({ r }: { r: Referral }) {
  const v = coverageVerdict(r);
  return (
    <div>
      <div className="whitespace-nowrap text-[13px] font-medium">{r.payerId ? payerById(r.payerId).shortName : "No payer listed"}</div>
      <Pill tone={v.tone} className="mt-1">
        {v.label}
      </Pill>
    </div>
  );
}

const TONE_TEXT = { ok: "text-ink", late: "text-mid", very: "text-risk", quiet: "text-ink" } as const;
export function ClockCell({ r, clock }: { r: Referral; clock: number }) {
  const c = clockInfo(r, clock);
  return (
    <div>
      <div>
        <b className={cn("font-semibold", TONE_TEXT[c.tone])}>{c.main}</b>
        {c.of ? <span className="text-muted"> {c.of}</span> : null}
      </div>
      {c.note ? <div className={cn("text-xs", c.tone === "late" ? "text-mid" : c.tone === "very" ? "text-risk" : "text-muted")}>{c.note}</div> : null}
    </div>
  );
}
