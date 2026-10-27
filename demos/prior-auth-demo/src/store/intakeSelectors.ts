import type { IntakeRecord } from "@/data/intake/types";
import { sitesInView } from "@/lib/scope";
import type { AppState } from "./index";

/** The intakes the viewer may see (by site), and, when a program is in focus, only that program's. */
export const intakesInView = (s: AppState, focus = true): IntakeRecord[] => {
  const sites = sitesInView(s);
  return s.intakes.filter((r) => sites.includes(r.site) && (!focus || s.programFocus === "all" || r.serviceId === s.programFocus));
};
/** Sidebar: new intakes waiting for triage, at the sites in view. */
export const selectIntakeBadge = (s: AppState): number => intakesInView(s, false).filter((r) => r.triage === "new").length;
/** The legacy clients the viewer may see. */
export const rosterInView = (s: AppState) => {
  const sites = sitesInView(s);
  return s.legacyRoster.filter((c) => sites.includes(c.site));
};
