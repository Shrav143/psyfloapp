// Patient-first selectors (feedback round Nov 11). PURE ESM: the browser, the server and the tests import this file.
//
// The question every role asks is "which patients am I responsible for, and what is outstanding on each one?". Notes, intake forms,
// CNAs and treatment plans are owed whether or not a payer authorization exists; the authorization is one more thing on the chart.
//
//   clientsInScope(s, actor)             -> the clients this person is responsible for (never a default user: no actor, no clients)
//   outstandingByClient(s, actor)        -> Map<clientId, Item[]>   what is owed now, from notes, forms and the authorization worklist
//   rosterRows(s, actor, filters)        -> { rows, total, shown, counts, options, filters }    the Dashboard table
//   documentRows(s, actor, filters)      -> { rows, total, shown, counts, options, filters }    the Documentation table (notes + forms)
//   patientChart(s, actor, clientId)     -> { header, docs, auth, items, can } | null            the Patient chart
//   authSummary(s, actor, clientId)      -> { requestId, stage, units:{total,used,left,pctUsed,warn}, end, endSev, ... } | null
//   normalizeRoster(params) / normalizeDocs(params)   -> canonical filters from a query string
//
// ITEM = { id, client, kind:'note'|'review'|'form'|'auth'|'fix', type, title, due, dueText, sev:'r'|'y'|'n', verb, to, ops, rank }
//   sev r = past due or blocked, y = due soon or waiting on a review, n = on the way. `to` is an old-style target the screen runs through hrefFor.
// DOC  = { id, client, label, lauris, group:'note'|'form', type, typeLabel, date, due, dueText, status, statusLabel, sev, staff, staffShort, owner, reviewer, site, noteId?, to }
//   status: behind | due | in_progress | pending_review | returned | late | done   (late = filed after it was due; done = filed on time)
// Display strings come back as data; screens turn them into UI-kit fragments. Every date comes from the clock service; every number that is
// a rule comes from the rules table (units.warn_used_pct, notes.daily_due_hours, ...).
import * as M from '../model.js';
import { addDays, daysBetween, fmtDate, fmtTime } from '../dates.js';
import { today as clockToday } from '../clock.js';
import { rule, ruleValue } from '../rules.js';
import { can } from '../permissions.js';
import { noteTimeliness, worklist, managedStaff, pendingFor } from './mywork.js';
import { rowOf } from './auth.js';

const rank = r => ({ direct_support: 1, supervisor: 2, clinician: 3, admin: 4 }[r] || 0);
const SEV_N = { r: 0, y: 1, n: 2, g: 3, '': 4 };
const worse = (a, b) => (SEV_N[a] <= SEV_N[b] ? a : b);
const tone = t => ({ danger: 'r', warning: 'y' }[t] || 'n');
const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;
const siteShort = (s, id) => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' ');
const DOC_LABEL = { daily: 'Daily note', weekly_guardian: 'Weekly guardian call', monthly_collateral: 'Monthly collateral', intake: 'Intake form', cna: 'CNA', isp: 'Treatment plan', quarterly: 'Quarterly report', discharge: 'Discharge summary', assessment: 'Assessment' };
export const DOC_TYPES = Object.keys(DOC_LABEL).filter(k => k !== 'assessment');
export const NOTE_TYPES = ['daily', 'weekly_guardian', 'monthly_collateral'];
export const docLabel = t => DOC_LABEL[t] || t;
const WRITE = { daily: 'ExtDPN.dc.html?client=', weekly_guardian: 'ExtWeekly.dc.html?client=', monthly_collateral: 'ExtMonthly.dc.html?client=' };
const FORM_HREF = { intake: 'ExtCNA.dc.html?client=', cna: 'ExtCNA.dc.html?client=', isp: 'ExtISP.dc.html?client=', quarterly: 'ExtQuarterly.dc.html?client=', discharge: 'ExtDischarge.dc.html?client=' };
export const chartHref = (id, section) => `#/Patient?id=${encodeURIComponent(id)}${section ? '&section=' + section : ''}`;

