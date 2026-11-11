// Home (screen 13), new consumer, the consumer record page, and the plain states (not signed in, TDT only, portals, lists).
import { P, S, M, ACT, api, esc, LEVEL, FORM_NAME, meFromPage, myLevel, clientForPage, laurisNo, usDate, flash, nav, draw, call, fillBoxes, asItem, renderBoxes, appURL } from './core.js';
import { frame, chip, sevKind, I, btn, card, stepper, flashLine, help, checksLine } from './ui.js';
import { fmtDate, fmtTime } from '../js/shared/dates.js';

const wrap = (o, body, extra = {}) => frame({ logo: P.logo, body: flashLine(P.ui.flash) + body, ...o, ...extra });
const note = text => `<div class="fl n">${I.open}<div>${esc(text)}</div></div>`;

// ---------------------------------------------------------------- Worklist rows (home)
function wrow(r) {
  const btnK = r.primary ? 'p' : 'o';
  const act = r.path ? `data-act="nav" data-href="${esc(r.path)}"` : `data-act="go" data-href="${esc(r.href)}"`;
  return `<div class="wr"><span class="chip ${sevKind(r.sev)}">${esc(r.chip)}</span><span class="tt"><b>${esc(r.who)}</b> ${esc(r.what)}</span><button type="button" class="btn s ${btnK}" ${act}>${esc(r.btn)}</button></div>`;
}
function worklistRows(me, lvl) {
  const s = S();
  if (lvl >= 3) return M.worklist(s, me.id).items.map(i => ({ chip: i.chip, sev: i.sev, who: i.who || '', what: i.what, btn: i.btn, href: i.href, primary: i.primary }));
  const rows = []; const mine = s.clients.filter(c => c.staff === me.id);
  const dpn = c => { const n = laurisNo(c); return n ? `/consumers/${n}/session/dpn` : '/consumers'; };
  for (const c of mine) if (M.waitingDictations(s, c.id).length) rows.push({ chip: 'Waiting', sev: 'y', who: M.clientLabel(s, c.id), what: 'dictation from the phone', btn: 'Open note', path: dpn(c), primary: true });
  if (lvl === 2) { const n = s.notes.filter(x => x.review === 'pending').length; if (n) rows.push({ chip: String(n), sev: 'y', who: `${n} notes`, what: 'to review', btn: 'Open', href: 'ReviewQueue.dc.html', primary: false }); }
  const nt = M.notesToday(s, me.id);
  for (const c of nt.students) if (!nt.doneSet.has(c.id) && !rows.some(r => r.who === M.clientLabel(s, c.id))) rows.push({ chip: 'Due', sev: 'n', who: M.clientLabel(s, c.id), what: 'daily note', btn: 'Open note', path: dpn(c), primary: false });
  return rows;
}

