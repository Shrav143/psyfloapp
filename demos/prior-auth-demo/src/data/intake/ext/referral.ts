import { DAY, HOUR, longDate } from "@/lib/time";
import { serviceById } from "../../va/services";
import { REDIRECT_REASON } from "../decision";
import type { AgentTask, FieldValue, IntakeRecord, SourceRef, Suggestion } from "../types";

/* Seed content for the referral section, triage and the queue. seedIntakes() applies it after building the base records.
   Synthetic only: organizations are fictional, people appear by initials or role. */

/** The task that waits for a referrer's reply (the store creates it; the queue and the Referral section read it). */
export const REPLY_TASK_ACTION = "Wait for the referrer's reply";

const sug = (id: string, s: Omit<Suggestion, "id" | "status">): Suggestion => ({ id, status: "pending", ...s });
const task = (id: string, t: Omit<AgentTask, "id">): AgentTask => ({ id, ...t });

function scenarioA(r: IntakeRecord): IntakeRecord {
  const at = r.createdAt;
  const src = (blockId: string, quote: string) => ({ kind: "document" as const, ref: "School referral p.1", docId: "doc-a1", blockId, quote });
  return {
    ...r,
    suggestions: [
      ...r.suggestions,
      sug("sg-ref-3101-1", { section: "referral", field: "currentProviders", value: "No current therapist; the school's 504 plan team", source: src("a-supports", "No current therapist."), confidence: "medium", agent: "reader", at }),
      sug("sg-ref-3101-2", { section: "referral", field: "notes", value: "Parent release of school records not yet signed; the counselor is sending it home this week.", source: src("a-consent", "Parent release of school records: not yet signed."), confidence: "high", agent: "reader", at }),
    ],
  };
}

