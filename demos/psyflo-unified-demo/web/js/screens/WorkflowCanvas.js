// Settings > Workflows (round 5): the canvas markup. Pure string building (no listeners): WorkflowMap.js binds the pointer and key handling.
// Layout: a scrolling viewport (.wm-canvas) holding a stage (.wm-stage) with a dotted 20 px grid, an SVG layer for the lines (under the cards)
// and absolutely placed block cards. The locked guardrail is drawn outside the stage, fixed to the bottom right of the viewport.
import { ui, chipMod } from '../ui/index.js';
import { esc } from '../runtime.js';
import { BLOCKS, KIND_LABEL, KIND_ICON, LOCKED_WHY, portsOf } from '../shared/workflows/catalog.js';
import { NODE_W, NODE_H, PORT_Y, PORT_LABEL, summaryOf, nodeTitle, worstRule, isLocked, edgesFrom } from './WorkflowModel.js';

const icon = (n, s) => ui.icon(n, s);
export const edgePath = (ax, ay, bx, by) => { const dx = Math.max(50, Math.abs(bx - ax) / 2); return `M${ax} ${ay}C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`; };
export const outPos = (n, port) => [n.x + NODE_W, n.y + PORT_Y[port]];
export const inPos = n => [n.x - 3, n.y + NODE_H / 2];

// the verification of a rule as an icon with the definition on hover (tone: green official, blue payer, amber the rest)
const TONE = { official: 'g', payer: 'b', harvest: 'y', unverified: 'y' };
export function verifHint(r, o = {}) {
  const k = chipMod.verificationKind(r); const V = chipMod.VERIFICATION[k];
  const text = [V.full, r.source && r.source.length > 150 ? r.source.slice(0, 147) + '...' : r.source].filter(Boolean).join('. ');
  return ui.hint(V.icon, text, { tone: TONE[k], label: `${V.text}: ${r.label || ''}`.trim(), ...o });
}
export const verifClass = r => 'wm-v wm-v--' + chipMod.verificationKind(r);

function nodeAria(c, n, probs) {
  const b = BLOCKS[n.block]; const rs = (n.rules || []).length;
  return `${KIND_LABEL[b.kind]} block: ${nodeTitle(n)}. ${summaryOf(c.s, n)}.${rs ? ` ${rs} rule${rs === 1 ? '' : 's'}.` : ''}${probs.length ? ' ' + probs.map(p => (p.level === 'error' ? 'Problem: ' : 'Warning: ') + p.text).join(' ') : ''}`;
}
function badges(c, n, probs) {
  const out = []; const rs = (n.rules || []).length;
  if (rs) {
    const w = worstRule(c.s, n); const k = w ? chipMod.verificationKind(w) : 'unverified'; const V = chipMod.VERIFICATION[k];
    out.push(`<span class="ui-hint wm-badge wm-badge--${TONE[k]}" data-ui-hint><span class="wm-badge__i">${icon('shield', 12)}${rs}</span><span class="ui-hint__t" aria-hidden="true">${rs} rule${rs === 1 ? '' : 's'}${w ? ' · weakest source: ' + esc(V.full) : ''}</span></span>`);
  }
  if (probs.length) {
    const err = probs.some(p => p.level === 'error');
    out.push(`<span class="ui-hint wm-badge wm-badge--${err ? 'r' : 'y'}" data-ui-hint><span class="wm-badge__i">${icon('alert', 12)}${probs.length}</span><span class="ui-hint__t" aria-hidden="true">${esc(probs.map(p => p.text).join(' '))}</span></span>`);
  }
  return out.join('');
}

