import { DAY } from "@/lib/time";
import type { AgentTask, IntakeRecord, Suggestion } from "../types";

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

export const extendReferral = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r) => {
    switch (r.id) {
      case "IN-3101": return scenarioA(r);
      case "IN-3112": return waiting(r, "Need the residential discharge summary and the current buprenorphine dose.", "the residential discharge summary and the current buprenorphine dose", 1 + 4 / 24);
      case "IN-3117": return waiting(r, "Need the autism diagnostic evaluation report.", "the diagnostic evaluation report", 2);
      case "IN-3121": return schoolTdt(r);
      default: return r;
    }
  });
