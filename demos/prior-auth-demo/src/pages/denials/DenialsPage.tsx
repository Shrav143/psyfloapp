import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banner, Button, Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AcceptModal } from "./AcceptModal";
import { AddLetterCard } from "./AddLetterCard";
import { AgentsDidCard, DimensionsCard, HistoryCard, PayerSaidCard, WeakPointsCard } from "./AnalysisCards";
import { AppealDrawer } from "./AppealDrawer";
import { BookCallModal } from "./BookCallModal";
import { ConfirmAppealModal } from "./ConfirmAppealModal";
import { DecisionModal } from "./DecisionModal";
import { DenialHeader } from "./DenialHeader";
import { FilterChips } from "./FilterChips";
import type { Finding, OptionId } from "./lib/analysis";
import { filterDenials, isFiltering, type DenialFilter } from "./lib/filters";
import { SCOPE_NOTE, isClosed, isFiled, sortOpen } from "./lib/format";
import { recommendedStep } from "./lib/step";
import { useDenialView } from "./lib/useDenialView";
import { isRecommending } from "./NextStep";
import { OpenDenialsCard } from "./OpenDenialsCard";
import { OptionsCard } from "./OptionsCard";
import { SourceDrawer } from "./SourceDrawer";

type Dialog = "p2p" | "appeal-confirm" | "appeal" | "decision" | "accept" | null;

/** Denial Intelligence: why a denial happened, whether it can be won, and the next step. ?id= picks the denial; ?payer= and ?reason= narrow the list. */
export default function DenialsPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const requests = useStore((s) => s.requests);
  const clock = useStore((s) => s.clock);
  const meta = useStore((s) => s.denialMeta);
  const work = useStore((s) => s.denialWork);
  const startAppeal = useStore((s) => s.startAppeal);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [source, setSource] = useState<Finding | null>(null);

  const open = useMemo(() => sortOpen(requests.filter((r) => r.stage === "appeal"), clock), [requests, clock]);
  const closed = useMemo(() => requests.filter((r) => r.stage !== "appeal" && isClosed(work[r.id])), [requests, work]);
  const payer = params.get("payer");
  const reason = params.get("reason");
  const filter = useMemo<DenialFilter>(() => ({ payer, reason }), [payer, reason]);
  const shown = useMemo(() => filterDenials(open, meta, filter), [open, meta, filter]);
  const shownClosed = useMemo(() => filterDenials(closed, meta, filter), [closed, meta, filter]);
  const wanted = params.get("id");
  const known = requests.find((r) => r.id === wanted && (r.stage === "appeal" || isClosed(work[r.id])));
  const selectedId = known?.id ?? shown[0]?.id;
  const view = useDenialView(selectedId);
  // Changing the denial or a filter keeps the rest of the address, so ?id= and the filters work together.
  const change = (edit: (p: URLSearchParams) => void) => setParams((prev) => { const next = new URLSearchParams(prev); edit(next); return next; });
  const select = (id: string) => change((p) => p.set("id", id));
  const removeFilter = (key: keyof DenialFilter) => change((p) => p.delete(key));
  const clearFilters = () => change((p) => { p.delete("payer"); p.delete("reason"); });

  const step = useMemo(() => (view ? recommendedStep(view.req, view.meta, view.analysis, view.clock) : undefined), [view]);
  // The next-step block already has a button for the route it recommends or has under way; the options card then shows no second one for it.
  const offered = !view || !step ? null : isRecommending(view) ? step.option : view.req.chip === "Call booked" ? "p2p" : view.req.chip === "Appeal drafting" ? "appeal" : null;
  const toFindings = () => {
    const el = document.getElementById("denial-weak-points");
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };
  const choose = (id: OptionId) => setDialog(id === "p2p" ? "p2p" : id === "appeal" ? (view?.req.chip === "Appeal drafting" ? "appeal" : "appeal-confirm") : "accept");

  return (
    <Page>
      <PageHeader
        title={view ? view.analysis.headline : "Denial Intelligence"}
        sub={
          <>
            {view ? `${view.analysis.ctx.who} · ${view.analysis.ctx.program} · ${view.analysis.ctx.payerName}. The agents read the denial against the chart, and you choose the next step.` : "Why each denial happened, whether it can be won, and the fastest route to a reversal."}
            <span className="mt-1 block text-[13px] text-faint">{SCOPE_NOTE}</span>
          </>
        }
      />
      {wanted && !known && view ? <Banner tone="mid" title={`We could not find ${wanted} among the open denials`}>Showing {view.req.id} instead.</Banner> : null}
      {isFiltering(filter) ? <FilterChips filter={filter} onRemove={removeFilter} onClear={clearFilters} /> : null}
      {view && step ? (
        <div className="grid grid-cols-1 items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-4">
            <DenialHeader view={view} step={step} onChoose={choose} onOpenAppeal={() => setDialog("appeal")} onChangeTime={() => setDialog("p2p")} onRecordDecision={() => setDialog("decision")} onFindings={toFindings} />
            {view.req.stage === "appeal" && !isFiled(view.req) && !isClosed(view.work) ? <OptionsCard key={view.req.id + view.req.chip} view={view} step={step} offered={offered} onChoose={choose} /> : null}
            <PayerSaidCard view={view} />
            <WeakPointsCard view={view} onSource={setSource} />
            <DimensionsCard view={view} />
            <AgentsDidCard view={view} />
            <HistoryCard view={view} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <AddLetterCard onAdded={(id) => setParams({ id })} />
            <OpenDenialsCard open={shown} closed={shownClosed} openTotal={open.length} selectedId={selectedId} clock={clock} meta={meta} onSelect={select} />
          </div>
        </div>
      ) : (
        <>
          <AddLetterCard onAdded={(id) => setParams({ id })} />
          {isFiltering(filter) && open.length ? (
            <Card>
              <EmptyState icon={SearchX} title="No open denials match these filters" action={<Button onClick={clearFilters}>Clear filters</Button>}>
                The filters hide all {plural(open.length, "open denial")}.
              </EmptyState>
            </Card>
          ) : (
            <Card>
              <EmptyState icon={SearchX} title="No open denials" action={<Link to={paths.dashboard()} className="font-semibold text-forest hover:underline">Open the Dashboard</Link>}>
                Everything sent is approved or waiting. Add a denial letter above to analyze a new one.
              </EmptyState>
            </Card>
          )}
        </>
      )}

      {view && dialog === "p2p" ? <BookCallModal view={view} onClose={() => setDialog(null)} onBooked={() => { setDialog(null); nav(paths.brief(view.req.id)); }} /> : null}
      {view && step && dialog === "appeal-confirm" ? <ConfirmAppealModal view={view} word={step.word} onClose={() => setDialog(null)} onConfirm={() => { startAppeal(view.req.id); setDialog("appeal"); }} /> : null}
      {view && dialog === "appeal" ? <AppealDrawer view={view} onClose={() => setDialog(null)} /> : null}
      {view && dialog === "decision" ? <DecisionModal view={view} onClose={() => setDialog(null)} onNextLevel={() => setDialog("appeal")} /> : null}
      {view && dialog === "accept" ? <AcceptModal view={view} onClose={() => setDialog(null)} /> : null}
      {view && source ? <SourceDrawer view={view} finding={source} onClose={() => setSource(null)} /> : null}
    </Page>
  );
}
