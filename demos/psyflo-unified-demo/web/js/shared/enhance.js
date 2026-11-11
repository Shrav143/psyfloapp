// enhance.js (E5): the pure helpers behind Scribe guidance, Scan & Enhance (Mode A, current draft; Mode B, evidence review) and the
// continued-stay evidence index. Imported by the server (actions/x-enhance.js, x-scribe.js) AND the panel, so a count is computed
// in exactly one place and a statement can always be traced to the stored rows it came from.
//
// Rules this file holds to (docs/BUILD-BRIEF.md, review/05 section 1 and 2):
//   · nothing is invented: a suggestion is a QUESTION, or the person's own typed answer; a missing fact prints "Evidence missing — verify …"
//   · counts are computed from stored rows (state.notes), never constants
//   · Mode B (historical) only READS; no function here returns anything meant to be typed into a processed record
import { fmtDate, daysBetween, addDays, isSchoolDay, parse } from './dates.js';
import { ruleValue, unitsFor } from './rules.js';

// Every source a chip prints carries a day: `date` is yyyy-mm-dd or 'undated' (truly unknown) and `date_label` is the text the chip prints
// ("Oct 16", or "Evidence missing — date unknown"). Same convention as shared/draft.js, so one chip shows every draft's sources alike.
export const UNDATED = 'undated';
export const DATE_MISSING = 'Evidence missing \u2014 date unknown';
const isoDay = d => { const m = String(d || '').match(/^\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; };
export const dateFields = date => { const d = isoDay(date); return { date: d || UNDATED, date_label: d ? fmtDate(d) : DATE_MISSING }; };
export const dateLabel = src => { if (!src) return ''; if (src.date_label) return src.date_label; const d = isoDay(src.date); return d ? fmtDate(d) : src.date === UNDATED ? DATE_MISSING : ''; };

export const MISSING = what => `Evidence missing — verify ${what}.`;
export const isMissingText = v => /^Evidence missing/.test(String(v || ''));
export const KIND_OF = { daily: 'daily', weekly_guardian: 'weekly', monthly_collateral: 'monthly' };
export const KIND_LABEL = { daily: 'Daily notes', weekly: 'Weekly guardian calls', monthly: 'Monthly collateral' };
export const KIND_ONE = { daily: 'daily note', weekly: 'weekly guardian call', monthly: 'monthly collateral contact' };
const byId = (arr, id) => (arr || []).find(x => x.id === id);

// ---------------------------------------------------------------- notes as rows
export function noteFields(n) { return (n && n.fields) || {}; }
export function noteText(n) {
  const f = noteFields(n);
  return String(n.text || n.enhanced || f['Narrative'] || f['What was discussed'] || f['Information shared / received'] || '').trim();
}
export function noteObjective(n) {
  if (n.objective != null && n.objective !== '') return +n.objective || null;
  const m = String(noteFields(n)['Objective addressed'] || '').match(/Obj\.?\s*(\d)/i);
  return m ? +m[1] : null;
}
export function noteInterventions(n) {
  if (Array.isArray(n.interventions)) return n.interventions;
  const v = noteFields(n)['Interventions'];
  return v ? String(v).split(/\s*[·,;]\s*/).map(x => x.trim()).filter(Boolean) : [];
}
export function interventionLabel(s, code) {
  const i = (s.interventions || []).find(x => x.code === code || x.name === code);
  return i ? `${i.code} ${i.name}` : String(code);
}
const flagTerms = s => ruleValue(s, 'style.flag_terms', ['observed', 'monitored', 'watched']);
export function flaggedWords(s, text) { return flagTerms(s).filter(w => new RegExp('\\b' + w + '\\b', 'i').test(text || '')); }

export function noteRow(s, n, marks) {
  const kind = KIND_OF[n.type]; if (!kind) return null;
  const text = noteText(n);
  const mark = (marks || []).find(m => m.client === n.client && m.ref === n.id) || null;
  const f = noteFields(n);
  return {
    ref: n.id, kind, date: String(n.date || '').slice(0, 10), staff: n.staff || '', text, hasText: text.length > 0,
    objective: kind === 'daily' ? noteObjective(n) : null, interventions: kind === 'daily' ? noteInterventions(n) : [],
    units: n.units != null ? n.units : null, direct_min: n.direct_time_min != null ? n.direct_time_min : null, session: n.session || null,
    household: String(n.household || f.household || '').trim(), mood: f['Mood check-in'] || n.mood || '', progress: f['Progress today'] || n.progress || '',
    flags: flaggedWords(s, text), origin: n.origin || (n.session ? 'processed' : 'stored'), review: n.review || '',
    excluded: !!(mark && mark.excluded), sensitive: !!(mark && mark.sensitive), mark
  };
}

// ---------------------------------------------------------------- the calendar
export function weekdays(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) if (isSchoolDay(d)) out.push(d); return out; }
const monday = d => { const w = parse(d).getUTCDay(); return addDays(d, w === 0 ? -6 : 1 - w); };
const monthOf = d => d.slice(0, 7);
const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = ym => MONTH_NAME[+ym.slice(5, 7) - 1];

