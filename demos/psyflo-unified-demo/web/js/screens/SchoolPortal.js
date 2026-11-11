// 3 · School portal (counselor home). Live: referral only. The counselor refers a student (4 → 5) and sees where
// each of the school's referrals stands. Per the Nov 7 product call, schools refer and their job is done: no teacher
// portal, no teacher check-ins, and no view of the treatment plan. The counselor can share a short update about a
// student in TDT (school.share); in the extension staff add it to that day's daily note credited to the counselor,
// or fill it into a collateral contact in Lauris (school.shareUsed).
// Also exports the small helpers the other school screens (ReferralForm, ReferralSent) and FamilyLink share.
import { register, Screen, M, session, modal, go, toast, api } from '../app.js';

// ---------- shared school helpers ----------
export const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const LEVEL_WORD = { ES: 'Elementary School', MS: 'Middle School', HS: 'High School' };
export function schoolLong(s, id) {
  const sc = M.school(s, id); const m = String(id).match(/(ES|MS|HS)(\d+)/);
  return m ? `${sc.locality} · ${LEVEL_WORD[m[1]]} ${m[2]}` : sc.name;
}
export function schoolShort(s, id) { return (M.school(s, id).name || id).split(' · ').pop(); }
export function schoolUser() {
  const s = api.state; const u = session.schoolUser;
  return u || s.school_users.find(x => x.id === 'rbell') || s.school_users[0];
}
const HONOR = { rbell: 'Ms. Bell' };
export const honorific = u => HONOR[u.id] || u.name;
export const signedInText = u => `${u.name}, ${u.role.includes(' · ') ? u.role.split(' · ').slice(1).join(' · ') : u.role}`;
const PRE_SERVICE = ['referral', 'intake', 'screening'];
export function gradeText(c) { return c.grade ? ord(c.grade) + ' grade' : c.age ? 'age ' + c.age : ''; }
export function referralWords(s, r) {
  if (!r) return '';
  const fl = r.family_link || {};
  switch (r.stage) {
    case 'draft': return 'draft · not sent yet';
    case 'needs_screening': return fl.submitted ? 'the family answered · screening call next' : fl.sent ? 'Harvest texted the family' : 'Harvest is contacting the family';
    case 'waiting_on_school': return 'Harvest needs an attachment from you';
    case 'screening_booked': return 'screening call booked' + (r.screening?.when ? ' ' + M.fmtDate(r.screening.when) : '');
    case 'in_intake': return 'intake under way';
    case 'in_service': return 'started TDT';
    case 'grant_program': return 'routed to the grant program';
    default: return (M.REF_STAGE[r.stage] || r.stage || '').toLowerCase();
  }
}

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

export function schoolSignOut() {
  const s = api.state; const cur = schoolUser();
  modal(`<h2>Sign out of the school portal</h2><p>Schools sign in with their own school account; no Harvest login. Signed out of ${cur.name}'s account. Sign in as:</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">${s.school_users.filter(u => !/teacher/i.test(u.role || '')).map(u => `<button class="mbtn${u.id === cur.id ? ' p' : ''}" data-u="${u.id}">${u.name} · ${u.role} · ${M.school(s, u.school).name}</button>`).join('')}</div>
    <button class="mbtn" data-close>Cancel</button>`,
  (box, close) => box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
    session.setSchoolUser(b.dataset.u); close();
    const u = s.school_users.find(x => x.id === b.dataset.u);
    toast('Signed in to the school portal as ' + u.name);
    go('SchoolPortal');
  }));
}
export function scrollFocus(id, focusSel) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const f = focusSel && el.querySelector(focusSel); if (f) setTimeout(() => f.focus({ preventScroll: true }), 300);
}
export function greetingWord() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

// ---------- the screen ----------
const OPEN = ['draft', 'needs_screening', 'waiting_on_school', 'screening_booked', 'in_intake'];
const PRE = ['referral', 'intake', 'screening', 'discharged'];
register('SchoolPortal', class extends Screen {
  init() { this.form = {}; }
  user() { return schoolUser(); }
  students() { const u = this.user(); return this.s.clients.filter(c => c.school === u.school && !PRE.includes(c.stage)); }
  renderVals() {
    const s = this.s; const u = this.user();
    const refs = s.referrals.filter(r => r.school === u.school).sort((a, b) => ((a.received || a.saved_at || '') < (b.received || b.saved_at || '') ? 1 : -1));
    const sent = refs.filter(r => r.stage !== 'draft');
    const waiting = refs.filter(r => r.stage === 'waiting_on_school' || r.stage === 'draft').length;
    const open = refs.filter(r => OPEN.includes(r.stage)).length;
    const st = this.students(); const ids = new Set(st.map(c => c.id));
    const sharedToday = (s.shares || []).filter(x => (x.at || '').slice(0, 10) === s.today && ids.has(x.client)).slice().reverse();
    const usedText = x => x.used?.daily ? ' · added to the daily note' : x.used?.collateral ? ' · filed as a collateral contact' : ' · waiting for staff';
    return {
      schoolLong: schoolLong(s, u.school), schoolShort: schoolShort(s, u.school), signedIn: signedInText(u),
      greeting: `${greetingWord()}, ${honorific(u)}`,
      refChip: `${sent.length} referred this year`,
      openChip: waiting ? `${waiting} need${waiting === 1 ? 's' : ''} something from you` : `${open} in progress`, openCls: waiting ? 'y' : 'n',
      students: st.map(c => ({ id: c.id, label: [c.initials, gradeText(c)].filter(Boolean).join(' · ') })),
      shareChip: sharedToday.length ? `${sharedToday.length} sent today` : 'Nothing sent today',
      shared: sharedToday.map(x => ({ ini: M.client(s, x.client).initials, text: [x.where, x.text].filter(Boolean).join(' · '), meta: `${M.fmtTime(x.at)} · ${(s.school_users.find(z => z.id === x.by) || { name: x.by }).name}${usedText(x)}` })),
      rows: refs.map(r => ({
        ini: M.byId(s.clients, r.client)?.initials || String(r.client).split(',')[0], when: M.fmtDate(r.received || r.saved_at),
        status: referralWords(s, r), flag: r.stage === 'waiting_on_school' ? 'attachment needed' : r.stage === 'draft' ? 'not sent' : '',
        href: r.stage === 'draft' ? 'ReferralForm.dc.html?id=' + r.id : 'ReferralSent.dc.html?id=' + r.id,
        btn: r.stage === 'draft' ? 'Finish' : r.stage === 'waiting_on_school' ? 'Attach' : 'View'
      }))
    };
  }
  after(root) { bindForm(root, this.form); }
  get anchors() {
    return {
      out: () => schoolSignOut(),
      share: () => scrollFocus('share', '#what'),
      sendShare: async () => {
        const f = this.form; const u = this.user();
        const client = f.st || this.students()[0]?.id; const text = (f.what || '').trim();
        if (!client) return toast('Pick a student first', 'err');
        if (!text) { toast('Write what happened first', 'err'); return scrollFocus('share', '#what'); }
        await this.do('school.share', { client, by: u.id, text, where: (f.wh || '').trim() });
        Object.assign(this.form, { what: '', wh: '' });
        toast(`Sent to Harvest · ${M.client(this.s, client).initials}'s staff see it when they write today's note`);
        this.setState({});
      },
      referrals: () => scrollFocus('referrals')
    };
  }
  set anchors(v) { }
});
