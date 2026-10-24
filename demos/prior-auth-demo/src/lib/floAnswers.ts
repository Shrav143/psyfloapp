/* What FLO suggests and answers in the Ask FLO panel. The suggestions follow the screen the person is on; every answer is worked out from
   the store when it is asked, names the case it is about and ends with a link to the exact place. FLO's answers are recommendations, never payer facts.
   Everything is read from the cases the viewer may see (lib/floScope.ts): a viewer limited to one site is never told about the other site's cases. */
import { resolveCase } from "@/data/caseDetail";
import { EMPTY_WORK, canSend, checkViews, liveView, openFor } from "@/data/caseModel";
import { verdictOf, sortPatients, type EbPatient } from "@/data/eligibility";
import type { LedgerCase } from "@/data/manager";
import { inWeek, isClean, reviewStamp } from "@/data/managerReviews";
import { openDrafts } from "@/data/payerConfig";
import { PAYERS, payerById } from "@/data/seed";
import { siteName, siteOf } from "@/data/sites";
import { PROGRAMS, PROGRAM_LABEL, type PayerId, type Program } from "@/data/types";
import { plural } from "@/lib/format";
import { DAY, shortDate, toDate } from "@/lib/time";
import { paths } from "@/routes";
import type { AppState } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { DEFAULT_FILTERS } from "@/store/core";
import { doLine, doNext } from "./doNext";
import { denialDeadlines, deadlineLine, dueByRequest, dueText, inSpan, inline, needsYouList, openByDue, sentence, shortPayer, usedOf } from "./floFacts";
import { scopedState } from "./floScope";
import { sitesInView } from "./scope";
import { draftNeeds, draftsInPreparation, readyToSignIds } from "./preparing";

export interface FloAnswer {
  text: string;
  /** More lines under the text, one per item. */
  lines?: string[];
  /** One short line in muted type: what kind of answer this is. */
  note?: string;
  link?: { label: string; to: string };
  /** FLO found no answer, so the suggestion chips stay under this message. */
  fallback?: boolean;
}

/** Said once, at the foot of an answer that reads payer rules or coverage out of the demo data. */
export const READING = "This is FLO's reading of the demo data, not a payer confirmation.";

/* ------------------------------------------------------------------ where the person is */
export type FloRoute = { kind: "case"; id: string } | { kind: "manager" } | { kind: "denials" } | { kind: "eligibility" } | { kind: "other" };

export function routeOf(pathname: string): FloRoute {
  const c = /^\/authorizations\/case\/([^/]+)/.exec(pathname);
  if (c) return { kind: "case", id: decodeURIComponent(c[1]) };
  if (pathname === "/authorizations" || pathname === "/manager" || pathname.startsWith("/manager/")) return { kind: "manager" };
  if (pathname === "/denials" || pathname.startsWith("/denials/")) return { kind: "denials" };
  if (pathname === "/authorizations/eligibility" || pathname.startsWith("/authorizations/eligibility/")) return { kind: "eligibility" };
  return { kind: "other" };
}
export const routeKey = (r: FloRoute): string => (r.kind === "case" ? `case:${r.id}` : r.kind);

export const DEFAULT_CHIPS = ["What needs me today?", "What is due soonest?", "Which payers are slowest right now?", "Why is Cardinal's approval rate down?"];

/* ------------------------------------------------------------------ one case, read from every place that knows it */
interface CaseFacts {
  id: string;
  payerId: PayerId;
  program: Program;
  ledger?: LedgerCase;
  detail: ReturnType<typeof resolveCase>;
}

function caseFacts(id: string, s: AppState): CaseFacts | undefined {
  // The case page knows every case of the demo; FLO may read only the ones in view.
  if (!sitesInView(s).includes(siteOf(id))) return undefined;
  const detail = resolveCase(id, s.requests);
  const ledger = s.ledger.find((c) => c.id === id || c.caseId === id);
  const request = s.requests.find((r) => r.id === id) ?? s.requests.find((r) => r.caseId === id);
  const payerId = detail?.payerId ?? ledger?.payerId ?? request?.payerId;
  const program = detail?.program ?? ledger?.program ?? request?.program;
  return payerId && program ? { id, payerId, program, ledger, detail } : undefined;
}

