import { REASON_TERMS, type DenialMeta } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { resolveMeta } from "./analysis";

/** What the address asks for: ?payer= is a payer id, ?reason= is a reason text such as Analytics shows. */
export interface DenialFilter {
  payer: string | null;
  reason: string | null;
}

export const isFiltering = (f: DenialFilter): boolean => !!(f.payer || f.reason);

/** A reason matches when it and one of the denial's words (the type, its summary, or the words for that type) contain each other. */
function reasonMatches(reason: string, meta: DenialMeta): boolean {
  const want = reason.trim().toLowerCase();
  if (!want) return true;
  return [meta.type, meta.summary, ...REASON_TERMS[meta.type]].some((w) => w.toLowerCase().includes(want) || want.includes(w.toLowerCase()));
}

export function filterDenials(list: PsyRequest[], meta: Record<string, DenialMeta>, f: DenialFilter): PsyRequest[] {
  if (!isFiltering(f)) return list;
  return list.filter((r) => (!f.payer || r.payerId === f.payer.toLowerCase()) && (!f.reason || reasonMatches(f.reason, resolveMeta(r, meta[r.id]))));
}
