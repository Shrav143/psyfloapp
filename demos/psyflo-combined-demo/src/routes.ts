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
  /** The one Authorizations workspace. `view` is one of all, attention, progress, payer, approved, denied or reviews. */
  authorizations: (view?: "all" | "attention" | "progress" | "payer" | "approved" | "denied" | "reviews") => `/authorizations${view ? `?view=${view}` : ""}`,
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  eligibility: () => "/eligibility",
  eligibilityVerify: (q?: { referral?: string; case?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/eligibility/verify${s ? `?${s}` : ""}`;
  },
  eligibilityResult: (id: string) => `/eligibility/${id}`,
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
  /** The mock Lauris EHR with the Psyflo extension docked in it: a separate app in its own browser tab. Which page it shows is kept by the extension's own store (see useOpenLauris). */
  lauris: () => "/lauris",
};
