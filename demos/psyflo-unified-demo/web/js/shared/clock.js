// The demo clock (pure; used by the server, the app, the portals and the panel).
//
// One story clock for the whole demo. The date lives in the store (state.clock.date, mirrored in state.today for the
// many screens that read it) and moves only through the demo.advanceDay action, which advances Psyflo AND the mock
// Lauris together. The time of day is NOT the machine's wall clock and is never pinned silently: it starts at
// state.clock.anchor_time (09:00 at a reset or a day advance) and runs in real time from there, or is fixed
// (state.clock.fixed = 'HH:MM', set by the server with DEMO_TIME=HH:MM so tests are repeatable). The app can show it.
//
//   state.clock = { date:'2026-10-29', anchor_time:'09:00', anchor_wall:<ms>, fixed:null|'HH:MM', started:'2026-10-29' }
//
// today(s) -> 'YYYY-MM-DD'      now(s) -> 'YYYY-MM-DDTHH:MM'      nowFull(s) -> 'YYYY-MM-DDTHH:MM:SS'
import { addDays, isSchoolDay } from './dates.js';

// Presets start at 3:30 pm on the story date (after the seeded Oct 29 events: notes processed 3:11-3:19 pm, the 1:52 pm timer);
// a day advance starts the next school day at 9:00 am.
export const DEFAULT_TIME = '15:30';
export const DAY_START = '09:00';
const hm = t => { const [h, m] = String(t || DEFAULT_TIME).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const p2 = n => String(n).padStart(2, '0');

export function today(s) { return (s && s.clock && s.clock.date) || (s && s.today) || ''; }

function secondsOfDay(c, wall) {
  if (c && c.fixed) return hm(c.fixed) * 60;
  const base = hm(c && c.anchor_time) * 60;
  const elapsed = Math.max(0, Math.floor((wall - ((c && c.anchor_wall) || wall)) / 1000));
  return Math.min(23 * 3600 + 59 * 60 + 59, base + elapsed);
}
export function nowFull(s, wall = Date.now()) {
  const sec = secondsOfDay(s && s.clock, wall);
  return `${today(s)}T${p2(Math.floor(sec / 3600))}:${p2(Math.floor(sec / 60) % 60)}:${p2(sec % 60)}`;
}
export function now(s, wall = Date.now()) { return nowFull(s, wall).slice(0, 16); }

// the next day the clock should land on when a presenter presses "advance a day": the next school day (Mon-Fri) unless calendar:true
export function nextDay(date, { days = 1, calendar = false } = {}) {
  let d = date;
  for (let i = 0; i < Math.max(1, days); i++) {
    d = addDays(d, 1);
    if (!calendar) while (!isSchoolDay(d)) d = addDays(d, 1);
  }
  return d;
}

export function newClock(date, { time = DEFAULT_TIME, fixed = null, wall = Date.now() } = {}) {
  return { date, anchor_time: time, anchor_wall: wall, fixed: fixed || null, started: date };
}
// label for the UI: "Thu Oct 29 · 9:12 am (demo clock)"
export function label(s) { return `${today(s)} ${now(s).slice(11)}`; }
