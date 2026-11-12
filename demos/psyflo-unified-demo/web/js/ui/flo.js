// FLO, the assistant: the chat drawer. Opened by the shell's top bar (event `psyflo:topbar`, detail.id === 'flo') on every platform page.
// The answers come from shared/flo-engine.js (pure, rule-based, read-only, role-projected). This file is only the panel:
// a right-side ui.drawer with a labelled input, a role="log" live region for the conversation, suggested questions, tables and bars
// drawn from the answer data, a source line on every answer, and the maturity chip (Simulated). One conversation per signed-in person,
// kept for the session (sessionStorage when it is there; memory when it is not). Never writes to the store.
//   window.psyfloFlo = { open(opener?), close(), ask(text), reset() }   (the tests and the shell's keyboard route use it)
import { api } from '../api.js';
import { overlay } from './overlay.js';
import { maturity } from './chip.js';
import { esc, icon } from './util.js';
import { floAsk, floSuggestions, floScope, floAvailable, FLO_NAME } from '../shared/flo-engine.js';

const KEY = 'psyflo_flo_v1';
const chats = new Map();          // actorKey -> { msgs: [{ id, who, text | res }], seq }
let handle = null, loaded = false;

const actorNow = () => { try { return window.psyflo && window.psyflo.session && window.psyflo.session.actor; } catch { return null; } };
const keyOf = a => (a ? a.id : '');
function load() {
  if (loaded) return; loaded = true;
  try { const raw = JSON.parse(sessionStorage.getItem(KEY) || '{}'); for (const [k, v] of Object.entries(raw)) if (v && Array.isArray(v.msgs)) chats.set(k, v); } catch { /* memory only */ }
}
function save() {
  try { const o = {}; for (const [k, v] of chats) o[k] = { msgs: v.msgs.slice(-40), seq: v.seq }; sessionStorage.setItem(KEY, JSON.stringify(o)); } catch { /* memory only */ }
}
function chatOf(a) { load(); const k = keyOf(a); if (!chats.has(k)) chats.set(k, { msgs: [], seq: 0 }); return chats.get(k); }

