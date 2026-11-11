// The Psyflo extension panel. Same code in the MV3 side panel and in the mock Lauris in-page fallback:
// it talks to the page bridge with postMessage (the side panel relays to the content script).
// It reads the page the user has open, drafts from Psyflo's own records, and types into the open form
// only when the user presses a button. It never presses Process Form, Get Signature or Send.
import { api } from '../js/api.js';
import { loadScreen, render, esc, paint } from '../js/runtime.js';
import * as M from '../js/shared/model.js';
import { draftScreening, screeningFacts, screeningPrompts, enhanceDictation, contactTime, draftInitialSRA, draftSeeded } from '../js/shared/draft.js';
import { fmtDate, fmtTime, daysBetween, fmtDuration } from '../js/shared/dates.js';

const root = document.getElementById('panel');
const P = { page: null, event: null, ui: {}, rec: null, logo: '' };
const FORM_NAME = { screening: 'Admission screening', cna: 'Intake (CNA)', isp: 'Treatment plan (ISP)', dpn: 'Daily note', weekly: 'Weekly guardian call', collateral: 'Monthly collateral', quarterly: 'Quarterly report', incident: 'Incident report', 'sra-initial': 'Initial request (SRA)', 'sra-continued': 'Continued stay', discharge: 'Discharge summary' };
const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
// what direct support records from the extension (product review, Nov 2026); the timer is optional
const DS_TASKS = [['dpn', 'Daily note'], ['weekly', 'Weekly guardian call'], ['collateral', 'Monthly collateral call'], ['incident', 'Incident report']];
const CLIN_FORMS = ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'];

// ---------------------------------------------------------------- transport to the page bridge
let seq = 0; const waiting = new Map();
const framed = window.parent !== window;
function send(msg) { if (framed) window.parent.postMessage(Object.assign({ psyflo: 'panel' }, msg), '*'); }
function call(cmd, args = {}) {
  return new Promise(res => { const id = ++seq; waiting.set(id, res); send(Object.assign({ cmd, id }, args)); setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res({ error: 'The Lauris page did not answer' }); } }, 20000); });
}
window.addEventListener('message', e => {
  if (e.source !== window.parent) return;
  const d = e.data; if (!d || d.psyflo !== 'bridge') return;
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d.result); waiting.delete(d.id); return; }
  if (d.type === 'page') onPage(d.page, d.event);
});

function onPage(page, event) {
  const changedPage = !P.page || P.page.url !== page.url;
  P.page = page;
  if (event) P.event = event; else if (changedPage) P.event = null;
  if (changedPage) { P.ui = {}; stopRecording(true); }
  draw();
  autoActions();
}

// ---------------------------------------------------------------- helpers
const S = () => api.state;
const I = {
  ok: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#217A78" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>',
  warn: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F4A05" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>',
  no: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A2E1C" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>',
  open: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#525B66" stroke-width="2.2"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle></svg>',
  mic: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0014 0M12 18v3"></path></svg>',
  clock: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  spark: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"></path></svg>',
  doc: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path></svg>'
};
const chk = c => `<div class="ck">${c.pass ? I.ok : I.no}<div><b>${esc(c.rule)}</b>${c.detail ? ' — ' + esc(c.detail) : ''}${c.fixed ? ` <span class="fx">fixed: ${esc(c.fixed)}</span>` : ''}</div></div>`;
const checksBlock = (checks, title = 'Checked before you process') => `<div><div class="lab" style="margin-bottom:2px">${title} · ${checks.filter(c => c.pass).length} of ${checks.length} pass</div>${checks.map(chk).join('')}</div>`;
const srcChips = (box, sources) => (box.src || []).map(n => { const s = sources.find(x => x.n === n); return `<span class="src" title="${esc(s ? s.label : '')}">${n} · ${esc(s ? s.label.split('·')[0].trim() : 'source')}${s && s.date ? ' · ' + fmtDate(s.date) : ''}</span>`; }).join('');
const appURL = path => location.origin + '/' + path;
const lauris = p => P.page ? new URL(P.page.url).origin + p : p;

function meFromPage() {
  const u = P.page?.user || ''; const st = S().staff;
  return st.find(x => u && (u.startsWith(x.name) || u.startsWith(x.name.replace(/^(\w)\w+ /, '$1. ')))) || st.find(x => x.id === 'jperez');
}
function clientForPage() {
  const c = P.page?.consumer; if (!c) return null;
  const no = Number(c.no);
  return S().clients.find(x => no && (x.lauris_no === no || x.harvest_no === no)) || S().clients.find(x => x.initials === c.initials) || null;
}

function header(mode, legend = true) {
  return `<div class="ph"><span class="logo">${P.logo}</span><div class="pt">${esc(mode)}</div></div>${legend ? '<div class="legend"><span>green · already in Lauris</span><span>yellow · Psyflo typed — check it</span></div>' : ''}`;
}
const foot = () => `<div class="foot"><i></i>Demo data · nothing is real · reads only the page you have open</div>`;

// event delegation: data-act="name" → ACT[name](el)
const ACT = {};
root.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  e.preventDefault(); const fn = ACT[el.dataset.act]; if (fn) Promise.resolve(fn(el)).catch(err => flash(err.message || String(err), 'r'));
});
root.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && ACT[el.dataset.in]) ACT[el.dataset.in](el); });
root.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && ACT[el.dataset.ch]) ACT[el.dataset.ch](el); });
function flash(msg, kind = 'g') { P.ui.flash = { msg, kind }; draw(); setTimeout(() => { if (P.ui.flash && P.ui.flash.msg === msg) { P.ui.flash = null; draw(); } }, 6000); }
const flashHTML = () => P.ui.flash ? `<div class="banner ${P.ui.flash.kind === 'r' ? 'r' : P.ui.flash.kind === 'y' ? 'y' : ''}" role="status">${P.ui.flash.kind === 'r' ? I.no : I.ok}<div>${esc(P.ui.flash.msg)}</div></div>` : '';
const nav = path => call('navigate', { url: path });
ACT.nav = el => nav(el.dataset.href);
ACT.openApp = el => window.open(appURL(el.dataset.href), '_blank', 'noopener');

async function fillBoxes(boxes, { form, client, sources, animate = true } = {}) {
  P.ui.filling = true; draw();
  const r = await call('fill', { fields: boxes.map(b => ({ label: b.label, value: b.value })), opts: { animate } });
  P.ui.filling = false;
  if (r.error) { flash(r.error, 'r'); return r; }
  P.ui.filled = (P.ui.filled || []).concat(r.filled || []);
  const done = boxes.filter(b => (r.filled || []).includes(b.label));
  if (done.length && client) api.do('panel.filled', { client: client.id, form, boxes: done, sources }).catch(() => { });
  flash(`${new Set(done.map(b => b.row || b.label)).size} box${done.length === 1 ? '' : 'es'} typed into the form · yellow · check them, then press ${form === 'new-consumer' ? 'Save Consumer' : form === 'survey' ? 'Save Survey' : 'Process Form'}${r.missing?.length ? ` · not found on this form: ${r.missing.join(', ')}` : ''}`, r.missing?.length ? 'y' : 'g');
  return r;
}

// ---------------------------------------------------------------- drawing
let drawing = false;
function draw() {
  if (drawing) return; drawing = true;
  requestAnimationFrame(() => {
    drawing = false;
    const y = root.scrollTop; const se = document.scrollingElement; const wy = se ? se.scrollTop : 0;
    const ae = document.activeElement; const fkey = ae && root.contains(ae) ? (ae.getAttribute('aria-label') || ae.dataset.in || ae.dataset.ch) : null;
    const sel = fkey && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
    try { root.innerHTML = viewHTML(); } catch (e) { console.error(e); root.innerHTML = header('Psyflo') + `<div class="body"><pre style="white-space:pre-wrap;color:#8A2E1C">${esc(e.stack || e)}</pre></div>`; }
    if (P.after) { try { P.after(root); } catch (e) { console.error(e); } P.after = null; }
    root.scrollTop = y; if (se) se.scrollTop = wy;
    if (fkey) { const el = root.querySelector(`[aria-label="${CSS.escape(fkey)}"],[data-in="${CSS.escape(fkey)}"],[data-ch="${CSS.escape(fkey)}"]`); if (el) { el.focus(); if (sel) try { el.setSelectionRange(...sel); } catch (e) { } } }
  });
}

function viewHTML() {
  if (!api.state) return header('Psyflo', false) + '<div class="body">Loading…</div>';
  if (!framed) return header('Psyflo · extension panel', false) + `<div class="body"><p>This is the Psyflo panel. It runs beside a Lauris page: open the mock Lauris (${esc(api.config.laurisURL)}) — the panel appears at the right — or install the extension from <code>extension/</code> and open its side panel.</p><a class="btn p" href="${esc(api.config.laurisURL)}/login?as=jperez">Open the mock Lauris</a></div>`;
  const p = P.page;
  if (!p) return header('Psyflo · reading this page', false) + `<div class="body"><div class="banner n">${I.open}<div>Waiting for the page… If this stays, reload the Lauris tab.</div></div></div>`;
  if (p.kind === 'portal-form' || p.kind === 'portal-confirmation') return portalView();
  if (p.kind === 'login') return header('Psyflo · not signed in', false) + `<div class="body"><div class="banner n">${I.open}<div><b>Sign in to Lauris.</b> Psyflo reads only the page you have open and types only into a form you have open. It never signs in for you.</div></div></div>` + foot();
  const c = clientForPage();
  if (p.consumer && p.consumer.program && p.consumer.program !== 'TDT') return offView(p.consumer);
  switch (p.kind) {
    case 'consumers': return homeView();
    case 'new-consumer': return newConsumerView();
    case 'session': return formView(p.form?.type, c);
    case 'approvals': case 'approval': return signoffView(c);
    case 'record': case 'pick-form': case 'surveys': return recordView(c);
    case 'saved': case 'rejected': return listView();
    default: return homeView();
  }
}

function offView(consumer) {
  return header('Psyflo · off for this record', false) + `<div class="body"><div class="banner n">${I.open}<div><b>Psyflo is off for ${esc(consumer.initials)}.</b> This record is in ${esc(consumer.program)}. The extension works with TDT consumers only; it reads and types nothing here.</div></div></div>` + foot();
}

function portalView() {
  const p = P.page;
  if (p.kind === 'portal-confirmation') {
    const r = P.event?.result?.request;
    return header('Psyflo · portal upload', false) + `<div class="body"><div class="banner">${I.ok}<div><b>Confirmation ${esc(p.portal.ref)} read from this page.</b> ${r ? 'Logged on ' + esc(r) + ' · decision clock started.' : 'No open send was waiting for it.'}</div></div>${r ? `<a class="btn o" data-act="openApp" data-href="#/Submission?id=${esc(r)}">See it in Psyflo ↗</a>` : ''}</div>` + foot();
  }
  return header('Psyflo · portal upload', false) + `<div class="body"><div class="banner n">${I.open}<div>You are in your own portal session. Attach the packet Psyflo prepared and press Submit; Psyflo reads the confirmation number from the next page.</div></div></div>` + foot();
}

