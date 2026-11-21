// 36 · Step-down · 2.1 to Level 1 — when the IOP units run out or step-down criteria are met, plan the transition:
// last IOP day, first weekly Level 1 session, the new Level 1 initial and its decision. Dates at 3 IOP hours a day,
// 3 days a week. "Set this plan" writes reminders (request.stepDownPlan).
import { register, Screen, M, toast } from '../app.js';
import { pickReq, clientOf, payerFirst, channelLabel, iopRunOut, addIopDays, isIopDay, iopDaysBetween } from './Authorizations.js';
import { addDays, daysBetween, dow, fmtDate } from '../shared/dates.js';

const DAY = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const prevIopDay = d => { let x = String(d).slice(0, 10); while (!isIopDay(x)) x = addDays(x, -1); return x; };
// Level 1 group meets Tuesdays in the demo schedule: the first Tuesday after the last IOP day
const nextL1 = d => { let x = addDays(d, 1); while (dow(x) !== 'Tue') x = addDays(x, 1); return x; };
// why the step-down now, for the demo's own step-down (R-0391, J.O.). Synthetic.
const WHY = {
  'R-0391': 'J.O. completed 8 weeks of Level 2.1 (3 hours a day, Mon · Wed · Fri). At the ASAM review before her last IOP day (Oct 23): D5 down to 2 (opioid use disorder now in early remission, no use since early September, cravings low, relapse-prevention plan used outside group); D4 at 1 (she leads her own plan); D6 at 1 (stable housing, a sober support outside group). Step-down criteria are met, so the new Level 1 request asks for 12 weekly sessions to keep the relapse-prevention work going. This is the opposite of an "abstinent in treatment" denial: the dimensions changed, not just the drug screens.'
};

