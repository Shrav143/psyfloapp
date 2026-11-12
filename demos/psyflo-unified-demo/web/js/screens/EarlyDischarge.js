// 36 · Early discharge — use the units, discharge, start a new initial. Computes the dates; Set this plan writes reminders.
import { register, Screen, M, toast } from '../app.js';
import { pickReq, details, clientOf } from './Authorizations.js';
import { runOut, schoolDayFrom } from './Partials.js';
import { addDays, addBusinessDays, businessDaysBetween, dow, fmtDate } from '../shared/dates.js';

const DAY = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
const payerFirst = (s, id) => id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id).split(' ')[0];

register('EarlyDischarge', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0402'], r => ['early_discharge', 'partial_decide'].includes(r.stage)); }
  // every date on the page, from the units and the acceptance date (brief: units arithmetic)
  plan(r) {
    const s = this.s; const c = clientOf(s, r); const a = c?.authorization;
    const units = r.units_awarded || r.units_offered || a?.units || 0;
    const saved = s.plans.find(p => p.request === r.id);
    const accepted = (r.decision?.at || saved?.at || s.today).slice(0, 10);
    const start = a && a.payer === r.payer && a.start ? a.start : accepted;
    const runout = a?.exhausted || runOut(start, units, 3);
    const earliest = saved?.new_initial || addDays(accepted, 30);
    let discharge = saved?.discharge;
    if (!discharge) { discharge = runout; while (dow(discharge) !== 'Fri') discharge = addDays(discharge, -1); if (discharge < s.today) discharge = runout; }
    let intake = saved?.intake;
    if (!intake) { intake = addBusinessDays(discharge, 1); if (intake < earliest) intake = schoolDayFrom(earliest); }
    const send = intake; const decision = addDays(send, 7);
    const reminder = addBusinessDays(discharge, -9);
    const gap = Math.max(0, businessDaysBetween(discharge, intake) - 1);
    return { units, accepted, start, runout, earliest, discharge, intake, send, decision, reminder, gap, saved, exhausted: !!a?.exhausted };
  }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, backHref: 'Partials.dc.html', crumb: 'accept and use them up', payerChip: 'no partial open', noneText: 'Early discharge starts from a partial award: accept the units, then plan the discharge and the new initial. No partial award is open right now.' };
    const p = this.plan(r); const pf = payerFirst(s, r.payer);
    const who = M.staffShort(s, clientOf(s, r)?.clinician || 'jperez');
    const st = p.saved ? ['set', 'chip n'] : ['proposed', 'chip y'];
    const rows = [
      { date: fmtDate(p.accepted), step: `Accept ${p.units} units and use them up · decision logged (not sent to ${pf})`, who, status: r.decision || p.saved ? 'done' : p.accepted === s.today ? 'today' : 'set', cls: r.decision || p.saved ? 'chip g' : 'chip n' },
      { date: fmtDate(p.reminder), step: 'Reminder: discharge summary and new CNA scheduled', who: 'Psyflo → ' + who, status: st[0], cls: st[1] },
      { date: fmtDate(p.discharge), step: 'Discharge in Lauris · summary pre-filled from notes', who, status: st[0], cls: st[1] },
      { date: fmtDate(p.intake), step: 'New intake · CNA · ISP · initial SRA drafted the same day', who: who + ' · guardian', status: st[0], cls: st[1] },
      { date: fmtDate(p.send), step: `Send to ${pf}`, who, status: st[0], cls: st[1] }
    ];
    const dDow = dow(p.discharge);
    const kpis = [
      { l: 'Units run out', v: fmtDate(p.runout), s: p.exhausted ? `${p.units} units · from the units log` : `${p.units} at 3 per school day from ${fmtDate(p.start)}` },
      { l: 'Earliest new initial', v: fmtDate(p.earliest), s: `30 days after ${fmtDate(p.accepted)} · Harvest-reported, unverified` },
      { l: 'Discharge date', v: fmtDate(p.discharge), s: p.discharge === p.runout ? 'the day units end' : `${DAY[dDow] || dDow} before units end` },
      { l: 'New intake', v: fmtDate(p.intake), s: `${DAY[dow(p.intake)] || dow(p.intake)} · 2 h · guardian present` },
      { l: 'Gap in service', v: `${p.gap} day${p.gap === 1 ? '' : 's'}`, s: `new request filed ${fmtDate(p.send)} · decision by ${fmtDate(p.decision)}` }
    ];
    const why = details(s, r.id).early_discharge_text || 'Units were exhausted ahead of the authorization end date because the client required 3 units per school day throughout (units from Lauris). Need is restated from the dated notes of the last 30 days when the new initial is drafted.';
    return {
      has: true, none: false, backHref: 'Partials.dc.html?id=' + r.id, crumb: `${M.clientLabel(s, r.client, false)} · accept and use them up`,
      payerChip: `${pf} · ${r.units_requested} → ${p.units} units`,
      title: `Use the ${p.units} units, discharge early, start a new initial`,
      altHref: r.stage === 'peer_to_peer_booked' ? 'PeerBrief.dc.html?id=' + r.id : 'Partials.dc.html?id=' + r.id,
      planBtn: p.saved ? 'Update this plan' : 'Set this plan', isSet: !!p.saved, setAt: p.saved ? M.fmtDateTime(p.saved.at) : '', owner: who,
      kpis, rows, why
    };
  }
  get anchors() {
    return {
      plan: async () => {
        const s = this.s; const r = this.req(); if (!r) return;
        const p = this.plan(r); const who = clientOf(s, r)?.clinician || 'jperez'; const cl = M.clientLabel(s, r.client, false); const pf = payerFirst(s, r.payer);
        await this.do('plan.set', {
          request: r.id, client: r.client, discharge: p.discharge, intake: p.intake, new_initial: p.earliest,
          reminders: [
            { for: who, kind: 'early_discharge', due: p.reminder, text: `Discharge summary and new CNA · ${cl}` },
            { for: who, kind: 'early_discharge', due: p.discharge, text: `Discharge ${cl} in Lauris · summary pre-filled from notes` },
            { for: who, kind: 'early_discharge', due: p.intake, text: `New intake · ${cl} · CNA, ISP, initial SRA` },
            { for: who, kind: 'early_discharge', due: p.send, text: `Send the new initial to ${pf} · ${cl}` }
          ]
        });
        toast(`Plan set · discharge ${fmtDate(p.discharge)} · new intake ${fmtDate(p.intake)} · 4 reminders`);
      }
    };
  }
});
