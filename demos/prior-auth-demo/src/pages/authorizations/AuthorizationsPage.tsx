import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine, Plus, SearchX, Send, Wand2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, EmptyState, Page } from "@/components/ui";
import { SiteTag } from "@/components/layout/SiteTag";
import { ProgramScopeChip } from "@/components/programScope/ProgramScopeChip";
import { useProgramScope } from "@/components/programScope/useProgramScope";
import { caseTrack, inScope } from "@/lib/programFocus";
import { detailForQueueItem } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK } from "@/data/caseModel";
import { isClean } from "@/data/managerReviews";
import { isActiveAuth, isRenewalDue } from "@/lib/ledgerFacts";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseQuickView } from "@/pages/manager/CaseQuickView";
import { ReviewDrawer } from "@/pages/manager/ReviewDrawer";
import { SignDialog } from "@/pages/manager/SignDialog";
import { useDraftReviews } from "@/pages/manager/useDraftReviews";
import { SignalBanner } from "./QueueTop";
import { QuickView } from "./QuickView";
import { reviewPath } from "./reviewAndSign";
import { ViewChips } from "./worklist/ViewChips";
import { WorkFilterBar } from "./worklist/WorkFilterBar";
import { TableHelp, WorkTable } from "./worklist/WorkTable";
import { NO_WORK_FILTERS, VIEWS, fits, fitsDeadline, inView, sortRows, type Deadline, type Go, type SortKey, type View, type WorkFilters, type WorkRow } from "./worklist/model";
import { readParams, writeParams } from "./worklist/params";
import { useWorkRows } from "./worklist/useWorkRows";

/** The last address of the worklist, so leaving it and coming back by the sidebar keeps the view and the filters. */
let lastSearch = "";

/**
 * Authorizations: the one workspace for every authorization, from preparation to the payer's decision and the approved authorization's reviews.
 * The views (All, Needs attention, In progress, With the payer, Approved, Denied, Reviews this week) and the filters narrow one table. Each row keeps
 * the action its own record already had: answer, review and sign, open the review, start the reauthorization, open the denial. The quick views, the
 * review drawer and the case pages are the ones the queue and Case Manager used.
 */
