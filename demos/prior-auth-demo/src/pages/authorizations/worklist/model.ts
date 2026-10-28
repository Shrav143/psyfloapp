import { detailForQueueItem } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, liveView, type CaseWork } from "@/data/caseModel";
import { siteOfDenial, type DenialMeta } from "@/data/denials";
import { chanceOfDraft, draftState, dueChip, needsPerson, type CaseDraft } from "@/data/cases";
import { LEDGER_STATUS_LABEL } from "@/data/manager";
import { inWeek, isClean, reviewStamp, type Review } from "@/data/managerReviews";
import { REQUEST_KIND_LABEL, STATUS_LABEL as PHASE_LABEL, isWaitingOnYou, requestFor, requestKindOf, type Band, type Phase, type QueueItem, type RequestKind } from "@/data/queue";
import { payerById } from "@/data/seed";
import { siteOf, type SiteId } from "@/data/sites";
import { PROGRAM_LABEL, type AgentKey, type PayerId, type Program, type PsyRequest, type Tone } from "@/data/types";
import { endsSoon } from "@/lib/ledgerFacts";
import { DAY } from "@/lib/time";
import { REVIEW_STATUS_LABEL, clockText, payerUpdateFor, payerUpdateText, runsOutBeforeReview, usedShare, type ManagerFilters } from "@/pages/manager/helpers";
import { nextStep, reviewsOf } from "@/pages/manager/ledgerCase";
import type { LedgerRow } from "@/pages/manager/ledgerRows";
import { agentNow, runLine } from "@/pages/newcase/runText";
import type { DenialAccepted, PayerChangeUpdate } from "@/store/ripples";
import { nextActionOf, type NextGo } from "../nextAction";
import { DUE_TONE, PHASE_TONE, chanceOf, dueText, phaseOf } from "../queueLogic";

/* The one Authorizations worklist: every request a person tracks, from preparation to the payer's decision and the approved authorization's reviews.
   It is worked out from what the store already holds (the queue rows, the Dashboard requests, the approved-authorization ledger, the New Authorization drafts,
   the week's clinical reviews and the accepted denials), one row per request: a queue row and its ledger row are the same request, so they are one row.
   Nothing here is stored. Each row keeps its sources, so the quick views, the case page and the review drawer open the same records they always did. */

/** Where a request is in its life. These four add up to every row; "needs attention" is a separate question (does a person have to act?). */
export type Life = "progress" | "payer" | "approved" | "denied";
export const LIFE_LABEL: Record<Life, string> = { progress: "In progress", payer: "With the payer", approved: "Approved", denied: "Denied" };

export type View = "all" | "attention" | Life | "reviews";
export const VIEWS: View[] = ["all", "attention", "progress", "payer", "approved", "denied", "reviews"];
export const VIEW_LABEL: Record<View, string> = { all: "All", attention: "Needs attention", ...LIFE_LABEL, reviews: "Reviews this week" };

/** What the row's button does. Resolved on click, so nothing is created before a person asks for it. */
export type Go =
  | { to: "case"; id: string; tab?: "actions" | "draft" | "criteria"; rec?: string }
  | { to: "reviewAndSign"; queueId: string }
  | { to: "draft"; draftId: string }
  | { to: "draftFromRequest"; requestId: string }
  | { to: "review"; reviewId: string }
  | { to: "denial"; id: string }
  | { to: "renew"; caseId: string }
  | { to: "dashboard"; requestId: string };

/** The deadline bands of the queue, plus "later" for an approved authorization whose next event is more than a week away. */
export type DueBand = Band | "later";
export const DUE_BANDS: DueBand[] = ["now", "day", "week", "later"];

