import type { Option } from "@/components/ui";
import { PAYERS, payerById } from "@/data/seed";
import { PROGRAMS, PROGRAM_LABEL, REQUEST_TYPES, STAGES, type PayerId, type PayerSummary, type PsyRequest, type StageKey } from "@/data/types";
import { plural } from "@/lib/format";
import { DAY, HOUR, duration, toDate, typical } from "@/lib/time";
import type { DashFilters } from "@/store/core";
import { applyBaseFilters, lateness, minutesInStage, minutesLeft, stageCounts } from "@/store/selectors";
import type { ViewKey } from "./workList";

/* ------------------------------------------------------------------ labels and options */

/** Same order as the mockup's "Payers at a glance". */
export const PAYER_ORDER: PayerId[] = ["cardinal", "summit", "beacon", "harborview", "lakeshore", "evergreen"];

/** Short names used inside table rows, as in the mockup. */
export const PAYER_ROW_LABEL: Record<PayerId, string> = {
  summit: "Summit Medicaid",
  cardinal: "Cardinal",
  beacon: "Beacon PPO",
  harborview: "Harborview MA",
  lakeshore: "Lakeshore",
  evergreen: "Evergreen",
};

const typeLabel = (t: string): string => (t === "Peer-to-peer" ? "Peer-to-peer call" : t);

export const PAYER_OPTIONS: Option<DashFilters["payer"]>[] = [{ value: "all", label: "All payers" }, ...PAYER_ORDER.map((id) => ({ value: id, label: payerById(id).name }))];
export const PROGRAM_OPTIONS: Option<DashFilters["program"]>[] = [{ value: "all", label: "All programs" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))];
export const TYPE_OPTIONS: Option<DashFilters["type"]>[] = [{ value: "all", label: "All request types" }, ...REQUEST_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))];

/** True when any of the four narrowing filters is set . */
export const hasNarrowingFilter = (f: DashFilters): boolean => f.payer !== "all" || f.program !== "all" || f.type !== "all" || f.stage !== "all";

/* ------------------------------------------------------------------ URL <-> filters */

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const FILTER_KEYS = ["payer", "program", "type", "stage"] as const;

/** Only non-default filters are written to the address, so a clean dashboard has a clean URL. */
export function filtersToEntries(f: Partial<DashFilters>): [string, string][] {
  const out: [string, string][] = [];
  if (f.payer && f.payer !== "all") out.push(["payer", f.payer]);
  if (f.program && f.program !== "all") out.push(["program", f.program.toLowerCase()]);
  if (f.type && f.type !== "all") out.push(["type", slug(f.type)]);
  if (f.stage && f.stage !== "all") out.push(["stage", f.stage]);
  return out;
}
export const filterKey = (f: Partial<DashFilters>): string => filtersToEntries(f).map(([k, v]) => `${k}=${v}`).join("&");

/** Reads filters from the address. Unknown values are ignored so a bad link still opens the page. */
export function paramsToFilters(p: URLSearchParams): Partial<DashFilters> {
  const out: Partial<DashFilters> = {};
  const payer = p.get("payer");
  if (payer && PAYERS.some((x) => x.id === payer)) out.payer = payer as PayerId;
  const program = p.get("program")?.toUpperCase();
  if (program && PROGRAMS.some((x) => x === program)) out.program = program as DashFilters["program"];
  const type = p.get("type");
  const matchedType = type ? REQUEST_TYPES.find((t) => slug(t) === slug(type)) : undefined;
  if (matchedType) out.type = matchedType;
  const stage = p.get("stage");
  if (stage && STAGES.some((s) => s === stage)) out.stage = stage as StageKey;
  return out;
}

/** A copy of the address params with the four filter keys replaced by the given filters. */
export function withFilterParams(p: URLSearchParams, f: DashFilters): URLSearchParams {
  const next = new URLSearchParams(p);
  for (const k of FILTER_KEYS) next.delete(k);
  for (const [k, v] of filtersToEntries(f)) next.set(k, v);
  return next;
}

/* ------------------------------------------------------------------ headline */

const scopeText = (f: DashFilters, skip?: "payer" | "stage"): string => {
  const parts: string[] = [];
  if (f.payer !== "all" && skip !== "payer") parts.push(payerById(f.payer).name);
  if (f.program !== "all") parts.push(PROGRAM_LABEL[f.program]);
  if (f.type !== "all") parts.push(typeLabel(f.type));
  return parts.join(" · ");
};

const are = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Weighted average of the payers' usual decision times over the requests in a list, in days. */
function averageDecisionDays(rs: PsyRequest[]): number {
  if (!rs.length) return 0;
  return rs.reduce((a, r) => a + payerById(r.payerId).avgDecisionDays, 0) / rs.length;
}
const days = (n: number): string => `${+n.toFixed(1)} days`;

/**
 * The page headline and its muted line. Unfiltered it counts what waits on payers and on you.
 * A filtered page says what it is about, never a filtered number posing as the total.
 * `more` is how many cases are being prepared in New case without a row yet; the Preparing count includes them.
 */
