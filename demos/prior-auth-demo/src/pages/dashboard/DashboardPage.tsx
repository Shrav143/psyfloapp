import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button, Disclosure, Page, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dueByRequest } from "@/lib/floFacts";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { applyBaseFilters, applyFilters } from "@/store/selectors";
import { FilterBar } from "./FilterBar";
import { FloSummary } from "./FloSummary";
import { KeyFigures } from "./KeyFigures";
import { PayersTable } from "./PayersTable";
import { RequestDrawer } from "./RequestDrawer";
import { PAGE_SIZE, RequestsTable } from "./RequestsTable";
import { StageHelp } from "./StageHelp";
import { hasNarrowingFilter, pageHeadline, payerRows, slowestPayer } from "./helpers";
import { draftNeeds, draftsInPreparation } from "./preparing-drafts";
import { nextSort, sortRows, type RowSort } from "./sort-rows";
import { useFilterSync, useRequestParam } from "./useDashboardParams";
import { applyView, isStage, keyFigures, stageOptions, stageTotals, workListOrder, type FigureId, type StageMenuValue, type ViewKey } from "./workList";

/** One daily work list: the headline, a summary from FLO, four figures that are also shortcuts, the filters, the single request list, then payer performance folded away.
    Everything is derived from the shared requests, the queue, the clock and the filters. */
export default function DashboardPage() {
  useFilterSync();
  const requests = useStore((s) => s.requests);
  const drafts = useStore((s) => s.caseDrafts);
  const clock = useStore((s) => s.clock);
  const queueItems = useStore((s) => s.queueItems);
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
  /** Needs you, Due within 24 hours and Waiting on payers cannot be one stage, so they are held here and shown in the Stage menu. */
  const [view, setView] = useState<ViewKey | null>(null);
  /** Bumped when ?focus=payers asks for Payer performance: the section starts again, open. */
  const [openPayers, setOpenPayers] = useState(0);
  const payersRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  // A stage chosen anywhere else (the address, a link, the stage help) replaces a grouping.
  useEffect(() => {
    if (filters.stage !== "all") setView(null);
  }, [filters.stage]);

  const base = useMemo(() => applyBaseFilters(requests, filters), [requests, filters]);
  const more = useMemo(() => draftsInPreparation(drafts, requests, filters), [drafts, requests, filters]);
  const dues = useMemo(() => dueByRequest(requests, queueItems), [requests, queueItems]);
  const figures = useMemo(() => keyFigures(base, dues, clock, more), [base, dues, clock, more]);
  const rows = useMemo(() => sortRows(workListOrder(view ? applyView(base, view, dues, clock) : applyFilters(requests, filters), dues, clock), sort, clock), [requests, filters, base, view, dues, clock, sort]);
  const payers = useMemo(() => payerRows(requests, filters), [requests, filters]);
  const needDrafts = draftNeeds(more).needYou + draftNeeds(more).ready;
  const head = pageHeadline(filters, base, rows, more.length, view, needDrafts);
  const stage: StageMenuValue = view ?? filters.stage;
  const pressed: FigureId | null = view ?? (filters.stage === "appeal" ? "denials" : null);
  const totals = stageTotals(base, more.length);
  const slow = slowestPayer(payers);

  // Every filter or sort change starts again at the first page.
  const key = JSON.stringify([filters, sort, view]);
  const visible = paging.key === key ? paging.n : PAGE_SIZE;
  const current = requestId ? requests.find((r) => r.id === requestId) : undefined;

  // A link to a request that does not exist closes quietly. The delay lets a denial's new id arrive first.
  useEffect(() => {
    if (!requestId || current) return;
    const t = setTimeout(close, 200);
    return () => clearTimeout(t);
  }, [requestId, current, close]);

  // ?focus=payers (from Ask FLO) opens Payer performance, scrolls it into view and lights it up for a moment, then drops itself from the address.
  // The section opens first; two frames later its full height is there to scroll to, and the shell's scroll-to-top on a new page has run.
  const focus = params.get("focus");
  useEffect(() => {
    if (focus !== "payers") return;
    setOpenPayers((n) => n + 1);
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
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
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [focus, setParams]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const clearAll = () => {
    setView(null);
    clearFilters();
  };
  /** The Stage menu: a stage, one of the three groupings, or none. A grouping and a stage never apply together. */
  const pickStage = (v: StageMenuValue) => {
    if (isStage(v)) {
      setView(null);
      setFilter("stage", v);
      return;
    }
    setView(v);
    if (filters.stage !== "all") setFilter("stage", "all");
  };
  /** A figure applies its filter; the same figure again clears it. */
  const pickFigure = (id: FigureId) => {
    if (id === pressed) pickStage("all");
    else pickStage(id === "denials" ? "appeal" : id);
  };

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
      <FloSummary />
      <KeyFigures figures={figures} pressed={pressed} onPick={pickFigure} />
      <FilterBar stage={stage} stageOptions={stageOptions(totals, figures)} onStage={pickStage} canClear={hasNarrowingFilter(filters) || view !== null} onClear={clearAll} />
      <RequestsTable
        rows={rows}
        total={rows.length}
        visible={visible}
        clock={clock}
        onOpen={open}
        onMore={() => setPaging({ key, n: visible + PAGE_SIZE })}
        onClear={clearAll}
        canClear={hasNarrowingFilter(filters) || view !== null}
        sort={sort}
        onSort={(k) => setSort((cur) => nextSort(cur, k))}
        writeBackOn={writeBackOn}
        more={view === "needs_you" ? needDrafts : view ? 0 : filters.stage === "all" || filters.stage === "preparing" ? more.length : 0}
        moreWhat={view === "needs_you" ? "waiting on you" : "being prepared"}
        help={<StageHelp counts={totals} selected={stage} onPick={pickStage} />}
      />
      <div ref={payersRef} data-flash={flash || undefined} className={cn("scroll-mt-24 rounded-[20px] outline-2 outline-offset-[3px] transition-[outline-color] duration-700", flash ? "outline-forest" : "outline-transparent")}>
        <Disclosure key={openPayers} defaultOpen={openPayers > 0} title="Payer performance" summary={slow ? `${slow.name} is slowest: ${slow.avgDecisionDays} days on average against ${slow.typicalDecisionDays} typical.` : "Every payer is deciding within its typical time."}>
          <PayersTable rows={payers} selected={filters.payer} range={filters.range} narrowed={filters.program !== "all" || filters.type !== "all"} onPick={(id) => setFilter("payer", id)} />
        </Disclosure>
      </div>
      {current ? <RequestDrawer request={current} onClose={close} onSwitch={swap} /> : null}
    </Page>
  );
}
