import type { BuiltInPayerId } from "../types";

/* Virginia Medicaid plans. Cardinal Care is Virginia's Medicaid managed care program; its five managed care organizations (MCOs) are listed in the
   Psyflo Virginia one-pager (Fall 2026, from DMAS bulletins). Acentra Health reviews fee-for-service authorizations, which since August 3, 2026
   go through Atrezzo Next Generation in the DMAS Medicaid Enterprise System (MES) portal. Humana joined Cardinal Care and Molina left on July 1, 2025.
   The demo keeps its internal payer ids; only names and descriptions are Virginia's. Every figure the demo shows about a plan is illustrative. */

export interface VaPlan {
  payerId: BuiltInPayerId;
  name: string;
  short: string;
  coverage: "mco" | "ffs";
  reviewer: string;
  channel: string;
}

export const VA_PLANS: VaPlan[] = [
  { payerId: "cardinal", name: "Anthem HealthKeepers Plus", short: "Anthem", coverage: "mco", reviewer: "Anthem HealthKeepers Plus", channel: "Plan provider portal" },
  { payerId: "summit", name: "Sentara Community Plan", short: "Sentara", coverage: "mco", reviewer: "Sentara Community Plan", channel: "Plan provider portal" },
  { payerId: "evergreen", name: "Aetna Better Health of Virginia", short: "Aetna", coverage: "mco", reviewer: "Aetna Better Health of Virginia", channel: "Plan provider portal" },
  { payerId: "harborview", name: "Humana Healthy Horizons in Virginia", short: "Humana", coverage: "mco", reviewer: "Humana Healthy Horizons in Virginia", channel: "Plan provider portal" },
  { payerId: "lakeshore", name: "UnitedHealthcare Community Plan", short: "UnitedHealthcare", coverage: "mco", reviewer: "UnitedHealthcare Community Plan", channel: "Plan provider portal" },
  { payerId: "beacon", name: "Virginia Medicaid fee-for-service", short: "Medicaid FFS", coverage: "ffs", reviewer: "Acentra Health", channel: "Atrezzo Next Generation in the DMAS MES portal" },
];

export const vaPlanOf = (payerId: string): VaPlan | undefined => VA_PLANS.find((p) => p.payerId === payerId);
export const PROGRAM_NAME = "Cardinal Care";
