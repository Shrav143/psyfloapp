// FLO, the assistant (feedback round Nov 12). PURE ESM: the browser drawer (web/js/ui/flo.js) and the tests import this file.
//
// FLO answers questions from the records the signed-in role can already see. It is rule-based (no model, no network) and READ-ONLY:
// it never flags, sends, signs, calls, approves or changes anything, and it never reads or quotes note text, diagnoses or medications.
// Every answer says where it comes from. Maturity: Simulated (`agents.flo` in shared/maturity.js).
//
//   floAsk(s, actor, text)        -> a result: { kind:'answer'|'limit'|'blocked', intent, title, summary:[bold, rest], list?, table?, bars?, links, source, followUps }
//   floSuggestions(s, actor)      -> starter questions for the role
//   floScope(s, actor)            -> "Your caseload · 6 patients": what this role can ask about
//   floAvailable(actor)           -> true for the four staff roles; guardians and school users have no FLO
//
// `s` is the ROLE-PROJECTED state (api.state): the server already withholds what the role may not see, and every number below is computed from
// the same selectors the screens use (sel/roster.js), so an answer can never disagree with the Dashboard (Patients and Documents views) or Authorizations.
// Result cells are plain data ({ t, to?, tone? } or a string); the drawer turns them into escaped HTML.
import * as M from './model.js';
import { daysBetween, addDays, fmtDate } from './dates.js';
import { today as clockToday } from './clock.js';
import { can, routeAllowed } from './permissions.js';
import { rule, verificationLabel } from './rules.js';
import { rosterRows, documentRows, chartHref } from './sel/roster.js';
import { DI_STAGES, rowOf } from './sel/auth.js';

export const FLO_NAME = 'FLO';
const STAFF = ['direct_support', 'supervisor', 'clinician', 'admin'];
export const floAvailable = actor => !!actor && STAFF.includes(actor.role);

const pl = (n, w, many) => `${n} ${n === 1 ? w : (many || w + 's')}`;
const and = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const SEV_TONE = { r: 'danger', y: 'warning', n: 'neutral', g: 'success' };

// ------------------------------------------------------------------------------------------------------------------------------ vocabulary
// Plain-language meaning of each request stage (the names come from model.js STAGE_LABEL; test/flo.mjs fails if a stage has no meaning here)
export const STAGE_MEANING = {
  draft_ready: 'A packet drafted from the records, waiting for a clinician to review it in Lauris. A person presses Process Form.',
  needs_approval: 'Processed in Lauris. A designated approver records the approval before the packet is signed.',
  awaiting_signature: 'Waiting for Get Signature in Lauris (Forms to Approve).',
  signed: 'Signed and approved. A person presses Send.',
  sending: 'Going out by Sfax (simulated); the reference arrives in a few seconds.',
  portal_open: 'The payer portal upload is open. The page shows the confirmation when the upload finishes.',
  submitted: 'Sent and waiting for the payer. The day count starts from the day it was sent.',
  overdue: 'No decision inside the window. An overdue notice is ready for a person to send.',
  info_requested: 'The payer asked for more information. A clinician replies inside the window the payer stated.',
  partial_decide: 'The payer approved part of the request. A clinician decides: accept it, add information, ask for a peer-to-peer or plan a transition.',
  peer_to_peer_requested: 'A peer-to-peer was asked for. The call date is entered when the payer calls.',
  peer_to_peer_booked: 'The call is booked. Call notes are in Denial Intelligence.',
  p2p_awaiting: 'The call was held. The decision is recorded, with its document, when it arrives.',
  denied: 'The payer denied the request. A guardian-led appeal is prepared; the guardian reads and signs it.',
  appeal_sent: 'The appeal was sent. Waiting for the payer.',
  active: 'Approved. Units are tracked, and a flag shows once about 75% of them are used.',
  early_discharge: 'An early discharge and a new initial request are planned. The dates are set by a clinician.',
  closed: 'Closed. No further action is expected on this request.'
};

