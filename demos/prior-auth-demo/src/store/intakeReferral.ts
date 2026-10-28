import type { StateCreator } from "zustand";
import type { DeclineReasonCode, NoticeChannel, RedirectReasonCode, ReferralNotice } from "@/data/intake/decision";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { ageFromDob, CAPACITY_SEED } from "@/data/intake/referralFacts";
import { staffOf } from "@/data/intake/seed";
import type { FieldState, IntakeDocument, IntakeRecord, SourceRef, Suggestion } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { VA_PLANS } from "@/data/va/plans";
import { REDESIGN_START } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { meOf } from "./intake";
import type { AppState } from "./index";
import { referralTools, uidR, type FieldSectionRef, type ReferralDraft } from "./intakeReferralKit";
import { createDecisionActions } from "./intakeReferralDecide";

export { capacityOf, isReferralDraftId, referralOf, signatureOf, waitlistCount, type FieldSectionRef, type ReferralDraft } from "./intakeReferralKit";

/* Intake: referral creation and decisions. A new referral is read into a draft first (nothing is a record until a person saves, decides or asks
   for information), then it becomes the intake record: one record is the referral and the intake. Every action a person takes writes an audit event,
   and no notice leaves the demo until a person approves it. Actions that edit fields work on a draft (id RD-n) and on a record alike. */

const URGENCY_TEXT: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };

export interface IntakeReferralSlice {
  referralDrafts: ReferralDraft[];
  referralDraftCounter: number;
  /** Open places left per program, from the demo capacity configuration. Accepting a referral takes one. */
  capacityOpen: Record<string, number>;

  setIntakeService: (id: string, serviceId: VaServiceId) => void;
  /** Planned service start, demo minutes. */
  setIntakeServiceDate: (id: string, date: number) => void;
  setIntakeUrgency: (id: string, urgency: Urgency) => void;
  setIntakePriority: (id: string, on: boolean) => void;
  /** Attach a document (every import in the demo is simulated). */
  addIntakeDocument: (id: string, doc: IntakeDocument, note?: string) => void;
  /** An agent's output: new pending suggestions. Nothing is written to a field until a person decides. */
  addIntakeSuggestions: (id: string, suggestions: Suggestion[]) => void;
  /** A person accepts several suggestions after reviewing the list. Each acceptance is recorded with the reviewer. */
  acceptSuggestions: (id: string, suggestionIds: string[]) => void;
  /** A person reviewed the drafted request and sent it (simulated). Creates the task that waits for the reply. */
  requestIntakeInfo: (id: string, req: { to: string; channel: string; items: string[]; message: string; needsInfo: boolean }) => void;
  /** The referrer answered. */
  markIntakeInfoReply: (id: string, taskId: string) => void;
  /** A clinician closes a safety alert as reviewed, after signing. Records the signer as the reviewer. */
  closeSafetyReview: (id: string, signerId: string, note: string) => void;

  /** Starts a draft. `build` gets the draft id (RD-n) and returns the record. Returns the id. */
  startIntakeDraft: (build: (id: string) => IntakeRecord, label: string, step?: ReferralDraft["step"]) => string;
  finishIntakeDraft: (id: string) => void;
  discardIntakeDraft: (id: string) => void;
  setIntakeDraftDuplicate: (id: string, dup: { ofId: string; reason: string } | null) => void;
  /** Saves a draft as the intake record (status New). Returns the new id, or null when there is no such draft. `dupReason`: why it was created although it looks like another record. */
  saveIntakeDraft: (id: string, dupReason?: { ofId: string; reason: string }) => string | null;

  /** Edits a field of a draft or a record. A value a person sets or confirms is recorded with them as the reviewer. */
  editIntakeReferralField: (id: string, section: FieldSectionRef, key: string, value: string, state: FieldState, source?: SourceRef) => void;
  /** A person confirms values as they stand. A confirmed value is Verified, and a conflict on it is closed. */
  confirmIntakeReferralFields: (id: string, keys: { section: FieldSectionRef; key: string }[]) => void;
  setIntakeReferralService: (id: string, serviceId: VaServiceId) => void;
  setIntakeReferralUrgency: (id: string, urgency: Urgency) => void;
  /** A person sets the initials and age the referral names. The date of birth, when there is one, keeps the age. */
  setIntakeReferralPerson: (id: string, p: { initials: string; age: number | null }) => void;
  assignIntakeReferral: (id: string, staffId: string) => void;

