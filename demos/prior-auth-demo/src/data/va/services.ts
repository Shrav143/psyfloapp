import type { AuthProgram } from "../types";

/* Virginia Medicaid behavioral health services, as the demo offers them. Codes are given only where the DMAS redesign materials state them
   (the four retiring services). Every requirement attached to a service lives in data/va/policy.ts, never here. */

export type VaServiceId =
  | "arts-res" | "arts-wm" | "arts-iop" | "arts-php"
  | "mh-iop" | "mh-php" | "act" | "aba" | "mhcm" | "crisis" | "opt"
  | "iih" | "tdt" | "mhss" | "psr"
  | "cpst-adult" | "cpst-youth" | "cpst-school" | "csc" | "clubhouse"
  | "arts-op" | "arts-inpt" | "otp" | "obot" | "mh-res" | "mh-inpt" | "prtf" | "other-bh";

export type ServiceGroup = "arts" | "mh" | "legacy" | "redesign";
/** current: in effect today. retiring: ends June 30, 2027. redesign: starts July 1, 2027. */
export type ServiceStatus = "current" | "retiring" | "redesign";
export type AgeGroup = "adult" | "youth" | "all";

export interface VaService {
  id: VaServiceId;
  label: string;
  short: string;
  group: ServiceGroup;
  status: ServiceStatus;
  /** The authorization program a handoff to New Case uses. */
  program: AuthProgram;
  /** IOP and PHP exist both under ARTS (substance use) and as mental health services. */
  track?: "sud" | "mh";
  code?: string;
  ages: AgeGroup;
  setting: "community" | "school" | "facility" | "clinic" | "any";
  /** ISO dates from the DMAS implementation bulletin. */
  endsOn?: string;
  startsOn?: string;
  summary: string;
}

export const GROUP_LABEL: Record<ServiceGroup, string> = {
  arts: "Addiction and Recovery Treatment Services (ARTS)",
  mh: "Mental health services",
  legacy: "Retiring June 30, 2027",
  redesign: "Redesign, starting July 1, 2027",
};