export interface WorkRow {
  key: string;
  /** The id the row shows and searches by: the request id, the denial id, or the draft's case id. */
  id: string;
  /** Every id the record is known by (request, case, ledger, draft), for search and links. */
  ids: string[];
  /** The case page this row opens. */
  caseId: string;
  site: SiteId;
  initials: string;
  age: number | null;
  payerId: PayerId | null;
  program: Program | null;
  service: string;
  kind: RequestKind | null;
  typeLabel: string;
  life: Life;
  /** The status chip in the product's existing words: Preparing, Ready to sign, With the payer, Approved, Denial route… */
  status: { text: string; tone: Tone };
  /** Extra chips: Needs your input, Review due, Coverage needs a fix. */
  flags: { text: string; tone: Tone; to?: string }[];
  needsYou: boolean;
  next: string;
  action?: { label: string; go: Go; primary: boolean };
  dueAt: number | null;
  due: { text: string; tone: Tone } | null;
  band: DueBand;
  owner: AgentKey | null;
  chance: number | null;
  units?: { text: string; share: number; runsOut: boolean };
  review?: Review;
  /** The review's own action, used on Reviews this week whatever the row's request needs. */
  reviewAction?: { label: string; go: Go; primary: boolean };
  /** "New today", "Updated for a payer change · 10/20", "Consider a step-down". */
  notes: string[];
  signal: boolean;
  src: { item?: QueueItem; ledger?: LedgerRow; request?: PsyRequest; draft?: CaseDraft };
}

export interface WorkInput {
  items: QueueItem[];
  requests: PsyRequest[];
  cases: Record<string, CaseWork>;
  ledger: LedgerRow[];
  drafts: CaseDraft[];
  reviews: Review[];
  accepted: DenialAccepted[];
  updates: PayerChangeUpdate[];
  /** Denial Intelligence's record of each denial: a denial added from a letter carries its own site. */
  denialMeta: Record<string, DenialMeta | undefined>;
  clock: number;
}

/** Two cases flagged on Reviews this week for a look at a lower level of care. A prompt, never a decision. */
const STEP_DOWN_PROMPTS: Record<string, string> = { "R-0873": "Day 18 of 21 · aftercare visit not booked yet", "P-1522": "Day 11 · IOP starts Monday" };

const firstSentence = (s: string): string => {
  const m = /^(.*?[.!?])(\s|$)/.exec(s.trim());
  return m ? m[1] : s.trim();
};

/** The request type from a ledger note such as "Continued stay 3" or "Retro-authorization". */
function kindOfNote(note: string): RequestKind | null {
  if (/continued|concurrent/i.test(note)) return "concurrent";
  if (/recert|reauth|renewal/i.test(note)) return "reauth";
  if (/retro/i.test(note)) return "retro";
  if (/modif|extension/i.test(note)) return "modify";
  if (/admission|initial/i.test(note)) return "initial";
  return null;
}

/** The band of a time that is not a queue row's own: overdue or urgent is now, then the next day, the week, later. */
function bandOf(dueAt: number | null, clock: number, urgent = false): DueBand {
  if (dueAt === null) return "later";
  const left = dueAt - clock;
  if (left <= 0 || urgent) return "now";
  if (left < DAY) return "day";
  if (left < 7 * DAY) return "week";
  return "later";
}

const fromNextGo = (go: NextGo, id: string): Go =>
  go.to === "tab" ? { to: "case", id, tab: go.tab === "actions" || go.tab === "draft" || go.tab === "criteria" ? go.tab : undefined, rec: go.rec } : go.to === "review" ? { to: "reviewAndSign", queueId: id } : go.to === "dashboard" ? { to: "dashboard", requestId: go.requestId } : { to: "denial", id: go.id };

const DRAFT_STATUS = {
  intake: { text: "Patient & Service not finished", tone: "mid", cta: "Continue", primary: true },
  question: { text: "Needs your input", tone: "mid", cta: "Answer", primary: true },
  working: { text: "Agents working", tone: "neutral", cta: "Watch", primary: false },
  ready: { text: "Ready to sign", tone: "good", cta: "Review and sign", primary: true },
} as const;

const REQUEST_STATUS: Record<PsyRequest["stage"], string> = { preparing: "Preparing", received: "Submitted", under_review: "Under review", info_requested: "Info requested", decided: "Decided", appeal: "Denial route" };

/** What a review asks of a person: an update, a signature, a look at a check, or (no draft yet) a look. */
const reviewActionOf = (review: Review): NonNullable<WorkRow["action"]> => ({
  label: review.status === "needs_update" ? "Update the review" : review.status === "due" ? "Open the review" : isClean(review) ? "Review and sign" : "Check the review",
  go: { to: "review", reviewId: review.id },
  primary: review.status !== "due",
});

