// Settings > Workflows (round 5): the map builder. A workflow is a map of blocks (When, If, Then, Always) joined by lines. This controller owns the
// draft, the selection, the toolbar and every interaction: pointer drag and drop (move a block, link from an exit dot, drop a block or rule from the
// palette), the keyboard (arrows, Enter, Delete, the inspector pickers), the Outline view (the same workflow as a list), the Test run panel and Save.
// Everything draws from one function (draw) that re-renders the container and puts scroll and focus back, so the map, the outline and the inspector
// cannot drift apart. The screen (Settings.js) supplies the store: s, actor, do(), toast(), askReason(), editRule(), staffName().
//
// Nothing here sends, calls, files or signs: workflows only configure bell items, suggestions and reminders for a person (see catalog.js).
import { ui, chipMod } from '../ui/index.js';
import { esc } from '../runtime.js';
import { M } from '../app.js';
import { can } from '../shared/permissions.js';
import { rule } from '../shared/rules.js';
import { BLOCKS, GRID, KINDS, KIND_LABEL } from '../shared/workflows/catalog.js';
import * as ENGINE from '../shared/workflows/engine.js';
import { TEMPLATES } from '../shared/workflows/templates.js';
import * as MD from './WorkflowModel.js';
import { canvasHtml, edgePath, outPos, inPos, verifHint } from './WorkflowCanvas.js';
import { inspectorHtml } from './WorkflowInspector.js';
import { outlineHtml } from './WorkflowOutline.js';
import { paletteHtml, rulesRows, filterRules } from './WorkflowPalette.js';
import { showValue, CATEGORY_CHIPS } from './SettingsData.js';

const icon = (n, s) => ui.icon(n, s);
const narrow = () => (typeof matchMedia === 'function' ? matchMedia('(max-width: 899px)').matches : false);
const wide = () => (typeof innerWidth === 'number' ? innerWidth >= 1280 : true);
const CATLABEL = Object.fromEntries(CATEGORY_CHIPS);

export class WorkflowMap {
  constructor(host) {
    this.h = host; const p = host.params || {};
    this.wfId = p.wf || null; this.draft = null; this.baseKey = ''; this.baseVer = null; this.undo = [];
    this.sel = null; this.lit = { nodes: new Set(), edges: new Set() }; this.linking = null; this.test = null; this.drawer = null; this.focusAfter = null;
    this.view = p.view === 'outline' || p.view === 'map' ? p.view : (narrow() ? 'outline' : 'map');
    this.userView = !!(p.view === 'outline' || p.view === 'map');
    this.ui = { pal: wide(), insp: false, open: { trigger: true, condition: true, action: true, guardrail: false, rules: p.tab === 'rules', locked: false } };
    this.lib = { q: p.tab === 'rules' ? p.q || '' : '', cat: p.tab === 'rules' ? p.cat || '' : '', area: p.tab === 'rules' ? p.area || '' : '' };
    this.ptr = false; this.pendingDraw = false; this.drag = null; this.picker = null; this.serverProblems = null; this.suppressClick = false; this.root = null;
  }
  get s() { return this.h.s; }

  // ================================================================================== data
  workflows() { return this.s.workflows || []; }
  saved() { return this.workflows().find(w => w.id === this.wfId) || null; }
  idn(prefix) { const d = this.draft || { nodes: [], edges: [] }; return ENGINE.newId(prefix, [...d.nodes.map(n => n.id), ...d.edges.map(e => e.id)]); }
  proposalKey() { const w = this.saved(); const pw = w && w.pending && (w.pending.workflow || w.pending.wf || w.pending.proposed); return pw && pw.nodes ? MD.draftKey(MD.draftOf(pw)) : null; }
  dirty() { if (!this.draft) return false; const k = MD.draftKey(this.draft); return k !== this.baseKey && k !== this.proposalKey(); }
  loadDraft(w) {
    this.draft = w ? MD.draftOf(w) : null; this.baseKey = w ? MD.draftKey(this.draft) : ''; this.baseVer = w ? w.version : null;
    this.undo = []; this.sel = null; this.lit = { nodes: new Set(), edges: new Set() }; this.linking = null; this.test = null;
  }
  // called before every render: follow the store (another save, a delete) without losing an unsaved draft
  sync() {
    const list = this.workflows();
    if (!list.length) { this.wfId = null; this.draft = null; return; }
    let w = this.saved();
    if (!w) { w = list[0]; this.wfId = w.id; this.loadDraft(w); return; }
    if (!this.draft) { this.loadDraft(w); return; }
    const sk = MD.draftKey(MD.draftOf(w));
    if (sk !== this.baseKey) { const clean = MD.draftKey(this.draft) === this.baseKey; if (clean) this.loadDraft(w); else this.baseKey = sk; this.baseVer = w.version; }
  }
  wfNow() { const w = this.saved() || {}; return { id: w.id, enabled: !!w.enabled, version: w.version, ...this.draft }; }
  validate() { try { return ENGINE.validate(this.wfNow(), this.s).problems || []; } catch (e) { console.error('validate', e); return []; } }
  // ---- edits: every change to the draft goes through mut() so Undo has a snapshot
  mut(fn, o = {}) {
    this.undo.push(MD.clone(this.draft)); if (this.undo.length > 40) this.undo.shift();
    this.serverProblems = null; const r = fn(this.draft); this.lit = { nodes: new Set(), edges: new Set() };
    if (o.draw !== false) this.redraw();
    return r;
  }
  doUndo() { const p = this.undo.pop(); if (!p) return; this.draft = p; if (this.sel && this.sel.type === 'node' && !MD.nodeById(this.draft, this.sel.id)) this.sel = null; if (this.sel && this.sel.type === 'edge' && !this.draft.edges.some(e => e.id === this.sel.id)) this.sel = null; this.redraw(); }

