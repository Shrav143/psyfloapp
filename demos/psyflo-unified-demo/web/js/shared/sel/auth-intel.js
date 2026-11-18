// Authorization intelligence selectors (R7, Oprox parity, Authorizations tab). PURE: no DOM, no screen imports. The Authorizations screens, the server tests and the
// extension panel read the same functions, so the platform and the panel say the same thing.
//
// Everything here is computed from stored records: the clinician's ASAM ratings and notes, the dated evidence, the incidents, the authorization, the clock, the payer's
// stored notes. Psyflo writes no clinical claim of its own. A line that has no record behind it says what is missing ("No dated record on file for D4. Still needed: ...").
// Numbers that come from seed `intel_sample` or `rec_outcomes` (payer rates, comparable cases, modeled likelihoods, model confidence, expected approval, lift) are an
// ILLUSTRATIVE SAMPLE: their objects carry `sample: true` and `basis` (INTEL_BASIS); a screen that shows them says so and marks them Simulated.
// Clinical views (trajectory, criteria rows, historical outcomes, packet and lift lines) are for the treating clinician. The supervisor and the administrator read only
// the non-clinical parts: `urgency`, `risk` (dollars at risk), `band` and `recertDue` (rowSignals and headerOf return empty clinical fields for them).
//
//   isClinician(me)                  true for the treating clinician (role clinician with drafts.clinical)
//   bandsOf(s)                       bands() over every request: { byId, groups }; one request is "Highest financial risk" for the whole clinic
//   recertCount(s)                   how many requests have a renewal due now (renewal(s, r).due)
//   rowSignals(s, r, me, { recs, bands })  -> { id, urgency, risk, band, bandLabel, recertDue, clinical,
//                                              packet:{inputs,text,tone}|null, lift:'Historically improves approval by +N pts (sample)'|'', inputs:number }
//   headerOf(s, r, me)               -> { id, urgency, risk, band, rankedFirst, clinical, expected:{base,expected,lift,basis,sample}|null, confidence:{value,text,basis,sample}|null,
//                                         comparable:{count,payer,basis,sample}|null }
//   submitOf(s, r, recs)             -> { ok, label, reason }   the footer's Submit to payer: ok only when no suggestion still needs the clinician's words and the request
//                                       is signed and waiting to be sent; `reason` says what comes first (the next step of the existing flow)
//
//   trajectoryOf(s, r)               -> { id, client, initials, hasAssessment,
//        summary: [{ key, label, value, note, ids }]       Diagnosis, Payer, Level of care, Status, Trajectory, Auth readiness (each a computed phrase)
//        trend:   { title, labels:[date], series:[{name, tone, points:[n|null]}], min, max, hasTrend, callouts:[{ name, value, label, date }] }   the ASAM ratings by assessment date
//        screens: { title, labels, series, min, max, hasTrend, callouts:[{ name, current, date, previous }], items:[{ instrument, date, score, ids }] }  stored screening scores
//        drivers: [{ n, short, label, rating, ratingLabel, date, text, gap, ids }]   dimensions rated 2 or more, highest first
//        engagement: { score:{ pct, attended, scheduled, ids }|null, lines:[{ text, ids }], dailyNotes:n }
//        risks:   [{ key, tone:'danger'|'warning', text, ids }]
//        inputs }
//   criteriaView(s, r)               -> { id, request, payer:{id,name}, level, rows:[{ key, label, state:'documented'|'needs', text, rec, included }], documented, total, needs, pct,
//        sources:[label], status:{ tone, text }, tiles:[{ key, label, value, caption, sample }],
//        maximize:{ why:{ payer, tends, reasons:[{ reason, count, pct }], sample, basis }, include:[{ key, title, state, needsInput }] } }
//   historicalView(s, r)             -> { id, payer:{id,name}, level, matching:[{ key, label, value }], driver:{ reason, count, pct, observed:[{ text, sample }] }|null,
//        supporting:[{ key, label, ok, ids }], outcomes:[{ kind, label, likelihood, points }], interpretation:{ key, label, tone, text }, needs, sample:true, basis }
//   authStatusOf(s, r)               -> { approved, used, remaining, start, expires, daysToExpiry, daysOfUnits, rate, urgent, action }   the authorization panel of Analyze a case
//   urgentOf(s, r)                   -> { title, lines:[text] } | null                      "Units run out in about N days", from the units and the clock
//   readStatusText(text)             -> { approved, used, remaining, days, found, text }    simple patterns over pasted text; the person confirms what was read
//   scrubText(text, remove)          -> text with emails, phone numbers, long digit runs and the typed member ID / group number replaced by [removed]
//   previewOf(s, r)                  -> { initials, age, lines:[text] }                     the de-identified preview of a stored consumer
//   ANALYSIS_STEPS                   the six lines the streaming checklist prints
import { client as clientOf, payer as payerOf, payerShort, STAGE_LABEL, TYPE_LABEL } from '../model.js';
import { fmtDate, daysBetween } from '../dates.js';
import { today as clockToday } from '../clock.js';
import * as asam from '../asam.js';
import { can } from '../permissions.js';
import { evidenceIndex, sentenceDim, MISSING_RE, DIM_KIND } from './disputes.js';
import { renewal, unitsView } from './auth.js';
import { authRecsFor } from '../recs.js';
import { atRisk, urgency, bands, packetLine, liftLine, expectedAll, modelConfidence, comparableCount, payerPattern, historicalCards, insights, INTEL_BASIS, BAND_LABEL } from '../intel.js';

