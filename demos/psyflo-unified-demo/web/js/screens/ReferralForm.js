// 4 · Referral form (school, desktop). Four sections, required first: Required · Student and family · Concerns and supports · Attachments and contact.
// Nothing is pre-checked: guardian agreement, concerns, attachments and referral type are the counselor's own answers, and the interventions box starts empty.
// Submit → referral.create (guardian agreement attested first) → ReferralSent?id=…; "Save and finish later" keeps a draft (referral.create draft:true, then referral.update).
// The attachment buttons record the file NAME on the referral (this demo does not upload the file) and say so.
import { register, M, toast, go, esc, ui } from '../app.js';
import { SchoolScreen, spFrame, schoolUser, bindForm, scrollFocus, schoolLong } from './SchoolPortal.js';

const CONCERNS = { c1: 'Physical aggression', c2: 'Skips class / truancy', c3: 'Depression', c4: 'Verbal aggression', c5: 'Outbursts / tantrums', c6: 'Substance use', c7: 'Suicidal / homicidal ideation', c8: 'Defiant / argumentative', c9: 'Past or recent trauma', c10: 'Threatening / bullying', c11: 'Eloping', c12: 'Grief and loss', c13: 'Inattention', c14: 'Withdrawal / avoidance', c15: 'Anxiety and/or panic attacks', c16: 'Hyperactivity and impulsivity', c17: 'Intrusive thoughts', c18: 'Self-harm' };
const FOR = { r1: 'TDT services', r2: 'Outpatient counseling', r3: 'SEBS program', r4: 'Grant-funded support (no Medicaid needed)' };
const ATT = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades' };
const ATT_GUESS = [[/behav|incident|discipl/i, 'behaviour_report'], [/attend|absen/i, 'attendance_log'], [/sched|grade|report.?card|transcript/i, 'schedule_and_grades']];
const draftKey = u => 'psyflo_ref_draft_' + u.id;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } };

