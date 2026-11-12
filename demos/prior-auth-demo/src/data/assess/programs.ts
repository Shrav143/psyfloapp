import { vaDate } from "../va/policy";
import { serviceById } from "../va/services";
import { CATEGORY_LABEL, type Availability, type CareSetting, type Population, type ProgramAvailability, type ProgramCategory, type ProgramDef, type ProgramId } from "./types";

/* The programs a person can be evaluated for. Availability is configuration, not an assumption: a program mapped to a Virginia service takes its dates
   from data/va/services.ts; a program with no service says it is not verified for the state. Being in this list never means a plan covers it. */

const ALL: Population[] = ["adult", "adolescent", "child"];
const YOUTH: Population[] = ["adolescent", "child"];
const ADULT: Population[] = ["adult"];

const p = (id: ProgramId, label: string, category: ProgramCategory, summary: string, populations: Population[], settings: CareSetting[], serviceId: ProgramDef["serviceId"], note?: string): ProgramDef => ({
  id, label, category, summary, populations, defaultPopulation: populations[0], settings, defaultSetting: settings[0], serviceId, note,
});

export const PROGRAMS_V2: ProgramDef[] = [
  /* mental health */
  p("mh-op", "Outpatient mental health", "mh", "Individual, family and group therapy and medication management.", ALL, ["outpatient", "telehealth", "hybrid"], "opt"),
  p("mh-iop", "Mental health intensive outpatient program", "mh", "Structured several-days-a-week treatment for people who need more than weekly outpatient care.", ALL, ["outpatient", "telehealth", "hybrid"], "mh-iop"),
  p("mh-php", "Mental health partial hospitalization program", "mh", "Day-long structured treatment, several days a week, with the person home at night.", ALL, ["outpatient", "hybrid"], "mh-php"),
  p("mh-res", "Psychiatric residential treatment", "mh", "Live-in psychiatric treatment outside a hospital.", ["adult"], ["residential"], "mh-res", "Availability for adults varies by plan; not verified."),
  p("mh-inpt", "Psychiatric inpatient treatment", "mh", "Hospital-level psychiatric treatment.", ALL, ["inpatient"], "mh-inpt"),
  p("psr", "Community psychiatric rehabilitation", "mh", "Psychosocial rehabilitation (PSR).", ADULT, ["community"], "psr", "PSR is one of the four services that end June 30, 2027."),
  p("act", "Assertive Community Treatment", "mh", "A team-based community service for adults with serious mental illness.", ADULT, ["community", "home"], "act"),
  p("csc", "Coordinated Specialty Care", "mh", "Team-based care for a first episode of psychosis.", ["adult", "adolescent"], ["community", "outpatient"], "csc"),
  /* substance use disorder */
  p("sud-op", "SUD outpatient", "sud", "Outpatient substance use treatment.", ALL, ["outpatient", "telehealth", "hybrid"], "arts-op"),
  p("sud-iop", "SUD intensive outpatient program", "sud", "Structured outpatient substance use treatment several days a week.", ALL, ["outpatient", "telehealth", "hybrid"], "arts-iop"),
  p("sud-php", "SUD partial hospitalization program", "sud", "Day-long structured substance use treatment with the person home at night.", ALL, ["outpatient", "hybrid"], "arts-php"),
  p("sud-res", "SUD residential treatment", "sud", "Live-in substance use treatment.", ALL, ["residential"], "arts-res"),
  p("sud-wm", "Withdrawal management / detox", "sud", "Managed withdrawal from alcohol or other drugs.", ALL, ["residential", "inpatient", "outpatient"], "arts-wm"),
  p("sud-inpt", "SUD inpatient treatment", "sud", "Medically managed intensive inpatient substance use treatment.", ALL, ["inpatient"], "arts-inpt"),
  p("otp", "Opioid treatment program", "sud", "Medication for opioid use disorder in a certified opioid treatment program.", ADULT, ["outpatient"], "otp"),
  p("obot", "Office-based addiction treatment", "sud", "Medication for opioid use disorder in an office-based setting.", ADULT, ["outpatient", "telehealth"], "obot"),
  /* community behavioral health */
  p("cpst-adult", "Virginia CPST: Adult, Community", "community", "Community Psychiatric Support and Treatment for adults.", ADULT, ["community", "home"], "cpst-adult"),
  p("cpst-youth", "Virginia CPST: Youth, Community", "community", "Community Psychiatric Support and Treatment for young people, in the community.", YOUTH, ["community", "home"], "cpst-youth"),
  p("cpst-school", "Virginia CPST: Youth, School Setting", "community", "Community Psychiatric Support and Treatment for young people, in school.", YOUTH, ["school"], "cpst-school"),
  p("clubhouse", "Mental health clubhouse", "community", "Community clubhouse services.", ADULT, ["community"], "clubhouse"),
  p("mhcm", "Mental health case management", "community", "Coordination of care and supports. The policy is being updated with the redesign.", ALL, ["community", "outpatient", "home"], "mhcm"),
  p("cbbh", "Community-based behavioral health services", "community", "Other community-based services a program configures.", ALL, ["community", "home"], "other-bh"),
  /* children and adolescents */
  p("youth-iop", "Youth mental health IOP", "children", "Mental health intensive outpatient program for a young person.", YOUTH, ["outpatient", "telehealth", "hybrid"], "mh-iop", "The same service as mental health IOP, with a youth assessment plan."),
  p("youth-php", "Youth mental health PHP", "children", "Mental health partial hospitalization for a young person.", YOUTH, ["outpatient", "hybrid"], "mh-php", "The same service as mental health PHP, with a youth assessment plan."),
  p("school-bh", "School-based behavioral health", "children", "Behavioral health support delivered at school.", YOUTH, ["school"], "other-bh", "How this maps under the redesign is not verified."),
  p("children-intensive", "Children's intensive services", "children", "Intensive in-home or in-community support for a child and family.", YOUTH, ["home", "community"], "other-bh", "Intensive In-Home Services end June 30, 2027; the replacement is chosen by clinical review, never assumed."),
  p("aba", "Applied behavior analysis", "children", "Behavior-analytic treatment, usually for autism.", YOUTH, ["home", "outpatient", "community", "school"], "aba"),
  p("prtf", "Psychiatric residential treatment facility", "children", "Residential psychiatric facility care for people under 21.", YOUTH, ["residential"], "prtf"),
  p("family-based", "Family-based behavioral health services", "children", "Services delivered with the whole family.", YOUTH, ["home", "community"], "other-bh"),
  /* other */
  p("general", "General behavioral health intake", "other", "An intake before the program is known.", ALL, ["outpatient", "community", "telehealth", "hybrid"], "other-bh"),
  p("custom", "Custom program", "other", "A program this organization defines.", ALL, ["outpatient", "community", "residential", "inpatient", "school", "home", "telehealth", "hybrid"], "other-bh"),
];

