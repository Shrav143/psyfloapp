/* Registers the 19 captured screens of the design canvas and wires their controls.
   Authored screens (src/screens/*.js) are registered after this file and may replace a captured one by id. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const tx = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const find = (root, sel, re) => Array.from(root.querySelectorAll(sel)).filter((e) => (re instanceof RegExp ? re.test(tx(e)) : tx(e).toLowerCase().includes(String(re).toLowerCase())));
  const first = (root, sel, re) => find(root, sel, re)[0];
  const act = (el, name, extra) => { if (!el) return; el.removeAttribute('href'); el.removeAttribute('data-go'); el.setAttribute('data-act', name); if (extra) Object.entries(extra).forEach(([k, v]) => el.setAttribute('data-' + k, v)); };
  const go = (el, to) => { if (!el) return; el.removeAttribute('href'); el.removeAttribute('data-act'); el.setAttribute('data-go', to); };
  PSY.cap = { tx, find, first, act, go };

  const NUM = {};
  const EX = {}; // per-screen extras: {render?, mount?, label?}

  function registerAll() {
  Object.entries(PSY.captured).forEach(([id, c]) => {
    const m = /^(\w+) · (.*)$/.exec(c.label || '');
    NUM[id] = m ? m[1] : '';
    PSY.register({
      id, kind: c.kind, num: (EX[id] && EX[id].num) || NUM[id], label: (EX[id] && EX[id].label) || (m ? m[2] : c.label), css: c.css + (c.kind === 'ext' ? '' : ''),
      render(params, S, ctx) {
        let html = c.html;
        if (EX[id] && EX[id].render) html = EX[id].render(html, params, S, ctx) || html;
        html = html.replace(/<!--SIDEBAR:(\w*)-->/, (mm, k) => PSY.ui.sidebar(k));
        if (c.kind === 'web') html = html.replace(/(<main[^>]*>)/, '$1' + PSY.platform.bar());
        if (c.kind === 'phone') html = '<div style="min-height:100%;background:#EFE8DE;display:flex;align-items:center;justify-content:center;gap:48px;padding:40px"><div style="max-width:300px;font-size:14px;color:#525B66"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:6px">What the family sees</div>The guardian opens this from a text message from Harvest. It asks only for details, Medicaid ID and consent — nothing about the child’s behaviour.</div><div style="box-shadow:0 20px 60px rgba(0,0,0,.25);border-radius:28px;overflow:hidden;border:10px solid #151B24;width:410px;height:864px;background:#fff">' + html + '</div></div>';
        if (c.kind === 'public') html = '<div style="background:#F8F6F2">' + html + '</div>';
        return html;
      },
      mount(root, ctx) {
        commonMount(root, ctx, id);
        if (EX[id] && EX[id].mount) EX[id].mount(root, ctx);
      },
    });
  });
  }


  /* provenance: web screens show what the extension read from Lauris */
  const PROV = { 'draft-initial': 'Read from Lauris · screening, CNA, ISP · 10:36 am', 'draft-continued': 'Read from Lauris · 61 notes · 10:36 am', 'info-request': 'Read from Lauris · notes and CNA · 10:36 am', 'sent': 'Signed copy read from Lauris · Forms to Approve', 'partials': 'Read from Lauris · 21 notes · 10:36 am', 'p2p-notes': 'Read from Lauris · notes, CNA, ISP · 10:36 am' };
  function addProv(root, id) {
    const hdr = root.querySelector('header'); if (!hdr || !PROV[id]) return;
    const holder = Array.from(hdr.children).find((d) => d.style && /margin-left:\s*auto/.test(d.getAttribute('style') || '') && d.tagName === 'DIV');
    const chip = document.createElement('span'); chip.className = 'chip n'; chip.textContent = PROV[id]; chip.title = 'Everything on this page was read from Lauris by the extension. To change it, change it in Lauris.';
    if (holder) holder.insertBefore(chip, holder.firstChild); else hdr.appendChild(chip);
  }


  /* ---------- common behaviours ---------- */
  function commonMount(root, ctx, id) {
    // fragments
    root.querySelectorAll('[data-act^="frag-"]').forEach((el) => el.setAttribute('data-act', el.getAttribute('data-act')));
    addProv(root, id);
  }

  PSY.acts['frag-sign'] = (el, ctx) => { const t = ctx.root.querySelector('[data-psy="sign"]') || Array.from(ctx.root.querySelectorAll('div')).find((d) => /By my signature/.test(d.textContent) && d.children.length < 6); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  PSY.acts['frag-send'] = (el, ctx) => { const t = Array.from(ctx.root.querySelectorAll('div')).find((d) => /Sent by a clinician/.test(d.textContent) && d.children.length < 6); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  PSY.acts['frag-up'] = () => PSY.ui.toast('Attached: 2 files.');
  PSY.acts['frag-help'] = () => PSY.ui.modal({ title: 'Call Harvest instead', body: '<p>The family can phone Harvest Outreach Center and the screener will fill the same questions on the call.</p>' });
  PSY.acts['frag-privacy'] = () => PSY.ui.modal({ title: 'What the extension keeps', body: '<p>Psyflo only reads the Lauris page you have open and only types into a form when you ask it to. It never saves, processes or signs anything in Lauris by itself.</p><p style="color:#525B66">Recordings: audio is deleted when the form is processed; the transcript stays with the chart. Time stamps from staff phones are kept as proof of hours.</p>' });

  /* ================= 1 · Referral form ================= */
  EX['ref-form'] = {
    mount(root, ctx) {
      const submit = first(root, '.btn', 'Submit referral');
      act(submit, 'submit-referral');
      act(first(root, 'button', 'Save and finish later'), 'save-later');
    },
  };
  PSY.acts['submit-referral'] = (el, ctx) => { PSY.state.referral['REF-118'] = 'needs-call'; PSY.save(); PSY.ui.toast('Referral sent to Harvest Outreach Center. A text link goes to the guardian.'); setTimeout(() => PSY.go('ref-review'), 600); };
  PSY.acts['save-later'] = () => PSY.ui.toast('Saved. A link was texted to you so you can finish later.');

  /* ================= 2 · Referral review ================= */
  const REF_STATUS = {
    'needs-call': { chip: 'Needs screening call', tone: 'y' },
    'booked': { chip: 'Call booked · Fri Oct 30, 2:00 pm', tone: 'g' },
    'grant': { chip: 'Routed to the DOE grant program', tone: 'n' },
  };
  EX['ref-review'] = {
    label: 'New case · what was captured', num: '2',
    mount(root, ctx) {
      const st = PSY.state.referral['REF-118'] || 'needs-call';
      const rank = PSY.flowRank();
      const chipEl = root.querySelector('header .chip.y');
      const back = first(root, 'a', '← Referrals'); if (back) back.textContent = '← New Cases'; go(back, 'referrals');
      const h1 = root.querySelector('h1'); if (h1) h1.textContent = h1.textContent.replace(/^Referral /, 'New case ');
      const crumb = Array.from(root.querySelectorAll('header span')).find((x) => /^REF-118/.test(tx(x))); if (crumb) crumb.textContent = 'REF-118 · new case · Lynchburg City · MS-2';
      const sched = first(root, 'button', 'Schedule screening call'), grant = first(root, 'button', 'Route to grant program');
      act(sched, 'ref-schedule'); act(grant, 'ref-grant');
      if (chipEl) { chipEl.textContent = REF_STATUS[st].chip; chipEl.className = 'chip ' + REF_STATUS[st].tone; }
      if (st === 'booked' && sched) { sched.textContent = 'Open the screening form in Lauris'; act(sched, 'go-ext-screening'); if (grant) grant.style.display = 'none'; }
      if (st === 'grant' && sched) { sched.style.display = 'none'; if (grant) { grant.textContent = 'Routed · undo'; act(grant, 'ref-undo'); } }
      if (PSY.state.family.step >= 5) {
        find(root, '.chip', /not yet|waiting/).forEach((c) => { if (/not yet$/.test(tx(c))) { c.textContent = 'done'; c.className = 'chip g'; } });
      }
      if (rank >= 1) captured(root, rank, chipEl, sched, grant);
    },
  };
  /* what the extension read from Lauris, shown on the new case */
  function captured(root, rank, chipEl, sched, grant) {
    const label = ['', 'Screening call captured', 'Intake captured', 'Plan captured · request drafted', 'Request approved · in Lauris', 'Request signed and sent'][Math.min(rank, 5)];
    if (chipEl) { chipEl.textContent = label; chipEl.className = 'chip g'; }
    const sub = root.querySelector('h1 + div'); if (sub) sub.textContent = 'Received Oct 13 · screening call Oct 16 · insurance needs 2 criteria, we can show 2 · all read from Lauris by the extension';
    // criteria card: what the screening call added
    const crs = Array.from(root.querySelectorAll('.cr'));
    if (crs.length >= 4) {
      const icon = crs[0].querySelector('svg');
      const setCr = (i, html, ok) => { const d = crs[i].querySelector('div'); if (d) d.innerHTML = html; if (ok && icon && crs[i].querySelector('svg')) crs[i].querySelector('svg').outerHTML = icon.outerHTML; };
      setCr(0, '<b>Difficulty establishing or maintaining interpersonal relationships</b>Behaviour report and screening call: peer aggression on 6 dated occasions, 2–3 times a week, 5–20 minutes, moderate; 2 office referrals; 1 day ISS (Oct 6). Schedule and grades received Oct 15: 7 classes, passing 4; 9 unexcused absences.', true);
      setCr(1, '<b>Documented repeated interventions that have not worked</b>Screening call (Oct 16): interventionist 2×/week since Sep 2026, no change; outpatient at Piedmont Mar–Jun 2025, 6 sessions, ended when transport fell through.', true);
      setCr(2, '<b>Cognitive ability to recognise danger to self or others</b>Screening call: grandmother says “he doesn’t see what could happen out there.” Left out of the request on purpose; two criteria are already met.', false);
      setCr(3, '<b>Level of care (1 of 5)</b>The school has raised alternative placement twice this year (screening call, Oct 16).', true);
    }
    find(root, '.chip', /Schedule and grades — missing/).forEach((x) => { x.textContent = 'Schedule and grades ✓ · received Oct 15'; x.className = 'chip g'; });
    find(root, '.chip', /ID not provided/).forEach((x) => { x.textContent = 'ID on file · asked on the call'; x.className = 'chip g'; });
    const need = find(root, '.chip', /criteria needed/)[0]; if (need) { need.textContent = '2 criteria needed · 2 shown'; need.className = 'chip g'; }
    // the "missing before the call" box becomes the capture timeline
    const box = Array.from(root.querySelectorAll('div')).find((d) => /^Missing before the screening call/.test(tx(d)) && d.style.background);
    if (box) {
      const line = (done, t, d) => '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid #EFEBE4;font-size:13px"><span style="flex:0 0 18px;color:' + (done ? '#15605E' : '#8E99A6') + ';font-weight:700">' + (done ? '✓' : '○') + '</span><div style="flex:1"><b>' + t + '</b><div style="color:#525B66;font-size:12px">' + d + '</div></div></div>';
      box.innerHTML = '<div class="f">Captured from Lauris by the extension</div>' +
        line(rank >= 1, 'Screening call · Oct 16', '38 minutes recorded · 19 boxes filled · read when you pressed Process Form') +
        line(rank >= 2, 'Intake and CNA · Oct 20', rank >= 2 ? '48 fields · PHQ-9 8 · prior services with dates' : 'waiting for you to process the CNA in Lauris') +
        line(rank >= 3, 'Treatment plan (ISP) · Oct 21', rank >= 3 ? '3 goals with objectives and interventions from the approved list' : 'waiting for you to process the plan in Lauris') +
        '<div style="display:flex;gap:8px;margin-top:10px">' + (rank >= 3 ? '<a class="btn p s" data-go="draft-initial">Open the request Psyflo drafted</a>' : '<a class="btn p s" data-go="' + (rank >= 2 ? 'lauris-isp' : 'lauris-cna') + '">Back to Lauris</a>') + '</div>';
    }
    // family link + eligibility rows: filled on the call
    find(root, '.row .chip', /^not yet/).forEach((x) => { x.textContent = 'captured on the call'; x.className = 'chip g'; });
    const mid = find(root, '.row', /^Medicaid ID/)[0]; if (mid) { const ch = mid.querySelector('.chip'); if (ch) { ch.textContent = 'on file · asked on the call'; ch.className = 'chip g'; } }
    const res = find(root, '.row', /^Check result/)[0]; if (res) { const ch = res.querySelector('.chip'); if (ch) { ch.textContent = 'active · checked Oct 16 · screenshot kept'; ch.className = 'chip g'; } }
    if (sched) { sched.style.display = 'none'; }
    if (grant) grant.style.display = 'none';
    const btns = sched && sched.parentElement; if (btns && !btns.querySelector('[data-psy="rr-next"]')) { const a = document.createElement('a'); a.className = 'btn p'; a.setAttribute('data-psy', 'rr-next'); if (rank >= 3) { a.setAttribute('data-go', 'draft-initial'); a.textContent = 'Open the drafted request'; } else { a.setAttribute('data-go', rank >= 2 ? 'lauris-isp' : 'lauris-cna'); a.textContent = 'Back to Lauris'; } btns.appendChild(a); }
  }
  PSY.acts['go-ext-screening'] = () => { PSY.go('lauris-screening'); };
  PSY.acts['ref-undo'] = () => { PSY.state.referral['REF-118'] = 'needs-call'; PSY.save(); PSY.refresh(); };
  PSY.acts['ref-schedule'] = () => {
    PSY.ui.modal({
      title: 'Schedule the screening call', sub: 'REF-118 · T.W., 12 · Lynchburg City MS-2 · the call is 30–45 minutes and unpaid, so book it when a clinician is free.',
      body: '<label>When</label><div class="opt on"><input type="radio" name="w" checked><div><b>Fri Oct 30 · 2:00 pm</b><div style="color:#525B66;font-size:13px">J. Perez, LPC · after the school day</div></div></div><div class="opt"><input type="radio" name="w"><div><b>Mon Nov 2 · 3:30 pm</b><div style="color:#525B66;font-size:13px">J. Perez, LPC</div></div></div><label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" checked style="accent-color:#217A78"> Text the guardian the family link now (Medicaid ID, consent, best time to call)</label>',
      actions: [{ label: 'Cancel' }, { label: 'Book the call', primary: true, onClick: () => { PSY.state.referral['REF-118'] = 'booked'; PSY.save(); PSY.ui.toast('Booked Fri Oct 30, 2:00 pm. The details are ready for the screening call.'); PSY.refresh(); } }],
      onOpen: (m) => m.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => { m.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); o.classList.add('on'); o.querySelector('input').checked = true; })),
    });
  };
  PSY.acts['ref-grant'] = () => PSY.ui.modal({
    title: 'Route to the DOE grant program?', sub: 'For a child with no Medicaid. No diagnosis is required and there is no insurer authorization.',
    body: '<p>Harvest will send the grant enrollment pack instead of an insurance request. You can undo this until the first session.</p>',
    actions: [{ label: 'Cancel' }, { label: 'Route to the grant program', primary: true, onClick: () => { PSY.state.referral['REF-118'] = 'grant'; PSY.save(); PSY.ui.toast('Routed to the grant program.'); PSY.refresh(); } }],
  });

  /* ================= 3 · Family link (phone) ================= */
  EX['family-phone'] = {
    mount(root, ctx) {
      const next = first(root, 'a.btn,.btn', 'Next');
      act(next, 'family-next');
      root.querySelectorAll('.rad label').forEach((l) => l.addEventListener('click', () => { l.parentElement.querySelectorAll('label').forEach((x) => x.classList.remove('on')); l.classList.add('on'); const i = l.querySelector('input'); if (i) i.checked = true; }));
    },
  };
  PSY.acts['family-next'] = (el, ctx) => {
    PSY.state.family.step = 5; PSY.save();
    const phone = ctx.root.querySelector('div[style*="width: 390px"]') || ctx.root.firstElementChild;
    const box = ctx.root.querySelector('[style*="10px solid"]');
    if (box) box.innerHTML = '<div style="height:100%;display:flex;flex-direction:column;background:#F8F6F2;font-family:inherit"><div style="background:#151B24;color:#fff;padding:20px"><div style="font-size:20px;font-weight:600">Harvest Outreach Center</div><div style="font-size:14px;color:#C9D1D6;margin-top:4px">All done</div><div style="display:flex;gap:6px;margin-top:14px">' + '<span style="flex:1;height:4px;background:#5FC0BE;border-radius:2px"></span>'.repeat(5) + '</div></div><div style="padding:28px 22px;font-size:17px;line-height:1.5"><div style="font-size:22px;font-weight:600;margin-bottom:10px">Thank you.</div>We will call you Friday afternoon. The school told us about your child; the call is where we ask about support at school.<div style="margin-top:22px;font-size:14px;color:#525B66">Only Harvest Outreach Center sees what you entered.</div></div><div style="margin-top:auto;padding:20px"><button data-go="ref-review" style="width:100%;min-height:54px;border-radius:12px;border:0;background:#217A78;color:#fff;font:600 17px inherit;cursor:pointer;font-family:inherit">Back to the new case (Harvest’s view)</button></div></div>';
  };

  /* ================= 3b · Family link settings ================= */
  EX['family-settings'] = {
    mount(root, ctx) {
      root.querySelectorAll('.sw').forEach((s) => { s.style.cursor = 'pointer'; s.addEventListener('click', () => { const off = s.classList.toggle('off'); const lbl = s.childNodes[s.childNodes.length - 1]; if (lbl && lbl.nodeType === 3) lbl.textContent = (/Yes|No/.test(lbl.textContent) ? (off ? 'No' : 'Yes') : (off ? 'Off' : 'On')); }); });
      act(first(root, 'a.btn', 'Save'), 'fs-save');
    },
  };
  PSY.acts['fs-save'] = () => PSY.ui.toast('Saved. Changes apply to new family links only.');

  /* ================= 8 · Initial SRA drafted ================= */
  EX['draft-initial'] = {
    mount(root, ctx) {
      go(first(root, 'a', '← Authorizations'), 'auth-list');
      act(first(root, 'a.btn', 'Save draft'), 'save-draft', { case: 'R-0416' });
      act(first(root, 'a.btn', 'Send back for edits'), 'send-back', { case: 'R-0416' });
      act(first(root, 'a.btn', /Approve · fill it into Lauris/), 'approve-fill', { case: 'R-0416' });
      // sign box marker
      const sign = Array.from(root.querySelectorAll('div')).find((d) => /By my signature/.test(tx(d)) && d.style.border && d.children.length < 6); if (sign) sign.setAttribute('data-psy', 'sign');
      sourceJumps(root);
    },
  };
  function sourceJumps(root) {
    const srcs = root.querySelectorAll('.src');
    root.querySelectorAll('sup').forEach((s) => {
      const n = parseInt((tx(s).split(',')[0] || '').replace(/\D/g, ''), 10);
      if (!n) return; s.style.cursor = 'pointer'; s.title = 'Jump to source ' + n;
      s.addEventListener('click', () => { const el = srcs[n - 1]; if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const old = el.style.background; el.style.transition = 'background .3s'; el.style.background = '#FFF3C4'; setTimeout(() => (el.style.background = old), 1400); });
    });
  }
  PSY.acts['save-draft'] = (el) => { PSY.ui.toast('Draft saved. It stays in Waiting for signature.'); setTimeout(() => PSY.go('auth-list'), 500); };
  PSY.acts['send-back'] = (el) => PSY.ui.modal({
    title: 'Send back for edits', sub: 'Psyflo will redraft the yellow boxes. It does not change anything in Lauris.',
    body: '<label>What should change?</label><textarea placeholder="e.g. Add the school counselor’s outcome for the interventionist support"></textarea>',
    actions: [{ label: 'Cancel' }, { label: 'Send back', primary: true, onClick: () => PSY.ui.toast('Sent back. A new draft will appear here in a few minutes.') }],
  });
  PSY.acts['approve-fill'] = (el, ctx) => {
    const id = el.getAttribute('data-case'); if (id === 'R-0416') PSY.state.flow.tw = 'approved';
    PSY.log(id, 'Approved in Psyflo; opened the Lauris form for the extension to fill.'); PSY.save();
    PSY.ui.toast('Approved. Opening the Lauris form: the extension types the yellow boxes there.');
    setTimeout(() => PSY.go('lauris-dmas?case=' + id + '&fill=1'), 500);
  };

  /* ================= 10 · Sent (two variants) ================= */
  const REP_MR = [
    ['R-0399 · A.L., 6', 'R-0411 · M.R., 7'],
    ['decision overdue by 3 days', 'decision due Nov 5'],
    ['<span class="chip r">decision', '<span class="chip y">decision'],
    ['Humana Healthy Horizons in Virginia · fax', 'Anthem HealthKeepers Plus · Availity'],
    ['Sent to Humana · A.L., 6 · Lynchburg City ES-3', 'Sent to Anthem · M.R., 7 · Campbell County ES-1'],
    ['Initial SRA · 150 units · signed Oct 19 · faxed Oct 19 · receipt confirmed Oct 29 · decision was due Oct 26', 'Concurrent SRA · 150 units · signed Oct 29 · sent in Availity Oct 29 · decision due Nov 5'],
    ['Send the overdue notice', 'Check Availity now'],
    ['Oct 19 · 2:04 pm', 'Oct 29 · 2:04 pm'],
    ['<div class="dt">Oct 19 · 2:06 pm</div><div><b>Faxed by Psyflo via Sfax</b> to Humana\'s authorization fax number · 11 pages · reference <b>F-2291</b> · Sfax delivery receipt 2:07 pm.</div>', '<div class="dt">Oct 29 · 2:09 pm</div><div><b>Sent in Availity</b> by J. Perez, LPC. Psyflo opened the case and attached the signed PDF; J. Perez pressed Send · confirmation <b>AV-77412</b>.</div>'],
    ['<div class="dt">Oct 19</div><div>7-calendar-day decision clock started · decision due Oct 26.</div>', '<div class="dt">Oct 29</div><div>7-calendar-day decision clock started · decision due Nov 5. Units on the current authorization run out in about 9 school days; the request goes in 14 business days ahead as Anthem asks.</div>'],
    ['<div class="dt">Oct 26</div><div>No decision received. Row marked overdue; added to Do next.</div>', '<div class="dt">Nov 5</div><div>If nothing has arrived, the row is marked overdue and added to Do next.</div>'],
    ['<div class="dt">Oct 29 · 10:12 am</div><div><b>Day-10 receipt call.</b> Psyflo dialed Humana provider services and waited on hold 14 min. When a person answered, the call was handed to the site supervisor for the member-ID check. Rep (first name logged) confirmed receipt on Oct 19 and said the case is "in clinical review."</div>', '<div class="dt">Nov 8 · day 10</div><div><b>Status check.</b> Psyflo reads the case status in Availity. No phone call is needed unless the status is missing.</div>'],
    ['<div class="dt">Today</div><div>Overdue notice drafted citing the 7-day standard. A clinician sends it.</div>', '<div class="dt">Today</div><div>Nothing to do. Psyflo reads Anthem’s decision from Availity when it posts.</div>'],
    ['R-0399_A.L._initial_signed.pdf · 11 pages', 'R-0411_M.R._continued_signed.pdf · 9 pages'],
    ['Sfax · Harvest\'s account', 'Availity · J. Perez’s own login'],
    ['<div>F-2291</div>', '<div>AV-77412</div>'],
    ['Confirmed Oct 19, 2:07 pm (Sfax receipt attached)', 'Availity status “received” Oct 29, 2:09 pm'],
    ['Oct 29, 10:12 am · rep confirmed · recording kept 90 days', 'not needed · status read in Availity'],
    ['Humana replies by fax. It arrives in Sfax, Psyflo matches it to this request by member ID and reference, and the row moves to approved, partial or denied. Nobody watches a fax machine.', 'Anthem posts the decision on Availity. The extension reads it from the case page and the row moves to approved, partial or denied. Nobody refreshes a portal.'],
    ['Sent the signed form. Dialed and waited on hold. Did not sign, did not speak for Harvest about the member, does not send the overdue notice.', 'Opened the Availity case and attached the signed form. Did not press Send and did not sign. It reads the decision when Anthem posts it.'],
  ];
  const REP_TW = [
        ['R-0399 · A.L., 6', 'R-0416 · T.W., 12'],
        ['decision overdue by 3 days', 'decision due Nov 5'],
        ['<span class="chip r">decision', '<span class="chip y">decision'],
        ['Sent to Humana · A.L., 6 · Lynchburg City ES-3', 'Sent to Humana · T.W., 12 · Lynchburg City MS-2'],
        ['Initial SRA · 150 units · signed Oct 19 · faxed Oct 19 · receipt confirmed Oct 29 · decision was due Oct 26', 'Initial SRA · 150 units · signed Oct 29 · faxed Oct 29 · decision due Nov 5 · receipt call scheduled Nov 8'],
        ['Send the overdue notice', 'Confirm receipt now'],
        ['Oct 19 · 2:04 pm', 'Oct 29 · 2:04 pm'], ['Oct 19 · 2:06 pm', 'Oct 29 · 2:06 pm'], ['reference <b>F-2291</b> · Sfax delivery receipt 2:07 pm', 'reference <b>F-2301</b> · Sfax delivery receipt 2:07 pm'],
        ['<div class="dt">Oct 19</div><div>7-calendar-day decision clock started · decision due Oct 26.</div>', '<div class="dt">Oct 29</div><div>7-calendar-day decision clock started · decision due Nov 5.</div>'],
        ['<div class="dt">Oct 26</div><div>No decision received. Row marked overdue; added to Do next.</div>', '<div class="dt">Nov 5</div><div>If nothing has arrived, the row is marked overdue and added to Do next.</div>'],
        ['<div class="dt">Oct 29 · 10:12 am</div><div><b>Day-10 receipt call.</b> Psyflo dialed Humana provider services and waited on hold 14 min. When a person answered, the call was handed to the site supervisor for the member-ID check. Rep (first name logged) confirmed receipt on Oct 19 and said the case is "in clinical review."</div>', '<div class="dt">Nov 8 · day 10</div><div><b>Day-10 receipt call (scheduled).</b> Psyflo dials Humana provider services and waits on hold. When a person answers, the call is handed to the site supervisor for the member-ID check.</div>'],
        ['<div class="dt">Today</div><div>Overdue notice drafted citing the 7-day standard. A clinician sends it.</div>', '<div class="dt">Today</div><div>Nothing to do. Psyflo watches Sfax for Humana’s reply and matches it by member ID and reference.</div>'],
        ['R-0399_A.L._initial_signed.pdf', 'R-0416_T.W._initial_signed.pdf'], ['<div>F-2291</div>', '<div>F-2301</div>'],
        ['Confirmed Oct 19, 2:07 pm (Sfax receipt attached)', 'Confirmed Oct 29, 2:07 pm (Sfax receipt attached)'],
        ['Oct 29, 10:12 am · rep confirmed · recording kept 90 days', 'scheduled Nov 8 (day 10)'],
        ['Sent the signed form. Dialed and waited on hold. Did not sign, did not speak for Harvest about the member, does not send the overdue notice.', 'Took the signed copy and faxed it. Did not sign and will not speak for Harvest about the member. It will dial for the receipt on day 10 and ask a person at Harvest to verify the member ID.'],
      ];
  EX['sent'] = {
    render(html, params) {
      if (params.case !== 'R-0416' && params.case !== 'R-0411') return html;
      const rep = params.case === 'R-0411' ? REP_MR : REP_TW;
      rep.forEach(([a, b]) => { html = html.split(a).join(b); });
      return html;
    },
    mount(root, ctx) {
      go(first(root, 'a', '← Authorizations'), 'auth-list');
      const pdf = first(root, 'a.btn', 'Open the signed PDF'); act(pdf, 'open-pdf', { case: ctx.params.case || 'R-0399' });
      const over = first(root, 'a.btn', /overdue notice|Confirm receipt/);
      act(over, ctx.params.case === 'R-0416' ? 'confirm-receipt' : ctx.params.case === 'R-0411' ? 'check-availity' : 'overdue-notice');
    },
  };
  PSY.acts['open-pdf'] = (el) => PSY.ui.modal({ title: 'Signed PDF', sub: el.getAttribute('data-case') + ' · initial SRA · 11 pages', wide: true, body: '<div class="letter" style="height:46vh;display:flex;align-items:center;justify-content:center;color:#525B66">The signed form as sent (page 1 of the preview).</div>' });
  PSY.acts['overdue-notice'] = (el, ctx) => PSY.ui.modal({
    title: 'Send the overdue notice?', sub: 'A clinician sends it. Psyflo drafted it citing the 7-calendar-day standard.',
    body: '<div class="letter">To: Humana Healthy Horizons in Virginia · Authorization department<br>Re: R-0399 · A.L., 6 · initial SRA submitted Oct 19 (Sfax F-2291)<br><br>Our request was received on October 19. The 7-calendar-day decision window ended October 26. Please confirm the status and expected decision date today.<br><br>J. Perez, LPC · Harvest Outreach Center</div>',
    actions: [{ label: 'Cancel' }, { label: 'Send it', primary: true, onClick: () => { PSY.setCase('R-0399', { next: 'Overdue notice sent Oct 29 by J. Perez (Sfax F-2304). Waiting for Humana.', clock: { text: 'overdue · notice sent', tone: 'y' } }); PSY.log('R-0399', 'Overdue notice sent by J. Perez, LPC.'); PSY.ui.toast('Overdue notice faxed · reference F-2304.'); } }],
  });
  PSY.acts['check-availity'] = () => PSY.ui.toast('Read Availity: status “received”, no decision yet. Next check tomorrow morning.');
  PSY.acts['confirm-receipt'] = () => PSY.ui.toast('Psyflo is dialing Humana provider services. The site supervisor will be asked to verify the member ID when a person answers.');

  /* ================= 14 · Info request ================= */
  EX['info-request'] = {
    mount(root, ctx) {
      go(first(root, 'a', '← Authorizations'), 'auth-list');
      find(root, 'a.btn', /^Edit/).forEach((b) => act(b, 'edit-reply'));
      act(first(root, 'a.btn', 'Review and send'), 'frag-send');
      act(first(root, 'a.btn', 'Open in Availity and send'), 'availity-send');
      const st = PSY.state.cases['R-0408'];
      if (st && st.stage === 'decision') { const b = first(root, 'a.btn', 'Open in Availity and send'); if (b) { b.textContent = 'Sent ✓'; b.setAttribute('data-act', ''); } }
    },
  };
  PSY.acts['edit-reply'] = (el, ctx) => { const letter = ctx.root.querySelector('section.card div[style*="border: 1px solid rgb(240, 180, 76)"]') || Array.from(ctx.root.querySelectorAll('div')).find((d) => /Thank you for your request of October 28/.test(d.textContent) && d.children.length > 3 && d.children.length < 30); if (letter) { const on = letter.contentEditable !== 'true'; letter.contentEditable = on ? 'true' : 'false'; if (on) letter.focus(); PSY.ui.toast(on ? 'Editing the reply. Psyflo keeps a record of what changed.' : 'Edits kept.'); } };
  PSY.acts['availity-send'] = (el, ctx) => PSY.ui.modal({
    title: 'Open in Availity and send', sub: 'A clinician sends the reply, in their own login.',
    body: '<p>Psyflo opens the Availity case for K.T. and pastes the letter as the attachment. You review it there and press <b>Send</b>.</p><div class="opt on"><input type="checkbox" checked disabled><div><b>Letter attached to the Availity case</b><div style="color:#525B66;font-size:13px">Case reference on file · 24-hour window ends today 5:40 pm</div></div></div>',
    actions: [{ label: 'Cancel' }, { label: 'I pressed Send in Availity', primary: true, onClick: () => { PSY.setCase('R-0408', { stage: 'decision', stageLabel: 'Decision pending', stageTone: 'n', clock: { text: 'reply sent today', tone: 'g' }, next: 'Reply sent in Availity today. Waiting for Anthem’s decision.', needsClinician: false, cta: { label: 'View', go: 'info-request', primary: false } }); PSY.log('R-0408', 'Reply sent by J. Perez in Availity.'); PSY.ui.toast('Marked sent. The 24-hour clock stopped; Psyflo will read Anthem’s decision from Availity.'); setTimeout(() => PSY.go('auth-list'), 700); } }],
  });

  /* ================= 15 · Concurrent SRA (M.R.) ================= */
  EX['draft-continued'] = {
    mount(root, ctx) {
      go(first(root, 'a', '← Authorizations'), 'auth-list');
      act(first(root, 'a.btn', 'Save draft'), 'save-draft', { case: 'R-0411' });
      act(first(root, 'a.btn', 'Send back for edits'), 'send-back', { case: 'R-0411' });
      act(first(root, 'a.btn', /Approve · fill it into Lauris/), 'approve-fill', { case: 'R-0411', to: 'lauris-sra?case=R-0411' });
      const sign = Array.from(root.querySelectorAll('div')).find((d) => /By my signature/.test(tx(d)) && d.style.border && d.children.length < 6); if (sign) sign.setAttribute('data-psy', 'sign');
      const t30 = first(root, 'button.tog', 'Last 30 days'), tAll = first(root, 'button.tog', 'Whole period');
      const notes = Array.from(root.querySelectorAll('.note'));
      const setR = (r) => { t30.classList.toggle('on', r === 30); tAll.classList.toggle('on', r !== 30); notes.forEach((n, i) => { n.style.display = r === 30 || i < 9 ? '' : ''; }); PSY.ui.toast(r === 30 ? 'Showing the last 30 days (what insurers ask for).' : 'Whole period: older notes are used only for “since the last request” sentences and are footnoted.'); };
      if (t30 && tAll) { t30.addEventListener('click', () => setR(30)); tAll.addEventListener('click', () => setR(0)); }
      const inc = first(root, 'button.tog', 'Include'), exc = first(root, 'button.tog', 'Exclude');
      if (inc && exc) {
        const sety = (v) => { inc.classList.toggle('on', v); exc.classList.toggle('on', !v); const hi = Array.from(root.querySelectorAll('span, div')).find((x) => x.style && x.style.background && /rgb\(252, 239, 208\)|#FCEFD0/.test(x.style.background) && /guardian reported a change/.test(tx(x))); if (hi) hi.style.display = v ? '' : 'none'; PSY.state.boxes['family-disclosure'] = v ? 'include' : 'exclude'; PSY.save(); PSY.ui.toast(v ? 'Included: this sentence travels to the payer.' : 'Excluded: the sentence is removed from the draft and the request.'); };
        inc.addEventListener('click', () => sety(true)); exc.addEventListener('click', () => sety(false));
      }
      root.querySelectorAll('.note').forEach((n) => { n.style.cursor = 'pointer'; });
      sourceJumps(root);
    },
  };

  /* ================= 16 · Partial decision (D.W.) ================= */
  const DOORS = {
    1: { plan: 'Plan if you accept: 120 units logged as awarded; tracker row updated; site supervisor at HS-1 notified; concurrent SRA draft auto-starts Dec 1 from the notes.', cta: 'Accept and log', act: 'door-accept' },
    3: { plan: 'Plan if you ask for a peer-to-peer: Psyflo books the call by phone on Sentara’s calendar (usually 4–8 weeks out) and writes the call notes. Most of the 120 units will be used before the call.', cta: 'Book the peer-to-peer', act: 'door-p2p' },
    4: { plan: 'Plan if you discharge: use the 120 units, discharge, then send a brand-new initial SRA with a monitoring plan and 30 days without service counted as new. Expect “why were units used early?”.', cta: 'Discharge and start over', act: 'door-discharge' },
  };
  EX['partials'] = {
    label: 'Partial decision · D.W.', num: '16',
    render(html) {
      return html.replace('<h1', '<h1').replace(/>Partials &amp; denials</g, '>Partial decision · D.W.<');
    },
    mount(root, ctx) {
      // retitle + trim blocks that live on the Payer Intelligence landing
      const h1 = root.querySelector('h1'); if (h1) h1.textContent = 'Partial decision · D.W., 14';
      const sub = h1 && h1.nextElementSibling; if (sub) sub.textContent = 'Sentara offered 120 of 150 units · decide by Oct 30';
      ['Why insurers say no', 'Peer-to-peer · T.N.', 'Denial · E.C.', 'Who does what'].forEach((t) => {
        const hd = Array.from(root.querySelectorAll('h2,div')).find((e) => tx(e).startsWith(t) && e.children.length <= 2);
        if (hd) { let card = hd.closest('section'); if (card) card.style.display = 'none'; }
      });
      Array.from(root.querySelectorAll('section.card')).forEach((s) => { if (/Why insurers say no|Who does what|Peer-to-peer · T\.N\.|Denial · E\.C\./.test(tx(s)) && !/Your options/.test(tx(s))) s.style.display = 'none'; });
      Array.from(root.querySelectorAll('div')).forEach((d) => { if (/^WHO DOES WHAT|^Who does what/i.test(tx(d)) && d.style.background) d.style.display = 'none'; });
      // inject a back link
      const hdr = root.querySelector('header'); if (hdr && !hdr.querySelector('[data-go="denials"]')) { const a = document.createElement('a'); a.textContent = '← Denial Intelligence'; a.setAttribute('data-go', 'denials'); a.style.cssText = 'font-weight:500;text-decoration:none;cursor:pointer'; hdr.insertBefore(a, hdr.firstChild); }
      const doors = Array.from(root.querySelectorAll('.door'));
      const planBox = Array.from(root.querySelectorAll('div')).find((d) => /^Plan if you accept/.test(tx(d)) && d.querySelector('a.btn,button.btn'));
      const planTxt = planBox && planBox.querySelector('div,span');
      const cta = planBox && planBox.querySelector('a.btn,button.btn');
      const apply = (k) => { const d = DOORS[k]; if (!d) return; if (planBox) { const t = Array.from(planBox.children).find((c) => !c.matches('a,button')) || planTxt; if (t) t.innerHTML = '<b>' + d.plan.split(':')[0] + ':</b>' + d.plan.slice(d.plan.indexOf(':') + 1); } if (cta) { cta.textContent = d.cta; act(cta, d.act); } };
      doors.forEach((b) => b.addEventListener('click', () => { doors.forEach((x) => x.classList.remove('on')); b.classList.add('on'); apply(parseInt(tx(b), 10)); }));
      act(cta, 'door-accept');
      find(root, 'a.btn', /Open call notes/).forEach((a) => go(a, 'p2p-notes'));
      find(root, 'a.btn', /Choose option 4/).forEach((a) => { a.addEventListener('click', () => { doors.find((x) => /^4/.test(tx(x))) && doors.find((x) => /^4/.test(tx(x))).click(); }); a.removeAttribute('data-go'); });
      find(root, 'a.btn', /guardian letter/).forEach((a) => act(a, 'guardian-letter'));
    },
  };
  PSY.acts['door-accept'] = () => PSY.ui.modal({
    title: 'Accept 120 units and log it?', sub: 'R-0402 · D.W., 14 · Sentara',
    body: '<p>Psyflo logs 120 units as awarded, updates the tracker row, tells the site supervisor at HS-1, and starts the concurrent SRA draft on Dec 1 from the notes.</p>',
    actions: [{ label: 'Cancel' }, { label: 'Accept and log', primary: true, onClick: () => { PSY.setCase('R-0402', { stage: 'active', stageLabel: 'Active', stageTone: 'g', units: { req: 150, line: '150 → 120 awarded', sub: '120 left · 3/day', bar: 5, barTone: '#217A78' }, clock: { text: '40 school days', tone: 'n' }, next: 'Accepted 120 units Oct 29. Concurrent SRA draft starts Dec 1.', needsClinician: false, cta: { label: 'View', go: 'case', params: { case: 'R-0402' }, primary: false } }); PSY.log('R-0402', 'Accepted Sentara’s 120 units; logged by J. Perez.'); PSY.ui.toast('Accepted and logged. The row moved to Active.'); setTimeout(() => PSY.go('denials'), 700); } }],
  });
  PSY.acts['door-p2p'] = () => PSY.ui.modal({
    title: 'Book a peer-to-peer with Sentara', sub: 'Psyflo phones Sentara and books the earliest slot. You make the call.',
    body: '<div class="opt on"><input type="radio" checked name="s"><div><b>Tue Dec 8 · 10:00–11:00 am</b><div style="color:#525B66;font-size:13px">Earliest available · 40 days out</div></div></div><div class="opt"><input type="radio" name="s"><div><b>Thu Dec 17 · 2:00 pm</b></div></div><p style="color:#8A2E1C;font-size:13px">You get one call. Most of the 120 units will be used before then.</p>',
    actions: [{ label: 'Cancel' }, { label: 'Book it', primary: true, onClick: () => { PSY.setCase('R-0402', { stage: 'p2p', stageLabel: 'Peer-to-peer booked', stageTone: 'n', clock: { text: 'Dec 8 · 40 days out', tone: 'r' }, next: 'Call notes are being written.', units: { req: 150, line: '150 → 120 offered', sub: 'peer-to-peer Dec 8' }, cta: { label: 'Call notes', go: 'p2p-notes', primary: false } }); PSY.log('R-0402', 'Peer-to-peer booked with Sentara for Dec 8.'); PSY.ui.toast('Booked Dec 8, 10:00 am. Psyflo will write the call notes.'); setTimeout(() => PSY.go('denials'), 700); }, }],
    onOpen: (m) => m.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => { m.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); o.classList.add('on'); o.querySelector('input').checked = true; })),
  });
  PSY.acts['door-discharge'] = () => PSY.ui.modal({
    title: 'Use the units, discharge, start over?', sub: 'This closes the authorization early and files a new initial SRA later.',
    body: '<p>Psyflo drafts the monitoring plan and the “why were units used early?” justification. After 30 days without service the new initial SRA counts as new.</p><p style="color:#8A2E1C;font-size:13px">Payers now question early discharges. This is a clinical decision.</p>',
    actions: [{ label: 'Cancel' }, { label: 'Choose this option', primary: true, onClick: () => { PSY.setCase('R-0402', { stage: 'active', stageLabel: 'Active · early discharge planned', stageTone: 'y', units: { req: 150, line: '150 → 120 awarded', sub: 'discharge when used' }, clock: { text: '40 school days', tone: 'n' }, next: 'Justification drafted. New initial SRA after 30 days without service.', needsClinician: false, cta: { label: 'View', go: 'case', params: { case: 'R-0402' }, primary: false } }); PSY.log('R-0402', 'Chose to use the units, discharge and file a new initial.'); PSY.ui.toast('Logged. Psyflo drafted the monitoring plan and justification.'); setTimeout(() => PSY.go('denials'), 700); } }],
  });
  PSY.acts['guardian-letter'] = () => PSY.ui.modal({
    title: 'Guardian letter · E.C., 5 · Anthem', sub: 'Only the guardian can appeal. Psyflo drafted a one-page, plain-language letter.', wide: true,
    body: '<div class="letter">Dear Anthem HealthKeepers Plus Appeals Department,<br><br>I am the legal guardian of E.C. I am asking you to review your decision of October 22 not to approve Therapeutic Day Treatment at school. Your letter says E.C. is “already connected to other services.” School counseling happens once a week and has not stopped the daily behaviour that puts E.C. at risk of being removed from school. TDT adds a trained staff member during lunch and transitions, where most incidents happen.<br><br>Please approve the 90 units requested.<br><br>Guardian signature: ____________________ &nbsp; Date: ________<br><br><span style="color:#525B66">Prepared with Harvest Outreach Center. Harvest keeps serving E.C. while this is reviewed; that choice is logged.</span></div>',
    actions: [{ label: 'Close' }, { label: 'Send to the guardian to sign', primary: true, onClick: () => { PSY.setCase('R-0384', { stage: 'appeal', stageLabel: 'Appeal with the guardian', stageTone: 'y', next: 'Letter sent to the guardian to sign Oct 29. Harvest keeps serving E.C. meanwhile.' }); PSY.ui.toast('Sent to the guardian by text to review and sign.'); } }],
  });

  /* ================= 17 · P2P notes ================= */
  EX['p2p-notes'] = {
    mount(root, ctx) {
      go(first(root, 'a', '← Partials'), 'denials');
      const bk = first(root, 'a', '← Denial Intelligence') || root.querySelector('header a'); if (bk && /Partials/.test(tx(bk))) bk.textContent = '← Denial Intelligence';
      act(first(root, 'a.btn', 'Print'), 'print-notes');
      find(root, 'a.btn,button.btn', /Log the outcome/).forEach((b) => act(b, 'log-outcome'));
    },
  };
  PSY.acts['print-notes'] = () => PSY.ui.toast('Sent to the printer: the notes are one page.');
  PSY.acts['log-outcome'] = () => PSY.ui.modal({
    title: 'Log the peer-to-peer outcome', sub: 'R-0388 · T.N., 8 · Sentara · Dec 9',
    body: '<label>Reviewer</label><input type="text" value="Dr. M. (first name logged)"><label>Decision</label><div class="opt on"><input type="radio" name="d" checked><div><b>Restored 60 more units</b> (65 → 125)</div></div><div class="opt"><input type="radio" name="d"><div><b>No change</b> · discharge and send a new initial</div></div>',
    actions: [{ label: 'Cancel' }, { label: 'Log it', primary: true, onClick: () => { PSY.setCase('R-0388', { stage: 'active', stageLabel: 'Active', stageTone: 'g', units: { req: 150, line: '150 → 125 awarded', sub: '60 restored on the call', bar: 52, barTone: '#217A78' }, clock: { text: 'renewal due Feb 6', tone: 'n' }, next: 'Outcome logged Dec 9: 60 units restored.', cta: { label: 'View', go: 'case', params: { case: 'R-0388' }, primary: false } }); PSY.log('R-0388', 'Peer-to-peer outcome logged: 60 units restored.'); PSY.ui.toast('Logged. The row moved to Active with 125 units.'); setTimeout(() => PSY.go('denials'), 700); } }],
    onOpen: (m) => m.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => { m.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); o.classList.add('on'); o.querySelector('input').checked = true; })),
  });

  /* ================= 11 · Authorizations list ================= */
  const ROWNAME = { humana: 'Humana', anthem: 'Anthem HealthKeepers', aetna: 'Aetna', sentara: 'Sentara', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS' };
  const TAB = { all: () => true, clin: (c) => c.needsClinician && ['sign', 'info', 'partial'].includes(c.stage), payer: (c) => ['submitted', 'decision', 'p2p', 'denied', 'appeal'].includes(c.stage), active: (c) => c.stage === 'active' };
  function rowHtml(c) {
    const stTone = c.stage === 'sign' ? 'b' : (c.stageTone || 'n');
    const u = c.units || {};
    return '<div class="r" data-case="' + c.id + '">' +
      '<div><a class="id" data-go="case?case=' + c.id + '">' + esc(c.who) + ' · ' + c.id + '</a><div class="sub">' + esc(c.school) + '</div><div class="sub">' + esc(c.type) + ' · ' + esc(c.service) + '</div></div>' +
      '<div><div style="font-weight:500">' + esc(ROWNAME[c.payer]) + '</div><div class="sub">' + esc(c.sendNote || PSY.data.payers[c.payer].channel) + '</div></div>' +
      '<div><div style="font-weight:500">' + esc(u.line || '') + '</div>' + (u.bar != null ? '<div class="bar"><i style="width:' + u.bar + '%;background:' + (u.barTone || '#217A78') + '"></i></div>' : '') + '<div class="sub">' + esc(u.sub || '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start"><span class="chip ' + stTone + '" style="white-space:normal">' + esc(c.stageLabel) + '</span>' + (c.clock && c.clock.text !== '—' ? '<span class="chip ' + c.clock.tone + '" style="white-space:normal">' + esc(c.clock.text) + '</span>' : '<span class="chip n">—</span>') + '</div>' +
      '<div style="font-size:13px">' + esc(c.next) + '</div>' +
      '<div style="text-align:right"><a class="btn ' + (c.cta.primary ? 'p' : 'o') + ' s" data-go="' + c.cta.go + (c.cta.params ? '?' + new URLSearchParams(c.cta.params).toString() : '') + '">' + esc(c.cta.label) + '</a></div></div>';
  }
  EX['auth-list'] = {
    mount(root, ctx) {
      const cases = PSY.allCases();
      const hdr = root.querySelector('.hdr'); const holder = hdr.parentElement;
      const draw = () => {
        const tab = ctx.tab || 'all'; const pay = root.querySelector('#payer').value, svc = root.querySelector('#svc').value, rt = root.querySelector('#rt').value;
        holder.querySelectorAll('.r').forEach((r) => r.remove());
        const rows = cases.filter(TAB[tab]).filter((c) => /^All/.test(pay) || PSY.data.payers[c.payer].name === pay).filter((c) => /^All/.test(svc) || (c.service + (c.code ? ' · ' + c.code : '')).startsWith(svc.split(' · ')[0]) ).filter((c) => /^All/.test(rt) || c.type.startsWith(rt.split(' (')[0]));
        holder.insertAdjacentHTML('beforeend', rows.map(rowHtml).join('') || '<div class="r" style="display:block;color:#525B66">Nothing matches these filters.</div>');
      };
      const tabs = Array.from(root.querySelectorAll('button.tab'));
      const keys = ['all', 'clin', 'payer', 'active'];
      tabs.forEach((t, i) => { t.querySelector('b').textContent = cases.filter(TAB[keys[i]]).length; t.addEventListener('click', () => { tabs.forEach((x) => x.classList.remove('on')); t.classList.add('on'); ctx.tab = keys[i]; draw(); }); });
      root.querySelectorAll('select.sel').forEach((s) => s.addEventListener('change', draw));
      const sub = root.querySelector('h1 + div'); if (sub) sub.textContent = cases.length + ' open · ' + cases.filter(TAB.clin).length + ' need clinical staff · ' + cases.filter(TAB.payer).length + ' with payers · ' + cases.filter(TAB.active).length + ' active';
      draw();
      act(first(root, 'a.btn', 'Start a concurrent SRA'), 'start-continued');
    },
  };
  PSY.acts['start-continued'] = () => PSY.ui.modal({
    title: 'Start a concurrent SRA', sub: 'Pick the student. Psyflo assembles the draft from the notes written in Lauris.',
    body: '<div class="opt on" data-go="draft-continued"><input type="radio" name="s" checked><div><b>M.R., 7 · R-0411</b><div style="color:#525B66;font-size:13px">Anthem · 27 of 110 units left · 9 school days</div></div></div><div class="opt"><input type="radio" name="s"><div><b>S.B., 11 · R-0395</b><div style="color:#525B66;font-size:13px">UnitedHealthcare · 14 left · 5 school days</div></div></div>',
    actions: [{ label: 'Cancel' }, { label: 'Open the draft', primary: true, onClick: () => { setTimeout(() => PSY.go('draft-continued'), 0); } }],
    onOpen: (m) => m.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => { m.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); o.classList.add('on'); o.querySelector('input').checked = true; })),
  });

  /* ================= 13 / 18 : locality segmented control (fallback; authored versions replace these) ================= */
  ['home', 'analytics'].forEach((id) => {
    EX[id] = Object.assign(EX[id] || {}, {
      mount(root, ctx) {
        const seg = root.querySelectorAll('.seg button');
        seg.forEach((b) => b.addEventListener('click', () => { seg.forEach((x) => x.classList.remove('on')); b.classList.add('on'); PSY.ui.toast('Showing ' + tx(b) + '.'); }));
        find(root, 'a.btn', /Open case/).forEach((a) => go(a, 'ref-review'));
        find(root, 'a.btn', /Review and sign/).forEach((a) => go(a, 'draft-continued'));
        find(root, 'a.btn', /Open draft/).forEach((a) => go(a, 'info-request'));
        find(root, 'a.btn', /four doors/).forEach((a) => go(a, 'partials'));
        find(root, 'a.btn', /See the log/).forEach((a) => go(a, 'sent?case=R-0399'));
        find(root, 'a.btn', /Start drafts/).forEach((a) => go(a, 'auth-list'));
        find(root, 'a.btn', /Open the tracker/).forEach((a) => go(a, 'auth-list'));
        find(root, 'a.btn', /Export/).forEach((a) => act(a, 'export-stub'));
      },
    });
  });
  PSY.acts['export-stub'] = () => PSY.ui.toast('Export prepared (PDF and CSV).');
  registerAll();
})();
