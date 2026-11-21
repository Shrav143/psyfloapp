// Toasts: role="status" (role="alert" for errors) inside a polite live region. toast('Saved') · toast('Could not send', 'err')
import { esc, icon } from './util.js';
export function toastHtml(msg, kind) {
  const err = kind === 'err';
  return `<div class="ui-toast${err ? ' ui-toast--err' : ''}" role="${err ? 'alert' : 'status'}">${icon(err ? 'alert' : 'check', 16)}<span>${esc(msg)}</span></div>`;
}
export function toast(msg, kind) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const wrap = document.createElement('div'); wrap.innerHTML = toastHtml(msg, kind);
  const t = wrap.firstElementChild; box.appendChild(t);
  setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3800);
  return t;
}