export const isClinician = me => !!me && me.role === 'clinician' && can(me, 'drafts.clinical');
const RATE = n => asam.ratingLabel(n);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const noQuote = t => String(t || '').replace(/^["“]|["”]$/g, '');
const dimLabel = n => asam.dimOf(n).label;
const stageWord = r => String(STAGE_LABEL[r.stage] || r.stage).replace(/\s+—\s+/g, ': ');   // the stage names carry a dash in older copy; new copy has none

// ------------------------------------------------------------------------------------------------ the list
export function bandsOf(s) {
  const items = (s.requests || []).map(r => { const u = urgency(s, r); const k = atRisk(s, r); return { id: r.id, hours: u.hours, dollars: k ? k.dollars : 0 }; });
  return bands(items);
}
export function recertCount(s) { return (s.requests || []).filter(r => { const rn = renewal(s, r); return !!(rn && rn.due); }).length; }

export function rowSignals(s, r, me, o = {}) {
  const clin = isClinician(me); const b = o.bands || bandsOf(s); const rn = renewal(s, r); const band = b.byId[r.id] || 'none';
  const recs = clin ? (o.recs || authRecsFor(s, r)) : null;
  const packet = recs ? packetLine(recs) : null;
  return { id: r.id, urgency: urgency(s, r), risk: atRisk(s, r), band, bandLabel: BAND_LABEL[band], recertDue: !!(rn && rn.due), clinical: clin, packet, lift: recs ? liftLine(recs) : '', inputs: packet ? packet.inputs : 0 };
}

// the case page strip (A-10): every role sees the dollars and the clock; the clinician also sees the sample figures
export function headerOf(s, r, me) {
  const clin = isClinician(me); const b = bandsOf(s); const band = b.byId[r.id] || 'none'; const recs = clin ? authRecsFor(s, r) : null;
  const pn = clin ? payerOf(s, r.payer) : null;
  return {
    id: r.id, urgency: urgency(s, r), risk: atRisk(s, r), band, rankedFirst: band === 'risk', clinical: clin,
    expected: recs ? { ...expectedAll(s, recs), sample: true } : null,
    confidence: recs ? { ...modelConfidence(recs), sample: true } : null,
    comparable: recs ? { count: comparableCount(s, r), payer: pn.name, basis: INTEL_BASIS, sample: true } : null
  };
}

// Submit to payer (footer of the suggestions drawer): ready only when nothing still needs the clinician's words and the packet is signed and waiting to be sent.
// Otherwise it says what comes first, read from the same flow the case page shows (review, approve, sign, send).
const FLOW_STAGE = { draft_ready: 'Review the packet: Process Form is pressed in Lauris.', needs_approval: 'Approve the packet: a designated approver checks it before anyone signs.', awaiting_signature: 'Sign in Lauris: an LMHP-type clinician presses Get Signature.' };
export function submitOf(s, r, recs) {
  const label = 'Open the send step';
  const pk = packetLine(recs || []);
  if (pk.inputs) return { ok: false, label, reason: `${plural(pk.inputs, 'suggestion still needs', 'suggestions still need')} your own words. Add them or dismiss the suggestion first.` };
  if (r.stage === 'signed') return { ok: true, label, reason: '' };
  if (FLOW_STAGE[r.stage]) return { ok: false, label, reason: `Not ready to send. ${FLOW_STAGE[r.stage]}` };
  return { ok: false, label, reason: `Nothing to send at this stage (${stageWord(r)}).` };
}