// ---------------------------------------------------------------- home (consumer list) · screen 13
function homeView() {
  const s = S(); const me = meFromPage(); const role = P.ui.role || me.role; const lvl = LEVEL[role];
  const p = P.page; const list = p.consumers || [];
  const first = me.name.split(' ')[0];
  const mine = s.clients.filter(c => c.staff === me.id);
  const nt = M.notesToday(s, 'khale');
  const drafts = s.requests.filter(r => ['draft_ready', 'awaiting_signature', 'signed'].includes(r.stage));
  const sub = role === 'direct_support' ? `${mine.length || nt.total} students today · ${nt.done} of ${nt.total} daily notes done` : role === 'clinician' ? `${s.screenings.filter(x => x.status === 'booked').length} screening call${s.screenings.filter(x => x.status === 'booked').length === 1 ? '' : 's'} · ${drafts.length} request${drafts.length === 1 ? '' : 's'} to review` : role === 'supervisor' ? `${s.notes.filter(n => n.review === 'pending').length} notes to review` : `${s.requests.filter(r => ['info_requested', 'partial_decide', 'overdue', 'signed'].includes(r.stage)).length} requests need action`;
  const forms = (role === 'direct_support' || role === 'supervisor' ? [] : [['screening', 'Admission screening'], ['cna', 'Intake (CNA)']]).concat(DS_TASKS);
  const studs = list.filter(x => x.program === 'TDT');
  const sel = P.ui.student || (studs[0] && studs[0].no) || '';
  const t = s.timers[me.id]; const running = t && t.started;
  const tog = (r, l) => `<button class="tog ${role === r ? 'on' : ''}" data-act="role" data-r="${r}">${l}</button>`;
  const reqLink = r => { const c = M.client(s, r.client); const no = c.lauris_no || c.harvest_no; const form = r.type === 'initial' ? 'sra-initial' : 'sra-continued'; const clk = M.requestClock(s, r); return `<a class="btn o" data-act="nav" data-href="${no ? `/consumers/${no}/session/${form}` : '/consumers/new'}"><span>${esc(M.clientLabel(s, r.client))} · ${esc(M.TYPE_LABEL[r.type])} · ${esc(M.STAGE_LABEL[r.stage])}</span><span class="chip ${clk.sev}">${esc(clk.text)}</span></a>`; };
  return header(`${me.name}${me.credential ? ', ' + me.credential : ''} · ${M.ROLE_LABEL[role].toLowerCase()}`, false) + `<div class="body">
  <div class="row" style="flex-wrap:wrap"><span class="lab">Signed in as (demo)</span>${tog('direct_support', 'Support staff')}${tog('clinician', 'Clinician')}${tog('supervisor', 'Supervisor')}${tog('admin', 'Admin')}</div>
  <div><div style="font-size:17px;font-weight:600">Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${esc(first)}.</div><div class="small muted">${M.fmtDate(s.today, { dow: true })} · ${esc(sub)}</div></div>
  ${flashHTML()}
  ${lvl !== 4 ? `
  ${lvl >= 3 ? newReferralsHTML() : ''}
  ${schoolHomeHTML(me, lvl)}
  <div class="tile"><div class="row"><span class="ic" style="background:#217A78;color:#fff">${I.mic}</span><div><div style="font-weight:600;font-size:15px">Record a note or call</div><div class="small muted">Scribe · say what happened or record the call; Psyflo drafts the boxes.</div></div></div>
    <div class="row" style="margin-top:10px"><select class="tog" style="flex:1" aria-label="Which form" data-ch="pickForm">${forms.map(([k, l]) => `<option value="${k}"${P.ui.form === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn p" data-act="startForm" ${sel ? '' : 'disabled'}>Start</button></div>
    <div class="small muted" style="margin-top:4px">Opens the form for the student picked below.</div></div>
  <div class="tile"><div class="row"><span class="ic" style="background:#151B24;color:#fff">${I.clock}</span><div><div style="font-weight:600;font-size:15px">Time with a student <span class="muted" style="font-weight:400;font-size:12px">· optional</span></div><div class="small muted">Track time · start and stop · fills the daily note's contact time${running ? ` · <b>running with ${esc(M.clientLabel(s, t.client, false))} since ${fmtTime(t.started)}</b>` : ''}.</div></div></div>
    <div class="row" style="margin-top:10px"><select class="tog" style="flex:1" aria-label="Student" data-ch="pickStudent">${studs.map(x => `<option value="${x.no}"${String(sel) === String(x.no) ? ' selected' : ''}>${esc(x.initials)}</option>`).join('') || '<option>No TDT students on this page</option>'}</select>
    ${running ? '<button class="btn r" data-act="timerStop">Stop</button>' : `<button class="btn p" data-act="timerStart" ${sel ? '' : 'disabled'}>Start</button>`}</div></div>` : ''}
  ${lvl >= 3 ? `<div class="tile t"><div class="row"><span class="ic" style="background:#5FC0BE;color:#151B24">${I.doc}</span><div><div style="font-weight:600;font-size:15px">Draft the request</div><div class="small muted">Review a request · into the Lauris form.</div></div></div>
    <div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:10px">${drafts.map(reqLink).join('') || '<div class="small muted">No request drafts waiting.</div>'}</div></div>` : ''}
  ${lvl === 4 ? `<div class="tile"><div style="font-weight:600;font-size:15px">Open Psyflo</div><div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
    <a class="btn o" data-act="openApp" data-href="#/Authorizations"><span>Authorizations · where every request stands</span><span class="chip r">${s.requests.filter(r => ['info_requested', 'partial_decide', 'overdue', 'signed'].includes(r.stage)).length} need action</span></a>
    <a class="btn o" data-act="openApp" data-href="#/Analytics"><span>Analytics · what to show the grant funder</span><span class="chip n">12 months</span></a>
    <a class="btn o" data-act="openApp" data-href="#/Referrals"><span>Referrals · new students from schools</span><span class="chip y">${s.referrals.filter(r => r.stage === 'needs_screening').length} waiting</span></a>
    <a class="btn o" data-act="openApp" data-href="#/StaffDashboard"><span>Staff · who is behind, who needs review</span><span class="chip y">${s.notes.filter(n => n.review === 'pending').length} to review</span></a></div></div>
    <div class="tile" style="background:#fff"><div style="font-weight:600;font-size:14px">Who can see what</div><div style="display:grid;grid-template-columns:110px minmax(0,1fr);gap:5px 10px;font-size:12px;margin-top:6px">
      <div style="font-weight:600">Direct support</div><div>Record a daily note, weekly guardian call, monthly collateral call or incident report; optional timer. Their own students' units.</div>
      <div style="font-weight:600">Clinician</div><div>Everything above, plus new referrals, screening and intake Scribe, request drafts, and Authorizations.</div>
      <div style="font-weight:600">Supervisor</div><div>Their site: notes to review, incidents, the Staff dashboard.</div>
      <div style="font-weight:600">Admin</div><div>Authorizations and Analytics for the whole program. Sets these levels.</div></div></div>` : ''}
  <div><div class="lab">On this page · read from Lauris</div>${list.map(x => { const c = s.clients.find(y => y.harvest_no === Number(x.no) || y.lauris_no === Number(x.no)); const w = c ? M.waitingDictations(s, c.id).length + M.waitingAssessments(s, c.id).length : 0; return `<div class="sec"><b><a href="#" data-act="nav" data-href="/consumers/${x.no}">${esc(x.initials)}</a> <span class="muted" style="font-weight:400">· ${esc(x.units)}</span></b>${x.program !== 'TDT' ? `<span class="chip n">${esc(x.program)} · Psyflo off</span>` : w ? `<span class="chip y">${w} waiting in Psyflo</span>` : '<span class="chip g">TDT</span>'}</div>`; }).join('') || '<div class="small muted">No consumers listed.</div>'}</div>
  </div>` + foot();
}
// a line per student with unused school updates today (own caseload for direct support)
function schoolHomeHTML(me, lvl) {
  const s = S(); const today = s.today;
  const byClient = {};
  (s.shares || []).forEach(sh => { if (String(sh.at || '').slice(0, 10) !== today || (sh.used && sh.used.daily)) return; const c = s.clients.find(x => x.id === sh.client); if (!c || (lvl === 1 && c.staff !== me.id)) return; (byClient[c.id] = byClient[c.id] || { c, n: 0 }).n++; });
  const rows = Object.values(byClient); if (!rows.length) return '';
  return `<div class="list" style="display:flex;flex-direction:column;gap:6px">${rows.map(({ c, n }) => { const no = c.lauris_no || c.harvest_no; return `<a class="btn o" data-act="nav" data-href="/consumers/${no}/session/dpn"><span>${n} update${n === 1 ? '' : 's'} from school · ${esc(c.initials)}</span><span class="chip y">open the daily note</span></a>`; }).join('')}</div>`;
}
ACT.role = el => { P.ui.role = el.dataset.r; draw(); };
ACT.pickForm = el => { P.ui.form = el.value; };
ACT.pickStudent = el => { P.ui.student = el.value; draw(); };
ACT.startForm = () => { const no = P.ui.student || (P.page.consumers || []).find(x => x.program === 'TDT')?.no; const f = P.ui.form || ((LEVEL[P.ui.role || meFromPage().role] >= 3) ? 'screening' : 'dpn'); nav(`/consumers/${no}/session/${f}`); };
ACT.timerStart = async () => { const no = Number(P.ui.student || (P.page.consumers || [])[0]?.no); const c = S().clients.find(x => x.harvest_no === no || x.lauris_no === no); if (!c) return flash('That student is not in Psyflo', 'r'); await api.do('timer.start', { staff: meFromPage().id, client: c.id }); flash('Timer started with ' + c.initials); };
ACT.timerStop = async () => { await api.do('timer.stop', { staff: meFromPage().id }); flash('Timer stopped · the block is ready for the daily note'); };

function listView() {
  return header('Psyflo · ' + (P.page.kind === 'saved' ? 'Saved Session' : 'Rejected Forms'), false) + `<div class="body"><div class="banner n">${I.open}<div>${P.page.kind === 'saved' ? 'Forms you saved but did not process. Open one and Psyflo picks up where the draft left off.' : 'Reviewer notes are in the table. Open the form, fix it, and process it again; Psyflo re-runs its checks when you open it.'}</div></div></div>` + foot();
}

// ---------------------------------------------------------------- new referrals + new consumer (Flow A starts here)
// A referral from the school portal is "new" until a person creates the consumer in Lauris. Referrals may
// point at a Psyflo client (T.W.) or carry only a label from the school ("A.R., 9").
function refInfo(r) {
  const s = S(); const c = s.clients.find(x => x.id === r.client) || null;
  const m = String(r.client || '').match(/^([A-Z]\.[A-Z]\.)(?:,\s*(\d+))?/);
  return { c, initials: c ? c.initials : (m ? m[1] : String(r.client || '')), age: c ? c.age : (m && m[2] ? +m[2] : null), label: M.clientLabel(s, r.client), inLauris: !!(r.lauris_no || (c && c.lauris_no)) };
}
function candidateReferrals() {
  const s = S();
  return s.referrals.filter(r => ['needs_screening', 'screening_booked', 'in_intake'].includes(r.stage) && !refInfo(r).inLauris);
}
const newReferrals = () => S().referrals.filter(r => r.stage === 'needs_screening' && !refInfo(r).inLauris);
function refKnown(r) {
  const s = S(); const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id); const a = fl?.answers || {}; const f = r.form || {};
  const k = [`${M.school(s, r.school).name} · received ${fmtDate(r.received)}`];
  if (f.concerns?.length) k.push('Concerns: ' + f.concerns.slice(0, 3).join(', ').toLowerCase() + (f.concerns.length > 3 ? '…' : ''));
  if (f.iep) k.push('IEP on file');
  k.push(fl?.submitted_at ? `Family link submitted ${fmtDate(fl.submitted_at)}${a.guardian_name ? ' · ' + a.guardian_name + (a.relationship ? ' (' + a.relationship + ')' : '') : ''}` : fl?.opened_at ? `Family link opened${a.guardian_name ? ' · ' + a.guardian_name + (a.relationship ? ' (' + a.relationship + ')' : '') : ''} · not submitted` : fl?.sent_at ? 'Family link sent · not opened' : 'Family link not sent yet');
  k.push(el?.status === 'recorded' ? `Eligibility: ${M.payerShort(s, el.plan)} · checked ${fmtDate(el.checked_at)}` : 'Eligibility not checked yet');
  return k;
}
function newReferralsHTML() {
  const list = newReferrals(); if (!list.length) return '';
  return `<div class="tile t"><div class="row"><span class="ic" style="background:#F0B44C;color:#151B24">${I.doc}</span><div style="flex:1"><div style="font-weight:600;font-size:15px">${list.length} new referral${list.length === 1 ? '' : 's'}</div><div class="small muted">From the school portal · not in Lauris yet. Open a new consumer and Psyflo fills the boxes from the referral.</div></div></div>
    ${list.map(r => { const i = refInfo(r); return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(i.label)} · ${esc(r.id)}</b><span class="chip y">new</span></div>${refKnown(r).map(x => `<div class="small">${esc(x)}</div>`).join('')}
      <div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn p" style="flex:1" data-act="nav" data-href="/consumers/new?referral=${esc(r.id)}">New consumer from this referral</button><a class="btn o" data-act="openApp" data-href="#/Referral?id=${esc(r.id)}">Referral ↗</a></div></div>`; }).join('')}</div>`;
}
function newConsumerView() {
  const s = S(); const cands = candidateReferrals();
  const qref = new URL(P.page.url).searchParams.get('referral');
  const refId = P.ui.ref || (cands.find(r => r.id === qref) || cands[0] || {}).id;
  const r = s.referrals.find(x => x.id === refId);
  if (!r) return header('Psyflo · new consumer') + `<div class="body"><div class="banner n">${I.open}<div>No referral is waiting to be added to Lauris.</div></div></div>` + foot();
  const i = refInfo(r); const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id);
  const boxes = newConsumerBoxes(r);
  const filled = new Set(P.ui.filled || []);
  return header('Scribe · New consumer · from ' + r.id) + `<div class="body">${flashHTML()}
    <div class="row"><span class="lab">Referral</span><select class="tog" style="flex:1" data-ch="pickRef">${cands.map(x => `<option value="${x.id}"${x.id === refId ? ' selected' : ''}>${x.id} · ${esc(refInfo(x).label)}${x.stage === 'needs_screening' ? ' · new' : ''}</option>`).join('')}</select></div>
    ${LEVEL[meFromPage().role] >= 3 ? recordScreeningTile('steps') : ''}
    <div class="tile t"><b>Create ${esc(i.initials)} in Lauris</b><div class="small" style="margin-top:4px">From the school's referral (${fmtDate(r.received)})${fl?.submitted_at ? ' and the family link (' + fmtDate(fl.submitted_at) + ')' : ''}. Psyflo types the boxes; you check them and press <b>Save Consumer</b>.</div>
      ${!el || el.status !== 'recorded' ? `<div class="banner y" style="margin-top:8px">${I.warn}<div>Eligibility is not recorded yet. It is checked only after the guardian submits the family link.</div></div>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="fillNew" ${P.ui.filling ? 'disabled' : ''}>${filled.size ? 'Type them again' : `Fill ${boxes.length} boxes from the referral`}</button></div></div>
    <div><div class="lab">Boxes · where each comes from</div>${boxes.map(b => `<div class="box"><div class="row"><span class="l" style="flex:1">${esc(b.label)}</span>${filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : ''}</div><div class="v">${esc(b.value)}</div>${srcChips(b, NEW_SOURCES)}</div>`).join('')}
      <div class="box"><div class="l">Assigned staff</div><div class="v muted">Left for you — the referral does not say who will work with ${esc(i.initials)}.</div></div></div>
    <div class="small muted">After Save Consumer, open Admission Screening: the guardian, phone, language, Medicaid and IEP boxes come from the referral and the family link.</div></div>` + foot();
}
const NEW_SOURCES = [{ n: 1, label: 'Referral form' }, { n: 2, label: 'Family link' }, { n: 3, label: 'Psyflo record' }, { n: 4, label: 'You (signed in)' }];
const usDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
function newConsumerBoxes(r) {
  const s = S(); const i = refInfo(r); const sch = M.school(s, r.school || i.c?.school); const a = M.familyLinkFor(s, r.id)?.answers || {};
  const b = [{ label: 'Name', value: i.initials, src: [1] }];
  if (a.dob) b.push({ label: 'Date of birth', value: usDate(a.dob), src: [2] });
  if (sch.locality) b.push({ label: 'Locality', value: sch.locality, src: [1] });
  if (sch.name) b.push({ label: 'School', value: sch.name, src: [1] });
  b.push({ label: 'Program', value: 'TDT', src: [1] });
  const cl = i.c?.clinician ? M.staff(s, i.c.clinician) : (meFromPage().role === 'clinician' ? meFromPage() : null);
  if (cl) b.push({ label: 'Clinician', value: `${M.staffShort(s, cl.id)}${cl.credential ? ', ' + cl.credential : ''}`, src: [i.c?.clinician ? 3 : 4] });
  return b;
}
ACT.pickRef = el => { P.ui.ref = el.value; P.ui.filled = []; draw(); };
ACT.fillNew = async () => {
  const s = S(); const r = s.referrals.find(x => x.id === (P.ui.ref || (candidateReferrals().find(x => x.id === new URL(P.page.url).searchParams.get('referral')) || candidateReferrals()[0])?.id));
  if (!r) return;
  const i = refInfo(r);
  try { localStorage.setItem('psyflo_newref', JSON.stringify({ ref: r.id, initials: i.initials, at: Date.now() })); } catch (e) { }
  const res = await fillBoxes(newConsumerBoxes(r), { form: 'new-consumer', client: i.c || { id: r.id }, sources: NEW_SOURCES });
  if (!res.error) flash(`Boxes typed. Check them and press Save Consumer in Lauris.${res.missing?.length ? ' Not found on this form: ' + res.missing.join(', ') : ''}`, res.missing?.length ? 'y' : 'g');
};
// after Save Consumer: link a label-only referral (no Psyflo client yet) to the new Harvest #
function referralForConsumer(no, initials) {
  const s = S();
  const byNo = s.referrals.find(r => r.lauris_no && r.lauris_no === Number(no)); if (byNo) return byNo;
  let hint = null; try { hint = JSON.parse(localStorage.getItem('psyflo_newref') || 'null'); } catch (e) { }
  if (hint && hint.initials === initials) { const r = s.referrals.find(x => x.id === hint.ref); if (r) return r; }
  return candidateReferrals().find(r => refInfo(r).initials === initials) || null;
}

// ---------------------------------------------------------------- consumer record
function recordView(c) {
  const s = S(); const p = P.page; const ev = P.event;
  if (!c) {
    const r = p.consumer && referralForConsumer(p.consumer.no, p.consumer.initials);
    const lvl0 = LEVEL[meFromPage().role];
    if (r && ev && ev.event === 'created' && !r.lauris_no && P.linking !== r.id) { P.linking = r.id; api.do('referral.inLauris', { id: r.id, no: p.consumer.no }).catch(() => { }); }
    if (r && (r.lauris_no === Number(p.consumer.no) || (ev && ev.event === 'created'))) return header('Psyflo · ' + p.consumer.initials) + `<div class="body">${flashHTML()}<div class="banner">${I.ok}<div><b>${esc(p.consumer.initials)} is in Lauris · Harvest # ${esc(p.consumer.no)}.</b> Psyflo linked it to ${esc(r.id)} (the school's referral).</div></div>
      ${lvl0 >= 3 ? `<button class="btn p" data-act="nav" data-href="/consumers/${p.consumer.no}/session/screening">Open Admission Screening</button><div class="small muted">The guardian, phone, language and IEP boxes come from the referral and the family link.</div>` : ''}</div>` + foot();
    return header('Psyflo · ' + (p.consumer?.initials || '')) + `<div class="body"><div class="banner n">${I.open}<div>${esc(p.consumer?.initials)} is not a Psyflo student yet. Nothing to draft.</div></div></div>` + foot();
  }
  const no = p.consumer.no; const me = meFromPage(); const lvl = LEVEL[me.role];
  const d = M.waitingDictations(s, c.id), a = M.waitingAssessments(s, c.id);
  const reqs = s.requests.filter(r => r.client === c.id && !['active', 'closed'].includes(r.stage));
  let evHTML = '';
  if (ev && ev.event === 'processed') {
    const f = ev.form; const next = { screening: ['cna', 'Open the intake (CNA)'], cna: ['isp', 'Open the treatment plan (ISP)'], isp: ['sra-initial', 'Open the initial request (SRA)'], 'sra-initial': ['/approvals', 'Open Forms to Approve'], 'sra-continued': ['/approvals', 'Open Forms to Approve'] }[f];
    const extra = f === 'screening' ? ' The 30-day clock for the initial request started today.' : f === 'isp' ? ' Psyflo drafted the initial request from the record.' : f === 'dpn' ? ` Staff dashboard: ${M.notesToday(s, 'khale').done} of ${M.notesToday(s, 'khale').total} daily notes today.` : (f || '').startsWith('sra') ? ' Psyflo will save the signed preview as PDF when you press Get Signature.' : '';
    evHTML = `<div class="banner">${I.ok}<div><b>${esc(FORM_NAME[f] || f)} processed in Lauris.</b> Psyflo's tracker updated.${esc(extra)}</div></div>${savedHTML()}${f === 'isp' ? ispSignHTML(c) : ''}${next ? `<button class="btn p" data-act="nav" data-href="${next[0].startsWith('/') ? next[0] : `/consumers/${no}/session/${next[0]}`}">${esc(next[1])}</button>` : ''}`;
  }
  if (ev && ev.event === 'created') evHTML = `<div class="banner">${I.ok}<div><b>${esc(c.initials)} is in Lauris · Harvest # ${esc(no)}.</b> Psyflo linked it to ${esc(c.referral || c.id)}.</div></div>`;
  const screened = s.screenings.some(x => x.client === c.id && (x.status === 'done' || x.processed_at)) || !!c.timeline?.screening;
  if (lvl >= 3 && !screened && (!ev || ev.event !== 'processed')) evHTML += recordScreeningTile('go', no);
  const forms = ['dpn', 'weekly', 'collateral', 'incident'].concat(lvl >= 3 ? ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'] : []);
  return header(`Psyflo · ${c.initials} · ${M.school(s, c.school).name}`) + `<div class="body">${flashHTML()}${evHTML}
    ${d.length ? `<div class="banner y">${I.mic}<div><b>${d.length} dictation${d.length === 1 ? '' : 's'} waiting</b> from the phone (${esc(M.staffShort(s, d[0].staff))}, ${fmtTime(d[0].at)}). Open today's daily note and it drops in.</div></div><button class="btn p" data-act="nav" data-href="/consumers/${no}/session/dpn">Open today's Daily Progress Note</button>` : ''}
    ${a.length ? `<div class="banner y">${I.doc}<div><b>${a.length} assessment${a.length === 1 ? '' : 's'} waiting</b> (${a.map(x => esc(x.instrument)).join(', ')}). Open Surveys and Psyflo types the answers in.</div></div>${p.kind === 'surveys' ? `<button class="btn p" data-act="dropSurvey">Type the ${esc(a[0].instrument)} answers</button>` : `<button class="btn o" data-act="nav" data-href="/consumers/${no}/surveys?instrument=${encodeURIComponent(a[0].instrument)}">Open Surveys</button>`}` : ''}
    ${reqs.length && lvl >= 3 ? `<div><div class="lab">Requests in Psyflo</div>${reqs.map(r => { const clk = M.requestClock(s, r); return `<div class="sec"><b>${esc(r.id)} · ${esc(M.TYPE_LABEL[r.type])}</b><span class="chip ${clk.sev}">${esc(M.STAGE_LABEL[r.stage])} · ${esc(clk.text)}</span></div>`; }).join('')}</div>` : ''}
    <div><div class="lab">Open a form · Psyflo drafts what it can</div>${forms.map(f => `<div class="sec"><b>${esc(FORM_NAME[f])}</b><a href="#" class="chip g" data-act="nav" data-href="/consumers/${no}/session/${f}">open</a></div>`).join('')}</div>
  </div>` + foot();
}
ACT.dropSurvey = async () => {
  const s = S(); const c = clientForPage(); const a = M.waitingAssessments(s, c.id)[0];
  const inst = P.page.form?.instrument;
  if (a.instrument !== inst) { nav(`/consumers/${P.page.consumer.no}/surveys?instrument=${encodeURIComponent(a.instrument)}`); return; }
  const vals = Object.values(a.answers || {});
  await fillBoxes(vals.map((v, i) => ({ label: `${a.instrument} item ${i + 1}`, value: String(v) })), { form: 'survey', client: c, sources: [{ n: 1, label: 'Asked on the phone' }] });
  await api.do('assessment.used', { id: a.id });
  flash('Answers typed. Press Save Survey — Lauris scores it.');
};

// ---------------------------------------------------------------- session forms
function formView(type, c) {
  const me = meFromPage();
  if (!c && type === 'screening' && LEVEL[me.role] >= 3) { const r = referralForConsumer(P.page.consumer?.no, P.page.consumer?.initials); if (r && r.lauris_no) return refScreeningView(r); }
  if (!c) return header('Psyflo · ' + (FORM_NAME[type] || 'form')) + `<div class="body"><div class="banner n">${I.open}<div>${esc(P.page.consumer?.initials)} is not a Psyflo student. Nothing to draft.</div></div></div>` + foot();
  if (CLIN_FORMS.includes(type) && LEVEL[me.role] < 3) return header('Psyflo · ' + FORM_NAME[type]) + `<div class="body"><div class="banner n">${I.open}<div>${esc(FORM_NAME[type])} drafts are for clinicians. Direct support sees daily notes, contacts and their own students' units.</div></div></div>` + foot();
  if (LEVEL[me.role] === 1 && c.staff && c.staff !== me.id) return header('Psyflo · ' + FORM_NAME[type]) + `<div class="body"><div class="banner n">${I.open}<div>${esc(c.initials)} is not on your caseload. Psyflo shows direct support their own students only.</div></div></div>` + foot();
  const v = formViewFor(type, c);
  return P.event && P.event.event === 'saved' ? v.replace('<div class="body">', '<div class="body">' + savedHTML()) : v;
}
function formViewFor(type, c) {
  switch (type) {
    case 'screening': return screeningView(c);
    case 'dpn': return dpnView(c);
    case 'sra-initial': return sraView(c);
    case 'cna': return cnaView(c);
    default: return seededView(type, c);
  }
}

// ---------- Flow A · screening call (screen 14)
const PRE_LABELS = ['Guardian on the call', 'Phone', 'Preferred language', 'Medicaid', 'Medicaid ID', 'IEP'];
// the boxes that come from the referral (school portal) and the family link (guardian), typed before the call
function preCallBoxes(c, ref) {
  const s = S(); c = c || {}; const r = ref || s.referrals.find(x => x.id === c.referral); const fl = r && M.familyLinkFor(s, r.id); const el = r && M.eligibilityFor(s, r.id); const a = fl?.answers || {};
  const b = [];
  if (a.guardian_name || c.guardian?.name) b.push({ label: 'Guardian on the call', value: `${a.guardian_name || c.guardian.name} (${a.relationship || c.guardian?.relationship || 'guardian'})`, src: [a.guardian_name ? 2 : 1] });
  if (a.phone || c.guardian?.phone) b.push({ label: 'Phone', value: a.phone || c.guardian.phone, src: [a.phone ? 2 : 1] });
  if (a.language) b.push({ label: 'Preferred language', value: a.language, src: [2] });
  if (el?.status === 'recorded') b.push({ label: 'Medicaid', value: `${M.payer(s, el.plan).name} · checked ${fmtDate(el.checked_at)}`, src: [3] });
  if (a.medicaid_id) b.push({ label: 'Medicaid ID', value: 'on file (family link)', src: [2] });
  if (r?.form?.iep) b.push({ label: 'IEP', value: 'Yes — copy attached to referral', src: [1] });
  return b;
}
const PRE_SOURCES = [{ n: 1, label: 'Referral form' }, { n: 2, label: 'Family link' }, { n: 3, label: 'Eligibility (DMAS screenshot)' }];

function screeningView(c) {
  const s = S(); const u = P.ui; const r = s.referrals.find(x => x.id === c.referral);
  const el = r && M.eligibilityFor(s, r.id); const fl = r && M.familyLinkFor(s, r.id);
  const st = u.sc || 'pre';
  const facts = screeningFacts(u.transcript || '');
  const prompts = screeningPrompts(facts);
  const met = prompts.filter(p => ['c1', 'c2', 'c3'].includes(p.key) && p.done).length;
  const pre = preCallBoxes(c);
  let html = header(`Scribe · Admission screening · ${meFromPage().name}`) + '<div class="body">' + flashHTML();
  if (!fl?.submitted_at || el?.status !== 'recorded') html += `<div class="banner y">${I.warn}<div>${!fl?.submitted_at ? 'The family link is not submitted yet.' : 'Eligibility is not recorded yet.'} Psyflo fills the guardian and insurance boxes only from the family link and a recorded eligibility check.</div></div>`;
  if (st === 'pre') {
    html += recordScreeningTile('here') + `<div class="banner">${I.ok}<div><b>Filled before you picked up:</b> ${pre.length} boxes from the referral and the family link — ${pre.map(b => esc(b.label.toLowerCase())).join(', ')}. ${u.preFilled ? 'Check them.' : ''}</div></div>
      ${u.preFilled ? `<button class="btn o" data-act="preFill">Type the ${pre.length} boxes again</button>` : `<button class="btn o" data-act="preFill">Type the ${pre.length} boxes</button>`}
      ${preBoxesHTML(pre)}`;
  }
  if (st === 'rec') {
    const dur = Math.floor((Date.now() - (u.recStart || Date.now())) / 1000);
    html += `<div class="banner n"><span class="rec on"></span><div style="flex:1"><b>Recording the call · ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}</b> · consent read · ${u.recMode === 'script' ? 'scripted call playing' : 'microphone'} · boxes drafted when you hang up</div></div>
      <div class="row" style="flex-wrap:wrap;gap:6px 8px"><div style="font-size:15px;font-weight:600">Before you hang up</div><span class="chip ${met >= 2 ? 'g' : 'y'}">insurance needs 2 of 3 · we can show ${met}</span></div>
      ${promptsHTML(prompts)}
      <div class="tx" id="tx">${esc((u.transcript || '').split('\n').slice(-6).join('\n'))}${u.interim ? '\n' + esc(u.interim) : ''}</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="recStop">Stop and draft the boxes</button><button class="btn o" data-act="copyAsks">Copy asks</button></div>`;
  }
  if (st === 'drafted') {
    const d = u.draft; const rows = new Set(d.boxes.map(b => b.row || b.label)).size;
    const all = 19;
    html += `<div class="banner">${I.ok}<div><b>${rows} boxes drafted from the call</b> · ${pre.length} filled before it · ${d.blank.length} left for you · ${all} on this form. Nothing in them that was not said or on the referral.</div></div>
      <div class="row"><button class="btn p" style="flex:1" data-act="scFill" ${u.filling ? 'disabled' : ''}>${u.scFilled ? 'Type them again' : `Fill the ${rows} boxes`}</button><button class="btn o" data-act="scOne">One at a time</button></div>
      ${u.one != null ? oneAtATime(d.boxes, 'scOneType', 'scOneSkip') : ''}
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip g">Summary · drafted last</span><span class="chip n">Decision and diagnosis · yours</span><span class="chip y">Then · Process Form</span></div>
      <div><div class="lab">After the call</div>${promptsHTML(prompts, true)}</div>
      ${checksBlock(d.checks)}
      <div><div class="lab">Drafted boxes · with sources</div>${groupRows(d.boxes).map(g => `<div class="box"><div class="l">${esc(g.label)}</div><div class="v">${esc(g.value)}</div>${srcChips(g, d.sources)}</div>`).join('')}${d.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">Left blank — ${esc(b.why)}</div></div>`).join('')}</div>
      <details><summary class="small">Transcript (${(u.transcript || '').split('\n').filter(Boolean).length} lines)</summary><div class="tx" style="max-height:220px">${esc(u.transcript || '')}</div></details>
      <button class="btn o" data-act="recAgain">Record again</button>`;
  }
  return html + '</div>' + foot();
}
function groupRows(boxes) {
  const out = []; const seen = {};
  for (const b of boxes) { const k = b.row || b.label; if (seen[k]) { seen[k].value += ' · ' + b.value; continue; } seen[k] = { label: k, value: b.value, src: b.src }; out.push(seen[k]); }
  return out;
}
function promptsHTML(prompts, after) {
  let g = ''; return prompts.map(p => { const head = p.group !== g ? `<div class="lab" style="margin-top:4px">${esc(p.group)}</div>` : ''; g = p.group; return `${head}<div class="cr${p.done ? ' done' : ''}">${p.done ? I.ok : p.partial ? I.warn : after ? I.no : I.open}<div><b>${esc(p.title)}</b>${esc(p.text)}${!p.done && p.ask ? `<div class="ask">Ask now: ${esc(p.ask)}</div>` : ''}</div></div>`; }).join('');
}
function oneAtATime(boxes, typeAct, skipAct) {
  const b = boxes[P.ui.one]; if (!b) return `<div class="banner">${I.ok}<div>That was the last box.</div></div>`;
  return `<div class="tile"><div class="lab">Box ${P.ui.one + 1} of ${boxes.length}</div><div style="font-weight:600;margin-top:2px">${esc(b.label)}</div><div class="small" style="margin:4px 0 8px;white-space:pre-wrap">${esc(b.value)}</div><div class="row"><button class="btn p" data-act="${typeAct}">Type this one</button><button class="btn o" data-act="${skipAct}">Skip</button><button class="btn o" data-act="oneClose">Close</button></div></div>`;
}
ACT.oneClose = () => { P.ui.one = null; draw(); };
const hasSpeech = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

ACT.preFill = async () => { const c = clientForPage(); await fillBoxes(preCallBoxes(c), { form: 'screening', client: c, sources: PRE_SOURCES }); P.ui.preFilled = true; draw(); };
const preBoxesHTML = pre => `<div><div class="lab">Where each box came from</div>${pre.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, PRE_SOURCES)}</div>`).join('')}</div>`;
// "Record the screening call", shown wherever the panel lands on the way to a screening:
//  here  = on the Admission Screening form (the recorder itself)
//  go    = on the consumer page (opens Admission Screening, where recording starts)
//  steps = on New Consumer (the consumer must exist in Lauris first)
const CONSENT_WORDING = 'Read consent first. While you talk the panel shows only what the insurer still needs; it drafts the boxes when you hang up.';
function recordScreeningTile(mode, no) {
  const head = `<div class="row"><span class="ic" style="background:#217A78;color:#fff">${I.mic}</span><div style="flex:1"><div style="font-weight:600;font-size:15px">Record the screening call</div><div class="small muted">Scribe · speaker or phone on speaker · ${esc(CONSENT_WORDING)}</div></div></div>`;
  if (mode === 'here') return `<div class="tile t">${head}
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn p" data-act="recMic" style="flex:1">${I.mic} Record (microphone)</button><button class="btn o" data-act="recScript" title="Plays seed/scripts/screening_TW.txt as the call">Play the scripted call</button></div>
      <div class="small muted" style="margin-top:6px">${hasSpeech() ? 'Microphone uses the browser\'s speech recognition.' : 'Speech recognition is not available in this browser — use the scripted call.'} The scripted call is the acceptance test in seed/scripts.</div></div>`;
  if (mode === 'go') return `<div class="tile t">${head}
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="nav" data-href="/consumers/${no}/session/screening">${I.mic} Open Admission Screening to record</button></div>
      <div class="small muted" style="margin-top:6px">The recorder is on the Admission Screening form; the boxes from the referral and the family link are typed in when it opens.</div></div>`;
  return `<div class="tile t">${head}
      <div class="small" style="margin-top:8px"><b>1</b> Fill the boxes below and press <b>Save Consumer</b>.<br><b>2</b> Open <b>Admission Screening</b> from the next page.<br><b>3</b> Press <b>Record (microphone)</b> on the call, or play the scripted call.</div>
      <div class="row" style="margin-top:8px"><button class="btn o" style="flex:1" disabled title="Save the consumer in Lauris first">${I.mic} Record — after Save Consumer</button></div></div>`;
}
// a consumer created from a referral that has no Psyflo student record yet (A.R., B.K.): pre-call boxes only
function refScreeningView(r) {
  const pre = preCallBoxes(null, r); const i = refInfo(r);
  return header(`Scribe · Admission screening · ${i.label}`) + `<div class="body">${flashHTML()}
    <div class="banner">${I.ok}<div><b>From ${esc(r.id)}:</b> ${pre.length ? `${pre.length} box${pre.length === 1 ? ' comes' : 'es come'} from the referral and the family link.` : 'the referral and the family link have nothing for these boxes yet.'}${M.familyLinkFor(S(), r.id)?.submitted_at ? '' : ' The family link is not submitted, so phone, language and insurance stay empty until the guardian finishes it.'}</div></div>
    ${pre.length ? `<button class="btn p" data-act="refPreFill" ${P.ui.filling ? 'disabled' : ''}>${P.ui.preFilled ? 'Type them again' : `Fill ${pre.length} box${pre.length === 1 ? '' : 'es'} from the referral`}</button>` : ''}
    ${pre.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, PRE_SOURCES)}</div>`).join('')}
    <div class="small muted">Scribe drafts the rest of the screening from the recorded call once ${esc(i.initials)} has a Psyflo record (T.W. is the worked example).</div></div>` + foot();
}
ACT.refPreFill = async () => { const p = P.page; const r = referralForConsumer(p.consumer?.no, p.consumer?.initials); if (!r) return; await fillBoxes(preCallBoxes(null, r), { form: 'screening', client: refInfo(r).c || { id: r.id }, sources: PRE_SOURCES }); P.ui.preFilled = true; draw(); };

// ---------- what was actually saved in Lauris (Save Form Data / Process Form), kept as Psyflo's saved version
function savedHTML() {
  const ev = P.event; if (!ev || !['saved', 'processed'].includes(ev.event)) return '';
  const v = (S().lauris_versions || []).filter(x => String(x.session) === String(ev.session) && x.event === ev.event).at(-1);
  if (!v) return '';
  const n = Object.keys(v.filled || {}).length; const ch = (v.changed || []).length + (v.cleared || []).length;
  const cut = t => { t = String(t ?? ''); return t.length > 90 ? t.slice(0, 88) + '…' : t; };
  const head = n ? `${ch ? `<b>${ch} box${ch === 1 ? '' : 'es'} changed after fill</b> · ` : '<b>No changes after fill</b> · '}${n - ch} of ${n} Psyflo typed kept as typed${v.others ? ` · ${v.others} other box${v.others === 1 ? '' : 'es'}` : ''}` : `${Object.keys(v.values || {}).length} boxes`;
  return `<div class="banner">${I.ok}<div><b>Psyflo kept what you ${ev.event === 'processed' ? 'processed' : 'saved'} in Lauris</b> as the saved version (${fmtTime(v.at)}). ${head}.
    ${ch ? `<details style="margin-top:4px"><summary class="small">What changed</summary>${(v.changed || []).map(x => `<div class="small" style="margin-top:4px"><b>${esc(x.label)}</b><div class="muted">Psyflo typed: ${esc(cut(x.filled))}</div><div>Saved: ${esc(cut(x.saved))}</div></div>`).join('')}${(v.cleared || []).map(l => `<div class="small" style="margin-top:4px"><b>${esc(l)}</b> · emptied before saving</div>`).join('')}</details>` : ''}</div></div>`;
}

// ---------- treatment plan · guardian signature on the parent portal
function ispSignHTML(c) {
  const s = S(); const t = (s.portal_tasks || []).filter(x => x.client === c.id && x.form === 'Treatment plan').at(-1);
  const g = c.guardian?.name || 'the guardian';
  if (t && t.status === 'signed') return `<div class="banner">${I.ok}<div><b>Treatment plan signed by ${esc(g)}</b> on the parent portal${t.signed_at ? ' · ' + fmtDate(t.signed_at) : ''}.</div></div>`;
  if (t) return `<div class="banner y">${I.clock}<div><b>Sent to the parent portal for signature</b> · ${fmtDate(t.at)} ${fmtTime(t.at)} · waiting for ${esc(g)} to sign.</div></div>`;
  return `<button class="btn o" data-act="ispSign">Send to parent for signature</button><div class="small muted">Puts the plan on ${esc(g)}'s parent portal to sign. The guardian signs there; Psyflo never signs.</div>`;
}
ACT.ispSign = async el => {
  const c = clientForPage(); if (!c) return; el.disabled = true;
  await api.do('portalTask.create', { client: c.id, form: 'Treatment plan', why: 'Guardian signature on the treatment plan' });
  flash('Treatment plan sent to the parent portal · pending until the guardian signs.');
};
ACT.recScript = async () => {
  const txt = await fetch('/seed/scripts/screening_TW.txt').then(r => r.text());
  const lines = txt.split('\n').filter(Boolean);
  startRecording('script');
  let i = 0;
  P.rec.timer = setInterval(() => {
    if (!P.rec || i >= lines.length) { if (P.rec) { clearInterval(P.rec.timer); P.ui.interim = '(call ended — press Stop)'; draw(); } return; }
    P.ui.transcript = (P.ui.transcript ? P.ui.transcript + '\n' : '') + lines[i++]; draw();
  }, P.ui.fast ? 250 : 1300);
};
ACT.recMic = () => micStart('sc');
// microphone via the browser's speech recognition; kind 'sc' = screening call, else the say-it box ('dpn', 'incident')
function micStart(kind) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { flash(kind === 'sc' ? 'Speech recognition is not available here. Use the scripted call.' : 'Speech recognition is not available in this browser. Type it instead.', 'y'); return; }
  startRecording('mic', kind);
  const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
  rec.onresult = e => { let fin = '', inter = ''; for (let k = e.resultIndex; k < e.results.length; k++) { const t = e.results[k][0].transcript; if (e.results[k].isFinal) fin += t.trim() + '\n'; else inter += t; } if (fin) P.ui.transcript = (P.ui.transcript || '') + fin; P.ui.interim = inter; draw(); };
  rec.onerror = ev => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return;
    const blocked = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(ev.error);
    if (blocked && P.rec && P.rec.sr === rec) { stopRecording(true); if (kind === 'sc') P.ui.sc = 'pre'; P.ui.recKind = null; }
    flash('Microphone: ' + ev.error + (ev.error === 'not-allowed' ? ' (allow the microphone for this page)' : '') + '. ' + (kind === 'sc' ? 'You can use the scripted call instead.' : 'You can type it instead.'), 'y');
  };
  rec.onend = () => { if (P.rec && P.rec.sr === rec) try { rec.start(); } catch (e) { } };
  P.rec.sr = rec; try { rec.start(); } catch (e) { flash(String(e), 'r'); }
}
function startRecording(mode, kind = 'sc') { stopRecording(true); if (kind === 'sc') P.ui.sc = 'rec'; P.ui.recKind = kind; P.ui.recMode = mode; P.ui.recStart = Date.now(); P.ui.transcript = ''; P.ui.interim = ''; P.rec = { tick: setInterval(draw, 1000) }; draw(); }
function stopRecording(silent) { if (!P.rec) return; clearInterval(P.rec.timer); clearInterval(P.rec.tick); try { P.rec.sr && P.rec.sr.stop(); } catch (e) { } P.rec = null; if (!silent) draw(); }
ACT.recStop = async () => {
  stopRecording(true);
  const c = clientForPage(); const s = S(); const r = s.referrals.find(x => x.id === c.referral); const fl = r && M.familyLinkFor(s, r.id);
  P.ui.draft = draftScreening({ transcript: P.ui.transcript || '', today: s.today, guardianPhone: fl?.answers?.phone || c.guardian?.phone || '', referral: r });
  P.ui.sc = 'drafted'; draw();
  api.do('screening.drafted', { client: c.id, referral: c.referral, transcript: P.ui.transcript || '' }).catch(() => { });
};
ACT.recAgain = () => { P.ui.sc = 'pre'; P.ui.draft = null; P.ui.scFilled = false; draw(); };
ACT.copyAsks = () => { const asks = screeningPrompts(screeningFacts(P.ui.transcript || '')).filter(p => !p.done && p.ask).map(p => '• ' + p.ask).join('\n'); navigator.clipboard?.writeText(asks).then(() => flash('Asks copied'), () => flash(asks)); };
ACT.scFill = async () => { const c = clientForPage(); const d = P.ui.draft; await fillBoxes(d.boxes, { form: 'screening', client: c, sources: d.sources }); P.ui.scFilled = true; draw(); };
ACT.scOne = () => { P.ui.one = 0; draw(); };
ACT.scOneType = async () => { const b = P.ui.draft.boxes[P.ui.one]; await fillBoxes([b], { form: 'screening', client: clientForPage(), sources: P.ui.draft.sources }); P.ui.one++; draw(); };
ACT.scOneSkip = () => { P.ui.one++; draw(); };

