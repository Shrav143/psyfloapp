// Interaction-audit engine (review/06-demo-and-qa.md section d2, review/06b-qa-harness-spec.md 4.9). QA1.
//
//   enumerate(frame, {scopes, expand})   stamp every visible control with data-qa="n" and return descriptors (never positional clicks)
//   snapshot(frame, {scopes})            what a click can change: hash, DOM signature, field values, overlays, toast, scroll, focus
//   classify(before, after, ev, c)       NAVIGATED | POPUP | DOWNLOAD | STATE | DETAIL | CLOSE | DOM | TOAST-ONLY | TOAST-UNEXPLAINED | NO-EFFECT | ...
//   Sweeper                              the loop: fresh page state per control, click by stamp, classify, restore server state when it changed
//   summarize(rows)                      counts per outcome and the list of findings
//
// The page-side functions (probes, enumerate, snap) are serialised into the page by Playwright: they must not close over anything.
import { errors } from './index.mjs';
import { BY_ID, SCREENS } from '../../web/js/registry.js';
import { routeAllowed } from '../../web/js/shared/permissions.js';

// ---------------------------------------------------------------------------------------------------- page side
// init script: counts in-flight fetches and the time of the last DOM mutation so a click can be followed by "wait for quiet", not a timer
export function probes() {
  if (window.__qa) return;
  const qa = window.__qa = { pending: 0, last: performance.now(), popups: 0 };
  const of = window.fetch;
  window.fetch = function (...a) { qa.pending++; return of.apply(this, a).finally(() => { qa.pending--; qa.last = performance.now(); }); };
  const mo = new MutationObserver(ms => { if (ms.some(m => !(m.type === 'attributes' && m.attributeName === 'data-qa'))) qa.last = performance.now(); });
  const start = () => mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  // window.open from a handler (the old screens open PDFs and portals that way)
  const wo = window.open; window.open = function (...a) { qa.popups++; return wo.apply(this, a); };
}

