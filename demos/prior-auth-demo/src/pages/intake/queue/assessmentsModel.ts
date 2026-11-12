import { moduleCompletion } from "@/data/assess/completion";
import { isCoreModule, moduleById } from "@/data/assess/modules";
import { sectionParam } from "@/data/assess/nav";
import { INSTRUMENT_STATUS_LABEL, LEVEL_LABEL, type InstrumentStatus, type Level, type ModuleId, type ModuleKind } from "@/data/assess/types";
import { INTAKE_STAFF } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { paths } from "@/routes";
import { planFor } from "@/store/intakePlan";
import { FRAMEWORK_KEYS, FRAMEWORK_LABEL, frameworkOf, type FrameworkKey } from "./framework";
import type { FacetDef } from "./facets";
import { lastUpdated, staffName } from "./rows";

/* One row per assessment across the intakes: the clinical assessment of each intake that has one, and every module the intake's configuration has in
   use. A row says who holds it and how far along it is; opening it goes to that module in the intake's workspace. */

export const CLINICAL = "clinical";

/** The statuses a row can be in, in the order a coordinator wants them: what waits for a person first. */
export const ASSESSMENT_STATUS_ORDER: InstrumentStatus[] = ["awaiting_review", "in_progress", "not_started", "signed"];
export const KIND_LABEL: Record<ModuleKind, string> = { section: "Documentation", framework: "Framework", instrument: "Instrument", review: "Review" };

export interface AssessmentRow {
  key: string;
  record: IntakeRecord;
  /** A module id, or "clinical" for the intake's clinical assessment. */
  moduleId: ModuleId | typeof CLINICAL;
  label: string;
  kind: string;
  level: Level | null;
  frameworkKey: FrameworkKey;
  status: InstrumentStatus;
  version: number;
  /** Who holds it: the signer or reviewer when there is one, otherwise the person assigned to the intake. */
  assignee: string;
  /** Demo minutes of the last change, or null for a module nobody has started. */
  updatedAt: number | null;
  /** Share of the required fields filled in. Null for the clinical assessment. */
  percent: number | null;
  to: string;
}

export function buildAssessmentRows(records: readonly IntakeRecord[], now: number): AssessmentRow[] {
  const rows: AssessmentRow[] = [];
  for (const r of records) {
    const plan = planFor(r, now);
    const frameworkKey = frameworkOf(r, plan);
    const a = r.assessment;
    if (r.config || a.status !== "not_started") {
      const stamps = [...Object.values(a.fields).map((f) => f.at), a.attestation?.at ?? 0].filter((t) => t > 0);
      rows.push({
        key: `${r.id}:${CLINICAL}`, record: r, moduleId: CLINICAL, label: "Clinical assessment", kind: "Documentation", level: r.config ? "required" : null, frameworkKey, status: a.status,
        version: (a.amendments?.length ?? 0) + 1, assignee: a.attestation?.by ?? r.assignedTo, updatedAt: stamps.length ? Math.max(...stamps) : a.status === "not_started" ? null : lastUpdated(r), percent: null, to: paths.intakeRecord(r.id, "clinical"),
      });
    }
    if (!r.config) continue;
    for (const c of r.config.modules) {
      if (c.state !== "active" || isCoreModule(c.id)) continue;
      const inst = r.instruments?.[c.id];
      const def = moduleById(c.id);
      rows.push({
        key: `${r.id}:${c.id}`, record: r, moduleId: c.id, label: plan?.modules.find((m) => m.id === c.id)?.label ?? def.label, kind: KIND_LABEL[def.kind], level: c.level, frameworkKey,
        status: inst?.status ?? "not_started", version: inst?.version ?? 1, assignee: inst?.signedBy ?? inst?.reviewedBy ?? r.assignedTo, updatedAt: inst ? inst.updatedAt : null,
        percent: moduleCompletion(c.id, inst).percent, to: paths.intakeRecord(r.id, sectionParam({ section: "instrument", module: c.id })),
      });
    }
  }
  return rows;
}

export function assessmentOrder(a: AssessmentRow, b: AssessmentRow): number {
  const s = ASSESSMENT_STATUS_ORDER.indexOf(a.status) - ASSESSMENT_STATUS_ORDER.indexOf(b.status);
  return s || (a.record.initials || "~").localeCompare(b.record.initials || "~") || a.record.id.localeCompare(b.record.id) || (a.moduleId === CLINICAL ? -1 : b.moduleId === CLINICAL ? 1 : 0);
}

export const assessmentSearchText = (r: AssessmentRow): string => [r.record.id, r.record.initials, r.label, r.kind, FRAMEWORK_LABEL[r.frameworkKey], INSTRUMENT_STATUS_LABEL[r.status], staffName(r.assignee)].join(" ");

export function assessmentFacets(): FacetDef<AssessmentRow>[] {
  const opt = (value: string, label: string) => ({ value, label });
  return [
    { id: "framework", label: "Assessment framework", allLabel: "Any framework", primary: true, always: true, values: (r) => [r.frameworkKey], options: () => FRAMEWORK_KEYS.map((k) => opt(k, FRAMEWORK_LABEL[k])) },
    { id: "status", label: "Status", allLabel: "All statuses", primary: true, always: true, values: (r) => [r.status], options: () => ASSESSMENT_STATUS_ORDER.map((s) => opt(s, INSTRUMENT_STATUS_LABEL[s])) },
    {
      id: "module", label: "Assessment", allLabel: "All assessments", primary: true, menuWidth: 300, values: (r) => [r.moduleId],
      options: (rows) => {
        const seen = new Map<string, string>();
        for (const r of rows) if (!seen.has(r.moduleId)) seen.set(r.moduleId, r.label);
        return [...seen.entries()].sort((x, y) => (x[0] === CLINICAL ? -1 : y[0] === CLINICAL ? 1 : x[1].localeCompare(y[1]))).map(([v, l]) => opt(v, l));
      },
    },
    { id: "staff", label: "Assigned to", allLabel: "Anyone", primary: true, values: (r) => [r.assignee], options: () => INTAKE_STAFF.map((s) => opt(s.id, s.name)) },
    { id: "level", label: "Requirement", allLabel: "Any requirement", values: (r) => [r.level ?? "none"], options: () => [opt("required", LEVEL_LABEL.required), opt("recommended", LEVEL_LABEL.recommended), opt("optional", LEVEL_LABEL.optional), opt("none", "Not configured")] },
    { id: "site", label: "Site", allLabel: "All sites", values: (r) => [r.record.site], options: () => (["A", "B"] as const).map((s) => opt(s, siteName(s))) },
  ];
}
