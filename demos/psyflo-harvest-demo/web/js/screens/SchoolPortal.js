// 3 · School portal (counselor home). Live: referral only. The counselor refers a student (4 → 5) and sees where
// each of the school's referrals stands (one row each: status chip, student, one button). Per the Nov 7 product call, schools refer and their job is done: no teacher
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


// ---------- the shared school look (brand tokens only; the row grammar and chips come from css/ui.css) ----------
export const SCHOOL_CSS = `
.s-pg{min-height:100vh;background:var(--paper);color:var(--navy);font:400 14px/20px 'DM Sans',system-ui,sans-serif}
.s-pg *{box-sizing:border-box}
.s-hd{background:var(--navy);color:#fff;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 24px}
.s-hd b{font-size:16px;line-height:24px;font-weight:700}
.s-hd .m{color:var(--ink-4);font-size:13px}
.s-hd .r{margin-left:auto;color:var(--ink-4);font-size:13px}
.s-hd a{color:var(--teal-light);font-weight:600;text-decoration:none}
.s-main{max-width:880px;margin:0 auto;padding:8px 24px 56px}
.s-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:72px}
.s-card{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin-bottom:8px}
.s-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.s-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.s-g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.s-pg label{display:block;font-size:12px;line-height:16px;font-weight:600;margin:0 0 4px;color:var(--ink-2)}
.s-pg .u-in,.s-pg .u-sel{width:100%;font-size:14px}
.s-pg textarea.u-in{padding:8px 10px;min-height:72px;resize:vertical}
.s-ck{display:flex;align-items:center;gap:8px;min-height:32px;font-weight:500}
.s-ck input{width:18px;height:18px;margin:0;accent-color:var(--teal)}
.s-ck label{margin:0;font-weight:500;font-size:14px;line-height:20px;color:var(--navy);cursor:pointer}
.s-rad{display:flex;gap:16px;align-items:center;min-height:36px;flex-wrap:wrap}
.s-rad label{display:flex;align-items:center;gap:6px;margin:0;font-weight:500;font-size:14px;color:var(--navy);cursor:pointer}
.s-rad input{width:18px;height:18px;margin:0;accent-color:var(--teal)}
.s-err{color:var(--late-fg);font-weight:600}
@media (max-width:760px){.s-g2,.s-g3,.s-g4{grid-template-columns:1fr}}
`;
// a referral stage as a status chip (three words at most) and the row's one button
export function stageChip(s, r) {
  const fl = r.family_link || {};
  switch (r.stage) {
    case 'draft': return { text: 'Draft', cls: 'n', btn: 'Finish' };
    case 'needs_screening': return fl.submitted ? { text: 'Family answered', cls: 'ok', btn: 'View' } : fl.sent ? { text: 'Family texted', cls: 'n', btn: 'View' } : { text: 'Received', cls: 'n', btn: 'View' };
    case 'waiting_on_school': return { text: 'Needs a file', cls: 'y', btn: 'Attach' };
    case 'screening_booked': return { text: 'Call booked', cls: 'ok', btn: 'View' };
    case 'in_intake': return { text: 'In intake', cls: 'ok', btn: 'View' };
    case 'in_service': return { text: 'In TDT', cls: 'ok', btn: 'View' };
    case 'grant_program': return { text: 'Grant program', cls: 'n', btn: 'View' };
    case 'declined': return { text: 'Closed', cls: 'n', btn: 'View' };
    default: return { text: M.REF_STAGE[r.stage] || r.stage, cls: 'n', btn: 'View' };
  }
}

// Keeps form inputs alive across repaints: values live in `store`, keyed by id (radios by name).
export function bindForm(root, store, onChange) {
  const box = root.firstElementChild; if (!box) return;
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
const PRE = ['referral', 'intake', 'screening', 'discharged'];
register('SchoolPortal', class extends Screen {
  init() { this.form = {}; this.state = { sharing: false, all: false }; }
  user() { return schoolUser(); }
  students() { const u = this.user(); return this.s.clients.filter(c => c.school === u.school && !PRE.includes(c.stage)); }
  renderVals() {
    const s = this.s; const u = this.user();
    const refs = s.referrals.filter(r => r.school === u.school).sort((a, b) => ((a.received || a.saved_at || '') < (b.received || b.saved_at || '') ? 1 : -1));
    const st = this.students(); const ids = new Set(st.map(c => c.id));
    const sharedToday = (s.shares || []).filter(x => (x.at || '').slice(0, 10) === s.today && ids.has(x.client)).slice().reverse();
    const shown = this.state.all ? refs : refs.slice(0, 6);
    return {
      schoolShort: schoolLong(s, u.school).split(' · ').pop().replace('Middle School ', 'MS-').replace('Elementary School ', 'ES-').replace('High School ', 'HS-'),
      signedIn: u.name,
      sharing: this.state.sharing,
      students: st.map(c => ({ id: c.id, label: [c.initials, gradeText(c)].filter(Boolean).join(' · ') })),
      shared: sharedToday.map(x => ({ ini: M.client(s, x.client).initials, text: [x.where, x.text].filter(Boolean).join(' · '), chip: x.used?.daily ? 'In daily note' : x.used?.collateral ? 'Filed' : 'Sent', cls: x.used ? 'ok' : 'n' })),
      rows: shown.map(r => {
        const c = M.byId(s.clients, r.client); const ch = stageChip(s, r);
        return { who: c ? [c.initials, c.age].filter(Boolean).join(', ') : String(r.client), when: M.fmtDate(r.received || r.saved_at), chip: ch.text, cls: ch.cls, btn: ch.btn,
          href: r.stage === 'draft' ? 'ReferralForm.dc.html?id=' + r.id : 'ReferralSent.dc.html?id=' + r.id };
      }),
      more: refs.length > 6, moreLabel: this.state.all ? 'Show fewer' : `Show all ${refs.length}`
    };
  }
  get css() { return SCHOOL_CSS; }
  after(root) { bindForm(root, this.form); }
  get anchors() {
    return {
      out: () => schoolSignOut(),
      all: () => this.setState({ all: !this.state.all }),
      share: () => { this.setState({ sharing: true }); setTimeout(() => scrollFocus('share', '#what'), 30); },
      shareClose: () => this.setState({ sharing: false }),
      sendShare: async () => {
        const f = this.form; const u = this.user();
        const client = f.st || this.students()[0]?.id; const text = (f.what || '').trim();
        if (!client) return toast('Pick a student first', 'err');
        if (!text) { toast('Write what happened first', 'err'); return scrollFocus('share', '#what'); }
        await this.do('school.share', { client, by: u.id, text, where: (f.wh || '').trim() });
        Object.assign(this.form, { what: '', wh: '' });
        toast(`Sent to Harvest · ${M.client(this.s, client).initials}'s staff see it when they write today's note`);
        this.setState({ sharing: false });
      }
    };
  }
  set anchors(v) { }
});
