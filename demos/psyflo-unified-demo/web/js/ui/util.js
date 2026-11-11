// Shared plumbing for the UI kit: escaping, attribute building, ids, the handler registry and the icon set.
// Convention: every helper returns an HTML string (wrap it with raw() in renderVals). Options named `html`, `body`,
// `footer`, `actions` take trusted HTML (a string or raw()); everything else is escaped.
import { esc, Raw } from '../runtime.js';
export { esc };

export const H = x => (x instanceof Raw ? x.html : x == null || x === false ? '' : String(x));
export const cls = (...a) => a.flat().filter(Boolean).join(' ');
export const attrs = o => Object.entries(o || {}).filter(([, v]) => v != null && v !== false)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');
let n = 0;
export const uid = (p = 'ui') => `${p}-${++n}`;
export const slug = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Callbacks cannot live in an HTML string, so a helper registers them under its (stable) id and stamps
// data-ui-id on its root. One delegated listener (ui/wire.js) finds them again. Re-rendering with the same id
// simply replaces the handlers, which is what a repaint needs.
const HANDLERS = new Map();
export const setHandlers = (id, h) => { HANDLERS.set(id, h); return id; };
export const getHandlers = id => HANDLERS.get(id) || {};

// 16 px stroke icons (aria-hidden: meaning always also appears as text)
const P = {
  check: '<path d="M4 12l5 5L20 6"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18.5v.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', x: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>', split: '<path d="M6 3v6a6 6 0 0 0 6 6h6M18 11l3 4-3 4M6 21v-3"/>',
  door: '<path d="M5 21V4h9v17M14 8l5 2v11M5 21h16M11 12v.01"/>', dot: '<circle cx="12" cy="12" r="4"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', chevD: '<path d="M6 9l6 6 6-6"/>', chevU: '<path d="M6 15l6-6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>',
  sort: '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>', asc: '<path d="M8 14l4-4 4 4"/>', desc: '<path d="M8 10l4 4 4-4"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', shield: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', plus: '<path d="M12 5v14M5 12h14"/>', list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  inbox: '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4M8 13h8M8 17h5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01"/>',
  home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>', play: '<path d="M7 4l13 8-13 8z"/>', monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', school: '<path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', quote: '<path d="M7 7h4v4H7zM13 7h4v4h-4zM7 11c0 3-1 4-3 5M13 11c0 3-1 4-3 5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>', keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'
};
export const icon = (name, size = 16, extra = '') =>
  `<svg class="ui-icon" aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${P[name] || P.dot}</svg>`;
export const ICON_NAMES = Object.keys(P);

// Ids for handlers that a helper registers when the caller did not pass an explicit `id`. The counter restarts at every
// screen repaint (app.js calls resetAutoIds) so the registry stays bounded. Inside an overlay, or anywhere rendered outside
// renderVals(), pass an explicit `id`.
let auto = 0;
export const resetAutoIds = () => { auto = 0; };
export const autoId = (p = 'ui') => `${p}-a${++auto}`;
export const hasHandlers = h => !!h && Object.values(h).some(v => typeof v === 'function');
// JSON in a data attribute: lets a component open its own detail without any registry entry
export const jsonAttr = o => esc(JSON.stringify(o));
export const parseJsonAttr = s => { try { return JSON.parse(s); } catch { return null; } };
