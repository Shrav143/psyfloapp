/* Every link in the app goes through here, so modules never hard-code each other's URLs. */
export const paths = {
  dashboard: (q?: { request?: string; payer?: string; stage?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  },
  /** Referrals have no list of their own: the first step of New case is the referral checklist. */
  referrals: () => "/authorizations/new",
  /** One referral, opened from New case. `draft` is the case it was opened from, so Continue returns to it. */
  referral: (id: string, draft?: string) => `/authorizations/new/referral/${id}${draft ? `?draft=${draft}` : ""}`,
  authorizations: () => "/authorizations",
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  /** New case. `draft` resumes a case being prepared. `referral` pre-fills from a referral. */
  newCase: (o?: { draft?: string; referral?: string; /** A stored verification (VerificationRecord id) to carry into step 2. */ verification?: string; /** Authorization type: initial, concurrent, reauth, modify or retro. */ type?: string; /** A patient's case id, to start from an existing patient. */ patient?: string }) => {
    const q = new URLSearchParams();
    if (o?.referral) q.set("referral", o.referral);
    if (o?.verification) q.set("verification", o.verification);
    if (o?.type) q.set("type", o.type);
    if (o?.patient) q.set("patient", o.patient);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return o?.draft ? `/authorizations/new/${o.draft}${qs}` : `/authorizations/new${qs}`;
  },
  eligibility: () => "/authorizations/eligibility",
  eligibilityVerify: (q?: { referral?: string; case?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/authorizations/eligibility/verify${s ? `?${s}` : ""}`;
  },
  eligibilityResult: (id: string) => `/authorizations/eligibility/${id}`,
  /** `payer` and `reason` narrow the open-denials list (Analytics rows link here). */
  denials: (id?: string, filter?: { payer?: string; reason?: string }) => {
    const s = new URLSearchParams({ ...(id ? { id } : {}), ...(filter?.payer ? { payer: filter.payer } : {}), ...(filter?.reason ? { reason: filter.reason } : {}) }).toString();
    return `/denials${s ? `?${s}` : ""}`;
  },
  brief: (id: string) => `/denials/${id}/brief`,
  /** The appeal analysis report for one denial. */
  report: (id: string) => `/denials/${id}/report`,
  manager: (tab?: "cases" | "reviews") => `/manager${tab ? `?tab=${tab}` : ""}`,
  analytics: () => "/analytics",
  emr: () => "/emr",
  payers: (id?: string, tab?: "process" | "rules" | "documents" | "changes") =>
    `/payers${id ? `/${id}` : ""}${tab ? `?tab=${tab}` : ""}`,
  settings: () => "/settings",
};
