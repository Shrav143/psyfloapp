import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PenLine, Plus, Wand2 } from "lucide-react";
import { Button, Dropdown, Page, PageHeader, SearchInput, Segmented } from "@/components/ui";
import { inWeek, isClean } from "@/data/managerReviews";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { LedgerView } from "./LedgerView";
import { useLedgerRows } from "./ledgerRows";
import { PreparingCard } from "./PreparingCard";
import { ReviewDrawer } from "./ReviewDrawer";
import { ReviewsView } from "./ReviewsView";
import { SignDialog } from "./SignDialog";
import { StepDownCard } from "./StepDownCard";
import { LEVEL_OPTIONS, NO_FILTERS, PAYER_FILTER_OPTIONS, REVIEW_STATUS_OPTIONS, STATUS_OPTIONS, hasAnyFilter, type ManagerFilters } from "./helpers";

type Tab = "cases" | "reviews";

/** Case Manager: every active case (the ones still being prepared, then the tracker of the rest) and the week's clinical reviews. The tab is remembered in ?tab=. `?review=` opens one review's drawer (the case page's "Open the review" uses it). */
export default function ManagerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "reviews" ? "reviews" : "cases";
  const [filters, setFilters] = useState<ManagerFilters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [signAll, setSignAll] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const ledger = useLedgerRows();
  const paused = useStore((s) => s.agentPaused.cadence);
  const preparing = useStore((s) => s.caseDrafts.filter((d) => d.saved && !d.sent).length);
  const all = useStore((s) => s.reviews);
  const reviews = useMemo(() => all.filter(inWeek), [all]);
  const review = all.find((r) => r.id === openId);
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
  const clear = () => setFilters(NO_FILTERS);
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true });

  /** Cadence drafts every due review with no draft. A paused Cadence says so at once and does nothing. */
  const draftAll = () => {
    if (useStore.getState().agentPaused.cadence) {
      useStore.getState().draftDueReviews();
      return;
    }
    setDrafting(true);
    setTimeout(() => {
      useStore.getState().draftDueReviews();
      setDrafting(false);
    }, 1300);
  };

  return (
    <Page>
      {tab === "cases" ? (
        <PageHeader
          title={`${plural(ledger.length, "active case")}.`}
          sub={`${preparing} ${preparing === 1 ? "is" : "are"} still being prepared. Units, clocks and status for every case, across every level of care.`}
          actions={<Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New case</Button>}
        />
      ) : (
        <PageHeader
          title={`${plural(reviews.length, "clinical review")} due this week.`}
          sub="Agents draft each review ahead of time. You update only what they ask about."
          actions={
            <>
              <Button icon={Wand2} loading={drafting} onClick={draftAll} title={paused ? "Cadence is paused in Settings" : undefined}>Draft all due reviews</Button>
              <Button variant="primary" icon={PenLine} disabled={!clean.length} onClick={() => setSignAll(true)}>Sign all clean drafts</Button>
            </>
          }
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
          <LedgerView ledger={ledger} filters={filters} onStatus={(s) => set("status", s)} onClear={clear} />
        </>
      ) : (
        <ReviewsView filters={filters} onOpen={setOpenId} onClear={clear} />
      )}

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
