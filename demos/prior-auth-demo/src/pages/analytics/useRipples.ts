import { useMemo } from "react";
import { useStore } from "@/store";
import type { Ripples } from "./model";

/** What other screens recorded: appeal rulings and accepted denials from Denial Intelligence, dismissed recommendations from Authorizations.
    A dismissal knows its request, so the payer is looked up there (Dashboard requests first, then the Authorizations queue). */
export function useRipples(): Ripples {
  const appeals = useStore((s) => s.appealDecisions);
  const accepted = useStore((s) => s.deniesAccepted);
  const dismissals = useStore((s) => s.dismissals);
  const requests = useStore((s) => s.requests);
  const queue = useStore((s) => s.queueItems);
  return useMemo(
    () => ({
      appeals,
      accepted,
      dismissals: dismissals.map((d) => ({ reason: d.reason, payerId: requests.find((r) => r.id === d.requestId)?.payerId ?? queue.find((q) => q.id === d.requestId)?.payerId })),
    }),
    [appeals, accepted, dismissals, requests, queue],
  );
}
