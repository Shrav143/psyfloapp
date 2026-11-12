// Case-backed analytics (provenance 'case_backed'): everything here is counted from the stored requests, notes, events and client records, so
// the figures move when a note is processed, a request is sent or a payer decision is recorded. Pure ESM, imported by the server and the browser.
//
// Two kinds of figure, because /api/state is role-projected:
//   · computed in the browser from the projected state, for any role that may open Analytics: the pilot measures 1, 5 and 6, the Payer
//     Performance panels, the "upcoming work" list;
//   · computed ON THE SERVER from the full state and delivered as state.analytics_agg (a derived projection key declared in
//     server/psyflo/actions/x-analytics.js): the pilot measures 2, 3 and 4 and every Patient Outcomes and Patient Population panel, because those
//     read diagnoses, goals, note text, drafts and timestamps that an administrator or a site supervisor must not receive. The digest holds
//     panels whose small groups are already suppressed; no patient-level row ever leaves the server in it.
// Patient-level rows (membersOf) exist only for a user who holds analytics.drilldown (a clinician, own caseload), computed from the state
// that user already holds.
import { can } from '../permissions.js';
import { rule, ruleValue } from '../rules.js';
import { addDays, daysBetween, fmtDate } from '../dates.js';
import { payerShort, clientLabel } from '../model.js';
import { PROV, result, minN, sup, stat, cellText, todayOf, nowOf, day, inRange, periodOf, normPeriod, PERIODS, PERIOD_IDS, DEFAULT_PERIOD, median, r1, sum } from './common.js';
import { populationPanels, outcomePanels, membersOf as factMembers, dxFromText, goalArea, ageBand, direction } from './panels.js';
import { payerPanels, payerStrip } from './payer.js';
import { MEASURES, MEASURE, notesOnTime, prepTime, intakeToSra, missingCaught, submissionsWithReceipts, unresolvedRequests, NOTE_TYPE_LABEL, UNRESOLVED_KIND } from './metrics.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const nonTdt = c => !!c && !!c.service_line && c.service_line !== 'tdt';
export const CASE_SOURCE = 'Stored requests, notes, events and client records in Psyflo';

// ---------- who is asking, and which patients that person may count ----------
// actor: the staff record (browser: session.actor) or the server actor. Site supervisors count their own sites; administrators and
// clinicians count every site (clinicians carry the whole TDT caseload in this demo, see server/psyflo/gates.js caseloadOf).
export function sitesOf(actor) {
  if (!actor) return [];
  if (actor.role === 'supervisor') return [].concat(actor.sites && actor.sites !== 'all' ? actor.sites : []);
  return 'all';
}
function scopeFn(s, sites, site) {
  return id => {
    const c = byId(s.clients, id);
    if (!c) return sites === 'all' && !site;                      // a student known only by text on a request: no site to place them in
    if (nonTdt(c)) return false;
    if (sites !== 'all' && !sites.includes(c.school)) return false;
    if (site && c.school !== site) return false;
    return true;
  };
}
export function makeCtx(s, actor, F = {}) {
  const sites = sitesOf(actor); const site = F.site || '';
  const allowed = !!actor && can(actor, 'analytics.aggregate');
  return { allowed, role: actor ? actor.role : null, actorId: actor ? actor.id : null, sites, site, today: todayOf(s), now: nowOf(s), min: minN(s),
    drill: !!actor && can(actor, 'analytics.drilldown'), inScope: scopeFn(s, sites, site) };
}
export function normalizeFilters(raw = {}, s) {
  return { period: normPeriod(raw.period), site: String(raw.site || ''), payer: String(raw.payer || '') };
}
export function siteOptions(s, actor) {
  const sites = sitesOf(actor); const ctx = scopeFn(s, sites, '');
  const used = new Set((s.clients || []).filter(c => ctx(c.id)).map(c => c.school));
  return (s.schools || []).filter(x => used.has(x.id)).map(x => [x.id, x.name]);
}
export function payerOptions(s, ctx) {
  const used = new Set((s.requests || []).filter(r => ctx.inScope(r.client)).map(r => r.payer));
  return (s.payers || []).filter(p => used.has(p.id)).map(p => [p.id, payerShort(s, p.id)]);
}
export const periodFor = (s, F) => periodOf(todayOf(s), F.period);

