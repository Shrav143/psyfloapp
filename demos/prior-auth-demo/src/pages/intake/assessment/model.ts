import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import { ASSESSMENT_SECTIONS, type IntakeRecord, type IntakeStaff } from "@/data/intake/types";
import { useStore } from "@/store";
import { meOf, pendingFor } from "@/store/intake";

/* What stands between an assessment and its signature, and who acts as the clinician. A person documents safety; agents never do. */

export interface Blocker {
  id: "empty" | "suggestions" | "safety-draft" | "safety" | "alert";
  text: string;
  /** The assessment field to jump to. */
  field?: string;
}

export const documented = (r: IntakeRecord): number => ASSESSMENT_SECTIONS.filter((s) => !!r.assessment.fields[s.id]?.value).length;
/** The safety section has text that a staff member (not an agent, not the system) wrote. */
export const safetyByPerson = (r: IntakeRecord): boolean => {
  const fv = r.assessment.fields.safety;
  return !!fv?.value && !!staffOf(fv.by);
};

export function signBlockers(r: IntakeRecord): Blocker[] {
  const out: Blocker[] = [];
  const pending = pendingFor(r, "assessment");
  const others = pending.filter((s) => s.field !== "safety");
  if (!documented(r)) out.push({ id: "empty", text: "Nothing is documented yet." });
  if (others.length) out.push({ id: "suggestions", text: `${others.length} AI ${others.length === 1 ? "suggestion is" : "suggestions are"} not reviewed. Accept, edit or reject each one.`, field: others[0].field });
  if (pending.some((s) => s.field === "safety")) out.push({ id: "safety-draft", text: "An AI draft of risk information waits for a clinician. Document the screening from it, or dismiss it.", field: "safety" });
  if (!safetyByPerson(r)) out.push({ id: "safety", text: r.assessment.fields.safety?.value ? "The safety and risk screening text did not come from a clinician. A clinician documents it in their own words." : "The safety and risk screening is not documented by a clinician.", field: "safety" });
  if (r.safety?.status === "open") out.push({ id: "alert", text: "A safety alert is open. A clinician reviews it in the alert at the top of this record first." });
  return out;
}

/** The person who documents safety: the viewer when they are a qualified clinician, otherwise the site's clinician as labeled demo role-play. */
export function useClinicianActor(r: IntakeRecord): { staff: IntakeStaff; rolePlay: boolean; viewer?: IntakeStaff } {
  const me = useStore((s) => meOf(s));
  const viewer = staffOf(me);
  if (viewer?.qualified) return { staff: viewer, rolePlay: false, viewer };
  return { staff: staffOf(CLINICIAN_AT[r.site]) ?? { id: CLINICIAN_AT[r.site], name: "The site clinician", initials: "", role: "Licensed clinician", qualified: true }, rolePlay: true, viewer };
}

/** Scrolls the record to an assessment field (or the safety alert at the top). */
export function jumpTo(field?: string): void {
  if (!field) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.querySelector(`[data-field="assessment.${field}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
}
