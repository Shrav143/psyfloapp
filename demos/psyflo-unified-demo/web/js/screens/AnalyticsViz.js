// Analytics, the artifact's look (browser only): headline cards, horizontal bars, columns, SVG lines, tiles, feedback blocks and the
// "needs review" signals, all printed from the SAME panels the CSV, the PDF and the question box print (panels.js, payer.js). Nothing here
// computes a figure: a chart is a picture of a panel, and the panel's table stays one click away under "Table". Classes use the an- prefix.
import { esc } from '../runtime.js';
import { ui } from '../ui/index.js';
import { cellText, isSup, PROV } from '../shared/analytics/common.js';
import { MATURITY } from '../shared/maturity.js';

const N = v => (typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?%?$/.test(v) ? parseFloat(v) : null);
const val = v => (isSup(v) ? `<span class="an-sup">${esc(cellText(v))}</span>` : esc(cellText(v)));
const info = p => (p.definition ? ui.infoPopover({ label: `About ${p.title}`, title: p.title, html: `<p>${esc(p.definition)}</p>` }) : '');
const maturity = id => (MATURITY[id] ? ui.maturity(id) : '');
const slug = id => String(id).replace(/\W/g, '-');
const SWATCH = ['an-c0', 'an-c1', 'an-c2', 'an-c3', 'an-c4', 'an-c5'];

// ---------- the card frame ----------
export function card(p, o, inner, k = {}) {
  const prov = p.provenance && p.provenance !== o.dataset ? ui.datasetChip(p.provenance) : '';
  const sub = k.sub ? `<span class="an-card__sub">${esc(k.sub)}</span>` : '';
  const n = p.n && typeof p.n === 'number' ? `<span class="an-card__sub">n = ${p.n}</span>` : '';
  return `<section class="an-card${k.cls ? ' ' + k.cls : ''}" id="p-${esc(slug(p.id))}" aria-label="${esc(p.title)}"><header class="an-card__h"><h3>${esc(k.title || p.title)}</h3>${sub || n}${p.maturity ? maturity(p.maturity) : ''}${prov}<span class="ui-sp"></span>${k.actions || ''}${info(p)}</header>${inner}${p.note ? `<p class="an-note">${esc(p.note)}</p>` : ''}</section>`;
}
const empty = p => `<p class="an-empty">${esc(p.empty || 'Nothing to show.')}</p>`;

// ---------- a table (the default view of a panel, and the "Table" disclosure under a chart) ----------
export function table(p, o = {}) {
  const cols = p.columns || []; const rows = p.rows || [];
  const size = o.size || 10; const page = rows.length > 10 ? Math.min(Math.max(1, o.page || 1), Math.ceil(rows.length / size)) : 1;
  const shown = rows.length > 10 ? ui.pager.slice(rows, { size, page }) : rows;
  const th = cols.map(c => `<th scope="col" class="${c.align === 'right' ? 'is-r' : ''}">${esc(c.label)}</th>`).join('');
  const td = (r, c, ci) => {
    const v = r[c.key]; let inner = isSup(v) ? `<span class="an-sup" title="${esc(cellText(v))}: not shown to protect small groups">${esc(cellText(v))}</span>` : esc(cellText(v));
    const d = (r._drills && r._drills[c.key]) || (c.key === 'n' ? r._drill : null);
    if (d && o.drill && typeof v === 'number' && v > 0) inner = `<button type="button" class="a-drill" data-x="drill" data-p="${esc(d.p)}" data-k="${esc(d.k)}" aria-label="Show the patients: ${esc(r.label)}, ${v}">${inner}</button>`;
    else if (ci === 0 && r._route && o.href) inner = `<a href="${esc(o.href(r._route))}">${inner}</a>`;
    if (c.key === 'src' && r._rule && o.rule) inner = o.rule(r._rule, r._payer);
    return `<td class="${c.align === 'right' ? 'is-r ui-num' : ''}${r._small ? ' a-small' : ''}">${inner}</td>`;
  };
  const body = shown.map(r => `<tr class="${r._total ? 'a-total' : ''}${r._past ? ' a-past' : ''}">${cols.map((c, ci) => td(r, c, ci)).join('')}</tr>`).join('');
  if (!rows.length) return empty(p);
  const pager = rows.length > 10 ? ui.pager({ id: 'anp-' + slug(p.id), total: rows.length, size, page, noun: 'rows', url: false, defaultSize: 10, label: `${p.title} pages`, onChange: ch => o.onPage && o.onPage(p.id, ch) }) : '';
  return `<div class="a-scroll" role="region" aria-label="${esc(p.title)}" tabindex="0"><table class="a-tbl"><caption class="ui-sr">${esc(p.title)}</caption><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>${pager}`;
}
export const tableCard = (p, o, k = {}) => card(p, o, table(p, { ...o, ...(o.pgOf ? o.pgOf(p.id) : {}) }), k);
export const disclosure = (p, o, label) => (p.rows && p.rows.length ? `<details class="an-td"><summary>${esc(label || 'Table')}</summary>${table(p, { ...o, ...(o.pgOf ? o.pgOf(p.id) : {}) })}</details>` : '');

