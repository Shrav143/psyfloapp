// Psyflo-suggested recommendations (pure; imported by the server actions, the platform screens and the extension panel).
//
// A recommendation is one specific thing Psyflo suggests to make a request or a payer reply stronger, in the way a utilization reviewer would
// read it. Every one is computed from the stored record (the clinician's ASAM ratings, the dated evidence, the reassessment rule, the units,
// the payer's stated reason). Psyflo never writes a clinical claim of its own:
//   · `insert.text` is a sentence built ONLY from stored records (the same sentence builders the drafts use), each traced to evidence ids;
//   · when no record exists, the card says what is needed (`needsInput`) and the text that goes in is the clinician's own context, typed in the card;
//   · the person decides: Include / Dismiss / Add context. Nothing is sent and nothing is typed into Lauris without a person pressing a button.
//
// Three scopes share one shape:   'auth'   a request in the Authorizations queue and its Lauris form (SRA)
//                                  'denial' a payer reply case in Denial Intelligence (appeal, peer-to-peer, information reply, reconsideration)
//                                  'note'   Scan & Enhance on a note or form open in Lauris
//
// Rec = { id:'<scope>:<ref>:<key>', key, family, scope, ref, kind, title, why, impact:'high'|'medium'|'low', dim:0..6, evidence:[ids],
//         insert:{ box|doc, text }|null, needsInput:{ prompt, placeholder }|null, act:{ kind:'lauris'|'chart'|'asam'|'denial', label, path? }|null,
//         outcome:{ applied, success, lift }|null, state:'open'|'included'|'dismissed', context, custom?, by, at }
//
// The "applied N times · N% success" and "+N pts" numbers come from seed/extra/recs.json (`rec_outcomes`): an ILLUSTRATIVE SAMPLE, never Harvest's own
// history. Screens that show them must say so (OUTCOME_BASIS) and mark them Simulated.
import { fmtDate, addDays, daysBetween } from './dates.js';
import { today as clockToday } from './clock.js';
import { ruleValue } from './rules.js';
import * as asam from './asam.js';
import { byId, client as clientOf } from './model.js';
import { evidenceIndex, sentenceDim, sentenceLevel, sentencePrior, sentenceCurrent, sentenceRisk, weakPoints, missingItems, compareReasons, byRequest, deadlinesOf, payerFirst, unitsView, missing, DIM_KIND, dimNeedLabel, issueOfRequest } from './sel/disputes.js';
import { renewal } from './sel/auth.js';
import { DIM_BOX, scanFindings } from './enhance.js';

export const SCOPES = ['auth', 'denial', 'note'];
export const STATES = ['open', 'included', 'dismissed'];
export const IMPACT_LABEL = { high: 'High impact', medium: 'Medium impact', low: 'Lower impact' };
export const OUTCOME_BASIS = 'Illustrative sample from the demo data. It is not Harvest\'s own history and it is not a prediction.';
export const CONTEXT_MAX = 600;
export const recId = (scope, ref, key) => `${scope}:${ref}:${key}`;
const cap1 = t => String(t || '').replace(/^./, c => c.toUpperCase());
const slug = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// ------------------------------------------------------------------------------------------------ outcomes (sample)
export const outcomeOf = (s, family) => ((s && s.rec_outcomes) || []).find(o => o.family === family) || null;
const withOutcome = (s, rec) => ({ ...rec, outcome: outcomeOf(s, rec.family) });

