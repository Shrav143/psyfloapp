import { CHART, DonutChart, Label, ListRow } from "@/components/ui";
import type { Board } from "./board";
import type { DismissedRow } from "./live";
import { NOT_ENOUGH } from "./copy";
import { fmt } from "./stats";

const hidden = (value: number | null): string => (value === null ? "-" : `${value}%`);

function Figure({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
      <Label>{label}</Label>
      <div className="mt-1 text-[24px] font-semibold">{value}</div>
      <div className="text-xs text-muted">{note}</div>
    </div>
  );
}

/** How FLO's advice and the agents' drafts perform: four facts, how people edit drafts, and why recommendations were dismissed. All counted from the same decisions as the rest of the page. */
export function FloSection({ board, dismissed }: { board: Board; dismissed: { reason: string; count: number }[] | null }) {
  const f = board.flo;
  const phrase = board.period.phrase;
  const top = board.topCause;
  const approvalRate = board.figures[0];
  const d = f.drafts;
  const parts = [
    { key: "written", label: "Sent as written", value: d.written, color: CHART.good, note: `approved ${hidden(d.approvedBy[0])} of the time` },
    { key: "light", label: "Light edits", value: d.light, color: CHART.mid, note: `approved ${hidden(d.approvedBy[1])} of the time` },
    { key: "rewritten", label: "Rewritten", value: d.rewritten, color: CHART.risk, note: `approved ${hidden(d.approvedBy[2])} of the time` },
  ];
  return (
    <>
      <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-2" data-testid="flo-facts">
        <Figure value={approvalRate.raw === null ? "-" : `${approvalRate.raw}%`} label="Approved as asked" note={approvalRate.raw === null ? NOT_ENOUGH : `${approvalRate.sub} ${phrase}`} />
        <Figure value={top ? `${top.share}%` : "-"} label="Top denial cause" note={top ? `${top.label} · ${fmt(top.count)} denials ${phrase}` : NOT_ENOUGH} />
        <Figure value={hidden(f.advice.pct)} label="Advice taken works" note={f.advice.pct === null ? NOT_ENOUGH : `Approved in full or in part when applied · ${fmt(f.advice.n)} requests ${phrase}`} />
        <Figure value={hidden(f.noEdits)} label="Sent without edits" note={f.noEdits === null ? NOT_ENOUGH : `As written, or a typo fixed · ${fmt(d.n)} drafts ${phrase}`} />
      </div>
      {d.n >= 20 ? (
        <div className="border-t border-line px-6 py-5" data-testid="edits">
          <Label>How people edit agent drafts</Label>
          <p className="mt-1 mb-3 text-[13px] text-muted">Share of {fmt(d.n)} drafts {phrase}.</p>
          <DonutChart
            ariaLabel="How people edit agent drafts"
            parts={parts}
            size={140}
            thickness={22}
            center={
              <>
                <span className="block text-[24px] leading-none font-semibold">{Math.round((100 * d.written) / d.n)}%</span>
                <span className="mt-1 block text-[11px] text-muted">as written</span>
              </>
            }
            summary={`Of ${d.n} drafts, ${d.written} were sent as written, ${d.light} had light edits and ${d.rewritten} were rewritten.`}
            table={{ caption: "How people edit agent drafts", head: ["Edit", "Drafts", "Share", "Approved in full or in part"], rows: parts.map((p) => [p.label, p.value, `${Math.round((100 * p.value) / d.n)}%`, p.note.replace("approved ", "").replace(" of the time", "")]) }}
          />
        </div>
      ) : null}
      {dismissed ? (
        <div className="border-t border-line">
          <div className="px-6 pt-4 pb-1">
            <Label>Why recommendations were dismissed</Label>
            <p className="mt-1 text-[13px] text-muted">The reason given each time someone dismissed a recommendation, {phrase}.</p>
          </div>
          {dismissed.map((x) => (
            <ListRow key={x.reason}>
              <div className="min-w-0 flex-1 font-semibold">{x.reason}</div>
              <b>{x.count === 1 ? "1 time" : `${x.count} times`}</b>
            </ListRow>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function WhatHelps({ board }: { board: Board }) {
  const rows = board.flo.helps.slice(0, 4);
  if (!rows.length) return <div className="px-6 py-10 text-center text-sm text-muted">{NOT_ENOUGH}. Figures based on fewer than 20 decisions stay hidden.</div>;
  return (
    <>
      {rows.map((h, i) => (
        <ListRow key={h.label}>
          <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold" aria-label={`Rank ${i + 1}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{h.label}</div>
            <div className="text-xs text-muted">Applied {fmt(h.applied)} times</div>
          </div>
          <b className="text-good">{h.pct}% approved</b>
        </ListRow>
      ))}
    </>
  );
}

/** Dismissed recommendations by reason, for the filters in force. */
export function dismissedBy(rows: DismissedRow[], f: { payer: string; program: string; dx: string }, recorded: boolean): { reason: string; count: number }[] | null {
  const mine = recorded ? rows.filter((r) => (f.payer === "all" || r.payerId === f.payer) && (f.program === "all" || r.program === f.program) && (f.dx === "all" || r.dx === f.dx)) : [];
  const counts = new Map<string, number>();
  for (const r of mine) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  return counts.size ? [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)) : null;
}