// ---------- headline cards ----------
export function kpis(p, o) {
  if (!p) return '';
  const cards = (p.rows || []).map(r => `<article class="an-kpi${r.tone === 'warn' ? ' an-kpi--warn' : ''}"><h3 class="an-kpi__l">${esc(r.label)}</h3><div class="an-kpi__v ui-num">${val(r.value)}</div><p class="an-kpi__s">${esc(r.sub || '')}</p></article>`).join('');
  return `<section class="an-kpis" aria-label="${esc(p.title)}">${cards}</section><p class="an-kpis__n">${o.dataset ? ui.datasetChip(p.provenance || o.dataset) : ''}<span>${esc(p.definition ? 'Every figure counts patients or requests; a group under 5 is never shown.' : '')}</span>${info(p)}</p>${disclosure(p, o)}`;
}
// tiles: a small summary (data completeness, units, population summary)
export function tiles(p, o, k = {}) {
  const rows = (p.rows || []).map(r => {
    if (k.completeness) { const n = r.n, w = r.without; const ok = typeof n === 'number' && typeof w === 'number'; return `<div class="an-tile"><h4>${esc(r.label)}</h4><b class="ui-num">${ok ? esc(n + w ? Math.round((100 * n) / (n + w)) + '%' : '—') : val(isSup(n) ? n : isSup(w) ? w : '—')}</b><small>${ok ? `${n} of ${n + w}` : 'A group under 5 is not shown'}</small></div>`; }
    const v = r.value !== undefined ? r.value : r.v !== undefined ? r.v : r.n;
    return `<div class="an-tile"><h4>${esc(r.label)}</h4><b class="ui-num">${val(v)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`;
  }).join('');
  return card(p, o, `<div class="an-tiles">${rows}</div>${disclosure(p, o)}`, k);
}

// ---------- horizontal bars ----------
export function hbars(p, o, k = {}) {
  const rows = p.rows || []; if (!rows.length) return card(p, o, empty(p), k);
  const key = k.key || 'n'; const total = p.total && typeof p.total.n === 'number' ? p.total.n : null;
  const max = Math.max(1, ...rows.map(r => (N(r[key]) || 0)));
  const bars = rows.map(r => {
    const v = r[key]; const x = N(v);
    if (x == null && !isSup(v)) return `<li class="an-hb an-hb--sum"><span class="an-hb__l">${esc(r.label)}</span><b class="ui-num">${esc(cellText(v))}</b></li>`;
    const text = isSup(v) ? val(v) : k.pct && total ? `${esc(String(x))} <small>${Math.round((100 * x) / total)}%</small>` : esc(cellText(v));
    const extra = k.rowSub ? `<small class="an-hb__s">${esc(k.rowSub(r))}</small>` : '';
    const d = (r._drills && r._drills[key]) || (key === 'n' ? r._drill : null);
    const shown = d && o.drill && typeof x === 'number' && x > 0 ? `<button type="button" class="a-drill" data-x="drill" data-p="${esc(d.p)}" data-k="${esc(d.k)}" aria-label="Show the patients: ${esc(r.label)}, ${x}">${text}</button>` : text;
    const lab = r._route && o.href ? `<a href="${esc(o.href(r._route))}">${esc(r.label)}</a>` : esc(r.label);
    return `<li class="an-hb${r._small ? ' an-hb--small' : ''}"><span class="an-hb__l" title="${esc(r.label)}">${lab}</span><span class="an-hb__t" aria-hidden="true"><i style="width:${x == null ? 0 : Math.max(2, Math.round((x / max) * 100))}%"></i></span><span class="an-hb__v ui-num">${shown}${extra}</span></li>`;
  }).join('');
  const tot = p.total ? `<p class="an-card__foot">${esc(p.total.label || 'In scope')}: <b class="ui-num">${val(p.total.n)}</b></p>` : '';
  return card(p, o, `<ul class="an-hbs">${bars}</ul>${tot}${k.table === false ? '' : disclosure(p, o)}${k.after || ''}`, k);
}

