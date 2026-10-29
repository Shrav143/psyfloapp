import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Pill, Segmented, Table, Td, Th, Tr } from "@/components/ui";
import { DX_SHORT, KIND_LABEL, OUTCOME_SHORT, shortDateOfDay, type Decision, type Outcome } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { OUTCOME_FILTERS } from "./query";
import { fmt } from "./stats";

/* The cases behind a number, as a table: sort by any column, filter by outcome, page through. A row opens the case summary. */

export const OUTCOME_TONE: Record<Outcome, Tone> = { approved: "good", partial: "mid", denied: "risk" };

type SortKey = "date" | "id" | "patient" | "payer" | "dx" | "program" | "kind" | "site" | "outcome" | "reason" | "days";
const OUTCOME_RANK: Record<Outcome, number> = { denied: 0, partial: 1, approved: 2 };
const SORTERS: Record<SortKey, (a: Decision, b: Decision) => number> = {
  date: (a, b) => b.day - a.day,
  id: (a, b) => a.id.localeCompare(b.id),
  patient: (a, b) => a.initials.localeCompare(b.initials) || a.age - b.age,
  payer: (a, b) => a.payerId.localeCompare(b.payerId),
  dx: (a, b) => a.dx.localeCompare(b.dx),
  program: (a, b) => a.program.localeCompare(b.program),
  kind: (a, b) => a.kind.localeCompare(b.kind),
  site: (a, b) => a.site.localeCompare(b.site),
  outcome: (a, b) => OUTCOME_RANK[a.outcome] - OUTCOME_RANK[b.outcome],
  reason: (a, b) => (a.reason ?? "~").localeCompare(b.reason ?? "~"),
  days: (a, b) => a.hours - b.hours,
};