// returns [{n, key, occ, tag, kind, type, role, name, nameSource, href, target, disabled, ariaDisabled, why, expanded, pressed, selected, current, checked, readonly, options, rect, where}]
export function enumerate(o) {
  const scopes = o.scopes || ['#root'];
  document.querySelectorAll('[data-qa]').forEach(e => e.removeAttribute('data-qa'));
  const roots = scopes.flatMap(s => [...document.querySelectorAll(s)]);
  if (o.expand) roots.forEach(r => r.querySelectorAll('details:not([open])').forEach(d => { d.open = true; }));
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=switch],[role=checkbox],[role=radio],[role=option],[onclick],[data-onclick],tr[tabindex="0"],[data-ui-open]';
  const seen = new Set(); const els = [];
  for (const r of roots) { if (r.matches(SEL) && !seen.has(r)) { seen.add(r); els.push(r); } for (const e of r.querySelectorAll(SEL)) if (!seen.has(e)) { seen.add(e); els.push(e); } }
  const visible = el => {
    if (el.closest('[inert],[hidden]')) return false;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    try { if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })) return false; } catch { }
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    return true;
  };
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const nameOf = el => {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = lb.split(/\s+/).map(i => { const x = document.getElementById(i); return x ? text(x) : ''; }).join(' ').trim(); if (t) return [t, 'aria-labelledby']; }
    const al = (el.getAttribute('aria-label') || '').trim(); if (al) return [al, 'aria-label'];
    if (el.labels && el.labels.length) { const t = [...el.labels].map(text).join(' ').trim(); if (t) return [t, 'label']; }
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && /^(button|submit|reset)$/.test(el.type)) { if (el.value) return [el.value, 'value']; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const ti = (el.getAttribute('title') || '').trim(); if (ti) return [ti, 'title'];
      const ph = (el.getAttribute('placeholder') || '').trim(); if (ph) return [ph, 'placeholder'];
      return ['', 'none'];
    }
    const t = text(el); if (t) return [t, 'content'];
    const img = el.querySelector('img[alt]'); if (img && img.alt.trim()) return [img.alt.trim(), 'img-alt'];
    const sv = el.querySelector('svg title'); if (sv && text(sv)) return [text(sv), 'svg-title'];
    const ti = (el.getAttribute('title') || '').trim(); if (ti) return [ti, 'title'];
    return ['', 'none'];
  };
  const kindOf = el => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'text';
    if (tag === 'input') { const t = (el.type || 'text').toLowerCase(); if (t === 'checkbox') return 'checkbox'; if (t === 'radio') return 'radio'; if (t === 'file') return 'file'; if (/^(button|submit|reset|image)$/.test(t)) return 'button'; if (t === 'range') return 'range'; if (/^(date|time|datetime-local|month|week)$/.test(t)) return 'datetime'; if (t === 'number') return 'number'; if (t === 'color') return 'color'; return 'text'; }
    if (tag === 'a') return 'link';
    if (tag === 'summary') return 'summary';
    if (tag === 'tr') return 'row';
    const role = el.getAttribute('role'); if (role === 'tab') return 'tab'; if (role === 'link') return 'link';
    return 'button';
  };
  const whyDisabled = el => {
    const t = (el.getAttribute('title') || '').trim(); if (t) return t;
    const d = el.getAttribute('aria-describedby'); if (d) { const x = d.split(/\s+/).map(i => { const n = document.getElementById(i); return n ? text(n) : ''; }).join(' ').trim(); if (x) return x; }
    const dr = (el.getAttribute('data-reason') || '').trim(); if (dr) return dr;
    // visible text next to it that says why: same parent (two levels), outside the control's own label
    const own = text(el); let p = el.parentElement;
    for (let i = 0; i < 2 && p; i++, p = p.parentElement) {
      const sib = [...p.children].filter(c => c !== el && !c.contains(el) && !c.matches('button,a[href],input,select,textarea,svg')).map(text).join(' ').trim();
      if (sib.length >= 12 && /(because|until|only|need|require|before|after|waiting|first|select|choose|enter|not |no |unavailable|can.?t|cannot|must|once|missing|permission|role|sign|add)/i.test(sib)) return 'adjacent: ' + sib.slice(0, 120);
    }
    return '';
  };
  const out = []; const occCount = new Map(); const byKey = new Map();
  let n = 0;
  for (const el of els) {
    if (!visible(el)) continue;
    if (el.closest('#dock,.ui-sr-only')) continue;
    const tag = el.tagName.toLowerCase(); const kind = kindOf(el);
    const [name, nameSource] = nameOf(el);
    let href = el.getAttribute('href'); if (href && el.tagName === 'A') { try { const u = new URL(el.href, location.href); href = u.origin === location.origin ? u.pathname + u.search + u.hash : u.href; } catch { } }
    const key = [tag, kind === 'button' ? '' : kind, name.slice(0, 70), href || ''].join('|');
    const occ = occCount.get(key) || 0; occCount.set(key, occ + 1);
    const r = el.getBoundingClientRect();
    const where = el.closest('#rail') ? 'rail' : el.closest('.ui-overlay') ? 'overlay' : el.closest('table') ? 'table' : el.closest('header,[role=banner]') ? 'header' : 'body';
    const d = { key, occ, tag, kind, type: el.getAttribute('type') || '', role: el.getAttribute('role') || '', name, nameSource, href: href || '', target: el.getAttribute('target') || '', download: el.hasAttribute('download'),
      disabled: !!el.disabled || el.matches('fieldset:disabled *'), ariaDisabled: el.getAttribute('aria-disabled') === 'true', expanded: el.getAttribute('aria-expanded'), pressed: el.getAttribute('aria-pressed'), selected: el.getAttribute('aria-selected'), current: el.getAttribute('aria-current'),
      checked: el.checked === true, readonly: !!el.readOnly, options: tag === 'select' ? el.options.length : 0, where, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    if (d.disabled || d.ariaDisabled) d.why = whyDisabled(el);
    d.el = el; out.push(d);
  }
  // keep the first and the last of identical controls (rows repeat the same button; a dead one in the middle is not expected)
  for (const d of out) { (byKey.get(d.key) || byKey.set(d.key, []).get(d.key)).push(d); }
  const keep = []; for (const list of byKey.values()) { keep.push(list[0]); if (list.length > 1) keep.push(list[list.length - 1]); }
  keep.sort((a, b) => out.indexOf(a) - out.indexOf(b));
  const total = out.length; const occTotal = Object.fromEntries([...byKey].map(([k, v]) => [k, v.length]));
  return { total, controls: keep.map(d => { d.n = n++; d.el.setAttribute('data-qa', String(d.n)); d.occOf = occTotal[d.key]; const e = d.el; delete d.el; return d; }) };
}