// ------------------------------------------------------------------------------------------------ decisions
export const decisionsOf = (s, scope, ref) => ((s && s.rec_decisions) || []).filter(x => x.scope === scope && String(x.ref) === String(ref));
export const decisionFor = (s, scope, ref, key) => decisionsOf(s, scope, ref).find(x => x.key === key) || null;
// the person's own recommendation (the user can add): stored as a decision row with custom:true
export function customRec(row) {
  return { id: recId(row.scope, row.ref, row.key), key: row.key, family: 'custom', scope: row.scope, ref: row.ref, kind: 'custom', title: row.title, why: 'Added by a clinician.', impact: 'medium', dim: row.dim || 0, evidence: [],
    insert: { box: row.box || '', doc: 'all', text: row.text || '' }, needsInput: null, act: null, outcome: null, custom: true };
}
// merge stored decisions into computed recs, then append the person's own recommendations
export function withDecisions(s, scope, ref, recs) {
  const rows = decisionsOf(s, scope, ref); const by = new Map(rows.map(x => [x.key, x]));
  const out = recs.map(r => { const x = by.get(r.key); return { ...r, state: x ? x.state : 'open', context: x ? x.context || '' : '', by: x ? x.by : null, at: x ? x.at : null }; });
  for (const x of rows.filter(x => x.custom)) out.push({ ...customRec(x), state: x.state || 'included', context: x.context || '', by: x.by, at: x.at });
  return out;
}
// the text a rec puts in: the stored-record sentence, or the person's own context (a card that needs input has no text of its own)
export const textOf = r => String((r.needsInput ? r.context : (r.insert && r.insert.text) || r.context) || '').trim();
export const isReady = r => !!textOf(r) || (!r.needsInput && !!r.act);   // an action-only rec (open Lauris, reassess) can be marked done without text
export const included = recs => recs.filter(r => r.state === 'included');
// what goes into the request or packet: included recs that have text
export function insertsFor(recs, doc = '') {
  return included(recs).filter(r => !doc || !r.insert || !r.insert.doc || r.insert.doc === 'all' || r.insert.doc === doc).map(r => ({ id: r.id, key: r.key, box: r.insert && r.insert.box || '', doc: r.insert && r.insert.doc || '', text: textOf(r), evidence: r.evidence || [], title: r.title })).filter(x => x.text);
}

// ------------------------------------------------------------------------------------------------ summary (Oprox "n of N included", expected approval)
export function summary(s, recs, { base = null } = {}) {
  const total = recs.length; const inc = recs.filter(r => r.state === 'included'); const dis = recs.filter(r => r.state === 'dismissed'); const open = recs.filter(r => r.state === 'open');
  const b = base != null ? base : ((s && s.rec_baseline && s.rec_baseline.approval) != null ? s.rec_baseline.approval : 62);
  const lift = inc.reduce((n, r) => n + ((r.outcome && r.outcome.lift) || 0), 0);
  const expected = Math.min(96, b + lift);
  return { total, included: inc.length, dismissed: dis.length, open: open.length, needInput: open.filter(r => r.needsInput && !String(r.context || '').trim()).length, base: b, expected, lift, basis: OUTCOME_BASIS };
}

// ------------------------------------------------------------------------------------------------ authorization requests
const LAURIS = (c, form) => ({ kind: 'lauris', label: form === 'cna' ? 'Open the assessment in Lauris' : 'Open in Lauris', path: c && (c.lauris_no || c.harvest_no) ? `/consumers/${c.lauris_no || c.harvest_no}/session/${form}` : '/consumers' });
const dimOfNeed = k => (/^d([1-6])$/.exec(k) || [])[1];

