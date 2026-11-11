// HTML fragments for the Analytics screen (browser only). Each returns a string for raw(). Classes use the a- prefix; the kit does the rest.
import { esc } from '../runtime.js';
import { ui } from '../ui/index.js';
import { cellText, isSup, PROV } from '../shared/analytics/common.js';
import { MATURITY } from '../shared/maturity.js';

const maturity = id => ui.maturity(id);

// a panel: heading, definition behind "i", the table, an optional bar chart, a one-line note
export function renderPanel(p, o = {}) {
  const cols = p.columns || []; const rows = p.rows || []; const limit = p.limit || 0; const open = !!(o.open && o.open[p.id]);
  const shown = limit && !open ? rows.slice(0, limit) : rows;
  const th = cols.map(c => `<th scope="col" class="${c.align === 'right' ? 'is-r' : ''}">${esc(c.label)}</th>`).join('');
  const td = (r, c, ci) => {
    const v = r[c.key]; let inner = isSup(v) ? `<span class="a-sup" title="${esc(cellText(v))}: not shown to protect small groups">${esc(cellText(v))}</span>` : esc(cellText(v));
    const d = (r._drills && r._drills[c.key]) || (c.key === 'n' ? r._drill : null);
    if (d && o.drill && typeof v === 'number' && v > 0) inner = `<button type="button" class="a-drill" data-x="drill" data-p="${esc(d.p)}" data-k="${esc(d.k)}" aria-label="Show the patients: ${esc(r.label)}, ${v}">${inner}</button>`;
    else if (ci === 0 && r._route && o.href) inner = `<a href="${esc(o.href(r._route))}">${inner}</a>`;
    if (c.key === 'src' && r._rule && o.rule) inner = o.rule(r._rule, r._payer);
    return `<td class="${c.align === 'right' ? 'is-r ui-num' : ''}${r._small ? ' a-small' : ''}">${inner}</td>`;
  };
  const body = shown.map(r => `<tr class="${r._total ? 'a-total' : ''}${r._past ? ' a-past' : ''}">${cols.map((c, ci) => td(r, c, ci)).join('')}</tr>`).join('');
  const more = limit && rows.length > limit ? `<button type="button" class="ui-linkbtn a-more" data-x="more" data-p="${esc(p.id)}" aria-expanded="${open}">${open ? 'Show fewer' : `Show all ${rows.length}`}</button>` : '';
  const table = rows.length ? `<div class="a-scroll" role="region" aria-label="${esc(p.title)}" tabindex="0"><table class="a-tbl"><caption class="ui-sr">${esc(p.title)}</caption><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>${more}` : `<p class="a-empty">${esc(p.empty || 'Nothing to show.')}</p>`;
  const chart = rows.length && p.chart && p.chart.type === 'months' ? bars(p) : '';
  const prov = p.provenance && p.provenance !== o.dataset ? ui.datasetChip(p.provenance) : '';
  return `<section class="a-card${p.wide ? ' a-card--wide' : ''}" id="p-${esc(p.id.replace(/\W/g, '-'))}" aria-label="${esc(p.title)}"><header class="a-card__h"><h3>${esc(p.title)}</h3>${p.maturity ? maturity(p.maturity) : ''}${prov}<span class="ui-sp"></span>${p.definition ? ui.infoPopover({ label: `About ${p.title}`, title: p.title, html: `<p>${esc(p.definition)}</p>` }) : ''}</header>${table}${chart}${p.note ? `<p class="a-note">${esc(p.note)}</p>` : ''}</section>`;
}
function bars(p) {
  const keys = p.chart.keys; const vals = p.rows.map(r => keys.map(k => (typeof r[k] === 'number' ? r[k] : 0)));
  const max = Math.max(1, ...vals.flat()); if (!vals.flat().some(v => v > 0)) return '';
  return `<div class="a-bars" aria-hidden="true">${p.rows.map((r, i) => `<div class="a-bar"><div class="a-bar__s">${keys.map((k, j) => `<i class="a-b${j}" style="height:${Math.round((vals[i][j] / max) * 56)}px"></i>`).join('')}</div><small>${esc(r.label)}</small></div>`).join('')}</div>`;
}

// the definitions of the six measures (opened from the "?" in the scorecard header)
export function measureDefinitions(sc) {
  return sc.rows.map(r => `<h4 style="margin:16px 0 0">${esc(r.no + '. ' + r.label)}</h4><dl class="a-def"><dt>Numerator</dt><dd>${esc(r.numerator || '')}</dd><dt>Denominator</dt><dd>${esc(r.denominator || '')}</dd><dt>Source</dt><dd>${esc(r.source)}</dd><dt>Read by</dt><dd>${esc(r.reads)}</dd><dt>Limits</dt><dd>${esc(r.limits)}</dd>${r.rules && r.rules.length ? `<dt>Rules used</dt><dd>${r.rules.map(x => `${esc(x.label)}: ${esc(x.value)} ${esc(x.unit || '')} ${ui.sourceChip({ category: x.category, source: x.source })}`).join('<br>')}</dd>` : ''}</dl>`).join('');
}
// the pilot scorecard: six measures, each a button that opens its detail; one "?" opens every definition
export function renderScorecard(sc, o = {}) {
  const tiles = sc.rows.map(r => `<li class="a-tile${r.unavailable ? ' is-off' : ''}"><div class="a-tile__t"><span>${esc(r.label)}</span></div>
      <button type="button" class="a-tile__b" data-x="measure" data-id="${esc(r.id)}" aria-label="${esc(r.label)}: ${esc(r.headline)}. ${esc(r.note)}. Details"><b class="ui-num">${esc(r.headline)}</b><small>${esc(r.note)}</small></button></li>`).join('');
  return `<section class="a-score" aria-labelledby="a-score-h"><div class="a-score__h"><h2 id="a-score-h">Pilot scorecard</h2>${maturity('analytics.scorecard')}<span class="a-muted">${esc(o.periodLabel || '')}</span><button type="button" class="ui-infobtn" data-x="defs" aria-haspopup="dialog">${ui.icon('info', 14)}<span class="ui-sr">Definitions of the six measures</span></button></div><ul class="a-tiles">${tiles}</ul></section>`;
}

// a detail list: label and value rows, an optional link per row
export function renderList(rows, href) {
  if (!rows || !rows.length) return '';
  return `<ul class="a-list">${rows.map(r => `<li><span>${r.route && href ? `<a href="${esc(href(r.route))}">${esc(r.label)}</a>` : esc(r.label)}</span><b class="${r.tone === 'warn' ? 'a-warn' : ''}">${esc(r.value)}</b></li>`).join('')}</ul>`;
}
export function renderBreakdown(rows) {
  if (!rows || !rows.length) return '';
  return `<dl class="a-def a-def--rows">${rows.map(r => `<div><dt>${esc(r.label)}</dt><dd class="ui-num">${esc(r.value)}</dd></div>`).join('')}</dl>`;
}
export { PROV, MATURITY };