export const PROGRAM_IDS = PROGRAMS_V2.map((x) => x.id);
export const programById = (id: ProgramId): ProgramDef => PROGRAMS_V2.find((x) => x.id === id) as ProgramDef;
export const programsIn = (c: ProgramCategory): ProgramDef[] => PROGRAMS_V2.filter((x) => x.category === c);
export const PROGRAM_CATEGORIES: ProgramCategory[] = ["mh", "sud", "community", "children", "other"];
export { CATEGORY_LABEL };

/** A program that stands for a Virginia service, from that service's id. The first match (Youth IOP shares mental health IOP's service). */
export const programForService = (serviceId: string): ProgramDef | undefined => (serviceId === "other-bh" ? undefined : PROGRAMS_V2.find((x) => x.serviceId === serviceId));

/** The population an age falls in: adult from 18, adolescent 12 to 17, child under 12. Null while the age is not known. */
export const populationForAge = (age: number | null): Population | null => (age === null ? null : age >= 18 ? "adult" : age >= 12 ? "adolescent" : "child");

/** The population and setting a program starts with for a person of this age. A program that serves one population decides it; otherwise the person's age does, when the program serves it. */
export function defaultsFor(id: ProgramId, age: number | null): { population: Population; setting: CareSetting } {
  const def = programById(id);
  const byAge = populationForAge(age);
  const population = def.populations.length === 1 ? def.populations[0] : byAge && def.populations.includes(byAge) ? byAge : def.defaultPopulation;
  return { population, setting: def.defaultSetting };
}

/** The program a referral for a Virginia service stands for. Several programs can share one service (Youth IOP is mental health IOP for a young person), so the one made for the person's age comes first. */
export function programForRequest(serviceId: string, age: number | null): ProgramDef | undefined {
  if (serviceId === "other-bh") return undefined;
  const same = PROGRAMS_V2.filter((x) => x.serviceId === serviceId);
  const pop = populationForAge(age);
  return (pop ? same.find((x) => x.populations.length < ALL.length && x.populations.includes(pop)) : undefined) ?? same[0];
}

/** Whether a program can be offered on a date, from its service's dates, in the state's configuration. `date` is demo minutes. */
export function programAvailability(id: ProgramId, state: string, date: number): ProgramAvailability {
  const def = programById(id);
  if (state !== "VA") return { status: "unverified", note: `No ${state} configuration is loaded. Treat availability as unverified.`, verification: "unverified" };
  if (def.serviceId === "other-bh") return { status: "unverified", note: "Availability and coverage are not verified for this program. It can be assessed; it does not imply a plan covers it.", verification: "unverified" };
  const svc = serviceById(def.serviceId);
  const dated = !!svc.startsOn || !!svc.endsOn;
  const verification = dated ? "verified" as const : "unverified" as const;
  const status = (a: Availability, note: string): ProgramAvailability => ({ status: a, note, verification, from: svc.startsOn, to: svc.endsOn });
  if (svc.startsOn && date < vaDate(svc.startsOn)) return status("starts", `Starts July 1, 2027 (DMAS redesign dates). Draft service rules; not available before then.`);
  if (svc.endsOn && date > vaDate(svc.endsOn)) return status("retired", `Ended June 30, 2027 in the redesign. Not available in this policy period; clinical review chooses what replaces it.`);
  if (svc.endsOn) return status("available", `Available until June 30, 2027, when it ends.`);
  if (svc.startsOn) return status("available", `Available from July 1, 2027. Service rules are still draft.`);
  return status("available", "Offered today. Whether a given plan covers it, and under what rules, is not verified here.");
}
