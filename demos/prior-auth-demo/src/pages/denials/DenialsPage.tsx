import { useMemo, useState } from "react";
import { LayoutDashboard, SearchX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banner, Button, Card, CardHeader, CardBody, EmptyState, Page, PageHeader, Timeline } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AcceptModal } from "./AcceptModal";
import { AddLetterCard } from "./AddLetterCard";
import { AgentsDidCard, DimensionsCard, PayerSaidCard, WeakPointsCard } from "./AnalysisCards";
import { AppealDrawer } from "./AppealDrawer";
import { BookCallModal } from "./BookCallModal";
import { ConfirmAppealModal } from "./ConfirmAppealModal";
import { DenialHeader } from "./DenialHeader";
import type { Finding, OptionId } from "./lib/analysis";
import { isClosed, isFiled, sortOpen } from "./lib/format";
import { useDenialView } from "./lib/useDenialView";
import { OpenDenialsCard } from "./OpenDenialsCard";
import { OptionsCard } from "./OptionsCard";
import { SourceDrawer } from "./SourceDrawer";
import { StatusBanner } from "./StatusBanner";

type Dialog = "p2p" | "appeal-confirm" | "appeal" | "accept" | null;

/** Denial Intelligence: why a denial happened, whether it can be won, and the next step. ?id= picks the denial. */
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
  const wanted = params.get("id");
  const known = requests.find((r) => r.id === wanted && (r.stage === "appeal" || isClosed(work[r.id])));
  const selectedId = known?.id ?? open[0]?.id;
  const view = useDenialView(selectedId);
  const select = (id: string) => setParams({ id });

  const choose = (id: OptionId) => setDialog(id === "p2p" ? "p2p" : id === "appeal" ? (view?.req.chip === "Appeal drafting" ? "appeal" : "appeal-confirm") : "accept");

  return (
    <Page>
      <PageHeader
        title={view ? view.analysis.headline : "Denial Intelligence"}
        sub={view ? `${view.analysis.ctx.who} · ${view.analysis.ctx.program} · ${view.analysis.ctx.payerName}. The agents read the denial against the chart, and you choose the next step.` : "Why each denial happened, whether it can be won, and the fastest route to a reversal."}
        actions={view ? <Button icon={LayoutDashboard} onClick={() => nav(paths.dashboard({ request: view.req.id }))}>See on the Dashboard</Button> : null}
      />
      {wanted && !known && view ? <Banner tone="mid" title={`We could not find ${wanted} among the open denials`}>Showing {view.req.id} instead.</Banner> : null}
      <AddLetterCard onAdded={select} />
      {view ? (
        <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-5">
          <div className="flex flex-col gap-4">
            <DenialHeader view={view} />
            <StatusBanner view={view} onOpenAppeal={() => setDialog("appeal")} onChangeTime={() => setDialog("p2p")} />
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
          <OpenDenialsCard open={open} closed={closed} selectedId={selectedId} clock={clock} meta={meta} onSelect={select} />
        </div>
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
      {view && dialog === "accept" ? <AcceptModal view={view} onClose={() => setDialog(null)} /> : null}
      {view && source ? <SourceDrawer view={view} finding={source} onClose={() => setSource(null)} /> : null}
    </Page>
  );
}
