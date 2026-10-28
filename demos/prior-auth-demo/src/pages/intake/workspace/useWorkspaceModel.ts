import { createContext, useContext, useMemo } from "react";
import { dualReadiness, type DualReadinessX } from "@/data/assess/readiness";
import type { AssessmentPlan } from "@/data/assess/types";
import { completeness, readiness, type CheckItem } from "@/data/intake/checklist";
import type { IntakeRecord } from "@/data/intake/types";
import { selectPatientBook } from "@/store/patients";
import { useStore } from "@/store";
import { needsOf, type Need } from "../assistant/needs";
import { useIntakeNow } from "../lib/policyNow";
import { usePlan } from "../lib/usePlan";
import { workspaceNav, type NavItem } from "./nav";
import { nextActionOf, type NextAction } from "./nextAction";
import { authorizationState, headerProgress, type AuthState, type ProgressCell } from "./progress";
import { signoffModel, type SignoffModel } from "./signoff";

/* Everything the workspace derives from one record, computed once per change and shared by the header, the navigation, the Overview and Review & sign-off,
   so every part of the page agrees. */
export interface WorkspaceModel {
  record: IntakeRecord;
  now: number;
  plan: AssessmentPlan | null;
  items: CheckItem[];
  readiness: DualReadinessX;
  signoff: SignoffModel;
  next: NextAction;
  nav: NavItem[];
  cells: ProgressCell[];
  needs: Need[];
  auth: AuthState;
}

export function useWorkspaceModel(record: IntakeRecord): WorkspaceModel {
  const now = useIntakeNow();
  const plan = usePlan(record);
  const book = useStore(selectPatientBook);
  return useMemo(() => {
    const items = completeness(record, now);
    const rd = dualReadiness(record, now);
    const so = signoffModel(record, plan);
    const auth = authorizationState(record, book);
    return {
      record, now, plan, items, readiness: rd, signoff: so, auth,
      next: nextActionOf(record, plan, so),
      nav: workspaceNav(record, plan, now),
      cells: headerProgress(record, plan, items, rd, auth),
      needs: needsOf(record, readiness(record, now), now),
    };
  }, [record, plan, now, book]);
}

export const WorkspaceModelContext = createContext<WorkspaceModel | null>(null);
/** The model of the workspace the section is drawn in. */
export function useModel(): WorkspaceModel {
  const m = useContext(WorkspaceModelContext);
  if (!m) throw new Error("useModel needs a workspace around it");
  return m;
}
