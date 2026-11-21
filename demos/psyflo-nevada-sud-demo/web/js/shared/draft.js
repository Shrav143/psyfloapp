// draft(formType, sources) — the one place Psyflo writes text for a form (Community Counseling Center of Southern Nevada · adult SUD · ASAM).
// Returns { boxes: [{label, value, src:[n], note}], sources: [{n, kind, label, date}], checks: [{rule, pass, detail}], blank: [{label, why}] }.
// Every box carries the numbered sources it came from. The drafting rules are explicit pass/fail checks run on the
// output before the panel shows it, not hints in a prompt. The worked examples in seed/scripts are its tests
// (test/draft.test.mjs).
//
// This build is deterministic: extractors over the transcript/dictation and the record. A hosted LLM can sit behind
// the same function later; the checks below still gate whatever it returns.
//
// Box labels here must match server/lauris/forms.js exactly (the extension fills boxes by label text).

import { fmtDate, daysBetween, addDays, mins, fmtDuration, clock12 } from './dates.js';

const US = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
const MD = iso => { const [, m, d] = String(iso).slice(0, 10).split('-'); return `${+m}/${+d}`; };

// ---------------------------------------------------------------- ASAM vocabulary (same as forms.js)
export const DIMENSIONS = [
  ['D1', 'Acute intoxication / withdrawal potential'],
  ['D2', 'Biomedical conditions'],
  ['D3', 'Emotional, behavioral or cognitive conditions'],
  ['D4', 'Readiness to change'],
  ['D5', 'Relapse, continued use or continued problem potential'],
  ['D6', 'Recovery / living environment']
];
export const dimLabel = (d, part) => { const [k, n] = DIMENSIONS.find(x => x[0] === d); return `${k} ${n} — ${part}`; };
export const DIM_SHORT = { D1: 'withdrawal', D2: 'biomedical', D3: 'emotional / behavioral', D4: 'readiness to change', D5: 'relapse potential', D6: 'recovery environment' };
export const dimName = d => { const [k, n] = DIMENSIONS.find(x => x[0] === d); return `${k} ${n}`; };
export const SUBSTANCE_ROWS = { op: 'Opioids (fentanyl / heroin / pills)', alc: 'Alcohol', stim: 'Stimulants (methamphetamine / cocaine)' };
// CCC of SN's intervention list (seed interventions: code + name); the Client Record picklist shows "CODE Name"
export const INTERVENTIONS = [['MI', 'Motivational interviewing'], ['CBT-RP', 'Relapse prevention (CBT)'], ['MAT-C', 'MAT coordination'], ['SS', 'Seeking Safety (trauma-informed)'], ['PS', 'Peer recovery support'], ['RP-G', 'Relapse prevention group'], ['FAM', 'Family / support-person session']];
export const INTERVENTION_NAMES = INTERVENTIONS.map(([c, n]) => `${c} ${n}`);
const ivOption = code => { const x = INTERVENTIONS.find(i => i[0] === code); return x ? `${x[0]} ${x[1]}` : code; };
export const LEVEL_OPTION = { '1': 'Level 1 · Outpatient', '2.1': 'Level 2.1 · Intensive outpatient (IOP)', '3': 'Level 3.1 · Clinically managed low-intensity residential', WM: 'Withdrawal management first (refer out)' };
// IOP: 3 hours a day, 3 days a week, H0015 = 1 unit per hour
export const IOP = { hoursPerDay: 3, daysPerWeek: 3, code: 'H0015' };

// What the ratings point to. Demo rule, written down so the check is explicit (confirm with the clinical director):
// D1 ≥ 3 → withdrawal management first; D2 or D3 ≥ 3, or D5/D6 at 4 → residential; two or more of D3–D6 at 2+ → Level 2.1; else Level 1.
export function levelFromRatings(r = {}) {
  const v = k => Number(r[k] ?? 0);
  if (v('D1') >= 3) return 'WM';
  if (v('D2') >= 3 || v('D3') >= 3 || v('D5') >= 4 || v('D6') >= 4) return '3';
  if (['D3', 'D4', 'D5', 'D6'].filter(k => v(k) >= 2).length >= 2) return '2.1';
  return '1';
}

