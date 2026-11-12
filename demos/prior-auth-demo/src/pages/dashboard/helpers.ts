import type { Option } from "@/components/ui";
import { PAYERS, payerById } from "@/data/seed";
import { PROGRAMS, PROGRAM_LABEL, REQUEST_TYPES, STAGES, type PayerId, type PsyRequest, type StageKey } from "@/data/types";
import type { DashFilters } from "@/store/core";

/* ------------------------------------------------------------------ labels and options */

/** Same order as the mockup's "Payers at a glance". */
export const PAYER_ORDER: PayerId[] = ["cardinal", "summit", "beacon", "harborview", "lakeshore", "evergreen"];

/** The short payer name for a table row: "Sentara", "Medicaid FFS". A payer added on Payers uses its own short name too. */
export const payerRowLabel = (id: PayerId): string => payerById(id)?.shortName ?? id;

const typeLabel = (t: string): string => (t === "Peer-to-peer" ? "Peer-to-peer call" : t);

export const PAYER_OPTIONS: Option<DashFilters["payer"]>[] = [{ value: "all", label: "All payers" }, ...PAYER_ORDER.map((id) => ({ value: id, label: payerById(id).name }))];
export const PROGRAM_OPTIONS: Option<DashFilters["program"]>[] = [{ value: "all", label: "All programs" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))];
export const TYPE_OPTIONS: Option<DashFilters["type"]>[] = [{ value: "all", label: "All request types" }, ...REQUEST_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))];

/** The Payer menu: every payer in the demo, including one added on Payers. Read at render time, so a new payer appears at once. */
export const payerOptions = (): Option<DashFilters["payer"]>[] => [
  { value: "all", label: "All payers" },
  ...[...PAYER_ORDER, ...PAYERS.map((p) => p.id).filter((id) => !PAYER_ORDER.includes(id))].map((id) => ({ value: id, label: payerById(id).name })),
];

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

/** "What happens next". An approval says its write-back waits for you only while write-back is on in EMR Connect. */
export const nextLine = (r: PsyRequest, writeBackOn: boolean): string => (writeBackOn ? r.next : r.next.replace("Write-back waits for you", "Write-back is off in EMR Connect"));

export const isDenial = (r: PsyRequest): boolean => r.track === "denial" || r.id.startsWith("D-");
