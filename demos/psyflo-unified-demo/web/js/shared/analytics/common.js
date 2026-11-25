// Analytics: helpers shared by every dataset (pure ESM, imported by the server and the browser).
//
// Every selector in this folder returns  { rows, provenance, asOf, source, ... }  where provenance is one of
//   case_backed      counted from the stored records and the actions people took in this demo
//   harvest_export   the seeded baseline, labelled "Sample data, illustrative" (Harvest never computed it)
//   illustrative     the generated cohort (ids COH-...), a separate demonstration dataset
// One dataset per view, never summed together. A group of fewer than the minimum group size (rule analytics.min_group_size,
// floor 5) is never shown: its cell is { suppressed:true, min } and prints "Fewer than 5". Patient-level rows exist only for
// case-backed data and only for a user who holds analytics.drilldown (see casebacked.membersOf).
import { ruleValue } from '../rules.js';
import { today as clockToday, now as clockNow } from '../clock.js';
import { addDays, daysBetween, parse } from '../dates.js';

export const PROV = { CASE: 'case_backed', EXPORT: 'harvest_export', COHORT: 'illustrative' };
export const PROV_LABEL = { case_backed: 'Case-backed', harvest_export: 'Sample data, illustrative', illustrative: 'Illustrative cohort' };
export const SECTIONS = [['outcomes', 'Patient Outcomes'], ['payer', 'Payer Performance'], ['population', 'Patient Population']];
export const SECTION_IDS = SECTIONS.map(x => x[0]);

// ---------- minimum group size ----------
// The rule is editable in Settings but never below 5: lowering it must not expose small groups.
export const MIN_FLOOR = 5;
export const minN = s => { const v = ruleValue(s, 'analytics.min_group_size', MIN_FLOOR); return Number.isInteger(v) && v > MIN_FLOOR ? v : MIN_FLOOR; };
export const sup = min => ({ suppressed: true, min: min || MIN_FLOOR });
export const isSup = v => !!v && typeof v === 'object' && v.suppressed === true;
// a group of patients (or of people): shown only from the minimum group size up. Zero is not a small group.
export const grp = (n, min) => (n > 0 && n < min ? sup(min) : n);
export const fewer = min => `Fewer than ${min || MIN_FLOOR}`;
// what a cell prints on the screen, in the CSV and in the PDF (one function, so the three agree)
export function cellText(v) {
  if (v == null || v === '') return '—';
  if (isSup(v)) return fewer(v.min);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v);
}
// a statistic over a sample (median, percentage): needs the minimum sample
export const stat = (value, n, min) => (n >= min ? value : sup(min));

export function result(o) {
  if (!Object.values(PROV).includes(o.provenance)) throw new Error('Unknown provenance: ' + o.provenance);
  return { rows: [], asOf: '', source: '', ...o };
}

// ---------- numbers ----------
export const sum = a => a.reduce((x, y) => x + (+y || 0), 0);
export const pct = (n, d) => (d > 0 ? Math.round((100 * n) / d) : null);
export function median(a) { const v = a.filter(x => Number.isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
export function quantile(a, q) { const v = a.filter(x => Number.isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const i = (v.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); }
export const r1 = x => (x == null ? null : Math.round(x * 10) / 10);
export const distinct = a => [...new Set(a)];

// ---------- time (always from the demo clock, never the machine's date) ----------
export const todayOf = s => clockToday(s);
export const nowOf = s => clockNow(s);
export const day = x => String(x || '').slice(0, 10);
export const inRange = (iso, from, to) => { const d = day(iso); return !!d && d >= from && d <= to; };
export const dow = iso => parse(day(iso)).getUTCDay();           // 0 Sun .. 6 Sat
export const weekStart = iso => addDays(day(iso), -((dow(iso) + 6) % 7));   // the Monday
export const monthKey = iso => day(iso).slice(0, 7);
export function monthEnd(key) { const [y, m] = key.split('-').map(Number); const nx = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`; return addDays(nx, -1); }
export function addMonths(key, n) { const [y, m] = key.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
export const isDay = iso => { const w = dow(iso); return w !== 0 && w !== 6; };
export function schoolDays(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) if (isDay(d)) out.push(d); return out; }
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = key => { const [y, m] = key.split('-').map(Number); return MON[m - 1] + ' ' + String(y).slice(2); };
export const hoursBetween = (a, b) => (parse(String(b).length > 10 ? String(b).slice(0, 16) : b + 'T00:00') - parse(String(a).length > 10 ? String(a).slice(0, 16) : a + 'T00:00')) / 3600000;

// ---------- periods ----------
// presets only (a clinical aggregate is computed per preset on the server, see casebacked.digest)
export const PERIODS = [['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['ytd', 'Year to date'], ['all', 'All stored records']];
export const PERIOD_IDS = PERIODS.map(p => p[0]);
export const DEFAULT_PERIOD = '90d';
export function periodOf(today, preset) {
  const p = PERIOD_IDS.includes(preset) ? preset : DEFAULT_PERIOD;
  const to = today;
  const from = p === '30d' ? addDays(today, -29) : p === '90d' ? addDays(today, -89) : p === 'ytd' ? today.slice(0, 4) + '-01-01' : '1900-01-01';
  return { id: p, from, to, label: PERIODS.find(x => x[0] === p)[1], days: p === 'all' ? null : daysBetween(from, to) + 1 };
}
export const normPeriod = x => (PERIOD_IDS.includes(x) ? x : DEFAULT_PERIOD);

// ---------- groups ----------
// Count distinct patients per group. items: [{ id, ...fact }]; keyFn(item) -> a key or an array of keys; labelFn(key) -> text.
// Groups under the minimum are rolled into one row that prints "Fewer than 5" (the label of a small group is not shown either).
// -> { rows:[{ key, label, n, ids? }], hidden: <number of suppressed groups>, total }
export function groupPatients(items, keyFn, o = {}) {
  const m = new Map();
  for (const it of items) {
    const keys = [].concat(keyFn(it)).filter(k => k != null && k !== '');
    for (const k of new Set(keys)) { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(it.id); }
  }
  const min = o.min || MIN_FLOOR;
  let rows = [...m.entries()].map(([key, ids]) => ({ key, label: o.label ? o.label(key) : String(key), n: ids.size }));
  const shown = rows.filter(r => r.n >= min), small = rows.filter(r => r.n < min);
  // complementary suppression: with exactly one hidden group, the scope total minus the shown groups would reveal it, so the smallest shown group is hidden too
  if (small.length === 1 && shown.length && o.complement !== false) { shown.sort((a, b) => a.n - b.n); small.push(shown.shift()); }
  if (o.order) shown.sort((a, b) => o.order.indexOf(a.key) - o.order.indexOf(b.key)); else shown.sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label)));
  return { rows: shown, hidden: small.length, total: new Set(items.map(i => i.id)).size };
}
export const dueRow = (label, extra = {}) => ({ label, ...extra });