  // ================================================================================== markup
  ctx() {
    const local = this.validate(); const problems = local.length ? local : (this.serverProblems || []); const byNode = {};
    for (const p of problems) if (p.node) (byNode[p.node] = byNode[p.node] || []).push(p);
    const saved = this.saved() || {}; const me = this.h.actor || {};
    const pend = saved.pending;
    return { s: this.s, wf: this.draft, saved, sel: this.sel, lit: this.lit, linking: this.linking, problems, byNode, open: this.ui.open, lib: this.lib, dirty: this.dirty(), narrowish: !wide(),
      staffName: id => this.h.staffName(id), fmt: at => (at ? M.fmtDateTime(at) : ''), canConfirm: !!pend && pend.by !== me.id && (can(me, 'admin.settings') || can(me, 'drafts.clinical')) };
  }
  html() { return `<div class="wm" id="wm" data-view="${this.view}">${this.inner()}</div>`; }
  inner() {
    if (!this.workflows().length || !this.draft) return `<div class="wm-none">${ui.emptyState({ title: 'No workflows yet', body: 'Workflows are not available on this server yet.' })}</div>`;
    const c = this.ctx(); const nr = narrow(); const showPal = !nr && this.ui.pal; const showInsp = !nr && (wide() || !!this.sel || this.ui.insp);
    const main = this.view === 'outline' ? outlineHtml(c) : canvasHtml(c);
    return `${this.barHtml(c)}
      <div class="wm-body${showPal ? ' has-pal' : ''}${showInsp ? ' has-insp' : ''}">
        ${showPal ? `<aside class="wm-pal" id="wm-pal" aria-label="Blocks and rules"><div class="wm-pal__h"><h2 class="wm-h">Blocks</h2><button type="button" class="wm-x" data-wm="palToggle" aria-label="Hide the block palette">${icon('chevR', 16)}</button></div>${paletteHtml(c)}</aside>` : ''}
        <div class="wm-main" id="wm-main">${main}${this.test && this.test.open ? this.testHtml(c) : ''}</div>
        ${showInsp ? `<aside class="wm-insp" id="wm-insp" aria-label="Editor">${inspectorHtml(c)}</aside>` : ''}
      </div>`;
  }
  barHtml(c) {
    const w = c.saved; const on = !!w.enabled; const dirty = c.dirty; const nr = narrow(); const pend = !!w.pending;
    const errs = c.problems.filter(p => p.level === 'error').length, warns = c.problems.length - errs;
    const seg = (v, ic, label) => `<button type="button" class="wm-seg__b" data-wm="view" data-v="${v}" aria-pressed="${this.view === v}">${icon(ic, 14)}<span>${label}</span></button>`;
    return `<div class="wm-bar" role="toolbar" aria-label="Workflow tools">
      <div class="wm-bar__r1">
        <label class="ui-sr" for="wm-sel">Workflow</label>
        <select class="ui-select wm-sel" id="wm-sel" data-wm-sel="1">${this.workflows().map(x => `<option value="${esc(x.id)}"${x.id === this.wfId ? ' selected' : ''}>${esc(x.name)}${x.enabled ? '' : ' (off)'}</option>`).join('')}</select>
        <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" id="wm-new" data-wm="new">${icon('plus', 14)} New workflow</button>
        <span class="wm-bar__sp"></span>
        <div class="wm-seg" role="group" aria-label="View">${seg('map', 'branch', 'Map')}${seg('outline', 'list', 'Outline')}</div>
        ${ui.hint('more', 'Duplicate or delete this workflow', { cls: 'ui-hint--act', label: 'More for this workflow', extra: 'data-wm="more" id="wm-more" aria-haspopup="menu"' })}
      </div>
      <div class="wm-bar__r2">
        <label class="ui-sr" for="wm-name">Workflow name</label>
        <input class="ui-input wm-name" id="wm-name" value="${esc(this.draft.name)}" maxlength="80" data-wm-name="1" autocomplete="off">
        <button type="button" role="switch" class="wm-sw" id="wm-on" data-wm="toggleOn" aria-checked="${on}" aria-label="${on ? 'This workflow is on' : 'This workflow is off'}"><i></i></button><span class="wm-onl" aria-hidden="true">${on ? 'On' : 'Off'}</span>
        ${pend ? ui.hint('clock', 'A saved change is waiting for a second person to confirm it.', { tone: 'y', text: 'Waiting', label: 'Waiting for a second person' }) : ''}
        <span class="wm-bar__sp"></span>
        ${nr ? `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" id="wm-blocks" data-wm="openPicker">${icon('plus', 14)} Add block</button>` : `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" id="wm-blocks" data-wm="palToggle" aria-pressed="${this.ui.pal}">${icon('plus', 14)} Blocks</button>`}
        ${ui.hint('undo', 'Undo the last change (Ctrl+Z)', { cls: 'ui-hint--act', label: 'Undo', extra: `data-wm="undo" id="wm-undo"${this.undo.length ? '' : ' aria-disabled="true"'}` })}
        ${ui.hint('tidy', 'Tidy up: lay the blocks out left to right on the grid', { cls: 'ui-hint--act', label: 'Tidy up', extra: 'data-wm="tidy" id="wm-tidy"' })}
        <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" id="wm-test" data-wm="test">${icon('play', 14)} Test run</button>
        ${errs || warns ? ui.hint('alert', `${errs ? errs + ' to fix' : ''}${errs && warns ? ', ' : ''}${warns ? warns + ' to look at' : ''}. Select nothing to see them.`, { tone: errs ? 'r' : 'y', text: String(errs + warns), cls: 'wm-probhint', label: `${errs + warns} problem${errs + warns === 1 ? '' : 's'} in this workflow`, extra: 'data-wm="showProblems"' }) : ''}
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" id="wm-save" data-wm="save"${dirty ? '' : ' disabled'}>${dirty ? 'Save' : `Saved · v${esc(w.version || 1)}`}</button>
      </div>
    </div>`;
  }
  testHtml(c) {
    const t = this.test; const res = t.res || { matches: [], counts: {} }; const k = res.counts || {};
    const byId = new Map(this.draft.nodes.map(n => [n.id, n]));
    const title = id => { const n = byId.get(id); return n ? MD.nodeTitle(n) : id; };
    const rows = (res.matches || []).map((m, i) => `<tr class="${t.i === i ? 'is-on' : ''}" data-wm="litMatch" data-i="${i}">
      <th scope="row"><span class="wm-tt__p">${esc(m.label || '')}</span><small>${esc((m.record && m.record.id) || '')}</small></th>
      <td>${(m.effects || []).length ? `<ul class="wm-tt__fx">${m.effects.map(e => `<li>${esc(e.text || e.action || '')}${e.roles && e.roles.length ? ` <small>to ${esc(e.roles.join(', '))}</small>` : ''}</li>`).join('')}</ul>` : '<span class="wm-muted">Nothing shown to anyone</span>'}</td>
      <td class="wm-tt__path">${(m.path || []).map(id => esc(title(id))).join(' › ')}</td>
      <td>${m.stopped ? `<span class="wm-tt__stop">${icon('lock', 12)} Stopped at ${esc(title(m.stopped.node))}: ${esc(m.stopped.why)}</span>` : ''}</td>
      <td class="wm-tt__a">${ui.hint('eye', 'Light up this path on the map', { cls: 'ui-hint--act', label: `Show the path for ${m.label || 'this match'}`, extra: `data-wm="litMatch" data-i="${i}"` })}</td></tr>`).join('');
    return `<section class="wm-test" id="wm-testp" aria-labelledby="wm-test-t" tabindex="-1">
      <header class="wm-test__h"><h3 class="wm-h" id="wm-test-t">Test run</h3><span class="wm-test__note">${icon('shield', 14)} Test only: nothing is sent or changed</span><button type="button" class="wm-x" data-wm="closeTest" aria-label="Close the test run">${icon('close', 16)}</button></header>
      <p class="wm-test__c">${k.candidates ?? 0} checked · ${k.matched ?? 0} would match · ${k.stopped ?? 0} stopped by a guardrail · ${k.effects ?? 0} bell items${c.dirty ? ' · includes your unsaved changes' : ''}</p>
      ${rows ? `<div class="wm-tt__w"><table class="wm-tt"><caption class="ui-sr">What this workflow would do today</caption><thead><tr><th scope="col">Patient</th><th scope="col">Would do</th><th scope="col">Path</th><th scope="col">Stopped</th><th scope="col"><span class="ui-sr">Show path</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="wm-muted">Nothing in today's data matches this workflow.</p>`}
    </section>`;
  }

  // ================================================================================== drawing
  el() { return this.root && this.root.isConnected ? this.root : (this.root = document.getElementById('wm')); }
  curFocus() {
    const a = document.activeElement; const r = this.el(); if (!a || a === document.body) return null;
    if (!(r && r.contains(a)) && !(this.drawer && this.drawer.dialog.contains(a))) return null;
    const key = a.dataset && a.dataset.fk ? `[data-fk="${a.dataset.fk}"]` : a.id ? '#' + CSS.escape(a.id) : null;
    return key ? { key, start: a.selectionStart, end: a.selectionEnd } : null;
  }
  redraw() { if (this.ptr) { this.pendingDraw = true; return; } this.draw(); }
  draw() {
    const r = this.el(); if (!r) return;
    this.sync(); this.h.noRepaint = false;
    const keep = this.focusAfter ? { key: this.focusAfter } : this.curFocus(); this.focusAfter = null;
    const q = (sel, root = r) => root.querySelector(sel); const sc = {};
    for (const s of ['#wm-canvas', '.wm-insp', '.wm-pal__b', '.wm-outline', '.wm-tt__w']) { const e = q(s); if (e) sc[s] = [e.scrollLeft, e.scrollTop]; }
    r.dataset.view = this.view; r.innerHTML = this.inner();
    for (const [s, v] of Object.entries(sc)) { const e = q(s); if (e) { e.scrollLeft = v[0]; e.scrollTop = v[1]; } }
    this.syncDrawer();
    if (keep) { const e = this.find(keep.key); if (e) { e.focus({ preventScroll: true }); if (keep.start != null) { try { e.setSelectionRange(keep.start, keep.end); } catch { } } } }
  }
  find(key) { const r = this.el(); return (r && r.querySelector(key)) || (this.drawer && this.drawer.dialog.querySelector(key)) || null; }
  syncDrawer() {
    if (!this.drawer) return;
    if (!this.draft || !this.sel) { this.drawer.close('sync'); return; }
    this.drawer.update({ body: inspectorHtml(this.ctx()) });
  }
  // soft updates while typing: no re-render, so a caret never jumps
  softBar() {
    const r = this.el(); if (!r) return; const sv = r.querySelector('#wm-save'); if (!sv) return; const d = this.dirty(); const w = this.saved() || {};
    sv.disabled = !d; sv.textContent = d ? 'Save' : `Saved · v${w.version || 1}`;
  }

  // ================================================================================== selection
  select(sel, o = {}) {
    this.sel = sel; this.linking = null;
    if (sel && narrow()) this.openInspDrawer();
    if (sel && sel.type === 'node') this.focusAfter = o.focusInsp ? '#wm-insp-t' : `[data-fk="node-${sel.id}"]`;
    this.redraw();
    if (sel && o.focusInsp && narrow()) setTimeout(() => { const t = this.find('#wm-insp-t'); if (t) t.focus({ preventScroll: true }); }, 0);
  }
  openInspDrawer() {
    if (this.drawer) return;
    this.drawer = ui.drawer({ title: 'Edit', body: inspectorHtml(this.ctx()), onClose: () => { this.drawer = null; }, initialFocus: '#wm-insp-t' });
    this.bindTo(this.drawer.dialog);
    this.drawer.closed.then(() => { if (this.sel && narrow()) { this.sel = null; this.redraw(); } });
  }

  // ================================================================================== binding
  bind(root) {
    const el = root.querySelector('#wm'); if (!el) return; this.root = el;
    if (!el.__wm) {
      el.__wm = true; this.bindTo(el);
      el.addEventListener('pointerdown', e => this.onPointerDown(e));
      el.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details[data-g]'); if (d) this.ui.open[d.dataset.g] = d.open; }, true);
      if (typeof matchMedia === 'function' && !this.mq) {
        this.mq = matchMedia('(max-width: 899px)'); this.mq.addEventListener('change', () => { if (!this.el()) return; if (!this.userView) this.view = narrow() ? 'outline' : 'map'; if (!narrow() && this.drawer) this.drawer.close('wide'); this.draw(); });
      }
    }
    this.h.noRepaint = false;
  }
  bindTo(el) {
    el.addEventListener('click', e => this.onClick(e));
    el.addEventListener('input', e => this.onInput(e));
    el.addEventListener('change', e => this.onChange(e));
    el.addEventListener('keydown', e => this.onKeydown(e));
  }
  onClick(e) {
    if (this.suppressClick) { this.suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    const t = e.target; const a = t.closest('[data-wm]');
    if (a) { e.preventDefault(); this.act(a.dataset.wm, a, e); return; }
    const port = t.closest('.wm-port--out');
    if (port) { e.preventDefault(); this.togglePort(port.dataset.node, port.dataset.port); return; }
    const edge = t.closest('.wm-edge'); if (edge) { this.select({ type: 'edge', id: edge.dataset.edge }, { focusInsp: false }); return; }
    if (t.closest('.wm-node')) return;
    if (t.closest('.wm-canvas') && !t.closest('.wm-locked')) { if (this.sel || this.linking) { this.linking = null; this.select(null); } }
  }
  act(name, el, e) {
    const h = this.h; const id = el.dataset.id;
    switch (name) {
      case 'view': this.view = el.dataset.v; this.userView = true; ui.query.writeQuery({ view: this.view }); this.focusAfter = `[data-wm="view"][data-v="${this.view}"]`; this.redraw(); break;
      case 'palToggle': this.ui.pal = !this.ui.pal; this.focusAfter = '#wm-blocks'; this.redraw(); break;
      case 'addBlock': this.addFromPalette(el.dataset.block, el); break;
      case 'addRule': this.attachRule(el.dataset.key); break;
      case 'editRule': this.editRule(el.dataset.key, el); break;
      case 'detachRule': if (this.sel && this.sel.type === 'node') this.mut(d => { const n = MD.nodeById(d, this.sel.id); n.rules = n.rules.filter(k => k !== el.dataset.key); }); break;
      case 'pickRule': this.pickRule(id, el); break;
      case 'removeNode': this.removeNode(id); break;
      case 'removeEdge': this.mut(d => MD.unlink(d, id)); this.sel = null; this.redraw(); break;
      case 'editNode': this.select({ type: 'node', id }, { focusInsp: true }); break;
      case 'selectNode': this.select({ type: 'node', id }); break;
      case 'closeInsp': this.ui.insp = false; this.sel = null; this.redraw(); break;
      case 'showProblems': this.ui.insp = true; this.sel = null; this.redraw(); break;
      case 'tidy': this.mut(d => { const t = ENGINE.tidy({ ...this.wfNow(), nodes: d.nodes, edges: d.edges }); d.nodes = t.nodes; d.edges = t.edges; }); h.toast('Blocks laid out on the grid'); break;
      case 'undo': this.doUndo(); break;
      case 'test': this.runTest(); break;
      case 'closeTest': this.test = null; this.lit = { nodes: new Set(), edges: new Set() }; this.focusAfter = '#wm-test'; this.redraw(); break;
      case 'litMatch': this.litMatch(+el.dataset.i); break;
      case 'save': this.save(); break;
      case 'toggleOn': this.toggleOn(); break;
      case 'new': this.newWorkflow(el); break;
      case 'more': this.moreMenu(el); break;
      case 'openPicker': this.openPicker(el); break;
      case 'confirm': this.confirm(el.dataset.decision); break;
    }
  }
  onInput(e) {
    const t = e.target;
    if (t.matches('#wm-name')) { this.draft.name = t.value; this.softBar(); return; }
    if (t.matches('[data-wm-desc]')) { this.draft.description = t.value; this.softBar(); return; }
    if (t.matches('[data-lib="q"]')) { this.lib.q = t.value; this.libQuery(); this.draw(); return; }
    if (t.matches('[data-wmp]') && (t.dataset.t === 'number' || t.dataset.t === 'text') && this.sel && this.sel.type === 'node') { this.setParam(t, false); }
  }
  onChange(e) {
    const t = e.target;
    if (t.matches('#wm-sel')) { this.switchTo(t.value); return; }
    if (t.matches('#wm-name') || t.matches('[data-wm-desc]')) { this.redraw(); return; }
    if (t.matches('[data-lib]')) { this.lib[t.dataset.lib] = t.value; this.libQuery(); this.draw(); return; }
    if (t.matches('[data-wmp]') && this.sel && this.sel.type === 'node') { this.setParam(t, true); return; }
    if (t.matches('[data-next]')) { this.addLink(t.dataset.node, t.dataset.next, t.value); return; }
    if (t.matches('[data-add]')) { this.addFromOutline(t); }
  }
  libQuery() { ui.query.writeQuery({ tab: this.ui.open.rules || this.lib.q || this.lib.cat || this.lib.area ? 'rules' : '', q: this.lib.q, cat: this.lib.cat, area: this.lib.area }); }
  onKeydown(e) {
    const t = e.target;
    if (e.key === 'Escape') { if (this.linking) { this.linking = null; this.redraw(); e.stopPropagation(); } else if (this.lit.nodes.size) { this.lit = { nodes: new Set(), edges: new Set() }; this.redraw(); } return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !t.matches('input,textarea,select')) { e.preventDefault(); this.doUndo(); return; }
    const node = t.matches && t.matches('.wm-node') ? t : null;
    if (node) {
      const id = node.dataset.node; const n = MD.nodeById(this.draft, id); if (!n) return;
      const step = (e.shiftKey ? 5 : 1) * GRID; const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (mv) { e.preventDefault(); this.focusAfter = `[data-fk="node-${id}"]`; this.mut(d => { const m = MD.nodeById(d, id); m.x = MD.snap(m.x + mv[0]); m.y = MD.snap(m.y + mv[1]); }); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (this.linking && this.linking.from !== id) this.connect(this.linking.from, this.linking.port, id); else this.select({ type: 'node', id }, { focusInsp: true }); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.removeNode(id); }
      return;
    }
    const hit = t.closest && t.closest('.wm-edge');
    if (hit && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); const id = hit.dataset.edge; this.mut(d => MD.unlink(d, id)); this.sel = null; this.redraw(); return; }
    if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select({ type: 'edge', id: hit.dataset.edge }); }
  }

  // ================================================================================== pointer: move, link, drop from the palette
  stagePoint(e) { const st = this.el() && this.el().querySelector('#wm-stage'); if (!st) return null; const r = st.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.ptr = true; this.h.noRepaint = true; clearTimeout(this.ptrT);
    this.ptrT = setTimeout(() => { if (this.ptr && !(this.drag && this.drag.moved)) { this.ptr = false; this.h.noRepaint = false; if (this.pendingDraw) { this.pendingDraw = false; this.draw(); } } }, 900);
    if (this.up) { removeEventListener('pointermove', this.mv); removeEventListener('pointerup', this.up); removeEventListener('pointercancel', this.up); }
    const t = e.target;
    const port = t.closest('.wm-port--out');
    const pal = !narrow() && t.closest('#wm-pal [data-wm="addBlock"], #wm-pal [data-wm="addRule"]');
    const node = t.closest('.wm-node');
    if (port) this.drag = { type: 'link', node: port.dataset.node, port: port.dataset.port, x0: e.clientX, y0: e.clientY, moved: false };
    else if (pal) this.drag = { type: pal.dataset.wm === 'addRule' ? 'rule' : 'block', key: pal.dataset.block || pal.dataset.key, label: pal.textContent.trim(), x0: e.clientX, y0: e.clientY, moved: false };
    else if (node && !t.closest('.wm-port')) { const n = MD.nodeById(this.draft, node.dataset.node); if (n) this.drag = { type: 'move', node: n.id, el: node, nx: n.x, ny: n.y, x0: e.clientX, y0: e.clientY, moved: false }; }
    const up = ev => this.onPointerUp(ev);
    this.mv = ev => this.onPointerMove(ev); this.up = up;
    addEventListener('pointermove', this.mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  onPointerMove(e) {
    const d = this.drag; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) { d.moved = true; if (d.type === 'move') d.el.classList.add('is-drag'); if (d.type === 'block' || d.type === 'rule') { d.ghost = document.createElement('div'); d.ghost.className = 'wm-ghost'; d.ghost.textContent = d.label; document.body.appendChild(d.ghost); this.el().classList.add('is-dragging'); } }
    e.preventDefault();
    if (d.type === 'move') {
      d.x = MD.snap(d.nx + dx); d.y = MD.snap(d.ny + dy); d.el.style.left = d.x + 'px'; d.el.style.top = d.y + 'px'; this.liveEdges(d.node, d.x, d.y);
    } else if (d.type === 'link') {
      const p = this.stagePoint(e); const n = MD.nodeById(this.draft, d.node); const tmp = this.el().querySelector('#wm-temp');
      if (p && n && tmp) { const [ax, ay] = outPos(n, d.port); tmp.setAttribute('d', edgePath(ax, ay, p.x, p.y)); tmp.removeAttribute('hidden'); }
      this.markHover(e, d);
    } else { d.ghost.style.left = e.clientX + 10 + 'px'; d.ghost.style.top = e.clientY + 10 + 'px'; this.markHover(e, d); }
  }
  markHover(e, d) {
    const r = this.el(); r.querySelectorAll('.is-hover-ok,.is-hover-bad').forEach(x => x.classList.remove('is-hover-ok', 'is-hover-bad'));
    const under = document.elementFromPoint(e.clientX, e.clientY); const node = under && under.closest && under.closest('.wm-node');
    if (d.type === 'link' && node && node.dataset.node !== d.node) node.classList.add(MD.canLink(this.draft, d.node, d.port, node.dataset.node).ok ? 'is-hover-ok' : 'is-hover-bad');
    else if (d.type === 'rule' && node) node.classList.add('is-hover-ok');
    else if (d.type === 'block' && under && under.closest && under.closest('.wm-canvas')) r.querySelector('.wm-canvas').classList.add('is-hover-ok');
  }
  liveEdges(id, x, y) {
    const st = this.el().querySelector('#wm-stage'); if (!st) return;
    const pos = nid => { const n = MD.nodeById(this.draft, nid); return nid === id ? { ...n, x, y } : n; };
    st.querySelectorAll('.wm-edge').forEach(g => {
      if (g.dataset.from !== id && g.dataset.to !== id) return;
      const a = pos(g.dataset.from), b = pos(g.dataset.to); if (!a || !b) return;
      const [ax, ay] = outPos(a, g.dataset.port), [bx, by] = inPos(b); const d = edgePath(ax, ay, bx, by);
      g.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
    });
  }
  onPointerUp(e) {
    removeEventListener('pointermove', this.mv); removeEventListener('pointerup', this.up); removeEventListener('pointercancel', this.up);
    clearTimeout(this.ptrT); const d = this.drag; this.drag = null; this.ptr = false; this.h.noRepaint = false;
    const r = this.el(); if (r) { r.classList.remove('is-dragging'); r.querySelectorAll('.is-hover-ok,.is-hover-bad,.is-drag').forEach(x => x.classList.remove('is-hover-ok', 'is-hover-bad', 'is-drag')); const tmp = r.querySelector('#wm-temp'); if (tmp) tmp.setAttribute('hidden', ''); }
    if (d && d.ghost) d.ghost.remove();
    if (d && d.moved) {
      this.suppressClick = true; setTimeout(() => { this.suppressClick = false; }, 0);
      const under = document.elementFromPoint(e.clientX, e.clientY); const node = under && under.closest && under.closest('.wm-node');
      if (d.type === 'move') { if (d.x !== d.nx || d.y !== d.ny) { this.mut(dr => { const n = MD.nodeById(dr, d.node); n.x = d.x; n.y = d.y; }, { draw: false }); } this.sel = { type: 'node', id: d.node }; this.focusAfter = `[data-fk="node-${d.node}"]`; this.draw(); if (narrow()) this.openInspDrawer(); }
      else if (d.type === 'link') { if (node && node.dataset.node !== d.node) this.connect(d.node, d.port, node.dataset.node); else this.draw(); }
      else if (d.type === 'rule') { if (node) this.attachRule(d.key, node.dataset.node); else { this.h.toast('Drop a rule onto a block to attach it.'); this.draw(); } }
      else if (d.type === 'block') { const canvas = under && under.closest && under.closest('.wm-canvas'); const p = this.stagePoint(e); if (canvas && p) this.addBlock(d.key, p.x - MD.NODE_W / 2, p.y - MD.NODE_H / 2); else this.draw(); }
    } else if (d && d.type === 'move') {
      // a press without a move: select (or finish a pending link)
      if (this.linking && this.linking.from !== d.node) this.connect(this.linking.from, this.linking.port, d.node);
      else this.select({ type: 'node', id: d.node });
    } else if (this.pendingDraw) { this.pendingDraw = false; setTimeout(() => this.draw(), 0); }
    if (this.pendingDraw) { this.pendingDraw = false; setTimeout(() => this.draw(), 0); }
  }
  togglePort(node, port) {
    if (this.linking && this.linking.from === node && this.linking.port === port) { this.linking = null; this.focusAfter = `[data-fk="port-${node}-${port}"]`; this.redraw(); return; }
    this.linking = { from: node, port }; this.focusAfter = `[data-fk="port-${node}-${port}"]`; this.redraw(); this.h.toast('Now click the block to link to. Escape cancels.');
  }

  // ================================================================================== editing
  connect(from, port, to) {
    const ok = MD.canLink(this.draft, from, port, to);
    this.linking = null;
    if (!ok.ok) { this.h.toast(ok.why, 'err'); this.draw(); return; }
    this.mut(d => MD.link(d, from, port, to, p => this.idn(p)));
    this.focusAfter = `[data-fk="node-${to}"]`; this.draw();
  }
  addLink(node, port, value) {
    if (!value) return; this.focusAfter = `#wm-next-${node}-${port}`;
    if (value.startsWith('node:')) { this.mut(d => MD.link(d, node, port, value.slice(5), p => this.idn(p))); return; }
    if (value.startsWith('new:')) { const src = MD.nodeById(this.draft, node); const spot = MD.freeSpot(this.draft, src); this.mut(d => { const n = MD.addNode(d, value.slice(4), spot.x, spot.y, p => this.idn(p)); MD.link(d, node, port, n.id, p => this.idn(p)); }); }
  }
  setParam(el, redraw) {
    const key = el.dataset.wmp; const id = this.sel.id; const t = el.dataset.t; let v;
    if (t === 'number') v = el.value === '' ? '' : Number(el.value);
    else if (t === 'bool') v = el.checked;
    else if (t === 'set') { const grp = [...el.closest('fieldset').querySelectorAll(`[data-wmp="${key}"]`)]; v = grp.filter(x => x.checked).map(x => x.dataset.v); }
    else v = el.value;
    this.undo.push(MD.clone(this.draft)); if (this.undo.length > 40) this.undo.shift();
    const n = MD.nodeById(this.draft, id); n.params = { ...n.params, [key]: v };
    if (redraw) this.redraw(); else this.softBar();
  }
  addBlock(block, x, y, opts = {}) {
    let node;
    this.mut(d => { const spot = x == null ? MD.freeSpot(d, opts.near) : { x: MD.snap(x), y: MD.snap(y) }; node = MD.addNode(d, block, spot.x, spot.y, p => this.idn(p)); if (opts.from) MD.link(d, opts.from, opts.port, node.id, p => this.idn(p)); }, { draw: false });
    this.sel = { type: 'node', id: node.id }; this.focusAfter = `[data-fk="node-${node.id}"]`; this.draw();
    if (narrow()) this.openInspDrawer();
    return node;
  }
  addFromPalette(block) {
    const b = BLOCKS[block]; if (!b) return;
    const sel = this.sel && this.sel.type === 'node' ? MD.nodeById(this.draft, this.sel.id) : null;
    // a block added while another is selected follows it, and joins its free exit
    const from = sel && b.kind !== 'trigger' && MD.portsFree(this.draft, sel);
    const opts = sel && !MD.isLocked(sel) ? { near: sel, ...(from ? { from: sel.id, port: from } : {}) } : {};
    this.addBlock(block, null, null, opts);
    if (this.picker) { this.picker.close('added'); }
  }
  addFromOutline(selEl) {
    const block = selEl.value; if (!block) return; const nodeId = selEl.dataset.node; const port = selEl.dataset.port;
    const src = nodeId ? MD.nodeById(this.draft, nodeId) : null;
    this.addBlock(block, null, null, src ? { near: src, from: src.id, port: port || 'out' } : {});
  }
  removeNode(id) {
    const n = MD.nodeById(this.draft, id); if (!n || MD.isLocked(n)) return;
    this.mut(d => MD.removeNode(d, id), { draw: false });
    if (this.sel && this.sel.type === 'node' && this.sel.id === id) this.sel = null;
    this.h.toast(`${MD.nodeTitle(n)} removed. Undo is in the toolbar.`); this.draw();
  }
  attachRule(key, nodeId) {
    const id = nodeId || (this.sel && this.sel.type === 'node' && this.sel.id);
    if (!id) { this.h.toast('Select a block first, then click a rule to attach it. Or drag the rule onto a block.'); return; }
    const n = MD.nodeById(this.draft, id); if (!n) return; const r = rule(this.s, key);
    if ((n.rules || []).includes(key)) { this.h.toast(`${r.label} is already on this block.`); this.draw(); return; }
    this.mut(d => { MD.nodeById(d, id).rules.push(key); }, { draw: false });
    this.sel = { type: 'node', id }; this.draw(); this.h.toast(`${r.label} attached to ${MD.nodeTitle(n)}`);
  }
  editRule(key, opener) { this.h.editRule(key, opener, { lead: 'This changes the rule everywhere in Psyflo (deadlines, unit warnings, the Dashboard), not only in this workflow. It asks why and is kept in the audit log.' }); }
  pickRule(nodeId, opener) {
    const n = MD.nodeById(this.draft, nodeId); if (!n) return;
    const have = new Set(n.rules || []); const f = { q: '', cat: '', area: '' };
    const list = () => { const rows = filterRules(rulesRows(this.s), f).filter(r => !have.has(r.key)); return rows.length ? `<ul class="wm-pk">${rows.map(r => `<li><button type="button" class="wm-pk__b" data-pick="${esc(r.key)}"><span class="wm-v wm-v--${chipMod.verificationKind(r)}">${icon('shield', 14)}</span><span><b>${esc(r.label)}</b><small>${esc(showValue(r))} · ${esc(CATLABEL[r.category] || r.category)} · ${esc(r.key)}</small></span></button></li>`).join('')}</ul>` : '<p class="wm-muted">No rule matches.</p>'; };
    ui.modal({ title: 'Add a rule', size: 'md', returnFocus: opener, initialFocus: '#wm-pq', body: `<div class="ui-field"><label class="ui-sr" for="wm-pq">Search the rules</label><input class="ui-input" id="wm-pq" type="search" placeholder="Search by name, key or source" autocomplete="off"></div><div id="wm-pl">${list()}</div>`,
      actions: [{ label: 'Close', tone: 'secondary' }],
      onMount: (d, hd) => {
        const box = d.querySelector('#wm-pl');
        d.querySelector('#wm-pq').addEventListener('input', e => { f.q = e.target.value; box.innerHTML = list(); });
        d.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; hd.close('picked'); this.attachRule(b.dataset.pick, nodeId); });
      } });
  }
  openPicker(opener) {
    const c = this.ctx(); if (this.picker) return;
    const h = ui.drawer({ title: 'Add a block', returnFocus: opener, body: paletteHtml({ ...c, open: { ...this.ui.open, trigger: true, condition: true, action: true, guardrail: true } }), onClose: () => { this.picker = null; } });
    this.picker = h; this.bindTo(h.dialog);
  }

  // ================================================================================== workflows: switch, new, duplicate, delete, enable, save, confirm
  async switchTo(id) {
    if (id === this.wfId) return;
    if (this.dirty()) { const ok = await ui.confirm({ title: 'Leave without saving?', body: `<p>Your changes to “${esc(this.draft.name)}” are not saved.</p>`, confirmLabel: 'Discard the changes', cancelLabel: 'Keep editing' }); if (!ok) { this.draw(); return; } }
    this.wfId = id; this.loadDraft(this.saved()); ui.query.writeQuery({ wf: id }); this.focusAfter = '#wm-sel'; this.draw();
  }
  newWorkflow(opener) {
    const opts = this.workflows().map(w => `<option value="${esc(w.id)}">${esc(w.name)}${w.enabled ? '' : ' (off)'}</option>`).join('');
    const tpls = TEMPLATES.map(t => `<option value="${esc(t.key)}">${esc(t.name)}</option>`).join('');
    ui.modal({ title: 'New workflow', size: 'sm', returnFocus: opener, initialFocus: '#wm-nn',
      body: `<div class="ui-field"><label class="ui-field__l" for="wm-nn">Name</label><input class="ui-input" id="wm-nn" maxlength="80" autocomplete="off"></div><div class="ui-field"><label class="ui-field__l" for="wm-nf">Start from</label><select class="ui-select" id="wm-nf"><option value="">A blank map</option>${tpls ? `<optgroup label="A starter template">${tpls}</optgroup>` : ''}${opts ? `<optgroup label="A copy of">${opts}</optgroup>` : ''}</select></div><div class="se-err" id="wm-nerr" role="alert"></div>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Create', tone: 'primary', onClick: async hd => {
        const q = s => hd.dialog.querySelector(s); const name = q('#wm-nn').value.trim();
        if (name.length < 2) { q('#wm-nerr').textContent = 'Give it a name of at least two letters.'; q('#wm-nn').focus(); return false; }
        try { const r = await this.h.do('workflow.create', { name, from: q('#wm-nf').value || undefined }); this.wfId = r.id; this.loadDraft(this.saved()); ui.query.writeQuery({ wf: r.id }); this.h.toast(`${name} created. It is off until you turn it on.`); }
        catch (e) { q('#wm-nerr').textContent = e.message; return false; }
      } }] });
  }
  moreMenu(anchor) {
    const w = this.saved(); if (!w) return;
    const pop = ui.popover({ anchor, placement: 'bottom-end', label: 'Workflow actions', focus: true, body: `<div class="wm-menu"><button type="button" class="wm-menu__b" data-m="dup">${icon('copy', 16)} Duplicate</button><button type="button" class="wm-menu__b wm-danger" data-m="del">${icon('trash', 16)} Delete…</button></div>`,
      onMount: d => d.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; pop.close('menu'); if (b.dataset.m === 'dup') this.duplicate(); else this.remove(anchor); }) });
  }
  async duplicate() {
    const w = this.saved(); try { const r = await this.h.do('workflow.create', { name: `Copy of ${w.name}`.slice(0, 80), from: w.id }); this.wfId = r.id; this.loadDraft(this.saved()); ui.query.writeQuery({ wf: r.id }); this.draw(); this.h.toast('Duplicated. The copy is off until you turn it on.'); } catch { /* do() toasted */ }
  }
  remove(opener) {
    const w = this.saved(); if (!w) return;
    this.h.askReason({ title: `Delete · ${w.name}`, opener, confirmLabel: 'Delete', lead: 'The workflow stops and leaves the bell. The audit log keeps who deleted it and why.',
      run: async why => { await this.h.do('workflow.delete', { id: w.id, reason: why }); this.wfId = null; this.draft = null; this.sync(); this.h.toast(`${w.name} deleted`); this.draw(); } });
  }
  async toggleOn() {
    const w = this.saved(); if (!w) return;
    if (this.dirty()) { this.h.toast('Save your changes first. The switch acts on the saved workflow.'); return; }
    try { await this.h.do('workflow.enable', { id: w.id, enabled: !w.enabled }); this.h.toast(!w.enabled ? 'Workflow on. Its bell items appear for the roles it names.' : 'Workflow off. Its bell items are gone.'); this.focusAfter = '#wm-on'; this.draw(); } catch { /* do() toasted the refusal */ }
  }
  async save() {
    const w = this.saved(); if (!w || !this.dirty()) return;
    const errs = this.validate().filter(p => p.level === 'error');
    if (errs.length) { this.ui.insp = true; this.sel = null; this.redraw(); this.h.toast(`${errs.length} thing${errs.length === 1 ? '' : 's'} to fix before this can be saved.`, 'err'); return; }
    try {
      const r = await this.h.do('workflow.save', { id: w.id, workflow: { id: w.id, name: this.draft.name.trim() || w.name, description: this.draft.description, enabled: w.enabled, nodes: this.draft.nodes, edges: this.draft.edges } });
      const now = this.saved();
      if (now && now.pending) { this.h.toast('Saved. Waiting for a second person to confirm.'); this.baseVer = now.version; }
      else { this.loadDraftKeepSel(now); this.h.toast(`Saved · v${(r && r.version) || (now && now.version)}`); }
      this.focusAfter = '#wm-save'; this.draw();
    } catch (e) {
      const probs = e.problems || (e.data && e.data.problems) || null;
      if (probs && probs.length) { this.serverProblems = probs; this.ui.insp = true; this.sel = null; this.redraw(); }
    }
  }
  loadDraftKeepSel(w) { const sel = this.sel; this.loadDraft(w); if (sel && sel.type === 'node' && MD.nodeById(this.draft, sel.id)) this.sel = sel; }
  async confirm(decision) {
    const w = this.saved(); if (!w) return;
    try { await this.h.do('workflow.confirm', { id: w.id, decision }); this.h.toast(decision === 'approve' ? 'Confirmed · written to the audit log' : 'Declined · written to the audit log'); const now = this.saved(); if (now && !now.pending) this.loadDraft(now); this.draw(); } catch { /* toasted */ }
  }

  // ================================================================================== test run
  runTest() {
    let res; try { res = ENGINE.run(this.s, this.wfNow(), { today: this.s.today, actor: this.h.actor }); } catch (e) { console.error('run', e); this.h.toast('The test could not run: ' + e.message, 'err'); return; }
    this.test = { open: true, res, i: -1 }; this.focusAfter = '#wm-testp'; this.lit = { nodes: new Set(), edges: new Set() }; this.draw();
    const p = this.find('#wm-testp'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'nearest' });
  }
  litMatch(i) {
    const m = this.test && this.test.res && this.test.res.matches[i]; if (!m) return;
    const nodes = new Set(m.path || []); const edges = new Set();
    for (let k = 0; k + 1 < (m.path || []).length; k++) for (const e of this.draft.edges) if (e.from === m.path[k] && e.to === m.path[k + 1]) edges.add(e.id);
    this.test.i = i; this.lit = { nodes, edges }; this.focusAfter = `[data-wm="litMatch"][data-i="${i}"]`; this.draw();
  }
}
