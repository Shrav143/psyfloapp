// 2 · Worklist (route DoNext) · one list of what needs action now, in one grammar: chip · who · what · one button.
// Clinicians and admins read M.worklist (referrals, requests, clocks, weekly eligibility re-verification) plus the earliest open
// post-intake clock; a supervisor reads the notes waiting for their review instead. Waiting on others is one line below the list.
import { register, Screen, M, esc, modal, toast } from '../app.js';
import { PART } from '../shared/labels.js';
import { dateHead, intakeClock, refStudent, awaitingReferrals } from './Referrals.js';
import { followUpLogged, isAwaiting } from './Authorizations.js';

const NOTE_TYPE = { daily: 'Daily note', weekly_guardian: 'Weekly call', monthly_collateral: 'Monthly note', quarterly: 'Quarterly', incident: 'Incident', discharge: 'Discharge' };

// notes a supervisor reviews: only staff routed to them (staff.review_mode every_note → reviewer)
export function pendingNotes(s, me) {
  return s.notes.filter(n => n.review === 'pending' && M.byId(s.staff, n.staff)?.reviewer === me?.id)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.processed_at).localeCompare(String(b.processed_at)));
}

// The rows of the Worklist for whoever is signed in, plus the "Awaiting response" count.
export function buildWorklist(s, me) {
  if (me?.role === 'supervisor') {
    const t = s.today; const y = M.addDays(t, -1);
    const rows = pendingNotes(s, me).map(n => ({
      kind: 'note', id: n.id, chip: n.date === t ? 'Today' : n.date === y ? 'Yesterday' : M.fmtDate(n.date), sev: n.date === t ? 'n' : n.date === y ? 'y' : 'r',
      who: M.clientLabel(s, n.client), what: `${NOTE_TYPE[n.type] || 'Note'} · ${M.staffShort(s, n.staff)}`, btn: 'Approve', primary: n.date === t
    }));
    return { rows, awaiting: 0, review: true };
  }
  const wl = M.worklist(s, me?.id);
  // a payer follow-up call that was logged takes the row off the list (the request waits on the payer again)
  const items = wl.items.filter(i => {
    const id = i.group === 'followup' && (i.href.match(/open=([\w-]+)/) || [])[1];
    const r = id && M.byId(s.requests, id);
    return !(r && followUpLogged(s, r));
  });
  // the earliest open post-intake clock (plan, paperwork, initial request) for a student in intake
  for (const r of s.referrals) {
    if (r.stage !== 'in_intake' || !M.byId(s.clients, r.client)) continue;
    const ck = intakeClock(s, r); if (!ck) continue;
    const href = ck.label === 'Plan' ? 'ExtISP.dc.html?client=' + r.client : ck.label === 'SRA' ? 'ExtSRA.dc.html?client=' + r.client : 'Referral.dc.html?id=' + r.id;
    const what = ck.label === 'Plan' ? 'Treatment plan' : ck.label === 'SRA' ? 'Initial request' : 'Enrollment paperwork';
    items.push({ pri: ck.hours < 24 ? 1.5 : 5.5, group: 'clocks', chip: ck.text, sev: ck.sev, who: refStudent(s, r), what, href, btn: ck.label === 'Paperwork' ? 'Review' : 'Open in Lauris', primary: ck.hours < 24 });
  }
  items.sort((a, b) => a.pri - b.pri);
  const rows = items.map(i => ({ kind: 'link', chip: i.chip, sev: i.sev, who: i.who, what: i.what, href: i.href, btn: i.btn, primary: i.primary }));
  // the same rule as the Authorizations and Intake "Awaiting response" filters, so the count matches what View shows
  return { rows, awaiting: s.requests.filter(r => isAwaiting(s, r)).length + awaitingReferrals(s) };
}

register('DoNext', class extends Screen {
  renderVals() {
    const s = this.s; const me = this.me; const wl = buildWorklist(s, me); const n = wl.rows.length;
    const rows = wl.rows.map(r => ({
      chip: r.chip, chipCls: 'u-chip ' + (r.sev || 'n'), who: r.who, sep: r.who ? '·' : '', what: r.what,
      btn: r.btn, btnCls: 'u-btn' + (r.primary ? ' pri' : ''), href: r.href, isLink: r.kind === 'link', isNote: r.kind === 'note',
      approve: () => this.review(r.id, 'approved'), ret: () => this.returnNote(r)
    }));
    return {
      dateText: dateHead(s), rows, headline: n ? `${n} ${n === 1 ? 'item needs' : 'items need'} action.` : 'Nothing needs action.',
      showAwait: !wl.review && wl.awaiting > 0, awaitText: `${PART.awaiting} · ${wl.awaiting}`, awaitHref: 'Authorizations.dc.html?status=waiting',
      showReview: !!wl.review, reviewHref: 'ReviewQueue.dc.html'
    };
  }
  async review(id, decision, comment) {
    try { await this.do('note.review', { id, decision, comment, by: this.me?.id || 'cdiaz' }); toast(decision === 'approved' ? 'Approved' : 'Returned'); } catch { }
  }
  returnNote(r) {
    modal(`<h2>Return note · ${esc(r.who)}</h2>
      <label class="b1-lbl" for="b1-ret">Note to staff</label><textarea id="b1-ret" class="u-in" rows="3" style="width:100%;padding:8px" data-doc></textarea>
      <div class="b1-mact"><button class="mbtn p" data-go>Return</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = () => { const v = box.querySelector('#b1-ret').value.trim(); if (!v) return toast('Add a note', 'err'); close(); this.review(r.id, 'returned', v); }; });
  }
  get css() { return '.b1-line{display:flex;align-items:center;gap:12px;margin:16px 4px 0;color:var(--ink-2);font-weight:500}.b1-lbl{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--ink-3);margin:12px 0 4px}.b1-mact{display:flex;gap:8px;margin-top:16px}.b1-btns{display:flex;align-items:center;gap:4px;justify-content:flex-end}'; }
});

// the sidebar badge counts the same list this screen shows
window.__psyfloDoNextCount = (s, me) => buildWorklist(s, me).rows.length;
