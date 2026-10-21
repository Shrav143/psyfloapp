import type { StateCreator } from "zustand";
import { CAPACITY_SEED, SAMPLE_COUNT, SEED_REFERRALS, sampleReferral, staffById, DECLINE_LABEL, isOpen, parseDiagnoses, type CheckKey, type DeclineReason, type FieldKey, type Referral, type ReplyVia, type StaffId } from "@/data/referrals";
import { PROGRAM_LABEL, PROGRAMS, type NewCasePrefill, type Program } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import type { AppState } from "./index";
import * as T from "./referralsLogic";

/* Referrals (owner: referrals module). The pipeline, bed capacity and the demo controls. Every transition
   is in referralsLogic.ts; this file wires them to toasts and notifications. */

export interface Capacity {
  total: number;
  open: number;
  unit: "bed" | "slot";
}

export interface ReferralsSlice {
  referrals: Referral[];
  capacity: Record<Program, Capacity>;
  /** Referral ids whose coverage check is running, with the real time it started (for the progress steps). */
  coverageRunning: Record<string, number>;

  markReferralOpened: (id: string) => void;
  /** Adds a referral read from the dropped documents (or the sample). Returns its id. */
  addReferral: (sampleIndex: number) => string;
  /** Sets the owner. A New referral moves to In review. Returns how many changed. */
  assignReferrals: (ids: string[], owner: StaffId | null) => number;
  addReferralNote: (id: string, text: string) => void;
  editReferralField: (id: string, key: FieldKey, value: string) => void;
  runCoverageCheck: (id: string) => void;
  acceptReferral: (id: string, o: { owner: StaffId; program: Program; admitBy: number }) => void;
  requestReferralInfo: (id: string, o: { via: ReplyVia; message: string }) => void;
  simulateReferrerReply: (id: string) => void;
  /** Declines open referrals. Returns how many changed. */
  declineReferrals: (ids: string[], o: { reason: DeclineReason; note: string; courtesy: boolean }) => number;
  overrideReferralCheck: (id: string, key: CheckKey, reason: string) => void;
  scheduleIntake: (id: string, at: number) => void;
  markAdmitted: (id: string) => void;
  reopenReferral: (id: string) => void;
}

const COVERAGE_MS = 3000;
const seedCapacity = (): Record<Program, Capacity> => Object.fromEntries(PROGRAMS.map((p) => [p, { ...CAPACITY_SEED[p] }])) as Record<Program, Capacity>;