// ---------- columns (one group per month) ----------
export function vcols(p, o, k = {}) {
  const keys = k.keys || (p.chart && p.chart.keys) || []; const rows = p.rows || [];
  const labels = k.labels || keys.map(x => (p.columns.find(c => c.key === x) || {}).label || x);
  if (!rows.length || !rows.some(r => keys.some(c => N(r[c]) > 0))) return card(p, o, empty({ empty: p.empty || 'Nothing to chart for this period.' }), k);
  const max = Math.max(1, ...rows.flatMap(r => keys.map(c => N(r[c]) || 0)));
  const cols = rows.map(r => `<div class="an-vc"><div class="an-vc__g">${keys.map((c, j) => { const v = r[c]; const x = N(v);
    return `<div class="an-vc__b"><span class="an-vc__n ui-num">${isSup(v) ? '&lt;5' : x == null ? '' : esc(String(x))}</span><i class="${SWATCH[j]}" style="height:${x ? Math.max(3, Math.round((x / max) * 120)) : 0}px"></i></div>`; }).join('')}</div><small>${esc(r.label)}</small></div>`).join('');
  const legend = `<ul class="an-leg">${labels.map((l, j) => `<li><i class="${SWATCH[j]}"></i>${esc(l)}</li>`).join('')}</ul>`;
  return card(p, o, `${k.chips || ''}<div class="an-vcols" role="img" aria-label="${esc(p.title)}: ${esc(labels.join(', '))} by month. The table below lists every value.">${cols}</div>${legend}${disclosure(p, o)}`, k);
}