  /** Accept for assessment. A draft becomes the record. Refuses (null) when the program is at capacity and `waitlist` is not set. */
  acceptIntakeReferral: (id: string, o?: { waitlist?: boolean; note?: string }) => { id: string; outcome: "accepted" | "waitlisted" } | null;
  /** Redirect with a reason and a destination: a draft notice goes to the referrer, unsent. Refuses (null) while risk information waits for a clinician. */
  redirectIntakeReferral: (id: string, o: { reasonCode: RedirectReasonCode; destination: { org: string; id?: string }; note?: string }) => string | null;
  /** Decline with a reason from the list: a draft notice goes to the referrer, unsent. Refuses (null) while risk information waits for a clinician. */
  declineIntakeReferral: (id: string, o: { reasonCode: DeclineReasonCode; note?: string }) => string | null;
  closeIntakeReferral: (id: string, reason: string) => void;
  /** Puts a declined, redirected or closed referral back to New, with the reason, so it can be worked again. */
  reopenIntakeReferral: (id: string, reason: string) => void;
  /** Asks the referrer for missing information. The request is a draft notice; `send` approves and sends it (simulated). Needs information and a follow-up are added. */
  requestIntakeMissingInfo: (id: string, o: { items: string[]; to: string; channel: NoticeChannel; subject: string; body: string; send?: { basis: NonNullable<ReferralNotice["basis"]> } }) => string | null;
  editIntakeNotice: (id: string, noticeId: string, patch: Partial<Pick<ReferralNotice, "to" | "channel" | "subject" | "body">>) => void;
  /** A person approves a draft notice and it is sent (simulated). Returns false when no consent basis holds. */
  sendIntakeNotice: (id: string, noticeId: string, basis: NonNullable<ReferralNotice["basis"]>) => boolean;
  discardIntakeNotice: (id: string, noticeId: string) => void;
  removeIntakeFromWaitlist: (id: string) => void;
}

