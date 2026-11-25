/* Lauris form kit: builds a Lauris "Online Forms Entry" page from a schema and fills it (the Scribe's Save to Lauris, Scan & Enhance's Push to form).
   Used by the Admission Screening, the Intake (Comprehensive Needs Assessment) and any other form that follows the real Lauris layout
   (label on the left, input on the right, section headers, signature block, "Process Form" at the bottom).

   SCHEMA  (PSY.lf.define(id, schema))
     { title:'Admission Screening', approver:'Administrative Director', items:[ …items ] }
   ITEMS (rendered in order)
     { h:'Section title' }                                   section header (click to collapse)
     { k:'name', l:'Name of applicant', t:'text', auto:(c)=>'T.W.', req:true, human:false, ph:'' }
          t: 'text' | 'date' | 'select' (opts:[…]) | 'area' (rows:5) | 'checks' (opts:[…]; keys k.0, k.1 …) | 'dx' (n:6; keys k.0 …) | 'note' (text)
     { k:'prev', l:'Previous Interventions:', t:'table', cols:['Mental Health Treatment','Provider','Dates of Service','Response to Treatment'], rows:['Psychiatric services', …] }
          cell keys:  prev.<row>.<col>   (col 1..n; col 0 is the row label)
     { t:'sig', k:'staff', title:'Clinical Screening Staff', fields:[['Signature','pad'],['Credentials','QMHP'],['Date','10/29/2026']] }
   FLAGS  auto: value Lauris already has (green).  req: Lauris will not process while it is empty.  human: a clinical decision, never typed by the Scribe
          (diagnosis, "meets criteria", signatures).
   VALUES are one flat map  { key: string }   (checks: '1'; selects: option text).  Stored in PSY.state.lf['<id>|<childId>'] = { v:{}, s:{}, processed, recs:{} }.

   PAGE
     render(params){ const c = PSY.lf.child(params, '4492'); return PSY.lf.page({ id:'adm', c, context:'…', notes:'<html under the Scribe box>', lead:'…' }); }
     mount(root){ PSY.lf.mount(root, { id:'adm', c, onProcess: (root, c) => {…}, route:'lauris-screening' }); }
   SCRIBE  PSY.lf.scribe('lauris-screening', 'adm', { type:'admission', defaultC:'4492', lines:(c,params)=>[{t,who,text}], values:(c)=>({key:value}), left?:(c,get)=>[{k,label}] })
           (round 8: the Scribe shows the captured values in the extension; its "Save to Lauris" calls PSY.lf.fill(root, id, c, values, { fast, clear }))
   RECOMMENDATIONS  PSY.lf.recs('adm', (c) => [ { id, title, keys:['needs'], value:{ needs:'text' }, req:'tdt-clin2', addr:'Clinical necessity · criterion 1' } ])
           (read by Scan & Enhance, 76-enhance.js; round 8 removed the Review tab that showed them in the panel) */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const L = PSY.data.lauris;
  const K = (PSY.lf = { forms: {}, recDefs: {} });
  K.define = (id, schema) => { K.forms[id] = schema; return schema; };
  K.recs = (id, fn) => { K.recDefs[id] = fn; };
  K.child = (params, dflt) => (params && params.c && L.byId(params.c)) || L.byId(dflt);

  /* a short ICD-10 / DSM-5 list for the diagnosis boxes */
  K.DX = ['F91.3 - Oppositional Defiant Disorder', 'F90.2 - Attention-deficit Hyperactivity Disorder, Combined Presentation', 'F90.1 - Attention-deficit Hyperactivity Disorder, Predominantly Hyperactive/Impulsive Presentation', 'F91.1 - Conduct Disorder, Childhood-onset Type', 'F43.10 - Post-traumatic Stress Disorder, Unspecified', 'F43.24 - Adjustment Disorder with Disturbance of Conduct', 'F43.25 - Adjustment Disorder with Mixed Disturbance of Emotions and Conduct', 'F34.81 - Disruptive Mood Dysregulation Disorder', 'F41.1 - Generalized Anxiety Disorder', 'F32.A - Depression, Unspecified', 'F84.0 - Autism Spectrum Disorder', 'F63.81 - Intermittent Explosive Disorder'];

  /* ---------- state ---------- */
  const sk = (id, c) => id + '|' + (c ? c.id : '');
  K.st = (id, c) => { const m = (PSY.state.lf = PSY.state.lf || {}); return (m[sk(id, c)] = m[sk(id, c)] || { v: {}, s: {}, processed: false, recs: {} }); };
  const autoOf = (it, c) => (typeof it.auto === 'function' ? it.auto(c) : it.auto);
  const isEmpty = (v) => v == null || String(v).trim() === '';

  /* every field key of a form with its item */
  K.fields = (id) => {
    const out = [];
    K.forms[id].items.forEach((it) => {
      if (it.t === 'checks') it.opts.forEach((o, i) => out.push({ key: it.k + '.' + i, it, label: o, kind: 'check' }));
      else if (it.t === 'dx') for (let i = 0; i < (it.n || 6); i++) out.push({ key: it.k + '.' + i, it, kind: 'dx', label: it.l + ' ' + (i + 1) });
      else if (it.t === 'table') it.rows.forEach((r, ri) => it.cols.slice(1).forEach((cn, ci) => out.push({ key: it.k + '.' + ri + '.' + (ci + 1), it, kind: 'cell', label: it.l.replace(/:$/, '') + ' · ' + r + ' · ' + cn })));
      else if (it.k && it.t !== 'note') out.push({ key: it.k, it, kind: it.t || 'text', label: it.l });
    });
    return out;
  };
  /* effective value: what the clinician or Psyflo typed, else what Lauris already has */
  K.val = (id, c, key) => {
    const st = K.st(id, c); if (key in st.v) return st.v[key];
    const f = K.fields(id).find((x) => x.key === key); return f ? (f.kind === 'check' ? '' : autoOf(f.it, c)) || '' : '';
  };

  /* ---------- html ---------- */
  const row = (id, c, it, st) => {
    const lab = '<label><i></i><span>' + esc(it.l) + (it.req ? ' <em class="lf-req">*</em>' : '') + '</span></label>';
    const cls = (k, extra) => 'lf-in' + (extra || '') + (k in st.v ? (st.s[k] === 'u' ? ' u' : ' a') : (autoOf(it, c) ? ' g' : ''));
    const val = (k) => esc(k in st.v ? st.v[k] : (autoOf(it, c) || ''));
    if (it.t === 'note') return '<div class="lf-note">' + it.text + '</div>';
    if (it.t === 'checks') return '<div class="lf-r" data-row="' + it.k + '">' + lab + '<div class="lf-c">' + it.opts.map((o, i) => { const k = it.k + '.' + i; const on = (k in st.v ? st.v[k] : '') === '1'; return '<label class="lf-ck' + (k in st.v ? (st.s[k] === 'u' ? '' : ' a') : '') + '"><input type="checkbox" data-f="' + k + '"' + (on ? ' checked' : '') + '> ' + esc(o) + '</label>'; }).join('') + '</div></div>';
    if (it.t === 'dx') { let h = ''; for (let i = 0; i < (it.n || 6); i++) { const k = it.k + '.' + i; const cur = k in st.v ? st.v[k] : ''; h += '<select class="' + cls(k) + '" data-f="' + k + '" aria-label="' + esc(it.l) + ' ' + (i + 1) + '"><option value=""></option>' + K.DX.map((d) => '<option' + (d === cur ? ' selected' : '') + '>' + esc(d) + '</option>').join('') + (cur && !K.DX.includes(cur) ? '<option selected>' + esc(cur) + '</option>' : '') + '</select>'; } return '<div class="lf-r" data-row="' + it.k + '">' + lab + '<div class="lf-c lf-dx">' + h + '</div></div>'; }
    if (it.t === 'table') {
      const head = '<tr>' + it.cols.map((cn) => '<th>' + esc(cn) + '</th>').join('') + '</tr>';
      const body = it.rows.map((r, ri) => '<tr><td class="lf-rl">' + esc(r) + '</td>' + it.cols.slice(1).map((cn, ci) => { const k = it.k + '.' + ri + '.' + (ci + 1); return '<td><input class="' + cls(k, ' lf-cell') + '" data-f="' + k + '" value="' + val(k) + '" aria-label="' + esc(r + ' ' + cn) + '"></td>'; }).join('') + '</tr>').join('');
      return '<div class="lf-tb" data-row="' + it.k + '"><div class="lf-tl"><i></i>' + esc(it.l) + '</div><div class="lf-tw"><table class="lf-t">' + head + body + '</table></div></div>';
    }
    if (it.t === 'sig') {
      return '<div class="lf-sig" data-row="' + it.k + '"><div class="lf-sh">' + esc(it.title) + '</div>' + it.fields.map(([n, d]) => d === 'pad'
        ? '<div class="lf-r"><label><i></i><span>' + esc(n) + ':</span></label><div class="lf-c"><a class="lf-getsig" data-act="lf-sig">Get Signature</a></div></div>'
        : '<div class="lf-r"><label><i></i><span>' + esc(n) + ':</span></label><div class="lf-c"><input class="lf-in g" value="' + esc(typeof d === 'function' ? d(c) : d) + '" readonly aria-label="' + esc(it.title + ' ' + n) + '"></div></div>').join('') + '</div>';
    }
    const k = it.k;
    if (it.t === 'select') return '<div class="lf-r" data-row="' + k + '">' + lab + '<div class="lf-c"><select class="' + cls(k) + '" data-f="' + k + '"><option value=""></option>' + it.opts.map((o) => '<option' + (o === (k in st.v ? st.v[k] : autoOf(it, c)) ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div></div>';
    if (it.t === 'area') return '<div class="lf-r" data-row="' + k + '">' + lab + '<div class="lf-c"><textarea class="' + cls(k) + '" data-f="' + k + '" rows="' + (it.rows || 4) + '" placeholder="' + esc(it.ph || '') + '">' + val(k) + '</textarea></div></div>';
    return '<div class="lf-r" data-row="' + k + '">' + lab + '<div class="lf-c"><input class="' + cls(k) + '" data-f="' + k + '" value="' + val(k) + '"' + (it.t === 'date' ? ' placeholder="mm/dd/yyyy"' : '') + '></div></div>';
  };
  K.formHtml = (id, c, o) => {
    o = o || {}; const F = K.forms[id]; const st = K.st(id, c);
    let h = ''; let open = false;
    const hdr = [['Unique ID:', 'ID' + String(c.id).padStart(6, '0')], ['ID #:', c.id], ['Client Name:', c.ini], ['Date:', '10/29/2026'], ['Medicaid ID:', 'on file'], ['Client DOB:', 'on file · age ' + c.age]];
    h += '<div class="lf-hd">' + hdr.map(([a, b]) => '<div class="lf-r"><label><i></i><span><b>' + a + '</b></span></label><div class="lf-c"><input class="lf-in g lf-hdin" value="' + esc(b) + '" readonly aria-label="' + esc(a) + '"></div></div>').join('') + '</div>';
    F.items.forEach((it) => {
      if (it.h) { if (open) h += '</div>'; h += '<div class="lf-h" data-act="lf-fold">' + esc(it.h) + ' <span class="lf-chev">⌃</span></div><div class="lf-sec">'; open = true; return; }
      h += row(id, c, it, st);
    });
    if (open) h += '</div>';
    return '<div class="lf" data-lf="' + id + '" data-cid="' + c.id + '">' +
      '<div class="lf-top"><span class="lf-crumb">Online Forms Entry</span><span class="lf-logo">LAURIS ONLINE<small>Thursday, October 29, 2026</small></span></div>' +
      '<div class="lf-title">' + esc(F.title) + '</div>' +
      '<div class="lf-lead">Enter Data for New Form Entry and Press ‘Process Form’:<span class="lf-jump">Top of Form</span></div><hr class="lf-hr">' + h +
      '<div class="lf-appr lf-r"><label><i></i><span><b>Select Approver:</b></span></label><div class="lf-c"><select class="lf-in g" aria-label="Select Approver"><option>' + esc(F.approverName || 'Maria · ' + (F.approver || 'Administrative Director')) + '</option></select></div></div>' +
      '<div class="lf-chk"><label><input type="checkbox"> Start another form after processing.</label><label><input type="checkbox"> Start another form after processing with Current Data</label></div>' +
      '<div class="lf-bar"><button class="lb" data-act="lf-preview">Preview Form</button><button class="lb" data-act="lf-calc">Run Calculations</button><button class="lb" data-act="lf-save">Save Form Data</button><button class="lb pri" data-act="lf-process" data-psy="process">Process Form</button><button class="lb" data-go="lauris-consumers">Close</button><span class="lf-leg" style="font-size:11px;color:#666;align-self:center;margin-left:8px"><i style="display:inline-block;width:11px;height:11px;border:1px solid #C9CDD3;border-radius:2px;background:#E6F4EA;margin:0 4px 0 0;vertical-align:-1px"></i>Lauris filled it<i style="display:inline-block;width:11px;height:11px;border:1px solid #E8C56A;border-radius:2px;background:#FFF8E6;margin:0 4px 0 8px;vertical-align:-1px"></i>typed by Psyflo, for you to check<i style="display:inline-block;width:11px;height:11px;border:1px solid #C9CDD3;border-radius:2px;background:#fff;margin:0 4px 0 8px;vertical-align:-1px"></i>saved text or typed by you</span></div>' +
      '<div class="lf-banner" data-psy="lf-banner" hidden></div></div>';
  };

  /* ---------- the whole page: Lauris chrome + form + extension panel ---------- */
  K.page = (o) => {
    const F = K.forms[o.id]; const c = o.c;
    const head = '<div class="lf-who"><b>' + esc(c.ini) + ', ' + c.age + '</b> · Harvest # ' + esc(c.id) + ' · ' + esc(c.school) + (K.st(o.id, c).processed ? ' <span class="lf-chip">Processed · waiting for ' + esc(F.approver || 'approval') + '</span>' : '') + '</div>';
    return PSY.lauris.page({ active: o.active || 'Add Session', main: head + K.formHtml(o.id, c, o) + '<div data-lf-add>' + K.addendaHtml(o.id, c) + '</div>' + (o.after || ''),
      panel: { context: o.context || (F.title + ' · ' + c.ini), notes: o.notes || '', review: '', tab: o.tab || 'notes', case: c.case, student: c.ini } });
  };
  /* round 10 (Scan & Enhance push target): a form processed on an earlier date takes dated addenda below it; the form is never overwritten */
  K.addenda = (id, c) => (((PSY.state.lfAdd || {})[id + '|' + (c ? c.id : '')]) || []).slice();
  K.addendaHtml = (id, c) => {
    const list = K.addenda(id, c); if (!list.length) return '';
    return '<div class="lf-addh">Addenda</div>' + list.map((a, i) => '<div class="lf-add" data-lf-addendum="' + i + '"><div class="lf-addm"><b>Addendum</b> · ' + esc(a.at) + ' · ' + esc(a.by) + '</div><div class="lf-addt">' + esc(a.text) + '</div></div>').join('');
  };
  K.addAddendum = (root, id, c, text, by) => {
    const m = (PSY.state.lfAdd = PSY.state.lfAdd || {}); const k = id + '|' + c.id;
    (m[k] = m[k] || []).push({ at: '10/29/2026 ' + PSY.now(), by: by || PSY.lauris.user.short, text: String(text || '').trim() }); PSY.save();
    const bx = root && root.isConnected && root.querySelector('[data-lf="' + id + '"][data-cid="' + c.id + '"]') && root.querySelector('[data-lf-add]');
    if (bx) { bx.innerHTML = K.addendaHtml(id, c); const last = bx.querySelector('.lf-add:last-child'); if (last) { try { last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } }
    return { ok: true, mode: 'addendum' };
  };
  K.mount = (root, o) => {
    const form = root.querySelector('[data-lf="' + o.id + '"]'); if (!form) return;
    const c = o.c; const st = K.st(o.id, c);
    const upd = (el) => {
      const k = el.dataset.f; if (!k) return;
      st.v[k] = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value; st.s[k] = 'u'; PSY.save();
      el.classList.remove('a', 'g'); el.classList.add('u'); const lb = el.closest('.lf-ck'); if (lb) lb.classList.remove('a');
      /* a blur caused by pressing a button elsewhere must not repaint that button away before its click lands */
      if (down) pending = true; else K.paintReview(root, o.id, c);
    };
    let down = false, pending = false;
    root.addEventListener('pointerdown', () => { down = true; }, true);
    root.addEventListener('pointerup', () => { down = false; if (pending) { pending = false; setTimeout(() => K.paintReview(root, o.id, c), 0); } }, true);
    /* typing in Lauris itself: the Scribe's "Matches Lauris" check follows (PSY.scribe.paintStatus) */
    const sync = () => { if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus(); };
    form.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.f) { upd(e.target); sync(); } });
    form.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.f && e.target.tagName !== 'SELECT' && e.target.type !== 'checkbox') { const k = e.target.dataset.f; st.v[k] = e.target.value; st.s[k] = 'u'; e.target.classList.remove('a', 'g'); e.target.classList.add('u'); sync(); } });
    form._lf = o;
    // register the "what Process Form does" for this page
    K._cur = o;
  };
  const formOf = (el) => { const f = el.closest('[data-lf]') || (PSY.activeRoot() && PSY.activeRoot().querySelector('[data-lf]')); return f; };
  const optOf = (el) => { const f = formOf(el); return f && f._lf; };

  /* ---------- fill (Scribe and Review) ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const typeInto = async (el, text, fast) => {
    const n = String(text).length; const step = Math.max(2, Math.ceil(n / (fast ? 8 : 46)));
    for (let i = 0; i <= n; i += step) { if (!el.isConnected) return; el.value = String(text).slice(0, Math.min(n, i)); if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight; await sleep(fast ? 10 : 14); }
    el.value = String(text);
  };
  const reveal = (root, el) => { const main = root.querySelector('.lz-main'); if (!main) return; const r = el.getBoundingClientRect(); const m = main.getBoundingClientRect(); if (r.top < m.top + 40 || r.bottom > m.bottom - 40) main.scrollTop += (r.top - m.top) - m.height / 2 + 30; };
  /* writes values { key: text } into the form on screen; resolves { filled, left }.
     opts: human (also clinical-decision boxes: Review recommendations only) · fast (the Scribe's Save to Lauris) · clear (an empty value empties the box) · progress(n, total) */
  K.fill = async (root, id, c, values, opts) => {
    opts = opts || {}; const form = root && root.querySelector('[data-lf="' + id + '"]'); if (!form) return { filled: 0, left: K.left(id, c) };
    const st = K.st(id, c); const F = K.fields(id); let filled = 0;
    const els = Array.from(form.querySelectorAll('[data-f]')).filter((e) => e.dataset.f in values);
    for (const el of els) {
      if (!form.isConnected) break;
      const k = el.dataset.f; const f = F.find((x) => x.key === k); if (f && f.it.human && !opts.human) continue;
      const v = values[k];
      if (isEmpty(v) && el.type !== 'checkbox') { if (opts.clear && !isEmpty(K.val(id, c, k))) { el.value = ''; el.classList.remove('a', 'g'); st.v[k] = ''; st.s[k] = 'u'; } continue; }
      reveal(root, el);
      if (el.type === 'checkbox') { el.checked = String(v) === '1'; el.closest('.lf-ck').classList.add('a'); await sleep(opts.fast ? 20 : 90); }
      else if (el.tagName === 'SELECT') { if (![...el.options].some((o) => o.value === v || o.text === v)) el.add(new Option(v, v)); el.value = v; el.classList.add('a'); await sleep(opts.fast ? 40 : 160); }
      else { el.classList.add('a'); await typeInto(el, v, opts.fast); }
      st.v[k] = String(v); st.s[k] = 'a'; filled++;
      if (opts.progress) opts.progress(filled, els.length);
    }
    PSY.save(); K.paintReview(root, id, c);
    return { filled, left: K.left(id, c) };
  };
  /* required boxes still empty (Lauris will not process them) */
  K.left = (id, c) => K.fields(id).filter((f) => f.it.req && !f.it.t.match(/checks/) && !(f.kind === 'dx' && !f.key.endsWith('.0')) && isEmpty(K.val(id, c, f.key))).map((f) => f.it.short || f.it.l.replace(/[:?]$/, '').replace(/\s*\(.*$/, '').replace(/,.*$/, ''));
  K.leftUnique = (id, c) => Array.from(new Set(K.left(id, c)));
  /* the same list as { k: the row to show in the form, label }, read through get(key) (the Scribe passes the values it captured) */
  K.leftItems = (id, c, get) => {
    get = get || ((k) => K.val(id, c, k)); const seen = {}; const out = [];
    K.fields(id).forEach((f) => {
      if (!f.it.req || /checks/.test(f.it.t) || (f.kind === 'dx' && !f.key.endsWith('.0')) || !isEmpty(get(f.key))) return;
      const label = f.it.short || f.it.l.replace(/[:?]$/, '').replace(/\s*\(.*$/, '').replace(/,.*$/, '');
      if (seen[label]) return; seen[label] = 1; out.push({ k: f.it.k, label });
    });
    return out;
  };

  /* plain text of everything in the form, in order (Preview Form) */
  K.exportText = (id, c) => {
    const F = K.forms[id]; const out = [F.title + ' · ' + c.ini + ' (Harvest # ' + c.id + ')', ''];
    F.items.forEach((it) => {
      if (it.h) { out.push('', it.h.toUpperCase()); return; }
      if (it.t === 'note' || it.t === 'sig') return;
      if (it.t === 'checks') { const on = it.opts.filter((o, i) => K.val(id, c, it.k + '.' + i) === '1'); if (on.length) out.push(it.l + ' ' + on.join(', ')); return; }
      if (it.t === 'dx') { const d = []; for (let i = 0; i < (it.n || 6); i++) { const v = K.val(id, c, it.k + '.' + i); if (v) d.push(v); } if (d.length) out.push(it.l + ': ' + d.join('; ')); return; }
      if (it.t === 'table') { const rs = []; it.rows.forEach((r, ri) => { const cells = it.cols.slice(1).map((cn, ci) => K.val(id, c, it.k + '.' + ri + '.' + (ci + 1))); if (cells.some((x) => x)) rs.push('  ' + r + ': ' + cells.map((x) => x || '—').join(' | ')); }); if (rs.length) out.push(it.l, ...rs); return; }
      const v = K.val(id, c, it.k); if (!isEmpty(v)) out.push(it.l.replace(/:$/, '') + (/[?]$/.test(it.l) ? ' ' : ': ') + v);
    });
    return out.join('\n');
  };

  /* ---------- round 8: the Review tab is gone (its recommendations are Scan & Enhance's, read from K.recDefs) ---------- */
  /* how complete the required boxes are */
  K.ready = (id, c) => {
    const req = K.fields(id).filter((f) => f.it.req && f.it.t !== 'checks' && !(f.kind === 'dx' && !f.key.endsWith('.0'))); if (!req.length) return 100;
    const done = req.filter((f) => !isEmpty(K.val(id, c, f.key))).length; return Math.round((100 * done) / req.length);
  };
  /* after every fill or edit: the "Fill the required boxes first" banner follows what is still empty, and so does the Scribe's "Matches Lauris" check */
  K.paintReview = (root, id, c) => {
    if (!root) return;
    const banner = root.querySelector('[data-psy="lf-banner"]');
    if (banner && !banner.hidden) { const left = K.leftUnique(id, c); if (left.length) banner.innerHTML = K.bannerText(left); else banner.hidden = true; }
    if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus();
  };
  const ctxOf = () => { const root = PSY.activeRoot(); const form = root && root.querySelector('[data-lf]'); return { root, id: form && form.dataset.lf, c: L.byId(form && form.dataset.cid) }; };
  PSY.acts['lf-fold'] = (el) => { const sec = el.nextElementSibling; if (sec && sec.classList.contains('lf-sec')) { sec.hidden = !sec.hidden; el.querySelector('.lf-chev').textContent = sec.hidden ? '⌄' : '⌃'; } };
  PSY.acts['lf-sig'] = () => PSY.ui.modal({ title: 'Signature pad', body: '<p>Sign on the Lauris signature pad.</p>', actions: [{ label: 'Close' }] });
  PSY.acts['lf-save'] = () => PSY.ui.toast('Saved.');
  PSY.acts['lf-calc'] = () => PSY.ui.toast('Calculated.');
  PSY.acts['lf-preview'] = (el) => {
    const { id, c } = ctxOf(el); const F = K.forms[id];
    PSY.ui.modal({ title: F.title + ' · preview', wide: true,
      body: '<div class="letter" style="position:relative;white-space:pre-wrap;font-family:Georgia,serif;max-height:56vh">' + esc(K.exportText(id, c)) + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font:700 64px Arial;color:rgba(0,0,0,.08);transform:rotate(-28deg)">PREVIEW ONLY</div></div>',
      actions: [{ label: 'Close' }] });
  };
  /* the refusal: one short line, then the names of the empty required boxes (data) */
  K.bannerText = (left) => '<b>Fill the required boxes first</b>: ' + left.map(esc).join(', ');
  /* Process Form: Lauris refuses while a required box is empty; otherwise it goes to the approver */
  PSY.acts['lf-process'] = (el) => {
    const o = optOf(el); if (!o) return; const root = PSY.activeRoot(); const { id, c } = { id: o.id, c: o.c };
    const left = K.leftUnique(id, c); const banner = root.querySelector('[data-psy="lf-banner"]');
    if (left.length) { banner.hidden = false; banner.innerHTML = K.bannerText(left); banner.scrollIntoView({ block: 'nearest' }); return; }
    banner.hidden = true;
    const st = K.st(id, c); st.processed = true; PSY.save();
    PSY.ui.toast('Processed.');
    const chip = root.querySelector('.lf-who'); if (chip && !chip.querySelector('.lf-chip')) chip.insertAdjacentHTML('beforeend', ' <span class="lf-chip">Processed · waiting for ' + esc(K.forms[id].approver || 'approval') + '</span>');
    if (o.onProcess) o.onProcess(root, c);
    if (PSY.scribe && PSY.scribe.paintStatus) PSY.scribe.paintStatus();
  };

  /* ---------- Scribe registration for a form (round 8: kind 'form'; the Scribe edits the captured values, then fills the boxes) ---------- */
  K.scribe = (route, id, o) => {
    const dc = o.defaultC || (o.pick && o.pick.defaultC) || '4492'; const child = (params) => K.child(params, dc);
    PSY.scribe.register(route, {
      type: o.type, kind: 'form', form: id, label: K.forms[id].title, child,
      lines: (params) => o.lines(child(params), params),
      extract: (params) => o.values(child(params)),
      left: (c, get) => (o.left ? o.left(c, get) : K.leftItems(id, c, get)),
    });
  };
})();