// ---------- facts for Patient Outcomes and Patient Population (full state: server, or a clinician's browser) ----------
const STAGE_STATUS = { in_service: 'active', in_service_unpaid: 'active', early_discharge_new_initial: 'active', request_pending: 'awaiting', denied_appeal: 'awaiting', no_authorization: 'awaiting', intake: 'intake', referral: 'referral', discharged: 'discharged' };
const SVC = (txt) => { const t = String(txt || ''); return /after-school/i.test(t) ? { key: 'tdt-after', label: 'TDT after-school' } : /school day/i.test(t) ? { key: 'tdt-school', label: 'TDT school day' } : t ? { key: t.toLowerCase(), label: t.replace(/\s*·.*$/, '') } : null; };
const INST = [[/phq/i, 'PHQ-A'], [/gad/i, 'GAD-7'], [/suds/i, 'SUDS'], [/dsm.*parent/i, 'DSM cross-cutting (parent)'], [/dsm/i, 'DSM cross-cutting (child)']];
const instName = x => (INST.find(([re]) => re.test(x)) || [0, null])[1];
const objectiveOf = n => (n.objective != null ? +n.objective : (String((n.fields || {})['Objective addressed'] || (n.fields || {})['ISP objective'] || '').match(/obj(?:ective)?\.?\s*(\d)/i) || [])[1] ? +String((n.fields || {})['Objective addressed'] || (n.fields || {})['ISP objective']).match(/obj(?:ective)?\.?\s*(\d)/i)[1] : null);
const ivOf = n => { const raw = n.interventions || ((n.fields || {})['Interventions'] != null ? String(n.fields['Interventions']).split(/\s*[·;]\s*/) : (n.fields || {})['Intervention'] != null ? [String(n.fields['Intervention'])] : []); return (Array.isArray(raw) ? raw : [raw]).map(x => String(x).trim()).filter(Boolean); };

