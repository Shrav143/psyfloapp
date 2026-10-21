import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Checkbox, EmptyState, SearchInput, Table, Td, Th, Tr, UnderlineTabs, type TabItem } from "@/components/ui";
import type { Referral } from "@/data/referrals";
import { ago } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { StatusView } from "@/store/referrals";
import { ChannelTag, ClockCell, CoverageCell, DocCheckPill, OwnerAvatar, ProgramChip, StatusPill, UrgencyPill } from "./Chips";
import { DeclineModal } from "./modals/DeclineModal";

const PAGE_SIZE = 10;
type TabId = "review" | "awaiting" | "accepted" | "admitted" | "declined" | "all";

interface Props {
  rows: Referral[];
  counts: Record<StatusView, number>;
  view: StatusView;
  onView: (v: StatusView) => void;
  query: string;
  onQuery: (q: string) => void;
  onClear: () => void;
}

/** Silna-style tabs with counts, a bulk bar, the table and its pager. */
export function ReferralsTable({ rows, counts, view, onView, query, onQuery, onClear }: Props) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const assign = useStore((s) => s.assignReferrals);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [declining, setDeclining] = useState(false);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = useMemo(() => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), [rows, current]);
  const selected = picked.filter((id) => rows.some((r) => r.id === id));
  const allOnPage = slice.length > 0 && slice.every((r) => selected.includes(r.id));
  const tab: TabId = view === "new" || view === "in_review" ? "review" : view;
  const tabs: TabItem<TabId>[] = [
    { id: "review", label: "Needs review", badge: counts.review },
    { id: "awaiting", label: "Awaiting info", badge: counts.awaiting },
    { id: "accepted", label: "Accepted", badge: counts.accepted },
    { id: "admitted", label: "Admitted", badge: counts.admitted },
    { id: "declined", label: "Declined", badge: counts.declined },
    { id: "all", label: "All", badge: counts.all },
  ];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const switchView = (v: StatusView) => {
    setPage(1);
    setPicked([]);
    onView(v);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-4">
        <UnderlineTabs items={tabs} value={tab} onChange={switchView} className="min-w-0 flex-1 overflow-x-auto border-b-0 [&_button]:whitespace-nowrap" />
        <SearchInput value={query} onChange={(q) => { setPage(1); onQuery(q); }} placeholder="Search referral, patient or source" className="w-[250px]" />
      </div>
      <div className="mx-6 border-b border-[#EADFD2]" />

      {view === "new" || view === "in_review" ? (
        <div className="flex items-center gap-2 px-6 pt-3.5 text-[13px] text-muted">
          Showing only
          <button type="button" onClick={() => switchView("review")} className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F7F4] px-2.5 py-0.5 font-semibold text-ink">
            {view === "new" ? "New" : "In review"}
            <X size={13} className="ico" aria-label="Show all that need review" />
          </button>
        </div>
      ) : null}

      {selected.length ? (
        <div className="mx-6 mt-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-[#F3F7F4] px-4 py-2.5">
          <span className="text-sm font-semibold">{selected.length} selected</span>
          <Button size="sm" icon={UserPlus} onClick={() => { assign(selected, "jp"); setPicked([]); }}>Assign to me</Button>
          <Button size="sm" variant="danger" onClick={() => setDeclining(true)}>Decline selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear selection</Button>
        </div>
      ) : null}

      {rows.length ? (
        <>
          <Table className="mt-2 text-[13px] [&_td]:px-1.5 [&_th]:px-1.5 [&_th]:align-bottom [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-3 [&_th:last-child]:pr-3">
            <thead>
              <tr>
                <Th className="w-10 pr-0">
                  <Checkbox checked={allOnPage} onChange={(v) => setPicked((p) => (v ? [...new Set([...p, ...slice.map((r) => r.id)])] : p.filter((id) => !slice.some((r) => r.id === id))))} label={<span className="sr-only">Select all on this page</span>} />
                </Th>
                <Th className="whitespace-nowrap">Referral</Th>
                <Th title="Privacy mode: initials and age only">Patient</Th>
                <Th>Source</Th>
                <Th>Requested program</Th>
                <Th>Coverage</Th>
                <Th>Urgency</Th>
                <Th>Document check</Th>
                <Th>Status</Th>
                <Th>Clock</Th>
                <Th>Owner</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <Tr key={r.id} selected={selected.includes(r.id)} onClick={() => nav(paths.referral(r.id))}>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.includes(r.id)} onChange={() => toggle(r.id)} label={<span className="sr-only">Select {r.id}</span>} />
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {!r.opened && (r.status === "new" || r.status === "in_review") ? <span title="Not opened yet" className="h-2 w-2 rounded-full bg-forest" /> : null}
                      <div>
                        <div className="font-semibold underline decoration-1 underline-offset-[3px]">{r.id}</div>
                        <div className="text-xs text-muted">{ago(r.receivedAt, clock)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap font-medium">{r.patient.initials}, {r.patient.age}</Td>
                  <Td>
                    <div className="w-[138px] font-medium leading-snug">{r.source.name}</div>
                    <ChannelTag channel={r.channel} />
                  </Td>
                  <Td className="whitespace-nowrap"><ProgramChip program={r.program} /></Td>
                  <Td><CoverageCell r={r} /></Td>
                  <Td className="whitespace-nowrap"><UrgencyPill urgency={r.urgency} /></Td>
                  <Td className="whitespace-nowrap"><DocCheckPill r={r} /></Td>
                  <Td className="whitespace-nowrap"><StatusPill status={r.status} /></Td>
                  <Td className="whitespace-nowrap"><ClockCell r={r} clock={clock} /></Td>
                  <Td><OwnerAvatar owner={r.owner} /></Td>
                  <Td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => nav(paths.referral(r.id))} aria-label={`Open ${r.id}`}>Open</Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-3.5 text-[13px] text-muted">
            <span>Showing {(current - 1) * PAGE_SIZE + 1} to {Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}</span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)} icon={ChevronLeft} />
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === current ? "page" : undefined} onClick={() => setPage(n)} className={n === current ? "grid h-8 min-w-8 place-items-center rounded-[10px] bg-forest px-2 text-[13px] font-semibold text-white" : "grid h-8 min-w-8 place-items-center rounded-[10px] px-2 text-[13px] text-ink2 hover:bg-tile"}>
                  {n}
                </button>
              ))}
              <Button size="sm" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)} icon={ChevronRight} />
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={Inbox} title="No referrals match" action={<Button onClick={onClear}>Clear filters</Button>}>
          Nothing fits these filters{query ? ` and "${query}"` : ""}. Try another tab or clear the filters.
        </EmptyState>
      )}

      {declining ? <DeclineModal ids={selected} onClose={() => setDeclining(false)} onDone={() => setPicked([])} /> : null}
    </Card>
  );
}
