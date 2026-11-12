import { useMemo, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { optionViews } from "@/data/assess/carePlan";
import type { IntakeRecord } from "@/data/intake/types";
import { PERIOD_LABEL, periodOf } from "@/data/va/policy";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { useIntakeNow } from "../lib/policyNow";
import { OngoingCareCard } from "../workspace/overview/OngoingCareCard";
import { AddPathwayModal } from "../pathway/PathwayModals";
import { refreshPathways } from "../pathway/pathwayModel";
import { ReferralPanel } from "../pathway/referral/ReferralPanel";
import { needsTransition, TransitionPlan } from "../pathway/TransitionPlan";
import { GateCard } from "./GateCard";
import { OptionCard } from "./OptionCard";
import { PlanForm } from "./PlanForm";
import { SelectionNote } from "./SelectionNote";
import { SummaryCard } from "./SummaryCard";

/** Care planning: the clinical summary, the service options, the care plan and the way into an authorization. A clinician selects the service and approves the plan; the options carry no recommendation. */
export function CarePlanningSection({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const [adding, setAdding] = useState(false);
  const [referFor, setReferFor] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const views = useMemo(() => optionViews(record, now), [record, now]);
  const locked = record.carePlan?.status === "approved";
  const period = periodOf(record.serviceId, record.serviceDate, now, !!record.legacy);
  const running = record.tasks.some((t) => t.role === "pathway" && t.action === "Refresh care pathway options" && (t.status === "queued" || t.status === "running"));
  const considered = views.filter((v) => v.considered).length;

  const refresh = () => {
    const preview = refreshPathways(record, now, useStore.getState().clock);
    let taskId: string | null = null;
    taskId = runAgent(record.id, {
      role: "pathway", action: "Refresh care pathway options", section: "pathway", approval: preview.updates.length || preview.added.length ? "required" : "none", ms: 1400, source: "Record documents, referral and assessment, policy dates",
      work: () => {
        const s = useStore.getState();
        const r = s.intakes.find((x) => x.id === record.id);
        if (!r) return "The record was not found.";
        const res = refreshPathways(r, now, s.clock);
        s.applyPathwayRefresh(record.id, res.updates, res.added);
        if (taskId && (res.updates.length || res.added.length)) s.updateIntakeTask(record.id, taskId, { gate: { kind: "pathway" } });
        return res.summary;
      },
    });
  };
  const refer = (pwId: string) => {
    setReferFor(pwId);
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5" data-section="care">
      <Card>
        <CardHeader title="Care planning" subtitle="A clinician selects the service and approves the plan. Psyflo ranks nothing and decides nothing." right={<Pill tone={period === "transition" ? "mid" : "neutral"}>{PERIOD_LABEL[period]}</Pill>} />
      </Card>
      <SummaryCard record={record} />

      <section aria-labelledby="options-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h3 id="options-heading" className="font-serif text-[18px] font-semibold leading-tight tracking-tight">Service options</h3>
            <p className="mt-0.5 text-[13px] text-muted">{views.length} {views.length === 1 ? "option" : "options"} · {considered} considered · options are for clinical review, not a placement decision</p>
          </div>
          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={Sparkles} loading={running} onClick={refresh}>Care Pathway Agent: refresh options</Button>
              <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Add an option</Button>
            </div>
          ) : null}
        </div>
        <SelectionNote record={record} />
        {needsTransition(record) ? <TransitionPlan record={record} now={now} /> : null}
        {views.length ? views.map((v) => <OptionCard key={v.pw.id} record={record} view={v} now={now} locked={locked} onRefer={refer} />) : (
          <Card>
            <CardBody className="py-8 text-center">
              <p className="text-[14px] font-semibold text-ink">No service options yet</p>
              <p className="mt-0.5 text-[13px] text-muted">Ask the Care Pathway Agent to list options from the record, or add one by hand.</p>
            </CardBody>
          </Card>
        )}
      </section>

      <PlanForm record={record} />
      <div ref={panel} id="referrals-out" className="scroll-mt-4">
        <ReferralPanel record={record} newFor={referFor} onNewHandled={() => setReferFor(null)} />
      </div>
      <OngoingCareCard record={record} />
      <GateCard record={record} now={now} />
      {adding ? <AddPathwayModal record={record} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
