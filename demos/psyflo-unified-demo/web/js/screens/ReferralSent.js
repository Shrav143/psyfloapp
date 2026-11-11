// 5 · Referral sent (school). Live: confirmation for ?id; "attach now" adds the missing attachment via referral.attach.
import { register, Screen, M, toast } from '../app.js';
import { schoolUser, schoolLong, signedInText, schoolSignOut, referralWords } from './SchoolPortal.js';

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
    if (!r) return { title: 'No referral yet', sub: 'Refer a student from the portal', signedIn: signedInText(u), schoolShortLong: schoolLong(s, u.school).split(' · ').pop(), missing: [], next: '—', hear: '—' };
    const c = M.byId(s.clients, r.client);
    const ini = c ? c.initials : String(r.client).split(',')[0];
    const att = r.form?.attachments || {};
    const missing = Object.keys(LABEL).filter(k => !att[k]).map(k => ({ key: k, label: LABEL[k] }));
    const files = Object.entries(att).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${LABEL[k] || k}: ${v}`);
    const draft = r.stage === 'draft';
    const status = referralWords(s, r);
    return {
      signedIn: signedInText(u), schoolShortLong: schoolLong(s, r.school || u.school).split(' · ').pop(),
      title: (draft ? 'Draft saved · ' : 'Referral sent · ') + ini,
      sub: `${r.id} · ${M.fmtDateTime(r.received)}${status && r.stage !== 'needs_screening' ? ' · ' + status : ''}`,
      next: draft ? 'Nothing has gone to Harvest yet. Open Refer a student to finish and submit it.' : r.stage === 'needs_screening' && !r.family_link?.sent ? 'Harvest will contact the guardian and tell you when the screening is booked.' : 'Now: ' + status + '. Harvest will tell you when the screening is booked.',
      missing, received: files.length ? 'all three received (' + files.join(' · ') + ')' : 'all three received',
      hear: `When the screening is scheduled, and when ${ini} starts.`
    };
  }
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
