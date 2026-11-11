// Date helpers shared by the server, the app and the panel. Dates are ISO strings
// ('2026-10-29' or '2026-10-29T14:06'); everything is local story time, no time zones.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parse(iso) {
  if (!iso) return null;
  const [d, t = '00:00'] = String(iso).split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm, ss = 0] = t.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, day, hh || 0, mm || 0, ss || 0));
}
export function iso(dt) { return dt.toISOString().slice(0, 10); }
export function isoTime(dt) { return dt.toISOString().slice(0, 16); }
export function addDays(isoStr, n) { const d = parse(isoStr); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
export function addHours(isoStr, n) { const d = parse(isoStr); d.setUTCHours(d.getUTCHours() + n); return isoTime(d); }
export function isSchoolDay(isoStr) { const w = parse(isoStr).getUTCDay(); return w !== 0 && w !== 6; }
export function addBusinessDays(isoStr, n) {
  let d = isoStr.slice(0, 10); const step = n < 0 ? -1 : 1; let left = Math.abs(n);
  while (left > 0) { d = addDays(d, step); if (isSchoolDay(d)) left--; }
  return d;
}
export function daysBetween(a, b) { return Math.round((parse(b.slice(0, 10)) - parse(a.slice(0, 10))) / 86400000); }
export function businessDaysBetween(a, b) {
  let n = 0, d = a.slice(0, 10); const end = b.slice(0, 10);
  if (d >= end) return 0;
  while (d < end) { d = addDays(d, 1); if (isSchoolDay(d)) n++; }
  return n;
}
export function hoursBetween(a, b) { return (parse(b) - parse(a)) / 3600000; }

export function fmtDate(isoStr, opts = {}) {
  if (!isoStr) return '';
  const d = parse(isoStr);
  let s = `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (opts.dow) s = `${DOW[d.getUTCDay()]} ${s}`;
  if (opts.year) s += `, ${d.getUTCFullYear()}`;
  return s;
}
export function fmtTime(isoStr) {
  if (!isoStr || !String(isoStr).includes('T')) return '';
  const d = parse(isoStr); let h = d.getUTCHours(); const m = d.getUTCMinutes();
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
export function fmtDateTime(isoStr, opts) { const t = fmtTime(isoStr); return fmtDate(isoStr, opts) + (t ? ', ' + t : ''); }
export function fmtUS(isoStr) { const d = parse(isoStr); return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`; }
export function dow(isoStr) { return DOW[parse(isoStr).getUTCDay()]; }
export function mins(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
export function fmtDuration(min) { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; }
export function clock12(hhmm) { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}${ap === 'pm' ? ' pm' : ' am'}`; }

// 3 units per school day when direct time is 5 h or more (brief: units arithmetic)
export function unitsForDirectMinutes(min) { return min >= 300 ? 3 : min >= 180 ? 2 : min >= 60 ? 1 : 0; }
