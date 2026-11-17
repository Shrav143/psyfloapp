// 53 · Claims & denials — the denial worklist over state.claims: what each denial means for that plan,
// the 180-day timely-filing clock (demo assumption · confirm per contract), the packet to send, and the
// buttons a person presses (claim.resubmit / claim.reconsider / claim.writeoff; admin "Demo: payer pays").
import { register, Screen, M, raw, esc, modal, toast, session } from '../app.js';
import { daysBetween, fmtDate, addDays } from '../shared/dates.js';

export const PLAN = { ffs: 'NV Medicaid FFS', anthem: 'Anthem', aetna: 'CareSource', uhc: 'HPN', sentara: 'Molina', humana: 'SilverSummit' };
export const PLAN_ORDER = ['ffs', 'anthem', 'aetna', 'uhc', 'sentara', 'humana'];
const CHANNEL = { humana: 'fax', anthem: 'availity', sentara: 'fax', aetna: 'fax', uhc: 'portal', ffs: 'portal' };
const OPEN = ['denied', 'at_risk', 'resubmitted', 'reconsideration'];
const ACTIONABLE = ['denied', 'at_risk'];
const AUTH_CODES = ['CO-197', 'CO-198'];
const PTYPE_CODES = ['CO-170', 'CO-185'];

export const money = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const kMoney = n => n >= 10000 ? '$' + (Math.round(n / 100) / 10).toLocaleString('en-US') + 'K' : money(n);
export const initials = (s, id) => { const c = M.byId(s.clients, id); return c?.initials || (id && /^[A-Z]{2}$/.test(id) ? id[0] + '.' + id[1] + '.' : id); };
const staffName = (s, id) => { const p = M.byId(s.staff, id); return p ? M.staffShort(s, id) : id; };
const credOf = (s, id) => ((s.credentialing || []).find(r => r.staff === id) || {}).license?.type || M.byId(s.staff, id)?.credential || '';
export const filingDays = s => s.claims_summary?.filing_days || 180;
export const daysLeft = (s, c) => filingDays(s) - daysBetween(c.dos, s.today);

function tags(s, c) {
  const t = new Set();
  const open = OPEN.includes(c.status);
  if (open) t.add('all');
  if (!open) t.add('closed');
  const dl = daysLeft(s, c);
  if (open && (dl <= 30 || c.carc === 'CO-29')) t.add('timely');
  if (open && (c.flags || []).includes('paid_then_denied')) t.add('paid');
  if (open && (PTYPE_CODES.includes(c.carc) || (c.flags || []).some(f => f === 'provider_type' || f === 'not_credentialed'))) t.add('ptype');
  if (open && (AUTH_CODES.includes(c.carc) || (c.flags || []).includes('auth'))) t.add('auth');
  return t;
}

function flagHtml(s, c) {
  const out = [];
  const f = c.flags || [];
  if (f.includes('paid_then_denied')) out.push(`<span class="chip y" title="Same code, same clinician, same client">Paid last week, denied this week</span>`);
  if (f.includes('plan_delay') && c.proof) out.push(`<span class="chip g" title="${esc(c.proof)}">Plan's own delay — proof of timely filing on file</span>`);
  else if (f.includes('plan_delay')) out.push(`<span class="chip g">Plan's own delay</span>`);
  if (f.includes('not_credentialed')) out.push(`<span class="chip r">Rendering NPI not yet enrolled with this plan</span>`);
  if (f.includes('provider_type')) out.push(`<span class="chip n">Provider-type misread (SUAM)</span>`);
  return raw(out.join(''));
}

