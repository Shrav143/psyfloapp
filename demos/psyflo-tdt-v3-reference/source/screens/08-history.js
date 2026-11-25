/* Round 13 (owner HIST13): PSY.hist — the History dropdown (authorization and denial steps, who did each one, pop-ups).
   Event: { id, case, scope: 'auth'|'denial', ts: 'YYYY-MM-DDTHH:MM', actor: { kind, name }, action, detail?, ref?, sim?,
            pop?: { kind: 'call'|'doc'|'letter'|'submission'|'note'|'analysis', id, title?, facts?: [[label, value]], quote?, go?, goLabel? } }
   Actor kinds (one small tag on the right of each row): voice (Voice agent) · agent (Psyflo agent) · psyflo (Psyflo AI) ·
   staff (Staff · <name>) · lauris (From Lauris) · payer (Payer).
     PSY.hist.list(caseId, { scope, actor })      events newest first: backdated seed + live events + the case's PSY.audit entries
     PSY.hist.add(ev)                             → POST /cases/:case/history → Promise<event>; open History blocks update in place
     PSY.hist.html(caseId, { scope, title='History', open=false, bare=false, limit })  the collapsible History block (render-safe)
     PSY.hist.open(caseId, eventId)               opens the event's pop-up (a call opens the voice-call pop-up)
     PSY.hist.tag(kind, name?) · PSY.hist.ACTORS  the tag html and the legend
   Seed history is written from the demo's own records (02-core-data, 20-case-data, Lauris documents, 50-denials-util); nothing
   here invents a payer rule, a deadline, a rate or a phone number. Simulated steps carry sim:true (a Simulated chip). */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const H = (PSY.hist = PSY.hist || {});
  const API = PSY.api;
  const A = () => PSY.auth;
  const SYS = 'Psyflo (system)';

  /* ---------------- actors ---------------- */
  H.ACTORS = {
    voice: { label: 'Voice agent', i: '☏', legend: 'Psyflo’s phone agent: it calls the payer and records what was said' },
    agent: { label: 'Psyflo agent', i: '⚙', legend: 'Automated work by Psyflo: portal or fax submission, status checks, document pulls' },
    psyflo: { label: 'Psyflo AI', i: '✦', legend: 'Drafts, analysis and recommendations; always reviewed by a clinician' },
    staff: { label: 'Staff', i: '●', legend: 'A person at Harvest' },
    lauris: { label: 'From Lauris', i: '▤', legend: 'Read from Lauris: signed forms, sessions, authorization records' },
    payer: { label: 'Payer', i: '✉', legend: 'From the plan: letters, decisions, portal messages, calls' },
  };
  H.ORDER = ['voice', 'agent', 'psyflo', 'staff', 'lauris', 'payer'];
  /* "Jordan Perez, LPC" → "J. Perez"; a role or team ("Site supervisor", "Harvest staff") stays as written */
  const shortName = (n) => { n = String(n || ''); return /^[A-Z][a-z]+ [A-Z][a-z'-]+(,|$)/.test(n) && !/supervisor|staff|team|billing|office|front desk|counselor/i.test(n) ? n.replace(/^(\w)\w+\s+/, '$1. ') : n; };
  H.tag = (kind, name) => {
    const a = H.ACTORS[kind] || H.ACTORS.agent;
    const text = kind === 'staff' && name ? 'Staff · ' + shortName(name).replace(/,.*$/, '') : a.label;
    const tip = kind === 'staff' && name ? name + ' · ' + a.legend : a.legend;
    return '<span class="hx-tag k-' + esc(kind) + '" data-actor="' + esc(kind) + '" title="' + esc(tip) + '"><i aria-hidden="true">' + a.i + '</i>' + esc(text) + '</span>';
  };

  /* ---------------- time ---------------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const two = (n) => String(n).padStart(2, '0');
  H.TODAY = '2026-10-29';
  /* 'Oct 29 · 10:42 am' / 'Oct 22' / '10:42 am' → 'YYYY-MM-DDTHH:MM' (the demo spans Jan 2026 – Jun 2027) */
  H.toTs = (s, dflt) => {
    s = String(s || ''); const m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})/.exec(s);
    const t = /(\d{1,2}):(\d\d)\s*([ap]m)/i.exec(s);
    let date = H.TODAY;
    if (m) { const mo = MON.indexOf(m[1]); date = (mo <= 5 && /2027/.test(s) ? 2027 : 2026) + '-' + two(mo + 1) + '-' + two(+m[2]); }
    const hh = t ? (+t[1] % 12) + (/p/i.test(t[3]) ? 12 : 0) : null;
    return date + 'T' + (t ? two(hh) + ':' + t[2] : (dflt || '09:00'));
  };
  H.dateLabel = (ts) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(ts || ''); return m ? MON[+m[2] - 1] + ' ' + (+m[3]) : ''; };
  H.timeLabel = (ts) => { const m = /T(\d\d):(\d\d)/.exec(ts || ''); if (!m) return ''; const h = +m[1]; return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'am' : 'pm'); };
  H.when = (ts) => H.dateLabel(ts) + (H.timeLabel(ts) ? ', ' + H.timeLabel(ts) : '');
  H.nowTs = () => H.toTs('Oct 29 · ' + PSY.now());
  let SEQ = 0; const seq = () => Date.now() * 100 + (SEQ++ % 100);

  /* every audit entry gets an order key, so live events and audit entries interleave correctly (both read 10:42 am) */
  if (PSY.audit && !PSY.audit.add.__h13) {
    const add0 = PSY.audit.add;
    PSY.audit.add = function (e) { const ev = add0.apply(this, arguments); if (ev && typeof ev === 'object') { ev.seq = seq(); if (e && e.hist) ev.hist = e.hist; } return ev; };
    PSY.audit.add.__h13 = true;
  }

  /* ---------------- state ---------------- */
  const live = () => { const s = PSY.state; s.hist13 = s.hist13 || { ev: [], ui: {} }; s.hist13.ev = s.hist13.ev || []; s.hist13.ui = s.hist13.ui || {}; return s.hist13; };

  /* ---------------- seed (backdated) history: filled in by H.SEED[caseId](ctx) → [events] ---------------- */
  H.SEED = H.SEED || {};
  function seedOf(cid) {
    const f = H.SEED[cid]; let out = [];
    if (typeof f === 'function') { try { out = f(cid) || []; } catch (e) { console.error('hist seed', cid, e); out = []; } }
    else out = fallbackSeed(cid);
    return out.map((e, i) => Object.assign({ case: cid, seed: true, ord: i }, e, { id: e.id || ('h-' + cid + '-' + two(i)) }));
  }
  /* until a case has its own seed: the authorization timeline's seeded events */
  function fallbackSeed(cid) {
    const tl = A() && A().timeline ? A().timeline(cid).filter((e) => e.seed) : [];
    return tl.map((e) => ({ scope: 'auth', ts: H.toTs(e.t), actor: { kind: e.by === SYS ? 'psyflo' : /voice agent/i.test(e.by) ? 'voice' : /Psyflo agent/i.test(e.by) ? 'agent' : 'staff', name: e.by === SYS || /Psyflo/.test(e.by) ? '' : 'Harvest staff' }, action: e.action }));
  }

  /* ---------------- audit → events ---------------- */
  const ROLE_NAMES = () => { const out = {}; Object.values(PSY.ROLES || {}).forEach((r) => { out[r.name] = r.name; out[r.staff] = r.name; out[r.lauris] = r.name; }); return out; };
  /* who did an audited action: the payer's answer recorded by staff → Payer; a simulated send / sync / check → Psyflo agent;
     an analysis or draft (even when a person asked for it) → Psyflo AI; anything else a person did → Staff */
  const PAYER_RE = /^Payer\b/;
  const AGENT_RE = /\bsimulated\b|^Synced|^Monitoring|validation|PDF saved|eligibility check|read from (Availity|Lauris)/i;
  const AI_RE = /(analy[sz]ed|generated|identified|drafted|draft prepared|assembled|^Scanned|laid out|flagged|suggested)/i;
  const HUMAN_RE = /(approv|signed|sent to forms|received|recorded|confirmed|accepted|reviewed|edited|closed|reopened|marked)/i;
  const DEN_RE = /denial intelligence|appeal|peer-to-peer|reconsideration|dispute|denial|resolution|overturn|upheld|documentation request|additional documentation|payer decision|offer|accepted|reply sent|DI-\d|CL-\d|claim/i;
  function actorOfAudit(e) {
    const by = String(e.by || ''); const a = String(e.action || ''); const sys = !by || by === SYS || /^psyflo(?! voice)/i.test(by);
    if (/voice agent/i.test(by)) return { kind: 'voice', name: '' };
    if (PAYER_RE.test(a)) return { kind: 'payer', name: '' };
    if (/^lauris/i.test(by)) return { kind: 'lauris', name: '' };
    if (AGENT_RE.test(a)) return { kind: 'agent', name: '', by: sys ? '' : by };
    if (AI_RE.test(a) && !HUMAN_RE.test(a)) return { kind: 'psyflo', name: '', by: sys ? '' : by };
    if (sys) return { kind: 'agent', name: '' };
    return { kind: 'staff', name: ROLE_NAMES()[by] || by };
  }
  function hasDenial(cid) { try { return !!(PSY.di && PSY.di.byCase && PSY.di.byCase(cid)); } catch (e) { return false; } }
  function auditOf(cid) {
    const den = hasDenial(cid);
    return (PSY.state.audit || []).filter((e) => e.case === cid && !e.hist).map((e, i) => {
      const scope = den && (DEN_RE.test(e.action) || /^(DI|CL)-/.test(e.doc || '')) ? 'denial' : 'auth';
      const who = actorOfAudit(e);
      const facts = [[who.by ? 'Requested by' : 'Recorded by', e.by || PSY.r5.ME]].concat(e.doc ? [['Document', e.doc]] : []).concat(e.status && A() ? [['Status after', A().label(e.status)]] : []);
      return { id: 'au-' + (e.seq || i) + '-' + i, case: cid, scope, ts: H.toTs(e.t, '10:42'), seq: e.seq || 0, actor: { kind: who.kind, name: who.name }, action: e.action,
        detail: [e.doc, e.status && A() ? A().label(e.status) : ''].filter(Boolean).join(' · '), audit: true, pop: { kind: 'note', id: 'au', title: 'Audit entry', facts } };
    });
  }

  /* ---------------- list ---------------- */
  const cmp = (a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : (b.seq || 0) - (a.seq || 0) || (b.ord || 0) - (a.ord || 0));
  /* every row opens a pop-up: an event without one gets a short note of its facts */
  const SRC = { voice: 'Psyflo voice agent (simulated)', agent: 'Psyflo automation', psyflo: 'Psyflo AI · clinician-reviewed', staff: 'Harvest staff', lauris: 'Lauris record', payer: 'Payer correspondence' };
  const withPop = (e) => (e.pop ? e : Object.assign({}, e, { pop: { kind: 'note', id: 'n-' + e.id, title: e.action, facts: [['Source', SRC[(e.actor || {}).kind] || '']] } }));
  /* round 13: a status echo from Denial Intelligence ("Denial Intelligence: Submitted · …") logged right next to the action that caused
     it is the same step: keep the action, drop the echo; a status change on its own reads "Status: …" */
  const DI_ECHO = /^Denial Intelligence: /;
  const dedupe = (list) => list.filter((x) => !(x.audit && DI_ECHO.test(x.action) && list.some((y) => y !== x && !DI_ECHO.test(y.action) && y.seq && x.seq && Math.abs(y.seq - x.seq) <= 2)))
    .map((x) => (x.audit && DI_ECHO.test(x.action) ? Object.assign({}, x, { action: x.action.replace(DI_ECHO, 'Status: ') }) : x));
  H.all = (cid) => dedupe(seedOf(cid).concat(live().ev.filter((e) => e.case === cid), auditOf(cid))).map(withPop);
  H.list = (cid, o) => {
    o = o || {};
    return H.all(cid).filter((e) => (!o.scope || !e.scope || e.scope === o.scope || e.scope === 'both') && (!o.actor || (e.actor && e.actor.kind === o.actor))).sort(cmp);
  };
  H.get = (cid, id) => H.all(cid).find((e) => e.id === id) || null;

  /* ---------------- add (through the demo backend) ---------------- */
  const KINDS = Object.keys({ voice: 1, agent: 1, psyflo: 1, staff: 1, lauris: 1, payer: 1 });
  function normalize(cid, b) {
    const ev = Object.assign({}, b);
    ev.case = cid; ev.scope = b.scope === 'denial' ? 'denial' : 'auth';
    ev.actor = typeof b.actor === 'string' ? { kind: b.actor } : Object.assign({}, b.actor || {});
    if (KINDS.indexOf(ev.actor.kind) < 0) throw API.error(400, 'actor.kind must be one of ' + KINDS.join(', '));
    if (ev.actor.kind === 'staff' && !ev.actor.name) ev.actor.name = (PSY.user && PSY.user().name) || PSY.r5.ME;
    if (!ev.action || typeof ev.action !== 'string') throw API.error(400, 'action is required');
    ev.ts = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(b.ts || '') ? b.ts : H.nowTs();
    ev.id = b.id || ('lv-' + Date.now().toString(36) + '-' + (SEQ++));
    ev.seq = seq(); ev.live = true;
    return ev;
  }
  API.route('GET', '/cases/:case/history', (q) => {
    const cid = q.params.case; if (!PSY.caseById(cid)) throw API.error(404, 'Unknown case: ' + cid);
    const sc = q.query.scope; if (sc && sc !== 'auth' && sc !== 'denial') throw API.error(400, 'scope must be auth or denial');
    return H.list(cid, { scope: sc || '', actor: q.query.actor || '' });
  }, { desc: 'History of a case (seed + live + audit), newest first; ?scope=auth|denial', owner: 'HIST13', summary: (d, q) => q.params.case + ' · ' + d.length + ' events' + (q.query.scope ? ' (' + q.query.scope + ')' : '') });
  API.route('POST', '/cases/:case/history', (q) => {
    const cid = q.params.case; if (!PSY.caseById(cid)) throw API.error(404, 'Unknown case: ' + cid);
    const ev = normalize(cid, q.body || {});
    if (live().ev.some((x) => x.id === ev.id)) throw API.error(409, 'Event already recorded: ' + ev.id);
    live().ev.push(ev); PSY.save();
    q.note(cid + ' · ' + H.ACTORS[ev.actor.kind].label + ' · ' + ev.action.slice(0, 60));
    return ev;
  }, { desc: 'Add an event to a case’s History', owner: 'HIST13' });
  H.add = (ev) => {
    ev = ev || {}; const cid = ev.case;
    return API.post('/cases/' + encodeURIComponent(cid || '') + '/history', ev).then((saved) => { H.update(cid); return saved; });
  };
  /* synchronous add for code that re-renders right away (same validation, logged as the same POST) */
  H.addNow = (ev) => { const saved = API.call('POST', '/cases/' + encodeURIComponent((ev || {}).case || '') + '/history', ev); H.update(saved.case); return saved; };

  /* ---------------- render ---------------- */
  const ui = () => live().ui;
  const keyOf = (cid, scope) => cid + '|' + (scope || 'all');
  const VIEW = (txt) => '<span>' + esc(txt) + '</span>';
  function row(e) {
    const a = e.actor || { kind: 'agent' }; const hasPop = !!e.pop;
    const sim = e.sim ? '<span class="hx-sim" title="Simulated in this demo">Simulated</span>' : '';
    return '<li class="hx-r" data-ev="' + esc(e.id) + '" data-actor="' + esc(a.kind) + '"' + (hasPop ? ' data-act="hist-open" data-case="' + esc(e.case) + '" data-id="' + esc(e.id) + '" data-enter="hist-open" tabindex="0" role="button"' : '') + '>' +
      '<span class="hx-t"><b>' + esc(e.tsLabel || H.dateLabel(e.ts)) + '</b>' + (e.tsLabel ? '' : '<span>' + esc(H.timeLabel(e.ts)) + '</span>') + '</span>' +
      '<span class="hx-m"><span class="hx-a">' + esc(e.action) + sim + '</span>' + (e.detail || e.ref ? '<span class="hx-d">' + esc([e.detail, e.ref ? 'Ref ' + e.ref : ''].filter(Boolean).join(' · ')) + '</span>' : '') + '</span>' +
      '<span class="hx-v">' + (hasPop ? VIEW(e.pop.kind === 'call' ? 'Transcript' : 'View') : '') + '</span>' +
      H.tag(a.kind, a.name) + '</li>';
  }
  function chips(evs, cur) {
    const n = {}; evs.forEach((e) => { const k = (e.actor || {}).kind; n[k] = (n[k] || 0) + 1; });
    const ks = H.ORDER.filter((k) => n[k]);
    return '<div class="hx-f" role="group" aria-label="Filter by who did it">' +
      '<button type="button" class="hx-c' + (!cur ? ' on' : '') + '" data-act="hist-filter" data-k="" aria-pressed="' + !cur + '">All <b>' + evs.length + '</b></button>' +
      ks.map((k) => '<button type="button" class="hx-c k-' + k + (cur === k ? ' on' : '') + '" data-act="hist-filter" data-k="' + k + '" aria-pressed="' + (cur === k) + '" title="' + esc(H.ACTORS[k].legend) + '"><i aria-hidden="true">' + H.ACTORS[k].i + '</i>' + esc(H.ACTORS[k].label) + ' <b>' + n[k] + '</b></button>').join('') + '</div>';
  }
  function inner(cid, o) {
    const evs = H.list(cid, { scope: o.scope }); const k = keyOf(cid, o.scope); const cur = (ui().filter || {})[k] || '';
    const shown = cur ? evs.filter((e) => (e.actor || {}).kind === cur) : evs;
    const list = o.limit ? shown.slice(0, o.limit) : shown;
    return { n: evs.length, html: (evs.length ? chips(evs, cur) : '') + (list.length ? '<ol class="hx-l">' + list.map(row).join('') + '</ol>' : '<div class="hx-e">No events yet.</div>') };
  }
  H.html = (cid, o) => {
    o = o || {}; const scope = o.scope || ''; const k = keyOf(cid, scope);
    const st = (ui().open || {})[k]; const open = st != null ? !!st : !!o.open;
    const x = inner(cid, { scope, limit: o.limit });
    return '<details class="hx' + (o.bare ? ' bare' : '') + '" data-psy="hist" data-hist-case="' + esc(cid) + '" data-hist-scope="' + esc(scope) + '"' + (o.limit ? ' data-limit="' + (+o.limit) + '"' : '') + (open ? ' open' : '') + '>' +
      '<summary class="hx-s" data-act="hist-toggle"><h2 class="hx-ti">' + esc(o.title || 'History') + '</h2><span class="hx-n" data-psy="hist-n">' + x.n + (x.n === 1 ? ' event' : ' events') + '</span>' +
      '<span class="hx-sp"></span><i class="hx-chev" aria-hidden="true"></i></summary>' +
      '<div class="hx-b" data-psy="hist-b">' + x.html + '</div></details>';
  };
  /* re-render every open History block of a case in place (the page keeps its scroll, panels and inputs) */
  H.update = (cid) => {
    const roots = []; const r = PSY.activeRoot && PSY.activeRoot(); if (r) roots.push(r); const m = document.getElementById('modal'); if (m) roots.push(m);
    roots.forEach((root) => root.querySelectorAll('[data-psy="hist"]' + (cid ? '[data-hist-case="' + cid + '"]' : '')).forEach((d) => {
      const c = d.getAttribute('data-hist-case'); const sc = d.getAttribute('data-hist-scope') || ''; const lim = +d.getAttribute('data-limit') || 0;
      const x = inner(c, { scope: sc, limit: lim }); const b = d.querySelector('[data-psy="hist-b"]'); if (b) b.innerHTML = x.html;
      const n = d.querySelector('[data-psy="hist-n"]'); if (n) n.textContent = x.n + (x.n === 1 ? ' event' : ' events');
    }));
  };
  PSY.acts['hist-toggle'] = (el) => {
    const d = el.closest('details'); if (!d) return; d.open = !d.open;
    const u = ui(); u.open = u.open || {}; u.open[keyOf(d.getAttribute('data-hist-case'), d.getAttribute('data-hist-scope'))] = d.open; PSY.save();
  };
  PSY.acts['hist-filter'] = (el) => {
    const d = el.closest('[data-psy="hist"]'); if (!d) return; const k = el.getAttribute('data-k') || '';
    const u = ui(); u.filter = u.filter || {}; u.filter[keyOf(d.getAttribute('data-hist-case'), d.getAttribute('data-hist-scope'))] = k; PSY.save();
    H.update(d.getAttribute('data-hist-case'));
  };
  PSY.acts['hist-open'] = (el) => H.open(el.getAttribute('data-case'), el.getAttribute('data-id'));

  /* ---------------- pop-ups ---------------- */
  const KIND_T = { doc: 'Document', letter: 'Payer letter', submission: 'Submission', note: 'Note', analysis: 'Psyflo AI analysis', call: 'Voice agent call' };
  H.popHtml = (e) => {
    let p = e.pop || {}; const a = e.actor || {};
    const own = (p.facts || []).filter((f) => !/^(Date|When)$/.test(f[0]));
    const facts = [['When', e.tsLabel || H.when(e.ts)]].concat(a.kind === 'staff' && a.name && !own.some((f) => /^(Signed by|Recorded by|Requested by|Logged by|Assigned to)$/.test(f[0])) ? [['Who', a.name]] : [])
      .concat(own).concat(e.ref && !own.some((f) => /ref/i.test(f[0])) ? [['Reference', e.ref + (e.sim ? ' (Simulated)' : '')]] : []);
    const locked = p.clin && PSY.can && !PSY.can('clinicalRecords');
    if (locked) p = Object.assign({}, p, { quote: '', items: [] });
    return '<div class="hp13" data-psy="hist-pop" data-kind="' + esc(p.kind || '') + '">' +
      '<div class="hp13-h">' + H.tag(a.kind, a.name) + (e.sim ? '<span class="hx-sim">Simulated</span>' : '') + '</div>' +
      (e.detail ? '<p class="hp13-d">' + esc(e.detail) + '</p>' : '') +
      '<dl class="hp13-g">' + facts.map((f) => '<dt>' + esc(f[0]) + '</dt><dd>' + (f[2] ? f[1] : esc(f[1])) + '</dd>').join('') + '</dl>' +
      (p.quote ? '<blockquote class="q5 hp13-q">' + esc(p.quote) + '</blockquote>' : '') +
      (p.items && p.items.length ? '<ul class="hp13-l">' + p.items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (locked ? '<p class="hp13-x" data-psy="restricted">Clinical content is restricted · clinical record access required.</p>' : '') + '</div>';
  };
  H.open = (cid, id) => {
    const e = typeof id === 'object' ? id : H.get(cid, id); if (!e) return;
    const p = e.pop || {};
    if (p.kind === 'call' && PSY.voice && PSY.voice.open) { PSY.voice.open(p.id, { case: cid }); return; }
    const acts = [{ label: 'Close' }];
    if (p.go) acts.push({ label: p.goLabel || (/^lauris-/.test(p.go) ? 'Open in Lauris' : 'Open'), primary: true, onClick: () => { PSY.go(p.go); } });
    PSY.ui.modal({ title: p.title || e.action, sub: (KIND_T[p.kind] || 'Event') + ' · ' + ((PSY.caseView(cid) || {}).ini || cid), body: H.popHtml(e), actions: acts });
  };

  /* ---------------- styles: platform + Lauris shadow roots, and the modal ---------------- */
  const TAGC = { voice: ['#EFE8F7', '#4E3584', '#D9CBEE'], agent: ['#E3EFEA', '#1D4F43', '#BFDCCB'], psyflo: ['#E6EEF8', '#24476E', '#C7D7EC'], staff: ['#FCF0D6', '#6F4A05', '#EFD49A'], lauris: ['#E8EBF0', '#2F3A4A', '#CDD3DC'], payer: ['#FBE7E2', '#8A2E1C', '#F0C3B8'] };
  const tagCss = (sel) => Object.keys(TAGC).map((k) => sel + '.k-' + k + '{background:' + TAGC[k][0] + ';color:' + TAGC[k][1] + ';border-color:' + TAGC[k][2] + '}').join('\n');
  const CSS = `
.hx{display:block;background:#fff;border:1px solid #E5DCD0;border-radius:14px;container-type:inline-size;font-family:'DM Sans',system-ui,sans-serif;color:#1B1B19}
.hx.bare{border:0;border-radius:0;background:transparent}
.hx>summary{display:flex;align-items:center;gap:10px;padding:14px 20px;cursor:pointer;list-style:none;user-select:none}
.hx>summary::-webkit-details-marker{display:none}
.hx.bare>summary{padding:10px 0}
.hx .hx-ti{margin:0;font-size:19px;line-height:1.25}
.hx-n{color:#6B665E;font-size:13px}
.hx-sp{flex:1}
.hx-chev{width:9px;height:9px;border-right:2px solid #6B665E;border-bottom:2px solid #6B665E;transform:rotate(45deg);transition:transform .15s;margin:-4px 2px 0 8px;flex:0 0 9px}
.hx[open] .hx-chev{transform:rotate(-135deg);margin-top:4px}
.hx-b{border-top:1px solid #EFE8DE;padding:10px 20px 12px}
.hx.bare .hx-b{padding:8px 0 4px}
.hx-f{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.hx-c{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid #E5DCD0;border-radius:999px;background:#fff;font:inherit;font-size:12px;font-weight:600;color:#4A453D;cursor:pointer;white-space:nowrap}
.hx-c b{font-weight:700;color:#6B665E}.hx-c i{font-style:normal;font-size:10.5px}
.hx-c:hover{background:#F6F0E8}.hx-c.on{background:#1D4F43;border-color:#1D4F43;color:#fff}.hx-c.on b{color:#fff}
.hx-l{list-style:none;margin:0;padding:0}
.hx-r{display:grid;grid-template-columns:62px minmax(0,1fr) auto 124px;gap:4px 12px;align-items:center;padding:7px 6px;border-top:1px solid #F2EDE6;border-radius:6px}
.hx-r:first-child{border-top:0}
.hx-r[data-act]{cursor:pointer}.hx-r[data-act]:hover{background:#FAF6F1}
.hx-r[data-act]:focus-visible{outline:2px solid #1D4F43;outline-offset:-2px}
.hx-t{display:flex;flex-direction:column;line-height:1.2;font-size:12px;color:#6B665E;white-space:nowrap}.hx-t b{font-weight:600;color:#1B1B19;font-size:12.5px}
.hx-m{display:flex;flex-direction:column;min-width:0;gap:1px}
.hx-a{font-size:13px;font-weight:600;line-height:1.3;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.hx-d{font-size:12px;color:#6B665E;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hx-v{font-size:12px;font-weight:600;color:#1D4F43;white-space:nowrap;text-decoration:underline;text-underline-offset:2px;text-decoration-color:#9FC2B5}
.hx-v:empty{display:none}
.hx-tag{justify-self:end;display:inline-flex;align-items:center;gap:4px;max-width:124px;border:1px solid transparent;border-radius:999px;padding:1px 8px 1px 6px;font-size:11px;font-weight:700;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hx-tag i{font-style:normal;font-size:10px;line-height:1}
${tagCss('.hx-tag')}
${tagCss('.hx-c.on')}
.hx-c.on{color:#fff}
.hx-sim{display:inline-flex;align-items:center;border:1px dashed #B8B2A7;color:#6B665E;border-radius:999px;padding:0 6px;font-size:10.5px;font-weight:600;line-height:1.5;white-space:nowrap}
.hx-e{color:#6B665E;font-size:13px;padding:6px 0}
@container (max-width:560px){
  .hx-r{grid-template-columns:54px minmax(0,1fr) auto;grid-template-areas:"t m g" "t v g"}
  .hx-t{grid-area:t;align-self:start;padding-top:1px}.hx-m{grid-area:m}.hx-v{grid-area:v;justify-self:start}.hx-tag{grid-area:g;align-self:start;max-width:110px}
  .hx-b{padding:8px 14px 10px}.hx>summary{padding:12px 14px}
}
`;
  const MCSS = `
#modal .hp13-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
#modal .hp13-d{margin:0 0 10px;font-size:13.5px;line-height:1.5;color:#2F2C27}
#modal .hp13-g{display:grid;grid-template-columns:132px minmax(0,1fr);gap:6px 14px;margin:0;font-size:13px;line-height:1.45}
#modal .hp13-g dt{color:#6B665E}#modal .hp13-g dd{margin:0;color:#1B1B19}
#modal .hp13-q{margin-top:12px}
#modal .hp13-l{margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.5}
#modal .hp13-x{margin:10px 0 0;font-size:12.5px;color:#6B665E;background:#F6F0E8;border-radius:8px;padding:8px 10px}
#modal .hx-tag{display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:999px;padding:1px 8px 1px 6px;font-size:11.5px;font-weight:700;line-height:1.5;white-space:nowrap}
#modal .hx-tag i{font-style:normal;font-size:10px}
${tagCss('#modal .hx-tag')}
#modal .hx-sim{display:inline-flex;align-items:center;border:1px dashed #B8B2A7;color:#6B665E;border-radius:999px;padding:0 7px;font-size:11px;font-weight:600;line-height:1.5}
`;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
  PSY.css.lauris = (PSY.css.lauris || '') + CSS;
  H.CSS = CSS;
  /* the modal sits in the page document, outside the shadow roots: the same rules (the hx- names are unique there) */
  const stEl = document.createElement('style'); stEl.textContent = CSS + MCSS; document.head.appendChild(stEl);
})();

