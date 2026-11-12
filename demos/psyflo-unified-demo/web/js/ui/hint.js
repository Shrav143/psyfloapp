// hint: an icon that says what it means when you hover it or tab to it. It replaces a visible phrase, so a screen reads as icons and
// the definition is one hover away (feedback Nov 12, round 4: "add icons; on hover show the definition").
//
//   ui.hint('clock', 'Due soon: the date is within 7 days', { tone: 'y' })          a quiet icon (tone: r | y | g | b | n, default n)
//   ui.hint('alert', 'Past due', { tone: 'r', label: 'Past due: renewal', href: '#/Authorizations' })   an icon link with the same hover
//   ui.hint('file', 'Intake form', { text: '3 forms' })                               a short visible number beside the icon
//
// The icon is a real control (a button, or a link when href is given) so a keyboard user reaches it; its accessible name is the definition
// (or `label`), the visible bubble is aria-hidden so a screen reader does not say it twice. The bubble is positioned fixed so a table's
// scroll region never clips it, and Escape or moving away hides it. Do not put long text in it: a sentence, not a paragraph.
import { esc, icon } from './util.js';

export function hint(name, text, o = {}) {
  const tone = o.tone || 'n', label = o.label || text, size = o.size || 16;
  const inner = `${icon(name, size)}${o.text != null && o.text !== '' ? `<b class="ui-hint__n">${esc(o.text)}</b>` : ''}`;
  const attrs = `class="ui-hint__b" aria-label="${esc(label)}"${o.extra ? ' ' + o.extra : ''}`;
  const ctl = o.href ? `<a ${attrs} href="${esc(o.href)}">${inner}</a>` : `<button type="button" ${attrs}>${inner}</button>`;
  return `<span class="ui-hint ui-hint--${esc(tone)}${o.cls ? ' ' + esc(o.cls) : ''}" data-ui-hint>${ctl}<span class="ui-hint__t" aria-hidden="true">${esc(text)}</span></span>`;
}

// ---- one document-level handler (installed once, like the pager) ----
let on = null;
function place(host) {
  const t = host.querySelector('.ui-hint__t'); if (!t) return;
  const r = host.getBoundingClientRect();
  t.style.left = '0px'; t.style.top = '0px'; t.dataset.on = '1';
  const w = t.offsetWidth, h = t.offsetHeight;
  let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(x, innerWidth - w - 8));
  let y = r.top - h - 8; if (y < 8) y = r.bottom + 8;          // no room above: show it below
  t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px';
  on = host;
}
function hide() { if (on) { const t = on.querySelector('.ui-hint__t'); if (t) delete t.dataset.on; on = null; } }
if (typeof document !== 'undefined' && !window.__uiHint) {
  window.__uiHint = true;
  const host = e => (e.target && e.target.closest ? e.target.closest('[data-ui-hint]') : null);
  document.addEventListener('mouseover', e => { const h = host(e); if (h && h !== on) { hide(); place(h); } else if (!h) hide(); });
  let focusAt = 0;
  document.addEventListener('focusin', e => { const h = host(e); if (h) { hide(); place(h); focusAt = Date.now(); } });
  document.addEventListener('focusout', e => { if (on && !(e.relatedTarget && on.contains(e.relatedTarget))) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  // a scroll hides the bubble, except the scroll that focusing a control causes (the browser brings it into view): then it is placed again
  document.addEventListener('scroll', () => { if (on && Date.now() - focusAt < 250) place(on); else hide(); }, true);
  document.addEventListener('click', hide, true);
}
