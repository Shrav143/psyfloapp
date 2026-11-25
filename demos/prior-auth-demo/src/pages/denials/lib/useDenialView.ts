import { useMemo } from "react";
import type { DenialMeta, DenialWork } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { useStore } from "@/store";
import { buildAnalysis, resolveMeta, type DenialAnalysis } from "./analysis";

export interface DenialView {
  req: PsyRequest;
  meta: DenialMeta;
  analysis: DenialAnalysis;
  work: DenialWork;
  clock: number;
}

const NO_WORK: DenialWork = { fixes: [], ticked: [] };

/** Everything the analysis and brief screens need for one denial, rebuilt when the request, the clock or the user's work changes. */
export function useDenialView(id: string | undefined): DenialView | undefined {
  const requests = useStore((s) => s.requests);
  const clock = useStore((s) => s.clock);
  const stored = useStore((s) => (id ? s.denialMeta[id] : undefined));
  const work = useStore((s) => (id ? s.denialWork[id] : undefined));
  const req = requests.find((r) => r.id === id);
  return useMemo(() => {
    if (!req) return undefined;
    const meta = resolveMeta(req, stored);
    return { req, meta, analysis: buildAnalysis(req, meta, clock), work: work ?? NO_WORK, clock };
  }, [req, stored, work, clock]);
}