// What each Dashboard mark means (read from web/js/screens/Dashboard.js: badges in the Notes and Forms columns, icons in the Alerts column)
const LEGEND = [
  ['Notes and Forms columns (counts)', ''],
  ['Red triangle with a number', 'notes (or forms) behind: past the due time and not filed'],
  ['Red undo arrow', 'a note was sent back or flagged by a reviewer'],
  ['Amber clock', 'due soon, not yet late'],
  ['Blue eye', 'filed, waiting for a review'],
  ['Alerts column (icons)', ''],
  ['Pencil', 'notes behind'],
  ['Undo arrow', 'a note sent back'],
  ['File', 'a form past due'],
  ['Eye', 'notes waiting for review'],
  ['Hourglass', 'units flagged: about 75% used, or none left'],
  ['Calendar', 'an authorization deadline is near or past'],
  ['Inbox', 'an authorization step is waiting for someone'],
  ['Other marks', ''],
  ['A dash in the Authorization column', 'no authorization on file for that patient'],
  ['Warning icon beside a date', 'amber: due soon · red: overdue'],
  ['Chevron on the left of a row', 'opens the patient\'s outstanding items; the chevron on the right opens the chart']
];

// rules FLO can explain: question words -> the rules-table key
const RULE_WORDS = [
  [/75|warn|flag|running low|units? (low|used)/, 'units.warn_used_pct'],
  [/daily note|24 ?h|24 hours|note.*due/, 'notes.daily_due_hours'],
  [/weekly (guardian )?call|weekly guardian/, 'notes.weekly_guardian_due'],
  [/monthly collateral/, 'notes.monthly_collateral_due'],
  [/follow.?up (call|day)|day.?10|call the payer/, 'decision.followup_day'],
  [/overdue after|decision.*overdue|14 days|how long.*payer|payer.*(take|decid)/, 'decision.overdue_after_days'],
  [/info(rmation)? request|reply within|reply.*hours/, 'info_request.hours'],
  [/run.?out|units? (per|a) (school )?day|3 units/, 'units.rate_per_school_day'],
  [/renew|continued stay lead|business days before/, 'continued_stay.lead_business_days'],
  [/unit bands?|day tiers?|minutes? (for|per) (a )?unit/, 'units.tdt.day_tiers'],
  [/appeal window|how long.*appeal/, 'appeal.window_days'],
  [/group size|minimum group|fewer than (5|five)/, 'analytics.min_group_size'],
  [/eligibility re.?check|recheck/, 'eligibility.recheck_days']
];

// ------------------------------------------------------------------------------------------------------------------------------ context
function context(s, actor) {
  const c = { s, actor, today: clockToday(s), _rows: null };
  Object.defineProperty(c, 'rows', { get() { return c._rows || (c._rows = rosterRows(s, actor, {}).rows); } });
  c.open = id => !!actor && routeAllowed(actor.role, id, actor);
  // a link only when the role may open its screen; the screens re-check on arrival
  c.link = (label, to, route) => (!route || c.open(route) ? { label, to } : null);
  return c;
}
const links = (...l) => l.filter(Boolean);
const patientCell = (r, section) => ({ t: r.label, to: chartHref(r.id, section), sub: 'Lauris #' + (r.lauris || '—') });
const date = d => (d ? fmtDate(String(d).slice(0, 10)) : '—');

export function floScope(s, actor) {
  if (!floAvailable(actor)) return '';
  const n = context(s, actor).rows.length;
  if (actor.role === 'direct_support') return `Your caseload · ${pl(n, 'patient')}`;
  if (actor.role === 'supervisor') return `The staff and sites you manage · ${pl(n, 'patient')}`;
  if (actor.role === 'admin') return `All patients · ${n} · status, units and dates only, no note text`;
  return `All patients · ${n}`;
}

export function floSuggestions(s, actor) {
  const base = actor && actor.role === 'direct_support'
    ? ['Which of my notes are behind?', 'What is due this week?', 'Which patients are running low on units?', 'What do the Dashboard icons mean?']
    : actor && actor.role === 'admin'
      ? ['Who is behind on notes?', 'Which authorizations are running low?', 'What are the deadlines this week?', 'Which denials are open?']
      : ['Who is behind on notes?', 'Which notes are waiting for review?', 'Which authorizations are running low?', 'What are the deadlines this week?'];
  if (actor && actor.role === 'clinician') base.push('Which denials are open?');
  base.push('How many patients do I have?', 'What does "Partial — decide" mean?', 'Where does the 75% units flag come from?');
  return base;
}

// ------------------------------------------------------------------------------------------------------------------------------ the answers
const done = (intent, o) => ({ kind: 'answer', intent, links: [], followUps: [], ...o });