// ---------- Flow B · daily note (screen 23)
// Two ways in: a dictation saved on the phone drops in when the note opens, or the staffer says (or types)
// what happened right here in the panel. Either way Psyflo drafts the boxes; the person presses Fill.
function dpnState(c) {
  const s = S(); const u = P.ui;
  const dict = M.waitingDictations(s, c.id)[0] || (u.usedDict && s.dictations.find(d => d.id === u.usedDict));
  const t = Object.values(s.timers).find(x => x.client === c.id) || s.timers[c.staff] || {};
  const blocks = (c.staff === 'khale' && t.blocks) || (s.notes_sample.find(n => n.client === c.id)?.contact_time) || [];
  const ct = contactTime(blocks, { confirmed: u.unitsConfirmed !== false });
  const input = dict ? dict.spoken : '';
  const e = input ? enhanceFor(c, input, blocks) : null;
  return { dict, ct, e, input, blocks };
}
const enhanceFor = (c, text, blocks) => { const s = S(); return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions, blocks, recent: s.notes.filter(n => n.client === c.id).map(n => n.enhanced) }); };
function dpnBoxes(c, st) {
  const e = st.e; const g = (c.goals || [])[(e?.objective || 1) - 1];
  const b = st.blocks.length ? [{ label: 'Contact time', value: st.ct.lines, src: [2] }, { label: 'Direct time', value: st.ct.text, src: [2] }, { label: 'Units', value: String(st.ct.units), src: [2] }] : [];
  if (e) {
    if (g) b.push({ label: 'Objective addressed', value: `Obj. ${g.n} – ${g.objective}`, src: [3] });
    if (e.mood) b.push({ label: 'Mood check-in', value: e.mood, src: [1] });
    if (e.progress) b.push({ label: 'Progress today', value: e.progress, src: [1] });
    const sc = schoolSentences(c);
    b.push({ label: 'Narrative', value: [e.narrative, ...sc].join(' '), src: sc.length ? [1, 2, 3, 4] : [1, 2, 3] });
  } else if (schoolSentences(c).length) b.push({ label: 'Narrative', value: schoolSentences(c).join(' '), src: [4] });
  return b;
}
const DPN_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Your timer' }, { n: 3, label: 'The plan (ISP 2.0)' }, { n: 4, label: 'School counselor · school portal' }];

