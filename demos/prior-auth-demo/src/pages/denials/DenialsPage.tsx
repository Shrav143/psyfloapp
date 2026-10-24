import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ScanText, SearchX } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Button, Card, EmptyState, InfoTip, Page } from "@/components/ui";
import { SiteTag } from "@/components/layout/SiteTag";
import { siteOfDenial } from "@/data/denials";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { DenialFigures, PayerChips } from "./DenialFilters";
import { DenialsTable } from "./DenialsTable";
import { LetterPanel } from "./LetterPanel";
import { FIGURES, countFor, inFigure, isFigure, rowOf, sortRows, type FigureId, type SortKey } from "./lib/dashboard";
import { filterDenials, isFiltering, type DenialFilter } from "./lib/filters";
import { SCOPE_NOTE, isClosed } from "./lib/format";
import { useLetter } from "./lib/useLetter";

const SORT_KEYS: SortKey[] = ["id", "patient", "payer", "program", "denied", "chance", "next", "deadline", "owner"];
/** "deadline" is soonest first; "-chance" is highest first. */
function parseSort(v: string | null): { key: SortKey; dir: 1 | -1 } | null {
  if (!v) return null;
  const key = v.replace(/^-/, "") as SortKey;
  return SORT_KEYS.includes(key) ? { key, dir: v.startsWith("-") ? -1 : 1 } : null;
}

/**
 * Denial Intelligence: the dashboard of every authorization denial at the sites in view. The figures filter the table (and Closed switches it to settled denials),
 * the payer chips and ?reason= narrow it (Analytics rows link here with ?payer= and ?reason=), a row opens the denial's own page. Everything lives in the address,
 * so Back from a denial returns to the same view. An old link with ?id= goes to that denial's page.
 */
export default function DenialsPage() {
  const [params, setParams] = useSearchParams();
  const scope = useScope();
  const requests = useStore((s) => s.requests);
  const clock = useStore((s) => s.clock);
  const meta = useStore((s) => s.denialMeta);
  const work = useStore((s) => s.denialWork);
  const [letterOpen, setLetterOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const from = useRef<HTMLElement | null>(null);

  const view: FigureId = isFigure(params.get("view")) ? (params.get("view") as FigureId) : "open";
  const filter = useMemo<DenialFilter>(() => ({ payer: params.get("payer"), reason: params.get("reason") }), [params]);
  const sortParam = parseSort(params.get("sort"));
  const sort = sortParam ?? { key: "deadline" as SortKey, dir: (view === "closed" ? -1 : 1) as 1 | -1 };

  // Every denial at the sites in view, open ones from the Dashboard's Appeal or call stage and settled ones, as table rows.
  const all = useMemo(
    () => requests.filter((r) => scope.sites.includes(siteOfDenial(meta[r.id], r.caseId)) && (r.stage === "appeal" || isClosed(work[r.id]))).map((r) => rowOf(r, meta[r.id], work[r.id], clock)),
    [requests, meta, work, clock, scope.sites],
  );
  const byPayer = useMemo(() => filterDenials(all.map((r) => r.req), meta, { payer: null, reason: filter.reason }).map((r) => r.id), [all, meta, filter.reason]);
  const narrowed = useMemo(() => {
    const keep = new Set(filterDenials(all.map((r) => r.req), meta, filter).map((r) => r.id));
    return all.filter((r) => keep.has(r.id));
  }, [all, meta, filter]);
  const shown = useMemo(() => sortRows(narrowed.filter((r) => inFigure(r, view)), sort.key, sort.dir, !sortParam), [narrowed, view, sort.key, sort.dir, sortParam]);
  const counts = useMemo(() => Object.fromEntries(FIGURES.map((v) => [v, countFor(all, v)])) as Record<FigureId, number>, [all]);
  const payerRows = useMemo(() => all.filter((r) => byPayer.includes(r.id) && inFigure(r, view)), [all, byPayer, view]);

  const change = (edit: (p: URLSearchParams) => void) => setParams((prev) => { const next = new URLSearchParams(prev); edit(next); return next; }, { replace: true });
  const setView = (v: FigureId) => change((p) => { if (v === "open") p.delete("view"); else p.set("view", v); p.delete("sort"); });
  const setPayer = (id: string | null) => change((p) => { if (id) p.set("payer", id); else p.delete("payer"); });
  const clearReason = () => change((p) => p.delete("reason"));
  const clearFilters = () => change((p) => { p.delete("payer"); p.delete("reason"); p.delete("view"); });
  const onSort = (key: SortKey) => change((p) => { const dir = sort.key === key ? -sort.dir : key === "chance" ? -1 : 1; p.set("sort", dir === -1 ? `-${key}` : key); });

  // A letter that has been analyzed is listed first in Open, with nothing hiding it, and stays highlighted.
  const letter = useLetter((id) => {
    setLetterOpen(false);
    setNewId(id);
    setParams(new URLSearchParams(), { replace: true });
  });
  useEffect(() => {
    if (!newId) return;
    document.querySelector<HTMLElement>(`[data-denial="${newId}"] a`)?.focus();
  }, [newId, shown]);
  const openLetter = (e: MouseEvent<HTMLElement>) => { from.current = e.currentTarget; setLetterOpen(true); };

  const legacy = params.get("id");
  if (legacy) return <Navigate to={paths.denials(legacy)} replace />;

  const none = view === "open" && counts.open === 0;
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-1.5 font-serif text-[24px] leading-[1.15] font-semibold tracking-tight">
          Denial Intelligence
          <InfoTip label="What is in Denial Intelligence"><span className="block font-sans">{SCOPE_NOTE}</span></InfoTip>
          <SiteTag className="ml-1.5" />
        </h1>
        <Button icon={ScanText} onClick={openLetter} aria-haspopup="dialog">Add a denial letter</Button>
      </div>

      <DenialFigures counts={counts} view={view} onPick={setView} />

      <Card>
        <PayerChips rows={payerRows} payer={filter.payer} reason={filter.reason} onPayer={setPayer} onClearReason={clearReason} />
        {shown.length ? (
          <DenialsTable rows={shown} closed={view === "closed"} sort={sort.key} dir={sort.dir} onSort={onSort} newId={newId} />
        ) : none ? (
          <EmptyState icon={SearchX} title="No open denials" action={<span className="flex flex-wrap items-center justify-center gap-4"><Button variant="primary" icon={ScanText} onClick={openLetter}>Add a denial letter</Button><Link to={paths.dashboard()} className="font-semibold text-forest hover:underline">Open the Dashboard</Link></span>} />
        ) : view === "closed" && !isFiltering(filter) ? (
          <EmptyState icon={SearchX} title="No closed denials yet" />
        ) : (
          <EmptyState icon={SearchX} title="No denials match these filters" action={<Button onClick={clearFilters}>Clear filters</Button>} />
        )}
      </Card>

      {letterOpen ? <LetterPanel letter={letter} from={from} onClose={() => setLetterOpen(false)} /> : null}
    </Page>
  );
}