// the things a click can change
export function snap(o) {
  const scopes = o.scopes || ['#root'];
  const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; };
  const roots = scopes.flatMap(s => [...document.querySelectorAll(s)]);
  const volatile = !!o.volatile;
  let html = roots.map(r => r.innerHTML).join('\u0001').replace(/ data-qa="\d+"/g, '').replace(/ data-ui-id="[^"]*"/g, '').replace(/\bqt-a\d+\b/g, '');
  if (volatile) html = html.replace(/\d+/g, '#');
  const vals = roots.flatMap(r => [...r.querySelectorAll('input,select,textarea')]).map(e => (e.type === 'checkbox' || e.type === 'radio') ? (e.checked ? '1' : '0') : e.value).join('|');
  const det = roots.flatMap(r => [...r.querySelectorAll('details')]).map(d => d.open ? 1 : 0).join('');
  const ov = [...document.querySelectorAll('#ui-overlays .ui-overlay, #modal')].map(e => { const t = e.querySelector('.ui-dialog__t,h1,h2,h3,[aria-label]'); return (e.getAttribute('data-ui-overlay') || 'modal') + ':' + (t ? (t.textContent || t.getAttribute('aria-label') || '').trim().slice(0, 60) : ''); });
  const toast = [...document.querySelectorAll('#toasts .ui-toast, #toasts > *')].map(e => (e.textContent || '').trim()).filter(Boolean).join(' | ');
  const a = document.activeElement; const act = a && a !== document.body ? (a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.getAttribute('data-qa') ? '[' + a.getAttribute('data-qa') + ']' : '')) : '';
  const scrollers = roots.flatMap(r => [...r.querySelectorAll('*')]).filter(e => e.scrollTop > 0).map(e => Math.round(e.scrollTop)).join(',');
  const rail = (document.getElementById('rail') || {}).innerHTML || '';
  const docEl = document.documentElement;
  return { hash: location.hash, path: location.pathname + location.search, title: document.title, sig: hashStr(html), vals: hashStr(vals), det, ov, toast, act, scrollY: Math.round(scrollY), scrollers, rail: hashStr(rail), railActive: (document.querySelector('#rail [aria-current]') || {}).textContent || '',
    pending: window.__qa ? window.__qa.pending : 0, popups: window.__qa ? window.__qa.popups : 0, lang: docEl.lang, text: (roots[0] ? (roots[0].innerText || '') : '').slice(0, 4000) };
}
export function pageProbe() {
  const main = document.querySelector('#root main, #root [role=main], #panel') || document.getElementById('root');
  const h1 = [...document.querySelectorAll('h1')].map(h => (h.textContent || '').trim()).join(' / ');
  const body = (document.getElementById('root') || document.body).innerText || '';
  return { h1, notFound: /Page not found/i.test(body) && /There is no page called/i.test(body), denied: /Not available for/i.test(body) && /hidden from this role/i.test(body), presenterOnly: /Presenter only/i.test(body), id: (window.psyflo && window.psyflo.current && window.psyflo.current.id) || '', text: body.slice(0, 200), hasMain: !!main };
}

// ---------------------------------------------------------------------------------------------------- node side
export const sleep = ms => new Promise(r => setTimeout(r, ms));
const REASON = /(because|until|only|need|require|first|select|choose|enter|not |no |unavailable|can.?t|cannot|must|missing|already|permission|sign in|add |fill|wait|after|before|once)/i;
const DONE = /(copied|saved|sent|downloaded|done|opened|updated|added|removed|recorded|started|stopped|logged|marked|cleared|reset|applied|created|filled|noted|approved|dismissed|snoozed|assigned)/i;

// pure: classify one click
export function classify(b, a, ev, c) {
  const flags = [];
  const out = (outcome, detail = '') => ({ outcome, detail, flags });
  if (ev.errors && ev.errors.length) flags.push('console-error');
  if (ev.nativeDialog) flags.push('native-dialog');
  if (ev.chooser) return out('FILE-CHOOSER', ev.chooser);
  if (ev.popup) return out('POPUP', ev.popup);
  if (ev.parentMoved) return out('NAVIGATED', 'the Lauris page moved');
  if (ev.download) return out('DOWNLOAD', ev.download);
  if (b.hash !== a.hash || b.path !== a.path) return out('NAVIGATED', `${b.hash || b.path} -> ${a.hash || a.path}`);
  const ovAdded = a.ov.filter(x => !b.ov.includes(x)); const ovGone = b.ov.filter(x => !a.ov.includes(x));
  if (ovAdded.length || a.ov.length > b.ov.length) return out('DETAIL', ovAdded.join(', ') || 'overlay');
  if (ovGone.length || a.ov.length < b.ov.length) return out('CLOSE', ovGone.join(', '));
  if (ev.revChanged || ev.laurisChanged) return out('STATE', ev.revChanged ? 'server state changed' : 'mock Lauris changed');
  if (ev.parentFormChanged) return out('TYPED', 'typed into the Lauris form');
  const domChanged = a.sig !== b.sig || a.vals !== b.vals || a.det !== b.det || a.lang !== b.lang || a.rail !== b.rail;
  if (domChanged) return out('DOM', a.det !== b.det ? 'section toggled' : a.vals !== b.vals && a.sig === b.sig ? 'value changed' : 'screen changed');
  if (a.toast && a.toast !== b.toast) {
    const t = a.toast.replace(b.toast, '').trim() || a.toast;
    if (REASON.test(t) || DONE.test(t)) return out('TOAST-ONLY', t.slice(0, 120));
    return out('TOAST-UNEXPLAINED', t.slice(0, 120));
  }
  if (a.scrollY !== b.scrollY || a.scrollers !== b.scrollers) return out('SCROLL', 'scrolled');
  // focus went to a different element than the control itself (a "Change student" link that focuses the chip list): a weak effect, listed in the report
  if (a.act && a.act !== b.act && !a.act.endsWith('[' + c.n + ']') && c.kind === 'link') return out('FOCUS-ONLY', 'moved focus to ' + a.act);
  // allowlist: nothing should change (design rules of review 06 d2.7)
  if (c.kind === 'tab' && (c.selected === 'true' || c.current)) return out('NO-EFFECT-ALLOWED', 'active tab');
  if (c.kind === 'radio' && c.checked) return out('NO-EFFECT-ALLOWED', 'radio already selected');
  if (c.current && /page|true|step/.test(c.current)) return out('NO-EFFECT-ALLOWED', 'link to the current page');
  if (c.pressed === 'true' && c.kind === 'button') return out('NO-EFFECT-ALLOWED', 'active toggle');
  if (c.kind === 'text' || c.kind === 'number' || c.kind === 'datetime' || c.kind === 'range') return out('NO-EFFECT-ALLOWED', 'text field (focus only)');
  if (c.href && c.href.startsWith('#') && !c.href.startsWith('#/')) return out('NO-EFFECT-ALLOWED', 'anchor already in view');
  if (b.act !== a.act && c.href && /^#main$|^#$/.test(c.href)) return out('NO-EFFECT-ALLOWED', 'skip link moves focus');
  return out('NO-EFFECT', '');
}

// never clicked by the sweep: ending the session (covered by roles/presenter), presenter actions (covered by presenter.mjs)
export const DEFAULT_DENY = c => /^sign out$/i.test(c.name) ? 'sign out (covered separately)' : /^(reset|advance a day|receive a reply)$/i.test(c.name) ? 'presenter action (covered by presenter.mjs)' : null;
export async function lauSnap(base) {
  try { const r = await fetch(base.replace(/\/$/, '') + '/__test/lauris'); const t = await r.text(); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); } catch { return ''; }
}
export async function revOf(base) { try { const j = await (await fetch(base.replace(/\/$/, '') + '/api/roster')).json(); return j.rev; } catch { return null; } }

