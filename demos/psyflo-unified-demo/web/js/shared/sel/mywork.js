// My Work selectors (pure ESM: the browser and the tests import this file; nothing here touches the DOM, the machine clock or a default user).
//
// One list of what needs a person, filtered by what the signed-in role may do. Every statement is computed from stored records;
// every date comes from the clock service (shared/clock.js); every number that is a rule reads the rules table (shared/rules.js).
// A missing actor returns nothing (fail closed): there is no "default clinician".
//
//   sectionsFor(role) · defaultSection(role) · resolveSection(role, wanted)
//   worklist(s, actor)       -> { items, today, week, waiting, counts, hidden }   items: see ITEM below
//   dayView(s, actor, sid)   -> one staffer's day (notes behind, due next, one progress line)
//   teamView(s, actor)       -> the staff in scope with timeliness, approval mode, review waiting
//   reviewQueue(s, actor)    -> notes the actor may review (never their own), plus the notes decided today
//   noteTimeliness / behindLines / repeatedParagraphs / pendingFor / managedStaff are shared with the old screens
//
// ITEM = { id, kind, group:'today'|'week'|'waiting', rank, when, title, sub, chip:{text,tone}, verb, to, who?, rule?, ops, section?, urgent? }
//   `to` is an old-style target ('Submission.dc.html?id=R-0399'); the screen runs it through hrefFor so a live redirect applies.
//   ops: true for items about status, deadlines and units (what an administrator may see); false for anything with clinical content.
import * as M from '../model.js';
import { addDays, addHours, daysBetween, hoursBetween, isSchoolDay, fmtDate, fmtTime } from '../dates.js';
import { today as clockToday, now as clockNow } from '../clock.js';
import { rule, ruleValue, decisionDay } from '../rules.js';
import { can, CAP_NOTE } from '../permissions.js';

// ---------------------------------------------------------------------------------------------------------------- sections
export const SECTION_LABEL = { todo: 'To do', review: 'Review', team: 'Team', day: 'My day', referrals: 'Referrals' };
const SECTIONS = {
  direct_support: ['day'],
  supervisor: ['review', 'team', 'todo'],
  clinician: ['todo', 'review', 'team', 'referrals'],
  admin: ['todo', 'team']
};
export const sectionsFor = role => (SECTIONS[role] || []).slice();
export const defaultSection = role => (SECTIONS[role] || [])[0] || null;
// the section a role really gets for a requested one (a hand-typed ?section= can never open what the role may not see)
export function resolveSection(role, wanted) {
  const list = SECTIONS[role] || [];
  if (list.includes(wanted)) return wanted;
  if (wanted === 'day' && list.includes('team')) return 'team';        // the old Staff dashboard: supervisors and above see it as Team
  if (wanted === 'todo' && role === 'direct_support') return 'day';
  return list[0] || null;
}
export const sectionLabel = (role, id) => id === 'todo' && role === 'admin' ? 'Operations' : SECTION_LABEL[id];

