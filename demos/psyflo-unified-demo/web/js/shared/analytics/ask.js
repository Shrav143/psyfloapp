// The question box (pure ESM). Rule-based: it matches a few kinds of question to the figures the screen already holds and answers only from
// them; a question the data cannot answer returns an understandable limitation instead of a made-up result. It is labelled Simulated (no
// language model). Every answer names its dataset, period and filters, and shows the supporting table.
import { PROV, PROV_LABEL, cellText, isSup } from './common.js';
import { sectionView, scorecardView, filterLines } from './view.js';

export const SUGGESTED = [
  'Which notes were late?', 'How many sends have a receipt?', 'How many requests are unresolved?', 'How many decisions were partial?',
  'What reasons do payers give?', 'How many patients are enrolled?', 'Which interventions are documented?'
];

const LIMITS = [
  [/revenue|dollar|\$|cost|billing amount|money|salary|pay rate|profit/i, 'This demo holds no dollar amounts, so it cannot answer questions about revenue, cost or pay.'],
  [/turnover|retention|staff performance|rank(ing)? staff|which (staff|clinician|therapist)|who is (best|worst)/i, 'Psyflo does not rank staff. Note timeliness is shown for the program and by note type, not by person.'],
  [/predict|forecast|will (the|a) payer|likely to|chance of|probability/i, 'Psyflo does not predict payer decisions. It reports what was recorded.'],
  [/why (did|do|does)|cause|because of|effect of|caused|led to|impact of/i, 'The figures describe what was documented. They do not show that one thing caused another, so this question has no answer here.'],
  [/audit|voided|nda|claim denial|unpaid hours/i, 'Audit findings, voided notes and claims are not stored in Psyflo, so they cannot be counted.']
];

const INTENTS = [
  { id: 'notes', re: /(note|documentation).*(late|on time|timel|complet|window|overdue|missed)|timeliness|late notes|notes.*(due|done)/i, scope: 'case', run: (v, sc) => fromScore(sc, 'notes', r => `${r.num} of ${r.den} required notes were processed on time (${r.note}).`) },
  { id: 'prep', re: /(time|long|minutes).*(document|note|paperwork)|documentation time/i, scope: 'case', run: (v, sc) => fromScore(sc, 'prep', r => r.headline === '—' ? 'No capture event is stored yet, so Psyflo cannot say how long documentation took.' : `Median ${r.headline} from the first capture to Process Form (${r.note}).`) },
  { id: 'intake', re: /intake.*(sra|request)|review-ready|how long.*sra/i, scope: 'case', run: (v, sc) => fromScore(sc, 'intake', r => r.headline === '—' ? 'No initial SRA has reached Pending clinical approval in this period.' : `${r.headline} from intake to a review-ready SRA (${r.note}).`) },
  { id: 'missing', re: /missing (item|documentation)|flagged|caught|check(s)? (failed|flag)/i, scope: 'case', run: (v, sc) => fromScore(sc, 'missing', r => r.headline === '—' ? 'No draft is recorded in this period.' : `${r.headline} flagged before Process Form (${r.note}).`) },
  { id: 'receipts', re: /receipt|how many (sends|submissions|sent)|submission/i, scope: 'case', run: (v, sc) => fromScore(sc, 'receipts', r => r.den ? `${r.num} of ${r.den} requests sent in this period have a stored receipt.` : 'No request was sent in this period.') },
  { id: 'unresolved', re: /unresolved|open (payer )?requests|waiting on|pending (requests|decisions)|outstanding/i, scope: 'case', run: (v, sc) => fromScore(sc, 'unresolved', r => `${r.num} requests are unresolved today (${r.note}).`) },
  { id: 'partial', re: /partial|denied|denial rate|approved in full|how many decisions|decisions/i, section: 'payer', panel: 'pay.by_payer', run: v => ({ text: stripText(v), panel: v.panels.find(p => p.id === 'pay.by_payer') }) },
  { id: 'units', re: /units|awarded|approved vs|approval rate/i, section: 'payer', panel: 'pay.units', run: v => ({ text: unitsText(v), panel: v.panels.find(p => p.id === 'pay.units') }) },
  { id: 'turnaround', re: /turnaround|decision (time|day)|how long.*(decide|decision)|days to decide/i, section: 'payer', panel: 'pay.turnaround', run: v => ({ text: 'Decision day is counted from the day a request was sent.', panel: v.panels.find(p => p.id === 'pay.turnaround') }) },
  { id: 'reasons', re: /reason|why.*denied|what.*payers? (say|give)/i, section: 'payer', panel: 'pay.reasons', run: v => ({ text: 'Reasons are shown as the payer wrote them, for groups of 5 or more requests.', panel: v.panels.find(p => p.id === 'pay.reasons') }) },
  { id: 'upcoming', re: /upcoming|due (soon|this)|next (payer )?work|deadline/i, section: 'payer', scope: 'case', panel: 'pay.upcoming', run: v => ({ text: 'Dated payer work on open requests.', panel: v.panels.find(p => p.id === 'pay.upcoming') }) },
  { id: 'enrolled', re: /enrol|how many (patients|students|children|kids)|caseload size|in service/i, section: 'population', panel: 'pop.enrollment', run: v => pop(v, 'pop.enrollment') },
  { id: 'age', re: /\bage\b|how old/i, section: 'population', panel: 'pop.age', run: v => pop(v, 'pop.age') },
  { id: 'sites', re: /school|locality|site|where/i, section: 'population', panel: 'pop.sites', run: v => pop(v, 'pop.sites') },
  { id: 'dx', re: /diagnos|condition/i, section: 'population', panel: 'pop.dx', run: v => pop(v, 'pop.dx') },
  { id: 'goals', re: /goal/i, section: 'population', panel: 'pop.goals', run: v => pop(v, 'pop.goals') },
  { id: 'ivs', re: /intervention/i, section: 'population', panel: 'pop.ivs', run: v => pop(v, 'pop.ivs') },
  { id: 'service', re: /service type|which services|utiliz/i, section: 'population', panel: 'pop.service', run: v => pop(v, 'pop.service') },
  { id: 'assess', re: /improv|assessment|score|trend|phq|gad|sdq/i, section: 'outcomes', panel: 'out.assess', run: v => ({ text: 'Only scales with two or more stored scores per patient are shown. The direction describes the scores, not a treatment effect.', panel: v.panels.find(p => p.id === 'out.assess') }) },
  { id: 'feedback', re: /feedback|engag|satisf/i, section: 'outcomes', panel: 'out.feedback', run: v => ({ text: 'Treatment feedback by source. Averages need 5 or more responses.', panel: v.panels.find(p => p.id === 'out.feedback') }) },
  { id: 'complete', re: /complete|missing data|gaps?/i, section: 'outcomes', panel: 'out.complete', run: v => ({ text: 'A gap is a documentation gap, not a clinical finding.', panel: v.panels.find(p => p.id === 'out.complete') }) },
  { id: 'review', re: /clinical review|needs review|who needs|at risk/i, section: 'outcomes', panel: 'out.review', run: v => ({ text: 'Signals that a clinician may want to look. A signal is not a conclusion.', panel: v.panels.find(p => p.id === 'out.review') }) }
];

