// R4 FMT: Authorizations and Denial Intelligence share one formatting. Both date cards come from ui.dateCard (same DOM structure, same size and
// place at 1440 px, same behaviour and URL params), both list pages share the filter grid, the table styling, the cells and the pager, both case
// pages share the header card and the section card, and the quiet labels (source, lock, evidence missing) are icons with a hover definition.
// Run: BASE=http://localhost:4840 node test/fmt.mjs
import { suite, assert, login, errors, playwright, reset, state, BASE, SHOTS } from './lib/index.mjs';

const T = suite('fmt');
const { chromium } = playwright();
const browser = await chromium.launch();
const open = async (user, width = 1440, height = 1000) => { const ctx = await browser.newContext({ viewport: { width, height } }); const page = await ctx.newPage(); page.errs = errors(page); await login(page, user, { presenter: false }); page.ctx = ctx; return page; };
const go = async (p, hash, sel) => { await p.goto(BASE + '/#/' + hash); await p.waitForSelector(sel, { timeout: 15000 }); await p.waitForTimeout(300); };
const hashOf = p => p.evaluate(() => location.hash);
const shot = (p, name) => p.screenshot({ path: `${SHOTS}/fmt-${name}.png`, fullPage: true });
// the structure of a card: every element's tag and classes in order (text and values left out)
const shape = (p, sel) => p.$eval(sel, el => [el, ...el.querySelectorAll('*')].map(e => e.tagName.toLowerCase() + '.' + [...e.classList].filter(c => !/^(is-|ui-hint--)/.test(c)).join('.')));
const box = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); const m = document.querySelector('main'); const mr = m.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top - mr.top), right: Math.round(mr.right - r.right) }; });
const css = (p, sel, props) => p.$eval(sel, (el, props) => { const c = getComputedStyle(el); return Object.fromEntries(props.map(k => [k, c[k]])); }, props);

await reset('canvas');

