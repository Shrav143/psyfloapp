// Documentation · Note timeliness (screen 28). One table: Staff, Backlog, Timely %, Review, Flags.
// Backlog and Timely % are counted from the notes the panel reports at Process Form (state.notes): a daily note is due within
// 24 h of the session, the weekly guardian call by the end of that week, the monthly collateral by month end. So Flow B moves a
// staffer's count the moment the note is processed. A staffer with no notes in Psyflo yet falls back to the seeded export rate and
// carries a `Sample data` tag. Flags are one line each and open the record they are about.
// Who sees what: direct support see only their own row (framed as mine), a supervisor the staff at their sites, clinician and
// admin everyone. Supervisors and up can change a staffer's review (100% review / Sampled) from the Review column.
import { register, Screen, M, raw, esc, modal, toast, helpIcon } from '../app.js';
import { isSchoolDay, hoursBetween } from '../shared/dates.js';
import { VIEWS, METRIC, HELP, PAGE_TITLE } from '../shared/labels.js';
import { repeatedParagraphs, managedStaff, siteOptions } from './ReviewQueue.js';

const LV = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };

function monday(d) { const w = M.parse(d).getUTCDay(); return M.addDays(d, -((w + 6) % 7)); }
const monthEndOf = d => M.addDays(M.addDays(d.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1);
const SESSION_END = '15:30'; // dismissal; a session with no Psyflo timer is taken to end then

// On-time tracking for one staffer, from the notes the panel reported at Process Form.
// A student is tracked from the first note of that kind Psyflo saw (dailies: looking back over this week),
// and every student on the caseload is expected today.
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

const FORM = { daily: ['daily past 24 h', 'ExtDPN'], weekly_guardian: ['weekly call missed', 'ExtWeekly'], monthly_collateral: ['monthly missed', 'ExtMonthly'] };

register('StaffDashboard', class extends Screen {
  init() { this.state = { site: 'all' }; }
  get level() { return LV[this.me?.role] || 0; }
  // the staff this viewer may see
  scope() {
    const s = this.s, me = this.me;
    if (me?.role === 'direct_support') return s.staff.filter(x => x.id === me.id);
    return managedStaff(s, me);
  }
  flagsFor(st, tl, conf, pend, rep) {
    const s = this.s, out = []; const canReview = this.level >= 2;
    const byInitials = txt => { const m = txt.match(/\b([A-Z]\.[A-Z]\.)/); return m ? s.clients.find(c => c.initials === m[1]) : null; };
    // 1 · what is past due, one line per kind of note
    for (const type of ['daily', 'weekly_guardian', 'monthly_collateral']) {
      const l = tl.behind.filter(b => b.type === type); if (!l.length) continue;
      out.push({ text: `${l.length} ${FORM[type][0]}`, href: `${FORM[type][1]}.dc.html?client=${l[0].c.id}` });
    }
    // 2 · what the seed export says (goal untouched, notes not in Lauris)
    for (const f of [].concat(conf.flags || [])) {
      const c = byInitials(f); const text = f.replace(/^(.*?) for ([A-Z]\.[A-Z]\.) \(([^)]+)\)$/, '$1 $3 · $2');
      const first = (conf.rejected || [])[0];
      out.push({ text, href: c ? `${/goal/i.test(f) ? 'ExtISP' : 'ExtDPN'}.dc.html?client=${c.id}` : (first ? first.href : null) });
    }
    for (const f of [].concat(conf.chip_flags || [])) {
      const inc = (s.incidents || []).find(i => /safety-care/i.test(i.what));
      out.push({ text: f.replace(/ · site average.*$/, '').replace('safety-care', 'safety'), href: inc ? `ExtIncident.dc.html?client=${inc.client}` : null });
    }
    // 3 · notes waiting for the reviewer
    if (pend) out.push({ text: `${pend} waiting for ${M.staffShort(s, st.reviewer || 'cdiaz')}`, href: canReview ? 'ReviewQueue.dc.html' : null });
    // 4 · same paragraph across notes (drafting rule 13)
    if (rep && rep.count >= 3) {
      const last = s.notes.filter(n => rep.ids.includes(n.id)).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      out.push({ text: `Same words in ${rep.count} notes`, href: last ? `ExtDPN.dc.html?client=${last.client}` : null });
    }
    // 5 · forms Lauris rejected
    const rej = (conf.rejected || []);
    if (rej.length) out.push({ text: `${rej.length} rejected in Lauris`, href: rej[0].href });
    return out.slice(0, 3).map(f => ({ ...f, link: !!f.href }));
  }
  rowFor(st) {
    const s = this.s, conf = (s.staff_dashboard?.staff || {})[st.id] || {};
    const tl = noteTimeliness(s, st.id);
    const pend = s.notes.filter(n => n.staff === st.id && n.review === 'pending').length;
    const rep = repeatedParagraphs(s, st.id);
    const sample = tl.rate == null && conf.in_24h != null;
    const rate = tl.rate != null ? tl.rate : conf.in_24h;
    const every = st.review_mode === 'every_note';
    const self = this.me?.id === st.id;
    const manage = this.level >= 2 && this.me?.role !== 'direct_support';
    return {
      name: M.staffShort(s, st.id), mine: self && this.me.role === 'direct_support',
      backlog: tl.behind.length, backlogLate: tl.behind.length > 0, backlogOk: tl.behind.length === 0,
      timely: rate != null ? rate + '%' : '—', timelyLate: rate != null && rate < 75, timelyOk: !(rate != null && rate < 75), sample,
      review: every ? METRIC.everyNote : METRIC.sampled, reviewLabel: `Review for ${M.staffShort(s, st.id)}: ${every ? METRIC.everyNote : METRIC.sampled}`, reviewChip: every ? 'watch' : 'info', canEdit: manage, noEdit: !manage,
      editReview: () => this.reviewMode(st),
      flags: this.flagsFor(st, tl, conf, pend, rep)
    };
  }
  reviewMode(st) {
    const s = this.s, name = M.staffShort(s, st.id); const every = st.review_mode === 'every_note';
    modal(`<h2>Review · ${esc(name)}</h2>
      <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
        <label class="u-tog"><input type="radio" name="rv-m" value="every_note"${every ? ' checked' : ''}> ${esc(METRIC.everyNote)}</label>
        <label class="u-tog"><input type="radio" name="rv-m" value="spot_check"${every ? '' : ' checked'}> ${esc(METRIC.sampled)}</label>
      </div>
      <div id="rv-why" style="${every ? '' : 'display:none'}"><label for="rv-r" style="display:block;font-size:13px;font-weight:600;margin-bottom:5px">Why</label>
      <select id="rv-r" class="u-sel" style="width:100%"><option value="on review">On review</option><option value="new hire"${st.review_reason === 'new hire' ? ' selected' : ''}>New hire</option><option value="returning from leave">Returning from leave</option></select></div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-ok>Save</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const mode = () => box.querySelector('input[name="rv-m"]:checked').value;
        box.querySelectorAll('input[name="rv-m"]').forEach(i => i.onchange = () => { box.querySelector('#rv-why').style.display = mode() === 'every_note' ? '' : 'none'; });
        box.querySelector('[data-ok]').onclick = async () => {
          const m = mode(), reason = box.querySelector('#rv-r').value; close();
          if (m === (every ? 'every_note' : 'spot_check')) return;
          await this.do('staff.reviewMode', { id: st.id, mode: m, reason: m === 'every_note' ? reason : undefined, by: this.me?.id || 'cdiaz' });
          toast(`${name} · ${m === 'every_note' ? METRIC.everyNote : METRIC.sampled}`);
        };
      });
  }
  renderVals() {
    const s = this.s; const lvl = this.level;
    const staff = this.scope();
    const sites = siteOptions(s, staff);
    const site = sites.some(o => o.id === this.state.site) ? this.state.site : 'all';
    const shown = staff.filter(x => site === 'all' || [].concat(x.sites || []).includes(site));
    const ds = this.me?.role === 'direct_support';
    return {
      title: PAGE_TITLE.StaffDashboard, today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      canSup: lvl >= 2, viewNote: VIEWS.documentation.compliance, viewReview: VIEWS.documentation.review,
      showSite: !ds, sites: sites.map(o => ({ ...o, sel: o.id === site ? 'selected' : '' })),
      pickSite: e => this.setState({ site: e.target.value }),
      colStaff: 'Staff', colBacklog: METRIC.backlog, colTimely: METRIC.timely, colReview: METRIC.review, colFlags: 'Flags',
      help: raw(helpIcon(HELP.timely, METRIC.timely)),
      rows: shown.map(st => this.rowFor(st)), none: !shown.length
    };
  }
});
