// Recommendation cards (R6): the one component Authorizations and Denial Intelligence share. The extension panel draws its own version of the same
// cards (web/panel/lib/recs.js) from the same engine (web/js/shared/recs.js).
//
//   recPanel(recs, { s, scope, ref, chips, laurisHref, canAct, heading, base })  -> HTML (a drawer body, a modal body or a card)
//   bindRecPanel(root, { scope, ref, call, onChange, fields })                   wires the buttons inside a rendered panel
//   recDrawer({ title, scope, ref, recs: () => recs, s: () => state, call, chips, laurisHref, onClose, returnFocus, footer, onSubmit })  -> drawer handle (repaints itself after each decision)
//     footer (R7, Oprox parity) = { submit?:{label,disabled,reason}, refine?:true, context?:true, dismissAll?:true } adds Submit, Refine suggestions, Add clinical context and Dismiss suggestions;
//     every one is logged with intel.event; onSubmit() opens the owner's send step. Without `footer` the panel is as before.
//   recMini(recs, { limit })                                                    a short list for a case page: top suggestions, then a button with [data-rc-open]
//
// The pattern comes from reading how a utilization reviewer works through a request: each suggestion is a card you can include or leave out; a card
// says why it matters and how often the same step was applied (an ILLUSTRATIVE SAMPLE, labelled and marked Simulated); a card that needs input
// asks for the clinician's own words and cannot be included without them; "Apply selected" commits the choices, and every decision is logged.
// Nothing here writes a clinical sentence: the text on a card is built from stored records (shared/recs.js) or typed by the clinician.
import { esc, icon } from './util.js';
import { chip, maturity } from './chip.js';
import { drawer } from './overlay.js';
import { toast } from './toast.js';
import { IMPACT_LABEL, OUTCOME_BASIS, CONTEXT_MAX, summary, textOf } from '../shared/recs.js';

const TONE = { high: 'danger', medium: 'warning', low: 'neutral' };
const lift = o => o && o.lift ? `+${o.lift} pts` : '';
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function card(r, o, i) {
  const id = `rc-${esc(r.scope)}-${i}`; const inc = r.state === 'included'; const text = (r.insert && r.insert.text) || '';
  const own = r.needsInput ? String(r.context || '') : '';
  const canAct = o.canAct !== false; const need = !!r.needsInput; const ok = canAct && (!need || !!own.trim());
  const out = r.outcome;
  const chips = o.chips ? o.chips(r) : '';
  const lauris = r.act && r.act.kind === 'lauris' && o.laurisHref ? o.laurisHref(r) : '';
  return `<li class="rc__card" data-rec="${esc(r.key)}" data-state="${esc(r.state)}"${r.custom ? ' data-custom' : ''}>
    <div class="rc__top">
      <input type="checkbox" class="rc__chk" id="${id}" data-rc-check ${inc ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-describedby="${id}-m">
      <label class="rc__t" for="${id}">${esc(r.title)}</label>
      <span class="rc__chips" id="${id}-m">${chip(IMPACT_LABEL[r.impact] || 'Impact', { tone: TONE[r.impact] || 'neutral', size: 'sm' })}${out ? chip(lift(out) + ' · sample', { tone: 'success', size: 'sm', title: OUTCOME_BASIS }) : ''}${r.custom ? chip('Added by you', { tone: 'info', size: 'sm' }) : ''}${r.dim ? chip(`D${r.dim}`, { tone: 'outline', size: 'sm', title: `ASAM dimension ${r.dim}` }) : ''}</span>
    </div>
    <details class="rc__why"><summary>Why this matters</summary><p>${esc(r.why)}</p>${out ? `<p class="rc__out">${esc(String(out.applied))} times applied in the sample · ${esc(String(out.success))}% success. <span class="rc__basis">${esc(OUTCOME_BASIS)}</span></p>` : ''}</details>
    ${text ? `<blockquote class="rc__text" data-label="What goes in">${esc(text)}</blockquote>` : ''}
    ${chips ? `<div class="rc__ev">${chips}</div>` : ''}
    ${need ? `<div class="rc__need"><label for="${id}-c">${chip('Needs your input', { tone: 'warning', size: 'sm', icon: 'pencil' })} ${esc(r.needsInput.prompt)}</label><textarea class="ui-textarea rc__ctx" id="${id}-c" data-rc-ctx rows="3" maxlength="${CONTEXT_MAX}" placeholder="${esc(r.needsInput.placeholder || 'Your words.')}"${canAct ? '' : ' disabled'}>${esc(own)}</textarea><span class="rc__cnt" aria-live="polite">${own.length} / ${CONTEXT_MAX}</span></div>` : ''}
    <div class="rc__row">${lauris}${canAct ? `<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-dismiss>Dismiss</button>${r.custom ? '<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-remove>Remove</button>' : ''}` : ''}</div>
  </li>`;
}