await T.test('the date cards: "Authorization period" and "Decision date" both come from ui.dateCard: same structure, same size, same place at 1440 px', async () => {
  const p = await open('jperez');
  await go(p, 'Authorizations', '.ui-datecard'); const a = { shape: await shape(p, '.ui-datecard'), box: await box(p, '.ui-datecard'), n: await p.locator('.ui-datecard').count(), title: await p.locator('.ui-datecard h2').innerText(), chips: await p.locator('.ui-datecard .ui-fchip').allInnerTexts() };
  await shot(p, 'auth-1440');
  await go(p, 'DenialIntelligence', '.ui-datecard'); const d = { shape: await shape(p, '.ui-datecard'), box: await box(p, '.ui-datecard'), n: await p.locator('.ui-datecard').count(), title: await p.locator('.ui-datecard h2').innerText(), chips: await p.locator('.ui-datecard .ui-fchip').allInnerTexts() };
  await shot(p, 'di-1440');
  assert.eq(a.n, 1); assert.eq(d.n, 1); assert.eq(a.title, 'Authorization period'); assert.eq(d.title, 'Decision date');
  assert.deepEq(a.chips, ['Ends in 7 days', 'Ends in 30 days', 'Ends in 60 days']); assert.deepEq(d.chips, ['Today', 'This week', 'Before this week']);
  assert.deepEq(a.shape, d.shape, 'the same DOM structure (tags and classes), only the text differs');
  assert.deepEq(a.box, d.box, `the same width, height and position in the page header: ${JSON.stringify(a.box)} vs ${JSON.stringify(d.box)}`);
  assert.ok(a.box.w >= 380 && a.box.w <= 460, 'a fixed card width: ' + a.box.w); assert.ok(a.box.right <= 40, 'top right of the title row: ' + a.box.right);
  // the same styles: chip, inputs, labels
  for (const sel of ['.ui-datecard', '.ui-datecard .ui-fchip', '.ui-datecard input', '.ui-datecard__l', '.ui-datecard__t']) {
    const props = ['fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'borderRadius', 'minHeight', 'backgroundColor']; await go(p, 'Authorizations', '.ui-datecard'); const x = await css(p, sel, props); await go(p, 'DenialIntelligence', '.ui-datecard'); assert.deepEq(await css(p, sel, props), x, 'the same style for ' + sel);
  }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the date cards behave the same: a date is a from/to param, a quick chip lights, "Clear" empties the card; Authorizations keeps its Ends in mode, Denial Intelligence its ranges', async () => {
  const p = await open('jperez');
  for (const [route, noun] of [['Authorizations', 'authorizations'], ['DenialIntelligence', 'denials']]) {
    await go(p, route, '.ui-datecard');
    assert.eq(await p.locator('.ui-datecard__x').count(), 0, route + ': no Clear while the card is empty'); assert.match(await p.locator('.ui-datecard__s').innerText(), /Any dates/);
    await p.fill('.ui-datecard [data-ui-dc="from"]', '2026-10-01'); await p.waitForTimeout(400);
    assert.match(await hashOf(p), /from=2026-10-01/, route + ': the date is in the address'); assert.eq(await p.locator('.ui-datecard__x').count(), 1, route + ': Clear appears'); assert.match(await p.locator('.ui-datecard__s').innerText(), /Oct 1.*any/i);
    assert.eq(await p.locator('.ui-datecard.is-set').count(), 1, route + ': the card shows it is in use');
    await p.fill('.ui-datecard [data-ui-dc="to"]', '2026-12-31'); await p.waitForTimeout(400); assert.match(await hashOf(p), /to=2026-12-31/);
    await p.locator('.ui-datecard__x').click(); await p.waitForTimeout(400);
    assert.noMatch(await hashOf(p), /from=|to=/, route + ': Clear removes both dates from the address'); assert.eq(await p.locator('.ui-datecard__x').count(), 0);
    assert.eq(await p.locator('.ui-datecard [data-ui-dc="from"]').inputValue(), ''); assert.eq(await p.locator('.ui-pager').count(), 1);
    void noun;
  }
  // Authorizations: Ends in 30 days is a mode (dates stay), typing a date drops it
  await go(p, 'Authorizations', '.ui-datecard');
  await p.getByRole('button', { name: 'Ends in 30 days', exact: true }).click(); await p.waitForTimeout(400); assert.match(await hashOf(p), /ends=30/); assert.eq(await p.getByRole('button', { name: 'Ends in 30 days', exact: true }).getAttribute('aria-pressed'), 'true');
  await p.fill('.ui-datecard [data-ui-dc="from"]', '2026-10-01'); await p.waitForTimeout(400); assert.noMatch(await hashOf(p), /ends=/, 'typing a date clears the Ends in chip'); assert.match(await hashOf(p), /from=2026-10-01/);
  await p.locator('.ui-datecard__x').click(); await p.waitForTimeout(300);
  // Denial Intelligence: a range chip sets both dates, pressing it again clears them
  await go(p, 'DenialIntelligence', '.ui-datecard');
  await p.getByRole('button', { name: 'This week', exact: true }).click(); await p.waitForTimeout(400); assert.match(await hashOf(p), /from=2026-10-26&to=2026-11-01/); assert.eq(await p.locator('.ui-datecard [data-ui-dc="from"]').inputValue(), '2026-10-26', 'the chip fills the dates');
  assert.eq(await p.getByRole('button', { name: 'This week', exact: true }).getAttribute('aria-pressed'), 'true');
  await p.getByRole('button', { name: 'This week', exact: true }).click(); await p.waitForTimeout(400); assert.noMatch(await hashOf(p), /from=/);
  // "Clear all filters" on both lists also empties the card
  await p.getByRole('button', { name: 'This week', exact: true }).click(); await p.waitForTimeout(300); await p.getByRole('button', { name: /Clear all filters/ }).click(); await p.waitForTimeout(400); assert.noMatch(await hashOf(p), /from=|to=/);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the two list pages share one page: header (title, maturity or info icon, card top right), one filter grid, one table style, the same cells, the pager at the foot', async () => {
  const p = await open('jperez'); const pages = {};
  for (const route of ['Authorizations', 'DenialIntelligence']) {
    await go(p, route, '.ui-qt__row'); const o = {};
    o.page = await p.$eval('main', m => m.className); assert.match(o.page, /ui-page/, route + ' uses the shared page');
    o.head = await p.$$eval('main > header.ui-phead h1', h => h.length); assert.eq(o.head, 1, route + ': one header with the title');
    o.info = await p.locator('main > header.ui-phead .ui-infobtn').count(); assert.eq(o.info, 1, route + ': the info icon beside the title');
    assert.eq(await p.locator('main > .ui-fcard.ui-fgrid > .ui-fbar').count(), 1, route + ': the filter card with the shared grid');
    o.grid = await css(p, '.ui-fgrid .ui-fbar', ['display', 'gridTemplateColumns', 'columnGap', 'rowGap']); assert.eq(o.grid.display, 'grid');
    o.cols = o.grid.gridTemplateColumns.split(' ').length; assert.eq(o.cols, 5, route + ': five columns at 1440 px');
    o.label = await css(p, '.ui-fsel__l', ['fontSize', 'fontWeight', 'color']); o.select = await css(p, '.ui-fgrid .ui-select', ['height', 'fontSize', 'borderRadius']); o.search = await css(p, '.ui-fgrid .ui-fsearch .ui-input', ['height', 'paddingLeft']);
    assert.eq(await p.locator('.ui-fgrid .ui-fsearch').count(), 1, route + ': one search box, first in the grid');
    o.fcard = await css(p, '.ui-fcard', ['borderRadius', 'paddingTop', 'backgroundColor']);
    assert.eq(await p.locator('main > .ui-tlist .ui-qt').count(), 1, route + ': the table in the shared list wrapper');
    o.th = await css(p, '.ui-qt__table th', ['fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'backgroundColor', 'textTransform']); o.td = await css(p, '.ui-qt__table td', ['paddingTop', 'paddingLeft', 'verticalAlign', 'fontSize']); o.tbl = await css(p, '.ui-qt__table', ['tableLayout']);
    o.chip = await css(p, '.ui-qt__row .ui-chip[data-status]', ['borderRadius', 'fontSize', 'fontWeight', 'paddingTop']);
    o.pager = await p.locator('.ui-pager select option').allInnerTexts(); assert.deepEq(o.pager, ['10', '25', '50', '100']);
    assert.ok((await p.locator('main').innerHTML()).indexOf('ui-pager') > (await p.locator('main').innerHTML()).indexOf('ui-qt__table'), route + ': the pager is under the table');
    o.dl = await p.locator('.ui-qt__row .ui-dlcell .ui-dateflag').count(); assert.ok(o.dl >= 3, route + ': the deadline cell is a dated flag: ' + o.dl);
    assert.ok(await p.locator('.ui-qt__row .ui-dlcell [data-verification]').count() >= 3, route + ': with its source icon');
    assert.ok(await p.locator('.ui-qt__row .ui-owner').count() >= 3, route + ': the owner cell is the shared one');
    o.hdr = await box(p, '.ui-phead'); pages[route] = o;
  }
  const a = pages.Authorizations, d = pages.DenialIntelligence;
  for (const k of ['grid', 'label', 'select', 'search', 'fcard', 'th', 'td', 'chip']) assert.deepEq(a[k], d[k], `the same ${k}: ${JSON.stringify(a[k])} vs ${JSON.stringify(d[k])}`);
  assert.deepEq(a.hdr.right, d.hdr.right, 'the header spans the same width'); assert.eq(a.tbl.tableLayout, d.tbl.tableLayout);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('empty states read the same: "Nothing matches" and "Clear a filter to see more." on both lists', async () => {
  const p = await open('jperez');
  for (const [route, q] of [['Authorizations', 'zzzz'], ['DenialIntelligence', 'zzzz']]) {
    await go(p, `${route}?q=${q}`, '.ui-empty'); assert.match(await p.locator('.ui-qt .ui-empty').innerText(), /Nothing matches/); assert.match(await p.locator('.ui-qt .ui-empty').innerText(), /Clear a filter/); assert.match(await p.locator('.ui-pager').innerText(), /No (authorizations|denials)/);
  }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('quiet labels are icons with a definition: the source icon shows its sentence on hover and on keyboard focus, and the visible table carries no source words', async () => {
  const p = await open('jperez');
  for (const route of ['Authorizations', 'DenialIntelligence']) {
    await go(p, route, '.ui-qt__row');
    assert.noMatch(await p.locator('tbody').innerText(), /Officially verified|Payer-specific|Harvest-reported|Unverified|window ended/i, route + ': the sources are icons');
    const ic = p.locator('.ui-qt__row [data-verification="payer"]').first(); assert.ok(await ic.count(), route + ': a Payer-specific icon'); assert.match(await ic.getAttribute('aria-label'), /Payer-specific/);
    const box1 = await ic.boundingBox(); assert.ok(box1.width >= 24 && box1.height >= 24, route + ': a 24 px target ' + box1.width + 'x' + box1.height);
    await ic.hover(); await p.waitForTimeout(200); const tip = ic.locator('xpath=ancestor::*[@data-ui-hint][1]').locator('.ui-hint__t'); assert.eq(await tip.getAttribute('data-on'), '1', route + ': the bubble shows on hover'); assert.match(await tip.innerText(), /Payer-specific/);
    await p.mouse.move(5, 5); await p.waitForTimeout(150); assert.eq(await tip.getAttribute('data-on'), null, 'and hides again');
    await ic.focus(); await p.waitForTimeout(150); assert.eq(await tip.getAttribute('data-on'), '1', route + ': the bubble shows on keyboard focus'); await p.keyboard.press('Escape'); await p.waitForTimeout(100); assert.eq(await tip.getAttribute('data-on'), null, 'Escape hides it');
  }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the case pages share the breadcrumb, the header card and the section card (same width, radius, padding, heading size)', async () => {
  const p = await open('jperez'); const out = {};
  for (const [k, hash, ready] of [['auth', 'Authorization?id=R-0402', '.ui-hcard'], ['di', 'DenialCase?id=R-0402', '.ui-hcard']]) {
    await go(p, hash, ready); const o = {};
    o.crumb = await p.$eval('.ui-crumb', e => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), fs: getComputedStyle(e).fontSize }; });
    o.h = await p.$eval('.ui-hcard', e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { left: Math.round(r.left), w: Math.round(r.width), br: c.borderRadius, pad: c.paddingLeft, bg: c.backgroundColor }; });
    o.h1 = await css(p, '.ui-hcard h1', ['fontSize', 'fontWeight']);
    o.s = await p.$eval('.ui-scard', e => { const c = getComputedStyle(e); return { br: c.borderRadius, pad: c.paddingLeft, bg: c.backgroundColor, border: c.borderTopColor }; });
    o.h2 = await css(p, '.ui-scard h2', ['fontSize', 'fontWeight']);
    o.owner = await p.locator('.ui-hcard .ui-owner').innerText(); assert.match(o.owner, /Owner[\s\S]*J\. Perez[\s\S]*Change/, k + ': the same owner line');
    assert.eq(await p.locator('.ui-hcard h1').count(), 1, k + ': one h1'); assert.eq(await p.locator('h1').count(), 1);
    assert.ok(await p.locator('.ui-hcard .ui-chip[data-status]').count() >= 1, k + ': the status chip is text');
    out[k] = o; await shot(p, 'case-' + k + '-1440');
  }
  assert.deepEq(out.auth.crumb, out.di.crumb, 'the breadcrumb sits in the same place'); assert.deepEq(out.auth.h, out.di.h, 'the header card has the same left, width, radius, padding, colour');
  for (const k of ['h1', 's', 'h2']) assert.deepEq(out.auth[k], out.di[k], 'the same ' + k);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('administrator and supervisor get the same shared pages with their own scope: the date card on both lists; the admin reads the lock icon, never clinical text', async () => {
  for (const user of ['dowens', 'cdiaz']) {
    const p = await open(user);
    for (const route of user === 'dowens' ? ['Authorizations', 'DenialIntelligence'] : ['Authorizations']) { await go(p, route, '.ui-datecard'); assert.eq(await p.locator('.ui-datecard').count(), 1, `${user} ${route}`); assert.ok(await p.locator('.ui-fgrid').count() === 1); }   // the site supervisor has no Denial Intelligence (unchanged)
    if (user === 'dowens') {
      await go(p, 'DenialCase?id=R-0408&section=weak', '.d-menu'); const labels = await p.$$eval('.ui-lockhint .ui-hint__b', bs => bs.map(b => b.getAttribute('aria-label'))); assert.ok(labels.some(l => /^Needs clinician/.test(l)), 'a lock icon: ' + labels.join('|'));
      assert.ok(!/Piedmont|physical aggression|hospitali/i.test(await p.evaluate(() => document.getElementById('root').textContent)), 'no clinical text in the page, hover text included');
      await go(p, 'Authorization?id=R-0408', '.ui-hcard'); const hidden = await p.$$eval('.ui-lockhint .ui-hint__b', bs => bs.map(b => b.getAttribute('aria-label'))); assert.ok(hidden.some(l => /Clinical text hidden for your role/.test(l)), 'the Evidence card says it with a lock icon: ' + hidden.join('|'));
      assert.noMatch(await p.locator('main').innerText(), /Clinical text hidden for your role/, 'not as visible words');
    }
    assert.deepEq(p.errs, [], user + ': ' + p.errs.join('|')); await p.ctx.close();
  }
});

await T.test('evidence missing: the Authorization evidence card shows one warning icon with a count and the items to verify; Denial Intelligence keeps the "Evidence missing — verify …" pills in its evidence list and drafts', async () => {
  const p = await open('jperez');
  await go(p, 'Authorization?id=R-0402', '.ui-hcard'); const mh = p.locator('#sec-evidence .ui-misshint .ui-hint__b'); assert.ok(await mh.count() >= 1, 'a missing-evidence icon'); assert.match(await mh.first().getAttribute('aria-label'), /evidence missing: /i); assert.match(await mh.first().innerText(), /^\d+$/, 'with its count');
  assert.eq(await p.locator('#sec-evidence .ui-evidence--missing').count(), 0, 'no pills in the Authorization evidence card');
  assert.ok(await p.locator('#sec-evidence .a-ass li').count() >= 1, 'the items to verify are listed');
  await go(p, 'DenialCase?id=R-0402&section=evidence', '.d-menu'); assert.match(await p.locator('#root').innerText(), /Evidence missing — verify previous treatment outcome/, 'the full pill stays where a person acts on it');
  await go(p, 'DenialCase?id=R-0402', '.d-menu'); await p.getByRole('link', { name: /^What Sentara said/ }).click(); await p.waitForTimeout(300); assert.match(await p.locator('#root').innerText(), /Evidence missing — verify the document reference/, 'Decision details keep the missing document reference as text');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('phone width 390: both list pages and both case pages have no horizontal page scroll; the date card, inputs and chips are at least 24 px', async () => {
  const p = await open('jperez', 390, 900);
  for (const hash of ['Authorizations', 'DenialIntelligence', 'Authorization?id=R-0402', 'DenialCase?id=R-0402']) {
    await go(p, hash, 'main h1'); const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); assert.ok(o.sw <= o.cw + 1, `${hash}: scroll width ${o.sw} > ${o.cw}`);
    if (/^(Authorizations|DenialIntelligence)$/.test(hash)) {
      const small = await p.$$eval('.ui-datecard input, .ui-datecard button, .ui-datecard .ui-hint__b', els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length); assert.eq(small, 0, hash + ': targets in the date card');
      const w = await p.$eval('.ui-datecard', e => Math.round(e.getBoundingClientRect().width)); assert.ok(w >= 330 && w <= 390, hash + ': the card fills the phone width: ' + w);
      assert.eq(await p.$eval('.ui-fgrid .ui-fbar', e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 2, hash + ': two filter columns on a phone');
    }
    await shot(p, hash.replace(/\W+/g, '-') + '-390');
  }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await browser.close();
await T.done();