// ---------- updates from school (school portal → s.shares). The counselor's report, never staff observation:
// the staffer adds it to the daily note (credited) or files it as a collateral contact, or leaves it out.
const shareKey = (sh, i) => sh.id || `idx-${i}`;
function schoolUpdates(c, { today = true } = {}) {
  const s = S();
  return (s.shares || []).map((sh, i) => ({ ...sh, key: shareKey(sh, i), used: sh.used || {} }))
    .filter(sh => sh.client === c.id && (!today || String(sh.at || '').slice(0, 10) === s.today))
    .sort((a, b) => String(a.at) < String(b.at) ? -1 : 1);
}
function shareWho(sh) { const u = (S().school_users || []).find(x => x.id === sh.by); return { name: u ? u.name : (sh.by || 'School'), role: u ? u.role : 'school staff' }; }
function shareSentence(sh) {
  const w = shareWho(sh); const t = String(sh.text || '').trim().replace(/\s+/g, ' ');
  return `Per the ${w.role} (${w.name}), reported through the school portal at ${fmtTime(sh.at)}: "${t}"`;
}
// in the note: added in this panel, or already used for today's note — unless the staffer left it out
const schoolIncluded = (c) => schoolUpdates(c).filter(sh => !(P.ui.schoolOut || []).includes(sh.key) && ((P.ui.schoolIn || []).includes(sh.key) || sh.used.daily));
const schoolSentences = c => schoolIncluded(c).map(shareSentence);
function schoolCardsHTML(c) {
  const list = schoolUpdates(c); if (!list.length) return '';
  const inc = new Set(schoolIncluded(c).map(x => x.key));
  return `<div class="tile"><div class="row"><span class="ic" style="background:#F0B44C;color:#151B24">${I.doc}</span><div><div style="font-weight:600;font-size:15px">From school today</div><div class="small muted">The counselor's report, not your observation. Psyflo credits it in the note; you decide whether it stays.</div></div></div>
    ${list.map(sh => { const w = shareWho(sh); const on = inc.has(sh.key); const out = (P.ui.schoolOut || []).includes(sh.key);
      return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(w.name)} · ${esc(w.role)}</b><span class="small muted">${fmtTime(sh.at)}</span></div>
      <div class="v" style="margin-top:2px">“${esc(sh.text)}”</div>${sh.where ? `<div class="small muted">${esc(sh.where)}</div>` : ''}
      <span class="src">School counselor · school portal</span>
      <div class="row" style="margin-top:6px;flex-wrap:wrap">${on ? `<span class="chip g">Added to today's note</span><span style="flex:1"></span><button class="btn o" style="min-height:32px" data-act="schoolOut" data-k="${esc(sh.key)}">Leave it out</button>`
        : `${out ? '<span class="chip n">Left out of the note</span>' : ''}<span style="flex:1"></span><button class="btn p" style="min-height:32px" data-act="schoolIn" data-k="${esc(sh.key)}">${out ? 'Add it back' : 'Add to the narrative'}</button>`}</div></div>`; }).join('')}
    ${inc.size ? '<div class="small muted" style="margin-top:6px">It goes in the narrative as a credited quote. Edit or delete it in Lauris like any other text.</div>' : ''}</div>`;
}
const narrativeNow = () => (P.page.form?.fields || []).find(f => f.label === 'Narrative')?.value || '';
ACT.schoolIn = async el => {
  const c = clientForPage(); const sh = schoolUpdates(c).find(x => x.key === el.dataset.k); if (!sh) return;
  P.ui.schoolIn = (P.ui.schoolIn || []).filter(k => k !== sh.key).concat([sh.key]); P.ui.schoolOut = (P.ui.schoolOut || []).filter(k => k !== sh.key);
  const sent = shareSentence(sh); const cur = narrativeNow();
  // the narrative is already in the form: append, keeping whatever the staffer typed there
  if (cur && !cur.includes(sent)) await fillBoxes([{ label: 'Narrative', value: cur.trim() + ' ' + sent, src: [4] }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false });
  if (sh.id && !sh.used.daily) await api.do('school.shareUsed', { id: sh.id, how: 'daily', by: meFromPage().id }).catch(err => flash(err.message, 'r'));
  if (!cur) flash('Added to the drafted narrative, credited to the counselor. It goes into Lauris when you press Fill.');
  draw();
};
ACT.schoolOut = async el => {
  const c = clientForPage(); const sh = schoolUpdates(c).find(x => x.key === el.dataset.k); if (!sh) return;
  P.ui.schoolOut = (P.ui.schoolOut || []).filter(k => k !== sh.key).concat([sh.key]); P.ui.schoolIn = (P.ui.schoolIn || []).filter(k => k !== sh.key);
  const sent = shareSentence(sh); const cur = narrativeNow();
  if (cur.includes(sent)) await fillBoxes([{ label: 'Narrative', value: cur.replace(sent, '').replace(/\s{2,}/g, ' ').trim() }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false });
  flash('Left out of the note. The update stays in Psyflo.', 'y');
  draw();
};
// collateral contact (screen 25): file a school update as the month's collateral contact
const SCHOOL_RELEASE = 'Release of information · school';
const schoolRelease = c => (S().consents || []).find(x => x.client === c.id && x.form === SCHOOL_RELEASE && (x.status === 'signed' || x.signed_at));
// a release Lauris already shows on the open form (green box) counts too; Psyflo leaves that box alone
const pageRelease = () => ((P.page?.form?.fields || []).find(f => /^release/i.test(f.label)) || {}).value || '';
function collateralBoxes(c, sh) {
  const w = shareWho(sh); const rel = schoolRelease(c);
  const b = [{ label: 'Date', value: usDate(sh.at), src: [1] }, { label: 'Collateral', value: `${w.name}, ${w.role}`, src: [1] }, { label: 'Method', value: 'School portal message', src: [1] }];
  if (rel && !pageRelease()) b.push({ label: 'Release on file', value: `School release on file · signed ${fmtDate(rel.signed_at)}`, src: [2] });
  b.push({ label: 'Information shared / received', value: `Received from ${w.name} (${w.role}): ${String(sh.text).trim()}`, src: [1] });
  return b;
}
const COLL_SOURCES = [{ n: 1, label: 'School portal' }, { n: 2, label: 'Signed release (parent portal)' }];
function schoolCollateralHTML(c) {
  const all = schoolUpdates(c, { today: false }); const list = all.filter(sh => !sh.used.collateral || (P.ui.collDone || []).includes(sh.key));
  if (!list.length) return '';
  const rel = schoolRelease(c); const onPage = pageRelease();
  return `<div class="tile" style="margin-bottom:8px"><div style="font-weight:600;font-size:15px">Updates from school · not yet a collateral contact</div>
    <div class="small muted">The counselor's messages through the school portal. Psyflo fills the contact boxes; you write the coordination and press Process Form.</div>
    ${rel || onPage ? `<div class="small" style="margin-top:6px">${I.ok} Release on file${onPage ? ' in Lauris: ' + esc(onPage) : ' · signed ' + esc(fmtDate(rel.signed_at)) + ' on the parent portal'}.</div>` : `<div class="banner y" style="margin-top:8px">${I.warn}<div><b>No signed school release for ${esc(c.initials.replace(/\.$/, ''))}.</b> A release is needed before this counts as a collateral contact; Psyflo leaves "Release on file" blank.</div></div>`}
    ${list.map(sh => { const w = shareWho(sh); const done = sh.used.collateral;
      return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(w.name)} · ${esc(w.role)}</b><span class="small muted">${fmtDate(sh.at)} ${fmtTime(sh.at)}</span></div>
      <div class="v" style="margin-top:2px">“${esc(sh.text)}”</div>
      <div class="row" style="margin-top:4px;flex-wrap:wrap">${collateralBoxes(c, sh).map(b => `<span class="src" title="${esc(b.label)}: ${esc(b.value)}">${esc(b.label)} · ${esc(COLL_SOURCES.find(x => x.n === b.src[0]).label)}</span>`).join('')}</div>
      <div class="row" style="margin-top:6px">${done ? '<span class="chip g">Filled as a collateral contact</span><span style="flex:1"></span>' : '<span style="flex:1"></span>'}<button class="btn ${done ? 'o' : 'p'}" style="min-height:32px" data-act="collFill" data-k="${esc(sh.key)}" ${P.ui.filling ? 'disabled' : ''}>${done ? 'Type it again' : 'Fill as collateral contact'}</button></div></div>`; }).join('')}
    <div class="small muted" style="margin-top:6px">Coordination is left for you.</div></div>`;
}
ACT.collFill = async el => {
  const c = clientForPage(); const sh = schoolUpdates(c, { today: false }).find(x => x.key === el.dataset.k); if (!sh) return;
  const r = await fillBoxes(collateralBoxes(c, sh), { form: 'collateral', client: c, sources: COLL_SOURCES });
  if (r.error) return;
  P.ui.collDone = (P.ui.collDone || []).concat([sh.key]);
  if (sh.id && !sh.used.collateral) await api.do('school.shareUsed', { id: sh.id, how: 'collateral', by: meFromPage().id }).catch(err => flash(err.message, 'r'));
  draw();
};
const DPN_EXAMPLE = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
function sayItHTML(kind, prompt) {
  const u = P.ui;
  if (u.recKind === kind && P.rec) {
    const dur = Math.floor((Date.now() - (u.recStart || Date.now())) / 1000);
    return `<div class="banner n"><span class="rec on"></span><div style="flex:1"><b>Listening · ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}</b> · microphone · say what happened, then Stop</div></div>
      <div class="tx">${esc(u.transcript || '')}${u.interim ? (u.transcript ? '\n' : '') + esc(u.interim) : ''}${!u.transcript && !u.interim ? '<span class="muted">…</span>' : ''}</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="sayStop" data-k="${kind}">Stop and draft</button><button class="btn o" data-act="sayCancel">Cancel</button></div>`;
  }
  return `<div class="tile t"><div class="row"><span class="ic" style="background:#217A78;color:#fff">${I.mic}</span><div><div style="font-weight:600;font-size:15px">Say what happened</div><div class="small muted">${esc(prompt)}</div></div></div>
    <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn p" style="flex:1" data-act="sayMic" data-k="${kind}">${I.mic} Record (microphone)</button>${kind === 'dpn' && clientForPage()?.id === 'MR' ? '<button class="btn o" data-act="sayExample" data-k="dpn">Use the example</button>' : ''}</div>
    <div class="lab" style="margin-top:10px">Or type it</div>
    <textarea class="ed" aria-label="What happened" data-in="sayText" placeholder="${kind === 'incident' ? 'e.g. at recess he pushed a peer; no one was hurt; I separated them and walked him inside' : 'e.g. worked on taking a break before leaving the room; he used it twice'}">${esc(u.said || '')}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn o" style="flex:1" data-act="sayDraft" data-k="${kind}">Draft it</button></div>
    <div class="small muted" style="margin-top:4px">${hasSpeech() ? 'The microphone uses the browser\'s speech recognition; nothing is recorded until you press Record.' : 'Speech recognition is not available in this browser — type it instead.'}</div></div>`;
}
function dpnView(c) {
  const s = S(); const u = P.ui; const st = dpnState(c); const e = st.e;
  const nt = M.notesToday(s, c.staff || 'khale');
  const fromPhone = st.dict && st.dict.source !== 'panel';
  let html = header(`Scribe · Daily note · ${c.initials} · ${M.staffShort(s, c.staff || meFromPage().id)}`) + '<div class="body">' + flashHTML();
  if (fromPhone && !u.dropped && st.dict.status === 'waiting') html += `<div class="banner y">${I.mic}<div><b>1 dictation waiting</b> from the phone · ${fmtTime(st.dict.at)}. Dropping it into the open form…</div></div>`;
  if (u.dropped) html += `<div class="banner">${I.ok}<div><b>${fromPhone ? 'Dictation dropped in' : 'Boxes typed'}</b> · narrative and contact-time rows typed into the open form, yellow. Confirm the units, then press Save Form Data or Process Form — Psyflo keeps what you save.</div></div>`;
  if (!st.dict) html += sayItHTML('dpn', `One or two sentences about what you did with ${c.initials} today. Psyflo writes the note from it, the plan and your timer.`);
  else html += `<div class="tile"><div class="lab row" style="gap:6px">${I.mic}${fromPhone ? 'Said into the phone, ' + fmtTime(st.dict.at) : 'Said here, ' + fmtTime(st.dict.at)}${!fromPhone && st.dict.status === 'waiting' ? '<a href="#" class="chip n" style="margin-left:auto" data-act="sayAgain">Say it again</a>' : ''}</div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(st.input)}”</div></div>`;
  html += schoolCardsHTML(c);
  const sc = schoolSentences(c);
  if (e || sc.length) {
    html += `<div><div class="lab" style="margin-bottom:4px">Drafted for the narrative</div><div class="par">${esc([e?.narrative, ...sc].filter(Boolean).join(' '))}</div></div>
    <div><div class="lab">What Psyflo added, and where it came from</div>${(e?.chips || []).map(ch => `<div class="sec"><b>${esc(ch.text)}</b><span class="chip g">${esc(ch.from)}</span></div>`).join('')}${sc.length ? `<div class="sec"><b>the counselor's report, quoted and credited</b><span class="chip y">School counselor · school portal</span></div>` : ''}</div>`;
  }
  html += `<div><div class="lab">Contact time · from your timer</div>${st.ct.rows.map(r => `<div class="stamp"><div>${fmtT(r.from)}–${fmtT(r.to)}</div><div>${esc(r.what)}${r.unconfirmed ? ` <span class="chip ${u.unitsConfirmed ? 'g' : 'y'}">${u.unitsConfirmed ? 'confirmed' : 'unconfirmed'}</span>` : ''}</div></div>`).join('') || '<div class="small muted">No timer blocks today · type the contact time in Lauris.</div>'}
    ${st.ct.rows.length ? `<div class="sec"><b>Direct time ${esc(st.ct.text)} → ${st.ct.units} units</b>${u.unitsConfirmed ? '<span class="chip g">confirmed</span>' : `<button class="btn p" style="min-height:32px" data-act="confirmUnits">Confirm ${contactTime(st.blocks, { confirmed: true }).units} units</button>`}</div>` : ''}
    ${!u.unitsConfirmed && st.ct.rows.some(r => r.unconfirmed) ? `<button class="btn o" style="min-height:32px" data-act="dropBlock">The afternoon block didn't happen</button>` : ''}</div>`;
  if (e) html += `<div class="row"><button class="btn p" style="flex:1" data-act="dpnFill" ${u.filling ? 'disabled' : ''}>${u.dropped ? 'Type it again' : 'Fill the boxes'}</button></div>
    ${feedbackHTML(st.dict)}
    ${checksBlock(e.checks)}`;
  else if (sc.length && !narrativeNow()) html += `<div class="row"><button class="btn o" style="flex:1" data-act="dpnFill" ${u.filling ? 'disabled' : ''}>Fill the narrative now</button></div>`;
  html += `<div class="small muted">Daily notes today (${esc(M.staffShort(s, c.staff || 'khale'))}): ${nt.done} of ${nt.total}.</div>`;
  return html + '</div>' + foot();
}
// "Good recommendation" / "Needs improvement" + how to improve; stored with the dictation and, once processed, the note
function feedbackHTML(dict) {
  const u = P.ui; const prev = (dict?.feedback || []).at(-1);
  if (!u.fbDone && prev && !u.fbOpen) return `<div class="banner n">${I.ok}<div>${prev.kind === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(prev.text)}”.`} Your supervisor sees it with the note. <a href="#" data-act="needsImp">Add more</a></div></div>`;
  if (u.fbDone) return `<div class="banner n">${I.ok}<div>${u.fbDone === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(u.fbSent || '')}”.`} Your supervisor sees it with the note.</div></div>`;
  return `<div class="row"><button class="btn o" style="flex:1" data-act="goodRec">Good recommendation</button><button class="btn o${u.fbOpen ? ' on' : ''}" style="flex:1" data-act="needsImp">Needs improvement</button></div>
    ${u.fbOpen ? `<div class="tile"><div class="lab">How should Psyflo improve it?</div><textarea class="ed" aria-label="How to improve" data-in="fbText" placeholder="e.g. wrong objective · too long · he did not walk off the court">${esc(u.fbText || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn p" style="flex:1" data-act="fbSend">Save feedback</button><button class="btn o" data-act="fbCancel">Cancel</button></div></div>` : ''}`;
}
const fmtT = hhmm => { let [h, m] = hhmm.split(':').map(Number); h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}`; };
ACT.confirmUnits = async () => { P.ui.unitsConfirmed = true; const c = clientForPage(); const st = dpnState(c); await fillBoxes([{ label: 'Direct time', value: st.ct.text }, { label: 'Units', value: String(st.ct.units) }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false }); flash(`${st.ct.units} units confirmed (${st.ct.text}, 3 units per school day at 5 h or more).`); };
ACT.dropBlock = async () => { P.ui.unitsConfirmed = false; P.ui.blockDropped = true; const c = clientForPage(); const st = dpnState(c); await fillBoxes([{ label: 'Contact time', value: st.ct.lines }, { label: 'Direct time', value: st.ct.text }, { label: 'Units', value: String(st.ct.units) }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false }); };
ACT.dpnFill = async () => { const c = clientForPage(); const st = dpnState(c); await fillBoxes(dpnBoxes(c, st), { form: 'dpn', client: c, sources: DPN_SOURCES }); P.ui.dropped = true; draw(); };
// say it / type it, then draft (daily note and incident)
ACT.sayText = el => { P.ui.said = el.value; };
ACT.sayMic = el => micStart(el.dataset.k);
ACT.sayCancel = () => { stopRecording(true); P.ui.recKind = null; P.ui.transcript = ''; P.ui.interim = ''; draw(); };
ACT.sayStop = el => { const t = [(P.ui.transcript || '').trim(), (P.ui.interim || '').trim()].filter(Boolean).join(' '); stopRecording(true); P.ui.recKind = null; P.ui.interim = ''; if (!t) { flash('Nothing was heard. Try again, or type it.', 'y'); return; } P.ui.said = t; return sayDraft(el.dataset.k); };
ACT.sayExample = el => { P.ui.said = DPN_EXAMPLE; return sayDraft(el.dataset.k); };
ACT.sayDraft = el => sayDraft(el.dataset.k);
async function sayDraft(kind) {
  const text = (P.ui.said || '').trim(); if (!text) { flash('Say or type what happened first.', 'y'); return; }
  const c = clientForPage(); const me = meFromPage();
  if (kind === 'incident') { P.ui.incSaid = text; draw(); return; }
  const st = dpnState(c); const e = enhanceFor(c, text, st.blocks);
  const r = await api.do('panel.dictation', { client: c.id, staff: me.id, spoken: text, rewritten: e.narrative, chips: e.chips, checks: e.checks });
  P.ui.usedDict = r.id; P.ui.dropped = false; P.ui.fbDone = null; P.ui.fbOpen = false; P.ui.unitsConfirmed = false;
  draw();
}
ACT.sayAgain = async () => { const c = clientForPage(); const d = M.waitingDictations(S(), c.id).find(x => x.source === 'panel'); if (d) await api.do('dictation.discard', { id: d.id }); P.ui.usedDict = null; P.ui.said = ''; P.ui.dropped = false; P.ui.fbDone = null; draw(); };
ACT.goodRec = async () => { const c = clientForPage(); const st = dpnState(c); await api.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'good', dictation: st.dict?.id, narrative: st.e?.narrative, by: meFromPage().id }); P.ui.fbDone = 'good'; P.ui.fbOpen = false; draw(); };
ACT.needsImp = () => { P.ui.fbOpen = !P.ui.fbOpen; P.ui.fbDone = null; draw(); P.after = r => r.querySelector('[data-in=fbText]')?.focus(); };
ACT.fbText = el => { P.ui.fbText = el.value; };
ACT.fbCancel = () => { P.ui.fbOpen = false; draw(); };
ACT.fbSend = async () => {
  const text = (P.ui.fbText || '').trim(); if (!text) { flash('Say briefly how to improve it.', 'y'); return; }
  const c = clientForPage(); const st = dpnState(c);
  await api.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'needs_improvement', text, dictation: st.dict?.id, narrative: st.e?.narrative, by: meFromPage().id });
  P.ui.fbDone = 'needs_improvement'; P.ui.fbSent = text; P.ui.fbOpen = false; P.ui.fbText = ''; draw();
};

