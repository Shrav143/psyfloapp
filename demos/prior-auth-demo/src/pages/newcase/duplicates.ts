/* The duplicate rule: the same patient, the same payer and the same program with an open request, or an active authorization whose dates overlap the dates asked for.
   A concurrent review, a renewal or a modification is linked to the authorization it refers to and is never a duplicate of that authorization.
   Pure: the draft, the patient book, the requests and the other drafts go in; the match, if any, comes out. The caller passes only records inside the sites in view. */
import type { CaseDraft } from "@/data/cases";
import { isoOf, minutesOf, payerNameOf, patientById, type PatientBook } from "@/data/patients";
import { usualDays } from "@/data/queue";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { DAY } from "@/lib/time";
import { paths } from "@/routes";
import { authType } from "./authType";

export interface DuplicateHit {
  /** What matched: another request or draft that is open, or an authorization that is active. */
  kind: "request" | "draft" | "authorization";
  /** The case id to show and to link to. */
  caseId: string;
  /** One line: "R-1042, an admission request being prepared". */
  title: string;
  /** Payer, level of care and dates. */
  detail: string;
  /** Where the existing record is. */
  to: string;
}

const personOf = (initials: string, age: number | null): string => `${initials.replace(/[.\s]/g, "").toLowerCase()}|${age ?? ""}`;
const mdy = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

/** The dates the draft asks for, in demo minutes: from the start date to the requested end, or the level of care's usual length. */
export function requestedRange(d: Pick<CaseDraft, "startDate" | "endDate" | "program">): { from: number; to: number } | null {
  if (!d.startDate) return null;
  const from = minutesOf(d.startDate);
  const to = d.endDate ? minutesOf(d.endDate) : from + ((usualDays(d.program ?? "RES") ?? 1) - 1) * DAY;
  return { from, to: Math.max(from, to) };
}
const overlaps = (a: { from: number; to: number }, b: { from: number; to: number }): boolean => a.from <= b.to && b.from <= a.to;

const OPEN_STAGES = new Set(["preparing", "received", "under_review", "info_requested"]);

export function findDuplicate(d: CaseDraft, book: PatientBook, requests: readonly PsyRequest[], drafts: readonly CaseDraft[]): DuplicateHit | null {
  if (!d.payerId || !d.program || !(d.patient.initials.trim() || d.patientId)) return null;
  const person = d.patientId ?? personOf(d.patient.initials, d.patient.age);
  const same = (initials: string, age: number | null, patientId?: string | null): boolean => (patientId && d.patientId ? patientId === d.patientId : personOf(initials, age) === personOf(d.patient.initials, d.patient.age));
  const mine = new Set([d.id, d.caseId ?? ""]);
  const range = requestedRange(d);
  const found = new Map<string, DuplicateHit>();

  for (const r of requests) {
    if (r.track !== "auth" || !OPEN_STAGES.has(r.stage) || mine.has(r.id) || mine.has(r.caseId)) continue;
    if (r.payerId !== d.payerId || r.program !== d.program || !same(r.patient.initials, r.patient.age, r.patientId ?? patientById(book, r.caseId)?.id)) continue;
    found.set(r.caseId, {
      kind: "request", caseId: r.caseId, title: `${r.caseId}, ${r.type.toLowerCase()} request, ${r.stage === "preparing" ? "being prepared" : "with the payer"}`,
      detail: `${payerNameOf(r.payerId)}, ${PROGRAM_LABEL[r.program]}`, to: paths.case(r.caseId),
    });
  }
  for (const o of drafts) {
    if (!o.saved || o.sent || mine.has(o.id) || mine.has(o.caseId ?? "") || !o.caseId || found.has(o.caseId)) continue;
    if (o.payerId !== d.payerId || o.program !== d.program || !same(o.patient.initials, o.patient.age, o.patientId)) continue;
    const theirs = requestedRange(o);
    if (range && theirs && !overlaps(range, theirs)) continue;
    found.set(o.caseId, {
      kind: "draft", caseId: o.caseId, title: `${o.caseId}, ${(o.type ?? "request").toLowerCase()}, being prepared`,
      detail: `${payerNameOf(o.payerId)}, ${PROGRAM_LABEL[o.program]}${o.startDate ? `, from ${mdy(o.startDate)}` : ""}`, to: paths.newCase({ draft: o.id }),
    });
  }
  const linked = authType(d.kind).existing ? d.authorizationId : null;
  for (const a of book.authorizations) {
    if (a.id === linked || a.payerId !== d.payerId || a.program !== d.program || (a.status !== "active" && a.status !== "expiring")) continue;
    const p = patientById(book, a.patientId);
    if (!p || (d.patientId ? p.id !== d.patientId : personOf(p.initials, p.age) !== person)) continue;
    const ep = book.episodes.find((e) => e.id === a.episodeId);
    if (!range || a.approvedFrom === null || a.approvedTo === null || !overlaps(range, { from: a.approvedFrom, to: a.approvedTo })) continue;
    const caseId = ep?.caseId ?? p.id;
    if (found.has(caseId)) continue;
    found.set(caseId, {
      kind: "authorization", caseId, title: `${caseId}, an active authorization`,
      detail: `${payerNameOf(a.payerId)}, ${PROGRAM_LABEL[a.program]}, approved ${mdy(isoOf(a.approvedFrom))} to ${mdy(isoOf(a.approvedTo))}`, to: paths.case(caseId),
    });
  }
  return [...found.values()][0] ?? null;
}
