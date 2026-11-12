// 35 · Partials & denials — three choices for a partial award (stretch · use them up · peer-to-peer),
// logged on the request; denials handed to the guardian.
import { register, Screen, M, raw, esc, modal, toast } from '../app.js';
import { pickReq, details, clientOf, schoolName, historyRows, stamp, rateFor } from './Authorizations.js';
import { isSchoolDay, addBusinessDays, addDays, daysBetween, businessDaysBetween, fmtDate } from '../shared/dates.js';

const payerFirst = (s, id) => id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id).split(' ')[0];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// first school day on or after d
export const schoolDayFrom = d => { let x = d.slice(0, 10); while (!isSchoolDay(x)) x = addDays(x, 1); return x; };
// last school day the units cover, at `rate` units per school day from `start` (start counts)
export const runOut = (start, units, rate = 3) => addBusinessDays(schoolDayFrom(start), Math.max(0, Math.ceil(units / rate) - 1));
const steps = list => list.map((e, i) => ({ ...e, st: i === 0 ? 'border-top:0' : '' }));
const NEXT_HREF = { info_requested: 'InfoRequest.dc.html?id=', peer_to_peer_requested: 'PeerBrief.dc.html?id=', peer_to_peer_booked: 'PeerBrief.dc.html?id=', p2p_awaiting: 'PeerBrief.dc.html?id=', early_discharge: 'EarlyDischarge.dc.html?id=' };
const typeShort = t => ({ initial: 'initial', continued_stay: 'continued stay', peer_to_peer: 'peer-to-peer', early_discharge_new_initial: 'early discharge + new initial', appeal: 'appeal' }[t] || t);