export function clinicalFacts(s, ctx, P) {
  const t = ctx.today; const catalog = s.interventions || [];
  const ivKey = text => { const c = catalog.find(i => text.toLowerCase().includes(String(i.code).toLowerCase()) || text.toLowerCase().includes(String(i.name).toLowerCase())); return c ? { key: c.name.toLowerCase(), label: c.name } : { key: text.toLowerCase(), label: text.replace(/^[A-Za-z]+ \d+(\.\d+[a-z]?)?\s+/, '') || text }; };
  return (s.clients || []).filter(c => !nonTdt(c) && ctx.inScope(c.id)).map(c => {
    const school = byId(s.schools, c.school) || {}; const auth = c.authorization || {};
    const notes = (s.notes || []).filter(n => n.client === c.id);
    const inP = notes.filter(n => inRange(n.date, P.from, P.to));
    const goals = (c.goals || []).map(g => { const a = goalArea(`${g.name || ''} ${g.objective || ''}`); return { key: a.key, label: a.label, n: g.n, touched: inP.filter(n => objectiveOf(n) === g.n).length, pct: null }; });
    const ivs = new Map(); for (const n of inP) for (const x of ivOf(n)) { const k = ivKey(x); const e = ivs.get(k.key) || { ...k, n: 0 }; e.n++; ivs.set(k.key, e); }
    // scores: only what is stored (never estimated). Undated quarter series are ordered by position.
    const series = new Map();
    const put = (inst, d, v) => { if (!inst || !(v >= 0)) return; if (!series.has(inst)) series.set(inst, { inst, label: inst, lowerBetter: true, points: [] }); series.get(inst).points.push({ d, v: +v }); };
    const q = c.quarter || {};
    (q.phq_a || []).forEach((v, i) => put('PHQ-A', `0:${i}`, v)); (q.dsm_parent || []).forEach((v, i) => put('DSM cross-cutting (parent)', `0:${i}`, v)); (q.dsm_child || []).forEach((v, i) => put('DSM cross-cutting (child)', `0:${i}`, v));
    for (const a of s.assessment_history || []) if (a.client === c.id) { const inst = instName(a.instrument); const have = series.get(inst); if (a.prev != null && !(have && have.points.length > 1)) put(inst, `0:p${a.date}`, a.prev); if (!(have && have.points.length > 1)) put(inst, a.date, a.score); }
    for (const a of s.assessments || []) if (a.client === c.id && a.score != null) put(instName(a.instrument) || a.instrument, a.date || t, a.score);
    const datedScores = [...series.values()].flatMap(x => x.points.filter(p => /^\d{4}/.test(p.d)));
    const lastScore = datedScores.map(p => p.d).sort().pop() || null;
    const mine = (s.incidents || []).filter(i => i.client === c.id); const monthly = {};
    for (const i of mine) { const m = day(i.date).slice(0, 7); (monthly[m] = monthly[m] || { incidents: 0, office: 0 }).incidents++; }
    for (const o of s.counselor_counts || []) if (o.client === c.id) (monthly[o.month] = monthly[o.month] || { incidents: 0, office: 0 }).office += o.office_referrals || 0;
    const feedback = (s.checkins || []).filter(k => k.client === c.id && inRange(k.week_of || k.at, P.from, P.to)).flatMap(k => Object.values(k.answers || {}).map(a => ({ src: k.role === 'guardian' ? 'caregiver' : 'teacher', pos: /^(always|often)$/i.test(String(a)) })));
    const reqs = (s.requests || []).filter(r => r.client === c.id);
    const svc = new Map(); for (const r of reqs) { const x = SVC(r.service); if (x) svc.set(x.key, { ...x, n: 1 }); } if (!svc.size && auth.service) { const x = SVC(auth.service); if (x) svc.set(x.key, { ...x, n: 1 }); }
    const status = STAGE_STATUS[c.stage] || 'other';
    const flags = [];
    const sc = [...series.values()];
    if (status === 'active') { if (!sc.length) flags.push('no_score'); else if (lastScore && daysBetween(day(lastScore), t) > 60) flags.push('stale_score'); }
    if (sc.some(x => x.points.length > 1 && direction(x) === 'worse')) flags.push('worse');
    if ((c.goals || []).length && notes.some(n => objectiveOf(n) != null)) { const recent = notes.filter(n => daysBetween(day(n.date), t) <= 28 && daysBetween(day(n.date), t) >= 0); if ((c.goals || []).some(g => !recent.some(n => objectiveOf(n) === g.n))) flags.push('goal_untouched'); }
    if (mine.some(i => inRange(i.date, P.from, P.to))) flags.push('safety');
    const recentNote = notes.some(n => { const d = day(n.processed_at || n.date); return d && daysBetween(d, t) <= 30 && daysBetween(d, t) >= 0; });
    const guardian = notes.some(n => n.type === 'weekly_guardian' && daysBetween(day(n.date), t) <= 30 && daysBetween(day(n.date), t) >= 0);
    return { id: c.id, initials: c.initials, site: c.school, siteLabel: school.name || c.school, locality: school.locality || '', payer: auth.payer || (c.medicaid && c.medicaid.plan) || null, payerLabel: payerShort(s, auth.payer || (c.medicaid && c.medicaid.plan) || ''),
      age: c.age != null ? c.age : null, ageBand: ageBand(c.age), program: 'TDT', status, stage: c.stage, enrolled: c.service_start || null, ended: c.discharged_on || null,
      dx: dxFromText(c.diagnosis), goals, ivs: [...ivs.values()], series: sc, monthly, feedback, svc: [...svc.values()], units: auth.units ? { authorized: auth.units, used: auth.used || 0 } : null,
      flags, have: { goals: (c.goals || []).length > 0, score: sc.some(x => x.points.length > 0), note: recentNote, guardian } };
  });
}

// one (site, period) slice of the clinical digest: panels with small groups suppressed, plus pilot measures 2 to 4 as figures
export function clinicalSlice(s, ctx, P) {
  const facts = clinicalFacts(s, ctx, P); const env = { min: ctx.min, drill: ctx.drill, asOf: ctx.today, from: P.from };
  const prep = prepTime(s, ctx, P), intake = intakeToSra(s, ctx, P), miss = missingCaught(s, ctx, P);
  const small = n => (n > 0 && n < ctx.min ? sup(ctx.min) : n);
  return {
    pilot: {
      prep: { of: prep.of, n: small(prep.n), median: stat(prep.median, prep.n, ctx.min), p75: stat(prep.p75, prep.n, ctx.min) },
      intake: { n: small(intake.n), median: stat(intake.median, intake.n, ctx.min), toPlan: stat(intake.medianToPlan, intake.n, ctx.min), planToSra: stat(intake.medianPlanToSra, intake.n, ctx.min) },
      missing: { forms: miss.forms, items: miss.items, per100: miss.per100, flaggedForms: miss.flaggedForms }
    },
    population: populationPanels(facts, env).map(p => ({ ...p, provenance: PROV.CASE })),
    outcomes: outcomePanels(facts, env).map(p => ({ ...p, provenance: PROV.CASE }))
  };
}

