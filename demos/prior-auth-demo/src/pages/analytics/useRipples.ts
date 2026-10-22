import { useMemo } from "react";
import type { Program } from "@/data/types";
import { useStore } from "@/store";
import type { Ripples } from "./model";

/** What other screens recorded: appeal rulings and accepted denials from Denial Intelligence, dismissed recommendations from Authorizations.
    Each entry knows its request, so the payer and program are looked up there (Dashboard requests first, then the Authorizations queue). */
export function useRipples(): Ripples {
  const appeals = useStore((s) => s.appealDecisions);
  const accepted = useStore((s) => s.deniesAccepted);
  const dismissals = useStore((s) => s.dismissals);
  const requests = useStore((s) => s.requests);
  const queue = useStore((s) => s.queueItems);
  return useMemo(() => {
    const find = (...ids: (string | undefined)[]): { payerId?: string; program?: Program } => {
      for (const id of ids) {
        if (!id) continue;
        const hit = requests.find((r) => r.id === id || r.caseId === id) ?? queue.find((q) => q.id === id);
        if (hit) return { payerId: hit.payerId, program: hit.program };
      }
      return {};
    };
    return {
      appeals: appeals.map((a) => ({ ...a, program: find(a.denialId, a.requestId).program })),
      accepted: accepted.map((a) => ({ ...a, program: find(a.denialId, a.requestId).program })),
      dismissals: dismissals.map((d) => ({ reason: d.reason, ...find(d.requestId) })),
    };
  }, [appeals, accepted, dismissals, requests, queue]);
}
