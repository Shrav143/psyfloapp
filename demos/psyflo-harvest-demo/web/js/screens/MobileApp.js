// 20 · Mobile app (phone, Flow B). Live: K. Hale's six student chips (clients where staff === the user), the timer card
// (timer.start / timer.stop; it keeps counting with the screen locked because it is a stored start time), the big
// "Say what happened" button → MobileDictate, and the day so far as rows from the store (timer blocks, dictations saved,
// notes done today via M.notesToday). Bottom nav: Today · Students · Assess · Me (all three tabs live here).
// Voice tagging: the mic in the timer card listens for "I'm going to begin working with D.P." (Web Speech) and moves the
// timer to that student; the presenter command 'example' plays the same sentence through the same parser.
// Also exports the phone helpers and the shared phone/guardian CSS that MobileDictate, MobileAssess and the Parent* screens use.
import { register, Screen, M, session, toast, go, app, raw, esc } from '../app.js';
import { clock12, mins } from '../shared/dates.js';

// ---------- shared phone / guardian look (brand tokens only, see css/ui.css) ----------
export const C_CSS = `
.c-ph{width:100%;height:844px;display:flex;flex-direction:column;overflow:hidden;background:var(--paper);color:var(--navy);font:400 16px/24px 'DM Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.c-ph *{box-sizing:border-box}
.c-ph button{font-family:inherit}
.c-hd{flex:0 0 auto;background:var(--navy);color:#fff;display:flex;align-items:center;gap:12px;padding:14px 20px;min-height:60px}
.c-hd svg{height:23px;width:auto;display:block}
.c-hd .c-t{font-size:17px;line-height:24px;font-weight:700;min-width:0}
.c-hd .c-r{margin-left:auto;font-size:13px;line-height:20px;color:var(--ink-4);white-space:nowrap}
@media (max-width:700px){.c-hd{padding-right:60px}}
.c-lang{margin-left:auto;display:flex;gap:6px}
.c-lang a{min-width:40px;min-height:32px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--ink-4);border-radius:999px;color:#fff;font-size:13px;font-weight:600;text-decoration:none}
.c-lang a.on{background:var(--teal);border-color:var(--teal)}
.c-bd{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px}
.c-sec{display:flex;align-items:center;gap:8px;font-size:16px;line-height:24px;font-weight:600;margin:0}
.c-sec .u-chip{margin-left:auto}
.c-card{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:12px 16px;flex-shrink:0}
.c-lbl{display:block;font-size:16px;line-height:24px;font-weight:600;margin:0 0 8px}
.c-q{font-size:20px;line-height:28px;font-weight:600;margin:0}
.c-mut{color:var(--ink-3)} .c-sm{font-size:13px;line-height:20px}
.c-in{width:100%;min-height:52px;border:1px solid var(--line-strong);border-radius:8px;padding:0 14px;background:var(--white);font:400 17px/24px 'DM Sans',system-ui,sans-serif;color:var(--navy)}
textarea.c-in{padding:12px 14px;min-height:104px;resize:vertical}
.c-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 18px;border-radius:8px;border:1px solid var(--line-strong);background:var(--white);color:var(--navy);font:600 16px/24px 'DM Sans',system-ui,sans-serif;text-decoration:none;cursor:pointer;flex-shrink:0}
.c-btn:hover{background:var(--paper)}
.c-btn.pri{background:var(--teal);border-color:var(--teal);color:#fff} .c-btn.pri:hover{background:var(--teal-dark)}
.c-btn.lg{min-height:64px;font-size:18px} .c-btn.sm{min-height:44px;padding:0 14px;font-size:15px}
.c-btn.txt{border-color:transparent;background:transparent;color:var(--teal-dark)}
.c-btn svg{width:22px;height:22px;flex:0 0 22px}
.c-btn.sq{width:64px;padding:0;flex:0 0 64px}
.c-lnk{color:var(--teal-dark);font-weight:600;text-decoration:none;background:none;border:0;padding:0;font:600 15px/20px 'DM Sans',system-ui,sans-serif;cursor:pointer}
.c-lnk:hover{text-decoration:underline}
.c-chips{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;flex-shrink:0}
.c-stu{min-height:44px;border:1px solid var(--line-strong);border-radius:999px;background:var(--white);font:600 14px/20px 'DM Sans',system-ui,sans-serif;color:var(--navy);cursor:pointer;padding:0}
.c-stu.on{background:var(--teal-tint);border-color:var(--teal);color:var(--teal-dark)}
.c-timer{display:flex;align-items:center;gap:12px;background:var(--white);border:1px solid var(--line);border-radius:12px;padding:10px 12px 10px 16px;flex-shrink:0}
.c-timer .dot{width:12px;height:12px;border-radius:50%;background:var(--ink-4);flex:0 0 12px}
.c-timer.run .dot{background:var(--marigold)}
.c-timer .who{font-size:20px;line-height:28px;font-weight:700;flex:1;min-width:0;white-space:nowrap}
.c-timer .who span{font-weight:600;margin-left:10px}
.c-ic{width:44px;height:44px;border-radius:8px;border:1px solid var(--line-strong);background:var(--white);color:var(--navy);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:0 0 44px}
.c-ic svg{width:20px;height:20px}
.c-ic.on{background:var(--teal-tint);border-color:var(--teal);color:var(--teal-dark)}
.c-rows{background:var(--white);border:1px solid var(--line);border-radius:12px;overflow:hidden;flex-shrink:0}
.c-row{display:grid;grid-template-columns:var(--cols,48px minmax(0,1fr) auto);gap:12px;align-items:center;min-height:56px;padding:8px 16px;border-top:1px solid var(--line);font-size:15px;line-height:20px;color:inherit;text-decoration:none;background:none;width:100%;text-align:left;font-family:inherit;border-left:0;border-right:0;border-bottom:0}
.c-row:first-child{border-top:0}
.c-row .t{color:var(--ink-3);font-size:13px}
.c-row .d{color:var(--ink-3);font-size:13px;text-align:right;white-space:nowrap}
.c-row b{font-weight:600}
.c-row small{display:block;font-size:12px;line-height:16px;color:var(--watch-fg);font-weight:600}
.c-nav{flex:0 0 auto;display:flex;border-top:1px solid var(--line);background:var(--paper);padding:6px 8px 20px}
.c-nav a{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:48px;font-size:12px;line-height:16px;font-weight:500;color:var(--ink-3);text-decoration:none}
.c-nav a.on{color:var(--teal-dark);font-weight:700}
.c-nav svg{width:20px;height:20px}
.c-nav .b{position:absolute;top:2px;left:calc(50% + 8px);min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--watch-bg);color:var(--watch-fg);font-size:11px;line-height:18px;font-weight:700;text-align:center}
.c-ft{flex:0 0 auto;padding:12px 20px 20px;border-top:1px solid var(--line);display:flex;justify-content:center;gap:20px;font-size:14px}
.c-dots{display:flex;gap:6px;justify-content:center;flex-shrink:0}
.c-dots i{width:8px;height:8px;border-radius:50%;background:var(--line-strong)}
.c-dots i.done{background:var(--teal)}
.c-dots i.cur{width:24px;border-radius:4px;background:var(--teal)}
.c-rad{display:flex;gap:8px;flex-wrap:wrap}
.c-rad.col{flex-direction:column}
.c-rad label{flex:1 1 0;display:flex;align-items:center;gap:10px;min-height:52px;padding:0 14px;border:1px solid var(--line-strong);border-radius:8px;background:var(--white);font-size:16px;font-weight:500;margin:0;cursor:pointer}
.c-rad label.on{border-color:var(--teal);background:var(--teal-tint);color:var(--teal-dark);font-weight:600}
.c-rad input{width:20px;height:20px;margin:0;accent-color:var(--teal);flex:0 0 20px}
.c-rad label{position:relative}
.c-rad.pill label{justify-content:center;text-align:center;padding:6px;line-height:20px;min-height:56px}
.c-rad.pill input{position:absolute;opacity:0;width:1px;height:1px}
.c-rad.pill label:focus-within{outline:2px solid var(--teal);outline-offset:2px}
.c-bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden}
.c-bar i{display:block;height:100%;background:var(--teal)}
.c-bar.y i{background:var(--marigold)}
.c-err{color:var(--late-fg);background:var(--late-bg);border-radius:8px;padding:8px 12px;font-size:14px;line-height:20px;font-weight:600}
.c-num{display:flex;flex-wrap:wrap;gap:6px}
.c-num .c-stu{flex:1 0 44px;border-radius:8px}
`;

