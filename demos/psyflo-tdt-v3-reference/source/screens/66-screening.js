/* F1: Lauris Admission Screening, built from the real Lauris form with the form kit (PSY.lf, src/lf-kit.js).
   Route: lauris-screening?c=4492 (T.W., 12). Other consumer ids get the same form with their own header and a short generic call.
   Pieces: schema 'adm' (printed order, exact Lauris labels) · page (Lauris chrome + form + panel) · Scribe (call transcript + the values it captures)
   · recommendations (improvements that help the Administrative Director and the later DMAS request; shown by Scan & Enhance).
   State: PSY.state.lf['adm|<id>'] = { v, s, processed, recs, opened } (kit) · PSY.state.scribe['lauris-screening|<id>'] (Scribe) · PSY.state.flow.tw ('screened'). */
(function () {
  const PSY = window.PSY; if (!PSY || !PSY.lf || !PSY.scribe) return;
  const K = PSY.lf; const esc = PSY.esc; const TW = '4492'; const ID = 'adm'; const ROUTE = 'lauris-screening';

  /* ---------- per-child facts: T.W. is the demo child; others get what the roster knows ---------- */
  const meta = (c) => (PSY.l2 && PSY.l2.meta && c.case ? PSY.l2.meta(c.case) : null) || {};
  const isTW = (c) => c.id === TW;
  const gender = (c) => (isTW(c) ? 'Male' : meta(c).gender || '');
  const guardian = (c) => (isTW(c) ? 'Grandmother (legal guardian)' : meta(c).guard || 'Parent (legal guardian)');
  const csz = (c) => (/^Campbell/.test(c.school) ? 'Rustburg, VA 24588' : 'Lynchburg, VA 24501');
  const DOCS = ['Face to Face Assessment', 'School report', 'VICAP assessment', 'Physician report', 'Hospital Discharge Summary', 'Other'];
  const SVCS = ['Therapeutic Day Treatment', 'Psychiatric Care', 'Outpatient Counseling', 'Targeted Case Management', 'Intensive In-Home Services', 'Other'];

  /* ---------- the form: printed order, exact labels ---------- */
  K.define(ID, {
    title: 'Admission Screening', approver: 'Administrative Director', approverName: 'Maria · Administrative Director',
    items: [
      { h: 'Applicant' },
      { k: 'name', l: 'Name of applicant', t: 'text', req: true, auto: (c) => c.ini },
      { k: 'medicaid', l: 'Medicaid ID', t: 'text', auto: () => 'on file' },
      { k: 'ssn', l: 'SSN', t: 'text', auto: () => 'on file' },
      { k: 'age', l: 'Age', t: 'text', auto: (c) => String(c.age) },
      { k: 'dob', l: 'DOB', t: 'text', auto: () => 'on file' },
      { k: 'gender', l: 'Gender', t: 'select', opts: ['Male', 'Female', 'Other'], auto: gender },
      { k: 'pcp', l: 'Primary Care Physician', t: 'text', auto: () => 'on file' },
      { k: 'meds', l: 'Current Medications', t: 'area', rows: 2 },
      { k: 'guardian', l: 'Name of guardian', t: 'text', auto: guardian },
      { k: 'addr', l: 'Address', t: 'text', auto: () => 'on file' },
      { k: 'csz', l: 'City / State / Zip', t: 'text', auto: csz },
      { k: 'phone', l: 'Phone', t: 'text', auto: () => 'on file' },
      { h: 'Screening' },
      { k: 'initial', l: 'Date of Initial Contact', t: 'date', req: true, auto: (c) => (isTW(c) ? '10/13/2026' : '') },
      { k: 'method', l: 'Method of Screening', t: 'text', req: true },
      { k: 'review_app', l: 'Review of Application', t: 'area', rows: 2 },
      { k: 'docs', l: 'Review of associated documentation', t: 'checks', opts: DOCS },
      { k: 'docs_other', l: 'Other (documentation)', t: 'area', rows: 2 },
      { k: 'needs', l: 'Presenting Needs or Situation, as gathered from a full review of all information gathered', t: 'area', rows: 10, req: true },
      { k: 'meets', l: 'Does the individual meet admission criteria?', t: 'select', opts: ['Yes', 'No'], req: true, human: true },
      { h: 'Diagnosis' },
      /* the kit treats req on a dx item as "every box"; the first box carries the requirement, the other five are optional */
      { k: 'dx', l: 'DSM V / Diagnosis', t: 'dx', n: 1, req: true, human: true },
      { k: 'dxm', l: 'Additional diagnoses', t: 'dx', n: 5, human: true },
      { k: 'dsmc', l: 'DSM V Comments', t: 'area', rows: 2 },
      { h: 'Services' },
      { k: 'svc', l: 'Services recommended', t: 'checks', opts: SVCS },
      { k: 'svc_other', l: 'Other (services)', t: 'text' },
      { k: 'svc_now', l: 'Services currently provided', t: 'area', rows: 3 },
      { k: 'goals', l: 'Recommendations for goals', t: 'area', rows: 3 },
      { k: 'refer', l: 'Referrals made if applicant is not admitted to the program', t: 'area', rows: 2 },
      { k: 'adm_date', l: 'Date of admission or referral', t: 'date' },
      { h: 'Signatures' },
      { t: 'sig', k: 'staff', title: 'Clinical Screening Staff', fields: [['Signature', 'pad'], ['Credentials', 'LPC'], ['Date', '10/29/2026']] },
      { t: 'sig', k: 'appr', title: 'Administrative Director Approval', fields: [['Signature', 'pad'], ['Credentials', ''], ['Date', '']] },
    ],
  });

  /* ---------- T.W.'s presenting needs, built from the facts in the call ----------
     counts:false is the Scribe's first pass (no numbers, no quote). The recommendations (Scan & Enhance) add the numbers and the guardian's words. */
  const QUOTE = '“He doesn’t see what could happen out there.”';
  const NEEDS = (counts, quote) => [
    'T.W., a 12-year-old 6th grader at Lynchburg City MS-2, was referred by the school counselor on 10/13/2026 for physical aggression toward peers that is interfering with learning. His grandmother, his legal guardian since age 4, joined the screening call and confirms the pattern.',
    counts
      ? 'The school documented 6 dated incidents of physical aggression toward peers in the 30 days before the referral, 2 to 3 times a week, lasting 5 to 20 minutes, at moderate intensity, with 2 office referrals.'
      : 'He hits and shoves peers several times a week, and he has been sent to the office more than once.',
    (counts
      ? 'He leaves the building about once a week. On Oct 6 he left for the parking lot and received 1 day of in-school suspension.'
      : 'He leaves the building at times and was suspended in school after the most recent time.') + (quote ? ' His grandmother said, ' + QUOTE : ''),
    'He argues with adults, refuses requests and blames others, at school and at home since last school year. Verbal aggression is frequent. He sleeps poorly and keeps to himself since a change in the household earlier this year. He has never talked about hurting himself; this was asked directly.',
    'He has an IEP and sees a behavior interventionist at school, with no change in behavior. The school has raised a different placement.' +
      (counts ? ' He is passing 4 of 7 classes and has 9 unexcused absences this year.' : '') +
      ' His grandmother is engaged and wants help to keep him in school. He likes basketball and drawing and responds to one trusted adult.',
  ].join('\n\n');
  const SVC_NOW_BASE = 'Behavior interventionist at school, 2 times a week since September 2026.\nIEP supports at school.\nOutpatient counseling has ended.';
  const SVC_NOW_FULL = 'Behavior interventionist at school, 2 times a week since September 2026, ongoing, with no change in incidents.\nIEP supports at school (last review Mar 2026).\nOutpatient counseling at Piedmont Counseling, March to June 2025, 6 sessions. Ended when the family lost transportation. Behavior did not change.';
  const DOCS_OTHER_FULL = 'School referral form from the counselor (10/13/2026); school discipline and attendance record (10/15/2026)';

  /* ---------- the scripted screening call ---------- */
  const J = 'Jordan (Clinician)'; const G = 'Grandmother (Guardian)';
  const TW_LINES = [
    [J, '0:14', 'Thank you for calling in. Before we start, I record this call so my notes are accurate. Is that okay with you?'],
    [G, '0:31', 'Yes, that is fine.'],
    [J, '1:20', 'I have the school’s referral from October 13th. In your own words, what has been happening with T.W. at school?'],
    [G, '2:05', 'He hits and shoves other kids. The school wrote down six times in the last month. It is two or three times a week now, and he has been sent to the office twice.'],
    [J, '5:40', 'How long does it last, and how bad does it get?'],
    [G, '6:10', 'Five to twenty minutes, depending on how fast an adult gets there. Nobody has been badly hurt. The school’s form says moderate.'],
    [J, '10:25', 'Does he ever leave the room or the building?'],
    [G, '10:52', 'About once a week. On October 6th he walked out to the parking lot and got a day of in-school suspension. He doesn’t see what could happen out there.'],
    [J, '15:30', 'How is he with adults, at school and at home? Does he follow directions?'],
    [G, '15:58', 'He argues about everything. He will not do what he is asked, and it is always somebody else’s fault. It has been like this since last school year, at home too.'],
    [J, '20:20', 'What does the school have in place? How is he doing in class and with attendance?'],
    [G, '20:48', 'He has an IEP, last reviewed in March. A behavior interventionist sees him two times a week since September, and nothing has changed. He takes seven classes and is passing four. Nine unexcused absences so far.'],
    [J, '25:05', 'Has he seen anyone outside of school?'],
    [G, '25:30', 'Piedmont Counseling, March to June last year, six visits. We lost our ride and it stopped. It had not changed anything.'],
    [J, '29:10', 'How does he sleep? Has he ever talked about hurting himself?'],
    [G, '29:40', 'He is up at night and keeps to himself since a change in the household this year. No, he has never said anything like that.'],
    [J, '33:15', 'Any health problems or medicines? And has the school talked about a different program?'],
    [G, '33:45', 'He has asthma, an albuterol inhaler when he needs it. No other medicines. The school brought up a different school twice this year, last on October 15th.'],
    [J, '36:20', 'What does he like, and what would you want to see change?'],
    [G, '38:12', 'Basketball and drawing. He listens to one teacher he trusts. I want him to stay in school and stop getting in trouble.'],
  ];
  const GEN_LINES = [
    ['Clinician', '0:18', 'Before we start, I record this call so my notes are accurate. Is that okay with you?'],
    ['Guardian', '0:36', 'Yes, that is fine.'],
    ['Clinician', '1:45', 'Tell me what has been happening at school with {ini}.'],
    ['Guardian', '2:10', 'The school keeps calling about behavior. It is getting in the way of class and we would like help.'],
    ['Clinician', '8:30', 'What has the school tried so far?'],
    ['Guardian', '8:52', 'Meetings with the counselor and a behavior plan. It has not changed much.'],
    ['Clinician', '15:05', 'Has {ini} seen a therapist outside of school? Any medicines?'],
    ['Guardian', '15:30', 'Not yet. We have not had a way to get there. No medicines.'],
    ['Clinician', '19:40', 'Has {ini} ever talked about self-harm or hurting anyone?'],
    ['Guardian', '20:05', 'No. Only yelling when frustrated.'],
  ];
  const lines = (c) => (isTW(c) ? TW_LINES : GEN_LINES).map(([who, t, text]) => ({ t, who, text: text.replace(/\{ini\}/g, c.ini) }));

  /* ---------- what the Scribe types on its first pass (every box that is not a clinical decision) ---------- */
  /* a checkbox list: every box answered, so the unchecked ones show as reviewed (amber) too */
  const checks = (key, n, on) => { const o = {}; for (let i = 0; i < n; i++) o[key + '.' + i] = on.includes(i) ? '1' : ''; return o; };
  const values = (c) => {
    if (isTW(c)) {
      return Object.assign({
        meds: 'Albuterol inhaler as needed for asthma (grandmother reports). No other medicines.',
        method: 'Phone call with guardian, 38 minutes',
        review_app: 'School referral form from the school counselor, received 10/13/2026. Read before the call.',
      }, checks('docs', 6, [5]), {
        docs_other: 'Referral from the school counselor',
        needs: NEEDS(false, false),
        dsmc: 'Preliminary, from a phone screening. The Comprehensive Needs Assessment will confirm.',
      }, checks('svc', 6, [0]), {
        svc_now: SVC_NOW_BASE,
        goals: 'Fewer incidents of physical aggression toward peers. Stay in class and in the building. Use a calming step when frustrated, with an adult close by.',
        refer: 'Not applicable if admitted. If not admitted, a referral to outpatient counseling with help getting a ride.',
        adm_date: '10/16/2026',
      });
    }
    return Object.assign({
      initial: '10/27/2026', meds: 'None reported on the call.', method: 'Phone call with guardian, 21 minutes',
      review_app: 'School referral form received 10/27/2026. Read before the call.',
    }, checks('docs', 6, [1]), {
      needs: c.ini + ' was referred by the school for behavior that is getting in the way of learning. A family member joined the screening call and asked for help. The school has tried meetings with the counselor and a behavior plan, with little change. ' + c.ini + ' has not seen a therapist outside school because the family has had no way to get there. No self-harm statements; this was asked directly.',
      dsmc: 'Preliminary, from a phone screening. The Comprehensive Needs Assessment will confirm.',
    }, checks('svc', 6, [0]), {
      svc_now: 'Meetings with the school counselor and a behavior plan at school.',
      goals: 'Fewer incidents in class. Use a calming step when frustrated, with an adult close by.',
      refer: 'Not applicable if admitted.',
      adm_date: '10/29/2026',
    });
  };

  /* ---------- recommendations (Scan & Enhance): improvements only. The diagnosis and "meets admission criteria" are the LPC's decisions, made in the form:
     Psyflo never suggests a diagnosis or an admission answer (Part 20.1), and no recommendation carries points. ---------- */
  const recDone = (c, id) => K.st(ID, c).recs[id] === 'done';
  K.recs(ID, (c) => {
    const tw = isTW(c);
    const decisions = [];
    if (!tw) {
      return decisions.concat([{ id: 'docs', title: 'Add the school report to the documentation review', keys: ['docs.1'], value: { 'docs.1': '1', docs_other: 'School referral form (10/27/2026)' }, copy: 'School report; School referral form (10/27/2026)' }]);
    }
    return decisions.concat([
      { id: 'counts', title: 'Add the counts to Presenting Needs', keys: ['needs'],
        get value() { return { needs: NEEDS(true, recDone(c, 'quote')) }; }, get copy() { return NEEDS(true, recDone(c, 'quote')); },
        req: 'tdt-clin2', addr: 'Clinical necessity · criterion 1' },
      { id: 'outpt', title: 'State the outpatient outcome in Services currently provided', keys: ['svc_now'], value: { svc_now: SVC_NOW_FULL }, copy: SVC_NOW_FULL,
        req: 'tdt-clin2', addr: 'Clinical necessity · criterion 2' },
      { id: 'quote', title: 'Write the guardian’s words about danger in Presenting Needs', keys: ['needs'],
        get value() { return { needs: NEEDS(recDone(c, 'counts'), true) }; }, get copy() { return NEEDS(recDone(c, 'counts'), true); },
        req: 'tdt-clin2', addr: 'Clinical necessity · criterion 3' },
      { id: 'docs', title: 'Add the school report to the documentation review', keys: ['docs.1', 'docs.5', 'docs_other'],
        value: { 'docs.1': '1', 'docs.5': '1', docs_other: DOCS_OTHER_FULL }, copy: 'School report; Other: ' + DOCS_OTHER_FULL },
    ]);
  });

  /* ---------- Scribe (round 8: type 'admission'; the captured values are edited in the extension, then saved into the form) ---------- */
  K.scribe(ROUTE, ID, { type: 'admission', defaultC: TW, lines, values });

  /* ---------- Process Form ---------- */
  /* "See it in Psyflo" opens the case in the platform (licensed staff and admins only) */
  const seeIt = (c) => (c.case && PSY.can('platform') ? { to: PSY.platform.caseRoute(c.case), label: 'See it in Psyflo', text: '' } : null);
  const onProcess = (root, c) => {
    if (isTW(c)) {
      if (PSY.flowRank() < 1) { PSY.state.flow.tw = 'screened'; PSY.save(); }
      PSY.log('R-0416', 'Admission Screening processed in Lauris; waiting for the Administrative Director.');
    } else if (c.case) PSY.log(c.case, 'Admission Screening processed in Lauris; waiting for the Administrative Director.');
    if (seeIt(c)) PSY.ext.seeIt(root, seeIt(c));
  };

  /* ---------- the page ---------- */
  PSY.register({
    id: ROUTE, app: 'lauris', label: 'Admission Screening',
    url: (p) => 'consumers/' + ((p && p.c) || TW) + '/session/admission',
    /* readonly boxes with no value (Administrative Director's credentials and date) are grey, not green; check lists run inline like the printed form */
    css: '.lf-in[readonly][value=""]{background:#F4F5F7}.lf .lf-c .lf-ck{display:inline-flex;margin:3px 18px 3px 0;padding:2px 5px}',
    render(params) {
      const c = K.child(params, TW);
      return K.page({ id: ID, c, context: 'Admission Screening · ' + esc(c.ini) });
    },
    mount(root, ctx) {
      const c = K.child(ctx.params, TW); const st = K.st(ID, c);
      K.mount(root, { id: ID, c, route: ROUTE, onProcess });
      K.paintReview(root, ID, c);
      if (!st.opened) { st.opened = true; PSY.save(); PSY.ext.reveal('notes'); }
      if (st.processed && seeIt(c)) PSY.ext.seeIt(root, seeIt(c));
    },
  });
})();