// ---------- Flow C · initial SRA (screen 17)
function sraData(c) {
  const s = S(); const sc = s.screenings.find(x => x.client === c.id && (x.facts || x.transcript));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null);
  if (!facts) return null;
  const r = s.referrals.find(x => x.id === c.referral);
  const d = draftInitialSRA({ client: c, screening: { facts, when: sc.when }, referral: r, school: (s.school_numbers || {})[c.id], today: s.today, isp: { date: c.timeline?.isp }, cna: { date: c.timeline?.intake } });
  const edited = P.ui.c1;
  if (edited != null) d.boxes = d.boxes.map(b => b.editable ? { ...b, value: edited } : b);
  return d;
}
function sraView(c) {
  const s = S(); const u = P.ui;
  let req = s.requests.find(r => r.client === c.id && r.type === 'initial' && !['closed'].includes(r.stage));
  const d = sraData(c);
  let html = header(`Review a service request · ${c.initials} · first request`) + '<div class="body">' + flashHTML();
  if (!d) return html + `<div class="banner y">${I.warn}<div>No screening call on record for ${esc(c.initials)}. Psyflo drafts the initial request only from the screening, the intake, the plan and the referral — run the screening first.</div></div><button class="btn o" data-act="nav" data-href="/consumers/${P.page.consumer.no}/session/screening">Open Admission Screening</button></div>` + foot();
  if (req && !['draft_ready', 'awaiting_signature'].includes(req.stage)) html += `<div class="banner n">${I.open}<div>${esc(req.id)} is ${esc(M.STAGE_LABEL[req.stage].toLowerCase())}. This form was already processed.</div></div>`;
  const c1 = d.boxes.find(b => b.editable);
  const filled = new Set(u.filled || []);
  const st = b => filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : '<span class="chip g">drafted</span>';
  const lvl = (P.page.form?.fields || []);
  const greenGoals = lvl.filter(f => /^Goal \d/.test(f.label) && f.green && f.value).length;
  html += `<div class="tile t"><div style="font-size:13px"><b>Draft ready for ${esc(c.initials)}</b> — written from the screening (${fmtDate(s.screenings.find(x => x.client === c.id)?.when)}), the intake${c.timeline?.intake ? ' (' + fmtDate(c.timeline.intake) + ')' : ''}, the plan${c.timeline?.isp ? ' (' + fmtDate(c.timeline.isp) + ')' : ''} and the referral.${req ? ' Tracked as ' + esc(req.id) + '.' : ''}</div>
      <div class="lab" style="margin-top:10px">Criterion 1 · relationships — edit here</div>
      <textarea class="ed" aria-label="Criterion 1 draft" data-in="c1Edit">${esc(c1.value)}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="sraFill" ${u.filling ? 'disabled' : ''}>Fill all ${d.boxes.length} boxes</button><button class="btn o" data-act="sraOne">One at a time</button></div></div>
    ${u.one != null ? oneAtATime(d.boxes, 'sraOneType', 'sraOneSkip') : ''}
    <div><div class="lab" style="margin-bottom:2px">Boxes on this form</div>
      ${d.boxes.map(b => `<div class="sec"><b>${esc(b.short || b.label)} ${srcChips(b, d.sources)}</b>${st(b)}</div>`).join('')}
      ${d.blank.map(b => `<div class="sec"><b>${esc(b.short || b.label)}</b><span class="chip n">${esc(b.why.split('·')[0].trim())}</span></div>`).join('')}
      <div class="sec"><b>Goals 1–3 · strengths</b><span class="chip g">${greenGoals ? 'already in Lauris (from the ISP)' : 'copied from the ISP when it is processed'}</span></div></div>
    ${d.blank.filter(b => /criterion 3/.test(b.label)).map(b => `<div class="banner n">${I.open}<div>${esc(b.why)}.</div></div>`).join('')}
    ${checksBlock(d.checks)}
    <div class="small muted">Then press <b>Process Form</b> in Lauris. It goes to Forms to Approve for your signature; Psyflo never signs.</div>`;
  return html + '</div>' + foot();
}
ACT.c1Edit = el => { P.ui.c1 = el.value; };
ACT.sraFill = async () => { const c = clientForPage(); const d = sraData(c); await fillBoxes(d.boxes, { form: 'sra-initial', client: c, sources: d.sources }); draw(); };
ACT.sraOne = () => { P.ui.one = 0; draw(); };
ACT.sraOneType = async () => { const c = clientForPage(); const d = sraData(c); await fillBoxes([d.boxes[P.ui.one]], { form: 'sra-initial', client: c, sources: d.sources }); P.ui.one++; draw(); };
ACT.sraOneSkip = () => { P.ui.one++; draw(); };