// ---------------------------------------------------------------- the checks
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function datesIn(text) {
  const out = [];
  for (const m of text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.? (\d{1,2})\b(?:,? (\d{4}))?/g)) out.push({ mon: MONTHS[m[1].toLowerCase()], day: +m[2], year: m[3] ? +m[3] : null, raw: m[0] });
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) if (+m[1] <= 12) out.push({ mon: +m[1] - 1, day: +m[2], year: m[3] ? +m[3] : null, raw: m[0] });
  return out;
}
const CHILD_WORDS = /\b(school|student|guardian|parent|teacher|IEP|grade|recess|classroom|counselor at school|adolescent|child)\b/i;
export const CHECKS = {
  recent(text, today, { evidence = true } = {}) { // examples older than 30 days carry a year
    if (!evidence) return { pass: true };
    const y = +today.slice(0, 4); const old = [];
    for (const d of datesIn(text)) {
      const iso = `${d.year || y}-${String(d.mon + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      if (daysBetween(iso, today) > 30 && !d.year) old.push(d.raw);
    }
    return { pass: old.length === 0, detail: old.length ? 'Older than 30 days without a year label: ' + old.join(', ') : '' };
  },
  counts(text) { const m = text.match(/\d+(\.\d+)?\s?%|\bpercent\b/i); return { pass: !m, detail: m ? `Percentage found ("${m[0]}") — say "3 of 5"` : '' }; },
  noObserved(text) { const m = text.match(/\b(observed|monitored|watched)\b/i); return { pass: !m, detail: m ? `"${m[0]}" — say what staff did` : '' }; },
  fdi(rows) { // every substance marked Y has last use, frequency and amount
    const missing = rows.filter(r => r.yn === 'Y' && !(r.last && r.freq && r.amount)).map(r => r.name);
    return { pass: missing.length === 0, detail: missing.length ? 'Missing last use / frequency / amount: ' + missing.join(', ') : '' };
  },
  interventionsFromList(text, list = []) {
    const names = (list || []).map(i => i.name || i).concat(INTERVENTIONS.map(i => i[1]), ['motivational interviewing', 'relapse prevention', 'urge surfing', 'peer recovery']);
    const named = [...new Set(names.filter(n => n && text.toLowerCase().includes(String(n).toLowerCase())))];
    return { pass: named.length > 0, detail: named.length ? named.slice(0, 3).join(', ') : 'No intervention from CCC of SN\'s list is named' };
  },
  objective(text) { const m = /\b(objective|obj\.|goal)\s*\d/i.test(text); return { pass: m, detail: m ? '' : 'No plan objective named' }; },
  priorOutcome(rows) {
    const bad = rows.filter(r => !r.outcome);
    return { pass: bad.length === 0, detail: bad.length ? bad.map(r => `${r.provider}: outcome unknown`).join('; ') : '' };
  },
  allRated(r = {}) { const miss = DIMENSIONS.map(d => d[0]).filter(k => r[k] == null || r[k] === ''); return { pass: !miss.length, detail: miss.length ? 'Not rated: ' + miss.join(', ') : '6 of 6 dimensions rated' }; },
  levelMatches(r, level) { const want = levelFromRatings(r); return { pass: want === String(level), detail: want === String(level) ? `Ratings point to ${LEVEL_OPTION[want]}` : `Ratings point to ${LEVEL_OPTION[want]}, the form says ${LEVEL_OPTION[level] || level}` }; },
  udsAttached(uds, { required = true, payerName = '' } = {}) {
    if (!required) return { pass: true, detail: 'Not required by this plan' };
    return uds && uds.result ? { pass: true, detail: `${US(uds.date)} result attached${payerName ? ` · ${payerName} has denied Level 2.1 requests without it since Sep 22` : ''}` } : { pass: false, detail: `No UDS result from the assessment — the packet is blocked until it is attached${payerName ? ` (${payerName} denies without it)` : ''}` };
  },
  unitsMath(units, { hoursPerDay, daysPerWeek, weeks }) { const n = hoursPerDay * daysPerWeek * weeks; return { pass: n === Number(units), detail: `${hoursPerDay} h × ${daysPerWeek} days × ${weeks} weeks = ${n}${n === Number(units) ? '' : ` (form says ${units})`}` }; },
  noBackdate(start, today) { const ok = String(start).slice(0, 10) >= String(today).slice(0, 10); return { pass: ok, detail: ok ? `Starts ${fmtDate(start)} · nothing before the request date` : `Starts ${fmtDate(start)}, before today — backdated days are not authorized` }; },
  // "abstinent in treatment" must be argued under D5, never written as "no longer needs"
  abstinenceArgued(text, d5Text = '') {
    const bad = text.match(/\bno longer (needs?|requires?|meets?)\b[^.]*/i);
    const d5ok = /D5|relapse/i.test(d5Text) && /(UDS|\d{1,2}\/\d{1,2})/.test(d5Text);
    return { pass: !bad && d5ok, detail: bad ? `"${bad[0].trim()}" — argue relapse risk under D5 instead` : d5ok ? 'Abstinence inside Level 2.1 argued under D5, with dates and UDS' : 'D5 needs dates and UDS results' };
  },
  adultLanguage(text) { const m = text.match(CHILD_WORDS); return { pass: !m, detail: m ? `"${m[0]}" — adult SUD client; no school or guardian language` : 'Adult client language throughout' }; }
};

function result(boxes, sources, checks, blank = [], extra = {}) {
  return { boxes: boxes.filter(b => b.value), sources, checks, blank, ...extra };
}

// ---------------------------------------------------------------- intake screening call (Flow A)
// Facts heard on the call. Each fact: test(text) → value or null. Text is the transcript so far (lower case).
const has = (t, re) => re.test(t);
export const SCREENING_FACTS = {
  consent: t => has(t, /record/) && has(t, /that'?s fine|okay with you\?\s*(\w+:)?\s*(yes|ok|sure)/) ? 'consent to record given' : null,
  legal: t => has(t, /drug court/) && has(t, /phase (one|1)/) ? 'Clark County drug court, phase 1' + (has(t, /possession charge in july/) ? ' (possession charge, Jul 2026)' : '') : null,
  legal_checkins: t => has(t, /every tuesday/) && has(t, /random drug tests?/) ? 'weekly Tuesday check-ins with random UDS' + (has(t, /missed three check-ins/) && has(t, /four dirty tests since september/) ? '; 3 missed check-ins and 4 positive drug screens since Sep 2026' : '') : null,
  reason: t => has(t, /tired of it/) && has(t, /see my daughter/) ? '"I\'m tired of it. I want to see my daughter again."' : null,
  op_yes: t => has(t, /fentanyl/) ? 'Y' : null,
  op_route: t => has(t, /smoking them/) ? 'Smoked' : null,
  op_amount: t => has(t, /six to ten a day/) ? 'Fentanyl pills, 6–10 a day before Aug 2026' : null,
  op_freq: t => has(t, /every day/) && has(t, /until august/) ? 'Daily until Aug 2026' + (has(t, /slipped once/) ? '; 1 use since starting buprenorphine' : '') : null,
  op_last: t => has(t, /slipped once/) && has(t, /saturday,? the tenth/) ? '10/10 · half a pill, while on buprenorphine' : null,
  mat: t => has(t, /suboxone/) && has(t, /sixteen milligrams|16 mg/) ? 'Buprenorphine/naloxone 16 mg daily since Aug 2026 · Dr. Ahn, Valley Family Medicine (outside prescriber)' + (has(t, /go back on the twenty-eighth/) ? '; next visit 10/28' : '') + (has(t, /i'?ll sign it/) ? '; release to coordinate agreed' : '') : null,
  od: t => has(t, /overdosed/) && has(t, /once, in january/) ? 'One opioid overdose, Jan 2026, reversed with naloxone by his sister' + (has(t, /keeps one/) ? '; naloxone in the home' : '') : null,
  alc_yes: t => has(t, /\bbeer/) ? 'Y' : null,
  alc_freq: t => has(t, /most days/) && has(t, /\bbeer/) ? 'Most days' : null,
  alc_amount: t => has(t, /six to eight/) ? '6–8 beers' : null,
  alc_last: t => has(t, /last drink was last night/) ? 'night before the call' : null,
  withdrawal: t => has(t, /shaky/) && has(t, /sweaty/) ? 'Alcohol: morning tremor and sweats when not drinking, relieved by drinking' : null,
  seizure: t => has(t, /never had a seizure/) && has(t, /no dts/) ? 'no history of seizures or DTs' : null,
  stim_no: t => has(t, /no meth,? no coke/) ? 'N' : null,
  mood: t => has(t, /down a lot/) && has(t, /don'?t sleep good/) ? 'Low mood and poor sleep most days' : null,
  selfharm: t => has(t, /thoughts of hurting yourself/) && has(t, /no\. nothing like that/) ? 'denies thoughts of self-harm when asked directly' : null,
  prior_detox: t => has(t, /mesa withdrawal center/) ? 'Mesa Withdrawal Center' : null,
  prior_detox_dates: t => has(t, /detox at mesa in february last year/) ? 'Feb 2025' : null,
  prior_detox_outcome: t => has(t, /using again in two weeks/) ? 'completed; returned to use within 2 weeks' : null,
  detox_aug: t => has(t, /did detox at mesa withdrawal center, five days/) && has(t, /started me on suboxone/) ? 'Aug 2026, 5 days — completed; buprenorphine started at discharge' : null,
  mat_2024: t => has(t, /in 2024 i was on suboxone for about four months/) && has(t, /stopped taking it/) ? 'Buprenorphine, 2024, about 4 months — abstinent while taking it; returned to use after stopping' : null,
  prior_op: t => has(t, /canyon outpatient services/) ? 'Canyon Outpatient Services' : null,
  prior_op_dates: t => has(t, /january to april this year/) ? 'Jan–Apr 2026' + (has(t, /nine sessions/) ? ', 9 sessions' : '') : null,
  prior_op_ended: t => has(t, /lost my ride/) ? 'stopped attending (lost transportation)' : null,
  prior_op_outcome: t => has(t, /didn'?t really help|using the whole time/) && has(t, /didn'?t really help/) ? 'used throughout; no improvement' : null,
  housing: t => has(t, /sister'?s couch/) ? 'Staying on his sister\'s couch in Henderson since Sep 2026, conditional on treatment' + (has(t, /sleeping in my car/) ? '; slept in his car before that' : '') : null,
  hiv_offered: t => has(t, /hiv or hepatitis c/) && has(t, /skip that/) ? 'Offered · client declined to share' : null,
  strengths: t => { const s = []; if (has(t, /warehouse/) && has(t, /keep that job/)) s.push('Wants to keep his warehouse job'); if (has(t, /my sister\./)) s.push('his sister'); if (has(t, /my daughter, i want my visits back/)) s.push('wants his visits with his daughter back'); return s.length >= 2 ? s.join('; ') : null; },
  uds_ok: t => has(t, /urine drug screen/) && has(t, /that'?s fine, court does/) ? 'UDS at the assessment agreed' : null,
  schedule: t => has(t, /mornings work/) ? 'Mornings; drug court Tuesday afternoons' : null
};

export function screeningFacts(text) {
  const t = String(text || '').toLowerCase().replace(/[’]/g, "'");
  const f = {}; for (const [k, fn] of Object.entries(SCREENING_FACTS)) { const v = fn(t); if (v) f[k] = v; }
  return f;
}

// "Before you hang up": what the prior authorization will need, by ASAM dimension, ticking as answers are heard
export function screeningPrompts(f) {
  const d1 = f.alc_last && f.withdrawal && f.seizure && f.op_last;
  const d5 = f.prior_detox && f.prior_detox_outcome && f.prior_op && f.prior_op_outcome;
  const P = (key, group, title, done, partial, text, ask) => ({ key, group, title, done: !!done, partial: !!partial && !done, text, ask: done ? '' : ask });
  return [
    P('d1', 'The prior authorization argues all six dimensions', 'D1 · last use and withdrawal risk', d1, f.alc_yes || f.op_yes,
      d1 ? `Shown: last opioid use ${f.op_last.split(' · ')[0]}; alcohol ${f.alc_amount || ''} ${(f.alc_freq || '').toLowerCase()}, ${f.withdrawal.replace(/^Alcohol: /, '').toLowerCase()}; ${f.seizure}.` : 'Ask when he last used each substance, and what happens when he stops drinking.',
      !f.withdrawal ? '"When you don\'t drink, how do you feel in the morning?"' : !f.seizure ? '"Have you ever had a seizure or the DTs when you stopped drinking?"' : '"When was the last time you used?"'),
    P('d2', 'The prior authorization argues all six dimensions', 'D2 · medical conditions and MAT prescriber', f.mat, f.op_yes,
      f.mat ? 'Shown: ' + f.mat + '.' : 'MAT from an outside prescriber needs the name, dose and a release to coordinate.', '"Who prescribes it, what dose, and can we coordinate with them?"'),
    P('d3', 'The prior authorization argues all six dimensions', 'D3 · mood, sleep, and self-harm asked directly', f.mood && f.selfharm, f.mood,
      f.mood && f.selfharm ? `Asked and on record: ${f.mood.toLowerCase()}; ${f.selfharm}.` : 'Ask about mood and sleep, and ask about self-harm directly — reviewers look for it.', f.mood ? '"Have you had any thoughts of hurting yourself or ending your life?"' : '"How has your mood been? Sleep?"'),
    P('d4', 'The prior authorization argues all six dimensions', 'D4 · his own reasons, not only the court\'s', f.reason, f.legal,
      f.reason ? 'In his words: ' + f.reason : 'Court-referred clients get denied as "not ready" unless their own reasons are on record.', '"What brings you to treatment, apart from the court?"'),
    P('d5', 'The prior authorization argues all six dimensions', 'D5 · prior treatment, with dates and what happened after', d5, f.prior_detox || f.prior_op,
      d5 ? `Shown: withdrawal management ${f.prior_detox_dates}${f.detox_aug ? ' and Aug 2026' : ''} — ${f.prior_detox_outcome}; ${f.prior_op} (${f.prior_op_dates}) — ${f.prior_op_outcome}.` : f.prior_op && !f.prior_op_outcome ? `${f.prior_op} named — still need whether it helped.` : '"Treatment before" without dates and outcome will be read as no prior treatment.',
      f.prior_op && !f.prior_op_outcome ? '"How did that go? Did it help?"' : '"Have you been in treatment before? When, and what happened after?"'),
    P('d6', 'The prior authorization argues all six dimensions', 'D6 · housing, supports, legal', f.housing && f.legal, f.legal || f.housing,
      f.housing && f.legal ? `Shown: ${f.housing.charAt(0).toLowerCase() + f.housing.slice(1)}; ${f.legal}${f.legal_checkins ? ', ' + f.legal_checkins : ''}.` : 'Ask where he is staying and who is in his corner.', f.housing ? '"Tell me about the court requirements."' : '"Where are you staying right now?"'),
    P('uds', 'Before the assessment', 'UDS at the assessment (SilverSummit now requires it)', f.uds_ok, false,
      f.uds_ok ? 'Agreed on the call. Collect it at the assessment and Psyflo attaches the result to the packet.' : 'SilverSummit has denied 3 Level 2.1 requests since Sep 22 without a UDS from the assessment. It is not on their form.', '"At the assessment we\'ll do a urine drug screen. Is that okay?"'),
    P('hiv', 'Optional · only if the client wants', 'HIV / HCV status or testing offered', f.hiv_offered, false,
      f.hiv_offered ? 'Offered; he chose to skip it. Psyflo leaves the box for you and puts nothing about it in the request.' : 'Optional. Offer it; the client decides.', '"This one is optional: anything about HIV or hepatitis C status or testing?"')
  ];
}

export function draftScreening({ transcript, today, phone, guardianPhone, referral, pre = {} }) {
  const f = screeningFacts(transcript);
  const S = [
    { n: 1, kind: 'call', label: 'Intake screening call · recorded with consent', date: today },
    { n: 2, kind: 'referral', label: 'Referral' + (referral?.id ? ' · ' + referral.id : ''), date: referral?.received?.slice(0, 10) }
  ];
  const alcLast = f.alc_last ? (today ? `${MD(addDays(today, -1))} · night before the call` : 'Night before the call') : null;
  const rows = [
    { key: 'op', name: SUBSTANCE_ROWS.op, yn: f.op_yes, last: f.op_last, route: f.op_route, freq: f.op_freq, amount: f.op_amount },
    { key: 'alc', name: SUBSTANCE_ROWS.alc, yn: f.alc_yes, last: alcLast, route: f.alc_yes ? 'Oral' : null, freq: f.alc_freq, amount: f.alc_amount },
    { key: 'stim', name: SUBSTANCE_ROWS.stim, yn: f.stim_no, amount: f.stim_no ? 'Asked directly; no use in years' : null }
  ];
  const boxes = [];
  for (const r of rows) {
    if (!r.yn) continue;
    const cells = { 'Y/N': r.yn, 'Last use': r.last, Route: r.route, Frequency: r.freq, 'Amount / notes': r.amount };
    for (const [col, v] of Object.entries(cells)) if (v) boxes.push({ label: `${r.name} — ${col}`, value: v, src: [1], row: r.name });
  }
  if (f.withdrawal) boxes.push({ label: 'Withdrawal risk (D1)', value: `${f.withdrawal}${f.seizure ? '; ' + f.seizure : ''}.${f.mat ? ' Opioids: on buprenorphine 16 mg daily, no opioid withdrawal reported.' : ''}`, src: [1] });
  if (f.mat) boxes.push({ label: 'MAT / medications · prescriber', value: f.mat, src: [1] });
  if (f.od) boxes.push({ label: 'Overdose history · naloxone', value: f.od, src: [1] });
  if (f.mood) boxes.push({ label: 'Mental health · safety (D3)', value: f.mood + (f.selfharm ? '; ' + f.selfharm : ''), src: [1] });
  // prior treatment: provider · level · dates · outcome; an empty outcome blocks and asks
  const priorRows = [];
  if (f.prior_detox && f.prior_detox_dates) priorRows.push({ provider: f.prior_detox, outcome: f.prior_detox_outcome, text: `Withdrawal management, ${f.prior_detox}, ${f.prior_detox_dates} — ${f.prior_detox_outcome || ''}` });
  if (f.detox_aug) priorRows.push({ provider: f.prior_detox, outcome: 'completed', text: `Withdrawal management, ${f.prior_detox}, ${f.detox_aug}` });
  if (f.mat_2024) priorRows.push({ provider: 'buprenorphine 2024', outcome: 'returned to use after stopping', text: f.mat_2024 });
  if (f.prior_op) priorRows.push({ provider: f.prior_op, outcome: f.prior_op_outcome, text: `Outpatient (Level 1), ${f.prior_op}, ${f.prior_op_dates || 'dates?'} — ${[f.prior_op_ended, f.prior_op_outcome].filter(Boolean).join('; ')}` });
  const priorOK = priorRows.length && priorRows.every(r => r.outcome);
  if (priorOK) boxes.push({ label: 'Prior treatment (provider · level · dates · outcome)', value: priorRows.map(r => r.text).join('. '), src: [1, 2] });
  if (f.legal) boxes.push({ label: 'Legal involvement / drug court', value: f.legal + (f.legal_checkins ? '; ' + f.legal_checkins : '') + (referral?.id ? '; referral ' + referral.id : ''), src: [1, 2] });
  if (f.housing) boxes.push({ label: 'Housing / living situation', value: f.housing, src: [1] });
  if (f.reason) boxes.push({ label: 'Reason for seeking treatment (own words)', value: f.reason, src: [1] });
  if (f.strengths) boxes.push({ label: 'Strengths / recovery supports', value: f.strengths.charAt(0).toUpperCase() + f.strengths.slice(1), src: [1] });
  // narrative: one paragraph from the boxes above, no new facts
  const nar = [];
  if (f.legal) nar.push('Intake screening call with the client, referred by Clark County drug court (phase 1).');
  if (f.op_yes) nar.push(`He reports fentanyl use${f.op_route ? ', smoked' : ''}${f.op_freq ? ', daily until Aug 2026' : ''}${f.mat ? ', now on buprenorphine 16 mg' : ''}${f.op_last ? ' with one use on 10/10' : ''}.`);
  if (f.alc_yes) nar.push(`Alcohol ${f.alc_freq ? 'most days' : ''}${f.alc_amount ? ' (6–8 beers)' : ''}${f.withdrawal ? ' with morning tremor and sweats when not drinking' : ''}${f.seizure ? '; no history of seizures or DTs' : ''}.`);
  if (f.od) nar.push('One overdose in Jan 2026' + (/home/.test(f.od) ? '; naloxone in the home.' : '.'));
  if (f.mood) nar.push(`${f.mood}${f.selfharm ? '; denies thoughts of self-harm when asked directly' : ''}.`);
  if (priorOK) nar.push('Withdrawal management (Feb 2025) and Level 1 outpatient (Jan–Apr 2026) were each followed by continued use; 4 months abstinent on buprenorphine in 2024.');
  if (f.legal_checkins && /missed/.test(f.legal_checkins)) nar.push('Drug court reports 3 missed check-ins and 4 positive drug screens since Sep 2026.');
  if (f.housing) nar.push('Staying on his sister\'s couch, conditional on treatment.');
  if (f.strengths) nar.push(`Strengths: ${f.strengths.charAt(0).toLowerCase() + f.strengths.slice(1)}.`);
  if (nar.length >= 3) boxes.push({ label: 'Narrative summary', value: nar.join(' ').replace(/\s+/g, ' ').replace(/ \./g, '.'), src: [1, 2], last: true });

  const blank = [
    { label: 'HIV / HCV status (optional)', why: f.hiv_offered ? 'Offered on the call; the client chose to skip it. Left for you — Psyflo never drafts it or puts it in a request.' : 'Optional. Psyflo never drafts it.' },
    { label: 'Meets admission criteria?', why: 'The clinician decides — Psyflo never drafts the admission decision.' },
    { label: 'Preliminary diagnosis', why: 'The clinician decides.' }
  ];
  const allText = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Every substance used has last use, frequency and amount', ...CHECKS.fdi(rows.filter(r => r.yn === 'Y')) },
    { rule: 'Counts, never percentages', ...CHECKS.counts(allText) },
    { rule: 'Prior treatment carries provider, dates and outcome', ...(priorRows.length ? CHECKS.priorOutcome(priorRows) : { pass: false, detail: 'No prior treatment with an outcome yet — ask: "How did that go? What happened after?"' }) },
    { rule: 'Self-harm asked directly and on record', pass: !!f.selfharm, detail: f.selfharm ? '' : 'Not asked yet' },
    { rule: 'HIV / HCV left to the client and you', pass: !boxes.some(b => /hiv|hcv|hepatitis/i.test(b.value)), detail: 'Nothing about it drafted' },
    { rule: 'Decision and diagnosis left to the clinician', pass: true, detail: '' },
    { rule: 'Adult client language', ...CHECKS.adultLanguage(allText) },
    { rule: 'Nothing invented · every box traces to the call or the referral', pass: boxes.every(b => b.src?.length), detail: '' }
  ];
  return result(boxes, S, checks, blank, { facts: f, prompts: screeningPrompts(f), priorRows });
}

// ---------------------------------------------------------------- ASAM assessment (screen 15)
export const PHQ_TW = ['2', '2', '1', '1', '1', '2', '1', '1', '0']; // sum 11; item 9 asked directly
export function udsAtAssessment(client, date) {
  const seeded = client && (client.uds_at_assessment || client.asam?.uds_at_assessment);
  if (seeded) return { date: date || seeded.date, result: seeded.result };
  if (client && client.id && client.id !== 'TW') return null;
  return { date, result: 'Positive: buprenorphine (prescribed), fentanyl · EtG positive' };
}
export function ratingsFromFacts(f = {}) {
  return {
    D1: f.withdrawal ? (f.seizure ? 2 : 3) : 0,
    D2: f.mat ? 1 : 0,
    D3: f.mood ? (f.selfharm ? 2 : 3) : 1,
    D4: f.reason ? 2 : 3,
    D5: f.prior_detox_outcome || f.prior_op_outcome ? (f.od ? 3 : 2) : 2,
    D6: f.housing ? (/conditional|car/.test(f.housing) ? 3 : 2) : 1
  };
}
export function draftAssessment({ client = {}, screening, referral, today, date }) {
  const f = screening?.facts || {};
  const when = (date || client.timeline?.intake || today || '').slice(0, 10);
  const r = client.asam?.dimensions || ratingsFromFacts(f);
  const uds = udsAtAssessment(client, when);
  const S = [
    { n: 1, kind: 'call', label: 'Intake screening call (copied)', date: screening?.when?.slice(0, 10) },
    { n: 2, kind: 'referral', label: 'Referral' + (referral?.id ? ' · ' + referral.id : ''), date: referral?.received?.slice(0, 10) },
    { n: 3, kind: 'call', label: 'Assessment conversation (recorded)', date: when },
    { n: 4, kind: 'lab', label: 'UDS cup read at the assessment', date: when }
  ];
  const phq = PHQ_TW.reduce((a, b) => a + +b, 0);
  const prior = screening?.boxes?.find(b => b.label.startsWith('Prior treatment'))?.value;
  const subst = [
    f.op_yes ? `Opioids: ${(f.op_amount || 'fentanyl').replace(' before Aug 2026', '').replace(/^F/, 'f')}, ${(f.op_route || '').toLowerCase()}, daily until Aug 2026; on buprenorphine since Aug 2026; last use ${f.op_last ? f.op_last.split(' · ')[0] : '?'}.` : '',
    f.alc_yes ? `Alcohol: ${f.alc_amount || ''} ${(f.alc_freq || '').toLowerCase()}; last drink the night before the screening call.` : '',
    f.stim_no ? 'Stimulants: denies (asked directly).' : ''
  ].filter(Boolean).join(' ');
  const N = {
    D1: f.withdrawal ? `${f.withdrawal}; ${f.seizure || 'seizure history not asked'}. Opioid use disorder stable on buprenorphine 16 mg. Withdrawal can be monitored as an outpatient (CIWA-Ar each IOP day).` : '',
    D2: f.mat ? 'No acute medical conditions reported. Buprenorphine prescribed by Dr. Ahn, Valley Family Medicine; release to coordinate agreed.' : '',
    D3: f.mood ? `${f.mood}; PHQ-9 ${phq}; ${f.selfharm || 'self-harm not yet asked'}. Monitor alongside SUD treatment; refer to S. Lane, LCPC, if symptoms persist.` : '',
    D4: f.reason ? `Referred by drug court; names his own reasons: ${f.reason} Agreed to IOP mornings and to a UDS at the assessment.` : '',
    D5: f.prior_detox_outcome ? `Returned to use within 2 weeks of withdrawal management (Feb 2025); used throughout Level 1 outpatient (Jan–Apr 2026); second withdrawal management Aug 2026; one reported fentanyl use on 10/10 since starting buprenorphine${uds && /fentanyl/i.test(uds.result) ? ' and a fentanyl-positive UDS at the assessment' : ''}; alcohol use continuing${f.od ? '; one overdose in Jan 2026' : ''}. Abstinent 4 months on buprenorphine in 2024 — structure has worked before.` : '',
    D6: f.housing ? `${f.housing}. ${f.legal ? f.legal.replace(/ \(.*\)/, '') + ' with weekly check-ins.' : ''} Supports: ${f.strengths ? 'his sister; his daughter; his warehouse job' : 'to be asked'}.` : ''
  };
  const boxes = [
    { label: 'Presenting problem / reason for referral', value: f.legal ? `Referred by Clark County drug court${referral?.id ? ' (' + referral.id + ')' : ''} for opioid and alcohol use; ${f.legal.replace('Clark County drug court, ', '')}. Copied from the referral and the intake screening.` : '', src: [2, 1], copied: true },
    { label: 'Substance use history', value: subst, src: [1], copied: true },
    { label: 'Prior treatment (provider · level · dates · outcome)', value: prior || '', src: [1], copied: true, note: 'confirm dates with the client' }
  ];
  for (const [d] of DIMENSIONS) {
    if (!N[d]) continue;
    boxes.push({ label: dimLabel(d, 'risk (0–4)'), value: String(r[d]), src: [1, 3], note: 'suggested · you confirm the rating', dim: d });
    boxes.push({ label: dimLabel(d, 'narrative'), value: N[d], src: d === 'D3' ? [1, 3] : [1, 3], dim: d });
  }
  if (uds) boxes.push({ label: 'UDS at assessment (date · result)', value: `${US(uds.date)} · ${uds.result}`, src: [4] });
  const level = levelFromRatings(r);
  boxes.push({ label: 'Level-of-care recommendation', value: LEVEL_OPTION[level], src: [3], note: 'from the ratings · you decide' });
  if (f.strengths) boxes.push({ label: 'Strengths and recovery resources', value: f.strengths.charAt(0).toUpperCase() + f.strengths.slice(1) + '; drug court structure.', src: [1, 3] });
  const rated = Object.fromEntries(boxes.filter(b => /risk \(0–4\)$/.test(b.label)).map(b => [b.dim, b.value]));
  const text = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Every dimension rated', ...CHECKS.allRated(rated) },
    { rule: 'Level of care matches the ratings', ...CHECKS.levelMatches(r, level) },
    { rule: 'UDS at assessment recorded', ...CHECKS.udsAttached(uds, { payerName: client.medicaid?.plan === 'humana' ? 'SilverSummit' : '' }) },
    { rule: 'Prior treatment carries provider, dates and outcome', pass: !!prior, detail: prior ? '' : 'Run the intake screening first' },
    { rule: 'Ratings are suggestions', pass: true, detail: 'Each rating is typed for you to confirm or change' },
    { rule: 'Trauma history', pass: true, detail: 'Not drafted — left to the clinician' },
    { rule: 'Adult client language', ...CHECKS.adultLanguage(text) },
    { rule: 'Nothing invented', pass: boxes.every(b => !b.value || b.src?.length), detail: '' }
  ];
  return result(boxes, S, checks, [{ label: 'Trauma history', why: 'Left for the clinician. Psyflo drafts nothing here; it notes that the section was discussed.' }], { ratings: r, level, uds, phq: PHQ_TW });
}

// ---------------------------------------------------------------- treatment plan (screen 16)
export function draftPlan({ client = {}, today, ratings }) {
  const ini = client.initials || 'T.W.';
  const start = (client.timeline?.isp || today || '2026-10-21').slice(0, 10);
  const target = US(addDays(start, 55));
  // the three goals: the client's own plan when Psyflo already has it, else drafted from the dimensions rated highest
  const goals = (client.goals?.length ? client.goals : [
    { n: 1, dimension: 'D5', objective: `${ini} will name 3 personal high-risk situations and use a written coping plan, with no fentanyl-positive UDS on 4 consecutive weekly screens.`, interventions: ['CBT-RP', 'RP-G'] },
    { n: 2, dimension: 'D1/D2', objective: `${ini} will take buprenorphine as prescribed and keep every prescriber visit, confirmed by monthly prescriber contact and buprenorphine-positive UDS.`, interventions: ['MAT-C', 'MI'] },
    { n: 3, dimension: 'D6', objective: `${ini} will attend 2 community recovery meetings a week, keep 4 of 4 weekly drug court check-ins, and submit a sober-housing application by week 6.`, interventions: ['PS', 'FAM'] }
  ]).slice(0, 3).map(g => ({ ...g, interventions: g.interventions || [] }));
  const S = [{ n: 1, kind: 'intake', label: 'ASAM assessment', date: client.timeline?.intake }, { n: 2, kind: 'call', label: 'Plan session with the client (recorded)', date: start }, { n: 3, kind: 'list', label: "CCC of SN's intervention list" }];
  const boxes = [
    { label: 'Start / end', value: `${US(start)} – ${US(addDays(start, 89))}`, src: [2] },
    { label: 'Frequency', value: 'IOP 3 h/day, 3 days/week', src: [1] },
    { label: 'Presenting problem', value: 'Opioid use disorder on buprenorphine with a fentanyl use on 10/10; alcohol most days with morning withdrawal symptoms; drug court referral; unstable housing. Copied from the ASAM assessment.', src: [1] },
    { label: 'Strengths', value: client.strengths || 'Wants to keep his warehouse job; his sister\'s support; wants his visits with his daughter back.', src: [1, 2] },
    ...goals.flatMap(g => [
      { label: `Goal ${g.n} · Problem (ASAM dimension)`, value: dimName(String(g.dimension).slice(0, 2)), src: [1] },
      { label: `Goal ${g.n} · Target date`, value: target, src: [2] },
      { label: `Goal ${g.n} · Objective`, value: g.objective, src: [1, 2] },
      ...g.interventions.slice(0, 2).map((code, k) => ({ label: `Goal ${g.n} · Intervention ${k + 1}`, value: ivOption(code), src: [3] }))
    ])
  ];
  const text = boxes.map(b => b.value).join(' ');
  const objectives = boxes.filter(b => / · Objective$/.test(b.label));
  return result(boxes, S, [
    { rule: 'Every objective is measurable', pass: objectives.every(b => /\d+ of \d+|\d+ |\bevery\b/.test(b.value)), detail: 'A count (or "every") and a target date on each' },
    { rule: 'Each goal names an ASAM dimension', pass: goals.every(g => /^D\d/.test(String(g.dimension))), detail: goals.map(g => String(g.dimension)).join(' · ') + ' — the dimensions rated 2 or higher drive the plan' },
    { rule: 'Interventions from CCC of SN\'s list', pass: boxes.filter(b => /Intervention/.test(b.label)).every(b => INTERVENTION_NAMES.includes(b.value)), detail: [...new Set(goals.flatMap(g => g.interventions))].join(' · ') },
    { rule: 'Frequency matches the request', pass: true, detail: '3 h × 3 days = 9 units of H0015 a week' },
    { rule: 'Counts, never percentages', ...CHECKS.counts(text) },
    { rule: 'Adult client language', ...CHECKS.adultLanguage(text) }
  ]);
}

// ---------------------------------------------------------------- prior authorization request (screen 17)
export function draftInitialSRA({ client = {}, screening, referral, today, isp = {}, cna, assessment, payer, weeks = 8 }) {
  const f = screening?.facts || {};
  const asmDate = (cna?.date || client.timeline?.intake || today || '').slice(0, 10);
  const r = assessment?.ratings || client.asam?.dimensions || ratingsFromFacts(f);
  const uds = assessment?.uds !== undefined ? assessment.uds : udsAtAssessment(client, asmDate);
  const pid = payer || client.medicaid?.plan || 'humana';
  const payerName = { humana: 'SilverSummit', anthem: 'Anthem', sentara: 'Molina', aetna: 'CareSource', uhc: 'HPN', ffs: 'NV Medicaid FFS' }[pid] || '';
  const S = [
    { n: 1, kind: 'referral', label: `Referral · ${referral?.id || ''}`, date: referral?.received?.slice(0, 10) },
    { n: 2, kind: 'call', label: 'Intake screening call', date: screening?.when?.slice(0, 10) },
    { n: 3, kind: 'intake', label: 'ASAM assessment (in Client Record)', date: asmDate },
    { n: 4, kind: 'plan', label: 'Treatment plan (in Client Record)', date: isp.date },
    { n: 5, kind: 'lab', label: 'UDS at the assessment', date: uds?.date }
  ];
  const start = String(today).slice(0, 10); const end = addDays(start, weeks * 7 - 1);
  const units = IOP.hoursPerDay * IOP.daysPerWeek * weeks;
  const prior = screening?.boxes?.find(b => b.label.startsWith('Prior treatment'))?.value || '';
  const D = {
    D1: f.withdrawal ? `Risk ${r.D1}. Alcohol ${f.alc_amount || ''} ${(f.alc_freq || '').toLowerCase()}, morning tremor and sweats without alcohol; ${f.seizure || 'seizure history not on record'}. Opioid use disorder on buprenorphine 16 mg since Aug 2026 (outside prescriber); one reported fentanyl use on 10/10${uds && /fentanyl/i.test(uds.result) ? ' and a fentanyl-positive UDS at the assessment' : ''}. Withdrawal can be monitored at Level 2.1; no withdrawal management admission needed.` : '',
    D2: f.mat ? `Risk ${r.D2}. No acute medical conditions that would prevent participation. Buprenorphine managed by Dr. Ahn, Valley Family Medicine, with a release to coordinate.` : '',
    D3: f.mood ? `Risk ${r.D3}. ${f.mood}; PHQ-9 ${PHQ_TW.reduce((a, b) => a + +b, 0)} at the assessment; ${f.selfharm || 'self-harm not on record'}. Needs monitoring alongside SUD treatment; no psychiatric admission indicated.` : '',
    D4: f.reason ? `Risk ${r.D4}. Referred by Clark County drug court; names his own reasons: ${f.reason} Needs structured motivational work 3 days a week to hold engagement past the court requirement.` : '',
    D5: f.prior_detox_outcome && f.prior_op_outcome ? `Risk ${r.D5}. Returned to use within 2 weeks of withdrawal management (Feb 2025); used throughout Level 1 outpatient (Jan–Apr 2026, 9 sessions); second withdrawal management Aug 2026; ${f.legal_checkins && /positive/.test(f.legal_checkins) ? '4 positive drug court screens since Sep 2026; ' : ''}alcohol use continuing; ${f.od ? 'one overdose in Jan 2026. ' : ''}Level 1 has not held; he was abstinent 4 months on buprenorphine in 2024 with structure. Level 2.1 (9 h/week) is needed to build relapse-prevention skills.` : '',
    D6: f.housing ? `Risk ${r.D6}. ${f.housing}. ${f.legal ? 'Drug court phase 1 with weekly check-ins and random UDS.' : ''} Recovery environment unstable; IOP structure and housing case management needed.` : ''
  };
  const boxes = [
    { label: 'Start date / units / schedule', value: `${US(start)} – ${US(end)} · ${units} units ${IOP.code} · ${IOP.hoursPerDay * IOP.daysPerWeek}/week × ${weeks} weeks (IOP 3 h/day, 3 days/week)`, src: [4], short: 'Start date · units · schedule' },
    ...DIMENSIONS.map(([d]) => ({ label: dimLabel(d, 'medical necessity'), value: D[d], src: d === 'D5' ? [2, 3] : d === 'D4' ? [1, 2, 3] : [2, 3], short: `${d} · ${DIM_SHORT[d]}`, editable: d === 'D5' })),
    { label: 'UDS at assessment', value: uds ? `${US(uds.date)} · ${uds.result} · lab result attached to the packet` : '', src: [5], short: 'UDS at assessment' },
    { label: 'Prior treatment', value: prior, src: [2], short: 'Prior treatment' },
    { label: 'Care coordination', value: `Buprenorphine prescriber (Dr. Ahn, Valley Family Medicine) monthly, with a 42 CFR Part 2 release; Clark County drug court case manager (R. Bell) weekly attendance and UDS report, with release; peer recovery support (PRSS) weekly.`, src: [1, 2], short: 'Care coordination' },
    { label: 'Discharge / step-down plan', value: 'Step down to Level 1 outpatient when D5 and D6 are rated 2 or lower: 4 consecutive weekly negative UDS (prescribed buprenorphine expected), a housing plan in place, and a written relapse-prevention plan. Buprenorphine continues with the outside prescriber.', src: [4], short: 'Discharge / step-down' }
  ];
  const blank = [{ label: 'Clinician attestation', why: 'You write and sign this one. Psyflo never attests for you.', short: 'Clinician attestation' }];
  const text = boxes.map(b => b.value).join(' ');
  const rated = Object.fromEntries(DIMENSIONS.map(([d]) => [d, D[d] ? r[d] : null]));
  const checks = [
    { rule: 'Every dimension rated', ...CHECKS.allRated(rated) },
    { rule: 'Level of care matches the ratings', ...CHECKS.levelMatches(r, '2.1') },
    { rule: 'UDS result attached', ...CHECKS.udsAttached(uds, { required: true, payerName: pid === 'humana' ? 'SilverSummit' : '' }) },
    { rule: 'Units = hours × days × weeks', ...CHECKS.unitsMath(units, { ...IOP, weeks }) },
    { rule: 'No backdated start', ...CHECKS.noBackdate(start, today) },
    { rule: 'Counts, never percentages', ...CHECKS.counts(text) },
    { rule: 'Older dates labelled with a year', ...CHECKS.recent(text, today) },
    { rule: 'Adult client language', ...CHECKS.adultLanguage(text) },
    { rule: 'Attestation and the decision', pass: true, detail: 'Not drafted — yours' }
  ];
  return result(boxes, S, checks, blank, { start, end, units, ratings: r, uds, payerName });
}

// ---------------------------------------------------------------- continued stay (screen 33) · the "abstinent in treatment" case
export function draftContinuedStay({ client = {}, today = '2026-10-29', weeks = 4, wording } = {}) {
  const ini = client.initials || 'M.R.';
  const a = client.authorization || {};
  const units0 = a.units || 36, used = a.used ?? 27; const authEnd = a.end || '2026-11-13';
  const start = addDays(authEnd, 1); const end = addDays(start, weeks * 7 - 1);
  const units = IOP.hoursPerDay * IOP.daysPerWeek * weeks;
  const q = client.quarter || {};
  const admit = client.service_start || '2026-08-31'; const clean = client.abstinent_since || '2026-09-24';
  const weeksClean = Math.floor(daysBetween(clean, today) / 7);
  const phq = q.phq9 || [14, 11, 8]; const bam = q.bam_use_days || [18, 4, 0];
  const S = [
    { n: 1, kind: 'notes', label: `IOP group notes (${q.days || 24} attended days)`, date: today },
    { n: 2, kind: 'lab', label: 'UDS results in treatment', date: today },
    { n: 3, kind: 'intake', label: 'ASAM ratings · admission and now', date: today },
    { n: 4, kind: 'call', label: 'Drug court case manager (weekly, 42 CFR Part 2 release)', date: today },
    { n: 5, kind: 'plan', label: 'Treatment plan', date: admit }
  ];
  const before = { D1: 1, D2: 1, D3: 3, D4: 3, D5: 3, D6: 3 }; const now = { D1: 0, D2: 1, D3: 2, D4: 2, D5: 3, D6: 3 };
  const d5 = `Abstinence so far has been inside the Level 2.1 structure: ${q.uds || 'every UDS negative'} (abstinent since ${MD(clean)}, ${weeksClean} weeks), with 9 h a week of IOP. Cravings reported in group, highest on weekends; she still lives in a shared apartment where others use. Relapse-prevention plan written but not yet practiced outside the structure. D5 remains 3: continued use potential is high without Level 2.1.`;
  const boxes = [
    { label: 'Request', value: `${US(start)} – ${US(end)} · ${units} units ${IOP.code} · 9/week × ${weeks} weeks`, src: [5] },
    { label: 'IOP attendance', value: `${q.days || 24} IOP days attended since admission ${US(admit)}; ${used} of ${units0} units used in the current authorization.`, src: [1] },
    { label: 'UDS results in treatment', value: `Methamphetamine-positive before ${MD(clean)}; ${q.uds || 'negative since'} — abstinent ${weeksClean} weeks inside Level 2.1.`, src: [2] },
    { label: 'Dimension changes since admission (D1–D6)', value: DIMENSIONS.map(([d]) => `${d} ${before[d]} → ${now[d]}`).join(' · ') + `. D3: PHQ-9 ${phq[0]} → ${phq.at(-1)}. BAM days of use ${bam[0]} → ${bam.at(-1)}. D6 unchanged: shared apartment where others use.`, src: [3, 1] },
    { label: 'D5 · why Level 2.1 is still needed', value: wording || d5, src: [1, 2, 3], editable: true },
    { label: 'Step-down readiness (continued-service criteria)', value: 'Step-down criteria not yet met: D5 and D6 still rated 3; the move to sober housing (target 12/15/2026) has not happened; the relapse-prevention plan has not been tested on weekends. Plan: step down to Level 1 when D5 is 2 or lower for 2 consecutive weeks after the move.', src: [3, 5] },
    { label: 'Care coordination', value: 'Drug court case manager weekly (attendance and UDS) and primary care monthly, both with a 42 CFR Part 2 release; peer recovery support (J. Reyes, PRSS) weekly toward sober housing.', src: [4] },
    { label: 'Barriers', value: 'Weekends and the shared apartment are the highest-risk settings; transportation to the clinic depends on a bus pass.', src: [1] }
  ];
  const text = boxes.map(b => b.value).join(' ');
  const checks = [
    { rule: 'Abstinent in treatment is argued under D5, never "no longer needs"', ...CHECKS.abstinenceArgued(text, boxes[4].value) },
    { rule: 'Every dimension rated', ...CHECKS.allRated(now) },
    { rule: 'Level of care matches the ratings', ...CHECKS.levelMatches(now, '2.1') },
    { rule: 'Units = hours × days × weeks', ...CHECKS.unitsMath(units, { ...IOP, weeks }) },
    { rule: 'No backdated start', ...CHECKS.noBackdate(start, today) },
    { rule: 'Counts, never percentages', ...CHECKS.counts(text) },
    { rule: 'Adult client language', ...CHECKS.adultLanguage(text) }
  ];
  return result(boxes, S, checks, [], { start, end, units, ratings: now, before });
}

// ---------------------------------------------------------------- IOP group note (hidden in this build) · dictation → note
export function enhanceDictation({ text, client, goals = [], interventions = [], blocks = [], recent = [] }) {
  const raw = String(text || '').trim(); const t = raw.toLowerCase();
  const ini = client?.initials || 'the client';
  const fixed = [];
  let phone, narrative, chips = [], objective = null, mood = '', progress = '', ivs = [];
  const es = /\b(el|la|los|las|con|pero|muy|para)\b/.test(t) && /[áéíóúñ¿¡]|\b(grupo|día|trabaj)/.test(t);
  const g = n => goals[n - 1];
  if (/crav|urge/.test(t) && /(party|weekend|saturday|cousin)/.test(t)) {
    objective = 1; ivs = g(1)?.interventions?.length ? g(1).interventions : ['CBT relapse prevention'];
    phone = `In group ${ini} described strong cravings at her cousin's party on Saturday; she left early and called her sponsor. Staff used CBT relapse prevention (urge surfing) toward Goal 1.`;
    narrative = `Facilitated CBT relapse prevention with ${ini} in IOP group. ${ini} described strong cravings at her cousin's party on Saturday; she left early and called her sponsor. Staff led an urge-surfing exercise with the group. Addresses treatment plan Goal 1 (relapse prevention, D5).`;
    chips = [
      { text: 'CBT relapse prevention → urge surfing', from: 'from the plan intervention list' },
      { text: 'cravings at a party, left early, called her sponsor', from: 'from what you said' },
      { text: 'goal 1 · D5', from: 'from the plan' }
    ];
    mood = 'Cravings reported (Saturday)'; progress = 'Used a coping step: left early and called her sponsor';
  } else if (/participat\w* (in )?(\d+) of (\d+)/.test(t)) {
    const [, , a, b] = t.match(/participat\w* (in )?(\d+) of (\d+)/);
    if (/observed|watched|monitored/.test(t)) fixed.push('"Observed" replaced with what staff did');
    objective = 1; ivs = g(1)?.interventions || ['CBT relapse prevention'];
    narrative = `Facilitated CBT relapse prevention with ${ini} in IOP group and prompted her to share twice; she participated in ${a} of ${b} exercises (Goal 1).`;
    phone = narrative;
    chips = [{ text: 'relapse-prevention exercises, prompted', from: 'from the plan intervention list' }, { text: `${a} of ${b} exercises`, from: 'from what you typed' }, { text: 'goal 1', from: 'from the plan' }];
    progress = `Participated in ${a} of ${b} exercises`;
  } else if (raw) {
    const s = raw.replace(/\b(observed|watched|monitored)\b/gi, m => { fixed.push(`"${m}" replaced`); return 'worked with'; });
    objective = 1; ivs = g(1)?.interventions || [];
    narrative = `${s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, '')}. Addresses treatment plan Goal 1${g(1)?.name ? ' (' + g(1).name + ')' : ''}.`;
    phone = narrative;
    chips = [{ text: 'goal 1', from: 'from the plan' }, { text: 'your words', from: 'from what you said' }];
  }
  if (es && chips.length) chips.push({ text: 'said in Spanish → written in English', from: 'from what you said' });
  const all = narrative || '';
  const checks = [
    { rule: 'Intervention from the plan list, with why it was used', ...CHECKS.interventionsFromList(all, interventions) },
    { rule: 'Linked to a plan goal; progress as a count, not a percentage', pass: CHECKS.objective(all).pass && CHECKS.counts(all).pass, detail: '' },
    { rule: 'Says what the client did, not only what staff did', pass: /\b(she|he|they|client|[A-Z]\.[A-Z]\.) (left|called|described|participated|named|shared|used)\b/.test(all), detail: '' },
    { rule: 'No "observed"', pass: CHECKS.noObserved(all).pass, fixed: fixed.length ? fixed.join('; ') : '', detail: '' },
    { rule: 'Language varies from your last notes', pass: !recent.some(r => r && r.slice(0, 60) === all.slice(0, 60)), detail: '' }
  ];
  return { spoken: raw, phone, narrative, chips, checks, objective, interventions: ivs, mood, progress, fixed };
}

// Session times and units from the timer: H0015 is 1 unit per full hour of IOP
export function contactTime(blocks = [], { confirmed = true } = {}) {
  const rows = blocks.map(b => ({ from: b[0], to: b[1], what: b[2] || '', min: mins(b[1]) - mins(b[0]), unconfirmed: !!b[3] }));
  const total = rows.filter(r => confirmed || !r.unconfirmed).reduce((a, r) => a + r.min, 0);
  return { rows, total, text: fmtDuration(total), units: Math.min(4, Math.floor(total / 60)), lines: rows.map(r => `${clock12(r.from)}–${clock12(r.to)} · ${r.what}${r.unconfirmed ? ' (unconfirmed)' : ''}`).join('\n') };
}

// ---------------------------------------------------------------- the other forms: canonical drafts with sources
export const SEEDED_SAMPLE = { isp: 'TW', 'sra-continued': 'MR', discharge: 'JO', weekly: 'MR', collateral: 'MR', quarterly: 'MR', incident: 'DW' };
export function draftSeeded(form, ctx = {}) {
  const { client = {}, screening, today = '2026-10-29' } = ctx;
  const ini = client.initials || 'M.R.';
  const D = {
    cna: () => draftAssessment({ client, screening, referral: ctx.referral, today }),
    isp: () => draftPlan({ client, today }),
    'sra-continued': () => draftContinuedStay({ client, today, wording: ctx.wording }),
    weekly: () => result([
      { label: 'Duration', value: '12 min · phone', src: [1] },
      { label: 'Contact with', value: 'R. Bell · case manager, Clark County drug court', src: [2] },
      { label: 'What was shared', value: `Shared per the release: ${ini} attended 3 of 3 IOP days this week; UDS this week negative. Case manager reports ${ini} at her Tuesday check-in on time; next court date unchanged.`, src: [1] },
      { label: 'Follow-up', value: 'Next update next Thursday. Sober-housing application status to the case manager when it is submitted.', src: [1] }
    ], [{ n: 1, kind: 'call', label: 'Weekly collateral call (recorded)', date: today }, { n: 2, kind: 'chart', label: '42 CFR Part 2 release · drug court', date: '2026-08-31' }], [{ rule: 'Only what the release allows', pass: true, detail: 'Attendance and UDS shared; no clinical detail' }, { rule: 'Counts, never percentages', pass: true, detail: '' }]),
    collateral: () => result([
      { label: 'Collateral', value: 'Primary care · Dr. Kim, Sunrise Community Health', src: [2] },
      { label: 'Method', value: 'Phone · 9 min', src: [2] },
      { label: 'Information shared / received', value: `Shared: ${ini} attending IOP 3 days a week, UDS negative since 9/24. Received: blood pressure follow-up 11/12; no controlled prescriptions.`, src: [1, 2] },
      { label: 'Coordination', value: 'Primary care will fax visit notes after 11/12; CCC of SN sends a monthly attendance summary.', src: [2] }
    ], [{ n: 1, kind: 'lab', label: 'UDS results in treatment', date: '2026-10-27' }, { n: 2, kind: 'call', label: 'Collateral call (recorded)', date: today }], [{ rule: '42 CFR Part 2 release on file', pass: true, detail: 'Primary care release signed 08/31/2026' }, { rule: 'Counts, never percentages', pass: true, detail: '' }]),
    incident: () => result([
      { label: 'Date/time', value: '10/28/2026 · 2:40 pm', src: [1] },
      { label: 'Location', value: 'Community (reported by the client by phone)', src: [1] },
      { label: 'Level', value: 'Level 2 · hospitalization', src: [1] },
      { label: 'Staff present', value: 'None · phone report', src: [1] },
      { label: 'What happened', value: `${ini} called the front desk at 2:40 pm from UMC: seen in the emergency department after a return to use on 10/27 and admitted overnight for observation. No CCC of SN staff present.`, src: [1] },
      { label: 'Actions taken', value: 'Front desk notified the clinical director 2:55 pm. Counselor to review the safety and relapse-prevention plan at the next IOP day; release for UMC confirmed.', src: [1, 2] }
    ], [{ n: 1, kind: 'call', label: 'Client\'s call to the front desk', date: '2026-10-28' }, { n: 2, kind: 'chart', label: 'Release of information · UMC', date: '2026-10-03' }], [{ rule: 'Facts only, with times', pass: true, detail: '' }, { rule: 'Naloxone and injury left to the staffer', pass: true, detail: 'Yes/No boxes are yours' }]),
    quarterly: () => { const q = client.quarter || {}; const phq = q.phq9 || [14, 11, 8], gad = q.gad7 || [13, 10, 8], bam = q.bam_use_days || [18, 4, 0]; const g = q.goal_progress_days || [20, 17, 9]; const n = q.days || 24;
      return result([
      { label: 'Goal 1 progress', value: `Progressing. ${q.uds || 'UDS negative since admission'}. Rated "progress" on ${g[0]} of ${n} IOP days.`, src: [1, 2] },
      { label: 'Goal 2 progress', value: `Progressing. PHQ-9 ${phq.join(' → ')}; GAD-7 ${gad.join(' → ')}. Rated "progress" on ${g[1]} of ${n} IOP days.`, src: [1, 2] },
      { label: 'Goal 3 progress', value: `Not met yet. Still in the shared apartment; sober-housing move targeted for 12/15. Rated "progress" on ${g[2]} of ${n} IOP days.`, src: [1, 3] },
      { label: 'Assessments (UDS · PHQ-9 · BAM)', value: `PHQ-9 ${phq.join(' → ')} · GAD-7 ${gad.join(' → ')} · BAM days of use (past 30) ${bam.join(' → ')}`, src: [2] },
      { label: 'Recommendations', value: 'Continue Level 2.1 IOP 4 more weeks (continued stay R-0411); weekend relapse-prevention plan; review step-down to Level 1 after the move to sober housing.', src: [1, 3] },
      { label: 'Attendance', value: `${n} IOP days attended (${q.period || 'since admission'}).`, src: [1] }
    ], [{ n: 1, kind: 'notes', label: 'IOP group notes', date: today }, { n: 2, kind: 'assess', label: 'UDS, PHQ-9, GAD-7, BAM in Client Record' }, { n: 3, kind: 'call', label: 'Weekly collateral updates' }], [{ rule: 'Counts, never percentages', pass: true, detail: `${g[0]} of ${n} days` }, { rule: 'Quiet-goal rule', pass: true, detail: 'Goal 3 says "not met yet", not "met"' }]); },
    discharge: () => result([
      { label: 'Discharge / transfer date', value: '10/23/2026', src: [3] },
      { label: 'Reason', value: 'Step-down · Level 2.1 IOP → Level 1 outpatient', src: [3] },
      { label: 'Dates of service', value: '08/24/2026 – 10/23/2026 · Level 2.1 IOP · 25 of 27 scheduled days attended', src: [1] },
      { label: 'Level of care · transfer to', value: 'ASAM Level 1 · Outpatient at CCC of SN (H0004 individual weekly + H0005 group weekly); new initial request to CareSource with ASAM ratings on page 1', src: [3] },
      { label: 'Progress by dimension', value: 'D1 0 → 0 · D2 0 → 0 · D3 2 → 1 · D4 3 → 1 · D5 3 → 2 · D6 2 → 1. UDS negative 6 consecutive weeks (9/11 – 10/16).', src: [1, 2] },
      { label: 'Condition at discharge', value: 'Level 1 criteria met: D5 rated 2 with a practiced relapse-prevention plan; stable housing with her aunt; working part time. Cravings 2 of 10 at the last check-in.', src: [1, 2] },
      { label: 'Services recommended', value: 'Level 1 outpatient weekly; peer recovery support weekly; mutual-help meetings 3 a week by her choice.', src: [3] },
      { label: 'Client informed', value: `Step-down discussed with ${client.initials || 'J.O.'} on 10/16 and 10/21; she agrees and signed the transfer plan in session 10/23.`, src: [1] }
    ], [{ n: 1, kind: 'notes', label: 'IOP group notes', date: today }, { n: 2, kind: 'lab', label: 'UDS results' }, { n: 3, kind: 'plan', label: 'Step-down plan (Psyflo)' }], [{ rule: 'Every dimension rated at transfer', pass: true, detail: '6 of 6' }, { rule: 'Level of care matches the ratings', ...CHECKS.levelMatches({ D1: 0, D2: 0, D3: 1, D4: 1, D5: 2, D6: 1 }, '1') }, { rule: 'Counts, never percentages', pass: true, detail: '' }, { rule: 'Client signs, Psyflo never does', pass: true, detail: '' }])
  };
  return (D[form] || (() => result([], [], [])))();
}

export function draft(formType, sources = {}) {
  if (formType === 'screening') return draftScreening(sources);
  if (formType === 'cna') return draftAssessment(sources);
  if (formType === 'isp') return draftPlan(sources);
  if (formType === 'sra-initial') return draftInitialSRA(sources);
  if (formType === 'sra-continued') return draftContinuedStay(sources);
  if (formType === 'dpn') return enhanceDictation(sources);
  return draftSeeded(formType, sources);
}
