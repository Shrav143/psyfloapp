/* Peer-to-peer preparation (round 9, owner DI-2): the briefs (T.N. · R-0388; also D.W. · R-0402, E.C. · R-0384, J.O. · R-0391), the
   structured discussion guide of the Denial Intelligence workspace (consumer presentation, functional impairment, requested level of care,
   clinical rationale, prior interventions, treatment response, continued medical necessity, questions to clarify with the payer), and the
   editable script (PSY.sync key p2p|<caseId>) saved as approved versions. T.N.'s call is the slot Sentara offered: Dec 9, 2:00 pm.
   Route p2p-notes?case= opens the workspace on this section (Denial Intelligence / <initials>). Every line carries its [source].
   Round 11 (DI11-CASE): the section is one entry of the workspace's menu ("Peer-to-peer script"), shown for every authorization decision. */
(function () {
  const PSY = window.PSY;
  const D = () => PSY.di;
  const DEFAULT = 'R-0388';

  const BRIEFS = {
    'R-0388': {
      who: 'T.N., 8', payerShort: 'Sentara', payerName: 'Sentara Community Plan',
      opening: '“This is Jordan Perez, LPC, license and NPI on the request. I’m calling about an eight-year-old girl at an elementary school in Campbell County who was approved for 65 of the 150 units we requested.”',
      points: [
        { t: 'Difficulty keeping relationships', x: 'Hitting or pushing peers about 3 times a week in the last 30 days (Oct 1, 3, 8, 10, 15, 17, 22, 24, 28), 5 to 10 minutes each, needing staff to separate her. 3 office referrals. Classes: 6, passing 3.', ev: ['Daily notes Oct 1 – 28', 'School behaviour report'] },
        { t: 'Interventions that have not worked', x: 'School counseling weekly since Sep 2025, ongoing, no change. Outpatient Jan to May 2026, 11 sessions, ended by the provider as “not making progress.”', ev: ['CNA · prior services', 'Provider letter'] },
        { t: 'Level of care: risk of a more restrictive setting', x: 'The school raised an alternative placement at the Oct 14 IEP meeting.', ev: ['IEP meeting Oct 14', 'Collateral contact'] },
      ],
      qa: [
        ['“Why can’t the IEP handle this?”', 'The IEP gives her a behaviour plan and seating. It gives her no clinical staff at lunch and transitions, where 6 of the 9 incidents happened.'],
        ['“Is she actively suicidal?”', 'Suicidality is not a TDT criterion. The clinical-necessity and level-of-care items are documented in the CNA and the daily notes.'],
        ['“You can’t be spending 5 hours a day.”', 'Staff log start and stop times on the Time tab. October average: 5 h 12 min a day, including lunch and transitions. I can send the log.'],
        ['“She’s been in services a long time.”', 'Harvest started in Feb 2026. Incidents fell from daily to 3 a week. The goal is once a week before step-down. Progress is the reason to continue.'],
      ],
      ask: 'Approve the remaining 85 units for the requested period, with a review at week 8.',
      open: [['Daily notes Oct 1 – 28', 'DPN'], ['CNA · prior services', 'CNA'], ['IEP meeting Oct 14', 'Collateral'], ['Time log October', 'Time tab']],
      who2: 'Sentara medical director line · number on the call confirmation', reviewer: 'Physician, psychiatry',
    },
    'R-0402': {
      who: 'D.W., 14', payerShort: 'Sentara', payerName: 'Sentara Community Plan',
      opening: '“This is Jordan Perez, LPC, license and NPI on the request. I’m calling about a twelve-year-old boy at a high school in Campbell County who was offered 120 of the 150 units we requested for a concurrent SRA.”',
      points: [
        { t: 'The progress is real, and it still needs staff in the room', x: 'Escalations fell from 4 a week to 2 since August. He used a taught strategy before leaving the room in 3 of 5 escalations, up from 1 of 6. He still needs staff to return to task every school day.', ev: ['Daily notes Aug 18 – Oct 12', 'ISP Sep 24'] },
        { t: 'The risk is at lunch and in transitions', x: 'The ISP changed Sep 24 to name a staff member at lunch and transitions. Three escalations since Sentara’s Oct 27 call were in unstructured time.', ev: ['ISP Sep 24', 'Daily notes since Oct 27'] },
        { t: 'Services tried before did not hold', x: 'Outpatient therapy at Blue Ridge Counseling, Jan to Jun 2025, 12 sessions. It ended on referral to TDT and behaviour continued at school. School counseling is weekly and supportive only.', ev: ['CNA · prior services'] },
      ],
      qa: [
        ['“Why not fewer units?”', 'At 3 units a day, 120 units is about 8 of the 13 weeks requested.'],
        ['“Escalations are down. Is that not enough?”', 'Down from 4 to 2 a week is the reason to continue. The goal is 1 a week before step-down.'],
        ['“Is the family involved?”', 'His mother joined 9 of 12 weekly calls and practices the calm-down plan at home.'],
      ],
      ask: 'Restore the 30 units to 150 for the full request period, with a review at week 8.',
      open: [['Daily notes Aug 18 – Oct 12', 'DPN'], ['ISP Sep 24', 'ISP'], ['CNA · prior services', 'CNA'], ['Direct-hours log', 'Time tab']],
      who2: 'Sentara medical director line · number on the call confirmation', reviewer: 'Physician, psychiatry',
    },
    'R-0384': {
      who: 'E.C., 5', payerShort: 'Anthem', payerName: 'Anthem HealthKeepers Plus',
      opening: '“This is Jordan Perez, LPC, license and NPI on the request. I’m calling about a five-year-old girl at an elementary school in Lynchburg City. Anthem denied 90 units of school-based treatment on Oct 22 as ‘already connected to other services.’”',
      points: [
        { t: 'The services Anthem points to are not daily clinical help', x: 'School counseling is once a week in a small group, 20 minutes. The interventionist is in the classroom twice a week. The IEP check-in is 5 minutes a day. None gives clinical help at lunch or between rooms.', ev: ['CNA Oct 8', 'IEP check-in/check-out'] },
        { t: 'The incidents happen where those services are not', x: '6 incidents in the last 30 days. 4 of the 6 were at lunch or in transitions.', ev: ['Daily notes Oct 1 – 21', 'School behaviour report'] },
        { t: 'A different service was tried and did not help', x: 'Play therapy at Valley Child Services, Feb to Jun 2026, 8 sessions. Behaviour did not change.', ev: ['CNA Oct 8'] },
      ],
      qa: [
        ['“What services does she have now?”', 'Counseling once a week, an interventionist twice a week and a daily check-in. None of them is present at lunch or in transitions.'],
        ['“Why not outpatient?”', 'Play therapy last spring (8 sessions) did not change it. A weekly hour does not cover the school day.'],
        ['“Does the family know about this call?”', 'Her grandmother, the guardian, knows about the denial and about the appeal letter drafted for her.'],
      ],
      ask: 'Overturn the denial and approve the 90 units, or approve 60 units for 8 weeks with a review.',
      open: [['CNA Oct 8', 'CNA'], ['Daily notes Oct 1 – 21', 'DPN'], ['Anthem denial letter Oct 22', 'Availity']],
      who2: 'Anthem physician reviewer line · number on the call confirmation', reviewer: 'Physician, psychiatry',
    },
    'R-0391': {
      who: 'J.O., 14', payerShort: 'Aetna', payerName: 'Aetna Better Health of Virginia',
      opening: '“This is Jordan Perez, LPC, license and NPI on the request. I’m calling about a fourteen-year-old at a middle school in Lynchburg City who was offered 110 of the 150 units we requested on a new initial SRA.”',
      points: [
        { t: 'The first 80 units were used on the plan, not early by choice', x: 'J.O. was seen 3 units a day from the first week because incidents were daily. 80 units lasted 7 weeks.', ev: ['Time log, Sep to Oct', 'SRA'] },
        { t: 'The goals were not met at discharge', x: 'None of the three goals reached 4 of 5 at discharge. The new initial restarts them; the monitoring plan is not in the record yet.', ev: ['ISP'] },
        { t: 'Level of care: risk of a more restrictive setting', x: 'The school has raised a shortened day if incidents continue.', ev: ['IEP', 'CNA'] },
      ],
      qa: [
        ['“Why were the units used so fast?”', 'Daily incidents meant daily staff. It was the plan, and the plan is written down.'],
        ['“Why a new initial and not a concurrent SRA?”', 'He was discharged when the units ran out. After the gap this counts as a new request.'],
        ['“What changes this time?”', 'A monitoring plan, goals he can reach in weeks, and a step-down date.'],
      ],
      ask: 'Restore the 40 units to 150, or at least approve 130 with a review at week 6.',
      open: [['Time log, Sep to Oct', 'Time tab'], ['ISP', 'ISP'], ['IEP', 'Referral']],
      who2: 'Aetna medical director line · number on the call confirmation', reviewer: 'Physician, psychiatry',
    },
  };
  PSY.p2p = { BRIEFS };
  const esc = PSY.esc; const EV = PSY.ev; const A = PSY.auth;
  const DIC = () => PSY.dicase || {};
  const SY = () => PSY.sync;
  const hub = (cid) => (PSY.data.hub || {})[cid] || {};
  const key = (cid) => 'p2p|' + cid;
  const q = (s) => String(s || '').replace(/[“”]/g, '"').replace(/[‘’]/g, '\'');
  const sq = (labels) => (labels || []).map((l) => '[' + l + ']').join(' ');
  const corr = (r) => (D() && D().corrOf ? D().corrOf(r) : 'Payer correspondence');

  /* ---------------- the discussion guide: eight sections, each line with its sources ---------------- */
  const GUIDE = {
    'R-0388': (r) => ({
      presentation: [{ t: 'T.N., 8 · Campbell County ES-1 · Sentara · TDT (H2016). Diagnosis on file: F91.3.', src: ['CNA · prior services'] }, { t: 'Hits or pushes peers about 3 times a week (was daily); verbal outbursts daily.', src: ['Daily notes Oct 1 – 28'] }],
      impairment: [{ t: 'Hitting or pushing peers on 9 dated days in October, 5–10 minutes each, needing staff to separate her; 3 office referrals; passing 3 of 6 classes.', src: ['Daily notes Oct 1 – 28', 'School behaviour report'] }],
      level: [{ t: 'TDT, school day, 3 units a day. 150 units requested for Oct 5 – Jan 1; 65 approved, 85 not approved.', src: ['Call log Oct 27'] }, { t: 'October average 5 h 12 min a day, including lunch and transitions (3 units = 5 or more hours).', src: ['Time log October'], rule: 'tdt-units' }],
      rationale: [{ t: 'The IEP gives a behaviour plan and seating; no clinical staff at lunch and transitions, where 6 of 9 incidents happened.', src: ['IEP meeting Oct 14', 'Daily notes Oct 1 – 28'] }, { t: 'Risk of a more restrictive setting: the school raised an alternative placement on Oct 14.', src: ['IEP meeting Oct 14'], rule: 'tdt-loc1' }],
      prior: [{ t: 'School counseling weekly since Sep 2025, ongoing, no change. Outpatient therapy Jan – May 2026, 11 sessions, closed by the provider as “not making progress”.', src: ['CNA · prior services'] }],
      response: [{ t: 'Incidents a week: Feb 7, Jun 5, Sep 4, Oct 3.', src: ['Daily notes'] }, { t: 'Her mother joins the weekly calls and the IEP meetings.', src: ['Contact notes'] }],
      necessity: [{ t: '9 of 65 units left; the authorization ends Nov 20, before the Dec 9 call.', src: ['SRA'] }, { t: 'The goal before step-down is once a week; incidents are at 3 a week.', src: ['Daily notes'] }],
      questions: ['Which criterion did the decision apply to the 85 units not approved?', 'What record of daily service hours does Sentara accept for 3 units a day?', 'If more units are approved, from what date do they apply? The authorization ends Nov 20.', 'Is an earlier peer-to-peer slot available before the units run out?', 'If the decision stands, what is the next review step and its time limit?'],
    }),
  };
  /* any other case: the brief's points, the hub's record facts and the payer's stated reasons */
  function genericGuide(r) {
    const b = BRIEFS[r.case] || {}; const h = hub(r.case); const p = h.picture || {}; const u = r.u || A.units(r.case); const pts = b.points || [];
    const lines = (arr) => arr.filter(Boolean);
    return {
      presentation: lines([{ t: r.who + ' · ' + (r.school || '') + ' · ' + r.payerShort + ' · ' + r.serviceLabel + (p.diagnosis ? '. Diagnosis on file: ' + p.diagnosis.code + '.' : '.'), src: ['CNA'] }].concat((p.behaviours || []).slice(0, 2).map((x) => ({ t: x.name + ': ' + x.freq + ', ' + x.dur + '.', src: ['CNA'] })))),
      impairment: lines([pts[0] ? { t: pts[0].x, src: pts[0].ev } : null].concat(p.school ? [{ t: Object.keys(p.school).map((k) => k + ' ' + p.school[k]).join('; ') + '.', src: ['School behaviour report'] }] : [])),
      level: lines([{ t: r.serviceLabel + '. ' + r.requested + ' units requested' + (u.period ? ' for ' + u.period : '') + '; ' + (r.approved || 0) + ' ' + (r.issue === 'reduction' ? 'offered' : 'approved') + '.', src: [corr(r)] }, pts[2] ? { t: pts[2].t + '. ' + pts[2].x, src: pts[2].ev } : null]),
      rationale: ((DIC().analysis ? DIC().analysis(r).documented : []) || []).slice(0, 2).map((x) => ({ t: x.t, src: x.src })),
      prior: (p.priorServices || []).map((x) => ({ t: x.who + ', ' + x.when + ': ' + x.out + '.', src: ['CNA'] })),
      response: lines([p.trend ? { t: p.trend.label + ': ' + p.trend.pts.map((x) => x.d + ' ' + x.v).join(', ') + '.', src: [/school/i.test(p.trend.note) ? 'School behaviour report' : 'Daily notes'] } : null, p.engagement ? { t: p.engagement.text, src: ['Contact notes'] } : null]),
      necessity: lines([u.current ? { t: u.current.remaining + ' of ' + u.current.authorized + ' units left; the authorization ends ' + u.current.end + '.', src: ['SRA'] } : { t: 'No authorization in force for this request.', src: ['SRA'] }, pts[1] ? { t: pts[1].t + '. ' + pts[1].x, src: pts[1].ev } : null]),
      questions: ['Which criterion did the decision apply' + (r.approved ? ' to the ' + ((r.requested || 0) - (r.approved || 0)) + ' units not approved' : '') + '?', 'Which records would answer the stated reason?', 'If the decision stands, what is the next review step and its time limit?'],
    };
  }
  const guide = (r) => (GUIDE[r.case] ? GUIDE[r.case](r) : genericGuide(r));
  const SECS = [['presentation', 'Consumer presentation'], ['impairment', 'Functional impairment'], ['level', 'Requested level of care'], ['rationale', 'Clinical rationale'],
    ['prior', 'Prior interventions'], ['response', 'Treatment response'], ['necessity', 'Continued medical necessity'], ['questions', 'Questions to clarify with the payer']];

  /* the call: the slot on file (T.N.: Dec 9, 2:00 pm, offered by Sentara on Oct 27) or what staff recorded */
  const callOf = (r) => (D() && D().p2pOf ? D().p2pOf(r) : null) || {};
  /* the editable script, built from the guide and the brief */
  function scriptText(r) {
    const b = BRIEFS[r.case] || {}; const g = guide(r); const c = callOf(r); const gaps = DIC().gaps ? DIC().gaps(r) : [];
    const L = [];
    L.push('PEER-TO-PEER SCRIPT · ' + r.who + ' · ' + r.payerName);
    L.push('Call: ' + (c.date ? c.date + (c.time ? ', ' + c.time : '') : '[date to be scheduled]') + (b.who2 ? ' · ' + b.who2.split(' · ')[0] : '') + (b.reviewer ? ' · reviewer: ' + b.reviewer : '') + (c.src ? ' [' + corr(r) + ']' : ''));
    L.push('');
    if (b.opening) { L.push('OPENING'); L.push(q(b.opening)); L.push(''); }
    L.push('KEY POINTS');
    (b.points || []).forEach((p, i) => L.push((i + 1) + ') ' + p.t + '. ' + p.x + ' ' + sq(p.ev)));
    if (!(b.points || []).length) ['impairment', 'rationale', 'necessity'].forEach((k, i) => (g[k] || []).slice(0, 1).forEach((x) => L.push((i + 1) + ') ' + q(x.t) + ' ' + sq(x.src))));
    L.push('');
    if ((b.qa || []).length) { L.push('IF THE REVIEWER ASKS'); b.qa.forEach((x) => L.push('- ' + q(x[0]) + ' ' + q(x[1]))); L.push(''); }
    L.push('THE ASK'); L.push(b.ask || 'Approve the units not approved, with a review date.'); L.push('');
    L.push('QUESTIONS TO CLARIFY WITH THE PAYER'); (g.questions || []).forEach((x) => L.push('- ' + x)); L.push('');
    if (gaps.length) { L.push('BEFORE THE CALL'); gaps.forEach((x) => L.push('- Not documented · collect it: ' + x.gap)); L.push(''); }
    L.push('After the call: write down the reviewer’s name, the reference number and the date any change applies from.');
    return L.join('\n');
  }
  if (D() && D().builders) D().builders.p2p = (r) => scriptText((DIC().rec && DIC().rec(r.case)) || r);

  /* ---------------- the workspace section ---------------- */
  /* round 11: the workspace has a Peer-to-peer script section for every authorization decision (one section shows at a time) */
  const shown = (r) => !r.isClaim;
  function section(r) {
    if (!shown(r)) return '';
    const cid = r.case; const d = SY() ? SY().get(key(cid)) : null; const c = callOf(r); const b = BRIEFS[cid] || {}; const can = DIC().clinical ? DIC().clinical() : true;
    const busy = PSY.dicase.busy && PSY.dicase.busy(cid + '|p2p');
    const versions = ((DIC().st ? DIC().st(cid) : {}).p2pVersions) || [];
    const outLab = c.outcome ? ((D().P2P_OUT || []).find((x) => x[0] === c.outcome) || [0, c.outcome])[1] + (c.units ? ' · ' + c.units + ' of ' + r.requested + ' units' : '') : '';
    const call = '<div class="pp-call" data-psy="p2p-call"><span class="cap5">Call</span><b>' + (c.date ? esc(c.date + (c.time ? ', ' + c.time : '')) : 'Not scheduled') + '</b>' +
      (b.reviewer ? '<span class="dc-mut">' + esc(r.payerShort) + ' reviewer: ' + esc(b.reviewer) + '</span>' : '') + (c.src ? '<span class="dc-mut" title="' + esc(c.src) + '">' + esc(c.src) + '</span>' : '') +
      (c.ref ? '<span class="dc-mut">Ref ' + esc(c.ref) + '</span>' : '') + (c.outcome ? '<span class="st5 t-green"><i aria-hidden="true">✓</i>' + esc(outLab) + '</span>' : '') + '</div>' +
      (c.outcome ? '' : '<details class="pp-more"><summary>Call details and outcome</summary><div class="pp-form">' +
        '<label>Date<input class="fld" id="pp-date" value="' + esc(c.date || '') + '" placeholder="e.g. Dec 9"></label><label>Time<input class="fld" id="pp-time" value="' + esc(c.time || '') + '" placeholder="e.g. 2:00 pm"></label>' +
        '<label class="w">Phone or reference<input class="fld" id="pp-ref" value="' + esc(c.ref || '') + '" placeholder="On the call confirmation"></label><button class="btn o s" data-act="dic-p2p-call" data-case="' + esc(cid) + '">Save call details</button></div>' +
        '<div class="pp-form"><label>Outcome<select class="fld" id="pp-out">' + (D().P2P_OUT || []).map((x) => '<option value="' + x[0] + '">' + esc(x[1]) + '</option>').join('') + '</select></label>' +
        '<label>Total units approved<input class="fld" id="pp-units" type="number" min="0" max="' + (r.requested || 0) + '" placeholder="if more"></label><button class="btn o s" data-act="dic-p2p-out" data-case="' + esc(cid) + '">Record outcome</button>' + (D().simChip ? D().simChip() : '') + '</div><div class="dw-err" id="pp-err" role="alert"></div></details>');
    if (busy) return wrap(r, call + '<div class="dw-load" role="status"><span class="dw-spin" aria-hidden="true"></span>Assembling clinical evidence…</div>', '');
    if (!d) return wrap(r, call + '<div class="dc-empty" style="padding:4px 0 0"><span class="dc-mut">No script yet</span><button class="btn p s" data-act="dic-act" data-k="p2p" data-case="' + esc(cid) + '"' + (can ? '' : ' disabled title="Clinical record access required"') + '>Generate Peer-to-Peer Script</button></div>', '');
    if (!can) return wrap(r, call + '<div style="margin-top:10px"><span class="dc-rs" data-psy="restricted"><i aria-hidden="true">🔒</i>Restricted · clinical access</span>' + (versions.length ? ' <span class="dc-mut">Approved version ' + versions.length + ' · ' + esc(versions[versions.length - 1].at) + '</span>' : '') + '</div>', '');
    const g = guide(r);
    const line = (x) => '<li>' + esc(x.t) + ' ' + (x.src || []).map((l) => EV.cite(l, cid)).join(' ') + (x.rule && PSY.rules.byId(x.rule) ? ' <span class="dc-rule" title="' + esc(PSY.rules.byId(x.rule).source) + '">' + PSY.rules.chip(PSY.rules.byId(x.rule)) + '</span>' : '') + '</li>';
    const cards = '<div class="pp-guide" data-psy="p2p-guide">' + SECS.map((s, i) => '<div class="pp-g" data-g="' + s[0] + '"><h3><span>' + (i + 1) + '</span>' + esc(s[1]) + '</h3><ul>' + (s[0] === 'questions' ? (g.questions || []).map((x) => '<li>' + esc(x) + '</li>').join('') : (g[s[0]] || []).map(line).join('') || '<li class="dc-mut">Not documented · collect it</li>') + '</ul></div>').join('') + '</div>';
    const appr = d.stage === 'approved';
    const flow = '<ol class="sy-flow dc-flow" data-psy="draft-flow" data-stage="' + d.stage + '">' + [['ai', 'AI Draft'], ['edited', 'Clinician Edited'], ['approved', 'Approved']].map((s, i) => { const at = appr ? 2 : d.stage === 'edited' ? 1 : 0; return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + s[1] + (s[0] === 'approved' && versions.length ? ' · v' + versions.length : '') + '</li>'; }).join('') + '</ol>';
    const stChip = '<span class="sy-st t-' + (appr ? 'green' : d.state === 'unsaved' ? 'amber' : 'gray') + '" data-psy="draft-state" data-k="p2p">' + (appr ? 'Approved version ' + versions.length : d.state === 'unsaved' ? 'Unsaved changes' : 'Draft saved') + '</span>';
    const ta = '<textarea class="fld dw-ta" rows="' + Math.min(24, Math.max(10, d.text.split('\n').length + 1)) + '" aria-label="Peer-to-peer script, editable" data-input="dic-edit" data-case="' + esc(cid) + '" data-kind="p2p">' + esc(d.text) + '</textarea>';
    const srcs = []; d.text.replace(/\[([^\]]{2,})\]/g, (m0, l) => { if (srcs.indexOf(l) < 0 && !/date to be|Clinician Input/.test(l)) srcs.push(l); return m0; });
    const btn = (act, label, cls, dis) => '<button class="btn ' + cls + ' s" data-act="' + act + '" data-case="' + esc(cid) + '" data-kind="p2p"' + (dis ? ' disabled' : '') + '>' + label + '</button>';
    const acts = '<div class="dc-dacts" data-psy="draft-acts">' + btn('dic-save', 'Save Draft', 'o', d.state === 'saved' || appr) + btn('dic-approve', appr ? 'Approved' : 'Approve version', 'p', appr) + btn('dic-p2p-pdf', 'Download PDF', 'o', false) + btn('dic-p2p-copy', 'Copy', 'o', false) + '</div>';
    const vers = versions.length ? '<div class="pp-vers" data-psy="p2p-versions">' + versions.slice().reverse().map((v) => '<span>Version ' + v.v + ' · approved ' + esc(v.at) + ' · ' + esc(v.by) + '</span>').join('') + '</div>' : '';
    return wrap(r, call + cards + '<div class="pp-script"><div class="pp-sh"><h3>Script</h3>' + (d.stage === 'ai' ? EV.label('ai') : appr ? EV.label('reviewed') : EV.label('clin', 'Clinician Edited')) + stChip + '</div>' + flow + ta +
      (srcs.length ? '<div class="dc-srcs"><span class="cap5">Evidence</span>' + (DIC().srcList ? DIC().srcList(srcs, cid) : srcs.map((l) => EV.cite(l, cid)).join(' ')) + '</div>' : '') + acts + vers + '</div>', '');
  }
  const wrap = (r, inner) => '<section class="card dw-sec" id="sec-p2p" data-psy="di-p2p"><div class="dw-h"><h2>Peer-to-peer script</h2><span class="dw-hs">' + (r.option === 'p2p' ? '<span class="st5 t-blue"><i aria-hidden="true">☏</i>Current pathway</span>' : '') + '</span></div><div class="pp">' + inner + '</div></section>';
  function generate(r) { if (!SY()) return; if (!SY().get(key(r.case))) SY().init(key(r.case), { original: '', ai: scriptText(r), label: 'Peer-to-peer script · ' + r.ini }); }
  Object.assign((PSY.dicase = PSY.dicase || {}), { p2pShown: shown, p2pSection: section, p2pGenerate: generate, p2pGuide: guide, p2pScript: scriptText, p2pSecs: SECS });

  /* ---------------- acts ---------------- */
  const after = (msg) => { if (DIC().scrollTo) DIC().scrollTo('p2p'); PSY.refresh(); if (msg) PSY.ui.toast(msg); };
  const recOf = (el) => (DIC().rec ? DIC().rec(el.getAttribute('data-case')) : null);
  PSY.acts['dic-p2p-call'] = (el, ctx) => {
    const r = recOf(el); if (!r) return; const v = (s) => ((ctx.root.querySelector(s) || {}).value || '').trim();
    if (!v('#pp-date')) { const e = ctx.root.querySelector('#pp-err'); if (e) e.textContent = 'Enter the call date.'; return; }
    D().p2pSave(r.id, { date: v('#pp-date'), time: v('#pp-time'), ref: v('#pp-ref') }); after('Saved.');
  };
  PSY.acts['dic-p2p-out'] = (el, ctx) => {
    const r = recOf(el); if (!r) return; const res = D().p2pOutcome(r.id, (ctx.root.querySelector('#pp-out') || {}).value, (ctx.root.querySelector('#pp-units') || {}).value);
    if (res && res.err) { const e = ctx.root.querySelector('#pp-err'); if (e) e.textContent = res.err; return; }
    after('Outcome recorded.');
  };
  const textOf = (el, ctx) => { const cid = el.getAttribute('data-case'); const ta = ctx && ctx.root && ctx.root.querySelector('textarea[data-kind="p2p"][data-case="' + cid + '"]'); const d = SY().get(key(cid)); if (ta && d && ta.value !== d.text) SY().edit(key(cid), ta.value); return (SY().get(key(cid)) || {}).text || ''; };
  PSY.acts['dic-p2p-pdf'] = (el, ctx) => { const r = recOf(el); if (!r) return; const t = textOf(el, ctx); PSY.download('Peer-to-peer_' + r.ini.replace(/\./g, '') + '_' + (r.m.ref || r.case) + '.pdf', PSY.pdf('Peer-to-peer script - ' + r.ini + ' - ' + r.payerName, t.split('\n'))); };
  PSY.acts['dic-p2p-copy'] = (el, ctx) => { const t = textOf(el, ctx); if (PSY.copy) PSY.copy(t, 'Copied.'); else { try { navigator.clipboard.writeText(t); } catch (e) {} PSY.ui.toast('Copied.'); } };

  PSY.dicase.p2pCss = `
  .pp{padding:0 20px 16px;display:flex;flex-direction:column;gap:12px}
  .pp-call{display:flex;gap:6px 12px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;background:#FCFAF6;border:1px solid #EFE8DE;border-radius:10px;padding:10px 12px}.pp-call b{font-size:15px}
  .pp-more summary{cursor:pointer;font-weight:600;font-size:13px;color:#1D4F43}
  .pp-form{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end;margin-top:8px}
  .pp-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#4A453D}.pp-form .fld{height:36px;font-size:13.5px;width:140px}.pp-form .w .fld{width:220px}.pp-form select.fld{width:230px}
  .pp-guide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .pp-g{border:1px solid #EFE8DE;border-radius:10px;padding:10px 12px;min-width:0}
  .pp-g h3{margin:0 0 6px;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:700;display:flex;gap:8px;align-items:center}.pp-g h3 span{width:20px;height:20px;border-radius:50%;background:#EFE8DE;color:#4A453D;font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px}
  .pp-g ul{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:5px;font-size:13px;line-height:1.45}
  .pp-g[data-g="questions"]{grid-column:1/-1;background:#F6FAF8;border-color:#DCEAE3}
  .pp-script{display:flex;flex-direction:column;gap:10px;border-top:1px solid #EFE8DE;padding-top:12px}
  .pp-sh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pp-sh h3{margin:0;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;margin-right:auto}
  .pp-vers{display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:#4A453D}
  `;

  /* route: the workspace on its peer-to-peer section (Denial Intelligence / <initials>) */
  const caseOf = (params) => { const id = params && params.case; return id && PSY.caseById(id) ? id : DEFAULT; };
  PSY.register({
    id: 'p2p-notes', kind: 'web', nav: 'di', label: 'Peer-to-peer', url: (p) => 'denial-intelligence/' + caseOf(p) + '/peer-to-peer',
    tabTitle: (p) => 'Psyflo — ' + ((PSY.caseView(caseOf(p)) || {}).ini || 'Peer-to-peer'),
    get css() { return DIC().css(); },
    render(params) { return DIC().workspace({ case: caseOf(params), sec: 'p2p', __p: params }); },
    mount(root, ctx) { DIC().mountWs(root, ctx); },
  });
  /* older script acts: open the peer-to-peer section */
  ['pb-copy', 'pb-print', 'pb-log', 'pb-dates'].forEach((k) => { PSY.acts[k] = (el) => PSY.go('p2p-notes?case=' + (el.getAttribute('data-case') || DEFAULT)); });
})();
