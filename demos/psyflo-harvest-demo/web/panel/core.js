// Panel core: page state, transport to the page bridge, drawing, typing into the open form, recording, presenter commands.
// The panel reads the page the user has open and types into its open form only when the user presses a button.
// It never presses Process Form, Get Signature or Send.
import { api } from '../js/api.js';
import * as M from '../js/shared/model.js';
import { esc, boxRow, boxList, frame } from './ui.js';

export { api, M, esc };
export const root = document.getElementById('panel');
export const P = { page: null, event: null, ui: {}, rec: null, logo: '' };
export const framed = window.parent !== window;
export const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
export const S = () => api.state;
export const ACT = {};          // data-act="name" -> ACT[name](element)
export const PRESENT = {};      // presenter commands: example, script
export const hooks = { onPage: null, view: null };

export const FORM_NAME = { screening: 'Admission screening', cna: 'Intake (CNA)', isp: 'Treatment plan', dpn: 'Daily note', weekly: 'Weekly call', collateral: 'Monthly collateral', quarterly: 'Quarterly report', incident: 'Incident report', 'sra-initial': 'Initial request', 'sra-continued': 'Continued stay', discharge: 'Discharge summary' };

// ---------------------------------------------------------------- transport to the page bridge
let seq = 0; const waiting = new Map();
export function send(msg) { if (framed) window.parent.postMessage(Object.assign({ psyflo: 'panel' }, msg), '*'); }
export function call(cmd, args = {}) {
  return new Promise(res => { const id = ++seq; waiting.set(id, res); send(Object.assign({ cmd, id }, args)); setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res({ error: 'The Lauris page did not answer' }); } }, 20000); });
}
window.addEventListener('message', e => {
  const d = e.data; if (!d) return;
  if (d.psyflo === 'present') { const fn = PRESENT[d.cmd]; if (fn) Promise.resolve(fn()).catch(err => flash(err.message || String(err), 'r')); return; } // from the presenter menu, any frame
  if (e.source !== window.parent || d.psyflo !== 'bridge') return;
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d.result); waiting.delete(d.id); return; }
  if (d.type === 'page') hooks.onPage(d.page, d.event);
});

// ---------------------------------------------------------------- who and which student
export function meFromPage() {
  const u = P.page?.user || ''; const st = S().staff;
  return st.find(x => u && (u.startsWith(x.name) || u.startsWith(x.name.replace(/^(\w)\w+ /, '$1. ')))) || st.find(x => x.id === 'jperez');
}
export const myLevel = () => LEVEL[meFromPage().role];
export function clientForPage() {
  const c = P.page?.consumer; if (!c) return null;
  const no = Number(c.no);
  return S().clients.find(x => no && (x.lauris_no === no || x.harvest_no === no)) || S().clients.find(x => x.initials === c.initials) || null;
}
// the Harvest # a student has in Lauris. T.W. exists in the mock Lauris only after a person creates him (live preset).
export function laurisNo(c) { if (!c) return null; return c.id === 'TW' ? (c.lauris_no || null) : (c.lauris_no || c.harvest_no || null); }
export const usDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
export const appURL = path => location.origin + '/' + path;

// where a Worklist row opens: a Lauris page (Ext screens) or a Psyflo app screen
export function targetFor(href) {
  const [file, qs = ''] = String(href).split('?'); const q = new URLSearchParams(qs); const id = file.replace('.dc.html', ''); const s = S();
  const cl = cid => s.clients.find(x => x.id === cid);
  const page = (c, form, ref) => { const n = laurisNo(c); return { lauris: n ? `/consumers/${n}/session/${form}` : `/consumers/new${ref ? '?referral=' + ref : ''}` }; };
  if (id === 'ExtScreening') { const r = s.referrals.find(x => x.id === q.get('referral')); return page(cl(r?.client), 'screening', r?.id); }
  if (id === 'ExtSRA') return page(cl(q.get('client')), 'sra-initial', cl(q.get('client'))?.referral);
  if (id === 'ExtCase') return page(cl(q.get('client')), 'sra-continued');
  if (id === 'ExtSignOff') return { lauris: '/approvals' };
  if (id.startsWith('Ext')) return { lauris: '/consumers' };
  return { app: '#/' + id + (qs ? '?' + qs : '') };
}

