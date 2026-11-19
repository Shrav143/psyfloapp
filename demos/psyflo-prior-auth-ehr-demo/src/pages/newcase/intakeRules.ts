/* What Intake needs before the agents can read a case, as plain functions with no store in them. */
import type { CaseDraft } from "@/data/cases";

export const patientReady = (d: Pick<CaseDraft, "patient">): boolean => !!d.patient.initials.trim() && !!d.patient.age;
