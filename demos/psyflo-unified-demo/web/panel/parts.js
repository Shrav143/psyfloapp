// Panel fragments shared by the views (E5). Every function returns an HTML string; the caller escapes nothing twice:
// text arguments are escaped here, arguments named `html` are trusted markup.
import { esc } from '../js/runtime.js';
import { fmtDate } from '../js/shared/dates.js';
import { ui } from '../js/ui/index.js';

const svg = (stroke, body, size = 16, extra = '') => `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" ${extra}>${body}</svg>`;
export const I = {
  ok: svg('#217A78', '<circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path>'),
  warn: svg('#6F4A05', '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>'),
  no: svg('#8A2E1C', '<circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path>'),
  open: svg('#5A544B', '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle>'),
  mic: svg('currentColor', '<rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0014 0M12 18v3"></path>', 18, 'stroke-width="2"'),
  clock: svg('currentColor', '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', 18, 'stroke-width="2"'),
  spark: svg('currentColor', '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"></path>', 18, 'stroke-width="2"'),
  doc: svg('currentColor', '<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path>', 18, 'stroke-width="2"'),
  scan: svg('currentColor', '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"></path><path d="M8 12h8"></path>', 20, 'stroke-width="2"'),
  lock: svg('currentColor', '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 018 0v3"></path>', 16, 'stroke-width="2"'),
  back: svg('currentColor', '<path d="M15 6l-6 6 6 6"></path>', 16, 'stroke-width="2.4"')
};

export const chip = (text, tone = 'n', extra = '') => `<span class="chip ${tone}"${extra}>${esc(text)}</span>`;

// a status line: kind '' (green, done) | 'y' (amber) | 'r' (red) | 'n' (neutral) | 'b' (blue); the icon follows the kind
export function banner(kind, html, { icon } = {}) {
  const ic = icon || (kind === 'r' ? I.no : kind === 'y' ? I.warn : kind === 'n' ? I.open : I.ok);
  return `<div class="banner ${kind || ''}">${ic}<div>${html}</div></div>`;
}
export const tile = (html, { top = false } = {}) => `<div class="tile${top ? ' t' : ''}">${html}</div>`;
export const lab = t => `<div class="lab">${esc(t)}</div>`;

// one check row. A check with nothing to check ("applicable:false") reads "Not applicable", never a pass.
export function chk(c) {
  const na = c.applicable === false;
  return `<div class="ck">${na ? I.open : c.pass ? I.ok : I.no}<div><b>${esc(c.rule)}</b>${na ? ' — not applicable' : c.detail ? ' — ' + esc(c.detail) : ''}${c.fixed ? ` <span class="fx">fixed: ${esc(c.fixed)}</span>` : ''}</div></div>`;
}
export function accordion(title, bodyHtml, { open = false, count = '', id = '' } = {}) {
  return `<details class="acc"${open ? ' open' : ''}${id ? ` data-acc="${esc(id)}"` : ''}><summary><span>${esc(title)}</span>${count !== '' ? `<span class="chip n">${esc(count)}</span>` : ''}</summary><div>${bodyHtml}</div></details>`;
}
// "Checks · 7 of 7 pass" collapsed; opens by itself when one fails
export function checksBlock(checks, title = 'Checks') {
  const live = checks.filter(c => c.applicable !== false); const pass = live.filter(c => c.pass).length;
  return accordion(title, checks.map(chk).join(''), { open: pass < live.length, count: `${pass} of ${live.length} pass` });
}

// evidence chips for a box: each source number resolves to a stored record. sources: [{ n, label, date, quote, source, href }]
export function srcChips(box, sources = []) {
  return (box.src || []).map(n => {
    const s = sources.find(x => x.n === n) || {};
    return ui.evidenceChip({ n, label: String(s.label || 'source').split('·')[0].trim(), date: s.date ? fmtDate(s.date) : '', quote: s.quote || box.value, source: s.source || s.label || '', href: s.href });
  }).join('');
}
// a box with its sources; a missing box prints the "Evidence missing" chip instead of a source
export function boxRow(b, sources, { state = '' } = {}) {
  const missing = b.missing || /^Evidence missing/.test(b.value || '');
  return `<div class="box"><div class="row w"><span class="l" style="flex:1">${esc(b.label)}</span>${state}</div><div class="v${missing ? ' muted' : ''}">${esc(b.value)}</div>${missing ? ui.evidenceChip({ state: 'missing', label: b.label }) : srcChips(b, sources)}</div>`;
}
// the legend that stays in every header (BRIEF rule 8)
export const legend = () => '<div class="legend"><span>green · already in Lauris</span><span>yellow · Psyflo typed, check it</span></div>';

export const SAMPLE_CHIP = () => ui.chip('Illustrative sample', { tone: 'warning', size: 'sm', icon: 'info', title: 'Seeded demo text. It is not built from this student\'s stored notes.' });
export const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
export const usDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
export const money = n => String(n);

export const FORM_NAME = { screening: 'Admission screening', cna: 'Intake (CNA)', isp: 'Treatment plan (ISP)', dpn: 'Daily progress note', weekly: 'Weekly guardian contact', collateral: 'Monthly collateral', quarterly: 'Quarterly report', incident: 'Incident report', 'sra-initial': 'Initial request (SRA)', 'sra-continued': 'Continued stay', discharge: 'Discharge summary', 'new-consumer': 'New consumer', survey: 'Assessment' };
