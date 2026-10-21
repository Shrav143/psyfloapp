import type { PsyRequest, Tone } from "@/data/types";
import { DAY, HOUR } from "@/lib/time";
import type { DenialWork } from "@/data/denials";

/** "36 h", "3 d", "20 min". Under three days reads better in hours. */
export function leftLabel(min: number): string {
  if (min < HOUR) return `${Math.max(1, Math.round(min))} min`;
  if (min < 3 * DAY) return `${Math.round(min / HOUR)} h`;
  return `${Math.round(min / DAY)} d`;
}

export const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Closed means the denial is settled: accepted, or the call overturned or partly restored it. */
export function isClosed(work: DenialWork | undefined): boolean {
  return !!work?.accepted || work?.outcome?.kind === "overturned" || work?.outcome?.kind === "partly";
}

/** The chip in the Open denials list: the route and the time left, or where it stands. */
export function routeChip(r: PsyRequest, clock: number): { text: string; tone: Tone } {
  if (r.stage !== "appeal") return { text: r.chip, tone: r.tone };
  if (r.deadlineAt !== undefined && r.clockNote) return { text: capitalize(r.clockNote), tone: "neutral" };
  if (r.deadlineAt !== undefined) {
    const left = r.deadlineAt - clock;
    if (left <= 0) return { text: "Window closed", tone: "risk" };
    const word = r.clockSub === "to file" ? "Appeal in" : r.clockSub === "to resubmit" ? "Resubmit in" : r.clockSub === "peer-to-peer window" ? "P2P in" : "Due in";
    return { text: `${word} ${leftLabel(left)}`, tone: left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "neutral" };
  }
  return { text: r.clockNote ? capitalize(r.clockNote) : r.chip, tone: "neutral" };
}

/** Nearest deadline first. Denials we are only waiting on (filed, no deadline of ours) come last. */
export function sortOpen(list: PsyRequest[], clock: number): PsyRequest[] {
  const key = (r: PsyRequest) => (r.deadlineAt === undefined ? Number.POSITIVE_INFINITY : r.deadlineAt - clock);
  return [...list].sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id));
}

/** Appeal or external review already sent: the payer has it and we wait. */
export const isFiled = (r: PsyRequest): boolean => r.chip === "Appeal filed" || r.chip === "External review";

export const PROGRAM_SHORT: Record<string, string> = { RES: "Res.", IOP: "IOP", PHP: "PHP", WM: "Detox" };
