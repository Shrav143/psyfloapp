// Review (E5): the three-way draft review (Staff input · PsyFlo wording · Source) for a draft the person already started, from home or from
// the Lauris form that is open. Accept, reject, edit wording, view source, restore previous wording; no accept-all; Approve and fill stays disabled
// until every box has a decision. The same block appears inside Scribe and Prepare authorization.
import { esc } from '../../js/runtime.js';
import { fmtDate } from '../../js/shared/dates.js';
import { reviewBlock, latestStage } from '../lib/review.js';
import { FORM_NAME } from '../parts.js';

const mine = ctx => { const s = ctx.S(); const me = ctx.me(); const today = ctx.M.today(s); return (s.doc_versions || []).filter(d => d.mode === 'current' && d.by === me.id && d.date === today && (d.items || []).length); };
function html(ctx) {
  const { banner } = ctx.parts; const s = ctx.S(); const c = ctx.client(); const st = ctx.st; const recs = mine(ctx);
  const f = ctx.page.form && ctx.page.form.type;
  const here = c && f ? recs.find(d => d.client === c.id && d.form === f) : null;
  const rec = st.listOnly ? null : (st.key && recs.find(d => d.key === st.key)) || here;
  if (rec) {
    const cl = s.clients.find(x => x.id === rec.client);
    return (recs.length > 1 ? `<button class="btn o sm" data-act="list">All drafts · ${recs.length}</button>` : '') + reviewBlock(ctx, rec, { title: `${FORM_NAME[rec.form] || rec.form} · ${cl ? cl.initials : ''}`, st, client: cl, sources: [] });
  }
  if (!recs.length) return banner('n', 'No draft is waiting for review. Start one in Scribe or Prepare authorization.') + `<button class="btn o blk" data-act="goView" data-view="scribe">Open Scribe</button>`;
  return `<div class="lab">Drafts · ${recs.length}</div><div class="list">${recs.map(d => { const cl = s.clients.find(x => x.id === d.client); const decided = d.items.filter(i => i.state !== 'pending').length;
    return `<button class="btn o" data-act="open" data-key="${esc(d.key)}"><span>${esc(FORM_NAME[d.form] || d.form)} · ${esc(cl ? cl.initials : d.client)}</span>${ctx.ui.chip(d.lauris_status === 'processed' ? 'Processed' : `${decided} of ${d.items.length}`, { tone: d.lauris_status === 'processed' ? 'success' : 'warning', size: 'sm' })}</button>`; }).join('')}</div>`;
}
const acts = {
  open(el, ctx) { ctx.st.key = el.dataset.key; ctx.st.listOnly = false; ctx.draw(); },
  list(el, ctx) { ctx.st.key = null; ctx.st.listOnly = true; ctx.draw(); },
  goView(el, ctx) { ctx.go(el.dataset.view); }
};
export default { id: 'review', label: 'Review', cap: 'ext.use', title: ctx => { const c = ctx.client(); return 'Review draft' + (c ? ' · ' + c.initials : ''); }, html, acts };
