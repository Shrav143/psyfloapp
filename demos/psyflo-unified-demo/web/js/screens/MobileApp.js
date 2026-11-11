// 20 · Mobile app (phone, Flow B). Live: K. Hale's student chips (clients where staff === the user), Start/Stop
// timer (timer.start / timer.stop), "Say what happened" → MobileDictate, day so far from the store
// (timer blocks, dictations waiting, notes done today via M.notesToday).
// Also exports the phone helpers MobileDictate and MobileAssess share.
import { register, Screen, M, session, toast, go, api, app } from '../app.js';
import { clock12, mins, fmtDuration } from '../shared/dates.js';

// ---------- shared phone helpers ----------
// the phone acts as the person signed in: no fallback to another staff member (the server also checks the caseload and the role)
export function phoneUser(s) { return session.user; }
export const myStudents = (s, uid) => s.clients.filter(c => c.staff === uid && c.stage !== 'discharged');
export function siteShort(s, u) { return (u.sites?.[0] ? M.school(s, u.sites[0]).name : '').split(' · ').pop(); }
export function whoLine(s, u) { return `${u.name.split(' ')[0]} · ${siteShort(s, u)} · ${M.fmtDate(s.today, { dow: true })}`; }
export function dueAssessments(s, uid) {
  return (s.assessments_due || []).filter(d => d.staff === uid || !d.staff)
    .filter(d => !s.assessments.some(a => a.client === d.client && a.instrument === d.instrument && a.date === s.today));
}
// seconds since the timer started, on the story day. The seed's 13:52 start can be "in the future" against the
// wall clock (or hours stale); then count from when this browser first saw that start, never negative.
export function elapsedSec(s, started) {
  if (!started) return 0;
  const now = new Date(); const t = started.slice(11, 19).split(':').map(Number);
  let sec = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) - (t[0] * 3600 + t[1] * 60 + (t[2] || 0));
  if (started.slice(0, 10) !== s.today) sec = -1;
  if (sec >= 0 && sec < 8 * 3600) return sec;
  const key = 'psyflo_timer_anchor_' + started;
  let a = null; try { a = +localStorage.getItem(key) || null; } catch { }
  if (!a) { a = Date.now() - (23 * 60 + 41) * 1000; try { localStorage.setItem(key, String(a)); } catch { } }
  return Math.max(0, Math.round((Date.now() - a) / 1000));
}
export function fmtElapsed(sec) { const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, x = sec % 60; const p = n => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`; }
export function blockLabel(s, b) { const c = M.byId(s.clients, b[2]); return c ? c.initials : (b[2] || ''); }
export function tick(inst, fn) {
  clearInterval(inst._tick);
  inst._tick = setInterval(() => { if (app.current?.inst !== inst) return clearInterval(inst._tick); fn(); }, 1000);
}

register('MobileApp', class extends Screen {
  init() { this.state = { pick: null }; }
  user() { return phoneUser(this.s); }
  timer() { return this.s.timers?.[this.user().id] || {}; }
  picked() { const st = myStudents(this.s, this.user().id); const t = this.timer(); return st.find(c => c.id === this.state.pick) || st.find(c => c.id === t.client) || st[0]; }
  renderVals() {
    const s = this.s; const u = this.user(); const t = this.timer(); const st = myStudents(s, u.id); const pk = this.picked();
    const running = !!t.started;
    const tc = running ? M.client(s, t.client) : null;
    const lastBlock = (t.blocks || []).at(-1);
    const nt = M.notesToday(s, u.id); const waitingN = nt.total - nt.done;
    // day so far: timer blocks, what was said, the running block — in time order
    const items = (t.blocks || []).map(b => ({ at: b[0], text: `${clock12(b[0]).replace(/ [ap]m$/, '')} ${blockLabel(s, b)}${b[3] ? ' (unconfirmed)' : ''} ${fmtDuration(mins(b[1]) - mins(b[0])).replace(' 0 min', '')}` }));
    for (const d of s.dictations.filter(d => d.staff === u.id && (d.at || '').slice(0, 10) === s.today)) items.push({ at: d.at.slice(11, 16), text: `${clock12(d.at.slice(11, 16)).replace(/ [ap]m$/, '')} said: "${d.spoken.length > 60 ? d.spoken.slice(0, 58) + '…' : d.spoken}"` });
    if (running) items.push({ at: t.started.slice(11, 16), text: `${clock12(t.started.slice(11, 16)).replace(/ [ap]m$/, '')} ${tc.initials} running` });
    items.sort((a, b) => a.at < b.at ? -1 : 1);
    const waitD = s.dictations.filter(d => d.staff === u.id && d.status === 'waiting');
    return {
      who: whoLine(s, u), running, dot: running ? '#F0B44C' : '#8E99A6',
      timerLabel: running ? 'With a student now' : 'Timer stopped',
      timerWho: running ? tc.initials : (pk ? 'Pick a student, then Start' : 'No students'),
      elapsed: running ? fmtElapsed(elapsedSec(s, t.started)) : '',
      timerSub: running ? `Since ${clock12(t.started.slice(11, 16))} · runs with the screen locked` : lastBlock ? `Last: ${clock12(lastBlock[0])}–${clock12(lastBlock[1])} · ${blockLabel(s, lastBlock)}` : 'Start the timer when you are with a student',
      chips: st.map(c => ({ ini: c.initials, on: pk && c.id === pk.id ? ' on' : '', pick: () => this.setState({ pick: c.id }) })),
      startLabel: running && pk && t.client === pk.id ? `Timing ${pk.initials} now` : running ? `Switch to ${pk?.initials}` : `Start with ${pk?.initials || '…'}`,
      notesChip: `${waitingN} note${waitingN === 1 ? '' : 's'} waiting`,
      day: items.map(i => i.text).join(' · ') || 'Nothing yet today',
      waiting: waitD.length ? `${waitD.length} dictation${waitD.length === 1 ? '' : 's'} ready for you when you open ${[...new Set(waitD.map(d => M.client(s, d.client).initials))].join(', ')} in Lauris` : '',
      dueN: dueAssessments(s, u.id).length,
      stop: () => this.stop(), startPicked: () => this.start()
    };
  }
  after() {
    const t = this.timer();
    if (t.started) tick(this, () => { const el = document.getElementById('elapsed'); if (el) el.textContent = fmtElapsed(elapsedSec(this.s, this.timer().started)); });
    else clearInterval(this._tick);
  }
  async stop() { const u = this.user(); const t = this.timer(); if (!t.started) return; await this.do('timer.stop', { staff: u.id }); toast(`Timer stopped · ${M.client(this.s, t.client).initials}'s time is saved for the daily note`); }
  async start() {
    const u = this.user(); const pk = this.picked(); const t = this.timer(); if (!pk) return;
    if (t.started && t.client === pk.id) return toast(`Already timing ${pk.initials}`);
    if (t.started) await this.do('timer.stop', { staff: u.id });
    await this.do('timer.start', { staff: u.id, client: pk.id });
    toast(`Timer started with ${pk.initials}`);
  }
  get anchors() {
    return {
      start: () => this.start(),
      dictate: () => go('MobileDictate', { client: this.picked()?.id }),
      type: () => go('MobileDictate', { client: this.picked()?.id, type: 1 })
    };
  }
  set anchors(v) { }
});