function behindNotes(c) {
  const hits = c.rows.map(r => ({ r, items: r.items.filter(i => i.kind === 'note' && i.sev === 'r') })).filter(x => x.items.length);
  const total = hits.reduce((n, x) => n + x.items.length, 0);
  const formsLate = c.rows.reduce((n, r) => n + r.items.filter(i => i.kind === 'form' && i.sev === 'r').length, 0);
  const hrs = rule(c.s, 'notes.daily_due_hours');
  const hours = hrs && !hrs.missing && hrs.value != null ? hrs.value : 24;
  const staffMode = c.actor.role !== 'direct_support';
  const bars = [];
  if (staffMode) {
    const by = new Map();
    for (const x of hits) by.set(x.r.staffShort || 'No staff assigned', (by.get(x.r.staffShort || 'No staff assigned') || 0) + x.items.length);
    for (const [label, value] of [...by.entries()].sort((a, b) => b[1] - a[1])) bars.push({ label, value, total: total, tone: 'danger', unit: 'behind' });
  }
  return done('behind', {
    title: 'Notes behind',
    summary: total ? [`${pl(total, 'note')} ${total === 1 ? 'is' : 'are'} behind`, `across ${pl(hits.length, 'patient')}${formsLate ? `. ${pl(formsLate, 'form')} ${formsLate === 1 ? 'is' : 'are'} also past due` : ''}.`]
      : ['Nothing is behind.', formsLate ? `${pl(formsLate, 'form')} ${formsLate === 1 ? 'is' : 'are'} past due.` : `Every note in scope is filed or not yet due.`],
    table: total ? { cols: staffMode ? ['Patient', 'Staff', 'Behind', 'Oldest due'] : ['Patient', 'Behind', 'Oldest due'],
      rows: hits.sort((a, b) => b.items.length - a.items.length).map(x => { const oldest = x.items.map(i => i.due).filter(Boolean).sort()[0];
        return staffMode ? [patientCell(x.r, 'documentation'), x.r.staffShort || '—', String(x.items.length), date(oldest)] : [patientCell(x.r, 'documentation'), String(x.items.length), date(oldest)]; }) } : null,
    bars: bars.length > 1 ? bars : [],
    links: links(c.link('See them on the Dashboard', '#/Dashboard?attention=behind', 'Dashboard'), c.link('Open Documents, Behind', '#/Dashboard?view=documents&status=behind', 'Documentation')),
    source: `From the notes the extension reported at Process Form, and the clock. A daily note is due ${hours} h after the session (${hrs && !hrs.missing ? verificationLabel(hrs.category) : 'Harvest target'}).`,
    followUps: ['Which notes are waiting for review?', 'What are the deadlines this week?']
  });
}

function reviewWaiting(c) {
  const hits = c.rows.map(r => ({ r, n: r.items.filter(i => i.kind === 'review').length })).filter(x => x.n);
  const total = hits.reduce((n, x) => n + x.n, 0);
  const staffMode = c.actor.role !== 'direct_support';
  const mine = c.actor.role === 'direct_support';
  return done('review', {
    title: 'Notes waiting for review',
    summary: total ? [`${pl(total, 'note')} ${total === 1 ? 'is' : 'are'} waiting for review`, `across ${pl(hits.length, 'patient')}.${mine ? ' A reviewer decides each one.' : ''}`] : ['No notes are waiting for review.', ''],
    table: total ? { cols: staffMode ? ['Patient', 'Staff', 'Waiting'] : ['Patient', 'Waiting'], rows: hits.sort((a, b) => b.n - a.n).map(x => staffMode ? [patientCell(x.r, 'documentation'), x.r.staffShort || '—', String(x.n)] : [patientCell(x.r, 'documentation'), String(x.n)]) } : null,
    links: links(c.link('Open Documents, Needs review', '#/Dashboard?view=documents&status=pending_review', 'Documentation'), c.link('See them on the Dashboard', '#/Dashboard?attention=review', 'Dashboard')),
    source: 'From the review state stored with each note (approved, returned, flagged or pending). FLO does not open or quote any note.',
    followUps: ['Who is behind on notes?']
  });
}