/** The rows, in the queue's order: by deadline band, then the ones waiting on a person, then the soonest due, then the lower approval chance. */
export function buildWorkRows(input: WorkInput): WorkRow[] {
  const { items, requests, cases, ledger, drafts, reviews, accepted, updates, clock } = input;
  const rows: WorkRow[] = [];
  const byId = new Map<string, WorkRow>();
  const index = (r: WorkRow) => {
    for (const id of r.ids) if (!byId.has(id)) byId.set(id, r);
  };
  const find = (...ids: (string | null | undefined)[]): WorkRow | undefined => ids.map((i) => (i ? byId.get(i) : undefined)).find(Boolean);

  /* 1. Open queue rows: the requests a person is preparing, signing, waiting on or working as a denial. */
  for (const i of items) {
    const work = cases[i.id] ?? EMPTY_WORK;
    const detail = withFocus(detailForQueueItem(i), work);
    const request = requestFor(i, requests);
    const live = liveView(detail, requests);
    const next = nextActionOf({ detail, work, live, canSend: canSend(detail, work) });
    const phase: Phase = phaseOf(i, cases);
    const life: Life = phase === "payer" ? "payer" : phase === "denial" ? "denied" : "progress";
    const row: WorkRow = {
      key: `q:${i.id}`, id: i.id, ids: [i.id, ...(request ? [request.id, request.caseId] : [])], caseId: i.id, site: siteOf(i.id),
      initials: i.initials, age: i.age, payerId: i.payerId, program: i.program, service: i.levelLabel, kind: requestKindOf(i.type), typeLabel: i.type,
      life, status: { text: PHASE_LABEL[phase], tone: PHASE_TONE[phase] },
      flags: [
        ...(i.needsInput && phase !== "ready" ? [{ text: "Needs your input", tone: "mid" as Tone }] : []),
        ...(i.coverageFix ? [{ text: "Coverage needs a fix", tone: "risk" as Tone, to: "eligibility" }] : []),
      ],
      needsYou: isWaitingOnYou(i), next: next.text,
      action: next.button
        ? { label: next.button.label, go: fromNextGo(next.button.go, i.id), primary: true }
        : phase === "denial" ? { label: "Open in Denial Intelligence", go: { to: "denial", id: request?.track === "denial" ? request.id : i.id }, primary: true }
        : { label: "Open", go: { to: "case", id: i.id }, primary: false },
      dueAt: i.dueAt, due: { text: dueText(i.dueVerb, i.dueAt, clock), tone: DUE_TONE[i.band] }, band: i.band,
      owner: i.agent, chance: chanceOf(i, cases), notes: [], signal: !!i.signal, src: { item: i, request },
    };
    rows.push(row);
    index(row);
  }

  /* 2. The ledger: approved authorizations and their units, and the requests waiting on a payer. A ledger row of a queue request joins that row. */
  for (const c of ledger) {
    const mine = reviewsOf(c, reviews);
    const review = mine.due ?? reviews.find((r) => r.ledgerId === c.id && inWeek(r));
    const share = usedShare(c);
    const units = share === null ? undefined : { text: `${c.used} of ${c.total} ${c.unit} used`, share, runsOut: runsOutBeforeReview(c, reviews, clock) };
    const known = find(c.id, c.caseId);
    if (known && !known.src.ledger) {
      known.src.ledger = c;
      known.units = units;
      known.review = review;
      if (c.isNew && !known.notes.includes("New today")) known.notes.unshift("New today");
      known.ids.push(c.id, c.caseId);
      index(known);
      continue;
    }
    const clk = clockText(c, clock);
    const request = requests.find((r) => r.id === c.id) ?? requests.find((r) => r.caseId === c.caseId);
    const approved = c.used !== null;
    let life: Life = c.clockKind === "p2p" || c.clockKind === "stepdown" ? "denied" : approved ? "approved" : c.clockKind === "decision" || c.clockKind === "answer" ? "payer" : "progress";
    let status =
      life === "approved" ? { text: "Approved", tone: "good" as Tone }
      : life === "denied" ? { text: c.clockKind === "stepdown" ? "Accepted" : "Denial route", tone: (c.clockKind === "stepdown" ? "neutral" : "risk") as Tone }
      : life === "payer" ? { text: c.clockKind === "answer" ? "Info requested" : "With the payer", tone: (c.clockKind === "answer" ? "mid" : "neutral") as Tone }
      : { text: "Preparing", tone: "neutral" as Tone };
    // The request is the live record: once the payer decides (or a denial is worked), the row says so, as the Dashboard does.
    if (request && life !== "denied" && (request.track === "denial" || (request.stage === "decided" && !approved))) {
      life = request.track === "denial" || request.outcome === "denied" ? "denied" : "approved";
      status = request.track === "denial" ? { text: "Denial route", tone: "risk" } : request.outcome === "partly_approved" ? { text: "Partial approval", tone: "mid" } : request.outcome === "denied" ? { text: "Denied", tone: "risk" } : { text: "Approved", tone: "good" };
    }
    const flags: WorkRow["flags"] = approved && (c.status === "review_due" || c.status === "needs_action") ? [{ text: LEDGER_STATUS_LABEL[c.status], tone: c.status === "needs_action" ? "risk" : "mid" }] : [];
    const action: WorkRow["action"] =
      review && review.status !== "signed" ? reviewActionOf(review)
      : c.clockKind === "p2p" ? { label: "Open in Denial Intelligence", go: { to: "denial", id: c.id }, primary: true }
      : approved && endsSoon(c, clock) ? { label: "Start reauthorization", go: { to: "renew", caseId: c.caseId }, primary: true }
      : { label: "Open", go: { to: "case", id: c.caseId }, primary: false };
    const update = payerUpdateFor([c.id, c.caseId], updates);
    const row: WorkRow = {
      key: `l:${c.id}`, id: c.id, ids: [c.id, c.caseId, ...(request ? [request.id] : [])], caseId: c.caseId, site: siteOf(c.caseId),
      initials: c.initials, age: c.age, payerId: c.payerId, program: c.program, service: PROGRAM_LABEL[c.program], kind: kindOfNote(c.note), typeLabel: c.note,
      life, status, flags, needsYou: c.status === "needs_action" || review?.status === "needs_update",
      next: firstSentence(nextStep(c, mine)), action,
      dueAt: c.dueAt, due: { text: clk.text, tone: clk.urgent ? "risk" : c.clockKind === "units" || c.clockKind === "next" ? "neutral" : "mid" }, band: bandOf(c.dueAt, clock, clk.urgent),
      owner: review ? review.agent : null, chance: c.chance, units, review,
      notes: [...(c.isNew ? ["New today"] : []), ...(update ? [payerUpdateText(update)] : [])], signal: false, src: { ledger: c, request },
    };
    rows.push(row);
    index(row);
  }

  /* 3. Dashboard requests that are in neither list: open denials, and requests decided or sent since. */
  for (const r of requests) {
    // A row holds one request. A denial keeps its case's id, so it joins a row by its case id only when that row is this request (or has none).
    const byCase = byId.get(r.caseId);
    const known = byId.get(r.id) ?? (byCase && (!byCase.src.request || byCase.src.request.id === r.id) ? byCase : undefined);
    if (known) {
      if (!known.src.request) known.src.request = r;
      continue;
    }
    const denial = r.track === "denial" || r.stage === "appeal" || r.id.startsWith("D-");
    const decided = r.stage === "decided";
    const life: Life = denial || (decided && r.outcome === "denied") ? "denied" : decided ? "approved" : r.stage === "preparing" ? "progress" : "payer";
    const status = decided
      ? r.outcome === "approved" ? { text: "Approved", tone: "good" as Tone } : r.outcome === "partly_approved" ? { text: "Partial approval", tone: "mid" as Tone } : { text: "Denied", tone: "risk" as Tone }
      : denial ? { text: "Denial route", tone: "risk" as Tone } : { text: REQUEST_STATUS[r.stage], tone: (r.stage === "info_requested" ? "mid" : "neutral") as Tone };
    const dueAt = decided ? null : r.deadlineAt ?? r.stageSince + (r.typicalMin ?? DAY);
    const verb = denial ? "Window closes" : r.stage === "info_requested" ? "Answer due" : r.stage === "preparing" ? "Due" : "Decision expected";
    const action: WorkRow["action"] = denial
      ? { label: "Open in Denial Intelligence", go: { to: "denial", id: r.id }, primary: true }
      : r.stage === "preparing" ? { label: "Review and sign", go: { to: "draftFromRequest", requestId: r.id }, primary: true }
      : r.needsYou ? { label: "Open on the Dashboard", go: { to: "dashboard", requestId: r.id }, primary: true }
      : { label: "Open", go: { to: "case", id: r.id }, primary: false };
    const row: WorkRow = {
      key: `r:${r.id}`, id: r.id, ids: [r.id, r.caseId], caseId: r.caseId, site: denial ? siteOfDenial(input.denialMeta[r.id], r.caseId) : siteOf(r.caseId),
      initials: r.patient.initials, age: r.patient.age, payerId: r.payerId, program: r.program, service: PROGRAM_LABEL[r.program], kind: requestKindOf(r.type), typeLabel: r.type,
      life, status, flags: r.needsYou && !denial ? [{ text: "Needs your input", tone: "mid" }] : [],
      needsYou: !!r.needsYou || (denial && r.deadlineAt !== undefined), next: firstSentence(r.next), action,
      dueAt, due: dueAt === null ? null : { text: dueText(verb, dueAt, clock), tone: dueAt - clock < 2 * DAY ? "risk" : "neutral" }, band: bandOf(dueAt, clock),
      owner: r.agent, chance: r.chance ?? null, notes: [], signal: false, src: { request: r },
    };
    rows.push(row);
    index(row);
  }

  /* 4. Drafts saved in New Authorization that are not a request yet. A draft of a request already listed stays on that row. */
  for (const d of drafts) {
    if (!d.saved || d.sent) continue;
    const known = find(d.caseId, d.id);
    if (known) {
      if (!known.src.draft) known.src.draft = d;
      continue;
    }
    const state = draftState(d);
    const st = DRAFT_STATUS[state];
    const chip = dueChip(d, clock);
    const row: WorkRow = {
      key: `d:${d.id}`, id: d.caseId ?? "New Authorization", ids: [d.id, ...(d.caseId ? [d.caseId] : [])], caseId: d.caseId ?? d.id, site: d.site,
      initials: d.patient.initials, age: d.patient.age, payerId: d.payerId, program: d.program, service: d.levelLabel ?? (d.program ? PROGRAM_LABEL[d.program] : "Level not set"),
      kind: d.kind, typeLabel: REQUEST_KIND_LABEL[d.kind], life: "progress", status: { text: st.text, tone: st.tone }, flags: [],
      needsYou: needsPerson(d), next: firstSentence(runLine(d)), action: { label: st.cta, go: { to: "draft", draftId: d.id }, primary: st.primary },
      dueAt: d.dueAt, due: chip, band: chip?.tone === "risk" ? "now" : bandOf(d.dueAt, clock), owner: agentNow(d), chance: state === "intake" ? null : chanceOfDraft(d),
      notes: [], signal: false, src: { draft: d },
    };
    rows.push(row);
    index(row);
  }

  /* 5. What else the record says: a denial the clinic accepted needs a step-down plan; a payer change updated a draft; a case flagged for a step-down look. */
  for (const a of accepted) {
    const row = find(a.denialId, a.requestId);
    if (!row) continue;
    row.life = "denied";
    row.status = { text: "Accepted", tone: "neutral" };
    row.flags = [];
    row.needsYou = true;
    row.next = "Plan the step-down: choose the next level of care and book the first visit.";
    row.action = { label: "Open case", go: { to: "case", id: row.caseId }, primary: true };
  }
  for (const row of rows) {
    const update = payerUpdateFor(row.ids, updates);
    if (update && !row.notes.some((n) => n.startsWith("Updated for a payer change"))) row.notes.push(payerUpdateText(update));
    const prompt = row.ids.map((id) => STEP_DOWN_PROMPTS[id]).find(Boolean);
    if (prompt) row.notes.push(`Consider a step-down: ${prompt}`);
    if (row.review && row.review.status !== "signed") row.reviewAction = reviewActionOf(row.review);
    if (row.review && row.life === "approved" && !row.flags.length && row.review.status === "needs_update") row.flags.push({ text: REVIEW_STATUS_LABEL.needs_update, tone: "mid" });
  }

  return rows.sort(byQueueOrder);
}

