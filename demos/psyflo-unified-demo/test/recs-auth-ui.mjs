// R6 · Authorizations (Owner A): "Suggested by Psyflo" on the list and the case page, the payer criteria checklist, and the simpler case page (side drawers).
// Standalone: `BASE=http://localhost:5200 node test/recs-auth-ui.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: the clinician sees the card on the case page and the drawer with the cards; Include, Dismiss, Add context (the clinician's own words), Add your own and
// Apply selected work and persist; a suggestion that needs input cannot be included without text; the list carries a Suggestions chip that opens the drawer
// without leaving the list; the payer criteria modal shows Documented / Needs strengthening from the stored record (checked against the engine for three requests);
// the supervisor, the administrator and direct support see no suggestion content; ?section=... deep links open their content in drawers; focus returns to the
// opener; no horizontal scroll at 390 px; the new copy keeps to the final wording; zero page errors.
import { suite, assert, api, tryApi, state, reset, login, playwright, errors, BASE } from './lib/index.mjs';
import { listFor, insertsFor, textOf } from '../web/js/shared/recs.js';
import { evidenceIndex } from '../web/js/shared/sel/disputes.js';
import { levelCheck, dueState, requestLevel } from '../web/js/shared/asam.js';

const T = suite('recs-auth-ui');
const realErrs = e => e.filter(x => !/Parent|MyWork|LANG_OFF/.test(x));
const WORDS = /\b(school|student|TDT|therapeutic day treatment|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
const { chromium } = playwright(); const b = await chromium.launch();
const mk = async (as, w = 1440, h = 900) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
const focusId = p => p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.getAttribute('data-ui-return') || document.activeElement.tagName));
const openCase = async (p, id, extra = '') => { await p.goto(BASE + `/#/Authorization?id=${id}${extra}`); await p.waitForSelector('.ui-hcard'); };
const drawerCard = (p, key) => p.locator(`.ui-dialog--drawer .rc__card[data-rec="${key}"]`);
const recsOf = async (id, as = 'jperez') => listFor(await state(as), 'auth', id);
const counts = recs => { const live = recs.filter(r => r.state !== 'dismissed'); return { live: live.length, high: live.filter(r => r.impact === 'high').length, included: recs.filter(r => r.state === 'included').length }; };
const fits = async p => p.evaluate(() => ({ page: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, dialogs: [...document.querySelectorAll('.ui-dialog')].every(d => d.scrollWidth <= d.clientWidth + 1 && [...d.querySelectorAll('.ui-dialog__b')].every(x => x.scrollWidth <= x.clientWidth + 1)) }));

