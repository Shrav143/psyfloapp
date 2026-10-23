import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PenLine, Plus, Wand2 } from "lucide-react";
import { Button, Dropdown, Page, PageHeader, SearchInput, Segmented } from "@/components/ui";
import { SiteTag } from "@/components/layout/SiteTag";
import { inWeek, isClean } from "@/data/managerReviews";
import { plural } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseQuickView } from "./CaseQuickView";
import { LedgerView } from "./LedgerView";
import { useLedgerRows } from "./ledgerRows";
import { PreparingCard } from "./PreparingCard";
import { ReviewDrawer } from "./ReviewDrawer";
import { ReviewsView } from "./ReviewsView";
import { SignDialog } from "./SignDialog";
import { StepDownCard } from "./StepDownCard";
import { useDraftReviews } from "./useDraftReviews";
import { LEVEL_OPTIONS, NO_FILTERS, PAYER_FILTER_OPTIONS, REVIEW_STATUS_OPTIONS, SHOW_LABEL, STATUS_OPTIONS, hasAnyFilter, showOf, type ManagerFilters } from "./helpers";

type Tab = "cases" | "reviews";

/** Case Manager: the tracker of every active case (what is due next, units used and left), with one folded row for the cases still being prepared, and the week's clinical reviews. The tab is remembered in ?tab=. `?review=` opens one review's drawer (the case page's "Open the review" uses it). */
export default function ManagerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "reviews" ? "reviews" : "cases";
  const [filters, setFilters] = useState<ManagerFilters>(() => ({ ...NO_FILTERS, show: showOf(params.get("show")) }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [quickId, setQuickId] = useState<string | null>(null);
  const quickFrom = useRef<HTMLElement | null>(null);
  const [signAll, setSignAll] = useState(false);
  const { drafting, draft: draftAll } = useDraftReviews();

  const scope = useScope();
  const ledger = useLedgerRows();
  const paused = useStore((s) => s.agentPaused.cadence);
  const drafts = useStore((s) => s.caseDrafts);
  const preparing = useMemo(() => drafts.filter((d) => d.saved && !d.sent && scope.sites.includes(d.site)).length, [drafts, scope.sites]);
  const all = useStore((s) => s.reviews);
  const visibleReviews = useMemo(() => scope.filter(all, (r) => r.caseId), [all, scope]);
  const reviews = useMemo(() => visibleReviews.filter(inWeek), [visibleReviews]);
  const review = visibleReviews.find((r) => r.id === openId);
  const quick = ledger.find((c) => c.id === quickId);
  const clean = reviews.filter(isClean);
  const flagged = reviews.filter((r) => r.status === "drafted" && !isClean(r)).length;
  const needs = reviews.filter((r) => r.status === "needs_update").length;
  const waiting = reviews.filter((r) => r.status === "due").length;

  // A link carries the review only to open it. Keep the address to the tab so a reload does not reopen the drawer.
  const linked = params.get("review");
  useEffect(() => {
    if (!linked) return;
    setOpenId(linked);
    setParams((p) => { const n = new URLSearchParams(p); n.delete("review"); return n; }, { replace: true });
  }, [linked, setParams]);

  const set = <K extends keyof ManagerFilters>(k: K, v: ManagerFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => {
    setFilters(NO_FILTERS);
    if (params.has("show")) setParams((p) => { const n = new URLSearchParams(p); n.delete("show"); return n; }, { replace: true });
  };
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true });

  const reviewButtons = (
    <>
      <Button icon={Wand2} loading={drafting} onClick={draftAll} title={paused ? "Cadence is paused in Settings" : undefined}>Draft all due reviews</Button>
      <Button variant="primary" icon={PenLine} disabled={!clean.length} onClick={() => setSignAll(true)}>Sign all clean drafts</Button>
    </>
  );

  return (
    <Page>
      {tab === "cases" ? (
        <PageHeader
          title={<>{plural(ledger.length, "active case")}.<SiteTag /></>}
          sub={`${preparing} ${preparing === 1 ? "is" : "are"} still being prepared. Units, clocks and status for every case, across every level of care.`}
          actions={<Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New Case</Button>}
        />
      ) : (
        <PageHeader
          title={<>{plural(reviews.length, "clinical review")} due this week.<SiteTag /></>}
          sub={
            <>
              Agents draft each review ahead of time. You update only what they ask about.
              {/* On a narrow window the buttons sit under the text instead of squeezing the headline. */}
              <span className="mt-3.5 hidden flex-wrap items-center gap-3 max-[899px]:flex">{reviewButtons}</span>
            </>
          }
          actions={<span className="flex items-center gap-3 max-[899px]:hidden">{reviewButtons}</span>}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={filters.q} onChange={(v) => set("q", v)} placeholder="Search by case ID or initials" className="w-[280px]" />
        <Dropdown ariaLabel="Level of care" value={filters.program} defaultValue="all" options={LEVEL_OPTIONS} onChange={(v) => set("program", v)} />
        <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={PAYER_FILTER_OPTIONS} onChange={(v) => set("payer", v)} menuWidth={250} />
        {tab === "cases" ? (
          <Dropdown ariaLabel="Status" value={filters.status} defaultValue="all" options={STATUS_OPTIONS} onChange={(v) => set("status", v)} />
        ) : (
          <Dropdown ariaLabel="Review status" value={filters.reviewStatus} defaultValue="all" options={REVIEW_STATUS_OPTIONS} onChange={(v) => set("reviewStatus", v)} />
        )}
        {tab === "cases" && filters.show !== "all" ? <span className="text-sm text-muted">Showing {SHOW_LABEL[filters.show]}</span> : null}
        {hasAnyFilter(filters, tab) ? <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button> : null}
        <Segmented
          className="ml-auto"
          value={tab}
          onChange={setTab}
          items={[
            { id: "cases", label: "Active cases" },
            { id: "reviews", label: "Reviews this week" },
          ]}
        />
      </div>

      {tab === "cases" ? (
        <>
          <PreparingCard filters={filters} onClear={clear} />
          <StepDownCard filters={filters} />
          <LedgerView ledger={ledger} filters={filters} onStatus={(s) => set("status", s)} onClear={clear} onQuick={(id, from) => { quickFrom.current = from; setQuickId(id); }} />
        </>
      ) : (
        <ReviewsView filters={filters} onOpen={setOpenId} onClear={clear} />
      )}

      {quick ? <CaseQuickView key={quick.id} row={quick} from={quickFrom} onClose={() => setQuickId(null)} onOpenReview={setOpenId} /> : null}
      {review ? <ReviewDrawer key={review.id} review={review} onClose={() => setOpenId(null)} /> : null}
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
          <p className="text-sm text-ink2">
            Only drafts whose four Integrity checks all passed are signed. {flagged ? `${flagged} ${flagged === 1 ? "draft with a check to look at is" : "drafts with a check to look at are"} left out. ` : ""}
            {needs ? `${needs} ${needs === 1 ? "review that needs" : "reviews that need"} your update ${needs === 1 ? "is" : "are"} left out. ` : ""}
            {waiting ? `${waiting} ${waiting === 1 ? "review has" : "reviews have"} no draft yet and ${waiting === 1 ? "is" : "are"} left out too.` : ""}
          </p>
        </SignDialog>
      ) : null}
    </Page>
  );
}
