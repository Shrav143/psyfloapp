/* F2: Lauris Intake = Comprehensive Needs Assessment (CNA), three printed pages as one scrolling Online Forms Entry page,
   built with the form kit (PSY.lf). Registers `lauris-cna` (replaces the older one in 67-cna-isp.js).
   Child: ?c=4492 (T.W., default). Other children get the same form with a short generic conversation and never touch T.W.'s flow.
   Content (conversation, Scribe values, recommendations for Scan & Enhance) lives in 69-intake-data.js. */
(function () {
  'use strict';
  const PSY = window.PSY; if (!PSY || !PSY.lf) return;
  const K = PSY.lf; const esc = PSY.esc; const D = () => PSY.cna || { lines: () => [], values: () => ({}), recs: () => [] };
  const ID = 'cna'; const TW = '4492'; const ROUTE = 'lauris-cna';

  const pg = (n, sub) => ({ t: 'note', text: '<div class="cna-pg"><b>Page ' + n + '</b><span>of 3 · ' + sub + '</span></div>' });
  const ta = (k, l, rows, x) => Object.assign({ k, l, t: 'area', rows: rows || 3 }, x || {});
  const tx = (k, l, x) => Object.assign({ k, l, t: 'text' }, x || {});
  const MS = (k, l) => tx('ms.' + k, l);

  const schoolOf = (c) => (c.id === TW ? 'Lynchburg City · MS-2 · 6th grade' : c.school);
  const insOf = (c) => (c.id === TW ? 'Humana Healthy Horizons in Virginia · ID on file' : ((PSY.data.payers[c.payer] || {}).name || 'on file') + ' · ID on file');
  const apprOf = (c) => (c.id === TW ? 'None yet · initial TDT (H2016) request to follow' : (c.units != null ? 'Active · ' + (c.auth || 'on file') : 'None on file'));

  K.define(ID, {
    title: 'Comprehensive Needs Assessment',
    approver: 'Clinical Supervisor', approverName: 'Clinical Supervisor · Harvest',
    items: [
      /* ---------------- page 1 ---------------- */
      pg(1, 'Harvest Outreach Center · Comprehensive Needs Assessment'),
      { h: 'Client and Referral' },
      tx('cname', 'Client Name:', { auto: (c) => c.ini }),
      tx('cid', 'Client ID:', { auto: (c) => c.id }),
      tx('cdob', 'Client DOB:', { auto: (c) => 'on file · age ' + c.age }),
      tx('svcappr', 'Service Approval:', { auto: apprOf }),
      tx('ins', 'Insurance and ID:', { auto: insOf }),
      { k: 'atype', l: 'Assessment Type:', t: 'select', opts: ['Initial', 'Annual', 'Addendum'], req: true },
      { k: 'setting', l: 'Setting:', t: 'select', opts: ['School', 'HOC', 'Telehealth', 'Community'], req: true },
      tx('cdate', 'Current Date:', { t: 'date', auto: () => '10/29/2026' }),
      tx('service', 'Service:', { auto: () => 'Therapeutic Day Treatment' }),
      ta('reason', 'Presenting Issue/Reason for Referral:', 4, { req: true }),

      { h: 'Behavioral Health History/Hospitalizations' },
      ta('mhhx', 'Mental Health History (Include Hospitalizations, Diagnoses Given, Etc.):', 3),
      ta('mhfam', 'Mental Health History of Family Members:', 2),
      { k: 'prev', l: 'Previous Interventions:', t: 'table', cols: ['Mental Health Treatment', 'Provider', 'Dates of Service', 'Response to Treatment'],
        rows: ['Psychiatric services', 'Case Management', 'Outpatient Counseling', 'Intensive In-Home', 'Therapeutic Day Treatment', 'Therapeutic Mentoring', 'Out of home placement', 'DSS Involvement', 'School Counseling', 'Other:'] },

      { h: 'Medical Profile' },
      ta('medh', 'Significant past and present medical problems, illnesses, injuries, sexual health and reproductive history, and any current physical complaints:', 3),
      ta('medfam', 'Significant serious illnesses and/or chronic conditions in the family:', 2),
      ta('allergy', 'Food, drug, and other allergies:', 2),
      ta('fall', 'Fall risk, communication needs, mobility and adaptive equipment needs:', 2),
      ta('trauma', 'Trauma History (abuse, neglect, sexual or domestic violence, natural disasters, systemic discrimination, racism, medical trauma, accidents, death of loved one, etc.):', 3, { req: true }),
      { k: 'meds', l: 'Medications List:', t: 'table', cols: ['', 'Current Medications', 'Dosage', 'Frequency', 'Prescriber/Contact Information'], rows: ['1', '2', '3', '4', '5'] },

      { h: 'Developmental History' },
      ta('devirr', 'Affect/level of irritability as an infant and toddler:', 2),
      ta('devhold', 'Interest in being held, fed, played with, and parent’s ability to meet these needs:', 2),
      ta('devview', 'Parents view of early childhood:', 2),
      ta('devdelay', 'Developmental delays:', 2),
      ta('devbirth', 'Birth complications:', 2),

      /* ---------------- page 2 ---------------- */
      pg(2, 'Education, living situation, strengths, mental status, diagnosis'),
      { h: 'Educational/Vocational Status' },
      tx('school', 'Current school and grade:', { auto: schoolOf }),
      ta('iep', 'Special education/IEP status/504 plan:', 2),
      ta('acad', 'Academic performance, behaviors, suspensions, expulsions, tardiness, attendance, peer relationships, and changes in academic functioning related to stressors:', 5),
      tx('emp', 'Employment: (include employer, job title, duties, dates, and reasons for leaving):', { auto: (c) => (c.age < 14 ? 'Not applicable (age ' + c.age + ').' : '') }),

      { h: 'Current Living Situation, Family History, and Relationships' },
      ta('routine', 'Daily routine, structure, and sleeping patterns:', 2),
      ta('housing', 'Housing arrangements:', 2),
      ta('finance', 'Financial resources and benefits:', 2),
      ta('famhx', 'Significant family history that includes family conflicts, relationships, and other interactions that affect family functioning:', 3),

      { h: 'Legal Status' },
      ta('legal', 'Guardianship, incarcerations, charges, court hearings, probation, past convictions, etc.:', 2),

      { h: 'Drug and Alcohol Profile' },
      ta('subs', 'History of client substance use that includes substance, frequency, duration, and treatment:', 2),
      ta('famsubs', 'History of family substance use that includes substance, frequency, duration, and treatment:', 2),

      { h: 'Resources and Strengths' },
      ta('strengths', 'Strengths, needs, abilities, and preferences:', 3),
      ta('extra', 'Extracurricular, community and social activities:', 2),
      ta('extfam', 'Extended family and social supports:', 2),
      ta('culture', 'Cultural/Spiritual views:', 2),

      { h: 'Mental Status Profile' },
      MS('ori', 'Orientation:'), MS('app', 'General Appearance:'), MS('dress', 'Dress:'), MS('motor', 'Motor Activity:'),
      MS('insight', 'Insight:'), MS('judg', 'Judgment/Impulse Control:'), MS('mem', 'Memory:'), MS('att', 'Attention/Concentration:'),
      MS('thought', 'Thought Process:'), MS('interview', 'Interview Behavior:'), MS('speech', 'Speech:'), MS('mood', 'Mood:'),
      MS('affect', 'Affect:'), MS('content', 'Thought Content:'), MS('percep', 'Perception:'), MS('func', 'Functional Status:'),

      { h: 'Diagnosis' },
      { k: 'dx', l: 'Diagnosis', t: 'dx', n: 3, req: true, human: true },
      ta('dsmc', 'DSM V Comments:', 2, { auto: () => 'N/A' }),
      ta('justif', 'Diagnostic justification and/or assessment measures:', 4, { human: true }),
      { k: 'src', l: 'Sources of clinical data:', t: 'checks', opts: ['Intake Assessment', 'DSM Cross Cutting Measure', 'Medical Record', 'School Record', 'Depression Screening', 'Substance Abuse Evaluation', 'Other'] },
      tx('srcother', 'Other:', { auto: () => 'N/A' }),

      { h: 'Professional Comprehensive Needs Assessment Summary and Clinical Formulation' },
      ta('summ', 'Overall summary addressing the causes of the presenting treatment issues, treatment options, and outcomes:', 7, { req: true, human: true }),
      ta('barr', 'Potential barriers to progress:', 3),

      /* ---------------- page 3 ---------------- */
      pg(3, 'Barriers, recommended care, signatures'),
      { k: 'bar', l: 'Potential barriers (check all that apply):', t: 'checks', human: true, opts: ['Non-compliance with treatment', 'History of multiple behavioral diagnoses', 'Past psychiatric hospitalizations', 'Suicidal or homicidal', 'Imminent risk of harm'] },

      { h: 'Recommended Care and Treatment Goals' },
      { k: 'svc', l: 'Service Recommendations:', t: 'checks', human: true, opts: ['Therapeutic Day Treatment', 'Outpatient Counseling', 'Crisis Stabilization', 'Case Management', 'Psychiatric Services', 'Substance Use Treatment'] },
      ta('disch', 'Treatment Goals and Discharge Criteria:', 5),

      { h: 'Signatures' },
      { t: 'sig', k: 'staff', title: 'Harvest Staff', fields: [['Signature', 'pad'], ['Credentials', 'LPC'], ['Position', 'Assistant Clinical Support Supervisor'], ['Date', '10/29/2026']] },
      { t: 'sig', k: 'sup', title: 'Clinical Supervisor', fields: [['Signature', 'pad'], ['Credentials', ''], ['Date', '']] },
    ],
  });

  /* ---------- recommendations (Scan & Enhance) ---------- */
  K.recs(ID, (c) => D().recs(c));

  /* ---------- Process Form ---------- */
  const seeItOf = (c) => (c.case && PSY.can('platform') ? { to: PSY.platform.caseRoute(c.case), label: 'See it in Psyflo', text: '' } : null);
  const onProcess = (root, c) => {
    if (c.id === TW) {
      if (PSY.flowRank() < 2) { PSY.state.flow.tw = 'cna'; PSY.save(); }
      PSY.log('R-0416', 'Comprehensive Needs Assessment processed in Lauris; waiting for the Clinical Supervisor co-sign.');
    } else if (c.case) PSY.log(c.case, 'Comprehensive Needs Assessment processed in Lauris; waiting for the Clinical Supervisor co-sign.');
    if (seeItOf(c)) PSY.ext.seeIt(root, seeItOf(c));
  };

  /* what is left for the clinician, in plain words (the kit lists only the required boxes); get(key) reads the Scribe's captured values first */
  const tidy = (s) => String(s || '').replace('Trauma History (abuse', 'Trauma History').replace('Overall summary addressing the causes of the presenting treatment issues', 'Overall summary');
  const leftFor = (c, get) => {
    get = get || ((k) => K.val(ID, c, k));
    const out = K.leftItems(ID, c, get).map((x) => ({ k: x.k, label: tidy(x.label) }));
    const none = (k, n) => { for (let i = 0; i < n; i++) if (get(k + '.' + i) === '1') return false; return true; };
    const di = out.findIndex((x) => x.label === 'Diagnosis');
    if (!String(get('justif') || '').trim() && di >= 0) out.splice(di + 1, 0, { k: 'justif', label: 'Diagnostic justification' });
    if (none('bar', 5)) out.push({ k: 'bar', label: 'Risk checks' });
    if (none('svc', 6)) out.push({ k: 'svc', label: 'Service recommendations' });
    out.push({ k: 'staff', label: 'Signatures' });
    return out;
  };
  /* ---------- Scribe (round 8: type 'intake'; the captured values are edited in the extension, then saved into the form) ---------- */
  K.scribe(ROUTE, ID, { type: 'intake', defaultC: TW, lines: (c) => D().lines(c), values: (c) => D().values(c), left: leftFor });

  /* ---------- the page ---------- */
  PSY.register({
    id: ROUTE, app: 'lauris', label: 'Intake (CNA)',
    tabTitle: 'Lauris Online — Intake (CNA)',
    url: (p) => 'consumers/' + ((p && p.c) || TW) + '/session/cna',
    css: `
.cna-pg{display:flex;align-items:baseline;gap:10px;margin:18px 0 2px;padding:6px 10px;background:#E4E8EF;border-left:4px solid #1F3B6B;color:#333;font-size:12px}
.cna-pg b{color:#1F3B6B;font-size:13px}
[data-lf="cna"] [data-row="meds"] td.lf-rl{width:34px;text-align:center;padding:5px 2px;color:#666}
[data-lf="cna"] [data-row="meds"] th:first-child{width:34px}
[data-lf="cna"] .lf-hd .lf-r{padding:2px 0}
[data-lf="cna"] textarea.lf-cell{display:block;resize:none;overflow:hidden;field-sizing:content;line-height:1.35;min-height:34px;padding:7px 8px;background:transparent}
[data-lf="cna"] .lf-t td:has(textarea.a){background:#FFF8E6}
[data-lf="cna"] [data-row="sup"] .lf-in{background:#ECEEF1;border-color:#CDD1D7}
`,
    render(params) {
      const c = K.child(params, TW);
      return K.page({ id: ID, c, context: 'Comprehensive Needs Assessment · ' + esc(c.ini) });
    },
    mount(root, ctx) {
      const c = K.child(ctx.params, TW);
      K.mount(root, { id: ID, c, onProcess, route: ROUTE });
      /* Lauris labels the diagnosis box with a colon, like the other labels */
      root.querySelectorAll('[data-row="dx"] > label > span').forEach((s) => { const t = s.firstChild; if (t && t.nodeType === 3 && !/:\s*$/.test(t.nodeValue)) t.nodeValue = t.nodeValue.trimEnd() + (t.nextSibling ? ': ' : ':'); });
      /* table cells hold sentences: use boxes that grow instead of one-line inputs (same keys, the kit does not notice) */
      root.querySelectorAll('input.lf-cell').forEach((i) => { const t = document.createElement('textarea'); t.className = i.className; t.rows = 2; t.setAttribute('data-f', i.dataset.f); t.setAttribute('aria-label', i.getAttribute('aria-label') || ''); t.value = i.value; i.replaceWith(t); });
      /* the kit cuts a long label at its first comma; show the short names in the banner */
      const fix = (el) => { if (el && /Trauma History \(abuse|Overall summary addressing/.test(el.innerHTML)) el.innerHTML = tidy(el.innerHTML); };
      const watch = (el) => { if (!el) return; new MutationObserver(() => fix(el)).observe(el, { childList: true, subtree: true, characterData: true }); };
      watch(root.querySelector('[data-psy="lf-banner"]'));
      K.paintReview(root, ID, c);
      /* the panel opens beside the form the first time you start this intake */
      const fk = 'cna.opened.' + c.id; if (!PSY.flag(fk)) { PSY.flag(fk, true); PSY.ext.reveal('notes'); }
      if (K.st(ID, c).processed && seeItOf(c)) PSY.ext.seeIt(root, seeItOf(c));
    },
  });
})();
