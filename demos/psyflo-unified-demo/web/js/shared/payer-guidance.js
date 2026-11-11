// Payer guidance (E3): what a payer wants, how to send to it and its clocks, each with a source chip.
// Replaces the PayerPlaybook table. Pure: `payerGuidance(s, slug)` returns data; `payerGuidanceBody(g, ui)` turns it into the HTML of a
// drawer (the Denial case workspace opens it; Analytics > Payer can reuse it): ui.drawer({ title: g.title, body: payerGuidanceBody(g, ui) }).
// The payer figures (decides_in_days, partial_rate, requests_this_year, tends_to_ask, what_works) are seeded sample data: they carry the
// provenance chip "Sample data, illustrative" (state.provenance.payer_stats = harvest_export), never "Harvest's data".
import { rule, ruleValue } from './rules.js';

const CHANNEL = { fax: 'Fax through Harvest\'s Sfax account', availity: 'Availity, in the clinician\'s own login', portal: 'UnitedHealthcare provider portal, in the clinician\'s own login' };
const SHORT = { anthem: 'Anthem HealthKeepers', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS · Acentra' };

export function payerGuidance(s, slug) {
  const p = (s.payers || []).find(x => x.id === slug);
  if (!p) return null;
  const chan = ruleValue(s, 'payers.channels', {})[slug] || p.channel;
  const n = p.requests_this_year || 0;
  const clocks = [
    { key: 'info_request.hours', label: 'Information request: reply window', value: `${ruleValue(s, 'info_request.hours', 24)} hours (calendar); the payer message states its own and that wins`, rule: rule(s, 'info_request.hours', slug) },
    { key: 'decision.followup_day', label: 'Follow-up call on the decision', value: `day ${ruleValue(s, 'decision.followup_day', 10, slug)}`, rule: rule(s, 'decision.followup_day', slug) },
    { key: 'decision.overdue_after_days', label: 'Decision overdue after', value: `${ruleValue(s, 'decision.overdue_after_days', 14, slug)} days`, rule: rule(s, 'decision.overdue_after_days', slug) },
    { key: 'p2p.attempts', label: 'Peer-to-peer', value: `${ruleValue(s, 'p2p.attempts', 1)} attempt; the payer calls to agree a time`, rule: rule(s, 'p2p.attempts', slug) },
    { key: 'appeal.window_days', label: 'Guardian appeal window', value: `${ruleValue(s, 'appeal.window_days', 60)} days from the notice; confirm on the letter`, rule: rule(s, 'appeal.window_days', slug) }
  ];
  if (slug === 'uhc') clocks.push({ key: 'packet.uhc.attachments', label: 'Attachments with the request', value: (ruleValue(s, 'packet.uhc.attachments', []) || []).join(' and '), rule: rule(s, 'packet.uhc.attachments') });
  const sample = (s.provenance && s.provenance.payer_stats) || 'harvest_export';
  return {
    id: slug, name: p.name, title: `${(SHORT[slug] || p.name)} · guidance`, channel: chan, channelText: CHANNEL[chan] || chan, channelRule: rule(s, 'payers.channels'),
    wants: p.what_works || '', asks: p.tends_to_ask || '', partial: n >= 10 && p.partial_rate != null ? `partial ${Math.round(p.partial_rate * n)} of ${n} requests` : `${n} request${n === 1 ? '' : 's'} this year`, decidesIn: p.decides_in_days,
    clocks, provenance: sample === 'harvest_export' ? 'Sample data, illustrative' : sample, notes: [p.id === 'ffs' ? 'Too few requests to say what works.' : ''].filter(Boolean)
  };
}

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function payerGuidanceBody(g, ui) {
  if (!g) return '<p class="ui-muted">No guidance on file for this payer.</p>';
  const row = (k, v) => `<div class="ui-dl__r"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  return `<dl class="ui-dl">
    ${row('How to send', `${esc(g.channelText)} ${ui.sourceChip(g.channelRule)}`)}
    ${row('What the payer wants', g.wants ? `${esc(g.wants)} ${ui.chip(g.provenance, { tone: 'outline', size: 'sm' })}` : '<span class="ui-muted">Not recorded</span>')}
    ${row('What it tends to ask', g.asks ? `${esc(g.asks)} ${ui.chip(g.provenance, { tone: 'outline', size: 'sm' })}` : '<span class="ui-muted">Not recorded</span>')}
    ${row('This year', `${esc(g.partial)} ${ui.chip(g.provenance, { tone: 'outline', size: 'sm' })}`)}
  </dl>
  <h3 style="font-size:14px;margin:16px 0 4px">Clocks</h3>
  <dl class="ui-dl">${g.clocks.map(c => row(c.label, `${esc(c.value)} ${ui.sourceChip(c.rule)}`)).join('')}</dl>
  <p class="ui-muted">The payer's own message always wins over a number here. Figures marked Sample data are illustrative, not Harvest's.</p>`;
}
