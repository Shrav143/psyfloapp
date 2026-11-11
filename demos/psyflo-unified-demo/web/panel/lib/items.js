// Turn a drafted result ({ boxes:[{label,value,src:[n]}], sources:[{n,kind,label,date}] }) from web/js/shared/draft.js or enhance.js into the items
// scribe.draft stores (server/psyflo/actions/x-scribe.js). Each source number becomes a source the SERVER can resolve to a stored record.
const KIND = { referral: 'referral', call: 'call', school: 'school', plan: 'plan', intake: 'client', notes: 'notes', chart: 'client', list: 'list', assess: 'client', request: 'request' };
export const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// refsFor: { notes: [noteId...], weekly: [...], monthly: [...] } the stored rows behind a count (optional)
export function itemsFromDraft(ctx, draft, client, { staff = {}, refs = {}, request = null } = {}) {
  const src = n => {
    const s = (draft.sources || []).find(x => x.n === n) || { n, label: 'source' };
    const kind = KIND[s.kind] || 'client'; const base = { n, kind, label: s.label, date: s.date || null, date_label: s.date_label || null, quote: s.quote || s.source || '' };
    if (kind === 'referral') base.ref = client.referral || null;
    if (kind === 'request') base.ref = request && request.id;
    if (kind === 'notes') { const r = /weekly/i.test(s.label) ? refs.weekly : /collateral|monthly/i.test(s.label) ? refs.monthly : refs.notes; base.refs = (r || []).slice(0, 80); }
    return base;
  };
  return (draft.boxes || []).map(b => ({
    id: slug(b.label), label: b.label, staff: staff[b.label] || '', psyflo: b.value, missing: !!b.missing || /^Evidence missing/.test(b.value || ''),
    sources: (b.src || []).map(src)
  }));
}
// the value of a box on the open Lauris form (what the person already has there): the "Staff input" column of the review
export const formValue = (ctx, label) => ((ctx.page && ctx.page.form && ctx.page.form.fields) || []).find(f => f.label === label)?.value || '';
export function staffInputs(ctx, draft) { const o = {}; for (const b of draft.boxes || []) { const v = formValue(ctx, b.label); if (v) o[b.label] = v; } return o; }
