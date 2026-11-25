/* Track time (round 9, prompt §6; round 10: the UI is a small control in the extension footer): the timer, today's intervals per patient,
   recorded time vs billable units, and the unit rules. One model for the extension (screens/63-ext-time.js: the footer control, the entry in
   the work area, the Today list), the Lauris Time Tracker, the DPN and the Scribe (read entries / linked / summary) and the platform (total / unitsFor).
   PSY.state.timer = { running, clock, sel, selFor, sent, open, entries: { 'M.R.': [entry, …] } }   (keyed by initials, as in round 8)
     open    = the id of the stopped interval shown in the extension's work area (63-ext-time.js), or null
     running = { ini, laurisId, t0, acc, paused, pausedAt, pausedMs, startClock, startedAt }
     clock   = the demo's minute of the day where the next interval starts (3:35 pm unless a scenario sets it)
     entry   = { id, laurisId, ini, date 'YYYY-MM-DD', s '1:10', e '1:40', sMin, m (recorded minutes), timerM, pausedM,
                 what (intervention description), goal (ISP goal number) | null, live (false = added later from the end-of-day recording),
                 status 'saved' | 'draft', dpn (the DPN key it is linked to, e.g. 'dpn|4471|2026-10-29') | null, by }
   Unit rules (one per service): PSY.state.timeRules[service] (set by an admin) over the defaults, which come from the demo's own rule
   data (PSY.data.r5.rules 'tdt-units', DMAS Chapter IV). A service with neither has no rule: units() returns null ("Unit rule not configured").
     rule = { mode: 'tiers' | 'length', tiers: [[minutes, units], …], unitMin, rounding: 'down' | 'nearest' | 'up', dailyMax, source, kind }
   API
     start(ini) · pause() · resume() · stop(mins?) → entry · running() · elapsedMin()      (open() / toggle() / paneHtml / timerHtml / dayHtml / rulesHtml
     are added by 63-ext-time.js: it owns the UI)
     entries(ini) → today's list (live objects, legacy) · entries({ laurisId, date }) → copies · total(ini) · fmt(minutes)
     patch(id, fields) · save(id, { what, goal, m }) → { ok, reason } · discard(id) · byId(id)
     link(entryIds, dpnKey) → number linked · unlink(entryIds) · linked(dpnKey) → copies · summary({ laurisId, date } | { dpnKey })
     units(minutes, service) → number | null · unitsFor(minutes) (TDT, legacy) · rule(service) · rules() · setRule(service, rule) · resetRule(service)
     serviceOf(laurisId) · canTrack(laurisId) · trackable() → the role's caseload (Lauris consumers) · onChange(fn) */
