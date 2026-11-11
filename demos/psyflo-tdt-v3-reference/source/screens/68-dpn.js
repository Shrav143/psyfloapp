/* L1b: the Lauris session notes, and what the Psyflo Scribe does on them (round 9).
   Routes
     lauris-dpn?c=4471                   Daily Progress Note – TDT for today (10/29/2026): the seven DPN fields (prompt §4)
     lauris-dpn?c=4471&past=2026-05-12   a processed note, read-only, with its dated addenda (the original is never overwritten)
     lauris-collateral?c=4471            Collateral Contact (a call with the guardian or the school)
     lauris-monthly?c=4471               Monthly Summary (the Scribe's "Monthly Note / Review")
   Scribe handlers (src/scribe.js): 'lauris-dpn' (kind 'fields'), 'lauris-collateral' and 'lauris-monthly' (kind 'note').
     lines = the scripted conversation (fictional, initials only). The DPN draft restates only what was said, plus what the record
     already has (the session date, the consumer's ISP goal, Track Time entries linked to the note); a field nothing was said about stays empty.
   PSY.dpn (for Scan & Enhance, owner B9, and the Track Time view, owner T9):
     FIELDS [[key, label, kind]] · compose(values) → labelled text · parse(text) → values · key(laurisId) → 'dpn|<id>|2026-10-29'
     fields(root) → today's DPN as Lauris has it · text(root) → the same as labelled text (a past note: its original text)
     push(root, text | values, { addendum, via }) → writes today's fields (only the labels given) or adds a dated addendum (past or processed notes)
     info(root) · past(laurisId) · goals(laurisId) · track(laurisId) (Track Time entries for today, linked or not)
   Round 10 (Scan & Enhance push targets, owner ENH10): a Collateral Contact saved on an earlier day and not processed opens at
     lauris-collateral?c=4471&past=2026-10-27 (M.R.) / &past=2026-10-26 (T.N.); the October Monthly Summary of M.R. and T.N. is a saved draft.
     PSY.dpn.session(type, laurisId, past) · sessions(type, laurisId) · sessionPush(root, type, laurisId, past, { note, mins }, { addendum, via }) */
