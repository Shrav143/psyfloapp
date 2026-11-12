// Settings > Workflows (round 5): the inspector. One panel for the selected block (definition, settings, rules and requirements, logic), the selected
// line, or, with nothing selected, the workflow itself (status, problems, history). Also the next-step pickers the outline and the keyboard use
// instead of dragging. Pure string building; WorkflowMap.js handles the events (data-wm, data-wmp, data-next).
import { ui } from '../ui/index.js';
import { esc } from '../runtime.js';
import { rule } from '../shared/rules.js';
import { BLOCKS, KINDS, KIND_LABEL, KIND_ICON, ROLE_OPTIONS, portsOf } from '../shared/workflows/catalog.js';
import { PORT_LABEL, summaryOf, nodeTitle, nodeById, edgesFrom, canLink, isLocked } from './WorkflowModel.js';
import { verifHint } from './WorkflowCanvas.js';
import { showValue } from './SettingsData.js';

const icon = (n, s) => ui.icon(n, s);
const check = (attrs, label, on) => `<label class="wm-check"><input type="checkbox" ${attrs}${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`;

// ---- one typed control for a catalog parameter ----
function field(c, n, key, p) {
  const id = `wm-p-${key}`; const val = (n.params || {})[key] ?? p.default; const help = p.help ? ui.hint('info', p.help, { size: 14 }) : '';
  const label = `<label class="ui-field__l" for="${id}">${esc(p.label)}${help}</label>`;
  const legend = `<legend class="ui-field__l">${esc(p.label)}${help}</legend>`;
  if (p.rule) {
    const r = rule(c.s, p.rule); const live = r.missing ? '—' : showValue(r);
    return `<div class="ui-field wm-rb">${label}<div class="wm-rb__row"><output class="wm-rb__v" id="${id}">${esc(live)}</output>${r.missing ? '' : verifHint(r)}${ui.hint('gear', 'This number is a rule. Editing it changes the rule everywhere in Psyflo, not only in this workflow. It asks why and is audited.', { cls: 'ui-hint--act', label: 'Edit the rule: ' + (r.label || p.rule), extra: `data-wm="editRule" data-key="${esc(p.rule)}" data-fk="fe-${esc(p.rule)}" data-ui-return="fe-${esc(p.rule)}"` })}</div></div>`;
  }
  switch (p.type) {
    case 'number': return `<div class="ui-field">${label}<div class="wm-num"><input class="ui-input" id="${id}" type="number" inputmode="numeric" min="${p.min}" max="${p.max}" step="1" value="${esc(val ?? '')}" data-wmp="${key}" data-t="number"><span>${esc(p.unit || '')}</span></div><span class="ui-field__h">${p.min} to ${p.max}</span></div>`;
    case 'select': return `<div class="ui-field">${label}<select class="ui-select" id="${id}" data-wmp="${key}" data-t="select">${p.options.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    case 'text': return `<div class="ui-field">${label}<textarea class="ui-input ui-textarea" id="${id}" rows="2" maxlength="${p.max || 120}" data-wmp="${key}" data-t="text">${esc(val ?? '')}</textarea></div>`;
    case 'bool': return `<div class="ui-field">${check(`id="${id}" data-wmp="${key}" data-t="bool"`, p.label, !!val)}</div>`;
    case 'multi': case 'roles': case 'payers': {
      const opts = p.type === 'roles' ? ROLE_OPTIONS : p.type === 'payers' ? ((c.s.payers || []).map(x => [x.id, x.name])) : p.options;
      const cur = Array.isArray(val) ? val : [];
      return `<fieldset class="ui-field wm-fs" id="${id}">${legend}<div class="wm-checks">${opts.map(([v, l]) => check(`data-wmp="${key}" data-t="set" data-v="${esc(v)}" data-fk="wmp-${key}-${esc(v)}"`, l, cur.includes(v))).join('')}</div></fieldset>`;
    }
    default: return '';
  }
}

// ---- next-step pickers (the keyboard and outline way to link). An exit may lead to several blocks: the links are listed (each with a remove icon),
// and the select adds one more: to a block on the map, or to a new block.
export function pickerHtml(c, n, port, o = {}) {
  const links = edgesFrom(c.wf, n.id, port); const id = o.id || `wm-next-${n.id}-${port}`;
  const targets = c.wf.nodes.filter(t => t.id !== n.id && !isLocked(t) && BLOCKS[t.block] && canLink(c.wf, n.id, port, t.id).ok);
  const news = KINDS.filter(k => k !== 'trigger').map(k => `<optgroup label="Add a new ${esc(KIND_LABEL[k])} block">${Object.entries(BLOCKS).filter(([, b]) => b.kind === k && !b.locked).map(([bid, b]) => `<option value="new:${bid}">${esc(b.short)}</option>`).join('')}</optgroup>`).join('');
  const label = o.label || PORT_LABEL[port];
  const list = links.length ? `<ul class="wm-links">${links.map(e => { const t = nodeById(c.wf, e.to); return t ? `<li><span>${esc(KIND_LABEL[BLOCKS[t.block].kind])}: ${esc(summaryOf(c.s, t))}</span>${ui.hint('x', 'Remove this link', { cls: 'ui-hint--act', label: `Remove the link to ${nodeTitle(t)}`, extra: `data-wm="removeEdge" data-id="${esc(e.id)}" data-fk="rl-${esc(e.id)}"` })}</li>` : ''; }).join('')}</ul>` : '<p class="wm-muted wm-links__none">Nothing yet. The path ends here.</p>';
  return `<div class="ui-field wm-logic"><span class="ui-field__l" id="${id}-l">${esc(label)}</span>${list}<label class="ui-sr" for="${id}">${esc(label)}: add a link</label><select class="ui-select" id="${id}" data-next="${port}" data-node="${esc(n.id)}"><option value="">${links.length ? 'Add another link' : 'Link to a block'}</option>${targets.length ? `<optgroup label="A block on the map">${targets.map(t => `<option value="node:${esc(t.id)}">${esc(KIND_LABEL[BLOCKS[t.block].kind] + ': ' + summaryOf(c.s, t))}</option>`).join('')}</optgroup>` : ''}${news}</select></div>`;
}
// "+ Add a block here" picker for the outline: a native select (works with a keyboard and on a phone)
export function addPickerHtml(c, n, port, o = {}) {
  const id = `wm-add-${n ? n.id : 'start'}-${port || 'out'}`; const only = o.only;
  const groups = (only || KINDS.filter(k => k !== 'trigger' || !n)).map(k => `<optgroup label="${esc(KIND_LABEL[k])}">${Object.entries(BLOCKS).filter(([, b]) => b.kind === k && !b.locked).map(([bid, b]) => `<option value="${bid}">${esc(b.short)}</option>`).join('')}</optgroup>`).join('');
  return `<div class="wm-addp"><label class="ui-sr" for="${id}">${esc(o.label || 'Add a block here')}</label>${icon('plus', 14)}<select class="ui-select wm-addp__s" id="${id}" data-add="1" data-node="${n ? esc(n.id) : ''}" data-port="${port || ''}"><option value="">${esc(o.label || 'Add a block here')}</option>${groups}</select></div>`;
}

// ---- rules and requirements of a block ----
function ruleRows(c, n) {
  const rows = (n.rules || []).map(k => rule(c.s, k));
  if (!rows.length) return `<p class="wm-muted">No rules attached. A rule gives a number its source and its check.</p>`;
  return `<ul class="wm-rl">${rows.map(r => `<li class="wm-rl__i"><div class="wm-rl__t"><b>${esc(r.label || r.key)}</b><small>${r.missing ? 'This rule is not in the table.' : esc(showValue(r)) + (r.enabled === false ? ' · off' : '')}</small></div><div class="wm-rl__a">${r.missing ? '' : verifHint(r)}${(r.history || []).length ? ui.hint('refresh', `${r.history.length} change${r.history.length === 1 ? '' : 's'}, kept with a reason`, { text: String(r.history.length), label: 'Rule history: ' + (r.label || r.key) }) : ''}${r.missing ? '' : ui.hint('pencil', 'Edit the value. This changes the rule everywhere, and it asks why.', { cls: 'ui-hint--act', label: 'Edit rule: ' + r.label, extra: `data-wm="editRule" data-key="${esc(r.key)}" data-fk="re-${esc(r.key)}" data-ui-return="re-${esc(r.key)}"` })}${ui.hint('x', 'Take the rule off this block. The rule stays in the table.', { cls: 'ui-hint--act', label: 'Detach rule: ' + (r.label || r.key), extra: `data-wm="detachRule" data-key="${esc(r.key)}" data-fk="rd-${esc(r.key)}"` })}</div></li>`).join('')}</ul>`;
}

function problemList(list, selectable) {
  if (!list.length) return '';
  return `<ul class="wm-probs" aria-label="Problems">${list.map(p => `<li class="wm-prob wm-prob--${p.level}">${icon(p.level === 'error' ? 'alert' : 'info', 14)}${selectable && p.node ? `<button type="button" class="ui-linkbtn" data-wm="selectNode" data-id="${esc(p.node)}">${esc(p.text)}</button>` : `<span>${esc(p.text)}</span>`}</li>`).join('')}</ul>`;
}

const head = (inner, close = true) => `<header class="wm-insp__h">${inner}${close ? `<button type="button" class="wm-x" data-wm="closeInsp" aria-label="Close the editor">${icon('close', 16)}</button>` : ''}</header>`;

function nodeInspector(c, n) {
  const b = BLOCKS[n.block];
  const probs = (c.byNode[n.id] || []);
  const params = Object.entries(b.params || {});
  return `${head(`<span class="wm-kind wm-kind--${b.kind}">${icon(KIND_ICON[b.kind], 14)}${KIND_LABEL[b.kind]}</span><h2 class="wm-h" id="wm-insp-t" tabindex="-1">${esc(b.short || b.label)}</h2>${ui.hint('info', b.def, { label: 'What this block does' })}`)}
  ${problemList(probs, false)}
  <section class="wm-sec" aria-label="Settings">${params.length ? params.map(([k, p]) => field(c, n, k, p)).join('') : '<p class="wm-muted">This block has no settings. It works as it is.</p>'}</section>
  <section class="wm-sec" aria-labelledby="wm-h-rules"><h3 class="wm-h3" id="wm-h-rules">Rules and requirements ${ui.hint('info', 'Rows of the rules table this block relies on, each with its source and check. A change to a rule here changes it everywhere.', { size: 14 })}</h3>${ruleRows(c, n)}<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-wm="pickRule" data-id="${esc(n.id)}">${icon('plus', 14)} Add a rule</button></section>
  ${portsOf(n.block).length ? `<section class="wm-sec" aria-labelledby="wm-h-logic"><h3 class="wm-h3" id="wm-h-logic">Logic ${ui.hint('info', b.kind === 'condition' ? 'Where the path goes when the answer is Yes, and when it is No.' : 'The next block on the path.', { size: 14 })}</h3>${portsOf(n.block).map(p => pickerHtml(c, n, p, { label: b.kind === 'condition' ? (p === 'yes' ? 'If yes, next' : 'If no, next') : 'Next' })).join('')}</section>` : ''}
  <div class="wm-sec"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm wm-danger" data-wm="removeNode" data-id="${esc(n.id)}">${icon('trash', 14)} Remove this block</button></div>`;
}
function edgeInspector(c, e) {
  const a = nodeById(c.wf, e.from), t = nodeById(c.wf, e.to); if (!a || !t) return summaryInspector(c);
  return `${head(`<span class="wm-kind wm-kind--link">${icon('link', 14)}Link</span><h2 class="wm-h" id="wm-insp-t" tabindex="-1">${esc(nodeTitle(a))} to ${esc(nodeTitle(t))}</h2>`)}
  <dl class="ui-dl wm-dl"><div class="ui-dl__r"><dt>From</dt><dd>${esc(summaryOf(c.s, a))}${e.port === 'out' ? '' : ` (${PORT_LABEL[e.port]})`}</dd></div><div class="ui-dl__r"><dt>To</dt><dd>${esc(summaryOf(c.s, t))}</dd></div></dl>
  <div class="wm-sec"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm wm-danger" data-wm="removeEdge" data-id="${esc(e.id)}">${icon('trash', 14)} Remove this link</button></div>`;
}
function summaryInspector(c) {
  const wf = c.saved; const nb = c.wf.nodes.filter(n => !isLocked(n)).length;
  const probs = c.problems;
  const hist = (wf.history || []).slice().reverse();
  const pend = wf.pending;
  return `${head(`<h2 class="wm-h" id="wm-insp-t" tabindex="-1">This workflow</h2>`, c.narrowish)}
  ${pend ? `<div class="wm-pend" role="status">${icon('clock', 16)}<div><b>Waiting for a second person</b><small>Proposed by ${esc(c.staffName(pend.by))}${pend.at ? ' · ' + esc(c.fmt(pend.at)) : ''}. It takes effect when a different administrator or clinician confirms.</small></div>${c.canConfirm ? `<div class="wm-pend__a"><button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-wm="confirm" data-decision="approve">Approve</button><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-wm="confirm" data-decision="decline">Decline</button></div>` : ''}</div>` : ''}
  <div class="ui-field"><label class="ui-field__l" for="wm-desc">What it is for</label><textarea class="ui-input ui-textarea" id="wm-desc" rows="2" maxlength="200" data-wm-desc="1">${esc(c.wf.description || '')}</textarea></div>
  <p class="wm-muted">${nb} block${nb === 1 ? '' : 's'} · ${c.wf.edges.length} link${c.wf.edges.length === 1 ? '' : 's'} · ${c.saved.enabled ? 'On' : 'Off'} · ${c.dirty ? 'unsaved changes' : 'Saved · v' + (wf.version || 1)}</p>
  <section class="wm-sec" aria-labelledby="wm-h-prob"><h3 class="wm-h3" id="wm-h-prob">Problems ${probs.length ? `<span class="wm-count">${probs.length}</span>` : ''}</h3>${probs.length ? problemList(probs, true) : `<p class="wm-ok">${icon('check', 14)} Nothing to fix.</p>`}</section>
  <details class="wm-hist"><summary>Version history <span class="wm-count">${hist.length}</span></summary>${hist.length ? `<ol class="wm-histl">${hist.map(h => `<li><b>v${esc(h.version)}</b> ${esc(c.fmt(h.at))} · ${esc(c.staffName(h.by))}${h.note ? `<small>${esc(h.note)}</small>` : ''}</li>`).join('')}</ol>` : '<p class="wm-muted">No saved versions yet.</p>'}</details>`;
}

export function inspectorHtml(c) {
  if (c.sel && c.sel.type === 'node') { const n = nodeById(c.wf, c.sel.id); if (n && !isLocked(n)) return nodeInspector(c, n); }
  if (c.sel && c.sel.type === 'edge') { const e = c.wf.edges.find(x => x.id === c.sel.id); if (e) return edgeInspector(c, e); }
  return summaryInspector(c);
}
