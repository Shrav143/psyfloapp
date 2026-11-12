// The shared draft review (E5): ui.draftReview wired to the doc_versions actions (scribe.*). Scribe, Prepare authorization and the Review
// view all use it. A box has Staff input · PsyFlo wording · Source; the person accepts, rejects, edits or restores each box; there is no
// accept-all; Approve and fill stays disabled until every box has a decision; a box with no stored evidence cannot be accepted as it stands.
import { esc } from '../../js/runtime.js';
import { fmtDate } from '../../js/shared/dates.js';
import { dateLabel } from '../../js/shared/enhance.js';

const LADDER = ['Original', 'PsyFlo draft', 'Clinician edited', 'Approved', 'Synchronized'];
const RANK = { original: 0, draft: 1, edited: 2, approved: 3, filled: 3, saved: 3, processed: 4 };
export const ladderIndex = rec => Math.max(0, ...(rec.stages || []).map(s => RANK[s.stage] ?? 0));
export const latestStage = rec => (rec.stages || []).at(-1)?.stage || 'draft';
// the author's latest current-mode draft for this student and form (today)
export function recFor(ctx, client, form) {
  const s = ctx.S(); const me = ctx.me(); const today = (s.clock && s.clock.date) || s.today;
  return (s.doc_versions || []).filter(d => d.mode === 'current' && d.client === client.id && d.form === form && d.by === me.id && d.date === today && (d.items || []).length).at(-1) || null;
}
const evidence = src => ({ n: src.n, label: src.label, date: dateLabel(src), quote: src.quote || '', source: src.source || src.label });

// reviewBlock(ctx, rec, { title, st, fillExtra, client, sources }) -> html. `st` is the view's scratch object (holds which box is being edited).
export function reviewBlock(ctx, rec, o = {}) {
  const { ui } = ctx; const st = o.st; const client = o.client || ctx.client();
  const processed = rec.lauris_status === 'processed';
  const filled = rec.stages.some(x => x.stage === 'filled');
  const decided = rec.items.filter(i => i.state !== 'pending').length;
  const act = async (fn, okMsg) => { try { await fn(); } catch (e) { ctx.flash(e.message || String(e), 'r'); } ctx.draw(); };
  const decide = (item, state, text) => act(() => ctx.do('scribe.decide', { key: rec.key, item, state, text }));
  const approveFill = () => act(async () => {
    const r = await ctx.do('scribe.approve', { key: rec.key });
    const boxes = (r.boxes || []).concat(o.extra ? o.extra() : []);
    const res = await ctx.fill(boxes, { form: rec.form, client, sources: o.sources });
    if (res && !res.error) await ctx.do('scribe.filled', { key: rec.key, labels: res.filled || [] });
  });
  const items = rec.items.map(i => ({
    id: i.id, label: i.label, staffInput: i.staff, psyfloText: i.text, changed: [], state: i.state, missing: i.missing,
    sources: (i.sources || []).map(evidence), editing: !!(st && st.editing === i.id), hasPrevious: (i.history || []).some(h => h.text !== i.text),
    canAccept: !i.missing, acceptReason: 'No stored evidence: edit it with your own words, or reject it'
  }));
  const sourced = items.filter(i => i.state === 'pending' && i.sources.length && !i.missing).length;
  if (processed) return `<div class="banner">${ctx.I.ok}<div><b>Processed in Lauris.</b> This record is final: Psyflo has no addendum or late-entry feature.</div></div>` + ui.stepper(LADDER.map(l => ({ label: l })), { current: 4, label: 'Version' }) + `<div class="list">${rec.items.filter(i => i.state !== 'rejected').map(i => `<div class="box"><div class="l">${esc(i.label)}</div><div class="v">${esc(i.text)}</div></div>`).join('')}</div>`;
  const html = ui.draftReview({
    id: 'dr-' + rec.key, title: o.title || 'Review', items, versions: LADDER, current: ladderIndex(rec), bulk: sourced ? { count: sourced } : null, approve: { label: filled ? 'Approve and fill again' : 'Approve and fill' },
    onAccept: id => decide(id, 'accepted'), onReject: id => decide(id, 'rejected'),
    onEdit: id => { st.editing = id; ctx.draw(); }, onCancel: () => { st.editing = null; ctx.draw(); },
    onSave: (id, text) => { st.editing = null; return decide(id, 'edited', text); },
    onRestore: id => act(() => ctx.do('scribe.decide', { key: rec.key, item: id, restore: true })),
    onAcceptSourced: () => act(async () => { for (const i of rec.items.filter(x => x.state === 'pending' && !x.missing && (x.sources || []).length)) await ctx.do('scribe.decide', { key: rec.key, item: i.id, state: 'accepted' }); }),
    onApprove: approveFill
  });
  const status = processed ? `<div class="banner">${ctx.I.ok}<div><b>Processed in Lauris.</b> This record is final: Psyflo has no addendum or late-entry feature. ${decided} box${decided === 1 ? '' : 'es'} were reviewed.</div></div>`
    : filled ? `<div class="banner y">${ctx.I.warn}<div><b>Typed into the open form · yellow.</b> Check the boxes, then press Process Form in Lauris.</div></div>` : '';
  return status + html;
}
