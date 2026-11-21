import { completeness, isOpen, readiness, serviceFor } from "@/data/intake/checklist";
import type { IntakeRecord, IntakeSectionId } from "@/data/intake/types";
import { cansFor, lonFor } from "@/data/va/policy";

export type SectionState = "done" | "attention" | "todo" | "na";

/** The state of each section for the left navigation, from the completeness checklist. `now` is the policy "now" (useIntakeNow); it only
    changes items that depend on that date (a legacy authorization that has ended by then). */
export function sectionState(r: IntakeRecord, s: IntakeSectionId, now = 0): SectionState {
  const all = completeness(r, now);
  if (s === "review") {
    const rd = readiness(r, now);
    if (rd.status === "handed_off" || (rd.status === "not_needed" && !all.some((i) => isOpen(i.status)))) return "done";
    if (rd.status === "ready" || all.some((i) => i.status === "blocked")) return "attention";
    return "todo";
  }
  if (s === "cans") {
    const svc = serviceFor(r).serviceId;
    const c = cansFor(svc, r.serviceDate, now).applies;
    if (c === "not_applicable" && lonFor(svc).applies === "no") return "na";
    /* Preparation only (a later start, before July 1, 2027): nothing is required yet, but the section is not "not applicable". */
    if (c === "upcoming" && all.filter((i) => i.section === "cans").every((i) => !isOpen(i.status))) return "todo";
  }
  const items = all.filter((i) => i.section === s);
  if (!items.length) return "todo";
  if (items.every((i) => i.status === "na")) return "na";
  if (items.every((i) => !isOpen(i.status))) return "done";
  if (items.some((i) => i.status === "blocked" || i.status === "pending" || i.status === "verify" || i.status === "complete")) return "attention";
  return "todo";
}
