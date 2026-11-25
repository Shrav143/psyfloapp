// asam.js: the ASAM Criteria as the demo uses them (pure; imported by the server actions, the app screens, the panel and the FLO engine).
//
// What is stored: a clinician's dimensional risk ratings (0 to 4) for the six ASAM dimensions, dated and signed, in state.asam_assessments
// (seed/extra/asam.json). What is derived here, never stored: the lowest level of care whose limits contain every rating, whether the level a
// request asks for matches that, which dimensions drive it, how old the assessment is and what changed since the one before.
//
// Honest limits (shown wherever a derived level appears):
//   · The ratings are the clinician's. Psyflo only reads them.
//   · The limits per level below are a simplified DEMO decision rule (rule keys asam.level_limits and asam.reassess_days, category
//     UNVERIFIED-DEMO-ASSUMPTION). They are not the ASAM text, which is a clinical judgment across all six dimensions. A level is "suggested",
//     never "determined".
//   · Dimension names and level names follow The ASAM Criteria, 3rd edition (2013). A 4th edition exists; a payer may use either.
import { addDays, daysBetween, fmtDate } from './dates.js';
import { today as clockToday } from './clock.js';
import { rule, ruleValue } from './rules.js';

export const DIMS = [
  { n: 1, short: 'D1', name: 'Acute intoxication and/or withdrawal potential', label: 'Intoxication and withdrawal', evidence: 'withdrawal screen (CIWA or COWS), last use, withdrawal history' },
  { n: 2, short: 'D2', name: 'Biomedical conditions and complications', label: 'Medical conditions', evidence: 'medical conditions, medications, labs, pregnancy status' },
  { n: 3, short: 'D3', name: 'Emotional, behavioral, or cognitive conditions and complications', label: 'Emotional and behavioral conditions', evidence: 'PHQ-9 or GAD-7 score, safety screen, co-occurring diagnosis and treatment' },
  { n: 4, short: 'D4', name: 'Readiness to change', label: 'Readiness to change', evidence: 'attendance counts, the client\'s own stated goal, stage of change' },
  { n: 5, short: 'D5', name: 'Relapse, continued use, or continued problem potential', label: 'Relapse and continued use', evidence: 'dated use episodes, urine drug screens, craving ratings, outcome of earlier treatment' },
  { n: 6, short: 'D6', name: 'Recovery/living environment', label: 'Recovery environment', evidence: 'housing, who in the home uses, school or work status, supports' }
];
export const dimOf = n => DIMS.find(d => d.n === +n) || null;
export const RATING_LABEL = ['None', 'Mild', 'Moderate', 'Significant', 'Severe'];
export const ratingLabel = n => RATING_LABEL[+n] != null ? RATING_LABEL[+n] : 'Not rated';

// Levels of care, lowest to highest. `limit` is the highest rating on D1..D6 that the level can manage (demo rule, see the header).
export const LEVELS = [
  { id: '1', short: 'OP', name: 'Outpatient services', hours: 'under 6 hours a week for adolescents', limit: [1, 1, 1, 2, 2, 2] },
  { id: '2.1', short: 'IOP', name: 'Intensive outpatient', hours: '6 or more hours a week for adolescents', limit: [2, 2, 2, 3, 3, 3] },
  { id: '2.5', short: 'PHP', name: 'Partial hospitalization', hours: '20 or more hours a week', limit: [2, 2, 3, 3, 4, 3] },
  { id: '3.1', short: 'RES-L', name: 'Clinically managed low-intensity residential', hours: '24-hour structure, 5 or more hours of clinical services a week', limit: [2, 2, 2, 4, 4, 4] },
  { id: '3.5', short: 'RES-H', name: 'Clinically managed high-intensity residential', hours: '24-hour structure with daily clinical services', limit: [2, 2, 3, 4, 4, 4] },
  { id: '3.7', short: 'MMI', name: 'Medically monitored intensive inpatient', hours: '24-hour nursing and physician access', limit: [3, 3, 3, 4, 4, 4] },
  { id: '4', short: 'MMI-4', name: 'Medically managed intensive inpatient', hours: '24-hour medical management', limit: [4, 4, 4, 4, 4, 4] }
];
export const levelById = id => LEVELS.find(l => l.id === String(id)) || null;
const levelIdx = id => LEVELS.findIndex(l => l.id === String(id));
export const levelName = id => { const l = levelById(id); return l ? `Level ${l.id} · ${l.name}` : 'Level not recorded'; };
export const levelTag = id => { const l = levelById(id); return l ? `ASAM ${l.id} · ${l.short}` : 'ASAM level not recorded'; };