/* ================================================================================================================================
   Round 13 (HIST13): the backdated seed history of every case. Each fact comes from the demo's records:
   dates and units from PSY.data.r5.auth (02-core-data) and the hub histories (20-case-data), Lauris document dates from
   PSY.l1a.DOCS / intake, the payer's words from the decision records and call logs (50-denials-util / 51-denial-detail),
   submission refs (F-2291, F-2287, F-2240) from the case records. Only the clock times of undated steps are filled in.
   The voice agent calls are defined in 09-voice.js (PSY.voice.SEED); their outcome and reference come from there.
   ================================================================================================================================ */
(function () {
  const PSY = window.PSY; const H = PSY.hist;
  const A = () => PSY.auth; const R5 = () => PSY.data.r5;
  const ME = 'J. Perez, LPC'; const MW = 'Maria Wood';
  const lid = (cid) => (A().meta(cid) || {}).laurisId;
  const con = (cid) => PSY.data.lauris.byId(lid(cid));
  const pay = (cid) => PSY.data.payers[(PSY.caseById(cid) || {}).payer] || {};
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const us = (d) => { const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(d || ''); return m ? MON[+m[1] - 1] + ' ' + (+m[2]) : ''; }; // 10/08/2026 → Oct 8
  /* the Psyflo agent's and the voice agent's work is simulated in this demo: always carry the Simulated chip */
  const E = (scope, when, kind, name, action, detail, x) => Object.assign({ scope, ts: H.toTs(when), actor: { kind, name: name || '' }, action, detail: detail || '' }, kind === 'agent' || kind === 'voice' ? { sim: true } : {}, x || {});
  /* a signed Lauris document (consumer file → Documents) */
  const DOCK = { screen: ['Admission Screening signed in Lauris', 'lauris-screening'], cna: ['Intake (CNA) signed in Lauris', 'lauris-cna'], isp: ['Individual Service Plan (ISP) signed in Lauris', 'lauris-isp'] };
  function ldoc(cid, k, time, scope) {
    const c = con(cid); const rows = PSY.l1a && PSY.l1a.DOCS && c ? PSY.l1a.DOCS(c) : []; const d = rows.find((r) => r.k === k); if (!d || !d.when) return null;
    const when = us(d.when); if (!when) return null;
    return E(scope || 'auth', when + ' · ' + time, 'lauris', '', DOCK[k][0], 'Signed by ' + d.by, {
      pop: { kind: 'doc', id: k + '-' + cid, title: d.name, facts: [['Document', d.name], ['File in Lauris', d.file], ['Signed by', d.by], ['Date in Lauris', d.when]], items: d.body || [], clin: true, go: DOCK[k][1] + '?c=' + c.id, goLabel: 'Open in Lauris' } });
  }
  const docs3 = (cid, t1, t2, t3) => [ldoc(cid, 'screen', t1), ldoc(cid, 'cna', t2), ldoc(cid, 'isp', t3)].filter(Boolean);
  /* the authorization record in Lauris */
  const authRec = (cid, when, action) => { const m = A().meta(cid); const cur = m.current || {}; const svc = A().service(m.service, (PSY.caseById(cid) || {}).payer);
    return E('auth', when, 'lauris', '', action || 'Authorization recorded in Lauris', m.ref + ' · ' + cur.authorized + ' ' + svc.units + ', ' + cur.start + ' – ' + cur.end, {
      pop: { kind: 'doc', id: 'auth-' + cid, title: 'Authorization ' + m.ref, facts: [['Authorization', m.ref], ['Payer', pay(cid).name], ['Service', svc.label + (svc.code ? ' · ' + svc.code : '')], ['Authorized', cur.authorized + ' ' + svc.units], ['Period', cur.start + ' – ' + cur.end]], go: 'lauris-auths?c=' + lid(cid), goLabel: 'Open in Lauris' } }); };
  const unitsCheck = (cid, time) => { const u = A().units(cid); const cur = u.current; if (!cur) return null;
    return E('auth', 'Oct 29 · ' + time, 'agent', '', 'Units checked in Lauris', cur.remaining + ' of ' + cur.authorized + ' ' + u.service.units + ' left' + (u.daysLeft != null && cur.perDay ? ' · about ' + u.daysLeft + ' school days' : '') + ' · ends ' + cur.end, { pop: { kind: 'note', id: 'units-' + cid, title: 'Units in Lauris', facts: [['Authorization', A().meta(cid).ref], ['Authorized', cur.authorized + ' ' + u.service.units], ['Used', String(cur.used)], ['Remaining', String(cur.remaining)], ['Ends', cur.end]], go: 'lauris-auths?c=' + lid(cid), goLabel: 'Open in Lauris' } }); };
  const elig = (cid) => { const e = R5().elig[lid(cid)]; if (!e) return null;
    return E('auth', 'Oct 29 · 6:00 am', 'agent', '', 'Eligibility checked', e.status + ' · ' + e.plan, { sim: true, pop: { kind: 'note', id: 'elig-' + cid, title: 'Eligibility check', facts: [['Coverage', e.status + ' · ' + e.plan], ['Since', e.since], ['Checked', e.checked]], items: ['Eligibility never proves a service is covered or authorized.'] } }); };
  /* the SRA drafted, signed, submitted */
  const FORM = (cid) => (A().meta(cid).kind === 'continued' ? 'DMAS CMHRS Continued Stay SRA' : 'DMAS TDT (H2016) Initial SRA');
  const KIND = (cid) => (A().meta(cid).kind === 'continued' ? 'Concurrent SRA' : 'Initial SRA');
  const reqLine = (cid) => { const u = A().units(cid); return u.requested + ' ' + u.service.units + (u.period ? ' · ' + u.period : ''); };
  const drafted = (cid, when, from, x) => E('auth', when, 'psyflo', '', KIND(cid) + ' drafted by Psyflo AI', 'From ' + from + ' · ' + reqLine(cid), Object.assign({ pop: { kind: 'analysis', id: 'draft-' + cid, title: KIND(cid) + ' draft', facts: [['Form', FORM(cid)], ['Request', reqLine(cid)], ['Written from', from], ['Review', 'Clinician review and signature in Lauris Forms to Approve']], items: ['Every section is editable and labelled AI Draft until a clinician reviews it.', 'Clinician Input Required items are left for the clinician.'] } }, x || {}));
  const signed = (cid, when) => E('auth', when, 'staff', ME, 'Reviewed and signed in Lauris', 'Forms to Approve · ' + FORM(cid), { pop: { kind: 'doc', id: 'sign-' + cid, title: 'Signed ' + KIND(cid), facts: [['Form', FORM(cid)], ['Signed by', ME + ' (in Lauris)'], ['Request', reqLine(cid)]], items: ['Psyflo never signs; the clinician signs in Lauris.'], go: 'lauris-auths?c=' + lid(cid), goLabel: 'Open in Lauris' } });
  function sent(cid, when, ref) {
    const ch = PSY.rules.channel((PSY.caseById(cid) || {}).payer); const p = pay(cid);
    return E('auth', when, 'agent', '', 'Submitted to ' + p.short + ' · ' + ch.method, reqLine(cid) + (ref ? ' · Sfax ref ' + ref : ''), { sim: true,
      pop: { kind: 'submission', id: 'sub-' + cid, title: 'Submission · ' + KIND(cid), facts: [['Sent to', p.name], ['Method', ch.label], ['Reference', ref ? ref + ' (Sfax)' : 'Confirmation on file'], ['Documents', FORM(cid) + ' (signed) · CNA · ISP · daily notes'], ['Channel', ch.source]], items: ['Submission simulated in this demo.'] } });
  }
  const received = (cid, when) => E('auth', when, 'payer', '', 'Receipt shown on ' + PSY.rules.channel((PSY.caseById(cid) || {}).payer).method, pay(cid).name + ' · request received', { pop: { kind: 'note', id: 'rcpt-' + cid, title: 'Payer receipt', facts: [['Payer', pay(cid).name], ['Where', PSY.rules.channel((PSY.caseById(cid) || {}).payer).label]] } });
  /* a voice agent call (09-voice.js) */
  function call(id) {
    const V = PSY.voice; const c = V && V.get ? V.get(id) : null; if (!c) return null; const P = V.PURPOSES[c.purpose] || {};
    return { id: 'ev-' + id, scope: c.scope, ts: c.ts, actor: { kind: 'voice', name: '' }, action: P.label + ' · ' + (pay(c.case).short || ''), detail: c.outcome, ref: c.ref, sim: true, pop: { kind: 'call', id } };
  }
  /* the payer's decision */
  const DI_GO = (cid) => (PSY.screens['di-case'] ? 'di-case?case=' + cid : 'auth-list?case=' + cid);
  const CORR = { 'R-0388': 'Call log Oct 27', 'R-0402': 'Call log Oct 27', 'R-0391': 'Call log Oct 29', 'R-0408': 'Availity message Oct 28, 5:40 pm', 'R-0384': 'Anthem denial letter Oct 22' };
  function decision(cid, scope, when, action, x) {
    const d = A().meta(cid).decision || {}; const u = A().units(cid); const ex = PSY.ev && PSY.ev.excerptOf ? PSY.ev.excerptOf(cid, CORR[cid]) : null;
    const facts = [['From', d.by], ['Received by', d.via], ['Date', d.date]].concat(d.type !== 'info' ? [['Units', u.requested + ' requested · ' + (d.approved != null ? d.approved : '—') + (d.type === 'reduction' ? ' offered' : ' approved')]] : [])
      .concat(d.due ? [[d.type === 'denial' ? 'Appeal deadline' : d.type === 'partial' ? 'Peer-to-peer slot' : 'Reply due', d.due + ' · ' + d.dueSrc]] : []);
    return E(scope, when, 'payer', '', action, d.said ? (d.type === 'info' ? d.said : 'Reason given: ' + d.said) : '', Object.assign({ pop: { kind: 'letter', id: 'dec-' + cid, title: CORR[cid] || 'Payer decision', facts, quote: ex || d.said || '', go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }, x || {}));
  }
  const S = H.SEED;

  /* ---------------- T.W. · R-0416 · Humana (referral said Anthem) · initial SRA, follows the new-case story (PSY.flowRank) ---------------- */
  S['R-0416'] = (cid) => {
    const r = PSY.flowRank(); const out = [];
    out.push(E('auth', 'Oct 13 · 9:12 am', 'agent', '', 'Referral received through the Psyflo link', 'From the Lynchburg City school counselor · REF-118', { pop: { kind: 'doc', id: 'ref-118', title: 'Referral REF-118', facts: [['Referral', 'REF-118'], ['Received', 'Oct 13 · Psyflo link'], ['From', 'School counselor · Lynchburg City · MS-2'], ['Payer on the referral', 'Anthem HealthKeepers Plus']], go: 'lauris-consumer?c=4492', goLabel: 'Open in Lauris' } }));
    if (r >= 1) {
      out.push(E('auth', 'Oct 16 · 2:30 pm', 'staff', ME, 'Admission Screening call with the guardian', '22 minutes', { pop: { kind: 'note', id: 'scr-call', title: 'Admission Screening call', facts: [['Clinician', ME], ['Length', '22 minutes'], ['Notes', 'Typed into the Lauris form by the Psyflo extension (Scribe)']] } }));
      out.push(E('auth', 'Oct 16 · 2:58 pm', 'lauris', '', 'Admission Screening saved in Lauris', 'Notes typed into the form by the extension', { pop: { kind: 'doc', id: 'scr-4492', title: 'Admission Screening', facts: [['Consumer', 'T.W. · Lauris #4492'], ['Saved by', ME]], go: 'lauris-screening?c=4492', goLabel: 'Open in Lauris' } }));
    }
    if (r >= 2) out.push(E('auth', 'Oct 20 · 11:05 am', 'lauris', '', 'Intake (CNA) processed in Lauris', 'By ' + ME, { pop: { kind: 'doc', id: 'cna-4492', title: 'Comprehensive Needs Assessment', facts: [['Consumer', 'T.W. · Lauris #4492'], ['Intake date', '10/20/2026'], ['By', ME]], go: 'lauris-cna?c=4492', goLabel: 'Open in Lauris' } }));
    if (r >= 3) {
      out.push(E('auth', 'Oct 21 · 3:40 pm', 'lauris', '', 'Individual Service Plan (ISP) processed in Lauris', 'Three goals · by ' + ME, { pop: { kind: 'doc', id: 'isp-4492', title: 'Individual Service Plan', facts: [['Consumer', 'T.W. · Lauris #4492'], ['Plan date', '10/21/2026'], ['Goals', 'Three']], go: 'lauris-isp?c=4492', goLabel: 'Open in Lauris' } }));
      out.push(drafted(cid, 'Oct 29 · 10:21 am', 'the referral, screening, intake and ISP', { detail: 'Version 3 read back from Lauris · ' + reqLine(cid), pop: { kind: 'analysis', id: 'draft-R-0416', title: 'Initial SRA draft', facts: [['Form', FORM(cid)], ['Request', reqLine(cid)], ['Written from', 'Referral, Admission Screening, CNA, ISP'], ['Version', '3 · read back from Lauris'], ['Review', 'Clinician review and signature in Lauris Forms to Approve']], items: ['One item requires clinical input.'], go: 'lauris-dmas?case=R-0416', goLabel: 'Open in Lauris' } }));
    }
    const e = R5().elig['4492'];
    out.push(E('auth', 'Oct 29 · 6:00 am', 'agent', '', 'Coverage change detected', e.change.from + ' → ' + e.change.to, { sim: true, pop: { kind: 'note', id: 'elig-4492', title: 'Eligibility check', facts: [['Previous payer', e.change.from + ' (ended ' + e.change.fromEnded + ')'], ['Current payer', e.change.to + ' (since ' + e.since + ')'], ['On the referral', e.change.referralSaid], ['Checked', e.checked]], items: ['Staff confirm which payer is responsible before the SRA is sent.'] } }));
    return out;
  };

  /* ---------------- M.R. · R-0411 · Anthem · concurrent SRA in review ---------------- */
  S['R-0411'] = (cid) => [
    E('auth', 'Feb 3 · 9:00 am', 'lauris', '', 'Admitted to TDT school day', 'First authorization from Anthem', { pop: { kind: 'doc', id: 'adm-4471', title: 'Admission', facts: [['Program', 'TDT – Campbell ES-1'], ['Payer', 'Anthem HealthKeepers Plus']], go: 'lauris-auths?c=4471', goLabel: 'Open in Lauris' } }),
    authRec(cid, 'Aug 18 · 8:30 am', 'Current authorization began'),
    ldoc(cid, 'cna', '10:15 am'), ldoc(cid, 'isp', '2:05 pm'),
    E('auth', 'Sep 8 · 4:10 pm', 'lauris', '', '23 older notes read from Lauris', 'Opened in Lauris once; now part of the record Psyflo drafts from'),
    E('auth', 'Oct 14 · 3:22 pm', 'psyflo', '', 'Wording flagged in a daily note', 'Suggested a corrected verb for “observed”; the clinician decides'),
    E('auth', 'Oct 22 · 1:15 pm', 'lauris', '', 'ISP changed in Lauris', 'Named staff at lunch and transitions', { pop: { kind: 'doc', id: 'isp-4471-b', title: 'ISP change', facts: [['Change', 'Named staff at lunch and transitions'], ['Where', 'Lauris · Individual Service Plan']], go: 'lauris-isp?c=4471', goLabel: 'Open in Lauris' } }),
    unitsCheck(cid, '6:05 am'), elig(cid),
    drafted(cid, 'Oct 29 · 9:48 am', '61 daily notes and the ISP', { detail: 'Version 2 read back from Lauris · ' + reqLine(cid) }),
  ];

  /* ---------------- K.T. · R-0408 · Anthem · initial SRA → more information requested ---------------- */
  S['R-0408'] = (cid) => [
    ...docs3(cid, '9:30 am', '1:10 pm', '11:20 am'),
    drafted(cid, 'Oct 20 · 3:10 pm', 'the CNA, the ISP and the daily notes'),
    signed(cid, 'Oct 21 · 9:30 am'), sent(cid, 'Oct 21 · 9:41 am'), received(cid, 'Oct 21 · 9:42 am'),
    call('VC-0408-S'),
    decision(cid, 'auth', 'Oct 28 · 5:40 pm', 'Anthem asked for more information', { detail: 'Three questions on Availity · reply within 24 hours (stated in the message)' }),
    elig(cid),
    /* denial scope */
    decision(cid, 'denial', 'Oct 28 · 5:40 pm', 'Request for more information received', { detail: 'Three questions on Availity · reply due Oct 29, 5:40 pm (stated in the message)' }),
    E('denial', 'Oct 28 · 5:40 pm', 'agent', '', 'Message read from Availity', 'The 24-hour clock started; J. Perez emailed and texted'),
    E('denial', 'Oct 28 · 5:41 pm', 'psyflo', '', 'Reply drafted by Psyflo AI', 'From the request already sent and the last 30 days of notes', { pop: { kind: 'analysis', clin: true, id: 'reply-0408', title: 'Reply to Anthem’s request', facts: [['Drafted', 'Oct 28, 5:41 pm'], ['Written from', 'The initial SRA, daily notes Sep 29 – Oct 28, the school behaviour report, the CNA'], ['Status', 'Waiting for a clinician to send it']], items: ['(1) Physical aggression: seven dated occasions, Sep 29 – Oct 28.', '(2) Prior outpatient treatment: the Piedmont discharge summary is not attached; the family has been asked.', '(3) IEP supports: classroom-based; five of seven incidents in unstructured periods.'], go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }),
    call('VC-0408-F'),
    E('denial', 'Oct 29 · 10:03 am', 'lauris', '', 'Reply version 1 read back from Lauris', 'Waiting for a clinician to send it'),
  ];

  /* ---------------- D.W. · R-0402 · Sentara · concurrent SRA → 120 of 150 offered by phone ---------------- */
  S['R-0402'] = (cid) => [
    authRec(cid, 'Aug 18 · 8:30 am', 'Current authorization began'), ldoc(cid, 'cna', '9:40 am'), ldoc(cid, 'isp', '1:30 pm'),
    drafted(cid, 'Oct 12 · 2:15 pm', 'the daily notes since Aug 18 and the direct-hours log'),
    signed(cid, 'Oct 13 · 9:05 am'), sent(cid, 'Oct 13 · 9:20 am'),
    call('VC-0402-S'),
    decision(cid, 'auth', 'Oct 27 · 3:15 pm', 'Sentara called: 120 of 150 units offered', { detail: 'Reply by Oct 30 (date given on the call)' }),
    elig(cid),
    decision(cid, 'denial', 'Oct 27 · 3:15 pm', 'Sentara offered 120 of 150 units by phone', { detail: 'Reason given: “No way you’re spending 5+ hours with these kids.” · reply by Oct 30' }),
    E('denial', 'Oct 27 · 3:40 pm', 'staff', 'Site supervisor', 'Call logged in Lauris', '“We’d really like to give you 120.” · no reply sent yet', { pop: { kind: 'note', id: 'log-0402', title: 'Call log Oct 27', facts: [['Logged by', 'The site supervisor'], ['Reply by', 'Oct 30 · date given by Sentara on the call']], quote: PSY.ev.excerptOf(cid, 'Call log Oct 27') || '' } }),
    call('VC-0402-F'),
    E('denial', 'Oct 29 · 9:30 am', 'psyflo', '', 'Four options laid out by Psyflo AI', 'Accept · add information · peer-to-peer · early discharge + new initial', { pop: { kind: 'analysis', clin: true, id: 'opts-0402', title: 'Options for Sentara’s offer', items: ['Accept 120 units.', 'Send more information (the direct-hours log; three escalations since Oct 27 are in the daily notes).', 'Ask for a peer-to-peer review.', 'Early discharge and a new initial SRA.'], facts: [['Reply by', 'Oct 30 · date given on the Oct 27 call']], go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }),
  ];

  /* ---------------- A.L. · R-0399 · Humana · initial SRA faxed Oct 19, receipt confirmed on day 10 ---------------- */
  S['R-0399'] = (cid) => [
    ...docs3(cid, '9:15 am', '1:30 pm', '10:40 am'),
    drafted(cid, 'Oct 19 · 8:40 am', 'the CNA, the ISP and the daily notes'),
    signed(cid, 'Oct 19 · 10:05 am'),
    E('auth', 'Oct 19 · 10:09 am', 'agent', '', 'Signed PDF saved and faxed by Sfax', reqLine(cid) + ' · ref F-2291', { sim: true, ref: '', pop: { kind: 'submission', id: 'sub-R-0399', title: 'Submission · Initial SRA', facts: [['Sent to', pay(cid).name], ['Method', 'Fax via Sfax'], ['Reference', 'F-2291 (Sfax)'], ['Documents', FORM(cid) + ' (signed PDF)'], ['Channel', PSY.rules.channel('humana').source]], items: ['Submission simulated in this demo.'] } }),
    E('auth', 'Oct 26 · 9:00 am', 'agent', '', 'No decision after 7 calendar days', 'Federal 7-day standard; how Humana applies it is not verified', { pop: { kind: 'note', id: 'd7-0399', title: 'Decision not received', facts: [['Sent', 'Oct 19 · Sfax F-2291'], ['Rule', (PSY.rules.byId('turnaround') || {}).text || ''], ['Source', (PSY.rules.byId('turnaround') || {}).source || '']] } }),
    elig(cid),
    call('VC-0399-S'),
  ];

  /* ---------------- J.O. · R-0391 · Aetna · early discharge + new initial → 110 of 150 offered by phone ---------------- */
  S['R-0391'] = (cid) => [
    ldoc(cid, 'cna', '10:20 am'), ldoc(cid, 'isp', '2:00 pm'),
    E('auth', 'Sep 8 · 3:30 pm', 'lauris', '', 'Suspension recorded in the daily notes', 'Earlier SRA: 80 units, used at 3 a day from here', { pop: { kind: 'doc', id: 'dn-0908', title: 'Daily notes', facts: [['Earlier authorization', '80 units · used in 7 weeks']], go: 'lauris-dpn?c=4449', goLabel: 'Open in Lauris' } }),
    E('auth', 'Sep 25 · 3:30 pm', 'lauris', '', 'Step-down to 2 units a day tried', 'Week of Sep 22 · incidents returned within 3 days', { pop: { kind: 'doc', id: 'dn-0922', title: 'Daily notes', go: 'lauris-dpn?c=4449', goLabel: 'Open in Lauris' } }),
    drafted(cid, 'Oct 21 · 2:40 pm', 'the earlier SRA, the daily notes and the step-down'),
    signed(cid, 'Oct 22 · 9:10 am'), sent(cid, 'Oct 22 · 9:24 am', 'F-2287'),
    call('VC-0391-S'),
    decision(cid, 'auth', 'Oct 29 · 9:20 am', 'Aetna called: 110 of 150 units offered', { detail: 'Reply by Nov 2 (date given on the call)' }),
    elig(cid),
    decision(cid, 'denial', 'Oct 29 · 9:20 am', 'Aetna offered 110 of 150 units by phone', { detail: 'Reason given: “Can be addressed in outpatient.” · reply by Nov 2' }),
    E('denial', 'Oct 29 · 9:35 am', 'staff', '', 'Call logged in Lauris', 'Offer recorded on the new initial SRA (Sfax F-2287)', { pop: { kind: 'note', id: 'log-0391', title: 'Call log Oct 29', quote: PSY.ev.excerptOf(cid, 'Call log Oct 29') || '' } }),
  ];

  /* ---------------- T.N. · R-0388 · Sentara · 150 requested, 65 approved, peer-to-peer Dec 9 ---------------- */
  S['R-0388'] = (cid) => [
    ldoc(cid, 'cna', '9:50 am'), ldoc(cid, 'isp', '1:45 pm'),
    drafted(cid, 'Sep 28 · 3:05 pm', 'the daily notes since the last authorization'),
    signed(cid, 'Sep 29 · 9:15 am'), sent(cid, 'Sep 29 · 9:30 am', 'F-2240'),
    call('VC-0388-S'),
    decision(cid, 'auth', 'Oct 27 · 10:20 am', 'Decision: 65 of 150 units approved', { detail: 'Authorization decision and phone call' }),
    authRec(cid, 'Oct 27 · 4:10 pm', 'Units recorded in Lauris'),
    unitsCheck(cid, '6:05 am'), elig(cid),
    decision(cid, 'denial', 'Oct 27 · 10:20 am', 'Partial approval: 65 of 150 units', { detail: 'Reasons given: “Can be addressed through the IEP.” · “No way you’re spending 5+ hours with these kids.”' }),
    E('denial', 'Oct 27 · 11:45 am', 'staff', '', 'Peer-to-peer requested by phone', '48 minutes on hold', { pop: { kind: 'note', id: 'p2p-req-0388', title: 'Call log Oct 27', quote: PSY.ev.excerptOf(cid, 'Call log Oct 27') || '' } }),
    E('denial', 'Oct 27 · 11:46 am', 'payer', '', 'Peer-to-peer slot offered: Dec 9, 2:00 pm', 'The first available slot', { pop: { kind: 'letter', id: 'p2p-slot-0388', title: 'Peer-to-peer slot', facts: [['From', 'Sentara Community Plan'], ['Slot', 'Dec 9, 2:00 pm'], ['Source', 'Slot offered by Sentara on Oct 27 (call log)']], go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }),
    call('VC-0388-F'),
    E('denial', 'Oct 29 · 8:50 am', 'psyflo', '', 'Peer-to-peer call notes, version 2', 'Ready for the clinician', { pop: { kind: 'analysis', clin: true, id: 'p2p-notes-0388', title: 'Peer-to-peer call notes', items: ['On “through the IEP”: the IEP gives no clinical staff at lunch and transitions, where 6 of the 9 incidents happened.', 'On “5+ hours”: the October time log averages 5 h 12 min a day.'], go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }),
  ];

  /* ---------------- E.C. · R-0384 · Anthem · initial SRA denied Oct 22 ---------------- */
  S['R-0384'] = (cid) => [
    ...docs3(cid, '9:05 am', '1:20 pm', '10:30 am'),
    drafted(cid, 'Oct 9 · 3:30 pm', 'the CNA, the ISP and the school behaviour report'),
    signed(cid, 'Oct 12 · 9:10 am'), sent(cid, 'Oct 12 · 9:22 am'), received(cid, 'Oct 12 · 9:23 am'),
    call('VC-0384-S'),
    decision(cid, 'auth', 'Oct 22 · 8:05 am', 'Decision letter: denied', { detail: 'None of the 90 units approved · reason given: “Already connected to other services.”' }),
    elig(cid),
    decision(cid, 'denial', 'Oct 22 · 8:05 am', 'Denial letter received on Availity', { detail: 'None of the 90 units · appeal deadline Dec 21 (60 days from the notice)' }),
    E('denial', 'Oct 22 · 8:06 am', 'agent', '', 'Letter read from Availity', 'Stated reason and the appeal deadline recorded', { pop: { kind: 'note', id: 'read-0384', title: 'Denial letter read', facts: [['Reason recorded', '“Already connected to other services.”'], ['Appeal deadline', 'Dec 21 · 60 calendar days from the notice (42 CFR 438.402(c)(2)(ii)); confirm against the date printed on the letter']] } }),
    E('denial', 'Oct 22 · 9:30 am', 'staff', MW, 'Assigned for clinical review', 'Denial Intelligence · DI-384', { pop: { kind: 'note', id: 'asg-0384', title: 'Assigned', facts: [['Assigned to', MW + ' · Program Director'], ['Record', 'DI-384']] } }),
    call('VC-0384-F'),
    E('denial', 'Oct 26 · 2:10 pm', 'psyflo', '', 'Appeal letter for the guardian drafted', 'Plain language · Harvest keeps serving E.C. meanwhile', { pop: { kind: 'analysis', clin: true, id: 'appeal-0384', title: 'Appeal letter for the guardian', facts: [['Drafted', 'Oct 26'], ['Who files', 'The guardian (Harvest’s experience; federal rules also allow a provider with the member’s written consent)'], ['Deadline', 'Dec 21 · the date in the letter']], items: ['Answers “Already connected to other services” with what each current service gives and where the incidents happen.', 'Clinician review required before it is shared.'], go: DI_GO(cid), goLabel: 'Open in Denial Intelligence' } }),
  ];

  /* ---------------- S.B. · R-0395 · UnitedHealthcare · concurrent SRA due ---------------- */
  S['R-0395'] = (cid) => {
    const cl = (R5().disputes || []).find((d) => d.id === 'CL-217') || {}; const k = cl.claim || {};
    return [
      E('auth', 'Jan 12 · 9:00 am', 'lauris', '', 'Admitted to TDT school day', 'Campbell County · MS-1', { tsLabel: 'Jan 2026' }),
      authRec(cid, 'Aug 10 · 8:30 am', 'Current authorization began'), ldoc(cid, 'cna', '10:00 am'), ldoc(cid, 'isp', '1:00 pm'),
      unitsCheck(cid, '6:05 am'), elig(cid),
      E('auth', 'Oct 29 · 6:10 am', 'psyflo', '', 'Concurrent SRA due · ready to start', reqLine(cid) + ' · before Nov 5', { pop: { kind: 'note', id: 'due-0395', title: 'Concurrent SRA due', facts: [['Units left', '14 at 3 a day'], ['Authorization ends', 'Nov 5'], ['Next request', reqLine(cid)]] } }),
      E('denial', 'Oct 26 · 7:30 am', 'payer', '', 'Claim ' + k.no + ' denied', k.code + ' · ' + k.dos + ' · ' + k.billed, { sim: true, pop: { kind: 'letter', id: 'cl-217', title: 'Claim ' + k.no + ' (illustrative demo data)', facts: [['Payer', 'UnitedHealthcare Community Plan'], ['Dates of service', k.dos], ['Billed', k.billed], ['Code', k.code]], quote: k.reason } }),
      E('denial', 'Oct 26 · 7:31 am', 'psyflo', '', 'Dates of service checked against the authorization', k.note || '', { sim: true }),
    ];
  };
  /* ---------------- L.V. · R-0380 · Humana · after school, renewal due Dec 8 ---------------- */
  S['R-0380'] = (cid) => {
    const cl = (R5().disputes || []).find((d) => d.id === 'CL-221') || {}; const k = cl.claim || {};
    return [
      authRec(cid, 'Sep 8 · 8:30 am', 'Current authorization began'), ldoc(cid, 'cna', '10:30 am'), ldoc(cid, 'isp', '2:15 pm'),
      unitsCheck(cid, '6:05 am'), elig(cid),
      E('denial', 'Oct 28 · 7:30 am', 'payer', '', 'Claim ' + k.no + ' rejected', k.code + ' · ' + k.dos + ' · ' + k.billed, { sim: true, pop: { kind: 'letter', id: 'cl-221', title: 'Claim ' + k.no + ' (illustrative demo data)', facts: [['Payer', 'Humana Healthy Horizons in Virginia'], ['Date of service', k.dos], ['Billed', k.billed]], quote: k.reason } }),
      E('denial', 'Oct 28 · 7:31 am', 'psyflo', '', 'Rejection read: a corrected claim, not an appeal', k.note || '', { sim: true }),
    ];
  };
  /* ---------------- P.G. · R-0377 · Aetna · outpatient ---------------- */
  S['R-0377'] = (cid) => [authRec(cid, 'Aug 17 · 8:30 am', 'Current authorization began'), ldoc(cid, 'cna', '10:00 am'), ldoc(cid, 'isp', '1:15 pm'), unitsCheck(cid, '6:05 am'), elig(cid)];

  /* drop steps whose source record is missing */
  Object.keys(S).forEach((k) => { const f = S[k]; S[k] = (cid) => (f(cid) || []).filter(Boolean); });
})();
