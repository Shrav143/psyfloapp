/* The charts waiting in the demo's connected clinical record systems (EMR Connect), with what a pull brings: the patient, the coverage, the request and the previous notes.
   All invented. Ages are as of the demo day, Tue 20 Oct 2026. */
import type { PayerId, CoreProgram, RequestType } from "@/data/types";
import type { ImportedDocument } from "./types";

export interface EmrChart {
  id: string;
  /** The EMR Connect system the chart lives in. */
  systemId: string;
  initials: string;
  age: number;
  /** yyyy-mm-dd */
  dob: string;
  sex: "F" | "M" | "X";
  payerId: PayerId;
  memberId: string;
  groupNumber: string;
  /** yyyy-mm-dd */
  effectiveFrom: string;
  effectiveTo: string;
  subscriber: string;
  program: CoreProgram;
  type: RequestType;
  diagnoses: string[];
  reason: string;
  note: string;
  /** Earlier notes and diagnoses on the chart, brought in as documents. */
  documents: ImportedDocument[];
}

export const EMR_CHARTS: EmrChart[] = [
  {
    id: "emr-1", systemId: "sys-res", initials: "J.M.", age: 34, dob: "1992-03-14", sex: "M", payerId: "summit", memberId: "SM7403964821", groupNumber: "OHMCD-01", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", subscriber: "Self",
    program: "RES", type: "Admission", diagnoses: ["F10.20", "F33.2"], reason: "Relapse on 9/28 after eleven months of abstinence, with worsening depression.", note: "Admitted yesterday",
    documents: [{ title: "Psychiatric evaluation", date: "2026-10-18", docId: "psych_eval" }, { title: "Medication list", date: "2026-10-19", docId: "meds" }],
  },
  {
    id: "emr-2", systemId: "sys-out", initials: "A.R.", age: 45, dob: "1981-07-02", sex: "F", payerId: "beacon", memberId: "BP5521907316", groupNumber: "GRP-55120", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", subscriber: "Self",
    program: "IOP", type: "Initial request", diagnoses: ["F11.20", "F41.1"], reason: "Opioid use disorder stable on treatment, needs structured daily support after a lapse.", note: "Intake on Thursday",
    documents: [{ title: "Progress note", date: "2026-10-16", docId: "therapy_note" }, { title: "Diagnosis history (F11.20, F41.1)", date: "2026-10-16", docId: "psych_eval" }],
  },
  {
    id: "emr-3", systemId: "sys-out", initials: "S.T.", age: 38, dob: "1988-01-23", sex: "F", payerId: "harborview", memberId: "HV3308841277", groupNumber: "MA-H3308", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", subscriber: "Self",
    program: "PHP", type: "Continued stay", diagnoses: ["F33.1", "F43.10"], reason: "Partial response in week 2 of the program, trauma symptoms still limit daily function.", note: "In program, day 9",
    documents: [{ title: "Group note", date: "2026-10-19", docId: "therapy_note" }, { title: "Treatment plan", date: "2026-10-12", docId: "treatment_plan" }],
  },
  {
    id: "emr-4", systemId: "sys-res", initials: "L.G.", age: 29, dob: "1997-05-09", sex: "M", payerId: "cardinal", memberId: "CH9917253340", groupNumber: "OHMCD-07", effectiveFrom: "2026-07-01", effectiveTo: "2027-06-30", subscriber: "Self",
    program: "RES", type: "Admission", diagnoses: ["F15.20"], reason: "Daily stimulant use for two years, two prior outpatient attempts ended early.", note: "Admission tomorrow",
    documents: [{ title: "Progress note", date: "2026-10-15", docId: "therapy_note" }, { title: "Diagnosis history (F15.20)", date: "2026-10-15", docId: "psych_eval" }],
  },
];
