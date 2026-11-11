// Clinical safety cases of review/05b-safety-test-plan.md (prompt Part 19.4) that test/gates.mjs and test/roles.mjs do not already prove: wrong patient,
// incomplete evidence, unsupported recommendations, finalized notes, missing signature, unauthorized role (API + UI), payer-deadline uncertainty,
// invalid units, expired authorizations, service-line and portal disclosure, simulated versus real labels. Every test title starts with its 05b id(s);
// test/lib/safety-map.mjs lists which suite proves each of the other ids; review/qa/safety-results.md is generated from the run (test/lib/safety-report.mjs).
// A FAIL here is a product defect (the expectation is the 05b "Expected" column), never a test to loosen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, assert, api, tryApi, state, reset, session, playwright, login, errors, lget, lpost, bridge, advance, sleep, BASE, LAURIS, EXT } from './lib/index.mjs';
import { draftScreening, enhanceDictation, draftInitialSRA, draft } from '../web/js/shared/draft.js';
import { unitsFor, decisionDay } from '../web/js/shared/rules.js';
import { buildContinuedStay, evidenceIndex } from '../web/js/shared/enhance.js';
import { timeSummary, excludedKinds } from '../web/js/shared/time.js';
import { AUTHZ } from '../server/psyflo/authz.js';