// ---------- intake / CNA (screen 15), live after Flow A
const PHQ = ['1', '1', '0', '1', '0', '0', '1', '0', '0'];
function cnaView(c) {
  const s = S(); const u = P.ui; const sc = s.screenings.find(x => x.client === c.id && (x.boxes || x.facts));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null);
  const screening = sc ? { facts, boxes: sc.boxes || (sc.transcript ? draftScreening({ transcript: sc.transcript, today: s.today }).boxes : []), when: sc.when } : null;
  const d = draftSeeded('cna', { client: c, screening, today: s.today });
  const phq = PHQ.map((v, i) => ({ label: `PHQ item ${i + 1}`, value: v, src: [3] }));
  const boxes = d.boxes.concat(phq);
  const rec = u.cnaRec !== false;
  let html = header(`Scribe · Intake (CNA) · ${c.initials} · ${meFromPage().name}`) + '<div class="body">' + flashHTML();
  html += `<div class="banner n"><span class="rec ${rec ? 'on' : ''}"></span><div style="flex:1"><b>${rec ? 'Recording' : 'Paused'} · intake conversation</b> · consent signed${s.consents.find(x => x.client === c.id) ? ' ' + fmtDate(s.consents.find(x => x.client === c.id).signed_at) : ''}</div><button class="tog" data-act="cnaPause">${rec ? 'Pause' : 'Resume'}</button></div>`;
  if (!screening) html += `<div class="banner y">${I.warn}<div>No screening on record — presenting issue and prior services cannot be copied. Run the screening first.</div></div>`;
  html += `<div><div class="row"><div class="lab" style="flex:1">CNA fields</div><span class="chip g">${boxes.length} drafted</span><span class="chip n">1 for you</span></div>
    ${d.boxes.map(b => `<div class="box"><div class="l">${esc(b.label)} ${b.copied ? '<span class="chip y" style="background:#E6F4EA;color:#15605E;border:1px solid #E8C56A">copied from screening</span>' : ''}</div><div class="v">${esc(b.value || '—')}</div>${b.note ? `<div class="small" style="color:#6F4A05">← ${esc(b.note)}</div>` : ''}</div>`).join('')}
    <div class="box"><div class="l">PHQ-9 · answers from the interview</div><div class="v">${PHQ.join(' · ')} — item 9 asked directly. Lauris scores on Process Form.</div></div>
    ${d.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join('')}</div>
    <div><div class="lab">Still to ask</div>
      <div class="stamp"><div><b>Dates</b></div><div>Outpatient at Piedmont: confirm start and end month, and whether it was through secondary insurance</div></div>
      <div class="stamp"><div><b>Danger</b></div><div>Does he understand the risk when he leaves the building? (criterion 3)</div></div>
      <div class="stamp"><div><b>Collateral</b></div><div>Releases: school counselor, pediatrician, previous outpatient provider</div></div></div>
    ${checksBlock(d.checks)}
    <div class="row"><button class="btn p" style="flex:1" data-act="cnaFill" ${u.filling ? 'disabled' : ''}>Fill ${boxes.length} boxes</button><button class="btn o" data-act="cnaOne">Review one by one</button></div>
    ${u.one != null ? oneAtATime(boxes, 'cnaOneType', 'cnaOneSkip') : ''}`;
  P.cnaBoxes = { boxes, sources: d.sources };
  return html + '</div>' + foot();
}
ACT.cnaPause = () => { P.ui.cnaRec = P.ui.cnaRec === false; draw(); };
ACT.cnaFill = async () => { await fillBoxes(P.cnaBoxes.boxes.filter(b => b.value), { form: 'cna', client: clientForPage(), sources: P.cnaBoxes.sources }); draw(); };
ACT.cnaOne = () => { P.ui.one = 0; draw(); };
ACT.cnaOneType = async () => { await fillBoxes([P.cnaBoxes.boxes[P.ui.one]], { form: 'cna', client: clientForPage(), sources: P.cnaBoxes.sources }); P.ui.one++; draw(); };
ACT.cnaOneSkip = () => { P.ui.one++; draw(); };