function lowUnits(c) {
  const wr = rule(c.s, 'units.warn_used_pct'); const pct = wr && !wr.missing && wr.value != null ? wr.value : 75;
  const hits = c.rows.filter(r => r.auth && r.auth.units && r.auth.units.warn).sort((a, b) => (a.auth.units.left / a.auth.units.total) - (b.auth.units.left / b.auth.units.total));
  return done('units-low', {
    title: 'Units running low',
    summary: hits.length ? [`${pl(hits.length, 'authorization')} ${hits.length === 1 ? 'has' : 'have'} used ${pct}% of the units or more.`, hits.some(r => r.auth.units.left === 0) ? `No units are left on ${and(hits.filter(r => r.auth.units.left === 0).map(r => r.label))}.` : 'They carry the yellow flag on the Dashboard and Authorizations.']
      : [`No authorization is at ${pct}% used.`, ''],
    table: hits.length ? { cols: ['Patient', 'Units left', 'Used', 'Ends'], rows: hits.map(r => { const u = r.auth.units; return [patientCell(r, 'authorization'), { t: `${u.left} of ${u.total}`, tone: u.left === 0 ? 'danger' : 'warning' }, `${u.pctUsed}%`, date(r.auth.end)]; }) } : null,
    bars: hits.map(r => ({ label: r.label, value: r.auth.units.left, total: r.auth.units.total, tone: r.auth.units.left === 0 ? 'danger' : 'warning', unit: 'units left' })),
    links: links(c.link('Authorizations, units flagged', '#/Authorizations?units=warn', 'Authorizations'), c.link('Dashboard, units flagged', '#/Dashboard?units=warn', 'Dashboard')),
    source: `From the stored authorizations. The ${pct}% line is the units.warn_used_pct rule: ${wr && !wr.missing ? verificationLabel(wr.category) : 'Unverified demo assumption'}; it only changes the flag.`,
    followUps: ['Where does the 75% units flag come from?', 'What are the deadlines this week?']
  });
}

function deadlines(c, text) {
  const days = /next week|two weeks|14 days|fortnight/.test(text) ? 14 : 7; const end = addDays(c.today, days);
  const out = [];
  for (const r of c.rows) {
    for (const i of r.items) { if (!i.due || !['note', 'form'].includes(i.kind)) continue; if (i.due <= end) out.push({ r, what: i.title + (i.sub ? ' · ' + i.sub : ''), d: i.due, over: i.due < c.today }); }
    const a = r.auth;
    if (a && a.date && String(a.date).slice(0, 10) <= end && (a.dateSev === 'soon' || a.dateSev === 'overdue' || String(a.date).slice(0, 10) >= c.today)) out.push({ r, what: 'Authorization · ' + String(a.dateWhy || a.stageLabel || '').slice(0, 72), d: String(a.date).slice(0, 10), over: String(a.date).slice(0, 10) < c.today, auth: true });
  }
  out.sort((x, y) => x.d.localeCompare(y.d) || x.r.label.localeCompare(y.r.label));
  const overdue = out.filter(x => x.over).length;
  const shown = out.slice(0, 12);
  return done('deadlines', {
    title: days === 7 ? 'Deadlines this week' : 'Deadlines in the next two weeks',
    summary: out.length ? [`${pl(out.length, 'item')} ${out.length === 1 ? 'is' : 'are'} due by ${fmtDate(end)}.`, `${overdue ? `${overdue} ${overdue === 1 ? 'is' : 'are'} already past due. ` : ''}${out.length > shown.length ? `The first ${shown.length} are listed.` : ''}`.trim()] : [`Nothing is due in the next ${days} days.`, ''],
    table: shown.length ? { cols: ['Patient', 'What', 'Date', ''], rows: shown.map(x => [patientCell(x.r, x.auth ? 'authorization' : 'documentation'), x.what, date(x.d), { t: x.over ? 'Overdue' : daysBetween(c.today, x.d) === 0 ? 'Today' : 'Coming up', tone: x.over ? 'danger' : 'warning' }]) } : null,
    links: links(c.link('Dashboard, due in 7 days', '#/Dashboard?due=7', 'Dashboard'), c.link('Authorizations, next step due in 7 days', '#/Authorizations?due=7', 'Authorizations')),
    source: 'From stored due dates and the clock. The rule behind each date is named on its screen (Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption).',
    followUps: ['Who is behind on notes?', 'Which authorizations are running low?']
  });
}

