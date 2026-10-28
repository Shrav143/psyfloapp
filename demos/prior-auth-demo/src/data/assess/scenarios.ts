import type { ProgramId, PurposeId } from "./types";

/* The demo scenarios: fictional people, each on a different program, so the intake visibly changes. The records are seeded in data/intake (the scenarios
   engineer enriches them); this list is what the switcher, the Demo menu and the tests read. */
export interface DemoScenario {
  key: string;
  label: string;
  intakeId: string;
  programId: ProgramId;
  purposeId: PurposeId;
  /** One line on what it shows. */
  shows: string;
}

export const SCENARIOS: DemoScenario[] = [
  { key: "A", label: "Adult CPST", intakeId: "IN-3102", programId: "cpst-adult", purposeId: "initial", shows: "Referral, assessment, CANS, Level of Need, care planning and authorization readiness for a person leaving a retiring service." },
  { key: "B", label: "Youth CPST, school", intakeId: "IN-3101", programId: "cpst-school", purposeId: "initial", shows: "A school referral: caregiver information, school functioning, CANS, Level of Need and care planning." },
  { key: "C", label: "SUD IOP", intakeId: "IN-3112", programId: "sud-iop", purposeId: "initial", shows: "ASAM documentation, level-of-care review, treatment plan and authorization for a step-down from residential." },
  { key: "D", label: "SUD residential", intakeId: "IN-3110", programId: "sud-res", purposeId: "initial", shows: "ASAM, withdrawal and medical review, residential admission review and authorization." },
  { key: "E", label: "Mental health PHP", intakeId: "IN-3115", programId: "mh-php", purposeId: "initial", shows: "Psychiatric assessment, functional impairment, PHP medical necessity documentation and authorization." },
];
/** Also worth opening: a safety alert and CSC, a voice-assisted intake, and ABA. */
export const EXTRA_SCENARIOS: DemoScenario[] = [
  { key: "F", label: "CSC, safety alert", intakeId: "IN-3103", programId: "csc", purposeId: "initial", shows: "A hospital referral with an open safety alert a clinician must review." },
  { key: "G", label: "Voice-assisted intake", intakeId: "IN-3104", programId: "mh-op", purposeId: "initial", shows: "A coordinator collects the intake with the Voice Intake Assistant." },
  { key: "H", label: "ABA", intakeId: "IN-3117", programId: "aba", purposeId: "initial", shows: "Developmental and behavioral assessment modules." },
];
