import { reasonsOf } from "@/data/analytics";
import { DX_LABEL, KIND_LABEL, OUTCOME_LABEL, POPULATION_LABEL, type Decision, type DxId, type Outcome, type PopulationId } from "@/data/decisions";
import type { RequestKind } from "@/data/queue";
import { payerById } from "@/data/seed";
import type { SiteId } from "@/data/sites";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import { inMonths, inPeriod, narrow, periodInfo, type Filters } from "./filters";

/* What the case list panel is asked for: the cases behind one number. A query is plain data, so the number on the page and the list that
   opens behind it are computed by the same function from the same rows. */

export type CaseFlag = "preventable" | "notPreventable" | "pastCms" | "infoRequest" | "firstPass" | "ruled" | "overturned" | "accepted" | "cut";

export interface CaseQuery {
  title: string;
  /** One line under the title that says how the number was reached. */
  note?: string;
  payer?: BuiltInPayerId;
  program?: Program;
  dx?: DxId;
  kind?: RequestKind;
  population?: PopulationId;
  /** One reason (as worded in data/analytics.ts), or several for the "other reasons" row. */
  reasons?: string[];
  /** A month index. A query for a month ignores the period. */
  month?: number;
  outcome?: Outcome | "notApproved" | "approvedAny";
  flag?: CaseFlag;
  site?: SiteId;
  /** Open on the slowest decisions first. */
  slowest?: boolean;
}

const FLAG: Record<CaseFlag, (d: Decision) => boolean> = {
  preventable: (d) => d.outcome !== "approved" && !!d.preventable,
  notPreventable: (d) => d.outcome !== "approved" && !d.preventable,
  pastCms: (d) => d.pastCms === true,
  infoRequest: (d) => d.infoRequest,
  firstPass: (d) => d.outcome === "approved" && !d.infoRequest,
  ruled: (d) => d.appeal === "overturned" || d.appeal === "partly" || d.appeal === "upheld",
  overturned: (d) => d.appeal === "overturned" || d.appeal === "partly",
  accepted: (d) => d.outcome !== "approved" && d.accepted,
  cut: (d) => d.outcome === "partial",
};

export function matchesQuery(d: Decision, q: CaseQuery): boolean {
  if (q.payer && d.payerId !== q.payer) return false;
  if (q.program && d.program !== q.program) return false;
  if (q.dx && d.dx !== q.dx) return false;
  if (q.kind && d.kind !== q.kind) return false;
  if (q.population && d.population !== q.population) return false;
  if (q.site && d.site !== q.site) return false;
  if (q.reasons && !(d.reason && q.reasons.includes(d.reason))) return false;
  if (q.outcome === "notApproved" ? d.outcome === "approved" : q.outcome === "approvedAny" ? d.outcome === "denied" : q.outcome && d.outcome !== q.outcome) return false;
  if (q.flag && !FLAG[q.flag](d)) return false;
  return true;
}

/** The rows a query lists, from the rows the viewer may see: the page's payer, program and diagnosis filters, the period (or the month asked for), then the query. */
export function rowsForQuery(scoped: readonly Decision[], f: Filters, q: CaseQuery): Decision[] {
  const base = narrow(scoped, f);
  const inRange = q.month === undefined ? inPeriod(base, f) : base.filter((d) => d.month === q.month);
  return inRange.filter((d) => matchesQuery(d, q));
}

/** "Opioid use disorder at Anthem HealthKeepers Plus" and similar: the words a query adds to its title. */
export function describeQuery(q: CaseQuery): string {
  const bits: string[] = [];
  if (q.dx) bits.push(DX_LABEL[q.dx]);
  if (q.kind) bits.push(KIND_LABEL[q.kind].toLowerCase());
  if (q.program) bits.push(PROGRAM_LABEL[q.program]);
  if (q.population) bits.push(POPULATION_LABEL[q.population].toLowerCase());
  if (q.payer) bits.push(`at ${payerById(q.payer).name}`);
  return bits.join(", ");
}

/** Which Denial Intelligence filter a reason query maps to (a payer and one reason), or null when it spans payers. */
export function denialsFilterOf(q: CaseQuery): { payer: string; reason: string } | null {
  if (!q.payer || !q.reasons || q.reasons.length !== 1) return null;
  return reasonsOf(q.payer).some((r) => r.label === q.reasons?.[0]) ? { payer: q.payer, reason: q.reasons[0] } : null;
}

export const OUTCOME_FILTERS: { id: Outcome | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: OUTCOME_LABEL.approved },
  { id: "partial", label: OUTCOME_LABEL.partial },
  { id: "denied", label: OUTCOME_LABEL.denied },
];

export { inMonths, periodInfo };
