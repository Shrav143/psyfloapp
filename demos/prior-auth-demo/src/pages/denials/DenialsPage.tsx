import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { PanelRightOpen, ScanText, SearchX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banner, Button, Card, EmptyState, Page, PageHeader, Pill } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { SiteTag } from "@/components/layout/SiteTag";
import { siteOfDenial } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { plural } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AcceptModal } from "./AcceptModal";
import { AgentsDidCard, DimensionsCard, HistoryCard, PayerSaidCard, WeakPointsCard } from "./AnalysisCards";
import { AppealDrawer } from "./AppealDrawer";
import { BookCallModal } from "./BookCallModal";
import { ConfirmAppealModal } from "./ConfirmAppealModal";
import { DecisionModal } from "./DecisionModal";
import { DenialHeader } from "./DenialHeader";
import { FilterChip } from "./FilterChips";
import { LetterPanel } from "./LetterPanel";
import type { Finding, OptionId } from "./lib/analysis";
import { filterDenials, isFiltering, type DenialFilter } from "./lib/filters";
import { SCOPE_NOTE, isClosed, isFiled, sortOpen } from "./lib/format";
import { recommendedStep } from "./lib/step";
import { useDenialView } from "./lib/useDenialView";
import { useLetter } from "./lib/useLetter";
import { OpenDenialsPanel } from "./OpenDenialsPanel";
import { OptionsSummary } from "./OptionsCard";
import { OptionsPanel } from "./OptionsPanel";
import { SourceDrawer } from "./SourceDrawer";

type Dialog = "p2p" | "appeal-confirm" | "appeal" | "decision" | "accept" | null;
type Panel = "list" | "letter" | "options" | null;


/**
 * Denial Intelligence: why a denial happened, whether it can be won, and the next step. One column: the denial, its recommended next step and the analysis.
 * ?id= picks the denial; ?payer= and ?reason= narrow the Open denials panel. The panel stays closed when the page opens on a denial (from the sidebar it is the soonest deadline),
 * and opens by itself only when the address carries a filter that matches more than one denial, so the person can pick one.
 */
