import { INSTRUMENT_STATUS_LABEL, type AssessmentPlan, type InstrumentStatus, type Level, type ModuleId } from "@/data/assess/types";
import type { WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { holdsUp, moduleSignature, pendingEvidence, planItems, type Signature } from "./modules";

/* Review & sign-off: every required module with its signature, what stands between the person and the overall sign-off, and the sign-off itself.
   The overall sign-off is the signature on the "review-signoff" instance (so it has versions and an amendment like any other). Pure. */

export interface SignoffRow {
  key: string;
  /** "assessment" is the clinical assessment (the core clinical modules); "module" is one assessment instrument. */
  kind: "assessment" | "module";
  moduleId?: ModuleId;
  label: string;
  level: Level;
  status: InstrumentStatus;
  /** Shown for preparation: it does not hold up the sign-off. */
  preparation: boolean;
  /** Counts toward the sign-off. */
  required: boolean;
  signature: Signature | null;
  /** Earlier versions kept after an amendment. */
  earlier: number;
  to: WorkspaceTarget;
}
export interface Blocker { id: string; text: string; to?: WorkspaceTarget; configure?: boolean }
export type SignoffState = "signed" | "ready" | "blocked" | "stale";
export interface SignoffModel {
  rows: SignoffRow[];
  blockers: Blocker[];
  state: SignoffState;
  signed: number;
  total: number;
  /** The overall sign-off, when there is one. */
  overall: Signature | null;
  overallVersions: number;
}

export const OVERALL_MODULE: ModuleId = "review-signoff";

export function signoffModel(r: IntakeRecord, plan: AssessmentPlan | null): SignoffModel {
  const a = r.assessment;
  const asSigned = a.status === "signed" && a.attestation;
  const rows: SignoffRow[] = [{
    key: "assessment", kind: "assessment", label: "Clinical assessment", level: "required", required: true, preparation: false,
    status: a.status === "signed" ? "signed" : a.status === "awaiting_review" ? "awaiting_review" : a.status === "in_progress" ? "in_progress" : "not_started",
    signature: asSigned && a.attestation ? { by: a.attestation.by, at: a.attestation.at, version: 1 + (a.amendments?.length ?? 0), rolePlay: a.attestation.rolePlay } : null,
    earlier: a.amendments?.length ?? 0, to: { section: "clinical" },
  }];
  for (const i of planItems(r, plan)) {
    rows.push({
      key: i.id, kind: "module", moduleId: i.id, label: i.label, level: i.level, required: holdsUp(i), preparation: i.preparation, status: i.status,
      signature: moduleSignature(r, i.id), earlier: r.instruments?.[i.id]?.history.length ?? 0, to: { section: "instrument", module: i.id },
    });
  }

  const blockers: Blocker[] = [];
  if (!r.config) blockers.push({ id: "config", text: "The intake is not configured, so no required assessments are loaded", configure: true });
  if (r.safety?.status === "open") blockers.push({ id: "safety", text: "A safety alert is open. A clinician reviews it first", to: { section: "clinical" } });
  for (const row of rows) {
    if (row.required && row.status !== "signed") blockers.push({ id: row.key, text: `${row.label} is not signed (${INSTRUMENT_STATUS_LABEL[row.status].toLowerCase()})`, to: row.to });
  }
  for (const p of pendingEvidence(r)) {
    const row = rows.find((x) => x.moduleId === p.moduleId);
    blockers.push({ id: `evidence-${p.moduleId}`, text: `${row?.label ?? p.moduleId}: ${p.count} ${p.count === 1 ? "piece of evidence waits" : "pieces of evidence wait"} for a decision`, to: { section: "instrument", module: p.moduleId } });
  }

  const required = rows.filter((x) => x.required);
  const inst = r.instruments?.[OVERALL_MODULE];
  const overall = inst?.status === "signed" && inst.signedBy && inst.signedAt !== undefined ? { by: inst.signedBy, at: inst.signedAt, version: inst.version, rolePlay: inst.rolePlay } : null;
  return {
    rows, blockers, signed: required.filter((x) => x.status === "signed").length, total: required.length, overall, overallVersions: inst?.history.length ?? 0,
    state: overall ? (blockers.length ? "stale" : "signed") : blockers.length ? "blocked" : "ready",
  };
}
