import { HOUR, longDate } from "@/lib/time";
import { intakeIdForReferral } from "@/routes";
import { CHANNEL_LABEL, DOC_TITLE, SEED_REFERRALS, STAFF, buildDocs, issueCount, locate, type Channel, type DeclineReason, type Referral, type ReferralDoc, type ReferralField, type ReferralStatus } from "../referrals";
import { siteOf } from "../sites";
import { vaPlanOf } from "../va/plans";
import { serviceById } from "../va/services";
import type { DeclineReasonCode, NoticeChannel, ReferralNotice } from "./decision";
import { DECLINE_REASON } from "./decision";
import { REPLY_TASK_ACTION } from "./ext/referral";
import { draftNotice } from "./notices";
import { riskSentences, SERVICE_OF_CORE } from "./referralFacts";
import type { AgentTask, AuditEvent, EligibilityCheck, FieldMap, FieldValue, IntakeDocument, IntakeRecord, ReferralMethod, ServiceRecommendation, SourceRef, TriageStatus } from "./types";

/* The sixteen earlier referrals (RF-2038 to RF-2053) as intake records (IN-2038 to IN-2053). One record is the referral and the intake: a referral
   is its first status. Documents, extracted fields with their sources, the nine document checks, the notes and the decision all carry over. The old
   files stay; this module only reads them. Two things are left behind on purpose: the program fit Placement scored (a service is chosen by a
   clinician, never by a score) and the coverage verdict lines (the eligibility check is run again, simulated, from the record). */

const TRIAGE_OF: Record<ReferralStatus, TriageStatus> = { new: "new", in_review: "new", awaiting_info: "needs_info", accepted: "accepted", scheduled: "accepted", admitted: "accepted", declined: "declined" };
const METHOD_OF: Record<Channel, ReferralMethod> = { fax: "fax", eReferral: "emr", portal: "webform", phone: "phone", email: "email" };
const DECLINE_OF: Record<DeclineReason, DeclineReasonCode> = { age: "age", area: "area", higher_care: "higher_care", no_bed: "no_capacity", coverage: "coverage", criteria: "not_appropriate", withdrew: "withdrew" };
const VIA_CHANNEL: Record<string, NoticeChannel> = { fax: "Fax", eReferral: "Secure message", email: "Secure message", phone: "Phone call" };
const ROLE: Record<string, string> = { jp: "UR coordinator", tb: "Intake coordinator", ml: "Intake coordinator" };
const COORDINATORS = ["tb", "ml", "jp"] as const;
const DOC_KIND: Record<Channel, IntakeDocument["kind"]> = { fax: "fax", email: "email", eReferral: "referral", portal: "referral", phone: "other" };

const staffName = (id: string) => STAFF.find((s) => s.id === id)?.name ?? id;
const signedBy = (id: string) => `${staffName(id)}, ${ROLE[id] ?? "Intake coordinator"}`;
const confidenceOf = (n: number): FieldValue["confidence"] => (n >= 94 ? "high" : n >= 90 ? "medium" : "low");
const URGENCY = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" } as const;
const clip = (t: string, n = 180) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** The intake id for a legacy referral: RF-2049 is IN-2049. */
export const intakeIdOfLegacy = intakeIdForReferral;

function documentsOf(rf: Referral, id: string): { docs: IntakeDocument[]; plain: ReferralDoc[] } {
  const plain = buildDocs(rf);
  const by = plain.find((d) => d.id === "form");
  const docs = plain.map((d): IntakeDocument => {
    const isForm = d === by;
    return {
      id: `doc-${id}-${d.id}`,
      name: isForm ? `${DOC_TITLE.form}, ${rf.source.name} (${CHANNEL_LABEL[rf.channel].toLowerCase()}).pdf` : `${DOC_TITLE.face}, ${rf.source.name}.pdf`,
      kind: isForm ? DOC_KIND[rf.channel] : "other",
      receivedAt: rf.receivedAt,
      simulated: true,
      pages: d.pages,
    };
  });
  return { docs, plain };
}