export function recPanel(recs, o = {}) {
  const sum = summary(o.s || {}, recs, o.base != null ? { base: o.base } : {});
  const live = recs.filter(r => r.state !== 'dismissed'); const gone = recs.filter(r => r.state === 'dismissed');
  const canAct = o.canAct !== false; const F = o.footer || {};
  const meter = sum.total ? `<div class="rc__meter" title="${esc(OUTCOME_BASIS)}"><span class="rc__ml">Expected approval</span><b>${sum.base}% <span aria-hidden="true">→</span><span class="ui-sr"> to </span> ${sum.expected}%</b>${maturity({ level: 'simulated', note: OUTCOME_BASIS })}</div>` : '';
  return `<div class="rc" data-rc data-scope="${esc(o.scope || '')}" data-ref="${esc(o.ref || '')}">
    <header class="rc__sum"><div><h3 class="rc__h">${esc(o.heading || 'Pick what to include')}</h3><p class="rc__sub" data-rc-count>${count(sum.included, 'suggestion', 'suggestions')} included of ${sum.total}${sum.needInput ? ` · ${count(sum.needInput, 'needs', 'need')} your words` : ''}</p></div>${meter}</header>
    ${live.length ? `<ul class="rc__list">${live.map((r, i) => card(r, o, i)).join('')}</ul>` : `<p class="rc__empty">${esc(o.empty || 'Nothing to suggest right now. The record answers what a reviewer usually asks.')}</p>`}
    ${gone.length ? `<details class="rc__gone"><summary>${count(gone.length, 'dismissed suggestion', 'dismissed suggestions')}</summary><ul class="rc__gl">${gone.map(r => `<li data-rec="${esc(r.key)}"><span>${esc(r.title)}</span>${canAct ? '<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-reopen>Bring back</button>' : ''}</li>`).join('')}</ul></details>` : ''}
    ${canAct ? `<form class="rc__add" data-rc-addform hidden><label>Title<input class="ui-input" name="title" maxlength="120" placeholder="For example: Mention the safety plan"></label><label>What should go in<textarea class="ui-textarea" name="text" rows="3" maxlength="${CONTEXT_MAX}" placeholder="Your own words. Psyflo does not write this."></textarea></label><div class="rc__row"><button type="submit" class="ui-btn ui-btn--secondary ui-btn--sm">Save</button><button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-addcancel>Cancel</button></div></form>
    <footer class="rc__foot"><button type="button" class="ui-btn ui-btn--secondary" data-rc-add>${icon('plus', 16)} Add your own</button><button type="button" class="ui-btn ui-btn--primary" data-rc-apply>Apply selected (<span data-rc-n>${live.filter(r => r.state === 'included').length}</span>)</button>${F.submit ? `<button type="button" class="ui-btn ui-btn--primary" data-rc-submit${F.submit.disabled ? ' disabled' : ''}${F.submit.reason ? ` title="${esc(F.submit.reason)}"` : ''}>${esc(F.submit.label || 'Submit to payer')}</button>` : ''}</footer>
    ${F.refine || F.context || F.dismissAll ? `<div class="rc__more" role="group" aria-label="More actions">${F.refine ? '<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-refine>Refine suggestions</button>' : ''}${F.context ? '<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-context>Add clinical context</button>' : ''}${F.dismissAll && live.length ? '<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-rc-dismissall>Dismiss suggestions</button>' : ''}</div>` : ''}` : ''}
    <p class="rc__safe">${o.footer ? 'Untick a card to leave it out. All decisions are logged with your name. ' : ''}Suggestions only: nothing is sent and nothing is typed into Lauris until a person presses the button.</p>
  </div>`;
}

// the short list for a case page
export function recMini(recs, o = {}) {
  const sum = summary(o.s || {}, recs); const top = recs.filter(r => r.state !== 'dismissed').slice(0, o.limit || 3);
  if (!recs.length) return `<p class="rc__empty">Nothing to suggest right now.</p>`;
  return `<div class="rcm"><ul class="rcm__l">${top.map(r => `<li data-state="${esc(r.state)}">${r.state === 'included' ? icon('check', 16) : icon('sparkle', 16)}<span class="rcm__t">${esc(r.title)}</span>${chip(IMPACT_LABEL[r.impact] || '', { tone: TONE[r.impact] || 'neutral', size: 'sm' })}${r.outcome ? `<span class="rcm__lift" title="${esc(OUTCOME_BASIS)}">${esc(lift(r.outcome))}</span>` : ''}</li>`).join('')}</ul>
    <div class="rcm__f"><span class="rc__sub">${count(sum.included, 'suggestion', 'suggestions')} included of ${sum.total}</span><button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-rc-open>Review suggestions</button></div></div>`;
}

