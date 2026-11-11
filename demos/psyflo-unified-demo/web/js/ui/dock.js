// Presenter dock: a navy ribbon ABOVE the product viewport, visually unlike the product (dashed marigold edge, monospace
// PRESENTER label, marigold dot). Nothing presenter-owned appears inside the viewport.
//
//   presenterDock(model) -> HTML for the ribbon        mountDock(el, ctx) -> wires it (called once by app.js)
//
// model: { state:'hidden'|'collapsed'|'open', mode:'presentation'|'explore', preset, today, roleLabel, maturityOn, canSim, simReason }
// ctx (supplied by app.js): { api, M, sim, toast, go, hrefFor, route, session, current(), setDock(state), setMode(mode), setMaturity(on),
//        scenarios(), screens(), notes(routeId), features(routeId), signInAs(staffId), roleChoices(), ensurePresenter(), surfaces() , render() }
import { esc, icon } from './util.js';
import { popover, modal, drawer, confirm } from './overlay.js';
import { maturity } from './chip.js';
import { LEVEL_ORDER } from '../shared/maturity.js';

export const MODES = { presentation: { label: 'Presentation', long: 'Presentation · product only' }, explore: { label: 'Explore', long: 'Explore · all features by role' } };

export function presenterDock(m = {}) {
  const state = m.state || 'hidden'; const mode = MODES[m.mode] ? m.mode : 'presentation';
  const btn = (key, label, ic) => `<button type="button" class="sh-dock__b" data-dock-menu="${key}" aria-haspopup="menu" aria-expanded="false">${icon(ic, 15)}<span>${label}</span>${icon('chevD', 12)}</button>`;
  const open = state === 'open'; const px = m.idPrefix || '';
  return `<div class="sh-dock__in">
    <button type="button" class="sh-dock__tag" data-dock="toggle" aria-expanded="${open}" aria-controls="${px}dock-bar" title="Presenter tools (Ctrl+Shift+P)"><i class="sh-dock__dot" aria-hidden="true"></i><span class="sh-dock__label">PRESENTER</span></button>
    <span class="sh-dock__mode" id="${px}dock-mode" role="status">${esc(MODES[mode].long)}</span>
    <div class="sh-dock__bar" id="${px}dock-bar"${open ? '' : ' hidden'}>
      ${btn('scenario', 'Scenario', 'play')}${btn('role', 'Role', 'user')}${btn('reset', 'Reset', 'refresh')}${btn('sim', 'Simulate', 'clock')}
      <button type="button" class="sh-dock__b" data-dock="notes">${icon('file', 15)}<span>Notes</span></button>
      <button type="button" class="sh-dock__b" data-dock="maturity" aria-pressed="${!!m.maturityOn}">${icon('flag', 15)}<span>Maturity</span></button>
      ${btn('surfaces', 'Surfaces', 'monitor')}${mode === 'explore' ? btn('screens', 'All screens', 'grid') : ''}
      <span class="sh-dock__sp"></span>
      <button type="button" class="sh-dock__b" data-dock="mode" title="${mode === 'explore' ? 'Switch to Presentation mode' : 'Switch to Explore mode'}">${icon('chevR', 14)}<span>${mode === 'explore' ? 'Presentation mode' : 'Explore mode'}</span></button>
      <span class="sh-dock__meta">${esc(m.preset === 'canvas' ? 'Canvas snapshot' : 'Live flows')} · ${esc(m.today || '')}</span>
      ${mode === 'explore' ? '' : `<button type="button" class="sh-dock__b sh-dock__x" data-dock="hide" aria-label="Hide presenter tools">${icon('close', 15)}</button>`}
    </div></div>`;
}

const item = (o) => `<button type="button" role="menuitem" class="sh-menu__i${o.current ? ' is-current' : ''}"${o.current ? ' aria-current="true"' : ''}${o.disabled ? ' disabled' : ''} data-i="${esc(o.id)}">${o.lead ? `<span class="sh-menu__n">${esc(o.lead)}</span>` : ''}<span class="sh-menu__t"><b>${esc(o.title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>${o.tag ? `<span class="sh-menu__tag">${esc(o.tag)}</span>` : ''}</button>`;
const heading = t => `<div class="sh-menu__h" role="presentation">${esc(t)}</div>`;