// ---------- the digest: state.analytics_agg (server side; see x-analytics.js) ----------
// Small on purpose (it rides along with every /api/state read): a panel's static text and columns are NOT sent (the browser rebuilds them from
// the panel id), and identical panels across sites and periods are stored once in `pool`; a slice holds indexes into it.
export const DIGEST_KEY = 'analytics_agg';
let META = null;
function panelMeta() {
  if (META) return META; META = {}; const env = { min: 5, drill: false, asOf: '2000-01-01' };
  for (const p of [...populationPanels([], env), ...outcomePanels([], env)]) META[p.id] = p;
  return META;
}
const KEEP = ['id', 'rows', 'total'];
const strip = p => { const m = panelMeta()[p.id] || {}; const o = {}; for (const [k, v] of Object.entries(p)) if (k !== 'provenance' && (KEEP.includes(k) || JSON.stringify(v) !== JSON.stringify(m[k]))) o[k] = v; return o; };
const hydrate = p => ({ ...(panelMeta()[p.id] || {}), ...p, provenance: PROV.CASE });
export function digest(s, actor) {
  if (!actor || !can(actor, 'analytics.aggregate')) return {};
  const base = makeCtx(s, actor, {});
  const sites = ['all', ...siteOptions(s, actor).map(x => x[0])];
  const pool = [], seen = new Map(), slices = {};
  const put = p => { const sp = strip(p), k = JSON.stringify(sp); if (!seen.has(k)) { seen.set(k, pool.length); pool.push(sp); } return seen.get(k); };
  for (const site of sites) {
    const ctx = { ...base, site: site === 'all' ? '' : site, inScope: scopeFn(s, base.sites, site === 'all' ? '' : site) };
    for (const p of PERIOD_IDS) { const sl = clinicalSlice(s, ctx, periodOf(base.today, p)); slices[`${site}|${p}`] = { pilot: sl.pilot, population: sl.population.map(put), outcomes: sl.outcomes.map(put) }; }
  }
  return { v: 2, asOf: base.today, role: base.role, min: base.min, drill: base.drill, pool, slices };
}
// the slice for a filter: the server digest when the state carries one, else (a clinician only, who holds the full state) computed here
const HYD = new WeakMap();
export function sliceFor(s, actor, F) {
  const key = `${F.site || 'all'}|${F.period}`; const d = s[DIGEST_KEY];
  if (d && d.slices && d.slices[key]) {
    let h = HYD.get(d); if (!h) { h = {}; HYD.set(d, h); }
    if (!h[key]) { const sl = d.slices[key]; h[key] = { pilot: sl.pilot, population: sl.population.map(i => hydrate(d.pool[i])), outcomes: sl.outcomes.map(i => hydrate(d.pool[i])) }; }
    return h[key];
  }
  if (actor && actor.role === 'clinician' && (s.clients || []).some(c => c.goals || c.diagnosis)) { const ctx = makeCtx(s, actor, F); return clinicalSlice(s, ctx, periodFor(s, F)); }
  return null;
}