// ---------------------------------------------------------------------------------------------------------------- helpers
const rank = r => ({ direct_support: 1, supervisor: 2, clinician: 3, admin: 4 }[r] || 0);
export const plural = (n, w, many) => `${n} ${n === 1 ? w : (many || w + 's')}`;
const and = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const tone = sev => ({ r: 'danger', y: 'warning', g: 'success', n: 'neutral' }[sev] || 'neutral');
const label = (s, id) => M.clientLabel(s, id);
const shortLabel = (s, id) => M.clientLabel(s, id, false);
const staffShort = (s, id) => id ? M.staffShort(s, id) : '';
const schoolShort = name => String(name || '').replace(/ (City|County) · /, ' ');
const monday = d => { const w = M.parse(d).getUTCDay(); return M.addDays(d, -((w + 6) % 7)); };
const monthEndOf = d => M.addDays(M.addDays(d.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1);
const SESSION_END = '15:30';       // dismissal: a session with no Psyflo timer is taken to end then (documented in seed/notes/e1.md)
const studentOf = (s, rid, fallback) => {
  const r = M.byId(s.referrals, rid);
  if (r) return M.byId(s.clients, r.client) ? M.clientLabel(s, r.client) : (r.client || (r.form && r.form.client) || 'New student');
  return M.byId(s.clients, fallback) ? M.clientLabel(s, fallback) : (fallback || rid || 'Student');
};
export const textOf = x => x == null ? '' : typeof x === 'string' ? x : (x.narrative || x.text || x.value || '');
export const plainText = t => textOf(t).replace(/\[\[|\]\]/g, '');
const caseHref = id => 'Authorizations.dc.html' + (id ? '?id=' + id : '');
const REMINDER_VERB = { weekly_call: 'Write call note', collateral: 'Write note', eligibility_recheck: 'Run the check' };

// ---------------------------------------------------------------------------------------------------------------- note timeliness
// On-time tracking for one staffer, from the notes the extension reported at Process Form. Rules (rules table): a daily note is due
// notes.daily_due_hours after the session (Harvest target); the weekly guardian call by the end of that week; the monthly collateral by month end.
export function noteTimeliness(s, sid) {
  const today = clockToday(s), nowT = clockNow(s), monthStart = today.slice(0, 8) + '01';
  const hours = ruleValue(s, 'notes.daily_due_hours', 24);
  const kids = (s.clients || []).filter(c => c.staff === sid && c.stage !== 'discharged');
  const mine = (s.notes || []).filter(n => n.staff === sid);
  const timer = (s.timers || {})[sid];
  const endOf = (cid, d) => (timer && timer.client === cid && d === today && timer.blocks && timer.blocks.length ? timer.blocks[timer.blocks.length - 1][1] : SESSION_END);
  const behind = [], due = [], late = [];
  let onTime = 0, counted = 0;
  const tally = (d, ok) => { if (d >= monthStart) { counted++; if (ok) onTime++; } };
  for (const c of kids) {
    const of = type => mine.filter(n => n.client === c.id && n.type === type);
    const dn = of('daily'); const byDate = new Map(dn.map(n => [n.date, n]));
    let start = dn.map(n => n.date).sort()[0] || today;
    if (start < monday(today)) start = monday(today);
    for (let d = start; d <= today; d = M.addDays(d, 1)) {
      if (!isSchoolDay(d)) continue;
      const end = d + 'T' + endOf(c.id, d), dueAt = addHours(end, hours), n = byDate.get(d);
      if (n) { const ok = !n.processed_at || n.processed_at <= dueAt; tally(d, ok); if (!ok) late.push({ type: 'daily', c, date: d, hours: Math.round(hoursBetween(end, n.processed_at)) }); }
      else if (nowT > dueAt) { tally(d, false); behind.push({ type: 'daily', c, date: d, dueAt, hours: Math.floor(hoursBetween(end, nowT)) }); }
      else due.push({ type: 'daily', c, date: d, dueAt });
    }
    for (const [type, periodOf, dueOf] of [
      ['weekly_guardian', monday, p => M.addDays(p, 4) + 'T23:59'],
      ['monthly_collateral', d => d.slice(0, 8) + '01', p => monthEndOf(p) + 'T23:59']]) {
      const ns = of(type); const cur = periodOf(today);
      let p = ns.length ? periodOf(ns.map(n => n.date).sort()[0]) : cur;
      while (p <= cur) {
        const n = ns.find(x => periodOf(x.date) === p), dueAt = dueOf(p);
        if (n) { const ok = !n.processed_at || n.processed_at <= dueAt; tally(n.date, ok); if (!ok) late.push({ type, c, date: n.date }); }
        else if (nowT > dueAt) { tally(dueAt, false); behind.push({ type, c, date: p, dueAt }); }
        else due.push({ type, c, date: p, dueAt });
        p = type === 'weekly_guardian' ? M.addDays(p, 7) : M.addDays(monthEndOf(p), 1);
      }
    }
  }
  const order = { daily: 0, weekly_guardian: 1, monthly_collateral: 2 };
  behind.sort((a, b) => order[a.type] - order[b.type] || a.date.localeCompare(b.date));
  return { kids, behind, due, late, onTime, counted, rate: counted ? Math.round(100 * onTime / counted) : null, hours };
}

// "2 daily notes past 24 h · J.T. Tue Oct 27, D.P. Mon Oct 26": one line per kind of note
export function behindLines(s, t) {
  const lbl = c => shortLabel(s, c.id); const out = [];
  const h = t.hours || ruleValue(s, 'notes.daily_due_hours', 24);
  const daily = t.behind.filter(b => b.type === 'daily');
  if (daily.length) out.push({ head: `${plural(daily.length, 'daily note')} past ${h} h`, who: daily.map(b => `${lbl(b.c)} ${fmtDate(b.date, { dow: true })}`).join(', ') });
  const wk = t.behind.filter(b => b.type === 'weekly_guardian');
  if (wk.length) out.push({ head: `${plural(wk.length, 'weekly guardian call')} missed`, who: wk.map(b => `${lbl(b.c)} week of ${fmtDate(b.date)}`).join(', ') });
  const mo = t.behind.filter(b => b.type === 'monthly_collateral');
  if (mo.length) out.push({ head: `${plural(mo.length, 'monthly collateral')} missed`, who: mo.map(b => `${lbl(b.c)} ${fmtDate(b.date).split(' ')[0]}`).join(', ') });
  return out;
}

const monthNotes = (s, sid) => (s.notes || []).filter(n => n.staff === sid && (n.date || '') >= clockToday(s).slice(0, 8) + '01' && n.date <= clockToday(s));
export function quality(s, sid) {
  const ns = monthNotes(s, sid);
  const ivOf = n => n.interventions || (n.fields && n.fields.interventions) || [];
  const ivs = new Set(ns.flatMap(ivOf));
  return { ivs: ivs.size, ivNotes: ns.filter(n => ivOf(n).length).length, returned: ns.filter(n => ['returned', 'flagged'].includes(n.review)).length, of: ns.length };
}

// Sentences a staffer reuses across notes (drafting rule 13). Initials are normalised so "Redirected J.T. ..." and "Redirected D.P. ..." match.
// Needs the note text: a role without clinical text (administrator) gets null.
const norm = t => t.replace(/\b[A-Z]\.[A-Z]\.?/g, 'X').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
function sentences(t) { return plainText(t).replace(/\b([A-Z])\.([A-Z])\./g, '$1§$2§').split(/(?<=[.!?])\s+/).map(x => x.replace(/§/g, '.').trim()).filter(x => x.split(/\s+/).length >= 7); }
export function repeatedParagraphs(s, staffId) {
  const notes = (s.notes || []).filter(n => n.staff === staffId && textOf(n.dictation)).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);
  const seen = new Map();
  for (const n of notes) for (const sen of new Set(sentences(n.dictation))) {
    const k = norm(sen); if (!seen.has(k)) seen.set(k, { sample: sen, notes: [] });
    const e = seen.get(k); if (!e.notes.includes(n)) e.notes.push(n);
  }
  let best = null;
  for (const e of seen.values()) if (e.notes.length >= 2 && (!best || e.notes.length > best.notes.length)) best = e;
  if (!best) return null;
  const st = M.staff(s, staffId);
  return { staff: staffId, who: staffShort(s, staffId), name: st.name, count: best.notes.length, of: notes.length, sample: best.sample, ids: best.notes.map(n => n.id),
    dates: [...new Set(best.notes.map(n => n.date))].sort().map(d => fmtDate(d)).join(', ') };
}

// ---------------------------------------------------------------------------------------------------------------- scope and review
// Direct support staff the viewer manages: a supervisor's sites plus anyone routed to them; clinicians and administrators: all. Nobody: none.
export function managedStaff(s, actor) {
  if (!actor || !actor.role) return [];
  const ds = (s.staff || []).filter(x => x.role === 'direct_support');
  if (rank(actor.role) >= 3 || actor.sites === 'all') return ds;
  if (actor.role === 'direct_support') return ds.filter(x => x.id === actor.id);
  const sites = [].concat(actor.sites || []);
  return ds.filter(x => x.reviewer === actor.id || [].concat(x.sites || []).some(z => sites.includes(z)));
}
const siteShort = (s, id) => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' ');
export function scopeOf(s, actor) {
  const staff = managedStaff(s, actor);
  if (!actor || !actor.role) return { staff, site: '', long: '' };
  if (rank(actor.role) >= 3 || actor.sites === 'all') return { staff, site: 'all sites', long: 'All sites' };
  const sites = [].concat(actor.sites || []);
  const names = sites.map(id => siteShort(s, id));
  const short = names.length > 1 ? names[0] + ', ' + names.slice(1).map(n => n.split(' ').pop()).join(', ') : names[0] || '';
  return { staff, site: short, long: short };
}

