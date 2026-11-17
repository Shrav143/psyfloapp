// The Psyflo extension panel for Community Counseling Center of Southern Nevada (adult SUD · ASAM). Same code in the MV3 side panel and in
// the mock Client Record in-page fallback: it talks to the page bridge with postMessage (the side panel relays to the
// content script). It reads the page the user has open, drafts from Psyflo's own records, and types into the open form
// only when the user presses a button. It never presses Process Form, Get Signature or Send.
// Box labels must match server/lauris/forms.js (the bridge fills by label text).
import { api } from '../js/api.js';
import { esc } from '../js/runtime.js';
import * as M from '../js/shared/model.js';
import { draftScreening, screeningFacts, screeningPrompts, enhanceDictation, contactTime, draftInitialSRA, draftAssessment, draftPlan, draftContinuedStay, draftSeeded, PHQ_TW, SEEDED_SAMPLE, DIMENSIONS, dimLabel, LEVEL_OPTION, levelFromRatings, udsAtAssessment } from '../js/shared/draft.js';
import { fmtDate, fmtTime, daysBetween } from '../js/shared/dates.js';

const root = document.getElementById('panel');
const P = { page: null, event: null, ui: {}, rec: null, logo: '' };
const FORM_NAME = { screening: 'Intake screening', cna: 'ASAM assessment', isp: 'Treatment plan', dpn: 'IOP group note', weekly: 'Weekly collateral update', collateral: 'Collateral contact', quarterly: 'Plan review (90-day)', incident: 'Incident report', 'sra-initial': 'Prior authorization request', 'sra-continued': 'Continued stay request', discharge: 'Discharge / transfer summary' };
const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
// what counselors record from the extension; the timer is optional
const DS_TASKS = [['dpn', 'IOP group note'], ['weekly', 'Weekly collateral update'], ['collateral', 'Collateral contact'], ['incident', 'Incident report']];
const CLIN_FORMS = ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'];
const PAYER_SHORT = { humana: 'SilverSummit', anthem: 'Anthem', sentara: 'Molina', aetna: 'CareSource', uhc: 'HPN', ffs: 'NV Medicaid FFS' };
const payerShort = id => PAYER_SHORT[id] || (id ? M.payerShort(S(), id) : '');

// ---------------------------------------------------------------- transport to the page bridge
let seq = 0; const waiting = new Map();
const framed = window.parent !== window;
function send(msg) { if (framed) window.parent.postMessage(Object.assign({ psyflo: 'panel' }, msg), '*'); }
function call(cmd, args = {}) {
  return new Promise(res => { const id = ++seq; waiting.set(id, res); send(Object.assign({ cmd, id }, args)); setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res({ error: 'The Client Record page did not answer' }); } }, 20000); });
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
const tryOr = (fn, d = null) => { try { return fn(); } catch (e) { return d; } };
const eligibility = r => r ? tryOr(() => M.eligibilityFor(S(), r.id)) : null;
const waitingAssess = c => tryOr(() => M.waitingAssessments(S(), c.id), []) || [];
const waitingDict = c => tryOr(() => M.waitingDictations(S(), c.id), []) || [];
const site = id => tryOr(() => M.school(S(), id), { name: '' }) || { name: '' };
const partnerOf = r => { const u = r && (S().school_users || []).find(x => x.id === r.referred_by); return u ? { name: u.name, role: u.role || '' } : null; };
const SOURCE_BY_PARTNER = { rbell: 'Clark County drug court', okafor: 'Nevada Parole & Probation (P&P)' };
const SOURCE_LABEL = { drug_court: 'Clark County drug court', pp: 'Nevada Parole & Probation (P&P)', self: 'Self-referral', hospital_ed: 'Hospital ED / UMC', hiv_clinic: 'HIV clinic partner' };
const refSource = r => r ? (r.source_label || SOURCE_LABEL[r.source] || r.source || SOURCE_BY_PARTNER[r.referred_by] || (partnerOf(r)?.role || '')) : '';
const channel = r => tryOr(() => M.channelLabel(S(), r), null) || M.CHANNEL_LABEL?.[r.channel] || r.channel;
const lvlOf = c => String(c?.level || '2.1');
const I = {
  ok: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#217A78" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>',
  warn: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F4A05" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>',
  no: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A2E1C" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>',
  open: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#525B66" stroke-width="2.2"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle></svg>',
  mic: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0014 0M12 18v3"></path></svg>',
  clock: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  doc: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path></svg>'
};
const chk = c => `<div class="ck">${c.pass ? I.ok : I.no}<div><b>${esc(c.rule)}</b>${c.detail ? ' — ' + esc(c.detail) : ''}${c.fixed ? ` <span class="fx">fixed: ${esc(c.fixed)}</span>` : ''}</div></div>`;
const checksBlock = (checks, title = 'Checked before you process') => `<div><div class="lab" style="margin-bottom:2px">${title} · ${checks.filter(c => c.pass).length} of ${checks.length} pass</div>${checks.map(chk).join('')}</div>`;
const srcChips = (box, sources) => (box.src || []).map(n => { const s = sources.find(x => x.n === n); return `<span class="src" title="${esc(s ? s.label : '')}">${n} · ${esc(s ? s.label.split('·')[0].trim() : 'source')}${s && s.date ? ' · ' + fmtDate(s.date) : ''}</span>`; }).join('');
const appURL = path => location.origin + '/' + path;
const noOf = c => c && (c.lauris_no || c.harvest_no);

function meFromPage() {
  const u = P.page?.user || ''; const st = S().staff;
  return st.find(x => u && (u.startsWith(x.name) || u.startsWith(x.name.replace(/^(\w)\w+ /, '$1. ')))) || st.find(x => x.id === 'jperez') || st[0];
}
function clientForPage() {
  const c = P.page?.consumer; if (!c) return null;
  const no = Number(c.no);
  return S().clients.find(x => no && (x.lauris_no === no || x.harvest_no === no)) || S().clients.find(x => x.initials === c.initials) || null;
}

function header(mode, legend = true) {
  return `<div class="ph"><span class="logo">${P.logo}</span><div class="pt">${esc(mode)}</div></div>${legend ? '<div class="legend"><span>green · already in Client Record</span><span>yellow · Psyflo typed — check it</span></div>' : ''}`;
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
  flash(`${new Set(done.map(b => b.row || b.label)).size} box${done.length === 1 ? '' : 'es'} typed into the form · yellow · check them, then press ${form === 'new-consumer' ? 'Save Client' : form === 'survey' ? 'Save Survey' : 'Process Form'}${r.missing?.length ? ` · not found on this form: ${r.missing.join(', ')}` : ''}`, r.missing?.length ? 'y' : 'g');
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
  if (!framed) return header('Psyflo · extension panel', false) + `<div class="body"><p>This is the Psyflo panel. It runs beside a Client Record page: open the mock Client Record (${esc(api.config.laurisURL)}) — the panel appears at the right — or install the extension from <code>extension/</code> and open its side panel.</p><a class="btn p" href="${esc(api.config.laurisURL)}/login?as=jperez">Open the mock Client Record</a></div>`;
  const p = P.page;
  if (!p) return header('Psyflo · reading this page', false) + `<div class="body"><div class="banner n">${I.open}<div>Waiting for the page… If this stays, reload the Client Record tab.</div></div></div>`;
  if (p.kind === 'portal-form' || p.kind === 'portal-confirmation') return portalView();
  if (p.kind === 'login') return header('Psyflo · not signed in', false) + `<div class="body"><div class="banner n">${I.open}<div><b>Sign in to Client Record.</b> Psyflo reads only the page you have open and types only into a form you have open. It never signs in for you.</div></div></div>` + foot();
  const c = clientForPage();
  if (p.consumer && p.consumer.program && !/^SUD/.test(p.consumer.program)) return offView(p.consumer);
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
  return header('Psyflo · off for this record', false) + `<div class="body"><div class="banner n">${I.open}<div><b>Psyflo is off for ${esc(consumer.initials)}.</b> This record is in ${esc(consumer.program)} — grant-funded, no prior authorization. The extension works with Medicaid SUD records only; it reads and types nothing here.</div></div></div>` + foot();
}

function portalView() {
  const p = P.page;
  if (p.kind === 'portal-confirmation') {
    const r = P.event?.result?.request;
    return header('Psyflo · portal upload', false) + `<div class="body"><div class="banner">${I.ok}<div><b>Confirmation ${esc(p.portal.ref)} read from this page.</b> ${r ? 'Logged on ' + esc(r) + ' · decision clock started · proof of timely submission kept.' : 'No open send was waiting for it.'}</div></div>${r ? `<a class="btn o" data-act="openApp" data-href="#/Submission?id=${esc(r)}">See it in Psyflo ↗</a>` : ''}</div>` + foot();
  }
  return header('Psyflo · portal upload', false) + `<div class="body"><div class="banner n">${I.open}<div>You are in your own portal session. Attach the packet Psyflo prepared (or paste the text it formatted for this plan) and press Submit; Psyflo reads the confirmation number from the next page.</div></div></div>` + foot();
}

