/* Patients, treatment episodes and authorization records, for New Case.
   None of this is a second copy of the demo's data. It is derived, on demand, from what already exists:
   - a Patient is one person across cases (the Case Manager ledger, plus any request the Dashboard holds that the ledger does not);
   - a TreatmentEpisode is a stay at one level of care (one ledger case);
   - an AuthorizationRecord is the approved window of an episode: days or units authorized, used and left, its expiry and its history.
   A request signed in New Case carries `patientId`, `episodeId` and `authorizationId`, so it joins its patient's record instead of making a second patient. */
import { DAY, HOUR, toDate } from "@/lib/time";
import { SEED_LEDGER, type ClockKind, type LedgerCase } from "./manager";
import { payerById } from "./seed";
import { siteOf, type SiteId } from "./sites";
import { isCoreProgram, PROGRAM_LABEL, type CoreProgram, type PayerId, type Program, type PsyRequest } from "./types";

/* ------------------------------------------------------------------ shapes */
export interface Patient {
  /** The primary case id: the case the person first appears under. Never a second id for the same person. */
  id: string;
  initials: string;
  age: number;
  /** The payer on file. A payer change shows up in the verification (Eligibility & Benefits), not here. */
  payerId: PayerId;
  site: SiteId;
  /** The last four characters of the member ID, as "…4821". */
  memberMasked: string;
  /** Every case id that belongs to this person. */
  caseIds: string[];
}

export interface TreatmentEpisode {
  id: string;
  patientId: string;
  /** The case page this episode opens. */
  caseId: string;
  program: Program;
  levelLabel: string;
  payerId: PayerId;
  /** What the ledger calls the stay now: "Continued stay 3", "Recertification". */
  label: string;
}

/** active: days or units remain. expiring: ends within 7 days or two units or days are left. exhausted: none left.
    pending: no approved window yet. closed: the request was decided and no window is open. */
export type AuthStatus = "active" | "expiring" | "exhausted" | "pending" | "closed";
export const AUTH_STATUS_LABEL: Record<AuthStatus, string> = { active: "Active", expiring: "Expiring soon", exhausted: "None left", pending: "Not approved yet", closed: "Decided" };
export const AUTH_STATUS_TONE: Record<AuthStatus, "good" | "mid" | "risk" | "neutral"> = { active: "good", expiring: "mid", exhausted: "risk", pending: "neutral", closed: "neutral" };

export interface AuthEvent {
  /** Demo minutes. */
  at: number;
  text: string;
  by: "payer" | "agent" | "person";
}

export interface AuthorizationRecord {
  id: string;
  episodeId: string;
  patientId: string;
  payerId: PayerId;
  program: Program;
  unit: "days" | "units";
  status: AuthStatus;
  /** What the authorization is for, in the ledger's words. */
  label: string;
  authorized: number | null;
  used: number | null;
  left: number | null;
  /** Demo minutes at the start of the first and the last approved day. Null while nothing is approved. */
  approvedFrom: number | null;
  approvedTo: number | null;
  /** The next event that binds: the expiry, a review, a decision. */
  next: { kind: ClockKind; at: number };
  history: AuthEvent[];
}

export interface PatientBook {
  patients: Patient[];
  episodes: TreatmentEpisode[];
  authorizations: AuthorizationRecord[];
}

/* ------------------------------------------------------------------ seed supplements (the edge cases New Case demonstrates) */
/** Cases that Eligibility knows and the Case Manager ledger does not list: R-0921 has used every authorized day (Eligibility shows it as "Limit reached"). */
const EXTRA_ROWS: LedgerCase[] = [
  { id: "R-0921", caseId: "R-0921", initials: "J.D.", age: 45, program: "RES", payerId: "cardinal", note: "Continued stay", used: 14, total: 14, unit: "days", clockKind: "expiry", dueAt: 6 * HOUR, chance: 66, status: "needs_action" },
];

