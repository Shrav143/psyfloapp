import type { ProgramId } from "@/data/assess/types";
import type { NoticeChannel, NoticeKind, ReferralNotice } from "@/data/intake/decision";
import { CAPACITY_SEED, riskFindings, type Capacity } from "@/data/intake/referralFacts";
import { staffOf } from "@/data/intake/seed";
import type { AuditEvent, FieldValue, IntakeRecord } from "@/data/intake/types";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* What the referral actions share: how a draft and a record are told apart and changed the same way, the demo capacity, and the notice signature. */

export type FieldSectionRef = "referral" | "profile" | "coverage";

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

let n = 0;
export const uidR = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
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

type Set = (fn: (s: AppState) => Partial<AppState>) => void;
type Get = () => AppState;

/** The helpers every referral action uses. `patch` changes a draft or a record; `real` makes sure there is a record, saving a draft if need be. */
export function referralTools(set: Set, get: Get) {
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

  return { rec, patch, audit, withField, addNotice, real, openRisk };
}
export type ReferralTools = ReturnType<typeof referralTools>;