/** Two referrals waiting on the referrer, so the queue shows "Waiting on the referrer". */
function waiting(r: IntakeRecord, note: string, asked: string, sentDaysAgo: number): IntakeRecord {
  const at = -Math.round(sentDaysAgo * DAY);
  return {
    ...r,
    triageNote: note,
    tasks: [...r.tasks, task(`task-ref-${r.id}-reply`, { role: "coordination", agent: "navigator", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${r.sourceOrg}`, at, approval: "approved", result: `Asked for ${asked} (simulated secure message). Follow up in 2 business days.` })],
    audit: [...r.audit, { id: `ev-ref-${r.id}-req`, at, actor: r.assignedTo, action: "Sent a request for missing information to the referrer (simulated)", detail: asked, section: "referral" }],
  };
}

/** A school referral with more on the page, so its four suggestions can be reviewed beside it. */
function schoolTdt(r: IntakeRecord): IntakeRecord {
  const doc = r.documents[0];
  if (!doc) return r;
  const page = [
    ...doc.pages[0],
    { kind: "h" as const, text: "Teacher observations" },
    { kind: "list" as const, id: "IN-3121-obs", items: ["Leaves his seat and the room several times a day", "Two incidents of throwing materials this month", "Calms with a quiet corner and one adult"] },
    { kind: "table" as const, id: "IN-3121-fam", head: ["Item", "As written"], rows: [["Parent or guardian", "Father (guardian)"], ["Guardian phone", "(757) 555-0148"]] },
    { kind: "sig" as const, id: "IN-3121-sig", text: "School psychologist, Bayside Elementary (fictional) · (757) 555-0121" },
  ];
  const src = (blockId: string, quote?: string) => ({ kind: "document" as const, ref: "Referral p.1", docId: doc.id, blockId, quote });
  const at = r.createdAt + 3;
  return {
    ...r,
    documents: [{ ...doc, pages: [page] }, ...r.documents.slice(1)],
    suggestions: [
      ...r.suggestions,
      sug("sg-ref-3121-1", { section: "referral", field: "concerns", value: "Leaves his seat and the room several times a day; two incidents of throwing materials this month.", source: src("IN-3121-obs"), confidence: "high", agent: "reader", at }),
      sug("sg-ref-3121-2", { section: "referral", field: "referrerContact", value: "(757) 555-0121 (school psychologist)", source: src("IN-3121-sig", "(757) 555-0121"), confidence: "high", agent: "reader", at }),
      sug("sg-ref-3121-3", { section: "profile", field: "guardianName", value: "Father (guardian)", source: src("IN-3121-fam"), confidence: "high", agent: "reader", at }),
      sug("sg-ref-3121-4", { section: "profile", field: "guardianPhone", value: "(757) 555-0148", source: src("IN-3121-fam"), confidence: "medium", agent: "reader", at }),
    ],
  };
}

/** The person, the requested program, the urgency and the referral date, as values with where they came from. A record that already has them keeps them. */
function withAttributes(r: IntakeRecord): IntakeRecord {
  if (r.referral.person && r.referral.requestedService && r.referral.urgency && r.referral.referralDate) return r;
  const typed = r.method === "manual" || r.method === "phone";
  const decided = ["accepted", "redirected", "declined", "closed", "ready_screening"].includes(r.triage);
  const doc = r.documents[0];
  const block = doc?.pages.flat().find((b) => "id" in b && b.id === `${r.id}-r`) ? `${r.id}-r` : undefined;
  const source: SourceRef | undefined = doc ? { kind: "document", ref: "Referral p.1", docId: doc.id, blockId: block } : { kind: "staff", ref: r.method === "voice" ? "Voice-assisted intake" : "Entered by staff" };
  const at = r.createdAt;
  const make = (value: string): FieldValue => ({
    value, at, by: doc ? "reader" : r.assignedTo, source, confidence: "high",
    state: typed || decided ? "verified" : doc ? "document_extracted" : "patient_reported",
    ...(typed || decided ? { reviewedBy: r.assignedTo, reviewedAt: at + HOUR } : {}),
  });
  const referral = { ...r.referral };
  if (!referral.person && r.initials.trim()) referral.person = make(`${r.initials}${r.age !== null ? `, ${r.age}` : ""}`);
  if (!referral.requestedService) referral.requestedService = make(serviceById(r.serviceId).label);
  if (!referral.urgency) referral.urgency = { ...make(r.urgency === "routine" ? "Routine" : r.urgency === "urgent" ? "Urgent" : "Emergent"), state: decided || typed ? "verified" : "ai_suggested" };
  if (!referral.referralDate) referral.referralDate = { ...make(longDate(at)), state: doc ? "document_extracted" : "verified" };
  return { ...r, referral };
}

/** A referral decision a person made, with the notice that went with it. */
function decided(r: IntakeRecord, d: NonNullable<IntakeRecord["referralDecision"]>, notice?: Partial<NonNullable<IntakeRecord["referralNotices"]>[number]> & { subject: string; body: string }): IntakeRecord {
  const nid = notice ? `nt-${r.id}-1` : undefined;
  return {
    ...r,
    referralDecision: { ...d, noticeId: nid },
    referralNotices: notice && nid ? [...(r.referralNotices ?? []), { id: nid, kind: d.kind === "redirected" ? "redirected" : d.kind === "declined" ? "declined" : "accepted", to: r.referral.referringClinician?.value || r.sourceOrg, channel: "Secure message", status: "draft", createdAt: d.at + 1, createdBy: d.by, ...notice }] : r.referralNotices,
    audit: [...r.audit, { id: `ev-ref-${r.id}-decision`, at: d.at, actor: d.by, action: d.kind === "redirected" ? "Redirected the referral" : d.kind === "declined" ? "Declined the referral" : "Accepted for assessment", detail: d.reason ?? d.note, section: "referral" }],
  };
}

export const extendReferral = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r0) => {
    const r = withAttributes(r0);
    switch (r.id) {
      case "IN-3101": return scenarioA(r);
      case "IN-3112": return waiting(r, "Need the residential discharge summary and the current buprenorphine dose.", "the residential discharge summary and the current buprenorphine dose", 1 + 4 / 24);
      case "IN-3117": return waiting(r, "Need the autism diagnostic evaluation report.", "the diagnostic evaluation report", 2);
      case "IN-3121": return schoolTdt(r);
      /* An accepted referral whose notice to the referrer is still a draft. */
      case "IN-3110":
        return decided(r, { kind: "accepted", at: r.createdAt + 2 * HOUR, by: r.assignedTo }, { subject: "Referral accepted for J.B., 36", body: "Hello Valley Withdrawal Center (fictional),\n\nThank you for referring J.B., 36 for ARTS residential. We accepted the referral for assessment. Our team will contact the person to arrange the next step.\n\nThis message has no clinical details.\n\nMorgan Lee, Intake coordinator\nPsyflo demo clinic intake (fictional)", channel: "Fax" });
      /* ACT has no open caseload place in the demo: accepted, on the waitlist. */
      case "IN-3116":
        return {
          ...decided(r, { kind: "accepted", at: r.createdAt + 3 * HOUR, by: r.assignedTo, note: "No open caseload place; waitlisted" }),
          triageNote: "On the waitlist for ACT, position 1",
          waitlist: { programId: "act", label: serviceById("act").short, since: r.createdAt + 3 * HOUR, by: r.assignedTo, position: 1, note: "No open caseload place at the time of acceptance (demo configuration)" },
        };
      /* A redirect, with the notice already sent (simulated). */
      case "IN-3124":
        return decided(
          r,
          { kind: "redirected", at: r.createdAt + 4 * HOUR, by: r.assignedTo, reasonCode: "service_not_yet", reason: REDIRECT_REASON.service_not_yet, destination: { org: "This clinic: psychosocial rehabilitation, until June 30, 2027" }, note: "Wants a clubhouse. Clubhouse services start July 1, 2027." },
          { subject: "Referral redirected for F.S., 34", body: `Hello ${r.sourceOrg},\n\nThank you for referring F.S., 34 for Clubhouse. We are not able to take this referral here: ${REDIRECT_REASON.service_not_yet.toLowerCase()}. We suggest this clinic's psychosocial rehabilitation service until June 30, 2027.\n\nIf anyone is in immediate danger, call 911. The 988 Suicide and Crisis Lifeline is available by call or text.\n\nTaylor Brooks, Intake coordinator\nPsyflo demo clinic intake (fictional)`, status: "sent", sentAt: r.createdAt + 4 * HOUR + 20, approvedBy: r.assignedTo, basis: "protocol_attested" },
        );
      default: return r;
    }
  });
