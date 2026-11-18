// Oprox parity foundation (R7): the numbers and groupings that Authorizations, Denial Intelligence and the extension panel share.
// PURE: no DOM, no app imports, so the server, the screens and the tests read them the same way.
//
//   rateUsd(s), usd(n)                    the demo's dollar-per-unit assumption (seed intel_sample.rate_usd_per_unit) and a $ formatter
//   atRisk(s, r)                          { units, dollars, label, kind, basis, why } | null     what is unbilled or unpaid if the request is late or cut
//   urgency(s, r)                         { hours, label, sev, date }                            "Due in 2h", "Overdue 3d", "Due tomorrow"
//   bands(items)                          { byId, groups }  "Highest financial risk · act now" / "Due within 24 hours" / "Due this week" / "Later"
//   packetLine(recs)                      { inputs, text, tone }   "Packet built · 1 clinical input needed"
//   liftLine(recs)                        "Historically improves approval by +12 pts (sample)" | ''
//   expectedAll(s, recs)                  { base, expected }   the expected approval if every open suggestion is included (sample)
//   modelConfidence(recs)                 { value, text }      a sample figure, always shown as Simulated
//   comparableCount(s, r)                 how many comparable cases the sample holds for this payer
//   payerPulse(s)                         the one-line payer intelligence update (sample)
//   payerPattern(s, payerId)              what the payer tends to do and what has worked, plus the appeal analogues (sample)
//   historicalCards(s)                    the three comparable-case cards (sample)
//   insights(s, scope)                    the facility insights: KPIs, approval by payer, denial reasons by payer, impactful actions, override patterns
//
// Everything that comes from seed intel_sample is an ILLUSTRATIVE SAMPLE (INTEL_BASIS): screens that show it say so and mark it Simulated.
// Nothing here writes a clinical statement. The clinic's own counts (decisions logged) are computed live from state.rec_decisions.
import { hoursBetween, daysBetween, fmtDate } from './dates.js';
import { today as clockToday, now as clockNow } from './clock.js';
import { payer as payerOf } from './model.js';
import { deadline, rateOf, renewal, PRE_SEND } from './sel/auth.js';
import { summary, OUTCOME_BASIS } from './recs.js';
import { ruleValue } from './rules.js';

export const INTEL_BASIS = 'Illustrative sample from the demo data. It is not Harvest\'s own history and it is not a prediction.';
export const DECISION_SUPPORT = 'Decision support for authorization documentation and workflow only. Not clinical guidance.';
export const BAND_LABEL = { risk: 'Highest financial risk · act now', day: 'Due within 24 hours', week: 'Due this week', later: 'Later', none: 'No date yet' };
export const BAND_ORDER = ['risk', 'day', 'week', 'later', 'none'];

const sample = s => (s && s.intel_sample) || {};
const payerName = (s, id) => (payerOf(s, id) || {}).name || id;
const plain = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ------------------------------------------------------------------------------------------------ money
export const rateUsd = s => +sample(s).rate_usd_per_unit || 205;
export const usd = n => `$${plain(n || 0)}`;

const OPEN_PENDING = ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'overdue', 'info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting'];
// atRisk(s, r) -> { units, dollars, label, kind:'renewal'|'gap'|'pending'|'denied', basis, why } | null
export function atRisk(s, r) {
  if (!r) return null;
  const rate = rateUsd(s); const requested = +r.units_requested || 0; const stage = r.stage;
  let units = 0; let kind = ''; let why = '';
  if (['active', 'early_discharge'].includes(stage) || (r.type === 'continued_stay' && PRE_SEND.includes(stage))) {
    const rn = renewal(s, r);
    if (rn && rn.due) {
      const perDay = (rateOf(s, r) || {}).value || 3;
      units = (rn.lead || 14) * perDay; kind = 'renewal';
      why = `${rn.lead} business days of IOP at ${perDay} units a day are unpaid if the renewal is late; the payer does not backdate an authorization.`;
    }
  } else if (['denied', 'appeal_sent'].includes(stage)) {
    units = Math.max(0, requested - (+r.units_awarded || 0)); kind = 'denied';
    why = `${units} of the ${requested} units asked for are not approved.`;
  } else if (OPEN_PENDING.includes(stage)) {
    const cur = r.units_offered != null ? +r.units_offered : r.units_awarded != null ? +r.units_awarded : null;
    if (cur != null && requested > cur) { units = requested - cur; kind = 'gap'; why = `${cur} of the ${requested} units asked for are offered; the other ${units} are at risk.`; }
    else { units = requested; kind = 'pending'; why = `All ${requested} units asked for wait on the payer's decision.`; }
  }
  if (units <= 0) return null;
  const dollars = units * rate;
  return { units, dollars, label: `${usd(dollars)} at risk`, kind, basis: `${units} units × ${usd(rate)} a unit (demo assumption)`, why };
}

