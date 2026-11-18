// "Suggested by Psyflo" on the Authorizations screens (R6, Owner A): one place for what the list and the case page share.
//
//   mayRecs(me)                         true for the treating clinician only (the actions need drafts.clinical and the server sends decisions to clinicians only)
//   recsFor(s, id)                      the recomputed list for a request (shared/recs.js listFor, scope 'auth'; the server validates decisions against the same list)
//   counts(recs)                        { live, high, included, total }   live = not dismissed
//   recChip(id, recs, name)             the small button "3 · 2 high" a list row carries; it opens the drawer without leaving the list
//   recsCard(screen, id)                the case page card: top three suggestions, Review suggestions, Check against payer criteria, what is included
//   openRecs(screen, id, { opener, focusKey })   the side drawer (ui.recDrawer, scope 'auth'), with "Open in Lauris with the Psyflo panel" as its footer link
//   criteriaOf(s, id)                   the payer criteria checklist as data: six ASAM dimensions, the level of care, the reassessment clock
//   openCriteria(screen, id, opener)    the modal for it: Documented / Needs strengthening, the sentence or the gap, "See suggestion"
//   typedInLauris(s, id, recs)          'yes' | 'no' | null: did the panel type every included text into the Lauris form (panel.filled), null when it cannot tell
//
// Nothing here writes a clinical sentence: the text on a card comes from stored records (shared/recs.js) or is the clinician's own words; the criteria rows are
// computed from the same records (evidenceIndex, asam.levelCheck, asam.dueState). Numbers from the outcome table are labelled by the card component as an
// illustrative sample. Other roles see no suggestion content: the case page says in one line that suggestions are for the treating clinician.
import { esc, ui, api, session } from '../app.js';
import { can } from '../shared/permissions.js';
import { listFor, insertsFor } from '../shared/recs.js';
import { evidenceIndex, evidenceById, chipOpts } from '../shared/sel/disputes.js';
import { criteriaView } from '../shared/sel/auth-intel.js';
import { byId } from '../shared/model.js';
import { laurisLink, laurisHref } from '../shared/lauris-link.js';

export const mayRecs = me => !!me && me.role === 'clinician' && can(me, 'drafts.clinical');
export const QUIET = 'Suggestions are for the treating clinician.';

export function recsFor(s, id) { try { return id && byId(s.requests || [], id) ? listFor(s, 'auth', id) : []; } catch (e) { console.error('suggestions', e); return []; } }
export function counts(recs) {
  const live = recs.filter(r => r.state !== 'dismissed');
  return { live: live.length, high: live.filter(r => r.impact === 'high').length, included: recs.filter(r => r.state === 'included').length, total: recs.length };
}

// ------------------------------------------------------------------------------------------------ did the panel type it?
// The panel records panel.filled (client, form, boxes typed). Included text counts as typed when a box typed for this client holds it.
export function typedInLauris(s, id, recs) {
  const r = byId(s.requests || [], id); if (!r) return null;
  const ins = insertsFor(recs).filter(x => x.box); if (!ins.length) return null;   // nothing included that goes into a box: nothing to type
  const boxes = (Array.isArray(s.fills) ? s.fills : []).filter(f => f.client === r.client).flatMap(f => f.boxes || []);   // the clinician's state carries every panel.filled; none yet means not typed
  return ins.every(x => boxes.some(b => String(b.value || '').includes(x.text))) ? 'yes' : 'no';
}

// ------------------------------------------------------------------------------------------------ the list chip
export function recChip(id, recs, name, { phone = false } = {}) {
  const c = counts(recs); const key = `a-rc${phone ? 'm' : ''}-${id}`;   // the phone copy (in the Next action cell, shown below 768 px) has its own id so focus returns to the visible one
  const text = c.live ? `${c.live} · ${c.high} high` : 'None';
  const aria = `Suggestions for ${name}, ${id}: ${c.live} open or included, ${c.high} high impact${c.included ? `, ${c.included} included` : ''}. Open the suggestions`;
  return `<button type="button" class="a-recchip${phone ? ' a-recchip--m' : ''}${c.included ? ' has-inc' : ''}" id="${esc(key)}" data-recs="${esc(id)}" data-ui-return="${esc(key)}" aria-label="${esc(aria)}" title="${esc(c.included ? `${c.included} included` : 'Suggested by Psyflo')}">${ui.icon(c.included ? 'check' : 'sparkle', 14)}<span>${esc(text)}</span></button>`;
}

