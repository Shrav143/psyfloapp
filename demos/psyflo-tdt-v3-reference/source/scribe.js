/* The extension's buttons at the top of the panel, one compact row:  [ Overview ] [ Scribe ] [ Scan & Enhance ]  (each only when the role has it;
   round 10: Track Time is the footer's small control, PSY.ext.footTime; round 13: Overview = the patient roster, PSY.ext.ovBtn from
   src/screens/63b-ext-overview.js)
   Round 9 Scribe (prompt §4, §5), in the panel's work area (PSY.ext.work 'scribe'), never in a modal:
     1. Document type (a dropdown, filtered by PSY.can('scribe:<type>')) + Patient (the role's caseload) + Start recording
   Round 10 wording: everything the extension shows says "patient" (S.pw maps a Lauris label such as "Consumer response" for display;
   the Lauris page, the note text pushed into it and the sync keys keep Lauris's own "consumer").
     2. Recording: Pause · Resume · Stop (simulated transcription streams in; nothing is drafted until the clinician asks)
     3. Review transcript → Generate draft
     4. The draft: Edit draft (the fields become editable) · Review transcript; versions and sync through PSY.sync (src/screens/05-sync.js):
          Original → AI Draft → Clinician Edited → Approved → Synchronized · Save draft · Approve · Save & Push to Lauris
        - DPN (kind 'fields'): seven fields; a field nothing was said about stays empty and is flagged "Not stated"
        - Collateral / Monthly (kind 'note'): the note text
        - Admission Screening / Intake (kind 'form'): the captured form values by section, pushed into the Lauris form boxes
        A processed note is never overwritten: its push becomes a dated addendum. Save & Copy appears only for a type the demo cannot
        populate directly (handler.direct === false); every Scribe type today writes straight into its Lauris page.
   A page registers what its Scribe does:
     PSY.scribe.register(route, { type, kind:'note'|'fields', child(params), lines(params) → [{t,who,text}],
       note(params) → text                       (kind 'note')
       fields(params) → { values, src }, FIELDS, compose(values) → text, parse(text) → values, goals?(params), track?(params)   (kind 'fields')
       current(root, params) → what Lauris has now (text) · write(text, params, root) → Promise<true | {ok:false, reason} | {ok:true, mode}>
       processed(params) → at | null · differs?(root, params, syncedText) → true when Lauris was changed by hand since the sync })
     PSY.lf.scribe(route, formId, { … }) registers a form (kind 'form', src/lf-kit.js); the form writer is here (PSY.lf.fill).
   Sync keys (S.syncKey): dpn|<id>|2026-10-29 · collateral|<id>|2026-10-29 · monthly|<id>|2026-10 · form|<formId>|<id>.
   Text formats: DPN = labelled lines (PSY.dpn.compose / parse) · notes = plain text · forms = JSON of { key: value }.
   Also: the Track Time button (PSY.time.open(), owner T9) and PSY.copy. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const S = (PSY.scribe = { handlers: {}, run: null, showTx: {}, ui: { choose: null, sel: null, starting: null, gen: null } });
  const T = () => PSY.time || null;
  const SY = () => PSY.sync;
  const TODAY = '2026-10-29';
  const ICON = {
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6.5" y="5.5" width="4" height="13" rx="1.2"/><rect x="13.5" y="5.5" width="4" height="13" rx="1.2"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3L12 16.5l-1.3-3.2L7.5 12l3.2-1.3z"/></svg>',
  };
  S.register = (id, h) => { S.handlers[id] = Object.assign({ kind: 'note', direct: true }, h); };
  /* round 10: a label as the extension shows it ("Consumer response" → "Patient response"); values and pushed text are untouched */
  S.pw = (s) => String(s == null ? '' : s).replace(/\b(C|c)onsumer(s?)\b/g, (m, c, pl) => (c === 'C' ? 'Patient' : 'patient') + pl);

  /* ---------- the five document types. route = the Lauris page the type opens; lauris = the session name in Lauris ---------- */
  S.TYPES = [
    { k: 'admission', label: 'Admission Screening', title: 'Admission Screening', route: 'lauris-screening', lauris: 'Admission Screening', dc: '4492' },
    { k: 'intake', label: 'Comprehensive Intake / Needs Assessment', title: 'Intake / Needs Assessment', route: 'lauris-cna', lauris: 'Intake (CNA)', dc: '4492' },
    { k: 'dpn', label: 'Daily Progress Note (DPN)', title: 'Daily Progress Note', route: 'lauris-dpn', lauris: 'Daily Progress Note – TDT', dc: '4471' },
    { k: 'collateral', label: 'Collateral Contact', title: 'Collateral Contact', route: 'lauris-collateral', lauris: 'Collateral Contact', dc: '4471' },
    { k: 'monthly', label: 'Monthly Note / Review', title: 'Monthly Note / Review', route: 'lauris-monthly', lauris: 'Monthly Summary', dc: '4471' },
  ];
  S.type = (k) => S.TYPES.find((t) => t.k === k) || null;
  S.typeOf = (route) => S.TYPES.find((t) => t.route === route) || null;
  S.types = () => S.TYPES.filter((t) => PSY.can('scribe:' + t.k));
  /* patient-level access: the consumers the role works with (PSY.caseload, foundation) */
  const caseIds = () => { const all = PSY.data.lauris.consumers.map((x) => x.id); try { return PSY.caseload ? PSY.caseload() : all; } catch (e) { return all; } };
  S.mine = (id) => caseIds().indexOf(String(id)) >= 0;

  /* what the page is about: the consumer from the route (and, on a past note, its date) */
  S.ctx = () => {
    const cur = PSY.current(); const p = cur.params || {}; const L = PSY.data.lauris; let cons = null;
    if (p.c) cons = L.byId(p.c); else if (p.case) cons = L.byCase(p.case); else if (p.id) cons = L.byCase(p.id) || L.byId(p.id);
    return { route: cur.id, params: p, consumer: cons, app: cur.app };
  };
  S.key = (c) => c.route + '|' + (c.consumer ? c.consumer.id : '') + (c.params && c.params.past ? '|' + c.params.past : '');
  S.get = (c) => ((PSY.state.scribe = PSY.state.scribe || {})[S.key(c)]) || {};
  S.st = (c) => { const m = (PSY.state.scribe = PSY.state.scribe || {}); return (m[S.key(c)] = m[S.key(c)] || {}); };
  S.handlerFor = (c) => (c.params && c.params.past ? null : S.handlers[c.route] || null);
  const childOf = (c, h) => c.consumer || (h && h.child ? h.child(c.params) : null) || PSY.data.lauris.byId((S.type(h && h.type) || {}).dc || '4471');
  const pad = (n) => String(n).padStart(2, '0');
  const mmss = (sec) => Math.floor(sec / 60) + ':' + pad(sec % 60);
  const norm = (s) => String(s == null ? '' : s).replace(/\r/g, '').trim();
  const json = (t) => { try { const v = JSON.parse(t || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  S.syncKey = (c, h) => {
    const id = (childOf(c, h) || {}).id || '';
    if (h.kind === 'form') return 'form|' + h.form + '|' + id;
    if (h.type === 'monthly') return 'monthly|' + id + '|2026-10';
    return h.type + '|' + id + '|' + TODAY;
  };
  S.docLabel = (c, h) => { const t = S.type(h.type) || {}; const lc = childOf(c, h); return t.title + ' · ' + (lc ? lc.ini : '') + (h.kind === 'form' ? '' : h.type === 'monthly' ? ' · October 2026' : ' · 10/29/2026'); };
  const procOf = (c, h) => {
    if (!h) return false;
    if (h.kind === 'form') { const lc = childOf(c, h); return !!(PSY.lf && lc && PSY.lf.st(h.form, lc).processed); }
    return !!(h.processed && h.processed(c.params));
  };
  S.processed = procOf;

  /* ---------- the buttons at the top ---------- */
  const btn = (act, cls, icon, title, sub) => '<button class="xq-b ' + cls + '" data-act="' + act + '" data-xq="' + act + '"><span class="ic">' + icon + '</span><span class="tx"><b>' + title + '</b>' + (sub ? '<small data-xq="' + act + '-sub">' + sub + '</small>' : '') + '</span></button>';
  S.elapsed = (r) => { r = r || S.run; if (!r) return 0; return Math.floor((r.acc + (r.paused ? 0 : Date.now() - r.t0)) / 1000); };
  S.quickInner = () => {
    const c = S.ctx(); const st = S.get(c); const run = S.run && S.run.key === S.key(c);
    let tr = null; try { tr = T() && T().running ? T().running() : null; } catch (e) { tr = null; }
    const out = [];
    /* round 13: Overview (the patient roster) comes first, for every role */
    if (PSY.ext && PSY.ext.ovBtn) { try { out.push(PSY.ext.ovBtn()); } catch (e) { console.error('ovBtn', e); } }
    if (S.types().length) {
      if (run) out.push(btn('xq-scribe', 'scribe rec' + (S.run.paused ? ' paused' : ''), S.run.paused ? ICON.pause : ICON.mic, S.run.paused ? 'Paused' : 'Recording', '<span data-xq="ssub">' + mmss(S.elapsed()) + '</span>'));
      else out.push(btn('xq-scribe', 'scribe' + (st.stage === 'draft' ? ' done' : ''), ICON.mic, 'Scribe', ''));
    }
    /* round 10: Track Time is no longer a big button; it is the small timer in the panel footer (PSY.ext.footTime, owner TIME) */
    /* the third button, for licensed clinical staff (PSY.enhance is owner B9's module) */
    if (PSY.can('enhance')) out.push(btn('xq-enhance', 'enhance' + (PSY.enhance && PSY.enhance.isOpen && PSY.enhance.isOpen() ? ' on' : ''), ICON.spark, 'Scan & Enhance', ''));
    return out.join('');
  };
  S.quickHtml = () => { const inner = S.quickInner(); const n = (inner.match(/class="xq-b /g) || []).length; return '<div class="xq n' + n + '" data-psy="xq"' + (n ? '' : ' hidden') + '>' + inner + '</div>'; };
  S.boxHtml = () => ''; // the Round-7 Scribe box in the Notes list is gone

  /* ---------- pieces ---------- */
  const lineHtml = (l) => '<div class="xs-l"><div class="xs-h"><b class="' + (/guardian|grandmother|mother|parent|family/i.test(l.who) ? 'g' : /you|staff/i.test(l.who) ? 'y' : 'c') + '">' + esc(S.pw(l.who)) + '</b><span>' + esc(l.t) + '</span></div><p>' + esc(l.text) + '</p></div>';
  const closeBtn = '<button class="sc8-x" data-act="sc8-close" title="Close" aria-label="Close Scribe">×</button>';
  const who = (c, h) => { const x = childOf(c, h); return x ? ' · ' + esc(x.ini) : ''; };
  const head = (c, h, title) => '<div class="sc8-h"><b>' + esc(title || (S.type(h.type) || {}).title || 'Scribe') + who(c, h) + '</b>' + closeBtn + '</div>';
  const simChip = () => (PSY.ev && PSY.ev.label ? PSY.ev.label('illustrative', 'Simulated transcription') : '<span class="chip n">Simulated transcription</span>');

  /* 1 · the chooser */
  const selOf = (c) => {
    const key = S.key(c); const types = S.types(); const ids = caseIds();
    if (!S.ui.sel || S.ui.sel.key !== key || !types.some((t) => t.k === S.ui.sel.t)) {
      const pt = S.typeOf(c.route); const t = pt && types.some((x) => x.k === pt.k) ? pt.k : (types[0] || {}).k;
      const dc = (S.type(t) || {}).dc;
      const cid = c.consumer && ids.indexOf(c.consumer.id) >= 0 ? c.consumer.id : ids.indexOf(dc) >= 0 ? dc : ids[0] || '';
      S.ui.sel = { key, t, c: cid };
    }
    return S.ui.sel;
  };
  /* this page already has a Scribe draft of the chosen type for the chosen consumer (closed with ×): open it again instead of recording */
  const prevOn = (c, sel) => { const st = S.get(c); return !!((st.stage === 'draft' || st.stage === 'review') && st.closed && sel && st.type === sel.t && c.consumer && c.consumer.id === sel.c && !c.params.past); };
  function chooserHtml(c) {
    const types = S.types(); const L = PSY.data.lauris;
    if (!types.length) return '<div class="sc8" data-psy="scribe-choose"><div class="sc8-h"><b>Scribe</b>' + closeBtn + '</div><div class="xcard">No document types for this role</div></div>';
    const sel = selOf(c); const ids = caseIds();
    const cons = L.consumers.filter((x) => ids.indexOf(x.id) >= 0);
    return '<div class="sc8" data-psy="scribe-choose"><div class="sc8-h"><b>Scribe</b>' + closeBtn + '</div>' +
      '<div><label class="cap" for="sc9-type">Document type</label><select id="sc9-type" class="sc8-sel" data-psy="sc9-type" data-change="sc8-type">' +
        types.map((t) => '<option value="' + t.k + '"' + (t.k === sel.t ? ' selected' : '') + '>' + esc(t.label) + '</option>').join('') + '</select></div>' +
      '<div><label class="cap" for="sc9-c">Patient</label><select id="sc9-c" class="sc8-sel" data-psy="sc8-c" data-change="sc8-c">' +
        cons.map((x) => '<option value="' + x.id + '"' + (x.id === sel.c ? ' selected' : '') + '>' + esc(x.ini) + ' · #' + x.id + ' · ' + esc(x.group.replace('TDT – ', '')) + '</option>').join('') + '</select></div>' +
      (prevOn(c, sel)
        ? '<div class="sc8-act"><button class="btn p sc8-go" data-act="sc8-reopen" data-psy="sc8-reopen">Open draft</button><button class="btn o" data-act="sc8-start" data-psy="sc8-start">' + ICON.mic + 'Record again</button></div>'
        : '<button class="btn p sc8-go" data-act="sc8-start" data-psy="sc8-start">' + ICON.mic + 'Start recording</button>') + '</div>';
  }

  /* 2 · recording (Pause / Resume / Stop) */
  function liveHtml(c) {
    const r = S.run && S.run.key === S.key(c) ? S.run : null; const h = r ? r.h : S.handlerFor(c); const t = S.type(h && h.type) || {};
    const paused = !!(r && r.paused); const stopping = !!(r && r.flush);
    return '<div class="sc8 live sc8-live' + (paused ? ' paused' : '') + '" data-psy="scribe-live" data-paused="' + (paused ? 1 : 0) + '">' +
      '<div class="xs-top"><span class="xs-dot"></span><b data-psy="sc9-live-h">' + (paused ? 'Paused' : 'Recording') + ' · ' + esc(t.title || 'Scribe') + who(c, h) + '</b><span class="xs-t" data-xq="stime">' + mmss(r ? S.elapsed(r) : 0) + '</span></div>' +
      '<div class="sc9-meta">' + simChip() + '</div>' +
      '<div class="xs-tx" data-psy="xs-tx" data-scroll="xs-tx">' + (r ? r.lines.slice(0, r.i).map(lineHtml).join('') : '') + '</div>' +
      '<div class="sc8-act sc9-rec">' +
        (paused ? '<button class="btn o" data-act="sc9-resume" data-psy="sc9-resume"' + (stopping ? ' disabled' : '') + '>' + ICON.play + 'Resume</button>'
          : '<button class="btn o" data-act="sc9-pause" data-psy="sc9-pause"' + (stopping || !r ? ' disabled' : '') + '>' + ICON.pause + 'Pause</button>') +
        '<button class="btn p sc8-stop" data-act="sc8-stop" data-psy="sc8-stop"' + (stopping ? ' disabled' : '') + '>' + ICON.stop + (stopping ? 'Stopping…' : 'Stop') + '</button></div></div>';
  }

  /* 3 · review the transcript, then Generate draft */
  const linesOf = (c, h) => { try { return h.lines(c.params, c) || []; } catch (e) { return []; } };
  function reviewHtml(c, h, st) {
    const lines = linesOf(c, h);
    return '<div class="sc8 sc9-review" data-psy="scribe-review">' + head(c, h, 'Review transcript') +
      '<div class="sc9-meta"><span class="sc9-dt">' + esc((S.type(h.type) || {}).title) + ' · ' + lines.length + ' lines · ' + mmss(st.secs || 0) + '</span>' + simChip() + '</div>' +
      '<div class="xs-tx sc8-txs" data-psy="sc9-transcript" data-scroll="xs-tx3">' + lines.map(lineHtml).join('') + '</div>' +
      '<div class="sc8-foot"><div class="sc8-act"><button class="btn p" data-act="sc9-generate" data-psy="sc9-generate">' + ICON.spark + 'Generate draft</button><button class="btn o" data-act="sc9-again" data-psy="sc9-again">Record again</button></div></div></div>';
  }
  const genHtml = (c, h) => '<div class="sc8" data-psy="scribe-gen">' + head(c, h) + '<div class="sc9-gen"><i class="sy-spin" aria-hidden="true"></i>Generating draft…</div></div>';

  /* 4 · the draft */
  const txHtml = (c, h, key) => (S.showTx[key] ? '<div class="xs-tx sc8-txs" data-scroll="xs-tx2" data-psy="sc8-txs">' + linesOf(c, h).map(lineHtml).join('') + '</div>' : '');
  const ta = (attrs, v, ro) => '<textarea ' + attrs + ' spellcheck="false"' + (ro ? ' readonly tabindex="-1"' : '') + '>' + esc(v) + '</textarea>';
  /* DPN: one row per field; the tag says where the value came from, or "Not stated" */
  const fieldTag = (c, h, st, k, v) => {
    if (!norm(v)) return '<span class="sc9-ns" data-psy="not-stated">Not stated</span>';
    const ai = st.ai || {}; const src = st.src || {}; const at = st.srcVal || ai;
    if (src[k] && norm(at[k]) === norm(v)) {
      const lc = childOf(c, h);
      return /^ISP/.test(src[k]) && lc && lc.case && PSY.ev && PSY.ev.cite ? PSY.ev.cite(src[k], lc.case) : '<span class="sc9-src">' + esc(src[k]) + '</span>';
    }
    return norm(ai[k]) === norm(v) ? '' : '<span class="sc9-src e">Edited</span>';
  };
  const mins = (s) => { const t = String(s || ''); const h = /(\d+)\s*h/.exec(t); const m = /(\d+)\s*min/.exec(t); return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0); };
  const trackHtml = (c, h, v) => {
    let t = null; try { t = h.track ? h.track(c.params) : null; } catch (e) { t = null; }
    if (!t || !t.linkable) return '';
    if (t.unlinkedN) return '<button class="sc9-lk" data-act="sc9-link" data-psy="sc9-link">Link Track Time · ' + t.unlinkedN + (t.unlinkedN === 1 ? ' entry' : ' entries') + '</button>';
    if (t.linkedN && mins(v) !== t.linkedMin) return '<button class="sc9-lk" data-act="sc9-link" data-psy="sc9-link">Use Track Time · ' + esc(t.fmt(t.linkedMin)) + '</button>';
    return '';
  };
  function fieldsBody(c, h, st, d, ro) {
    const vals = h.parse(d.text); const goals = h.goals ? h.goals(c.params) : [];
    return '<div class="sc9-fs" data-psy="sc9-fields">' + h.FIELDS.map(([k, label, kind]) => {
      const v = vals[k] || ''; const id = 'sc9f-' + k;
      let ctl;
      if (!ro && kind === 'goal') ctl = '<div class="sc9-goals" role="radiogroup" aria-labelledby="' + id + '-l" data-psy="fv-' + k + '">' + goals.concat(v && goals.indexOf(v) < 0 ? [v] : []).concat(['']).map((g, i) => '<label class="sc9-go' + (g === v ? ' on' : '') + '"><input type="radio" name="sc9-goal" value="' + esc(g) + '" data-k="' + k + '" data-change="sc9-fedit"' + (g === v ? ' checked' : '') + '><span>' + (g ? esc(g) : 'None') + '</span></label>').join('') + '</div>';
      else if (!ro && kind === 'line') ctl = '<input type="text" id="' + id + '" data-k="' + k + '" data-input="sc9-fedit" data-psy="fv-' + k + '" value="' + esc(v) + '" spellcheck="false">';
      else ctl = ta('id="' + id + '" data-k="' + k + '" data-input="sc9-fedit" data-psy="fv-' + k + '" rows="' + (kind === 'line' ? 1 : 2) + '"', v, ro);
      return '<div class="sc9-f' + (norm(v) ? '' : ' ns') + '" data-fk="' + k + '"><div class="sc9-fl"><label for="' + id + '" id="' + id + '-l">' + esc(S.pw(label)) + '</label><span class="sc9-tag" data-tag="' + k + '">' + fieldTag(c, h, st, k, v) + '</span></div>' + ctl +
        (k === 'duration' ? '<span class="sc9-trk" data-psy="sc9-track">' + trackHtml(c, h, v) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  const noteBody = (c, h, d, ro) => ta('class="sc8-ta" data-psy="sc8-note" data-input="sc9-nedit" aria-label="Note"', d.text || '', ro);
  /* a form: the captured values by section (clinical decisions are never captured: they stay "Left for you" in Lauris) */
  const short = (l) => { let s = String(l || '').replace(/[:?]\s*$/, '').replace(/\s*\(.*$/, ''); if (s.length > 64) s = s.replace(/,.*$/, ''); return s; };
  function formBody(c, h, vals, ro) {
    const K = PSY.lf; const F = K.forms[h.form]; const groups = []; let g = null;
    const dis = ro ? ' disabled' : '';
    const ctl = (k, label, kind, opts) => {
      const v = vals[k] == null ? '' : String(vals[k]); const id = 'sc8f-' + k.replace(/\W/g, '-');
      let x;
      if (kind === 'select') x = '<select id="' + id + '" data-k="' + k + '" data-change="sc8-fedit"' + dis + '><option value=""></option>' + opts.map((o) => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + (v && opts.indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>';
      else if (kind === 'area' || v.length > 44) x = '<textarea id="' + id + '" data-k="' + k + '" data-input="sc8-fedit" rows="' + Math.min(9, Math.max(2, Math.ceil(v.length / 44))) + '" spellcheck="false"' + (ro ? ' readonly tabindex="-1"' : '') + '>' + esc(v) + '</textarea>';
      else x = '<input type="text" id="' + id + '" data-k="' + k + '" data-input="sc8-fedit" value="' + esc(v) + '" spellcheck="false"' + (ro ? ' readonly tabindex="-1"' : '') + '>';
      return '<div class="sc8-f"><label for="' + id + '">' + esc(S.pw(label)) + '</label>' + x + '</div>';
    };
    F.items.forEach((it) => {
      if (it.h) { g = { h: it.h, items: [] }; groups.push(g); return; }
      if (!g) { g = { h: F.title, items: [] }; groups.push(g); }
      if (it.human) return;
      if (it.t === 'checks') {
        if (!it.opts.some((o, i) => (it.k + '.' + i) in vals)) return;
        g.items.push('<div class="sc8-f"><span class="sc8-fl">' + esc(S.pw(short(it.l))) + '</span><div class="sc8-ckl">' + it.opts.map((o, i) => { const k = it.k + '.' + i; return '<label><input type="checkbox" data-k="' + k + '" data-change="sc8-fedit"' + (vals[k] === '1' ? ' checked' : '') + dis + '> ' + esc(S.pw(o)) + '</label>'; }).join('') + '</div></div>');
        return;
      }
      if (it.t === 'table') {
        const cells = [];
        it.rows.forEach((r, ri) => it.cols.slice(1).forEach((cn, ci) => { const k = it.k + '.' + ri + '.' + (ci + 1); if (k in vals && norm(vals[k])) cells.push(ctl(k, (r.length > 2 ? r + ' · ' : '#' + r + ' · ') + cn, 'text')); }));
        if (cells.length) g.items.push('<div class="sc8-sub">' + esc(S.pw(short(it.l))) + '</div>' + cells.join(''));
        return;
      }
      if (!it.k || it.t === 'sig' || it.t === 'note' || it.t === 'dx' || !(it.k in vals) || !norm(vals[it.k])) return;
      g.items.push(ctl(it.k, short(it.l), it.t === 'select' ? 'select' : it.t === 'area' ? 'area' : 'text', it.opts || []));
    });
    const used = groups.filter((x) => x.items.length); const many = used.length > 4;
    return used.map((x, i) => '<details class="sc8-sec"' + (!many || i === 0 ? ' open' : '') + '><summary><span>' + esc(S.pw(x.h)) + '</span><span class="n">' + x.items.length + '</span></summary><div class="sc8-fs">' + x.items.join('') + '</div></details>').join('');
  }
  const leftOf = (c, h, vals) => {
    const K = PSY.lf; const lc = childOf(c, h); const get = (k) => (k in vals ? vals[k] : K.val(h.form, lc, k));
    return (h.left ? h.left(lc, get) : []).map((x) => (typeof x === 'string' ? { label: x } : x));
  };
  const leftHtml = (c, h, vals) => {
    const left = leftOf(c, h, vals); if (!left.length) return '';
    return '<div class="xs-left sc8-left" data-psy="sc8-left"><b>Left for you</b> ' + left.map((x) => (x.k ? '<button class="sc8-lk" data-act="sc8-goto" data-k="' + esc(x.k) + '">' + esc(S.pw(x.label)) + '</button>' : '<span>' + esc(S.pw(x.label)) + '</span>')).join(' · ') + '</div>';
  };
  const procHtml = () => '<div class="sc9-proc" data-psy="sc8-processed"><span class="chip g">Processed in Lauris</span></div>';
  /* Save draft · Approve · Save & Push to Lauris (PSY.sync.actionsHtml), routed through this module so the push always uses the Scribe's writer */
  const actsHtml = (c, h, key, proc) => {
    if (proc && h.kind === 'form') return '';
    const copy = h.direct === false;
    let a = SY().actionsHtml(key, { pushLabel: proc ? 'Save & Push as addendum' : 'Save & Push to Lauris', copy });
    if (copy) a = a.replace(/<button[^>]*data-act="sync-(push|retry)"[^>]*>[^<]*<\/button>/g, '');
    return a.replace(/data-act="sync-(save|approve|push|retry|copy)"/g, 'data-act="sc9-$1"');
  };
  const footHtml = (c, h, key, proc) => '<div class="sc8-foot"><div class="sc9-st" data-psy="sc9-state">' + SY().stateHtml(key) + '</div><div data-psy="sc9-acts">' + actsHtml(c, h, key, proc) + '</div></div>';
  S.bind = (c, h, key) => { SY().writer(key, (text) => S.write(c, h, text)); SY().onChange(key, () => S.paintStatus()); };
  function draftHtml(c, h, st) {
    const key = S.syncKey(c, h); const d = SY().get(key); const proc = procOf(c, h);
    const ed = !!st.editing && !(proc && h.kind === 'form');
    S.bind(c, h, key);
    let body;
    if (h.kind === 'form') { const v = json(d.text); body = '<div class="sc9-meta"><span class="sc8-n">' + Object.keys(v).filter((k) => norm(v[k])).length + ' fields captured</span></div>' + formBody(c, h, v, !ed) + '<span data-psy="sc8-leftw">' + leftHtml(c, h, v) + '</span>'; }
    else if (h.kind === 'fields') body = fieldsBody(c, h, st, d, !ed);
    else body = noteBody(c, h, d, !ed);
    const tools = '<div class="sc9-tools">' + (proc && h.kind === 'form' ? '' : '<button class="btn o s" data-act="sc9-edit" data-psy="sc9-edit" aria-pressed="' + ed + '">' + (ed ? 'Done editing' : 'Edit draft') + '</button>') +
      '<button class="btn o s" data-act="xs-tx" data-psy="sc8-tx">' + (S.showTx[key] ? 'Hide transcript' : 'Review transcript') + '</button></div>';
    return '<div class="sc8 out sc9 ' + (ed ? 'ed' : 'ro') + '" data-psy="scribe-out" data-type="' + h.type + '" data-key="' + esc(key) + '" data-st="' + d.state + '" data-stage="' + d.stage + '" data-proc="' + (proc ? 1 : 0) + '">' + head(c, h) +
      '<div data-psy="sc9-flow">' + SY().flowHtml(key) + '</div>' + (proc ? procHtml() : '') + body + tools + txHtml(c, h, key) + footHtml(c, h, key, proc) + '</div>';
  }

  S.workHtml = () => {
    const c = S.ctx(); if (c.app && c.app !== 'lauris') return '';
    const key = S.key(c);
    if ((S.run && S.run.key === key) || (S.ui.starting === key && Date.now() - (S.ui.startAt || 0) < 4000)) return liveHtml(c);
    /* Scan & Enhance opened on this page after the Scribe: it gets the work area (the Scribe's draft comes back when it closes) */
    if (PSY.enhance && PSY.enhance.isOpen && PSY.enhance.isOpen()) { if (S.ui.choose === key) S.ui.choose = null; return ''; }
    if (S.ui.choose === key) return chooserHtml(c);
    const h = S.handlerFor(c); if (!h) return '';
    if (S.ui.gen === key) return genHtml(c, h);
    const st = S.get(c); if (st.closed) return '';
    if (st.stage === 'review') return reviewHtml(c, h, st);
    if (st.stage === 'draft' && SY() && SY().get(S.syncKey(c, h))) return draftHtml(c, h, st);
    return '';
  };
  if (PSY.ext && PSY.ext.work && PSY.ext.work.register) PSY.ext.work.register('scribe', { html: () => S.workHtml() });
  S.isOpen = () => !!S.workHtml();
  /* Reset Demo / presenter scenarios: the Scribe's in-memory UI (chooser, live recording) resets with the demo state */
  const baseReset = PSY.reset;
  if (baseReset && !baseReset.__scribe) {
    PSY.reset = function () { if (S.run && S.run.timer) clearTimeout(S.run.timer); S.run = null; S.showTx = {}; S.ui = { choose: null, sel: null, starting: null, gen: null }; return baseReset.apply(this, arguments); };
    PSY.reset.__scribe = true;
  }
  /* close the chooser or the draft on this page (Scan & Enhance calls it before it opens its own work) */
  S.close = () => {
    const c = S.ctx(); const key = S.key(c);
    if (S.ui.choose === key) S.ui.choose = null;
    const st = S.get(c); if ((st.stage === 'draft' || st.stage === 'review') && !st.closed) { st.closed = true; PSY.save(); }
  };

  /* repaint the buttons and the work area in the visible Lauris page */
  S.paint = () => {
    const root = PSY.activeRoot(); if (!root) return;
    const q = root.querySelector('[data-psy="xq"]'); if (q) { q.innerHTML = S.quickInner(); const n = q.querySelectorAll('.xq-b').length; q.className = 'xq n' + n; q.hidden = !n; }
    if (PSY.ext.work && PSY.ext.work.paint) PSY.ext.work.paint();
    const tx = root.querySelector('[data-psy="xs-tx"]'); if (tx) tx.scrollTop = tx.scrollHeight;
    const live = root.querySelector('[data-psy="live"]');
    if (live) { const r = S.run; live.textContent = r ? (r.paused ? 'Paused' : 'Recording') : (PSY.state.ext.paused ? 'Paused' : 'Ready'); live.classList.toggle('off', !(r && !r.paused)); }
  };
  /* Lauris was changed by hand after a sync: the approved version is Ready to Sync again (pushing puts it back) */
  S.checkLauris = (c, h, d) => {
    if (!d || d.synced == null || procOf(c, h)) return;
    if (d.state !== 'synced' && !(d.state === 'ready' && d.reason === 'Changed in Lauris')) return;
    let diff = false;
    try {
      if (h.kind === 'form') { const v = json(d.synced); const lc = childOf(c, h); diff = Object.keys(v).some((k) => norm(PSY.lf.val(h.form, lc, k)) !== norm(v[k])); }
      else if (h.differs) diff = !!h.differs(PSY.activeRoot(), c.params, d.synced);
    } catch (e) { diff = false; }
    if (diff && d.state === 'synced') { d.state = 'ready'; d.reason = 'Changed in Lauris'; PSY.save(); }
    else if (!diff && d.state === 'ready') { d.state = 'synced'; d.reason = ''; PSY.save(); }
  };
  /* while the clinician types (here or in Lauris): the version flow, the sync state, the buttons, the field tags; never the editors */
  S.paintStatus = () => {
    const root = PSY.activeRoot(); if (!root) return; const out = root.querySelector('[data-psy="scribe-out"]'); if (!out) return;
    const c = S.ctx(); const h = S.handlerFor(c); if (!h || !SY()) return; const key = S.syncKey(c, h);
    if (out.getAttribute('data-key') !== key) return;
    const d = SY().get(key); if (!d) return; const st = S.get(c); const proc = procOf(c, h);
    if (proc !== (out.getAttribute('data-proc') === '1')) { S.paint(); return; } // processed in Lauris: the draft becomes addendum-only
    S.checkLauris(c, h, d);
    out.setAttribute('data-st', d.state); out.setAttribute('data-stage', d.stage);
    const q = (s) => out.querySelector('[data-psy="' + s + '"]');
    /* replace only what changed (compared with the last html written: a button replaced between mousedown and click loses the click) */
    const put = (el, html) => { if (el && el.__sc9 !== html) { el.innerHTML = html; el.__sc9 = html; } };
    put(q('sc9-flow'), SY().flowHtml(key)); put(q('sc9-state'), SY().stateHtml(key)); put(q('sc9-acts'), actsHtml(c, h, key, proc));
    if (h.kind === 'fields') {
      const vals = h.parse(d.text);
      h.FIELDS.forEach(([k]) => { const row = out.querySelector('[data-fk="' + k + '"]'); if (!row) return; row.classList.toggle('ns', !norm(vals[k])); put(row.querySelector('[data-tag="' + k + '"]'), fieldTag(c, h, st, k, vals[k] || '')); });
      put(q('sc9-track'), trackHtml(c, h, vals.duration));
    }
    if (h.kind === 'form') put(q('sc8-leftw'), leftHtml(c, h, json(d.text)));
  };
  S.tick = () => {
    if (S.ticking) return; S.ticking = setInterval(() => {
      const root = PSY.activeRoot(); let tr = null; try { tr = T() && T().running ? T().running() : null; } catch (e) {}
      if (!S.run && !tr) { clearInterval(S.ticking); S.ticking = null; return; }
      if (!root) return;
      if (S.run && S.run.key === S.key(S.ctx())) { const t = mmss(S.elapsed()); const a = root.querySelector('[data-xq="ssub"]'); if (a) a.textContent = t; const b = root.querySelector('[data-xq="stime"]'); if (b) b.textContent = t; }
      const m = root.querySelector('[data-xq="tmin"]'); if (m && tr) { try { m.textContent = T().elapsedMin(); } catch (e) {} }
    }, 1000);
  };

  /* ---------- record: start, pause, resume, stop ---------- */
  S.open = () => {
    const c = S.ctx(); S.ui.choose = S.key(c); S.ui.sel = null;
    if (PSY.enhance && PSY.enhance.close) { try { PSY.enhance.close(); } catch (e) {} }
    S.paint();
  };
  S.begin = () => {
    const c = S.ctx(); const h = S.handlerFor(c); const key = S.key(c);
    S.ui.starting = null;
    const lc = h ? childOf(c, h) : null;
    if (!h || !PSY.can('scribe:' + h.type) || !lc || !S.mine(lc.id)) { S.open(); return; }
    if (S.run && S.run.timer) clearTimeout(S.run.timer);
    S.ui.choose = null; S.ui.gen = null; S.showTx[key] = false;
    const st = S.st(c); st.type = h.type; st.stage = 'rec'; st.closed = false; st.editing = false;
    S.run = { key, h, c, i: 0, lines: linesOf(c, h), t0: Date.now(), acc: 0, paused: false, timer: null, flush: false };
    if (PSY.ext.mode() === 'collapsed') PSY.ext.set(true);
    S.paint(); S.tick(); S.step();
  };
  S.step = () => {
    const r = S.run; if (!r || r.paused) return;
    if (r.i < r.lines.length) {
      const l = r.lines[r.i]; r.i++;
      const root = PSY.activeRoot(); const tx = root && S.key(S.ctx()) === r.key && root.querySelector('[data-psy="xs-tx"]');
      if (tx) { tx.insertAdjacentHTML('beforeend', lineHtml(l)); tx.scrollTop = tx.scrollHeight; }
      r.timer = setTimeout(S.step, r.flush ? 40 : 650);
    } else if (r.flush) r.timer = setTimeout(S.finish, 80);
    /* otherwise: the conversation is over and the recording waits for Stop */
  };
  S.pause = () => { const r = S.run; if (!r || r.paused || r.flush) return; clearTimeout(r.timer); r.acc += Date.now() - r.t0; r.paused = true; S.paint(); };
  S.resume = () => { const r = S.run; if (!r || !r.paused) return; r.paused = false; r.t0 = Date.now(); S.paint(); S.tick(); S.step(); };
  S.stop = () => { const r = S.run; if (!r || r.flush) return; if (r.paused) { r.paused = false; r.t0 = Date.now(); } r.flush = true; clearTimeout(r.timer); S.paint(); S.step(); };
  S.finish = () => {
    const r = S.run; if (!r) return;
    clearTimeout(r.timer); const secs = S.elapsed(r); S.run = null;
    const m = (PSY.state.scribe = PSY.state.scribe || {}); const st = (m[r.key] = m[r.key] || {});
    Object.assign(st, { type: r.h.type, stage: 'review', secs, n: r.lines.length, closed: false, editing: false });
    PSY.save(); S.paint();
    PSY.ui.toast('Recording stopped.');
  };
  /* ?scribe=1 (Add Session, "Open with Scribe", the chooser) starts recording when the page opens */
  S.autostart = () => { const c = S.ctx(); if (S.run && S.run.key === S.key(c)) return; S.begin(); };

  /* ---------- Generate draft ---------- */
  S.lauris = (c, h) => {
    try {
      if (h.kind === 'form') return '';
      return h.current ? h.current(PSY.activeRoot(), c.params) || '' : '';
    } catch (e) { return ''; }
  };
  S.makeDraft = (c, h) => {
    const st = S.st(c); const key = S.syncKey(c, h);
    let text = '';
    try {
      if (h.kind === 'form') { const v = h.extract(c.params, c) || {}; const vals = {}; Object.keys(v).forEach((k) => { const x = v[k] == null ? '' : String(v[k]); if (norm(x)) vals[k] = x; }); text = JSON.stringify(vals); }
      else if (h.kind === 'fields') { const r = h.fields(c.params, c) || {}; st.ai = Object.assign({}, r.values || {}); st.src = Object.assign({}, r.src || {}); st.srcVal = Object.assign({}, st.ai); text = h.compose(st.ai); }
      else text = h.note(c.params, c) || '';
    } catch (e) { console.error('scribe draft', e); }
    if (SY().get(key)) SY().setAi(key, text); else SY().init(key, { original: S.lauris(c, h), ai: text, label: S.docLabel(c, h) });
    Object.assign(st, { type: h.type, stage: 'draft', editing: false, closed: false }); PSY.save();
    return SY().get(key);
  };
  S.generate = () => {
    const c = S.ctx(); const h = S.handlerFor(c); const st = S.get(c); const key = S.key(c);
    if (!h || (st.stage !== 'review' && st.stage !== 'draft')) return;
    S.ui.gen = key; S.paint();
    setTimeout(() => {
      if (S.ui.gen !== key) return;
      S.ui.gen = null; const d = S.makeDraft(c, h);
      if (S.key(S.ctx()) === key) S.paint();
      PSY.ui.toast(h.kind === 'form' ? Object.keys(json(d && d.text)).length + ' fields captured.' : 'Draft ready.');
    }, 700);
  };

  /* ---------- writing into Lauris (the writer PSY.sync.push calls with the approved version) ---------- */
  const auditBy = () => { const r = PSY.role(); return PSY.lauris.user.short + (r === 'lcs' ? ', LPC' : r === 'dss' ? ', DSS' : ''); };
  S.by = auditBy;
  S.audit = (caseId, action, doc) => {
    if (PSY.audit && PSY.audit.add) PSY.audit.add({ case: caseId || '', action, by: auditBy(), doc: doc || '', status: PSY.auth && caseId && PSY.caseById(caseId) ? PSY.auth.status(caseId) : '' });
    else PSY.log(caseId, action, auditBy());
  };
  /* Lauris "Saved Session": sessions saved from Psyflo today (shown by src/screens/62-lauris-admin-pages.js) */
  S.saved = () => (PSY.state.saved8 = PSY.state.saved8 || []);
  S.addSaved = (row) => {
    const r = Object.assign({ date: '10/29/2026', at: '10/29/2026 ' + PSY.now(), by: PSY.lauris.user.short }, row);
    const list = S.saved(); const i = list.findIndex((x) => x.c === r.c && x.type === r.type && x.date === r.date);
    if (i >= 0) list[i] = r; else list.unshift(r); PSY.save();
  };
  S.record = (c, h, how) => {
    const t = S.type(h.type) || {}; const lc = childOf(c, h);
    if (how !== 'addendum') S.addSaved({ c: lc.id, ini: lc.ini, type: h.type, label: t.lauris, go: c.route + '?c=' + lc.id, form: h.form || null });
    /* the Lauris menu badge follows (Saved Session) */
    const root = PSY.activeRoot(); const a = root && root.querySelector('.lz-nav [data-go="lauris-saved"]');
    if (a) { const n = PSY.lauris.counts().saved; let b = a.querySelector('.b'); if (!b && n) { b = document.createElement('span'); b.className = 'b'; a.appendChild(b); } if (b) b.textContent = n; }
    S.audit(lc.case, t.lauris + (how === 'addendum' ? ' addendum synced to Lauris from Psyflo' : ' synced to Lauris from Psyflo'), t.lauris + ' · ' + lc.ini + ' · 10/29/2026');
  };
  async function formWrite(c, h, text) {
    const K = PSY.lf; const lc = childOf(c, h); const fst = K.st(h.form, lc);
    if (fst.processed) return { ok: false, reason: 'Processed in Lauris' };
    const vals = json(text); const ch = {};
    Object.keys(vals).forEach((k) => { if (norm(K.val(h.form, lc, k)) !== norm(vals[k])) ch[k] = vals[k]; });
    const root = PSY.activeRoot(); const form = root && PSY.current().id === c.route && root.querySelector('[data-lf="' + h.form + '"]');
    if (form && (form.dataset.cid || lc.id) === lc.id) await K.fill(root, h.form, lc, ch, { fast: true, clear: true });
    else { Object.keys(ch).forEach((k) => { fst.v[k] = String(ch[k]); fst.s[k] = 'a'; }); PSY.save(); }
    return true;
  }
  S.write = async (c, h, text) => {
    let r;
    try { r = h.kind === 'form' ? await formWrite(c, h, text) : await h.write(text, c.params, PSY.activeRoot()); }
    catch (e) { console.error('scribe write', e); r = { ok: false, reason: 'Lauris did not accept the change' }; }
    if (r === false || (r && r.ok === false)) return r || false;
    S.record(c, h, r && r.mode === 'addendum' ? 'addendum' : '');
    return true;
  };
  S.push = (key) => {
    const c = S.ctx(); const h = S.handlerFor(c); if (!h || S.syncKey(c, h) !== key) return Promise.resolve(false);
    const p = SY().push(key, (t) => S.write(c, h, t)); S.paintStatus();
    return p.then((ok) => { S.paintStatus(); PSY.ui.toast(ok ? (procOf(c, h) ? 'Addendum synced to Lauris.' : 'Synced to Lauris.') : 'Sync failed.'); return ok; });
  };
  /* someone else (Scan & Enhance through PSY.dpn.push) wrote this page's note into Lauris: the Scribe's version follows, so both show the same one */
  S.external = (c, text, by) => {
    const h = S.handlerFor(c); if (!h || !SY()) return; const key = S.syncKey(c, h); const d = SY().get(key); if (!d) return;
    const at = PSY.now(); Object.assign(d, { text, approved: text, synced: text, stage: 'synced', state: 'synced', reason: '', at });
    d.history.push({ stage: 'synced', at, by: by || 'Scan & Enhance' }); PSY.save();
    if (S.key(S.ctx()) === S.key(c)) S.paint();
  };
  S.synced = S.external;

  /* ---------- copy (Lauris reports, and Save & Copy where a type has no direct population) ---------- */
  PSY.copy = (text, msg) => new Promise((res) => {
    const done = (ok) => { if (ok) PSY.ui.toast(msg || 'Copied.'); else S.copyModal(text); res(ok); };
    try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch (e) { done(false); }
  });
  S.copyModal = (text) => PSY.ui.modal({
    title: 'Copy this text',
    body: '<textarea id="copybox" readonly style="min-height:240px"></textarea>',
    actions: [{ label: 'Close' }],
    onOpen: (m) => { const t = m.querySelector('#copybox'); t.value = text; t.focus(); t.select(); },
  });

  /* ---------- acts ---------- */
  PSY.acts['xq-scribe'] = () => {
    const c = S.ctx();
    if (S.run && S.run.key === S.key(c)) { if (PSY.enhance && PSY.enhance.close) { try { PSY.enhance.close(); } catch (e) {} } S.paint(); return; } // recording: bring the controls back
    S.open();
  };
  /* Track Time is owner T9's (src/time.js, 63-ext-time.js): open its view, or start / stop the timer */
  PSY.acts['xq-time'] = () => { const t = T(); if (!t) return; if (typeof t.open === 'function') t.open(); else if (typeof t.toggle === 'function') t.toggle(); };
  PSY.acts['xq-enhance'] = () => { if (PSY.enhance && PSY.enhance.begin) PSY.enhance.begin(); else PSY.ui.toast('Open a note or form.'); };
  PSY.acts['sc8-close'] = () => { S.close(); S.paint(); };
  PSY.acts['sc8-reopen'] = () => { const c = S.ctx(); const st = S.get(c); if (st.stage) { st.closed = false; st.editing = false; PSY.save(); } S.ui.choose = null; S.paint(); };
  PSY.acts['sc8-stop'] = () => { const c = S.ctx(); if (S.run && S.run.key === S.key(c)) S.stop(); };
  PSY.acts['sc9-pause'] = () => { const c = S.ctx(); if (S.run && S.run.key === S.key(c)) S.pause(); };
  PSY.acts['sc9-resume'] = () => { const c = S.ctx(); if (S.run && S.run.key === S.key(c)) S.resume(); };
  PSY.acts['sc9-generate'] = () => S.generate();
  PSY.acts['sc9-again'] = () => S.begin();
  PSY.acts['sc9-edit'] = () => { const c = S.ctx(); const st = S.get(c); if (st.stage !== 'draft') return; st.editing = !st.editing; PSY.save(); S.paint(); if (st.editing) { const f = PSY.activeRoot().querySelector('[data-psy="scribe-out"] :is(textarea,input,select):not([readonly]):not([disabled])'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} } } };
  PSY.acts['sc8-type'] = (el) => {
    const c = S.ctx(); const sel = selOf(c); sel.t = el.value;
    const ids = caseIds(); const dc = (S.type(sel.t) || {}).dc;
    if (!c.consumer && ids.indexOf(dc) >= 0) sel.c = dc;
    S.paint();
  };
  PSY.acts['sc8-c'] = (el) => { selOf(S.ctx()).c = el.value; };
  PSY.acts['sc8-start'] = () => {
    const c = S.ctx(); const root = PSY.activeRoot(); const sel = selOf(c);
    const ts = root && root.querySelector('[data-psy="sc9-type"]'); if (ts && ts.value) sel.t = ts.value;
    const cs = root && root.querySelector('[data-psy="sc8-c"]'); if (cs && cs.value) sel.c = cs.value;
    const t = S.type(sel.t); if (!t || !PSY.can('scribe:' + t.k) || !S.mine(sel.c)) return;
    S.ui.choose = null;
    if (c.route === t.route && c.consumer && c.consumer.id === sel.c && !c.params.past) { S.begin(); return; }
    S.ui.starting = t.route + '|' + sel.c; S.ui.startAt = Date.now();
    PSY.go(t.route + '?c=' + sel.c + '&scribe=1');
  };
  const curDoc = () => { const c = S.ctx(); const h = S.handlerFor(c); if (!h || !SY()) return null; const key = S.syncKey(c, h); const d = SY().get(key); return d ? { c, h, key, d } : null; };
  /* DPN field */
  PSY.acts['sc9-fedit'] = (el) => {
    const x = curDoc(); if (!x || x.h.kind !== 'fields') return;
    const vals = x.h.parse(x.d.text); vals[el.getAttribute('data-k')] = el.value; SY().edit(x.key, x.h.compose(vals));
    if (el.type === 'radio') { const g = el.closest('.sc9-goals'); if (g) g.querySelectorAll('.sc9-go').forEach((l) => l.classList.toggle('on', l.contains(el))); }
    S.paintStatus();
  };
  /* note text */
  PSY.acts['sc9-nedit'] = (el) => { const x = curDoc(); if (!x || x.h.kind !== 'note') return; SY().edit(x.key, el.value); S.paintStatus(); };
  /* form value */
  PSY.acts['sc8-fedit'] = (el) => {
    const x = curDoc(); if (!x || x.h.kind !== 'form') return;
    const vals = json(x.d.text); vals[el.getAttribute('data-k')] = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value; SY().edit(x.key, JSON.stringify(vals)); S.paintStatus();
  };
  /* Duration from Track Time: link today's entries to this DPN (PSY.time.link, owner T9) */
  PSY.acts['sc9-link'] = () => {
    const x = curDoc(); if (!x || !x.h.track) return; const t = x.h.track(x.c.params); if (!t || !t.linkable) return;
    if (t.unlinkedN) t.link();
    const t2 = x.h.track(x.c.params); const st = S.get(x.c); const vals = x.h.parse(x.d.text);
    vals.duration = t2.fmt(t2.linkedMin);
    st.src = st.src || {}; st.srcVal = st.srcVal || {}; st.src.duration = 'Track Time · ' + t2.linkedN + (t2.linkedN === 1 ? ' entry' : ' entries'); st.srcVal.duration = vals.duration;
    SY().edit(x.key, x.h.compose(vals)); PSY.save(); S.paint();
    PSY.ui.toast('Track Time linked.');
  };
  const keyArg = (el) => el.getAttribute('data-key');
  PSY.acts['sc9-save'] = (el) => { SY().saveDraft(keyArg(el)); S.paintStatus(); PSY.ui.toast('Draft saved.'); };
  /* Approve: the approved version is shown read-only (Edit draft opens it again) */
  PSY.acts['sc9-approve'] = (el) => { SY().approve(keyArg(el)); const st = S.get(S.ctx()); if (st.editing) { st.editing = false; PSY.save(); S.paint(); } else S.paintStatus(); PSY.ui.toast('Approved.'); };
  PSY.acts['sc9-push'] = (el) => S.push(keyArg(el));
  PSY.acts['sc9-retry'] = (el) => { const k = keyArg(el); const d = SY().get(k); if (d) { d.state = 'ready'; d.reason = ''; } S.push(k); };
  PSY.acts['sc9-copy'] = (el) => { const k = keyArg(el); SY().saveDraft(k); S.paintStatus(); PSY.copy(SY().copyText(k), 'Copied · Lauris not updated.'); };
  /* "Left for you": show that box in the Lauris form */
  PSY.acts['sc8-goto'] = (el) => {
    const root = PSY.activeRoot(); const k = el.getAttribute('data-k'); const row = root && (root.querySelector('.lz-main [data-row="' + k + '"]') || root.querySelector('.lz-main [data-f="' + k + '"]')); if (!row) return;
    const sec = row.closest('.lf-sec'); if (sec && sec.hidden) sec.hidden = false;
    try { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    row.classList.add('sc8-hl'); setTimeout(() => row.classList.remove('sc8-hl'), 1800);
    const f = row.matches('input,select,textarea') ? row : row.querySelector('input:not([readonly]),select,textarea'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  };
  PSY.acts['xs-tx'] = () => { const c = S.ctx(); const h = S.handlerFor(c); const k = h ? S.syncKey(c, h) : S.key(c); S.showTx[k] = !S.showTx[k]; S.paint(); };
  try { if (T() && T().running && T().running()) S.tick(); } catch (e) {}

  /* ---------- scenario 1 (prompt §14): Kayla Hale (direct support staff) on M.R.'s DPN, the Scribe open with DPN and M.R. chosen ---------- */
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  PSY.presenter.prep.s1 = function () {
    PSY.state.role = 'dss';
    const m = PSY.state.scribe || {}; delete m['lauris-dpn|4471'];
    if (PSY.state.sync) delete PSY.state.sync['dpn|4471|' + TODAY];
    if (S.run) { clearTimeout(S.run.timer); S.run = null; }
    S.ui.choose = 'lauris-dpn|4471'; S.ui.sel = { key: 'lauris-dpn|4471', t: 'dpn', c: '4471' }; S.ui.gen = null;
    if (PSY.state.ext) { PSY.state.ext.open = true; PSY.state.ext.mode = 'sidebar'; PSY.state.ext.seen = true; }
    PSY.save();
  };
  PSY.presenter.prep.s1.meta = { role: 'dss', go: 'lauris-dpn?c=4471', open: true, label: 'Direct support staff creates a progress note', sub: 'DSS · Kayla Hale · M.R.' };

  /* ---------- styles (extension work area; appended to the Lauris style sheet) ---------- */
  PSY.css.lauris = (PSY.css.lauris || '') + `
.xq.n0{display:none}
/* round 13: one compact row (Overview · Scribe · Scan & Enhance); a count or the recording time sits under the label */
.xq,.xq.n3{gap:6px;padding:8px 12px}
.xq .xq-b,.xq.n3 .xq-b,.xq.n2 .xq-b{flex:1 1 auto;flex-direction:row;justify-content:flex-start;text-align:left;min-height:42px;padding:4px 9px 4px 6px;gap:7px;border-radius:11px;border-width:1.5px}
.xq.n1 .xq-b{justify-content:center}
.xq .xq-b .ic,.xq.n3 .xq-b .ic{flex:0 0 26px;width:26px;height:26px}
.xq .xq-b .ic svg{width:15px;height:15px}
.xq .xq-b b,.xq.n3 .xq-b b,.xq.n2 .xq-b b{font-size:13px;line-height:1.15;white-space:nowrap}
.xq .xq-b small,.xq.n3 .xq-b small{font-size:10.5px;line-height:1.15;margin-top:1px;white-space:nowrap;color:#525B66}
.xq-b.ov{border-color:#1D4F43}.xq-b.ov .ic{background:#1D4F43}.xq-b.ov:hover{background:#EEF5F1}
.xq-b.ov.on{background:#E3EFEA}
.xq-b.ov small{color:#8A2E1C;font-weight:700}
.xq-b.rec.paused{border-color:#8E99A6;background:#F6F4F0}.xq-b.rec.paused .ic{background:#6B665E;animation:none}
.xp-work .sc8{display:flex;flex-direction:column;gap:12px}
.sc8-h{display:flex;align-items:center;gap:8px;font-size:15px;line-height:1.25}
.sc8-h>b{flex:1;min-width:0;font-weight:700}
.sc8-x{flex:0 0 30px;width:30px;height:30px;border-radius:8px;border:1px solid #D9D4CC;background:#fff;font:inherit;font-size:18px;line-height:1;cursor:pointer;color:#3E4652;display:inline-flex;align-items:center;justify-content:center}
.sc8-x:hover{background:#F3F0EA}
.sc8 .cap{display:block;margin-bottom:6px}
.sc8-sel{width:100%;height:42px;border:1px solid #D9D4CC;border-radius:10px;background:#fff;font:inherit;font-size:14px;padding:0 10px;color:#151B24}
.xp .btn.sc8-go{width:100%;min-height:46px;font-size:14.5px}
.xp .btn svg{flex:0 0 auto}
.xp-work .xs.live,.xp-work .sc8.live{display:flex;flex-direction:column;gap:10px}
.xp-work .sc8.live .xs-tx{max-height:none;margin-top:0;min-height:120px}
.sc8.live.paused .xs-dot{background:#8E99A6;animation:none}
.sc9-rec{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sc9-rec .btn{min-height:44px;justify-content:center}
.sc9-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:#525B66}
.sc9-dt{font-weight:600;color:#3E4652}
.sc9-gen{display:flex;align-items:center;gap:10px;padding:18px 4px;font-size:14px;color:#3E4652}
.sc9-review .xs-tx{max-height:none;margin-top:0}
.sc8-act{display:flex;gap:8px;flex-wrap:wrap}
.sc8-act .btn.p{flex:1}
.sc8-foot{position:sticky;bottom:-12px;z-index:1;margin:0 -16px -12px;padding:10px 16px 12px;background:#fff;border-top:1px solid #EFEBE4;display:flex;flex-direction:column;gap:8px}
.sc9-st:empty{display:none}
.sc9-st{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.sc9 .sy-acts .btn{min-height:36px}
.sc9 .sy-flow{gap:3px;flex-wrap:nowrap;overflow:hidden}
.sc9 .sy-flow li{padding:3px 6px;font-size:11px;white-space:nowrap}
.sc9 .sy-acts .btn.p{flex:1 1 auto}
.sc9-proc{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:#525B66}
.sc9-tools{display:flex;gap:8px;flex-wrap:wrap}
.sc9-fs{display:flex;flex-direction:column;border:1px solid #E6E1D9;border-radius:10px;background:#fff;flex:0 0 auto}
.sc9-f{padding:9px 12px;border-top:1px solid #EFEBE4;display:flex;flex-direction:column;gap:4px}
.sc9-f:first-child{border-top:0}
.sc9-fl{display:flex;align-items:baseline;gap:8px;min-width:0}
.sc9-fl label{flex:1;min-width:0;font-size:11.5px;font-weight:700;color:#525B66;text-transform:uppercase;letter-spacing:.03em;margin:0}
.sc9-tag{flex:0 1 auto;min-width:0;text-align:right}
.sc9-tag:empty{display:none}
.sc9-src{font-size:11.5px;color:#6B665E}
.sc9-src.e{color:#1D4F43;font-weight:600}
.sc9-tag .cite5{font-size:11.5px}
.sc9-ns{display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#7A5200;background:#FCEFD0;border-radius:999px;padding:1px 8px;white-space:nowrap}
.sc9-f textarea,.sc9-f input[type=text],.sc9-f select{width:100%;box-sizing:border-box;border:1px solid #D9D4CC;border-radius:8px;padding:6px 9px;font:inherit;font-size:13.5px;line-height:1.45;background:#fff;color:#151B24;resize:vertical;field-sizing:content;min-height:34px}
.sc9-goals{display:flex;flex-direction:column;gap:2px}
.sc9-go{display:flex;align-items:flex-start;gap:8px;padding:5px 6px;border-radius:8px;font-size:13px;line-height:1.4;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:400;color:#151B24;margin:0}
.sc9-go:hover{background:#F8F6F2}.sc9-go.on{background:#F2F9F8}
.sc9-go input{accent-color:#217A78;margin:3px 0 0;flex:0 0 auto}
.sc9-f textarea:focus,.sc9-f input:focus,.sc9-f select:focus{outline:2px solid #217A78;outline-offset:-1px}
.sc9.ro .sc9-f textarea[readonly]{border-color:transparent;background:transparent;padding:0;resize:none;min-height:0;cursor:default}
.sc9.ro .sc9-f textarea[readonly]:focus{outline:none}
.sc9.ro .sc9-f.ns textarea[readonly]{display:none}
.sc9-trk:empty{display:none}
.sc9-lk{align-self:flex-start;background:none;border:0;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:#15605E;text-decoration:underline;cursor:pointer}
.sc8-ta{width:100%;box-sizing:border-box;border:1px solid #D9D4CC;border-radius:10px;padding:10px 12px;font:inherit;font-size:13.5px;line-height:1.55;resize:vertical;min-height:200px;field-sizing:content;background:#fff;color:#151B24;flex:0 0 auto}
.sc8-ta:focus{outline:2px solid #217A78;outline-offset:-1px}
.sc9.ro .sc8-ta[readonly]{background:#F8F6F2;border-color:#EFEBE4;resize:none}
.sc9.ro .sc8-ta[readonly]:focus{outline:none}
.sc8-n{font-size:12.5px;color:#525B66}
.sc8-sec{border:1px solid #E6E1D9;border-radius:10px;background:#fff;flex:0 0 auto}
.sc8-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:13px;font-weight:700}
.sc8-sec>summary::-webkit-details-marker{display:none}
.sc8-sec>summary:before{content:"▸";color:#8E99A6;font-size:11px}
.sc8-sec[open]>summary:before{content:"▾"}
.sc8-sec>summary .n{margin-left:auto;font-weight:600;color:#525B66;font-size:12px}
.sc8-sec[open]>summary{border-bottom:1px solid #EFEBE4}
.sc8-fs{padding:8px 12px 12px;display:flex;flex-direction:column;gap:9px}
.sc8-f label,.sc8-fl{display:block;font-size:11.5px;color:#525B66;font-weight:600;margin:0 0 3px;line-height:1.3;text-transform:none;letter-spacing:0}
.sc8-f input[type=text],.sc8-f textarea,.sc8-f select{width:100%;box-sizing:border-box;border:1px solid #D9D4CC;border-radius:8px;padding:6px 9px;font:inherit;font-size:13px;line-height:1.45;background:#fff;color:#151B24}
.sc8-f textarea{resize:vertical;display:block;field-sizing:content;min-height:52px}
.sc8-f input:focus,.sc8-f textarea:focus,.sc8-f select:focus{outline:2px solid #217A78;outline-offset:-1px}
.sc9.ro .sc8-f input[readonly],.sc9.ro .sc8-f textarea[readonly]{border-color:transparent;background:#F8F6F2;resize:none}
.sc9.ro .sc8-f select[disabled]{opacity:1;color:#151B24;background:#F8F6F2;border-color:transparent}
.sc8-ckl{display:flex;flex-wrap:wrap;gap:4px 14px}
.sc8-ckl label{display:inline-flex;gap:5px;align-items:center;font-weight:400;color:#151B24;font-size:12.5px;margin:0}
.sc8-ckl input{accent-color:#217A78;margin:0}
.sc8-sub{font-size:11.5px;font-weight:700;color:#1F3B6B;margin-top:2px}
.sc8-left{margin-top:0;line-height:1.6}
.sc8-lk{background:none;border:0;padding:0;font:inherit;color:#6F4A05;text-decoration:underline;cursor:pointer}
.sc8-txs{max-height:none}
.sc8-hl{outline:3px solid #E0A030!important;outline-offset:1px;box-shadow:0 0 0 6px rgba(224,160,48,.22);transition:outline-color .3s}
`;
})();
