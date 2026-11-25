// 29 · Authorizations — the request tracker, live over state.requests: one table, one drawer.
// Also exports small helpers shared by the other request screens (Info request, Partials,
// Early discharge, Peer-to-peer) so they read requests the same way. Do not remove them.
import { register, Screen, M, raw, esc, modal, toast, session, api } from '../app.js';

// ---------- shared request helpers ----------
export const details = (s, id) => (s.request_details && s.request_details[id]) || {};
// the live row wins; seeded tracker fields fill what the seed row lacks
export const view = (s, r) => r ? { ...(details(s, r.id).fill || {}), ...r } : null;
export const findReq = (s, id) => view(s, M.byId(s.requests, id));
// the request a screen shows: ?id if it exists, else the first fallback id that exists, else the first matching pred
export function pickReq(s, id, fallbacks = [], pred = () => false) {
  if (id) { const r = findReq(s, id); if (r) return r; }
  for (const f of fallbacks) { const r = findReq(s, f); if (r) return r; }
  const r = s.requests.find(pred);
  return r ? view(s, r) : null;
}
export const clientOf = (s, r) => M.byId(s.clients, r.client);
export const schoolName = (s, r) => { const c = clientOf(s, r); const sc = c?.school || details(s, r.id).school; return sc ? M.school(s, sc).name : ''; };
export const rateFor = r => /after-school/i.test(r.service || '') ? 1 : /outpatient/i.test(r.service || '') ? 0 : 3;
const WHO = { Psyflo: 'Psyflo', Sfax: 'Sfax', demo: 'Demo', 'payer (demo)': 'payer' };
export function whoLabel(s, who) { if (!who) return ''; if (WHO[who]) return WHO[who]; const st = M.byId(s.staff, who); return st ? M.staffShort(s, who) : who; }
export function stamp(s, at) {
  if (!at) return '';
  const d = at.slice(0, 10) === s.today ? 'Today' : M.fmtDate(at);
  const t = M.fmtTime(at);
  return t ? `${d} · ${t}` : d;
}
// "what happened, in order" rows from the audit trail
export function evHtml(s, e) {
  const who = whoLabel(s, e.who);
  return raw(`${esc(e.what)}${who && !e.what.includes(who) ? ` <span style="color:#525B66">· ${esc(who)}</span>` : ''}${e.demo ? ' <span class="chip y">demo</span>' : ''}`);
}
export function timeline(s, id) {
  return M.eventsFor(s, id).map(e => ({ dt: stamp(s, e.at), html: evHtml(s, e) }));
}
// full communication history: audit trail + entries derived from the request's own dates (model.requestHistory)
export function historyRows(s, r) {
  return M.requestHistory(s, r).map((e, i) => ({
    dt: e.at ? stamp(s, e.at) : 'Before pilot',
    html: raw(`${e.upcoming ? '<span class="chip n" style="margin-right:6px">upcoming</span>' : ''}${evHtml(s, e).html}`),
    st: i === 0 ? 'border-top:0' : ''
  }));
}
// open a page on the mock portals (Availity / UHC) in a new tab; the tab is opened inside the click
// so the browser does not block it, then pointed at the URL the action returns
export async function openPortal(screen, action, args) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  let res;
  try { res = await screen.do(action, args); } catch (e) { if (w) w.close(); return null; }
  if (res && res.open) {
    const url = `${api.config.extURL}${res.open}`;
    if (w) w.location.href = url; else window.open(url, '_blank');
  } else if (w) w.close();
  return res;
}
export async function openFile(screen, action, args, pick = r => r?.file?.url || r?.url) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  try { const res = await screen.do(action, args); const url = pick(res); if (url) { if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close(); return res; }
  catch { if (w) w.close(); return null; }
}
export function stageCls(stage) {
  return { draft_ready: 'chip b', awaiting_signature: 'chip b', signed: 'chip b', info_requested: 'chip y', partial_decide: 'chip y', peer_to_peer_requested: 'chip y', p2p_awaiting: 'chip y', overdue: 'chip r', denied: 'chip r', active: 'chip g', early_discharge: 'chip g' }[stage] || 'chip n';
}
export function unitsLeft(s, r) {
  const c = clientOf(s, r); const a = c?.authorization;
  if (!a || !a.units) return null;
  return { units: a.units, used: a.used || 0, left: a.units - (a.used || 0) };
}