export default function AuthorizationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rows = useWorkRows();
  const clock = useStore((s) => s.clock);
  const cases = useStore((s) => s.queueCases);
  const signalHidden = useStore((s) => s.signalHidden);
  const reviewsAll = useStore((s) => s.reviews);
  const sentToday = useStore((s) => s.caseSentToday);
  const paused = useStore((s) => s.agentPaused.cadence);
  const { drafting, draft: draftAll } = useDraftReviews();

  // Coming back with a plain address restores the last view and filters.
  useEffect(() => {
    if (!params.toString() && lastSearch) setParams(new URLSearchParams(lastSearch), { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { view, filters } = useMemo(() => readParams(params), [params]);
  // An older address (the queue's ?status=, Case Manager's ?tab=) is rewritten once in today's words, so the address and the view agree.
  useEffect(() => {
    if (params.has("status") || params.has("tab")) setParams((p) => writeParams(view, filters, p), { replace: true });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const clean = new URLSearchParams(params);
    clean.delete("quick");
    clean.delete("review");
    lastSearch = clean.toString();
  }, [params]);

  /* The top bar's Program menu presets the service, shown as a removable chip. The Service filter, once a person sets it, wins. */
  const focus = useProgramScope(filters.program !== "all", rows.map((r) => r.program));
  const queueAll = useStore((s) => s.queueItems);
  const inFocus = (r: WorkRow) => !focus.active || inScope(focus.active, r.program, caseTrack(r.src.item?.id ?? r.caseId, queueAll, r.src.draft?.diagnoses.map((d) => d.code)));

  const update = (v: View, f: WorkFilters) => setParams((p) => writeParams(v, f, p), { replace: true });
  const set = <K extends keyof WorkFilters>(k: K, val: WorkFilters[K]) => update(view, { ...filters, [k]: val });
  // Clear filters also lifts the Program menu's preset, so an empty list always has a way out.
  const clear = () => setParams((p) => focus.lift(writeParams(view, NO_WORK_FILTERS, p)), { replace: true });
  const clearAll = () => setParams((p) => focus.lift(writeParams("all", NO_WORK_FILTERS, p)), { replace: true });
  const pick = (v: View) => update(v === view ? "all" : v, filters);

  const [sort, setSort] = useState<{ key: SortKey | null; dir: 1 | -1 }>({ key: null, dir: 1 });
  const [paging, setPaging] = useState({ key: "", page: 0 });
  const onSort = (k: SortKey) => setSort((s) => (s.key !== k ? { key: k, dir: k === "chance" ? -1 : 1 } : s.dir === 1 ? { key: k, dir: -1 } : { key: null, dir: 1 }));

  // "/" jumps to the search box, as on the other lists.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[placeholder^="Search by patient"]')?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Counting: the filters narrow every count; the view narrows only the table. A Dashboard Active or Renewal due link reads the ledger record with the same tests the Dashboard counts with. */
  const matchesShow = (r: WorkRow) => !!r.src.ledger && (filters.show === "active" ? isActiveAuth(r.src.ledger, clock) : isRenewalDue(r.src.ledger, clock));
  const filtered = useMemo(() => rows.filter((r) => fits(r, filters, matchesShow) && inFocus(r)), [rows, filters, clock, focus.active, queueAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v, filtered.filter((r) => inView(r, v)).length])) as Record<View, number>, [filtered]);
  const shown = useMemo(() => sortRows(filtered.filter((r) => inView(r, view)), sort.key, sort.dir, view), [filtered, view, sort]);
  const open = filtered.filter((r) => r.life === "progress" || r.life === "payer");
  const withChance = open.filter((r) => r.chance !== null);
  const avgChance = withChance.length ? Math.round(withChance.reduce((a, r) => a + (r.chance ?? 0), 0) / withChance.length) : null;
  const noDeadline = useMemo(() => rows.filter((r) => fits(r, { ...filters, deadline: "all" }, matchesShow) && inFocus(r)), [rows, filters, clock, focus.active, queueAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const deadlineCounts = Object.fromEntries((["all", "now", "day", "week"] as Deadline[]).map((d) => [d, noDeadline.filter((r) => inView(r, view) && fitsDeadline(r, d)).length])) as Record<Deadline, number>;
  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner).filter((o): o is NonNullable<typeof o> => !!o))], [rows]);
  const signalCount = rows.filter((r) => r.signal).length;
  const pageKey = JSON.stringify([view, filters, sort, focus.active?.id]);
  const page = paging.key === pageKey ? paging.page : 0;

  /* The quick view (?quick=ID) and the review drawer (?review=ID) live in the address, so a link can open them. */
  const quickId = params.get("quick");
  const quickRow = quickId ? rows.find((r) => r.id === quickId || r.ids.includes(quickId)) : undefined;
  const quickFrom = useRef<HTMLElement | null>(null);
  const setParam = (k: string, v: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    }, { replace: true });
  useEffect(() => {
    if (quickId && !(quickRow?.src.item || quickRow?.src.ledger)) setParam("quick", null);
  }, [quickId, quickRow]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewId = params.get("review");
  const review = reviewId ? reviewsAll.find((r) => r.id === reviewId && rows.some((x) => x.caseId === r.caseId || x.ids.includes(r.ledgerId))) : undefined;
  const [signAll, setSignAll] = useState(false);
  /* Like Draft all due reviews, Sign all clean drafts covers every clean draft due this week at the sites in view, whatever the filters show,
     so the count in its dialog is the number it signs. */
  const clean = rows.filter((r) => inView(r, "reviews")).map((r) => r.review!).filter(isClean);

  const act = (r: WorkRow, go: Go) => {
    switch (go.to) {
      case "case":
        navigate(`${paths.case(go.id, go.tab)}${go.rec ? `${go.tab ? "&" : "?"}rec=${encodeURIComponent(go.rec)}` : ""}`);
        break;
      case "reviewAndSign": {
        const item = r.src.item;
        if (item) navigate(reviewPath(withFocus(detailForQueueItem(item), cases[item.id] ?? EMPTY_WORK)));
        break;
      }
      case "draft":
        navigate(paths.newCase({ draft: go.draftId }));
        break;
      case "draftFromRequest":
        navigate(paths.newCase({ draft: useStore.getState().draftFromRequest(go.requestId) }));
        break;
      case "review":
        setParam("review", go.reviewId);
        break;
      case "denial":
        navigate(paths.denials(go.id));
        break;
      case "renew":
        navigate(paths.newCase({ type: "reauth", patient: go.caseId }));
        break;
      case "dashboard":
        navigate(paths.dashboard({ request: go.requestId }));
        break;
    }
  };

  const reviewButtons = view === "reviews" ? (
    <>
      <Button icon={Wand2} loading={drafting} onClick={draftAll} title={paused ? "Cadence is paused in Settings" : undefined}>Draft all due reviews</Button>
      <Button icon={PenLine} disabled={!clean.length} onClick={() => setSignAll(true)}>Sign all clean drafts</Button>
    </>
  ) : null;

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-serif text-[24px] font-semibold leading-tight tracking-tight">Authorizations<SiteTag /></h1>
        <div className="flex flex-wrap items-center gap-3">
          {reviewButtons}
          {view === "payer" && sentToday.length ? <Button variant="ghost" icon={Send} onClick={() => navigate(paths.dashboard({ stage: "received" }))}>{sentToday.length} sent today</Button> : null}
          <Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New Authorization</Button>
        </div>
      </div>
      {signalHidden || signalCount === 0 ? null : (
        <SignalBanner affected={signalCount} active={filters.signalOnly} onReview={() => set("signalOnly", true)} onClear={() => set("signalOnly", false)} onHide={useStore.getState().hideSignal} />
      )}
      <ViewChips view={view} counts={counts} onPick={pick} />
      <WorkFilterBar filters={filters} set={set} clear={clear} deadlineCounts={deadlineCounts} owners={owners} signalCount={signalCount} />
      <ProgramScopeChip state={focus} className="-mt-2" />
      <Card className="overflow-hidden" data-testid="worklist">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink2" aria-live="polite">{plural(shown.length, "authorization")}</h2>
          <TableHelp avgChance={avgChance} />
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={SearchX} title={rows.length ? "No authorizations match" : "Nothing to track yet"} action={rows.length ? <Button onClick={clearAll}>Clear filters</Button> : <Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New Authorization</Button>} />
        ) : (
          <WorkTable
            rows={shown} view={view} page={page} onPage={(p) => setPaging({ key: pageKey, page: p })} sort={sort} onSort={onSort}
            quickKey={quickRow?.key ?? null} onQuick={(r, from) => { quickFrom.current = from; setParam("quick", r.id); }} onAct={act}
          />
        )}
      </Card>

      {/* A request still being prepared (or a denial) opens the queue's quick view; one with the payer or approved opens the tracker's, with units, window, reviews and the workflow line. */}
      {quickRow?.src.item && !(quickRow.src.ledger && (quickRow.life === "payer" || quickRow.life === "approved")) ? (
        <QuickView key={quickRow.key} item={quickRow.src.item} request={quickRow.src.request} onClose={() => setParam("quick", null)} />
      ) : quickRow?.src.ledger ? (
        <CaseQuickView key={quickRow.key} row={quickRow.src.ledger} from={quickFrom} onClose={() => setParam("quick", null)} onOpenReview={(id) => setParams((p) => { const n = new URLSearchParams(p); n.delete("quick"); n.set("review", id); return n; }, { replace: true })} />
      ) : null}
      {review ? <ReviewDrawer key={review.id} review={review} onClose={() => setParam("review", null)} /> : null}
      {signAll ? (
        <SignDialog
          title="Sign all clean drafts"
          subtitle={`${plural(clean.length, "review")} with all four checks passed`}
          attestation={clean.length === 1 ? "I reviewed this draft and it reflects the record. The level of care is my clinical judgment." : `I reviewed these ${clean.length} drafts and they reflect the record. The level of care in each is my clinical judgment.`}
          confirmLabel={`Sign ${plural(clean.length, "review")}`}
          onClose={() => setSignAll(false)}
          onSign={(by) => {
            useStore.getState().signAllClean(by);
            setSignAll(false);
          }}
        >
          <p className="text-sm text-ink2">Only drafts whose four Integrity checks all passed are signed.</p>
        </SignDialog>
      ) : null}
    </Page>
  );
}