function denials(c) {
  if (!can(c.actor, 'denials')) return { kind: 'blocked', intent: 'denials', title: 'Denial cases', links: [], followUps: ['Which authorizations are running low?'], summary: ['Denial cases are not part of this role.', 'Denial Intelligence is for clinicians; administrators see status. Ask an administrator or a clinician.'], source: 'From the permission table (web/js/shared/permissions.js).' };
  const reqs = (c.s.requests || []).filter(r => DI_STAGES.includes(r.stage));
  const rows = reqs.map(r => { let row = null; try { row = rowOf(c.s, r, c.actor); } catch { row = null; }
    return { r, label: (M.byId(c.s.clients, r.client) || {}).initials || String(r.client).split(',')[0], payer: M.payerShort(c.s, r.payer), stage: M.STAGE_LABEL[r.stage] || r.stage, next: row && row.next ? row.next.label : '', dl: row && row.deadline && row.deadline.date ? String(row.deadline.date).slice(0, 10) : '', sev: row && row.deadline ? row.deadline.sev : '' }; });
  return done('denials', {
    title: 'Open denials and decisions',
    summary: rows.length ? [`${pl(rows.length, 'case')} ${rows.length === 1 ? 'is' : 'are'} in Denial Intelligence`, `right now (information requests, partial approvals, peer-to-peer, denials, appeals).`] : ['No case is in a denial stage.', ''],
    table: rows.length ? { cols: ['Patient', 'Payer', 'Stage', 'Next step', 'Date'], rows: rows.map(x => [{ t: x.label, to: `#/DenialCase?id=${encodeURIComponent(x.r.id)}`, sub: x.r.id }, x.payer, x.stage, x.next || '—', { t: date(x.dl), tone: x.sev === 'overdue' ? 'danger' : x.sev === 'soon' ? 'warning' : undefined }]) } : null,
    links: links(c.link('Open Denial Intelligence', '#/DenialIntelligence', 'DenialIntelligence')),
    source: 'From the stored requests and their stage. FLO does not read payer letters or drafts. Dates follow the rule named on each case.',
    followUps: ['What does "Partial — decide" mean?', 'What are the deadlines this week?']
  });
}

function stageMeaning(c, text) {
  const t = text.toLowerCase().replace(/[—–-]/g, ' ').replace(/\s+/g, ' ');
  let best = null;
  for (const [id, label] of Object.entries(M.STAGE_LABEL)) {
    const names = [label.toLowerCase().replace(/[—–·…-]/g, ' ').replace(/\s+/g, ' ').trim(), id.replace(/_/g, ' ')];
    for (const n of names) if (n.length > 3 && t.includes(n) && (!best || n.length > best.len)) best = { id, len: n.length };
    const head = names[0].split(' ').slice(0, 2).join(' ');
    if (!best && head.length > 5 && t.includes(head)) best = { id, len: head.length };
  }
  if (!best) return null;
  const n = (c.s.requests || []).filter(r => r.stage === best.id).length;
  return done('stage', {
    title: M.STAGE_LABEL[best.id], summary: [M.STAGE_LABEL[best.id], STAGE_MEANING[best.id] || ''],
    list: n && can(c.actor, 'authorizations') ? [`${pl(n, 'request')} ${n === 1 ? 'is' : 'are'} at this stage now.`] : [],
    links: links(n ? c.link('Authorizations filtered by this stage', `#/Authorizations?stage=${best.id}`, 'Authorizations') : null),
    source: 'From the stage vocabulary used on the Authorizations screen. Stages follow the request; nothing here changes one.',
    followUps: ['Which denials are open?', 'Which authorizations are running low?']
  });
}

function ruleAnswer(c, text) {
  const t = text.toLowerCase();
  let key = (RULE_WORDS.find(([rx]) => rx.test(t)) || [])[1];
  if (!key) {
    // fall back to a keyword hit on a rule's label
    // whole words only, and two of them (or one when the question says "rule"): "write me a poem" must not find "never rewrite"
    const STOP = new Set(['what', 'where', 'does', 'from', 'come', 'this', 'that', 'with', 'your', 'have', 'many', 'long', 'much', 'about', 'there', 'which', 'when', 'rule', 'source']);
    const words = t.split(/[^a-z0-9%]+/).filter(w => w.length > 3 && !STOP.has(w));
    let best = null;
    for (const r of c.s.rules || []) { const lab = new Set(String(r.label || '').toLowerCase().split(/[^a-z0-9%]+/)); const score = words.filter(w => lab.has(w)).length; if (score && (!best || score > best.score)) best = { key: r.key, score }; }
    key = best && (best.score >= 2 || (best.score >= 1 && /\brule\b/.test(t))) ? best.key : null;
  }
  if (!key) return null;
  const r = rule(c.s, key);
  if (!r || r.missing) return null;
  const val = Array.isArray(r.value) ? r.value.map(x => Array.isArray(x) ? x.join(' min → ') : x).join(' · ') : r.value === true ? 'on' : r.value === false ? 'off' : r.value;
  return done('rule', {
    title: r.label || key, summary: [`${r.label}: ${val}${r.unit ? ' ' + r.unit : ''}`, ''],
    list: [`Source category: ${verificationLabel(r.category)}.`, r.source ? `Where it comes from: ${r.source}` : '', r.verified_on ? `Verified on ${date(r.verified_on)}.` : 'Not verified against an official text.', r.note || ''].filter(Boolean),
    links: links(c.link('Rules in Settings', '#/Settings?tab=rules', 'Settings')),
    source: `From the rules table: ${verificationLabel(r.category)}.`,
    followUps: ['Which authorizations are running low?', 'Who is behind on notes?']
  });
}

