import type { WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { ActivitySection } from "../sections/ActivitySection";
import { AssessmentSection } from "../sections/AssessmentSection";
import { DocumentsSection } from "../sections/DocumentsSection";
import { OverviewSection } from "../sections/OverviewSection";
import { PatientCoverageSection } from "../sections/PatientCoverageSection";
import { ReferralSection } from "../sections/ReferralSection";
import { SignoffSection } from "../sections/SignoffSection";
import { CarePlanningSection } from "../care/CarePlanningSection";
import { InstrumentsIndex, InstrumentView } from "./InstrumentView";
import type { WorkspaceModel } from "./useWorkspaceModel";

/** The section the address names, drawn by the section that owns it. Each gets `{ record }` (an instrument also its module). */
export function SectionView({ record, target, model, go, onConfigure }: { record: IntakeRecord; target: WorkspaceTarget; model: WorkspaceModel; go: (t: WorkspaceTarget) => void; onConfigure: () => void }) {
  const open = (name: WorkspaceTarget) => () => go(name);
  switch (target.section) {
    case "overview": return <OverviewSection record={record} go={go} onConfigure={onConfigure} />;
    case "referral": return <div data-section-view="referral"><ReferralSection record={record} /></div>;
    case "patient": return <PatientCoverageSection record={record} tab={target.tab} />;
    case "clinical": return <div data-section-view="clinical"><AssessmentSection record={record} /></div>;
    case "instrument":
      return target.module
        ? <InstrumentView record={record} moduleId={target.module} inPlan={model.nav.some((i) => i.id === `m:${target.module}`)} go={open({ section: "overview" })} />
        : <InstrumentsIndex record={record} items={model.nav} />;
    case "signoff": return <SignoffSection record={record} onConfigure={onConfigure} />;
    case "care": return <div data-section-view="care"><CarePlanningSection record={record} /></div>;
    case "documents": return <DocumentsSection record={record} />;
    case "activity": return <ActivitySection record={record} />;
  }
}
