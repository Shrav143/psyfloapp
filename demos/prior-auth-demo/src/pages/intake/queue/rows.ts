import { effectiveStatus } from "@/data/assess/status";
import { isCoreModule } from "@/data/assess/modules";
import type { AssessmentPlan } from "@/data/assess/types";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";
import { METHOD_LABEL, TRIAGE_LABEL, TRIAGE_ORDER, type IntakeRecord, type TriageStatus } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { planFor } from "@/store/intakePlan";
import { findDuplicates } from "./duplicates";
import { FRAMEWORK_KEYS, FRAMEWORK_LABEL, frameworkOf, type FrameworkKey } from "./framework";
import { nextActionOf, type NextAction } from "./nextAction";
import { allProgramKeys, policyCue, programInfo, programOf, type ProgramInfo } from "./programKey";
import { SOURCE_KINDS, SOURCE_LABEL, sourceKindOf, type SourceKind } from "./sourceKind";
import type { FacetDef } from "./facets";
import type { Tone } from "@/data/types";

/* One row of the Referral Queue and Active Intakes worklists. Built from the record, the policy date and the plan the record's configuration
   produces on that date, so a row re-evaluates when the environment is switched. */

export interface AssessmentCell {
  configured: boolean;
  frameworkKey: FrameworkKey;
  /** Required modules and the clinical assessment, and how many of them are signed. Zero when the intake is not configured. */
  signed: number;
  total: number;
  /** Before the intake is configured: the clinical assessment's own status, when one was started. */
  legacy?: string;
}
export interface IntakeRow {
  id: string;
  record: IntakeRecord;
  status: TriageStatus;
  program: ProgramInfo;
  cue: { text: string; tone: Tone } | null;
  payerName: string | null;
  assessment: AssessmentCell;
  next: NextAction;
  /** Demo minutes of the newest audit event. */
  updatedAt: number;
  source: SourceKind;
  safetyOpen: boolean;
  duplicateOf: string | null;
}

/** The clinical assessment and the required modules in use: what has to be signed before care planning. */
export function progressOf(r: IntakeRecord): { signed: number; total: number } {
  if (!r.config) return { signed: 0, total: 0 };
  const required = r.config.modules.filter((c) => c.state === "active" && c.level === "required" && !isCoreModule(c.id)).map((c) => c.id);
  const signed = (r.assessment.status === "signed" ? 1 : 0) + required.filter((id) => r.instruments?.[id]?.status === "signed").length;
  return { signed, total: required.length + 1 };
}

const LEGACY_ASSESSMENT: Record<IntakeRecord["assessment"]["status"], string | undefined> = { not_started: undefined, in_progress: "Assessment in progress", awaiting_review: "Assessment awaiting review", signed: "Assessment signed" };

export const lastUpdated = (r: IntakeRecord): number => r.audit.reduce((m, e) => Math.max(m, e.at), r.createdAt);

export function buildIntakeRows(records: readonly IntakeRecord[], now: number): IntakeRow[] {
  return records.map((r) => {
    const status = effectiveStatus(r);
    const plan: AssessmentPlan | null = planFor(r, now);
    const program = programOf(r);
    const payer = r.payerId ? vaPlanOf(r.payerId) : undefined;
    const dup = findDuplicates(records.filter((x) => x.id !== r.id), { initials: r.initials, age: r.age, memberLast4: r.coverage.medicaidId?.value })[0];
    return {
      id: r.id, record: r, status, program, cue: policyCue(program.serviceId, now), payerName: payer?.name ?? null,
      assessment: { configured: !!r.config, frameworkKey: frameworkOf(r, plan), ...progressOf(r), legacy: r.config ? undefined : LEGACY_ASSESSMENT[r.assessment.status] },
      next: nextActionOf(r, status, plan), updatedAt: lastUpdated(r), source: sourceKindOf(r.sourceOrg),
      safetyOpen: r.safety?.status === "open", duplicateOf: dup?.record.id ?? null,
    };
  });
}

/** Open safety alerts first, then the status order, then the oldest referral. */
export function defaultOrder(a: IntakeRow, b: IntakeRow): number {
  if (a.safetyOpen !== b.safetyOpen) return a.safetyOpen ? -1 : 1;
  const s = TRIAGE_ORDER.indexOf(a.status) - TRIAGE_ORDER.indexOf(b.status);
  return s || a.record.createdAt - b.record.createdAt || a.id.localeCompare(b.id);
}

export function searchTextOf(row: IntakeRow): string {
  const r = row.record;
  const svc = serviceById(r.serviceId);
  return [r.id, r.initials, r.sourceOrg, svc.label, svc.short, svc.code ?? "", row.program.label, METHOD_LABEL[r.method], TRIAGE_LABEL[row.status], row.payerName ?? ""].join(" ");
}

/** The filters of the Referral Queue and Active Intakes. `statuses` limits the status choices (Active Intakes lists only the four that follow the work). */
export function intakeFacets(statuses: readonly TriageStatus[] = TRIAGE_ORDER): FacetDef<IntakeRow>[] {
  const opt = (value: string, label: string, group?: string) => ({ value, label, group });
  return [
    {
      id: "program", label: "Program", allLabel: "All programs", primary: true, menuWidth: 280,
      values: (r) => [r.program.key],
      options: () => allProgramKeys().map((k) => { const p = programInfo(k); return opt(k, p.label, p.group); }),
    },
    { id: "status", label: "Intake status", allLabel: "All statuses", primary: true, always: true, values: (r) => [r.status], options: () => statuses.map((t) => opt(t, TRIAGE_LABEL[t])) },
    { id: "framework", label: "Assessment framework", allLabel: "Any framework", primary: true, always: true, menuWidth: 240, values: (r) => [r.assessment.frameworkKey], options: () => FRAMEWORK_KEYS.map((k) => opt(k, FRAMEWORK_LABEL[k])) },
    {
      id: "payer", label: "Payer", allLabel: "All payers", primary: true, menuWidth: 300,
      values: (r) => [r.record.payerId ?? "none"],
      options: () => [...VA_PLANS.map((p) => opt(p.payerId, p.name)), opt("none", "Plan not confirmed")],
    },
    { id: "site", label: "Site", allLabel: "All sites", values: (r) => [r.record.site], options: () => (["A", "B"] as const).map((s) => opt(s, siteName(s))) },
    { id: "staff", label: "Assigned to", allLabel: "Anyone", values: (r) => [r.record.assignedTo], options: () => INTAKE_STAFF.map((s) => opt(s.id, s.name)) },
    {
      id: "age", label: "Age group", allLabel: "Adult and youth",
      values: (r) => [r.record.age === null ? "unknown" : r.record.age < 18 ? "youth" : "adult"],
      options: () => [opt("adult", "Adult (18 and over)"), opt("youth", "Youth (under 18)"), opt("unknown", "Age not recorded")],
    },
    { id: "source", label: "Referral source", allLabel: "All sources", values: (r) => [r.source], options: () => SOURCE_KINDS.map((k) => opt(k, SOURCE_LABEL[k])) },
  ];
}

export const staffName = (id: string): string => staffOf(id)?.name ?? "Unassigned";
