import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import type { StageKey } from "@/data/types";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { doNext, type DoGo, type FactsContext } from "@/lib/doNext";
import { dueByRequest } from "@/lib/floFacts";
import { plural } from "@/lib/format";
import { draftNeeds, draftsInPreparation, readyToSignIds } from "@/lib/preparing";
import { useScope } from "@/lib/scope";
import { useLedgerRows } from "@/pages/manager/ledgerRows";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { applyBaseFilters, inStage } from "@/store/selectors";
import { buildRows, defaultOrder } from "./caseRows";
import { CasesTable, PAGE_SIZE } from "./CasesTable";
import { DoNext } from "./DoNext";
import { hasNarrowingFilter } from "./helpers";
import { Lifecycle } from "./Lifecycle";
import { headline, ledgerChips, stageTotals, stateChips, statusOptions } from "./lifecycle";
import { RequestDrawer } from "./RequestDrawer";
import { nextSort, sortRows, type RowSort } from "./sort-rows";
import { TableControls } from "./TableControls";
import { useFilterSync, useRequestParam } from "./useDashboardParams";

/** The cockpit: a title, the Lifecycle (five states that filter the table, two counts that open Case Manager), what to do next, and one table with a line per authorization.
    Everything is derived from the requests, the queue, the ledger, the clock, the filters and the site in view. */
