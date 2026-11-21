// Owner A (panel). The extension reports what it SEES a person do on the Lauris page. Since v2 a processed SRA waits for the
// clinical lead (stage needs_approval) before the clinician signs it; the base `lauris.observed` (lead-extension.js) still moves a
// processed SRA straight to awaiting_signature. This wrapper puts the approval step back and lets Get Signature be recorded even if
// approval was skipped (request.signed notes "Signed before approval"). If lead-extension.js is fixed, this wrapper does nothing.
import ext, { matchClient } from './lead-extension.js';

const FORM_TYPE = { 'sra-initial': 'initial', 'sra-continued': 'continued_stay' };

export default {
  'lauris.observed'(s, a, ctx) {
    const type = FORM_TYPE[a.form];
    const c = type ? matchClient(s, a.consumer) : null;
    const same = r => c && r.client === c.id && r.type === type;
    if (a.event === 'signed' && c) {
      const req = s.requests.find(r => same(r) && r.stage === 'needs_approval');
      const key = `${a.event}:${a.session || ''}:${a.consumer?.no || ''}`;
      if (req && !(s.lauris_seen || []).includes(key)) {
        (s.lauris_seen = s.lauris_seen || []).push(key);
        const lines = (a.preview?.rows || []).map(r => ({ text: `${r.label}: ${r.value}` }));
        lines.unshift({ text: a.preview?.title || 'Service authorization request', bold: true, size: 12 });
        const res = this.actions['request.signed'].call(this, s, { id: req.id, preview: lines });
        return { client: c.id, request: req.id, file: res.file };
      }
    }
    const before = a.event === 'processed' && c ? s.requests.find(r => same(r) && r.stage === 'draft_ready') : null;
    const out = ext['lauris.observed'].call(this, s, a, ctx);
    if (before && before.stage === 'awaiting_signature') {
      before.stage = 'needs_approval';
      const ev = [...s.events].reverse().find(e => e.record === before.id && /^Now in Forms to Approve/.test(e.what));
      if (ev) ev.what = 'Processed in Lauris · pending clinical approval';
    }
    return out;
  }
};
