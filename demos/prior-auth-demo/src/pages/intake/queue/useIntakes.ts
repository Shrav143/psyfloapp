import { useMemo } from "react";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { intakesInView } from "@/store/intakeSelectors";

/** The intakes the viewer may see: the sites in view, and the program in the top bar when one is chosen. */
export function useIntakes(focus = true): IntakeRecord[] {
  const all = useStore((s) => s.intakes);
  const program = useStore((s) => s.programFocus);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  return useMemo(() => intakesInView(useStore.getState(), focus), [all, program, viewerId, siteScope, focus]); // eslint-disable-line react-hooks/exhaustive-deps
}