// ---------- seeded forms: the canvas panel, wired (screens 16, 24, 25, 26, 32, 33, 37)
const SEEDED = { isp: ['ExtISP', 'TW'], weekly: ['ExtWeekly', 'MR'], collateral: ['ExtMonthly', 'MR'], incident: ['ExtIncident', 'DW'], quarterly: ['ExtQuarterly', 'MR'], 'sra-continued': ['ExtCase', 'MR'], discharge: ['ExtDischarge', 'DW'] };
const seededCache = {};
function seededView(type, c) {
  const s = S(); const [file, who] = SEEDED[type] || [];
  if (!file) return header('Psyflo') + `<div class="body"><div class="banner n">${I.open}<div>Psyflo has no draft for this form.</div></div></div>` + foot();
  const scr = seededCache[file];
  if (!scr) { loadScreen(file + '.dc.html').then(x => { seededCache[file] = x; draw(); }); return header('Psyflo · ' + FORM_NAME[type]) + '<div class="body">Loading…</div>'; }
  const sample = M.client(s, who);
  if (type === 'incident' && c.id !== who) return incidentSayView(c);
  if (c.id !== who) {
    return header(`Psyflo · ${FORM_NAME[type]} · ${c.initials}`) + `<div class="body">${flashHTML()}${type === 'collateral' ? schoolCollateralHTML(c) : ''}<div class="banner n">${I.open}<div><b>No draft for ${esc(c.initials)} in this demo.</b> Psyflo drafts the ${esc(FORM_NAME[type].toLowerCase())} from ${type === 'weekly' || type === 'collateral' ? 'the recorded call' : 'the notes in range'}; the worked example is ${esc(sample.initials)}.</div></div>
      ${sample.harvest_no || sample.lauris_no ? `<button class="btn o" data-act="nav" data-href="/consumers/${sample.lauris_no || sample.harvest_no}/session/${type}">Open ${esc(sample.initials)}'s ${esc(FORM_NAME[type].toLowerCase())}</button>` : ''}</div>` + (type === 'quarterly' ? internalQuarterlyHTML(c) : '') + foot();
  }
  const key = 'seeded:' + type;
  if (!P.ui[key]) { const Comp = scr.Component; P.ui[key] = Comp ? new Comp({}) : { state: {}, renderVals: () => ({}) }; P.ui[key].setState = function (x) { Object.assign(this.state, x); draw(); }; }
  const inst = P.ui[key]; const vals = inst.renderVals ? inst.renderVals() : {};
  const d = seededDraft(type, c, inst);
  P.seeded = { type, d, inst };
  // take the canvas aside, drop its own header/legend (we draw ours), keep the body
  let a = scr.aside; const bodyStart = a.indexOf('<div style="padding:12px 16px');
  a = bodyStart > 0 ? a.slice(bodyStart) : a;
  a = a.replace(/<\/aside>\s*$/, '');
  const handlers = [];
  const htmlBody = render(a, vals, handlers);
  P.after = rootEl => wireSeeded(rootEl, handlers, type, c, d);
  const status = `<div style="padding:8px 16px 0">${flashHTML()}${P.event && P.event.event === 'saved' ? savedHTML() : ''}${type === 'collateral' ? schoolCollateralHTML(c) : ''}</div>`;
  const extra = `<div style="padding:0 16px 14px">${checksBlock(d.checks)}${d.alsoNoted ? '' : ''}</div>`;
  const fam = type === 'quarterly' ? `<div style="padding:8px 16px 0"><div class="banner n">${I.doc}<div><b>Family version</b> · the Lauris quarterly below. The guardian sees it and signs it on the parent portal. The staff-only internal quarterly is further down and never goes into this form.</div></div></div>` : '';
  return header(`${FORM_NAME[type]} · ${c.initials}`) + status + fam + `<div class="seeded">${htmlBody}</div>` + extra + (type === 'quarterly' ? internalQuarterlyHTML(c) : '') + foot();
}
// incident for a student other than the worked example (D.W.): say what happened; Psyflo fills only what it knows
function incidentSayView(c) {
  const s = S(); const me = meFromPage(); const said = P.ui.incSaid;
  let html = header(`Scribe · Incident report · ${c.initials} · ${M.staffShort(s, me.id)}`) + '<div class="body">' + flashHTML();
  html += `<div class="banner y">${I.warn}<div>Level 2 and 3 incidents go to the state portal within 24 hours, and your supervisor reviews every incident. Psyflo fills only what you said and what it knows; the time, level, actions, CPS and injury are yours.</div></div>`;
  if (!said) return html + sayItHTML('incident', `What happened with ${c.initials}, where, and what you did. Psyflo puts your words in the report.`) + '</div>' + foot();
  const boxes = incidentBoxes(c, said);
  html += `<div class="tile"><div class="lab row" style="gap:6px">${I.mic}Said here<a href="#" class="chip n" style="margin-left:auto" data-act="incAgain">Say it again</a></div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(said)}”</div></div>
    <div class="row"><button class="btn p" style="flex:1" data-act="incFill" ${P.ui.filling ? 'disabled' : ''}>Fill ${boxes.length} boxes</button></div>
    <div><div class="lab">Boxes · where each comes from</div>${boxes.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, INC_SOURCES)}</div>`).join('')}
    ${['Date/time', 'Level', 'Actions taken', 'CPS report', 'Injury'].map(l => `<div class="box"><div class="l">${l}</div><div class="v muted">Left for you</div></div>`).join('')}</div>
    <div class="small muted">Then press Process Form in Lauris; Psyflo keeps what you save.</div>`;
  return html + '</div>' + foot();
}
const INC_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Psyflo record' }, { n: 3, label: 'Signed in as' }];
function incidentBoxes(c, said) {
  const s = S(); const me = meFromPage();
  const txt = said.charAt(0).toUpperCase() + said.slice(1).replace(/\s+$/, '');
  return [{ label: 'Location', value: M.school(s, c.school).name || '', src: [2] }, { label: 'Staff present', value: M.staffShort(s, me.id), src: [3] }, { label: 'What happened', value: /[.!?]$/.test(txt) ? txt : txt + '.', src: [1] }].filter(b => b.value);
}
ACT.incAgain = () => { P.ui.incSaid = null; P.ui.said = ''; draw(); };
ACT.incFill = async () => { const c = clientForPage(); await fillBoxes(incidentBoxes(c, P.ui.incSaid), { form: 'incident', client: c, sources: INC_SOURCES }); draw(); };
function seededDraft(type, c, inst) {
  const s = S(); const st = inst.state || {};
  return draftSeeded(type, { client: c, notes: s.notes_sample.filter(n => n.client === c.id), today: s.today, includeHousehold: st.conf ? st.conf === 'include' : true, range: st.range || '30' });
}
function wireSeeded(rootEl, handlers, type, c, d) {
  // bind the canvas Component's own handlers (date-range and include/exclude toggles)
  rootEl.querySelectorAll('[data-onclick]').forEach(el => { const h = handlers[+el.getAttribute('data-onclick')]; if (h) el.addEventListener('click', e => { e.preventDefault(); h[1](e, el); }); });
  const s = S();
  rootEl.querySelectorAll('.seeded button, .seeded a.btn').forEach(b => {
    const t = (b.textContent || '').trim();
    let fn = null;
    if (/^Fill/.test(t)) fn = () => fillBoxes(d.boxes, { form: type, client: c, sources: d.sources }).then(() => draw());
    else if (/One at a time|one at a time|one by one/i.test(t)) fn = async () => { for (const box of d.boxes) { await call('focus', { label: box.label }); await fillBoxes([box], { form: type, client: c, sources: d.sources }); } };
    else if (/^(Stop|Record|Pause|Resume)/.test(t)) fn = () => { P.ui.recStopped = !P.ui.recStopped; b.textContent = P.ui.recStopped ? 'Record' : 'Stop'; const dot = b.closest('div')?.querySelector('span[style*="border-radius:50%"]'); flash(P.ui.recStopped ? 'Recording stopped · the boxes below are drafted from it' : 'Recording'); };
    else if (/state portal/i.test(t)) fn = async () => { const idx = s.incidents.findIndex(i => i.client === c.id && i.level === 2); window.open(`${api.config.extURL}/state-portal/incident?client=${encodeURIComponent(c.initials)}&level=Level%202&what=${encodeURIComponent(d.boxes.find(x => x.label === 'What happened')?.value || '')}`, '_blank', 'noopener'); if (idx >= 0) await api.do('incident.filePortal', { index: idx }); flash('State portal opened in a new tab · the time you pressed it is logged on Compliance.'); };
    else if (/Pick dates/.test(t)) fn = () => flash('Date picker: use Last 30 days or Whole period in the demo.', 'y');
    else if (/Include|Exclude|Last 30|Whole period/.test(t)) fn = null; // canvas Component handles these
    else if (/guardian signature|parent portal/i.test(t)) fn = async () => { await api.do('portalTask.create', { client: c.id, form: 'Quarterly report', why: 'Guardian signature' }); flash('Guardian signature sent to the parent portal.'); };
    if (fn) b.addEventListener('click', e => { e.preventDefault(); fn(); });
  });
  rootEl.querySelectorAll('.seeded a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (/\.dc\.html/.test(h)) a.addEventListener('click', e => { e.preventDefault(); window.open(appURL('#/' + h.replace('.dc.html', '')), '_blank', 'noopener'); });
  });
  // guardian signature for the quarterly is a canvas row; add the action under it
  if (type === 'quarterly' && !rootEl.querySelector('[data-qsig]')) {
    const host = rootEl.querySelector('.seeded > div'); if (host) host.insertAdjacentHTML('beforeend', `<div data-qsig style="display:flex;flex-direction:column;gap:6px">${familySignHTML(c)}</div>`);
  }
  if (type === 'isp' && !rootEl.querySelector('[data-isp-sign]')) {
    const host = rootEl.querySelector('.seeded > div'); if (host) host.insertAdjacentHTML('beforeend', `<div data-isp-sign style="display:flex;flex-direction:column;gap:6px">${ispSignHTML(c)}</div>`);
  }
  if (type === 'discharge' && !rootEl.querySelector('[data-act=planLink]')) {
    const host = rootEl.querySelector('.seeded > div'); if (host) host.insertAdjacentHTML('beforeend', `<button class="btn o" data-act="openApp" data-href="#/EarlyDischarge?id=R-0402">Open the early-discharge plan in Psyflo ↗</button>`);
  }
}
ACT.qsig = async el => { el.disabled = true; await api.do('portalTask.create', { client: clientForPage().id, form: 'Quarterly report', why: 'Guardian signature' }); flash('Family version sent to the parent portal for the guardian\'s signature · pending until the guardian signs.'); };
function familySignHTML(c) {
  const t = (S().portal_tasks || []).filter(x => x.client === c.id && x.form === 'Quarterly report').at(-1); const g = c.guardian?.name || 'the guardian';
  const head = `<div class="lab">Family version · guardian signs on the parent portal</div>`;
  if (t && t.status === 'signed') return head + `<div class="banner">${I.ok}<div><b>Signed by ${esc(g)}</b> on the parent portal.</div></div>`;
  if (t) return head + `<div class="banner y">${I.clock}<div><b>Sent to the parent portal</b> · ${fmtDate(t.at)} · waiting for ${esc(g)} to sign.</div></div>`;
  return head + `<button class="btn o" data-act="qsig">Send the family version for the guardian's signature</button>`;
}

