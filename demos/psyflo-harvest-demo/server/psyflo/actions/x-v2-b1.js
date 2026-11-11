// Owner B1 actions (Worklist, Authorizations, Referral, Eligibility). Unique names, all prefixed b1.
// Nothing here talks to Lauris; these are Psyflo's own tracker writes and stand-in documents.
import { fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf, jpegSize } from '../../pdf.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const payerName = (s, id) => (byId(s.payers, id) || {}).name || id;
const FUNDING = ['TDT', 'SEBS', 'Outpatient'];

export default {
  // The fax was not found at the payer (day-10 call): send the packet again. Clears the resend flag, then does what Send does.
  'b1.resend'(s, { id, by = 'jperez' }) {
    const r = need(byId(s.requests, id), 'Request');
    delete r.resend;
    this.event('Resend pressed · the payer did not have the fax', by, id);
    return this.actions['request.send'].call(this, s, { id, by });
  },

  // Seeded requests carry no Sfax receipt file: re-create a clearly labelled demo copy so "Fax receipt" opens a real PDF.
  'b1.receiptCopy'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.delivery_receipt && String(r.delivery_receipt).startsWith('/files/')) return { url: r.delivery_receipt };
    const sentAt = r.sent || s.today;
    const file = this.writeFile(`${r.id}_sent_fax_${r.fax_ref || 'receipt'}.pdf`, makePdf([
      { text: 'Sfax delivery receipt', size: 14, bold: true },
      { text: 'Reference ' + (r.fax_ref || '-') + ' · ' + fmtDateTime(sentAt, { year: true }) },
      { text: 'To: ' + payerName(s, r.payer) + ' · utilization management fax (demo)' },
      { text: 'Pages: ' + (r.pages || 11) },
      { text: 'Demo copy: the seeded request carries no receipt file. Synthetic data · nothing is real.', size: 9, gap: 14 }
    ], { title: 'Sfax receipt ' + (r.fax_ref || r.id) }));
    s.files.push({ ...file, kind: 'fax_receipt', record: id, at: this.now() });
    r.delivery_receipt = file.url;
    return { url: file.url };
  },

  // Funding source on the Referral page. SEBS is routed with referral.routeGrant by the screen; TDT and Outpatient land here.
  // Moving back to TDT or Outpatient takes a referral out of the grant program.
  'b1.setFunding'(s, { id, funding, by = 'jperez' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    if (!FUNDING.includes(funding)) throw new Error('Funding source is TDT, SEBS or Outpatient');
    r.funding = funding;
    if (funding !== 'SEBS' && r.stage === 'grant_program') {
      r.stage = 'needs_screening';
      r.next = r.eligibility ? 'Schedule the screening call' : 'Send the family link';
    }
    this.event('Funding source set to ' + funding, by, id);
    return { funding };
  },

  // "Ask school" next to a missing attachment: logs the request to the counselor (email stub) and keeps the referral where it is,
  // so the family link and the eligibility check can go on in parallel.
  'b1.askSchool'(s, { id, item, by = 'jperez' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.form = r.form || {};
    r.form.asked_on = s.today;
    r.asked = { ...(r.asked || {}), [item]: { at: this.now(), by } };
    this.event('Counselor asked for ' + String(item).replace(/_/g, ' ') + ' (email stub)', by, id);
    return { asked: item };
  },

  // The dated screenshot for a weekly re-verification, kept in Psyflo (not in Lauris). `image` is an optional JPEG data URL
  // from the file the person picked; without it a labelled stand-in is written (the demo's "Use the DMAS screenshot").
  // The screen then calls eligibility.verify with the returned name.
  'b1.eligibilityProof'(s, { client, result = 'active', plan, image, by = 'jperez' }) {
    const c = byId(s.clients, client);
    const label = (c ? c.initials : String(client)).replace(/[^\w]/g, '');
    const hhmm = this.now().slice(11, 16).replace(':', '');
    const name = `DMAS_${label}_${s.today}_${hhmm}.pdf`;
    const who = byId(s.staff, by)?.name || by;
    const blocks = [
      { text: 'Virginia Medicaid (DMAS) · eligibility lookup', size: 14, bold: true },
      { text: 'Dated proof kept in Psyflo, not in Lauris', size: 9 },
      { text: 'Member: ' + (c ? c.initials : client) },
      { text: 'Result: ' + result + (plan ? ' · ' + payerName(s, plan) : '') },
      { text: 'Looked up by ' + who + ' in their own DMAS login · ' + fmtDateTime(this.now(), { year: true }), bold: true, gap: 10 }
    ];
    if (typeof image === 'string' && image.includes(',')) {
      const buf = Buffer.from(image.split(',')[1], 'base64'); const sz = jpegSize(buf);
      if (sz) blocks.push({ image: buf, w: sz.w, h: sz.h, width: 480 });
    } else blocks.push({ text: 'Demo stand-in for the screenshot the person took. Synthetic data · nothing is real.', size: 9, gap: 12 });
    const file = this.writeFile(name, makePdf(blocks, { title: name }));
    s.files.push({ ...file, kind: 'eligibility_proof', record: client, at: this.now() });
    return { name: file.name, url: file.url };
  }
};