register('EarlyDischarge', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0391'], r => ['early_discharge', 'partial_decide'].includes(r.stage) || r.type === 'early_discharge_new_initial'); }
  // every date on the page, from the IOP units left (3 per IOP day, 3 IOP days a week) or the dates already set
  plan(r) {
    const s = this.s; const c = clientOf(s, r); const a = c?.authorization;
    const saved = (s.plans || []).find(p => p.request === r.id);
    const sd = r.step_down || (saved && { last_iop: saved.discharge, first_l1: saved.intake, send: saved.new_initial, decision: saved.decision });
    const auth = a && a.units ? { units: a.units, used: a.used || 0, left: Math.max(0, a.units - (a.used || 0)), start: a.start } : null;
    const offered = r.units_awarded || (r.units_offered ? (r.units_offered <= 5 ? r.units_offered * 3 : r.units_offered) : 0);
    let lastIop, runout = null, basis;
    if (sd?.last_iop) { lastIop = sd.last_iop; basis = 'set in the plan'; }
    else if (c?.step_down?.on) { lastIop = prevIopDay(c.step_down.on); basis = 'step-down criteria met at the ASAM review'; }
    else if (r.type === 'early_discharge_new_initial' && r.sent) { lastIop = prevIopDay(r.sent); basis = 'step-down criteria met at the ASAM review'; }
    else if (auth && auth.left > 0) { const from = auth.start && auth.start > s.today ? auth.start : addDays(s.today, 1); runout = lastIop = iopRunOut(from, auth.left, 3); basis = `${auth.left} units left at 3 per IOP day`; }
    else if (offered) { runout = lastIop = iopRunOut(addDays(s.today, 1), offered, 3); basis = `${offered} units at 3 per IOP day`; }
    else { lastIop = prevIopDay(a?.exhausted || s.today); basis = 'units used up'; }
    const review = sd?.review || addIopDays(lastIop, -3);
    const send = sd?.send || (r.type === 'early_discharge_new_initial' && r.sent ? r.sent.slice(0, 10) : review);
    const decision = sd?.decision || r.decision_due || addDays(send, 7);
    const firstL1 = sd?.first_l1 || nextL1(lastIop);
    const summary = addIopDays(lastIop, -1);
    const gap = Math.max(0, daysBetween(lastIop, firstL1) - 1);
    return { auth, offered, lastIop, runout, basis, review, send, decision, firstL1, summary, gap, saved: saved || (r.step_down ? { at: r.step_down.at || r.sent } : null), sent: !!r.sent && r.type === 'early_discharge_new_initial' };
  }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, backHref: 'Partials.dc.html', backLabel: 'Partial approvals & denials', crumb: 'step-down', payerChip: 'no step-down open', noneText: 'A step-down starts when Level 2.1 units run out or the ASAM review shows step-down criteria are met. No step-down is open right now.', altHref: 'Partials.dc.html', altLabel: 'Partial approvals & denials' };
    const p = this.plan(r); const pf = payerFirst(s, r.payer);
    const who = M.staffShort(s, clientOf(s, r)?.clinician || 'jperez');
    const cl = M.clientLabel(s, r.client, false);
    const status = d => d < s.today && (p.saved || p.sent) ? ['done', 'chip g'] : d === s.today ? ['today', 'chip y'] : p.saved || p.sent ? ['set', 'chip n'] : ['proposed', 'chip y'];
    const rows = [
      { at: p.review, date: fmtDate(p.review), step: 'ASAM continued-service review · step-down criteria checked dimension by dimension (D4, D5, D6)', who },
      { at: p.send, date: fmtDate(p.send), step: `New Level 1 initial drafted from the review · signed in Client Record · sent to ${pf} (${channelLabel(s, r).toLowerCase()})`, who: who + ' · Psyflo drafts', sentDone: p.sent },
      { at: p.summary, date: fmtDate(p.summary), step: 'Transfer summary pre-filled from the IOP group notes · reviewed in Client Record', who: 'Psyflo → ' + who },
      { at: p.lastIop, date: fmtDate(p.lastIop), step: 'Last Level 2.1 IOP day (3 hours) · transfer to Level 1 processed in Client Record', who },
      { at: p.firstL1, date: fmtDate(p.firstL1), step: 'First Level 1 session · weekly from here', who: who + ' · client' },
      { at: p.decision, date: fmtDate(p.decision), step: `${pf} decision due on the Level 1 initial (timeframe per contract · confirm)`, who: pf }
    ].sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : 0).map(x => { const [st, cls] = x.sentDone ? ['sent', 'chip g'] : status(x.at); return { ...x, status: st, cls }; });
    const kpis = [
      { l: 'Level 2.1 units', v: p.auth ? `${p.auth.used} / ${p.auth.units}` : p.offered ? `${p.offered}` : '—', s: p.auth ? `${p.auth.left} left · 3 per IOP day, 3 days a week` : p.offered ? 'H0015 · 3 per IOP day, 3 days a week' : 'from the request' },
      { l: 'Last IOP day', v: fmtDate(p.lastIop), s: `${DAY[dow(p.lastIop)] || dow(p.lastIop)} · ${p.basis}` },
      { l: 'First Level 1 session', v: fmtDate(p.firstL1), s: `${DAY[dow(p.firstL1)] || dow(p.firstL1)} · weekly` },
      { l: 'New Level 1 initial', v: fmtDate(p.send), s: `${p.sent ? 'sent' : 'to send'} · decision by ${fmtDate(p.decision)}` },
      { l: 'Gap in service', v: `${p.gap} day${p.gap === 1 ? '' : 's'}`, s: p.decision > p.firstL1 ? 'first session before the decision: confirm the plan pays it' : 'decision due before the first session' }
    ];
    const why = WHY[r.id] || `Step-down criteria come from the ASAM review on ${fmtDate(p.review)}: the request says, dimension by dimension, what changed (not just that the drug screens are negative). Psyflo drafts it from the review and the IOP notes; a clinician signs it in Client Record.`;
    const fromPartial = r.type !== 'early_discharge_new_initial';
    return {
      has: true, none: false, backHref: fromPartial ? 'Partials.dc.html?id=' + r.id : 'Authorizations.dc.html', backLabel: fromPartial ? 'Partial approvals & denials' : 'Authorizations',
      crumb: `${cl} · step-down · 2.1 to Level 1`,
      payerChip: `${pf} · Level 2.1 → Level 1`,
      title: `Step down ${cl} from Level 2.1 IOP to Level 1`,
      altHref: r.stage === 'peer_to_peer_booked' ? 'PeerBrief.dc.html?id=' + r.id : 'ExtDischarge.dc.html?client=' + r.client,
      altLabel: r.stage === 'peer_to_peer_booked' ? 'Peer-to-peer instead' : 'Transfer summary in Client Record',
      planBtn: p.saved ? 'Update this plan' : 'Set this plan', isSet: !!p.saved, setAt: p.saved?.at ? M.fmtDateTime(p.saved.at) : '', owner: who,
      kpis, rows, why
    };
  }
  get anchors() {
    return {
      plan: async () => {
        const s = this.s; const r = this.req(); if (!r) return;
        const p = this.plan(r); const who = clientOf(s, r)?.clinician || 'jperez'; const cl = M.clientLabel(s, r.client, false); const pf = payerFirst(s, r.payer);
        const reminders = [
          { for: who, kind: 'step_down', due: p.review, text: `ASAM review · step-down criteria · ${cl}` },
          { for: who, kind: 'step_down', due: p.summary, text: `Transfer summary · ${cl} · pre-filled from the IOP notes` },
          { for: who, kind: 'step_down', due: p.firstL1, text: `First Level 1 session · ${cl}` }
        ];
        if (!p.sent) reminders.splice(1, 0, { for: who, kind: 'step_down', due: p.send, text: `Sign and send the new Level 1 initial to ${pf} · ${cl}` });
        await this.do('request.stepDownPlan', { request: r.id, client: r.client, last_iop: p.lastIop, first_l1: p.firstL1, send: p.send, decision: p.decision, reminders, by: this.me?.id || 'jperez' });
        toast(`Plan set · last IOP day ${fmtDate(p.lastIop)} · first Level 1 session ${fmtDate(p.firstL1)} · ${reminders.length} reminders`);
      }
    };
  }
});