// ---------- SVG lines ----------
export function linesSvg(cols, rows, o = {}) {
  const series = cols.filter(c => c.key !== 'label'); const W = 900, H = 280, L = 48, R = 16, T = 14, B = 30;
  const vals = rows.flatMap(r => series.map(c => N(r[c.key]))).filter(x => x != null); if (!vals.length) return '';
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals); const raw = (mx - mn || 1) / 4; const pw = 10 ** Math.floor(Math.log10(raw)); const step = [1, 2, 2.5, 5, 10].map(m => m * pw).find(v => v >= raw);
  const lo = Math.floor(mn / step) * step, hi = Math.max(Math.ceil(mx / step) * step, lo + step);
  const x = i => L + (rows.length > 1 ? (i * (W - L - R)) / (rows.length - 1) : (W - L - R) / 2), y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const unit = o.unit || ''; const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="an-gl"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}${unit}</text>`).join('');
  const zero = lo < 0 && hi > 0 ? `<line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="an-gz"/>` : '';
  const xl = rows.map((r, i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text>`).join('');
  const lines = series.map((c, j) => { let d = '', pen = false; const dots = [];
    rows.forEach((r, i) => { const v = N(r[c.key]); if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; dots.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" class="an-dt${j}"/>`); });
    return `<path d="${d}" class="an-ln an-ln${j}"/>${dots.join('')}`; }).join('');
  return `<svg class="an-lines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(o.label || 'Line chart')}. The table below lists every value.">${grid}${zero}${xl}${lines}</svg>`;
}
const legendOf = (cols, ns) => `<ul class="an-leg">${cols.filter(c => c.key !== 'label').map((c, j) => { const n = (ns || []).find(x => x.label === c.label); return `<li><i class="${SWATCH[j]}"></i>${esc(c.label)}${n ? ` <small>n = ${n.n}</small>` : ''}</li>`; }).join('')}</ul>`;

// "Outcomes over time": metric chips switch between the score lines and the behavior lines
export function trend(P, o, st) {
  const sc = P['out.trend'], bh = P['out.func']; if (!sc && !bh) return '';
  const hasScores = sc && sc.rows && sc.rows.length > 1 && sc.columns.length > 1; const hasBeh = bh && bh.rows && bh.rows.some(r => N(r.inc) > 0 || N(r.off) > 0);
  const cur = st === 'behavior' && hasBeh ? 'behavior' : hasScores ? 'scores' : hasBeh ? 'behavior' : 'scores';
  const chip = (v, l, on) => `<button type="button" class="an-chip" data-x="om" data-v="${v}" aria-pressed="${cur === v}"${on ? '' : ' disabled'}>${l}</button>`;
  const chips = `<div class="an-chips" role="group" aria-label="Measure shown">${chip('scores', 'Assessment scores', hasScores)}${chip('behavior', 'Behavior and school', hasBeh)}</div>`;
  const p = cur === 'scores' ? sc : bh; if (!p) return '';
  const cols = cur === 'scores' ? p.columns : [{ key: 'label' }, ...p.columns.filter(c => c.key !== 'label' && p.rows.some(r => N(r[c.key]) != null))];
  const body = cur === 'scores' && !hasScores ? empty(p) : `${linesSvg(cols, p.rows, { unit: cur === 'scores' ? '%' : '', label: cur === 'scores' ? 'Average percent change from the first reading, by scale' : 'Incidents and office referrals by month' })}${legendOf(cols, p.n)}`;
  return card(p, o, `${chips}${body}${disclosure(p, o)}`, { title: 'Outcomes over time', sub: cur === 'scores' ? 'Average % change from the first reading (lower is better)' : 'Incidents and office referrals by month', cls: 'an-card--wide' });
}

// ---------- treatment feedback: one block per source ----------
const FB_BADGE = { Patient: 'Patient-reported', Caregiver: 'Caregiver-reported', Teacher: 'Teacher-observed', 'School staff': 'School-observed', Clinician: 'Clinician-observed' };
export function feedback(p, o) {
  const rows = p.rows || []; if (!rows.length) return card(p, o, empty(p), { title: 'Treatment Feedback & Engagement' });
  const blocks = rows.map(r => r._small ? `<div class="an-fb"><h4>${esc(r.label)}</h4><p class="an-muted">Fewer than 5 patients. Not shown.</p></div>`
    : `<div class="an-fb"><h4>${esc(r.label)} feedback</h4><span class="an-badge">${esc(FB_BADGE[r.label] || 'Reported')}</span><dl><div><dt>Typical answer</dt><dd class="ui-num">${val(r.view)}</dd></div><div><dt>Responses</dt><dd class="ui-num">${val(r.resp)}</dd></div><div><dt>Patients</dt><dd class="ui-num">${val(r.n)}</dd></div></dl></div>`).join('');
  return card(p, o, `${blocks}<p class="an-note">Patient-reported and caregiver-reported information is labelled separately from clinician observations. Satisfaction is not treated as evidence of clinical improvement.</p>${disclosure(p, o)}`, { title: 'Treatment Feedback & Engagement' });
}

// ---------- needs review: the signals as pills, buttons for a clinician ----------
export function review(p, o) {
  const rows = p.rows || []; const lock = !o.drill;
  const pills = rows.length ? rows.map(r => {
    const inner = `<span>${esc(r.label)}</span><b class="ui-num">${val(r.n)}</b>`;
    return o.drill && r._drill && typeof r.n === 'number' ? `<button type="button" class="an-pill an-pill--b" data-x="drill" data-p="${esc(r._drill.p)}" data-k="${esc(r._drill.k)}" aria-label="Show the patients: ${esc(r.label)}, ${r.n}">${inner}</button>` : `<span class="an-pill">${inner}</span>`;
  }).join('') : '';
  const restricted = lock ? `<p class="an-restricted">${ui.chip('Restricted · clinical access', { tone: 'neutral', icon: 'lock' })}</p><p class="an-muted">Named patients appear here with clinical-records access. Without it, only the counts above are shown.</p>` : `<p class="an-muted">Choose a signal to see the patients behind it.</p>`;
  return card(p, o, `${pills ? `<div class="an-pills">${pills}</div>` : empty(p)}${restricted}${disclosure(p, o)}`, { title: 'Patients requiring review', sub: 'Workflow signals, not clinical decisions' });
}
export function timeline(o) {
  const body = o.prov === PROV.COHORT ? `<p class="an-muted">The generated cohort has no patient-level records, so there is no timeline to open.</p>`
    : o.drill ? `<p class="an-muted">Patient-level timelines show clinical content. Open one patient over time from your caseload.</p><p><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-e="child" data-x="child">One patient over time</button></p>`
      : `<p class="an-restricted">${ui.chip('Restricted · clinical access', { tone: 'neutral', icon: 'lock' })}</p><p class="an-muted">Patient-level timelines show clinical content and are available with clinical-records access. Aggregates on this page remain visible.</p>`;
  return `<section class="an-card an-card--wide" aria-label="Patient progress timeline"><header class="an-card__h"><h3>Patient progress timeline</h3></header>${body}</section>`;
}

// ---------- insights ----------
export function insights(p, o) {
  const rows = p.rows || []; const can = o.canDI;
  const items = rows.map(r => `<div class="an-insight"><p><b>${esc(r.text)}</b></p><p class="an-muted">Supporting figures: ${esc(r.support)}</p>${can && r._go ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(o.href({ id: 'DenialIntelligence', params: r._payer ? { payer: r._payer } : {} }))}">Investigate in Denial Intelligence</a>` : ''}</div>`).join('');
  return card(p, o, (items || empty(p)) + disclosure(p, o), { sub: rows.length ? `${rows.length} pattern${rows.length === 1 ? '' : 's'}` : '', cls: 'an-card--wide' });
}
