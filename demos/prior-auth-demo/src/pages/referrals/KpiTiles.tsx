import { Stat } from "@/components/ui";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/time";
import type { StatusView } from "@/store/referrals";

interface Props {
  counts: Record<StatusView, number>;
  intakeBooked: number;
  view: StatusView;
  onView: (v: StatusView) => void;
  medianMin: number | undefined;
  decided: number;
  conversion: number | undefined;
  admitted: number;
  received: number;
  late: number;
  lateOn: boolean;
  onLate: () => void;
}

function Metric({ label, value, note, cta, onClick, on }: { label: string; value: string; note: string; cta?: string; onClick?: () => void; on?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-pressed={onClick ? !!on : undefined} className={cn("rounded-2xl border border-tile-edge bg-tile px-5 py-3.5 text-left", onClick && "transition-colors hover:bg-[#F5EFE7]", on && "outline-2 outline-offset-[3px] outline-forest")}>
      <div className="flex items-center justify-between gap-2 text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">
        {label}
        {cta ? <span className="text-[12.5px] font-semibold tracking-normal text-forest normal-case underline underline-offset-[3px]">{cta}</span> : null}
      </div>
      <div className="mt-0.5 text-[26px] leading-tight font-semibold">{value}</div>
      <div className="text-[12.5px] text-muted">{note}</div>
    </Tag>
  );
}

/** Six status tiles that also filter the table, and three numbers the team is judged on. */
export function KpiTiles({ counts, intakeBooked, view, onView, medianMin, decided, conversion, admitted, received, late, lateOn, onLate }: Props) {
  const pick = (v: StatusView) => onView(view === v ? "all" : v);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-3.5 min-[1400px]:grid-cols-6">
        <Stat tone="neutral" value={counts.new} label="New" sub="not yet reviewed" selected={view === "new"} onClick={() => pick("new")} />
        <Stat tone="neutral" value={counts.in_review} label="In review" sub="a person is on it" selected={view === "in_review"} onClick={() => pick("in_review")} />
        <Stat tone="mid" value={counts.awaiting} label="Awaiting info" sub="waiting on the referrer" selected={view === "awaiting"} onClick={() => pick("awaiting")} />
        <Stat tone="good" value={counts.accepted} label="Accepted" sub={`${intakeBooked} with intake booked`} selected={view === "accepted"} onClick={() => pick("accepted")} />
        <Stat tone="good" value={counts.admitted} label="Admitted" sub="started treatment" selected={view === "admitted"} onClick={() => pick("admitted")} />
        <Stat tone="risk" value={counts.declined} label="Declined" sub="reason logged" selected={view === "declined"} onClick={() => pick("declined")} />
      </div>
      <div className="grid grid-cols-3 gap-3.5">
        <Metric label="Median time to decision" value={medianMin === undefined ? "None yet" : duration(medianMin)} note={`across ${decided} decided ${decided === 1 ? "referral" : "referrals"}`} />
        <Metric label="Received to admitted" value={conversion === undefined ? "None yet" : `${Math.round(conversion)}%`} note={`${admitted} of ${received} ${received === 1 ? "referral" : "referrals"} became admissions`} />
        <Metric label="Past response target" value={String(late)} note="Targets: emergent 1 h, urgent 4 h, routine 24 h" cta={lateOn ? "Show all" : late ? "Show them" : undefined} onClick={onLate} on={lateOn} />
      </div>
    </div>
  );
}
