// "Suggested by Psyflo" in the extension panel (R6): the recommendation cards, drawn in the panel's own style from the same engine the platform uses
// (web/js/shared/recs.js; the actions are server/psyflo/actions/x-recs.js). A card is one thing Psyflo suggests; the person decides.
//
//   recBlock(ctx, o) -> html       the block: heading, counter, cards, Add your own, Apply selected
//   recActs / recIns / recChs      handlers a view spreads into its own acts / ins / chs (the core router finds them by data-act / data-in / data-ch)
//
//   o = { scope, ref, recs, fields?, boxes?, chips?(rec), heading?, sub?, apply(ctx, includedRecs), applyLabel?, applyHint?, canApply?, limit?, empty?, addBoxes? }
//     scope/ref   'auth' + request id · 'denial' + request id · 'note' + "<client>:<form>" (the note scope also sends `fields`, so the server recomputes the same list)
//     boxes       the labels of the boxes on the open Lauris form (a card whose box is not on this form says so); null when the text goes to a packet
//     apply       what "Apply selected" does with the included cards (the view knows: type into the form, or put them in the packet)
//
// The rules the cards keep (docs/RECS-SPEC.md):
//   · Psyflo writes no clinical text. A card shows a sentence built from stored records (with its evidence chips) or asks for the clinician's own words;
//     a card that needs words cannot be included without them.
//   · The "+n pts · sample" and "applied N times · N% success" numbers are an illustrative sample, labelled, never a prediction.
//   · Every Include, Dismiss, Take out, Add and Remove is a server action (an audit event with who and when). Nothing is typed into Lauris until a person
//     presses Apply selected; nothing is ever sent.
import { esc } from '../../js/runtime.js';
import { IMPACT_LABEL, OUTCOME_BASIS, CONTEXT_MAX, summary, textOf } from '../../js/shared/recs.js';
import { chip } from '../parts.js';

const TONE = { high: 'r', medium: 'y', low: 'n' };
const slug = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const shortBox = label => String(label || '').replace(/^(Dimension \d)\s+[—·-].*$/, '$1');
const lift = o => (o && o.lift ? `+${o.lift} pts · sample` : '');
const xs = ctx => (ctx.st.rbx = ctx.st.rbx || { txt: {}, add: false, addTitle: '', addText: '', addBox: '', all: false, typed: [] });

