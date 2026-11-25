/* L1a shared helpers for the Lauris pages (consumers, consumer file, admin pages) and the extension's Time tab.
   Loaded first among the 60-64 files. Everything hangs off PSY.l1a. State lives in PSY.state.l1a (created on first use,
   always read through U.S() because PSY.reset replaces PSY.state). Fictional data, initials only. */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris; const esc = PSY.esc;
  const U = (PSY.l1a = PSY.l1a || {});
  U.esc = esc;

  /* ---------- state ---------- */
  U.S = function () {
    const s = PSY.state; const x = (s.l1a = s.l1a || {});
    x.cons = x.cons || {};
    x.cons.tab = x.cons.tab || 'active';
    x.cons.sort = x.cons.sort || { k: 'id', d: -1 };
    x.cons.f = x.cons.f || { name: '', rec: '', staff: '', group: '' };
    x.cons.af = x.cons.af || { name: '', rec: '', staff: '', group: '' };
    x.told = x.told || {}; x.todo = x.todo || {}; x.docs = x.docs || {}; x.docReq = x.docReq || {}; x.reports = x.reports || {};
    x.prefs = x.prefs || { rej: true, weekly: true, remind: false };
    x.week = x.week || 'this';
    x.sheet = x.sheet || null;
    return x;
  };

  /* Generic change / input / Enter wiring for any screen: data-change="act", data-input="act", data-enter="act".
     (The shell only wires clicks; change events do not leave the shadow root, so they are added per root here.) */
  if (!PSY.ui.__l1aWired) {
    const orig = PSY.ui.wireBasics;
    PSY.ui.wireBasics = function (root, ctx) {
      orig.apply(this, arguments);
      const fire = (attr, e) => {
        const el = e.target && e.target.closest ? e.target.closest('[' + attr + ']') : null;
        if (!el || !root.contains(el)) return;
        const fn = PSY.acts[el.getAttribute(attr)];
        if (fn) fn(el, ctx, e);
      };
      root.addEventListener('change', (e) => fire('data-change', e));
      root.addEventListener('input', (e) => fire('data-input', e));
      root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') fire('data-enter', e); });
    };
    PSY.ui.__l1aWired = true;
  }

  /* ---------- small helpers ---------- */
  U.pd = (s) => { const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null; };
  U.TODAY = new Date(2026, 9, 29);
  U.daysTo = (s) => { const d = U.pd(s); return d ? Math.round((d - U.TODAY) / 86400000) : null; };
  U.schoolDaysLeft = (s) => { const d = U.pd(s); if (!d) return null; let n = 0; const t = new Date(U.TODAY); while (t <= d) { const w = t.getDay(); if (w !== 0 && w !== 6) n++; t.setDate(t.getDate() + 1); } return n; };
  U.chip = (txt, tone) => '<span class="l1-chip ' + (tone || 'n') + '">' + esc(txt) + '</span>';
  U.hm = (m) => { m = Math.round(m || 0); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
  U.dur = (m) => PSY.time.fmt(Math.round(m)).trim();
  U.plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  U.toneOf = (stage) => ({ sign: 'y', info: 'y', submitted: 'n', decision: 'y', partial: 'y', p2p: 'n', denied: 'r', appeal: 'r', active: 'g' }[stage] || 'n');

  /* ---------- people the Lauris pages know about besides the roster ---------- */
  U.discharged = [
    { id: '4388', ini: 'B.H.', age: 10, group: 'TDT – Campbell ES-1', staff: 'K. Hale', updated: '09/18/2026', when: '09/18/2026', why: 'Family moved out of the district', school: 'Campbell County · ES-1', payer: 'sentara', intake: '01/12/2026', units: null, discharged: true },
    { id: '4379', ini: 'C.M.', age: 13, group: 'TDT – Lynchburg MS-2', staff: 'J. Perez', updated: '08/31/2026', when: '08/31/2026', why: 'Stepped down to outpatient counseling', school: 'Lynchburg City · MS-2', payer: 'aetna', intake: '02/03/2026', units: null, discharged: true },
    { id: '4362', ini: 'R.D.', age: 15, group: 'TDT – Campbell HS-1', staff: 'K. Hale', updated: '06/12/2026', when: '06/12/2026', why: 'Goals met at the end of the school year', school: 'Campbell County · HS-1', payer: 'humana', intake: '09/09/2025', units: null, discharged: true },
  ];
  U.find = (id) => L.byId(id) || U.discharged.find((c) => c.id === id) || null;
  U.all = () => L.consumers.concat(U.discharged);

  /* ---------- authorizations as Lauris holds them (awarded totals and dates are demo values) ---------- */
  const AUTH = {
    '4471': { no: 'AUTH-4471-B', from: '08/18/2026', awarded: 110 },
    '4458': { no: 'AUTH-4458-C', from: '08/18/2026', awarded: 90 },
    '4441': { no: 'AUTH-4441-A', from: '09/01/2026', awarded: 65 },
    '4430': { no: 'AUTH-4430-D', from: '08/18/2026', awarded: 80 },
    '4426': { no: 'AUTH-4426-A', from: '09/08/2026', awarded: 60 },
    '4419': { no: 'AUTH-4419-A', from: '09/15/2026', awarded: 24 },
  };
  const PRIOR = { '4449': { no: 'AUTH-4449-A', payer: 'aetna', from: '08/17/2026', to: '10/05/2026', awarded: 80, note: 'Used up 10/05/2026, seven weeks in' } };
  U.caseOf = (c) => (c && c.case ? PSY.caseView(c.case) : null);
  U.payerOf = (c) => { const cs = c && c.case ? PSY.caseById(c.case) : null; const id = c.payer || (cs && cs.payer); return PSY.data.payers[id] || null; };
  U.svcOf = (c) => { const cv = U.caseOf(c); if (!cv) return 'TDT school day (H2016)'; return cv.code ? cv.service + ' (' + cv.code + ')' : cv.service; };
  U.auth = (c) => {
    const a = AUTH[c.id]; if (!a || L.units(c) == null) return null;
    const avail = L.units(c); const p = U.payerOf(c);
    return Object.assign({}, a, { to: c.ends, payer: p, avail, used: a.awarded - avail, svc: U.svcOf(c) });
  };
  U.prior = (c) => PRIOR[c.id] || null;
  U.hub = (c) => (c && c.case && PSY.data.hub && PSY.data.hub[c.case]) || null;

  /* what Psyflo can tell about a request for a consumer: label, tone, date line */
  const REQ_DATE = { 'R-0416': '', 'R-0411': 'Draft for Nov 16 – Feb 13', 'R-0408': 'Sent 10/21/2026', 'R-0402': 'Sentara called 10/27/2026', 'R-0399': 'Faxed 10/19/2026', 'R-0391': 'Aetna called 10/29/2026', 'R-0388': 'Peer-to-peer 12/09/2026', 'R-0384': 'Denied 10/22/2026' };
  U.req = (c) => {
    const cv = U.caseOf(c); if (!cv) return null;
    let label = cv.stageLabel, tone = cv.stageTone || U.toneOf(cv.stage), date = REQ_DATE[cv.id] || '';
    if (cv.stage === 'active') return null; // nothing in progress
    if (c.id === '4492') {
      const r = PSY.flowRank();
      if (r < 3) { label = 'Not started'; tone = 'n'; date = 'Waiting for screening, intake and plan'; }
      else if (r === 3) { label = 'Ready to write'; tone = 'y'; date = 'Plan done 10/21/2026'; }
      else if (r === 4) { label = 'Waiting for signature'; tone = 'y'; date = 'In Forms to Approve'; }
      else { label = cv.stageLabel || 'Submitted'; tone = 'n'; date = 'Signed and sent'; }
    }
    return { cv, label, tone, date, type: cv.type, asked: (cv.units && cv.units.line) || '', payer: PSY.data.payers[cv.payer] };
  };

  /* the next best thing to do for this consumer: { title, label, go } */
  U.nextStep = (c) => {
    const cv = U.caseOf(c); const u = L.units(c);
    if (c.discharged) return { title: 'Record closed', label: 'Back to patient list', go: 'lauris-consumers' }; // extension text (round 10: patient)
    if (c.id === '4492') {
      const r = PSY.flowRank();
      if (r === 0) return { title: 'Start the admission screening', label: 'Open Admission Screening', go: 'lauris-screening?c=4492' };
      if (r === 1) return { title: 'Do the intake', label: 'Open Intake (CNA)', go: 'lauris-cna?c=4492' };
      if (r === 2) return { title: 'Write the individual service plan', label: 'Open Individual Service Plan', go: 'lauris-isp?c=4492' };
      if (r === 3) return { title: 'Open the authorization request', label: 'Open the request', go: 'lauris-dmas?case=R-0416' };
      if (r === 4) return { title: 'Sign the request', label: 'Open Forms to Approve', go: 'lauris-forms' };
      return { title: 'Request sent', label: 'Open the request', go: 'lauris-dmas?case=R-0416' };
    }
    if (u == null) {
      const m = { info: 'Answer the information request', submitted: 'Check on the request', partial: 'Decide on the partial award', p2p: 'Prepare for the peer-to-peer', denied: 'Read the denial' }[cv && cv.stage] || 'Start a request';
      return { title: m, label: 'Open the request', go: 'lauris-dmas?case=' + c.case };
    }
    if (cv && cv.stage === 'sign') return { title: 'Check the concurrent SRA', label: 'Open the request', go: 'lauris-dmas?case=' + c.case };
    if (cv && cv.stage === 'active' && u <= 20) return { title: 'Start the next concurrent SRA', label: 'Start the request', go: 'lauris-dmas?case=' + c.case };
    if (cv && cv.stage === 'partial') return { title: 'Decide on the partial award', label: 'Open the request', go: 'lauris-dmas?case=' + c.case };
    return { title: 'Write today’s note', label: 'Open Daily Progress Note', go: 'lauris-dpn?c=' + c.id };
  };

  /* ---------- fictional file content ---------- */
  U.intake = (c) => {
    if (c.id === '4492') return PSY.flowRank() >= 1 ? '10/20/2026' : 'Not entered yet';
    return c.intake || { '4471': '08/18/2026', '4466': '09/21/2026', '4458': '08/18/2026', '4455': '10/05/2026', '4449': '08/10/2026', '4441': '09/01/2026', '4437': '10/08/2026', '4430': '08/18/2026', '4426': '09/08/2026', '4419': '09/15/2026' }[c.id] || '08/18/2026';
  };
  U.planDate = (c) => {
    if (c.id === '4492') return PSY.flowRank() >= 3 ? '10/21/2026' : 'Not entered yet';
    if (c.id === '4471') return '08/19/2026'; // the Oct 22 change is an undated amendment (see the concurrent SRA review)
    const d = U.pd(U.intake(c)); if (!d) return 'On file'; d.setDate(d.getDate() + 1); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
  };
  U.dx = (c) => { const h = U.hub(c); const d = h && h.picture && h.picture.diagnosis; return d ? d.code + ' · ' + d.text : (c.discharged ? 'On file (closed record)' : 'On file'); };
  U.locality = (c) => (/^Lynchburg/.test(c.school || '') ? 'Lynchburg City' : 'Campbell County');

  U.MEDS = {
    '4492': [['Albuterol inhaler', '2 puffs as needed', 'Kept with the school nurse', 'Pediatrician', '03/2025']],
    '4449': [['Guanfacine ER', 'Once daily, morning', 'Given at home', 'Pediatrician', '02/2026']],
  };
  U.ALLG = {
    '4441': [['Peanuts', 'Food', 'Hives', 'Epinephrine pen is kept with the school nurse']],
    '4458': [['Penicillin', 'Drug', 'Rash', 'Avoid']],
    '4426': [['Latex', 'Contact', 'Skin irritation', 'Use non-latex gloves and bandages']],
  };

  U.DOCS = (c) => {
    const h = U.hub(c); const miss = (h && h.documents && h.documents.missing) || '';
    const id = c.id; const r = c.id === '4492' ? PSY.flowRank() : 9;
    const intake = U.intake(c);
    const rows = [
      { k: 'consent', name: 'Consent for treatment', file: 'consent-treatment_' + id + '.pdf', type: 'Consent', when: r >= 1 || c.id !== '4492' ? intake : '10/20/2026', by: 'Guardian', body: ['Guardian consent for school-based Therapeutic Day Treatment.', 'Signed by the guardian on the intake date. Copy given to the family.', 'Release of information to the school and the pediatrician is included.'] },
      { k: 'rights', name: 'Guardian rights and privacy acknowledgment', file: 'rights-privacy_' + id + '.pdf', type: 'Consent', when: r >= 1 || c.id !== '4492' ? intake : '10/20/2026', by: 'Guardian', body: ['Rights and responsibilities explained and acknowledged.', 'Notice of privacy practices received.', 'Grievance process explained.'] },
      { k: 'sched', name: 'School schedule and grades', file: 'schedule-grades_2026-10.pdf', type: 'School record', when: '10/26/2026', by: 'School counselor', body: ['Current class schedule and quarter grades received from the school counselor.', 'Used for the classes-passing count in the authorization request.'] },
      { k: 'elig', name: 'Medicaid eligibility check', file: 'eligibility-check_2026-10-26.pdf', type: 'Eligibility', when: '10/26/2026', by: 'Psyflo weekly check', body: ['Eligibility verified on the Monday check. Active, plan unchanged.', 'Screenshot filed to the chart.'] },
    ];
    /* the school plan row follows the consumer's record (hub picture.iep): an IEP, a Section 504 plan, or none (no row) */
    const plan = String((h && h.picture && h.picture.iep) || ''); const first = (plan.split(/(?<=\.)\s/)[0] || '').trim();
    const sDate = /^Campbell/.test(c.school || '') ? '09/14/2026' : '09/21/2026';
    if (/504/.test(plan)) rows.splice(3, 0, { k: 'iep', name: 'Section 504 plan', file: '504-plan_' + id + '.pdf', type: 'School record', when: sDate, by: 'School counselor', body: ['Section 504 plan page: accommodations and review date.', first] });
    else if (/IEP/.test(miss)) rows.splice(3, 0, { k: 'iep', name: /minutes/.test(miss) ? 'IEP review minutes' : 'IEP copy', file: (/minutes/.test(miss) ? 'iep-review-minutes_' : 'iep-copy_') + id + '.pdf', type: 'School record', when: '', by: 'School counselor', missing: /minutes/.test(miss) ? 'Meeting set for 11/04/2026' : 'Requested from the school 10/22/2026', body: [] });
    else if (/IEP/.test(plan) && !/^No IEP/i.test(plan)) rows.splice(3, 0, { k: 'iep', name: 'IEP summary', file: 'iep-summary_' + id + '.pdf', type: 'School record', when: sDate, by: 'School counselor', body: ['IEP summary page: services, accommodations and review date.', first] });
    if (c.id !== '4492' || r >= 1) rows.push({ k: 'screen', name: 'Admission Screening (signed)', file: 'admission-screening_' + id + '.pdf', type: 'Signed form', when: c.id === '4492' ? '10/29/2026' : intake, by: 'J. Perez, LPC', body: ['Admission Screening processed in Lauris and signed by the clinician.'] });
    if (c.id !== '4492' || r >= 2) rows.push({ k: 'cna', name: 'Intake (CNA), signed', file: 'cna_' + id + '.pdf', type: 'Signed form', when: c.id === '4492' ? '10/29/2026' : intake, by: 'J. Perez, LPC', body: ['Intake (Comprehensive Needs Assessment) processed in Lauris and signed by the clinician.'] });
    if (c.id !== '4492' || r >= 3) rows.push({ k: 'isp', name: 'Individual Service Plan (signed)', file: 'isp_' + id + '.pdf', type: 'Signed form', when: c.id === '4492' ? '10/29/2026' : U.planDate(c), by: 'J. Perez, LPC', body: ['Individual Service Plan processed in Lauris and signed by the clinician.', 'Goals, interventions and review date are in the form.'] });
    rows.forEach((x) => { const add = (U.SUBST_LINES[c.id] || {})[x.k]; if (add) x.body = x.body.concat([add]); });
    return rows;
  };
  /* round 12: the substance use lines FLO (42-flow.js) cites from the Lauris chart, in the signed documents it names. Fictional. */
  U.SUBST_LINES = {
    '4458': { cna: 'Substance use: nicotine vaping at school, reported by the school counselor.' },
    '4449': { screen: 'Substance use: vaping at school, reported by the school counselor.' },
    '4426': { cna: 'Substance use: tried alcohol once, self-reported. No treatment.' },
  };

  /* ---------- the Lauris look for the pages in this area ---------- */
  U.css = `
  .ltabs{flex-wrap:wrap;gap:4px 18px}
  .l1-chip{display:inline-block;border-radius:3px;padding:1px 7px;font-size:11px;font-weight:700;white-space:nowrap;line-height:1.5}
  .l1-chip.g{background:#E3F2E7;color:#1E6B3A}.l1-chip.y{background:#FFF1CC;color:#7A5200}.l1-chip.r{background:#FBE3DB;color:#A3341C}.l1-chip.n{background:#E9ECF0;color:#4A5566}.l1-chip.b{background:#E1ECFA;color:#1F4E8C}
  .l1-bar{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin:0 0 12px}
  .l1-bar>div{flex:1 1 110px;min-width:100px}
  .l1-bar>div.s{flex:0 0 96px;min-width:90px}
  .l1-bar>div.g{flex:1 1 150px;min-width:130px}
  .l1-in{width:100%;border:1px solid #C9CDD3;background:#fff;padding:6px 8px;border-radius:3px;min-height:30px;font:inherit;color:#222}
  .l1-in:focus{outline:2px solid #9DBDE8;outline-offset:-1px}
  .l1-in[readonly]{background:#F4F6F8;color:#444}
  .lt th,.lt td{padding:8px 10px}
  .lt th.srt{cursor:pointer;user-select:none;white-space:nowrap}
  .lt th.srt:hover{background:#DEE3EA}
  .lt th .ar{color:#7C8696;font-size:10px;margin-left:4px}
  .lt td.nw,.lt th{white-space:nowrap}
  .lt td.num,.lt th.num{text-align:right}
  .lt tr.tot td{font-weight:700;background:#F4F6F8}
  @media (max-width:1239px){.c-upd{display:none}}
  .l1-empty{padding:22px 10px;text-align:center;color:#6B7280}
  .l1-head{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:10px 14px}
  .l1-av{flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:#DDE1E6;color:#4A5566;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center}
  .l1-head .nm{font-weight:700;font-size:15px;color:#1F3B6B}
  .l1-head .sb{font-size:11px;color:#666;margin-top:1px}
  .l1-head .rt{margin-left:auto;text-align:right;font-size:12px;color:#666;display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex:0 0 auto}
  .l1-head .rt b{font-weight:700}.l1-head .rt b.ok{color:#1F6FBF}.l1-head .rt b.no{color:#C2410C}
  .l1-card{background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:14px 16px;margin:0 0 12px}
  .l1-card h4{margin:0 0 10px;font-size:13px;color:#1F3B6B}
  .l1-card.flush{padding:0;overflow-x:auto}
  .l1-card.flush h4{padding:12px 16px 0;margin:0}
  .l1-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px 14px}
  .l1-grid .in{min-height:30px}
  .l1-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .l1-tile{border:1px solid #D5D9DF;border-radius:4px;padding:8px 10px;background:#F7F9FB}
  .l1-tile .k{font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.04em}
  .l1-tile .v{font-size:18px;font-weight:700;color:#1F3B6B;margin-top:2px}
  .l1-tile .v small{font-size:11px;color:#666;font-weight:400}
  .l1-note{border-left:3px solid #E0A030;background:#FFF8E6;padding:8px 10px;font-size:12px;margin:0 0 12px}
  .l1-note.b{border-left-color:#1F64BE;background:#EAF2FC}
  .l1-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .l1-sub{font-size:12px;color:#666;margin:-4px 0 12px}
  .l1-tg{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-top:1px solid #E7E9ED;font-size:13px}
  .l1-tg:first-of-type{border-top:0}
  .l1-tg label{display:block;font-size:13px;color:#222;text-transform:none;letter-spacing:0;margin:0;cursor:pointer}
  .l1-tg input{margin-top:2px}
  .l1-sig{font-family:'Brush Script MT','Segoe Script',cursive;font-size:30px;color:#1F3B6B;border-bottom:1px solid #C9CDD3;padding:6px 14px 2px;display:inline-block;min-width:240px}
  .l1-wk td{vertical-align:middle}
  .l1-wk .lt th,.l1-wk .lt td{padding:9px 7px}
  .l1-wk .u{display:block;font-size:11px;color:#6B7280;font-weight:400}
  .l1-wk td.th4{background:#FFFBEF}
  .l1-noacc{display:inline-flex;align-items:center;gap:4px;color:#6B7280;font-weight:700;font-size:12px;white-space:nowrap;cursor:not-allowed}
  .l1-noacc i{font-style:normal;font-size:12px}
  .l1-off{color:#8A8F98;font-weight:700;margin-right:10px}
  .lt tr.off td{color:#6B7280}
  `;
  /* ---------- Lauris visual fidelity (round 9): compared with the Lauris captures (refs/legacy/*.html|css, src/captured/lauris-*):
     Arial throughout, a 13 px bold title bar, 12 px menu and tabs, 11–12 px grey table headers, 12.5 px rows, a light grey work area,
     square 3 px form chrome. Shared by every Lauris page (appended to PSY.css.lauris), so the pages read as one EHR. ---------- */
  PSY.css.lauris = (PSY.css.lauris || '') + `
.lz-top{padding:8px 16px;font-size:13px}
.lz-top .rt{gap:12px}
.lz-nav{padding:6px 0}
.lnav{font-size:12px;padding:8px 14px}
.lnav.on{padding-left:11px}
.lz-main{background:#F2F3F5}
.lz-main .ltabs{gap:18px}
.ltab{font-size:12px}
.lt{font-size:12.5px}
.lt th{background:#EDEEF0;font-size:11.5px;color:#444;padding:8px 12px;border-bottom-color:#D9DDE3}
.lt td{padding:8px 12px;border-bottom-color:#ECEEF1}
.lcard{border-color:#DDE1E6}
.lb{border-radius:3px;font-size:12.5px;padding:6px 14px;min-height:30px}
.lsel,.lz-main .in{border-radius:3px}
`;

  /* a Lauris header card for a consumer */
  U.head = (c, opts) => {
    opts = opts || {};
    const u = L.units(c); const a = U.auth(c);
    let right;
    if (c.discharged) right = '<div><b>Discharged ' + esc(c.when) + '</b></div>';
    else if (U.dss()) right = '';
    else if (u == null) right = '<div><b class="no">No authorizations available</b></div>';
    else right = '<div style="white-space:nowrap"><b class="ok">' + u + ' units available</b> <span style="font-weight:400">· ending ' + esc(c.ends) + '</span></div>';
    const bits = ['Unique ID ' + esc(c.id), 'DOB on file', 'Group: ' + esc(c.group), 'Staff: ' + esc(c.staff)];
    return '<div class="l1-head"><div class="l1-av">' + esc(c.ini.replace(/\./g, '')) + '</div><div style="min-width:0"><div class="nm">' + esc(c.ini) + ', ' + c.age + '</div><div class="sb">' + bits.join(' · ') + '</div></div>' +
      '<div class="rt">' + right + (opts.addBtn && !c.discharged ? '<button class="lb" data-go="lauris-add-session?c=' + c.id + '" style="padding:4px 10px;font-size:12px">Add Session</button>' : '') + '</div></div>';
  };

  /* open the extension on its Time tab (used from the Lauris Time Tracker and from alerts) */
  U.openTime = (root, ini) => {
    if (ini) { const t = PSY.time.st(); if (!t.running) { t.sel = ini; PSY.save(); } }
    PSY.ext.set(true); PSY.ext.tab('time');
    const pane = root && root.querySelector('[data-pane="time"]');
    if (pane && PSY.l1a.reTime) PSY.l1a.reTime(pane);
  };

  /* ---------- Lauris's own guardrails (round 8, extended in round 9) ----------
     Direct support staff: their Lauris role cannot open the Admission Screening, the Intake, the ISP or anything about authorizations,
     and they see only the consumers assigned to them (PSY.caseload('dss'): M.R. and T.N.). Links to anything else show "No access";
     opening such a page anyway (menu, old link, deep link, Scribe or Track Time on another consumer) lands on Lauris's No access page.
     A role without clinical record content (the admin by default, PSY.can('clinicalRecords')) sees "Restricted · clinical access" in place
     of clinical documents on the consumer pages (the forms, the signed clinical documents, diagnosis, medications, allergies). */
  U.dss = () => PSY.role() === 'dss';
  U.clin = () => PSY.can('clinicalRecords');
  U.NOACC = '<span class="l1-noacc" data-psy="noacc"><i aria-hidden="true">⊘</i>No access</span>';
  U.RESTR = '<span class="l1-noacc" data-psy="restricted" title="Clinical record content is not part of this role (Settings → Roles)"><i aria-hidden="true">⊘</i>Restricted · clinical access</span>';
  U.GUARD = { 'lauris-screening': 'Admission Screening', 'lauris-cna': 'Intake (CNA)', 'lauris-isp': 'Individual Service Plan', 'lauris-auths': 'Authorizations', 'lauris-auth': 'Authorizations',
    'lauris-dmas': 'Authorization request', 'lauris-case': 'Authorization request', 'lauris-noauth': 'Consumers w/o Authorizations' };
  /* the consumer a Lauris route is about (c / case / id), or null */
  U.routeConsumer = (id, p) => {
    p = p || {}; let c = null;
    if (p.c) c = U.find(String(p.c)); if (!c && p.case) c = L.byCase(String(p.case)); if (!c && p.id) c = L.byCase(String(p.id)) || U.find(String(p.id));
    if (!c && p.nc) c = U.find(String(p.nc)); if (!c && p.ncase) c = L.byCase(String(p.ncase));
    if (!c && (id === 'lauris-dmas' || id === 'lauris-case')) c = L.byCase('R-0416');
    return c;
  };
  /* on the role's caseload (a closed record: the staff it was assigned to) */
  U.mine = (c) => { if (!c) return true; if (c.discharged) return !U.dss() || c.staff === PSY.ROLES.dss.staff; return PSY.inCaseload(c.id); };
  /* Lauris blocks a consumer for direct support staff only (a clinician's Case Load is a filter there, not a lock) */
  U.blocked = (c) => U.dss() && !U.mine(c);
  /* why the current role cannot open a Lauris route: null, or the page to show instead */
  U.why = (id, p) => {
    if (!U.dss() || id === 'lauris-noaccess') return null;
    if (U.GUARD[id]) return { id: 'lauris-noaccess', params: keep(p, id) };
    const c = U.routeConsumer(id, p); if (c && U.blocked(c)) return { id: 'lauris-noaccess', params: keep(p, id) };
    return null;
  };
  /* the No access page keeps the route (to go back to it when the role changes). A consumer who is not on the user's caseload is kept
     under other names (nc, ncase, nid), so neither the page nor the extension header names them. */
  const HIDE = { c: 'nc', case: 'ncase', id: 'nid' };
  const keep = (p, to) => {
    const c = U.routeConsumer(to, p); const hide = c && U.blocked(c); const o = { to };
    ['c', 'case', 'id', 'tab', 'past'].forEach((k) => { if (p && p[k] != null) o[hide && HIDE[k] ? HIDE[k] : k] = p[k]; }); return o;
  };
  const unkeep = (p) => { const o = Object.assign({}, p); delete o.to; Object.keys(HIDE).forEach((k) => { if (o[HIDE[k]] != null) { o[k] = o[HIDE[k]]; delete o[HIDE[k]]; } }); return o; };
  const PAGE = { 'lauris-consumer': 'Consumer file', 'lauris-dpn': 'Daily Progress Note', 'lauris-add-session': 'Add Session', 'lauris-collateral': 'Collateral Contact', 'lauris-monthly': 'Monthly Summary' };
  U.guard = () => {
    PSY.REDIRECT = PSY.REDIRECT || {};
    const ids = Object.keys(U.GUARD).concat(Object.keys(PSY.screens).filter((k) => PSY.screens[k].app === 'lauris' && k !== 'lauris-noaccess' && k !== 'lauris-consumers'));
    ids.forEach((id) => {
      const prev = PSY.REDIRECT[id]; if (prev && prev.__l1aGuard) return;
      const fn = (p) => U.why(id, p) || (prev ? prev(p) : { id, params: p || {} });
      fn.__l1aGuard = true; PSY.REDIRECT[id] = fn;
    });
  };
  U.guard();
  /* the platform's redirect table may be replaced by a later file, and later files register more Lauris pages: install again at boot */
  if (PSY.boot && !PSY.boot.__l1aGuard) { const boot0 = PSY.boot; PSY.boot = function () { U.guard(); return boot0.apply(this, arguments); }; PSY.boot.__l1aGuard = true; }
  /* switching role while such a page is on screen: DSS → No access; back to another role → the page again */
  const onRole0 = PSY.onRole;
  PSY.onRole = (r) => {
    if (onRole0) { try { onRole0(r); } catch (e) { console.error(e); } }
    const cur = PSY.current(); if (cur.app !== 'lauris') return;
    if (cur.id !== 'lauris-noaccess' && U.why(cur.id, cur.params)) PSY.go(cur.id, Object.assign({}, cur.params), { replace: true });
    else if (cur.id === 'lauris-noaccess' && cur.params.to && !U.why(cur.params.to, unkeep(cur.params))) PSY.go(cur.params.to, unkeep(cur.params), { replace: true });
  };
  PSY.register({
    id: 'lauris-noaccess', app: 'lauris', label: 'No access', url: 'noaccess', css: U.css,
    render(p) {
      p = p || {}; const c = U.routeConsumer(p.to, p); const own = c && !U.blocked(c);
      const what = U.GUARD[p.to] || PAGE[p.to] || (PSY.screens[p.to] || {}).label || 'This page';
      const main = '<div class="l1-card" data-psy="noaccess" style="max-width:560px;margin-top:8px"><h4><span aria-hidden="true">⊘ </span>No access</h4>' +
        '<div class="l1-row" style="font-size:13px;margin-bottom:12px"><b>' + esc(what) + (own ? ' · ' + esc(c.ini) : '') + '</b><span class="lmuted">' + esc(PSY.lauris.user.name) + '</span></div>' +
        '<div class="l1-row"><button class="lb" data-go="back">Back</button>' + (own ? '<button class="lb" data-go="lauris-consumer?c=' + esc(c.id) + '">Open ' + esc(c.ini) + '’s file</button>' : '<button class="lb" data-go="lauris-consumers">Consumers</button>') + '</div></div>';
      return PSY.lauris.page({ active: '', main, panel: { context: 'No access', student: own ? c.ini : undefined } });
    },
  });

  /* today's Daily Progress Note for a consumer, as Lauris shows it on the consumer file */
  U.dpnState = (c) => {
    if (!c || c.discharged) return 'Closed';
    if (c.id === '4492') return 'Not started';
    if (c.id === '4471') return PSY.flag('units-used.4471') ? 'Processed today' : 'Draft saved';
    if (['4458', '4441', '4430'].indexOf(c.id) >= 0) return 'Due today';
    return 'Up to date';
  };

  /* a modal with a simple table (used by Reports and the closed-record viewer) */
  U.tableHtml = (cols, rows, foot) => '<style>.l1m{width:100%;border-collapse:collapse;font:13px Arial,Helvetica,sans-serif}.l1m th{background:#E9ECF0;text-align:left;font-size:12px;padding:8px 10px;border-bottom:1px solid #D5D9DF;color:#333;white-space:nowrap}.l1m td{padding:8px 10px;border-bottom:1px solid #E7E9ED;vertical-align:top}.l1m .num{text-align:right}.l1m tr.tot td{font-weight:700;background:#F4F6F8}</style>' +
    '<div style="overflow:auto;max-height:52vh;border:1px solid #D5D9DF;border-radius:6px"><table class="l1m"><thead><tr>' + cols.map((c) => '<th' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map((r) => '<tr>' + r.map((v, i) => '<td' + (cols[i].num ? ' class="num"' : '') + '>' + (v == null ? '' : v) + '</td>').join('') + '</tr>').join('') +
    (foot ? '<tr class="tot">' + foot.map((v, i) => '<td' + (cols[i].num ? ' class="num"' : '') + '>' + (v == null ? '' : v) + '</td>').join('') + '</tr>' : '') + '</tbody></table></div>';

  /* keep the URL pill in step with an in-page tab change (the shell only rewrites it on navigation) */
  U.syncUrl = (id) => {
    try {
      const def = PSY.screens[id]; const cur = PSY.current(); if (!def || cur.id !== id) return;
      const u = document.querySelector('#url .u'); if (!u) return;
      const m = /^(https:\/\/[^/]+\/)/.exec(u.textContent || ''); if (!m) return;
      const path = typeof def.url === 'function' ? def.url(cur.params) : def.url;
      u.innerHTML = '<b>' + m[1] + '</b>' + esc(path);
    } catch (e) {}
  };

  /* the page cannot save files; the report is copied as CSV text instead */
  U.copy = (text) => {
    try { return navigator.clipboard.writeText(text).then(() => true, () => false); } catch (e) { return Promise.resolve(false); }
  };
  U.csv = (cols, rows, foot) => [cols.map((c) => c.t)].concat(rows).concat(foot ? [foot] : []).map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/"/g, '""') + '"').join(',')).join('\n');
})();
