// 6 · Intake (route Referrals) · the "Intake" view of Authorizations: referral through intake, one row per referral.
// Also the leaf module for the small selectors B1's screens share (site and funding filters, the post-intake clock chip,
// the proof viewer), so Authorizations, Worklist, Referral and Eligibility import from here and nothing imports back.
import { register, Screen, M, esc, modal } from '../app.js';
import { VIEWS, FILTER, PART } from '../shared/labels.js';

export const REF_STAGE_CHIP = {
  needs_screening: ['Needs screening call', 'y'], waiting_on_school: ['Waiting on the school', 'n'], screening_booked: ['Screening booked', 'g'],
  in_intake: ['In intake', 'g'], in_service: ['In service', 'g'], grant_program: ['Grant program', 'n'], declined: ['Declined', 'n'], draft: ['Draft (school)', 'n']
};
export const stageChip = r => r.hold ? ['On hold', 'r'] : (REF_STAGE_CHIP[r.stage] || [M.REF_STAGE[r.stage] || String(r.stage || '').replace(/_/g, ' '), 'n']);

// "T.W., 12" for client ids, the free text otherwise ("A.R., 9")
export const refStudent = (s, r) => M.byId(s.clients, r.client) ? M.clientLabel(s, r.client) : (r.client || r.form?.client || 'New student');
export const refShort = (s, r) => refStudent(s, r).split(',')[0];

// Where the student is in the request lifecycle, for referrals already in intake/service
export function refNext(s, r) {
  if (['in_intake', 'in_service'].includes(r.stage) && M.byId(s.clients, r.client)) {
    const q = s.requests.find(q => q.client === r.client && !['closed'].includes(q.stage));
    if (q) {
      const clock = M.requestClock(s, q).text;
      if (q.sent && ['submitted', 'overdue'].includes(q.stage)) return `Request sent ${M.fmtDate(q.sent)} · ${clock}`;
      return `${M.TYPE_LABEL[q.type] || 'Request'} · ${(M.STAGE_LABEL[q.stage] || q.stage).toLowerCase()}`;
    }
  }
  return r.next || '';
}

// started date for the median: the referral's own, or the client's service start
export function refStarted(s, r) {
  if (r.started) return r.started;
  if (r.stage === 'in_service') return M.byId(s.clients, r.client)?.service_start || null;
  return null;
}

// ---------- shared by the B1 screens ----------
export const FUNDING = ['TDT', 'SEBS', 'Outpatient'];
export const yes = v => v === true || /^(y|yes|true)/i.test(String(v ?? ''));
export const dateHead = s => M.fmtDate(s.today, { dow: true }).replace(' ', ', ');       // "Thu, Oct 29"
export const schoolTag = name => String(name || '').replace(/ (City|County) · /, ' ');   // "Lynchburg MS-2"
export const localityOf = (s, schoolId) => M.school(s, schoolId).locality || '';
export const siteOptions = (s, cur) => [{ v: '', t: FILTER.site, sel: !cur ? 'selected' : '' }].concat([...new Set(s.schools.map(x => x.locality))].sort().map(v => ({ v, t: v, sel: cur === v ? 'selected' : '' })));
export const noop = () => { };

// the funding source of a referral: what was chosen, else SEBS once routed to the grant program, else what the school asked for, else TDT
export function fundingOf(r) {
  if (r.stage === 'grant_program') return 'SEBS';
  if (r.funding) return r.funding;
  const asked = (r.form?.referral_for || []).map(x => String(x).toLowerCase());
  const hit = FUNDING.find(f => asked.some(a => a.startsWith(f.toLowerCase().split(' ')[0])));
  return hit || 'TDT';
}

// The earliest open post-intake clock (design §7.4): the plan within isp_due_hours of the intake, the rest of the paperwork within
// paperwork_due_days, the initial request within initial_sra_days. Returns { text, sev, due } or null when none is open.
export function intakeClock(s, r) {
  const c = M.byId(s.clients, r.client); const tl = c && c.timeline;
  if (!tl || !tl.intake || String(tl.intake).slice(0, 10) > s.today) return null;
  const k = M.clocksOf(s); const open = [];
  const at = tl.intake.length > 10 ? tl.intake : tl.intake + 'T09:00';
  const plus = (iso, h) => { const d = M.parse(iso); d.setUTCHours(d.getUTCHours() + h); return d.toISOString().slice(0, 16); };
  if (!tl.isp && !(c.goals && c.goals.length)) open.push({ label: 'Plan', due: plus(at, k.isp_due_hours), unit: 'h' });
  const packet = (s.enrollment_packet || []).length; const done = Object.keys((s.enrollment || {})[c.id] || {}).length;
  if (packet && done < packet) open.push({ label: 'Paperwork', due: plus(at, k.paperwork_due_days * 24), unit: 'd' });
  const q = s.requests.find(x => x.client === c.id && x.type === 'initial');
  if (!q || ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed'].includes(q.stage)) {
    const start = c.clock30_start || String(tl.screening || tl.intake).slice(0, 10);
    open.push({ label: 'SRA', due: plus(M.addDays(start, k.initial_sra_days) + 'T17:00', 0), unit: 'd' });
  }
  if (!open.length) return null;
  open.sort((a, b) => a.due < b.due ? -1 : 1);
  const o = open[0]; const hrs = Math.round((M.parse(o.due) - M.parse(M.now(s))) / 3600000);
  const text = hrs < 0 ? `${o.label} overdue` : hrs < 48 ? `${o.label} ${hrs} h` : `${o.label} ${Math.ceil(hrs / 24)} d`;
  return { text, sev: hrs < 0 ? 'r' : hrs < 48 ? 'y' : 'n', due: o.due, label: o.label, hours: hrs };
}