(function () {
  const PSY = window.PSY; const U = PSY && PSY.l1b;
  if (!U) return;
  const MR = '4471'; const TODAY = '2026-10-29'; const TODAY_US = '10/29/2026';
  const esc = (s) => PSY.esc(s);
  const norm = (s) => String(s == null ? '' : s).replace(/\r/g, '').trim();
  const G = (id, label, html, x) => Object.assign({ id, label, html, src: 'g' }, x || {});
  const OBJ = 'Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations';
  const INTS = ['Clinical 2.1 Movement', 'QMHP 1.6 Recognize danger / healthy boundaries', 'QMHP 1.9 Solving peer conflict'];
  const fmt = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || ''); return m ? m[2] + '/' + m[3] + '/' + m[1] : String(iso || ''); };
  const me = () => (PSY.user().name || 'Staff').split(' ')[0];
  const scribeBy = () => (PSY.scribe && PSY.scribe.by ? PSY.scribe.by() : PSY.lauris.user.short);

  /* ================= the seven DPN fields, as labelled text (the PSY.sync format) ================= */
  const FIELDS = [
    ['date', 'Service date', 'line'],
    ['goal', 'Treatment goal', 'goal'],
    ['intervention', 'Intervention performed', 'area'],
    ['duration', 'Duration', 'line'],
    ['response', 'Consumer response', 'area'],
    ['progress', 'Progress or barriers', 'area'],
    ['needs', 'Continuing clinical needs', 'area'],
  ];
  const KEYS = FIELDS.map((f) => f[0]);
  /* labels other modules may use (Scan & Enhance's round-8 "Intervention: / Response: / Goal:" format included) */
  const ALIAS = { 'service date': 'date', 'session date': 'date', date: 'date', 'treatment goal': 'goal', goal: 'goal', objective: 'goal', 'isp goal': 'goal',
    'intervention performed': 'intervention', intervention: 'intervention', interventions: 'intervention', duration: 'duration',
    'consumer response': 'response', response: 'response', 'progress or barriers': 'progress', progress: 'progress', barriers: 'progress',
    'continuing clinical needs': 'needs', 'clinical needs': 'needs', needs: 'needs', plan: 'needs' };
  const blank = () => { const o = {}; KEYS.forEach((k) => { o[k] = ''; }); return o; };
  const compose = (v) => FIELDS.map(([k, l]) => l + ': ' + String((v && v[k]) || '').replace(/\r/g, '')).join('\n');
  /* labelled text → { v: values, has: labels present }. Text without any label is the intervention. */
  function parseWith(text) {
    const v = blank(); const has = {}; let cur = null;
    String(text == null ? '' : text).replace(/\r/g, '').split('\n').forEach((line) => {
      const m = /^\s*([A-Za-z][A-Za-z ]{1,40}?)\s*:\s?(.*)$/.exec(line); const k = m ? ALIAS[m[1].trim().toLowerCase()] : null;
      if (k) { cur = k; has[k] = true; v[k] = m[2]; return; }
      if (!cur) { cur = 'intervention'; has.intervention = true; v.intervention = line; return; }
      v[cur] += '\n' + line;
    });
    KEYS.forEach((k) => { v[k] = v[k].replace(/^\s+|\s+$/g, ''); });
    return { v, has };
  }
  const parse = (text) => parseWith(text).v;
  const dpnKey = (cid) => 'dpn|' + cid + '|' + TODAY;

  /* the consumer's ISP 2.0 goals (the same source as the ISP page and Scan & Enhance) */
  function goals(cid) {
    let list = [];
    try { list = U.isp && U.isp.goals ? U.isp.goals({ c: cid }) : ((U.data && U.data.ispGoals) || []); } catch (e) { list = []; }
    return list.map((g) => 'Goal ' + g.n + ': ' + g.obj);
  }

  /* ================= Track Time (owner T9, src/time.js): entries({laurisId, date}), link(ids, dpnKey), linked(dpnKey), summary({dpnKey}),
     units(minutes, serviceOf(laurisId)). T9 calls PSY.l1b.timeChanged(root) on every change. Read defensively (round-8 PSY.time had none of these). */
  const TT = {
    api: () => !!(PSY.time && typeof PSY.time.link === 'function' && typeof PSY.time.entries === 'function'),
    list(c) {
      const T = PSY.time; if (!T || !T.entries) return [];
      try { const r = TT.api() ? T.entries({ laurisId: c.id, date: TODAY }) : T.entries(c.ini); return Array.isArray(r) ? r : []; } catch (e) { return []; }
    },
    min(e) { const m = e.minutes != null ? e.minutes : e.m != null ? e.m : e.mins != null ? e.mins : e.recorded != null ? e.recorded : e.ms != null ? e.ms / 60000 : 0; return Math.round(+m || 0); },
    id: (e, i) => (e.id != null ? e.id : i),
    linkOf(e) { const x = e.dpn != null ? e.dpn : e.dpnKey != null ? e.dpnKey : e.linked != null ? e.linked : e.link; return x && typeof x === 'object' ? x.key || '' : typeof x === 'string' ? x : Array.isArray(e.links) ? e.links[0] || '' : ''; },
    fmt(m) { const T = PSY.time; if (T && T.fmt) { try { return String(T.fmt(m)).trim(); } catch (e) {} } const h = Math.floor(m / 60), r = m % 60; return ((h ? h + ' h ' : '') + (r || !h ? r + ' min' : '')).trim(); },
    /* billable units under the consumer's service rule (null: no rule configured) */
    units(m, cid) {
      const T = PSY.time; if (!T) return null;
      try { if (T.units) { const u = T.units(m, T.serviceOf ? T.serviceOf(cid) : 'tdt'); if (u == null || typeof u === 'number') return u; if (typeof u === 'object') { const n = u.units != null ? u.units : u.n; return n == null ? null : +n; } } } catch (e) {}
      try { return T.unitsFor ? T.unitsFor(m) : null; } catch (e) { return null; }
    },
  };
  function track(cid) {
    const T = PSY.time; const c = U.consumer(cid, MR); const key = dpnKey(c.id); const all = TT.list(c);
    const sum = (a) => a.reduce((n, e) => n + TT.min(e), 0);
    /* what is linked to this DPN: PSY.time.linked(dpnKey) / summary({dpnKey}) when owner T9's API is there */
    let linked = all.filter((e) => TT.linkOf(e) === key); let linkedMin = null;
    try { if (T && T.linked) linked = T.linked(key) || linked; } catch (e) {}
    try { if (T && T.summary) { const s = T.summary({ dpnKey: key }); if (s && s.minutes != null) linkedMin = +s.minutes; } } catch (e) {}
    if (linkedMin == null) linkedMin = sum(linked);
    const free = all.filter((e) => !TT.linkOf(e) && e.status !== 'draft');
    return { linkable: TT.api(), all, linkedN: linked.length, linkedMin, unlinkedN: free.length, unlinkedMin: sum(free), dayMin: sum(all.filter((e) => e.status !== 'draft')), fmt: TT.fmt,
      link: () => { try { PSY.time.link(free.map((e) => TT.id(e, all.indexOf(e))), key); } catch (e) { console.error('time link', e); } } };
  }

  /* ================= the DPN voice note and the draft written from it ================= */
  function voice(c) {
    const n = c.ini;
    if (c.id === MR) return [
      { t: '0:03', who: 'Scribe', text: 'Voice note, 1:42 pm. What did you work on with M.R.?' },
      { t: '0:08', who: 'You', text: 'Played basketball with him, 1:10 to 1:40, for frustration tolerance. Movement helps him settle.' },
      { t: '0:15', who: 'Scribe', text: 'How did it go?' },
      { t: '0:18', who: 'You', text: 'He got frustrated when he lost and walked off the court.' },
      { t: '0:24', who: 'Scribe', text: 'What did you do then?' },
      { t: '0:27', who: 'You', text: 'We did a walk together and he came back.' },
      { t: '0:33', who: 'Scribe', text: 'How long was he out, and did he need a prompt?' },
      { t: '0:38', who: 'You', text: 'About six minutes. I prompted him once to use his words with the other player.' },
      { t: '0:45', who: 'Scribe', text: 'How intense was it?' },
      { t: '0:48', who: 'You', text: 'Moderate. No one was hurt.' },
    ];
    return [
      { t: '0:03', who: 'Scribe', text: 'Voice note. What did you work on with ' + n + '?' },
      { t: '0:08', who: 'You', text: 'A movement break with ' + n + ' before math. Movement helps ' + n + ' settle.' },
      { t: '0:14', who: 'Scribe', text: 'How did it go?' },
      { t: '0:17', who: 'You', text: n + ' got frustrated with the math sheet and pushed it away.' },
      { t: '0:23', who: 'Scribe', text: 'What did you do then?' },
      { t: '0:26', who: 'You', text: 'We talked it through and ' + n + ' went back to the work.' },
      { t: '0:32', who: 'Scribe', text: 'How long, and did ' + n + ' need a prompt?' },
      { t: '0:36', who: 'You', text: 'About five minutes. One prompt.' },
      { t: '0:41', who: 'Scribe', text: 'How intense was it?' },
      { t: '0:44', who: 'You', text: 'Mild.' },
    ];
  }
  /* the draft: each value restates the voice note (or comes from the record, with its source). Nothing was said about the consumer's
     continuing clinical needs, so that field stays empty ("Not stated"); the clinician fills it or leaves it. */
  function dpnDraft(c) {
    const n = c.ini; const g = goals(c.id)[0] || ''; const t = track(c.id);
    const v = { date: TODAY_US, goal: g, needs: '' };
    const src = { date: 'Lauris session', goal: g ? 'ISP 2.0 · Goal 1' : '' };
    if (c.id === MR) {
      v.intervention = 'Clinical 2.1 Movement: basketball with M.R. for frustration tolerance; movement helps him settle. After he walked off the court, staff walked with him. 1 prompt to use his words with the other player (QMHP 1.9 Solving peer conflict).';
      v.duration = '30 min (1:10–1:40 pm)';
      v.response = 'Frustrated when he lost the game and walked off the court (moderate intensity; no one hurt). Came back after the walk with staff, about 6 minutes out. Used his words with the other player after 1 prompt.';
      v.progress = 'Losing a game led to 1 escalation; he returned after a walk with staff and 1 prompt (0 of 1 on his own).';
    } else {
      v.intervention = 'Clinical 2.1 Movement: a movement break with ' + n + ' before math; movement helps ' + n + ' settle. Staff talked it through after ' + n + ' pushed the math sheet away.';
      v.duration = '';
      v.response = n + ' became frustrated with the math sheet and pushed it away (mild intensity). Went back to the work after about 5 minutes, with 1 prompt.';
      v.progress = 'The math sheet led to 1 escalation; ' + n + ' went back to the work after 1 prompt.';
    }
    ['intervention', 'response', 'progress'].forEach((k) => { src[k] = 'Voice note'; });
    if (v.duration) src.duration = 'Voice note';
    if (t.linkedN) { v.duration = t.fmt(t.linkedMin); src.duration = 'Track Time · ' + t.linkedN + (t.linkedN === 1 ? ' entry' : ' entries'); }
    if (c.case && PSY.ev && PSY.ev.excerpt && g) PSY.ev.excerpt(c.case, 'ISP 2.0 · Goal 1', 'Individual Service Plan 2.0 · ' + g);
    return { values: v, src };
  }

  /* ---------- past notes (processed in Lauris; read-only). The 05/12 note is the six-month-old one Scan & Enhance improves as an addendum. ---------- */
  const PAST = {
    '4471': [
      { date: '2026-05-12', by: 'K. Hale', at: '05/12/2026 3:55 pm', direct: '5 h 10 min', units: 3, mood: 'Upset', progress: 'Returned to seat', text: 'Observed M.R. in class during math. He got upset when he was asked to switch tasks and left his seat. Staff talked with him and he went back to his seat. Will continue to monitor.' },
      { date: '2026-09-15', by: 'K. Hale', at: '09/15/2026 4:02 pm', direct: '5 h', units: 3, mood: 'Upset → calm', progress: 'Partial – strategy used after prompt', text: 'Worked with M.R. during morning group using QMHP 1.2 Coping skills practice to help him wait for his turn. When a peer took his turn he raised his voice; staff prompted him to use his calm-down card and he waited for the next turn (about 3 minutes, mild). Addresses ISP Objective 1. Today: 2 escalations, strategy used after a prompt in 1 of 2.' },
      { date: '2026-10-27', by: 'K. Hale', at: '10/27/2026 3:48 pm', direct: '5 h 5 min', units: 3, mood: 'Calm', progress: 'Met – strategy used on his own', text: 'Worked with M.R. using Clinical 2.1 Movement before the reading block to help him settle. He became frustrated with a worksheet and went to the calm-down corner on his own (about 4 minutes, mild), then returned to the reading group. Addresses ISP Objective 1: use a taught coping strategy before leaving the room in 4 of 5 escalations. Today: 1 escalation, strategy used on his own (1 of 1).' },
    ],
    '4441': [
      { date: '2026-09-22', by: 'K. Hale', at: '09/22/2026 3:40 pm', direct: '3 h 5 min', units: 2, mood: 'Calm', progress: 'Partial – turn-taking after prompt', text: 'Worked with T.N. in the lunch group using QMHP 1.7 Social skills coaching to practice taking turns. T.N. joined a card game and took turns with 1 prompt (about 25 minutes; mild frustration when losing a round). Addresses ISP Objective 1. Today: 1 escalation, strategy used after 1 prompt.' },
    ],
  };
  const pastOf = (cid, iso) => (PAST[cid] || []).find((p) => p.date === iso) || null;
  const addenda = (cid, iso) => (((PSY.state.dpn8 || {}).add || {})[cid + '|' + iso]) || [];
  const addendaHtml = (cid, iso) => {
    const list = addenda(cid, iso); if (!list.length) return '';
    return '<div class="l1b-sub">Addenda</div>' + list.map((a, i) => '<div class="l1b-add" data-dpn="addendum" data-i="' + i + '"><div class="l1b-addh"><b>Addendum</b> · ' + esc(a.at) + ' · ' + esc(a.by) + '</div><div class="in ro">' + esc(a.text) + '</div></div>').join('');
  };

  /* ---------- today's DPN in Lauris: values kept in PSY.state.boxes (l1b.dpn.<id>.f.<key>), the session date filled by Lauris ---------- */
  function setup(params) {
    const c = U.consumer(params.c, MR);
    const K = (n) => U.k('dpn', c.id, n);
    const L = PSY.data.lauris;
    const t = track(c.id); const mins = t.dayMin; const units = TT.units(mins, c.id);
    return { c, K, L, ent: t.all, mins, units };
  }
  const stored = (S) => { const v = blank(); KEYS.forEach((k) => { const x = U.get(S.K('f.' + k)); v[k] = x == null ? (k === 'date' ? TODAY_US : '') : String(x); }); return v; };
  const onDpn = (root, cid) => !!(root && root.isConnected !== false && PSY.current().id === 'lauris-dpn' && !PSY.current().params.past && (PSY.current().params.c || MR) === cid && root.querySelector('.lz-main [data-f="intervention"]'));
  const box = (root, k) => root.querySelector('.lz-main [data-f="' + k + '"]');
  /* what Lauris has now: the boxes on screen, else what was saved */
  function laurisVals(root, S) {
    const v = stored(S);
    if (onDpn(root, S.c.id)) KEYS.forEach((k) => { const el = box(root, k); if (el) v[k] = el.value; });
    return v;
  }
  const hasNote = (v) => KEYS.some((k) => k !== 'date' && norm(v[k]));
  /* write values into today's DPN (only the keys given). On screen the boxes are typed in (amber: typed by Psyflo). */
  async function writeFields(root, S, v, keys) {
    const before = stored(S); const changed = keys.filter((k) => norm(before[k]) !== norm(v[k]));
    keys.forEach((k) => U.set(S.K('f.' + k), v[k] || ''));
    changed.forEach((k) => U.set(S.K('a.' + k), !!norm(v[k])));
    U.set(S.K('inserted'), true);
    if (!onDpn(root, S.c.id)) return;
    const items = [];
    keys.forEach((k) => {
      const el = box(root, k); if (!el) return; const val = v[k] || '';
      if (norm(el.value) === norm(val)) return;
      if (!norm(val)) { el.value = ''; el.classList.remove('a'); return; }
      items.push({ id: k, html: esc(val), o: { frames: el.tagName === 'INPUT' ? 6 : 16, dt: 16 } });
    });
    if (items.length) await U.fill(root, items, { gap: 30 });
    if (!root.isConnected) return;
    keys.forEach((k) => { const el = box(root, k); if (!el) return; const val = v[k] || ''; if (el.value !== val) { el.value = val; el.classList.toggle('a', !!norm(val)); } });
  }
  /* a dated addendum below a note that is processed (today's) or past; the original is never changed */
  async function addAddendum(root, cid, iso, text) {
    const c = U.consumer(cid, MR); const key = cid + '|' + iso;
    const st = (PSY.state.dpn8 = PSY.state.dpn8 || {}); const m = (st.add = st.add || {});
    const a = { at: TODAY_US + ' ' + PSY.now(), by: scribeBy(), text: String(text == null ? '' : text) };
    (m[key] = m[key] || []).push(a); PSY.save();
    const bx = root && root.isConnected && PSY.current().id === 'lauris-dpn' && (PSY.current().params.c || MR) === cid && (PSY.current().params.past || TODAY) === iso && root.querySelector('[data-dpn="addenda"]');
    if (bx) { bx.innerHTML = addendaHtml(cid, iso); const last = bx.querySelector('[data-dpn="addendum"]:last-child'); if (last) { last.classList.add('sc8-hl'); try { last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} setTimeout(() => last.classList.remove('sc8-hl'), 1800); } }
    if (PSY.scribe && PSY.scribe.audit) PSY.scribe.audit(c.case, 'Addendum added to the Daily Progress Note of ' + fmt(iso), 'Daily Progress Note – TDT · ' + c.ini + ' · ' + fmt(iso));
    return { ok: true, mode: 'addendum', at: a.at };
  }

  /* ---------- units today (LCS, Lauris side panel): the day's Track Time and the one Confirm. DSS see units used, not what is left on the authorization. ---------- */
  const unitWord = (n) => n + (n === 1 ? ' unit' : ' units');
  const timeLink = ' <button class="l1b-lk" data-act="xp-view-time">Time</button>';
  PSY.acts['xp-view-time'] = () => PSY.ext.setView('time');
  function confirmHtml(S) {
    const { c, L, units, K, ent, mins } = S; const counted = U.get(K('counted')); const u = L.units(c); const auth = PSY.can('auth');
    if (u == null) return auth ? '<div class="xcard w" data-l1b="confirm"><div style="font-size:12.5px"><b>No authorization on file for ' + esc(c.ini) + '.</b></div></div>' : '';
    if (counted != null) return '<div class="xcard t" data-l1b="confirm"><div style="font-size:12.5px"><b>Counted</b> · ' + unitWord(counted) + ' used today for ' + esc(c.ini) + (auth ? ' · ' + u + ' left' : '') + '</div></div>';
    if (!ent.length) return '<div class="xcard w" data-l1b="confirm"><div style="font-size:12.5px"><b>No contact time for ' + esc(c.ini) + ' today.</b>' + timeLink + '</div></div>';
    if (!units) return '<div class="xcard w" data-l1b="confirm"><div style="font-size:12.5px"><b>No unit for today yet</b> · ' + esc(TT.fmt(mins)) + timeLink + '</div></div>';
    return '<div class="xcard t" data-l1b="confirm" style="display:flex;align-items:center;gap:10px"><div style="flex:1;font-size:12.5px"><b>' + unitWord(units) + ' used today for ' + esc(c.ini) + '?</b> · ' + esc(TT.fmt(mins)) + ' of contact time' + (auth ? ' · ' + u + ' → ' + Math.max(0, u - units) + ' left' : '') + timeLink + '</div><button class="btn p s" data-act="l1b-dpn-confirm">Confirm</button></div>';
  }
  /* the Track Time button and the Time view call this (through PSY.l1a.reTime) when today's contact time changes while a note is open */
  U.timeChanged = (root) => {
    try {
      const cur = PSY.current(); if (cur.id !== 'lauris-dpn' || cur.params.past) return;
      const S = setup(cur.params);
      const un = root.querySelector('[data-f="units"]'); if (un) { un.textContent = S.units == null ? '—' : S.units; un.title = TT.fmt(S.mins) + ' today'; }
      const card = root.querySelector('[data-l1b="confirm"]'); if (card) card.outerHTML = confirmHtml(S);
      if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus();
    } catch (e) {}
  };
  PSY.acts['l1b-dpn-confirm'] = (el, cx) => {
    const S = setup(cx.params); const { c, L, K, units } = S;
    if (U.get(K('counted')) != null) return;           // counted once per day
    const u0 = L.units(c); if (u0 == null || !units) return;
    const prev = PSY.flag('units-used.' + c.id) || 0;
    PSY.flag('units-used.' + c.id, prev + units);
    U.set(K('counted'), units);
    PSY.log(c.case, 'Daily note counted: ' + unitWord(units) + ' used on Oct 29 (' + u0 + ' → ' + L.units(c) + ' left on the authorization).', scribeBy());
    const card = cx.root.querySelector('[data-l1b="confirm"]'); if (card) { card.outerHTML = confirmHtml(setup(cx.params)); }
    const un = cx.root.querySelector('[data-l1b="units"]'); if (un) un.textContent = L.unitsLabel(c);
    PSY.ui.toast('Counted.');
  };

  /* ---------- Scribe ---------- */
  const isProc = (cid) => U.get(U.k('dpn', cid, 'processed')) || null;
  if (PSY.scribe && PSY.scribe.register) PSY.scribe.register('lauris-dpn', {
    type: 'dpn', kind: 'fields', child: (params) => U.consumer(params.c, MR),
    FIELDS, compose, parse,
    lines: (params) => voice(U.consumer(params.c, MR)),
    fields: (params) => dpnDraft(U.consumer(params.c, MR)),
    goals: (params) => goals(U.consumer(params.c, MR).id),
    track: (params) => track(U.consumer(params.c, MR).id),
    current: (root, params) => { const v = laurisVals(root, setup(params || {})); return hasNote(v) ? compose(v) : ''; },
    differs: (root, params, text) => { const v = laurisVals(root, setup(params || {})); const a = parse(text); return KEYS.some((k) => norm(v[k]) !== norm(a[k])); },
    processed: (params) => isProc(U.consumer((params || {}).c, MR).id),
    /* the approved version → Lauris. A processed note keeps its text: the fields that changed go in a dated addendum. */
    write: async (text, params, root) => {
      const S = setup(params || {}); const a = parse(text);
      if (isProc(S.c.id)) {
        const cur = stored(S); const ch = FIELDS.filter(([k]) => norm(a[k]) !== norm(cur[k]));
        if (!ch.length) return { ok: false, reason: 'Nothing new for an addendum' };
        return addAddendum(root, S.c.id, TODAY, ch.map(([k, l]) => l + ': ' + (norm(a[k]) || '—')).join('\n'));
      }
      await writeFields(root, S, a, KEYS);
      return { ok: true, mode: 'note' };
    },
  });

  /* extension-side hint (licensed staff): for a consumer whose next concurrent SRA will cite this note */
  function csHint(c) {
    const A = PSY.auth; if (!c.case || !A || !A.meta || !PSY.can('auth')) return '';
    const m = A.meta(c.case); if (m.kind !== 'continued' || !m.current || !/^tdt/.test(m.service || '')) return '';
    const st = A.status(c.case); if (['partial', 'denied', 'info', 'recon', 'appeal', 'closed'].indexOf(st) >= 0) return '';
    const u = A.units(c.case); const cur = u.current || {};
    const begun = st !== 'approved' || !!(PSY.state.cases[c.case] || {}).csStarted;
    const sent = ['ready', 'submitted', 'pending'].indexOf(st) >= 0;
    const line = sent || begun ? 'Concurrent SRA ' + u.period + ' · notes since ' + cur.start
      : 'Notes since ' + cur.start + ' · ' + cur.remaining + ' of ' + cur.authorized + ' units left · ends ' + cur.end;
    const btn = st === 'review' ? '<button class="btn o s" style="margin-top:8px" data-act="r5-focus" data-flow="continued" data-case="' + esc(c.case) + '">Open the concurrent SRA</button>' : '';
    return '<div class="xcard" data-psy="cs-hint"><div class="cap">Concurrent SRA</div><div class="tx" style="margin-top:3px;font-size:12.5px;line-height:1.45">' + esc(line) + '</div>' + btn + '</div>';
  }
  /* past notes for this consumer: links to the read-only Lauris page */
  function pastCard(c, on) {
    const list = PAST[c.id] || []; if (!list.length) return '';
    return '<div data-psy="dpn-past">' + U.cap('Past notes') + '<div class="xcard w" style="padding:2px 12px">' + list.slice().reverse().map((p) => '<div class="sec"' + (p.date === on ? ' style="font-weight:700"' : '') + '><b><a class="l1b-lk" data-go="lauris-dpn?c=' + c.id + '&amp;past=' + p.date + '">' + fmt(p.date) + '</a></b><span class="chip n">' + esc(p.by) + '</span></div>').join('') + '</div></div>';
  }

  function processOpts(S) {
    const { c, K } = S;
    return {
      key: K('processed'), required: [{ id: 'intervention', label: 'Intervention performed' }, { id: 'response', label: 'Consumer response' }],
      after: (root) => {
        const n = (PSY.flag('dpn-notes.' + c.id) || 0) + 1; PSY.flag('dpn-notes.' + c.id, n);
        const v = laurisVals(root, S); KEYS.forEach((k) => U.set(K('f.' + k), v[k]));
        PSY.flag('dpn-note.' + c.id + '.' + TODAY, compose(v));
        lock(root);
        PSY.log(c.case, 'Daily Progress Note for Oct 29 processed in Lauris.', scribeBy());
        if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus();
      },
      toast: 'Processed.',
      seeIt: c.case && PSY.can('platform') ? { to: c.id === MR ? 'draft-continued' : PSY.platform.caseRoute(c.case), label: 'See it in Psyflo', text: '' } : null,
    };
  }
  /* a processed note is read-only in Lauris */
  const lock = (root) => KEYS.forEach((k) => { const el = box(root, k); if (el) el.readOnly = true; });

  const roField = (label, html, x) => '<div class="l1b-f' + (x && x.cls ? ' ' + x.cls : '') + '"><label>' + label + '</label><div class="in ro"' + (x && x.attrs ? ' ' + x.attrs : '') + '>' + html + '</div></div>';
  function renderPast(c, iso) {
    const p = pastOf(c.id, iso);
    const sch = esc(c.school).replace(/^.*· /, 'School · ');
    const body = !p ? '<div class="lcard" style="padding:16px" data-dpn="none">No note on file for ' + esc(fmt(iso)) + '.</div>'
      : '<div class="l1b-g c4">' + roField('Service', 'H2016 (school day)') + roField('Setting', sch) + roField('Direct time', esc(p.direct)) + roField('Units', String(p.units)) + '</div>' +
        '<div class="l1b-g c2">' + roField('Objective addressed (from ISP 2.0)', esc(OBJ)) + roField('Interventions (ISP picklist)', INTS.map(esc).join(' &nbsp;·&nbsp; ')) + '</div>' +
        '<div class="l1b-g c2">' + roField('Mood check-in', esc(p.mood)) + roField('Progress today', esc(p.progress)) + '</div>' +
        roField('Narrative', esc(p.text), { cls: 'full', attrs: 'data-dpn="text" data-f="narr-past"' }) +
        '<div data-dpn="addenda">' + addendaHtml(c.id, iso) + '</div>' +
        '<div class="l1b-btns"><button class="lb" data-go="lauris-consumer?c=' + c.id + '&amp;tab=file">Close</button><span class="lmuted">Processed · read-only</span></div>';
    const main = '<div class="l1b-form" data-dpn="past" data-date="' + esc(iso) + '">' +
      U.head(c, { meta: 'Unique ID ' + c.id + ' · Age ' + c.age + ' · DOB on file · Group: ' + esc(c.group) + ' · Staff: ' + esc(c.staff) }) +
      U.tabs(c, 'file') + U.entry('Daily Progress Note – TDT', 'Session date ' + esc(fmt(iso)) + (p ? ' · ' + esc(p.by) : ''), p ? p.at : '') + body + '</div>';
    return PSY.lauris.page({ active: 'Saved Session', main, panel: { context: 'Daily Progress Note · ' + esc(c.ini) + ' · ' + esc(fmt(iso)), notes: '<div class="l1b-n">' + pastCard(c, iso) + '</div>', student: c.ini, case: c.case } });
  }

  const NOTE_CSS = `
.xp .l1b-n .sec b a{font-weight:600}
.lz-main .in.ro{background:#F4F5F7;color:#222}
.lz-main input.in{width:100%;box-sizing:border-box;font:inherit;color:#222}
.lz-main input.in[readonly],.lz-main textarea.in[readonly],.lz-main select.lsel[disabled]{background:#F4F5F7;color:#222;opacity:1}
.lz-main input.in.a[readonly],.lz-main textarea.in.a[readonly]{background:#FBF6E8}
.lz-main select.lsel.in{white-space:normal}
.lz-main .l1b-add{margin:0 0 10px}
.lz-main .l1b-addh{font-size:11.5px;color:#1F3B6B;margin:0 0 4px}
.lz-main .l1b-addh b{font-weight:700}
.lz-main .l1b-add .in{background:#FFFDF2;border-color:#E8D9A8}`;

  PSY.register({
    id: 'lauris-dpn', app: 'lauris', label: 'Daily Progress Note',
    url: (p) => 'consumers/' + ((p && p.c) || MR) + '/session/dpn' + (p && p.past ? '/' + p.past : ''),
    css: U.css + NOTE_CSS,
    render(params) {
      const S = setup(params); const { c, K } = S;
      if (params.past) return renderPast(c, params.past);
      const proc = U.get(K('processed')); const v = stored(S);
      const sch = esc(c.school).replace(/^.*· /, 'School · ');
      const ro = proc ? ' readonly' : '';
      const am = (k) => (U.get(K('a.' + k)) && norm(v[k]) ? ' a' : '');
      const inp = (k, label) => '<div class="l1b-f"><label>' + label + '</label><input class="in' + am(k) + '" data-f="' + k + '" value="' + esc(v[k]) + '" spellcheck="false"' + ro + '></div>';
      const area = (k, label, rows, cls) => '<div class="l1b-f' + (cls ? ' ' + cls : '') + '"><label>' + label + '</label><textarea class="in' + am(k) + '" data-f="' + k + '" rows="' + rows + '" spellcheck="false"' + ro + '>' + esc(v[k]) + '</textarea></div>';
      const main = '<div class="l1b-form" data-dpn="today">' +
        U.head(c, { meta: 'Unique ID ' + c.id + ' · Age ' + c.age + ' · DOB on file · Group: ' + esc(c.group) + ' · Staff: ' + esc(c.staff) }) +
        U.tabs(c, 'file') + U.entry('Daily Progress Note – TDT', 'Add Session · ' + TODAY_US + ' · ' + esc(PSY.lauris.user.short), proc) +
        '<div class="l1b-g c4">' + U.field(G('svc', 'Service', 'H2016 (school day)')) + U.field(G('setting', 'Setting', sch)) + inp('date', 'Service date') +
        '<div class="l1b-f"><label>Units today (auto)</label><div class="in" data-f="units" title="' + esc(TT.fmt(S.mins)) + ' today">' + (S.units == null ? '—' : S.units) + '</div></div></div>' +
        '<div class="l1b-g" style="grid-template-columns:minmax(0,3fr) minmax(0,1fr)">' + area('goal', 'Treatment goal (from ISP 2.0)', 2) + inp('duration', 'Duration') + '</div>' +
        '<div class="l1b-g c2">' + area('intervention', 'Intervention performed', 4) + area('response', 'Consumer response', 4) + '</div>' +
        '<div class="l1b-g c2">' + area('progress', 'Progress or barriers', 3) + area('needs', 'Continuing clinical needs', 3) + '</div>' +
        '<div data-dpn="addenda">' + addendaHtml(c.id, TODAY) + '</div>' +
        U.btns(proc, U.legend) + '</div>';
      const notes = '<div class="l1b-n">' + csHint(c) + (confirmHtml(S) ? '<div>' + U.cap('Units') + confirmHtml(S) + '</div>' : '') + pastCard(c) + '</div>';
      return PSY.lauris.page({ active: 'Add Session', main, panel: { context: 'Daily Progress Note · ' + esc(c.ini), notes, student: c.ini, case: c.case } });
    },
    mount(root, ctx) {
      if (ctx.params.past) return;
      const S = setup(ctx.params); const { K } = S;
      U.guardScribe(ctx);
      U.openPanel(K('panel'));
      /* typing in Lauris itself: Lauris keeps it (no longer amber), and the Scribe's sync state follows */
      const typed = (e) => {
        const t = e.target; const k = t && t.getAttribute && t.getAttribute('data-f'); if (!k || KEYS.indexOf(k) < 0) return;
        U.set(K('f.' + k), t.value); U.set(K('a.' + k), false); t.classList.remove('a');
        if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus();
      };
      root.addEventListener('input', typed); root.addEventListener('change', typed);
      root.__l1bForm = { process: (r) => { const o = processOpts(Object.assign({ root: r }, S)); return U.process(r, o); } };
      if (U.get(K('processed')) && processOpts(S).seeIt) PSY.ext.seeIt(root, processOpts(S).seeIt);
    },
  });


  /* ================= Collateral Contact and Monthly Summary (Lauris Add Session types) ================= */
  const SESS = {
    collateral: { route: 'lauris-collateral', title: 'Collateral Contact', url: 'collateral' },
    monthly: { route: 'lauris-monthly', title: 'Monthly Summary', url: 'monthly' },
  };
  /* the scripted conversations. Fictional; initials only; family details kept generic. The note restates only what was said. */
  function script(type, c) {
    const n = c.ini; const Y = 'You'; const sp = (t, who, text) => ({ t, who, text });
    if (type === 'collateral') {
      if (c.id === MR) {
        const g = 'Grandmother (guardian)';
        return {
          fields: { with: 'Parent/Guardian', method: 'Phone', mins: '9 min' },
          lines: [
            sp('0:04', Y, 'Hi, this is ' + me() + ' from Harvest, calling for our weekly check-in about M.R. I record these calls so my note is accurate. Is that okay?'),
            sp('0:15', g, 'Yes, that is fine.'),
            sp('0:30', Y, 'How has this week been at home?'),
            sp('1:05', g, 'Better. He used the calm-down corner twice when he got upset about homework.'),
            sp('3:10', Y, 'That is good to hear. At school he had a hard time at lunch yesterday, and he came back to class after a short walk with staff. How is bedtime going?'),
            sp('3:40', g, 'Still hard. He is up late most nights.'),
            sp('5:20', Y, 'Let us keep the bedtime routine we talked about. Anything you want me to pass on to his teacher?'),
            sp('6:55', g, 'Tell her he did his reading log every night this week.'),
            sp('8:30', Y, 'I will. Same time next week?'),
            sp('8:46', g, 'Yes. Thank you.'),
          ],
          note: 'Phone call with M.R.’s grandmother (guardian), 9 minutes, weekly family contact. The grandmother reported that M.R. used the calm-down corner at home twice this week when he was upset about homework, and that bedtime is still hard; he is up late most nights. Staff shared that M.R. had a hard time at lunch on 10/28 and came back to class after a short walk with staff. Staff and the grandmother agreed to keep the current bedtime routine. The grandmother asked staff to tell M.R.’s teacher that he did his reading log every night this week; staff will pass this on. Next call: same time next week.',
        };
      }
      if (c.id === '4441') {
        const s = 'School counselor';
        return {
          fields: { with: 'School counselor', method: 'Phone', mins: '7 min' },
          lines: [
            sp('0:05', Y, 'Hi, this is ' + me() + ' from Harvest, calling for our monthly check-in about T.N. I record these calls so my note is accurate. Is that okay?'),
            sp('0:14', s, 'Yes, go ahead.'),
            sp('0:40', Y, 'How has T.N. been doing in class this month?'),
            sp('1:20', s, 'Better in the mornings. After lunch T.N. needs reminders to stay seated.'),
            sp('2:45', Y, 'How many reminders on a usual afternoon?'),
            sp('3:02', s, 'Two or three.'),
            sp('4:30', Y, 'We will practice a seat break plan at lunch. Anything you want me to share with the family?'),
            sp('5:50', s, 'That T.N. joined the reading group twice this week without being asked.'),
            sp('6:40', Y, 'I will share it. Talk next month.'),
          ],
          note: 'Phone call with T.N.’s school counselor, 7 minutes, monthly school contact. The counselor reported that T.N. is doing better in the mornings and needs 2 to 3 reminders to stay seated on a usual afternoon after lunch. Staff will practice a seat break plan with T.N. at lunch. The counselor asked staff to tell the family that T.N. joined the reading group twice this week without being asked; staff will share it. Next contact: next month.',
        };
      }
      const g = 'Guardian';
      return {
        fields: { with: 'Parent/Guardian', method: 'Phone', mins: '6 min' },
        lines: [
          sp('0:04', Y, 'Hi, this is ' + me() + ' from Harvest, calling for our weekly check-in about ' + n + '. I record these calls so my note is accurate. Is that okay?'),
          sp('0:13', g, 'Yes, that is fine.'),
          sp('0:30', Y, 'How has this week been at home?'),
          sp('0:52', g, 'About the same. ' + n + ' has had a few hard evenings.'),
          sp('2:10', Y, 'What helps on the hard evenings?'),
          sp('2:35', g, 'Quiet time in the bedroom, and talking it through after.'),
          sp('4:05', Y, 'Let us keep doing that. Anything to share with the school?'),
          sp('4:20', g, 'No, not this week.'),
          sp('5:40', Y, 'Same time next week, then.'),
        ],
        note: 'Phone call with ' + n + '’s guardian, 6 minutes, weekly family contact. The guardian reported that the week was about the same, with a few hard evenings at home, and that quiet time and talking it through afterward help. Staff and the guardian agreed to keep doing this. The guardian had nothing to share with the school this week. Next call: same time next week.',
      };
    }
    /* monthly: the clinician's own summary, dictated */
    if (c.id === MR) return {
      fields: {},
      lines: [
        sp('0:03', 'Scribe', 'Monthly summary for M.R., October. Goal 1?'),
        sp('0:07', Y, 'Using a coping strategy before leaving the room: 3 of 5 escalations in the last 30 days, up from 1 of 6.'),
        sp('0:19', 'Scribe', 'Goal 2?'),
        sp('0:22', Y, 'Waiting for a turn in group games: 3 of 5 activities, up from 2 of 5. Holding steady.'),
        sp('0:33', 'Scribe', 'What did not go well?'),
        sp('0:36', Y, 'Two escalations, both in unstructured time. The shove at lunch on October 21, and leaving the building on October 6, one day of in-school suspension.'),
        sp('0:52', 'Scribe', 'Changes to the plan?'),
        sp('0:55', Y, 'On October 22 we added a named staff member at lunch and transitions, and a planned regulation break.'),
        sp('1:08', 'Scribe', 'Family and school contact?'),
        sp('1:11', Y, 'Weekly calls with his grandmother; she joined 11 of 12. The IEP review is set for November 4.'),
      ],
      note: 'Monthly Summary, October 2026 · M.R.\nGoal 1 (use a coping strategy before leaving the room): used first in 3 of 5 escalations in the last 30 days, up from 1 of 6.\nGoal 2 (wait for a turn in group games): 3 of 5 activities, up from 2 of 5; holding steady.\nTwo escalations, both in unstructured time: a shove at lunch on 10/21 and leaving the building on 10/06 (1 day of in-school suspension).\nPlan change on 10/22: a named staff member at lunch and transitions, and a planned regulation break.\nFamily and school: weekly calls with M.R.’s grandmother, who joined 11 of 12. IEP review set for 11/04.',
    };
    return {
      fields: {},
      lines: [
        sp('0:03', 'Scribe', 'Monthly summary for ' + n + ', October. How did goal 1 go?'),
        sp('0:07', Y, 'Coming along. ' + n + ' used the coping strategy with prompts on most days.'),
        sp('0:18', 'Scribe', 'Anything that did not go well?'),
        sp('0:21', Y, 'A few hard afternoons after lunch.'),
        sp('0:29', 'Scribe', 'Changes to the plan?'),
        sp('0:32', Y, 'No changes this month.'),
        sp('0:38', 'Scribe', 'Family contact?'),
        sp('0:41', Y, 'Weekly calls with the family.'),
      ],
      note: 'Monthly Summary, October 2026 · ' + n + '\nGoal 1: coming along; ' + n + ' used the coping strategy with prompts on most days.\nHard times: a few afternoons after lunch.\nPlan: no changes this month.\nFamily: weekly calls with the family.',
    };
  }
  const sk = (type, cid, name) => 'l8.' + type + '.' + cid + '.' + name;
  /* round 10: what Lauris already holds before any Scribe: a Collateral Contact saved on an earlier day (not processed yet) and the
     October Monthly Summary draft. Fictional; initials only. Scan & Enhance reads and enhances them; a session id is <laurisId>@<date>. */
  const SAVED = {
    collateral: {
      '4471': [{ date: '2026-10-27', by: 'K. Hale', at: '10/27/2026 3:35 pm', f: { with: 'Teacher', method: 'In person' }, note: 'Talked with M.R.’s teacher at pick-up. She says math is still hard for him. Lunch is going better. Will check in next week.' }],
      '4441': [{ date: '2026-10-26', by: 'K. Hale', at: '10/26/2026 3:10 pm', f: { with: 'School counselor', method: 'Phone' }, note: 'Talked with the school counselor. T.N. is doing better in the mornings. Afternoons are still hard. Will follow up next month.' }],
    },
  };
  const DRAFT = {
    monthly: {
      '4471': { by: 'J. Perez', at: '10/28/2026 4:40 pm', f: {}, note: 'October summary for M.R.\nHe is making progress on Goal 1.\nThere was one incident at lunch.\nWeekly calls with his grandmother continue.\nContinue TDT.' },
      '4441': { by: 'J. Perez', at: '10/28/2026 4:55 pm', f: {}, note: 'October summary for T.N.\nFewer incidents this month.\nHer mother is involved.\nThe plan stays the same.' },
    },
  };
  const isoOf = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : '');
  const seedOf = (type, cid, past) => (past ? (((SAVED[type] || {})[cid] || []).find((x) => x.date === past) || null) : ((DRAFT[type] || {})[cid] || null));
  const pkOf = (cid, past) => (past ? cid + '@' + past : cid);
  const noteOf = (type, cid, past) => { const v = U.get(sk(type, pkOf(cid, past), 'note')); if (v != null) return String(v); const s = seedOf(type, cid, past); return s ? s.note : ''; };
  const onSess = (root, type, cid, past) => !!(root && root.isConnected !== false && PSY.current().id === SESS[type].route && (PSY.current().params.c || MR) === cid && isoOf(PSY.current().params.past) === (past || '') && root.querySelector('.lz-main [data-f="note"]'));
  const sessAdd = (type, cid) => (((PSY.state.dpn8 || {}).sadd || {})[type + '|' + cid]) || [];
  const sessAddHtml = (type, cid) => {
    const list = sessAdd(type, cid); if (!list.length) return '';
    return '<div class="l1b-sub">Addenda</div>' + list.map((a, i) => '<div class="l1b-add" data-sess="addendum" data-i="' + i + '"><div class="l1b-addh"><b>Addendum</b> · ' + esc(a.at) + ' · ' + esc(a.by) + '</div><div class="in ro">' + esc(a.text) + '</div></div>').join('');
  };
  function sessGet(type) {
    return (root, params) => { const c = U.consumer((params || {}).c, MR); const ta = onSess(root, type, c.id) ? root.querySelector('.lz-main [data-f="note"]') : null; return ta ? ta.value : noteOf(type, c.id, ''); };
  }
  /* the approved version → Lauris. A processed session keeps its text: what is new goes in a dated addendum. */
  function sessWrite(type) {
    return async (text, params, root) => {
      const c = U.consumer((params || {}).c, MR); const X = script(type, c); text = String(text == null ? '' : text);
      if (U.get(sk(type, c.id, 'processed'))) {
        const cur = noteOf(type, c.id, '');
        if (norm(cur) === norm(text)) return { ok: false, reason: 'Nothing new for an addendum' };
        const add = cur && text.indexOf(cur) === 0 ? text.slice(cur.length).trim() : text;
        const st = (PSY.state.dpn8 = PSY.state.dpn8 || {}); const m = (st.sadd = st.sadd || {});
        const a = { at: TODAY_US + ' ' + PSY.now(), by: scribeBy(), text: add }; (m[type + '|' + c.id] = m[type + '|' + c.id] || []).push(a); PSY.save();
        const bx = onSess(root, type, c.id) && root.querySelector('[data-sess="addenda"]'); if (bx) bx.innerHTML = sessAddHtml(type, c.id);
        if (PSY.scribe && PSY.scribe.audit) PSY.scribe.audit(c.case, 'Addendum added to the ' + SESS[type].title + ' of ' + TODAY_US, SESS[type].title + ' · ' + c.ini + ' · ' + TODAY_US);
        return { ok: true, mode: 'addendum' };
      }
      U.set(sk(type, c.id, 'note'), text); U.set(sk(type, c.id, 'typed'), true);
      if (!onSess(root, type, c.id)) return { ok: true, mode: 'note' };
      const items = Object.keys(X.fields).filter((f) => root.querySelector('.lz-main [data-f="' + f + '"]')).map((f) => ({ id: f, html: f === 'mins' ? esc(X.fields[f]) : X.fields[f], o: { frames: 6, ms: 80 } }));
      items.push({ id: 'note', html: esc(text), o: { frames: 18, dt: 16 } });
      await U.fill(root, items, { gap: 30 });
      if (!root.isConnected) return { ok: true, mode: 'note' };
      const ta = root.querySelector('.lz-main [data-f="note"]'); if (ta && ta.value !== text) { ta.value = text; ta.classList.add('a'); }
      return { ok: true, mode: 'note' };
    };
  }
  const sel = (id, label, opts, v, a) => '<div class="l1b-f"><label>' + label + '</label><select class="lsel' + ((a === undefined ? v : a) ? ' a' : '') + '" data-f="' + id + '"><option value=""></option>' + opts.map((o) => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
  Object.keys(SESS).forEach((type) => {
    const D = SESS[type];
    if (PSY.scribe && PSY.scribe.register) PSY.scribe.register(D.route, {
      type, kind: 'note', child: (params) => U.consumer(params.c, MR),
      lines: (params) => script(type, U.consumer(params.c, MR)).lines,
      note: (params) => script(type, U.consumer(params.c, MR)).note,
      current: sessGet(type), write: sessWrite(type),
      differs: (root, params, text) => norm(sessGet(type)(root, params)) !== norm(text),
      processed: (params) => U.get(sk(type, U.consumer((params || {}).c, MR).id, 'processed')) || null,
    });
    PSY.register({
      id: D.route, app: 'lauris', label: D.title, tabTitle: 'Lauris Online — ' + D.title,
      url: (p) => 'consumers/' + ((p && p.c) || MR) + '/session/' + D.url,
      css: U.css + NOTE_CSS,
      render(params) {
        const c = U.consumer(params.c, MR); const past = isoOf(params.past); const pk = pkOf(c.id, past); const k = (n) => sk(type, pk, n);
        const seed = seedOf(type, c.id, past); const stored = U.get(k('note'));
        if (past && !seed && stored == null) return PSY.lauris.page({ active: 'Saved Session', main: '<div class="l1b-form">' + U.head(c, { meta: 'Unique ID ' + c.id }) + U.tabs(c, 'file') + '<div class="lcard" style="padding:16px" data-sess="none">No ' + esc(D.title) + ' on file for ' + esc(fmt(past)) + '.</div></div>', panel: { context: D.title + ' · ' + esc(c.ini), notes: '', student: c.ini, case: c.case } });
        const typed = !!U.get(k('typed')); const proc = U.get(k('processed')); const note = stored != null ? String(stored) : seed ? seed.note : ''; const X = script(type, c);
        const enh = !!U.get(k('enh'));
        const v = (f) => { const x = U.get(k('f.' + f)); return x != null ? String(x) : typed ? X.fields[f] || '' : (seed && seed.f && seed.f[f]) || ''; };
        const am = (f) => (U.get(k('f.' + f)) != null ? enh : typed);
        const dUS = past ? fmt(past) : TODAY_US;
        const top = type === 'collateral'
          ? '<div class="l1b-g c4">' + U.field(G('cdate', 'Contact date', dUS)) + sel('with', 'Contact with', ['Parent/Guardian', 'Teacher', 'School counselor', 'Other provider'], v('with'), am('with') && !!v('with')) + sel('method', 'Contact method', ['Phone', 'In person', 'Video'], v('method'), am('method') && !!v('method')) +
            U.field({ id: 'mins', label: 'Duration', src: 'a', html: esc(v('mins')), ph: '' }, !!v('mins')) + '</div>'
          : '<div class="l1b-g c4">' + U.field(G('period', 'Summary period', '10/01/2026 – 10/31/2026')) + U.field(G('svc', 'Service', 'H2016 (school day)')) + U.field(G('setting', 'Setting', esc(c.school).replace(/^.*· /, 'School · '))) + U.field(G('staff', 'Staff', esc(PSY.lauris.user.short))) + '</div>' +
            '<div class="l1b-g c2">' + U.field(G('obj', 'ISP 2.0 objective', esc(OBJ)), false) + '</div>';
        const main = '<div class="l1b-form" data-sess="' + type + '">' +
          U.head(c, { meta: 'Unique ID ' + c.id + ' · Age ' + c.age + ' · DOB on file · Group: ' + esc(c.group) + ' · Staff: ' + esc(c.staff) }) +
          U.tabs(c, 'file') + U.entry(D.title, seed && stored == null ? 'Saved ' + esc(seed.at) + ' · ' + esc(seed.by) : 'Add Session · ' + dUS + ' · ' + esc(PSY.lauris.user.short), proc) + top +
          U.field({ id: 'note', label: type === 'collateral' ? 'Contact note' : 'Summary', kind: 'ta', rows: type === 'collateral' ? 9 : 11, html: esc(note), ph: '', cls: 'full' }, !!note) +
          '<div data-sess="addenda">' + sessAddHtml(type, pk) + '</div>' +
          U.btns(proc, U.legend) + '</div>';
        return PSY.lauris.page({ active: past ? 'Saved Session' : 'Add Session', main, panel: { context: D.title + ' · ' + esc(c.ini) + (past ? ' · ' + fmt(past) : ''), notes: '', student: c.ini, case: c.case } });
      },
      mount(root, ctx) {
        const c = U.consumer(ctx.params.c, MR); const past = isoOf(ctx.params.past); const k = (n) => sk(type, pkOf(c.id, past), n);
        U.guardScribe(ctx);
        const ta0 = root.querySelector('[data-f="note"]'); if (ta0 && !U.get(k('typed')) && !U.get(k('enh'))) ta0.classList.remove('a');
        if (ta0 && U.get(k('processed'))) ta0.readOnly = true;
        root.addEventListener('input', (e) => {
          const t = e.target; const f = t && t.getAttribute ? t.getAttribute('data-f') : null;
          if (f === 'note') { U.set(k('note'), t.value); t.classList.remove('a'); if (PSY.scribe.paintStatus) PSY.scribe.paintStatus(); }
          else if (f === 'mins') { U.set(k('f.mins'), t.textContent); t.classList.remove('a'); }
        });
        root.addEventListener('change', (e) => { const t = e.target; const f = t && t.getAttribute ? t.getAttribute('data-f') : null; if (f === 'with' || f === 'method') { U.set(k('f.' + f), t.value); t.classList.remove('a'); } });
        root.__l1bForm = { process: (r) => U.process(r, {
          key: k('processed'), required: [{ id: 'note', label: type === 'collateral' ? 'Contact note' : 'Summary' }],
          after: (rr) => { const t = rr.querySelector('[data-f="note"]'); if (t) { U.set(k('note'), t.value); t.readOnly = true; } PSY.log(c.case, D.title + ' for Oct 29 processed in Lauris.', scribeBy()); if (PSY.scribe.paintStatus) PSY.scribe.paintStatus(); },
          toast: 'Processed.',
        }) };
      },
    });
  });

  /* ================= PSY.dpn: the DPN on screen, for Scan & Enhance (owner B9) and Track Time (owner T9) ================= */
  const info = (root) => {
    const cur = PSY.current(); if (cur.id !== 'lauris-dpn') return null;
    root = root || PSY.activeRoot(); const S = setup(cur.params); const iso = cur.params.past || null;
    return { consumer: S.c.id, ini: S.c.ini, case: S.c.case || null, past: iso, date: fmt(iso || TODAY), processed: iso ? !!pastOf(S.c.id, iso) : !!U.get(S.K('processed')),
      by: iso ? (pastOf(S.c.id, iso) || {}).by || '' : PSY.lauris.user.short, addenda: addenda(S.c.id, iso || TODAY).slice(), root, key: dpnKey(S.c.id) };
  };
  PSY.dpn = {
    PAST, FIELDS, compose, parse, key: dpnKey, goals, track,
    past: (cid) => (PAST[cid] || []).map((p) => ({ iso: p.date, date: fmt(p.date), at: p.at, by: p.by, go: 'lauris-dpn?c=' + cid + '&past=' + p.date })),
    info,
    /* today's DPN as Lauris has it (null on a past note) */
    fields: (root) => { const i = info(root); if (!i || i.past) return null; return laurisVals(i.root, setup({ c: i.consumer })); },
    /* the note on screen: today's fields as labelled text ('' while empty), or the original text of a past note (addenda are in info(root).addenda) */
    text: (root) => {
      const i = info(root); if (!i) return '';
      if (i.past) { const p = pastOf(i.consumer, i.past); return p ? p.text : ''; }
      const v = laurisVals(i.root, setup({ c: i.consumer })); return hasNote(v) ? compose(v) : '';
    },
    /* write into Lauris. A past note, or today's with { addendum:true }, gets a dated addendum below the original; a processed note refuses
       anything else. Today's note: text is labelled (only the labels given are written; unlabelled text is the intervention) or a { key: value } object. */
    push: async (root, text, o) => {
      o = o || {}; const i = info(root); if (!i) return { ok: false, reason: 'Not a Daily Progress Note' };
      const obj = !!text && typeof text === 'object';
      if (i.past || o.addendum) {
        const t = obj ? FIELDS.filter(([k]) => norm(text[k])).map(([k, l]) => l + ': ' + text[k]).join('\n') : String(text == null ? '' : text);
        return addAddendum(i.root, i.consumer, i.past || TODAY, t);
      }
      if (i.processed) return { ok: false, reason: 'Processed in Lauris' };
      const S = setup({ c: i.consumer }); let v; let keys;
      if (obj) { v = Object.assign(blank(), text); keys = KEYS.filter((k) => k in text); } else { const r = parseWith(text); v = r.v; keys = KEYS.filter((k) => r.has[k]); }
      await writeFields(i.root, S, v, keys);
      const Sc = PSY.scribe;
      if (Sc && o.via !== 'Scribe') {
        const c = Sc.ctx(); if (Sc.external) Sc.external(c, compose(laurisVals(i.root, S)), o.via || 'Scan & Enhance');
        const h = Sc.handlers['lauris-dpn']; if (Sc.record && h) Sc.record(c, h, '');
        if (Sc.paintStatus) Sc.paintStatus();
      }
      return { ok: true, mode: 'note', at: PSY.now() };
    },
    /* round 10 (Scan & Enhance): a Collateral Contact or Monthly Summary as Lauris holds it; past = the date of a saved earlier session ('' = today's) */
    session: (type, cid, past) => {
      const c = U.consumer(cid, MR); past = isoOf(past); const k = (n) => sk(type, pkOf(c.id, past), n); const seed = seedOf(type, c.id, past);
      const stored = U.get(k('note')); const typed = !!U.get(k('typed')); const X = script(type, c);
      const fv = (f) => { const x = U.get(k('f.' + f)); return x != null ? String(x) : typed ? X.fields[f] || '' : (seed && seed.f && seed.f[f]) || ''; };
      return { type, cid: c.id, past, date: fmt(past || TODAY), note: noteOf(type, c.id, past), f: { with: fv('with'), method: fv('method'), mins: fv('mins') },
        processed: U.get(k('processed')) || null, saved: seed && stored == null ? { by: seed.by, at: seed.at } : null, addenda: sessAdd(type, pkOf(c.id, past)).slice(),
        route: SESS[type].route + '?c=' + c.id + (past ? '&past=' + past : '') };
    },
    /* the sessions of that type Lauris holds for the consumer, newest first: today's (when it has text), then the saved earlier ones */
    sessions: (type, cid) => {
      const c = U.consumer(cid, MR); const out = [];
      if (norm(noteOf(type, c.id, ''))) out.push({ past: '', date: TODAY_US });
      (((SAVED[type] || {})[c.id]) || []).map((x) => x.date).sort().reverse().forEach((d) => { if (norm(noteOf(type, c.id, d))) out.push({ past: d, date: fmt(d) }); });
      return out;
    },
    /* write the approved version into the session (the note, the duration); a processed session takes a dated addendum instead */
    sessionPush: async (root, type, cid, past, vals, o) => {
      o = o || {}; vals = vals || {}; const c = U.consumer(cid, MR); past = isoOf(past); const pk = pkOf(c.id, past); const k = (n) => sk(type, pk, n);
      const when = fmt(past || TODAY);
      if (U.get(k('processed'))) {
        const t = String(o.addendum || '').trim(); if (!t) return { ok: false, reason: 'Nothing new for an addendum' };
        const st = (PSY.state.dpn8 = PSY.state.dpn8 || {}); const m = (st.sadd = st.sadd || {});
        (m[type + '|' + pk] = m[type + '|' + pk] || []).push({ at: TODAY_US + ' ' + PSY.now(), by: scribeBy(), text: t }); PSY.save();
        const bx = onSess(root, type, c.id, past) && root.querySelector('[data-sess="addenda"]'); if (bx) bx.innerHTML = sessAddHtml(type, pk);
        if (PSY.scribe && PSY.scribe.audit) PSY.scribe.audit(c.case, 'Addendum added to the ' + SESS[type].title + ' of ' + when, SESS[type].title + ' · ' + c.ini + ' · ' + when);
        return { ok: true, mode: 'addendum' };
      }
      if (vals.mins != null) U.set(k('f.mins'), String(vals.mins));
      if (vals.note != null) U.set(k('note'), String(vals.note));
      U.set(k('enh'), true);
      if (onSess(root, type, c.id, past)) {
        const items = [];
        const mb = root.querySelector('.lz-main [data-f="mins"]');
        if (vals.mins != null && mb && norm(mb.textContent) !== norm(vals.mins)) items.push({ id: 'mins', html: esc(vals.mins), o: { frames: 6, dt: 16 } });
        const ta = root.querySelector('.lz-main [data-f="note"]');
        if (vals.note != null && ta && ta.value !== String(vals.note)) items.push({ id: 'note', html: esc(vals.note), o: { frames: 18, dt: 16 } });
        if (items.length) await U.fill(root, items, { gap: 30 });
        if (root.isConnected) {
          if (ta && vals.note != null && ta.value !== String(vals.note)) ta.value = String(vals.note);
          if (ta && vals.note != null) ta.classList.add('a');
          if (mb && vals.mins != null && norm(mb.textContent) !== norm(vals.mins)) { mb.textContent = String(vals.mins); mb.classList.add('a'); }
        }
      }
      if (PSY.scribe && PSY.scribe.audit) PSY.scribe.audit(c.case, (o.via || 'Scan & Enhance') + ': ' + SESS[type].title + ' of ' + when + ' updated in Lauris', SESS[type].title + ' · ' + c.ini + ' · ' + when);
      return { ok: true, mode: 'note' };
    },
  };
})();