export const createIntakeReferralSlice: StateCreator<AppState, [], [], IntakeReferralSlice> = (set, get) => {
  const t = referralTools(set, get);
  const { rec, patch, audit, withField } = t;
  return {
    referralDrafts: [],
    referralDraftCounter: 0,
    capacityOpen: Object.fromEntries(Object.entries(CAPACITY_SEED).map(([k, v]) => [k, v?.open ?? 0])),

    setIntakeService: (id, serviceId) => get().setIntakeReferralService(id, serviceId),
    setIntakeServiceDate: (id, date) => {
      const r = rec(id);
      if (!r || r.serviceDate === date) return;
      patch(id, (x) => ({ ...x, serviceDate: date }));
      audit(id, { actor: meOf(get()), action: "Changed the planned start", detail: `${longDate(r.serviceDate)} to ${longDate(date)}` });
    },
    setIntakeUrgency: (id, urgency) => get().setIntakeReferralUrgency(id, urgency),
    setIntakePriority: (id, on) => {
      patch(id, (x) => ({ ...x, priority: on }));
      audit(id, { actor: meOf(get()), action: on ? "Marked high priority" : "Removed high priority" });
    },
    addIntakeDocument: (id, doc, note) => {
      patch(id, (x) => ({ ...x, documents: [...x.documents, doc] }));
      audit(id, { actor: meOf(get()), action: `Added a document: ${doc.name}`, detail: note ?? (doc.simulated ? "Simulated import" : undefined) });
    },
    addIntakeSuggestions: (id, suggestions) => {
      if (!suggestions.length) return;
      patch(id, (x) => ({ ...x, suggestions: [...x.suggestions, ...suggestions] }));
    },
    acceptSuggestions: (id, ids) => {
      const r = rec(id);
      if (!r) return;
      const take = ids.filter((sid) => r.suggestions.some((s) => s.id === sid && s.status === "pending"));
      for (const sid of take) get().decideSuggestion(id, sid, "accepted");
      if (take.length) audit(id, { actor: meOf(get()), action: `Accepted ${take.length} high-confidence suggestions after reviewing the list`, detail: "Conflicts and safety-related items were left for one-by-one review" });
    },
    requestIntakeInfo: (id, req) => {
      const s = get();
      const me = meOf(s);
      audit(id, { actor: me, action: "Sent a request for missing information to the referrer (simulated)", detail: `To ${req.to} by ${req.channel}: ${req.items.join("; ") || "see message"}` });
      s.addIntakeTask(id, {
        role: "coordination", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${req.to}`, approval: "approved",
        result: `Asked for ${req.items.length ? req.items.join(", ").toLowerCase() : "more information"}. Sent by ${staffOf(me)?.name ?? "staff"} (simulated ${req.channel.toLowerCase()}); follow up in 2 business days.`,
      });
      if (req.needsInfo) {
        const r = rec(id);
        if (r && r.triage !== "needs_info") s.setTriage(id, "needs_info", `Waiting on the referrer: ${req.items.join(", ") || "more information"}`);
      }
      s.toast({ title: `Request sent to ${req.to} (simulated)`, body: "Navigator tracks the reply. Nothing left the demo.", tone: "good" });
    },
    markIntakeInfoReply: (id, taskId) => {
      const s = get();
      s.updateIntakeTask(id, taskId, { status: "done", result: "The referrer replied. Add what they sent with Add a document or edit the fields." });
      audit(id, { actor: meOf(s), action: "Recorded the referrer's reply" });
      /* Needs information means waiting on the referrer: with no other request open, the referral is back to New for a person to review. */
      const r = rec(id);
      const stillWaiting = r?.tasks.some((t) => t.id !== taskId && t.action === REPLY_TASK_ACTION && (t.status === "running" || t.status === "queued"));
      if (r && r.triage === "needs_info" && !stillWaiting) {
        patch(id, (x) => ({ ...x, triage: "new", triageNote: "The referrer replied. Add what they sent and review the referral." }));
        audit(id, { actor: "system", action: "Back to New: the referrer replied" });
      }
    },
    closeSafetyReview: (id, signerId, note) => {
      const s = get();
      s.resolveSafety(id, "documented", note);
      s.patchIntake(id, (x) => (x.safety ? { ...x, safety: { ...x.safety, acknowledgedBy: signerId } } : x));
    },

    /* ------------------------------------------------------------ drafts */
    startIntakeDraft: (build, label, step = "extracting") => {
      const s = get();
      const id = `RD-${s.referralDraftCounter + 1}`;
      set((st) => ({ referralDraftCounter: st.referralDraftCounter + 1, referralDrafts: [{ id, record: build(id), step, label, startedAt: s.clock }, ...st.referralDrafts] }));
      return id;
    },
    finishIntakeDraft: (id) => set((s) => ({ referralDrafts: s.referralDrafts.map((d) => (d.id === id ? { ...d, step: "review" } : d)) })),
    discardIntakeDraft: (id) => set((s) => ({ referralDrafts: s.referralDrafts.filter((d) => d.id !== id) })),
    setIntakeDraftDuplicate: (id, dup) => set((s) => ({ referralDrafts: s.referralDrafts.map((d) => (d.id === id ? { ...d, dup: dup ?? undefined } : d)) })),
    saveIntakeDraft: (id, dupArg) => {
      const s = get();
      const d = s.referralDrafts.find((x) => x.id === id);
      if (!d) return null;
      const dup = dupArg ?? d.dup;
      const me = meOf(s);
      const recId = `IN-${s.intakeCounter + 1}`;
      const base: IntakeRecord = {
        ...d.record, id: recId, createdAt: s.clock,
        audit: [...d.record.audit, { id: uidR("ev"), at: s.clock, actor: me, action: "Saved the referral", detail: `${d.label}${d.record.documents.some((x) => x.simulated) ? " (simulated extraction)" : ""}`, section: "referral" }],
        ...(dup ? { duplicateOf: { ofId: dup.ofId, reason: dup.reason, by: me, at: s.clock } } : {}),
      };
      set((st) => ({ intakes: [base, ...st.intakes], intakeCounter: st.intakeCounter + 1, referralDrafts: st.referralDrafts.filter((x) => x.id !== id) }));
      if (dup) audit(recId, { actor: me, action: `Created although it looks like ${dup.ofId}`, detail: dup.reason });
      /* Risk language in what was read goes to a clinician at once. A person decides nothing about safety here; the alert only puts it in front of one. */
      const found = riskFindings(base);
      if (found.length && !base.safety) {
        const src = [...Object.values(base.referral), ...Object.values(base.profile)].find((fv) => fv.value.includes(found[0].text))?.source;
        get().raiseSafety(recId, { raisedBy: "reader", text: `The referral says: "${found[0].text}" A clinician must review this today, before routine scheduling. Psyflo does not decide that a person is safe.`, source: src });
      }
      return recId;
    },

    /* ------------------------------------------------------------ fields */
    editIntakeReferralField: (id, section, key, value, state, source) => {
      const s = get();
      const before = rec(id)?.[section][key]?.value;
      const me = meOf(s);
      const reviewed = state === "verified" ? { reviewedBy: me, reviewedAt: s.clock } : {};
      patch(id, (r) => {
        const was = r[section][key];
        const history = was && was.value.trim() ? [...(was.history ?? []), { value: was.value, state: was.state, by: was.by, at: was.at }] : was?.history;
        let next = withField(r, section, key, { value, state, source: source ?? { kind: "staff", ref: "Entered by staff" }, at: s.clock, by: me, ...reviewed, ...(history ? { history } : {}) });
        if (key === "dob") {
          const age = ageFromDob(value, s.clock);
          if (age !== null) next = { ...next, age };
        }
        if (key === "plan") {
          const plan = VA_PLANS.find((p) => p.name === value);
          if (plan) next = { ...next, payerId: plan.payerId };
        }
        return next;
      });
      audit(id, { actor: me, action: `Edited ${key}`, detail: value ? (before ? `Was: ${before.length > 120 ? `${before.slice(0, 119)}…` : before}` : undefined) : "Cleared" });
    },
    confirmIntakeReferralFields: (id, keys) => {
      const s = get();
      const me = meOf(s);
      const r = rec(id);
      if (!r) return;
      const done = keys.filter((k) => {
        const fv = r[k.section][k.key];
        return fv && fv.value.trim() && fv.state !== "verified";
      });
      if (!done.length) return;
      patch(id, (x) => done.reduce((acc, k) => {
        const fv = acc[k.section][k.key];
        const { conflict: _closed, ...rest } = fv;
        return withField(acc, k.section, k.key, { ...rest, state: "verified", reviewedBy: me, reviewedAt: s.clock });
      }, x));
      audit(id, { actor: me, action: done.length === 1 ? `Confirmed ${done[0].key}` : `Confirmed ${done.length} fields`, detail: done.some((k) => r[k.section][k.key]?.conflict) ? "A conflict between sources was reviewed and closed" : undefined });
    },
    setIntakeReferralService: (id, serviceId) => {
      const s = get();
      const r = rec(id);
      if (!r || r.serviceId === serviceId) return;
      const me = meOf(s);
      const svc = serviceById(serviceId);
      patch(id, (x) => withField({ ...x, serviceId, title: x.title.replace(/: [^:]*$/, `: ${svc.short}`), serviceDate: svc.status === "redesign" ? Math.max(x.serviceDate, REDESIGN_START) : x.serviceDate }, "referral", "requestedService", { value: svc.label, state: "verified", at: s.clock, by: me, reviewedBy: me, reviewedAt: s.clock, source: { kind: "staff", ref: "Chosen by staff" } }));
      audit(id, { actor: me, action: "Changed the requested program", detail: `${serviceById(r.serviceId).short} to ${svc.short}` });
    },
    setIntakeReferralUrgency: (id, urgency) => {
      const s = get();
      const r = rec(id);
      if (!r || r.urgency === urgency) return;
      const me = meOf(s);
      patch(id, (x) => withField({ ...x, urgency, priority: urgency !== "routine" || x.priority }, "referral", "urgency", { value: URGENCY_TEXT[urgency], state: "verified", at: s.clock, by: me, reviewedBy: me, reviewedAt: s.clock, source: { kind: "staff", ref: "Chosen by staff" } }));
      audit(id, { actor: me, action: `Urgency: ${urgency}`, detail: `Was ${r.urgency}` });
    },
    setIntakeReferralPerson: (id, p) => {
      const s = get();
      const me = meOf(s);
      const text = `${p.initials}${p.age !== null ? `, ${p.age}` : ""}`;
      patch(id, (x) => withField({ ...x, initials: p.initials, age: p.age }, "referral", "person", { value: text, state: "verified", at: s.clock, by: me, reviewedBy: me, reviewedAt: s.clock, source: { kind: "staff", ref: "Entered by staff" } }));
      audit(id, { actor: me, action: "Set the person's initials and age", detail: text });
    },
    assignIntakeReferral: (id, staffId) => {
      patch(id, (r) => ({ ...r, assignedTo: staffId }));
      audit(id, { actor: meOf(get()), action: "Assigned", detail: staffOf(staffId)?.name ?? staffId });
    },

    ...createDecisionActions(set, get, t),
  };
};
