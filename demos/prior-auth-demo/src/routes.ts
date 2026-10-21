/* Every link in the app goes through here, so modules never hard-code each other's URLs. */
export const paths = {
  dashboard: (q?: { request?: string; payer?: string; stage?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  },
  /** The referral inbox is the second tab of the first step of New case. */
  referrals: () => "/authorizations/new?view=inbox",
  /** One referral, opened from New case. `draft` is the case it was opened from, so Continue returns to it. */
  referral: (id: string, draft?: string) => `/authorizations/new/referral/${id}${draft ? `?draft=${draft}` : ""}`,
  authorizations: () => "/authorizations",
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  /** New case. `draft` resumes a case being prepared. `referral` pre-fills from a referral. `view` opens a tab of the Referral step. */
  newCase: (o?: { draft?: string; referral?: string; view?: "upload" | "inbox" | "none" }) => {
    const q = new URLSearchParams();
    if (o?.referral) q.set("referral", o.referral);
    if (o?.view) q.set("view", o.view);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return o?.draft ? `/authorizations/new/${o.draft}${qs}` : `/authorizations/new${qs}`;
  },
  eligibility: () => "/authorizations/eligibility",
  eligibilityVerify: (q?: { referral?: string; case?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/authorizations/eligibility/verify${s ? `?${s}` : ""}`;
  },
  eligibilityResult: (id: string) => `/authorizations/eligibility/${id}`,
  denials: (id?: string) => (id ? `/denials?id=${id}` : "/denials"),
  brief: (id: string) => `/denials/${id}/brief`,
  manager: (tab?: "cases" | "reviews") => `/manager${tab ? `?tab=${tab}` : ""}`,
  analytics: () => "/analytics",
  emr: () => "/emr",
  payers: (id?: string, tab?: "process" | "rules" | "documents" | "changes") =>
    `/payers${id ? `/${id}` : ""}${tab ? `?tab=${tab}` : ""}`,
  settings: () => "/settings",
};
