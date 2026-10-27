import { INTAKE_STAFF } from "@/data/intake/seed";
import { METHOD_LABEL, TRIAGE_LABEL, type IntakeRecord, type ReferralMethod, type TriageStatus } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { VA_PLANS } from "@/data/va/plans";
import { PERIOD_LABEL, periodOf, type PolicyPeriod } from "@/data/va/policy";
import { GROUP_LABEL, SERVICE_GROUPS, SERVICES, serviceById, type AgeGroup } from "@/data/va/services";
import { URGENCY_LABEL, URGENCY_RANK } from "./labels";
import { metricById, type MetricId } from "./metrics";

/* The queue's search, filters and order. Everything lives in the address (?q=, ?metric=, ?service=...), so a filtered queue can be linked
   and Back undoes a filter. Option counts are faceted: each one counts the rows that match every other active filter. */

export type FacetId = "service" | "plan" | "method" | "staff" | "age" | "urgency" | "period" | "status";
export const FACET_IDS: FacetId[] = ["service", "plan", "method", "staff", "age", "urgency", "period", "status"];
export const FACET_LABEL: Record<FacetId, string> = {
  service: "Service", plan: "MCO or plan", method: "Referral source", staff: "Assigned staff", age: "Age group", urgency: "Urgency", period: "Policy period", status: "Status",
};
/** Every param the queue owns; Clear filters removes exactly these. */
export const QUEUE_PARAMS = ["q", "metric", ...FACET_IDS];

export interface QueueQuery {
  q: string;
  metric: MetricId | null;
  facets: Partial<Record<FacetId, string>>;
}

export function readQuery(p: URLSearchParams): QueueQuery {
  const facets: QueueQuery["facets"] = {};
  for (const f of FACET_IDS) {
    const v = p.get(f);
    if (v) facets[f] = v;
  }
  const m = p.get("metric");
  return { q: p.get("q") ?? "", metric: metricById(m)?.id ?? null, facets };
}
export const activeCount = (q: QueueQuery) => Object.keys(q.facets).length + (q.metric ? 1 : 0) + (q.q.trim() ? 1 : 0);

type PatientAge = Exclude<AgeGroup, "all"> | "unknown";
const ageOf = (r: IntakeRecord): PatientAge => (r.age === null ? "unknown" : r.age < 18 ? "youth" : "adult");

/** The values a record has for a facet. A service also belongs to its group. */
function valuesOf(r: IntakeRecord, f: FacetId, now: number): string[] {
  switch (f) {
    case "service": return [r.serviceId, `group:${serviceById(r.serviceId).group}`];
    case "plan": return [r.payerId ?? "none"];
    case "method": return [r.method];
    case "staff": return [r.assignedTo];
    case "age": return [ageOf(r)];
    case "urgency": return [r.urgency];
    case "period": return [periodOf(r.serviceId, r.serviceDate, now, !!r.legacy)];
    case "status": return [r.triage];
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[.\s,]/g, "");
function matchesSearch(r: IntakeRecord, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const svc = serviceById(r.serviceId);
  const hay = [r.id, r.initials, r.sourceOrg, svc.label, svc.short, svc.code ?? "", METHOD_LABEL[r.method]].join(" ").toLowerCase();
  return hay.includes(t) || (norm(t).length >= 2 && norm(r.initials) === norm(t));
}

/** Whether a record passes the query. `except` leaves one facet out (for that facet's own option counts). */
export function matches(r: IntakeRecord, q: QueueQuery, now: number, clock: number, except?: FacetId): boolean {
  if (!matchesSearch(r, q.q)) return false;
  if (q.metric && !metricById(q.metric)?.test(r, clock)) return false;
  for (const f of FACET_IDS) {
    const want = q.facets[f];
    if (!want || f === except) continue;
    if (!valuesOf(r, f, now).includes(want)) return false;
  }
  return true;
}

/** Open safety alerts first, then high priority, then urgency, then the newest. */
export function sortQueue(rows: IntakeRecord[]): IntakeRecord[] {
  return [...rows].sort((a, b) => {
    const sa = a.safety?.status === "open" ? 0 : 1;
    const sb = b.safety?.status === "open" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.urgency !== b.urgency) return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return b.createdAt - a.createdAt;
  });
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

const GROUP_SHORT: Record<string, string> = { arts: "All ARTS services", mh: "All mental health services", legacy: "All retiring services", redesign: "All redesign services" };

/** The choices for one filter, each with its faceted count. Choices with no rows are left out unless selected. */
export function facetOptions(f: FacetId, records: IntakeRecord[], q: QueueQuery, now: number, clock: number): FacetOption[] {
  const base = records.filter((r) => matches(r, q, now, clock, f));
  const count = (v: string) => base.filter((r) => valuesOf(r, f, now).includes(v)).length;
  const keep = (o: FacetOption) => o.count > 0 || q.facets[f] === o.value;
  const mk = (pairs: [string, string][], always = false) => pairs.map(([value, label]) => ({ value, label, count: count(value) })).filter((o) => always || keep(o));
  switch (f) {
    case "service":
      return [...mk(SERVICE_GROUPS.map((g) => [`group:${g}`, GROUP_SHORT[g] ?? GROUP_LABEL[g]])), ...mk(SERVICES.map((s) => [s.id, s.short]))];
    case "plan":
      return mk([...VA_PLANS.map((p): [string, string] => [p.payerId, p.name]), ["none", "Plan not confirmed"]]);
    case "method":
      return mk((Object.keys(METHOD_LABEL) as ReferralMethod[]).map((m) => [m, METHOD_LABEL[m]]));
    case "staff":
      return mk(INTAKE_STAFF.map((s) => [s.id, s.name]));
    case "age":
      return mk([["youth", "Youth (under 18)"], ["adult", "Adult (18 and over)"], ["unknown", "Age not recorded"]]);
    case "urgency":
      return mk((Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => [u, URGENCY_LABEL[u]]), true);
    case "period":
      return mk((Object.keys(PERIOD_LABEL) as PolicyPeriod[]).map((p) => [p, PERIOD_LABEL[p]]), true);
    case "status":
      return mk((Object.keys(TRIAGE_LABEL) as TriageStatus[]).map((t) => [t, TRIAGE_LABEL[t]]), true);
  }
}