// wiring: includes, dismissals and "Apply selected" call the actions; the owner repaints in onChange
export function bindRecPanel(root, { scope, ref, call, onChange, fields, onSubmit }) {
  const panel = root.querySelector('[data-rc]'); if (!panel) return;
  const extra = fields ? { fields } : {};
  const run = async (action, args) => { try { const r = await call(action, { scope, ref, ...extra, ...args }); if (onChange) await onChange(r); return r; } catch (e) { return null; } };
  const keyOf = el => el.closest('[data-rec]').dataset.rec;
  // a card that needs input can be ticked only once it has the clinician's words
  panel.querySelectorAll('[data-rc-ctx]').forEach(ta => ta.addEventListener('input', () => {
    const li = ta.closest('[data-rec]'); const chk = li.querySelector('[data-rc-check]'); const has = !!ta.value.trim(); chk.disabled = !has; if (!has) chk.checked = false;
    const c = li.querySelector('.rc__cnt'); if (c) c.textContent = `${ta.value.length} / ${CONTEXT_MAX}`;
  }));
  // "Apply selected (n)" shows how many cards are ticked
  const nEl = panel.querySelector('[data-rc-n]'); const tick = () => { if (nEl) nEl.textContent = String(panel.querySelectorAll('[data-rc-check]:checked').length); };
  panel.addEventListener('change', e => { if (e.target.closest('[data-rc-check]')) tick(); });
  const log = kind => call('intel.event', { scope, ref, kind }).catch(() => null);
  panel.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-rc-submit]')) { await log('submit'); return void (onSubmit && onSubmit()); }
    if (t.closest('[data-rc-refine]')) {
      const back = [...panel.querySelectorAll('.rc__gl [data-rec]')].map(li => ({ key: li.dataset.rec, state: 'open' }));
      await log('refine'); if (back.length) await run('recs.decideMany', { items: back }); else if (onChange) await onChange({});
      return void toast(back.length ? `Checked against the record again. ${count(back.length, 'dismissed suggestion is', 'dismissed suggestions are')} back.` : 'Checked against the record again. Nothing new to suggest.');
    }
    if (t.closest('[data-rc-context]')) { const f = panel.querySelector('[data-rc-addform]'); if (!f) return; f.hidden = false; f.dataset.ctx = '1'; f.elements.title.value = 'Clinical context'; f.elements.text.focus(); return; }
    if (t.closest('[data-rc-dismissall]')) {
      const open = [...panel.querySelectorAll('.rc__card')].filter(li => li.dataset.state !== 'dismissed').map(li => ({ key: li.dataset.rec, state: 'dismissed' }));
      if (!open.length) return; await log('dismissAll'); await run('recs.decideMany', { items: open });
      return void toast(`${count(open.length, 'suggestion', 'suggestions')} dismissed. Bring them back from the list below.`);
    }
    if (t.closest('[data-rc-dismiss]')) return void run('recs.decide', { key: keyOf(t), state: 'dismissed' });
    if (t.closest('[data-rc-reopen]')) return void run('recs.decide', { key: keyOf(t), state: 'open' });
    if (t.closest('[data-rc-remove]')) return void run('recs.remove', { key: keyOf(t) });
    if (t.closest('[data-rc-add]')) { const f = panel.querySelector('[data-rc-addform]'); f.hidden = false; f.querySelector('input').focus(); return; }
    if (t.closest('[data-rc-addcancel]')) { panel.querySelector('[data-rc-addform]').hidden = true; return; }
    if (t.closest('[data-rc-apply]')) {
      const items = [...panel.querySelectorAll('.rc__card')].map(li => {
        const chk = li.querySelector('[data-rc-check]'); const ta = li.querySelector('[data-rc-ctx]');
        return { key: li.dataset.rec, state: chk.checked ? 'included' : li.dataset.state === 'included' ? 'open' : li.dataset.state, context: ta ? ta.value : undefined, was: li.dataset.state, now: chk.checked };
      }).filter(x => x.state !== x.was || (x.context !== undefined && x.state === 'included')).map(({ key, state, context }) => ({ key, state, ...(context !== undefined ? { context } : {}) }));
      if (!items.length) return void toast('Nothing to apply yet: tick the suggestions you want to include.');
      return void run('recs.decideMany', { items });
    }
  });
  panel.addEventListener('submit', async e => {
    const f = e.target.closest('[data-rc-addform]'); if (!f) return; e.preventDefault();
    const r = await run('recs.add', { title: f.elements.title.value, text: f.elements.text.value }); if (r) { if (f.dataset.ctx) { delete f.dataset.ctx; await log('context'); } f.reset(); }
  });
}

// the drawer: repaints its own body after every decision (the state arrives with the action's refresh)
export function recDrawer(o) {
  const build = () => recPanel(o.recs(), { s: o.s ? o.s() : {}, scope: o.scope, ref: o.ref, chips: o.chips, laurisHref: o.laurisHref, canAct: o.canAct, heading: o.heading, empty: o.empty, base: o.base, footer: typeof o.footer === 'function' ? o.footer() : o.footer });
  let handle;
  const mount = dlg => bindRecPanel(dlg, { scope: o.scope, ref: o.ref, call: o.call, fields: o.fields, onSubmit: o.onSubmit, onChange: async r => { handle.update({ body: build() }); mount(handle.dialog); if (o.onChange) o.onChange(r); } });
  handle = drawer({ title: o.title || 'Suggested by Psyflo', body: build(), returnFocus: o.returnFocus, onClose: o.onClose, onMount: (dlg, h) => { handle = h; mount(dlg); } });
  return handle;
}