/** Where a value lives in the documents: which one, which page and what the block says. Nothing is guessed: a block that is not there gives no source. */
function sourceOf(plain: ReferralDoc[], id: string, blockId: string): SourceRef | undefined {
  const ev = locate(plain, blockId);
  return ev ? { kind: "document", ref: `${ev.docTitle} p.${ev.page}`, docId: `doc-${id}-${ev.doc}`, blockId, quote: clip(ev.quote) } : undefined;
}

function evidenceOnly(id: string, docKey: "form" | "face", label: string): SourceRef {
  return { kind: "document", ref: `${label} p.1`, docId: `doc-${id}-${docKey}` };
}

/** Whether an extracted legacy field has a value: Reader writes "Not found on the form" when it did not find one. */
const found = (f: ReferralField | undefined): f is ReferralField => !!f && f.confidence > 0 && !!f.value && !/^Not found/i.test(f.value);

export function convertReferral(rf: Referral): IntakeRecord {
  const id = intakeIdForReferral(rf.id);
  const p = rf.plan;
  const at = rf.receivedAt + 1;
  const { docs, plain } = documentsOf(rf, id);
  const triage = TRIAGE_OF[rf.status];
  const decided = rf.decidedAt !== undefined && (triage === "accepted" || triage === "declined");
  const owner = rf.owner ?? COORDINATORS[Number(rf.id.slice(-2)) % COORDINATORS.length];
  const reviewer = rf.owner ?? "jp";
  const field = (key: ReferralField["key"]) => rf.fields.find((f) => f.key === key);
  const conf = (key: ReferralField["key"]) => confidenceOf(field(key)?.confidence ?? 90);
  /* A decided referral was reviewed by the person who decided it; an open one is still as Reader extracted it. */
  const extracted = (value: string, blockId: string, key: ReferralField["key"], source = sourceOf(plain, id, blockId)): FieldValue => ({
    value, state: decided ? "verified" : "document_extracted", at, by: "reader", source, confidence: conf(key),
    ...(decided ? { reviewedBy: reviewer, reviewedAt: rf.decidedAt } : {}),
  });
  const missing = (): FieldValue => ({ value: "", state: "not_collected", at, by: "reader" });
  const svcId = SERVICE_OF_CORE[rf.program];
  const svc = serviceById(svcId);
  const plan = rf.payerId ? vaPlanOf(rf.payerId) : undefined;
  const self = rf.source.kind === "self";

  const referral: FieldMap = {
    sourceOrg: { value: self ? rf.source.name : `${rf.source.name} (fictional)`, state: decided ? "verified" : "document_extracted", at, by: "reader", source: evidenceOnly(id, "form", DOC_TITLE.form), confidence: "high", ...(decided ? { reviewedBy: reviewer, reviewedAt: rf.decidedAt } : {}) },
    referralDate: { value: longDate(rf.receivedAt), state: "document_extracted", at, by: "reader", source: evidenceOnly(id, "form", DOC_TITLE.form), confidence: "high" },
    reason: found(field("reason")) ? extracted(p.reason, "reason", "reason") : missing(),
    person: extracted(`${rf.patient.initials}, ${rf.patient.age}`, "patient", "patient", sourceOf(plain, id, "patient") ?? sourceOf(plain, id, "age")),
    requestedService: extracted(svc.label, "service", "service"),
    urgency: extracted(URGENCY[rf.urgency], "urgency", "urgency"),
    dxDocumented: p.dx.length ? extracted(p.dx.map((d) => `${d.code} ${d.label}`).join("; "), "diagnoses", "diagnoses") : missing(),
    safetyConcerns: p.risk ? extracted(p.risk, "risk", "reason") : missing(),
  };
  if (!self) referral.referringClinician = extracted(`${p.clinician.name}, ${p.clinician.credentials}`, "clinician", "clinician");
  const contact = rf.source.fax ? `Fax ${rf.source.fax}` : p.phone ? `${p.phone} (the person)` : "";
  if (contact) referral.referrerContact = { value: contact, state: "document_extracted", at, by: "reader", source: evidenceOnly(id, "form", DOC_TITLE.form), confidence: "high" };
  referral.notes = {
    value: `Order dated ${longDate(p.orderAt)}, valid until ${longDate(p.expiresAt)}${self ? "" : `. Referring clinician NPI ${p.clinician.npi}`}.`,
    state: "document_extracted", at, by: "reader", source: sourceOf(plain, id, "orderDate"), confidence: "high",
  };

  const profile: FieldMap = {};
  profile.substanceUse = p.substances ? extracted(p.substances, "substances", "reason") : missing();
  profile.medications = p.meds.length ? extracted(p.meds.join("; "), "meds", "reason") : missing();
  if (p.phone) {
    profile.phone = extracted(p.phone, "contact", "contact");
    profile.emergencyContact = extracted(p.altContact, "contact", "contact");
  }

  const coverage: FieldMap = {};
  if (plan) {
    coverage.plan = extracted(plan.name, "insurance", "insurance");
    coverage.coverageType = { value: plan.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)", state: "ai_suggested", at, by: "verify", source: sourceOf(plain, id, "insurance"), confidence: "medium" };
  }
  if (p.memberIdMasked.startsWith("…")) coverage.medicaidId = extracted(`•••• ${p.memberIdMasked.slice(1)}`, "memberId", "memberId");

  /* The decision and the notices that went with it. */
  const notices: ReferralNotice[] = [];
  const audit: AuditEvent[] = [];
  const tasks: AgentTask[] = [];
  let n = 0;
  const ev = (when: number, actor: string, action: string, detail?: string, ai = false, section: AuditEvent["section"] = "referral"): AuditEvent => ({ id: `ev-${id}-${++n}`, at: when, actor, action, detail, ai, section });
  for (const e of rf.events) {
    if (!e.done || e.actor === "placement" || e.actor === "payer") continue;
    const actor = e.actor === "you" ? reviewer : e.actor;
    audit.push(ev(e.at, actor, e.text.replace(/^You /, ""), e.detail, e.actor !== "you" && e.actor !== "system"));
  }
  tasks.push({ id: `task-${id}-read`, role: "referral", agent: "reader", action: "Read the referral", status: "done", section: "referral", at, approval: "none", result: `${rf.fields.length} fields found; ${issueCount(rf.checks)} document check${issueCount(rf.checks) === 1 ? "" : "s"} to look at` });

  let referralDecision: IntakeRecord["referralDecision"];
  let triageNote: string | undefined;
  if (triage === "declined" && rf.decline && rf.decidedAt !== undefined) {
    const code = DECLINE_OF[rf.decline.reason];
    referralDecision = { kind: "declined", at: rf.decidedAt, by: reviewer, reasonCode: code, reason: DECLINE_REASON[code], note: rf.decline.note };
    triageNote = `${DECLINE_REASON[code]}. ${rf.decline.note}`;
    if (rf.decline.courtesy) {
      const d = draftNotice({ initials: rf.patient.initials, age: rf.patient.age, serviceId: svcId, referral, sourceOrg: rf.source.name, method: METHOD_OF[rf.channel], assignedTo: owner }, "declined", { signedBy: signedBy(reviewer), reasonCode: code });
      const notice: ReferralNotice = { id: `nt-${id}-1`, kind: "declined", ...d, status: "sent", createdAt: rf.decidedAt + 1, createdBy: reviewer, sentAt: rf.decidedAt + 2, approvedBy: reviewer, basis: "protocol_attested" };
      notices.push(notice);
      referralDecision = { ...referralDecision, noticeId: notice.id };
    }
  } else if (triage === "accepted" && rf.decidedAt !== undefined) {
    referralDecision = { kind: "accepted", at: rf.decidedAt, by: rf.accepted?.by ?? reviewer };
    const stage = rf.status === "admitted" && rf.admittedAt !== undefined ? `Admitted ${longDate(rf.admittedAt)}` : rf.status === "scheduled" && rf.intakeAt !== undefined ? `Intake visit ${longDate(rf.intakeAt)}` : "";
    triageNote = [stage, rf.requestId ? `Authorization ${rf.requestId} started from this referral` : ""].filter(Boolean).join(". ") || undefined;
  } else if (triage === "needs_info") {
    const first = (rf.infoRequest?.message ?? "").split(/(?<=[.!?])\s+/).slice(1, 2).join(" ");
    triageNote = first ? `Waiting on the referrer: ${first}` : "Waiting on the referrer.";
    if (rf.infoRequest && rf.infoAskedAt !== undefined) {
      notices.push({ id: `nt-${id}-1`, kind: "missing_info", to: rf.source.name, channel: VIA_CHANNEL[rf.infoRequest.via] ?? "Secure message", subject: `More information needed for ${rf.patient.initials}, ${rf.patient.age}`, body: rf.infoRequest.message, status: "sent", createdAt: rf.infoAskedAt, createdBy: reviewer, sentAt: rf.infoAskedAt, approvedBy: reviewer, basis: "protocol_attested" });
      tasks.push({ id: `task-${id}-reply`, role: "coordination", agent: "navigator", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${rf.source.name}`, at: rf.infoAskedAt, approval: "approved", result: `${rf.infoRequest.message.split(/(?<=[.!?])\s+/).slice(1, 2).join(" ") || "Asked for more information."} Follow up in 2 business days.` });
    }
  } else if (rf.status === "in_review") {
    const last = rf.notes[rf.notes.length - 1];
    triageNote = last ? last.text : "In review: the document checks are open.";
  }
  for (const note of rf.notes) audit.push(ev(note.at, note.by, `${staffName(note.by)} added a note`, note.text));

  /* Open referrals with risk language in the form wait for a clinician. Decided ones were reviewed when they were decided. */
  const riskText = riskSentences(p.risk);
  const safety: IntakeRecord["safety"] = (triage === "new" || triage === "needs_info") && riskText.length
    ? { raisedAt: rf.receivedAt + 3, raisedBy: "reader", text: `The referral's risk screening says: "${riskText[0]}" A clinician must review this today, before routine scheduling. Psyflo does not decide that a person is safe.`, source: sourceOf(plain, id, "risk"), status: "open" }
    : null;
  if (safety) audit.push(ev(rf.receivedAt + 3, "reader", "Flagged risk language for clinician review", riskText[0], true));
  audit.sort((a, b) => a.at - b.at);

  const eligibility: EligibilityCheck = rf.coverage?.kind === "lapsed"
    ? { status: "inactive", simulated: true, checkedAt: rf.coverage.at, member: "no", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", payerId: rf.payerId, serviceId: svcId, conflicts: [], exceptions: ["Coverage ended on the earlier check (simulated). Run the check again to see whether a newer plan exists."] }
    : { status: "not_checked", simulated: true, member: "unknown", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: [] };

  const pathway: ServiceRecommendation = {
    id: `pw-${id}-1`, serviceId: svcId, fit: "possible", rationale: `Requested by the referral: ${svc.short}. A clinician decides what fits.`, evidence: [], suggestedBy: "reader", status: "suggested",
    outstanding: ["Clinical review"], availability: "available", referralReqs: [],
  };

  return {
    id, site: siteOf(rf.id), createdAt: rf.receivedAt, title: `${rf.source.name}: ${svc.short}`, serviceId: svcId,
    serviceDate: rf.admittedAt ?? rf.intakeAt ?? rf.accepted?.admitBy ?? rf.receivedAt + 5 * 24 * HOUR,
    method: METHOD_OF[rf.channel], sourceOrg: self ? rf.source.name : `${rf.source.name} (fictional)`, triage, triageNote, urgency: rf.urgency, priority: rf.urgency !== "routine",
    assignedTo: owner, payerId: rf.payerId, initials: rf.patient.initials, age: rf.patient.age,
    referral, profile, coverage, eligibility,
    assessment: { mode: "manual", status: "not_started", fields: {} }, cans: null, lon: null, pathways: [pathway], referralsOut: [],
    documents: docs, suggestions: [], tasks, audit, scribe: null, voice: null, safety, handoff: { status: "not_started" },
    patientId: rf.requestId ?? null, legacyReferralId: rf.id, referralChecks: rf.checks, referralDecision,
    ...(notices.length ? { referralNotices: notices } : {}),
  };
}

/** The sixteen converted records. A function so every reset starts from fresh objects. */
export const legacyIntakes = (): IntakeRecord[] => SEED_REFERRALS.map(convertReferral);
/** The same records as a constant, for the seed. Never mutate it. */
export const LEGACY_INTAKES: IntakeRecord[] = legacyIntakes();