// the level a request asks for: stored on the request (asam_level), else read from the service line
export function requestLevel(r) {
  if (!r) return null;
  if (r.asam_level) return String(r.asam_level);
  const t = String(r.service || '');
  if (/php|partial/i.test(t)) return '2.5';
  if (/iop|intensive|H0015|H0005/i.test(t)) return '2.1';
  if (/outpatient|\bOP\b/i.test(t)) return '1';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------- assessments
const asOfToday = s => (s && s.clock && s.clock.date) || clockToday(s);
export const assessmentsOf = (s, client) => ((s && s.asam_assessments) || []).filter(a => a.client === client).sort((a, b) => String(b.date).localeCompare(String(a.date)));
export const latestAssessment = (s, client) => assessmentsOf(s, client)[0] || null;
export const priorAssessment = (s, client) => assessmentsOf(s, client)[1] || null;
export const ratingOf = (a, n) => a && a.dims && a.dims[n] && a.dims[n].rating != null ? +a.dims[n].rating : null;
export const ratingsOf = a => [1, 2, 3, 4, 5, 6].map(n => ratingOf(a, n));
export const noteOf = (a, n) => (a && a.dims && a.dims[n] && a.dims[n].note) || '';
export const complete = a => ratingsOf(a).every(x => x != null);
export const ratingsLine = a => DIMS.map(d => `${d.short} ${ratingOf(a, d.n) != null ? ratingOf(a, d.n) : '–'}`).join(' · ');

// dimensions whose rating is above what a level can manage
export function exceeds(levelId, ratings) {
  const l = levelById(levelId); if (!l) return [];
  return ratings.map((x, i) => ({ n: i + 1, rating: x, limit: l.limit[i] })).filter(x => x.rating != null && x.rating > x.limit);
}
// the lowest level whose limits contain every rating
export function lowestLevel(ratings) {
  if (!ratings.every(x => x != null)) return null;
  return LEVELS.find(l => exceeds(l.id, ratings).length === 0) || LEVELS[LEVELS.length - 1];
}
const dimList = list => list.map(x => `${dimOf(x.n).short} (${x.rating})`).join(' and ').replace(/ and (?=[^]*\band\b)/g, ', ');

// levelCheck(a, requested) -> the whole level-of-care reading for one assessment against the level a request asks for.
//   state  'match'  the request is the lowest level the ratings fit; `drivers` are the dimensions that keep the person above the level below
//          'over'   every rating fits a lower level; the request needs a stated reason (the usual ground for a payer to step a request down)
//          'under'  some ratings are above the level requested; the ratings point higher
//          'none'   no complete assessment, or no level on the request
export function levelCheck(a, requested) {
  const req = levelById(requested);
  const ratings = ratingsOf(a);
  if (!req || !a || !complete(a)) return { state: 'none', requested: req ? req.id : null, lowest: null, drivers: [], exceeds: [], lowerLevel: null, headline: !a ? 'No ASAM assessment on file' : !req ? 'No level of care on the request' : 'The assessment is not fully rated', detail: '' };
  const lowest = lowestLevel(ratings); const ri = levelIdx(req.id), li = levelIdx(lowest.id);
  const lower = ri > 0 ? LEVELS[ri - 1] : null;
  const drivers = lower ? exceeds(lower.id, ratings) : [];
  const over = exceeds(req.id, ratings);
  let state, headline, detail;
  if (ri < li) {
    state = 'under';
    headline = `Ratings point above Level ${req.id}: ${dimList(over)}`;
    detail = `${dimList(over)} ${over.length === 1 ? 'is' : 'are'} above what Level ${req.id} can manage; the lowest level that fits every rating is Level ${lowest.id}. A request at Level ${req.id} is the more conservative ask: say why.`;
  } else if (ri > li) {
    state = 'over';
    headline = `Ratings fit Level ${lowest.id}; Level ${req.id} needs a stated reason`;
    detail = `Every rating is within the limits of Level ${lowest.id} (${ratingsLine(a)}). A payer can step a Level ${req.id} request down to Level ${lowest.id} on these ratings alone unless a reason outside the ratings is documented.`;
  } else {
    state = 'match';
    headline = lower && drivers.length ? `Ratings support Level ${req.id}: ${dimList(drivers)} ${drivers.length === 1 ? 'is' : 'are'} above what Level ${lower.id} can manage` : `Ratings support Level ${req.id}`;
    detail = lower && drivers.length ? `Level ${lower.id} can manage up to ${drivers.map(x => `${dimOf(x.n).short} ${x.limit}`).join(', ')}; this person is at ${drivers.map(x => `${dimOf(x.n).short} ${x.rating}`).join(', ')}. That is the case for Level ${req.id} and not Level ${lower.id}.` : `This is the lowest level of care, so no step-down level is available.`;
  }
  return { state, requested: req.id, lowest: lowest.id, drivers, exceeds: over, lowerLevel: lower ? lower.id : null, headline, detail };
}
export const CHECK_TONE = { match: 'success', over: 'warning', under: 'info', none: 'neutral' };
export const CHECK_LABEL = { match: 'Ratings support', over: 'Step-down likely', under: 'Ratings higher', none: 'Not assessed' };

// ---------------------------------------------------------------------------------------------------------------- reassessment
// Payers set their own review intervals; the demo uses one rule (asam.reassess_days) and shows its source chip wherever it states a date.
export function reassessLimit(s, level) { return ruleValue(s, 'asam.reassess_days', 30, level != null ? String(level) : undefined); }
export function dueState(s, a, level, today) {
  const t = today || asOfToday(s);
  if (!a) return { state: 'none', days: null, limit: reassessLimit(s, level), dueDate: null, rule: rule(s, 'asam.reassess_days', level) };
  const limit = reassessLimit(s, level); const days = daysBetween(String(a.date).slice(0, 10), t); const dueDate = addDays(String(a.date).slice(0, 10), limit);
  const left = limit - days;
  return { state: left < 0 ? 'overdue' : left <= 7 ? 'soon' : 'ok', days, limit, left, dueDate, rule: rule(s, 'asam.reassess_days', level) };
}
export function dueText(d) {
  if (!d || d.state === 'none') return 'Not assessed';
  return d.state === 'overdue' ? `Reassessment ${-d.left} day${d.left === -1 ? '' : 's'} overdue` : d.state === 'soon' ? `Reassess by ${fmtDate(d.dueDate)}` : `Reassess by ${fmtDate(d.dueDate)}`;
}

// per-dimension change between two assessments (cur minus prev); null when either is missing
export function change(prev, cur) {
  if (!prev || !cur) return null;
  return DIMS.map(d => { const a = ratingOf(prev, d.n), b = ratingOf(cur, d.n); return { n: d.n, from: a, to: b, delta: a != null && b != null ? b - a : null }; });
}
export function changeText(ch) {
  if (!ch) return '';
  const better = ch.filter(x => x.delta < 0), worse = ch.filter(x => x.delta > 0);
  const f = x => `${dimOf(x.n).short} ${x.from} to ${x.to}`;
  return [better.length ? `Lower risk: ${better.map(f).join(', ')}` : '', worse.length ? `Higher risk: ${worse.map(f).join(', ')}` : '', !better.length && !worse.length ? 'No dimension changed' : ''].filter(Boolean).join('. ');
}

// one call that every screen can use: the latest assessment, the one before, the level reading, the reassessment clock and the change
export function profile(s, client, requested) {
  const a = latestAssessment(s, client); const prev = priorAssessment(s, client);
  const level = requested != null ? requested : (a && a.level_current) || null;
  return { a, prev, level, check: levelCheck(a, level), due: dueState(s, a, level), change: change(prev, a) };
}

// ---------------------------------------------------------------------------------------------------------------- what a payer's stated reason turns on
// reasonDims(text) -> { dims: [n...], level: bool, why: [..] }. Keyword reading of the payer's own words; a reason that matches nothing returns
// no dimensions and the workspace says "not compared yet" (nothing is invented).
const DIM_WORDS = [
  [1, /withdraw|detox|intoxicat|overdose|tremor|CIWA|COWS|last use/i],
  [2, /medical|medication|hepatitis|pregnan|lab\b|labs\b|biomedical|physical health|abscess/i],
  [3, /depress|anxiety|suicid|self-harm|trauma|psychiatr|mental health|co-occurring|PHQ|safety plan|emotional/i],
  [4, /readiness|motivat|engage|attendance|attend|participation|refus|ambivalen|stage of change|treatment goals?/i],
  [5, /relapse|continued use|use episode|urine|UDS|drug screen|craving|positive screen|frequency|amount|substance use|abstinen|lapse|used /i],
  [6, /housing|living|environment|household|home\b|recovery support|supports|peers? who use|family member using|transport|school or work/i]
];
const LEVEL_WORDS = /level of care|level \d|lower level|outpatient|step[- ]?down|step down|does not meet|not meet|criteria|medical necessity|already connected|other services|ASAM|intensity|continued stay/i;
export function reasonDims(text) {
  const t = String(text || ''); const dims = DIM_WORDS.filter(([, rx]) => rx.test(t)).map(([n]) => n);
  return { dims, level: LEVEL_WORDS.test(t), why: dims.map(n => dimOf(n).label) };
}
