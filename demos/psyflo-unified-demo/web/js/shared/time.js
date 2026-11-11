// Track Time model (E7). Pure ESM: the server (actions/x-time.js), the phone (MobileApp), the panel (views/time.js) and tests all read it,
// so there is ONE model of time. Nothing here reads the machine clock: the demo clock is passed in through the state (shared/clock.js).
//
// state.time_entries[] = { id, staff, client, date, start:'HH:MM', end:'HH:MM', minutes, paused_min, what, goal, kind, confirmed, status, dpn, source,
//                          corrected_from, superseded_by, reason, created_at, saved_at, by }
//   status     draft (the timer stopped; nothing described yet) | saved (a person described it) | voided (a person discarded a saved entry, reason kept)
//   kind       'direct' or one of the rule units.excluded_activity_types (idle or waiting, transport, documentation, ...)
//   confirmed  a person confirmed the entry as time worked with the student; an unconfirmed block is shown but never counted as direct
//   dpn        null | { key, linked_at, linked_by, note?, session? } link to the day's daily note; `note` is set only after the note was seen processed
//   source     timer | manual | seed
//   corrected_from / superseded_by    a correction appends a new version; the earlier one stays (never edited in place)
// state.timers[staffId] = { client, started:'YYYY-MM-DDTHH:MM:SS', paused_at, paused_sec, blocks }   the LIVE timer only (blocks mirror saved entries for older readers)
//
// FOUR SEPARATE FIGURES (prompt 9.4): recorded time, direct service time, documented time, potentially billable units. A running timer is none of them.
import { today as clockToday, nowFull } from './clock.js';
import { rule, ruleValue, unitsFor, unitBands, maxUnitsPerDay } from './rules.js';
import { mins, fmtDuration, clock12, fmtDate, daysBetween } from './dates.js';

export const FIGURES = [
  { key: 'recorded', label: 'Recorded', hint: 'Everything the timer captured, including time still to confirm. Not a unit count.' },
  { key: 'direct', label: 'Direct service', hint: 'Confirmed time with the student that counts as direct service.' },
  { key: 'documented', label: 'In the note', hint: 'What the daily note states, once it is processed in Lauris.' },
  { key: 'units', label: 'Potentially billable', hint: 'Units the rule gives for the direct time. Only a processed note and an authorization make a unit billable.' }
];

const p2 = n => String(n).padStart(2, '0');
export const hhmm = m => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;
export const isHHMM = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));
const secOf = iso => { const [d, t = '00:00:00'] = String(iso).split('T'); const [y, m, day] = d.split('-').map(Number); const [h, mi, ss = 0] = t.split(':').map(Number); return Date.UTC(y, m - 1, day, h || 0, mi || 0, ss || 0) / 1000; };
export const secondsBetween = (a, b) => secOf(b) - secOf(a);
export const fmtMin = m => (m == null ? '—' : m === 0 ? '0 min' : fmtDuration(Math.round(m)));
export const fmtElapsed = sec => { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, x = sec % 60; return h ? `${h}:${p2(m)}:${p2(x)}` : `${m}:${p2(x)}`; };
export const range12 = (a, b) => { const x = clock12(a), y = clock12(b); return (x.slice(-2) === y.slice(-2) ? x.slice(0, -3) : x) + '–' + y; };

// ---- the rule behind "direct service" and units ----
export function excludedKinds(s) {
  const v = ruleValue(s, 'units.excluded_activity_types', []);
  return Array.isArray(v) ? v : [];
}
export function kindOptions(s) {
  return [{ key: 'direct', label: 'Direct service' }].concat(excludedKinds(s).map(k => ({ key: k, label: 'Not direct · ' + k })));
}
export const kindLabel = (s, k) => (k === 'direct' || !k ? 'Direct service' : 'Not direct · ' + k);
export const unitRuleOf = s => rule(s, 'units.tdt.day_tiers');
export { unitsFor, unitBands, maxUnitsPerDay };
// words in an activity that the official rule may exclude (idle or waiting, transport, documentation, monitoring): an advisory prompt to check, never a decision
export const CHECK_WORDS = /\b(lunch|recess|transition|transitions|waiting|idle|transport|bus|documentation|paperwork)\b/i;
export const needsCheck = e => e.kind === 'direct' && CHECK_WORDS.test(e.what || '');

// ---- timers ----
// The live timer of a person at demo-clock time `at`. `stale` = it started on an earlier story day and was left running: its elapsed time is NOT guessed.
export function timerOf(s, staffId, at = nowFull(s)) {
  const t = s && s.timers && s.timers[staffId];
  if (!t || !t.started) return null;
  const date = t.started.slice(0, 10), stale = date !== at.slice(0, 10);
  const pausedNow = t.paused_at && !stale ? Math.max(0, secondsBetween(t.paused_at, at)) : 0;
  const pausedSec = (t.paused_sec || 0) + pausedNow;
  const elapsedSec = stale ? null : Math.max(0, secondsBetween(t.started, at) - pausedSec);
  return { client: t.client, started: t.started, date, start: t.started.slice(11, 16), what: t.what || '', stale, paused: !!t.paused_at, pausedSec, elapsedSec };
}

