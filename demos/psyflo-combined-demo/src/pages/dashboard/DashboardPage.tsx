import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, CircleAlert, CircleCheck, Clock, Hourglass, RefreshCw, Scale, Send, X } from "lucide-react";
import { Button, Dropdown } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import type { FactsContext } from "@/lib/doNext";
import { dueByRequest } from "@/lib/floFacts";
import { plural } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { useLedgerRows } from "@/pages/manager/ledgerRows";
import { useStore } from "@/store";
import { applyBaseFilters } from "@/store/selectors";
import { buildRows } from "./caseRows";
import { DashTable, PAGE_SIZE } from "./DashTable";
import { PROGRAM_OPTIONS, TYPE_OPTIONS, hasNarrowingFilter, payerOptions } from "./helpers";
import { ledgerChips } from "./lifecycle";
import { DUE, TIER_ORDER, UPDATED, byUrgency, inDates, tierOf, type DueRange, type Tier, type UpdatedRange } from "./model";
import { RequestDrawer } from "./RequestDrawer";
import { Tiles, type TileSpec } from "./Tiles";
import { useFilterSync, useRequestParam } from "./useDashboardParams";

type Pick = Tier | "payer" | "denied" | null;

/** The dashboard: a summary you read at a glance, then one table. Menus on top (two for dates, then payer, program and request type), six icons with a number each,
    and the table grouped by colour, so what needs you now is the first thing in it. Words are kept to a minimum; every icon has a tooltip. */
