// The rules table (pure; imported by the server, the app, the portals and the panel).
// Source of truth: seed/extra/rules.json -> state.rules, built from review/05c-rules-register.md (R-001..R-054).
// Every deadline, unit count and policy statement in the product reads a row here and shows its category chip,
// so nothing is stated as law unless it is officially verified. Edited only by the settings.rule action.
import { addDays, addBusinessDays, addHours, OFFICIAL_DAY_TIERS, unitsForDirectMinutes } from './dates.js';

export const CATEGORIES = ['OFFICIAL-VERIFIED', 'PAYER-SPECIFIC', 'HARVEST-REPORTED', 'UNVERIFIED-DEMO-ASSUMPTION'];
// label shown on the chip beside every rule-driven number
export const VERIFICATION = {
  'OFFICIAL-VERIFIED': 'Officially verified',
  'PAYER-SPECIFIC': 'Payer-specific',
  'HARVEST-REPORTED': 'Harvest-reported',
  'UNVERIFIED-DEMO-ASSUMPTION': 'Unverified demo assumption'
};
// chip colour class (the UI kit maps these): g green, b blue, y amber, n neutral
export const VERIFICATION_TONE = { 'OFFICIAL-VERIFIED': 'g', 'PAYER-SPECIFIC': 'b', 'HARVEST-REPORTED': 'y', 'UNVERIFIED-DEMO-ASSUMPTION': 'n' };
export const verificationLabel = cat => VERIFICATION[cat] || 'Unverified demo assumption';

export function rulesTable(s) { return (s && s.rules) || []; }

// rule(s, key, scope?) -> { key, label, value, unit, category, verification, source, verified_on, note, default, enabled, register, scope, missing? }
// A row with a matching scope (a payer id, a service) wins over the unscoped row. A missing key returns {missing:true, value:null}.
export function rule(s, key, scope) {
  const rows = rulesTable(s).filter(r => r.key === key);
  const row = (scope != null && rows.find(r => r.scope === scope)) || rows.find(r => r.scope == null) || rows[0];
  if (!row) return { key, value: null, unit: '', category: 'UNVERIFIED-DEMO-ASSUMPTION', verification: VERIFICATION['UNVERIFIED-DEMO-ASSUMPTION'], source: '', verified_on: null, note: '', default: null, enabled: false, missing: true };
  return { ...row, verification: verificationLabel(row.category) };
}
export const ruleValue = (s, key, fallback, scope) => { const r = rule(s, key, scope); return r.missing || r.value == null ? fallback : r.value; };

// ---- units -------------------------------------------------------------------------------------------------
// Bands [[minutes, units], ...] for a service. Only TDT has a configured set; others fall back to the TDT set.
export function unitBands(s, service) {
  const v = ruleValue(s, 'units.tdt.day_tiers', null);
  return Array.isArray(v) && v.length ? v : OFFICIAL_DAY_TIERS;
}
export function maxUnitsPerDay(s) { return ruleValue(s, 'units.tdt.max_per_day', 3); }
// unitsFor(s, service, minutes): daily units from direct minutes, rounded down, capped at the daily maximum.
export function unitsFor(s, service, minutes) {
  return Math.min(maxUnitsPerDay(s), unitsForDirectMinutes(Math.max(0, Math.floor(+minutes || 0)), unitBands(s, service)));
}
// the minutes a day needs for 1..max units, for labels ("120 min for 1 unit")
export function unitThresholds(s, service) { return unitBands(s, service).map(([m, u]) => ({ minutes: m, units: u })); }

// ---- deadlines ---------------------------------------------------------------------------------------------
// deadline(s, key, from, opts) -> { date, source, verification, category, rule, basis }
// unit: 'days' | 'business_days' | 'hours' (defaults from the rule's unit text). `date` is an ISO date (or date-time for hours).
export function deadline(s, key, from, opts = {}) {
  const r = rule(s, key, opts.scope);
  const n = opts.value != null ? opts.value : r.value;
  const u = opts.unit || (/business/.test(r.unit || '') ? 'business_days' : /hour/.test(r.unit || '') ? 'hours' : 'days');
  let date = null;
  if (from && typeof n === 'number') date = u === 'hours' ? addHours(from.length > 10 ? from : from + 'T00:00', n) : u === 'business_days' ? addBusinessDays(from, n) : addDays(from.slice(0, 10), n);
  return { date, source: r.source, verification: r.verification, category: r.category, rule: r, basis: `${n} ${u.replace('_', ' ')} from ${from || '?'}`, label: r.label, enabled: r.enabled };
}

// "Day N" of a decision clock: N counted from the day it was sent. followup/overdue are the configured days.
export function decisionDay(s, sent, today, payer) {
  if (!sent) return null;
  const d = Math.round((Date.parse(today.slice(0, 10) + 'T00:00Z') - Date.parse(sent.slice(0, 10) + 'T00:00Z')) / 86400000);
  const follow = ruleValue(s, 'decision.followup_day', 10, payer), over = ruleValue(s, 'decision.overdue_after_days', 14, payer);
  return { day: d, followup_day: follow, overdue_after: over, followup_due: d >= follow, overdue: d > over,
    due_date: addDays(sent.slice(0, 10), over), followup_date: addDays(sent.slice(0, 10), follow),
    verification: rule(s, 'decision.overdue_after_days', payer).verification, source: rule(s, 'decision.overdue_after_days', payer).source };
}

// signature mode for a document type: remote_allowed | in_person_required | pending_validation
export function signatureMode(s, doc) { return ruleValue(s, 'signature.mode.' + doc, 'pending_validation'); }
export function isGroupSizeOk(s, n) { return n >= ruleValue(s, 'analytics.min_group_size', 5); }
