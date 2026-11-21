import type { IntakeRecord } from "../intake/types";
import type { FieldDef } from "./types";

/* Fields that apply only in some situations. A field that is not visible is not drawn, is not proposed evidence by the reader, and must be optional, so
   it can never hold up a module. */

/** School CPST: the program is the school-setting variant, or the intake is set in a school. */
const schoolCpst = (r: IntakeRecord): boolean => r.config?.programId === "cpst-school" || r.config?.setting === "school";

const VISIBLE: Record<string, (r: IntakeRecord) => boolean> = {
  "cpst.school.contact": schoolCpst, "cpst.school.release": schoolCpst, "cpst.school.plan": schoolCpst, "cpst.school.delivery": schoolCpst,
  /* The certification-of-need placeholder is for a person under 21 in a psychiatric facility. */
  "ra.con": (r) => (!!r.config && r.config.population !== "adult") || r.config?.programId === "prtf" || (r.age !== null && r.age < 21),
};
export const isVisible = (f: FieldDef, r: IntakeRecord): boolean => VISIBLE[f.key]?.(r) ?? true;