// Whose pending notes an actor reviews (never their own): clinicians all, supervisors the staff routed to them.
// Only notes captured while the staffer was on approval are 'pending', so the queue holds approval-required notes only.
export function pendingFor(s, actor) {
  if (!actor || !can(actor, 'notes.review')) return [];
  const mine = n => { if (n.staff === actor.id) return false; if (actor.role === 'clinician') return true; const st = M.byId(s.staff, n.staff); return !!st && st.reviewer === actor.id; };
  const order = (s.staff || []).map(x => x.id);
  return (s.notes || []).filter(n => n.review === 'pending' && mine(n))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (order.indexOf(a.n.staff) - order.indexOf(b.n.staff)) || (b.n.date || '').localeCompare(a.n.date || '') || a.i - b.i)
    .map(x => x.n);
}
export function decidedToday(s, actor) {
  if (!actor || !can(actor, 'notes.review')) return [];
  const t = clockToday(s);
  return (s.notes || []).filter(n => n.reviewed_at && n.reviewed_at.slice(0, 10) === t && n.review !== 'pending' && (actor.role === 'clinician' || n.reviewed_by === actor.id)).slice(-6).reverse();
}
export const approvalLabel = st => st.review_mode === 'every_note'
  ? 'Approval required · ' + (st.review_reason || (st.credential === 'QMHP-T' ? 'new hire' : 'on review'))
  : 'Spot check · no approval';