function legend() {
  return done('legend', {
    title: 'What the Dashboard marks mean', summary: ['Dashboard marks, in plain words', 'Hover any mark on the page for its own sentence.'],
    legend: LEGEND.map(([a, b]) => ({ k: a, v: b })),
    links: [{ label: 'Open the Dashboard', to: '#/Dashboard' }],
    source: 'From the Dashboard screen itself (the icon set and badge colours are read from its code, not described from memory).',
    followUps: ['Who is behind on notes?', 'Which authorizations are running low?']
  });
}

function patientCount(c) {
  const rows = c.rows; const withAuth = rows.filter(r => r.auth).length;
  const attention = rows.filter(r => r.worst === 'r' || r.worst === 'y').length;
  const who = c.actor.role === 'direct_support' ? 'on your caseload' : c.actor.role === 'supervisor' ? 'in the staff and sites you manage' : 'in the clinic';
  return done('count', {
    title: 'Patients', summary: [`${pl(rows.length, 'patient')} ${who}.`, `${withAuth} ${withAuth === 1 ? 'has' : 'have'} an authorization on file; ${attention} need${attention === 1 ? 's' : ''} attention.`],
    links: links(c.link('Open the Dashboard', '#/Dashboard', 'Dashboard')),
    source: 'From the patients in this role\'s scope (the same list as the Dashboard).', followUps: ['Who is behind on notes?', 'Which authorizations are running low?']
  });
}

function patientAnswer(c, row, text) {
  const wantsUnits = /\bunits?\b|authori|left/.test(text);
  const u = row.auth && row.auth.units;
  if (wantsUnits && !/note|due|outstanding|everything|about/.test(text)) {
    return done('patient-units', {
      title: `Units · ${row.label}`,
      summary: u ? [`${row.label} has ${u.left} of ${u.total} units left`, `(${u.pctUsed}% used${u.warn ? ', flagged' : ''}).${row.auth.end ? ' The authorization ends ' + date(row.auth.end) + '.' : ''}`] : [row.auth ? `${row.label} has an authorization in progress` : `${row.label} has no authorization on file.`, row.auth ? `Stage: ${row.auth.stageLabel}. No units are recorded yet.` : 'Documentation is owed with or without one.'],
      bars: u ? [{ label: row.label, value: u.left, total: u.total, tone: u.left === 0 ? 'danger' : u.warn ? 'warning' : 'accent', unit: 'units left' }] : [],
      links: links(c.link(`${row.label}, Authorization`, chartHref(row.id, 'authorization'), 'Patient')),
      source: 'From the stored authorization (units used are read from Lauris). The flag line is the units.warn_used_pct rule: Unverified demo assumption.', followUps: ['Which authorizations are running low?']
    });
  }
  const items = row.items.slice(0, 8);
  const k = row.counts;
  const parts = [];
  if (k.behind) parts.push(`${pl(k.behind, 'note')} behind`); if (k.fix) parts.push(`${pl(k.fix, 'note')} sent back`); if (k.due) parts.push(`${pl(k.due, 'note')} due soon`); if (k.review) parts.push(`${pl(k.review, 'note')} in review`);
  if (k.forms) parts.push(`${pl(k.forms, 'form')} owed${k.formsLate ? ` (${k.formsLate} past due)` : ''}`);
  return done('patient', {
    title: row.label, summary: [`${row.label} · Lauris #${row.lauris || '—'}`, parts.length ? `${and(parts)}.` : 'Nothing is outstanding.'],
    list: [row.auth ? `Authorization: ${row.auth.stageLabel}${u ? `, ${u.left} of ${u.total} units left` : ''}${row.auth.end ? `, ends ${date(row.auth.end)}` : ''}.` : 'No authorization on file.', row.staffShort ? `Staff: ${row.staffShort}.` : ''].filter(Boolean),
    table: items.length ? { cols: ['Outstanding', 'Due', 'State'], rows: items.map(i => [i.title + (i.sub ? ' · ' + i.sub : ''), i.dueText || date(i.due), { t: i.sev === 'r' ? 'Behind' : i.sev === 'y' ? 'Soon' : 'Open', tone: SEV_TONE[i.sev] }]) } : null,
    links: links(c.link(`Open ${row.label}'s chart`, chartHref(row.id), 'Patient')),
    source: 'From stored notes, forms and the authorization for this patient. FLO does not read note text.', followUps: ['Which authorizations are running low?', 'Who is behind on notes?']
  });
}

