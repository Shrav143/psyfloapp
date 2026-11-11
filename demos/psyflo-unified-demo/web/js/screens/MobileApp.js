// 20 · Mobile app (phone, S1). Home = My students · Current activity · Say what happened · Review · Ready in Lauris, under a sticky student bar.
// One model of time with the panel (shared/time.js, actions time.*): start / pause / stop, a stopped timer becomes a draft entry, saving describes it.
// Recorded, direct, in-the-note and potentially billable are four separate figures; a running timer is none of them. The timer reads the demo clock.
// Nothing is picked for the person: no default student, no initials fallback (the server also checks the caseload and the Harvest #).
// State chips on every note: Draft · Waiting for Lauris · Processed in Lauris (processed only when a processed note exists, i.e. an observed page event).
// No promise of background or locked-screen capture. Also exports the phone helpers MobileDictate and MobileAssess share.
import { register, Screen, M, raw, esc, session, toast, go, api, app, ui } from '../app.js';
import { clock12, fmtDate } from '../shared/dates.js';
import { today as clockToday, nowFull } from '../shared/clock.js';
import { timeSummary, timerOf, entriesOf, identityCard, fmtMin, fmtElapsed, range12, FIGURES, kindOptions, needsCheck, kindLabel, unitRuleOf, stalenessLabel, isHHMM } from '../shared/time.js';

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
// seconds since the timer started, from the demo clock (store.clock via shared/clock.js): never the machine's clock
export function elapsedSec(s, started) {
  if (!started) return 0;
  const t = nowFull(s);
  if (started.slice(0, 10) !== t.slice(0, 10)) return 0;
  const sec = x => { const [h, m, z] = x.slice(11, 19).split(':').map(Number); return h * 3600 + m * 60 + (z || 0); };
  return Math.max(0, sec(t) - sec(started));
}
export { fmtElapsed };
export function tick(inst, fn) {
  clearInterval(inst._tick);
  inst._tick = setInterval(() => { if (app.current?.inst !== inst) return clearInterval(inst._tick); fn(); }, 1000);
}

