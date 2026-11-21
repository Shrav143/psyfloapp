import { cn } from "@/lib/tailwind-utils";

export type Tone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "slate"
  | "cyan";

const TONE_CLASS: Record<Tone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

const DOT_CLASS: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
  cyan: "bg-cyan-500",
};

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "slate" },
  awaiting_signoff: { label: "Awaiting sign-off", tone: "violet" },
  submitted: { label: "Submitted", tone: "blue" },
  pending: { label: "Decision pending", tone: "blue" },
  info_requested: { label: "Info requested", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  partial: { label: "Partial", tone: "amber" },
  denied: { label: "Denied", tone: "red" },
  p2p: { label: "Peer-to-peer", tone: "amber" },
  appeal: { label: "Written appeal", tone: "red" },
  active: { label: "Active", tone: "green" },
  renewal_due: { label: "Renewal due", tone: "amber" },
  exhausted: { label: "Units exhausted", tone: "red" },
  expired: { label: "Window expired", tone: "red" },
  closed: { label: "Closed", tone: "slate" },
  covered: { label: "Covered", tone: "green" },
  intake_lag: { label: "Intake lag", tone: "slate" },
  awaiting_decision: { label: "Awaiting decision", tone: "blue" },
  units_exhausted: { label: "Units exhausted", tone: "red" },
  window_expired: { label: "Window expired", tone: "red" },
  denied_in_appeal: { label: "Denied · in appeal", tone: "red" },
  no_auth: { label: "No auth on file", tone: "red" },
  eligibility_lapsed: { label: "Coverage lapsed", tone: "red" },
  verified: { label: "Verified", tone: "green" },
  collect_upfront: { label: "Verified · collect", tone: "green" },
  action_required: { label: "Action required", tone: "amber" },
  inactive: { label: "Inactive", tone: "red" },
  carve_out: { label: "Carve-out", tone: "violet" },
  cob: { label: "COB conflict", tone: "amber" },
  medicare_first: { label: "Medicare-first", tone: "cyan" },
  plan_changed: { label: "Plan changed", tone: "amber" },
  new: { label: "New", tone: "blue" },
  p2p_scheduled: { label: "P2P scheduled", tone: "amber" },
  p2p_held: { label: "P2P held", tone: "amber" },
  appeal_drafting: { label: "Drafting", tone: "violet" },
  appeal_signoff: { label: "Awaiting sign-off", tone: "violet" },
  appeal_filed: { label: "Filed", tone: "blue" },
  receipt_unconfirmed: { label: "Receipt unconfirmed", tone: "amber" },
  under_review: { label: "Under review", tone: "blue" },
  won: { label: "Won", tone: "green" },
  lost: { label: "Lost", tone: "red" },
  accepted: { label: "Accepted", tone: "slate" },
  completed: { label: "Completed", tone: "green" },
  running: { label: "Running", tone: "blue" },
  needs_human: { label: "Needs a human", tone: "amber" },
  connected: { label: "Connected", tone: "green" },
  "credentials needed": { label: "Credentials needed", tone: "amber" },
  invalid: { label: "Denial looks invalid", tone: "green" },
  valid: { label: "Denial valid", tone: "red" },
  unclear: { label: "No reason given", tone: "amber" },
  preventable: { label: "Preventable", tone: "red" },
  recoverable: { label: "Recoverable", tone: "amber" },
  structural: { label: "Structural", tone: "slate" },
};

export function statusMeta(status: string): { label: string; tone: Tone } {
  return (
    STATUS_META[status] ?? { label: status.replaceAll("_", " "), tone: "slate" }
  );
}

export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-xs",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full", DOT_CLASS[meta.tone])} />
      ) : null}
      {meta.label}
    </span>
  );
}

export function Pill({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