function formsDue(c) {
  if (c.actor.role === 'direct_support') return { kind: 'blocked', intent: 'forms', title: 'Intake, CNA and plan status', links: [], followUps: ['Which of my notes are behind?'], summary: ['Intake forms, CNAs and treatment plans are tracked by clinicians, supervisors and administrators.', 'Your own notes are on the Dashboard.'], source: 'From the permission table.' };
  const d = documentRows(c.s, c.actor, { group: 'form', status: 'open' });
  const rows = d.rows.slice(0, 10);
  return done('forms', {
    title: 'Forms owed', summary: d.rows.length ? [`${pl(d.rows.length, 'form')} ${d.rows.length === 1 ? 'is' : 'are'} owed`, `(intake, CNA, treatment plan, quarterly report, discharge summary).`] : ['No form is owed.', ''],
    table: rows.length ? { cols: ['Patient', 'Form', 'Due', 'State'], rows: rows.map(x => [{ t: x.label, to: x.to, sub: 'Lauris #' + (x.laurisNo || '—') }, x.typeLabel, date(x.due), { t: x.statusLabel, tone: SEV_TONE[x.sev] }]) } : null,
    links: links(c.link('Open Documents, Forms', '#/Dashboard?view=documents&group=form&status=open', 'Documentation')),
    source: 'From the intake, CNA and plan tracker. It is sample data until the tracker reads Lauris (labelled so in the Documents view).', followUps: ['Who is behind on notes?']
  });
}

const help = (c) => done('help', {
  title: 'What FLO can answer', summary: ['I answer from the records you can see.', 'Notes behind or in review, units and the 75% flag, deadlines, open denials, what a stage means, where a rule comes from, what the Dashboard marks mean, and facts about one patient.'],
  list: ['I never open or quote note text, diagnoses or medications.', 'I never change anything: I cannot flag, send, sign, call or approve.'],
  source: 'FLO is rule-based and Simulated: it matches your question to the questions it knows. No model is called.', followUps: floSuggestions(c.s, c.actor).slice(0, 4)
});

function limit(c, text) {
  return { kind: 'limit', intent: 'limit', title: 'Not something I can answer', links: [], bars: [], summary: ['I can\'t answer that from the records this role can see.', 'I only know status, due dates, units, counts and the rules table.'],
    list: ['Try one of these:'], followUps: floSuggestions(c.s, c.actor).slice(0, 5), source: 'FLO is rule-based: it answers the questions it recognises and says so when it does not.' };
}
const clinical = (c) => ({ kind: 'blocked', intent: 'clinical', title: 'Clinical text', links: [], followUps: ['What is due this week?', 'Who is behind on notes?'],
  summary: ['FLO does not read or quote note text, diagnoses or medications.', c.actor.role === 'admin' ? 'Your role sees status, units and dates only. Clinical text is hidden by design.' : 'Open the chart or Lauris for the record itself; FLO can tell you what is owed and when.'], source: 'From the permission table: FLO answers about status only.' });