export default function DenialsPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const scope = useScope();
  const requests = useStore((s) => s.requests);
  const clock = useStore((s) => s.clock);
  const meta = useStore((s) => s.denialMeta);
  const work = useStore((s) => s.denialWork);
  const startAppeal = useStore((s) => s.startAppeal);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [source, setSource] = useState<Finding | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [autoOpened, setAutoOpened] = useState<string | null>(null);
  const from = useRef<HTMLElement | null>(null);

  const inView = (r: PsyRequest): boolean => scope.sites.includes(siteOfDenial(meta[r.id], r.caseId));
  const open = useMemo(() => sortOpen(requests.filter((r) => r.stage === "appeal" && scope.sites.includes(siteOfDenial(meta[r.id], r.caseId))), clock), [requests, meta, scope.sites, clock]);
  const closed = useMemo(() => requests.filter((r) => r.stage !== "appeal" && isClosed(work[r.id]) && scope.sites.includes(siteOfDenial(meta[r.id], r.caseId))), [requests, meta, work, scope.sites]);
  const payer = params.get("payer");
  const reason = params.get("reason");
  const filter = useMemo<DenialFilter>(() => ({ payer, reason }), [payer, reason]);
  const shown = useMemo(() => filterDenials(open, meta, filter), [open, meta, filter]);
  const shownClosed = useMemo(() => filterDenials(closed, meta, filter), [closed, meta, filter]);
  const wanted = params.get("id");
  const wantedReq = requests.find((r) => r.id === wanted);
  const known = wantedReq && inView(wantedReq) && (wantedReq.stage === "appeal" || isClosed(work[wantedReq.id])) ? wantedReq : undefined;
  const selectedId = known?.id ?? shown[0]?.id;
  const view = useDenialView(selectedId);
  // Changing the denial or a filter keeps the rest of the address, so ?id= and the filters work together.
  const change = (edit: (p: URLSearchParams) => void) => setParams((prev) => { const next = new URLSearchParams(prev); edit(next); return next; });
  const select = (id: string) => { setPanel(null); change((p) => p.set("id", id)); };
  const clearFilters = () => change((p) => { p.delete("payer"); p.delete("reason"); });
  const letter = useLetter((id) => { setPanel(null); setParams({ id }); });

  // Reached from an Analytics row with a filter that matches several denials: show them so the person picks one. Once per filter, and never when the address names a denial.
  const filterKey = `${payer ?? ""}|${reason ?? ""}`;
  useEffect(() => {
    if (!isFiltering(filter) || wanted || shown.length < 2 || autoOpened === filterKey) return;
    from.current = [...document.querySelectorAll<HTMLElement>("[data-open-denials]")].find((el) => el.offsetParent !== null) ?? null;
    setAutoOpened(filterKey);
    setPanel("list");
  }, [filter, wanted, shown.length, autoOpened, filterKey]);

  const step = useMemo(() => (view ? recommendedStep(view.req, view.meta, view.analysis, view.clock) : undefined), [view]);
  const toFindings = () => {
    const el = document.getElementById("denial-weak-points");
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };
  const choose = (id: OptionId) => setDialog(id === "p2p" ? "p2p" : id === "appeal" ? (view?.req.chip === "Appeal drafting" ? "appeal" : "appeal-confirm") : "accept");
  const show = (p: Exclude<Panel, null>) => (e: MouseEvent<HTMLElement>) => { from.current = e.currentTarget; setPanel(p); };

  const openButton = (
    <Button data-open-denials icon={PanelRightOpen} aria-haspopup="dialog" aria-expanded={panel === "list"} onClick={show("list")}>
      Open denials
      <Pill tone="neutral" className="ml-0.5 px-2 py-0 text-xs">{shown.length}</Pill>
    </Button>
  );

  if (wantedReq && !inView(wantedReq)) return <Page><OutOfSite id={wantedReq.caseId} what="denial" /></Page>;
  const choosing = view?.req.stage === "appeal" && !isFiled(view.req) && !isClosed(view.work);

  return (
    <Page>
      <PageHeader
        title={<>{view ? view.analysis.headline : "Denial Intelligence"}<SiteTag /></>}
        sub={
          <>
            {view ? `${view.analysis.ctx.who} · ${view.analysis.ctx.program} · ${view.analysis.ctx.payerName}. The agents read the denial against the chart, and you choose the next step.` : "Why each denial happened, whether it can be won, and the fastest route to a reversal."}
            <span className="mt-1 block text-[13px] text-faint">{SCOPE_NOTE}</span>
            {/* On a narrow window the button sits under the text instead of squeezing the headline. */}
            <span className="mt-3.5 hidden max-[899px]:block">{openButton}</span>
          </>
        }
        actions={<span className="max-[899px]:hidden">{openButton}</span>}
      />
      {wanted && !known && view ? <Banner tone="mid" title={`We could not find ${wanted} among the open denials`}>Showing {view.req.id} instead.</Banner> : null}
      {isFiltering(filter) ? <FilterChip filter={filter} onClear={clearFilters} /> : null}
      {view && step ? (
        <div className="flex min-w-0 flex-col gap-4">
          <DenialHeader view={view} step={step} onChoose={choose} onOpenAppeal={() => setDialog("appeal")} onChangeTime={() => setDialog("p2p")} onRecordDecision={() => setDialog("decision")} onFindings={toFindings} />
          {choosing ? <OptionsSummary view={view} step={step} onCompare={show("options")} /> : null}
          <PayerSaidCard view={view} />
          <WeakPointsCard view={view} onSource={setSource} />
          <DimensionsCard view={view} />
          <AgentsDidCard view={view} />
          <HistoryCard view={view} />
        </div>
      ) : (
        <Card>
          {isFiltering(filter) && open.length ? (
            <EmptyState icon={SearchX} title="No open denials match these filters" action={<Button onClick={clearFilters}>Clear filters</Button>}>
              The filters hide all {plural(open.length, "open denial")}.
            </EmptyState>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No open denials"
              action={
                <span className="flex flex-wrap items-center justify-center gap-4">
                  <Button variant="primary" icon={ScanText} onClick={show("letter")}>Add a denial letter</Button>
                  <Link to={paths.dashboard()} className="font-semibold text-forest hover:underline">Open the Dashboard</Link>
                </span>
              }
            >
              Everything sent{scope.sites.length === 2 ? "" : ` at ${scope.label}`} is approved or waiting. Add a denial letter to analyze a new one.
            </EmptyState>
          )}
        </Card>
      )}

      {panel === "list" ? (
        <OpenDenialsPanel open={shown} closed={shownClosed} openTotal={open.length} selectedId={selectedId} clock={clock} meta={meta} filter={filter} siteLabel={scope.label} from={from} onSelect={select} onClearFilter={clearFilters} onAddLetter={() => setPanel("letter")} onClose={() => setPanel(null)} />
      ) : null}
      {panel === "letter" ? <LetterPanel letter={letter} from={from} onClose={() => setPanel(null)} onBack={() => setPanel("list")} /> : null}
      {view && step && panel === "options" ? <OptionsPanel view={view} step={step} from={from} onChoose={(id) => { setPanel(null); choose(id); }} onClose={() => setPanel(null)} /> : null}

      {view && dialog === "p2p" ? <BookCallModal view={view} onClose={() => setDialog(null)} onBooked={() => { setDialog(null); nav(paths.brief(view.req.id)); }} /> : null}
      {view && step && dialog === "appeal-confirm" ? <ConfirmAppealModal view={view} word={step.word} onClose={() => setDialog(null)} onConfirm={() => { startAppeal(view.req.id); setDialog("appeal"); }} /> : null}
      {view && dialog === "appeal" ? <AppealDrawer view={view} onClose={() => setDialog(null)} /> : null}
      {view && dialog === "decision" ? <DecisionModal view={view} onClose={() => setDialog(null)} onNextLevel={() => setDialog("appeal")} /> : null}
      {view && dialog === "accept" ? <AcceptModal view={view} onClose={() => setDialog(null)} /> : null}
      {view && source ? <SourceDrawer view={view} finding={source} onClose={() => setSource(null)} /> : null}
    </Page>
  );
}
