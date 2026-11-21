// 5 · Referral sent (school). Live: confirmation for ?id; "attach now" adds the missing attachment via referral.attach.
import { register, Screen, M, toast } from '../app.js';
import { schoolUser, schoolLong, schoolSignOut, stageChip, SCHOOL_CSS } from './SchoolPortal.js';

const LABEL = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades' };

register('ReferralSent', class extends Screen {
  ref() {
    const s = this.s; const u = schoolUser();
    return s.referrals.find(r => r.id === this.params.id)
      || s.referrals.find(r => r.referred_by === u.id && r.stage !== 'draft')
      || s.referrals.find(r => r.id === 'REF-118') || s.referrals[0];
  }
  renderVals() {
    const s = this.s; const u = schoolUser(); const r = this.ref();
    const short = id => schoolLong(s, id).split(' · ').pop().replace('Middle School ', 'MS-').replace('Elementary School ', 'ES-').replace('High School ', 'HS-');
    if (!r) return { title: 'No referral yet', sub: '', signedIn: u.name, schoolShort: short(u.school), missing: [], next: '—' };
    const c = M.byId(s.clients, r.client);
    const ini = c ? c.initials : String(r.client).split(',')[0];
    const att = r.form?.attachments || {};
    const missing = Object.keys(LABEL).filter(k => !att[k]).map(k => ({ key: k, label: LABEL[k] }));
    const draft = r.stage === 'draft';
    const fl = r.family_link || {};
    return {
      signedIn: u.name, schoolShort: short(r.school || u.school),
      title: draft ? 'Draft saved' : 'Referral sent',
      sub: `${ini} · ${r.id}${draft ? '' : ' · ' + M.fmtDateTime(r.received)}`,
      next: draft ? 'Submit it from the form' : r.stage === 'waiting_on_school' ? 'Attach what is missing' : r.stage === 'screening_booked' ? 'Screening call booked' : fl.submitted ? 'Screening call' : fl.sent ? 'Family answers the link' : 'Harvest texts the family',
      missing
    };
  }
  get css() { return SCHOOL_CSS; }
  after(root) {
    const inp = root.querySelector('#attfile');
    if (inp) inp.onchange = async () => {
      const f = inp.files[0]; const r = this.ref(); if (!f || !r) return;
      await this.do('referral.attach', { id: r.id, key: this.pendingKey || 'schedule_and_grades', name: f.name });
      toast(`${LABEL[this.pendingKey] || 'Attachment'} added to ${r.id} · ${f.name}`);
    };
  }
  get anchors() {
    return {
      out: () => schoolSignOut(),
      up: (e, el) => { this.pendingKey = el?.dataset?.key || 'schedule_and_grades'; document.getElementById('attfile')?.click(); }
    };
  }
  set anchors(v) { }
});