(function () {
  const PSY = window.PSY;
  const TODAY = '2026-10-29';
  const L = () => PSY.data.lauris;
  /* today's contact time for M.R. (fictional): [id, start, end, minutes, intervention, ISP goal, tapped live] */
  const SEED = {
    '4471': [
      ['mr-0805', '8:05', '8:35', 30, 'Morning check-in, classroom', null, true],
      ['mr-0950', '9:50', '11:25', 95, 'In-class support, math and reading', null, true],
      ['mr-1140', '11:40', '12:25', 45, 'Lunch support', null, true],
      ['mr-1310', '1:10', '1:40', 30, 'Movement intervention + co-regulation walk · voice memo 1:42', 1, true],
      ['mr-1340', '1:40', '3:30', 110, 'Afternoon classes, transitions', null, false],
    ],
  };
  /* "1:10" → minutes of the day (school hours: 1 to 6 are afternoon) and back */
  const toMin = (s) => { const m = /^(\d{1,2}):(\d\d)/.exec(String(s || '')); if (!m) return 0; let h = +m[1]; if (h < 7) h += 12; return h * 60 + +m[2]; };
  const clockOf = (min) => { const h = Math.floor(min / 60) % 24; return ((h + 11) % 12 + 1) + ':' + String(min % 60).padStart(2, '0'); };
  const seedOf = (laurisId) => {
    const c = L().byId(laurisId);
    return (SEED[laurisId] || []).map(([id, s, e, m, what, goal, live]) => ({ id, laurisId, ini: c.ini, date: TODAY, s, e, sMin: toMin(s), m, timerM: m, pausedM: 0, what, goal, live, status: 'saved', dpn: null, by: 'K. Hale' }));
  };
  let seq = 0;
  const listeners = [];

  const T = (PSY.time = {
    TODAY, toMin, clockOf, seed: seedOf,
    st() { const s = PSY.state; s.timer = s.timer || { running: null, entries: {} }; s.timer.entries = s.timer.entries || {}; return s.timer; },
    onChange(fn) { listeners.push(fn); },
    changed() { listeners.forEach((f) => { try { f(); } catch (e) { console.error('time listener', e); } }); },

    /* ---------- consumers and role scope ---------- */
    consumer(x) { if (!x) return null; const l = L(); return l.byId(String(x)) || l.byIni(String(x)) || null; },
    canTrack(laurisId) { const c = T.consumer(laurisId); return !!(c && PSY.can && PSY.can('time') && PSY.inCaseload(c.id)); },
    trackable() { if (!PSY.can || !PSY.can('time')) return []; const ids = PSY.caseload(); return L().consumers.filter((c) => ids.indexOf(c.id) >= 0); },
    serviceOf(laurisId) { const c = T.consumer(laurisId); const a = c && PSY.data.r5 && PSY.data.r5.auth ? PSY.data.r5.auth[c.case] : null; return (a && a.service) || 'tdt'; },

    /* ---------- entries ---------- */
    /* entries('M.R.') → today's list for that consumer (the live array, seeded once); entries({ laurisId, date }) → copies */
    entries(q) {
      if (q && typeof q === 'object') {
        const c = T.consumer(q.laurisId || q.ini); if (!c) return [];
        const d = q.date || TODAY;
        return T.entries(c.ini).filter((e) => (e.date || TODAY) === d).map((e) => Object.assign({}, e));
      }
      const ini = q; const t = T.st();
      if (!t.entries[ini]) { const c = L().byIni(ini); if (c && SEED[c.id]) t.entries[ini] = seedOf(c.id); }
      const list = t.entries[ini] || [];
      list.forEach((e, i) => { // round-8 entries (and test fixtures) have no id, date or status yet
        if (!e.id) e.id = 'te-' + ini.replace(/\W/g, '').toLowerCase() + '-' + i + '-' + (++seq);
        if (!e.date) e.date = TODAY;
        if (!e.status) e.status = 'saved';
        if (!e.laurisId) { const c = L().byIni(ini); if (c) e.laurisId = c.id; }
        if (!e.ini) e.ini = ini;
        if (e.sMin == null) e.sMin = toMin(e.s);
      });
      return list;
    },
    all() { const t = T.st(); return Object.keys(t.entries).reduce((a, k) => a.concat(T.entries(k)), []); },
    byId(id) { return T.all().find((e) => e.id === id) || null; },
    total(ini) { return T.entries(ini).filter((e) => (e.date || TODAY) === TODAY).reduce((n, e) => n + (+e.m || 0), 0); },
    fmt(mins) { mins = Math.round(mins || 0); const h = Math.floor(mins / 60), m = mins % 60; return (h ? h + ' h ' : '') + (m || !h ? m + ' min' : '').trim(); },

    /* ---------- the timer: one real second counts as one demo minute, so a short demo still records a believable interval ---------- */
    running() { return T.st().running; },
    elapsedMin() { const r = T.st().running; if (!r || !r.t0) return 0; return Math.max(0, Math.floor(((r.acc || 0) + (r.paused ? 0 : Date.now() - r.t0)) / 1000)); },
    clock() { const t = T.st(); return t.clock != null ? t.clock : 15 * 60 + 35; },
    start(ini) {
      const c = T.consumer(ini); if (!c || !T.canTrack(c.id) || T.st().running) return null;
      const s = T.clock();
      T.st().running = { ini: c.ini, laurisId: c.id, t0: Date.now(), acc: 0, paused: false, pausedAt: null, pausedMs: 0, startClock: s, startedAt: clockOf(s) + (s >= 720 ? ' pm' : ' am') };
      PSY.save(); T.changed(); return T.st().running;
    },
    pause() { const r = T.st().running; if (!r || r.paused) return false; r.acc = (r.acc || 0) + (Date.now() - r.t0); r.paused = true; r.pausedAt = Date.now(); PSY.save(); T.changed(); return true; },
    resume() { const r = T.st().running; if (!r || !r.paused) return false; r.pausedMs = (r.pausedMs || 0) + (Date.now() - (r.pausedAt || Date.now())); r.t0 = Date.now(); r.paused = false; r.pausedAt = null; PSY.save(); T.changed(); return true; },
    /* Stop records the interval at once (recorded time is never lost); it stays a draft until the intervention is described and saved */
    stop(mins) {
      const t = T.st(); const r = t.running; if (!r) return null;
      const m = Math.max(5, Math.round(mins != null ? mins : T.elapsedMin()));
      const pausedM = Math.floor(((r.pausedMs || 0) + (r.paused && r.pausedAt ? Date.now() - r.pausedAt : 0)) / 1000);
      const c = T.consumer(r.laurisId || r.ini) || { id: r.laurisId, ini: r.ini };
      const s = r.startClock != null ? r.startClock : T.clock(); const end = s + m + pausedM;
      const e = { id: 'te-' + Date.now().toString(36) + '-' + (++seq), laurisId: c.id, ini: c.ini, date: TODAY, s: clockOf(s), e: clockOf(end), sMin: s, m, timerM: m, pausedM,
        what: '', goal: null, live: true, status: 'draft', dpn: null, by: (PSY.user && PSY.user().staff) || '' };
      (t.entries[c.ini] = T.entries(c.ini)).push(e); t.clock = end; t.running = null;
      PSY.save(); T.changed(); return e;
    },
    /* an interval's end moved (its duration was edited): the next interval starts after it */
    endMoved(e) { const end = (e.sMin != null ? e.sMin : toMin(e.s)) + (+e.m || 0) + (e.pausedM || 0); if (e.date === TODAY && end > T.clock() && !T.st().running) T.st().clock = end; },
    patch(id, f, o) { const e = T.byId(id); if (!e) return null; Object.assign(e, f); if ('m' in f) T.endMoved(e); PSY.save(); if (!(o && o.quiet)) T.changed(); return e; },
    /* Save entry: an intervention description is required; the goal is required when the consumer has ISP goals on file */
    save(id, f, o) {
      const e = T.byId(id); if (!e) return { ok: false, reason: 'Entry not found.' };
      f = f || {}; const what = String(f.what != null ? f.what : e.what || '').trim(); const goal = f.goal != null && f.goal !== '' ? +f.goal : e.goal;
      const m = f.m != null && f.m !== '' ? Math.max(1, Math.min(720, Math.round(+f.m) || 0)) : e.m;
      if (!what) return { ok: false, reason: 'Add the intervention.' };
      if (o && o.needGoal && !goal) return { ok: false, reason: 'Choose a treatment goal.' };
      Object.assign(e, { what, goal: goal || null, m, e: clockOf((e.sMin != null ? e.sMin : toMin(e.s)) + m + (e.pausedM || 0)), status: 'saved', editing: false }); T.endMoved(e);
      PSY.save(); T.changed(); return { ok: true, entry: e };
    },
    discard(id) { const t = T.st(); let gone = null; Object.keys(t.entries).forEach((k) => { const i = t.entries[k].findIndex((e) => e.id === id); if (i >= 0) gone = t.entries[k].splice(i, 1)[0]; }); if (gone) { PSY.save(); T.changed(); } return gone; },

    /* ---------- link to the DPN (key 'dpn|<laurisId>|<date>', the PSY.sync key of that day's note) ---------- */
    dpnKey(laurisId, date) { const c = T.consumer(laurisId); return 'dpn|' + (c ? c.id : laurisId) + '|' + (date || TODAY); },
    link(ids, dpnKey) { let n = 0; (ids || []).forEach((id) => { const e = T.byId(id); if (e && e.status !== 'draft' && e.dpn !== dpnKey) { e.dpn = dpnKey; n++; } }); if (n) { PSY.save(); T.changed(); } return n; },
    unlink(ids) { let n = 0; (ids || []).forEach((id) => { const e = T.byId(id); if (e && e.dpn) { e.dpn = null; n++; } }); if (n) { PSY.save(); T.changed(); } return n; },
    linked(dpnKey) { return T.all().filter((e) => e.dpn === dpnKey).sort((a, b) => a.sMin - b.sMin).map((e) => Object.assign({}, e)); },
    /* recorded vs billable for a consumer's day, or for what is linked to a DPN */
    summary(q) {
      q = q || {}; let laurisId = q.laurisId; let date = q.date || TODAY; let list;
      if (q.dpnKey) { const p = String(q.dpnKey).split('|'); laurisId = p[1]; date = p[2] || TODAY; list = T.linked(q.dpnKey); } else list = T.entries({ laurisId, date });
      list = list.slice().sort((a, b) => a.sMin - b.sMin);
      const minutes = list.reduce((n, e) => n + (+e.m || 0), 0); const service = T.serviceOf(laurisId); const rule = T.rule(service); const units = T.units(minutes, service);
      return { laurisId: String(laurisId || ''), date, entries: list, count: list.length, minutes, recorded: T.fmt(minutes), service, rule, configured: !!rule, units,
        unitsText: units == null ? 'Unit rule not configured' : units + (units === 1 ? ' unit' : ' units'), ruleText: T.ruleShort(rule),
        drafts: list.filter((e) => e.status === 'draft').length, linkedTo: q.dpnKey || null };
    },

    /* ---------- unit rules ---------- */
    defaults() {
      const R5 = PSY.data.r5 || {}; const src = (PSY.rules && PSY.rules.byId && PSY.rules.byId('tdt-units')) || (R5.rules || []).find((r) => r.id === 'tdt-units');
      const out = {};
      Object.values(R5.services || {}).forEach((s) => {
        if (s.ruleId !== 'tdt-units' || !src) return;
        /* DMAS: 1 unit = 2–2.99 hours a day, 2 units = 3–4.99 hours, 3 units = 5 or more hours (the rule the demo already shows) */
        out[s.key] = { mode: 'tiers', tiers: [[120, 1], [180, 2], [300, 3]], rounding: 'down', dailyMax: 3, per: 'day', ruleId: 'tdt-units', kind: src.kind, source: src.source, text: src.text };
      });
      return out;
    },
    services() { const S = (PSY.data.r5 || {}).services || {}; return Object.keys(S).map((k) => S[k]); },
    rule(service) {
      service = service || 'tdt'; const own = (PSY.state.timeRules || {})[service];
      if (own) return Object.assign({ service, configured: true }, own);
      const d = T.defaults()[service]; return d ? Object.assign({ service }, d) : null;
    },
    rules() { return T.services().map((s) => ({ service: s.key, label: s.label, code: s.code, rule: T.rule(s.key), base: !!T.defaults()[s.key] })); },
    setRule(service, r) {
      r = Object.assign({}, r || {});
      if (!r.source || !String(r.source).trim()) return { ok: false, reason: 'Add the rule source.' };
      PSY.state.timeRules = PSY.state.timeRules || {};
      PSY.state.timeRules[service] = Object.assign(r, { kind: 'configured', by: (PSY.user && PSY.user().name) || '', at: PSY.now ? PSY.now() : '' });
      if (PSY.audit) PSY.audit.add({ action: 'Unit rule set for ' + service + ': ' + T.ruleShort(T.rule(service)), by: (PSY.user && PSY.user().name) || '', doc: 'Unit rules' });
      PSY.save(); T.changed(); return { ok: true, rule: T.rule(service) };
    },
    resetRule(service) { if (PSY.state.timeRules && PSY.state.timeRules[service]) { delete PSY.state.timeRules[service]; PSY.save(); T.changed(); } return T.rule(service); },
    /* units for a day's minutes under the service's rule; null when no rule is configured */
    units(minutes, service) {
      const r = T.rule(service || 'tdt'); if (!r) return null;
      const m = Math.max(0, +minutes || 0); let u = 0;
      if (r.mode === 'tiers') (r.tiers || []).forEach(([min, n]) => { if (m >= min) u = Math.max(u, n); });
      else { const len = +r.unitMin || 0; if (!len) return null; const x = m / len; u = r.rounding === 'up' ? Math.ceil(x) : r.rounding === 'nearest' ? Math.round(x) : Math.floor(x); }
      if (r.dailyMax) u = Math.min(u, +r.dailyMax);
      return u;
    },
    unitsFor(mins) { const u = T.units(mins, 'tdt'); return u == null ? 0 : u; },
    /* the rule's source, shortened for one line ('DMAS Mental Health Services Manual, Chapter IV, p. 39; …' → 'DMAS Ch. IV, p. 39; …') */
    sourceShort(r) { return r ? String(r.source || '').replace('DMAS Mental Health Services Manual, Chapter IV', 'DMAS Ch. IV') : ''; },
    hrs(min) { return min % 60 ? (min / 60).toFixed(2).replace(/0$/, '') + ' h' : min / 60 + ' h'; },
    ruleShort(r) {
      if (!r) return 'Unit rule not configured';
      const max = r.dailyMax ? ' · max ' + r.dailyMax + ' a day' : '';
      if (r.mode === 'tiers') return (r.ruleId === 'tdt-units' ? 'TDT day tiers' : 'Day tiers ' + (r.tiers || []).map((x) => T.hrs(x[0])).join(' / ')) + max;
      return '1 unit = ' + r.unitMin + ' min · round ' + (r.rounding || 'down') + max;
    },
  });
})();
