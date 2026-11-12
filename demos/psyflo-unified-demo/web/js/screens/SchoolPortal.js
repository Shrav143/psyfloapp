// 3 · School portal (counselor home, desktop). Home: the one "Harvest needs" card (missing referral information) above the list of the school's
// referrals, a short update form, and the way to refer a student. Per the Nov 7 product call schools refer and their job is done: no teacher portal,
// no teacher check-ins, no treatment plan. The school sees STATUS TEXT only: never clinical content, never another school's student, never outpatient
// information. A permitted update (school.share) is non-clinical and is credited to the counselor when staff use it in a note.
// Also exports the helpers the other school screens (ReferralForm, ReferralSent) and FamilyLink share (bindForm keeps the F1 fix for the shell's hidden h1).
import { register, Screen, M, session, ui, go, toast, api, raw, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';

// ---------- shared school helpers ----------
export const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const LEVEL_WORD = { ES: 'Elementary School', MS: 'Middle School', HS: 'High School' };
export function schoolLong(s, id) {
  const sc = M.school(s, id); const m = String(id).match(/(ES|MS|HS)(\d+)/);
  return m ? `${sc.locality} · ${LEVEL_WORD[m[1]]} ${m[2]}` : sc.name;
}
export function schoolShort(s, id) { return (M.school(s, id).name || id).split(' · ').pop(); }
// the school user is the session's actor (the server resolved it from the school link); the old localStorage choice only serves the presenter's first view
export function schoolUser() {
  const s = api.state; const a = api.session && api.session();
  if (a && a.kind === 'school') { const u = (s.school_users || []).find(x => x.id === a.userId); if (u) return u; }
  const u = session.schoolUser;
  return u || (s.school_users || []).find(x => x.id === 'rbell') || (s.school_users || [])[0] || { id: '', name: 'School user', role: '', school: '' };
}
const HONOR = { rbell: 'Ms. Bell' };
export const honorific = u => HONOR[u.id] || u.name;
export const signedInText = u => `${u.name}, ${u.role && u.role.includes(' · ') ? u.role.split(' · ').slice(1).join(' · ') : u.role}`;
export function gradeText(c) { return c.grade ? ord(c.grade) + ' grade' : c.age ? 'age ' + c.age : ''; }
export const referralWords = (s, r) => P.referralStatus(s, r);

// Keeps form inputs alive across repaints: values live in `store`, keyed by id (radios by name).
export function bindForm(root, store, onChange) {
  // the shell may put a visually hidden <h1 class="ui-sr"> before the screen: bind to the screen box, not to it
  const box = [...root.children].find(el => !el.classList.contains('ui-sr')) || root.firstElementChild; if (!box) return;
  const key = el => el.type === 'radio' ? el.name : (el.dataset.k || el.id || el.name);
  box.querySelectorAll('input,select,textarea').forEach(el => {
    const k = key(el); if (!k || el.type === 'file' || el.dataset.nobind != null) return;
    if (el.type === 'radio') { if (k in store) el.checked = store[k] === el.value; else if (el.checked) store[k] = el.value; }
    else if (el.type === 'checkbox') { if (k in store) el.checked = !!store[k]; else store[k] = el.checked; }
    else if (k in store) el.value = store[k]; else store[k] = el.value;
  });
  const h = e => {
    const el = e.target; const k = key(el); if (!k || el.type === 'file' || el.dataset.nobind != null) return;
    store[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'radio' && !el.checked) return;
    onChange && onChange(k, el, e);
  };
  box.addEventListener('input', h); box.addEventListener('change', h);
}

export async function schoolSignOut() {
  const ok = await ui.confirm({ title: 'Sign out of the school portal?', body: '<p>You will need your school link or sign-in to come back.</p>', confirmLabel: 'Sign out' });
  if (!ok) return;
  try { await session.signOut(); } catch { }
  go('Login');
}
export function scrollFocus(id, focusSel) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const f = focusSel && el.querySelector(focusSel); if (f) setTimeout(() => f.focus({ preventScroll: true }), 300);
}
// the greeting follows the demo clock, never the machine's
export function greetingWord(s) { const st = s || api.state; const h = +(M.now(st).slice(11, 13)) || 9; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

// ---------- the school page frame and its CSS (desktop, 1024 and up; reflows to one column below) ----------
export const SP_CSS = `
.sp{background:var(--paper-50);color:var(--ink-900);font:400 16px/24px var(--font);min-height:100vh;display:flex;flex-direction:column}
.sp *,.sp *::before,.sp *::after{box-sizing:border-box}
.sp-hd{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 40px;background:var(--surface-0);border-bottom:1px solid var(--line-200)}
.sp-brand{font-weight:700;font-size:18px}.sp-where{color:var(--muted-700);font-size:15px}
.sp-who{margin-left:auto;display:flex;align-items:center;gap:12px;font-size:15px;color:var(--muted-700)}
.sp-main{width:100%;max-width:1120px;margin:0 auto;padding:24px 40px 40px;display:flex;flex-direction:column;gap:24px;flex:1}
.sp-h1{margin:0;font-size:28px;line-height:34px;font-weight:600;letter-spacing:-.01em}
.sp-h2{margin:0;font-size:18px;line-height:26px;font-weight:600}
.sp-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.sp-row--end{justify-content:flex-end}
.sp-card{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);padding:20px 24px;display:flex;flex-direction:column;gap:12px}
.sp-card--needs{border:2px solid var(--marigold-400);background:#FFFDF7}
.sp-card--ok{border-color:var(--teal-600)}
.sp-muted{color:var(--muted-700)}.sp-small{font-size:14px;line-height:20px;color:var(--muted-700)}
.sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border-radius:var(--r-2);border:1px solid transparent;font:600 16px var(--font);text-decoration:none;cursor:pointer;white-space:nowrap}
.sp-btn--p{background:var(--teal-600);color:#fff}.sp-btn--p:hover{background:var(--teal-700);color:#fff}
.sp-btn--o{background:#fff;color:var(--ink-900);border-color:var(--control-500)}.sp-btn--o:hover{background:var(--sand-50)}
.sp-btn--sm{min-height:44px;padding:0 14px;font-size:15px}
.sp-link{background:none;border:0;padding:0 6px;min-width:44px;min-height:44px;font:600 15px var(--font);color:var(--teal-700);text-decoration:underline;cursor:pointer}
.sp-chip{display:inline-flex;align-items:center;gap:6px;border-radius:var(--r-pill);padding:3px 12px;font-size:14px;line-height:20px;font-weight:600;white-space:nowrap}
.sp-chip--ok{background:var(--success-bg);color:var(--success-fg)}.sp-chip--todo{background:var(--warning-bg);color:var(--warning-fg)}.sp-chip--neutral{background:var(--neutral-bg);color:var(--neutral-fg)}.sp-chip--info{background:var(--info-bg);color:var(--info-fg)}
.sp-table{width:100%;border-collapse:collapse;font-size:16px}
.sp-table th{text-align:left;font-size:14px;font-weight:600;color:var(--muted-700);padding:8px 12px;background:var(--sand-100);border-bottom:1px solid var(--line-200)}
.sp-table td{padding:10px 12px;border-bottom:1px solid var(--line-200);vertical-align:middle}
.sp-table tr:last-child td{border-bottom:0}
.sp-table a.sp-name{font-weight:700;color:var(--teal-700);display:inline-flex;align-items:center;min-height:44px;min-width:44px}
.sp-field{display:flex;flex-direction:column;gap:6px}.sp-lab{font-size:15px;font-weight:600}
.sp-in{width:100%;min-height:44px;border:1px solid var(--control-500);border-radius:var(--r-2);padding:10px 12px;font:inherit;font-size:16px;background:#fff;color:var(--ink-900)}
textarea.sp-in{min-height:96px;resize:vertical}
.sp-in[aria-invalid=true]{border-color:var(--danger-fg);background:var(--danger-bg)}
.sp-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.sp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.sp-g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.sp-ck{display:flex;align-items:center;gap:10px;min-height:44px;font-size:16px;cursor:pointer}.sp-ck input{width:22px;height:22px;margin:0;accent-color:var(--teal-600);flex:none}
.sp-rad{display:flex;gap:8px 20px;flex-wrap:wrap}.sp-rad label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer}.sp-rad input{width:22px;height:22px;margin:0;accent-color:var(--teal-600)}
.sp-err{color:var(--danger-fg);background:var(--danger-bg);border-radius:var(--r-2);padding:10px 14px;font-weight:600}
.sp-note{background:var(--sand-100);border-radius:var(--r-2);padding:10px 14px;font-size:15px;color:var(--neutral-fg)}
.sp-sec{border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--surface-0)}
.sp-sec>summary{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 20px;cursor:pointer;font-size:18px;font-weight:600;list-style:none}
.sp-sec>summary::-webkit-details-marker{display:none}
.sp-sec>summary::before{content:'';width:8px;height:8px;border-right:2px solid var(--muted-700);border-bottom:2px solid var(--muted-700);transform:rotate(-45deg);transition:transform var(--dur)}
.sp-sec[open]>summary::before{transform:rotate(45deg)}
.sp-sec__b{padding:4px 20px 20px;display:flex;flex-direction:column;gap:16px}
.sp-ft{padding:16px 40px;border-top:1px solid var(--line-200);font-size:14px;color:var(--muted-700);display:flex;gap:16px;flex-wrap:wrap}
.sp-drop{border:1.5px dashed var(--control-500);border-radius:var(--r-3);padding:16px;text-align:center;color:var(--muted-700)}
.sp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.sp-list li{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line-200)}.sp-list li:first-child{border-top:0}
@media (max-width:900px){.sp-hd,.sp-ft{padding-left:16px;padding-right:16px}.sp-main{padding:16px}.sp-g2,.sp-g3,.sp-g4{grid-template-columns:1fr}.sp-table th:nth-child(2),.sp-table td:nth-child(2){display:none}}
`;
export function spFrame({ user, s, title, body, schoolId }) {
  const where = schoolLong(s, schoolId || user.school);
  return raw(`<div class="sp">
    <header class="sp-hd"><div class="sp-brand">Harvest Outreach Center</div><div class="sp-where">School portal · ${esc(where)}</div>
      <div class="sp-who"><span>Signed in: ${esc(signedInText(user))}</span><button type="button" class="sp-link" data-signout-school>Sign out</button></div></header>
    <main class="sp-main">${body}</main>
    <footer class="sp-ft"><span>Demo data · nothing is real</span><span>Schools see status only: no clinical records, no other school's students.</span></footer>
  </div>`);
}
export const schoolChip = (kind, text) => `<span class="sp-chip sp-chip--${kind}">${esc(text)}</span>`;

// ---------- the screen ----------
const OPEN = ['draft', 'needs_screening', 'waiting_on_school', 'screening_booked', 'in_intake'];
const PRE = ['referral', 'intake', 'screening', 'discharged'];
const LABEL = P.ATTACHMENTS;
export class SchoolScreen extends Screen {
  get css() { return SP_CSS; }
  user() { return schoolUser(); }
  after(root) {
    root.querySelectorAll('[data-signout-school]').forEach(b => { b.onclick = () => schoolSignOut(); });
    if (this.afterPaint) this.afterPaint(root);
  }
}
register('SchoolPortal', class extends SchoolScreen {
  init() { this.form = {}; this.state = { err: '' }; this.pendingAtt = null; }
  students() { const u = this.user(); return (this.s.clients || []).filter(c => c.school === u.school && !PRE.includes(c.stage)); }
  renderVals() {
    const s = this.s; const u = this.user();
    const refs = (s.referrals || []).filter(r => r.school === u.school).sort((a, b) => ((a.received || a.saved_at || '') < (b.received || b.saved_at || '') ? 1 : -1));
    const needs = P.schoolNeeds(s, u.school);
    const label = r => (M.byId(s.clients, r.client) || {}).initials || String(r.client).split(',')[0];
    const st = this.students(); const ids = new Set(st.map(c => c.id));
    const sharedToday = (s.shares || []).filter(x => (x.at || '').slice(0, 10) === s.today && ids.has(x.client)).slice().reverse();
    const usedText = x => x.used && x.used.daily ? ' · added to the daily note' : x.used && x.used.collateral ? ' · filed as a collateral contact' : ' · waiting for staff';
    const need = needs.length
      ? `<section class="sp-card sp-card--needs" aria-labelledby="sp-needs" data-harvest-needs="${needs.length}"><h2 class="sp-h2" id="sp-needs">Harvest needs</h2>
          <ul class="sp-list">${needs.map(n => `<li><b style="min-width:70px">${esc(label(n))}</b><span style="flex:1;min-width:200px">${n.kind === 'attachments' ? 'Missing: ' + esc(n.text) : esc(n.text)}</span>${n.kind === 'attachments' ? n.missing.map(m => `<button type="button" class="sp-btn sp-btn--o sp-btn--sm" data-attach="${esc(n.id + '|' + m.key)}">Add ${esc(m.label.toLowerCase())}</button>`).join('') : `<a class="sp-btn sp-btn--o sp-btn--sm" href="#/ReferralSent?id=${esc(n.id)}">Open</a>`}</li>`).join('')}</ul>
          <input type="file" id="sp-attfile" data-nobind style="display:none" aria-label="Choose a file to attach" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"></section>`
      : `<section class="sp-card sp-card--ok" aria-labelledby="sp-needs" data-harvest-needs="0"><h2 class="sp-h2" id="sp-needs">Harvest needs</h2><p style="margin:0" class="sp-muted">Nothing from you right now.</p></section>`;
    const table = refs.length
      ? `<table class="sp-table"><caption class="ui-sr">Referrals from ${esc(schoolShort(s, u.school))}</caption><thead><tr><th scope="col">Student</th><th scope="col">Referred</th><th scope="col">Where it stands</th><th scope="col"><span class="ui-sr">Open</span></th></tr></thead><tbody>
          ${refs.map(r => `<tr><td><a class="sp-name" href="#/${r.stage === 'draft' ? 'ReferralForm' : 'ReferralSent'}?id=${esc(r.id)}">${esc(label(r))}</a></td><td>${esc(M.fmtDate(r.received || r.saved_at))}</td><td>${esc(referralWords(s, r))}${r.stage === 'waiting_on_school' ? ' ' + schoolChip('todo', 'attachment needed') : r.stage === 'draft' ? ' ' + schoolChip('neutral', 'not sent') : ''}</td><td style="text-align:right"><a class="sp-btn sp-btn--o sp-btn--sm" href="#/${r.stage === 'draft' ? 'ReferralForm' : 'ReferralSent'}?id=${esc(r.id)}" aria-label="${r.stage === 'draft' ? 'Finish' : 'View'} referral ${esc(label(r))}">${r.stage === 'draft' ? 'Finish' : 'View'}</a></td></tr>`).join('')}</tbody></table>`
      : `<p class="sp-muted" style="margin:0">No referrals from your school yet.</p>`;
    const share = st.length
      ? `<div class="sp-g2"><div class="sp-field"><label class="sp-lab" for="st">Student in TDT</label><select class="sp-in" id="st">${st.map(c => `<option value="${esc(c.id)}">${esc([c.initials, gradeText(c)].filter(Boolean).join(' · '))}</option>`).join('')}</select></div>
          <div class="sp-field"><label class="sp-lab" for="wh">Where and when</label><input class="sp-in" id="wh" placeholder="Cafeteria, 11:50 am"></div></div>
         <div class="sp-field"><label class="sp-lab" for="what">What you saw or heard</label><textarea class="sp-in" id="what" placeholder="A sentence or two. Facts only. No diagnoses."></textarea></div>
         ${this.state.err ? `<div class="sp-err" role="alert">${esc(this.state.err)}</div>` : ''}<div class="sp-row sp-row--end"><a class="sp-btn sp-btn--p" role="button" href="#sendShare">Send to Harvest</a></div>`
      : `<p class="sp-muted" style="margin:0">No students from your school are in TDT yet.</p>`;
    const sent = sharedToday.length ? `<div><div class="sp-small" style="margin-bottom:4px">Sent to Harvest today</div><ul class="sp-list">${sharedToday.map(x => `<li><b style="min-width:70px">${esc(M.client(s, x.client).initials)}</b><span style="flex:1">${esc([x.where, x.text].filter(Boolean).join(' · '))}<br><span class="sp-small">${esc(M.fmtTime(x.at))} · ${esc((M.byId(s.school_users, x.by) || { name: x.by }).name)}${esc(usedText(x))}</span></span></li>`).join('')}</ul></div>` : '';
    const body = `<div class="sp-row"><h1 class="sp-h1" style="flex:1">${esc(greetingWord(s) + ', ' + honorific(u))}</h1><a class="sp-btn sp-btn--p" href="#/ReferralForm">Refer a student</a></div>
      ${need}
      <section class="sp-card" id="referrals" aria-labelledby="sp-refs"><h2 class="sp-h2" id="sp-refs">Referrals from ${esc(schoolShort(s, u.school))}</h2>${table}<p class="sp-small" style="margin:0">Harvest shares where a referral stands. Treatment plans, notes and diagnoses stay with Harvest and the family.</p></section>
      <section class="sp-card" id="share" aria-labelledby="sp-share"><h2 class="sp-h2" id="sp-share">Share an update</h2>${share}${sent}</section>`;
    return { page: spFrame({ user: u, s, body }) };
  }
  afterPaint(root) {
    bindForm(root, this.form);
    const inp = root.querySelector('#sp-attfile');
    root.querySelectorAll('[data-attach]').forEach(b => { b.onclick = () => { this.pendingAtt = b.dataset.attach.split('|'); if (inp) inp.click(); }; });
    if (inp) inp.onchange = async () => {
      const f = inp.files[0]; const p = this.pendingAtt; if (!f || !p) return;
      try { await this.do('referral.attach', { id: p[0], key: p[1], name: f.name }); } catch { return; }
      toast(`${LABEL[p[1]] || 'Attachment'} recorded on ${p[0]} · ${f.name}`);
    };
  }
  get anchors() {
    return {
      sendShare: async () => {
        const f = this.form; const client = f.st || (this.students()[0] || {}).id; const text = (f.what || '').trim();
        if (!client) return this.setState({ err: 'Pick a student first.' });
        if (!text) { this.setState({ err: 'Write what you saw or heard first.' }); return scrollFocus('share', '#what'); }
        try { await this.do('school.share', { client, text, where: (f.wh || '').trim() }); } catch { return; }
        Object.assign(this.form, { what: '', wh: '' }); this.state.err = '';
        toast(`Sent to Harvest · ${M.client(this.s, client).initials}'s staff can use it in a note, credited to you`);
        this.setState({});
      }
    };
  }
});
