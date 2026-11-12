// Settings > Workflows (round 5, fork MAP): the workflow map builder in the browser. Settings opens on a canvas (no seven-tab bar), a More settings menu
// holds the six older pages, the palette (When / If / Then / Always, the rule library, the locked steps), drag and drop with pointer events (move a block,
// link from an exit dot, drop a block or a rule), the keyboard alternative, the inspector (settings, rules, logic, a rule-bound number is the rule),
// Save through workflow.save, the Outline view (also the 390 px layout), the Test run, the two-person guardrail, New / Duplicate / Delete, and roles.
// A workflow only configures what the bell shows a person: nothing it does sends, calls, files or signs, and the test run changes nothing.
import { suite, assert, api, tryApi, state, reset, session, playwright, errors, login, BASE, SHOTS } from './lib/index.mjs';
import { rule } from '../web/js/shared/rules.js';

const T = suite('workflows-ui');
await reset('live');
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root h1, #root .denied') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(350);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const wfs = async who => (await state(who || 'dowens')).workflows;
const wfOf = async (id, who) => (await wfs(who)).find(w => w.id === id);
const nodeBox = (p, id) => p.locator(`.wm-node[data-node="${id}"]`).boundingBox();
const pos = (p, id) => p.evaluate(i => { const n = document.querySelector(`.wm-node[data-node="${i}"]`); return [parseInt(n.style.left), parseInt(n.style.top)]; }, id);
async function dragFrom(p, box, dx, dy, o = {}) {
  const x = box.x + (o.ox ?? box.width / 2), y = box.y + (o.oy ?? box.height / 2);
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 3, y + dy / 3, { steps: 3 }); await p.mouse.move(x + dx, y + dy, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250);
}
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);
const toast = p => p.evaluate(() => [...document.querySelectorAll('#toasts, .ui-toast')].map(e => e.innerText).join(' | '));
const stageNodes = p => p.locator('.wm-node').count();
const gotoWf = async (p, id) => { await p.goto(BASE + '/#/Settings?wf=' + id); await p.waitForSelector('.wm-node'); await p.waitForTimeout(350); };

