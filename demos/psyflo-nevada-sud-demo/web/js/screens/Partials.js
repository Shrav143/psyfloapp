// 35 · Partial approvals & denials — four choices for a partial approval (accept 5 and auto-draft the next at session 3 ·
// reconsideration · peer-to-peer · step down), logged on the request; denials go to a reconsideration letter a person signs.
import { register, Screen, M, raw, esc, modal, toast } from '../app.js';
import { pickReq, clientOf, schoolName, historyRows, stamp, levelOf, payerFirst, stageLabel, sessionsOffered, FIVE_AT_A_TIME, iopDayFrom, nthIopDay, iopRunOut, addIopDays } from './Authorizations.js';
import { addDays, fmtDate } from '../shared/dates.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// kept for the other request screens: last IOP day the units cover (3 units per IOP day, 3 IOP days a week)
export const runOut = (start, units, rate = 3) => iopRunOut(start, units, rate || 3);
export const schoolDayFrom = iopDayFrom;
const steps = list => list.map((e, i) => ({ ...e, st: i === 0 ? 'border-top:0' : '' }));
const NEXT_HREF = { info_requested: 'InfoRequest.dc.html?id=', peer_to_peer_requested: 'PeerBrief.dc.html?id=', peer_to_peer_booked: 'PeerBrief.dc.html?id=', p2p_awaiting: 'PeerBrief.dc.html?id=', early_discharge: 'EarlyDischarge.dc.html?id=', appeal_sent: 'AppealLetter.dc.html?id=', draft_ready: 'ExtCase.dc.html?client=' };
const typeShort = t => ({ initial: 'initial', continued_stay: 'continued stay', peer_to_peer: 'peer-to-peer', early_discharge_new_initial: 'step-down + new Level 1 initial', appeal: 'reconsideration' }[t] || t);

// what Psyflo has learned plans say no for, and what it checks before a packet goes (demo numbers)
const REASONS = [
  { reason: '"Abstinent, no longer meets medical necessity" (Level 2.1 continued stay)', count: 9, check: 'Draft argues D5 relapse risk without the IOP structure, with attendance and UDS dates, D4 and D6' },
  { reason: 'Next IOP request arrived after the day it covers (no backdating)', count: 6, check: 'Molina: next request drafted at session 3; initials sent before the first IOP day' },
  { reason: 'Level 1 PA missing before session 24 (HPN)', count: 5, check: 'HPN Level 1 rows keep a PA on file from session 1' },
  { reason: 'Provider type not eligible for a mental-health code (SUAM read as SUD-only)', count: 4, check: "Letter cites the Medicaid enrollment for mental-health services and the clinician's own credentialing" },
  { reason: 'Level 2.1 initial without a UDS result from the assessment (SilverSummit)', count: 3, check: 'Packet blocked until the UDS result is attached' },
  { reason: 'ASAM dimension ratings missing from page 1 (CareSource form)', count: 2, check: 'Ratings filled on page 1 from the assessment' }
];
const LAST = {
  sentara: { when: 'Sep 2026 · J.T.', requested: '72 units', offer: '5 sessions', sent: 'next request faxed after session 5', award: 'approved a day late · one IOP day unbillable', lesson: 'the next request has to be in after session 3 to be approved before session 5' },
  anthem: { when: 'Aug 2026 · L.B.', requested: '90837 × 12', offer: 'denied', sent: 'reconsideration with the enrollment letter', award: 'reprocessed and paid', lesson: 'cite the Medicaid enrollment for mental-health services up front' },
  humana: { when: 'Sep 2026 · R.D.', requested: '72 units', offer: 'denied', sent: 'resubmitted with the UDS result', award: 'approved 72', lesson: 'Level 2.1 initials need the UDS result from the assessment' }
};

