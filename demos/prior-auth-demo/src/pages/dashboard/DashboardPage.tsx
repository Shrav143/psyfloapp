import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { applyBaseFilters, applyFilters, sortForDashboard } from "@/store/selectors";
import { FilterBar } from "./FilterBar";
import { PayersTable } from "./PayersTable";
import { RequestDrawer } from "./RequestDrawer";
import { PAGE_SIZE, RequestsTable } from "./RequestsTable";
import { StageStrip } from "./StageStrip";
import { hasNarrowingFilter, pageHeadline, payerRows, stripCells } from "./helpers";
import { draftsInPreparation } from "./preparing-drafts";
import { nextSort, sortRows, type RowSort } from "./sort-rows";
import { useFilterSync, useRequestParam } from "./useDashboardParams";

/** One page; the filters decide what it shows. Everything is derived from the shared requests, clock and filters. */
export default function DashboardPage() {
  useFilterSync();
  const requests = useStore((s) => s.requests);
  const drafts = useStore((s) => s.caseDrafts);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.filters);
  const navigatorPaused = useStore((s) => s.agentPaused.navigator);
  const writeBackOn = useStore(selectWriteBackOn);
  const setFilter = useStore((s) => s.setFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  const { requestId, open, close, swap } = useRequestParam();
  const [params, setParams] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [sort, setSort] = useState<RowSort | null>(null);
  const [paging, setPaging] = useState({ key: "", n: PAGE_SIZE });
  const [flash, setFlash] = useState(false);
  const payersRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const base = useMemo(() => applyBaseFilters(requests, filters), [requests, filters]);
  const more = useMemo(() => draftsInPreparation(drafts, requests, filters), [drafts, requests, filters]);
  const rows = useMemo(() => sortRows(sortForDashboard(applyFilters(requests, filters), clock), sort, clock), [requests, filters, clock, sort]);
  const cells = useMemo(() => stripCells(base, clock, more), [base, clock, more]);
  const payers = useMemo(() => payerRows(requests, filters), [requests, filters]);
  const head = pageHeadline(filters, base, rows, more.length);

  // Every filter or sort change starts again at the first page.
  const key = JSON.stringify([filters, sort]);
  const visible = paging.key === key ? paging.n : PAGE_SIZE;
  const current = requestId ? requests.find((r) => r.id === requestId) : undefined;

  // A link to a request that does not exist closes quietly. The delay lets a denial's new id arrive first.
  useEffect(() => {
    if (!requestId || current) return;
    const t = setTimeout(close, 200);
    return () => clearTimeout(t);
  }, [requestId, current, close]);

  // ?focus=payers (from Ask FLO) scrolls Payers at a glance into view and lights it up for a moment, then drops itself from the address.
  // The frame wait lets the shell's scroll-to-top on a new page run first.
  const focus = params.get("focus");
  useEffect(() => {
    if (focus !== "payers") return;
    const frame = requestAnimationFrame(() => {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      payersRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      setFlash(true);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(false), 2400);
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("focus");
          return n;
        },
        { replace: true },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, setParams]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const checkAll = () => {
    setChecking(true);
    setTimeout(() => {
      const s = useStore.getState();
      const openOnes = s.requests.filter((r) => r.stage === "received" || r.stage === "under_review");
      for (const r of openOnes) s.addEvent(r.id, { actor: "navigator", text: `Navigator checked: ${r.chip.toLowerCase()}` });
      s.toast({ title: `Navigator checked ${plural(openOnes.length, "open request")}`, body: "No new answers yet. It checks again in 30 minutes.", tone: "good" });
      setChecking(false);
    }, 1200);
  };

  return (
    <Page>
      <PageHeader
        title={head.title}
        sub={head.sub}
        actions={
          <div className="flex flex-col items-end gap-1.5">
            <Button icon={RefreshCw} loading={checking} disabled={navigatorPaused} onClick={checkAll}>
              Check all now
            </Button>
            {navigatorPaused ? (
              <Link to={paths.settings()} className="text-[13px] text-muted underline underline-offset-[3px] hover:text-forest">
                Navigator is paused in Settings
              </Link>
            ) : null}
          </div>
        }
      />
      <FilterBar />
      <StageStrip cells={cells} selected={filters.stage} onPick={(s) => setFilter("stage", s)} />
      <RequestsTable
        rows={rows}
        total={rows.length}
        visible={visible}
        clock={clock}
        onOpen={open}
        onMore={() => setPaging({ key, n: visible + PAGE_SIZE })}
        onClear={clearFilters}
        canClear={hasNarrowingFilter(filters)}
        sort={sort}
        onSort={(k) => setSort((cur) => nextSort(cur, k))}
        writeBackOn={writeBackOn}
        more={filters.stage === "preparing" ? more.length : 0}
      />
      <div ref={payersRef} className="scroll-mt-24">
        <PayersTable rows={payers} selected={filters.payer} range={filters.range} narrowed={filters.program !== "all" || filters.type !== "all"} onPick={(id) => setFilter("payer", id)} flash={flash} />
      </div>
      {current ? <RequestDrawer request={current} onClose={close} onSwitch={swap} /> : null}
    </Page>
  );
}