const BAND_RANK: Record<DueBand, number> = { now: 0, day: 1, week: 2, later: 3 };
export function byQueueOrder(a: WorkRow, b: WorkRow): number {
  return BAND_RANK[a.band] - BAND_RANK[b.band] || Number(b.needsYou) - Number(a.needsYou) || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || (a.chance ?? 100) - (b.chance ?? 100) || a.id.localeCompare(b.id);
}

/* ------------------------------------------------------------------ views, filters, sorting */

export function inView(r: WorkRow, v: View): boolean {
  if (v === "all") return true;
  if (v === "attention") return r.needsYou;
  if (v === "reviews") return !!r.review && inWeek(r.review);
  return r.life === v;
}

/** Fine-grained statuses for the Status filter: the chips the rows already show. */
export const STATUS_DETAIL = ["Preparing", "Needs your input", "Agents working", "Patient & Service not finished", "Ready to sign", "With the payer", "Submitted", "Under review", "Info requested", "Approved", "Review due", "Needs action", "Partial approval", "Denial route", "Denied", "Accepted"] as const;
export type StatusDetail = (typeof STATUS_DETAIL)[number] | "all";
export const hasStatus = (r: WorkRow, s: StatusDetail): boolean => s === "all" || r.status.text === s || r.flags.some((f) => f.text === s);

