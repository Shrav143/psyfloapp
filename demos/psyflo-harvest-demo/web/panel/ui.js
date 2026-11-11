// Pure HTML helpers for the panel frame (no state): header, legend, state card pieces, boxes list, checks line, footer.
import { esc } from '../js/runtime.js';
import { helpIcon } from '../js/help.js';
import { HELP, PART } from '../js/shared/labels.js';
import { fmtDate } from '../js/shared/dates.js';

export { esc, helpIcon, HELP, PART };

const svg = (cls, body, size = 16, sw = 2.2) => `<svg class="ico ${cls}" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const I = {
  ok: svg('ok', '<circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path>'),
  warn: svg('warn', '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>'),
  no: svg('no', '<circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path>'),
  open: svg('open', '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle>'),
  tick: svg('ok', '<path d="M5 12l4 4 10-10"></path>', 14, 2.6),
  mic: svg('', '<rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0014 0M12 18v3"></path>', 18, 2),
  chev: svg('open', '<path d="M6 9l6 6 6-6"></path>', 14, 2.4),
  up: svg('open', '<path d="M6 15l6-6 6 6"></path>', 14, 2.4),
  lock: svg('no', '<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 018 0v3"></path>', 14, 2)
};

export const chip = (text, kind = 'n') => `<span class="chip ${kind}">${esc(text)}</span>`;
export const sevKind = sev => ({ r: 'r', y: 'y', n: 'n', g: 'g', ok: 'g' }[sev] || 'n');
export const help = (key, about) => helpIcon(HELP[key], about);

// ---- frame: header (logo, "Form · Student", one status chip or one link), legend, body, optional sticky footer
export function frame({ logo, form, student, chip: ch, link, legend = true, body, footer = '', demo = true }) {
  const title = student ? `${esc(form)} <span class="sep"></span> <span class="st">${esc(student)}</span>` : esc(form);
  const right = link ? `<a class="ol" href="#" data-act="openApp" data-href="${esc(link.href)}">${esc(link.text)}</a>` : ch ? chip(ch[0], ch[1]) : '';
  const lg = legend ? `<div class="legend"><span class="lg g"><b>green</b> <span class="sep"></span> in Lauris</span><span class="lg y"><b>yellow</b> <span class="sep"></span> Psyflo typed</span>${help('legend', 'the legend')}</div>` : '';
  return `<div class="ph"><span class="logo">${logo || ''}</span><div class="pt">${title}</div>${right}</div>${lg}<div class="body">${body}</div>${demo ? '<div class="foot">Demo data · nothing is real</div>' : ''}${footer ? `<div class="pf">${footer}</div>` : ''}`;
}

export const flashLine = f => f ? `<div class="fl ${f.kind === 'r' ? 'r' : f.kind === 'y' ? 'y' : ''}" role="status">${f.kind === 'r' ? I.no : I.ok}<div>${esc(f.msg)}</div></div>` : '';

// ---- numbered source chips: <i>1</i><i>2</i> with the source label as a tooltip
export const srcNums = (src, sources = []) => (src && src.length) ? `<span class="cs">${src.map(n => { const s = sources.find(x => x.n === n); return `<i title="${esc(s ? s.label + (s.date ? ' · ' + fmtDate(s.date) : '') : 'Source ' + n)}">${n}</i>`; }).join('')}</span>` : '';
const srcList = (src, sources = []) => (src && src.length) ? `<div class="bx-s">${src.map(n => { const s = sources.find(x => x.n === n); return `<div><b>${n}</b><span data-doc>${esc(s ? s.label : 'Source')}${s && s.date ? ' · ' + esc(fmtDate(s.date)) : ''}</span></div>`; }).join('')}</div>` : '';

// ---- one box row: label, drafted text (one line, data-doc) with numbered chips; expand to edit (textarea) when editable
// b = { k, label, value, src, state: 'y'|'g'|'', ro, tag, note, why }
export function boxRow(b, { form, sources, open, edited, cur }) {
  const v = b.value ?? ''; const st = b.state || '';
  const tip = st === 'y' ? 'Psyflo typed this · check it' : st === 'g' ? 'Already in Lauris' : '';
  const body = open
    ? `<div class="bx-e">${b.ro ? `<div class="bx-s"><div><span data-doc>${esc(v)}</span></div></div>` : `<textarea class="ed" data-doc aria-label="${esc(b.label)}" data-in="boxEdit" data-f="${esc(form)}" data-k="${esc(b.k)}">${esc(v)}</textarea>`}${b.why ? `<div class="bx-s"><div class="why" data-doc>${esc(b.why)}</div></div>` : ''}${srcList(b.src, sources)}${edited && !b.ro ? `<div><button type="button" class="btn t s" data-act="boxReset" data-f="${esc(form)}" data-k="${esc(b.k)}">Reset</button></div>` : ''}</div>`
    : '';
  return `<div class="bx ${st}${cur ? ' cur' : ''}"${tip ? ` title="${esc(tip)}"` : ''}><button type="button" class="bx-h" aria-expanded="${open ? 'true' : 'false'}" data-act="boxOpen" data-f="${esc(form)}" data-k="${esc(b.k)}"><span class="bx-l" title="${esc(b.label)}">${esc(b.short || b.label)}</span><span class="bx-r">${b.tag ? chip(b.tag, b.tagKind || 'n') : ''}${(b.tags || []).map(x => chip(x, 'n')).join('')}${open ? I.up : I.chev}</span>${open ? '' : `<span class="bx-v" data-doc><span class="tx${v ? '' : ' m'}">${esc(v || b.empty || '')}</span>${srcNums(b.src, sources)}</span>`}</button>${body}${b.extra || ''}</div>`;
}
export const boxList = rows => `<div class="bl">${rows.join('')}</div>`;

// ---- documentation / pre-submission checks: one collapsed line "<name> n of n ✓"; below full, failing checks sit on top in watch color
const chkText = c => `<b>${esc(c.rule)}</b>${c.detail ? ` <span data-doc>${esc(c.detail)}</span>` : ''}${c.fixed ? ` <span class="fx" data-doc>fixed: ${esc(c.fixed)}</span>` : ''}`;
export function checksLine(checks, { name = PART.docChecks, open = false, tip = true } = {}) {
  if (!checks || !checks.length) return '';
  const ok = checks.filter(c => c.pass).length; const bad = checks.filter(c => !c.pass); const full = bad.length === 0;
  const head = `<div class="cl"><button type="button" class="tg${full ? '' : ' w'}" aria-expanded="${open ? 'true' : 'false'}" data-act="checksToggle"><span>${esc(name)}</span><span class="n">${ok} of ${checks.length}${full ? I.tick : ''}</span></button>${tip ? help('checks', 'the checks') : ''}</div>`;
  const rows = [...bad.map(c => `<div class="ckr w">${I.warn}<div>${chkText(c)}</div></div>`), ...(open ? checks.filter(c => c.pass).map(c => `<div class="ckr">${I.ok}<div>${chkText(c)}</div></div>`) : [])];
  return `<div>${head}${rows.join('')}</div>`;
}

// ---- state card
export const card = inner => `<div class="sc">${inner}</div>`;
export const stepper = (labels, cur) => `<ol class="stp" aria-label="Steps">${labels.map((l, i) => `<li class="${i + 1 < cur ? 'done' : i + 1 === cur ? 'on' : ''}"><i>${i + 1 < cur ? '✓' : i + 1}</i> ${esc(l)}</li>`).join('')}</ol>`;
export const btn = (label, act, o = {}) => `<button type="button" class="btn ${o.k || 'o'}${o.f ? ' f' : ''}${o.s ? ' s' : ''}" data-act="${act}"${o.attrs ? ' ' + o.attrs : ''}${o.disabled ? ' disabled' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${o.icon || ''}${esc(label)}</button>`;
export const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
export const menu = (id, open, items) => `<span class="mn"><button type="button" class="dots" aria-label="More" aria-haspopup="true" aria-expanded="${open ? 'true' : 'false'}" data-act="menuOpen" data-id="${esc(id)}">⋯</button>${open ? `<div class="pop" role="menu">${items.map(([l, a, attrs]) => `<button type="button" role="menuitem" data-act="${a}" ${attrs || ''}>${esc(l)}</button>`).join('')}</div>` : ''}</span>`;