// ------------------------------------------------------------------------------------------------------------------------------ the router
const RX = {
  legend: /\b(icons?|legend|symbols?|badges?|marks?)\b|what does (the )?(pencil|hourglass|calendar|eye|undo|arrow|chevron|dash|triangle|warning)/,
  clinical: /\b(note (text|content|says?)|(what|which|read|show|tell|quote)\b.{0,40}\b(say|says|said|wrote|written|writes)\b|what('s| is| was)? in .{0,30}\bnotes?\b|(read|open|show|quote|summari[sz]e) .{0,30}\bnotes?\b|narrative|dictation|transcript|diagnos\w*|medicat\w*|\bmeds?\b|prescri\w*|clinical (text|record|summary)|therapy content|symptoms?)\b/,
  help: /\b(help|what can you|what do you do|who are you|how do(es)? (this|flo) work)\b|^\s*(hi|hello|hey)\b/,
  count: /\bhow many (patients|students|kids|children|consumers|people|clients)\b|\bnumber of (patients|students|clients)\b|\bcaseload size\b/,
  behind: /\b(behind|late|overdue|past due|missing|outstanding|unfiled)\b.*\bnotes?\b|\bnotes?\b.*\b(behind|late|overdue|past due|missing|outstanding|unfiled)\b|\bwho('s| is| are)? behind\b|\bnot filed\b/,
  review: /\b(waiting|awaiting|needs?|pending|ready|to)\b.{0,16}\b(review|approv\w*)|\breview queue\b|\bnotes? .{0,12}review\b/,
  low: /\brunning (low|out)\b|\blow (on )?units\b|\bunits? (are )?(low|flag\w*|warn\w*|running)\b|\bflagged\b|\b75 ?%|\b(almost|nearly) (used|out|exhausted)|\brun out\b|\bout of units\b|\bexhausted\b/,
  deadlines: /\bdeadlines?\b|\bdue (this|next|in|soon)\b|\bthis week\b|\bnext week\b|\bcoming up\b|\bupcoming\b|\bwhat('s| is) due\b/,
  denials: /\bdenials?\b|\bdenied\b|\bpartial\b|\bappeals?\b|\bpeer.to.peer\b|\bp2p\b|\binfo(rmation)? requests?\b/,
  forms: /\b(intake|cnas?|treatment plans?|\bisp\b|quarterly|discharge summar\w*|forms?)\b/,
  stage: /\b(what (does|is|do)|mean|meaning|explain|define)\b/,
  units: /\bunits?\b/
};

function findPatient(c, t) {
  const lower = ' ' + t.toLowerCase().replace(/[’']/g, '') + ' ';
  for (const r of c.rows) {
    const l = String(r.label || '').toLowerCase(); const bare = l.replace(/\./g, '');
    if (!bare || bare.length < 2) continue;
    if (lower.includes(' ' + l) || new RegExp(`(^|[^a-z])${bare.split('').join('\\.?')}(?![a-z])`).test(lower) || (r.lauris && lower.includes(String(r.lauris)))) return r;
  }
  return null;
}

export function floAsk(s, actor, text) {
  const t = String(text || '').trim();
  if (!floAvailable(actor)) return { kind: 'blocked', intent: 'role', title: FLO_NAME, links: [], followUps: [], summary: [`${FLO_NAME} is for Harvest staff.`, ''], source: '' };
  if (!s || !t) return help(context(s || {}, actor));
  const c = context(s, actor); const lc = t.toLowerCase();
  const ptn = findPatient(c, t);
  try {
    if (RX.legend.test(lc)) return legend();
    if (RX.clinical.test(lc)) return clinical(c);
    if (RX.help.test(lc)) return help(c);
    if (RX.count.test(lc)) return patientCount(c);
    if (ptn) return patientAnswer(c, ptn, lc);
    if (RX.stage.test(lc)) { const a = stageMeaning(c, lc); if (a) return a; }
    if (/\b(where|why|source|rule|how (long|many)|what is the)\b/.test(lc) || RX.stage.test(lc)) { const a = ruleAnswer(c, lc); if (a) return a; }
    if (RX.behind.test(lc)) return behindNotes(c);
    if (RX.review.test(lc)) return reviewWaiting(c);
    if (RX.low.test(lc) || (RX.units.test(lc) && /\b(which|who|list|show)\b/.test(lc))) return lowUnits(c);
    if (RX.denials.test(lc)) return denials(c);
    if (RX.deadlines.test(lc)) return deadlines(c, lc);
    if (RX.forms.test(lc)) return formsDue(c);
    const a = stageMeaning(c, lc) || ruleAnswer(c, lc); if (a) return a;
  } catch (e) { return { ...limit(c, t), summary: ['I hit a problem reading the records for that.', 'Nothing was changed. Try another question.'] }; }
  return limit(c, t);
}