function cardHTML(ctx, r, o) {
  const x = xs(ctx); const key = slug(r.key); const inc = r.state === 'included'; const need = !!r.needsInput;
  const text = String((r.insert && r.insert.text) || '').trim();
  const draft = x.txt[r.key]; const own = need ? (draft !== undefined ? draft : r.context || '') : '';
  const out = r.outcome; const box = r.insert && r.insert.box;
  const notHere = !!(box && o.boxes && !o.boxes.includes(box)) || !!(o.boxes && r.custom && !box);
  const typed = (x.typed || []).includes(r.id);
  const chips = [
    r.custom ? '' : chip(IMPACT_LABEL[r.impact] || 'Impact', TONE[r.impact] || 'n'),   // your own suggestion has no impact rating: Psyflo has no sample for it
    out && lift(out) ? chip(lift(out), 'g', ` title="${esc(OUTCOME_BASIS)}"`) : '',
    r.dim ? chip(`D${r.dim}`, 'n', ` title="ASAM dimension ${r.dim}"`) : '',
    r.custom ? chip('Added by you', 'b') : '',
    box && o.boxes ? chip(notHere ? `Not on this form: ${shortBox(box)}` : `Goes in: ${shortBox(box)}`, notHere ? 'y' : 'n') : '',
    inc ? chip('Included', 'g') : '', typed ? chip('Typed · yellow', 'y') : ''
  ].filter(Boolean).join('');
  const ev = o.chips ? o.chips(r) : '';
  // one disclosure per card: why it matters (with the sample numbers, labelled) and, when a stored record gives it, the sentence that would go in
  const more = `<details class="prc-w" data-acc="prc-more-${key}"><summary>${text || ev ? 'Why this matters and what goes in' : 'Why this matters'}</summary><div><p>${esc(r.why)}</p>${out ? `<p class="hint">Applied ${esc(String(out.applied))} times in the sample · ${esc(String(out.success))}% success. ${esc(OUTCOME_BASIS)}</p>` : ''}${text ? `<div class="lab">What goes in${box ? ` · ${esc(shortBox(box))}` : ''}</div><div class="prc-q">${esc(text)}</div>` : ''}${ev ? `<div class="lab">Records behind it</div><div class="prc-ev">${ev}</div>` : ''}</div></details>`;
  const opts = need && !inc && (r.needsInput.options || []).length ? `<div class="row w prc-o" role="group" aria-label="Choices">${r.needsInput.options.map((v, k) => `<button type="button" class="btn o sm" data-act="recPick" data-k="${esc(r.key)}" data-o="${k}">${esc(v.length > 44 ? v.slice(0, 42) + '…' : v)}</button>`).join('')}</div>` : '';
  const flagged = r.finding && r.finding.replaces ? ' They replace the flagged sentence.' : '';
  const ask = need
    ? inc ? `<div class="prc-own"><span class="lab">Your words</span><div class="prc-q">${esc(own)}</div></div>`
      : `<div class="prc-ask"><label class="prc-l" for="prc-${key}-c">${chip('Needs your words', 'y')} ${esc(r.needsInput.prompt)}</label>${opts}<textarea id="prc-${key}-c" class="ed" rows="3" maxlength="${CONTEXT_MAX}" data-in="recCtx" data-k="${esc(r.key)}" placeholder="${esc((r.needsInput.placeholder && r.needsInput.placeholder !== 'Your words.' ? r.needsInput.placeholder : 'Your own words.') + flagged)}">${esc(own)}</textarea></div>`
    : '';
  const cur = ctx.page && ctx.page.path;
  const go = r.act && r.act.kind === 'lauris' && r.act.path && r.act.path !== cur ? `<button type="button" class="btn o sm" data-act="recGo" data-k="${esc(r.key)}" data-path="${esc(r.act.path)}">${esc(r.act.label || 'Open in Lauris')}</button>`
    : r.act && r.act.kind === 'chart' ? `<button type="button" class="btn o sm" data-act="recApp" data-k="${esc(r.key)}" data-href="${esc('#/Authorization?id=' + r.ref)}">Open in Psyflo ↗</button>`
    : r.act && r.act.kind === 'denial' ? `<button type="button" class="btn o sm" data-act="recApp" data-k="${esc(r.key)}" data-href="${esc('#/DenialCase?id=' + r.ref)}">Open in Psyflo ↗</button>` : '';
  const doneOnly = !text && !need;   // an action with no sentence (reassess, open the request): it is marked done, not typed
  const main = inc ? `<button type="button" class="btn o sm" data-act="recReopen" data-k="${esc(r.key)}">Take out</button>`
    : `<button type="button" class="btn p sm" data-act="recInclude" data-k="${esc(r.key)}"${need && !own.trim() ? ' disabled' : ''}>${doneOnly ? 'Mark done' : 'Include'}</button><button type="button" class="btn o sm" data-act="recDismiss" data-k="${esc(r.key)}">Dismiss</button>`;
  return `<li class="prc${inc ? ' inc' : ''}" data-rec="${esc(r.key)}" data-state="${esc(r.state)}"${r.custom ? ' data-custom="1"' : ''}>
    <h3 class="prc-t">${esc(r.title)}</h3><div class="prc-m">${chips}</div>${more}${ask}
    <div class="row w prc-a">${main}${go}${r.custom ? `<button type="button" class="btn o sm" data-act="recRemove" data-k="${esc(r.key)}">Remove</button>` : ''}</div></li>`;
}