// ------------------------------------------------------------------------------------------------ urgency
const parseDue = date => { const t = String(date || ''); return t.length > 10 ? t.slice(0, 16) : t ? `${t}T17:00` : ''; };
// urgency(s, r) -> { hours, label, sev, date, text }   `hours` counts from the demo clock; a date without a time is read as 17:00 that day.
export function urgency(s, r) {
  const dl = deadline(s, r) || {}; const date = dl.date || null;
  if (!date) return { hours: null, label: '', sev: dl.sev || 'none', date: null, text: dl.text || '' };
  const h = hoursBetween(clockNow(s), parseDue(date));
  let label;
  if (h < 0) { const d = Math.max(1, Math.ceil(-h / 24)); label = h > -24 ? 'Overdue today' : `Overdue ${d}d`; }
  else if (h < 1) label = 'Due in under 1h';
  else if (h < 24) label = `Due in ${Math.round(h)}h`;
  else if (h < 48) label = 'Due tomorrow';
  else if (h <= 24 * 7) label = `Due in ${Math.round(h / 24)}d`;
  else label = `Due ${fmtDate(String(date).slice(0, 10))}`;
  return { hours: h, label, sev: dl.sev || (h < 0 ? 'overdue' : h <= 24 ? 'soon' : 'ok'), date, text: dl.text || '' };
}

// bands(items:[{id, hours, dollars}]) -> { byId:{id:'risk'|'day'|'week'|'later'|'none'}, groups:[{key,label,ids}] }
// The highest-dollar case due within 72 hours (or overdue) is "Highest financial risk"; the rest follow their clock.
export function bands(items) {
  const list = (items || []).slice(); const byId = {};
  const near = list.filter(x => x.hours != null && x.hours <= 72 && (x.dollars || 0) > 0).sort((a, b) => (b.dollars - a.dollars) || (a.hours - b.hours));
  const riskId = near.length ? near[0].id : null;
  for (const x of list) {
    byId[x.id] = x.id === riskId ? 'risk' : x.hours == null ? 'none' : x.hours <= 24 ? 'day' : x.hours <= 24 * 7 ? 'week' : 'later';
  }
  const groups = BAND_ORDER.map(key => ({ key, label: BAND_LABEL[key], ids: list.filter(x => byId[x.id] === key).map(x => x.id) })).filter(g => g.ids.length);
  return { byId, groups };
}

// ------------------------------------------------------------------------------------------------ packet, lift, expected approval, confidence
const needsOwn = r => r.needsInput && r.state !== 'dismissed' && !String(r.context || '').trim();
export function packetLine(recs) {
  const inputs = (recs || []).filter(needsOwn).length;
  return inputs
    ? { inputs, text: `Packet built · ${inputs} clinical input${inputs === 1 ? '' : 's'} needed to complete`, tone: 'warning' }
    : { inputs: 0, text: 'Packet ready for review', tone: 'success' };
}
export function liftLine(recs) {
  const top = (recs || []).filter(r => r.outcome && r.outcome.lift).reduce((m, r) => Math.max(m, r.outcome.lift), 0);
  return top ? `Historically improves approval by +${top} pts (sample)` : '';
}
export function expectedAll(s, recs) {
  const base = summary(s, [], {}).base; const lift = (recs || []).filter(r => r.state !== 'dismissed').reduce((n, r) => n + ((r.outcome && r.outcome.lift) || 0), 0);
  return { base, expected: Math.min(96, base + lift), lift, basis: OUTCOME_BASIS };
}
export function modelConfidence(recs) {
  const n = (recs || []).length || 1; const grounded = (recs || []).filter(r => !r.needsInput).length;
  const value = Math.min(0.95, Math.round((0.72 + 0.2 * (grounded / n)) * 100) / 100);
  return { value, text: 'Validated on similar cases', basis: INTEL_BASIS };
}
export const comparableCount = (s, r) => +((sample(s).comparable || {})[r && r.payer]) || 100;

// ------------------------------------------------------------------------------------------------ payer intelligence (sample)
export function payerPulse(s) {
  const p = sample(s).pulse; if (!p) return null;
  return { ...p, payerName: payerName(s, p.payer), exposure: usd(p.exposure_usd), basis: INTEL_BASIS };
}
export function payerPattern(s, payerId) {
  const row = payerOf(s, payerId) || {}; const a = sample(s).appeals || {};
  return {
    payer: payerId, name: row.name || payerId, partialRate: row.partial_rate != null ? Math.round(row.partial_rate * 100) : null,
    tends: row.tends_to_ask || '', works: row.what_works || '',
    analogous: a.analogous || 0, reversedPct: a.reversed_pct || 0, p2pOverturnPct: a.p2p_overturn_pct || 0, note: a.note || '',
    strategies: (a.strategies || []).slice(), approvalPct: (sample(s).approval_by_payer || {})[payerId] ?? null, basis: INTEL_BASIS
  };
}
export const historicalCards = s => (sample(s).historical_cards || []).map(c => ({ ...c, basis: INTEL_BASIS }));