// ---------------------------------------------------------------------------------------------------------------- scope
// Direct support: their own caseload. Supervisor: the caseloads of the staff they manage plus unassigned clients at their sites.
// Clinician and administrator: every client (the demo organisation is one clinic); the Clinician filter narrows it.
export function clientsInScope(s, actor) {
  if (!s || !actor || !actor.role || !['direct_support', 'supervisor', 'clinician', 'admin'].includes(actor.role)) return [];   // a portal actor (guardian, school) has no roster
  const all = (s.clients || []).filter(c => c && c.stage !== 'discharged' && !(c.service_line && c.service_line !== 'tdt'));
  if (actor.role === 'direct_support') return all.filter(c => c.staff === actor.id);
  if (actor.role === 'supervisor') {
    const staff = new Set(managedStaff(s, actor).map(x => x.id));
    const sites = actor.sites === 'all' ? null : [].concat(actor.sites || []);
    return all.filter(c => (c.staff && staff.has(c.staff)) || (!c.staff && (!sites || sites.includes(c.school))));
  }
  return all;
}
const inScopeSet = (s, actor) => new Set(clientsInScope(s, actor).map(c => c.id));

// ---------------------------------------------------------------------------------------------------------------- notes
const dueText = (d, t) => !d ? '' : d.slice(0, 10) === t ? 'Today' : d.slice(0, 10) === addDays(t, 1) ? 'Tomorrow' : fmtDate(d.slice(0, 10));
const sevOfDue = (d, t) => !d ? 'n' : d.slice(0, 10) < t ? 'r' : daysBetween(t, d.slice(0, 10)) <= 2 ? 'y' : 'n';

// every note-type item the timeliness engine knows for the staff in scope: missing and past due (behind), missing and not yet due (due)
function noteMisses(s, actor, scope) {
  const t = clockToday(s); const out = [];
  const staffIds = [...new Set(clientsInScope(s, actor).map(c => c.staff).filter(Boolean))];
  for (const sid of staffIds) {
    const tl = noteTimeliness(s, sid);
    const mk = (x, behind) => ({ client: x.c.id, staff: sid, type: x.type, date: x.date, dueAt: x.dueAt, behind, hours: x.hours });
    for (const b of tl.behind) if (scope.has(b.c.id)) out.push(mk(b, true));
    for (const d of tl.due) if (scope.has(d.c.id)) out.push(mk(d, false));
  }
  return out;
}
const periodLabel = (type, date) => type === 'weekly_guardian' ? 'Week of ' + fmtDate(date) : type === 'monthly_collateral' ? fmtDate(date).split(' ')[0] : fmtDate(date, { dow: true });

