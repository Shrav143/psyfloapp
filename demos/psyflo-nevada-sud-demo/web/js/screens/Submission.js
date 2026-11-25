// 19 · Sent — a person presses Send (Flow C). Live over the request and the audit trail.
import { register, Screen, M, raw, esc, modal, toast, api } from '../app.js';
import { pickReq, clientOf, schoolName, whoLabel, stamp, openPortal, openFile, stageCls, evHtml, levelOf, channelLabel, typeLabel, stageLabel, payerFirst, UDS_AT_ASSESSMENT, LEVEL_LABEL } from './Authorizations.js';

const SENT_STAGES = ['signed', 'sending', 'portal_open', 'submitted', 'overdue'];
const STAGE_TEXT = { submitted: ['Sent · waiting for a decision', 'chip n'], overdue: ['Overdue · no decision yet', 'chip r'], signed: ['Signed · ready to send', 'chip y'], sending: ['Faxing now…', 'chip y'], portal_open: ['Portal open · upload in your session', 'chip y'] };
const fmtD = d => d ? M.fmtDate(d) : '';
// the packet each plan gets: PA request + ASAM assessment summary + treatment plan (+ UDS result for SilverSummit, learned from denials)
function packet(s, r) {
  const c = clientOf(s, r) || {}; const tl = c.timeline || {}; const lvl = levelOf(s, r);
  const signed = !!(r.signed_pdf || r.signed_at || ['sending', 'portal_open', 'submitted', 'overdue'].includes(r.stage));
  const clin = M.staff(s, c.clinician || 'jperez');
  const asamAt = tl.assessment || tl.asam || tl.cna || tl.intake; const planAt = tl.treatment_plan || tl.isp;
  const udsAt = c.uds?.date || tl.uds || asamAt;
  const items = [
    { k: `Prior authorization request · ${LEVEL_LABEL[lvl]}${lvl === '2.1' ? ' · H0015, ' + (r.units_requested || 72) + ' units' : ''}`, src: signed ? `Signed in Client Record by ${clin.name}${clin.credential ? ', ' + clin.credential : ''}${r.signed_at ? ' · ' + fmtD(r.signed_at) : ''}` : 'Drafted by Psyflo · a clinician signs it in Client Record', status: signed ? 'signed' : 'to sign', cls: signed ? 'chip g' : 'chip y' },
    { k: 'ASAM assessment summary · six dimensions', src: asamAt ? `ASAM assessment ${fmtD(asamAt)} · D1–D6 ratings and the level-of-care decision` : 'From the ASAM assessment in Client Record', status: 'attached', cls: 'chip g' },
    { k: 'Treatment plan', src: planAt ? `Treatment plan ${fmtD(planAt)} · goals by dimension` : 'From the treatment plan in Client Record', status: 'attached', cls: 'chip g' }
  ];
  if (UDS_AT_ASSESSMENT.has(r.payer) && lvl === '2.1') items.push(udsAt
    ? { k: 'Urine drug screen result from the assessment', src: `Collected at the ASAM assessment ${fmtD(udsAt)} · lab result in Client Record. Required by ${payerFirst(s, r.payer)} for Level 2.1 initials: not on their PA form and not paid (H0048 / 80305). Psyflo learned it from 3 denials since Sep 22.`, status: 'required · attached', cls: 'chip g' }
    : { k: 'Urine drug screen result from the assessment', src: `${payerFirst(s, r.payer)} denies Level 2.1 initials without it (learned from 3 denials since Sep 22). Packet blocked until the result is attached.`, status: 'missing · blocked', cls: 'chip r' });
  else if (r.type === 'continued_stay') items.push({ k: 'UDS log since admission', src: 'Dated results from Client Record · supports the D5 argument', status: 'attached', cls: 'chip g' });
  if (r.payer === 'aetna') items.push({ k: 'CareSource PA form', src: 'Their own form · ASAM dimension ratings filled in on page 1', status: 'filled', cls: 'chip g' });
  return items;
}
const CHANNEL_HOW = { fax: 'Faxed through CCC of SN\'s e-fax account', availity: "Uploaded in Availity in the clinician's own session", portal: 'Pasted as text into the plan portal in the clinician\'s own session' };

