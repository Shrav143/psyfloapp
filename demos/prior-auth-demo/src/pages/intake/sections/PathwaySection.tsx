import { useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { PERIOD_LABEL, periodOf } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { useIntakeNow } from "../lib/policyNow";
import { PathwayCard } from "../pathway/PathwayCard";
import { AddPathwayModal } from "../pathway/PathwayModals";
import { refreshPathways } from "../pathway/pathwayModel";
import { ReferralPanel } from "../pathway/referral/ReferralPanel";
import { needsTransition, TransitionPlan } from "../pathway/TransitionPlan";

/** Care pathway review and closed-loop referral coordination. Agents suggest options; a clinician selects; staff send referrals. */
export function PathwaySection({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const [adding, setAdding] = useState(false);
  const [referFor, setReferFor] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const svc = serviceById(record.serviceId);
  const period = periodOf(record.serviceId, record.serviceDate, now, !!record.legacy);
  const running = record.tasks.some((t) => t.role === "pathway" && t.action === "Refresh care pathway options" && (t.status === "queued" || t.status === "running"));
  const counts = { review: record.pathways.filter((p) => p.status === "under_review").length, selected: record.pathways.filter((p) => p.status === "selected").length };

  const refresh = () => {
    const clock = useStore.getState().clock;
    const preview = refreshPathways(record, now, clock);
    /* Options to review need a clinician; a refresh that changes nothing ends as Done. */
    const approval = preview.updates.length || preview.added.length ? "required" : "none";
    let taskId: string | null = null;
    taskId = runAgent(record.id, {
      role: "pathway", action: "Refresh care pathway options", section: "pathway", approval, ms: 1400, source: "Record documents, referral and assessment, policy dates",
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
    <div className="space-y-5" data-section="pathway">
      <Card>
        <CardHeader
          title="Care pathways"
          subtitle={`${record.pathways.length} option${record.pathways.length === 1 ? "" : "s"} · ${counts.review} under review · ${counts.selected} selected`}
          right={<Pill tone={period === "transition" ? "mid" : "neutral"}>{PERIOD_LABEL[period]}</Pill>}
        />
        <CardBody className="space-y-3">
          <p className="text-[13px] text-ink2">
            Requested: <b className="text-ink">{svc.label}</b>, planned start {longDate(record.serviceDate)}. Options are for clinical review only. They are not eligibility, medical-necessity or placement decisions.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" icon={Sparkles} loading={running} onClick={refresh}>Care Pathway Agent: refresh options</Button>
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Add an option</Button>
          </div>
        </CardBody>
      </Card>
      {needsTransition(record) ? <TransitionPlan record={record} now={now} /> : null}
      {record.pathways.length ? (
        <div className="space-y-3">
          {record.pathways.map((pw) => <PathwayCard key={pw.id} record={record} pw={pw} now={now} onRefer={refer} />)}
        </div>
      ) : (
        <Card>
          <CardBody className="py-8 text-center">
            <p className="text-[14px] font-semibold text-ink">No care pathway options yet</p>
            <p className="mt-0.5 text-[13px] text-muted">Ask the Care Pathway Agent to suggest options, or add one by hand.</p>
          </CardBody>
        </Card>
      )}
      <div ref={panel} className="scroll-mt-4">
        <ReferralPanel record={record} newFor={referFor} onNewHandled={() => setReferFor(null)} />
      </div>
      {adding ? <AddPathwayModal record={record} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
