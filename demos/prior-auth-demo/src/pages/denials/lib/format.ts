import { APPEAL_LEVELS, type DenialWork } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { DAY, HOUR } from "@/lib/time";

/** "36 h", "3 d", "20 min". Under three days reads better in hours. */
export function leftLabel(min: number): string {
  if (min < HOUR) return `${Math.max(1, Math.round(min))} min`;
  if (min < 3 * DAY) return `${Math.round(min / HOUR)} h`;
  return `${Math.round(min / DAY)} d`;
}

export const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Closed means the denial is settled: accepted, or the call or the payer's decision on the appeal overturned or partly overturned it. */
export function isClosed(work: DenialWork | undefined): boolean {
  const won = (kind: string | undefined) => kind === "overturned" || kind === "partly";
  return !!work?.accepted || won(work?.outcome?.kind) || won(work?.decision?.result);
}

/** An appeal, second-level appeal or external review already sent: the payer has it and we wait. */
export const isFiled = (r: PsyRequest): boolean => APPEAL_LEVELS.some((l) => l.filedChip === r.chip);

export { REVIEW_NOTE } from "@/lib/pdf/report-doc";
/** Behind the (i) beside the Denial Intelligence title: this screen covers authorization denials only. */
export const SCOPE_NOTE = "Authorization denials only. Claim denials are handled in billing and are not in this demo.";
