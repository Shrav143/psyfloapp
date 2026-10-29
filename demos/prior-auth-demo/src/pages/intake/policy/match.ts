import { PROGRAMS_V2 } from "@/data/assess/programs";
import { RULES } from "@/data/assess/rules";
import type { AssessmentRule, ProgramId } from "@/data/assess/types";
import type { PayerId } from "@/data/types";
import { coverageOf, POLICY_RULES, vaDate, type CoverageType, type PolicyRule, type PolicyVersionId, type ReqKind } from "@/data/va/policy";
import type { AgeGroup, VaServiceId } from "@/data/va/services";

/* Matching for the policy drawer: the same dimensions requirementsFor() uses, each one optional, so a person can look at the rules from any angle.
   Organization rules are an administrator's local notes on the same dimensions. They are labeled unverified and never change a DMAS rule. */

export type Setting = "community" | "school" | "facility" | "clinic";
export interface PolicyFilter {
  service: VaServiceId | "all";
  age: Exclude<AgeGroup, "all"> | "all";
  payer: PayerId | "all";
  coverage: CoverageType | "all";
  /** Demo minutes of the date the rules are read for. */
  date: number;
  version: PolicyVersionId | "all";
  setting: Setting | "all";
}

export interface OrgRule {
  id: string;
  services: VaServiceId[] | "all";
  payers?: PayerId[];
  kind: ReqKind;
  label: string;
  detail: string;
  addedBy: string;
  addedAt: number;
}

const inWindow = (r: PolicyRule, date: number) => (!r.from || date >= vaDate(r.from)) && (!r.to || date <= vaDate(r.to));

/** The DMAS rows that match the filters. A service's start or end applies whatever the date, as in requirementsFor(). */
export function matchRules(f: PolicyFilter): PolicyRule[] {
  const cov = f.payer !== "all" ? coverageOf(f.payer) : f.coverage;
  return POLICY_RULES.filter((r) => {
    if (f.service !== "all" && r.services !== "all" && !r.services.includes(f.service)) return false;
    if (f.age !== "all" && r.ages && !r.ages.includes(f.age)) return false;
    if (cov !== "all" && r.coverage && !r.coverage.includes(cov)) return false;
    if (f.payer !== "all" && r.payers && !r.payers.includes(f.payer)) return false;
    if (f.setting !== "all" && r.setting && !r.setting.includes(f.setting) && !r.setting.includes("any")) return false;
    if (f.version !== "all" && r.version !== f.version) return false;
    return r.kind === "service_window" || inWindow(r, f.date);
  });
}

/** The assessment configuration rows (data/assess/rules.ts) that match the same filters: service (through the programs that stand for it), plan, age group and date. */
export function matchAssessmentRules(f: PolicyFilter): AssessmentRule[] {
  const programs = f.service === "all" ? null : PROGRAMS_V2.filter((p) => p.serviceId === f.service).map((p) => p.id);
  return RULES.filter((r) => {
    if (programs && r.programs !== "all" && !programs.some((id) => (r.programs as ProgramId[]).includes(id))) return false;
    if (f.payer !== "all" && r.payers && !r.payers.some((p) => p === f.payer)) return false;
    if (f.age !== "all" && r.populations && !r.populations.some((p) => (f.age === "adult" ? p === "adult" : p !== "adult"))) return false;
    return !r.to || f.date <= vaDate(r.to);
  });
}

export const orgRulesFor = (rules: OrgRule[], serviceId: VaServiceId | "all", payerId: PayerId | "all" | null): OrgRule[] =>
  rules.filter((r) => (serviceId === "all" || r.services === "all" || r.services.includes(serviceId)) && (!r.payers || payerId === "all" || (!!payerId && r.payers.includes(payerId))));

export const KIND_LABEL: Record<ReqKind, string> = {
  authorization: "Authorization", registration: "Registration", none: "No authorization", assessment: "Assessment", level_of_need: "Level of Need",
  channel: "Where to send", service_window: "Service dates", pending: "Pending",
};
export const ORG_RULE_LABEL = "Organization rule, unverified";
