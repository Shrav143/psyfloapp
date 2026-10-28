import type { StateCreator } from "zustand";
import type { ProgramId } from "@/data/assess/types";
import type { DeclineReasonCode, NoticeChannel, NoticeKind, RedirectReasonCode, ReferralNotice } from "@/data/intake/decision";
import { DECLINE_REASON, REDIRECT_REASON } from "@/data/intake/decision";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { draftNotice } from "@/data/intake/notices";
import { ageFromDob, CAPACITY_SEED, partTwoApplies, programIdOf, riskFindings, type Capacity } from "@/data/intake/referralFacts";
import { staffOf } from "@/data/intake/seed";
import type { AuditEvent, FieldState, FieldValue, IntakeDocument, IntakeRecord, SourceRef, Suggestion } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { VA_PLANS } from "@/data/va/plans";
import { REDESIGN_START } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { DAY, longDate } from "@/lib/time";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* Intake: referral creation and decisions. A new referral is read into a draft first (nothing is a record until a person saves, decides or asks
   for information), then it becomes the intake record: one record is the referral and the intake. Every action a person takes writes an audit event,
   and no notice leaves the demo until a person approves it. Actions that edit fields work on a draft (id RD-n) and on a record alike. */

export type FieldSectionRef = "referral" | "profile" | "coverage";
const URGENCY_TEXT: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };

/** A referral that has been read and waits for a person. It carries the whole record, so the review screen works the same on a draft and on a saved referral. */
export interface ReferralDraft {
  id: string;
  record: IntakeRecord;
  step: "extracting" | "review";
  /** One line for the drafts list: "Pediatric practice referral". */
  label: string;
  startedAt: number;
  /** A person chose to create the record although it looks like another, and said why. */
  dup?: { ofId: string; reason: string };
}

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

let n = 0;
const uidR = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
export const isReferralDraftId = (id: string): boolean => id.startsWith("RD-");

/** The record a draft or an intake id names. */
export const referralOf = (s: Pick<AppState, "intakes" | "referralDrafts">, id: string): IntakeRecord | undefined =>
  isReferralDraftId(id) ? s.referralDrafts.find((d) => d.id === id)?.record : s.intakes.find((r) => r.id === id);

/** What is left of a program's demo capacity. Null for a program with no limit in the demo. */
export function capacityOf(s: Pick<AppState, "capacityOpen">, programId: ProgramId | null): (Capacity & { id: ProgramId }) | null {
  const seed = programId ? CAPACITY_SEED[programId] : undefined;
  if (!programId || !seed) return null;
  return { ...seed, id: programId, open: s.capacityOpen[programId] ?? seed.open };
}
/** How many records wait on a program's list. */
export const waitlistCount = (s: Pick<AppState, "intakes">, programId: ProgramId): number => s.intakes.filter((r) => r.waitlist?.programId === programId).length;

/** "Taylor Brooks, Intake coordinator": how a notice is signed. */
export const signatureOf = (staffId: string): string => {
  const s = staffOf(staffId);
  return s ? `${s.name}, ${s.role}` : "";
};

