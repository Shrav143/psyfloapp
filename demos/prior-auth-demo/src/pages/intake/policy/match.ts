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

export const orgRulesFor = (rules: OrgRule[], serviceId: VaServiceId | "all", payerId: PayerId | "all" | null): OrgRule[] =>
  rules.filter((r) => (serviceId === "all" || r.services === "all" || r.services.includes(serviceId)) && (!r.payers || payerId === "all" || (!!payerId && r.payers.includes(payerId))));

export const KIND_LABEL: Record<ReqKind, string> = {
  authorization: "Authorization", registration: "Registration", none: "No authorization", assessment: "Assessment", level_of_need: "Level of Need",
  channel: "Where to send", service_window: "Service dates", pending: "Pending",
};
export const ORG_RULE_LABEL = "Organization rule, unverified";
