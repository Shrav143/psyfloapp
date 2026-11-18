// R7 · Oprox parity, Authorizations (Owner A, A-01 to A-17): urgency groups, row signals, the Urgency filter, the recertification line, the payer line, Insights,
// Analyze a case, the case-page strip, the decision-support line, the four case-intelligence views, the upgraded payer criteria, the suggestions footer.
// Standalone: `BASE=http://localhost:6300 node test/intel-auth-ui.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: each feature renders from stored data (compared with the pure selectors, which test/intel-auth.mjs pins), the sample numbers carry the Simulated chip and the basis,
// a supervisor and an administrator see money, due, the payer line and insights but none of the clinical views, keyboard use and focus return, 390 px, zero page errors.
import { suite, assert, api, state, reset, login, playwright, errors, session, BASE } from './lib/index.mjs';
import { rowSignals, headerOf, trajectoryOf, criteriaView, historicalView, authStatusOf, urgentOf, bandsOf, recertCount, readStatusText, previewOf, submitOf } from '../web/js/shared/sel/auth-intel.js';
import { payerPulse, BAND_LABEL, INTEL_BASIS, DECISION_SUPPORT, urgency } from '../web/js/shared/intel.js';
import { authRecsFor, listFor } from '../web/js/shared/recs.js';
import { authQueue } from '../web/js/shared/sel/auth.js';

const T = suite('intel-auth-ui');
const realErrs = e => e.filter(x => !/Parent|MyWork|LANG_OFF/.test(x));
const WORDS = /\b(school|student|TDT|therapeutic day treatment|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
const { chromium } = playwright(); const b = await chromium.launch();
const mk = async (as, w = 1440, h = 900, o = {}) => { const p = await (await b.newContext({ viewport: { width: w, height: h }, ...o })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
const focusId = p => p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.getAttribute('data-ui-return') || document.activeElement.tagName));
const fits = p => p.evaluate(() => ({ page: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, dialogs: [...document.querySelectorAll('.ui-dialog')].every(d => d.scrollWidth <= d.clientWidth + 1 && [...d.querySelectorAll('.ui-dialog__b')].every(x => x.scrollWidth <= x.clientWidth + 1)) }));
const list = async (p, q = '') => { await p.goto(BASE + '/#/Authorizations' + q); await p.waitForSelector('tbody tr[data-ui-row]'); };
const openCase = async (p, id, extra = '') => { await p.goto(BASE + `/#/Authorization?id=${id}${extra}`); await p.waitForSelector('.ui-hcard'); };
const dlg = p => p.locator('.ui-dialog').last();
const closeTop = async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(250); };
const eventsOf = async (re, as = 'jperez') => (await state(as)).events.filter(e => re.test(e.what));
const rowIds = p => p.locator('tbody tr[data-ui-row]').evaluateAll(els => els.map(e => e.dataset.rowId));
const meOf = async as => (await session(as)).actor;
let ME = null;

