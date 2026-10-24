import type { DocItem } from "../payerConfig";
import { seedPayerConfig } from "../payerConfigSeed";
import { payerProfileOf } from "../payerProfile";
import { PROGRAM_LABEL, type Program } from "../types";
import { REQUEST_TYPE_LABEL, type CaseFacts, type FactKey, type RequestType } from "./types";

/* Reading the facts a condition or a rule node asks about, and counting days. Pure, no dependency, the same everywhere: the engine, the validator and Test Workflow all count days here.
   Business days skip Saturday and Sunday but not holidays (the demo has no holiday calendar), and say so where they are shown. The New Case step builds the facts of a draft in
   pages/newcase/workflow/facts.ts (factsFromCase); this file does not duplicate it. */

/** The demo's first day, Tue 20 Oct 2026: what `today` is in a test and in a new fact sheet. */
export const DEMO_TODAY = "2026-10-20";

/* ---------------------------------------------------------------- dates (ISO yyyy-mm-dd, counted in UTC so a time zone never moves a day) */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export const isIso = (s: unknown): s is string => typeof s === "string" && ISO.test(s);

/** Whole days since 1970-01-01, or null when the text is not an ISO date. */
export function dayNumber(iso: string | undefined): number | null {
  const m = iso?.match(ISO);
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000) : null;
}
export const isoFromDay = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => isoFromDay((dayNumber(iso) ?? 0) + n);
/** 0 is Sunday. */
const weekday = (n: number): number => (((n + 4) % 7) + 7) % 7;

/** Calendar days from `from` to `to` (negative when `to` is earlier), or null when either is not a date. */
export function calendarDays(from: string | undefined, to: string | undefined): number | null {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === null || b === null ? null : b - a;
}
/** Business days after `from` up to and including `to`. A request that starts today and is read today is 0. */
export function businessDays(from: string | undefined, to: string | undefined): number | null {
  const a = dayNumber(from);
  const b = dayNumber(to);
  if (a === null || b === null) return null;
  if (b < a) return -(businessDays(to, from) ?? 0);
  let n = 0;
  for (let d = a + 1; d <= b; d++) if (weekday(d) !== 0 && weekday(d) !== 6) n++;
  return n;
}
export const countDays = (from: string | undefined, to: string | undefined, type: "business" | "calendar"): number | null => (type === "business" ? businessDays(from, to) : calendarDays(from, to));

/** A date in a condition: an ISO date, "today", or "today+3" and "today-2". */
export function resolveDate(value: string | number | undefined, today: string): string | null {
  if (typeof value === "string") {
    const m = value.trim().toLowerCase().match(/^today(?:\s*([+-])\s*(\d+))?$/);
    if (m) return m[1] ? addDays(today, (m[1] === "-" ? -1 : 1) * Number(m[2])) : today;
    if (isIso(value)) return value;
  }
  return null;
}

/* ---------------------------------------------------------------- facts */
/** The day the service starts or started: the first date of service when there are dates of service, otherwise the requested start. */
export const serviceStart = (f: CaseFacts): string => f.serviceDates?.from ?? f.requestedStart;
/** Days from the start of the service to today, calendar days. Negative while the start is in the future. */
export const daysSinceService = (f: CaseFacts): number | null => calendarDays(serviceStart(f), f.today);
export const daysToExpiry = (f: CaseFacts): number | null => (f.existingAuth ? calendarDays(f.today, f.existingAuth.expiresOn) : null);
/** The documents that are asked for and not in the case. With `required`, only those ids count, and an id the case never listed counts as missing. */
export function missingDocuments(f: CaseFacts, required?: string[]): string[] {
  if (required?.length) return required.filter((id) => f.documents[id] !== true);
  return Object.keys(f.documents).filter((id) => f.documents[id] !== true);
}
export const documentsComplete = (f: CaseFacts, required?: string[]): boolean => missingDocuments(f, required).length === 0;

/** The value a condition reads for a fact, as text, a number or a yes/no. Undefined when the case does not have it. */
export function factValue(key: FactKey, f: CaseFacts): string | number | boolean | undefined {
  if (key.startsWith("doc:")) return f.documents[key.slice(4)] === true;
  switch (key) {
    case "payer": return f.payerId;
    case "product": return f.product;
    case "state": return f.state;
    case "service": return f.service;
    case "request_type": return f.requestType;
    case "coverage": return f.coverage;
    case "benefit": return f.benefit;
    case "auth_requirement": return f.authRequirement;
    case "in_network": return f.inNetwork;
    case "has_existing_auth": return !!f.existingAuth;
    case "units_remaining": return f.existingAuth?.unitsRemaining;
    case "days_to_expiry": return daysToExpiry(f) ?? undefined;
    case "requested_units": return f.requestedUnits;
    case "requested_start": return f.requestedStart;
    case "days_since_service": return daysSinceService(f) ?? undefined;
    case "documents_complete": return documentsComplete(f);
    case "payer_response": return f.payerResponse;
    case "portal_status": return f.portalStatus;
    case "waiting_days": return f.waitingDays;
    default: return undefined;
  }
}