// ---------- Authorizations: one page, the "Prior auth & UR" view (Intake is the Referrals route) ----------
import { app, hrefFor } from '../app.js';
import { REQ_TYPE, STATUS, FILTER, PART, HELP, VIEWS } from '../shared/labels.js';
import { dateHead, siteOptions, localityOf, B1_CSS, showProof } from './Referrals.js';

const TERMINAL = ['active', 'closed'];
const PEOPLE_STAGES = ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'info_requested', 'partial_decide', 'peer_to_peer_requested', 'overdue'];
const OUTCOMES = [['received', 'Receipt confirmed'], ['in_review', 'In review'], ['not_found', 'Not found'], ['decided', 'Decision sent']];

const daysSent = (s, r) => r.sent ? M.daysBetween(r.sent, s.today) : null;
// the day-10 call was logged and the payer still has time: the request waits on the payer again (a "fax not found" needs a resend)
export function followUpLogged(s, r) {
  const k = M.clocksOf(s); const n = daysSent(s, r);
  return !!r.follow_up && n != null && n < k.decision_days && !(r.follow_up.outcome === 'not_found' && r.resend);
}
// waiting on a payer (the Worklist's "Awaiting response" line and the Status filter use the same rule)
export function isAwaiting(s, r) {
  const k = M.clocksOf(s); const n = daysSent(s, r);
  if (['sending', 'portal_open', 'appeal_sent', 'p2p_awaiting'].includes(r.stage)) return true;
  if (r.stage === 'submitted') return n == null || n < k.call_day || followUpLogged(s, r);
  if (r.stage === 'peer_to_peer_booked') return !(r.p2p_at && M.daysBetween(s.today, r.p2p_at) < 0);
  return false;
}
const isMine = (s, r) => PEOPLE_STAGES.includes(r.stage) || (r.stage === 'submitted' && !isAwaiting(s, r)) || (r.stage === 'peer_to_peer_booked' && !isAwaiting(s, r));

// units column: remaining of authorized once active or in renewal (27 of 110), requested → awarded while pending or partial (150 → 110)
function unitsCell(s, r) {
  const a = clientOf(s, r)?.authorization; const rate = rateFor(r);
  const renewing = r.type === 'continued_stay' && ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed'].includes(r.stage);
  if (a && a.units && (r.stage === 'active' || renewing)) {
    const used = a.used || 0; const left = a.units - used; const days = rate ? left / rate : Infinity;
    return { text: `${left} of ${a.units}`, pct: Math.min(100, Math.round(used / a.units * 100)), bar: days < 10 ? 'r' : days < 25 ? 'y' : '' };
  }
  const to = r.stage === 'partial_decide' ? r.units_offered : (r.units_awarded && r.units_awarded !== r.units_requested ? r.units_awarded : r.units_offered);
  if (to && to !== r.units_requested) return { text: `${r.units_requested} → ${to}` };
  return { text: String(r.units_awarded || r.units_requested || '') };
}

