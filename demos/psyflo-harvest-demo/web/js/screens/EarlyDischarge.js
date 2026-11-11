// 36 · Early discharge — three dates computed from the units: where they run out, the discharge day, and the earliest
// day a new request can go. Set this plan writes the plan and its reminders (plan.set).
import { register, Screen, M, toast } from '../app.js';
import { STATUS } from '../shared/labels.js';
import { pickReq, clientOf, payerFirst, unitPlan, todayLine, chipCls, CSS } from './Partials.js';
import { fmtDate, dow, addBusinessDays } from '../shared/dates.js';

const DAY = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

register('EarlyDischarge', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0402'], r => ['early_discharge', 'partial_decide'].includes(r.stage)); }
  renderVals() {
    const s = this.s; const r = this.req(); const today = todayLine(s);
    if (!r) return { today, none: true, has: false, title: STATUS.early_discharge, chip: 'None open', chipCls: 'u-chip info' };
    const p = unitPlan(s, r); const pf = payerFirst(s, r.payer);
    const tiles = [
      { label: 'Units run out', date: fmtDate(p.runout), sub: `${p.left} units · ${p.days} school days` },
      { label: 'Discharge', date: fmtDate(p.discharge), sub: DAY[dow(p.discharge)] },
      { label: 'New request earliest', date: fmtDate(p.newReq), sub: `${DAY[dow(p.newReq)]} · ${p.bound === 'restart' ? `${M.clocksOf(s).restart_days} days after ${fmtDate(p.accepted)}` : 'after discharge'}` }
    ];
    return {
      today, has: true, none: false,
      title: `${STATUS.early_discharge} · ${M.clientLabel(s, r.client)} · ${pf}`,
      chip: p.saved ? 'Plan set' : `${p.days} school days`, chipCls: p.saved ? 'u-chip ok' : 'u-chip info',
      facts: [{ k: 'Awarded', v: `${p.units} of ${r.units_requested}` }, { k: 'Rate', v: `${p.rate} units a school day` }, { k: 'Counting from', v: fmtDate(p.from) }, { k: 'Accepted', v: fmtDate(p.accepted) }],
      tiles, backHref: 'Partials.dc.html?id=' + r.id, planBtn: p.saved ? 'Update plan' : 'Set this plan',
      setPlan: () => this.setPlan(r)
    };
  }
  async setPlan(r) {
    if (this._busy) return; this._busy = true;
    try {
      const s = this.s; const p = unitPlan(s, r); const who = clientOf(s, r)?.clinician || 'jperez'; const cl = M.clientLabel(s, r.client, false); const pf = payerFirst(s, r.payer);
      const summary = addBusinessDays(p.discharge, -9); const first = summary < s.today ? s.today : summary;
      await this.do('plan.set', {
        request: r.id, client: r.client, discharge: p.discharge, intake: p.newReq, new_initial: p.newReq,
        reminders: [
          { for: who, kind: 'early_discharge', due: first, text: `Discharge summary · ${cl}` },
          { for: who, kind: 'early_discharge', due: p.discharge, text: `Discharge ${cl} in Lauris` },
          { for: who, kind: 'early_discharge', due: p.newReq, text: `New initial to ${pf} · ${cl} · CNA, ISP, SRA` }
        ]
      });
      toast(`Plan set · discharge ${fmtDate(p.discharge)}`);
    } catch { } finally { this._busy = false; }
  }
  get css() { return CSS; }
});
