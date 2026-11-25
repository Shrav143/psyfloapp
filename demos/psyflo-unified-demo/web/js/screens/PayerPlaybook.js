// 40 · Payer playbook (Seeded). Table from state.payers; the 14 drafting rules from the brief.
// Partial rates are shown as counts ("23 of 31"), the brief's counts-not-percentages rule.
import { register, Screen, M } from '../app.js';

const NAME = { anthem: 'Anthem HealthKeepers', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS · Acentra' };
const CHANNEL = { fax: 'Fax', availity: 'Availity', portal: 'Portal' };

export const DRAFTING_RULES = [
  ["Dates within the last 30 days", "anything offered as current evidence; older facts carry their date"],
  ["Counts, never percentages", "\"3 of 5 weekly screens negative\", \"6 dated use episodes (Oct 2, 6, 9, 14, 20, 22)\": the forms ask that way"],
  ["Every dimension rated Moderate or higher is documented", "a rating of 2 or more needs an instrument score or dated records for that dimension (D1 withdrawal screen, D3 PHQ-9 or GAD-7, D5 dated use or screens); a rating of None or Mild is not argued"],
  ["Interventions named from Harvest's list", "with why it was used (refusal skills practice before a weekend party), not just that it happened"],
  ["Every note names a treatment plan goal", "and states progress as a count"],
  ["No \"observed\"", "direct-support notes say what the staffer did (\"worked with\", \"prompted\", \"used\")"],
  ["Prior treatment names the level, provider, dates and outcome", "an empty outcome blocks the draft and asks the question; \"information about outpatient\" and pro-bono contacts do not count as prior care"],
  ["Referral partner counseling goes under care coordination", "never as the failed prior treatment"],
  ["State the level and the dimensions that drive it", "the draft names the dimensions that are above the next lower level, from the stored ratings; when the ratings fit a lower level it asks the clinician for the reason"],
  ["Nothing the clinician marked exclude", "and nothing from the family that is not on the form's question; household disclosures stay out unless the clinician presses Include"],
  ["Psyflo never rates a dimension or chooses a level", "ratings and the level recommendation are the clinician's; drafts quote the stored assessment and leave a blank where the clinician must decide"],
  ["Answer the question and stop", "on information requests: three items asked, three answered, nothing added"],
  ["Vary language across days", "if a staffer's last 30 notes share a paragraph, the enhancer varies it and the supervisor sees the pattern"],
  ["Quiet day rule", "a day with no use, no cravings and no concerns says what skill was practiced and what still needs follow-up"]
];

register('PayerPlaybook', class extends Screen {
  renderVals() {
    const s = this.s;
    const total = s.payers.reduce((a, p) => a + (p.requests_this_year || 0), 0);
    const imported = s.migration?.last_export || s.today;
    return {
      trackerChip: `Sample data, illustrative · ${total} requests · seeded ${M.fmtDate(imported)}`,
      payers: s.payers.map(p => {
        const n = p.requests_this_year || 0;
        const partial = n >= 10 && p.partial_rate != null ? `partial ${Math.round(p.partial_rate * n)} of ${n}` : `${n} request${n === 1 ? '' : 's'}`;
        return { name: NAME[p.id] || p.name, partial, channel: CHANNEL[p.channel] || p.channel, days: p.decides_in_days != null ? p.decides_in_days + ' d' : '—', asks: p.tends_to_ask || '—', works: p.what_works || '—' };
      }),
      rules: (s.drafting_rules && s.drafting_rules.length ? s.drafting_rules.map(r => [r.title, r.text]) : DRAFTING_RULES).map(([title, text], i) => ({ n: i + 1, title, text, style: i === 0 ? 'border-top:0;padding-top:0' : '' }))
    };
  }
});
