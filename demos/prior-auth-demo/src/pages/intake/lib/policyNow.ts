import { REDESIGN_START } from "@/data/va/policy";
import { useStore } from "@/store";

/** "Now" for policy decisions: the demo clock, or July 1, 2027 while the policy preview is on. The demo clock itself never moves. */
export function useIntakeNow(): number {
  const clock = useStore((s) => s.clock);
  const preview = useStore((s) => s.policyPreview);
  return preview === "redesign" ? Math.max(clock, REDESIGN_START) : clock;
}
