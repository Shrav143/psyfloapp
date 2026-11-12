import { DAY } from "@/lib/time";
import type { PsyRequest, StageKey } from "@/data/types";
import type { DashFilters } from "./core";

/** Does a request count in this stage tile? A request denied today counts in "decided" and in "appeal". */
export function inStage(r: PsyRequest, stage: StageKey): boolean {
  if (stage === "decided") return !!r.decidedToday;
  return r.stage === stage;
}

/** Apply every Dashboard filter except Stage (the strip counts follow all filters but Stage). */
export function applyBaseFilters(requests: PsyRequest[], f: DashFilters): PsyRequest[] {
  return requests.filter((r) => {
    if (f.payer !== "all" && r.payerId !== f.payer) return false;
    if (f.program !== "all" && r.program !== f.program) return false;
    if (f.type !== "all" && r.type !== f.type) return false;
    return true;
  });
}

export function applyFilters(requests: PsyRequest[], f: DashFilters): PsyRequest[] {
  const base = applyBaseFilters(requests, f);
  return f.stage === "all" ? base : base.filter((r) => inStage(r, f.stage as StageKey));
}

export function stageCounts(requests: PsyRequest[]): Record<StageKey, number> {
  const out: Record<StageKey, number> = { preparing: 0, received: 0, under_review: 0, info_requested: 0, decided: 0, appeal: 0 };
  for (const r of requests) for (const s of Object.keys(out) as StageKey[]) if (inStage(r, s)) out[s] += 1;
  return out;
}

/** Minutes in the current stage, or minutes left for a denial. */
export const minutesInStage = (r: PsyRequest, clock: number): number => Math.max(0, clock - r.stageSince);
export const minutesLeft = (r: PsyRequest, clock: number): number | undefined => (r.deadlineAt === undefined ? undefined : r.deadlineAt - clock);

/** late = over 1.5 x typical, very = over 2 x typical. Only for requests that have a typical time and are still moving. */
export function lateness(r: PsyRequest, clock: number): "ok" | "late" | "very" {
  if (!r.typicalMin || r.stage === "decided" || r.stage === "appeal") return "ok";
  const t = minutesInStage(r, clock);
  if (t > 2 * r.typicalMin) return "very";
  if (t > 1.5 * r.typicalMin) return "late";
  return "ok";
}

/** Order for the Dashboard table: things needing a person first, then very late, late, then the rest by time waiting. */
export function sortForDashboard(requests: PsyRequest[], clock: number): PsyRequest[] {
  const rank = (r: PsyRequest) => {
    if (r.needsYou) return 0;
    const l = lateness(r, clock);
    if (l === "very") return 1;
    if (l === "late") return 2;
    if (r.track === "denial" && (minutesLeft(r, clock) ?? 1e9) < 2 * DAY) return 3;
    return 4;
  };
  return [...requests].sort((a, b) => rank(a) - rank(b) || (a.stage === b.stage ? 0 : 0) || minutesInStage(b, clock) - minutesInStage(a, clock));
}

export const requestById = (requests: PsyRequest[], id: string | null | undefined): PsyRequest | undefined => requests.find((r) => r.id === id);
