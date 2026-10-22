import { AGENTS } from "@/data/agents";
import type { ClockKind } from "@/data/manager";
import { WEEK_END, reviewStamp, type Review } from "@/data/managerReviews";
import { payerById } from "@/data/seed";
import type { RequestEvent } from "@/data/types";
import { DAY, HOUR } from "@/lib/time";
import { unitCount, unitsPerDay } from "./helpers";
import type { LedgerRow } from "./ledgerRows";

/* What the Ledger case page says about a case that is in the Case Manager ledger but is not a request in the queue.
   Everything is worked out from the ledger record, the week's reviews and the demo clock. */

/** The days the approval runs. IOP counts units, about three a week; the other levels count one day a day. */
export function authWindow(c: LedgerRow): { start: number; end: number } | null {
  if (c.used === null || !c.total) return null;
  const perDay = unitsPerDay(c.unit);
  const ends = c.clockKind === "expiry" || c.clockKind === "units";
  return { start: -Math.round((c.used / perDay) * DAY), end: ends ? c.dueAt : Math.round(((c.total - c.used) / perDay) * DAY) };
}

/** This case's reviews: the one due this week (or the last one signed) and any next review Cadence booked. */
export function reviewsOf(c: LedgerRow, all: Review[]): { due?: Review; signed?: Review; next?: Review } {
  const mine = all.filter((r) => r.ledgerId === c.id).sort((a, b) => a.dueAt - b.dueAt);
  return {
    due: mine.find((r) => r.status !== "signed" && r.dueAt < WEEK_END),
    signed: [...mine].reverse().find((r) => r.status === "signed"),
    next: mine.find((r) => r.scheduled && r.status !== "signed"),
  };
}

/** One sentence on what to do next. An open review comes first; otherwise the ledger's next event decides. */
export function nextStep(c: LedgerRow, r: ReturnType<typeof reviewsOf>): string {
  const payer = payerById(c.payerId).shortName;
  if (r.due?.status === "needs_update") return `Add your update to review ${r.due.reviewNo} so it can be signed. ${r.due.missing ?? ""}`.trim();
  if (r.due?.status === "due") return `Review ${r.due.reviewNo} has no draft yet. Cadence drafts it a few days ahead, or you can ask for it now.`;
  if (r.due) return `Review ${r.due.reviewNo} is drafted. Read it, then sign it. Cadence books the next one.`;
  if (r.signed && r.next) return `Review ${r.signed.reviewNo} is signed. Nothing is needed until review ${r.next.reviewNo}, ${reviewStamp(r.next.dueAt)}.`;
  switch (c.clockKind) {
    case "notice": return `File the admission notice with ${payer} before the clock runs out.`;
    case "window": return "File the retro-authorization request before the window closes.";
    case "p2p": return "Hold the peer-to-peer call before the window closes.";
    case "answer": return `Answer the question ${payer} asked. Packet drafts the reply for you to check.`;
    case "expiry": return "Ask for more days, or plan the step-down, before the approval ends.";
    case "review": return "Sign the review that is due. Cadence then books the next one.";
    case "decision": return `Wait for ${payer}. Navigator keeps checking and tells you when it answers.`;
    case "units": { const left = (c.total ?? 0) - (c.used ?? 0); return `Nothing is needed now. ${unitCount(left, c.unit)} ${left === 1 ? "is" : "are"} left.`; }
    case "next": return "Nothing is needed until the next review. Cadence drafts it ahead of time.";
    case "stepdown": return "Choose the next level of care and book the first visit. The denial was accepted.";
  }
}

/** What happens at the ledger's next time, for the dashed last line of the history. Units and a booked next review have no event of their own. */
const EVENT: Record<ClockKind, string | null> = {
  notice: "Admission notice due",
  window: "Retro-authorization window closes",
  p2p: "Peer-to-peer window closes",
  answer: "Answer to the payer due",
  expiry: "Approval ends",
  review: "Review due",
  decision: "Decision expected",
  units: null,
  next: null,
  stepdown: null,
};

/** A short history: the approval, the review work so far, and what comes next (dashed). */
export function caseHistory(c: LedgerRow, r: ReturnType<typeof reviewsOf>, clock: number): RequestEvent[] {
  const payer = payerById(c.payerId).shortName;
  const win = authWindow(c);
  const at = (id: string, when: number, actor: RequestEvent["actor"], text: string, done = true, detail?: string): RequestEvent => ({ id, at: when, actor, text, done, detail });
  const out: RequestEvent[] = [win ? at("approved", win.start, "payer", `${payer} approved ${c.total} ${c.unit}`) : at("sent", -DAY, "navigator", `Navigator sent the ${c.note.toLowerCase()} request to ${payer}`)];
  const agent = r.due ? (c.program === "RES" || c.program === "WM" ? "scribe" : "cadence") : undefined;
  if (r.due && r.due.status !== "due") out.push(at("drafted", Math.min(r.due.dueAt, 0) - 3 * HOUR, agent ?? "cadence", `${AGENTS[agent ?? "cadence"].name} drafted review ${r.due.reviewNo}`));
  if (r.due?.status === "needs_update") out.push(at("missing", Math.min(r.due.dueAt, 0) - 2 * HOUR, "integrity", "Integrity found a missing item", true, r.due.missing));
  if (r.signed?.signedAt !== undefined) {
    out.push(at("signed", r.signed.signedAt, "you", `${r.signed.signedBy} signed review ${r.signed.reviewNo}`));
    if (r.signed.nextAt !== undefined) out.push(at("booked", r.signed.signedAt + 1, "cadence", `Cadence booked review ${r.signed.reviewNo + 1}`, true, `Due ${reviewStamp(r.signed.nextAt)}`));
  }
  if (r.due) out.push(at("due", r.due.dueAt, "system", `Review ${r.due.reviewNo} is due`, r.due.dueAt <= clock));
  else if (!r.next && EVENT[c.clockKind]) out.push(at("clock", c.dueAt, "system", EVENT[c.clockKind] ?? "", c.dueAt <= clock));
  return out;
}
