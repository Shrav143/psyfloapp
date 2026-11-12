// Payer rules (screen 40, reached from the avatar menu). Reference material: what each payer tends to ask and what works, from
// state.payers (typed in by Harvest), and the 14 drafting rules every draft must pass. No rates or counts here.
import { register, Screen, M } from '../app.js';
import { PAGE_TITLE } from '../shared/labels.js';

const NAME = { anthem: 'Anthem HealthKeepers', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS · Acentra' };

export const DRAFTING_RULES = [
  ['Dates within the last 30 days', 'anything offered as current evidence; older facts carry their date'],
  ['Counts, never percentages', '"3 of 5 escalations", "6 dated occasions (Oct 2, 6, 9, 14, 20, 22)" — the forms ask that way'],
  ['Frequency, duration, intensity', 'for every behaviour named (2–3×/week · 5–20 min · moderate)'],
  ["Interventions named from Harvest's list", 'with why it was used (movement → regulation), not just that it happened'],
  ['Every note names an ISP objective', 'and states progress as a count'],
  ['No "observed"', 'direct-support notes say what the staffer did ("worked with", "prompted", "used")'],
  ['Prior services carry provider, dates and outcome', 'an empty outcome blocks the draft and asks the question; "information about outpatient" and pro-bono contacts do not count as prior care'],
  ['School counseling goes under care coordination', 'never as the failed prior service'],
  ['Criterion 3 is left blank when 1 and 2 are met', 'two of three is enough; the panel says so'],
  ['Nothing the clinician marked exclude', 'and nothing from the family that is not on the form\'s question; household disclosures stay out unless the clinician presses Include'],
  ['Trauma-informed care and the admission decision are never drafted', 'Psyflo notes when the section was discussed and leaves the box to the clinician'],
  ['Answer the question and stop', 'on information requests: three items asked, three answered, nothing added'],
  ['Vary language across days', "if a staffer's last 30 notes share a paragraph, the enhancer varies it and the supervisor sees the pattern"],
  ['Quiet day rule', 'a day with nothing to report says what was maintained and what still needed staff presence']
];

register('PayerPlaybook', class extends Screen {
  renderVals() {
    const s = this.s;
    return {
      title: PAGE_TITLE.PayerPlaybook, today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      payers: s.payers.map(p => ({ name: NAME[p.id] || M.payerShort(s, p.id), channel: M.CHANNEL_LABEL[p.channel] || p.channel, asks: p.tends_to_ask || '—', works: p.what_works || '—' })),
      rules: DRAFTING_RULES.map(([title, text], i) => ({ n: i + 1, title, text }))
    };
  }
});