// ---------- pilot scorecard ----------
const asDays = x => (x == null ? '—' : `${x} d`);
export function scorecard(s, rawF, actor) {
  const F = normalizeFilters(rawF, s); const ctx = makeCtx(s, actor, F); const P = periodFor(s, F); const min = ctx.min;
  const sl = sliceFor(s, actor, F); const pil = sl && sl.pilot;
  const rows = [];
  // 1 notes
  const n1 = notesOnTime(s, ctx, P);
  rows.push({ id: 'notes', headline: n1.den ? `${n1.num} of ${n1.den}` : '—', num: n1.num, den: n1.den, pct: n1.den ? Math.round((100 * n1.num) / n1.den) : null,
    note: n1.den ? `${n1.late} late · ${n1.missed} missed` : 'No required note is due yet', link: null,
    breakdown: Object.entries(NOTE_TYPE_LABEL).map(([k, l]) => ({ label: l, value: n1.byType[k].den ? `${n1.byType[k].num} of ${n1.byType[k].den}` : '—' })).concat([{ label: 'Window', value: `${n1.windowHours} h after the service day` }, { label: 'Students with notes', value: String(n1.students) }, { label: 'Counted since', value: n1.observedSince ? fmtDate(n1.observedSince) : '—' }]),
    list: ctx.drill ? Object.entries(n1.byStudent).map(([id, r]) => ({ id, label: clientLabel(s, id, false), value: `${r.num} of ${r.den}`, })) : null });
  // 2 time to document
  const pr = pil && pil.prep;
  rows.push(pil ? { id: 'prep', headline: pr.n === 0 ? '—' : typeof pr.median === 'object' ? cellText(pr.median) : `${pr.median} min`, num: typeof pr.n === 'number' ? pr.n : null, den: pr.of,
    note: pr.n === 0 ? 'No capture events yet' : typeof pr.n === 'object' ? `${pr.of} notes processed` : `75th percentile ${typeof pr.p75 === 'object' ? cellText(pr.p75) : pr.p75 + ' min'} · ${pr.n} of ${pr.of} notes`, stat: { median: pr.median, p75: pr.p75 },
    breakdown: [{ label: 'Notes processed', value: String(pr.of) }, { label: 'With a capture event', value: cellText(pr.n) }, { label: 'Median', value: cellText(pr.median) }, { label: '75th percentile', value: cellText(pr.p75) }], list: null }
    : { id: 'prep', headline: '—', num: null, den: null, note: 'Not available for this view', breakdown: [], list: null, unavailable: true });
  // 3 intake to SRA
  const it = pil && pil.intake;
  rows.push(pil ? { id: 'intake', headline: it.n === 0 ? '—' : typeof it.n === 'object' ? 'Fewer than ' + min + ' cases' : `${it.median} d`, num: typeof it.n === 'number' ? it.n : null, den: null,
    note: it.n === 0 ? 'No initial SRA has reached Pending clinical approval' : typeof it.n === 'object' ? 'A statistic needs ' + min + ' or more cases' : `Intake to plan ${asDays(it.toPlan)} · plan to SRA ${asDays(it.planToSra)}`,
    breakdown: [{ label: 'Cases in the period', value: cellText(it.n) }, { label: 'Median', value: typeof it.median === 'object' ? cellText(it.median) : asDays(it.median) }, { label: 'Intake to plan', value: typeof it.toPlan === 'object' ? cellText(it.toPlan) : asDays(it.toPlan) }, { label: 'Plan to SRA', value: typeof it.planToSra === 'object' ? cellText(it.planToSra) : asDays(it.planToSra) }],
    list: ctx.drill ? intakeToSra(s, ctx, P).cases.map(c => ({ id: c.request, label: `${clientLabel(s, c.client, false)} · ${c.request}`, value: `${c.days} d${c.approx ? ' (dates only)' : ''}`, route: { id: 'Authorization', params: { id: c.request, section: 'submission' } } })) : null }
    : { id: 'intake', headline: '—', num: null, den: null, note: 'Not available for this view', breakdown: [], list: null, unavailable: true });
  // 4 items caught early
  const mi = pil && pil.missing;
  rows.push(pil ? { id: 'missing', headline: mi.forms ? `${mi.items} items` : '—', num: mi.items, den: mi.forms, pct: null,
    note: mi.forms ? `${mi.per100} per 100 forms · ${mi.forms} with a draft` : 'No draft recorded in the period',
    breakdown: [{ label: 'Forms with a draft', value: String(mi.forms) }, { label: 'Items flagged before Process Form', value: String(mi.items) }, { label: 'Forms with at least one item', value: String(mi.flaggedForms) }], list: null }
    : { id: 'missing', headline: '—', num: null, den: null, note: 'Not available for this view', breakdown: [], list: null, unavailable: true });
  // 5 sends with receipts
  const n5 = submissionsWithReceipts(s, ctx, P);
  rows.push({ id: 'receipts', headline: n5.den ? `${n5.num} of ${n5.den}` : '—', num: n5.num, den: n5.den, pct: n5.den ? Math.round((100 * n5.num) / n5.den) : null,
    note: n5.den ? (n5.den - n5.num ? `${n5.den - n5.num} without a receipt` : 'Every send has a receipt') : 'No request sent in the period',
    breakdown: Object.entries(n5.byChannel).map(([c, v]) => ({ label: { fax: 'Fax (Sfax)', availity: 'Availity', portal: 'UHC portal' }[c] || c, value: `${v.num} of ${v.den}` })),
    list: n5.rows.map(r => ({ id: r.id, label: `${clientLabel(s, r.client, false)} · ${r.id}`, value: r.receipt ? 'Receipt recorded' : 'No receipt yet', tone: r.receipt ? 'ok' : 'warn', route: { id: 'Authorization', params: { id: r.id, section: 'submission' } } })) });
  // 6 unresolved
  const n6 = unresolvedRequests(s, ctx);
  rows.push({ id: 'unresolved', headline: String(n6.count), num: n6.count, den: n6.open, pct: null,
    note: n6.count ? `${n6.past} past the clock · ${n6.open} active requests` : `None of ${n6.open} active requests`,
    breakdown: Object.entries(n6.byKind).map(([k, v]) => ({ label: UNRESOLVED_KIND[k], value: String(v) })),
    list: n6.rows.map(r => ({ id: r.id, label: `${clientLabel(s, r.client, false)} · ${payerShort(s, r.payer)}`, value: r.kind + (r.ageDays != null ? ` · ${r.ageDays} d` : ''), tone: r.past ? 'warn' : '', route: { id: 'DenialCase', params: { id: r.id } } })) });
  for (const r of rows) { const m = MEASURE[r.id]; Object.assign(r, { no: m.no, label: m.label, numerator: m.numerator, denominator: m.denominator, definition: `${m.numerator} ${m.denominator}`, source: m.source, limits: m.limits, reads: m.reads, rules: m.rules.map(k => { const x = rule(s, k); return { key: k, label: x.label, value: Array.isArray(x.value) ? JSON.stringify(x.value) : String(x.value), unit: x.unit, verification: x.verification, category: x.category, source: x.source }; }) }); }
  return result({ provenance: PROV.CASE, asOf: ctx.today, source: CASE_SOURCE, rows, period: P, filters: F, min });
}