// ---------------------------------------------------------------- home (client list) · screen 13
// Today at CCC of SN: prior authorizations to draft, continued stays due, Molina 5-session renewals, new referrals.
function paToDraft() {
  const s = S(); const out = [];
  for (const r of s.requests.filter(r => r.type === 'initial' && ['draft_ready', 'awaiting_signature', 'signed'].includes(r.stage))) out.push({ c: M.client(s, r.client), r, form: 'sra-initial' });
  // intake done, no initial request yet (T.W. in the live flow)
  // Medicaid clients on the way in, no initial request yet (T.W. in the live flow); grant-funded clients need no PA
  for (const c of s.clients.filter(c => ['referral', 'screening', 'intake', 'assessment', 'no_authorization'].includes(c.stage) && c.funding !== 'grant' && !s.requests.some(r => r.client === c.id && r.type === 'initial'))) out.push({ c, r: null, form: c.stage === 'no_authorization' || c.timeline?.isp ? 'sra-initial' : c.timeline?.intake ? 'isp' : c.timeline?.screening ? 'cna' : 'screening' });
  return out;
}
function continuedDue() {
  const s = S(); const out = []; const seen = new Set();
  for (const r of s.requests.filter(r => r.type === 'continued_stay' && ['draft_ready', 'awaiting_signature', 'signed'].includes(r.stage))) { out.push({ c: M.client(s, r.client), r }); seen.add(r.client); }
  for (const c of s.clients.filter(c => c.authorization?.end && !seen.has(c.id) && c.authorization.payer !== 'sentara')) {
    const d = daysBetween(s.today, c.authorization.end); if (d >= 0 && d <= 14) out.push({ c, r: null, days: d });
  }
  return out;
}
// Molina authorizes IOP 5 sessions at a time: the next request has to go in after session 3 to be decided before session 5
function molinaRenewals() {
  const s = S();
  return s.clients.filter(c => c.authorization?.payer === 'sentara' || (c.medicaid?.plan === 'sentara' && s.requests.some(r => r.client === c.id && r.payer === 'sentara' && !['closed', 'denied'].includes(r.stage)))).map(c => {
    const a = c.authorization || {}; const per = a.sessions || 5;
    const used = a.sessions_used ?? (a.used != null ? Math.floor(a.used / 3) : null);
    const req = s.requests.filter(r => r.client === c.id && r.payer === 'sentara').at(-1);
    return { c, per, used, req, due: used != null && used >= 3 };
  });
}
const chips = (fn, label, items, selVal) => `<div class="chips" role="radiogroup" aria-label="${label}">${items.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(v) === String(selVal)}" class="tog ${String(v) === String(selVal) ? 'on' : ''}" data-act="pick" data-fn="${fn}" data-v="${esc(String(v))}">${l}</button>`).join('')}</div>`;
function homeView() {
  const s = S(); const me = meFromPage(); const role = P.ui.role || me.role; const lvl = LEVEL[role];
  const p = P.page; const list = p.consumers || [];
  const first = me.name.split(' ')[0];
  const pa = paToDraft(), cs = continuedDue(), mol = molinaRenewals();
  const nt = tryOr(() => M.notesToday(s, me.id), { done: 0, total: 0 }) || { done: 0, total: 0 };
  const sub = role === 'direct_support' ? `${nt.done} of ${nt.total} IOP group notes done today` : role === 'clinician' ? `${pa.length} prior auth${pa.length === 1 ? '' : 's'} to draft · ${cs.length} continued stay${cs.length === 1 ? '' : 's'} due · ${mol.filter(m => m.due).length} Molina renewal${mol.filter(m => m.due).length === 1 ? '' : 's'} due` : role === 'supervisor' ? `${(s.notes || []).filter(n => n.review === 'pending').length} notes to review` : `${s.requests.filter(r => ['info_requested', 'partial_decide', 'overdue', 'signed', 'denied'].includes(r.stage)).length} requests need action`;
  const forms = (lvl >= 3 ? [['screening', 'Intake screening call'], ['cna', 'ASAM assessment']] : []).concat(DS_TASKS);
  const clients = list.filter(x => /^SUD/.test(x.program || ''));
  const sel = P.ui.student || (clients[0] && clients[0].no) || '';
  const t = s.timers?.[me.id]; const running = t && t.started;
  const tog = (r, l) => `<button class="tog ${role === r ? 'on' : ''}" data-act="role" data-r="${r}">${l}</button>`;
  const formLink = (c, form, label, chip, sev = 'y') => { const no = noOf(c); return `<a class="btn o" data-act="nav" data-href="${no ? `/consumers/${no}/session/${form}` : `/consumers/new${c.referral ? '?referral=' + esc(c.referral) : ''}`}"><span>${label}</span><span class="chip ${sev}">${esc(chip)}</span></a>`; };
  const tasks = `<div class="tile t"><div class="row"><span class="ic" style="background:#5FC0BE;color:#151B24">${I.doc}</span><div><div style="font-weight:600;font-size:15px">Today at CCC of SN</div><div class="small muted">Requests Psyflo can draft into the Client Record form you open.</div></div></div>
    <div class="lab" style="margin-top:10px">Prior authorizations to draft · Level 2.1 needs PA from the assessment</div>
    <div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:4px">${pa.map(x => { const clk = x.r ? M.requestClock(s, x.r) : null; return formLink(x.c, x.form, `${esc(M.clientLabel(s, x.c.id))} · ${esc(payerShort(x.r?.payer || x.c.medicaid?.plan))} · ${esc(x.r ? x.r.id + ' · ' + M.STAGE_LABEL[x.r.stage] : 'next: ' + FORM_NAME[x.form].toLowerCase())}`, clk ? clk.text : 'no IOP day is billable before Send', clk ? clk.sev : 'r'); }).join('') || '<div class="small muted">None waiting.</div>'}</div>
    <div class="lab" style="margin-top:10px">Continued stays due</div>
    <div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:4px">${cs.map(x => formLink(x.c, 'sra-continued', `${esc(M.clientLabel(s, x.c.id))} · ${esc(payerShort(x.r?.payer || x.c.authorization?.payer))}${x.r ? ' · ' + esc(x.r.id) : ''}${x.c.authorization?.units ? ` · ${x.c.authorization.used ?? 0} of ${x.c.authorization.units} units` : ''}`, x.c.authorization?.end ? 'auth ends ' + fmtDate(x.c.authorization.end) : (x.r ? M.STAGE_LABEL[x.r.stage] : 'due'), x.days != null && x.days <= 7 ? 'r' : 'y')).join('') || '<div class="small muted">None due in the next 14 days.</div>'}</div>
    <div class="lab" style="margin-top:10px">Molina · 5 sessions at a time</div>
    <div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:4px">${mol.map(m => m.used != null && m.c.authorization?.units ? formLink(m.c, 'sra-continued', `${esc(M.clientLabel(s, m.c.id))} · session ${Math.min(m.used, m.per)} of ${m.per}`, m.due ? 'request the next 5 now' : 'next request after session 3', m.due ? 'r' : 'n') : `<a class="btn o" data-act="openApp" data-href="#/${m.req && ['partial_decide', 'denied'].includes(m.req.stage) ? 'Partials?id=' + esc(m.req.id) : 'Authorizations'}"><span>${esc(M.clientLabel(s, m.c.id))}${m.req ? ' · ' + esc(m.req.id) + ' · ' + esc(M.STAGE_LABEL[m.req.stage] || '') : ''}</span><span class="chip y">Psyflo drafts the next request at session 3 ↗</span></a>`).join('') || '<div class="small muted">No Molina IOP clients today.</div>'}</div></div>`;
  return header(`${me.name}${me.credential ? ', ' + me.credential : ''} · ${(M.ROLE_LABEL[role] || role).toLowerCase()}`, false) + `<div class="body">
  <div><div style="font-size:17px;font-weight:600">Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${esc(first)}.</div><div class="small muted">${fmtDate(s.today, { dow: true })} · ${esc(sub)}</div></div>
  ${flashHTML()}
  ${lvl >= 3 ? tasks : ''}
  ${lvl >= 3 && lvl !== 4 ? newReferralsHTML() : ''}
  ${lvl !== 4 ? `<div class="tile"><div class="row"><span class="ic" style="background:#217A78;color:#fff">${I.mic}</span><div><div style="font-weight:600;font-size:15px">Record a call or a note</div><div class="small muted">Scribe · record the intake call or say what happened in group; Psyflo drafts the boxes.</div></div></div>
    <div class="row" style="margin-top:10px"><div style="flex:1">${chips('pickForm', 'Which form', forms.map(([k, l]) => [k, l]), P.ui.form || (forms[0] && forms[0][0]))}</div>
    <button class="btn p" data-act="startForm" ${sel ? '' : 'disabled'}>Start</button></div>
    <div class="small muted" style="margin-top:4px">Opens the form for the client picked below.</div></div>
  <div class="tile"><div class="row"><span class="ic" style="background:#151B24;color:#fff">${I.clock}</span><div><div style="font-weight:600;font-size:15px">Group time <span class="muted" style="font-weight:400;font-size:12px">· optional</span></div><div class="small muted">Start and stop · fills the group note's session times and H0015 units${running ? ` · <b>running with ${esc(M.clientLabel(s, t.client, false))} since ${fmtTime(t.started)}</b>` : ''}.</div></div></div>
    <div class="row" style="margin-top:10px"><div style="flex:1">${clients.length ? chips('pickStudent', 'Client', clients.map(x => [x.no, esc(x.initials)]), sel) : '<span class="small muted">No SUD clients on this page</span>'}</div>
    ${running ? '<button class="btn r" data-act="timerStop">Stop</button>' : `<button class="btn p" data-act="timerStart" ${sel ? '' : 'disabled'}>Start</button>`}</div></div>` : ''}
  ${lvl === 4 ? `<div class="tile"><div style="font-weight:600;font-size:15px">Open Psyflo</div><div class="list" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
    <a class="btn o" data-act="openApp" data-href="#/Claims"><span>Denial Intelligence · timely filing</span><span class="chip r">work these first</span></a>
    <a class="btn o" data-act="openApp" data-href="#/Authorizations"><span>Authorizations · where every request stands</span><span class="chip y">${s.requests.filter(r => ['info_requested', 'partial_decide', 'overdue', 'signed', 'denied'].includes(r.stage)).length} need action</span></a>
    <a class="btn o" data-act="openApp" data-href="#/PayerPlaybook"><span>Payer Rules · what changed</span><span class="chip n">learned from denials</span></a>
    <a class="btn o" data-act="openApp" data-href="#/Referrals"><span>Referrals · drug court, P&amp;P, self</span><span class="chip y">${s.referrals.filter(r => r.stage === 'needs_screening').length} waiting</span></a></div></div>
    <div class="tile" style="background:#fff"><div style="font-weight:600;font-size:14px">Who can see what</div><div style="display:grid;grid-template-columns:110px minmax(0,1fr);gap:5px 10px;font-size:12px;margin-top:6px">
      <div style="font-weight:600">Direct support staff</div><div>IOP group notes, collateral updates and incident reports. Their own clients' units.</div>
      <div style="font-weight:600">Clinician</div><div>Everything above, plus referrals, the intake screening and ASAM assessment Scribe, treatment plans and prior authorization drafts.</div>
      <div style="font-weight:600">Administrator</div><div>Claims, denials, authorizations and payer rules for the whole agency. Sets these levels.</div></div></div>` : ''}
  <div><div class="lab">On this page · read from Client Record</div>${list.map(x => { const c = s.clients.find(y => y.harvest_no === Number(x.no) || y.lauris_no === Number(x.no)); const w = c ? waitingDict(c).length + waitingAssess(c).length : 0; return `<div class="sec"><b><a href="#" data-act="nav" data-href="/consumers/${x.no}">${esc(x.initials)}</a> <span class="muted" style="font-weight:400">· ${esc(x.units)}</span></b>${!/^SUD/.test(x.program || '') ? `<span class="chip n">${esc(x.program)} · Psyflo off</span>` : w ? `<span class="chip y">${w} waiting in Psyflo</span>` : `<span class="chip g">${esc((x.program || '').replace('SUD · ', ''))}</span>`}</div>`; }).join('') || '<div class="small muted">No clients listed.</div>'}</div>
  </div>` + foot();
}
ACT.role = el => { P.ui.role = el.dataset.r; draw(); };
ACT.pick = el => { const f = ACT[el.dataset.fn]; if (f) f({ value: el.dataset.v }); draw(); };
ACT.pickForm = el => { P.ui.form = el.value; };
ACT.pickStudent = el => { P.ui.student = el.value; draw(); };
ACT.startForm = () => { const no = P.ui.student || (P.page.consumers || []).find(x => /^SUD/.test(x.program || ''))?.no; const f = P.ui.form || ((LEVEL[P.ui.role || meFromPage().role] >= 3) ? 'screening' : 'dpn'); nav(`/consumers/${no}/session/${f}`); };
ACT.timerStart = async () => { const no = Number(P.ui.student || (P.page.consumers || [])[0]?.no); const c = S().clients.find(x => x.harvest_no === no || x.lauris_no === no); if (!c) return flash('That client is not in Psyflo', 'r'); await api.do('timer.start', { staff: meFromPage().id, client: c.id }); flash('Group timer started with ' + c.initials); };
ACT.timerStop = async () => { await api.do('timer.stop', { staff: meFromPage().id }); flash('Timer stopped · the block is ready for the group note'); };