// the logo (reverse) and the bottom nav, as raw HTML so the three phone screens share them
const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"></path></svg>',
  assess: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4V3h6v1M9 13l2 2 4-4"></path></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"></path></svg>'
};
export const PHONE_ICON = I;
const LOGO = `<svg role="img" aria-label="psyflo" viewBox="0 0 3191 1060" width="70" height="23"><g transform="translate(-6.0,780.0) scale(1,-1)"><path d="M66 -220V504H186L201 434Q217 456 239.0 474.5Q261 493 291.5 504.5Q322 516 363 516Q434 516 488.0 481.0Q542 446 573.5 386.5Q605 327 605 251Q605 175 573.0 115.5Q541 56 487.0 22.0Q433 -12 364 -12Q308 -12 267.5 8.5Q227 29 201 65V-220ZM332 106Q372 106 402.5 124.0Q433 142 450.0 175.0Q467 208 467 251Q467 294 450.0 327.5Q433 361 402.5 379.5Q372 398 332 398Q293 398 262.5 379.5Q232 361 214.5 328.0Q197 295 197 252Q197 209 214.5 175.5Q232 142 262.5 124.0Q293 106 332 106Z" fill="#FFFFFF"></path></g><g transform="translate(624.0,780.0) scale(1,-1)"><path d="M272 -12Q203 -12 152.0 10.0Q101 32 72.0 71.0Q43 110 39 159H173Q178 140 190.0 124.5Q202 109 222.0 100.0Q242 91 270 91Q297 91 314.0 98.5Q331 106 339.5 119.0Q348 132 348 146Q348 167 336.0 178.5Q324 190 301.0 197.0Q278 204 245 211Q209 218 174.5 228.5Q140 239 113.0 255.0Q86 271 70.0 296.0Q54 321 54 358Q54 403 78.0 438.5Q102 474 148.0 495.0Q194 516 259 516Q350 516 403.0 475.0Q456 434 466 362H339Q333 385 312.5 398.5Q292 412 258 412Q222 412 203.0 399.0Q184 386 184 365Q184 351 196.5 340.0Q209 329 232.0 321.5Q255 314 288 307Q346 295 390.0 279.5Q434 264 459.0 235.5Q484 207 484 153Q484 105 458.0 67.5Q432 30 384.5 9.0Q337 -12 272 -12Z" fill="#FFFFFF"></path></g><g transform="translate(1105.0,780.0) scale(1,-1)"><path d="M130 -220 252 56H222L20 504H167L311 179L441 504H584L273 -220Z" fill="#FFFFFF"></path></g><g transform="translate(1734.0,780.0) scale(1,-1)"><path d="M89 0V549Q89 612 110.0 649.0Q131 686 170.5 703.0Q210 720 263 720H325V605H283Q251 605 237.5 592.5Q224 580 224 549V0ZM20 391V504H333V391Z" fill="#5FC0BE"></path></g><g transform="translate(2080.0,780.0) scale(1,-1)"><path d="M66 0V720H201V0Z" fill="#5FC0BE"></path></g><g transform="translate(2322.0,780.0) scale(1,-1)"><path d="M304 -12Q232 -12 174.5 21.5Q117 55 83.5 114.5Q50 174 50 251Q50 330 83.5 389.5Q117 449 175.0 482.5Q233 516 305 516Q378 516 435.5 482.5Q493 449 526.5 389.5Q560 330 560 252Q560 174 526.5 114.5Q493 55 435.0 21.5Q377 -12 304 -12ZM304 105Q338 105 364.5 121.0Q391 137 406.5 170.0Q422 203 422 252Q422 301 406.5 333.5Q391 366 364.5 382.5Q338 399 305 399Q273 399 246.0 382.5Q219 366 203.5 333.5Q188 301 188 252Q188 203 203.5 170.0Q219 137 245.5 121.0Q272 105 304 105Z" fill="#5FC0BE"></path></g><g transform="translate(2922.0,780.0) scale(1,-1)"><path d="M127 -5Q89 -5 66.0 17.5Q43 40 43 73Q43 106 66.0 128.5Q89 151 127 151Q163 151 186.0 128.5Q209 106 209 73Q209 40 186.0 17.5Q163 -5 127 -5Z" fill="#F0B44C"></path></g></svg>`;
export const phoneHeader = right => raw(`<header class="c-hd">${LOGO}<span class="c-r">${esc(right)}</span></header>`);
export function phoneNav(active, due) {
  const a = (id, href, label, badge) => `<a href="${href}"${active === id ? ' class="on" aria-current="page"' : ''}>${I[id]}${label}${badge ? `<span class="b">${badge}</span>` : ''}</a>`;
  return raw(`<nav class="c-nav" aria-label="Main">${a('today', 'MobileApp.dc.html', 'Today')}${a('students', 'MobileApp.dc.html?tab=students', 'Students')}${a('assess', 'MobileAssess.dc.html', 'Assess', due || '')}${a('me', 'MobileApp.dc.html?tab=me', 'Me')}</nav>`);
}

