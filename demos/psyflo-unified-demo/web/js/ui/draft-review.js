// draftReview: the three-way review (Staff input · PsyFlo wording · Source) used by Scribe, Prepare authorization and the
// review queue. Per item: Accept, Reject, Edit, View source, Restore previous. There is NO bulk accept: the optional
// "Accept the N with sources" button reports a count and still leaves the final approval to a person.
//
// draftReview({
//   id:'dpn-MR', title:'Daily note · M.R.',
//   items:[{ id:'narrative', label:'Narrative', staffInput:'worked on …', psyfloText:'<changed phrases may carry [[marks]]>',
//            changed:['prompted'], sources:[{n:1,label:'Dictation',date:'Oct 29',quote:'…'}], missing:false,
//            state:'pending'|'accepted'|'rejected'|'edited', editing:false, hasPrevious:true, canAccept:true, acceptReason:'' }],
//   versions:['Original','PsyFlo draft','Clinician edited','Approved','Synchronized'], current:1,   (optional ladder; "Synchronized" only from an observed Lauris event)
//   bulk:{ count:6 }, approve:{ label:'Approve and fill' },
//   onAccept(itemId) onReject(itemId) onEdit(itemId) onSave(itemId, text) onCancel(itemId) onRestore(itemId) onAcceptSourced() onApprove() })
// Edit text lives in the draft store under `${id}:${item.id}` so a repaint does not wipe it.
import { esc, H, cls, icon, autoId, setHandlers } from './util.js';
import { chip } from './chip.js';
import { evidenceChip, progress } from './chip.js';
import { stepper, draft } from './misc.js';

const STATE = { pending: ['Needs review', 'warning', 'eye'], accepted: ['Accepted', 'success', 'check'], rejected: ['Rejected', 'danger', 'x'], edited: ['Edited', 'info', 'pencil'] };
// mark the changed phrases of PsyFlo's wording (escaped first, so markup in a phrase can never run)
const marked = (text, changed = []) => {
  let h = esc(text);
  for (const c of changed.filter(Boolean)) h = h.split(esc(c)).join(`<mark class="ui-mark">${esc(c)}</mark>`);
  return h;
};