// ---------- Payer Performance ----------
export function requestFacts(s, ctx, P, payerFilter = '') {
  const out = [];
  for (const r of s.requests || []) {
    if (!ctx.inScope(r.client) || (payerFilter && r.payer !== payerFilter)) continue;
    const sent = day(r.sent || r.send_pressed_at) || null;
    const log = (r.decision_log || []).filter(d => !d.superseded_by && ['approved', 'partial', 'denied'].includes(d.outcome));
    const last = log.sort((a, b) => (a.at < b.at ? -1 : 1)).pop();
    let outcome = 'pending', approved = null, decided = null, offered = r.units_offered != null ? r.units_offered : null;
    if (last) { outcome = last.outcome; approved = last.outcome === 'denied' ? 0 : last.units != null ? last.units : r.units_awarded != null ? r.units_awarded : null; decided = day(last.at); }
    else if (r.stage === 'denied' || r.stage === 'appeal_sent' || r.denied_on) { outcome = 'denied'; approved = 0; decided = day(r.denied_on) || null; }
    else if (r.units_awarded != null && !['draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted'].includes(r.stage)) { outcome = r.units_awarded >= r.units_requested ? 'approved' : 'partial'; approved = r.units_awarded; decided = day((r.decision && r.decision.at) || r.offer_call) || null; }
    else if (r.stage === 'partial_decide') { outcome = 'partial'; decided = day(r.offer_call) || null; }
    const anchor = sent || decided || day(r.drafted_at) || null;
    if (anchor && !(inRange(anchor, P.from, P.to) || (decided && inRange(decided, P.from, P.to)))) continue;
    out.push({ id: r.id, client: r.client, payer: r.payer, payerLabel: payerShort(s, r.payer), type: r.type, svc: r.service, submitted: sent, decided, outcome, requested: r.units_requested || 0, approved, offered,
      reason: r.denial_reason || (r.decision_log || []).map(d => d.reason).find(Boolean) || null, appealed: r.stage === 'appeal_sent' || !!r.appeal, appealOutcome: (r.appeal && r.appeal.outcome) || null, renewal: r.type === 'continued_stay',
      days: sent && decided ? Math.max(0, daysBetween(sent, decided)) : null, stage: r.stage, extraWork: ['info_requested', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'appeal_sent'].includes(r.stage) || !!r.p2p_at || !!r.info_requested_at || !!r.appeal || (r.decision_log || []).some(d => d.kind === 'p2p') });
  }
  return out;
}