// ------------------------------------------------------------------------------------------------ the drawer
function chipsFor(screen, id) {
  let cs = null, ci = null;
  const idx = () => { const s = screen.s; if (s !== cs) { cs = s; const r = byId(s.requests || [], id); ci = r ? evidenceIndex(s, null, r) : null; } return ci; };
  return r => {
    const x = idx(); if (!x) return '';
    return (r.evidence || []).map(e => evidenceById(x, e)).filter(Boolean).slice(0, 4).map(it => ui.evidenceChip(chipOpts(it))).join('');
  };
}
export function laurisFormPath(s, id) {
  const r = byId(s.requests || [], id); const c = r && byId(s.clients || [], r.client); const no = c && (c.lauris_no || c.harvest_no);
  const form = r && (r.type === 'initial' || r.type === 'early_discharge_new_initial') ? 'sra-initial' : 'sra-continued';
  return no ? `/consumers/${no}/session/${form}` : '/consumers';
}
export function openRecs(screen, id, { opener = null, focusKey = '' } = {}) {
  const s0 = screen.s; const r0 = byId(s0.requests || [], id); const c0 = r0 && byId(s0.clients || [], r0.client);
  const me = session.actor; const base = api.config && api.config.laurisURL;
  const name = c0 ? (c0.initials || id) : id;
  const h = ui.recDrawer({
    title: `Suggested by Psyflo · ${name}`, heading: 'Pick what to include', scope: 'auth', ref: id,
    recs: () => recsFor(screen.s, id), s: () => screen.s, call: (a, x) => screen.do(a, x), chips: chipsFor(screen, id),
    laurisHref: r => laurisLink(base, me, r.act && r.act.path, { who: name, title: r.act && r.act.label, variant: 'button' }),
    returnFocus: opener, empty: 'Nothing to suggest right now. The record answers what a reviewer usually asks.',
    onChange: () => { if (screen.afterRecs) screen.afterRecs(); }
  });
  // the footer: how a clinician continues in the EHR (the panel in Lauris shows the same cards and types the included text into the form)
  const href = laurisHref(base, me, laurisFormPath(screen.s, id));
  if (href) h.dialog.insertAdjacentHTML('beforeend', `<footer class="ui-dialog__f a-rcfoot"><a class="ui-btn ui-btn--secondary" href="${esc(href)}" target="_blank" rel="noopener" data-lauris>Open in Lauris with the Psyflo panel${ui.icon('external', 14)}</a></footer>`);
  if (focusKey) {
    const li = [...h.dialog.querySelectorAll('[data-rec]')].find(x => x.dataset.rec === focusKey);
    if (li) { li.scrollIntoView({ block: 'center' }); li.classList.add('is-focus'); const t = li.querySelector('[data-rc-ctx],[data-rc-check]:not([disabled])') || li.querySelector('summary'); if (t) t.focus({ preventScroll: true }); }
  }
  return h;
}

// ------------------------------------------------------------------------------------------------ the case page card
export function recsCard(screen, id) {
  const s = screen.s; const recs = recsFor(s, id); const c = counts(recs);
  const typed = typedInLauris(s, id, recs);
  const line = c.included ? `${c.included} included${typed ? ` · typed in Lauris: ${typed}` : ''}` : `${c.live} to review`;
  return `<section class="ui-scard a-recs" id="sec-recs" data-sec="recs" aria-labelledby="a-recs-h"><div class="ui-scard__h"><h2 id="a-recs-h">Suggested by Psyflo</h2><span class="ui-scard__r" data-recs-line>${esc(recs.length ? line : 'Nothing to suggest')}</span></div>
    <p class="a-sub a-recs__s">Built from the stored record. You decide what goes into the request; nothing is sent or typed without a person pressing a button.</p>
    ${ui.recMini(recs, { s, limit: 3 }).replace('data-rc-open', 'id="a-rc-open" data-ui-return="a-rc-open" data-rc-open')}
    <div class="a-btnrow"><button type="button" class="ui-btn ui-btn--secondary" id="a-criteria" data-ui-return="a-criteria" data-x="criteria">Check against payer criteria</button></div></section>`;
}
export function quietCard() { return `<p class="a-quiet" data-recs-quiet>${esc(QUIET)}</p>`; }

