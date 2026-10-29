import type { StateCreator } from "zustand";
import { specOf } from "@/data/intake/fields";
import { staffOf } from "@/data/intake/seed";
import type { EligibilityCheck, EligibilityDetermination, FieldValue, IntakeRecord, SourceRef, StaffVerification, Suggestion } from "@/data/intake/types";
import type { PayerId } from "@/data/types";
import { VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { toDate } from "@/lib/time";
import type { AppState } from "./index";
import { meOf } from "./intake";

/* Intake: patient profile and insurance & eligibility. Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions,
   tasks, audit) are in intake.ts. Requests to the patient or guardian live here too, because the record has no place for them. */

export interface RequestedField {
  section: "profile" | "coverage";
  key: string;
}
/** A secure form sent to the patient or guardian. Simulated: nothing leaves the demo, and the reply comes back as suggestions for staff to accept. */
export interface PatientRequest {
  id: string;
  recordId: string;
  to: "patient" | "guardian";
  channel: "text" | "email";
  fields: RequestedField[];
  sentAt: number;
  sentBy: string;
  status: "waiting" | "replied" | "cancelled";
  /** The task that tracks the reply in the assistant's activity. */
  taskId: string;
  repliedAt?: number;
  /** The suggestions the reply added, so the screen can say how many still wait for review. */
  suggestionIds?: string[];
}
/** One follow-up the coverage section or Verify creates. */
export interface CoverageFollowUp {
  action: string;
  result?: string;
  by?: "staff" | "agent";
}

export interface IntakeProfileSlice {
  profileRequests: PatientRequest[];
  /** Task ids of the coverage follow-ups (Verify's and staff's), so the section lists them apart from the agent's own runs. */
  coverageFollowUps: string[];
  /** Age follows the date of birth: recomputes `record.age` on the demo clock. Call it after anything changes profile.dob. */
  syncIntakeAge: (id: string) => void;
  /** The payer and the coverage type follow the plan field: sets `record.payerId` and coverage.coverageType from coverage.plan. */
  syncIntakePlan: (id: string) => void;
  /** A person picks the current plan when insurance records disagree. Accepts the matching suggestion and rejects the others; the check must run again. */
  resolvePlanConflict: (id: string, payerId: PayerId) => void;
  /** Writes the (simulated) eligibility response. Verify's run calls it; verified marks from an earlier response do not carry over. */
  setEligibilityCheck: (id: string, check: EligibilityCheck) => void;
  /** A person confirmed these determinations with the plan (by phone or portal). Records who and when. */
  markEligibilityVerified: (id: string, items: EligibilityDetermination[], method: StaffVerification["method"], ref?: string) => void;
  /** Adds a follow-up task to the coverage section, unless the same one is already open. Returns the task id. */
  addCoverageFollowUp: (id: string, f: CoverageFollowUp) => string;
  completeFollowUp: (id: string, taskId: string) => void;
  /** Sends a secure form to the patient or guardian (simulated): a task that waits for the reply, and an audit event. */
  requestPatientInfo: (id: string, o: Pick<PatientRequest, "to" | "channel" | "fields">) => string;
  /** Demo control: the patient or guardian answers. The answers arrive as suggestions (source: patient) that staff accept, edit or reject.
      The screen runs it as Reader's work, so a paused Reader leaves the request waiting. Returns how many answers were added. */
  simulatePatientReply: (requestId: string, answers: Pick<Suggestion, "section" | "field" | "value">[]) => number;
  cancelPatientRequest: (requestId: string) => void;
}

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
const COVERAGE_TYPE = { mco: "Cardinal Care managed care (MCO)", ffs: "Fee-for-service" } as const;

/** Whole years between an ISO date of birth and the demo clock. null when the date is not a valid past date. */
export function ageOn(dob: string, now: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const today = toDate(now);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export const createIntakeProfileSlice: StateCreator<AppState, [], [], IntakeProfileSlice> = (set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  /** The plan field, the payer and the coverage type move together. The type keeps the plan's provenance, since it is read from the plan. */
  const withPlan = (r: IntakeRecord, payerId: PayerId, fv: FieldValue): IntakeRecord => {
    const plan = vaPlanOf(payerId);
    if (!plan) return r;
    return { ...r, payerId, coverage: { ...r.coverage, plan: fv, coverageType: { ...fv, value: COVERAGE_TYPE[plan.coverage], source: { kind: "policy", ref: `Follows the plan: ${plan.name}` } } } };
  };
  const updateRequest = (requestId: string, p: Partial<PatientRequest>) => set((s) => ({ profileRequests: s.profileRequests.map((q) => (q.id === requestId ? { ...q, ...p } : q)) }));

  return {
    profileRequests: [],
    coverageFollowUps: [],

    syncIntakeAge: (id) => {
      const r = rec(id);
      const dob = r?.profile.dob?.value;
      if (!r || !dob) return;
      const age = ageOn(dob, get().clock);
      if (age === null || age === r.age) return;
      get().patchIntake(id, (x) => ({ ...x, age }));
      get().addIntakeAudit(id, { actor: "system", action: "Age follows the date of birth", detail: `${r.age ?? "Unknown"} to ${age}`, section: "profile" });
    },

    syncIntakePlan: (id) => {
      const r = rec(id);
      const fv = r?.coverage.plan;
      const plan = fv?.value ? VA_PLANS.find((p) => p.name === fv.value) : undefined;
      if (!r || !fv || !plan) return;
      if (r.payerId === plan.payerId && r.coverage.coverageType?.value === COVERAGE_TYPE[plan.coverage]) return;
      get().patchIntake(id, (x) => withPlan(x, plan.payerId, fv));
      if (r.payerId !== plan.payerId) get().addIntakeAudit(id, { actor: "system", action: "Payer follows the plan", detail: `${r.payerId ? (vaPlanOf(r.payerId)?.name ?? r.payerId) : "None"} to ${plan.name}`, section: "coverage" });
    },

    resolvePlanConflict: (id, payerId) => {
      const s = get();
      const r = rec(id);
      const plan = vaPlanOf(payerId);
      if (!r || !plan) return;
      const me = meOf(s);
      const pending = r.suggestions.filter((x) => x.section === "coverage" && x.field === "plan" && x.status === "pending");
      const match = pending.find((x) => x.value === plan.name);
      pending.forEach((x) => s.decideSuggestion(id, x.id, x === match ? "accepted" : "rejected"));
      const after = rec(id) as IntakeRecord;
      /* A plan picked from a simulated response is not verified: it waits for confirmation like any other unconfirmed value. */
      const fv: FieldValue = after.coverage.plan?.value === plan.name
        ? after.coverage.plan
        : { value: plan.name, state: "needs_confirmation", source: { kind: "staff", ref: r.eligibility.payerId === payerId ? "Chosen from the eligibility response (simulated)" : "Chosen by staff" }, at: s.clock, by: me };
      const others = [...new Set([...pending.map((x) => x.value), r.coverage.plan?.value, r.eligibility.payerId ? vaPlanOf(r.eligibility.payerId)?.name : undefined].filter((v): v is string => !!v && v !== plan.name))];
      s.patchIntake(id, (x) => ({
        ...withPlan(x, payerId, fv),
        /* The earlier response was for another plan; Verify must run again before any determination is shown. */
        eligibility: { status: "not_checked", simulated: true, member: "unknown", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: [] },
        tasks: x.tasks.map((t) =>
          (t.role === "eligibility" && t.status === "blocked") || (s.coverageFollowUps.includes(t.id) && t.status === "needs_you" && t.action.startsWith("Confirm the current plan"))
            ? { ...t, status: "done", result: `Current plan chosen by staff: ${plan.name}. Ready to check again.` }
            : t,
        ),
      }));
      s.addIntakeAudit(id, { actor: me, action: "Resolved the insurance conflict", detail: `Current plan: ${plan.name}.${others.length ? ` Not current: ${others.join(", ")}.` : ""}`, section: "coverage" });
      s.toast({ title: `Current plan: ${plan.name}`, body: "Run the eligibility check again for this plan.", tone: "good" });
    },

    setEligibilityCheck: (id, check) => get().patchIntake(id, (r) => ({ ...r, eligibility: { ...check, verified: undefined } })),

    markEligibilityVerified: (id, items, method, ref) => {
      const s = get();
      const me = meOf(s);
      const v: StaffVerification = { by: me, at: s.clock, method, ref: ref?.trim() || undefined };
      const r0 = rec(id);
      if (!r0) return;
      const plan = r0.eligibility.payerId;
      /* Confirming member eligibility with the plan also confirms who the member is with and under which ID. */
      const confirm = items.includes("member") && !!plan && plan === r0.payerId;
      const verifiedFv = (fv: FieldValue): FieldValue => ({ ...fv, state: "verified", source: { kind: "staff", ref: `Confirmed with the plan by ${method === "phone" ? "phone" : "portal"}` }, reviewedBy: me, reviewedAt: s.clock });
      const lifted = confirm ? ["medicaidId", "plan"].filter((k) => r0.coverage[k]?.value && r0.coverage[k].state !== "verified") : [];
      s.patchIntake(id, (r) => {
        const coverage = { ...r.coverage };
        lifted.forEach((k) => (coverage[k] = verifiedFv(coverage[k])));
        const next: IntakeRecord = { ...r, coverage, eligibility: { ...r.eligibility, verified: { ...r.eligibility.verified, ...Object.fromEntries(items.map((k) => [k, v])) } } };
        return plan && lifted.includes("plan") ? withPlan(next, plan, coverage.plan) : next;
      });
      s.addIntakeAudit(id, { actor: me, action: `Verified with the plan by ${method === "phone" ? "phone" : "portal"}`, detail: `${items.join(", ")}${plan ? ` · ${vaPlanOf(plan)?.name ?? plan}` : ""}${v.ref ? ` · reference ${v.ref}` : ""}${lifted.length ? ` · also marked verified: ${lifted.map((k) => (k === "plan" ? "plan" : "member ID")).join(" and ")}` : ""}`, section: "coverage" });
      s.toast({ title: "Marked verified", body: `${items.length} determination${items.length === 1 ? "" : "s"} confirmed with the plan${lifted.length ? `, and the ${lifted.map((k) => (k === "plan" ? "plan" : "member ID")).join(" and ")} on file` : ""}. The rest stay simulated.`, tone: "good" });
    },

    addCoverageFollowUp: (id, f) => {
      const s = get();
      const open = rec(id)?.tasks.find((t) => t.section === "coverage" && t.action === f.action && (t.status === "needs_you" || t.status === "blocked"));
      if (open) return open.id;
      const taskId = s.addIntakeTask(id, { role: "eligibility", action: f.action, section: "coverage", status: "needs_you", approval: "none", result: f.result });
      set((st) => ({ coverageFollowUps: [...st.coverageFollowUps, taskId] }));
      if (f.by !== "agent") s.addIntakeAudit(id, { actor: meOf(s), action: "Created a follow-up", detail: f.action, section: "coverage" });
      return taskId;
    },

    completeFollowUp: (id, taskId) => {
      const s = get();
      const me = meOf(s);
      const t = rec(id)?.tasks.find((x) => x.id === taskId);
      if (!t) return;
      s.updateIntakeTask(id, taskId, { status: "done", result: `Done by ${staffOf(me)?.name ?? me}` });
      s.addIntakeAudit(id, { actor: me, action: "Completed a follow-up", detail: t.action, section: t.section });
    },

    requestPatientInfo: (id, o) => {
      const s = get();
      const me = meOf(s);
      const labels = o.fields.map((f) => specOf(f.key)?.label ?? f.key);
      const via = o.channel === "text" ? "secure text link" : "secure email link";
      const taskId = s.addIntakeTask(id, { role: "completion", action: `Waiting for the ${o.to}'s secure form reply (simulated)`, section: "profile", source: `Secure form by ${via}`, status: "running", approval: "none", result: `${labels.length} item${labels.length === 1 ? "" : "s"} requested: ${labels.join(", ")}` });
      const requestId = uid("req");
      set((st) => ({ profileRequests: [...st.profileRequests, { id: requestId, recordId: id, ...o, sentAt: s.clock, sentBy: me, status: "waiting", taskId }] }));
      s.addIntakeAudit(id, { actor: me, action: `Sent a secure form to the ${o.to} (simulated)`, detail: `By ${via}: ${labels.join(", ")}`, section: "profile" });
      s.toast({ title: "Secure form sent (simulated)", body: `Nothing leaves the demo. Use "Simulate the reply" to see the answers come back for review.`, tone: "neutral" });
      return requestId;
    },

    simulatePatientReply: (requestId, answers) => {
      const s = get();
      const q = s.profileRequests.find((x) => x.id === requestId);
      const r = q && q.status === "waiting" ? rec(q.recordId) : undefined;
      if (!q || !r) return 0;
      const source: SourceRef = { kind: "patient", ref: `Secure form reply from the ${q.to} (simulated)` };
      /* An answer that repeats a suggestion already waiting adds nothing new to review. */
      const fresh = answers.filter((a) => !r.suggestions.some((x) => x.status === "pending" && x.section === a.section && x.field === a.field && x.value === a.value));
      const added: Suggestion[] = fresh.map((a) => ({ id: uid("sg"), ...a, source, confidence: "high", agent: "reader", at: s.clock, status: "pending" }));
      s.patchIntake(q.recordId, (x) => ({ ...x, suggestions: [...x.suggestions, ...added] }));
      updateRequest(requestId, { status: "replied", repliedAt: s.clock, suggestionIds: added.map((x) => x.id) });
      s.updateIntakeTask(q.recordId, q.taskId, { status: added.length ? "needs_you" : "done", result: `Reply received: ${added.length} answer${added.length === 1 ? "" : "s"} wait for staff review`, gate: { kind: "suggestions", ids: added.map((x) => x.id) } });
      s.addIntakeAudit(q.recordId, { actor: meOf(s), action: `Simulated the ${q.to}'s secure form reply (demo control)`, detail: `${added.length} answer${added.length === 1 ? "" : "s"} added as suggestions`, section: "profile" });
      return added.length;
    },

    cancelPatientRequest: (requestId) => {
      const s = get();
      const q = s.profileRequests.find((x) => x.id === requestId);
      if (!q || q.status !== "waiting") return;
      updateRequest(requestId, { status: "cancelled" });
      s.updateIntakeTask(q.recordId, q.taskId, { status: "cancelled", result: "Request cancelled by staff" });
      s.addIntakeAudit(q.recordId, { actor: meOf(s), action: `Cancelled the secure form to the ${q.to}`, section: "profile" });
    },
  };
};
