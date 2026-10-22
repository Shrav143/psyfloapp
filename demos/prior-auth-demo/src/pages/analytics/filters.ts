import type { Option } from "@/components/ui";
import { PERIODS, PROGRAM_ORDER, type MonthRange, type PeriodId, type PeriodInfo } from "@/data/analytics";
import { DX_GROUPS, type Decision, type DxId } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PAYER_ORDER } from "@/data/analytics";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import type { SiteId } from "@/data/sites";

export type PayerFilter = BuiltInPayerId | "all";
export type ProgramFilter = Program | "all";
export type DxFilter = DxId | "all";

export interface Filters {
  period: PeriodId;
  payer: PayerFilter;
  program: ProgramFilter;
  dx: DxFilter;
}
export const DEFAULT_FILTERS: Filters = { period: "quarter", payer: "all", program: "all", dx: "all" };
export const isNarrowed = (f: Filters): boolean => f.payer !== "all" || f.program !== "all" || f.dx !== "all";

export const periodInfo = (id: PeriodId): PeriodInfo => PERIODS.find((p) => p.id === id) ?? PERIODS[0];
export const inMonths = (d: Decision, [lo, hi]: MonthRange): boolean => d.month >= lo && d.month <= hi;

/** Rows that match the payer, program and diagnosis filters: every month, because the trend lines show twelve. */
export function narrow(rows: readonly Decision[], f: Filters): Decision[] {
  return rows.filter((d) => (f.payer === "all" || d.payerId === f.payer) && (f.program === "all" || d.program === f.program) && (f.dx === "all" || d.dx === f.dx));
}
export const inPeriod = (rows: readonly Decision[], f: Filters): Decision[] => rows.filter((d) => inMonths(d, periodInfo(f.period).months));

export const bySites = (rows: readonly Decision[], sites: readonly SiteId[]): Decision[] => (sites.length === 2 ? [...rows] : rows.filter((d) => sites.includes(d.site)));

export const PERIOD_OPTIONS: Option<PeriodId>[] = PERIODS.map((p) => ({ value: p.id, label: p.label }));
export const PAYER_OPTIONS: Option<PayerFilter>[] = [{ value: "all", label: "All payers" }, ...PAYER_ORDER.map((id) => ({ value: id, label: payerById(id).name }))];
export const PROGRAM_OPTIONS: Option<ProgramFilter>[] = [{ value: "all", label: "All programs" }, ...PROGRAM_ORDER.map((p) => ({ value: p, label: PROGRAM_LABEL[p], hint: p === "WM" ? "Withdrawal management" : undefined }))];
export const DX_OPTIONS: Option<DxFilter>[] = [{ value: "all", label: "All diagnosis groups" }, ...DX_GROUPS.map((d) => ({ value: d.id, label: d.label }))];

/** The words after "for": "Cardinal, Residential 3.5, Opioid use disorder". Empty when nothing is narrowed. */
export function filterWords(f: Filters): string {
  const parts: string[] = [];
  if (f.payer !== "all") parts.push(payerById(f.payer).name);
  if (f.program !== "all") parts.push(PROGRAM_LABEL[f.program]);
  if (f.dx !== "all") parts.push(DX_GROUPS.find((d) => d.id === f.dx)?.label ?? "");
  return parts.join(", ");
}
