import { staffOf } from "../intake/seed";

/* Who may do what in the Intake workspace. The coordinator accepts and triages; a qualified clinician assesses, signs and selects the service; an
   authorized override (a qualified clinician or the clinic owner, with a reason) is the only way to remove a required module. */
export const canSign = (staffId: string): boolean => !!staffOf(staffId)?.qualified;
export const canOverride = (staffId: string): boolean => { const s = staffOf(staffId); return !!s && (s.qualified || s.role === "Clinic owner"); };
