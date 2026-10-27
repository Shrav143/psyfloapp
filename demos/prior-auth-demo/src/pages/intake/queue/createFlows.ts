import { sampleDocument, type ReferralSample } from "@/data/intake/samples";
import type { FieldMap, FieldState, FieldValue, IntakeDocument, IntakeRecord, ReferralMethod } from "@/data/intake/types";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import type { SiteId } from "@/data/sites";
import { vaPlanOf } from "@/data/va/plans";
import { REDESIGN_START } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { DAY } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { readReferralDocument } from "../referral/agent";

/* How each New Intake method creates a record. Person-entered values carry the person and "Manual entry"; a document's values arrive only as
   the Referral Agent's suggestions, after the record exists, so nothing an agent read is written without review. */

/** A first planned start: a week out, and never before July 1, 2027 for a redesigned service. */
export function defaultServiceDate(serviceId: VaServiceId, clock: number): number {
  const week = clock + 7 * DAY;
  return serviceById(serviceId).status === "redesign" ? Math.max(week, REDESIGN_START) : week;
}

/** "tw", "T W" or "T.W." become "T.W." A typed name becomes its initials (privacy mode keeps initials only). */
export function normInitials(raw: string): string {
  const t = raw.trim();
  const letters = /\s/.test(t) && t.replace(/[^A-Za-z\s]/g, "").split(/\s+/).every((w) => w.length > 1) ? t.split(/\s+/).map((w) => w[0]) : t.replace(/[^A-Za-z]/g, "").split("");
  return letters.slice(0, 3).map((c) => c.toUpperCase()).join(".") + (letters.length ? "." : "");
}

const fv = (value: string, state: FieldState, by: string, at: number, ref: string, kind: "staff" | "patient" = "staff"): FieldValue => ({
  value, state, at, by, source: { kind, ref }, reviewedBy: state === "verified" ? by : undefined, reviewedAt: state === "verified" ? at : undefined,
});

export interface BasicInput {
  serviceId: VaServiceId;
  site: SiteId;
  initials: string;
  age: number | null;
  payerId: BuiltInPayerId | null;
  urgency: Urgency;
  sourceOrg: string;
}

function create(method: ReferralMethod, b: BasicInput, extra: Partial<IntakeRecord> & { title: string }): string {
  const s = useStore.getState();
  return s.createIntake({
    method, serviceId: b.serviceId, site: b.site, initials: b.initials, age: b.age, payerId: b.payerId, urgency: b.urgency, priority: b.urgency !== "routine",
    sourceOrg: b.sourceOrg || "Not entered", serviceDate: defaultServiceDate(b.serviceId, s.clock), ...extra,
  });
}

/** Manual entry: what the person typed is saved as entered by staff. */
export function createManual(b: BasicInput & { reason: string; memberLast4: string }): string {
  const s = useStore.getState();
  const me = meOf(s);
  const at = s.clock;
  const referral: FieldMap = { sourceOrg: fv(b.sourceOrg, "verified", me, at, "Manual entry") };
  if (b.reason.trim()) referral.reason = fv(b.reason.trim(), "verified", me, at, "Manual entry");
  const coverage: FieldMap = {};
  const plan = b.payerId ? vaPlanOf(b.payerId) : undefined;
  if (plan) {
    coverage.plan = fv(plan.name, "patient_reported", me, at, "Manual entry, as reported");
    coverage.coverageType = fv(plan.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)", "patient_reported", me, at, "Manual entry, as reported");
  }
  if (b.memberLast4) coverage.medicaidId = fv(`•••• ${b.memberLast4}`, "patient_reported", me, at, "Manual entry, as reported");
  return create("manual", b, { title: `${b.sourceOrg || "Manual entry"}: ${serviceById(b.serviceId).short}`, referral, coverage });
}

const docIdFor = (recordId: string) => `doc-${recordId}-${Date.now().toString(36)}`;

/** Upload, fax, email, EMR or web form: the sample becomes the attached (simulated) document and the Referral Agent reads it. */
export function createFromSample(sample: ReferralSample, b: Pick<BasicInput, "serviceId" | "site">, droppedFile?: string): string {
  const s = useStore.getState();
  const id = create(sample.method, { ...b, initials: sample.initials, age: sample.age, payerId: sample.payerId, urgency: sample.urgency, sourceOrg: sample.sourceOrg }, {
    title: `${sample.label}: ${serviceById(b.serviceId).short}`,
  });
  attachSample(id, sample, droppedFile, s.clock);
  return id;
}

/** Adds a referral sample to a record that already exists (a likely duplicate) and has the Referral Agent read it there. */
export function attachSample(recordId: string, sample: ReferralSample, droppedFile?: string, at = useStore.getState().clock): IntakeDocument {
  const doc = sampleDocument(sample, docIdFor(recordId), at);
  useStore.getState().addIntakeDocument(recordId, doc, droppedFile ? `${droppedFile} was not read; the demo attached its sample referral instead (simulated import)` : "Simulated import");
  readReferralDocument(recordId, doc, sample.extract, sample.safety);
  return doc;
}

/** Staff-assisted phone intake: the record opens on the call checklist; answers are saved as patient reported. */
export function createPhone(b: BasicInput): string {
  const s = useStore.getState();
  const referral: FieldMap = { sourceOrg: fv(b.sourceOrg, "patient_reported", meOf(s), s.clock, "Staff-assisted phone intake", "patient") };
  return create("phone", b, { title: `Phone intake: ${serviceById(b.serviceId).short}`, referral });
}

/** Voice-agent-assisted intake: the record opens with the Voice Intake Assistant ready (simulated; no call is placed). */
export function createVoice(b: BasicInput): string {
  const id = create("voice", b, { title: `Voice-assisted intake: ${serviceById(b.serviceId).short}` });
  useStore.getState().patchIntake(id, (r) => ({ ...r, voice: { id: `VS-${id}`, status: "idle", language: "English", turns: [], asked: [], scriptId: "voice-generic", cursor: 0, simulated: true } }));
  return id;
}