// ---------- shared phone helpers ----------
export function phoneUser(s) { const u = session.user; return u && u.role === 'direct_support' ? u : M.byId(s.staff, 'khale') || u; }
export const myStudents = (s, uid) => s.clients.filter(c => c.staff === uid && c.stage !== 'discharged');
export function siteShort(s, u) { return (u.sites?.[0] ? M.school(s, u.sites[0]).name : '').split(' · ').pop(); }
export function whoLine(s, u) { return `${u.name.split(' ')[0]} · ${siteShort(s, u)} · ${M.fmtDate(s.today, { dow: true })}`; }
export const hdWho = (s, u) => `${u.name.split(' ')[0]} · ${siteShort(s, u)}`;
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
  if (!a) { a = Date.now() - (56 * 60 + 38) * 1000; try { localStorage.setItem(key, String(a)); } catch { } }
  return Math.max(0, Math.round((Date.now() - a) / 1000));
}
export function fmtElapsed(sec) { const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, x = sec % 60; const p = n => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`; }
export function blockLabel(s, b) { const c = M.byId(s.clients, b[2]); return c ? c.initials : (b[2] || ''); }
export function tick(inst, fn) {
  clearInterval(inst._tick);
  inst._tick = setInterval(() => { if (app.current?.inst !== inst) return clearInterval(inst._tick); fn(); }, 1000);
}
// "1 h 15", "45 min"
export const dur = min => { const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h} h ${m}` : `${h} h`) : `${m} min`; };
// the speech recognizer, when the browser has one
export const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
// presenter commands ({ psyflo: 'present', cmd }) for as long as this screen is the current one
export function onPresent(inst, fn) {
  if (inst._pm) removeEventListener('message', inst._pm);
  inst._pm = e => { if (app.current?.inst !== inst) return removeEventListener('message', inst._pm); const d = e.data; if (d && d.psyflo === 'present') fn(d.cmd); };
  addEventListener('message', inst._pm);
}
// Voice tagging: which student does a spoken phrase name? ("I'm going to begin working with D.P.", "J T", "Tyler")
export function voiceTag(text, students) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[.,\-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const c of students) {
    const letters = String(c.initials || '').replace(/[^a-z]/gi, '').toLowerCase();
    if (letters && new RegExp(' ' + letters.split('').join(' ?') + ' ').test(t)) return c;
    if (c.first_name && t.includes(' ' + c.first_name.toLowerCase() + ' ')) return c;
  }
  return null;
}