export type Deadline = "all" | "now" | "day" | "week";
export const DEADLINE_LABEL: Record<Deadline, string> = { all: "Any deadline", now: "Act now", day: "Within 24 hours", week: "Next 7 days" };
export function fitsDeadline(r: WorkRow, d: Deadline): boolean {
  if (d === "all") return true;
  if (d === "now") return r.band === "now";
  if (d === "day") return r.band === "now" || r.band === "day";
  return r.band !== "later";
}

export interface WorkFilters {
  q: string;
  payer: PayerId | "all";
  program: Program | "all";
  kind: RequestKind | "all";
  deadline: Deadline;
  owner: AgentKey | "all";
  status: StatusDetail;
  signalOnly: boolean;
  /** From the Dashboard's Lifecycle chips: approved with units left, or a review or renewal due. */
  show: ManagerFilters["show"];
}
export const NO_WORK_FILTERS: WorkFilters = { q: "", payer: "all", program: "all", kind: "all", deadline: "all", owner: "all", status: "all", signalOnly: false, show: "all" };
export const moreFiltersOn = (f: WorkFilters): boolean => f.owner !== "all" || f.status !== "all" || f.signalOnly;
export const anyFilterOn = (f: WorkFilters): boolean => !!f.q.trim() || f.payer !== "all" || f.program !== "all" || f.kind !== "all" || f.deadline !== "all" || moreFiltersOn(f) || f.show !== "all";

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function fits(r: WorkRow, f: WorkFilters, matchesShow: (r: WorkRow) => boolean): boolean {
  const q = norm(f.q);
  if (q) {
    const payer = r.payerId ? payerById(r.payerId) : null;
    const hay = [...r.ids, r.initials, payer?.name ?? "", payer?.shortName ?? ""].map(norm);
    if (!hay.some((h) => h.includes(q))) return false;
  }
  if (f.payer !== "all" && r.payerId !== f.payer) return false;
  if (f.program !== "all" && r.program !== f.program) return false;
  if (f.kind !== "all" && r.kind !== f.kind) return false;
  if (!fitsDeadline(r, f.deadline)) return false;
  if (f.owner !== "all" && r.owner !== f.owner) return false;
  if (!hasStatus(r, f.status)) return false;
  if (f.signalOnly && !r.signal) return false;
  if (f.show !== "all" && !matchesShow(r)) return false;
  return true;
}