function listView() {
  return header('Psyflo · ' + (P.page.kind === 'saved' ? 'Saved Session' : 'Rejected Forms'), false) + `<div class="body"><div class="banner n">${I.open}<div>${P.page.kind === 'saved' ? 'Forms you saved but did not process. Open one and Psyflo picks up where the draft left off.' : 'Reviewer notes are in the table. Open the form, fix it, and process it again; Psyflo re-runs its checks when you open it.'}</div></div></div>` + foot();
}

// ---------------------------------------------------------------- new referrals + new client (Flow A starts here)
// A referral is "new" until a person creates the client in Client Record. Referrals may point at a Psyflo client
// (T.W.) or carry only a label ("A.R., 31").
function refInfo(r) {
  const s = S(); const c = s.clients.find(x => x.id === r.client) || null;
  const m = String(r.client || '').match(/^([A-Z]\.[A-Z]\.)(?:,\s*(\d+))?/);
  return { c, initials: c ? c.initials : (m ? m[1] : String(r.client || '')), age: c ? c.age : (m && m[2] ? +m[2] : null), label: M.clientLabel(s, r.client), inLauris: !!(r.lauris_no || (c && c.lauris_no)) };
}
function candidateReferrals() {
  return S().referrals.filter(r => ['needs_screening', 'screening_booked', 'in_intake'].includes(r.stage) && !refInfo(r).inLauris);
}
const newReferrals = () => S().referrals.filter(r => r.stage === 'needs_screening' && !refInfo(r).inLauris);
function refKnown(r) {
  const s = S(); const el = eligibility(r); const f = r.form || {}; const pt = partnerOf(r);
  const k = [`${refSource(r) || 'Referral'}${pt ? ' · ' + pt.name : ''} · received ${fmtDate(r.received)}`];
  if (f.concerns?.length) k.push('Concerns: ' + f.concerns.slice(0, 3).join(', ').toLowerCase() + (f.concerns.length > 3 ? '…' : ''));
  k.push(el?.status === 'recorded' ? `Eligibility: ${payerShort(el.plan)} · checked in EVS ${fmtDate(el.checked_at)}` : 'Eligibility not checked in EVS yet');
  return k;
}
function newReferralsHTML() {
  const list = newReferrals(); if (!list.length) return '';
  return `<div class="tile t"><div class="row"><span class="ic" style="background:#F0B44C;color:#151B24">${I.doc}</span><div style="flex:1"><div style="font-weight:600;font-size:15px">${list.length} new referral${list.length === 1 ? '' : 's'}</div><div class="small muted">Drug court, P&amp;P, hospital and self-referrals · not in Client Record yet. Open a new client and Psyflo fills the boxes from the referral.</div></div></div>
    ${list.map(r => { const i = refInfo(r); return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(i.label)} · ${esc(r.id)}</b><span class="chip y">new</span></div>${refKnown(r).map(x => `<div class="small">${esc(x)}</div>`).join('')}
      <div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn p" style="flex:1" data-act="nav" data-href="/consumers/new?referral=${esc(r.id)}">New client from this referral</button><a class="btn o" data-act="openApp" data-href="#/Referral?id=${esc(r.id)}">Referral ↗</a></div></div>`; }).join('')}</div>`;
}
function newConsumerView() {
  const s = S(); const cands = candidateReferrals();
  const qref = new URL(P.page.url).searchParams.get('referral');
  const refId = P.ui.ref || (cands.find(r => r.id === qref) || cands[0] || {}).id;
  const r = s.referrals.find(x => x.id === refId);
  if (!r) return header('Psyflo · new client') + `<div class="body"><div class="banner n">${I.open}<div>No referral is waiting to be added to Client Record.</div></div></div>` + foot();
  const i = refInfo(r); const el = eligibility(r);
  const boxes = newConsumerBoxes(r);
  const filled = new Set(P.ui.filled || []);
  return header('Scribe · New client · from ' + r.id) + `<div class="body">${flashHTML()}
    <div class="row"><span class="lab">Referral</span><div style="flex:1">${chips('pickRef', 'Referral', cands.map(x => [x.id, `${x.id} · ${esc(refInfo(x).label)}${x.stage === 'needs_screening' ? ' · new' : ''}`]), refId)}</div></div>
    ${LEVEL[meFromPage().role] >= 3 ? recordScreeningTile('steps') : ''}
    <div class="tile t"><b>Create ${esc(i.initials)} in Client Record</b><div class="small" style="margin-top:4px">From the referral (${esc(refSource(r) || 'referral')}, ${fmtDate(r.received)}). Psyflo types the boxes; you check them and press <b>Save Client</b>.</div>
      ${!el || el.status !== 'recorded' ? `<div class="banner y" style="margin-top:8px">${I.warn}<div>Eligibility is not recorded yet. Check Nevada Medicaid in EVS before the screening — a grant-funded client (Ryan White, SAPTA, HOPWA) needs no prior authorization.</div></div>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="fillNew" ${P.ui.filling ? 'disabled' : ''}>${filled.size ? 'Type them again' : `Fill ${boxes.length} boxes from the referral`}</button></div></div>
    <div><div class="lab">Boxes · where each comes from</div>${boxes.map(b => `<div class="box"><div class="row"><span class="l" style="flex:1">${esc(b.label)}</span>${filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : ''}</div><div class="v">${esc(b.value)}</div>${srcChips(b, NEW_SOURCES)}</div>`).join('')}
      <div class="box"><div class="l">Assigned staff</div><div class="v muted">Left for you — the referral does not say which counselor will run ${esc(i.initials)}'s group.</div></div></div>
    <div class="small muted">After Save Client, open Intake Screening: referral source, phone, Medicaid and the referral partner come from the referral and the EVS check.</div></div>` + foot();
}
const NEW_SOURCES = [{ n: 1, label: 'Referral' }, { n: 2, label: 'Eligibility (EVS)' }, { n: 3, label: 'Psyflo record' }, { n: 4, label: 'You (signed in)' }];
const usDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
function newConsumerBoxes(r) {
  const s = S(); const i = refInfo(r); const st = site(r.school || i.c?.school); const f = r.form || {};
  const b = [{ label: 'Name', value: i.initials, src: [1] }];
  if (f.dob || i.c?.dob) b.push({ label: 'Date of birth', value: usDate(f.dob || i.c.dob), src: [1] });
  if (st.locality) b.push({ label: 'Locality', value: st.locality, src: [1] });
  if (st.name) b.push({ label: 'Site / program', value: st.name, src: [1] });
  const lvl = i.c?.level ? String(i.c.level) : /Level 1/.test(st.name || '') ? '1' : '2.1';
  b.push({ label: 'Program', value: lvl === '1' ? 'SUD · Level 1 outpatient' : 'SUD · Level 2.1 IOP', src: [i.c?.level ? 3 : 1] });
  if (refSource(r)) b.push({ label: 'Referral source', value: refSource(r), src: [1] });
  if (f.phone || i.c?.phone) b.push({ label: 'Phone', value: f.phone || i.c.phone, src: [1] });
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
  if (!res.error) flash(`Boxes typed. Check them and press Save Client in Client Record.${res.missing?.length ? ' Not found on this form: ' + res.missing.join(', ') : ''}`, res.missing?.length ? 'y' : 'g');
};
// after Save Client: link a label-only referral (no Psyflo client yet) to the new record #
function referralForConsumer(no, initials) {
  const s = S();
  const byNo = s.referrals.find(r => r.lauris_no && r.lauris_no === Number(no)); if (byNo) return byNo;
  let hint = null; try { hint = JSON.parse(localStorage.getItem('psyflo_newref') || 'null'); } catch (e) { }
  if (hint && hint.initials === initials) { const r = s.referrals.find(x => x.id === hint.ref); if (r) return r; }
  return candidateReferrals().find(r => refInfo(r).initials === initials) || null;
}