register('MobileApp', class extends Screen {
  init() {
    this.state = { pick: null, tab: ['students', 'me'].includes(this.params.tab) ? this.params.tab : 'today', listening: false };
    onPresent(this, cmd => { if (cmd === 'example') this.example(); });
  }
  user() { return phoneUser(this.s); }
  timer() { return this.s.timers?.[this.user().id] || {}; }
  picked() { const st = myStudents(this.s, this.user().id); const t = this.timer(); return st.find(c => c.id === this.state.pick) || st.find(c => c.id === t.client) || st[0]; }
  renderVals() {
    const s = this.s; const u = this.user(); const t = this.timer(); const st = myStudents(s, u.id); const pk = this.picked();
    const running = !!t.started; const tc = running ? M.client(s, t.client) : null;
    const nt = M.notesToday(s, u.id); const waitingN = nt.total - nt.done;
    const waitD = s.dictations.filter(d => d.staff === u.id && d.status === 'waiting');
    // the day so far, as rows (time, what, duration)
    const rows = (t.blocks || []).map(b => ({ at: b[0], time: clock12(b[0]).replace(/ [ap]m$/, ''), what: blockLabel(s, b).split(/[,+]/)[0].trim(), dur: dur(Math.max(0, mins(b[1]) - mins(b[0]))), flag: b[3] ? 'unconfirmed' : '' }));
    rows.sort((a, b) => a.at < b.at ? -1 : 1);
    // notes you have said, after the timer blocks
    for (const d of s.dictations.filter(d => d.staff === u.id && (d.at || '').slice(0, 10) === s.today).sort((a, b) => a.at < b.at ? -1 : 1)) {
      const at = d.at.slice(11, 16); const ini = M.client(s, d.client).initials;
      rows.push({ at, time: clock12(at).replace(/ [ap]m$/, ''), what: `${ini} note`, dur: d.status === 'waiting' ? 'ready' : 'in Lauris', flag: '' });
    }
    const label = pk && running && pk.id !== t.client ? 'Switch' : running ? 'Stop' : 'Start';
    return {
      hd: phoneHeader(hdWho(s, u)), nav: phoneNav(this.state.tab === 'students' ? 'students' : this.state.tab === 'me' ? 'me' : 'today', dueAssessments(s, u.id).length),
      isToday: this.state.tab === 'today', isStudents: this.state.tab === 'students', isMe: this.state.tab === 'me',
      running, timerCls: running ? ' run' : '', ini: running ? tc.initials : (pk?.initials || '—'), elapsed: running ? fmtElapsed(elapsedSec(s, t.started)) : '',
      timerBtn: label, timerAct: () => this.cardAction(), voiceOn: this.state.listening ? ' on' : '', voice: () => this.voice(),
      chips: st.map(c => ({ ini: c.initials, on: pk && c.id === pk.id ? ' on' : '', pressed: pk && c.id === pk.id ? 'true' : 'false', pick: () => this.setState({ pick: c.id }) })),
      micLabel: 'Say what happened', micHref: 'MobileDictate.dc.html' + (pk ? '?client=' + pk.id : ''), typeHref: 'MobileDictate.dc.html?type=1' + (pk ? '&client=' + pk.id : ''),
      notesChip: waitingN > 0 ? `${waitingN} note${waitingN === 1 ? '' : 's'} waiting` : 'Notes done', notesCls: waitingN > 0 ? 'y' : 'ok',
      rows: rows.slice(-6),
      students: st.map(c => {
        const on = running && t.client === c.id; const done = nt.doneSet.has(c.id); const ready = waitD.some(d => d.client === c.id);
        return { who: c.age ? `${c.initials}, ${c.age}` : c.initials, chip: done ? 'Note done' : ready ? 'Note ready' : 'Note waiting', cls: done ? 'ok' : ready ? 'n' : 'y', btn: on ? 'Stop' : 'Start', act: () => on ? this.stop() : this.startFor(c.id) };
      }),
      me: { name: u.name, role: [u.credential, M.school(s, u.sites?.[0]).name].filter(Boolean).join(' · '), notes: `${nt.done} of ${nt.total}`, out: () => this.signOut() }
    };
  }
  after() {
    const t = this.timer();
    if (t.started && this.state.tab === 'today') tick(this, () => { const el = document.getElementById('elapsed'); if (el) el.textContent = fmtElapsed(elapsedSec(this.s, this.timer().started)); });
    else clearInterval(this._tick);
  }
  cardAction() {
    const t = this.timer(); const pk = this.picked();
    if (t.started && (!pk || pk.id === t.client)) return this.stop();
    return this.startFor(pk?.id);
  }
  // the block ends where the timer on screen reads (start + elapsed), so a seeded start never gives a negative block
  async halt() {
    const u = this.user(); const t = this.timer(); if (!t.started) return;
    const end = Math.min(23 * 60 + 59, mins(t.started.slice(11, 16)) + Math.round(elapsedSec(this.s, t.started) / 60));
    await this.do('timer.stopAt', { staff: u.id, end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}` });
  }
  async stop() { const t = this.timer(); if (!t.started) return; await this.halt(); toast(`Stopped · ${M.client(this.s, t.client).initials} saved for the daily note`); }
  async startFor(id) {
    const u = this.user(); const t = this.timer(); if (!id) return;
    if (t.started && t.client === id) return toast(`Already timing ${M.client(this.s, id).initials}`);
    if (t.started) await this.halt();
    await this.do('timer.start', { staff: u.id, client: id });
    this.state.pick = id;
    toast(`Timing ${M.client(this.s, id).initials}`);
  }
  signOut() { session.signOut(); go('Login'); }
  // voice tagging: "I'm going to begin working with D.P." moves the timer to D.P.
  async tag(text) {
    const hit = voiceTag(text, myStudents(this.s, this.user().id));
    if (!hit) return toast('No student name heard', 'err');
    await this.startFor(hit.id);
  }
  example() {
    const t = this.timer(); const st = myStudents(this.s, this.user().id);
    const next = st.find(c => c.id !== t.client) || st[0]; if (!next) return;
    this.tag(`I'm going to begin working with ${next.initials}`);
  }
  voice() {
    const R = SR();
    if (this.state.listening) { try { this.rec?.stop(); } catch { } return; }
    if (!R) return toast('Voice is not available here', 'err');
    const rec = new R(); this.rec = rec; rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = ev => { const text = [...ev.results].map(r => r[0].transcript).join(' '); this.tag(text); };
    rec.onerror = ev => { if (!['no-speech', 'aborted'].includes(ev.error)) toast('Voice is not available here', 'err'); };
    rec.onend = () => { this.rec = null; this.setState({ listening: false }); };
    try { rec.start(); this.setState({ listening: true }); } catch { toast('Voice is not available here', 'err'); }
  }
  get css() { return C_CSS; }
  get anchors() { return {}; }
  set anchors(v) { }
});