// presets for the period selector: last 30 days (rule evidence.current_window_days), the authorization period, the last 60 days
export function periodPresets(s, client, today) {
  const win = ruleValue(s, 'evidence.current_window_days', 30);
  const out = [{ id: 'win', label: `Last ${win} days`, from: addDays(today, -win), to: today }, { id: '60', label: 'Last 60 days', from: addDays(today, -60), to: today }];
  const a = client && client.authorization;
  if (a && a.start) out.push({ id: 'auth', label: `Whole authorization (${fmtDate(a.start)} – ${fmtDate(a.end || today)})`, from: a.start, to: today < (a.end || today) ? today : a.end });
  return out;
}

// ---------------------------------------------------------------- evidenceIndex (Mode B and the continued-stay request)
// evidenceIndex(s, clientId, { from, to }) -> everything the request and the review show, every number from rows.
//   rows[]      the stored notes in range, newest last, marks applied (excluded, sensitive, by, at, reason)
//   counts      { daily, weekly, monthly, total, excluded, sensitive } counts are of INCLUDED rows; `all` holds the unfiltered counts
//   byGoal[]    { n, name, count, dates[], last, since }   (daily notes naming that objective)
//   interventions[]  { code, label, count, dates[] }
//   boilerplate[]    sentences repeated across three or more notes
//   gaps[]      { id, kind, severity, text, dates?, refs? }  text prints "Evidence missing — verify …" for a missing fact
//   units       { sum, days, authorization:{ units, used, available } }
export function evidenceIndex(s, clientId, period = {}) {
  const today = (s.clock && s.clock.date) || s.today;
  const client = byId(s.clients, clientId) || null;
  const win = ruleValue(s, 'evidence.current_window_days', 30);
  const from = period.from || addDays(today, -win), to = period.to || today;
  const marks = s.evidence_marks || [];
  const all = (s.notes || []).filter(n => n.client === clientId).map(n => noteRow(s, n, marks)).filter(Boolean)
    .sort((a, b) => (a.date + a.ref) < (b.date + b.ref) ? -1 : 1);
  const rows = all.filter(r => r.date >= from && r.date <= to);
  const inc = rows.filter(r => !r.excluded);
  const count = (arr, k) => arr.filter(r => r.kind === k).length;
  const counts = { daily: count(inc, 'daily'), weekly: count(inc, 'weekly'), monthly: count(inc, 'monthly'), total: inc.length, excluded: rows.filter(r => r.excluded).length, sensitive: rows.filter(r => r.sensitive && !r.excluded).length };
  const allCounts = { daily: count(rows, 'daily'), weekly: count(rows, 'weekly'), monthly: count(rows, 'monthly'), total: rows.length };
  const daily = inc.filter(r => r.kind === 'daily');
  const goals = (client && client.goals) || [];
  const byGoal = (goals.length ? goals.map(g => g.n) : [1, 2, 3]).map(n => {
    const ds = daily.filter(r => r.objective === n).map(r => r.date); const last = ds.at(-1) || null;
    const g = goals.find(x => x.n === n) || {};
    return { n, name: g.name || g.objective || '', count: ds.length, dates: ds, last, since: last ? daysBetween(last, to) : null };
  });
  const iv = {};
  for (const r of daily) for (const code of r.interventions) { const k = String(code).trim(); (iv[k] = iv[k] || { code: k, label: interventionLabel(s, k), count: 0, dates: [] }); iv[k].count++; iv[k].dates.push(r.date); }
  const interventions = Object.values(iv).sort((a, b) => b.count - a.count || (a.code < b.code ? -1 : 1));
  const boilerplate = repeatedSentences(inc.filter(r => r.hasText));
  const units = { sum: daily.reduce((a, r) => a + (r.units || 0), 0), days: daily.filter(r => r.units != null).length, authorization: client && client.authorization ? { units: client.authorization.units, used: client.authorization.used, start: client.authorization.start, end: client.authorization.end, available: client.authorization.units - (client.authorization.used || 0) } : null };
  const gaps = documentationGaps(s, { client, rows, inc, from, to, today, byGoal, boilerplate, units, goals });
  return { client: clientId, period: { from, to, days: daysBetween(from, to) + 1 }, rows, counts, all: allCounts, byGoal, interventions, boilerplate, gaps, units };
}

