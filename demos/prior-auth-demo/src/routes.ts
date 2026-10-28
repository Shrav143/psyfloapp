/* Every link in the app goes through here, so modules never hard-code each other's URLs. */

/** The four views inside a payer: Workflow Builder, Rules & Instructions, Test Workflow, History & Changes. */
export type PayerTabId = "builder" | "rules" | "test" | "history";
/** The ids of the earlier Process, Documents and Changes tabs. Links that still use them keep working. */
export type LegacyPayerTabId = "process" | "documents" | "changes";

/** The intake record made from a legacy referral: RF-2049 became IN-2049. */
export const intakeIdForReferral = (rfId: string): string => `IN-${rfId.replace(/^RF-/, "")}`;

export const paths = {
  dashboard: (q?: { request?: string; payer?: string; stage?: string }) => {
    const s = new URLSearchParams(q as Record<string, string> | undefined).toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  },
  /** The Referral Queue, the landing page of Referrals & Intake. */
  referrals: () => "/intake",
  /** A referral is the first status of an intake: its page is the intake record made from it (IN-<number> for RF-<number>). */
  referral: (id: string, _draft?: string) => `/intake/${intakeIdForReferral(id)}`,
  /** The Referrals & Intake pages: Referral Queue, Active Intakes, Assessments, Care Coordination. */
  referralQueue: () => "/intake",
  activeIntakes: () => "/intake/active",
  assessments: () => "/intake/assessments",
  coordination: () => "/intake/coordination",
  /** Create Referral: the four ways in (upload documents, EMR, manual entry, voice-assisted). */
  createReferral: (method?: "upload" | "emr" | "manual" | "voice" | "screenshot") => `/intake/new${method ? `?method=${method}` : ""}`,
  /** New Clinical Intake: choose or create the patient (and, for a continuing purpose, the treatment episode), then configure. */
  newIntake: (o?: { patient?: string; purpose?: string }) => {
    const q = new URLSearchParams();
    if (o?.patient) q.set("patient", o.patient);
    if (o?.purpose) q.set("purpose", o.purpose);
    return `/intake/start${q.toString() ? `?${q.toString()}` : ""}`;
  },
  /** The configuration wizard of an intake: purpose, program, population and setting, then the assessment plan. */
  configure: (id: string, step?: "purpose" | "program" | "population" | "plan") => `/intake/${id}/configure${step ? `?step=${step}` : ""}`,
  pendingReviews: () => "/authorizations?view=reviews",
  renewals: () => "/authorizations?show=renewal",
  /** The one Authorizations workspace. `view` is one of all, attention, progress, payer, approved, denied or reviews. */
  authorizations: (view?: "all" | "attention" | "progress" | "payer" | "approved" | "denied" | "reviews") => `/authorizations${view ? `?view=${view}` : ""}`,
  case: (id: string, tab?: "actions" | "picture" | "criteria" | "risk" | "draft") => `/authorizations/case/${id}${tab ? `?tab=${tab}` : ""}`,
  /** New Authorization (it was called New Authorization). `draft` resumes a request being prepared. `intake` prepares it from a completed intake (the shared patient record); `episode` names the treatment episode. */
  newCase: (o?: { draft?: string; intake?: string; episode?: string; referral?: string; /** A stored verification (VerificationRecord id) to carry into step 2. */ verification?: string; /** Authorization type: initial, concurrent, reauth, modify or retro. */ type?: string; /** A patient's case id, to start from an existing patient. */ patient?: string; /** A step to open: intake, eligibility, documentation or review. preparation (and the older agents) opens Clinical documentation at the agents' section; the older referral and records names work too. */ step?: string }) => {
    const q = new URLSearchParams();
    if (o?.intake) q.set("intake", o.intake);
    if (o?.episode) q.set("episode", o.episode);
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
    return `/intake${qs ? `?${qs}` : ""}`;
  },
  /** One intake record. `section` is overview, referral, patient, clinical, m:<module> (an instrument), signoff, care, documents or activity (the older referral, profile, coverage, assessment, cans, pathway and review still work); `panel` opens scribe or voice. */
  intakeRecord: (id: string, section?: string, panel?: "scribe" | "voice") => {
    const q = new URLSearchParams();
    if (section) q.set("section", section);
    if (panel) q.set("panel", panel);
    const qs = q.toString();
    return `/intake/${id}${qs ? `?${qs}` : ""}`;
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