export const createReferralsSlice: StateCreator<AppState, [], [], ReferralsSlice> = (set, get) => {
  const update = (id: string, fn: (r: Referral) => Referral): void => set((s) => ({ referrals: s.referrals.map((r) => (r.id === id ? fn(r) : r)) }));
  const find = (id: string): Referral | undefined => get().referrals.find((r) => r.id === id);
  const link = (id: string): string => paths.referral(id);

  return {
    referrals: SEED_REFERRALS,
    capacity: seedCapacity(),
    coverageRunning: {},

    markReferralOpened: (id) => {
      if (find(id)?.opened === false) update(id, (r) => ({ ...r, opened: true }));
    },

    addReferral: (sampleIndex) => {
      const { referrals, clock } = get();
      const id = `RF-${Math.max(...referrals.map((r) => Number(r.id.slice(3)) || 0)) + 1}`;
      const created = sampleReferral(sampleIndex % SAMPLE_COUNT, id, clock);
      set({ referrals: [created, ...referrals] });
      get().notify({ agent: "reader", title: "New referral read", body: `${id} from ${created.source.name} is on your checklist in New case.`, to: link(id), tone: "neutral" });
      get().toast({ title: "Reader read the documents", body: `${id} is ready. The checklist shows what is missing.`, tone: "good" });
      return id;
    },

    assignReferrals: (ids, owner) => {
      const clock = get().clock;
      const targets = get().referrals.filter((r) => ids.includes(r.id));
      set((s) => ({ referrals: s.referrals.map((r) => (ids.includes(r.id) ? T.assign(r, owner, clock) : r)) }));
      get().toast({ title: owner ? `Assigned to ${staffById(owner).name}` : "Owner removed", body: plural(targets.length, "referral"), tone: "good" });
      return targets.length;
    },

    addReferralNote: (id, text) => {
      if (!text.trim()) return;
      update(id, (r) => T.addNote(r, "jp", text.trim(), get().clock));
      get().toast({ title: "Note added", body: "Only you and your team can see it.", tone: "good" });
    },

    editReferralField: (id, key, value) => {
      update(id, (r) => T.editField(r, key, value, get().clock));
      get().toast({ title: "Saved", body: "The field is now marked as edited by you.", tone: "good" });
    },

    runCoverageCheck: (id) => {
      if (get().coverageRunning[id] !== undefined || !find(id)) return;
      const started = Date.now();
      set((s) => ({ coverageRunning: { ...s.coverageRunning, [id]: started } }));
      setTimeout(() => {
        if (get().coverageRunning[id] !== started) return;
        set((s) => ({ coverageRunning: Object.fromEntries(Object.entries(s.coverageRunning).filter(([k]) => k !== id)) }));
        update(id, (r) => T.applyCoverage(r, get().clock));
        const done = find(id);
        if (done?.coverage) get().toast({ title: "Verify checked coverage", body: done.coverage.headline, tone: done.coverage.kind === "lapsed" || done.coverage.kind === "unconfirmed" ? "mid" : "good" });
      }, COVERAGE_MS);
    },

    acceptReferral: (id, o) => {
      const r = find(id);
      if (!r) return;
      update(id, (x) => T.accept(x, o, get().clock));
      const cap = get().capacity[o.program];
      set((s) => ({ capacity: { ...s.capacity, [o.program]: { ...cap, open: Math.max(0, cap.open - 1) } } }));
      get().toast({ title: "Referral accepted", body: `${id} is accepted into ${PROGRAM_LABEL[o.program]}.`, tone: "good" });
    },

    requestReferralInfo: (id, o) => {
      const r = find(id);
      if (!r) return;
      update(id, (x) => T.requestInfo(x, o, get().clock));
      get().toast({ title: "Request sent", body: `${r.source.name} was asked for more information. ${id} is Awaiting info.`, tone: "good" });
    },

    simulateReferrerReply: (id) => {
      const r = find(id);
      if (!r) return;
      const { next, fixed } = T.simulateReply(r, get().clock);
      update(id, () => next);
      get().notify({ agent: "reader", title: "The referrer replied", body: `${r.source.name} answered ${id}. Reader read the reply and ${fixed} ${fixed === 1 ? "finding is" : "findings are"} resolved.`, to: link(id), tone: "good" });
      get().toast({ title: "The referrer replied", body: `${fixed} ${fixed === 1 ? "finding" : "findings"} resolved. ${id} is back In review.`, tone: "good" });
    },

    declineReferrals: (ids, o) => {
      const clock = get().clock;
      const targets = get().referrals.filter((r) => ids.includes(r.id) && isOpen(r.status));
      set((s) => ({ referrals: s.referrals.map((r) => (targets.some((t) => t.id === r.id) ? T.decline(r, o, clock) : r)) }));
      get().toast({ title: targets.length ? `Declined: ${DECLINE_LABEL[o.reason]}` : "Nothing to decline", body: targets.length ? plural(targets.length, "referral") + (o.courtesy ? ". Courtesy replies were sent." : ".") : "Only referrals that are still open can be declined.", tone: targets.length ? "neutral" : "mid" });
      return targets.length;
    },

    overrideReferralCheck: (id, key, reason) => {
      update(id, (r) => T.override(r, key, reason, get().clock));
      get().toast({ title: "Marked OK", body: "Your reason is on the activity timeline.", tone: "neutral" });
    },

    scheduleIntake: (id, at) => {
      update(id, (r) => T.scheduleIntake(r, at, get().clock));
      get().toast({ title: "Intake scheduled", body: `${id} is now Intake scheduled.`, tone: "good" });
    },

    markAdmitted: (id) => {
      update(id, (r) => T.admit(r, get().clock));
      get().toast({ title: "Marked admitted", body: `${id} counts as admitted in the funnel.`, tone: "good" });
    },

    reopenReferral: (id) => {
      update(id, (r) => T.reopen(r, get().clock));
      get().toast({ title: "Referral reopened", body: `${id} is back In review.`, tone: "neutral" });
    },
  };
};

/** Sidebar badge: new and in-review referrals that no one has opened yet. */
export const selectReferralBadge = (s: AppState): number => s.referrals.filter((r) => (r.status === "new" || r.status === "in_review") && !r.opened).length;

/** The New case flow calls this to pre-fill itself from a referral. Built from the extracted fields, so corrections carry over. */
export function referralPrefill(s: AppState, id: string): NewCasePrefill | null {
  const r = s.referrals.find((x) => x.id === id);
  if (!r) return null;
  const val = (key: FieldKey): string => {
    const v = r.fields.find((f) => f.key === key)?.value ?? "";
    return v.startsWith("Not found") ? "" : v;
  };
  return {
    referralId: r.id,
    patientInitials: val("patient") || r.patient.initials,
    age: Number.parseInt(val("age"), 10) || r.patient.age,
    payerId: r.payerId,
    memberIdMasked: val("memberId"),
    program: r.accepted?.program ?? r.program,
    diagnoses: parseDiagnoses(val("diagnoses")),
    reason: val("reason"),
    urgency: r.urgency,
    referrerName: val("clinician") || r.plan.clinician.name,
    sourceName: r.source.name,
  };
}