/** The chips for the screen: on a case page what is missing, when the authorization runs out and what the payer requires; on three other screens one question each. */
export function chipsFor(route: FloRoute, all: AppState): { chips: string[]; label?: string } {
  const s = scopedState(all);
  if (route.kind === "case") {
    const c = caseFacts(route.id, s);
    if (c) return { chips: [`What is missing for ${c.id}?`, "When does this authorization run out?", `What does ${payerById(c.payerId).shortName} require?`], label: c.id };
  }
  if (route.kind === "manager") return { chips: ["What needs me today?", "What is due soonest?", "Which reviews are due?"], label: "Authorizations" };
  if (route.kind === "denials") return { chips: ["Which denial is due first?"], label: "Denial Intelligence" };
  if (route.kind === "eligibility") return { chips: ["Which patients need a fix before billing?"], label: "Eligibility & Benefits" };
  return { chips: DEFAULT_CHIPS };
}

/* ------------------------------------------------------------------ answers */
const ID = /\b([RIPD]-\d{3,4})\b/i;

/** Which case a question is about: one named in it, else the case page the person is on, else the request that needs them first. */
function targetCase(q: string, route: FloRoute, s: AppState): { id: string; guessed: boolean } | undefined {
  const named = ID.exec(q)?.[1].toUpperCase();
  if (named) return { id: named, guessed: false };
  if (route.kind === "case") return { id: route.id, guessed: false };
  const first = needsYouList(s.requests, dueByRequest(s.requests, s.queueItems))[0] ?? openByDue(s.queueItems, s.requests)[0];
  return first ? { id: first.id, guessed: true } : undefined;
}

const notFound = (id: string): FloAnswer => ({ text: `I did not find ${id} among the cases you can see.`, fallback: true });
const ON_PAGE = "You are not on a case page, so I looked at the request that needs you first.";

function missingAnswer(id: string, guessed: boolean, s: AppState): FloAnswer {
  const c = caseFacts(id, s);
  if (!c) return notFound(id);
  const payer = payerById(c.payerId);
  const level = PROGRAM_LABEL[c.program];
  const head = `${id} (${payer.shortName}, ${level})`;
  const link = { label: `Open ${id}, Recommended actions`, to: paths.case(id, "actions") };
  const lead = guessed ? `${ON_PAGE} ` : "";
  const d = c.detail;
  if (!d) return { text: `${lead}${head} is an approved authorization. No draft is open for it, so nothing is missing.`, link: { label: `Open ${id}`, to: paths.case(id) } };

  const work = s.queueCases[d.requestId] ?? EMPTY_WORK;
  const sent = liveView(d, s.requests)?.sent === true || d.phase === "payer";
  if (sent) return { text: `${lead}Nothing is missing for ${head}. It was already sent, so it is with ${payer.shortName} and Navigator is tracking it.`, link: { label: `Open ${id}`, to: paths.case(id) } };

  const open = openFor(d, work);
  const KIND = { missing: "Missing", conflict: "To settle", risk: "Risk" } as const;
  if (!open.length) {
    const failing = checkViews(d, work).filter((x) => !x.ok);
    if (!failing.length) return { text: `${lead}Nothing is missing for ${head}. The draft passes every check and ${canSend(d, work) ? "is ready to sign" : "waits for a person"}.`, link };
    return { text: `${lead}No document is missing for ${head}, but Integrity has ${plural(failing.length, "check")} open.`, lines: failing.map((x) => `${x.label}: ${x.note}`), link };
  }
  const docs = s.payerConfig[c.payerId]?.docs[c.program] ?? [];
  const docLine = open.some((o) => o.kind === "missing") && docs.length ? [`${payer.shortName} asks for ${plural(docs.length, "document")} at ${level}. The saved list is on Payers.`] : [];
  const draft = s.caseDrafts.find((x) => x.caseId === id && x.saved && !x.sent);
  const draftLine = draft && draft.unmet > 0 ? [`The New Case draft also holds ${plural(draft.unmet, "payer requirement")} the case does not meet yet.`] : [];
  return { text: `${lead}${head} has ${plural(open.length, "open item")} in the draft.`, lines: [...open.map((o) => `${KIND[o.kind]}: ${o.text}.`.replace(/\.\.$/, ".")), ...docLine, ...draftLine], note: READING, link };
}

