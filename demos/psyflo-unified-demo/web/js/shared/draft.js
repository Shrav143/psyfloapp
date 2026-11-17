// draft(formType, sources) — the one place Psyflo writes text for a form.
// Returns { boxes: [{label, value, src:[n], note}], sources: [{n, kind, label, date, date_label}], checks: [{rule, pass, detail}], blank: [{label, why}] }.
// Every source carries `date`: the day of the record it names (yyyy-mm-dd, from the stored note, form, request or call), or the string 'undated'
// when that is truly unknown; `date_label` is what a chip prints ("Oct 16", or "Evidence missing — date unknown").
// Every box carries the numbered sources it came from (rule 7). The drafting rules are explicit checks,
// run on the output before the panel shows it (rules 1–14 in the brief), not hints in a prompt.
// The worked examples in seed/scripts are its tests (test/draft.test.mjs).
//
// Substance use treatment (IOP, ASAM Criteria). What is real logic here: the call extractors (substances, frequency, amount, route, last use
// resolved to a date, quit attempts, withdrawal history, prior treatment, who uses at home, medications, suicidal thoughts), the prompts that tick
// as answers are heard, and the authorization requests, which are written DIMENSION BY DIMENSION from the stored ASAM assessment (shared/asam.js:
// ratings, level check, change since the previous assessment, reassessment clock, step-down plan) plus the call and the record, each statement with
// its numbered source. What is templated: the "Illustrative sample" plan (isp), the incident sample and the weekly/collateral wording. Ratings and the
// level recommendation are the clinician's: Psyflo reads them, never drafts them. A derived level is "suggested", never "determined".
//
// This build is deterministic: extractors over the transcript/dictation and the record. A hosted LLM can
// sit behind the same function later; the checks below still gate whatever it returns.

import { fmtDate, fmtUS, daysBetween, addDays, dow } from './dates.js';
import { DIMS, ratingLabel, ratingOf, noteOf, ratingsOf, ratingsLine, complete, levelById, levelCheck, requestLevel, dueState, change, changeText, latestAssessment, priorAssessment } from './asam.js';
import { rule } from './rules.js';