// ---------- internal quarterly · staff only (screen 32). Stays in Psyflo: never typed into Lauris, never on the
// parent portal, never in a request packet, never in client.quarter.
const IQ_FIELDS = [['concerns', 'Concerns not yet evidenced', 'e.g. something you have noticed but cannot document yet'], ['home', 'Family / home context', 'What is going on at home that affects the work'], ['plan', 'Plan for next quarter', 'What the team will do differently'], ['supervisor', 'Anything the supervisor should know', '']];
function iqPeriod(c) { const a = c.authorization; return a && a.start && a.end ? `${fmtDate(a.start)} – ${fmtDate(a.end)}` : `Quarter to ${fmtDate(S().today)}`; }
function iqSaved(c) { return (S().internal_quarterlies || []).filter(x => x.client === c.id && x.period === iqPeriod(c)).at(-1); }
// suggestions from Psyflo's own notes (weekly calls, collateral, incidents); the staffer edits or clears them
function iqSuggest(c) {
  const s = S(); const notes = (s.notes_sample || []).filter(n => n.client === c.id);
  const wk = notes.filter(n => n.type === 'weekly_guardian').at(-1); const col = notes.filter(n => n.type === 'monthly_collateral').at(-1);
  const inc = (s.incidents || []).filter(i => i.client === c.id && /cps|disclos/i.test(i.what || '')).at(-1);
  const home = [], plan = [];
  if (c.id === 'MR') home.push('Guardian reported a change in the household on Oct 16; it coincided with the Oct 21 lunch incident.');
  if (inc) home.push(`${fmtDate(inc.date)}: ${inc.what}.`);
  if (wk && /bedtime/i.test(wk.discussed || '')) home.push('Bedtime still inconsistent (weekly guardian call).');
  if (col && /IEP review/i.test(col.shared || '')) plan.push('Harvest attends the IEP review (collateral contact with the school counselor).');
  if (c.id === 'MR') plan.push('Goal 3 has not been worked on in 6 weeks: add a structured peer game twice a week.');
  return { concerns: '', home: home.join(' '), plan: plan.join(' '), supervisor: '' };
}
function internalQuarterlyHTML(c) {
  const saved = iqSaved(c);
  if (!P.ui.iq || P.ui.iqFor !== c.id) { P.ui.iq = { ...(saved ? saved.fields : iqSuggest(c)) }; P.ui.iqFor = c.id; P.ui.iqDirty = false; }
  const f = P.ui.iq; const sug = !saved;
  return `<div style="padding:0 16px 14px"><div class="tile" style="border:2px dashed #8A2E1C;background:#FBF7F5">
    <div class="row"><span class="ic" style="background:#FBE9E4">${I.no}</span><div style="flex:1"><div style="font-weight:700;font-size:15px">Internal quarterly · staff only</div><div class="small" style="color:#8A2E1C"><b>Never sent to the guardian, the school or the insurer.</b> Not typed into any Lauris box: Lauris's quarterly form has no internal box, so this stays in Psyflo only.</div></div></div>
    <div class="small muted" style="margin-top:6px">${esc(c.initials)} · ${esc(iqPeriod(c))}${sug ? ' · suggestions from the weekly calls, collateral and incident log — edit or clear them' : ''}</div>
    ${IQ_FIELDS.map(([k, l, ph]) => `<div class="lab" style="margin-top:8px">${esc(l)}</div><textarea class="ed" style="min-height:58px" aria-label="Internal · ${esc(l)}" data-in="iqEdit" data-k="${k}" placeholder="${esc(ph)}">${esc(f[k] || '')}</textarea>`).join('')}
    <div class="row" style="margin-top:10px">${saved && !P.ui.iqDirty ? `<span class="chip g">Saved · staff only · ${fmtDate(saved.at)} ${fmtTime(saved.at)}${saved.by ? ' · ' + esc(M.staffShort(S(), saved.by)) : ''}</span><span style="flex:1"></span>` : '<span style="flex:1"></span>'}<button class="btn ${saved && !P.ui.iqDirty ? 'o' : 'p'}" data-act="iqSave">${saved ? (P.ui.iqDirty ? 'Save changes · staff only' : 'Save again') : 'Save · staff only'}</button></div></div></div>`;
}
ACT.iqEdit = el => { P.ui.iq = P.ui.iq || {}; P.ui.iq[el.dataset.k] = el.value; if (!P.ui.iqDirty) { P.ui.iqDirty = true; draw(); } };
ACT.iqSave = async () => {
  const c = clientForPage(); if (!c) return;
  await api.do('quarterly.internalSave', { client: c.id, period: iqPeriod(c), fields: P.ui.iq || {}, by: meFromPage().id });
  P.ui.iqDirty = false; flash('Internal quarterly saved in Psyflo · staff only · not sent anywhere.');
};

// ---------------------------------------------------------------- sign-off (screen 18)
function signoffView(c) {
  const s = S(); const p = P.page; const ev = P.event;
  if (p.kind === 'approvals') {
    return header('Sign-off · Forms to Approve') + `<div class="body">${flashHTML()}<div class="banner n">${I.open}<div>${(p.approvals || []).length} forms wait for a signature. Open one; Psyflo checks it against the draft before you press Get Signature.</div></div>
      ${(p.approvals || []).map(a => { const cl = s.clients.find(x => x.lauris_no === Number(a.consumer) || x.harvest_no === Number(a.consumer)); const r = cl && s.requests.find(q => q.client === cl.id && q.stage === 'awaiting_signature'); return `<div class="sec"><b>${esc(a.initials)} · ${esc(a.title)}</b>${r ? `<span class="chip y">${esc(r.id)} · Psyflo request</span>` : ''}<a href="#" class="chip g" data-act="nav" data-href="/approvals/${a.session}">open</a></div>`; }).join('')}</div>` + foot();
  }
  const pv = p.preview || {}; const type = pv.form;
  const req = c && s.requests.find(r => r.client === c.id && ((type === 'sra-initial' && r.type === 'initial') || (type === 'sra-continued' && r.type !== 'initial')) && !['closed'].includes(r.stage));
  const signedNow = ev && ev.event === 'signed';
  let html = header(`Sign · ${c ? c.initials : ''} · ${pv.title || 'form'}`) + '<div class="body">' + flashHTML();
  if (signedNow || pv.signed) {
    const file = ev?.result?.file || (req && req.signed_pdf ? { url: req.signed_pdf, name: req.signed_name } : null);
    html += `<div class="banner">${I.ok}<div><b>Signed in Lauris.</b> ${file ? 'Psyflo saved the signed preview as PDF and assembled the packet.' : 'Psyflo logged the signature.'}</div></div>
      ${file ? `<a class="btn o" href="${esc(file.url)}" target="_blank" rel="noopener">${I.doc} ${esc(file.name || 'Signed PDF')}</a>` : ''}
      ${req ? `<div class="row"><a class="btn p" style="flex:1" href="${esc(appURL('#/Submission?id=' + req.id))}" target="_blank" rel="noopener">After signing: open Send ↗</a></div><div class="small muted">${esc(M.payerShort(s, req.payer))} · ${esc(M.CHANNEL_LABEL[req.channel])}. You press Send in Psyflo${req.channel === 'fax' ? '; it faxes through Harvest\'s Sfax account.' : '; it opens the portal in your own login with the packet ready.'}</div>` : ''}`;
    return html + '</div>' + foot();
  }
  // before signing: compare the preview with what Psyflo typed
  const typed = req?.typed_boxes || [];
  const fills = (s.fills || []).filter(f => c && f.client === c.id && f.form === type).flatMap(f => f.boxes.map(b => b.label));
  const d = c && type === 'sra-initial' ? sraData(c) : null;
  let edits = 0; if (d) for (const b of d.boxes) { const row = (pv.rows || []).find(r => r.label === b.label); if (row && row.value !== b.value) edits++; }
  const limit = req?.limit_30 ? daysBetween(s.today, req.limit_30) : null;
  html += `<div><div class="lab" style="margin-bottom:4px">Before you sign</div>
    <div class="ck">${edits ? I.warn : I.ok}<div>${d ? (edits ? `${edits} box${edits === 1 ? '' : 'es'} changed after Psyflo typed ${edits === 1 ? 'it' : 'them'} · that is fine, you are the author` : 'Every box matches the draft you approved · 0 edits since') : `${new Set(fills.concat(typed)).size} boxes were typed by Psyflo`}</div></div>
    ${d ? `<div class="ck">${I.ok}<div>2 of 3 criteria · level of care shown · dates within 30 days</div></div>` : ''}
    ${limit != null ? `<div class="ck">${limit > 7 ? I.ok : I.warn}<div>${limit} days left to the 30-day limit</div></div>` : ''}</div>
    <div><div class="lab" style="margin-bottom:4px">After you sign</div>
    <div class="stamp"><div>Psyflo</div><div>Saves the signed preview as PDF</div></div>
    <div class="stamp"><div>Packet</div><div>${req ? (req.channel === 'fax' ? `Form + cover sheet · ${esc(M.payerShort(s, req.payer))} fax` : `Form${req.payer === 'uhc' ? ' + CNA + ISP' : ''} · ready for ${esc(M.CHANNEL_LABEL[req.channel])}`) : 'Kept with the record in Psyflo'}</div></div>
    <div class="stamp"><div>You</div><div>${req ? 'Press Send in Psyflo' : 'Nothing else'}</div></div></div>
    <div class="small muted">Press <b>Get Signature</b> in Lauris. Psyflo never signs.</div>`;
  return html + '</div>' + foot();
}

// ---------------------------------------------------------------- automatic behaviour on open
// Typing happens only into the form the user has open, and only where the brief says it drops in:
// the screening's pre-call boxes and a waiting phone dictation.
async function autoActions() {
  const p = P.page; if (!p || p.kind !== 'session') return;
  const c = clientForPage(); if (!c) return;
  const key = p.url + '|' + (p.form?.session || 'new');
  if (P.autoDone === key) return; P.autoDone = key;
  const lvl = LEVEL[meFromPage().role];
  if (p.form.type === 'screening' && lvl >= 3) {
    const pre = preCallBoxes(c).filter(b => !(p.form.fields.find(f => f.label === b.label)?.value));
    if (pre.length) { await fillBoxes(pre, { form: 'screening', client: c, sources: PRE_SOURCES }); P.ui.preFilled = true; draw(); }
    else P.ui.preFilled = true;
  }
  if (p.form.type === 'sra-initial' && lvl >= 3 && !S().requests.some(r => r.client === c.id && r.type === 'initial' && r.stage !== 'closed')) {
    await api.do('request.ensure', { id: c.id === 'TW' ? 'R-0416' : undefined, client: c.id, type: 'initial' }).catch(() => { });
  }
  if (p.form.type === 'dpn') {
    const d = M.waitingDictations(S(), c.id)[0];
    const narrative = p.form.fields.find(f => f.label === 'Narrative')?.value;
    if (d && !narrative) {
      P.ui.usedDict = d.id; P.ui.unitsConfirmed = false;
      const st = dpnState(c);
      await fillBoxes(dpnBoxes(c, st), { form: 'dpn', client: c, sources: DPN_SOURCES });
      P.ui.dropped = true; draw();
    }
  }
}

// ---------------------------------------------------------------- boot
window.__psyfloPanel = P;
(async function boot() {
  await api.init('');
  P.logo = (await fetch('/js/logo.svg').then(r => r.text())).replace(/width="\d+" height="\d+"/, 'width="78" height="26"');
  api.onChange(() => draw());
  if (framed) {
    send({ cmd: 'hello' });
    const r = await call('hello');
    if (r && r.page) onPage(r.page, r.event);
  }
  draw();
})();