/** What happens to an approval, in the words of the ledger's own next event. */
const NEXT_EVENT: Record<LedgerCase["clockKind"], string> = {
  notice: "Its notice is due",
  window: "Its window closes",
  p2p: "The peer-to-peer window closes",
  answer: "The answer to the payer is due",
  expiry: "The approval ends",
  review: "The next review is due",
  decision: "The payer's decision on the next stay is expected",
  units: "",
  next: "The next review is due",
  stepdown: "The step-down plan is open",
};
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const when = (at: number, clock: number): string => (at - clock <= 0 ? "now" : at - clock < 2 * DAY ? `in ${inSpan(at - clock)}` : `${WEEKDAY[toDate(at).getDay()]} ${shortDate(at)}`);

function expiryAnswer(id: string, guessed: boolean, s: AppState): FloAnswer {
  const c = s.ledger.find((x) => x.id === id || x.caseId === id);
  const request = s.requests.find((r) => r.id === id) ?? s.requests.find((r) => r.caseId === id);
  const lead = guessed ? `${ON_PAGE} ` : "";
  const link = { label: `Open ${id}`, to: paths.case(id) };
  if (!c) return request ? { text: `${lead}${id} (${shortPayer(request)}) has no approved authorization yet. It is ${request.chip.toLowerCase()}.`, link } : notFound(id);

  const payer = payerById(c.payerId).shortName;
  const head = `${c.id} (${payer}, ${PROGRAM_LABEL[c.program]})`;
  const review = s.reviews.filter((r) => r.ledgerId === c.id && r.status !== "signed").sort((a, b) => a.dueAt - b.dueAt)[0];
  const reviewLine = review ? [`Its next clinical review is ${reviewStamp(review.dueAt)}.`] : [];
  if (c.used === null || c.total === null) {
    const due = request ? dueByRequest(s.requests, s.queueItems).get(request.id) : undefined;
    return { text: `${lead}${head} has no approval yet, so there is nothing to run out.${due ? ` ${sentence(`Its next deadline: ${inline(dueText(due.verb, due.dueAt, s.clock))}`)}` : ""}`, note: READING, link };
  }
  const left = c.total - c.used;
  const unitWord = c.unit === "units" ? "units" : "days";
  let text: string;
  if (c.clockKind === "expiry") {
    const gap = c.dueAt - s.clock;
    text = gap > 0 ? `${head} has used ${usedOf(c)}. The authorization ends in ${inSpan(gap)} (${WEEKDAY[toDate(c.dueAt).getDay()]} ${shortDate(c.dueAt)}).` : `${head} has used ${usedOf(c)}. The authorization ended ${inSpan(-gap)} ago.`;
  } else if (c.clockKind === "units") {
    text = `${head} has used ${usedOf(c)}, so ${left} ${unitWord} are left. It runs until the ${unitWord} are used. The ledger holds no end date for it.`;
  } else {
    const event = NEXT_EVENT[c.clockKind];
    text = `${head} has used ${usedOf(c)}.${left > 0 ? ` ${left} ${unitWord} are left.` : ` The approved ${unitWord} are used up.`}${event ? ` ${event} ${when(c.dueAt, s.clock)}.` : ""}`;
  }
  return { text: `${lead}${text}`, lines: reviewLine, note: READING, link };
}