/** Member ID endings that script a coverage result in Eligibility (see data/eligibility.ts): R-1042 is the sample member, R-1101 is lapsed, R-0921 has used every day. */
const SCRIPTED_TAIL: Record<string, string> = { "R-1042": "4821", "R-1101": "1012", "R-0921": "9090" };
const RESERVED = ["1012", "9999", "3030", "6060", "9090"];
/** The last four characters of a person's member ID. Four digits from the case id, never one that scripts a coverage result unless the person is a scripted sample. */
export function memberTailOf(caseId: string): string {
  const scripted = SCRIPTED_TAIL[caseId];
  if (scripted) return scripted;
  const n = 1000 + ((Number(caseId.replace(/\D/g, "")) * 7919) % 9000);
  return String(RESERVED.includes(String(n)) ? n + 1 : n);
}
export const memberMaskedOf = (caseId: string): string => `…${memberTailOf(caseId)}`;

/* ------------------------------------------------------------------ the dates of an approval */
/** Demo minutes at the start of the day `m` falls on. */
export function dayStart(m: number): number {
  const d = toDate(m);
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - toDate(0).getTime()) / 60_000);
}
/** yyyy-mm-dd for a demo minute, the form a date field holds. */
export function isoOf(m: number): string {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Demo minutes (start of day) for a yyyy-mm-dd date. */
export function minutesOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - toDate(0).getTime()) / 60_000);
}

/** IOP units are sessions: three a week. A unit stands for 7/3 of a calendar day when the approved window is worked out. */
const DAYS_PER_UNIT = 7 / 3;

/** The approved window, from what the ledger knows. A window that ends on a date (expiry, or the day units run out) uses that date; any other binding event leaves the window ending when the days or units left run out. */
function windowOf(c: LedgerCase, now: number): { from: number; to: number } | null {
  if (c.total === null || c.used === null) return null;
  const per = c.unit === "units" ? DAYS_PER_UNIT : 1;
  const span = Math.max(1, Math.round(c.total * per));
  const left = Math.round(Math.max(0, c.total - c.used) * per);
  const to = dayStart(c.clockKind === "expiry" || c.clockKind === "units" ? c.dueAt : now + left * DAY);
  return { from: to - (span - 1) * DAY, to };
}

export function authStatusOf(c: LedgerCase, now: number): AuthStatus {
  if (c.total === null || c.used === null) return "pending";
  if (c.used >= c.total) return "exhausted";
  const w = windowOf(c, now);
  return (w && w.to - now <= 7 * DAY) || c.total - c.used <= 2 ? "expiring" : "active";
}

const NEXT_TEXT: Record<ClockKind, string> = {
  notice: "Notice to the payer is due",
  window: "The retro-authorization window closes",
  p2p: "The peer-to-peer window closes",
  answer: "The payer's question is due",
  expiry: "The authorization expires",
  review: "A concurrent review is due",
  decision: "A decision is expected",
  units: "The authorized units run out",
  next: "The next review is booked",
  stepdown: "A step-down plan is open",
};