// the row's one button: where it goes, or the drawer it opens; filled only when due within 24 hours (same rule as the Worklist)
function rowAct(s, r) {
  const k = M.clocksOf(s); const n = daysSent(s, r); const href = M.requestHref(r);
  switch (r.stage) {
    case 'draft_ready': return { btn: 'Review in Lauris', href };
    case 'needs_approval': return { btn: PART.approve, drawer: true };
    case 'awaiting_signature': return { btn: 'Sign in Lauris', href, pri: true };
    case 'signed': return { btn: 'Send', drawer: true, pri: true };
    case 'info_requested': return { btn: PART.respond, href, pri: true };
    case 'partial_decide': return { btn: PART.reviewOffer, href, pri: !r.reply_by || M.daysBetween(s.today, r.reply_by) <= 1 };
    case 'peer_to_peer_requested': return { btn: 'Enter date', href };
    case 'peer_to_peer_booked': return { btn: 'Call notes', href };
    case 'p2p_awaiting': return { btn: 'Log decision', href };
    case 'denied': return { btn: 'Letter', href };
    case 'early_discharge': return { btn: 'Plan', href };
    case 'submitted': return n != null && n >= k.call_day && !followUpLogged(s, r) ? { btn: 'Open', drawer: true, pri: true } : { btn: 'View', drawer: true };
    case 'overdue': return { btn: 'Open', drawer: true, pri: true };
    default: return { btn: 'View', drawer: true };
  }
}

// M.statusChip can read "30 days days left" for a request near its 30-day limit; show it once
const chipText = chip => String(chip.text).replace(/(\d+) days days/, '$1 days');
const chipCls = (r, chip) => r.stage === 'active' ? 'ok' : chip.sev === 'r' ? 'r' : chip.sev === 'y' ? 'y' : 'n';
const CH = r => M.CHANNEL_LABEL[r.channel] || r.channel;
const stageKey = r => r.stage;

export function row(s, r0) {
  const r = view(s, r0); const chip = M.statusChip(s, r); const u = unitsCell(s, r); const act = rowAct(s, r);
  const type = r.stage === 'info_requested' ? REQ_TYPE.additional_info : (REQ_TYPE[r.type] || r.type);
  return {
    id: r.id, raw: r, student: M.clientLabel(s, r.client), type, payer: M.payerTag(s, r.payer), channel: CH(r),
    units: u.text, hasBar: u.pct != null, pct: u.pct, barCls: 'u-bar ' + (u.bar || ''),
    status: chipText(chip), statusCls: 'u-chip ' + chipCls(r, chip), helpClock: /follow-up/.test(chip.text), helpApproval: r.stage === 'needs_approval',
    btn: act.btn, btnCls: 'u-btn' + (act.pri ? ' pri' : ''), href: act.href, isLink: !act.drawer
  };
}