// ---------------------------------------------------------------- drawing
let drawing = false;
export function draw() {
  if (drawing) return; drawing = true;
  requestAnimationFrame(() => {
    drawing = false;
    const y = root.scrollTop; const se = document.scrollingElement; const wy = se ? se.scrollTop : 0;
    const ae = document.activeElement; const fkey = ae && root.contains(ae) ? (ae.getAttribute('aria-label') || ae.dataset.in || ae.dataset.ch) : null;
    const sel = fkey && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
    try { root.innerHTML = hooks.view(); } catch (e) { console.error(e); root.innerHTML = frame({ logo: P.logo, form: 'Psyflo', legend: false, body: `<pre class="small" style="white-space:pre-wrap">${esc(e.stack || e)}</pre>` }); }
    if (!document.querySelector('.hlp[aria-expanded="true"]')) document.querySelectorAll('.tip').forEach(n => n.remove());
    if (P.after) { try { P.after(root); } catch (e) { console.error(e); } P.after = null; }
    root.scrollTop = y; if (se) se.scrollTop = wy;
    if (fkey) { const el = root.querySelector(`[aria-label="${CSS.escape(fkey)}"],[data-in="${CSS.escape(fkey)}"],[data-ch="${CSS.escape(fkey)}"]`); if (el) { el.focus(); if (sel) try { el.setSelectionRange(...sel); } catch (e) { } } }
  });
}
export function flash(msg, kind = 'g') { P.ui.flash = { msg, kind }; draw(); setTimeout(() => { if (P.ui.flash && P.ui.flash.msg === msg) { P.ui.flash = null; draw(); } }, 6000); }

// event delegation: data-act / data-in / data-ch
root.addEventListener('click', e => {
  if (!e.target.closest('.mn') && P.ui.menu) { P.ui.menu = null; draw(); }
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  e.preventDefault(); const fn = ACT[el.dataset.act]; if (fn) Promise.resolve(fn(el)).catch(err => flash(err.message || String(err), 'r'));
});
root.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && ACT[el.dataset.in]) ACT[el.dataset.in](el); });
root.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && ACT[el.dataset.ch]) ACT[el.dataset.ch](el); });
root.addEventListener('keydown', e => { if (e.key === 'Escape' && P.ui.menu) { P.ui.menu = null; draw(); } });

export const nav = path => call('navigate', { url: path });
ACT.nav = el => nav(el.dataset.href);
ACT.openApp = el => window.open(appURL(el.dataset.href), '_blank', 'noopener');
ACT.go = el => { const t = targetFor(el.dataset.href); return t.lauris ? nav(t.lauris) : window.open(appURL(t.app), '_blank', 'noopener'); };
ACT.menuOpen = el => { P.ui.menu = P.ui.menu === el.dataset.id ? null : el.dataset.id; draw(); };
ACT.checksToggle = () => { P.ui.checksOpen = !P.ui.checksOpen; draw(); };

// ---------------------------------------------------------------- typing into the open form
export async function fillBoxes(boxes, { form, client, sources, animate = true } = {}) {
  P.ui.filling = true; draw();
  const r = await call('fill', { fields: boxes.map(b => ({ label: b.label, value: b.value })), opts: { animate } });
  P.ui.filling = false;
  if (r.error) { flash(r.error, 'r'); return r; }
  P.ui.filled = (P.ui.filled || []).concat(r.filled || []);
  const done = boxes.filter(b => (r.filled || []).includes(b.label));
  if (done.length && client) api.do('panel.filled', { client: client.id, form, boxes: done, sources }).catch(() => { });
  const n = new Set(done.map(b => b.row || b.label)).size;
  flash(`${n} box${n === 1 ? '' : 'es'} typed${r.missing?.length ? ` · not on this form: ${r.missing.join(', ')}` : ''}`, r.missing?.length ? 'y' : 'g');
  return r;
}