try {
  // ------------------------------------------------------------------------------------------------ the page
  await T.test('Settings opens on the workflow map: one h1 and the Pilot chip, no seven-tab bar, the toolbar, the locked guardrail drawn, the seeded workflows listed', async () => {
    const p = await open('dowens', '/#/Settings');
    assert.eq(await p.locator('#root h1').count(), 1); assert.match(await p.locator('#root h1').innerText(), /Settings/);
    assert.ok(await p.locator('.ui-maturity--pilot').count() >= 1, 'the Pilot (preview) chip'); assert.eq(await p.locator('.se-tab, .se-tabs').count(), 0, 'no tab bar');
    for (const s of ['#wm-sel', '#wm-new', '#wm-name', '#wm-on', '[data-wm="view"][data-v="map"]', '[data-wm="view"][data-v="outline"]', '#wm-undo', '#wm-tidy', '#wm-test', '#wm-save', '#wm-more', '#se-more']) assert.eq(await p.locator(s).count(), 1, s);
    assert.eq(await p.locator('#wm-save').isDisabled(), true, 'Save is disabled when nothing changed'); assert.match(await p.locator('#wm-save').innerText(), /Saved · v1/);
    const opts = await p.locator('#wm-sel option').allInnerTexts(); assert.eq(opts.length, 5, 'five seeded workflows'); assert.ok(opts.some(o => /Partial offer needs a decision/.test(o)) && opts.some(o => /Units running low \(off\)/.test(o)));
    assert.ok(await p.locator('.wm-locked').isVisible(), 'the locked guardrail is always drawn'); assert.match(await p.locator('.wm-locked').innerText(), /Nothing is sent, called or filed on its own/);
    // canvas content = the saved workflow: every block except the locked one, every link
    const w = (await wfs()).find(x => x.id === 'wf-partial-offer'); const shown = w.nodes.filter(n => n.block !== 'never_auto');
    assert.eq(await stageNodes(p), shown.length, 'one card per block'); assert.eq(await p.locator('.wm-edge').count(), w.edges.length, 'one line per link');
    assert.eq(await p.locator('.wm-node[data-node="never_auto"]').count(), 0, 'the locked guardrail is not a draggable card');
    await p.screenshot({ path: SHOTS + '/r5-map-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('More settings: People, Roles, Units, Family link, Audit and Presenter open their own page with a way back; ?tab=rules opens the map with the rule library', async () => {
    const p = await open('dowens', '/#/Settings');
    await p.click('#se-more'); await p.waitForSelector('.wm-menu');
    assert.deepEq(await p.locator('.wm-menu a').allInnerTexts().then(a => a.map(t => t.replace(/\s+\d+.*$/s, '').trim())), ['People', 'Roles', 'Units', 'Family link', 'Audit', 'Presenter']);
    for (const [tab, re] of [['people', /Add user/], ['roles', /Who can do what/], ['units', /Daily unit rule/], ['family', /Guardian signatures/], ['audit', /Audit log/], ['presenter', /How it fits/]]) {
      await p.goto(BASE + '/#/Settings?tab=' + tab); await p.waitForTimeout(450);
      assert.eq(await p.locator('#root h1').count(), 1, tab); assert.match(await rootText(p), re, tab); assert.eq(await p.locator('.se-crumb a').innerText().then(t => t.replace(/[^A-Za-z]/g, '')), 'Workflows', 'back link ' + tab);
      assert.eq(await p.locator('.wm').count(), 0, 'no map on ' + tab);
    }
    await p.click('.se-crumb a'); await p.waitForSelector('.wm-node'); assert.eq(await p.locator('.se-crumb').count(), 0);
    // the old Rules tab: the same link opens the library, filtered the same way
    await p.goto(BASE + '/#/Settings?tab=rules&q=follow-up&cat=HARVEST-REPORTED'); await p.waitForSelector('#wm-pal [data-g="rules"][open]');
    assert.eq(await p.inputValue('#wm-rq'), 'follow-up'); assert.eq(await p.inputValue('#wm-rcat'), 'HARVEST-REPORTED'); assert.eq(await p.locator('.wm-pl--rules li').count(), 1);
    await p.fill('#wm-rq', ''); await p.selectOption('#wm-rcat', ''); await p.waitForTimeout(250); assert.ok(await p.locator('.wm-pl--rules li').count() >= 70, 'all 73 rules are in the library: ' + await p.locator('.wm-pl--rules li').count());
    await p.fill('#wm-rq', 'zzzz-nothing'); await p.waitForTimeout(250); assert.match(await p.locator('.wm-lib').innerText(), /No rule matches/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('palette: When, If, Then, Always groups with a hover definition, the rule library with a verification icon, and the locked steps with the reason', async () => {
    const p = await open('dowens', '/#/Settings'); await p.click('#wm-blocks'); await p.waitForSelector('#wm-pal');
    for (const g of ['trigger', 'condition', 'action', 'guardrail', 'rules', 'locked']) assert.eq(await p.locator(`#wm-pal details[data-g="${g}"]`).count(), 1, g);
    assert.eq(await p.locator('#wm-pal [data-g="trigger"] [data-wm="addBlock"]').count(), 6); assert.eq(await p.locator('#wm-pal [data-g="condition"] [data-wm="addBlock"]').count(), 6); assert.eq(await p.locator('#wm-pal [data-g="action"] [data-wm="addBlock"]').count(), 3);
    assert.eq(await p.locator('#wm-pal [data-g="guardrail"] [data-wm="addBlock"]').count(), 6, 'six guardrails; the seventh is locked and already on the map');
    await p.hover('#wm-pal [data-block="units_used"]'); await p.waitForTimeout(150);
    assert.match(await p.locator('#wm-pal [data-block="units_used"] ~ .ui-hint__t').innerText(), /Starts for an authorization whose units used reach/); assert.ok(await p.locator('#wm-pal [data-block="units_used"] ~ .ui-hint__t[data-on]').count() === 1, 'the definition shows on hover');
    await p.focus('#wm-pal [data-block="notify"]'); await p.waitForTimeout(150); assert.eq(await p.locator('#wm-pal [data-block="notify"] ~ .ui-hint__t[data-on]').count(), 1, 'and on keyboard focus');
    await p.click('#wm-pal details[data-g="locked"] summary'); const locked = await p.locator('#wm-pal [data-g="locked"] .wm-pi--locked').allInnerTexts(); assert.eq(locked.length, 5);
    for (const l of ['Send by fax', 'Call the payer', 'File an appeal', 'Sign in Lauris', 'Text the family']) assert.ok(locked.some(t => t.includes(l)), l);
    assert.eq(await p.locator('#wm-pal [data-g="locked"] [data-wm]').count(), 0, 'nothing locked can be added');
    await p.locator('#wm-pal [data-g="locked"] .ui-hint__b').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await p.hover('#wm-pal [data-g="locked"] .ui-hint__b >> nth=0'); await p.waitForTimeout(200); assert.match(await p.locator('#wm-pal [data-g="locked"] .ui-hint__t[data-on]').innerText(), /A person does this step\. Psyflo does not send, call, file or sign on its own/);
    await p.click('#wm-pal details[data-g="rules"] summary'); assert.eq(await p.locator('#wm-pal .wm-pl--rules li').count(), 73);
    assert.eq(await p.locator('#wm-pal .wm-pl--rules li').first().locator('.wm-v').count(), 1, 'a verification icon on each rule');
    await p.screenshot({ path: SHOTS + '/r5-palette-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ the map: drag, snap, keyboard
  await T.test('drag: a block moves with the pointer and snaps to the 20 px grid, its lines follow, Save lights up, Undo puts it back; nothing is stored until Save', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-late-notes'); await p.waitForSelector('.wm-node');
    const [x0, y0] = await pos(p, 'g1'); assert.eq(x0 % 20, 0); const before = await p.locator('.wm-edge[data-from="g1"] .wm-edge__p').getAttribute('d');
    const b = await nodeBox(p, 'g1'); await dragFrom(p, b, 47, 93, { oy: 40 });
    const [x1, y1] = await pos(p, 'g1'); assert.deepEq([x1 - x0, y1 - y0], [40, 100], 'moved by the pointer distance, snapped to the grid: ' + [x1 - x0, y1 - y0]);
    assert.ok(x1 % 20 === 0 && y1 % 20 === 0, 'on the grid'); assert.ok((await p.locator('.wm-edge[data-from="g1"] .wm-edge__p').getAttribute('d')) !== before, 'the line follows the block');
    assert.eq(await p.locator('#wm-save').isDisabled(), false); assert.match(await p.locator('#wm-save').innerText(), /^Save$/);
    const w = await wfOf('wf-late-notes'); assert.eq(w.nodes.find(n => n.id === 'g1').y, y0, 'the store is unchanged until Save');
    await p.click('#wm-undo'); await p.waitForTimeout(200); assert.deepEq(await pos(p, 'g1'), [x0, y0], 'Undo'); assert.eq(await p.locator('#wm-save').isDisabled(), true, 'back to saved');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('keyboard: Tab to a block, arrows move it by one grid step (Shift by five), Enter opens the editor, Delete removes it (Undo returns it); no drag needed', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-late-notes'); await p.waitForSelector('.wm-node');
    await p.focus('.wm-node[data-node="a1"]'); const [x0, y0] = await pos(p, 'a1');
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); assert.deepEq(await pos(p, 'a1'), [x0 + 20, y0 + 20]);
    await p.keyboard.press('Shift+ArrowDown'); await p.waitForTimeout(150); assert.deepEq(await pos(p, 'a1'), [x0 + 20, y0 + 120], 'Shift moves five steps');
    assert.eq(await p.evaluate(() => document.activeElement.dataset.node), 'a1', 'focus stays on the block');
    await p.keyboard.press('Enter'); await p.waitForTimeout(250); assert.match(await p.locator('#wm-insp h2').innerText(), /Notify/); assert.eq(await p.evaluate(() => document.activeElement.id), 'wm-insp-t', 'Enter moves focus to the editor');
    await p.focus('.wm-node[data-node="a1"]'); await p.keyboard.press('Delete'); await p.waitForTimeout(250); assert.eq(await p.locator('.wm-node[data-node="a1"]').count(), 0, 'Delete removes the block'); assert.eq(await p.locator('.wm-edge[data-to="a1"]').count(), 0, 'and its links');
    assert.match(await p.locator('#wm-save').innerText(), /^Save$/); await p.click('#wm-undo'); await p.waitForTimeout(200); assert.eq(await p.locator('.wm-node[data-node="a1"]').count(), 1, 'Undo');
    assert.eq(await p.locator('.wm-node[data-node="never_auto"]').count(), 0); await p.keyboard.press('Control+z').catch(() => { });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('the locked guardrail cannot be selected, moved or removed; the palette lists it as always on', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-late-notes'); await p.waitForSelector('.wm-node');
    await p.click('.wm-locked', { position: { x: 20, y: 10 } }).catch(() => { }); await p.waitForTimeout(200); assert.eq(await p.locator('.wm-node.is-sel').count(), 0, 'selecting it does nothing'); assert.eq(await p.locator('#wm-insp').count(), 0, 'no editor opens for it');
    assert.eq(await p.locator('.wm-locked [data-wm="removeNode"], .wm-locked button').count() <= 1, true, 'no remove control (only the info hint)');
    await p.click('#wm-blocks'); await p.click('#wm-pal [data-g="guardrail"] summary'); assert.match(await p.locator('#wm-pal [data-g="guardrail"]').innerText(), /Nothing is sent on its own/);
    await done();
  });

  // ------------------------------------------------------------------------------------------------ add, link, rules
  await T.test('palette: a block is dragged onto the canvas and lands on the grid; Enter or a click adds one too (after the selected block, linked to its free exit)', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-late-notes'); await p.waitForSelector('.wm-node'); await p.click('#wm-blocks'); await p.waitForSelector('#wm-pal');
    const n0 = await stageNodes(p); const item = p.locator('#wm-pal [data-block="evidence_missing"]'); await item.scrollIntoViewIfNeeded(); const ib = await item.boundingBox(); const st = await p.locator('#wm-stage').boundingBox();
    await p.mouse.move(ib.x + 30, ib.y + 14); await p.mouse.down(); await p.mouse.move(ib.x + 90, ib.y + 40, { steps: 3 }); await p.mouse.move(st.x + 331, st.y + 261, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    assert.eq(await stageNodes(p), n0 + 1, 'dropped on the canvas'); const nid = await p.evaluate(() => document.querySelector('.wm-node.is-sel').dataset.node); const [x, y] = await pos(p, nid);
    assert.ok(x % 20 === 0 && y % 20 === 0 && x > 100, 'snapped to the grid: ' + [x, y]); assert.match(await p.locator('.wm-node.is-sel').innerText(), /Evidence gaps/);
    assert.eq(await p.locator(`.wm-node[data-node="${nid}"]`).evaluate(e => e.classList.contains('is-bad')), true, 'not connected yet: marked, and the editor lists the problem');
    assert.match(await p.locator('#wm-insp').innerText(), /not connected to a "When" block/);
    // a keyboard add: select the Notify block, focus Add task in the palette, press Enter: it follows the block and links to its free exit
    await p.click('.wm-node[data-node="a1"] .wm-node__t'); await p.waitForTimeout(250); const e0 = await p.locator('.wm-edge').count();
    await p.focus('#wm-pal [data-block="add_task"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    assert.eq(await stageNodes(p), n0 + 2); assert.eq(await p.locator('.wm-edge').count(), e0 + 1, 'linked from the block that was selected'); assert.eq(await p.locator('.wm-edge[data-from="a1"]').count(), 1);
    assert.eq(await p.evaluate(() => document.activeElement.className.includes('wm-node')), true, 'focus moves to the new block');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('link: drag from an exit dot to a block; a loop, a self link and a link into a When block are refused with a reason; click a line and Delete removes it; the inspector pickers do the same without dragging', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-units-low', { w: 1580 }); await p.waitForSelector('.wm-node');
    const e0 = await p.locator('.wm-edge').count();
    // Yes -> Notify as well (a second link from the Yes exit: an exit may fan out)
    const yes = await p.locator('.wm-node[data-node="c1"] .wm-port--yes').boundingBox(); const tgt = await nodeBox(p, 'a2');
    await p.mouse.move(yes.x + 12, yes.y + 12); await p.mouse.down(); await p.mouse.move(tgt.x + 80, tgt.y + 40, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300);
    assert.eq(await p.locator('.wm-edge').count(), e0 + 1, 'a new line'); assert.eq(await p.locator('.wm-edge[data-from="c1"][data-port="yes"]').count(), 2);
    // a loop: Suggest flag -> Units left
    const out = await p.locator('.wm-node[data-node="a1"] .wm-port--out').boundingBox(); const back = await nodeBox(p, 'c1');
    await p.mouse.move(out.x + 12, out.y + 12); await p.mouse.down(); await p.mouse.move(back.x + 60, back.y + 40, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300);
    assert.eq(await p.locator('.wm-edge').count(), e0 + 1, 'the loop was refused'); assert.match(await toast(p), /loop back/);
    // into a When block
    const t1 = await nodeBox(p, 't1'); const o2 = await p.locator('.wm-node[data-node="a2"] .wm-port--out').boundingBox();
    await p.mouse.move(o2.x + 12, o2.y + 12); await p.mouse.down(); await p.mouse.move(t1.x + 60, t1.y + 40, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300); assert.eq(await p.locator('.wm-edge').count(), e0 + 1); assert.match(await toast(p), /starts a workflow/);
    // click the new line, Delete removes it
    const id = await p.locator('.wm-edge[data-from="c1"][data-port="yes"]').last().getAttribute('data-edge'); await p.locator(`.wm-edge[data-edge="${id}"] .wm-edge__hit`).dispatchEvent('click'); await p.waitForTimeout(250);
    assert.match(await p.locator('#wm-insp').innerText(), /Remove this link/); await p.focus(`.wm-edge[data-edge="${id}"] .wm-edge__hit`); await p.keyboard.press('Delete'); await p.waitForTimeout(250); assert.eq(await p.locator('.wm-edge').count(), e0, 'Delete removed the line');
    // the picker does it without a drag: Notify (a2) -> Suggest flag (a1)? that is allowed (a2 has no links yet); then the cycle check through the picker
    await p.click('.wm-node[data-node="a2"] .wm-node__t'); await p.waitForTimeout(250);
    const opts = await p.locator('#wm-next-a2-out option').allInnerTexts(); assert.ok(opts.some(o => /Then: Suggest a flag/.test(o)), 'the picker lists blocks on the map'); assert.ok(!opts.some(o => /When: /.test(o)) && !opts.some(o => /If: Units left/.test(o)), 'no When block and no block that would loop');
    await p.selectOption('#wm-next-a2-out', 'node:a1'); await p.waitForTimeout(250); assert.eq(await p.locator('.wm-edge[data-from="a2"]').count(), 1, 'linked from the inspector');
    await p.selectOption('#wm-next-a2-out', 'new:add_task'); await p.waitForTimeout(250); assert.eq(await p.locator('.wm-edge[data-from="a2"]').count(), 2, 'or to a new block'); assert.eq(await stageNodes(p), 5);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('rules: drop a rule from the library onto a block (or Add a rule in the inspector); the card shows a rules badge; detach removes it', async () => {
    const p = await open('dowens', '/#/Settings?tab=rules&wf=wf-late-notes', { w: 1580 }); await p.waitForSelector('.wm-node'); await p.waitForSelector('#wm-pal .wm-pl--rules');
    assert.eq(await p.locator('.wm-node[data-node="a1"] .wm-badge').count(), 0); await p.fill('#wm-rq', 'Follow-up call on the decision'); await p.waitForTimeout(250);
    const r = p.locator('#wm-pal [data-wm="addRule"]').first(); await r.scrollIntoViewIfNeeded(); const rb = await r.boundingBox(); const tn = await nodeBox(p, 'a1');
    await p.mouse.move(rb.x + 40, rb.y + 14); await p.mouse.down(); await p.mouse.move(rb.x + 90, rb.y + 30, { steps: 3 }); await p.mouse.move(tn.x + 100, tn.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(350);
    assert.eq(await p.locator('.wm-node[data-node="a1"] .wm-badge').count(), 1, 'a rules badge'); assert.match(await p.locator('#wm-insp').innerText(), /Follow-up call on the decision/); assert.match(await p.locator('#wm-insp').innerText(), /10 days after sending/);
    assert.match(await p.locator('.wm-node[data-node="a1"]').getAttribute('aria-label'), /1 rule/);
    // the inspector's Add a rule: a search list of the whole table
    await p.click('[data-wm="pickRule"]'); await p.waitForSelector('#wm-pq'); await p.fill('#wm-pq', 'daily note'); await p.waitForTimeout(250); assert.ok(await p.locator('.wm-pk__b').count() >= 1);
    await p.locator('.wm-pk__b').first().click(); await p.waitForTimeout(350); assert.eq(await p.locator('#wm-insp .wm-rl__i').count(), 2, 'two rules now');
    await p.locator('#wm-insp [data-wm="detachRule"]').first().click(); await p.waitForTimeout(250); assert.eq(await p.locator('#wm-insp .wm-rl__i').count(), 1, 'detached');
    assert.ok(Array.isArray((await wfOf('wf-late-notes')).nodes.find(n => n.id === 'a1').rules), 'nothing stored yet'); assert.deepEq((await wfOf('wf-late-notes')).nodes.find(n => n.id === 'a1').rules, []);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ inspector and the rule-bound number
  await T.test('inspector: typed settings from the catalog (number, select, roles, text); the card summary follows; a rule-bound number shows the live rule and its Edit asks why and changes the rule everywhere', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-units-low'); await p.waitForSelector('.wm-node');
    await p.click('.wm-node[data-node="c1"] .wm-node__t'); await p.waitForTimeout(250);
    await p.fill('#wm-p-pct', '40'); await p.waitForTimeout(150); await p.keyboard.press('Tab'); await p.waitForTimeout(250); assert.match(await p.locator('.wm-node[data-node="c1"]').innerText(), /Units left are 40% or less/);
    await p.fill('#wm-p-pct', '250'); await p.keyboard.press('Tab'); await p.waitForTimeout(300); assert.match(await p.locator('#wm-insp').innerText(), /must be between 0 and 100/, 'out of range: a problem is listed'); assert.eq(await p.locator('.wm-node[data-node="c1"]').evaluate(e => e.classList.contains('is-bad')), true);
    await p.fill('#wm-p-pct', '25'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
    await p.click('.wm-node[data-node="a1"] .wm-node__t'); await p.waitForTimeout(250); await p.selectOption('#wm-p-reason', 'evidence'); await p.waitForTimeout(250); assert.match(await p.locator('.wm-node[data-node="a1"]').innerText(), /evidence missing/i);
    await p.check('#wm-insp input[data-v="clinician"]'); await p.waitForTimeout(250); assert.match(await p.locator('.wm-node[data-node="a1"]').innerText(), /clinician/i); await p.uncheck('#wm-insp input[data-v="supervisor"]'); await p.waitForTimeout(250);
    await p.click('.wm-node[data-node="a2"] .wm-node__t'); await p.waitForTimeout(250); await p.fill('#wm-p-message', '{patient} · {payer}: please look'); await p.waitForTimeout(200); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
    assert.eq(await p.locator('#wm-p-message').inputValue(), '{patient} · {payer}: please look'); assert.match(await p.locator('#wm-p-message').getAttribute('maxlength'), /120/);
    // the rule-bound number
    await p.click('.wm-node[data-node="t1"] .wm-node__t'); await p.waitForTimeout(250); assert.eq(await p.locator('#wm-p-pct').evaluate(e => e.tagName), 'OUTPUT', 'a rule-bound number is not a free input');
    assert.match(await p.locator('#wm-p-pct').innerText(), /75 percent of units used/); assert.eq(rule(await state('dowens'), 'units.warn_used_pct').value, 75);
    await p.click('#wm-insp [data-wm="editRule"][data-key="units.warn_used_pct"] >> nth=0'); await p.waitForSelector('.ui-dialog--drawer');
    assert.match(await p.locator('.ui-dialog--drawer').innerText(), /changes the rule everywhere in Psyflo/); assert.match(await p.locator('.ui-dialog--drawer').innerText(), /Unverified/i);
    await p.fill('#se-rv', '80'); await p.click('.ui-dialog--drawer [data-ui-action="1"]'); await p.waitForTimeout(250); assert.match(await p.locator('#se-rerr').innerText(), /Say why/, 'a reason is required'); assert.eq(rule(await state('dowens'), 'units.warn_used_pct').value, 75);
    await p.fill('#se-why', 'Supervisors asked for 80 percent'); await p.click('.ui-dialog--drawer [data-ui-action="1"]'); await p.waitForTimeout(800);
    const r = rule(await state('dowens'), 'units.warn_used_pct'); assert.eq(r.value, 80); assert.eq(r.history.length, 1, 'the rule keeps its history'); assert.ok((await state('dowens')).events.slice(-3).some(e => /Rule changed: Units warning at/.test(e.what)), 'audited through settings.rule');
    await p.waitForTimeout(300); assert.match(await p.locator('.wm-node[data-node="t1"]').innerText(), /Units used reach 80%/, 'the card follows the rule'); assert.match(await p.locator('#wm-p-pct').innerText(), /80 percent/);
    assert.eq(await p.locator('#wm-save').isDisabled(), false, 'the other edits are still unsaved in the draft'); assert.match(await rootText(p), /units used|Units used/);
    await api('settings.rule', { key: 'units.warn_used_pct', reset: true, reason: 'back to the default' }, 'dowens');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ save, enable
  await T.test('Save calls workflow.save: version and history move on, Save goes quiet (Saved · v2); a workflow with a problem is refused and the problems are listed; Reload keeps the draft saved', async () => {
    await reset('live'); const p = await open('dowens', '/#/Settings?wf=wf-late-notes'); await p.waitForSelector('.wm-node');
    await p.click('.wm-node[data-node="g1"] .wm-node__t'); await p.waitForTimeout(250); await p.fill('#wm-p-n', '3'); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
    await p.fill('#wm-name', 'Late notes (supervisor)'); await p.waitForTimeout(150); assert.eq(await p.locator('#wm-save').isDisabled(), false);
    // first a broken one: an orphan block
    await p.click('#wm-blocks').catch(() => { }); const w0 = await wfOf('wf-late-notes'); assert.eq(w0.version, 1);
    await p.locator('#wm-pal [data-block="payer_is"]').click().catch(() => { }); await p.waitForTimeout(250);
    await p.click('#wm-save'); await p.waitForTimeout(500); assert.eq((await wfOf('wf-late-notes')).version, 1, 'a workflow with an error is not saved'); assert.match(await rootText(p), /to fix before this can be saved|not connected/i);
    await p.click('#wm-undo'); await p.waitForTimeout(250);
    await p.click('#wm-save'); await p.waitForTimeout(800);
    const w1 = await wfOf('wf-late-notes'); assert.eq(w1.version, 2); assert.eq(w1.name, 'Late notes (supervisor)'); assert.eq(w1.history.length, 2); assert.eq(w1.history[1].by, 'dowens'); assert.eq(w1.nodes.find(n => n.id === 'g1').params.n, 3);
    assert.match(await p.locator('#wm-save').innerText(), /Saved · v2/); assert.eq(await p.locator('#wm-save').isDisabled(), true);
    assert.ok((await state('dowens')).events.slice(-3).some(e => /Workflow saved: Late notes \(supervisor\) · v2/.test(e.what)), 'audited');
    await p.reload(); await p.waitForSelector('.wm-node'); await p.waitForTimeout(300); assert.eq(await p.inputValue('#wm-name'), 'Late notes (supervisor)'); assert.match(await p.locator('#wm-save').innerText(), /Saved · v2/);
    // the history shows in the summary
    await p.click('#wm-details'); await p.waitForTimeout(250); await p.click('.wm-hist summary'); assert.match(await p.locator('.wm-histl').innerText(), /v2.*Dana Owens/s); assert.match(await p.locator('.wm-histl').innerText(), /v1/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('the On / Off switch calls workflow.enable on the saved workflow; unsaved changes ask for a Save first; a workflow with errors cannot be turned on', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-units-low'); await p.waitForSelector('.wm-node');
    assert.eq(await p.locator('#wm-on').getAttribute('aria-checked'), 'false'); await p.click('#wm-on'); await p.waitForTimeout(700); assert.eq((await wfOf('wf-units-low')).enabled, true); assert.eq(await p.locator('#wm-on').getAttribute('aria-checked'), 'true'); assert.match(await p.locator('.wm-onl').innerText(), /On/);
    assert.ok((await state('dowens')).events.slice(-2).some(e => /Workflow turned on: Units running low/.test(e.what)), 'audited');
    // the bell now carries the workflow's items (a Workflows group), for the roles it names
    const sup = await state('cdiaz'); assert.ok(sup.workflows.some(w => w.id === 'wf-units-low'), 'a supervisor reads the enabled workflow');
    await p.click('.wm-node[data-node="c1"] .wm-node__t'); await p.waitForTimeout(200); await p.fill('#wm-p-pct', '30'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
    await p.click('#wm-on'); await p.waitForTimeout(300); assert.match(await toast(p), /Save your changes first/); assert.eq((await wfOf('wf-units-low')).enabled, true, 'unchanged');
    await p.click('#wm-undo'); await p.waitForTimeout(200); await p.click('#wm-on'); await p.waitForTimeout(600); assert.eq((await wfOf('wf-units-low')).enabled, false, 'off again');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ test run
  await T.test('Test run: runs the current (unsaved) workflow on the live demo data, says test only, shows counts and a table; a match lights its path; nothing is written', async () => {
    await reset('live'); const p = await open('dowens', '/#/Settings?wf=wf-units-low'); await p.waitForSelector('.wm-node');
    const ev0 = (await state('dowens')).events.length; const rev0 = (await state('dowens')).rev;
    await p.click('.wm-node[data-node="c1"] .wm-node__t'); await p.waitForTimeout(200); await p.fill('#wm-p-pct', '5'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
    await p.click('#wm-test'); await p.waitForSelector('#wm-testp'); const t = await p.locator('#wm-testp').innerText();
    assert.match(t, /Test only: nothing is sent or changed/); assert.match(t, /\d+ checked · \d+ would match · \d+ stopped by a guardrail · \d+ bell items/); assert.match(t, /includes your unsaved changes/);
    assert.ok(await p.locator('.wm-tt tbody tr').count() >= 1, 'a table of matches'); assert.match(t, /Units used › Units left › (Notify|Suggest flag)/);
    assert.match(await p.locator('.wm-tt tbody th').first().innerText(), /^[A-Z]\.[A-Z]\./, 'patients are initials');
    await p.locator('.wm-tt tbody tr').first().click(); await p.waitForTimeout(300); assert.ok(await p.locator('.wm-node.is-lit').count() >= 3, 'the path is lit'); assert.ok(await p.locator('.wm-edge.is-lit').count() >= 2);
    assert.eq(await p.locator('.wm-tt tbody tr.is-on').count(), 1);
    await p.click('[data-wm="closeTest"]'); await p.waitForTimeout(200); assert.eq(await p.locator('#wm-testp').count(), 0); assert.eq(await p.locator('.wm-node.is-lit').count(), 0);
    const s1 = await state('dowens'); assert.eq(s1.events.length, ev0, 'no audit event: a test run writes nothing'); assert.eq(s1.rev, rev0, 'the store did not change');
    assert.eq((await wfOf('wf-units-low')).nodes.find(n => n.id === 'c1').params.pct, 25, 'the saved workflow is untouched');
    await p.screenshot({ path: SHOTS + '/r5-test-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ outline and narrow screens
  await T.test('Outline: the same workflow as an indented list with kind, summary, edit and remove, and Add a block here; everything the map does works without dragging', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-units-low&view=outline'); await p.waitForSelector('.wm-outline');
    assert.eq(await p.locator('.wm-ol__row[data-node]').count(), 4); const t = await p.locator('.wm-outline').innerText(); assert.match(t, /WHEN\s+Units used/); assert.match(t, /IF\s+Units left/); assert.match(t, /Yes/); assert.match(t, /No/); assert.match(t, /Nothing is sent, called or filed on its own/);
    assert.eq(await p.locator('.wm-ol__row [data-wm="editNode"]').count(), 4); assert.eq(await p.locator('.wm-ol__row [data-wm="removeNode"]').count(), 4);
    assert.ok(await p.locator('select[data-add]').count() >= 3, 'Add a block here at every open end');
    // add a guardrail after Notify, from the picker
    await p.selectOption('select[data-add][data-node="a2"]', 'max_per_day'); await p.waitForTimeout(350); assert.eq(await p.locator('.wm-ol__row[data-node]').count(), 5); assert.match(await p.locator('#wm-insp h2').innerText(), /Alert limit/, 'the new block opens in the editor');
    await p.click('[data-wm="editNode"][data-id="c1"]'); await p.waitForTimeout(250); assert.match(await p.locator('#wm-insp h2').innerText(), /Units left/);
    await p.click('[data-wm="view"][data-v="map"]'); await p.waitForSelector('.wm-canvas'); assert.eq(await stageNodes(p), 5, 'the map shows the same blocks'); assert.match(await p.locator('#wm-save').innerText(), /^Save$/);
    await p.click('[data-wm="view"][data-v="outline"]'); await p.click('.wm-ol__row[data-node] [data-wm="removeNode"] >> nth=-1'); await p.waitForTimeout(250); assert.eq(await p.locator('.wm-ol__row[data-node]').count(), 4);
    assert.match(await p.evaluate(() => location.hash), /view=outline/, 'the view is in the address');
    await p.screenshot({ path: SHOTS + '/r5-outline-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('390 px: the Outline is the default, the palette is an Add block picker, editing opens a drawer, no sideways scroll, targets 24 px or more, every control labelled', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-units-low', { w: 390, h: 844 }); await p.waitForSelector('.wm-outline');
    assert.eq(await p.locator('[data-wm="view"][data-v="outline"]').getAttribute('aria-pressed'), 'true'); assert.eq(await p.locator('#wm-pal, #wm-insp').count(), 0, 'no side columns');
    const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, 'no sideways scroll ' + JSON.stringify(w));
    const small = await p.evaluate(() => [...document.querySelectorAll('#root button, #root select, #root input, #root a[href]')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.height < 24 || r.width < 24) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
    assert.deepEq(small, [], 'targets under 24 px: ' + small.join(', '));
    const unlabelled = await p.evaluate(() => [...document.querySelectorAll('#root button, #root select, #root input, #root textarea')].filter(e => !(e.getAttribute('aria-label') || e.innerText.trim() || (e.labels && e.labels.length) || e.getAttribute('aria-labelledby') || e.getAttribute('title'))).map(e => e.id || e.className));
    assert.deepEq(unlabelled, [], 'unlabelled: ' + unlabelled.join(', '));
    await p.click('#wm-blocks'); await p.waitForSelector('.ui-dialog--drawer'); assert.ok(await p.locator('.ui-dialog--drawer [data-block="notify"]').count() === 1, 'the picker lists the blocks'); await p.locator('.ui-dialog--drawer [data-block="payer_is"]').click(); await p.waitForTimeout(400);
    assert.eq(await p.locator('.ui-dialog--drawer').count(), 1, 'a new block opens its editor drawer'); assert.match(await p.locator('.ui-dialog--drawer').innerText(), /Payer/);
    await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await p.locator('.ui-dialog--drawer').count(), 0);
    await p.click('[data-wm="editNode"][data-id="t1"]'); await p.waitForSelector('.ui-dialog--drawer'); assert.match(await p.locator('.ui-dialog--drawer').innerText(), /Units used/); await p.screenshot({ path: SHOTS + '/r5-inspector-390.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.screenshot({ path: SHOTS + '/r5-outline-390.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('1024 px: the map, toolbar and editor fit without sideways scroll; the palette opens over the layout on request', async () => {
    const p = await open('dowens', '/#/Settings?wf=wf-evidence-gaps', { w: 1024, h: 800 }); await p.waitForSelector('.wm-node');
    let w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, 'no sideways scroll'); await p.screenshot({ path: SHOTS + '/r5-map-1024.png' });
    await p.click('.wm-node[data-node="c1"] .wm-node__t'); await p.waitForSelector('#wm-insp'); await p.click('#wm-blocks'); await p.waitForSelector('#wm-pal');
    w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, 'no sideways scroll with both panels'); await p.screenshot({ path: SHOTS + '/r5-panels-1024.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ two-person, create, duplicate, delete
  await T.test('the "second person" guardrail: a saved change waits (the live version does not change), Settings says so, a different person (the clinician, from the Dashboard) confirms, the proposer cannot', async () => {
    await reset('live'); const p = await open('dowens', '/#/Settings?wf=wf-late-notes', { w: 1580 }); await p.waitForSelector('.wm-node');
    await p.click('#wm-blocks').catch(() => { }); await p.click('.wm-node[data-node="a1"] .wm-node__t'); await p.waitForTimeout(200);
    await p.click('#wm-pal [data-g="guardrail"] summary'); await p.focus('#wm-pal [data-block="two_person"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(350); assert.eq(await stageNodes(p), 4);
    await p.fill('#wm-name', 'Late notes, two people'); await p.click('#wm-save'); await p.waitForTimeout(900);
    const w = await wfOf('wf-late-notes'); assert.eq(w.version, 1, 'the live version did not change'); assert.ok(w.pending && w.pending.by === 'dowens', 'a pending change by the proposer'); assert.eq(w.name, 'Late notes');
    assert.match(await toast(p), /Waiting for a second person/); assert.match(await p.locator('.wm-bar').innerText(), /Waiting/);
    await p.click('#wm-details'); await p.waitForTimeout(250); assert.match(await p.locator('#wm-insp').innerText(), /Waiting for a second person/); assert.eq(await p.locator('#wm-insp [data-wm="confirm"]').count(), 0, 'the proposer has no Approve');
    await assert.refused(tryApi('workflow.confirm', { id: 'wf-late-notes', decision: 'approve' }, 'dowens'), /different person/, 403);
    // the clinician confirms from the Dashboard list
    const q = await open('jperez', '/#/Dashboard'); await q.waitForSelector('[data-x="confirm"][data-kind="workflow"]'); assert.match(await rootText(q), /Confirm workflow change · Late notes, two people/);
    await q.click('[data-x="confirm"][data-kind="workflow"]'); await q.waitForSelector('.ui-dialog'); assert.match(await q.locator('.ui-dialog').innerText(), /Late notes, two people/); assert.match(await q.locator('.ui-dialog').innerText(), /D\. Owens/);
    await q.click('.ui-dialog [data-ui-action="1"]'); await q.waitForTimeout(900);
    const w2 = await wfOf('wf-late-notes'); assert.eq(w2.version, 2); assert.eq(w2.name, 'Late notes, two people'); assert.ok(!w2.pending); assert.ok(w2.nodes.some(n => n.block === 'two_person'));
    await p.reload(); await p.waitForSelector('.wm-node'); await p.waitForTimeout(400); assert.match(await p.locator('#wm-save').innerText(), /Saved · v2/); assert.eq(await p.inputValue('#wm-name'), 'Late notes, two people');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('New workflow (blank or from a template), Duplicate and Delete (a reason of four letters or more); the new workflow is off', async () => {
    await reset('live'); const p = await open('dowens', '/#/Settings'); await p.waitForSelector('.wm-node');
    await p.click('#wm-new'); await p.waitForSelector('#wm-nn'); assert.ok((await p.locator('#wm-nf option').allInnerTexts()).some(o => /Units running low/.test(o)), 'templates are offered');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(200); assert.match(await p.locator('#wm-nerr').innerText(), /name/i);
    await p.fill('#wm-nn', 'Renewal watch'); await p.selectOption('#wm-nf', 'evidence-gaps'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(900);
    const list = await wfs(); const nw = list.find(w => w.name === 'Renewal watch'); assert.ok(nw && nw.enabled === false, 'created off'); assert.ok(nw.nodes.length >= 5, 'copied from the template'); assert.eq(await p.inputValue('#wm-name'), 'Renewal watch'); assert.eq(await p.locator('.wm-node').count(), nw.nodes.filter(n => n.block !== 'never_auto').length);
    await p.click('#wm-new'); await p.waitForSelector('#wm-nn'); await p.fill('#wm-nn', 'Blank one'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(900); const blank = (await wfs()).find(w => w.name === 'Blank one'); assert.eq(blank.nodes.filter(n => n.block !== 'never_auto').length, 0); assert.ok(blank.nodes.some(n => n.block === 'never_auto'), 'the locked guardrail is there');
    assert.match(await p.locator('.wm-empty').innerText(), /Start with a When block/); await p.click('#wm-details'); await p.waitForTimeout(250); assert.match(await p.locator('#wm-insp').innerText(), /This workflow/);
    await p.click('#wm-more'); await p.waitForSelector('.wm-menu [data-m="dup"]'); await p.click('.wm-menu [data-m="dup"]'); await p.waitForTimeout(900); assert.ok((await wfs()).some(w => w.name === 'Copy of Blank one'), 'duplicated');
    await p.click('#wm-more'); await p.click('.wm-menu [data-m="del"]'); await p.waitForSelector('#se-why'); await p.fill('#se-why', 'no'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(250); assert.match(await p.locator('#se-why-err').innerText(), /Say why/);
    await p.fill('#se-why', 'Not needed any more'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(900); assert.ok(!(await wfs()).some(w => w.name === 'Copy of Blank one'), 'deleted');
    assert.ok((await state('dowens')).events.slice(-3).some(e => /Workflow deleted: Copy of Blank one/.test(e.what)), 'audited');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  // ------------------------------------------------------------------------------------------------ roles
  await T.test('roles: only the administrator opens Settings; the other roles never see a definition in the UI and read enabled workflows only (they see the bell items); the portals read none', async () => {
    await reset('live');
    for (const u of ['jperez', 'cdiaz', 'khale']) { const q = await open(u, '/#/Settings'); assert.ok(await q.evaluate(() => !!document.querySelector('#root .denied')), u + ' is denied'); assert.eq(await q.locator('.wm, .wm-node, #wm-pal').count(), 0, u + ' sees no map'); await q.close(); }
    for (const u of ['jperez', 'cdiaz', 'khale']) { const s = await state(u); assert.ok(s.workflows.every(w => w.enabled && !w.history && !w.pending), u + ' reads enabled workflows only'); }
    await assert.refused(tryApi('workflow.save', { id: 'wf-late-notes', workflow: { name: 'x' } }, 'cdiaz'), /not allowed/, 403);
    await assert.refused(tryApi('workflow.enable', { id: 'wf-late-notes', enabled: true }, 'jperez'), /not allowed/, 403);
    assert.eq((await state('dowens')).workflows.length, 5); await done();
  });
} finally { await browser.close(); }
await T.done();