export function CaseTable({ rows, onOpen, showPayer = false, pageSize = 15, startSort = "date", startDesc = true, label }: { rows: readonly Decision[]; onOpen: (d: Decision) => void; showPayer?: boolean; pageSize?: number; startSort?: SortKey; startDesc?: boolean; label: string }) {
  const [outcome, setOutcome] = useState<Outcome | "all">("all");
  const [sort, setSort] = useState<SortKey>(startSort);
  const [desc, setDesc] = useState(startDesc);
  const [page, setPage] = useState(0);
  const counts = useMemo(() => ({ all: rows.length, approved: rows.filter((d) => d.outcome === "approved").length, partial: rows.filter((d) => d.outcome === "partial").length, denied: rows.filter((d) => d.outcome === "denied").length }), [rows]);
  const shown = useMemo(() => {
    const list = outcome === "all" ? [...rows] : rows.filter((d) => d.outcome === outcome);
    const cmp = SORTERS[sort];
    // "date" compares days ago in reverse, so descending means newest first
    list.sort((a, b) => (desc ? cmp(b, a) : cmp(a, b)) || a.id.localeCompare(b.id));
    return list;
  }, [rows, outcome, sort, desc]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * pageSize, at * pageSize + pageSize);
  /* A column can hold two things (a case and its patient), so each heading offers one sort button for each. */
  const groups: { label: string; keys: { key: SortKey; label: string }[]; right?: boolean }[] = [
    { label: "Case", keys: [{ key: "id", label: "Case" }, { key: "patient", label: "Patient" }] },
    ...(showPayer ? [{ label: "Payer", keys: [{ key: "payer" as const, label: "Payer" }] }] : []),
    { label: "Diagnosis group", keys: [{ key: "dx", label: "Diagnosis group" }, { key: "program", label: "Program" }, { key: "kind", label: "Request" }] },
    { label: "Site", keys: [{ key: "site", label: "Site" }] },
    { label: "Outcome", keys: [{ key: "outcome", label: "Outcome" }, { key: "reason", label: "Reason" }] },
    { label: "Days", keys: [{ key: "days", label: "Days" }, { key: "date", label: "Decided" }], right: true },
  ];
  const sortBy = (key: SortKey) => {
    if (sort === key) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(key === "date");
    }
    setPage(0);
  };
  const head = (g: (typeof groups)[number]) => {
    const active = g.keys.find((k) => k.key === sort);
    return (
      <Th key={g.label} aria-sort={active ? (desc ? "descending" : "ascending") : "none"} className={cn("px-2.5 py-2.5", g.right && "text-right")}>
        <span className={cn("inline-flex flex-wrap items-center gap-x-1.5", g.right && "justify-end")}>
          {g.keys.map((k, n) => (
            <span key={k.key} className="inline-flex items-center gap-1.5">
              {n > 0 ? <span aria-hidden="true" className="text-faint">·</span> : null}
              <button type="button" onClick={() => sortBy(k.key)} aria-label={`Sort by ${k.label.toLowerCase()}`} className={cn("inline-flex items-center gap-0.5 uppercase tracking-[0.08em]", sort === k.key && "text-ink")}>
                {k.label}
                {sort === k.key ? desc ? <ArrowDown size={11} className="ico" aria-hidden="true" /> : <ArrowUp size={11} className="ico" aria-hidden="true" /> : null}
              </button>
            </span>
          ))}
        </span>
      </Th>
    );
  };

  return (
    <div data-testid="case-table">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <Segmented
          items={OUTCOME_FILTERS.map((o) => ({ id: o.id, label: o.label }))}
          value={outcome}
          onChange={(v) => {
            setOutcome(v);
            setPage(0);
          }}
          className="max-w-full flex-wrap"
        />
        <span className="text-[12px] text-muted" data-testid="case-count">
          {outcome === "all" ? `${fmt(counts.all)} cases` : `${fmt(shown.length)} of ${fmt(counts.all)} cases`}
          {` · ${fmt(counts.approved)} approved, ${fmt(counts.partial)} in part, ${fmt(counts.denied)} denied`}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-line px-4 py-8 text-center text-sm text-muted">No cases match. Pick another outcome.</p>
      ) : (
        <div className="rounded-xl border border-line">
          <Table className="text-[13px]">
            <thead>
              <tr>{groups.map(head)}</tr>
            </thead>
            <tbody>
              {slice.map((d) => (
                <Tr key={d.id} onClick={() => onOpen(d)} data-case={d.id}>
                  <Td className="px-2.5 py-2.5 whitespace-nowrap" data-col="case">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(d);
                      }}
                      aria-label={`Open the summary of ${d.id}`}
                      className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest"
                    >
                      {d.id}
                    </button>
                    <div className="text-[12px] text-muted">
                      {d.initials}, {d.age}
                    </div>
                  </Td>
                  {showPayer ? (
                    <Td className="px-2.5 py-2.5 whitespace-nowrap" data-col="payer">
                      {payerById(d.payerId).shortName}
                    </Td>
                  ) : null}
                  <Td className="px-2.5 py-2.5" data-col="dx">
                    <div className="whitespace-nowrap">{DX_SHORT[d.dx]}</div>
                    <div className="text-[12px] whitespace-nowrap text-muted">
                      {PROGRAM_LABEL[d.program]} · {KIND_LABEL[d.kind]}
                    </div>
                  </Td>
                  <Td className="px-2.5 py-2.5 whitespace-nowrap" data-col="site">
                    Site {d.site}
                  </Td>
                  <Td className="px-2.5 py-2.5" data-col="outcome">
                    <Pill tone={OUTCOME_TONE[d.outcome]}>{OUTCOME_SHORT[d.outcome]}</Pill>
                    <div className="mt-0.5 max-w-[185px] truncate text-[12px] text-muted" title={d.reason}>
                      {d.reason ?? `${d.requested} ${d.unit}`}
                    </div>
                  </Td>
                  <Td className="px-2.5 py-2.5 text-right whitespace-nowrap" data-col="days">
                    <div className="tabular-nums">{(d.hours / 24).toFixed(1)}</div>
                    <div className="text-[12px] text-muted">{shortDateOfDay(d.day)}</div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-3 text-[12px] text-muted">
          <span>
            {at * pageSize + 1} to {Math.min(shown.length, at * pageSize + pageSize)} of {fmt(shown.length)}
          </span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label={`Previous page of ${label}`} disabled={at === 0} onClick={() => setPage(at - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-field bg-white hover:bg-tile disabled:opacity-40">
              <ChevronLeft size={16} className="ico" />
            </button>
            <span className="px-2 tabular-nums">
              Page {at + 1} of {pages}
            </span>
            <button type="button" aria-label={`Next page of ${label}`} disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-field bg-white hover:bg-tile disabled:opacity-40">
              <ChevronRight size={16} className="ico" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
