// E2: Authorizations queue and the authorization case shell (scenario S3, R-0416, and the decision, call, owner and unit-task paths).
// Standalone: `BASE=http://localhost:4830 node test/authorizations.mjs` (test/run-all.mjs starts a fresh server for it).
import { suite, assert, api, tryApi, state, reset, bridge, lpost, login, playwright, errors, sleep, BASE, SHOTS } from './lib/index.mjs';
import { prepTWTo } from './lib/prep.mjs';
import { authQueue, normalizeParams, GROUP, STAGE_LIST, CHIPS, authCase, unitsView, deadline, reauthDue } from '../web/js/shared/sel/auth.js';
import { evidenceIndex } from '../web/js/shared/enhance.js';
import { addBusinessDays } from '../web/js/shared/dates.js';
import { STATUS } from '../web/js/ui/chip.js';
import { draftInitialSRA } from '../web/js/shared/draft.js';

const T = suite('authorizations');
const req = async (id, as = 'jperez') => (await state(as)).requests.find(r => r.id === id);
const sidOf = r => (r.loc || '').match(/(?:processed|signed)=(\d+)/)?.[1];
const actor = async who => { const { session } = await import('./lib/index.mjs'); const j = await session(who); return j.actor; };

// ------------------------------------------------------------------ the selectors (pure)
await reset('canvas');
await T.test('every request.stage maps to the chip group of the status vocabulary (one mapping, tested)', async () => {
  for (const st of STAGE_LIST) { const g = (STATUS.stage[st] || {}).group; assert.ok(g, `${st} has a group in ui.STATUS`); assert.eq(GROUP[st], g, `${st}`); }
});
await T.test('the queue: chips overlap, counts follow the other filters, a draft is also a renewal, an overdue request is also submitted', async () => {
  const s = await state('jperez'); const me = await actor('jperez');
  const q = authQueue(s, normalizeParams({}), me);
  assert.eq(q.total, s.requests.length);
  for (const c of CHIPS) assert.ok(q.counts[c.value] != null, 'count for ' + c.label);
  const r411 = q.rows.find(r => r.id === 'R-0411'); assert.ok(r411.tags.includes('draft') && r411.tags.includes('renewal'), 'M.R. is a draft and a renewal');
  const r399 = q.rows.find(r => r.id === 'R-0399'); assert.ok(r399.tags.includes('needs') && r399.tags.includes('submitted'), 'overdue is needs action and submitted');
  const onlyAnthem = authQueue(s, normalizeParams({ payer: 'anthem' }), me); assert.ok(onlyAnthem.rows.every(r => r.payerId === 'anthem') && onlyAnthem.counts.all === onlyAnthem.rows.length);
  assert.eq(authQueue(s, normalizeParams({ status: 'needs' }), me).rows.every(r => r.tags.includes('needs')), true);
  const nov = authQueue(s, normalizeParams({ range: 'nov' }, s.today), me); assert.ok(nov.rows.some(r => r.id === 'R-0411') && nov.rows.length < q.total, 'a date range keeps the authorization periods that overlap it');
  const e30 = authQueue(s, normalizeParams({ ends: '30' }, s.today), me); assert.ok(e30.rows.every(r => (r.units.end || r.period.end) <= '2026-11-28'), 'ends within 30 days');
});
await T.test('v3 deep-link names (show=, st=, exp=, range=) become the canonical filters', async () => {
  assert.eq(normalizeParams({ show: 'renewals' }).status, 'renewal'); assert.eq(normalizeParams({ show: 'drafts' }).status, 'draft'); assert.eq(normalizeParams({ st: 'pending' }).status, 'submitted');
  assert.eq(normalizeParams({ st: 'denied' }).status, 'needs'); assert.eq(normalizeParams({ exp: '30' }).ends, '30'); assert.eq(normalizeParams({ ends: '7' }).ends, '7');
  const r = normalizeParams({ range: 'nov' }, '2026-10-29'); assert.eq(r.from, '2026-11-01'); assert.eq(r.to, '2026-11-30');
  assert.eq(normalizeParams({ status: 'nonsense' }).status, '');
});
await T.test('deadlines carry a source: day counts from the rules table, Harvest-reported, never a bare 7 or 14', async () => {
  const s = await state('jperez');
  const d = deadline(s, s.requests.find(r => r.id === 'R-0399')); assert.eq(d.sev, 'overdue'); assert.match(d.rule.verification, /Harvest-reported/); assert.match(d.text, /^Day \d+/);
  const e = deadline(s, s.requests.find(r => r.id === 'R-0384')); assert.eq(e.kind, 'appeal'); assert.match(e.rule.verification, /Unverified/);
  const u = unitsView(s, s.requests.find(r => r.id === 'R-0395')); assert.eq(u.left, 14); assert.eq(u.daysLeft, 4);
});
await T.test('QA2 D6: the case Evidence section reads the same gaps as the Scan & Enhance panel (evidenceIndex), never a fixed "Nothing missing"', async () => {
  const s = await state('jperez'); const me = await actor('jperez'); const idx = evidenceIndex(s, 'MR');
  const c = authCase(s, 'R-0411', me); assert.ok(idx.gaps.length > 0, 'the seeded M.R. record has gaps in the default period');
  assert.eq(c.evidence.gaps.length, idx.gaps.length, 'same count as the panel'); assert.eq(c.evidence.missing.length, idx.gaps.filter(g => g.kind === 'missing').length);
  assert.eq(c.evidence.gaps.map(g => g.id).join(), idx.gaps.map(g => g.id).join(), 'same gaps, same order');
  // a role without note text sees only the structural gaps (a withheld text is not "missing")
  const a = authCase(await state('dowens'), 'R-0411', await actor('dowens')); assert.ok(a.evidence.gaps.every(g => ['days', 'weeks', 'months', 'units'].includes(g.id)), a.evidence.gaps.map(g => g.id).join());
});
await T.test('QA2 D10: Reauth due is the end date minus the lead time from the rules table, with its source; the end date is not the due date', async () => {
  const s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0411'); const lead = s.rules.find(x => x.key === 'continued_stay.lead_business_days');
  const end = s.clients.find(x => x.id === 'MR').authorization.end; const want = addBusinessDays(end, -lead.value);
  const rd = reauthDue(s, r); assert.eq(rd.date, want); assert.ok(rd.date < end, 'earlier than the end date'); assert.match(rd.text, /^Reauth due /);
  const d = deadline(s, r); assert.eq(d.date, want); assert.match(d.text, /^Reauth (was )?due /); assert.match(d.sub, new RegExp(lead.value + ' business days')); assert.eq(d.rule.key, 'continued_stay.lead_business_days'); assert.match(d.rule.verification || d.rule.category || '', /nverified|UNVERIFIED/i);
  const c = authCase(s, 'R-0411', await actor('jperez')); assert.ok(c.timeline.some(e => /^(Upcoming · )?Reauth due/.test(e.what) && String(e.at).slice(0, 10) === want), 'the timeline carries the same date');
});
await T.test('roles: admin sees status, units and the queue but no evidence text; direct support has no queue', async () => {
  const s = await state('dowens'); const q = authQueue(s, normalizeParams({}), await actor('dowens'));
  assert.ok(q.rows.length >= 9); const c = authCase(s, 'R-0411', await actor('dowens'));
  assert.eq(c.evidence.clinical, false); assert.ok(c.evidence.sources.every(x => !x.quote), 'no quote text'); assert.eq(c.caps.viewText, false);
  assert.eq(Object.keys(s.request_details || {}).length, 0, 'request_details withheld from admin');
  await assert.refused(tryApi('request.pdfCopy', { id: 'R-0399' }, 'khale'), /not allowed/i, 403);
});

