// R6 · Owner C: "Suggested by Psyflo" in the extension panel (the authorization path, Scan & Enhance, the Denial packet) and the Lauris connection.
// Standalone: `BASE=http://localhost:5300 node test/recs-panel.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves, in a real browser beside the mock Lauris:
//   · the connection is visible and true: the Lauris top-bar chip ("Psyflo extension · connected") and the panel header ("Lauris connected · <page>") are green
//     while the bridge answers and flip to "not connected" when it stops; a page opened from the platform lands on the matching panel view
//   · the authorization path: Include, Dismiss, add your words, add your own, Apply selected; the included text is typed into the form boxes (yellow), panel.filled
//     records it, it is merged into "Approve and fill", and no Lauris button is pressed
//   · Scan & Enhance: the findings are cards; the clinician's own words replace the flagged sentence; the x-enhance scan record follows
//   · the Denial packet and the Payer Reply form: suggestions, packet sections ("Added from recommendations" highlighted), Type into Lauris; typed, never saved, never sent
//   · one state: what is decided in the platform shows in the panel and what is decided in the panel shows in the platform state
//   · the other roles get no recommendation content; no sideways scroll at 400 px; no page errors
import { suite, assert, api, tryApi, state, reset, playwright, errors, lget, LAURIS, SHOTS } from './lib/index.mjs';
import { authRecsFor, denialRecsFor, textOf, RECS_SECTION } from '../web/js/shared/recs.js';
import { byRequest } from '../web/js/shared/sel/disputes.js';

const T = suite('recs-panel');
const { chromium } = playwright();
const snap = async () => (await fetch(LAURIS + '/__test/lauris')).json();
const find = (list, key) => list.find(x => x.key === key);
const req = (s, id) => s.requests.find(r => r.id === id);
const RECS = (s, id) => authRecsFor(s, req(s, id));
const until = async (fn, ms = 15000, step = 200) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) { } await new Promise(r => setTimeout(r, step)); } return false; };

