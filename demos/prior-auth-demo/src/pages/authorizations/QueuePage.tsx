import { useEffect, useMemo } from "react";
import { SearchX, Plus, CalendarCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { detailForQueueItem } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, liveView } from "@/data/caseModel";
import { BANDS, isWaitingOnYou, openItems, type Band, type StatusFilter } from "@/data/queue";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { BandCard } from "./BandCard";
import { nextActionOf } from "./nextAction";
import { QueueFilterBar } from "./QueueFilterBar";
import { QueueTiles, SignalBanner, numberWord } from "./QueueTop";
import type { RowInfo } from "./RequestTile";
import { byBand, chanceOf, filterItems, filtersActive, filtersFromParams, otherFiltersActive, paramsOf, phaseOf, sameFilters, statsOf } from "./queueLogic";

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

export default function QueuePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const items = useStore((s) => s.queueItems);
  const requests = useStore((s) => s.requests);
  const cases = useStore((s) => s.queueCases);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.queueFilters);
  const signalHidden = useStore((s) => s.signalHidden);
  const bandView = useStore((s) => s.bandView);
  const setFilter = useStore((s) => s.setQueueFilter);
  const clearFilters = useStore((s) => s.clearQueueFilters);

  /* The address carries the filters, so a link such as /authorizations?payer=cardinal&type=retro opens the queue already filtered.
     An address with no filters leaves the ones kept in the store (leaving the page and coming back keeps them) and then shows them in the address. */
  useEffect(() => {
    const wanted = filtersFromParams(params);
    if (wanted && !sameFilters(wanted, useStore.getState().queueFilters)) useStore.getState().setQueueFilters(wanted);
  }, [params]);
  useEffect(() => {
    // Read the store here, not the render's copy: on opening a link the effect above has just replaced the filters.
    const next = paramsOf(useStore.getState().queueFilters, params);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filters]);

  // "/" jumps to the search box, as on the other lists.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[aria-label="Search by case ID or initials"]')?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = useMemo(() => openItems(items, requests), [items, requests]);
  const shown = useMemo(() => filterItems(open, filters, cases), [open, filters, cases]);
  const grouped = useMemo(() => byBand(shown), [shown]);
  const all = useMemo(() => statsOf(open, cases, clock), [open, cases, clock]);
  const rows = useMemo(
    () =>
      Object.fromEntries(
        shown.map((i): [string, RowInfo] => {
          const work = cases[i.id] ?? EMPTY_WORK;
          const detail = withFocus(detailForQueueItem(i), work);
          const next = nextActionOf({ detail, work, live: liveView(detail, requests), canSend: canSend(detail, work) });
          return [i.id, { chance: chanceOf(i, cases), phase: phaseOf(i, cases), next: next.text }];
        }),
      ),
    [shown, cases, requests],
  );
  const urgent = open.filter((i) => i.band === "now").length;
  const needsToday = open.filter((i) => i.band !== "week").length;
  const waiting = open.filter(isWaitingOnYou).length;
  const affected = open.filter((i) => i.signal).length;
  const filtered = filtersActive(filters);

  // A figure that is already the filter clears it; otherwise it becomes the only filter.
  const byUrgency = (b: Band) => {
    const on = filters.urgency === b && !otherFiltersActive(filters);
    clearFilters();
    if (!on) setFilter("urgency", b);
  };
  const byStatus = (st: StatusFilter) => {
    const on = filters.status === st && filters.urgency === "all" && filters.payer === "all" && filters.type === "all" && !filters.q.trim() && !filters.signalOnly;
    clearFilters();
    if (!on) setFilter("status", st);
  };

  // With no one in Act now the band stays, saying so, so the page never looks as if the urgent requests were hidden.
  const showEmptyNow = urgent === 0 && (filters.urgency === "all" || filters.urgency === "now") && !otherFiltersActive(filters);
  const bands = BANDS.filter((b) => grouped[b].length > 0 || (b === "now" && showEmptyNow));
  const title = filtered ? `${shown.length} of ${plural(all.count, "open request")} ${shown.length === 1 ? "matches" : "match"} these filters.` : needsToday === 0 ? "Nothing needs action today." : `${needsToday} of ${plural(all.count, "open request")} ${needsToday === 1 ? "needs" : "need"} action today.`;
  const sub = filtered ? undefined : `${urgent === 0 ? "Nothing is urgent" : `${cap(numberWord(urgent))} ${urgent === 1 ? "is" : "are"} urgent`}, and the average approval chance is ${all.avg}%.`;

  return (
    <Page>
      <PageHeader title={title} sub={sub} actions={<Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New case</Button>} />
      {signalHidden || affected === 0 ? null : (
        <SignalBanner affected={affected} active={filters.signalOnly} onReview={() => setFilter("signalOnly", true)} onClear={() => setFilter("signalOnly", false)} onHide={useStore.getState().hideSignal} />
      )}
      <QueueTiles
        figures={{ urgent, day: statsOf(open.filter((i) => i.band === "day"), cases, clock), waiting, all }}
        urgency={filters.urgency} status={filters.status} onUrgency={byUrgency} onStatus={byStatus}
      />
      <QueueFilterBar filters={filters} set={setFilter} clear={clearFilters} affected={affected} />
      {open.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="Nothing needs you today" action={<Button onClick={() => navigate(paths.manager())}>Open Case Manager</Button>}>Every open request has been sent or handled. Case Manager shows what is scheduled next.</EmptyState>
        </Card>
      ) : bands.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No requests match these filters" action={<Button onClick={clearFilters}>Clear filters</Button>}>The filters hide all {plural(all.count, "open request")}.</EmptyState>
        </Card>
      ) : (
        bands.map((b) => (
          <BandCard
            key={b} band={b} items={grouped[b]} stats={statsOf(grouped[b], cases, clock)} collapsed={bandView[b].collapsed} showAll={bandView[b].showAll} clock={clock} rows={rows}
            onToggle={() => useStore.getState().toggleBand(b)} onShowAll={(on) => useStore.getState().showAllInBand(b, on)}
          />
        ))
      )}
    </Page>
  );
}
