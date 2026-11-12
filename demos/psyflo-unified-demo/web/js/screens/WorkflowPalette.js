// Settings > Workflows (round 5): the palette. Blocks by group (When, If, Then, Always), the rule library (the old Rules tab: search the rules by label,
// key or source), and the steps that stay with a person, shown locked. Every block and rule is a button (Enter or a click adds it) that can also be
// dragged onto the canvas; the definition shows on hover and on keyboard focus.
import { ui } from '../ui/index.js';
import { esc } from '../runtime.js';
import { BLOCKS, KINDS, KIND_LABEL, KIND_ICON, LOCKED_ACTIONS, LOCKED_WHY } from '../shared/workflows/catalog.js';
import { CATEGORY_CHIPS, areaOf, showValue } from './SettingsData.js';
import { chipMod } from '../ui/index.js';

const icon = (n, s) => ui.icon(n, s);
const TONE = { official: 'g', payer: 'b', harvest: 'y', unverified: 'y' };

export const rulesRows = s => (s.rules || []).map(r => ({ ...r, area: areaOf(r.key) }));
export function filterRules(rows, f) {
  const q = (f.q || '').toLowerCase();
  return rows.filter(r => (!f.cat || r.category === f.cat) && (!f.area || r.area === f.area) && (!q || (r.label + ' ' + r.key + ' ' + (r.source || '') + ' ' + showValue(r) + ' ' + (r.register || '')).toLowerCase().includes(q)));
}

function blockItem(id, b) {
  const tid = 'wm-pt-' + id;
  return `<li class="wm-pi"><span class="ui-hint wm-host" data-ui-hint><button type="button" class="wm-pi__b wm-k-${b.kind}" data-wm="addBlock" data-block="${id}" data-fk="pal-${id}" aria-describedby="${tid}"><span class="wm-pi__i">${icon(b.icon, 16)}</span><span class="wm-pi__t">${esc(b.short)}</span><span class="wm-pi__g">${icon('grip', 14)}</span></button><span class="ui-hint__t" id="${tid}" aria-hidden="true">${esc(b.def)}</span></span></li>`;
}
function ruleItem(r, picked) {
  const k = chipMod.verificationKind(r); const V = chipMod.VERIFICATION[k]; const tid = 'wm-rt-' + r.key.replace(/[^\w]/g, '-');
  const tip = `${r.label}: ${showValue(r)}. ${V.full}. ${(r.source || '').slice(0, 160)}`;
  return `<li class="wm-pi wm-pi--rule"><span class="ui-hint wm-host" data-ui-hint><button type="button" class="wm-pi__b wm-ri" data-wm="addRule" data-key="${esc(r.key)}" data-fk="rule-${esc(r.key)}" aria-describedby="${tid}"><span class="wm-pi__i wm-v wm-v--${k}">${icon(V.icon, 14)}</span><span class="wm-pi__t">${esc(r.label)}<small>${esc(showValue(r))}</small></span><span class="wm-pi__g">${icon('grip', 14)}</span></button><span class="ui-hint__t" id="${tid}" aria-hidden="true">${esc(tip)}</span></span>${ui.hint('pencil', 'Edit this rule. It changes the rule everywhere, and it asks why.', { cls: 'ui-hint--act', label: 'Edit rule: ' + r.label, extra: `data-wm="editRule" data-key="${esc(r.key)}" data-fk="rule-edit-${esc(r.key)}"` })}</li>`;
}

export function libraryHtml(c) {
  const all = rulesRows(c.s); const f = c.lib; const rows = filterRules(all, f);
  const areas = [...new Set(all.map(r => r.area))].sort();
  return `<div class="wm-lib">
    <div class="ui-field"><label class="ui-sr" for="wm-rq">Search the rules</label><input class="ui-input" id="wm-rq" type="search" placeholder="Search rules" value="${esc(f.q || '')}" data-lib="q" autocomplete="off"></div>
    <div class="wm-lib__f"><label class="ui-sr" for="wm-rcat">Source</label><select class="ui-select" id="wm-rcat" data-lib="cat"><option value="">All sources</option>${CATEGORY_CHIPS.map(([v, l]) => `<option value="${v}"${f.cat === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <label class="ui-sr" for="wm-rarea">Area</label><select class="ui-select" id="wm-rarea" data-lib="area"><option value="">All areas</option>${areas.map(a => `<option value="${esc(a)}"${f.area === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
    ${rows.length ? `<ul class="wm-pl wm-pl--rules" aria-label="Rules">${rows.map(r => ruleItem(r)).join('')}</ul>` : `<p class="wm-muted">No rule matches. Clear a filter.</p>`}
  </div>`;
}

export function paletteHtml(c) {
  const open = k => (c.open[k] ? ' open' : '');
  const groups = KINDS.map(k => {
    const items = Object.entries(BLOCKS).filter(([, b]) => b.kind === k && !b.locked).map(([id, b]) => blockItem(id, b)).join('');
    const locked = k === 'guardrail' ? `<li class="wm-pi wm-pi--locked"><span class="wm-pi__b" aria-disabled="true">${icon('lock', 16)}<span class="wm-pi__t">Nothing is sent on its own</span>${ui.hint('info', BLOCKS.never_auto.def + ' It is already on this map and cannot be removed.', { size: 14, label: 'About the locked guardrail' })}</span></li>` : '';
    return `<details class="wm-g" data-g="${k}"${open(k)}><summary><span class="wm-g__i wm-kind--${k}">${icon(KIND_ICON[k], 14)}</span>${KIND_LABEL[k]}<span class="wm-g__n">${Object.values(BLOCKS).filter(b => b.kind === k && !b.locked).length}</span></summary><ul class="wm-pl">${locked}${items}</ul></details>`;
  }).join('');
  const nRules = (c.s.rules || []).length;
  return `<div class="wm-pal__b">${groups}
    <details class="wm-g" data-g="rules"${open('rules')}><summary><span class="wm-g__i">${icon('shield', 14)}</span>Rules<span class="wm-g__n">${nRules}</span></summary>${libraryHtml(c)}</details>
    <details class="wm-g" data-g="locked"${open('locked')}><summary><span class="wm-g__i">${icon('lock', 14)}</span>Not available here</summary><ul class="wm-pl">${LOCKED_ACTIONS.map(a => `<li class="wm-pi wm-pi--locked"><span class="wm-pi__b" aria-disabled="true">${icon(a.icon, 16)}<span class="wm-pi__t">${esc(a.label)}</span>${ui.hint('lock', `${a.label}. ${LOCKED_WHY}`, { size: 14, label: `${a.label}: a person does this` })}</span></li>`).join('')}</ul></details>
  </div>`;
}
