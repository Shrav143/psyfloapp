import { useMemo } from "react";
import { openDrafts, type OpenDraft } from "@/data/payerConfig";
import { useStore } from "@/store";

/** One payer's drafts that have not been sent, read live from the Dashboard requests and the saved New case drafts. */
export function useOpenDrafts(payerId: string): OpenDraft[] {
  const requests = useStore((s) => s.requests);
  const caseDrafts = useStore((s) => s.caseDrafts);
  return useMemo(() => openDrafts(requests, caseDrafts, payerId), [requests, caseDrafts, payerId]);
}