// ---------------------------------------------------------------------------------------------------------------- the work list
export function worklist(s, actor) {
  const out = { items: [], today: [], week: [], waiting: [], counts: { today: 0, week: 0, waiting: 0, total: 0, referrals: 0, review: 0, behind: 0 }, hidden: { clinical: false } };
  if (!s || !actor || !actor.role || !can(actor, 'myWork')) return out;
  const t = clockToday(s), nowT = clockNow(s), weekEnd = addDays(t, 7);
  const items = [];
  const cap = c => can(actor, c);
  const isAdmin = actor.role === 'admin';
  out.hidden.clinical = !cap('notes.view');
  const add = it => items.push({ group: 'today', rank: 60, ops: true, ...it, id: it.id || (it.kind + ':' + (it.record || items.length)) });
  const dayLabel = d => { const n = daysBetween(t, d); return n <= 4 ? fmtDate(d, { dow: true }).split(' ')[0] : fmtDate(d); };

  // ---- requests (status, clocks, next action by the stage the person may act on)
  for (const q of s.requests || []) {
    const c = label(s, q.client), p = M.payerShort(s, q.payer), clock = M.requestClock(s, q), typ = M.TYPE_LABEL[q.type] || 'Request';
    const base = { record: q.id, client: q.client };
    const wait = (who, text, verb, to, extra = {}) => add({ ...base, kind: 'wait:' + q.stage, group: 'waiting', rank: clock.sev === 'r' ? 20 : clock.sev === 'y' ? 40 : 60, who, title: text, verb, to: to || caseHref(q.id), chip: { text: clock.text, tone: tone(clock.sev) }, ...extra });
    switch (q.stage) {
      case 'info_requested': {
        const r = rule(s, 'info_request.hours');
        if (cap('payer.reply')) add({ ...base, kind: 'info', rank: 5, urgent: true, when: q.reply_due ? 'by ' + fmtTime(q.reply_due) : 'today', title: `Reply to ${p} · ${c}`, sub: 'Information request', chip: { text: clock.text.replace(' of 24', ''), tone: 'danger' }, verb: 'Send reply', to: 'InfoRequest.dc.html?id=' + q.id, rule: r });
        else wait('Clinician', `${c} · ${p} information request`, 'View', null, { rule: r });
        break;
      }
      case 'overdue':
        if (cap('send.packet')) add({ ...base, kind: 'overdue', rank: 15, urgent: true, when: 'today', title: `${p} decision overdue · ${c}`, sub: 'Overdue notice drafted for a person to send', chip: { text: clock.text, tone: 'danger' }, verb: 'Send notice', to: 'Submission.dc.html?id=' + q.id, rule: rule(s, 'decision.overdue_after_days', q.payer) });
        else wait('Sender', `${c} · ${p} decision overdue`, 'View', null, { rule: rule(s, 'decision.overdue_after_days', q.payer) });
        break;
      case 'partial_decide':
        if (cap('payer.reply')) add({ ...base, kind: 'partial', rank: 40, when: q.reply_by ? 'by ' + fmtDate(q.reply_by) : 'today', title: `Decide on the ${p} offer · ${c}`, sub: `${q.units_offered} of ${q.units_requested} units offered`, chip: { text: clock.text, tone: 'warning' }, verb: 'Decide', to: M.requestHref(q) });
        else wait('Clinician', `${c} · ${p} offered ${q.units_offered} of ${q.units_requested} units`, 'View');
        break;
      case 'draft_ready':
        if (cap('drafts.clinical')) add({ ...base, kind: 'draft', rank: 60, when: 'today', title: q.type === 'continued_stay' ? `Continued stay · ${c}` : `${typ} · ${c}`, sub: q.type === 'continued_stay' ? `Renew by ${fmtDate(q.renew_by || (M.byId(s.clients, q.client) || {}).authorization?.end)}` : clock.text, chip: { text: 'Draft ready', tone: 'neutral' }, verb: 'Review draft', to: M.requestHref(q) });
        else wait('Clinician', `${typ} · ${c} · draft ready`, 'View');
        break;
      case 'needs_approval':
        if (cap('approve.sra')) add({ ...base, kind: 'approve', rank: 25, urgent: true, when: 'today', title: `${typ} · ${c}`, sub: 'Processed in Lauris · approve before Get Signature', chip: { text: 'Pending clinical approval', tone: 'info' }, verb: 'Approve', to: 'ExtSignOff.dc.html?request=' + q.id });
        else wait('Approver', `${typ} · ${c} · pending clinical approval`, 'View');
        break;
      case 'awaiting_signature':
        if (cap('sign.lauris')) add({ ...base, kind: 'sign', rank: 35, when: 'today', title: `${typ} · ${c}`, sub: 'Processed and approved · waiting for a licensed signature', chip: { text: 'Forms to Approve', tone: 'info' }, verb: 'Sign in Lauris', to: 'ExtSignOff.dc.html?request=' + q.id });
        else wait('Clinician', `${typ} · ${c} · awaiting signature`, 'View');
        break;
      case 'signed':
        if (cap('send.packet')) add({ ...base, kind: 'send', rank: 30, when: 'today', title: `${typ} · ${c}`, sub: `Signed · press Send (${M.CHANNEL_LABEL[q.channel] || q.channel})`, chip: { text: 'Signed', tone: 'success' }, verb: 'Send', to: 'Submission.dc.html?id=' + q.id });
        else wait('Sender', `${typ} · ${c} · signed, ready to send`, 'View');
        break;
      case 'sending': case 'portal_open':
        if (cap('send.packet')) add({ ...base, kind: 'sending', rank: 32, when: 'now', title: `${typ} · ${c}`, sub: q.stage === 'sending' ? 'Faxing through Sfax' : `Finish the upload in ${M.CHANNEL_LABEL[q.channel] || q.channel}`, chip: { text: clock.text, tone: tone(clock.sev) }, verb: 'View', to: 'Submission.dc.html?id=' + q.id });
        else wait('Sender', `${typ} · ${c} · ${q.stage === 'sending' ? 'sending' : 'portal upload open'}`, 'View');
        break;
      case 'submitted': {
        const dd = decisionDay(s, q.sent, t, q.payer);
        if (dd && (dd.followup_due || dd.overdue) && cap('send.packet')) {
          add({ ...base, kind: 'followup', rank: dd.overdue ? 18 : 45, urgent: !!dd.overdue, when: 'today', title: `${p} decision · ${c}`, sub: `Sent ${fmtDate(q.sent)}${q.fax_ref ? ' · ' + q.fax_ref : ''}`, chip: { text: clock.text, tone: tone(clock.sev) }, verb: dd.overdue ? 'Send notice' : 'Log the call', to: 'Submission.dc.html?id=' + q.id, rule: rule(s, dd.overdue ? 'decision.overdue_after_days' : 'decision.followup_day', q.payer) });
        }
        wait(p.split(' ')[0], `${c} · decision${dd ? ' · day ' + dd.day : ''}${q.fax_ref ? ' · ' + q.fax_ref : ''}`, 'View', 'Submission.dc.html?id=' + q.id, { rule: dd ? rule(s, 'decision.overdue_after_days', q.payer) : undefined });
        break;
      }
      case 'peer_to_peer_requested':
        if (cap('payer.reply')) add({ ...base, kind: 'p2p', rank: 42, when: 'today', title: `Peer-to-peer requested · ${c}`, sub: `Enter the call date when ${p} calls`, chip: { text: 'Date to be set', tone: 'warning' }, verb: 'Enter date', to: 'PeerBrief.dc.html?id=' + q.id });
        else wait('Clinician', `${c} · peer-to-peer requested`, 'View');
        break;
      case 'peer_to_peer_booked': {
        const d = (q.p2p_at || '').slice(0, 10);
        if (!d) { wait(p.split(' ')[0], `${c} · peer-to-peer date not set`, 'View'); break; }
        if (cap('payer.reply')) {
          if (d < t) add({ ...base, kind: 'p2p', rank: 44, when: fmtDate(d), title: `Peer-to-peer was ${fmtDate(d)} · ${c}`, sub: `${p} · log the outcome`, chip: { text: 'Outcome not logged', tone: 'warning' }, verb: 'Log outcome', to: 'PeerBrief.dc.html?id=' + q.id });
          else if (d === t) add({ ...base, kind: 'p2p', rank: 12, urgent: true, when: fmtTime(q.p2p_at), title: `Peer-to-peer call · ${p} · ${c}`, sub: 'Call notes ready', chip: { text: 'Call today', tone: 'warning' }, verb: 'Call notes', to: 'PeerBrief.dc.html?id=' + q.id });
          else if (d <= weekEnd) add({ ...base, kind: 'p2p', group: 'week', rank: 3, when: dayLabel(d), sortKey: q.p2p_at, title: `Peer-to-peer call · ${p} · ${c}`, sub: 'Call notes ready', verb: 'Call notes', to: 'PeerBrief.dc.html?id=' + q.id });
        }
        wait(p.split(' ')[0], `${c} · peer-to-peer ${fmtDate(d)}`, cap('payer.reply') ? 'Call notes' : 'View', cap('payer.reply') ? 'PeerBrief.dc.html?id=' + q.id : null);
        break;
      }
      case 'p2p_awaiting': wait(p.split(' ')[0], `${c} · peer-to-peer held · waiting for the decision`, 'View'); break;
      case 'denied': wait('Guardian', `${c} · appeal letter · ${clock.text.replace(/ \(.*$/, '').replace('appeal window · ', '')}`, 'View'); break;
      case 'appeal_sent': wait(p.split(' ')[0], `${c} · appeal decision`, 'View'); break;
      default: break;
    }
  }

  // ---- units: low or expiring (status only; the rate is an assumption and says so)
  if (cap('auth.status') && actor.role !== 'direct_support') {
    const rate = ruleValue(s, 'units.rate_per_school_day', 3), lead = ruleValue(s, 'continued_stay.lead_business_days', 14);
    for (const cl of s.clients || []) {
      const a = cl.authorization; if (!a || !a.units || a.exhausted) continue;
      const left = a.units - (a.used || 0); if (left < 0 || a.used == null) continue;
      const days = Math.floor(left / rate);
      if (days > lead) continue;
      const q = (s.requests || []).find(x => x.client === cl.id && x.stage !== 'closed');
      add({ record: q ? q.id : cl.id, client: cl.id, kind: 'units', rank: 55, group: 'today', when: 'today', title: `Units low · ${label(s, cl.id)}`, sub: `${left} of ${a.units} units left · about ${plural(days, 'school day')} at ${rate} a day`, chip: { text: `${days} school day${days === 1 ? '' : 's'} left`, tone: days <= 5 ? 'danger' : 'warning' }, verb: 'Review units', to: caseHref(q ? q.id : ''), rule: rule(s, 'units.rate_per_school_day') });
    }
    for (const cl of s.clients || []) {
      const a = cl.authorization; if (!a || !a.exhausted) continue;
      add({ record: cl.id, client: cl.id, kind: 'units-out', rank: 52, group: 'today', when: 'today', title: `Units used up · ${label(s, cl.id)}`, sub: `${a.used} of ${a.units} units used`, chip: { text: 'No units left', tone: 'danger' }, verb: 'Review units', to: caseHref((s.requests || []).find(x => x.client === cl.id)?.id || '') });
    }
  }

  // ---- the human task "Enter units in Lauris" (Psyflo never writes units into Lauris)
  if (cap('auth.status')) for (const task of (s.lauris_tasks || []).filter(x => x.status === 'open')) {
    add({ record: task.request, client: task.client, kind: 'lauris-units', rank: 38, group: 'today', when: 'today', title: `Enter units in Lauris · ${label(s, task.client)}`, sub: `${task.units} units${task.start ? ' · ' + fmtDate(task.start) : ''}${task.end ? ' to ' + fmtDate(task.end) : ''} · closes when the open page shows them`, chip: { text: 'Human task', tone: 'info' }, verb: 'Open case', to: caseHref(task.request) });
  }

  // ---- referrals, screening calls, eligibility (the referral workspace belongs to the roles that hold the cap)
  if (cap('referrals') || cap('eligibility.run')) {
    for (const sc of (s.screenings || []).filter(x => x.status === 'booked' && x.when && (!x.who || x.who === actor.id || actor.role === 'clinician'))) {
      if (!cap('drafts.clinical')) continue;
      const r = M.byId(s.referrals, sc.referral); const fl = M.familyLinkFor(s, sc.referral); const g = (fl && fl.answers) || {};
      const who = [g.relationship, g.best_time ? String(g.best_time).toLowerCase().replace(/ after.*$/, '') : ''].filter(Boolean).join(', ');
      const title = `Screening call · ${studentOf(s, sc.referral, sc.client)}`;
      const sub = [r ? schoolShort(M.school(s, r.school).name) : '', who].filter(Boolean).join(' · ');
      const to = 'ExtScreening.dc.html?referral=' + sc.referral; const day = sc.when.slice(0, 10);
      const chip = fl && (fl.submitted_at || (fl.steps && fl.steps.guardian)) ? { text: 'Details ready', tone: 'success' } : { text: 'No family link yet', tone: 'warning' };
      const ref = { section: 'referrals', ops: false, record: sc.referral };
      if (day === t) add({ ...ref, kind: 'screening', rank: 20, when: fmtTime(sc.when), title, sub, chip, verb: 'Open screening', to });
      else if (day > t && day <= weekEnd) add({ ...ref, kind: 'screening', group: 'week', rank: 4, when: dayLabel(day), sortKey: sc.when, title, sub: sub + ' · ' + fmtTime(sc.when), verb: 'Open screening', to });
      else if (day < t) add({ ...ref, kind: 'screening', rank: 8, when: fmtDate(day), title, sub: sub + ' · not marked done', chip: { text: 'Past due', tone: 'danger' }, verb: 'Open screening', to });
    }
    for (const el of (s.eligibility || [])) {
      const r = M.byId(s.referrals, el.referral); const st = studentOf(s, el.referral, el.client);
      const ref = { section: 'referrals', ops: false, record: el.referral };
      const to = 'Eligibility.dc.html?referral=' + el.referral;
      if (!cap('eligibility.run')) continue;
      if (el.status === 'details_received') add({ ...ref, kind: 'eligibility', rank: 36, when: 'today', title: `Run the eligibility check · ${st}`, sub: `Family link submitted ${fmtDate((el.details_at || '').slice(0, 10))}`, chip: { text: 'Details received', tone: 'warning' }, verb: 'Run the check', to });
      else if (el.status === 'recorded' && el.result === 'active' && r && r.stage === 'needs_screening' && !(s.screenings || []).some(x => x.referral === el.referral && x.status === 'booked') && cap('referrals')) add({ ...ref, kind: 'eligibility', rank: 37, when: 'today', title: `Schedule the screening call · ${st}`, sub: `Medicaid ${r.eligibility || 'active'}`, chip: { text: 'Eligibility active', tone: 'success' }, verb: 'Schedule', to: 'Referral.dc.html?id=' + el.referral + '&sched=1' });
      else if (el.status === 'recorded' && el.result !== 'active' && r && r.stage === 'needs_screening') add({ ...ref, kind: 'eligibility', rank: 37, when: 'today', title: `Medicaid not active · ${st}`, sub: 'Route to the grant program or hold', chip: { text: 'Not active', tone: 'danger' }, verb: 'Decide', to });
      if (el.status === 'recorded' && el.next_check) {
        const d = el.next_check; const title = `Eligibility re-check · ${st.split(',')[0]}`;
        if (d <= t) add({ ...ref, kind: 'recheck', rank: 70, when: d < t ? fmtDate(d) : 'today', title, sub: 'DMAS portal · a person runs the lookup', chip: { text: d < t ? 'Overdue' : 'Due today', tone: d < t ? 'danger' : 'warning' }, verb: 'Run the check', to, rule: rule(s, 'eligibility.recheck_days') });
        else if (d <= weekEnd) add({ ...ref, kind: 'recheck', group: 'week', rank: 5, when: dayLabel(d), sortKey: d, title, sub: 'DMAS portal', verb: 'Run the check', to });
      }
    }
  }
  if (cap('referrals')) {
    for (const r of s.referrals || []) {
      if (['draft', 'grant_program', 'declined'].includes(r.stage) || r.history) continue;
      const started = ['in_intake', 'in_service'].includes(r.stage);
      const st = studentOf(s, r.id); const fl = M.familyLinkFor(s, r.id);
      const booked = (s.screenings || []).some(x => x.referral === r.id && x.status === 'booked');
      const to = 'Referral.dc.html?id=' + r.id; const ref = { section: 'referrals', ops: false, record: r.id };
      if (r.hold) { add({ ...ref, kind: 'ref-hold', group: 'waiting', who: 'Guardian', title: `${r.id} · on hold · ${r.hold.why}`, verb: 'Open referral', to }); continue; }
      if (!started && r.stage === 'needs_screening' && !booked && !(fl && fl.sent_at) && !M.eligibilityFor(s, r.id)) add({ ...ref, kind: 'referral', rank: 62, when: 'today', title: `New referral · ${st}`, sub: [schoolShort(M.school(s, r.school).name), r.next || 'Send the family link'].filter(Boolean).join(' · '), chip: { text: 'New', tone: 'warning' }, verb: 'Review referral', to });
      if (!started && fl && fl.sent_at && !fl.submitted_at) add({ ...ref, kind: 'ref-link', group: 'waiting', who: 'Guardian', title: `${st.split(',')[0]} · family link ${fl.opened_at ? 'opened, not submitted' : 'sent ' + fmtDate(fl.sent_at.slice(0, 10)) + ', not opened'}`, verb: 'Open referral', to, rule: rule(s, 'family_link.expires_days') });
      if (r.stage === 'waiting_on_school') add({ ...ref, kind: 'ref-school', group: 'waiting', who: 'School', title: `${r.id} · ${r.next || 'waiting on the school'}`, verb: 'Open referral', to });
      else {
        const miss = Object.entries((r.form && r.form.attachments) || {}).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' '));
        if (miss.length) add({ ...ref, kind: 'ref-school', group: 'waiting', who: 'School', title: `${r.id} · ${miss.join(', ')} missing`, verb: 'Open referral', to });
      }
    }
    for (const pt of (s.portal_tasks || []).filter(x => x.status === 'waiting')) add({ kind: 'portal', record: pt.client, ops: false, group: 'waiting', who: 'Guardian', title: `${label(s, pt.client)} · ${String(pt.form).toLowerCase()} · family portal`, verb: 'View', to: 'ParentPortal.dc.html' });
  }

  // ---- reminders (a person's own; clinicians see all in the demo roster)
  for (const rm of (s.reminders || []).filter(x => !x.done && x.due && x.kind !== 'screening_call' && x.kind !== 'eligibility_recheck' && (!x.for || x.for === actor.id || actor.role === 'clinician'))) {
    const d = rm.due.slice(0, 10);
    if (d <= t) add({ kind: 'reminder', record: rm.id, ops: false, rank: 72, when: d < t ? fmtDate(d) : 'today', title: rm.text, chip: { text: d < t ? 'Overdue' : 'Due today', tone: d < t ? 'danger' : 'warning' }, verb: REMINDER_VERB[rm.kind] || rm.btn || 'Open', to: rm.href || '', reminder: rm.id });
    else if (d <= weekEnd) add({ kind: 'reminder', record: rm.id, ops: false, group: 'week', rank: 6, when: dayLabel(d), sortKey: d, title: rm.text, verb: REMINDER_VERB[rm.kind] || rm.btn || 'Open', to: rm.href || '', reminder: rm.id });
  }

  // ---- notes: what is waiting for this person's review and who is behind (counts only; the text lives in Review and Team)
  if (cap('notes.review')) {
    const n = pendingFor(s, actor).length; out.counts.review = n;
    if (n) add({ kind: 'review', record: 'review', ops: false, rank: 28, when: 'today', title: `${plural(n, 'note')} waiting for your approval`, sub: 'Staff on approval: every note waits here before it goes to the EHR', chip: { text: String(n), tone: 'warning' }, verb: 'Review notes', to: 'MyWork.dc.html?section=review', section: 'review' });
  }
  if (actor.role !== 'direct_support') {
    let behind = 0, staff = 0;
    for (const st of managedStaff(s, actor)) { const b = noteTimeliness(s, st.id).behind.length; if (b) { behind += b; staff++; } }
    out.counts.behind = behind;
    if (behind) add({ kind: 'team-behind', record: 'team', ops: true, rank: 48, when: 'today', title: `${plural(behind, 'note')} behind · ${plural(staff, 'person', 'people')}`, sub: `Counted from notes the extension reported at Process Form · due ${ruleValue(s, 'notes.daily_due_hours', 24)} h after the session`, chip: { text: 'Team compliance', tone: 'danger' }, verb: 'See who', to: 'MyWork.dc.html?section=team', rule: rule(s, 'notes.daily_due_hours') });
  }

  // ---- second-person confirmations: a designation or a role raise proposed by someone else (an administrator or a clinician confirms)
  if (actor.role === 'admin' || actor.role === 'clinician') {
    const capName = c => String(CAP_NOTE[c] || c).replace(/ \(.*\)$/, '');
    for (const d of (s.designations || []).filter(x => x.status === 'pending' && x.by !== actor.id)) {
      const u = M.byId(s.staff, d.user);
      add({ record: d.id, kind: 'confirm-designation', rank: 10, when: 'today', title: `Confirm access · ${u ? u.name : d.user}`, sub: `${d.grant ? 'Grant' : 'Remove'} "${capName(d.cap)}" · proposed by ${staffShort(s, d.by)} · ${d.reason}`, chip: { text: 'Second person needed', tone: 'info' }, verb: 'Review', action: { type: 'confirm', kind: 'designation', id: d.id } });
    }
    for (const rc of (s.role_changes || []).filter(x => x.status === 'pending' && x.by !== actor.id)) {
      const u = M.byId(s.staff, rc.user);
      add({ record: rc.id, kind: 'confirm-role', rank: 10, when: 'today', title: `Confirm role · ${u ? u.name : rc.user}`, sub: `${rc.from.replace('_', ' ')} to ${rc.to.replace('_', ' ')} · proposed by ${staffShort(s, rc.by)} · ${rc.reason}`, chip: { text: 'Second person needed', tone: 'info' }, verb: 'Review', action: { type: 'confirm', kind: 'role', id: rc.id } });
    }
  }

  // ---- sort, group, count
  const cmp = (a, b) => (a.rank - b.rank) || String(a.sortKey || '').localeCompare(String(b.sortKey || '')) || String(a.title).localeCompare(String(b.title));
  items.sort(cmp);
  // a clinician's own list only shows what they can act on today; admins see operations only
  const mine = items.filter(i => !isAdmin || i.ops);
  out.items = mine;
  out.today = mine.filter(i => i.group === 'today');
  out.week = mine.filter(i => i.group === 'week').sort((a, b) => String(a.sortKey || '').localeCompare(String(b.sortKey || '')));
  out.waiting = mine.filter(i => i.group === 'waiting');
  out.counts.today = out.today.length; out.counts.week = out.week.length; out.counts.waiting = out.waiting.length; out.counts.total = mine.length;
  out.counts.referrals = mine.filter(i => i.section === 'referrals' && i.group === 'today').length;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- one staffer's day
