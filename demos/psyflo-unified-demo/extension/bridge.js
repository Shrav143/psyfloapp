// Psyflo page bridge — the part of the extension that sits on the page the user has open.
// It reads that page and types into that page's open form, nothing else: no API, no background
// requests to Lauris, no clicking Process Form / Get Signature / Send (a person does those).
// It finds every box by its label text, never by position.
//
// Runs three ways, same code:
//   extension  — MV3 content script; the side panel talks to it through chrome.runtime
//   inpage     — loaded by the mock Lauris page when the extension is not installed; the panel is an
//                iframe in the page at 400px and talks to it with postMessage
//   portal     — on the mock Availity / UHC / state portal pages: reads the upload confirmation
(function () {
  if (window.__psyfloBridge) return; window.__psyfloBridge = true;
  const script = document.currentScript;
  const isExt = !script && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  const mode = isExt ? 'extension' : (script && script.dataset.mode) || 'inpage';
  let APP = (script && script.dataset.app) || 'http://localhost:4000';
  if (isExt) {
    document.documentElement.setAttribute('data-psyflo-extension', '1');
    try { chrome.storage?.local.get('appURL', v => { if (v && v.appURL) APP = v.appURL; }); } catch (e) { }
  }

  // hosted preview: the mock Lauris page is a srcdoc frame; its virtual address is window.__vloc (the real extension uses location)
  const loc = window.__vloc || location; const HOSTED = !!window.__vloc;
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const lc = s => norm(s).toLowerCase();

  const FORM_TITLES = {
    'admission screening': 'screening', 'comprehensive needs assessment': 'cna', 'individual service plan': 'isp',
    'daily progress note': 'dpn', 'weekly guardian': 'weekly', 'monthly collateral': 'collateral', 'quarterly report': 'quarterly',
    'incident report': 'incident', 'initial service authorization request': 'sra-initial', 'cmhrs continued stay': 'sra-continued', 'discharge summary': 'discharge'
  };
  const formFromTitle = t => { t = lc(t); for (const k in FORM_TITLES) if (t.includes(k)) return FORM_TITLES[k]; return null; };

  // ---------- reading ----------
  function fieldEls(root) {
    const out = []; const seen = new Set();
    root.querySelectorAll('label[for]').forEach(l => {
      const el = document.getElementById(l.getAttribute('for'));
      if (el && !seen.has(el)) { seen.add(el); out.push({ label: norm(l.textContent), el }); }
    });
    root.querySelectorAll('input[aria-label],select[aria-label],textarea[aria-label]').forEach(el => {
      if (!seen.has(el)) { seen.add(el); out.push({ label: norm(el.getAttribute('aria-label')), el }); }
    });
    return out;
  }
  function findField(label, root) {
    const all = fieldEls(root || document); const L = lc(label);
    return (all.find(f => lc(f.label) === L) || all.find(f => lc(f.label).startsWith(L)) || all.find(f => L.startsWith(lc(f.label)) && f.label.length > 8) || {}).el;
  }
  function valueOf(el) { return el.tagName === 'SELECT' ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : el.value; }

  function readPage() {
    const path = loc.pathname; const p = { url: loc.href, path, title: document.title, mode };
    const top = document.querySelector('.top .r'); if (top) p.user = norm((top.textContent || '').split('·')[0]);
    const fl = document.getElementById('lauris-flash');
    if (fl) p.flash = { text: norm(fl.textContent), event: fl.dataset.event, session: fl.dataset.session, form: fl.dataset.form, consumer: fl.dataset.consumer };
    const hdr = document.querySelector('.hdr');
    if (hdr) {
      const t = norm(hdr.textContent);
      p.consumer = { no: (t.match(/Harvest #\s*(\d+)/) || [])[1], initials: norm(hdr.querySelector('.nm') && hdr.querySelector('.nm').textContent), program: (t.match(/Program:\s*([A-Za-z]+)/) || [])[1] || '', units: norm(hdr.querySelector('.units') && hdr.querySelector('.units').textContent), sub: norm(hdr.querySelector('.sub') && hdr.querySelector('.sub').textContent) };
    }
    let m;
    if (document.getElementById('portal-confirmation')) { const c = document.getElementById('portal-confirmation'); p.kind = 'portal-confirmation'; p.portal = { ref: c.dataset.ref, request: c.dataset.request, kind: c.dataset.kind }; }
    else if (document.getElementById('portal-form')) p.kind = 'portal-form';
    else if (/\/login$/.test(path)) p.kind = 'login';
    else if (/\/consumers\/new$/.test(path)) p.kind = 'new-consumer';
    else if ((m = path.match(/\/consumers\/(\d+)\/session\/([\w-]+)$/))) p.kind = 'session';
    else if (/\/consumers\/\d+\/session$/.test(path) || path === '/add-session') p.kind = 'pick-form';
    else if (/\/consumers\/\d+\/surveys$/.test(path)) p.kind = 'surveys';
    else if (/\/consumers\/\d+$/.test(path)) p.kind = 'record';
    else if (/^\/(consumers)?$/.test(path)) p.kind = 'consumers';
    else if (/\/approvals\/\d+$/.test(path)) p.kind = 'approval';
    else if (/\/approvals$/.test(path)) p.kind = 'approvals';
    else if (/\/saved$/.test(path)) p.kind = 'saved';
    else if (/\/rejected$/.test(path)) p.kind = 'rejected';
    else p.kind = 'other';
    const form = document.getElementById('lauris-form');
    if (form && p.kind === 'session') {
      const title = norm((document.getElementById('session-form-title') || {}).textContent);
      p.form = { type: formFromTitle(title) || form.dataset.form, title, session: form.dataset.session || null,
        fields: fieldEls(form).map(({ label, el }) => ({ label, value: valueOf(el), green: el.classList.contains('g'), yellow: el.dataset.psyflo === 'typed', tag: el.tagName.toLowerCase(), options: el.tagName === 'SELECT' ? [...el.options].map(o => o.text) : undefined })) };
    }
    if (p.kind === 'new-consumer' && form) p.form = { type: 'new-consumer', fields: fieldEls(form).map(({ label, el }) => ({ label, value: valueOf(el), tag: el.tagName.toLowerCase(), options: el.tagName === 'SELECT' ? [...el.options].map(o => o.text) : undefined })) };
    if (p.kind === 'surveys' && form) p.form = { type: 'survey', instrument: form.dataset.instrument, fields: fieldEls(form).map(({ label, el }) => ({ label, value: valueOf(el) })) };
    const list = document.getElementById('consumer-list');
    if (list) p.consumers = [...list.querySelectorAll('tr[data-consumer]')].map(tr => { const td = tr.querySelectorAll('td'); return { no: tr.dataset.consumer, program: tr.dataset.program, initials: norm(td[1] && td[1].textContent), staff: norm(td[2] && td[2].textContent), group: norm(td[3] && td[3].textContent), updated: norm(td[4] && td[4].textContent), units: norm(td[5] && td[5].textContent) }; });
    const al = document.getElementById('approval-list');
    if (al) p.approvals = [...al.querySelectorAll('tr[data-session]')].map(tr => { const td = tr.querySelectorAll('td'); return { session: tr.dataset.session, form: tr.dataset.form, consumer: tr.dataset.consumer, initials: norm(td[1] && td[1].textContent), title: norm(td[2] && td[2].textContent), href: (tr.querySelector('a') || {}).href }; });
    const pv = document.getElementById('lauris-preview');
    if (pv) {
      p.preview = { session: pv.dataset.session, form: formFromTitle(norm((pv.querySelector('h3') || {}).textContent)) || pv.dataset.form, title: norm((pv.querySelector('h3') || {}).textContent), signed: /SIGNED/.test(norm((pv.querySelector('.wm') || {}).textContent)),
        rows: [...pv.querySelectorAll('.row')].map(r => ({ label: norm((r.querySelector('b') || {}).textContent), value: norm((r.querySelector('div') || {}).textContent) })), status: norm((document.getElementById('approval-status') || {}).textContent) };
      p.canSign = !!document.getElementById('get-signature');
    }
    const counts = {}; document.querySelectorAll('.side .lnav').forEach(a => { const b = a.querySelector('.b'); if (b) counts[norm(a.childNodes[0].textContent)] = +b.textContent; }); p.counts = counts;
    return p;
  }

  // ---------- typing into the open form ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function setNative(el, v) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  }
  function markTyped(el) { el.classList.remove('g'); el.classList.add('y'); el.dataset.psyflo = 'typed'; }
  async function typeInto(el, value, animate) {
    el.scrollIntoView({ block: 'center', behavior: animate ? 'smooth' : 'auto' });
    if (el.tagName === 'SELECT') {
      const opts = [...el.options]; const V = lc(value);
      const o = opts.find(o => lc(o.text) === V) || opts.find(o => V && lc(o.text).startsWith(V)) || opts.find(o => o.text && V.startsWith(lc(o.text)));
      if (!o) return false;
      el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })); markTyped(el); return true;
    }
    markTyped(el);
    if (animate) {
      const steps = Math.min(24, Math.max(4, Math.ceil(value.length / 12)));
      for (let i = 1; i <= steps; i++) { setNative(el, value.slice(0, Math.ceil(value.length * i / steps))); el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(14); }
    } else { setNative(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  async function fill(fields, opts) {
    opts = opts || {}; const form = document.getElementById('lauris-form'); if (!form) return { filled: [], missing: fields.map(f => f.label), error: 'No open form on this page' };
    const filled = [], missing = [];
    for (const f of fields) {
      const el = findField(f.label, form);
      if (!el || !(await typeInto(el, String(f.value ?? ''), opts.animate !== false))) { missing.push(f.label); continue; }
      filled.push(f.label);
      if (opts.animate !== false) await sleep(opts.gap ?? 90);
    }
    return { filled, missing };
  }
  function focusField(label) {
    const el = findField(label); if (!el) return { ok: false };
    document.querySelectorAll('[data-psyflo-focus]').forEach(x => { x.style.outline = ''; delete x.dataset.psyfloFocus; });
    el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.style.outline = '3px solid #217A78'; el.dataset.psyfloFocus = '1'; el.focus();
    return { ok: true };
  }
  function mark(labels) { const form = document.getElementById('lauris-form'); if (!form) return {}; (labels || []).forEach(l => { const el = findField(l, form); if (el && valueOf(el)) markTyped(el); }); return {}; }

  // ---------- events the extension listens for (Process Form, Get Signature, Reject) ----------
  // The submit is the person's click. We remember what the form held so that when Lauris confirms
  // the save on the next page, Psyflo's tracker records what was processed.
  document.addEventListener('submit', e => {
    const form = e.target; if (!form || form.id !== 'lauris-form') return;
    const act = e.submitter && e.submitter.value;
    const pg = readPage();
    const values = {}; fieldEls(form).forEach(({ label, el }) => { const v = valueOf(el); if (v) values[label] = v; });
    const typed = fieldEls(form).filter(f => f.el.dataset.psyflo === 'typed').map(f => f.label);
    try { sessionStorage.setItem('psyflo_pending', JSON.stringify({ action: act || 'save', form: pg.form ? pg.form.type : form.dataset.form, consumer: pg.consumer, values, typed, at: Date.now() })); } catch (err) { }
  }, true);

  async function report(action, args) {
    try { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }); return await r.json(); } catch (e) { return { ok: false, error: String(e) }; }
  }

  async function observe() {
    const p = readPage();
    let pending = null; try { pending = JSON.parse(sessionStorage.getItem('psyflo_pending') || 'null'); } catch (e) { }
    let event = null;
    if (p.flash && ['processed', 'signed', 'rejected', 'saved', 'created', 'authorization'].includes(p.flash.event)) {
      event = { event: p.flash.event, session: p.flash.session, form: p.flash.form || (pending && pending.form), consumer: Object.assign({ no: p.flash.consumer }, p.consumer || {}), values: pending ? pending.values : null, typed: pending ? pending.typed : null, preview: p.preview || null, user: p.user };
      if (p.flash.event === 'created' && pending) event.values = pending.values;
      try { sessionStorage.removeItem('psyflo_pending'); } catch (e) { }
      const r = await report('lauris.observed', event); event.result = r && r.result;
      // Save Form Data / Process Form: keep what the person actually saved (after any edits) as Psyflo's saved version
      if (pending && pending.values && ['saved', 'processed'].includes(p.flash.event) && event.form) {
        const sv = await report('lauris.savedVersion', { event: p.flash.event, form: event.form, session: p.flash.session, consumer: event.consumer, values: pending.values, typed: pending.typed, user: p.user });
        event.saved = sv && sv.result;
      }
    }
    if (p.kind === 'portal-confirmation' && p.portal && p.portal.ref) {
      const key = 'psyflo_portal_' + p.portal.ref;
      if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); event = { event: 'portal', portal: p.portal }; event.result = (await report('portal.observed', p.portal)).result; }
    }
    return { page: p, event };
  }

  // ---------- transport ----------
  async function handle(msg) {
    switch (msg.cmd) {
      case 'read': return readPage();
      case 'hello': last = ''; return { page: readPage(), event: lastEvent };
      case 'fill': return fill(msg.fields || [], msg.opts);
      case 'focus': return focusField(msg.label);
      case 'mark': return mark(msg.labels);
      case 'navigate': if (/^\//.test(msg.url) || msg.url.startsWith(loc.origin)) { if (HOSTED && window.__vgo) window.__vgo(msg.url); else location.href = msg.url; } return { ok: true };
      default: return { error: 'unknown command' };
    }
  }

  let push = () => { };
  if (mode === 'extension') {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { if (!msg || msg.psyflo !== 'panel') return; handle(msg).then(sendResponse); return true; });
    push = m => { try { chrome.runtime.sendMessage(Object.assign({ psyflo: 'bridge' }, m)); } catch (e) { } };
  } else if (mode === 'inpage') {
    const appOrigin = HOSTED ? '*' : new URL(APP).origin; let panelReady = false;   // hosted: srcdoc frames have opaque origins, so match the panel frame itself
    window.addEventListener('message', e => {
      if (!e.data || e.data.psyflo !== 'panel') return;
      if (HOSTED ? !(document.getElementById('psyflo-frame') && e.source === document.getElementById('psyflo-frame').contentWindow) : e.origin !== appOrigin) return;
      panelReady = true;
      handle(e.data).then(result => e.source.postMessage({ psyflo: 'bridge', id: e.data.id, result }, appOrigin));
    });
    push = m => { const f = document.getElementById('psyflo-frame'); if (panelReady && f && f.contentWindow) f.contentWindow.postMessage(Object.assign({ psyflo: 'bridge' }, m), appOrigin); };
  }

  let last = ''; let lastEvent = null;
  function announce(extra) {
    const page = readPage(); const sig = JSON.stringify(page);
    if (sig === last && !extra) return; last = sig;
    push(Object.assign({ type: 'page', page }, extra || {}));
  }
  function start() {
    observe().then(r => { lastEvent = r.event; announce(r.event ? { event: r.event } : null); });
    let t; const deb = () => { clearTimeout(t); t = setTimeout(() => announce(), 250); };
    document.addEventListener('input', deb, true); document.addEventListener('change', deb, true);
    // the panel iframe may load after us: answer its hello
    if (mode === 'inpage') window.addEventListener('message', e => { if (e.data && e.data.psyflo === 'panel' && e.data.cmd === 'hello') { last = ''; announce(lastEvent ? { event: lastEvent } : null); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.psyfloBridge = { readPage, fill, focusField, mode };
})();