// ---------------------------------------------------------------- client record
const NEXT = { screening: ['cna', 'Open the ASAM assessment'], cna: ['isp', 'Open the treatment plan'], isp: ['sra-initial', 'Open the prior authorization request'], 'sra-initial': ['/approvals', 'Open Forms to Approve'], 'sra-continued': ['/approvals', 'Open Forms to Approve'], discharge: ['/approvals', 'Open Forms to Approve'] };
function recordView(c) {
  const s = S(); const p = P.page; const ev = P.event;
  if (!c) {
    const r = p.consumer && referralForConsumer(p.consumer.no, p.consumer.initials);
    const lvl0 = LEVEL[meFromPage().role];
    if (r && ev && ev.event === 'created' && !r.lauris_no && P.linking !== r.id) { P.linking = r.id; api.do('referral.inLauris', { id: r.id, no: p.consumer.no }).catch(() => { }); }
    if (r && (r.lauris_no === Number(p.consumer.no) || (ev && ev.event === 'created'))) return header('Psyflo · ' + p.consumer.initials) + `<div class="body">${flashHTML()}<div class="banner">${I.ok}<div><b>${esc(p.consumer.initials)} is in Client Record · Record # ${esc(p.consumer.no)}.</b> Psyflo linked it to ${esc(r.id)} (${esc(refSource(r) || 'referral')}).</div></div>
      ${lvl0 >= 3 ? `<button class="btn p" data-act="nav" data-href="/consumers/${p.consumer.no}/session/screening">Open Intake Screening</button><div class="small muted">Referral source, phone, Medicaid and the referral partner come from the referral and the EVS check.</div>` : ''}</div>` + foot();
    return header('Psyflo · ' + (p.consumer?.initials || '')) + `<div class="body"><div class="banner n">${I.open}<div>${esc(p.consumer?.initials)} is not a Psyflo client yet. Nothing to draft.</div></div></div>` + foot();
  }
  const no = p.consumer.no; const me = meFromPage(); const lvl = LEVEL[me.role];
  const d = waitingDict(c), a = waitingAssess(c);
  const reqs = s.requests.filter(r => r.client === c.id && !['active', 'closed'].includes(r.stage));
  let evHTML = '';
  if (ev && ev.event === 'processed') {
    const f = ev.form; const next = NEXT[f];
    const extra = f === 'screening' ? ' Next: the ASAM assessment, with a UDS collected there.' : f === 'cna' ? ' Level 2.1 needs prior authorization from the assessment: every IOP day before the request is sent is unbillable.' : f === 'isp' ? ' Psyflo drafted the prior authorization request from the record.' : f === 'dpn' ? ` ${tryOr(() => M.notesToday(s, 'khale').done, 0)} group notes processed today.` : (f || '').startsWith('sra') ? ' Psyflo will save the signed preview as PDF when you press Get Signature.' : '';
    evHTML = `<div class="banner">${I.ok}<div><b>${esc(FORM_NAME[f] || f)} processed in Client Record.</b> Psyflo's tracker updated.${esc(extra)}</div></div>${savedHTML()}${next ? `<button class="btn p" data-act="nav" data-href="${next[0].startsWith('/') ? next[0] : `/consumers/${no}/session/${next[0]}`}">${esc(next[1])}</button>` : ''}`;
  }
  if (ev && ev.event === 'created') evHTML = `<div class="banner">${I.ok}<div><b>${esc(c.initials)} is in Client Record · Record # ${esc(no)}.</b> Psyflo linked it to ${esc(c.referral || c.id)}.</div></div>`;
  const screened = s.screenings.some(x => x.client === c.id && (x.status === 'done' || x.processed_at)) || !!c.timeline?.screening;
  if (lvl >= 3 && !screened && (!ev || ev.event !== 'processed')) evHTML += recordScreeningTile('go', no);
  const forms = (lvl >= 3 ? ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'discharge'] : []).concat(['dpn', 'weekly', 'collateral', 'incident']);
  return header(`Psyflo · ${c.initials} · ${site(c.school).name || ''}`) + `<div class="body">${flashHTML()}${evHTML}
    ${d.length ? `<div class="banner y">${I.mic}<div><b>${d.length} dictation${d.length === 1 ? '' : 's'} waiting</b> (${esc(M.staffShort(s, d[0].staff))}, ${fmtTime(d[0].at)}). Open today's IOP group note and it drops in.</div></div><button class="btn p" data-act="nav" data-href="/consumers/${no}/session/dpn">Open today's IOP group note</button>` : ''}
    ${a.length ? `<div class="banner y">${I.doc}<div><b>${a.length} assessment${a.length === 1 ? '' : 's'} waiting</b> (${a.map(x => esc(x.instrument)).join(', ')}). Open Surveys and Psyflo types the answers in.</div></div>${p.kind === 'surveys' ? `<button class="btn p" data-act="dropSurvey">Type the ${esc(a[0].instrument)} answers</button>` : `<button class="btn o" data-act="nav" data-href="/consumers/${no}/surveys?instrument=${encodeURIComponent(a[0].instrument)}">Open Surveys</button>`}` : ''}
    ${reqs.length && lvl >= 3 ? `<div><div class="lab">Requests in Psyflo</div>${reqs.map(r => { const clk = M.requestClock(s, r); return `<div class="sec"><b>${esc(r.id)} · ${esc(M.TYPE_LABEL[r.type] || r.type)}</b><span class="chip ${clk.sev}">${esc(M.STAGE_LABEL[r.stage] || r.stage)} · ${esc(clk.text)}</span></div>`; }).join('')}</div>` : ''}
    <div><div class="lab">Open a form · Psyflo drafts what it can</div>${forms.map(f => `<div class="sec"><b>${esc(FORM_NAME[f])}</b><a href="#" class="chip g" data-act="nav" data-href="/consumers/${no}/session/${f}">open</a></div>`).join('')}</div>
  </div>` + foot();
}
ACT.dropSurvey = async () => {
  const c = clientForPage(); const a = waitingAssess(c)[0]; if (!a) return;
  const inst = P.page.form?.instrument;
  if (a.instrument !== inst) { nav(`/consumers/${P.page.consumer.no}/surveys?instrument=${encodeURIComponent(a.instrument)}`); return; }
  const vals = Object.values(a.answers || {});
  await fillBoxes(vals.map((v, i) => ({ label: `${a.instrument} item ${i + 1}`, value: String(v) })), { form: 'survey', client: c, sources: [{ n: 1, label: 'Asked on the phone' }] });
  await api.do('assessment.used', { id: a.id });
  flash('Answers typed. Press Save Survey — Client Record scores it.');
};

// ---------------------------------------------------------------- session forms
function formView(type, c) {
  const me = meFromPage();
  if (!c && type === 'screening' && LEVEL[me.role] >= 3) { const r = referralForConsumer(P.page.consumer?.no, P.page.consumer?.initials); if (r && r.lauris_no) return refScreeningView(r); }
  if (!c) return header('Psyflo · ' + (FORM_NAME[type] || 'form')) + `<div class="body"><div class="banner n">${I.open}<div>${esc(P.page.consumer?.initials)} is not a Psyflo client. Nothing to draft.</div></div></div>` + foot();
  if (CLIN_FORMS.includes(type) && LEVEL[me.role] < 3) return header('Psyflo · ' + FORM_NAME[type]) + `<div class="body"><div class="banner n">${I.open}<div>${esc(FORM_NAME[type])} drafts are for clinicians. Counselors see group notes, collateral updates and their own clients' units.</div></div></div>` + foot();
  if (LEVEL[me.role] === 1 && c.staff && c.staff !== me.id) return header('Psyflo · ' + FORM_NAME[type]) + `<div class="body"><div class="banner n">${I.open}<div>${esc(c.initials)} is not in your group. Psyflo shows counselors their own clients only.</div></div></div>` + foot();
  const v = formViewFor(type, c);
  return P.event && P.event.event === 'saved' ? v.replace('<div class="body">', '<div class="body">' + savedHTML()) : v;
}
function formViewFor(type, c) {
  switch (type) {
    case 'screening': return screeningView(c);
    case 'cna': return asamView(c);
    case 'isp': return planView(c);
    case 'sra-initial': return sraView(c);
    case 'sra-continued': return continuedView(c);
    case 'dpn': return groupNoteView(c);
    default: return otherView(type, c);
  }
}

// a reusable "draft ready" block: fill all, one at a time, the boxes with sources, what is left, the checks
function draftBlock(d, { form, client, intro, fillLabel, oneAct = 'oneStart' }) {
  const u = P.ui; const filled = new Set(u.filled || []);
  P.cur = { boxes: d.boxes, form, client, sources: d.sources };
  return `<div class="tile t"><div style="font-size:13px">${intro}</div>
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="curFill" ${u.filling ? 'disabled' : ''}>${fillLabel || `Fill ${d.boxes.length} boxes`}</button><button class="btn o" data-act="${oneAct}">One at a time</button></div></div>
    ${u.one != null ? oneAtATime(d.boxes, 'curOneType', 'curOneSkip') : ''}
    <div><div class="lab">Drafted boxes · with sources</div>${d.boxes.map(b => `<div class="box"><div class="row"><span class="l" style="flex:1">${esc(b.short || b.label)}</span>${filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : b.copied ? '<span class="chip g">copied from the screening</span>' : ''}</div><div class="v">${esc(b.value)}</div>${b.note ? `<div class="small" style="color:#6F4A05">← ${esc(b.note)}</div>` : ''}${srcChips(b, d.sources)}</div>`).join('')}
      ${(d.blank || []).map(b => `<div class="box"><div class="l">${esc(b.short || b.label)}</div><div class="v muted">Left for you — ${esc(b.why)}</div></div>`).join('')}</div>
    ${checksBlock(d.checks)}`;
}
ACT.curFill = async () => { const x = P.cur; if (!x) return; await fillBoxes(x.boxes, { form: x.form, client: x.client, sources: x.sources }); draw(); };
ACT.oneStart = () => { P.ui.one = 0; draw(); };
ACT.curOneType = async () => { const x = P.cur; const b = x && x.boxes[P.ui.one]; if (!b) return; await call('focus', { label: b.label }); await fillBoxes([b], { form: x.form, client: x.client, sources: x.sources }); P.ui.one++; draw(); };
ACT.curOneSkip = () => { P.ui.one++; draw(); };

// ---------- Flow A · intake screening call (screen 14)
// the boxes that come from the referral and the eligibility check, typed before the call
function preCallBoxes(c, ref) {
  const s = S(); c = c || {}; const r = ref || s.referrals.find(x => x.id === c.referral); const el = eligibility(r); const f = r?.form || {}; const pt = partnerOf(r);
  const b = [];
  if (refSource(r)) b.push({ label: 'Referral source', value: refSource(r) + (r?.id ? ' · ' + r.id : ''), src: [1] });
  if (c.phone || f.phone) b.push({ label: 'Phone', value: c.phone || f.phone, src: [c.phone ? 2 : 1] });
  if (c.language || f.language) b.push({ label: 'Preferred language', value: c.language || f.language, src: [c.language ? 2 : 1] });
  if (el?.status === 'recorded') b.push({ label: 'Medicaid', value: `${M.payer(s, el.plan).name} · checked in EVS ${fmtDate(el.checked_at)}`, src: [3] });
  if (c.medicaid || f.medicaid_id) b.push({ label: 'Medicaid ID', value: 'on file (referral)', src: [1] });
  if (pt) b.push({ label: 'Referral partner', value: `${pt.name}${pt.role ? ' · ' + pt.role : ''}`, src: [1] });
  return b;
}
const PRE_SOURCES = [{ n: 1, label: 'Referral' }, { n: 2, label: 'Psyflo record' }, { n: 3, label: 'Eligibility (EVS screenshot)' }];

