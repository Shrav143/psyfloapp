/* Shared helpers for the Psyflo platform pages (Authorizations, its case pages, Settings, Help).
   PSY.p1.css      common styles in the v01_2 look (prefix p1-), added to every page through a getter
   deadline(id) + dlHtml (every deadline with its source), unitsOf(id), disputeOf/decisionRoute/diRoute (Denial Intelligence),
   enhance attrs (Lauris with Scan & Enhance), nextAction(id), submissionOf(id). All derived from PSY.auth / PSY.data.r5 / PSY.state.
   Round 8: role scope (assignee, inScope, visibleCase) and the case crumbs ("All Authorizations / <initials>" since round 11).
   Round 9: scope reads the caseload (PSY.caseInCaseload); every payer decision links to Denial Intelligence (diRoute: di-case?case=);
   units and deadlines read PSY.diStatus, so an appeal overturned there shows Approved with the units restored.
   No state of its own except PSY.state.prefs (notify, lowDays) and boxes['p1.*'] flags. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const P = (PSY.p1 = PSY.p1 || {});

  P.css = `
  .psy-root [hidden]{display:none!important}
  .p1-eye{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:#8A857B}
  .p1-mut{color:#6B665E}.p1-sm{font-size:13px}.p1-ink{color:#1B1B19}
  .p1-lk{white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-weight:600;color:#1D4F43;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
  .p1-lk:hover{text-decoration:underline;color:#17403A}.p1-lk.m{color:#6B665E;font-weight:500}.p1-lk.m:hover{color:#8A2E1C}
  .p1-fcs{display:flex;gap:10px;flex-wrap:wrap}
  .p1-fc{display:inline-flex;align-items:center;gap:9px;height:42px;padding:0 17px;border:1px solid #E5DCD0;background:#fff;border-radius:999px;font:inherit;font-size:14px;color:#1B1B19;cursor:pointer;white-space:nowrap}
  .p1-fc b{font-size:17px;font-weight:600;font-family:'Newsreader',Georgia,serif}
  .p1-fc:hover{border-color:#C9BBA8}
  .p1-fc.on{border-color:#1D4F43;box-shadow:inset 0 0 0 1px #1D4F43;color:#1D4F43;font-weight:600}
  .p1-fx{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 12px;border-radius:999px;background:#E3EFEA;color:#1D4F43;font-size:13px;font-weight:600}
  .p1-fx button{width:22px;height:22px;border-radius:50%;border:0;background:rgba(29,79,67,.12);color:#1D4F43;cursor:pointer;font:inherit;font-size:14px;line-height:1;padding:0}
  .p1-fb{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  .p1-search{position:relative;flex:1 1 280px;max-width:430px}
  .p1-search svg{position:absolute;left:13px;top:12px;width:16px;height:16px;color:#8A857B;pointer-events:none}
  .p1-search input{width:100%;padding-left:38px}
  .p1-ct{display:flex;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid #EFE8DE;font-size:13.5px}
  .p1-ct b{font-weight:600}.p1-ct .sp{flex:1}
  .p1-tw{overflow:hidden;padding:0}
  table.p1-t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13.5px}
  .p1-t th{text-align:left;padding:12px 14px;border-bottom:1px solid #EFE8DE;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B665E;font-weight:600;white-space:nowrap}
  .p1-t th:first-child,.p1-t td:first-child{padding-left:22px}.p1-t th:last-child,.p1-t td:last-child{padding-right:22px}
  .p1-t th button{background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
  .p1-t th button:hover,.p1-t th button.on{color:#1D4F43}
  .p1-t th button i{font-style:normal;opacity:.55;font-size:12px}.p1-t th button.on i{opacity:1}
  .p1-t td{padding:14px;border-top:1px solid #EFE8DE;vertical-align:middle}
  .p1-t tbody tr:first-child td{border-top:0}
  .p1-t tbody tr:hover td{background:#FCF9F5}
  .p1-id{font-weight:600;color:#1B1B19;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C9BBA8;cursor:pointer}
  .p1-id:hover{color:#1D4F43;text-decoration-color:#1D4F43}
  .p1-clk{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:4px 11px;font-size:12.5px;font-weight:600;background:#EFE8DE;color:#4A453D;line-height:1.3}
  .p1-clk:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 6px}
  .p1-clk.r{background:#F6DDD6;color:#8A2E1C}.p1-clk.y{background:#F6E7C8;color:#6F4A05}.p1-clk.g{background:#E3EFEA;color:#1D4F43}
  .p1-pct{font-weight:600;font-size:14px}.p1-pct.g{color:#1D4F43}.p1-pct.y{color:#8A5A00}.p1-pct.r{color:#A83A1F}
  .p1-empty{padding:34px 22px;text-align:center;color:#6B665E}
  .p1-tabs{display:flex;gap:30px;border-bottom:1px solid #E5DCD0;flex-wrap:wrap}
  .p1-tab{background:none;border:0;padding:12px 0;font:inherit;font-size:14.5px;color:#6B665E;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;gap:8px;align-items:center}
  .p1-tab:hover{color:#1B1B19}.p1-tab.on{color:#1D4F43;border-bottom-color:#1D4F43;font-weight:600}
  .p1-tab .n{background:#EFE8DE;color:#4A453D;border-radius:999px;min-width:22px;height:22px;padding:0 7px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
  .p1-sw{position:relative;width:44px;height:26px;border-radius:99px;background:#D9D2C6;border:0;cursor:pointer;padding:0;flex:0 0 44px;transition:background .15s}
  .p1-sw:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
  .p1-sw.on{background:#1D4F43}.p1-sw.on:after{transform:translateX(18px)}
  .p1-sw:focus-visible,.p1-fc:focus-visible,.p1-tab:focus-visible,.btn:focus-visible{outline:2px solid #1D4F43;outline-offset:2px}
  .p1-ic{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#E3EFEA;color:#1D4F43;flex:0 0 36px}
  .p1-ic svg{width:18px;height:18px}
  .p1-note{display:flex;gap:12px;align-items:center;background:#F2EAE1;border-radius:14px;padding:14px 18px;font-size:14px}
  .p1-note.g{background:#EEF5F1;border:1px solid #D5E5DC}
  .p1-note.y{background:#FBF3DF;border:1px solid #F0DFB4}
  .p1-note b{font-weight:600}.p1-note .sp{flex:1}
  .p1-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#2F8F5B;margin-right:7px}
  .p1-dot.y{background:#C99A2E}.p1-dot.r{background:#C2410C}.p1-dot.n{background:#B8AFA2}
  .p1-dl{position:relative;display:inline-flex;flex-direction:column;gap:1px;cursor:help;border-radius:6px;outline-offset:3px;max-width:100%}
  .p1-dl b{font-weight:600;font-size:13.5px;border-bottom:1px dotted #9A9388;align-self:flex-start;line-height:1.3}
  .p1-dl small{font-size:12px;color:#6B665E;line-height:1.35}
  .p1-dl.t-r b{color:#8A2E1C}.p1-dl.t-y b{color:#6F4A05}
  .p1-dl.na{font-size:12.5px;color:#6B665E;border-bottom:1px dotted #9A9388;display:inline;align-self:flex-start}
  .p1-tip{display:none;position:absolute;left:0;top:calc(100% + 6px);width:250px;background:#1B1B19;color:#fff;border-radius:8px;padding:9px 11px;font-size:12px;font-weight:400;line-height:1.45;z-index:30;text-align:left;white-space:normal;box-shadow:0 6px 18px rgba(0,0,0,.18)}
  .p1-dl .p1-tip b{color:#fff;border:0;font-size:12px;display:inline}
  .p1-dl:hover .p1-tip,.p1-dl:focus .p1-tip,.p1-dl:focus-within .p1-tip{display:block}
  .p1-dl:focus-visible{outline:2px solid #1D4F43}
  `;

  const SVG = (p, w) => '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  P.svg = SVG;
  P.icons = {
    search: SVG('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
    refresh: SVG('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'),
    check: SVG('<path d="M5 12.5l4.2 4.2L19 7"/>', 14),
    arrow: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', 15),
    ext: SVG('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', 15),
    link: SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', 16),
    chev: SVG('<path d="M6 9l6 6 6-6"/>', 16),
    lock: SVG('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 16),
    doc: SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', 18),
    db: SVG('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>', 18),
    mic: SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', 18),
    clock: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', 18),
    pen: SVG('<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/>', 18),
    shield: SVG('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2.2 2.2L15 10"/>', 18),
    mail: SVG('<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 8l8 6 8-6"/>', 18),
    phone: SVG('<path d="M6 4h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2L15 12.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z"/>', 18),
    fax: SVG('<path d="M7 9V4h8l2 2v3M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/>', 18),
  };

  /* the short safety label on submission and eligibility steps */
  P.simChip = () => '<span class="st5 t-blue" title="Simulated: nothing is sent to a payer"><i aria-hidden="true">◇</i>Simulated</span>';

  /* ---- data helpers ---- */
  P.chip = (tone, text, attr) => '<span class="chip ' + tone + '"' + (attr || '') + '>' + esc(text) + '</span>';
  P.lowDays = () => { const v = +((PSY.state.prefs || {}).lowDays); return v > 0 ? v : 10; };

  /* ================= one reading of an authorization for Authorizations and its case pages =================
     Everything below reads shared state (PSY.auth, PSY.data.r5, PSY.state); nothing is stored here. */
  const AU = () => PSY.auth;
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const TODAY = Date.UTC(2026, 9, 29); // PSY.data.today: Thu, Oct 29, 2026
  /* 'Nov 13', 'Oct 29, 5:40 pm', 'Dec 9, 2:00 pm' → a UTC day. Jul–Dec read as 2026, Jan–Jun as 2027 (the demo's school year). */
  P.dateOf = (s) => { const m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,\s*(20\d\d))?/.exec(String(s || '')); if (!m) return null; const mo = MON[m[1]]; return Date.UTC(m[3] ? +m[3] : mo >= 6 ? 2026 : 2027, mo, +m[2]); };
  P.daysUntil = (s) => { const t = P.dateOf(s); return t == null ? null : Math.round((t - TODAY) / 864e5); };
  P.relDays = (n) => (n == null ? '' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n < 0 ? -n + ' days ago' : 'in ' + n + ' days');

  /* the next dated deadline of a case, always with its source; null when none is on file (shown as "Deadline not verified") */
  const WHAT = { info: 'Reply to the payer’s request', partial: 'Peer-to-peer call', reduction: 'Reply to the payer’s offer', denial: 'Appeal deadline' };
  P.deadline = (id) => {
    const A = AU(); const st = A.status(id); const m = A.meta(id); const d = m.decision || {}; const u = A.units(id);
    const mk = (date, what, src) => { const n = P.daysUntil(date); return { date, what, src, days: n, tone: n == null ? 'n' : n <= 1 ? 'r' : n <= 7 ? 'y' : 'n' }; };
    const dsp = P.disputeOf(id); const settled = (dsp && P.disputeClosed(dsp)) || P.diResolved(id); // a closed or resolved dispute has no payer deadline left
    if (['info', 'partial', 'denied', 'recon', 'appeal'].indexOf(st) >= 0 && !settled) {
      /* the dispute's own next deadline (a booked call replaces the reply date), so the list and the decision page agree */
      let r = null; try { r = PSY.di && PSY.di.byCase ? PSY.di.byCase(id) : null; } catch (e) { r = null; } const x = r && !r.isClaim ? r.deadline : null;
      if (x && x.ms != null) return mk(x.label, x.sub ? x.sub.charAt(0).toUpperCase() + x.sub.slice(1) : 'Payer deadline', x.src || 'Payer correspondence on file');
      if (d.due) return mk(d.due, WHAT[d.type] || 'Payer deadline', d.dueSrc || 'Payer correspondence on file');
    }
    if (id === 'R-0416' && ['draft', 'review', 'ready'].indexOf(st) >= 0 && PSY.flowRank() >= 2) { // intake (CNA) done Oct 20
      const r = PSY.rules && PSY.rules.byId('init-30');
      return mk('Nov 19', 'Initial SRA due', 'Intake Oct 20 + 30 days. ' + (r ? r.source : 'Harvest-reported practice.'));
    }
    const x = P.unitsOf(id);
    if (x.end && (u.current || st === 'approved') && st !== 'closed') return mk(x.end, 'Current authorization ends', 'End date of ' + (m.ref || 'the current authorization') + (u.current ? ' in Lauris · Authorizations' : ' · approved period'));
    return null;
  };
  /* a deadline cell: the date, what it is, and the source on hover or keyboard focus */
  P.dlHtml = (dl, none) => {
    if (!dl) return '<span class="p1-dl na" tabindex="0">Deadline not verified<span class="p1-tip" role="tooltip"><b>No dated deadline on file.</b>' + (none ? ' ' + esc(none) : '') + '</span></span>';
    return '<span class="p1-dl t-' + dl.tone + '" tabindex="0"><b>' + esc(dl.date) + '</b><small>' + esc(dl.what) + (dl.days != null ? ' · ' + P.relDays(dl.days) : '') + '</small>' +
      '<span class="p1-tip" role="tooltip"><b>Source.</b> ' + esc(dl.src) + '</span></span>';
  };

  /* one compact line "Dec 9 · in 41 days" with what it is and its source on hover or keyboard focus */
  P.dlLine = (dl) => {
    if (!dl) return '<span class="p1-dl na" tabindex="0">Deadline not verified<span class="p1-tip" role="tooltip"><b>No dated deadline on file.</b></span></span>';
    return '<span class="p1-dl al-dl t-' + dl.tone + '" tabindex="0" data-dl="' + (dl.days != null ? dl.days : '') + '"><b>' + esc(dl.date.replace(/,? \d{1,2}:\d\d [ap]m$/, '')) + (dl.days != null ? ' · ' + P.relDays(dl.days) : '') + '</b>' +
      '<span class="p1-tip" role="tooltip"><b>' + esc(dl.what) + '.</b> Source: ' + esc(dl.src) + '</span></span>';
  };
  /* the next deadline that asks for an action (a payer reply, a call, an appeal); the end of the authorization in force is the Ends column */
  P.actionDeadline = (id) => { const dl = P.deadline(id); return dl && dl.what !== 'Current authorization ends' ? dl : null; };

  /* resolution in Denial Intelligence (PSY.diStatus): a resolved case has no payer deadline left */
  P.RESOLVED = ['overturned', 'partover', 'upheld', 'closed'];
  P.diState = (id) => (PSY.diStatus && PSY.diStatus.get ? PSY.diStatus.get(id) : 'new');
  P.diResolved = (id) => P.RESOLVED.indexOf(P.diState(id)) >= 0;
  /* the units of the authorization a row tracks: requested / approved / remaining, worded per status.
     Approved after a payer decision (an appeal overturned in Denial Intelligence): the requested units and period, unless Denial
     Intelligence recorded another number (approved5); the units restored add to what is left on the authorization in force.
     Approved without a decision: the authorization in force (its period, its award, what is left). */
  P.unitsOf = (id) => {
    const A = AU(); const st = A.status(id); const u = A.units(id); const c = PSY.caseView(id) || {}; const m = A.meta(id); const s = PSY.state.cases[id] || {};
    let req = u.requested, appr = u.approved, period = u.period, word = 'approved';
    const cur = u.current ? Object.assign({}, u.current) : null;
    let remaining = cur ? cur.remaining : null, authorized = cur ? cur.authorized : null, end = cur ? cur.end : null, remEnd = end;
    if (st === 'approved' && m.decision) {
      if (s.approved5 == null) appr = req;
      const inForce = !!(cur && m.current && m.current.authorized === m.decision.approved); // the decision is the authorization in force (T.N.)
      if (inForce && appr != null && appr > authorized) { remaining += appr - authorized; authorized = appr; }
      if (!cur && appr != null) { remaining = appr; authorized = appr; } // a new authorization: nothing used yet
      end = (/–\s*(.+)$/.exec(period || '') || [])[1] || end;
      if (inForce || !cur) remEnd = end; // what is left runs to the end of the approved period
    } else if (st === 'approved' && cur) {
      appr = cur.authorized; req = (c.units && c.units.req) || req; period = cur.start + ' – ' + cur.end;
    }
    if (['draft', 'review', 'ready', 'submitted', 'pending', 'info'].indexOf(st) >= 0) appr = null; // no decision on this request yet
    if (st === 'denied' && appr == null) appr = 0;
    if (st === 'partial' && m.decision && m.decision.type === 'reduction') word = 'offered';
    return { req, appr, word, period, cur, remaining, authorized, end, remEnd, un: u.service.units, svc: u.service, daysLeft: cur && cur.perDay ? Math.ceil(remaining / cur.perDay) : null };
  };

  /* the dispute behind a case (a payer decision being worked), and the page where it opens */
  P.disputeOf = (caseId) => ((PSY.data.r5 && PSY.data.r5.disputes) || []).find((d) => d.case === caseId && d.group === 'auth') || null;
  P.disputeClosed = (d) => { const x = (PSY.state.disputes5 || {})[d.id] || {}; return !!(x.closed || x.status === 'closed'); };
  P.DECISION = ['partial', 'denied', 'info', 'recon', 'appeal'];
  P.isDecision = (caseId) => P.DECISION.indexOf(AU().status(caseId)) >= 0;
  /* round 9: every payer decision (partial, denial, information request, reconsideration, appeal) is worked in Denial Intelligence,
     on its workspace di-case?case=<caseId> (owner DI-2). Authorizations only links there. */
  P.diRoute = (caseId) => 'di-case?case=' + caseId;
  /* a case with a payer decision on file (being worked, or resolved in Denial Intelligence) */
  P.hasDecision = (caseId) => P.isDecision(caseId) || !!AU().meta(caseId).decision;
  P.decisionRoute = (caseId) => (P.hasDecision(caseId) ? P.diRoute(caseId) : null);
  /* "Review in Lauris": the consumer's Lauris page with Scan & Enhance (PSY.enhance.openFor); the Lauris consumer page if it is missing */
  P.enhanceAttrs = (caseId) => 'data-act="d8-enhance" data-case="' + esc(caseId) + '"';
  P.laurisId = (caseId) => AU().meta(caseId).laurisId || ((PSY.data.lauris && PSY.data.lauris.byCase(caseId)) || {}).id || '';
  P.openInLauris = (caseId) => {
    if (PSY.enhance && typeof PSY.enhance.openFor === 'function') { try { PSY.enhance.openFor(caseId); return; } catch (e) { console.error('enhance.openFor', e); } }
    const lid = P.laurisId(caseId); PSY.go(lid ? 'lauris-consumer?c=' + lid : 'lauris-consumers');
  };
  PSY.acts['d8-enhance'] = (el) => P.openInLauris(el.getAttribute('data-case'));
  PSY.acts['d8-open-case'] = (el) => PSY.openCase(el.getAttribute('data-case'));

  /* ---- role scope (round 9): the caseload from the foundation (PSY.caseInCaseload): licensed staff see their own consumers (the
     clinician on the Lauris Case Load), the admin sees all. A payer decision is still listed in Authorizations without the Denial
     Intelligence feature (tracking); only the link to Denial Intelligence needs it. ---- */
  P.assignee = (caseId) => { const lc = PSY.data.lauris && PSY.data.lauris.byCase(caseId); return (lc && lc.staff) || ''; };
  P.assigneeName = (caseId) => { const s = P.assignee(caseId); const L = PSY.data.lauris; const x = L && L.staff ? Object.values(L.staff).find((v) => v.short === s) : null; return (x && x.name) || s; };
  P.me = () => (PSY.lauris && PSY.lauris.user && PSY.lauris.user.short) || '';
  P.allScope = () => PSY.can('allConsumers');
  P.inScope = (caseId) => (PSY.caseInCaseload ? PSY.caseInCaseload(caseId) : P.allScope() || P.assignee(caseId) === P.me());
  P.denialsOk = () => PSY.can('denials');
  P.visibleCase = (caseId) => P.inScope(caseId);
  /* breadcrumbs of a case page: All Authorizations / <initials> (area 'di': Denial Intelligence / <initials>) */
  P.crumbs = (caseId, area) => { const c = PSY.caseView(caseId); const top = area === 'di' ? { label: 'Denial Intelligence', go: 'denials' } : { label: 'All Authorizations', go: 'auth-list' }; return [top, { label: esc(c ? c.ini : caseId) }]; };
  /* a case page the role may not open (o.area 'di' for the Denial Intelligence pages) */
  P.noAccess = (caseId, what, o) => {
    const di = o && o.area === 'di';
    return PSY.platform.page({ active: di ? 'di' : 'auth', crumbs: P.crumbs(caseId, di ? 'di' : ''), title: 'No access', body: '<div class="pf-noacc" data-psy="noaccess"><b>No access</b><span>' + esc(what || 'All Authorizations') + '</span><button type="button" class="btn o" data-go="' + (di ? 'denials' : 'auth-list') + '">Back to ' + (di ? 'Denial Intelligence' : 'All Authorizations') + '</button></div>' });
  };
  /* why a role may not open a case page: the feature (default Authorizations), or the consumer is not on its caseload */
  P.blocked = (caseId, feature) => {
    const f = feature || 'auth';
    if (!PSY.can(f)) return f === 'denials' ? 'Denial Intelligence' : f === 'auth' ? 'All Authorizations' : f;
    return caseId && PSY.caseById(caseId) && !P.inScope(caseId) ? 'Not on your caseload' : '';
  };

  /* the one next action of a case: a payer decision opens Denial Intelligence; a draft or a renewal opens Lauris with Scan & Enhance
     (licensed staff); the admin, without Scan & Enhance, sees where the work is (no button) */
  P.renewalDue = (caseId) => !!(PSY.dash && PSY.dash.ov && PSY.dash.ov.isRenewalDue && PSY.dash.ov.isRenewalDue(caseId));
  P.nextAction = (caseId) => {
    const A = AU(); const st = A.status(caseId);
    const enh = PSY.can('enhance');
    if (!A.visible(caseId)) { const lid = P.laurisId(caseId); return { label: 'Open in Lauris', attrs: 'data-go="lauris-consumer?c=' + esc(lid) + '"', primary: false }; }
    if (P.DECISION.indexOf(st) >= 0) {
      if (!P.denialsOk()) return { label: 'Payer decision', text: true };
      return { label: 'Open in Denial Intelligence', attrs: 'data-go="' + esc(P.diRoute(caseId)) + '" data-psy="open-di"', primary: ['recon', 'appeal'].indexOf(st) < 0, decision: true };
    }
    if (st === 'ready') return enh ? { label: 'Submit in Lauris', attrs: P.enhanceAttrs(caseId), primary: true } : { label: 'Ready to submit in Lauris', text: true };
    if (['draft', 'review'].indexOf(st) >= 0) return enh ? { label: 'Review in Lauris', attrs: P.enhanceAttrs(caseId), primary: true } : { label: 'Clinician review in Lauris', text: true };
    if (P.renewalDue(caseId)) return enh ? { label: 'Prepare in Lauris', attrs: P.enhanceAttrs(caseId), primary: true, renewal: true } : { label: 'Concurrent SRA due', text: true, renewal: true };
    if (['submitted', 'pending'].indexOf(st) >= 0) return { label: 'Awaiting payer decision', text: true };
    return null;
  };
  /* where a submission went: the record written by the extension (submission5), or what the demo data holds */
  P.submissionOf = (caseId) => {
    const s = (PSY.state.cases[caseId] || {}).submission5; if (s) return Object.assign({ live: true }, s);
    const m = AU().meta(caseId); if (m.submitted) return { method: m.submitted.via, ref: m.submitted.ref, date: m.submitted.date };
    const c = PSY.caseView(caseId) || {}; const n = /^(.+?)\s*·\s*ref\s+(\S+)/.exec(c.sendNote || ''); if (n) return { method: n[1], ref: n[2], date: '' };
    return null;
  };

})();