await reset('canvas');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
const errs = errors(p);
const frame = () => p.frames().find(f => f.url().includes('/panel/'));
const panel = () => p.frameLocator('#psyflo-frame');
const card = key => panel().locator(`.prc[data-rec="${key}"]`);
const ptext = async () => (await frame().locator('#panel').innerText()).replace(/\s+/g, ' ');
// open a Lauris page signed in as <as>, the way the platform's "Open in Lauris" link does (login?as=…&next=…); wait for the panel to read the page
async function open(as, path, ready = '#panel .body, #panel .idcard') {
  await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`);
  await p.waitForSelector('#psyflo-frame', { timeout: 15000 });
  assert.ok(await until(async () => { const f = frame(); return f && await f.evaluate(sel => !!document.querySelector(sel), ready); }, 15000), 'the panel is ready on ' + path);
  await p.waitForTimeout(500);
}
const formValues = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => { const e = document.getElementById(l.htmlFor); return [l.textContent.trim(), { v: e.tagName === 'SELECT' ? (e.options[e.selectedIndex] || {}).text || '' : e.value, typed: e.dataset.psyflo === 'typed', green: e.classList.contains('g'), bg: getComputedStyle(e).backgroundColor }]; })));
const overflow = () => frame().evaluate(() => { const w = document.documentElement.clientWidth; return { sx: document.documentElement.scrollWidth - w, wide: [...document.querySelectorAll('#panel *')].filter(e => !e.closest('.sr,.ui-sr') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > w + 1).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().right)).slice(0, 5) }; });

try {
  // ------------------------------------------------------------------------------------------------ the connection
  await T.test('the connection is visible: the Lauris chip says "Psyflo extension · connected" and the panel header says "Lauris connected · <page>"', async () => {
    const html = (await lget('/consumers', 'jperez')).text;   // what Lauris prints before any bridge has answered: a claim it cannot back up is never made
    assert.match(html, /id="psyflo-toggle" type="button" data-connected="0"/); assert.match(html, /<span id="psyflo-chip-t">Psyflo extension · not connected<\/span>/, 'server-rendered: not connected until the bridge has answered a read');
    await open('jperez', '/consumers');
    assert.ok(await until(async () => (await p.locator('#psyflo-toggle').innerText()).trim() === 'Psyflo extension · connected', 8000), 'the chip turns "Psyflo extension · connected": ' + await p.locator('#psyflo-toggle').innerText());
    assert.eq(await p.locator('#psyflo-toggle').getAttribute('data-connected'), '1');
    assert.match(await p.locator('#psyflo-toggle i').evaluate(e => getComputedStyle(e).backgroundColor), /rgb\(61, 190, 139\)/, 'a green dot, not only words');
    const hd = frame().locator('.ph .lk'); assert.eq(await hd.getAttribute('data-link'), 'ok'); assert.match((await hd.innerText()).trim(), /^Lauris connected · Consumers$/);
    await p.goto(`${LAURIS}/consumers/4102/session/sra-continued`); await p.waitForTimeout(2200);
    assert.match((await frame().locator('.ph .lk').innerText()).trim(), /^Lauris connected · Continued/, 'the line names the open page');
    await p.goto(`${LAURIS}/approvals`); await p.waitForTimeout(2200); assert.match((await frame().locator('.ph .lk').innerText()).trim(), /^Lauris connected · Forms to Approve$/);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-connected.png' }).catch(() => { });
  });
  await T.test('a bridge that stops answering flips both lines to "not connected" (and back when it answers again); nothing is typed while it is silent', async () => {
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    // the bridge goes silent (data-psyflo-silent: it answers and pushes nothing): what a closed or crashed extension looks like to the panel
    await p.evaluate(() => document.documentElement.setAttribute('data-psyflo-silent', '1'));
    assert.ok(await until(async () => (await frame().locator('.ph .lk').getAttribute('data-link')) === 'down', 25000), 'the panel header flips to not connected');
    assert.match((await frame().locator('.ph .lk').innerText()).trim(), /^Lauris not connected/);
    assert.ok(await until(async () => (await p.locator('#psyflo-toggle').innerText()).trim() === 'Psyflo extension · not connected', 25000), 'the Lauris chip flips to not connected');
    assert.eq(await p.locator('#psyflo-toggle').getAttribute('data-connected'), '0');
    assert.match(await ptext(), /The Lauris page is not answering/);
    // nothing is typed while the bridge is silent (a decision is still recorded: it is a Psyflo action, not a page action)
    const fills0 = ((await state('jperez')).fills || []).length;
    await card('level-cite').getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => find(RECS(await state('jperez'), 'R-0402'), 'level-cite').state === 'included'), 'the decision is recorded');
    await panel().getByRole('button', { name: 'Apply selected' }).click();
    await panel().getByText(/The Lauris page is not answering\. Nothing was typed/).first().waitFor({ timeout: 10000 });
    assert.eq(((await state('jperez')).fills || []).length, fills0, 'nothing was typed, nothing was recorded as typed');
    await p.evaluate(() => document.documentElement.removeAttribute('data-psyflo-silent'));
    assert.ok(await until(async () => (await frame().locator('.ph .lk').getAttribute('data-link')) === 'ok', 20000), 'the panel header is back');
    assert.ok(await until(async () => (await p.locator('#psyflo-toggle').innerText()).trim() === 'Psyflo extension · connected', 20000), 'the chip is back');
    assert.ok(await until(async () => !/Nothing is read or typed until it does/.test(await ptext())), 'the warning is gone');
  });
  await T.test('a page opened from the platform lands on the matching panel view: the authorization form on the suggestions, the payer reply form on the denial packet', async () => {
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    assert.match(await ptext(), /Continued stay · D\.W\.[\s\S]*Suggested by Psyflo/);
    await open('jperez', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs');
    assert.match(await ptext(), /Denial packet · D\.W\.[\s\S]*Sentara[\s\S]*Partial approval[\s\S]*Suggested by Psyflo[\s\S]*Packet[\s\S]*Type into Lauris/);
    await open('jperez', '/consumers/4102', '#panel .body');
    const t = await ptext(); assert.match(t, /Prepare authorization/); assert.match(t, /Denial packet\s*Partial approval · R-0402/, 'home offers the denial packet when the open consumer has an open payer reply case');
    await open('jperez', '/consumers/3310', '#panel .body'); assert.noMatch(await ptext(), /Denial packet/, 'no open payer reply for M.R.: nothing offered');
  });

  // ------------------------------------------------------------------------------------------------ the authorization path
  await T.test('authorization path: the cards (title, impact, "+n pts · sample", why, Include, Dismiss, counter, Add your own, Apply selected) from the same engine as the platform', async () => {
    await reset('canvas');
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    const s = await state('jperez'); const list = RECS(s, 'R-0402');
    const t = await ptext();
    assert.match(t, new RegExp(`0 of ${list.length} included`)); assert.match(t, /Simulated/); assert.match(t, /Numbers marked sample are illustrative/);
    assert.match(t, /Lead with why the ratings support Level 2\.1[\s\S]*High impact[\s\S]*\+\d+ pts · sample/);
    assert.eq(await panel().locator('.prl > .prc').count(), 3, 'a short list first: three cards, the rest one button away'); await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click();
    assert.ok(await until(async () => await panel().locator('.prl > .prc').count() === list.length), 'every card of the engine is there');
    for (const x of list) assert.ok(await card(x.key).count() === 1, 'card ' + x.key);
    // the sample is labelled where the numbers are explained; the sentence that would go in is the stored one
    await card('level-cite').locator('summary').click();
    const why = (await card('level-cite').innerText()).replace(/\s+/g, ' ');
    assert.match(why, /Applied \d+ times in the sample · \d+% success\. Illustrative sample/); assert.ok(why.includes(find(list, 'level-cite').insert.text), 'What goes in: the stored-record sentence');
    assert.match(why, /Records behind it/i, 'its evidence chips');
    assert.ok(await panel().getByRole('button', { name: 'Apply selected' }).isDisabled(), 'nothing is included yet: nothing to apply');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-auth-cards.png' }).catch(() => { });
  });
  let typedWords, ownText;
  await T.test('Include, Dismiss, add your words and Add your own are decisions on the server (the platform sees them at once); a card that needs your words cannot be included without them', async () => {
    const before = (await state('jperez')).events.length;
    await card('level-cite').getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => find(RECS(await state('jperez'), 'R-0402'), 'level-cite').state === 'included'), 'included on the server');
    await card('d6-cite').getByRole('button', { name: 'Dismiss' }).click();
    assert.ok(await until(async () => find(RECS(await state('jperez'), 'R-0402'), 'd6-cite').state === 'dismissed'), 'dismissed on the server');
    assert.ok(await until(async () => /1 dismissed suggestion/.test(await ptext())), 'a dismissed card moves to its own list'); assert.eq(await card('d6-cite').count(), 0);
    // needs your words: Include stays disabled until there are some
    const inc = card('risk').getByRole('button', { name: 'Include' }); assert.ok(await inc.isDisabled(), 'no words, no Include');
    typedWords = 'The client returned to daily use within a week of the last step-down, and the family asked for more support at home.';
    await card('risk').getByRole('textbox').fill(typedWords); assert.ok(await inc.isEnabled(), 'words typed: Include is possible');
    await inc.click();
    assert.ok(await until(async () => { const x = find(RECS(await state('jperez'), 'R-0402'), 'risk'); return x.state === 'included' && x.context === typedWords && textOf(x) === typedWords; }), 'the clinician\'s own words are the text');
    // Add your own: a title, the clinician's own sentence, the box it goes in
    ownText = 'A safety plan was reviewed with the client on Oct 28 and a copy went home.';
    await panel().getByRole('button', { name: 'Add your own' }).click();
    await panel().getByLabel('Title').fill('Mention the safety plan'); await panel().getByLabel('What should go in').fill(ownText); await panel().getByLabel('Which box').selectOption('Barriers');
    await panel().getByRole('button', { name: 'Save' }).click();
    const mine = await until(async () => RECS(await state('jperez'), 'R-0402').find(x => x.custom && x.title === 'Mention the safety plan'));
    assert.ok(mine && mine.state === 'included' && mine.insert.box === 'Barriers' && mine.insert.text === ownText && mine.by === 'jperez', 'the clinician\'s own recommendation is stored, included, with their name');
    assert.ok(await until(async () => await card(mine.key).count() === 1), 'the card is in the list with "Added by you"'); assert.match((await card(mine.key).innerText()), /Added by you/);
    const s = await state('jperez'); const ev = s.events.slice(before).map(e => e.what).join(' | ');
    assert.match(ev, /Authorization recommendation included/); assert.match(ev, /Authorization recommendation dismissed/); assert.match(ev, /Authorization recommendation added by a clinician/); assert.noMatch(ev, /returned to daily use|safety plan was reviewed/, 'the audit text never holds the clinician\'s words');
    assert.match(await ptext(), /3 of 6 included|3 of 7 included|4 of 7 included/, 'the counter follows');
  });
  await T.test('Apply selected types the included text into the open form (yellow, after what is there); panel.filled records the boxes and the cards; no Lauris button is pressed', async () => {
    const before = await snap(); const s0 = await state('jperez'); const fills0 = (s0.fills || []).length;
    await panel().getByRole('button', { name: 'Apply selected' }).click();
    await panel().getByText(/boxes? typed into the form · yellow/).first().waitFor({ timeout: 20000 });
    const s = await state('jperez'); const list = RECS(s, 'R-0402'); const v = await formValues();
    const lc = find(list, 'level-cite'); assert.ok(v['Level of care'].v.includes(lc.insert.text) && v['Level of care'].typed, 'Level of care holds the stored sentence, marked typed');
    assert.ok(v['Continued need / risk'].v.includes(typedWords) && v['Continued need / risk'].typed, 'the clinician\'s own words are in their box');
    assert.ok(v['Barriers'].v.includes(ownText) && v['Barriers'].typed, 'the clinician\'s own recommendation is in its box');
    assert.eq(v['Dimension 6 — recovery/living environment'].v, '', 'a dismissed card types nothing');
    for (const k of ['Level of care', 'Continued need / risk', 'Barriers']) assert.match(v[k].bg, /rgb\(255, 248, 230\)/, k + ' is yellow');
    assert.ok(v['Member'].green && !v['Member'].typed, 'what Lauris already had stays green and untouched');
    // recorded: the boxes and the recommendation ids behind them
    const fill = s.fills.slice(fills0).find(f => f.form === 'sra-continued'); assert.ok(fill, 'panel.filled recorded the typing');
    assert.deepEq(fill.boxes.map(x => x.label).sort(), ['Barriers', 'Continued need / risk', 'Level of care']);
    const src = (fill.sources || []).find(x => x.kind === 'recs'); assert.ok(src && src.recs.includes('auth:R-0402:level-cite') && src.recs.includes('auth:R-0402:risk'), 'the fill names the recommendations it typed');
    assert.ok(s.events.some(e => /Psyflo typed 3 boxes into the open Continued Stay request/.test(e.what)), 'an audit event');
    // Psyflo pressed nothing: no session was saved or processed, no flash on the page
    const after = await snap(); assert.eq(after.sessions.length, before.sessions.length, 'no session was saved or processed in Lauris');
    assert.eq(await p.locator('#lauris-flash').count(), 0, 'no Process Form, no Save'); assert.ok(!s.events.some(e => /Process Form pressed|saved in Lauris/.test(e.what) && e.record === 'DW'), 'nothing was observed as pressed');
    // applying twice adds nothing
    await panel().getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(800);
    const v2 = await formValues(); assert.eq(v2['Barriers'].v, v['Barriers'].v, 'the same text is never typed twice');
    assert.ok((await ptext()).includes('Typed · yellow'), 'the cards say what was typed');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-auth-applied.png' }).catch(() => { });
  });
  await T.test('"Approve and fill" of the draft merges what was included into the boxes it types (the draft and its review keep working)', async () => {
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    await panel().getByRole('button', { name: /Review \d+ statements/ }).click(); await panel().locator('.ui-dr__item.px-open').first().waitFor();
    const approve = panel().getByRole('button', { name: 'Approve and fill' });
    const ready = async () => (await approve.count()) > 0 && await approve.isEnabled({ timeout: 2000 }).catch(() => false);
    for (let i = 0; i < 14 && !(await ready()); i++) {
      const bulk = panel().getByRole('button', { name: /Accept the \d+ with sources/ });
      if (await bulk.count()) { await bulk.click({ timeout: 8000 }).catch(() => { }); await until(async () => (await bulk.count()) === 0 || await ready(), 20000); }
      else if (await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Reject' }).count()) { await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Reject' }).first().click({ timeout: 8000 }).catch(() => { }); await p.waitForTimeout(700); }
      else await p.waitForTimeout(700);
    }
    assert.ok(await ready(), 'every box has a decision: ' + (await ptext()).slice(0, 300));
    await panel().getByRole('button', { name: 'Approve and fill' }).click();
    await panel().getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
    const v = await formValues();
    assert.ok(v['Continued need / risk'].v.includes(typedWords), 'the clinician\'s included words are in the box the draft typed: ' + v['Continued need / risk'].v.slice(0, 120));
    assert.ok(v['Barriers'].v.includes(ownText), 'so is the clinician\'s own recommendation');
    assert.ok(v['Level of care'].v.includes(find(RECS(await state('jperez'), 'R-0402'), 'level-cite').insert.text), 'the level sentence is there, once'); assert.eq(v['Level of care'].v.split(find(RECS(await state('jperez'), 'R-0402'), 'level-cite').insert.text).length - 1, 1, 'never twice');
    const s = await state('jperez'); const last = s.fills.at(-1); assert.ok((last.sources || []).some(x => x.kind === 'recs' && x.recs.includes('auth:R-0402:risk')), 'the fill names the included recommendations');
    assert.eq((await snap()).sessions.filter(x => x.no === 4102 && x.form === 'sra-continued').length, 0, 'still nothing saved or processed in Lauris');
  });
  await T.test('one state: included in the platform shows in the panel, decided in the panel shows in the platform state', async () => {
    await reset('canvas');
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'd5-cite', state: 'included' }, 'jperez');   // the platform drawer does exactly this
    assert.ok(await until(async () => (await card('d5-cite').getAttribute('data-state')) === 'included', 20000), 'the panel shows it included without a reload');
    assert.match(await card('d5-cite').innerText(), /Included/);
    await card('d3-cite').count() || await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click();
    await card('d3-cite').getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => find(RECS(await state('jperez'), 'R-0402'), 'd3-cite').state === 'included'), 'decided in the panel, in the server state');
    await card('d5-cite').getByRole('button', { name: 'Take out' }).click();
    assert.ok(await until(async () => find(RECS(await state('jperez'), 'R-0402'), 'd5-cite').state === 'open'), 'taken out in the panel: open again on the server');
    await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'd3-cite', state: 'dismissed' }, 'jperez');
    assert.ok(await until(async () => await card('d3-cite').count() === 0 && /dismissed suggestion/.test(await ptext()), 20000), 'dismissed in the platform: gone from the list in the panel');
  });

  // ------------------------------------------------------------------------------------------------ Scan & Enhance
  await T.test('Scan & Enhance: the findings are cards; your own words replace the flagged sentence; Apply selected types them (yellow); x-enhance keeps the scan record', async () => {
    await reset('canvas');
    await open('jperez', '/consumers/3315/session/dpn', '#panel .body');
    await p.fill('#lauris-form textarea >> nth=1', 'Observed J.T. in math. He worked well.'); await p.waitForTimeout(800);
    await panel().getByRole('button', { name: 'Home' }).click(); await panel().getByText('Scan & Enhance').first().click();
    await panel().getByRole('button', { name: 'Scan the draft' }).click();
    await panel().locator('.prs').waitFor();
    const t = await ptext(); assert.match(t, /Suggested by Psyflo/); assert.match(t, /"observed" is in the note/); assert.match(t, /What did you do with J\.T\.\?/); assert.noMatch(t, /Finding 1 of/, 'cards, not one finding at a time');
    const w = card('wording-narrative'); assert.eq(await w.count(), 1);
    assert.ok(await w.getByRole('button', { name: 'Include' }).isDisabled(), 'the finding\'s question is the card\'s input: no words, no Include');
    const words = 'I led a refusal-skills role play with J.T. in math.';
    await w.getByRole('textbox').fill(words); await w.getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => { const s = await state('jperez'); return s.rec_decisions.some(x => x.scope === 'note' && x.ref === 'JT:dpn' && x.key === 'wording-narrative' && x.state === 'included' && x.context === words); }), 'the decision is stored per client and form');
    // add your own: it types into the box the clinician picks
    await panel().getByRole('button', { name: 'Add your own' }).click();
    await panel().getByLabel('Title').fill('Say how the mood check went'); await panel().getByLabel('What should go in').fill('J.T. said he felt ready for the next group.'); await panel().getByLabel('Which box').selectOption('Mood check-in');
    await panel().getByRole('button', { name: 'Save' }).click();
    assert.ok(await until(async () => (await state('jperez')).rec_decisions.some(x => x.scope === 'note' && x.custom && x.box === 'Mood check-in')));
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-enhance-cards.png' }).catch(() => { });
    await panel().getByRole('button', { name: 'Apply selected' }).click();
    await panel().getByText(/boxes? typed into the form · yellow/).first().waitFor({ timeout: 20000 });
    const v = await formValues();
    assert.eq(v['Narrative'].v, `${words} He worked well.`, 'the flagged sentence is replaced by the clinician\'s words, the rest is kept'); assert.ok(v['Narrative'].typed);
    assert.eq(v['Mood check-in'].v, 'J.T. said he felt ready for the next group.', 'the clinician\'s own recommendation went into the box they chose'); assert.match(v['Mood check-in'].bg, /rgb\(255, 248, 230\)/);
    const s = await state('jperez'); const fill = s.fills.at(-1); assert.eq(fill.form, 'dpn'); assert.ok(fill.boxes.some(x => x.label === 'Narrative')); assert.ok((fill.sources || []).some(x => x.kind === 'recs' && x.recs.some(id => id.startsWith('note:JT:dpn:'))));
    const scan = s.doc_versions.filter(d => d.mode === 'current' && d.client === 'JT' && d.form === 'dpn').at(-1); const f = scan.findings.find(x => x.category === 'wording');
    assert.ok(f && f.state === 'accepted' && f.answer === words, 'the x-enhance scan record follows the decision: ' + JSON.stringify(f && [f.state, f.answer]));
    assert.eq((await snap()).sessions.filter(x => x.no === 3315 && x.date === s.today && x.status === 'processed').length, (await snap()).sessions.filter(x => x.no === 3315 && x.date === s.today && x.status === 'processed').length);
    await panel().getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700);
    assert.eq((await formValues())['Narrative'].v, `${words} He worked well.`, 'applying again changes nothing');
  });
  await T.test('a designated supervisor (Scan & Enhance, no recommendations) keeps the existing review and sees no recommendation content', async () => {
    await reset('canvas');
    const d = await api('user.designate', { id: 'cdiaz', cap: 'scanEnhance', grant: true, reason: 'covers the daily note review' }, 'dowens'); await api('user.designateApprove', { id: d.id, decision: 'approve' }, 'jperez');
    await open('cdiaz', '/consumers/3315/session/dpn', '#panel .body');
    await p.fill('#lauris-form textarea >> nth=1', 'Observed J.T. in math. He worked well.'); await p.waitForTimeout(800);
    await panel().getByRole('button', { name: 'Home' }).click(); await panel().getByText('Scan & Enhance').first().click();
    await panel().getByRole('button', { name: 'Scan the draft' }).click(); await p.waitForTimeout(2500);   // (the supervisor's state holds no draft records, so the scan stays the existing tile: not changed by R6)
    const t = await ptext(); assert.match(t, /Review draft/); assert.noMatch(t, /Suggested by Psyflo|Apply selected|pts · sample|Add your own|Include/, 'no recommendation content for a supervisor');
    await assert.refused(tryApi('recs.decide', { scope: 'note', ref: 'JT:dpn', key: 'wording-narrative', state: 'included', context: 'x words' }, 'cdiaz'), /not allowed/i, 403);
  });

  // ------------------------------------------------------------------------------------------------ the Denial packet and the Payer Reply form
  await T.test('Denial packet: the suggestions, the packet with "Added from recommendations" highlighted, and the Payer Reply form it types into', async () => {
    await reset('canvas');
    await open('jperez', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs');
    assert.match(await ptext(), /Sentara Health Plans · Partial approval[\s\S]*110 of 150 units offered/);
    const s0 = await state('jperez'); const r = req(s0, 'R-0402'); const d = byRequest(s0, 'R-0402'); const list = denialRecsFor(s0, d, r); const units = find(list, 'units'); assert.ok(units && units.insert.text);
    assert.match(await ptext(), new RegExp(`0 of ${list.length} included`));
    // before a draft exists the Type button is disabled, and says why
    assert.ok(await panel().getByRole('button', { name: 'Type into Lauris' }).isDisabled(), 'draft the packet first'); assert.match(await ptext(), /Draft the packet first/);
    await panel().getByRole('button', { name: /Draft the peer-to-peer call/ }).click();
    assert.ok(await until(async () => { const x = byRequest(await state('jperez'), 'R-0402'); return x.docs.p2p && x.docs.p2p.sections.length > 3; }), 'dispute.genDoc built the draft from stored records');
    // include a suggestion: it lands in the packet under "Added from recommendations", highlighted
    await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click();
    await card('units').getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => { const x = byRequest(await state('jperez'), 'R-0402').docs.p2p; return x.sections.some(y => y.key === RECS_SECTION && y.text.includes(units.insert.text)); }), 'the server synced the included suggestion into the unsent draft');
    await panel().locator('summary', { hasText: /^Sections · / }).click();
    const hl = panel().locator('.prp-hl'); assert.ok(await hl.count() >= 1, 'the section is highlighted'); assert.match(await hl.first().innerText(), /Added from recommendations[\s\S]*From your suggestions[\s\S]*units/i);
    assert.ok(/1 suggestion included/.test(await ptext()));
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-denial.png' }).catch(() => { });
    // Apply selected adds to the packet (already there): it says so and types nothing
    await panel().getByRole('button', { name: 'Apply selected' }).click(); await panel().getByText(/in the packet, under Added from recommendations/).first().waitFor();
    assert.eq((await formValues())['Payer decision'].v, '', 'applying suggestions does not type into Lauris');
  });
  await T.test('Type into Lauris puts the packet in the Payer Reply boxes (yellow); Lauris keeps its own boxes green; nothing is saved, processed or sent', async () => {
    const before = await snap(); const s0 = await state('jperez'); const fills0 = (s0.fills || []).length; const ev0 = s0.events.length;
    await panel().getByRole('button', { name: 'Type into Lauris' }).click();
    await panel().getByText(/boxes? typed into the form · yellow/).first().waitFor({ timeout: 25000 });
    const v = await formValues(); const s = await state('jperez'); const x = byRequest(s, 'R-0402'); const units = find(denialRecsFor(s, x, req(s, 'R-0402')), 'units');
    assert.match(v['Payer decision'].v, /Sentara.*110 of 150 units offered.*notice Oct 27/); assert.eq(v['Reply type'].v, 'Peer-to-peer call'); assert.ok(v['Reply type'].typed);
    assert.ok(v['Added from recommendations'].v.includes(units.insert.text), 'what was included is in its own box'); assert.match(v['Level of care'].v, /Level 2\.1/);
    assert.match(v['Dimension 5 — relapse, continued use, or continued problem potential'].v, /D5 .* was rated 3/); assert.ok(v['Dimension 5 — relapse, continued use, or continued problem potential'].typed);
    assert.ok(v['What we ask'].v.length > 10 && v['What we ask'].typed, 'the ask comes from the packet');
    assert.ok(v['Member'].green && !v['Member'].typed && v['Current authorization'].green, 'Lauris\'s own boxes are untouched');
    for (const k of ['Payer decision', 'Level of care', 'Added from recommendations']) assert.match(v[k].bg, /rgb\(255, 248, 230\)/, k + ' is yellow');
    const fill = s.fills.slice(fills0).find(f => f.form === 'payer-reply'); assert.ok(fill && fill.boxes.some(b => b.label === 'Payer decision') && fill.boxes.some(b => b.label === 'Reply type'), 'panel.filled recorded the typing');
    assert.ok(fill.sources.some(y => y.kind === 'dispute' && y.source === 'DI-0402' && y.recs.includes('denial:R-0402:units')), 'the fill names the case and the suggestions');
    const after = await snap(); assert.eq(after.sessions.length, before.sessions.length, 'nothing saved or processed in Lauris'); assert.eq(await p.locator('#lauris-flash').count(), 0);
    const bad = s.events.slice(ev0).filter(e => /\bsent\b|upload/i.test(e.what) && e.record === 'R-0402');
    assert.ok(!x.docs.p2p.sent, 'the draft is not sent'); assert.deepEq(bad.map(e => e.what), [], 'Psyflo sent nothing');
    assert.match(await ptext(), /Process Form\. Psyflo never presses it and never sends the reply/);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/recs-panel-denial-typed.png' }).catch(() => { });
  });
  await T.test('the Payer Reply form is a note-type form in Lauris: listed in Add Session, no signature path; Process Form files it and Psyflo records only that it was pressed', async () => {
    const pick = await (await fetch(`${LAURIS}/consumers/4102/session`, { headers: { cookie: 'lauris_user=jperez' } })).text(); assert.match(pick, /Payer Reply · appeal or information request/);
    await p.click('#process-form'); await p.waitForTimeout(1500);
    const sn = await snap(); const sess = sn.sessions.filter(x => x.no === 4102 && x.form === 'payer-reply'); assert.eq(sess.length, 1); assert.eq(sess[0].status, 'processed'); assert.ok(!sess[0].approve, 'no signature path');
    assert.eq(sess[0].values['Reply type'], 'Peer-to-peer call', 'what the person processed is what was typed and checked');
    const s = await state('jperez'); assert.ok(s.events.some(e => /Process Form pressed in Lauris · Payer Reply/.test(e.what)), 'the page bridge observed a person press it');
    assert.ok(!(await state('jperez')).disputes.find(d => d.id === 'DI-0402').docs.p2p.sent, 'filing it in Lauris is not sending it');
  });

  // ------------------------------------------------------------------------------------------------ roles and layout
  await T.test('the other roles get no recommendation content in the panel (supervisor, direct support, administrator), and the server refuses their decisions', async () => {
    await reset('canvas');
    for (const [as, path] of [['cdiaz', '/consumers/4102/session/sra-continued'], ['cdiaz', '/consumers/4102/session/payer-reply?request=R-0402'], ['khale', '/consumers/3310/session/dpn'], ['dowens', '/consumers/4102/session/sra-continued'], ['dowens', '/consumers/4102/session/payer-reply']]) {
      await open(as, path, '#panel .body, #panel .idcard'); const t = await ptext();
      assert.noMatch(t, /Suggested by Psyflo|Apply selected|pts · sample|Lead with why the ratings|Add your own|Type into Lauris|Denial packet · /, `${as} on ${path}: no recommendation content (${t.slice(0, 140)})`);
    }
    await open('cdiaz', '/consumers/4102', '#panel .body'); assert.noMatch(await ptext(), /Denial packet/, 'the supervisor is not offered the denial packet');
    for (const who of ['cdiaz', 'khale', 'dowens']) { assert.deepEq((await state(who)).rec_decisions, [], who + ' reads no decisions'); await assert.refused(tryApi('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'units', state: 'included' }, who), /not allowed/i, 403); }
  });
  await T.test('the panel is 400 px wide: no sideways scroll on the suggestions, the scan cards and the denial packet; text 12 px or more; controls 40 px or more', async () => {
    await reset('canvas');
    await api('recs.add', { scope: 'auth', ref: 'R-0402', title: 'A recommendation with a long title that must wrap inside the card and never push the panel sideways', text: 'A long sentence '.repeat(24), box: 'Barriers' }, 'jperez');
    for (const [name, as, path, pre] of [['auth', 'jperez', '/consumers/4102/session/sra-continued', null], ['initial', 'jperez', '/consumers/4492/session/sra-initial', null], ['denial', 'jperez', '/consumers/4102/session/payer-reply?request=R-0402', 'denial'], ['info', 'jperez', '/consumers/4480/session/payer-reply?request=R-0408', 'denial']]) {
      await open(as, path, '#panel .prs, #panel .body');
      if (pre === 'denial') { const draft = panel().getByRole('button', { name: /^Draft the / }); if (await draft.count()) { await draft.click(); await p.waitForTimeout(900); } await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click().catch(() => { }); }
      else await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click().catch(() => { });
      await panel().locator('.prc-w summary').first().click().catch(() => { }); await p.waitForTimeout(400);
      const o = await overflow(); assert.ok(o.sx <= 0 && o.wide.length === 0, `${name}: no sideways scroll (${o.sx}; ${o.wide.join(', ')})`);
      const m = await frame().evaluate(() => { const px = document.getElementById('panel'); const small = []; for (const el of px.querySelectorAll('*')) { if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12 && el.checkVisibility && el.checkVisibility()) small.push((el.className || el.tagName) + ':' + fs); }
        const low = [...px.querySelectorAll('.btn:not(.sm),.btn.sm,.tog,select,summary')].filter(e => e.checkVisibility && e.checkVisibility() && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 39.5).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)); return { small: small.slice(0, 5), low: low.slice(0, 5), live: [...document.querySelectorAll('[aria-live]')].map(e => e.id || e.tagName), h1: px.querySelectorAll('h1').length }; });
      assert.deepEq(m.small, [], `${name}: text below 12 px`); assert.deepEq(m.low, [], `${name}: controls below 40 px`); assert.deepEq(m.live, ['px-status'], `${name}: aria-live only on the status region`); assert.eq(m.h1, 1, `${name}: one h1`);
    }
  });
  await T.test('no page errors in Lauris or the panel', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
