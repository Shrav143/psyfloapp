import { siteOfDenial } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";

/** The denial when it exists but belongs to a site the viewer is not looking at (so the page shows the out-of-site card, never its content); otherwise undefined. */
export function useOutOfSite(id: string | undefined): PsyRequest | undefined {
  const { sites } = useScope();
  const req = useStore((s) => s.requests.find((r) => r.id === id));
  const stored = useStore((s) => (id ? s.denialMeta[id] : undefined));
  return req && !sites.includes(siteOfDenial(stored, req.caseId)) ? req : undefined;
}