register('Partials', class extends Screen {
  init() { this.state = { door: 1 }; }
  // option A: spread the awarded units so they last until the current end date
  stretch(r, fx) {
    const c = clientOf(this.s, r);
    const until = (r.dates || '').split(' to ')[1] || c?.authorization?.end || addDays(fx.start, 7 * fx.reqWeeks);
    const days = Math.max(1, businessDaysBetween(fx.start, until) + 1);
    const perDay = Math.round(fx.offered / days * 10) / 10;
    const perWeek = Math.round(fx.offered / days * 5 * 10) / 10;
    return { until, days, perDay, perWeek, usualWeek: fx.rate * 5 };
  }
  focus() { return pickReq(this.s, this.params.id, ['R-0402'], r => ['partial_decide', 'denied'].includes(r.stage)); }
  facts(r) {
    const s = this.s; const c = clientOf(s, r); const rate = rateFor(r) || 3;
    const offered = r.units_offered || r.units_awarded || 0;
    const a = c?.authorization;
    const start = a && a.payer === r.payer && a.start && a.start > s.today ? a.start : s.today;
    const end = runOut(start, offered, rate);
    const nextStart = addBusinessDays(end, -14);
    const [d0, d1] = (r.dates || '').split(' to ');
    const reqWeeks = d0 && d1 ? Math.round(daysBetween(d0, d1) / 7) : 13;
    const weeks = Math.round(offered / rate / 5);
    const slotUnits = 20 * rate; // earliest peer-to-peer slot ~4 weeks out
    const pct = Math.min(100, Math.round(slotUnits / Math.max(1, offered) * 10) * 10);
    return { offered, rate, start, end, nextStart, reqWeeks, weeks, pct };
  }
  renderVals() {
    const s = this.s; const r = this.focus();
    const counts = {
      cPartial: plural(s.requests.filter(q => q.stage === 'partial_decide').length, 'partial to decide', 'partials to decide'),
      cP2P: plural(s.requests.filter(q => ['peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting'].includes(q.stage)).length, 'peer-to-peer open', 'peer-to-peers open'),
      cDenied: plural(s.requests.filter(q => q.stage === 'denied').length, 'denial', 'denials'),
      asOf: fmtDate(s.today, { dow: true }).replace(' ', ', '),
      reasons: s.denial_reasons || []
    };
    // right column: other partials, the next peer-to-peer, the open denial
    const others = s.requests.filter(q => q.stage === 'partial_decide' && q.id !== r?.id).map(q => ({ title: `Also to decide · ${M.clientLabel(s, q.client)} · ${payerFirst(s, q.payer)}`, text: `${q.id} · offered ${q.units_offered} of ${q.units_requested}${q.reply_by ? ' · reply by ' + fmtDate(q.reply_by) : ''}`, href: 'Partials.dc.html?id=' + q.id, btn: 'Open the three choices' }));
    const pq = s.requests.find(q => ['peer_to_peer_booked', 'peer_to_peer_requested', 'p2p_awaiting'].includes(q.stage) && q.id !== r?.id);
    const pa = pq && clientOf(s, pq)?.authorization;
    const p2p = pq && { title: `Peer-to-peer · ${M.clientLabel(s, pq.client)} · ${payerFirst(s, pq.payer)} · ${pq.p2p_at ? fmtDate(pq.p2p_at) : 'date to be set'}`, text: `Call notes ready${pa?.exhausted ? ` · ${pq.units_awarded || pa.units} units ${pa.exhausted <= s.today ? 'ran' : 'run'} out ${fmtDate(pa.exhausted)}` : ''}`, href: 'PeerBrief.dc.html?id=' + pq.id, alt: 'EarlyDischarge.dc.html?id=' + pq.id };
    const dq = s.requests.find(q => q.stage === 'denied' && q.id !== r?.id);
    const den = dq && { title: `Denial · ${M.clientLabel(s, dq.client)} · ${payerFirst(s, dq.payer)} · a parent or guardian can appeal`, text: details(s, dq.id).denial_text || `Reason: "${dq.denial_reason}." A parent or guardian can appeal (ask Harvest who else can); a plain-language letter is drafted for them to read, change and sign on the parent portal.`, href: 'AppealLetter.dc.html?id=' + dq.id };
    const base = { ...counts, others, hasP2P: !!p2p, p2p: p2p || {}, hasDenial: !!den, den: den || {} };
    if (!r) return { ...base, none: true, has: false, f: {} };

    const c = clientOf(s, r); const p = M.payer(s, r.payer);
    const isPartial = r.stage === 'partial_decide'; const isDenied = r.stage === 'denied';
    const fx = this.facts(r);
    const f = {
      title: `${r.id} · ${M.clientLabel(s, r.client)} · ${p.name} · ${typeShort(r.type)}`,
      chip: isPartial ? `Partial — decide${r.reply_by ? ' by ' + fmtDate(r.reply_by) : ''}` : isDenied ? `Denied · ${M.requestClock(s, r).text}` : M.STAGE_LABEL[r.stage],
      chipCls: isPartial ? 'chip y' : isDenied ? 'chip r' : 'chip n',
      sub: [schoolName(s, r), (r.service || '').split(' · ')[0], fx.rate ? fx.rate + ' units/day typical' : ''].filter(Boolean).join(' · '),
      offered: fx.offered, infoAsked: !!r.info_asked
    };
    const tl = historyRows(s, r);
    if (isPartial) tl.push({ dt: 'Today', html: raw(`<b>Decide.</b> ${fx.offered} units at ${fx.rate}/day is ${fx.weeks} weeks of a ${fx.reqWeeks}-week request.`) });
    if (isDenied) tl.push({ dt: 'Today', html: raw(`<b>Guardian-led appeal.</b> ${esc(M.requestClock(s, r).text.replace(/^appeal window · /, ''))} in the appeal window.`) });
    f.steps = steps(tl.length ? tl : [{ dt: '—', html: 'Nothing logged on this request yet.' }]);
    const hist = (s.payer_history || []).find(h => h.payer === r.payer && h.school === c?.school);
    if (hist) {
      f.lastTitle = `Last time, same payer, same school (${hist.when})`;
      f.last = steps([{ dt: 'Req.', html: hist.requested + ' units' }, { dt: 'Offer', html: String(hist.offer) }, { dt: 'Sent', html: hist.sent }, { dt: 'Award', html: raw(`<b style="color:#8A2E1C">${esc(hist.award)}</b> — ${esc(hist.lesson)}`) }]);
    } else {
      f.lastTitle = 'Last time, same payer, same school';
      f.last = steps([{ dt: '—', html: `No earlier partial or denial from ${p.name} for ${schoolName(s, r) || 'this school'} in the tracker.` }, { dt: 'Payer', html: `${p.name}: ${p.tends_to_ask || 'no pattern yet'}${p.what_works ? '. What works: ' + p.what_works : ''}.` }]);
    }
    const pf = payerFirst(s, r.payer);
    const st = this.stretch(r, fx);
    f.t1 = `Spread the ${fx.offered} units to last until ${fmtDate(st.until)}: about ${st.perWeek} units a week (${st.perDay} a school day) instead of ${st.usualWeek}.`;
    f.t2 = `Keep the same care (${fx.rate} a school day). Units run out about ${fmtDate(fx.end)}; then discharge and start a new initial.`;
    f.t3 = `${pf} calls to set a time, usually 4–8 weeks out; about ${fx.pct}% of the ${fx.offered} units will be used by then. Enter the date when it is agreed.`;
    f.infoNote = r.info_asked ? `${pf} also asked for more information. That reply has its own 24-hour clock.` : '';
    f.infoHref = 'InfoRequest.dc.html?id=' + r.id;

    // decided / denied: what happened and where it goes next
    if (!isPartial) {
      const dc = r.decision;
      const door = dc && { accept: `Accepted ${r.units_awarded} units`, stretch: `Accepted ${r.units_awarded} units · stretched`, use_up: `Accepted ${r.units_awarded} units · using them up`, info: 'Chose to add information', p2p: 'Asked for a peer-to-peer call', early_discharge: `Accepted ${r.units_awarded} units with an early discharge` }[dc.door];
      if (isDenied) Object.assign(f, { doneTitle: 'Guardian-led appeal.', doneText: details(s, r.id).denial_text || `Reason: "${r.denial_reason}." A plain-language letter is drafted for the guardian to read, change and sign on the parent portal.`, doneHref: 'AppealLetter.dc.html?id=' + r.id, doneBtn: 'Open guardian letter' });
      else Object.assign(f, { doneTitle: door ? `${door} · ${stamp(s, dc.at)}.` : `${M.STAGE_LABEL[r.stage]}.`, doneText: { active: r.stretch ? `Logged only; nothing was sent to ${pf}. About ${r.stretch.per_week || '?'} units a week until ${r.stretch.until ? fmtDate(r.stretch.until) : 'the end date'}.` : 'The tracker row is updated.', info_requested: 'The reply is drafted; a clinician sends it within 24 hours.', peer_to_peer_requested: `Waiting for ${pf} to call and agree a time. Enter it on the call notes page.`, p2p_awaiting: `Call held · waiting for ${pf}'s decision.`, peer_to_peer_booked: r.p2p_at ? `Call ${M.fmtDateTime(r.p2p_at, { dow: true })} · call notes ready.` : 'Call notes ready.', early_discharge: r.early_discharge ? `Discharge ${fmtDate(r.early_discharge.discharge)} · new intake ${fmtDate(r.early_discharge.intake)}.` : 'Set the discharge and new-intake dates next.' }[r.stage] || '', doneHref: NEXT_HREF[r.stage] ? NEXT_HREF[r.stage] + r.id : 'Authorizations.dc.html', doneBtn: { info_requested: 'Open the reply', peer_to_peer_requested: 'Enter the call date', peer_to_peer_booked: 'Open call notes', p2p_awaiting: 'Open call notes', early_discharge: 'Open the discharge dates' }[r.stage] || 'Back to Authorizations' });
    }

    const d = [1, 2, 3].includes(this.state.door) ? this.state.door : 1;
    const plans = {
      1: ['Logged, not sent:', `${fx.offered} units recorded as awarded; about ${st.perWeek} units a week until ${fmtDate(st.until)}. Nothing goes to ${pf}.`, 'Log: accept and stretch'],
      2: ['Logged, not sent:', `${fx.offered} units recorded as awarded at the usual ${fx.rate} a school day, running out about ${fmtDate(fx.end)}. Next you set the discharge and new-intake dates. Nothing goes to ${pf}.`, 'Log: accept and use them up'],
      3: ['Peer-to-peer:', `Logged on the request. If ${pf} has already agreed a time, enter it now; if not, enter it when they call. The call notes are drafted for you.`, 'Log the peer-to-peer request']
    }[d];
    const c2 = k => 'door' + (d === k ? ' on' : '');
    const pick = k => () => this.setState({ door: k });
    return { ...base, none: false, has: true, isPartial, isOther: !isPartial, f, d1: c2(1), d2: c2(2), d3: c2(3), p1: pick(1), p2: pick(2), p3: pick(3), planTitle: plans[0], planText: plans[1], planBtn: plans[2] };
  }
  get anchors() { return { confirm: () => this.confirm() }; }
  confirm() {
    const s = this.s; const r = this.focus(); if (!r || r.stage !== 'partial_decide') return;
    const d = [1, 2, 3].includes(this.state.door) ? this.state.door : 1;
    const fx = this.facts(r); const st = this.stretch(r, fx); const pf = payerFirst(s, r.payer);
    const choice = { 1: 'stretch', 2: 'use_up', 3: 'p2p' }[d];
    const body = {
      stretch: `<p>Accept <b>${fx.offered}</b> of ${r.units_requested} units and spread them to last until <b>${fmtDate(st.until)}</b>: about <b>${st.perWeek} units a week</b> (${st.perDay} a school day) instead of ${st.usualWeek}.</p><p style="color:#525B66;font-size:13px">This is logged on the request only. Nothing is sent to ${esc(pf)}.</p>`,
      use_up: `<p>Accept <b>${fx.offered}</b> of ${r.units_requested} units and keep the same care (${fx.rate} a school day). Units run out about <b>${fmtDate(fx.end)}</b>; then discharge and start a new initial (no earlier than ${fmtDate(addDays(s.today, 30))}).</p><p style="color:#525B66;font-size:13px">This is logged on the request only. Nothing is sent to ${esc(pf)}. Next you set the discharge and new-intake dates.</p>`,
      p2p: `<p>Ask ${esc(pf)} for a peer-to-peer call. ${esc(pf)} calls to agree a time; that happens outside Psyflo.</p><label style="display:block;font-weight:600;font-size:13px;margin:8px 0 4px" for="p2pw">Date and time of the call (leave blank if not set yet)</label><input id="p2pw" type="datetime-local" style="min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">`
    }[choice];
    modal(`<h2>${{ stretch: 'Accept and stretch', use_up: 'Accept and use them up', p2p: 'Ask for a peer-to-peer call' }[choice]} · ${esc(r.id)}</h2>${body}
      <p style="color:#525B66;font-size:13px">Logged on the request with your name and the time.</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Log it</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const when = box.querySelector('#p2pw')?.value || '';
        close();
        const plan = choice === 'stretch' ? { until: st.until, per_week: st.perWeek, per_day: st.perDay } : choice === 'use_up' ? { runout: fx.end } : { when: when ? when.slice(0, 16) : undefined };
        await this.do('request.partialChoice', { id: r.id, choice, plan });
        toast({ stretch: `Logged on ${r.id}: accept ${fx.offered} and stretch · not sent to ${pf}`, use_up: `Logged on ${r.id}: accept ${fx.offered} and use them up · set the dates next`, p2p: when ? 'Peer-to-peer logged · call ' + M.fmtDateTime(when, { dow: true }) : 'Peer-to-peer requested · enter the date when it is set' }[choice]);
        if (choice === 'use_up') this.go('EarlyDischarge.dc.html', { id: r.id });
        if (choice === 'p2p') this.go('PeerBrief.dc.html', { id: r.id });
      });
  }
});
