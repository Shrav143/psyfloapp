import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button, Dropdown, Page, PageHeader, type Option } from "@/components/ui";
import { PERIODS, PROGRAM_ORDER, PROGRAM_WEIGHTS, type PayerFilter, type PeriodId, type ProgramFilter } from "@/data/analytics";
import { PAYER_OPTIONS } from "@/pages/dashboard/helpers";
import { useStore } from "@/store";
import { Breakdowns } from "./Breakdowns";
import { ApprovalCard, EditsCard, PreventableCard, WorkloadCard } from "./ChartCards";
import { MODEL_NOTE } from "./copy";
import { KeyFigures } from "./KeyFigures";
import { buildView, workloadOf } from "./model";
import { ReportModal } from "./ReportModal";
import { useRipples } from "./useRipples";

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.id, label: p.label }));
const PROGRAM_OPTIONS: Option<ProgramFilter>[] = [{ value: "all", label: "All programs" }, ...PROGRAM_ORDER.map((p) => ({ value: p, label: PROGRAM_WEIGHTS[p].label }))];

/** Analytics: the four figures that matter, three charts, and the detail folded away. Every figure follows Period, Payer and Program. */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodId>("quarter");
  const [payer, setPayer] = useState<PayerFilter>("all");
  const [program, setProgram] = useState<ProgramFilter>("all");
  const [report, setReport] = useState(false);
  const ripples = useRipples();
  const requests = useStore((s) => s.requests);
  const v = useMemo(() => buildView(period, payer, program, ripples), [period, payer, program, ripples]);
  const work = useMemo(() => workloadOf(requests, payer, program), [requests, payer, program]);
  const narrowed = payer !== "all" || program !== "all";

  return (
    <Page>
      <PageHeader
        title="Analytics"
        sub={
          <>
            <span>Where approvals are won and lost, and whether FLO's advice is working.</span>
            <span className="mt-1.5 block text-[12.5px]">{MODEL_NOTE}</span>
          </>
        }
        actions={
          <Button icon={FileText} onClick={() => setReport(true)}>
            Monthly report
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filters">
        <Dropdown ariaLabel="Period" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
        <Dropdown ariaLabel="Payer" value={payer} defaultValue="all" options={PAYER_OPTIONS} onChange={setPayer} menuWidth={250} />
        <Dropdown ariaLabel="Program" value={program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={setProgram} menuWidth={230} />
        {narrowed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPayer("all");
              setProgram("all");
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <KeyFigures v={v} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ApprovalCard v={v} />
        <PreventableCard v={v} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EditsCard v={v} />
        <WorkloadCard handled={work.handled} open={work.open} needsYou={work.needsYou} scope={`${v.scope} · ${v.programLabel}`} />
      </div>

      <Breakdowns v={v} />

      {report ? <ReportModal view={v} onClose={() => setReport(false)} /> : null}
    </Page>
  );
}
