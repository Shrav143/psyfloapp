// 20 · Mobile app (phone, S1). Home = My students · Say what happened · Review · Ready in Lauris, under a sticky student bar.
// (The timer, time entries and the four time figures were removed on Nov 11 on the direct-support feedback: Psyflo no longer records or counts time.)
// Nothing is picked for the person: no default student, no initials fallback (the server also checks the caseload and the Harvest #).
// State chips on every note: Draft · Waiting for Lauris · Processed in Lauris (processed only when a processed note exists, i.e. an observed page event).
// No promise of background or locked-screen capture. Also exports the phone helpers MobileDictate and MobileAssess share.
import { register, Screen, M, raw, esc, session, toast, go, app, ui } from '../app.js';
import { today as clockToday } from '../shared/clock.js';
import { identityCard } from '../shared/identity.js';

// ---------- shared phone helpers ----------
// the phone acts as the person signed in: no fallback to another staff member (the server also checks the caseload and the role)
export function phoneUser(s) { return session.user; }
// the students this person works with on the phone: direct support = their own caseload; a clinician = students they are the clinician for
export function myStudents(s, uid) {
  const me = M.byId(s.staff || [], uid);
  return (s.clients || []).filter(c => c.stage !== 'discharged' && c.service_line !== 'outpatient' && (me && me.role === 'direct_support' ? c.staff === uid : c.staff === uid || c.clinician === uid));
}
export function siteShort(s, u) { return (u.sites && u.sites[0] && u.sites !== 'all' ? M.school(s, u.sites[0]).name : '').split(' · ').pop(); }
export function whoLine(s, u) { return `${u.name.split(' ')[0]} · ${siteShort(s, u) || 'Harvest'} · ${M.fmtDate(clockToday(s), { dow: true })}`; }
export function dueAssessments(s, uid) {
  const mine = new Set(myStudents(s, uid).map(c => c.id));
  return (s.assessments_due || []).filter(d => (d.staff === uid || !d.staff) && mine.has(d.client))
    .filter(d => !(s.assessments || []).some(a => a.client === d.client && a.instrument === d.instrument && a.date === clockToday(s)));
}
// a one-second ticker for a screen (the dictation screen's microphone time)
export function tick(inst, fn) {
  clearInterval(inst._tick);
  inst._tick = setInterval(() => { if (app.current?.inst !== inst) return clearInterval(inst._tick); fn(); }, 1000);
}

// The sticky student bar: the identity card (initials, Harvest #, school, grade). Never initials alone.
export function patientBar(s, clientId, { change = true, verb = 'Selected', note = '', choosing = false } = {}) {
  const c = clientId ? identityCard(s, clientId) : null;
  if (!c) return `<div class="pm-pid"><span class="pm-av pm-av--none" aria-hidden="true">?</span><div class="pm-pt"><b>${choosing ? 'Choose a student' : 'No student selected'}</b><span>${choosing ? 'Tap a name below to change' : 'Tap a name to start'}</span></div></div>`;
  return `<div class="pm-pid"><span class="pm-av" aria-hidden="true">${esc(c.initials.replace(/\./g, ''))}</span><div class="pm-pt"><b>${esc(c.initials)}</b><span>${c.harvest_no ? 'Harvest # ' + esc(c.harvest_no) + ' · ' : ''}${esc(c.schoolShort)}${c.grade != null ? ' · grade ' + esc(c.grade) : ''}</span>${note ? `<span class="pm-pn">${esc(note)}</span>` : ''}</div></div>${change ? '<a class="pm-chg" href="#change" id="pm-change">Change</a>' : ''}`;
}
// What state is a dictation in? Processed only when a processed note says so (an observed Process Form), never because a flag was set.
export function dictationState(s, d) {
  if (d.status === 'used') { const n = (s.notes || []).find(x => x.client === d.client && x.type === 'daily' && (x.dictation === d.spoken || x.date === (d.used_at || d.at || '').slice(0, 10))); return n ? 'processed' : 'used'; }
  return 'waiting';
}
export const STATE_CHIP = {
  draft: () => ui.chip('Draft', { tone: 'warning', size: 'sm', title: 'Not saved yet. Nothing waits for Lauris until you save it.' }),
  waiting: () => ui.chip('Waiting for Lauris', { tone: 'info', size: 'sm', title: 'Saved in Psyflo. It drops in when this student\'s daily note is open in Lauris.' }),
  processed: () => ui.chip('Processed in Lauris', { tone: 'success', size: 'sm', title: 'A person pressed Process Form in Lauris and Psyflo saw it.' }),
  used: () => ui.chip('Used in Lauris', { tone: 'neutral', size: 'sm', title: 'Marked used; no processed note has been seen yet.' })
};