export default function DashboardPage() {
  useFilterSync();
  const navigate = useNavigate();
  const scope = useScope();
  const allRequests = useStore((s) => s.requests);
  const allQueue = useStore((s) => s.queueItems);
  const drafts = useStore((s) => s.caseDrafts);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.filters);
  const navigatorPaused = useStore((s) => s.agentPaused.navigator);
  const writeBackOn = useStore(selectWriteBackOn);
  const clearFilters = useStore((s) => s.clearFilters);
  const ledgerRows = useLedgerRows();
  const { requestId, open, close, swap } = useRequestParam();
  const [checking, setChecking] = useState(false);
  const [sort, setSort] = useState<RowSort | null>(null);
  const [needsToday, setNeedsToday] = useState(false);
  const [paging, setPaging] = useState({ key: "", n: PAGE_SIZE });

  // Everything below reads only what the viewer may see: the requests, the queue and the ledger of the sites in view.
  const requests = useMemo(() => scope.filter(allRequests, (r) => r.caseId), [scope, allRequests]);
  const queueItems = useMemo(() => scope.filter(allQueue, (i) => i.id), [scope, allQueue]);
  const ledger = useMemo(() => scope.filter(ledgerRows, (c) => c.caseId), [scope, ledgerRows]);
  const ready = useMemo(() => readyToSignIds(drafts, requests), [drafts, requests]);
  const dues = useMemo(() => dueByRequest(requests, queueItems), [requests, queueItems]);
  const ctx: FactsContext = useMemo(() => ({ clock, writeBackOn, ready, dues, ledger }), [clock, writeBackOn, ready, dues, ledger]);
  const rows = useMemo(() => buildRows(requests, ctx), [requests, ctx]);

  /** Payer, Program and Request type narrow every count; the Status chip and menu, and the toggle, only narrow the table. */
  const base = useMemo(() => {
    const keep = new Set(applyBaseFilters(requests, filters));
    return rows.filter((x) => keep.has(x.r));
  }, [rows, requests, filters]);
  const saved = useMemo(() => draftsInPreparation(drafts, requests, filters, scope.sites), [drafts, requests, filters, scope.sites]);
  const savedCounts = useMemo(() => ({ total: saved.length, ready: draftNeeds(saved).ready }), [saved]);
  const savedAll = useMemo(() => draftNeeds(draftsInPreparation(drafts, requests, { payer: "all", program: "all", type: "all", stage: "all" }, scope.sites)), [drafts, requests, scope.sites]);

  const shown = useMemo(() => {
    const stage = filters.stage;
    const byStage = stage === "all" ? base : base.filter((x) => inStage(x.r, stage));
    const byToday = needsToday ? byStage.filter((x) => x.action.today) : byStage;
    return sort ? sortRows(byToday, sort) : defaultOrder(byToday);
  }, [base, filters.stage, needsToday, sort]);

  const chips = useMemo(() => stateChips(base, savedCounts, clock), [base, savedCounts, clock]);
  const ledgerChip = useMemo(() => ledgerChips(ledger, requests, clock), [ledger, requests, clock]);
  const todo = useMemo(
    () => doNext({ requests, queueItems, ledger, clock, writeBackOn, ready, savedNeedingYou: savedAll.needYou + savedAll.ready }),
    [requests, queueItems, ledger, clock, writeBackOn, ready, savedAll.needYou, savedAll.ready],
  );
  const todayAll = rows.filter((x) => x.action.today).length;
  const todayShown = todo.items.filter((i) => i.caseId !== "" && i.kind !== "renewal").length;

  const head = headline(requests, requests.filter((r) => r.needsYou).length + savedAll.needYou + savedAll.ready);
  const canClear = hasNarrowingFilter(filters) || needsToday;
  const key = JSON.stringify([filters, sort, needsToday]);
  const visible = paging.key === key ? paging.n : PAGE_SIZE;
  const current = requestId ? allRequests.find((r) => r.id === requestId) : undefined;

  // A link to a request that does not exist closes quietly. The delay lets a denial's new id arrive first.
  useEffect(() => {
    if (!requestId || current) return;
    const t = setTimeout(close, 200);
    return () => clearTimeout(t);
  }, [requestId, current, close]);

  const clearAll = () => {
    setNeedsToday(false);
    clearFilters();
  };
  /** A state chip applies its filter; the same chip again clears it. */
  const pickState = (stage: StageKey) => useStore.getState().setFilter("stage", filters.stage === stage ? "all" : stage);

  const go = (to: DoGo) => {
    switch (to.to) {
      case "draft":
        navigate(paths.newCase({ draft: useStore.getState().draftFromRequest(to.requestId) }));
        break;
      case "request":
        open(to.requestId);
        break;
      case "denial":
        navigate(paths.denials(to.id));
        break;
      case "renew":
        navigate(paths.newCase({ type: "reauth", patient: to.caseId }));
        break;
      case "saved":
        navigate(paths.manager("cases"));
        break;
    }
  };

  const showToday = () => {
    setNeedsToday(true);
    document.getElementById("authorizations-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const checkAll = () => {
    setChecking(true);
    setTimeout(() => {
      const s = useStore.getState();
      const openOnes = requests.map((r) => s.requests.find((x) => x.id === r.id) ?? r).filter((r) => r.stage === "received" || r.stage === "under_review");
      for (const r of openOnes) s.addEvent(r.id, { actor: "navigator", text: `Navigator checked: ${r.chip.toLowerCase()}` });
      s.toast({ title: `Navigator checked ${plural(openOnes.length, "open request")}`, body: "No new answers yet. It checks again in 30 minutes.", tone: "good" });
      setChecking(false);
    }, 1200);
  };

  // A link to a request at a site the viewer cannot see shows the out-of-site card, which names no patient.
  if (current && !scope.has(current.caseId)) return <OutOfSite id={current.id} what="case" />;

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[24px] font-semibold leading-[1.2] tracking-tight">{head.title}</h1>
          {head.sub ? <p className="mt-1 text-[13px] text-muted">{head.sub}</p> : null}
        </div>
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
      </div>
      <Lifecycle chips={chips} ledger={ledgerChip} active={filters.stage} onPick={pickState} />
      <DoNext items={todo.items} moreToday={Math.max(0, todayAll - todayShown)} onGo={go} onShowMore={showToday} />
      <CasesTable
        title={plural(shown.length, "authorization")}
        controls={<TableControls needsToday={needsToday} onNeedsToday={setNeedsToday} statusOptions={statusOptions(stageTotals(base.map((x) => x.r), savedCounts))} canClear={canClear} onClear={clearAll} />}
        rows={shown}
        visible={visible}
        clock={clock}
        onOpen={open}
        onMore={() => setPaging({ key, n: visible + PAGE_SIZE })}
        onClear={clearAll}
        narrowed={hasNarrowingFilter(filters)}
        needsToday={needsToday}
        sort={sort}
        onSort={(k) => setSort((cur) => nextSort(cur, k))}
        more={needsToday ? 0 : filters.stage === "all" || filters.stage === "preparing" ? saved.length : 0}
      />
      {current ? <RequestDrawer request={current} onClose={close} onSwitch={swap} /> : null}
    </div>
  );
}