// ------------------------------------------------------------------------------------------------ the payer criteria checklist (data)
// one row each for D1 to D6, the level of care and the reassessment clock; state 'documented' | 'needs'; rec = the key of the suggestion that answers it (or '').
// The reading itself is pure and shared (web/js/shared/sel/auth-intel.js criteriaView), so the platform and the extension panel say the same thing.
export function criteriaOf(s, id) {
  const r = byId(s.requests || [], id); if (!r) return null;
  return criteriaView(s, r);
}

export function criteriaHtml(cr) {
  const row = x => `<li class="a-crit" data-crit="${esc(x.key)}" data-state="${esc(x.state)}"><div class="a-crit__h"><b class="a-crit__t">${esc(x.label)}</b>${x.state === 'documented' ? ui.chip('Documented', { tone: 'success', icon: 'check', size: 'sm' }) : ui.chip('Needs strengthening', { tone: 'warning', icon: 'alert', size: 'sm' })}${x.included ? ui.chip('Suggestion included', { tone: 'info', icon: 'check', size: 'sm' }) : ''}</div><p class="a-crit__x">${esc(x.text)}</p>${x.rec ? `<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-see="${esc(x.rec)}">See suggestion</button>` : ''}</li>`;
  return `<div class="a-critw"><p class="a-crit__sum" data-crit-sum><b>${cr.documented} of ${cr.total}</b> documented</p><ol class="a-critl">${cr.rows.map(row).join('')}</ol>
    <p class="a-sub">Read from the stored record: the six ASAM dimensions, the level of care on the request and the reassessment rule. Each payer applies its own policy, so confirm on the payer's own notice.</p></div>`;
}
export function openCriteria(screen, id, opener) {
  const s = screen.s; const cr = criteriaOf(s, id); if (!cr) return null;
  const c = byId(s.clients || [], cr.request.client); const name = c ? (c.initials || id) : id;
  const h = ui.modal({ title: `Payer criteria · ${name}`, size: 'md', returnFocus: opener, body: criteriaHtml(cr), className: 'a-critmodal', actions: [{ label: 'Close', tone: 'secondary' }] });
  h.dialog.addEventListener('click', e => {
    const b = e.target.closest('[data-see]'); if (!b) return;
    const key = b.dataset.see; h.close('see');
    openRecs(screen, id, { opener, focusKey: key });
  });
  return h;
}

// ------------------------------------------------------------------------------------------------ CSS (joined to the screens' css getter)
export const RECS_CSS = `
.a-recs .a-recs__s{margin:0 0 var(--sp-3)}
.a-recs .rcm{margin-bottom:var(--sp-3)}
.a-quiet{margin:0;color:var(--muted-700);font-size:var(--fs-13)}
.a-recchip{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:2px 10px;border:1px solid var(--teal-300);border-radius:999px;background:var(--teal-tint);color:var(--teal-700);font:inherit;font-size:var(--fs-13);font-weight:600;cursor:pointer;white-space:nowrap}
.a-recchip:hover{background:var(--surface-0);border-color:var(--teal-600)}
.a-recchip.has-inc{background:var(--teal-600);border-color:var(--teal-600);color:#fff}
.a-recchip .ui-icon{flex:0 0 auto}
.a-rcfoot{justify-content:flex-start}
.rc__card.is-focus{box-shadow:0 0 0 2px var(--teal-600)}
@media (max-width:767px){.a-recchip{min-height:44px}.a-recs .ui-btn,.a-crit .ui-btn,.a-rcfoot .ui-btn,.rc .ui-btn{min-height:44px}}
.a-critw{display:flex;flex-direction:column;gap:var(--sp-3)}
.a-crit__sum{margin:0;font-size:var(--fs-14)}
.a-critl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.a-crit{display:flex;flex-direction:column;gap:4px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line-200)}
.a-crit:first-child{border-top:0}
.a-crit__h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.a-crit__t{font-size:var(--fs-14)}
.a-crit__x{margin:0;color:var(--ink-700,inherit);font-size:var(--fs-13);line-height:var(--lh-13);overflow-wrap:anywhere}
`;