const minsOf = b => { const [h1, m1] = b[0].split(':').map(Number), [h2, m2] = b[1].split(':').map(Number); return (h2 * 60 + m2) - (h1 * 60 + m1); };
const fmtMin = m => `${Math.floor(m / 60) ? Math.floor(m / 60) + ' h ' : ''}${m % 60} min`;
const dueLabel = (at, t) => at.slice(0, 10) === t ? 'today ' + fmtTime(at) : at.slice(0, 10) === M.addDays(t, 1) ? 'tomorrow ' + fmtTime(at) : fmtDate(at, { dow: true }) + (at.slice(11, 16) === '23:59' ? '' : ' ' + fmtTime(at));

// May the actor see this staffer's day? Direct support only their own; others within their scope.
export function canSeeDay(s, actor, sid) {
  if (!actor || !actor.role || !sid) return false;
  if (actor.role === 'direct_support') return actor.id === sid;
  return managedStaff(s, actor).some(x => x.id === sid);
}
export function viewedStaff(s, actor, wanted) {
  if (!actor || !actor.role) return null;
  if (actor.role === 'direct_support') return actor.id;
  const inScope = managedStaff(s, actor);
  if (wanted && inScope.some(x => x.id === wanted)) return wanted;
  const first = inScope.find(x => M.notesToday(s, x.id).total) || inScope[0];
  return first ? first.id : null;                      // nobody in scope: no staffer (never a default user)
}

