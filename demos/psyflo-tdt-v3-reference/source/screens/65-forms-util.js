/* L1b: shared helpers for the four Lauris session forms (Admission Screening, CNA, ISP 2.0, Daily Progress Note)
   and for what the Psyflo extension does on them: transcribing a call, typing into the boxes, checking the draft.
   Everything the screens need twice lives here as PSY.l1b. Acts are prefixed l1b-. State lives in PSY.state.boxes
   under keys like 'l1b.screening.filled' (T.W.) or 'l1b.dpn.4471.processed'.
   Round 8: the Scribe (src/scribe.js) records in the extension's work area and saves into these boxes with U.fill; the old
   Recording card, the "still to ask" list and the one-by-one stepper were removed with the screens that used them. */
(function () {
  const PSY = window.PSY;
  if (!PSY || !PSY.lauris) return;
  const U = (PSY.l1b = PSY.l1b || {});
  const esc = (s) => PSY.esc(s);
  const GONE = { gone: true };
  U.GONE = GONE;

  /* ---------------- state flags ---------------- */
  U.k = (form, cid, name) => 'l1b.' + form + (form === 'dpn' ? '.' + cid : (cid === '4492' ? '' : '.' + cid)) + '.' + name;
  U.get = (k) => PSY.flag(k);
  U.set = (k, v) => PSY.flag(k, v);
  U.consumer = (id, dflt) => { const L = PSY.data.lauris; return (id && L.byId(String(id))) || L.byId(dflt) || L.consumers[0]; };
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.plain = (html) => { const d = document.createElement('div'); d.innerHTML = String(html).replace(/<br\s*\/?>/gi, '\n'); return d.textContent; };
  U.isMine = (e) => e === GONE;
  /* ?scribe=1 starts the Scribe when a form is opened. The shell reads the flag on every render of the route, so a page that is
     rendered again (coming back from another browser tab, history) would start the Scribe all over. Call from mount: the flag is
     dropped right after this render has used it, so only a fresh navigation (Add Session, Open with Scribe, the chooser) starts it. */
  U.guardScribe = (ctx) => { const p = ctx && ctx.params; if (p && p.scribe) setTimeout(() => { delete p.scribe; }, 0); };

  /* the approved intervention picklist (Lauris ISP 2.0 drop-down). Notes and goals may only use these names. */
  U.APPROVED = [
    'Clinical 2.1 Movement', 'Clinical 2.2 Mindfulness and grounding', 'QMHP 1.1 Identify and name feelings', 'QMHP 1.2 Coping skills practice',
    'QMHP 1.3 Psychoeducation', 'QMHP 1.4 Structured problem solving', 'QMHP 1.5 Make or maintain friendships',
    'QMHP 1.6 Recognize danger / healthy boundaries', 'QMHP 1.7 Social skills coaching', 'QMHP 1.8 Family skills coaching', 'QMHP 1.9 Solving peer conflict',
  ];

  /* ---------------- icons ---------------- */
  const svg = (p, c, s) => '<svg aria-hidden="true" width="' + (s || 16) + '" height="' + (s || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2.2">' + p + '</svg>';
  U.ic = {
    ok: svg('<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>', '#217A78'),
    warn: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>', '#6F4A05'),
    bad: svg('<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>', '#8A2E1C'),
    wait: svg('<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>', '#8E99A6'),
    mic: svg('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>', '#217A78', 14),
  };

  /* ---------------- Lauris page pieces ---------------- */
  U.head = (c, o) => {
    o = o || {};
    const L = PSY.data.lauris; const u = L.units(c);
    /* direct support staff: Lauris does not show them authorization data (owner C's PSY.l1a.dss) */
    const right = PSY.l1a && PSY.l1a.dss && PSY.l1a.dss() ? ''
      : u == null
      ? '<a class="lk warn" data-go="lauris-consumer?c=' + c.id + '&amp;tab=auth">No authorizations available</a>'
      : '<a class="lk" data-go="lauris-consumer?c=' + c.id + '&amp;tab=auth"><span data-l1b="units">' + L.unitsLabel(c) + '</span></a><span class="lmuted"> · ending ' + c.ends + '</span>';
    return '<div class="l1b-bar"><div class="l1b-av"></div><div><div class="nm">' + esc(c.ini) + (o.chip ? ' <span class="l1b-new">' + o.chip + '</span>' : '') + '</div><div class="mt">' + (o.meta || '') + '</div></div><div class="rt">' + right + '</div></div>';
  };
  const TABS = [['General Information', 'general'], ['Authorization Information', 'auth'], ['Documents', 'docs'], ['Active File', 'file'], ['Medications', 'meds'], ['Allergies', 'allergies']];
  U.tabs = (c, on) => '<div class="ltabs">' + TABS.map((t) => '<a class="ltab' + (t[1] === on ? ' on' : '') + '" data-go="lauris-consumer?c=' + c.id + '&amp;tab=' + t[1] + '">' + t[0] + '</a>').join('') + '</div>';
  U.procChip = (at) => '<span class="l1b-proc">Processed · ' + esc(at) + '</span>';
  U.entry = (type, meta, proc) => '<div class="l1b-entry"><label>Session entry</label><div class="in">' + type + '</div><span class="lmuted">' + meta + '</span><span data-l1b="proc">' + (proc ? U.procChip(proc) : '') + '</span></div>';
  U.btns = (proc, legend) => '<div class="l1b-btns"><button class="lb" data-act="l1b-save">Save Form Data</button><button class="lb" data-act="l1b-process" data-l1b="pf"' + (proc ? ' disabled' : '') + '>Process Form</button><span class="lmuted">' + (legend || '') + '</span></div><div class="l1b-err" data-l1b="err" hidden></div>';
  U.legend = 'Amber boxes: typed by Psyflo';

  /* a labelled box. f = {id,label,html,src:'g'|'a'|'c',ph,kind:'ta'|'sel',mh,cls}. filled = show the final typed value now. */
  U.field = (f, filled) => {
    const lab = '<label>' + f.label + '</label>';
    const st = f.mh ? ' style="min-height:' + f.mh + 'px"' : '';
    let box;
    if (f.kind === 'ta') {
      box = '<textarea class="in' + (filled ? ' a' : '') + '" data-f="' + f.id + '" rows="' + (f.rows || 4) + '" placeholder="' + esc(f.ph || '') + '" spellcheck="false">' + (filled ? esc(U.plain(f.html)) : '') + '</textarea>';
    } else if (f.src === 'g') {
      box = '<div class="in g" data-f="' + f.id + '"' + st + '>' + f.html + '</div>';
    } else if (f.src === 'c') {
      box = '<div class="in l1b-mine" contenteditable="true" spellcheck="false" data-f="' + f.id + '" data-ph="' + esc(f.ph != null ? f.ph : 'Left for you.') + '"' + st + '></div>';
    } else {
      box = '<div class="in' + (filled ? ' a' : '') + '" contenteditable="true" spellcheck="false" data-f="' + f.id + '" data-ph="' + esc(f.ph || '') + '"' + st + '>' + (filled ? f.html : '') + '</div>';
    }
    return '<div class="l1b-f' + (f.cls ? ' ' + f.cls : '') + '">' + lab + box + '</div>';
  };

  /* ---------------- typing into the Lauris boxes ---------------- */
  U.reveal = (el) => { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} };
  U.type = async (root, el, html, o) => {
    o = o || {};
    if (!el) return;
    const gone = () => !root.isConnected;
    const tag = el.tagName;
    el.classList.add('typing');
    if (tag === 'SELECT') {
      await U.sleep(o.ms || 240); if (gone()) throw GONE;
      el.value = String(html);
    } else {
      const val = tag === 'TEXTAREA' || tag === 'INPUT';
      const txt = U.plain(html);
      if (val) el.value = ''; else el.textContent = '';
      const frames = Math.max(1, Math.min(o.frames || 24, txt.length));
      const step = Math.max(1, Math.ceil(txt.length / frames));
      for (let i = step; ; i += step) {
        const n = Math.min(i, txt.length);
        if (val) el.value = txt.slice(0, n); else el.textContent = txt.slice(0, n);
        if (n >= txt.length) break;
        await U.sleep(o.dt || 22); if (gone()) throw GONE;
      }
      if (!val) el.innerHTML = html;
    }
    el.classList.remove('typing'); el.classList.add('a');
    if (el.tagName === 'DIV') el.title = 'Typed by Psyflo';
  };
  /* item = {id, html} or {id, cells:[html,…]} (a table row: cells are data-f="id.0", "id.1"…) */
  U.typeItem = async (root, it, o) => {
    if (it.cells) {
      const els = it.cells.map((_, i) => root.querySelector('[data-f="' + it.id + '.' + i + '"]'));
      if (els[0]) U.reveal(els[0]);
      await Promise.all(els.map((el, i) => U.type(root, el, it.cells[i], Object.assign({ frames: 14 }, o))));
      const tr = els[0] && els[0].closest('tr'); if (tr) tr.classList.add('l1b-typed');
      return;
    }
    const el = root.querySelector('[data-f="' + it.id + '"]');
    if (el) { U.reveal(el); await U.type(root, el, it.html, Object.assign({}, it.o, o)); }
  };
  U.fill = async (root, items, o) => {
    o = o || {};
    if (root.__l1bBusy) return false;
    root.__l1bBusy = true;
    const er = root.querySelector('[data-l1b="err"]'); if (er) er.hidden = true;
    try {
      for (let i = 0; i < items.length; i++) {
        if (o.progress) o.progress(i, items.length, items[i]);
        await U.typeItem(root, items[i], items[i].o);
        if (o.after) o.after(i + 1, items.length, items[i]);
        await U.sleep(o.gap == null ? 60 : o.gap);
      }
      return true;
    } catch (e) { if (e !== GONE) throw e; return false; } finally { root.__l1bBusy = false; }
  };
  U.markDone = (b, label) => { if (!b) return; b.setAttribute('data-l1b-done', '1'); b.disabled = true; if (label) b.textContent = label; };

  /* ---------------- panel pieces ---------------- */
  U.cap = (t, extra) => '<div class="l1b-caprow"><div class="cap">' + t + '</div>' + (extra || '') + '</div>';

  /* ---------------- Save Form Data / Process Form (the Lauris buttons) ---------------- */
  PSY.acts['l1b-save'] = () => PSY.ui.toast('Saved.');
  PSY.acts['l1b-process'] = (el, ctx) => { const f = ctx.root.__l1bForm; if (f && f.process) f.process(ctx.root, ctx); };
  /* o = { key, required:[{id,label}], after(root), toast, seeIt:{to,label,text} } */
  U.process = (root, o) => {
    const q = (s) => root.querySelector(s);
    if (U.get(o.key)) { PSY.ui.toast('Already processed.'); return false; }
    const val = (el) => (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT') ? el.value : el.textContent;
    const miss = (o.required || []).filter((r) => { const el = q('[data-f="' + r.id + '"]'); return el && !String(val(el)).trim(); });
    const err = q('[data-l1b="err"]');
    if (miss.length) {
      err.hidden = false;
      err.innerHTML = '<b>Fill the required boxes first</b>: ' + miss.map((m) => esc(m.label)).join(', ');
      U.reveal(err);
      return false;
    }
    err.hidden = true;
    const at = PSY.now(); U.set(o.key, at);
    q('[data-l1b="proc"]').innerHTML = U.procChip(at);
    const b = q('[data-l1b="pf"]'); if (b) b.disabled = true;
    if (o.after) o.after(root);
    PSY.ui.toast(o.toast || 'Processed.');
    if (o.seeIt) PSY.ext.seeIt(root, o.seeIt);
    return true;
  };
  /* the panel opens beside the form the first time you start it, as the context line says */
  U.openPanel = (key) => { if (!U.get(key + '.opened')) { U.set(key + '.opened', true); PSY.ext.reveal('notes'); } };

  /* ---------------- Get Signature (Lauris signature pad; Psyflo cannot sign) ---------------- */
  PSY.acts['l1b-sign'] = (el, ctx) => {
    const who = el.getAttribute('data-who') || 'Parent/Guardian';
    ctx.modal({
      title: 'Get Signature · ' + who, sub: 'T.W. · Individual Service Plan 2.0',
      body: '<p style="margin:0 0 6px">T.W. is under 14: own signature not required.</p><p style="margin:0">Approver: J. Perez, LPC</p>',
      actions: [{ label: 'Close' }, { label: 'Send the pad to the tablet', primary: true, onClick: () => { PSY.ui.toast('Signature pad sent.'); } }],
    });
  };

  /* ---------------- shared CSS (Lauris form area + extension panel pieces) ---------------- */
  U.css = `
.l1b-bar{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #D5D9DF;border-radius:4px;padding:9px 14px;margin-bottom:2px}
.l1b-av{flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#DDE1E6}
.l1b-bar .nm{font-weight:700;font-size:15px;color:#1F3B6B}
.l1b-bar .mt{font-size:11px;color:#666;margin-top:1px;line-height:1.35}
.l1b-bar .rt{margin-left:auto;font-size:12px;text-align:right;flex:0 0 auto}
.l1b-new{font-size:10.5px;font-weight:700;color:#6F4A05;background:#FCEFD0;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:2px}
.l1b-entry{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}
.l1b-entry label{margin:0}
.l1b-entry .in{min-width:260px}
.l1b-proc{display:inline-flex;align-items:center;background:#E6F4EA;color:#1E6B3A;border:1px solid #B7DEC3;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:700}
.l1b-g{display:grid;gap:10px;margin-bottom:10px}
.l1b-g.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.l1b-g.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.l1b-g.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.l1b-g.af{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.l1b-g.af2{grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.l1b-f{min-width:0;display:flex;flex-direction:column}
.l1b-f>.in,.l1b-f>textarea.in,.l1b-f>select{flex:1 1 auto}
.l1b-f>label{flex:0 0 auto}
.l1b-ph label{min-height:29px}
.l1b-f.full{grid-column:1/-1}
.lz-main .in{white-space:pre-line;line-height:1.45;word-break:break-word}
.lz-main textarea.in{width:100%;display:block;font:inherit;resize:vertical;white-space:pre-wrap}
.lz-main .in[contenteditable]:focus,.lz-main textarea.in:focus{outline:2px solid #7FA6D8;outline-offset:-1px}
.lz-main .in[data-ph]:empty:before{content:attr(data-ph);color:#8A8F98}
.lz-main .in.typing:after{content:"";display:inline-block;width:1px;height:1.1em;background:#333;vertical-align:text-bottom;margin-left:1px;animation:l1bc .8s steps(1) infinite}
@keyframes l1bc{50%{opacity:0}}
.lz-main select.lsel.a{background:#FFF8E6;border-color:#E8C56A}
.lz-main select.lsel.typing{background:#FFF1CC;border-color:#E0A030}
.l1b-hl{outline:3px solid #E0A030!important;outline-offset:1px;box-shadow:0 0 0 6px rgba(224,160,48,.22)}
.l1b-lbl{font-size:12px;font-weight:700;color:#1F3B6B;margin:6px 0 6px;display:flex;align-items:center;gap:8px}
.l1b-lbl span{font-weight:400;color:#6B7280}
.l1b-tbl{width:100%;border-collapse:collapse;background:#fff;font-size:12.5px;margin-bottom:10px}
.l1b-tbl th{background:#EDEDED;text-align:left;font-weight:700;padding:6px 8px;border:1px solid #CFCFCF;font-size:12px}
.l1b-tbl td{border:1px solid #CFCFCF;padding:5px 8px;vertical-align:top}
.l1b-tbl td.in{border-radius:0;min-height:0}
.l1b-tbl td.in.a{background:#FFF8E6}
.l1b-tbl td.nm{font-weight:600;background:#F7F8FA}
.l1b-btns{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
.l1b-btns .lmuted{margin-left:6px;max-width:520px;line-height:1.35}
.l1b-err{margin-top:10px;border:1px solid #E0A19A;background:#FCEDEA;color:#8A2E1C;padding:8px 12px;border-radius:3px;font-size:12.5px}
.l1b-err[hidden]{display:none}
.l1b-mine{background:#fff}
.lz-main label.l1b-rad{display:inline-flex;gap:5px;align-items:center;font-size:13px;color:#222;text-transform:none;letter-spacing:0;margin:0 14px 0 0}
.l1b-sub{font-size:12px;font-weight:700;color:#1F3B6B;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid #D5D9DF;display:flex;align-items:center;gap:8px}
.l1b-sub span{font-weight:400;color:#6B7280;font-size:11.5px}
/* extension panel pieces */
.xp .l1b-caprow{display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap}
.xp .l1b-btnrow{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.xp .l1b-btnrow .btn.p{flex:1}
.xp .l1b-xs{font-size:12px;color:#525B66;margin-top:4px;line-height:1.45}
.xp .l1b-lk{background:none;border:0;padding:0;font:inherit;font-weight:600;color:#15605E;text-decoration:underline;cursor:pointer}
.xp .l1b-n{display:flex;flex-direction:column;gap:10px}
.xp .l1b-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.xp [hidden]{display:none!important}
`;
})();
