/* The DMAS authorization form as Lauris shows it (route lauris-dmas is registered in 72-dmas-reco-panel.js, which adds the extension panel).
   Two forms: the TDT (H2016) INITIAL Service Authorization Request (July 2021) and the CMHRS CONTINUED STAY request (Dec 2021).
   Boxes are updated in place (never PSY.refresh): PSY.l2.form.drawBox(root, case, key). What the extension typed is kept in state (see 70-l2-util.js).
   Colours: green = Lauris filled it from the record · amber = typed by Psyflo for the clinician to check · white = text Lauris already saved. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const esc = PSY.esc;
  const F = (L2.form = L2.form || {});

  /* ------------------------------------------------------------------ sections (index on the left) */
  const SECS = {
    init: [['head', 'Member and provider'], ['req', 'Request and diagnosis'], ['s1', 'I · Eligibility'], ['s2', 'II · Care coordination'], ['s3', 'III · Trauma-informed care'], ['s4', 'IV · Treatment goals'], ['s5', 'V · Discharge'], ['att', 'Attestation'], ['notes', 'Notes section']],
    cont: [['head', 'Member and provider'], ['req', 'Request and diagnosis'], ['s1', 'I · Care coordination'], ['s2', 'II · Treatment progress'], ['s3', 'III · Discharge planning'], ['att', 'Attestation'], ['notes', 'Notes section']],
  };
  F.SECS = SECS;
  /* which section a field key belongs to */
  F.secOf = (kind, key) => {
    if (key === 'notes') return 'notes';
    if (/^(m|p)\./.test(key) || key === 'proc' || key === 'school' || key === 'svc') return 'head';
    if (/^(req|icd|med|admit|avg)/.test(key)) return 'req';
    if (/^att|^addl|^sig/.test(key)) return 'att';
    if (kind === 'init') {
      if (/^(crit|loc|sch\.)/.test(key)) return 's1';
      if (/^(pcp|other|svc|coordplan)/.test(key)) return 's2';
      if (/^(trauma|sec3)/.test(key)) return 's3';
      if (/^(dsch|dloc|ddate)/.test(key)) return 's5';
      return 's4';
    }
    if (/^(svc|coordsince)/.test(key)) return 's1';
    if (/^(dsch|dloc|ddate)/.test(key)) return 's3';
    return 's2';
  };

  /* ------------------------------------------------------------------ what a box holds */
  const targetOf = (cid, a) => (PSY.reco && PSY.reco.target ? PSY.reco.target(cid, a) : { key: (a.lauris || {}).key, mode: (a.lauris || {}).mode || 'replace' });
  const segState = (cid, aid) => L2.get(L2.k(cid, 't', aid), null);
  const filledGroup = (cid, g) => !!L2.get(L2.k(cid, 'filled'), false) || !!(L2.get(L2.k(cid, 'fl'), {}) || {})[g];
  const ynOf = (cid, key) => { const o = L2.get(L2.k(cid, 'yn', key), null); return o === null ? undefined : o; };
  F.locked = () => false; // a processed form can still be edited until it is signed

  /* the model of one box: base text, typed segments, tone, what is recommended here.
     Text layers, last one wins for the base: the saved/drafted text (content) < text the Scribe typed into a box that is not in a draft group (l2.<case>.sc.<key>)
     < text the clinician typed or pasted by hand (l2.<case>.u.<key>, shown white: "typed by you"). Segments typed for a recommended action sit after the base. */
  F.boxModel = (cid, key) => {
    const C = (L2.content(cid) || {})[key] || { t: '', tone: '' };
    const fill = L2.fillable(cid);
    const groupPending = !!(C.g && fill && !filledGroup(cid, C.g));
    const user = L2.get(L2.k(cid, 'u', key), null);
    const scr = L2.get(L2.k(cid, 'sc', key), null);
    let base = scr ? String(scr.text || '') : (groupPending ? '' : String(C.t || ''));
    const segs = []; const pend = [];
    if (PSY.reco) {
      PSY.reco.list(cid).forEach((a) => {
        const t = targetOf(cid, a); if (!t || t.key !== key) return;
        const s = segState(cid, a.id);
        if (s) segs.push({ aid: a.id, text: s.text || '', mode: t.mode, done: !!a.done });
        else if (!a.done && !a.dismissed) pend.push(a);
      });
    }
    const replaced = segs.some((s) => s.mode === 'replace');
    if (replaced) base = '';
    const baseDefault = base;
    if (user) base = String(user.text || '');
    const typed = segs.length > 0;
    let tone = typed ? 'a' : (user ? '' : scr ? 'a' : (groupPending ? '' : (C.tone || '')));
    if (!typed && !base) tone = '';
    return { C, base, baseDefault, segs, pend, tone, typed, groupPending, group: C.g || null, user: !!user, scr: !!scr };
  };
  /* every box key of the form that can hold text: the content, the boxes recommendations write into, and what was typed by the Scribe or by hand */
  F.keys = (cid) => {
    const set = new Set(Object.keys(L2.content(cid) || {}));
    if (PSY.reco) PSY.reco.list(cid).forEach((a) => { const t = targetOf(cid, a); if (t && t.key) set.add(t.key); });
    const pu = 'l2.' + cid + '.u.', ps = 'l2.' + cid + '.sc.';
    Object.keys(PSY.state.boxes || {}).forEach((k) => { if (k.indexOf(pu) === 0) set.add(k.slice(pu.length)); else if (k.indexOf(ps) === 0) set.add(k.slice(ps.length)); });
    return Array.from(set);
  };
  /* the text of every box as it reads now (for the checks) */
  F.allTexts = (cid) => {
    const out = [];
    F.keys(cid).forEach((k) => {
      if (/\.(yn|cur)$/.test(k) || /^(req|m|p)\./.test(k)) return;
      const m = F.boxModel(cid, k); const t = [m.base].concat(m.segs.map((s) => s.text)).filter(Boolean).join(' ');
      if (t) out.push({ key: k, text: t });
    });
    return out;
  };
  /* how many boxes Psyflo typed (amber) and how many the clinician typed or pasted (white) */
  F.tally = (cid) => {
    let psyflo = 0, you = 0;
    F.keys(cid).forEach((k) => {
      if (/\.(yn|cur)$/.test(k)) return;
      const m = F.boxModel(cid, k); const has = !!(m.base || m.segs.some((s) => s.text));
      if (!has) return;
      if (m.user && !m.typed) you++; else if (m.tone === 'a') psyflo++;
    });
    return { psyflo, you };
  };
  F.ynValue = (cid, key) => {
    const o = ynOf(cid, key); if (o !== undefined) return o;
    const C = (L2.content(cid) || {})[key]; if (!C) return '';
    if (C.g && L2.fillable(cid) && !filledGroup(cid, C.g)) return '';
    return C.t || '';
  };

  /* the little tag above a box */
  F.tagOf = (cid, m) => {
    if (m.segs.length) {
      const allDone = m.segs.every((s) => s.done);
      const empty = m.segs.every((s) => !s.text);
      if (empty) return { c: 't3', t: 'Decision recorded · nothing added' };
      return allDone ? { c: 't2', t: 'Typed by Psyflo · you checked it' } : { c: 't1', t: 'Typed by Psyflo · check it' };
    }
    if (m.user && m.base) return { c: 't4', t: 'Typed by you' };
    if (m.pend.length) return { c: 't0', t: m.pend.length > 1 ? m.pend.length + ' recommendations here' : 'Recommended' };
    if (m.scr && m.base) return { c: 't1', t: 'Typed by Psyflo · check it' };
    if (m.C.tone === 'a' && !m.groupPending && L2.fillable(cid)) return { c: 't1', t: 'Typed by Psyflo · check it' };
    return null;
  };

  /* inner html of a box: base text and typed segments. o.typingBase = true / o.typing = actionId while Psyflo types.
     The box itself is the editing host (contenteditable="plaintext-only"), so the clinician can type or paste anywhere in it; an empty box shows its placeholder from CSS. */
  F.boxInner = (cid, key, o) => {
    o = o || {};
    const m = F.boxModel(cid, key);
    let h = '';
    if (o.typingBase) h += '<span class="dm-base typing" data-typing-base></span>';
    else if (m.base) h += '<span class="dm-base">' + esc(m.base) + '</span>';
    m.segs.forEach((s) => {
      const typing = o.typing && o.typing === s.aid;
      if (!s.text && !typing) return;
      h += (h ? ' ' : '') + '<span class="dm-seg' + (s.done ? ' ck' : '') + (typing ? ' typing' : '') + '" data-aid="' + esc(s.aid) + '">' + (typing ? '' : esc(s.text)) + '</span>';
    });
    return { html: h, m };
  };
  const phText = (cid, m) => 'Empty';
  const ED = () => (F.locked() ? '' : ' contenteditable="plaintext-only" spellcheck="false"');

  /* ------------------------------------------------------------------ redraw one box in place */
  F.drawBox = (root, cid, key, o) => {
    const el = root.querySelector('[data-fk="' + key + '"]'); if (!el) return null;
    const typing = !!(o && (o.typing || o.typingBase));
    const r = F.boxInner(cid, key, o || {});
    if (el.hasAttribute('data-ph')) el.setAttribute('data-phtext', phText(cid, r.m));
    el.innerHTML = r.html;
    el.classList.remove('g', 'a');
    if (r.m.tone) el.classList.add(r.m.tone);
    if (typing) el.setAttribute('contenteditable', 'false'); else if (!F.locked(cid)) el.setAttribute('contenteditable', 'plaintext-only');
    const tg = root.querySelector('[data-tag="' + key + '"]');
    if (tg) { const t = typing ? { c: 't1', t: 'Typing…' } : F.tagOf(cid, r.m); tg.className = 'dm-tag' + (t ? ' ' + t.c : ' none'); tg.textContent = t ? t.t : ''; }
    return el;
  };
  /* colour and tag of a box after the clinician edited it (the text itself is not touched, so the caret stays) */
  F.paintBox = (root, cid, key) => {
    const el = root.querySelector('[data-fk="' + key + '"]'); if (!el) return;
    const m = F.boxModel(cid, key);
    el.classList.remove('g', 'a'); if (m.tone) el.classList.add(m.tone);
    const tg = root.querySelector('[data-tag="' + key + '"]');
    if (tg) { const t = F.tagOf(cid, m); tg.className = 'dm-tag' + (t ? ' ' + t.c : ' none'); tg.textContent = t ? t.t : ''; }
  };
  /* the clinician typed or pasted into a box: keep it in state (l2.<case>.u.<key>) and count it as "typed by you" (white) */
  F.readBox = (root, cid, box) => {
    const key = box.getAttribute('data-fk'); if (!key || box.querySelector('.typing')) return;
    const m = F.boxModel(cid, key);
    m.segs.forEach((s) => {
      const sp = box.querySelector('.dm-seg[data-aid="' + s.aid + '"]'); const k = L2.k(cid, 't', s.aid); const st = L2.get(k, null); if (!st) return;
      const tx = sp ? sp.textContent : ''; if (tx !== st.text) { st.text = tx; L2.set(k, st); }
    });
    const c = box.cloneNode(true); c.querySelectorAll('.dm-seg').forEach((n) => n.remove());
    const own = c.textContent.replace(/\u00a0/g, ' ').trim();
    const uk = L2.k(cid, 'u', key);
    if (own === String(m.baseDefault || '').trim()) { if (L2.get(uk, null)) L2.del(uk); }
    else L2.set(uk, { text: own, at: PSY.now() });
    F.paintBox(root, cid, key);
    if (F.onEdit) F.onEdit(root, cid, key);
  };
  F.drawYn = (root, cid, key) => {
    const el = root.querySelector('[data-yn="' + key + '"]'); if (!el) return;
    const v = F.ynValue(cid, key);
    el.querySelectorAll('[data-v]').forEach((b) => { const on = b.getAttribute('data-v') === v; b.classList.toggle('on', on); b.firstChild.textContent = on ? '☑' : '☐'; });
  };
  F.drawAll = (root, cid) => {
    root.querySelectorAll('[data-fk]').forEach((el) => F.drawBox(root, cid, el.getAttribute('data-fk')));
    root.querySelectorAll('[data-yn]').forEach((el) => F.drawYn(root, cid, el.getAttribute('data-yn')));
    F.drawIndex(root, cid);
  };
  /* the index on the left: pending recommendations per section */
  F.drawIndex = (root, cid) => {
    const kind = L2.kind(cid); const cnt = {};
    if (PSY.reco) PSY.reco.list(cid).forEach((a) => { if (a.done || a.dismissed) return; const t = targetOf(cid, a); const s = F.secOf(kind, t.key); cnt[s] = (cnt[s] || 0) + 1; });
    root.querySelectorAll('[data-idx]').forEach((el) => {
      const n = cnt[el.getAttribute('data-idx')] || 0; let b = el.querySelector('.n');
      if (n && !b) { b = document.createElement('span'); b.className = 'n'; el.appendChild(b); }
      if (b) { if (n) b.textContent = n; else b.remove(); }
    });
  };

  /* ------------------------------------------------------------------ typing animation */
  F.timers = F.timers || new Set();
  F.stopTimers = () => { F.timers.forEach((t) => clearInterval(t)); F.timers.clear(); };
  /* o.fast: the Scribe types the whole form, so each box takes about half a second */
  function typeInto(el, text, done, o) {
    if (!el) { if (done) done(); return; }
    if (L2.reduceMotion() || !text) { el.textContent = text; if (done) done(); return; }
    const fast = !!(o && o.fast);
    let i = 0; const step = fast ? Math.max(3, Math.ceil(text.length / 26)) : Math.max(2, Math.ceil(text.length / 45));
    const t = setInterval(() => {
      i = Math.min(text.length, i + step); el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(t); F.timers.delete(t); if (done) done(); }
    }, fast ? 16 : 28);
    F.timers.add(t);
  }
  F.typeInto = typeInto;
  F.scrollToKey = (root, key, flash) => {
    const el = root.querySelector('[data-fk="' + key + '"]'); if (!el) return;
    const wrap = el.closest('.dm-f') || el;
    L2.scrollMain(root, wrap, 110);
    if (flash) { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 1900); }
  };
  /* keep the box Psyflo is typing in view: scroll only when it is outside the form's window (the section index follows by itself) */
  F.follow = (root, key) => {
    const el = root.querySelector('[data-fk="' + key + '"]'); const main = root.querySelector('.lz-main'); if (!el || !main) return;
    const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    if (r.bottom > m.bottom - 80 || r.top < m.top + 8) L2.scrollMain(root, el.closest('.dm-f') || el, 110, false);
  };
  /* highlight a section in the index on the left */
  F.markIndex = (root, sec) => { root.querySelectorAll('[data-idx]').forEach((a) => a.classList.toggle('on', a.getAttribute('data-idx') === sec)); };
  /* Psyflo types text into the box of an action (state is written first, so it survives a tab switch). o = { quiet, fast } */
  F.typeSegment = (root, cid, a, text, extra, done, o) => {
    const t = targetOf(cid, a); o = o || {};
    L2.set(L2.k(cid, 't', a.id), Object.assign({ text, at: PSY.now() }, extra || {}));
    if (t.yn) { if (ynOf(cid, t.yn) === undefined) { L2.set(L2.k(cid, 'yn', t.yn), 'y'); L2.set(L2.k(cid, 'ynby', a.id), t.yn); } F.drawYn(root, cid, t.yn); }
    if (!o.quiet) F.scrollToKey(root, t.key, true);
    F.drawBox(root, cid, t.key, { typing: a.id });
    F.drawIndex(root, cid);
    const el = root.querySelector('[data-fk="' + t.key + '"] .dm-seg[data-aid="' + a.id + '"]');
    typeInto(el, text, () => { F.drawBox(root, cid, t.key); if (done) done(); }, o);
  };
  /* Psyflo types the base text of one box (the drafted text, or what the Scribe wrote), as the animation of "Fill all N boxes" does */
  F.typeBase = (root, cid, key, done, o) => {
    const el = F.drawBox(root, cid, key, { typingBase: true });
    const target = el && el.querySelector('[data-typing-base]');
    typeInto(target, F.boxModel(cid, key).base, () => { F.drawBox(root, cid, key); if (done) done(); }, o);
  };
  /* Psyflo types the approved draft into the drafted boxes of the given groups, all at once */
  F.fillGroups = (root, cid, groups, done) => {
    const C = L2.content(cid) || {}; const fl = Object.assign({}, L2.get(L2.k(cid, 'fl'), {}) || {});
    groups.forEach((g) => { fl[g] = true; });
    L2.set(L2.k(cid, 'fl'), fl);
    const all = (L2.GROUPS[cid] || []).every((g) => fl[g[0]]);
    if (all) L2.set(L2.k(cid, 'filled'), true);
    const keys = Object.keys(C).filter((k) => C[k].g && groups.indexOf(C[k].g) >= 0 && !/\.(yn|cur)$/.test(k) && String(C[k].t || '') && !L2.get(L2.k(cid, 'u', k), null) && root.querySelector('[data-fk="' + k + '"]'));
    let left = keys.length;
    root.querySelectorAll('[data-yn]').forEach((el) => F.drawYn(root, cid, el.getAttribute('data-yn')));
    if (!left) { F.drawAll(root, cid); if (done) done(); return; }
    keys.forEach((k) => {
      F.typeBase(root, cid, k, () => { if (--left === 0) { F.drawAll(root, cid); if (done) done(); } });
    });
    F.scrollToKey(root, keys[0], false);
  };

  /* ------------------------------------------------------------------ html pieces */
  const bx = (cid, key, o) => {
    o = o || {}; const r = F.boxInner(cid, key); const t = F.tagOf(cid, r.m);
    const q = '<div class="dm-q"><span>' + (o.q ? esc(o.q) : '') + '</span><span class="dm-tag' + (t ? ' ' + t.c : ' none') + '" data-tag="' + key + '">' + (t ? esc(t.t) : '') + '</span></div>';
    return '<div class="dm-f" data-f="' + key + '">' + q + '<div class="in dm-box ' + r.m.tone + '" data-ph="1" data-phtext="' + esc(phText(cid, r.m)) + '" data-fk="' + key + '"' + ED() + ' style="min-height:' + (o.min || 62) + 'px">' + r.html + '</div></div>';
  };
  const sm = (cid, key, label, o) => { // a one-line field with its label above
    o = o || {}; const r = F.boxInner(cid, key);
    return '<div class="dm-s1' + (o.cls ? ' ' + o.cls : '') + '"><label>' + esc(label) + '</label><div class="in dm-box dm-one ' + r.m.tone + '" data-fk="' + key + '"' + ED() + '>' + r.html + '</div></div>';
  };
  const smq = (cid, key, q) => { // a one-line field under a form question (normal case, like the printed form)
    const r = F.boxInner(cid, key);
    return '<div class="dm-f"><div class="dm-q"><span>' + esc(q) + '</span></div><div class="in dm-box dm-one ' + r.m.tone + '" data-fk="' + key + '"' + ED() + '>' + r.html + '</div></div>';
  };
  const yn = (cid, key) => {
    const v = F.ynValue(cid, key);
    return '<span class="dm-yn" data-yn="' + key + '"><a class="' + (v === 'y' ? 'on' : '') + '" data-act="l2-yn" data-k="' + key + '" data-v="y"><i>' + (v === 'y' ? '☑' : '☐') + '</i> Yes</a><a class="' + (v === 'n' ? 'on' : '') + '" data-act="l2-yn" data-k="' + key + '" data-v="n"><i>' + (v === 'n' ? '☑' : '☐') + '</i> No</a></span>';
  };
  const choice = (cid, key, opts) => { // ☑/☐ options chosen by Lauris (not clickable)
    const v = (L2.content(cid)[key] || {}).t;
    return '<span class="dm-opts">' + opts.map((o) => '<span class="' + (v === o[0] ? 'on' : '') + '"><i>' + (v === o[0] ? '☑' : '☐') + '</i> ' + esc(o[1]) + '</span>').join('') + '</span>';
  };
  const crit = (cid, key, text, n) => '<div class="dm-crit"><div class="dm-ct">' + (n ? '<b>' + n + '.</b> ' : '') + esc(text) + '</div>' + yn(cid, key) + '</div>';
  const sec = (id, title, inner, sub) => '<section class="dm-sec" id="dm-' + id + '" data-sec="' + id + '"><div class="dm-sh">' + esc(title) + '</div>' + (sub ? '<div class="dm-ins">' + sub + '</div>' : '') + inner + '</section>';
  const grid = (n, cells) => '<div class="dm-g dm-g' + n + '">' + cells.join('') + '</div>';
  const para = (t) => '<p class="dm-ins">' + t + '</p>';

  function medsTable(cid) {
    const rows = [1, 2, 3, 4].map((i) => '<tr><td>' + cellBox(cid, 'med.r' + i + '.name') + '</td><td>' + cellBox(cid, 'med.r' + i + '.dose') + '</td><td>' + cellBox(cid, 'med.r' + i + '.freq') + '</td></tr>').join('');
    return '<table class="dm-t"><tr><th>Name of Medication</th><th>Dosage</th><th>Frequency</th></tr>' + rows + '</table><div class="dm-ins">If additional medications are prescribed, include listing of medications, dosage, and frequency in the Notes section.</div>';
  }
  const cellBox = (cid, key, cls) => { const r = F.boxInner(cid, key); return '<div class="in dm-box dm-cellb ' + r.m.tone + (cls ? ' ' + cls : '') + '" data-fk="' + key + '"' + ED() + '>' + r.html + '</div>'; };
  const cellYn = (cid, key) => yn(cid, key);
  function servicesTable(cid, rows) {
    const trs = Array.from({ length: rows }, (_, i) => i + 1).map((i) => '<tr><td>' + cellBox(cid, 'svc.r' + i + '.name') + '</td><td>' + cellBox(cid, 'svc.r' + i + '.who') + '</td><td>' + cellBox(cid, 'svc.r' + i + '.freq') + '</td></tr>').join('');
    return '<table class="dm-t"><tr><th>Name of service/treatment</th><th>Provider/Contact Information</th><th>Frequency</th></tr>' + trs + '</table>';
  }
  function dischargeTable(cid, rows) {
    const trs = Array.from({ length: rows }, (_, i) => i + 1).map((i) => '<tr><td>' + cellBox(cid, 'dsch.r' + i + '.step') + '</td><td>' + cellBox(cid, 'dsch.r' + i + '.who') + '</td><td>' + cellBox(cid, 'dsch.r' + i + '.plan') + '</td></tr>').join('');
    return '<table class="dm-t"><tr><th>Step Down Service/Supports</th><th>Identified Provider/Supports</th><th>Plan to assist in transition</th></tr>' + trs + '</table>';
  }

  /* ------------------------------------------------------------------ member, provider, request: shared by both forms */
  function headSection(cid, kind) {
    const M = '<div class="dm-col"><div class="dm-ch">MEMBER INFORMATION</div>' + grid(2, [sm(cid, 'm.first', 'Member First Name'), sm(cid, 'm.last', 'Member Last Name'), sm(cid, 'm.medicaid', 'Medicaid #'), sm(cid, 'm.dob', 'Member Date of Birth'),
      '<div class="dm-s1"><label>Gender</label><div class="dm-optrow">' + choice(cid, 'm.gender', [['Male', 'Male'], ['Female', 'Female'], ['Other', 'Other']]) + '</div></div>', sm(cid, 'm.plan', 'Member Plan ID #'), sm(cid, 'm.addr', 'Member Address'), sm(cid, 'm.city', 'City, State, ZIP'),
      sm(cid, 'm.guard', 'Parent/Guardian'), sm(cid, 'm.gcontact', 'Parent/Guardian Contact Information')])
      + (kind === 'cont' ? '<div class="dm-s1"><label>Service Requested</label><div class="dm-optrow"><span class="dm-opts"><span><i>☐</i> IIH (H2012)</span><span><i>☐</i> MHSS (H0046)</span><span><i>☐</i> PSR (H2017)</span><span class="on"><i>☑</i> TDT (H2016)</span></span></div></div>' : '') + '</div>';
    const P = '<div class="dm-col"><div class="dm-ch">PROVIDER INFORMATION</div>' + grid(2, [sm(cid, 'p.org', 'Organization Name'), sm(cid, 'p.npi', 'Group NPI #'), sm(cid, 'p.tax', 'Provider Tax ID #')].concat(kind === 'cont' ? [sm(cid, 'p.provnpi', 'Provider NPI # (servicing licensed professional)')] : []).concat([sm(cid, 'p.phone', 'Provider Phone'), sm(cid, 'p.email', 'Provider E-Mail'), sm(cid, 'p.addr', 'Provider Address'), sm(cid, 'p.city', 'City, State, ZIP'), sm(cid, 'p.fax', 'Provider Fax'),
      sm(cid, 'p.contact', 'Clinical Contact Name & Credentials*'), sm(cid, 'p.cphone', 'Clinical Contact Phone')])) + '<div class="dm-fn">* This is the individual to whom the MCO can reach out to answer additional clinical questions.</div></div>';
    const proc = '<div class="dm-line"><b>' + (kind === 'cont' ? 'If requesting TDT services, check one of the following:' : 'Procedure Code:') + '</b> ' + choice(cid, 'proc', [['H2016', 'H2016 (school day)'], ['UG', 'H2016 – UG (after-school)'], ['U7', 'H2016 – U7 (summer)']]) + '</div>';
    return sec('head', kind === 'init' ? 'SERVICE AUTHORIZATION FORM · TDT (H2016) INITIAL' : 'SERVICE AUTHORIZATION FORM · CMHRS CONTINUED STAY', '<div class="dm-g dm-g2 dm-cols">' + M + P + '</div>' + proc + bx(cid, 'school', { q: 'Provide the name of the school (and/or other setting) where these services are being provided:', min: 34 }));
  }
  function reqSection(cid, kind) {
    const dates = '<div class="dm-reqrow"><span>From</span><div class="dm-w">' + cellBox(cid, 'req.from') + '</div><span>(date), To</span><div class="dm-w">' + cellBox(cid, 'req.to') + '</div><span>(date), for a total of</span><div class="dm-w sm">' + cellBox(cid, 'req.units') + '</div><span>units of service.</span></div>' +
      '<div class="dm-reqrow"><span>Plan to provide</span><div class="dm-w sm">' + cellBox(cid, 'req.hours') + '</div><span>hours of service per week.</span></div>';
    const initOnly = kind === 'init' ? '<div class="dm-line"><b>Retro Review Request?</b> ' + choice(cid, 'req.retro', [['y', 'Yes'], ['n', 'No']]) + '</div><div class="dm-line"><b>Is this a new service for the member?</b> ' + choice(cid, 'req.new', [['y', 'Yes'], ['n', 'No']]) + ' <span class="dm-mut">(If no, then complete an authorization for continuing care.)</span></div>'
      : '<div class="dm-g dm-g2">' + sm(cid, 'admit', 'Initial Admission Date to Services') + sm(cid, 'avg', 'Average # of units provided per week') + '</div>';
    return sec('req', 'REQUEST FOR APPROVAL OF SERVICES', initOnly + dates + grid(2, [sm(cid, 'icd1', 'Primary ICD-10 Diagnosis'), sm(cid, 'icd2', 'Secondary Diagnosis')]) + medsTable(cid));
  }

  /* ------------------------------------------------------------------ the initial form (July 2021) */
  function initForm(cid) {
    const CR1 = 'Has difficulty in establishing or maintaining normal interpersonal relationships to such a degree that they are at risk of hospitalization or out of home placement because of conflicts with family or community (Note: Please refer to DMAS provider manual for risk of hospitalization and out of home placement definitions/criteria).';
    const s1 = sec('s1', 'SECTION I: THERAPEUTIC DAY TREATMENT ELIGIBILITY CRITERIA',
      para('Individuals shall demonstrate medical necessity for the service arising from a condition due to mental, behavioral or emotional illness resulting in significant functional impairments in major life activities. <b>Individual must meet TWO of the following</b> on a continuing or intermittent basis; check applicable criteria:')
      + crit(cid, 'crit1.yn', CR1, 1)
      + bx(cid, 'crit1.risk', { q: '* If a child is at risk of hospitalization or an out of home placement, state the specific reason and what the out-of-home placement may be.', min: 52 })
      + bx(cid, 'crit1.sub', { q: 'Describe current symptoms and behaviors or other pertinent information which provides substantiation for CHECKED response (Identify frequency, intensity, and duration of each behavior):', min: 84 })
      + '<div class="dm-school"><div><label>Does the individual have an IEP?</label>' + yn(cid, 'sch.iep') + '</div>' + sm(cid, 'sch.unexc', '# of days unexcused absences in the school year') + sm(cid, 'sch.iss', '# of days of in-school suspensions in the past 6 months') + sm(cid, 'sch.oss', '# of days out of school suspensions in the past 6 months') + sm(cid, 'sch.classes', '# of classes taking and how many are passing grades') + '</div>'
      + crit(cid, 'crit2.yn', 'Exhibits such inappropriate behavior that documented, repeated interventions by the mental health, social services or judicial system are or have been necessary.', 2)
      + '<div class="dm-q"><span>Describe current and past services/interventions which provides substantiation for CHECKED response as stated above:</span></div>'
      + '<table class="dm-t"><tr><th style="width:27%">Provider</th><th style="width:14%">Currently in Service?</th><th style="width:20%">Dates of Services/Interventions</th><th>Outcomes/Current Progress</th></tr>'
      + [1, 2, 3, 4].map((i) => '<tr><td>' + cellBox(cid, 'crit2.r' + i + '.prov') + '</td><td class="dm-c">' + cellYn(cid, 'crit2.r' + i + '.cur') + '</td><td>' + cellBox(cid, 'crit2.r' + i + '.dates') + '</td><td>' + bxCell(cid, 'crit2.r' + i + '.out') + '</td></tr>').join('') + '</table>'
      + crit(cid, 'crit3.yn', 'Exhibits difficulty in cognitive ability such that they are unable to recognize personal danger or significantly inappropriate social behavior.', 3)
      + bx(cid, 'crit3.sub', { q: 'Describe current symptoms and behaviors or other pertinent information which provides substantiation for CHECKED response (Identify frequency, intensity, and duration of each behavior):', min: 66 })
      + '<div class="dm-sub">Individual must meet ONE of the following; check applicable criteria:</div>'
      + [['a', 'The individual must require year-round treatment to sustain behavior or emotional gains.', 'Describe pertinent information which provides substantiation for CHECKED response (ex. What services have been tried and with what result, Describe severity and intensity of behaviors):'],
        ['b', 'The individual’s behavior and emotional problems are so severe that they cannot be handled in a self-contained or resource emotionally disturbed (ED) classroom without: a. TDT programming during the school day or b. TDT programming to supplement the school day or school year.', 'Describe pertinent information which provides substantiation for CHECKED response:'],
        ['c', 'The individual would otherwise be placed on homebound instruction because of severe emotional/behavioral problems that interfere with learning.', 'Describe pertinent information which provides substantiation for CHECKED response:'],
        ['d', 'The individual must have deficits in social skills, peer relations or dealing with authority, are hyperactive, have poor impulse control, are extremely depressed or marginally connected with reality.', 'Describe pertinent information which provides substantiation for CHECKED response:'],
        ['e', 'The individual is placed or pending placement in a preschool enrichment and or early intervention program but the individual’s emotional/behavioral problems are so severe that it is documented that they cannot function or be admitted to these programs without TDT services.', 'Describe pertinent information which provides substantiation for CHECKED response:']]
        .map((x) => crit(cid, 'loc.' + x[0] + '.yn', x[1], x[0]) + bx(cid, 'loc.' + x[0] + '.sub', { q: x[2], min: x[0] === 'b' ? 84 : 40 })).join(''));
    const s2 = sec('s2', 'SECTION II: CARE COORDINATION',
      sm(cid, 'pcp', 'Primary Care Physician')
      + '<div class="dm-crit"><div class="dm-ct">Other medical/behavioral health concerns (including substance abuse issues, personality disorders, cognitive impairments) that could impact services? <span class="dm-mut">(If yes, explain below.)</span></div>' + yn(cid, 'other.yn') + '</div>'
      + bx(cid, 'other.sub', { min: 44 })
      + '<div class="dm-q"><span>Please indicate other current medical/behavioral services and additional community supports and interventions being received:</span></div>' + servicesTable(cid, 3)
      + bx(cid, 'coordplan', { q: 'Indicate plan to coordinate with primary care physician and other treatment providers/services to help ensure treatment interventions are coordinated:', min: 62 }));
    const s3 = sec('s3', 'SECTION III: TRAUMA-INFORMED CARE',
      para('Trauma-Informed Care. Many individuals have experienced potentially traumatic events in their lifetime. It is important that everyone is aware of the potential impact of trauma on those they serve, prepare to recognize and offer trauma-specific services when needed, and be mindful of trauma-informed interventions.')
      + '<div class="dm-crit"><div class="dm-ct">Is there evidence to suggest this member has experienced trauma?</div>' + yn(cid, 'trauma.yn') + '</div>'
      + bx(cid, 'sec3', { q: 'What is your plan to assess/refer and address the current and potential effects of that trauma?', min: 84 }));
    const goalBlock = (n) => '<div class="dm-goal"><div class="dm-gh">Goal ' + n + ' <span>from the ISP</span></div>'
      + bx(cid, 'g' + n + '.obj', { q: 'Goal/Objective (Please provide objective measures to demonstrate evidence of progress. Measurable objectives should have meaningful tracking values; avoid percentages unless able to track and measure percent completion i.e. if 80%, state 8 of 10 as a more trackable value):', min: 46 })
      + smq(cid, 'g' + n + '.days', 'How many days per week will be spent addressing this goal on average?')
      + bx(cid, 'g' + n + '.int', { q: 'What specific counseling and/or behavioral interventions will be provided to address this goal?', min: 40 })
      + bx(cid, 'g' + n + '.lmhp', { q: 'How many hours per week of onsite supervision or direct counseling/therapy by an LMHP Type will be provided?', min: 34 })
      + bx(cid, 'g' + n + '.noc', { q: 'If no in-school counseling/therapy is provided, why, and who is providing therapy/counseling and what is the frequency?', min: 34 }) + '</div>';
    const s4 = sec('s4', 'SECTION IV: INDIVIDUAL TREATMENT GOALS',
      '<div class="dm-ins"><b>Treatment Goals/Progress:</b> Describe person-centered, recovery-oriented, trauma-informed mental health treatment goals as they relate to requested treatment. Include individual strengths/barriers/gaps in service, and written in own words of individual seeking treatment/or in a manner that is understood by individual seeking treatment. If individual has identified a history of trauma, please include trauma-informed care interventions in the treatment plan. Services are intended to include goal directed training/interventions that will enable individuals to learn the skills necessary to achieve or maintain stability in the least restrictive environment. Please demonstrate that the individual is benefiting from the service as evidenced by objective progress toward goals or modifications and updates that are being made to the treatment plan to address areas with lack of progress. Include appointments and medications adherence issues and plans to address this, if applicable.</div>'
      + bx(cid, 'strengths', { q: 'Resources and Strengths: Document individual’s strengths, preferences, extracurricular/community/social activities and people the individual identifies as supports.', min: 62 })
      + bx(cid, 'barriers', { q: 'Please describe any barriers to treatment:', min: 62 })
      + bx(cid, 'schoolfam', { q: 'Please describe how coordination of TDT services will occur with school personnel and identified family member(s) involved in individual’s care on a daily/weekly basis (i.e. treatment meetings, progress reports, correspondence with family, etc.):', min: 62 })
      + goalBlock(1) + goalBlock(2) + goalBlock(3));
    const s5 = sec('s5', 'SECTION V: DISCHARGE PLANNING',
      '<div class="dm-q"><span>DISCHARGE PLAN (Identify lower levels of care, natural supports, warm-hand off, care coordination needs)</span></div>' + dischargeTable(cid, 3)
      + grid(2, [sm(cid, 'dloc', 'Recommended level of care at discharge'), sm(cid, 'ddate', 'Estimated date of discharge')]));
    return headSection(cid, 'init') + reqSection(cid, 'init') + s1 + s2 + s3 + s4 + s5 + attestSection(cid, 'init') + notesSection(cid);
  }
  const bxCell = (cid, key) => { const r = F.boxInner(cid, key); const t = F.tagOf(cid, r.m); return '<span class="dm-tag' + (t ? ' ' + t.c : ' none') + '" data-tag="' + key + '">' + (t ? esc(t.t) : '') + '</span><div class="in dm-box dm-cellb dm-out ' + r.m.tone + '" data-fk="' + key + '"' + ED() + '>' + r.html + '</div>'; };

  /* ------------------------------------------------------------------ the concurrent SRA form (Dec 2021) */
  function contForm(cid) {
    const s1 = sec('s1', 'SECTION I: CARE COORDINATION',
      '<div class="dm-q"><span>Please indicate other current medical/behavioral services and additional community interventions/supports received:</span></div>' + servicesTable(cid, 2)
      + bx(cid, 'coordsince', { q: 'Describe Care Coordination activities with other services and providers since the last authorization:', min: 66 }));
    const goalBlock = (n) => '<div class="dm-goal"><div class="dm-gh">Goal ' + n + ' of 3 <span>from the ISP</span></div>'
      + bx(cid, 'g' + n + '.obj', { q: 'Goal/Objective (Please provide objective measures to demonstrate evidence of progress. Measurable objectives should have meaningful tracking values; avoid percentages unless able to track and measure percent completion i.e. if 80%, state 8 of 10 as a more trackable value):', min: 46 })
      + smq(cid, 'g' + n + '.days', 'How many days per week will be spent addressing this goal on average?')
      + bx(cid, 'g' + n + '.int', { q: 'What specific training and interventions will be provided to address this goal?', min: 40 })
      + bx(cid, 'g' + n + '.measure', { q: 'How will you measure progress on the interventions provided?', min: 34 })
      + bx(cid, 'g' + n + '.progress', { q: 'Progress toward Goal/Objective:', min: 66 })
      + bx(cid, 'g' + n + '.lack', { q: 'Lack of Progress and Changes made to ISP to address this:', min: 66 }) + '</div>';
    const s2 = sec('s2', 'SECTION II: TREATMENT PROGRESS',
      '<div class="dm-ins"><b>Treatment Goals/Progress:</b> Describe person-centered, recovery-oriented, trauma-informed mental health treatment goals as they relate to requested treatment. Include individual strengths/barriers/gaps in service, and written in own words of individual seeking treatment/or in a manner that is understood by individual seeking treatment. Please demonstrate that the individual is benefiting from the service as evidenced by objective progress toward goals or modifications and updates that are being made to the treatment plan to address areas with lack of progress. Include any appointments and medication adherence issues and plan to address this if applicable.</div>'
      + bx(cid, 'strengths', { q: 'Resources and Strengths: Document individual’s strengths, preferences, extracurricular/community/social activities and people the individual identifies as supports.', min: 52 })
      + bx(cid, 'barriers', { q: 'Please describe any barriers to treatment:', min: 52 })
      + goalBlock(1) + goalBlock(2) + goalBlock(3)
      + bx(cid, 'family', { q: 'For IIH and TDT: Overview of family involvement during service period with regards to the individual’s ISP to include who has been involved and progress made/continuing needs of family goals/training:', min: 66 }));
    const s3 = sec('s3', 'SECTION III: DISCHARGE PLANNING',
      '<div class="dm-q"><span>DISCHARGE PLAN (Identify lower levels of care, natural supports, warm-hand off, care coordination needs)</span></div>' + dischargeTable(cid, 2)
      + grid(2, [sm(cid, 'ddate', 'Estimated Date of Discharge'), sm(cid, 'dloc', 'Recommended level of care at discharge')]));
    return headSection(cid, 'cont') + reqSection(cid, 'cont') + s1 + s2 + s3 + attestSection(cid, 'cont') + notesSection(cid);
  }

  /* ------------------------------------------------------------------ attestation and notes */
  function sigInfo(cid) {
    const s = L2.signedInfo(cid); const m = L2.mode(cid);
    if (s) return { text: 'Signed electronically · Jordan Perez, LPC · ' + s.date, date: s.date, done: true };
    if (m === 'sent') { const d = L2.sentDate(cid) || '10/29/2026'; return { text: 'Signed electronically · Jordan Perez, LPC · ' + d, date: d, done: true }; }
    return { text: 'Pending, to be signed in Forms to Approve', date: 'Set when you sign', done: false };
  }
  F.sigInfo = sigInfo;
  function attestSection(cid, kind) {
    const si = sigInfo(cid);
    const ass = kind === 'init' ? 'The assessment or applicable addendum for this service was completed on' : 'The date of the most recent assessment or applicable addendum for this service was completed on';
    return sec('att', 'ATTESTATION',
      '<div class="dm-ins">The appropriate assessment or addendum has been completed by an LMHP, LMHP-R, LMHP-S, or LMHP-RP and the individual’s psychiatric history information reviewed. By my signature (below) I am attesting that the individual meets the medical necessity criteria for the identified service. ' + ass + '</div>'
      + grid(3, [sm(cid, 'att.assess', 'Assessment completed on'), '<div class="dm-s1 dm-span2"><label>Signature (actual or electronic) of LMHP (or R/S/RP)</label><div class="in dm-box dm-one dm-sig' + (si.done ? ' g' : '') + '" data-sig>' + esc(si.text) + '</div></div>'])
      + grid(3, [sm(cid, 'att.name', 'Printed Name of LMHP (or R/S/RP)'), sm(cid, 'att.cred', kind === 'init' ? 'Credentials & NPI' : 'Credentials'), '<div class="dm-s1"><label>Date</label><div class="in dm-box dm-one" data-sigdate>' + esc(si.date) + '</div></div>'])
      + sm(cid, 'addl', 'If any additional CMHRS services were recommended by the assessment or addendum referenced above, please identify the services here'));
  }
  function notesSection(cid) {
    return sec('notes', 'NOTES SECTION', '<div class="dm-ins">If needed, use this page for any answer too long to fit within the form’s provided spaces. Please note which section you are continuing before each answer.</div>' + bx(cid, 'notes', { min: 80 })
      + '<div class="dm-docs" data-docs></div>');
  }
  F.docsHtml = (cid) => {
    const h = (PSY.data.hub || {})[cid]; const d = h && h.documents; if (!d) return '';
    return '<div class="dm-dh">Attached from the Documents tab</div><div class="dm-dl"><span class="dm-dn">' + d.have + ' of ' + d.total + ' documents attached</span>' + (d.missing ? '<span class="dm-dm">Not received: ' + esc(d.missing) + '</span>' : '<span class="dm-dok">Nothing missing</span>') + '</div>';
  };

  /* ------------------------------------------------------------------ page header: consumer, status, banner */
  F.statusChip = (cid) => { const s = L2.status(cid); return '<span class="au-st ' + s.tone + '" data-psy="status">' + esc(s.label) + '</span>'; };
  F.bannerHtml = (cid) => {
    const c = PSY.caseView(cid); const m = L2.mode(cid); const p = L2.get(L2.k(cid, 'processed'), null);
    const sg = L2.signedInfo(cid); const pay = L2.payer(cid);
    if (m === 'processed') return '<div class="dm-bn ok">Processed' + (p && p.at ? ' at ' + esc(p.at) : '') + ' · <a class="lk" data-go="lauris-forms">Forms to Approve</a></div>';
    if (m === 'sent') {
      if (sg) return '<div class="dm-bn ok">Signed ' + esc(sg.date) + ' · Jordan Perez, LPC <a class="lk" data-go="auth-list?case=' + cid + '">See it in Psyflo →</a></div>';
      if (c.stage === 'active') return '';
      return '<div class="dm-bn">Signed and sent' + (L2.sentDate(cid) ? ' ' + esc(L2.sentDate(cid)) : '') + (c.sendNote ? ' · ' + esc(c.sendNote) : '') + '</div>';
    }
    return '';
  };
  F.headerHtml = (cid) => {
    const c = PSY.caseView(cid); const r = L2.roster(cid) || {}; const kind = L2.kind(cid);
    const right = r.id ? (PSY.data.lauris.units(r) == null ? '<span class="warn">No authorizations available</span>' : '<span class="nw"><span class="blue">' + esc(PSY.data.lauris.unitsLabel(r)) + '</span>' + (r.ends ? '<span class="mut"> · ending ' + esc(r.ends) + '</span>' : '') + '</span>') : '';
    return '<div class="dm-crumbs"><a data-go="lauris-auths">Authorizations</a> › <a data-go="lauris-auth?id=' + cid + '">' + esc(c.ini) + '</a> › <span>' + esc(L2.TITLE[kind]) + '</span></div>'
      + '<div class="dm-head"><div class="dm-av"></div><div><div class="dm-nm">' + esc(c.who) + '</div><div class="dm-sb">Harvest # ' + esc(r.id || '') + ' · ' + esc(c.school) + ' · ' + esc(r.group || '') + ' · Clinician: J. Perez, LPC</div></div>'
      + '<div class="dm-rt">' + right + '<div>' + F.statusChip(cid) + ' <span class="mut">' + esc(L2.payer(cid).short) + '</span></div></div></div>'
      + '<div data-psy="banner">' + F.bannerHtml(cid) + '</div>'
      + '<div class="dm-sess"><label style="margin:0">Session entry</label><div class="in" style="min-width:300px;background:#fff">' + esc(L2.TITLE[kind]) + '</div><span>' + 'DMAS form, ' + L2.EDITION[kind] + ' · ' + (L2.mode(cid) === 'sent' ? 'Addendum · 10/29/2026 · J. Perez, LPC' : 'Add Session · 10/29/2026 · J. Perez, LPC') + '</span></div>';
  };
  F.indexHtml = (cid) => {
    const kind = L2.kind(cid);
    return '<nav class="dm-idx" aria-label="Sections of the form"><div class="dm-ih">Sections</div>' + SECS[kind].map((s) => '<a data-act="l2-idx" data-t="' + s[0] + '" data-idx="' + s[0] + '">' + esc(s[1]) + '</a>').join('') + '</nav>';
  };
  F.barHtml = (cid) => '<div class="dm-bar"><button class="lb" data-act="l2-save">Save Form Data</button><button class="lb" data-act="l2-process" data-psy="process">Process Form</button>'
    + '<span class="dm-leg"><i class="g"></i>Lauris filled it <i class="a"></i>typed by Psyflo, for you to check <i class="w"></i>saved text or typed by you</span></div>';
  F.formHtml = (cid) => {
    const kind = L2.kind(cid); const c = PSY.caseView(cid); const r = L2.roster(cid) || {};
    const title = kind === 'init' ? 'THERAPEUTIC DAY TREATMENT (TDT) H2016 INITIAL Service Authorization Request Form' : 'CMHRS CONTINUED STAY Service Authorization Request Form';
    return '<div class="dm-wrap">' + F.indexHtml(cid) + '<div class="dm-main"><div class="dm-paper"><div class="dm-run"><span>Member’s Full Name: <b>' + esc(c.ini) + '</b></span><span>Medicaid #: <b>on file</b></span></div>'
      + '<div class="dm-title"><small>SERVICE AUTHORIZATION FORM</small>' + title + '<em>' + L2.EDITION[kind] + '</em></div>' + (kind === 'init' ? initForm(cid) : contForm(cid)) + '</div></div></div>';
  };

  /* ------------------------------------------------------------------ css */
  F.css = `
  .lz-main{container-type:inline-size;container-name:lzm}
  .dm-crumbs{font-size:12px;color:#6B7280;margin-bottom:8px}.dm-crumbs a{color:#1F64BE;font-weight:700;cursor:pointer}.dm-crumbs a:hover{text-decoration:underline}.dm-crumbs span{color:#333}
  .dm-head{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:8px 14px;margin-bottom:10px}
  .dm-av{width:34px;height:34px;border-radius:50%;background:#DDE1E6;flex:none}
  .dm-nm{font-weight:700;font-size:15px;color:#1F3B6B}.dm-sb{font-size:11px;color:#666}
  .dm-rt{margin-left:auto;text-align:right;font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:3px;align-items:flex-end}
  .dm-rt .nw{white-space:nowrap}
  .dm-rt .warn{color:#C2410C}.dm-rt .blue{color:#1F6FBF}.dm-rt .mut,.mut{color:#666;font-weight:400}
  .au-st{display:inline-block;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid transparent}
  .au-st.n{background:#EEF0F3;color:#3B4656;border-color:#D5D9DF}.au-st.b{background:#E3EDFB;color:#1F4E8C;border-color:#B9CDEB}.au-st.y{background:#FFF1D6;color:#8A5A00;border-color:#EDCB86}.au-st.r{background:#FBE5E0;color:#9B2C17;border-color:#EBB3A8}.au-st.g{background:#E1F2E7;color:#1E6B40;border-color:#B5D9C3}
  .dm-bn{background:#EEF3FA;border:1px solid #C5D3E6;border-radius:3px;padding:7px 12px;font-size:12px;color:#26384F;margin-bottom:10px;line-height:1.45}
  .dm-bn.ok{background:#E6F4EA;border-color:#BFE0CC;color:#1E5A3A}
  .dm-sess{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}.dm-sess>span{font-size:11px;color:#666}
  .dm-wrap{display:flex;gap:14px;align-items:flex-start}
  .dm-idx{flex:0 0 148px;position:sticky;top:4px;background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:4px 0 6px;font-size:12px;align-self:flex-start}
  .dm-ih{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;font-weight:700;padding:7px 10px 4px}
  .dm-idx a{display:flex;gap:6px;align-items:center;padding:6px 10px;color:#2A3442;cursor:pointer;border-left:3px solid transparent;line-height:1.25}
  .dm-idx a:hover{background:#F4F6F9}.dm-idx a.on{border-left-color:#E0A030;font-weight:700;background:#FFF8E6}
  .dm-idx .n{margin-left:auto;background:#217A78;color:#fff;border-radius:999px;font-size:10px;font-weight:700;min-width:16px;height:16px;padding:0 4px;display:inline-flex;align-items:center;justify-content:center;flex:none}
  .dm-main{flex:1;min-width:0}
  .dm-paper{background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:10px 18px 8px}
  .dm-run{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#555;border-bottom:1px solid #D5D9DF;padding-bottom:5px;margin-bottom:8px}.dm-run b{color:#222}
  .dm-title{text-align:center;font-weight:700;font-size:14px;line-height:1.35;color:#1F2A3A;padding:4px 0 10px}.dm-title small{display:block;font-size:11px;letter-spacing:.08em;color:#555;font-weight:700}.dm-title em{display:block;font-style:normal;font-weight:400;font-size:11px;color:#777;margin-top:2px}
  .dm-sec{margin:0 0 6px;scroll-margin-top:90px}
  .dm-sh{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#222;border-bottom:2px solid #333;padding:12px 0 3px;margin-bottom:8px}
  .dm-ins{font-size:11.5px;color:#444;line-height:1.5;margin:0 0 8px}.dm-mut{color:#666}
  .dm-sub{font-size:12px;font-weight:700;margin:12px 0 4px;color:#222}
  .dm-g{display:grid;gap:8px 12px;margin-bottom:8px}.dm-g2{grid-template-columns:repeat(2,minmax(0,1fr))}.dm-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.dm-span2{grid-column:span 2}
  .dm-cols{align-items:start}.dm-col{min-width:0}.dm-col .dm-g2{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .dm-ch{font-size:11px;font-weight:700;letter-spacing:.06em;color:#333;margin-bottom:6px}
  .dm-fn{font-size:11px;color:#666;margin-top:4px}
  .dm-s1{min-width:0}.dm-s1 label{white-space:normal;line-height:1.25}
  .dm-box{line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
  .dm-one{min-height:30px}
  .dm-cellb{min-height:28px;padding:4px 6px;font-size:12px}
  .dm-cellb.dm-out{min-height:54px}
  .dm-f{margin-bottom:9px}
  .dm-q{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;font-size:11.5px;color:#444;margin-bottom:3px;line-height:1.45}
  .dm-q>span:first-child{flex:1;min-width:0}
  .dm-tag{flex:none;font-size:10.5px;font-weight:700;border-radius:999px;padding:1px 9px;font-family:'DM Sans',system-ui,sans-serif;white-space:nowrap;margin-left:auto}
  .dm-t td .dm-tag{display:inline-block;margin:0 0 3px;font-size:10px;white-space:normal;max-width:100%;line-height:1.3;border-radius:9px;padding:1px 8px}
  .dm-tag.none{display:none}.dm-tag.t0{background:#217A78;color:#fff}.dm-tag.t1{background:#F0B44C;color:#151B24}.dm-tag.t2{background:#DDF1EF;color:#15605E}.dm-tag.t3{background:#EEEBE5;color:#3E4652}.dm-tag.t4{background:#fff;color:#3E4652;border:1px solid #CFD3D9}
  .dm-box[contenteditable]{cursor:text}
  .dm-box[data-phtext]:empty:before{content:attr(data-phtext);color:#8A9099;font-style:italic;pointer-events:none}
  .dm-seg{background:rgba(240,180,76,.32);border-radius:2px;outline:none}
  .dm-seg.ck{background:rgba(240,180,76,.16)}
  .dm-seg:focus{box-shadow:0 0 0 2px rgba(240,180,76,.55)}
  .dm-seg.typing:after,.dm-base.typing:after{content:'';display:inline-block;width:2px;height:1.1em;background:#151B24;vertical-align:text-bottom;margin-left:1px;animation:dmBlink 1s steps(1) infinite}
  @keyframes dmBlink{50%{opacity:0}}
  .dm-box.hl{outline:2px solid #F0B44C;outline-offset:2px;animation:dmHl 1.8s ease-out 1}
  @keyframes dmHl{0%{box-shadow:0 0 0 0 rgba(240,180,76,.8)}100%{box-shadow:0 0 0 9px rgba(240,180,76,0)}}
  .dm-box.focus{outline:2px solid #217A78;outline-offset:2px}
  .dm-crit{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin:12px 0 5px;font-size:12px;line-height:1.45;color:#222}
  .dm-ct{flex:1;min-width:0}
  .dm-yn{flex:none;display:inline-flex;gap:10px;font-size:12px;white-space:nowrap}
  .dm-yn a{cursor:pointer;color:#333;display:inline-flex;gap:3px;align-items:center}.dm-yn a:hover{color:#1F64BE}.dm-yn a.on{font-weight:700;color:#111}.dm-yn i{font-style:normal;font-size:14px}
  .dm-opts{display:inline-flex;gap:4px 12px;flex-wrap:wrap;font-size:12px}.dm-opts .on{font-weight:700}.dm-opts i{font-style:normal;font-size:14px}
  .dm-optrow{min-height:30px;display:flex;align-items:center}
  .dm-line{font-size:12px;margin:6px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .dm-reqrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;margin:5px 0}.dm-reqrow .dm-w{width:104px}.dm-reqrow .dm-w.sm{width:64px}
  .dm-school{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 12px;margin:2px 0 10px;background:#F6F8FB;border:1px solid #E1E5EB;border-radius:3px;padding:8px 10px}
  .dm-school label{white-space:normal}
  .dm-t{width:100%;border-collapse:collapse;margin:2px 0 8px;table-layout:fixed}
  .dm-t th{background:#EDEDED;border:1px solid #CFCFCF;padding:5px 7px;text-align:left;font-size:11.5px}
  .dm-t td{border:1px solid #CFCFCF;padding:3px;vertical-align:top}.dm-t td.dm-c{text-align:center;vertical-align:middle}
  .dm-t .in{border-color:#E0E3E8}
  .dm-goal{border:1px solid #DDE1E6;border-radius:4px;padding:8px 10px 2px;margin:10px 0;background:#FBFCFD}
  .dm-gh{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1F3B6B;margin-bottom:6px}.dm-gh span{font-weight:400;color:#6B7280;text-transform:none;letter-spacing:0;margin-left:6px}
  .dm-docs{margin-top:8px}
  .dm-dh{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:3px}
  .dm-dl{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:12px}.dm-dm{color:#8A5A00;background:#FFF1D6;border-radius:3px;padding:1px 7px}.dm-dok{color:#1E6B40;background:#E1F2E7;border-radius:3px;padding:1px 7px}
  .dm-sig{font-weight:700}
  .lb.dis{opacity:.6}
  .dm-bar{position:sticky;bottom:-28px;margin:10px -20px -28px;padding:10px 20px;background:#F2F3F5;border-top:1px solid #DDE1E6;display:flex;gap:8px;align-items:center;flex-wrap:wrap;z-index:4}
  .dm-leg{font-size:11px;color:#666;margin-left:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.dm-leg i{display:inline-block;width:11px;height:11px;border:1px solid #C9CDD3;border-radius:2px;margin-left:8px}.dm-leg i:first-child{margin-left:0}.dm-leg i.g{background:#E6F4EA}.dm-leg i.a{background:#FFF8E6;border-color:#E8C56A}.dm-leg i.w{background:#fff}
  @container lzm (max-width:760px){
    .dm-wrap{flex-direction:column;gap:8px}
    .dm-idx{position:sticky;top:0;flex:none;width:100%;display:flex;overflow-x:auto;padding:0;z-index:5}
    .dm-ih{display:none}
    .dm-idx a{white-space:nowrap;border-left:0;border-bottom:3px solid transparent;padding:8px 10px}.dm-idx a.on{border-bottom-color:#E0A030}
    .dm-g2,.dm-col .dm-g2{grid-template-columns:minmax(0,1fr)}.dm-g3{grid-template-columns:minmax(0,1fr)}.dm-span2{grid-column:auto}
    .dm-cols{grid-template-columns:minmax(0,1fr)}
  }
  `;

  /* ------------------------------------------------------------------ behaviour of the form itself (index jumps, scroll spy, yes/no ticks, editing the typed text) */
  F.bind = (root, cid) => {
    const main = root.querySelector('.lz-main'); if (!main) return;
    let raf = 0;
    const spy = () => {
      raf = 0; const secs = Array.from(root.querySelectorAll('.dm-sec')); if (!secs.length) return;
      const k = PSY.k || 1; const mt = main.getBoundingClientRect().top; let cur = secs[0];
      secs.forEach((s) => { if ((s.getBoundingClientRect().top - mt) / k < 130) cur = s; });
      root.querySelectorAll('[data-idx]').forEach((a) => a.classList.toggle('on', a.getAttribute('data-idx') === cur.getAttribute('data-sec')));
    };
    main.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(spy); });
    spy();
    /* the boxes are real editable boxes: whatever the clinician types or pastes is kept in state, and counted as "typed by you" (white) */
    root.addEventListener('input', (e) => {
      const t = e.target; const box = t && t.closest ? t.closest('.dm-box[data-fk]') : null; if (!box) return;
      F.readBox(root, cid, box);
    });
    root.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('.dm-box'); if (b) b.classList.add('focus'); });
    root.addEventListener('focusout', (e) => { const b = e.target.closest && e.target.closest('.dm-box'); if (b) b.classList.remove('focus'); });
  };
})();
