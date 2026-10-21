import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";
import { useStore } from "@/store";
import { applyBaseFilters, applyFilters, sortForDashboard } from "@/store/selectors";
import { FilterBar } from "./FilterBar";
import { PayersTable } from "./PayersTable";
import { RequestDrawer } from "./RequestDrawer";
import { PAGE_SIZE, RequestsTable } from "./RequestsTable";
import { StageStrip } from "./StageStrip";
import { hasNarrowingFilter, pageHeadline, payerRows, stripCells, sumAtStake } from "./helpers";
import { useFilterSync, useRequestParam } from "./useDashboardParams";

/** One page; the filters decide what it shows. Everything is derived from the shared requests, clock and filters. */
export default function DashboardPage() {
  useFilterSync();
  const requests = useStore((s) => s.requests);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  const { requestId, open, close, swap } = useRequestParam();
  const [checking, setChecking] = useState(false);
  const [paging, setPaging] = useState({ key: "", n: PAGE_SIZE });

  const base = useMemo(() => applyBaseFilters(requests, filters), [requests, filters]);
  const rows = useMemo(() => sortForDashboard(applyFilters(requests, filters), clock), [requests, filters, clock]);
  const cells = useMemo(() => stripCells(base, clock), [base, clock]);
  const payers = useMemo(() => payerRows(requests, filters), [requests, filters]);
  const head = pageHeadline(filters, base, rows);

  // Every filter change starts again at the first page.
  const key = JSON.stringify(filters);
  const visible = paging.key === key ? paging.n : PAGE_SIZE;
  const current = requestId ? requests.find((r) => r.id === requestId) : undefined;

  // A link to a request that does not exist closes quietly. The delay lets a denial's new id arrive first.
  useEffect(() => {
    if (!requestId || current) return;
    const t = setTimeout(close, 200);
    return () => clearTimeout(t);
  }, [requestId, current, close]);

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
          <Button icon={RefreshCw} loading={checking} onClick={checkAll}>
            Check all now
          </Button>
        }
      />
      <FilterBar />
      <StageStrip cells={cells} selected={filters.stage} onPick={(s) => setFilter("stage", s)} />
      <RequestsTable
        rows={rows}
        total={rows.length}
        atStake={filters.stage === "appeal" ? sumAtStake(rows) : undefined}
        visible={visible}
        clock={clock}
        onOpen={open}
        onMore={() => setPaging({ key, n: visible + PAGE_SIZE })}
        onClear={clearFilters}
        canClear={hasNarrowingFilter(filters)}
      />
      <PayersTable rows={payers} selected={filters.payer} period={filters.period} narrowed={filters.program !== "all" || filters.type !== "all"} onPick={(id) => setFilter("payer", id)} />
      {current ? <RequestDrawer request={current} onClose={close} onSwitch={swap} /> : null}
    </Page>
  );
}
