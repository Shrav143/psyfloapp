/* Round 13: the time box. A date range with real calendar dates (two native date pickers), shown apart from the dropdown filters
   so the user can tell at a glance that it is about time. Values live in PSY.state.fb[page] like every filter (ISO 'YYYY-MM-DD').

   PSY.fb.dateRange(page, o) → html. o: { kFrom='from', kTo='to', label='Time period', hint, presets:[[key,label,fromISO,toISO]], id,
     compact: true → one row (label · start → end · presets), the hint as a tooltip; for a sticky filter row }
     A preset fills both dates (it is only a shortcut: the two dates are what filters). "Clear" empties both.
   PSY.fb.dates(page, o) → { from: Date|null, to: Date|null, on: bool, text: 'Nov 1 – Nov 30, 2026' }
   PSY.fb.overlaps(page, start, end, o)  true when [start, end] overlaps the chosen range (either side may be open); start/end are
     Date, ISO 'YYYY-MM-DD', 'MM/DD/YYYY' or 'Oct 26' style (year 2026 assumed for Jul–Dec, 2027 for Jan–Jun: the demo's school year).
   PSY.fb.within(page, d, o)  true when one date falls inside the range.
   Acts: fb-date (data-change on each picker), fb-date-preset (data-act on a preset), fb-date-clear. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const FB = PSY.fb;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  /* any of the date shapes the demo uses → a Date at local midnight (null when it cannot be read) */
  const toDate = (v) => {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
    const s = String(v).trim(); let m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s))) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[1] - 1, +m[2]);
    if ((m = /^([A-Z][a-z]{2})[a-z]*\.? (\d{1,2})(?:,? (\d{4}))?/.exec(s))) { const mo = MON.indexOf(m[1]); if (mo < 0) return null; return new Date(m[3] ? +m[3] : mo >= 6 ? 2026 : 2027, mo, +m[2]); }
    return null;
  };
  FB.toDate = toDate; FB.iso = (v) => { const d = toDate(v); return d ? iso(d) : ''; };
  const fmt = (d, y) => MON[d.getMonth()] + ' ' + d.getDate() + (y ? ', ' + d.getFullYear() : '');
  FB.dates = (page, o) => {
    o = o || {}; const kf = o.kFrom || 'from', kt = o.kTo || 'to';
    const from = toDate(FB.get(page, kf, '')), to = toDate(FB.get(page, kt, ''));
    const text = from && to ? fmt(from, from.getFullYear() !== to.getFullYear()) + ' – ' + fmt(to, true) : from ? 'From ' + fmt(from, true) : to ? 'Until ' + fmt(to, true) : 'Any dates';
    if (from && to && from > to) return { from: null, to: null, on: false, bad: true, text: 'Start date is after the end date' }; // round 13: not applied until fixed
    return { from, to, on: !!(from || to), text };
  };
  FB.overlaps = (page, start, end, o) => {
    const r = FB.dates(page, o); if (!r.on) return true;
    const s = toDate(start), e = toDate(end) || s; if (!s && !e) return false;
    if (r.from && e && e < r.from) return false;
    if (r.to && s && s > r.to) return false;
    return true;
  };
  FB.within = (page, d, o) => { const r = FB.dates(page, o); if (!r.on) return true; const x = toDate(d); if (!x) return false; return (!r.from || x >= r.from) && (!r.to || x <= r.to); };

  const CAL = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>';
  FB.dateRange = (page, o) => {
    o = o || {}; const kf = o.kFrom || 'from', kt = o.kTo || 'to';
    const vf = FB.iso(FB.get(page, kf, '')), vt = FB.iso(FB.get(page, kt, '')); const r = FB.dates(page, o);
    const pick = (k, v, lab, min, max) => '<label class="dr-p"><span>' + lab + '</span><input type="date" class="dr-i" data-change="fb-date" data-page="' + esc(page) + '" data-k="' + esc(k) + '" value="' + esc(v) + '"' +
      (min ? ' min="' + esc(min) + '"' : '') + (max ? ' max="' + esc(max) + '"' : '') + ' aria-label="' + esc((o.label || 'Time period') + ' ' + lab.toLowerCase()) + '"></label>';
    const presets = (o.presets || []).map((p) => { const on = vf === (p[2] || '') && vt === (p[3] || '') && (p[2] || p[3]); return '<button type="button" class="dr-ps' + (on ? ' on' : '') + '" data-act="fb-date-preset" data-page="' + esc(page) + '" data-kf="' + esc(kf) + '" data-kt="' + esc(kt) + '" data-f="' + esc(p[2] || '') + '" data-t="' + esc(p[3] || '') + '" aria-pressed="' + !!on + '">' + esc(p[1]) + '</button>'; }).join('');
    if (o.compact) return '<section class="dr c' + (r.on ? ' on' : '') + '" data-psy="date-range" data-page="' + esc(page) + '" aria-label="' + esc(o.label || 'Time period') + '"' + (o.hint ? ' title="' + esc(o.hint) + '"' : '') + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' +
      '<div class="dr-h">' + CAL + '<b>' + esc(o.label || 'Time period') + '</b></div>' + '<div class="dr-r">' + pick(kf, vf, 'Start date', '', vt) + '<span class="dr-to" aria-hidden="true">→</span>' + pick(kt, vt, 'End date', vf, '') + '</div>' +
      (presets ? '<div class="dr-pr">' + presets + '</div>' : '') + (r.bad ? '<p class="dr-bad" data-psy="date-range-bad" role="alert">Start date is after the end date · not applied</p>' : '') + (r.on || r.bad ? '<button type="button" class="dr-x" data-act="fb-date-clear" data-page="' + esc(page) + '" data-kf="' + esc(kf) + '" data-kt="' + esc(kt) + '">Clear</button>' : '') + '</section>';
    return '<section class="dr' + (r.on ? ' on' : '') + '" data-psy="date-range" data-page="' + esc(page) + '" aria-label="' + esc(o.label || 'Time period') + '"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' +
      '<div class="dr-h">' + CAL + '<b>' + esc(o.label || 'Time period') + '</b>' + (r.on || r.bad ? '<button type="button" class="dr-x" data-act="fb-date-clear" data-page="' + esc(page) + '" data-kf="' + esc(kf) + '" data-kt="' + esc(kt) + '">Clear</button>' : '<span class="dr-any">Any dates</span>') + '</div>' +
      '<div class="dr-r">' + pick(kf, vf, 'Start date', '', vt) + '<span class="dr-to" aria-hidden="true">→</span>' + pick(kt, vt, 'End date', vf, '') + '</div>' +
      (presets ? '<div class="dr-pr">' + presets + '</div>' : '') + (r.bad ? '<p class="dr-bad" data-psy="date-range-bad" role="alert">Start date is after the end date · not applied</p>' : '') + (o.hint ? '<p class="dr-hint">' + esc(o.hint) + '</p>' : '') + '</section>';
  };
  const refocus = (page, k) => { const r = PSY.activeRoot(); const n = r && r.querySelector('.dr-i[data-page="' + page + '"][data-k="' + k + '"]'); if (n) n.focus(); };
  PSY.acts['fb-date'] = (el) => { const page = el.getAttribute('data-page'), k = el.getAttribute('data-k'); if (el.value && !/^20\d\d-/.test(el.value)) return; /* typing a year digit by digit passes through 0001…0202: not a date yet */ FB.set(page, k, el.value || ''); PSY.refresh(); refocus(page, k); };
  PSY.acts['fb-date-preset'] = (el) => { const page = el.getAttribute('data-page'); FB.set(page, el.getAttribute('data-kf'), el.getAttribute('data-f') || ''); FB.set(page, el.getAttribute('data-kt'), el.getAttribute('data-t') || ''); PSY.refresh(); };
  PSY.acts['fb-date-clear'] = (el) => { const page = el.getAttribute('data-page'); FB.set(page, el.getAttribute('data-kf'), ''); FB.set(page, el.getAttribute('data-kt'), ''); PSY.refresh(); };

  const CSS = `
  .dr{display:flex;flex-direction:column;gap:7px;background:#EEF4F0;border:1px solid #CFE0D6;border-radius:12px;padding:10px 12px 11px;min-width:0;font-size:12.5px;color:#2E4A40}
  .dr.on{background:#E3EFE8;border-color:#9FC2B0}
  .dr-h{display:flex;align-items:center;gap:7px;color:#1D4F43}
  .dr-h b{font-size:12.5px;font-weight:700;letter-spacing:.01em}
  .dr-any{margin-left:auto;font-size:12px;color:#5E7A6F}
  .dr-x{margin-left:auto;border:0;background:none;padding:0;font:inherit;font-size:12px;font-weight:600;color:#1D4F43;text-decoration:underline;cursor:pointer}
  .dr-r{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
  .dr-p{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:600;color:#4F6B60;min-width:0}
  .dr-i{height:32px;font:inherit;font-size:12.5px;font-weight:500;color:#1B1B19;background:#fff;border:1px solid #BFD5C9;border-radius:8px;padding:0 8px;min-width:0;width:140px}
  .dr-i:focus-visible{outline:2px solid #1D4F43;outline-offset:1px}
  .dr.on .dr-i{border-color:#6E9F88}
  .dr-to{padding-bottom:7px;color:#5E7A6F}
  .dr-pr{display:flex;flex-wrap:wrap;gap:5px}
  .dr-ps{border:1px solid #BFD5C9;background:#fff;border-radius:999px;padding:3px 9px;font:inherit;font-size:11.5px;color:#2E4A40;cursor:pointer}
  .dr-ps:hover{border-color:#6E9F88}.dr-ps.on{background:#1D4F43;border-color:#1D4F43;color:#fff}
  .dr-hint{margin:0;font-size:11.5px;color:#5E7A6F;line-height:1.35}
  .dr-bad{margin:0;font-size:12px;font-weight:600;color:#A3341C}
  .dr.c{flex-direction:row;align-items:center;flex-wrap:wrap;gap:6px 10px;padding:7px 10px}
  .dr.c .dr-p>span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .dr.c .dr-to{padding-bottom:0}.dr.c .dr-r{align-items:center;gap:6px}.dr.c .dr-i{height:30px;width:132px}
  .dr.c .dr-x{margin-left:0}
  `;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
})();
