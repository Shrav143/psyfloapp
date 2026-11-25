// ASAM readings for the platform screens (A3). PURE ESM: the browser, the server (projection, notifications) and the tests import this file.
//
// Everything here is DERIVED from the stored assessments (state.asam_assessments) by web/js/shared/asam.js; nothing is stored or invented:
//   asamAccess(actor)                      -> { level, ratings, text }   what this role may see: the level tag and the reassessment state (every staff role),
//                                              the six ratings and the match state (clinician, supervisor), the clinician's notes and plan (clinician only)
//   currentRequest(s, clientId)            -> the open request a client's level comes from (or null)
//   clientReading(s, actor, clientId, o)   -> { level, levelTag, has, date, ratings, check, due, change, incident, flags[], ... }  one call for a roster row, a chart or a case
//   requestReading(s, actor, r)            -> clientReading for a request's own level (requestLevel(r))
//   assessmentHistory(s, actor, clientId)  -> every assessment, newest first: date, kind, assessor, ratings, per-dimension notes, change vs the one before
//   reassessmentLabel / reassessWhy        the sentences the screens and the bell share
//   disputeReason(s, dispute)              -> { text, dims[], level, why[] } what a payer's stated reason turns on (reasonDims over the concerns)
// Wording: a derived level is "suggested", never "determined". The ratings and the level recommendation are the clinician's.
import * as M from '../model.js';
import { can } from '../permissions.js';
import { fmtDate, daysBetween } from '../dates.js';
import { today as clockToday } from '../clock.js';
import {
  DIMS, dimOf, ratingLabel, ratingsOf, noteOf, levelCheck, levelTag, levelById, levelName, requestLevel, assessmentsOf, latestAssessment,
  priorAssessment, dueState, dueText, change, changeText, CHECK_LABEL, CHECK_TONE, reasonDims, lowestLevel, LEVELS
} from '../asam.js';

export { DIMS, CHECK_LABEL, CHECK_TONE, levelTag, levelName, levelById, requestLevel, ratingLabel, dimOf, changeText, dueText, LEVELS };