/* ---------------------------------------------------------------- titles of documents (for "the treatment plan is missing") */
let seedTitles: Map<string, string> | null = null;
function titles(): Map<string, string> {
  if (seedTitles) return seedTitles;
  const out = new Map<string, string>();
  for (const cfg of Object.values(seedPayerConfig())) for (const list of Object.values(cfg.docs)) for (const d of list) out.set(d.id, d.title);
  seedTitles = out;
  return out;
}
/** The title of a document id: one the caller knows, or the demo's own lists, or the id itself made readable. */
export function docTitleOf(id: string, known?: Record<string, string>): string {
  return known?.[id] ?? titles().get(id) ?? id.replace(/^[a-z]+-[a-z]+-/i, "document ").replace(/-/g, " ");
}
export const titleList = (ids: string[], known?: Record<string, string>): string => {
  const t = ids.map((id) => docTitleOf(id, known).replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase()));
  return t.length <= 1 ? (t[0] ?? "") : `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}`;
};

/* ---------------------------------------------------------------- a starting fact sheet */
const REQUESTED: Record<Program, number> = { RES: 14, IOP: 36, PHP: 15, WM: 5 };
let seedCfg: ReturnType<typeof seedPayerConfig> | null = null;

/** A complete, plain case for a payer, a level of care and a request type: coverage active, benefits covered, the payer's documents all in, the portal up and no answer yet.
    Test Workflow starts from it and changes what it wants to try. `docs` is the payer's live list for the level of care; left out, the demo's own list is used. */
export function defaultFactsFor(payerId: string, service: Program, requestType: RequestType, docs?: DocItem[]): CaseFacts {
  seedCfg ??= seedPayerConfig();
  const list = docs ?? seedCfg[payerId]?.docs[service] ?? [];
  const profile = payerProfileOf(payerId);
  const existing = requestType === "concurrent" || requestType === "reauth" || requestType === "modify";
  const start = requestType === "retro" ? addDays(DEMO_TODAY, -2) : DEMO_TODAY;
  return {
    payerId,
    product: profile.product,
    state: profile.state,
    service,
    requestType,
    today: DEMO_TODAY,
    requestedStart: start,
    ...(requestType === "retro" ? { serviceDates: { from: start, to: addDays(DEMO_TODAY, -1) } } : {}),
    coverage: "active",
    benefit: "covered",
    authRequirement: requestType === "concurrent" ? "concurrent" : "required",
    inNetwork: "yes",
    ...(existing ? { existingAuth: { ref: "AU-1042", unitsRemaining: 5, expiresOn: addDays(DEMO_TODAY, 5) } } : {}),
    requestedUnits: requestType === "modify" ? 7 : REQUESTED[service],
    documents: Object.fromEntries(list.map((d) => [d.id, true])),
    payerResponse: "none",
    portalStatus: "up",
    waitingDays: 0,
  };
}

/** "Residential 3.5, Initial authorization" for a trace header. */
export const factsLine = (f: CaseFacts): string => `${PROGRAM_LABEL[f.service]}, ${REQUEST_TYPE_LABEL[f.requestType]}`;

/* ---------------------------------------------------------------- reading a condition in words */
export const FACT_LABEL: Record<string, string> = {
  payer: "Payer", product: "Plan or product", state: "State", service: "Service", request_type: "Request type", coverage: "Coverage", benefit: "Benefit for the service",
  auth_requirement: "Authorization requirement", in_network: "Provider in network", has_existing_auth: "Has an existing authorization", units_remaining: "Units remaining",
  days_to_expiry: "Days until the authorization ends", requested_units: "Requested units", requested_start: "Requested start date", days_since_service: "Days since the service started",
  documents_complete: "All required documents are in", payer_response: "Payer response", portal_status: "Payer portal", waiting_days: "Business days waiting",
};
export const factLabel = (key: string): string => (key.startsWith("doc:") ? `Document ${docTitleOf(key.slice(4)).toLowerCase()}` : FACT_LABEL[key] ?? key);

/** How a value of a fact reads: "RES" as "Residential 3.5", "initial" as "Initial authorization", a yes/no as Yes or No. */
export function readFact(key: string, v: string | number | boolean | undefined): string {
  if (v === undefined) return "not known";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (key === "service" && typeof v === "string") return PROGRAM_LABEL[v as Program] ?? v;
  if (key === "request_type" && typeof v === "string") return REQUEST_TYPE_LABEL[v as RequestType] ?? v;
  return String(v).replace(/_/g, " ");
}