export async function installProbes(ctx) { await ctx.addInitScript(probes); }

// wait until no fetch is in flight and the DOM has been quiet for `quiet` ms
export async function settle(frame, { quiet = 220, max = 2600 } = {}) {
  try { await frame.waitForFunction(q => window.__qa && window.__qa.pending === 0 && performance.now() - window.__qa.last > q, quiet, { timeout: max, polling: 30 }); } catch { }
}

// A Sweeper holds the browser page and runs targets. target = {
//   id, role, kind ('app'|'phone'|'portal'|'panel'), open():Promise (a FRESH load of the route; resolves when ready), frame():Frame, scopes:[css], expand?:bool,
//   includeRail?, deny?(c) -> reason|null, fixture?:string, parentForm?:() => Promise<string> (signature of the Lauris form around a panel) }
export class Sweeper {
  constructor({ page, base, lauris, resetServer, log = () => { }, maxPerTarget = 220, deep = true, deepCap = 14, fastBack = true }) {
    Object.assign(this, { page, base, lauris, resetServer, log, maxPerTarget, deep, deepCap, fastBack });
    this.errs = errors(page); this.popups = []; this.downloads = []; this.dialogs = []; this.choosers = [];
    page.on('filechooser', fc => { this.choosers.push(fc.isMultiple() ? 'file chooser (several files)' : 'file chooser'); });
    page.context().on('page', pg => { if (pg !== page) this.popups.push(pg); });
    page.on('download', d => this.downloads.push(d));
    page.on('dialog', d => { this.dialogs.push(d.message()); d.accept().catch(() => { }); });
  }
  clearEvents() { this.errs.length = 0; this.downloads.length = 0; this.dialogs.length = 0; this.choosers.length = 0; }
  async closePopups() { for (const p of this.popups.splice(0)) { try { await p.close(); } catch { } } }

  async fresh(T) {
    await this.closePopups(); this.clearEvents();
    await T.open();
    let f = T.frame();
    if (T.kind === 'panel') {                                    // the panel's iframe can be replaced while the Lauris page settles: wait for one that stays
      for (let i = 0; i < 8; i++) { await sleep(350); const g = T.frame(); try { await g.evaluate(() => document.readyState); if (g === f) break; f = g; } catch { f = T.frame() || f; } }
    }
    if (T.afterOpen) { try { await T.afterOpen(); } catch { } }
    await settle(f);
    return f;
  }
  async tryBack(T, hash) {
    try {
      this.clearEvents(); await this.page.goBack({ waitUntil: 'commit', timeout: 3000 }); const f = T.frame(); await settle(f, { quiet: 200, max: 2500 });
      const ok = await f.evaluate(h => location.hash === h && !!document.querySelector('#root main, #root h1, #root [role=main]') && !document.querySelector('#root .sh-loading'), hash).catch(() => false);
      return ok ? f : null;
    } catch { return null; }
  }
  async list(T, f, o = {}) {
    for (let i = 0; ; i++) { try { return await f.evaluate(enumerate, { scopes: o.scopes || T.scopes, expand: o.expand ?? T.expand }); } catch (e) { if (i >= 3 || !/detached|destroyed|closed/i.test(String(e.message))) throw e; await sleep(400); f = T.frame() || f; } }
  }
  async measure(T, f, scopes) {
    // learn whether the screen changes by itself (timers, polling): compare two snapshots a moment apart
    for (let i = 0; ; i++) { try { const s1 = await f.evaluate(snap, { scopes }); await sleep(450); const s2 = await f.evaluate(snap, { scopes }); return s1.sig !== s2.sig; } catch (e) { if (i >= 3 || !/detached|destroyed|closed/i.test(String(e.message))) throw e; await sleep(400); f = T.frame() || f; } }
  }

