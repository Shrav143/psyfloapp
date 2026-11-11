// 29 · Authorizations — the request tracker, live over state.requests.
// Also exports small helpers shared by the other request screens (Sent, Info request, Partials,
// Early discharge, Peer-to-peer) so they read requests the same way.
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

// next action, in words, for a row
function nextAction(s, r) {
  const c = M.clientLabel(s, r.client, false); const d = details(s, r.id);
  if (d.next && ['submitted'].includes(r.stage)) return d.next;
  const receipt = r.receipt_confirmed ? `Receipt confirmed ${M.fmtDate(r.receipt_confirmed)} (${whoLabel(s, r.receipt_by)} called). ` : (r.receipt_check ? `Receipt check call due ${M.fmtDate(r.receipt_check)}. ` : '');
  switch (r.stage) {
    case 'draft_ready': return r.type === 'continued_stay' ? `Draft ready from ${r.draft_sources?.daily_notes || 'the'} notes. Open ${c} in Lauris to review it in the form.` : `Drafted from the record. Open ${c} in Lauris to review it in the form.`;
    case 'awaiting_signature': return 'Processed in Lauris. Press Get Signature in Forms to Approve; Send unlocks after that.';
    case 'signed': return 'Signed PDF saved and packet assembled. A clinician presses Send.';
    case 'sending': return 'Faxing through Sfax · reference and delivery receipt arrive in a few seconds.';
    case 'portal_open': return `Upload in your own ${M.CHANNEL_LABEL[r.channel]} session; the extension reads the confirmation.`;
    case 'submitted': {
      if (!r.decision_due) return receipt || 'Waiting for the decision.';
      const dd = M.daysBetween(s.today, r.decision_due);
      return receipt + (dd === 0 ? 'If nothing arrives by 5 pm an overdue notice is ready for you to send.' : dd < 0 ? 'Overdue notice citing the 7-day standard is ready for you to send.' : `Decision due ${M.fmtDate(r.decision_due)}.`);
    }
    case 'overdue': return receipt + (r.overdue_notice_sent ? `Overdue notice sent ${M.fmtDate(r.overdue_notice_sent)}.` : 'Overdue notice citing the 7-day standard is ready for you to send.');
    case 'info_requested': return r.info_reply?.sent_at ? 'Reply sent; waiting for the upload confirmation.' : 'Reply drafted from the request already sent; a clinician must send it.';
    case 'partial_decide': return 'Accept and stretch · accept and use them up · ask for a peer-to-peer';
    case 'peer_to_peer_requested': return `Peer-to-peer asked for. When ${M.payerShort(s, r.payer)} calls to agree a time, enter the date and time.`;
    case 'peer_to_peer_booked': { const a = clientOf(s, r)?.authorization; if (r.p2p_at && r.p2p_at.slice(0, 10) < s.today) return 'Call date has passed. Log the outcome (awaiting decision is fine).'; return (a?.exhausted && r.p2p_at && a.exhausted < r.p2p_at ? 'Units run out before the call. ' : '') + 'Call notes are ready.'; }
    case 'p2p_awaiting': return `Call held. Waiting for ${M.payerShort(s, r.payer)}'s decision; log it when it arrives.`;
    case 'denied': return `Reason: "${r.denial_reason || 'not given'}." Guardian-led appeal; letter drafted for the guardian.`;
    case 'appeal_sent': return 'Guardian signed; appeal faxed through Sfax. Waiting for the payer.';
    case 'early_discharge': return r.early_discharge ? `Discharge ${M.fmtDate(r.early_discharge.discharge)} · new intake ${M.fmtDate(r.early_discharge.intake)} · new initial no earlier than ${M.fmtDate(r.early_discharge.new_initial)}` : 'Accepted with an early discharge · set the plan.';
    case 'active': {
      const u = unitsLeft(s, r); const rate = rateFor(r); const c2 = clientOf(s, r);
      if (u && rate && u.left / rate < 10) return 'Start the next continued stay now.';
      const end = c2?.authorization?.end; if (end) return `Renewal due ${M.fmtDate(M.addBusinessDays(end, -14))} (14 business days before ${M.fmtDate(end)}).`;
      if (r.stretch) return `Stretched to ${r.stretch.until ? M.fmtDate(r.stretch.until) : 'the end date'}${r.stretch.per_week ? ' · about ' + r.stretch.per_week + ' units a week' : ''}.`;
      return r.p2p_outcome ? 'Peer-to-peer outcome logged.' : r.decision ? 'Units awarded and logged.' : '—';
    }
    case 'closed': return 'Closed.';
    default: return '—';
  }
}
const BTN = { draft_ready: ['Review in Lauris', 'btn p s'], awaiting_signature: ['Sign in Lauris', 'btn p s'], signed: ['Send', 'btn p s'], info_requested: ['Open reply', 'btn o s'], partial_decide: ['Decide', 'btn o s'], peer_to_peer_requested: ['Enter call date', 'btn o s'], peer_to_peer_booked: ['Call notes', 'btn o s'], p2p_awaiting: ['Log decision', 'btn o s'], overdue: ['Send notice', 'btn o s'], early_discharge: ['Plan', 'btn o s'] };

