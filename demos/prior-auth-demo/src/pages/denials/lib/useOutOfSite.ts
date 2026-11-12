import { siteOfDenial, type DenialMeta } from "@/data/denials";
import { siteOf } from "@/data/sites";
import type { PsyRequest } from "@/data/types";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";

/** The id the out-of-site card names. The card works out the site from the id, so it needs one that lands at the denial's site: the denial's own id when it does
    (every seeded denial placed by hand, and every letter-added one), otherwise the id of its case. */
export const cardIdOf = (req: PsyRequest, meta: DenialMeta | undefined): string => (siteOf(req.id) === siteOfDenial(meta, req.caseId) ? req.id : req.caseId);

/** The id for the out-of-site card when the denial exists but belongs to a site the viewer is not looking at (so the page shows the card, never its content); otherwise undefined. */
export function useOutOfSite(id: string | undefined): string | undefined {
  const { sites } = useScope();
  const req = useStore((s) => s.requests.find((r) => r.id === id));
  const stored = useStore((s) => (id ? s.denialMeta[id] : undefined));
  return req && !sites.includes(siteOfDenial(stored, req.caseId)) ? cardIdOf(req, stored) : undefined;
}