// A recorded eligibility check's screenshot: opens the stored PDF when Psyflo holds one, else a stand-in card (seeded checks).
export function proofFile(s, h) { return h && h.screenshot ? [...(s.files || [])].reverse().find(f => f.kind === 'eligibility_proof' && f.name === h.screenshot) : null; }
export function showProof(s, h, who) {
  if (!h) return;
  const f = h.file ? { url: h.file } : proofFile(s, h);
  if (f && f.url) { window.open(f.url, '_blank', 'noopener'); return; }
  const payer = M.byId(s.payers, h.plan);
  modal(`<h2>${esc(h.screenshot || 'DMAS screenshot')}</h2>
    <div class="b1-shot" data-doc><b>Virginia Medicaid (DMAS) · eligibility lookup</b><br>${esc(who || '')} · ${esc(h.result || 'recorded')}${payer ? ' · ' + esc(payer.name) : ''}<br>${esc(M.fmtDateTime(h.checked_at || h.at, { year: true }))} · ${esc(M.staff(s, h.checked_by || h.by).name)}</div>
    <button class="mbtn p" data-close>Close</button>`);
}

export const B1_CSS = `
.b1-sub{display:block;font-size:12px;line-height:16px;color:var(--ink-3)}
.b1-filters{margin:0 0 16px}
.b1-tip{margin-left:6px}
.b1-tbl td:last-child{text-align:right;white-space:nowrap}
.b1-tbl .b1-st{display:flex;align-items:center;gap:6px}
.b1-ico{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:var(--ink-3);cursor:pointer}
.b1-ico:hover{background:var(--info-bg);color:var(--navy)}
.b1-x{margin-left:auto}
.b1-shot{border:1px solid var(--line);border-radius:10px;padding:14px;margin:12px 0;background:var(--paper)}
.b1-opt{display:flex;align-items:center;gap:8px;min-height:36px;font-weight:500}
.b1-opt input{width:16px;height:16px;accent-color:var(--teal)}
.b1-lbl{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--ink-3);margin:12px 0 4px}
.b1-mact{display:flex;gap:8px;margin-top:16px}
.b1-ic-ask{background:var(--watch-bg);border-color:var(--watch-fg);color:var(--watch-fg)}
`;

// ---------- the Intake view ----------
const HIDDEN = ['grant_program', 'declined', 'in_service', 'draft'];

// Status and clock for one referral, plus its one button. `key` feeds the Status filter.
export function intakeStatus(s, r) {
  const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id); const t = s.today;
  const ref = 'Referral.dc.html?id=' + r.id;
  const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
  if (r.hold) return { key: 'hold', text: 'On hold', sev: 'r', btn: 'Review', href: ref };
  if (r.stage === 'grant_program') return { key: 'closed', text: 'Routed to SEBS', sev: 'n', btn: 'View', href: ref };
  if (r.stage === 'declined') return { key: 'closed', text: 'Declined', sev: 'n', btn: 'View', href: ref };
  if (r.stage === 'in_service') return { key: 'closed', text: 'In service', sev: 'ok', btn: 'View', href: ref };
  if (r.stage === 'in_intake') { const ck = intakeClock(s, r); return { key: 'intake', text: ck ? ck.text : 'In intake', sev: ck ? ck.sev : 'n', btn: 'Review', href: ref, primary: !!ck && ck.sev !== 'n' }; }
  if (r.stage === 'screening_booked') {
    const w = booked ? booked.when : r.screening && r.screening.when;
    const today = w && String(w).slice(0, 10) === t;
    return { key: 'booked', text: w ? `Call ${M.fmtDate(w)}${M.fmtTime(w) ? ', ' + M.fmtTime(w) : ''}` : 'Screening booked', sev: today ? 'y' : 'n', btn: 'Open in Lauris', href: 'ExtScreening.dc.html?referral=' + r.id, primary: !!today };
  }
  if (r.stage === 'waiting_on_school') return { key: 'school', text: 'Awaiting school · ' + M.fmtDate(r.received), sev: 'n', btn: 'Review', href: ref };
  if (el && el.status === 'details_received') return { key: 'verify', text: 'Details received', sev: 'y', btn: PART.verify, href: 'Eligibility.dc.html?referral=' + r.id, primary: true };
  if (el && el.status === 'recorded' && el.result === 'active') return { key: 'eligible', text: 'Eligible', sev: 'ok', btn: 'Book call', href: ref + '&sched=1' };
  if (el && el.status === 'recorded') return { key: 'eligible', text: 'Not active', sev: 'r', btn: 'Review', href: ref };
  if (fl && fl.sent_at && !fl.submitted_at) return { key: 'family', text: 'Awaiting family · ' + M.fmtDate(fl.sent_at), sev: 'n', btn: 'Review', href: ref };
  return { key: 'new', text: 'New · ' + M.fmtDate(r.received), sev: 'y', btn: 'Review', href: ref };
}
const STAGE_NAME = (s, r) => ({ needs_screening: 'Referral', waiting_on_school: 'Referral', screening_booked: 'Screening', in_service: 'Service' })[r.stage]
  || (r.stage === 'in_intake' ? ((M.byId(s.clients, r.client)?.goals || []).length ? 'Plan' : 'Intake') : 'Closed');