// ------------------------------------------------------------------------------------------------ screening scores (stored)
const INSTRUMENTS = { 'PHQ-9': 27, 'GAD-7': 21, 'DAST-10': 10, 'AUDIT-C': 12 };
const SCORE_RE = /\b(PHQ-9|GAD-7|DAST-10|AUDIT-C)\s*[:=]?\s*(\d{1,2})\b/g;
function scoresOf(s, r, X) {
  const out = []; const seen = new Set();
  const add = (instrument, date, score, ids, previous = null) => { const k = `${instrument}|${date}`; if (!INSTRUMENTS[instrument] || !date || seen.has(k) || !(score >= 0)) return; seen.add(k); out.push({ instrument, date: String(date).slice(0, 10), score: +score, ids, previous }); };
  for (const h of (s.assessment_history || []).filter(x => x.client === r.client)) add(h.instrument, h.date, h.score, [], h.prev != null ? +h.prev : null);
  for (const e of (X.items || [])) { if (e.fromAssessment) continue; const q = String(e.quote || ''); for (const m of q.matchAll(SCORE_RE)) add(m[1], e.date, +m[2], [e.id]); }
  for (const a of asam.assessmentsOf(s, r.client)) for (const dm of asam.DIMS) for (const m of String(asam.noteOf(a, dm.n)).matchAll(SCORE_RE)) add(m[1], a.date, +m[2], [`EV-ASM-${a.id}-D${dm.n}`]);
  return out.sort((x, y) => x.date.localeCompare(y.date) || x.instrument.localeCompare(y.instrument));
}