function historyOf(c: LedgerCase, w: { from: number; to: number } | null, now: number): AuthEvent[] {
  const out: AuthEvent[] = [];
  if (w && c.total !== null && c.used !== null) {
    out.push({ at: w.from, text: `${c.note} approved: ${c.total} ${c.unit}`, by: "payer" });
    if (c.used > 0) out.push({ at: now, text: `${c.used} of ${c.total} ${c.unit} used so far`, by: "agent" });
  } else {
    out.push({ at: now, text: `${c.note} is being prepared or is with the payer. No days or units are approved yet`, by: "person" });
  }
  out.push({ at: c.dueAt, text: NEXT_TEXT[c.clockKind], by: "agent" });
  return out.sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------------ the book */
const openStage = (r: PsyRequest): boolean => r.track === "auth" && (r.stage === "preparing" || r.stage === "received" || r.stage === "under_review" || r.stage === "info_requested");

/** A request the ledger has no row for, as a ledger-shaped case with no approved window. */
function fromRequest(r: PsyRequest, program: CoreProgram): LedgerCase {
  return {
    id: r.id, caseId: r.caseId, initials: r.patient.initials, age: r.patient.age, program, payerId: r.payerId, note: r.type,
    used: null, total: null, unit: program === "IOP" ? "units" : "days", clockKind: r.track === "denial" ? "p2p" : "decision", dueAt: r.deadlineAt ?? r.stageSince + DAY, chance: r.chance ?? 0, status: "awaiting",
  };
}

/**
 * Every patient, episode and authorization the demo knows. `ledger` is the Case Manager ledger, `requests` the Dashboard's requests, `now` the demo clock.
 * A request that names a `patientId` joins that patient (a concurrent review, a modification); one that does not becomes a new patient.
 */
export function buildPatientBook(ledger: readonly LedgerCase[], requests: readonly PsyRequest[], now: number): PatientBook {
  const known = new Set(ledger.flatMap((c) => [c.id, c.caseId]));
  const rows: LedgerCase[] = [...ledger, ...EXTRA_ROWS.filter((c) => !known.has(c.id))];
  const rowIds = new Set(rows.flatMap((c) => [c.id, c.caseId]));
  const linked: PsyRequest[] = [];
  /* A request that names no patient, or itself, is a new patient. One that names an earlier patient joins that patient. */
  const selfPatient = (r: PsyRequest): boolean => !r.patientId || r.patientId === r.id || r.patientId === r.caseId;
  for (const r of requests) {
    if (rowIds.has(r.id) || rowIds.has(r.caseId)) continue;
    // The book is built on the ledger's four core levels of care; a request for another Virginia service is not a ledger case.
    const program = r.program;
    if (!isCoreProgram(program)) continue;
    if (!selfPatient(r)) {
      linked.push(r);
      continue;
    }
    rows.push(fromRequest(r, program));
    rowIds.add(r.id);
    rowIds.add(r.caseId);
  }

  const patients = new Map<string, Patient>();
  const episodes: TreatmentEpisode[] = [];
  const authorizations: AuthorizationRecord[] = [];

  const add = (c: LedgerCase, patientId: string, episodeId: string, authId: string, request?: PsyRequest): void => {
    const existing = patients.get(patientId);
    if (existing) {
      if (!existing.caseIds.includes(c.id)) existing.caseIds.push(c.id);
      if (c.caseId !== c.id && !existing.caseIds.includes(c.caseId)) existing.caseIds.push(c.caseId);
    } else {
      patients.set(patientId, {
        id: patientId, initials: c.initials, age: c.age, payerId: c.payerId, site: siteOf(patientId), memberMasked: memberMaskedOf(patientId),
        caseIds: [...new Set([c.id, c.caseId])],
      });
    }
    const w = windowOf(c, now);
    const left = c.total === null || c.used === null ? null : Math.max(0, c.total - c.used);
    let status = authStatusOf(c, now);
    if (request && c.total === null) status = openStage(request) ? "pending" : "closed";
    episodes.push({ id: episodeId, patientId, caseId: c.caseId, program: c.program, levelLabel: c.id === "R-1101" ? "Detox to Residential 3.5" : PROGRAM_LABEL[c.program], payerId: c.payerId, label: c.note });
    authorizations.push({
      id: authId, episodeId, patientId, payerId: c.payerId, program: c.program, unit: c.unit, status, label: c.note, authorized: c.total, used: c.used, left,
      approvedFrom: w?.from ?? null, approvedTo: w?.to ?? null, next: { kind: c.clockKind, at: c.dueAt }, history: historyOf(c, w, now),
    });
  };

  const byId = new Map(requests.map((r) => [r.id, r]));
  for (const c of rows) add(c, c.caseId, `EP-${c.id}`, `AU-${c.id}`, c.total === null ? byId.get(c.id) : undefined);

  /* A request signed in New Case for a patient who already exists: it joins that patient. A review, renewal or modification belongs to the episode and the authorization it names
     (the authorization's history gets a line); a new stay for the patient gets its own episode and a pending authorization. Never a second patient. */
  for (const r of linked) {
    const p = patients.get(r.patientId ?? "");
    if (!p) continue;
    if (!p.caseIds.includes(r.id)) p.caseIds.push(r.id);
    const sent: AuthEvent = { at: r.stageSince, text: `${r.type} request signed and sent`, by: "person" };
    const known = authorizations.find((a) => a.id === r.authorizationId);
    if (known) {
      known.history = [...known.history, sent].sort((a, b) => a.at - b.at);
      continue;
    }
    const episodeId = r.episodeId && episodes.some((e) => e.id === r.episodeId) ? r.episodeId : `EP-${r.id}`;
    if (!episodes.some((e) => e.id === episodeId)) episodes.push({ id: episodeId, patientId: p.id, caseId: r.id, program: r.program, levelLabel: PROGRAM_LABEL[r.program], payerId: r.payerId, label: r.type });
    authorizations.push({
      id: r.authorizationId ?? `AU-${r.id}`, episodeId, patientId: p.id, payerId: r.payerId, program: r.program, unit: r.program === "IOP" ? "units" : "days", status: openStage(r) ? "pending" : "closed", label: r.type,
      authorized: null, used: null, left: null, approvedFrom: null, approvedTo: null, next: { kind: "decision", at: r.stageSince + DAY }, history: [sent],
    });
  }

  return { patients: [...patients.values()], episodes, authorizations };
}

/** The book built from the seed ledger alone, for code that has no store. */
export const SEED_BOOK: PatientBook = buildPatientBook(SEED_LEDGER, [], 0);

/* ------------------------------------------------------------------ selectors (pure, scope in as a list of sites) */
export const patientsIn = (book: PatientBook, sites: readonly SiteId[]): Patient[] => book.patients.filter((p) => sites.includes(p.site));
export const episodesOf = (book: PatientBook, patientId: string): TreatmentEpisode[] => book.episodes.filter((e) => e.patientId === patientId);
export const authorizationsOf = (book: PatientBook, episodeId: string): AuthorizationRecord[] => book.authorizations.filter((a) => a.episodeId === episodeId);
export const patientById = (book: PatientBook, id: string): Patient | undefined => book.patients.find((p) => p.id === id || p.caseIds.includes(id));
/** Episodes and authorizations for the patients of the sites in view only. */
export const episodesIn = (book: PatientBook, sites: readonly SiteId[]): TreatmentEpisode[] => {
  const ids = new Set(patientsIn(book, sites).map((p) => p.id));
  return book.episodes.filter((e) => ids.has(e.patientId));
};
export const authorizationsIn = (book: PatientBook, sites: readonly SiteId[]): AuthorizationRecord[] => {
  const ids = new Set(patientsIn(book, sites).map((p) => p.id));
  return book.authorizations.filter((a) => ids.has(a.patientId));
};

const squash = (s: string): string => s.toLowerCase().replace(/[.\s-]/g, "");

/** Patients of the sites in `scope` whose initials or case id match `query`. "jm", "J.M." and "j m" find J.M.; "1042" and "R-1042" find the patient whose case that is.
    An empty query lists nobody, so a screen asks the person to type before it shows anyone. `book` defaults to the seed book. */
export function searchPatients(query: string, scope: readonly SiteId[], book: PatientBook = SEED_BOOK): Patient[] {
  const q = squash(query);
  if (!q) return [];
  const hits = patientsIn(book, scope)
    .map((p) => {
      const initials = squash(p.initials);
      const ids = p.caseIds.map(squash);
      const score = initials === q ? 0 : ids.some((id) => id === q) ? 1 : initials.startsWith(q) ? 2 : ids.some((id) => id.endsWith(q) || id.includes(q)) ? 3 : -1;
      return { p, score };
    })
    .filter((h) => h.score >= 0);
  return hits.sort((a, b) => a.score - b.score || a.p.initials.localeCompare(b.p.initials)).map((h) => h.p);
}

/* ------------------------------------------------------------------ wording */
const mdy = (m: number): string => {
  const d = toDate(m);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};
/** "10/12/2026 to 10/23/2026", or null while nothing is approved. */
export const windowText = (a: AuthorizationRecord): string | null => (a.approvedFrom === null || a.approvedTo === null ? null : `${mdy(a.approvedFrom)} to ${mdy(a.approvedTo)}`);
/** "10 of 48 units left", or "No days left". Null when no count is on file. */
export function leftText(a: AuthorizationRecord): string | null {
  if (a.left === null || a.authorized === null) return null;
  return a.left === 0 ? `No ${a.unit} left` : `${a.left} of ${a.authorized} ${a.unit} left`;
}
export const payerNameOf = (id: PayerId): string => payerById(id)?.shortName ?? "the payer";