register('ReferralForm', class extends SchoolScreen {
  init() {
    const u = schoolUser();
    this.form = {}; this.state = { err: '', errIds: [], savedNote: '', files: {}, draftId: null, open: { req: true } };
    let id = this.params.id; if (!id) id = lsGet(draftKey(u));
    const d = id && (this.s.referrals || []).find(r => r.id === id && r.stage === 'draft' && r.school === u.school);
    if (d) { this.state.draftId = d.id; Object.assign(this.form, (d.form && d.form.raw) || {}); this.state.files = this.filesFrom(d.form); }
    else this.fresh(u);
  }
  // a fresh referral: the counselor's own details go in "Referred by"; the date is the demo clock's
  fresh(u) { Object.assign(this.form, { rn: u.name, ra: /counselor/i.test(u.role) ? 'School counselor' : u.role, rc: '', rd: this.s.today }); }
  filesFrom(form) { const att = (form && form.attachments) || {}; const o = {}; for (const k of Object.keys(ATT)) if (typeof att[k] === 'string') o[k] = att[k]; return o; }
  ageFrom(dob) { return Math.max(0, M.daysBetween(dob, this.s.today) / 365.25 | 0); }
  renderVals() {
    const s = this.s; const u = schoolUser(); const f = this.form; const files = this.state.files; const bad = id => this.state.errIds.includes(id) ? ' aria-invalid="true"' : '';
    const d = this.state.draftId && (s.referrals || []).find(r => r.id === this.state.draftId);
    const reqDone = [f.consent, (f.fn || '').trim() && (f.ln || '').trim(), (f.gn || '').trim() || (f.gp || '').trim()].filter(Boolean).length;
    const sec = (key, title, count, inner) => `<details class="sp-sec" id="sec-${key}" data-sec="${key}"${this.state.open[key] ? ' open' : ''}><summary>${title}${count ? ` <span class="sp-chip sp-chip--neutral" style="margin-left:auto">${count}</span>` : ''}</summary><div class="sp-sec__b">${inner}</div></details>`;
    const ck = (id, label) => `<label class="sp-ck"><input type="checkbox" id="${id}">${esc(label)}</label>`;
    const txt = (id, label, type = 'text', extra = '') => `<div class="sp-field"><label class="sp-lab" for="${id}">${label}</label><input class="sp-in" id="${id}" type="${type}"${bad(id)}${extra}></div>`;
    const rad = (name, label, opts) => `<fieldset class="sp-field" style="border:0;margin:0;padding:0"><legend class="sp-lab">${label}</legend><div class="sp-rad">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}">${l}</label>`).join('')}</div></fieldset>`;
    const nConcerns = Object.keys(CONCERNS).filter(k => f[k]).length;
    const body = `<form id="refform" novalidate style="display:flex;flex-direction:column;gap:16px">
      <div><h1 class="sp-h1">Referral form</h1>${d ? `<p class="sp-note" style="margin:12px 0 0">Continuing your draft ${esc(d.id)}, saved ${esc(M.fmtDateTime(d.saved_at || d.received))} · <button type="button" class="sp-link" data-fresh>Start a new referral instead</button></p>` : ''}</div>
      ${sec('req', 'Required', `${reqDone} of 3`, `
        <label class="sp-ck" style="align-items:flex-start;border:1.5px solid var(--teal-600);border-radius:var(--r-2);background:var(--teal-tint);padding:10px 14px"><input type="checkbox" id="consent"${bad('consent')}><span><b>I have spoken with the parent or guardian and they agree to this referral.</b></span></label>
        <div class="sp-g2">${txt('fn', 'Student first name')}${txt('ln', 'Student last name')}</div>
        <div class="sp-g2">${txt('gn', 'Guardian name')}${txt('gp', 'Guardian phone', 'tel')}</div>
        <p class="sp-small" style="margin:0">Harvest needs the guardian's name or phone to reach the family. School: ${esc(schoolLong(s, u.school))}.</p>`)}
      ${sec('stu', 'Student and family', '', `
        <div class="sp-g4">${txt('mn', 'Middle name')}${txt('dob', 'Date of birth', 'date')}${txt('age', 'Age', 'number')}${txt('gr', 'Grade')}</div>
        ${txt('ad', 'Guardian address')}
        <div class="sp-g3">${rad('med', 'Does this student have Medicaid?', [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']])}${rad('iep', 'IEP or 504 plan?', [['yes', 'Yes'], ['no', 'No']])}${rad('inf', 'Has the guardian been told a referral is being made?', [['yes', 'Yes'], ['no', 'No']])}</div>`)}
      ${sec('con', 'Concerns and supports', nConcerns ? `${nConcerns} chosen` : '', `
        <fieldset style="border:0;margin:0;padding:0"><legend class="sp-lab" style="margin-bottom:6px">Concerns in the last 30 days</legend><div class="sp-g3">${Object.entries(CONCERNS).map(([k, v]) => ck(k, v)).join('')}</div></fieldset>
        <div class="sp-field"><label class="sp-lab" for="oth">Other behavioural or mental-health concerns not listed</label><textarea class="sp-in" id="oth"></textarea></div>
        <div class="sp-field"><label class="sp-lab" for="int">Interventions already tried</label><textarea class="sp-in" id="int" placeholder="School interventions, guidance support, community supports, risk assessments, referral for a higher level of care"></textarea></div>
        <fieldset style="border:0;margin:0;padding:0"><legend class="sp-lab" style="margin-bottom:6px">Referral for</legend><div class="sp-g2">${Object.entries(FOR).map(([k, v]) => ck(k, v)).join('')}</div></fieldset>`)}
      ${sec('att', 'Attachments and contact', `${Object.keys(files).length} of 3 added`, `
        <ul class="sp-list">${Object.entries(ATT).map(([k, l]) => `<li><b style="min-width:180px">${esc(l)}</b><span style="flex:1" class="${files[k] ? '' : 'sp-muted'}">${files[k] ? 'Added: ' + esc(files[k]) : 'Not added yet'}</span><button type="button" class="sp-btn sp-btn--o sp-btn--sm" data-slot="${k}">${files[k] ? 'Replace' : 'Add file'}</button></li>`).join('')}</ul>
        <input type="file" id="files" data-nobind style="display:none" aria-label="Choose a file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt">
        <p class="sp-small" style="margin:0">Demo: the file name is recorded with the referral; the file itself is not uploaded. Harvest asks for anything still missing here.</p>
        <div class="sp-g2">${txt('rn', 'Your name')}${txt('ra', 'Role / agency')}${txt('rc', 'Contact (email or phone)')}${txt('rd', 'Date of referral', 'date')}</div>`)}
      <div class="sp-row">${this.state.err ? `<div class="sp-err" role="alert" id="sp-err">${esc(this.state.err)}</div>` : ''}${this.state.savedNote ? `<div class="sp-small" role="status">${esc(this.state.savedNote)}</div>` : ''}</div>
      <div class="sp-row"><a class="sp-btn sp-btn--p" role="button" href="#submit">Submit referral</a><button class="sp-btn sp-btn--o" type="button" data-save-later>Save and finish later</button><a class="sp-btn sp-btn--o" href="#/SchoolPortal">Back to referrals</a></div></form>`;
    return { page: spFrame({ user: u, s, body }) };
  }
  afterPaint(root) {
    bindForm(root, this.form, (k, el) => { if (k === 'dob' && el.value && !this.form.age) { this.form.age = String(this.ageFrom(el.value)); this.setState({}); } });
    root.querySelectorAll('[data-sec]').forEach(d => { d.addEventListener('toggle', () => { this.state.open[d.dataset.sec] = d.open; }); });
    root.querySelectorAll('[data-fresh]').forEach(b => { b.onclick = () => this.anchors.fresh(); });
    root.querySelectorAll('[data-save-later]').forEach(b => { b.onclick = () => this.saveLater(); });
    const inp = root.querySelector('#files');
    root.querySelectorAll('[data-slot]').forEach(b => { b.onclick = () => { this.slot = b.dataset.slot; if (inp) inp.click(); }; });
    if (inp) inp.onchange = () => { const fl = inp.files[0]; if (!fl) return; const key = this.slot || (ATT_GUESS.find(([re]) => re.test(fl.name)) || [])[1]; if (!key) return; this.setState({ files: { ...this.state.files, [key]: fl.name } }); toast(`${ATT[key]} added to the referral · ${fl.name}`); };
  }
  answers() {
    const f = this.form; const u = schoolUser(); const files = this.state.files;
    const first = (f.fn || '').trim(), last = (f.ln || '').trim();
    const age = +(f.age || (f.dob ? this.ageFrom(f.dob) : 0)) || null;
    const ini = first && last ? `${first[0].toUpperCase()}.${last[0].toUpperCase()}.` : '';
    const att = {}; for (const k of Object.keys(ATT)) att[k] = files[k] || false;
    return {
      client: ini ? ini + (age ? ', ' + age : '') : '', school: u.school,
      consent_attested: !!f.consent, first_name: first, middle_name: (f.mn || '').trim(), last_name: last, dob: f.dob || '', age, grade: (f.gr || '').trim(),
      guardian: { name: (f.gn || '').trim(), phone: (f.gp || '').trim(), address: (f.ad || '').trim() },
      medicaid_per_school: f.med || '', iep: f.iep === 'yes', guardian_informed: f.inf === 'yes',
      attachments: att, files: Object.values(files),
      concerns: Object.entries(CONCERNS).filter(([k]) => f[k]).map(([, v]) => v),
      other_concerns: (f.oth || '').trim(), interventions_tried: (f.int || '').trim(),
      referral_for: Object.entries(FOR).filter(([k]) => f[k]).map(([, v]) => v),
      referred_by: { name: (f.rn || '').trim(), role: (f.ra || '').trim(), contact: (f.rc || '').trim(), date: f.rd || this.s.today, user: u.id },
      counselor: (f.rn || u.name).trim(), raw: { ...f }
    };
  }
  fail(msg, ids, focus) {
    this.state.open.req = true; this.setState({ err: msg, errIds: ids, savedNote: '' });
    setTimeout(() => { const el = document.getElementById(focus); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); } }, 60);
  }
  async saveLater() {
    const u = schoolUser(); const form = this.answers();
    if (!form.client) form.client = 'Draft · ' + ((form.first_name || form.last_name) ? (form.first_name + ' ' + form.last_name).trim() : 'student not named yet');
    let id = this.state.draftId;
    try { if (id) await this.do('referral.update', { id, form }); else id = (await this.do('referral.create', { form, draft: true })).id; } catch { return; }
    lsSet(draftKey(u), id);
    this.setState({ draftId: id, err: '', errIds: [], savedNote: `Draft ${id} saved ${M.fmtTime(M.now(this.s))} · open Refer a student to finish it` });
    toast(`Draft ${id} saved · nothing goes to Harvest until you submit`);
  }
  async submit() {
    const u = schoolUser(); const form = this.answers();
    if (!form.consent_attested) return this.fail('Tick the guardian agreement box first: Harvest takes a referral only after the guardian agrees.', ['consent'], 'consent');
    if (!form.first_name || !form.last_name) return this.fail("Add the student's first and last name.", [form.first_name ? 'ln' : 'fn'], form.first_name ? 'ln' : 'fn');
    if (!form.guardian.name && !form.guardian.phone) return this.fail("Add the guardian's name or phone so Harvest can reach the family.", ['gn', 'gp'], 'gn');
    let id = this.state.draftId;
    try { if (id) await this.do('referral.update', { id, form, submit: true }); else id = (await this.do('referral.create', { form })).id; } catch { return; }
    lsSet(draftKey(u), null);
    toast(`Referral ${id} sent to Harvest`);
    go('ReferralSent', { id });
  }
  get anchors() {
    return {
      submit: () => this.submit(),
      fresh: () => {
        const u = schoolUser(); lsSet(draftKey(u), null);
        this.form = {}; this.state = { err: '', errIds: [], savedNote: '', files: {}, draftId: null, open: { req: true } };
        this.fresh(u); this.setState({}); scrollFocus('refform', '#fn');
      }
    };
  }
});