// ------------------------------------------------------------------------------------------------ A-13 clinical trajectory
const SERIES_TONE = ['teal', 'amber', 'navy'];
export function trajectoryOf(s, r) {
  const c = clientOf(s, r.client); const X = evidenceIndex(s, null, r); const a = X.assessment; const lvl = asam.requestLevel(r);
  const all = asam.assessmentsOf(s, r.client).slice().reverse();   // oldest first
  const prev = a ? asam.priorAssessment(s, r.client) : null; const ck = asam.levelCheck(a, lvl); const du = asam.dueState(s, a, lvl, clockToday(s));
  const recs = authRecsFor(s, r); const inputs = packetLine(recs).inputs; const pn = payerOf(s, r.payer);
  const aid = x => `EV-ASM-${x.id}`;
  // summary: Diagnosis, Payer, Level of care, Status, Trajectory, Auth readiness
  let trajectory;
  if (!a) trajectory = 'No ASAM assessment is on file, so there is no trajectory to read.';
  else if (!prev) trajectory = `One assessment on file (${fmtDate(a.date)}). There is no earlier rating to compare.`;
  else trajectory = `${asam.changeText(asam.change(prev, a))} since ${fmtDate(prev.date)}`;
  const readiness = `${ck.headline}${a && ck.state !== 'none' ? (inputs ? ` · ${plural(inputs, 'input', 'inputs')} needed` : ' · packet ready for review') : ''}`;
  const summary = [
    { key: 'diagnosis', label: 'Diagnosis', value: c.diagnosis || 'No diagnosis on the client record', note: c.substance ? `Client record · ${c.substance}` : 'Client record', ids: [] },
    { key: 'payer', label: 'Payer', value: pn.name, note: '', ids: [] },
    { key: 'level', label: 'Level of care', value: asam.levelName(lvl), note: '', ids: [] },
    { key: 'status', label: 'Status', value: `${stageWord(r)} · ${TYPE_LABEL[r.type] || r.type}`, note: '', ids: [] },
    { key: 'trajectory', label: 'Trajectory', value: trajectory, note: '', ids: [a, prev].filter(Boolean).map(aid) },
    { key: 'readiness', label: 'Auth readiness', value: readiness, note: '', ids: a ? [aid(a)] : [] }
  ];
  // the ASAM trend: the highest rating and the dimensions rated 2 or more in the latest assessment, one point for each assessment date
  const labels = all.map(x => fmtDate(x.date));
  const rated = a ? asam.DIMS.map(dm => ({ n: dm.n, rt: asam.ratingOf(a, dm.n) })).filter(x => x.rt != null && x.rt >= 2).sort((x, y) => y.rt - x.rt || x.n - y.n) : [];
  const high = all.map(x => { const v = asam.ratingsOf(x).filter(n => n != null); return v.length ? Math.max(...v) : null; });
  const series = a ? [{ name: 'Highest rating', tone: 'red', points: high }, ...rated.slice(0, 3).map((x, i) => ({ name: asam.dimOf(x.n).short, tone: SERIES_TONE[i], points: all.map(z => asam.ratingOf(z, x.n)) }))] : [];
  const callouts = a ? [{ name: 'Highest rating', value: Math.max(...asam.ratingsOf(a).filter(n => n != null), 0), label: '', date: String(a.date).slice(0, 10) }, ...rated.slice(0, 3).map(x => ({ name: asam.dimOf(x.n).short, value: x.rt, label: RATE(x.rt), date: String(a.date).slice(0, 10) }))].map(x => ({ ...x, label: x.label || RATE(x.value) })) : [];
  const trend = { title: 'ASAM ratings by assessment date', labels, series, min: 0, max: 4, hasTrend: all.length >= 2, callouts };
  // stored screening scores, one chart on their own scale
  const items = scoresOf(s, r, X); const dates = [...new Set(items.map(x => x.date))].sort(); const names = Object.keys(INSTRUMENTS).filter(n => items.some(x => x.instrument === n));
  const sseries = names.map((n, i) => ({ name: n, tone: ['teal', 'amber', 'navy', 'red'][i % 4], points: dates.map(d => { const f = items.find(x => x.instrument === n && x.date === d); return f ? f.score : null; }) }));
  const scallouts = names.map(n => { const mine = items.filter(x => x.instrument === n); const cur = mine[mine.length - 1]; const before = mine.length > 1 ? mine[mine.length - 2].score : cur.previous; return { name: n, current: cur.score, date: cur.date, previous: before != null ? before : null }; });
  const screens = { title: 'Screening scores', labels: dates.map(d => fmtDate(d)), series: sseries, min: 0, max: Math.max(...names.map(n => INSTRUMENTS[n]), 0) || 27, hasTrend: dates.length >= 2, callouts: scallouts, items };
  // key drivers: the dimensions rated 2 or more, with the stored note and date (the same sentence builder the drafts use); a missing record is said, not filled
  const drivers = rated.map(({ n, rt }) => {
    const sd = sentenceDim(X, n); const gap = sd.miss.length ? `No dated record on file for ${asam.dimOf(n).short}. Still needed: ${sd.miss[0].replace(/^D\d:\s*/, '')}.` : '';
    return { n, short: asam.dimOf(n).short, label: dimLabel(n), rating: rt, ratingLabel: RATE(rt), date: String(a.date).slice(0, 10), text: sd.text.replace(MISSING_RE, '').replace(/\s+/g, ' ').trim(), gap, ids: sd.ids };
  });
  // engagement: attendance counts as stored (the engagement record, the D4 note); never a made-up percentage
  const eng = X.items.filter(e => e.kind === 'engagement' && e.usable && !e.fromAssessment).sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const lines = []; let score = null;
  const frac = t => { const m = /(\d+)\s+of\s+(\d+)/.exec(String(t || '')); return m ? { attended: +m[1], scheduled: +m[2] } : null; };
  for (const e of eng.slice(0, 2)) { lines.push({ text: e.quote, ids: [e.id] }); const f = frac(e.quote); if (f && f.scheduled && !score) score = { ...f, pct: Math.round((100 * f.attended) / f.scheduled), ids: [e.id] }; }
  if (a) { const n4 = asam.noteOf(a, 4); if (n4 && !eng.length) { lines.push({ text: n4, ids: [`EV-ASM-${a.id}-D4`] }); const f = frac(n4); if (f && f.scheduled) score = { ...f, pct: Math.round((100 * f.attended) / f.scheduled), ids: [`EV-ASM-${a.id}-D4`] }; } }
  const since = X.since; const dailyNotes = (s.notes || []).filter(n => n.client === r.client && n.type === 'daily' && String(n.date).slice(0, 10) >= since).length;
  const engagement = { score, lines, dailyNotes };
  // risk signals remaining: each from a record or a rule, with its evidence
  const risks = [];
  const add = (key, tone, text, ids = []) => risks.push({ key, tone, text, ids });
  if (!a) add('assessment', 'danger', 'No ASAM assessment is on file.');
  if (a && du.state === 'overdue') add('reassess', 'danger', `Reassessment was due ${fmtDate(du.dueDate)}, ${plural(-du.left, 'day', 'days')} ago (${du.limit}-day rule).`, [aid(a)]);
  const inc = a ? (s.incidents || []).filter(i => i.client === r.client && String(i.date).slice(0, 10) > String(a.date).slice(0, 10)).sort((x, y) => String(y.date).localeCompare(String(x.date)))[0] : null;
  if (inc) add('incident', 'danger', `An incident on ${fmtDate(inc.date)} came after the assessment of ${fmtDate(a.date)}. The ratings may understate current risk.`, [`EV-INC-${String(inc.date).slice(0, 10)}`]);
  if (a && du.state === 'soon') add('reassess-soon', 'warning', `Reassess by ${fmtDate(du.dueDate)} (${du.limit}-day rule).`, [aid(a)]);
  for (const x of rated.filter(z => z.rt >= 3)) add(`d${x.n}-high`, 'warning', `${asam.dimOf(x.n).short} (${dimLabel(x.n).toLowerCase()}) is rated ${x.rt}, ${RATE(x.rt).toLowerCase()}.`, [`EV-ASM-${a.id}-D${x.n}`]);
  const u = unitsView(s, r);
  if (u.total && u.left === 0) add('units', 'danger', `All ${u.total} units are used.`);
  else if (u.warn) add('units', 'warning', `${u.left} of ${u.total} units are left (${u.pct}% used).`);
  if (X.needs.some(n => n.key === 'prior')) add('prior', 'warning', 'No lower level of care is documented as tried. Still needed: provider, dates and outcome.');
  if (inputs) add('inputs', 'warning', `${plural(inputs, 'suggestion needs', 'suggestions need')} your own words before the request is complete.`);
  risks.sort((x, y) => (x.tone === 'danger' ? 0 : 1) - (y.tone === 'danger' ? 0 : 1));
  return { id: r.id, client: r.client, initials: c.initials || r.client, hasAssessment: !!a, summary, trend, screens, drivers, engagement, risks, inputs };
}

