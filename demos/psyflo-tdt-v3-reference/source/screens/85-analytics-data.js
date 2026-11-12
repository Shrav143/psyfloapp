/* Analytics data (round 11).
   PSY.an5  every authorization metric, DERIVED live from the demo records: PSY.allCases(), PSY.auth.status/units/meta, PSY.diStatus (Denial
            Intelligence resolution status), PSY.audit and PSY.money. Nothing here is a prediction. The Analytics charts read it: decisions
            (approved / partial / denied), decisions by payer, requested vs approved units (units and sessions kept apart), turnaround,
            renewals and expirations. Filters: { loc, payer, service, school, when (date range on the decision date, else the date sent), … }.
   PSY.anr  what stays of the round-9 report builder: the weekly email switch (shared with Settings), the staff e-mail helper, and MENTIONS
            (what the demo record says, with document and date; read by FLO). Round 11 removed the guided report builder, its reports and
            the conversational-analytics teaser: custom data pulls belong to the FLO data agent (42-flow.js). The illustrative 24-month
            decision history (PSY.an) is gone with the chart that showed it. */
/* ============================ PSY.an5: metrics derived from the demo records (live) ============================
   Every figure is read from the shared state at render time: PSY.auth (statuses, units, decisions), PSY.diStatus (Denial Intelligence
   resolution status) and PSY.audit. An appeal overturned in Denial Intelligence therefore changes the rates, the units and the
   appeal outcomes here. LCS (when the admin turns Analytics on for them) see their caseload only (PSY.caseInCaseload). */
