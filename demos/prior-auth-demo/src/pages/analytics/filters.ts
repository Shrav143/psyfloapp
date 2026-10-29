import type { Option } from "@/components/ui";
import { PERIODS, PROGRAM_ORDER, type MonthRange, type PeriodId, type PeriodInfo } from "@/data/analytics";
import { DX_GROUPS, type Decision, type DxId } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PAYER_ORDER } from "@/data/analytics";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import type { SiteId } from "@/data/sites";
import { coreOf, type FocusScope } from "@/lib/programFocus";

export type PayerFilter = BuiltInPayerId | "all";
export type ProgramFilter = Program | "all";
export type DxFilter = DxId | "all";
/** Substance use (the ARTS services, co-occurring included) or mental health alone, from the diagnosis group. Set by the top bar's Program menu. */
export type TrackFilter = "sud" | "mh" | "all";

export interface Filters {
  period: PeriodId;
  payer: PayerFilter;
  program: ProgramFilter;
  dx: DxFilter;
  track: TrackFilter;
}
export const DEFAULT_FILTERS: Filters = { period: "quarter", payer: "all", program: "all", dx: "all", track: "all" };
export const isNarrowed = (f: Filters): boolean => f.payer !== "all" || f.program !== "all" || f.dx !== "all" || f.track !== "all";

export const periodInfo = (id: PeriodId): PeriodInfo => PERIODS.find((p) => p.id === id) ?? PERIODS[0];
export const inMonths = (d: Decision, [lo, hi]: MonthRange): boolean => d.month >= lo && d.month <= hi;

const MH_GROUPS: DxId[] = ["mood", "trauma"];
export const trackOfDx = (dx: DxId): "sud" | "mh" => (MH_GROUPS.includes(dx) ? "mh" : "sud");
export const TRACK_LABEL: Record<Exclude<TrackFilter, "all">, string> = { sud: "Substance use diagnoses", mh: "Mental health diagnoses" };

/** Rows that match the payer, program, diagnosis and track filters: every month, because the trend lines show twelve. */
export function narrow(rows: readonly Decision[], f: Filters): Decision[] {
  return rows.filter((d) => (f.payer === "all" || d.payerId === f.payer) && (f.program === "all" || d.program === f.program) && (f.dx === "all" || d.dx === f.dx) && (f.track === "all" || trackOfDx(d.dx) === f.track));
}

/** The filters the top bar's Program menu presets: its level of care and, for a service with a track, the diagnosis groups of that track. A service with no level of care here presets nothing. */
export const presetFilters = (base: Filters, scope: FocusScope | null): Filters => {
  const program = coreOf(scope);
  return { ...base, program: program ?? "all", track: program ? (scope?.track ?? "all") : "all" };
};
export const inPeriod = (rows: readonly Decision[], f: Filters): Decision[] => rows.filter((d) => inMonths(d, periodInfo(f.period).months));

export const bySites = (rows: readonly Decision[], sites: readonly SiteId[]): Decision[] => (sites.length === 2 ? [...rows] : rows.filter((d) => sites.includes(d.site)));

export const PERIOD_OPTIONS: Option<PeriodId>[] = PERIODS.map((p) => ({ value: p.id, label: p.label }));
export const PAYER_OPTIONS: Option<PayerFilter>[] = [{ value: "all", label: "All payers" }, ...PAYER_ORDER.map((id) => ({ value: id, label: payerById(id).name }))];
export const PROGRAM_OPTIONS: Option<ProgramFilter>[] = [{ value: "all", label: "All programs" }, ...PROGRAM_ORDER.map((p) => ({ value: p, label: PROGRAM_LABEL[p], hint: p === "WM" ? "Withdrawal management" : undefined }))];
export const DX_OPTIONS: Option<DxFilter>[] = [{ value: "all", label: "All diagnosis groups" }, ...DX_GROUPS.map((d) => ({ value: d.id, label: d.label }))];

/** The words after "for": "Anthem, Residential 3.5, Opioid use disorder". Empty when nothing is narrowed. */
export function filterWords(f: Filters): string {
  const parts: string[] = [];
  if (f.payer !== "all") parts.push(payerById(f.payer).name);
  if (f.program !== "all") parts.push(PROGRAM_LABEL[f.program]);
  if (f.dx !== "all") parts.push(DX_GROUPS.find((d) => d.id === f.dx)?.label ?? "");
  if (f.track !== "all") parts.push(TRACK_LABEL[f.track].toLowerCase());
  return parts.join(", ");
}