// ---------------------------------------------------------------- the checks (rules 1–14)
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function datesIn(text) {
  const out = [];
  for (const m of text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.? (\d{1,2})(?:,? (\d{4}))?\b/g)) out.push({ mon: MONTHS[m[1].toLowerCase()], day: +m[2], year: m[3] ? +m[3] : null, raw: m[0] });
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) if (+m[1] <= 12) out.push({ mon: +m[1] - 1, day: +m[2], year: m[3] ? +m[3] : null, raw: m[0] });
  return out;
}
export const CHECKS = {
  recent(text, today, { evidence = true } = {}) { // rule 1
    if (!evidence) return { pass: true };
    const y = +today.slice(0, 4); const old = [];
    for (const d of datesIn(text)) {
      const iso = `${d.year || y}-${String(d.mon + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const age = daysBetween(iso, today);
      if (age > 30 && !d.year) old.push(d.raw);
    }
    return { pass: old.length === 0, detail: old.length ? 'Older than 30 days without a year label: ' + old.join(', ') : '' };
  },
  counts(text) { const m = text.match(/\d+(\.\d+)?\s?%|\bpercent\b/i); return { pass: !m, detail: m ? `Percentage found ("${m[0]}") — say "3 of 5"` : '' }; }, // rule 2
  noObserved(text) { const m = text.match(/\b(observed|monitored|watched)\b/i); return { pass: !m, detail: m ? `"${m[0]}" — say what staff did` : '' }; }, // rule 6
  fdi(rows) { // rule 3: frequency, duration, intensity for every behaviour marked Y (kept for the daily-note checks)
    const missing = rows.filter(r => r.yn === 'Y' && !(r.freq && r.dur && r.int)).map(r => r.name);
    return { pass: missing.length === 0, detail: missing.length ? 'Missing frequency/duration/intensity: ' + missing.join(', ') : '' };
  },
  substances(rows) { // rule 3 for substance use: frequency, amount and last use for every substance reported
    const used = rows.filter(r => r.used);
    const bad = used.map(r => ({ r, miss: [!r.freq && 'frequency', !r.amt && 'amount', !r.last && 'last use'].filter(Boolean) })).filter(x => x.miss.length);
    return { pass: used.length > 0 && bad.length === 0, detail: !used.length ? 'No substance reported yet — ask what, how often, how much, how and when last' : bad.length ? bad.map(x => `${x.r.name.split(' (')[0]}: no ${x.miss.join(', ')}`).join('; ') : used.map(r => r.name.split(' (')[0]).join(', ') };
  },
  interventionsFromList(text, list) { // rule 4
    const named = list.filter(i => text.toLowerCase().includes(i.name.toLowerCase()));
    return { pass: named.length > 0, detail: named.length ? named.map(i => i.name).join(', ') : 'No intervention from Harvest\'s list is named' };
  },
  objective(text) { const m = /\b(objective|obj\.|goal)\s*\d/i.test(text); return { pass: m, detail: m ? '' : 'No ISP objective named' }; }, // rule 5
  priorOutcome(rows) { // rule 7
    const bad = rows.filter(r => !r.outcome);
    return { pass: bad.length === 0, detail: bad.length ? bad.map(r => `${r.provider}: outcome unknown`).join('; ') : '' };
  }
};

export const UNDATED = 'undated';
const isoDay = d => { const m = String(d || '').match(/^\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; };
const src = (n, kind, label, date, extra = {}) => { const d = isoDay(date); return { n, kind, label, date: d || UNDATED, date_label: d ? fmtDate(d) : 'Evidence missing — date unknown', ...extra }; };
const MISSING = what => `Evidence missing — verify ${what}.`;
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const low = s => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);
const plural = (n, w) => `${n} ${w}${+n === 1 ? '' : 's'}`;
const familyWord = f => (String(f.family || '').split(' (')[0] || 'the family member').toLowerCase();

function result(boxes, sources, checks, blank = [], extra = {}) {
  // a box whose text is "Evidence missing — verify …" is a placeholder for the person to replace: flagged so it is never typed as if it were evidence
  return { boxes: boxes.filter(b => b.value).map(b => /^Evidence missing/.test(b.value) ? { ...b, missing: true } : b), sources, checks, blank, ...extra };
}

// A date as the drafting rules want it: "Oct 16" within 30 days, "Aug 12, 2026" beyond (rule 1).
const dl = (iso, today) => { const d = isoDay(iso); if (!d) return ''; return fmtDate(d, { year: !!today && daysBetween(d, today) > 30 }); };
// month-day dates inside a stored sentence that are older than 30 days get their year ("Sept 27" -> "Sept 27, 2026"): rule 1 allows an old date only with a year
export function yearLabel(text, today) {
  if (!text || !today) return String(text || '');
  const y = +today.slice(0, 4);
  return String(text).replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b(?!,? \d{4})(?!\d)/g, (m, mon, day) => {
    const mi = MONTHS[mon.toLowerCase()]; const mk = yr => `${yr}-${String(mi + 1).padStart(2, '0')}-${String(+day).padStart(2, '0')}`;
    let yr = y; if (mk(yr) > today) yr = y - 1;
    return daysBetween(mk(yr), today) > 30 ? `${m}, ${yr}` : m;
  });
}

// ---------------------------------------------------------------- Flow A · screening call
// Facts heard on the call. Each fact: test(text, raw, lines) → value or null. `text` is the transcript so far (lower case), `raw` the same with its case,
// `lines` the turns without the speaker label. Nothing is stated that the call did not say; a fact that was not heard is absent, never guessed.
const has = (t, re) => re.test(t);
const NUM = { a: 1, an: 1, one: 1, once: 1, two: 2, twice: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const nz = w => { const k = String(w == null ? '' : w).toLowerCase(); return NUM[k] != null ? NUM[k] : /^\d+(\.\d+)?$/.test(k) ? +k : null; };
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth', 'thirty-first'];
const ordinal = n => { const j = n % 10, k = n % 100; return n + (j === 1 && k !== 11 ? 'st' : j === 2 && k !== 12 ? 'nd' : j === 3 && k !== 13 ? 'rd' : 'th'); };
const dayOf = s => { const m = String(s).match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/); if (m && +m[1] >= 1 && +m[1] <= 31) return +m[1]; const w = ORD.findIndex(o => new RegExp('(^|[^a-z-])' + o + '($|[^a-z-])').test(String(s))); return w >= 0 ? w + 1 : null; };
const MONTH_RX = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)';
const MONTH_WORD = new RegExp('\\b' + MONTH_RX + '\\b', 'i');
const monShort = m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][MONTHS[String(m).toLowerCase().slice(0, 3)]];
const rangeOf = s => { const m = String(s).match(/\b(\w+) or (\w+)\b/); if (m && nz(m[1]) != null && nz(m[2]) != null) return `${nz(m[1])}–${nz(m[2])}`; const d = String(s).match(/\b(\d+)\s?(?:-|–|to)\s?(\d+)\b/); if (d) return `${d[1]}–${d[2]}`; const w = String(s).match(/\b(\w+) to (\w+)\b/); if (w && nz(w[1]) != null && nz(w[2]) != null) return `${nz(w[1])}–${nz(w[2])}`; const one = nz(String(s).trim()); return one != null ? String(one) : null; };

// the turns of the call without the speaker label ("JP: …" / "DR: …"); a microphone transcript has none and each recognised phrase is a turn
const turns = t => String(t || '').split('\n').map(x => x.replace(/^\s*[a-z]{1,3}:\s*/i, '').trim()).filter(Boolean);
const SUBST_RX = { c: /marijuana|cannabis|\bweed\b|\bpot\b|\bthc\b|edibles?/, n: /nicotine|cigarettes?|\bjuul\b|\bpods?\b/, a: /alcohol|\bbeer\b|vodka|liquor|\bwine\b|\bdrinking\b|\bdrinks\b|\bdrink\b/ };
// the part of the call about one substance: from its first mention to the next substance's mention (at most `max` turns)
function segment(lines, key, max = 6) {
  const lo = lines.map(x => x.toLowerCase()); const i0 = lo.findIndex(x => SUBST_RX[key].test(x)); if (i0 < 0) return '';
  let end = Math.min(lo.length, i0 + max);
  for (let i = i0 + 1; i < end; i++) if (Object.keys(SUBST_RX).some(k => k !== key && SUBST_RX[k].test(lo[i]))) { end = i; break; }
  return lo.slice(i0, end).join(' ');
}
const freqOf = s => {
  const perDay = s.match(/\b((?:\w+|\d+) or (?:\w+|\d+)|\d+\s?(?:-|–|to)\s?\d+|\w+) times? a day\b/); const pd = perDay ? rangeOf(perDay[1]) : (/\btwice a day\b/.test(s) ? '2' : null);
  const months = s.match(/\b(?:about |around |almost |over )?(\w+) months\b/); const mo = months && nz(months[1]) != null ? `${/(about|around|almost|over)\s+\w+ months/.test(s) ? 'about ' : ''}${nz(months[1])} months` : '';
  let base = '';
  if (/\bevery day\b|\bdaily\b|\beach day\b/.test(s)) base = 'Daily'; else if (/\bmost days\b/.test(s)) base = 'Most days';
  else { const w = s.match(/\b(\w+(?: or \w+)?) times a week\b/); if (w && rangeOf(w[1])) base = `${rangeOf(w[1])} times a week`; else if (/\bweekends?\b/.test(s)) base = 'Weekends'; else if (/\bat parties\b/.test(s)) base = 'At parties'; else if (/\bonce a week\b/.test(s)) base = 'Once a week'; }
  if (!base) return null;
  return `${base}${mo ? ' for ' + mo : ''}${pd ? ` (${pd} times a day)` : ''}`;
};
const UNIT = { gram: 'g', grams: 'g', g: 'g', ounce: 'oz', ounces: 'oz', eighth: 'eighth', eighths: 'eighth' };
const amtOf = s => {
  const m = s.match(/\b(about |around |maybe |roughly )?(a|an|one|two|three|four|five|six|seven|eight|\d+(?:\.\d+)?)(?:\s?(?:to|-|–)\s?(a|one|two|three|four|five|six|seven|eight|nine|ten|\d+))? (grams?|g|ounces?|eighths?|joints?|blunts?|pods?|cartridges?|drinks?|beers?|shots?|bottles?|cans?)(?: (?:a|per|each|every|on a) (day|week|weekend|night))?\b/);
  if (!m) return null;
  const a = nz(m[2]), b = m[3] ? nz(m[3]) : null; const n = b != null ? `${a}–${b}` : String(a); const u0 = m[4].replace(/s$/, ''); const u = UNIT[m[4]] || UNIT[u0] || (b != null || a !== 1 ? u0 + 's' : u0);
  return `${m[1] ? 'About ' : ''}${n} ${u}${m[5] ? ' a ' + m[5] : ''}`.replace(/^About about/i, 'About');
};
const routeOf = s => { const r = []; if (/\bsmok(e|es|ed|ing)\b/.test(s)) r.push('smoked'); if (/vape pen/.test(s)) r.push('vape pen'); else if (/\bvap(e|es|ed|ing)\b|cartridge|\bdabs?\b/.test(s)) r.push('vaped'); if (/edibles?|gummies/.test(s)) r.push('edibles'); if (/snort/.test(s)) r.push('snorted'); if (/\binject|\bshoot/.test(s)) r.push('injected'); return r.length ? cap(r.join('; ')) : null; };
// "last use" as said: a weekday and a day of the month, or a relative day. Kept as text; draftScreening turns it into a date from the call's day.
const lastOf = s => {
  const wd = s.match(/\b(mon|tues?|wednes|thurs?|fri|satur|sun)(?:day)?,? (?:the )?(\d{1,2}(?:st|nd|rd|th)?|[a-z]+(?:-[a-z]+)?)\b/);
  if (wd && dayOf(wd[2])) return `${cap(wd[1].slice(0, 3))} the ${ordinal(dayOf(wd[2]))}`;
  const rel = s.match(/\b(this morning|earlier today|today|tonight|yesterday|last night)\b/); if (rel) return rel[1] === 'earlier today' ? 'today' : rel[1];
  const md = s.match(new RegExp('\\b(?:on |last used |last )?' + MONTH_RX + '\\.? (\\d{1,2})(?:st|nd|rd|th)?\\b')); if (md && +md[2] <= 31) return `${monShort(md[1])} ${md[2]}`;
  return null;
};
// "Wed the 14th" + the day of the call -> { iso, text }. Text is "Oct 14 (Wed)"; a weekday that does not match the date is said, not hidden.
export function lastUseDate(raw, today) {
  const r = String(raw || ''); if (!r) return { iso: null, text: '' };
  if (!today) return { iso: null, text: cap(r) };
  const rel = /^(this morning|today|tonight)$/.test(r) ? 0 : /^(yesterday|last night)$/.test(r) ? 1 : null;
  if (rel != null) { const iso = addDays(today, -rel); return { iso, text: `${fmtDate(iso)} (${rel === 0 ? 'the day of the call' : 'the day before the call'})` }; }
  const m = r.match(/^([A-Z][a-z]{2}) the (\d+)(?:st|nd|rd|th)$/);
  const mon = r.match(/^([A-Z][a-z]{2}) (\d{1,2})$/);
  const day = m ? +m[2] : mon ? +mon[2] : null; if (!day) return { iso: null, text: cap(r) };
  const y = +today.slice(0, 4), mo = today.slice(5, 7); let iso = mon ? `${y}-${String(MONTHS[mon[1].toLowerCase()] + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${y}-${mo}-${String(day).padStart(2, '0')}`;
  if (iso > today) { const d = new Date(Date.parse(iso + 'T00:00Z')); d.setUTCMonth(d.getUTCMonth() - 1); iso = d.toISOString().slice(0, 10); }
  const said = m ? m[1] : null; const real = dow(iso);
  const shown = fmtDate(iso, { year: daysBetween(iso, today) > 30 });
  return { iso, text: said && said !== real ? `${shown} (said ${said}; ${real} on the calendar: check the date)` : `${shown}${said ? ' (' + said + ')' : ''}` };
}
const lastText = (raw, today) => lastUseDate(raw, today).text;

const substFacts = (key, lines) => {
  const s = segment(lines, key, key === 'c' ? 9 : 3); if (!s) return {};
  const o = {};
  const none = key === 'a' ? /\bno (alcohol|drinking)\b|haven'?t seen (him|her) drink|doesn'?t drink|never drinks/.test(s) : false;
  if (none) { o[key + '_none'] = 'None reported'; return o; }
  const f = freqOf(s), a = amtOf(s), r = key === 'a' ? null : routeOf(s), l = lastOf(s);
  if (f) o[key + '_freq'] = f; if (a) o[key + '_amt'] = a; if (r) o[key + '_route'] = r; if (l) o[key + '_last'] = l;
  return o;
};

export const SCREENING_FACTS = {
  consent: t => has(t, /record/) && has(t, /(that'?s fine|okay with you\?\s*(\w+:)?\s*(yes|ok|that)|sure)/) ? 'consent to record given' : null,
  family: t => { const m = t.match(/you(?:'|’)re (?:\w+'s )?(grandmother|grandfather|mother|father|aunt|uncle|stepmother|stepfather|sister|brother)\b/); if (!m) return null; return cap(m[1]) + (has(t, /legal custody|raised (him|her)/) ? ' (legal custody)' : ''); },
  c_freq: (t, r, L) => substFacts('c', L).c_freq || null, c_amt: (t, r, L) => substFacts('c', L).c_amt || null, c_route: (t, r, L) => substFacts('c', L).c_route || null, c_last: (t, r, L) => substFacts('c', L).c_last || null,
  n_freq: (t, r, L) => substFacts('n', L).n_freq || null, n_amt: (t, r, L) => substFacts('n', L).n_amt || null, n_route: (t, r, L) => substFacts('n', L).n_route || null, n_last: (t, r, L) => substFacts('n', L).n_last || null,
  a_none: (t, r, L) => substFacts('a', L).a_none || null,
  a_freq: (t, r, L) => substFacts('a', L).a_freq || null, a_amt: (t, r, L) => substFacts('a', L).a_amt || null, a_last: (t, r, L) => substFacts('a', L).a_last || null,
  o_none: t => has(t, /\bno pills\b|haven'?t found any pills|no other (drugs|substances)|nothing else\b|no opioids|no pills,? nothing/) ? 'None reported' : null,
  quit: (t, r, L) => {
    const i = L.findIndex(x => /cut(ting)? down|\bquit\b|\bstop(ped|ping)?\b.*\b(using|smoking|drinking|vaping)\b|tried to (stop|cut)/i.test(x)); if (i < 0) return null;
    const s = L.slice(i, i + 2).join(' ').toLowerCase(); const times = s.match(/\b(twice|once|two times|three times|four times|\d+ times)\b/); if (!times) return null;
    const n = /twice|two times/.test(times[1]) ? 2 : /once/.test(times[1]) ? 1 : nz(times[1].split(' ')[0]); const mons = [...s.matchAll(new RegExp('\\b' + MONTH_RX + '\\b', 'g'))].map(x => monShort(x[1]));
    const dur = s.match(/\b(a week at the most|under a week|less than a week|a few days|a day or two|\d+ weeks?)\b/);
    return `${cap(String(n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : n))} quit attempt${n === 1 ? '' : 's'}${mons.length ? ' (' + [...new Set(mons)].join(', ') + ')' : ''}${dur ? ', each ' + dur[1].replace(/^a week at the most$/, 'a week at most') : ''}`;
  },
  withdrawal: (t, r, L) => {
    const i = L.findIndex(x => /shak(ing|es)|sweat|withdraw|throwing up|vomit|goes without|trouble sleeping/i.test(x)); if (i < 0) return null;
    const s = L.slice(i, i + 2).join(' ').toLowerCase(); const yes = [], no = [];
    if (/irritab/.test(s)) yes.push('irritable'); if (/(don'?t|doesn'?t|can'?t|trouble|not) sleep|trouble sleeping|insomnia/.test(s.replace(/trouble sleeping\?/, ''))) yes.push('not sleeping');
    if (/\bno (shaking|tremor|seizure)/.test(s)) no.push('shaking'); if (/\bno (throwing up|vomiting|nausea)/.test(s)) no.push('vomiting'); if (/\bno seizure/.test(s)) no.push('seizures');
    const dur = s.match(/\bfor (a few days|a couple of days|\d+ days|a week)\b/);
    if (!yes.length && !no.length) return null;
    return `${yes.length ? cap(yes.join(' and ')) + (dur ? ' ' + dur[0] : '') + ' when stopping' : 'No withdrawal symptoms described'}${no.length ? '; no ' + no.join(' or ') : ''}`;
  },
  prior_provider: (t, raw) => {
    const re = /(?:Dr\.? ([A-Z][a-z]+) at )?((?:[A-Z][a-z']+ ){1,3}(?:Pediatrics|Counseling|Clinic|Center|Hospital|Associates|Services|Recovery|Health|Treatment))\b/g; let m;
    while ((m = re.exec(raw))) { if (/Harvest|Psyflo|Outreach/.test(m[2])) continue; return m[2].trim() + (m[1] ? ` (Dr. ${m[1]})` : ''); }
    return null;
  },
  prior_dates: (t, raw, L) => { const i = L.findIndex(x => /counseling|treatment|therapy|pediatric|visits?/i.test(x) && MONTH_WORD.test(x)); if (i < 0) return null; const s = L[i].toLowerCase(); const m = s.match(new RegExp('\\b' + MONTH_RX + '\\b(?: to \\b' + MONTH_RX + '\\b)?')); if (!m) return null; const rel = /\b(this past|last)\b/.test(s) ? `${/this past/.test(s) ? 'this past' : 'last'} ${m[1].toLowerCase().slice(0, 3) === 'jun' ? 'June' : cap(m[1])}` : ''; return `${monShort(m[1])}${m[2] ? '–' + monShort(m[2]) : ''}${rel ? ` (${rel} · confirm the year)` : ' (confirm the year)'}`; },
  prior_sessions: (t, raw, L) => { const i = L.findIndex(x => /pediatric|counseling|treatment|therapy/i.test(x) && /\b(visits|sessions|times|meetings)\b/i.test(x)); if (i < 0) return null; const m = L.slice(i, i + 2).join(' ').toLowerCase().match(/\b(\w+) (visits|sessions|times|meetings)\b/); return m && nz(m[1]) != null ? `${nz(m[1])} ${m[2] === 'times' ? 'sessions' : m[2]}` : null; },
  prior_ended: t => has(t, /(couldn'?t get (him|her) there|hours changed)/) ? 'ended (transportation)' : null,
  prior_outcome: (t, raw, L) => {
    const i = L.findIndex(x => /did it help/i.test(x)); const s = (i >= 0 ? L.slice(i, i + 2) : L.filter(x => /pediatric|counseling|treatment/i.test(x))).join(' ').toLowerCase();
    if (/not that i could see|didn'?t (change|help)|no (change|improvement)|kept using|still using|nothing changed/.test(s)) return 'no change in use';
    if (/\b(it helped|used less|cut back|stopped for)\b/.test(s)) return 'use went down while attending';
    return null;
  },
  current_service: (t, raw) => { const m = raw.match(/\b((?:Ms|Mr|Mrs|Dr)\.? [A-Z][a-z]+) sees (?:him|her) (once|twice|\w+ times) a week(?: since ([A-Z][a-z]+))?/); if (!m) return null; return `Weekly check-in with the counselor (${m[1]})${m[2] === 'once' ? '' : ', ' + m[2] + ' a week'}${m[3] ? ' since ' + m[3] : ''}`; },
  home_use: (t, raw, L) => {
    const i = L.findIndex(x => /anyone (else )?(in the home|at home|in the house)|anybody (else )?(in the home|at home|in the house)|(in the home|at home|in the house).*(drink|use|smoke)/i.test(x)); if (i < 0) return null;
    const s = L.slice(i, i + 2).join(' ').toLowerCase();
    if (/\b(no one|nobody)\b.{0,30}(drinks|uses|smokes)|\bno\b.{0,20}(i don'?t drink|nothing in the house)|i don'?t drink|nothing in the house/.test(s) && !/(brother|sister|cousin|stepfather|father|mother|uncle|dad|mom|stepmother).{0,40}(drinks|smokes|uses|vapes)/.test(s)) return `No one in the home uses${/nothing in the house/.test(s) ? '; none is kept in the house' : ''}`;
    const p = s.match(/\b(older |younger )?(brother|sister|cousin|stepfather|father|mother|uncle|dad|mom|stepmother)\b.{0,40}\b(drinks|smokes|uses|vapes)\b(?: (?:weed|cannabis|marijuana|alcohol))?/); return p ? cap(`${p[1] || ''}${p[2]} ${p[3]} in the home`.replace(/\bmom\b/, 'mother').replace(/\bdad\b/, 'father')) : null;
  },
  peers_use: (t, raw, L) => { const i = L.findIndex(x => /(friends?|buddies|peers).{0,50}(smoke|use|vape|drink)/i.test(x)); if (i < 0) return null; const s = L[i].toLowerCase(); const m = s.match(/\b(two|three|four|some|a few|several|his|her) (?:of (?:his|her) )?(friends|buddies|peers)\b[^.]{0,40}\b(smoke|use|vape|drink)s?\b(?: (every day|daily|on weekends))?/); if (!m) return null; return `${cap(m[1] === 'his' || m[1] === 'her' ? 'friends' : m[1] + ' ' + m[2])} who use${/every day|daily/.test(s) ? ' every day' : ''}${/after class|after practice|after work/.test(s) ? '; with them ' + s.match(/after (class|practice|work)/)[0] : ''}`; },
  medical: t => {
    if (!has(t, /(medicines?|medications?|meds)\b/) && !has(t, /medical (problems?|conditions?)/)) return null;
    const conds = ['asthma', 'diabetes', 'epilepsy', 'adhd', 'anemia', 'hepatitis'].filter(c => has(t, new RegExp('\\b' + c + '\\b'))); const meds = ['inhaler', 'insulin', 'adderall', 'ritalin', 'concerta', 'iron', 'sertraline'].filter(c => has(t, new RegExp('\\b' + c + '\\b')));
    const noMeds = has(t, /\bno (other )?(medicines?|medications?|meds)\b/); const noCond = has(t, /\bno medical (problems?|conditions?)\b|nothing medical/);
    if (!conds.length && !meds.length && !noMeds && !noCond) return null;
    return [meds.length ? cap(meds.join(', ')) : noMeds ? 'No current medications' : '', conds.length ? cap(conds.join(', ')) : noCond ? 'no medical conditions' : ''].filter(Boolean).join('; ');
  },
  mood: (t, raw, L) => {
    const i = L.findIndex(x => /\b(mood|sadness|worr(y|ies|ying)|anxious|anxiety|nervous)\b/i.test(x) && /\?/.test(x)); if (i < 0) return null;
    const s = L.slice(i + 1, i + 2).join(' ').toLowerCase(); const b = [];
    if (/worr(ies|y)/.test(s)) b.push('worries a lot'); if (/stomach/.test(s)) b.push('stomach pain when nervous'); if (/(not|isn'?t|no) sad/.test(s)) b.push('not sad'); else if (/\bsad\b|depress/.test(s)) b.push('sad'); if (/(doesn'?t|don'?t|can'?t|trouble|not) sleep/.test(s)) b.push('trouble sleeping');
    return b.length ? cap(b.join('; ')) : null;
  },
  safety: (t, raw, L) => {
    const i = L.findIndex(x => /(hurt(ing)? (himself|herself|themselves)|suicid|kill(ing)? (himself|herself)|not wanting to be here|end(ing)? (his|her) (own )?life|self[- ]harm)/i.test(x) && /\?/.test(x)); if (i < 0) return null;
    const a = L.slice(i + 1, i + 2).join(' ').toLowerCase(); if (!a) return null;
    return /^(no\b|never\b|not that i know)/.test(a) ? 'N' : /^(yes|he did|she did|once|a few times|he said|she said|he has|she has)/.test(a) ? 'Y' : null;
  },
  readiness: t => {
    const b = []; if (has(t, /agreed to come|willing to come|wants to come/)) b.push('Agreed to come'); const k = t.match(/wants to keep playing (\w+)/); if (k) b.push(`wants to keep playing ${k[1]}`);
    if (has(t, /(doesn'?t|does not) think (he|she) has to stop (everything|all|completely)|not sure (he|she) wants to stop/)) b.push('does not think they have to stop everything'); else if (has(t, /wants to (stop|quit|cut down)/)) b.push('wants to cut down or stop');
    return b.length ? b.join('; ').replace(/^./, c => c.toUpperCase()) : null;
  },
  strengths: t => { const s = []; for (const [rx, w] of [[/basketball/, 'Basketball'], [/drawing/, 'drawing'], [/soccer/, 'soccer'], [/music/, 'music'], [/football/, 'football']]) if (has(t, rx)) s.push(w); if (has(t, /honest with me/)) s.push('honest with the family member when asked'); if (has(t, /one on one with an adult/)) s.push('does well one-to-one with an adult'); if (has(t, /works hard|hard worker/)) s.push('works hard'); return s.length >= 2 ? s.join('; ') : null; },
  intake_time: t => { const m = t.match(/afternoons? after (\w+)/); if (!m) return null; const n = nz(m[1]); return `Afternoons after ${n != null ? n + ' pm' : m[1]}${has(t, /(i|we) can (drive|get (him|her) there|bring)/) ? '; the family member can bring them' : ''}`; }
};

export function screeningFacts(text) {
  const raw = String(text || '').replace(/[’]/g, "'"); const t = raw.toLowerCase(); const L = turns(raw);
  const f = {}; for (const [k, fn] of Object.entries(SCREENING_FACTS)) { const v = fn(t, raw, L); if (v) f[k] = v; }
  return f;
}

// the rows of the substances table, from the facts. `name` is the row name on the Lauris form (server/lauris/forms.js BEHAVIOURS); the last-use text is a date when the call's day is known.
export function substanceRows(f, today) {
  const row = (name, p) => ({ name, key: p, used: !!(f[p + '_freq'] || f[p + '_amt'] || f[p + '_route'] || f[p + '_last']), none: !!f[p + '_none'], freq: f[p + '_freq'] || '', amt: f[p + '_amt'] || '', route: f[p + '_route'] || '', last: f[p + '_last'] ? lastText(f[p + '_last'], today) : '', lastRaw: f[p + '_last'] || '' });
  return [row('Cannabis', 'c'), row('Alcohol', 'a'), row('Nicotine (vape or cigarettes)', 'n'), row('Other substances (pills, opioids, stimulants)', 'o')];
}
const lc = s => String(s).split(' (')[0].toLowerCase();

// "Before you hang up" prompts: what the ASAM assessment and the payer need, ticking as answers are heard
export function screeningPrompts(f, today) {
  const rows = substanceRows(f, today); const used = rows.filter(r => r.used);
  const P = (key, group, title, done, partial, text, ask, extra = {}) => ({ key, group, title, done: !!done, partial: !!partial && !done, text, ask: done ? '' : ask, ...extra });
  const G = 'ASAM needs evidence in all six dimensions';
  const useLine = r => `${lc(r.name)} ${[r.freq && low(r.freq), r.amt && low(r.amt)].filter(Boolean).join(', ')}${r.last ? ', last use ' + r.last : ''}`.trim();
  const d1 = used.length && used.every(r => r.last) && !!f.withdrawal;
  const d5 = used.length && used.every(r => r.freq && r.amt) && f.prior_provider && f.prior_outcome;
  const prior = f.prior_provider && f.prior_dates && f.prior_outcome;
  return [
    P('d1', G, 'Dimension 1 · intoxication and withdrawal', d1, used.length > 0 || f.withdrawal,
      d1 ? `Heard: ${used.map(useLine).join('; ')}. Withdrawal: ${low(f.withdrawal)}.` : used.length ? `Heard: ${used.map(useLine).join('; ')}. Still needs ${[!used.every(r => r.last) && 'the last use', !f.withdrawal && 'withdrawal history'].filter(Boolean).join(' and ')}.` : 'Not asked. Last use and withdrawal history set the level for Dimension 1.',
      !used.length ? '"What is the client using, how often, how much, how, and when was the last use?"' : !used.every(r => r.last) ? '"When did the client last use?"' : '"What happens when they go without: shaking, sweating, sickness, trouble sleeping?"'),
    P('d2', G, 'Dimension 2 · medical conditions', f.medical, false, f.medical ? `Heard: ${f.medical}.` : 'Not asked. Payers look for medical conditions and medications.', '"Any medical conditions or medications? Pregnancy, if it applies."'),
    P('d3', G, 'Dimension 3 · emotional and behavioral conditions', f.safety && f.mood, f.safety || f.mood,
      f.safety === 'Y' ? 'The family member reported thoughts of self-harm or suicide. This needs the clinician now: Psyflo does not draft it.' : f.safety && f.mood ? `Heard: ${low(f.mood)}; suicidal thoughts asked directly.` : f.safety ? 'Suicidal thoughts asked directly. Mood, sleep and worries not asked yet.' : f.mood ? `Heard: ${low(f.mood)}. Suicidal thoughts not asked yet.` : 'Not asked. A co-occurring condition not documented is a common reason to deny.',
      !f.safety ? '"Has the client ever said anything about hurting themselves or not wanting to be here?"' : '"How has their mood been: worries, sadness, sleep?"', { alert: f.safety === 'Y' }),
    P('d4', G, 'Dimension 4 · readiness to change', f.readiness, false, f.readiness ? `Heard: ${low(f.readiness)}.` : 'Not asked. The client\'s own goal is the evidence for this dimension.', '"How does the client feel about coming in? Do they want to cut down or stop?"'),
    P('d5', G, 'Dimension 5 · relapse and continued use', d5, used.length || f.prior_provider || f.quit,
      d5 ? `Heard: ${used.map(useLine).join('; ')}.${f.quit ? ' ' + f.quit + '.' : ''} Prior treatment: ${f.prior_provider}, ${f.prior_outcome}.` : `${used.length ? 'Heard ' + used.map(useLine).join('; ') + '. ' : ''}Still needs ${[!used.length && 'what, how often and how much', used.length && !used.every(r => r.amt) && 'the amount', !f.prior_provider && 'prior treatment', f.prior_provider && !f.prior_outcome && 'whether prior treatment helped'].filter(Boolean).join(' and ') || 'nothing more'}.`,
      !used.length ? '"What is the client using, how often and how much?"' : !f.prior_provider ? '"Has the client had counseling or treatment before? Who, when, and did it help?"' : !f.prior_outcome ? '"Did it help while the client was going?"' : '"How much, and how often?"'),
    P('d6', G, 'Dimension 6 · recovery environment', f.home_use, f.peers_use, f.home_use ? `Heard: ${low(f.home_use)}${f.peers_use ? '; ' + low(f.peers_use) : ''}.` : f.peers_use ? `Heard: ${low(f.peers_use)}. Who uses in the home not asked yet.` : 'Not asked. Who uses in the home is the evidence for this dimension.', '"Does anyone at home drink or use? Who are the client\'s friends after class?"'),
    P('prior', 'Prior treatment', 'Prior treatment: provider, dates and outcome', prior, f.prior_provider,
      prior ? `Heard: ${f.prior_provider}, ${f.prior_dates}${f.prior_sessions ? ', ' + f.prior_sessions : ''}; ${f.prior_outcome}.` : f.prior_provider ? `${f.prior_provider} named — still need ${[!f.prior_dates && 'dates', !f.prior_outcome && 'whether it helped'].filter(Boolean).join(' and ')}.` : '"Counseling a while ago" will be read by the payer as no prior treatment. A current weekly check-in is care coordination and does not count as a service that failed.',
      f.prior_provider ? '"Did it help while the client was going? When did it end and why?"' : 'Ask: who, when, how often, and whether it helped.'),
    P('sh', 'Safety', 'Suicidal thoughts asked directly', f.safety, false, f.safety ? `Asked directly; ${f.safety === 'N' ? familyWord(f) + ' says no' : 'a concern was reported'}.` : 'Ask directly and put the answer on record.', '"Has the client ever said anything about hurting themselves?"', { alert: f.safety === 'Y' }),
    P('access', 'Level of care', 'Schedule and transport for the level of care', f.intake_time, false, f.intake_time ? `Heard: ${low(f.intake_time)}.` : 'Level 2.1 means several groups a week. A family that cannot bring the client is a barrier a payer will read.', '"Could you bring the client three afternoons a week? What times work?"')
  ];
}

export function draftScreening({ transcript, today, guardianPhone = '', referral, pre = {} }) {
  const f = screeningFacts(transcript);
  const S = [
    src(1, 'call', 'Screening call · recorded with consent', today),
    src(2, 'referral', 'Referral form' + (referral?.id ? ' · ' + referral.id : ''), referral?.received)
  ];
  const rows = substanceRows(f, today);
  const boxes = [];
  if (f.family) boxes.push({ label: 'Family member on the call', value: f.family + (guardianPhone ? ' · ' + guardianPhone : ''), src: [1] });
  // the substances table: one box per cell the call answered (the row's name is on the Lauris form)
  for (const r of rows) {
    const cells = r.none ? { Frequency: 'None reported' } : { Frequency: r.freq, Amount: r.amt, Route: r.route, 'Last use': r.last };
    for (const [col, v] of Object.entries(cells)) if (v) boxes.push({ label: `${r.name} — ${col}`, value: v, src: [1], row: r.name });
  }
  // prior treatment (rule 7): provider · dates · outcome; an empty outcome blocks and asks
  const priorRows = []; let priorText = '';
  if (f.prior_provider) {
    priorRows.push({ provider: f.prior_provider, outcome: f.prior_outcome });
    if (f.prior_outcome) priorText = `${f.prior_provider}, ${[f.prior_dates, f.prior_sessions, f.prior_ended].filter(Boolean).join(', ')}; ${f.prior_outcome}`;
  }
  if (f.prior_provider && f.prior_outcome) boxes.push({ label: 'Prior treatment (provider · dates · outcome)', value: priorText, src: [1, 2] });
  // only what was said on the call: a current weekly check-in is care coordination, never the prior treatment that failed
  if (f.current_service) boxes.push({ label: 'Current services to date', value: f.current_service, src: [1, 2] });
  const qr = [f.quit, f.readiness].filter(Boolean).map(x => x.replace(/\.$/, '')); if (qr.length) boxes.push({ label: 'Quit attempts and readiness to change', value: qr.join('. ') + '.', src: [1] });
  if (f.withdrawal) boxes.push({ label: 'Withdrawal history', value: f.withdrawal, src: [1] });
  if (f.home_use) boxes.push({ label: 'Family substance use in the home', value: f.home_use, src: [1] });
  if (f.medical) boxes.push({ label: 'Medical · medications', value: f.medical, src: [1] });
  if (f.mood) boxes.push({ label: 'Mood and anxiety symptoms', value: f.mood, src: [1] });
  if (f.safety === 'N') boxes.push({ label: 'Suicidal thoughts and safety', value: `Asked directly; ${familyWord(f)} says no`, src: [1] });
  if (f.safety === 'Y') boxes.push({ label: 'Suicidal thoughts and safety', value: `Reported on the call by the ${familyWord(f)}: needs the clinician now`, src: [1] });
  if (f.strengths) boxes.push({ label: 'Strengths', value: f.strengths, src: [1] });
  // narrative: one paragraph from the boxes above, no new facts (every sentence reuses a box's own words)
  const nar = [];
  if (f.family) nar.push(`Screening call with the ${low(f.family)}.`);
  for (const r of rows.filter(x => x.used)) nar.push(`${r.name.split(' (')[0]}: ${[r.freq && low(r.freq), r.amt && low(r.amt), r.route && low(r.route), r.last && 'last use ' + r.last].filter(Boolean).join(', ')}.`);
  if (rows.some(r => r.used) && (rows[1].none || rows[3].none)) nar.push(`${[rows[1].none && 'alcohol', rows[3].none && 'other substances'].filter(Boolean).map(cap).join(' and ')}: none reported.`);
  if (qr.length) nar.push(`${qr.join('. ')}.`);
  if (f.withdrawal) nar.push(`Withdrawal history: ${low(f.withdrawal)}.`);
  if (f.prior_provider && f.prior_outcome) nar.push(`Prior treatment: ${priorText}.`);
  if (f.current_service) nar.push(`${f.current_service}.`);
  if (f.home_use) nar.push(`${f.home_use}${f.peers_use ? '; ' + low(f.peers_use) : ''}.`); else if (f.peers_use) nar.push(`${f.peers_use}.`);
  if (f.medical) nar.push(`${f.medical}.`);
  if (f.mood) nar.push(`Mood: ${low(f.mood)}.`);
  if (f.safety === 'N') nar.push(`Suicidal thoughts asked directly; ${familyWord(f)} says no.`);
  if (f.strengths) nar.push(`Strengths: ${low(f.strengths)}.`);
  if (nar.length >= 3) boxes.push({ label: 'Narrative summary', value: nar.join(' ').replace(/\s+/g, ' ').replace(/ \./g, '.').replace(/\.\./g, '.'), src: [1, 2], last: true });

  const blank = [{ label: 'Meets admission criteria?', why: 'The clinician decides — Psyflo never drafts the admission decision.' }, { label: 'Preliminary diagnosis', why: 'The clinician decides.' }];
  const allText = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Substances: frequency, amount and last use', ...CHECKS.substances(rows) },
    { rule: 'Counts, never percentages', ...CHECKS.counts(allText) },
    { rule: 'Dates within 30 days, or labelled with a year', ...CHECKS.recent(allText, today || '2000-01-01', { evidence: !!today }) },
    { rule: 'Prior treatment carries provider, dates and outcome', ...(priorRows.length ? CHECKS.priorOutcome(priorRows) : { pass: false, detail: 'No prior treatment with an outcome yet — ask: "Did it help? When did it end and why?"' }) },
    { rule: 'A current check-in stays under current services, not the treatment that failed', pass: !(f.current_service && priorText && priorText.includes(f.current_service)), detail: f.current_service ? 'Listed apart from the prior treatment' : 'No current service heard' },
    { rule: 'Suicidal thoughts asked directly', pass: !!f.safety, detail: f.safety === 'Y' ? 'A concern was reported: the clinician acts now' : f.safety ? '' : 'Not asked on the call: ask directly and record the answer' },
    { rule: 'Decision and diagnosis left to the clinician', pass: true, detail: '' },
    { rule: 'Nothing invented · every box traces to the call or the referral', pass: boxes.length > 0 && boxes.every(b => b.src?.length), applicable: boxes.length > 0, detail: boxes.length ? '' : 'Not applicable: no box could be drafted from this call' }
  ];
  return result(boxes, S, checks, blank, { facts: f, prompts: screeningPrompts(f, today), priorRows, substances: rows });
}

// ---------------------------------------------------------------- Flow B · dictation → group note
// FACTS ONLY. The draft is the staffer's own words, tidied; nothing is added. No keyword template, no invented times, events or outcomes,
// no objective or intervention inserted for the staffer. What the words do not say becomes a QUESTION (and the box stays blank / "Not stated").
// "Observed", "watched", "monitored" are flagged and the staffer is asked what they did; the verb is never substituted.
// Group notes also carry a craving rating (0 to 10) and any screen result: read from the words when said, asked when not.
export function enhanceDictation({ text, client, goals = [], interventions = [], recent = [], today, flagTerms = ['observed', 'monitored', 'watched'] }) {
  const raw = String(text || '').trim(); const t = raw.toLowerCase();
  const ini = client?.initials || 'the client';
  const questions = []; const fixed = []; let chips = []; let objective = null; let ivs = [];
  const tidy = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\s+/g, ' ').replace(/([^.!?])$/, '$1.') : '';
  const narrative = tidy; const phone = tidy;
  // craving rating and screen result, only as the staffer said them
  const cm = t.match(/\bcravings?\b[^.,;]{0,30}?\b(\d{1,2})\b(?:\s*(?:of|out of|\/)\s*10)?/); const craving = cm && +cm[1] <= 10 ? +cm[1] : null;
  const sm = t.match(/\b(?:(?:urine|uds|drug|breath|alcohol|saliva)\s+)?(?:screen|uds|test)\b[^.,;]{0,25}?\b(negative|positive|clean|refused)\b/) || t.match(/\b(negative|positive)\b[^.,;]{0,15}\b(?:screen|uds|urine)\b/); const screen = sm ? (sm[1] === 'clean' ? 'negative' : sm[1]) : null;
  const mentionsUse = /\b(used|drank|drinking|high|lapse|relapse|slipped|got drunk|smoked|vaped|took)\b/.test(t) && !/\b(refusal|refuse|resist)\w*\b.{0,30}\b(use|drink)/.test(t) && !/\b(no use|didn'?t use|did not use|hasn'?t used)\b/.test(t);
  if (raw) {
    // the staffer named an objective: use it (never choose one for them)
    const om = t.match(/\b(?:objective|obj\.?|goal)\s*(\d)\b/);
    if (om) { objective = +om[1]; chips.push({ text: `objective ${objective}`, from: 'you named it' }); }
    else questions.push({ q: 'Which ISP objective did this address?', options: goals.map(g => `Objective ${g.n} · ${g.name || g.objective || ''}`) });
    // interventions the staffer named from Harvest's list
    ivs = interventions.filter(i => i.name && t.includes(i.name.toLowerCase())).map(i => i.code || i.name);
    if (ivs.length) chips.push({ text: ivs.join(', '), from: 'you named them' });
    else questions.push({ q: 'What did you do (which intervention from the ISP list)?' });
    // how long: from the words (Psyflo does not time sessions; the contact time is typed in Lauris)
    const said = t.match(/(\d+)\s*(min|minutes)\b/);
    if (said) chips.push({ text: `${said[1]} min`, from: 'you said it' });
    else questions.push({ q: 'How long was it?' });
    if (craving != null) chips.push({ text: `craving ${craving} of 10`, from: 'you said it' }); else questions.push({ q: `What was ${ini}'s craving rating today (0 to 10)?` });
    if (screen) chips.push({ text: `screen ${screen}`, from: 'you said it' });
    if (mentionsUse) questions.push({ q: `You mention use or a lapse. What did you do about it with ${ini} (who was told, what changed in the plan)?`, flag: 'use' });
    chips.push({ text: 'your words', from: 'from what you said' });
    // flagged words: ask, never rewrite
    for (const w of flagTerms) if (new RegExp('\\b' + w + '\\b', 'i').test(raw)) questions.push({ q: `You wrote "${w}". What did you do with ${ini}?`, flag: w });
  }
  const all = narrative;
  const flagged = flagTerms.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(raw));
  // sentences repeated from the author's recent notes (shown to the author; never auto-rewritten)
  const sents = x => String(x || '').split(/(?<=[.!?])\s+/).map(z => z.trim().toLowerCase()).filter(z => z.length > 25);
  const seen = new Set(recent.flatMap(sents)); const repeated = sents(all).filter(z => seen.has(z));
  const checks = [
    { rule: 'Intervention on the ISP list, with why it was used', pass: ivs.length > 0, detail: ivs.length ? ivs.join(', ') : 'Not stated: say what you did' },
    { rule: 'Linked to an ISP objective; progress as a count, not a percentage', pass: objective != null && CHECKS.counts(all).pass, detail: objective != null ? '' : 'Not stated: pick the objective' },
    { rule: 'Duration or a count present (minutes, "3 of 5")', pass: /\d+\s?(min|minutes)/.test(all) || /\d+ of \d+/.test(all), detail: 'Not stated: how long, how often' },
    { rule: 'Craving rating (0 to 10) stated; a screen result when one was done', pass: craving != null, detail: craving != null ? `craving ${craving} of 10${screen ? ', screen ' + screen : ''}` : 'Not stated: the craving rating, 0 to 10' },
    { rule: 'No "observed"', pass: flagged.length === 0, fixed: '', detail: flagged.length ? `"${flagged.join('", "')}" — say what you did (not changed for you)` : '' },
    { rule: 'Language varies from your last notes', pass: repeated.length === 0, detail: repeated.length ? `Repeated from a recent note: "${repeated[0].slice(0, 60)}…"` : '' }
  ];
  return { spoken: raw, phone, narrative, chips, checks, objective, interventions: ivs, craving, screen, mood: '', progress: '', fixed, questions, flagged, repeated };
}

// ---------------------------------------------------------------- the ASAM request, dimension by dimension
// asamSources(state, clientId) -> what the draft functions take besides the call and the record: the latest assessment, the one before, the rules table.
export const asamSources = (s, clientId) => ({ asam: latestAssessment(s, clientId), asamPrev: priorAssessment(s, clientId), rules: (s && s.rules) || [] });

// the Lauris labels of the six dimension boxes (server/lauris/forms.js DIM_LABELS carries the same text; test/draft.test.mjs checks they agree)
export const DIM_BOX = [
  'Dimension 1 — acute intoxication and/or withdrawal potential',
  'Dimension 2 — biomedical conditions and complications',
  'Dimension 3 — emotional, behavioral, or cognitive conditions',
  'Dimension 4 — readiness to change',
  'Dimension 5 — relapse, continued use, or continued problem potential',
  'Dimension 6 — recovery/living environment'
];

// what the call said that bears on each dimension (only what was said; the label of the call's day is the call's own date)
function callLines(f, rows, when, today) {
  if (!f || !Object.keys(f).length) return [[], [], [], [], [], []];
  const used = rows.filter(r => r.used); const at = when ? `At the screening call (${dl(when, today)})` : 'At the screening call';
  const fam = familyWord(f);
  const d1 = [...used.filter(r => r.last).map(r => `${lc(r.name)} last used ${r.last}`), f.withdrawal ? `withdrawal history: ${low(f.withdrawal)}` : ''].filter(Boolean);
  const d3 = [f.mood ? `mood: ${low(f.mood)}` : '', f.safety === 'N' ? `suicidal thoughts denied when asked directly (${fam})` : f.safety === 'Y' ? 'a concern about suicidal thoughts was reported' : ''].filter(Boolean);
  const d5 = [...used.filter(r => r.freq || r.amt).map(r => `${lc(r.name)} ${[r.freq && low(r.freq), r.amt && low(r.amt), r.route && low(r.route)].filter(Boolean).join(', ')}`), f.quit ? low(f.quit) : '', f.prior_provider && f.prior_outcome ? `prior treatment: ${f.prior_provider}, ${f.prior_dates || 'dates not given'}, ${f.prior_outcome}` : ''].filter(Boolean);
  const d6 = [f.home_use ? low(f.home_use) : '', f.peers_use ? low(f.peers_use) : '', f.intake_time ? `schedule: ${low(f.intake_time)}` : ''].filter(Boolean);
  const mk = (bits, lead) => bits.length ? [`${lead || at} ${fam} reported: ${bits.join('; ')}.`] : [];
  return [mk(d1), f.medical ? [`${at} ${fam} reported: ${low(f.medical)}.`] : [], mk(d3), f.readiness ? [`${at} ${fam} reported: ${low(f.readiness)}.`] : [], mk(d5), mk(d6)];
}

// last use on record, read from the dimension notes of an assessment ("No alcohol since Sept 27", "Last cannabis use Oct 14"): { iso, text } or null
export function lastUseOn(a, today) {
  if (!a) return null; const y = +String(a.date).slice(0, 4); const out = [];
  for (const n of [1, 5]) for (const m of String(noteOf(a, n)).matchAll(/(?:\bsince|[Ll]ast (?:\w+ )?(?:use|drink)|[Ll]apse (?:on )?)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b/g)) {
    let iso = `${y}-${String(MONTHS[m[1].toLowerCase()] + 1).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`; if (iso > String(a.date).slice(0, 10)) iso = `${y - 1}${iso.slice(4)}`; out.push({ iso, from: n });
  }
  if (!out.length) return null; out.sort((x, y2) => y2.iso.localeCompare(x.iso)); const last = out[0];
  return { iso: last.iso, from: last.from, days: today ? daysBetween(last.iso, today) : null, text: dl(last.iso, today) };
}
// the step-down plan on an assessment, read against the ratings and the stored notes: criteria it can evaluate, and the plan as written
export function stepDown(a, today) {
  const plan = a && a.plan ? String(a.plan) : ''; if (!plan) return null;
  const criteria = [];
  const m1 = plan.match(/D(\d)\s*(?:is|at)?\s*(\d)\s*or\s*(?:lower|less|below)/i);
  if (m1) { const n = +m1[1], max = +m1[2], now = ratingOf(a, n); criteria.push({ kind: 'rating', n, max, now, met: now != null ? now <= max : null, text: `D${n} at ${max} or lower`, now_text: now != null ? `D${n} is ${now}` : `D${n} is not rated` }); }
  const m2 = plan.match(/no use for (\d+) days/i);
  if (m2) { const days = +m2[1]; const last = lastUseOn(a, today); criteria.push({ kind: 'no_use', days, last, met: last && last.days != null ? last.days >= days : null, text: `no use for ${days} days`, now_text: last ? `last use on record ${last.text}${last.days != null ? `, ${plural(last.days, 'day')} before today` : ''}` : 'no last-use date on record' }); }
  const lvl = plan.match(/Level (\d(?:\.\d)?)/i);
  return { plan, criteria, toLevel: lvl ? lvl[1] : null, met: criteria.length ? criteria.every(c => c.met === true) : null };
}

// asamBoxes: the dimension boxes, the level-of-care box and the reassessment/step-down box, with their checks and the items left for the clinician.
// Used by the initial request (mode 'initial') and the continued-stay request (mode 'continued'); exported so the continued-stay builder can reuse it.
//   a, prev          the latest assessment and the one before (shared/asam.js, from state.asam_assessments)
//   facts, callWhen  the screening call's facts and its date (initial request)
//   partner          the referral partner's counts (recovery environment)
//   request          the request being drafted (its asam_level is the level asked for)
//   n                the source numbers of this draft: { call, partner, a, prev }
export function asamBoxes({ a, prev, facts = null, callWhen = null, partner = null, request = null, today, rules = [], mode = 'initial', n = {} }) {
  const S = { rules }; const level = request ? requestLevel(request) : null; const lcheck = levelCheck(a, level); const due = dueState(S, a, level, today);
  const ch = a && prev ? change(prev, a) : null; const rows = substanceRows(facts || {}, callWhen && isoDay(callWhen) || today);
  const calls = callLines(facts, rows, callWhen, today);
  const aDate = a ? dl(a.date, today) : ''; const pDate = prev ? dl(prev.date, today) : '';
  const kind = a && a.kind === 'reassessment' ? 'reassessment' : 'assessment';
  const dims = DIMS.map(d => {
    const r = ratingOf(a, d.n); const label = DIM_BOX[d.n - 1];
    if (!a) return { label, value: MISSING(`the Dimension ${d.n} rating and its evidence (no ASAM assessment is on file)`), src: [n.a], short: `D${d.n} · ${d.label}`, dim: d.n };
    if (r == null) return { label, value: MISSING(`the Dimension ${d.n} rating (the ${aDate} assessment leaves it blank)`), src: [n.a], short: `D${d.n} · ${d.label}`, dim: d.n };
    const pr = ratingOf(prev, d.n); const dl2 = ch && ch[d.n - 1] ? ch[d.n - 1].delta : null;
    const from = mode === 'continued' && pr != null ? (dl2 < 0 ? `, down from ${pr} on ${pDate}` : dl2 > 0 ? `, up from ${pr} on ${pDate}` : `, unchanged from ${pr} on ${pDate}`) : '';
    const note = yearLabel(noteOf(a, d.n), today); const parts = [`Rated ${r} (${ratingLabel(r).toLowerCase()}) at the ${aDate} ${kind}${from}.`, note ? (/[.!?]$/.test(note) ? note : note + '.') : 'No note is recorded for this dimension.'];
    const cl = (calls[d.n - 1] || []); const sources = [n.a]; if (mode === 'continued' && from) sources.push(n.prev);
    if (cl.length && mode === 'initial') { parts.push(...cl); sources.push(n.call); }
    if (d.n === 6 && partner && mode === 'initial') {
      const bits = []; if (partner.incident_dates && partner.incident_dates.length) bits.push(`${plural(partner.incident_dates.length, 'dated incident')} (${partner.incident_dates.map(x => dl(x, today)).join(', ')})`);
      if (partner.unexcused_absences != null) bits.push(`unexcused absences: ${partner.unexcused_absences}`); if (partner.iss_days_6mo != null) bits.push(`ISS past 6 months: ${plural(partner.iss_days_6mo, 'day')}`); if (partner.oss_days_6mo != null) bits.push(`OSS: ${plural(partner.oss_days_6mo, 'day')}`);
      if (partner.classes != null && partner.passing != null) bits.push(`${partner.passing} of ${partner.classes} classes passing`);
      if (bits.length) { parts.push(`The referral partner reports${partner.reported ? ' (' + dl(partner.reported, today) + ')' : ''}: ${bits.join('; ')}.`); sources.push(n.partner); }
    }
    return { label, value: parts.join(' '), src: [...new Set(sources.filter(Boolean))], short: `D${d.n} · ${d.label}`, dim: d.n, rating: r };
  });
  // level of care: what is asked, the lowest level the ratings fit, and (when asked above it) a blank for the clinician's reason
  const req = levelById(level); const lowest = lcheck.lowest ? levelById(lcheck.lowest) : null;
  let lvl;
  if (!a || lcheck.state === 'none' && !complete(a)) lvl = MISSING(!a ? 'the level of care (no ASAM assessment is on file)' : `the level of care (the ${aDate} assessment is not fully rated)`);
  else if (!req) lvl = MISSING('the ASAM level of care requested (the request names none)');
  else {
    const rec = a.level_recommended ? ` The clinician's recommendation on the assessment is Level ${a.level_recommended}${String(a.level_recommended) === req.id ? '' : ', not the level requested'}.` : '';
    lvl = `Level ${req.id} (${req.name.toLowerCase()}) is requested. On the ${aDate} ${kind} (${ratingsLine(a)}) the lowest level that fits every rating is Level ${lowest.id}, suggested by the demo decision rule: the ratings and the level recommendation are the clinician's. ${lcheck.headline}. ${lcheck.detail}${rec}`;
  }
  const lvlBox = { label: 'Level of care', value: lvl, src: [n.a], short: 'Level of care' };
  // reassessment clock, change since the previous assessment, step-down plan
  let planBox = null; const sd = stepDown(a, today);
  if (mode === 'continued') {
    if (!a) planBox = { label: 'Reassessment and step-down plan', value: MISSING('the reassessment and the step-down plan (no ASAM assessment is on file)'), src: [n.a], short: 'Reassessment and step-down plan' };
    else {
      const rr = rule(S, 'asam.reassess_days', level); const clock = due.state === 'none' ? '' : `Next reassessment due ${dl(due.dueDate, today)} (${due.limit} days between assessments${rr.missing ? ', demo default' : ', rule asam.reassess_days'}${due.state === 'overdue' ? `; ${-due.left} ${-due.left === 1 ? 'day' : 'days'} overdue` : ''}).`;
      const chg = prev ? `Change since the ${pDate} assessment: ${changeText(ch)}.` : 'No earlier assessment is on file to compare.';
      const plan = sd ? `Step-down plan on the assessment: "${sd.plan}"${sd.criteria.length ? ` Today: ${sd.criteria.map(c => `${c.text}: ${c.now_text} (${c.met === true ? 'met' : c.met === false ? 'not met' : 'cannot be checked'})`).join('; ')}.` : ''}` : 'No step-down plan is recorded on the assessment: the clinician writes it.';
      planBox = { label: 'Reassessment and step-down plan', value: `Reassessed ${aDate} (${a.id}). ${clock} ${chg} ${plan}`.replace(/\s+/g, ' ').trim(), src: [n.a, ...(prev ? [n.prev] : [])].filter(Boolean), short: 'Reassessment and step-down plan' };
    }
  }
  const blank = [];
  if (lcheck.state === 'over') blank.push({ label: 'Reason for the requested level', why: `The ratings fit Level ${lcheck.lowest}. Level ${lcheck.requested} needs a reason outside the ratings (safety, a lower level that failed, the home). Only the clinician can give it.`, short: 'Reason for the requested level' });
  else if (lcheck.state === 'under') blank.push({ label: 'Reason for the requested level', why: `The ratings point to Level ${lcheck.lowest}; Level ${lcheck.requested} is requested. The clinician says why.`, short: 'Reason for the requested level' });
  const reasessNote = a ? `${plural(due.days, 'day')} old` : '';
  const checks = [
    { rule: 'Every dimension has a rating and a date', pass: !!a && complete(a), detail: !a ? 'Evidence missing: no ASAM assessment on file' : complete(a) ? `Six ratings, ${aDate} (${ratingsLine(a)})` : `Rated ${ratingsOf(a).filter(x => x != null).length} of 6` },
    { rule: 'Assessment is current', pass: !!a && due.state !== 'overdue', detail: !a ? 'Not assessed' : due.state === 'overdue' ? `${reasessNote}: reassessment was due ${dl(due.dueDate, today)} (${due.limit} days). Reassess before this is sent` : `${reasessNote}; reassessment due ${dl(due.dueDate, today)} (${due.limit} days)` },
    { rule: 'Level of care matches the ratings', pass: lcheck.state === 'match', detail: lcheck.state === 'none' ? lcheck.headline : lcheck.state === 'match' ? lcheck.headline : `${lcheck.headline}. The reason is left for the clinician` },
    { rule: 'Ratings and level recommendation left to the clinician', pass: true, detail: 'Psyflo reads the ratings; it never drafts one. A derived level is "suggested".' }
  ];
  return { dims, level: lvlBox, plan: planBox, blank, checks, lcheck, due, change: ch, stepDown: sd };
}

// ---------------------------------------------------------------- Flow C · initial SRA
export function draftInitialSRA({ client, screening, referral, school, today, isp = {}, cna, request, asam = null, asamPrev = null, rules = [] }) {
  const f = screening?.facts || {};
  const S = [
    src(1, 'referral', `Referral form · ${referral?.id || ''}`, referral?.received),
    src(2, 'call', 'Screening call', screening?.when),
    src(3, 'school', 'Referral partner portal · counts from the counselor', school?.reported),
    src(4, 'plan', 'ISP 2.0 (in Lauris)', isp.date),
    src(5, 'assess', 'ASAM Multidimensional Assessment', asam ? asam.date : cna?.date),
    src(6, 'assess', 'Earlier ASAM assessment', asamPrev ? asamPrev.date : null)
  ];
  // The ratings come from the stored ASAM assessment, the call's words from the screening and the counts from the referral partner:
  // every number, count and word is one somebody gave. A dimension with no evidence says "Evidence missing — verify …" (05b ICE-04).
  const A = asamBoxes({ a: asam, prev: asamPrev, facts: f, callWhen: screening?.when, partner: school, request, today, rules, mode: 'initial', n: { call: 2, partner: 3, a: 5, prev: 6 } });
  // current services and barriers: only what the call said (no promise of future contact, no invented risk times)
  const coord = f.current_service ? `Current services in place: ${low(f.current_service)}. Not a prior treatment that failed.` : '';
  const barriers = f.intake_time ? `${cap(f.intake_time)}.` : '';
  // the request dates, units and hours come from the request record (one source); never typed into the draft by hand
  const dates = request && request.dates ? `${fmtUS(request.dates.split(' to ')[0])} – ${fmtUS(request.dates.split(' to ')[1] || request.dates.split(' to ')[0])} · ${request.units_requested} units` : '';
  const stepLine = asam && asam.plan ? `Step-down criteria as written on the ${dl(asam.date, today)} assessment: "${asam.plan}"` : '';
  const boxes = [
    { label: 'Request dates / units / hours', value: dates || 'Evidence missing — verify the request dates and units (no request record yet).', src: [4], short: 'Request dates · units · hours' },
    ...A.dims, A.level,
    { label: 'Care coordination', value: coord, src: [2, 1], short: 'Care coordination' },
    { label: 'Barriers', value: barriers, src: [2], short: 'Barriers' },
    { label: 'Discharge', value: stepLine || (isp.date ? "Discharge criteria as written in the treatment plan (copy them from the ISP in Lauris; Psyflo does not restate them)." : 'Evidence missing — verify the treatment plan discharge criteria.'), src: [asam && asam.plan ? 5 : 4], short: 'Discharge' }
  ];
  const priorOk = !!(f.prior_provider && f.prior_outcome);
  const blank = [...A.blank, { label: 'Clinical rationale for the level', why: 'You write the rationale. Psyflo shows the ratings and the level they suggest; the level recommendation is yours.', short: 'Clinical rationale' }];
  const text = boxes.map(b => b.value).join(' ');
  const checks = [
    ...A.checks.slice(0, 3),
    { rule: 'Counts, never percentages', ...CHECKS.counts(text), detail: CHECKS.counts(text).pass ? 'Every count is "3 of 5," never a percentage' : CHECKS.counts(text).detail },
    { rule: 'Dates', ...CHECKS.recent(text, today), detail: CHECKS.recent(text, today).pass ? 'Every date is within 30 days or carries a year' : CHECKS.recent(text, today).detail },
    { rule: 'Prior treatment', pass: priorOk, detail: priorOk ? 'Provider, dates and outcome are filled' : 'Prior treatment outcome missing — blocked until it is asked' },
    { rule: 'Current services', pass: !/school counsel|check-in/i.test(f.prior_provider || ''), detail: 'Under care coordination, not prior treatment that failed' },
    A.checks[3],
    { rule: 'Nothing extra', pass: true, detail: 'Only what the form asks. Nothing from the family that you excluded.' }
  ];
  return result(boxes, S, checks, blank, { level: A.lcheck, due: A.due, stepDown: A.stepDown });
}

// ---------------------------------------------------------------- seeded forms: canonical drafts with sources
// These read the store's notes and the record where the seed has them; the text matches the canvas.
export function draftSeeded(form, ctx = {}) {
  // today comes from the caller (the demo clock, shared/clock.js); there is no default date
  const { client = {}, notes = [], screening, today = '' } = ctx;
  const ini = client.initials || 'the client';
  const samples = ctx.samples || notes;   // the canned weekly/monthly sample text (seeded, labelled Illustrative sample); counts below use ctx.notes only
  const wk = samples.find(n => n.type === 'weekly_guardian'), mo = samples.find(n => n.type === 'monthly_collateral');
  // ---- counts are COMPUTED from the stored notes of this client (ctx.notes = state.notes filtered to the client); never constants ----
  const range = ctx.range || '30';
  const mine = notes.filter(n => !client.id || !n.client || n.client === client.id);
  const inRange = n => !today || range === 'all' || range === 'whole' || (daysBetween(String(n.date || '').slice(0, 10), today) <= 30 && daysBetween(String(n.date || '').slice(0, 10), today) >= 0);
  const daily = mine.filter(n => n.type === 'daily' && inRange(n)), weekly = mine.filter(n => n.type === 'weekly_guardian' && inRange(n)), monthly = mine.filter(n => n.type === 'monthly_collateral' && inRange(n));
  const dts = arr => arr.map(n => fmtDate(n.date)).join(', ');
  const objOf = n => n.objective != null ? +n.objective : (String(n.fields?.['Objective addressed'] || '').match(/Obj\.?\s*(\d)/) || [])[1] ? +String(n.fields['Objective addressed']).match(/Obj\.?\s*(\d)/)[1] : null;
  const ivOf = n => n.interventions || (n.fields?.['Interventions'] ? String(n.fields['Interventions']).split(/\s*·\s*/) : []);
  const perGoal = [1, 2, 3].map(g => daily.filter(n => objOf(n) === g).length);
  const ivCounts = {}; for (const n of daily) for (const v of ivOf(n)) ivCounts[v] = (ivCounts[v] || 0) + 1;
  const topIv = Object.entries(ivCounts).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ×${v}`).join(', ');
  const latest = arr => arr.map(n => String(n.date || '').slice(0, 10)).filter(Boolean).sort().at(-1) || '';
  const span = arr => arr.length ? `${fmtDate(arr.map(n => n.date).sort()[0])}–${fmtDate(arr.map(n => n.date).sort().at(-1))}` : '';
  const D = {
    cna: () => {
      // The ASAM Multidimensional Assessment: Psyflo copies what the call said into the presenting issue, the prior treatment and each dimension's text.
      // The six ratings, the level recommendation and the plan are the clinician's: left blank, never drafted.
      const f = screening?.facts || {};
      const fromScreening = !!screening && Object.keys(f).length > 0;
      const tl = client.timeline || {};
      const S = [src(1, 'call', 'Screening call (copied)', screening?.when), src(2, 'referral', 'Referral form', tl.referral || ctx.referral?.received), src(3, 'call', 'Intake conversation (recorded)', today), src(4, 'rule', 'Rule: reassessment interval', today)];
      const rows = substanceRows(f, screening?.when && isoDay(screening.when) || today);
      const heard = rows.filter(r => r.used).map(r => `${lc(r.name)}${r.freq ? ' ' + low(r.freq) : ''}`);
      const presenting = heard.length ? `Referred for substance use: ${heard.join(', ')}. Copied from the referral and the screening call.` : MISSING('the presenting issue (no screening call facts are on record)');
      const prior = screening?.boxes?.find(b => /^Prior (\/ current )?(treatment|services)/.test(b.label))?.value;
      const lines = callLines(f, rows, screening?.when, today);
      const dim = (n, extraWhat) => lines[n - 1].length ? { label: DIM_BOX[n - 1], value: lines[n - 1].join(' ') + ' Copied from the call: the rating is yours.', src: [1], copied: fromScreening } : { label: DIM_BOX[n - 1], value: MISSING(`${extraWhat} (not said on the call)`), src: [3] };
      const boxes = [
        { label: 'Presenting issue / reason for referral', value: presenting, src: [2, 1], copied: fromScreening },
        { label: 'Prior treatment (provider · dates · outcome)', value: prior || '', src: [1], copied: fromScreening, note: 'confirm dates with the family member' },
        dim(1, 'last use, withdrawal history and the withdrawal screen'), dim(2, 'medical conditions and medications'), dim(3, 'mood, suicidal thoughts and any co-occurring diagnosis'),
        dim(4, 'what the client wants and their stage of change'), dim(5, 'use pattern, quit attempts and prior treatment'), dim(6, 'who uses in the home, housing and supports')
      ];
      if (ctx.rules && ctx.rules.length && today) { const r = rule({ rules: ctx.rules }, 'asam.reassess_days'); boxes.push({ label: 'Reassessment due date', value: `${fmtUS(addDays(today, r.value || 30))}`, src: [4], note: `${r.value || 30} days after this assessment (rule asam.reassess_days: ${r.verification}). The clinician sets the date.` }); }
      return result(boxes, S, [
        { rule: 'Prior treatment carries provider, dates and outcome', pass: !!prior, detail: prior ? '' : 'Run the screening first' },
        { rule: 'Ratings, level recommendation and plan are the clinician\'s', pass: true, detail: 'Not drafted: the six ratings, the level recommendation and the plan are left blank' },
        { rule: 'Nothing invented', pass: true, detail: 'Dimensions the call did not cover say so' }
      ], [{ label: 'Dimension ratings (0 to 4)', why: 'The clinician rates each dimension. Psyflo drafts no rating.' }, { label: 'Level of care recommendation', why: 'The clinician recommends the level. Psyflo shows what the ratings suggest once they are entered.' }, { label: 'Plan', why: 'Left for the clinician.' }]);
    },
    isp: () => {
      // a CANNED sample plan (labelled "Illustrative sample" by the caller): the goals are a clinician's, so nothing here is derived from evidence.
      // What can be exact is exact: the client's initials, dates from the clock, the presenting issue and strengths only as the call said them.
      // Each goal is a count tied to an ASAM dimension; when an assessment is on file the goal cites the dimension's rating.
      const f = screening?.facts || {}; const tl = client.timeline || {}; const a = ctx.asam || null;
      const start = today || ''; const end = start ? addDays(start, 364) : '';
      const rows = substanceRows(f, screening?.when && isoDay(screening.when) || today);
      const heard = rows.filter(r => r.used).map(r => lc(r.name) + (r.freq ? ' ' + low(r.freq) : ''));
      const rt = n => a && ratingOf(a, n) != null ? ` (Dimension ${n}, rated ${ratingOf(a, n)} on ${dl(a.date, today)})` : ` (Dimension ${n})`;
      const S = [src(1, 'intake', 'ASAM assessment', a ? a.date : tl.intake || today), src(2, 'call', 'Plan meeting with family member and client', tl.isp || today), src(3, 'list', "Harvest's intervention list", ctx.interventionsDate || today)];
      return result([
        { label: 'Start / end', value: start ? `${fmtUS(start)} – ${fmtUS(end)}` : MISSING('the plan dates'), src: [2] },
        { label: 'Prescribed frequency', value: '3× / week', src: [1] },
        { label: 'Presenting issue', value: heard.length ? `${cap(heard.join(', '))}. Copied from the screening call.` : MISSING('the presenting issue (no screening on record)'), src: [1] },
        { label: 'Strengths', value: f.strengths ? f.strengths + '.' : MISSING('strengths (not on record)'), src: [1] },
        { label: 'Goal 1 · Objective', value: `${ini} will have 4 of 5 weekly urine drug screens negative${rt(5)}.`, src: [2, 1] },
        { label: 'Goal 1 · Intervention 1', value: 'SUD 1.2 Relapse prevention skills', src: [3] }, { label: 'Goal 1 · Intervention 2', value: 'SUD 1.5 Contingency management', src: [3] }, { label: 'Goal 1 · Est. completion', value: '3 months', src: [3] },
        { label: 'Goal 2 · Objective', value: `${ini} will attend 4 of 5 scheduled groups each week${rt(4)}.`, src: [2, 1] },
        { label: 'Goal 2 · Intervention 1', value: 'SUD 1.1 Motivational interviewing', src: [3] }, { label: 'Goal 2 · Intervention 2', value: 'SUD 1.3 Cognitive behavioral skills for substance use', src: [3] }, { label: 'Goal 2 · Est. completion', value: '3 months', src: [3] },
        { label: 'Goal 3 · Objective', value: `${ini} will identify and use two recovery supports${rt(6)}.`, src: [2, 1] },
        { label: 'Goal 3 · Intervention 1', value: 'SUD 2.1 Family session', src: [3] }, { label: 'Goal 3 · Intervention 2', value: 'SUD 2.2 Recovery support planning', src: [3] }, { label: 'Goal 3 · Est. completion', value: '3 months', src: [3] }
      ], S, [{ rule: 'Every goal counts, never a percentage', pass: true, detail: '4 of 5 · 4 of 5 · two supports' }, { rule: 'Interventions from Harvest\'s list', pass: true, detail: '' }, { rule: 'Each goal names an ASAM dimension', pass: true, detail: 'Dimensions 5, 4 and 6' }]);
    },
    weekly: () => result([
      { label: 'Duration', value: wk?.duration_min ? `${wk.duration_min} min` : MISSING('the length of the call'), src: [1] },
      { label: 'What was discussed', value: wk?.discussed || '', src: [1] },
      { label: 'Follow-up', value: wk?.follow_up || '', src: [1] },
      { label: 'Contact with', value: wk?.contact || MISSING('who was contacted'), src: [1] }
    ], [src(1, 'call', 'Weekly family call (recorded)', wk?.date || today)], [{ rule: 'Counts, never percentages', pass: true, detail: '' }, { rule: 'Nothing from home beyond the form\'s question', pass: true, detail: '' }],
      [], { alsoNoted: wk ? ['Family member kept the alcohol locked away this week (family involvement)', 'Weekend contact with peers who drink is still a worry (continuing need)', 'Asked about the Nov 13 renewal'] : [] }),
    collateral: () => result([
      { label: 'Collateral', value: mo?.collateral || MISSING('who the collateral contact was'), src: [2] },
      { label: 'Method', value: mo?.method || MISSING('the method and length of the contact'), src: [2] },
      { label: 'Information shared / received', value: mo?.shared || '', src: [1, 2, 3] },
      { label: 'Coordination', value: mo?.coordination || '', src: [2, 3] }
    ], [src(1, 'school', 'Referral partner portal (counselor counts, facilitator check-in)', mo?.date), src(2, 'call', 'Collateral conversation (recorded)', mo?.date || today), src(3, 'chart', 'Chart (treatment plan shared)', client.timeline?.isp)], [{ rule: 'Counts, never percentages', pass: true, detail: '' }]),
    incident: () => {
      // a CANNED sample for D.W.'s Oct 28 emergency department visit (the seeded incident); for anyone else nothing is drafted from it
      if (client.id !== 'DW') {
        const m = what => MISSING(what + ' (no incident is on record for this client)');
        return result([{ label: 'Date/time', value: m('the date and time'), src: [1] }, { label: 'What happened', value: m('what happened'), src: [1] }],
          [src(1, 'call', 'No incident on record', null)], [{ rule: 'Facts only, with times', pass: true, detail: '' }, { rule: 'CPS and injury left to the staffer', pass: true, detail: 'Yes/No boxes are yours' }]);
      }
      const when = ctx.incident?.date || '2026-10-28'; const a = ctx.asam || null;
      const stale = a && String(a.date).slice(0, 10) < when ? `The last ASAM assessment (${dl(a.date, today)}) is before this visit: a reassessment is indicated.` : '';
      return result([
        { label: 'Date/time', value: '10/28/2026 · 2:40 pm', src: [1] },
        { label: 'Location', value: 'Home (reported by the family member)', src: [1] },
        { label: 'Level', value: 'Level 2 · emergency department visit', src: [1] },
        { label: 'Staff present', value: 'None · phone report', src: [1] },
        { label: 'What happened', value: 'The family member called the site supervisor at 2:40 pm: D.W. was taken to the emergency department this afternoon after alcohol and cannabis use at home. No Harvest staff present. Safety plan on file dated Oct 3.', src: [1, 2] },
        { label: 'Actions taken', value: 'Site supervisor notified clinical director 2:55 pm. Clinician to update the safety plan after the visit. Family member release confirmed.', src: [1], note: stale || undefined }
      ], [src(1, 'call', 'Family member\'s call to the site supervisor', when), src(2, 'chart', 'Safety plan', client.safety_plan_date || '2026-10-03')], [{ rule: 'Facts only, with times', pass: true, detail: '' }, { rule: 'CPS and injury left to the staffer', pass: true, detail: 'Yes/No boxes are yours' }, ...(a ? [{ rule: 'ASAM reassessment after an incident', pass: !stale, detail: stale || `Assessed ${dl(a.date, today)}, after the visit` }] : [])]);
    },
    quarterly: () => {
      const q = client.quarter || null;   // assessments stored on the record, if any; there is NO fallback to another client's numbers
      const days = daily.length; const a = ctx.asam || null, ap = ctx.asamPrev || null;
      const goalBox = (n) => days ? `${perGoal[n - 1]} of ${days} stored daily notes in this period name Goal ${n}${perGoal[n - 1] ? ' (' + dts(daily.filter(x => objOf(x) === n).slice(0, 6)) + (perGoal[n - 1] > 6 ? ', …' : '') + ')' : ''}. Whether that is progress is yours to write.` : MISSING(`the daily notes for ${ini} (none are stored)`);
      // the assessments: the stored ASAM ratings and their change, then any screening score kept on the record (PHQ-9)
      const asamLine = a && complete(a) ? `ASAM ${dl(a.date, today)} (${a.kind || 'assessment'}): ${ratingsLine(a)}.${ap ? ' Since ' + dl(ap.date, today) + ': ' + changeText(change(ap, a)) + '.' : ''}` : '';
      const phq = q && q.phq9 ? `PHQ-9 ${q.phq9[0]} → ${q.phq9[1]}` : q && q.phq_a ? `PHQ-9 ${q.phq_a[0]} → ${q.phq_a[1]}` : '';
      return result([
        { label: 'Goal 1 progress', value: goalBox(1), src: [1] },
        { label: 'Goal 2 progress', value: goalBox(2), src: [1] },
        { label: 'Goal 3 progress', value: goalBox(3), src: [1] },
        { label: 'Assessments', value: [asamLine, phq].filter(Boolean).join(' ') || MISSING('the assessments stored in Lauris'), src: [2] }
      ], [src(1, 'notes', `${days} daily notes${days ? ' · ' + span(daily) : ' (none stored)'}`, latest(daily)), src(2, 'assess', 'Assessments on the record', a ? a.date : q && (q.date || latest((ctx.assessments || []).filter(x => !x.client || x.client === client.id))))],
        [{ rule: 'Counts, never percentages', pass: true, detail: days ? `${days} stored notes` : 'No notes stored' }, { rule: 'Nothing invented', pass: true, detail: days ? '' : 'Boxes without stored evidence say so' }],
        [{ label: 'Recommendations', why: 'You write recommendations. Psyflo drafts none.' }, { label: 'Attendance and recovery environment', why: 'Needs the attendance counts and the family report; none are used from another client.' }], { computed: true });
    },
    'sra-continued': () => {
      // Household context is NOT included by default: a person opts in (ctx.includeHousehold === true), and only from a stored note that says it.
      const include = ctx.includeHousehold === true;
      const hh = include ? mine.find(n => n.household || (n.fields && n.fields.household)) : null;
      const req = ctx.request || null; const a = ctx.asam || null, ap = ctx.asamPrev || null;
      const S = [src(1, 'notes', `Daily notes (${daily.length})${daily.length ? ' · ' + span(daily) : ''}`, latest(daily)), src(2, 'call', `Weekly family calls (${weekly.length})`, latest(weekly)), src(3, 'call', `Monthly collateral (${monthly.length})`, latest(monthly)), src(4, 'plan', 'Request record', req && (req.drafted_at || req.created || req.sent)),
        src(5, 'assess', a && a.kind === 'reassessment' ? 'ASAM reassessment' : 'ASAM assessment', a ? a.date : null), src(6, 'assess', 'Earlier ASAM assessment', ap ? ap.date : null)];
      const progress = daily.length ? `${daily.length} daily note${daily.length === 1 ? '' : 's'} stored for ${range === '30' ? 'the last 30 days' : 'the whole period'} (${span(daily)}). Notes naming Goal 1: ${perGoal[0]}; Goal 2: ${perGoal[1]}; Goal 3: ${perGoal[2]}.${topIv ? ' Interventions named: ' + topIv + '.' : ''}` : MISSING(`the daily notes for ${ini} for this period (none are stored)`);
      const A = asamBoxes({ a, prev: ap, request: req, today, rules: ctx.rules || [], mode: 'continued', n: { a: 5, prev: 6 } });
      const boxes = [
        { label: 'Request', value: req && req.dates ? `${fmtUS(req.dates.split(' to ')[0])} – ${fmtUS(req.dates.split(' to ')[1] || '')} · ${req.units_requested} units` : MISSING('the request dates and units'), src: [4] },
        { label: 'Progress toward goals', value: progress, src: [1] },
        ...A.dims, A.level, A.plan,
        { label: 'Care coordination', value: monthly.length ? `${monthly.length} monthly collateral contact${monthly.length === 1 ? '' : 's'} in the period: ${dts(monthly)}.` : MISSING('a monthly collateral contact in this period'), src: [3] },
        { label: 'Family involvement', value: weekly.length ? `${weekly.length} weekly family call${weekly.length === 1 ? '' : 's'} in the period: ${dts(weekly)}.` : MISSING('weekly family calls in this period'), src: [2] }
      ];
      if (hh) boxes.push({ label: 'Household context (included by you)', value: String(hh.household || hh.fields.household), src: [2] });
      return result(boxes, S, [
        { rule: 'Counts, never percentages', pass: true, detail: `${daily.length} daily · ${weekly.length} weekly · ${monthly.length} monthly` },
        ...A.checks.slice(0, 3),
        { rule: 'Household disclosure', pass: !include || !!hh, detail: include ? (hh ? 'Included because you pressed Include' : 'You pressed Include but no stored note says it: nothing was added') : 'Not included · you decide' },
        { rule: 'Nothing invented', pass: true, detail: 'Counts come from stored notes; ratings from the stored assessment; missing evidence is stated' },
        A.checks[3]
      ], [...A.blank, { label: 'Continued need / risk', why: 'You write current need and risk. Psyflo drafts none; the counted evidence and the ratings are beside it.' }, { label: 'Barriers', why: 'You write barriers from what you know. Psyflo drafts none.' }],
      { computed: true, counts: { daily: daily.length, weekly: weekly.length, monthly: monthly.length }, household: include ? 'included' : 'not_included', level: A.lcheck, due: A.due, stepDown: A.stepDown, change: A.change });
    },
    discharge: () => {
      const plan = ctx.plan || null;   // the early-discharge plan stored in Psyflo; no date is invented and no future event is written as done
      const days = daily.length;
      return result([
        { label: 'Discharge date', value: plan ? fmtUS(plan.discharge) : MISSING('the discharge date (no plan is stored)'), src: [3] },
        { label: 'Reason', value: plan ? 'Units exhausted · planned early discharge' : MISSING('the reason'), src: [3] },
        { label: 'Progress', value: days ? `${days} stored daily notes (${span(daily)}); Goal 1 named in ${perGoal[0]}, Goal 2 in ${perGoal[1]}, Goal 3 in ${perGoal[2]}.` : MISSING('the daily notes (none are stored)'), src: [1] },
        { label: 'Services recommended', value: plan ? `Re-admission to IOP on a new initial request, earliest ${fmtUS(plan.new_initial)}` : MISSING('the recommended services'), src: [3] }
      ], [src(1, 'notes', `${days} daily notes`, latest(daily)), src(2, 'call', 'Family member calls', latest(weekly)), src(3, 'plan', 'Early-discharge plan (Psyflo)', plan && (plan.at || plan.saved_at || plan.created))],
      [{ rule: 'Counts, never percentages', pass: true, detail: '' }, { rule: 'Nothing written as done that has not happened', pass: true, detail: 'Family member notification is left for you to record when it happens' }],
      [{ label: 'Condition at discharge', why: 'You write the condition at discharge.' }, { label: 'Family member notified', why: 'Record it when it has happened: Psyflo does not write future events as done.' }], { computed: true });
    }
  };
  // seeded canned drafts (not computed from stored notes) are labelled so the panel can show the chip "Illustrative sample"
  const COMPUTED = ['quarterly', 'sra-continued', 'discharge'];
  const out = (D[form] || (() => result([], [], [])))();
  if (!COMPUTED.includes(form) && D[form]) { out.illustrative = true; out.sample = 'Illustrative sample'; }
  return out;
}

export function draft(formType, sources = {}) {
  if (formType === 'screening') return draftScreening(sources);
  if (formType === 'sra-initial') return draftInitialSRA(sources);
  if (formType === 'dpn') return enhanceDictation(sources);
  return draftSeeded(formType, sources);
}
