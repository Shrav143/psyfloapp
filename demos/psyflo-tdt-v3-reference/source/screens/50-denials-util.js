/* Denial Intelligence model (PSY.di): one source of truth for the Denial Intelligence tab (50-denials: one table of denials),
   the case workspace (51, di-case), the authorization rows of Authorizations (80-auth-list) and Analytics (denial patterns, round 11).
   Round 11: queue(f) is the list's filter set (authorization records and claims together: status, decision type, payer, service,
   assigned clinician, deadline, decision date, next step, search; round 13: the decision date is also a range, f.from / f.to) with TYPES · DEADLINES · NEXT_STEPS · STATUS_OPTS() · nextGroup(r);
   open() counts claims too (the sidebar badge = the open rows of the list). records(f), metrics(f) and patterns(f) are unchanged.
   Round 9: one DI record per denied, partially approved or info-requested authorization case (PSY.di.records(filters)), with its
   resolution status in PSY.diStatus (05-sync.js; starting statuses in PSY.diStatus.seed). PSY.diStatus.propagate is replaced here with
   unit-aware logic: Overturned → Approved with the requested units; Partially Overturned → Partially approved with the units the payer
   gave ({approved:n}). The workspace actions below (choose, genDoc, p2pOutcome, resolve, sendReply, reopen) move the resolution status
   with them, so the queue, Authorizations, Analytics and the extension's case status never disagree.
   API for other owners: records(f) · byCase(caseId) · metrics(f) · patterns(f) · claims(f) · statusBadge(status) · SHOW (queue filters).
   Disputes come from PSY.data.r5.disputes; what staff do lives in PSY.state.disputes5[id]. Authorization statuses change only
   through PSY.auth.set, and every action writes the audit (so the case timeline follows). Nothing here predicts an outcome,
   invents a payer rule, a deadline or a rate: deadlines carry their source, unknown payer processes read "Payer requirement
   verification needed", and exposure uses only a rate configured in Settings. Loaded before 51-*, 79-*, 80-*, 86-*, 87-*, 88-*. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const A = PSY.auth;
  const R5 = () => PSY.data.r5;
  const ME = (PSY.r5 && PSY.r5.ME) || 'J. Perez, LPC';
  const SYS = (PSY.r5 && PSY.r5.SYS) || 'Psyflo (system)';
  const VERIFY = () => (PSY.rules && PSY.rules.VERIFY) || 'Payer requirement verification needed';

  /* ---------------- demo clock and dates ---------------- */
  const TODAY = Date.UTC(2026, 9, 29); // Thu Oct 29, 2026
  const DAY = 86400000;
  const MON_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON = {}; MON_NAME.forEach((m, i) => { MON[m] = i; });
  const SHORT = { sentara: 'Sentara', anthem: 'Anthem', aetna: 'Aetna', humana: 'Humana', uhc: 'UHC', ffs: 'FFS' };
  /* "Dec 9, 2:00 pm" → ms (the demo spans Jul 2026 – Jun 2027) */
  function parseDate(s) {
    const m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s*(\d{1,2}):(\d\d)\s*([ap]m))?/.exec(String(s || ''));
    if (!m) return null;
    const mo = MON[m[1]]; const yr = mo >= 6 ? 2026 : 2027;
    let h = 23, mi = 59; if (m[3]) { h = (+m[3] % 12) + (m[5] === 'pm' ? 12 : 0); mi = +m[4]; }
    return Date.UTC(yr, mo, +m[2], h, mi);
  }
  const dayOf = (ms) => Math.floor(ms / DAY);
  const dayDiff = (ms) => dayOf(ms) - dayOf(TODAY);
  const dateLabel = (ms) => { const d = new Date(ms); return MON_NAME[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const addDays = (s, n) => { const ms = parseDate(s); return ms == null ? null : dateLabel(Date.UTC(new Date(ms).getUTCFullYear(), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate()) + n * DAY); };
  const inDays = (ms) => { const n = dayDiff(ms); return n < 0 ? Math.abs(n) + (n === -1 ? ' day ago' : ' days ago') : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; };

  /* ---------------- issue types and resolution statuses (distinct per group, Part 9.1) ---------------- */
  const ISSUE = {
    partial: { label: 'Partial approval', group: 'auth' },
    reduction: { label: 'Reduction in requested units', group: 'auth' },
    denial: { label: 'Authorization denial', group: 'auth' },
    'cs-denial': { label: 'Concurrent SRA denial', group: 'auth' },
    info: { label: 'Additional information request', group: 'auth' },
    p2p: { label: 'Peer-to-peer', group: 'auth' },
    recon: { label: 'Reconsideration', group: 'auth' },
    appeal: { label: 'Formal appeal', group: 'auth' },
    'claim-denial': { label: 'Claim denial', group: 'claim' },
    'claim-rejection': { label: 'Claim rejection', group: 'claim' },
    corrected: { label: 'Corrected claim', group: 'claim' },
    'claim-recon': { label: 'Claim reconsideration', group: 'claim' },
    'claim-appeal': { label: 'Claim appeal', group: 'claim' },
  };
  const ST = {
    auth: {
      decide: { label: 'Decision needed', tone: 'amber', i: '◔' },
      drafted: { label: 'Response drafted', tone: 'blue', i: '✎' },
      'p2p-prep': { label: 'Peer-to-peer being arranged', tone: 'amber', i: '◔' },
      p2p: { label: 'Peer-to-peer scheduled', tone: 'blue', i: '☏' },
      'recon-prep': { label: 'Reconsideration being prepared', tone: 'amber', i: '✎' },
      recon: { label: 'Reconsideration pending', tone: 'amber', i: '↻' },
      'evidence-prep': { label: 'Additional documentation being prepared', tone: 'amber', i: '✎' },
      'info-req': { label: 'Payer asked for more information', tone: 'red', i: '?' },
      'appeal-prep': { label: 'Appeal being prepared', tone: 'amber', i: '⚑' },
      appeal: { label: 'Appeal submitted', tone: 'amber', i: '⚑' },
      alt: { label: 'Alternative authorization under review', tone: 'amber', i: '⇄' },
      upheld: { label: 'Decision upheld · next step needed', tone: 'red', i: '!' },
      sent: { label: 'Resolved · reply sent', tone: 'green', i: '✓' },
      accepted: { label: 'Closed · decision accepted', tone: 'gray', i: '■' },
      resolved: { label: 'Resolved', tone: 'green', i: '✓' },
      closed: { label: 'Closed', tone: 'gray', i: '■' },
    },
    claim: {
      new: { label: 'New', tone: 'amber', i: '●' },
      'corrected-prep': { label: 'Corrected claim being prepared', tone: 'amber', i: '✎' },
      corrected: { label: 'Corrected claim submitted', tone: 'blue', i: '↗' },
      'claim-recon': { label: 'Claim reconsideration requested', tone: 'amber', i: '↻' },
      'claim-appeal': { label: 'Claim appeal submitted', tone: 'amber', i: '⚑' },
      paid: { label: 'Paid', tone: 'green', i: '✓' },
      denied: { label: 'Denied', tone: 'red', i: '✕' },
      closed: { label: 'Closed', tone: 'gray', i: '■' },
    },
  };
  const stDef = (group, k) => (ST[group] || ST.auth)[k] || { label: k || '—', tone: 'gray', i: '•' };
  const stBadge = (group, k, extra) => { const s = stDef(group, k); return '<span class="st5 t-' + s.tone + '"><i aria-hidden="true">' + s.i + '</i>' + esc(extra || s.label) + '</span>'; };

  /* resolution outcomes (Section G) */
  const OUTCOMES = {
    auth: [['approved', 'Approved'], ['partial', 'Partially approved'], ['denied', 'Denied'], ['recon', 'Reconsideration pending'], ['appeal', 'Appeal submitted'], ['upheld', 'Appeal upheld'], ['overturned', 'Appeal overturned'], ['closed', 'Closed']],
    claim: [['corrected', 'Corrected claim submitted'], ['paid', 'Paid'], ['denied', 'Denied'], ['closed', 'Closed']],
  };
  /* peer-to-peer outcomes (Part 11.4) */
  const P2P_OUT = [['more', 'Additional units approved'], ['upheld', 'Original decision upheld'], ['info', 'Additional information requested'], ['recon', 'Reconsideration required'], ['appeal', 'Appeal pathway available']];

  /* ---------------- state ---------------- */
  const S = (id) => ((PSY.state.disputes5 || {})[id]) || {};
  const W = (id) => { PSY.state.disputes5 = PSY.state.disputes5 || {}; return (PSY.state.disputes5[id] = PSY.state.disputes5[id] || {}); };
  /* the pathway already in motion in the original scenarios */
  const SEED_OPT = { 'DI-388': 'p2p', 'DI-408': 'reply' };
  /* documents that already exist in the scenarios (drafted before today) */
  const SEED_DOC = { 'DI-408|info': { at: 'Oct 28, 5:41 pm' }, 'DI-384|appeal': { at: 'Oct 26' } };
  /* the peer-to-peer T.N. already has (call log Oct 27) */
  const SEED_P2P = { 'DI-388': { date: 'Dec 9', time: '2:00 pm', phone: '', ref: '', src: 'Slot offered by Sentara on Oct 27 (call log)', seed: true } };

  /* ---------------- dispute list ---------------- */
  const seeds = () => (R5().disputes || []);
  /* a case that reaches an adverse state without a dispute record still gets one (e.g. a concurrent SRA that comes back partial);
     once it has a Denial Intelligence status it keeps its record after it is resolved (an overturned case stays in the queue as Resolved) */
  function synthetic() {
    const have = {}; seeds().forEach((d) => { if (d.group === 'auth') have[d.case] = 1; });
    const out = []; const kept = PSY.state.diStatus || {};
    PSY.allCases().forEach((c) => {
      if (have[c.id] || !A.visible(c.id)) return;
      const st = A.status(c.id); const m = A.meta(c.id); const u = A.units(c.id);
      const iss = { partial: 'partial', denied: m.kind === 'continued' ? 'cs-denial' : 'denial', info: 'info', recon: 'recon', appeal: 'appeal' }[st] || (kept[c.id] && kept[c.id].issue);
      if (!iss) return;
      out.push({ id: 'DI-' + (+c.id.slice(2)), group: 'auth', case: c.id, issue: iss, requested: u.requested, approved: u.approved, status: 'decide', assigned: ME, opened: 'Oct 29', synthetic: true });
    });
    return out;
  }
  const allDefs = () => seeds().concat(synthetic());

  function view(d) {
    const s = S(d.id); const c = PSY.caseView(d.case) || {}; const m = A.meta(d.case) || {}; const u = A.units(d.case);
    const isClaim = d.group === 'claim';
    const payerId = isClaim && d.claim && d.claim.payer ? d.claim.payer : c.payer;
    const payer = PSY.data.payers[payerId] || {};
    const status = s.status || d.status;
    const option = s.option !== undefined ? s.option : (SEED_OPT[d.id] || null);
    const requested = isClaim ? d.requested : (u.requested != null ? u.requested : d.requested);
    let approved = isClaim ? (s.paid != null ? s.paid : d.approved) : (u.approved != null ? u.approved : d.approved);
    const decided = approved != null;
    const gap = decided && requested != null ? Math.max(0, requested - approved) : null;
    const atRisk = gap != null ? gap : requested; // an undecided request has every unit at stake
    const svcKey = m.service || 'tdt';
    const r = {
      id: d.id, d, group: d.group, case: d.case, c, m, u, isClaim, synthetic: !!d.synthetic, illustrative: !!d.illustrative,
      ini: c.ini, who: c.who, school: c.school || '', loc: c.loc, laurisId: m.laurisId,
      payer: payerId, payerShort: SHORT[payerId] || payer.short || payerId, payerName: payer.name || payerId,
      channel: (PSY.rules && PSY.rules.channel ? PSY.rules.channel(payerId) : { label: payer.channel || '' }),
      service: u.service ? u.service.short : 'TDT', serviceLabel: u.service ? u.service.label : 'TDT', serviceKey: svcKey, code: (u.service && u.service.code) || c.code || '',
      issue: d.issue, issueLabel: (ISSUE[d.issue] || {}).label || d.issue,
      requested, approved, decided, gap, atRisk,
      status, statusDef: stDef(d.group, status), option,
      closed: s.closed != null ? !!s.closed : false,
      assigned: s.assigned || d.assigned || ME, opened: d.opened,
      decision: m.decision || {}, claim: d.claim || null, s,
    };
    r.reasons = reasonsOf(r);
    r.deadlines = deadlinesOf(r);
    r.deadline = r.deadlines.find((x) => x.ms != null) || r.deadlines[0] || null;
    r.exposure = PSY.money ? PSY.money.exposure(r.atRisk, payerId, svcKey) : { ok: false, short: 'Rate not configured' };
    r.next = nextAction(r);
    enrich(r);
    return r;
  }
  const list = () => allDefs().map(view);
  const get = (id) => { const d = allDefs().find((x) => x.id === id); return d ? view(d) : null; };
  /* the authorization dispute of a case (claims only if the case has no authorization dispute) */
  const byCase = (cid) => { const ds = allDefs().filter((x) => x.case === cid); const d = ds.find((x) => x.group === 'auth') || ds[0]; return d ? view(d) : null; };
  const closedForCase = (cid) => { const d = allDefs().find((x) => x.case === cid && x.group === 'auth'); return !!(d && S(d.id).closed); };

  /* the payer's stated reasons, exactly as recorded */
  function reasonsOf(r) {
    if (r.isClaim) return r.claim ? [r.claim.code + ': ' + r.claim.reason] : [];
    const said = (r.decision && r.decision.said) || '';
    return said.split(' · ').map((x) => x.trim().replace(/^[“"]|[”"]$/g, '')).filter(Boolean);
  }

  /* ---------------- deadlines, each with its source ---------------- */
  function appealBy(r) {
    const dec = r.decision || {}; if (!dec.date || !['partial', 'denial', 'cs-denial'].includes(r.issue)) return null;
    if (r.issue === 'denial' && dec.due) return { label: dec.due, sub: 'appeal deadline', src: dec.dueSrc, ms: parseDate(dec.due), kind: 'appeal' };
    const lab = addDays(dec.date, 60);
    return { label: lab, sub: 'appeal deadline', src: '60 calendar days from the decision dated ' + dec.date + ' (42 CFR 438.402(c)(2)(ii)). Confirm against the date printed on the notice.', ms: parseDate(lab), kind: 'appeal' };
  }
  function deadlinesOf(r) {
    if (r.closed) return [];
    if (r.isClaim) return [{ label: 'Not verified', sub: 'claim deadline', src: VERIFY() + '. Claim filing, reconsideration and appeal limits are set by each payer; none is on file.', ms: null, verify: true }];
    const out = []; const dec = r.decision || {}; const p = p2pOf(r);
    if (r.issue === 'partial' && dec.due) {
      if (!(p && p.outcome)) {
        const custom = p && !p.seed && p.date;
        out.push(custom ? { label: p.date + (p.time ? ', ' + p.time : ''), sub: 'peer-to-peer call', src: p.src || ('Call details recorded by ' + ME), ms: parseDate(p.date + (p.time ? ', ' + p.time : '')), kind: 'p2p' }
          : { label: dec.due, sub: 'peer-to-peer slot', src: dec.dueSrc, ms: parseDate(dec.due), kind: 'p2p' });
      }
    } else if (dec.due && r.issue !== 'denial' && !(r.issue === 'reduction' && r.option === 'p2p' && p && p.date)) { // a booked call is the reply to the offer
      out.push({ label: dec.due, sub: r.issue === 'info' ? 'reply due' : 'reply due', src: dec.dueSrc, ms: parseDate(dec.due), kind: 'reply' });
    }
    if (r.option === 'p2p' && r.issue !== 'partial' && p && p.date && !p.outcome) out.push({ label: p.date + (p.time ? ', ' + p.time : ''), sub: 'peer-to-peer call', src: p.src || ('Call details recorded by ' + ME), ms: parseDate(p.date + (p.time ? ', ' + p.time : '')), kind: 'p2p' });
    const ap = appealBy(r); if (ap) out.push(ap);
    if (!out.length) out.push({ label: 'Not verified', sub: 'deadline', src: VERIFY(), ms: null, verify: true });
    return out.sort((a, b) => (a.ms == null ? 9e15 : a.ms) - (b.ms == null ? 9e15 : b.ms));
  }
  const p2pOf = (r) => { const s = S(r.id).p2p; const seed = SEED_P2P[r.id]; if (s) return Object.assign({}, seed || {}, s, { seed: !!(seed && !s.edited) }); return seed ? Object.assign({}, seed) : null; };

  /* ---------------- resolution options (Section D and the extension) ---------------- */
  const BY_ISSUE = {
    partial: ['accept', 'recon', 'p2p', 'evidence', 'appeal'],
    reduction: ['accept', 'evidence', 'p2p', 'alt'],
    info: ['reply'],
    denial: ['appeal', 'recon', 'p2p', 'alt', 'accept'],
    'cs-denial': ['appeal', 'p2p', 'recon', 'accept'],
    recon: ['recon', 'appeal', 'accept'],
    appeal: ['appeal', 'accept'],
    'claim-denial': ['claim-recon', 'claim-appeal', 'claim-close'],
    'claim-rejection': ['corrected', 'claim-close'],
  };
  const rule = (id) => (PSY.rules && PSY.rules.byId ? PSY.rules.byId(id) : null);
  const NO_DEADLINE = (r) => ({ label: 'None on file', src: 'No deadline for this choice is stated in ' + r.payerShort + '’s correspondence.', none: true });
  const VER_DEADLINE = () => ({ label: VERIFY(), src: 'Not stated in the payer’s correspondence or Harvest’s documents.', verify: true });
  function optDefs(r) {
    const pc = (PSY.pt && PSY.pt.CASES && PSY.pt.CASES[r.case]) || null; // the four doors (86-partials)
    const p = p2pOf(r); const dec = r.decision || {};
    const p2pDeadline = r.issue === 'partial' && dec.due ? (p && !p.seed && p.date ? { label: p.date + (p.time ? ', ' + p.time : ''), src: p.src || ('Recorded by ' + ME) } : { label: dec.due, src: dec.dueSrc }) : (p && p.date ? { label: p.date + (p.time ? ', ' + p.time : ''), src: p.src || ('Recorded by ' + ME) } : VER_DEADLINE());
    const replyDeadline = dec.due && r.issue !== 'denial' ? { label: dec.due, src: dec.dueSrc } : NO_DEADLINE(r);
    const ap = appealBy(r);
    const units = r.approved != null ? r.approved : 0;
    return {
      accept: {
        key: 'accept', simple: true, status: 'accepted',
        label: r.issue === 'reduction' ? 'Accept ' + units + ' units' : r.issue === 'denial' || r.issue === 'cs-denial' ? 'Accept the denial' : 'Accept the partial approval',
        deadline: r.issue === 'reduction' ? replyDeadline : NO_DEADLINE(r), rules: [], next: 'Nothing to send',
      },
      recon: {
        key: 'recon', status: 'recon-prep', doc: 'recon', label: 'Request additional review (reconsideration)',
        deadline: VER_DEADLINE(), rules: ['recon-process'], next: 'Prepare the reconsideration request',
      },
      p2p: {
        key: 'p2p', status: p && p.date ? 'p2p' : 'p2p-prep', doc: 'p2p', label: r.issue === 'reduction' && pc ? pc.doors[3].name : 'Prepare a peer-to-peer',
        deadline: p2pDeadline, rules: ['p2p-process'].concat(r.payer === 'sentara' ? ['p2p-wait'] : []), next: 'Prepare the peer-to-peer script',
      },
      evidence: {
        key: 'evidence', status: 'evidence-prep', doc: 'info', label: r.issue === 'reduction' && pc ? pc.doors[2].name : 'Submit additional clinical evidence',
        deadline: VER_DEADLINE(), rules: ['recon-process'], lauris: pc && pc.infoAction ? 'lauris-dmas?case=' + r.case + '&action=' + pc.infoAction : null, next: 'Prepare the additional-information response',
      },
      appeal: {
        key: 'appeal', status: 'appeal-prep', doc: 'appeal', label: r.issue === 'denial' ? 'Guardian-led appeal' : 'Start a formal appeal',
        deadline: ap ? { label: ap.label, src: ap.src } : VER_DEADLINE(), rules: ['appeal-60', 'guardian-appeal'], next: 'Prepare the appeal letter',
      },
      alt: {
        key: 'alt', status: 'alt', label: 'Investigate alternative authorization options',
        deadline: NO_DEADLINE(r), rules: r.issue === 'denial' ? ['turnaround'] : ['cna-31'], next: 'Clinician reviews the alternative plan',
      },
      reply: {
        key: 'reply', status: 'drafted', doc: 'info', label: 'Send the drafted reply',
        deadline: replyDeadline, rules: ['info-24h'], next: 'Clinician reviews the reply',
      },
      'claim-recon': {
        key: 'claim-recon', status: 'claim-recon', doc: 'claimrecon', label: 'Request claim reconsideration',
        deadline: VER_DEADLINE(), rules: ['sa-required'], next: 'Prepare the claim reconsideration request',
      },
      'claim-appeal': {
        key: 'claim-appeal', status: 'claim-appeal', doc: 'claimrecon', label: 'File a claim appeal',
        deadline: VER_DEADLINE(), rules: [], next: 'Prepare the claim appeal',
      },
      corrected: {
        key: 'corrected', status: 'corrected-prep', doc: 'corrected', label: 'Submit a corrected claim',
        deadline: VER_DEADLINE(), rules: [], next: 'Prepare the corrected claim',
      },
      'claim-close': {
        key: 'claim-close', simple: true, status: 'closed', label: 'Close without payment',
        deadline: NO_DEADLINE(r), rules: [], next: 'Nothing to send',
      },
    };
  }
  function options(r) {
    const defs = optDefs(r); const keys = BY_ISSUE[r.issue] || ['accept'];
    const pc = (PSY.pt && PSY.pt.CASES && PSY.pt.CASES[r.case]) || null;
    return keys.map((k) => Object.assign({}, defs[k], { rules: (defs[k].rules || []).map(rule).filter(Boolean), obs: pc && pc.history && k === 'evidence' && r.case === 'R-0402' ? pc.history : null }));
  }

  /* ---------------- next action (derived, so it is always consistent) ---------------- */
  function docState(id, key) {
    const s = (S(id).docs || {})[key] || {}; const seed = SEED_DOC[id + '|' + key];
    return Object.assign({ gen: !!seed, at: seed ? seed.at : '', by: seed ? SYS : '' }, s);
  }
  function nextAction(r) {
    if (r.closed) return { label: 'Closed · nothing to do', short: 'View', sec: 'g', none: true };
    const o = r.option; const ds = (k) => docState(r.id, k);
    const docStep = (k, verb) => { const x = ds(k); if (!x.gen) return { label: 'Generate the ' + DOC_NAME(r, k).toLowerCase(), short: 'Generate draft', sec: 'e' }; if (!x.reviewed) return { label: 'Review the ' + DOC_NAME(r, k).toLowerCase(), short: 'Review draft', sec: 'e' }; return { label: verb, short: 'Record result', sec: 'g' }; };
    if (r.isClaim) {
      if (!o) return { label: 'Choose how to work this claim', short: 'Choose option', sec: 'd' };
      if (o === 'claim-recon' || o === 'claim-appeal') return docStep('claimrecon', 'Send it and record the payer’s answer');
      if (o === 'corrected') return docStep('corrected', 'Record the corrected claim submission');
      return { label: 'Record the result', short: 'Record result', sec: 'g' };
    }
    if (r.status === 'upheld') return { label: 'Choose the next step: accept or appeal', short: 'Choose next step', sec: 'd' };
    if (!o && r.issue === 'reduction') return { label: 'Decide on ' + r.payerShort + '’s offer', short: 'Decide on offer', sec: 'd' };
    if (!o && r.issue === 'partial') return { label: 'Decide on the partial approval', short: 'Decide', sec: 'd' };
    if (!o) return { label: 'Choose a pathway', short: 'Choose pathway', sec: 'd' };
    if (o === 'reply') { const x = ds('info'); return x.reviewed ? { label: 'Send the reply via ' + (r.channel.method || 'the portal'), short: 'Send reply', sec: 'd' } : { label: 'Review the drafted reply', short: 'Review reply', sec: 'e' }; }
    if (o === 'p2p') {
      const p = p2pOf(r) || {};
      if (!ds('p2p').gen) return { label: 'Generate the peer-to-peer script', short: 'Generate script', sec: 'e' };
      if (!ds('p2p').reviewed) return { label: 'Review the peer-to-peer script', short: 'Review script', sec: 'e' };
      if (!p.date) return { label: 'Record the call details', short: 'Schedule call', sec: 'p2p' };
      return { label: 'Hold the call (' + p.date + (p.time ? ', ' + p.time : '') + ') and record the outcome', short: 'Record outcome', sec: 'p2p' };
    }
    if (o === 'recon') return docStep('recon', 'Send the request and record it as Reconsideration pending');
    if (o === 'evidence') return docStep('info', 'Send it and record the payer’s answer');
    if (o === 'appeal') return docStep('appeal', r.issue === 'denial' ? 'Record the appeal when the guardian files it' : 'Record the appeal when it is filed');
    if (o === 'alt') return { label: 'Review the alternative plan, then record the result', short: 'Record result', sec: 'g' };
    return { label: 'Record the result', short: 'Record result', sec: 'g' };
  }

  /* ---------------- audit + timeline ---------------- */
  function event(r, action, o) {
    o = o || {};
    const ev = { case: r.case, action, by: o.by || ME, doc: r.id + (o.doc ? ' · ' + o.doc : ''), status: r.isClaim ? '' : A.status(r.case), silent: true };
    PSY.audit.add(ev);
    if (o.log !== false) { PSY.state.log = PSY.state.log || []; PSY.state.log.unshift({ t: PSY.now(), case: r.case, text: action }); }
  }
  /* claims and other dispute-only events (the authorization timeline covers the rest) */
  const disputeEvents = (r) => (PSY.state.audit || []).filter((e) => e.doc && (e.doc === r.id || e.doc.indexOf(r.id + ' ·') === 0)).slice().reverse();

  /* ---------------- actions ---------------- */
  const legacyAccept = (r) => ({ stageLabel: (r.issue === 'denial' ? 'Denied · accepted' : 'Partially approved · accepted'), stageTone: 'n', needsClinician: false,
    units: { req: r.requested, line: r.requested + ' → ' + (r.approved || 0) + ' awarded', sub: 'accepted Oct 29' }, clock: { text: '—', tone: 'n' },
    next: (r.issue === 'denial' ? 'Denial accepted Oct 29.' : 'Accepted ' + (r.approved || 0) + ' of ' + r.requested + ' units on Oct 29.'),
    cta: { label: 'View', go: 'di-case', params: { id: r.id }, primary: false } });
  function choose(id, key) {
    const r = get(id); if (!r) return;
    const o = optDefs(r)[key]; if (!o) return;
    const w = W(id);
    if (key === 'accept') {
      w.option = 'accept'; w.status = 'accepted'; w.closed = true; w.outcome = { k: 'accepted', label: o.label, units: r.approved || 0, date: 'Oct 29', by: ME, at: PSY.now() };
      A.set(r.case, A.status(r.case), { action: o.label + ': ' + (r.approved || 0) + ' of ' + r.requested + ' units. Dispute ' + r.id + ' closed.', doc: r.id, patch: Object.assign({ approved5: r.approved || 0 }, legacyAccept(r)) });
      note(r, o.label + ' (' + (r.approved || 0) + ' of ' + r.requested + ' units).');
      mark(r, 'closed', o.label);
      PSY.save(); return;
    }
    if (key === 'claim-close') { w.option = key; w.status = 'closed'; w.closed = true; w.outcome = { k: 'closed', label: 'Closed without payment', date: 'Oct 29', by: ME, at: PSY.now() }; event(r, 'Claim issue closed without payment', { doc: 'Resolution' }); PSY.save(); return; }
    const was = r.option;
    w.option = key; w.status = typeof o.status === 'function' ? o.status(r) : o.status; w.closed = false;
    event(r, (was && was !== key ? 'Resolution pathway changed to: ' : 'Resolution pathway selected: ') + o.label + '. Next: ' + o.next + '.', { doc: 'Resolution options' });
    if (!r.isClaim && ['new', 'closed'].includes(diGet(r.case))) mark(r, key === 'evidence' ? 'docs' : 'review', o.label);
    PSY.save();
  }
  /* a pathway picked from outside the workspace (older extension buttons) is recorded once */
  function pick(id, key, where) {
    const r = get(id); if (!r) return;
    if (r.option === key) { PSY.save(); return; }
    choose(id, key);
  }
  function note(r, text) { PSY.state.log = PSY.state.log || []; PSY.state.log.unshift({ t: PSY.now(), case: r.case, text }); }
  function reopen(id) {
    const r = get(id); if (!r) return; const w = W(id);
    const keep = { docs: w.docs, p2p: w.p2p ? Object.assign({}, w.p2p, { outcome: null, units: null }) : undefined };
    PSY.state.disputes5[id] = Object.assign({}, keep, { option: SEED_OPT[id] || null, status: r.d.status, closed: false });
    if (!r.isClaim) { delete PSY.state.cases[r.case]; if (PSY.state.diStatus) delete PSY.state.diStatus[r.case]; } // back to the payer's decision as recorded
    event(r, 'Dispute ' + id + ' reopened. Back to the resolution options.', { doc: 'Resolution' });
    PSY.save();
  }

  /* documents */
  const DOC_TITLES = { p2p: 'Peer-to-peer script', info: 'Additional-information response', recon: 'Reconsideration request', appeal: 'Appeal draft', packet: 'Supporting evidence packet', claimrecon: 'Claim reconsideration request', corrected: 'Corrected claim checklist' };
  const DOC_NAME = (r, k) => (k === 'appeal' && r.issue === 'denial' ? 'Appeal letter for the guardian' : k === 'info' && r.issue === 'info' ? 'Reply to ' + r.payerShort + '’s request' : DOC_TITLES[k] || k);
  function docsFor(r) {
    if (r.isClaim) return r.issue === 'claim-rejection' ? ['corrected', 'packet'] : ['claimrecon', 'packet'];
    if (r.issue === 'info') return ['info', 'packet'];
    if (r.issue === 'reduction') return ['p2p', 'info', 'recon', 'packet'];
    return ['p2p', 'info', 'recon', 'appeal', 'packet'];
  }
  const builders = {}; // key → (r) → text; registered by 51-denial-detail.js
  function docText(r, k) { const x = docState(r.id, k); if (x.text != null) return x.text; const b = builders[k]; return b ? clean(b(r)) : ''; }
  function genDoc(id, k) { const r = get(id); if (!r) return; const w = W(id); w.docs = w.docs || {}; w.docs[k] = Object.assign({}, w.docs[k] || {}, { gen: true, text: clean((builders[k] || (() => ''))(r)), at: PSY.now(), by: SYS, reviewed: false, prepared: false }); event(r, 'Draft generated: ' + DOC_NAME(r, k) + ' (AI Draft, from the Lauris record)', { doc: DOC_NAME(r, k), by: SYS }); if (!r.isClaim && (k === 'appeal' || k === 'recon') && ['new', 'review', 'docs'].includes(diGet(r.case))) mark(r, 'drafted', DOC_NAME(r, k)); PSY.save(); }
  function editDoc(id, k, text) { const w = W(id); w.docs = w.docs || {}; const cur = docState(id, k); w.docs[k] = Object.assign({}, cur, { gen: true, text, edited: true }); PSY.save(); }
  function editLogged(id, k) { const r = get(id); const w = W(id); const x = (w.docs || {})[k]; if (!r || !x || x.editLogged) { PSY.save(); return; } x.editLogged = true; event(r, 'Clinician edited draft: ' + DOC_NAME(r, k), { doc: DOC_NAME(r, k), log: false }); PSY.save(); }
  function reviewDoc(id, k) { const r = get(id); if (!r) return; const w = W(id); w.docs = w.docs || {}; const cur = docState(id, k); if (cur.text == null) cur.text = docText(r, k); w.docs[k] = Object.assign({}, cur, { gen: true, reviewed: true, reviewedBy: ME, reviewedAt: PSY.now() }); event(r, 'Clinician reviewed: ' + DOC_NAME(r, k), { doc: DOC_NAME(r, k) }); PSY.save(); }
  function prepDoc(id, k) {
    const r = get(id); if (!r) return; const w = W(id); w.docs = w.docs || {}; const cur = docState(id, k); if (cur.text == null) cur.text = docText(r, k);
    w.docs[k] = Object.assign({}, cur, { prepared: true, preparedAt: PSY.now() });
    const how = k === 'p2p' ? 'ready for the call' : k === 'packet' ? 'assembled for submission' : k === 'appeal' && r.issue === 'denial' ? 'ready for the guardian to read and sign' : 'ready to send through ' + (r.channel.label || 'the payer channel') + ' (simulated)';
    event(r, 'Prepared: ' + DOC_NAME(r, k) + ', ' + how, { doc: DOC_NAME(r, k) });
    PSY.save();
  }

  /* peer-to-peer workflow (Part 11) */
  function p2pSave(id, f) {
    const r = get(id); if (!r) return; const w = W(id); const seed = SEED_P2P[id];
    const same = seed && f.date === seed.date && f.time === seed.time;
    w.p2p = Object.assign({}, p2pOf(r) || {}, w.p2p || {}, f, { by: ME, at: PSY.now(), edited: !same, src: same ? seed.src : 'Call details recorded by ' + ME + ' (Oct 29)' });
    if (!w.option && !SEED_OPT[id]) w.option = 'p2p';
    if ((w.option || SEED_OPT[id]) === 'p2p') { w.status = 'p2p'; w.closed = false; }
    event(r, 'Peer-to-peer call details recorded: ' + f.date + (f.time ? ', ' + f.time : '') + (f.phone ? ' · ' + f.phone : '') + (f.ref ? ' · ref ' + f.ref : ''), { doc: 'Peer-to-peer' });
    if (!r.isClaim && diGet(r.case) === 'new') mark(r, 'review', 'Peer-to-peer call details');
    PSY.save();
  }
  function p2pOutcome(id, k, units) {
    const r = get(id); if (!r) return { err: 'No such case.' }; const w = W(id);
    const p = Object.assign({}, p2pOf(r) || {}, w.p2p || {});
    const lab = (P2P_OUT.find((x) => x[0] === k) || [k, k])[1];
    if (k === 'more') {
      const n = Math.round(+units);
      if (!(units !== '' && units != null && isFinite(n)) || n <= (r.approved || 0) || n > r.requested) return { err: 'Enter the total units approved after the call: more than ' + (r.approved || 0) + ', at most ' + r.requested + '.' };
      p.outcome = k; p.units = n; p.outcomeAt = PSY.now(); w.p2p = p;
      w.status = 'resolved'; w.closed = true; w.outcome = { k: n >= r.requested ? 'approved' : 'partial', label: 'Peer-to-peer: additional units approved', units: n, date: 'Oct 29', by: ME, at: PSY.now() };
      const st = n >= r.requested ? 'approved' : 'partial';
      A.set(r.case, st, { action: 'Peer-to-peer outcome recorded: additional units approved (' + n + ' of ' + r.requested + '). Dispute ' + id + ' resolved.', doc: id + ' · Peer-to-peer', patch: Object.assign({ approved5: n }, legacyUnits(r, n, st)) });
      note(r, 'Peer-to-peer outcome: ' + n + ' of ' + r.requested + ' units approved.');
      mark(r, n >= r.requested ? 'overturned' : 'partover', 'Peer-to-peer: ' + n + ' of ' + r.requested + ' units');
      PSY.save(); return { ok: true };
    }
    p.outcome = k; p.outcomeAt = PSY.now(); w.p2p = p; w.closed = false;
    if (k === 'upheld') { w.status = 'upheld'; }
    if (k === 'info') { w.status = 'info-req'; w.option = 'evidence'; }
    if (k === 'recon') { w.status = 'recon-prep'; w.option = 'recon'; }
    if (k === 'appeal') { w.status = 'appeal-prep'; w.option = 'appeal'; }
    event(r, 'Peer-to-peer outcome recorded: ' + lab + '. Dispute status: ' + stDef('auth', w.status).label + '.', { doc: 'Peer-to-peer' });
    mark(r, { upheld: 'upheld', info: 'docs', recon: 'review', appeal: 'review' }[k] || diGet(r.case), 'Peer-to-peer: ' + lab);
    PSY.save(); return { ok: true };
  }
  const legacyUnits = (r, n, st) => ({ stageLabel: A.label(st), stageTone: st === 'approved' ? 'g' : 'y', needsClinician: false, units: { req: r.requested, line: r.requested + ' → ' + n + ' awarded', sub: 'recorded Oct 29' }, next: 'Payer decision recorded Oct 29: ' + n + ' of ' + r.requested + ' units.', cta: { label: 'View', go: 'di-case', params: { id: r.id }, primary: false } });

  /* Section G: record the resolution */
  function resolve(id, k, units, date, noteText) {
    const r = get(id); if (!r) return { err: 'No such case.' }; const w = W(id);
    const lab = ((OUTCOMES[r.group] || OUTCOMES.auth).find((x) => x[0] === k) || [k, k])[1];
    date = String(date || '').trim() || 'Oct 29';
    if (r.isClaim) {
      const map = { corrected: ['corrected', false], paid: ['paid', true], denied: ['denied', true], closed: ['closed', true] }[k]; if (!map) return { err: 'Choose an outcome.' };
      const n = units === '' || units == null ? null : Math.round(+units);
      if (k === 'paid' && (n == null || !isFinite(n) || n < 0 || n > r.requested)) return { err: 'Enter the units paid (0 to ' + r.requested + ').' };
      w.status = map[0]; w.closed = map[1]; if (k === 'paid') w.paid = n; w.outcome = { k, label: lab, units: n, date, note: noteText || '', by: ME, at: PSY.now() };
      event(r, 'Resolution recorded: ' + lab + (k === 'paid' ? ' (' + n + ' of ' + r.requested + ' units)' : '') + ' · decision date ' + date + (noteText ? ' · ' + noteText : ''), { doc: 'Resolution' });
      PSY.save(); return { ok: true };
    }
    const needUnits = ['approved', 'partial', 'denied', 'upheld', 'overturned'].includes(k);
    let n = units === '' || units == null ? null : Math.round(+units);
    if (needUnits) {
      if (k === 'denied') n = 0;
      if (n == null && (k === 'approved' || k === 'overturned')) n = r.requested;
      if (n == null && k === 'upheld') n = (r.decision && r.decision.approved) || 0;
      if (n == null || !isFinite(n) || n < 0 || n > r.requested) return { err: 'Enter the final approved units (0 to ' + r.requested + ').' };
      if (k === 'partial' && (n === 0 || n >= r.requested)) return { err: 'A partial approval is more than 0 and fewer than ' + r.requested + ' units.' };
    }
    let st = A.status(r.case); let ds = 'resolved'; let closed = true;
    if (k === 'approved') st = n >= r.requested ? 'approved' : 'partial';
    if (k === 'partial') st = 'partial';
    if (k === 'denied') st = 'denied';
    if (k === 'recon') { st = 'recon'; ds = 'recon'; closed = false; }
    if (k === 'appeal') { st = 'appeal'; ds = 'appeal'; closed = false; }
    if (k === 'upheld') st = n > 0 && n < r.requested ? 'partial' : n >= r.requested ? 'approved' : 'denied';
    if (k === 'overturned') st = n >= r.requested ? 'approved' : n > 0 ? 'partial' : 'denied';
    if (k === 'closed') { ds = 'closed'; }
    w.status = ds; w.closed = closed; w.outcome = { k, label: lab, units: needUnits ? n : null, date, note: noteText || '', by: ME, at: PSY.now() };
    const patch = needUnits ? Object.assign({ approved5: n }, legacyUnits(r, n, st)) : { stageLabel: A.label(st), needsClinician: false, next: lab + ' · recorded Oct 29.', cta: { label: 'View', go: 'di-case', params: { id: r.id }, primary: false } };
    A.set(r.case, st, { action: 'Resolution recorded: ' + lab + (needUnits ? ' · ' + n + ' of ' + r.requested + ' units' : '') + ' · decision date ' + date + (noteText ? ' · ' + noteText : '') + (closed ? '. Dispute ' + id + ' closed.' : ''), doc: id + ' · Resolution', patch });
    note(r, 'Resolution recorded: ' + lab + (needUnits ? ' (' + n + ' of ' + r.requested + ' units)' : '') + '.');
    mark(r, resolvedStatus(r, k, n), lab);
    PSY.save(); return { ok: true };
  }

  /* K.T.: the reply goes out (simulated); the authorization returns to pending payer review and the request is resolved */
  function sendReply(id) {
    const r = get(id); if (!r) return { err: 'No such case.' };
    const x = docState(id, 'info'); if (!x.reviewed) return { err: 'A clinician reviews the reply before it is sent.' };
    const w = W(id); w.option = 'reply'; w.status = 'sent'; w.closed = true; w.outcome = { k: 'sent', label: 'Reply sent', date: 'Oct 29', by: ME, at: PSY.now() };
    w.docs = w.docs || {}; w.docs.info = Object.assign({}, x, { text: x.text != null ? x.text : docText(r, 'info'), prepared: true, sent: true, sentAt: PSY.now() });
    const via = r.channel.method || 'the payer portal';
    A.set(r.case, 'pending', { action: 'Reply sent via ' + via + ' (simulated) by ' + ME + '. Request ' + id + ' resolved; waiting for ' + r.payerShort + '’s decision.', doc: id + ' · ' + DOC_NAME(r, 'info'),
      patch: { stage: 'decision', stageLabel: 'Decision pending', stageTone: 'n', clock: { text: 'reply sent today', tone: 'g' }, next: 'Reply sent via ' + via + ' (simulated) today. Waiting for ' + r.payerShort + '.', needsClinician: false, cta: { label: 'View', go: 'info-request', primary: false } } });
    note(r, 'Reply sent by ' + ME + ' via ' + via + ' (simulated).');
    mark(r, 'awaiting', 'Reply sent (simulated)');
    PSY.save(); return { ok: true };
  }

  /* ---------------- text hygiene: drafts never carry likelihood language ---------------- */
  const BAN = /\b(likely|probab\w*|chance\w*|odds)\b|% match/i;
  function clean(t) {
    return String(t || '').split('\n').map((line) => (BAN.test(line) ? line.split(/(?<=[.!?”])\s+/).filter((s) => !BAN.test(s)).join(' ') : line)).join('\n');
  }

  /* ---------------- small html helpers ---------------- */
  const chip = (tone, t, extra) => '<span class="chip ' + (tone || 'n') + '"' + (extra || '') + '>' + esc(t) + '</span>';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const unitWord = (n) => n + (n === 1 ? ' unit' : ' units');
  /* requested vs approved, drawn to scale (used in the extension and the workspace) */
  function rvaHtml(r, o) {
    o = o || {}; const req = r.requested || 0; const ap = r.approved;
    if (r.issue === 'info' && ap == null) return '<div class="rva5"><div class="rva5-n"><span><b>' + req + '</b> requested</span><span class="w"><b>—</b> not decided yet</span></div><div class="rva5-t" role="img" aria-label="' + req + ' units requested, no decision yet"><i class="pend" style="width:100%"></i></div></div>';
    const a = Math.max(0, Math.min(req, ap || 0)); const pa = req ? Math.round((100 * a) / req) : 0;
    const w = r.isClaim ? ['billed', 'paid', 'not paid'] : r.issue === 'reduction' ? ['requested', 'offered', 'not offered'] : ['requested', 'approved', 'not approved'];
    return '<div class="rva5' + (o.big ? ' big' : '') + '"><div class="rva5-n"><span><b>' + req + '</b> ' + w[0] + '</span><span class="g"><b>' + a + '</b> ' + w[1] + '</span><span class="r"><b>' + (req - a) + '</b> ' + w[2] + '</span></div>' +
      '<div class="rva5-t" role="img" aria-label="' + req + ' units ' + w[0] + ', ' + a + ' ' + w[1] + ', ' + (req - a) + ' ' + w[2] + '"><i class="ok" style="width:' + pa + '%"></i><i class="no" style="width:' + (100 - pa) + '%"></i></div></div>';
  }
  function ruleChips(rules) {
    return (rules || []).map((x) => '<span class="rc5" title="' + esc(x.text + ' — Source: ' + x.source) + '">' + (PSY.rules ? PSY.rules.chip(x) : '') + '<span class="rc5-t">' + esc(x.text) + '</span></span>').join('');
  }
  /* a deadline: its value, with the source (and the payer process behind it) as a tooltip; an unknown one is the
     "Payer requirement verification needed" chip */
  function deadlineHtml(dl, rules) {
    if (!dl) return '<span class="dl5 none">No open deadline</span>';
    const proc = (rules || []).map((x) => '\nProcess: ' + x.text + ' (' + x.source + ')').join('');
    const tip = dl.src || proc ? ' title="' + esc((dl.src ? (dl.verify || dl.none ? '' : 'Source: ') + dl.src : '') + proc) + '"' : '';
    if (dl.verify) return '<span class="dl5 v"' + tip + '>' + (PSY.ev ? PSY.ev.label('unverified', dl.label === 'Not verified' ? 'Deadline not verified' : dl.label) : esc(dl.label)) + '</span>';
    if (dl.none) return '<span class="dl5 none"' + tip + '><b>' + esc(dl.label) + '</b></span>';
    return '<span class="dl5"' + tip + '><b>' + esc(dl.label) + '</b><i class="dl5-i" aria-hidden="true">ⓘ</i></span>';
  }
  const simChip = () => (PSY.ev ? PSY.ev.label('illustrative', 'Simulated') : '<span class="chip n">Simulated</span>');

  /* shared styles: platform pages (theme-remapped) and the extension focus (Lauris) both use them */
  const SHARED = `
  .rva5{display:flex;flex-direction:column;gap:6px;font-size:13px}
  .rva5-n{display:flex;gap:16px;flex-wrap:wrap;align-items:baseline}.rva5-n b{font-size:18px;font-weight:700}.rva5.big .rva5-n b{font-size:26px}
  .rva5-n .g b{color:#1E5C3C}.rva5-n .r b{color:#8A2E1C}.rva5-n .w b{color:#6B665E}
  .rva5-t{display:flex;height:12px;border-radius:99px;overflow:hidden;background:#EFEBE4}.rva5.big .rva5-t{height:16px}
  .rva5-t i{display:block;height:100%}.rva5-t i.ok{background:#2F8F5B}.rva5-t i.no{background:repeating-linear-gradient(135deg,#F0C3B8 0 6px,#FBE7E2 6px 12px);border-left:2px solid #fff}.rva5-t i.pend{background:repeating-linear-gradient(135deg,#C7D7EC 0 6px,#E6EEF8 6px 12px)}
  .rc5{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin:0 8px 4px 0;font-size:12px;color:#4A453D}.rc5 .ev5{flex:0 0 auto}.rc5-t{min-width:0;white-space:normal;line-height:1.35}
  .dl5{display:inline-flex;align-items:center;gap:6px;font-size:13px}.dl5[title]{cursor:help}.dl5 b{font-weight:700}.dl5-i{font-style:normal;font-size:12px;color:#6B665E}.dl5.none b{font-weight:600;color:#4A453D}
  `;

  /* platform stylesheet shared by every screen in this area (prefix pi-, kept for other screens that reuse it) */
  const css = `
  .pi-sub{font-size:13px;color:#6B665E;margin-top:2px}
  .pi-cap{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#6B665E;font-weight:600}
  .pi-hd{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:18px 22px 0}
  .pi-hd>div:first-child{flex:1 1 260px;min-width:0}
  .pi-bd{padding:14px 22px 20px}
  .pi-bd.pad0{padding:6px 0 0}
  .pi-callout{border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.5}
  .pi-callout.r{background:#F8E9E3;border-left:3px solid #B5503A}
  .pi-callout.g{background:#E3EFEA;border:1px solid #CFE3DA}
  .pi-callout.y{background:#FBF1DA;border:1px solid #F0DDB0}
  .pi-callout b{font-weight:600}
  .pi-grid2{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:20px;align-items:start}
  .pi-grid2>div{min-width:0}
  .pi-col{display:flex;flex-direction:column;gap:16px;min-width:0}
  .pi-tl{display:grid;grid-template-columns:78px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid #EFE8DE;font-size:13.5px}
  .pi-tl:first-child{border-top:0}
  .pi-tl .d{color:#6B665E;font-weight:600;font-size:12.5px;padding-top:1px}
  .pi-tag{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:#1D4F43;background:#E3EFEA;border-radius:999px;padding:2px 10px;white-space:nowrap}
  .pi-tag:before{content:"";width:6px;height:6px;border-radius:50%;background:#2F8F5B}
  .pi-ev{display:inline-block;border-radius:999px;background:#EFE8DE;color:#4A453D;padding:2px 10px;font-size:12px;font-weight:600;margin:0 6px 4px 0}
  .pi-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pi-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:#1D4F43;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
  .pi-link:hover{color:#17403A}
  .pi-kv{display:grid;grid-template-columns:104px minmax(0,1fr);gap:6px 12px;font-size:13.5px}
  .pi-kv dt{color:#6B665E}.pi-kv dd{margin:0;font-weight:500}
  .pi-num{flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:#EFE8DE;color:#4A453D;font-weight:600;font-size:13px;display:inline-flex;align-items:center;justify-content:center}
  .pi-bar6{height:6px;border-radius:99px;background:#EFE8DE;overflow:hidden}.pi-bar6 i{display:block;height:100%;border-radius:99px}
  .pi-empty{padding:26px 22px;color:#6B665E}
  ` + SHARED;

  /* ================================================================================================================================
     Round 9: Denial Intelligence records. One record per denied, partially approved or info-requested authorization case; claims
     issues (illustrative) stay separate (group 'claim'). Each record carries the prompt's queue fields: consumer, payer, service,
     authorization reference, requested and approved units, the payer's stated reason, decision date, the next response deadline
     (with its source), assigned owner, the consumer's clinician, the resolution status (PSY.diStatus) and the next action.
     ================================================================================================================================ */
  const DSm = () => PSY.diStatus;
  const diGet = (cid) => (DSm() ? DSm().get(cid) : 'new');
  const KIND_OF = { partial: 'partial', reduction: 'partial', denial: 'denied', 'cs-denial': 'denied', info: 'info' };
  const KIND_LABEL = { partial: 'Partial approval', denied: 'Full denial', info: 'Additional information requested' };
  /* where each case starts, as the scenarios record it: T.N. under review (peer-to-peer slot Dec 9), D.W. and J.O. new (offers made by
     phone), K.T. awaiting documentation (reply drafted, due today), E.C. appeal drafted (letter for the guardian, Oct 26) */
  const SEED_STATUS = { 'R-0388': 'review', 'R-0402': 'new', 'R-0391': 'new', 'R-0408': 'docs', 'R-0384': 'drafted' };
  if (DSm()) Object.assign(DSm().seed, SEED_STATUS);
  const FINAL = ['overturned', 'partover', 'upheld', 'closed'];
  const DI_TONE = { new: ['amber', '●'], review: ['amber', '◔'], docs: ['amber', '?'], drafted: ['blue', '✎'], submitted: ['blue', '↗'], awaiting: ['blue', '…'],
    overturned: ['green', '✓'], partover: ['green', '◐'], upheld: ['red', '✕'], closed: ['gray', '■'] };
  const statusBadge = (s) => { const t = DI_TONE[s] || ['gray', '•']; return '<span class="st5 t-' + t[0] + '" data-di-status="' + esc(s) + '"><i aria-hidden="true">' + t[1] + '</i>' + esc(DSm() ? DSm().label(s) : s) + '</span>'; };
  const staffName = (short) => { const L = PSY.data.lauris; const x = L && L.staff ? Object.values(L.staff).find((s) => s.short === short) : null; return x ? x.name : (short || ''); };
  const shortName = (n) => String(n || '').replace(/,.*$/, '').replace(/^(\w)\w+ /, '$1. ');

  /* a workspace action moves the resolution status with it (no second audit line: the action already wrote one) */
  function mark(r, status, note) {
    if (!r || r.isClaim || !status) return;
    const st = (PSY.state.diStatus = PSY.state.diStatus || {});
    const cur = diGet(r.case); const x = (st[r.case] = st[r.case] || { status: cur, history: [] });
    x.issue = x.issue || r.issue;
    if (cur === status) return;
    x.status = status; x.at = PSY.now(); x.by = (PSY.user && PSY.user().name) || ME; x.note = note || ''; x.history = x.history || [];
    x.history.push({ status, at: x.at, by: x.by, note: x.note });
  }
  /* a resolution recorded in the workspace (Section G) → the resolution status */
  function resolvedStatus(r, k, n) {
    const orig = r.decision && r.decision.approved != null ? r.decision.approved : (r.d.approved || 0);
    if (k === 'recon' || k === 'appeal') return 'submitted';
    if (k === 'closed' || r.issue === 'info') return 'closed';
    if (k === 'upheld' || k === 'denied') return 'upheld';
    if (k === 'approved' || k === 'overturned' || k === 'partial') return n >= r.requested ? 'overturned' : n > orig ? 'partover' : 'upheld';
    return diGet(r.case);
  }
  /* the route the case is on: appeal · recon · p2p · info · evidence */
  function pathOf(r) {
    const st = A.status(r.case); const p = p2pOf(r);
    if (r.option === 'recon' || st === 'recon') return 'recon';
    if (r.option === 'appeal' || st === 'appeal') return 'appeal';
    if (r.option === 'p2p' || (p && p.date && !p.outcome)) return 'p2p';
    if (r.issue === 'info' || r.option === 'reply') return 'info';
    if (r.option === 'evidence') return 'evidence';
    if (['drafted', 'submitted', 'awaiting'].includes(r.diStatus)) return 'appeal';
    return '';
  }
  /* next action: the workspace's next step, refined by the resolution status */
  function nextFor(r) {
    const s = r.diStatus;
    if (s === 'partover' && r.unitsPending) return { label: 'Record the units ' + r.payerShort + ' approved', short: 'Record units', sec: 'g' };
    if (s === 'upheld') return { label: 'Choose the next step: accept or appeal', short: 'Choose next step', sec: 'd' };
    if (s === 'closed') return { label: 'Closed · nothing to do', short: 'View', sec: 'g', none: true };
    if (s === 'overturned' || s === 'partover') return { label: 'Resolved · nothing to do', short: 'View', sec: 'g', none: true };
    if ((s === 'submitted' || s === 'awaiting') && r.path !== 'p2p') return { label: 'Record ' + r.payerShort + '’s response', short: 'Record response', sec: 'g' };
    if (s === 'drafted' && !r.option) { const x = docState(r.id, 'appeal'); return x.gen && x.reviewed ? { label: 'Prepare the appeal for submission', short: 'Prepare appeal', sec: 'e' } : x.gen ? { label: 'Review the ' + DOC_NAME(r, 'appeal').toLowerCase(), short: 'Review draft', sec: 'e' } : { label: 'Generate the appeal draft', short: 'Generate draft', sec: 'e' }; }
    return r.next;
  }
  function enrich(r) {
    r.consumer = r.ini;
    const L = PSY.data.lauris; const lc = L && L.byCase ? L.byCase(r.case) : null;
    if (r.isClaim) {
      /* the consumer's clinician (Lauris) so the Assigned clinician filter covers claims too */
      Object.assign(r, { kind: 'claim', kindLabel: r.issueLabel, diStatus: null, resolved: !!r.closed, open: !r.closed, ref: r.claim ? r.claim.no : '', owner: r.assigned, ownerShort: r.assigned,
        decisionDate: r.opened, decisionMs: parseDate(r.opened), reasonText: r.reasons.join(' · '), clinician: lc ? (lc.staff || '') : '', clinicianName: lc ? staffName(lc.staff) : '' });
      if (!r.laurisId && lc) r.laurisId = lc.id;
      return;
    }
    r.kind = KIND_OF[r.issue] || ((r.approved || 0) > 0 ? 'partial' : 'denied');
    r.kindLabel = KIND_LABEL[r.kind];
    r.ref = r.m.ref || ''; if (!r.laurisId && lc) r.laurisId = lc.id;
    r.clinician = lc ? (lc.staff || '') : ''; r.clinicianName = staffName(r.clinician);
    r.owner = r.assigned; r.ownerShort = shortName(r.assigned);
    r.decisionDate = String((r.decision && r.decision.date) || r.opened || '').replace(/,.*$/, ''); r.decisionMs = parseDate(r.decisionDate);
    r.diStatus = diGet(r.case); r.diLabel = DSm() ? DSm().label(r.diStatus) : r.diStatus; r.diStep = DSm() ? DSm().step(r.case) : 0;
    r.resolved = FINAL.includes(r.diStatus) || (r.closed && !['submitted', 'awaiting'].includes(r.diStatus)); r.open = !r.resolved;
    r.unitsPending = !!(r.s && r.s.unitsPending) && r.diStatus === 'partover';
    r.path = pathOf(r);
    r.reasonText = r.issue === 'info' ? (r.reasons.join(' ') || KIND_LABEL.info) : r.reasons.length ? r.reasons.map((x) => '“' + x + '”').join(' · ') : 'No stated reason on file';
    r.appealDeadline = r.deadline; // the next response deadline (appeal, reply or peer-to-peer), each with its source
    r.workspaceNext = r.next; r.next = nextFor(r);
  }

  /* ---------------- the queue's filters (Show) and the population filters (payer, service, clinician, decision date) ---------------- */
  const WEEK0 = -((new Date(TODAY).getUTCDay() + 6) % 7); // Monday of the demo week (today is Thu Oct 29 → Mon Oct 26)
  const soon = (r) => !!(r.open && r.deadline && r.deadline.ms != null && dayDiff(r.deadline.ms) <= 7);
  const p2pReq = (r) => { if (!r.open) return false; if (r.path === 'p2p') return true; const p = p2pOf(r); return !!(p && p.date && !p.outcome); };
  const appealing = (r) => r.open && r.kind !== 'info' && (['appeal', 'recon'].includes(A.status(r.case)) || (['drafted', 'submitted', 'awaiting'].includes(r.diStatus) && r.path !== 'p2p'));
  const SHOW = [
    ['', 'All denials', () => true],
    ['partial', 'Partial approvals', (r) => r.kind === 'partial'],
    ['denied', 'Full denials', (r) => r.kind === 'denied'],
    ['review', 'Needs clinical review', (r) => r.open && (r.diStatus === 'new' || r.diStatus === 'review')],
    ['info', 'Additional information requested', (r) => r.kind === 'info'],
    ['appeal', 'Appeal in progress', appealing],
    ['p2p', 'Peer-to-peer requested', p2pReq],
    ['resolved', 'Resolved', (r) => r.resolved],
    ['deadline', 'Deadline approaching', soon],
    ['overturned', 'Appeals overturned', (r) => r.diStatus === 'overturned' || r.diStatus === 'partover'],
    ['risk', 'Units at risk', (r) => r.open && (r.atRisk || 0) > 0],
  ];
  const showFn = (k) => (SHOW.find((x) => x[0] === (k || '')) || SHOW[0])[2];
  const DATES = [['today', 'Today'], ['week', 'This week'], ['earlier', 'Earlier']];
  const dateIn = (r, k) => { if (r.decisionMs == null) return false; const n = dayDiff(r.decisionMs); return k === 'today' ? n === 0 : k === 'week' ? n >= WEEK0 && n <= 0 : k === 'earlier' ? n < WEEK0 : true; };
  const inScope = (r, f) => f.scope === false || !PSY.caseInCaseload || PSY.caseInCaseload(r.case, f.role);
  const popMatch = (r, f) => (!f.payer || r.payer === f.payer) && (!f.service || r.serviceKey === f.service) && (!f.clinician || r.clinician === f.clinician) &&
    (!f.date || dateIn(r, f.date)) && (!f.ids || f.ids.indexOf(r.case) >= 0);
  function sortRecords(rs, how) {
    const dms = (r) => (r.deadline && r.deadline.ms != null ? r.deadline.ms : 9e15);
    return rs.slice().sort((a, b) => (a.resolved - b.resolved) || (how === 'risk' ? ((b.atRisk || 0) - (a.atRisk || 0)) || (dms(a) - dms(b)) : (dms(a) - dms(b)) || ((b.atRisk || 0) - (a.atRisk || 0))));
  }
  /* records(f): f = { show, payer, service, clinician, date ('today'|'week'|'earlier'), ids, group ('auth'|'claim'|'all'), role, scope:false, loc, sort }
     The current role's caseload applies unless scope:false; the platform's locality switch applies unless loc is given ('both' = all). */
  function records(f) {
    f = f || {}; const grp = f.group || 'auth';
    const loc = f.loc != null ? f.loc : ((PSY.state.prefs || {}).locality || 'both');
    const sh = showFn(f.show);
    return sortRecords(list().filter((r) => (grp === 'all' || r.group === grp) && inScope(r, f) && (!loc || loc === 'both' || r.loc === loc) && popMatch(r, f) && (r.isClaim || sh(r))), f.sort || (f.show === 'risk' ? 'risk' : 'urgency'));
  }
  const claims = (f) => records(Object.assign({}, f || {}, { group: 'claim', show: '' }));
  const recordsOf = (f) => { const g = Object.assign({}, f || {}); delete g.show; g.group = 'auth'; return records(g); };

  /* ---------------- round 11: the list's filters (one table: authorization records and claims) ----------------
     queue(f): f = { q, status, type, payer, service, clinician, deadline, date, next } plus records()' role/scope/loc. */
  const TYPES = [['denied', 'Denied'], ['partial', 'Partial approval'], ['info', 'Info requested'], ['claim', 'Claim']];
  const DEADLINES = [['7', 'Due within 7 days'], ['30', 'Due within 30 days'], ['later', 'Due later'], ['none', 'None or not verified']];
  const NEXT_STEPS = [['decide', 'Decide how to respond'], ['draft', 'Generate a draft'], ['review', 'Review a draft'], ['send', 'Send or schedule'], ['record', 'Record the payer’s answer'], ['none', 'Nothing to do']];
  const STATUS_OPTS = () => [['open', 'Open'], ['resolved', 'Resolved']].concat(DSm() ? DSm().LIST : []);
  /* a claim's own status, read against the authorization statuses where the words agree */
  const CLAIM_ST = { new: 'new', corrected: 'submitted', 'claim-recon': 'submitted', 'claim-appeal': 'submitted', closed: 'closed' };
  const statusKey = (r) => (r.isClaim ? CLAIM_ST[r.status] || '' : r.diStatus);
  const statusIn = (r, k) => (k === 'open' ? r.open : k === 'resolved' ? !r.open : statusKey(r) === k);
  const nextGroup = (r) => { const n = r.next || {}; const s = n.short || ''; return n.none ? 'none' : /^(Choose|Decide)/.test(s) ? 'decide' : /^Generate/.test(s) ? 'draft' : /^Review/.test(s) ? 'review' : /^(Send|Schedule|Prepare)/.test(s) ? 'send' : /^Record/.test(s) ? 'record' : 'decide'; };
  const dueIn = (r, k) => {
    const ms = r.open && r.deadline && r.deadline.ms != null ? r.deadline.ms : null;
    if (k === 'none') return ms == null; if (ms == null) return false;
    const n = dayDiff(ms); return k === '7' ? n <= 7 : k === '30' ? n <= 30 : k === 'later' ? n > 30 : true;
  };
  const hay = (r) => [r.id, r.who, r.ini, r.laurisId ? '#' + r.laurisId : '', r.ref, r.payerShort, r.payerName, r.service, r.serviceLabel, r.kindLabel, r.reasonText, r.owner, r.clinicianName,
    r.claim ? r.claim.no + ' ' + r.claim.code : ''].join(' ').toLowerCase();
  /* round 13: the decision date as a range of calendar days (the list's time box, PSY.fb.dateRange page 'denials'); either end may be open */
  const isoOf = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
  const msOfDay = (v) => { if (!v) return null; const d = PSY.fb && PSY.fb.toDate ? PSY.fb.toDate(v) : null; return d ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) : parseDate(v); };
  const dateBetween = (r, from, to) => { if (r.decisionMs == null) return false; const day = dayOf(r.decisionMs); const a = msOfDay(from), b = msOfDay(to); return (a == null || day >= dayOf(a)) && (b == null || day <= dayOf(b)); };
  /* the old Decision date choices as shortcuts that fill both dates: [key, label, fromISO, toISO] */
  const DATE_PRESETS = [['today', 'Today', isoOf(TODAY), isoOf(TODAY)], ['week', 'This week', isoOf(TODAY + WEEK0 * DAY), isoOf(TODAY)], ['earlier', 'Before this week', '', isoOf(TODAY + (WEEK0 - 1) * DAY)]];
  function queue(f) {
    f = f || {}; const q = String(f.q || '').trim().toLowerCase();
    const g = Object.assign({}, f, { group: 'all', show: '' });
    return records(g).filter((r) => (!f.status || statusIn(r, f.status)) && (!f.type || r.kind === f.type) && (!f.deadline || dueIn(r, f.deadline)) &&
      (!f.next || nextGroup(r) === f.next) && (!(f.from || f.to) || dateBetween(r, f.from, f.to)) && (!q || hay(r).indexOf(q) >= 0));
  }

  /* metrics(f): the dashboard counts for the population (the Show filter is ignored) */
  function metrics(f) {
    const rs = recordsOf(f); const n = (k) => rs.filter(showFn(k)).length;
    const open = rs.filter((r) => r.open);
    const decided = rs.filter((r) => r.kind !== 'info' && r.decided);
    const cuts = rs.filter((r) => r.kind === 'partial' && r.decided && r.requested).map((r) => ({ case: r.case, ini: r.ini, requested: r.requested, approved: r.approved || 0, cut: Math.max(0, r.requested - (r.approved || 0)) }));
    const group = (keyOf, init) => { const o = {}; rs.forEach((r) => { const k = keyOf(r); const g = (o[k] = o[k] || Object.assign({ total: 0, partial: 0, denied: 0, info: 0, open: 0, notApproved: 0, cases: [] }, init(r))); g.total++; g[r.kind]++; if (r.open) g.open++; if (r.decided) g.notApproved += Math.max(0, (r.requested || 0) - (r.approved || 0)); g.cases.push(r.case); }); return Object.values(o).sort((a, b) => b.total - a.total || (b.partial + b.denied) - (a.partial + a.denied) || b.notApproved - a.notApproved); };
    const byStatus = {}; rs.forEach((r) => { byStatus[r.diStatus] = (byStatus[r.diStatus] || 0) + 1; });
    return {
      n: rs.length, total: rs.length, partial: n('partial'), denied: n('denied'), info: n('info'), review: n('review'), appeals: n('appeal'), p2p: n('p2p'),
      resolved: n('resolved'), overturned: n('overturned'), deadlines: n('deadline'), open: open.length,
      unitsAtRisk: open.reduce((s, r) => s + (r.atRisk || 0), 0),
      requested: rs.reduce((s, r) => s + (r.requested || 0), 0), approved: decided.reduce((s, r) => s + (r.approved || 0), 0),
      decisions: decided.length, partialRate: decided.length ? n('partial') / decided.length : null, denialRate: decided.length ? n('denied') / decided.length : null,
      cuts, avgReduced: cuts.length ? cuts.reduce((s, x) => s + x.cut, 0) / cuts.length : null,
      outcomes: { overturned: byStatus.overturned || 0, partover: byStatus.partover || 0, upheld: byStatus.upheld || 0, closed: byStatus.closed || 0, inProgress: n('appeal'), p2p: n('p2p') },
      byStatus,
      byPayer: group((r) => r.payer, (r) => ({ payer: r.payer, short: r.payerShort, name: r.payerName })),
      byService: group((r) => r.serviceKey, (r) => ({ service: r.serviceKey, short: r.service, label: r.serviceLabel })),
    };
  }

  /* ---------------- patterns (section G): derived from the records in view, each with a recommendation worded as a correlation ---------------- */
  /* the payers' stated reasons, grouped by what they question (the words stay the payer's) */
  const THEMES = [
    { key: 'other', re: /\bIEP\b|outpatient|other services|another service/i, label: 'Another service could meet the need', verb: 'said another service could meet the need', noun: 'other services meeting the need',
      rec: 'Review whether future requests state which services are in place, how often they happen and why they are not enough alone.', rule: 'coord' },
    { key: 'hours', re: /hours|intensity/i, label: 'Hours of service per day questioned', verb: 'questioned the hours of service per day', noun: 'the hours of service per day',
      rec: 'Review whether future requests include the time log (daily start and stop times) and the clinical rationale for that many hours a day.', rule: 'tdt-units' },
  ];
  const themeOf = (x) => THEMES.find((t) => t.re.test(x)) || null;
  /* documentation the case record lists as incomplete (PSY.data.hub criteria not met; same topics as Analytics) */
  const DOC_TOPICS = {
    crit1: { key: 'incidents', label: 'Dated incidents: how often, how long, how severe', rec: 'Review whether future requests list dated incidents with how often and how long they happened.', rule: 'tdt-clin2' },
    crit2: { key: 'tried', label: 'Interventions tried and their outcome', rec: 'Review whether future requests state each intervention tried, with its dates and outcome.', rule: 'tdt-failed' },
    q2: { key: 'tried', label: 'Interventions tried and their outcome', rec: 'Review whether future requests state each intervention tried, with its dates and outcome.', rule: 'tdt-failed' },
    coord: { key: 'coord', label: 'Care coordination: services, how often, why not enough', rec: 'Review whether future requests state which services are in place, how often and why each is not enough alone.', rule: 'coord' },
    units: { key: 'units', label: 'Units asked vs hours and run-out', rec: 'Review whether future requests show how the units asked for match the documented hours and when units run out.', rule: 'tdt-units' },
    progress: { key: 'progress', label: 'Progress toward each goal', rec: 'Review whether concurrent SRAs describe progress toward each goal.', rule: null },
    family: { key: 'family', label: 'Family involvement in the guardian’s words', rec: 'Review whether future requests include the guardian’s own words about the need.', rule: null },
    goals: { key: 'goals', label: 'Goals and monitoring plan', rec: 'Review whether future requests include goals and a monitoring plan.', rule: null },
    docs: { key: 'docs', label: 'Supporting documents and consents', rec: 'Review whether supporting documents and consents are on file before a request or appeal goes in.', rule: null },
  };
  function docGaps(cid) {
    const h = (PSY.data.hub || {})[cid]; const out = [];
    ((h && h.criteria) || []).forEach((x) => {
      const t = DOC_TOPICS[x.key]; if (!t || x.status === 'met' || /^Not claimed/i.test(x.note || '')) return;
      out.push({ topic: t.key, label: t.label, item: x.short || x.label || x.key, status: x.status, note: x.note || '' });
    });
    return out;
  }
  const decisionsWord = (n) => n + (n === 1 ? ' recent decision' : ' recent decisions');
  const uniqList = (a) => Array.from(new Set(a));
  function patterns(f) {
    const rs = recordsOf(f); const N = rs.length; const m = metrics(f); const out = [];
    const byId = {}; rs.forEach((r) => { byId[r.case] = r; });
    const pay = (ids) => uniqList(ids.map((c) => byId[c].payerShort)).join(', ');
    const themesIn = (list2, prefer) => {
      const th = {};
      list2.forEach((r) => { const seen = {}; r.reasons.forEach((x) => { const t = themeOf(x); if (!t || seen[t.key]) return; seen[t.key] = 1; const e = (th[t.key] = th[t.key] || { t, cases: [], quotes: [] }); e.cases.push(r.case); if (e.quotes.indexOf(x) < 0) e.quotes.push(x); }); });
      const ord = (t) => (prefer ? prefer.indexOf(t.key) : THEMES.indexOf(t));
      return Object.values(th).sort((a, b) => b.cases.length - a.cases.length || ord(a.t) - ord(b.t));
    };
    const dec = rs.filter((r) => r.kind !== 'info' && r.reasons.length);
    /* 1 · most common reasons */
    const themes = themesIn(dec); const top = themes[0];
    const loose = []; dec.forEach((r) => r.reasons.forEach((x) => { if (!themeOf(x)) loose.push({ x, c: r.case }); }));
    out.push({ key: 'reasons', title: 'Most common reasons', n: dec.length, noun: 'decisions with a stated reason',
      rows: themes.map((e) => ({ label: e.t.label, count: e.cases.length, of: dec.length, sub: e.quotes.map((q) => '“' + q + '”').join(' · '), cases: e.cases, quote: true }))
        .concat(loose.map((l) => ({ label: '“' + l.x + '”', count: 1, of: dec.length, sub: byId[l.c].payerShort, cases: [l.c], quote: true }))),
      rec: top ? decisionsWord(top.cases.length) + ' ' + top.t.verb + ' (' + pay(top.cases) + '). ' + top.t.rec : 'No stated reason is on file in this view.',
      rule: top ? top.t.rule : null, cases: top ? top.cases : dec.map((r) => r.case), quotes: true });
    /* 2 · by payer */
    const tp = m.byPayer[0]; const tpThemes = tp ? themesIn(dec.filter((r) => r.payer === tp.payer)) : []; const tpt = tpThemes[0];
    out.push({ key: 'payer', title: 'Denials by payer', n: N, noun: N === 1 ? 'record' : 'records',
      rows: m.byPayer.map((p) => ({ label: p.short, count: p.total, of: N, sub: [p.partial ? p.partial + ' partial' : '', p.denied ? p.denied + ' denied' : '', p.info ? p.info + ' info requested' : ''].filter(Boolean).join(' · '), cases: p.cases, payer: p.payer })),
      rec: !tp ? 'No records in this view.' : tp.total + ' of ' + N + ' records in this view are ' + tp.short + (tpt ? '; ' + tpt.cases.length + ' of them ' + tpt.t.verb + '. ' + tpt.t.rec.replace('future requests', 'future ' + tp.short + ' requests') : '. Review ' + tp.short + '’s decisions together before the next request.'),
      rule: tpt ? tpt.t.rule : null, cases: tp ? tp.cases : [] });
    /* 3 · by service */
    const ts = m.byService[0];
    out.push({ key: 'service', title: 'Denials by service', n: N, noun: N === 1 ? 'record' : 'records',
      rows: m.byService.map((s) => ({ label: s.label, count: s.total, of: N, sub: s.short, cases: s.cases })),
      rec: !ts ? 'No records in this view.' : (m.byService.length === 1 ? 'All ' + N + ' records in this view are ' + ts.short + '.' : ts.total + ' of ' + N + ' records in this view are ' + ts.short + '.') + (ts.service === 'op' ? ' Review whether these requests include the plan’s session rules.' : ' Review whether ' + ts.short + ' requests address each DMAS criteria group: diagnostic, clinical necessity and level of care.'),
      rule: ts && ts.service !== 'op' ? 'tdt-all3' : null, cases: ts ? ts.cases : [] });
    /* 4 · partial approval frequency */
    const parts = rs.filter((r) => r.kind === 'partial'); const ptThemes = themesIn(parts.filter((r) => r.reasons.length), ['hours', 'other']); const ptt = ptThemes[0];
    out.push({ key: 'partial', title: 'Partial approval frequency', n: m.decisions, noun: m.decisions === 1 ? 'decision' : 'decisions',
      figure: { value: m.decisions ? Math.round(100 * parts.length / m.decisions) + '%' : '—', label: parts.length + ' of ' + m.decisions + ' decisions' },
      rows: [{ label: 'Partial approvals', count: parts.length, of: m.decisions, cases: parts.map((r) => r.case) }, { label: 'Full denials', count: m.denied, of: m.decisions, cases: rs.filter((r) => r.kind === 'denied').map((r) => r.case) }],
      rec: !parts.length ? 'No partial approvals in this view.' : ptt ? ptt.cases.length + ' of ' + parts.length + ' recent partial approvals ' + ptt.t.verb + '. Review whether future requests include documented frequency, duration and clinical rationale.' : parts.length + ' of ' + m.decisions + ' recent decisions were partial approvals. Review whether future requests include documented frequency, duration and clinical rationale.',
      rule: ptt ? ptt.t.rule : null, obs: ['partial-common'], cases: ptt ? ptt.cases : parts.map((r) => r.case) });
    /* 5 · average units reduced */
    const cuts = m.cuts; const avg = m.avgReduced != null ? Math.round(m.avgReduced) : null;
    const reqSum = cuts.reduce((s, x) => s + x.requested, 0); const cutSum = cuts.reduce((s, x) => s + x.cut, 0);
    out.push({ key: 'units', title: 'Average units reduced', n: cuts.length, noun: cuts.length === 1 ? 'partial approval' : 'partial approvals',
      figure: { value: avg != null ? String(avg) : '—', label: avg != null ? 'units per partial approval · ' + Math.round(100 * cutSum / Math.max(1, reqSum)) + '% of the units requested' : 'no partial approvals' },
      rows: cuts.map((x) => ({ label: x.ini, count: x.cut, of: x.requested, sub: x.requested + ' requested → ' + x.approved + (((v) => !!(v && v.issue === 'reduction' && v.open))(byCase(x.case)) ? ' offered' : ' approved'), cases: [x.case] })),
      rec: !cuts.length ? 'No partial approvals in this view.' : 'Partial approvals cut ' + avg + ' units on average' + (cuts.length > 1 ? ' (' + Math.min.apply(null, cuts.map((x) => x.cut)) + '–' + Math.max.apply(null, cuts.map((x) => x.cut)) + ', n = ' + cuts.length + ')' : '') + '. Review whether requests show how the units asked for match the hours documented for the period.',
      rule: cuts.length ? 'tdt-units' : null, cases: cuts.map((x) => x.case) });
    /* 6 · missing-documentation patterns */
    const gaps = {}; rs.forEach((r) => { const seen = {}; docGaps(r.case).forEach((g) => { if (seen[g.topic]) return; seen[g.topic] = 1; const e = (gaps[g.topic] = gaps[g.topic] || { topic: g.topic, label: g.label, cases: [] }); e.cases.push(r.case); }); });
    const gl = Object.values(gaps).sort((a, b) => b.cases.length - a.cases.length || a.label.localeCompare(b.label)); const tg = gl[0];
    const tgDef = tg ? Object.values(DOC_TOPICS).find((t) => t.key === tg.topic) : null;
    out.push({ key: 'docs', title: 'Missing-documentation patterns', n: N, noun: N === 1 ? 'record' : 'records',
      rows: gl.map((g) => ({ label: g.label, count: g.cases.length, of: N, sub: g.cases.map((c) => byId[c].ini).join(', '), cases: g.cases, topic: g.topic })),
      rec: !tg ? 'No incomplete documentation is listed for these records.' : tg.cases.length + ' of ' + N + ' records in this view list “' + tg.label + '” as incomplete. ' + tgDef.rec,
      rule: tgDef ? tgDef.rule : null, cases: tg ? tg.cases : [], topic: tg ? tg.topic : null, clinical: true });
    /* 7 · appeal outcomes */
    const oc = m.outcomes; const won = rs.filter((r) => r.diStatus === 'overturned' || r.diStatus === 'partover'); const lost = rs.filter((r) => r.diStatus === 'upheld');
    const inProg = rs.filter(showFn('appeal')); const p2p = rs.filter(showFn('p2p'));
    const done = won.length + lost.length;
    const wonThemes = themesIn(won.filter((r) => r.reasons.length)); const wt = wonThemes[0];
    out.push({ key: 'outcomes', title: 'Appeal outcomes', n: done + inProg.length + p2p.length, noun: 'appeals and peer-to-peers',
      rows: [{ label: 'Overturned', count: oc.overturned, cases: rs.filter((r) => r.diStatus === 'overturned').map((r) => r.case) }, { label: 'Partially overturned', count: oc.partover, cases: rs.filter((r) => r.diStatus === 'partover').map((r) => r.case) },
        { label: 'Upheld', count: oc.upheld, cases: lost.map((r) => r.case) }, { label: 'Appeal in progress', count: inProg.length, cases: inProg.map((r) => r.case) }, { label: 'Peer-to-peer requested', count: p2p.length, cases: p2p.map((r) => r.case) }],
      rec: done ? won.length + ' of ' + done + (done === 1 ? ' recorded payer response' : ' recorded payer responses') + ' overturned the decision in full or in part' + (wt ? '; ' + wt.cases.length + ' of ' + (wt.cases.length === 1 ? 'them was' : 'them were') + ' about ' + wt.t.noun : '') + '. Review whether open denials with the same stated reason include the same evidence.'
        : 'No payer response is recorded yet in this view (' + inProg.length + ' appeal' + (inProg.length === 1 ? '' : 's') + ' in progress, ' + p2p.length + ' peer-to-peer' + (p2p.length === 1 ? '' : 's') + ' requested). Record each response as it arrives so outcomes can be compared by reason and payer.',
      rule: null, obs: ['guardian-appeal', 'p2p-wait'], cases: done ? won.concat(lost).map((r) => r.case) : inProg.concat(p2p).map((r) => r.case) });
    out.forEach((p) => { p.cases = uniqList(p.cases || []); p.ruleObj = p.rule ? rule(p.rule) : null; p.obsObj = (p.obs || []).map(rule).filter((x) => x && (x.payers === '*' || rs.some((r) => (x.payers || []).indexOf(r.payer) >= 0))); });
    return out;
  }

  /* ---------------- propagation to the authorization record (replaces the foundation's default) ----------------
     Overturned → Approved with the requested units · Partially Overturned → Partially approved with the units the payer gave (o.approved;
     without a number the status changes and "Record units" becomes the next action) · Upheld → the payer's decision stands ·
     Submitted / Awaiting Payer → Appeal pending (or Reconsideration pending; a peer-to-peer keeps the decision; an info reply → Pending payer review) ·
     Closed → the decision as recorded · back to New / Under Review / Awaiting Documentation after a resolution → the payer's decision as recorded. */
  function propagate(cid, status, o) {
    o = o || {};
    const r = byCase(cid); if (!r || r.isClaim) return;
    const st = PSY.state.diStatus || {}; const rec = st[cid]; if (rec) rec.issue = rec.issue || r.issue;
    const hist = (rec && rec.history) || []; const prev = hist.length > 1 ? hist[hist.length - 2].status : (DSm().seed[cid] || 'new');
    const by = o.by || (PSY.user ? PSY.user().name : ME); const w = W(r.id); const doc = r.id + ' · Denial Intelligence';
    const req = r.requested || 0; const orig = r.decision && r.decision.approved != null ? r.decision.approved : (r.d.approved || 0);
    const base = r.kind === 'denied' ? 'denied' : r.kind === 'info' ? 'info' : 'partial';
    const path = o.path || r.path;
    const withUnits = (n, s2, action) => A.set(cid, s2, { action, by, doc, patch: Object.assign({ approved5: n }, legacyUnits(r, n, s2)) });
    const outcome = (k, label, n) => ({ k, label, units: n, date: 'Oct 29', by, at: PSY.now() });
    delete w.unitsPending;
    if (status === 'overturned') {
      withUnits(req, 'approved', 'Payer overturned the decision: ' + req + ' of ' + req + ' units approved');
      Object.assign(w, { status: 'resolved', closed: true, outcome: outcome('overturned', 'Appeal overturned', req) });
    } else if (status === 'partover') {
      const n = o.approved != null && o.approved !== '' ? Math.round(+o.approved) : NaN;
      if (isFinite(n) && n > orig && n <= req) {
        withUnits(n, n >= req ? 'approved' : 'partial', 'Payer partially overturned the decision: ' + n + ' of ' + req + ' units approved');
        Object.assign(w, { status: 'resolved', closed: true, outcome: outcome('overturned', 'Appeal partially overturned', n) });
      } else {
        A.set(cid, 'partial', { action: 'Payer partially overturned the decision; approved units to record', by, doc });
        Object.assign(w, { status: 'resolved', closed: true, unitsPending: true, outcome: outcome('overturned', 'Appeal partially overturned', null) });
      }
    } else if (status === 'upheld') {
      A.set(cid, base, Object.assign({ action: 'Payer upheld the decision' + (r.decided ? ' (' + orig + ' of ' + req + ' units)' : ''), by, doc }, r.decided ? { patch: Object.assign({ approved5: orig }, legacyUnits(r, orig, base)) } : {}));
      Object.assign(w, { status: 'upheld', closed: false, outcome: outcome('upheld', 'Appeal upheld', r.decided ? orig : null) });
    } else if (status === 'closed') {
      if (['appeal', 'recon'].includes(A.status(cid))) A.set(cid, base, { action: 'Denial Intelligence case closed', by, doc });
      Object.assign(w, { status: 'closed', closed: true });
    } else if (status === 'submitted' || status === 'awaiting') {
      if (r.kind === 'info') { if (A.status(cid) === 'info') A.set(cid, 'pending', { action: 'Reply sent to ' + r.payerShort + ' (simulated)', by, doc }); }
      else if (path !== 'p2p') {
        const ap = path === 'recon' ? 'recon' : 'appeal';
        if (A.status(cid) !== ap) A.set(cid, ap, { action: (ap === 'recon' ? 'Reconsideration' : 'Appeal') + ' submitted to ' + r.payerShort + ' (simulated)', by, doc });
        w.status = ap === 'recon' ? 'recon' : 'appeal'; w.option = w.option || ap;
      }
      w.closed = false;
    } else if (FINAL.includes(prev) || ['approved', 'appeal', 'recon', 'pending'].includes(A.status(cid))) {
      /* back to an open status: the payer's decision as recorded */
      if (A.status(cid) !== base || (r.decided && A.units(cid).approved !== orig)) A.set(cid, base, Object.assign({ action: 'Denial Intelligence: back to ' + DSm().label(status), by, doc }, r.decided ? { patch: Object.assign({ approved5: orig }, legacyUnits(r, orig, base)) } : {}));
      Object.assign(w, { status: r.d.status, closed: false, outcome: null });
    }
    PSY.save();
  }
  if (DSm()) DSm().propagate = propagate;

  PSY.di = {
    TODAY, DAY, SHORT, MON_NAME, ISSUE, ST, OUTCOMES, P2P_OUT, css, SHARED, ME, SYS,
    parseDate, dayDiff, dateLabel, addDays, inDays,
    list, get, byCase, closedForCase, view, options, optDefs, docsFor, docState, docText, DOC_NAME, DOC_TITLES, builders, disputeEvents, p2pOf, appealBy,
    choose, pick, reopen, genDoc, editDoc, editLogged, reviewDoc, prepDoc, p2pSave, p2pOutcome, resolve, sendReply, event, clean,
    stDef, stBadge, chip, plural, unitWord, rvaHtml, ruleChips, deadlineHtml, simChip, esc,
    /* round 9: Denial Intelligence records, dashboard metrics, patterns, the resolution status */
    records, claims, metrics, patterns, docGaps, statusBadge, propagate,
    SHOW: SHOW.map((x) => [x[0], x[1]]), DATES, KIND_LABEL, SEED_STATUS, FINAL, THEMES, DOC_TOPICS,
    /* round 11: the list's filter set */
    queue, TYPES, DEADLINES, NEXT_STEPS, STATUS_OPTS, nextGroup, statusKey,
    /* round 13: the decision-date range (from / to in queue) and its shortcuts */
    DATE_PRESETS, dateBetween, isoOf,
    /* kept for screens that still call them; no likelihood figures anywhere */
    chance: () => null,
    open: () => records({ group: 'all' }).filter((r) => r.open), // the sidebar badge: the open rows of the list the role sees (claims included)
    rows: () => list(),
    row: (cid) => byCase(cid),
  };
})();
