// Small pieces: emptyState, skipLink, stepper, statStrip, infoPopover, the draft store and a draft-bound textarea.
import { esc, H, cls, attrs, icon, uid, jsonAttr, autoId, setHandlers, hasHandlers } from './util.js';

// emptyState({ title, body, tone:'empty'|'error'|'denied'|'loading', action:{label, href|id}, onAction })
// error -> role="alert"; the rest role="status". An action is a real link (href) or a button wired through onAction.
export function emptyState(o = {}) {
  const tone = o.tone || 'empty';
  const id = o.onAction ? (o.id || autoId('es')) : null; if (id) setHandlers(id, { onAction: o.onAction });
  const ic = { empty: 'inbox', error: 'alert', denied: 'lock', loading: 'hourglass' }[tone];
  const a = o.action ? (o.action.href ? `<a class="ui-btn ui-btn--secondary" href="${esc(o.action.href)}">${esc(o.action.label)}</a>` : `<button type="button" class="ui-btn ui-btn--secondary" data-ui-es-action>${esc(o.action.label)}</button>`) : '';
  return `<div class="ui-empty ui-empty--${tone}" role="${tone === 'error' ? 'alert' : 'status'}"${id ? ` data-ui-id="${esc(id)}"` : ''}>${icon(ic, 24)}<div class="ui-empty__t">${esc(o.title || 'Nothing here')}</div>${o.body ? `<div class="ui-empty__b">${esc(o.body)}</div>` : ''}${a}</div>`;
}

// skipLink({ target:'main', label:'Skip to main content' }): first tab stop of the page; moves focus to the target
export const skipLink = (o = {}) => `<a class="ui-skip" href="#${esc(o.target || 'main')}" data-ui-skip>${esc(o.label || 'Skip to main content')}</a>`;

// stepper([{label,done?}], { current:1 }) -> ordered list; the current step has aria-current="step"
export function stepper(steps, o = {}) {
  const cur = o.current ?? steps.findIndex(s => !s.done);
  return `<ol class="ui-stepper" aria-label="${esc(o.label || 'Progress')}">${steps.map((s, i) => `<li class="ui-stepper__i${i < cur || s.done ? ' is-done' : ''}${i === cur ? ' is-current' : ''}"${i === cur ? ' aria-current="step"' : ''}><span class="ui-stepper__dot" aria-hidden="true">${i < cur || s.done ? icon('check', 12) : i + 1}</span><span class="ui-stepper__l">${esc(s.label)}${i < cur || s.done ? '<span class="ui-sr"> (done)</span>' : ''}</span></li>`).join('')}</ol>`;
}

// statStrip([{ label:'Needs action', value:5, href? , tone? }]): count chips instead of KPI tiles (max 6)
export function statStrip(items, o = {}) {
  return `<div class="ui-strip" role="group" aria-label="${esc(o.label || 'Summary')}">${items.slice(0, 6).map(it => {
    const inner = `<span class="ui-strip__l">${esc(it.label)}</span><b class="ui-num">${esc(String(it.value))}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}`;
    return it.href ? `<a class="ui-strip__c" href="${esc(it.href)}">${inner}</a>` : `<span class="ui-strip__c ui-strip__c--ro">${inner}</span>`;
  }).join('')}</div>`;
}

// infoPopover({ label:'Rule', title:'How this works', html:'<p>…</p>' }): a small button that opens a popover (replaces long explanatory copy)
export function infoPopover(o = {}) {
  return `<button type="button" class="ui-infobtn" data-ui-pop="${jsonAttr({ title: o.title, html: H(o.html), text: o.text })}" aria-haspopup="dialog">${icon('info', 14)}<span class="${o.visibleLabel ? '' : 'ui-sr'}">${esc(o.label || 'More information')}</span></button>`;
}

// kbd('Ctrl'), kbd('Shift')…
export const kbd = (...keys) => keys.map(k => `<kbd class="ui-kbd">${esc(k)}</kbd>`).join('+');

// ---------- the draft store ----------
// The whole screen repaints on every store change, which would wipe text a person is typing. Keep it in the draft store:
//   textarea:  draftField({ key:'reply:R-0408', label:'Reply', value: sentDraft })   (re-renders with what was typed)
//   read:      draft.get('reply:R-0408', fallback)    write: draft.set(key, text)    drop after send: draft.clear(key)
// A field with data-ui-draft="key" is saved on every input event by the delegated listener in ui/wire.js.
const D = new Map();
export const draft = {
  get: (k, fb = '') => (D.has(k) ? D.get(k) : fb), set: (k, v) => { D.set(k, v); return v; }, has: k => D.has(k),
  clear: k => D.delete(k), clearPrefix: p => { for (const k of [...D.keys()]) if (k.startsWith(p)) D.delete(k); }, clearAll: () => D.clear(), keys: () => [...D.keys()]
};
// draftField({ key, label, value, rows, placeholder, id, multiline:true, hint })
export function draftField(o = {}) {
  const id = o.id || 'df-' + String(o.key).replace(/[^a-z0-9]+/gi, '-');
  const v = draft.get(o.key, o.value ?? '');
  const ctl = o.multiline === false
    ? `<input class="ui-input" id="${esc(id)}" type="text" data-ui-draft="${esc(o.key)}" value="${esc(v)}"${o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : ''}${o.hint ? ` aria-describedby="${esc(id)}-h"` : ''}>`
    : `<textarea class="ui-input ui-textarea" id="${esc(id)}" rows="${o.rows || 4}" data-ui-draft="${esc(o.key)}"${o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : ''}${o.hint ? ` aria-describedby="${esc(id)}-h"` : ''}>${esc(v)}</textarea>`;
  return `<div class="ui-field">${o.label ? `<label class="ui-field__l" for="${esc(id)}">${esc(o.label)}</label>` : ''}${ctl}${o.hint ? `<div class="ui-field__h" id="${esc(id)}-h">${esc(o.hint)}</div>` : ''}</div>`;
}