// ---------------------------------------------------------------------------------------------------------------- authorization summary
export function authSummary(s, actor, clientId) {
  if (!s || !actor) return null;
  const reqs = (s.requests || []).filter(r => r.client === clientId && r.stage !== 'closed');
  const c = M.byId(s.clients, clientId);
  const a = c && c.authorization && c.authorization.units ? c.authorization : null;
  if (!reqs.length && !a) return null;
  const order = ['info_requested', 'overdue', 'partial_decide', 'denied', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'appeal_sent', 'draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'early_discharge', 'active'];
  const req = reqs.slice().sort((x, y) => order.indexOf(x.stage) - order.indexOf(y.stage))[0] || null;
  const row = req ? rowOf(s, req, actor) : null;
  const warnPct = ruleValue(s, 'units.warn_used_pct', 75);
  const total = a ? a.units : row && row.units.total != null ? row.units.total : null;
  const used = a ? (a.used || 0) : row && row.units.used != null ? row.units.used : null;
  const left = total != null && used != null ? Math.max(0, total - used) : null;
  const pctUsed = total ? Math.round((used / total) * 100) : null;
  const t = clockToday(s);
  const end = (a && a.end) || (row && (row.units.end || row.period.end)) || null;
  const dl = row ? row.deadline : null;
  // the one date shown for "when": the deadline date the case is working to, else the authorization end
  const date = (dl && dl.date && String(dl.date).slice(0, 10)) || end;
  const sev = dl && dl.sev && dl.sev !== 'none' ? dl.sev : date ? (date < t ? 'overdue' : daysBetween(t, date) <= 14 ? 'soon' : 'ok') : 'none';
  return {
    requestId: req ? req.id : null, stage: req ? req.stage : (a ? 'active' : null), stageLabel: req ? (M.STAGE_LABEL[req.stage] || req.stage) : 'Active',
    typeLabel: req ? (M.TYPE_LABEL[req.type] || req.type) : '', payer: req ? M.payerShort(s, req.payer) : (a ? M.payerShort(s, a.payer) : ''), payerId: req ? req.payer : (a && a.payer) || '',
    service: row ? row.service : 'TDT', owner: row ? row.owner : null,
    units: total == null ? null : { total, used, left, pctUsed, warn: pctUsed != null && pctUsed >= warnPct, warnPct, rule: rule(s, 'units.warn_used_pct'), requested: req ? req.units_requested ?? null : null },
    start: (a && a.start) || (row && row.period.start) || null, end,
    date, dateText: date ? fmtDate(date) : '', dateSev: sev, dateWhy: dl && dl.text && dl.kind !== 'none' ? [dl.text, dl.sub].filter(Boolean).join(' · ') : (end ? 'Authorization ends ' + fmtDate(end) : ''), dateRule: dl ? dl.rule : null,
    next: row ? { label: row.next.label, allowed: row.next.allowed, why: row.next.why, di: row.next.di } : null, row, group: row ? row.group : 'active'
  };
}

// ---------------------------------------------------------------------------------------------------------------- outstanding items
export function outstandingByClient(s, actor) {
  const map = new Map(); const scope = inScopeSet(s, actor);
  if (!s || !actor || !actor.role) return map;
  const t = clockToday(s); let seq = 0;
  const add = it => { if (!scope.has(it.client)) return; const x = { ops: true, rank: 50, sev: 'n', ...it, id: it.id || `${it.kind}:${it.client}:${++seq}` }; (map.get(x.client) || map.set(x.client, []).get(x.client)).push(x); };
  const isDS = actor.role === 'direct_support';
  const writes = can(actor, 'notes.own') && isDS;   // only the staffer writes the note; a reviewer opens the chart

  // notes: missing and past due, missing and not yet due
  for (const m of noteMisses(s, actor, scope)) {
    const lbl = DOC_LABEL[m.type];
    add({ client: m.client, kind: 'note', type: m.type, title: lbl, sub: periodLabel(m.type, m.date), due: m.dueAt.slice(0, 10), dueText: dueText(m.dueAt, t), sev: m.behind ? 'r' : sevOfDue(m.dueAt, t), status: m.behind ? 'behind' : 'due', rank: m.behind ? 10 : 40, verb: writes ? 'Write note' : 'Open', to: writes ? WRITE[m.type] + m.client : chartHref(m.client, 'documentation'), who: M.staffShort(s, m.staff) });
  }
  // notes waiting for a review and notes sent back
  const mayReview = can(actor, 'notes.review'); const pendingIds = new Set(pendingFor(s, actor).map(n => n.id));
  for (const n of s.notes || []) {
    if (!scope.has(n.client)) continue;
    if (n.review === 'pending' && (pendingIds.has(n.id) || (isDS && n.staff === actor.id) || actor.role === 'admin')) {
      add({ client: n.client, kind: 'review', type: n.type, title: DOC_LABEL[n.type] || 'Note', sub: periodLabel(n.type, n.date), due: (n.date || '').slice(0, 10), dueText: n.date ? fmtDate(n.date) : '', sev: 'y', status: 'pending_review', rank: 20, verb: mayReview ? 'Review' : 'Open', to: mayReview ? 'MyWork.dc.html?section=review&id=' + n.id : chartHref(n.client, 'documentation'), noteId: n.id, who: M.staffShort(s, n.staff) });
    } else if (['returned', 'flagged'].includes(n.review) && (isDS ? n.staff === actor.id : true)) {
      add({ client: n.client, kind: 'fix', type: n.type, title: (n.review === 'flagged' ? 'Flagged · ' : 'Returned · ') + (DOC_LABEL[n.type] || 'note'), sub: periodLabel(n.type, n.date), due: '', dueText: '', sev: 'r', status: 'returned', rank: 12, verb: isDS ? 'Fix note' : 'Open', to: isDS ? (WRITE[n.type] || WRITE.daily) + n.client : chartHref(n.client, 'documentation'), noteId: n.id, who: M.staffShort(s, n.staff) });
    }
  }
  // rejected in Lauris (the reviewer's own words stay in Lauris; Psyflo shows that it happened)
  const sd = (s.staff_dashboard || {}).staff || {};
  for (const [sid, conf] of Object.entries(sd)) for (const r of conf.rejected || []) {
    if (isDS && sid !== actor.id) continue;
    add({ client: r.client, kind: 'fix', type: 'rejected', title: 'Rejected in Lauris', sub: `${r.form} · ${fmtDate(r.date)}`, due: '', dueText: '', sev: 'r', status: 'returned', rank: 11, verb: isDS ? 'Fix it' : 'Open', to: isDS ? r.href : chartHref(r.client, 'documentation'), who: M.staffShort(s, sid) });
  }
  // assessments the staffer asks (SUDS, DSM cross-cutting)
  for (const a of s.assessments_due || []) {
    if (isDS && a.staff !== actor.id) continue;
    add({ client: a.client, kind: 'form', type: 'assessment', title: a.instrument, sub: '', due: a.due, dueText: dueText(a.due, t), sev: sevOfDue(a.due, t), status: a.due < t ? 'behind' : 'due', rank: 45, verb: isDS ? 'Ask' : 'Open', to: isDS ? 'MobileAssess.dc.html?client=' + a.client : chartHref(a.client, 'documentation'), who: M.staffShort(s, a.staff) });
  }
  // intake forms, CNAs, treatment plans, quarterly reports, discharge summaries that are not done
  if (!isDS) for (const d of s.documents || []) {
    if (d.status === 'done') continue;
    const behind = d.due < t; const sev = behind ? 'r' : d.status === 'needs_review' ? 'y' : sevOfDue(d.due, t);
    add({ client: d.client, kind: 'form', type: d.kind, title: DOC_LABEL[d.kind], sub: d.status === 'in_progress' ? 'Draft open in Lauris' : d.status === 'needs_review' ? 'Processed, waiting for a review' : 'Not started', due: d.due, dueText: dueText(d.due, t), sev, status: d.status === 'needs_review' ? 'pending_review' : behind ? 'behind' : d.status, rank: behind ? 15 : 35, verb: 'Open', to: chartHref(d.client, 'documentation'), who: d.owner ? M.staffShort(s, d.owner) : '' });
  }
  // the authorization worklist, by client: what this person can act on now or this week (what waits on other people stays on the chart)
  if (!isDS) {
    const w = worklist(s, actor);
    // a referral step (screening call, eligibility check or re-check) belongs to the patient once the referral has one
    const refClient = id => { const r = M.byId(s.referrals, id); return r && r.client && M.byId(s.clients, r.client) ? r.client : null; };
    const AUTH = ['info', 'overdue', 'partial', 'draft', 'approve', 'sign', 'send', 'sending', 'followup', 'p2p', 'units', 'units-out', 'lauris-units'], REFERRAL = ['screening', 'eligibility', 'recheck'];
    for (const it of w.items) {
      const client = it.client || (REFERRAL.includes(it.kind) ? refClient(it.record) : null);
      if (!client || it.group === 'waiting' || !(AUTH.includes(it.kind) || REFERRAL.includes(it.kind))) continue;
      const lbl = M.clientLabel(s, client);
      add({ client, kind: REFERRAL.includes(it.kind) ? 'referral' : 'auth', type: it.kind, title: String(it.title).replace(new RegExp(` · ${lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), ''), sub: it.sub || '', due: '', dueText: it.when || '', sev: it.urgent ? 'r' : tone(it.chip && it.chip.tone), status: 'action', rank: it.rank || 50, verb: it.verb || 'Open', to: it.to || '', record: it.record, ops: it.ops !== false, rule: it.rule });
    }
  }
  for (const list of map.values()) list.sort((a, b) => (SEV_N[a.sev] - SEV_N[b.sev]) || (a.rank - b.rank) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
  return map;
}

// ---------------------------------------------------------------------------------------------------------------- roster
export function normalizeRoster(p = {}) {
  const g = k => (p[k] == null ? '' : String(p[k]));
  const attention = ['attention', 'behind', 'review', 'due', 'auth', 'clear'].includes(g('attention')) ? g('attention') : '';
  const item = ['note', 'form', 'auth', 'review'].includes(g('item')) ? g('item') : '';
  const due = ['overdue', 'today', '7', '30'].includes(g('due')) ? g('due') : '';
  const units = ['25', '50', 'warn'].includes(g('units')) ? g('units') : '';
  return { q: g('q'), attention, item, due, units, site: g('site'), staff: g('staff'), clinician: g('clinician'), payer: g('payer'), stage: g('stage'), sort: g('sort'), dir: g('dir') === 'desc' ? 'desc' : 'asc', open: g('open') };
}

function buildRow(s, actor, c, items) {
  const t = clockToday(s); const au = authSummary(s, actor, c.id);
  const count = f => items.filter(f).length;
  const behind = count(i => i.kind === 'note' && i.sev === 'r'), notesDue = count(i => i.kind === 'note' && i.sev !== 'r');
  const review = count(i => i.kind === 'review'), fix = count(i => i.kind === 'fix');
  const formsLate = count(i => i.kind === 'form' && i.sev === 'r'), forms = count(i => i.kind === 'form');
  const authActions = count(i => i.kind === 'auth'), referralSteps = count(i => i.kind === 'referral');
  const alerts = [];
  if (behind) alerts.push({ key: 'note-behind', sev: 'r', icon: 'alert', text: `${plural(behind, 'note')} behind`, to: chartHref(c.id, 'documentation') });
  if (fix) alerts.push({ key: 'note-fix', sev: 'r', icon: 'alert', text: `${plural(fix, 'note')} sent back`, to: chartHref(c.id, 'documentation') });
  if (formsLate) alerts.push({ key: 'form-late', sev: 'r', icon: 'alert', text: `${plural(formsLate, 'form')} past due`, to: chartHref(c.id, 'documentation') });
  if (review) alerts.push({ key: 'review', sev: 'y', icon: 'clock', text: `${plural(review, 'note')} waiting for review`, to: chartHref(c.id, 'documentation') });
  if (au && au.units && au.units.warn) alerts.push({ key: 'units', sev: au.units.left === 0 ? 'r' : 'y', icon: 'alert', text: au.units.left === 0 ? 'No units left' : `${au.units.pctUsed}% of units used (${au.units.left} left)`, to: chartHref(c.id, 'authorization') });
  if (au && au.date && (au.dateSev === 'soon' || au.dateSev === 'overdue')) alerts.push({ key: 'deadline', sev: au.dateSev === 'overdue' ? 'r' : 'y', icon: 'clock', text: `${au.dateWhy || 'Deadline'}`, to: chartHref(c.id, 'authorization') });
  if (authActions && !alerts.some(a => a.key === 'deadline')) alerts.push({ key: 'auth-action', sev: items.some(i => i.kind === 'auth' && i.sev === 'r') ? 'r' : 'y', icon: 'inbox', text: `${plural(authActions, 'authorization action')}`, to: chartHref(c.id, 'authorization') });
  if (referralSteps) alerts.push({ key: 'referral', sev: items.some(i => i.kind === 'referral' && i.sev === 'r') ? 'r' : 'y', icon: 'inbox', text: `${plural(referralSteps, 'referral step')}`, to: chartHref(c.id, 'documentation') });
  const worst = alerts.reduce((a, x) => worse(a, x.sev), items.reduce((a, x) => worse(a, x.sev), ''));
  const staffId = c.staff || '';
  return {
    id: c.id, label: M.clientLabel(s, c.id, false), age: c.age || null, lauris: c.harvest_no || c.lauris_no || '', school: siteShort(s, c.school), siteId: c.school, locality: M.school(s, c.school).locality || '',
    stage: c.stage, staffId, staffShort: staffId ? M.staffShort(s, staffId) : '', clinicianId: c.clinician || '', clinicianShort: c.clinician ? M.staffShort(s, c.clinician) : '',
    payer: au ? au.payer : '', payerId: au ? au.payerId : '',
    counts: { behind, due: notesDue, review, fix, forms, formsLate, auth: authActions, referral: referralSteps, total: items.length }, alerts, worst, auth: au, items, href: chartHref(c.id)
  };
}

const matchRow = (s, row, f) => {
  const t = clockToday(s);
  if (f.q) { const q = f.q.toLowerCase(); if (![row.label, String(row.lauris), row.school, row.staffShort, row.clinicianShort, row.payer].join(' ').toLowerCase().includes(q)) return false; }
  if (f.site && row.siteId !== f.site && row.locality !== f.site) return false;
  if (f.staff && row.staffId !== f.staff) return false;
  if (f.clinician && row.clinicianId !== f.clinician) return false;
  if (f.payer && row.payerId !== f.payer) return false;
  if (f.stage && !(row.auth && row.auth.stage === f.stage)) return false;
  if (f.attention === 'attention' && !(row.worst === 'r' || row.worst === 'y')) return false;
  if (f.attention === 'behind' && !(row.counts.behind || row.counts.fix || row.counts.formsLate)) return false;
  if (f.attention === 'review' && !row.counts.review) return false;
  if (f.attention === 'due' && !row.items.some(i => i.sev !== 'r' && i.due && daysBetween(t, i.due) <= 7)) return false;
  if (f.attention === 'auth' && !(row.counts.auth || row.alerts.some(a => a.key === 'units' || a.key === 'deadline'))) return false;
  if (f.attention === 'clear' && row.items.length) return false;
  if (f.units && !(row.auth && row.auth.units)) return false;
  if (f.units === 'warn' && !row.auth.units.warn) return false;
  if (f.units === '25' && !(row.auth.units.total && row.auth.units.left / row.auth.units.total <= 0.25)) return false;
  if (f.units === '50' && !(row.auth.units.total && row.auth.units.left / row.auth.units.total <= 0.5)) return false;
  if (f.due) {
    const hit = row.items.some(i => i.due && (f.due === 'overdue' ? i.due < t : f.due === 'today' ? i.due === t : i.due >= t && daysBetween(t, i.due) <= +f.due));
    if (!hit) return false;
  }
  return true;
};
const ROW_SORT = {
  patient: r => r.label,
  attention: r => SEV_N[r.worst] * 1000 - Math.min(99, r.counts.total) * 10,
  staff: r => r.staffShort || 'zzz', due: r => (r.items.map(i => i.due).filter(Boolean).sort()[0] || '9999'),
  units: r => (r.auth && r.auth.units && r.auth.units.total ? r.auth.units.left / r.auth.units.total : 9), deadline: r => (r.auth && r.auth.date) || '9999'
};
export function rosterRows(s, actor, filters = {}) {
  const f = { ...normalizeRoster({}), ...filters };
  const scope = clientsInScope(s, actor); const by = outstandingByClient(s, actor);
  const all = scope.map(c => buildRow(s, actor, c, by.get(c.id) || []));
  const rows = all.filter(r => matchRow(s, r, f));
  const key = ROW_SORT[f.sort] ? f.sort : 'attention'; const g = ROW_SORT[key]; const d = f.sort && f.dir === 'desc' ? -1 : 1;
  rows.sort((a, b) => { const x = g(a), y = g(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return (c || a.label.localeCompare(b.label)) * d; });
  const ofAll = fn => all.filter(fn).length;
  const uniq = (list, k, label) => [...new Map(list.filter(x => k(x)).map(x => [k(x), label(x)])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  return {
    rows, total: all.length, shown: rows.length, filters: f, sort: { key, dir: f.sort ? f.dir : 'asc' },
    counts: { all: all.length, attention: ofAll(r => r.worst === 'r' || r.worst === 'y'), behind: ofAll(r => r.counts.behind || r.counts.fix || r.counts.formsLate), review: ofAll(r => r.counts.review), auth: ofAll(r => r.counts.auth || r.alerts.some(a => a.key === 'units' || a.key === 'deadline')), clear: ofAll(r => !r.items.length) },
    options: {
      sites: uniq(all, r => r.siteId, r => r.school), staff: uniq(all, r => r.staffId, r => r.staffShort), clinicians: uniq(all, r => r.clinicianId, r => r.clinicianShort),
      payers: uniq(all, r => r.payerId, r => r.payer), stages: uniq(all, r => r.auth && r.auth.stage, r => r.auth && r.auth.stageLabel)
    },
    totals: { items: all.reduce((n, r) => n + r.counts.total, 0), behind: all.reduce((n, r) => n + r.counts.behind + r.counts.fix + r.counts.formsLate, 0), review: all.reduce((n, r) => n + r.counts.review, 0) }
  };
}

// ---------------------------------------------------------------------------------------------------------------- documentation
export function normalizeDocs(p = {}) {
  const g = k => (p[k] == null ? '' : String(p[k]));
  const group = ['note', 'form'].includes(g('group')) ? g('group') : '';
  const status = ['open', 'behind', 'due', 'pending_review', 'returned', 'in_progress', 'late', 'done'].includes(g('status')) ? g('status') : '';
  const iso = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  return { q: g('q'), group, type: DOC_TYPES.includes(g('type')) ? g('type') : '', status, staff: g('staff'), client: g('client'), site: g('site'), from: iso(g('from')), to: iso(g('to')), sort: g('sort'), dir: g('dir') === 'desc' ? 'desc' : 'asc', id: g('id') };
}
const STATUS_LABEL = { behind: 'Behind', due: 'Due', in_progress: 'In progress', pending_review: 'Needs review', returned: 'Sent back', late: 'Filed late', done: 'On time' };
const STATUS_SEV = { behind: 'r', returned: 'r', pending_review: 'y', late: 'y', due: 'n', in_progress: 'n', done: 'g' };
export const docStatusLabel = st => STATUS_LABEL[st] || st;

export function allDocs(s, actor) {
  if (!s || !actor || !actor.role) return [];
  const t = clockToday(s); const scope = inScopeSet(s, actor); const hours = ruleValue(s, 'notes.daily_due_hours', 24);
  const out = []; const lbl = id => M.clientLabel(s, id, false); const cl = id => M.byId(s.clients, id) || {};
  const base = (c, over) => ({ client: c, label: lbl(c), lauris: cl(c).harvest_no || '', site: siteShort(s, cl(c).school), siteId: cl(c).school, ...over });
  // filed notes
  for (const n of s.notes || []) {
    if (!scope.has(n.client) || !NOTE_TYPES.includes(n.type)) continue;
    const dueAt = n.type === 'daily' ? addDaysHour(n.date, hours) : n.type === 'weekly_guardian' ? addDays(mondayOf(n.date), 4) + 'T23:59' : monthEnd(n.date) + 'T23:59';
    const late = !!n.processed_at && n.processed_at > dueAt;
    const st = n.review === 'pending' ? 'pending_review' : ['returned', 'flagged'].includes(n.review) ? 'returned' : late ? 'late' : 'done';
    out.push(base(n.client, { id: 'note:' + n.id, noteId: n.id, group: 'note', type: n.type, typeLabel: DOC_LABEL[n.type], date: n.date, dateText: periodLabel(n.type, n.date), due: dueAt.slice(0, 10), dueText: fmtDate(dueAt.slice(0, 10)), status: st, statusLabel: STATUS_LABEL[st], sev: STATUS_SEV[st], staff: n.staff, staffShort: M.staffShort(s, n.staff), reviewer: n.reviewed_by ? M.staffShort(s, n.reviewed_by) : '', filedAt: n.processed_at || '', to: chartHref(n.client, 'documentation') }));
  }
  // notes that are missing: behind or due
  for (const m of noteMisses(s, actor, scope)) {
    const st = m.behind ? 'behind' : 'due';
    out.push(base(m.client, { id: `miss:${m.client}:${m.type}:${m.date}`, group: 'note', type: m.type, typeLabel: DOC_LABEL[m.type], date: m.date, dateText: periodLabel(m.type, m.date), due: m.dueAt.slice(0, 10), dueText: dueText(m.dueAt, t), status: st, statusLabel: STATUS_LABEL[st], sev: m.behind ? 'r' : sevOfDue(m.dueAt, t), staff: m.staff, staffShort: M.staffShort(s, m.staff), reviewer: '', filedAt: '', missing: true, to: chartHref(m.client, 'documentation') }));
  }
  // forms
  for (const d of s.documents || []) {
    if (!scope.has(d.client)) continue;
    const st = d.status === 'done' ? 'done' : d.due < t ? 'behind' : d.status === 'needs_review' ? 'pending_review' : d.status === 'in_progress' ? 'in_progress' : 'due';
    out.push(base(d.client, { id: 'doc:' + d.id, docId: d.id, group: 'form', type: d.kind, typeLabel: DOC_LABEL[d.kind], date: d.done_on || d.due, dateText: d.done_on ? 'Done ' + fmtDate(d.done_on) : '', due: d.due, dueText: dueText(d.due, t), status: st, statusLabel: st === 'due' ? 'Not started' : STATUS_LABEL[st], sev: STATUS_SEV[st], staff: cl(d.client).staff || '', staffShort: cl(d.client).staff ? M.staffShort(s, cl(d.client).staff) : '', owner: d.owner || '', ownerShort: d.owner ? M.staffShort(s, d.owner) : '', reviewer: '', filedAt: d.done_on || '', illustrative: !!d.illustrative, to: chartHref(d.client, 'documentation') }));
  }
  return out;
}
const mondayOf = d => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return addDays(d, -((w + 6) % 7)); };
const monthEnd = d => addDays(addDays(d.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1);
const addDaysHour = (d, hours) => { const x = new Date(d + 'T15:30:00Z'); x.setUTCHours(x.getUTCHours() + hours); return x.toISOString().slice(0, 16); };

const OPEN = ['behind', 'due', 'in_progress', 'pending_review', 'returned'];
function matchDoc(s, d, f) {
  if (f.q) { const q = f.q.toLowerCase(); if (![d.label, String(d.lauris), d.typeLabel, d.staffShort, d.site].join(' ').toLowerCase().includes(q)) return false; }
  if (f.group && d.group !== f.group) return false;
  if (f.type && d.type !== f.type) return false;
  if (f.status === 'open' ? !OPEN.includes(d.status) : f.status && d.status !== f.status) return false;
  if (f.staff && d.staff !== f.staff) return false;
  if (f.client && d.client !== f.client) return false;
  if (f.site && d.siteId !== f.site) return false;
  if (f.from && d.due < f.from) return false;
  if (f.to && d.due > f.to) return false;
  return true;
}
const DOC_SORT = { patient: d => d.label, type: d => d.typeLabel, due: d => d.due || '9999', status: d => SEV_N[d.sev] * 10 + OPEN.indexOf(d.status), staff: d => d.staffShort || 'zzz' };
export function documentRows(s, actor, filters = {}) {
  const f = { ...normalizeDocs({}), ...filters };
  const all = allDocs(s, actor);
  const base = all.filter(d => matchDoc(s, d, { ...f, status: '' }));
  const rows = (f.status ? base.filter(d => (f.status === 'open' ? OPEN.includes(d.status) : d.status === f.status)) : base);
  const key = DOC_SORT[f.sort] ? f.sort : 'status'; const g = DOC_SORT[key]; const dir = f.sort && f.dir === 'desc' ? -1 : 1;
  // default: what needs attention first (red, then yellow), then the nearest due date; filed items last, newest first
  rows.sort((a, b) => {
    if (key === 'status' && !f.sort) { const x = SEV_N[a.sev] - SEV_N[b.sev]; if (x) return x; return a.status === 'done' || a.status === 'late' ? String(b.due).localeCompare(String(a.due)) : String(a.due).localeCompare(String(b.due)) || a.label.localeCompare(b.label); }
    const x = g(a), y = g(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return (c || a.label.localeCompare(b.label)) * dir;
  });
  const counts = { all: base.length, open: base.filter(d => OPEN.includes(d.status)).length };
  for (const k of Object.keys(STATUS_LABEL)) counts[k] = base.filter(d => d.status === k).length;
  const uniq = (list, k, label) => [...new Map(list.filter(x => k(x)).map(x => [k(x), label(x)])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  return {
    rows, total: all.length, shown: rows.length, counts, filters: f,
    options: { staff: uniq(all, d => d.staff, d => d.staffShort), sites: uniq(all, d => d.siteId, d => d.site), clients: uniq(all, d => d.client, d => d.label), types: DOC_TYPES.map(k => [k, DOC_LABEL[k]]) },
    timely: timelyShare(all)
  };
}
// share of filed notes that were on time (the supervisor's "are they submitting on time" number); null when nothing was filed
function timelyShare(all) {
  const filed = all.filter(d => d.group === 'note' && !d.missing && (d.status === 'done' || d.status === 'late' || d.status === 'pending_review' || d.status === 'returned') && d.filedAt);
  const late = filed.filter(d => d.status === 'late').length;
  return filed.length ? { onTime: filed.length - late, of: filed.length, pct: Math.round(100 * (filed.length - late) / filed.length) } : null;
}

// ---------------------------------------------------------------------------------------------------------------- chart
export function patientChart(s, actor, clientId) {
  if (!s || !actor || !actor.role) return null;
  const scope = inScopeSet(s, actor); const c = M.byId(s.clients, clientId);
  if (!c || !scope.has(c.id)) return null;
  const items = outstandingByClient(s, actor).get(c.id) || [];
  const row = buildRow(s, actor, c, items);
  const docs = allDocs(s, actor).filter(d => d.client === c.id);
  const order = d => (OPEN.includes(d.status) ? 0 : 1) * 1e9 + (OPEN.includes(d.status) ? SEV_N[d.sev] * 1e7 : 0) + (OPEN.includes(d.status) ? 0 : -Date.parse(d.due || '1970-01-01') / 1e5);
  docs.sort((a, b) => order(a) - order(b) || String(a.due).localeCompare(String(b.due)));
  return {
    header: { id: c.id, label: row.label, age: c.age, grade: c.grade, lauris: row.lauris, school: M.school(s, c.school).name, siteShort: row.school, staffShort: row.staffShort, staffId: row.staffId, clinicianShort: row.clinicianShort, payer: row.payer, stageLabel: M.REF_STAGE[c.stage] || String(c.stage || '').replace(/_/g, ' ') },
    row, items, docs, auth: row.auth,
    can: { reviewNotes: can(actor, 'notes.review'), openCase: !!(row.auth && row.auth.requestId && can(actor, 'authorizations')), writeNotes: actor.role === 'direct_support' && can(actor, 'notes.own'), text: can(actor, 'notes.view') }
  };
}
