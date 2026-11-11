// 4 · Referral form (school). Live: Submit → referral.create (guardian consent attested first) → REF-122 …
// → ReferralSent?id=…; "Save and finish later" keeps a draft (referral.create draft:true, then referral.update).
import { register, Screen, M, toast, go, api } from '../app.js';
import { bindForm, schoolUser, scrollFocus } from './SchoolPortal.js';

const CONCERNS = { c1: 'Physical aggression', c2: 'Skips class / truancy', c3: 'Depression', c4: 'Verbal aggression', c5: 'Outbursts / tantrums', c6: 'Substance use', c7: 'Suicidal / homicidal ideation', c8: 'Defiant / argumentative', c9: 'Past or recent trauma', c10: 'Threatening / bullying', c11: 'Eloping', c12: 'Grief and loss', c13: 'Inattention', c14: 'Withdrawal / avoidance', c15: 'Anxiety and/or panic attacks', c16: 'Hyperactivity and impulsivity', c17: 'Intrusive thoughts', c18: 'Self-harm' };
const FOR = { r1: 'TDT', r2: 'Outpatient counseling', r3: 'SEBS', r4: 'Grant-funded support' };
const ATT = { a1: 'behaviour_report', a2: 'attendance_log', a3: 'schedule_and_grades' };
const ATT_GUESS = [[/behav|incident|discipl/i, 'a1'], [/attend|absen/i, 'a2'], [/sched|grade|report.?card|transcript/i, 'a3']];
const draftKey = u => 'psyflo_ref_draft_' + u.id;

