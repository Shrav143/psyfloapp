// 2 · Do next · clinician home (Live). One list of what is due, built from referrals, family links,
// eligibility, screenings, requests, clocks and reminders already in the store. Each line opens its screen.
import { register, Screen, M } from '../app.js';
import { refStudent } from './Referrals.js';

const schoolShort = name => String(name || '').replace(/ (City|County) · /, ' ');

export function doNextBoard(s, me) {
  const t = s.today; const meId = me?.id || 'jperez';
  const mine = x => !x || me?.role === 'admin' || !me || x === meId;
  const today = [], week = [], waiting = [];
  const weekEnd = M.addDays(t, 7);
  const dayLabel = d => { const n = M.daysBetween(t, d); return n <= 4 ? M.fmtDate(d, { dow: true }).split(' ')[0] : M.fmtDate(d); };
  const refOf = id => M.byId(s.referrals, id);
  const studentOf = (rid, fallback) => { const r = refOf(rid); return r ? refStudent(s, r) : (M.byId(s.clients, fallback) ? M.clientLabel(s, fallback) : fallback || rid); };
  const cl = id => M.clientLabel(s, id);

  // ---- screening calls
  for (const sc of s.screenings.filter(x => x.status === 'booked' && x.when && mine(x.who))) {
    const r = refOf(sc.referral); const fl = M.familyLinkFor(s, sc.referral);
    const g = fl?.answers || {};
    const who = [g.relationship, g.best_time ? String(g.best_time).toLowerCase().replace(/ after.*$/, '') : ''].filter(Boolean).join(', ');
    const text = `Screening call · ${studentOf(sc.referral, sc.client)} · ${schoolShort(M.school(s, r?.school).name)}${who ? ' · ' + who : ''}`;
    const href = 'ExtScreening.dc.html?referral=' + sc.referral;
    const day = sc.when.slice(0, 10);
    if (day === t) today.push({ sort: sc.when.slice(11, 16), when: M.fmtTime(sc.when), text, ...(fl?.submitted_at || fl?.steps?.guardian ? { chip: 'details ready', cls: 'g' } : { chip: 'no family link yet', cls: 'y' }), href, btn: 'Open in Lauris', btnCls: 'p' });
    else if (day > t && day <= weekEnd) week.push({ sort: sc.when, when: dayLabel(day), text: text + ' · ' + M.fmtTime(sc.when), href, btn: 'Open in Lauris' });
    else if (day < t) today.push({ sort: '00', when: M.fmtDate(day), text: text + ' · not marked done', chip: 'past due', cls: 'r', href, btn: 'Open in Lauris', btnCls: 'o' });
  }

  // ---- requests
  for (const q of s.requests) {
    const c = cl(q.client); const p = M.payerShort(s, q.payer); const clock = M.requestClock(s, q);
    const href = M.requestHref(q);
    switch (q.stage) {
      case 'submitted':
        if (q.decision_due && q.decision_due <= t) today.push({ sort: '17:00', when: 'by 5 pm', text: `${p} decision due · ${c} · sent ${M.fmtDate(q.sent)}`, chip: clock.text, cls: clock.sev === 'r' ? 'r' : 'y', href: 'Submission.dc.html?id=' + q.id, btn: 'View', btnCls: 'o' });
        waiting.push({ who: p.split(' ')[0], text: `${c} · decision${q.decision_due ? ' due ' + M.fmtDate(q.decision_due) : ''}${q.fax_ref ? ' · ' + q.fax_ref : ''}`, href: 'Submission.dc.html?id=' + q.id, btn: 'View' });
        break;
      case 'overdue':
        today.push({ sort: 'z1', when: 'today', text: `${p} decision overdue · ${c} · overdue notice ready for you to send`, chip: clock.text.replace('decision ', ''), cls: 'r', href: 'Submission.dc.html?id=' + q.id, btn: 'Send notice', btnCls: 'p' });
        break;
      case 'info_requested':
        today.push({ sort: q.reply_due ? q.reply_due.slice(11, 16) : '12:00', when: q.reply_due ? 'by ' + M.fmtTime(q.reply_due) : 'today', text: `Reply to ${p} · ${c} · information request`, chip: clock.text.replace(' of 24', ''), cls: 'r', href: 'InfoRequest.dc.html?id=' + q.id, btn: 'Review and send', btnCls: 'p' });
        break;
      case 'partial_decide':
        today.push({ sort: 'z3', when: 'today', text: `Decide on the ${p} offer · ${c} · ${q.units_offered} of ${q.units_requested} units`, chip: clock.text, cls: 'y', href, btn: 'Decide', btnCls: 'o' });
        break;
      case 'draft_ready':
        today.push({ sort: 'z4', when: 'today', text: q.type === 'continued_stay' ? `Continued stay · ${c} · renew by ${M.fmtDate(q.renew_by || M.byId(s.clients, q.client)?.authorization?.end)}` : `${M.TYPE_LABEL[q.type] || 'Request'} · ${c} · ${clock.text}`, chip: 'draft ready', cls: 'g', href, btn: 'Open in Lauris', btnCls: 'o' });
        break;
      case 'awaiting_signature':
        today.push({ sort: 'z2', when: 'today', text: `${M.TYPE_LABEL[q.type] || 'Request'} · ${c} · processed, waiting for your signature`, chip: 'Forms to Approve', cls: 'y', href: 'ExtSignOff.dc.html?request=' + q.id, btn: 'Sign in Lauris', btnCls: 'p' });
        break;
      case 'signed':
        today.push({ sort: 'z0', when: 'today', text: `${M.TYPE_LABEL[q.type] || 'Request'} · ${c} · signed · press Send (${M.CHANNEL_LABEL[q.channel]})`, chip: 'signed', cls: 'g', href: 'Submission.dc.html?id=' + q.id, btn: 'Send', btnCls: 'p' });
        break;
      case 'sending':
        today.push({ sort: '00:00', when: 'now', text: `${M.TYPE_LABEL[q.type] || 'Request'} · ${c} · faxing through Sfax`, chip: 'faxing now', cls: 'n', href: 'Submission.dc.html?id=' + q.id, btn: 'View', btnCls: 'o' });
        break;
      case 'portal_open':
        today.push({ sort: 'z0', when: 'today', text: `Finish the upload in ${M.CHANNEL_LABEL[q.channel]} · ${c}`, chip: 'waiting for confirmation', cls: 'y', href: 'Submission.dc.html?id=' + q.id, btn: 'View', btnCls: 'o' });
        break;
      case 'peer_to_peer_booked': {
        const d = q.p2p_at.slice(0, 10);
        if (d === t) today.push({ sort: q.p2p_at.slice(11, 16), when: M.fmtTime(q.p2p_at), text: `Peer-to-peer call · ${p} · ${c}`, chip: 'call notes ready', cls: 'g', href, btn: 'Call notes', btnCls: 'p' });
        else if (d > t && d <= weekEnd) week.push({ sort: q.p2p_at, when: dayLabel(d), text: `Peer-to-peer call · ${p} · ${c}`, href, btn: 'Call notes' });
        waiting.push({ who: p.split(' ')[0], text: `${c} · peer-to-peer ${M.fmtDate(q.p2p_at)}`, href, btn: 'Call notes' });
        break;
      }
      case 'denied':
        waiting.push({ who: 'Guardian', text: `${c} · appeal letter · ${clock.text.replace('appeal window · ', '')}`, href, btn: 'View' });
        break;
      case 'appeal_sent':
        waiting.push({ who: p.split(' ')[0], text: `${c} · appeal decision`, href, btn: 'View' });
        break;
    }
  }

  // ---- referrals, family links, eligibility
  for (const r of s.referrals) {
    if (['draft', 'grant_program', 'declined'].includes(r.stage) || r.history) continue;
    const started = ['in_intake', 'in_service'].includes(r.stage);
    const st = refStudent(s, r); const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id);
    const booked = s.screenings.some(x => x.referral === r.id && x.status === 'booked');
    const href = 'Referral.dc.html?id=' + r.id;
    if (r.hold) { waiting.push({ who: 'Guardian', text: `${r.id} · on hold · ${r.hold.why}`, href, btn: 'Referral' }); continue; }
    if (started) { /* past the referral steps: only what the school still owes */ }
    else if (el?.status === 'details_received') today.push({ sort: 'z2', when: 'today', text: `Run the eligibility check · ${st} · family link submitted ${M.fmtDate(el.details_at || fl?.submitted_at)}`, chip: 'details received', cls: 'y', href: 'Eligibility.dc.html?referral=' + r.id, btn: 'Run the check', btnCls: 'p' });
    else if (el?.status === 'recorded' && el.result === 'active' && !booked && r.stage === 'needs_screening') today.push({ sort: 'z2', when: 'today', text: `Schedule the screening call · ${st} · Medicaid ${r.eligibility || 'active'}`, chip: 'eligibility active', cls: 'g', href: href + '&sched=1', btn: 'Schedule', btnCls: 'p' });
    else if (el?.status === 'recorded' && el.result !== 'active' && r.stage === 'needs_screening') today.push({ sort: 'z2', when: 'today', text: `Medicaid not active · ${st} · route to the grant program or hold`, chip: 'not active', cls: 'r', href: 'Eligibility.dc.html?referral=' + r.id, btn: 'Decide', btnCls: 'o' });
    else if (r.stage === 'needs_screening' && !booked && !fl?.sent_at) today.push({ sort: 'z5', when: 'today', text: `New referral · ${st} · ${schoolShort(M.school(s, r.school).name)} · ${r.next || 'send the family link'}`, chip: 'new', cls: 'y', href, btn: 'Review', btnCls: 'o' });
    if (!started && fl?.sent_at && !fl.submitted_at) waiting.push({ who: 'Guardian', text: `${st.split(',')[0]} · family link ${fl.opened_at ? 'opened, not submitted' : 'sent ' + M.fmtDate(fl.sent_at) + ', not opened'}`, href, btn: 'Referral' });
    if (r.stage === 'waiting_on_school') waiting.push({ who: 'School', text: `${r.id} · ${r.next || 'waiting on the school'}`, href, btn: 'Referral' });
    else {
      const miss = Object.entries(r.form?.attachments || {}).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' '));
      if (miss.length) waiting.push({ who: 'School', text: `${r.id} · ${miss.join(', ')}`, href, btn: 'Referral' });
    }
  }

  // ---- parent-portal signing tasks
  for (const pt of (s.portal_tasks || []).filter(x => x.status === 'waiting')) waiting.push({ who: 'Guardian', text: `${cl(pt.client)} · ${String(pt.form).toLowerCase()} · parent portal`, href: 'ParentPortal.dc.html', btn: 'View' });

  // ---- reminders
  const seenRecheck = new Set();
  for (const rm of s.reminders.filter(x => !x.done && x.due && x.kind !== 'screening_call' && mine(x.for))) {
    const d = rm.due.slice(0, 10);
    const isElig = rm.kind === 'eligibility_recheck';
    if (isElig) seenRecheck.add(rm.record);
    const href = isElig ? 'Eligibility.dc.html?referral=' + rm.record : (rm.href || 'DoNext.dc.html');
    const text = isElig ? `Eligibility re-check · ${studentOf(rm.record).split(',')[0]} · DMAS portal` : rm.text;
    const btn = isElig ? 'Run the check' : (rm.btn || 'Open');
    if (d <= t) today.push({ sort: 'z6', when: d < t ? M.fmtDate(d) : 'today', text, chip: d < t ? 'overdue' : 'due today', cls: d < t ? 'r' : 'y', href, btn, btnCls: 'o' });
    else if (d <= weekEnd) week.push({ sort: d, when: dayLabel(d), text, href, btn });
  }
  // weekly re-checks recorded before the demo started (no reminder row)
  for (const el of s.eligibility.filter(e => e.status === 'recorded' && e.next_check && !seenRecheck.has(e.referral))) {
    const d = el.next_check; const text = `Eligibility re-check · ${studentOf(el.referral, el.client).split(',')[0]} · DMAS portal`; const href = 'Eligibility.dc.html?referral=' + el.referral;
    if (d <= t) today.push({ sort: 'z6', when: d < t ? M.fmtDate(d) : 'today', text, chip: d < t ? 'overdue' : 'due today', cls: d < t ? 'r' : 'y', href, btn: 'Run the check', btnCls: 'o' });
    else if (d <= weekEnd) week.push({ sort: d, when: dayLabel(d), text, href, btn: 'Run the check' });
  }

  today.sort((a, b) => a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0);
  week.sort((a, b) => a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0);
  return { today, week, waiting };
}

register('DoNext', class extends Screen {
  renderVals() {
    const s = this.s; const me = this.me;
    const { today, week, waiting } = doNextBoard(s, me);
    const h = new Date().getHours();
    const first = (me?.name || '').split(' ')[0] || 'there';
    const d = M.fmtDate(s.today, { dow: true }).split(' ');
    return {
      greeting: `Good ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, ${first}`,
      dateChip: `${d[0]}, ${d.slice(1).join(' ')}`,
      countText: today.length ? `${today.length} thing${today.length === 1 ? '' : 's'}` : 'nothing due', countCls: today.some(x => x.cls === 'r') ? 'y' : today.length ? 'y' : 'g',
      today, week, waiting,
      todayEmpty: today.length ? '' : 'Nothing due today. New referrals, replies and drafts land here as they arrive.',
      weekEmpty: week.length ? '' : 'Nothing booked for the rest of the week.',
      waitingEmpty: waiting.length ? '' : 'Nobody owes you anything right now.'
    };
  }
});

// the sidebar badge counts the same "Today" list this screen shows
window.__psyfloDoNextCount = (s, me) => doNextBoard(s, me).today.length;
