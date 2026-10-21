import { useEffect, useMemo } from "react";
import { SearchX, Plus, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { BANDS, openItems } from "@/data/queue";
import { money } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { BandCard } from "./BandCard";
import { QueueFilterBar } from "./QueueFilterBar";
import { QueueTiles, SignalBanner, numberWord } from "./QueueTop";
import { byBand, chanceOf, filterItems, filtersActive, liftOf, statsOf } from "./queueLogic";

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

export default function QueuePage() {
  const navigate = useNavigate();
  const items = useStore((s) => s.queueItems);
  const requests = useStore((s) => s.requests);
  const cases = useStore((s) => s.queueCases);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.queueFilters);
  const signalHidden = useStore((s) => s.signalHidden);
  const bandView = useStore((s) => s.bandView);
  const setFilter = useStore((s) => s.setQueueFilter);
  const clearFilters = useStore((s) => s.clearQueueFilters);

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
  const shown = useMemo(() => filterItems(open, filters), [open, filters]);
  const grouped = useMemo(() => byBand(shown), [shown]);
  const all = useMemo(() => statsOf(open, cases, clock), [open, cases, clock]);
  const chances = useMemo(() => Object.fromEntries(shown.map((i) => [i.id, { chance: chanceOf(i, cases), lift: liftOf(i, cases), ready: !!cases[i.id]?.ready }])), [shown, cases]);
  const urgent = open.filter((i) => i.band === "now").length;
  const needsToday = open.filter((i) => i.band !== "week").length;
  const affected = open.filter((i) => i.signal).length;
  const filtered = filtersActive(filters);

  const title = filtered ? `${shown.length} of ${all.count} open requests match these filters.` : `${needsToday} of ${all.count} open requests need action today.`;
  const sub = filtered ? undefined : `${cap(numberWord(urgent))} ${urgent === 1 ? "is" : "are"} urgent. ${money(all.dollars)} rides on what is in flight, and the average approval chance is ${all.avg}%.`;

  return (
    <Page>
      <PageHeader title={title} sub={sub} actions={<Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New case</Button>} />
      {signalHidden || affected === 0 ? null : (
        <SignalBanner affected={affected} active={filters.signalOnly} onReview={() => setFilter("signalOnly", true)} onClear={() => setFilter("signalOnly", false)} onHide={useStore.getState().hideSignal} />
      )}
      <QueueTiles all={all} urgent={urgent} onUrgent={() => { clearFilters(); setFilter("urgency", "now"); }} onAll={clearFilters} />
      <QueueFilterBar filters={filters} set={setFilter} clear={clearFilters} affected={affected} />
      {open.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="Nothing needs you today" action={<Button onClick={() => navigate(paths.manager())}>Open Case Manager</Button>}>Every open request has been sent. Case Manager shows what is scheduled next.</EmptyState>
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No requests match these filters" action={<Button onClick={clearFilters}>Clear filters</Button>}>The filters hide all {all.count} open requests.</EmptyState>
        </Card>
      ) : (
        BANDS.filter((b) => grouped[b].length > 0).map((b) => (
          <BandCard
            key={b} band={b} items={grouped[b]} stats={statsOf(grouped[b], cases, clock)} collapsed={bandView[b].collapsed} showAll={bandView[b].showAll} clock={clock} chances={chances}
            onToggle={() => useStore.getState().toggleBand(b)} onShowAll={(on) => useStore.getState().showAllInBand(b, on)}
          />
        ))
      )}
    </Page>
  );
}