export type SortKey = "request" | "status" | "due" | "chance" | "payer";
const LIFE_RANK: Record<Life, number> = { progress: 0, payer: 1, approved: 2, denied: 3 };
export function sortRows(rows: WorkRow[], key: SortKey | null, dir: 1 | -1, view: View): WorkRow[] {
  if (!key) return view === "reviews" ? [...rows].sort((a, b) => (a.review?.dueAt ?? 0) - (b.review?.dueAt ?? 0)) : rows;
  const val = (r: WorkRow): number | string => {
    switch (key) {
      case "request": return r.id;
      case "status": return LIFE_RANK[r.life] * 10 + (r.needsYou ? 0 : 1);
      case "due": return (view === "reviews" ? r.review?.dueAt : r.dueAt) ?? Number.MAX_SAFE_INTEGER;
      case "chance": return r.chance ?? -1;
      case "payer": return r.payerId ? payerById(r.payerId).shortName : "";
    }
  };
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const cmp = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : Number(x) - Number(y);
    return (cmp || byQueueOrder(a, b)) * dir;
  });
}

/** The review line a row shows in Reviews this week: "Review 3 · Wed 10/21, 9:00 am". */
export const reviewLine = (r: Review): string => `Review ${r.reviewNo} · ${reviewStamp(r.dueAt)}`;
