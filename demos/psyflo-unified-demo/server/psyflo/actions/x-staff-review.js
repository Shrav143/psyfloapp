// Supervisor approval per staffer (Review queue, screen 27). Approval is only for staff flagged to need it
// (new hires, anyone on review): review_mode 'every_note' makes note.processed hold their notes as
// 'pending' until a supervisor approves; 'spot_check' lets notes go straight through at Process Form.
// Notes already waiting stay in the queue when approval is turned off.
export default {
  'staff.reviewMode'(s, { id, mode, reason, reviewer }) {
    const by = this.who();
    const st = (s.staff || []).find(x => x.id === id);
    if (!st) throw new Error('Staff member not found');
    if (st.role !== 'direct_support') throw new Error('Approval applies to direct support staff only');
    if (!['every_note', 'spot_check'].includes(mode)) throw new Error('mode must be every_note or spot_check');
    const byStaff = (s.staff || []).find(x => x.id === by);
    if (mode === 'every_note') {
      st.review_mode = 'every_note';
      st.review_reason = reason || st.review_reason || 'on review';
      st.reviewer = reviewer || (byStaff?.role === 'supervisor' ? by : st.reviewer);
      st.review_since = s.today;
      const rv = (s.staff || []).find(x => x.id === st.reviewer);
      this.event(`Supervisor approval required for every note (${st.review_reason}) · reviewer ${rv ? rv.name : st.reviewer}`, by, id);
    } else {
      st.review_mode = 'spot_check';
      delete st.review_reason; delete st.review_since;
      this.event('Supervisor approval turned off · back to spot check', by, id);
    }
    return { ok: true, review_mode: st.review_mode, reviewer: st.reviewer || null };
  }
};