export default function DashboardPage() {
  useFilterSync();
  const scope = useScope();
  const allRequests = useStore((s) => s.requests);
  const allQueue = useStore((s) => s.queueItems);
  const clock = useStore((s) => s.clock);
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  const navigatorPaused = useStore((s) => s.agentPaused.navigator);
  const ledgerRows = useLedgerRows();
  const { requestId, open, close, swap } = useRequestParam();
  const [checking, setChecking] = useState(false);
  const [updated, setUpdated] = useState<UpdatedRange>("all");
  const [due, setDue] = useState<DueRange>("any");
  const [pick, setPick] = useState<Pick>(null);
  const [paging, setPaging] = useState({ key: "", n: PAGE_SIZE });

  // Everything below reads only what the viewer may see: the requests, the queue and the ledger of the sites in view.
  const requests = useMemo(() => scope.filter(allRequests, (r) => r.caseId), [scope, allRequests]);
  const queueItems = useMemo(() => scope.filter(allQueue, (i) => i.id), [scope, allQueue]);
  const ledger = useMemo(() => scope.filter(ledgerRows, (c) => c.caseId), [scope, ledgerRows]);
  const dues = useMemo(() => dueByRequest(requests, queueItems), [requests, queueItems]);
  const ctx: FactsContext = useMemo(() => ({ clock, writeBackOn: false, ready: new Set<string>(), dues, ledger }), [clock, dues, ledger]);
  const rows = useMemo(() => buildRows(requests, ctx), [requests, ctx]);

  /** The menus narrow every count; the tiles narrow only the table. */
  const base = useMemo(() => {
    const keep = new Set(applyBaseFilters(requests, filters));
    return rows.filter((x) => keep.has(x.r) && inDates(x, clock, updated, due) && (filters.stage === "all" || x.r.stage === filters.stage));
  }, [rows, requests, filters, clock, updated, due]);

  const tiers = useMemo(() => new Map(base.map((x) => [x.r.id, tierOf(x, clock)] as const)), [base, clock]);
  const count = (t: Tier) => base.filter((x) => tiers.get(x.r.id) === t).length;
  const withPayer = base.filter((x) => ["received", "under_review", "info_requested"].includes(x.r.stage)).length;
  const denied = base.filter((x) => x.r.stage === "appeal").length;
  const chips = useMemo(() => ledgerChips(ledger, requests, clock), [ledger, requests, clock]);

  const tiles: TileSpec[] = [
    { id: "attention", icon: CircleAlert, label: "Now", hint: "Needs a person now: a question waiting, a notice due within hours, a decision that is late.", count: count("attention"), tone: "risk", tier: "attention" },
    { id: "upcoming", icon: Clock, label: "Soon", hint: "Coming up: a deadline inside two days, a review or renewal due, a state that is taking longer than usual.", count: count("upcoming"), tone: "mid", tier: "upcoming" },
    { id: "payer", icon: Send, label: "With payer", hint: "Sent and waiting for the payer's decision or answer.", count: withPayer, tone: "neutral", tier: "payer" },
    { id: "denied", icon: Scale, label: "Denied", hint: "Denied: a call or an appeal is being worked.", count: denied, tone: "risk", tier: "denied" },
    { id: "active", icon: CircleCheck, label: "Active", hint: chips[0]?.note ? `Approved, units left. ${chips[0].note}.` : "Approved, units left.", count: chips[0]?.count ?? 0, tone: "good", to: chips[0]?.to },
    { id: "renewal", icon: Hourglass, label: "Expiring", hint: chips[1]?.note ? `Review due or ending within 7 days. ${chips[1].note}.` : "Review due or ending within 7 days.", count: chips[1]?.count ?? 0, tone: "mid", to: chips[1]?.to },
  ];

  const groups = useMemo(() => {
    const cmp = byUrgency(clock);
    const sel = (x: (typeof base)[number]) => (pick === null ? true : pick === "payer" ? ["received", "under_review", "info_requested"].includes(x.r.stage) : pick === "denied" ? x.r.stage === "appeal" : tiers.get(x.r.id) === pick);
    return TIER_ORDER.map((tier) => ({ tier, rows: base.filter((x) => tiers.get(x.r.id) === tier && sel(x)).sort(cmp) }));
  }, [base, tiers, pick, clock]);

  const narrowed = hasNarrowingFilter(filters) || updated !== "all" || due !== "any" || pick !== null;
  const key = JSON.stringify([filters, updated, due, pick]);
  const visible = paging.key === key ? paging.n : PAGE_SIZE;
  const current = requestId ? allRequests.find((r) => r.id === requestId) : undefined;

  // A link to a request that does not exist closes quietly. The delay lets a denial's new id arrive first.
  useEffect(() => {
    if (!requestId || current) return;
    const t = setTimeout(close, 200);
    return () => clearTimeout(t);
  }, [requestId, current, close]);

  const clearAll = () => { setUpdated("all"); setDue("any"); setPick(null); clearFilters(); };
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-serif text-[24px] font-semibold leading-[1.2] tracking-tight">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Filters" data-testid="dash-filters">
          <span className="grid h-9 w-9 place-items-center text-muted" title="Dates" aria-hidden="true"><CalendarDays size={18} className="ico" /></span>
          <Dropdown ariaLabel="Updated" value={updated} defaultValue="all" options={UPDATED.map((o) => ({ value: o.value, label: o.value === "all" ? "Updated: any date" : `Updated: ${o.label.toLowerCase()}` }))} onChange={setUpdated} menuWidth={220} />
          <Dropdown ariaLabel="Due" value={due} defaultValue="any" options={DUE.map((o) => ({ value: o.value, label: o.label }))} onChange={setDue} menuWidth={200} />
          <span className="mx-0.5 h-6 w-px bg-edge" aria-hidden="true" />
          <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={payerOptions()} onChange={(v) => setFilter("payer", v)} menuWidth={250} />
          <Dropdown ariaLabel="Program" value={filters.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => setFilter("program", v)} />
          <Dropdown ariaLabel="Request type" value={filters.type} defaultValue="all" options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} menuWidth={240} />
          {narrowed ? <Button variant="ghost" size="sm" icon={X} onClick={clearAll} aria-label="Clear filters" title="Clear filters" /> : null}
          <Button variant="ghost" size="sm" icon={RefreshCw} loading={checking} disabled={navigatorPaused} onClick={checkAll} aria-label="Check all now" title={navigatorPaused ? "Navigator is paused in Settings" : "Check every open request with its payer now"} />
        </div>
      </div>
      <Tiles tiles={tiles} active={pick} onPick={(id) => setPick((cur) => (cur === (id as Pick) ? null : (id as Pick)))} />
      <DashTable groups={groups} visible={visible} clock={clock} onOpen={open} onMore={() => setPaging({ key, n: visible + PAGE_SIZE })} onClear={clearAll} narrowed={narrowed} />
      {current ? <RequestDrawer request={current} onClose={close} onSwitch={swap} /> : null}
    </div>
  );
}