export function dayView(s, actor, sid) {
  if (!s || !canSeeDay(s, actor, sid)) return null;
  const t = clockToday(s), conf = ((s.staff_dashboard || {}).staff || {})[sid] || {}, d = s.staff_dashboard || {};
  const st = M.staff(s, sid); const nt = M.notesToday(s, sid); const tl = noteTimeliness(s, sid);
  const lbl = c => shortLabel(s, c.id);
  const friday = M.addDays(monday(t), 4), monthEnd = monthEndOf(t);
  const openDaily = nt.students.filter(c => !nt.doneSet.has(c.id));
  const dueOf = type => tl.due.filter(x => x.type === type);
  const wkMissing = dueOf('weekly_guardian').map(x => x.c), moMissing = dueOf('monthly_collateral').map(x => x.c);
  const have = new Set((s.assessments || []).map(x => x.client + '|' + String(x.instrument || '').toLowerCase()));
  const assessDue = (d.assessments_due || []).filter(a => a.staff === sid && ![...have].some(k => k.startsWith(a.client + '|') && k.includes(a.instrument.toLowerCase().split(' ')[0])));
  const rel = c => ((c.guardian && c.guardian.relationship) || 'guardian');
  const fri = fmtDate(friday, { dow: true }).startsWith('Fri') ? 'Friday' : fmtDate(friday);
  const timer = (s.timers || {})[sid];
  const hours = tl.hours;

  const behind = tl.behind.map(b => b.type === 'daily'
    ? { kind: 'daily', title: `Daily note · ${lbl(b.c)}`, text: `${fmtDate(b.date, { dow: true })} session · ${b.hours} h since, was due ${dueLabel(b.dueAt, t)}`, verb: 'Write note', to: 'ExtDPN.dc.html?client=' + b.c.id, tone: 'danger' }
    : b.type === 'weekly_guardian'
      ? { kind: 'weekly', title: `Weekly guardian call · ${lbl(b.c)}`, text: `Week of ${fmtDate(b.date)} · was due ${fmtDate(b.dueAt, { dow: true })}`, verb: 'Write call note', to: 'ExtWeekly.dc.html?client=' + b.c.id, tone: 'danger' }
      : { kind: 'monthly', title: `Monthly collateral · ${lbl(b.c)}`, text: `${fmtDate(b.date).split(' ')[0]} · was due ${fmtDate(b.dueAt)}`, verb: 'Write note', to: 'ExtMonthly.dc.html?client=' + b.c.id, tone: 'danger' });
  const due = [];
  for (const c of openDaily) {
    const w = M.waitingDictations(s, c.id).filter(x => x.staff === sid || !x.staff);
    let tracked = 0, running = '';
    if (timer && timer.client === c.id) { tracked = (timer.blocks || []).reduce((a, b) => a + Math.max(0, minsOf(b)), 0); if (timer.started) running = fmtTime(timer.started); }
    const tt = tracked ? `${fmtMin(tracked)} tracked${running ? ', timer running since ' + running : ''}` : running ? `timer running since ${running}` : 'no time tracked in Psyflo yet';
    const dd = tl.due.find(x => x.type === 'daily' && x.c.id === c.id && x.date === t);
    due.push({ kind: 'daily', title: `Daily note · ${lbl(c)}`, text: `${tt}${w.length ? ` · ${plural(w.length, 'dictation')} waiting` : ''}${dd ? ` · due ${dueLabel(dd.dueAt, t)}` : ''}`, verb: 'Write note', to: w.length ? 'ExtDPN.dc.html?client=' + c.id : 'MobileApp.dc.html', tone: 'neutral', rule: rule(s, 'notes.daily_due_hours'), chip: w.length ? 'Dictation waiting' : '' });
  }
  for (const x of tl.due.filter(x => x.type === 'daily' && x.date < t)) due.push({ kind: 'daily', title: `Daily note · ${lbl(x.c)} ${fmtDate(x.date)}`, text: `due ${dueLabel(x.dueAt, t)}`, verb: 'Write note', to: 'ExtDPN.dc.html?client=' + x.c.id, tone: 'warning' });
  for (const c of wkMissing) { const last = (s.notes || []).filter(n => n.client === c.id && n.type === 'weekly_guardian').map(n => n.date).sort().pop(); due.push({ kind: 'weekly', title: `Weekly call · ${lbl(c)}'s ${rel(c)}`, text: `due ${fri}${last ? ' · last call ' + fmtDate(last) : ''}`, verb: 'Write call note', to: 'ExtWeekly.dc.html?client=' + c.id, tone: 'neutral', rule: rule(s, 'notes.weekly_guardian_due') }); }
  for (const c of moMissing) due.push({ kind: 'monthly', title: `Monthly collateral · ${lbl(c)}`, text: `${(d.collateral_who || {})[c.id] || 'collateral contact'} · due ${fmtDate(monthEnd)}`, verb: 'Write note', to: 'ExtMonthly.dc.html?client=' + c.id, tone: 'neutral', rule: rule(s, 'notes.monthly_collateral_due') });
  for (const a of assessDue) due.push({ kind: 'assess', title: `${a.instrument} · ${shortLabel(s, a.client)}`, text: a.note || 'due this week', verb: 'Ask on the phone', to: 'MobileAssess.dc.html?client=' + a.client, tone: 'neutral' });
  const fixes = [];
  for (const r of conf.rejected || []) fixes.push({ kind: 'rejected', title: `Rejected in Lauris · ${r.form}, ${shortLabel(s, r.client)} ${fmtDate(r.date)}`, text: `Reviewer note: ${r.why}`, verb: 'Fix it', to: r.href, tone: 'danger', provenance: 'harvest_export' });
  for (const n of (s.notes || []).filter(n => n.staff === sid && ['returned', 'flagged'].includes(n.review))) {
    fixes.push({ kind: 'returned', title: `${n.review === 'flagged' ? 'Flagged "didn\'t happen"' : 'Returned'} · ${shortLabel(s, n.client)} ${fmtDate(n.date)}`, text: `${n.reviewed_by ? 'By ' + staffShort(s, n.reviewed_by) : 'By a reviewer'}${n.review_comment ? ': "' + n.review_comment + '"' : ''}`, verb: 'Fix note', to: 'ExtDPN.dc.html?client=' + n.client, tone: 'danger' });
  }
  const lines = behindLines(s, tl);
  const q = quality(s, sid); const pend = (s.notes || []).filter(n => n.staff === sid && n.review === 'pending').length;
  const reviewerName = st.reviewer ? staffShort(s, st.reviewer) : 'a supervisor';
  const total = nt.total;
  const next = behind[0] || fixes[0] || due[0] || null;
  return {
    sid, name: st.name, short: staffShort(s, sid), self: actor.id === sid, credential: st.credential || '',
    progress: { done: nt.done, total, text: total ? `${nt.done} of ${total} daily notes in` : 'No students on this caseload yet', open: openDaily.map(lbl) },
    next, behind, behindHead: lines.length ? lines.map(l => l.head).join(' · ') : '', due, fixes,
    late: tl.late.map(x => `${shortLabel(s, x.c.id)} ${fmtDate(x.date)}${x.hours ? ` (${x.hours} h after the session)` : ''}`),
    quality: [
      ['On time', tl.rate != null ? `${tl.rate}% · ${tl.onTime} of ${tl.counted} notes this month` : '—'],
      ['Interventions used', q.ivs ? `${q.ivs} different ones across ${plural(q.ivNotes, 'note')} this month` : 'None recorded on the notes Psyflo saw this month'],
      ['Notes returned', `${q.returned} of ${q.of} this month${pend ? ` · ${pend} waiting for ${reviewerName}'s approval` : ''}`],
      ['Approval', st.review_mode === 'every_note' ? `Every note approved by ${reviewerName} before it goes to the EHR` : 'Not required · spot check']
    ],
    exportRate: conf.in_24h != null ? conf.in_24h : null,
    goals: (conf.goals || []).map(g => ({ t: g[0], d: g[1], pct: Math.max(0, Math.min(100, g[2])) })),
    flags: conf.flags || [], onTimeRate: tl.rate, hours, source: d.source || '', provenance: d.provenance || ''
  };
}

// ---------------------------------------------------------------------------------------------------------------- team
export function teamView(s, actor) {
  if (!s || !actor || !actor.role || actor.role === 'direct_support') return null;
  const d = s.staff_dashboard || { staff: {}, patterns: [] };
  const sc = scopeOf(s, actor);
  let students = 0, behindTotal = 0, waiting = 0, onApproval = 0;
  const rows = [];
  for (const st of sc.staff) {
    const conf = (d.staff || {})[st.id] || {};
    const nt = M.notesToday(s, st.id), tl = noteTimeliness(s, st.id);
    const kids = Math.max(nt.total, conf.students || 0);
    const done = nt.done + (kids > nt.total ? (conf.other_done || 0) : 0);
    const pend = (s.notes || []).filter(n => n.staff === st.id && n.review === 'pending').length;
    const lines = behindLines(s, tl); const rep = repeatedParagraphs(s, st.id);
    const onRate = tl.rate != null ? tl.rate : conf.in_24h != null ? conf.in_24h : null;
    const flags = (conf.status ? [conf.status] : []).concat(conf.flags || [], rep && rep.count >= 3 ? [`Same words in ${rep.count} notes`] : []);
    students += kids; behindTotal += tl.behind.length; waiting += pend; if (st.review_mode === 'every_note') onApproval++;
    rows.push({
      id: st.id, name: staffShort(s, st.id), full: st.name, credential: st.credential || '', students: kids,
      daily: kids ? `${done} of ${kids}` : '—', dailyDone: done, dailyOf: kids,
      onTime: tl.rate != null ? tl.rate + '%' : conf.in_24h != null ? conf.in_24h + '% (sample)' : '—', onTimeBad: onRate != null && onRate < 75, onTimeSample: tl.rate == null && conf.in_24h != null,
      behind: tl.behind.length, behindText: lines.length ? lines.map(l => `${l.head} · ${l.who}`).join('; ') : (nt.total ? 'Nothing behind' : 'No caseload in Psyflo yet'),
      mode: approvalLabel(st), onApproval: st.review_mode === 'every_note', reviewer: st.reviewer ? staffShort(s, st.reviewer) : '', pending: pend,
      flags, chipFlags: conf.chip_flags || [], status: conf.status || ''
    });
  }
  const patterns = [];
  for (const st of sc.staff) {
    const rep = repeatedParagraphs(s, st.id);
    if (rep && rep.count >= 3) patterns.push({ who: rep.who, text: `${rep.count} of ${rep.name}'s last ${rep.of} notes share a paragraph ("${rep.sample}", ${rep.dates}); worth a conversation.` });
  }
  for (const p of d.patterns || []) if (sc.staff.some(st => String(p.who).startsWith(staffShort(s, st.id)))) patterns.push({ who: p.who, text: p.text, sample: true });
  return { scope: sc, rows, students, behind: behindTotal, waiting, onApproval, patterns, source: d.source || '', provenance: d.provenance || '', hours: ruleValue(s, 'notes.daily_due_hours', 24), canText: can(actor, 'notes.view') };
}

// ---------------------------------------------------------------------------------------------------------------- review
export function reviewQueue(s, actor) {
  if (!s || !actor || !can(actor, 'notes.review')) return { allowed: false, pending: [], done: [] };
  return { allowed: true, pending: pendingFor(s, actor), done: decidedToday(s, actor) };
}

// counts shown on the section tabs (only when greater than zero)
export function tabCounts(s, actor) {
  const w = worklist(s, actor);
  return { todo: w.counts.today, review: w.counts.review, team: w.counts.behind, referrals: w.counts.referrals };
}