register('Submission', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0416'], r => SENT_STAGES.includes(r.stage)); }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, crumb: 'Sent', stageText: 'nothing to send yet', stageCls: 'chip n', clock: 'no clock running', clockCls: 'chip n', payerChip: 'Fax · Availity · HPN portal', packet: [], packetTitle: '', packetNote: '', pasteText: false };
    const p = M.payer(s, r.payer); const cl = M.clientLabel(s, r.client);
    const clk = M.requestClock(s, r);
    const [stageText, sCls] = STAGE_TEXT[r.stage] || [stageLabel(r.stage), stageCls(r.stage)];
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
    if (r.sent && r.decision_due) items.push({ at: clockAt + '~', dt: stamp(s, r.sent.slice(0, 10)), html: raw(`Plan decision clock started (timeframe per contract · confirm) · decision due ${esc(M.fmtDate(r.decision_due))}.`) });
    items.sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
    if (r.stage === 'sending') items.push({ dt: 'Now', html: raw('<b>The fax is sending.</b> The reference and the delivery receipt appear here in a few seconds.') });
    if (r.stage === 'signed') items.push({ dt: 'Next', html: raw(`<b>A person presses Send.</b> ${r.channel === 'fax' ? `Psyflo faxes the packet through CCC of SN's e-fax account to ${esc(p.name)}.` : r.channel === 'portal' ? `This opens the ${esc(channelLabel(s, r))} in your own login with the text ready to paste.` : `This opens ${esc(channelLabel(s, r))} in your own login with the packet ready to upload.`}`) });
    if (r.stage === 'portal_open') items.push({ dt: 'Next', html: raw(`<b>Upload in ${esc(channelLabel(s, r))}.</b> The decision clock starts when the extension reads the portal's confirmation.`) });
    if (r.payer === 'humana' && r.receipt_check && !r.receipt_confirmed && ['submitted', 'overdue'].includes(r.stage)) items.push({ dt: stamp(s, r.receipt_check), html: raw(`<b>Receipt check call.</b> ${esc(payerFirst(s, r.payer))} receipts go missing; a person calls provider services with the script and fax reference on this page.`) });
    if (r.stage === 'submitted' && r.decision_due) {
      const d = M.daysBetween(s.today, r.decision_due);
      items.push({ dt: d === 0 ? 'Today' : M.fmtDate(r.decision_due), html: raw(d === 0 ? '<b>Decision due.</b> If nothing arrives by 5 pm the row turns overdue and an overdue notice citing the plan\'s decision timeframe is drafted for a clinician to send.' : d < 0 ? '<b>Decision overdue.</b> An overdue notice citing the plan\'s decision timeframe is ready for a clinician to send.' : '<b>Decision due.</b> If nothing arrives, an overdue notice citing the plan\'s decision timeframe is drafted for a clinician to send.') });
    }
    if (!items.length) items.push({ dt: '—', html: raw('Nothing logged on this request yet.') });
    const steps = items.map((e, i) => ({ dt: e.dt || stamp(s, e.at.replace('~', '')), html: e.html, st: i === 0 ? 'border-top:0' : '' }));

    // proof of sending
    const rcptEv = M.eventsFor(s, r.id).find(e => e.who === 'Sfax' && /receipt/i.test(e.what));
    const pdfName = r.signed_name || (r.signed_pdf && !String(r.signed_pdf).startsWith('/') ? r.signed_pdf : null);
    const proof = [
      { k: 'Signed PDF', v: r.signed_pdf ? `${pdfName || r.id + ' signed PDF'} · ${r.pages || 2} pages` : 'not signed yet · Get Signature in Client Record first' },
      { k: 'Sent via', v: r.channel === 'fax' ? "Fax · CCC of SN's e-fax account" : `${channelLabel(s, r)} · the clinician's own login` },
      { k: 'Reference', v: r.fax_ref || r.portal_ref || (r.stage === 'sending' ? 'waiting for the fax reference…' : r.stage === 'portal_open' ? 'waiting for the portal confirmation' : '—') },
      { k: 'Delivery', v: r.delivery_receipt ? raw(`Confirmed ${esc(M.fmtDateTime(rcptEv?.at || r.sent))} (<a href="${esc(r.delivery_receipt)}" target="_blank" rel="noopener">fax receipt</a>)`) : rcptEv ? `Confirmed ${M.fmtDateTime(rcptEv.at)} (fax receipt attached)` : r.portal_ref ? `Upload confirmed ${M.fmtDateTime(r.sent)} (read by the extension)` : r.stage === 'sending' ? 'waiting for the fax receipt…' : '—' }
    ];
    if (r.payer === 'humana' || r.receipt_confirmed) proof.push({ k: 'Receipt call', v: r.receipt_confirmed ? `${M.fmtDateTime(r.receipt_confirmed)} · ${whoLabel(s, r.receipt_by)} · rep confirmed` : r.receipt_check ? `due ${M.fmtDate(r.receipt_check)} · script and fax reference ready` : `after sending (${payerFirst(s, r.payer)}: day 5)` });
    if (r.overdue_notice_sent) proof.push({ k: 'Overdue notice', v: `sent ${M.fmtDateTime(r.overdue_notice_sent)}` });

    const decided = !SENT_STAGES.includes(r.stage) && !notSigned;
    const answerText = decided ? `Decision received: ${stageLabel(r.stage)}${r.units_awarded ? ' · ' + r.units_awarded + ' units' : r.units_offered ? ' · ' + r.units_offered + ' of ' + r.units_requested + ' units offered' : ''}.`
      : r.channel === 'fax' ? 'Replies arrive by fax and are matched to this request.'
      : `Decisions are read when a clinician opens ${channelLabel(s, r)}; the extension matches them to this request.`;
    const pk = packet(s, r);
    const blocked = pk.some(x => /blocked/.test(x.status));
    return {
      has: true, none: false, crumb: `${r.id} · ${cl}`, stageText, stageCls: sCls, clock: clk.text, clockCls: 'chip ' + (clk.text === 'decision due today' ? 'r' : clk.sev || 'n'),
      payerChip: `${p.name} · ${channelLabel(s, r)}`, title,
      packet: pk, packetTitle: `Packet for ${payerFirst(s, r.payer)} · ${channelLabel(s, r).toLowerCase()}`,
      packetNote: (blocked ? 'Send stays locked until every required item is attached. ' : '') + (CHANNEL_HOW[r.channel] || '') + '. Psyflo assembles it after Get Signature; a person presses Send.',
      pasteText: r.channel === 'portal',
      pdfDirect: !!r.signed_pdf && String(r.signed_pdf).startsWith('/files/'), pdfHref: r.signed_pdf, pdfMake: !!r.signed_pdf && !String(r.signed_pdf).startsWith('/files/'),
      notSigned, signHref: r.stage === 'draft_ready' ? (r.type === 'continued_stay' ? 'ExtCase.dc.html?client=' : 'ExtSRA.dc.html?client=') + r.client : 'ExtSignOff.dc.html?request=' + r.id,
      signLabel: r.stage === 'draft_ready' ? 'Open the draft in Client Record' : 'Get Signature in Client Record',
      unlockText: r.stage === 'draft_ready' ? `The draft is waiting in Client Record: a clinician reviews it in the open form and presses Process Form, then Get Signature in Forms to Approve. Psyflo never signs; it saves the signed preview as the PDF and assembles the packet (request, ASAM summary, treatment plan${UDS_AT_ASSESSMENT.has(r.payer) && levelOf(s, r) === '2.1' ? ', UDS result' : ''}), and then Send appears here.` : `${r.id} is processed and waiting in Forms to Approve. A clinician presses Get Signature there; Psyflo saves the signed preview as the PDF and assembles the packet, and then Send appears here. Psyflo never signs.`,
      canSend: canSend && !blocked, sendLabel: r.channel === 'fax' ? `Send to ${payerFirst(s, r.payer)} by fax` : `Send · open ${channelLabel(s, r)}`,
      showPortal: r.stage === 'portal_open',
      showOverdue, overdueLabel: r.overdue_notice_sent ? 'Overdue notice sent · view' : r.stage === 'overdue' ? 'Overdue notice · ready to send' : 'Overdue notice · ready if needed',
      steps, proof, answerText,
      showReceipt: r.payer === 'humana' && ['submitted', 'overdue'].includes(r.stage) && !r.receipt_confirmed, receiptLabel: 'Log the receipt check call',
      decided, decidedHref: M.requestHref(r), decidedLabel: { partial_decide: 'Decide on the partial', info_requested: 'Open the reply', denied: 'Open the denial', active: 'Open in Client Record', peer_to_peer_booked: 'Call notes', early_discharge: 'Open the step-down plan' }[r.stage] || 'Open'
    };
  }
  get anchors() {
    return {
      send: async () => {
        const r = this.req(); if (!r || r.stage !== 'signed') return;
        if (r.channel === 'fax') { await this.do('request.send', { id: r.id, by: this.me?.id || 'jperez' }); toast('Send pressed · faxing now'); }
        else { const res = await openPortal(this, 'request.send', { id: r.id, by: this.me?.id || 'jperez' }); if (res) toast(`${channelLabel(this.s, r)} opened in a new tab · ${r.channel === 'portal' ? 'paste the text' : 'upload'} there`); }
      },
      portal: () => { const r = this.req(); if (r) window.open(`${api.config.extURL}/${r.channel}/upload?request=${encodeURIComponent(r.id)}${r.info_reply_pending ? '&kind=reply' : ''}`, '_blank'); },
      pdf: () => { const r = this.req(); if (r) openFile(this, 'request.pdfCopy', { id: r.id }); },
      overdue: () => this.overdueModal(),
      receipt: () => this.receiptModal(),
      paste: () => this.pasteModal()
    };
  }
  overdueModal() {
    const s = this.s; const r = this.req(); if (!r) return;
    const p = M.payer(s, r.payer);
    const me = this.me || M.staff(s, 'jperez');
    const text = `To: ${p.name} · Utilization Management\nRe: ${typeLabel(r.type)} for member ${M.clientLabel(s, r.client, false)} · Medicaid ID on file · ${LEVEL_LABEL[levelOf(s, r)]}\n\nThe request was submitted on ${M.fmtDate(r.sent, { year: true })}${r.fax_ref ? ' by fax (reference ' + r.fax_ref + ')' : r.portal_ref ? ' through the portal (confirmation ' + r.portal_ref + ')' : ''}${r.receipt_confirmed ? ', and receipt was confirmed by phone on ' + M.fmtDate(r.receipt_confirmed) : ''}. Under the decision timeframe in our provider contract, a decision was due on ${M.fmtDate(r.decision_due, { year: true })}. We have not received one. Level 2.1 services cannot be backdated, so every day without a decision is a day of treatment we cannot bill. Please issue a decision or tell us what is missing.\n\n${me.name}${me.credential ? ', ' + me.credential : ''} · Community Counseling Center of Southern Nevada`;
    const sent = r.overdue_notice_sent;
    modal(`<h2>Overdue notice${sent ? ' · sent ' + esc(M.fmtDateTime(sent)) : ' · drafted for you to send'}</h2>
      <p style="margin:0 0 8px;color:#525B66">Cites the plan's decision timeframe (per contract · confirm) and the ${r.fax_ref ? 'fax reference' : 'portal confirmation'}. A person reads it and presses Send.</p>
      <div style="white-space:pre-wrap;border:1px solid #F0B44C;background:#FFFDF7;border-radius:8px;padding:10px 12px;font-size:13px">${esc(text)}</div>
      <div style="display:flex;gap:8px;margin-top:14px">${sent ? '' : '<button class="mbtn p" data-go>Send the notice</button>'}<button class="mbtn" data-close>${sent ? 'Close' : 'Not now'}</button></div>`,
      (box, close) => { const b = box.querySelector('[data-go]'); if (b) b.onclick = async () => { close(); await this.do('request.overdueNotice', { id: r.id }); toast('Overdue notice sent · logged on ' + r.id); }; });
  }
  pasteModal() {
    const s = this.s; const r = this.req(); if (!r) return;
    const c = clientOf(s, r) || {}; const lvl = levelOf(s, r);
    const text = `${typeLabel(r.type)} · ${LEVEL_LABEL[lvl]} · member ${M.clientLabel(s, r.client, false)} (Medicaid ID on file)\nDiagnosis: ${c.diagnosis || 'on the request'}\nRequested: ${r.units_requested} ${lvl === '2.1' ? 'units of H0015 (3 hours a day, 3 days a week)' : 'sessions'}${r.dates ? ' · ' + r.dates.split(' to ').map(d => M.fmtDate(d, { year: true })).join(' – ') : ''}\nASAM dimensions: ratings and justification as in the signed request (D1–D6).\nTreatment plan goals: as in the signed request.\nRendering clinician: individual NPI on the request · Community Counseling Center of Southern Nevada, Provider Type 17 / Specialty 215.`;
    modal(`<h2>Text to paste · ${esc(channelLabel(s, r))}</h2>
      <p style="margin:0 0 8px;color:#525B66">This plan wants text pasted into its portal form, not attachments. Psyflo builds it from the signed request; a person pastes it in their own login.</p>
      <textarea readonly rows="10" style="width:100%;border:1px solid #D9D4CC;border-radius:8px;padding:10px 12px;font:inherit;font-size:13px">${esc(text)}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Copy the text</button><button class="mbtn" data-close>Close</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => { try { await navigator.clipboard.writeText(text); toast('Copied · paste it in the portal'); } catch { toast('Select the text and copy it', 'err'); } close(); }; });
  }
  receiptModal() {
    const s = this.s; const r = this.req(); if (!r) return;
    modal(`<h2>Receipt check call · ${esc(M.payer(s, r.payer).name)}</h2>
      <p style="margin:0 0 8px;color:#525B66">A person calls provider services (number on CCC of SN's plan sheet) and types the outcome here.</p>
      <div style="border:1px solid #E6E1D9;border-radius:8px;padding:10px 12px;font-size:13px">"I'm calling to confirm you received a ${esc(typeLabel(r.type).toLowerCase())} for member ${esc(M.clientLabel(s, r.client, false))}, faxed ${esc(M.fmtDateTime(r.sent))}${r.fax_ref ? ', fax reference ' + esc(r.fax_ref) : ''}, ${r.pages || 11} pages. Can you confirm it is in clinical review?"</div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-go>Rep confirmed receipt</button><button class="mbtn" data-close>Not yet</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => { close(); await this.do('request.receiptCheck', { id: r.id, by: this.me?.id }); toast('Receipt confirmed · logged on ' + r.id); }; });
  }
});