export const SERVICES: VaService[] = [
  { id: "arts-res", label: "ARTS residential (ASAM 3.1 to 3.7)", short: "ARTS residential", group: "arts", status: "current", program: "RES", track: "sud", ages: "all", setting: "facility", summary: "Residential substance use treatment at ASAM levels 3.1 to 3.7." },
  { id: "arts-wm", label: "ARTS withdrawal management", short: "ARTS withdrawal mgmt", group: "arts", status: "current", program: "WM", track: "sud", ages: "all", setting: "facility", summary: "Withdrawal management under ARTS." },
  { id: "arts-iop", label: "ARTS intensive outpatient (ASAM 2.1)", short: "ARTS IOP", group: "arts", status: "current", program: "IOP", track: "sud", ages: "all", setting: "clinic", summary: "Intensive outpatient substance use treatment." },
  { id: "arts-php", label: "ARTS partial hospitalization (ASAM 2.5)", short: "ARTS PHP", group: "arts", status: "current", program: "PHP", track: "sud", ages: "all", setting: "clinic", summary: "Partial hospitalization for substance use." },
  { id: "mh-iop", label: "Mental health intensive outpatient (IOP)", short: "MH IOP", group: "mh", status: "current", program: "IOP", track: "mh", ages: "all", setting: "clinic", summary: "Mental health intensive outpatient program." },
  { id: "mh-php", label: "Mental health partial hospitalization (PHP)", short: "MH PHP", group: "mh", status: "current", program: "PHP", track: "mh", ages: "all", setting: "clinic", summary: "Mental health partial hospitalization program." },
  { id: "act", label: "Assertive Community Treatment (ACT)", short: "ACT", group: "mh", status: "current", program: "ACT", ages: "adult", setting: "community", summary: "A team-based community service for adults with serious mental illness." },
  { id: "aba", label: "Applied behavior analysis (ABA)", short: "ABA", group: "mh", status: "current", program: "ABA", ages: "all", setting: "any", summary: "Applied behavior analysis treatment." },
  { id: "mhcm", label: "Mental health case management", short: "MH case management", group: "mh", status: "current", program: "MHCM", ages: "all", setting: "community", summary: "Mental health case management. Its policy is being updated with the redesign." },
  { id: "crisis", label: "Mobile crisis and 23-hour crisis stabilization", short: "Crisis services", group: "mh", status: "current", program: "CRISIS", ages: "all", setting: "community", summary: "Mobile crisis response and 23-hour crisis stabilization." },
  { id: "opt", label: "Outpatient therapy", short: "Outpatient therapy", group: "mh", status: "current", program: "OPT", ages: "all", setting: "clinic", summary: "Outpatient psychotherapy." },
  { id: "iih", label: "Intensive In-Home Services (IIH)", short: "IIH", group: "legacy", status: "retiring", program: "IIH", code: "H2012", ages: "youth", setting: "community", endsOn: "2027-06-30", summary: "Intensive in-home services for youth. Retires June 30, 2027." },
  { id: "tdt", label: "Therapeutic Day Treatment (TDT)", short: "TDT", group: "legacy", status: "retiring", program: "TDT", code: "H2016", ages: "youth", setting: "school", endsOn: "2027-06-30", summary: "Therapeutic day treatment, often school based. Retires June 30, 2027." },
  { id: "mhss", label: "Mental Health Skill-Building (MHSS)", short: "MHSS", group: "legacy", status: "retiring", program: "MHSS", code: "H0046", ages: "adult", setting: "community", endsOn: "2027-06-30", summary: "Skill-building services. Retires June 30, 2027." },
  { id: "psr", label: "Psychosocial Rehabilitation (PSR)", short: "PSR", group: "legacy", status: "retiring", program: "PSR", code: "H2017", ages: "adult", setting: "community", endsOn: "2027-06-30", summary: "Psychosocial rehabilitation. Retires June 30, 2027." },
  { id: "cpst-adult", label: "CPST: Adult, Community", short: "CPST Adult", group: "redesign", status: "redesign", program: "CPST_A", ages: "adult", setting: "community", startsOn: "2027-07-01", summary: "Community Psychiatric Support and Treatment for adults, in the community." },
  { id: "cpst-youth", label: "CPST: Youth, Community", short: "CPST Youth", group: "redesign", status: "redesign", program: "CPST_Y", ages: "youth", setting: "community", startsOn: "2027-07-01", summary: "Community Psychiatric Support and Treatment for youth, in the community." },
  { id: "cpst-school", label: "CPST: Youth, School Setting", short: "CPST School", group: "redesign", status: "redesign", program: "CPST_S", ages: "youth", setting: "school", startsOn: "2027-07-01", summary: "Community Psychiatric Support and Treatment for youth, in a school setting." },
  { id: "csc", label: "Coordinated Specialty Care for First Episode Psychosis (CSC)", short: "CSC (first episode psychosis)", group: "redesign", status: "redesign", program: "CSC", ages: "all", setting: "community", startsOn: "2027-07-01", summary: "Team-based care for a first episode of psychosis." },
  { id: "clubhouse", label: "Mental Health Clubhouse", short: "Clubhouse", group: "redesign", status: "redesign", program: "CLUB", ages: "adult", setting: "community", startsOn: "2027-07-01", summary: "Mental health clubhouse services." },
  { id: "arts-op", label: "ARTS outpatient (ASAM level 1)", short: "ARTS outpatient", group: "arts", status: "current", program: "ARTS_OP", track: "sud", ages: "all", setting: "clinic", summary: "Outpatient substance use treatment." },
  { id: "arts-inpt", label: "ARTS inpatient (ASAM level 4)", short: "ARTS inpatient", group: "arts", status: "current", program: "ARTS_INPT", track: "sud", ages: "all", setting: "facility", summary: "Medically managed intensive inpatient substance use treatment." },
  { id: "otp", label: "Opioid treatment program (OTP)", short: "OTP", group: "arts", status: "current", program: "OTP", track: "sud", ages: "adult", setting: "clinic", summary: "Medication for opioid use disorder in a certified opioid treatment program." },
  { id: "obot", label: "Office-based opioid treatment (OBOT)", short: "OBOT", group: "arts", status: "current", program: "OBOT", track: "sud", ages: "adult", setting: "clinic", summary: "Medication for opioid use disorder in an office-based setting." },
  { id: "mh-res", label: "Psychiatric residential treatment", short: "Psychiatric residential", group: "mh", status: "current", program: "MH_RES", track: "mh", ages: "all", setting: "facility", summary: "Residential mental health treatment." },
  { id: "mh-inpt", label: "Psychiatric inpatient treatment", short: "Psychiatric inpatient", group: "mh", status: "current", program: "MH_INPT", track: "mh", ages: "all", setting: "facility", summary: "Inpatient psychiatric treatment." },
  { id: "prtf", label: "Psychiatric residential treatment facility (PRTF)", short: "PRTF", group: "mh", status: "current", program: "PRTF", track: "mh", ages: "youth", setting: "facility", summary: "Residential psychiatric facility care for people under 21." },
  { id: "other-bh", label: "Other behavioral health service", short: "Other service", group: "mh", status: "current", program: "OTHER", ages: "all", setting: "any", summary: "A service this organization defines. No state or plan requirements are loaded for it." },
];

export const SERVICE_IDS = SERVICES.map((s) => s.id);
export const serviceById = (id: VaServiceId): VaService => SERVICES.find((s) => s.id === id) as VaService;
export const servicesIn = (g: ServiceGroup): VaService[] => SERVICES.filter((s) => s.group === g);
export const SERVICE_GROUPS: ServiceGroup[] = ["arts", "mh", "legacy", "redesign"];
/** The services a program focus or a requested service can be. "all" means no focus. */
export type ProgramFocus = VaServiceId | "all";