// ---------------------------------------------------------------- the student picker and launchers
const studs = () => (P.page.consumers || []).filter(x => x.program === 'TDT');
function pickedStudent() {
  const l = studs(); const typed = P.ui.studentText;
  if (typed != null) return l.find(x => x.initials.toLowerCase() === typed.trim().toLowerCase()) || null;
  return l.find(x => String(x.no) === String(P.ui.student)) || l[0] || null;
}
ACT.pickStudent = el => { P.ui.studentText = el.value; };
const clientOfNo = no => S().clients.find(x => x.harvest_no === Number(no) || x.lauris_no === Number(no));
ACT.launch = async el => {
  const st = pickedStudent(); const k = el.dataset.l; const me = meFromPage();
  if (k === 'time' && S().timers[me.id]?.started) return ACT.timerStop();
  if (!st) return flash('Pick a student', 'y');
  if (k === 'say') return nav(`/consumers/${st.no}/session/dpn`);
  if (k === 'call') return nav(`/consumers/${st.no}/session/screening`);
  if (k === 'req') { const c = clientOfNo(st.no); const r = c && S().requests.find(q => q.client === c.id && ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed'].includes(q.stage)); return nav(`/consumers/${st.no}/session/${r && r.type !== 'initial' ? 'sra-continued' : !r && c?.stage === 'in_service' ? 'sra-continued' : 'sra-initial'}`); }
  if (k === 'time') { const c = clientOfNo(st.no); if (!c) return flash('That student is not in Psyflo', 'r'); await api.do('timer.start', { staff: me.id, client: c.id }); flash('Timer started · ' + c.initials); }
};
ACT.timerStop = async () => { await api.do('timer.stop', { staff: meFromPage().id }); flash('Timer stopped'); };

export function homeView() {
  const s = S(); const me = meFromPage(); const lvl = LEVEL[me.role];
  const rows = worklistRows(me, lvl).slice(0, 3);
  const t = s.timers[me.id]; const running = t && t.started; const st = pickedStudent();
  const L = (label, k, extra = {}) => btn(label, 'launch', { k: 'o', attrs: `data-l="${k}"`, disabled: extra.disabled, title: extra.title });
  const noSt = st ? {} : { disabled: true, title: 'Pick a student' };
  const launchers = [];
  if (lvl <= 3) launchers.push(L('Say what happened', 'say', noSt), L(running ? 'Stop timer' : 'Track time', 'time', running ? {} : noSt));
  if (lvl === 3) launchers.push(L('Record a call', 'call', noSt));
  if (lvl >= 3) launchers.push(L('Draft a request', 'req', noSt));
  const opts = studs().map(x => `<option value="${esc(x.initials)}" label="${esc(x.units)}"></option>`).join('');
  return wrap({ form: 'Psyflo', link: { text: 'Open Psyflo ↗', href: '#/' + (lvl >= 3 ? 'DoNext' : 'MobileApp') } }, `
    <div><h2 class="h">Worklist</h2></div>
    ${rows.length ? `<div class="wl">${rows.map(wrow).join('')}</div>` : '<div class="muted">Nothing due</div>'}
    <div><div class="lab">Student</div><input class="in" type="search" list="stud-list" aria-label="Student" data-in="pickStudent" placeholder="Student" value="${esc(P.ui.studentText != null ? P.ui.studentText : (st ? st.initials : ''))}"><datalist id="stud-list">${opts}</datalist></div>
    <div class="lau">${launchers.join('')}</div>
    ${running ? `<div class="row small muted">${I.open}<span>${esc(M.clientLabel(s, t.client, false))} since ${esc(fmtTime(t.started))}</span></div>` : ''}`);
}

// ---------------------------------------------------------------- new referrals + new consumer (Flow A starts here)
// A referral from the school portal is "new" until a person creates the consumer in Lauris. Referrals may point at a Psyflo client
// (T.W.) or carry only a label from the school ("A.R., 9").
export function refInfo(r) {
  const s = S(); const c = s.clients.find(x => x.id === r.client) || null;
  const m = String(r.client || '').match(/^([A-Z]\.[A-Z]\.)(?:,\s*(\d+))?/);
  return { c, initials: c ? c.initials : (m ? m[1] : String(r.client || '')), age: c ? c.age : (m && m[2] ? +m[2] : null), label: M.clientLabel(s, r.client), inLauris: !!(r.lauris_no || (c && c.lauris_no)) };
}
export function candidateReferrals() { return S().referrals.filter(r => ['needs_screening', 'screening_booked', 'in_intake'].includes(r.stage) && !refInfo(r).inLauris); }
const NEW_SOURCES = [{ n: 1, label: 'Referral form' }, { n: 2, label: 'Family link' }, { n: 3, label: 'Psyflo record' }, { n: 4, label: 'You (signed in)' }];
function newConsumerBoxes(r) {
  const s = S(); const i = refInfo(r); const sch = M.school(s, r.school || i.c?.school); const a = M.familyLinkFor(s, r.id)?.answers || {};
  const b = [{ label: 'Name', value: i.initials, src: [1] }];
  if (a.dob) b.push({ label: 'Date of birth', value: usDate(a.dob), src: [2] });
  if (sch.locality) b.push({ label: 'Locality', value: sch.locality, src: [1] });
  if (sch.name) b.push({ label: 'School', value: sch.name, src: [1] });
  b.push({ label: 'Program', value: 'TDT', src: [1] });
  const me = meFromPage(); const cl = i.c?.clinician ? M.staff(s, i.c.clinician) : (me.role === 'clinician' ? me : null);
  if (cl) b.push({ label: 'Clinician', value: `${M.staffShort(s, cl.id)}${cl.credential ? ', ' + cl.credential : ''}`, src: [i.c?.clinician ? 3 : 4] });
  return b;
}
export function newConsumerView() {
  const s = S(); const cands = candidateReferrals();
  const qref = new URL(P.page.url).searchParams.get('referral');
  const refId = P.ui.ref || (cands.find(r => r.id === qref) || cands[0] || {}).id;
  const r = s.referrals.find(x => x.id === refId);
  if (!r) return wrap({ form: 'New consumer' }, note('No referral waiting'));
  const i = refInfo(r); const el = M.eligibilityFor(s, r.id);
  const boxes = newConsumerBoxes(r); const typed = (P.ui.filled || []).length > 0;
  const elig = !el || el.status !== 'recorded';
  const sel = `<select class="sel" aria-label="Referral" data-ch="pickRef">${cands.map(x => `<option value="${x.id}"${x.id === refId ? ' selected' : ''}>${x.id} · ${esc(refInfo(x).label)}</option>`).join('')}</select>`;
  const sc = card(`${stepper(['Fill', 'Record', 'Review'], typed ? 2 : 1)}
    <div class="row">${btn(typed ? 'Type again' : `Fill ${boxes.length} boxes`, 'fillNew', { k: typed ? 'o' : 'p', f: true, disabled: P.ui.filling, title: elig ? 'Eligibility is checked only after the family link' : '' })}${btn('Record', 'noop', { k: 'o', disabled: true, title: 'Save Consumer first' })}</div>`);
  return wrap({ form: 'New consumer', student: i.initials, chip: [r.id, 'n'] }, `${sel}${sc}${renderBoxes('new', boxes.map(b => asItem('new', b)), NEW_SOURCES)}`);
}
ACT.pickRef = el => { P.ui.ref = el.value; P.ui.filled = []; draw(); };
ACT.fillNew = async () => {
  const s = S(); const cands = candidateReferrals();
  const r = s.referrals.find(x => x.id === (P.ui.ref || (cands.find(x => x.id === new URL(P.page.url).searchParams.get('referral')) || cands[0])?.id));
  if (!r) return; const i = refInfo(r);
  try { localStorage.setItem('psyflo_newref', JSON.stringify({ ref: r.id, initials: i.initials, at: Date.now() })); } catch (e) { }
  await fillBoxes(newConsumerBoxes(r), { form: 'new-consumer', client: i.c || { id: r.id }, sources: NEW_SOURCES });
};
// after Save Consumer: link a label-only referral (no Psyflo client yet) to the new Harvest #
export function referralForConsumer(no, initials) {
  const s = S();
  const byNo = s.referrals.find(r => r.lauris_no && r.lauris_no === Number(no)); if (byNo) return byNo;
  let hint = null; try { hint = JSON.parse(localStorage.getItem('psyflo_newref') || 'null'); } catch (e) { }
  if (hint && hint.initials === initials) { const r = s.referrals.find(x => x.id === hint.ref); if (r) return r; }
  return candidateReferrals().find(r => refInfo(r).initials === initials) || null;
}

// ---------------------------------------------------------------- the consumer record page
export function recordView(c, { requestView } = {}) {
  const s = S(); const p = P.page; const ev = P.event; const lvl = myLevel();
  if (!c) {
    const r = p.consumer && referralForConsumer(p.consumer.no, p.consumer.initials);
    if (r && ev && ev.event === 'created' && !r.lauris_no && P.linking !== r.id) { P.linking = r.id; api.do('referral.inLauris', { id: r.id, no: p.consumer.no }).catch(() => { }); }
    if (r && (r.lauris_no === Number(p.consumer.no) || (ev && ev.event === 'created')))
      return wrap({ form: 'Student', student: p.consumer.initials, chip: [`Harvest # ${p.consumer.no}`, 'g'] }, `${card(`<div class="stat ok">${I.ok}In Lauris</div>${lvl >= 3 ? btn('Open screening', 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${p.consumer.no}/session/screening"` }) : ''}`)}`);
    return wrap({ form: 'Student', student: p.consumer?.initials }, note('Not a Psyflo student'));
  }
  const no = p.consumer.no;
  // a processed request form: the same request panel, now as a status line
  if (ev && ev.event === 'processed' && /^sra-/.test(ev.form || '') && requestView) return requestView(c, ev.form === 'sra-initial' ? 'initial' : 'continued_stay');
  const d = M.waitingDictations(s, c.id), a = M.waitingAssessments(s, c.id);
  const reqs = s.requests.filter(r => r.client === c.id && !['active', 'closed'].includes(r.stage));
  const rows = [];
  if (ev && ev.event === 'processed') {
    const f = ev.form; const next = { screening: ['cna', 'Open intake'], cna: ['isp', 'Open plan'], isp: ['sra-initial', 'Open request'], 'sra-initial': ['/approvals', 'Open Forms to Approve'], 'sra-continued': ['/approvals', 'Open Forms to Approve'] }[f];
    rows.push(card(`<div class="stat ok">${I.ok}${esc(FORM_NAME[f] || f)} processed</div>${next ? btn(next[1], 'nav', { k: 'p', f: true, attrs: `data-href="${next[0].startsWith('/') ? next[0] : `/consumers/${no}/session/${next[0]}`}"` }) : ''}${f === 'isp' ? ispSignLine(c) : ''}`));
    rows.push(savedLine());
  } else if (ev && ev.event === 'created' && !(lvl >= 3 && !(s.screenings.some(x => x.client === c.id && (x.status === 'done' || x.processed_at)) || !!c.timeline?.screening))) rows.push(card(`<div class="stat ok">${I.ok}In Lauris · Harvest # ${esc(no)}</div>`));
  if (!rows.length || (ev && ev.event === 'saved')) { if (ev && ev.event === 'saved') rows.push(savedLine()); }
  if (d.length) rows.push(card(`<div class="t">${I.mic}Dictation waiting</div>${btn('Open daily note', 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${no}/session/dpn"` })}`));
  if (a.length) rows.push(card(`<div class="t">${I.mic}${esc(a.map(x => x.instrument).join(', '))} waiting</div>${p.kind === 'surveys' ? btn(`Type the ${a[0].instrument} answers`, 'dropSurvey', { k: 'p', f: true }) : btn('Open Surveys', 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${no}/surveys?instrument=${encodeURIComponent(a[0].instrument)}"` })}`));
  const screened = s.screenings.some(x => x.client === c.id && (x.status === 'done' || x.processed_at)) || !!c.timeline?.screening;
  if (lvl >= 3 && !screened && !(ev && ev.event === 'processed')) rows.push(card(`${ev && ev.event === 'created' ? `<div class="stat ok">${I.ok}In Lauris · Harvest # ${esc(no)}</div>` : ''}${btn('Open screening', 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${no}/session/screening"` })}`));
  const forms = ['dpn', 'weekly', 'collateral', 'incident'].concat(lvl >= 3 ? ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'] : []);
  const reqRows = reqs.length && lvl >= 3 ? `<div class="bl">${reqs.map(r => { const st = M.statusChip(s, r); return `<div class="li"><span class="tt"><b>${esc(M.TYPE_LABEL[r.type])}</b></span>${chip(st.text, sevKind(st.sev))}</div>`; }).join('')}</div>` : '';
  const formRows = `<div class="bl">${forms.map(f => `<div class="li"><span class="tt"><b>${esc(FORM_NAME[f])}</b></span>${btn('Open', 'nav', { k: 'o', s: true, attrs: `data-href="/consumers/${no}/session/${f}"` })}</div>`).join('')}</div>`;
  return wrap({ form: 'Student', student: c.initials, chip: [`Harvest # ${no}`, 'n'] }, `${rows.join('')}${reqRows}${formRows}`);
}
ACT.dropSurvey = async () => {
  const s = S(); const c = clientForPage(); const a = M.waitingAssessments(s, c.id)[0];
  const inst = P.page.form?.instrument;
  if (a.instrument !== inst) { nav(`/consumers/${P.page.consumer.no}/surveys?instrument=${encodeURIComponent(a.instrument)}`); return; }
  const vals = Object.values(a.answers || {});
  await fillBoxes(vals.map((v, i) => ({ label: `${a.instrument} item ${i + 1}`, value: String(v) })), { form: 'survey', client: c, sources: [{ n: 1, label: 'Asked on the phone' }] });
  await api.do('assessment.used', { id: a.id });
};

// what was saved in Lauris (Save Form Data / Process Form), kept as Psyflo's saved version: one line, expand for the changes
export function savedLine() {
  const ev = P.event; if (!ev || !['saved', 'processed'].includes(ev.event)) return '';
  const v = (S().lauris_versions || []).filter(x => String(x.session) === String(ev.session) && x.event === ev.event).at(-1);
  if (!v) return '';
  const n = Object.keys(v.filled || {}).length; const ch = (v.changed || []).length + (v.cleared || []).length;
  const cut = t => { t = String(t ?? ''); return t.length > 90 ? t.slice(0, 88) + '…' : t; };
  const open = P.ui.savedOpen;
  return `<div><button type="button" class="btn t s" data-act="savedToggle" aria-expanded="${open ? 'true' : 'false'}">Saved version ${n ? `· ${ch} of ${n} changed` : ''} ${open ? I.up : I.chev}</button>
    ${open ? `<div class="bx-s" data-doc>${(v.changed || []).map(x => `<div><b>${esc(x.label)}</b><span>Typed: ${esc(cut(x.filled))} · Saved: ${esc(cut(x.saved))}</span></div>`).join('')}${(v.cleared || []).map(l => `<div><b>${esc(l)}</b><span>emptied</span></div>`).join('') || ''}${!ch ? '<div><span>No changes after fill</span></div>' : ''}</div>` : ''}</div>`;
}
ACT.savedToggle = () => { P.ui.savedOpen = !P.ui.savedOpen; draw(); };
// treatment plan: the guardian signs on the parent portal
export function ispSignLine(c) {
  const t = (S().portal_tasks || []).filter(x => x.client === c.id && x.form === 'Treatment plan').at(-1);
  if (t && t.status === 'signed') return `<div class="stat ok">${I.ok}Guardian signed</div>`;
  if (t) return `<div class="stat watch">${I.open}Sent to guardian</div>`;
  return btn('Send to guardian', 'ispSign', { k: 'o', f: true });
}
ACT.ispSign = async el => { const c = clientForPage(); if (!c) return; el.disabled = true; await api.do('portalTask.create', { client: c.id, form: 'Treatment plan', why: 'Guardian signature on the treatment plan' }); flash('Sent to the parent portal'); };

// ---------------------------------------------------------------- plain states
export function loadingView() { return frame({ logo: P.logo, form: 'Psyflo', legend: false, body: '<div class="muted">Loading…</div>', demo: false }); }
export function unframedView() { return frame({ logo: P.logo, form: 'Psyflo', legend: false, body: `${note('Runs beside a Lauris page')}${btn('Open Lauris', 'openLauris', { k: 'p', f: true })}` }); }
ACT.openLauris = () => window.open(`${api.config.laurisURL}/login?as=jperez`, '_blank', 'noopener');
export function waitingView() { return frame({ logo: P.logo, form: 'Psyflo', legend: false, body: note('Reading this page…') }); }
export function loginView() { return frame({ logo: P.logo, form: 'Psyflo', legend: false, body: note('Sign in to Lauris') }); }
export function offView(consumer) { return frame({ logo: P.logo, form: 'Psyflo off', student: consumer.initials, chip: [consumer.program, 'n'], legend: false, body: note('TDT students only') }); }
export function listView() { return wrap({ form: P.page.kind === 'saved' ? 'Saved forms' : 'Rejected forms', legend: false }, note('Open a form to see its draft')); }
export function portalView() {
  const p = P.page;
  if (p.kind === 'portal-confirmation') {
    const r = P.event?.result?.request;
    return wrap({ form: 'Portal upload', legend: false, chip: [p.portal.ref, 'g'] }, `${card(`<div class="stat ok">${I.ok}Confirmation read</div>${r ? btn('Open activity', 'openApp', { k: 'p', f: true, attrs: `data-href="#/Authorizations?open=${esc(r)}"` }) : '<div class="muted small">No send waiting</div>'}`)}`);
  }
  return wrap({ form: 'Portal upload', legend: false }, card('<div class="t">Attach the packet, press Submit</div>'));
}
