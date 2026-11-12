/* Round 9 foundation: shared models every owner uses.
   1) PSY.sync      document versions and EHR synchronization (prompt §5)
        version flow  Original Note → AI Draft → Clinician Edited → Approved → Synchronized
        sync states   Unsaved Changes · Draft Saved · Ready to Sync · Syncing · Synced · Sync Failed
        PSY.sync.init(key, {original, ai, label})   create once (no-op if it exists); key e.g. 'dpn|4471|2026-10-29'
        PSY.sync.get(key) · edit(key, text) · saveDraft(key) · approve(key) · push(key, writer, {onDone}) · reset(key)
        writer(text) → true | {ok:false, reason}  (sync fails with that reason; PSY.sync.failNext() makes the next push fail, for the demo)
        PSY.sync.flowHtml(key) · stateHtml(key) · actionsHtml(key, {pushLabel, copy:true|false})  UI pieces; acts: sync-save, sync-approve, sync-push, sync-retry
        A screen that renders actionsHtml registers its writer: PSY.sync.writer(key, fn) and a repaint: PSY.sync.onChange(key, fn)
   2) PSY.download(filename, data)  offers a generated file through the viewer (artifact `downloads` capability); falls back to a preview
      PSY.csv(rows) · PSY.pdf(title, lines)  build CSV text / a simple one-column PDF (ASCII text)
   3) PSY.diStatus  Denial Intelligence resolution status per authorization case (prompt §10H), with propagation to the authorization record.
      LIST, get(caseId), set(caseId, status, {by, note, approved}), label(status), propagate(caseId, status, opts) (owner DI-1 may override) */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;

  /* ================= 1) sync ================= */
  const SY = (PSY.sync = PSY.sync || {});
  SY.STAGES = [['original', 'Original'], ['ai', 'AI Draft'], ['edited', 'Clinician Edited'], ['approved', 'Approved'], ['synced', 'Synchronized']];
  SY.STATES = { unsaved: ['Unsaved Changes', 'amber'], saved: ['Draft Saved', 'gray'], ready: ['Ready to Sync', 'blue'], syncing: ['Syncing', 'blue'], synced: ['Synced', 'green'], failed: ['Sync Failed', 'red'] };
  const st = () => (PSY.state.sync = PSY.state.sync || {});
  const now = () => (PSY.now ? PSY.now() : '');
  const writers = {}; const watchers = {};
  SY.writer = (key, fn) => { writers[key] = fn; };
  SY.onChange = (key, fn) => { watchers[key] = fn; };
  const changed = (key) => { PSY.save(); const f = watchers[key]; if (f) { try { f(SY.get(key)); } catch (e) { console.error('sync watcher', key, e); } } };
  const hist = (d, stage, by) => { d.history.push({ stage, at: now(), by: by || (PSY.user ? PSY.user().name : '') }); };
  SY.get = (key) => st()[key] || null;
  SY.init = (key, o) => {
    o = o || {}; let d = st()[key]; if (d) return d;
    d = st()[key] = { key, label: o.label || '', original: o.original || '', ai: o.ai != null ? o.ai : null, text: o.ai != null ? o.ai : (o.original || ''), approved: null, synced: null,
      stage: o.ai != null ? 'ai' : 'original', state: 'saved', reason: '', at: now(), history: [] };
    hist(d, 'original'); if (o.ai != null) hist(d, 'ai', 'Psyflo');
    PSY.save(); return d;
  };
  SY.setAi = (key, ai) => { const d = SY.get(key); if (!d) return null; d.ai = ai; d.text = ai; d.stage = 'ai'; d.state = 'saved'; hist(d, 'ai', 'Psyflo'); changed(key); return d; };
  SY.edit = (key, text) => {
    const d = SY.get(key); if (!d || text === d.text) return d;
    d.text = text; d.state = 'unsaved'; d.reason = '';
    if (d.stage !== 'edited') { d.stage = 'edited'; hist(d, 'edited'); }
    PSY.save(); const f = watchers[key]; if (f) { try { f(d, { typing: true }); } catch (e) {} }
    return d;
  };
  SY.saveDraft = (key) => { const d = SY.get(key); if (!d) return null; d.state = 'saved'; d.at = now(); changed(key); return d; };
  SY.approve = (key) => { const d = SY.get(key); if (!d) return null; d.approved = d.text; d.stage = 'approved'; d.state = 'ready'; d.reason = ''; hist(d, 'approved'); if (PSY.audit) PSY.audit.add({ action: 'Approved ' + (d.label || 'document'), by: PSY.user().name, doc: d.label }); changed(key); return d; };
  let failNext = false;
  SY.failNext = () => { failNext = true; };
  SY.push = (key, writer, o) => {
    o = o || {}; const d = SY.get(key); if (!d) return Promise.resolve(false);
    if (d.stage !== 'approved' && d.stage !== 'synced') { d.reason = 'Approve first'; changed(key); return Promise.resolve(false); }
    writer = writer || writers[key];
    d.state = 'syncing'; changed(key);
    return new Promise((res) => setTimeout(async () => {
      let r = true;
      try { r = failNext ? { ok: false, reason: 'Lauris did not respond' } : (writer ? await writer(d.approved) : true); } catch (e) { r = { ok: false, reason: e.message }; }
      failNext = false;
      if (r === false || (r && r.ok === false)) { d.state = 'failed'; d.reason = (r && r.reason) || 'Lauris did not accept the change'; changed(key); res(false); return; }
      d.synced = d.approved; d.stage = 'synced'; d.state = 'synced'; d.at = now(); d.reason = ''; hist(d, 'synced');
      if (PSY.audit) PSY.audit.add({ action: 'Synced ' + (d.label || 'document') + ' to Lauris', by: PSY.user().name, doc: d.label });
      changed(key); if (o.onDone) o.onDone(d); res(true);
    }, o.ms != null ? o.ms : 700));
  };
  SY.reset = (key) => { delete st()[key]; PSY.save(); };
  /* UI pieces */
  SY.flowHtml = (key) => {
    const d = SY.get(key); const i = d ? SY.STAGES.findIndex((s) => s[0] === d.stage) : 0;
    return '<ol class="sy-flow" data-psy="sync-flow" data-stage="' + (d ? d.stage : '') + '" aria-label="Version">' + SY.STAGES.map((s, k) => '<li class="' + (k < i ? 'done' : k === i ? 'now' : '') + '">' + s[1] + '</li>').join('') + '</ol>';
  };
  SY.stateHtml = (key) => {
    const d = SY.get(key); if (!d) return ''; const s = SY.STATES[d.state] || SY.STATES.saved;
    return '<span class="sy-st t-' + s[1] + '" data-psy="sync-state" data-state="' + d.state + '">' + (d.state === 'syncing' ? '<i class="sy-spin" aria-hidden="true"></i>' : '') + s[0] + (d.state === 'synced' && d.at ? ' · ' + esc(d.at) : '') + '</span>' +
      (d.reason ? '<span class="sy-why" data-psy="sync-why">' + esc(d.reason) + '</span>' : '');
  };
  /* Save draft · Approve · Save & Push to EHR (+ optional Save & Copy fallback when direct population is unavailable) */
  SY.actionsHtml = (key, o) => {
    o = o || {}; const d = SY.get(key); if (!d) return '';
    const a = (act, label, cls, dis) => '<button type="button" class="btn ' + cls + ' s" data-act="' + act + '" data-key="' + esc(key) + '"' + (dis ? ' disabled' : '') + '>' + label + '</button>';
    const busy = d.state === 'syncing';
    const appr = d.stage === 'approved' || d.stage === 'synced';
    return '<div class="sy-acts" data-psy="sync-acts">' +
      a('sync-save', 'Save draft', 'o', busy || d.state === 'saved' || appr) +
      (appr ? '' : a('sync-approve', 'Approve', 'o', busy)) +
      (d.state === 'failed' ? a('sync-retry', 'Retry sync', 'p', false) : a('sync-push', o.pushLabel || 'Save & Push to Lauris', 'p', busy || !appr || d.state === 'synced')) +
      (o.copy ? a('sync-copy', 'Save & Copy', 'o', busy) + '<span class="sy-note">Copy only · Lauris not updated</span>' : '') + '</div>';
  };
  SY.copyText = (key) => { const d = SY.get(key); return d ? d.text : ''; };
  PSY.acts['sync-save'] = (el) => SY.saveDraft(el.getAttribute('data-key'));
  PSY.acts['sync-approve'] = (el) => { SY.approve(el.getAttribute('data-key')); PSY.ui.toast('Approved.'); };
  PSY.acts['sync-push'] = (el) => { const k = el.getAttribute('data-key'); SY.push(k).then((ok) => PSY.ui.toast(ok ? 'Synced to Lauris.' : 'Sync failed.', ok ? null : { err: true })); };
  PSY.acts['sync-retry'] = (el) => { const k = el.getAttribute('data-key'); const d = SY.get(k); if (d) { d.state = 'ready'; d.reason = ''; } SY.push(k).then((ok) => PSY.ui.toast(ok ? 'Synced to Lauris.' : 'Sync failed.', ok ? null : { err: true })); };
  PSY.acts['sync-copy'] = (el) => { const k = el.getAttribute('data-key'); SY.saveDraft(k); if (PSY.copy) PSY.copy(SY.copyText(k), 'Copied · Lauris not updated.'); };
  /* a textarea bound to a sync doc: <textarea data-input="sync-edit" data-key="…"> */
  PSY.acts['sync-edit'] = (el) => SY.edit(el.getAttribute('data-key'), el.value);

  /* ================= 2) downloads ================= */
  let DL; // resolves to the `downloads` namespace or null
  const dl = () => { if (DL === undefined) DL = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null); return DL; };
  PSY.download = async (filename, data, o) => {
    o = o || {}; const d = await dl();
    if (d) {
      try { await d.save({ filename, data }); PSY.ui.toast('Downloaded.'); if (PSY.audit) PSY.audit.add({ action: 'Downloaded ' + filename, by: PSY.user().name }); return true; }
      catch (e) { if (e && e.code === 'declined') return false; if (e && e.code === 'rate_limited') { PSY.ui.toast('Try again in a moment.'); return false; } }
    }
    /* no download in this view (local file, preview): show the file instead. Round 12: a copy opened as a local file (no claude.ai
       host at all) also gets a "Save file" link built from the same bytes; the hosted page always uses the downloads capability above */
    const text = typeof data === 'string' ? data : '';
    let save = '';
    if (!window.claude) {
      try {
        const bytes = typeof data === 'string' ? Uint8Array.from(data, (ch) => ch.charCodeAt(0) & 255) : data;
        const type = /\.pdf$/i.test(filename) ? 'application/pdf' : /\.csv$/i.test(filename) ? 'text/csv' : 'text/plain';
        const url = URL.createObjectURL(new Blob([/\.pdf$/i.test(filename) ? bytes : text || bytes], { type }));
        save = '<a class="btn p s" data-psy="dl-save" href="' + url + '" download="' + esc(filename) + '" style="text-decoration:none;margin-right:10px">Save file</a>';
      } catch (e) { save = ''; }
    }
    PSY.ui.modal({ wide: true, title: filename, body: (o.preview || (/\.pdf$/i.test(filename) ? '' : '<textarea readonly style="width:100%;min-height:300px;font:12px/1.45 ui-monospace,monospace">' + esc(text.slice(0, 20000)) + '</textarea>')) + '<p style="color:#6B665E;font-size:13px;margin:10px 0 0;display:flex;align-items:center;flex-wrap:wrap">' + (save ? save + '<span>Opened as a local file: save it from here.</span>' : 'Download not available in this view.') + '</p>' });
    return false;
  };
  PSY.download.available = async () => !!(await dl());
  PSY.csv = (rows) => rows.map((r) => r.map((v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n') + '\r\n';
  /* a small, valid PDF: Letter pages of Helvetica text, wrapped at ~95 characters (ASCII only; other characters are simplified) */
  PSY.pdf = (title, lines) => {
    const clean = (s) => String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/·/g, '-').replace(/…/g, '...').replace(/→/g, '->').replace(/[^\x20-\x7E]/g, '?');
    const wrap = (s, n) => { const out = []; let cur = ''; clean(s).split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); out.push(cur); return out; };
    const all = [{ t: title, b: true }].concat([{ t: '' }]).concat((lines || []).reduce((a, l) => { const o = typeof l === 'string' ? { t: l } : l; wrap(o.t, o.b ? 80 : 95).forEach((x) => a.push({ t: x, b: o.b })); return a; }, []));
    const per = 52; const pages = []; for (let i = 0; i < all.length; i += per) pages.push(all.slice(i, i + per));
    const pdfEsc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(''); const pagesId = add(''); const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const kids = [];
    pages.forEach((pg) => {
      let y = 750; const ops = ['BT'];
      pg.forEach((l) => { ops.push((l.b ? '/F2 11' : '/F1 10') + ' Tf 1 0 0 1 54 ' + y + ' Tm (' + pdfEsc(l.t) + ') Tj'); y -= 14; });
      ops.push('ET'); const stream = ops.join('\n');
      const c = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + font + ' 0 R /F2 ' + fontB + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
    });
    objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  };

  /* ================= 3) Denial Intelligence resolution status ================= */
  const DS = (PSY.diStatus = PSY.diStatus || {});
  DS.LIST = [['new', 'New'], ['review', 'Under Review'], ['docs', 'Awaiting Documentation'], ['drafted', 'Appeal Drafted'], ['submitted', 'Submitted'], ['awaiting', 'Awaiting Payer'],
    ['overturned', 'Overturned'], ['partover', 'Partially Overturned'], ['upheld', 'Upheld'], ['closed', 'Closed']];
  DS.TIMELINE = [['received', 'Decision Received'], ['review', 'Clinical Review'], ['prepared', 'Appeal Prepared'], ['submitted', 'Submitted'], ['response', 'Payer Response'], ['resolved', 'Resolved']];
  DS.label = (s) => (DS.LIST.find((x) => x[0] === s) || [s, s])[1];
  const ds = () => (PSY.state.diStatus = PSY.state.diStatus || {});
  DS.seed = DS.seed || {}; // owner DI-1 sets the starting status per case: DS.seed[caseId] = 'review'
  DS.get = (cid) => (ds()[cid] && ds()[cid].status) || DS.seed[cid] || 'new';
  DS.rec = (cid) => ds()[cid] || null;
  /* where the case sits on the resolution timeline (index into DS.TIMELINE) */
  DS.step = (cid) => ({ new: 0, review: 1, docs: 1, drafted: 2, submitted: 3, awaiting: 3, overturned: 5, partover: 5, upheld: 5, closed: 5 })[DS.get(cid)] || 0;
  DS.set = (cid, status, o) => {
    o = o || {}; const r = ds()[cid] = ds()[cid] || { status: DS.get(cid), history: [] };
    r.status = status; r.at = now(); r.by = o.by || PSY.user().name; r.note = o.note || ''; r.history.push({ status, at: r.at, by: r.by, note: r.note });
    if (PSY.audit) PSY.audit.add({ case: cid, action: 'Denial Intelligence: ' + DS.label(status) + (o.note ? ' · ' + o.note : ''), by: r.by });
    try { DS.propagate(cid, status, o); } catch (e) { console.error('diStatus propagate', e); }
    PSY.save(); return r;
  };
  /* default propagation to the authorization record (owner DI-1 may replace it with unit-aware logic) */
  DS.propagate = DS.propagate || ((cid, status, o) => {
    const A = PSY.auth; if (!A || !A.set) return;
    if (status === 'submitted' || status === 'awaiting') A.set(cid, o.path === 'recon' ? 'recon' : 'appeal', { action: 'Appeal submitted (simulated)', by: o.by });
    else if (status === 'overturned') A.set(cid, 'approved', { action: 'Payer overturned the decision', by: o.by });
    else if (status === 'partover') A.set(cid, 'partial', { action: 'Payer partially overturned the decision', by: o.by });
  });

  /* ================= CSS (extension + platform) ================= */
  const CSS = `
  .sy-flow{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none;font-size:11.5px;font-weight:600}
  .sy-flow li{padding:3px 8px;border-radius:999px;background:#F3F0EA;color:#8E99A6}
  .sy-flow li.done{background:#E3EFEA;color:#1D4F43}
  .sy-flow li.now{background:#1D4F43;color:#fff}
  .sy-st{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
  .sy-st.t-amber{background:#FCEFD0;color:#7A5200}.sy-st.t-gray{background:#EFEBE4;color:#4A453D}.sy-st.t-blue{background:#E6EEFB;color:#1F4C9A}
  .sy-st.t-green{background:#E3EFEA;color:#1D4F43}.sy-st.t-red{background:#FBE9E4;color:#9A2B17}
  .sy-why{display:block;font-size:12px;color:#9A2B17;margin-top:4px}
  .sy-spin{width:10px;height:10px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:syspin .8s linear infinite}
  @keyframes syspin{to{transform:rotate(360deg)}}
  .sy-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .sy-note{font-size:12px;color:#6B665E}
  `;
  PSY.css.lauris = (PSY.css.lauris || '') + CSS;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
})();