// The sticky student bar: the identity card (initials, Harvest #, school, grade). Never initials alone.
export function patientBar(s, clientId, { change = true, verb = 'Selected', note = '' } = {}) {
  const c = clientId ? identityCard(s, clientId) : null;
  if (!c) return `<div class="pm-pid"><span class="pm-av pm-av--none" aria-hidden="true">?</span><div class="pm-pt"><b>No student selected</b><span>Tap a name to start</span></div></div>`;
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
  init() { this.state = { pick: this.params.client || null, desc: {}, act: '', ending: '', discarding: null, discardWhy: '', open: false }; }
  user() { return phoneUser(this.s); }
  students() { const u = this.user(); return u ? myStudents(this.s, u.id) : []; }
  timer() { const u = this.user(); return u ? timerOf(this.s, u.id, nowFull(this.s)) : null; }
  picked() { return this.students().find(c => c.id === this.state.pick) || null; }
  // the student the screen is about: the one the person picked, else the one the running timer is with (never a guess)
  focus() { const t = this.timer(); return this.picked() || (t && this.students().find(c => c.id === t.client)) || null; }
  drafts() { const u = this.user(); return u ? (this.s.time_entries || []).filter(e => e.staff === u.id && e.status === 'draft') : []; }
  renderVals() {
    const s = this.s; const u = this.user(); const today = clockToday(s);
    if (!u) return { who: '', bar: raw(patientBar(s, null, { change: false })), hasStudents: false, chips: [], figs: [], entries: [], drafts: [], review: [], stuNote: '', figCount: 0 };
    const st = this.students(); const t = this.timer(); const pk = this.picked(); const fc = this.focus();
    const running = !!t && !t.stale && !t.paused, paused = !!t && !t.stale && t.paused, stale = !!t && t.stale;
    const tc = t ? M.client(s, t.client) : null; const tCard = t ? identityCard(s, t.client) : null;
    const nt = M.notesToday(s, u.id);
    const unitR = unitRuleOf(s);
    // my notes today (waiting, used, and a draft someone started but did not save)
    const myD = (s.dictations || []).filter(d => d.staff === u.id && (d.at || '').slice(0, 10) === today);
    const rows = myD.map(d => { const c = M.client(s, d.client); const stt = dictationState(s, d); return { ini: c.initials, text: (d.spoken || '').length > 70 ? d.spoken.slice(0, 68) + '…' : d.spoken, chip: raw(STATE_CHIP[stt]()), open: () => go('MobileDictate', { client: d.client, edit: d.id }), canOpen: stt === 'waiting', at: M.fmtTime(d.at) }; });
    for (const c of st) { const k = ui.draft.get('phone:say:' + c.id, ''); if (k && k.trim() && !myD.some(d => d.client === c.id && d.spoken === k.trim())) rows.unshift({ ini: c.initials, text: k.length > 70 ? k.slice(0, 68) + '…' : k, chip: raw(STATE_CHIP.draft()), open: () => go('MobileDictate', { client: c.id }), canOpen: true, at: '' }); }
    const waitD = myD.filter(d => d.status === 'waiting');
    // the four figures for the student in focus (today, this person's entries)
    let sum = null; const figs = [];
    if (fc) {
      sum = timeSummary(s, fc.id, today, { staff: u.id });
      const run = t && t.client === fc.id && !t.stale;
      const docText = sum.documented.source === 'note' ? (sum.documented.minutes != null ? fmtMin(sum.documented.minutes) : 'in the note') : 'Not yet';
      const vals = { recorded: fmtMin(sum.recorded) + (run ? ' + running' : ''), direct: fmtMin(sum.direct), documented: docText, units: sum.units + (sum.units === 1 ? ' unit' : ' units') };
      for (const f of FIGURES) figs.push({ label: f.label, value: vals[f.key], hint: f.hint, extra: f.key === 'units' ? raw(ui.sourceChip(unitR)) : f.key === 'documented' && sum.linkedCount && sum.documented.source !== 'note' ? raw(ui.chip(`${sum.linkedCount} linked`, { tone: 'neutral', size: 'sm' })) : raw('') });
    }
    const entries = sum ? sum.entries.filter(e => e.status === 'saved').map(e => ({
      time: range12(e.start, e.end), min: fmtMin(e.minutes), what: e.what || 'Not described',
      chips: raw([!e.confirmed ? ui.chip('To confirm', { tone: 'warning', size: 'sm', title: 'Not counted as direct time until you confirm it.' }) : '', needsCheck(e) ? ui.chip('Check', { tone: 'neutral', size: 'sm', title: 'Idle or waiting time, transport, documentation and classroom monitoring without treatment are not reimbursable (Officially verified). If this was one of those, say so.' }) : '', e.dpn && e.dpn.note ? ui.chip('In the note', { tone: 'success', size: 'sm' }) : e.dpn ? ui.chip('Linked', { tone: 'info', size: 'sm' }) : '', e.source === 'manual' ? ui.chip('By hand', { tone: 'neutral', size: 'sm' }) : ''].join('')),
      canConfirm: !e.confirmed && !(e.dpn && e.dpn.note), canDiscard: !(e.dpn && e.dpn.note), askWhy: this.state.discarding === e.id,
      confirm: () => this.act(`Confirmed · ${fmtMin(e.minutes)} counts as direct service`, 'time.save', { id: e.id, confirm: true }),
      askDiscard: () => this.setState({ discarding: e.id, discardWhy: '' }), cancelDiscard: () => this.setState({ discarding: null }),
      why: ev => { this.state.discardWhy = ev.target.value; },
      discard: () => { if ((this.state.discardWhy || '').trim().length < 4) return toast('Say why (a few words)', 'err'); return this.act('Discarded · kept in the record', 'time.discard', { id: e.id, reason: this.state.discardWhy }).then(() => this.setState({ discarding: null })); }
    })) : [];
    const kinds = kindOptions(s).map(k => ({ key: k.key, label: k.label }));
    const drafts = this.drafts().map(e => {
      const c = M.client(s, e.client); const d = this.state.desc[e.id] || (this.state.desc[e.id] = { what: '', kind: 'direct' });
      return { id: e.id, title: `${c.initials} · ${range12(e.start, e.end)}`, min: fmtMin(e.minutes) + ' recorded', what: d.what, kinds: kinds.map(k => ({ ...k, sel: k.key === d.kind ? ' selected' : '' })),
        typed: ev => { d.what = ev.target.value; }, kind: ev => { d.kind = ev.target.value; },
        save: () => { if ((d.what || '').trim().length < 3) return toast('Say what you did (a few words)', 'err'); return this.act(`Saved · ${fmtMin(e.minutes)}`, 'time.save', { id: e.id, what: d.what, kind: d.kind }); },
        discard: () => this.act('Discarded · it was not saved', 'time.discard', { id: e.id }) };
    });
    const dot = c => { const done = nt.doneSet.has(c.id); const w = (s.dictations || []).some(d => d.client === c.id && d.status === 'waiting' && d.staff === u.id); return done ? 'ok' : w ? 'wait' : ''; };
    return {
      who: whoLine(s, u), bar: raw(patientBar(s, fc && fc.id, { note: !pk && fc ? 'Timing now' : '' })), hasStudents: st.length > 0,
      chips: st.map(c => ({ ini: c.initials, on: fc && c.id === fc.id ? ' on' : '', pressed: !!(fc && c.id === fc.id), dot: dot(c), sr: dot(c) === 'ok' ? 'daily note processed today' : dot(c) === 'wait' ? 'a note is waiting for Lauris' : 'no note yet today', pick: () => this.setState({ pick: c.id }) })),
      stuNote: st.length ? `${nt.done} of ${nt.total} daily notes processed today` : '',
      hasFocus: !!fc, focusIni: fc ? fc.initials : '',
      isIdle: !t, isRunning: running, isPaused: paused, isStale: stale, hasDrafts: drafts.length > 0, drafts,
      timerWho: tCard ? tCard.line : '', timerIni: tc ? tc.initials : '', elapsed: t && !t.stale ? fmtElapsed(t.elapsedSec) : '', timerSince: t ? `${t.paused ? 'Paused · ' : ''}since ${clock12(t.start)}` : '',
      staleText: stalenessLabel(s, t), ending: this.state.ending, endTyped: ev => { this.state.ending = ev.target.value; },
      canStart: !!fc && !t, canSwitch: !!t && !t.stale && !!pk && pk.id !== t.client, switchLabel: pk ? `Switch to ${pk.initials}` : '',
      startLabel: fc ? `Start with ${fc.initials}` : 'Pick a student to start',
      start: () => this.start(), pause: () => this.act('Paused', 'time.pause', {}), resume: () => this.act('Resumed', 'time.resume', {}), stop: () => this.stop(), switchTo: () => this.start(true), stopStale: () => this.stopStale(),
      actText: this.state.act, actTyped: ev => { this.state.act = ev.target.value; }, timerWhat: t ? t.what || '' : '', actSet: ev => this.act('Activity noted', 'time.activity', { what: ev.target.value }),
      timerNote: t && !t.stale ? 'Recorded time only. A running timer is not billable.' : '',
      figs, figCount: figs.length, entries, entryCount: entries.length, showEntries: this.state.open && entries.length > 0, toggleLabel: this.state.open ? 'Hide entries' : `Today's entries (${entries.length})`, toggle: () => this.setState({ open: !this.state.open }),
      review: rows, hasReview: rows.length > 0,
      readyText: waitD.length ? `${waitD.length} waiting. It drops in when ${[...new Set(waitD.map(d => M.client(s, d.client).initials))].join(' or ')}'s daily note is open in Lauris, matched by Harvest #.` : 'Nothing waiting for Lauris.',
      readySub: waitD.length ? 'You review the words and press Process Form yourself.' : '',
      dueN: dueAssessments(s, u.id).length, canSay: !!fc, sayDisabled: !fc, sayHint: fc ? '' : 'Pick a student first'
    };
  }
  after(root) {
    const t = this.timer();
    if (t && !t.stale && !t.paused) tick(this, () => { const el = document.getElementById('elapsed'); const x = this.timer(); if (el && x && !x.stale) el.textContent = fmtElapsed(x.elapsedSec); });
    else clearInterval(this._tick);
  }
  // one place for a person's tap that changes time: the server decides, the screen says what happened
  async act(msg, action, args) { try { await this.do(action, args); toast(msg); } catch (e) { /* this.do already toasted the server's reason */ } }
  async start(sw = false) {
    const fc = this.focus(); if (!fc) return toast('Pick a student first', 'err');
    const card = identityCard(this.s, fc.id);
    await this.act(`Timer started with ${fc.initials}`, 'time.start', { client: fc.id, harvest_no: card.harvest_no, switch: sw, what: this.state.act });
    this.state.act = '';
  }
  async stop() {
    const t = this.timer(); if (!t) return;
    try { const r = await this.do('time.stop', {}); toast(`Stopped · ${fmtMin(r.minutes)} recorded. Say what you did, then save it.`); } catch (e) { }
  }
  async stopStale() {
    if (!isHHMM(this.state.ending)) return toast('Enter the time it really ended, like 14:30', 'err');
    try { const r = await this.do('time.stop', { end: this.state.ending }); this.state.ending = ''; toast(`Recorded ${fmtMin(r.minutes)}. Say what you did, then save it.`); } catch (e) { }
  }
  get anchors() {
    return {
      change: () => { this.setState({ pick: null }); document.querySelector('.pm-chips button')?.focus(); },
      dictate: () => { const fc = this.focus(); if (!fc) return toast('Pick a student first', 'err'); go('MobileDictate', { client: fc.id }); },
      type: () => { const fc = this.focus(); if (!fc) return toast('Pick a student first', 'err'); go('MobileDictate', { client: fc.id, type: 1 }); }
    };
  }
  set anchors(v) { }
});