const SRC_SHORT = { 'OFFICIAL-VERIFIED': 'Officially verified', 'PAYER-SPECIFIC': 'Payer-specific', 'HARVEST-REPORTED': 'Harvest-reported', 'UNVERIFIED-DEMO-ASSUMPTION': 'Unverified' };
export function upcomingWork(s, ctx) {
  const t = ctx.today; const rows = [];
  const add = (date, what, r, key, extra = {}) => { if (!date) return; const x = key ? rule(s, key, r.payer) : null; rows.push({ date: day(date), when: fmtDate(day(date), { dow: true }), what, case: `${clientLabel(s, r.client, false)} · ${r.id}`, src: x ? (SRC_SHORT[x.category] || 'Unverified') : 'Recorded', _rule: key, _id: r.id, _stage: r.stage, _payer: r.payer, past: day(date) < t, ...extra }); };
  for (const r of s.requests || []) {
    if (!ctx.inScope(r.client)) continue;
    switch (r.stage) {
      case 'info_requested': add(r.reply_due, 'Information reply due', r, 'info_request.hours'); break;
      case 'partial_decide': add(r.reply_by, 'Reply to the partial offer', r, null); break;
      case 'peer_to_peer_booked': add(r.p2p_at, 'Peer-to-peer call', r, null); break;
      case 'denied': add(r.appeal_deadline, 'Appeal window closes', r, 'appeal.window_days'); break;
      case 'submitted': add(r.receipt_check, 'Receipt check call', r, 'submission.receipt_check_day'); add(r.decision_due, 'Decision window ends', r, 'decision.overdue_after_days'); break;
      case 'overdue': add(r.decision_due, 'Overdue notice to send', r, 'decision.overdue_after_days'); break;
      case 'draft_ready': if (r.type === 'continued_stay') add(r.renew_by, 'Continued stay due', r, 'continued_stay.lead_business_days'); break;
      default: break;
    }
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

export function payerSection(s, rawF, actor) {
  const F = normalizeFilters(rawF, s); const ctx = makeCtx(s, actor, F); const P = periodFor(s, F);
  const R = requestFacts(s, ctx, P, F.payer); const env = { min: ctx.min, provenance: PROV.CASE, asOf: ctx.today };
  const panels = payerPanels(R, env).map(p => ({ ...p, provenance: PROV.CASE }));
  const by = panels.find(p => p.id === 'pay.by_payer');
  by.rows.forEach(r => { if (r._payer) r._route = { id: 'DenialIntelligence', params: { payer: r._payer } }; });
  const up = upcomingWork(s, ctx).filter(r => !F.payer || r._payer === F.payer);
  panels.push({ id: 'pay.upcoming', title: 'Upcoming work', kind: 'table', provenance: PROV.CASE, columns: [{ key: 'when', label: 'Date' }, { key: 'what', label: 'Work' }, { key: 'case', label: 'Case' }, { key: 'src', label: 'Date source' }],
    rows: up.map(r => ({ when: r.when, what: r.what, case: r.case, src: r.src, _rule: r._rule, _payer: r._payer, _route: { id: 'DenialCase', params: { id: r._id } }, _past: r.past })), limit: 4,
    definition: 'Dated payer work on open requests: replies due, calls, windows closing and continued-stay renewals. Each date carries its source: a rule with its verification label, or a date a person recorded.', empty: 'No dated payer work on open requests.' });
  const undated = (s.requests || []).filter(r => ctx.inScope(r.client) && (!F.payer || r.payer === F.payer)).length - R.length;
  return { dataset: PROV.CASE, strip: payerStrip(R, ctx.min), panels, period: P, filters: F, asOf: ctx.today, source: CASE_SOURCE, notes: undated > 0 ? [`${undated} request${undated === 1 ? '' : 's'} outside this period or with no recorded date are not counted.`] : [] };
}

// ---------- the seeded baseline, labelled "Sample data, illustrative" ----------
export function baselinePanels(s) {
  const b = s.analytics_baseline || {}; const min = minN(s); if (!b.monthly) return [];
  const label = (s.provenance && s.provenance.label_harvest_export) || 'Sample data, illustrative';
  const asOf = (s.migration && s.migration.last_export) || todayOf(s);
  const tot = b.monthly.reduce((a, m) => a + m[1], 0), awd = b.monthly.reduce((a, m) => a + m[2], 0);
  const common = { provenance: PROV.EXPORT, source: label, asOf };
  const C = (first, ...more) => [{ key: 'label', label: first }, ...more.map(([key, l]) => ({ key, label: l, align: 'right' }))];
  const P = [];
  P.push({ id: 'base.kpis', title: 'Baseline figures', kind: 'table', ...common, columns: C('Measure', ['v', 'Value']), rows: [
    { label: 'Decided requests, 12 months', v: b.decided }, { label: 'Returned partial', v: Math.round(b.partial * 100) + '%' }, { label: 'Units awarded vs requested', v: tot ? Math.round((100 * awd) / tot) + '%' : '—' },
    { label: 'Median award on a 150-unit ask', v: b.median_award_on_150 }, { label: 'Full denials', v: b.full_denials }, { label: 'Median decision day', v: 'Day ' + b.median_decision_days },
    { label: 'Appeals attempted · overturned', v: `${b.appeals_attempted} · ${b.appeals_overturned}` }, { label: 'Early discharge and restart', v: b.early_discharge_restarts }, { label: 'Unpaid clinical hours', v: '≈' + b.unpaid_hours }],
    definition: `${label}. ${b.period || ''}. Seeded figures; Harvest has not computed them. Never summed with the case-backed counts.` });
  P.push({ id: 'base.monthly', title: 'Units by month', kind: 'table', ...common, columns: C('Month', ['req', 'Requested'], ['aw', 'Awarded']), rows: b.monthly.map(([l, r, a]) => ({ label: l, req: r, aw: a })), chart: { type: 'months', keys: ['req', 'aw'] }, definition: `${label}. H2016 school-day units, 12 months.` });
  const pa = b.payer_awarded || {};
  P.push({ id: 'base.payers', title: 'Payers, sample', kind: 'table', ...common, columns: C('Payer', ['n', 'Requests'], ['partial', 'Partial'], ['aw', 'Awarded vs asked'], ['d', 'Decision days']), rows: (s.payers || []).map(p => {
    const small = (p.requests_this_year || 0) < min; return { label: payerShort(s, p.id), n: small ? sup(min) : p.requests_this_year, partial: small ? sup(min) : Math.round((p.partial_rate || 0) * 100) + '%', aw: small ? sup(min) : pa[p.id] != null ? Math.round(pa[p.id] * 100) + '%' : '—', d: small ? sup(min) : p.decides_in_days != null ? 'Day ' + p.decides_in_days : '—' }; }),
    definition: `${label}. Requests, partial rate and decision days per payer are seeded sample figures. Payers with fewer than ${min} requests are not shown.` });
  const loc = b.by_locality || {};
  P.push({ id: 'base.localities', title: 'Localities, sample', kind: 'table', ...common, columns: C('Locality', ['n', 'Decided'], ['partial', 'Partial'], ['aw', 'Awarded vs asked']), rows: Object.entries(loc).map(([k, v]) => ({ label: { cc: 'Campbell County', lc: 'Lynchburg City' }[k] || k, n: v.n, partial: Math.round(v.partial * 100) + '%', aw: Math.round(v.awarded_ratio * 100) + '%' })), definition: `${label}. By locality.` });
  return P;
}

// ---------- the Outcomes and Population sections of the case-backed view ----------
export function clinicalSection(s, section, rawF, actor) {
  const F = normalizeFilters(rawF, s); const ctx = makeCtx(s, actor, F); const sl = sliceFor(s, actor, F);
  const key = section === 'outcomes' ? 'outcomes' : 'population';
  return { dataset: PROV.CASE, panels: sl ? sl[key] : [], unavailable: !sl, period: periodFor(s, F), filters: F, asOf: ctx.today, source: CASE_SOURCE, notes: [] };
}

// ---------- patient-level rows behind a group (clinician, own caseload; never for another role, never for another dataset) ----------
export function membersOf(s, actor, rawF, drill) {
  const F = normalizeFilters(rawF, s); const ctx = makeCtx(s, actor, F);
  if (!ctx.drill) return { denied: true, reason: 'Patient-level rows need clinical-records access (a clinician, own caseload).', rows: [] };
  const facts = clinicalFacts(s, ctx, periodFor(s, F));
  const caseload = (s.clients || []).map(c => c.id);
  return { denied: false, rows: factMembers(facts, drill.p, drill.k).filter(f => can(actor, 'analytics.drilldown', { clientId: f.id, caseload })).map(f => ({ id: f.id, initials: f.initials, site: f.siteLabel, stage: f.stage, status: f.status, route: { id: 'Authorizations', params: { q: f.initials } } })) };
}

// the whole case-backed model for one section (the screen and the export both call this)
export function caseSection(s, section, rawF, actor) {
  if (section === 'payer') return payerSection(s, rawF, actor);
  return clinicalSection(s, section, rawF, actor);
}
export { PERIODS, DEFAULT_PERIOD, MEASURES };
