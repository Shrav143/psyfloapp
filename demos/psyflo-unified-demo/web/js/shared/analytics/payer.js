// Payer Performance panels over normalised request facts (pure ESM). The case-backed requests and the illustrative cohort's
// authorization requests both become the same facts, so one builder makes the panels and the minimum group size is enforced once.
//
// A request fact: { id, payer, payerLabel, type, svc, submitted, decided, outcome:'approved'|'partial'|'denied'|'pending',
//   requested, approved (units awarded, null when none yet), offered, reason, appealed, appealOutcome, renewal, days (decision day N) }
// The headline strip prints any count of 1 to 4 as "Fewer than 5". Table rows for a payer under the minimum are rolled up; the All payers row and the
// unit and reauthorization tables are tracker counts of work items, shown in full and labelled as such in their definitions.
import { sup, grp, median, r1, sum, addMonths, monthKey, monthLabel } from './common.js';

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

const pctOf = (n, d) => (d > 0 ? Math.round((100 * n) / d) + '%' : '—');
const KPI = (label, value, sub, o = {}) => ({ label, value, sub: sub || '', ...o });
const KPI_COLS = [{ key: 'label', label: 'Measure' }, { key: 'value', label: 'Value', align: 'right' }, { key: 'sub', label: 'What it counts' }];
const DOC_REASON = /document|signature|records|measurable goals/i;
const svcName = x => String(x || 'Not recorded').replace(/\s*[·(].*$/, '').trim() || 'Not recorded';

// the artifact's headline cards: rates over decided requests (three complementary groups: if one is small, none is shown)
function kpiPanel(R, env) {
  const min = env.min; const dec = R.filter(isDecided); const g = n => grp(n, min);
  const ap = dec.filter(r => r.outcome === 'approved').length, pa = dec.filter(r => r.outcome === 'partial').length, de = dec.filter(r => r.outcome === 'denied').length;
  const hide = dec.length < min || [ap, pa, de].some(n => n > 0 && n < min); const rate = n => (hide ? sup(min) : pctOf(n, dec.length));
  const rsub = txt => (hide ? (dec.length < min ? `A group under ${min} is not shown` : 'Hidden so a small group cannot be worked out') : txt);
  const days = dec.map(r => r.days).filter(x => x != null);
  const awarded = dec.filter(r => r.approved != null || r.outcome === 'denied'); const reqU = sum(awarded.map(r => r.requested)), apprU = sum(awarded.map(r => r.approved || 0));
  const appealed = R.filter(r => r.appealed).length; const pend = R.filter(r => !isDecided(r)).length;
  return { id: 'pay.kpi', title: 'Headline measures', kind: 'table', columns: KPI_COLS, rows: [
    KPI('Authorization requests', g(R.length), R.length >= min ? `${pend} awaiting a decision` : 'A group under 5 is not shown'),
    KPI('Full approval rate', rate(ap), rsub(`${ap} of ${dec.length} decided requests approved in full`)),
    KPI('Partial approval rate', rate(pa), rsub(`${pa} of ${dec.length} decided requests partly approved`)),
    KPI('Full denial rate', rate(de), rsub(`${de} of ${dec.length} decided requests denied`), { tone: 'warn' }),
    KPI('Decision day', days.length >= min ? 'Day ' + r1(median(days)) : days.length ? sup(min) : '—', days.length >= min ? `Median days from sent to decision, ${days.length} requests` : 'A median needs 5 requests with a sent date and a decision date'),
    KPI('Units not approved', reqU ? reqU - apprU : '—', reqU ? `Of ${reqU} units requested on decided requests` : 'No decided request with units', { tone: reqU - apprU > 0 ? 'warn' : '' }),
    KPI('Appealed', g(appealed), 'Requests that went to appeal')],
    definition: 'Rates are over decided requests; pending requests are counted separately so the three outcomes always add up to the decided total. Units are the requested and approved units on decided requests, a work count shown in full.' };
}
// requests by month sent, with how those requests were decided and the units asked and approved
function trendPanel(R, env) {
  const min = env.min; const end = monthKey(env.asOf || '2026-01-01'); const months = []; for (let i = 5; i >= 0; i--) months.push(addMonths(end, -i));
  const rows = months.map(m => {
    const L = R.filter(r => r.submitted && monthKey(r.submitted) === m); const dec = L.filter(isDecided);
    const ap = dec.filter(r => r.outcome === 'approved').length, nf = dec.length - ap;
    const small = L.length > 0 && L.length < min; const hideO = small || [ap, nf].some(n => n > 0 && n < min);
    const aw = dec.filter(r => r.approved != null || r.outcome === 'denied');
    return { label: monthLabel(m), requests: small ? sup(min) : L.length, approved: hideO ? sup(min) : ap, notFull: hideO ? sup(min) : nf, reqU: small ? sup(min) : sum(aw.map(r => r.requested)), apprU: small ? sup(min) : sum(aw.map(r => r.approved || 0)) };
  });
  return { id: 'pay.trend', title: 'Authorization trends', kind: 'table', columns: COLS('Month sent', ['requests', 'Requests'], ['approved', 'Approved in full'], ['notFull', 'Partial or denied'], ['reqU', 'Units requested'], ['apprU', 'Units approved']), rows,
    definition: 'Requests by the month they were sent, with how many of the decided ones were approved in full or not, and the units asked and approved. A month with fewer than 5 requests, or with a small outcome group, is not shown. Requests with no sent date are not placed in a month.' };
}
function servicePanel(R, env) {
  const min = env.min; const dec = R.filter(isDecided); const by = new Map(); for (const r of dec) { const k = svcName(r.svc); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  const shown = [...by.entries()].filter(([, l]) => l.length >= min).sort((a, b) => b[1].length - a[1].length); const hidden = [...by.values()].filter(l => l.length < min).length;
  const rows = shown.map(([k, l]) => { const not = l.filter(r => r.outcome !== 'approved').length; return { label: k, decided: l.length, notFull: not, share: pctOf(not, l.length) }; });
  if (hidden) rows.push({ label: `Services under ${min} (${hidden})`, decided: sup(min), notFull: sup(min), share: sup(min), _small: true });
  return { id: 'pay.service', title: 'Denial and partial approval by service', kind: 'table', columns: COLS('Service', ['decided', 'Decided'], ['notFull', 'Partial or denied'], ['share', 'Share']), rows,
    definition: 'For each service, the share of decided requests that were partly approved or denied. A service with fewer than 5 decided requests is rolled into one row.', empty: 'No service has 5 or more decided requests.' };
}
function docPanel(R, env) {
  const min = env.min; const withReason = R.filter(r => r.reason); const doc = withReason.filter(r => DOC_REASON.test(r.reason));
  const rc = new Map(); for (const r of doc) rc.set(r.reason, (rc.get(r.reason) || 0) + 1);
  const rows = [...rc.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= min).map(([label, n]) => ({ label, n }));
  const hidden = [...rc.values()].filter(n => n < min).length; if (hidden) rows.push({ label: `Reasons under ${min} (${hidden})`, n: sup(min), _small: true });
  const total = doc.length >= min && withReason.length >= min ? { label: 'Requests with a documentation reason', n: `${doc.length} of ${withReason.length} (${pctOf(doc.length, withReason.length)})` } : null;
  return { id: 'pay.docdef', title: 'Documentation deficiencies', kind: 'table', columns: COLS('Reason the payer gave', ['n', 'Requests']), rows: total ? [total, ...rows] : rows,
    definition: 'Reasons that name documentation, a signature, records or measurable goals. A documentation reason means the payer found the record insufficient for that request; it is a pattern, not a finding about any clinician. Reasons on fewer than 5 requests are not shown.', empty: 'No documentation reason is recorded on a group of requests this size.' };
}
function denialByPayerPanel(R, env) {
  const min = env.min; const by = new Map(); for (const r of R) { if (!by.has(r.payer)) by.set(r.payer, []); by.get(r.payer).push(r); }
  const rows = [...by.entries()].filter(([, l]) => l.length >= min).sort((a, b) => b[1].length - a[1].length).map(([, l]) => {
    const d = l.filter(isDecided); const den = d.filter(r => r.outcome === 'denied').length, par = d.filter(r => r.outcome === 'partial').length;
    const rc = new Map(); for (const r of l.filter(x => x.reason)) rc.set(r.reason, (rc.get(r.reason) || 0) + 1); const top = [...rc.entries()].sort((a, b) => b[1] - a[1])[0];
    return { label: l[0].payerLabel || l[0].payer, denied: den >= min || !den ? den : sup(min), partial: par >= min || !par ? par : sup(min), reason: top && top[1] >= min ? top[0] : '—', _payer: l[0].payer };
  });
  return { id: 'pay.denial_by_payer', title: 'Denial frequency by payer', kind: 'table', columns: [{ key: 'label', label: 'Payer' }, { key: 'denied', label: 'Denied', align: 'right' }, { key: 'partial', label: 'Partial', align: 'right' }, { key: 'reason', label: 'Most common reason' }], rows,
    definition: 'Denied and partly approved requests for each payer with 5 or more requests, and the reason most often recorded for that payer. A reason is shown only when 5 or more requests carry it.', empty: 'No payer has 5 or more requests.' };
}
function appealsPanel(R, env) {
  const min = env.min; const A = R.filter(r => r.appealed); const out = k => A.filter(r => r.appealOutcome === k).length;
  const hasOut = A.some(r => r.appealOutcome); const g = n => grp(n, min);
  const resolved = out('overturned') + out('upheld'); const hide = (A.length < min && A.length > 0) || ['overturned', 'upheld', 'open'].some(k => out(k) > 0 && out(k) < min);
  const rows = [{ label: 'Appealed', n: g(A.length) }, ...(hasOut ? [{ label: 'Overturned', n: hide ? sup(min) : g(out('overturned')) }, { label: 'Upheld', n: hide ? sup(min) : g(out('upheld')) }, { label: 'Open', n: hide ? sup(min) : g(out('open')) },
    { label: 'Overturn rate (resolved)', n: !hide && resolved >= min ? pctOf(out('overturned'), resolved) : sup(min) }] : [])];
  return { id: 'pay.appeals', title: 'Appeal outcomes', kind: 'table', columns: COLS('Appeal', ['n', 'Requests']), rows: A.length ? rows : [],
    definition: 'Requests that went to appeal and, where an outcome is recorded, how they ended. The overturn rate counts resolved appeals only. An appeal counts only when a person recorded it.', empty: 'No request has gone to appeal in this period.' };
}
// patterns read straight off the figures above: every sentence has its counts, and says what it does not show
function insightsPanel(R, env) {
  const min = env.min; const rows = []; const dec = R.filter(isDecided);
  const by = new Map(); for (const r of dec) { if (!by.has(r.payer)) by.set(r.payer, []); by.get(r.payer).push(r); }
  const ok = [...by.values()].filter(l => l.length >= min);
  const topPartial = ok.map(l => ({ l, n: l.filter(r => r.outcome === 'partial').length })).filter(x => x.n >= min).sort((a, b) => b.n / b.l.length - a.n / a.l.length)[0];
  if (topPartial) rows.push({ text: `${topPartial.l[0].payerLabel}: ${pctOf(topPartial.n, topPartial.l.length)} of decided requests were partly approved, the highest share of any payer.`, support: `${topPartial.n} of ${topPartial.l.length} decided requests`, _go: 'payer', _payer: topPartial.l[0].payer });
  const slow = ok.map(l => ({ l, d: l.map(r => r.days).filter(x => x != null) })).filter(x => x.d.length >= min).sort((a, b) => median(b.d) - median(a.d))[0];
  if (slow) rows.push({ text: `${slow.l[0].payerLabel} took the longest to decide: median day ${r1(median(slow.d))} from sent to decision.`, support: `${slow.d.length} requests with a sent date and a decision date`, _go: 'payer', _payer: slow.l[0].payer });
  const rc = new Map(); for (const r of R) if (r.reason) rc.set(r.reason, (rc.get(r.reason) || 0) + 1); const top = [...rc.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= min) rows.push({ text: `The reason recorded most often was "${top[0]}".`, support: `${top[1]} requests carry it`, _go: 'reason' });
  return { id: 'pay.insights', title: 'Payer insights', kind: 'table', columns: [{ key: 'text', label: 'Pattern' }, { key: 'support', label: 'Supporting figures' }], rows,
    definition: 'Patterns read off the figures on this page, each with the counts behind it. They describe what happened in this period. They show an association, not a cause, and each needs review by the team before any change.', empty: 'No pattern is shown because no payer has 5 or more decided requests.' };
}

export function payerPanels(R, env) {
  const P = []; const min = env.min;
  P.push(kpiPanel(R, env));
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
  P.push(trendPanel(R, env), servicePanel(R, env), docPanel(R, env), denialByPayerPanel(R, env), appealsPanel(R, env), insightsPanel(R, env));
  return P;
}
