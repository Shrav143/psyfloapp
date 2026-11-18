// "What Psyflo would do" for a denial case, as a side drawer (R6). One function, two openers: the case page (DenialCase.js) and the Suggestions chip in the
// queue (DenialIntelligence.js), so a clinician can include, dismiss, add context to and add their own suggestion without leaving the list.
// The cards are the shared kit (ui.recDrawer, web/js/ui/recs.js) over the shared engine (web/js/shared/recs.js); the server validates every decision
// (x-recs.js) and keeps "Added from recommendations" in every unsent draft in step (x-disputes.js syncRecsSection). Nothing here writes a clinical sentence.
// Everything the drawer shows is read from the live state (api.state) at the moment it paints, never from the page it was opened in.
import { ui, api, M } from '../app.js';
import * as D from '../shared/sel/disputes.js';
import * as R from '../shared/recs.js';
import { laurisLink } from '../shared/lauris-link.js';

let memo = null;
// the evidence index of a case, kept for one state revision (every card of the drawer reads it)
export function idxFor(s, id) {
  const key = s.rev + ':' + id;
  if (!memo || memo.key !== key) { const d = D.byRequest(s, id), r = M.byId(s.requests, id); memo = { key, idx: d && r ? D.evidenceIndex(s, d, r, { read: true }) : null }; }
  return memo.idx;
}
// the ranked list of an open case (clinicians only: the projected state of every other role has no clinical records to build it from)
export function recsOf(s, id, me) {
  if (!D.canReadClinical(me)) return [];
  const d = D.byRequest(s, id); const r = M.byId(s.requests, id);
  return d && r && D.isOpen(d) ? R.denialRecsFor(s, d, r, idxFor(s, id)) : [];
}
// a short read of the list for a queue row: how many are live, how many of those are high impact, how many are included
export function countsOf(recs) {
  const live = recs.filter(r => r.state !== 'dismissed');
  return { live: live.length, high: live.filter(r => r.impact === 'high').length, included: recs.filter(r => r.state === 'included').length };
}
// the shared card kit is built for a desktop drawer; on a phone each tap target here is at least 44 px (this screen's css only, the kit is untouched)
export const REC_PHONE_CSS = `
@media (max-width:760px){
.rc[data-scope=denial] .rc__top{min-height:44px;align-items:center}
.rc[data-scope=denial] .rc__chk{width:24px;height:24px}
.rc[data-scope=denial] .rc__t{min-height:44px;display:flex;align-items:center}
.rc[data-scope=denial] .rc__why summary,.rc[data-scope=denial] .rc__gone summary{min-height:44px;display:flex;align-items:center}
.rc[data-scope=denial] .ui-btn{min-height:44px}
.rc[data-scope=denial] .ui-evidence,.d-pv .ui-evidence{min-height:44px}
}
`;
const CTRL = ['data-rc-check', 'data-rc-dismiss', 'data-rc-ctx', 'data-rc-reopen', 'data-rc-remove', 'data-rc-add', 'data-rc-apply'];

// openDenialRecs({ ref: request id, me, el: the opener (focus comes back to it), key: open at that card, add: open "Add your own", onChange: after each decision })
export function openDenialRecs({ ref, me, el, key = null, add = false, onChange }) {
  if (!D.canReadClinical(me)) return null;
  const cl = (() => { const r = M.byId(api.state.requests, ref); return r ? M.client(api.state, r.client) || {} : {}; })();
  let mark = null;   // the control that had focus when a decision was sent: the drawer repaints, and focus goes back to the same control
  const h = ui.recDrawer({
    title: 'What Psyflo would do', heading: 'Pick what goes into the reply', scope: 'denial', ref, returnFocus: el,
    recs: () => recsOf(api.state, ref, me), s: () => api.state, canAct: D.canWork(me),
    chips: r => { const idx = idxFor(api.state, ref); return idx ? (r.evidence || []).map(id => D.evidenceById(idx, id)).filter(Boolean).map(it => ui.evidenceChip(D.chipOpts(it))).join('') : ''; },
    laurisHref: r => r.act && r.act.kind === 'lauris' && r.act.path ? laurisLink(api.config && api.config.laurisURL, me, r.act.path, { who: cl.initials, title: r.act.label, variant: 'button' }) : '',
    call: async (action, args) => {
      const ae = document.activeElement; const li = ae && ae.closest ? ae.closest('[data-rec]') : null;
      mark = { key: li ? li.dataset.rec : null, attr: ae && ae.hasAttribute ? CTRL.find(a => ae.hasAttribute(a)) : null };
      try { return await api.do(action, args); } catch (e) { ui.toast(e.message, 'err'); throw e; }
    },
    onChange: r => {
      const dlg = h.dialog;
      if (dlg && mark) {
        let t = null;
        if (mark.key) { const li = dlg.querySelector(`[data-rec="${CSS.escape(mark.key)}"]`); t = li && ((mark.attr && li.querySelector(`[${mark.attr}]`)) || li.querySelector('[data-rc-check]')); }
        else if (mark.attr) t = dlg.querySelector(`[${mark.attr}]`);
        if (!t) { t = dlg.querySelector('.rc__h'); if (t) t.setAttribute('tabindex', '-1'); }
        if (t) t.focus({ preventScroll: true });
      }
      if (onChange) onChange(r);
    }
  });
  if (key) { const li = h.dialog.querySelector(`[data-rec="${CSS.escape(key)}"]`); if (li) { const t = li.querySelector('[data-rc-ctx]') || li.querySelector('[data-rc-check]'); li.scrollIntoView({ block: 'nearest' }); if (t) t.focus({ preventScroll: true }); } }
  if (add) { const b = h.dialog.querySelector('[data-rc-add]'); if (b) b.click(); }
  return h;
}
