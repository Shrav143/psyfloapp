import { useCallback, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { useStore } from "@/store";
import { Breakdowns } from "./Breakdowns";
import { buildBoard, type Figure } from "./board";
import { MODEL_NOTE } from "./copy";
import { FilterBar } from "./FilterBar";
import { DEFAULT_FILTERS, type Filters } from "./filters";
import { dismissedBy } from "./FloSection";
import { HeadlineFigures } from "./HeadlineFigures";
import { useLive } from "./live";
import { MatrixCard } from "./MatrixCard";
import { PanelContext, type PanelState } from "./panels";
import { PanelsHost } from "./PanelsHost";
import { ReasonsCard } from "./ReasonsCard";
import { ReportModal } from "./ReportModal";
import { Scorecard } from "./Scorecard";
import { SiteCard } from "./SiteCard";
import { TrendCard } from "./TrendCard";
import { workloadOf } from "./workload";

/** Analytics for an owner: six figures with twelve months behind them, the monthly trend, a payer scorecard, the payer-by-case-mix matrix and the denial reasons, then detail on demand.
    Every number is counted from one set of case records, and every number opens the cases behind it in a right-hand panel. */
export default function AnalyticsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [report, setReport] = useState(false);
  const [stack, setStack] = useState<PanelState[]>([]);
  const openers = useRef<(Element | null)[]>([]);
  const { scope, scoped, dismissals } = useLive();
  const requests = useStore((s) => s.requests);
  const both = scope.sites.length === 2;
  const board = useMemo(() => buildBoard(scoped, filters, both), [scoped, filters, both]);
  const workload = useMemo(() => workloadOf(requests, filters, scope), [requests, filters, scope]);
  const dismissed = useMemo(() => dismissedBy(dismissals, filters, filters.period !== "last_quarter"), [dismissals, filters]);

  /* A panel opens on top of whatever is open, and closing it puts focus back on the control that opened it. */
  const open = useCallback((p: PanelState) => {
    openers.current.push(document.activeElement);
    setStack((s) => [...s, p]);
  }, []);
  const close = useCallback(() => {
    setStack((s) => s.slice(0, -1));
    const back = openers.current.pop();
    setTimeout(() => (back as HTMLElement | null)?.focus?.(), 0);
  }, []);
  const api = useMemo(() => ({ open }), [open]);

  const scopeWords = `${filters.payer === "all" ? "All payers" : payerById(filters.payer).name} · ${filters.program === "all" ? "All programs" : PROGRAM_LABEL[filters.program]} · ${scope.label}`;
  const openFigure = (f: Figure) => open({ kind: "cases", query: { ...f.query, note: `${f.label}: ${f.value}. ${f.sub}.` } });

  const rep = { board, siteLabel: scope.label, siteKey: both ? "both" : scope.sites[0].toLowerCase(), dismissed, workload };
  return (
    <PanelContext.Provider value={api}>
      <Page>
        <PageHeader
          title="Analytics"
          sub={
            <>
              <span>Where approvals are won and lost, by payer and by kind of case. Click a payer, a cell, a reason or a month to see the cases behind it.</span>
              <span className="mt-1.5 block text-[12px]">{MODEL_NOTE}</span>
            </>
          }
          actions={
            <Button icon={FileText} onClick={() => setReport(true)}>
              Monthly report
            </Button>
          }
        />
        <FilterBar filters={filters} onChange={setFilters} siteLabel={scope.label} restricted={scope.restricted} />
        {board.s.n === 0 ? (
          <p className="rounded-2xl border border-line bg-white px-6 py-5 text-sm text-muted" role="status">
            No decisions match these filters in {scope.label}. Clear filters or pick another period.
          </p>
        ) : null}
        <HeadlineFigures figures={board.figures} onOpen={openFigure} />
        <TrendCard board={board} onOpen={(query) => open({ kind: "cases", query })} />
        <Scorecard board={board} onPayer={(payer) => open({ kind: "payer", payer })} onCases={(query) => open({ kind: "cases", query })} />
        <MatrixCard board={board} onCases={(query) => open({ kind: "cases", query })} onPayer={(payer) => open({ kind: "payer", payer })} />
        <ReasonsCard board={board} onOpen={(query) => open({ kind: "cases", query })} />
        <SiteCard board={board} onOpen={(query) => open({ kind: "cases", query })} />
        <Breakdowns board={board} workload={workload} scopeWords={scopeWords} dismissed={dismissed} onOpen={(query) => open({ kind: "cases", query })} />
        <PanelsHost stack={stack} scoped={scoped} filters={filters} scope={scope} onOpen={open} onClose={close} />
        {report ? <ReportModal input={rep} onClose={() => setReport(false)} /> : null}
      </Page>
    </PanelContext.Provider>
  );
}
