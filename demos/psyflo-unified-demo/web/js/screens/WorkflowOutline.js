// Settings > Workflows (round 5): the Outline view. The same workflow as an indented list: the 390 px layout, the screen-reader view and the
// keyboard way to do everything the map does without dragging (edit, remove, add a block at the end of any path).
import { ui } from '../ui/index.js';
import { esc } from '../runtime.js';
import { BLOCKS, KIND_LABEL, LOCKED_WHY } from '../shared/workflows/catalog.js';
import { outlineTree, summaryOf, nodeTitle, PORT_LABEL, worstRule } from './WorkflowModel.js';
import { addPickerHtml } from './WorkflowInspector.js';
import { chipMod } from '../ui/index.js';

const icon = (n, s) => ui.icon(n, s);
const TONE = { official: 'g', payer: 'b', harvest: 'y', unverified: 'y' };

function badges(c, n) {
  const out = []; const rs = (n.rules || []).length; const probs = c.byNode[n.id] || [];
  if (rs) { const w = worstRule(c.s, n); const k = w ? chipMod.verificationKind(w) : 'unverified'; out.push(ui.hint('shield', `${rs} rule${rs === 1 ? '' : 's'} on this block. Weakest source: ${chipMod.VERIFICATION[k].full}.`, { tone: TONE[k], text: String(rs), label: `${rs} rule${rs === 1 ? '' : 's'}, weakest source ${chipMod.VERIFICATION[k].full}` })); }
  if (probs.length) out.push(ui.hint('alert', probs.map(p => p.text).join(' '), { tone: probs.some(p => p.level === 'error') ? 'r' : 'y', text: String(probs.length), label: 'Problems: ' + probs.map(p => p.text).join(' ') }));
  return out.join('');
}

function row(c, n, ref) {
  const b = BLOCKS[n.block]; const sel = c.sel && c.sel.type === 'node' && c.sel.id === n.id; const lit = c.lit && c.lit.nodes.has(n.id);
  const title = nodeTitle(n);
  return `<div class="wm-ol__row wm-k-${b.kind}${sel ? ' is-sel' : ''}${lit ? ' is-lit' : ''}${ref ? ' is-ref' : ''}" data-node="${esc(n.id)}">
    <span class="wm-ol__k">${KIND_LABEL[b.kind]}</span>
    <span class="wm-ol__t">${icon(b.icon, 16)}<span class="wm-ol__tt"><b>${esc(title)}</b><small>${ref ? 'Continues here (shown above)' : esc(summaryOf(c.s, n))}</small></span></span>
    <span class="wm-ol__bd">${ref ? '' : badges(c, n)}</span>
    <span class="wm-ol__a">${ui.hint('pencil', 'Edit this block', { cls: 'ui-hint--act', label: `Edit: ${title}, ${summaryOf(c.s, n)}`, extra: `data-wm="editNode" data-id="${esc(n.id)}" data-fk="ol-edit-${esc(n.id)}"` })}${ui.hint('trash', 'Remove this block and its links', { cls: 'ui-hint--act', label: `Remove: ${title}, ${summaryOf(c.s, n)}`, extra: `data-wm="removeNode" data-id="${esc(n.id)}" data-fk="ol-rm-${esc(n.id)}"` })}</span>
  </div>`;
}

function tree(c, t) {
  const n = t.node;
  if (t.ref) return `<li class="wm-ol__li">${row(c, n, true)}</li>`;
  const kids = t.kids.map(k => {
    const items = k.links.map(l => tree(c, l.child)).join('') + (k.links.length ? '' : `<li class="wm-ol__li wm-ol__li--end">${addPickerHtml(c, n, k.port, { label: k.port === 'out' ? 'Add a block here' : `Add a block to ${PORT_LABEL[k.port]}` })}</li>`);
    return k.port === 'out' ? items : `<li class="wm-ol__li wm-ol__br"><span class="wm-ol__lab wm-ol__lab--${k.port}">${PORT_LABEL[k.port]}</span><ol class="wm-ol">${items}</ol></li>`;
  }).join('');
  return `<li class="wm-ol__li">${row(c, n)}${kids ? `<ol class="wm-ol">${kids}</ol>` : ''}</li>`;
}

export function outlineHtml(c) {
  const { roots, orphans } = outlineTree(c.wf);
  return `<section class="wm-outline" id="wm-outline" aria-label="Outline of the workflow">
    ${roots.length ? `<ol class="wm-ol wm-ol--root">${roots.map(t => tree(c, t)).join('')}</ol>` : `<p class="wm-empty wm-empty--ol">${icon('bolt', 20)}<b>Start with a When block</b></p>`}
    <div class="wm-ol__start">${addPickerHtml(c, null, 'out', { only: ['trigger'], label: roots.length ? 'Add another When block' : 'Add a When block' })}</div>
    ${orphans.length ? `<h3 class="wm-h3 wm-ol__oh">Not connected ${ui.hint('info', 'These blocks are not reachable from a When block, so they never run. Link them in or remove them.', { size: 14 })}</h3><ol class="wm-ol wm-ol--root">${orphans.map(t => tree(c, t)).join('')}</ol>` : ''}
    <div class="wm-ol__row wm-ol__row--locked wm-k-guardrail" role="note"><span class="wm-ol__k">Always</span><span class="wm-ol__t">${icon('lock', 16)}<span class="wm-ol__tt"><b>${esc(BLOCKS.never_auto.label)}</b><small>On in every workflow. ${esc(LOCKED_WHY)}</small></span></span></div>
  </section>`;
}