// authRecs(s, r) -> Rec[] (without decisions). `r` is a request of the Authorizations queue.
export function authRecs(s, r, { idx = null } = {}) {
  if (!r) return [];
  const c = clientOf(s, r.client) || {}; const today = clockToday(s); const out = [];
  const X = idx || evidenceIndex(s, null, r); const a = X.assessment; const lvl = asam.requestLevel(r); const ck = asam.levelCheck(a, lvl); const du = asam.dueState(s, a, lvl, today);
  const add = o => out.push(withOutcome(s, { scope: 'auth', ref: r.id, evidence: [], insert: null, needsInput: null, act: null, dim: 0, impact: 'medium', ...o, id: recId('auth', r.id, o.key) }));
  const isInit = r.type === 'initial';
  // 1. the assessment itself: none on file, or older than the reassessment rule allows
  if (!a) add({ key: 'assessment', family: 'reassess', kind: 'timing', title: 'Complete the ASAM assessment before this request goes out', why: 'A payer reads the six dimension ratings first. A request with no assessment on file is the most common reason for a pend.', impact: 'high', act: LAURIS(c, 'cna') });
  else if (du.state === 'overdue') add({ key: 'reassess', family: 'reassess', kind: 'timing', title: `Reassess now: the ratings are ${du.days} days old`, why: `The reassessment rule is ${du.limit} days at this level. A payer can discount ratings older than its interval, so the request is stronger with a current assessment.`, impact: 'high', evidence: [`EV-ASM-${a.id}`], act: LAURIS(c, 'cna') });
  // 2. the level of care against the ratings
  if (a && ck.state === 'match') { const l = sentenceLevel(X, r); add({ key: 'level-cite', family: 'level-cite', kind: 'level', title: `Lead with why the ratings support Level ${lvl}`, why: 'Name the dimensions that are above what the next lower level can manage. Reviewers look for this sentence first.', impact: 'high', evidence: l.ids, insert: { box: 'Level of care', doc: 'all', text: l.text } }); }
  else if (a && ck.state === 'over') add({ key: 'level-reason', family: 'level-reason', kind: 'level', title: `Say why Level ${lvl} is needed when the ratings alone fit Level ${ck.lowest}`, why: 'The reason beyond the ratings is the clinician\'s to give (safety, a lower level that failed, the home). Without it a reviewer will step the request down.', impact: 'high', evidence: [`EV-ASM-${a.id}`], insert: { box: 'Reason for the requested level', doc: 'all', text: '' }, needsInput: { prompt: `Why does ${c.initials || 'the client'} need Level ${lvl}?`, placeholder: 'For example: a lower level was tried and the client returned to daily use within a week.' } });
  else if (a && ck.state === 'under') add({ key: 'level-lower', family: 'level-reason', kind: 'level', title: `Say why Level ${lvl} was requested when the ratings point higher`, why: 'The ratings fit a higher level than the request. The reviewer will ask; the reason is the clinician\'s (transport, family choice, a step-up plan).', impact: 'medium', evidence: [`EV-ASM-${a.id}`], insert: { box: 'Reason for the requested level', doc: 'all', text: '' }, needsInput: { prompt: 'Why was the lower level requested?', placeholder: 'For example: the family chose the lower level and agreed to a step-up trigger.' } });
  // 3. each dimension: cite the dated records when they exist, ask for them when they do not
  const need = new Map(X.needs.map(n => [n.key, n]));
  const dims = asam.DIMS.map(dm => ({ n: dm.n, dm, rt: a ? asam.ratingOf(a, dm.n) : null })).filter(x => x.rt != null && x.rt >= 2).sort((x, y) => y.rt - x.rt || x.n - y.n);
  const drivers = new Set((ck.drivers || []).map(x => x.n));
  for (const { n, dm, rt } of dims.slice(0, 3)) {
    const have = !need.has('d' + n); const sd = sentenceDim(X, n, { head: false });
    if (have && sd.ids.length > 1) add({ key: `d${n}-cite`, family: 'dim-cite', kind: 'evidence', dim: n, title: `Add the dated records behind ${dm.short} (rated ${rt})`, why: `${dm.short} is above what a lower level can manage${drivers.has(n) ? ' and drives the level asked' : ''}. The dated records are what make the rating credible to a reviewer.`, impact: rt >= 3 || drivers.has(n) ? 'high' : 'medium', evidence: sd.ids, insert: { box: DIM_BOX[n - 1], doc: 'all', text: sd.text } });
  }
  for (const [key, nd] of need) {
    const n = dimOfNeed(key); if (!n) continue; const dm = asam.dimOf(+n); const rt = a ? asam.ratingOf(a, +n) : null;
    if (rt != null && rt < 2 && !['4', '5'].includes(n)) continue;   // a dimension rated None or Mild does not need its own card
    add({ key: `d${n}-add`, family: 'dim-add', kind: 'evidence', dim: +n, title: `Document ${dm.short} · ${dm.label.toLowerCase()}`, why: `${cap1(nd.label.replace(/^D\d:\s*/, ''))} is not on file. ${rt != null && rt >= 2 ? `The rating is ${rt}, so a reviewer will look for it.` : 'Without it the dimension reads as unsupported.'}`, impact: rt != null && rt >= 3 ? 'high' : 'medium', evidence: [], insert: { box: DIM_BOX[+n - 1], doc: 'all', text: '' }, needsInput: { prompt: `What did you find for ${dm.short}?`, placeholder: `Write what you collected: ${dm.evidence}.` }, act: LAURIS(c, 'cna') });
  }
  // 4. services already tried and what happens at a lower level (every payer asks)
  if (need.has('prior')) add({ key: 'prior', family: 'prior', kind: 'evidence', dim: 5, title: 'Document the lower level of care already tried', why: 'Reviewers ask what was tried first. Provider, dates and outcome are the three things they look for.', impact: 'high', insert: { box: 'Continued need / risk', doc: 'all', text: '' }, needsInput: { prompt: 'Which lower level was tried: provider, dates and outcome?', placeholder: 'For example: outpatient counseling with a named provider, Jun to Aug, stopped after four visits.' } });
  else if (!isInit) { const p = sentencePrior(X); if (p.ids.length) add({ key: 'prior-cite', family: 'prior', kind: 'evidence', dim: 5, title: 'Cite the lower level of care already tried', why: 'Reviewers ask what was tried first; the record already answers it.', impact: 'medium', evidence: p.ids, insert: { box: 'Continued need / risk', doc: 'all', text: p.text } }); }
  if (need.has('risk')) add({ key: 'risk', family: 'risk', kind: 'evidence', dim: 0, title: 'Say what is likely to happen at a lower level of care', why: 'A continued stay is approved on risk of loss of gains. The sentence is the clinician\'s; Psyflo has no record to draw it from.', impact: 'medium', insert: { box: 'Continued need / risk', doc: 'all', text: '' }, needsInput: { prompt: 'What is likely to happen at a lower level of care?', placeholder: 'Describe the risk in your own words, with dates if you have them.' } });
  else { const rk = sentenceRisk(X); if (rk && rk.ids && rk.ids.length) add({ key: 'risk-cite', family: 'risk', kind: 'evidence', dim: 0, title: 'Cite the documented risk at a lower level', why: 'A placement-risk record is on file; one sentence puts it in front of the reviewer.', impact: 'medium', evidence: rk.ids, insert: { box: 'Continued need / risk', doc: 'all', text: rk.text } }); }
  // 5. goals progress (continued stay) and timing
  if (need.has('isp')) add({ key: 'isp', family: 'isp', kind: 'evidence', dim: 0, title: 'Add treatment plan goal progress', why: 'Continued stay reads progress against the plan. Counts, not percentages.', impact: 'medium', insert: { box: 'Progress toward goals', doc: 'all', text: '' }, needsInput: { prompt: 'What progress has the client made against each goal, as counts?', placeholder: 'For example: 6 of 8 sessions attended, 2 of 4 refusal-skill practices completed.' } });
  const rn = renewal(s, r);
  if (rn && rn.end && rn.dueBy) {
    const left = daysBetween(today, rn.dueBy);
    if (left <= 7) add({ key: 'renewal-lead', family: 'renewal', kind: 'timing', title: left < 0 ? `Start the renewal now: it was due ${fmtDate(rn.dueBy)}` : `Start the renewal by ${fmtDate(rn.dueBy)}`, why: `The current authorization ends ${fmtDate(rn.end)}. Filing ${rn.lead} business days ahead keeps care from lapsing and leaves time for a request for information.`, impact: left < 0 ? 'high' : 'medium', act: { kind: 'chart', label: 'Open the request', path: '' } });
  }
  return out.sort(byImpact).slice(0, 6);   // a short list: the six that matter most (Oprox shows three; the rest are one click away in the drawer's "Add your own")
}
const RANK = { high: 0, medium: 1, low: 2 };
const byImpact = (x, y) => (RANK[x.impact] - RANK[y.impact]) || ((x.kind === 'timing' ? 0 : 1) - (y.kind === 'timing' ? 0 : 1));

