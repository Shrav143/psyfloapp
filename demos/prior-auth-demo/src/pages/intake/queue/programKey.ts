import { programById, programForRequest, PROGRAMS_V2 } from "@/data/assess/programs";
import { CATEGORY_LABEL, type ProgramId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { GROUP_LABEL, SERVICES, serviceById, type VaServiceId } from "@/data/va/services";
import { availableOn, REDESIGN_START } from "@/data/va/policy";
import type { Tone } from "@/data/types";

/* The program a worklist row shows. A configured intake names the program it is being evaluated for; before that, the program the requested service
   stands for. A service with no program of its own (IIH, TDT, MHSS, crisis services) is keyed by the service, so it can still be filtered. */

/** Short names for the column; the full names are in the filter. */
const SHORT: Record<ProgramId, string> = {
  "mh-op": "Outpatient (MH)", "mh-iop": "MH IOP", "mh-php": "MH PHP", "mh-res": "MH residential", "mh-inpt": "MH inpatient", psr: "PSR", act: "ACT", csc: "CSC",
  "sud-op": "SUD outpatient", "sud-iop": "SUD IOP", "sud-php": "SUD PHP", "sud-res": "SUD residential", "sud-wm": "SUD withdrawal mgmt", "sud-inpt": "SUD inpatient", otp: "OTP", obot: "OBOT",
  "cpst-adult": "CPST Adult", "cpst-youth": "CPST Youth", "cpst-school": "CPST School", clubhouse: "Clubhouse", mhcm: "MH case management", cbbh: "Community BH",
  "youth-iop": "Youth MH IOP", "youth-php": "Youth MH PHP", "school-bh": "School BH", "children-intensive": "Children's intensive", aba: "ABA", prtf: "PRTF", "family-based": "Family-based BH",
  general: "General intake", custom: "Custom program",
};

export interface ProgramInfo {
  /** A ProgramId, or `svc:<service id>` for a service with no program. */
  key: string;
  label: string;
  /** Heading in the filter: a program category, or the service group. */
  group: string;
  serviceId: VaServiceId;
  /** The program the referral asked for, when a clinician has changed it. */
  requested?: string;
}

const isProgramId = (k: string): k is ProgramId => k in SHORT;

export function programInfo(key: string): ProgramInfo {
  if (isProgramId(key)) {
    const def = programById(key);
    return { key, label: SHORT[key], group: CATEGORY_LABEL[def.category], serviceId: def.serviceId };
  }
  const svc = serviceById(key.replace(/^svc:/, "") as VaServiceId);
  return { key, label: svc.short, group: GROUP_LABEL[svc.group], serviceId: svc.id };
}

export function programOf(r: IntakeRecord): ProgramInfo {
  const requested = programForRequest(r.serviceId, r.age)?.id ?? (`svc:${r.serviceId}` as const);
  const key: string = r.config?.programId ?? requested;
  const info = programInfo(key);
  const asked = r.config?.requestedProgramId;
  return asked && asked !== key ? { ...info, requested: programInfo(asked).label } : info;
}

/** Every program a filter can offer, in the catalog's order, then the services that have no program of their own. */
export function allProgramKeys(): string[] {
  const have = new Set(PROGRAMS_V2.map((p) => p.serviceId));
  return [...PROGRAMS_V2.map((p) => p.id as string), ...SERVICES.filter((s) => !have.has(s.id) && s.id !== "other-bh").map((s) => `svc:${s.id}`)];
}

/** What the policy date says about the service: a retiring service ends June 30, 2027; a redesigned one starts July 1, 2027. Null when there is nothing to say. */
export function policyCue(serviceId: VaServiceId, now: number): { text: string; tone: Tone } | null {
  const s = serviceById(serviceId);
  if (s.status === "retiring") return availableOn(serviceId, now) ? { text: "Ends 6/30/2027", tone: "neutral" } : { text: "Not available in this policy period", tone: "mid" };
  if (s.status === "redesign" && now < REDESIGN_START) return { text: "Starts 7/1/2027", tone: "neutral" };
  return null;
}
