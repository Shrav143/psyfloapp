/* Track time (round 10): a small control at the left of the extension's footer, next to "Open Psyflo platform" (PSY.ext.footTime),
   the stopped interval in the work area (PSY.ext.work 'time'), the time half of the Today list, the unit-rule panels and the Lauris
   Time Tracker page. Model and API: src/time.js (PSY.time.*, read by the Scribe, the DPN and the platform).
   Footer control
     idle       "⏱ Track time" pill (data-act xq-time → PSY.time.open): one tap starts the timer for the patient on screen; with no
                patient on screen (or one outside the role's caseload) a compact picker of the caseload opens above the footer
     running    a live readout "● 12 min · M.R." + Pause (Resume) and Stop icon buttons; paused = grey, the minutes pulse
     Stop       records the interval at once (PSY.time.stop) and opens it in the work area: Recorded duration · Intervention
                description · Associated treatment goal · Save entry / Discard (× keeps it for later in the Today list). A Scribe
                recording on the page is never covered: the interval then waits in the Today list.
   Today list (PSY.ext.defaults.time; "Today" shows it under the notes)
                per patient: each interval (time, recorded minutes, intervention, ISP goal, DPN link, edit), Recorded ≠ Billable (units
                from the service's unit rule, "Configurable", with its source), Add to today's DPN; then Send to Lauris time tracker
   Other owners: PSY.time.paneHtml(o) / timerHtml(o) (the footer control) / dayHtml(laurisId), PSY.time.rulesHtml({ edit }) (unit rules for
   Settings; its buttons are wired here), PSY.time.open() / toggle(). Everything redraws in place and never calls PSY.refresh. */