function addHTML(ctx, o) {
  const x = xs(ctx); const boxes = o.addBoxes || o.boxes;
  return `<div class="prc prc-add" role="group" aria-label="Add your own suggestion"><h3 class="prc-t">Add your own</h3>
    <label class="lab" for="pra-t">Title</label><input id="pra-t" class="ed" maxlength="120" data-in="recAddTitle" placeholder="For example: Mention the safety plan" value="${esc(x.addTitle)}">
    <label class="lab" for="pra-x" style="margin-top:8px;display:block">What should go in</label><textarea id="pra-x" class="ed" rows="3" maxlength="${CONTEXT_MAX}" data-in="recAddText" placeholder="Your own words. Psyflo does not write this.">${esc(x.addText)}</textarea>
    ${boxes && boxes.length ? `<label class="lab" for="pra-b" style="margin-top:8px;display:block">Which box</label><select id="pra-b" class="tog" style="width:100%" data-ch="recAddBox">${boxes.map(b => `<option value="${esc(b)}"${(x.addBox || boxes[0]) === b ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>` : ''}
    <div class="row w" style="margin-top:10px"><button type="button" class="btn p" data-act="recAddSave">Save</button><button type="button" class="btn o" data-act="recAddCancel">Cancel</button></div></div>`;
}

export function recBlock(ctx, o) {
  const x = xs(ctx); ctx.st.rb = o;
  const s = ctx.S(); const recs = o.recs || [];
  const live = recs.filter(r => r.state !== 'dismissed'); const gone = recs.filter(r => r.state === 'dismissed');
  const sum = summary(s, recs); const limit = o.limit || 4;
  const shown = live.filter((r, i) => x.all || i < limit || r.state === 'included'); const hidden = live.length - shown.length;
  const ready = recs.filter(r => r.state === 'included').length;
  const canApply = o.canApply !== undefined ? o.canApply : ready > 0;
  const head = `<div class="row w prs-h"><h2 class="st" id="prs-h" style="flex:1">${esc(o.heading || 'Suggested by Psyflo')}</h2>${chip(sum.total ? `${sum.included} of ${sum.total} included` : 'Nothing to add', sum.included ? 'g' : 'n')}${ctx.ui.maturity({ level: 'simulated', note: OUTCOME_BASIS })}</div>`;
  const sub = `<p class="hint prs-s">${esc(o.sub || 'You decide. Each card uses stored records or your own words. Numbers marked sample are illustrative.')}</p>`;
  const list = shown.length ? `<ul class="prl" aria-labelledby="prs-h">${shown.map(r => cardHTML(ctx, r, o)).join('')}</ul>` : `<p class="hint">${esc(o.empty || 'Nothing to suggest right now. The record answers what a reviewer usually asks.')}</p>`;
  const more = hidden > 0 ? `<button type="button" class="btn o sm" data-act="recMore">Show ${plural(hidden, 'more suggestion', 'more suggestions')}</button>` : x.all && live.length > limit ? `<button type="button" class="btn o sm" data-act="recMore">Show fewer</button>` : '';
  const dismissed = gone.length ? `<details class="acc prs-g" data-acc="prs-gone"><summary><span>${plural(gone.length, 'dismissed suggestion', 'dismissed suggestions')}</span></summary><div>${gone.map(r => `<div class="row w prs-gr" data-rec="${esc(r.key)}"><span style="flex:1">${esc(r.title)}</span><button type="button" class="btn o sm" data-act="recReopen" data-k="${esc(r.key)}">Bring back</button></div>`).join('')}</div></details>` : '';
  const foot = `<div class="row w prs-f"><button type="button" class="btn o" data-act="recAddOpen" ${x.add ? 'aria-expanded="true"' : 'aria-expanded="false"'}>Add your own</button><button type="button" class="btn p" data-act="recApply" style="flex:1"${canApply ? '' : ' disabled'}>${esc(o.applyLabel || 'Apply selected')}</button></div>${o.applyHint ? `<p class="hint">${esc(o.applyHint)}</p>` : ''}`;
  return `<section class="prs" aria-label="Suggested by Psyflo" data-rb data-scope="${esc(o.scope)}">${head}${sub}${list}${more}${dismissed}${x.add ? addHTML(ctx, o) : ''}${foot}</section>`;
}

// ---------------------------------------------------------------- handlers
const keyOf = el => el.dataset.k || (el.closest('[data-rec]') || { dataset: {} }).dataset.rec;
const recOf = (ctx, key) => ((ctx.st.rb && ctx.st.rb.recs) || []).find(r => r.key === key);
async function decide(ctx, key, state, context) {
  const { scope, ref, fields } = ctx.st.rb; const args = { scope, ref, key, state };
  if (context !== undefined) args.context = context; if (fields) args.fields = fields;
  return ctx.do('recs.decide', args);
}
export const recActs = {
  async recInclude(el, ctx) {
    const key = keyOf(el); const r = recOf(ctx, key); if (!r) return; const x = xs(ctx);
    const words = x.txt[key] !== undefined ? x.txt[key] : r.context || '';
    if (r.needsInput && !words.trim()) { ctx.flash('Write your own words first. Psyflo has no stored record to write this from.', 'y'); return; }
    await decide(ctx, key, 'included', r.needsInput ? words : undefined); delete x.txt[key];
  },
  async recDismiss(el, ctx) { await decide(ctx, keyOf(el), 'dismissed'); },
  async recReopen(el, ctx) { await decide(ctx, keyOf(el), 'open'); },
  async recRemove(el, ctx) { const { scope, ref } = ctx.st.rb; await ctx.do('recs.remove', { scope, ref, key: keyOf(el) }); },
  recMore(el, ctx) { const x = xs(ctx); x.all = !x.all; ctx.draw(); },
  recPick(el, ctx) {   // a choice from the finding's own list fills the box for the person to edit: it is their answer once they include it
    const r = recOf(ctx, keyOf(el)); const v = r && r.needsInput.options[+el.dataset.o]; if (v == null) return;
    xs(ctx).txt[r.key] = v; const ta = el.closest('.prc').querySelector('textarea'); if (ta) { ta.value = v; ta.focus(); }
    const b = el.closest('.prc').querySelector('[data-act="recInclude"]'); if (b) b.disabled = false;
  },
  recGo(el, ctx) { return ctx.nav(el.dataset.path); },
  recApp(el, ctx) { ctx.openApp(el.dataset.href); },
  recAddOpen(el, ctx) { const x = xs(ctx); x.add = !x.add; ctx.draw(); },
  recAddCancel(el, ctx) { const x = xs(ctx); x.add = false; ctx.draw(); },
  async recAddSave(el, ctx) {
    const { scope, ref, boxes, addBoxes } = ctx.st.rb; const x = xs(ctx); const list = addBoxes || boxes;
    const args = { scope, ref, title: x.addTitle, text: x.addText }; if (list && list.length) args.box = x.addBox || list[0];
    await ctx.do('recs.add', args);
    Object.assign(x, { add: false, addTitle: '', addText: '' }); ctx.flash('Added. It is included; Apply selected puts it in.');
  },
  async recApply(el, ctx) {
    const rb = ctx.st.rb; const inc = rb.recs.filter(r => r.state === 'included');
    if (!inc.length) { ctx.flash('Nothing is included yet. Include the suggestions you want, then apply them.', 'y'); return; }
    await rb.apply(ctx, inc);
  }
};
export const recIns = {
  recCtx(el, ctx) { xs(ctx).txt[el.dataset.k] = el.value; const b = el.closest('.prc').querySelector('[data-act="recInclude"]'); if (b) b.disabled = !el.value.trim(); },
  recAddTitle(el, ctx) { xs(ctx).addTitle = el.value; },
  recAddText(el, ctx) { xs(ctx).addText = el.value; }
};
export const recChs = { recAddBox(el, ctx) { xs(ctx).addBox = el.value; } };

// ---------------------------------------------------------------- typing the included text into the open Lauris form
// The boxes to type: each included card's text goes into its box after what the person already has there (applyToBoxes: never twice, a placeholder is
// replaced, a box the form does not have is reported, not invented). `live` = [{label,value}] as the bridge last read them from the open form.
export function typableFrom(applyResult, live) {
  const have = new Set(live.map(b => b.label));
  const typed = applyResult.applied.filter(a => have.has(a.box)); const lost = applyResult.applied.filter(a => !have.has(a.box));
  const labels = [...new Set(typed.map(a => a.box))];
  return { boxes: labels.map(l => applyResult.boxes.find(b => b.label === l)).filter(Boolean).map(b => ({ label: b.label, value: b.value })), ids: typed.map(a => a.id), lost };
}
export { textOf };
