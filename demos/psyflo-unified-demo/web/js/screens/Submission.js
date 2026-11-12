// 19 · Sent — a person presses Send (Flow C). Live over the request and the audit trail.
import { register, Screen, M, raw, esc, modal, toast, api, session } from '../app.js';
import { pickReq, clientOf, schoolName, whoLabel, stamp, openPortal, openFile, stageCls, evHtml } from './Authorizations.js';

const SENT_STAGES = ['signed', 'sending', 'portal_open', 'submitted', 'overdue'];
const STAGE_TEXT = { submitted: ['Sent · waiting for a decision', 'chip n'], overdue: ['Overdue · no decision yet', 'chip r'], signed: ['Signed · ready to send', 'chip y'], sending: ['Sending through Sfax…', 'chip y'], portal_open: ['Portal open · upload in your session', 'chip y'] };
const payerFirst = (s, id) => id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id).split(' ')[0];

register('Submission', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0416'], r => SENT_STAGES.includes(r.stage)); }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, crumb: 'Sent', stageText: 'nothing to send yet', stageCls: 'chip n', clock: 'no clock running', clockCls: 'chip n', payerChip: 'Sfax · Availity · UHC portal' };
    const p = M.payer(s, r.payer); const cl = M.clientLabel(s, r.client);
    const clk = M.requestClock(s, r);
    const [stageText, sCls] = STAGE_TEXT[r.stage] || [M.STAGE_LABEL[r.stage] || r.stage, stageCls(r.stage)];
    const sentish = ['sending', 'portal_open', 'submitted', 'overdue'].includes(r.stage) || !!r.sent;
    const school = schoolName(s, r).replace(' · ', ' ');
    const title = `${sentish ? 'Sent to' : r.stage === 'signed' ? 'Ready to send to' : 'Not signed yet ·'} ${payerFirst(s, r.payer)} · ${cl}${school ? ' · ' + school : ''}`;
    const notSigned = ['draft_ready', 'awaiting_signature'].includes(r.stage);
    const canSend = r.stage === 'signed';
    const decisionDue = r.decision_due && r.decision_due <= s.today;
    const showOverdue = r.stage === 'overdue' || (r.stage === 'submitted' && decisionDue);

    // what happened, in order: the audit trail plus the clocks it implies
    const evs = M.eventsFor(s, r.id);
    const items = evs.map(e => ({ at: e.at, html: evHtml(s, e) }));
    // the decision clock line goes right after the send (and its Sfax receipt)
    const clockAt = evs.filter(e => e.who === 'Sfax' && r.sent && e.at.slice(0, 10) === r.sent.slice(0, 10)).map(e => e.at).concat(r.sent || []).sort().pop();
    if (r.sent && r.decision_due) items.push({ at: clockAt + '~', dt: stamp(s, r.sent.slice(0, 10)), html: raw(`Decision clock started (day 0) · the window Harvest tracks ends ${esc(M.fmtDate(r.decision_due))}.`) });
    items.sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
    if (r.stage === 'sending') items.push({ dt: 'Now', html: raw('<b>Sfax is sending.</b> The reference and the delivery receipt appear here in a few seconds.') });
    if (r.stage === 'signed') items.push({ dt: 'Next', html: raw(`<b>A clinician presses Send.</b> ${r.channel === 'fax' ? `Psyflo faxes the packet through Harvest's Sfax account to ${esc(p.name)}.` : `This opens ${esc(M.CHANNEL_LABEL[r.channel])} in your own login with the packet ready to upload.`}`) });
    if (r.stage === 'portal_open') items.push({ dt: 'Next', html: raw(`<b>Upload in ${esc(M.CHANNEL_LABEL[r.channel])}.</b> The decision clock starts when the extension reads the portal's confirmation.`) });
    if (r.payer === 'humana' && r.receipt_check && !r.receipt_confirmed && ['submitted', 'overdue'].includes(r.stage)) items.push({ dt: stamp(s, r.receipt_check), html: raw('<b>Receipt check call.</b> Humana loses faxes; a person calls provider services with the script and fax reference on this page.') });
    if (r.stage === 'submitted' && r.decision_due) {
      const d = M.daysBetween(s.today, r.decision_due);
      items.push({ dt: d === 0 ? 'Today' : M.fmtDate(r.decision_due), html: raw(d === 0 ? '<b>Decision due.</b> If nothing arrives by 5 pm the row turns overdue and an overdue notice is drafted for a clinician to send.' : d < 0 ? '<b>Decision overdue.</b> An overdue notice is ready for a clinician to send.' : '<b>Decision due.</b> If nothing arrives, an overdue notice is drafted for a clinician to send.') });
    }
    if (!items.length) items.push({ dt: '—', html: raw('Nothing logged on this request yet.') });
    const steps = items.map((e, i) => ({ dt: e.dt || stamp(s, e.at.replace('~', '')), html: e.html, st: i === 0 ? 'border-top:0' : '' }));

    // proof of sending
    const rcptEv = M.eventsFor(s, r.id).find(e => e.who === 'Sfax' && /receipt/i.test(e.what));
    const pdfName = r.signed_name || (r.signed_pdf && !String(r.signed_pdf).startsWith('/') ? r.signed_pdf : null);
    const proof = [
      { k: 'Signed PDF', v: r.signed_pdf ? `${pdfName || r.id + ' signed PDF'} · ${r.pages || 2} pages` : 'not signed yet · Get Signature in Lauris first' },
      { k: 'Sent via', v: r.channel === 'fax' ? "Sfax · Harvest's account" : `${M.CHANNEL_LABEL[r.channel]} · the clinician's own login` },
      { k: 'Reference', v: r.fax_ref || r.portal_ref || (r.stage === 'sending' ? 'waiting for Sfax…' : r.stage === 'portal_open' ? 'waiting for the portal confirmation' : '—') },
      { k: 'Delivery', v: r.delivery_receipt ? raw(`Confirmed ${esc(M.fmtDateTime(rcptEv?.at || r.sent))} (<a href="${esc(r.delivery_receipt)}" target="_blank" rel="noopener">Sfax receipt</a>)`) : rcptEv ? `Confirmed ${M.fmtDateTime(rcptEv.at)} (Sfax receipt attached)` : r.portal_ref ? `Upload confirmed ${M.fmtDateTime(r.sent)} (read by the extension)` : r.stage === 'sending' ? 'waiting for the Sfax receipt…' : '—' }
    ];
    if (r.payer === 'humana' || r.receipt_confirmed) proof.push({ k: 'Receipt call', v: r.receipt_confirmed ? `${M.fmtDateTime(r.receipt_confirmed)} · ${whoLabel(s, r.receipt_by)} · rep confirmed` : r.receipt_check ? `due ${M.fmtDate(r.receipt_check)} · script and fax reference ready` : 'after sending (Humana: day 5)' });
    if (r.overdue_notice_sent) proof.push({ k: 'Overdue notice', v: `sent ${M.fmtDateTime(r.overdue_notice_sent)}` });

    const decided = !SENT_STAGES.includes(r.stage) && !notSigned;
    const answerText = decided ? `Decision received: ${M.STAGE_LABEL[r.stage]}${r.units_awarded ? ' · ' + r.units_awarded + ' units' : r.units_offered ? ' · ' + r.units_offered + ' of ' + r.units_requested + ' units offered' : ''}.`
      : r.channel === 'fax' ? 'Replies arrive by fax and are matched to this request.'
      : `Decisions are read when a clinician opens ${M.CHANNEL_LABEL[r.channel]}; the extension matches them to this request.`;
    return {
      has: true, none: false, crumb: `${r.id} · ${cl}`, stageText, stageCls: sCls, clock: clk.text, clockCls: 'chip ' + (clk.text === 'decision due today' ? 'r' : clk.sev || 'n'),
      payerChip: `${p.name} · ${r.channel === 'fax' ? 'fax' : M.CHANNEL_LABEL[r.channel]}`, title,
      pdfDirect: !!r.signed_pdf && String(r.signed_pdf).startsWith('/files/'), pdfHref: r.signed_pdf, pdfMake: !!r.signed_pdf && !String(r.signed_pdf).startsWith('/files/'),
      notSigned, signHref: r.stage === 'draft_ready' ? (r.type === 'continued_stay' ? 'ExtCase.dc.html?client=' : 'ExtSRA.dc.html?client=') + r.client : 'ExtSignOff.dc.html?request=' + r.id,
      signLabel: r.stage === 'draft_ready' ? 'Open the draft in Lauris' : 'Get Signature in Lauris',
      unlockText: r.stage === 'draft_ready' ? `The draft is waiting in Lauris: a clinician reviews it in the open form and presses Process Form, then Get Signature in Forms to Approve. Psyflo never signs; it saves the signed preview as the PDF and assembles the packet, and then Send appears here.` : `${r.id} is processed and waiting in Forms to Approve. A clinician presses Get Signature there; Psyflo saves the signed preview as the PDF and assembles the packet, and then Send appears here. Psyflo never signs.`,
      canSend, sendLabel: r.channel === 'fax' ? `Send to ${payerFirst(s, r.payer)} by fax` : `Send · open ${M.CHANNEL_LABEL[r.channel]}`,
      showPortal: r.stage === 'portal_open',
      showOverdue, overdueLabel: r.overdue_notice_sent ? 'Overdue notice sent · view' : r.stage === 'overdue' ? 'Overdue notice · ready to send' : 'Overdue notice · ready if needed',
      steps, proof, answerText,
      showReceipt: r.payer === 'humana' && ['submitted', 'overdue'].includes(r.stage) && !r.receipt_confirmed, receiptLabel: 'Log the receipt check call',
      decided, decidedHref: M.requestHref(r), decidedLabel: { partial_decide: 'Decide on the partial', info_requested: 'Open the reply', denied: 'Open the denial', active: 'Open in Lauris', peer_to_peer_booked: 'Call notes', early_discharge: 'Open the plan' }[r.stage] || 'Open'
    };
  }
  get anchors() {
    return {
      send: async () => {
        const r = this.req(); if (!r || r.stage !== 'signed') return;
        if (r.channel === 'fax') { await this.do('request.send', { id: r.id }); toast('Send pressed · faxing through Sfax'); }
        else { const res = await openPortal(this, 'request.send', { id: r.id }); if (res) toast(`${M.CHANNEL_LABEL[r.channel]} opened in a new tab · upload there`); }
      },
      portal: () => { const r = this.req(); if (r) window.open(`${api.config.extURL}/${r.channel}/upload?request=${encodeURIComponent(r.id)}${r.info_reply_pending ? '&kind=reply' : ''}`, '_blank'); },
      pdf: () => { const r = this.req(); if (r) openFile(this, 'request.pdfCopy', { id: r.id }); },
      overdue: () => this.overdueModal(),
      receipt: () => this.receiptModal()
    };
  }
  overdueModal() {
    const s = this.s; const r = this.req(); if (!r) return;
    const p = M.payer(s, r.payer);
    const text = `To: ${p.name} · Utilization Management\nRe: ${M.TYPE_LABEL[r.type]} for member ${M.clientLabel(s, r.client, false)} · Medicaid ID on file · ${r.service}\n\nThe request was submitted on ${M.fmtDate(r.sent, { year: true })}${r.fax_ref ? ' by fax (Sfax reference ' + r.fax_ref + ')' : r.portal_ref ? ' through the portal (confirmation ' + r.portal_ref + ')' : ''}${r.receipt_confirmed ? ', and receipt was confirmed by phone on ' + M.fmtDate(r.receipt_confirmed) : ''}. We have not received a decision. Please issue a decision or tell us what is missing.\n\n${session.user ? session.user.name + (session.user.credential ? ', ' + session.user.credential : '') : 'Harvest staff'} · Harvest Outreach Center`;
    const sent = r.overdue_notice_sent;
    modal(`<h2>Overdue notice${sent ? ' · sent ' + esc(M.fmtDateTime(sent)) : ' · drafted for you to send'}</h2>
      <p style="margin:0 0 8px;color:#525B66">Cites the ${r.fax_ref ? 'fax reference' : 'portal confirmation'}, not a legal standard. A clinician reads it and presses Send.</p>
      <div style="white-space:pre-wrap;border:1px solid #F0B44C;background:#FFFDF7;border-radius:8px;padding:10px 12px;font-size:13px">${esc(text)}</div>
      <div style="display:flex;gap:8px;margin-top:14px">${sent ? '' : '<button class="mbtn p" data-go>Send the notice</button>'}<button class="mbtn" data-close>${sent ? 'Close' : 'Not now'}</button></div>`,
      (box, close) => { const b = box.querySelector('[data-go]'); if (b) b.onclick = async () => { close(); await this.do('request.overdueNotice', { id: r.id }); toast('Overdue notice sent · logged on ' + r.id); }; });
  }
  receiptModal() {
    const s = this.s; const r = this.req(); if (!r) return;
    modal(`<h2>Receipt check call · ${esc(M.payer(s, r.payer).name)}</h2>
      <p style="margin:0 0 8px;color:#525B66">A person calls provider services (number on Harvest's payer sheet) and types the outcome here.</p>
      <div style="border:1px solid #E6E1D9;border-radius:8px;padding:10px 12px;font-size:13px">"I'm calling to confirm you received a ${esc(M.TYPE_LABEL[r.type])} for member ${esc(M.clientLabel(s, r.client, false))}, faxed ${esc(M.fmtDateTime(r.sent))}${r.fax_ref ? ', Sfax reference ' + esc(r.fax_ref) : ''}, ${r.pages || 11} pages. Can you confirm it is in clinical review?"</div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-go>Rep confirmed receipt</button><button class="mbtn" data-close>Not yet</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => { close(); await this.do('request.receiptCheck', { id: r.id }); toast('Receipt confirmed · logged on ' + r.id); }; });
  }
});
