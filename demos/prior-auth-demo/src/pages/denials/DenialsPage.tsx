import { useMemo, useState } from "react";
import { LayoutDashboard, SearchX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banner, Button, Card, CardHeader, CardBody, EmptyState, Page, PageHeader, Timeline } from "@/components/ui";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AcceptModal } from "./AcceptModal";
import { AddLetterCard } from "./AddLetterCard";
import { AgentsDidCard, DimensionsCard, PayerSaidCard, WeakPointsCard } from "./AnalysisCards";
import { AppealDrawer } from "./AppealDrawer";
import { BookCallModal } from "./BookCallModal";
import { ConfirmAppealModal } from "./ConfirmAppealModal";
import { DecisionModal } from "./DecisionModal";
import { DenialHeader } from "./DenialHeader";
import { FilterChips } from "./FilterChips";
import type { Finding, OptionId } from "./lib/analysis";
import { filterDenials, isFiltering, type DenialFilter } from "./lib/filters";
import { isClosed, isFiled, sortOpen } from "./lib/format";
import { useDenialView } from "./lib/useDenialView";
import { OpenDenialsCard } from "./OpenDenialsCard";
import { OptionsCard } from "./OptionsCard";
import { SourceDrawer } from "./SourceDrawer";
import { StatusBanner } from "./StatusBanner";

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

  const choose = (id: OptionId) => setDialog(id === "p2p" ? "p2p" : id === "appeal" ? (view?.req.chip === "Appeal drafting" ? "appeal" : "appeal-confirm") : "accept");

  return (
    <Page>
      <PageHeader
        title={view ? view.analysis.headline : "Denial Intelligence"}
        sub={view ? `${view.analysis.ctx.who} · ${view.analysis.ctx.program} · ${view.analysis.ctx.payerName}. The agents read the denial against the chart, and you choose the next step.` : "Why each denial happened, whether it can be won, and the fastest route to a reversal."}
        actions={view ? <Button icon={LayoutDashboard} onClick={() => nav(paths.dashboard({ request: view.req.id }))}>See on the Dashboard</Button> : null}
      />
      {wanted && !known && view ? <Banner tone="mid" title={`We could not find ${wanted} among the open denials`}>Showing {view.req.id} instead.</Banner> : null}
      <AddLetterCard onAdded={(id) => setParams({ id })} />
      {isFiltering(filter) ? <FilterChips filter={filter} onRemove={removeFilter} onClear={clearFilters} /> : null}
      {view ? (
        <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-5">
          <div className="flex flex-col gap-4">
            <DenialHeader view={view} />
            <StatusBanner view={view} onOpenAppeal={() => setDialog("appeal")} onChangeTime={() => setDialog("p2p")} onRecordDecision={() => setDialog("decision")} />
            <AgentsDidCard view={view} />
            <PayerSaidCard view={view} />
            <WeakPointsCard view={view} onSource={setSource} />
            <DimensionsCard view={view} />
            {view.req.stage === "appeal" && !isFiled(view.req) && !isClosed(view.work) ? <OptionsCard key={view.req.id + view.req.chip} view={view} onChoose={choose} /> : null}
            <Card>
              <CardHeader title="What has happened" subtitle="Every step is also on the Dashboard" />
              <CardBody><Timeline events={view.req.events} /></CardBody>
            </Card>
          </div>
          <OpenDenialsCard open={shown} closed={shownClosed} openTotal={open.length} selectedId={selectedId} clock={clock} meta={meta} onSelect={select} />
        </div>
      ) : isFiltering(filter) && open.length ? (
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

      {view && dialog === "p2p" ? <BookCallModal view={view} onClose={() => setDialog(null)} onBooked={() => { setDialog(null); nav(paths.brief(view.req.id)); }} /> : null}
      {view && dialog === "appeal-confirm" ? <ConfirmAppealModal view={view} onClose={() => setDialog(null)} onConfirm={() => { startAppeal(view.req.id); setDialog("appeal"); }} /> : null}
      {view && dialog === "appeal" ? <AppealDrawer view={view} onClose={() => setDialog(null)} /> : null}
      {view && dialog === "decision" ? <DecisionModal view={view} onClose={() => setDialog(null)} onNextLevel={() => setDialog("appeal")} /> : null}
      {view && dialog === "accept" ? <AcceptModal view={view} onClose={() => setDialog(null)} /> : null}
      {view && source ? <SourceDrawer view={view} finding={source} onClose={() => setSource(null)} /> : null}
    </Page>
  );
}