export const createIntakeReferralSlice: StateCreator<AppState, [], [], IntakeReferralSlice> = (set, get) => {
  const rec = (id: string) => referralOf(get(), id);
  /** Drafts and records are changed the same way. */
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => {
    if (isReferralDraftId(id)) set((s) => ({ referralDrafts: s.referralDrafts.map((d) => (d.id === id ? { ...d, record: fn(d.record) } : d)) }));
    else get().patchIntake(id, fn);
  };
  const audit = (id: string, e: Omit<AuditEvent, "id" | "at">) => patch(id, (r) => ({ ...r, audit: [...r.audit, { id: uidR("ev"), at: get().clock, section: "referral", ...e }] }));
  const withField = (r: IntakeRecord, section: FieldSectionRef, key: string, fv: FieldValue): IntakeRecord => ({ ...r, [section]: { ...r[section], [key]: fv } });
  const addNotice = (id: string, kind: NoticeKind, d: { to: string; channel: NoticeChannel; subject: string; body: string }, items?: string[]): string => {
    const nid = uidR("nt");
    const notice: ReferralNotice = { id: nid, kind, ...d, status: "draft", createdAt: get().clock, createdBy: meOf(get()), ...(items ? { items } : {}) };
    patch(id, (r) => ({ ...r, referralNotices: [...(r.referralNotices ?? []), notice] }));
    return nid;
  };
  /** Makes sure the referral is a record, saving a draft if need be. */
  const real = (id: string): string | null => (isReferralDraftId(id) ? get().saveIntakeDraft(id) : rec(id) ? id : null);
  const openRisk = (r: IntakeRecord): boolean => r.safety?.status === "open" || (!r.safety && riskFindings(r).length > 0);

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
      const me = meOf(s);
      const reviewed = state === "verified" ? { reviewedBy: me, reviewedAt: s.clock } : {};
      patch(id, (r) => {
        let next = withField(r, section, key, { value, state, source: source ?? { kind: "staff", ref: "Entered by staff" }, at: s.clock, by: me, ...reviewed });
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
      audit(id, { actor: me, action: `Edited ${key}`, detail: value ? undefined : "Cleared" });
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

    /* ------------------------------------------------------------ decisions */
    acceptIntakeReferral: (id, o) => {
      const s = get();
      const r0 = rec(id);
      if (!r0) return null;
      const programId = programIdOf(r0.serviceId);
      const cap = capacityOf(s, programId);
      const full = !!cap && cap.open <= 0;
      if (full && !o?.waitlist) return null;
      const rid = real(id);
      if (!rid) return null;
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const waitlisted = full && !!o?.waitlist;
      const position = programId ? waitlistCount(get(), programId) + 1 : 1;
      const label = serviceById(r.serviceId).short;
      const notice = addNotice(rid, "accepted", draftNotice(r, "accepted", { signedBy: signatureOf(me), message: waitlisted ? "The program has no open place right now, so the person is on the waitlist (demo configuration)." : undefined }));
      patch(rid, (x) => ({
        ...x, triage: "accepted", triageNote: waitlisted ? `On the waitlist for ${label}, position ${position}` : undefined,
        referralDecision: { kind: "accepted", at: s.clock, by: me, note: o?.note?.trim() || undefined, noticeId: notice },
        ...(waitlisted && programId ? { waitlist: { programId, label, since: s.clock, by: me, position, note: "No open place at the time of acceptance (demo configuration)" } } : {}),
      }));
      if (cap && !waitlisted && programId) set((st) => ({ capacityOpen: { ...st.capacityOpen, [programId]: Math.max(0, (st.capacityOpen[programId] ?? cap.open) - 1) } }));
      audit(rid, { actor: me, action: waitlisted ? "Accepted for assessment and added to the waitlist" : "Accepted for assessment", detail: [cap ? `${label}: ${waitlisted ? `no open ${cap.unit}` : `${cap.open - 1} of ${cap.total} ${cap.unit}s open after this`} (demo configuration)` : null, o?.note?.trim()].filter(Boolean).join(" · ") || undefined });
      get().toast({ title: waitlisted ? `${rid} is on the waitlist` : `${rid} accepted for assessment`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "good" });
      return { id: rid, outcome: waitlisted ? "waitlisted" : "accepted" };
    },
    redirectIntakeReferral: (id, o) => {
      const r0 = rec(id);
      if (!r0 || openRisk(r0)) return null;
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const reason = REDIRECT_REASON[o.reasonCode];
      const notice = addNotice(rid, "redirected", draftNotice(r, "redirected", { signedBy: signatureOf(me), reasonCode: o.reasonCode, destination: o.destination.org, message: o.reasonCode === "other" ? o.note : undefined }));
      patch(rid, (x) => ({ ...x, triage: "redirected", triageNote: `${reason}. Sent to ${o.destination.org}.`, referralDecision: { kind: "redirected", at: s.clock, by: me, reasonCode: o.reasonCode, reason, note: o.note?.trim() || undefined, destination: o.destination, noticeId: notice } }));
      audit(rid, { actor: me, action: "Redirected the referral", detail: `${reason} · to ${o.destination.org}${o.note?.trim() ? ` · ${o.note.trim()}` : ""}` });
      get().toast({ title: `${rid} redirected`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "neutral" });
      return rid;
    },
    declineIntakeReferral: (id, o) => {
      const r0 = rec(id);
      if (!r0 || openRisk(r0)) return null;
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const reason = DECLINE_REASON[o.reasonCode];
      const notice = addNotice(rid, "declined", draftNotice(r, "declined", { signedBy: signatureOf(me), reasonCode: o.reasonCode, message: o.reasonCode === "other" ? o.note : undefined }));
      patch(rid, (x) => ({ ...x, triage: "declined", triageNote: `${reason}.${o.note?.trim() ? ` ${o.note.trim()}` : ""}`, referralDecision: { kind: "declined", at: s.clock, by: me, reasonCode: o.reasonCode, reason, note: o.note?.trim() || undefined, noticeId: notice } }));
      audit(rid, { actor: me, action: "Declined the referral", detail: `${reason}${o.note?.trim() ? ` · ${o.note.trim()}` : ""}` });
      get().toast({ title: `${rid} declined`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "neutral" });
      return rid;
    },
    closeIntakeReferral: (id, reason) => {
      const s = get();
      const me = meOf(s);
      patch(id, (r) => ({ ...r, triage: "closed", triageNote: reason.trim(), referralDecision: { kind: "closed", at: s.clock, by: me, reason: reason.trim() } }));
      audit(id, { actor: me, action: "Closed the referral", detail: reason.trim() });
    },
    reopenIntakeReferral: (id, reason) => {
      const s = get();
      const r = rec(id);
      if (!r) return;
      const was = r.triage;
      patch(id, (x) => ({ ...x, triage: "new", triageNote: undefined, referralDecision: undefined, waitlist: undefined }));
      audit(id, { actor: meOf(s), action: "Reopened the referral", detail: `Was ${was}. ${reason.trim()}` });
    },
    requestIntakeMissingInfo: (id, o) => {
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const nid = addNotice(rid, "missing_info", { to: o.to, channel: o.channel, subject: o.subject, body: o.body }, o.items);
      const r = rec(rid) as IntakeRecord;
      if (r.triage === "new") patch(rid, (x) => ({ ...x, triage: "needs_info", triageNote: `Waiting on the referrer: ${o.items.join(", ") || "more information"}` }));
      audit(rid, { actor: me, action: "Drafted a request for missing information", detail: `To ${o.to}: ${o.items.join("; ") || "see message"}` });
      if (o.send) get().sendIntakeNotice(rid, nid, o.send.basis);
      else {
        get().addIntakeTask(rid, { role: "coordination", action: "Approve and send the request for missing information", status: "needs_you", section: "referral", approval: "required", result: "The draft waits for a person to approve it" });
        get().toast({ title: "Request drafted", body: "It is not sent until you approve it.", tone: "neutral" });
      }
      return rid;
    },
    editIntakeNotice: (id, noticeId, p) => patch(id, (r) => ({ ...r, referralNotices: (r.referralNotices ?? []).map((x) => (x.id === noticeId && x.status === "draft" ? { ...x, ...p } : x)) })),
    sendIntakeNotice: (id, noticeId, basis) => {
      const s = get();
      const r = rec(id);
      const notice = r?.referralNotices?.find((x) => x.id === noticeId);
      if (!r || !notice || notice.status !== "draft") return false;
      const roi = r.profile.roi?.value === "On file";
      if (basis === "release_on_file" && !roi) return false;
      if (basis === "protocol_attested" && partTwoApplies(r)) return false;
      const me = meOf(s);
      patch(id, (x) => ({ ...x, referralNotices: (x.referralNotices ?? []).map((n2) => (n2.id === noticeId ? { ...n2, status: "sent", sentAt: s.clock, approvedBy: me, basis } : n2)) }));
      audit(id, { actor: me, action: `Approved and sent (simulated): ${notice.subject}`, detail: `To ${notice.to} by ${notice.channel.toLowerCase()}. ${basis === "release_on_file" ? "Release of information on file." : "Organization protocol attested, not legal advice."}` });
      if (notice.kind === "missing_info" && !isReferralDraftId(id)) {
        const pending = r.tasks.find((t) => t.action === "Approve and send the request for missing information" && t.status === "needs_you");
        if (pending) s.updateIntakeTask(id, pending.id, { status: "done", result: "Approved and sent (simulated)" });
        s.addIntakeTask(id, { role: "coordination", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${notice.to}`, approval: "approved", result: `Asked for ${notice.items?.join(", ").toLowerCase() || "more information"}. Sent by ${staffOf(me)?.name ?? "staff"} (simulated ${notice.channel.toLowerCase()}); follow up in 2 business days.` });
      }
      s.toast({ title: `Sent to ${notice.to} (simulated)`, body: "Nothing left the demo.", tone: "good" });
      return true;
    },
    discardIntakeNotice: (id, noticeId) => {
      patch(id, (r) => ({ ...r, referralNotices: (r.referralNotices ?? []).map((x) => (x.id === noticeId && x.status === "draft" ? { ...x, status: "discarded" } : x)) }));
      audit(id, { actor: meOf(get()), action: "Discarded a draft notice" });
    },
    removeIntakeFromWaitlist: (id) => {
      patch(id, (r) => ({ ...r, waitlist: undefined, triageNote: undefined }));
      audit(id, { actor: meOf(get()), action: "Removed from the waitlist" });
    },
  };
};