function status(s, c) {
  switch (c.status) {
    case 'denied': return ['Denied ' + fmtDate(c.denied_on), 'chip r'];
    case 'at_risk': return ['Unpaid · no decision yet', 'chip y'];
    case 'resubmitted': return ['Resubmitted ' + fmtDate(c.resubmitted_at) + ' · waiting', 'chip n'];
    case 'reconsideration': return ['Reconsideration sent ' + fmtDate(c.reconsideration_at) + ' · waiting', 'chip n'];
    case 'recovered': return ['Recovered ' + money(c.paid_amount || c.amount) + ' · ' + fmtDate(c.paid_at), 'chip g'];
    case 'written_off': return ['Written off ' + fmtDate(c.written_off_at), 'chip n'];
    default: return [c.status, 'chip n'];
  }
}

function clock(s, c) {
  if (!OPEN.includes(c.status)) return { clock: '—', clockCls: 'chip n', clockSub: '' };
  const dl = daysLeft(s, c); const N = filingDays(s);
  const deadline = fmtDate(addDays(c.dos, N));
  if (dl < 0) return { clock: `past ${N} days`, clockCls: 'chip r', clockSub: c.proof ? 'original filing was on time · proof on file' : `${N} days · confirm per contract` };
  return { clock: dl === 0 ? 'last day today' : `${dl} day${dl === 1 ? '' : 's'} left`, clockCls: 'chip ' + (dl <= 30 ? 'r' : dl <= 60 ? 'y' : 'n'), clockSub: `${N} days · confirm per contract · ${deadline}` };
}

const PK = { reconsideration: ['Packet ready', 'chip g'], corrected: ['Corrected claim ready', 'chip g'], appeal: ['Letter drafted', 'chip g'], none: ['Nothing to send', 'chip n'] };

// "what happened, in order": the claim's own trail (actions append to it and to the audit events)
function history(s, c) {
  const list = (c.history || []).slice().sort((a, b) => a.at.slice(0, 10) < b.at.slice(0, 10) ? -1 : a.at.slice(0, 10) > b.at.slice(0, 10) ? 1 : 0);
  return list.map((h, i) => ({ dt: fmtDate(h.at), html: raw(esc(h.what).replace(/\(demo\)$/, '<span class="chip y">demo</span>')), st: i === 0 ? 'border-top:0' : '' }));
}

const FILTERS = { All: 'all', Timely: 'timely', Paid: 'paid', Ptype: 'ptype', Auth: 'auth', Closed: 'closed' };
const EMPTY = { all: 'No open denials. New ones appear here from the next 835 remit.', timely: 'Nothing inside 30 days of the filing limit.', paid: 'No paid-then-denied pairs open.', ptype: 'No provider-type or credentialing denials open.', auth: 'No authorization denials open.', closed: 'Nothing recovered or written off yet.' };