(function () {
  const PSY = window.PSY;
  const N = (PSY.an5 = {});
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  N.TODAY = new Date(2026, 9, 29);
  /* "Oct 27", "Oct 29 · 10:42 am", "Dec 9, 2:00 pm", "10/14/2026" → a date; a bare month ("Aug") has no day and gives null */
  N.date = (s) => {
    const t = String(s || ''); let m = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t); if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/.exec(t); return m ? new Date(2026, MON[m[1]], +m[2]) : null;
  };
  N.days = (a, b) => Math.round((b - a) / 864e5);
  const D = (mo, d) => new Date(2026, mo, d);
  /* date ranges of the Analytics filter bar ("Date range": N.dateOf) */
  N.RANGES = {
    q: { label: 'This quarter', text: 'Oct 1 – Dec 31, 2026', from: D(9, 1), to: D(11, 31) },
    30: { label: 'Last 30 days', text: 'Sep 29 – Oct 29, 2026', from: D(8, 29), to: D(9, 29) },
    60: { label: 'Last 60 days', text: 'Aug 30 – Oct 29, 2026', from: D(7, 30), to: D(9, 29) },
    90: { label: 'Last 90 days', text: 'Jul 31 – Oct 29, 2026', from: D(6, 31), to: D(9, 29) },
    sy: { label: 'School year to date', text: 'Aug 1 – Oct 29, 2026', from: D(7, 1), to: D(9, 29) },
  };
  /* k: a preset key ('q', '30', …) or, since round 13, a custom range { from: Date|null, to: Date|null } from the time box */
  N.inRange = (d, k) => { const r = k && typeof k === 'object' ? k : N.RANGES[k]; if (!r || (!r.from && !r.to)) return true; return !!d && (!r.from || d >= r.from) && (!r.to || d <= r.to); };
  const SUBMITTED = ['submitted', 'pending', 'info', 'approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];
  const DECIDED = ['approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];

  /* ---- Denial Intelligence status (PSY.diStatus, shared with the Denial Intelligence tab) ---- */
  N.FINAL = ['overturned', 'partover', 'upheld', 'closed'];
  /* where a Denial Intelligence case stands, with the same meaning as the Denial Intelligence tab: open (under review, peer-to-peer),
     progress (an appeal in progress: DI-1's "Appeal in progress" queue filter), or its final status */
  N.APPEAL = [['open', 'Under review'], ['progress', 'Appeal in progress'], ['overturned', 'Overturned'], ['partover', 'Partially overturned'], ['upheld', 'Upheld'], ['closed', 'Closed']];
  N.APPEAL_FILTER = [['open', 'Under review'], ['progress', 'Appeal in progress'], ['overturned', 'Overturned (fully or partly)'], ['upheld', 'Upheld'], ['closed', 'Closed']];
  /* the cases DI-1's queue shows under a Show filter (PSY.di.records), or null when that model is not loaded */
  N.diSet = (show) => { try { if (PSY.di && typeof PSY.di.records === 'function' && PSY.di.SHOW) return new Set(PSY.di.records({ show, scope: false, loc: 'both' }).map((r) => r.case)); } catch (e) { console.error('an5 di', e); } return null; };
  let AP = null; // the appeal-in-progress set while N.records runs (computed once per call)
  /* a case is a Denial Intelligence record when the payer denied or cut units, or when Denial Intelligence has acted on it */
  N.isDi = (id) => { const t = ((PSY.auth.meta(id) || {}).decision || {}).type; return t === 'denial' || t === 'partial' || t === 'reduction' || !!(PSY.diStatus && PSY.diStatus.rec && PSY.diStatus.rec(id)); };
  N.diOf = (id) => (PSY.diStatus && N.isDi(id) ? PSY.diStatus.get(id) : null);
  N.appealGroup = (id, s) => {
    s = s === undefined ? N.diOf(id) : s; if (!s) return null;
    if (N.FINAL.indexOf(s) >= 0) return s;
    const ap = AP || N.diSet('appeal');
    if (ap) return ap.has(id) ? 'progress' : 'open';
    return ['drafted', 'submitted', 'awaiting'].indexOf(s) >= 0 || ['appeal', 'recon'].indexOf(PSY.auth.status(id)) >= 0 ? 'progress' : 'open';
  };
  N.diLabel = (s) => (PSY.diStatus && s ? PSY.diStatus.label(s) : '');
  N.diTone = (g) => ({ open: 'gray', progress: 'amber', overturned: 'green', partover: 'green', upheld: 'red', closed: 'gray' })[g] || 'gray';

  N.inLoc = (c, loc) => !loc || loc === 'both' || c.loc === loc;
  /* a filter is the locality string, or an object { loc, payer, service, kind, status, school, outcome, sent, when, resp, appeal } (the filter bar) */
  N.fl = (f) => (f && typeof f === 'object' ? f : { loc: f });
  N.pass = (c, f) => {
    f = N.fl(f); const m = PSY.auth.meta(c.id);
    return N.inLoc(c, f.loc) && (!f.payer || c.payer === f.payer) && (!f.service || (m.service || 'tdt') === f.service) && (!f.kind || (m.kind || 'initial') === f.kind) &&
      (!f.status || PSY.auth.status(c.id) === f.status) && (!f.school || c.school === f.school);
  };
  /* authorization records in scope: every case that is an authorization (T.W. only once its ISP is processed), in the viewer's caseload */
  N.cases = (f) => PSY.allCases().filter((c) => (!PSY.auth || PSY.auth.visible(c.id)) && (!PSY.caseInCaseload || PSY.caseInCaseload(c.id)) && N.pass(c, f));
  const auditFor = (id, sts) => (PSY.state.audit || []).filter((e) => e.case === id && sts.indexOf(e.status) >= 0);
  /* when the latest request went to the payer: a status set this session (audit), the recorded submission, or the hub history */
  N.submittedOn = (id) => {
    const a = auditFor(id, ['submitted', 'pending']); if (a.length) return { t: a[a.length - 1].t.split(' · ')[0], src: 'Audit trail' };
    const m = PSY.auth.meta(id); if (m.submitted && m.submitted.date) return { t: m.submitted.date, src: 'Submission record (' + (m.submitted.via || '') + ')' };
    const h = ((PSY.data.hub || {})[id] || {}).history || []; const e = h.find((x) => /\b(request sent|sent by|sent through|faxed)\b/i.test(x.text));
    return e ? { t: e.t.split(' · ')[0], src: 'Case history' } : null;
  };
  /* when the payer decided: the decision on file, else a decision recorded this session (an information request is not a decision) */
  N.decidedOn = (id) => {
    const d = PSY.auth.meta(id).decision; if (d && d.type !== 'info' && d.date) return { t: d.date.split(',')[0], src: 'Decision on file (' + d.via + ')' };
    const a = auditFor(id, ['approved', 'partial', 'denied']); if (a.length && (PSY.state.cases[id] || {}).status5) return { t: a[a.length - 1].t.split(' · ')[0], src: 'Audit trail' };
    return null;
  };
  /* one row per authorization record: its latest request, the payer's first decision (first) and where it stands now (outcome),
     after any Denial Intelligence resolution (Overturned → approved with the units requested; Partially overturned → still a partial award) */
  N.record = (c) => {
    const id = c.id, st = PSY.auth.status(id), m = PSY.auth.meta(id), u = PSY.auth.units(id), d = m.decision || {};
    const line = /^(\d+)\s*→\s*(\d+)/.exec((c.units && c.units.line) || '');
    const svc = m.service || 'tdt';
    const r = { id, ini: c.ini, payer: c.payer, loc: c.loc, school: c.school, kind: m.kind || 'initial', service: svc, unit: (PSY.auth.service(svc).units || 'units'), status: st,
      submitted: SUBMITTED.indexOf(st) >= 0, decided: DECIDED.indexOf(st) >= 0, outcome: null, first: null, requested: null, approved: null };
    if (r.decided) {
      if (st === 'approved') {
        const setNow = (PSY.state.cases[id] || {}).status5 === 'approved';
        r.requested = line ? +line[1] : u.requested;
        r.approved = u.approved != null ? u.approved : setNow ? r.requested : (u.current ? u.current.authorized : r.requested);
        r.outcome = 'approved'; // round 12: classified by the authorization's status, as All Authorizations, Denial Intelligence and FLO show it
      } else if (st === 'partial') { r.requested = u.requested; r.approved = u.approved; r.outcome = 'partial'; }
      else if (st === 'denied') { r.requested = u.requested; r.approved = 0; r.outcome = 'denied'; }
      else { r.requested = u.requested; r.approved = u.approved; r.outcome = d.type === 'denial' ? 'denied' : d.type ? 'partial' : 'approved'; }
    }
    r.first = d.type === 'denial' ? 'denied' : d.type === 'partial' || d.type === 'reduction' ? 'partial' : r.outcome;
    r.di = N.diOf(id); r.appeal = N.appealGroup(id, r.di);
    if (r.di === 'overturned') { r.submitted = r.decided = true; if (r.requested == null) r.requested = u.requested; r.approved = Math.max(r.approved || 0, r.requested || 0); r.outcome = 'approved'; }
    else if (r.di === 'partover') { r.submitted = r.decided = true; if (r.requested == null) r.requested = u.requested; if (r.approved == null) r.approved = u.approved; r.outcome = 'partial'; }
    const s = N.submittedOn(id), dd = r.decided ? N.decidedOn(id) : null;
    r.startOn = u && u.current && u.current.start ? u.current.start : null;
    r.sentOn = s ? s.t : null; r.sentSrc = s ? s.src : null; r.decidedOn = dd ? dd.t : null; r.decidedSrc = dd ? dd.src : null;
    const a = N.date(r.sentOn), b = N.date(r.decidedOn);
    r.days = a && b ? N.days(a, b) : null;
    r.waiting = r.submitted && !r.decided && a ? N.days(a, N.TODAY) : null;
    return r;
  };
  /* the date a record counts on in a date range: the payer's decision, else the day the request went out (none: not in any range) */
  /* round 13: a record with no decision or send date on file (an authorization carried over from before the demo's records) counts
     on the start of its current authorization, so a date range never silently drops it */
  N.dateOf = (r) => N.date(r.decidedOn || r.sentOn) || (r.startOn ? N.date(r.startOn) : null);
  N.records = (f) => {
    f = N.fl(f); let rs;
    AP = N.diSet('appeal'); try { rs = N.cases(f).map(N.record); } finally { AP = null; }
    if (f.outcome) rs = rs.filter((r) => (f.outcome === 'pending' ? !r.decided : r.outcome === f.outcome));
    if (f.sent) rs = rs.filter((r) => N.inRange(N.date(r.sentOn), f.sent));
    if (f.when) rs = rs.filter((r) => N.inRange(N.dateOf(r), f.when));
    if (f.resp) rs = rs.filter((r) => (f.resp === 'none' ? r.days == null : r.days != null && (f.resp === 'fast' ? r.days <= 7 : r.days > 7)));
    if (f.appeal) rs = rs.filter((r) => r.appeal === f.appeal || (f.appeal === 'overturned' && r.appeal === 'partover'));
    return rs;
  };
  const pct = (k, n) => (n ? Math.round((100 * k) / n) : null);
  N.pct = pct;
  /* requested and approved per kind of unit (units vs sessions are never added together) */
  const unitSums = (rs) => { const o = {}; rs.filter((r) => r.decided && r.requested != null && r.approved != null).forEach((r) => { const x = (o[r.unit] = o[r.unit] || { unit: r.unit, req: 0, appr: 0, n: 0 }); x.req += r.requested; x.appr += r.approved; x.n++; }); return Object.values(o).sort((a, b) => b.req - a.req); };
  N.unitSums = unitSums;
  N.stats = (f) => {
    const rs = N.records(f); const dec = rs.filter((r) => r.decided); const c = (o) => dec.filter((r) => r.outcome === o).length;
    const timed = rs.filter((r) => r.days != null);
    const avg = timed.length ? timed.reduce((x, r) => x + r.days, 0) / timed.length : null;
    const di = rs.filter((r) => r.di); const g = (k) => di.filter((r) => r.appeal === k).length;
    return { n: rs.length, submitted: rs.filter((r) => r.submitted).length, decided: dec.length, approved: c('approved'), partial: c('partial'), denied: c('denied'),
      pApproved: pct(c('approved'), dec.length), pPartial: pct(c('partial'), dec.length), pDenied: pct(c('denied'), dec.length),
      timed, avgDays: avg, waiting: rs.filter((r) => r.waiting != null), records: rs, units: unitSums(rs),
      appeals: { n: di.length, open: g('open'), progress: g('progress'), overturned: g('overturned'), partover: g('partover'), upheld: g('upheld'), closed: g('closed') } };
  };
  /* trends by payer or by service: decisions, outcomes, units, turnaround */
  const groupBy = (f, key) => {
    const rs = N.records(f).filter((r) => r.submitted); const out = {};
    rs.forEach((r) => { const k = r[key]; const p = (out[k] = out[k] || { key: k, recs: [], submitted: 0, decided: 0, approved: 0, partial: 0, denied: 0, waiting: 0, timed: [] }); p.recs.push(r); p.submitted++; if (r.decided) { p.decided++; p[r.outcome]++; } else p.waiting++; if (r.days != null) p.timed.push(r.days); });
    return Object.values(out).map((p) => Object.assign(p, { units: unitSums(p.recs), avgDays: p.timed.length ? p.timed.reduce((a, b) => a + b, 0) / p.timed.length : null, pPartial: pct(p.partial, p.decided) }))
      .sort((a, b) => b.submitted - a.submitted || String(a.key).localeCompare(String(b.key)));
  };
  N.byPayer = (f) => groupBy(f, 'payer').map((p) => Object.assign(p, { payer: p.key }));
  N.byService = (f) => groupBy(f, 'service').map((p) => Object.assign(p, { service: p.key }));
  /* authorizations in force, by when they end (renewal and expiration pattern) */
  N.renewals = (f, within) => {
    within = within || 30; const out = [];
    N.cases(f).forEach((c) => { const u = PSY.auth.units(c.id); if (!u.current) return; const e = N.date(u.current.end); if (!e) return; const d = N.days(N.TODAY, e); out.push({ id: c.id, ini: c.ini, payer: c.payer, end: u.current.end, days: d, status: PSY.auth.status(c.id), kind: (PSY.auth.meta(c.id) || {}).kind || 'initial', remaining: u.current.remaining, authorized: u.current.authorized, units: u.service.units, due: d >= 0 && d <= within }); });
    out.sort((a, b) => a.days - b.days);
    const b = { d30: out.filter((x) => x.days >= 0 && x.days <= 30).length, d60: out.filter((x) => x.days > 30 && x.days <= 60).length, later: out.filter((x) => x.days > 60).length, ended: out.filter((x) => x.days < 0).length };
    return { inForce: out.length, all: out, due: out.filter((x) => x.due), within, buckets: b };
  };
  /* the dispute queue (PSY.data.r5.disputes) with this session's changes (Settings → rates preview uses the exposure below) */
  N.disputes = (f) => {
    f = N.fl(f);
    const S = PSY.state.disputes5 || {};
    let out = ((PSY.data.r5 || {}).disputes || []).map((d) => {
      const s = S[d.id] || {}; const c = PSY.caseView(d.case) || {}; const u = PSY.auth.units(d.case);
      const approved = s.approved != null ? s.approved : d.group === 'auth' && u.approved != null && d.issue !== 'info' ? u.approved : d.approved;
      const st = s.status || d.status; const di = N.diOf(d.case);
      return { id: d.id, case: d.case, ini: c.ini, loc: c.loc, group: d.group, issue: d.issue, illustrative: !!d.illustrative, status: st, closed: !!s.closed || (d.group === 'auth' && N.FINAL.indexOf(di) >= 0),
        payer: d.claim ? d.claim.payer : c.payer, service: (PSY.auth.meta(d.case).service) || 'tdt', requested: d.requested, approved: di === 'overturned' ? d.requested : approved,
        disputed: approved == null ? null : Math.max(0, d.requested - (di === 'overturned' ? d.requested : approved)) };
    });
    out = out.filter((x) => N.inLoc(x, f.loc) && (!f.payer || x.payer === f.payer) && (!f.service || x.service === f.service));
    return out;
  };
  /* estimated reimbursement exposure = disputed units × the configured rate (Settings). Never a default rate. */
  N.exposure = (f) => {
    const rows = N.disputes(f).filter((d) => !d.closed && d.disputed != null && d.disputed > 0).map((d) => Object.assign({}, d, { money: PSY.money.exposure(d.disputed, d.payer, d.service) }));
    const auth = rows.filter((r) => r.group === 'auth'), claims = rows.filter((r) => r.group !== 'auth');
    const sum = (rs) => rs.filter((r) => r.money.ok).reduce((x, r) => x + r.money.amount, 0);
    return { rows, auth, claims, units: auth.reduce((x, r) => x + r.disputed, 0), priced: auth.filter((r) => r.money.ok).length, amount: sum(auth), claimAmount: sum(claims), claimPriced: claims.filter((r) => r.money.ok).length,
      pending: N.disputes(f).filter((d) => !d.closed && d.group === 'auth' && d.disputed == null) };
  };
})();

/* ============================ PSY.anr: weekly email + the demo record's documented mentions ============================
   MENTIONS: what the demo record says, each with its document and date. Items without `fictional` quote text already in the demo record
   (intake data, daily notes); items with `fictional: true` are generic mentions added for the demo. No diagnosis or clinical finding beyond
   these. Clinical text shows only with PSY.can('clinicalRecords'); otherwise RESTRICTED. */
(function () {
  const PSY = window.PSY;
  const R = (PSY.anr = {});
  R.RESTRICTED = 'Restricted · clinical access';
  R.schoolOf = (c) => String(c.group || c.school || '').replace(/^TDT\s*[–-]\s*/, '');
  R.countyOf = (c) => (/^Campbell/.test(R.schoolOf(c)) ? 'campbell' : 'lynchburg');
  const twIntake = () => PSY.flowRank() >= 2; // T.W.'s intake is in Lauris once it is processed
  R.MENTIONS = [
    { c: '4492', t: ['substance', 'none'], text: 'None reported by T.W. or his grandmother. No substance use treatment.', doc: 'Intake (CNA)', date: '10/20/2026', when: twIntake },
    { c: '4449', t: ['substance'], text: 'Vaping at school, reported by the school counselor.', doc: 'Admission Screening', date: '08/10/2026', fictional: true },
    { c: '4449', t: ['substance'], text: 'Vaping discussed in session.', doc: 'DPN', date: '10/14/2026', fictional: true },
    { c: '4426', t: ['substance'], text: 'Tried alcohol once, self-reported. No treatment.', doc: 'Intake (CNA)', date: '09/08/2026', fictional: true },
    { c: '4492', t: ['iep'], text: 'IEP: yes. Behaviour plan and check-in/check-out.', doc: 'Intake (CNA)', date: '10/20/2026', when: twIntake },
    { c: '4471', t: ['iep'], text: 'IEP review set for Nov 4 at Harvest’s request.', doc: 'Monthly collateral', date: '10/01/2026' },
    { c: '4466', t: ['iep'], text: 'IEP reviewed March 2026: behaviour plan, preferential seating, check-in/check-out.', doc: 'Intake (CNA)', date: '09/21/2026' },
    { c: '4458', t: ['iep'], text: 'IEP with a behaviour plan.', doc: 'Intake (CNA)', date: '08/18/2026' },
    { c: '4449', t: ['iep'], text: 'IEP: yes, with a behaviour plan.', doc: 'Intake (CNA)', date: '08/10/2026' },
    { c: '4441', t: ['iep'], text: 'IEP gives a behaviour plan and seating.', doc: 'Intake (CNA)', date: '09/01/2026' },
    { c: '4441', t: ['iep'], text: 'Alternative placement raised at the IEP meeting.', doc: 'IEP meeting', date: '10/14/2026' },
    { c: '4437', t: ['iep'], text: 'IEP with check-in/check-out every day, 5 minutes.', doc: 'Intake (CNA)', date: '10/08/2026' },
    { c: '4430', t: ['504'], text: 'Section 504 plan: breaks and a quiet place for tests.', doc: 'Intake (CNA)', date: '08/18/2026' },
    /* interventions (Lauris ISP 2.0 picklist names). The three without `fictional` quote M.R.'s and T.N.'s processed daily notes. */
    { c: '4471', t: ['iv'], iv: 'Clinical 2.1 Movement', text: 'Clinical 2.1 Movement before the reading block to help him settle.', doc: 'DPN', date: '10/27/2026' },
    { c: '4471', t: ['iv'], iv: 'QMHP 1.2 Coping skills practice', text: 'QMHP 1.2 Coping skills practice to help him wait for his turn.', doc: 'DPN', date: '09/15/2026' },
    { c: '4441', t: ['iv'], iv: 'QMHP 1.7 Social skills coaching', text: 'QMHP 1.7 Social skills coaching to practice taking turns.', doc: 'DPN', date: '09/22/2026' },
    { c: '4458', t: ['iv'], iv: 'Clinical 2.1 Movement', text: 'Movement break before math.', doc: 'DPN', date: '10/20/2026', fictional: true },
    { c: '4430', t: ['iv'], iv: 'QMHP 1.2 Coping skills practice', text: 'Coping skills practice before a test.', doc: 'DPN', date: '10/06/2026', fictional: true },
    { c: '4449', t: ['iv'], iv: 'QMHP 1.7 Social skills coaching', text: 'Social skills coaching in a small group.', doc: 'DPN', date: '10/08/2026', fictional: true },
    { c: '4426', t: ['iv'], iv: 'QMHP 1.4 Structured problem solving', text: 'Structured problem solving after a peer conflict.', doc: 'DPN', date: '10/13/2026', fictional: true },
  ];
  /* the mentions on file for a consumer (Lauris id), optionally one tag ('substance', 'iep', '504', 'iv') */
  R.mentions = (cid, tag) => R.MENTIONS.filter((m) => m.c === cid && (!m.when || m.when()) && (!tag || (m.t.indexOf(tag) >= 0 && m.t.indexOf('none') < 0)));
  R.emailOf = (u) => { const n = String((u || PSY.user()).name || '').replace(/,.*$/, '').trim().toLowerCase().split(/\s+/); return (n[0] || '').charAt(0) + (n[n.length - 1] || '') + '@harvestoutreach.org'; };

  /* weekly email (renewal reminders + analytics), Mondays; on unless turned off */
  R.weekly = () => ((PSY.state.prefs || {}).weekly !== false);
  R.setWeekly = (on) => { PSY.state.prefs = PSY.state.prefs || {}; PSY.state.prefs.weekly = !!on; PSY.audit.add({ case: '', action: 'Weekly email (Mondays) turned ' + (on ? 'on' : 'off'), by: PSY.user().name, doc: 'Weekly email', status: '' }); PSY.save(); };
  PSY.acts['an-weekly'] = (el) => {
    const on = !R.weekly(); R.setWeekly(on);
    const r = PSY.activeRoot(); (r ? Array.from(r.querySelectorAll('[data-act="an-weekly"]')) : [el]).forEach((b) => { b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    PSY.ui.toast(on ? 'Weekly email on.' : 'Weekly email off.');
  };
})();