function screeningView(c) {
  const s = S(); const u = P.ui; const r = s.referrals.find(x => x.id === c.referral);
  const el = eligibility(r);
  const st = u.sc || 'pre';
  const facts = screeningFacts(u.transcript || '');
  const prompts = screeningPrompts(facts);
  const dims = prompts.filter(p => /^d\d$/.test(p.key)); const met = dims.filter(p => p.done).length;
  const pre = preCallBoxes(c);
  let html = header(`Scribe · Intake screening · ${meFromPage().name}`) + '<div class="body">' + flashHTML();
  if (el?.status !== 'recorded') html += `<div class="banner y">${I.warn}<div>Eligibility is not recorded yet. Psyflo fills the Medicaid box only from a recorded EVS check.</div></div>`;
  if (st === 'pre') {
    html += recordScreeningTile('here') + `<div class="banner">${I.ok}<div><b>Filled before you picked up:</b> ${pre.length} boxes from the referral and the eligibility check — ${pre.map(b => esc(b.label.toLowerCase())).join(', ')}. ${u.preFilled ? 'Check them.' : ''}</div></div>
      <button class="btn o" data-act="preFill">${u.preFilled ? 'Type' : 'Type'} the ${pre.length} boxes${u.preFilled ? ' again' : ''}</button>
      ${preBoxesHTML(pre)}`;
  }
  if (st === 'rec') {
    const dur = Math.floor((Date.now() - (u.recStart || Date.now())) / 1000);
    html += `<div class="banner n"><span class="rec on"></span><div style="flex:1"><b>Recording the call · ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}</b> · consent read · ${u.recMode === 'script' ? 'scripted call playing' : 'microphone'} · boxes drafted when you hang up</div></div>
      <div class="row" style="flex-wrap:wrap;gap:6px 8px"><div style="font-size:15px;font-weight:600">Before you hang up</div><span class="chip ${met === 6 ? 'g' : 'y'}">${met} of 6 dimensions on record</span></div>
      ${promptsHTML(prompts)}
      <div class="tx" id="tx">${esc((u.transcript || '').split('\n').slice(-6).join('\n'))}${u.interim ? '\n' + esc(u.interim) : ''}</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="recStop">Stop and draft the boxes</button><button class="btn o" data-act="copyAsks">Copy asks</button></div>`;
  }
  if (st === 'drafted') {
    const d = u.draft; const rows = new Set(d.boxes.map(b => b.row || b.label)).size;
    html += `<div class="banner">${I.ok}<div><b>${rows} boxes drafted from the call</b> · ${pre.length} filled before it · ${d.blank.length} left for you. Nothing in them that was not said or on the referral.</div></div>
      <div class="row"><button class="btn p" style="flex:1" data-act="scFill" ${u.filling ? 'disabled' : ''}>${u.scFilled ? 'Type them again' : `Fill the ${rows} boxes`}</button><button class="btn o" data-act="scOne">One at a time</button></div>
      ${u.one != null ? oneAtATime(d.boxes, 'scOneType', 'scOneSkip') : ''}
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip g">Summary · drafted last</span><span class="chip n">Decision, diagnosis, HIV / HCV · yours</span><span class="chip y">Then · Process Form</span></div>
      <div><div class="lab">After the call · what the prior authorization will need</div>${promptsHTML(prompts, true)}</div>
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
// "Record the intake screening call", shown wherever the panel lands on the way to a screening:
//  here  = on the Intake Screening form (the recorder itself)
//  go    = on the client page (opens Intake Screening, where recording starts)
//  steps = on New Client (the client must exist in Client Record first)
const CONSENT_WORDING = 'Read consent first. While you talk the panel shows only what the prior authorization still needs, by ASAM dimension; it drafts the boxes when you hang up.';
function recordScreeningTile(mode, no) {
  const head = `<div class="row"><span class="ic" style="background:#217A78;color:#fff">${I.mic}</span><div style="flex:1"><div style="font-weight:600;font-size:15px">Record the intake screening call</div><div class="small muted">Scribe · phone on speaker · ${esc(CONSENT_WORDING)}</div></div></div>`;
  if (mode === 'here') return `<div class="tile t">${head}
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn p" data-act="recMic" style="flex:1">${I.mic} Record (microphone)</button><button class="btn o" data-act="recScript" title="Plays seed/scripts/screening_TW.txt as the call">Play the scripted call</button></div>
      <div class="small muted" style="margin-top:6px">${hasSpeech() ? 'Microphone uses the browser\'s speech recognition.' : 'Speech recognition is not available in this browser — use the scripted call.'} The scripted call is the acceptance test in seed/scripts.</div></div>`;
  if (mode === 'go') return `<div class="tile t">${head}
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="nav" data-href="/consumers/${no}/session/screening">${I.mic} Open Intake Screening to record</button></div>
      <div class="small muted" style="margin-top:6px">The recorder is on the Intake Screening form; the boxes from the referral and the EVS check are typed in when it opens.</div></div>`;
  return `<div class="tile t">${head}
      <div class="small" style="margin-top:8px"><b>1</b> Fill the boxes below and press <b>Save Client</b>.<br><b>2</b> Open <b>Intake Screening</b> from the next page.<br><b>3</b> Press <b>Record (microphone)</b> on the call, or play the scripted call.</div>
      <div class="row" style="margin-top:8px"><button class="btn o" style="flex:1" disabled title="Save the client in Client Record first">${I.mic} Record — after Save Client</button></div></div>`;
}
// a client created from a referral that has no Psyflo client record yet (A.R., B.K.): pre-call boxes only
function refScreeningView(r) {
  const pre = preCallBoxes(null, r); const i = refInfo(r);
  return header(`Scribe · Intake screening · ${i.label}`) + `<div class="body">${flashHTML()}
    <div class="banner">${I.ok}<div><b>From ${esc(r.id)}:</b> ${pre.length ? `${pre.length} box${pre.length === 1 ? ' comes' : 'es come'} from the referral and the eligibility check.` : 'the referral has nothing for these boxes yet.'}${eligibility(r)?.status === 'recorded' ? '' : ' Eligibility is not recorded, so the Medicaid box stays empty until someone checks EVS.'}</div></div>
    ${pre.length ? `<button class="btn p" data-act="refPreFill" ${P.ui.filling ? 'disabled' : ''}>${P.ui.preFilled ? 'Type them again' : `Fill ${pre.length} box${pre.length === 1 ? '' : 'es'} from the referral`}</button>` : ''}
    ${pre.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, PRE_SOURCES)}</div>`).join('')}
    <div class="small muted">Scribe drafts the rest of the screening from the recorded call once ${esc(i.initials)} has a Psyflo record (T.W. is the worked example).</div></div>` + foot();
}
ACT.refPreFill = async () => { const p = P.page; const r = referralForConsumer(p.consumer?.no, p.consumer?.initials); if (!r) return; await fillBoxes(preCallBoxes(null, r), { form: 'screening', client: refInfo(r).c || { id: r.id }, sources: PRE_SOURCES }); P.ui.preFilled = true; draw(); };

// ---------- what was actually saved in Client Record (Save Form Data / Process Form), kept as Psyflo's saved version
function savedHTML() {
  const ev = P.event; if (!ev || !['saved', 'processed'].includes(ev.event)) return '';
  const v = (S().lauris_versions || []).filter(x => String(x.session) === String(ev.session) && x.event === ev.event).at(-1);
  if (!v) return '';
  const n = Object.keys(v.filled || {}).length; const ch = (v.changed || []).length + (v.cleared || []).length;
  const cut = t => { t = String(t ?? ''); return t.length > 90 ? t.slice(0, 88) + '…' : t; };
  const head = n ? `${ch ? `<b>${ch} box${ch === 1 ? '' : 'es'} changed after fill</b> · ` : '<b>No changes after fill</b> · '}${n - ch} of ${n} Psyflo typed kept as typed${v.others ? ` · ${v.others} other box${v.others === 1 ? '' : 'es'}` : ''}` : `${Object.keys(v.values || {}).length} boxes`;
  return `<div class="banner">${I.ok}<div><b>Psyflo kept what you ${ev.event === 'processed' ? 'processed' : 'saved'} in Client Record</b> as the saved version (${fmtTime(v.at)}). ${head}.
    ${ch ? `<details style="margin-top:4px"><summary class="small">What changed</summary>${(v.changed || []).map(x => `<div class="small" style="margin-top:4px"><b>${esc(x.label)}</b><div class="muted">Psyflo typed: ${esc(cut(x.filled))}</div><div>Saved: ${esc(cut(x.saved))}</div></div>`).join('')}${(v.cleared || []).map(l => `<div class="small" style="margin-top:4px"><b>${esc(l)}</b> · emptied before saving</div>`).join('')}</details>` : ''}</div></div>`;
}

ACT.recScript = async () => {
  const txt = await fetch('/seed/scripts/screening_TW.txt').then(r => r.text());
  const lines = txt.split('\n').filter(Boolean);
  startRecording('script');
  let i = 0;
  P.rec.timer = setInterval(() => {
    if (!P.rec || i >= lines.length) { if (P.rec) { clearInterval(P.rec.timer); P.ui.interim = '(call ended — press Stop)'; draw(); } return; }
    P.ui.transcript = (P.ui.transcript ? P.ui.transcript + '\n' : '') + lines[i++]; draw();
  }, P.ui.fast ? 250 : 1100);
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
  const c = clientForPage(); const s = S(); const r = s.referrals.find(x => x.id === c.referral);
  P.ui.draft = draftScreening({ transcript: P.ui.transcript || '', today: s.today, phone: c.phone || '', referral: r });
  P.ui.sc = 'drafted'; draw();
  api.do('screening.drafted', { client: c.id, referral: c.referral, transcript: P.ui.transcript || '' }).catch(() => { });
};
ACT.recAgain = () => { P.ui.sc = 'pre'; P.ui.draft = null; P.ui.scFilled = false; draw(); };
ACT.copyAsks = () => { const asks = screeningPrompts(screeningFacts(P.ui.transcript || '')).filter(p => !p.done && p.ask).map(p => '• ' + p.ask).join('\n'); navigator.clipboard?.writeText(asks).then(() => flash('Asks copied'), () => flash(asks)); };
ACT.scFill = async () => { const c = clientForPage(); const d = P.ui.draft; await fillBoxes(d.boxes, { form: 'screening', client: c, sources: d.sources }); P.ui.scFilled = true; draw(); };
ACT.scOne = () => { P.ui.one = 0; draw(); };
ACT.scOneType = async () => { const b = P.ui.draft.boxes[P.ui.one]; await fillBoxes([b], { form: 'screening', client: clientForPage(), sources: P.ui.draft.sources }); P.ui.one++; draw(); };
ACT.scOneSkip = () => { P.ui.one++; draw(); };

