import type { CustomPayer } from "./payerConfig";
import { planInfo } from "./payerConfigPlan";
import { PAYERS, payerById } from "./seed";
import type { PayerSummary } from "./types";

/* What a payer is, one level above its rules: the organization, the state it works in and the plan or product. Workflows and rules carry the same three,
   so a payer that runs different products in different states can have different processes. Never assume a parent organization has the same rules everywhere.
   The six demo payers are Virginia Medicaid plans. A payer added on Payers carries the values it was added with; anything left blank is read as the name, Virginia and the plan type. */

export interface PayerProfile {
  /** The payer organization. */
  org: string;
  /** Two-letter state, "VA" for every demo payer. */
  state: string;
  /** The plan or product, such as "Cardinal Care managed care (MCO)". */
  product: string;
}

export const DEFAULT_STATE = "VA";

const productOf = (p: PayerSummary): string => planInfo(p)?.label ?? p.type;

/** The profile of one payer. Pass `custom` (the store's `customPayers`) to read the values a payer was added with, and `overrides` for edits saved in the workflow store. */
export function payerProfileOf(payerId: string, custom: readonly CustomPayer[] = [], overrides: Record<string, Partial<PayerProfile>> = {}): PayerProfile {
  const added = custom.find((c) => c.id === payerId);
  const summary: PayerSummary | undefined = payerById(payerId) ?? PAYERS.find((p) => p.id === payerId);
  const base: PayerProfile = {
    org: added?.org?.trim() || added?.name || summary?.name || payerId,
    state: added?.state?.trim() || DEFAULT_STATE,
    product: added?.product?.trim() || (summary ? productOf(summary) : "") || added?.type || "",
  };
  const o = overrides[payerId];
  return o ? { org: o.org?.trim() || base.org, state: o.state?.trim() || base.state, product: o.product?.trim() || base.product } : base;
}

/** The profiles of the six built-in payers, for seeds and tests. */
export const SEED_PAYER_PROFILES = (): Record<string, PayerProfile> => Object.fromEntries(PAYERS.slice(0, 6).map((p) => [p.id, payerProfileOf(p.id)]));
