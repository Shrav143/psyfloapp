import { useMemo, useRef, useState, type MouseEvent } from "react";
import { SearchX } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, Crumbs, EmptyState, Page } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AcceptModal } from "./AcceptModal";
import { FrameworkCard, HistoryCard, PayerSaidCard, WeakPointsCard } from "./AnalysisCards";
import { AppealDrawer } from "./AppealDrawer";
import { BookCallModal } from "./BookCallModal";
import { ConfirmAppealModal } from "./ConfirmAppealModal";
import { DecisionModal } from "./DecisionModal";
import { DenialHeader } from "./DenialHeader";
import type { Finding, OptionId } from "./lib/analysis";
import { isClosed } from "./lib/format";
import { recommendedStep } from "./lib/step";
import { useDenialView } from "./lib/useDenialView";
import { useOutOfSite } from "./lib/useOutOfSite";
import { OptionsCard } from "./OptionsCard";
import { OptionsPanel } from "./OptionsPanel";
import { SourceDrawer } from "./SourceDrawer";

type Dialog = "p2p" | "appeal-confirm" | "appeal" | "decision" | "accept" | null;

/**
 * One denial, /denials/:id. The header, then Your options (the route under way says where it stands inside its own choice), what the payer said,
 * where the denial is weak, the framework's six dimensions and the History. The detail is one click away: pop-ups, the options panel and the dialogs.
 */
export default function DenialPage() {
  const { id = "" } = useParams();
  // One denial to the next is the same route, so the key starts each one fresh: History folded, no dialog left open.
  return <Denial key={id} id={id} />;
}

function Denial({ id }: { id: string }) {
  const nav = useNavigate();
  const view = useDenialView(id);
  const outside = useOutOfSite(id);
  const startAppeal = useStore((s) => s.startAppeal);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [source, setSource] = useState<Finding | null>(null);
  const [compare, setCompare] = useState(false);
  const from = useRef<HTMLElement | null>(null);
  const step = useMemo(() => (view ? recommendedStep(view.req, view.meta, view.analysis, view.clock) : undefined), [view]);

  if (outside) return <Page><OutOfSite id={outside} what="denial" /></Page>;
  const isDenial = !!view && (view.req.stage === "appeal" || isClosed(view.work));
  if (!view || !step || !isDenial)
    return (
      <Page>
        <Crumbs items={[{ label: "Denial Intelligence", to: paths.denials() }, { label: id }]} />
        <Card><EmptyState icon={SearchX} title={`We could not find denial ${id}`} action={<Link to={paths.denials()} className="font-semibold text-forest hover:underline">Back to Denial Intelligence</Link>} /></Card>
      </Page>
    );

  const choose = (o: OptionId) => setDialog(o === "p2p" ? "p2p" : o === "appeal" ? (view.req.chip === "Appeal drafting" ? "appeal" : "appeal-confirm") : "accept");
  const openCompare = (e: MouseEvent<HTMLElement>) => { from.current = e.currentTarget; setCompare(true); };

  return (
    <Page>
      <Crumbs items={[{ label: "Denial Intelligence", to: paths.denials() }, { label: view.req.id }]} />
      <DenialHeader view={view} />
      <OptionsCard view={view} step={step} onChoose={choose} onOpenAppeal={() => setDialog("appeal")} onChangeTime={() => setDialog("p2p")} onRecordDecision={() => setDialog("decision")} onCompare={openCompare} />
      <PayerSaidCard view={view} />
      <WeakPointsCard view={view} onSource={setSource} />
      <FrameworkCard view={view} />
      <HistoryCard view={view} />

      {compare ? <OptionsPanel view={view} step={step} from={from} onChoose={(o) => { setCompare(false); choose(o); }} onClose={() => setCompare(false)} /> : null}
      {dialog === "p2p" ? <BookCallModal view={view} onClose={() => setDialog(null)} onBooked={() => { setDialog(null); nav(paths.brief(view.req.id)); }} /> : null}
      {dialog === "appeal-confirm" ? <ConfirmAppealModal view={view} word={step.word} onClose={() => setDialog(null)} onConfirm={() => { startAppeal(view.req.id); setDialog("appeal"); }} /> : null}
      {dialog === "appeal" ? <AppealDrawer view={view} onClose={() => setDialog(null)} /> : null}
      {dialog === "decision" ? <DecisionModal view={view} onClose={() => setDialog(null)} onNextLevel={() => setDialog("appeal")} /> : null}
      {dialog === "accept" ? <AcceptModal view={view} onClose={() => setDialog(null)} /> : null}
      {source ? <SourceDrawer view={view} finding={source} onClose={() => setSource(null)} /> : null}
    </Page>
  );
}