function requireAnswer(payerId: PayerId, program: Program | undefined, caseId: string | undefined, s: AppState): FloAnswer {
  const payer = payerById(payerId);
  const cfg = s.payerConfig[payerId];
  const link = { label: `Open Payers, ${payer.shortName}, Documents`, to: paths.payers(payerId, "documents") };
  if (!cfg) return { text: `${payer.name} has no saved workflow in the demo data yet, so I have nothing to read for it.`, link };
  const titles = (p: Program): string[] => cfg.docs[p].map((d) => d.title);
  const scope = caseId ? `${caseId}: ` : "";
  let text: string;
  if (program) {
    const t = titles(program);
    text = `${scope}${payer.name} asks for ${plural(t.length, "document")} at ${PROGRAM_LABEL[program]}: ${t.slice(0, 4).join(", ")}${t.length > 4 ? `, and ${t.length - 4} more` : ""}.`;
  } else {
    const counts = PROGRAMS.map((p) => `${cfg.docs[p].length} at ${PROGRAM_LABEL[p]}`);
    text = `${payer.name} asks for ${plural(cfg.docs.RES.length, "document")} at ${PROGRAM_LABEL.RES}, ${counts.slice(1, -1).join(", ")} and ${counts[counts.length - 1]}. Ask again from a case page for the list at its level of care.`;
  }
  const windows = cfg.rules.find((r) => r.id === "windows")?.lines ?? [];
  const p2p = cfg.rules.find((r) => r.id === "p2p")?.lines[0];
  const lines = [...(windows.length ? [`Timing: ${windows.join("; ")}.`] : []), ...(p2p ? [`After a denial: ${p2p}.`] : [])];
  if (cfg.pending && !cfg.pending.acknowledged) lines.push(`A change waits for you: ${cfg.pending.title}, effective ${cfg.pending.effective}.`);
  return { text, lines, note: READING, link };
}

function reviewsAnswer(s: AppState): FloAnswer {
  const week = s.reviews.filter((r) => r.status !== "signed" && inWeek(r));
  const link = { label: "Open Reviews this week", to: paths.manager("reviews") };
  if (!week.length) return { text: "No review is due this week. Every one has been signed.", link };
  const drafted = week.filter((r) => r.status === "drafted");
  const clean = drafted.filter(isClean).length;
  const undrafted = week.filter((r) => r.status === "due").length;
  const needs = week.filter((r) => r.status === "needs_update");
  const late = week.filter((r) => r.dueAt <= s.clock).length;
  const next = week[0];
  const first = needs[0] ?? next;
  const parts = [`${drafted.length} drafted (${clean} clean)`, `${undrafted} not drafted yet`, `${needs.length} ${needs.length === 1 ? "needs" : "need"} a clinician's update`];
  const lines = [
    `Next: ${next.ledgerId} (${shortPayer(next)}), ${late && next.dueAt <= s.clock ? "due now" : reviewStamp(next.dueAt)}, ${next.status === "needs_update" ? "needs a clinician's update" : next.status === "due" ? "not drafted yet" : "drafted"}.`,
    ...(needs.length ? [`Needs your update: ${needs.slice(0, 3).map((r) => r.ledgerId).join(", ")}${needs.length > 3 ? `, and ${needs.length - 3} more` : ""}.`] : []),
  ];
  return {
    text: `${plural(week.length, "review")} ${week.length === 1 ? "is" : "are"} due this week${late ? `, ${late} of them due now or overdue` : ""}: ${parts.join(", ")}.`,
    lines,
    link: needs.length || next ? { label: `Open ${first.ledgerId}, review`, to: `${paths.manager("reviews")}&review=${encodeURIComponent(first.id)}` } : link,
  };
}

function denialAnswer(s: AppState): FloAnswer {
  const { requests, clock } = s;
  const d = requests.filter((r) => r.stage === "appeal");
  const { soon } = denialDeadlines(requests, clock);
  // The nearest deadline is read from the open denials, so the answer stays true after one is settled or the clock moves.
  const near = d.filter((r) => r.deadlineAt !== undefined && r.deadlineAt >= clock).sort((a, b) => (a.deadlineAt ?? 0) - (b.deadlineAt ?? 0))[0];
  const nearest = near ? ` The nearest deadline is ${near.id} (${shortPayer(near)}), ${deadlineLine(near, clock)}. ${sentence(near.next)}${near.chance !== undefined ? ` The chance of winning is ${near.chance}%.` : ""}` : "";
  const more = soon.length > 1 ? [`${soon.length - 1} more ${soon.length === 2 ? "deadline falls" : "deadlines fall"} this week.`] : [];
  return { text: `${d.length} ${d.length === 1 ? "denial is" : "denials are"} open.${nearest}`, lines: more, note: near ? READING : undefined, link: { label: "Open Denial Intelligence", to: paths.denials(near?.id) } };
}

