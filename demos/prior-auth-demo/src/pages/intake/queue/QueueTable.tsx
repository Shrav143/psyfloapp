import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { IdLink, Pill } from "@/components/ui";
import { staffOf } from "@/data/intake/seed";
import { METHOD_LABEL, TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { vaPlanOf } from "@/data/va/plans";
import { PERIOD_LABEL, periodOf } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import { ASSESSMENT_LABEL, ASSESSMENT_TONE, TRIAGE_TONE_Q, URGENCY_LABEL, URGENCY_TONE } from "./labels";
import { nextActionOf } from "./nextAction";

/* Plain cells in the kit's table style (the kit's Th and Td carry their own padding, and two padding utilities on one element would clash).
   When the card is narrower than the table (tablet widths), Patient and Next action stay in place and the columns between them scroll. */
const EDGE = "sticky z-[1] bg-white group-hover:bg-[#FAF9F6]";
const FIRST = `${EDGE} left-0 pl-5 @max-[1107px]:shadow-[10px_0_10px_-10px_rgba(21,27,36,0.3)]`;
const LAST = `${EDGE} right-0 pr-5 @max-[1107px]:shadow-[-10px_0_10px_-10px_rgba(21,27,36,0.3)]`;
const TH = "border-b border-line bg-white px-2.5 py-3 text-left align-bottom text-[11px] font-medium tracking-[0.09em] text-muted uppercase";
const TD = "border-b border-line px-2.5 py-3 align-top text-[13px] group-last:border-b-0";
const edge = (i: number) => (i === 0 ? FIRST : i === COLS.length - 1 ? LAST : "");
/* Fixed columns, so a long name wraps inside its own column instead of squeezing the next one. They add up to the card's width at 1440 px. */
const COLS: [string, number][] = [["Patient", 168], ["Referral source", 146], ["Requested service", 126], ["Payer", 126], ["Intake status", 170], ["Assessment status", 118], ["Assigned staff", 104], ["Next action", 150]];

/** Patient | Referral source | Requested service | Payer | Intake status | Assessment status | Assigned staff | Next action. */
export function QueueTable({ rows, now }: { rows: IntakeRecord[]; now: number }) {
  const nav = useNavigate();
  return (
    <div className="@container overflow-x-auto">
    <table className="w-full min-w-[1108px] table-fixed border-separate border-spacing-0 text-left">
      <colgroup>
        {COLS.map(([h, w]) => <col key={h} style={{ width: w }} />)}
      </colgroup>
      <thead>
        <tr>
          {COLS.map(([h], i) => (
            <th key={h} className={cn(TH, edge(i))}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const svc = serviceById(r.serviceId);
          const plan = r.payerId ? vaPlanOf(r.payerId) : undefined;
          const next = nextActionOf(r);
          const open = () => nav(paths.intakeRecord(r.id));
          return (
            <tr key={r.id} data-row={r.id} onClick={open} className="group cursor-pointer hover:bg-[#FAF9F6]">
              <td className={cn(TD, FIRST)}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* The click bubbles to the row, which opens the record (keyboard users reach it through this button). */}
                  <IdLink>{r.initials || "No name yet"}{r.age !== null ? `, ${r.age}` : ""}</IdLink>
                  {r.safety?.status === "open" ? <Pill tone="risk" dot>Safety alert</Pill> : null}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">{r.id} · {siteName(r.site)}</div>
                {r.priority || r.urgency !== "routine" ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.urgency !== "routine" ? <Pill tone={URGENCY_TONE[r.urgency]}>{URGENCY_LABEL[r.urgency]}</Pill> : null}
                    {r.priority ? <Pill tone="risk">Priority</Pill> : null}
                  </div>
                ) : null}
              </td>
              <td className={TD}>
                <div className="line-clamp-2" title={r.sourceOrg}>{r.sourceOrg}</div>
                <div className="mt-0.5 text-[12px] text-muted">{METHOD_LABEL[r.method]} · {shortDate(r.createdAt)}</div>
              </td>
              <td className={TD}>
                <div>{svc.short}{svc.code ? ` (${svc.code})` : ""}</div>
                <div className="mt-0.5 text-[12px] text-muted">{PERIOD_LABEL[periodOf(r.serviceId, r.serviceDate, now, !!r.legacy)]}</div>
              </td>
              <td className={TD}>{plan ? plan.name : <span className="text-mid-ink">Plan not confirmed</span>}</td>
              <td className={TD}><Pill tone={TRIAGE_TONE_Q[r.triage]}>{TRIAGE_LABEL[r.triage]}</Pill></td>
              <td className={TD}><Pill tone={ASSESSMENT_TONE[r.assessment.status]}>{ASSESSMENT_LABEL[r.assessment.status]}</Pill></td>
              <td className={TD}>{staffOf(r.assignedTo)?.name ?? "Unassigned"}</td>
              <td className={cn(TD, LAST)}>
                <button
                  type="button"
                  data-next={r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(paths.intakeRecord(r.id, next.section, next.panel));
                  }}
                  className={cn("inline-flex items-start gap-1 text-left font-semibold hover:underline", next.done ? "font-medium text-muted" : next.tone === "risk" ? "text-risk-ink" : "text-forest")}
                >
                  <span>{next.label}</span>
                  {next.done ? null : <ArrowRight size={14} className="ico mt-[3px]" />}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
