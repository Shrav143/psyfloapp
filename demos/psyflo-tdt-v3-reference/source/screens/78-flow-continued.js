/* Concurrent SRA (Scenario 2, Part 6). Round 8: the focused-review workspace is retired; the review happens in Scan & Enhance
   (76-enhance.js) on the DMAS concurrent SRA form in Lauris. This file keeps the case content (the record excerpts the citations open)
   and the API the platform mirror uses:
   PSY.flows.continued = { title, render(caseId, f), requirements, evidence, missing, primary }   (registry in 01-core; primary opens Scan & Enhance)
   PSY.cs5 = { model, progress, unitsHtml, sectionsHtml, missingHtml, prepare, formsPending, css(scope) }   (also used by the platform mirror, 89-drafts)

   Cases: M.R. (R-0411, Anthem) has a draft prepared in the background (status Awaiting clinical review).
          S.B. (R-0395, UHC) has none yet: "Prepare Concurrent SRA" reads Lauris (≤ 1.5 s) and writes the draft.
          L.V. (R-0380, after school) and P.G. (R-0377, outpatient) show unit tracking only: nothing to prepare yet.
   Content comes only from the case data (PSY.data.hub, PSY.data.r5, PSY.data.lauris). What the record does not hold is
   marked Clinician Input Required; Psyflo may suggest headings for it, never content.

   State: PSY.state.flows5[caseId] = { accepted:{s1:{at,by}}, edits:{s5:'text'}, editing:'s5', drafts:{key:'text'}, inputs:{key:{text,at,by}},
          follow:{key:true}, retrieving, prepared:{at}, reread:{at,n}, sent:{at}, submitting, sub:{via,ref,at} }
   Statuses change only through PSY.auth.set; every meaningful action writes the audit. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY || !PSY.auth || !PSY.ev) return;
  const esc = PSY.esc; const A = PSY.auth; const EV = PSY.ev; const RU = PSY.rules;
  const ME = (PSY.r5 || {}).ME || 'J. Perez, LPC'; const SYS = (PSY.r5 || {}).SYS || 'Psyflo (system)';
  const FORM = 'CMHRS Continued Stay SRA form';
  const FORM_LONG = 'CMHRS Continued Stay Service Authorization Request';
  const DECIDED = ['partial', 'denied', 'info', 'recon', 'appeal'];
  const AFTER_SIGN = ['ready', 'submitted', 'pending', 'approved', 'closed'];

  const hub = (id) => (PSY.data.hub || {})[id] || {};
  const lcOf = (id) => (PSY.data.lauris && PSY.data.lauris.byCase ? PSY.data.lauris.byCase(id) : null);
  const cv = (id) => PSY.caseView(id) || {};
  const payerOf = (id) => PSY.data.payers[cv(id).payer] || { name: '', short: '' };
  const fsGet = (id) => ((PSY.state.flows5 || {})[id]) || {};
  const FS = (id) => { PSY.state.flows5 = PSY.state.flows5 || {}; return (PSY.state.flows5[id] = PSY.state.flows5[id] || {}); };
  const audit = (id, action, o) => { o = o || {}; PSY.audit.add({ case: id, action, by: o.by || ME, doc: o.doc || FORM, status: A.status(id) }); };
  const rule = (rid) => (RU.byId ? RU.byId(rid) : null);
  const SIM = EV.label('illustrative', 'Simulated');

  /* ------------------------------------------------------------------ dates (demo "today" is Thu, Oct 29, 2026) */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TODAY = new Date(2026, 9, 29);
  const parseD = (s) => { const m = /^([A-Z][a-z]{2}) (\d{1,2})/.exec(String(s || '')); if (!m) return null; const mo = MON.indexOf(m[1]); return mo < 0 ? null : new Date(mo >= 7 ? 2026 : 2027, mo, +m[2]); };
  const fmtD = (d) => MON[d.getMonth()] + ' ' + d.getDate();
  const lauDate = (s) => { const d = parseD(s); return d ? String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear() : s; };
  /* the n-th weekday counted from today (or from tomorrow when today's units are already counted) */
  function nthSchoolDay(n, fromTomorrow) { const d = new Date(TODAY); if (fromTomorrow) d.setDate(d.getDate() + 1); let k = 0; for (let guard = 0; guard < 400; guard++) { if (d.getDay() % 6 !== 0) { k++; if (k >= n) return d; } d.setDate(d.getDate() + 1); } return d; }
  /* the projected run-out at the current pace (Part 6.5) */
  function pace(id) {
    const u = A.units(id); const cur = u.current; if (!cur) return null;
    if (!cur.perDay) return { none: true };
    const lc = lcOf(id); const counted = !!(lc && PSY.flag('units-used.' + lc.id));
    const days = Math.ceil(cur.remaining / cur.perDay);
    if (!days) return { days: 0, out: true };
    const d = nthSchoolDay(days, counted); const end = parseD(cur.end);
    return { days, date: fmtD(d), before: !!(end && d < end), after: !!(end && d > end), counted };
  }

  /* ------------------------------------------------------------------ case content (from the case data only) */
  const CONTENT = {};
  CONTENT['R-0411'] = {
    since: 'Aug 18', notesBase: 61, last30: 21, read: 'Oct 29, 9:48 am',
    disc: { from: 'Weekly guardian contact Oct 16', text: 'The guardian reported a change in the household on Oct 16 that coincided with the Oct 21 incident; the clinical team has adjusted supports accordingly.' },
    excerpts: {
      'CNA · diagnosis': 'F90.2 Attention-deficit/hyperactivity disorder, combined type. Trauma history noted by the clinical team. No medications; the pediatrician reviewed on Oct 1 with no change.',
      'SRA AUTH-4471-B': 'Anthem HealthKeepers Plus · TDT school day (H2016) · Aug 18 – Nov 13 · 110 units authorized · 27 units available on Oct 29.',
      'Direct-hours log': 'Average 14.6 units a week since Aug 18. Oct 28: 5 h 20 of direct time (3 units).',
      'Daily note Oct 28': 'K. Hale · Left the classroom without permission twice, kicked a chair; co-regulation walk, 12 min; returned to task. Direct time 5 h 20 (3 units).',
      'Daily note Oct 21': 'K. Hale · Physical aggression toward a peer at lunch (shoved); CPI-informed de-escalation, 20 min; processed with the client using zones of regulation. Safety plan reviewed. 3 units.',
      'Daily note Oct 14': 'R. Diaz · “Observed the client during math; he stayed on task 15 of 30 min.” Psyflo flagged “observed” and suggested: “Worked with the client during math using a visual timer and prompted re-entry twice.”',
      'Daily note Oct 6': 'K. Hale · Eloped from the building to the parking lot; 1 day of in-school suspension followed. Guardian reached the same day.',
      '21 daily notes, last 30 days': 'Escalations with a taught strategy used first: 3 of 5 in the last 30 days. Staff presence was needed to return to task every school day.',
      'Notes, prior period': 'Prior period: a taught strategy was used first in 1 of 6 escalations. On-task time in math was about 10 of 30 minutes.',
      'Escalation trend (daily notes)': 'Escalations a week, counted from the daily notes: Aug 24: 6 · Sep 14: 5 · Oct 5: 4 · Oct 26: 3.',
      '23 older notes': 'Goals 2 and 3 are drafted from 23 older notes (4 and 5 footnotes). A clinician has not checked them yet.',
      'ISP Oct 22': 'Lunch and transitions now carry a named staff member and a pre-set regulation break; the safety plan was reviewed with the guardian. The ISP in Lauris has no dated amendment for this change after the Aug 11 review.',
      'ISP review Aug 11': 'Last dated review of the Individual Service Plan in Lauris. No discharge or step-down criteria are written in the plan.',
      'Monthly collateral Oct 1': 'K. Hale · School counselor: 4 office referrals in September; IEP review set for Nov 4. Pediatrician: no medication change. Earlier contacts Aug 29 and Sep 3.',
      'Weekly guardian contacts': 'The grandmother (guardian) joined 11 of 12 weekly calls since Aug 18 and practices the calm-down corner at home.',
      'Weekly guardian contact Oct 16': 'K. Hale · Reviewed home use of the calm-down corner. The guardian reported a change in the household; it is held back from the request until a clinician decides.',
      'IEP review Nov 4 (School)': 'The IEP review is set for Nov 4 at Harvest’s request. The minutes are not in Lauris yet.',
    },
    evidence: [
      { cat: 'Progress notes', kind: 'ehr', text: (n) => n + ' daily notes since Aug 18 were read in Lauris; 21 are from the last 30 days.', cites: ['21 daily notes, last 30 days', 'Notes, prior period'] },
      { cat: 'Treatment plan update', kind: 'need', miss: 'isp', text: 'The Oct 22 change (named staff at lunch and transitions, a pre-set regulation break) is in the notes, but the ISP in Lauris has no dated amendment after the Aug 11 review.', cites: ['ISP Oct 22', 'ISP review Aug 11'] },
      { cat: 'Changes in symptoms', kind: 'ehr', text: 'Escalations fell from 6 a week (Aug 24) to 3 a week (Oct 26).', cites: ['Escalation trend (daily notes)'] },
      { cat: 'Functional impairment', kind: 'ehr', text: 'Two escalations ended in physical aggression or elopement (Oct 21, Oct 6), with 1 day of in-school suspension; 4 office referrals in September.', cites: ['Daily note Oct 21', 'Daily note Oct 6', 'Monthly collateral Oct 1'] },
      { cat: 'Treatment response', kind: 'ehr', text: 'A taught strategy is used first in 3 of 5 escalations, up from 1 of 6. On-task time in math rose from about 10 to 15 of 30 minutes.', cites: ['21 daily notes, last 30 days', 'Notes, prior period', 'Daily note Oct 14'] },
      { cat: 'Progress toward goals', kind: 'ehr', text: 'Goal 1 is below its objective (3 of 5 against 4 of 5). Goals 2 and 3 are drafted from 23 older notes and need a clinician’s check.', cites: ['21 daily notes, last 30 days', '23 older notes'] },
      { cat: 'Continued clinical needs', kind: 'ehr', text: 'Staff presence is needed to return to task every school day; lunch and transitions remain the highest-risk times.', cites: ['21 daily notes, last 30 days', 'Daily note Oct 21'] },
      { cat: 'Discharge readiness', kind: 'need', miss: 'stepdown', text: 'No step-down or discharge criteria were found in the notes or the plan since Aug 18.', cites: ['ISP review Aug 11'] },
      { cat: 'Requested intensity', kind: 'ehr', text: 'Direct time of 5 h 20 on Oct 28 (3 units, the 5-hours-or-more level); an average of 14.6 units a week since Aug 18.', cites: ['Direct-hours log', 'Daily note Oct 28'] },
    ],
    sections: (id, u) => [
      { k: 's1', t: 'Consumer and payer information', kind: 'ehr', fields: [['Member', 'M.R., 7 · Medicaid # on file · DOB on file'], ['Plan', 'Anthem HealthKeepers Plus · coverage active since Feb 1, 2026'], ['Provider', 'Harvest Outreach Center · Campbell County ES-1'], ['Clinical contact', 'J. Perez, LPC · NPI on file'], ['Diagnosis', 'F90.2 ADHD, combined type (from the CNA)'], ['Service', 'TDT school day (H2016) · admitted Feb 3, 2026']], cites: ['CNA · diagnosis', 'SRA AUTH-4471-B'] },
      { k: 's2', t: 'Current authorization', kind: 'ehr', fields: [['Authorization', 'AUTH-4471-B'], ['Period', (u.current || {}).start + ' – ' + (u.current || {}).end], ['Authorized', (u.current || {}).authorized + ' units'], ['Used', (u.current || {}).used + ' units'], ['Remaining', (u.current || {}).remaining + ' units (Oct 29)'], ['Average use', '14.6 units a week (direct-hours log)']], cites: ['SRA AUTH-4471-B', 'Direct-hours log'] },
      { k: 's3', t: 'Requested authorization period', kind: 'ai', edit: 'period', text: u.period + ', starting the Monday after the current authorization ends on Fri, Nov 13.', cites: ['SRA AUTH-4471-B'] },
      { k: 's4', t: 'Requested units', kind: 'ai', edit: 'units', text: u.requested + ' units of TDT school day (H2016), 15 hours a week planned. Current use is 3 units a school day (5 or more hours of direct time), an average of 14.6 units a week since Aug 18.', cites: ['Direct-hours log', 'Daily note Oct 28'], rule: 'tdt-units' },
      { k: 's5', t: 'Treatment provided', kind: 'ai', text: 'TDT school day at Campbell County ES-1 since Feb 3, 2026, five days a week. Interventions: co-regulation walks, zones of regulation, a visual timer and CPI-informed de-escalation.\nCare coordination since the last authorization: monthly contact with the school counselor (Aug 29, Sep 3, Oct 1) and the pediatrician (Oct 1, no medication change); IEP review set for Nov 4 at Harvest’s request. The grandmother (guardian) joined 11 of 12 weekly calls and practices the calm-down corner at home.', cites: ['Monthly collateral Oct 1', 'Weekly guardian contacts', '21 daily notes, last 30 days'] },
      { k: 's6', t: 'Progress toward treatment goals', kind: 'ai', text: 'Goal 1 · emotional regulation (objective: a taught coping strategy before leaving the room in 4 of 5 escalations). In the last 30 days M.R. used a taught strategy first in 3 of 5 escalations, up from 1 of 6 in the prior period. Escalations fell from 6 a week (Aug 24) to 3 a week (Oct 26).\nGoal 2 · impulse control. M.R. took a pause before reacting in 3 of 5 peer conflicts, up from 1 of 5.\nGoal 3 · staying on task. On-task time in math rose from about 10 to 15 of 30 minutes with a visual timer and two re-entry prompts.', note: 'Goals 2 and 3: drafted from 23 older notes, not checked yet.', cites: ['21 daily notes, last 30 days', 'Notes, prior period', 'Escalation trend (daily notes)', '23 older notes', 'Daily note Oct 14'] },
      { k: 's7', t: 'Remaining clinical needs', kind: 'ai', input: 'isp', disc: true, text: 'Two escalations still ended in physical aggression or elopement, both in unstructured time: a shove at lunch on Oct 21, and an elopement on Oct 6 followed by 1 day of in-school suspension. Lunch and transitions remain the highest-risk times of day, and M.R. still needs staff presence to return to task every school day. Family need: a consistent bedtime routine.\nChange made to the ISP: lunch and transitions now carry a named staff member and a pre-set regulation break; the safety plan was reviewed with the guardian.', cites: ['Daily note Oct 21', 'Daily note Oct 6', 'ISP Oct 22'] },
      { k: 's8', t: 'Continued medical necessity', kind: 'ai', input: 'stepdown', text: 'Continued TDT at the current intensity is requested. M.R.’s diagnosis is ADHD, combined type (F90.2). Escalations are decreasing, but the Goal 1 objective is not yet met (3 of 5 against 4 of 5). Two October escalations ended in aggression or elopement, and he needs staff presence to return to task every school day.', cites: ['CNA · diagnosis', '21 daily notes, last 30 days', 'Daily note Oct 21', 'Daily note Oct 6'], rules: ['tdt-all3', 'coord'] },
      { k: 's9', t: 'Supporting documentation', kind: 'ehr', docs: [['Daily progress notes', 'Aug 18 – Oct 28 · 21 in the last 30 days', '21 daily notes, last 30 days'], ['Individual Service Plan', 'Last review Aug 11 · change Oct 22', 'ISP Oct 22'], ['Comprehensive Needs Assessment', 'Diagnosis F90.2', 'CNA · diagnosis'], ['Monthly collateral contacts', 'Aug 29, Sep 3, Oct 1', 'Monthly collateral Oct 1'], ['Weekly guardian contacts', '11 of 12 calls', 'Weekly guardian contacts'], ['Direct-hours log', 'Since Aug 18', 'Direct-hours log'], ['Current authorization', 'AUTH-4471-B', 'SRA AUTH-4471-B'], ['IEP review minutes', 'Not in Lauris yet · meeting Nov 4', null, 'iep']], cites: [] },
      { k: 's10', t: 'Clinician review', kind: 'need', review: true, cites: [] },
    ],
    missing: [
      { key: 'isp', sec: 's7', required: true, title: 'Date of the Oct 22 ISP change', field: 'Date and summary of the ISP change, as documented in Lauris',
        why: 'The form asks when the ISP was changed. Lauris has no dated amendment after the Aug 11 review.',
        rules: ['form-cs', 'isp-90'], review: [['Open the ISP in Lauris', 'lauris-isp?c=4471'], ['cite', 'Daily note Oct 21'], ['cite', 'ISP Oct 22']],
        structure: 'Date the ISP was amended:\nWhat changed:\nGuardian signature (date):' },
      { key: 'stepdown', sec: 's8', required: true, title: 'Step-down plan', field: 'Step-down plan and discharge criteria',
        why: 'The form asks for the plan for step-down. None is written since Aug 18.',
        rules: ['coord'], review: [['Open the ISP in Lauris', 'lauris-isp?c=4471'], ['cite', 'ISP review Aug 11']],
        structure: 'Step-down criteria:\nService after TDT:\nEstimated timeframe:' },
      { key: 'iep', sec: 's9', required: false, follow: true, title: 'IEP review minutes', field: '',
        why: '7 of 8 documents attached. The IEP review is Nov 4, after the request.',
        rules: ['mco-docs'], review: [['cite', 'IEP review Nov 4 (School)']] },
    ],
  };
  CONTENT['R-0395'] = {
    since: 'Aug 10', notesBase: 34, read: 'Oct 29, 10:42 am', prepare: true,
    reads: [['Progress notes since Aug 10', '34 daily notes'], ['Individual Service Plan', 'read Oct 21 · last review Aug 11'], ['Comprehensive Needs Assessment', 'diagnosis F41.1'], ['Current authorization', 'AUTH-4430-D · 80 units']],
    excerpts: {
      '34 daily notes since Aug 10': 'Psyflo read 34 daily notes written since Aug 10. Nurse visits fell from 5 to 3 a week.',
      'GAD-7 scores (notes)': 'GAD-7: 14 (Jan) · 11 (Jun) · 9 (Oct). Lower is better.',
      'ISP read Oct 21': 'Treatment plan read Oct 21. The last plan review in Lauris is Aug 11. The request copies the goals as written; if a goal is met or changed, the request says so, with a date.',
      'CNA · diagnosis and behaviours': 'F41.1 Generalized anxiety disorder. Avoids class when a presentation is due, about twice a week for half a period. Stomach complaints with nurse visits about 3 times a week.',
      'Monthly collateral Sep, Oct': 'School counselor and pediatrician, September and October.',
      'Weekly guardian contacts': 'His father joined 9 of 11 weekly calls.',
      'SRA AUTH-4430-D': 'UnitedHealthcare Community Plan · TDT school day (H2016) · Aug 10 – Nov 5 · 80 units authorized (150 requested) · 14 units available on Oct 29.',
      'Section 504 plan (School)': 'Section 504 plan: breaks and a quiet place for tests.',
      'School attendance (School)': 'Classes passing: 6 of 6. Unexcused absences: 3.',
    },
    evidence: [
      { cat: 'Progress notes', kind: 'ehr', text: (n) => n + ' daily notes since Aug 10 were read in Lauris.', cites: ['34 daily notes since Aug 10'] },
      { cat: 'Treatment plan update', kind: 'need', miss: 'goals', text: 'The last plan review in Lauris is Aug 11. Whether any goal was met or changed since then is not documented.', cites: ['ISP read Oct 21'] },
      { cat: 'Changes in symptoms', kind: 'ehr', text: 'GAD-7 went from 14 (Jan) to 11 (Jun) to 9 (Oct).', cites: ['GAD-7 scores (notes)'] },
      { cat: 'Functional impairment', kind: 'ehr', text: 'Avoids class when a presentation is due, about twice a week; stomach complaints with nurse visits about 3 times a week; 3 unexcused absences.', cites: ['CNA · diagnosis and behaviours', 'School attendance (School)'] },
      { cat: 'Treatment response', kind: 'ehr', text: 'Nurse visits fell from 5 to 3 a week.', cites: ['34 daily notes since Aug 10'] },
      { cat: 'Progress toward goals', kind: 'need', miss: 'goals', text: 'Goal-by-goal progress is not written anywhere Psyflo can cite.', cites: [] },
      { cat: 'Continued clinical needs', kind: 'ehr', text: 'The avoidance and the nurse visits above continue; a Section 504 plan gives breaks and a quiet place for tests.', cites: ['CNA · diagnosis and behaviours', 'Section 504 plan (School)'] },
      { cat: 'Discharge readiness', kind: 'need', miss: 'mn', text: 'No step-down or discharge criteria were found since Aug 10.', cites: [] },
      { cat: 'Requested intensity', kind: 'ehr', text: 'Current use is 3 units a school day on AUTH-4430-D.', cites: ['SRA AUTH-4430-D'] },
    ],
    sections: (id, u) => [
      { k: 's1', t: 'Consumer and payer information', kind: 'ehr', fields: [['Member', 'S.B., 11 · Medicaid # on file · DOB on file'], ['Plan', 'UnitedHealthcare Community Plan · coverage active since Jan 1, 2026'], ['Provider', 'Harvest Outreach Center · Campbell County MS-1'], ['Clinical contact', 'J. Perez, LPC · NPI on file'], ['Diagnosis', 'F41.1 Generalized anxiety disorder (from the CNA)'], ['Service', 'TDT school day (H2016) · since Jan 2026']], cites: ['CNA · diagnosis and behaviours', 'SRA AUTH-4430-D'] },
      { k: 's2', t: 'Current authorization', kind: 'ehr', fields: [['Authorization', 'AUTH-4430-D'], ['Period', (u.current || {}).start + ' – ' + (u.current || {}).end], ['Authorized', (u.current || {}).authorized + ' units (150 requested)'], ['Used', (u.current || {}).used + ' units'], ['Remaining', (u.current || {}).remaining + ' units (Oct 29)'], ['Pace', '3 units a school day']], cites: ['SRA AUTH-4430-D'] },
      { k: 's3', t: 'Requested authorization period', kind: 'ai', edit: 'period', text: u.period + ', starting the day after the current authorization ends on Thu, Nov 5.', cites: ['SRA AUTH-4430-D'] },
      { k: 's4', t: 'Requested units', kind: 'ai', edit: 'units', text: u.requested + ' units of TDT school day (H2016). Current use is 3 units a school day. The last request asked for 150 units; 80 were authorized.', cites: ['SRA AUTH-4430-D'], rule: 'tdt-units' },
      { k: 's5', t: 'Treatment provided', kind: 'ai', text: 'TDT school day at Campbell County MS-1 since January 2026. A Section 504 plan gives breaks and a quiet place for tests.\nCare coordination since the last authorization: monthly contact with the school counselor and the pediatrician in September and October. His father joined 9 of 11 weekly calls.', cites: ['Monthly collateral Sep, Oct', 'Weekly guardian contacts', 'Section 504 plan (School)'] },
      { k: 's6', t: 'Progress toward treatment goals', kind: 'ai', input: 'goals', text: 'Since the last authorization, nurse visits fell from 5 to 3 a week, and GAD-7 went from 14 (Jan) to 9 (Oct).', cites: ['34 daily notes since Aug 10', 'GAD-7 scores (notes)'] },
      { k: 's7', t: 'Remaining clinical needs', kind: 'ai', text: 'S.B. avoids class when a presentation is due, about twice a week for half a period, and has stomach complaints with nurse visits about 3 times a week. There were 3 unexcused absences.', cites: ['CNA · diagnosis and behaviours', 'School attendance (School)'] },
      { k: 's8', t: 'Continued medical necessity', kind: 'need', input: 'mn', text: '', cites: [], rules: ['tdt-all3', 'coord'] },
      { k: 's9', t: 'Supporting documentation', kind: 'ehr', docs: [['Daily progress notes', '34 since Aug 10', '34 daily notes since Aug 10'], ['Individual Service Plan', 'Read Oct 21 · last review Aug 11', 'ISP read Oct 21'], ['Comprehensive Needs Assessment', 'Diagnosis F41.1', 'CNA · diagnosis and behaviours'], ['Monthly collateral contacts', 'September and October', 'Monthly collateral Sep, Oct'], ['Weekly guardian contacts', '9 of 11 calls', 'Weekly guardian contacts'], ['Current authorization', 'AUTH-4430-D', 'SRA AUTH-4430-D']], cites: [] },
      { k: 's10', t: 'Clinician review', kind: 'need', review: true, cites: [] },
    ],
    missing: [
      { key: 'goals', sec: 's6', required: true, title: 'Progress on each ISP goal', field: 'Progress on each ISP goal since Aug 10, as counts with dates',
        why: 'The form asks for progress on each goal. None is written since Aug 10; last plan review Aug 11.',
        rules: ['form-cs', 'isp-90'], review: [['Open the daily notes in Lauris', 'lauris-dpn?c=4430'], ['Open the ISP in Lauris', 'lauris-isp?c=4430']],
        structure: 'Goal (as written in the ISP):\nProgress since Aug 10, as a count:\nLack of progress and ISP changes, with dates:' },
      { key: 'mn', sec: 's8', required: true, title: 'Continued medical necessity and step-down plan', field: 'Clinical rationale for continued TDT, and the step-down plan',
        why: 'The form asks for medical necessity and the step-down plan. Neither is written since Aug 10.',
        rules: ['tdt-all3', 'coord'], review: [['Open the CNA in Lauris', 'lauris-cna?c=4430'], ['cite', 'GAD-7 scores (notes)']],
        structure: 'Diagnosis (primary clinical issue):\nClinical necessity (at least two of the three criteria):\nLevel of care (at least one of the five criteria):\nStep-down plan:' },
    ],
  };
  Object.keys(CONTENT).forEach((id) => { const ex = CONTENT[id].excerpts || {}; Object.keys(ex).forEach((l) => EV.excerpt(id, l, ex[l])); });

  /* ------------------------------------------------------------------ model */
  const isMine = (id) => !!CONTENT[id];
  const started = (id) => isMine(id) && (A.status(id) !== 'approved' || !!(PSY.state.cases[id] || {}).csStarted || !CONTENT[id].prepare);
  const hasDraft = (id) => isMine(id) && !fsGet(id).retrieving && (A.status(id) !== 'approved' || !!fsGet(id).prepared || !CONTENT[id].prepare);
  const notesN = (id) => { const C = CONTENT[id]; const lc = lcOf(id); return C.notesBase + ((lc && PSY.flag('dpn-notes.' + lc.id)) || 0); };
  const secLabelKind = (s, fs) => ((fs.accepted || {})[s.k] ? 'reviewed' : (fs.edits || {})[s.k] != null ? 'clin' : s.kind);
  const LABEL_TEXT = { ehr: 'Retrieved from Lauris', ai: 'AI-generated draft', clin: 'Clinician-entered', reviewed: 'Clinician Reviewed', need: 'Clinician Input Required' };
  const secLabel = (k) => EV.label(k, LABEL_TEXT[k]);

  function model(id) {
    const C = CONTENT[id]; if (!C) return null;
    const u = A.units(id); const fs = fsGet(id);
    const sections = C.sections(id, u).map((s, i) => Object.assign({ n: i + 1 }, s));
    sections.forEach((s) => { s.label = secLabelKind(s, fs); s.accepted = !!(fs.accepted || {})[s.k]; s.edited = (fs.edits || {})[s.k] != null; s.textNow = s.edited ? fs.edits[s.k] : s.text; });
    const missing = C.missing.map((m) => Object.assign({ added: (fs.inputs || {})[m.key] || null, secN: (sections.find((s) => s.k === m.sec) || {}).n }, m));
    return { id, C, u, fs, sections, missing, status: A.status(id), drafted: hasDraft(id), title: 'Concurrent SRA · ' + cv(id).ini + ', ' + cv(id).age, form: FORM_LONG };
  }
  function progress(id) {
    const M = model(id); if (!M) return null;
    const nAcc = M.sections.filter((s) => s.accepted).length; const req = M.missing.filter((m) => m.required);
    const nIn = req.filter((m) => m.added).length; const disc = !M.C.disc || !!PSY.flag('family-disclosure');
    return { nAcc, total: M.sections.length, nIn, nReq: req.length, disc, ready: nAcc === M.sections.length && nIn === req.length && disc };
  }
  /* why a section cannot be accepted yet (empty string = it can) */
  function blocker(M, s) {
    if (s.input) { const m = M.missing.find((x) => x.key === s.input); if (m && m.required && !m.added) return 'Add “' + m.title + '”.'; }
    if (s.disc && !PSY.flag('family-disclosure')) return 'Decide on the family disclosure first.';
    if (s.review) { const left = M.sections.filter((x) => x.k !== s.k && !x.accepted).length; const req = M.missing.filter((m) => m.required && !m.added).length; if (left || req) return [left ? left + ' section' + (left === 1 ? '' : 's') + ' to accept' : '', req ? req + ' item' + (req === 1 ? '' : 's') + ' to add' : ''].filter(Boolean).join(' · '); }
    return '';
  }

  /* ------------------------------------------------------------------ pieces */
  const textHtml = (t) => String(t || '').split('\n').filter((x) => x.trim()).map((p) => '<p>' + esc(p) + '</p>').join('');
  const cites = (list, id) => (list || []).filter(Boolean).map((l) => EV.cite(l, id)).join(' ');
  const ruleLine = (rid) => { const r = rule(rid); return r ? RU.line(r) : '<div class="rq5"><div class="rq5-t">' + esc(RU.VERIFY) + '</div></div>'; };

  function headline(id) {
    const u = A.units(id); const cur = u.current; const un = u.service.units;
    if (!cur) return 'Concurrent SRA';
    const p = pace(id);
    if (!cur.perDay) return 'Concurrent SRA · ' + cur.remaining + ' of ' + cur.authorized + ' ' + un + ' left · authorization ends ' + cur.end;
    if (p && p.out) return 'Concurrent SRA · no units left · authorization ends ' + cur.end;
    if (p && p.after) return 'Concurrent SRA · ' + cur.remaining + ' ' + un + ' left at ' + cur.perDay + ' a day, enough to reach the end date · authorization ends ' + cur.end;
    return 'Concurrent SRA · units run out in about ' + u.daysLeft + ' school days (' + cur.remaining + ' left at ' + cur.perDay + ' a day) · authorization ends ' + cur.end;
  }
  /* ---- (b) unit tracking: works for every service (school day, after school, outpatient sessions) ---- */
  function unitsHtml(id, o) {
    o = o || {};
    const u = A.units(id); const cur = u.current; const svc = u.service; const un = svc.units; const c = cv(id); const m = A.meta(id);
    const st = A.status(id); const asked = st !== 'approved' || (isMine(id) && started(id));
    const tile = (cls, label, val, sub) => '<div class="cs5-ut ' + cls + '"><span>' + label + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    if (!cur) return '<div class="cs5-units" data-psy="cs5-units"><div class="cs5-ch"><h3>Units</h3></div><div>' + (u.requested ? u.requested + ' ' + esc(un) + ' requested · no authorization in force' : 'No authorization in force') + '</div></div>';
    const p = pace(id); const low = cur.perDay && u.daysLeft != null && u.daysLeft <= 10;
    const pctU = Math.round((cur.used / Math.max(1, cur.authorized)) * 100);
    const r = rule(svc.ruleId);
    let paceTx;
    if (!p || p.none) paceTx = 'Counted in ' + esc(un) + ', not per school day · no run-out projected';
    else if (p.out) paceTx = 'No units left';
    else paceTx = 'At <b>' + cur.perDay + ' ' + (cur.perDay === 1 ? esc(svc.unit) : esc(un)) + ' a school day</b> · projected run-out <b>about ' + esc(p.date) + '</b>' +
      (p.before ? ', before the authorization ends on ' + esc(cur.end) : p.after ? ', after the authorization ends on ' + esc(cur.end) : ', the day the authorization ends');
    const reqLabel = asked ? 'Requested' : 'Next request';
    return '<div class="cs5-units' + (o.big === false ? '' : ' big') + '" data-psy="cs5-units"><div class="cs5-ch"><h3>Units · ' + esc(svc.short) + (svc.code ? ' (' + esc(svc.code) + ')' : '') + '</h3><span>' + esc(m.ref || '') + ' · ' + esc(cur.start) + ' – ' + esc(cur.end) + '</span></div>' +
      '<div class="cs5-uts">' + tile('', 'Authorized', cur.authorized, esc(un)) + tile('', 'Used', cur.used, pctU + '%') + tile(low ? 'rem low' : 'rem', 'Remaining', cur.remaining, u.daysLeft != null && cur.perDay ? '≈' + u.daysLeft + ' school days' : esc(un)) +
      tile('req', reqLabel, u.requested != null ? u.requested : '—', esc(u.period || 'next period')) + tile('', 'Expires', esc(cur.end), '') + '</div>' +
      '<div class="cs5-ubar" role="img" aria-label="' + cur.used + ' of ' + cur.authorized + ' ' + esc(un) + ' used, ' + cur.remaining + ' remaining, expires ' + esc(cur.end) + '"><i class="u" style="width:' + pctU + '%"><em>Used ' + cur.used + '</em></i><i class="r' + (low ? ' low' : '') + '" style="width:' + (100 - pctU) + '%"><em>' + cur.remaining + ' left</em></i></div>' +
      '<div class="cs5-upace">' + paceTx + '</div>' +
      '<div class="cs5-urule"><div>' + esc(svc.rule) + '</div><div class="cs5-urs">' + (r ? EV.label(r.kind === 'unverified' ? 'unverified' : r.kind) + '<span>' + esc(r.source) + '</span>' : EV.label('unverified', RU.VERIFY)) + (svc.overridden ? EV.label('documented', 'Payer setting in Settings') : '') + '</div></div></div>';
  }

  /* ---- (d) the draft, 10 numbered sections ---- */
  function sectionHtml(M, s, ro) {
    const id = M.id; const fs = M.fs; const editing = !ro && fs.editing === s.k && !s.accepted;
    const accBy = (fs.accepted || {})[s.k];
    let body = '';
    if (s.fields) body += '<div class="cs5-fl">' + s.fields.map((f) => '<div><span>' + esc(f[0]) + '</span>' + esc(f[1]) + '</div>').join('') + '</div>';
    if (s.docs) body += '<ul class="cs5-docs">' + s.docs.map((d) => { const mi = d[3] ? M.missing.find((x) => x.key === d[3]) : null; const fol = mi && (fs.follow || {})[mi.key];
      return '<li><b>' + esc(d[0]) + '</b><span>' + esc(d[1]) + '</span>' + (d[2] ? '<em>' + EV.cite(d[2], id) + '</em>' : EV.label(fol ? 'clin' : 'need', fol ? 'Follow-up set by clinician' : 'Not in Lauris yet')) + '</li>'; }).join('') + '</ul>';
    if (s.review) {
      const P = progress(id);
      body += '<ul class="cs5-rv"><li>' + (P.nAcc - (s.accepted ? 1 : 0)) + ' of ' + (P.total - 1) + ' sections accepted</li><li>' + P.nIn + ' of ' + P.nReq + ' items of clinical information added</li>' + (M.C.disc ? '<li>Family disclosure: ' + esc(PSY.flag('family-disclosure') === 'include' ? 'included (generic wording)' : PSY.flag('family-disclosure') === 'exclude' ? 'left out' : 'not decided yet') + '</li>' : '') +
        '<li>Reviewer: ' + esc(ME) + '</li></ul>' + ruleLine('sig');
    }
    if (editing) {
      const u = M.u;
      if (s.edit === 'units') body += '<label class="cs5-lb">Units requested<input type="text" inputmode="numeric" data-cs5-units value="' + esc(u.requested) + '"></label>';
      if (s.edit === 'period') body += '<label class="cs5-lb">Period requested<input type="text" data-cs5-period value="' + esc(u.period) + '"></label>';
      body += '<label class="cs5-lb">Text<textarea data-cs5-ed="' + s.k + '" rows="6">' + esc(s.textNow) + '</textarea></label>';
    } else if (s.textNow) body += '<div class="cs5-tx">' + textHtml(s.textNow) + '</div>';
    if (s.disc && M.C.disc) {
      const d = PSY.flag('family-disclosure');
      if (d === 'include') body += '<div class="cs5-ce" data-psy="cs5-disc-text"><span class="cs5-cel">' + EV.label('clin', 'Included by clinician') + '</span>' + esc(M.C.disc.text) + '</div>';
      if (!ro) body += '<div class="cs5-nd" data-psy="cs5-disc"><div class="cs5-ndt"><b>Family disclosure</b> · include a generic sentence about the household change? ' + EV.cite(M.C.disc.from, id) + '</div>' +
        '<span class="seg5" role="group" aria-label="Family disclosure"><button class="' + (d === 'include' ? 'on' : '') + '" aria-pressed="' + (d === 'include') + '" data-act="cs5-disc" data-case="' + id + '" data-v="include">Include</button><button class="' + (d === 'exclude' ? 'on' : '') + '" aria-pressed="' + (d === 'exclude') + '" data-act="cs5-disc" data-case="' + id + '" data-v="exclude">Leave out</button></span></div>';
      else if (!d) body += '<div class="cs5-nd">' + EV.label('need') + ' Family disclosure: not decided yet.</div>';
    }
    if (s.input) {
      const m = M.missing.find((x) => x.key === s.input);
      if (m && m.added) body += '<div class="cs5-ce" data-psy="cs5-added-' + esc(m.key) + '"><span class="cs5-cel">' + EV.label('clin') + ' ' + esc(m.title) + ' · ' + esc(m.added.by) + '</span>' + esc(m.added.text) + '</div>';
      else if (m) body += '<div class="cs5-nd">' + EV.label('need') + '<span>' + esc(m.title) + ' is not in the record.</span>' + (ro ? '' : '<button class="lnk5" data-act="cs5-step" data-step="missing" data-key="' + esc(m.key) + '">Add it in Missing information</button>') + '</div>';
    }
    if (s.note) body += '<div class="cs5-note">' + esc(s.note) + '</div>';
    if (s.rule) body += '<div class="cs5-rl">' + ruleLine(s.rule) + '</div>';
    if (s.rules && !ro) body += '<details class="cs5-rd"><summary>Requirements this section addresses</summary>' + s.rules.map(ruleLine).join('') + '<div class="cs5-q">' + esc(RU.ADDRESSES) + '</div></details>';
    const src = s.cites && s.cites.length ? '<div class="cs5-src"><span>Sources</span>' + cites(s.cites, id) + '</div>' : '';
    let foot = '';
    if (!ro) {
      const bl = blocker(M, s);
      if (s.accepted) foot = '<span class="cs5-by"><i aria-hidden="true">✓</i> Accepted by ' + esc(accBy.by) + ' · ' + esc(accBy.at) + '</span><span class="sp"></span><button class="btn o s" data-act="cs5-reopen" data-case="' + id + '" data-sec="' + s.k + '">Reopen</button>';
      else if (editing) foot = '<span class="sp"></span><button class="btn o s" data-act="cs5-cancel" data-case="' + id + '">Cancel</button><button class="btn p s" data-act="cs5-save" data-case="' + id + '" data-sec="' + s.k + '">Save edit</button>';
      else foot = (bl ? '<span class="cs5-q" data-psy="cs5-block">' + esc(bl) + '</span>' : '') + '<span class="sp"></span>' +
        (s.textNow != null && s.kind !== 'ehr' && !s.review && (s.text || s.edited) ? '<button class="btn o s" data-act="cs5-edit" data-case="' + id + '" data-sec="' + s.k + '">Edit</button>' : '') +
        '<button class="btn ' + (bl ? 'o' : 'p') + ' s" data-act="cs5-accept" data-case="' + id + '" data-sec="' + s.k + '"' + (bl ? ' title="' + esc(bl) + '"' : '') + '>' + (s.review ? 'Mark review complete' : 'Accept') + '</button>';
    }
    return '<article class="cs5-sec k-' + s.kind + (s.accepted ? ' ok' : '') + (editing ? ' ed' : '') + '" id="cs5-' + s.k + '" data-sec="' + s.k + '"><div class="cs5-sh"><span class="cs5-n">' + s.n + '</span><h4>' + esc(s.t) + '</h4>' + secLabel(s.label) + '</div>' + body + src + (foot ? '<div class="cs5-sf">' + foot + '</div>' : '') + '</article>';
  }
  function sectionsHtml(id, o) {
    o = o || {}; const M = model(id); if (!M) return '';
    return M.sections.map((s) => sectionHtml(M, s, !!o.ro)).join('');
  }
  /* ---- (e) missing clinical evidence ---- */
  function missingCard(M, m, ro) {
    const id = M.id; const fs = M.fs; const draft = (fs.drafts || {})[m.key] || '';
    const review = (m.review || []).map((r) => r[0] === 'cite' ? EV.cite(r[1], id) : '<button class="lnk5" data-go="' + esc(r[1]) + '">' + esc(r[0]) + '</button>').join(' · ');
    let act = '';
    if (m.follow) {
      const on = (fs.follow || {})[m.key];
      act = ro ? '' : '<div class="cs5-sf">' + (on ? '<span class="cs5-by"><i aria-hidden="true">✓</i> Follow-up set · after Nov 4</span><span class="sp"></span><button class="btn o s" data-act="cs5-follow" data-case="' + id + '" data-key="' + esc(m.key) + '">Clear follow-up</button>' : '<span class="sp"></span><button class="btn o s" data-act="cs5-follow" data-case="' + id + '" data-key="' + esc(m.key) + '">Follow up after Nov 4</button>') + '</div>';
    } else if (m.added) {
      act = '<div class="cs5-ce" data-psy="cs5-in-' + esc(m.key) + '"><span class="cs5-cel">' + EV.label('clin') + ' ' + esc(m.added.by) + ' · ' + esc(m.added.at) + ' · in section ' + m.secN + '</span>' + esc(m.added.text) + '</div>' +
        (ro ? '' : '<div class="cs5-sf"><span class="sp"></span><button class="btn o s" data-act="cs5-change" data-case="' + id + '" data-key="' + esc(m.key) + '">Change</button><button class="btn o s" data-act="cs5-step" data-step="draft" data-key="' + esc(m.sec) + '">See section ' + m.secN + '</button></div>');
    } else if (!ro) {
      act = '<label class="cs5-lb">' + esc(m.field) + '<textarea rows="5" data-cs5-in="' + esc(m.key) + '" data-input="cs5-typing" data-case="' + id + '">' + esc(draft) + '</textarea></label>' +
        '<div class="cs5-sf"><button class="btn o s" data-act="cs5-structure" data-case="' + id + '" data-key="' + esc(m.key) + '" title="Inserts headings only">Suggest a structure</button><span class="sp"></span><button class="btn p s" data-act="cs5-add" data-case="' + id + '" data-key="' + esc(m.key) + '">Add to the request</button></div>';
    }
    return '<article class="cs5-mi' + (m.added || (m.follow && (fs.follow || {})[m.key]) ? ' done' : '') + '" id="cs5-m-' + esc(m.key) + '" data-mi="' + esc(m.key) + '"><div class="cs5-sh">' + (m.added ? EV.label('clin', 'Added by clinician') : EV.label('need')) + '<h4>' + esc(m.title) + '</h4><span class="cs5-q">' + (m.required ? 'Required' : 'Optional') + ' · section ' + m.secN + '</span></div>' +
      '<div class="cs5-why">' + esc(m.why) + '</div><dl class="cs5-mdl"><dt>Requirement</dt><dd>' + (m.rules || []).map(ruleLine).join('') + '</dd>' + (review ? '<dt>What to review</dt><dd>' + review + '</dd>' : '') + '</dl>' + act + '</article>';
  }
  function missingHtml(id, o) {
    o = o || {}; const M = model(id); if (!M) return '';
    return M.missing.map((m) => missingCard(M, m, !!o.ro)).join('');
  }

  /* ---- submit (the payer submission is PSY.submit5, 77-flow-initial.js) ---- */
  PSY.acts['cs5-submit'] = (el) => { const id = el.getAttribute('data-case'); if (PSY.submit5 && PSY.submit5.ready(id).ok) { PSY.submit5.submit(id); PSY.refresh(); PSY.ui.toast('Submitted.'); } };

  const openEnh = (id) => (PSY.enhance && PSY.enhance.openFor ? PSY.enhance.openFor(id) : PSY.go('lauris-dmas?case=' + id));
  function prepare(id) {
    if (!isMine(id) || !CONTENT[id].prepare) return;
    const fs = FS(id); if (fs.retrieving || fs.prepared) { openEnh(id); return; }
    PSY.state.cases[id] = Object.assign({}, PSY.state.cases[id] || {}, { csStarted: true });
    fs.retrieving = true;
    audit(id, 'Concurrent SRA started: reading Lauris (notes since ' + CONTENT[id].since + ', ISP, CNA, current authorization)', { doc: 'Lauris records' });
    openEnh(id);
    setTimeout(() => {
      const f = FS(id); f.retrieving = false; f.prepared = { at: PSY.now() };
      A.set(id, 'review', { action: 'Concurrent SRA draft prepared', by: SYS, doc: FORM + ' (draft) · ' + CONTENT[id].notesBase + ' notes, ISP, CNA, ' + (A.meta(id).ref || '') });
      if (PSY.enhance && PSY.enhance.isOpen && PSY.enhance.isOpen()) PSY.ext.work.paint();
      PSY.ui.toast('Draft prepared.');
    }, 1400);
  }

  /* the focused review is retired: whatever still opens it gets one button to Scan & Enhance */
  function render(id) {
    if (!id || !PSY.caseById(id)) return '<div class="xf-empty">Open a consumer in Lauris.</div>';
    return '<div class="xf-empty"><button class="btn p" data-act="enh-open" data-case="' + esc(id) + '">Open Scan &amp; Enhance</button></div>';
  }

  /* ------------------------------------------------------------------ the Status tab hooks */
  const ROW = (label, value, tone) => ({ label, value, tone });
  function requirements(id) {
    if (!isMine(id)) { const u = A.units(id); const cur = u.current; if (!cur) return null; return [ROW('Current authorization', cur.remaining + ' of ' + cur.authorized + ' ' + u.service.units + ' left · ends ' + cur.end, 'green'), ROW('Progress notes', 'Read daily', 'green'), ROW('Next concurrent SRA', 'Not due yet', 'gray')]; }
    const u = A.units(id); const cur = u.current || {}; const st = A.status(id); const fs = fsGet(id); const low = u.daysLeft != null && u.daysLeft <= 10;
    const rows = [ROW('Current authorization', cur.remaining + ' of ' + cur.authorized + ' ' + u.service.units + ' left · ends ' + cur.end, low ? 'amber' : 'green')];
    if (!hasDraft(id)) return rows.concat([ROW('Progress notes', notesN(id) + ' since ' + CONTENT[id].since + ' · read daily', 'green'), ROW('Treatment plan (ISP)', 'Retrieved', 'green'), ROW('Concurrent SRA', fs.retrieving ? 'Preparing…' : 'Not started', fs.retrieving ? 'blue' : 'amber')]);
    const P = progress(id); const signed = AFTER_SIGN.indexOf(st) >= 0;
    const subd = ['submitted', 'pending', 'approved'].indexOf(st) >= 0;
    const isp = model(id).missing.find((m) => m.sec === 's7' || m.key === 'goals');
    return rows.concat([
      ROW('Progress notes', 'Reviewed · ' + notesN(id) + ' since ' + CONTENT[id].since, 'green'),
      ROW('Treatment plan (ISP)', isp && isp.required && !isp.added ? 'Retrieved · ' + (isp.key === 'isp' ? 'change date missing' : 'goal progress missing') : 'Retrieved', isp && isp.required && !isp.added ? 'amber' : 'green'),
      ROW('Medical necessity', model(id).sections.find((s) => s.k === 's8').accepted ? 'Reviewed' : 'Drafted', model(id).sections.find((s) => s.k === 's8').accepted ? 'green' : 'blue'),
      ROW('Clinical input', P.nIn === P.nReq ? 'Added by clinician' : (P.nReq - P.nIn) + ' item' + (P.nReq - P.nIn === 1 ? '' : 's') + ' required', P.nIn === P.nReq ? 'green' : 'amber'),
      ROW('Clinician review', signed || fs.sent ? 'Done' : P.nAcc + ' of ' + P.total + ' sections accepted', signed || fs.sent ? 'green' : 'amber'),
      ROW('Clinician signature', signed ? 'Signed in Lauris' : fs.sent ? 'Waiting in Forms to Approve' : 'Required', signed ? 'green' : 'amber'),
      ROW('Submission', subd ? A.label(st) + ' · ' + RU.channel(cv(id).payer).method + ' (simulated)' : st === 'ready' ? 'Ready to submit' : 'Not yet', subd ? 'blue' : st === 'ready' ? 'amber' : 'gray'),
    ]);
  }
  function primary(id) {
    const st = A.status(id); const u = A.units(id); const fs = fsGet(id);
    const focus = (label) => ({ label, attrs: 'data-act="enh-open" data-case="' + id + '"' });
    if (isMine(id) && st === 'approved' && !hasDraft(id)) return u.daysLeft != null && u.daysLeft <= 20 ? { label: 'Prepare Concurrent SRA', attrs: 'data-act="cs5-prepare" data-case="' + id + '"' } : undefined;
    if (st === 'review' && fs.sent) return { label: 'Sign in Forms to Approve', attrs: 'data-go="lauris-forms"' };
    if (st === 'review') return focus('Scan & Enhance');
    if (st === 'ready') return focus('Submit Concurrent SRA');
    return undefined;
  }
  function evidence(id) {
    const M = model(id); if (!M || !M.drafted) return null; const seen = {}; const out = [];
    M.sections.forEach((s) => (s.cites || []).concat((s.docs || []).map((d) => d[2]).filter(Boolean)).forEach((l) => { if (!seen[l]) { seen[l] = 1; out.push({ label: l, text: 'section ' + s.n + ' · ' + s.t }); } }));
    return out;
  }
  function missing(id) {
    const M = model(id); if (!M) return isMine(id) ? null : [];
    return M.missing.filter((m) => !m.added && !(m.follow && (M.fs.follow || {})[m.key])).map((m) => ({ title: m.title, why: m.why, rule: (m.rules || []).map((r) => { const x = rule(r); return x ? x.text + ' (' + x.source + ')' : RU.VERIFY; }).join(' · ') }));
  }

  PSY.flows = PSY.flows || {};
  PSY.flows.continued = { title: 'Concurrent SRA', render, requirements, evidence, missing, primary };

  /* ------------------------------------------------------------------ acts */
  const caseOf = (el) => el.getAttribute('data-case') || '';
  const toStep = () => { PSY.refresh(); };
  PSY.acts['cs5-step'] = () => toStep();
  PSY.acts['cs5-open'] = (el) => openEnh(el.getAttribute('data-case'));
  PSY.acts['cs5-prepare'] = (el) => prepare(caseOf(el));
  PSY.acts['cs5-accept'] = (el, ctx) => {
    const id = caseOf(el); const k = el.getAttribute('data-sec'); const M = model(id); const s = M.sections.find((x) => x.k === k); if (!s) return;
    const bl = blocker(M, s); if (bl) { PSY.ui.toast(bl); if (s.input && /^Add “/.test(bl)) toStep('missing', s.input); return; }
    const fs = FS(id); fs.accepted = fs.accepted || {}; fs.accepted[k] = { at: PSY.now(), by: ME };
    audit(id, s.review ? 'Clinician review of the concurrent SRA draft completed' : 'Section ' + s.n + ' accepted: ' + s.t, { doc: FORM + ' · section ' + s.n });
    PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-reopen'] = (el) => {
    const id = caseOf(el); const k = el.getAttribute('data-sec'); const s = model(id).sections.find((x) => x.k === k); const fs = FS(id);
    if (fs.accepted) delete fs.accepted[k];
    if (k !== 's10' && fs.accepted && fs.accepted.s10) { delete fs.accepted.s10; }
    audit(id, 'Section ' + s.n + ' reopened: ' + s.t, { doc: FORM + ' · section ' + s.n }); PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-edit'] = (el) => { const fs = FS(el.getAttribute('data-case')); fs.editing = el.getAttribute('data-sec'); PSY.save(); PSY.refresh(); };
  PSY.acts['cs5-cancel'] = (el) => { const fs = FS(caseOf(el)); fs.editing = null; PSY.save(); PSY.refresh(); };
  PSY.acts['cs5-save'] = (el, ctx) => {
    const id = caseOf(el); const k = el.getAttribute('data-sec'); const r = ctx.root; const M = model(id); const s = M.sections.find((x) => x.k === k);
    const ta = r.querySelector('[data-cs5-ed="' + k + '"]'); const text = ta ? ta.value.trim() : '';
    if (!text) { PSY.ui.toast('The section cannot be empty.'); return; }
    const fs = FS(id); fs.edits = fs.edits || {}; const changes = [];
    const st = PSY.state.cases[id] = Object.assign({}, PSY.state.cases[id] || {}); const req = Object.assign({}, st.request5 || {});
    const ui = r.querySelector('[data-cs5-units]'); const pi = r.querySelector('[data-cs5-period]');
    if (ui) { const n = parseInt(ui.value, 10); if (!(n > 0 && n <= 999)) { PSY.ui.toast('Enter units as a whole number.'); return; } if (n !== M.u.requested) { changes.push('units ' + M.u.requested + ' → ' + n); req.units = n; } }
    if (pi) { const v = pi.value.trim(); if (!v) { PSY.ui.toast('Enter the period requested.'); return; } if (v !== M.u.period) { changes.push('period ' + M.u.period + ' → ' + v); req.period = v; } }
    if (changes.length) st.request5 = req;
    let out = text;
    if (out === s.textNow) { if (req.units && ui) out = out.replace(M.u.requested + ' units', req.units + ' units'); if (req.period && pi) out = out.replace(M.u.period, req.period); }
    if (out !== s.text || changes.length) fs.edits[k] = out;
    fs.editing = null;
    audit(id, 'Clinician edited section ' + s.n + ': ' + s.t + (changes.length ? ' (' + changes.join(', ') + ')' : ''), { doc: FORM + ' · section ' + s.n });
    PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-typing'] = (el) => { const fs = FS(caseOf(el)); fs.drafts = fs.drafts || {}; fs.drafts[el.getAttribute('data-cs5-in')] = el.value; PSY.save(); };
  PSY.acts['cs5-structure'] = (el, ctx) => {
    const id = caseOf(el); const key = el.getAttribute('data-key'); const m = CONTENT[id].missing.find((x) => x.key === key); if (!m || !m.structure) return;
    const ta = ctx.root.querySelector('[data-cs5-in="' + key + '"]'); const cur = ta ? ta.value : '';
    if (cur.indexOf(m.structure.split('\n')[0]) >= 0) { PSY.ui.toast('Headings already added.'); return; }
    const fs = FS(id); fs.drafts = fs.drafts || {}; fs.drafts[key] = (cur.trim() ? cur.replace(/\s+$/, '') + '\n\n' : '') + m.structure;
    audit(id, 'Structure suggested for “' + m.title + '” (headings only, no clinical content)', { by: SYS });
    PSY.save(); PSY.refresh();
    setTimeout(() => { const r = PSY.activeRoot(); const t = r && r.querySelector('[data-cs5-in="' + key + '"]'); if (t) { t.focus({ preventScroll: true }); const i = t.value.indexOf(':'); if (i >= 0) t.setSelectionRange(i + 1, i + 1); } }, 0);
  };
  /* only the headings (from Suggest a structure) do not count as clinical content */
  const contentOf = (text, m) => { let t = String(text || ''); (m.structure || '').split('\n').forEach((h) => { if (h.trim()) t = t.split(h.trim()).join(''); }); return t.replace(/\s+/g, ' ').trim(); };
  PSY.acts['cs5-add'] = (el, ctx) => {
    const id = caseOf(el); const key = el.getAttribute('data-key'); const m = CONTENT[id].missing.find((x) => x.key === key); if (!m) return;
    const ta = ctx.root.querySelector('[data-cs5-in="' + key + '"]'); const text = (ta ? ta.value : ((fsGet(id).drafts || {})[key] || '')).trim();
    if (contentOf(text, m).length < 4) { PSY.ui.toast(text ? 'Add content under the headings.' : 'Write the clinical information first.'); if (ta) ta.focus(); return; }
    const fs = FS(id); fs.inputs = fs.inputs || {}; fs.inputs[key] = { text, at: PSY.now(), by: ME }; if (fs.drafts) delete fs.drafts[key];
    const sec = CONTENT[id].sections(id, A.units(id)).findIndex((s) => s.k === m.sec) + 1;
    audit(id, 'Clinical information added: ' + m.title, { doc: FORM + ' · section ' + sec });
    PSY.save(); PSY.refresh(); PSY.ui.toast('Added to section ' + sec + '.');
  };
  PSY.acts['cs5-change'] = (el) => {
    const id = caseOf(el); const key = el.getAttribute('data-key'); const fs = FS(id); const cur = (fs.inputs || {})[key]; if (!cur) return;
    fs.drafts = fs.drafts || {}; fs.drafts[key] = cur.text; delete fs.inputs[key];
    const m = CONTENT[id].missing.find((x) => x.key === key); const sec = m && m.sec; if (fs.accepted && sec) { delete fs.accepted[sec]; delete fs.accepted.s10; }
    audit(id, 'Clinical information reopened for changes: ' + (m ? m.title : key)); PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-follow'] = (el) => {
    const id = caseOf(el); const key = el.getAttribute('data-key'); const fs = FS(id); fs.follow = fs.follow || {}; const m = CONTENT[id].missing.find((x) => x.key === key);
    fs.follow[key] = !fs.follow[key];
    audit(id, fs.follow[key] ? 'Follow-up set: ' + m.title + ' after Nov 4' : 'Follow-up cleared: ' + m.title, { doc: 'Supporting documentation' }); PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-disc'] = (el) => {
    const id = caseOf(el); const v = el.getAttribute('data-v') === 'include' ? 'include' : 'exclude';
    PSY.flag('family-disclosure', v); const fs = FS(id); if (fs.accepted) { delete fs.accepted.s7; delete fs.accepted.s10; }
    audit(id, v === 'include' ? 'Family disclosure included (generic wording)' : 'Family disclosure left out of the request', { doc: FORM + ' · section 7' }); PSY.save(); PSY.refresh();
  };
  PSY.acts['cs5-reread'] = (el) => {
    const id = caseOf(el); const fs = FS(id); const lc = lcOf(id); const n = (lc && PSY.flag('dpn-notes.' + lc.id)) || 0; const before = fs.reread ? fs.reread.seen || 0 : 0;
    fs.reread = { at: PSY.now(), n: Math.max(0, n - before), seen: n };
    audit(id, 'Lauris records read again: ' + notesN(id) + ' notes, ISP, CNA, current authorization' + (fs.reread.n ? ' · ' + fs.reread.n + ' new note added to the evidence' : ' · no new notes'), { by: SYS, doc: 'Lauris records' });
    PSY.save(); PSY.refresh(); PSY.ui.toast(fs.reread.n ? 'Lauris read again · ' + fs.reread.n + ' new note' : 'Lauris read again · no new notes');
  };
  PSY.acts['cs5-send'] = (el) => {
    const id = caseOf(el); const P = progress(id); if (!P.ready) { PSY.ui.toast('Complete the open items first.'); return; }
    const fs = FS(id); fs.sent = { at: PSY.now() };
    /* the existing Lauris form state (PSY.l2) lists a processed form in Forms to Approve */
    if (PSY.l2 && PSY.l2.k) PSY.state.boxes[PSY.l2.k(id, 'processed')] = { at: PSY.now(), by: 'concurrent SRA review' };
    A.set(id, 'review', { action: 'Concurrent SRA sent to Forms to Approve', by: ME, doc: FORM + ' · ' + P.total + ' sections accepted' });
    PSY.save();
    PSY.go('lauris-forms');
    PSY.ui.toast('Sent to Forms to Approve.');
  };
  /* platform → the review in Lauris (the platform is a read-only mirror) */
  PSY.acts['cs5-lauris'] = (el) => { const id = el.getAttribute('data-case'); const fl = el.getAttribute('data-flow'); if (fl === 'decision') PSY.openCase(id); else openEnh(id); };

  /* ------------------------------------------------------------------ API for the platform mirror and other modules */
  PSY.cs5 = {
    model, progress, unitsHtml, sectionsHtml, missingHtml, prepare, headline, pace,
    has: isMine, drafted: hasDraft,
    /* concurrent SRAs sent to Forms to Approve and not signed yet (for Forms to Approve) */
    formsPending: () => Object.keys(CONTENT).filter((id) => fsGet(id).sent && A.status(id) === 'review').map((id) => ({ cid: id, form: FORM_LONG, ini: cv(id).who, by: 'J. Perez', date: '10/29/2026', time: fsGet(id).sent.at })),
    css: (S) => CSS(S),
  };
  /* Forms to Approve lists a concurrent SRA sent for signature even when its case is not one of the two the list knows (S.B.).
     Additive and de-duplicated by case: a native generic list makes this a no-op. */
  try {
    const L2 = PSY.l2;
    if (L2 && typeof L2.pendingForms === 'function' && !L2.pendingForms.cs5) {
      const orig = L2.pendingForms;
      const wrapped = function () {
        const rows = orig.apply(this, arguments);
        try { PSY.cs5.formsPending().forEach((f) => { if (!rows.some((r) => r.cid === f.cid)) rows.unshift({ id: f.cid, cid: f.cid, form: f.form, ini: f.ini, by: f.by, date: f.date, time: f.time, att: 'auth' }); }); } catch (e) {}
        return rows;
      };
      wrapped.cs5 = true; L2.pendingForms = wrapped;
    }
  } catch (e) {}

  /* ------------------------------------------------------------------ CSS (scoped: .xf in Lauris; the platform mirror passes its own scope) */
  function CSS(S) {
    return `
${S} .cs5-hd{background:#fff;border:1px solid #E6E1D9;border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:9px}
${S} .cs5-h1{font-size:16.5px;font-weight:700;line-height:1.35;color:#151B24}
${S} .cs5-mts{display:flex;flex-wrap:wrap;gap:6px 26px}
${S} .cs5-mt{display:flex;flex-direction:column;gap:2px;min-width:0}
${S} .cs5-mt>span{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700}
${S} .cs5-mt b{font-size:13.5px;font-weight:600}
${S} .cs5-win{font-size:12.5px;color:#4A453D;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid #F0ECE5;padding-top:8px}
${S} .cs5-tabs{display:flex;gap:2px;border-bottom:1px solid #E1DBD1;margin:14px 0}
${S} .cs5-tabs button{border:0;background:none;padding:9px 12px 8px;font:inherit;font-size:13.5px;font-weight:600;color:#525B66;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;display:flex;gap:7px;align-items:center;white-space:nowrap}
${S} .cs5-tabs button:hover{color:#151B24}
${S} .cs5-tabs button.on{color:#1D4F43;border-bottom-color:#217A78}
${S} .cs5-ti{width:19px;height:19px;border-radius:50%;background:#EFEBE4;color:#4A453D;font-size:11px;display:inline-flex;align-items:center;justify-content:center}
${S} .cs5-tabs button.on .cs5-ti{background:#217A78;color:#fff}
${S} .cs5-tn{font-size:11px;border-radius:99px;padding:0 7px;background:#EFEBE4;color:#4A453D}
${S} .cs5-tn.a{background:#FCF0D6;color:#6F4A05;border:1px solid #EFD49A}
${S} .cs5-g{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:16px;align-items:start}
${S} .cs5-g1{display:flex;flex-direction:column;gap:0;margin-top:14px;max-width:980px}
${S} .cs5-main{min-width:0}
${S} .cs5-rail{position:sticky;top:0;display:flex;flex-direction:column;gap:0}
${S} .cs5-card{background:#fff;border:1px solid #E6E1D9;border-radius:12px;padding:14px 16px;margin-bottom:14px}
${S} .cs5-ch{display:flex;align-items:baseline;justify-content:space-between;gap:6px 12px;margin-bottom:10px;flex-wrap:wrap}
${S} .cs5-ch h3{margin:0;font-size:15px;font-weight:700}
${S} .cs5-ch>span{font-size:12px;color:#6B665E}
${S} .cs5-cap{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700;margin-bottom:8px}
${S} .cs5-p{margin:0 0 10px;font-size:13.5px;line-height:1.55}
${S} .cs5-why{margin:8px 0 0;font-size:13px;line-height:1.5;color:#2B3038}
${S} .cs5-q{font-size:12px;color:#6B665E;line-height:1.45}
${S} .cs5-uts{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px}
${S} .cs5-ut{border:1px solid #E6E1D9;border-radius:10px;padding:8px 10px;background:#FBFAF7;min-width:0}
${S} .cs5-ut span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#6B665E;font-weight:700}
${S} .cs5-ut b{display:block;font-size:22px;line-height:1.25;color:#151B24;white-space:nowrap}
${S} .cs5-ut small{display:block;font-size:11.5px;color:#6B665E;line-height:1.3}
${S} .cs5-ut.rem{background:#F1F8F4;border-color:#BFDCCB}
${S} .cs5-ut.rem.low{background:#FCF0D6;border-color:#EFD49A}
${S} .cs5-ut.rem.low b{color:#8A4B0F}
${S} .cs5-ut.req{border-style:dashed;background:#fff}
${S} .cs5-ubar{display:flex;height:22px;border-radius:7px;overflow:hidden;background:#E9E4DB;margin-top:12px}
${S} .cs5-ubar i{display:flex;align-items:center;height:100%;min-width:0;font-style:normal}
${S} .cs5-ubar i em{font-style:normal;font-size:11.5px;font-weight:700;padding:0 8px;white-space:nowrap;overflow:hidden}
${S} .cs5-ubar .u{background:#2F6F5E;color:#fff}
${S} .cs5-ubar .r{background:#CFE6D9;color:#1E5C3C;justify-content:flex-end}
${S} .cs5-ubar .r.low{background:#F2C76E;color:#5A3A04}
${S} .cs5-upace{margin-top:10px;font-size:13px;line-height:1.55;background:#F6F3EE;border-radius:8px;padding:8px 11px}
${S} .cs5-upace .cs5-q{display:block;margin-top:2px}
${S} .cs5-urule{margin-top:10px;border-top:1px solid #F0ECE5;padding-top:10px;font-size:12.5px;line-height:1.5;display:flex;flex-direction:column;gap:5px}
${S} .cs5-urs{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;color:#6B665E;font-size:12px}
${S} .cs5-ev{width:100%;border-collapse:collapse;font-size:13px}
${S} .cs5-ev th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#6B665E;padding:0 10px 6px 0;border-bottom:1px solid #E6E1D9;font-weight:700}
${S} .cs5-ev td{padding:9px 10px 9px 0;border-bottom:1px solid #F0ECE5;vertical-align:top;line-height:1.45}
${S} .cs5-ev td:first-child{font-weight:600;width:150px}
${S} .cs5-ev td:last-child{width:118px;padding-right:0}
${S} .cs5-cites{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;align-items:center}
${S} .cs5-dh{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
${S} .cs5-dh>div:first-child{display:flex;flex-direction:column;gap:2px}
${S} .cs5-dh b{font-size:14.5px}
${S} .cs5-dh span{font-size:12px;color:#6B665E}
${S} .cs5-sec{background:#fff;border:1px solid #E6E1D9;border-left:4px solid #C7D7EC;border-radius:10px;padding:12px 14px;margin-bottom:10px;scroll-margin-top:8px}
${S} .cs5-sec.k-ehr{border-left-color:#8FC3A6}
${S} .cs5-sec.k-ai{border-left-color:#8EB0DA}
${S} .cs5-sec.k-need{border-left-color:#E0B860}
${S} .cs5-sec.ok{border-left-color:#2F8F5B;background:#FBFDFB}
${S} .cs5-sec.ed{box-shadow:0 0 0 2px #F0B44C}
${S} .cs5-sh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
${S} .cs5-n{width:24px;height:24px;border-radius:50%;background:#EFEBE4;color:#4A453D;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px}
${S} .cs5-sec.ok .cs5-n{background:#2F8F5B;color:#fff}
${S} .cs5-sh h4{margin:0;font-size:14.5px;font-weight:700;flex:1;min-width:150px}
${S} .cs5-tx{font-size:13.5px;line-height:1.6;margin-top:8px}
${S} .cs5-tx p{margin:0 0 6px}
${S} .cs5-fl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 16px;margin-top:10px;font-size:13px;line-height:1.4}
${S} .cs5-fl span{display:block;font-size:10.5px;color:#6B665E;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
${S} .cs5-docs{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column}
${S} .cs5-docs li{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:6px 0;border-top:1px solid #F0ECE5;font-size:13px}
${S} .cs5-docs li b{flex:0 0 210px}
${S} .cs5-docs li span{flex:1 1 180px}
${S} .cs5-docs li em{font-style:normal}
${S} .cs5-docs li:first-child{border-top:0}
${S} .cs5-docs li span{color:#4A453D}
${S} .cs5-rv{margin:8px 0;padding-left:18px;font-size:13px;line-height:1.6}
${S} .cs5-note{font-size:12.5px;color:#4A453D;background:#F6F3EE;border-radius:6px;padding:6px 9px;margin-top:8px;line-height:1.45}
${S} .cs5-rl{margin-top:6px}
${S} .cs5-rd{margin-top:8px;font-size:12.5px}
${S} .cs5-rd summary{cursor:pointer;color:#1D4F43;font-weight:600}
${S} .cs5-ce{border:1px solid #BFDCCB;background:#F1F8F4;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:13.5px;line-height:1.5;white-space:pre-wrap}
${S} .cs5-cel{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#4A453D;margin-bottom:4px;white-space:normal}
${S} .cs5-nd{border:1px dashed #E0B860;background:#FFFBF1;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:13px;display:flex;gap:8px 10px;align-items:center;flex-wrap:wrap;line-height:1.45}
${S} .cs5-ndt{flex:1 1 300px}
${S} .seg5{display:inline-flex;border:1px solid #D9D4CC;border-radius:8px;overflow:hidden;background:#fff}
${S} .seg5 button{border:0;background:#fff;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;color:#151B24}
${S} .seg5 button+button{border-left:1px solid #D9D4CC}
${S} .seg5 button.on{background:#1D4F43;color:#fff}
${S} .cs5-src{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:9px;font-size:11.5px;color:#6B665E}
${S} .cs5-src>span:first-child{font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:10.5px;margin-right:2px}
${S} .cs5-sf{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
${S} .cs5-sf .sp{flex:1}
${S} .cs5-by{font-size:12.5px;color:#1E5C3C;font-weight:600}
${S} .cs5-by i{font-style:normal}
${S} .cs5-lb{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;margin-top:10px;color:#151B24}
${S} .cs5-lb textarea,${S} .cs5-lb input{font-weight:400}
${S} .cs5-lb input{max-width:260px}
${S} .cs5-mi{background:#fff;border:1px solid #EFD49A;border-left:4px solid #D69A1F;border-radius:12px;padding:12px 16px;margin-bottom:12px;scroll-margin-top:8px}
${S} .cs5-mi.done{border-color:#BFDCCB;border-left-color:#2F8F5B}
${S} .cs5-mdl{display:grid;grid-template-columns:120px minmax(0,1fr);gap:8px 14px;margin:10px 0 0;font-size:13px;line-height:1.5}
${S} .cs5-mdl dt{color:#6B665E;font-weight:700;font-size:12px}
${S} .cs5-mdl dd{margin:0;min-width:0}
${S} .cs5-mdl .rq5:first-child{padding-top:0}
${S} .cs5-bn{border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.45;margin-bottom:12px;display:flex;gap:10px;align-items:center}
${S} .cs5-bn.g{background:#E3F1EA;border:1px solid #BFDCCB;color:#1E3F2E}
${S} .cs5-bn.a{background:#FCF6E8;border:1px solid #EFD49A}
${S} .cs5-bn.b{background:#F4F8FC;border:1px solid #C7D7EC;color:#1B3A5C}
${S} .cs5-pr{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:7px;font-size:13px}
${S} .cs5-pr li{display:flex;gap:8px;align-items:flex-start;line-height:1.35}
${S} .cs5-pr li i{font-style:normal;flex:0 0 18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10.5px;background:#fff;color:transparent;border:2px solid #E0B860;box-sizing:border-box}
${S} .cs5-pr li.ok i{background:#2F8F5B;color:#fff;border-color:#2F8F5B}
${S} .cs5-pr li .lnk5{text-align:left;font-weight:500;color:#151B24;text-decoration:none}
${S} .cs5-pr li .lnk5:hover{text-decoration:underline}
${S} .cs5-act{display:flex;flex-direction:column;gap:6px}
${S} .cs5-act .btn{width:100%}
${S} .cs5-la{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:12.5px}
${S} .cs5-la b{display:block;font-weight:600;line-height:1.35}
${S} .cs5-la span{color:#6B665E;font-size:11.5px}
${S} .cs5-chn{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:13px;margin:6px 0 10px}
${S} .cs5-chn>span:first-child{color:#6B665E}
${S} .cs5-rt{list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:9px}
${S} .cs5-rt li{display:flex;gap:10px;align-items:center;font-size:13.5px;opacity:.3;animation:cs5in .25s ease forwards;animation-delay:calc(var(--i) * 260ms)}
${S} .cs5-rt li i{font-style:normal;width:18px;height:18px;border-radius:50%;background:#2F8F5B;color:#fff;font-size:10.5px;display:inline-flex;align-items:center;justify-content:center}
${S} .cs5-rt li span{color:#6B665E;font-size:12.5px}
${S} .cs5-reads{list-style:none;margin:0 0 4px;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${S} .cs5-reads li{border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px;background:#FBFAF7;display:flex;flex-direction:column;font-size:13px}
${S} .cs5-reads li span{color:#6B665E;font-size:12px}
${S} .cs5-ok{display:flex;gap:10px;align-items:flex-start;background:#E3F1EA;border-radius:10px;padding:10px 12px;color:#1E3F2E}
${S} .cs5-ok i{font-style:normal;font-weight:700}
${S} .cs5-ok div{display:flex;flex-direction:column;gap:2px;font-size:13.5px}
${S} .cs5-ok span{font-size:12.5px;color:#3E5A4C}
@keyframes cs5in{to{opacity:1}}
@media (prefers-reduced-motion: reduce){${S} .cs5-rt li{animation:none;opacity:1}}
`;
  }
})();
