// Overlay primitive: modal, drawer and popover on one stack.
// What it guarantees (the accessibility contract of review/03-ux-audit.md section j):
//  · role="dialog" (alertdialog for confirm), aria-modal on modal and drawer, aria-labelledby pointing at the visible title
//  · focus moves in on open (first focusable, or the dialog itself), Tab and Shift+Tab are trapped, the page behind is inert
//  · Escape closes the top layer only; a click on the scrim closes it (unless dismissable:false)
//  · focus returns to the control that opened it (or its replacement after a repaint, found by id / data-ui-return)
//  · repaints are held while an overlay is open (app.js asks overlay.isOpen())
import { esc, H, cls, attrs, icon, uid } from './util.js';

const stack = [];
const idle = new Set(); // callbacks run when the last overlay closes (app.js uses this to run a repaint it held back)
export const onIdle = fn => { idle.add(fn); return () => idle.delete(fn); };
let host = null; let inerted = []; let wired = false;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export const focusables = root => [...root.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[inert]'));
function ensureHost() {
  if (!host || !host.isConnected) { host = document.getElementById('ui-overlays'); if (!host) { host = document.createElement('div'); host.id = 'ui-overlays'; document.body.appendChild(host); } }
  if (!wired) { wired = true; document.addEventListener('keydown', onKey, true); document.addEventListener('pointerdown', onPointer, true); addEventListener('resize', () => stack.forEach(l => l.kind === 'popover' && place(l))); }
  return host;
}
function setInert(on) {
  if (on) {
    if (inerted.length) return;
    for (const el of document.body.children) { if (el === host || el.tagName === 'SCRIPT' || el.id === 'toasts' || el.hasAttribute('inert')) continue; el.setAttribute('inert', ''); inerted.push(el); }
    document.documentElement.classList.add('ui-scroll-lock');
  } else { inerted.forEach(el => el.removeAttribute('inert')); inerted = []; document.documentElement.classList.remove('ui-scroll-lock'); }
}
const modalCount = () => stack.filter(l => l.kind !== 'popover').length;

function onKey(e) {
  const top = stack[stack.length - 1]; if (!top) return;
  if (e.key === 'Escape') { if (top.dismissable === false) return; e.preventDefault(); e.stopPropagation(); close(top, 'escape'); return; }
  if (e.key === 'Tab' && top.kind !== 'popover') {
    const f = focusables(top.dialog); if (!f.length) { e.preventDefault(); top.dialog.focus(); return; }
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!top.dialog.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (a === first || a === top.dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
}
function onPointer(e) {
  const top = stack[stack.length - 1]; if (!top || top.kind !== 'popover') return;
  if (top.dialog.contains(e.target) || (top.anchor && top.anchor.contains(e.target))) return;
  close(top, 'outside');
}

// the static markup, shared with the UiKit gallery
export function dialogHtml(o = {}) {
  const id = o.id || uid('ui-dlg'); const tid = id + '-t';
  const role = o.role || 'dialog';
  const head = o.title != null || o.close !== false ? `<header class="ui-dialog__h">${o.title != null ? `<h2 class="ui-dialog__t" id="${tid}">${esc(o.title)}</h2>` : '<span></span>'}${o.close === false ? '' : `<button type="button" class="ui-iconbtn" data-ui-close aria-label="Close">${icon('close', 18)}</button>`}</header>` : '';
  const foot = o.footer || o.actions ? `<footer class="ui-dialog__f">${H(o.footer)}${(o.actions || []).map((a, i) => `<button type="button" class="ui-btn ui-btn--${a.tone || (i === (o.actions.length - 1) ? 'primary' : 'secondary')}" data-ui-action="${i}"${a.disabled ? ' disabled' : ''}>${esc(a.label)}</button>`).join('')}</footer>` : '';
  return `<div${attrs({ class: cls('ui-dialog', 'ui-dialog--' + (o.kind === 'drawer' ? 'drawer' : o.size || 'md'), o.className), id, role, 'aria-modal': o.kind === 'popover' ? null : 'true', 'aria-labelledby': o.title != null ? tid : null, 'aria-label': o.title == null ? o.label || 'Dialog' : null, 'aria-describedby': o.describedBy, tabindex: -1, 'data-kind': o.kind || 'modal' })}>${head}<div class="ui-dialog__b">${H(o.body ?? o.html)}</div>${foot}</div>`;
}

// open({ kind:'modal'|'drawer'|'popover', title, body, footer, actions:[{label,tone,onClick,keepOpen}], size:'sm'|'md'|'lg',
//        onMount(dialogEl, handle), onClose(result), dismissable, returnFocus, initialFocus:'#sel', anchor (popover), placement, id, legacy, label })
// -> handle { el, dialog, close(result), update({title,body}), closed:Promise, id }
export function open(o = {}) {
  ensureHost();
  const kind = o.kind || 'modal';
  const opener = o.returnFocus || (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
  const layer = { kind, dialogOpts: o, opener, returnKey: opener && (opener.id ? '#' + CSS.escape(opener.id) : opener.getAttribute && opener.getAttribute('data-ui-return') ? `[data-ui-return="${opener.getAttribute('data-ui-return')}"]` : null), dismissable: o.dismissable, anchor: o.anchor, placement: o.placement };
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-overlay--' + kind; el.setAttribute('data-ui-overlay', kind);
  if (o.legacy) el.id = 'modal';
  if (kind === 'popover') {
    el.innerHTML = dialogHtml({ ...o, kind, close: false, className: cls('ui-popover', o.className) });
  } else {
    el.innerHTML = `<div class="ui-scrim" data-ui-scrim></div>` + (o.legacy
      ? `<div class="ui-dialog ui-dialog--md mbox" role="dialog" aria-modal="true" tabindex="-1" data-kind="modal"><div class="ui-dialog__b">${H(o.html)}</div></div>`
      : dialogHtml({ ...o, kind }));
  }
  layer.el = el; layer.dialog = el.querySelector('.ui-dialog');
  if (o.legacy) { const h = layer.dialog.querySelector('h1,h2,h3'); if (h) { h.id = h.id || uid('ui-lt'); layer.dialog.setAttribute('aria-labelledby', h.id); } else layer.dialog.setAttribute('aria-label', o.label || 'Dialog'); }
  if (kind !== 'popover' && o.scrollTop !== false) layer.dialog.querySelector('.ui-dialog__b')?.scrollTo?.(0, 0);
  host.appendChild(el);
  stack.push(layer);
  if (kind !== 'popover') setInert(true);
  const handle = {
    el, dialog: layer.dialog, id: layer.dialog.id, layer,
    close: r => close(layer, r),
    update: p => { if (p.title != null) { const t = layer.dialog.querySelector('.ui-dialog__t'); if (t) t.textContent = p.title; } if (p.body != null) layer.dialog.querySelector('.ui-dialog__b').innerHTML = H(p.body); }
  };
  handle.closed = new Promise(res => { layer.resolve = res; });
  layer.handle = handle;
  // wiring: scrim, close buttons, [data-close] (legacy), actions
  el.addEventListener('click', e => {
    if (e.target.closest('[data-ui-scrim]')) { if (layer.dismissable !== false) close(layer, 'scrim'); return; }
    if (e.target.closest('[data-ui-close],[data-close]')) { close(layer, 'close'); return; }
    const a = e.target.closest('[data-ui-action]');
    if (a) { const act = (o.actions || [])[+a.dataset.uiAction]; if (!act) return; Promise.resolve(act.onClick ? act.onClick(handle) : null).then(r => { if (!act.keepOpen && r !== false) close(layer, act.result ?? act.label); }); }
  });
  if (kind === 'popover') place(layer);
  // focus in
  const target = (o.initialFocus && layer.dialog.querySelector(o.initialFocus)) || (kind === 'popover' && !o.focus ? null : focusables(layer.dialog).find(x => !x.matches('[data-ui-close]')) || focusables(layer.dialog)[0] || layer.dialog);
  if (target) target.focus({ preventScroll: true });
  if (o.onMount) o.onMount(layer.dialog, handle);
  return handle;
}

function place(layer) {
  const a = layer.anchor; const d = layer.dialog; if (!a || !a.isConnected) return;
  d.style.visibility = 'hidden'; d.style.left = '0px'; d.style.top = '0px';
  const r = a.getBoundingClientRect(); const w = d.offsetWidth, h = d.offsetHeight;
  let x = r.left, y = r.bottom + 6;
  if (layer.placement === 'bottom-end') x = r.right - w;
  if (x + w > innerWidth - 8) x = Math.max(8, innerWidth - w - 8);
  if (x < 8) x = 8;
  if (y + h > innerHeight - 8 && r.top - h - 6 > 8) y = r.top - h - 6;
  d.style.left = x + 'px'; d.style.top = Math.max(8, y) + 'px'; d.style.visibility = '';
}

export function close(layer, result) {
  layer = layer && layer.layer ? layer.layer : layer || stack[stack.length - 1]; if (!layer) return;
  const i = stack.indexOf(layer); if (i < 0) return;
  stack.splice(i, 1); layer.el.remove();
  if (!modalCount()) setInert(false);
  try { layer.dialogOpts.onClose && layer.dialogOpts.onClose(result); } catch (e) { console.error(e); }
  layer.resolve && layer.resolve(result);
  // focus back to what opened it (or its repaint replacement), else the main landmark
  let back = layer.opener && layer.opener.isConnected ? layer.opener : (layer.returnKey ? document.querySelector(layer.returnKey) : null);
  if (!back) back = document.getElementById('main') || document.getElementById('root') || document.querySelector('main');
  if (back) { if (!back.matches(FOCUSABLE) && back.tabIndex < 0 && !back.hasAttribute('tabindex')) back.setAttribute('tabindex', '-1'); back.focus({ preventScroll: true }); }
  if (!stack.length) idle.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}
export const closeAll = () => { while (stack.length) close(stack[stack.length - 1]); };

export const modal = o => open({ ...o, kind: 'modal' });
export const drawer = o => open({ ...o, kind: 'drawer' });
export const popover = o => open({ ...o, kind: 'popover' });
// confirm({ title, body, confirmLabel, cancelLabel, tone }) -> Promise<boolean>
export function confirm(o = {}) {
  return new Promise(res => {
    const h = open({ kind: 'modal', size: 'sm', role: 'alertdialog', title: o.title || 'Are you sure?', body: o.body || '', initialFocus: '[data-ui-action="0"]',
      actions: [{ label: o.cancelLabel || 'Cancel', tone: 'secondary', result: false }, { label: o.confirmLabel || 'Confirm', tone: o.tone || 'primary', result: true }] });
    h.closed.then(r => res(r === true));
  });
}
export const isOpen = () => stack.length > 0;
export const isModalOpen = () => modalCount() > 0;
export const top = () => stack[stack.length - 1] || null;
export const overlay = { open, close, closeAll, modal, drawer, popover, confirm, isOpen, isModalOpen, top, dialogHtml, focusables, onIdle };

// tooltip: an info button whose text is read by assistive tech (aria-describedby) and shown on hover or focus
export function tooltip(text, o = {}) {
  const id = o.id || uid('ui-tip');
  return `<span class="ui-tip"><button type="button" class="ui-tip__b" aria-describedby="${id}" aria-label="${esc(o.label || 'More information')}">${icon('info', 14)}</button><span role="tooltip" id="${id}" class="ui-tip__t">${esc(text)}</span></span>`;
}