// ------------------------------------------------------------------ owners, calls, decisions (server)
await reset('canvas');
await T.test('owner and backup: set by anyone who opens the queue, visible to admin, the backup must be a different clinician or supervisor', async () => {
  await api('auth.assign', { id: 'R-0411', owner: 'cdiaz', backup: 'jperez' }, 'cdiaz');
  const m = (await state('dowens')).auth_meta['R-0411']; assert.eq(m.owner, 'cdiaz'); assert.eq(m.backup, 'jperez');
  await assert.refused(tryApi('auth.assign', { id: 'R-0411', owner: 'khale' }, 'jperez'), /clinician or a site supervisor/);
  await assert.refused(tryApi('auth.assign', { id: 'R-0411', owner: 'jperez', backup: 'jperez' }, 'jperez'), /different person/);
  await assert.refused(tryApi('auth.assign', { id: 'R-0411', owner: 'jperez' }, 'khale'), /not allowed/i, 403);
  await api('auth.assign', { id: 'R-0411', owner: 'jperez', backup: 'cdiaz' }, 'jperez');
  assert.eq(authCase(await state('jperez'), 'R-0411', await actor('jperez')).owner.id, 'jperez');
});
await T.test('the follow-up call log is append-only, needs the send capability, and a confirmed receipt is kept once', async () => {
  await assert.refused(tryApi('auth.logCall', { id: 'R-0391', outcome: 'in_review' }, 'dowens'), /not allowed/i, 403);
  await assert.refused(tryApi('auth.logCall', { id: 'R-0391', outcome: 'whatever' }, 'cdiaz'), /what the payer said/);
  await assert.refused(tryApi('auth.logCall', { id: 'R-0411', outcome: 'in_review' }, 'cdiaz'), /sent request/);
  await api('auth.logCall', { id: 'R-0391', outcome: 'in_review', note: 'Rep sees it, 2 days' }, 'cdiaz');
  await api('auth.logCall', { id: 'R-0391', outcome: 'receipt_confirmed' }, 'jperez');
  const s = await state('jperez'); const calls = s.auth_meta['R-0391'].calls; assert.eq(calls.length, 2); assert.eq(calls[0].by, 'cdiaz'); assert.eq(calls[1].by, 'jperez'); assert.eq(calls[0].day, 6);
  assert.eq(s.requests.find(r => r.id === 'R-0391').receipt_by, 'jperez');
  await api('auth.logCall', { id: 'R-0391', outcome: 'receipt_confirmed' }, 'cdiaz');   // a second confirmation is logged but does not overwrite
  assert.eq((await req('R-0391')).receipt_by, 'jperez');
});
await T.test('a payer decision needs its document reference and a plausible date; it is write-once', async () => {
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0391', outcome: 'approved', units: 150 }, 'jperez'), /document reference/, 422);
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0391', outcome: 'approved', units: 150, doc_ref: 'LTR-1', received: '2027-01-01' }, 'jperez'), /future/);
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0391', outcome: 'approved', units: 100, doc_ref: 'LTR-1' }, 'jperez'), /partial award/);
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0391', outcome: 'approved', units: 150, doc_ref: 'LTR-1' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0411', outcome: 'approved', units: 150, doc_ref: 'LTR-1' }, 'jperez'), /sent request/);
});
await T.test('approved: Active, the award in the tracker (not Lauris), and the human task "Enter units in Lauris" opens', async () => {
  const j = await api('auth.recordDecision', { id: 'R-0391', outcome: 'approved', units: 150, doc_ref: 'HUM-LTR-0391' }, 'jperez');
  assert.eq(j.stage, 'active');
  const s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0391'); assert.eq(r.units_awarded, 150); assert.eq(r.decision_log.at(-1).doc_ref, 'HUM-LTR-0391'); assert.eq(r.decision_log.at(-1).sim, false);
  const jo = s.clients.find(c => c.id === 'JO'); assert.eq(jo.authorization.units, 150); assert.eq(jo.authorization.in_lauris, false);
  const task = s.lauris_tasks.find(t => t.client === 'JO' && t.status === 'open'); assert.ok(task && task.units === 150 && /Enter 150 units/.test(task.text));
  await assert.refused(tryApi('auth.recordDecision', { id: 'R-0391', outcome: 'denied', doc_ref: 'X-2' }, 'jperez'), /sent request/);   // no longer submitted
});
await T.test('the task closes only when the open Lauris page shows the units: a forged event, or no action at all, cannot close it', async () => {
  const before = (await state('jperez')).lauris_tasks.filter(t => t.status === 'open').length; assert.ok(before >= 1);
  const j = await bridge('lauris.observed', { event: 'authorization', session: '1', form: 'authorization', consumer: { no: '4400', initials: 'J.O.', units: '150 units available' }, values: {}, typed: [], user: 'J. Perez, LPC' });
  assert.ok(!j.ok, 'the open Lauris page does not show it');
  assert.eq((await state('jperez')).lauris_tasks.filter(t => t.status === 'open').length, before);
  await assert.refused(tryApi('auth.reconcile', {}, 'dowens+p'), /cannot be called directly/);
});
await T.test('partial and denied: the stage follows, the appeal window comes from the rules table', async () => {
  await reset('canvas');
  const p = await api('auth.recordDecision', { id: 'R-0391', outcome: 'partial', units: 90, doc_ref: 'HUM-LTR-2', notes: 'offer by phone' }, 'cdiaz');   // cdiaz holds payer.decision by designation
  assert.eq(p.stage, 'partial_decide'); const r = await req('R-0391'); assert.eq(r.units_offered, 90);
  await reset('canvas');
  await api('auth.recordDecision', { id: 'R-0391', outcome: 'denied', doc_ref: 'HUM-LTR-3', reason_text: 'not medically necessary', received: '2026-10-28' }, 'jperez');
  const d = await req('R-0391'); assert.eq(d.stage, 'denied'); assert.eq(d.appeal_deadline, '2026-12-27'); assert.eq(d.notice_date, '2026-10-28');
});
await T.test('reconcile: units approved at 150 on T.N. replace the 65, and T.W. is not Active without units', async () => {
  await reset('canvas');
  await api('request.p2pLog', { id: 'R-0388', outcome: 'approved', units: 150, doc_ref: 'SEN-LTR-1' }, 'jperez');
  const s = await state('jperez'); assert.eq(s.requests.find(r => r.id === 'R-0388').stage, 'active'); assert.eq(s.clients.find(c => c.id === 'TN').authorization.units, 150);
  await prepTWTo('sent'); await api('request.demoReply', { id: 'R-0416', kind: 'approved' }, 'dowens+p');
  const s2 = await state('jperez'); assert.eq(s2.requests.find(r => r.id === 'R-0416').stage, 'active'); assert.eq(s2.clients.find(c => c.id === 'TW').authorization.units, 150);
  assert.ok(s2.lauris_tasks.some(t => t.client === 'TW' && t.status === 'open'), 'the task to enter the units');
});