(function () {
  const PSY = window.PSY; const T = PSY.time; const L = PSY.data.lauris; const esc = PSY.esc; const U = PSY.l1a; const X = PSY.ext;
  const DATE = '10/29/2026';
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const keyOf = () => { const c = PSY.current(); return c.id + JSON.stringify(c.params || {}); };
  const PEN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
  const IC = {
    clock: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>',
  };

  /* the patient's ISP goals, as the Lauris ISP has them (T.W.'s plan exists only once it is processed) */
  const goalsOf = (c) => {
    if (!c || (c.id === '4492' && PSY.flowRank() < 3)) return [];
    const I = PSY.l1b && PSY.l1b.isp; try { return I && I.goals ? I.goals({ c: c.id }) : []; } catch (e) { return []; }
  };
  const svcName = (key) => { const s = ((PSY.data.r5 || {}).services || {})[key] || {}; return (s.short === 'TDT' ? 'TDT school day' : s.short || key) + (s.code ? ' (' + s.code + ')' : ''); };

  /* the patient on screen: the page's route (c / id / case), or the case a form page passes to the panel */
  function onScreen() {
    let c = null;
    try { const p = X.patient ? X.patient(X.lastPanel || {}) : null; if (p) c = p.consumer || L.byId(String(p.laurisId)); } catch (e) { c = null; }
    if (!c && PSY.scribe && PSY.scribe.ctx) { try { c = PSY.scribe.ctx().consumer || null; } catch (e) { c = null; } }
    return c;
  }
  const here = () => { const c = onScreen(); return c && T.canTrack(c.id) ? c : null; };
  /* whose day the Today list puts first: the running timer's patient, else the patient on screen, else the last one timed */
  function firstIni() {
    const r = T.running(); if (r) return r.ini;
    const c = here(); if (c) return c.ini;
    const s = T.st().sel; return s && T.trackable().some((x) => x.ini === s) ? s : null;
  }
  /* caseload patients with contact time today, the first one first */
  const kids = (first) => T.trackable().filter((c) => T.entries(c.ini).some((e) => e.date === T.TODAY)).sort((a, b) => (b.ini === first) - (a.ini === first));

  /* ================= the footer control ================= */
  const ui = { pick: null }; // the patient picker is open on this page (its route key)
  function pickerHtml() {
    const list = T.trackable();
    return '<div class="tt-pk" data-psy="tt-pick" role="dialog" aria-label="Track time for"><div class="tt-pkh"><b>Track time for</b><button type="button" class="tt-pkx" data-act="tt-pick-x" title="Close" aria-label="Close">×</button></div>' +
      '<div class="tt-pkl">' + list.map((c) => '<button type="button" class="tt-pkb" data-act="tt-pick" data-ini="' + esc(c.ini) + '" aria-label="Start timer for ' + esc(c.ini) + '"><b>' + esc(c.ini) + '</b><span>#' + esc(c.id) + '</span></button>').join('') + '</div></div>';
  }
  function footHtml() {
    if (!PSY.can('time')) return '';
    const r = T.running();
    if (r) {
      const p = !!r.paused; const who = esc(r.ini);
      return '<span class="tt-ft on' + (p ? ' pz' : '') + '" data-psy="foot-time" role="group" aria-label="' + (p ? 'Timer paused · ' : 'Timer · ') + who + '">' +
        '<span class="tt-fr" data-psy="tt-ft-read" title="' + (p ? 'Paused · ' : 'Timing ') + who + ' · started ' + esc(r.startedAt) + '">' + (p ? '<i class="tt-fp" aria-hidden="true"></i>' : '<i class="tt-fd" aria-hidden="true"></i>') +
          '<b><span data-l1a="tmin">' + T.elapsedMin() + '</span> min</b><span class="tt-fw">· ' + who + '</span></span>' +
        '<button type="button" class="tt-fb" data-act="tt-pause" data-psy="tt-ft-pause" title="' + (p ? 'Resume' : 'Pause') + '" aria-label="' + (p ? 'Resume timer' : 'Pause timer') + '">' + (p ? IC.play : IC.pause) + '</button>' +
        '<button type="button" class="tt-fb st" data-act="tt-stop" data-psy="tt-ft-stop" title="Stop" aria-label="Stop timer">' + IC.stop + '</button></span>';
    }
    const c = here(); const open = !c && ui.pick === keyOf();
    return '<span class="tt-ft" data-psy="foot-time"><button type="button" class="xp-time" data-act="xq-time" data-psy="tt-ft-start" title="' + (c ? 'Start timer · ' + esc(c.ini) : 'Track time') + '"' +
      (c ? ' aria-label="Track time for ' + esc(c.ini) + '"' : ' aria-haspopup="dialog" aria-expanded="' + open + '"') + '>' + IC.clock + 'Track time</button>' + (open ? pickerHtml() : '') + '</span>';
  }
  X.footTime = () => footHtml();
  const paintFoot = () => { const r = PSY.activeRoot(); const el = r && r.querySelector('[data-psy="foot-time"]'); if (el) el.outerHTML = footHtml(); };

  /* ================= the stopped interval in the work area ================= */
  /* a Scribe recording on this page is never covered */
  const recHere = () => { const S = PSY.scribe; try { return !!(S && S.run && S.run.key === S.key(S.ctx())); } catch (e) { return false; } };
  /* the interval the work area shows (PSY.time.st().open), while it is still a draft the role may save */
  function cardEntry() {
    const st = T.st(); if (!st.open) return null;
    const e = T.byId(st.open); if (!e || e.status !== 'draft') return null;
    if (!PSY.can('time') || !T.canTrack(e.laurisId) || recHere()) return null;
    return e;
  }
  const sumLine = (c) => { const sm = T.summary({ laurisId: c.id }); return 'Today with ' + esc(c.ini) + ' · <b>' + esc(sm.recorded) + '</b> recorded <span title="Recorded ≠ billable">≠</span> <b>' + esc(sm.units == null ? 'no unit rule' : plural(sm.units, 'unit')) + '</b> billable'; };
  function cardHtml() {
    const e = cardEntry(); if (!e) return '';
    const c = T.consumer(e.laurisId);
    return '<div class="tt-wk" data-psy="tt-work" data-tt-c="' + esc(c.id) + '"><div class="tt-wkh"><span class="tt-wki" aria-hidden="true">' + IC.clock + '</span><b>New interval · ' + esc(c.ini) + '</b>' +
      '<button type="button" class="tt-wkx" data-act="tt-wclose" title="Later" aria-label="Close · keep in Today">×</button></div>' +
      formHtml(e, goalsOf(c), { card: true }) + '<div class="tt-wks" data-tt="wk-sum">' + sumLine(c) + '</div></div>';
  }
  /* first in the work area: the interval just stopped shows over a Scribe draft or a Scan & Enhance result, which come back after Save */
  if (X.work && X.work.register) {
    X.work.register('time', { html: () => cardHtml() });
    X.work.list = X.work.list.filter((w) => w.key === 'time').concat(X.work.list.filter((w) => w.key !== 'time'));
  }
  const paintWork = () => { if (X.work && X.work.paint) X.work.paint(); };

  /* ================= the Today list ================= */
  /* one interval: a row, or (new / being edited) the entry form */
  function rowHtml(e, goals) {
    const g = e.goal ? goals.find((x) => x.n === e.goal) : null;
    return '<div class="tt-r' + (e.dpn ? ' ln' : '') + '" data-tt-id="' + esc(e.id) + '">' +
      '<span class="tt-mk" title="' + (e.live ? 'Tapped at the time' : 'Added later from the end-of-day recording') + '">' + (e.live ? '●' : '○') + '</span>' +
      '<span class="tt-l1"><span class="tt-t">' + esc(e.s) + ' – ' + esc(e.e) + '</span>' +
        (g ? '<span class="tt-tg" title="' + esc(g.obj) + '">Goal ' + g.n + '</span>' : '') + (e.dpn ? '<span class="tt-tg dp" title="In today’s DPN">DPN</span>' : '') +
        (e.status === 'draft' ? '<span class="tt-tg dr">Not saved</span>' : '') +
        (e.live ? '' : '<button class="tt-cf" data-act="l1a-time-confirm" data-id="' + esc(e.id) + '">confirm</button>') + '</span>' +
      '<span class="tt-rt"><span class="tt-m">' + e.m + ' min</span><button class="tt-pen" data-act="tt-edit" data-id="' + esc(e.id) + '" title="Edit entry" aria-label="Edit entry">' + PEN + '</button></span>' +
      '<span class="tt-w" title="' + esc(e.what) + '">' + esc(e.what || '—') + '</span></div>';
  }
  const tmNote = (e) => (e.timerM && e.timerM !== e.m ? 'Timer ' + e.timerM + ' min' : e.pausedM ? 'Paused ' + e.pausedM + ' min' : '');
  function formHtml(e, goals, o) {
    o = o || {}; const isNew = e.status === 'draft';
    const gopts = goals.length ? '<option value="">Choose a goal</option>' + goals.map((g) => '<option value="' + g.n + '"' + (e.goal === g.n ? ' selected' : '') + ' title="' + esc(g.obj) + '">Goal ' + g.n + ' · ' + esc(g.name) + '</option>').join('') : '<option value="">No ISP goals on file</option>';
    return '<div class="tt-ed' + (o.card ? ' cd' : '') + '" data-tt-ed="' + esc(e.id) + '"><div class="tt-edh"><b>' + (o.card ? '' : isNew ? 'New interval · ' : 'Edit entry · ') + '<span data-tt="se">' + esc(e.s) + ' – ' + esc(e.e) + '</span>' + (o.card ? ' · ' + DATE : '') + '</b>' +
      '<span data-tt="tm">' + tmNote(e) + '</span></div>' +
      '<label class="tt-f"><span class="cap">Recorded duration</span><span class="tt-in"><input class="fld" type="number" min="1" max="720" value="' + e.m + '" data-change="tt-min" data-id="' + esc(e.id) + '" data-tt="min" aria-label="Recorded duration in minutes"><i>min</i></span></label>' +
      '<label class="tt-f"><span class="cap">Intervention description</span><textarea class="fld" rows="' + (o.card ? 3 : 2) + '" data-input="tt-what" data-id="' + esc(e.id) + '" data-tt="what">' + esc(e.what) + '</textarea></label>' +
      '<label class="tt-f"><span class="cap">Associated treatment goal</span><select class="fld" data-change="tt-goal" data-id="' + esc(e.id) + '" data-tt="goal">' + gopts + '</select></label>' +
      '<div class="tt-bb"><button class="btn p' + (o.card ? '' : ' s') + '" data-act="tt-save" data-id="' + esc(e.id) + '">Save entry</button><button class="btn o' + (o.card ? '' : ' s') + '" data-act="tt-discard" data-id="' + esc(e.id) + '">' + (isNew ? 'Discard' : 'Cancel') + '</button></div></div>';
  }

  /* recorded vs billable, the unit rule, the DPN link */
  function totalsHtml(sm) {
    const na = sm.units == null;
    const rule = na
      ? '<div class="tt-rule na" data-tt="rule"><span class="chip y">Unit rule not configured</span>' + (PSY.can('settings') ? '<button class="tt-lk" data-act="tt-rule-edit" data-svc="' + esc(sm.service) + '">Set rule</button>' : '') + '</div>'
      : '<button class="tt-rule" data-act="l1a-time-rules" data-svc="' + esc(sm.service) + '" data-tt="rule" title="' + esc(sm.rule.source || '') + '"><span>Unit rule: ' + esc(sm.ruleText) + '</span><span class="chip n">Configurable</span></button>' +
        '<div class="tt-src" data-tt="src">' + esc(sm.rule.configured ? 'Configured by ' + (sm.rule.by || 'admin') + ' · ' + T.sourceShort(sm.rule) : T.sourceShort(sm.rule)) + '</div>';
    return '<div class="tt-tot" data-tt="tot"><div class="tt-boxes" aria-label="Recorded time is not billable time">' +
      '<div class="tt-box"><span>Recorded</span><b data-tt="rec">' + esc(sm.recorded) + '</b></div><span class="tt-ne" title="Recorded ≠ billable">≠</span>' +
      '<div class="tt-box b' + (na ? ' na' : '') + '"><span>Billable</span><b data-tt="units">' + (na ? '—' : plural(sm.units, 'unit')) + '</b></div></div>' + rule + '</div>';
  }
  function dpnHtml(c, es) {
    if (!PSY.can('scribe:dpn')) return '';
    const key = T.dpnKey(c.id); const saved = es.filter((e) => e.status !== 'draft'); const linked = saved.filter((e) => e.dpn === key); const todo = saved.filter((e) => e.dpn !== key);
    if (!saved.length || es.some((e) => e.status === 'draft')) return ''; // a new interval is saved (or discarded) first
    return '<div class="tt-dpn" data-tt="dpn">' + (todo.length ? '<button class="btn o s" data-act="tt-link" data-c="' + esc(c.id) + '" data-psy="tt-link">Add ' + (linked.length ? todo.length + ' more ' : '') + 'to today’s DPN</button>' : '') +
      (linked.length ? '<span class="chip g" data-psy="tt-linked">In today’s DPN · ' + plural(linked.length, 'interval') + '</span><button class="tt-lk" data-go="lauris-dpn?c=' + esc(c.id) + '">Open DPN</button>' : '') + '</div>';
  }
  function groupHtml(c, o) {
    o = o || {};
    const es = T.entries(c.ini).filter((e) => e.date === T.TODAY).slice().sort((a, b) => a.sMin - b.sMin);
    const sm = T.summary({ laurisId: c.id }); const goals = goalsOf(c); const card = cardEntry();
    const rows = o.rows === false ? '' : es.map((e) => ((e.status === 'draft' || e.editing) && !(card && card.id === e.id) ? formHtml(e, goals) : rowHtml(e, goals))).join('');
    return '<div class="tt-grp" data-tt-c="' + esc(c.id) + '"><div class="tt-gh"><b>' + esc(c.ini) + '</b><span>#' + esc(c.id) + ' · ' + esc(svcName(sm.service)) + '</span></div>' +
      rows + (es.length ? totalsHtml(sm) + dpnHtml(c, es) : '<div class="tt-none">Nothing yet</div>') + '</div>';
  }
  function listHtml(first) {
    const ks = kids(first);
    return '<div class="xcard w tt-list" data-tt="list"><div class="tt-lh"><span class="cap">Contact time today</span><button class="tt-lk" data-go="lauris-time">Lauris Time Tracker</button></div>' +
      (ks.length ? ks.map((c) => groupHtml(c)).join('') : '<div class="tt-none">Nothing yet</div>') + '</div>';
  }

  /* Send to the Lauris Time Tracker: one row under the list */
  function sendBlock(ks) {
    if (!ks.length) return '';
    const st = T.st(); const sent = st.sent || {};
    const stale = ks.filter((c) => sent[c.ini] && sent[c.ini].m !== T.total(c.ini)); const fresh = ks.filter((c) => !sent[c.ini]);
    let status;
    if (!fresh.length && !stale.length) status = '<span class="chip g">Sent ' + esc(sent[ks[0].ini].at) + '</span>';
    else if (stale.length) status = '<span class="chip y">Changed since ' + esc(sent[stale[0].ini].at) + '</span>';
    else status = '<span class="chip n">Not sent yet</span>';
    return '<div class="tt-foot" data-tt="send"><button class="btn o s" data-act="l1a-time-send" data-psy="tt-send">Send to Lauris time tracker</button>' + status + '</div>';
  }

  /* a role without Track time (the administrator, by default): the unit rules, which the admin can configure */
  const offHtml = () => '<div class="xcard w" data-tt="off"><b>Track time</b> · Not enabled for ' + esc(PSY.user().label) + '</div>' + T.rulesHtml({ edit: true });
  function body() {
    if (!PSY.can('time')) return offHtml();
    if (!T.trackable().length && !T.running()) return '<div class="xcard w" data-tt="off"><b>Track time</b> · No patients in your caseload</div>';
    const first = firstIni();
    return listHtml(first) + sendBlock(kids(first));
  }

  /* ---------- unit rules: a panel (Settings, the admin's Time view) and a modal ---------- */
  /* tiers [[120, 1], [180, 2], [300, 3]] → Under 2 h: no unit · 2 to 2.99 h: 1 unit · 3 to 4.99 h: 2 units · 5 h or more: 3 units */
  const hnum = (min) => String(+(min / 60).toFixed(2));
  const tierLines = (r) => {
    const t = (r.tiers || []).slice().sort((a, b) => a[0] - b[0]); const out = [];
    if (t.length) out.push(['Under ' + hnum(t[0][0]) + ' h', 'no unit']);
    t.forEach((x, i) => { const nx = t[i + 1]; out.push([nx ? hnum(x[0]) + ' to ' + (nx[0] / 60 - 0.01).toFixed(2) + ' h' : hnum(x[0]) + ' h or more', plural(x[1], 'unit')]); });
    return out;
  };
  const ruleLines = (r) => {
    if (!r) return [];
    const out = r.mode === 'tiers' ? tierLines(r).concat([['Rounding', 'Down to the tier reached']]) : [['Unit length', r.unitMin + ' min'], ['Rounding', { down: 'Down', up: 'Up', nearest: 'Nearest' }[r.rounding] || 'Down']];
    out.push(['Daily max', r.dailyMax ? plural(+r.dailyMax, 'unit') : 'None']);
    return out;
  };
  const kindOf = (r) => (r.kind === 'configured' ? 'Configured by ' + (r.by || 'admin') + (r.at ? ' · ' + r.at : '') : r.kind === 'policy' ? 'Published policy' : r.kind === 'documented' ? 'Documented requirement' : 'Verification needed');
  T.rulesHtml = (o) => {
    o = o || {}; const edit = !!o.edit && PSY.can('settings');
    return '<div class="tt-rules" data-tt="rules" data-edit="' + (edit ? 1 : 0) + '">' + (o.title === false ? '' : '<div class="cap">Unit rules</div>') + T.rules().map((x) => {
      const r = x.rule;
      return '<div class="tt-ru' + (r ? '' : ' na') + '" data-svc="' + esc(x.service) + '"><div class="tt-ruh"><b>' + esc(svcName(x.service)) + '</b>' + (r ? '<span class="chip n">Configurable</span>' : '<span class="chip y">Unit rule not configured</span>') + '</div>' +
        (r ? '<div class="tt-rut">' + ruleLines(r).map((l) => esc(l[0]) + ': ' + esc(l[1])).join(' · ') + '</div><div class="tt-rus"><b>' + esc(kindOf(r)) + '</b> · ' + esc(r.source || '') + '</div>' : '') +
        (edit ? '<div class="tt-rua"><button class="btn o s" data-act="tt-rule-edit" data-svc="' + esc(x.service) + '">' + (r ? 'Edit rule' : 'Set rule') + '</button>' + (r && r.configured ? '<button class="btn o s" data-act="tt-rule-reset" data-svc="' + esc(x.service) + '">' + (x.base ? 'Reset to default' : 'Remove rule') + '</button>' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  };
  /* the modal (light DOM: only the #modal styles apply) */
  const rulesModalBody = (first) => {
    const list = T.rules().sort((a, b) => (b.service === first) - (a.service === first)); const edit = PSY.can('settings');
    return list.map((x) => {
      const r = x.rule;
      const head = '<div style="display:flex;align-items:center;gap:8px;margin:' + (x === list[0] ? '0' : '16px') + ' 0 4px"><b style="font-size:14px">' + esc(svcName(x.service)) + '</b>' + (r ? '<span class="chip n">Configurable</span>' : '<span class="chip y">Unit rule not configured</span>') +
        (edit ? '<button class="btn o" data-act="tt-rule-edit" data-svc="' + esc(x.service) + '" style="margin-left:auto;min-height:32px;padding:0 12px;font-size:13px">' + (r ? 'Edit rule' : 'Set rule') + '</button>' : '') + '</div>';
      if (!r) return head;
      const li = (k, v) => '<li><b style="flex-basis:92px">' + esc(k) + '</b><span>' + esc(v) + '</span></li>';
      const max = 'Daily max ' + (r.dailyMax ? plural(+r.dailyMax, 'unit') : 'none');
      const rows = r.mode === 'tiers'
        ? li('Units a day', tierLines(r).map((l) => l[0] + ': ' + l[1]).join(' · ')) + li('Rounding', 'Down to the tier reached · ' + max)
        : li('Unit length', r.unitMin + ' min') + li('Rounding', ({ down: 'Down', up: 'Up', nearest: 'Nearest' }[r.rounding] || 'Down') + ' · ' + max);
      return head + '<ul class="log">' + rows + li('Source', kindOf(r) + ' · ' + (r.source || '')) + '</ul>';
    }).join('');
  };
  const openRules = (svc) => PSY.ui.modal({ title: 'How units are counted', sub: 'Unit rules · one per service', body: rulesModalBody(svc || 'tdt'), wide: true, actions: [{ label: 'Close' }] });
  /* set or edit a service's rule (admin): counting, unit length, rounding, daily maximum, source. Nothing is pre-filled for a service with no rule. */
  const openEditor = (svc) => {
    if (!PSY.can('settings')) { PSY.ui.toast('Admins set unit rules.'); return; }
    const r = T.rule(svc) || {}; const mode = r.mode || 'length';
    const tiers = (r.tiers || []).map((x) => x[0] / 60).join(', ');
    PSY.ui.modal({
      title: (T.rule(svc) ? 'Edit unit rule' : 'Set unit rule'), sub: svcName(svc),
      body: '<label for="tt-r-mode">Counting</label><select id="tt-r-mode"><option value="tiers"' + (mode === 'tiers' ? ' selected' : '') + '>Hours a day, in tiers</option><option value="length"' + (mode === 'length' ? ' selected' : '') + '>Fixed unit length</option></select>' +
        '<div id="tt-r-t"><label for="tt-r-tv">Tiers (hours a day for 1, 2, 3 … units)</label><input type="text" id="tt-r-tv" value="' + esc(tiers) + '"></div>' +
        '<div id="tt-r-l"><label for="tt-r-ul">Unit length (minutes)</label><input type="text" id="tt-r-ul" value="' + esc(r.unitMin || '') + '"><label for="tt-r-rd">Rounding</label><select id="tt-r-rd">' + ['down', 'nearest', 'up'].map((k) => '<option value="' + k + '"' + ((r.rounding || 'down') === k ? ' selected' : '') + '>' + k[0].toUpperCase() + k.slice(1) + '</option>').join('') + '</select></div>' +
        '<label for="tt-r-max">Daily maximum (units)</label><input type="text" id="tt-r-max" value="' + esc(r.dailyMax || '') + '">' +
        '<label for="tt-r-src">Source</label><input type="text" id="tt-r-src" value="' + esc(r.configured ? r.source || '' : '') + '">',
      actions: [{ label: 'Cancel' }, { label: 'Save rule', primary: true, onClick: (m) => {
        const v = (id) => (m.querySelector('#' + id) || {}).value || '';
        const md = v('tt-r-mode'); const max = v('tt-r-max').trim() === '' ? null : Math.round(+v('tt-r-max'));
        if (max != null && !(max > 0)) { PSY.ui.toast('Daily maximum must be a number.'); return false; }
        const rule = { mode: md, dailyMax: max, source: v('tt-r-src').trim() };
        if (md === 'tiers') {
          const hs = v('tt-r-tv').split(/[,;\s]+/).filter(Boolean).map(Number);
          if (!hs.length || hs.some((h) => !(h > 0)) || hs.some((h, i) => i && h <= hs[i - 1])) { PSY.ui.toast('Tiers must be rising hours.'); return false; }
          rule.tiers = hs.map((h, i) => [Math.round(h * 60), i + 1]); rule.rounding = 'down';
        } else {
          const len = +v('tt-r-ul'); if (!(len > 0)) { PSY.ui.toast('Add the unit length.'); return false; }
          rule.unitMin = Math.round(len); rule.rounding = v('tt-r-rd') || 'down';
        }
        const res = T.setRule(svc, rule); if (!res.ok) { PSY.ui.toast(res.reason); return false; }
        PSY.ui.toast('Unit rule saved.');
      } }],
      onOpen: (m) => {
        const sel = m.querySelector('#tt-r-mode'); const sync = () => { m.querySelector('#tt-r-t').hidden = sel.value !== 'tiers'; m.querySelector('#tt-r-l').hidden = sel.value !== 'length'; };
        sel.addEventListener('change', sync); sync();
      },
    });
  };

  /* ---------- redraw in place ---------- */
  U.reTime = (pane) => {
    if (!pane) return;
    const top = pane.scrollTop;
    pane.innerHTML = body(PSY.ext.lastPanel || null);
    pane.scrollTop = top;
    const r = pane.getRootNode && pane.getRootNode();
    if (r && r.querySelector) { if (U.refreshTracker) U.refreshTracker(r); if (PSY.l1b && PSY.l1b.timeChanged) PSY.l1b.timeChanged(r); }
  };
  const paneOf = (el) => (el && el.closest ? el.closest('[data-pane="time"]') : null) || (PSY.activeRoot() && PSY.activeRoot().querySelector('[data-pane="time"]'));
  const repaint = () => {
    const r = PSY.activeRoot(); if (!r) return;
    paintFoot();
    const pane = r.querySelector('[data-pane="time"]');
    if (pane) U.reTime(pane); else { if (U.refreshTracker) U.refreshTracker(r); if (PSY.l1b && PSY.l1b.timeChanged) PSY.l1b.timeChanged(r); }
    if (r.querySelector('[data-psy="tt-work"]') && X.mode() !== 'collapsed') paintWork();
    r.querySelectorAll('[data-tt="rules"]').forEach((el) => { if (!el.closest('[data-pane="time"]')) el.outerHTML = T.rulesHtml({ edit: el.getAttribute('data-edit') === '1', title: !!el.querySelector(':scope > .cap') }); });
  };
  T.onChange(repaint);
  const dot = (ini) => (/\.$/.test(ini) ? '' : '.'); // 'Timing M.R.' not 'Timing M.R..'
  /* the stopped interval in the work area: its intervention box gets the focus */
  const focusCard = () => {
    const r = PSY.activeRoot(); const wk = r && r.querySelector('[data-psy="tt-work"]'); if (!wk) return;
    const area = wk.closest('[data-psy="work"]'); if (area) area.scrollTop = 0;
    const ta = wk.querySelector('textarea'); if (ta && !ta.value) { try { ta.focus({ preventScroll: true }); } catch (e) {} }
  };
  /* after Save (or ×): the Today list, scrolled to that interval */
  const showInList = (id, flash) => {
    try { if (X.views().indexOf('today') >= 0 && X.view() !== 'today') X.setView('today'); } catch (e) {}
    const r = PSY.activeRoot(); const el = r && r.querySelector('[data-pane="time"] [data-tt-id="' + id + '"], [data-pane="time"] [data-tt-ed="' + id + '"]'); if (!el) return;
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    if (flash) { el.classList.add('tt-new'); setTimeout(() => el.classList.remove('tt-new'), 1800); }
  };

  /* pieces for other owners */
  T.paneHtml = (o) => body(o);
  T.timerHtml = () => footHtml();
  T.dayHtml = (laurisId, o) => { const c = T.consumer(laurisId); return c && T.canTrack(c.id) ? groupHtml(c, o) : ''; };

  /* ---------- start, stop, the picker ---------- */
  function startFor(ini) {
    ui.pick = null;
    const r = T.start(ini);
    if (!r) { paintFoot(); PSY.ui.toast(T.running() ? 'A timer is already running.' : 'Not in your caseload.'); return null; }
    T.st().sel = r.ini; PSY.save();
    PSY.ui.toast('Timing ' + r.ini + dot(r.ini));
    return r;
  }
  /* Stop records the interval at once; it opens in the work area (or waits in the Today list while the Scribe records here) */
  function stopNow() {
    const r = T.running(); if (!r) return null;
    const rec = recHere(); const e = T.stop(); if (!e) return null;
    if (!rec) { T.st().open = e.id; PSY.save(); repaint(); paintWork(); focusCard(); } else showInList(e.id);
    PSY.ui.toast('Logged ' + e.m + ' min with ' + r.ini + dot(r.ini));
    return e;
  }
  function openPicker() {
    const list = T.trackable();
    if (!list.length) { PSY.ui.toast('No patients in your caseload.'); return null; }
    if (list.length === 1) return startFor(list[0].ini);
    if (X.mode() === 'collapsed') X.set(true);
    ui.pick = ui.pick === keyOf() ? null : keyOf(); paintFoot();
    const r = PSY.activeRoot(); const b = ui.pick && r && r.querySelector('[data-psy="tt-pick"] .tt-pkb'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
    return null;
  }
  /* the footer pill (src/scribe.js 'xq-time' calls PSY.time.open): one tap starts for the patient on screen, or asks who from the caseload;
     with a timer running it stops */
  T.toggle = () => {
    if (T.running()) return stopNow();
    if (!PSY.can('time')) { PSY.ui.toast('Track time is off.'); return null; }
    const c = here(); if (c) return startFor(c.ini);
    return openPicker();
  };
  T.open = () => T.toggle();

  PSY.ext.defaults = PSY.ext.defaults || {};
  PSY.ext.defaults.time = (o) => body(o);

  /* the minute counter (one real second is one demo minute; checked four times a second so it never lags) */
  if (!PSY.__l1aTimeTick) PSY.__l1aTimeTick = setInterval(() => {
    try { const r = PSY.activeRoot(); if (!r || !T.running()) return; const m = String(T.elapsedMin()); r.querySelectorAll('[data-l1a="tmin"]').forEach((e) => { if (e.textContent !== m) e.textContent = m; }); } catch (e) {}
  }, 250);
  /* the picker closes on a click elsewhere or Escape; opening the Scribe or Scan & Enhance moves a stopped interval out of their way
     (it waits in the Today list) */
  if (!PSY.__ttFootWired) {
    PSY.__ttFootWired = true;
    const inside = (ev, sel) => (ev.composedPath ? ev.composedPath() : []).some((n) => n && n.nodeType === 1 && n.matches(sel));
    document.addEventListener('pointerdown', (ev) => { if (ui.pick && !inside(ev, '[data-psy="foot-time"]')) { ui.pick = null; paintFoot(); } }, true);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && ui.pick) { ui.pick = null; paintFoot(); } }, true);
    document.addEventListener('click', (ev) => { const st = PSY.state && PSY.state.timer; if (st && st.open && inside(ev, '[data-act="xq-scribe"],[data-act="xq-enhance"]')) { st.open = null; PSY.save(); repaint(); } }, true);
  }

  /* ---------- acts ---------- */
  PSY.acts['tt-pick'] = (el) => startFor(el.getAttribute('data-ini'));
  PSY.acts['tt-pick-x'] = () => { ui.pick = null; paintFoot(); };
  PSY.acts['tt-stop'] = () => stopNow();
  PSY.acts['l1a-time-sel'] = (el) => { const st = T.st(); st.sel = el.value; st.selFor = keyOf(); PSY.save(); U.reTime(paneOf(el)); };
  PSY.acts['l1a-time-toggle'] = () => T.toggle();
  PSY.acts['tt-pause'] = () => {
    const r = T.running(); if (!r) return;
    if (r.paused) { T.resume(); PSY.ui.toast('Resumed.'); } else { T.pause(); PSY.ui.toast('Paused.'); }
  };
  /* the recorded duration: the interval's end moves with it (updated in place, so the next click is not lost to a redraw) */
  PSY.acts['tt-min'] = (el) => {
    const e = T.byId(el.dataset.id); if (!e) return;
    const v = Math.round(+el.value); if (!(v > 0)) { el.value = e.m || ''; return; }
    const m = Math.min(720, v); T.patch(e.id, { m, e: T.clockOf(e.sMin + m + (e.pausedM || 0)) }, { quiet: true }); el.value = m;
    const ed = el.closest('[data-tt-ed]'); const x = T.byId(e.id);
    if (ed) { const se = ed.querySelector('[data-tt="se"]'); if (se) se.textContent = x.s + ' – ' + x.e; const tm = ed.querySelector('[data-tt="tm"]'); if (tm) tm.textContent = tmNote(x); }
    const sum = el.closest('[data-psy="tt-work"]') && el.closest('[data-psy="tt-work"]').querySelector('[data-tt="wk-sum"]'); if (sum) sum.innerHTML = sumLine(T.consumer(x.laurisId));
  };
  PSY.acts['tt-what'] = (el) => { T.patch(el.dataset.id, { what: el.value }, { quiet: true }); };
  PSY.acts['tt-goal'] = (el) => { T.patch(el.dataset.id, { goal: el.value ? +el.value : null }, { quiet: true }); };
  PSY.acts['tt-edit'] = (el) => {
    const e = T.byId(el.dataset.id); if (!e) return; e.editing = true; e.undo = { what: e.what, goal: e.goal, m: e.m, e: e.e }; PSY.save(); T.changed();
    const r = PSY.activeRoot(); const ed = r && r.querySelector('[data-pane="time"] [data-tt-ed="' + e.id + '"]'); if (ed) { try { ed.scrollIntoView({ block: 'nearest' }); } catch (x) {} }
  };
  PSY.acts['tt-save'] = (el) => {
    const id = el.dataset.id; const e = T.byId(id); if (!e) return;
    const ed = el.closest('[data-tt-ed]'); const q = (k) => ed && ed.querySelector('[data-tt="' + k + '"]');
    const st = T.st(); const fromCard = st.open === id;
    const res = T.save(id, { what: q('what') ? q('what').value : e.what, goal: q('goal') ? q('goal').value : e.goal, m: q('min') ? q('min').value : e.m }, { needGoal: goalsOf(T.consumer(e.laurisId)).length > 0 });
    if (!res.ok) { PSY.ui.toast(res.reason); return; }
    delete res.entry.undo; if (fromCard) { st.open = null; paintWork(); } PSY.save();
    showInList(id, true);
    PSY.ui.toast('Entry saved.');
  };
  PSY.acts['tt-discard'] = (el) => {
    const e = T.byId(el.dataset.id); if (!e) return;
    if (e.status === 'draft') { const st = T.st(); if (st.open === e.id) st.open = null; T.discard(e.id); paintWork(); PSY.ui.toast('Interval discarded.'); return; }
    if (e.undo) Object.assign(e, e.undo); delete e.undo; e.editing = false; PSY.save(); T.changed();
  };
  /* × on the work-area entry: it stays a draft in the Today list */
  PSY.acts['tt-wclose'] = () => { const st = T.st(); const id = st.open; st.open = null; PSY.save(); repaint(); paintWork(); if (id) showInList(id); PSY.ui.toast('Interval kept in Today.'); };
  PSY.acts['l1a-time-confirm'] = (el) => {
    const id = el.getAttribute('data-id'); const e = id ? T.byId(id) : T.entries(el.getAttribute('data-ini'))[+el.getAttribute('data-i')];
    if (e) { e.live = true; PSY.save(); T.changed(); PSY.ui.toast('Confirmed.'); }
  };
  /* Add to today's DPN: every saved interval of that patient today (a new interval is linked once it is saved) */
  PSY.acts['tt-link'] = (el) => {
    const c = T.consumer(el.getAttribute('data-c')); if (!c || !T.canTrack(c.id)) return;
    const key = T.dpnKey(c.id); const ids = T.entries({ laurisId: c.id }).filter((e) => e.status !== 'draft' && e.dpn !== key).map((e) => e.id);
    const n = T.link(ids, key); if (!n) { PSY.ui.toast('Already in today’s DPN.'); return; }
    const sm = T.summary({ dpnKey: key });
    if (PSY.audit) PSY.audit.add({ case: c.case, action: 'Time linked to the ' + c.ini + ' DPN of ' + DATE + ': ' + plural(sm.count, 'interval') + ', ' + sm.recorded + ' recorded, ' + sm.unitsText + ' billable', by: PSY.user().name, doc: 'Daily Progress Note – TDT', silent: true });
    PSY.ui.toast('Added to today’s DPN.');
  };
  function doSend(ini) {
    const st = T.st(); st.sent = st.sent || {};
    const c = L.byIni(ini); const m = T.total(ini); const u = c ? T.units(m, T.serviceOf(c.id)) : T.unitsFor(m);
    st.sent[ini] = { m, units: u == null ? 0 : u, at: PSY.now(), n: T.entries(ini).length };
    if (c && c.case) PSY.log(c.case, 'Contact time sent to the Lauris Time Tracker: ' + T.fmt(m) + ' recorded, ' + (u == null ? 'unit rule not configured' : plural(u, 'unit')) + '.', PSY.role() === 'lcs' ? undefined : PSY.user().lauris);
    PSY.save();
    return st.sent[ini];
  }
  PSY.acts['l1a-time-send'] = () => {
    const st = T.st(); const ks = kids(null);
    if (!ks.length) { PSY.ui.toast('Nothing to send.'); return; }
    const pend = ks.filter((c) => { const s = (st.sent || {})[c.ini]; return !s || s.m !== T.total(c.ini); });
    if (!pend.length) { PSY.ui.toast('Already sent.'); return; }
    const later = []; pend.forEach((c) => T.entries(c.ini).forEach((e) => { if (!e.live) later.push({ ini: c.ini, e }); }));
    const finish = (confirmAll) => {
      if (confirmAll) later.forEach((x) => { x.e.live = true; });
      pend.forEach((c) => doSend(c.ini));
      T.changed();
      PSY.ui.toast('Sent.');
    };
    if (later.length) {
      PSY.ui.modal({
        title: 'Confirm the time added later?', sub: pend.map((c) => c.ini).join(', ') + ' · today',
        body: '<ul class="log">' + later.map((x) => '<li><b>' + esc(x.ini) + ' · ' + esc(x.e.s) + '–' + esc(x.e.e) + '</b><span>' + esc(x.e.what) + ' · ' + x.e.m + ' min</span></li>').join('') + '</ul>' +
          '<p style="margin:10px 0 0;font-size:13px">Confirm only time you were with the patient.</p>',
        actions: [{ label: 'Not yet' }, { label: 'Confirm and send', primary: true, onClick: () => { finish(true); } }],
      });
      return;
    }
    finish(false);
  };
  PSY.acts['l1a-time-rules'] = (el) => openRules(el && el.getAttribute ? el.getAttribute('data-svc') : null);
  PSY.acts['tt-rule-edit'] = (el) => openEditor(el.getAttribute('data-svc'));
  PSY.acts['tt-rule-reset'] = (el) => { const svc = el.getAttribute('data-svc'); T.resetRule(svc); PSY.ui.toast(T.rule(svc) ? 'Default rule restored.' : 'Unit rule removed.'); };

  /* ---------- scenario 2 (prompt §14): Kayla Hale (DSS) on M.R.'s DPN, the morning logged, the footer's Track time ready for the afternoon ---------- */
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  PSY.presenter.prep.s2 = () => {
    PSY.state.role = 'dss';
    const t = T.st(); t.running = null; t.sent = {}; t.open = null; ui.pick = null;
    t.entries['M.R.'] = T.seed('4471').filter((e) => e.sMin < 13 * 60); // 8:05–12:25: 2 h 50 min, 1 unit
    t.clock = 13 * 60 + 10; t.sel = 'M.R.'; t.selFor = null;
    PSY.state.ext.view = 'time'; PSY.state.ext.tab = 'time';
    /* start on the Today list: no Scribe chooser or recording left open by an earlier scenario (the Scribe's UI lives outside PSY.state) */
    const S = PSY.scribe; if (S) { if (S.run) { clearTimeout(S.run.timer); S.run = null; } if (S.ui) { S.ui.choose = null; S.ui.gen = null; S.ui.sel = null; } }
    PSY.save();
  };

  /* ================= Lauris Time Tracker (Lauris's own page; re-registered here from 62-lauris-admin-pages.js) =================
     Rows: the signed-in staff member's caseload. Units per day follow each consumer's service rule (PSY.time.units). */
  const tbl = (head, rows, empty) => '<table class="lt"><thead><tr>' + head.map((h) => '<th' + (h[1] ? ' class="' + h[1] + '"' : '') + '>' + esc(h[0]) + '</th>').join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '"><div class="l1-empty">' + empty + '</div></td></tr>') + '</tbody></table>';
  const DAYS = { this: [['Mon', '10/26'], ['Tue', '10/27'], ['Wed', '10/28'], ['Thu', '10/29'], ['Fri', '10/30']], last: [['Mon', '10/19'], ['Tue', '10/20'], ['Wed', '10/21'], ['Thu', '10/22'], ['Fri', '10/23']] };
  const MINS = {
    this: { '4471': [320, 305, 320], '4458': [300, 310, 305], '4441': [185, 190, 180], '4430': [315, 300, 310], '4426': [125, 130, 120] },
    last: { '4471': [310, 320, 300, 305, 315], '4458': [305, 300, 310, 300, 295], '4441': [190, 185, 180, 195, 185], '4430': [300, 310, 305, 315, 300], '4426': [120, 125, 130, 125, 120] },
  };
  const unitsOf = (m, c) => T.units(m, T.serviceOf(c.id));
  const uTxt = (u) => (u == null ? 'no unit rule' : plural(u, 'unit'));
  function cellOf(m, c, extra) { return m ? U.hm(m) + '<span class="u">' + uTxt(unitsOf(m, c)) + (extra || '') + '</span>' : '—'; }
  function weekTable(w) {
    const days = DAYS[w]; const st = T.st(); let totM = 0, totU = 0; const mine = PSY.caseload();
    const rows = L.consumers.filter((c) => mine.indexOf(c.id) >= 0 && (MINS[w][c.id] || (w === 'this' && T.entries(c.ini).length))).map((c) => {
      const data = (MINS[w][c.id] || (w === 'this' ? [0, 0, 0] : [0, 0, 0, 0, 0])).slice(); let sum = 0, un = 0;
      data.forEach((m) => { sum += m; if (m) un += unitsOf(m, c) || 0; });
      let tds = data.map((m, i) => '<td class="num' + (w === 'this' && i === 3 ? ' th4' : '') + '">' + cellOf(m, c) + '</td>');
      if (w === 'this') {
        const sent = (st.sent || {})[c.ini]; const has = T.entries(c.ini).length;
        let h4;
        if (sent) { h4 = cellOf(sent.m, c, ' · sent from Psyflo'); sum += sent.m; un += unitsOf(sent.m, c) || 0; }
        else if (has) { const tm = T.total(c.ini); h4 = '<a class="lk" data-act="l1a-open-time" data-ini="' + esc(c.ini) + '">' + U.hm(tm) + '<span class="u">' + uTxt(unitsOf(tm, c)) + ' · in Psyflo, not sent</span></a>'; }
        else h4 = '—';
        tds = tds.concat(['<td class="num th4">' + h4 + '</td>', '<td class="num">—</td>']);
      }
      totM += sum; totU += un;
      return '<tr class="hov"><td><a class="lk" data-go="lauris-consumer?c=' + c.id + '">' + esc(c.ini) + '</a><span class="u">' + esc(c.id) + '</span></td>' + tds.join('') + '<td class="num"><b>' + U.hm(sum) + '</b></td><td class="num"><b>' + un + '</b></td></tr>';
    });
    const head = [['Consumer']].concat(days.map((d) => [d[0] + ' ' + d[1], 'num'])).concat([['Hours', 'num'], ['Units', 'num']]);
    if (rows.length) rows.push('<tr class="tot"><td>Total</td>' + days.map(() => '<td></td>').join('') + '<td class="num">' + U.hm(totM) + '</td><td class="num">' + totU + '</td></tr>');
    return '<div class="l1-wk">' + tbl(head, rows, 'No time this week') + '</div>';
  }
  function sentList() {
    const st = T.st(); const sent = st.sent || {}; const mine = PSY.caseload(); const keys = Object.keys(sent).filter((k) => { const c = L.byIni(k); return !c || mine.indexOf(c.id) >= 0; });
    if (!keys.length) return '<div class="l1-empty">Nothing sent <a class="lk" data-act="l1a-open-time" data-ini="">Track time in Psyflo</a></div>';
    return tbl([['Consumer'], ['Contact time', 'num'], ['Units', 'num'], ['Sent'], ['Source']], keys.map((k) => '<tr class="hov"><td>' + esc(k) + '</td><td class="num">' + esc(T.fmt(sent[k].m)) + '</td><td class="num">' + sent[k].units + '</td><td>' + esc(sent[k].at) + '</td><td>Psyflo</td></tr>'), '');
  }
  function unitCalc(h, m) {
    const mins = Math.max(0, (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0)); const u = T.units(mins, 'tdt');
    return T.fmt(mins) + ' → ' + (u == null ? 'unit rule not configured' : u ? plural(u, 'unit') : 'no units (under ' + T.hrs(((T.rule('tdt') || {}).tiers || [[120]])[0][0]) + ')');
  }
  PSY.register({
    id: 'lauris-time', app: 'lauris', label: 'Time Tracker', url: 'timetracker', css: U.css,
    render() {
      const S = U.S(); const w = S.week === 'last' ? 'last' : 'this';
      const main = '<div class="l1-row" style="margin:0 0 4px"><h3 class="lh1" style="margin:0;flex:1">Time Tracker</h3><span data-psy="saved" class="lmuted">' + (S.sheet ? 'Timesheet saved ' + esc(S.sheet.at) : '') + '</span></div>' +
        '<div class="ltabs" data-psy="wtabs"><a class="ltab' + (w === 'this' ? ' on' : '') + '" data-act="l1a-week" data-w="this">This week · 10/26 – 10/30</a><a class="ltab' + (w === 'last' ? ' on' : '') + '" data-act="l1a-week" data-w="last">Last week · 10/19 – 10/23</a></div>' +
        '<div class="lcard" style="overflow-x:auto" data-psy="wk">' + weekTable(w) + '</div>' +
        '<div class="l1-row" style="margin:10px 0 16px"><button class="lb pri" data-act="l1a-sheet-save">Save timesheet</button></div>' +
        '<div class="l1-card flush"><h4>Sent from Psyflo today</h4><div style="padding:10px 0 0" data-psy="sent">' + sentList() + '</div></div>' +
        '<div class="l1-card"><h4>Hours to units · TDT</h4><div class="l1-row"><div style="width:90px"><label>Hours</label><input class="l1-in" type="number" min="0" max="12" value="5" data-psy="uh" data-input="l1a-unit-calc"></div><div style="width:90px"><label>Minutes</label><input class="l1-in" type="number" min="0" max="59" value="10" data-psy="um" data-input="l1a-unit-calc"></div>' +
        '<div style="font-size:15px;font-weight:700;color:#1F3B6B;align-self:flex-end;padding-bottom:5px" data-psy="uout">' + esc(unitCalc(5, 10)) + '</div></div></div>';
      return PSY.lauris.page({ active: 'Time Tracker', main, panel: { context: 'Time Tracker · ' + PSY.lauris.user.short, notes: U.notes && U.notes.time ? U.notes.time() : '', student: 'M.R.', case: 'R-0411' } });
    },
  });
  /* the Time view calls this after today's time changes: redraw the table here if this page is open */
  U.refreshTracker = (root) => {
    const wk = root && root.querySelector && root.querySelector('[data-psy="wk"]'); if (!wk) return;
    wk.innerHTML = weekTable(U.S().week === 'last' ? 'last' : 'this');
    const sent = root.querySelector('[data-psy="sent"]'); if (sent) sent.innerHTML = sentList();
  };
  PSY.acts['l1a-week'] = (el, ctx) => {
    const w = el.getAttribute('data-w'); U.S().week = w; PSY.save();
    ctx.root.querySelectorAll('[data-psy="wtabs"] .ltab').forEach((t) => t.classList.toggle('on', t.getAttribute('data-w') === w));
    ctx.root.querySelector('[data-psy="wk"]').innerHTML = weekTable(w);
  };
  PSY.acts['l1a-sheet-save'] = (el, ctx) => {
    const S = U.S(); S.sheet = { at: PSY.now() }; PSY.save();
    const s = ctx.root.querySelector('[data-psy="saved"]'); if (s) s.textContent = 'Timesheet saved ' + S.sheet.at;
    PSY.ui.toast('Timesheet saved.');
  };
  PSY.acts['l1a-unit-calc'] = (el, ctx) => {
    const r = ctx.root; r.querySelector('[data-psy="uout"]').textContent = unitCalc(r.querySelector('[data-psy="uh"]').value, r.querySelector('[data-psy="um"]').value);
  };

  /* ---------- CSS (extension in Lauris; the rules panel also in the platform, for Settings) ---------- */
  const CSS = `
.xp-foot{position:relative}
.tt-ft{display:inline-flex;align-items:center;flex:0 0 auto;min-width:0}
.xp-foot:has(.tt-ft.on) .live{display:none}
.xp-time[aria-expanded="true"]{border-color:#B9541F;background:#FFF8F2}
.tt-ft.on{height:32px;border:1px solid #B9541F;border-radius:999px;background:#FFF5EC;padding:0 3px 0 10px;gap:3px}
.tt-ft.on.pz{border-color:#B8B2A7;background:#F3F0EA}
.tt-fr{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;color:#151B24;padding-right:3px;cursor:default}
.tt-fr b{font-weight:700}
.tt-fw{font-weight:600;color:#3E4652}
.tt-fd{width:8px;height:8px;border-radius:50%;background:#B9541F;flex:0 0 8px;animation:xplive 1.6s infinite}
.tt-fp{width:8px;height:9px;flex:0 0 8px;box-sizing:border-box;border-left:3px solid #6B665E;border-right:3px solid #6B665E}
.tt-ft.pz .tt-fr b{animation:ttpz 1.4s ease-in-out infinite}
@keyframes ttpz{50%{opacity:.35}}
.tt-fb{width:26px;height:26px;flex:0 0 26px;border-radius:50%;border:0;background:transparent;color:#3E4652;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.tt-fb:hover{background:#fff;color:#151B24}
.tt-fb.st{background:#151B24;color:#fff}.tt-fb.st:hover{background:#000}
.tt-fb:focus-visible,.xp-time:focus-visible,.tt-pkb:focus-visible{outline:2px solid #217A78;outline-offset:2px}
.tt-pk{position:absolute;left:10px;right:10px;bottom:calc(100% + 6px);z-index:6;background:#fff;border:1px solid #D9D4CC;border-radius:12px;box-shadow:0 12px 32px rgba(21,27,36,.18);padding:10px 10px 12px}
.tt-pkh{display:flex;align-items:center;justify-content:space-between;font-size:13px;margin:0 0 8px 2px}
.tt-pkx{width:26px;height:26px;border-radius:7px;border:1px solid #D9D4CC;background:#fff;font:inherit;font-size:16px;line-height:1;cursor:pointer;color:#3E4652;display:inline-flex;align-items:center;justify-content:center}
.tt-pkx:hover{background:#F3F0EA}
.tt-pkl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tt-pkb{display:flex;align-items:center;gap:6px;min-height:34px;padding:0 10px;border:1px solid #D9D4CC;border-radius:8px;background:#fff;font:inherit;cursor:pointer;text-align:left;color:#151B24;white-space:nowrap}
.tt-pkb b{font-size:13px}.tt-pkb span{font-size:11.5px;color:#525B66}
.tt-pkb:hover{border-color:#B9541F;background:#FFF8F2}
.tt-wk{display:flex;flex-direction:column;gap:10px;flex:0 0 auto}
.tt-wkh{display:flex;align-items:center;gap:9px;font-size:15px;line-height:1.25}
.tt-wkh b{flex:1;min-width:0;font-weight:700}
.tt-wki{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:#B9541F;color:#fff;display:inline-flex;align-items:center;justify-content:center}
.tt-wkx{flex:0 0 30px;width:30px;height:30px;border-radius:8px;border:1px solid #D9D4CC;background:#fff;font:inherit;font-size:18px;line-height:1;cursor:pointer;color:#3E4652;display:inline-flex;align-items:center;justify-content:center}
.tt-wkx:hover{background:#F3F0EA}
.tt-wks{font-size:12.5px;color:#525B66;font-variant-numeric:tabular-nums}.tt-wks b{color:#151B24;font-weight:700}
.tt-ed.cd{margin:0;padding:0;gap:10px;border:0;background:none}
.tt-ed.cd .tt-edh{color:#3E4652}
.tt-ed.cd .tt-bb .btn{min-height:42px}
.tt-ed.cd .tt-bb .btn.p{flex:2}
.tt-f{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.tt-bb{display:flex;gap:8px}.tt-bb .btn{flex:1}
.tt-list{flex:0 0 auto}
.tt-lh{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.tt-none{font-size:13px;color:#525B66;padding-top:6px}
.tt-grp{border-top:1px solid #EFEBE4;margin-top:8px;padding-top:8px}
.tt-list .tt-lh+.tt-grp{border-top:0;margin-top:2px;padding-top:2px}
.tt-gh{display:flex;align-items:baseline;gap:8px;font-size:13.5px;margin-bottom:2px}
.tt-gh span{color:#525B66;font-size:12px}
.tt-r{display:grid;grid-template-columns:12px minmax(0,1fr) auto;column-gap:7px;row-gap:1px;padding:5px 0;font-size:12.5px;border-bottom:1px solid #F3F0EA;align-items:baseline;border-radius:4px;transition:background .4s}
.tt-r.tt-new{background:#FFF1E4}
.tt-mk{font-size:11px}
.tt-l1{display:flex;align-items:baseline;gap:6px;min-width:0;flex-wrap:wrap}
.tt-t{font-variant-numeric:tabular-nums;font-weight:600}
.tt-tg{font-size:10.5px;font-weight:700;border-radius:4px;padding:0 5px;background:#EEEBE5;color:#3E4652;line-height:16px}
.tt-tg.dp{background:#DDF1EF;color:#15605E}
.tt-tg.dr{background:#FCEFD0;color:#6F4A05}
.tt-rt{display:flex;align-items:center;gap:4px;justify-self:end}
.tt-m{font-variant-numeric:tabular-nums}
.tt-pen{border:0;background:none;padding:1px 2px;cursor:pointer;color:#8E99A6;display:inline-flex}
.tt-pen:hover{color:#151B24}
.tt-w{grid-column:2/4;color:#525B66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-cf{border:0;background:none;padding:0;font:inherit;font-weight:600;color:#6F4A05;text-decoration:underline;cursor:pointer;font-size:12px}
.tt-ed{border:1px solid #F0B44C;background:#FFFDF7;border-radius:10px;padding:10px;margin:6px 0;display:flex;flex-direction:column;gap:8px}
.tt-edh{display:flex;gap:8px;align-items:baseline;font-size:13px;font-variant-numeric:tabular-nums}.tt-edh>span{margin-left:auto;font-size:12px;color:#525B66}
.tt-in{display:flex;align-items:center;gap:6px}.tt-in .fld{width:88px}.tt-in i{font-style:normal;font-size:12.5px;color:#525B66}
.tt-ed textarea.fld{min-height:54px}
.tt-tot{margin-top:9px}
.tt-boxes{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:7px;align-items:center}
.tt-box{border:1px solid #E6E1D9;border-radius:8px;padding:5px 10px;background:#F8F6F2;display:flex;flex-direction:column;min-width:0}
.tt-box span{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#525B66;font-weight:600}
.tt-box b{font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
.tt-box.b{border-color:#217A78;background:#F2F9F8}.tt-box.b b{color:#15605E}
.tt-box.na{border-color:#F0B44C;background:#FFFDF7}.tt-box.na b{color:#8E99A6}
.tt-ne{font-size:17px;color:#525B66;font-weight:700}
.tt-rule{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:7px;border:0;background:none;padding:0;font:inherit;font-size:12px;color:#15605E;text-align:left;cursor:pointer}
.tt-rule>span:first-child{text-decoration:underline;text-underline-offset:2px}
.tt-rule.na{cursor:default}
.tt-src{font-size:11.5px;color:#525B66;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-lk{border:0;background:none;padding:0;font:inherit;font-size:12px;font-weight:600;color:#15605E;text-decoration:underline;cursor:pointer}
.tt-dpn{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}
.tt-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:0 0 auto;font-size:12px}
.tt-rules{display:flex;flex-direction:column;gap:8px}
.tt-ru{border:1px solid #E6E1D9;border-radius:10px;padding:9px 11px;background:#fff;font-size:12.5px;display:flex;flex-direction:column;gap:4px}
.tt-ru.na{border-color:#F0B44C;background:#FFFDF7}
.tt-ruh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tt-ruh b{font-size:13px}
.tt-rut{color:#151B24;line-height:1.45}
.tt-rus{color:#525B66;font-size:12px;line-height:1.4}.tt-rus b{font-weight:600}
.tt-rua{display:flex;gap:6px;margin-top:3px}
.tt-ru .chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:600;white-space:nowrap}
.tt-ru .chip.n{background:#EEEBE5;color:#3E4652}.tt-ru .chip.y{background:#FCEFD0;color:#6F4A05}
`;
  PSY.css.lauris = (PSY.css.lauris || '') + CSS;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
})();