export function draftReview(o = {}) {
  const id = o.id || autoId('dr'); const items = o.items || [];
  setHandlers(id, { onAccept: o.onAccept, onReject: o.onReject, onEdit: o.onEdit, onSave: o.onSave, onCancel: o.onCancel, onRestore: o.onRestore, onAcceptSourced: o.onAcceptSourced, onApprove: o.onApprove, onSource: o.onSource, key: id });
  const decided = items.filter(i => i.state && i.state !== 'pending').length;
  const open = items.length - decided;
  const missing = items.filter(i => i.missing || !(i.sources || []).length).length;
  const sourced = items.filter(i => (i.state || 'pending') === 'pending' && (i.sources || []).length && !i.missing).length;
  const item = i => {
    const st = i.state || 'pending'; const [stText, stTone, stIcon] = STATE[st] || STATE.pending; const iid = esc(i.id);
    const key = `${id}:${i.id}`; const fid = `${id}-${i.id}-ta`;
    const wording = i.editing
      ? `<label class="ui-sr" for="${esc(fid)}">PsyFlo wording for ${esc(i.label)}</label><textarea class="ui-input ui-textarea" id="${esc(fid)}" rows="5" data-ui-draft="${esc(key)}">${esc(draft.get(key, i.psyfloText))}</textarea>`
      : `<p class="ui-dr__p">${i.psyfloText ? marked(i.psyfloText, i.changed) : '<span class="ui-muted">Nothing drafted</span>'}</p>`;
    const src = (i.sources || []).length ? `<div class="ui-dr__src">${i.sources.map(s => evidenceChip(s)).join('')}</div>` : evidenceChip({ state: 'missing', label: i.label });
    const btn = (act, label, ic, extra = '') => `<button type="button" class="ui-btn ui-btn--${extra || 'secondary'} ui-btn--sm" data-ui-dr="${act}" data-item="${iid}">${icon(ic, 14)}<span>${label}</span></button>`;
    const acts = i.editing
      ? btn('save', 'Save wording', 'check', 'primary') + btn('cancel', 'Cancel', 'close')
      : (i.canAccept === false ? `<span class="ui-dr__why">${esc(i.acceptReason || 'Cannot accept yet')}</span>` : btn('accept', 'Accept', 'check', st === 'accepted' ? 'primary' : 'secondary')) + btn('reject', 'Reject', 'x') + btn('edit', 'Edit', 'pencil') + (i.hasPrevious ? btn('restore', 'Restore previous', 'undo') : '');
    return `<li class="ui-dr__item ui-dr__item--${st}" data-item="${iid}"><div class="ui-dr__ih"><h4 class="ui-dr__il">${esc(i.label)}</h4>${chip(stText, { tone: stTone, icon: stIcon })}</div>
      <div class="ui-dr__tabs" role="tablist" aria-label="${esc(i.label)} views">${['staff:Staff input', 'psyflo:PsyFlo wording', 'source:Source'].map(t => { const [k, l] = t.split(':'); return `<button type="button" role="tab" id="${esc(fid)}-t-${k}" aria-selected="${k === 'psyflo'}" aria-controls="${esc(fid)}-p-${k}" data-ui-dr-tab="${k}" tabindex="${k === 'psyflo' ? 0 : -1}">${l}</button>`; }).join('')}</div>
      <div class="ui-dr__cols">
        <section class="ui-dr__col" role="tabpanel" id="${esc(fid)}-p-staff" aria-labelledby="${esc(fid)}-t-staff" data-col="staff"><h5>Staff input</h5><p class="ui-dr__p">${i.staffInput ? esc(i.staffInput) : '<span class="ui-muted">Nothing entered</span>'}</p></section>
        <section class="ui-dr__col" role="tabpanel" id="${esc(fid)}-p-psyflo" aria-labelledby="${esc(fid)}-t-psyflo" data-col="psyflo" data-active><h5>PsyFlo wording</h5>${wording}</section>
        <section class="ui-dr__col" role="tabpanel" id="${esc(fid)}-p-source" aria-labelledby="${esc(fid)}-t-source" data-col="source"><h5>Source</h5>${src}</section>
      </div><div class="ui-dr__acts">${acts}</div></li>`;
  };
  const approveOff = open > 0 ? `${open} item${open === 1 ? '' : 's'} still need${open === 1 ? 's' : ''} a decision` : '';
  return `<section class="ui-dr" aria-labelledby="${esc(id)}-t" data-ui-id="${esc(id)}">
    <header class="ui-dr__h"><h3 id="${esc(id)}-t" class="ui-dr__t">${esc(o.title || 'Draft review')}</h3>${progress({ value: decided, max: items.length, label: 'Reviewed' })}${o.versions ? stepper(o.versions.map(v => ({ label: v })), { current: o.current ?? 1, label: 'Version' }) : ''}</header>
    ${missing ? `<div class="ui-dr__note" role="status">${icon('alert', 16)}<span>${missing} item${missing === 1 ? ' has' : 's have'} no source. They print "Evidence missing — verify" and are never filled as fact.</span></div>` : ''}
    <ol class="ui-dr__list">${items.map(item).join('')}</ol>
    <footer class="ui-dr__f">${o.bulk ? `<button type="button" class="ui-btn ui-btn--secondary" data-ui-dr="acceptSourced"${sourced ? '' : ' disabled'}>Accept the ${o.bulk.count ?? sourced} with sources</button><span class="ui-muted">Final review is still yours.</span>` : ''}<span class="ui-sp"></span>${approveOff ? `<span class="ui-dr__why" id="${esc(id)}-why">${esc(approveOff)}</span>` : ''}<button type="button" class="ui-btn ui-btn--primary" data-ui-dr="approve"${approveOff ? ` disabled aria-describedby="${esc(id)}-why"` : ''}>${esc((o.approve && o.approve.label) || 'Approve and fill')}</button></footer></section>`;
}
