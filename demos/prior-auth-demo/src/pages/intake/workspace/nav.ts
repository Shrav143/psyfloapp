import { LEVEL_LABEL, type AssessmentPlan, type InstrumentStatus, type Level, type ModuleId } from "@/data/assess/types";
import { sectionParam, WORKSPACE_LABEL, type WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { paths } from "@/routes";
import { sectionState, type SectionState } from "../lib/status";
import { moduleStatus, planItems, instrumentProgress } from "./modules";
import { signoffModel } from "./signoff";

/* The left navigation of the workspace, from the record and its plan. The instruments listed are exactly the modules in use for this intake that are not
   core (a program's assessments, dynamic per program); everything else is one fixed item. Pure, so the same record always gives the same list. */

export type NavState = "not_started" | "in_progress" | "awaiting_review" | "complete" | "attention" | "na";
export const NAV_STATE_LABEL: Record<NavState, string> = { not_started: "Not started", in_progress: "In progress", awaiting_review: "Awaiting review", complete: "Complete", attention: "Needs attention", na: "Not applicable" };

export interface NavItem {
  /** "overview", "referral", "patient", ... or "m:<moduleId>" for an instrument. */
  id: string;
  label: string;
  target: WorkspaceTarget;
  /** null: the item has no completion (Overview, Documents, Activity). */
  state: NavState | null;
  /** The state in words ("Signed" for a signed module, "Complete" for a finished section). */
  stateLabel: string;
  /** One short line under the label: a level, a count. */
  detail?: string;
  level?: Level;
  /** Module shown for preparation: it starts after the policy date. */
  preparation?: boolean;
  /** An assessment instrument, listed under Assessment instruments. */
  child?: boolean;
}

const FROM_INSTRUMENT: Record<InstrumentStatus, NavState> = { not_started: "not_started", in_progress: "in_progress", awaiting_review: "awaiting_review", signed: "complete", superseded: "in_progress" };
const FROM_SECTION: Record<SectionState, NavState> = { done: "complete", attention: "attention", todo: "not_started", na: "na" };

/** The state of a module as the navigation shows it. */
export const moduleNavState = (r: IntakeRecord, id: ModuleId): NavState => FROM_INSTRUMENT[moduleStatus(r, id)];

const worst = (a: NavState, b: NavState): NavState => {
  const order: NavState[] = ["attention", "in_progress", "not_started", "complete", "na"];
  return order.indexOf(a) <= order.indexOf(b) ? a : b;
};

export function workspaceNav(r: IntakeRecord, plan: AssessmentPlan | null, now = 0): NavItem[] {
  const top = (section: keyof typeof WORKSPACE_LABEL, state: NavState | null, detail?: string, stateWord?: string): NavItem => ({
    id: section, label: WORKSPACE_LABEL[section], target: { section }, state, stateLabel: state ? (stateWord ?? NAV_STATE_LABEL[state]) : "", detail,
  });
  const items = planItems(r, plan);
  const prog = instrumentProgress(r, plan);
  const so = signoffModel(r, plan);

  const assess: NavState = r.assessment.status === "signed" ? "complete" : r.assessment.status;
  const profile = sectionState(r, "profile", now);
  const coverage = sectionState(r, "coverage", now);
  const patient = worst(FROM_SECTION[profile], FROM_SECTION[coverage]);
  const care: NavState = r.carePlan?.status === "approved" ? "complete" : r.carePlan?.status === "draft" || r.pathways.some((p) => p.status === "selected") ? "in_progress" : "not_started";
  const signoff: NavState = so.state === "signed" ? "complete" : so.state === "ready" ? "awaiting_review" : so.signed > 0 ? "in_progress" : "not_started";

  const out: NavItem[] = [
    top("overview", null),
    top("referral", FROM_SECTION[sectionState(r, "referral", now)]),
    top("patient", patient),
    top("clinical", assess, undefined, r.assessment.status === "signed" ? "Signed" : undefined),
  ];
  out.push({ ...top("instrument", null, r.config ? `${items.length} in this plan` : "Not configured"), id: "instrument" });
  for (const i of items) {
    const state = FROM_INSTRUMENT[i.status];
    out.push({
      id: `m:${i.id}`, label: i.label, target: { section: "instrument", module: i.id }, state, stateLabel: i.status === "signed" ? "Signed" : NAV_STATE_LABEL[state],
      level: i.level, detail: LEVEL_LABEL[i.level], preparation: i.preparation, child: true,
    });
  }
  out.push(
    top("signoff", signoff, so.total ? `${so.signed} of ${so.total} signed` : undefined, so.state === "signed" ? "Signed" : so.state === "ready" ? "Ready to sign" : undefined),
    top("care", care, undefined, r.carePlan?.status === "approved" ? "Approved" : undefined),
    top("documents", null, `${r.documents.length} on file`),
    top("activity", null),
  );
  return out;
}

/** The address of a section of a record's workspace. */
export const workspaceHref = (recordId: string, t: WorkspaceTarget): string => paths.intakeRecord(recordId, sectionParam(t));

/** The item a target selects: instruments by module, everything else by section. */
export const navIdOf = (t: WorkspaceTarget): string => (t.section === "instrument" && t.module ? `m:${t.module}` : t.section);