register('MobileApp', class extends Screen {
  init() { this.state = { pick: this.params.client || null, changing: false }; }
  user() { return phoneUser(this.s); }
  students() { const u = this.user(); return u ? myStudents(this.s, u.id) : []; }
  picked() { return this.students().find(c => c.id === this.state.pick) || null; }
  // the student the screen is about: the one the person picked (never a guess)
  focus() { if (this.state.changing) return null; return this.picked(); }
  renderVals() {
    const s = this.s; const u = this.user(); const today = clockToday(s);
    if (!u) return { who: '', bar: raw(patientBar(s, null, { change: false })), hasStudents: false, chips: [], review: [], stuNote: '' };
    const st = this.students(); const fc = this.focus();
    const nt = M.notesToday(s, u.id);
    // my notes today (waiting, used, and a draft someone started but did not save)
    const myD = (s.dictations || []).filter(d => d.staff === u.id && (d.at || '').slice(0, 10) === today);
    const rows = myD.map(d => { const c = M.client(s, d.client); const stt = dictationState(s, d); return { ini: c.initials, text: (d.spoken || '').length > 70 ? d.spoken.slice(0, 68) + '…' : d.spoken, chip: raw(STATE_CHIP[stt]()), open: () => go('MobileDictate', { client: d.client, edit: d.id }), canOpen: stt === 'waiting', at: M.fmtTime(d.at) }; });
    for (const c of st) { const k = ui.draft.get('phone:say:' + c.id, ''); if (k && k.trim() && !myD.some(d => d.client === c.id && d.spoken === k.trim())) rows.unshift({ ini: c.initials, text: k.length > 70 ? k.slice(0, 68) + '…' : k, chip: raw(STATE_CHIP.draft()), open: () => go('MobileDictate', { client: c.id }), canOpen: true, at: '' }); }
    const waitD = myD.filter(d => d.status === 'waiting');
    const dot = c => { const done = nt.doneSet.has(c.id); const w = (s.dictations || []).some(d => d.client === c.id && d.status === 'waiting' && d.staff === u.id); return done ? 'ok' : w ? 'wait' : ''; };
    return {
      who: whoLine(s, u), bar: raw(patientBar(s, fc && fc.id, { choosing: this.state.changing })), hasStudents: st.length > 0,
      chips: st.map(c => ({ ini: c.initials, on: fc && c.id === fc.id ? ' on' : '', pressed: !!(fc && c.id === fc.id), dot: dot(c), sr: dot(c) === 'ok' ? 'daily note processed today' : dot(c) === 'wait' ? 'a note is waiting for Lauris' : 'no note yet today', pick: () => this.setState({ pick: c.id, changing: false }) })),
      stuNote: st.length ? `${nt.done} of ${nt.total} daily notes processed today` : '',
      review: rows, hasReview: rows.length > 0,
      readyText: waitD.length ? `${waitD.length} waiting. It drops in when ${[...new Set(waitD.map(d => M.client(s, d.client).initials))].join(' or ')}'s daily note is open in Lauris, matched by Harvest #.` : 'Nothing waiting for Lauris.',
      readySub: waitD.length ? 'You review the words and press Process Form yourself.' : '',
      dueN: dueAssessments(s, u.id).length, canSay: !!fc, sayDisabled: !fc, sayHint: fc ? '' : 'Pick a student first'
    };
  }
  get anchors() {
    return {
      change: () => { this.setState({ pick: null, changing: true }); document.querySelector('.pm-chips button')?.focus(); },
      dictate: () => { const fc = this.focus(); if (!fc) return toast('Pick a student first', 'err'); go('MobileDictate', { client: fc.id }); },
      type: () => { const fc = this.focus(); if (!fc) return toast('Pick a student first', 'err'); go('MobileDictate', { client: fc.id, type: 1 }); }
    };
  }
  set anchors(v) { }
});