export function row(s, r0) {
  const r = view(s, r0); const c = M.byId(s.clients, r.client); const d = details(s, r.id);
  const clk = M.requestClock(s, r);
  let clock = clk.text, clockSev = clk.sev;
  const u = unitsLeft(s, r); const rate = rateFor(r);
  let units = r.units_awarded ? `${r.units_requested} → ${r.units_awarded} awarded` : r.units_offered ? `${r.units_requested} → ${r.units_offered} offered` : `${r.units_requested} requested`;
  let unitsSub = d.units_note || '', hasBar = false, barStyle = '';
  if (r.stage === 'active' && u) {
    hasBar = true; const pct = Math.round(u.used / u.units * 100);
    const days = rate ? Math.floor(u.left / rate) : null;
    barStyle = `width:${pct}%` + (days != null && days < 10 ? ';background:#B9541F' : '');
    unitsSub = `${u.left} left` + (rate ? ` · ${rate}/day` : '');
    if (days != null) { clock = `${days} school days`; clockSev = days < 10 ? 'r' : 'n'; } else { clock = '—'; clockSev = 'n'; }
  } else if (r.type === 'continued_stay' && ['draft_ready', 'awaiting_signature', 'signed'].includes(r.stage) && u) {
    hasBar = true; const pct = Math.round(u.used / u.units * 100);
    barStyle = `width:${pct}%` + (u.left / 3 <= 10 ? ';background:#B9541F' : '');
    unitsSub = `${u.left} of ${u.units} left on current auth`;
  } else if (r.stage === 'peer_to_peer_booked' && u) {
    hasBar = true; barStyle = `width:${Math.round(u.used / u.units * 100)}%;background:#B9541F`;
    unitsSub = unitsSub || `${u.left} left`;
  } else if (!unitsSub && r.sent && ['submitted', 'overdue', 'sending', 'portal_open'].includes(r.stage)) {
    unitsSub = (r.signed_at || r.signed_pdf ? 'signed and sent ' : 'sent ') + M.fmtDate(r.sent);
  } else if (!unitsSub && r.stage === 'denied' && r.denied_on) unitsSub = 'denied ' + M.fmtDate(r.denied_on);
  else if (!unitsSub && r.stage === 'partial_decide' && r.offer_call) unitsSub = 'offer received ' + M.fmtDate(r.offer_call);
  const [btn, btnCls] = BTN[r.stage] || ['View', 'btn o s'];
  let type = M.TYPE_LABEL[r.type] || r.type;
  if (r.stage === 'info_requested' || r.info_reply) type += ' → Additional information';
  const channel = (M.CHANNEL_LABEL[r.channel] || r.channel) + (r.fax_ref ? ' · ref ' + r.fax_ref : r.portal_ref ? ' · ' + r.portal_ref : '');
  let href = M.requestHref(r);
  if (r.stage === 'overdue' || r.stage === 'signed') href = 'Submission.dc.html?id=' + r.id;
  return {
    id: r.id, client: M.clientLabel(s, r.client), school: c ? M.school(s, c.school).name : (d.school ? M.school(s, d.school).name : ''),
    payer: M.payerShort(s, r.payer), channel, service: (r.service || '').split(' · ')[0], type,
    units, unitsSub, hasBar, barStyle, stage: M.STAGE_LABEL[r.stage] || r.stage, stageCls: stageCls(r.stage),
    clock, clockCls: 'chip ' + (clockSev || 'n'), next: nextAction(s, r), btn, btnCls, href, raw: r,
    history: historyRows(s, r)
  };
}

const FILTERS = { All: 'all', Me: 'me', Info: 'info', Partial: 'partial', Denied: 'denied', Active: 'active', Renew: 'renew' };
const EMPTY = { all: 'Nothing open.', me: 'No drafts waiting for you to review, sign and send.', info: 'No information requests open.', partial: 'No partial awards to decide.', denied: 'No denials.', active: 'No active authorizations.', renew: 'No renewals due.' };