register('Partials', class extends Screen {
  init() { this.state = { door: 1 }; }
  focus() { return pickReq(this.s, this.params.id, ['R-0402'], r => ['partial_decide', 'denied'].includes(r.stage)); }
  facts(r) {
    const s = this.s; const c = clientOf(s, r);
    const five = FIVE_AT_A_TIME.has(r.payer);
    const sessions = sessionsOffered(r) || Math.round((r.units_awarded || 0) / 3);
    const units = sessions * 3;
    const a = c?.authorization;
    const start = a && a.payer === r.payer && a.start && a.start > s.today ? iopDayFrom(a.start) : iopDayFrom(addDays(s.today, 1));
    const s3 = nthIopDay(start, 3); const last = nthIopDay(start, Math.max(1, sessions)); const next = addIopDays(last, 1);
    const reqWeeks = Math.max(1, Math.round((r.units_requested || 72) / 9));
    const weeks = Math.round(sessions / 3 * 10) / 10;
    return { five, sessions, units, start, s3, last, next, reqWeeks, weeks };
  }
  denialText(q) {
    if (/provider|type|specialty|eligible/i.test(q.denial_reason || '')) return `Reason: "${q.denial_reason}." The reviewer read Provider Type 17 / Specialty 215, Substance Use Agency Model, as SUD-only. CCC of SN is enrolled with Nevada Medicaid for mental-health services too, and the clinician is credentialed individually. A reconsideration letter is drafted for a person to sign and send.`;
    return `Reason: "${q.denial_reason || 'not given'}." A reconsideration letter is drafted from the chart for a person to sign and send.`;
  }
  renderVals() {
    const s = this.s; const r = this.focus();
    const counts = {
      cPartial: plural(s.requests.filter(q => q.stage === 'partial_decide').length, 'partial to decide', 'partials to decide'),
      cP2P: plural(s.requests.filter(q => ['peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting'].includes(q.stage)).length, 'peer-to-peer open', 'peer-to-peers open'),
      cDenied: plural(s.requests.filter(q => q.stage === 'denied').length, 'denial', 'denials'),
      asOf: fmtDate(s.today, { dow: true }).replace(' ', ', '),
      reasons: REASONS
    };
    // right column: other partials, the next peer-to-peer, the open denial
    const others = s.requests.filter(q => q.stage === 'partial_decide' && q.id !== r?.id).map(q => ({ title: `Also to decide · ${M.clientLabel(s, q.client)} · ${payerFirst(s, q.payer)}`, text: `${q.id} · offered ${FIVE_AT_A_TIME.has(q.payer) ? sessionsOffered(q) + ' sessions' : q.units_offered + ' units'} of ${q.units_requested} units${q.reply_by ? ' · reply by ' + fmtDate(q.reply_by) : ''}`, href: 'Partials.dc.html?id=' + q.id, btn: 'Open the choices' }));
    const pq = s.requests.find(q => ['peer_to_peer_booked', 'peer_to_peer_requested', 'p2p_awaiting'].includes(q.stage) && q.id !== r?.id);
    const p2p = pq && {
      title: `Peer-to-peer · ${M.clientLabel(s, pq.client)} · ${payerFirst(s, pq.payer)} medical director · ${pq.p2p_at ? fmtDate(pq.p2p_at) : 'date to be set'}`,
      text: `Continued stay denied: "${pq.denial_reason || 'abstinent, no longer meets medical necessity'}". Call notes by ASAM dimension are ready: D5 relapse risk without the IOP structure, D4 readiness, D6 environment, attendance dates and negative UDS dates.`,
      href: 'PeerBrief.dc.html?id=' + pq.id, alt: 'EarlyDischarge.dc.html?id=' + pq.id, altLabel: 'Plan a step-down instead'
    };
    const dq = s.requests.find(q => q.stage === 'denied' && q.id !== r?.id);
    const den = dq && { title: `Denial · ${M.clientLabel(s, dq.client)} · ${payerFirst(s, dq.payer)}${/provider|type|specialty/i.test(dq.denial_reason || '') ? ' · provider type misread' : ''}`, text: this.denialText(dq), href: 'AppealLetter.dc.html?id=' + dq.id };
    const base = { ...counts, others, hasP2P: !!p2p, p2p: p2p || {}, hasDenial: !!den, den: den || {} };
    if (!r) return { ...base, none: true, has: false, f: {} };

    const p = M.payer(s, r.payer); const pf = payerFirst(s, r.payer);
    const isPartial = r.stage === 'partial_decide'; const isDenied = r.stage === 'denied';
    const fx = this.facts(r); const lvl = levelOf(s, r);
    const f = {
      title: `${r.id} · ${M.clientLabel(s, r.client)} · ${p.name} · ${typeShort(r.type)}`,
      chip: isPartial ? `Partial — decide${r.reply_by ? ' by ' + fmtDate(r.reply_by) : ''}` : isDenied ? `Denied · ${M.requestClock(s, r).text}` : stageLabel(r.stage),
      chipCls: isPartial ? 'chip y' : isDenied ? 'chip r' : 'chip n',
      sub: [schoolName(s, r), lvl === '2.1' ? 'Level 2.1 IOP · H0015 · 3 hours a day, 3 days a week' : 'Level 1 outpatient', fx.five && lvl === '2.1' ? '5 sessions at a time' : ''].filter(Boolean).join(' · ')
    };
    const tl = historyRows(s, r);
    if (isPartial) tl.push({ dt: 'Today', html: raw(`<b>Decide.</b> ${fx.sessions} sessions (${fx.units} units) is ${fx.weeks} weeks of IOP at 3 days a week, against the ${fx.reqWeeks} weeks requested (${r.units_requested} units).`) });
    if (isDenied) tl.push({ dt: 'Today', html: raw(`<b>Reconsideration.</b> ${esc(M.requestClock(s, r).text)}. Psyflo drafted the letter; a person signs and sends it.`) });
    f.steps = steps(tl.length ? tl : [{ dt: '—', html: 'Nothing logged on this request yet.' }]);
    const hist = LAST[r.payer];
    if (hist) {
      f.lastTitle = `Last time, same plan (${hist.when})`;
      f.last = steps([{ dt: 'Req.', html: hist.requested }, { dt: 'Answer', html: String(hist.offer) }, { dt: 'Sent', html: hist.sent }, { dt: 'Result', html: raw(`<b style="color:#8A2E1C">${esc(hist.award)}</b> — ${esc(hist.lesson)}`) }]);
    } else {
      f.lastTitle = 'Last time, same plan';
      f.last = steps([{ dt: '—', html: `No earlier partial or denial from ${p.name} in the tracker.` }, { dt: 'Plan', html: `${p.name}: ${p.tends_to_ask || 'no pattern yet'}${p.what_works ? '. What works: ' + p.what_works : ''}.` }]);
    }
    f.t1 = fx.five
      ? `Accept ${fx.sessions} IOP days (${fx.units} units, ${fmtDate(fx.start)} – ${fmtDate(fx.last)}). Psyflo drafts the next 5-session request after session 3 (${fmtDate(fx.s3, { dow: true })}) so ${pf} approves it before session 5. Nothing is backdated.`
      : `Accept ${fx.units} units: ${Math.ceil(fx.units / 3)} IOP days, through about ${fmtDate(iopRunOut(fx.start, fx.units))}. Psyflo drafts the continued stay two weeks before they run out.`;
    f.t2 = 'Psyflo drafts a reconsideration from the chart: ASAM ratings by dimension, D5 relapse risk without IOP, attendance dates and UDS results. A clinician reviews and signs it in Client Record.';
    f.t3 = `${pf}'s medical director calls to set a time, usually 1–3 weeks out. ${fx.five ? `The ${fx.sessions} sessions end ${fmtDate(fx.last)}, before most calls happen.` : 'Enter the date when it is agreed.'}`;
    f.t4 = 'Only if step-down criteria are met. Abstinent inside IOP is not the same as ready for Level 1 (see the note on this page). Plan the last IOP day and the new Level 1 initial.';
    f.infoNote = r.info_asked ? `${pf} also asked for more information. That reply has its own 24-hour clock.` : '';
    f.infoHref = 'InfoRequest.dc.html?id=' + r.id;

    // decided / denied: what happened and where it goes next
    if (!isPartial) {
      const dc = r.decision;
      const door = dc && { accept_next: `Accepted ${fx.sessions || ''} sessions · next request at session 3`, reconsider: 'Chose reconsideration', p2p: 'Asked for a peer-to-peer', step_down: 'Chose to step down to Level 1', accept: `Accepted ${r.units_awarded} units`, stretch: `Accepted ${r.units_awarded} units`, use_up: `Accepted ${r.units_awarded} units`, info: 'Chose to add information', early_discharge: 'Chose to step down' }[dc.door];
      if (isDenied) Object.assign(f, { doneTitle: 'Reconsideration letter.', doneText: this.denialText(r), doneHref: 'AppealLetter.dc.html?id=' + r.id, doneBtn: 'Open the letter' });
      else Object.assign(f, {
        doneTitle: door ? `${door} · ${stamp(s, dc.at)}.` : `${stageLabel(r.stage)}.`,
        doneText: { active: r.next_request?.due ? `Logged; nothing was sent to ${pf}. Next request drafted after session 3 (${fmtDate(r.next_request.due, { dow: true })}).` : 'The tracker row is updated.', draft_ready: 'Reconsideration drafted from the chart; a clinician reviews and signs it in Client Record.', info_requested: 'The reply is drafted; a clinician sends it within 24 hours.', peer_to_peer_requested: `Waiting for ${pf} to call and agree a time. Enter it on the call notes page.`, p2p_awaiting: `Call held · waiting for ${pf}'s decision.`, peer_to_peer_booked: r.p2p_at ? `Call ${M.fmtDateTime(r.p2p_at, { dow: true })} with ${pf}'s medical director · call notes ready.` : 'Call notes ready.', early_discharge: r.step_down ? `Last IOP day ${fmtDate(r.step_down.last_iop)} · first Level 1 session ${fmtDate(r.step_down.first_l1)}.` : 'Set the last IOP day and the Level 1 dates next.', appeal_sent: 'Reconsideration signed and saved; waiting for the plan.' }[r.stage] || '',
        doneHref: NEXT_HREF[r.stage] ? NEXT_HREF[r.stage] + (r.stage === 'draft_ready' ? r.client : r.id) : 'Authorizations.dc.html',
        doneBtn: { info_requested: 'Open the reply', peer_to_peer_requested: 'Enter the call date', peer_to_peer_booked: 'Open call notes', p2p_awaiting: 'Open call notes', early_discharge: 'Open the step-down plan', appeal_sent: 'Open the letter', draft_ready: 'Review in Client Record' }[r.stage] || 'Back to Authorizations'
      });
    }

    const d = [1, 2, 3, 4].includes(this.state.door) ? this.state.door : 1;
    const plans = {
      1: ['Logged, not sent:', fx.five ? `${fx.sessions} sessions recorded as approved (${fmtDate(fx.start)} – ${fmtDate(fx.last)}). A reminder and a drafted request are ready after session 3, ${fmtDate(fx.s3, { dow: true })}.` : `${fx.units} units recorded as approved.`, fx.five ? 'Log: accept 5 · draft the next at session 3' : 'Log: accept'],
      2: ['Reconsideration:', `Psyflo drafts it from the chart now; a clinician reviews and signs it in Client Record, and a person sends it to ${pf}.`, 'Draft the reconsideration'],
      3: ['Peer-to-peer:', `Logged on the request. If ${pf} has already agreed a time, enter it now; if not, enter it when they call. Call notes by ASAM dimension are drafted for you.`, 'Log the peer-to-peer request'],
      4: ['Step down:', `Accept the ${fx.sessions} sessions and plan the move to Level 1: last IOP day, first weekly session and the new Level 1 initial. Nothing goes to ${pf} yet.`, 'Plan the step-down']
    }[d];
    const c2 = k => 'door' + (d === k ? ' on' : '');
    const pick = k => () => this.setState({ door: k });
    return { ...base, none: false, has: true, isPartial, isOther: !isPartial, f, d1: c2(1), d2: c2(2), d3: c2(3), d4: c2(4), p1: pick(1), p2: pick(2), p3: pick(3), p4: pick(4), planTitle: plans[0], planText: plans[1], planBtn: plans[2] };
  }
  get anchors() { return { confirm: () => this.confirm() }; }
  confirm() {
    const s = this.s; const r = this.focus(); if (!r || r.stage !== 'partial_decide') return;
    const d = [1, 2, 3, 4].includes(this.state.door) ? this.state.door : 1;
    const fx = this.facts(r); const pf = payerFirst(s, r.payer);
    const choice = { 1: 'accept_next', 2: 'reconsider', 3: 'p2p', 4: 'step_down' }[d];
    const body = {
      accept_next: fx.five
        ? `<p>Accept <b>${fx.sessions} sessions</b> (${fx.units} units of H0015) for <b>${fmtDate(fx.start)} – ${fmtDate(fx.last)}</b>.</p><p>Psyflo drafts the next 5-session request after <b>session 3 (${fmtDate(fx.s3, { dow: true })})</b> and puts it in front of a clinician to sign, so ${esc(pf)} can approve it before session 5. IOP days cannot be backdated.</p>`
        : `<p>Accept <b>${fx.units} units</b> of the ${r.units_requested} requested.</p>`,
      reconsider: `<p>Psyflo drafts a reconsideration for ${esc(pf)} from the chart: ASAM ratings by dimension, D5 relapse risk without the IOP structure, attendance dates and UDS results. It waits in Client Record for a clinician to review and sign; a person sends it.</p>`,
      p2p: `<p>Ask ${esc(pf)} for a peer-to-peer with their medical director. ${esc(pf)} calls to agree a time; that happens outside Psyflo.</p><label style="display:block;font-weight:600;font-size:13px;margin:8px 0 4px" for="p2pw">Date and time of the call (leave blank if not set yet)</label><input id="p2pw" type="datetime-local" style="min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">`,
      step_down: `<p>Accept the ${fx.sessions} sessions and plan the step-down to Level 1. Next you set the last IOP day, the first weekly Level 1 session and the new Level 1 initial.</p><p style="color:#525B66;font-size:13px">Check the step-down criteria first: abstinent inside IOP is not the same as ready for Level 1.</p>`
    }[choice];
    const head = { accept_next: 'Accept and draft the next at session 3', reconsider: 'Ask for reconsideration', p2p: 'Ask for a peer-to-peer', step_down: 'Step down to Level 1' }[choice];
    modal(`<h2>${head} · ${esc(r.id)}</h2>${body}
      <p style="color:#525B66;font-size:13px">Logged on the request with your name and the time. Nothing is sent to ${esc(pf)} from here.</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Log it</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const when = box.querySelector('#p2pw')?.value || '';
        close();
        const plan = choice === 'accept_next' ? { sessions: fx.sessions, start: fx.start, next: fx.s3, last: fx.last } : choice === 'p2p' ? { when: when ? when.slice(0, 16) : undefined } : { sessions: fx.sessions };
        const res = await this.do('request.nvPartial', { id: r.id, choice, plan, by: this.me?.id || 'jperez' });
        if (!res) return;
        toast({ accept_next: `Logged on ${r.id}: ${fx.sessions} sessions accepted · next request drafted after session 3`, reconsider: 'Reconsideration drafting · review it in Client Record', p2p: when ? 'Peer-to-peer logged · call ' + M.fmtDateTime(when, { dow: true }) : 'Peer-to-peer requested · enter the date when it is set', step_down: `Logged on ${r.id}: step-down · set the dates next` }[choice]);
        if (choice === 'step_down') this.go('EarlyDischarge.dc.html', { id: r.id });
        if (choice === 'p2p') this.go('PeerBrief.dc.html', { id: r.id });
      });
  }
});
