import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PenLine, Plus, Wand2 } from "lucide-react";
import { Button, Dropdown, Page, PageHeader, SearchInput, Segmented } from "@/components/ui";
import { isClean } from "@/data/managerReviews";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { LedgerView } from "./LedgerView";
import { ReviewDrawer } from "./ReviewDrawer";
import { ReviewsView } from "./ReviewsView";
import { SignDialog } from "./SignDialog";
import { LEVEL_OPTIONS, NO_FILTERS, PAYER_FILTER_OPTIONS, REVIEW_STATUS_OPTIONS, STATUS_OPTIONS, hasAnyFilter, type ManagerFilters } from "./helpers";

type Tab = "ledger" | "reviews";

/** Case Manager: the ledger of every case, and the week's clinical reviews. The tab is remembered in ?tab=. */
export default function ManagerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "reviews" ? "reviews" : "ledger";
  const [filters, setFilters] = useState<ManagerFilters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [signAll, setSignAll] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const ledgerCount = useStore((s) => s.ledger.length);
  const reviews = useStore((s) => s.reviews);
  const review = reviews.find((r) => r.id === openId);
  const clean = reviews.filter(isClean);
  const flagged = reviews.filter((r) => r.status === "drafted" && !isClean(r)).length;
  const needs = reviews.filter((r) => r.status === "needs_update").length;

  const set = <K extends keyof ManagerFilters>(k: K, v: ManagerFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters(NO_FILTERS);
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true });

  const draftAll = () => {
    setDrafting(true);
    setTimeout(() => {
      useStore.getState().toast({ title: "Cadence checked the next 3 days", body: `All ${reviews.length} reviews due this week already have a draft or a question for you. Nothing is left to draft.`, tone: "good" });
      setDrafting(false);
    }, 1300);
  };

  return (
    <Page>
      {tab === "ledger" ? (
        <PageHeader
          title={`${ledgerCount} active cases.`}
          sub="Units, clocks and status for every case, across every level of care."
          actions={<Button variant="primary" icon={Plus} onClick={() => navigate(paths.newCase())}>New case</Button>}
        />
      ) : (
        <PageHeader
          title={`${reviews.length} clinical reviews due this week.`}
          sub="Agents draft each review ahead of time. You update only what they ask about."
          actions={
            <>
              <Button icon={Wand2} loading={drafting} onClick={draftAll}>Draft all due reviews</Button>
              <Button variant="primary" icon={PenLine} disabled={!clean.length} onClick={() => setSignAll(true)}>Sign all clean drafts</Button>
            </>
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={filters.q} onChange={(v) => set("q", v)} placeholder="Search by case ID or initials" className="w-[280px]" />
        <Dropdown ariaLabel="Level of care" value={filters.program} defaultValue="all" options={LEVEL_OPTIONS} onChange={(v) => set("program", v)} />
        <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={PAYER_FILTER_OPTIONS} onChange={(v) => set("payer", v)} menuWidth={250} />
        {tab === "ledger" ? (
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
            { id: "ledger", label: "Ledger" },
            { id: "reviews", label: "Reviews this week" },
          ]}
        />
      </div>

      {tab === "ledger" ? <LedgerView filters={filters} onStatus={(s) => set("status", s)} onClear={clear} /> : <ReviewsView filters={filters} onOpen={setOpenId} onClear={clear} />}

      {review ? <ReviewDrawer key={review.id} review={review} onClose={() => setOpenId(null)} /> : null}
      {signAll ? (
        <SignDialog
          title="Sign all clean drafts"
          subtitle={`${clean.length} ${clean.length === 1 ? "review" : "reviews"} with all four checks passed`}
          attestation={`I reviewed these ${clean.length} drafts and they reflect the record. The level of care in each is my clinical judgment.`}
          confirmLabel={`Sign ${clean.length} ${clean.length === 1 ? "review" : "reviews"}`}
          onClose={() => setSignAll(false)}
          onSign={(by) => {
            useStore.getState().signAllClean(by);
            setSignAll(false);
          }}
        >
          <p className="text-sm text-ink2">
            Only drafts whose four Integrity checks all passed are signed. {flagged ? `${flagged} drafts with a check to look at are left out. ` : ""}
            {needs ? `${needs} reviews that need your update are left out too.` : ""}
          </p>
        </SignDialog>
      ) : null}
    </Page>
  );
}