export const normSentence = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
// sentences, without splitting after an initial ("M.R. in math") or an abbreviation (Mr., Dr.): a token that looks like one only ends a sentence
// when the next word starts with a capital letter
const ABBR = /^(?:[A-Za-z]\.)+$|^(?:Mr|Mrs|Ms|Dr|St|vs|etc)\.$/;
export function splitSentences(text) {
  const toks = String(text || '').trim().split(/\s+/).filter(Boolean); const out = []; let cur = [];
  toks.forEach((tok, i) => {
    cur.push(tok);
    const end = /[.!?]["')]?$/.test(tok); if (!end) return;
    const bare = tok.replace(/["')]+$/, ''); const next = toks[i + 1];
    if (ABBR.test(bare) && next && !/^[A-Z"']/.test(next)) return;
    out.push(cur.join(' ')); cur = [];
  });
  if (cur.length) out.push(cur.join(' '));
  return out;
}
export function repeatedSentences(rows, { min = 3, minLen = 30 } = {}) {
  const map = new Map();
  for (const r of rows) {
    const seen = new Set();
    for (const sent of splitSentences(r.text)) { const k = normSentence(sent); if (k.length < minLen || seen.has(k)) continue; seen.add(k); const e = map.get(k) || { sentence: sent, count: 0, dates: [], refs: [] }; e.count++; e.dates.push(r.date); e.refs.push(r.ref); map.set(k, e); }
  }
  return [...map.values()].filter(e => e.count >= min).sort((a, b) => b.count - a.count);
}

// gaps in what is stored (never a claim about what happened): each is something to verify or to write differently next time
function documentationGaps(s, { client, rows, inc, from, to, today, byGoal, boilerplate, units, goals }) {
  const gaps = []; const ini = (client && client.initials) || 'the student';
  const daily = inc.filter(r => r.kind === 'daily'), weekly = inc.filter(r => r.kind === 'weekly'), monthly = inc.filter(r => r.kind === 'monthly');
  const last = to > today ? today : to;
  // school days in range with no daily note stored (today is not a gap until the day is over)
  const have = new Set(daily.map(r => r.date));
  const days = weekdays(from, last).filter(d => d < today);
  const missingDays = days.filter(d => !have.has(d));
  if (missingDays.length) gaps.push({ id: 'days', kind: 'missing', severity: 'missing', text: MISSING(`whether ${ini} was in service on the ${missingDays.length} school day${missingDays.length === 1 ? '' : 's'} with no daily note stored`), dates: missingDays });
  // weekly guardian contact: each full school week in range
  const weeksSeen = new Set(weekly.map(r => monday(r.date)));
  const weeks = []; for (let d = monday(from); d <= last; d = addDays(d, 7)) { const wd = weekdays(d < from ? from : d, addDays(d, 4) > last ? last : addDays(d, 4)); if (wd.length && addDays(d, 4) < today) weeks.push(d); }
  const missingWeeks = weeks.filter(w => !weeksSeen.has(w));
  if (missingWeeks.length) gaps.push({ id: 'weeks', kind: 'missing', severity: 'missing', text: MISSING(`the weekly guardian call for ${missingWeeks.length} week${missingWeeks.length === 1 ? '' : 's'} (none stored)`), dates: missingWeeks });
  // monthly collateral: each calendar month that touches the range and has ended or has started
  const covered = {}; for (let d = from; d <= last; d = addDays(d, 1)) { const m = monthOf(d); covered[m] = (covered[m] || 0) + 1; }
  const months = Object.keys(covered).filter(m => covered[m] >= 14);   // a month counts when the period covers at least two weeks of it
  const mset = new Set(monthly.map(r => monthOf(r.date)));
  const missingMonths = months.filter(m => !mset.has(m) && (m < monthOf(today) || (m === monthOf(today) && today >= m + '-25')));
  if (missingMonths.length) gaps.push({ id: 'months', kind: 'missing', severity: 'missing', text: MISSING(`the monthly collateral contact for ${missingMonths.map(monthName).join(', ')} (none stored)`), dates: missingMonths });
  // notes with no text stored in Psyflo (only the fact of the note)
  const noText = inc.filter(r => !r.hasText);
  if (noText.length) gaps.push({ id: 'notext', kind: 'missing', severity: 'missing', text: MISSING(`the text of ${noText.length} note${noText.length === 1 ? '' : 's'} in Lauris (Psyflo holds only the fact of the note: ${noText.slice(0, 4).map(r => fmtDate(r.date)).join(', ')})`), refs: noText.map(r => r.ref), dates: noText.map(r => r.date) });
  // daily notes that name no ISP objective, no intervention, or no mood
  const noObj = daily.filter(r => r.objective == null); if (noObj.length) gaps.push({ id: 'noobj', kind: 'future', severity: 'warn', text: `${noObj.length} daily note${noObj.length === 1 ? '' : 's'} name no ISP objective. Name it in the next note.`, refs: noObj.map(r => r.ref), dates: noObj.map(r => r.date) });
  const noIv = daily.filter(r => !r.interventions.length); if (noIv.length) gaps.push({ id: 'noiv', kind: 'future', severity: 'warn', text: `${noIv.length} daily note${noIv.length === 1 ? '' : 's'} list no intervention from the ISP list.`, refs: noIv.map(r => r.ref), dates: noIv.map(r => r.date) });
  // goals not worked recently (the last window)
  const win = ruleValue(s, 'evidence.current_window_days', 30);
  for (const g of byGoal) {
    if (g.count === 0 && daily.length) gaps.push({ id: 'goal' + g.n, kind: 'future', severity: 'warn', text: `Goal ${g.n} is named in no daily note in this period.`, dates: [] });
    else if (g.last && daysBetween(g.last, last) > win - 2 && daily.length) gaps.push({ id: 'goal' + g.n, kind: 'future', severity: 'warn', text: `Goal ${g.n} was last named ${fmtDate(g.last)} (${Math.round(daysBetween(g.last, last) / 7)} weeks before the end of this period).`, dates: [g.last] });
  }
  // flagged words (never rewritten here: a note in Lauris is final)
  const fl = inc.filter(r => r.flags.length); if (fl.length) gaps.push({ id: 'flags', kind: 'future', severity: 'warn', text: `${fl.length} note${fl.length === 1 ? ' uses' : 's use'} a flagged word (${[...new Set(fl.flatMap(r => r.flags))].map(w => '"' + w + '"').join(', ')}). Processed notes are not changed; say what staff did in future notes.`, refs: fl.map(r => r.ref), dates: fl.map(r => r.date) });
  // repeated boilerplate
  if (boilerplate.length) gaps.push({ id: 'boiler', kind: 'future', severity: 'warn', text: `${boilerplate.length} sentence${boilerplate.length === 1 ? ' is' : 's are'} repeated across three or more notes. Original wording each day.`, dates: [] });
  // units stored against units used
  if (units.authorization && client && client.authorization && client.authorization.start && from <= client.authorization.start && daily.length) {
    const used = units.authorization.used || 0;
    if (units.sum !== used) gaps.push({ id: 'units', kind: 'missing', severity: 'missing', text: MISSING(`units: the stored daily notes add up to ${units.sum}, the authorization shows ${used} used`), dates: [] });
  }
  return gaps;
}

// ---------------------------------------------------------------- Scribe: what is still missing from what the person said (never answers for them)
const RESPONSE = /\b(responded|calmed|cooled|settled|returned|went back|re-?engaged|agreed|refused|declined|accepted|used (?:his|her|the|a)|tried|participated|talked|shared|said|stated|told|asked|became|got (?:upset|angry|calm)|was (?:upset|calm|angry|sad|happy|quiet|tearful)|cried|yelled|left|stayed|complied|followed|practiced|practised|identified)\b/i;
const PROGRESS = /\b(progress|improv|better|worse|more than|less than|fewer|again|first time|each time|every time|twice|three times|\d+\s*(?:of|times|x)\b)/i;
const DURATION = /(\d+\s*(?:min|mins|minutes|hour|hours|hr|hrs)\b|half an hour|an hour)/i;
const OBJECTIVE = /\b(?:objective|obj\.?|goal)\s*([1-3])\b/i;
export function dailyGuidance(text, { client = {}, interventions = [], hasTimer = false } = {}) {
  const raw = String(text || ''); const t = raw.toLowerCase(); const ini = client.initials || 'the student';
  const named = interventions.filter(i => i.name && (t.includes(String(i.name).toLowerCase()) || (i.code && t.includes(String(i.code).toLowerCase()))));
  const goals = client.goals || [];
  const items = [
    { key: 'intervention', title: 'What you did', done: named.length > 0, ask: `What did you do with ${ini}? Name the intervention from the ISP list.`, options: [...new Set(goals.flatMap(g => g.interventions || []))] },
    { key: 'objective', title: 'ISP objective', done: OBJECTIVE.test(raw), ask: 'Which ISP objective did this address?', options: goals.map(g => `Objective ${g.n} · ${g.name || g.objective || ''}`) },
    { key: 'response', title: `${ini}'s response`, done: RESPONSE.test(raw), ask: `How did ${ini} respond?` },
    { key: 'duration', title: 'How long', done: DURATION.test(raw) || hasTimer, ask: 'How long was it?' },
    { key: 'progress', title: 'Progress', done: PROGRESS.test(raw), ask: 'What progress did you see, as a count?' }
  ];
  const questions = items.filter(i => !i.done).map(i => ({ key: i.key, q: i.ask, options: i.options }));
  const flagged = raw ? ['observed', 'monitored', 'watched'].filter(w => new RegExp('\\b' + w + '\\b', 'i').test(raw)) : [];
  for (const w of flagged) questions.push({ key: 'flag:' + w, q: `You wrote "${w}". What did you do with ${ini}?`, flag: w });
  return { items, questions, flagged, empty: !raw.trim() };
}
export function weeklyGuidance(text, { client = {} } = {}) {
  const raw = String(text || ''); const ini = client.initials || 'the student';
  const items = [
    { key: 'who', title: 'Who you spoke with', done: /\b(grandmother|grandma|mother|mom|father|dad|guardian|aunt|uncle|foster|caregiver|parent)\b/i.test(raw), ask: 'Who was on the call?' },
    { key: 'duration', title: 'How long', done: DURATION.test(raw), ask: 'How long was the call?' },
    { key: 'discussed', title: 'What was discussed', done: raw.trim().length > 40, ask: `What did you cover about ${ini}'s progress and the plan?` },
    { key: 'followup', title: 'Follow-up', done: /\b(follow[- ]?up|next call|will|plan to|agreed|bring|send|check in)\b/i.test(raw), ask: 'What was agreed, and when is the next contact?' }
  ];
  return { items, questions: items.filter(i => !i.done).map(i => ({ key: i.key, q: i.ask })), empty: !raw.trim() };
}
export function collateralGuidance(text, { client = {} } = {}) {
  const raw = String(text || '');
  const items = [
    { key: 'who', title: 'Who', done: /\b(counselor|teacher|principal|nurse|psychologist|case ?manager|pediatrician|probation|caseworker|school)\b/i.test(raw), ask: 'Who did you speak with?' },
    { key: 'method', title: 'How', done: /\b(phone|call|in person|email|e-mail|meeting|portal|text|video)\b/i.test(raw), ask: 'How did you speak (phone, in person, message)?' },
    { key: 'shared', title: 'What was shared', done: raw.trim().length > 40, ask: 'What was shared or received?' },
    { key: 'coord', title: 'Coordination', done: /\b(will|agreed|plan|attend|coordinate|follow[- ]?up|next)\b/i.test(raw), ask: 'What coordination was agreed?' }
  ];
  return { items, questions: items.filter(i => !i.done).map(i => ({ key: i.key, q: i.ask })), empty: !raw.trim() };
}
export const tidySentence = raw => { const t = String(raw || '').trim().replace(/\s+/g, ' '); return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/([^.!?])$/, '$1.') : ''; };

// ---------------------------------------------------------------- Mode A: findings on the CURRENT draft (the open form, before Process Form)
// scanFindings(s, clientId, form, fields) -> findings. fields = [{ label, value }] as the bridge read them from the open form.
// A finding is a QUESTION with options. It has no wording of its own: when the person answers, `apply` holds exactly their answer.
//   { id, category:'wording'|'evidence'|'missing'|'units'|'boilerplate', box, issue, why, rule:{ key, label, verification }, evidence:[{ ref, label, date, quote }],
//     question, options?, state:'open'|'accepted'|'rejected'|'edited', answer? }
const textBoxes = ['Narrative', 'What was discussed', 'Information shared / received', 'Follow-up', 'Coordination', 'Progress toward goals', 'Section I · criterion 1 — interpersonal relationships', 'Progress today'];
export function scanFindings(s, clientId, form, fields = []) {
  const client = byId(s.clients, clientId) || {};
  const val = l => { const f = fields.find(x => x.label === l); return f ? String(f.value || '') : ''; };
  const text = textBoxes.map(val).filter(Boolean).join(' ');
  const F = []; let n = 0; const id = () => 'f' + (++n);
  const R = key => { const r = (s.rules || []).find(x => x.key === key) || {}; return { key, label: r.label || key, verification: r.category || 'UNVERIFIED-DEMO-ASSUMPTION', source: r.source || '' }; };
  const ini = client.initials || 'the student';
  // 1 flagged words: ask, never substitute
  for (const w of flaggedWords(s, text)) {
    const box = textBoxes.find(l => new RegExp('\\b' + w + '\\b', 'i').test(val(l))) || 'Narrative';
    F.push({ id: id(), category: 'wording', box, issue: `"${w}" is in the note`, why: 'One wrong verb can void a note. Say what you did, not what you saw.', rule: R('style.flag_terms'), evidence: [{ ref: 'form:' + box, label: box, quote: sentenceWith(val(box), w) }], question: `What did you do with ${ini}?`, state: 'open', replaces: sentenceWith(val(box), w) });
  }
  // 2 percentages
  const pct = text.match(/\d+(?:\.\d+)?\s?%|\bpercent\b/i);
  if (pct) F.push({ id: id(), category: 'wording', box: textBoxes.find(l => /\d\s?%|percent/i.test(val(l))) || 'Narrative', issue: `A percentage ("${pct[0]}") is in the note`, why: 'Say it as a count ("3 of 5").', rule: R('style.counts_not_percentages'), evidence: [{ ref: 'form:Narrative', label: 'Narrative', quote: sentenceWith(text, pct[0]) }], question: 'What was the count (for example 3 of 5)?', state: 'open', replaces: sentenceWith(text, pct[0]) });
  if (form === 'dpn') {
    // 3 objective, 4 intervention, 5 mood and progress, 6 time and units
    if (!val('Objective addressed') && !OBJECTIVE.test(text)) F.push({ id: id(), category: 'missing', box: 'Objective addressed', issue: 'No ISP objective is named', why: 'Every note links to an objective on the plan.', rule: R('notes.required_elements'), evidence: [], question: 'Which ISP objective did this address?', options: (client.goals || []).map(g => `Obj. ${g.n} – ${g.objective}`), state: 'open' });
    if (!val('Interventions')) F.push({ id: id(), category: 'missing', box: 'Interventions', issue: 'No intervention from the ISP list is chosen', why: 'Interventions come from the ISP list, never from memory.', rule: R('notes.required_elements'), evidence: [], question: 'Which intervention did you use?', options: [...new Set((client.goals || []).flatMap(g => g.interventions || []))].map(c => interventionLabel(s, c)), state: 'open' });
    if (!val('Mood check-in')) F.push({ id: id(), category: 'missing', box: 'Mood check-in', issue: 'Mood check-in is empty', why: 'Part of the daily note elements.', rule: R('notes.required_elements'), evidence: [], question: `How did ${ini} describe their mood?`, state: 'open' });
    if (!val('Progress today')) F.push({ id: id(), category: 'missing', box: 'Progress today', issue: 'Progress is empty', why: 'Progress is a count against the objective.', rule: R('notes.required_elements'), evidence: [], question: 'What progress did you see, as a count?', state: 'open' });
    const direct = parseMin(val('Direct time')); const units = val('Units') === '' ? null : parseInt(val('Units'), 10);
    if (direct == null && !val('Contact time')) F.push({ id: id(), category: 'missing', box: 'Direct time', issue: 'No time is recorded', why: 'Units come from direct time.', rule: R('units.tdt.day_tiers'), evidence: [], question: 'How many minutes of direct service?', state: 'open' });
    if (direct != null && units != null && units > unitsFor(s, 'tdt', direct)) F.push({ id: id(), category: 'units', box: 'Units', issue: `${units} units but ${direct} direct minutes support ${unitsFor(s, 'tdt', direct)}`, why: 'Units follow the direct minutes under the unit bands.', rule: R('units.tdt.day_tiers'), evidence: [{ ref: 'form:Direct time', label: 'Direct time', quote: val('Direct time') }], question: `Enter the units the minutes support (${unitsFor(s, 'tdt', direct)}) or correct the time.`, options: [String(unitsFor(s, 'tdt', direct))], state: 'open' });
  }
  // 7 repeated wording against this student's recent notes by the same person (shown, never rewritten)
  const recent = (s.notes || []).filter(x => x.client === clientId && KIND_OF[x.type] === (form === 'dpn' ? 'daily' : form === 'weekly' ? 'weekly' : form === 'collateral' ? 'monthly' : '_')).slice(-10);
  const seen = new Map(); for (const r of recent) for (const sent of splitSentences(noteText(r))) { const k = normSentence(sent); if (k.length >= 30) (seen.get(k) || seen.set(k, []).get(k)).push(r); }
  const mine = new Set(); for (const sent of splitSentences(val('Narrative') || val('What was discussed') || val('Information shared / received'))) { const k = normSentence(sent); if (k.length >= 30 && seen.has(k)) mine.add(k); }
  for (const k of [...mine].slice(0, 2)) { const rs = seen.get(k); F.push({ id: id(), category: 'boilerplate', box: 'Narrative', issue: 'This sentence is already in your recent notes', why: 'Auditors look for original wording each day.', rule: R('notes.required_elements'), evidence: rs.slice(0, 3).map(r => ({ ref: r.id, label: `${KIND_ONE[KIND_OF[r.type]]}`, date: r.date, quote: sentenceWith(noteText(r), k.slice(0, 20)) })), question: 'Say it in your own words for today.', state: 'open', replaces: splitSentences(val('Narrative') || val('What was discussed') || val('Information shared / received')).find(x => normSentence(x) === k) }); }
  return F;
}
function sentenceWith(text, needle) { const n = String(needle).toLowerCase(); return splitSentences(text).find(x => x.toLowerCase().includes(n)) || String(text || '').slice(0, 160); }
export function parseMin(t) { const s = String(t || ''); if (!s.trim()) return null; const h = s.match(/(\d+)\s*h/i), m = s.match(/(\d+)\s*min/i); if (!h && !m) return /^\d+$/.test(s.trim()) ? +s.trim() : null; return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0); }

// what the accepted findings change in the form. A finding applies only the person's own answer; a finding with no answer applies nothing.
// -> [{ label, before, after }]  (the boxes to type; after is never text Psyflo wrote)
export function applyFindings(fields, findings) {
  const out = new Map(); const orig = l => { const f = fields.find(x => x.label === l); return f ? String(f.value || '') : ''; };
  for (const f of findings) {
    if (!['accepted', 'edited'].includes(f.state) || !String(f.answer || '').trim()) continue;
    const ans = String(f.answer).trim(); const cur = out.has(f.box) ? out.get(f.box).after : orig(f.box);
    let after;
    if (f.replaces && cur.includes(f.replaces)) after = cur.replace(f.replaces, ans);          // the person's sentence replaces the flagged one
    else if (['Objective addressed', 'Interventions', 'Mood check-in', 'Progress today', 'Direct time', 'Units'].includes(f.box)) after = ans;   // a plain box takes the answer
    else after = (cur ? cur.trim() + ' ' : '') + ans;                                                        // a text box gets the sentence appended
    out.set(f.box, { label: f.box, before: out.has(f.box) ? out.get(f.box).before : orig(f.box), after });
  }
  return [...out.values()];
}

// ---------------------------------------------------------------- statements for the continued-stay request, every one traced to rows
// buildContinuedStay(s, clientId, period, { household }) -> { boxes, sources, checks, blank, counts }
// household context is NOT included unless `household === true` (a person opted in) and only from a stored note that says it.
export function buildContinuedStay(s, clientId, period, { household = false, request = null } = {}) {
  const idx = evidenceIndex(s, clientId, period); const client = byId(s.clients, clientId) || {};
  const ini = client.initials || 'the student';
  const inc = idx.rows.filter(r => !r.excluded); const daily = inc.filter(r => r.kind === 'daily'), weekly = inc.filter(r => r.kind === 'weekly'), monthly = inc.filter(r => r.kind === 'monthly');
  const dts = arr => arr.map(r => fmtDate(r.date)).join(', ');
  const span = arr => arr.length ? `${fmtDate(arr[0].date)} – ${fmtDate(arr.at(-1).date)}` : '';
  const reqDay = request && (request.drafted_at || request.created || request.sent);   // same day the other drafts use for a request record
  const S = [
    { n: 1, kind: 'notes', label: `Daily notes (${daily.length})`, ...dateFields(daily.at(-1)?.date), rows: daily.map(r => r.ref), source: `${daily.length} stored daily notes ${span(daily)}` },
    { n: 2, kind: 'call', label: `Weekly guardian calls (${weekly.length})`, ...dateFields(weekly.at(-1)?.date), rows: weekly.map(r => r.ref), source: `${weekly.length} stored weekly guardian calls` },
    { n: 3, kind: 'call', label: `Monthly collateral (${monthly.length})`, ...dateFields(monthly.at(-1)?.date), rows: monthly.map(r => r.ref), source: `${monthly.length} stored monthly collateral contacts` },
    { n: 4, kind: 'plan', label: 'Request record', ...dateFields(reqDay), rows: [], source: request ? `Request ${request.id}` : 'No request record' }
  ];
  const goalsLine = idx.byGoal.map(g => `Goal ${g.n}: ${g.count}`).join('; ');
  const ivLine = idx.interventions.slice(0, 4).map(i => `${i.label} ×${i.count}`).join(', ');
  const hh = household ? inc.find(r => r.household && !r.sensitive) : null;
  const boxes = [
    { label: 'Progress toward goals', value: daily.length ? `${daily.length} daily note${daily.length === 1 ? '' : 's'} stored for this period (${span(daily)}). Notes naming each goal — ${goalsLine}.${ivLine ? ' Interventions named: ' + ivLine + '.' : ''}` : MISSING(`the daily notes for ${ini} for this period (none are stored)`), src: [1] },
    { label: 'Care coordination', value: monthly.length ? `${monthly.length} monthly collateral contact${monthly.length === 1 ? '' : 's'} in the period: ${dts(monthly)}.` : MISSING('a monthly collateral contact in this period'), src: [3] },
    { label: 'Family involvement', value: weekly.length ? `${weekly.length} weekly guardian call${weekly.length === 1 ? '' : 's'} in the period: ${dts(weekly)}.` : MISSING('weekly guardian calls in this period'), src: [2] }
  ];
  // the Lauris form has no household box: a person who opts in has it typed at the start of "Continued need / risk" (their own box), named as theirs
  if (hh) boxes.push({ label: 'Continued need / risk', value: `Household context (included by you): ${hh.household}`, src: [2] });
  const dates = request && request.dates ? request.dates : null;
  boxes.unshift({ label: 'Request', value: dates ? `${dates.split(' to ')[0]} – ${dates.split(' to ')[1] || ''} · ${request.units_requested} units` : MISSING('the request dates and units'), src: [4] });
  const checks = [
    { rule: 'Counts, never percentages', pass: true, detail: `${daily.length} daily · ${weekly.length} weekly · ${monthly.length} monthly` },
    { rule: 'Household disclosure', pass: !household || !!hh, detail: household ? (hh ? 'Included because you chose it' : 'You chose it but no stored note says it: nothing was added') : 'Not included · you decide' },
    { rule: 'Excluded and sensitive rows', pass: true, detail: `${idx.counts.excluded} excluded · ${idx.counts.sensitive} sensitive (counted, never quoted)` },
    { rule: 'Nothing invented', pass: true, detail: 'Every statement comes from stored rows or says "Evidence missing"' },
    { rule: 'Evidence complete', pass: !boxes.some(b => isMissingText(b.value)), detail: boxes.some(b => isMissingText(b.value)) ? `${boxes.filter(b => isMissingText(b.value)).length} statement${boxes.filter(b => isMissingText(b.value)).length === 1 ? '' : 's'} say Evidence missing: verify before you rely on them` : 'No statement is missing its evidence' }
  ];
  const blank = [...(hh ? [] : [{ label: 'Continued need / risk', why: 'You write current need and risk. Psyflo drafts none; the counted evidence is beside it.' }]), { label: 'Barriers', why: 'You write barriers from what you know.' }];
  return { boxes, sources: S, checks, blank, counts: idx.counts, index: idx, household: household ? 'included' : 'not_included' };
}