// ------------------------------------------------------------------------------------------------ A-14 payer criteria
// the rows are the old checklist (six dimensions, the level of care, the reassessment clock); the tiles and "to maximize" come from the same record, the payer's stored notes and the sample
export function criteriaView(s, r) {
  const today = clockToday(s); const X = evidenceIndex(s, null, r); const a = X.assessment; const lvl = asam.requestLevel(r);
  const ck = asam.levelCheck(a, lvl); const du = asam.dueState(s, a, lvl, today);
  const need = new Map(X.needs.map(n => [n.key, n])); const recs = authRecsFor(s, r);
  const recObj = pred => recs.find(q => pred(q.key) && q.state !== 'dismissed') || null;
  const recFor = pred => { const x = recObj(pred); return x ? x.key : ''; };
  const incl = pred => { const x = recObj(pred); return !!x && x.state === 'included'; };   // included by the clinician: the stored record is unchanged, so the pill stays computed
  const rows = [];
  for (const dm of asam.DIMS) {
    const n = dm.n; const rt = a ? asam.ratingOf(a, n) : null; const nd = need.get('d' + n);
    const dated = X.usable.filter(e => !e.fromAssessment && e.current && (e.kind === DIM_KIND[n] || (e.kind === 'daily_note' && e.dim === n && (n === 4 || n === 5))));
    let state, text;
    if (!a) { state = 'needs'; text = 'No ASAM assessment is on file, so this dimension has no rating.'; }
    else if (rt == null) { state = 'needs'; text = `Not rated in the assessment of ${fmtDate(a.date)}.`; }
    else if (nd) { state = 'needs'; text = `Rated ${rt} (${RATE(rt)}) on ${fmtDate(a.date)}. No dated record yet. Still needed: ${nd.label.replace(/^D\d:\s*/, '')}.`; }
    else { state = 'documented'; text = `Rated ${rt} (${RATE(rt)}) on ${fmtDate(a.date)}. ${dated.length ? `${dated.length} dated record${dated.length === 1 ? '' : 's'} in the last ${X.window} days.` : 'No dated record is needed at this rating.'}`; }
    rows.push({ key: 'd' + n, label: `${dm.short} · ${dm.label}`, state, text, rec: recFor(k => k.startsWith(`d${n}-`)), included: incl(k => k.startsWith(`d${n}-`)) });
  }
  const lvText = ck.headline || '';
  rows.push({ key: 'level', label: lvl ? `Level of care · ${asam.levelTag(lvl)}` : 'Level of care', state: ck.state === 'match' ? 'documented' : 'needs', text: ck.state === 'match' ? `${lvText}.` : ck.state === 'none' ? `${lvText}.` : `${lvText}. The reason is the clinician's to give.`, rec: recFor(k => k.startsWith('level-')), included: incl(k => k.startsWith('level-')) });
  // an incident after the last assessment means the ratings may understate current risk: a reassessment is indicated
  const inc = a ? (s.incidents || []).filter(i => i.client === r.client && String(i.date).slice(0, 10) > String(a.date).slice(0, 10)).sort((x, y) => String(y.date).localeCompare(String(x.date)))[0] : null;
  const clockText = du.state === 'none' ? 'No assessment is on file, so no reassessment clock is running.' : du.state === 'overdue' ? `Last assessed ${fmtDate(a.date)}. Reassessment was due ${fmtDate(du.dueDate)}, ${-du.left} day${du.left === -1 ? '' : 's'} ago (${du.limit}-day rule).`
    : inc ? `An incident on ${fmtDate(inc.date)} came after the assessment of ${fmtDate(a.date)}. The ratings may understate current risk, so a reassessment is indicated. The ${du.limit}-day rule runs to ${fmtDate(du.dueDate)}.` : `Last assessed ${fmtDate(a.date)}. Reassess by ${fmtDate(du.dueDate)} (${du.limit}-day rule).`;
  rows.push({ key: 'clock', label: 'Reassessment clock', state: du.state === 'none' || du.state === 'overdue' || inc ? 'needs' : 'documented', text: clockText, rec: recFor(k => k === 'assessment' || k === 'reassess'), included: incl(k => k === 'assessment' || k === 'reassess') });
  const documented = rows.filter(x => x.state === 'documented').length; const total = rows.length; const needs = total - documented; const pct = Math.round((100 * documented) / total);
  const pn = payerOf(s, r.payer); const pat = payerPattern(s, r.payer);
  const reasons = insights(s, 'auth').denialReasons.filter(x => x.payer === r.payer).slice(0, 2).map(x => ({ reason: noQuote(x.reason), count: x.count, pct: x.pct }));
  const status = needs ? { tone: 'warning', text: `${needs} ${needs === 1 ? 'item needs' : 'items need'} strengthening before submission` } : { tone: 'success', text: 'All criteria documented · ready for review' };
  return {
    id: r.id, request: r, payer: { id: r.payer, name: pn.name }, level: lvl, rows, documented, total, needs, pct,
    sources: ['ASAM ratings and dated records', 'Payer notes on file', 'Denial reasons (sample)', 'Rules table (demo assumptions)'],
    status,
    tiles: [
      { key: 'match', label: 'Chart-to-criteria match', value: `${documented}/${total}`, caption: `${pct}% documented before any action`, sample: false },
      { key: 'approval', label: 'Historical approval rate', value: pat.approvalPct != null ? `${pat.approvalPct}%` : 'Not in the sample', caption: `${pn.name}${lvl ? ', ' + asam.levelTag(lvl) : ''}`, sample: true },
      { key: 'tool', label: 'Level-of-care tool', value: 'ASAM Criteria', caption: 'Names follow the 3rd edition; a payer may use the 4th', sample: false }
    ],
    maximize: { why: { payer: pn.name, tends: pat.tends, reasons, sample: reasons.length > 0, basis: INTEL_BASIS }, include: recs.filter(x => x.state !== 'dismissed').map(x => ({ key: x.key, title: x.title, state: x.state, needsInput: !!x.needsInput && !String(x.context || '').trim() })) }
  };
}