export function pageHeadline(f: DashFilters, base: PsyRequest[], shown: PsyRequest[], more: number, view: ViewKey | null = null, viewMore = 0): { title: string; sub: string } {
  const c = stageCounts(base);
  const waiting = c.received + c.under_review;
  const onYou = c.info_requested;
  const n = shown.length;
  const scope = scopeText(f);
  const lead = scope ? `${scope}. ` : "";
  if (view === "needs_you" && n + viewMore === 0) return { title: "Nothing needs you right now.", sub: `${lead}Every request is with a payer or with the agents.` };
  if (n + (f.stage === "preparing" ? more : 0) + (view === "needs_you" ? viewMore : 0) === 0) return { title: "No requests match these filters.", sub: "The filters hide everything. Clear them to see every request again." };

  /* The three groupings from the key figures. They stand in for Stage, so Stage itself is "all" while one is set. */
  if (view) {
    const count = n + (view === "needs_you" ? viewMore : 0);
    const what: Record<ViewKey, { title: string; sub: string }> = {
      needs_you: { title: `${count} ${are(count, "request needs", "requests need")} you.`, sub: `${lead}A payer's question, a draft with a question for you, or one ready to sign.` },
      due_24h: { title: `${n} ${are(n, "request is", "requests are")} due within 24 hours.`, sub: `${lead}The soonest first. Some may already be past their time.` },
      waiting: { title: `${n} ${are(n, "request is", "requests are")} waiting on payers.`, sub: `${lead}Received or under review. Payers usually take about ${days(averageDecisionDays(shown))} to decide.` },
    };
    return what[view];
  }

  switch (f.stage) {
    case "appeal":
      return { title: `${plural(n, "denial")} ${are(n, "is", "are")} on their route.`, sub: `${lead}Each one is a call, an appeal, an external review or a resubmission.` };
    case "info_requested":
      return { title: `${n} ${are(n, "request is", "requests are")} waiting on you.`, sub: `${lead}The payer asked for more information. Packet drafts each answer for you to review.` };
    case "preparing":
      return { title: `${n + more} ${are(n + more, "request is", "requests are")} being prepared.`, sub: `${lead}They are in Case Manager. Nothing has been sent to a payer yet.` };
    case "received":
      return { title: `${n} ${are(n, "request has", "requests have")} been received.`, sub: `${lead}The payer confirmed receipt. Navigator checks each one again every few minutes.` };
    case "under_review":
      return { title: `${n} ${are(n, "request is", "requests are")} under review.`, sub: `${lead}Payers usually take about ${days(averageDecisionDays(shown))} to decide. Caller phones when one runs late.` };
    case "decided": {
      const approved = shown.filter((r) => r.outcome === "approved").length;
      return { title: `${n} ${are(n, "request was", "requests were")} decided today. ${approved} approved, ${n - approved} not as asked.`, sub: `${lead}Approvals update the ledger. Write-back to the EMR waits for you.` };
    }
  }

  if (f.payer !== "all") {
    const p = payerById(f.payer);
    const rest = scopeText(f, "payer");
    return {
      title: `${p.name}: ${waiting} waiting, taking ${p.avgDecisionDays} days.`,
      sub: `${rest ? `${rest}. ` : ""}Decisions usually take ${p.typicalDecisionDays} days at this payer. ${plural(c.appeal, "denial")} ${are(c.appeal, "is", "are")} open.`,
    };
  }

  const payers = waiting === 0 ? "Nothing is waiting on a payer." : waiting === 1 ? "1 request is waiting on a payer." : `${waiting} requests are waiting on payers.`;
  const you = onYou === 0 ? "Nothing is waiting on you." : onYou === 1 ? "1 is waiting on you." : `${onYou} are waiting on you.`;
  return { title: `${payers} ${you}`, sub: scope ? `Showing ${scope} only. Everything below follows that filter.` : "Where every request stands, from preparing to decided, without a phone call." };
}

/* ------------------------------------------------------------------ table clock */

export interface ClockView {
  main: string;
  sub: string;
  tone: "ink" | "mid" | "risk";
  word?: "late" | "very late";
}

const OUTCOME_WORD = { approved: "approved", partly_approved: "partly approved", denied: "denied" } as const;

/** Time in stage with the payer's typical time under it; for a denial, the time left to act. */
export function clockView(r: PsyRequest, clock: number): ClockView {
  if (r.clockNote) return { main: r.clockNote, sub: r.clockSub ?? "", tone: "ink" };
  const left = minutesLeft(r, clock);
  if (left !== undefined) {
    const main = left <= 0 ? "window closed" : left < 2 * DAY ? `${Math.max(1, Math.round(left / HOUR))} h left` : `${Math.round(left / DAY)} days left`;
    return { main, sub: r.clockSub ?? "", tone: left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "ink" };
  }
  const spent = minutesInStage(r, clock);
  if (r.stage === "decided") {
    const d = duration(spent);
    const word = r.outcome ? OUTCOME_WORD[r.outcome] : "decided";
    return { main: "today", sub: `${word} ${d === "just now" ? d : `${d} ago`}`, tone: "ink" };
  }
  const late = lateness(r, clock);
  return {
    main: duration(spent),
    sub: r.typicalMin ? `typical ${typical(r.typicalMin)}` : "",
    tone: late === "very" ? "risk" : late === "late" ? "mid" : "ink",
    word: late === "very" ? "very late" : late === "late" ? "late" : undefined,
  };
}

/** "What happens next". An approval says its write-back waits for you only while write-back is on in EMR Connect. */
export const nextLine = (r: PsyRequest, writeBackOn: boolean): string => (writeBackOn ? r.next : r.next.replace("Write-back waits for you", "Write-back is off in EMR Connect"));

export const DENIAL_ROUTE = ["Call", "Appeal 1", "Appeal 2", "External"] as const;
export const AUTH_TRACK = ["Prepared", "Received", "In review", "Decided"] as const;
export const isDenial = (r: PsyRequest): boolean => r.track === "denial" || r.id.startsWith("D-");