register('Authorizations', class extends Screen {
  init() { this.state = { tab: this.params.tab || 'all', payer: this.params.payer || '', svc: '', type: '', open: this.params.history ? { [this.params.history]: true } : {} }; }
  renderVals() {
    const s = this.s; const me = this.me;
    const tagged = s.requests.map(r => ({ r, tags: M.requestTags(s, r, me?.id) }));
    const sel = ({ r }) => (!this.state.payer || r.payer === this.state.payer) && (!this.state.svc || r.service === this.state.svc) && (!this.state.type || r.type === this.state.type);
    const t = this.state.tab;
    const rows = tagged.filter(x => sel(x) && x.tags.has(t === 'active' ? 'all_active' : t)).map(x => {
      const v = row(s, x.r); const open = !!this.state.open[v.id];
      return { ...v, open, histLabel: (open ? 'Hide history' : 'History') + ` · ${v.history.length}`, toggle: () => this.setState({ open: { ...this.state.open, [v.id]: !open } }) };
    });
    const vals = {
      rows, noRows: !rows.length, emptyText: EMPTY[t] + (this.state.payer || this.state.svc || this.state.type ? ' (with these filters)' : ''),
      asOf: M.fmtDate(s.today, { dow: true }).replace(' ', ', '),
      isAdmin: session.user?.role === 'admin',
      setPayer: e => this.setState({ payer: e.target.value }),
      setSvc: e => this.setState({ svc: e.target.value }),
      setType: e => this.setState({ type: e.target.value })
    };
    for (const [k, tag] of Object.entries(FILTERS)) {
      const key = tag === 'active' ? 'all_active' : tag;
      vals['n' + k] = tagged.filter(x => sel(x) && x.tags.has(key)).length;
      vals['t' + k] = 'tab' + (t === tag ? ' on' : '');
      vals['pick' + k] = () => this.setState({ tab: tag });
    }
    return vals;
  }
  // the canvas's "chip r" also matches the row class .r; keep red chips looking like chips
  get css() { return '.chip.r{display:inline-block;padding:2px 9px;border-top:0;font-size:12px}.chip.r:hover{background:#FBE9E4}'; }
  after(root) {
    const set = (id, v) => { const el = root.querySelector('#' + id); if (el) el.value = v; };
    set('payer', this.state.payer); set('svc', this.state.svc); set('rt', this.state.type);
  }
  get anchors() {
    return {
      demoReply: () => this.demoReply(),
      advanceDay: async () => {
        if (session.user?.role !== 'admin') return;
        await this.do('demo.advanceDay');
        toast('Demo: clock advanced to ' + M.fmtDate(this.s.today, { dow: true }));
      }
    };
  }
  demoReply() {
    if (session.user?.role !== 'admin') return;
    const s = this.s;
    const waiting = s.requests.filter(r => ['submitted', 'overdue', 'portal_open', 'appeal_sent'].includes(r.stage));
    if (!waiting.length) { modal(`<h2>Demo: receive a reply</h2><p>No request is waiting for a payer's reply right now. Send one first (Sent screen), then come back.</p><button class="mbtn p" data-close>OK</button>`); return; }
    const def = waiting.find(r => r.id === 'R-0416') || waiting[0];
    const opts = waiting.map(r => `<option value="${esc(r.id)}"${r.id === def.id ? ' selected' : ''}>${esc(r.id)} · ${esc(M.clientLabel(s, r.client))} · ${esc(M.payerShort(s, r.payer))} · ${esc(M.STAGE_LABEL[r.stage])}</option>`).join('');
    modal(`<h2>Demo: receive a reply</h2>
      <p style="margin:0 0 10px;color:#525B66">Payer replies cannot arrive during a demo, so this stands in for the fax or portal letter. Admins only; logged as a demo event on the request.</p>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="drq">Request</label>
      <select id="drq" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">${opts}</select>
      <label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="dun">Units (approved or offered · leave blank for the default)</label>
      <input id="dun" type="number" min="1" max="300" style="width:140px;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 10px">
        <button class="mbtn" data-k="approved">Approved</button><button class="mbtn p" data-k="partial">Partial</button><button class="mbtn" data-k="info">Information request</button><button class="mbtn" data-k="denied">Denied</button>
      </div><button class="mbtn" data-close>Cancel</button>`,
      (box, close) => box.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const id = box.querySelector('#drq').value; const units = +box.querySelector('#dun').value || undefined;
        close();
        await this.do('request.demoReply', { id, kind: b.dataset.k, units });
        const r = M.byId(this.s.requests, id);
        toast(`Demo: ${b.textContent.toLowerCase()} received for ${id} · now ${M.STAGE_LABEL[r?.stage] || ''}`);
      }));
  }
});