// ------------------------------------------------------------------------------------------------ A-15 historical outcomes
const F1X = { F10: 'Alcohol', F11: 'Opioid', F12: 'Cannabis', F13: 'Sedative', F14: 'Cocaine', F15: 'Stimulant', F16: 'Hallucinogen', F17: 'Nicotine', F18: 'Inhalant', F19: 'Other substance' };
const OTHER_DX = { F31: 'Bipolar', F32: 'Depressive', F33: 'Depressive', F41: 'Anxiety', F43: 'Trauma-related', F90: 'ADHD', F91: 'Conduct', F60: 'Personality' };
export function historicalView(s, r) {
  const c = clientOf(s, r.client); const cv = criteriaView(s, r); const X = evidenceIndex(s, null, r); const a = X.assessment; const lvl = asam.requestLevel(r);
  const codes = String(c.diagnosis || '').split(/[,;]\s*/).map(x => x.trim()).filter(Boolean);
  const sub = codes.filter(x => F1X[x.slice(0, 3)]); const co = codes.filter(x => !F1X[x.slice(0, 3)]);
  const dimsHigh = a ? asam.DIMS.filter(dm => (asam.ratingOf(a, dm.n) ?? -1) >= 2).map(dm => dm.short) : [];
  const matching = [
    { key: 'dx', label: 'Diagnosis category', value: sub.length ? [...new Set(sub.map(x => `${F1X[x.slice(0, 3)]} (${x.slice(0, 3)})`))].join(', ') : codes.length ? codes.join(', ') : 'None on the client record' },
    { key: 'level', label: 'ASAM level', value: lvl || 'Not recorded' },
    { key: 'dims', label: 'Dimensions rated 2 or more', value: dimsHigh.length ? dimsHigh.join(', ') : a ? 'None' : 'Not assessed' },
    { key: 'cooccurring', label: 'Co-occurring condition', value: co.length ? [...new Set(co.map(x => OTHER_DX[x.slice(0, 3)] ? `${OTHER_DX[x.slice(0, 3)]} (${x})` : x))].join(', ') : 'None on the client record' },
    { key: 'docs', label: 'Documentation signals', value: `${cv.documented} of ${cv.total} criteria documented` }
  ];
  // the payer's top stored denial reason, with the pattern counted from the sample
  const short = payerShort(s, r.payer); const mine = insights(s, 'auth').denialReasons.filter(x => x.payer === r.payer);
  const top = mine.slice().sort((x, y) => y.count - x.count)[0] || null; const sum = mine.reduce((n, x) => n + x.count, 0) || 1; const pat = payerPattern(s, r.payer);
  const driver = top ? { reason: noQuote(top.reason), count: top.count, pct: Math.round((100 * top.count) / sum), observed: [
    { text: `In the sample, ${top.count} ${short} denials cited this reason (${Math.round((100 * top.count) / sum)}% of that payer's denials).`, sample: true },
    ...(pat.tends ? [{ text: `What ${short} tends to ask, from the payer notes on file: ${String(pat.tends).replace(/\.$/, '')}.`, sample: false }] : [])
  ] } : null;
  // the strengths of this record, computed true or false (never invented)
  const has = k => !X.needs.some(n => n.key === k); const aid = a ? [`EV-ASM-${a.id}`] : [];
  const ck = asam.levelCheck(a, lvl); const du = asam.dueState(s, a, lvl, clockToday(s));
  const supporting = [
    { key: 'rated', label: 'Every dimension is rated and dated', ok: !!a && asam.complete(a), ids: aid },
    { key: 'current', label: 'The assessment is current under the reassessment rule', ok: !!a && du.state !== 'overdue', ids: aid },
    { key: 'dated', label: 'Dated records are on file for the dimensions rated 2 or more', ok: !!a && !X.needs.some(n => /^d[1-6]$/.test(n.key)), ids: [] },
    ...(lvl && lvl !== '1' ? [{ key: 'prior', label: 'A lower level of care is documented as tried', ok: has('prior'), ids: [] }] : []),
    { key: 'reason', label: 'The reason for the level is stated', ok: !!a && (ck.state === 'match' || !!a.plan), ids: aid }
  ];
  const needs = cv.needs;
  const interpretation = needs === 0
    ? { key: 'favorable', label: 'Approval-favorable', tone: 'success', text: 'Every criterion on the list is documented in the record. The approved cases in the sample have this in common.' }
    : needs <= 2
      ? { key: 'completion', label: 'Approval-favorable with documentation completion', tone: 'warning', text: `${plural(needs, 'criterion on the list is', 'criteria on the list are')} not documented yet. Closing ${needs === 1 ? 'it' : 'them'} brings this request closer to the approved cases in the sample.` }
      : { key: 'gaps', label: 'Documentation gaps to close first', tone: 'danger', text: `${plural(needs, 'criterion needs', 'criteria need')} documentation. The denied case in the sample shows the same pattern.` };
  return { id: r.id, payer: cv.payer, level: lvl, matching, driver, supporting, outcomes: historicalCards(s), interpretation, needs, sample: true, basis: INTEL_BASIS };
}