register('Authorizations', class extends Screen {
  init() {
    this.state = { open: this.params.open || null, site: this.params.site || '', status: this.params.status || 'open', payer: this.params.payer || '', mine: this.params.mine === '1', focus: this.params.open ? 'drawer' : null };
    this._key = e => {
      if (app.current?.inst !== this) { window.removeEventListener('keydown', this._key, true); return; }
      if (e.key !== 'Escape' || !this.state.open) return;
      const m = document.getElementById('modal'); if (m && !m.hidden) return;
      this.openRow(null);
    };
    window.addEventListener('keydown', this._key, true);
  }
  req(id = this.state.open) { return id ? findReq(this.s, id) : null; }
  openRow(id) {
    this.setState({ open: id, focus: id ? 'drawer' : 'row', last: id || this.state.open });
    try { history.replaceState(null, '', hrefFor('Authorizations.dc.html', id ? { open: id } : {})); } catch { }
  }
  matches(s, r) {
    const st = this.state; const sid = clientOf(s, r)?.school || details(s, r.id).school;
    const sOk = st.status === 'all' ? true : st.status === 'open' ? !TERMINAL.includes(r.stage) : st.status === 'waiting' ? isAwaiting(s, r) : st.status === 'active' ? r.stage === 'active' : r.stage === st.status;
    return sOk && (!st.site || localityOf(s, sid) === st.site) && (!st.payer || r.payer === st.payer) && (!st.mine || isMine(s, r));
  }
  renderVals() {
    const s = this.s; const st = this.state; const me = this.me;
    const dr = document.querySelector('.u-drawer'); if (dr) this._ds = dr.scrollTop;
    const rows = s.requests.filter(r => this.matches(s, r)).map(r => {
      const v = row(s, r);
      return { ...v, open: e => { if (e.target.closest('a')) return; this.openRow(v.id); } };
    });
    // at most three ? tips on the screen: the first two follow-up chips and the first pending approval; none behind the drawer
    const drawerOpen = !!(st.open && this.req());
    let clocks = 0, approvals = 0;
    rows.forEach(x => { x.tipClock = !drawerOpen && x.helpClock && clocks++ < 2; x.tipApproval = !drawerOpen && x.helpApproval && approvals++ < 1; });
    const stages = [...new Set(s.requests.map(stageKey))].filter(k => STATUS[k]).sort((a, b) => Object.keys(STATUS).indexOf(a) - Object.keys(STATUS).indexOf(b));
    const statusOpts = [{ v: 'open', t: 'Status' }, { v: 'waiting', t: PART.awaiting }, ...stages.map(k => ({ v: k, t: STATUS[k] })), { v: 'all', t: 'All requests' }].map(o => ({ ...o, sel: st.status === o.v ? 'selected' : '' }));
    const payers = [...new Set(s.requests.map(r => r.payer))];
    const payerOpts = [{ v: '', t: FILTER.payer }, ...payers.map(p => ({ v: p, t: M.payerTag(s, p) }))].map(o => ({ ...o, sel: st.payer === o.v ? 'selected' : '' }));
    return {
      dateText: dateHead(s), rows, empty: !rows.length, helpClockText: HELP.clock, helpApprovalText: HELP.approval,
      siteOpts: siteOptions(s, st.site), statusOpts, payerOpts, mine: st.mine ? 'checked' : '', mineLabel: FILTER.mine,
      setSite: e => this.setState({ site: e.target.value }), setStatus: e => this.setState({ status: e.target.value }),
      setPayer: e => this.setState({ payer: e.target.value }), setMine: e => this.setState({ mine: e.target.checked }),
      segReq: 'Authorizations.dc.html', segIntake: 'Referrals.dc.html' + (st.status === 'waiting' ? '?status=waiting' : ''),
      viewReq: VIEWS.authorizations.requests, viewIntake: VIEWS.authorizations.intake,
      drawerOpen, d: drawerOpen ? this.drawer(s, this.req(), me) : null, closeDrawer: () => this.openRow(null)
    };
  }
  drawer(s, r, me) {
    const k = M.clocksOf(s); const n = daysSent(s, r); const chip = M.statusChip(s, r);
    const student = M.clientLabel(s, r.client); const ref = r.fax_ref || r.portal_ref;
    const type = r.stage === 'info_requested' ? REQ_TYPE.additional_info : (REQ_TYPE[r.type] || r.type);
    const sub = [type, r.sent ? 'sent ' + M.fmtDate(r.sent) : '', [CH(r), ref].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const stale = e => /^No reply by the due date/.test(e.what) && r.decision_due && String(e.at).slice(0, 10) < r.decision_due; // seeded before the 14-day window
    const log = M.requestHistory(s, r).filter(e => !e.upcoming && !stale(e)).map(e => ({
      date: e.at ? M.fmtDate(e.at) : 'Before pilot', time: M.fmtTime(e.at), what: String(e.what).replace(/ \(7-calendar-day standard\)/, ''), who: whoLabel(s, e.who)
    }));
    const att = [];
    if (r.signed_pdf) att.push({ label: 'Signed PDF', fn: () => openFile(this, 'request.pdfCopy', { id: r.id }) });
    if (r.channel === 'fax' && r.sent) att.push({ label: 'Fax receipt', fn: () => openFile(this, 'b1.receiptCopy', { id: r.id }) });
    const el = s.eligibility.filter(e => e.client === r.client && e.status === 'recorded').sort((a, b) => String(b.checked_at).localeCompare(String(a.checked_at)))[0];
    if (el) att.push({ label: 'Eligibility ' + M.fmtDate(el.checked_at), fn: () => showProof(s, el, student) });
    const acts = []; const by = me?.id || 'jperez';
    const canApprove = ['clinician', 'admin'].includes(me?.role);
    const link = (label, href, pri) => acts.push({ label, cls: 'u-btn' + (pri ? ' pri' : ''), isLink: true, href });
    const btn = (label, fn, pri, help, about) => acts.push({ label, cls: 'u-btn' + (pri ? ' pri' : ''), isLink: false, fn, help, about });
    const href = M.requestHref(r);
    switch (r.stage) {
      case 'needs_approval': if (canApprove) btn(PART.approve, () => this.approve(r, by), true, HELP.approval, 'approval'); break;
      case 'draft_ready': link('Review in Lauris', href, true); break;
      case 'awaiting_signature': link('Sign in Lauris', href, true); break;
      case 'signed': btn(r.channel === 'fax' ? 'Send by fax' : 'Open ' + CH(r), () => this.send(r, by), true); break;
      case 'portal_open': btn('Open ' + CH(r), () => window.open(`${api.config.extURL}/${r.channel}/upload?request=${encodeURIComponent(r.id)}${r.info_reply_pending ? '&kind=reply' : ''}`, '_blank'), true); break;
      case 'submitted': case 'overdue': {
        const overdue = r.stage === 'overdue';
        if (r.resend) btn('Resend', () => this.resend(r, by), true);
        else if (overdue || (n != null && n >= k.call_day)) btn('Log call', () => this.logCall(r, by), true);
        if (overdue || (n != null && n >= k.public_standard_days)) btn(r.overdue_notice_sent ? 'Notice sent' : 'Send notice', () => this.notice(r, by), false);
        break;
      }
      case 'info_requested': link('Reply', href, true); break;
      case 'partial_decide': link(PART.reviewOffer, href, true); break;
      case 'peer_to_peer_requested': link('Enter date', href, true); break;
      case 'peer_to_peer_booked': link('Call notes', href, true); break;
      case 'p2p_awaiting': link('Log decision', href, true); break;
      case 'denied': link('Letter', href, true); break;
      case 'early_discharge': link('Plan', href, true); break;
      case 'active': link('Open in Lauris', href, false); break;
    }
    return {
      id: r.id, label: `${r.id} · ${student} · ${M.payerTag(s, r.payer)}`, title: `${r.id} · ${student} · ${M.payerTag(s, r.payer)}`, sub,
      status: chipText(chip), statusCls: 'u-chip ' + chipCls(r, chip), helpClock: /follow-up/.test(chip.text), log, hasAtt: att.length > 0, att, acts,
      activity: PART.activity, attachments: PART.attachments, helpClockText: HELP.clock
    };
  }
  async approve(r, by) { try { await this.do('request.approve', { id: r.id, by }); toast('Approved · ready for the clinician to sign'); } catch { } }
  async send(r, by) {
    try {
      if (r.channel === 'fax') { await this.do('request.send', { id: r.id, by }); toast('Send pressed · faxing through Sfax'); }
      else { const res = await openPortal(this, 'request.send', { id: r.id, by }); if (res) toast(`${CH(r)} opened in a new tab · upload there`); }
    } catch { }
  }
  async resend(r, by) {
    try {
      if (r.channel === 'fax') { await this.do('b1.resend', { id: r.id, by }); toast('Resend pressed · faxing through Sfax'); }
      else { const res = await openPortal(this, 'b1.resend', { id: r.id, by }); if (res) toast(`${CH(r)} opened in a new tab · upload there`); }
    } catch { }
  }
  logCall(r, by) {
    const s = this.s;
    modal(`<h2>Log call · ${esc(M.clientLabel(s, r.client))} · ${esc(M.payerTag(s, r.payer))}</h2>
      <div role="radiogroup" aria-label="Outcome" style="margin-top:8px">${OUTCOMES.map(([v, t], i) => `<label class="b1-opt"><input type="radio" name="b1-out" value="${v}"${i === 0 ? ' checked' : ''}> ${t}</label>`).join('')}</div>
      <label class="b1-lbl" for="b1-note">Note</label><input id="b1-note" class="u-in" style="width:100%" maxlength="120">
      <div class="b1-mact"><button class="mbtn p" data-go>Log call</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => {
        const outcome = box.querySelector('input[name="b1-out"]:checked').value; const note = box.querySelector('#b1-note').value.trim(); close();
        try { await this.do('request.followUp', { id: r.id, outcome, by, note }); toast('Logged · ' + OUTCOMES.find(o => o[0] === outcome)[1].toLowerCase()); } catch { }
      }; });
  }
  notice(r, by) {
    const s = this.s; const p = M.payer(s, r.payer); const k = M.clocksOf(s);
    const due = r.sent ? M.addDays(r.sent, k.public_standard_days) : '';
    const text = `To: ${p.name} · Utilization Management\nRe: ${REQ_TYPE[r.type] || 'Request'} for member ${M.clientLabel(s, r.client, false)} · Medicaid ID on file · ${r.service}\n\nThe request was submitted on ${M.fmtDate(r.sent, { year: true })}${r.fax_ref ? ' by fax (Sfax reference ' + r.fax_ref + ')' : r.portal_ref ? ' through the portal (confirmation ' + r.portal_ref + ')' : ''}${r.receipt_confirmed ? ', and receipt was confirmed by phone on ' + M.fmtDate(r.receipt_confirmed) : ''}. The public standard for a service authorization decision is ${k.public_standard_days} calendar days${due ? ' (' + M.fmtDate(due, { year: true }) + ')' : ''}. We have not received one. Please issue a decision or tell us what is missing.\n\n${M.staff(s, by).name} · Harvest Outreach Center`;
    const sent = r.overdue_notice_sent;
    modal(`<h2>${sent ? 'Notice sent · ' + esc(M.fmtDate(sent)) : 'Send notice · ' + esc(M.payerTag(s, r.payer))}</h2>
      <div data-doc style="white-space:pre-wrap;border:1px solid var(--lauris-yellow-bd);background:var(--lauris-yellow-bg);border-radius:8px;padding:10px 12px;font-size:13px;margin-top:8px">${esc(text)}</div>
      <div class="b1-mact">${sent ? '' : '<button class="mbtn p" data-go>Send notice</button>'}<button class="mbtn" data-close>${sent ? 'Close' : 'Not now'}</button></div>`,
      (box, close) => { const b = box.querySelector('[data-go]'); if (b) b.onclick = async () => { close(); try { await this.do('request.overdueNotice', { id: r.id }); toast('Notice sent · logged on ' + r.id); } catch { } }; });
  }
  after(root) {
    const d = root.querySelector('.u-drawer');
    if (d && this._ds) d.scrollTop = this._ds;
    if (this.state.focus === 'drawer' && d) { (d.querySelector('[data-x]') || d).focus(); this.state.focus = null; }
    else if (this.state.focus === 'row') { const b = root.querySelector(`[data-row="${this.state.last}"] button`); if (b) b.focus(); this.state.focus = null; }
  }
  get css() { return B1_CSS + '.b1-drawer-h{display:flex;align-items:center;gap:8px}.b1-log{list-style:none;margin:0;padding:0}.b1-log li{display:grid;grid-template-columns:112px minmax(0,1fr);gap:0 12px;padding:8px 0;border-top:1px solid var(--line)}.b1-log li:first-child{border-top:0}.b1-log .when{color:var(--ink-3);font-size:12px;line-height:20px;white-space:nowrap}.b1-log .who{color:var(--ink-3);font-size:12px;line-height:16px}.b1-att{display:flex;flex-wrap:wrap;gap:8px}.b1-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:24px}'; }
});
