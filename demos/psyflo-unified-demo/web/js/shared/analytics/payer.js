// Payer Performance panels over normalised request facts (pure ESM). The case-backed requests and the illustrative cohort's
// authorization requests both become the same facts, so one builder makes the panels and the minimum group size is enforced once.
//
// A request fact: { id, payer, payerLabel, type, svc, submitted, decided, outcome:'approved'|'partial'|'denied'|'pending',
//   requested, approved (units awarded, null when none yet), offered, reason, appealed, appealOutcome, renewal, days (decision day N) }
// The headline strip prints any count of 1 to 4 as "Fewer than 5". Table rows for a payer under the minimum are rolled up; the All payers row and the
// unit and reauthorization tables are tracker counts of work items, shown in full and labelled as such in their definitions.
import { sup, grp, median, r1, sum } from './common.js';

const COLS = (first, ...more) => [{ key: 'label', label: first }, ...more.map(([key, label]) => ({ key, label, align: 'right' }))];
const isDecided = r => ['approved', 'partial', 'denied'].includes(r.outcome);

export function payerStrip(R, min) {
  const dec = R.filter(isDecided); const g = n => grp(n, min);
  return [
    { id: 'requests', label: 'Requests', value: g(R.length) },
    { id: 'submitted', label: 'Sent', value: g(R.filter(r => r.submitted).length) },
    { id: 'decided', label: 'Decided', value: g(dec.length) },
    { id: 'pending', label: 'Awaiting decision', value: g(R.filter(r => !isDecided(r)).length) },
    { id: 'partial', label: 'Partial', value: g(dec.filter(r => r.outcome === 'partial').length) },
    { id: 'denied', label: 'Denied', value: g(dec.filter(r => r.outcome === 'denied').length) }
  ];
}