// ---------------------------------------------------------------- boxes list (shared by every drafted view)
const SHORT = {
  'Prior / current services (provider · dates · outcome)': 'Prior services', 'Prior services (provider · dates · outcome)': 'Prior services', 'School coordination to date': 'School coordination',
  'Presenting issue / reason for referral': 'Presenting issue', 'Medical · medications · prescriber': 'Medical', 'Medical · medications': 'Medical', 'Strengths and resources': 'Strengths',
  'Request dates / units / hours': 'Request', 'Section I · criterion 1 — interpersonal relationships': 'Criterion 1', 'Section I · criterion 2 — interventions that have not worked': 'Criterion 2',
  'Section I · criterion 3 — recognise danger to self or others': 'Criterion 3', 'Section III · trauma-informed care': 'Trauma-informed care',
  'Progress toward goals': 'Progress', 'Continued need / risk': 'Continued need', 'Information shared / received': 'Shared / received', 'Attendance / school functioning': 'School functioning',
  'Narrative summary': 'Summary', 'Guardian on the call': 'Guardian', 'Meets admission criteria?': 'Admission decision', 'Preliminary diagnosis': 'Diagnosis'
};
export function shortLabel(l) { return SHORT[l] || String(l).replace(/^Section \w+ · /, '').split(' — ')[0].replace(/ \(.*$/, ''); }
export const editedValue = (form, label) => P.ui.edits?.[form]?.[label];
export const withEdits = (form, boxes) => boxes.map(b => { const v = editedValue(form, b.label); return v != null ? { ...b, value: v } : b; });
// display item for a draft box: yellow once Psyflo typed it, green when Lauris already had it, else drafted (white)
export function asItem(form, b, extra = {}) {
  const filled = new Set(P.ui.filled || []); const ed = editedValue(form, b.label);
  return { k: b.label, label: b.label, short: shortLabel(b.label), value: ed != null ? ed : b.value, src: b.src, state: b.green ? 'g' : filled.has(b.label) ? 'y' : '', edited: ed != null, ...extra };
}
export function renderBoxes(form, items, sources, opts = {}) {
  return boxList(items.map(b => boxRow(b, { form, sources, open: !!P.ui.open?.[form + ':' + b.k], edited: b.edited, cur: opts.cur === b.k })));
}
ACT.boxOpen = el => { P.ui.open = P.ui.open || {}; const k = el.dataset.f + ':' + el.dataset.k; P.ui.open[k] = !P.ui.open[k]; draw(); };
ACT.boxEdit = el => { const f = el.dataset.f; P.ui.edits = P.ui.edits || {}; (P.ui.edits[f] = P.ui.edits[f] || {})[el.dataset.k] = el.value; };
ACT.boxReset = el => { const f = el.dataset.f; if (P.ui.edits?.[f]) delete P.ui.edits[f][el.dataset.k]; draw(); };

// ---------------------------------------------------------------- recording (microphone via the browser's speech recognition)
export const hasSpeech = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
// kind 'sc' = screening call; otherwise the say-it box ('dpn', 'incident')
export function micStart(kind) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { flash(kind === 'sc' ? 'No speech recognition here · use the example' : 'No speech recognition here · type it', 'y'); return; }
  startRecording('mic', kind);
  const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
  rec.onresult = e => { let fin = '', inter = ''; for (let k = e.resultIndex; k < e.results.length; k++) { const t = e.results[k][0].transcript; if (e.results[k].isFinal) fin += t.trim() + '\n'; else inter += t; } if (fin) P.ui.transcript = (P.ui.transcript || '') + fin; P.ui.interim = inter; draw(); };
  rec.onerror = ev => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return;
    const blocked = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(ev.error);
    if (blocked && P.rec && P.rec.sr === rec) { stopRecording(true); if (kind === 'sc') P.ui.sc = 'ready'; P.ui.recKind = null; }
    flash('Microphone: ' + ev.error + (ev.error === 'not-allowed' ? ' · allow it for this page' : ''), 'y');
  };
  rec.onend = () => { if (P.rec && P.rec.sr === rec) try { rec.start(); } catch (e) { } };
  P.rec.sr = rec; try { rec.start(); } catch (e) { flash(String(e), 'r'); }
}
export function startRecording(mode, kind = 'sc') {
  stopRecording(true); if (kind === 'sc') P.ui.sc = 'rec'; P.ui.recKind = kind; P.ui.recMode = mode; P.ui.recStart = Date.now(); P.ui.transcript = ''; P.ui.interim = '';
  P.rec = { tick: setInterval(() => root.querySelectorAll('[data-timer]').forEach(n => { const s = Math.floor((Date.now() - P.ui.recStart) / 1000); n.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }), 1000) };
  draw();
}
export function stopRecording(silent) { if (!P.rec) return; clearInterval(P.rec.timer); clearInterval(P.rec.tick); try { P.rec.sr && P.rec.sr.stop(); } catch (e) { } P.rec = null; if (!silent) draw(); }
export const recSeconds = () => Math.floor((Date.now() - (P.ui.recStart || Date.now())) / 1000);

// ---------------------------------------------------------------- Fill all / one at a time (generic: each view sets P.cur while it renders)
export function setCur(form, client, sources, boxes, done) { P.cur = { form, client, sources, boxes, done }; }
ACT.fillAll = async () => { const k = P.cur; if (!k) return; await fillBoxes(k.boxes, { form: k.form, client: k.client, sources: k.sources }); if (k.done) k.done(); draw(); };
ACT.oneStart = () => { P.ui.one = 0; draw(); const b = P.cur?.boxes[0]; if (b) call('focus', { label: b.label }); };
ACT.oneType = async () => { const k = P.cur; const b = k?.boxes[P.ui.one]; if (!b) return; await fillBoxes([b], { form: k.form, client: k.client, sources: k.sources }); P.ui.one++; const n = k.boxes[P.ui.one]; if (n) call('focus', { label: n.label }); draw(); };
ACT.oneSkip = () => { P.ui.one++; const n = P.cur?.boxes[P.ui.one]; if (n) call('focus', { label: n.label }); draw(); };
ACT.oneClose = () => { P.ui.one = null; draw(); };
// the one-at-a-time stepper that takes over the state card's buttons
export function oneStep(boxes) {
  const b = boxes[P.ui.one];
  if (!b) return `<div class="stat ok">${'✓'} Last box typed</div><div class="row">${'<button type="button" class="btn o f" data-act="oneClose">Done</button>'}</div>`;
  return `<div class="t">Box ${P.ui.one + 1} of ${boxes.length}<span class="sp"></span><span class="muted small" data-doc>${esc(b.label)}</span></div><div class="row"><button type="button" class="btn p f" data-act="oneType">Type this one</button><button type="button" class="btn t" data-act="oneSkip">Skip</button><button type="button" class="btn t" data-act="oneClose">Close</button></div>`;
}
