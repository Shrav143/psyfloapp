import type { WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { NeedsCard } from "../workspace/overview/NeedsCard";
import { OngoingCareCard } from "../workspace/overview/OngoingCareCard";
import { PlanCard } from "../workspace/overview/PlanCard";
import { ReadinessPanels } from "../workspace/overview/ReadinessPanels";
import { RecentActivity } from "../workspace/overview/RecentActivity";
import { StatusCard } from "../workspace/overview/StatusCard";
import { AuthorizationSummary, CarePlanSummary, ConsentsSummary, ReferralSummary, SafetyStatus } from "../workspace/overview/SummaryCards";
import { useModel } from "../workspace/useWorkspaceModel";

/** The overview: the one place for the whole picture. Where the intake stands and what happens next, what waits on a person, the two readiness tracks,
    the assessment plan with each module's progress, and short summaries of the referral, safety, consents, care plan and authorization. */
export function OverviewSection({ record, go, onConfigure }: { record: IntakeRecord; go: (t: WorkspaceTarget) => void; onConfigure: () => void }) {
  const model = useModel();
  return (
    <div className="@container flex min-w-0 flex-col gap-4" data-section-view="overview">
      <StatusCard model={model} go={go} onConfigure={onConfigure} />
      <NeedsCard model={model} />
      <ReadinessPanels recordId={record.id} readiness={model.readiness} />
      <PlanCard record={record} plan={model.plan} items={model.nav} onConfigure={onConfigure} />
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <ReferralSummary record={record} />
        <SafetyStatus record={record} />
        <ConsentsSummary record={record} />
        <CarePlanSummary record={record} />
      </div>
      <AuthorizationSummary record={record} auth={model.auth} />
      <OngoingCareCard record={record} />
      <RecentActivity record={record} />
    </div>
  );
}
