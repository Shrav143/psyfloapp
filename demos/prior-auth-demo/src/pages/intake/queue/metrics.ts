import { FIELD_SPECS, isRequired, type FieldSpec } from "@/data/intake/fields";
import type { FieldValue, IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { serviceById } from "@/data/va/services";
import { HOUR } from "@/lib/time";
import { CLOSED_TRIAGE } from "./labels";

/* The eight operational figures at the top of the Intake queue. Each is a plain test on one record, so a tile's count and the rows it
   filters to are always the same set. Closed, declined and redirected intakes count only as new referrals: nothing else is left to do on them. */

export type MetricId = "new" | "triage" | "assessing" | "missing" | "review" | "handoff" | "awaiting" | "priority";

/** Values that mean the item is still outstanding, even though the field holds a word. */
const OUTSTANDING_VALUES = ["Needed", "Not obtained"];

const fieldOf = (r: IntakeRecord, spec: FieldSpec): FieldValue | undefined => r[spec.section][spec.key];
export const isMissingValue = (fv: FieldValue | undefined): boolean =>
  !fv || fv.state === "not_collected" || (!fv.value.trim() && fv.state !== "not_applicable") || OUTSTANDING_VALUES.includes(fv.value);

/** The required fields (for this person and service) that are missing or still outstanding. */
export function missingRequired(r: IntakeRecord, section?: FieldSpec["section"]): FieldSpec[] {
  const ctx = { age: r.age, schoolBased: serviceById(r.serviceId).setting === "school" };
  return FIELD_SPECS.filter((s) => (!section || s.section === section) && isRequired(s, ctx) && isMissingValue(fieldOf(r, s)));
}

/** Required documents not attached to a referral this intake is sending out. */
export const missingReferralDocs = (r: IntakeRecord): string[] => r.referralsOut.flatMap((o) => o.docs.filter((d) => d.required && !d.attached).map((d) => d.name));

const open = (r: IntakeRecord) => !CLOSED_TRIAGE.includes(r.triage);

export interface MetricDef {
  id: MetricId;
  label: string;
  /** One muted line under the figure. */
  sub: string;
  tone: Tone;
  test: (r: IntakeRecord, clock: number) => boolean;
}

export const METRICS: MetricDef[] = [
  { id: "new", label: "New referrals", sub: "Last 48 hours", tone: "neutral", test: (r, clock) => r.createdAt >= clock - 48 * HOUR },
  { id: "triage", label: "Awaiting triage", sub: "Status New", tone: "mid", test: (r) => r.triage === "new" },
  { id: "assessing", label: "Assessments in progress", sub: "Started, not signed", tone: "neutral", test: (r) => open(r) && r.assessment.status === "in_progress" },
  { id: "missing", label: "Missing documentation", sub: "Required items", tone: "mid", test: (r) => open(r) && (missingRequired(r).length > 0 || missingReferralDocs(r).length > 0) },
  {
    id: "review", label: "Awaiting clinical review", sub: "A clinician decides", tone: "risk",
    test: (r) => open(r) && (r.triage === "clinical_review" || r.assessment.status === "awaiting_review" || r.cans?.status === "ready_for_review" || r.safety?.status === "open"),
  },
  { id: "handoff", label: "Ready for authorization handoff", sub: "Packet drafted", tone: "good", test: (r) => open(r) && (r.handoff.status === "draft" || r.handoff.status === "ready") },
  { id: "awaiting", label: "Referrals awaiting acceptance", sub: "Sent out, no answer", tone: "neutral", test: (r) => r.referralsOut.some((o) => o.status === "sent" || o.status === "received" || o.status === "under_review") },
  { id: "priority", label: "High-priority referrals", sub: "Priority or urgent", tone: "risk", test: (r) => open(r) && (r.priority || r.urgency !== "routine") },
];

export const METRIC_IDS = METRICS.map((m) => m.id);
export const metricById = (id: string | null): MetricDef | undefined => METRICS.find((m) => m.id === id);
export const countMetric = (m: MetricDef, records: IntakeRecord[], clock: number): number => records.filter((r) => m.test(r, clock)).length;