register('Claims', class extends Screen {
  init() { this.state = { tab: this.params.tab || 'all', open: this.params.id ? { [this.params.id]: true } : {} }; }
  claims() { return this.s.claims || []; }
  renderVals() {
    const s = this.s; const all = this.claims(); const sum = s.claims_summary || {};
    const t = this.state.tab;
    const tagged = all.map(c => ({ c, tags: tags(s, c) }));
    const rank = c => ACTIONABLE.includes(c.status) ? 0 : OPEN.includes(c.status) ? 1 : 2;
    const rows = tagged.filter(x => x.tags.has(t)).map(x => x.c)
      .sort((a, b) => rank(a) - rank(b) || daysLeft(s, a) - daysLeft(s, b))
      .map(c => this.row(c));

    // tiles
    const den = all.filter(c => ACTIONABLE.includes(c.status));
    const denied = all.filter(c => c.status === 'denied');
    const risk = all.filter(c => OPEN.includes(c.status) && daysLeft(s, c) >= 0 && daysLeft(s, c) <= 30);
    const month = s.today.slice(0, 7);
    const recNow = all.filter(c => c.status === 'recovered' && (c.paid_at || '').slice(0, 7) === month);
    const base = sum.recovered_month_base || { amount: 0, count: 0 };
    const recAmt = base.amount + recNow.reduce((n, c) => n + (c.paid_amount || c.amount), 0);
    const woNow = all.filter(c => c.status === 'written_off');
    const wo = sum.written_off_12mo || { amount: 0 };
    const woAmt = wo.amount + woNow.reduce((n, c) => n + c.amount, 0);

    // payer strip
    const payers = PLAN_ORDER.map(p => {
      const list = all.filter(c => c.payer === p);
      const open = list.filter(c => ACTIONABLE.includes(c.status));
      const counts = {};
      for (const c of list) if (c.carc) counts[c.carc] = (counts[c.carc] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2);
      return {
        name: PLAN[p], open: open.length ? `${open.length} open · ${money(open.reduce((n, c) => n + c.amount, 0))}` : 'nothing open',
        reasons: raw(top.map(([k, n]) => `<span class="chip ${k === 'CO-29' ? 'r' : 'n'}" title="${esc(CARC[k] || '')}">${esc(k)}${n > 1 ? ' ×' + n : ''}</span>`).join('') || '<span class="chip g">no denials</span>'),
        note: sum.payer_notes?.[p] || ''
      };
    });

    // AR aging + write-off trend (seeded demo numbers)
    const buckets = sum.ar_buckets || [];
    const maxB = Math.max(1, ...buckets.map(b => b.amount));
    const ar = buckets.map((b, i) => ({ label: b.label, amt: kMoney(b.amount), w: `width:${Math.round(b.amount / maxB * 100)}%`, cls: i >= 3 ? 'o' : '' }));
    const wm = sum.writeoff_by_month || [];
    const maxM = Math.max(1, ...wm.map(m => m.amount));
    const months = wm.map(m => ({ l: m.m, t: `${m.m}: ${money(m.amount)}`, h: `height:${Math.max(4, Math.round(m.amount / maxM * 110))}px;background:#B9541F` }));

    const vals = {
      asOf: fmtDate(s.today, { dow: true }).replace(' ', ', '),
      isAdmin: false, /* demo-only buttons live in the presenter panel (Ctrl+Shift+P) */
      kOpen: `${money(den.reduce((n, c) => n + c.amount, 0))}`,
      kOpenSub: `${denied.length} denied + ${den.length - denied.length} unpaid with no decision · on this worklist`,
      kRisk: `${risk.length} · ${money(risk.reduce((n, c) => n + c.amount, 0))}`,
      kRiskSub: `unpaid claims inside 30 days of the ${filingDays(s)}-day limit · confirm per contract`,
      kRec: kMoney(recAmt), kRecSub: `${base.count + recNow.length} claims since ${fmtDate(month + '-01')} · demo numbers`,
      kWo: kMoney(woAmt), kWoSub: (wo.note || '') + (woNow.length ? ` · +${woNow.length} today` : '') + ' · demo numbers',
      kAr: kMoney(sum.ar_over_90 || 0), arSource: sum.source || 'demo numbers',
      woNote: wo.timely ? `${kMoney(wo.timely)} of ${kMoney(wo.amount)} was timely filing · demo numbers` : 'demo numbers',
      payers, ar, months,
      rows, noRows: !rows.length, emptyText: EMPTY[t]
    };
    for (const [k, tag] of Object.entries(FILTERS)) {
      vals['n' + k] = tagged.filter(x => x.tags.has(tag)).length;
      vals['t' + k] = 'tab' + (t === tag ? ' on' : '');
      vals['pick' + k] = () => this.setState({ tab: tag });
    }
    return vals;
  }
  row(c) {
    const s = this.s; const open = !!this.state.open[c.id];
    const [st, stCls] = status(s, c);
    const pk = c.packet || { kind: 'none', items: [] };
    const [pkChip, pkCls] = PK[pk.kind] || PK.none;
    const kind = pk.kind;
    const actionable = ACTIONABLE.includes(c.status);
    const waiting = ['resubmitted', 'reconsideration'].includes(c.status);
    const code = c.carc ? c.carc + (c.rarc ? ' / ' + c.rarc : '') : 'No remit yet';
    const short = (c.plain || '').split(/(?<=\.)\s/)[0];
    const pr = c.paired;
    return {
      id: c.id, client: initials(s, c.client), dos: fmtDate(c.dos),
      rendering: `${staffName(s, c.rendering)}${credOf(s, c.rendering) ? ', ' + credOf(s, c.rendering) : ''} · NPI billed`,
      plan: PLAN[c.payer] || M.payerShort(s, c.payer), codes: (c.codes || []).join(', '), amount: money(c.amount),
      code, codeCls: 'chip ' + (c.carc ? (c.carc === 'CO-29' ? 'r' : 'b') : 'y'), short, reason: c.reason, plain: c.plain, fix: c.fix,
      ...clock(s, c), st, stCls, flags: flagHtml(s, c),
      cls: 'cr' + (open ? ' open' : ''), open, btn: open ? 'Close' : actionable ? 'Work it' : 'Details', btnCls: open ? 'btn o s' : (actionable ? 'btn p s' : 'btn o s'),
      toggle: () => this.setState({ open: { ...this.state.open, [c.id]: !open } }),
      history: history(s, c),
      hasPair: !!pr, pair: pr ? `Paid last week, denied this week: ${pr.claim} (DOS ${fmtDate(pr.dos)}, same code, same clinician, same client) was paid ${money(pr.amount)} on ${fmtDate(pr.paid)}.` : '',
      pkTitle: pk.title || 'Packet', pkChip, pkCls, pkItems: pk.items || [], hasItems: !!(pk.items && pk.items.length),
      pkHref: pk.href || '', pkLink: /AppealLetter/.test(pk.href || '') ? 'Open the reconsideration letter' : 'Open',
      canAct: actionable, waiting,
      waitText: waiting ? `Waiting on ${PLAN[c.payer]}${c.reconsideration_ref ? ' · Sfax ref ' + c.reconsideration_ref : ''}.` : '',
      closedText: c.status === 'recovered' ? `Paid ${money(c.paid_amount || c.amount)} on ${fmtDate(c.paid_at)}.` : c.status === 'written_off' ? `Written off ${fmtDate(c.written_off_at)}${c.writeoff_reason ? ' · ' + c.writeoff_reason : ''}.` : '',
      bResub: kind === 'corrected' ? 'btn p s' : 'btn o s',
      bRecon: kind === 'reconsideration' || kind === 'appeal' ? 'btn p s' : 'btn o s',
      resubmit: () => this.resubmit(c), reconsider: () => this.reconsider(c), writeoff: () => this.writeoff(c), pay: () => this.pay(c)
    };
  }
  async resubmit(c) {
    await this.do('claim.resubmit', { id: c.id, by: this.me?.id });
    toast(`${c.id} marked corrected and resubmitted · the clock keeps running until the remit`);
  }
  reconsider(c) {
    const s = this.s; const ch = CHANNEL[c.payer]; const plan = PLAN[c.payer];
    const how = ch === 'fax' ? `Faxed to ${esc(plan)} through Sfax when you press Send. The delivery receipt is saved on the claim.` : `Upload it in your own ${ch === 'availity' ? 'Availity' : esc(plan) + ' portal'} session, then press Send here to log it.`;
    const items = (c.packet?.items || []).map(i => `<li>${esc(i)}</li>`).join('');
    modal(`<h2>Send reconsideration · ${esc(c.id)}</h2>
      <p style="margin:0 0 8px">${esc(initials(s, c.client))} · DOS ${esc(fmtDate(c.dos))} · ${esc(plan)} · ${esc(money(c.amount))} · ${esc(c.carc || '')}</p>
      ${items ? `<ul style="margin:0 0 10px;padding-left:18px;font-size:13px">${items}</ul>` : ''}
      <p style="color:#525B66;font-size:13px;margin:0 0 6px">${how}</p>
      ${c.packet?.href && /AppealLetter/.test(c.packet.href) ? `<p style="font-size:13px;margin:0 0 6px">Read the letter first: <a href="#/AppealLetter?id=R-0384" data-close>open the reconsideration letter</a>.</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Send</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        close();
        const r = await this.do('claim.reconsider', { id: c.id, by: this.me?.id });
        toast(r?.ref ? `Reconsideration faxed · Sfax ref ${r.ref}` : `Reconsideration logged on ${c.id}`);
      });
  }
  writeoff(c) {
    const s = this.s;
    modal(`<h2>Write off ${esc(c.id)}?</h2>
      <p style="margin:0 0 8px">${esc(initials(s, c.client))} · DOS ${esc(fmtDate(c.dos))} · ${esc(PLAN[c.payer])} · <b>${esc(money(c.amount))}</b></p>
      <p style="color:#525B66;font-size:13px;margin:0 0 10px">This moves the claim to bad debt in the worklist. It stays in the history and can be found under Recovered · written off.${c.proof ? ' Proof of timely filing is on file; a reconsideration may still recover it.' : ''}</p>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="woR">Reason (optional)</label>
      <input id="woR" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit" value="${esc(c.carc === 'CO-96' ? 'plan does not cover UDS' : c.carc === 'CO-197' ? 'no backdating · day before PA decision' : '')}">
      <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-go>Write off ${esc(money(c.amount))}</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const reason = box.querySelector('#woR').value.trim();
        close();
        await this.do('claim.writeoff', { id: c.id, by: this.me?.id, reason });
        toast(`${c.id} written off · ${money(c.amount)}`);
      });
  }
  async pay(c) {
    if (session.user?.role !== 'admin') return;
    await this.do('claim.recovered', { id: c.id });
    toast(`Demo: ${PLAN[c.payer]} paid ${c.id} · ${money(c.amount)} recovered`);
  }
  get anchors() {
    return {
      demoPay: () => {
        if (session.user?.role !== 'admin') return;
        const s = this.s; const waiting = this.claims().filter(c => ['reconsideration', 'resubmitted'].includes(c.status));
        if (!waiting.length) { modal(`<h2>Demo: payer pays</h2><p>No claim is waiting on a plan right now. Send a reconsideration or mark a corrected claim resubmitted first.</p><button class="mbtn p" data-close>OK</button>`); return; }
        const opts = waiting.map(c => `<option value="${esc(c.id)}">${esc(c.id)} · ${esc(initials(s, c.client))} · ${esc(PLAN[c.payer])} · ${esc(money(c.amount))}</option>`).join('');
        modal(`<h2>Demo: payer pays</h2>
          <p style="margin:0 0 10px;color:#525B66">Remits cannot arrive during a demo, so this stands in for the 835. Admins only; logged as a demo event on the claim.</p>
          <select id="dpc" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">${opts}</select>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-go>Pay it</button><button class="mbtn" data-close>Cancel</button></div>`,
          (box, close) => box.querySelector('[data-go]').onclick = async () => {
            const id = box.querySelector('#dpc').value; close();
            const c = M.byId(this.claims(), id); if (c) await this.pay(c);
          });
      }
    };
  }
});

// standard CARC wording (short), for tooltips
export const CARC = {
  'CO-16': 'Claim/service lacks information or has submission/billing error(s)',
  'CO-18': 'Exact duplicate claim/service',
  'CO-29': 'The time limit for filing has expired',
  'CO-50': 'Not deemed a medical necessity by the payer',
  'CO-96': 'Non-covered charge(s)',
  'CO-170': 'Payment denied when performed/billed by this type of provider',
  'CO-185': 'The rendering provider is not eligible to perform the service billed',
  'CO-197': 'Precertification/authorization/notification absent',
  'CO-198': 'Precertification/authorization exceeded'
};
