// 28 · Staff dashboard (Seeded + Live). The point of the screen is on-time notes: daily notes are due
// within 24 h of the session, the weekly guardian call by the end of that week, the monthly collateral by
// month end. "Notes behind" and the on-time rate are counted from state.notes (what the extension reports
// at Process Form), so Flow B moves "Daily notes today" 4 of 6 → 5 of 6 when M.R.'s daily is processed.
// Time-in-Lauris figures and rejected forms come from Harvest's Lauris export (seeded in staff_dashboard).
// Who sees what: direct support sees only their own view (no toggle, no other staff); a supervisor sees
// the staff at their sites (and anyone routed to them); clinician and admin see everyone.
import { register, Screen, M } from '../app.js';
import { isSchoolDay, hoursBetween } from '../shared/dates.js';
import { repeatedParagraphs } from './ReviewQueue.js';

const LV = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
const and = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const siteShort = (s, id) => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' ');
const minsOf = b => { const [h1, m1] = b[0].split(':').map(Number), [h2, m2] = b[1].split(':').map(Number); return (h2 * 60 + m2) - (h1 * 60 + m1); };
const fmtMin = m => `${Math.floor(m / 60) ? Math.floor(m / 60) + ' h ' : ''}${m % 60} min`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function monday(d) { const w = M.parse(d).getUTCDay(); return M.addDays(d, -((w + 6) % 7)); }
const monthEndOf = d => M.addDays(M.addDays(d.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1);
const SESSION_END = '15:30'; // dismissal; a session with no Psyflo timer is taken to end then
const dueLabel = (at, today) => at.slice(0, 10) === today ? 'today ' + M.fmtTime(at) : at.slice(0, 10) === M.addDays(today, 1) ? 'tomorrow ' + M.fmtTime(at) : M.fmtDate(at, { dow: true }) + (at.slice(11, 16) === '23:59' ? '' : ' ' + M.fmtTime(at));

// On-time tracking for one staffer, from the notes the extension reported at Process Form.
// Rules: daily note due within 24 h of the session; weekly guardian call due by the end of that week
// (Friday); monthly collateral due by month end. A student is tracked from the first note of that kind
// Psyflo saw (dailies: looking back over this week), and every student on the caseload is expected today.
export function noteTimeliness(s, sid) {
  const today = s.today, nowT = M.now(s), monthStart = today.slice(0, 8) + '01';
  const kids = s.clients.filter(c => c.staff === sid && c.stage !== 'discharged');
  const mine = s.notes.filter(n => n.staff === sid);
  const timer = s.timers?.[sid];
  const endOf = (cid, d) => (timer && timer.client === cid && d === today && timer.blocks?.length ? timer.blocks[timer.blocks.length - 1][1] : SESSION_END);
  const behind = [], due = [], late = [];
  let onTime = 0, counted = 0;
  const tally = (d, ok) => { if (d >= monthStart) { counted++; if (ok) onTime++; } };
  for (const c of kids) {
    const of = type => mine.filter(n => n.client === c.id && n.type === type);
    // daily · 24 h from the session
    const dn = of('daily'); const byDate = new Map(dn.map(n => [n.date, n]));
    let start = dn.map(n => n.date).sort()[0] || today;
    if (start < monday(today)) start = monday(today);
    for (let d = start; d <= today; d = M.addDays(d, 1)) {
      if (!isSchoolDay(d)) continue;
      const end = d + 'T' + endOf(c.id, d), dueAt = M.addDays(d, 1) + 'T' + endOf(c.id, d), n = byDate.get(d);
      if (n) { const ok = !n.processed_at || n.processed_at <= dueAt; tally(d, ok); if (!ok) late.push({ type: 'daily', c, date: d, hours: Math.round(hoursBetween(end, n.processed_at)) }); }
      else if (nowT > dueAt) { tally(d, false); behind.push({ type: 'daily', c, date: d, dueAt, hours: Math.floor(hoursBetween(end, nowT)) }); }
      else due.push({ type: 'daily', c, date: d, dueAt });
    }
    // weekly guardian call · by the end of that week; monthly collateral · by month end
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
  return { kids, behind, due, late, onTime, counted, rate: counted ? Math.round(100 * onTime / counted) : null };
}

// "2 daily notes past 24 h · J.T. Tue Oct 27, D.P. Mon Oct 26" — one line per kind of note
export function behindLines(s, t) {
  const lbl = c => M.clientLabel(s, c.id, false);
  const out = [];
  const daily = t.behind.filter(b => b.type === 'daily');
  if (daily.length) out.push({ head: `${plural(daily.length, 'daily note')} past 24 h`, who: daily.map(b => `${lbl(b.c)} ${M.fmtDate(b.date, { dow: true })}`).join(', ') });
  const wk = t.behind.filter(b => b.type === 'weekly_guardian');
  if (wk.length) out.push({ head: `${plural(wk.length, 'weekly guardian call')} missed`, who: wk.map(b => `${lbl(b.c)} week of ${M.fmtDate(b.date)}`).join(', ') });
  const mo = t.behind.filter(b => b.type === 'monthly_collateral');
  if (mo.length) out.push({ head: `${plural(mo.length, 'monthly collateral')} missed`, who: mo.map(b => `${lbl(b.c)} ${M.fmtDate(b.date).split(' ')[0]}`).join(', ') });
  return out;
}

const notesThisMonth = (s, sid) => s.notes.filter(n => n.staff === sid && (n.date || '') >= s.today.slice(0, 8) + '01' && n.date <= s.today);
function quality(s, sid) {
  const ns = notesThisMonth(s, sid);
  const ivs = new Set(ns.flatMap(n => n.interventions || n.fields?.interventions || []));
  const returned = ns.filter(n => ['returned', 'flagged'].includes(n.review)).length;
  return { ivs: ivs.size, ivNotes: ns.filter(n => (n.interventions || n.fields?.interventions || []).length).length, returned, of: ns.length };
}

register('StaffDashboard', class extends Screen {
  init() {
    const ds = this.me?.role === 'direct_support';
    this.state = { v: ds ? 'me' : (this.params.staff || this.params.v === 'me' ? 'me' : 'sup') };
  }
  get dash() { return this.s.staff_dashboard || { staff: {}, assessments_due: [], patterns: [], collateral_who: {} }; }
  viewedStaff() {
    if (this.me?.role === 'direct_support') return this.me.id;
    const inScope = this.scope().staff;
    if (this.params.staff && inScope.some(x => x.id === this.params.staff)) return this.params.staff;
    return (inScope.find(x => M.notesToday(this.s, x.id).total) || inScope[0] || { id: 'khale' }).id;
  }
  scope() {
    const s = this.s, me = this.me;
    const ds = s.staff.filter(x => x.role === 'direct_support');
    if (!me || me.sites === 'all' || LV[me.role] >= 3) return { staff: ds, site: 'all sites', long: 'All sites' };
    if (me.role === 'direct_support') return { staff: ds.filter(x => x.id === me.id), site: '', long: '' };
    const sites = [].concat(me.sites || []);
    const list = ds.filter(x => x.reviewer === me.id || [].concat(x.sites || []).some(z => sites.includes(z)));
    const names = sites.map(id => siteShort(s, id));
    const short = names.length > 1 ? names[0] + ', ' + names.slice(1).map(n => n.split(' ').pop()).join(', ') : names[0] || '';
    const long = sites.map(id => M.school(s, id).name.replace(' · ', ' '));
    return { staff: list, site: short, long: long.length > 1 ? long[0] + ', ' + long.slice(1).map(n => n.split(' ').pop()).join(', ') : long[0] || '' };
  }
  myView(sid) {
    const s = this.s, d = this.dash, conf = d.staff?.[sid] || {};
    const st = M.staff(s, sid);
    const nt = M.notesToday(s, sid);
    const tl = noteTimeliness(s, sid);
    const kids = nt.students;
    const lbl = c => M.clientLabel(s, c.id, false);
    const friday = M.addDays(monday(s.today), 4);
    const monthEnd = monthEndOf(s.today);
    const openDaily = kids.filter(c => !nt.doneSet.has(c.id));
    const dueOf = type => tl.due.filter(x => x.type === type);
    const wkMissing = dueOf('weekly_guardian').map(x => x.c);
    const moMissing = dueOf('monthly_collateral').map(x => x.c);
    const dueIds = new Set(s.assessments.map(x => x.client + '|' + String(x.instrument || '').toLowerCase()));
    const due = (d.assessments_due || []).filter(a => a.staff === sid && ![...dueIds].some(k => k.startsWith(a.client + '|') && k.includes(a.instrument.toLowerCase().split(' ')[0])));
    const rejected = conf.rejected || [];
    const rel = c => (c.guardian?.relationship || 'guardian');
    const fri = M.fmtDate(friday, { dow: true }).startsWith('Fri') ? 'Friday' : M.fmtDate(friday);
    const todayDue = openDaily.length ? (tl.due.find(x => x.type === 'daily' && x.date === s.today) || {}).dueAt : null;
    const k = {
      daily: nt.done, dailyOf: nt.total,
      dailySub: nt.total === 0 ? 'no students on the caseload in the demo seed' : openDaily.length ? `${and(openDaily.map(lbl))} still open · due by ${todayDue ? dueLabel(todayDue, s.today) : 'tomorrow'}` : 'all in · each is due within 24 h of the session',
      onTime: tl.rate != null ? tl.rate + '%' : '—',
      onTimeSub: tl.counted ? `${tl.onTime} of ${tl.counted} notes this month in by their deadline${conf.in_24h != null ? ` · Lauris export ${conf.in_24h}%` : ''}` : (conf.in_24h != null ? `Lauris export ${conf.in_24h}% · none counted in Psyflo yet` : 'nothing due yet'),
      onTimeBad: tl.rate != null && tl.rate < 80,
      weekly: kids.length - wkMissing.length,
      weeklySub: wkMissing.length ? wkMissing.map(c => `${lbl(c)}'s ${rel(c)} by ${fri}`).join(' · ') : 'all made this week',
      monthly: kids.length - moMissing.length,
      monthlySub: moMissing.length ? `${and(moMissing.map(lbl))} by ${M.fmtDate(monthEnd)}` : 'all made this month',
      assess: due.length, assessSub: due.length ? due.map(a => `${a.instrument} for ${M.clientLabel(s, a.client, false)}`).join(' · ') : 'none due',
      rejected: rejected.length, rejectedSub: rejected.length ? 'from Lauris · fix shown below' : 'none in Lauris\'s rejected-forms list'
    };
    // notes behind: past their deadline and still not in
    const behind = tl.behind.map(b => b.type === 'daily'
      ? { what: 'Daily note', text: `${lbl(b.c)} · ${M.fmtDate(b.date, { dow: true })} session · ${b.hours} h since the session, due ${dueLabel(b.dueAt, s.today)}`, href: 'ExtDPN.dc.html?client=' + b.c.id, link: 'Write it in Lauris' }
      : b.type === 'weekly_guardian'
        ? { what: 'Weekly guardian call', text: `${lbl(b.c)} · week of ${M.fmtDate(b.date)} · was due ${M.fmtDate(b.dueAt, { dow: true })}`, href: 'ExtWeekly.dc.html?client=' + b.c.id, link: 'Open in Lauris' }
        : { what: 'Monthly collateral', text: `${lbl(b.c)} · ${M.fmtDate(b.date).split(' ')[0]} · was due ${M.fmtDate(b.dueAt)}`, href: 'ExtMonthly.dc.html?client=' + b.c.id, link: 'Open in Lauris' });
    const lines = behindLines(s, tl);
    const lateTxt = tl.late.length ? `Came in late this month: ${tl.late.map(x => `${lbl(x.c)} ${M.fmtDate(x.date)}${x.hours ? ` (${x.hours} h after the session)` : ''}`).join(', ')}.` : '';

    const open = [];
    const timer = s.timers?.[sid];
    for (const c of openDaily) {
      const w = M.waitingDictations(s, c.id).filter(x => x.staff === sid || !x.staff);
      let tracked = 0, running = '';
      if (timer && timer.client === c.id) { tracked = (timer.blocks || []).reduce((a, b) => a + Math.max(0, minsOf(b)), 0); if (timer.started) running = M.fmtTime(timer.started); }
      const t = tracked ? `${fmtMin(tracked)} tracked today${running ? ', timer running since ' + running : ''}` : running ? `timer running since ${running}` : 'no time tracked in Psyflo yet';
      const dd = tl.due.find(x => x.type === 'daily' && x.c.id === c.id && x.date === s.today);
      const by = dd ? ` Due by ${dueLabel(dd.dueAt, s.today)} (24 h).` : '';
      if (w.length) open.push({ title: 'Daily note · ' + lbl(c), text: `${t}; the ${M.fmtTime(w[0].at)} dictation is waiting in your Lauris panel.${by}`, href: 'ExtDPN.dc.html?client=' + c.id, link: 'Open in Lauris' });
      else open.push({ title: 'Daily note · ' + lbl(c), text: `${t}; nothing dictated yet.${by}`, href: 'MobileApp.dc.html', link: 'Dictate on the phone' });
    }
    for (const x of tl.due.filter(x => x.type === 'daily' && x.date < s.today)) open.push({ title: `Daily note · ${lbl(x.c)} ${M.fmtDate(x.date)}`, text: `due by ${dueLabel(x.dueAt, s.today)} (24 h from the session).`, href: 'ExtDPN.dc.html?client=' + x.c.id, link: 'Open in Lauris' });
    for (const c of wkMissing) {
      const last = s.notes.filter(n => n.client === c.id && n.type === 'weekly_guardian').map(n => n.date).sort().pop();
      open.push({ title: `Weekly call · ${lbl(c)}'s ${rel(c)}`, text: `due ${fri}${last ? '; last call ' + M.fmtDate(last) : ''}.`, href: 'ExtWeekly.dc.html?client=' + c.id, link: 'Open in Lauris' });
    }
    for (const c of moMissing) open.push({ title: `Monthly collateral · ${lbl(c)}'s ${(d.collateral_who || {})[c.id] || 'collateral contact'}`, text: `due ${M.fmtDate(monthEnd)}; release on file.`, href: 'ExtMonthly.dc.html?client=' + c.id, link: 'Open in Lauris' });
    for (const a of due) open.push({ title: `${a.instrument} · ${M.clientLabel(s, a.client, false)}`, text: a.note || 'due this week.', href: 'MobileAssess.dc.html?client=' + a.client, link: 'Ask on the phone' });
    for (const r of rejected) open.push({ title: `Rejected in Lauris · ${r.form} ${M.fmtDate(r.date)}, ${M.clientLabel(s, r.client, false)}`, text: `reviewer note: ${r.why}`, href: r.href, link: 'Fix it' });
    for (const n of s.notes.filter(n => n.staff === sid && ['returned', 'flagged'].includes(n.review))) {
      open.push({ title: `${n.review === 'flagged' ? "Flagged \"didn't happen\"" : 'Returned'} by ${M.staffShort(s, n.reviewed_by || 'cdiaz')} · ${M.clientLabel(s, n.client, false)} ${M.fmtDate(n.date)}`, text: n.review_comment ? `"${n.review_comment}"` : 'see the review note.', href: 'ExtDPN.dc.html?client=' + n.client, link: 'Fix it in Lauris' });
    }
    const goals = (conf.goals || []).map(g => ({ t: g[0], d: g[1], w: 'width:' + Math.max(0, Math.min(100, g[2])) + '%' }));
    const q = quality(s, sid);
    const pend = s.notes.filter(n => n.staff === sid && n.review === 'pending').length;
    const self = this.me?.id === sid;
    return { k, open, noOpen: !open.length, goals, noGoals: !goals.length, goalsTitle: self ? 'Your goals' : `${M.staffShort(s, sid)}'s goals`,
      behind, noBehind: !behind.length, lateTxt,
      behindHead: lines.length ? lines.map(l => l.head).join(' · ') : 'Nothing behind',
      behindChip: lines.length ? 'chip r' : 'chip g',
      behindCard: 'padding:16px 20px' + (lines.length ? ';border-color:#E8B4A6;background:#FFFBFA' : ''),
      quality: [
        ['On time', tl.rate != null ? `${tl.rate}% · ${tl.onTime} of ${tl.counted} notes this month` : '—'],
        ['Interventions used', q.ivs ? `${q.ivs} different ones across ${plural(q.ivNotes, 'note')} this month` : 'none recorded on the notes Psyflo saw this month'],
        ['Notes returned', `${q.returned} of ${q.of} this month${pend ? ` · ${pend} waiting for ${M.staffShort(s, st.reviewer || 'cdiaz')}'s approval` : ''}`],
        ['Approval', st.review_mode === 'every_note' ? `every note approved by ${M.staffShort(s, st.reviewer || 'cdiaz')} before it goes to the EHR` : 'not required · spot check']
      ].map(([l, v]) => ({ l, v })),
      h1: self ? `Your day, ${st.name.split(' ')[0].replace(/\.$/, '')}` : `${st.name}'s day` };
  }
  supView() {
    const s = this.s, d = this.dash, sc = this.scope();
    let studentsTotal = 0, behindTotal = 0;
    const rows = [], qrows = [];
    for (const st of sc.staff) {
      const conf = d.staff?.[st.id] || {};
      const nt = M.notesToday(s, st.id);
      const tl = noteTimeliness(s, st.id);
      const students = Math.max(nt.total, conf.students || 0);
      const done = nt.done + (students > nt.total ? (conf.other_done || 0) : 0);
      studentsTotal += students; behindTotal += tl.behind.length;
      const pend = s.notes.filter(n => n.staff === st.id && n.review === 'pending').length;
      const rep = repeatedParagraphs(s, st.id);
      const lines = behindLines(s, tl);
      const onTime = tl.rate != null ? tl.rate + '%' : conf.in_24h != null ? conf.in_24h + '% (export)' : '—';
      const onRate = tl.rate != null ? tl.rate : conf.in_24h;
      const reason = st.review_reason || (st.credential === 'QMHP-T' ? 'new hire' : 'on review');
      rows.push({
        name: M.staffShort(s, st.id), href: 'StaffDashboard.dc.html?staff=' + st.id,
        sub: `${students} student${students === 1 ? '' : 's'}${st.credential === 'QMHP-T' ? ' · QMHP-T' : ''}`,
        behindTxt: lines.length ? lines.map(l => `${l.head} · ${l.who}`).join('; ') : (nt.total ? 'nothing behind' : 'no caseload in Psyflo yet'),
        behindBad: !!lines.length,
        daily: students ? `${done} of ${students}` : '—', dailyBad: false,
        in24: onTime, inBad: onRate != null && onRate < 75,
        mode: st.review_mode === 'every_note' ? `Approval required · ${reason}` : 'Spot check · no approval',
        modeChip: st.review_mode === 'every_note' ? 'chip y' : 'chip n',
        flagText: (() => { const f = (conf.status ? [conf.status] : []).concat(conf.flags || [], rep && rep.count >= 3 ? [`Same words in ${rep.count} notes`] : []); return f.join(' · ') + (f.length && (pend || (conf.chip_flags || []).length) ? ' · ' : ''); })(),
        chipFlags: conf.chip_flags || [],
        pending: pend ? `${pend} note${pend === 1 ? '' : 's'} awaiting ${this.me?.id === st.reviewer ? 'your' : M.staffShort(s, st.reviewer || 'cdiaz') + "'s"} approval` : ''
      });
      const q = quality(s, st.id);
      qrows.push({ name: M.staffShort(s, st.id), onTime, ivs: q.ivs ? String(q.ivs) : '—', returned: q.of ? `${q.returned} of ${q.of}` : '—', rejected: String((conf.rejected || []).length) });
    }
    const patterns = (d.patterns || []).filter(p => sc.staff.some(st => p.who.startsWith(M.staffShort(s, st.id))));
    for (const st of sc.staff) {
      const rep = repeatedParagraphs(s, st.id);
      if (rep && rep.count >= 3) patterns.push({ who: 'Same words, different days.', text: `${rep.count} of ${rep.name}'s last ${rep.of} notes share a paragraph ("${rep.sample}" · ${rep.dates}); the enhancer now varies them, but the pattern is worth a conversation.` });
    }
    return { rows, qrows, patterns, noPatterns: !patterns.length, supH1: `${sc.long} · ${sc.staff.length} staff, ${studentsTotal} students`, siteName: sc.site,
      supBehind: behindTotal ? `${plural(behindTotal, 'note')} behind` : 'Nothing behind', supBehindChip: behindTotal ? 'chip r' : 'chip g',
      source: `Notes behind and on time are counted from the notes the extension reports at Process Form (dailies due within 24 h of the session, weekly guardian calls by Friday, monthly collaterals by month end). "(export)", rejected forms and safety-care holds: ${d.source || "Harvest's Lauris export · Oct 29"}.` };
  }
  renderVals() {
    const canSup = (LV[this.me?.role] || 0) >= 2;
    const v = canSup ? this.state.v : 'me';
    const sid = this.viewedStaff();
    const self = this.me?.id === sid;
    const base = { asOf: M.fmtDate(this.s.today, { dow: true }).replace(/^(\w+) /, '$1, '), canSup,
      meLabel: `${self ? 'My view' : 'Staff view'} · ${M.staffShort(this.s, sid)}`,
      supLabel: LV[this.me?.role] >= 3 ? 'All staff · all sites' : 'Supervisor view · ' + this.scope().site,
      rules: 'Daily notes are due within 24 h of the session · weekly guardian call by the end of the week · monthly collateral by month end',
      me: v === 'me', sup: v === 'sup',
      bMe: v === 'me' ? 'on' : '', bSup: v === 'sup' ? 'on' : '',
      pMe: () => this.setState({ v: 'me' }), pSup: () => this.setState({ v: 'sup' }) };
    return Object.assign(base, base.me ? this.myView(sid) : {}, base.sup ? this.supView() : {});
  }
});
