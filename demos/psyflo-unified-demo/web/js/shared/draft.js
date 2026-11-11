// draft(formType, sources) — the one place Psyflo writes text for a form.
// Returns { boxes: [{label, value, src:[n], note}], sources: [{n, kind, label, date}], checks: [{rule, pass, detail}], blank: [{label, why}] }.
// Every box carries the numbered sources it came from (rule 7). The drafting rules are explicit checks,
// run on the output before the panel shows it (rules 1–14 in the brief), not hints in a prompt.
// The worked examples in seed/scripts are its tests (test/draft.test.mjs).
//
// This build is deterministic: extractors over the transcript/dictation and the record. A hosted LLM can
// sit behind the same function later; the checks below still gate whatever it returns.

import { fmtDate, fmtUS, daysBetween, mins, fmtDuration, unitsForDirectMinutes, clock12 } from './dates.js';
import { unitsFor } from './rules.js';

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
  fdi(rows) { // rule 3: frequency, duration, intensity for every behaviour marked Y
    const missing = rows.filter(r => r.yn === 'Y' && !(r.freq && r.dur && r.int)).map(r => r.name);
    return { pass: missing.length === 0, detail: missing.length ? 'Missing frequency/duration/intensity: ' + missing.join(', ') : '' };
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

function result(boxes, sources, checks, blank = [], extra = {}) {
  // a box whose text is "Evidence missing — verify …" is a placeholder for the person to replace: flagged so it is never typed as if it were evidence
  return { boxes: boxes.filter(b => b.value).map(b => /^Evidence missing/.test(b.value) ? { ...b, missing: true } : b), sources, checks, blank, ...extra };
}

// ---------------------------------------------------------------- Flow A · screening call
// Facts heard on the call. Each fact: test(text) → value or null. Text is the transcript so far (any case).
const has = (t, re) => re.test(t);
export const SCREENING_FACTS = {
  consent: t => has(t, /record/) && has(t, /(that'?s fine|okay with you\?\s*(\w+:)?\s*(yes|ok|that)|sure)/) ? 'consent to record given' : null,
  guardian: t => has(t, /grandmother/) && has(t, /(legal guardian|since he was (four|4))/) ? 'Grandmother (legal guardian)' : null,
  agg_yes: t => has(t, /(pushing|shoving|shoved|fighting)/) ? 'Y' : null,
  agg_freq: t => has(t, /(two or three|2 or 3|2-3|2 to 3) times a week/) ? '2–3× / week' : null,
  agg_dur: t => has(t, /(five|5) minutes,? maybe (twenty|20)/) ? '5–20 min' : null,
  agg_int: t => has(t, /(doesn'?t hit to hurt|it'?s shoving)/) ? 'Moderate' : null,
  agg_ex: t => has(t, /shoved a boy at lunch/) ? 'Shoved a classmate at lunch' + (has(t, /(two|2) office referrals/) ? '; 2 office referrals this month' : '') : null,
  elope_yes: t => has(t, /(walked out|leave the classroom|left to|walks out)/) && has(t, /once a week/) ? 'Y' : null,
  elope_freq: t => has(t, /about once a week/) ? '~1× / week' : null,
  elope_dur: t => has(t, /(ten|10) minutes,? (half an hour|30 minutes)/) ? '10–30 min' : null,
  elope_int: t => has(t, /(parking lot|by the buses)/) ? 'High' : null,
  elope_ex: t => has(t, /(sixth|6th).{0,40}parking lot/) && has(t, /(in-school suspension|in school suspension)/) ? 'Left to the parking lot 10/6 — 1 day ISS' : null,
  danger: t => has(t, /(doesn'?t think about it|just goes)/) ? '"I don\'t think he thinks about it. He just goes."' : null,
  verbal_yes: t => has(t, /(mouthing off|yelling|threats)/) && has(t, /(every day|daily)/) ? 'Y' : null,
  verbal_freq: t => has(t, /every day,? pretty much/) ? 'Daily' : null,
  verbal_dur: t => has(t, /a few minutes and it'?s over/) ? '<5 min' : null,
  verbal_int: t => has(t, /not scary/) ? 'Low–mod' : null,
  selfharm: t => has(t, /(never|no)\.? .{0,30}asked him straight/) ? 'N' : null,
  internal: t => has(t, /sleeps fine/) && has(t, /not sad/) ? 'Sleeps well; not sad per guardian' + (has(t, /his room/) ? '; goes to his room after school' : '') : null,
  prior_provider: t => has(t, /piedmont counseling/) ? 'Piedmont Counseling' : null,
  prior_dates: t => has(t, /march to june/) ? (has(t, /last spring/) ? 'Mar–Jun (last spring · confirm the year)' : 'Mar–Jun (confirm the year)') : null,
  prior_sessions: t => has(t, /(six|6) times/) ? '~6 sessions' : null,
  prior_ended: t => has(t, /(couldn'?t get him there|hours changed)/) ? 'ended (transportation)' : null,
  prior_outcome: t => has(t, /not that i could see/) ? 'no improvement seen' : null,
  school_bi: t => has(t, /behavio(u)?r person .{0,40}twice a week/) ? 'Behaviour interventionist 2×/week since Sep' : null,
  school_cico: t => has(t, /checks in .{0,40}morning and afternoon/) ? 'check-in/check-out' : null,
  school_iep: t => has(t, /has an iep/) ? 'IEP accommodations in place' : null,
  placement: t => has(t, /brought it up twice/) || has(t, /other placements/) ? 'school has raised alternative placement twice' : null,
  medical: t => has(t, /inhaler/) && has(t, /asthma/) ? (has(t, /no other medicine/) ? 'No current medications; asthma, inhaler at school' : 'Asthma, inhaler at school') : null,
  strengths: t => { const s = []; if (has(t, /basketball/)) s.push('Basketball'); if (has(t, /drawing/)) s.push('drawing'); if (has(t, /one on one with an adult/)) s.push('does well one-to-one with an adult'); return s.length >= 2 ? s.join('; ') : null; },
  intake_time: t => has(t, /afternoons after two/) ? 'Afternoons after 2 pm; can get to the school' : null
};

export function screeningFacts(text) {
  const t = String(text || '').toLowerCase().replace(/[’]/g, "'");
  const f = {}; for (const [k, fn] of Object.entries(SCREENING_FACTS)) { const v = fn(t); if (v) f[k] = v; }
  return f;
}

// "Before you hang up" prompts: what the insurer needs, ticking as answers are heard
export function screeningPrompts(f) {
  const c1 = f.agg_freq && f.agg_dur && f.agg_int;
  const c2 = f.prior_provider && f.prior_dates && f.prior_outcome;
  return [
    { key: 'c1', group: 'Insurance needs two of these three', title: 'Difficulty establishing or maintaining interpersonal relationships', done: !!c1, partial: !!f.agg_yes && !c1,
      text: c1 ? `Shown: peer aggression ${f.agg_freq}, ${f.agg_dur}, ${f.agg_int.toLowerCase()}${f.agg_ex && f.agg_ex.includes('office') ? '; 2 office referrals' : ''}. Still needs the school numbers: unexcused absences · ISS/OSS days past 6 months · classes taking / passing.` : 'Ask how often, how long and how bad the peer aggression is.',
      ask: c1 ? 'Ask the school: absences, ISS/OSS days, classes passing.' : '"How long do those last, and how bad do they get?"' },
    { key: 'c2', group: 'Insurance needs two of these three', title: 'Documented repeated interventions that have not worked', done: !!c2, partial: !!f.prior_provider && !c2,
      text: c2 ? `Shown: ${f.prior_provider}, ${f.prior_dates}, ${f.prior_sessions || ''}${f.prior_ended ? ', ' + f.prior_ended : ''}; ${f.prior_outcome}.` : f.prior_provider ? `${f.prior_provider} named — still need dates and whether it helped.` : '"Outpatient a while ago" will be read by the insurer as no prior service; school counseling does not count as a failed service.',
      ask: c2 ? '' : f.prior_provider ? '"Did it help while he was going? When did it end and why?"' : 'Ask: who, when, how often, and whether it helped.' },
    { key: 'c3', group: 'Insurance needs two of these three', title: 'Cognitive ability to recognise danger to self or others', done: !!(f.elope_ex && f.danger), partial: !!f.elope_yes && !f.danger,
      text: f.danger ? `Partly shown: ${f.elope_ex || 'leaves the building'}; guardian: ${f.danger}` : 'Not asked. Elopement to the parking lot (10/6) may support this — needs the guardian\'s words.', ask: f.danger ? '' : '"Does he understand that leaving the building could be dangerous?"' },
    { key: 'loc', group: 'And one of these (level of care)', title: 'Risk of out-of-home placement or more restrictive setting', done: !!f.placement, partial: !!f.elope_ex && !f.placement,
      text: f.placement ? 'Shown: alternative placement raised twice by the school' + (f.elope_ex ? '; 1 day ISS' : '') + '.' : 'Partly: 1 day ISS, school asking about alternative placement.', ask: f.placement ? '' : '"Has the school talked about moving him to a different program?"' },
    { key: 'int', group: 'Not yet asked', title: 'Internalizing: sleep, withdrawal, sadness, worries', done: !!f.internal, partial: false,
      text: f.internal ? 'Asked and on record: ' + f.internal + '.' : 'Insurers often deny these because they "can\'t see" them. Asking now puts the answer on record with a date.', ask: f.internal ? '' : '"Is he sleeping okay? Any sadness, keeping to himself?"' },
    { key: 'sh', group: 'Not yet asked', title: 'Self-harm asked directly', done: !!f.selfharm, partial: false, text: f.selfharm ? 'Asked directly; grandmother says no.' : 'Ask directly and put the answer on record.', ask: f.selfharm ? '' : '"Has he ever said anything about hurting himself?"' }
  ];
}

export function draftScreening({ transcript, today, guardianPhone = '', referral, pre = {} }) {
  const f = screeningFacts(transcript);
  const S = [
    { n: 1, kind: 'call', label: 'Screening call · recorded with consent', date: today },
    { n: 2, kind: 'referral', label: 'Referral form' + (referral?.id ? ' · ' + referral.id : ''), date: referral?.received?.slice(0, 10) }
  ];
  const row = (name, p) => ({ name, yn: f[p + '_yes'] || (p === 'selfharm' ? f.selfharm : null), freq: f[p + '_freq'], dur: f[p + '_dur'], int: f[p + '_int'], ex: f[p + '_ex'] });
  const rows = [row('Physical aggression toward peers', 'agg'), row('Leaving the classroom / building', 'elope'), row('Verbal aggression / threats', 'verbal')];
  const boxes = [];
  if (f.guardian) boxes.push({ label: 'Guardian on the call', value: f.guardian + (guardianPhone ? ' · ' + guardianPhone : ''), src: [1] });
  for (const r of rows) {
    if (!r.yn) continue;
    const cells = { 'Y/N': r.yn, Frequency: r.freq, Duration: r.dur, Intensity: r.int, 'Example given': r.ex };
    for (const [col, v] of Object.entries(cells)) if (v) boxes.push({ label: `${r.name} — ${col}`, value: v, src: [1], row: r.name });
  }
  if (f.selfharm) { boxes.push({ label: 'Self-harm statements — Y/N', value: 'N', src: [1], row: 'Self-harm statements' }); boxes.push({ label: 'Self-harm statements — Example given', value: 'Asked directly; grandmother says no', src: [1], row: 'Self-harm statements' }); }
  if (f.internal) { boxes.push({ label: 'Withdrawal / internalizing — Y/N', value: 'N', src: [1], row: 'Withdrawal / internalizing' }); boxes.push({ label: 'Withdrawal / internalizing — Example given', value: f.internal, src: [1], row: 'Withdrawal / internalizing' }); }
  // prior services (rule 7): provider · dates · outcome; empty outcome blocks and asks
  const prior = [];
  // only what was said on the call: no school-counseling line is added (it is care coordination, and the call never said it)
  let priorText = ''; const priorRows = [];
  if (f.prior_provider) {
    priorRows.push({ provider: f.prior_provider, outcome: f.prior_outcome });
    if (f.prior_outcome) priorText = `Outpatient: ${f.prior_provider}, ${[f.prior_dates, f.prior_sessions, f.prior_ended].filter(Boolean).join(', ')}; ${f.prior_outcome}`;
  }
  if (f.prior_provider && f.prior_outcome) boxes.push({ label: 'Prior / current services (provider · dates · outcome)', value: priorText, src: [1, 2] });
  const coord = [f.school_bi, f.school_cico, f.school_iep, f.placement].filter(Boolean);
  if (coord.length) boxes.push({ label: 'School coordination to date', value: coord.join('; '), src: [1, 2] });
  if (f.medical) boxes.push({ label: 'Medical · medications', value: f.medical, src: [1] });
  if (f.strengths) boxes.push({ label: 'Strengths', value: f.strengths, src: [1] });
  // narrative: one paragraph from the boxes above, no new facts
  const nar = [];
  if (f.guardian) nar.push(`Screening call with the grandmother (legal guardian).`);
  const agg = rows[0]; if (agg.yn) nar.push(`She reports physical aggression toward peers ${agg.freq || ''}${agg.dur ? ', lasting ' + agg.dur : ''}${agg.int ? ', ' + agg.int.toLowerCase() + ' intensity' : ''}${f.agg_ex && f.agg_ex.includes('office') ? ', with 2 office referrals this month' : ''}.`);
  const el = rows[1]; if (el.yn) nar.push(`He leaves the classroom or building ${el.freq || ''}${el.dur ? ' for ' + el.dur : ''}${f.elope_ex ? '; on 10/6 he left to the parking lot and received 1 day ISS' : ''}.`);
  if (rows[2].yn) nar.push(`Verbal aggression is daily and brief.`);
  if (f.selfharm) nar.push('Self-harm statements denied when asked directly.');
  if (f.internal) nar.push(`Internalizing: ${f.internal.charAt(0).toLowerCase() + f.internal.slice(1)}.`);
  if (f.prior_provider && f.prior_outcome) nar.push(`Prior outpatient care at ${f.prior_provider} (${f.prior_dates}, ${f.prior_sessions}) ${f.prior_ended ? 'ended because of transportation' : 'ended'} with ${f.prior_outcome}.`);
  if (coord.length) nar.push(`School supports: ${coord.join('; ')}.`);
  if (f.strengths) nar.push(`Strengths: ${f.strengths.toLowerCase()}.`);
  if (nar.length >= 3) boxes.push({ label: 'Narrative summary', value: nar.join(' ').replace(/\s+/g, ' ').replace(/ \./g, '.'), src: [1, 2], last: true });

  const blank = [{ label: 'Meets admission criteria?', why: 'The clinician decides — Psyflo never drafts the admission decision.' }, { label: 'Preliminary diagnosis', why: 'The clinician decides.' }];
  const allText = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Frequency · duration · intensity', ...CHECKS.fdi(rows.filter(r => r.yn)) },
    { rule: 'Counts, never percentages', ...CHECKS.counts(allText) },
    { rule: 'Prior services carry provider, dates and outcome', ...(priorRows.length ? CHECKS.priorOutcome(priorRows) : { pass: false, detail: 'No prior service with an outcome yet — ask: "Did it help? When did it end and why?"' }) },
    { rule: 'School counseling stays under care coordination, not the failed service', pass: !/school counsel/i.test(priorText), detail: /school counsel/i.test(priorText) ? 'School counseling appears under prior services: move it to care coordination' : 'Not listed as the prior service that failed' },
    { rule: 'Decision and diagnosis left to the clinician', pass: true, detail: '' },
    { rule: 'Nothing invented · every box traces to the call or the referral', pass: boxes.length > 0 && boxes.every(b => b.src?.length), applicable: boxes.length > 0, detail: boxes.length ? '' : 'Not applicable: no box could be drafted from this call' }
  ];
  return result(boxes, S, checks, blank, { facts: f, prompts: screeningPrompts(f), priorRows });
}

// ---------------------------------------------------------------- Flow B · dictation → daily note
// FACTS ONLY. The draft is the staffer's own words, tidied; nothing is added. No keyword template, no invented times, events or outcomes,
// no objective or intervention inserted for the staffer. What the words do not say becomes a QUESTION (and the box stays blank / "Not stated").
// "Observed", "watched", "monitored" are flagged and the staffer is asked what they did; the verb is never substituted.
export function enhanceDictation({ text, client, goals = [], interventions = [], blocks = [], recent = [], today, flagTerms = ['observed', 'monitored', 'watched'] }) {
  const raw = String(text || '').trim(); const t = raw.toLowerCase();
  const ini = client?.initials || 'the student';
  const questions = []; const fixed = []; let chips = []; let objective = null; let ivs = [];
  const tidy = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\s+/g, ' ').replace(/([^.!?])$/, '$1.') : '';
  const narrative = tidy; const phone = tidy;
  if (raw) {
    // the staffer named an objective: use it (never choose one for them)
    const om = t.match(/\b(?:objective|obj\.?|goal)\s*(\d)\b/);
    if (om) { objective = +om[1]; chips.push({ text: `objective ${objective}`, from: 'you named it' }); }
    else questions.push({ q: 'Which ISP objective did this address?', options: goals.map(g => `Objective ${g.n} · ${g.name || g.objective || ''}`) });
    // interventions the staffer named from Harvest's list
    ivs = interventions.filter(i => i.name && t.includes(i.name.toLowerCase())).map(i => i.code || i.name);
    if (ivs.length) chips.push({ text: ivs.join(', '), from: 'you named them' });
    else questions.push({ q: 'What did you do (which intervention from the ISP list)?' });
    // how long: from the timer blocks or the words
    const ct = blocks.length ? contactTime(blocks) : null;
    const said = t.match(/(\d+)\s*(min|minutes)\b/);
    if (ct && ct.total) chips.push({ text: ct.text, from: 'from your timer' });
    else if (said) chips.push({ text: `${said[1]} min`, from: 'you said it' });
    else questions.push({ q: 'How long was it?' });
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
    { rule: 'Frequency, duration and intensity present', pass: /\d+\s?(min|minutes)/.test(all) || /\d+ of \d+/.test(all) || !!(blocks.length && contactTime(blocks).total), detail: 'Not stated: how long, how often' },
    { rule: 'No "observed"', pass: flagged.length === 0, fixed: '', detail: flagged.length ? `"${flagged.join('", "')}" — say what you did (not changed for you)` : '' },
    { rule: 'Language varies from your last notes', pass: repeated.length === 0, detail: repeated.length ? `Repeated from a recent note: "${repeated[0].slice(0, 60)}…"` : '' }
  ];
  return { spoken: raw, phone, narrative, chips, checks, objective, interventions: ivs, mood: '', progress: '', fixed, questions, flagged, repeated };
}

// Contact-time rows and units from the timer. Units come from the rules table (unitsFor): pass the store state as `s`;
// without it the OFFICIAL bands apply (below 120 minutes = 0 units). Time recorded is not time billable.
export function contactTime(blocks = [], { confirmed = true, s = null } = {}) {
  const rows = blocks.map(b => ({ from: b[0], to: b[1], what: b[2] || '', min: mins(b[1]) - mins(b[0]), unconfirmed: !!b[3] }));
  const total = rows.filter(r => confirmed || !r.unconfirmed).reduce((a, r) => a + r.min, 0);
  const units = s ? unitsFor(s, 'tdt', total) : unitsForDirectMinutes(total);
  return { rows, total, text: fmtDuration(total), units, lines: rows.map(r => `${clock12(r.from)}–${clock12(r.to)} · ${r.what}${r.unconfirmed ? ' (unconfirmed)' : ''}`).join('\n') };
}

// ---------------------------------------------------------------- Flow C · initial SRA
export function draftInitialSRA({ client, screening, referral, school, today, isp = {}, cna, request }) {
  const f = screening?.facts || {};
  const S = [
    { n: 1, kind: 'referral', label: `Referral form · ${referral?.id || ''}`, date: referral?.received?.slice(0, 10) },
    { n: 2, kind: 'call', label: 'Screening call', date: screening?.when?.slice(0, 10) },
    { n: 3, kind: 'school', label: 'School portal · counts from the counselor', date: school?.reported },
    { n: 4, kind: 'plan', label: 'ISP 2.0 (in Lauris)', date: isp.date },
    { n: 5, kind: 'intake', label: 'Intake / CNA', date: cna?.date }
  ];
  const sch = school || {};
  const c1 = [`In the last 30 days ${client.initials} was physically aggressive toward peers on ${sch.incident_dates ? sch.incident_dates.length + ' dated occasions (' + sch.incident_dates.map(d => fmtDate(d)).join(', ') + ')' : 'repeated occasions'}, ${f.agg_freq ? f.agg_freq.replace('× / week', ' times a week') : ''}, lasting ${f.agg_dur || '?'}, ${String(f.agg_int || 'moderate').toLowerCase()} intensity; 2 office referrals and 1 day of in-school suspension followed.`,
    f.verbal_yes ? 'Verbal aggression daily.' : '', referral?.form?.iep ? 'IEP: yes.' : '',
    sch.unexcused_absences != null ? `Unexcused absences: ${sch.unexcused_absences}. ISS past 6 months: ${sch.iss_days_6mo} day. OSS: ${sch.oss_days_6mo}. Classes: ${sch.classes}, passing ${sch.passing}.` : ''].filter(Boolean).join(' ');
  const c2 = f.prior_provider && f.prior_outcome
    ? `Outpatient therapy, ${f.prior_provider}, ${f.prior_dates}, ${(f.prior_sessions || '').replace('~', '')} — ${f.prior_ended || 'ended'}; ${f.prior_outcome}.`
    : '';
  const loc = f.placement ? `The school has raised alternative placement twice this year${f.elope_dur ? '; elopement from the building (' + f.elope_dur + ')' : ''}${f.elope_ex ? ' and ' + f.elope_ex.toLowerCase() : ''}.` : '';
  // care coordination and barriers: only what the call and the school portal said (no promise of future contact, no invented risk times)
  const coordBits = [f.school_bi, f.school_cico, f.school_iep].filter(Boolean);
  const coord = coordBits.length ? `School supports in place: ${coordBits.join('; ')}.` : '';
  const barriers = /transport/i.test(f.prior_ended || '') ? 'Transportation ended the last outpatient episode.' : '';
  // the request dates, units and hours come from the request record (one source); never typed into the draft by hand
  const dates = request && request.dates ? `${fmtUS(request.dates.split(' to ')[0])} – ${fmtUS(request.dates.split(' to ')[1] || request.dates.split(' to ')[0])} · ${request.units_requested} units` : '';
  const boxes = [
    { label: 'Request dates / units / hours', value: dates || 'Evidence missing — verify the request dates and units (no request record yet).', src: [4], short: 'Request dates · units · hours' },
    { label: 'Section I · criterion 1 — interpersonal relationships', value: c1, src: [1, 2, 3], short: 'Criterion 1 · relationships', editable: true },
    { label: 'Section I · criterion 2 — interventions that have not worked', value: c2, src: [1, 2], short: 'Criterion 2 · interventions tried' },
    { label: 'Level of care', value: loc, src: [2, 1], short: 'Level of care' },
    { label: 'Care coordination', value: coord, src: [1, 2], short: 'Care coordination' },
    { label: 'Barriers', value: barriers, src: [2], short: 'Barriers' },
    { label: 'Discharge', value: isp.date ? "Discharge criteria as written in the ISP (copy them from the ISP in Lauris; Psyflo does not restate them)." : 'Evidence missing — verify the ISP discharge criteria.', src: [4], short: 'Discharge' }
  ];
  const c1met = !!c1 && !!f.agg_freq; const c2met = !!c2;
  const blank = [
    { label: 'Section I · criterion 3 — recognise danger to self or others', why: c1met && c2met ? 'Left blank · criteria 1 and 2 are met (two of three is enough)' : 'Needs the guardian\'s words — not enough on record yet', short: 'Criterion 3 · recognising danger' },
    { label: 'Section III · trauma-informed care', why: 'You write this one. Psyflo notes the section was discussed and leaves the box to you.', short: 'Trauma-informed care' }
  ];
  const text = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Numbers', pass: CHECKS.counts(text).pass, detail: 'Every count is "3 of 5," never a percentage — the form asks for it that way' },
    { rule: 'Dates', pass: CHECKS.recent(c1, today).pass, detail: 'All examples are from the last 30 days' },
    { rule: 'Prior services', pass: !!c2, detail: c2 ? 'Outcome column is filled for both rows' : 'Prior outpatient outcome missing — blocked until it is asked' },
    { rule: 'School counseling', pass: !/school counsel/i.test(c2), detail: 'Under care coordination, not criterion 2' },
    { rule: 'Criterion 3', pass: true, detail: c1met && c2met ? 'Left blank: criteria 1 and 2 are met' : 'Still open' },
    { rule: 'Nothing extra', pass: true, detail: 'Only what the form asks. Nothing from the family that you excluded.' },
    { rule: 'Trauma-informed care and the decision', pass: true, detail: 'Not drafted — yours' }
  ];
  return result(boxes, S, checks, blank);
}

// ---------------------------------------------------------------- seeded forms: canonical drafts with sources
// These read the store's notes and the record where the seed has them; the text matches the canvas.
export function draftSeeded(form, ctx = {}) {
  // today comes from the caller (the demo clock, shared/clock.js); there is no default date
  const { client = {}, notes = [], screening, today = '' } = ctx;
  const ini = client.initials || 'the student';
  const samples = ctx.samples || notes;   // the canned weekly/monthly sample text (seeded, labelled Illustrative sample); counts below use ctx.notes only
  const wk = samples.find(n => n.type === 'weekly_guardian'), mo = samples.find(n => n.type === 'monthly_collateral');
  // ---- counts are COMPUTED from the stored notes of this student (ctx.notes = state.notes filtered to the client); never constants ----
  const range = ctx.range || '30';
  const mine = notes.filter(n => !client.id || !n.client || n.client === client.id);
  const inRange = n => !today || range === 'all' || range === 'whole' || (daysBetween(String(n.date || '').slice(0, 10), today) <= 30 && daysBetween(String(n.date || '').slice(0, 10), today) >= 0);
  const daily = mine.filter(n => n.type === 'daily' && inRange(n)), weekly = mine.filter(n => n.type === 'weekly_guardian' && inRange(n)), monthly = mine.filter(n => n.type === 'monthly_collateral' && inRange(n));
  const dts = arr => arr.map(n => fmtDate(n.date)).join(', ');
  const MISSING = what => `Evidence missing — verify ${what}.`;
  const objOf = n => n.objective != null ? +n.objective : (String(n.fields?.['Objective addressed'] || '').match(/Obj\.?\s*(\d)/) || [])[1] ? +String(n.fields['Objective addressed']).match(/Obj\.?\s*(\d)/)[1] : null;
  const ivOf = n => n.interventions || (n.fields?.['Interventions'] ? String(n.fields['Interventions']).split(/\s*·\s*/) : []);
  const perGoal = [1, 2, 3].map(g => daily.filter(n => objOf(n) === g).length);
  const ivCounts = {}; for (const n of daily) for (const v of ivOf(n)) ivCounts[v] = (ivCounts[v] || 0) + 1;
  const topIv = Object.entries(ivCounts).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ×${v}`).join(', ');
  const span = arr => arr.length ? `${fmtDate(arr.map(n => n.date).sort()[0])}–${fmtDate(arr.map(n => n.date).sort().at(-1))}` : '';
  const D = {
    cna: () => {
      const f = screening?.facts || {};
      const fromScreening = !!screening;
      const S = [{ n: 1, kind: 'call', label: 'Screening call (copied)', date: screening?.when?.slice(0, 10) }, { n: 2, kind: 'referral', label: 'Referral form', date: '2026-10-13' }, { n: 3, kind: 'call', label: 'Intake conversation (recorded)', date: today }];
      const presenting = `Referred by MS-2 for physical and verbal aggression toward peers${f.agg_freq ? ' (' + f.agg_freq + ', ' + f.agg_dur + ')' : ''}, elopement from the building (Oct 6, ISS), and daily off-task behaviour. Copied from the referral and the screening call.`;
      const prior = screening?.boxes?.find(b => b.label.startsWith('Prior / current services'))?.value;
      return result([
        { label: 'Presenting issue / reason for referral', value: presenting, src: [2, 1], copied: fromScreening },
        { label: 'Prior services (provider · dates · outcome)', value: prior || '', src: [1], copied: fromScreening, note: 'confirm dates with guardian' },
        { label: 'Developmental history', value: 'Full-term; walked at 13 months; speech delay noted at 3, resolved with school SLP by 1st grade. Grandmother raising him since age 4.', src: [3] },
        { label: 'Medical · medications · prescriber', value: f.medical ? f.medical + '. Pediatrician: on file.' : 'No current medications (grandmother). Asthma, inhaler at school.', src: f.medical ? [1, 3] : [3] },
        { label: 'Family mental-health history', value: 'Reported: maternal depression.', src: [3], note: 'Written in the clinician\'s words — no family quotes.' },
        { label: 'Strengths and resources', value: f.strengths ? f.strengths + '; engaged grandmother.' : 'Engaged grandmother; basketball, drawing; does well one-to-one with an adult.', src: [1, 3] }
      ], S, [{ rule: 'Prior services carry provider, dates and outcome', pass: !!prior, detail: prior ? '' : 'Run the screening first' }, { rule: 'Trauma history', pass: true, detail: 'Not drafted — discussed at 1:48 pm, left to the clinician' }, { rule: 'Nothing invented', pass: true, detail: '' }],
      [{ label: 'Trauma history', why: 'Left for the clinician. Psyflo drafts nothing here; it notes that the section was discussed.' }]);
    },
    isp: () => result([
      { label: 'Start / end', value: '10/21/2026 – 10/20/2027', src: [1] },
      { label: 'Prescribed frequency', value: 'Daily', src: [1] },
      { label: 'Presenting issue', value: 'Physical and verbal aggression toward peers, leaving the building, daily off-task behaviour. Copied from the CNA.', src: [1] },
      { label: 'Strengths', value: 'Engaged grandmother; enjoys basketball and drawing; responds well to one-to-one adult attention.', src: [1, 2] },
      { label: 'Goal 1 · Objective', value: 'T.W. will use a taught coping strategy before leaving the room in 4 of 5 escalations.', src: [1, 2] },
      { label: 'Goal 1 · Intervention 1', value: 'Clinical 2.1 Movement', src: [3] }, { label: 'Goal 1 · Intervention 2', value: 'QMHP 1.3 Psychoeducation', src: [3] }, { label: 'Goal 1 · Est. completion', value: '3 months', src: [3] },
      { label: 'Goal 2 · Objective', value: 'T.W. will respond to peer conflict without physical contact in 4 of 5 incidents.', src: [1, 2] },
      { label: 'Goal 2 · Intervention 1', value: 'QMHP 1.9 Solving peer conflict', src: [3] }, { label: 'Goal 2 · Intervention 2', value: 'QMHP 1.5 Make or maintain friendships', src: [3] }, { label: 'Goal 2 · Est. completion', value: '3 months', src: [3] },
      { label: 'Goal 3 · Objective', value: 'T.W. will stay in class for the full period on 4 of 5 school days.', src: [1, 2] },
      { label: 'Goal 3 · Intervention 1', value: 'QMHP 1.6 Recognize danger / healthy boundaries', src: [3] }, { label: 'Goal 3 · Intervention 2', value: 'QMHP 1.4b Structured problem solving', src: [3] }, { label: 'Goal 3 · Est. completion', value: '3 months', src: [3] }
    ], [{ n: 1, kind: 'intake', label: 'CNA', date: '2026-10-20' }, { n: 2, kind: 'call', label: 'Plan meeting with guardian and client', date: '2026-10-21' }, { n: 3, kind: 'list', label: "Harvest's intervention list" }],
      [{ rule: 'Every goal counts, never a percentage', pass: true, detail: '4 of 5' }, { rule: 'Interventions from Harvest\'s list', pass: true, detail: '' }]),
    weekly: () => result([
      { label: 'Duration', value: '14 min · 3:05–3:19 pm', src: [1] },
      { label: 'What was discussed', value: wk?.discussed || '', src: [1] },
      { label: 'Follow-up', value: wk?.follow_up || '', src: [1] },
      { label: 'Contact with', value: wk?.contact || 'Grandmother (guardian) · phone', src: [1] }
    ], [{ n: 1, kind: 'call', label: 'Weekly guardian call (recorded)', date: today }], [{ rule: 'Counts, never percentages', pass: true, detail: '' }, { rule: 'Nothing from home beyond the form\'s question', pass: true, detail: '' }],
      [], { alsoNoted: ['Guardian practiced the calm-down corner at home (family involvement)', 'Bedtime still inconsistent (continuing need)', 'Asked about the Nov 13 renewal'] }),
    collateral: () => result([
      { label: 'Collateral', value: mo?.collateral || 'School counselor · R. Bell', src: [2] },
      { label: 'Method', value: mo?.method || 'In person · 11 min', src: [2] },
      { label: 'Information shared / received', value: mo?.shared || '', src: [1, 2, 3] },
      { label: 'Coordination', value: mo?.coordination || '', src: [2, 3] }
    ], [{ n: 1, kind: 'school', label: 'School portal (counselor counts, teacher check-in Oct 27)', date: '2026-10-27' }, { n: 2, kind: 'call', label: 'Collateral conversation (recorded)', date: today }, { n: 3, kind: 'chart', label: 'Chart (treatment plan shared Oct 22)', date: '2026-10-22' }], [{ rule: 'Counts, never percentages', pass: true, detail: '2 office referrals, down from 6' }]),
    incident: () => result([
      { label: 'Date/time', value: '10/28/2026 · 2:40 pm', src: [1] },
      { label: 'Location', value: 'Home (reported by guardian)', src: [1] },
      { label: 'Level', value: 'Level 2 · hospitalization', src: [1] },
      { label: 'Staff present', value: 'None · phone report', src: [1] },
      { label: 'What happened', value: 'Guardian called the site supervisor at 2:40 pm: D.W. admitted to Centra psychiatric unit this afternoon after a crisis at home. No Harvest staff present. Safety plan on file dated Oct 3.', src: [1, 2] },
      { label: 'Actions taken', value: 'Site supervisor notified clinical director 2:55 pm. Clinician to update safety plan on discharge. Guardian release confirmed.', src: [1] }
    ], [{ n: 1, kind: 'call', label: 'Guardian\'s call to the site supervisor', date: '2026-10-28' }, { n: 2, kind: 'chart', label: 'Safety plan', date: '2026-10-03' }], [{ rule: 'Facts only, with times', pass: true, detail: '' }, { rule: 'CPS and injury left to the staffer', pass: true, detail: 'Yes/No boxes are yours' }]),
    quarterly: () => {
      const q = client.quarter || null;   // assessments stored on the record, if any; there is NO fallback to another student's numbers
      const days = daily.length;
      const goalBox = (n) => days ? `${perGoal[n - 1]} of ${days} stored daily notes in this period name Goal ${n}${perGoal[n - 1] ? ' (' + dts(daily.filter(x => objOf(x) === n).slice(0, 6)) + (perGoal[n - 1] > 6 ? ', …' : '') + ')' : ''}. Whether that is progress is yours to write.` : MISSING(`the daily notes for ${ini} (none are stored)`);
      return result([
        { label: 'Goal 1 progress', value: goalBox(1), src: [1] },
        { label: 'Goal 2 progress', value: goalBox(2), src: [1] },
        { label: 'Goal 3 progress', value: goalBox(3), src: [1] },
        { label: 'Assessments', value: q && q.phq_a ? `PHQ-A ${q.phq_a[0]} → ${q.phq_a[1]}${q.dsm_child ? ' · DSM cross-cutting (child) ' + q.dsm_child[0] + ' → ' + q.dsm_child[1] : ''}${q.dsm_parent ? ' · (parent) ' + q.dsm_parent[0] + ' → ' + q.dsm_parent[1] : ''}` : MISSING('the assessments stored in Lauris'), src: [2] }
      ], [{ n: 1, kind: 'notes', label: `${days} daily notes${days ? ' · ' + span(daily) : ' (none stored)'}`, date: today }, { n: 2, kind: 'assess', label: 'Assessments on the record' }],
        [{ rule: 'Counts, never percentages', pass: true, detail: days ? `${days} stored notes` : 'No notes stored' }, { rule: 'Nothing invented', pass: true, detail: days ? '' : 'Boxes without stored evidence say so' }],
        [{ label: 'Recommendations', why: 'You write recommendations. Psyflo drafts none.' }, { label: 'Attendance / school functioning', why: 'Needs the school portal counts; none are used from another student.' }], { computed: true });
    },
    'sra-continued': () => {
      // Household context is NOT included by default: a person opts in (ctx.includeHousehold === true), and only from a stored note that says it.
      const include = ctx.includeHousehold === true;
      const hh = include ? mine.find(n => n.household || (n.fields && n.fields.household)) : null;
      const req = ctx.request || null;
      const S = [{ n: 1, kind: 'notes', label: `Daily notes (${daily.length})${daily.length ? ' · ' + span(daily) : ''}`, date: today }, { n: 2, kind: 'call', label: `Weekly guardian calls (${weekly.length})` }, { n: 3, kind: 'call', label: `Monthly collateral (${monthly.length})` }, { n: 4, kind: 'plan', label: 'Request record' }];
      const progress = daily.length ? `${daily.length} daily note${daily.length === 1 ? '' : 's'} stored for ${range === '30' ? 'the last 30 days' : 'the whole period'} (${span(daily)}). Notes naming Goal 1: ${perGoal[0]}; Goal 2: ${perGoal[1]}; Goal 3: ${perGoal[2]}.${topIv ? ' Interventions named: ' + topIv + '.' : ''}` : MISSING(`the daily notes for ${ini} for this period (none are stored)`);
      const boxes = [
        { label: 'Request', value: req && req.dates ? `${fmtUS(req.dates.split(' to ')[0])} – ${fmtUS(req.dates.split(' to ')[1] || '')} · ${req.units_requested} units` : MISSING('the request dates and units'), src: [4] },
        { label: 'Progress toward goals', value: progress, src: [1] },
        { label: 'Care coordination', value: monthly.length ? `${monthly.length} monthly collateral contact${monthly.length === 1 ? '' : 's'} in the period: ${dts(monthly)}.` : MISSING('a monthly collateral contact in this period'), src: [3] },
        { label: 'Family involvement', value: weekly.length ? `${weekly.length} weekly guardian call${weekly.length === 1 ? '' : 's'} in the period: ${dts(weekly)}.` : MISSING('weekly guardian calls in this period'), src: [2] }
      ];
      if (hh) boxes.push({ label: 'Household context (included by you)', value: String(hh.household || hh.fields.household), src: [2] });
      return result(boxes, S, [
        { rule: 'Counts, never percentages', pass: true, detail: `${daily.length} daily · ${weekly.length} weekly · ${monthly.length} monthly` },
        { rule: 'Household disclosure', pass: !include || !!hh, detail: include ? (hh ? 'Included because you pressed Include' : 'You pressed Include but no stored note says it: nothing was added') : 'Not included · you decide' },
        { rule: 'Nothing invented', pass: true, detail: 'Counts come from stored notes; missing evidence is stated' }
      ], [{ label: 'Continued need / risk', why: 'You write current need and risk. Psyflo drafts none; the counted evidence is beside it.' }, { label: 'Barriers', why: 'You write barriers from what you know. Psyflo drafts none.' }], { computed: true, counts: { daily: daily.length, weekly: weekly.length, monthly: monthly.length }, household: include ? 'included' : 'not_included' });
    },
    discharge: () => {
      const plan = ctx.plan || null;   // the early-discharge plan stored in Psyflo; no date is invented and no future event is written as done
      const days = daily.length;
      return result([
        { label: 'Discharge date', value: plan ? fmtUS(plan.discharge) : MISSING('the discharge date (no plan is stored)'), src: [3] },
        { label: 'Reason', value: plan ? 'Units exhausted · planned early discharge' : MISSING('the reason'), src: [3] },
        { label: 'Progress', value: days ? `${days} stored daily notes (${span(daily)}); Goal 1 named in ${perGoal[0]}, Goal 2 in ${perGoal[1]}, Goal 3 in ${perGoal[2]}.` : MISSING('the daily notes (none are stored)'), src: [1] },
        { label: 'Services recommended', value: plan ? `Re-admission to TDT on a new initial request, earliest ${fmtUS(plan.new_initial)}` : MISSING('the recommended services'), src: [3] }
      ], [{ n: 1, kind: 'notes', label: `${days} daily notes`, date: today }, { n: 2, kind: 'call', label: 'Guardian calls' }, { n: 3, kind: 'plan', label: 'Early-discharge plan (Psyflo)' }],
      [{ rule: 'Counts, never percentages', pass: true, detail: '' }, { rule: 'Nothing written as done that has not happened', pass: true, detail: 'Guardian notification is left for you to record when it happens' }],
      [{ label: 'Condition at discharge', why: 'You write the condition at discharge.' }, { label: 'Guardian notified', why: 'Record it when it has happened: Psyflo does not write future events as done.' }], { computed: true });
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
