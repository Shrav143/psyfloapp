/* Short lookups the intake form uses: a few ICD-10 codes to search and the charts EMR Connect offers to pull. */
import type { Diagnosis } from "@/data/cases";
import type { PayerId, Program, RequestType } from "@/data/types";

export const ICD_CODES: Diagnosis[] = [
  { code: "F10.20", label: "Alcohol dependence, uncomplicated" },
  { code: "F10.239", label: "Alcohol dependence with withdrawal, unspecified" },
  { code: "F11.20", label: "Opioid dependence, uncomplicated" },
  { code: "F11.23", label: "Opioid dependence with withdrawal" },
  { code: "F12.20", label: "Cannabis dependence, uncomplicated" },
  { code: "F13.20", label: "Sedative, hypnotic or anxiolytic dependence, uncomplicated" },
  { code: "F14.20", label: "Cocaine dependence, uncomplicated" },
  { code: "F15.20", label: "Other stimulant dependence, uncomplicated" },
  { code: "F33.2", label: "Major depressive disorder, recurrent, severe without psychotic features" },
  { code: "F33.1", label: "Major depressive disorder, recurrent, moderate" },
  { code: "F41.1", label: "Generalized anxiety disorder" },
  { code: "F43.10", label: "Post-traumatic stress disorder, unspecified" },
  { code: "F31.9", label: "Bipolar disorder, unspecified" },
];

export interface EmrChart {
  id: string;
  /** The EMR Connect system the chart lives in. */
  systemId: string;
  initials: string;
  age: number;
  payerId: PayerId;
  memberId: string;
  program: Program;
  type: RequestType;
  diagnoses: string[];
  reason: string;
  note: string;
}
export const EMR_CHARTS: EmrChart[] = [
  { id: "emr-1", systemId: "sys-res", initials: "J.M.", age: 34, payerId: "summit", memberId: "SM7403964821", program: "RES", type: "Admission", diagnoses: ["F10.20", "F33.2"], reason: "Relapse on 9/28 after eleven months of abstinence, with worsening depression.", note: "Admitted yesterday" },
  { id: "emr-2", systemId: "sys-out", initials: "A.R.", age: 45, payerId: "beacon", memberId: "BP5521907316", program: "IOP", type: "Initial request", diagnoses: ["F11.20", "F41.1"], reason: "Opioid use disorder stable on treatment, needs structured daily support after a lapse.", note: "Intake on Thursday" },
  { id: "emr-3", systemId: "sys-out", initials: "S.T.", age: 38, payerId: "harborview", memberId: "HV3308841277", program: "PHP", type: "Continued stay", diagnoses: ["F33.1", "F43.10"], reason: "Partial response in week 2 of the program, trauma symptoms still limit daily function.", note: "In program, day 9" },
  { id: "emr-4", systemId: "sys-res", initials: "L.G.", age: 29, payerId: "cardinal", memberId: "CH9917253340", program: "RES", type: "Admission", diagnoses: ["F15.20"], reason: "Daily stimulant use for two years, two prior outpatient attempts ended early.", note: "Admission tomorrow" },
];
