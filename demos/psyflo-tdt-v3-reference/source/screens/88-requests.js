/* After a request goes out: the insurer's information request (K.T. · R-0408) and the delivery trail (sent?case=R-0416|R-0411|R-0399).
   The information request is a Denial Intelligence record of K.T.'s authorization: route `info-request` opens the Denial Intelligence
   workspace (di-case?case=R-0408) on the reply (PSY.req.IR), active nav Denial Intelligence. Sending the approved reply (simulated) sets the
   authorization to "Pending payer review" and the record to Awaiting Payer. The delivery trail pages (sent) stay under All Authorizations. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const di = () => PSY.di;
  const crumbsOf = (id) => PSY.p1.crumbs(id);

  const css = `
  .rq-clock{font-family:'Newsreader',Georgia,serif;font-size:30px;font-weight:600;line-height:1.1}
  .rq-kv{display:grid;grid-template-columns:104px minmax(0,1fr);gap:9px 12px;font-size:13.5px}
  .rq-kv dt{color:#6B665E}.rq-kv dd{margin:0;font-weight:500;overflow-wrap:anywhere}
  .chip{display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;white-space:nowrap}
  `;

  /* ============================== information request (K.T. · Anthem · Availity, Oct 28 5:40 pm) ============================== */
  const IR_CID = 'R-0408';
  const IR = {
    cid: IR_CID, id: 'DI-408',
    quote: '“Please provide additional clinical information to support medical necessity: (1) frequency and duration of physical aggression within the last 30 days; (2) documentation of prior outpatient treatment and outcome; (3) current IEP supports and why they are insufficient.”',
    asked: ['Frequency and duration of physical aggression within the last 30 days.', 'Documentation of prior outpatient treatment and outcome.', 'Current IEP supports and why they are insufficient.'],
    sources: [['Daily notes', 'Sep 29 to Oct 28'], ['School behaviour report', 'in Lauris Oct 21'], ['Initial SRA', 'sent Oct 21'], ['Intake and CNA', 'Oct 8'], ['IEP', 'attached to the referral']],
    cites: ['Daily notes Sep 29 – Oct 28', 'School behaviour report', 'Initial SRA Oct 21', 'CNA', 'IEP, attached to the referral'],
    letterText() {
      return [
        'Harvest Outreach Center', 'Lynchburg City · Group NPI and Tax ID on file', 'Clinical contact: Jordan Perez, LPC · phone on file', '',
        'October 29, 2026', 'To: Anthem HealthKeepers Plus · Utilization Management', 'Via Availity · case reference on file', '',
        'Re: Additional information requested Oct 28, 2026 · Member K.T. · Medicaid ID on file · DOB on file',
        'Service: Therapeutic Day Treatment, H2016 · initial SRA submitted Oct 21, 2026 (150 units, Nov 3 to Jan 30)', '',
        'Thank you for your request of October 28. The three items you asked for are below. All information is drawn from the member’s record and from the request already submitted.', '',
        '1. Frequency and duration of physical aggression within the last 30 days. Between September 29 and October 28, K.T. was physically aggressive toward peers on seven dated occasions (October 2, 6, 9, 14, 17, 22 and 27) [1], each lasting 5 to 15 minutes at moderate intensity and requiring staff de-escalation [1]. Two of these incidents resulted in office referrals [2]. This frequency is unchanged from the 2 to 3 times per week reported at screening [3].', '',
        '2. Prior outpatient treatment and outcome. K.T. attended weekly outpatient counseling at Piedmont Counseling from January to April 2026, nine sessions [4]. Treatment ended when the family lost transportation. The school’s incident count did not decrease during or after that period (four incidents in March, five in April) [2].', '',
        '3. Current IEP supports and why they are insufficient. K.T.’s IEP, reviewed March 2026, provides a behaviour plan, preferential seating and a check-in/check-out system [5]. These supports are classroom-based and delivered by school personnel. They do not provide daily clinical intervention or de-escalation during unstructured periods, where five of the seven incidents above occurred [1]. TDT adds licensed clinical oversight and three units of direct intervention per school day, which the IEP cannot provide [3].', '',
        'Please contact me with any further questions.', '', 'Sincerely,', 'Jordan Perez, LPC', 'Assistant Clinical Support Supervisor · license and NPI on file · signed by the clinician on send', '',
        'Sources: ' + IR.sources.map((s, i) => '[' + (i + 1) + '] ' + s[0] + ', ' + s[1]).join(' · '),
      ].join('\n');
    },
  };
  PSY.req = { IR };

  /* K.T.'s information request: the Denial Intelligence workspace on the reply (Denial Intelligence / K.T.) */
  PSY.register({
    id: 'info-request', kind: 'web', nav: 'di', label: 'Information request', url: 'denial-intelligence/' + IR_CID + '/reply', tabTitle: 'Psyflo — K.T.',
    get css() { return PSY.dicase.css(); },
    render(params) { return PSY.dicase.workspace({ case: IR_CID, sec: 'info', __p: params }); },
    mount(root, ctx) { PSY.dicase.mountWs(root, ctx); },
  });

  /* ============================== sent: the delivery trail ============================== */
  const SENT = {
    'R-0399': {
      who: 'A.L., 6', school: 'Lynchburg City · ES-3', payer: 'Humana Healthy Horizons in Virginia', short: 'Humana', channel: 'Sfax', pdf: 'R-0399_A.L._initial_signed.pdf', pages: 11, form: 'TDT (H2016) Initial Service Authorization Request', kind: 'Initial SRA',
      sub: 'Initial SRA · 150 units · signed Oct 19 · faxed Oct 19 · receipt confirmed Oct 29',
      status: { tone: 'r', text: 'Decision overdue by 3 days' }, clock: { due: 'Oct 26', line: 'Overdue by 3 days', tone: '#8A2E1C', fill: 100, fillc: '#C0553A', verify: true },
      trail: [['Oct 19 · 2:04 pm', 'Signed in Lauris by J. Perez, LPC'], ['Oct 19 · 2:06 pm', 'Faxed through Sfax · 11 pages · reference <b>F-2291</b> · delivered 2:07 pm'], ['Oct 19', 'Decision clock started · due Oct 26'], ['Oct 26', 'No decision received · marked overdue'], ['Oct 29 · 10:12 am', '<b>Day-10 receipt call</b> · 14 min on hold · site supervisor verified the member ID · Humana confirmed receipt Oct 19, “in clinical review”'], ['Today', 'Overdue notice drafted']],
      proof: [['Signed PDF', 'R-0399_A.L._initial_signed.pdf · 11 pages'], ['Sent via', 'Sfax · Harvest’s account'], ['Reference', 'F-2291'], ['Delivery', 'Confirmed Oct 19, 2:07 pm (Sfax receipt attached)'], ['Receipt call', 'Oct 29, 10:12 am · rep confirmed · recording kept 90 days']],
      btn: { label: 'Send the overdue notice', act: 'sent-overdue' },
    },
    'R-0416': {
      who: 'T.W., 12', school: 'Lynchburg City · MS-2', payer: 'Humana Healthy Horizons in Virginia', short: 'Humana', channel: 'Sfax', pdf: 'R-0416_T.W._initial_signed.pdf', pages: 11, form: 'TDT (H2016) Initial Service Authorization Request', kind: 'Initial SRA',
      sub: 'Initial SRA · 150 units · signed today · faxed today · decision due Nov 5',
      status: { tone: 'y', text: 'Decision due Nov 5' }, clock: { due: 'Nov 5', line: '7 days to decide', tone: '#1B1B19', fill: 0, fillc: '#2E8B63' },
      trail: [['Oct 29 · 10:42 am', 'Signed in Lauris by J. Perez, LPC'], ['Oct 29 · 10:44 am', 'Faxed through Sfax · 11 pages · reference <b>F-2301</b> · delivered 10:45 am'], ['Oct 29', 'Decision clock started · due Nov 5'], ['Nov 5', 'Marked overdue if no decision has arrived'], ['Nov 9 · day 10', '<b>Day-10 receipt call</b> · scheduled for the next business day (day 10 is a Sunday)']],
      proof: [['Signed PDF', 'R-0416_T.W._initial_signed.pdf · 11 pages'], ['Sent via', 'Sfax · Harvest’s account'], ['Reference', 'F-2301'], ['Delivery', 'Confirmed Oct 29, 10:45 am (Sfax receipt attached)'], ['Receipt call', 'Scheduled Nov 9 (day 10, next business day)']],
      btn: { label: 'Confirm receipt now', act: 'sent-receipt' },
    },
    'R-0411': {
      who: 'M.R., 7', school: 'Campbell County · ES-1', payer: 'Anthem HealthKeepers Plus', short: 'Anthem', channel: 'Availity', pdf: 'R-0411_M.R._continued_signed.pdf', pages: 9, form: 'CMHRS Continued Stay Service Authorization Request', kind: 'Concurrent SRA',
      sub: 'Concurrent SRA · 150 units · signed today · sent in Availity today · decision due Nov 5',
      status: { tone: 'y', text: 'Decision due Nov 5' }, clock: { due: 'Nov 5', line: '7 days to decide', tone: '#1B1B19', fill: 0, fillc: '#2E8B63' },
      trail: [['Oct 29 · 10:42 am', 'Signed in Lauris by J. Perez, LPC'], ['Oct 29 · 10:46 am', '<b>Sent in Availity</b> by J. Perez, LPC · confirmation <b>AV-77412</b>'], ['Oct 29', 'Decision clock started · due Nov 5'], ['Nov 5', 'Marked overdue if no decision has arrived'], ['Nov 9 · day 10', '<b>Status check</b> in Availity']],
      proof: [['Signed PDF', 'R-0411_M.R._continued_signed.pdf · 9 pages'], ['Sent via', 'Availity · J. Perez’s own login'], ['Reference', 'AV-77412'], ['Delivery', 'Availity status “received” Oct 29, 10:46 am'], ['Receipt call', 'Not needed · status read in Availity']],
      btn: { label: 'Check Availity now', act: 'sent-availity' },
    },
  };
  const sentCase = (params) => { const id = params && params.case; return SENT[id] ? id : 'R-0399'; };
  function isSent(id) {
    if (id === 'R-0416') return PSY.flowRank() >= 5;
    if (id === 'R-0411') return PSY.caseView('R-0411').stage !== 'sign';
    return true;
  }
  function notSentPage(id, S) {
    const where = id === 'R-0416' ? 'draft-initial' : 'draft-continued';
    return PSY.platform.page({
      active: 'auth', title: 'Not sent yet · ' + esc(S.who), crumbs: crumbsOf(id), sub: esc(S.payer + ' · ' + S.channel),
      body: `<section class="card"><div class="pi-bd"><div class="pi-row">${di().chip('y', 'Waiting for signature')}</div>
        <div class="pi-row" style="margin-top:16px"><button class="btn p" data-go="${where}${id === 'R-0411' ? '?case=R-0411' : ''}">Open the draft</button><button class="btn o" data-go="lauris-forms">Forms to Approve in Lauris</button></div></div></section>`,
    });
  }
  function sentPage(id) {
    const S = SENT[id]; const c = PSY.caseView(id);
    if (!isSent(id)) return notSentPage(id, S);
    const noticeSent = id === 'R-0399' && /Overdue notice sent/.test(c.next || '');
    const trail = S.trail.slice(); if (noticeSent) trail.push(['Today · ' + PSY.now(), 'Overdue notice sent by J. Perez, LPC through Sfax · reference <b>F-2304</b>. Waiting for Humana.']);
    const extra = PSY.flag('sent-extra.' + id) || null;
    if (extra) trail.push(['Today · ' + extra.at, esc(extra.text)]);
    const proof = S.proof.slice(); if (extra && extra.proof) proof[proof.length - 1] = ['Receipt call', extra.proof];
    const clk = S.clock;
    const primary = noticeSent ? '<span class="chip g">Notice sent · F-2304</span>' : extra ? '<span class="chip g">' + esc(extra.chip) + '</span>' : `<button class="btn p" data-act="${S.btn.act}" data-case="${id}">${esc(S.btn.label)}</button>`;
    return PSY.platform.page({
      active: 'auth', title: 'Sent to ' + esc(S.short) + ' · ' + esc(S.who), crumbs: crumbsOf(id),
      sub: esc(S.sub),
      actions: `<button class="btn o" data-act="sent-pdf" data-case="${id}">Open the signed PDF</button>${primary}`,
      body: `<div class="pi-col" style="gap:20px"><div class="pi-row">${di().chip(S.status.tone, S.status.text)}<span class="chip n">${esc(S.payer)} · ${esc(S.channel)}</span><span class="pi-tag">Signed copy read from Lauris · Forms to Approve</span></div>
        <div class="pi-grid2"><div class="pi-col" style="gap:20px">
          <section class="card"><div class="pi-hd"><div><h2>Delivery trail</h2></div></div><div class="pi-bd" style="padding-top:6px">${trail.map((t) => `<div class="pi-tl" style="grid-template-columns:128px minmax(0,1fr)"><div class="d">${esc(t[0])}</div><div>${t[1]}</div></div>`).join('')}</div></section>
          </div>
        <div class="pi-col">
          <section class="card"><div class="pi-hd"><div><h2 style="font-size:17px">Proof of sending</h2></div></div><div class="pi-bd"><dl class="rq-kv" style="margin:0">${proof.map((p) => `<dt>${esc(p[0])}</dt><dd>${esc(p[1])}</dd>`).join('')}</dl></div></section>
          <section class="card"><div class="pi-bd"><div class="pi-cap">Decision due</div><div class="rq-clock" style="margin-top:4px">${esc(clk.due)}</div><div style="font-weight:600;color:${clk.tone};margin-top:2px">${esc(clk.line)}</div>
            <div class="pi-bar6" style="margin-top:10px"><i style="width:${clk.fill}%;background:${clk.fillc}"></i></div>${clk.verify ? `<div style="margin-top:8px">${PSY.ev.label('unverified', PSY.rules.VERIFY)}</div>` : ''}</div></section></div></div></div>`,
    });
  }
  /* any other request that went out: a short trail from what the case holds */
  function genericSent(id) {
    const c = PSY.caseView(id);
    if (!c) return PSY.platform.page({ active: 'auth', title: 'Nothing to show', crumbs: [{ label: 'All Authorizations', go: 'auth-list' }], body: '<section class="card pi-bd"><button class="pi-link" data-go="auth-list">Back to All Authorizations</button></section>' });
    const payer = PSY.data.payers[c.payer] || {};
    return PSY.platform.page({
      active: 'auth', title: 'Sent to ' + esc(payer.short || '') + ' · ' + esc(c.who), crumbs: crumbsOf(id), sub: esc(c.type + ' · ' + (c.units || {}).line),
      body: `<section class="card"><div class="pi-bd"><div class="pi-row">${di().chip(c.stageTone || 'n', c.stageLabel)}<span class="chip n">${esc(c.sendNote || payer.channel || '')}</span></div><div style="margin-top:12px;font-size:15px;max-width:640px">${esc(c.next)}</div>
        <div class="pi-row" style="margin-top:16px"><button class="btn o" data-go="${esc(PSY.platform.caseRoute(id))}">Open ${esc(c.ini)}</button></div></div></section>`,
    });
  }
  PSY.register({
    id: 'sent', kind: 'web', nav: 'auth', label: 'Sent', url: (p) => 'authorizations/' + ((p && p.case) || 'R-0399') + '/sent',
    get css() { return (di() ? di().css : '') + css; },
    render(params) { const id = params && params.case; const cid = SENT[id] || !id ? sentCase(params) : id; const bl = PSY.caseById(cid) ? PSY.p1.blocked(cid) : ''; if (bl) return PSY.p1.noAccess(cid, bl); return SENT[id] || !id ? sentPage(cid) : genericSent(id); },
  });

  PSY.acts['sent-pdf'] = (el) => {
    const id = el.getAttribute('data-case'); const S = SENT[id];
    PSY.ui.modal({
      title: 'Signed PDF', sub: S.pdf + ' · ' + S.pages + ' pages · read from Lauris', wide: true,
      body: (() => {
        const ln = (w) => `<div style="height:7px;border-radius:3px;background:#E9E4DB;margin:7px 0;width:${w || '100%'}"></div>`;
        const stamp = id === 'R-0399' ? 'Oct 19, 2:04 pm' : 'Oct 29, 10:42 am';
        return `<div style="background:#EFE8DE;border-radius:10px;padding:20px"><div style="background:#fff;border:1px solid #D8CEC0;border-radius:6px;padding:26px 30px;box-shadow:0 2px 10px rgba(60,40,10,.1);max-width:540px;margin:0 auto;font-size:12px;color:#2B2A27">
          <div style="font-size:14px;font-weight:700">${esc(S.form)}</div><div style="color:#6B665E">DMAS form · page 1 of ${S.pages}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:14px"><div><b>Member</b>${ln('70%')}</div><div><b>Plan</b><div>${esc(S.payer)}</div></div><div><b>Provider</b><div>Harvest Outreach Center</div></div><div><b>Clinical contact</b><div>J. Perez, LPC · NPI on file</div></div></div>
          <div style="margin-top:14px"><b>Section I · eligibility</b></div>${ln()}${ln('92%')}${ln('97%')}${ln('60%')}
          <div style="margin-top:12px"><b>Section IV · goals</b></div>${ln('95%')}${ln('88%')}
          <div style="margin-top:16px;border-top:1px solid #9A9388;padding-top:6px;font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:15px">Jordan Perez, LPC<div style="font-family:'DM Sans',sans-serif;font-style:normal;font-size:11px;color:#6B665E">Signed electronically in Lauris · ${stamp}</div></div></div></div>`;
      })(),
      actions: [{ label: 'Close', primary: true }],
    });
  };
  PSY.acts['sent-overdue'] = (el) => {
    const id = el.getAttribute('data-case') || 'R-0399';
    PSY.ui.modal({
      title: 'Send the overdue notice?', sub: 'R-0399 · A.L., 6 · Humana Healthy Horizons in Virginia',
      body: '<span class="chip n" style="margin-bottom:10px">Simulated</span><div class="letter">To: Humana Healthy Horizons in Virginia · Authorization department<br>Re: R-0399 · A.L., 6 · initial SRA submitted Oct 19 (Sfax F-2291)<br><br>Our request was received on October 19. The 7-calendar-day decision window ended October 26. Please confirm the status and expected decision date today.<br><br>J. Perez, LPC · Harvest Outreach Center</div>',
      actions: [{ label: 'Cancel' }, { label: 'Send it', primary: true, onClick: () => { PSY.setCase('R-0399', { next: 'Overdue notice sent Oct 29 by J. Perez (Sfax F-2304). Waiting for Humana.', clock: { text: 'overdue · notice sent', tone: 'y' } }); PSY.log('R-0399', 'Overdue notice sent by J. Perez, LPC.'); PSY.ui.toast('Sent · F-2304.'); PSY.refresh(); } }],
    });
  };
  /* simulated follow-ups: each one writes the trail, the audit and the case, and replaces its button */
  function followUp(id, x) {
    PSY.flag('sent-extra.' + id, Object.assign({ at: PSY.now() }, x));
    if (PSY.audit) PSY.audit.add({ case: id, action: x.text, by: x.by || 'Psyflo (system)', doc: x.doc, status: PSY.auth ? PSY.auth.status(id) : '' });
    PSY.save(); PSY.refresh(); PSY.ui.toast(x.toast);
  }
  PSY.acts['sent-receipt'] = (el) => {
    const id = el.getAttribute('data-case') || 'R-0416'; const S = SENT[id];
    followUp(id, { text: 'Receipt call (simulated): Psyflo dialed ' + S.short + ' provider services; a person at Harvest verified the member ID. ' + S.short + ' confirmed receipt of ' + S.proof[2][1] + '.', proof: 'Confirmed today, ' + PSY.now() + ' (simulated call)', chip: 'Receipt confirmed · ' + PSY.now(), doc: 'Receipt call', toast: 'Receipt confirmed (simulated).' });
  };
  PSY.acts['sent-availity'] = (el) => {
    const id = el.getAttribute('data-case') || 'R-0411';
    followUp(id, { text: 'Availity status read (simulated): “received”, no decision posted yet.', chip: 'Checked ' + PSY.now() + ' · received, no decision', doc: 'Availity status', toast: 'Availity checked (simulated).' });
  };
})();