// ---------- the record Psyflo drafts from: the screening it heard, and what it drafted for the assessment
function screeningFor(c) {
  const s = S(); const sc = s.screenings.find(x => x.client === c.id && (x.boxes || x.facts || x.transcript));
  if (!sc) return null;
  const facts = sc.facts || (sc.transcript ? screeningFacts(sc.transcript) : null);
  const boxes = sc.boxes || (sc.transcript ? draftScreening({ transcript: sc.transcript, today: s.today }).boxes : []);
  return facts ? { facts, boxes, when: sc.when } : null;
}
const noScreening = (c, what) => `<div class="banner y">${I.warn}<div>No intake screening on record for ${esc(c.initials)}. Psyflo drafts the ${esc(what)} from the screening call, the assessment and the referral — run the screening first.</div></div><button class="btn o" data-act="nav" data-href="/consumers/${P.page.consumer.no}/session/screening">Open Intake Screening</button>`;
const ratingsHTML = (r, level) => `<div class="tile"><div class="lab">ASAM ratings · suggested from what was said · you confirm each</div>
  <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:6px;text-align:center">${DIMENSIONS.map(([d]) => `<div style="border:1px solid #E6E1D9;border-radius:8px;padding:4px 0;background:#fff"><div class="small muted">${d}</div><div style="font-size:18px;font-weight:700;color:${+r[d] >= 3 ? '#8A2E1C' : +r[d] >= 2 ? '#6F4A05' : '#15605E'}">${esc(r[d])}</div></div>`).join('')}</div>
  <div class="small" style="margin-top:6px">Points to <b>${esc(LEVEL_OPTION[level] || level)}</b> · ${level === '2.1' ? 'H0015 · 3 h a day, 3 days a week' : ''}</div></div>`;

// ---------- ASAM assessment (screen 15), live after Flow A
function asamView(c) {
  const s = S(); const u = P.ui; const screening = screeningFor(c);
  let html = header(`Scribe · ASAM assessment · ${c.initials} · ${meFromPage().name}`) + '<div class="body">' + flashHTML();
  if (!screening) return html + noScreening(c, 'ASAM assessment') + '</div>' + foot();
  const d = draftAssessment({ client: c, screening, referral: s.referrals.find(x => x.id === c.referral), today: s.today });
  const phq = c.id === 'TW' ? PHQ_TW.map((v, i) => ({ label: `PHQ item ${i + 1}`, value: v, src: [3], short: `PHQ-9 item ${i + 1}` })) : [];
  const all = { ...d, boxes: d.boxes.concat(phq) };
  const rec = u.cnaRec !== false;
  const payer = c.medicaid?.plan;
  html += `<div class="banner n"><span class="rec ${rec ? 'on' : ''}"></span><div style="flex:1"><b>${rec ? 'Recording' : 'Paused'} · assessment conversation</b> · consent to record given on the screening call</div><button class="tog" data-act="cnaPause">${rec ? 'Pause' : 'Resume'}</button></div>`;
  html += ratingsHTML(d.ratings, d.level);
  html += d.uds ? `<div class="banner">${I.ok}<div><b>UDS collected at the assessment.</b> ${esc(d.uds.result)}.${payer === 'humana' ? ' SilverSummit now denies Level 2.1 requests without it (3 denials since Sep 22) — Psyflo attaches it to the packet.' : ''}</div></div>` : `<div class="banner r">${I.no}<div><b>No UDS from the assessment.</b> Collect it now${payer === 'humana' ? ' — SilverSummit denies Level 2.1 without it, and does not pay for the test' : ''}.</div></div>`;
  html += draftBlock(all, { form: 'cna', client: c, intro: `<b>Assessment drafted for ${esc(c.initials)}</b> — six dimensions from the screening call (${fmtDate(screening.when)}) and what was said today. Ratings and the level of care are typed as suggestions; you decide.` });
  html += `<div><div class="lab">Still to ask</div>
      <div class="stamp"><div><b>D2</b></div><div>Last physical exam and any liver labs (alcohol most days)</div></div>
      <div class="stamp"><div><b>D6</b></div><div>How long the sister's offer holds; any sober-living waitlist</div></div>
      <div class="stamp"><div><b>Releases</b></div><div>42 CFR Part 2 releases: drug court case manager, buprenorphine prescriber</div></div></div>`;
  return html + '</div>' + foot();
}
ACT.cnaPause = () => { P.ui.cnaRec = P.ui.cnaRec === false; draw(); };

// ---------- treatment plan (screen 16)
function planView(c) {
  const s = S(); const screening = screeningFor(c);
  let html = header(`Scribe · Treatment plan · ${c.initials}`) + '<div class="body">' + flashHTML();
  if (!screening && c.id !== SEEDED_SAMPLE.isp) return html + noScreening(c, 'treatment plan') + '</div>' + foot();
  const d = draftPlan({ client: c, today: s.today });
  html += `<div class="banner y">${I.clock}<div><b>Level 2.1 starts only with prior authorization.</b> Process the plan and Psyflo drafts the request right away — no IOP day before Send is billable, and the plan cannot backdate it.</div></div>`;
  html += draftBlock(d, { form: 'isp', client: c, intro: `<b>Three goals drafted from the ASAM assessment</b>, one for each dimension rated highest (D5, D1, D6). Talk them through with ${esc(c.initials)}; change them here, not in the request — the request copies them.`, fillLabel: `Fill the plan (${d.boxes.length} boxes)` });
  return html + '</div>' + foot();
}

// ---------- Flow C · prior authorization request (screen 17)
function sraData(c) {
  const s = S(); const screening = screeningFor(c);
  if (!screening) return null;
  const asm = draftAssessment({ client: c, screening, today: (c.timeline?.intake || s.today) });
  const d = draftInitialSRA({ client: c, screening, referral: s.referrals.find(x => x.id === c.referral), today: s.today, isp: { date: c.timeline?.isp }, cna: { date: c.timeline?.intake }, assessment: { ratings: asm.ratings, uds: udsAtAssessment(c, (c.timeline?.intake || s.today).slice(0, 10)) }, payer: c.medicaid?.plan });
  if (P.ui.d5 != null) d.boxes = d.boxes.map(b => b.editable ? { ...b, value: P.ui.d5 } : b);
  return d;
}
function sraView(c) {
  const s = S(); const u = P.ui;
  const req = s.requests.find(r => r.client === c.id && r.type === 'initial' && !['closed'].includes(r.stage));
  const d = sraData(c);
  let html = header(`Review a prior authorization · ${c.initials} · Level 2.1 IOP`) + '<div class="body">' + flashHTML();
  if (!d) return html + noScreening(c, 'prior authorization request') + '</div>' + foot();
  if (req && !['draft_ready', 'awaiting_signature'].includes(req.stage)) html += `<div class="banner n">${I.open}<div>${esc(req.id)} is ${esc((M.STAGE_LABEL[req.stage] || req.stage).toLowerCase())}. This form was already processed.</div></div>`;
  const d5 = d.boxes.find(b => b.editable);
  const fields = P.page.form?.fields || [];
  const greenGoals = fields.filter(f => /^Goal \d$/.test(f.label) && f.green && f.value).length;
  const udsChk = d.checks.find(x => x.rule === 'UDS result attached');
  html += `${udsChk && !udsChk.pass ? `<div class="banner r">${I.no}<div><b>Blocked: no UDS result from the assessment.</b> ${esc(udsChk.detail)}</div></div>` : ''}
    <div class="tile t"><div style="font-size:13px"><b>Draft ready for ${esc(c.initials)}</b> — ${d.units} units ${esc('H0015')} (3 h × 3 days × 8 weeks), argued by ASAM dimension from the screening (${fmtDate(screening0(c)?.when)}), the assessment${c.timeline?.intake ? ' (' + fmtDate(c.timeline.intake) + ')' : ''}, the plan and the UDS.${req ? ' Tracked as ' + esc(req.id) + '.' : ''}${d.payerName ? ' Formatted for ' + esc(d.payerName) + '.' : ''}</div>
      <div class="lab" style="margin-top:10px">D5 · relapse potential — edit here</div>
      <textarea class="ed" aria-label="D5 draft" data-in="d5Edit">${esc(d5.value)}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="sraFill" ${u.filling ? 'disabled' : ''}>Fill all ${d.boxes.length} boxes</button><button class="btn o" data-act="sraOne">One at a time</button></div></div>
    ${u.one != null ? oneAtATime(d.boxes, 'sraOneType', 'sraOneSkip') : ''}
    ${ratingsHTML(d.ratings, levelFromRatings(d.ratings))}
    <div><div class="lab" style="margin-bottom:2px">Boxes on this form</div>
      ${d.boxes.map(b => `<div class="sec"><b>${esc(b.short || b.label)} ${srcChips(b, d.sources)}</b>${new Set(u.filled || []).has(b.label) ? '<span class="chip y">typed · check it</span>' : '<span class="chip g">drafted</span>'}</div>`).join('')}
      ${d.blank.map(b => `<div class="sec"><b>${esc(b.short || b.label)}</b><span class="chip n">${esc(b.why.split('.')[0])}</span></div>`).join('')}
      <div class="sec"><b>Goals 1–3 · diagnosis · NPI</b><span class="chip g">${greenGoals ? 'already in Client Record (from the treatment plan)' : 'copied from the treatment plan when it is processed'}</span></div></div>
    ${checksBlock(d.checks)}
    <div class="small muted">Then press <b>Process Form</b> in Client Record. It goes to Forms to Approve for your signature; Psyflo never signs.</div>`;
  return html + '</div>' + foot();
}
const screening0 = c => S().screenings.find(x => x.client === c.id);
ACT.d5Edit = el => { P.ui.d5 = el.value; };
ACT.sraFill = async () => { const c = clientForPage(); const d = sraData(c); await fillBoxes(d.boxes, { form: 'sra-initial', client: c, sources: d.sources }); draw(); };
ACT.sraOne = () => { P.ui.one = 0; draw(); };
ACT.sraOneType = async () => { const c = clientForPage(); const d = sraData(c); await fillBoxes([d.boxes[P.ui.one]], { form: 'sra-initial', client: c, sources: d.sources }); P.ui.one++; draw(); };
ACT.sraOneSkip = () => { P.ui.one++; draw(); };