// "Send the reply by tomorrow", "Appeal window closes in 3 days": a deadline as something to act on, not a label with a colon
const windowTitle = win => {
  const n = win.days, ago = `${-n} day${n === -1 ? '' : 's'} ago`;
  if (win.kind === 'reply') return n < 0 ? `The reply date passed ${ago}` : n === 0 ? 'Send the reply today' : n === 1 ? 'Send the reply by tomorrow' : `Send the reply within ${n} days`;
  return n < 0 ? `${String(win.label).replace(/ closes$/, ' closed')} ${ago}` : `${win.label} ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'}`;
};
// ------------------------------------------------------------------------------------------------ Denial Intelligence
// denialRecs(s, d, r, idx) -> Rec[]: what would make the reply stronger. Built from the same weak points and records the workspace shows.
export function denialRecs(s, d, r, idx = null) {
  if (!r || !d) return [];
  const X = idx || evidenceIndex(s, d, r); const c = clientOf(s, r.client) || {}; const pf = payerFirst(s, r.payer); const a = X.assessment; const lvl = asam.requestLevel(r); const ck = asam.levelCheck(a, lvl); const out = [];
  const add = o => out.push(withOutcome(s, { scope: 'denial', ref: r.id, evidence: [], insert: null, needsInput: null, act: null, dim: 0, impact: 'medium', ...o, id: recId('denial', r.id, o.key) }));
  const du = asam.dueState(s, a, lvl, clockToday(s)); const dl = deadlinesOf(s, d, r); const win = dl.find(x => x.date);
  // 1. the clock first: a reply that misses its window loses every other improvement
  if (win && win.days != null && win.days <= 7) add({ key: 'window', family: 'window', kind: 'timing', title: windowTitle(win), why: `Every other improvement depends on getting the reply in on time. Confirm the date on the payer's own notice.`, impact: 'high', act: { kind: 'denial', label: 'Open the case' } });
  // 2. lead with the ratings that support the level, or fix the ones that do not
  if (a && ck.state === 'match') { const l = sentenceLevel(X, r); add({ key: 'cite-asam', family: 'cite-asam', kind: 'appeal', title: `Cite the ASAM dimensions that support Level ${lvl}`, why: `${pf}'s reviewer applies its own criteria. Name the dimensions that are above the next lower level and say that the ratings are the clinician's.`, impact: 'high', evidence: l.ids, insert: { doc: 'all', text: l.text } }); }
  else if (a && ck.state === 'over') add({ key: 'level-reason', family: 'level-reason', kind: 'appeal', title: `Say why Level ${lvl} is needed beyond what the ratings alone fit (Level ${ck.lowest})`, why: `${pf} can point to the ratings to step the level down. The reason beyond the ratings has to come from the clinician.`, impact: 'high', evidence: [`EV-ASM-${a.id}`], insert: { doc: 'all', text: '' }, needsInput: { prompt: `Why does ${c.initials || 'the client'} need Level ${lvl}?`, placeholder: 'Safety, a lower level that failed, the home. Your words, with dates.' } });
  if (!a) add({ key: 'assessment', family: 'reassess', kind: 'timing', title: 'Complete the ASAM assessment before anything goes to the payer', why: 'A reply with no ratings on file has nothing for the reviewer to read.', impact: 'high', act: LAURIS(c, 'cna') });
  else if (du.state === 'overdue') add({ key: 'reassess', family: 'reassess', kind: 'timing', title: `Reassess before replying: the ratings are ${du.days} days old`, why: `A payer can discount ratings older than its interval (${du.limit} days at this level).`, impact: 'high', evidence: [`EV-ASM-${a.id}`], act: LAURIS(c, 'cna') });
  for (const i of (s.incidents || []).filter(i => a && i.client === r.client && String(i.date).slice(0, 10) > a.date)) add({ key: 'incident-' + String(i.date).slice(0, 10), family: 'reassess', kind: 'timing', dim: 5, title: `Reassess: an incident on ${fmtDate(i.date)} came after the ${fmtDate(a.date)} assessment`, why: 'The ratings may understate current risk. Reassess D1, D3 and D5 first, then cite the incident.', impact: 'high', evidence: [`EV-INC-${String(i.date).slice(0, 10)}`], act: LAURIS(c, 'cna') });
  // 3. what each stated reason turns on: answer it with a record, or ask for the record
  for (const x of compareReasons(s, d, r, X)) {
    if (x.matched && !x.need.length && x.ids.length) add({ key: 'answer-' + x.key, family: 'answer-reason', kind: 'appeal', title: `Answer “${trim(x.said, 70)}” with the stored records`, why: 'The payer\'s own reason is answered by dated records already on file. Say so directly, with the dates.', impact: 'high', dim: (x.dims[0] || {}).n || 0, evidence: x.ids, insert: { doc: 'all', text: x.shows } });
    else if (x.matched && x.need.length) add({ key: 'answer-' + x.key + '-gap', family: 'answer-reason', kind: 'appeal', title: `Add what is missing to answer “${trim(x.said, 60)}”`, why: `The reason is on file, and the record that would answer it is not: ${x.need.join('; ')}.`, impact: 'high', dim: (x.dims[0] || {}).n || 0, evidence: x.ids, insert: { doc: 'all', text: '' }, needsInput: { prompt: x.need[0] ? cap1(x.need[0]) + '?' : 'What record answers this?', placeholder: 'Write what the chart shows, with dates.' } });
  }
  // 4. what is not documented, once each (the same list as Identify Missing Evidence)
  for (const m of missingItems(s, d, r, X).slice(0, 5)) {
    if (m.key === 'assessment') continue;
    const n = m.dim || 0; const dm = n ? asam.dimOf(n) : null;
    add({ key: 'gap-' + m.key, family: 'dim-add', kind: 'evidence', dim: n, title: m.key === 'notice' ? 'Record the reference number of the payer decision' : `Document: ${m.label.replace(/^D\d:\s*/, '')}`, why: dm ? `${dm.short} is part of the payer's criteria. Printed as "Evidence missing" until a person adds it.` : 'Printed as "Evidence missing" in the reply until a person adds it.', impact: n && a && asam.ratingOf(a, n) >= 3 ? 'high' : 'medium', insert: { doc: 'all', text: '' }, needsInput: { prompt: cap1(m.label.replace(/^D\d:\s*/, '')) + '?', placeholder: 'Write what the chart shows, with dates.' }, act: n ? LAURIS(c, 'cna') : null });
  }
  // 5. what the units mean: payers rarely have the run-out date in front of them
  const u = unitsView(s, d, r);
  if (u.current != null && u.runOut) add({ key: 'units', family: 'units', kind: 'appeal', title: 'State what the offered units cover and when they run out', why: `${pf} decides on units, not days. Saying that ${u.current} units run to about ${fmtDate(u.runOut)} makes the gap concrete.`, impact: 'medium', insert: { doc: 'all', text: `At ${u.rate} units a school day, ${u.current} units cover ${u.days} school days, to about ${fmtDate(u.runOut)}. The request asked for ${u.requested} units.` } });
  // 6. ask the payer, by phone or in the reply, the two questions that decide it
  if (d.issue !== 'info') add({ key: 'ask-criteria', family: 'p2p', kind: 'p2p', title: 'Ask which criterion was unmet and which records the reviewer read', why: 'A peer-to-peer lands better when the first question is about the payer\'s own criteria. Both answers go in the call note.', impact: 'medium', insert: { doc: 'p2p', text: `Which criterion did ${pf} find unmet, and which records did the reviewer read (with their dates)?` } });
  return out.sort(byImpact).slice(0, 10);
}
const trim = (t, n) => String(t || '').length > n ? String(t).slice(0, n - 1).trimEnd() + '…' : String(t || '');