// ---- entries ----
export const live = e => e && e.status !== 'voided' && !e.superseded_by;
export function entriesOf(s, { client, staff, date, all = false } = {}) {
  return (s.time_entries || []).filter(e => (all || live(e)) && (!client || e.client === client) && (!staff || e.staff === staff) && (!date || e.date === date))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
const span = e => [mins(e.start), mins(e.end)];
// minutes covered by the union of the intervals (two entries for the same minutes never count twice), minus the pauses inside them
export function unionMinutes(list) {
  const iv = list.map(span).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0, cs = null, ce = null;
  for (const [a, b] of iv) { if (ce == null || a > ce) { if (ce != null) total += ce - cs; cs = a; ce = b; } else ce = Math.max(ce, b); }
  if (ce != null) total += ce - cs;
  return Math.max(0, total - list.reduce((n, e) => n + (+e.paused_min || 0), 0));
}
export function overlapsOf(e, list) { const [a, b] = span(e); return list.filter(o => o.id !== e.id && o.client === e.client && o.date === e.date && (() => { const [c, d] = span(o); return a < d && c < b; })()); }

// "3 h 40 min", "220 min", "3:40", "220" -> minutes (null when it cannot be read)
export function parseDirectMinutes(v) {
  const t = String(v ?? '').toLowerCase().trim(); if (!t) return null;
  let m = t.match(/(\d+)\s*h(?:ours?|r)?\s*(?:(\d+)\s*m)?/); if (m) return +m[1] * 60 + (+m[2] || 0);
  m = t.match(/^(\d+):(\d{2})$/); if (m) return +m[1] * 60 + +m[2];
  m = t.match(/(\d+)\s*(?:m|min)/); if (m) return +m[1];
  m = t.match(/^\d+$/); return m ? +t : null;
}
// the processed daily note for a student and day (processed only: notes are created from an observed Process Form)
export function dailyNote(s, client, date) { return (s.notes || []).filter(n => n.client === client && n.type === 'daily' && n.date === date).at(-1) || null; }
export function noteDirectMinutes(n) {
  if (!n) return null;
  if (n.direct_time_min != null) return +n.direct_time_min;
  return parseDirectMinutes(n.fields && n.fields['Direct time']);
}
export const dpnKey = (client, date) => `dpn|${client}|${date}`;

// Which entries does a processed note's "Contact time" box list? Matched by the clock times it prints (08:05 or 8:05 am, any dash). Evidence, not a guess.
export function entriesInNoteText(list, text) {
  const t = String(text || '').toLowerCase(); if (!t) return [];
  const pairs = []; const re = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/g; let m;
  while ((m = re.exec(t))) {
    let [, h1, m1, a1, h2, m2, a2] = m; a2 = a2 || a1; a1 = a1 || a2;
    const to24 = (h, ap) => { h = +h; if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; return h; };
    pairs.push(`${p2(to24(h1, a1))}:${m1}|${p2(to24(h2, a2))}:${m2}`);
  }
  return list.filter(e => pairs.includes(`${e.start}|${e.end}`));
}

// ---- the day's summary for one student: the four figures kept apart ----
export function timeSummary(s, clientId, date = clockToday(s), { staff } = {}) {
  const all = entriesOf(s, { client: clientId, date, staff });
  const direct = all.filter(e => e.status === 'saved' && e.confirmed && (e.kind || 'direct') === 'direct');
  const recorded = unionMinutes(all);
  const directMin = unionMinutes(direct);
  const note = dailyNote(s, clientId, date);
  const noteMin = noteDirectMinutes(note);
  const linked = direct.filter(e => e.dpn);
  const linkedMin = unionMinutes(linked);
  // documented time is what the PROCESSED note states; a link made before the note exists is only "ready", never "documented"
  const documented = note ? { minutes: noteMin, source: 'note', note: note.id, units: note.units != null ? +note.units : null } : { minutes: 0, source: 'none', note: null, units: null };
  const units = unitsFor(s, 'tdt', directMin);
  const unconfirmed = all.filter(e => !e.confirmed && e.status === 'saved');
  const drafts = all.filter(e => e.status === 'draft');
  const flags = [];
  if (drafts.length) flags.push({ key: 'drafts', tone: 'warning', text: `${drafts.length} stopped timer${drafts.length === 1 ? '' : 's'} to describe` });
  if (unconfirmed.length) flags.push({ key: 'unconfirmed', tone: 'warning', text: `${unconfirmed.length} block${unconfirmed.length === 1 ? '' : 's'} to confirm (${fmtMin(unionMinutes(unconfirmed))}, not counted)` });
  if (note && noteMin != null && noteMin !== directMin) flags.push({ key: 'mismatch', tone: 'danger', text: `The note states ${fmtMin(noteMin)}; saved direct time is ${fmtMin(directMin)}` });
  if (note && documented.units != null && documented.units > units) flags.push({ key: 'units', tone: 'danger', text: `The note states ${documented.units} unit${documented.units === 1 ? '' : 's'}; the rule gives ${units} for ${fmtMin(directMin)}` });
  const checks = all.filter(needsCheck);
  if (checks.length) flags.push({ key: 'check', tone: 'neutral', text: `${checks.length} block${checks.length === 1 ? '' : 's'} to check against the not-reimbursable list` });
  const overlap = all.filter(e => overlapsOf(e, all).length);
  if (overlap.length) flags.push({ key: 'overlap', tone: 'warning', text: 'Some entries overlap; shared minutes count once' });
  const unitRule = unitRuleOf(s);
  return { client: clientId, date, entries: all, recorded, direct: directMin, documented, linkedMinutes: linkedMin, linkedCount: linked.length,
    units, maxUnits: maxUnitsPerDay(s), bands: unitBands(s, 'tdt'), unitRule, flags, drafts, unconfirmed, checks, overlapIds: overlap.map(e => e.id), note: note ? note.id : null };
}

// legacy readers (the old DPN contact-time rows): [from, to, what, 'unconfirmed'?] for a student and day, saved entries only
export function blocksFor(s, client, date = clockToday(s), staff) {
  return entriesOf(s, { client, staff, date }).filter(e => e.status === 'saved').map(e => e.confirmed ? [e.start, e.end, e.what] : [e.start, e.end, e.what, 'unconfirmed']);
}

// ---- validation shared by the server and the forms ----
export function checkTimes(s, { date, start, end }, at = nowFull(s)) {
  if (!isHHMM(start) || !isHHMM(end)) return 'Use a time like 13:10 for start and end.';
  if (mins(end) <= mins(start)) return 'The end must be after the start.';
  if (!date) return 'Say which day it was.';
  if (date > at.slice(0, 10)) return 'That day has not happened yet on the demo clock.';
  if (date === at.slice(0, 10) && mins(end) > mins(at.slice(11, 16))) return `The end is after now on the demo clock (${clock12(at.slice(11, 16))}).`;
  return null;
}
export const minutesOf = (start, end, paused = 0) => Math.max(0, mins(end) - mins(start) - (+paused || 0));

// ---- the student the timer or a dictation is for: an identity card, never initials alone ----
export function identityCard(s, clientId) {
  const c = (s.clients || []).find(x => x.id === clientId); if (!c) return null;
  const sch = (s.schools || []).find(x => x.id === c.school);
  const short = sch ? sch.name.replace(' County', '').replace(' City', '').replace(' · ', ' ') : '';
  return { id: c.id, initials: c.initials, harvest_no: c.harvest_no || c.lauris_no || null, school: sch ? sch.name : '', schoolShort: short, grade: c.grade != null ? c.grade : null, age: c.age != null ? c.age : null,
    line: [c.initials, c.harvest_no ? `# ${c.harvest_no}` : '', short, c.grade != null ? `grade ${c.grade}` : ''].filter(Boolean).join(' · ') };
}
// a student the open page or a form named by Harvest # must match the card (no initials fallback); returns { ok, reason }
export function sameStudent(s, clientId, harvestNo) {
  const c = (s.clients || []).find(x => x.id === clientId); if (!c) return { ok: false, reason: 'Unknown student.' };
  if (harvestNo == null || harvestNo === '') return { ok: false, reason: 'No Harvest # was given, so the student cannot be confirmed.' };
  const n = Number(harvestNo);
  return n === c.harvest_no || n === c.lauris_no ? { ok: true } : { ok: false, reason: `Harvest # ${n} is not ${c.initials} (# ${c.harvest_no}).` };
}

// ---- microphone consent (phone dictation): one recorded answer per person per demo-clock day; typing needs none ----
export function micConsentOf(s, staffId, date = clockToday(s)) {
  const rows = (s.mic_consents || []).filter(c => c.staff === staffId && c.date === date);
  const last = rows.at(-1);
  return last ? { granted: !!last.granted, at: last.at, id: last.id } : { granted: false, at: null, id: null };
}
export const stalenessLabel = (s, t) => t && t.stale ? `Left running since ${fmtDate(t.date, { dow: true })} ${clock12(t.start)}` : '';
export const dayLabel = (s, date) => { const d = daysBetween(date, clockToday(s)); return d === 0 ? 'today' : fmtDate(date, { dow: true }); };
