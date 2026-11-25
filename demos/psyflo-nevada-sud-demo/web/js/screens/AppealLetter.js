// 39 · Reconsideration / appeal letter (app screen, clinician and up). Live: ?id (default R-0384, E.C., Anthem).
// Psyflo drafts the letter from the denial and the record; a person can change the wording, then signs it
// (request.reconsiderSign) → signed PDF saved, request marked "Reconsideration sent". Psyflo never signs.
import { register, Screen, M, raw, esc, modal, toast } from '../app.js';
import { pickReq, clientOf, historyRows, payerFirst, channelLabel, stageLabel, stageCls } from './Authorizations.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const isProviderType = r => /provider|type|specialty|eligible|scope/i.test(r.denial_reason || '');
const steps = list => list.map((e, i) => ({ ...e, st: i === 0 ? 'border-top:0' : '' }));

register('AppealLetter', class extends Screen {
  init() { this.state = { editing: false, text: null }; }
  req() { return pickReq(this.s, this.params.id, ['R-0384'], r => ['denied', 'appeal_sent'].includes(r.stage)); }
  // who rendered the denied service: the client's mental-health therapist if there is one, else the clinician
  renderer(c) { const st = c?.staff && M.byId(this.s.staff, c.staff); const id = c?.therapist || (st && /LCPC|LCSW|LMFT/.test(st.credential || '') ? c.staff : M.byId(this.s.staff, 'slane') ? 'slane' : c?.clinician || 'jperez'); return M.staff(this.s, id); }
  draft(r) {
    const s = this.s; const c = clientOf(s, r) || {}; const p = M.payer(s, r.payer); const pf = payerFirst(s, r.payer);
    const th = this.renderer(c); const thName = th.name + (th.credential ? ', ' + th.credential : '');
    const code = (r.service || '').match(/9083\d/)?.[0] || '90837';
    const me = this.me || M.staff(s, 'jperez');
    const reason = r.denial_reason || 'not given';
    if (!isProviderType(r)) return `${longDate(s.today)}\n\n${p.name} · Provider disputes / reconsiderations\nVia ${channelLabel(s, r)}\n\nRe: Request for reconsideration · ${r.id} · Member ${c.initials || r.client} · Medicaid ID on file\nDenied ${longDate(r.denied_on)}: "${reason}"\n\nWe ask ${pf} to reconsider this decision. The attached record shows, by ASAM dimension and with dates, why the requested level of care is medically necessary. Please reprocess the request as submitted, or tell us what is missing.\n\nSincerely,\n\n${me.name}${me.credential ? ', ' + me.credential : ''}\nCommunity Counseling Center of Southern Nevada · Las Vegas, Nevada`;
    return `${longDate(s.today)}

${p.name} · Provider disputes / reconsiderations
Via ${channelLabel(s, r)}

Re: Request for reconsideration · ${r.id} · Member ${c.initials || r.client} · Medicaid ID on file · DOB on file
Service: ${code} psychotherapy, 60 minutes · rendering clinician ${thName} (individual NPI on the claim)
Denied ${longDate(r.denied_on)}: "${reason}"

We ask ${pf} to reconsider and reprocess this request. The denial reads Community Counseling Center of Southern Nevada's Nevada Medicaid enrollment, Provider Type 17, Specialty 215 (Substance Use Agency Model), as limited to substance use services. It is not:

1. CCC of SN's Nevada Medicaid enrollment as a Substance Use Agency Model provider covers mental-health services as well as substance use treatment. The enrollment letter is attached.

2. ${thName}, who provided the service, is enrolled with Nevada Medicaid under their own NPI and credentialed with ${pf} individually; the approval letters are attached. Since the provider-type change, every CCC of SN clinician is billed under their own NPI, not the agency's.

3. ${code} is within the scope of a licensed ${/LCPC/.test(th.credential || '') ? 'clinical professional counselor' : 'clinician'}, and ${c.initials || 'the member'}'s treatment plan includes mental-health therapy alongside Level 1 substance use treatment (treatment plan attached).

Please reprocess ${code} as submitted. ${pf} has paid ${code} for CCC of SN clients under this same enrollment before; examples are attached. If anything else is needed, please contact me directly.

Sincerely,

${me.name}${me.credential ? ', ' + me.credential : ''}
${me.title || 'Clinical director'} · Community Counseling Center of Southern Nevada · Las Vegas, Nevada`;
  }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, crumb: 'Reconsideration letter', stageText: 'nothing denied', stageCls: 'chip n', clock: 'no clock running', clockCls: 'chip n', payerChip: 'Availity · fax' };
    const c = clientOf(s, r) || {}; const p = M.payer(s, r.payer); const pf = payerFirst(s, r.payer);
    const th = this.renderer(c); const thName = th.name + (th.credential ? ', ' + th.credential : '');
    const sent = r.stage === 'appeal_sent' || !!r.appeal?.signed_at;
    const text = sent && r.appeal?.text ? r.appeal.text : (this.state.text ?? this.draft(r));
    const pt = isProviderType(r);
    const code = (r.service || '').match(/9083\d/)?.[0] || '90837';
    const clk = M.requestClock(s, r);
    const facts = pt ? [
      { k: 'Agency enrollment', v: 'Nevada Medicaid Provider Type 17, Specialty 215 · Substance Use Agency Model (demo assumption · confirm against the letter on file)' },
      { k: 'What it covers', v: 'Substance use treatment and mental-health services' },
      { k: 'Rendering clinician', v: `${thName} · own NPI · credentialed with ${pf} individually` },
      { k: 'Code denied', v: `${code} · psychotherapy, 60 minutes` },
      { k: 'Diagnosis on the claim', v: c.diagnosis || 'on the claim' },
      { k: 'Ask', v: 'Reprocess as submitted' }
    ] : [
      { k: 'Reason given', v: r.denial_reason || 'not given' },
      { k: 'Level of care', v: 'As in the signed request, by ASAM dimension' },
      { k: 'Ask', v: 'Reconsider and reprocess as submitted' }
    ];
    const attached = steps((pt ? [
      ['Enrollment', 'Nevada Medicaid enrollment letter · PT 17 / Specialty 215, mental-health services included'],
      ['Credentialing', `${thName}: Nevada Medicaid approval and ${pf} credentialing letter`],
      ['Denial', `${pf} denial${r.denied_on ? ' of ' + M.fmtDate(r.denied_on) : ''} · reason as quoted`],
      ['Treatment plan', 'Mental-health goals alongside Level 1 SUD treatment'],
      ['Paid examples', `Earlier ${pf} payments for ${code} under the same enrollment`]
    ] : [
      ['Denial', `${pf} denial${r.denied_on ? ' of ' + M.fmtDate(r.denied_on) : ''}`],
      ['Request', 'The signed request as sent'],
      ['Record', 'ASAM assessment, treatment plan, attendance and UDS log']
    ]).map(([dt, h]) => ({ dt, html: h })));
    const hist = historyRows(s, r);
    const me = this.me || M.staff(s, 'jperez');
    return {
      none: false, has: true, crumb: `${r.id} · ${M.clientLabel(s, r.client)}`,
      stageText: sent ? 'Reconsideration signed' : stageLabel(r.stage), stageCls: sent ? 'chip g' : stageCls(r.stage),
      clock: sent ? `signed ${M.fmtDate(r.appeal?.signed_at || s.today)}` : clk.text.replace(/appeal window/i, 'reconsideration window'), clockCls: 'chip ' + (sent ? 'n' : clk.sev || 'n'),
      payerChip: `${p.name} · ${channelLabel(s, r)}`, pf,
      title: `Reconsideration · ${M.clientLabel(s, r.client)} · ${pf}${pt ? ' · ' + code + ' provider-type denial' : ''}`,
      subtitle: pt ? `${pf}'s reviewer read the Substance Use Agency Model provider type as SUD-only. The letter asks for reprocessing.` : 'Drafted from the denial and the record.',
      reason: r.denial_reason || 'not given',
      readAs: pt ? `Plain words: the reviewer saw "Substance Use" in CCC of SN's provider type and decided a mental-health code (${code}) could not be billed. The enrollment says otherwise, and ${thName} is credentialed in their own name.` : 'Psyflo answers the reason given, with dated facts from the record.',
      text, editing: this.state.editing && !sent, editLabel: this.state.editing ? 'Done editing' : 'Edit the letter',
      onEdit: e => { this.state.text = e.target.value; },
      draftNote: sent ? `Signed by ${r.appeal?.signer || ''} · ${M.fmtDateTime(r.appeal?.signed_at || s.today)}` : this.state.text != null ? 'Edited · you sign it, then send it' : 'Drafted by Psyflo from the denial and the record · you check it, sign it and send it',
      facts, attached,
      whoText: `A person signs: ${me.name}${me.credential ? ', ' + me.credential : ''} types their name and confirms. Psyflo saves the signed PDF; ${r.channel === 'availity' ? `${pf} takes reconsiderations through Availity, so the signer uploads it there in their own session.` : r.channel === 'fax' ? 'it goes by fax from CCC of SN\'s e-fax account.' : 'the signer uploads it in the plan portal in their own session.'} Psyflo never signs or sends on its own.`,
      sent, sentText: sent ? `Signed ${M.fmtDateTime(r.appeal?.signed_at || s.today)} by ${r.appeal?.signer || ''}. Waiting for ${pf}.` : '', fileHref: r.appeal?.file || '#',
      steps: hist.length ? hist : steps([{ dt: '—', html: raw('Nothing logged on this request yet.') }])
    };
  }
  get anchors() {
    return {
      edit: () => { const on = !this.state.editing; this.setState({ editing: on }); if (on) setTimeout(() => document.getElementById('letter')?.focus(), 30); },
      sign: () => this.sign()
    };
  }
  sign() {
    const r = this.req(); if (!r || r.stage === 'appeal_sent') return;
    const me = this.me || M.staff(this.s, 'jperez');
    const def = me.name + (me.credential ? ', ' + me.credential : '');
    const text = this.state.text ?? this.draft(r);
    modal(`<h2>Sign the reconsideration · ${esc(r.id)}</h2>
      <p style="margin:0 0 10px;color:#525B66">You are signing the letter as shown. Psyflo saves the signed PDF; it does not sign for you.</p>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="rsName">Your name and credential</label>
      <input id="rsName" type="text" value="${esc(def)}" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-top:10px"><input id="rsOk" type="checkbox" style="width:18px;height:18px;accent-color:#217A78;margin-top:1px"> I have read this letter and I sign it</label>
      <p class="err" style="color:#8A2E1C;font-size:13px;margin:6px 0 0" hidden>Type your name and tick the box.</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Sign</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const signer = box.querySelector('#rsName').value.trim();
        if (!signer || !box.querySelector('#rsOk').checked) { box.querySelector('.err').hidden = false; return; }
        close();
        const res = await this.do('request.reconsiderSign', { id: r.id, text, signer, by: this.me?.id || 'jperez' });
        if (!res) return;
        this.setState({ editing: false });
        toast(r.channel === 'availity' ? 'Signed · PDF saved · upload it in Availity in your own session' : 'Signed · PDF saved · logged on ' + r.id);
      });
  }
});