register('ReferralForm', class extends Screen {
  init() {
    const u = schoolUser();
    this.form = {}; this.state = { err: '', savedNote: '', files: [], draftId: null };
    let id = this.params.id;
    if (!id) try { id = localStorage.getItem(draftKey(u)); } catch { }
    const d = id && this.s.referrals.find(r => r.id === id && r.stage === 'draft');
    if (d) { this.state.draftId = d.id; Object.assign(this.form, d.form?.raw || {}); this.state.files = d.form?.files || []; }
    else {
      // a fresh referral: the counselor's own details go in "Referred by"
      Object.assign(this.form, { rn: u.name, ra: /counselor/i.test(u.role) ? 'School counselor' : u.role, rc: u.id + '@lcps.example.org', rd: this.s.today, sch: u.school });
    }
  }
  renderVals() {
    const d = this.state.draftId && this.s.referrals.find(r => r.id === this.state.draftId);
    const f = this.form; const files = this.state.files;
    const checked = Object.keys(ATT).filter(k => f[k] ?? (k !== 'a3')).length;
    return {
      draftNote: d ? `Continuing your draft ${d.id}, saved ${M.fmtDateTime(d.saved_at || d.received)}` : '',
      attachedText: files.length ? `${files.length} file${files.length === 1 ? '' : 's'} attached: ${files.join(', ')}` : `${checked} attached`,
      err: this.state.err, savedNote: this.state.savedNote,
      saveLater: () => this.saveLater()
    };
  }
  after(root) {
    this.root = root;
    bindForm(root, this.form, (k, el) => { if (k === 'dob' && el.value && !this.form.age) { this.form.age = String(this.ageFrom(el.value)); this.setState({}); } else if (/^a\d$/.test(k)) this.setState({}); });
    const inp = root.querySelector('#files'); const drop = root.querySelector('#drop');
    if (inp) inp.onchange = () => this.addFiles([...inp.files]);
    if (drop) {
      drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = '#217A78'; };
      drop.ondragleave = () => { drop.style.borderColor = ''; };
      drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ''; this.addFiles([...(e.dataTransfer?.files || [])]); };
    }
  }
  addFiles(list) {
    if (!list.length) return;
    const names = list.map(f => f.name);
    for (const n of names) { const g = ATT_GUESS.find(([re]) => re.test(n)); if (g) this.form[g[1]] = true; }
    this.setState({ files: [...new Set(this.state.files.concat(names))] });
    toast(`${names.length} file${names.length === 1 ? '' : 's'} attached · stored with the referral in Psyflo`);
  }
  ageFrom(dob) { return Math.max(0, M.daysBetween(dob, this.s.today) / 365.25 | 0); }
  answers() {
    const f = this.form; const u = schoolUser();
    const first = (f.fn || '').trim(), last = (f.ln || '').trim();
    const age = +(f.age || (f.dob ? this.ageFrom(f.dob) : 0)) || null;
    const ini = first && last ? `${first[0].toUpperCase()}.${last[0].toUpperCase()}.` : '';
    const att = {}; for (const [k, v] of Object.entries(ATT)) att[v] = !!(f[k] ?? (k !== 'a3'));
    return {
      client: ini ? ini + (age ? ', ' + age : '') : '', school: f.sch || u.school,
      consent_attested: !!(f.consent ?? true), first_name: first, middle_name: (f.mn || '').trim(), last_name: last, dob: f.dob || '', age, grade: (f.gr || '').trim(),
      guardian: { name: (f.gn || '').trim(), phone: (f.gp || '').trim(), address: (f.ad || '').trim() },
      medicaid_per_school: f.med || 'yes', iep: (f.iep || 'yes') === 'yes', guardian_informed: (f.inf || 'yes') === 'yes',
      attachments: att, files: this.state.files,
      concerns: Object.entries(CONCERNS).filter(([k]) => f[k] ?? ['c1', 'c4', 'c8', 'c11', 'c13'].includes(k)).map(([, v]) => v),
      other_concerns: (f.oth || '').trim(), interventions_tried: (f.int || '').trim(),
      referral_for: Object.entries(FOR).filter(([k]) => f[k] ?? k === 'r1').map(([, v]) => v),
      referred_by: { name: (f.rn || '').trim(), role: (f.ra || '').trim(), contact: (f.rc || '').trim(), date: f.rd || this.s.today, user: u.id },
      counselor: (f.rn || u.name).trim(), raw: { ...f }
    };
  }
  fail(msg, focus) { this.setState({ err: msg, savedNote: '' }); if (focus) setTimeout(() => { const el = document.getElementById(focus); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); } }, 50); }
  async saveLater() {
    const u = schoolUser(); const form = this.answers();
    if (!form.client) form.client = 'Draft · ' + ((form.first_name || form.last_name) ? (form.first_name + ' ' + form.last_name).trim() : 'student not named yet');
    let id = this.state.draftId;
    if (id) await this.do('referral.update', { id, form });
    else { id = (await this.do('referral.create', { form, by: u.id, draft: true })).id; }
    try { localStorage.setItem(draftKey(u), id); } catch { }
    this.setState({ draftId: id, err: '', savedNote: `Draft ${id} saved ${M.fmtTime(M.now(this.s))} · open Refer a student to finish it` });
    toast(`Draft ${id} saved · nothing goes to Harvest until you submit`);
  }
  async submit() {
    const u = schoolUser(); const form = this.answers();
    if (!form.consent_attested) return this.fail('Tick the guardian consent box first: Harvest takes a referral only after the guardian agrees.', 'consent');
    if (!form.first_name || !form.last_name) return this.fail('Add the student\'s first and last name.', form.first_name ? 'ln' : 'fn');
    if (!form.guardian.name && !form.guardian.phone) return this.fail('Add the guardian\'s name or phone so Harvest can reach the family.', 'gn');
    let id = this.state.draftId;
    if (id) await this.do('referral.update', { id, form, submit: true });
    else id = (await this.do('referral.create', { form, by: u.id })).id;
    try { localStorage.removeItem(draftKey(u)); } catch { }
    toast(`Referral ${id} sent to Harvest`);
    go('ReferralSent', { id });
  }
  get anchors() {
    return {
      submit: () => this.submit(),
      up: () => this.root?.querySelector('#files')?.click(),
      fresh: () => {
        const u = schoolUser(); try { localStorage.removeItem(draftKey(u)); } catch { }
        this.form = {}; this.state = { err: '', savedNote: '', files: [], draftId: null };
        Object.assign(this.form, { rn: u.name, ra: 'School counselor', rc: u.id + '@lcps.example.org', rd: this.s.today, sch: u.school });
        this.setState({}); scrollFocus('refform', '#fn');
      }
    };
  }
  set anchors(v) { }
});
