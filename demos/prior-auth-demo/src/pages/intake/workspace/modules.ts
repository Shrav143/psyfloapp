import { isCoreModule, moduleById } from "@/data/assess/modules";
import { activeModules } from "@/data/assess/plan";
import type { AssessmentPlan, InstrumentStatus, Level, ModuleId, ModuleKind } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";

/* What the workspace knows about the modules of one intake: which are in use, where each stands, and who signed it. Pure: the left navigation, the
   header, the Overview and Review & sign-off all read these, so they always agree. The CANS and Level of Need modules keep their own records
   (`record.cans`, `record.lon`); an instrument instance for them, when there is one, counts too, and the further along of the two wins. */

export const STATUS_RANK: InstrumentStatus[] = ["not_started", "in_progress", "awaiting_review", "signed"];
const further = (a: InstrumentStatus, b: InstrumentStatus): InstrumentStatus => (STATUS_RANK.indexOf(a) >= STATUS_RANK.indexOf(b) ? a : b);
/** A superseded instance is an earlier version; the current one carries its own status. */
const ofInstance = (s: InstrumentStatus | undefined): InstrumentStatus => (s === undefined ? "not_started" : s === "superseded" ? "in_progress" : s);

function cansStatus(r: IntakeRecord): InstrumentStatus {
  const s = r.cans?.status;
  return s === "signed" ? "signed" : s === "ready_for_review" ? "awaiting_review" : s === "in_progress" ? "in_progress" : "not_started";
}
function lonStatus(r: IntakeRecord): InstrumentStatus {
  const s = r.lon?.status;
  return s === "dispositioned" ? "signed" : s === "in_review" ? "in_progress" : "not_started";
}

export function moduleStatus(r: IntakeRecord, id: ModuleId): InstrumentStatus {
  const own = ofInstance(r.instruments?.[id]?.status);
  return id === "cans" ? further(own, cansStatus(r)) : id === "lon" ? further(own, lonStatus(r)) : own;
}

export interface Signature { by: string; at: number; version: number; rolePlay?: boolean }
export function moduleSignature(r: IntakeRecord, id: ModuleId): Signature | null {
  const inst = r.instruments?.[id];
  if (inst?.status === "signed" && inst.signedBy && inst.signedAt !== undefined) return { by: inst.signedBy, at: inst.signedAt, version: inst.version, rolePlay: inst.rolePlay };
  if (id === "cans" && r.cans?.status === "signed" && r.cans.signedBy && r.cans.signedAt !== undefined) return { by: r.cans.signedBy, at: r.cans.signedAt, version: 1 };
  if (id === "lon" && r.lon?.status === "dispositioned" && r.lon.decidedBy && r.lon.decidedAt !== undefined) return { by: r.lon.decidedBy, at: r.lon.decidedAt, version: 1, rolePlay: r.lon.rolePlay };
  return null;
}

/** One module in use: a section of the plan that is not one of the core modules (those are the workspace's own sections). */
export interface PlanItem {
  id: ModuleId;
  label: string;
  kind: ModuleKind;
  level: Level;
  /** In the plan, as opposed to added by a person. */
  planned: boolean;
  /** Every source takes effect after the policy date: shown for preparation, it does not hold up readiness or sign-off. */
  preparation: boolean;
  status: InstrumentStatus;
}

/** The assessment instruments of an intake: the active modules that are not core, in the plan's order. */
export function planItems(r: IntakeRecord, plan: AssessmentPlan | null): PlanItem[] {
  if (!r.config || !plan) return [];
  return activeModules(plan, r.config.modules)
    .filter((m) => !isCoreModule(m.id))
    .map((m) => ({ id: m.id, label: m.label, kind: moduleById(m.id).kind, level: m.level, planned: m.planned, preparation: plan.modules.find((x) => x.id === m.id)?.preparation ?? false, status: moduleStatus(r, m.id) }));
}

/** Required and not preparation: what has to be signed before the assessment is done. */
export const holdsUp = (i: PlanItem): boolean => i.level === "required" && !i.preparation;

export interface InstrumentProgress { signed: number; total: number; items: PlanItem[] }
export function instrumentProgress(r: IntakeRecord, plan: AssessmentPlan | null): InstrumentProgress {
  const required = planItems(r, plan).filter(holdsUp);
  return { signed: required.filter((i) => i.status === "signed").length, total: required.length, items: required };
}

/** The required assessments: the clinical assessment and every required instrument in use (not preparation), and how many are signed. One definition for the header,
    Review & sign-off (its subtitle and the left navigation), the status reason and the worklist's Assessment column, so they never give two numbers for one record.
    Zero when the intake is not configured. The overall sign-off is not one of them: it comes after them. */
export function assessmentProgress(r: IntakeRecord, plan: AssessmentPlan | null): { signed: number; total: number } {
  if (!r.config) return { signed: 0, total: 0 };
  const inst = instrumentProgress(r, plan);
  return { signed: inst.signed + (r.assessment.status === "signed" ? 1 : 0), total: inst.total + 1 };
}

/** Pending evidence across the instruments: one entry per module that has some. */
export function pendingEvidence(r: IntakeRecord): { moduleId: ModuleId; count: number }[] {
  return Object.values(r.instruments ?? {})
    .map((i) => ({ moduleId: i.moduleId, count: i.evidence.filter((e) => e.status === "pending").length }))
    .filter((x) => x.count > 0);
}