try {
  // ------------------------------------------------------------------ the clinician: the card and the drawer
  await reset('canvas');
  await T.test('clinician: the case page carries "Suggested by Psyflo" (the top three, four buttons: Suggested actions, Clinical trajectory, Payer criteria, Historical outcomes); the drawer shows every card, labels the sample and links to Lauris with the panel; Escape returns focus', async () => {
    const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.waitForSelector('#sec-recs');
    const recs = await recsOf('R-0402'); assert.ok(recs.length >= 4 && recs.length <= 6, 'a short list: ' + recs.length);
    assert.match(await p.locator('#sec-recs h2').innerText(), /^Suggested by Psyflo$/);
    const mini = await p.locator('#sec-recs .rcm__t').allInnerTexts(); assert.deepEq(mini, recs.slice(0, 3).map(r => r.title), 'the top three, in the engine\'s order');
    for (const n of ['Suggested actions', 'Clinical trajectory', 'Payer criteria', 'Historical outcomes']) assert.ok(await p.getByRole('button', { name: n, exact: true }).count() === 1, n);
    const top = await p.evaluate(() => document.querySelector('#sec-recs').getBoundingClientRect().top); assert.ok(top < 900, 'on the first screen, under the signals strip and Next step: ' + top);
    await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    const keys = await p.locator('.ui-dialog--drawer .rc__card').evaluateAll(els => els.map(e => e.dataset.rec)); assert.deepEq(keys, recs.map(r => r.key), 'one card for each suggestion');
    assert.match(await p.locator('.ui-dialog--drawer .ui-dialog__t').innerText(), /Suggested by Psyflo · D\.W\./);
    const text = await p.locator('.ui-dialog--drawer').textContent(); assert.match(text, /Illustrative sample/, 'the outcome numbers say they are a sample'); assert.ok(await p.locator('.ui-dialog--drawer .ui-chip', { hasText: /sample/ }).count() >= 1);
    assert.ok(await p.locator('.ui-dialog--drawer .rc__meter .ui-maturity').count() >= 1, 'marked Simulated');
    const a = p.locator('.ui-dialog--drawer .a-rcfoot a'); assert.match(await a.innerText(), /Open in Lauris with the Psyflo panel/); const href = await a.getAttribute('href');
    assert.match(href, /\/login\?as=jperez&next=/); assert.match(decodeURIComponent(href), /next=\/consumers\/4102\/session\/sra-continued/); assert.eq(await a.getAttribute('target'), '_blank');
    await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await p.locator('.ui-dialog').count(), 0); assert.eq(await focusId(p), 'a-rc-open', 'focus returns to the opener');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ include, dismiss, add context, apply selected, persist
  await T.test('Apply selected: tick two suggestions and one that needs the clinician\'s own words; the batch is one audit event, the drawer and the page follow, and it persists after a reload', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    const risk = drawerCard(p, 'risk'); assert.ok(await risk.locator('[data-rc-check]').isDisabled(), 'a card that needs input starts disabled');
    await drawerCard(p, 'level-cite').locator('[data-rc-check]').check(); await drawerCard(p, 'd5-cite').locator('[data-rc-check]').check();
    await risk.locator('[data-rc-ctx]').fill('   '); assert.ok(await risk.locator('[data-rc-check]').isDisabled(), 'spaces are not words');
    const words = 'A lower level of care was tried in September and the client returned to daily use within a week.';
    await risk.locator('[data-rc-ctx]').fill(words); assert.ok(await risk.locator('[data-rc-check]').isEnabled(), 'the card can be included once it has the clinician\'s words'); await risk.locator('[data-rc-check]').check();
    await p.locator('.ui-dialog--drawer [data-rc-apply]').click(); await p.waitForFunction(() => /3 suggestions included of/.test(document.querySelector('.ui-dialog--drawer [data-rc-count]').textContent));
    const s = await state('jperez'); const recs = listFor(s, 'auth', 'R-0402'); const by = k => recs.find(r => r.key === k);
    assert.deepEq(['level-cite', 'd5-cite', 'risk'].map(k => by(k).state), ['included', 'included', 'included']); assert.eq(by('risk').context, words); assert.eq(textOf(by('risk')), words, 'the clinician\'s words are the text');
    assert.ok(insertsFor(recs).some(x => x.box === 'Continued need / risk' && x.text === words), 'what Psyflo types into the form box');
    const ev = s.events.filter(e => e.record === 'R-0402' && /recommendations applied/.test(e.what)); assert.eq(ev.length, 1); assert.match(ev[0].what, /3 included/); assert.noMatch(ev[0].what, /lower level of care was tried/, 'the words stay out of the audit text'); assert.eq(ev[0].who, 'jperez');
    assert.ok(await drawerCard(p, 'level-cite').locator('[data-rc-check]').isChecked()); assert.match(await p.locator('.ui-dialog--drawer .rc__meter').innerText(), /\d+%[\s\S]*\d+%/);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    assert.match(await p.locator('#sec-recs [data-recs-line]').innerText(), /3 included/); assert.ok(await p.locator('#sec-recs .rcm__l li[data-state="included"]').count() >= 1, 'an included suggestion shows its check on the page');
    assert.eq(await focusId(p), 'a-rc-open');
    await p.reload(); await p.waitForSelector('#sec-recs'); assert.match(await p.locator('#sec-recs [data-recs-line]').innerText(), /3 included/, 'persists after a reload');
    await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card'); assert.eq(await p.locator('.ui-dialog--drawer [data-rc-check]:checked').count(), 3);
    assert.eq(await drawerCard(p, 'risk').locator('[data-rc-ctx]').inputValue(), words, 'the words come back too');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('a suggestion that needs input cannot be included without text: the checkbox stays off and the server refuses; with the clinician\'s own words it goes in as their text', async () => {
    await reset('canvas'); await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included' }, 'jperez'), /needs your own words/, 422);
    const { p, errs } = await mk('jperez'); await openCase(p, 'R-0391'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    const card = drawerCard(p, 'level-reason'); assert.ok(await card.locator('[data-rc-check]').isDisabled()); assert.ok(await card.locator('.ui-chip', { hasText: 'Needs your input' }).count(), 'the card says what is needed'); assert.eq(await card.locator('.rc__text').count(), 0, 'Psyflo writes no text of its own for it');
    await p.locator('.ui-dialog--drawer [data-rc-apply]').click(); await p.waitForTimeout(400); assert.eq((await recsOf('R-0391')).filter(r => r.state === 'included').length, 0, 'Apply selected with nothing ticked changes nothing');
    await card.locator('[data-rc-ctx]').fill('A lower level was tried in September and the client returned to daily use within a week.'); await card.locator('[data-rc-check]').check();
    await p.locator('.ui-dialog--drawer [data-rc-apply]').click(); await p.waitForFunction(() => /1 suggestion included of/.test(document.querySelector('.ui-dialog--drawer [data-rc-count]').textContent));
    const x = (await recsOf('R-0391')).find(r => r.key === 'level-reason'); assert.eq(x.state, 'included'); assert.match(textOf(x), /^A lower level was tried/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('Dismiss and Bring back: a dismissed suggestion leaves the list, is kept under "dismissed", and comes back; each is an audit event with who', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    const n0 = await p.locator('.ui-dialog--drawer .rc__card').count(); await drawerCard(p, 'prior-cite').locator('[data-rc-dismiss]').click(); await p.waitForFunction(n => document.querySelectorAll('.ui-dialog--drawer .rc__card').length === n - 1, n0);
    assert.eq((await recsOf('R-0402')).find(r => r.key === 'prior-cite').state, 'dismissed'); assert.match(await p.locator('.ui-dialog--drawer .rc__gone summary').innerText(), /1 dismissed suggestion/);
    await p.locator('.ui-dialog--drawer .rc__gone summary').click(); await p.locator('.ui-dialog--drawer [data-rc-reopen]').click(); await p.waitForFunction(n => document.querySelectorAll('.ui-dialog--drawer .rc__card').length === n, n0);
    assert.eq((await recsOf('R-0402')).find(r => r.key === 'prior-cite').state, 'open');
    const ev = (await state('jperez')).events.filter(e => e.record === 'R-0402' && /^Authorization recommendation (dismissed|reopened)/.test(e.what)); assert.eq(ev.length, 2); assert.ok(ev.every(e => e.who === 'jperez' && e.at));
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('Add your own: the clinician\'s own suggestion goes in like the others (their words, included), shows "Added by you", persists, can be removed', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    await p.locator('.ui-dialog--drawer [data-rc-add]').click(); const f = p.locator('.ui-dialog--drawer [data-rc-addform]'); assert.ok(await f.isVisible());
    await f.locator('input[name="title"]').fill('Mention the safety plan'); await f.locator('textarea[name="text"]').fill('A safety plan was reviewed with the client on Oct 28.'); await f.locator('button[type="submit"]').click();
    await p.waitForSelector('.ui-dialog--drawer .rc__card[data-custom]'); const mine = p.locator('.ui-dialog--drawer .rc__card[data-custom]');
    assert.match(await mine.innerText(), /Mention the safety plan/); assert.ok(await mine.locator('.ui-chip', { hasText: 'Added by you' }).count()); assert.ok(await mine.locator('[data-rc-check]').isChecked(), 'included');
    const rec = (await recsOf('R-0402')).find(r => r.custom); assert.ok(rec && rec.state === 'included' && /safety plan was reviewed/.test(textOf(rec)) && rec.by === 'jperez'); assert.ok(insertsFor(await recsOf('R-0402')).some(x => /safety plan/.test(x.text)));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('#sec-recs'); await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card[data-custom]');
    await p.locator('.ui-dialog--drawer .rc__card[data-custom] [data-rc-remove]').click(); await p.waitForFunction(() => !document.querySelector('.ui-dialog--drawer .rc__card[data-custom]')); assert.ok(!(await recsOf('R-0402')).some(r => r.custom), 'removed');
    const ev = (await state('jperez')).events.filter(e => e.record === 'R-0402' && /^Authorization recommendation (added by a clinician|removed)/.test(e.what)); assert.eq(ev.length, 2);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('"N included · typed in Lauris: yes/no": the page says what the panel has typed (panel.filled) into the form', async () => {
    await reset('canvas'); await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'included' }, 'jperez');
    const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402'); await p.waitForSelector('#sec-recs');
    assert.match(await p.locator('#sec-recs [data-recs-line]').innerText(), /^1 included · typed in Lauris: no$/);
    const ins = insertsFor(await recsOf('R-0402'))[0]; await api('panel.filled', { client: 'DW', form: 'sra-continued', boxes: [{ label: ins.box, value: ins.text, src: [] }], sources: [] }, 'jperez');
    await p.reload(); await p.waitForSelector('#sec-recs'); assert.match(await p.locator('#sec-recs [data-recs-line]').innerText(), /^1 included · typed in Lauris: yes$/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the list
  await T.test('list: a Suggestions column (clinician only) with a chip "N · H high" that opens the drawer for that row without leaving the list; the chip updates and focus returns to it', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorizations'); await p.waitForSelector('tbody tr[data-ui-row]');
    assert.ok((await p.locator('thead th').allInnerTexts()).some(x => /^Suggestions$/.test(x.trim())), 'the column');
    for (const id of ['R-0402', 'R-0391', 'R-0395']) { const c = counts(await recsOf(id)); assert.eq((await p.locator(`#a-rc-${id}`).innerText()).trim(), `${c.live} · ${c.high} high`, id); }
    const hash0 = await p.evaluate(() => location.hash); await p.click('#a-rc-R-0402'); await p.waitForSelector('.ui-dialog--drawer .rc__card');
    assert.eq(await p.evaluate(() => location.hash), hash0, 'the list stays where it is'); assert.match(await p.locator('.ui-dialog--drawer .ui-dialog__t').innerText(), /D\.W\./); assert.eq(await p.locator('.ui-dialog--drawer .rc__card').count(), (await recsOf('R-0402')).length);
    await drawerCard(p, 'level-cite').locator('[data-rc-check]').check(); await p.locator('.ui-dialog--drawer [data-rc-apply]').click(); await p.waitForFunction(() => /1 suggestion included of/.test(document.querySelector('.ui-dialog--drawer [data-rc-count]').textContent));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); assert.eq(await focusId(p), 'a-rc-R-0402', 'focus returns to the chip');
    assert.ok(await p.locator('#a-rc-R-0402.has-inc').count(), 'the chip shows an included suggestion'); assert.eq(await p.evaluate(() => location.hash), hash0);
    assert.eq(await p.locator('tbody a[href^="#/Authorization?id=R-0402"]').count() >= 1, true, 'the row still opens the case');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('list: first sight is the search, Status and one Filters button; the Filters drawer holds the period card, eleven filters and the sort; focus returns to the button; the sort works from the drawer', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorizations'); await p.waitForSelector('tbody tr[data-ui-row]');
    assert.eq(await p.locator('.ui-fbar select').count(), 1, 'only Status on the page'); assert.eq(await p.locator('.ui-datecard').count(), 0);
    await p.click('#a-filters'); await p.waitForSelector('.a-fd'); assert.eq(await p.locator('.ui-dialog--drawer .ui-fbar select').count(), 11); assert.eq(await p.locator('.ui-dialog--drawer .ui-datecard').count(), 1);
    await p.selectOption('#a-sort-k', 'units'); await p.waitForTimeout(400); assert.match(await p.evaluate(() => location.hash), /sort=units/); assert.eq(await p.locator('th[aria-sort="ascending"]').count(), 1);
    await p.selectOption('select[data-key="payer"]', 'anthem'); await p.waitForTimeout(400); assert.match(await p.locator('.ui-dialog--drawer [data-ui-action="0"]').innerText(), /^Show \d+ authorizations?$/);
    const shown = await p.locator('tbody tr[data-ui-row]').count(); assert.ok(shown >= 1 && shown < (await state('jperez')).requests.length, 'the list follows the drawer: ' + shown);
    await p.locator('.ui-dialog--drawer [data-ui-action="0"]').click(); await p.waitForTimeout(250); assert.eq(await focusId(p), 'a-filters'); assert.match(await p.locator('#a-filters').innerText(), /Filters \(1\)/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the payer criteria checklist
  // what the checklist must say, worked out here from the stored record with the engine (not with the screen's code)
  const expected = async id => {
    const s = await state('jperez'); const r = s.requests.find(x => x.id === id); const X = evidenceIndex(s, null, r); const a = X.assessment; const lvl = requestLevel(r);
    const need = new Set(X.needs.map(n => n.key)); const ck = levelCheck(a, lvl); const du = dueState(s, a, lvl, s.today);
    const inc = !!a && (s.incidents || []).some(i => i.client === r.client && String(i.date).slice(0, 10) > String(a.date).slice(0, 10));
    const row = {}; for (let n = 1; n <= 6; n++) row['d' + n] = !a || need.has('d' + n) ? 'needs' : 'documented';
    row.level = ck.state === 'match' ? 'documented' : 'needs'; row.clock = du.state === 'none' || du.state === 'overdue' || inc ? 'needs' : 'documented';
    return row;
  };
  await T.test('payer criteria: six ASAM dimensions, the level of care and the reassessment clock, each Documented or Needs strengthening as the stored record says (three requests that differ), with the sentence or the gap', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); const seen = new Set();
    for (const id of ['R-0391', 'R-0402', 'R-0395']) {
      await openCase(p, id); await p.waitForSelector('#a-criteria'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); const want = await expected(id);
      assert.eq(await p.locator('.a-critl > li').count(), 8, id + ': 6 + level + clock');
      for (const [k, st] of Object.entries(want)) {
        const li = p.locator(`.a-critl li[data-crit="${k}"]`); assert.eq(await li.getAttribute('data-state'), st, `${id} ${k}`);
        assert.match(await li.locator('.ui-chip').first().innerText(), st === 'documented' ? /^Documented$/ : /^Needs strengthening$/, `${id} ${k} pill`); assert.ok((await li.locator('.a-crit__x').innerText()).length > 20, 'the sentence or the gap'); seen.add(st);
      }
      const n = Object.values(want).filter(x => x === 'documented').length; assert.match(await p.locator('[data-crit-sum]').innerText(), new RegExp(`^${n} of 8 documented`));
      const html = await p.locator('.ui-dialog').textContent(); assert.noMatch(html, WORDS, id + ': final wording'); assert.noMatch(html, /—/, 'no em dash in the new copy'); assert.noMatch(html, /\b(will|likely to) (be )?(approved|overturned)\b/i, 'no prediction');
      await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await focusId(p), 'a-criteria', id + ': focus returns to the opener');
    }
    assert.ok(seen.has('documented') && seen.has('needs'), 'both pills were seen');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('payer criteria: the gaps read as gaps (J.O.: the level needs a stated reason; S.B.: the reassessment is overdue; D.W.: an incident after the assessment), and "See suggestion" opens the drawer at that card', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await openCase(p, 'R-0391'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); const lv = p.locator('.a-critl li[data-crit="level"]'); assert.match(await lv.innerText(), /Ratings fit Level 1; Level 2\.1 needs a stated reason/); assert.match(await lv.innerText(), /clinician's to give/);
    await lv.getByRole('button', { name: 'See suggestion' }).click(); await p.waitForSelector('.ui-dialog--drawer .rc__card'); assert.eq(await p.locator('.ui-dialog[data-kind="modal"]').count(), 0, 'the checklist closes');
    assert.ok(await p.locator('.ui-dialog--drawer .rc__card[data-rec="level-reason"].is-focus').count(), 'the drawer lands on the card'); assert.eq(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-rc-ctx')), true, 'in its box for the clinician\'s words');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); assert.eq(await focusId(p), 'a-criteria');
    await openCase(p, 'R-0395'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); assert.match(await p.locator('.a-critl li[data-crit="clock"]').innerText(), /Reassessment was due Oct 24/); await p.keyboard.press('Escape');
    await openCase(p, 'R-0402'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); assert.match(await p.locator('.a-critl li[data-crit="clock"]').innerText(), /incident on Oct 28 came after the assessment of Oct 9/);
    await api('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included', context: 'A lower level was tried in September.' }, 'jperez');
    await openCase(p, 'R-0391'); await p.reload(); await p.waitForSelector('#a-criteria'); await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); assert.ok(await p.locator('.a-critl li[data-crit="level"] .ui-chip', { hasText: 'Suggestion included' }).count(), 'an included suggestion is marked; the pill stays computed');
    assert.eq(await p.locator('.a-critl li[data-crit="level"]').getAttribute('data-state'), 'needs');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the other roles see no suggestion content
  await T.test('supervisor and administrator: no suggestion content anywhere (one quiet line on the case page, no column on the list, no decisions in their state); direct support has no Authorizations; the actions are refused', async () => {
    await reset('canvas'); await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'included' }, 'jperez');
    for (const who of ['cdiaz', 'dowens']) {
      const { p, errs } = await mk(who); await openCase(p, 'R-0402'); await p.waitForSelector('[data-recs-quiet]');
      assert.eq((await p.locator('[data-recs-quiet]').innerText()).trim(), 'Clinical views and suggestions are for the treating clinician.', who);
      assert.eq(await p.locator('#sec-recs, .rcm, .rc, #a-rc-open, #a-criteria').count(), 0, who + ': no card, no button'); const html = await p.content();
      assert.noMatch(html, /Suggested by Psyflo|Suggested actions|Clinical trajectory|Historical outcomes|Review suggestions|Check against payer criteria|Lead with why the ratings support|dated records behind|Illustrative sample|Added from recommendations/, who + ': no suggestion content in the page');
      await p.goto(BASE + '/#/Authorizations'); await p.waitForSelector('tbody tr[data-ui-row]'); assert.eq(await p.locator('.a-recchip').count(), 0); assert.ok(!(await p.locator('thead').innerText()).includes('Suggestions'), who + ': no column');
      await p.goto(BASE + '/#/Authorization?id=R-0402&section=recs'); await p.waitForTimeout(500); assert.eq(await p.locator('.ui-dialog').count(), 0, who + ': the suggestions deep link opens nothing');
      assert.deepEq((await state(who)).rec_decisions, [], who + ' reads no decisions'); await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'dismissed' }, who), /not allowed/i, 403);
      assert.deepEq(realErrs(errs), []); await p.context().close();
    }
    const ds = await mk('khale'); await ds.p.goto(BASE + '/#/Authorizations'); await ds.p.waitForTimeout(700); assert.match(await ds.p.locator('#root').innerText(), /Not available/); assert.eq(await ds.p.locator('.a-recchip').count(), 0);
    await ds.p.goto(BASE + '/#/Authorization?id=R-0402'); await ds.p.waitForTimeout(700); assert.noMatch(await ds.p.content(), /Suggested by Psyflo|Lead with why the ratings support/); assert.deepEq((await state('khale')).rec_decisions, []); await ds.p.context().close();
  });

  // ------------------------------------------------------------------ the simpler case page: deep links open drawers
  await T.test('the case page is short: header, Next step, Suggested by Psyflo, units and deadlines, then one More row; each ?section= deep link opens its content in a side drawer, and focus returns to its button', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await openCase(p, 'R-0402');
    const h = await p.evaluate(() => document.documentElement.scrollHeight); assert.ok(h < 1600, 'one screen and a half, not a long stack of accordions: ' + h);
    assert.eq(await p.locator('details').count(), 0, 'no accordion on the page'); assert.eq(await p.locator('.ui-scard').count(), 3, 'Suggested by Psyflo, units, deadlines');
    const more = await p.locator('.a-more__i').evaluateAll(els => els.map(e => e.dataset.openSec)); assert.deepEq(more, ['level', 'documents', 'evidence', 'tasks', 'submission', 'payer', 'details', 'transition', 'history']);
    const want = { level: '[data-asam-dims]', documents: '.a-docs', evidence: '.a-ass', tasks: '.a-tasks', submission: '.ui-sdl', payer: '.ui-sdl', details: '.a-steps', transition: '.a-kd', history: '.hx__r' };
    for (const [k, sel] of Object.entries(want)) {
      await p.click(`#a-more-${k}`); await p.waitForSelector(`.ui-dialog--drawer #sec-${k}`); assert.ok(await p.locator(`.ui-dialog--drawer #sec-${k} ${sel}`).count() >= 1, `the ${k} content is in the drawer`);
      assert.ok(await p.locator('.ui-dialog--drawer').getAttribute('aria-labelledby'), 'a labelled dialog'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert.eq(await focusId(p), `a-more-${k}`, `${k}: focus returns to the button`);
    }
    // the deep links
    for (const [sec, key] of [['level', 'level'], ['documents', 'documents'], ['evidence', 'evidence'], ['tasks', 'tasks'], ['submission', 'submission'], ['payer', 'payer'], ['details', 'details'], ['transition', 'transition'], ['history', 'history'], ['timeline', 'history']]) {
      await openCase(p, 'R-0402', `&section=${sec}`); await p.waitForSelector(`.ui-dialog--drawer #sec-${key}`); assert.eq(await p.locator('.ui-dialog--drawer').count(), 1, sec);
      await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await focusId(p), `a-more-${key}`, `${sec}: focus returns to the button`);
    }
    for (const sec of ['units', 'deadlines', 'renewal']) { await openCase(p, 'R-0402', `&section=${sec}`); await p.waitForTimeout(500); assert.eq(await p.locator('.ui-dialog').count(), 0, sec + ' stays on the page'); assert.ok(await p.evaluate(s => { const r = document.getElementById('sec-' + s).getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }, sec), sec + ' is scrolled into view'); }
    await openCase(p, 'R-0402', '&section=recs'); await p.waitForSelector('.ui-dialog--drawer .rc__card'); await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await focusId(p), 'a-rc-open');
    await openCase(p, 'R-0402', '&section=nonsense'); await p.waitForTimeout(400); assert.eq(await p.locator('.ui-dialog').count(), 0, 'an unknown section opens nothing');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('the sections keep working inside the drawer: an administrator reads Evidence and Level of care in drawers (no clinical text); Record decision and Log call still open from the page', async () => {
    await reset('canvas'); const ad = await mk('dowens'); await openCase(ad.p, 'R-0408', '&section=evidence'); await ad.p.waitForSelector('.ui-dialog--drawer #sec-evidence');
    assert.ok(await ad.p.locator('.ui-dialog--drawer .ui-lockhint').count() >= 1, 'a lock icon says the clinical text is hidden'); assert.ok(await ad.p.locator('.ui-dialog--drawer .ui-misshint').count() >= 1, 'evidence missing, as an icon with a count');
    await ad.p.keyboard.press('Escape'); await openCase(ad.p, 'R-0388', '&section=level'); await ad.p.waitForSelector('.ui-dialog--drawer #sec-level'); assert.match(await ad.p.locator('#sec-level').innerText(), /Ratings and notes hidden for your role/); assert.eq(await ad.p.locator('#sec-level [data-asam-dims]').count(), 0);
    assert.deepEq(realErrs(ad.errs), []); await ad.p.context().close();
    const { p, errs } = await mk('jperez'); await openCase(p, 'R-0399'); await p.getByRole('button', { name: 'Log call' }).first().click(); await p.waitForSelector('.ui-dialog[data-kind="modal"]'); assert.ok(await p.locator('#a-call-o').count()); await p.keyboard.press('Escape');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the new copy
  await T.test('the new copy keeps to the final wording: no school, student, TDT, guardian, behaviour or classroom words, no em dash, no likelihood claim, in the card, the drawer and the criteria', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    for (const id of ['R-0402', 'R-0391', 'R-0395', 'R-0411']) {
      await openCase(p, id); await p.waitForSelector('#sec-recs'); const card = await p.locator('#sec-recs').innerText(); const more = await p.locator('.a-more').innerText();
      assert.noMatch(card + more, WORDS, id + ': card and More row'); assert.noMatch(card + more, /—/, id + ': no em dash'); assert.noMatch(card, /\b(likely|probably|predict|guarantee)/i, 'no likelihood claim');
      await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card'); const t = (await p.locator('.ui-dialog--drawer .rc__card .rc__t').allInnerTexts()).join(' | ') + (await p.locator('.ui-dialog--drawer .rc__why p').allTextContents()).join(' | ');
      assert.noMatch(t, WORDS, id + ': the cards'); assert.noMatch(t, /\b(guarantee|will be approved)\b/i); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });

  // ------------------------------------------------------------------ the phone
  await T.test('phone width 390: the list, the case page and every drawer and modal fit with no horizontal scroll; touch targets are at least 44 px; the Suggestions chip sits in the Next action cell', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez', 390, 844);
    await p.goto(BASE + '/#/Authorizations'); await p.waitForSelector('tbody tr[data-ui-row]'); assert.ok((await fits(p)).page, 'list');
    assert.ok(await p.locator('.a-recchip--m').first().isVisible(), 'the phone chip'); assert.eq(await p.locator('td.a-c-recs').first().isVisible(), false, 'the column is hidden on the phone');
    const hs = await p.evaluate(() => [...document.querySelectorAll('.a-recchip--m, #a-filters')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(hs.length >= 2 && hs.every(h => h >= 44), 'touch targets: ' + hs.join());
    await p.click('#a-filters'); await p.waitForSelector('.a-fd'); let f = await fits(p); assert.ok(f.page && f.dialogs, 'filters drawer ' + JSON.stringify(f)); await p.keyboard.press('Escape');
    await p.locator('.a-recchip--m').first().click(); await p.waitForSelector('.ui-dialog--drawer .rc__card'); f = await fits(p); assert.ok(f.page && f.dialogs, 'suggestions drawer from the list ' + JSON.stringify(f));
    const tt = await p.evaluate(() => [...document.querySelectorAll('.ui-dialog--drawer .rc .ui-btn, .ui-dialog--drawer .a-rcfoot .ui-btn')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(tt.length >= 3 && tt.every(h => h >= 44), 'drawer buttons: ' + tt.join()); await p.keyboard.press('Escape');
    await openCase(p, 'R-0402'); assert.ok((await fits(p)).page, 'case page');
    const hb = await p.evaluate(() => [...document.querySelectorAll('.a-more__i, #a-criteria, #a-rc-open')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))); assert.ok(hb.length >= 10 && hb.every(h => h >= 44), 'case page targets: ' + hb.join());
    await p.click('#a-rc-open'); await p.waitForSelector('.ui-dialog--drawer .rc__card'); f = await fits(p); assert.ok(f.page && f.dialogs, 'suggestions drawer ' + JSON.stringify(f)); await p.keyboard.press('Escape');
    await p.click('#a-criteria'); await p.waitForSelector('.a-critl'); f = await fits(p); assert.ok(f.page && f.dialogs, 'criteria modal ' + JSON.stringify(f)); await p.keyboard.press('Escape');
    for (const k of ['level', 'evidence', 'history', 'payer', 'transition', 'documents', 'details']) { await p.click(`#a-more-${k}`); await p.waitForSelector(`.ui-dialog--drawer #sec-${k}`); f = await fits(p); assert.ok(f.page && f.dialogs, `${k} drawer ${JSON.stringify(f)}`); await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
} finally { await b.close(); }
await T.done();
