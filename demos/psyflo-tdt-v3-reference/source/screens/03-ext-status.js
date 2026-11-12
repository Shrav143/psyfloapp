/* The extension's Case status view (rounds 9–12) is folded into the Overview roster in round 13 (src/screens/63b-ext-overview.js):
   the same caseload (PSY.caseload: DSS their assigned patients, LCS their own, admin everyone), the same statuses (PSY.auth, PSY.alerts),
   now with the documentation due today, a 7-step stepper (Referral → Admission Screening → CNA → ISP → Initial SRA → Sessions →
   Concurrent SRA) and one-tap Open in Lauris / Scribe / Scan & Enhance. The list views are 'overview' and 'today'; older callers that ask
   for 'cases' or 'status' get the Overview (PSY.ext.setView / PSY.ext.tab), and PSY.ext.casesPane / statusPane draw it. */
(function () {
  const PSY = window.PSY; const X = PSY && PSY.ext; if (!X) return;
  X.casesPane = (o) => (X.overviewPane ? X.overviewPane(o) : '');
  X.statusPane = X.casesPane;
})();