try {
  // ------------------------------------------------------------------ A-01 urgency groups
  await reset('canvas'); ME = await meOf('jperez');
  await T.test('A-01 the queue is grouped by urgency: a heading with the count above the first case of each group, in the selector\'s order; the Group by urgency switch (grp=0) gives the flat list; filters and the pager keep the headings honest', async () => {
    const s = await state('jperez'); const bd = bandsOf(s); const { p, errs } = await mk('jperez'); await list(p);
    const heads = await p.locator('tr.in-band').evaluateAll(els => els.map(e => ({ key: e.dataset.band, text: e.innerText.replace(/\s+/g, ' ').trim() })));
    assert.deepEq(heads.map(h => h.key), bd.groups.map(g => g.key), 'the groups, in order'); assert.deepEq(heads.map(h => h.text), bd.groups.map(g => `${BAND_LABEL[g.key]} ${g.ids.length} ${g.ids.length === 1 ? 'case' : 'cases'}`), 'the label and the count');
    assert.eq(BAND_LABEL.risk, 'Highest financial risk · act now');
    const ids = await rowIds(p); assert.deepEq(ids, bd.groups.flatMap(g => authQueue(s, {}, ME).rows.map(r => r.id).filter(id => g.ids.includes(id))), 'each group lists its cases in the queue\'s own order, groups in urgency order');
    const order = await p.locator('tbody tr').evaluateAll(els => els.map(e => (e.classList.contains('in-band') ? 'H:' + e.dataset.band : e.dataset.rowId)));
    for (const g of bd.groups) { const i = order.indexOf('H:' + g.key); assert.deepEq(order.slice(i + 1, i + 1 + g.ids.length).sort(), g.ids.slice().sort(), 'the heading sits directly above its own cases: ' + g.key); }
    assert.eq(await p.locator('tr.in-band th[scope="colgroup"]').count(), heads.length, 'a column-group header, so a screen reader reads it as a heading');
    // the switch
    assert.eq(await p.locator('#a-grp').isChecked(), true); await p.locator('#a-grp').uncheck(); await p.waitForTimeout(300);
    assert.eq(await p.locator('tr.in-band').count(), 0, 'no headings in the flat list'); assert.match(await p.evaluate(() => location.hash), /grp=0/); assert.eq(await focusId(p), 'a-grp', 'focus stays on the switch');
    const flat = await rowIds(p); assert.deepEq(flat, authQueue(s, {}, ME).rows.map(r => r.id), 'the flat list is the queue as before');
    await p.reload(); await p.waitForSelector('tbody tr[data-ui-row]'); assert.eq(await p.locator('tr.in-band').count(), 0, 'grp=0 survives a reload'); assert.eq(await p.locator('#a-grp').isChecked(), false);
    await p.locator('#a-grp').check(); await p.waitForTimeout(300); assert.ok(!/grp=/.test(await p.evaluate(() => location.hash)), 'back to the default'); assert.eq(await p.locator('tr.in-band').count(), heads.length);
    // a filter: only the groups that still have a case
    await list(p, '?status=renewal'); const kept = await p.locator('tr.in-band').evaluateAll(els => els.map(e => e.dataset.band)); const re = authQueue(s, { status: 'renewal' }, ME).rows.map(r => bd.byId[r.id]);
    assert.deepEq(kept, bd.groups.map(g => g.key).filter(k => re.includes(k)), 'the groups that still have a case'); assert.deepEq((await rowIds(p)).sort(), ['R-0395', 'R-0411']);
    // the pager counts cases, not headings
    await list(p, '?size=10'); assert.eq((await rowIds(p)).length, 10); assert.match(await p.locator('.ui-pager__range').innerText(), /Showing 1–10 of 11 authorizations/);
    await p.locator('[data-ui-pgnext]').click(); await p.waitForTimeout(300); assert.eq((await rowIds(p)).length, 1); assert.match(await p.locator('.ui-pager__range').innerText(), /Showing 11–11 of 11/);
    assert.eq(await p.locator('tr.in-band').count(), 1, 'the last case keeps its heading'); assert.match(await p.locator('tr.in-band').innerText(), /3 cases/, 'the count is the whole group');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-02 row signals
  await T.test('A-02 each row carries the due-in chip and the dollars-at-risk chip (every role), and, for the treating clinician, the needs-input badge, the packet line and the lift line; the sample is labelled once under the table', async () => {
    const s = await state('jperez'); const me = await meOf('jperez'); const { p, errs } = await mk('jperez'); await list(p);
    for (const r of s.requests) {
      const sig = rowSignals(s, r, me); const tr = p.locator(`tbody tr[data-row-id="${r.id}"]`); if (!(await tr.count())) continue;
      const cell = tr.locator('[data-sig]');
      if (sig.urgency.label) assert.eq((await cell.locator('.in-due').innerText()).trim(), sig.urgency.label, r.id + ' due-in chip'); else assert.eq(await tr.locator('.in-due').count(), 0, r.id + ' no date, no chip');
      if (sig.risk) { assert.eq((await cell.locator('.in-money .ui-chip').innerText()).trim(), sig.risk.label, r.id + ' dollars at risk'); assert.match(await cell.locator('.in-money').getAttribute('title'), /units × \$205 a unit \(demo assumption\)/, r.id + ' the basis on hover'); } else assert.eq(await tr.locator('.in-money').count(), 0, r.id + ' nothing at risk');
      const pk = tr.locator('[data-packet]'); assert.eq((await pk.getAttribute('title')), sig.packet.text, r.id + ' packet line'); assert.match(await pk.textContent(), new RegExp(sig.packet.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      if (sig.inputs) assert.eq((await pk.locator('.in-needs').innerText()).trim().replace(/\s+/g, ' '), sig.inputs > 1 ? `Needs input · ${sig.inputs}` : 'Needs input', r.id + ' needs-input badge'); else assert.eq(await pk.locator('.in-needs').count(), 0);
      assert.eq((await tr.locator('[data-lift]').innerText()).trim(), sig.lift, r.id + ' lift line'); assert.match(sig.lift, /^Historically improves approval by \+\d+ pts \(sample\)$/);
    }
    assert.match(await p.locator('.a-basis .in-basis').innerText(), /Simulated[\s\S]*Illustrative sample from the demo data/, 'the sample is labelled on the screen');
    // an overdue date is red (danger), whatever the rule says
    const tone = await p.locator('tbody tr[data-row-id="R-0411"] .in-due').evaluate(e => e.className); assert.match(tone, /danger/, 'Overdue 3d is shown as danger');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-03 Urgency filter, recertifications line
  await T.test('A-03 the Filters drawer has an Urgency filter (urg=overdue|24h|week) that follows the clock; "2 recertifications due" is a line above the table and filters to the renewals', async () => {
    const s = await state('jperez'); const { p, errs } = await mk('jperez'); await list(p);
    assert.eq(recertCount(s), 2); assert.eq((await p.locator('.a-recert').innerText()).trim(), '2 recertifications due');
    await p.click('#a-filters'); await p.waitForSelector('.a-fd'); const opts = await p.locator('.ui-dialog--drawer select[data-key="urg"] option').allInnerTexts(); assert.deepEq(opts, ['All urgency', 'Overdue', 'Due within 24 hours', 'Due this week']);
    const want = k => s.requests.filter(r => { const u = urgency(s, r); return u.hours != null && (k === 'overdue' ? u.hours < 0 : k === '24h' ? u.hours <= 24 : u.hours <= 168); }).map(r => r.id).sort();
    for (const [k, label] of [['overdue', 'Overdue'], ['24h', 'Due within 24 hours'], ['week', 'Due this week']]) {
      await p.selectOption('select[data-key="urg"]', k); await p.waitForTimeout(350); assert.deepEq((await rowIds(p)).sort(), want(k), k); assert.match(await p.evaluate(() => location.hash), new RegExp('urg=' + k));
      assert.match(await p.locator('.ui-dialog--drawer [data-ui-action="0"]').innerText(), new RegExp(`^Show ${want(k).length} authorizations?$`), 'the drawer button counts the same rows');
    }
    assert.ok(want('overdue').length >= 2 && want('overdue').length < want('week').length, 'the filters differ');
    await p.selectOption('select[data-key="urg"]', 'overdue'); await p.locator('.ui-dialog--drawer [data-ui-action="0"]').click(); await p.waitForTimeout(250); assert.eq(await focusId(p), 'a-filters'); assert.match(await p.locator('#a-filters').innerText(), /Filters \(1\)/);
    await p.reload(); await p.waitForSelector('tbody tr[data-ui-row]'); assert.deepEq((await rowIds(p)).sort(), want('overdue'), 'urg survives a reload');
    await list(p); await p.click('.a-recert'); await p.waitForTimeout(350); assert.deepEq((await rowIds(p)).sort(), ['R-0395', 'R-0411'], 'the recertification line filters to the renewals'); assert.match(await p.evaluate(() => location.hash), /status=renewal/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-04 payer line
  await T.test('A-04 the payer line above the table is the stored pulse (New, the text, the detail, the lift and the exposure, Simulated); See why opens the payer insights drawer; dismissing it is remembered for the tab; focus returns', async () => {
    const s = await state('jperez'); const pulse = payerPulse(s); const { p, errs } = await mk('jperez'); await list(p);
    const line = (await p.locator('.in-pulse').innerText()).replace(/\s+/g, ' '); for (const x of [pulse.text, pulse.detail, `Suggestion lift ${pulse.lift_from}% to ${pulse.lift_to}%`, `about ${pulse.exposure} at risk`, 'New', 'Simulated']) assert.ok(line.includes(x), 'the line says: ' + x);
    assert.eq(pulse.exposure, '$28,000'); assert.ok(await p.locator('.in-pulse .ui-maturity, .in-pulse .ui-chip', { hasText: 'Simulated' }).count() >= 1);
    await p.locator('[data-pulse-see]').click(); await p.waitForSelector('.ui-dialog--drawer .ai-pp'); const t = await dlg(p).innerText();
    for (const x of ['Payer insights · Sentara Health Plans', 'Partial approvals, payer record', '74% of requests', 'Approval rate in the sample', '58%', 'What it tends to do', 'What has worked', 'Approval rate by payer', 'Common denial reasons by payer', 'Illustrative sample from the demo data']) assert.ok(t.includes(x), 'the drawer says: ' + x);
    assert.ok(await dlg(p).locator('.ui-maturity, .ui-chip', { hasText: 'Simulated' }).count() >= 1); await closeTop(p); assert.eq(await focusId(p), 'a-pulse-see', 'focus returns to See why');
    await p.locator('[data-pulse-x]').click(); await p.waitForTimeout(300); assert.eq(await p.locator('.in-pulse').count(), 0); assert.eq(await focusId(p), 'a-insights', 'focus moves to a control that is still there');
    await p.reload(); await p.waitForSelector('tbody tr[data-ui-row]'); assert.eq(await p.locator('.in-pulse').count(), 0, 'dismissed for this tab, across a reload'); assert.deepEq(realErrs(errs), []); await p.context().close();
    const fresh = await mk('jperez'); await list(fresh.p); assert.eq(await fresh.p.locator('.in-pulse').count(), 1, 'a new tab shows it again'); await fresh.p.context().close();
  });

  // ------------------------------------------------------------------ A-05 insights
  await T.test('A-05 the Insights button (every role) opens the facility insights in a drawer: four KPIs, approval by payer, denial reasons by payer, impactful suggestions, override patterns, all marked Simulated; the clinician\'s open is logged, the others\' is not', async () => {
    await reset('canvas'); const n0 = (await eventsOf(/Facility insights opened/)).length;
    for (const who of ['jperez', 'cdiaz', 'dowens']) {
      const { p, errs } = await mk(who); await list(p); await p.click('#a-insights'); await p.waitForSelector('.ui-dialog--drawer .in-ins');
      assert.match(await p.locator('.ui-dialog--drawer .ui-dialog__t').innerText(), /^Facility insights$/); assert.eq(await p.locator('.ui-dialog--drawer .in-kpi').count(), 4, who);
      assert.deepEq(await p.locator('.ui-dialog--drawer .in-sec').evaluateAll(els => els.map(e => e.dataset.sec)), ['approval', 'actions', 'reasons', 'overrides'], who + ': the auth order');
      assert.eq(await p.locator('.ui-dialog--drawer .in-bar').count(), 6, 'six payers'); assert.eq(await p.locator('.ui-dialog--drawer .in-tbl tbody tr').count(), 9, 'nine denial reasons'); assert.eq(await p.locator('.ui-dialog--drawer .in-acts li').count(), 4);
      assert.ok(await p.locator('.ui-dialog--drawer .in-basis .ui-maturity, .ui-dialog--drawer .in-basis .ui-chip', { hasText: 'Simulated' }).count() >= 1); assert.match(await dlg(p).innerText(), /Illustrative sample from the demo data/);
      await closeTop(p); assert.eq(await focusId(p), 'a-insights', who + ': focus returns'); assert.deepEq(realErrs(errs), [], who); await p.context().close();
    }
    const ev = await eventsOf(/Facility insights opened/); assert.eq(ev.length, n0 + 1, 'only the clinician\'s open is logged'); assert.eq(ev[ev.length - 1].who, 'jperez');
  });

  // ------------------------------------------------------------------ A-06 Analyze a case
  await T.test('A-06 Analyze a case (clinician): a drawer that takes a stored consumer, shows the authorization status and the de-identified preview from the stored record, streams the analysis and opens three tabs; the run is logged without any text', async () => {
    await reset('canvas'); const s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0411'); const st = authStatusOf(s, r); const { p, errs } = await mk('jperez'); await list(p);
    await p.click('#a-analyze'); await p.waitForSelector('#aw-form'); assert.match(await dlg(p).locator('.aw-safe').innerText(), /HIPAA-safe mode: common identifiers are removed before analysis\. Do not enter a client name\./);
    assert.eq(await p.locator('#aw-req').inputValue(), 'R-0411', 'defaults to a consumer whose units are running out'); assert.eq(await p.locator('input[name="aw-src"]:checked').getAttribute('value'), 'stored');
    const status = (await p.locator('#aw-status').innerText()).replace(/\s+/g, ' '); for (const x of [`${st.approved} units approved`, `${st.used} of ${st.approved}`, `Units remaining ${st.remaining}`, 'Nov 13 · 15 days from today', 'Urgent']) assert.ok(status.includes(x), 'status: ' + x); assert.ok(status.includes(st.action), 'the action required is the computed one');
    assert.deepEq(await p.locator('#aw-prev li').allInnerTexts(), previewOf(s, r).lines, 'the de-identified preview is the stored record, initials only'); assert.ok(!/Rowe|Monica/.test(await p.locator('#aw-prev').innerText()), 'no name');
    assert.eq(await p.locator('#aw-payer').isDisabled(), true); assert.eq(await p.locator('#aw-payer').inputValue(), 'anthem'); assert.eq(await p.locator('#aw-level').inputValue(), '2.1');
    await p.selectOption('#aw-req', 'R-0402'); assert.match(await p.locator('#aw-status').innerText(), /110 units approved/); assert.eq(await p.locator('#aw-payer').inputValue(), 'sentara'); await p.selectOption('#aw-req', 'R-0411');
    await p.fill('#aw-ref', 'IOP-UNIT-001'); await p.fill('#aw-member', 'ABC123456789'); await p.fill('#aw-group', 'GRP-00012');
    await p.click('[data-ui-action="0"]'); await p.waitForSelector('#aw-steps .in-steps'); assert.eq(await p.locator('#aw-steps .in-steps').getAttribute('aria-live'), 'polite'); assert.eq(await p.locator('#aw-steps li').count(), 6);
    assert.deepEq(await p.locator('#aw-steps li').allInnerTexts(), ['Identifying the payer and plan type', 'Looking up the payer\'s published criteria on file', 'Comparing the record with the level-of-care criteria', 'Finding documentation gaps', 'Building the request from stored records', 'Building the denial-prevention list']);
    assert.ok(await p.locator('.aw-run .ui-maturity, .aw-run .ui-chip', { hasText: 'Simulated' }).count() >= 1, 'the steps are marked a progress display'); assert.eq(await p.locator('[data-ui-action="0"]').isDisabled(), true);
    await p.waitForSelector('[role="tablist"]', { timeout: 12000 }); assert.eq(await p.locator('[role="tab"]').count(), 3); assert.deepEq(await p.locator('[role="tab"]').allInnerTexts(), ['Clinical trajectory', 'Payer criteria', 'Denial-prevention actions']); assert.eq(await focusId(p), 'aw-res-h', 'focus moves to the results');
    const tj = trajectoryOf(s, r); const body = (await p.locator('#aw-panel').innerText()); assert.ok(body.includes(tj.summary[4].value) && body.includes('Anthem HealthKeepers Plus') && body.includes(DECISION_SUPPORT), 'the trajectory tab is the case page view');
    assert.match(await p.locator('.aw-res__h').innerText(), /IOP-UNIT-001 · Anthem HealthKeepers Plus · Level 2\.1 · Intensive outpatient/); assert.ok(!/ABC123456789|GRP-00012/.test(await dlg(p).innerText()), 'the member ID and group number are not shown again');
    await p.click('#aw-tab-crit'); await p.waitForSelector('#aw-panel .a-critl'); const cv = criteriaView(s, r); assert.eq(await p.locator('#aw-panel .a-critl > li').count(), 8); assert.match(await p.locator('#aw-panel [data-crit-sum]').innerText(), new RegExp(`^${cv.documented} of 8 documented`));
    await p.click('#aw-tab-acts'); await p.waitForSelector('#aw-panel [data-urgent]'); assert.eq((await p.locator('#aw-panel [data-urgent] h3').innerText()).trim(), urgentOf(s, r).title); assert.eq(await p.locator('#aw-panel .rc__card').count(), authRecsFor(s, r).length, 'the suggestions list');
    // keyboard: the arrow keys move between the tabs
    await p.locator('#aw-tab-acts').focus(); await p.keyboard.press('ArrowLeft'); assert.eq(await focusId(p), 'aw-tab-crit'); assert.eq(await p.locator('#aw-tab-crit').getAttribute('aria-selected'), 'true'); await p.keyboard.press('Home'); assert.eq(await focusId(p), 'aw-tab-traj'); await p.keyboard.press('End'); assert.eq(await focusId(p), 'aw-tab-acts');
    // a decision in the actions tab works like the drawer's and is logged with who
    await p.locator('#aw-panel .rc__card[data-rec="level-cite"] [data-rc-check]').check(); await p.locator('#aw-panel [data-rc-apply]').click(); await p.waitForFunction(() => /1 suggestion included of/.test(document.querySelector('#aw-panel [data-rc-count]').textContent));
    assert.eq((await eventsOf(/recommendations applied/)).length, 1);
    const ev = await eventsOf(/Case analysis run/); assert.eq(ev.length, 1); assert.eq(ev[0].record, 'R-0411'); assert.eq(ev[0].who, 'jperez'); assert.ok(!/IOP-UNIT-001|ABC123456789|GRP-00012/.test(JSON.stringify((await state('jperez')).events)), 'no text from the form in the audit trail');
    assert.ok(!JSON.stringify(await state('jperez')).includes('ABC123456789'), 'the member ID is never stored');
    await p.click('[data-ui-action="0"]'); await p.waitForSelector('#aw-form'); assert.eq(await p.locator('#aw-member').inputValue(), '', 'the member ID is not kept'); await closeTop(p); assert.eq(await focusId(p), 'a-analyze', 'focus returns to the opener');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('A-06 pasted notes: only scanned for numbers ("Psyflo read: ..."), identifiers removed in the preview, no trajectory or suggestions without a stored record; an empty paste is refused; reduced motion shows the steps at once', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez', 1440, 900, { reducedMotion: 'reduce' }); await list(p); await p.click('#a-analyze'); await p.waitForSelector('#aw-form');
    await p.check('input[name="aw-src"][value="notes"]'); assert.eq(await p.locator('#aw-stored').isHidden(), true); assert.eq(await p.locator('#aw-notes').isVisible(), true); assert.eq(await p.locator('#aw-payer').isEnabled(), true);
    await p.click('[data-ui-action="0"]'); assert.match(await p.locator('#aw-msg').innerText(), /Paste the notes or choose a file first/); assert.eq(await p.locator('#aw-form').count(), 1, 'nothing ran');
    const notes = 'Healthfirst NY Medicaid HMO. Current authorization: 48 units approved. Units used to date: 38. Units remaining: 10. Authorization expires in 3 days. Call 434-555-0162, member ABC123456789.';
    await p.fill('#aw-text', notes); await p.fill('#aw-member', 'ABC123456789'); const rd = readStatusText(notes);
    assert.eq((await p.locator('#aw-status [data-read]').innerText()).trim(), rd.text); assert.eq(rd.text, 'Psyflo read: 48 units approved · 38 used · 10 remaining · expires in 3 days. Check it against the payer\'s notice.');
    const pv = await p.locator('#aw-prev [data-preview]').innerText(); assert.ok(!/434-555-0162|ABC123456789/.test(pv) && /\[removed\]/.test(pv), 'identifiers are removed in the preview'); assert.match(await p.locator('#aw-prev').innerText(), /Names cannot be found automatically/);
    await p.setInputFiles('#aw-file', { name: 'payer-notice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') }); assert.match(await p.locator('#aw-notes .ui-field__h').last().innerText(), /Only the file name is kept; nothing leaves your browser\. Chosen: payer-notice\.pdf\./);
    await p.selectOption('#aw-payer', 'anthem'); await p.click('[data-ui-action="0"]'); await p.waitForSelector('[role="tablist"]', { timeout: 3000 });
    assert.match(await p.locator('#aw-panel').innerText(), /Pasted notes have no stored record behind them/); await p.click('#aw-tab-crit'); assert.match(await p.locator('#aw-panel').innerText(), /Anthem HealthKeepers Plus[\s\S]*Approval rate in the sample[\s\S]*63%/); assert.eq(await p.locator('#aw-panel .a-critl').count(), 0);
    await p.click('#aw-tab-acts'); assert.match(await p.locator('#aw-panel [data-urgent] h3').innerText(), /^Urgent: the authorization expires in 3 days$/); assert.eq(await p.locator('#aw-panel .rc__card').count(), 0, 'no suggestions from free text');
    assert.ok(!(await eventsOf(/Case analysis run/))[0].record, 'no request is named'); assert.ok(!/ABC123456789|Healthfirst NY Medicaid/.test(JSON.stringify((await state('jperez')).events)));
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('A-06 role gating: the supervisor and the administrator have no Analyze a case button and the action stays with the clinician', async () => {
    for (const who of ['cdiaz', 'dowens']) { const { p, errs } = await mk(who); await list(p); assert.eq(await p.locator('#a-analyze').count(), 0, who); assert.ok(!/Analyze a case/.test(await p.locator('main').innerText()), who); assert.deepEq(realErrs(errs), []); await p.context().close(); }
  });

  // ------------------------------------------------------------------ A-10 / A-11 / A-17 the strip, decision support, money
  await T.test('A-10 A-11 A-17 the case page strip: due and dollars at risk (every role), expected approval, model confidence and comparable cases (clinician; Simulated, with the basis), the ranking caption on the highest-risk case; decision support above the clinical block', async () => {
    const s = await state('jperez'); const me = await meOf('jperez'); const { p, errs } = await mk('jperez');
    for (const id of ['R-0402', 'R-0411', 'R-0391']) {
      await openCase(p, id); const h = headerOf(s, s.requests.find(x => x.id === id), me); const t = (await p.locator('.ai-strip').innerText()).replace(/\s+/g, ' ');
      for (const x of [h.urgency.label, h.risk.label, h.confidence.value.toFixed(2), 'Validated on similar cases', String(h.comparable.count), 'Simulated', INTEL_BASIS]) assert.ok(t.includes(x), `${id} strip says: ${x}`);
      assert.match(t, new RegExp(`Expected approval ${h.expected.base}% → (to )?${h.expected.expected}%`, 'i'), id + ' expected approval');
      assert.ok(await p.locator('.ai-strip .ui-maturity, .ai-strip .ui-chip', { hasText: 'Simulated' }).count() >= 1); assert.eq(await p.locator('.ai-strip [data-ranked]').count(), 0, id + ' is not ranked first');
      assert.eq(await p.locator('#sec-recs .in-ds').innerText().then(x => x.trim()), DECISION_SUPPORT, 'decision support at the top of the clinical block'); assert.match(await p.locator('.ai-strip .in-money').getAttribute('title'), /demo assumption/);
    }
    await openCase(p, 'R-0399'); assert.eq((await p.locator('.ai-strip [data-ranked]').innerText()).trim(), 'Psyflo ranked this case first because of the dollars at risk and the clock.'); assert.match(await p.locator('.ai-strip').innerText(), /\$30,750 at risk/);
    for (const who of ['cdiaz', 'dowens']) {
      const o = await mk(who); await openCase(o.p, 'R-0399'); const t = (await o.p.locator('.ai-strip').innerText()).replace(/\s+/g, ' ');
      assert.ok(/Overdue 3d/.test(t) && /\$30,750 at risk/.test(t), who + ': due and dollars'); assert.ok(!/Expected approval|Model confidence|Comparable cases|Simulated/.test(t), who + ': no sample figures'); assert.eq(await o.p.locator('.ai-strip [data-ranked]').count(), 1, who + ': the caption is about money and the clock');
      assert.eq(await o.p.locator('#sec-recs, .in-ds, .ai-intel').count(), 0, who + ': no clinical block'); assert.ok(!/Key drivers|Symptom and functional trend|Chart-to-criteria/.test(await o.p.content())); assert.deepEq(realErrs(o.errs), []); await o.p.context().close();
    }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-12 / A-13 trajectory
  await T.test('A-12 A-13 four buttons in the Suggested by Psyflo card open the suggestions, the Clinical trajectory, the Payer criteria and the Historical outcomes, each in a drawer or modal that hands focus back; the trajectory is the stored record: summary, trend and its text table, drivers with evidence chips, engagement, risk signals', async () => {
    await reset('canvas'); const s = await state('jperez'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402');
    assert.deepEq(await p.locator('.ai-intel button').allInnerTexts(), ['Suggested actions', 'Clinical trajectory', 'Payer criteria', 'Historical outcomes']);
    for (const [id, sel] of [['a-rc-open', '.ui-dialog--drawer .rc__card'], ['a-traj', '.ui-dialog--drawer .ai-tj'], ['a-criteria', '.ui-dialog[data-kind="modal"] .a-critl'], ['a-hist', '.ui-dialog--drawer .ai-hist']]) { await p.click('#' + id); await p.waitForSelector(sel); assert.ok(await p.locator('.ui-dialog').last().getAttribute('aria-labelledby'), id + ': a labelled dialog'); await closeTop(p); assert.eq(await focusId(p), id, id + ': focus returns to its button'); }
    for (const id of ['R-0402', 'R-0391', 'R-0411', 'R-0395']) {
      await openCase(p, id); await p.click('#a-traj'); await p.waitForSelector('.ai-tj'); const r = s.requests.find(x => x.id === id); const tv = trajectoryOf(s, r);
      assert.match(await dlg(p).locator('.ui-dialog__t').innerText(), new RegExp(`^Clinical trajectory · ${tv.initials.replace(/\./g, '\\.')}$`));
      assert.deepEq(await p.locator('[data-tj="summary"] > div').evaluateAll(els => els.map(e => [e.querySelector('dt').innerText, e.querySelector('dd').childNodes[0].textContent])), tv.summary.map(x => [x.label, x.value]), id + ' summary');
      assert.eq(await p.locator('.ai-tj .in-ds').count(), 1, 'decision support'); assert.eq(await p.locator('.ai-tj figure.in-chart').count(), (tv.trend.hasTrend ? 1 : 0) + (tv.screens.hasTrend ? 1 : 0), id + ' charts only where there is a trend');
      if (tv.trend.hasTrend) { const rows = await p.locator('.ai-tj figure.in-chart').first().locator('table.ui-sr tbody tr').count(); assert.eq(rows, tv.trend.labels.length, 'the text table beside the chart'); }
      assert.deepEq(await p.locator('[data-tj="drivers"] > li').evaluateAll(els => els.map(e => +e.dataset.dim)), tv.drivers.map(d => d.n), id + ' drivers'); assert.ok(await p.locator('[data-tj="drivers"] .ui-evidence, [data-tj="drivers"] [class*="evidence"]').count() >= tv.drivers.filter(d => d.ids.length).length, 'evidence chips on the drivers');
      assert.eq(await p.locator('[data-tj="drivers"] .ai-gap').count(), tv.drivers.filter(d => d.gap).length, id + ' gaps are said, not filled'); for (const d of tv.drivers.filter(x => x.gap)) assert.ok((await dlg(p).innerText()).includes(d.gap));
      assert.deepEq(await p.locator('[data-tj="risks"] > li').evaluateAll(els => els.map(e => e.dataset.tone)), tv.risks.map(x => x.tone), id + ' risk signals');
      const e = tv.engagement; if (e.score) assert.ok((await p.locator('[data-tj="engagement"]').innerText()).includes(`${e.score.pct}%`) && (await p.locator('[data-tj="engagement"]').innerText()).includes(`Attended ${e.score.attended} of ${e.score.scheduled}`), id + ' engagement is the stored count'); else if (e.lines.length) assert.ok((await p.locator('[data-tj="engagement"]').innerText()).includes(e.lines[0].text), id + ' the stored line'); else assert.match(await p.locator('.ai-tj').innerText(), /No attendance count is on file/);
      await closeTop(p);
    }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-14 payer criteria
  await T.test('A-14 payer criteria: source chips, the status line, three tiles (chart-to-criteria match, historical approval rate as a sample, level-of-care tool), the eight rows, "To maximize approval probability" with why this matters and what to include, each with See suggestion', async () => {
    await reset('canvas'); const s = await state('jperez'); const { p, errs } = await mk('jperez');
    for (const id of ['R-0402', 'R-0391', 'R-0395']) {
      await openCase(p, id); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); const cv = criteriaView(s, s.requests.find(x => x.id === id));
      assert.deepEq(await p.locator('.a-crit__src li').allInnerTexts(), cv.sources, id + ' sources'); assert.eq((await p.locator('[data-crit-status]').innerText()).trim(), cv.status.text);
      const tiles = await p.locator('[data-crit-tiles] .in-kpi').evaluateAll(els => els.map(e => [e.querySelector('.in-kpi__l').innerText, e.querySelector('.in-kpi__v').innerText, e.querySelector('.in-kpi__c').innerText, !!e.querySelector('.ui-chip')]));
      assert.deepEq(tiles.map(([l, v, c, sm]) => [l.toLowerCase(), v, c, sm]), cv.tiles.map(x => [x.label.toLowerCase(), x.value, x.caption, x.sample]), id + ' tiles'); assert.deepEq(cv.tiles.map(x => x.label), ['Chart-to-criteria match', 'Historical approval rate', 'Level-of-care tool']);
      assert.eq(await p.locator('.a-critl > li').count(), 8); assert.eq(await p.locator('.a-critl li[data-state="needs"]').count(), cv.needs);
      const mx = (await p.locator('[data-crit-max]').innerText()).replace(/\s+/g, ' '); for (const x of ['To maximize approval probability', `Why this matters for ${cv.payer.name}`, 'What to include in your submission', ...cv.maximize.why.reasons.map(r => r.reason), ...cv.maximize.include.map(i => i.title)]) assert.ok(mx.toLowerCase().includes(x.toLowerCase()), id + ' to maximize says: ' + x);
      assert.ok(await p.locator('[data-crit-max] .in-basis').count() >= 1, 'the denial reasons are a labelled sample'); assert.eq(await p.locator('[data-crit-max] [data-inc]').count(), cv.maximize.include.length);
      assert.eq(await p.locator('[data-crit-max] [data-inc]').first().getAttribute('data-inc'), cv.maximize.include[0].key); await closeTop(p);
    }
    await openCase(p, 'R-0402'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); await p.locator('[data-crit-max] [data-inc="risk"] [data-see]').click(); await p.waitForSelector('.ui-dialog--drawer .rc__card[data-rec="risk"].is-focus'); assert.eq(await p.locator('.ui-dialog[data-kind="modal"]').count(), 0, 'the modal closes and the drawer opens at the card');
    await closeTop(p); assert.eq(await focusId(p), 'a-criteria'); assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-15 historical outcomes
  await T.test('A-15 historical outcomes: matching chips from the record, the payer\'s top denial reason with the observed pattern (sample), the record\'s strengths as yes or not-yet rows, three modeled cards with Simulated, the interpretation and the current alignment', async () => {
    const s = await state('jperez'); const { p, errs } = await mk('jperez');
    for (const id of ['R-0402', 'R-0395', 'R-0416']) {
      await openCase(p, id); await p.click('#a-hist'); await p.waitForSelector('.ai-hist'); const hv = historicalView(s, s.requests.find(x => x.id === id));
      assert.deepEq(await p.locator('[data-hi="matching"] li').evaluateAll(els => els.map(e => [e.querySelector('span').innerText, e.querySelector('b').innerText])), hv.matching.map(m => [m.label, m.value]), id + ' chips');
      const dr = (await p.locator('[data-hi="driver"]').innerText()).replace(/\s+/g, ' '); assert.ok(dr.includes(hv.driver.reason) && dr.includes(hv.driver.observed[0].text) && dr.includes(hv.driver.observed[1].text), id + ' driver and observed pattern'); assert.ok(await p.locator('[data-hi="driver"] .ui-maturity, [data-hi="driver"] .ui-chip', { hasText: 'Simulated' }).count() >= 1);
      assert.deepEq(await p.locator('[data-hi="supporting"] li').evaluateAll(els => els.map(e => e.dataset.ok === '1')), hv.supporting.map(x => x.ok), id + ' strengths'); const nok = hv.supporting.filter(x => !x.ok).length; assert.eq(await p.locator('[data-hi="supporting"] small').count(), nok, 'a missing strength says "Not on file yet", it is not only a colour');
      assert.eq(await p.locator('[data-hi="outcomes"] article').count(), 3); assert.deepEq(await p.locator('[data-hi="outcomes"] article').evaluateAll(els => els.map(e => [e.querySelector('.ui-chip').innerText.trim(), +e.querySelector('.ai-out__l b').innerText.replace('%', '')])), [['Approved', 72], ['Approved', 67], ['Denied', 36]]);
      assert.eq(await p.locator('[data-hi="outcomes"] .ai-out__l .ui-maturity, [data-hi="outcomes"] .ai-out__l .ui-chip').count(), 3, 'every modeled likelihood is marked Simulated');
      assert.eq((await p.locator('[data-hi="interpretation"]').innerText()).replace(/\s+/g, ' ').trim(), `Current historical alignment: ${hv.interpretation.label}`); assert.ok((await dlg(p).innerText()).includes(INTEL_BASIS) && (await dlg(p).innerText()).includes(DECISION_SUPPORT)); await closeTop(p);
    }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ A-16 the footer
  await T.test('A-16 the suggestions drawer footer: Submit to payer is off with its reason in plain text until the packet is ready; Refine, Add clinical context and Dismiss suggestions each work and are logged; a needs-input card has Save my words', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    let s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0402'); const sub = submitOf(s, r, listFor(s, 'auth', 'R-0402'));
    assert.eq(await p.locator('[data-rc-submit]').isDisabled(), true); assert.eq((await p.locator('[data-rc-submit]').innerText()).trim(), 'Open the send step'); assert.eq((await p.locator('[data-rc-reason]').innerText()).trim(), sub.reason); assert.match(sub.reason, /^1 suggestion still needs your own words/); assert.eq(await p.locator('[data-rc-submit]').getAttribute('aria-describedby'), 'rc-sub-r');
    for (const n of ['Refine suggestions', 'Add clinical context', 'Dismiss suggestions']) assert.eq(await dlg(p).getByRole('button', { name: n }).count(), 1, n);
    assert.match(await dlg(p).locator('.rc__safe').innerText(), /All decisions are logged with your name/);
    // Save my words on the card that needs them
    const card = p.locator('.ui-dialog--drawer .rc__card[data-rec="risk"]'); assert.eq((await card.locator('[data-rc-save]').innerText()).trim(), 'Save my words'); assert.eq(await card.locator('[data-rc-save]').isDisabled(), true);
    const words = 'A lower level of care was tried in September and the client returned to daily use within a week.'; await card.locator('[data-rc-ctx]').fill(words); assert.eq(await card.locator('[data-rc-save]').isEnabled(), true); await card.locator('[data-rc-save]').click();
    await p.waitForFunction(() => document.querySelector('.ui-dialog--drawer .rc__card[data-rec="risk"] [data-rc-check]').checked);
    s = await state('jperez'); const x = listFor(s, 'auth', 'R-0402').find(y => y.key === 'risk'); assert.eq(x.state, 'included'); assert.eq(x.context, words);
    assert.match(await p.locator('[data-rc-reason]').innerText(), /^Nothing to send at this stage \(Partial: decide\)\.$/, 'the reason follows the packet: no input is pending, so the stage is what is left'); assert.eq(await p.locator('[data-rc-submit]').isDisabled(), true);
    // Refine, Add clinical context, Dismiss suggestions
    await dlg(p).getByRole('button', { name: 'Refine suggestions' }).click(); await p.waitForTimeout(500); assert.eq((await eventsOf(/Suggestions refined against the record/)).length, 1);
    await dlg(p).getByRole('button', { name: 'Add clinical context' }).click(); const f = p.locator('.ui-dialog--drawer [data-rc-addform]'); assert.ok(await f.isVisible()); assert.eq(await f.locator('input[name="title"]').inputValue(), 'Clinical context');
    await f.locator('textarea[name="text"]').fill('A safety plan was reviewed with the client on Oct 28.'); await f.locator('button[type="submit"]').click(); await p.waitForSelector('.ui-dialog--drawer .rc__card[data-custom]'); await p.waitForTimeout(500); assert.eq((await eventsOf(/Clinical context added/)).length, 1); assert.ok(listFor(await state('jperez'), 'auth', 'R-0402').some(y => y.custom && /safety plan/.test(y.context || y.insert.text)));
    await dlg(p).getByRole('button', { name: 'Dismiss suggestions' }).click(); await p.waitForFunction(() => !document.querySelector('.ui-dialog--drawer .rc__card')); await p.waitForTimeout(300); assert.ok(listFor(await state('jperez'), 'auth', 'R-0402').filter(y => !y.custom).every(y => y.state === 'dismissed'), 'every suggestion is dismissed and can be brought back'); assert.eq((await eventsOf(/All suggestions dismissed/)).length, 1);
    assert.ok(!JSON.stringify((await state('jperez')).events).includes('safety plan was reviewed'), 'the clinician\'s words stay out of the audit text');
    await closeTop(p); assert.eq(await focusId(p), 'a-rc-open'); assert.deepEq(realErrs(errs), []); await p.context().close();
    // from the list, Submit is disabled with the stage or the first step of the flow
    await reset('canvas'); const o = await mk('jperez'); await list(o.p); await o.p.click('#a-rc-R-0411'); await o.p.waitForSelector('.ui-dialog--drawer .rc__card'); assert.match(await o.p.locator('[data-rc-reason]').innerText(), /^4 suggestions still need your own words/); await o.p.context().close();
  });

  // ------------------------------------------------------------------ the other roles
  await T.test('roles: the supervisor and the administrator see the groups, the due and dollars chips, the payer line and insights, and none of the clinical views (no Suggestions column, packet line, lift, trajectory, criteria or historical buttons, no clinical text in the page)', async () => {
    await reset('canvas'); const s = await state('jperez');
    for (const who of ['cdiaz', 'dowens']) {
      const st = await state(who); const me = await meOf(who); const { p, errs } = await mk(who); await list(p);
      assert.deepEq(await p.locator('tr.in-band').evaluateAll(els => els.map(e => e.dataset.band)), bandsOf(st).groups.map(g => g.key), who + ' groups'); assert.ok(await p.locator('.in-pulse').count() === 1 && await p.locator('#a-insights').count() === 1 && await p.locator('.a-recert').count() === 1, who + ': the payer line, Insights and the recertification line');
      for (const r of st.requests) { const sig = rowSignals(st, r, me); const tr = p.locator(`tbody tr[data-row-id="${r.id}"]`); if (!(await tr.count())) continue; if (sig.urgency.label) assert.eq((await tr.locator('.in-due').innerText()).trim(), sig.urgency.label, who + ' ' + r.id); if (sig.risk) assert.eq((await tr.locator('.in-money .ui-chip').innerText()).trim(), sig.risk.label, who + ' ' + r.id); }
      assert.eq(await p.locator('[data-packet], [data-lift], .a-recchip, .in-needs, .a-basis').count(), 0, who + ': no clinical signal'); assert.ok(!(await p.locator('thead').innerText()).includes('Suggestions'));
      await p.locator('[data-pulse-see]').click(); await p.waitForSelector('.ai-pp'); assert.match(await dlg(p).innerText(), /Payer insights · Sentara Health Plans[\s\S]*74% of requests/, who + ': See why works'); await closeTop(p);
      await openCase(p, 'R-0402'); const html = await p.content(); assert.ok(await p.locator('.ai-strip').count() === 1 && await p.locator('[data-recs-quiet]').count() === 1, who); assert.match(await p.locator('[data-recs-quiet]').innerText(), /Clinical views and suggestions are for the treating clinician\./);
      assert.eq(await p.locator('#a-traj, #a-hist, #a-criteria, #a-rc-open').count(), 0, who + ': no clinical buttons'); assert.ok(!/Key drivers identified|Symptom and functional trend|Historical outcome interpretation|Chart-to-criteria match|Lead with why the ratings support|Reported drinking|Urine drug screen/.test(html), who + ': no clinical text in the page');
      assert.deepEq(st.rec_decisions, [], who + ' reads no decisions'); assert.deepEq(realErrs(errs), [], who); await p.context().close();
    }
    const ds = await mk('khale'); await ds.p.goto(BASE + '/#/Authorizations'); await ds.p.waitForTimeout(600); assert.match(await ds.p.locator('#root').innerText(), /Not available/); assert.eq(await ds.p.locator('.in-pulse, #a-insights').count(), 0); await ds.p.context().close();
    assert.ok(s.requests.length === 11);
  });

  // ------------------------------------------------------------------ keyboard and focus
  await T.test('keyboard: Insights, Analyze a case, See why and the four case buttons open with Enter and give focus back on Escape; the Group by urgency switch works with Space; the tab order reaches every new control', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await list(p);
    for (const id of ['a-insights', 'a-analyze']) { await p.locator('#' + id).focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.ui-dialog'); assert.ok(await p.locator('.ui-dialog').getAttribute('aria-labelledby'), id); await closeTop(p); assert.eq(await focusId(p), id, id + ' focus returns'); }
    await p.locator('[data-pulse-see]').focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.ui-dialog--drawer .ai-pp'); await closeTop(p); assert.eq(await focusId(p), 'a-pulse-see');
    await p.locator('#a-grp').focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300); assert.eq(await p.locator('tr.in-band').count(), 0, 'Space turns grouping off'); await p.keyboard.press('Space'); await p.waitForTimeout(300); assert.ok(await p.locator('tr.in-band').count() >= 4);
    // the Analyze drawer: Tab stays inside, and the form is reachable by label
    await p.locator('#a-analyze').focus(); await p.keyboard.press('Enter'); await p.waitForSelector('#aw-form'); for (const l of ['Case reference', 'Consumer', 'Plan type', 'Member ID', 'Group number', 'Payer context (optional)']) assert.ok(await p.getByLabel(l).count() >= 1, 'a label for ' + l);
    for (let i = 0; i < 40; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.activeElement.closest('.ui-dialog') !== null), 'focus stays in the drawer'); await closeTop(p);
    await openCase(p, 'R-0402'); for (const id of ['a-traj', 'a-hist', 'a-criteria', 'a-rc-open']) { await p.locator('#' + id).focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.ui-dialog'); await closeTop(p); assert.eq(await focusId(p), id, id); }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the new copy
  await T.test('the new copy keeps to the final wording: no school, student, TDT, guardian, behaviour or classroom word and no em dash in the payer line, the row signals, the strip, the drawers, the criteria and the wizard (the stored records\' own quotes aside)', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez', 1440, 900, { reducedMotion: 'reduce' }); await list(p); const bits = [];
    const grab = async sel => { for (const t of await p.locator(sel).allInnerTexts()) bits.push(t); };
    await grab('.in-pulse'); await grab('[data-sig]'); await grab('.a-meta'); await grab('[data-lift]'); await grab('.a-basis'); await grab('tr.in-band');
    await p.click('[data-pulse-see]'); await p.waitForSelector('.ai-pp'); await grab('.ui-dialog'); await closeTop(p); await p.click('#a-insights'); await p.waitForSelector('.in-ins'); await grab('.ui-dialog'); await closeTop(p);
    await p.click('#a-analyze'); await p.waitForSelector('#aw-form'); await grab('.ui-dialog'); await p.click('[data-ui-action="0"]'); await p.waitForSelector('[role="tablist"]'); for (const t of ['crit', 'acts']) { await p.click('#aw-tab-' + t); await grab('#aw-panel'); } await closeTop(p);
    for (const id of ['R-0402', 'R-0391', 'R-0411', 'R-0395', 'R-0416']) {
      await openCase(p, id); await grab('.ai-strip'); await grab('.ai-intel'); await grab('#sec-recs .in-ds');
      for (const [btn, sel] of [['a-traj', '.ui-dialog'], ['a-hist', '.ui-dialog'], ['a-criteria', '.ui-dialog']]) { await p.click('#' + btn); await p.waitForSelector('.ui-dialog'); await p.waitForTimeout(100); await grab(sel); await closeTop(p); }
      await p.click('#a-rc-open'); await p.waitForSelector('.rc__card'); await grab('.ui-dialog .rc__foot'); await grab('.ui-dialog .rc__more'); await grab('[data-rc-reason]'); await closeTop(p);
    }
    const text = bits.join('\n'); assert.ok(text.length > 4000, 'there is copy to read: ' + text.length);
    const bad = text.split('\n').filter(l => WORDS.test(l)); assert.deepEq(bad, [], 'final wording: ' + bad.slice(0, 3).join(' | ')); const dash = text.split('\n').filter(l => /—/.test(l)); assert.deepEq(dash, [], 'no em dash: ' + dash.slice(0, 3).join(' | ')); assert.ok(!/will be approved|likely to be approved|guarantee|(?<!not a )predict\w*/i.test(text), 'no prediction (the basis sentence says it is not one)');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the phone
  await T.test('phone width 390: the list with its groups, the payer line and the header buttons, the case page strip, and every new drawer and modal fit with no horizontal scroll; touch targets are at least 44 px', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez', 390, 844, { reducedMotion: 'reduce' }); await list(p); assert.ok((await fits(p)).page, 'list');
    assert.ok(await p.locator('tr.in-band').count() >= 4, 'the headings show on the phone'); const th = await p.evaluate(() => { const w = document.querySelector('.ui-qt__table').getBoundingClientRect().width; return [...document.querySelectorAll('tr.in-band th')].every(h => Math.abs(h.getBoundingClientRect().width - w) <= 1); }); assert.ok(th, 'each heading spans the columns that are on screen, no phantom column');
    const hs = await p.evaluate(() => [...document.querySelectorAll('#a-analyze, #a-insights, #a-filters, [data-pulse-see], [data-pulse-x], .a-recert, .a-grp, .a-recchip--m')].filter(e => e.offsetParent).map(e => [e.id || e.className.toString().slice(0, 20), Math.round(e.getBoundingClientRect().height), Math.round(e.getBoundingClientRect().width)])); assert.ok(hs.length >= 8 && hs.every(([, , w]) => w >= 44), 'touch targets are wide enough: ' + JSON.stringify(hs.filter(([, , w]) => w < 44)));
    assert.eq(hs.filter(([, h]) => h < 44).length, 0, 'every control is 44 px tall: ' + JSON.stringify(hs.filter(([, h]) => h < 44)));
    await p.click('[data-pulse-see]'); await p.waitForSelector('.ai-pp'); let f = await fits(p); assert.ok(f.page && f.dialogs, 'payer insights ' + JSON.stringify(f)); await closeTop(p);
    await p.click('#a-insights'); await p.waitForSelector('.in-ins'); f = await fits(p); assert.ok(f.page && f.dialogs, 'insights ' + JSON.stringify(f)); await closeTop(p);
    await p.click('#a-analyze'); await p.waitForSelector('#aw-form'); f = await fits(p); assert.ok(f.page && f.dialogs, 'analyze form ' + JSON.stringify(f)); const ts = await p.evaluate(() => [...document.querySelectorAll('.ui-dialog .aw-src label, .ui-dialog select, .ui-dialog input[type="text"], .ui-dialog .ui-btn')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(ts.length >= 6 && ts.every(h => h >= 44), 'controls are 44 px tall: ' + ts.join());
    await p.click('[data-ui-action="0"]'); await p.waitForSelector('[role="tablist"]'); for (const t of ['traj', 'crit', 'acts']) { await p.click('#aw-tab-' + t); f = await fits(p); assert.ok(f.page && f.dialogs, 'analysis ' + t + ' ' + JSON.stringify(f)); } await closeTop(p);
    await openCase(p, 'R-0402'); assert.ok((await fits(p)).page, 'case page'); const cb = await p.evaluate(() => [...document.querySelectorAll('.ai-intel .ui-btn, #a-rc-open')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(cb.length === 4 && cb.every(h => h >= 44), 'the four buttons: ' + cb.join());
    for (const [id, sel] of [['a-traj', '.ai-tj'], ['a-hist', '.ai-hist'], ['a-criteria', '.a-critl'], ['a-rc-open', '.rc__card']]) { await p.click('#' + id); await p.waitForSelector(sel); f = await fits(p); assert.ok(f.page && f.dialogs, id + ' ' + JSON.stringify(f)); await closeTop(p); }
    await p.click('#a-rc-open'); await p.waitForSelector('.rc__card'); const rb = await p.evaluate(() => [...document.querySelectorAll('.ui-dialog--drawer .rc .ui-btn')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(rb.length >= 5 && rb.every(h => h >= 44), 'the drawer buttons incl. Save my words: ' + rb.join()); await closeTop(p);
    for (const w of [1024, 768]) { await p.setViewportSize({ width: w, height: 900 }); await list(p); assert.ok((await fits(p)).page, 'list at ' + w); const bw = await p.evaluate(() => { const tw = document.querySelector('.ui-qt__table').getBoundingClientRect().width; return [...document.querySelectorAll('tr.in-band th')].every(h => Math.abs(h.getBoundingClientRect().width - tw) <= 1); }); assert.ok(bw, 'the headings span the table at ' + w); }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
} finally { await b.close(); }
await T.done();