  // one control, from a fresh page: returns a row
  async probeOne(T, c, { opener = null, depth = 1 } = {}) {
    const f = T.frame();
    const scopes = depth === 2 ? ['#ui-overlays .ui-dialog', '#modal .ui-dialog'] : T.scopes;
    const row = { target: T.id, role: T.role, kind: T.kind, depth, key: c.key, name: c.name, tag: c.tag, ctl: c.kind, href: c.href, where: c.where, via: opener ? opener.key : '', flags: [] };
    // accessible name
    if (!c.name && c.kind !== 'row') { row.flags.push('unnamed'); }
    if (c.kind === 'row' && !c.name) { row.flags.push('unnamed'); }
    // disabled: never clicked; must say why
    if (c.disabled) { row.outcome = c.why ? 'DISABLED-EXPLAINED' : 'DISABLED-UNEXPLAINED'; row.detail = c.why || ''; return row; }
    const deny = DEFAULT_DENY(c) || (T.deny && T.deny(c));
    if (deny) { row.outcome = 'SKIPPED'; row.detail = deny; return row; }
    // external links: HEAD-check only
    if (c.kind === 'link' && /^https?:\/\//i.test(c.href) && !c.href.startsWith(this.base) && !c.href.startsWith(this.lauris) && !/^https?:\/\/localhost/i.test(c.href)) {
      try { const r = await fetch(c.href, { method: 'HEAD', signal: AbortSignal.timeout(4000) }); row.outcome = r.ok ? 'EXTERNAL' : 'EXTERNAL-BROKEN'; row.detail = c.href + ' ' + r.status; } catch (e) { row.outcome = 'EXTERNAL-UNCHECKED'; row.detail = c.href + ' (' + String(e.message).slice(0, 40) + ')'; }
      return row;
    }
    if (c.kind === 'file') { row.outcome = 'SKIPPED'; row.detail = 'file chooser'; return row; }
    const t0 = Date.now();
    const loc = f.locator(`[data-qa="${c.n}"]`);
    if (!(await loc.count())) { row.outcome = 'VANISHED'; row.detail = 'control not found after reload'; return row; }
    const volatile = !!T._volatile;
    const rev0 = await revOf(this.base); const lau0 = T.kind === 'panel' || T.checkLauris ? await lauSnap(this.lauris) : ''; const pf0 = T.parentForm ? await T.parentForm() : '';
    const before = await f.evaluate(snap, { scopes, volatile });
    const nPop = this.popups.length; this.clearEvents(); const parentUrl0 = this.page.url();
    let act = '';
    try {
      switch (c.kind) {
        case 'select': {
          if (c.options < 2) { row.outcome = 'SKIPPED'; row.detail = 'select with one option'; return row; }
          const cur = await loc.evaluate(e => e.selectedIndex); await loc.selectOption({ index: cur === 1 ? 0 : 1 }, { timeout: 2500 }); act = 'selected option'; break;
        }
        case 'text': { await loc.click({ timeout: 2500 }); if (!c.readonly) { await loc.pressSequentially('a', { delay: 20 }); } act = 'typed'; break; }
        case 'number': { await loc.click({ timeout: 2500 }); await loc.fill('3', { timeout: 2000 }); act = 'typed'; break; }
        case 'datetime': { await loc.click({ timeout: 2500 }); const t = await loc.getAttribute('type'); await loc.fill(t === 'time' ? '09:15' : '2026-11-02', { timeout: 2000 }).catch(() => { }); act = 'typed'; break; }
        case 'range': { await loc.focus(); await f.page().keyboard.press('ArrowRight'); act = 'key'; break; }
        case 'color': { row.outcome = 'SKIPPED'; row.detail = 'color picker'; return row; }
        default: {
          // a toast from an earlier click can sit over the control for a few seconds: wait it out before calling a control unclickable
          for (let i = 0; ; i++) { try { await loc.click({ timeout: 2500 }); break; } catch (e) { if (i >= 2 || !/intercepts pointer events|not stable|not visible/.test(String(e.message))) throw e; await sleep(1600); } }
          act = 'click';
        }
      }
    } catch (e) {
      const m = String(e.message || e);
      row.outcome = 'UNCLICKABLE';
      row.detail = (/intercepts pointer events/.test(m) ? 'covered by ' + ((m.match(/<[^>]{0,120}>/g) || [])[1] || 'another element') : m.split('\n')[0]).slice(0, 200);
      return row;
    }
    await settle(f, { quiet: 170, max: 3000 });
    // popups open a tick later (only links and openers that say so are given the extra moment)
    if (this.popups.length === nPop && (c.target === '_blank' || /open|lauris|portal|print|pdf|download|view/i.test(c.name))) await sleep(140);
    let after, ev, cl, frameGone = false;
    const measureAfter = async () => {
      // the server refusing an action (400, 401, 403, 409, 422) is a visible, designed answer, not a console error; a 500 or a script error is
      const REFUSAL = /^HTTP (400|401|403|409|422) \S*\/api\/do$/;
      ev = { errors: this.errs.filter(e => !REFUSAL.test(e)), refused: this.errs.filter(e => REFUSAL.test(e)).length, nativeDialog: this.dialogs.length ? this.dialogs[0] : '', parentMoved: T.kind === 'panel' && this.page.url() !== parentUrl0 };
      if (ev.refused && !row.flags.includes('refused')) row.flags.push('refused');
      if (this.popups.length > nPop) {
        const pg = this.popups[this.popups.length - 1];
        try { await pg.waitForLoadState('domcontentloaded', { timeout: 4000 }); } catch { }
        let status = '';
        try { const info = await pg.evaluate(() => ({ t: document.title, b: (document.body.innerText || '').slice(0, 160) })); status = (/\b404\b|not found|cannot get|error/i.test(info.t + ' ' + info.b) ? 'BROKEN ' : '') + pg.url() + ' · ' + info.t; } catch { status = pg.url(); }
        ev.popup = status; if (/^BROKEN/.test(status) && !row.flags.includes('broken-popup')) row.flags.push('broken-popup');
      }
      if (!ev.popup && this.downloads.length) ev.download = this.downloads[0].suggestedFilename();
      if (this.choosers.length) ev.chooser = this.choosers[0];
      if (!ev.popup && !ev.download) { const w = await f.evaluate(() => window.__qa ? window.__qa.popups : 0); if (w > before.popups) ev.popup = 'window.open (blocked or closed)'; }
      after = await f.evaluate(snap, { scopes, volatile });
      const rev1 = await revOf(this.base); ev.revChanged = rev0 != null && rev1 != null && rev1 !== rev0;
      if (T.kind === 'panel' || T.checkLauris) ev.laurisChanged = lau0 !== (await lauSnap(this.lauris));
      if (T.parentForm) ev.parentFormChanged = pf0 !== (await T.parentForm());
    };
    try {
      await measureAfter(); cl = classify(before, after, ev, c);
      if (cl.outcome === 'NO-EFFECT' || (c.kind === 'select' && cl.outcome === 'DOM')) { await sleep(T.kind === 'panel' ? 1100 : 700); await settle(f, { quiet: 300, max: 2500 }); await measureAfter(); cl = classify(before, after, ev, c); row.secondLook = true; }   // an effect that arrives late (a panel asking the Lauris page to move) is still an effect
    } catch (e) {
      if (!/detached|destroyed|closed|Target page/i.test(String(e.message))) throw e;
      frameGone = true;                                           // the click replaced the frame (a panel button that moves the Lauris page on)
    }
    if (frameGone) {
      await sleep(700); const url1 = this.page.url();
      row.outcome = url1 !== parentUrl0 ? 'NAVIGATED' : 'DOM'; row.detail = url1 !== parentUrl0 ? 'the Lauris page moved: ' + parentUrl0.replace(/^https?:\/\/[^/]+/, '') + ' -> ' + url1.replace(/^https?:\/\/[^/]+/, '') : 'the panel was reloaded'; row.act = act; row.ms = Date.now() - t0; row.dirty = true; row.sameDoc = false; const rev1 = await revOf(this.base); const lau1 = T.kind === 'panel' || T.checkLauris ? await lauSnap(this.lauris) : lau0; row.revChanged = rev0 != null && rev1 != null && rev1 !== rev0; row.laurisChanged = lau1 !== lau0; row.mutated = row.revChanged || row.laurisChanged; if (T.kind === 'panel' && row.laurisChanged) row.flags.push('panel-wrote-lauris'); return row;
    }
    row.outcome = cl.outcome; row.detail = cl.detail; row.flags.push(...cl.flags); row.act = act; row.ms = Date.now() - t0;
    row.revChanged = !!ev.revChanged; row.laurisChanged = !!ev.laurisChanged;
    if (T.kind === 'panel' && ev.laurisChanged) row.flags.push('panel-wrote-lauris');
    if (ev.errors.length) row.errors = ev.errors.slice(0, 3);
    row.fromHash = before.hash; row.sameDoc = before.path === after.path;
    if (cl.outcome === 'NAVIGATED') {
      const p = await f.evaluate(pageProbe).catch(() => null);
      row.dest = after.hash || after.path; if (p) { row.destH1 = p.h1; row.destId = p.id;
        const m = (after.hash || '').match(/^#\/([\w.]+)/); const rid = m ? m[1].replace(/\.dc\.html$/, '') : '';
        if (p.notFound) row.flags.push('not-found'); if (p.denied) row.flags.push('role-dead-end'); if (rid && !BY_ID[rid]) row.flags.push('unregistered-route'); }
    }
    if (c.kind === 'link' && cl.outcome === 'NAVIGATED' && c.href && !c.href.startsWith('#') && f === this.page.mainFrame()) row.hrefKind = 'path';
    // a toast that explains a refusal
    row.dirty = cl.outcome !== 'NO-EFFECT' && cl.outcome !== 'NO-EFFECT-ALLOWED' && cl.outcome !== 'SCROLL' && cl.outcome !== 'TOAST-UNEXPLAINED';
    if (ev.revChanged || ev.laurisChanged || ev.parentFormChanged) row.mutated = true;
    return row;
  }

  // sweep a target: every control, each from a fresh page; overlays opened by a control are swept one level down
  async sweep(T, { maxControls = this.maxPerTarget } = {}) {
    const rows = []; const t0 = Date.now(); let f = await this.fresh(T);
    T._volatile = await this.measure(T, f, T.scopes);
    const pre = await f.evaluate(pageProbe).catch(() => ({}));
    const meta = { target: T.id, role: T.role, kind: T.kind, h1: pre.h1, pageId: pre.id, denied: !!pre.denied, notFound: !!pre.notFound, errorsOnLoad: this.errs.slice(), volatile: T._volatile };
    if (pre.denied || pre.notFound || pre.presenterOnly) { meta.skipped = pre.denied ? 'Not available for this role' : pre.notFound ? 'Page not found' : 'Presenter only'; return { meta, rows, total: 0, ms: Date.now() - t0 }; }
    let { total, controls } = await this.list(T, f);
    if (T.includeRail === false) controls = controls.filter(c => c.where !== 'rail');
    meta.closedDetails = await f.evaluate(sc => sc.reduce((n, q) => n + document.querySelectorAll(q + ' details:not([open])').length, 0), T.scopes).catch(() => 0);
    if (T.skipKeys) controls = controls.filter(c => !T.skipKeys.has(c.key + '#' + c.occ));
    meta.total = total; meta.unique = controls.length; meta.truncated = Math.max(0, controls.length - maxControls);
    meta.keys = controls.map(c => c.key + '#' + c.occ);
    controls = controls.slice(0, maxControls);
    const overlays = new Set(); let innerBudget = this.deepCap;
    let dirty = false;
    for (let i = 0; i < controls.length; i++) {
      let c = controls[i];
      if (dirty || T._needReload) { f = (dirty && dirty.back && await this.tryBack(T, dirty.back)) || await this.fresh(T); const re = await this.list(T, f); const m = re.controls.find(x => x.key === c.key && x.occ === c.occ) || re.controls.find(x => x.key === c.key); if (!m) { rows.push({ target: T.id, role: T.role, kind: T.kind, depth: 1, key: c.key, name: c.name, tag: c.tag, ctl: c.kind, outcome: 'VANISHED', detail: 'not present after reload', flags: [] }); dirty = false; continue; } c = { ...m }; dirty = false; T._needReload = false; }
      else { const present = await f.locator(`[data-qa="${c.n}"]`).count().catch(() => 0); if (!present) { f = await this.fresh(T); const re = await this.list(T, f); const m = re.controls.find(x => x.key === c.key && x.occ === c.occ) || re.controls.find(x => x.key === c.key); if (!m) { rows.push({ target: T.id, role: T.role, kind: T.kind, depth: 1, key: c.key, name: c.name, tag: c.tag, ctl: c.kind, outcome: 'VANISHED', detail: 'not present after repaint', flags: [] }); continue; } c = { ...m }; } }
      const row = await this.probeOne(T, c);
      rows.push(row);
      if (row.mutated && this.resetServer) { await this.resetServer(T.fixture || 'base-live'); }
      dirty = !!row.dirty || !!row.mutated || row.outcome === 'UNCLICKABLE' || row.outcome === 'POPUP' || row.outcome === 'DOWNLOAD';
      // a same-document navigation that changed nothing on the server can be undone with Back: the screen's controller is created again (as fresh as a reload, 100 ms instead of 700)
      if (dirty && row.outcome === 'NAVIGATED' && row.sameDoc && !row.mutated && T.kind !== 'panel' && this.fastBack) dirty = { back: row.fromHash };
      // second level: the overlay this control opened
      if (this.deep && row.outcome === 'DETAIL' && innerBudget > 0 && T.kind !== 'panel-nodeep') {
        const okey = row.detail; if (overlays.has(okey)) continue; overlays.add(okey);
        f = await this.fresh(T); const re = await this.list(T, f); const m = re.controls.find(x => x.key === c.key && x.occ === c.occ) || re.controls.find(x => x.key === c.key); if (!m) { dirty = false; continue; }
        try { await f.locator(`[data-qa="${m.n}"]`).click({ timeout: 2500 }); } catch { dirty = true; continue; }
        await settle(f);
        const inner = await f.evaluate(enumerate, { scopes: ['#ui-overlays .ui-dialog', '#modal .ui-dialog'] });
        const ic = inner.controls.filter(x => !/^(close)$/i.test(x.name) || true).slice(0, 10);
        for (let j = 0; j < ic.length && innerBudget > 0; j++) {
          innerBudget--;
          let x = ic[j];
          if (j > 0) { f = await this.fresh(T); const r2 = await this.list(T, f); const mm = r2.controls.find(y => y.key === c.key && y.occ === c.occ) || r2.controls.find(y => y.key === c.key); if (!mm) break; try { await f.locator(`[data-qa="${mm.n}"]`).click({ timeout: 2500 }); } catch { break; } await settle(f); const in2 = await f.evaluate(enumerate, { scopes: ['#ui-overlays .ui-dialog', '#modal .ui-dialog'] }); x = in2.controls.find(y => y.key === x.key && y.occ === x.occ) || in2.controls.find(y => y.key === x.key); if (!x) break; }
          const ir = await this.probeOne(T, x, { opener: c, depth: 2 });
          rows.push(ir);
          if (ir.mutated && this.resetServer) await this.resetServer(T.fixture || 'base-live');
        }
        dirty = true;
      }
    }
    meta.ms = Date.now() - t0;
    return { meta, rows, total: meta.total, ms: meta.ms };
  }
}

// ---------------------------------------------------------------------------------------------------- route inventory (shared with a11y.mjs and visual.mjs)
// Parameter variants (UI-KIT section 5 deep-link patterns). Variants a role cannot open are dropped by routeAllowed; redirect-only historic ids
// (DoNext, Partials?id ...) land on these same screens and are covered by test/routes.mjs.
export const REDIRECT_ONLY = new Set(['DoNext', 'ReviewQueue', 'StaffDashboard', 'Users', 'Submission', 'EarlyDischarge', 'InfoRequest', 'Partials', 'PeerBrief', 'PayerPlaybook', 'Eligibility', 'WhereThingsLive', 'UiKit', 'Login']);
export const VARIANTS = {
  MyWork: { direct_support: [{ section: 'day' }], supervisor: [{ section: 'review' }, { section: 'team' }, { section: 'day' }], clinician: [{ section: 'todo' }, { section: 'review' }, { section: 'team' }, { section: 'referrals' }], admin: [{ section: 'todo' }, { section: 'team' }] },
  Authorizations: { '*': [{}] },
  Authorization: { clinician: ['R-0411', 'R-0402', 'R-0399', 'R-0391', 'R-0388', 'R-0384'].map(id => ({ id })), supervisor: [{ id: 'R-0411' }, { id: 'R-0399' }], admin: [{ id: 'R-0411' }, { id: 'R-0402' }] },
  DenialIntelligence: { clinician: [{}, { decision: 'partial' }], admin: [{}] },
  DenialCase: { clinician: [{ id: 'R-0402', section: 'decision' }, { id: 'R-0402', section: 'evidence' }, { id: 'R-0402', section: 'options' }, { id: 'R-0402', section: 'action', action: 'options' }, { id: 'R-0402', section: 'history' },
    { id: 'R-0408', section: 'action', action: 'info' }, { id: 'R-0388', section: 'action', action: 'p2p' }, { id: 'R-0384', section: 'action', action: 'appeal' }, { id: 'R-0384', section: 'action', action: 'reconsider' }], admin: [{ id: 'R-0402', section: 'decision' }] },
  Analytics: { clinician: [{ section: 'outcomes', dataset: 'case' }, { section: 'outcomes', dataset: 'illustrative' }, { section: 'payer', dataset: 'case' }, { section: 'payer', panel: 'guidance' }, { section: 'population', dataset: 'illustrative' }], supervisor: [{ section: 'outcomes' }], admin: [{ section: 'outcomes' }, { section: 'payer' }, { section: 'population', dataset: 'illustrative' }] },
  Settings: { admin: ['people', 'roles', 'units', 'rules', 'audit', 'family', 'presenter'].map(tab => ({ tab })) },
  Referrals: { '*': [{}] },
  Referral: { clinician: [{ id: 'REF-118' }, { id: 'REF-121' }, { id: 'REF-119' }, { id: 'REF-117' }, { id: 'REF-118', panel: 'eligibility' }] }
};
export const variantsFor = (id, role) => { const v = VARIANTS[id]; if (!v) return [{}]; return v[role] || v['*'] || []; };

export function appRoutes(role) {
  const out = [];
  for (const s of SCREENS) {
    if (!['app', 'ext'].includes(s.surface) || REDIRECT_ONLY.has(s.id)) continue;
    if (!routeAllowed(role, s.id)) continue;
    if (s.surface === 'ext' && role === 'supervisor' && s.id !== 'ExtHome') continue;
    for (const p of variantsFor(s.id, role)) out.push({ id: s.id, params: p });
  }
  return out;
}


// ---------------------------------------------------------------------------------------------------- reporting
export const FINDING = new Set(['NO-EFFECT', 'DISABLED-UNEXPLAINED', 'UNCLICKABLE', 'EXTERNAL-BROKEN', 'TOAST-UNEXPLAINED', 'VANISHED-NOT']);
export function isFinding(r) {
  if (FINDING.has(r.outcome)) return true;
  return (r.flags || []).some(f => ['unnamed', 'console-error', 'not-found', 'role-dead-end', 'unregistered-route', 'broken-popup', 'panel-wrote-lauris'].includes(f));
}
export function summarize(results) {
  const by = {}; const findings = [];
  for (const { meta, rows } of results) {
    const k = meta.target; const o = by[k] = by[k] || { role: meta.role, kind: meta.kind, total: meta.total || 0, unique: meta.unique || 0, counts: {}, rows: 0, skipped: meta.skipped || '' };
    for (const r of rows) { o.rows++; o.counts[r.outcome] = (o.counts[r.outcome] || 0) + 1; if (isFinding(r)) findings.push(r); }
  }
  return { by, findings };
}
