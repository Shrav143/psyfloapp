// identity.js - who a phone dictation or a form is about, and the microphone answer (pure ESM: the browser, the phone and the server import it).
// (Replaces the identity half of the old shared/time.js; Track Time was removed on Nov 11, so the timer, time entries and unit-from-minutes figures are gone.)
//   identityCard(s, clientId)           the student as a card: initials, Harvest #, school, grade. Never initials alone.
//   sameStudent(s, clientId, harvestNo) a student the open page or a form named by Harvest # must match the card (no initials fallback)
//   micConsentOf(s, staffId, date)      the recorded microphone answer of a person for a demo-clock day (typing needs none)
import { today as clockToday } from './clock.js';

// ---- the student a dictation is for: an identity card, never initials alone ----
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