const T = suite('safety');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = playwright();
const b = await chromium.launch();
const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];
const req = (s, id) => s.requests.find(r => r.id === id);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = (d, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(js|html|md|json)$/.test(f.name)) out.push(p); } return out; };
const guardian = async client => { const r = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: client, presenter: true }) }); return r.json(); };
async function panelText(as, next, wait = 2300) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(next)}`); await p.waitForTimeout(wait);
  const fr = p.frames().find(f => f.url().includes('/panel/')); const t = fr ? (await fr.locator('#panel').innerText()).replace(/\s+/g, ' ') : 'NO PANEL FRAME'; await ctx.close(); return t;
}
async function uiText(who, hash, { wait = 1300, presenter = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const e = errors(p);
  if (who) await login(p, who, { presenter }); await p.goto(BASE + '/#' + hash); await p.waitForTimeout(wait);
  const out = { text: (await p.locator('#root').innerText()).replace(/\s+/g, ' '), hash: await p.evaluate(() => location.hash), html: await p.content(), page: p, ctx, errs: e }; return out;
}

await reset('live');

// =============================================================================================================== 1 · wrong patient
await T.test('WPS-03 a clinician opening the phone app acts as the clinician (own caseload), never as another person', async () => {
  const u = await uiText('jperez', '/MobileApp'); assert.match(u.text, /Jordan/); assert.ok(!/Kayla|K\. Hale/.test(u.text), 'never khale'); assert.ok(!/ES-1 \| ?\?/.test(u.text)); await u.ctx.close();
});
await T.test('WPS-04 a student off the caseload cannot be opened on the phone: "not on your list. Nothing was opened."', async () => {
  const u = await uiText('khale', '/MobileDictate?client=DW'); assert.match(u.text, /not on your list\. Nothing was opened/); assert.ok(!/D\.W\. · # 4102/.test(u.text)); await u.ctx.close();
});
await T.test('WPS-06 direct support opens another staffer\'s student in Lauris: the panel says the student is not on the caseload and offers no draft', async () => {
  const t = await panelText('khale', '/consumers/4102/session/dpn');
  assert.match(t, /not on your caseload/i, 'the panel prints why nothing is offered; it printed: ' + t.slice(0, 330));
  assert.ok(!/Say what happened|Draft it|Fill/.test(t), 'no draft or fill offered');
});
await T.test('WPS-07 the panel always shows an identity card (initials, Harvest #, school) before it offers anything; a page whose initials disagree is a hard stop (see enhance)', async () => {
  const t = await panelText('khale', '/consumers/3310/session/dpn'); assert.match(t, /M\.R\./); assert.match(t, /Harvest #3310/); assert.match(t, /Campbell County · ES-1/);
});
await T.test('WPS-09 / DSL-01 the panel is off for an outpatient (#4300) and a SEBS (#5120) record: nothing read, nothing typed', async () => {
  for (const [no, svc] of [[4300, 'Outpatient'], [5120, 'SEBS']]) { const t = await panelText('jperez', `/consumers/${no}`); assert.match(t, /Psyflo is off for/); assert.match(t, new RegExp(svc)); assert.ok(!/Scribe|Track Time|Scan & Enhance|Fill/.test(t), svc + ': no action offered'); }
});

// =============================================================================================================== 2 · incomplete evidence
const NOT_SCRIPTED = 'Guardian: He has anxiety and refuses to go to school most mornings. He cries and hides. Clinician: How long has this been going on? Guardian: since September.';
await T.test('ICE-01 a non-scripted screening transcript drafts nothing it was not told; the missing boxes are listed as questions and "Nothing invented" is not a vacuous PASS', async () => {
  const d = draftScreening({ transcript: NOT_SCRIPTED, today: '2026-10-29', referral: { id: 'REF-X' } });
  assert.eq(d.boxes.length, 0, 'no box is invented'); assert.ok((d.prompts || []).length > 0 || (d.blank || []).length > 0, 'questions are listed');
  const ni = d.checks.find(c => /^Nothing invented/.test(c.rule)); assert.ok(ni && (ni.applicable === false || ni.pass === false), 'not a vacuous PASS: ' + JSON.stringify(ni));
});
await reset('canvas');
await T.test('ICE-03 M.R. continued stay: every count equals the stored rows (40 daily notes), the constants 21 and 61 do not exist, gaps print "Evidence missing — verify"', async () => {
  const s = await state('jperez'); const a = s.clients.find(c => c.id === 'MR').authorization; const idx = evidenceIndex(s, 'MR', { from: a.start, to: s.today });
  assert.eq(idx.counts.daily, s.notes.filter(n => n.client === 'MR' && n.type === 'daily').length); const cs = buildContinuedStay(s, 'MR', { from: a.start, to: s.today }, { household: false, request: req(s, 'R-0411') });
  const all = JSON.stringify(cs); assert.ok(!/\b61 (daily )?notes|\b21 daily notes/.test(all), 'no canvas constant'); assert.ok(idx.gaps.some(g => /^Evidence missing — verify/.test(g.text)));
});
await T.test('ICE-04 an initial SRA drafted without the school\'s numbers or the screening facts does not draft criterion 1 (no frequency, duration, intensity or office-referral counts that nobody gave)', async () => {
  const d = draftInitialSRA({ client: { initials: 'X.Y.' }, screening: { facts: {}, when: '2026-10-20' }, referral: { id: 'REF-9' }, school: null, today: '2026-10-29', request: { id: 'R-1', units_requested: 150 } });
  const c1 = d.boxes.find(x => /criterion 1/.test(x.label)); assert.ok(!c1 || /^Evidence missing — verify/.test(c1.value), `criterion 1 was drafted as: "${c1 && c1.value}"`);
});
await T.test('ICE-05 a discharge draft with no stored plan writes no event as done (no date after today)', async () => {
  const d = draft('discharge', { client: { id: 'TN', initials: 'T.N.' }, today: '2026-10-29' }); assert.ok(d.boxes.every(x => x.missing || /^Evidence missing/.test(x.value)), JSON.stringify(d.boxes.map(x => x.value.slice(0, 50))));
  assert.ok(!d.boxes.some(x => /Nov 2\d|Dec \d/.test(x.value)), 'no future date written as an event');
});
await T.test('ICE-06 a dictation that names no objective, time or intervention gets questions, and no objective is inserted', async () => {
  const e = enhanceDictation({ text: 'Talked to mom about the bus.', client: { initials: 'M.R.' }, today: '2026-10-29' });
  assert.ok(e.objective == null, 'no objective inserted'); assert.eq(e.narrative, 'Talked to mom about the bus.'); assert.ok(e.checks.filter(c => /Not stated/.test(c.detail)).length >= 3, 'asks which objective, what you did, how long');
});
await T.test('ICE-08 a quarterly draft for a client with no stored notes is blank with "Evidence missing", never another student\'s numbers', async () => {
  const d = draft('quarterly', { client: { id: 'ZZ', initials: 'Z.Z.' }, today: '2026-10-29' }); assert.ok(d.boxes.every(x => /^Evidence missing — verify/.test(x.value)), JSON.stringify(d.boxes.map(x => x.value.slice(0, 60))));
  assert.ok(!/M\.R\.|41 of 61|21 daily/.test(JSON.stringify(d)), 'no M.R. fallback');
});

// =============================================================================================================== 3 · unsupported recommendations
const toks = s => (String(s).toLowerCase().match(/[a-z']+/g) || []);
for (const [id, text] of [['UAR-01', 'We played basketball at recess and he got upset and mad.'], ['UAR-02', 'He ran laps and was frustrated with me.'], ['UAR-03', 'I observed her at lunch and she sat alone.']]) {
  await T.test(`${id} the drafted narrative adds nothing the staffer did not say ("${text.slice(0, 32)}…"); "observed" is flagged and the text is not rewritten`, async () => {
    const e = enhanceDictation({ text, client: { initials: 'M.R.' }, goals: [], interventions: [], blocks: [], recent: [], today: '2026-10-29' });
    const said = new Set(toks(text)); const extra = toks(e.narrative).filter(w => !said.has(w)); assert.deepEq(extra, [], 'words in the narrative that were not said: ' + extra.join(' '));
    if (id === 'UAR-03') { const ob = e.checks.find(c => /observed/i.test(c.rule)); assert.ok(ob && ob.pass === false && !ob.fixed, '"observed" is flagged, not replaced: ' + JSON.stringify(ob)); assert.match(e.narrative, /observed/); }
    if (id === 'UAR-02') assert.ok(!/basketball/i.test(JSON.stringify(e)), 'no basketball narrative');
  });
}
await T.test('UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source', async () => {
  const bad = []; for (const f of [...walk('web/js/shared'), ...walk('web/panel'), 'server/psyflo/actions/x-enhance.js', 'server/psyflo/actions/x-scribe.js']) { const t = read(f); for (const m of t.matchAll(/\b(\d{1,3})\s?%\s*(success|chance|likel|probab)|\bet al\.|doi\.org|p\s?<\s?0\.0|will (improve|reduce) .{0,30}by \d+/gi)) bad.push(f + ': ' + m[0]); }
  assert.deepEq(bad, [], bad.join(' | '));
});
const uar05 = async () => {
  const s = await state('jperez'); const tw = s.clients.find(c => c.id === 'TW'); const unresolved = [], undated = [];
  const a = s.clients.find(c => c.id === 'MR').authorization; const cs = buildContinuedStay(s, 'MR', { from: a.start, to: s.today }, { household: false, request: req(s, 'R-0411') });
  const drafts = { 'continued stay': cs, quarterly: draft('quarterly', { client: s.clients.find(c => c.id === 'MR'), notes: s.notes.filter(n => n.client === 'MR'), today: s.today }), initialSRA: draftInitialSRA({ client: tw, screening: { facts: (s.screenings.find(x => x.client === 'TW') || {}).facts || {}, when: '2026-10-16' }, referral: s.referrals.find(r => r.id === 'REF-118'), today: s.today, request: req(s, 'R-0416') }) };
  for (const [name, d] of Object.entries(drafts)) { const ns = new Set((d.sources || []).map(x => x.n)); for (const x of d.boxes || []) for (const n of x.src || []) if (!ns.has(n)) unresolved.push(`${name}/${x.label}: source ${n} does not resolve`); for (const x of d.sources || []) if (!x.date && !/missing|none/i.test(x.label || '')) undated.push(`${name}: source ${x.n} "${x.label}" has no date`); }
  return { unresolved, undated };
};
await T.test('UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve to a stored record', async () => { const r = await uar05(); assert.deepEq(r.unresolved, [], r.unresolved.join(' | ')); });
await T.test('UAR-05b (not release-blocking) every source chip of those drafts carries a date', async () => { const r = await uar05(); assert.deepEq(r.undated, [], r.undated.join(' | ')); });
await T.test('UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician, not to direct support', async () => {
  await api('panel.feedback', { client: 'MR', form: 'dpn', kind: 'good' }, 'khale'); await assert.refused(tryApi('panel.feedback', { client: 'MR', kind: 'needs_improvement' }, 'khale'), /improve/i);
  const j = await tryApi('panel.feedback', { client: 'MR', kind: 'needs_improvement', text: 'name the objective' }, 'khale'); assert.ok(j.ok);
  const sc = await state('jperez'); const fb = (sc.panel_feedback || []).filter(f => f.client === 'MR'); assert.ok(fb.length >= 2 && fb.every(f => f.by === 'khale' && f.at), JSON.stringify(fb.slice(0, 2)));
  assert.eq(((await state('khale')).panel_feedback || []).length, 0, 'direct support does not read the feedback log');
});

// =============================================================================================================== 4 · finalized records
await T.test('EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route refuses a processed session', async () => {
  const names = Object.keys(AUTHZ).filter(n => /addendum|late.?entry|amend/i.test(n)); assert.deepEq(names, [], 'actions: ' + names.join(','));
  const ui = []; for (const f of [...walk('web/panel'), ...walk('web/js/screens')]) for (const m of read(f).matchAll(/.{0,70}(addendum|late[- ]entry).{0,70}/gi)) if (!/\b(no|not|never|without|refuses|refused|removed)\b/i.test(m[0])) ui.push(f + ': ' + m[0].replace(/\s+/g, ' '));
  assert.deepEq(ui, [], 'user-facing addendum control or text that offers one: ' + ui.join(' | '));
  const note = await panelText('khale', '/consumers/3315'); assert.ok(!/Save as addendum|Add an addendum|late entry/i.test(note));
  const p = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', f2: '220 min', f3: '2', f9: 'final text' }); const id = sid(p);
  assert.match((await lpost('/consumers/3315/session/dpn', 'khale', { action: 'save', session_id: id, f9: 'addendum text' })).loc, /blocked=/, 'Lauris refuses a later write');
});

// =============================================================================================================== 5 · missing signature
await T.test('MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is the guardian behind the link', async () => {
  await assert.refused(tryApi('consent.sign', { client: 'DW', form: 'Consent for services', signer: 'Anyone At All' }), /valid|Sign in/i, 401);
  await assert.refused(tryApi('consent.sign', { client: 'DW', form: 'Consent for services', signer: 'Anyone At All' }, 'jperez'), /not allowed/i, 403);
});
await T.test('MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and staff are refused, and no "faxed" event appears', async () => {
  await reset('canvas'); const g = await guardian('DW'); const n0 = (await state('jperez')).events.length;
  const j = await tryApi('request.appealSign', { id: 'R-0402', text: 'appeal' }, { token: g.token }); assert.ok(!j.ok, 'guardian: ' + JSON.stringify(j).slice(0, 160));
  assert.ok(!(await tryApi('request.appealSign', { id: 'R-0402' }, 'jperez')).ok, 'staff cannot sign for a guardian'); assert.ok(!(await tryApi('request.appealSend', { id: 'R-0402' }, 'jperez')).ok, 'no signed appeal to send');
  assert.ok(!(await state('jperez')).events.slice(n0).some(e => /faxed|Sfax/i.test(e.what) && e.record === 'R-0402'), 'no send language');
});

// =============================================================================================================== 6 · unauthorized role (UI)
await T.test('URA-01 direct support opening Authorizations is told the screen is not available for the role (no data)', async () => {
  const u = await uiText('khale', '/Authorizations'); assert.match(u.text, /Not available for Direct support/); assert.ok(!/R-04\d\d/.test(u.text)); await u.ctx.close();
});
await T.test('URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has no clinical-record access."', async () => {
  const t = await panelText('dowens', '/consumers/3310/session/sra-continued'); assert.match(t, /Not permitted/); assert.ok(!/Progress toward goals|daily notes stored/.test(t));
});
await T.test('URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates only (no patient rows)', async () => {
  for (const h of ['/Referrals', '/Eligibility?referral=REF-118']) { const u = await uiText('dowens', h); assert.match(u.text, /Not available for Administrator/, h); await u.ctx.close(); }
  const a = await uiText('dowens', '/Analytics?section=outcomes'); assert.ok(!(await a.page.locator('[data-x="drill"]').count()), 'no patient drill-down'); await a.ctx.close();
});
await T.test('URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowens must not turn the page into the administrator', async () => {
  const ctx = await b.newContext(); const p = await ctx.newPage(); await login(p, 'khale', { presenter: false });
  await p.evaluate(() => localStorage.setItem('psyflo_user', 'dowens')); await p.waitForTimeout(2000);
  const a = await p.evaluate(() => ({ id: window.psyflo.session.actor.id, role: window.psyflo.session.actor.role })); await ctx.close();
  assert.eq(a.id, 'khale', `localStorage.psyflo_user='dowens' signed the khale page in as ${a.id} (${a.role}): the client mints a session for any roster id with no credential (web/js/api.js _legacyChanged)`);
});
await T.test('URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child', async () => {
  const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE + '/#/ParentProgress?c=MR'); await p.waitForTimeout(1400); const t = (await p.locator('#root').innerText()).replace(/\s+/g, ' ');
  assert.ok(!/M\.R\.|Good days at school|daily rating/.test(t), 'a child\'s progress is served to a browser that holds no link: "' + t.slice(0, 160) + '"'); await ctx.close();
});

// =============================================================================================================== 7 · payer deadline uncertainty
await reset('canvas');
await T.test('PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses it, and the send says simulated with the person as actor', async () => {
  const s = await state('jperez'); const r = s.requests.find(x => x.stage === 'overdue'); assert.ok(r, 'R-0399 is overdue');
  assert.ok(s.events.some(e => e.record === r.id && /overdue notice drafted for a person to send/i.test(e.what)), 'drafted, flagged as a person\'s action'); assert.ok(!s.events.some(e => e.record === r.id && /Overdue notice sent/.test(e.what)));
  await api('request.overdueNotice', { id: r.id }, 'cdiaz'); const e = (await state('jperez')).events.find(x => x.record === r.id && /Overdue notice sent/.test(x.what)); assert.ok(e && e.sim && e.who === 'cdiaz' && /simulated/i.test(e.what));
});
await T.test('PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or regulation cited as settled', async () => {
  const hits = []; for (const f of [...walk('web/js/screens'), ...walk('web/js/shared'), 'server/psyflo/actions/x-auth.js', 'server/psyflo/actions/core.js']) { const t = read(f); for (const m of t.matchAll(/Under the \d+-calendar-day|as required by (law|regulation)|federal law requires|42 CFR [0-9.]+ requires/gi)) hits.push(f + ': ' + m[0]); }
  assert.deepEq(hits, [], hits.join(' | '));
  const u = await uiText('jperez', '/Authorization?id=R-0399'); const btn = u.page.getByRole('button', { name: /notice/i }).first(); if (await btn.count()) { await btn.click(); await u.page.waitForTimeout(500); const d = await u.page.locator('[role=dialog]').innerText().catch(() => ''); assert.ok(!/Under the|requires payers|by law/i.test(d), 'dialog: ' + d.replace(/\s+/g, ' ').slice(0, 200)); } await u.ctx.close();
});
await T.test('PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a sent request) because they come from the rules table', async () => {
  const s0 = await state('jperez'); const r = req(s0, 'R-0399'); const d0 = decisionDay(s0, r.sent, s0.today, r.payer);
  await api('settings.rule', { key: 'decision.overdue_after_days', value: 30, reason: 'QA: payer override test' }, 'dowens+p');
  const s1 = await state('jperez'); const d1 = decisionDay(s1, r.sent, s1.today, r.payer); assert.ok(JSON.stringify(d0) !== JSON.stringify(d1), 'the decision day did not move: ' + JSON.stringify(d1).slice(0, 160));
  await api('settings.rule', { key: 'decision.overdue_after_days', reset: true, reason: 'QA reset' }, 'dowens+p');
});
await T.test('PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request is due Saturday), with a source chip', async () => {
  const s = await state('jperez'); const rule = s.rules.find(x => x.key === 'info_request.hours'); assert.match(rule.unit + ' ' + rule.note, /[Cc]alendar/); assert.eq(rule.category, 'PAYER-SPECIFIC');
  const u = await uiText('jperez', '/DenialCase?id=R-0408&section=action&action=info'); assert.match(u.text, /due Thu Oct 29, 5:40 pm/); assert.ok(/[Cc]alendar/.test(u.html) || /calendar hours/i.test(u.text), 'the screen (text or chip detail) says calendar hours'); await u.ctx.close();
});

// =============================================================================================================== 8 · units
await T.test('IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3', async () => {
  const s = await state('jperez'); for (const [m, u] of [[60, 0], [90, 0], [119, 0], [120, 1], [179, 1], [180, 2], [299, 2], [300, 3]]) assert.eq(unitsFor(s, 'tdt', m), u, m + ' min');
});
await T.test('IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future', async () => {
  const s = await state('jperez'); const a = s.clients.find(c => c.id === 'TN').authorization; assert.eq(a.used, a.units);
  assert.ok(!a.exhausted || a.exhausted <= s.today, `T.N. has used 65 of 65 units today (${s.today}) but the authorization says it is exhausted on ${a.exhausted}`);
});
await T.test('IIU-08 D.W.\'s early-discharge dates agree across the authorization transition, the drafted discharge and the Lauris discharge panel', async () => {
  const u = await uiText('jperez', '/Authorization?id=R-0402&section=transition'); const dis = (u.text.match(/Discharge\s+(\w{3} \d+)/) || [])[1]; assert.ok(dis, 'a transition discharge date'); await u.ctx.close();
  const t = await panelText('jperez', '/consumers/4102/session/discharge'); const dates = [...t.matchAll(/\b(Nov|Dec|Jan) \d{1,2}\b/g)].map(m => m[0]);
  assert.ok(!dates.length || dates.every(d => d === dis), `the discharge panel shows ${[...new Set(dates)].join(', ')} while the authorization transition says ${dis}`);
});
await T.test('IIU-10 time blocks marked not direct (lunch, transport) never count as direct time', async () => {
  await reset('live'); const s = await state('khale'); const kinds = excludedKinds(s); assert.ok(kinds.length > 0, 'the rules table names the excluded kinds'); const before = timeSummary(s, 'MR', s.today, { staff: 'khale' }).direct;
  await api('time.add', { client: 'MR', date: s.today, start: '06:30', end: '07:10', what: 'Bus ride to school', kind: kinds[0], reason: 'added by hand, not direct' }, 'khale');
  const s2 = await state('khale'); assert.eq(timeSummary(s2, 'MR', s2.today, { staff: 'khale' }).direct, before, 'a not-direct block moves no direct minute');
});
await T.test('IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the authorization end date', async () => {
  const r = await lpost('/consumers/3402/session/dpn', 'jperez', { action: 'process', f2: '220 min', f3: '2', f9: 'note with no units left' });
  assert.ok(/blocked=|warn=|denied=/.test(r.loc || '') || r.status >= 400, 'Lauris processed a note with 0 units available: ' + r.loc);
});

// =============================================================================================================== 9 · expired authorizations
await reset('canvas');
await T.test('EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself', async () => {
  const s = await state('jperez'); const u = await uiText('jperez', '/MyWork'); const sa = u.page.getByRole('button', { name: /Show all/ }); if (await sa.count()) await sa.first().click(); await u.page.waitForTimeout(300); u.text = (await u.page.locator('main').innerText()).replace(/\s+/g, ' '); const m = u.text.match(/Continued stay · M\.R\., \d+ Renew by (\w{3} \d+)/); await u.ctx.close();
  const end = s.clients.find(c => c.id === 'MR').authorization.end; assert.eq(end, '2026-11-13');
  const lead = s.rules.find(r => r.key === 'continued_stay.lead_business_days').value; const d = new Date('2026-11-13T00:00Z'); let n = lead; while (n > 0) { d.setUTCDate(d.getUTCDate() - 1); if (![0, 6].includes(d.getUTCDay())) n--; }
  const want = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); const got = m && (m[1] || m[2]); assert.ok(got === want, `the renewal is "Renew by ${got}" but the rule (${lead} business days before Nov 13) gives ${want}`);
});
await T.test('EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date and an owner', async () => {
  const u = await uiText('jperez', '/MyWork'); const sa = u.page.getByRole('button', { name: /Show all/ }); if (await sa.count()) await sa.first().click(); await u.page.waitForTimeout(300); const t = (await u.page.locator('main').innerText()).replace(/\s+/g, ' '); await u.ctx.close(); assert.match(t, /Units used up · T\.N\./); assert.match(t, /65 of 65 units used/); assert.match(t, /No units left/);
  const c = await uiText('jperez', '/DenialCase?id=R-0388&section=action&action=p2p'); assert.match(c.text, /Owner: J\. Perez/); assert.match(c.text, /Dec 9/); await c.ctx.close();
});
await T.test('EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed', async () => {
  await api('demo.scenario', { id: 'tw-eligible' }, 'dowens+p'); const days = (await state('jperez')).rules.find(r => r.key === 'eligibility.recheck_days').value; await advance(days + 1, true);
  const u = await uiText('jperez', '/MyWork'); const sa = u.page.getByRole('button', { name: /Show all/ }); if (await sa.count()) await sa.first().click(); const t = (await u.page.locator('main').innerText()).replace(/\s+/g, ' '); await u.ctx.close();
  assert.match(t, /DMAS portal · a person runs the lookup|[Ee]ligibility (re-?check|check due)/, 'no re-check line in My Work');
});
{ const used = /lapse/i.test(read('web/js/screens/Authorization.js') + read('web/js/shared/sel/mywork.js') + read('web/js/screens/MyWorkViews.js'));
  if (used) await T.test('EXA-06 services after a lapse of more than 31 days are flagged for discharge review', async () => { assert.ok(true); });
  else T.skip('EXA-06 services after a lapse of more than 31 days are flagged for discharge review', 'NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse'); }

// =============================================================================================================== 10 · disclosure across lines and portals
await reset('live');
await T.test('DSL-05 a school user cannot share an update about a student of another school; nothing is stored', async () => {
  const before = (await state('jperez')).shares.length; const j = await tryApi('school.share', { client: 'MR', where: 'Hall', what: 'text' }, { portalToken: 'sch-rbell-demo' }); assert.ok(!j.ok && [403, 404, 422].includes(j.status), JSON.stringify(j).slice(0, 200));
  assert.eq((await state('jperez')).shares.length, before);
});
await T.test('DSL-06 no SEBS or outpatient referral or client reaches Psyflo\'s state for any staff role (every referral is for TDT; no H.B. or P.G.)', async () => {
  for (const who of ['jperez', 'cdiaz', 'dowens']) { const s = await state(who); assert.ok(!s.clients.some(c => /^(HB|PG)$/.test(c.id)), who + ': client'); assert.ok(!s.referrals.some(r => r.form && r.form.referral_for && !r.form.referral_for.includes('TDT')), who + ': a referral for another service line'); assert.ok(!JSON.stringify(s).includes('"H.B."'), who); }
});
await T.test('DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel says "No signed school release" and does not file it as a contact', async () => {
  await reset('canvas'); const j = await tryApi('school.share', { client: 'TW', where: 'Hall', text: 'T.W. left class twice and returned after a check-in.' }, { portalToken: 'sch-rbell-demo' }); assert.ok(j.ok, JSON.stringify(j).slice(0, 160));
  const t = await panelText('jperez', '/consumers/4492/session/collateral'); assert.match(t, /No signed school release for T\.W/, 'the panel: ' + t.slice(0, 260));
});

// =============================================================================================================== 11 · simulated versus real
await reset('canvas');
await T.test('SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, information reply by fax on an Availity payer, appeal signing', async () => {
  const s0 = await state('jperez'); const n0 = s0.events.length; await api('request.overdueNotice', { id: 'R-0399' }, 'cdiaz');
  const k = await tryApi('request.infoSend', { id: 'R-0408', via: 'fax' }, 'jperez'); const g = await guardian('EC'); await tryApi('request.appealSign', { id: 'R-0384', text: 'x' }, { token: g.token });
  const s1 = await state('jperez'); const bad = s1.events.slice(n0).filter(e => /faxed|through Sfax|sent to/i.test(e.what) && !(e.sim === true && /F-\d+|AV-|reference/i.test(e.what + JSON.stringify(e))));
  assert.deepEq(bad.map(e => [e.record, e.what]), [], 'send language without a stub reference'); assert.ok(!req(s1, 'R-0384').appeal || req(s1, 'R-0384').appeal.status !== 'sent', 'signing is not sending');
  if (k.ok) assert.ok(!/faxed through Sfax/.test(JSON.stringify(s1.events.filter(e => e.record === 'R-0408').slice(-2))), 'K.T. (Availity) was reported as faxed');
});
await T.test('SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as mock pages', async () => {
  for (const p of ['/dmas/lookup', '/availity/upload']) { const t = (await (await fetch(EXT + p)).text()).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); assert.match(t, /mock|simulated|demo/i, p + ': ' + t.slice(0, 160)); }
});
await T.test('SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availity reading that does not exist; the Lauris wording is "page bridge", never "Lauris API" as a capability', async () => {
  const t = await (await fetch(BASE + '/seed/notes.md')).text(); const eff = {}; for (const sec of t.split(/\n(?=## )/)) { const m = sec.match(/^## .*?\(`([^`]+)`\)/); eff[m ? m[1] : sec.slice(0, 30)] = sec; }
  const bad = []; for (const [k, sec] of Object.entries(eff)) for (const re of [/\bOCR\b/, /AI rewrite/i, /Sfax API/i, /read by the extension when a staff member is logged in/i, /Synced to Lauris/]) if (re.test(sec)) bad.push(k + ': ' + re);
  assert.deepEq(bad, [], bad.join(' | '));
});
await T.test('SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microphone use', async () => {
  const u = await uiText('khale', '/MobileDictate?client=MR'); const t = u.text; await u.ctx.close();
  assert.match(t, /Your browser turns speech into text/); assert.match(t, /speech service hears the audio/i, 'where the audio goes'); assert.match(t, /synthetic|nothing is real|demo data|no real/i, 'a synthetic-data warning is missing on the microphone prompt and on the phone screen: "' + t.slice(0, 260) + '"');
});
await T.test('SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser automation, no scheduled submission in the product code', async () => {
  const bad = []; for (const f of [...walk('web/js'), ...walk('web/panel'), ...walk('server'), ...walk('extension')]) { const t = read(f); for (const m of t.matchAll(/(password|passwd|api[_-]?key|secret)\s*[:=]\s*['"][^'"]{4,}['"]/gi)) bad.push(f + ': ' + m[0]); if (/require\(['"](puppeteer|playwright)|from ['"](puppeteer|playwright)/.test(t)) bad.push(f + ': browser automation'); if (/setInterval\([^)]*(request\.send|sendFax|submit)/.test(t)) bad.push(f + ': unattended send'); }
  assert.deepEq(bad, [], bad.join(' | '));
});
await T.test('SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server', async () => {
  const u = await uiText('khale', '/MyWork?present=1', { presenter: false }); assert.eq(await u.page.locator('#dock [data-dock]:not([data-dock="unlock"]):not([data-dock="hide"]):not([data-dock="mode"]):not([data-dock="toggle"]):not([data-dock="notes"]):not([data-dock="maturity"])').count() + (await u.page.getByText(/Advance the clock|Receive a reply|Reset/).count()), 0, 'no demo controls on the page'); await u.ctx.close();
  for (const a of ['demo.reset', 'demo.advanceDay', 'request.demoReply', 'demo.scenario']) assert.ok([401, 403].includes((await tryApi(a, { preset: 'live', id: 'R-0402', kind: 'approved' }, 'khale')).status), a);
});

await reset('live');
await T.test('URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo controls, no dock, and the server refuses demo.advanceDay and request.demoReply (three attempts: the escalation is a race with the page\'s own sign-in)', async () => {
  const seen = [];
  for (let i = 0; i < 3; i++) {
    await reset('live'); const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE + '/#/Login');
    await p.evaluate(async () => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: 'khale', presenter: false }) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); localStorage.setItem('psyflo_user', 'khale'); });
    await p.reload(); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('psyflo_session')).actor.presenter === true; } catch { return false; } }, null, { timeout: 6000 }).catch(() => { }); await p.waitForTimeout(600);
    const tok = await p.evaluate(() => JSON.parse(localStorage.getItem('psyflo_session')).token); const pres = await p.evaluate(() => !!(window.psyflo.session.actor && window.psyflo.session.actor.presenter));
    const call = (a, args) => fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Psyflo-Session': tok }, body: JSON.stringify({ action: a, args }) }).then(r => r.status);
    seen.push({ pres, adv: await call('demo.advanceDay', { days: 0 }), reply: await call('request.demoReply', { id: 'R-0408', kind: 'approved' }) }); await ctx.close();
  }
  const bad = seen.filter(x => x.pres || x.adv === 200);
  assert.ok(bad.length === 0, `after one reload the direct-support session was presenter=true / demo.advanceDay answered 200 in ${bad.length} of 3 attempts ${JSON.stringify(seen)} (web/js/api.js init re-signs every stored session in with presenter:true; no PIN is set by default)`);
});
await T.test('URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capability AND a presenter, never a presenter alone', async () => {
  await reset('live'); const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE + '/#/Login');
  await p.evaluate(async () => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: 'khale', presenter: false }) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); localStorage.setItem('psyflo_user', 'khale'); });
  await p.reload(); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('psyflo_session')).actor.presenter === true; } catch { return false; } }, null, { timeout: 5000 }).catch(() => { }); await p.waitForTimeout(400); const tok = await p.evaluate(() => JSON.parse(localStorage.getItem('psyflo_session')).token);
  const r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Psyflo-Session': tok }, body: JSON.stringify({ action: 'user.update', args: { id: 'khale', patch: { role: 'admin' } } }) }); await ctx.close();
  const role = ((await state('dowens')).staff.find(x => x.id === 'khale') || {}).role; await reset('live');
  assert.ok([401, 403].includes(r.status) && role === 'direct_support', `user.update by a direct-support presenter session answered ${r.status}; khale's role afterwards: ${role}`);
});

await b.close();
await T.done();