function nodeHtml(c, n) {
  const b = BLOCKS[n.block]; const kind = b.kind; const probs = (c.byNode[n.id] || []);
  const sel = c.sel && c.sel.type === 'node' && c.sel.id === n.id; const lit = c.lit && c.lit.nodes.has(n.id);
  const linking = c.linking && c.linking.from !== n.id && kind !== 'trigger';
  const ports = portsOf(n.block).map(p => {
    const es = edgesFrom(c.wf, n.id, p); const on = es.length > 0; const lbl = PORT_LABEL[p];
    const targets = es.map(e => c.wf.nodes.find(x => x.id === e.to)).filter(Boolean).map(nodeTitle);
    const name = `${p === 'out' ? 'Link from' : lbl + ' exit of'} ${nodeTitle(n)}${targets.length ? '. Now goes to ' + targets.join(' and ') : '. Not linked yet'}. Drag to another block, or press Enter and then pick the block to link.`;
    return `<button type="button" class="wm-port wm-port--${p}${on ? ' is-on' : ''}${c.linking && c.linking.from === n.id && c.linking.port === p ? ' is-active' : ''}" data-port="${p}" data-node="${esc(n.id)}" data-fk="port-${esc(n.id)}-${p}" style="top:${PORT_Y[p] - 12}px" aria-label="${esc(name)}"><i></i></button>${p === 'out' ? '' : `<span class="wm-port__l" style="top:${PORT_Y[p] - 8}px" aria-hidden="true">${lbl}</span>`}`;
  }).join('');
  return `<div class="wm-node wm-k-${kind}${sel ? ' is-sel' : ''}${lit ? ' is-lit' : ''}${linking ? ' is-target' : ''}${probs.some(p => p.level === 'error') ? ' is-bad' : ''}" data-node="${esc(n.id)}" data-fk="node-${esc(n.id)}" style="left:${n.x}px;top:${n.y}px" tabindex="0" role="group" aria-roledescription="block" aria-describedby="wm-kbd" aria-label="${esc(nodeAria(c, n, probs))}">
    <div class="wm-node__top"><span class="wm-node__k">${KIND_LABEL[kind]}</span><span class="wm-node__bd">${badges(c, n, probs)}</span></div>
    <div class="wm-node__t">${icon(b.icon, 14)}<b>${esc(nodeTitle(n))}</b></div>
    <div class="wm-node__s">${esc(summaryOf(c.s, n))}</div>
    ${kind === 'trigger' ? '' : '<span class="wm-port wm-port--in" aria-hidden="true"></span>'}${ports}</div>`;
}

export function lockedHtml() {
  const b = BLOCKS.never_auto;
  return `<div class="wm-locked" role="note" aria-label="${esc(b.label + '. ' + b.def)}">${icon('lock', 16)}<b>${esc(b.label)}</b>${ui.hint('info', b.def + ' ' + LOCKED_WHY, { size: 14, label: 'About this guardrail' })}</div>`;
}

export function canvasHtml(c) {
  const wf = c.wf; const nodes = wf.nodes.filter(n => BLOCKS[n.block] && !isLocked(n)); const by = new Map(nodes.map(n => [n.id, n]));
  const w = Math.max(760, ...nodes.map(n => n.x + NODE_W + 140)), h = Math.max(440, ...nodes.map(n => n.y + NODE_H + 120));
  const edges = wf.edges.filter(e => by.has(e.from) && by.has(e.to) && portsOf(by.get(e.from).block).includes(e.port));
  const paths = edges.map(e => {
    const a = by.get(e.from), t = by.get(e.to); const [ax, ay] = outPos(a, e.port), [bx, by2] = inPos(t); const d = edgePath(ax, ay, bx, by2);
    const sel = c.sel && c.sel.type === 'edge' && c.sel.id === e.id; const lit = c.lit && c.lit.edges.has(e.id);
    return `<g class="wm-edge${sel ? ' is-sel' : ''}${lit ? ' is-lit' : ''}" data-edge="${esc(e.id)}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-port="${e.port}"><path class="wm-edge__p" d="${d}" marker-end="url(#wm-arr${sel ? '-sel' : lit ? '-lit' : ''})"/><path class="wm-edge__hit" d="${d}" tabindex="0" role="button" data-fk="edge-${esc(e.id)}" aria-label="${esc(`Link from ${nodeTitle(a)}${e.port === 'out' ? '' : ' (' + PORT_LABEL[e.port] + ')'} to ${nodeTitle(t)}. Press Delete to remove it.`)}"/></g>`;
  }).join('');
  const marker = (id, cls) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="${cls}" d="M1 1L9 5L1 9z"/></marker>`;
  return `<div class="wm-cv">
    <div class="wm-canvas" id="wm-canvas" role="region" aria-label="Workflow map" tabindex="-1">
      <div class="wm-stage" id="wm-stage" style="min-width:${w}px;min-height:${h}px">
        <svg class="wm-lines" width="${w}" height="${h}" role="group" aria-label="Links"><defs>${marker('wm-arr', 'wm-arr')}${marker('wm-arr-sel', 'wm-arr wm-arr--sel')}${marker('wm-arr-lit', 'wm-arr wm-arr--lit')}</defs>${paths}<path id="wm-temp" class="wm-edge__tmp" d="" hidden/></svg>
        ${nodes.map(n => nodeHtml(c, n)).join('')}
        ${nodes.length ? '' : `<div class="wm-empty">${icon('bolt', 20)}<b>Start with a When block</b><span>Drag one here from the left, or click it. Enter works too.</span></div>`}
      </div>
    </div>
    ${lockedHtml()}
    <p class="ui-sr" id="wm-kbd">Press Enter to edit the block. Arrow keys move it by one grid step, Shift and an arrow by five. Delete removes it. The Logic section of the editor links blocks without dragging.</p>
  </div>`;
}
