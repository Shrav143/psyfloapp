// Request-screen actions (Authorizations, Sent, Info request, Partials, Early discharge, Peer-to-peer).
import { fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf } from '../../pdf.js';
import { Refusal } from '../gates.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);

export default {
  // Seeded requests (canvas snapshot) carry only the signed PDF's file name: the file itself lives in
  // Harvest's Psyflo store, not in this demo's seed. This re-creates a clearly-labelled demo copy so the
  // "Open the signed PDF" link opens a real PDF. No event: nothing happened to the request.
  // Opens ONLY a stored signed proof. A request that was signed before the pilot carries just a file name; Psyflo never generates a
  // signed artifact after the fact (RE-6): the signed copy is in Lauris.
  'request.pdfCopy'(s, { id }) {
    const r = byId(s.requests, id); if (!r) throw new Error('Request not found');
    if (r.signed_pdf && String(r.signed_pdf).startsWith('/files/')) return { url: r.signed_pdf };
    throw new Refusal('Psyflo holds no signed PDF for ' + id + ': the signed copy is in Lauris (Forms to Approve / Active File).', { status: 404, audit: false, code: 'no_proof' });
    const c = byId(s.clients, r.client);
    const p = byId(s.payers, r.payer);
    const name = r.signed_pdf && !String(r.signed_pdf).startsWith('/') ? r.signed_pdf : `${r.id}_${c?.initials || r.client}_${r.type}_signed.pdf`;
    const file = this.writeFile(name, makePdf([
      { text: 'Lauris Online · Forms to Approve · signed preview', size: 9 },
      { text: (r.type === 'continued_stay' ? 'CMHRS Continued Stay' : 'TDT Initial SRA (H2016)') + ' · ' + r.id, size: 14, bold: true },
      { text: 'Member: ' + (c ? c.initials + (c.age ? ', ' + c.age : '') : r.client) + ' · Medicaid ID on file' },
      { text: 'To: ' + (p?.name || r.payer) },
      { text: 'Service: ' + r.service + ' · ' + r.units_requested + ' units' + (r.dates ? ' · ' + r.dates.replace(' to ', ' – ') : '') },
      { text: 'Signed in Lauris by Jordan Perez, LPC' + (r.signed_at ? ' · ' + fmtDateTime(r.signed_at, { year: true }) : r.sent ? ' · ' + fmtDate(r.sent, { year: true }) : ''), bold: true, gap: 12 },
      { text: 'Demo copy: the seeded request carries only the file name, so this page stands in for the signed preview. Synthetic data · nothing is real.', size: 9, gap: 14 }
    ], { title: r.id + ' signed (demo copy)' }));
    s.files.push({ ...file, kind: 'signed_pdf', record: id, at: this.now() });
    r.signed_pdf = file.url; r.signed_name = name;
    return { url: file.url };
  }
};
