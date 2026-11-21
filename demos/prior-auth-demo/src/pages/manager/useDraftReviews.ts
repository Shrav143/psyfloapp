import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";

/** Cadence drafts reviews. Pass the ids of one review, or none for every review due this week at the sites in view. A paused Cadence says so at once and does nothing;
    otherwise the button spins for about a second before the drafts appear. The drawer, the quick view and the Reviews header all use it. */
export function useDraftReviews(ids?: string[]): { drafting: boolean; draft: () => void } {
  const [drafting, setDrafting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const draft = () => {
    if (useStore.getState().agentPaused.cadence) {
      useStore.getState().draftDueReviews(ids);
      return;
    }
    setDrafting(true);
    timer.current = setTimeout(() => {
      useStore.getState().draftDueReviews(ids);
      setDrafting(false);
    }, 1300);
  };
  return { drafting, draft };
}