function whyFix(p: EbPatient): string {
  if (p.eligibility.state === "lapsed") return `coverage lapsed${p.eligibility.on ? ` ${p.eligibility.on}` : ""}`;
  if (p.eligibility.state === "ended") return `coverage ended${p.eligibility.on ? ` ${p.eligibility.on}` : ""}`;
  if (p.eligibility.state === "not_found") return "member not found";
  if (p.benefits === "not_covered") return "the plan does not cover the service";
  if (!p.inNetwork) return "out of network";
  if (p.otherInsurance) return "another plan pays first";
  return p.limit ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used` : "needs a look";
}

function eligibilityAnswer(s: AppState): FloAnswer {
  const fix = sortPatients(s.ebPatients).filter((p) => verdictOf(p) === "fix");
  if (!fix.length) return { text: "No patient needs a fix before billing. Every coverage check is either cleared or waiting on an authorization.", link: { label: "Open Eligibility & Benefits", to: paths.eligibility() } };
  return {
    text: `${plural(fix.length, "patient")} ${fix.length === 1 ? "needs" : "need"} a fix before billing.`,
    lines: fix.map((p) => `${p.id} (${p.initials ?? "new check"}, ${payerById(p.payerId).shortName}): ${whyFix(p)}.`),
    note: READING,
    link: { label: `Open ${fix[0].id} in Eligibility & Benefits`, to: paths.eligibilityResult(fix[0].id) },
  };
}

/** Pick the answer by key words, in this order. The first rule that matches answers. */
export function answerFor(q: string, all: AppState, route: FloRoute): FloAnswer {
  const s = scopedState(all);
  const { requests, caseDrafts, clock, queueItems, queueCases } = s;
  const t = q.toLowerCase();
  const sites = sitesInView(all);
  /** " at Site A" when the viewer sees one site, so the answer says what it covers; nothing for both. */
  const at = sites.length === 1 ? ` at ${siteName(sites[0])}` : "";

  if (t.includes("slow") || (t.includes("payer") && t.includes("late"))) {
    const slow = [...PAYERS].filter((p) => p.avgDecisionDays > p.typicalDecisionDays).sort((a, b) => b.avgDecisionDays / b.typicalDecisionDays - a.avgDecisionDays / a.typicalDecisionDays);
    const text = slow.length ? `${slow.map((p) => `${p.shortName} is averaging ${p.avgDecisionDays} days against ${p.typicalDecisionDays} typical`).join(". ")}. Caller phones when a payer passes twice its typical time.` : "Every payer is deciding within its typical time right now.";
    return { text, link: { label: "Open Analytics, turnaround", to: paths.analytics() } };
  }
  if (t.includes("billing") || t.includes("eligib") || t.includes("fix before")) return eligibilityAnswer(s);
  if (t.includes("missing") || t.includes("incomplete")) {
    const target = targetCase(q, route, s);
    return target ? missingAnswer(target.id, target.guessed, s) : { text: "Nothing is open: no request needs you and none is due.", link: { label: "Open Authorizations", to: paths.authorizations() } };
  }
  if (/expir|run out|runs out|units|ends?\b/.test(t) && !t.includes("denial")) {
    const named = ID.exec(q)?.[1].toUpperCase();
    if (named) return expiryAnswer(named, false, s);
    if (route.kind === "case") return expiryAnswer(route.id, false, s);
    // Away from a case page, the authorization that ends first.
    const first = s.ledger.filter((c) => c.clockKind === "expiry" && c.used !== null && c.dueAt > clock).sort((a, b) => a.dueAt - b.dueAt)[0];
    return first ? expiryAnswer(first.id, false, s) : { text: "No approved authorization has an end date ahead of it.", link: { label: "Open Authorizations", to: paths.manager("cases") } };
  }
  if (t.includes("require")) {
    const byName = PAYERS.find((p) => t.includes(p.shortName.toLowerCase()) || t.includes(p.name.toLowerCase()));
    if (byName) {
      const onCase = route.kind === "case" ? caseFacts(route.id, s) : undefined;
      return onCase && onCase.payerId === byName.id ? requireAnswer(byName.id, onCase.program, onCase.id, s) : requireAnswer(byName.id, undefined, undefined, s);
    }
    const c = route.kind === "case" ? caseFacts(route.id, s) : undefined;
    return c ? requireAnswer(c.payerId, c.program, c.id, s) : { text: "Tell me which payer, for example: What does Summit require?", fallback: true };
  }
  if (t.includes("review") && !t.includes("under review")) return reviewsAnswer(s);
  if (t.includes("denial")) return denialAnswer(s);
  if (t.includes("due") || t.includes("soon") || t.includes("deadline")) {
    // The queue's own order: the soonest due first, read from the requests still open so the answer follows what has been sent or decided.
    const soon = openByDue(queueItems, requests);
    const [first, ...rest] = soon;
    if (!first) return { text: "Nothing is due. Every open request has been sent or handled.", link: { label: "Open Authorizations", to: paths.authorizations() } };
    const line = (i: typeof first) => `${i.id} (${payerById(i.payerId).shortName}), ${inline(dueText(i.dueVerb, i.dueAt, clock))}`;
    const next = rest.slice(0, 2);
    const after = next.length ? ` After it: ${next.map(line).join("; ")}.` : "";
    const chance = queueCases[first.id]?.chance ?? first.chance;
    return { text: `${first.id} (${payerById(first.payerId).shortName}) is due soonest${at}: ${inline(dueText(first.dueVerb, first.dueAt, clock))}. Its approval chance is ${chance}%.${after} ${plural(soon.length, "request")} ${soon.length === 1 ? "is" : "are"} open in Authorizations.`, link: { label: `Open ${first.id}`, to: paths.case(first.id) } };
  }
  if (t.includes("cardinal") || t.includes("approval rate")) {
    const open = openDrafts(requests, caseDrafts, "cardinal").length;
    const affects = open ? `, which affects ${open} ${open === 1 ? "draft" : "drafts"} you have not sent` : "";
    return { text: `Cardinal approved 63% as asked over the last 90 days, down 11 points. Historian links most of the drop to continued-stay evidence. Cardinal also published criteria version 2026.3${affects}.`, link: { label: "Open Payers, Cardinal, Changes", to: paths.payers("cardinal", "changes") } };
  }
  if (t.includes("need") || t.includes("today") || t.includes("first")) {
    const needs = requests.filter((r) => r.needsYou);
    // The same list the Dashboard shows under Do next, so FLO and the page never disagree.
    const saved = draftNeeds(draftsInPreparation(caseDrafts, requests, DEFAULT_FILTERS, sites));
    const todo = doNext({ requests, queueItems, ledger: s.ledger, clock, writeBackOn: selectWriteBackOn(s), ready: readyToSignIds(caseDrafts, requests), savedNeedingYou: saved.needYou + saved.ready });
    if (!todo.items.length) return { text: `Nothing needs you right now${at}. Every request is with a payer or with the agents.`, link: { label: "Open Dashboard", to: paths.dashboard() } };
    const [first, ...rest] = todo.items;
    const asked = needs.length ? `${needs.length} ${needs.length === 1 ? "request needs" : "requests need"} you${at}: ${needs.map((r) => r.id).join(", ")}. ` : "";
    return {
      text: `${asked}Start with this: ${sentence(doLine(first))}`,
      lines: rest.map((i) => sentence(doLine(i))),
      note: "This is the Do next list on the Dashboard, worked out from today's demo data.",
      link: { label: "Open Do next on the Dashboard", to: paths.dashboard() },
    };
  }
  if (t.includes("referral")) return { text: "New referrals are waiting for review. Reader has already checked each document, and Verify has run coverage for the ones with an insurance card.", link: { label: "Start a case from a referral", to: paths.referrals() } };
  return { text: "I did not find an answer to that in the demo data. Try one of the suggestions below.", fallback: true };
}