// ---------- continued stay (screen 33): "abstinent in treatment" is argued under D5
function continuedView(c) {
  const s = S(); const u = P.ui; const sample = SEEDED_SAMPLE['sra-continued'];
  if (c.id !== sample) return noDraftHTML('sra-continued', c);
  const d = draftContinuedStay({ client: c, today: s.today, wording: u.csD5 });
  const req = s.requests.find(r => r.client === c.id && r.type === 'continued_stay' && !['closed', 'active'].includes(r.stage));
  const ab = d.checks[0];
  let html = header(`Continued stay · ${c.initials} · ${payerShort(c.authorization?.payer || req?.payer)}`) + '<div class="body">' + flashHTML();
  html += `<div class="banner y">${I.warn}<div><b>Abstinent inside Level 2.1.</b> Plans deny this as "no longer meets medical necessity". Psyflo argues D5: the abstinence is inside the structure, cravings continue, and step-down criteria are not met yet.</div></div>`;
  html += `<div class="tile t"><div style="font-size:13px"><b>Drafted from ${esc(c.initials)}'s IOP record</b> — attendance, 8 UDS results and the ASAM ratings at admission and now.${req ? ' Tracked as ' + esc(req.id) + '.' : ''}</div>
      <div class="lab" style="margin-top:10px">D5 · why Level 2.1 is still needed — edit here</div>
      <textarea class="ed" aria-label="D5 continued stay" data-in="csEdit">${esc(d.boxes.find(b => b.editable).value)}</textarea>
      <div class="ck">${ab.pass ? I.ok : I.no}<div><b>${esc(ab.rule)}</b> — ${esc(ab.detail)}</div></div>
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="csFill" ${u.filling ? 'disabled' : ''}>Fill ${d.boxes.length} boxes</button><button class="btn o" data-act="oneStart">One at a time</button></div></div>`;
  P.cur = { boxes: d.boxes, form: 'sra-continued', client: c, sources: d.sources };
  if (u.one != null) html += oneAtATime(d.boxes, 'curOneType', 'curOneSkip');
  html += ratingsHTML(d.ratings, '2.1');
  html += `<div><div class="lab">Drafted boxes · with sources</div>${d.boxes.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, d.sources)}</div>`).join('')}</div>${checksBlock(d.checks)}`;
  html += `<div class="small muted">If the plan still denies, Psyflo drafts the peer-to-peer brief from the same D5 evidence. Then press <b>Process Form</b>; you sign in Forms to Approve.</div>`;
  return html + '</div>' + foot();
}
ACT.csEdit = el => { const before = P.ui.csD5; P.ui.csD5 = el.value; const bad = /no longer (need|require|meet)/i; if (bad.test(el.value) !== bad.test(before || '')) draw(); };
ACT.csFill = async () => { const c = clientForPage(); const d = draftContinuedStay({ client: c, today: S().today, wording: P.ui.csD5 }); await fillBoxes(d.boxes, { form: 'sra-continued', client: c, sources: d.sources }); draw(); };

// ---------- other forms with a worked example (discharge / transfer, collateral, incident, plan review)
function noDraftHTML(type, c) {
  const s = S(); const sample = M.client(s, SEEDED_SAMPLE[type]); const no = noOf(sample);
  return header(`Psyflo · ${FORM_NAME[type]} · ${c.initials}`) + `<div class="body">${flashHTML()}<div class="banner n">${I.open}<div><b>No draft for ${esc(c.initials)} in this demo.</b> Psyflo drafts the ${esc(FORM_NAME[type].toLowerCase())} from ${['weekly', 'collateral'].includes(type) ? 'the recorded call' : 'the group notes, UDS results and ASAM ratings in range'}; the worked example is ${esc(sample.initials)}.</div></div>
    ${no ? `<button class="btn o" data-act="nav" data-href="/consumers/${no}/session/${type}">Open ${esc(sample.initials)}'s ${esc(FORM_NAME[type].toLowerCase())}</button>` : ''}</div>` + foot();
}
function otherView(type, c) {
  const s = S();
  if (type === 'incident' && c.id !== SEEDED_SAMPLE.incident) return incidentSayView(c);
  if (c.id !== SEEDED_SAMPLE[type]) return noDraftHTML(type, c);
  const d = draftSeeded(type, { client: c, today: s.today });
  let html = header(`${FORM_NAME[type]} · ${c.initials}`) + '<div class="body">' + flashHTML();
  if (type === 'discharge') html += `<div class="banner">${I.ok}<div><b>Step-down, not a discharge from care.</b> Level 2.1 → Level 1 at CCC of SN. When you process this, Psyflo drafts the new Level 1 initial request${c.medicaid?.plan === 'aetna' || c.authorization?.payer === 'aetna' ? ' on CareSource\'s own form, ASAM ratings on page 1' : ''}.</div></div>`;
  if (type === 'incident') html += `<div class="banner y">${I.warn}<div>Your supervisor reviews every incident. Psyflo fills only what was reported; naloxone and injury are yours.</div></div>`;
  html += draftBlock(d, { form: type, client: c, intro: `<b>${esc(FORM_NAME[type])} drafted for ${esc(c.initials)}</b> from: ${d.sources.map(x => esc(x.label)).join(' · ')}.` });
  if (type === 'discharge') html += `<a class="btn o" data-act="openApp" data-href="#/EarlyDischarge">Open the step-down plan in Psyflo ↗</a>`;
  return html + '</div>' + foot();
}
// incident for a client other than the worked example: say what happened; Psyflo fills only what it knows
function incidentSayView(c) {
  const s = S(); const me = meFromPage(); const said = P.ui.incSaid;
  let html = header(`Scribe · Incident report · ${c.initials} · ${M.staffShort(s, me.id)}`) + '<div class="body">' + flashHTML();
  html += `<div class="banner y">${I.warn}<div>Your supervisor reviews every incident. Psyflo fills only what you said and what it knows; the time, level, actions, naloxone and injury are yours.</div></div>`;
  if (!said) return html + sayItHTML('incident', `What happened with ${c.initials}, where, and what you did. Psyflo puts your words in the report.`) + '</div>' + foot();
  const boxes = incidentBoxes(c, said);
  html += `<div class="tile"><div class="lab row" style="gap:6px">${I.mic}Said here<a href="#" class="chip n" style="margin-left:auto" data-act="incAgain">Say it again</a></div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(said)}”</div></div>
    <div class="row"><button class="btn p" style="flex:1" data-act="incFill" ${P.ui.filling ? 'disabled' : ''}>Fill ${boxes.length} boxes</button></div>
    <div><div class="lab">Boxes · where each comes from</div>${boxes.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v">${esc(b.value)}</div>${srcChips(b, INC_SOURCES)}</div>`).join('')}
    ${['Date/time', 'Level', 'Actions taken', 'Naloxone given', 'Injury'].map(l => `<div class="box"><div class="l">${l}</div><div class="v muted">Left for you</div></div>`).join('')}</div>
    <div class="small muted">Then press Process Form in Client Record; Psyflo keeps what you save.</div>`;
  return html + '</div>' + foot();
}
const INC_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Psyflo record' }, { n: 3, label: 'Signed in as' }];
function incidentBoxes(c, said) {
  const s = S(); const me = meFromPage();
  const txt = said.charAt(0).toUpperCase() + said.slice(1).replace(/\s+$/, '');
  return [{ label: 'Location', value: site(c.school).name || '', src: [2] }, { label: 'Staff present', value: M.staffShort(s, me.id), src: [3] }, { label: 'What happened', value: /[.!?]$/.test(txt) ? txt : txt + '.', src: [1] }].filter(b => b.value);
}
ACT.incAgain = () => { P.ui.incSaid = null; P.ui.said = ''; draw(); };
ACT.incFill = async () => { const c = clientForPage(); await fillBoxes(incidentBoxes(c, P.ui.incSaid), { form: 'incident', client: c, sources: INC_SOURCES }); draw(); };

// ---------- IOP group note (screen 23, hidden in this build)
// Two ways in: a dictation saved earlier drops in when the note opens, or the counselor says (or types) what
// happened right here in the panel. Either way Psyflo drafts the boxes; the person presses Fill.
const DPN_EXAMPLE = "Maria shared in group that she had strong cravings Saturday at her cousin's party, she left early and called her sponsor, we practiced urge surfing";
function dpnState(c) {
  const s = S(); const u = P.ui;
  const dict = waitingDict(c)[0] || (u.usedDict && (s.dictations || []).find(d => d.id === u.usedDict));
  const t = Object.values(s.timers || {}).find(x => x.client === c.id) || (s.timers || {})[c.staff] || {};
  const blocks = (t.blocks && t.blocks.length ? t.blocks : null) || ((s.notes_sample || []).find(n => n.client === c.id)?.contact_time) || [];
  const ct = contactTime(blocks, { confirmed: u.unitsConfirmed !== false });
  const input = dict ? dict.spoken : '';
  const e = input ? enhanceFor(c, input) : null;
  return { dict, ct, e, input, blocks };
}
const enhanceFor = (c, text) => { const s = S(); return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions || [], recent: (s.notes || []).filter(n => n.client === c.id).map(n => n.enhanced) }); };
function dpnBoxes(c, st) {
  const e = st.e; const g = (c.goals || [])[(e?.objective || 1) - 1];
  const b = st.blocks.length ? [{ label: 'Session times', value: st.ct.lines, src: [2] }, { label: 'Time in group', value: st.ct.text, src: [2] }, { label: 'Units', value: String(st.ct.units), src: [2] }] : [];
  if (e) {
    if (g) b.push({ label: 'Plan objective addressed', value: `Goal ${g.n} – ${g.objective}`, src: [3] });
    if (e.mood) b.push({ label: 'Check-in (mood · cravings)', value: e.mood, src: [1] });
    if (e.progress) b.push({ label: 'Progress', value: e.progress, src: [1] });
    b.push({ label: 'Narrative', value: e.narrative, src: [1, 2, 3] });
  }
  return b;
}
const DPN_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Group timer' }, { n: 3, label: 'The treatment plan' }];
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
    <textarea class="ed" aria-label="What happened" data-in="sayText" placeholder="${kind === 'incident' ? 'e.g. client called from the ED after a return to use; no staff present' : 'e.g. practiced urge surfing in group; she named two triggers'}">${esc(u.said || '')}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn o" style="flex:1" data-act="sayDraft" data-k="${kind}">Draft it</button></div>
    <div class="small muted" style="margin-top:4px">${hasSpeech() ? 'The microphone uses the browser\'s speech recognition; nothing is recorded until you press Record.' : 'Speech recognition is not available in this browser — type it instead.'}</div></div>`;
}
function groupNoteView(c) {
  const s = S(); const u = P.ui; const st = dpnState(c); const e = st.e;
  let html = header(`Scribe · IOP group note · ${c.initials} · ${M.staffShort(s, c.staff || meFromPage().id)}`) + '<div class="body">' + flashHTML();
  if (u.dropped) html += `<div class="banner">${I.ok}<div><b>Boxes typed</b> · narrative and session times typed into the open form, yellow. Confirm the units, then press Save Form Data or Process Form — Psyflo keeps what you save.</div></div>`;
  if (!st.dict) html += sayItHTML('dpn', `One or two sentences about what ${c.initials} did in group today. Psyflo writes the note from it, the plan and the group timer.`);
  else html += `<div class="tile"><div class="lab row" style="gap:6px">${I.mic}Said ${st.dict.source === 'panel' ? 'here' : 'on the phone'}, ${fmtTime(st.dict.at)}${st.dict.status === 'waiting' ? '<a href="#" class="chip n" style="margin-left:auto" data-act="sayAgain">Say it again</a>' : ''}</div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(st.input)}”</div></div>`;
  if (e) html += `<div><div class="lab" style="margin-bottom:4px">Drafted for the narrative</div><div class="par">${esc(e.narrative)}</div></div>
    <div><div class="lab">What Psyflo added, and where it came from</div>${e.chips.map(ch => `<div class="sec"><b>${esc(ch.text)}</b><span class="chip g">${esc(ch.from)}</span></div>`).join('')}</div>`;
  html += `<div><div class="lab">Session times · from the group timer</div>${st.ct.rows.map(r => `<div class="stamp"><div>${fmtT(r.from)}–${fmtT(r.to)}</div><div>${esc(r.what)}${r.unconfirmed ? ` <span class="chip ${u.unitsConfirmed ? 'g' : 'y'}">${u.unitsConfirmed ? 'confirmed' : 'unconfirmed'}</span>` : ''}</div></div>`).join('') || '<div class="small muted">No timer blocks today · type the session times in Client Record.</div>'}
    ${st.ct.rows.length ? `<div class="sec"><b>Time in group ${esc(st.ct.text)} → ${st.ct.units} units H0015</b>${u.unitsConfirmed ? '<span class="chip g">confirmed</span>' : `<button class="btn p" style="min-height:32px" data-act="confirmUnits">Confirm ${contactTime(st.blocks, { confirmed: true }).units} units</button>`}</div>` : ''}</div>`;
  if (e) html += `<div class="row"><button class="btn p" style="flex:1" data-act="dpnFill" ${u.filling ? 'disabled' : ''}>${u.dropped ? 'Type it again' : 'Fill the boxes'}</button></div>
    ${feedbackHTML(st.dict)}
    ${checksBlock(e.checks)}`;
  return html + '</div>' + foot();
}
// "Good recommendation" / "Needs improvement" + how to improve; stored with the dictation and, once processed, the note
function feedbackHTML(dict) {
  const u = P.ui; const prev = (dict?.feedback || []).at(-1);
  if (!u.fbDone && prev && !u.fbOpen) return `<div class="banner n">${I.ok}<div>${prev.kind === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(prev.text)}”.`} Your supervisor sees it with the note. <a href="#" data-act="needsImp">Add more</a></div></div>`;
  if (u.fbDone) return `<div class="banner n">${I.ok}<div>${u.fbDone === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(u.fbSent || '')}”.`} Your supervisor sees it with the note.</div></div>`;
  return `<div class="row"><button class="btn o" style="flex:1" data-act="goodRec">Good recommendation</button><button class="btn o${u.fbOpen ? ' on' : ''}" style="flex:1" data-act="needsImp">Needs improvement</button></div>
    ${u.fbOpen ? `<div class="tile"><div class="lab">How should Psyflo improve it?</div><textarea class="ed" aria-label="How to improve" data-in="fbText" placeholder="e.g. wrong goal · too long · she did not call her sponsor">${esc(u.fbText || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn p" style="flex:1" data-act="fbSend">Save feedback</button><button class="btn o" data-act="fbCancel">Cancel</button></div></div>` : ''}`;
}
const fmtT = hhmm => { let [h, m] = hhmm.split(':').map(Number); h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}`; };
ACT.confirmUnits = async () => { P.ui.unitsConfirmed = true; const c = clientForPage(); const st = dpnState(c); await fillBoxes([{ label: 'Time in group', value: st.ct.text }, { label: 'Units', value: String(st.ct.units) }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false }); flash(`${st.ct.units} units confirmed (${st.ct.text}; H0015 is 1 unit per hour).`); };
ACT.dpnFill = async () => { const c = clientForPage(); const st = dpnState(c); await fillBoxes(dpnBoxes(c, st), { form: 'dpn', client: c, sources: DPN_SOURCES }); P.ui.dropped = true; draw(); };
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
  const e = enhanceFor(c, text);
  const r = await api.do('panel.dictation', { client: c.id, staff: me.id, spoken: text, rewritten: e.narrative, chips: e.chips, checks: e.checks });
  P.ui.usedDict = r?.id; P.ui.dropped = false; P.ui.fbDone = null; P.ui.fbOpen = false; P.ui.unitsConfirmed = false;
  draw();
}
ACT.sayAgain = async () => { const c = clientForPage(); const d = waitingDict(c).find(x => x.source === 'panel'); if (d) await api.do('dictation.discard', { id: d.id }); P.ui.usedDict = null; P.ui.said = ''; P.ui.dropped = false; P.ui.fbDone = null; draw(); };
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
    html += `<div class="banner">${I.ok}<div><b>Signed in Client Record.</b> ${file ? 'Psyflo saved the signed preview as PDF and assembled the packet' + (type === 'sra-initial' ? ', with the UDS result from the assessment' : '') + '.' : 'Psyflo logged the signature.'}</div></div>
      ${file ? `<a class="btn o" href="${esc(file.url)}" target="_blank" rel="noopener">${I.doc} ${esc(file.name || 'Signed PDF')}</a>` : ''}
      ${req ? `<div class="row"><a class="btn p" style="flex:1" href="${esc(appURL('#/Submission?id=' + req.id))}" target="_blank" rel="noopener">After signing: open Send ↗</a></div><div class="small muted">${esc(payerShort(req.payer))} · ${esc(channel(req))}. You press Send in Psyflo${req.channel === 'fax' ? '; it faxes through CCC of SN\'s Sfax account and keeps the delivery receipt as proof of timely submission.' : req.channel === 'portal' ? '; it opens the HPN portal in your own login with the text formatted to paste.' : '; it opens the portal in your own login with the packet ready.'}</div>` : ''}`;
    return html + '</div>' + foot();
  }
  // before signing: compare the preview with what Psyflo typed
  const typed = req?.typed_boxes || [];
  const fills = (s.fills || []).filter(f => c && f.client === c.id && f.form === type).flatMap(f => f.boxes.map(b => b.label));
  const d = c && type === 'sra-initial' ? sraData(c) : null;
  let edits = 0; if (d) for (const b of d.boxes) { const row = (pv.rows || []).find(r => r.label === b.label); if (row && row.value !== b.value) edits++; }
  const sinceAsm = c?.timeline?.intake ? daysBetween(c.timeline.intake, s.today) : null;
  html += `<div><div class="lab" style="margin-bottom:4px">Before you sign</div>
    <div class="ck">${edits ? I.warn : I.ok}<div>${d ? (edits ? `${edits} box${edits === 1 ? '' : 'es'} changed after Psyflo typed ${edits === 1 ? 'it' : 'them'} · that is fine, you are the author` : 'Every box matches the draft you approved · 0 edits since') : `${new Set(fills.concat(typed)).size} boxes were typed by Psyflo`}</div></div>
    ${d ? `<div class="ck">${d.checks.every(x => x.pass) ? I.ok : I.warn}<div>6 of 6 dimensions argued · UDS ${d.uds ? 'attached' : 'missing'} · ${d.units} units = 3 h × 3 days × 8 weeks</div></div>` : ''}
    ${sinceAsm != null && type === 'sra-initial' ? `<div class="ck">${sinceAsm > 2 ? I.warn : I.ok}<div>Assessment ${sinceAsm} day${sinceAsm === 1 ? '' : 's'} ago · IOP days before Send are not billable; the start date cannot be backdated</div></div>` : ''}</div>
    <div><div class="lab" style="margin-bottom:4px">After you sign</div>
    <div class="stamp"><div>Psyflo</div><div>Saves the signed preview as PDF</div></div>
    <div class="stamp"><div>Packet</div><div>${req ? (req.channel === 'fax' ? `Form + UDS result + cover sheet · ${esc(payerShort(req.payer))} fax` : req.channel === 'portal' ? `Text formatted for the ${esc(payerShort(req.payer))} portal` : `Form + assessment + plan · ready for ${esc(channel(req))}`) : 'Kept with the record in Psyflo'}</div></div>
    <div class="stamp"><div>You</div><div>${req ? 'Press Send in Psyflo' : 'Nothing else'}</div></div></div>
    <div class="small muted">Press <b>Get Signature</b> in Client Record. Psyflo never signs.</div>`;
  return html + '</div>' + foot();
}

// ---------------------------------------------------------------- automatic behaviour on open
// Typing happens only into the form the user has open, and only where the demo says it drops in:
// the screening's pre-call boxes and a waiting dictation.
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
    const d = waitingDict(c)[0];
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