const STATUS_NAME = { new: 'New', family: 'Awaiting family', verify: 'Details received', eligible: 'Eligibility', school: 'Awaiting school', booked: 'Screening booked', intake: 'In intake', hold: 'On hold', closed: 'Closed' };

// "Assigned to me": the referral needs a person on Harvest's side (not waiting on the family, the school or a booked call)
export const referralMine = st => !['family', 'school', 'closed'].includes(st.key);
export const referralAwaiting = st => ['family', 'school', 'booked'].includes(st.key);

register('Referrals', class extends Screen {
  init() { this.state = { site: this.params.site || '', status: this.params.status || 'open', funding: this.params.funding || '', mine: this.params.mine === '1' }; }
  renderVals() {
    const s = this.s; const st = this.state;
    const all = s.referrals.map(r => ({ r, st: intakeStatus(s, r) }));
    const pick = x => (st.status === 'all' ? true : st.status === 'open' ? !HIDDEN.includes(x.r.stage) : st.status === 'waiting' ? referralAwaiting(x.st) : x.st.key === st.status)
      && (!st.site || localityOf(s, x.r.school) === st.site) && (!st.funding || fundingOf(x.r) === st.funding) && (!st.mine || referralMine(x.st));
    const rows = all.filter(pick).sort((a, b) => String(b.r.received).localeCompare(String(a.r.received))).map(({ r, st: z }) => ({
      id: r.id, student: refStudent(s, r), school: schoolTag(M.school(s, r.school).name), funding: fundingOf(r), stage: STAGE_NAME(s, r),
      chipCls: 'u-chip ' + z.sev, status: z.text, btn: z.btn, href: z.href, btnCls: 'u-btn' + (z.primary ? ' pri' : ''),
      open: (e) => { if (e.target.closest('a')) return; this.go('Referral.dc.html', { id: r.id }); }
    }));
    const keys = [...new Set(all.map(x => x.st.key))].filter(k => STATUS_NAME[k]);
    const statusOpts = [{ v: 'open', t: 'Status' }, { v: 'waiting', t: PART.awaiting }, ...Object.keys(STATUS_NAME).filter(k => keys.includes(k)).map(k => ({ v: k, t: STATUS_NAME[k] })), { v: 'all', t: 'All referrals' }].map(o => ({ ...o, sel: st.status === o.v ? 'selected' : '' }));
    const fundOpts = [{ v: '', t: FILTER.funding }, ...FUNDING.map(v => ({ v, t: v }))].map(o => ({ ...o, sel: st.funding === o.v ? 'selected' : '' }));
    const q = new URLSearchParams(); if (st.status === 'waiting') q.set('status', 'waiting'); if (st.site) q.set('site', st.site);
    return {
      dateText: dateHead(s), rows, empty: !rows.length,
      siteOpts: siteOptions(s, st.site), statusOpts, fundOpts, mine: st.mine ? 'checked' : '',
      setSite: e => this.setState({ site: e.target.value }), setStatus: e => this.setState({ status: e.target.value }),
      setFunding: e => this.setState({ funding: e.target.value }), setMine: e => this.setState({ mine: e.target.checked }),
      segReq: 'Authorizations.dc.html' + (st.status === 'waiting' ? '?status=waiting' : ''), segIntake: 'Referrals.dc.html',
      viewReq: VIEWS.authorizations.requests, viewIntake: VIEWS.authorizations.intake, mineLabel: FILTER.mine
    };
  }
  get css() { return B1_CSS; }
});