export function mountDock(el, ctx) {
  let menu = null; // { key, handle }
  const closeMenu = () => { if (menu) { menu.handle.close('switch'); menu = null; } };
  const showMenu = (anchor, key, bodyHtml, onPick, opts = {}) => {
    if (menu && menu.key === key) { closeMenu(); return; }
    closeMenu();
    const h = popover({ anchor, body: `<div class="sh-menu" role="menu" aria-label="${esc(opts.label || key)}">${bodyHtml}</div>`, label: opts.label || key, className: 'ui-popover--dock', focus: true, returnFocus: anchor, placement: opts.placement,
      onClose: () => { if (menu && menu.handle === h) menu = null; anchor.setAttribute('aria-expanded', 'false'); },
      onMount: (d, handle) => {
        d.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && !b.disabled) { const r = onPick(b.dataset.i, b); if (r !== false) { handle.close('pick'); } } });
        d.addEventListener('keydown', e => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
          const items = [...d.querySelectorAll('[role=menuitem]:not([disabled])')]; if (!items.length) return;
          const i = items.indexOf(document.activeElement); let n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : items.length - 1;
          n = (n + items.length) % items.length; items[n].focus(); e.preventDefault();
        });
        if (opts.onMount) opts.onMount(d, handle);
      } });
    menu = { key, handle: h }; anchor.setAttribute('aria-expanded', 'true');
  };

  // ---------- menus ----------
  const menus = {
    scenario(a) {
      const list = ctx.scenarios();
      showMenu(a, 'scenario', list.map((s, i) => item({ id: s.id, lead: String(s.n ?? i + 1), title: s.title, sub: [s.roleLabel, s.caseLabel, s.surfaceLabel].filter(Boolean).join(' · ') })).join('') || '<p class="sh-menu__e">No scenarios loaded.</p>',
        id => { ctx.runScenario(list.find(s => String(s.id) === id)); }, { label: 'Scenario' });
    },
    role(a) {
      const rs = ctx.roleChoices();
      showMenu(a, 'role', heading('Sign in as') + rs.map(r => item({ id: r.id, title: r.label, sub: r.sub, current: r.current })).join(''), id => { ctx.switchRole(rs.find(r => r.id === id)); }, { label: 'Role' });
    },
    reset(a) {
      const cur = ctx.api.state && ctx.api.state.preset;
      showMenu(a, 'reset', heading('Reset the demo data') + item({ id: 'live', title: 'Live flows', sub: 'T.W. just referred; run the flows in front of the audience', current: cur !== 'canvas' }) + item({ id: 'canvas', title: 'Canvas snapshot', sub: 'Oct 29 exactly as the design canvas', current: cur === 'canvas' }),
        id => { ctx.resetTo(id); }, { label: 'Reset and preset' });
    },
    sim(a) {
      const m = ctx.model();
      showMenu(a, 'sim', heading('Simulation controls') + item({ id: 'reply', title: 'Receive a reply', sub: m.canSim ? 'Approved · partial · information request · denied' : m.simReason, disabled: !m.canSim }) + item({ id: 'day', title: 'Advance a day', sub: m.canSim ? `Both clocks move together · now ${m.today}` : m.simReason, disabled: !m.canSim }),
        id => { if (id === 'reply') ctx.sim.receiveReply(); else ctx.sim.advanceDay(); }, { label: 'Simulation' });
    },
    surfaces(a) {
      const ss = ctx.surfaces();
      showMenu(a, 'surfaces', heading('Open a surface') + ss.map(s => item({ id: s.id, title: s.label, sub: s.sub, tag: s.external ? 'new tab' : '' })).join(''), id => { ctx.openSurface(id); }, { label: 'Surfaces' });
    },
    screens(a) {
      let list = ctx.screens();
      const render = (q) => {
        const f = list.filter(s => !q || (s.title + ' ' + s.id + ' ' + s.surfaceLabel).toLowerCase().includes(q.toLowerCase()));
        return f.length ? f.map(s => item({ id: s.id, title: s.title, sub: s.surfaceLabel, current: s.current })).join('') : '<p class="sh-menu__e">No screen matches.</p>';
      };
      showMenu(a, 'screens', `<div class="sh-menu__s"><label class="ui-sr" for="dock-q">Search screens</label><input id="dock-q" class="sh-menu__q" type="search" placeholder="Search screens" autocomplete="off"></div><div class="sh-menu__l" id="dock-ql">${render('')}</div>`,
        id => { ctx.openScreen(id); }, { label: 'All screens', onMount: (d) => {
          const q = d.querySelector('#dock-q'); const l = d.querySelector('#dock-ql');
          q.addEventListener('input', () => { l.innerHTML = render(q.value); });
          q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { const f = l.querySelector('[role=menuitem]'); if (f) { f.focus(); e.preventDefault(); e.stopPropagation(); } } else if (e.key === 'Enter') { const f = l.querySelector('[role=menuitem]'); if (f) f.click(); } });
          d.addEventListener('keydown', e => { if (e.key === 'ArrowUp' && document.activeElement === l.querySelector('[role=menuitem]')) { q.focus(); e.preventDefault(); e.stopPropagation(); } }, true);
          q.focus();
        } });
    }
  };

  // ---------- notes drawer ("How the data gets in") ----------
  ctx.openNotes = (routeId, opts = {}) => {
    const meta = ctx.routeMeta(routeId) || { title: routeId };
    const text = ctx.notes(routeId);
    const feats = ctx.features(routeId);
    const paras = String(text || '').split(/\n{2,}/).filter(Boolean).map(p => {
      const m = p.match(/^(HOW THE DATA GETS IN|HOW TO READ THE DEMO|Captured|Flows|Populates|Engineering)([·:].*)?/);
      const hasLabel = /^(Captured|Flows|Populates|Engineering):/.test(p);
      return hasLabel ? `<p><b>${esc(p.split(':')[0])}:</b>${esc(p.slice(p.indexOf(':') + 1))}</p>` : /^HOW /.test(p) ? `<p class="sh-note__k">${esc(p)}</p>` : `<p>${esc(p)}</p>`;
    }).join('');
    const chips = feats.length ? `<h3 class="sh-note__h">Maturity on this screen</h3><ul class="sh-note__f">${feats.map(f => `<li>${maturity(f, { className: 'is-forced' })}<span><b>${esc(f.title || f.id)}</b>${f.note ? `<small>${esc(f.note)}</small>` : ''}</span></li>`).join('')}</ul>` : '';
    const legend = `<h3 class="sh-note__h">Levels</h3><ul class="sh-note__f">${LEVEL_ORDER.map(l => `<li>${maturity({ level: l, note: '' }, { className: 'is-forced' })}</li>`).join('')}</ul>`;
    drawer({ title: opts.title || `How the data gets in · ${meta.title}`, className: 'sh-note', body: `${paras || '<p class="ui-muted">No note for this screen.</p>'}${chips}${opts.extra || ''}${legend}`, returnFocus: opts.returnFocus });
  };

  // ---------- events ----------
  el.addEventListener('click', e => {
    const m = e.target.closest('[data-dock-menu]'); if (m) { menus[m.dataset.dockMenu](m); return; }
    const d = e.target.closest('[data-dock]'); if (!d) return;
    const k = d.dataset.dock;
    if (k === 'toggle') ctx.setDock(el.dataset.state === 'open' ? 'collapsed' : 'open');
    else if (k === 'hide') ctx.setDock('hidden');
    else if (k === 'mode') ctx.setMode(el.dataset.mode === 'explore' ? 'presentation' : 'explore');
    else if (k === 'maturity') ctx.setMaturity(d.getAttribute('aria-pressed') !== 'true');
    else if (k === 'notes') ctx.openNotes(ctx.current()?.id, { returnFocus: d });
  });
  return { closeMenu };
}