// ---------------------------------------------------------------------------------------------------------------- rendering
const TONE = { danger: 'danger', warning: 'warning', success: 'success', neutral: 'neutral', accent: 'accent' };
function cell(c) {
  if (c == null || c === '') return '<span class="flo-mut">—</span>';
  if (typeof c === 'string') return esc(c);
  const inner = c.to ? `<a href="${esc(c.to)}">${esc(c.t)}</a>` : esc(c.t);
  const body = c.tone ? `<span class="flo-pill flo-pill--${TONE[c.tone] || 'neutral'}">${esc(c.t)}</span>` : inner;
  return body + (c.sub ? `<small>${esc(c.sub)}</small>` : '');
}
const tableHtml = (t, id) => !t ? '' :
  `<div class="flo-tw" role="region" aria-label="${esc(t.cols.filter(Boolean).join(', '))}" tabindex="0"><table class="flo-t"><thead><tr>${t.cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${cell(c)}</th>` : `<td>${cell(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
function barsHtml(bars) {
  if (!bars || !bars.length) return '';
  const max = Math.max(...bars.map(b => b.total || b.value || 1), 1);
  return `<ul class="flo-bars">${bars.map(b => { const w = Math.max(b.value ? 4 : 0, Math.round(100 * (b.value || 0) / (b.total || max))); const txt = b.total ? `${b.value} of ${b.total} ${b.unit || ''}` : `${b.value} ${b.unit || ''}`; return `<li><span class="flo-bars__l">${esc(b.label)}</span><span class="flo-bars__b flo-bars__b--${TONE[b.tone] || 'accent'}" role="img" aria-label="${esc(b.label + ': ' + txt.trim())}"><i style="width:${w}%"></i></span><span class="flo-bars__v">${esc(txt.trim())}</span></li>`; }).join('')}</ul>`;
}
const legendHtml = l => !l ? '' : `<dl class="flo-lg">${l.map(x => (x.v ? `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd></div>` : `<div class="flo-lg__h"><dt>${esc(x.k)}</dt></div>`)).join('')}</dl>`;
const chipsHtml = qs => (qs && qs.length ? `<div class="flo-fu" role="group" aria-label="Ask next">${qs.map(q => `<button type="button" data-flo="q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : '');

function answerHtml(m) {
  const r = m.res; const [b, rest] = r.summary || ['', ''];
  return `<div class="flo-m flo-m--f flo-m--${esc(r.kind)}" data-flo-msg="${m.id}" data-intent="${esc(r.intent)}" data-kind="${esc(r.kind)}">`
    + `<p class="flo-sum"><b>${esc(b)}</b>${rest ? ' ' + esc(rest) : ''}</p>`
    + (r.list && r.list.length ? `<ul class="flo-li">${r.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
    + legendHtml(r.legend) + barsHtml(r.bars) + tableHtml(r.table, m.id)
    + (r.links && r.links.length ? `<p class="flo-ln">${r.links.map(l => `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(l.to)}">${esc(l.label)}</a>`).join('')}</p>` : '')
    + (r.source ? `<p class="flo-src"><span>Source</span> ${esc(r.source)}</p>` : '')
    + chipsHtml(r.followUps) + '</div>';
}
function logHtml(chat, a) {
  if (!chat.msgs.length) {
    return `<div class="flo-empty" data-flo-empty><p class="flo-hi">Ask about your patients, notes, units or deadlines.</p><p class="flo-scope" data-flo-scope>${esc(floScope(api.state, a))}</p>${chipsHtml(floSuggestions(api.state, a))}</div>`;
  }
  return chat.msgs.map(m => (m.who === 'user' ? `<div class="flo-m flo-m--u" data-flo-msg="${m.id}"><p>${esc(m.text)}</p></div>` : answerHtml(m))).join('');
}
function bodyHtml(a) {
  const chat = chatOf(a);
  return `<div class="flo" data-flo>`
    + `<div class="flo__bar"><span class="flo__tag" data-flo-tag>${maturity('agents.flo')}</span><button type="button" class="ui-linkbtn flo__new" data-flo="new"${chat.msgs.length ? '' : ' hidden'}>New chat</button></div>`
    + `<div class="flo__log" id="flo-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with ${esc(FLO_NAME)}" tabindex="0">${logHtml(chat, a)}</div>`
    + `<form class="flo__form" data-flo="form" autocomplete="off"><label class="ui-sr" for="flo-in">Ask ${esc(FLO_NAME)}</label>`
    + `<textarea id="flo-in" rows="2" maxlength="300" placeholder="Ask ${esc(FLO_NAME)} about notes, units or deadlines" data-flo="input"></textarea>`
    + `<button type="submit" class="ui-btn ui-btn--primary">Send</button></form></div>`;
}

// ---------------------------------------------------------------------------------------------------------------- behaviour
const root = () => handle && handle.dialog && handle.dialog.querySelector('[data-flo]');
function repaint(scrollEnd) {
  const r = root(); if (!r) return; const a = actorNow(); const chat = chatOf(a);
  const log = r.querySelector('.flo__log'); log.innerHTML = logHtml(chat, a);
  const nb = r.querySelector('[data-flo="new"]'); if (nb) nb.hidden = !chat.msgs.length;
  // a new answer is read from its first line: scroll to its top, not to the bottom of a long table or legend
  if (scrollEnd) { const last = log.querySelectorAll('.flo-m--f'); const el = last[last.length - 1]; log.scrollTop = el ? Math.max(0, el.offsetTop - 6) : log.scrollHeight; }
}
export function ask(text) {
  const a = actorNow(); const t = String(text || '').trim().slice(0, 300);
  if (!t || !floAvailable(a)) return null;
  const chat = chatOf(a);
  chat.msgs.push({ id: ++chat.seq, who: 'user', text: t });
  // read-only: the engine only reads api.state; nothing below writes to the store
  const res = floAsk(api.state, a, t);
  chat.msgs.push({ id: ++chat.seq, who: 'flo', res });
  save(); repaint(true);
  return res;
}
function reset() { const a = actorNow(); chats.set(keyOf(a), { msgs: [], seq: 0 }); save(); repaint(); const i = root() && root().querySelector('#flo-in'); if (i) i.focus(); }
export function close() { if (handle) { handle.close('flo'); handle = null; } }
export function open(opener) {
  const a = actorNow(); if (!floAvailable(a) || !api.state) return null;
  if (handle && handle.el && handle.el.isConnected) { const i = root() && root().querySelector('#flo-in'); if (i) i.focus(); return handle; }
  handle = overlay.drawer({
    title: FLO_NAME, className: 'flo-drawer', body: bodyHtml(a), initialFocus: '#flo-in', returnFocus: opener || undefined,
    onMount(dialog) {
      const t = dialog.querySelector('.ui-dialog__t'); if (t) t.insertAdjacentHTML('afterbegin', `<span class="flo-logo" aria-hidden="true">${icon('sparkle', 20)}</span>`);
      const form = dialog.querySelector('[data-flo="form"]'), input = dialog.querySelector('#flo-in');
      form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; if (!v.trim()) { input.focus(); return; } input.value = ''; ask(v); input.focus(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
      dialog.addEventListener('click', e => {
        const q = e.target.closest('[data-flo="q"]'); if (q) { ask(q.dataset.q); input.focus(); return; }
        if (e.target.closest('[data-flo="new"]')) reset();
      });
      const log = dialog.querySelector('.flo__log'); const lastF = log.querySelectorAll('.flo-m--f'); log.scrollTop = lastF.length ? Math.max(0, lastF[lastF.length - 1].offsetTop - 6) : 0;
    },
    onClose() { handle = null; }
  });
  return handle;
}

// the shell's top bar asks for FLO with a window event, so this module needs no import from the shell
window.addEventListener('psyflo:topbar', e => { if (e.detail && e.detail.id === 'flo') open(e.detail.opener); });
window.psyfloFlo = { open, close, ask, reset: () => { const a = actorNow(); chats.set(keyOf(a), { msgs: [], seq: 0 }); save(); } };
