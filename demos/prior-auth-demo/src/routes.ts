/* Every link in the app goes through here, so modules never hard-code each other's URLs. */
export const paths = {
  dashboard: (q?: { request?: string; payer?: string; stage?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  },
  referrals: () => "/referrals",
  referral: (id: string) => `/referrals/${id}`,
  authorizations: () => "/authorizations",
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  /** New case. `draft` resumes a case being prepared. `referral` pre-fills from a referral. */
  newCase: (o?: { draft?: string; referral?: string }) => {
    if (o?.draft) return `/authorizations/new/${o.draft}`;
    return `/authorizations/new${o?.referral ? `?referral=${o.referral}` : ""}`;
  },
  eligibility: () => "/authorizations/eligibility",
  eligibilityVerify: (q?: { referral?: string; case?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/authorizations/eligibility/verify${s ? `?${s}` : ""}`;
  },
  eligibilityResult: (id: string) => `/authorizations/eligibility/${id}`,
  denials: (id?: string) => (id ? `/denials?id=${id}` : "/denials"),
  brief: (id: string) => `/denials/${id}/brief`,
  active: () => "/active",
  manager: (tab?: "ledger" | "reviews") => `/manager${tab ? `?tab=${tab}` : ""}`,
  analytics: () => "/analytics",
  emr: () => "/emr",
  payers: (id?: string, tab?: "process" | "rules" | "documents" | "changes") =>
    `/payers${id ? `/${id}` : ""}${tab ? `?tab=${tab}` : ""}`,
  settings: () => "/settings",
};