// ------------------------------------------------------------------ S3 through the case shell (UI)
const { chromium } = playwright();
const b = await chromium.launch();
const mk = async (as, w = 1440, h = 900) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
const realErrs = e => e.filter(x => !/Parent|MyWork|LANG_OFF/.test(x));

// T.W. with the initial SRA processed in Lauris (a person's click, reported by the page bridge): R-0416 is Pending clinical approval
const toNeedsApproval = async () => {
  await reset('live'); const { no } = await prepTWTo('isp-ready');
  const { FORMS } = await import('../server/lauris/forms.js');
  const st = await state('jperez'); const tw = st.clients.find(c => c.id === 'TW'); const sc = st.screenings.find(x => x.client === 'TW');
  const sra = draftInitialSRA({ client: tw, screening: { facts: sc.facts, when: sc.when }, referral: st.referrals.find(r => r.id === 'REF-118'), today: st.today, request: st.requests.find(r => r.id === 'R-0416') });
  const sv = Object.fromEntries(sra.boxes.map(b => [b.label, b.value])); const f = { action: 'process' };
  FORMS['sra-initial'].fields.forEach((fl, i) => { if (sv[fl.label] != null && !['table', 'phq', 'static'].includes(fl.type)) f['f' + i] = sv[fl.label]; });
  const sid = sidOf(await lpost(`/consumers/${no}/session/sra-initial`, 'jperez', f));
  const ev = (event, extra = {}) => bridge('lauris.observed', { event, session: String(sid), form: 'sra-initial', consumer: { no: String(no), initials: 'T.W.' }, values: event === 'processed' ? sv : {}, typed: [], user: 'J. Perez, LPC', ...extra });
  const signed = async () => { await lpost(`/approvals/${sid}/sign`, 'jperez', {}); return ev('signed', { preview: { title: 'TDT Initial SRA', rows: sra.boxes.map(b => ({ label: b.label, value: b.value })) } }); };
  assert.ok((await ev('processed')).ok); return { no, sid, ev, signed };
};
try {
  await T.test('the queue (R3, after the artifact): no demo buttons, a Status dropdown instead of chips, URL state, v3 links, sort, search, Denial Intelligence links', async () => {
    await reset('canvas'); const { p, errs } = await mk('dowens');
    await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(800);
    const txt = await p.locator('main').innerText(); assert.noMatch(txt, /Demo only|Demo: receive|advance the clock/i, 'demo controls left the screen');
    const opts = await p.locator('select[data-key="status"] option').allInnerTexts(); for (const l of ['All statuses', 'Needs action', 'Draft', 'Awaiting signature', 'Submitted', 'Active', 'Renewal due', 'Flagged']) assert.ok(opts.includes(l), 'status option ' + l + ' in ' + opts.join());
    assert.eq(await p.locator('.ui-fchips').count(), 0, 'no status chips: the artifact has dropdown filters only');
    await p.selectOption('select[data-key="status"]', 'needs'); await p.waitForTimeout(300);
    assert.match(await p.evaluate(() => location.hash), /status=needs/); const rows = await p.locator('tbody tr[data-ui-row]').count(); assert.ok(rows >= 2 && rows <= 5, 'filtered rows ' + rows);
    assert.ok(await p.locator('a[href^="#/Authorization?id="]').count() >= 1, 'rows are real links to the case');
    await p.goto(BASE + '/#/Authorizations?show=renewals&exp=60'); await p.waitForTimeout(700);
    const h = await p.evaluate(() => location.hash); assert.match(h, /status=renewal/); assert.noMatch(h, /show=|exp=/); assert.match(h, /ends=60/);
    await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(600);
    await p.locator('th button', { hasText: 'Remaining' }).click(); await p.waitForTimeout(300);
    assert.eq(await p.locator('th[aria-sort="ascending"]').count(), 1);
    await p.fill('input[type=search]', 'Sentara'); await p.waitForTimeout(600); assert.ok((await p.locator('tbody tr[data-ui-row]').count()) <= 3);
    await p.fill('input[type=search]', ''); await p.waitForTimeout(500);
    assert.ok(await p.locator('tbody a[href^="#/DenialCase?id="]').count() >= 3, 'partial, info and denied rows open the Denial Intelligence case');
    assert.eq(await p.locator('.a-di').count(), 0, 'no "In Denial Intelligence" line in the status cell any more');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('the table (feedback Nov 11, laid out like the artifact): units are one bar "N left of M" flagged from 75% used; the Next action cell holds the button and a dated deadline with a warning icon; ten filters on the page', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900);
    const row = name => p.locator('tbody tr[data-ui-row]', { hasText: name }).first();
    assert.match(await row('M.R.').innerText(), /27\s*left of 110/); assert.ok(await row('M.R.').locator('.ui-units.is-warn').count(), 'M.R. is at 75% used: yellow flag');
    assert.ok(await row('T.N.').locator('.ui-units.is-out').count(), '0 left of 65 is the red state'); assert.eq(await row('D.W.').locator('.ui-units.is-warn, .ui-units.is-out').count(), 0, '110 left of 110 carries no flag');
    assert.ok(await row('A.L.').locator('.ui-dateflag--overdue .ui-dateflag__i svg').count(), 'an overdue date carries a warning icon');
    const heads = (await p.locator('thead th').allInnerTexts()).map(x => x.trim().replace(/\s+/g, ' ')); assert.deepEq(heads, ['Consumer', 'Service', 'Payer', 'Assigned clinician', 'Authorization period', 'Requested', 'Approved', 'Remaining', 'Status', 'Next action'], 'the artifact columns');
    const cell = await row('M.R.').locator('.a-c-next').innerText(); assert.match(cell, /Nov 13/, 'the Next action cell carries the dated deadline: ' + cell); assert.ok(await row('M.R.').locator('.a-c-next .ui-dateflag--soon').count(), 'a flag icon on a deadline that is close');
    assert.noMatch(await p.locator('tbody').innerText(), /Harvest-reported|Unverified|Payer-specific|window ended/i, 'sources and sentences moved into the tooltip');
    for (const l of ['Status', 'Payer', 'Service type', 'Request type', 'Assigned clinician', 'Location', 'School', 'Units remaining', 'Next step due']) assert.ok(await p.locator('.ui-fsel__l', { hasText: new RegExp('^' + l + '$') }).count(), 'filter ' + l);
    assert.eq(await p.locator('.ui-fbar .ui-fsel, .ui-fbar .ui-fsearch').count(), 10, 'search plus nine dropdowns: the artifact grid of ten');
    assert.eq(await p.locator('.ui-pager').count(), 1, 'the pager is at the bottom'); { const n = (await state('jperez')).requests.length; assert.match(await p.locator('.ui-pager').innerText(), new RegExp('Showing\\s*1–' + Math.min(n, 25) + '\\s*of\\s*' + n + '\\s*authorizations')); } assert.noMatch(await p.locator('main > header, .a-head').innerText(), /\d+ of \d+/, 'no "N of M" at the top');
    assert.eq(await p.locator('details.ui-fmore').count(), 0, 'no "More filters" disclosure');
    await p.selectOption('select[data-key="units"]', 'warn'); await p.waitForTimeout(400);
    const flagged = await p.locator('tbody tr[data-ui-row]').allInnerTexts(); assert.eq(flagged.length, 3, 'flagged rows: ' + flagged.map(x => x.split('\n')[0]).join(','));
    assert.ok(/M\.R\./.test(flagged.join()) && /S\.B\./.test(flagged.join()) && /T\.N\./.test(flagged.join()));
    assert.match(await p.evaluate(() => location.hash), /units=warn/);
    await p.selectOption('select[data-key="units"]', ''); await p.selectOption('select[data-key="due"]', 'overdue'); await p.waitForTimeout(400);
    const od = (await p.locator('tbody tr[data-ui-row]').allInnerTexts()).join('|'); assert.ok(/A\.L\./.test(od) && /M\.R\./.test(od), 'overdue rows: ' + od.replace(/\n/g, ' '));
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('S3 R-0416: Review packet -> Approve (Pending clinical approval) -> Sign in Lauris -> Send -> Submitted with the Sfax receipt', async () => {
    await reset('live'); await prepTWTo('isp-ready');
    const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Authorization?id=R-0416'); await p.waitForTimeout(900);
    assert.match(await p.locator('main').innerText(), /Review packet/); assert.ok(await p.getByRole('link', { name: /Open in Lauris/ }).count(), 'Review packet opens Lauris');
    const L = await toNeedsApproval(); await p.goto(BASE + '/#/Authorization?id=R-0416'); await p.waitForTimeout(900);
    assert.eq((await req('R-0416')).stage, 'needs_approval'); assert.match(await p.locator('main').innerText(), /Pending clinical approval/);
    // a site supervisor without the approver designation sees why the button is disabled
    const sup = await mk('cdiaz'); await sup.p.goto(BASE + '/#/Authorization?id=R-0416'); await sup.p.waitForTimeout(800);
    assert.ok(await sup.p.getByRole('button', { name: 'Approve', exact: true }).first().isDisabled(), 'Approve is disabled for an undesignated supervisor'); assert.match(await sup.p.locator('main').innerText(), /Needs designated approver/);
    await assert.refused(tryApi('request.approve', { id: 'R-0416' }, 'cdiaz'), /not allowed/i, 403);
    await sup.p.context().close();
    await p.getByRole('button', { name: 'Approve', exact: true }).first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click(); await p.waitForTimeout(1000);
    let r = await req('R-0416'); assert.eq(r.stage, 'awaiting_signature'); assert.eq(r.approved_by, 'jperez');
    assert.match(await p.locator('main').innerText(), /Sign in Lauris/); assert.ok(await p.getByRole('link', { name: /Open Forms to Approve/ }).count());
    assert.ok((await L.signed()).ok); await p.waitForTimeout(900);
    r = await req('R-0416'); assert.eq(r.stage, 'signed'); assert.eq(r.signed_by, 'J. Perez, LPC');
    // the approver and the sender can be different people: the supervisor (send designation) sends
    const sender = await mk('cdiaz'); await sender.p.goto(BASE + '/#/Authorization?id=R-0416'); await sender.p.waitForTimeout(800);
    await sender.p.getByRole('button', { name: 'Send by fax' }).first().click(); await sender.p.getByRole('dialog').getByRole('button', { name: 'Send by fax' }).click(); await sender.p.waitForTimeout(700);
    assert.eq((await req('R-0416')).stage, 'sending'); await sleep(3800); await sender.p.waitForTimeout(600);
    r = await req('R-0416'); assert.eq(r.stage, 'submitted'); assert.match(r.fax_ref, /^F-\d+/); assert.eq(r.sent_by, 'cdiaz'); assert.eq(r.approved_by, 'jperez');
    const body = await sender.p.locator('main').innerText(); assert.match(body, new RegExp(r.fax_ref)); assert.match(body, /Day 0/);
    await sender.p.screenshot({ path: SHOTS + '/authorizations-s3-submitted.png', fullPage: true });
    assert.deepEq(realErrs(sender.errs.concat(errs)), []); await p.context().close(); await sender.p.context().close();
  });
  await T.test('the history: rows open What · When · Who · Document · Source · Next action in a pop-up; ?section=timeline lands on History; every row has an actor tag', async () => {
    const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorization?id=R-0416&section=timeline'); await p.waitForTimeout(900);
    assert.ok(await p.locator('details[data-sec="history"][open]').count(), 'history block open');
    await p.locator('.hx__r').first().click(); await p.waitForSelector('.ui-dialog');
    const t = await p.locator('.ui-dialog').innerText(); for (const k of ['What', 'When', 'Who', 'Document', 'Source', 'Next action']) assert.match(t, new RegExp(k));
    await p.keyboard.press('Escape');
    const rows = await p.locator('.hx__r').count(); assert.ok(rows >= 5, 'at least five steps: ' + rows); assert.eq(await p.locator('.hx__r .hx__g').count(), rows, 'one actor tag per row'); assert.ok(await p.locator('.hx__w b').count() >= 5, 'latest first, with dates');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('Record decision: approved opens the Enter units in Lauris task (card with the Lauris link); Psyflo does not write units; admin sees the task read-only', async () => {
    const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorization?id=R-0416'); await p.waitForTimeout(800);
    await p.getByRole('button', { name: 'Record decision' }).first().click();
    await p.getByRole('dialog').getByRole('button', { name: 'Record' }).click(); await p.waitForTimeout(400);
    assert.eq((await req('R-0416')).stage, 'submitted', 'no document reference, nothing recorded');
    await p.getByRole('dialog').locator('#a-d-r').fill('HUM-LTR-0416'); await p.getByRole('dialog').getByRole('button', { name: 'Record' }).click(); await p.waitForTimeout(1000);
    assert.eq((await req('R-0416')).stage, 'active');
    const txt = await p.locator('main').innerText(); assert.match(txt, /Enter units in Lauris/); assert.match(txt, /Psyflo does not write units/); assert.ok(await p.getByRole('link', { name: /Open Lauris/ }).count() >= 1);
    const lt = (await state('jperez')).lauris_tasks.find(t => t.client === 'TW' && t.status === 'open'); assert.ok(lt, 'task open'); assert.eq(lt.units, 150);
    const ad = await mk('dowens'); await ad.p.goto(BASE + '/#/Authorization?id=R-0416&section=units'); await ad.p.waitForTimeout(900);
    assert.match(await ad.p.locator('main').innerText(), /Enter units in Lauris/);
    await p.screenshot({ path: SHOTS + '/authorizations-s3-active.png', fullPage: true });
    assert.deepEq(realErrs(errs.concat(ad.errs)), []); await p.context().close(); await ad.p.context().close();
  });
  await T.test('a supervisor may approve once designated (two people confirm it); the approval is recorded under the supervisor, and a different person can send', async () => {
    await toNeedsApproval();
    await assert.refused(tryApi('request.approve', { id: 'R-0416' }, 'cdiaz'), /not allowed/i, 403);
    const d = await api('user.designate', { id: 'cdiaz', cap: 'approve.sra', grant: true, reason: 'cover for the clinical lead' }, 'dowens');
    await api('user.designateApprove', { id: d.id, decision: 'approve' }, 'jperez');
    await api('request.approve', { id: 'R-0416', comment: 'covering' }, 'cdiaz');
    const r = await req('R-0416'); assert.eq(r.approved_by, 'cdiaz'); assert.eq(r.stage, 'awaiting_signature');
  });
  await T.test('case actions on an overdue request: Log call, Overdue notice (no legal standard cited), Send again with a reason, Change owner', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Authorization?id=R-0399'); await p.waitForTimeout(900);
    assert.match(await p.locator('main').innerText(), /Overdue/); { const hv = p.locator('[data-verification="harvest"]'); assert.ok(await hv.count() >= 1, 'the follow-up day carries a Harvest-reported source icon'); assert.match(await hv.first().getAttribute('aria-label'), /Harvest-reported/); assert.noMatch(await p.locator('main').innerText(), /Harvest-reported/, 'the source is an icon with a hover definition, not a chip'); }
    await p.getByRole('button', { name: 'Log call' }).first().click(); await p.getByRole('dialog').locator('#a-call-o').selectOption('in_review');
    await p.getByRole('dialog').locator('textarea').fill('Rep sees it in review'); await p.getByRole('dialog').getByRole('button', { name: 'Log call' }).click(); await p.waitForTimeout(900);
    assert.eq((await state('jperez')).auth_meta['R-0399'].calls.at(-1).outcome, 'in_review'); assert.eq(await p.getByRole('dialog').count(), 0, 'the dialog closed');
    await p.getByRole('button', { name: 'Send notice' }).first().click(); const letter = await p.locator('.a-letter').innerText();
    assert.match(letter, /We have not received a decision/); assert.match(letter, /Jordan Perez, LPC/); assert.noMatch(letter, /7-calendar-day|7-day|standard/i, 'no legal standard is cited');
    await p.getByRole('dialog').getByRole('button', { name: 'Send notice' }).click(); await p.waitForTimeout(900);
    const r = await req('R-0399'); assert.ok(r.overdue_notice_sent && /^F-\d+/.test(r.overdue_notice_ref), 'the reference comes from the send stub'); assert.eq(await p.getByRole('dialog').count(), 0);
    await p.getByRole('button', { name: 'Send again' }).first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Send again' }).click(); await p.waitForTimeout(300);
    assert.ok(!(await req('R-0399')).resends, 'a reason is required'); await p.getByRole('dialog').locator('textarea').fill('Humana says the fax did not arrive'); await p.getByRole('dialog').getByRole('button', { name: 'Send again' }).click(); await p.waitForTimeout(900);
    const rs = (await req('R-0399')).resends; assert.eq(rs.length, 1); assert.eq(rs[0].by, 'jperez'); assert.eq((await req('R-0399')).sent.slice(0, 10), '2026-10-12', 'the decision clock keeps its first send date');
    await p.getByRole('button', { name: 'Change' }).first().click(); await p.getByRole('dialog').locator('#a-as-o').selectOption('jperez'); await p.getByRole('dialog').locator('#a-as-b').selectOption('cdiaz'); await p.getByRole('dialog').getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(900);
    assert.eq((await state('jperez')).auth_meta['R-0399'].owner, 'jperez'); assert.match(await p.locator('.ui-hcard .ui-owner').innerText(), /J\. Perez/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('old routes keep working: Submission and EarlyDischarge land on the case sections; legacy=1 opens the old screen', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Submission?id=R-0399'); await p.waitForTimeout(800); let h = await p.evaluate(() => location.hash + '|' + psyflo.current.id);
    assert.match(h, /^#\/Authorization\?id=R-0399&section=submission\|Authorization$/); assert.ok(await p.locator('[data-sec="submission"]').count(), 'the submission card');
    await p.goto(BASE + '/#/EarlyDischarge?id=R-0402'); await p.waitForTimeout(800); h = await p.evaluate(() => location.hash); assert.match(h, /id=R-0402&section=transition/);
    await p.goto(BASE + '/#/Authorizations?id=R-0391'); await p.waitForTimeout(800); assert.match(await p.evaluate(() => location.hash), /^#\/Authorization\?id=R-0391/);
    await p.goto(BASE + '/#/Submission?id=R-0399&legacy=1'); await p.waitForTimeout(800); assert.eq(await p.evaluate(() => psyflo.current.id), 'Submission');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('direct support has no Authorizations; a missing or foreign case says so instead of failing', async () => {
    const ds = await mk('khale'); await ds.p.goto(BASE + '/#/Authorizations'); await ds.p.waitForTimeout(700); assert.match(await ds.p.locator('#root').innerText(), /Not available/); await ds.p.context().close();
    const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorization?id=R-9999'); await p.waitForTimeout(700); assert.match(await p.locator('main').innerText(), /not in the tracker/);
    await p.goto(BASE + '/#/Authorization?id=R-0377'); await p.waitForTimeout(700); assert.match(await p.locator('main').innerText(), /not in the tracker/, 'outpatient rows are never in this projection');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
} finally { await b.close(); }
await T.done();