const STAFF = ['direct_support', 'supervisor', 'clinician', 'admin'];
export const KIND_LABEL = { initial: 'Initial assessment', reassessment: 'Reassessment', discharge: 'Discharge assessment' };
export const kindLabel = k => KIND_LABEL[k] || (k ? String(k).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Assessment');
const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;

// ---------------------------------------------------------------------------------------------------------------- who sees what
// level   every staff role: the level tag and the reassessment state (a date, not clinical text)
// ratings clinician and site supervisor: the six ratings and the match state against the request
// text    clinician only: the clinician's note per dimension and the plan (clinical text, like every other note)
export function asamAccess(actor) {
  const role = actor && actor.role;
  return { level: STAFF.includes(role), ratings: role === 'clinician' || role === 'supervisor', text: role === 'clinician' && can(actor, 'notes.view') };
}

// ---------------------------------------------------------------------------------------------------------------- which request a client's level comes from
const ORDER = ['info_requested', 'overdue', 'partial_decide', 'denied', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'appeal_sent', 'draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'early_discharge', 'active'];
export function currentRequest(s, clientId) {
  const open = (s.requests || []).filter(r => r.client === clientId && r.stage !== 'closed');
  return open.slice().sort((x, y) => ORDER.indexOf(x.stage) - ORDER.indexOf(y.stage))[0] || null;
}
// the level of a client with or without a request: the request's own level, else the level stored with the (role-projected) assessment row, else the
// clinician's recommendation in the latest assessment
export function clientLevel(s, clientId) {
  const r = currentRequest(s, clientId); const a = latestAssessment(s, clientId);
  if (r && requestLevel(r)) return { level: requestLevel(r), source: 'request', request: r };
  if (a && a.request_level) return { level: String(a.request_level), source: 'request', request: r };
  if (a && a.level_recommended) return { level: String(a.level_recommended), source: 'assessment', request: r };
  return { level: null, source: null, request: r };
}

// ---------------------------------------------------------------------------------------------------------------- incidents since the last assessment
export function incidentSince(s, clientId, a) {
  if (!a) return null;
  const since = String(a.date).slice(0, 10);
  const list = (s.incidents || []).filter(i => i.client === clientId && String(i.date || '').slice(0, 10) > since).sort((x, y) => String(y.date).localeCompare(String(x.date)));
  if (!list.length) return null;
  const i = list[0];
  return { date: String(i.date).slice(0, 10), count: list.length, level: i.level != null ? +i.level : null, what: i.what || '' };
}

// ---------------------------------------------------------------------------------------------------------------- sentences
export function reassessWhy(d, a) {
  if (!d || d.state === 'none' || !a) return 'Not assessed: no ASAM assessment on file';
  const last = `last assessed ${fmtDate(a.date)}`, rl = `${d.limit}-day rule`;
  if (d.state === 'overdue') return `Reassessment ${-d.left} day${-d.left === 1 ? '' : 's'} overdue · ${last} · was due ${fmtDate(d.dueDate)} (${rl})`;
  if (d.state === 'soon') return `Reassessment due ${fmtDate(d.dueDate)}${d.left === 0 ? ' (today)' : ` in ${plural(d.left, 'day')}`} · ${last} (${rl})`;
  return `Reassess by ${fmtDate(d.dueDate)} · ${last} (${rl})`;
}
export const reassessmentLabel = d => (!d || d.state === 'none' ? 'Not assessed' : d.state === 'overdue' ? `Reassessment ${-d.left}d overdue` : `Reassess by ${fmtDate(d.dueDate)}`);

// ---------------------------------------------------------------------------------------------------------------- one reading
// o: { request } use this request's level; { level } use this level
export function clientReading(s, actor, clientId, o = {}) {
  const acc = asamAccess(actor); const a = latestAssessment(s, clientId); const prev = priorAssessment(s, clientId);
  // a role-projected request may not carry asam_level (the supervisor's status view): the assessment row then carries the level the server derived from the request
  const reqLevel = o.request ? (requestLevel(o.request) || (a && a.request_level ? String(a.request_level) : null)) : null;
  const cl = o.level != null ? { level: String(o.level), source: 'request', request: o.request || null } : o.request ? { level: reqLevel, source: reqLevel ? 'request' : null, request: o.request } : clientLevel(s, clientId);
  const level = cl.level || null;
  const rated = !!(a && a.dims);                                  // a role that holds no ratings gets the date and kind only
  const ratings = acc.ratings && rated ? ratingsOf(a) : null;
  const check = acc.ratings && rated && level ? levelCheck(a, level) : acc.ratings && rated ? levelCheck(a, null) : null;
  const due = dueState(s, a, level);
  const ch = acc.ratings && rated && prev && prev.dims ? change(prev, a) : null;
  const inc = incidentSince(s, clientId, a);
  const lowest = acc.ratings && rated && ratings.every(x => x != null) ? lowestLevel(ratings) : null;
  const flags = [];
  if (!a) flags.push({ key: 'none', tone: 'neutral', icon: 'dot', text: 'Not assessed', why: 'Not assessed: no ASAM assessment on file' });
  if (a && (due.state === 'overdue' || due.state === 'soon')) flags.push({ key: due.state, tone: due.state === 'overdue' ? 'danger' : 'warning', icon: due.state === 'overdue' ? 'alert' : 'clock', text: reassessmentLabel(due), why: reassessWhy(due, a), rule: due.rule, date: due.dueDate });
  if (inc) flags.push({ key: 'incident', tone: inc.level != null && inc.level <= 2 ? 'danger' : 'warning', icon: 'alert', text: `Incident ${fmtDate(inc.date)} after the last assessment`, why: `${plural(inc.count, 'incident')} since the last assessment on ${fmtDate(a.date)}: a reassessment is indicated`, date: inc.date });
  if (check && check.state === 'over') flags.push({ key: 'over', tone: 'warning', icon: 'bars', text: 'Level above what the ratings fit', why: check.headline });
  if (check && check.state === 'under') flags.push({ key: 'under', tone: 'info', icon: 'bars', text: 'Ratings higher than the level requested', why: check.headline });
  return {
    client: clientId, level, levelTag: level ? levelTag(level) : '', levelName: level ? levelName(level) : 'Level not recorded', levelSource: cl.source, request: cl.request || null,
    has: !!a, a, prev, date: a ? String(a.date).slice(0, 10) : null, kind: a ? a.kind : null, assessor: a ? a.assessor : null, recommended: a ? a.level_recommended || null : null,
    access: acc, rated, ratings, check, state: check ? check.state : (a ? (acc.ratings ? 'none' : 'hidden') : 'none'), lowest: lowest ? lowest.id : null,
    due, dueText: dueText(due), dueWhy: reassessWhy(due, a), change: ch, changeText: ch ? changeText(ch) : '', incident: inc, flags,
    overdue: due.state === 'overdue', soon: due.state === 'soon', notAssessed: !a, flagged: flags.some(f => f.key !== 'none')
  };
}
export const requestReading = (s, actor, r) => clientReading(s, actor, r.client, { request: r });

// ---------------------------------------------------------------------------------------------------------------- assessment history (the chart)
export function assessmentHistory(s, actor, clientId) {
  const acc = asamAccess(actor); const list = assessmentsOf(s, clientId);
  const staffName = id => { const st = M.byId(s.staff, id); return st ? st.name + (st.credential ? ', ' + st.credential : '') : id || ''; };
  return list.map((a, i) => {
    const prev = list[i + 1] || null; const rated = !!a.dims;
    const ch = acc.ratings && rated && prev && prev.dims ? change(prev, a) : null;
    return {
      id: a.id, date: String(a.date).slice(0, 10), kind: a.kind, kindLabel: kindLabel(a.kind), assessor: a.assessor || '', assessorName: acc.ratings ? staffName(a.assessor) : '',
      rated, ratings: acc.ratings && rated ? ratingsOf(a) : null,
      dims: DIMS.map(d => ({ n: d.n, short: d.short, name: d.name, label: d.label, rating: acc.ratings && rated ? ratingsOf(a)[d.n - 1] : null, note: acc.text ? noteOf(a, d.n) : '' })),
      recommended: a.level_recommended || null, change: ch, changeText: ch ? changeText(ch) : '', prevDate: prev ? String(prev.date).slice(0, 10) : null,
      plan: acc.text ? a.plan || '' : '', hasPlan: !!a.plan, source: a.source || '', provenance: a.provenance || ''
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------- lists
export const LEVEL_FILTERS = [['over', 'Ratings fit a lower level'], ['under', 'Ratings point higher']];
export const REASSESS_FILTERS = [['overdue', 'Overdue'], ['soon', 'Due within 7 days'], ['none', 'Not assessed'], ['incident', 'Incident since the last assessment']];
export const levelFilterOk = v => LEVELS.some(l => l.id === v) || LEVEL_FILTERS.some(x => x[0] === v);
export const reassessFilterOk = v => REASSESS_FILTERS.some(x => x[0] === v);
export const levelOptions = (levels, acc) => [...levels.slice().sort((a, b) => parseFloat(a) - parseFloat(b)).map(id => [id, levelName(id)]), ...(acc && acc.ratings ? LEVEL_FILTERS : [])];
// does a reading pass the two filters? (level: a level id, or over/under; reassess: overdue | soon | none | incident)
export function readingMatches(rd, { level = '', reassess = '' } = {}) {
  if (level) { if (level === 'over' || level === 'under') { if (!rd.check || rd.check.state !== level) return false; } else if (rd.level !== level) return false; }
  if (reassess) {
    if (reassess === 'none' && rd.has) return false;
    if (reassess === 'overdue' && !rd.overdue) return false;
    if (reassess === 'soon' && !rd.soon) return false;
    if (reassess === 'incident' && !rd.incident) return false;
  }
  return true;
}

// the clients a role may read a reading for: every client that has an assessment or a request in the projected state (the role's own caseload for direct support)
export function readingClients(s, actor) {
  const ids = new Set(); const role = actor && actor.role;
  for (const a of s.asam_assessments || []) ids.add(a.client);
  for (const r of s.requests || []) ids.add(r.client);
  for (const c of s.clients || []) ids.add(c.id);
  let list = [...ids].filter(id => M.byId(s.clients, id) || (s.requests || []).some(r => r.client === id));
  if (role === 'direct_support') list = list.filter(id => ((M.byId(s.clients, id) || {}).staff) === actor.id);
  return list;
}

// ---------------------------------------------------------------------------------------------------------------- the bell
const sevOfFlag = f => (f.tone === 'danger' ? 'r' : f.tone === 'warning' ? 'y' : 'n');
// Items for sel/notify.js: reassessment overdue / due soon, request level not supported by the ratings (over) or below them (under), and an incident since the last assessment.
// Ids carry the record and the state that raised them, so a new situation is unread again. A role gets only what its access allows.
export function asamNotifications(s, actor, o = {}) {
  const out = []; if (!s || !actor) return out;
  const acc = asamAccess(actor); if (!acc.level || actor.role === 'direct_support') return out;   // direct support: units and notes only (the bell's role rule); their reassessment state is on the roster
  const today = clockToday(s); const canAuth = !!o.canAuth;
  const seen = new Set();
  const to = (clientId, r) => (r && canAuth ? `Authorization.dc.html?id=${r.id}&section=level` : `Patient?id=${clientId}&section=asam`);
  const clients = readingClients(s, actor).filter(id => actor.role !== 'guardian' && actor.role !== 'school');
  for (const clientId of clients) {
    const a = latestAssessment(s, clientId); if (!a) continue;
    const c = M.byId(s.clients, clientId);
    const lbl = M.clientLabel(s, clientId, false);
    const reqs = (s.requests || []).filter(r => r.client === clientId && r.stage !== 'closed');
    const main = currentRequest(s, clientId); const rd = clientReading(s, actor, clientId, main ? { request: main } : {});
    const link = to(clientId, main);
    const add = n => { if (seen.has(n.id)) return; seen.add(n.id); out.push({ kind: 'asam', group: 'Level of care', ...n }); };
    if (rd.overdue || rd.soon) {
      add({ id: `asam:due:${clientId}:${a.date}:${rd.due.state}`, at: `${rd.due.dueDate}T00:00`, sev: rd.overdue ? 'r' : 'y', record: main ? main.id : clientId, to: link,
        title: `${lbl} · ${rd.overdue ? `ASAM reassessment ${-rd.due.left} day${-rd.due.left === 1 ? '' : 's'} overdue` : `ASAM reassessment due ${fmtDate(rd.due.dueDate)}`}`,
        sub: `Last assessed ${fmtDate(a.date)} · ${rd.due.limit}-day rule (${rd.due.rule && rd.due.rule.verification ? rd.due.rule.verification.toLowerCase() : 'unverified demo assumption'})` });
    }
    if (rd.incident && acc.ratings) {
      add({ id: `asam:incident:${clientId}:${rd.incident.date}`, at: `${rd.incident.date}T00:00`, sev: rd.incident.level != null && rd.incident.level <= 2 ? 'r' : 'y', record: main ? main.id : clientId, to: link,
        title: `${lbl} · incident ${fmtDate(rd.incident.date)} after the last assessment`, sub: `Last assessed ${fmtDate(a.date)} · a reassessment is indicated` });
    }
    if (acc.ratings) for (const r of reqs) {
      const rr = clientReading(s, actor, clientId, { request: r }); if (!rr.check) continue;
      if (rr.check.state === 'over') add({ id: `asam:over:${r.id}:${a.date}`, at: `${a.date}T00:00`, sev: 'y', record: r.id, to: to(clientId, r), title: `${lbl} · Level ${rr.check.requested} is not supported by the ratings`, sub: `Ratings fit Level ${rr.check.lowest} (suggested) as of ${fmtDate(a.date)}: add the reason to the request` });
      else if (rr.check.state === 'under') add({ id: `asam:under:${r.id}:${a.date}`, at: `${a.date}T00:00`, sev: 'n', record: r.id, to: to(clientId, r), title: `${lbl} · ratings point above Level ${rr.check.requested}`, sub: `Lowest level that fits every rating (suggested): Level ${rr.check.lowest}, as of ${fmtDate(a.date)}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- Denial Intelligence: what the payer's stated reason turns on
// A seeded reason row (state.denial_reasons: { reason, count, check, dims[], level }) names its dimensions; a row without them, or a reason the table does not
// know, is read with reasonDims() over the payer's own words (a keyword reading, so a reason that matches nothing returns no dimension: "not compared yet").
const norm = t => String(t || '').toLowerCase().replace(/["'\u2018\u2019\u201C\u201D]/g, '').replace(/\s+/g, ' ').trim();
export function reasonRow(row) {
  const x = reasonDims(row && row.reason);
  const dims = row && Array.isArray(row.dims) ? row.dims.map(Number).filter(n => n >= 1 && n <= 6) : x.dims;
  return { dims, level: row && typeof row.level === 'boolean' ? row.level : x.level, why: dims.map(n => dimOf(n).label), listed: !!(row && Array.isArray(row.dims)) };
}
// the dimensions and the level-of-care flag for a stated reason text: the reason table first, then the keyword reading
export function readReason(s, text) {
  const t = norm(text);
  const known = t ? (s.denial_reasons || []).find(x => norm(x.reason) && t.includes(norm(x.reason))) : null;
  if (known) return { ...reasonRow(known), via: 'table' };
  const x = reasonDims(text);
  return { dims: x.dims, level: x.level, why: x.why, listed: false, via: 'words' };
}
const NOT_RECORDED = /\b(reason|concern)s? (was |were )?not (been )?recorded\b/i;
function readTexts(s, texts) {
  const t = texts.filter(x => x && !NOT_RECORDED.test(x)); const text = t.join(' · ');
  if (!t.length) return { text: '', dims: [], level: false, why: [], none: true };
  const each = t.map(x => readReason(s, x));
  const dims = [...new Set(each.flatMap(x => x.dims))].sort((x, y) => x - y);
  return { text, dims, level: each.some(x => x.level), why: dims.map(n => dimOf(n).label), none: false };
}
// The words come from the dispute's own concerns (the payer's stated reason, quoted) and, when the request carries one, its denial reason.
export function disputeReason(s, d) {
  const r = d && (s.requests || []).find(x => x.id === d.request);
  return readTexts(s, [...((d && d.concerns) || []).map(c => c && c.text), r && r.denial_reason]);
}
// the same for a request on its own (Analytics): its denial reason, the reasons on its decision log and, where the state holds disputes, their concerns
export function requestReason(s, r) {
  const d = (s.disputes || []).find(x => x.request === r.id);
  return readTexts(s, [...((d && d.concerns) || []).map(c => c && c.text), r.denial_reason, ...(r.decision_log || []).filter(x => !x.superseded_by).map(x => x.reason)]);
}
// What the latest assessment says about a request's level: for AGGREGATES only (the Analytics digest counts these with small groups suppressed; no role gets it per client
// through this function). 'hidden' when the state holds no ratings (a role without access).
export function asamCheckOf(s, clientId, r) {
  const a = latestAssessment(s, clientId);
  if (!a) return { state: 'none', has: false };
  if (!a.dims) return { state: 'hidden', has: true };
  const lv = (r && requestLevel(r)) || (a.request_level ? String(a.request_level) : null);
  return { ...levelCheck(a, lv), has: true, level: lv };
}
