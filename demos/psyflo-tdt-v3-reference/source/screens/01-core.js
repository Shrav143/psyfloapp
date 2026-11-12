/* Round 5 core: one model shared by Lauris, the extension and the platform.
   PSY.auth    authorization statuses (Part 15), status badges, timelines, unit tracking
   PSY.ev      evidence labels (Part 7.2), payer-intelligence provenance labels (7.4), clickable citations
   PSY.audit   audit trail (Part 20.3): action, time, user or system, document, resulting status
   PSY.rules   payer requirements with sources; "Payer requirement verification needed" when unknown (Part 14)
   PSY.money   financial exposure = disputed units × configured rate; never an invented rate (Part 16)
   PSY.elig    eligibility vs benefits (Part 12)
   PSY.alerts  actionable alerts, derived from state (Parts 4.3, 15.3); round 9: payer decisions → the Denial Intelligence workspace
               (di-case?case=), drafts → PSY.enhance.openFor, everything else about an authorization → PSY.openCase
   PSY.ctx     which patient and which kind of Lauris screen is open (Part 4)
   PSY.flows   registry for the review workflows (initial, continued, decision); focus mode is retired in round 8
   PSY.ext views  round 9: the extension's list is "Case status | Today" (Today = the page's notes + Track Time together); one view = no dropdown
   PSY.presenter  presenter-only menu (round 9): View as, the nine scenarios of the prompt (§14), Reset Demo; outside the clinic-facing UI
   Round 10 wording: text the extension shows (alerts, the history modal, the citation viewer opened from Lauris) says "patient";
   the platform and the presenter keep "consumer".
   CSS for all of it is appended to both style sheets (Lauris shadow roots and platform shadow roots). */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const R5 = () => PSY.data.r5;
  const ME = 'J. Perez, LPC'; const SYS = 'Psyflo (system)';
  PSY.r5 = { ME, SYS };

  /* ================= statuses ================= */
  const ST = {
    draft: { label: 'Draft', tone: 'gray', i: '○' },
    review: { label: 'Awaiting clinical review', tone: 'amber', i: '◔' },
    ready: { label: 'Ready for submission', tone: 'blue', i: '→' },
    submitted: { label: 'Submitted', tone: 'blue', i: '↗' },
    pending: { label: 'Pending payer review', tone: 'blue', i: '…' },
    info: { label: 'Additional information requested', tone: 'red', i: '?' },
    approved: { label: 'Approved', tone: 'green', i: '✓' },
    partial: { label: 'Partially approved', tone: 'amber', i: '◐' },
    denied: { label: 'Denied', tone: 'red', i: '✕' },
    recon: { label: 'Reconsideration pending', tone: 'amber', i: '↻' },
    appeal: { label: 'Appeal pending', tone: 'amber', i: '⚑' },
    closed: { label: 'Closed', tone: 'gray', i: '■' },
  };
  const FROM_STAGE = { sign: 'review', info: 'info', partial: 'partial', p2p: 'partial', denied: 'denied', appeal: 'appeal', submitted: 'pending', sent: 'pending', decision: 'pending', active: 'approved', referral: 'draft', closed: 'closed' };
  const TO_STAGE = { draft: 'sign', review: 'sign', ready: 'sign', submitted: 'submitted', pending: 'submitted', info: 'info', approved: 'active', partial: 'partial', denied: 'denied', recon: 'p2p', appeal: 'appeal', closed: 'closed' };
  const A = (PSY.auth = {});
  A.STATUS = ST; A.ORDER = Object.keys(ST);
  A.meta = (id) => (R5().auth || {})[id] || {};
  /* status of a case: an explicit status5 (set by round-5 flows) wins; otherwise derived from the legacy stage */
  A.status = (id) => {
    const c = PSY.caseView(id); if (!c) return 'draft';
    if (c.status5) return c.status5;
    if (id === 'R-0416') { const r = PSY.flowRank(); if (r < 3) return 'draft'; if (r < 5) return 'review'; }
    return FROM_STAGE[c.stage] || 'draft';
  };
  /* T.W. is a New Case (referral → screening → intake → ISP) until the ISP is processed; then the initial SRA exists */
  A.visible = (id) => !(id === 'R-0416' && PSY.flowRank() < 3);
  A.label = (k) => (ST[k] || ST.draft).label;
  A.tone = (k) => (ST[k] || ST.draft).tone;
  A.badge = (k, extra) => { const s = ST[k] || ST.draft; return '<span class="st5 t-' + s.tone + '"><i aria-hidden="true">' + s.i + '</i>' + esc(extra || s.label) + '</span>'; };
  /* set a status: updates the case everywhere (legacy stage too), adds a timeline/audit event */
  A.set = (id, status, ev) => {
    ev = ev || {};
    const patch = { status5: status }; const stg = TO_STAGE[status]; if (stg) patch.stage = stg;
    if (ev.patch) Object.assign(patch, ev.patch);
    PSY.state.cases[id] = Object.assign({}, PSY.state.cases[id] || {}, patch);
    PSY.audit.add({ case: id, action: ev.action || ('Status changed to ' + A.label(status)), by: ev.by || ME, doc: ev.doc || '', status, silent: true });
    PSY.save();
  };
  /* a service's unit definition, with any payer override configured in Settings (PSY.state.unitOverrides['payer|service']) */
  A.service = (key, payer) => { const base = (R5().services || {})[key] || R5().services.tdt; const ov = ((PSY.state.unitOverrides || {})[payer + '|' + base.key]) || null; return ov ? Object.assign({}, base, ov, { overridden: true }) : base; };
  /* units: authorized, used, remaining, requested, expiration, unit label (Part 6.5) */
  A.units = (id) => {
    const m = A.meta(id); const c = PSY.caseView(id) || {}; const svc = A.service(m.service, c.payer);
    const L = PSY.data.lauris; const lc = L && m.laurisId ? L.byId(m.laurisId) : null;
    const cur = m.current ? Object.assign({}, m.current) : null;
    if (cur && lc && L.units(lc) != null) cur.remaining = L.units(lc); // what Lauris shows after any confirmed units today (includes any restored units)
    if (cur) cur.authorized += A.bonus(id);
    if (cur) cur.used = Math.max(0, cur.authorized - cur.remaining);
    const s = PSY.state.cases[id] || {};
    const req = Object.assign({}, m.request || {}, s.request5 || {});
    return { service: svc, current: cur, requested: req.units || null, period: req.period || '', approved: s.approved5 != null ? s.approved5 : (m.decision && m.decision.approved != null ? m.decision.approved : null), expires: cur ? cur.end : null, daysLeft: cur && cur.perDay ? Math.ceil(cur.remaining / cur.perDay) : null };
  };
  /* extra units restored on the authorization in force (a partial award later raised by peer-to-peer, reconsideration or appeal) */
  A.bonus = (id) => {
    const m = A.meta(id); const s = PSY.state.cases[id] || {}; const d = m.decision;
    if (!m.current || !d || d.type !== 'partial' || s.approved5 == null || m.current.authorized !== d.approved) return 0;
    return Math.max(0, s.approved5 - d.approved);
  };
  /* compact unit bar: authorized (track), used (filled), remaining, requested */
  A.unitBar = (id, o) => {
    o = o || {}; const u = A.units(id); const cur = u.current; const un = u.service.units;
    if (!cur) return u.requested ? '<div class="ub5"><div class="ub5-l"><b>' + u.requested + '</b> ' + un + ' requested' + (u.period ? ' · ' + esc(u.period) : '') + '</div><div class="ub5-n">No authorization in force yet.</div></div>' : '';
    const pct = Math.round((cur.used / Math.max(1, cur.authorized)) * 100);
    const low = cur.perDay && cur.remaining / cur.perDay <= 10;
    return '<div class="ub5' + (o.big ? ' big' : '') + '" role="img" aria-label="' + cur.used + ' of ' + cur.authorized + ' ' + un + ' used, ' + cur.remaining + ' remaining, expires ' + esc(cur.end) + '">' +
      '<div class="ub5-l"><span><b>' + cur.remaining + '</b> of ' + cur.authorized + ' ' + un + ' left</span><span class="ub5-x">' + (low ? '<i aria-hidden="true">!</i> ' : '') + 'expires ' + esc(cur.end) + '</span></div>' +
      '<div class="ub5-t"><i style="width:' + pct + '%"' + (low ? ' class="low"' : '') + '></i></div>' +
      '<div class="ub5-k"><span>Authorized ' + cur.authorized + '</span><span>Used ' + cur.used + '</span><span>Remaining ' + cur.remaining + (u.daysLeft != null ? ' (≈' + u.daysLeft + ' school days)' : '') + '</span>' + (u.requested ? '<span>Requested next ' + u.requested + '</span>' : '') + '</div></div>';
  };
  /* who did a seeded step (round 13: the same reading as History — the Psyflo agent submits through the payer's channel, the voice agent
     makes the payer calls; both simulated) */
  A.seedBy = (text) => { const t = String(text || '');
    if (/\b(called|call|phoned|phone)\b/i.test(t)) return 'Psyflo voice agent (simulated)';
    if (/\b(submitted|faxed|uploaded)\b|\bsent (to|via)\b|\bvia (sfax|availity)|portal/i.test(t) && !/\bby (j\.|m\.|k\.)/i.test(t)) return 'Psyflo agent (simulated)';
    return /psyflo|extension|drafted|assembled|read back|flagged/i.test(t) ? SYS : 'Harvest staff'; };
  /* timeline of a case, oldest first: hub history (seed) + audit events from this session */
  A.timeline = (id) => {
    const hub = (PSY.data.hub || {})[id]; const seed = (((R5().timelinePrefix || {})[id]) || []).concat((hub && hub.history) || []).map((h) => ({ t: h.t, action: h.text, by: A.seedBy(h.text), doc: '', seed: true }));
    if (id === 'R-0416') { const r = PSY.flowRank(); const keep = [0, 1, 2, 3, 4].filter((i) => i === 0 || (i === 1 && r >= 1) || (i === 2 && r >= 2) || (i === 3 && r >= 3) || (i === 4 && r >= 3)); seed.splice(0, seed.length, ...keep.map((i) => seed[i]).filter(Boolean)); }
    const live = (PSY.state.audit || []).filter((e) => e.case === id).slice().reverse();
    return seed.concat(live);
  };
  A.timelineHtml = (id, o) => {
    o = o || {}; let ev = A.timeline(id); if (o.limit) ev = ev.slice(-o.limit);
    if (!ev.length) return '<div class="tl5-empty">No events yet.</div>';
    return '<ol class="tl5">' + ev.map((e) => '<li><span class="tl5-t">' + esc(e.t) + '</span><div><b>' + esc(e.action) + '</b><span class="tl5-m">' + esc(e.by) + (e.doc ? ' · ' + esc(e.doc) : '') + (e.status ? ' · ' + esc(A.label(e.status)) : '') + '</span></div></li>').join('') + '</ol>';
  };

  /* ================= audit trail ================= */
  const AU = (PSY.audit = {});
  AU.add = (e) => {
    PSY.state.audit = PSY.state.audit || [];
    const ev = { t: e.t || ('Oct 29 · ' + PSY.now()), case: e.case || '', action: e.action, by: e.by || ME, doc: e.doc || '', status: e.status || '' };
    PSY.state.audit.unshift(ev); if (!e.silent) PSY.save(); return ev;
  };
  AU.list = (f) => { const all = PSY.state.audit || []; return f ? all.filter(f) : all; };
  /* full trail for the platform: session events (newest first) + seeded history of every case */
  AU.all = () => {
    const seed = []; PSY.data.cases.forEach((c) => { A.timeline(c.id).filter((e) => e.seed).forEach((e) => seed.push(Object.assign({ case: c.id }, e))); });
    return (PSY.state.audit || []).concat(seed.reverse());
  };

  /* ================= evidence labels + citations ================= */
  const EV = (PSY.ev = {});
  EV.KINDS = {
    ehr: { label: 'Verified EHR Data', i: '✓', tone: 'green' },
    ai: { label: 'AI Draft', i: '✎', tone: 'blue' },
    need: { label: 'Clinician Input Required', i: '!', tone: 'amber' },
    reviewed: { label: 'Clinician Reviewed', i: '✓✓', tone: 'green' },
    clin: { label: 'Clinician-entered', i: '✍', tone: 'green' },
    payer: { label: 'Payer Requirement', i: '§', tone: 'gray' },
    sent: { label: 'Submission Confirmed', i: '✓', tone: 'blue' },
    corr: { label: 'Payer Correspondence', i: '✉', tone: 'gray' },
    /* payer-intelligence provenance (Part 7.4) */
    policy: { label: 'Published policy', i: '§', tone: 'green' },
    documented: { label: 'Documented requirement', i: '▤', tone: 'green' },
    observed: { label: 'Historical observation', i: '◷', tone: 'gray' },
    suggestion: { label: 'AI suggestion', i: '✎', tone: 'blue' },
    unverified: { label: 'Verification needed', i: '?', tone: 'amber' },
    illustrative: { label: 'Illustrative demo data', i: '◇', tone: 'gray' },
  };
  EV.label = (k, text) => { const x = EV.KINDS[k] || EV.KINDS.ai; return '<span class="ev5 t-' + x.tone + '" data-ev="' + k + '"><i aria-hidden="true">' + x.i + '</i>' + esc(text || x.label) + '</span>'; };
  /* where a cited record lives: a Lauris page for EHR records, the case file for correspondence */
  EV.resolve = (label, caseId) => {
    const m = A.meta(caseId); const c = m.laurisId || ''; const L = String(label || '');
    const d = (L.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}(, \d{1,2}:\d\d [ap]m)?/) || [''])[0];
    let kind = 'ehr', go = c ? 'lauris-consumer?c=' + c : '', where = 'Lauris · consumer file', type = 'Record';
    if (/CNA|Intake|needs assessment/i.test(L)) { go = 'lauris-cna?c=' + c; where = 'Lauris · Intake / CNA'; type = 'Comprehensive Needs Assessment'; }
    else if (/ISP|Treatment plan|service plan/i.test(L)) { go = 'lauris-isp?c=' + c; where = 'Lauris · Individual Service Plan'; type = 'Individual Service Plan'; }
    else if (/Screening/i.test(L)) { go = 'lauris-screening?c=' + c; where = 'Lauris · Admission Screening'; type = 'Admission Screening'; }
    else if (/Daily note|notes|Progress note/i.test(L)) { go = 'lauris-dpn?c=' + c; where = 'Lauris · Daily Progress Notes'; type = 'Progress notes'; }
    else if (/guardian contact|collateral/i.test(L)) { go = 'lauris-saved'; where = 'Lauris · Saved sessions'; type = 'Contact notes'; }
    else if (/time log|Direct-hours|hours log/i.test(L)) { go = 'lauris-time'; where = 'Lauris · Time Tracker'; type = 'Time log'; }
    else if (/SRA|Lauris SRA|Signed PDF|Unit countdown|request history|Initial SRA/i.test(L)) { go = 'lauris-auths?c=' + c; where = 'Lauris · Authorizations'; type = 'Authorization record'; }
    else if (/Behaviour report|Behavior report|IEP|School|Schedule and grades|Referral/i.test(L)) { go = 'lauris-consumer?c=' + c + '&tab=docs'; where = 'Lauris · Documents (attached)'; type = 'Attached document'; }
    else if (/Availity|denial letter|letter|Call log|call|Sentara|Anthem|Aetna|Humana|UHC|payer/i.test(L)) { kind = 'corr'; go = c ? 'lauris-consumer?c=' + c + '&tab=docs' : ''; where = 'Payer correspondence on file'; type = 'Payer correspondence'; }
    return { label: L, kind, go, where, type, date: d };
  };
  /* excerpts shown in the citation viewer (builders add their own with EV.excerpt(case, label, text)) */
  const EXC = (EV.EXC = {});
  EV.excerpt = (caseId, label, text) => { EXC[caseId + '|' + label] = text; };
  EV.excerptOf = (caseId, label) => EXC[caseId + '|' + label] || null;
  /* a clickable citation: <button class="cite5">CNA · Oct 20</button> → opens the source viewer */
  EV.cite = (label, caseId, text) => '<button class="cite5" data-act="ev-cite" data-src="' + esc(label) + '" data-case="' + esc(caseId || '') + '" title="Open the source: ' + esc(label) + '"><i aria-hidden="true">↗</i>' + esc(text || label) + '</button>';
  EV.cites = (labels, caseId) => (labels || []).map((l) => EV.cite(l, caseId)).join(' ');
  EV.open = (label, caseId) => {
    const r = EV.resolve(label, caseId); const ex = EV.excerptOf(caseId, label);
    const hub = (PSY.data.hub || {})[caseId];
    let found = ex;
    if (!found && hub && hub.criteria) { const hit = hub.criteria.find((x) => x.evidence && x.evidence.indexOf(String(label).split(' ')[0]) >= 0); if (hit) found = hit.evidence; }
    /* round 10: opened from the extension (the Lauris tab) the viewer says "patient"; the platform keeps "consumer" */
    const ext = (PSY.current() || {}).app === 'lauris';
    PSY.ui.modal({
      title: r.type + (r.date ? ' · ' + r.date : ''), sub: ext ? r.where.replace(/\bconsumer file\b/, 'patient file') : r.where,
      body: '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + EV.label(r.kind) + '</div>' +
        (found ? '<blockquote class="q5">' + esc(found) + '</blockquote>' : ''),
      actions: [{ label: 'Close' }].concat(r.go ? [{ label: 'Open in Lauris', primary: true, onClick: () => { PSY.go(r.go); } }] : []),
    });
  };
  PSY.acts['ev-cite'] = (el) => EV.open(el.getAttribute('data-src'), el.getAttribute('data-case'));

  /* ================= payer requirements ================= */
  const RU = (PSY.rules = {});
  RU.KIND = { policy: 'policy', documented: 'documented', observed: 'observed', unverified: 'unverified' };
  /* the requirement list as staff left it: base rules + requirements added in Denial Intelligence, with staff verifications merged */
  RU.all = () => {
    const st = PSY.state.rules5 || {}; const ver = st.verified || {};
    return R5().rules.concat(st.added || []).map((r) => { const v = ver[r.id]; return v ? Object.assign({}, r, { verified: 'Verified by ' + (v.by || 'staff') + (v.at ? ' · ' + v.at : '') + (v.src ? ' · ' + v.src : ''), staffVerified: true }) : r; });
  };
  RU.forCase = (id, area) => {
    const c = PSY.caseView(id) || {}; const m = A.meta(id); const svc = m.service === 'op' ? 'op' : 'tdt';
    return RU.all().filter((r) => (r.service === '*' || r.service === svc || (svc === 'tdt' && r.service === 'tdt')) && (r.payers === '*' || r.payers.indexOf(c.payer) >= 0) && (!area || r.area === area));
  };
  RU.byId = (rid) => RU.all().find((r) => r.id === rid) || null;
  RU.chip = (r) => (r.kind === 'unverified' && r.staffVerified ? EV.label('documented', 'Verified by staff') : EV.label(r.kind === 'unverified' ? 'unverified' : r.kind));
  /* one requirement line: text + provenance + source */
  RU.line = (r) => '<div class="rq5"><div class="rq5-t">' + esc(r.text) + '</div><div class="rq5-m">' + RU.chip(r) + '<span>' + esc(r.source) + '</span>' + (r.verified ? '<span class="rq5-v">' + esc(r.verified) + '</span>' : '') + '</div></div>';
  RU.channel = (payer) => R5().channels[payer] || { method: 'Not configured', label: 'Submission method not configured', kind: 'unverified', source: 'Payer requirement verification needed' };
  RU.VERIFY = 'Payer requirement verification needed';
  /* standard line used whenever a requirement addresses a criterion (never a probability) */
  RU.ADDRESSES = 'This documentation addresses a requirement identified in the applicable payer criteria.';

  /* ================= money ================= */
  const MO = (PSY.money = {});
  MO.UNAVAILABLE = 'Financial exposure unavailable — reimbursement rate not configured';
  MO.rate = (payer, service) => { const r = PSY.state.rates || {}; const v = r[payer + '|' + service]; const w = r['*|' + service]; const x = v != null && v !== '' ? v : w; return x != null && x !== '' && !isNaN(+x) && +x > 0 ? +x : null; };
  MO.fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
  MO.exposure = (units, payer, service) => {
    const rate = MO.rate(payer, service || 'tdt');
    if (rate == null || units == null) return { ok: false, text: MO.UNAVAILABLE, short: 'Rate not configured' };
    const amt = units * rate;
    return { ok: true, amount: amt, text: MO.fmt(amt) + ' estimated at risk (' + units + ' units × $' + rate.toFixed(2) + ' configured rate)', short: MO.fmt(amt) + ' est.' };
  };
  MO.html = (units, payer, service) => { const e = MO.exposure(units, payer, service); return e.ok ? '<span class="mx5">' + esc(e.short) + '</span>' : '<span class="mx5 na" title="' + esc(MO.UNAVAILABLE) + '">—</span>'; };

  /* ================= eligibility vs benefits ================= */
  const EL = (PSY.elig = {});
  EL.of = (laurisId) => (R5().elig || {})[laurisId] || null;
  EL.pending = (laurisId) => { const e = EL.of(laurisId); return !!(e && e.change && !((PSY.state.elig5 || {})[laurisId])); };
  EL.confirm = (laurisId, choice) => {
    PSY.state.elig5 = PSY.state.elig5 || {}; PSY.state.elig5[laurisId] = { choice, at: PSY.now() };
    const c = PSY.data.lauris.byId(laurisId);
    PSY.audit.add({ case: c && c.case, action: 'Payer responsibility confirmed: ' + choice, by: ME, doc: 'Eligibility check (simulated)', status: c && c.case ? A.status(c.case) : '' });
  };
  EL.html = (laurisId) => {
    const e = EL.of(laurisId); const c = PSY.data.lauris.byId(laurisId); if (!e || !c) return '';
    const m = c.case ? A.meta(c.case) : {}; const b = R5().benefits[m.service === 'op' ? 'op' : 'tdt'];
    return '<div class="el5"><div class="el5-h">Eligibility</div>' +
      '<div class="el5-r"><span>' + EV.label('ehr', 'Checked ' + e.checked) + ' ' + EV.label('illustrative', 'Simulated') + '</span></div>' +
      '<div class="el5-g"><span>Coverage</span><b>' + esc(e.status) + ' · ' + esc(e.plan) + '</b><span>Since</span><b>' + esc(e.since) + '</b>' +
      (e.change ? '<span>Previous</span><b>' + esc(e.change.from) + ' (ended ' + esc(e.change.fromEnded) + ')</b>' : '') + '</div>' +
      '<div class="el5-h" style="margin-top:12px">Benefits</div>' +
      '<div class="el5-g"><span>Service</span><b>' + esc(b.covered) + '</b><span></span><i>' + esc(b.coveredSrc) + '</i><span>Authorization</span><b>' + esc(b.auth) + '</b><span></span><i>' + esc(b.authSrc) + '</i><span>Network</span><b>' + EV.label('unverified') + '</b></div></div>';
  };
  PSY.acts['r5-elig'] = (el) => {
    const id = el.getAttribute('data-c'); const e = EL.of(id); const c = PSY.data.lauris.byId(id); if (!e || !c) return;
    const ch = e.change;
    PSY.ui.modal({ wide: true, title: ch ? 'Coverage change detected · ' + c.ini : 'Eligibility and benefits · ' + c.ini,
      body: (ch ? '<div class="cc5"><div><span>Previous payer</span><b>' + esc(ch.from) + '</b><small>ended ' + esc(ch.fromEnded) + '</small></div><div class="cc5-ar" aria-hidden="true">→</div><div><span>Current payer</span><b>' + esc(ch.to) + '</b><small>active since ' + esc(e.since) + '</small></div></div><div style="height:12px"></div>' : '') + EL.html(id),
      actions: ch && EL.pending(id) ? [{ label: 'Not now' }, { label: 'Keep checking', onClick: () => { PSY.audit.add({ case: c.case, action: 'Coverage change reviewed; follow-up kept open', doc: 'Eligibility check (simulated)' }); PSY.refresh(); } },
        { label: 'Confirm ' + ch.to.split(' ')[0] + ' is responsible', primary: true, onClick: () => { EL.confirm(id, ch.to + ' responsible from ' + e.since); PSY.save(); PSY.refresh(); PSY.ui.toast('Recorded.'); } }] : [{ label: 'Close' }] });
  };

  /* ================= alerts ================= */
  const AL = (PSY.alerts = {});
  const L = () => PSY.data.lauris;
  AL.all = () => {
    const out = []; const add = (a) => out.push(a);
    const cs = PSY.allCases().filter((c) => A.visible(c.id) && PSY.locOk(c));
    const tw = PSY.caseView('R-0416');
    if (EL.pending('4492') && tw && PSY.locOk(tw)) add({ id: 'elig-4492', laurisId: '4492', caseId: 'R-0416', ini: 'T.W.', tone: 'amber', title: 'Coverage change detected', lines: ['Anthem HealthKeepers Plus → Humana Healthy Horizons in Virginia'], action: { label: 'Confirm payer', act: 'r5-elig', c: '4492' }, need: true, rank: 2 });
    cs.forEach((c) => {
      const st = A.status(c.id); const m = A.meta(c.id); const u = A.units(c.id); const id = m.laurisId; const d = m.decision || {};
      const base = { laurisId: id, caseId: c.id, ini: c.ini };
      const f5 = (PSY.state.flows5 || {})[c.id] || {};
      const l2p = (cid) => !!(PSY.l2 && PSY.l2.processed && PSY.l2.processed(cid));
      const inForms = st === 'review' && ((c.id === 'R-0416' && PSY.flowRank() === 4 && (!PSY.l2 || !PSY.l2.processed || l2p('R-0416'))) || (m.kind === 'continued' && (f5.sent || l2p(c.id))));
      if (inForms) add(Object.assign(base, { id: 'sign-' + id, tone: 'amber', title: 'Waiting for your signature', lines: ['In Forms to Approve'], action: { label: 'Open Forms to Approve', go: 'lauris-forms' }, need: true, rank: 2 }));
      else if (st === 'ready') add(Object.assign(base, { id: 'ready-' + id, tone: 'amber', title: 'Signed · ready to submit', lines: [PSY.rules.channel(c.payer).label], action: { label: 'Submit Authorization', flow: m.kind === 'continued' ? 'continued' : 'initial' }, need: true, rank: 2 }));
      else if (c.id === 'R-0416' && st === 'review') add(Object.assign(base, { id: 'init-' + id, tone: 'amber', title: 'Initial SRA ready for review', lines: ['One item requires clinical input.'], action: { label: 'Review Authorization', flow: 'initial' }, need: true, rank: 3 }));
      else if (m.kind === 'continued' && st === 'review') add(Object.assign(base, { id: 'cs-' + id, tone: 'amber', title: 'Authorization ending · ' + u.current.remaining + ' units left', lines: ['About ' + u.daysLeft + ' school days; ends ' + u.expires + '.'], action: { label: 'Review Draft', flow: 'continued' }, need: true, rank: 3 }));
      else if (m.kind === 'continued' && st === 'approved' && u.current && u.daysLeft != null && u.daysLeft <= 10 && !(PSY.state.cases[c.id] || {}).csStarted) add(Object.assign(base, { id: 'low-' + id, tone: 'amber', title: 'Low units · ' + u.current.remaining + ' left', lines: ['About ' + u.daysLeft + ' school days; ends ' + u.expires + '.'], action: { label: 'Prepare Concurrent SRA', flow: 'continued' }, need: true, rank: 4 }));
      else if (st === 'info') add(Object.assign(base, { id: 'info-' + id, tone: 'red', title: 'Payer requested additional information', lines: ['Response due ' + (d.due || 'soon') + '.'], action: { label: 'Review Request', flow: 'decision' }, need: true, rank: 1 }));
      else if (st === 'partial' && d.type === 'partial') add(Object.assign(base, { id: 'part-' + id, tone: 'red', title: 'Authorization partially approved', lines: ['Requested: ' + u.requested + ' units · Approved: ' + (u.approved != null ? u.approved : d.approved) + ' units'], action: { label: 'Review Payer Decision', flow: 'decision' }, need: true, rank: 1 }));
      else if (st === 'partial' && d.type === 'reduction') add(Object.assign(base, { id: 'red-' + id, tone: 'amber', title: (PSY.data.payers[c.payer] || {}).short + ' offered ' + d.approved + ' of ' + u.requested + ' units', lines: ['Reply by ' + d.due], action: { label: 'Review Payer Decision', flow: 'decision' }, need: true, rank: 2 }));
      else if (st === 'denied') add(Object.assign(base, { id: 'den-' + id, tone: 'red', title: 'Authorization denied', lines: ['Reason given: ' + (d.said || 'see letter'), 'Appeal deadline ' + (d.due || 'see notice') + '.'], action: { label: 'Review Payer Decision', flow: 'decision' }, need: true, rank: 2 }));
      else if (st === 'pending' && c.id === 'R-0399') add(Object.assign(base, { id: 'pend-' + id, tone: 'blue', title: 'Decision not received yet', lines: ['Receipt confirmed Oct 29'], action: { label: 'Authorization History', act: 'r5-history', c: id }, need: false, rank: 6 }));
      else if (st === 'pending' || st === 'submitted') add(Object.assign(base, { id: 'sub-' + id, tone: 'blue', title: 'Submitted · ' + A.label(st), lines: [], action: { label: 'Authorization History', act: 'r5-history', c: id }, need: false, rank: 7 }));
      else if (st === 'recon' || st === 'appeal') add(Object.assign(base, { id: 'rc-' + id, tone: 'amber', title: A.label(st), lines: [], action: { label: 'Open in Denial Intelligence', flow: 'decision' }, need: false, rank: 6 }));
    });
    const shut = (cid) => !!(PSY.di && PSY.di.closedForCase && PSY.di.closedForCase(cid));
    return out.filter((a) => !(a.caseId && /^(part|red|den|info)-/.test(a.id) && shut(a.caseId))).sort((a, b) => a.rank - b.rank);
  };
  AL.forPatient = (laurisId) => AL.all().filter((a) => a.laurisId === laurisId);
  AL.count = (laurisId) => (laurisId ? AL.forPatient(laurisId) : AL.all()).filter((a) => a.need).length;
  /* round 9: payer decisions (partial, denied, info requested, reconsideration, appeal) open their record in Denial Intelligence
     (di-case?case=…, a top-level tab again); drafts open the Lauris form with Scan & Enhance (PSY.enhance.openFor, owner B9).
     A role without Denial Intelligence gets the authorization page instead (PSY.openCase). Focus mode is retired. */
  AL.isDecision = (a) => ((a && a.action) || {}).flow === 'decision';
  AL.actAttrs = (a) => {
    const x = a.action || {};
    if (x.flow === 'decision') return 'data-act="open-case" data-case="' + esc(a.caseId) + '"';
    if (x.flow) return 'data-act="enhance-open" data-case="' + esc(a.caseId) + '"';
    if (x.act) return 'data-act="' + x.act + '" data-c="' + esc(x.c || a.laurisId) + '"';
    if (x.go) return 'data-go="' + esc(x.go) + '"';
    return '';
  };
  /* a decision opens in the platform tab (↗); a draft opens Scan & Enhance on its Lauris form */
  AL.diRoute = (cid) => (PSY.screens['di-case'] ? 'di-case?case=' + cid : PSY.platform.caseRoute(cid));
  AL.openDecision = (cid) => { if (!cid) return; if (PSY.can('denials')) PSY.go(AL.diRoute(cid)); else PSY.openCase(cid); };
  PSY.acts['open-di'] = (el) => AL.openDecision(el.getAttribute('data-case'));
  PSY.acts['open-auth'] = (el) => { const c = el.getAttribute('data-case'); if (c) PSY.openCase(c); };
  AL.openDraft = (cid) => {
    if (!cid) return;
    if (PSY.enhance && typeof PSY.enhance.openFor === 'function') { PSY.enhance.openFor(cid); return; }
    PSY.state.ext.open = true; PSY.state.ext.mode = 'sidebar'; PSY.save();
    PSY.go('lauris-dmas?case=' + cid);
  };
  PSY.acts['open-case'] = (el) => AL.openDecision(el.getAttribute('data-case'));
  PSY.acts['enhance-open'] = (el) => AL.openDraft(el.getAttribute('data-case'));
  AL.label = (a) => esc(a.action.label) + (AL.isDecision(a) ? ' <span aria-hidden="true">↗</span>' : '');
  AL.card = (a, o) => {
    o = o || {};
    return '<div class="al5 t-' + a.tone + '" data-alert="' + esc(a.id) + '"><div class="al5-h"><i aria-hidden="true">' + (a.tone === 'red' ? '!' : a.tone === 'amber' ? '◔' : 'i') + '</i><b>' + esc(a.title) + '</b>' + (o.who !== false ? '<span class="al5-who">' + esc(a.ini) + '</span>' : '') + '</div>' +
      (a.lines || []).map((l) => '<div class="al5-l">' + esc(l) + '</div>').join('') +
      '<div class="al5-a"><button class="btn ' + (a.need ? 'p' : 'o') + ' s" ' + AL.actAttrs(a) + '>' + AL.label(a) + '</button>' +
      (o.open !== false && a.laurisId ? '<button class="lnk5" data-go="lauris-consumer?c=' + esc(a.laurisId) + '">Open ' + esc(a.ini) + ' in Lauris</button>' : '') + '</div></div>';
  };

  /* ================= context: which patient, which kind of Lauris screen ================= */
  const CX = (PSY.ctx = {});
  const KIND = { 'lauris-consumers': 'list', 'lauris-consumer': 'profile', 'lauris-screening': 'assessment', 'lauris-cna': 'cna', 'lauris-isp': 'isp', 'lauris-dpn': 'notes', 'lauris-saved': 'notes', 'lauris-add-session': 'notes',
    'lauris-dmas': 'authform', 'lauris-case': 'authform', 'lauris-forms': 'approve', 'lauris-approvals': 'approve', 'lauris-auths': 'history', 'lauris-auth': 'history', 'lauris-noauth': 'list', 'lauris-reports': 'list', 'lauris-time': 'other', 'lauris-user': 'other', 'lauris-rejected': 'other' };
  CX.screen = (id) => KIND[id || PSY.current().id] || 'other';
  CX.patient = (route) => {
    route = route || PSY.current(); const p = route.params || {}; const Ld = L(); if (!Ld) return null;
    let c = null;
    if (p.c) c = Ld.byId(String(p.c)); if (!c && p.id) c = Ld.byId(String(p.id)); if (!c && p.case) c = Ld.byCase(String(p.case));
    if (!c && (route.id === 'lauris-dmas' || route.id === 'lauris-case') && !p.case) c = Ld.byCase('R-0416');
    if (!c) return null;
    const cv = c.case ? PSY.caseView(c.case) : null;
    return { laurisId: c.id, caseId: c.case || null, consumer: c, case: cv, ini: c.ini, payer: cv ? PSY.data.payers[cv.payer] : null };
  };
  /* the extension no longer explains each page: kept as an empty map so callers that read it get '' */
  CX.SCREEN_LINE = {};

  /* ================= review workflows (registered by flow modules) ================= */
  const FL = (PSY.flows = PSY.flows || {});
  /* the flow a case uses */
  FL.kindFor = (caseId) => {
    const st = A.status(caseId); const m = A.meta(caseId);
    if (['partial', 'denied', 'info', 'recon', 'appeal'].indexOf(st) >= 0) return 'decision';
    if (m.kind === 'continued') return 'continued';
    return 'initial';
  };
  /* round 8: focus mode is retired. Older buttons that still say data-act="r5-focus" go where the work now lives:
     payer decisions → the platform case page; initial / continued drafts → the Lauris form with Scan & Enhance */
  PSY.acts['r5-focus'] = (el) => {
    const cid = el.getAttribute('data-case'); const flow = el.getAttribute('data-flow') || (cid ? FL.kindFor(cid) : '');
    if (flow === 'decision') AL.openDecision(cid); else AL.openDraft(cid);
  };
  PSY.acts['r5-unfocus'] = () => PSY.ext.unfocus();
  PSY.acts['r5-collapse'] = () => PSY.ext.set(false);
  PSY.acts['r5-expand'] = () => PSY.ext.set(true);
  PSY.acts['r5-history'] = (el) => {
    const lid = el.getAttribute('data-c'); const lc = L().byId(lid); const cid = (lc && lc.case) || el.getAttribute('data-case'); if (!cid) return;
    const c = PSY.caseView(cid); const m = A.meta(cid); const u = A.units(cid); const prev = ((PSY.data.hub || {})[cid] || {}).history || [];
    PSY.ui.modal({ wide: true, title: 'Authorization history · ' + c.ini, sub: (PSY.data.payers[c.payer] || {}).name + ' · ' + u.service.label,
      body: '<div class="ah5"><div class="ah5-c"><div class="cap5">Current</div>' + A.badge(A.status(cid)) + '<div style="margin-top:8px">' + (u.current ? A.unitBar(cid) : '<div>' + esc(c.type) + ' · ' + (u.requested || '') + ' ' + u.service.units + ' requested</div>') + '</div>' +
        '<div class="ah5-g"><span>Authorization</span><b>' + esc(m.ref || '—') + '</b><span>Request</span><b>' + esc(c.type) + ' · ' + (u.requested || '—') + ' ' + u.service.units + (u.period ? ' · ' + esc(u.period) : '') + '</b></div></div>' +
        '<div class="cap5" style="margin:14px 0 6px">Timeline</div>' + A.timelineHtml(cid) + '</div>',
      actions: [{ label: 'Close' }, { label: 'Open in Lauris', onClick: () => PSY.go('lauris-auths?c=' + m.laurisId) }].concat(PSY.can('platform') ? [{ label: 'Open in Psyflo', primary: true, onClick: () => PSY.openCase(cid) }] : []) });
  };

  /* ================= the extension's list views (round 9) =================
     One list under the buttons, no tabs and no nested navigation. "Case status" (LCS, admin) is the mini case status of 03-ext-status.js;
     "Today" (anyone who writes notes or tracks time) is the page's Notes pane and the Track Time pane shown together as one scroll:
     the notes to write today, then the time entries (owner T9's pane, PSY.ext.defaults.time). A role with one view gets no dropdown:
     DSS see Today only, the admin sees Case status only. The shell still renders the panes 'cases' | 'notes' | 'time'; these overrides
     decide which are shown (PSY.ext.applyView runs after every render through PSY.ui.wireBasics, and on every PSY.ext.setView).
     Older callers keep working: setView/tab('notes' | 'time') → Today, 'status' → Case status. */
  const X = PSY.ext;
  X.VIEWS = { cases: 'Case status', today: 'Today' };
  const VAL = { cases: 'cases', status: 'cases', today: 'today', notes: 'today', time: 'today' };
  const writes = () => PSY.can('time') || ['dpn', 'collateral', 'monthly', 'admission', 'intake'].some((k) => PSY.can('scribe:' + k));
  X.views = () => { const v = []; if (PSY.can('cases')) v.push('cases'); if (writes()) v.push('today'); return v.length ? v : ['today']; };
  X.view = () => { const vs = X.views(); const v = VAL[PSY.state.ext.view || PSY.state.ext.tab] || ''; return vs.indexOf(v) >= 0 ? v : vs[0]; };
  X.applyView = (root) => {
    root = root || PSY.activeRoot(); const list = root && root.querySelector('[data-psy="xp-list"]'); if (!list) return;
    const v = X.view(); const vs = X.views();
    list.setAttribute('data-view', v); list.setAttribute('data-scroll', 'xp-list');
    list.querySelectorAll(':scope > [data-pane]').forEach((p) => { const k = p.getAttribute('data-pane'); p.hidden = !(k === v || (v === 'today' && (k === 'notes' || k === 'time'))); });
    const notes = list.querySelector(':scope > [data-pane="notes"]');
    if (notes) notes.toggleAttribute('data-empty', !notes.textContent.trim() && !notes.querySelector('button,a,input,select,textarea'));
    const bar = list.querySelector('.xp-vbar'); if (bar) bar.hidden = vs.length < 2;
    const sel = list.querySelector('[data-psy="xp-view"]'); if (sel && sel.value !== v) sel.value = v;
  };
  X.setView = (name) => {
    name = VAL[name] || name; if (X.views().indexOf(name) < 0) name = X.views()[0];
    PSY.state.ext.view = name; PSY.state.ext.tab = name; PSY.save(); X.applyView();
  };
  if (!PSY.ui.wireBasics.__c9view) {
    const wb0 = PSY.ui.wireBasics;
    PSY.ui.wireBasics = function (root) { const r = wb0.apply(this, arguments); try { X.applyView(root); } catch (e) { console.error('applyView', e); } return r; };
    PSY.ui.wireBasics.__c9view = true;
  }
  PSY.css.lauris = (PSY.css.lauris || '') + `
.xp-list[data-view="today"]{overflow:auto}
.xp-list[data-view="today"]>.xp-body{flex:0 0 auto;overflow:visible}
.xp-list[data-view="today"]>[data-pane="notes"]{padding-bottom:2px}
.xp-list[data-view="today"]>[data-pane="notes"][data-empty]{display:none}
.xp-list[data-view="today"]>[data-pane="time"]{padding-top:10px}
.xp-vbar[hidden]{display:none}
`;

  /* ================= presenter (not part of the product UI) ================= */
  const PR = (PSY.presenter = PSY.presenter || {});
  /* round 9: "View as" (the three roles), the nine scenarios of the prompt (§14), Reset Demo.
     A scenario resets the demo, sets the role, runs its owner's prep (PR.prep.s1 … s9, plus a round-8 key where one exists; a missing hook
     is fine), then opens its starting page: Lauris first (so the Lauris tab always has a page), then the platform page if any.
     A prep may return a route to start somewhere else (a 'lauris-…' route replaces the Lauris page, any other the platform page).
     Owners: s1 A9 · s2 T9 · s3, s4 B9 · s5 D9 · s6, s7 DI-2 · s8 DI-1 · s9 F9. */
  PR.scenarios = [
    { id: 's1', role: 'dss', label: 'Direct support staff creates a progress note', sub: 'DSS · M.R. · Daily Progress Note', go: 'lauris-dpn?c=4471', open: true },
    { id: 's2', role: 'dss', label: 'Direct support staff tracks interventions', sub: 'DSS · M.R. · Track Time', go: 'lauris-dpn?c=4471', open: true },
    { id: 's3', role: 'lcs', label: 'Clinician enhances a progress note', sub: 'LCS · M.R. · today’s DPN', go: 'lauris-dpn?c=4471', open: true },
    { id: 's4', role: 'lcs', label: 'Clinician enhances an SRA', sub: 'LCS · T.W. · initial SRA', go: 'lauris-dmas?case=R-0416', open: true, legacy: 'initial', before: () => { PSY.state.flow.tw = 'isp'; } },
    { id: 's5', role: 'admin', label: 'Administrator tracks authorizations', sub: 'Admin · All Authorizations', go: 'lauris-consumers', platform: 'auth-list' },
    { id: 's6', role: 'lcs', label: 'Clinician manages a denial', sub: 'LCS · E.C. · Anthem denial', go: 'lauris-consumer?c=4437', platform: 'di-case?case=R-0384' },
    { id: 's7', role: 'lcs', label: 'Clinician prepares for peer-to-peer review', sub: 'LCS · T.N. · Sentara · 150 requested, 65 approved', go: 'lauris-consumer?c=4441', platform: 'di-case?case=R-0388' },
    { id: 's8', role: 'admin', label: 'Administrator reviews denial patterns', sub: 'Admin · Analytics · Payer Performance · denial patterns', go: 'lauris-consumers', platform: 'analytics' },
    { id: 's9', role: 'admin', label: 'Administrator reviews population trends', sub: 'Admin · Analytics · Population', go: 'lauris-consumers', platform: 'analytics' },
    { id: 's10', role: 'admin', label: 'Clinic pulls custom data with FLO', sub: 'Admin · FLO agent · substance use · diagnosis, medications, age', go: 'lauris-consumers', platform: 'analytics' },
    { id: 's11', role: 'lcs', label: 'Voice agent follows up on a denial', sub: 'LCS · E.C. · Anthem · reference number and next step', go: 'lauris-consumers', platform: 'di-case?case=R-0384' },
    { id: 's12', role: 'lcs', label: 'Clinician checks the roster in the extension', sub: 'LCS · extension Overview · what needs action today', go: 'lauris-consumers', open: true },
    { id: 's13', role: 'lcs', label: 'Clinician reviews outcomes and timelines', sub: 'LCS · Analytics · Outcomes and review', go: 'lauris-consumers', platform: 'analytics' }, // round 15 (AN15)
  ];
  PR.prep = PR.prep || {}; // PR.prep.sN = () => {...}  state set by the owning module before the jump (may return a start route)
  /* a platform route whose page is not registered (yet) falls back to its case page, else Authorizations */
  const platformRoute = (r) => {
    const id = String(r).split('?')[0]; if (PSY.screens[id]) return r;
    const cid = (/[?&]case=([^&]+)/.exec(r) || [])[1]; return cid ? PSY.platform.caseRoute(cid) : 'auth-list';
  };
  PR.start = (id) => { const s = PR.scenarios.find((x) => x.id === id); return s ? { role: s.role, lauris: s.go, platform: s.platform ? platformRoute(s.platform) : null } : null; };
  PR.jump = (id) => {
    const s = PR.scenarios.find((x) => x.id === id); if (!s) return;
    PSY.reset({ silent: true });
    PSY.state.role = s.role;
    if (s.before) s.before();
    let go = s.go; let plat = s.platform || null;
    [s.legacy, s.id].forEach((k) => {
      const f = k && PR.prep[k]; if (typeof f !== 'function') return;
      try { const r = f(); if (typeof r === 'string' && r) { if (/^lauris-/.test(r)) go = r; else plat = r; } } catch (e) { console.error('presenter prep', k, e); }
    });
    PSY.state.role = s.role; // the scenario's role wins over anything a prep set
    PSY.state.ext.mode = s.open ? 'sidebar' : 'collapsed'; PSY.state.ext.open = !!s.open; PSY.state.ext.seen = !!s.open; PSY.save();
    PSY.go(go);
    if (plat) PSY.go(platformRoute(plat));
    PSY.ui.toast('Scenario ' + s.id.slice(1) + ' loaded.');
  };
  const roleRow = () => '<div class="pm-roles" role="group" aria-label="View as">' + PSY.ROLE_ORDER.map((k) => { const r = PSY.ROLES[k]; return '<button type="button" role="menuitemradio" aria-checked="' + (PSY.role() === k) + '" class="' + (PSY.role() === k ? 'on' : '') + '" data-pr-role="' + k + '" title="' + esc(r.label + ' · ' + r.name) + '">' + esc(r.short) + '</button>'; }).join('') + '</div>';
  function presenterUi() {
    const strip = document.getElementById('tabs'); if (!strip || document.getElementById('presBtn')) return;
    const b = document.createElement('button'); b.id = 'presBtn'; b.type = 'button'; b.title = 'Presenter tools (not part of Psyflo)'; b.setAttribute('aria-haspopup', 'true');
    b.innerHTML = '<span aria-hidden="true">◧</span> Presenter';
    const menu = document.createElement('div'); menu.id = 'presMenu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
    const draw = () => {
      menu.innerHTML = '<div class="pm-h">View as</div>' + roleRow() + '<div class="pm-sep"></div><div class="pm-h">Scenarios</div>' +
        PR.scenarios.map((s, i) => '<button role="menuitem" data-scn="' + s.id + '"><b>' + (i + 1) + ' · ' + esc(s.label) + '</b>' + (s.sub ? '<span>' + esc(s.sub) + '</span>' : '') + '</button>').join('') +
        '<div class="pm-sep"></div>' + (PSY.api && PSY.api.showLog ? '<button role="menuitem" data-pm="api"><b>Demo backend · API log</b><span>In-browser demo backend (simulated; no external systems)</span></button>' : '') + // round 13 (HIST13)
        '<button role="menuitem" data-scn="reset"><b>Reset Demo</b></button>';
    };
    draw();
    strip.appendChild(b); document.getElementById('win').appendChild(menu);
    b.addEventListener('click', (e) => { e.stopPropagation(); if (menu.hidden) draw(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== b) menu.hidden = true; });
    menu.addEventListener('click', (e) => {
      const r = e.target.closest('[data-pr-role]'); if (r) { menu.hidden = true; PSY.setRole(r.getAttribute('data-pr-role')); return; }
      if (e.target.closest('[data-pm="api"]')) { menu.hidden = true; PSY.api.showLog(); return; } // round 13 (HIST13): the demo backend's call log
      const it = e.target.closest('[data-scn]'); if (!it) return; menu.hidden = true;
      const k = it.getAttribute('data-scn');
      if (k === 'reset') { PSY.reset(); PSY.ui.toast('Demo reset.'); } else PR.jump(k);
    });
  }
  PR.ui = presenterUi;

  /* modal content can carry data-go / data-act too (the modal sits outside the screens' shadow roots) */
  document.getElementById('modal').addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); PSY.ui.closeModal(); PSY.go(g.getAttribute('data-go')); return; }
    const a = e.target.closest('[data-act]'); if (a && PSY.acts[a.getAttribute('data-act')]) { e.preventDefault(); PSY.acts[a.getAttribute('data-act')](a, { root: document.getElementById('modal'), refresh: PSY.refresh, toast: PSY.ui.toast }, e); }
  });

  /* ================= CSS (appended to both style sheets) ================= */
  const CSS = `
.st5,.ev5{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 9px 2px 7px;font-size:12px;font-weight:600;line-height:1.35;white-space:nowrap;border:1px solid transparent;font-family:inherit}
.st5 i,.ev5 i{font-style:normal;font-size:11px;line-height:1;min-width:10px;text-align:center}
.t-green.st5,.t-green.ev5{background:#E3F1EA;color:#1E5C3C;border-color:#BFDCCB}
.t-amber.st5,.t-amber.ev5{background:#FCF0D6;color:#6F4A05;border-color:#EFD49A}
.t-red.st5,.t-red.ev5{background:#FBE7E2;color:#8A2E1C;border-color:#F0C3B8}
.t-blue.st5,.t-blue.ev5{background:#E6EEF8;color:#24476E;border-color:#C7D7EC}
.t-gray.st5,.t-gray.ev5{background:#EFEDE8;color:#4A4740;border-color:#DDD8CF}
.cite5{display:inline-flex;align-items:center;gap:4px;border:1px solid #C7D7EC;background:#F4F8FC;color:#24476E;border-radius:6px;padding:1px 7px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;line-height:1.5;white-space:nowrap}
.cite5:hover{background:#E6EEF8}.cite5 i{font-style:normal;font-size:10px}
.ub5{display:flex;flex-direction:column;gap:5px;font-size:12.5px}
.ub5-l{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.ub5-l b{font-size:15px}
.ub5-x{color:#6B665E;white-space:nowrap}.ub5-x i{font-style:normal;color:#8A2E1C;font-weight:700}
.ub5-t{height:8px;border-radius:99px;background:#E9E4DB;overflow:hidden}.ub5-t i{display:block;height:100%;background:#2F6F5E;border-radius:99px}.ub5-t i.low{background:#B9541F}
.ub5-k{display:flex;flex-wrap:wrap;gap:4px 12px;color:#6B665E;font-size:11.5px}
.ub5.big .ub5-t{height:12px}.ub5.big .ub5-l b{font-size:20px}
.ub5-n{color:#6B665E;font-size:12px}
.tl5{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.tl5 li{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;padding:7px 0;border-top:1px solid #EFEBE4;font-size:13px;line-height:1.4}
.tl5 li:first-child{border-top:0}.tl5-t{color:#6B665E;font-size:12px;padding-top:1px}.tl5 b{font-weight:600;display:block}.tl5-m{display:block;color:#6B665E;font-size:12px}
.tl5-empty{color:#6B665E;font-size:13px}
.rq5{padding:8px 0;border-top:1px solid #EFEBE4}.rq5:first-child{border-top:0}
.rq5-t{font-size:13px;line-height:1.45}.rq5-m{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:4px;font-size:11.5px;color:#6B665E}.rq5-v{font-style:italic}
.mx5{font-weight:600;white-space:nowrap}.mx5.na{font-weight:500;color:#6B665E;font-size:12px;border-bottom:1px dotted #9A9388;cursor:help}
.al5{border:1px solid #E5DCD0;border-left:4px solid #9A9388;border-radius:8px;background:#fff;padding:9px 11px;display:flex;flex-direction:column;gap:3px}
.al5.t-red{border-left-color:#B23A22}.al5.t-amber{border-left-color:#D69A1F}.al5.t-blue{border-left-color:#3D6EA8}.al5.t-green{border-left-color:#2F8F5B}
.al5-h{display:flex;align-items:center;gap:7px;font-size:13.5px}.al5-h b{font-weight:700;flex:1;min-width:0}
.al5-h i{font-style:normal;flex:0 0 18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;background:#9A9388}
.al5.t-red .al5-h i{background:#B23A22}.al5.t-amber .al5-h i{background:#C98A12}.al5.t-blue .al5-h i{background:#3D6EA8}
.al5-who{font-size:11.5px;font-weight:700;color:#4A453D;background:#F1ECE4;border-radius:5px;padding:1px 6px}
.al5-l{font-size:12.5px;color:#4A453D;line-height:1.4;padding-left:25px}
.al5-a{display:flex;align-items:center;gap:10px;padding-left:25px;margin-top:5px;flex-wrap:wrap}
.lnk5{border:0;background:none;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:#1D4F43;text-decoration:underline;cursor:pointer}
.cap5{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700}
.q5{margin:0;padding:10px 12px;border-left:3px solid #C7D7EC;background:#F7F9FC;font-size:13.5px;line-height:1.5;border-radius:0 6px 6px 0}
.ah5-g,.el5-g{display:grid;grid-template-columns:110px minmax(0,1fr);gap:5px 12px;font-size:13px;margin-top:10px}.ah5-g span,.el5-g span{color:#6B665E}.el5-g i{color:#6B665E;font-size:11.5px}
.el5-h{font-weight:700;font-size:14px}.el5-h small{font-weight:500;color:#6B665E;font-size:12px;margin-left:6px}.el5-r{margin-top:6px}
.el5-n{margin:12px 0 0;font-size:12.5px;color:#4A453D;background:#F6F0E8;border-radius:6px;padding:8px 10px}
.cc5{display:grid;grid-template-columns:1fr 34px 1fr;align-items:center;gap:8px;background:#FCF0D6;border:1px solid #EFD49A;border-radius:8px;padding:10px 12px}
.xp [data-psy="scribe-box"]:empty{display:none}
.cc5 span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6F4A05}.cc5 b{display:block;font-size:14px}.cc5 small{color:#6B665E}.cc5-ar{font-size:20px;text-align:center;color:#6F4A05}
`;
  PSY.css.r5 = CSS;
  /* the modal lives in the page document (outside the shadow roots), so it gets the same classes */
  const PM = '#presMenu .pm-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 6px 4px}' +
    '#presMenu .pm-roles button{align-items:center;justify-content:center;border:1px solid #D9D4CC;border-radius:7px;padding:6px 4px;font-size:13px;font-weight:700;color:#1B1B19;background:#fff}' +
    '#presMenu .pm-roles button.on{background:#1D4F43;border-color:#1D4F43;color:#fff}#presMenu .pm-roles button.on:hover{background:#17403A}' +
    '#presMenu{width:340px;max-height:calc(100% - 46px);overflow:auto}#presMenu [data-scn]{padding:6px 8px}#presMenu [data-scn] b{font-size:13px}';
  const st = document.createElement('style'); st.textContent = CSS + PM + '#modal .btn.s{min-height:30px;padding:0 10px;font-size:12px}'; document.head.appendChild(st);
  PSY.css.lauris = (PSY.css.lauris || '') + CSS;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
})();
