import { useState } from "react";
import { FileText, SearchX } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Banner, Button, Card, Crumbs, EmptyState, Page, PageHeader } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { blockedInHosted } from "@/lib/hosted";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AskBanner, DatesCard, OpeningCard, PointsCard, PushbackCard } from "./BriefCards";
import { BriefActions, CallDetailsCard, ChanceCard, OpenDocsCard } from "./BriefRail";
import { BookCallModal } from "./BookCallModal";
import { briefToText, buildBrief } from "./lib/brief";
import { copyText } from "./lib/clipboard";
import { useDenialView } from "./lib/useDenialView";
import { useOutOfSite } from "./lib/useOutOfSite";
import { OutcomeModal } from "./OutcomeModal";
import { ReviewNote } from "./ReviewNote";

/* Print only the brief: hide the app's sidebar, top bar and drawers. The folded sections open on paper: their content is kept in the page, and only the chevron is dropped. */
const PRINT_CSS = "@media print { aside, .sticky { display: none !important; } body { background: #fff; } main { padding: 0 !important; max-width: none !important; } .psy-print-open [hidden] { display: block !important; } .psy-print-open h3 svg { display: none; } }";

/** The peer-to-peer brief a clinician keeps open during the call. */
export default function BriefPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const view = useDenialView(id);
  const outside = useOutOfSite(id);
  const [dialog, setDialog] = useState<"book" | "outcome" | null>(null);
  const toast = useStore((s) => s.toast);

  if (outside) return <Page><OutOfSite id={outside} what="brief" /></Page>;
  if (!view)
    return (
      <Page>
        <Crumbs items={[{ label: "Denial Intelligence", to: paths.denials() }, { label: "Brief" }]} />
        <Card><EmptyState icon={SearchX} title="We could not find that denial" action={<Link to={paths.denials()} className="font-semibold text-forest hover:underline">Back to Denial Intelligence</Link>}>It may have been closed or the address is wrong.</EmptyState></Card>
      </Page>
    );

  const { req, analysis, work, clock, meta } = view;
  const extra = analysis.findings.filter((f) => work.fixes.includes(f.id) && !analysis.findings.some((g) => g.source === f.fix)).map((f) => f.fix);
  const brief = buildBrief(req, meta, analysis, work.slot, clock, extra);
  const copy = async () => {
    const ok = await copyText(briefToText(req, analysis, brief));
    toast(ok ? { title: "Brief copied", body: "Paste it into your notes before the call.", tone: "good" } : { title: "Could not copy", body: "Select the text on the page and copy it instead.", tone: "mid" });
  };
  const outcome = work.outcome;

  return (
    <Page>
      <style>{PRINT_CSS}</style>
      <Crumbs items={[{ label: "Denial Intelligence", to: paths.denials(req.id) }, { label: `Brief ${req.id}` }]} />
      <PageHeader
        title={`Peer-to-peer brief · ${req.id}`}
        sub={<>Talking points for your call with {analysis.ctx.payer}'s reviewer. Every point links to the chart.<ReviewNote className="mt-1.5" /></>}
        actions={<Link to={paths.report(req.id)} className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-field bg-white px-4 text-sm font-medium hover:bg-tile print:hidden"><FileText size={16} className="ico" />Appeal analysis report</Link>}
      />
      {outcome ? (
        <Banner tone={outcome.kind === "upheld" ? "mid" : "good"} title={`Outcome logged: ${outcome.kind === "overturned" ? "overturned" : outcome.kind === "partly" ? "partly restored" : "upheld"}`} action={<Button size="sm" variant="outline" onClick={() => nav(paths.denials(req.id))}>Back to the denial</Button>}>
          {outcome.kind === "upheld" ? "Advocate started a written appeal from your call notes." : "The ledger is updated and the next review is booked."}{outcome.note ? ` Note: ${outcome.note}` : ""}
        </Banner>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <OpeningCard view={view} />
          <PointsCard view={view} />
          <PushbackCard view={view} />
          <AskBanner view={view} />
          <DatesCard brief={brief} />
        </div>
        <div className="flex flex-col gap-4">
          <CallDetailsCard view={view} brief={brief} onBook={() => setDialog("book")} />
          <ChanceCard view={view} />
          <OpenDocsCard view={view} brief={brief} />
          <BriefActions onCopy={copy} onPrint={() => { if (!blockedInHosted("Print")) window.print(); }} onOutcome={() => setDialog("outcome")} />
        </div>
      </div>
      {dialog === "book" ? <BookCallModal view={view} onClose={() => setDialog(null)} onBooked={() => setDialog(null)} /> : null}
      {dialog === "outcome" ? <OutcomeModal view={view} onClose={() => setDialog(null)} /> : null}
    </Page>
  );
}