// the section a reply document gets from the included recommendations (server: dispute.genDoc and recs.decide keep it up to date)
export const RECS_SECTION = 'recs';
export function docSection(recs, kind = '') {
  const items = insertsFor(recs, kind);
  if (!items.length) return null;
  return { key: RECS_SECTION, title: 'Added from recommendations', text: items.map(x => x.text).join('\n\n'), evidence: [...new Set(items.flatMap(x => x.evidence))], missing: [], basis: `${items.length} recommendation${items.length === 1 ? '' : 's'} included by a clinician` };
}
export const denialRecsFor = (s, d, r, idx) => withDecisions(s, 'denial', r.id, denialRecs(s, d, r, idx));
export const authRecsFor = (s, r, o) => withDecisions(s, 'auth', r.id, authRecs(s, r, o));

// ------------------------------------------------------------------------------------------------ Scan & Enhance (the extension)
// Each finding of scanFindings is a question with options; as a recommendation it keeps its question as `needsInput` and never writes text of its own.
const NOTE_IMPACT = { units: 'high', missing: 'high', wording: 'medium', boilerplate: 'low', evidence: 'medium' };
export function noteRecs(s, clientId, form, fields = []) {
  const ref = `${clientId}:${form}`; const seen = new Map();
  return scanFindings(s, clientId, form, fields).map(f => {
    const base = `${f.category}-${slug(f.box)}`; const n = (seen.get(base) || 0) + 1; seen.set(base, n); const key = n > 1 ? `${base}-${n}` : base;
    return withOutcome(s, { id: recId('note', ref, key), key, family: 'note-' + f.category, scope: 'note', ref, kind: f.category, title: f.issue, why: f.why, impact: NOTE_IMPACT[f.category] || 'medium', dim: 0, evidence: (f.evidence || []).map(e => e.ref), insert: { box: f.box, doc: '', text: '' }, needsInput: { prompt: f.question, placeholder: 'Your words.', options: f.options || null }, act: null, finding: { id: f.id, replaces: f.replaces || '', rule: f.rule || null, evidence: f.evidence || [] } });
  });
}
export const noteRecsFor = (s, clientId, form, fields) => withDecisions(s, 'note', `${clientId}:${form}`, noteRecs(s, clientId, form, fields));