// ------------------------------------------------------------------------------------------------ facility insights
// One decision group = one (scope, ref): "none" when every suggestion was included as written, "partial" when some were dismissed or the
// clinician changed or added one, "full" when all were dismissed. The sample baseline is added so the screen is not empty on day one.
export function overridePatterns(s) {
  const base = sample(s).override_baseline || {}; const groups = new Map();
  for (const d of (s && s.rec_decisions) || []) { const k = `${d.scope}:${d.ref}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); }
  const live = { none: 0, partial: 0, full: 0 };
  for (const rows of groups.values()) {
    const inc = rows.filter(x => x.state === 'included' && !x.custom).length; const dis = rows.filter(x => x.state === 'dismissed').length; const own = rows.filter(x => x.custom || String(x.context || '').trim()).length;
    if (inc === 0 && dis > 0) live.full++; else if (dis > 0 || own > 0) live.partial++; else if (inc > 0) live.none++;
  }
  const total = ['none', 'partial', 'full'].reduce((n, k) => n + ((base[k] || {}).count || 0) + live[k], 0) || 1;
  const row = (key, label) => ({ key, label, count: ((base[key] || {}).count || 0) + live[key], live: live[key], success: (base[key] || {}).success ?? null });
  const rows = [row('none', 'No override needed'), row('partial', 'Partial override'), row('full', 'Full override')];
  return { rows, total, autonomy: Math.round((rows[0].count / total) * 100), liveTotal: live.none + live.partial + live.full, basis: INTEL_BASIS };
}

// insights(s, scope) -> the facility insights. `scope` ('auth'|'denial') only orders what a screen shows first.
export function insights(s, scope = 'auth') {
  const sm = sample(s); const outs = ((s && s.rec_outcomes) || []).slice().sort((a, b) => b.applied - a.applied);
  const ap = Object.entries(sm.approval_by_payer || {}).map(([id, pct]) => ({ payer: id, name: payerName(s, id), pct })).sort((a, b) => b.pct - a.pct);
  const reasonsTotal = (sm.denial_by_payer || []).reduce((n, x) => n + x.count, 0) || 1;
  const reasons = (sm.denial_by_payer || []).map(x => ({ ...x, name: payerName(s, x.payer), pct: Math.round((x.count / reasonsTotal) * 100) })).sort((a, b) => b.count - a.count);
  const ov = overridePatterns(s);
  const appliedTotal = outs.reduce((n, o) => n + o.applied, 0) || 1;
  const impact = Math.round(outs.reduce((n, o) => n + o.success * o.applied, 0) / appliedTotal);
  const kpi = sm.kpi || {};
  const kpis = [
    { key: 'approval', label: 'Average approval rate', value: `${kpi.avg_approval ?? Math.round(ap.reduce((n, x) => n + x.pct, 0) / (ap.length || 1))}%`, caption: kpi.avg_approval_delta != null ? `+${kpi.avg_approval_delta}% ${kpi.delta_note || ''}`.trim() : '' },
    { key: 'cause', label: 'Top denial cause', value: reasons[0] ? reasons[0].reason.replace(/^"|"$/g, '') : '—', caption: reasons[0] ? `${reasons[0].count} cases · ${reasons[0].name}` : '' },
    { key: 'impact', label: 'Suggestion impact', value: `${impact}%`, caption: 'Success when applied' },
    { key: 'autonomy', label: 'Autonomy rate', value: `${ov.autonomy}%`, caption: 'No human override' }
  ];
  const sections = scope === 'denial' ? ['reasons', 'actions', 'approval', 'overrides'] : ['approval', 'actions', 'reasons', 'overrides'];
  return {
    scope, kpis, sections, approvalByPayer: ap, denialReasons: reasons,
    actions: outs.slice(0, 4).map(o => ({ family: o.family, label: o.label, applied: o.applied, success: o.success })),
    overrides: ov, basis: INTEL_BASIS
  };
}


// urgency filter (URL key `urg`): '' all · 'overdue' · '24h' · 'week'. `u` is urgency(s, r).
export const URGENCY_FILTERS = [['', 'All urgency'], ['overdue', 'Overdue'], ['24h', 'Due within 24 hours'], ['week', 'Due this week']];
export const urgencyFilterOk = v => URGENCY_FILTERS.some(x => x[0] === v);
export const urgencyMatch = (u, key) => !key || (u && u.hours != null && (key === 'overdue' ? u.hours < 0 : key === '24h' ? u.hours <= 24 : u.hours <= 24 * 7));

// helpers the screens share
export const dayWord = n => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);
export { daysBetween, clockToday, ruleValue };