// ------------------------------------------------------------------------------------------------ A-06 Analyze a case
export const ANALYSIS_STEPS = [
  'Identifying the payer and plan type',
  'Looking up the payer\'s published criteria on file',
  'Comparing the record with the level-of-care criteria',
  'Finding documentation gaps',
  'Building the request from stored records',
  'Building the denial-prevention list'
];
// the authorization panel of a stored consumer: computed from the authorization on the client record and the clock
export function authStatusOf(s, r) {
  const u = unitsView(s, r); const rn = renewal(s, r); const risk = atRisk(s, r); const today = clockToday(s);
  if (!u.total) return { approved: null, used: null, remaining: null, start: null, expires: null, daysToExpiry: null, daysOfUnits: null, rate: null, urgent: false, action: 'No authorization is recorded in the tracker yet.' };
  const toEnd = u.end ? daysBetween(today, u.end) : null; const urgent = !!(rn && rn.due) || (u.daysLeft != null && rn && u.daysLeft <= rn.lead);
  return { approved: u.total, used: u.used, remaining: u.left, start: u.start, expires: u.end, daysToExpiry: toEnd, daysOfUnits: u.daysLeft, rate: u.rate ? u.rate.value : null, urgent, action: risk ? risk.why : urgent ? 'Renewal is due.' : 'No action is needed right now.' };
}
export function urgentOf(s, r) {
  const st = authStatusOf(s, r); if (!st.approved || !st.urgent) return null;
  const n = st.daysOfUnits; const lines = [`${st.remaining} of ${st.approved} units remain.`];
  if (st.rate && n != null) lines.push(`At ${st.rate} units a day they cover about ${n} ${n === 1 ? 'day' : 'days'}.`);
  if (st.expires) lines.push(st.daysToExpiry < 0 ? `The current authorization ended ${fmtDate(st.expires)}.` : `The current authorization ends ${fmtDate(st.expires)} (${st.daysToExpiry} ${st.daysToExpiry === 1 ? 'day' : 'days'} from today).`);
  const risk = atRisk(s, r); if (risk) lines.push(risk.why);
  return { title: n != null ? `Urgent: units run out in about ${n} ${n === 1 ? 'day' : 'days'}` : 'Urgent: the renewal is due', lines };
}
// pasted text is only scanned for numbers; no clinical claim is drawn from it. The person confirms what was read.
export function readStatusText(text) {
  const t = String(text || ''); const num = re => { const m = re.exec(t); return m ? +m[1] : null; };
  let approved = num(/(\d{1,4})\s*units?\s*(?:approved|authori[sz]ed)/i); if (approved == null) approved = num(/(?:approved|authori[sz]ed)[:\s]+(\d{1,4})\s*units?/i);
  let used = num(/units?\s*used(?:\s*to\s*date)?[:\s]+(\d{1,4})/i); if (used == null) used = num(/(\d{1,4})\s*units?\s*used/i);
  let remaining = num(/units?\s*remaining[:\s]+(\d{1,4})/i); if (remaining == null) remaining = num(/(\d{1,4})\s*units?\s*(?:remaining|left)/i);
  const days = num(/expire[sd]?\s*(?:in\s*)?(\d{1,3})\s*days?/i) ?? num(/(\d{1,3})\s*days?\s*(?:until|before)\s*(?:the\s*)?(?:authorization\s*)?expir/i);
  if (approved != null && used != null && remaining == null) remaining = Math.max(0, approved - used);
  if (approved != null && remaining != null && used == null) used = Math.max(0, approved - remaining);
  const parts = [approved != null ? `${approved} units approved` : '', used != null ? `${used} used` : '', remaining != null ? `${remaining} remaining` : '', days != null ? `expires in ${days} ${days === 1 ? 'day' : 'days'}` : ''].filter(Boolean);
  const found = parts.length;
  return { approved, used, remaining, days, found, text: found ? `Psyflo read: ${parts.join(' · ')}. Check it against the payer's notice.` : 'Psyflo found no unit counts in the text. Choose a stored consumer or type the counts in the payer context.' };
}
const SCRUB = [[/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[removed]'], [/\b\d{3}-\d{2}-\d{4}\b/g, '[removed]'], [/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[removed]'], [/\b\d{8,}\b/g, '[removed]']];
export function scrubText(text, remove = []) {
  let t = String(text || '');
  for (const x of (remove || []).map(v => String(v || '').trim()).filter(v => v.length >= 3)) t = t.split(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join('[removed]');
  for (const [re, to] of SCRUB) t = t.replace(re, to);
  return t;
}
export function previewOf(s, r) {
  const c = clientOf(s, r.client); const X = evidenceIndex(s, null, r); const a = X.assessment; const lvl = asam.requestLevel(r);
  const lines = [`Client ${c.initials || r.client}${c.age != null ? `, age ${c.age}` : ''}. ${lvl ? asam.levelName(lvl) + ' requested.' : 'No level of care on the request.'}`,
    a ? `Assessed ${fmtDate(a.date)}: ${asam.ratingsLine(a)}.` : 'No ASAM assessment is on file.', 'Name, member ID and group number are removed before analysis.'];
  return { initials: c.initials || r.client, age: c.age != null ? c.age : null, lines };
}