export function payerPanels(R, env) {
  const P = []; const min = env.min;
  const dec = R.filter(isDecided);
  // by payer
  const byPayer = new Map(); for (const r of R) { if (!byPayer.has(r.payer)) byPayer.set(r.payer, []); byPayer.get(r.payer).push(r); }
  const row = (label, list, extra = {}) => { const d = list.filter(isDecided); const days = d.map(r => r.days).filter(x => x != null);
    return { label, n: list.length, decided: d.length, approved: d.filter(r => r.outcome === 'approved').length, partial: d.filter(r => r.outcome === 'partial').length, denied: d.filter(r => r.outcome === 'denied').length, day: days.length >= min ? 'Day ' + r1(median(days)) : days.length ? sup(min) : '—', ...extra }; };
  // every payer with a request gets a row (so a payer row can open its queue); the numbers of a payer under the minimum are not shown
  const small = n => ({ label: '', n: sup(min), decided: sup(min), approved: sup(min), partial: sup(min), denied: sup(min), day: sup(min) });
  const entries = [...byPayer.entries()];
  const shown = entries.filter(([, l]) => l.length >= min).sort((a, b) => b[1].length - a[1].length);
  const hiddenP = entries.filter(([, l]) => l.length < min).sort((a, b) => String(a[1][0].payerLabel).localeCompare(String(b[1][0].payerLabel)));
  const pRows = [...shown.map(([payer, list]) => row(list[0].payerLabel || payer, list, { _payer: payer })), ...hiddenP.map(([payer, list]) => ({ ...small(), label: list[0].payerLabel || payer, _payer: payer, _small: true }))];
  pRows.push({ ...row('All payers', R), _total: true });
  P.push({ id: 'pay.by_payer', title: 'By payer', kind: 'table', columns: COLS('Payer', ['n', 'Requests'], ['decided', 'Decided'], ['approved', 'Approved'], ['partial', 'Partial'], ['denied', 'Denied'], ['day', 'Decision day']), rows: pRows, wide: true,
    note: 'The All payers row is a work count, shown in full.', definition: 'Requests and decisions by payer. Decision day is the number of days from the day a request was sent to the decision, as a median. The numbers for a payer with fewer than the minimum number of requests are not shown. The All payers row is a tracker count of work items and is shown in full. A payer row opens that payer\'s queue.' });
  // approved versus requested units (longer-term measure: Future)
  const awarded = dec.filter(r => r.approved != null || r.outcome === 'denied');
  const reqU = sum(awarded.map(r => r.requested)), apprU = sum(awarded.map(r => r.approved || 0));
  P.push({ id: 'pay.units', title: 'Units approved', kind: 'table', columns: COLS('Measure', ['v', 'Value']), rows: [
    { label: 'Decided requests with units', v: awarded.length }, { label: 'Units requested', v: reqU }, { label: 'Units approved', v: apprU },
    { label: 'Share approved', v: reqU ? Math.round((100 * apprU) / reqU) + '%' : '—' }, { label: 'Offers awaiting a reply', v: dec.filter(r => r.outcome === 'partial' && r.approved == null).length }],
    definition: 'Units approved against units requested, over decided requests. A partial offer counts as approved units only after it is accepted and the award is recorded.', note: 'Work counts, shown in full. Longer-term measure; not a pilot gate.', maturity: 'analytics.payer' });
  // turnaround
  const days = dec.map(r => r.days).filter(x => x != null);
  const bucket = (a, b) => days.filter(d => d >= a && d <= b).length;
  P.push({ id: 'pay.turnaround', title: 'Turnaround', kind: 'table', columns: COLS('Decision day', ['n', 'Requests']), rows: days.length >= min ? [
    { label: 'Day 0 to 7', n: bucket(0, 7) }, { label: 'Day 8 to 14', n: bucket(8, 14) }, { label: 'Day 15 or later', n: bucket(15, 9999) }, { label: 'Median', n: 'Day ' + r1(median(days)) }] : [],
    empty: days.length >= min ? '' : days.length ? `Fewer than ${min} decisions have both a sent date and a decision date.` : 'No decision has both a sent date and a decision date yet.',
    definition: 'Days from the day a request was sent to the decision, for decided requests with both dates. Day N is neutral: the follow-up call and the overdue limit are rules with their own source labels, not facts about a payer.', chart: { type: 'bars' } });
  // reauthorization burden
  const types = [['initial', 'Initial requests'], ['continued_stay', 'Continued stay'], ['other', 'Other requests']];
  const typeOf = r => (r.type === 'initial' ? 'initial' : r.type === 'continued_stay' || r.renewal ? 'continued_stay' : 'other');
  const extra = R.filter(r => r.extraWork).length;
  P.push({ id: 'pay.reauth', title: 'Reauthorization burden', kind: 'table', columns: COLS('Request type', ['n', 'Requests']), rows: [
    ...types.map(([k, l]) => ({ label: l, n: R.filter(r => typeOf(r) === k).length })),
    { label: 'Needed an information reply, peer-to-peer or appeal', n: extra }, ...(R.some(r => r.appealed) ? [{ label: 'Appealed', n: R.filter(r => r.appealed).length }] : [])],
    definition: 'Requests by type, and how many needed more work after they were sent (an information reply, a peer-to-peer call or an appeal). Continued-stay requests are the reauthorization workload.' });
  // reasons
  const rc = new Map(); for (const r of R) if (r.reason) rc.set(r.reason, (rc.get(r.reason) || 0) + 1);
  const rrows = [...rc.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= min).map(([label, n]) => ({ label, n }));
  const rh = [...rc.values()].filter(n => n < min).length; if (rh) rrows.push({ label: `Reasons under ${min} (${rh})`, n: sup(min), _small: true });
  P.push({ id: 'pay.reasons', title: 'Common reasons', kind: 'table', columns: COLS('Reason the payer gave', ['n', 'Requests']), rows: rrows,
    definition: 'The reason recorded with a denial or a partial decision, as the payer wrote it. Reasons given on fewer than the minimum number of requests are not shown.', empty: rrows.length ? '' : 'No reason is recorded on a group of requests this size.' });
  return P;
}
