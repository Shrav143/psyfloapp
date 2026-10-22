import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Disclosure, Label, ListRow, Table, Td, Th, Tr } from "@/components/ui";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { NotEnough } from "./ChartCards";
import { NOT_ENOUGH } from "./copy";
import { fmt, type View } from "./model";

const hidden = (value: number | null): string => (value === null ? "-" : `${value}%`);

/** Under the denial table: how appeals ended and how many denials were accepted. Both move when Denial Intelligence records a ruling or an accepted denial. */
function DenialOutcomes({ v }: { v: View }) {
  const { appeals, accepted, period } = v;
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-line px-6 py-4 sm:grid-cols-2 sm:gap-6">
      <div>
        <Label>Appeals overturned</Label>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <b className="text-xl">{hidden(appeals.value)}</b>
          <span className="text-[13px] text-muted">{appeals.value === null ? NOT_ENOUGH : `${fmt(appeals.overturned)} of ${fmt(appeals.n)} rulings ${period.phrase}`}</span>
        </div>
      </div>
      <div>
        <Label>Denials accepted</Label>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <b className="text-xl" data-testid="accepted-count">{fmt(accepted.n)}</b>
          <span className="text-[13px] text-muted">
            {accepted.n === 1 ? "denial" : "denials"} {period.phrase}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReasonsTable({ v }: { v: View }) {
  const navigate = useNavigate();
  if (!v.reasons) return <NotEnough />;
  const open = (payerId: string, reason: string) => navigate(paths.denials(undefined, { payer: payerId, reason }));
  return (
    <Table>
      <thead>
        <tr>
          <Th>Reason</Th>
          <Th>Payer</Th>
          <Th>Count</Th>
          <Th>Share of denials</Th>
        </tr>
      </thead>
      <tbody>
        {v.reasons.rows.map((r) => (
          <Tr key={`${r.payerId}-${r.reason}`} onClick={() => open(r.payerId, r.reason)} data-reason={r.reason}>
            <Td>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open(r.payerId, r.reason);
                }}
                className="text-left hover:underline"
              >
                {r.reason}
              </button>
            </Td>
            <Td className="text-muted">{r.payer}</Td>
            <Td>{r.count}</Td>
            <Td>
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[#F0ECE4]">
                  <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.share * 3)}%`, background: "#B5553A" }} />
                </div>
                <b className="text-risk-ink">{r.share}%</b>
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

/** One of the four facts that used to head the page. */
function Figure({ value, label, note }: { value: string; label: string; note: ReactNode }) {
  return (
    <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
      <Label>{label}</Label>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{note}</div>
    </div>
  );
}

function AdviceAndDrafts({ v }: { v: View }) {
  const phrase = v.period.phrase;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-2">
        <Figure value={hidden(v.approved.value)} label="Approved as asked" note={v.approved.value === null ? NOT_ENOUGH : `${fmt(v.approved.n)} decisions ${phrase}`} />
        <Figure value={hidden(v.topCause.value)} label="Top denial cause" note={v.topCause.value === null ? NOT_ENOUGH : `${v.topCause.label} · ${fmt(v.topCause.n)} denials ${phrase}`} />
        <Figure value={hidden(v.advice.value)} label="Advice taken works" note={v.advice.value === null ? NOT_ENOUGH : `Approved when applied · ${fmt(v.advice.n)} requests ${phrase}`} />
        <Figure value={hidden(v.noEdits.value)} label="Sent without edits" note={v.noEdits.value === null ? NOT_ENOUGH : `As written, or a typo fixed · ${fmt(v.noEdits.n)} drafts ${phrase}`} />
      </div>
      {v.dismissed ? (
        <div className="border-t border-line">
          <div className="px-6 pt-4 pb-1">
            <Label>Why recommendations were dismissed</Label>
            <p className="mt-1 text-[13px] text-muted">The reason given each time someone dismissed a recommendation, {phrase}.</p>
          </div>
          {v.dismissed.map((d) => (
            <ListRow key={d.reason}>
              <div className="min-w-0 flex-1 font-semibold">{d.reason}</div>
              <b>{d.count === 1 ? "1 time" : `${d.count} times`}</b>
            </ListRow>
          ))}
        </div>
      ) : null}
    </>
  );
}

function WhatHelps({ v }: { v: View }) {
  if (!v.helps) return <NotEnough />;
  return (
    <>
      {v.helps.map((h, i) => (
        <ListRow key={h.label}>
          <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold" aria-label={`Rank ${i + 1}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{h.label}</div>
            <div className="text-xs text-muted">Applied {fmt(h.applied)} times</div>
          </div>
          <b className="text-good">{h.approved}% approved</b>
        </ListRow>
      ))}
    </>
  );
}

/** Everything behind the figures and charts, folded away. Each section opens in place and says in one line what is inside. */
export function Breakdowns({ v }: { v: View }) {
  const phrase = v.period.phrase;
  const top = v.reasons?.rows[0];
  const helps = v.helps?.[0];
  return (
    <section aria-labelledby="breakdowns-title" className="flex flex-col gap-3">
      <div className="px-1">
        <h2 id="breakdowns-title" className="font-serif text-[21px] font-semibold leading-tight tracking-tight">
          Detailed breakdowns
        </h2>
        <p className="mt-0.5 text-[13.5px] text-muted">The tables and rankings behind the figures above. Each one opens in place.</p>
      </div>
      <Disclosure
        title="Common denial reasons by payer"
        summary={top && v.reasons ? `${fmt(v.reasons.total)} denials ${phrase}. Most common: ${top.reason} at ${top.payer}, ${top.share}%.` : `${NOT_ENOUGH}.`}
      >
        <>
          <p className="px-6 pt-4 text-[13.5px] text-muted">{v.reasons ? `${v.period.label}${v.program === "all" ? "" : ` · ${v.programLabel}`}. ${v.payer === "all" ? "Each payer's most common reason." : "Every reason this payer gave."} Select a row to open those denials in Denial Intelligence.` : v.period.label}</p>
          <ReasonsTable v={v} />
          <DenialOutcomes v={v} />
        </>
      </Disclosure>
      <Disclosure
        title="How FLO's advice and drafts perform"
        summary={`${v.advice.value === null ? `${NOT_ENOUGH}.` : `Advice taken works ${v.advice.value}% of the time. ${v.noEdits.value === null ? "" : `${v.noEdits.value}% of drafts were sent without edits.`}`}${v.dismissed ? ` ${plural(v.dismissed.reduce((n, d) => n + d.count, 0), "recommendation")} dismissed.` : ""}`.trim()}
      >
        <AdviceAndDrafts v={v} />
      </Disclosure>
      <Disclosure
        title="What helps most"
        summary={helps ? `Most applied: ${helps.label}, ${helps.approved}% approved.` : `${NOT_ENOUGH}.`}
      >
        <WhatHelps v={v} />
      </Disclosure>
    </section>
  );
}
