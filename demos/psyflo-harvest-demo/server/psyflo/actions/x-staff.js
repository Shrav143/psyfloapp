// Staff / compliance actions (Review queue, Staff dashboard, Compliance, Users, Migration, Library).
import { fmtDate } from '../../../web/js/shared/dates.js';

export default {
  // Compliance: log a monthly QI check (e.g. 2.3 "risk-analysis meeting held when triggered").
  'compliance.qiCheck'(s, { id, by = 'cdiaz' }) {
    const c = s.compliance || (s.compliance = {});
    const row = (c.qi || []).find(q => q.id === id);
    if (!row) throw new Error('QI objective not found');
    if (row.checked && row.checked.slice(0, 7) === s.today.slice(0, 7)) return { ok: true };
    row.checked = s.today; row.status = 'checked ' + fmtDate(s.today); row.chip = 'g'; row.by = by;
    const [a, b] = String(c.qi_checked || '11 of 12').split(' of ').map(Number);
    c.qi_checked = Math.min(b, a + 1) + ' of ' + b;
    this.event('QI objective ' + id + ' monthly check logged', by, 'compliance');
    return { ok: true };
  }
};