function fromScore(sc, id, f) { const r = sc.rows.find(x => x.id === id); return { text: f(r), panel: { id: 'ask.' + id, title: r.label, kind: 'table', columns: [{ key: 'label', label: 'Detail' }, { key: 'value', label: 'Value', align: 'right' }], rows: [{ label: 'Result', value: r.headline }, ...r.breakdown.map(b => ({ label: b.label, value: b.value }))], definition: r.definition } }; }
const stripText = v => { const st = v.strip || []; const g = id => cellText((st.find(x => x.id === id) || {}).value); return `${g('requests')} requests in this period: ${g('decided')} decided (${g('partial')} partial, ${g('denied')} denied), ${g('pending')} awaiting a decision.`; };
const unitsText = v => { const p = v.panels.find(x => x.id === 'pay.units'); const g = l => (p.rows.find(r => r.label === l) || {}).v; return `${cellText(g('Units approved'))} units approved of ${cellText(g('Units requested'))} requested on decided requests (${cellText(g('Share approved'))}).`; };
function pop(v, id) {
  const p = v.panels.find(x => x.id === id); const rows = (p.rows || []).filter(r => !r._small && !isSup(r.n));
  const top = rows[0]; const small = (p.rows || []).some(r => r._small);
  return { text: top ? `The largest group is ${top.label} (${cellText(top.n)}).${small ? ' Groups under the minimum size are not shown.' : ''}` : 'Every group is under the minimum size, so none is shown.', panel: p };
}

// answer(s, actor, question, { dataset, rawF, section }) -> { ok, title, text, panel?, limitation?, dataset, datasetLabel, filters, matched }
export function answer(s, actor, question, { dataset = PROV.CASE, rawF = {} } = {}) {
  const q = String(question || '').trim();
  const base = { question: q, dataset, datasetLabel: PROV_LABEL[dataset], simulated: true };
  if (q.length < 3) return { ...base, ok: false, limitation: 'Type a question about the figures on this screen, or pick one of the suggestions.' };
  for (const [re, msg] of LIMITS) if (re.test(q)) return { ...base, ok: false, limitation: msg };
  const it = INTENTS.find(i => i.re.test(q));
  if (!it) return { ...base, ok: false, limitation: 'That question is not one this screen can answer. It can answer about note timeliness, receipts, unresolved requests, decisions and reasons, enrollment, age, schools, diagnoses, goals, interventions and service types, using the stored records only.' };
  if (it.scope === 'case' && dataset !== PROV.CASE) return { ...base, ok: false, matched: it.id, limitation: 'This measure is defined on case-backed records only. Switch the view to Case-backed to ask it.' };
  const { lines } = filterLines(s, actor, dataset, rawF, it.section || 'all');
  const filters = lines.map(l => l.join(': ')).join(' · ');
  if (it.scope === 'case') { const sc = scorecardView(s, actor, rawF); const out = it.run(null, sc); return { ...base, ok: true, matched: it.id, title: it.id, text: out.text, panel: out.panel, filters, provenance: PROV.CASE, source: sc.source }; }
  const v = sectionView(s, actor, dataset, it.section, rawF);
  if (v.unavailable) return { ...base, ok: false, matched: it.id, limitation: 'These aggregates are not available for this view.' };
  const out = it.run(v); return { ...base, ok: true, matched: it.id, text: out.text, panel: out.panel, filters, provenance: dataset, source: v.source };
}