// ------------------------------------------------------------------------------------------------ apply to a Lauris form
// boxes: [{ label, value, src? }] as the drafts produce them. Each included recommendation appends its text to its box; a box that does not exist is added.
// The text is yellow in Lauris (typed by Psyflo, check it) and the box keeps whatever the clinician already has.
export function applyToBoxes(boxes, recs) {
  const out = boxes.map(b => ({ ...b })); const notes = [];
  for (const x of insertsFor(recs).filter(x => x.box)) {
    const i = out.findIndex(b => b.label === x.box);
    if (i < 0) { out.push({ label: x.box, value: x.text, src: [], recs: [x.id] }); notes.push({ ...x, added: true }); continue; }
    const cur = String(out[i].value || '').trim(); const isMissingOnly = /^Evidence missing/.test(cur);
    if (cur.includes(x.text)) continue;
    out[i] = { ...out[i], value: isMissingOnly || !cur ? x.text : `${cur} ${x.text}`, recs: [...(out[i].recs || []), x.id] };
    notes.push(x);
  }
  return { boxes: out, applied: notes };
}

// ------------------------------------------------------------------------------------------------ one place to find a rec by key (the server validates a decision against the recomputed list)
export function findRec(s, scope, ref, key, extra = {}) {
  let list = [];
  if (scope === 'auth') list = authRecsFor(s, byId(s.requests, ref));
  else if (scope === 'denial') { const r = byId(s.requests, ref); const d = r && byRequest(s, ref); list = d ? denialRecsFor(s, d, r) : []; }
  else if (scope === 'note') { const [cl, form] = String(ref).split(':'); list = noteRecsFor(s, cl, form, extra.fields || []); }
  return list.find(x => x.key === key) || null;
}
export function listFor(s, scope, ref, extra = {}) {
  if (scope === 'auth') return authRecsFor(s, byId(s.requests, ref));
  if (scope === 'denial') { const r = byId(s.requests, ref); const d = r && byRequest(s, ref); return d ? denialRecsFor(s, d, r) : []; }
  if (scope === 'note') { const [cl, form] = String(ref).split(':'); return noteRecsFor(s, cl, form, extra.fields || []); }
  return [];
}
