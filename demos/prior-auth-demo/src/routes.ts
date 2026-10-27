/* Every link in the app goes through here, so modules never hard-code each other's URLs. */

/** The four views inside a payer: Workflow Builder, Rules & Instructions, Test Workflow, History & Changes. */
export type PayerTabId = "builder" | "rules" | "test" | "history";
/** The ids of the earlier Process, Documents and Changes tabs. Links that still use them keep working. */
export type LegacyPayerTabId = "process" | "documents" | "changes";

export const paths = {
  dashboard: (q?: { request?: string; payer?: string; stage?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  },
  /** Referrals have no list of their own: the first step of New Case is the referral checklist. */
  referrals: () => "/authorizations/new",
  /** The Referrals tab: every incoming referral, and one referral opened from it. */
  referralInbox: () => "/referrals",
  inboxReferral: (id: string) => `/referrals/${id}`,
  /** One referral, opened from New Case. `draft` is the case it was opened from, so Continue returns to it. */
  referral: (id: string, draft?: string) => `/authorizations/new/referral/${id}${draft ? `?draft=${draft}` : ""}`,
  /** The one Authorizations workspace. `view` is one of all, attention, progress, payer, approved, denied or reviews. */
  authorizations: (view?: "all" | "attention" | "progress" | "payer" | "approved" | "denied" | "reviews") => `/authorizations${view ? `?view=${view}` : ""}`,
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  /** New Case. `draft` resumes a case being prepared. `referral` pre-fills from a referral. */
  newCase: (o?: { draft?: string; referral?: string; /** A stored verification (VerificationRecord id) to carry into step 2. */ verification?: string; /** Authorization type: initial, concurrent, reauth, modify or retro. */ type?: string; /** A patient's case id, to start from an existing patient. */ patient?: string; /** A step to open: intake, eligibility, documentation or review. preparation (and the older agents) opens Clinical documentation at the agents' section; the older referral and records names work too. */ step?: string }) => {
    const q = new URLSearchParams();
    if (o?.referral) q.set("referral", o.referral);
    if (o?.verification) q.set("verification", o.verification);
    if (o?.type) q.set("type", o.type);
    if (o?.patient) q.set("patient", o.patient);
    if (o?.step) q.set("step", o.step);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return o?.draft ? `/authorizations/new/${o.draft}${qs}` : `/authorizations/new${qs}`;
  },
  /** Intake: the queue, or (view transition) the July 2027 transition view. `q` searches, `service` narrows to one Virginia service. */
  intake: (o?: { view?: "transition"; q?: string; service?: string }) => {
    const q = new URLSearchParams();
    if (o?.view) q.set("view", o.view);
    if (o?.q) q.set("q", o.q);
    if (o?.service) q.set("service", o.service);
    const qs = q.toString();
    return `/authorizations/intake${qs ? `?${qs}` : ""}`;
  },
  /** One intake record. `section` is referral, profile, coverage, assessment, cans, pathway or review; `panel` opens scribe or voice. */
  intakeRecord: (id: string, section?: string, panel?: "scribe" | "voice") => {
    const q = new URLSearchParams();
    if (section) q.set("section", section);
    if (panel) q.set("panel", panel);
    const qs = q.toString();
    return `/authorizations/intake/${id}${qs ? `?${qs}` : ""}`;
  },
  eligibility: () => "/authorizations/eligibility",
  eligibilityVerify: (q?: { referral?: string; case?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/authorizations/eligibility/verify${s ? `?${s}` : ""}`;
  },
  eligibilityResult: (id: string) => `/authorizations/eligibility/${id}`,
  /** No id: the dashboard of open denials, where `payer` and `reason` narrow the table (Analytics rows link here). An id: that denial's page. */
  denials: (id?: string, filter?: { payer?: string; reason?: string }) => {
    const s = new URLSearchParams({ ...(filter?.payer ? { payer: filter.payer } : {}), ...(filter?.reason ? { reason: filter.reason } : {}) }).toString();
    return `/denials${id ? `/${encodeURIComponent(id)}` : ""}${s ? `?${s}` : ""}`;
  },
  brief: (id: string) => `/denials/${id}/brief`,
  /** The appeal analysis report for one denial. */
  report: (id: string) => `/denials/${id}/report`,
  /** Case Manager is part of Authorizations now. The old tabs open the matching view: Active cases is All (callers add &show=active or &show=renewal), Reviews this week is its view. /manager links still redirect. */
  manager: (tab?: "cases" | "reviews") => (tab === "reviews" ? "/authorizations?view=reviews" : tab === "cases" ? "/authorizations?view=all" : "/authorizations"),
  analytics: () => "/analytics",
  emr: () => "/emr",
  /** The landing page (no id) or one payer's workspace. `tab` is one of the four views; the older ids still open the matching view
      (process: builder, documents: rules with the Clinical documentation group open, changes: history). `group` opens one Rules & Instructions group. */
  payers: (id?: string, tab?: PayerTabId | LegacyPayerTabId, group?: string) => {
    const q = new URLSearchParams();
    if (tab) q.set("tab", tab);
    if (group) q.set("group", group);
    const qs = q.toString();
    return `/payers${id ? `/${id}` : ""}${qs ? `?${qs}` : ""}`;
  },
  settings: () => "/settings",
};
