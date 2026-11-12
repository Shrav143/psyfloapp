/* Round 5 shared data: authorization details per case, unit rules per service, payer requirements (with their
   sources), eligibility records, and the dispute queue (authorization issues + illustrative claims issues).
   Everything about the children is fictional (initials only). Payer requirements carry their source: only what
   Harvest's DMAS documents state is marked as published policy; everything else is a Harvest observation or
   "verification needed". No reimbursement rates are stored here: rates are configured by the user in Settings. */
(function () {
  const PSY = window.PSY;
  const R5 = (PSY.data.r5 = PSY.data.r5 || {});

  /* ---------------- services and how they count units (configurable per service and payer) ---------------- */
  R5.services = {
    tdt: { key: 'tdt', label: 'Therapeutic Day Treatment (TDT) · school day', short: 'TDT', code: 'H2016', unit: 'unit', units: 'units', per: 'day',
      rule: '1 unit = 2–2.99 hours a day · 2 units = 3–4.99 hours · 3 units = 5+ hours', ruleId: 'tdt-units' },
    'tdt-ug': { key: 'tdt-ug', label: 'Therapeutic Day Treatment (TDT) · after school', short: 'TDT after school', code: 'H2016-UG', unit: 'unit', units: 'units', per: 'day',
      rule: '1 unit = 2–2.99 hours a day · 2 units = 3–4.99 hours · 3 units = 5+ hours', ruleId: 'tdt-units' },
    op: { key: 'op', label: 'Outpatient psychotherapy', short: 'Outpatient', code: '', unit: 'session', units: 'sessions', per: 'visit',
      rule: 'Counted in sessions. Payer-specific session rules are not on file.', ruleId: 'op-units' },
  };
  /* payer overrides of the unit rule (none are known; the DMAS definition applies to every Medicaid MCO, Ch. IV pp. 1–2) */
  R5.unitOverrides = {};

  /* ---------------- per-case authorization details (joins Lauris, the extension and the platform) ----------------
     kind: initial | continued · service: key of R5.services · current: the authorization in force (Lauris) ·
     request: what is asked for now · decision: the payer's decision as recorded in the demo data */
  R5.auth = {
    'R-0416': { laurisId: '4492', kind: 'initial', service: 'tdt', ref: 'REQ-0416', request: { units: 150, period: 'Oct 27 – Jan 23', hours: '15 h a week' }, current: null },
    'R-0411': { laurisId: '4471', kind: 'continued', service: 'tdt', ref: 'AUTH-4471-B', request: { units: 150, period: 'Nov 16 – Feb 13', hours: '15 h a week' },
      current: { authorized: 110, remaining: 27, start: 'Aug 18', end: 'Nov 13', perDay: 3 } },
    'R-0408': { laurisId: '4466', kind: 'initial', service: 'tdt', ref: 'REQ-0408', request: { units: 150, period: 'Oct 26 – Jan 22' }, current: null,
      decision: { type: 'info', date: 'Oct 28, 5:40 pm', by: 'Anthem HealthKeepers Plus', via: 'Availity message', due: 'Oct 29, 5:40 pm', dueSrc: 'Stated in Anthem’s Availity message (reply within 24 hours)',
        said: 'Anthem asked three questions about the initial SRA on Availity.' } },
    'R-0402': { laurisId: '4458', kind: 'continued', service: 'tdt', ref: 'AUTH-4458-C', request: { units: 150, period: 'Nov 9 – Feb 5' },
      current: { authorized: 90, remaining: 18, start: 'Aug 18', end: 'Nov 6', perDay: 3 },
      decision: { type: 'reduction', date: 'Oct 27', by: 'Sentara Community Plan', via: 'Phone call (call log by the site supervisor)', approved: 120, due: 'Oct 30', dueSrc: 'Reply date given by Sentara on the Oct 27 call (call log)',
        said: '“No way you’re spending 5+ hours with these kids.”' } },
    'R-0399': { laurisId: '4455', kind: 'initial', service: 'tdt', ref: 'REQ-0399', request: { units: 150, period: 'Oct 19 – Jan 15' }, current: null, submitted: { date: 'Oct 19', via: 'Sfax', ref: 'F-2291' } },
    'R-0391': { laurisId: '4449', kind: 'initial', service: 'tdt', ref: 'REQ-0391', request: { units: 150, period: 'Oct 26 – Jan 22' }, current: null, prior: { authorized: 80, note: 'used in 7 weeks' },
      decision: { type: 'reduction', date: 'Oct 29', by: 'Aetna Better Health of Virginia', via: 'Phone call (call log)', approved: 110, due: 'Nov 2', dueSrc: 'Reply date given by Aetna on the Oct 29 call (call log)',
        said: '“Can be addressed in outpatient.”' } },
    'R-0388': { laurisId: '4441', kind: 'continued', service: 'tdt', ref: 'AUTH-4441-A', request: { units: 150, period: 'Oct 5 – Jan 1' },
      current: { authorized: 65, remaining: 9, start: 'Oct 5', end: 'Nov 20', perDay: 3 },
      decision: { type: 'partial', date: 'Oct 27', by: 'Sentara Community Plan', via: 'Authorization decision and phone call', approved: 65, due: 'Dec 9, 2:00 pm', dueSrc: 'Peer-to-peer slot offered by Sentara on Oct 27 (call log)',
        said: '“Can be addressed through the IEP.” · “No way you’re spending 5+ hours with these kids.”' } },
    'R-0384': { laurisId: '4437', kind: 'initial', service: 'tdt', ref: 'REQ-0384', request: { units: 90, period: 'Oct 12 – Jan 9' }, current: null,
      decision: { type: 'denial', date: 'Oct 22', by: 'Anthem HealthKeepers Plus', via: 'Denial letter (Availity)', approved: 0, due: 'Dec 21', dueSrc: '60 calendar days from the date on the notice (42 CFR 438.402(c)(2)(ii)). Confirm against the date printed on Anthem’s letter.',
        said: '“Already connected to other services.”' } },
    'R-0395': { laurisId: '4430', kind: 'continued', service: 'tdt', ref: 'AUTH-4430-D', request: { units: 150, period: 'Nov 6 – Feb 2' },
      current: { authorized: 80, remaining: 14, start: 'Aug 10', end: 'Nov 5', perDay: 3 } },
    'R-0380': { laurisId: '4426', kind: 'continued', service: 'tdt-ug', ref: 'AUTH-4426-A', request: { units: 60, period: 'Dec 9 – Mar 8' },
      current: { authorized: 60, remaining: 38, start: 'Sep 8', end: 'Dec 8', perDay: 1 } },
    'R-0377': { laurisId: '4419', kind: 'continued', service: 'op', ref: 'AUTH-4419-A', request: { units: 24, period: 'Dec 16 – Jun 15' },
      current: { authorized: 24, remaining: 19, start: 'Aug 17', end: 'Dec 15', perDay: 0 } },
  };

  /* earlier events for cases whose hub history starts at the decision (fictional, consistent with the request period) */
  R5.timelinePrefix = {
    'R-0388': [
      { t: 'Sep 28', text: 'Concurrent SRA drafted by Psyflo from the daily notes since the last authorization.' },
      { t: 'Sep 29', text: 'Signed by J. Perez, LPC in Lauris Forms to Approve.' },
      { t: 'Sep 29', text: 'Sent to Sentara by Sfax (ref F-2240): 150 units, Oct 5 – Jan 1.' },
      { t: 'Oct 9', text: 'Receipt confirmed by phone on day 10.' },
    ],
  };

  /* ---------------- payer requirements ----------------
     kind: policy (published payer or state policy, regulation) · documented (a form or written requirement) ·
           observed (what Harvest reported or the demo records show; not a written rule) · unverified (needs verification)
     Every rule names its source. "Verified" means checked against the document named, in Harvest's Drive folder. */
  const CH4 = 'DMAS Mental Health Services Manual, Chapter IV';
  const VER = 'Checked against Harvest’s Drive copy · Oct 30, 2026';
  const HAR = 'Harvest site visit, Oct 29, 2026 (recorded)';
  R5.rules = [
    { id: 'tdt-all3', area: 'Medical necessity', service: 'tdt', payers: '*', kind: 'policy', text: 'The child must meet all three criteria groups: diagnostic, clinical necessity and level of care.', source: CH4 + ', p. 35', verified: VER },
    { id: 'tdt-dx', area: 'Medical necessity', service: 'tdt', payers: '*', kind: 'policy', text: 'The diagnosis, made by an LMHP-type clinician, is the primary clinical issue the service treats.', source: CH4 + ', p. 35; 12VAC30-50-130 C', verified: VER },
    { id: 'tdt-clin2', area: 'Medical necessity', service: 'tdt', payers: '*', kind: 'policy', text: 'Clinical necessity: at least two of the three listed criteria.', source: CH4 + ', p. 35', verified: VER },
    { id: 'tdt-loc1', area: 'Medical necessity', service: 'tdt', payers: '*', kind: 'policy', text: 'Level of care: at least one of the five listed criteria.', source: CH4 + ', pp. 35–36', verified: VER },
    { id: 'tdt-failed', area: 'Medical necessity', service: 'tdt', payers: '*', kind: 'policy', text: '“Failed services” means the service did not treat or resolve the issues, measured by ongoing distress.', source: CH4 + ', p. 6', verified: VER },
    { id: 'tdt-2h', area: 'Service', service: 'tdt', payers: '*', kind: 'policy', text: 'TDT is provided two or more hours a day.', source: CH4 + ', p. 34; 12VAC30-50-130 C.3', verified: VER },
    { id: 'tdt-units', area: 'Units', service: 'tdt', payers: '*', kind: 'policy', text: 'Units per day: 1 unit = 2–2.99 hours, 2 units = 3–4.99 hours, 3 units = 5 or more hours.', source: CH4 + ', p. 39; 12VAC30-80 A.3.c', verified: VER },
    { id: 'mco-floor', area: 'Service', service: '*', payers: '*', kind: 'policy', text: 'MCOs must apply the DMAS service authorization criteria; MCO limits may not be lower than fee-for-service limits.', source: CH4 + ', pp. 1–2', verified: VER },
    { id: 'sa-required', area: 'Authorization', service: 'tdt', payers: '*', kind: 'policy', text: 'Service authorization is required for Medicaid reimbursement. It does not guarantee payment.', source: '12VAC30-50-130 C.3.a; ' + CH4 + ', p. 9', verified: VER },
    { id: 'coord', area: 'Documentation', service: 'tdt', payers: '*', kind: 'policy', text: 'Every request explains the care coordination that has taken place, and the plan for step-down.', source: CH4 + ', p. 37', verified: VER },
    { id: 'cna-31', area: 'Documentation', service: 'tdt', payers: '*', kind: 'policy', text: 'A CNA is outdated after 31 calendar days with no service.', source: CH4 + ', p. 19', verified: VER },
    { id: 'isp-30', area: 'Documentation', service: 'tdt', payers: '*', kind: 'policy', text: 'The ISP is completed and signed within 30 calendar days of starting services.', source: CH4 + ', pp. 22, 36', verified: VER },
    { id: 'isp-90', area: 'Documentation', service: 'tdt', payers: '*', kind: 'policy', text: 'ISP review every 90 calendar days, with the guardian’s signature, documented within 15 days.', source: CH4 + ', pp. 23, 37', verified: VER },
    { id: 'form-init', area: 'Form', service: 'tdt', payers: '*', kind: 'documented', text: 'Initial SRA on the DMAS TDT (H2016) Initial Service Authorization Request form: member and provider, request, Sections I–V, attestation.', source: 'DMAS TDT (H2016) Initial SRA form, July 2021', verified: VER },
    { id: 'form-cs', area: 'Form', service: 'tdt', payers: '*', kind: 'documented', text: 'Concurrent SRA on the DMAS CMHRS Continued Stay Service Authorization Request form.', source: 'DMAS CMHRS Continued Stay SRA form, Dec 2021', verified: VER },
    { id: 'sig', area: 'Form', service: '*', payers: '*', kind: 'documented', text: 'Signed (actual or electronic signature) by an LMHP, LMHP-R, LMHP-S or LMHP-RP.', source: 'DMAS Initial SRA form p. 7; Concurrent SRA form p. 5', verified: VER },
    { id: 'turnaround', area: 'Deadlines', service: '*', payers: '*', kind: 'unverified', text: 'Standard authorization decisions within 7 calendar days (federal rule in effect Jan 1, 2026).', source: 'CMS Interoperability and SRA Final Rule (CMS-0057-F). How each Virginia MCO applies it is not verified here.', verified: null },
    { id: 'appeal-60', area: 'Deadlines', service: '*', payers: '*', kind: 'policy', text: 'A member appeal is filed within 60 calendar days of the date on the adverse benefit determination notice.', source: '42 CFR 438.402(c)(2)(ii). Confirm the date printed on each notice.', verified: null },
    { id: 'p2p-process', area: 'Disputes', service: '*', payers: '*', kind: 'unverified', text: 'Peer-to-peer review: availability, who may call and the time limit are set by each MCO.', source: 'Not in Harvest’s documents. Payer requirement verification needed.', verified: null },
    { id: 'recon-process', area: 'Disputes', service: '*', payers: '*', kind: 'unverified', text: 'Reconsideration (before a formal appeal): whether it is offered and its time limit are set by each MCO.', source: 'Not in Harvest’s documents. Payer requirement verification needed.', verified: null },
    { id: 'info-24h', area: 'Deadlines', service: 'tdt', payers: '*', kind: 'observed', text: 'Requests for more information are answered within 24 hours, by clinical staff.', source: 'Harvest-reported (' + HAR + '). Each request states its own deadline; that wins.', verified: null },
    { id: 'init-30', area: 'Deadlines', service: 'tdt', payers: '*', kind: 'observed', text: 'The initial SRA goes in within 30 days of the intake.', source: 'Harvest-reported (' + HAR + '). Not found in the TDT section of Chapter IV.', verified: null },
    { id: 'day10', area: 'Submission', service: '*', payers: '*', kind: 'observed', text: 'Harvest calls the payer on day 10 to confirm the fax was received.', source: 'Harvest practice (' + HAR + ')', verified: null },
    { id: 'p2p-wait', area: 'Disputes', service: 'tdt', payers: ['sentara'], kind: 'observed', text: 'Peer-to-peer slots have been offered 1–2 months out, often after units run out.', source: 'Harvest-reported (' + HAR + ')', verified: null },
    { id: 'guardian-appeal', area: 'Disputes', service: '*', payers: '*', kind: 'observed', text: 'Harvest’s experience: formal appeals are filed by the guardian.', source: 'Harvest-reported (' + HAR + '). Federal rules also allow a provider to appeal with the member’s written consent (42 CFR 438.402(c)(1)(ii)).', verified: null },
    { id: 'partial-common', area: 'Decisions', service: 'tdt', payers: '*', kind: 'observed', text: 'Most of Harvest’s requests come back as partial approvals.', source: 'Harvest-reported (' + HAR + ')', verified: null },
    { id: 'mco-docs', area: 'Documentation', service: 'tdt', payers: ['sentara', 'anthem', 'aetna', 'humana', 'uhc'], kind: 'unverified', text: 'Plan-specific documentation requirements beyond the DMAS form.', source: 'Payer requirement verification needed. No plan-specific policy is on file.', verified: null },
  ];
  /* submission channels: Harvest's current practice per payer (observed), never assumed to be the same for every payer */
  R5.channels = {
    sentara: { method: 'Sfax', label: 'Fax via Sfax', kind: 'observed', source: 'Harvest practice (' + HAR + ')' },
    anthem: { method: 'Availity', label: 'Availity portal', kind: 'observed', source: 'Harvest practice (' + HAR + ')' },
    aetna: { method: 'Sfax', label: 'Fax via Sfax', kind: 'observed', source: 'Harvest practice (' + HAR + ')' },
    humana: { method: 'Sfax', label: 'Fax via Sfax', kind: 'observed', source: 'Harvest practice (' + HAR + ')' },
    uhc: { method: 'UHC portal', label: 'UnitedHealthcare provider portal', kind: 'observed', source: 'Harvest practice (' + HAR + ')' },
    ffs: { method: 'Sfax', label: 'Fax via Sfax (Acentra Health)', kind: 'unverified', source: 'Payer requirement verification needed' },
  };

  /* ---------------- eligibility (is coverage active?) vs benefits (is TDT covered, and what is required?) ----------------
     Simulated background checks. Eligibility never proves a service is covered or authorized. */
  const ACT = (plan, since) => ({ status: 'Active', plan, since, checked: 'Oct 29, 6:00 am' });
  R5.elig = {
    '4492': Object.assign(ACT('Humana Healthy Horizons in Virginia', 'Oct 1, 2026'), { change: { from: 'Anthem HealthKeepers Plus', fromEnded: 'Sep 30, 2026', to: 'Humana Healthy Horizons in Virginia', noted: 'Oct 29, 6:00 am', referralSaid: 'Anthem HealthKeepers Plus (on the school’s referral, Oct 13)' } }),
    '4471': ACT('Anthem HealthKeepers Plus', 'Feb 1, 2026'), '4466': ACT('Anthem HealthKeepers Plus', 'Jul 1, 2025'), '4458': ACT('Sentara Community Plan', 'Jan 1, 2025'),
    '4455': ACT('Humana Healthy Horizons in Virginia', 'Aug 1, 2026'), '4449': ACT('Aetna Better Health of Virginia', 'Mar 1, 2024'), '4441': ACT('Sentara Community Plan', 'Sep 1, 2025'),
    '4437': ACT('Anthem HealthKeepers Plus', 'Jan 1, 2026'), '4430': ACT('UnitedHealthcare Community Plan', 'Jan 1, 2026'), '4426': ACT('Humana Healthy Horizons in Virginia', 'Jun 1, 2025'),
    '4419': ACT('Aetna Better Health of Virginia', 'Jan 1, 2025'),
  };
  R5.benefits = {
    tdt: { covered: 'TDT (H2016) is a Virginia Medicaid benefit; MCOs apply the DMAS criteria.', coveredSrc: CH4 + ', pp. 1–2', auth: 'Service authorization required.', authSrc: '12VAC30-50-130 C.3.a', network: 'Network participation: verification needed', networkKind: 'unverified' },
    op: { covered: 'Outpatient psychotherapy: plan-specific rules not on file.', coveredSrc: 'Payer requirement verification needed', auth: 'Authorization rules: verification needed.', authSrc: 'Payer requirement verification needed', network: 'Network participation: verification needed', networkKind: 'unverified' },
  };

  /* ---------------- dispute queue ----------------
     group: auth | claim · issue: partial | reduction | denial | cs-denial | info | p2p | recon | appeal | claim-denial | claim-rejection | corrected | claim-recon | claim-appeal
     status: the resolution stage (not the authorization status). illustrative: true marks scenarios added for the demo. */
  R5.disputes = [
    { id: 'DI-388', group: 'auth', case: 'R-0388', issue: 'partial', primary: true, requested: 150, approved: 65, status: 'p2p', assigned: 'J. Perez, LPC', opened: 'Oct 27' },
    { id: 'DI-402', group: 'auth', case: 'R-0402', issue: 'reduction', requested: 150, approved: 120, status: 'decide', assigned: 'J. Perez, LPC', opened: 'Oct 27' },
    { id: 'DI-391', group: 'auth', case: 'R-0391', issue: 'reduction', requested: 150, approved: 110, status: 'decide', assigned: 'J. Perez, LPC', opened: 'Oct 29' },
    { id: 'DI-408', group: 'auth', case: 'R-0408', issue: 'info', requested: 150, approved: null, status: 'drafted', assigned: 'J. Perez, LPC', opened: 'Oct 28' },
    { id: 'DI-384', group: 'auth', case: 'R-0384', issue: 'denial', requested: 90, approved: 0, status: 'drafted', assigned: 'Maria Wood', opened: 'Oct 22' },
    { id: 'CL-217', group: 'claim', case: 'R-0395', issue: 'claim-denial', illustrative: true, requested: 6, approved: 0, status: 'new', assigned: 'Billing', opened: 'Oct 26',
      claim: { no: 'CLM-30417', dos: 'Aug 4 – Aug 5', billed: '6 units', code: 'CARC 197', reason: 'Precertification/authorization/notification/pre-treatment absent.', payer: 'uhc', note: 'Dates of service fall before the current authorization (starts Aug 10).' } },
    { id: 'CL-221', group: 'claim', case: 'R-0380', issue: 'claim-rejection', illustrative: true, requested: 1, approved: 0, status: 'new', assigned: 'Billing', opened: 'Oct 28',
      claim: { no: 'CLM-30522', dos: 'Oct 6', billed: '1 unit', code: 'Front-end rejection', reason: 'Subscriber ID did not match the payer’s file.', payer: 'humana', note: 'Rejected before adjudication: a corrected claim, not an appeal.' } },
  ];
})();
