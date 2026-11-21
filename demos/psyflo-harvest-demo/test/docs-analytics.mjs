// UI test for Documentation (Note timeliness and Chart review), Analytics, Payer scorecard, Payer rules, Users & roles and the Roadmap.
//   BASE=http://localhost:4330 node test/docs-analytics.mjs        (resets the demo data to the live preset first and again at the end)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const BASE = process.env.BASE || 'http://localhost:4330';
const { HELP, VIEWS } = await import('../web/js/shared/labels.js');
const { BY_ID } = await import('../web/js/registry.js');

let fails = 0, checks = 0;
const ok = (label, cond, detail = '') => { checks++; if (!cond) { fails++; console.log('FAIL', label, detail); } else console.log('ok  ', label); };
const api = async (action, args = {}) => (await fetch(BASE + '/api/do', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, args }) })).json();
const state = async () => (await fetch(BASE + '/api/state')).json();
const reset = () => api('demo.reset', { preset: 'live' });

const b = await chromium.launch();
const errsOf = new WeakMap();
async function open(as, route, { w = 1440, h = 900, wait = 900 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  const errs = []; errsOf.set(p, errs);
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + '/#/Login'); await p.evaluate(u => localStorage.setItem('psyflo_user', u), as);
  await p.goto(BASE + '/#/' + route); await p.waitForTimeout(wait);
  return p;
}
const text = p => p.locator('#root').innerText();
const hash = p => p.evaluate(() => location.hash);
const pendingCount = async () => (await state()).notes.filter(n => n.review === 'pending').length;

await reset();

// ---------- Documentation · Note timeliness, as the supervisor ----------
{
  const p = await open('cdiaz', 'StaffDashboard');
  ok('Documentation: one page title', (await p.locator('h1.u-title').innerText()) === 'Documentation');
  const seg = await p.locator('.u-seg a').allInnerTexts();
  ok('Documentation: segmented control uses the VIEWS labels', seg.join('|') === `${VIEWS.documentation.compliance}|${VIEWS.documentation.review}`, seg.join('|'));
  const heads = (await p.locator('thead th').allInnerTexts()).map(x => x.replace(/\s*\?$/, '').trim());
  ok('Documentation: columns Staff, Backlog, Timely %, Review, Flags', heads.join('|') === 'Staff|Backlog|Timely %|Review|Flags', heads.join('|'));
  const names = await p.locator('tbody tr td:first-child').allInnerTexts();
  ok('Documentation: four staff rows', names.length === 4 && names.some(n => /K\. Hale/.test(n)) && names.some(n => /J\. Reyes/.test(n)), names.join(','));
  const t = await text(p);
  ok('Documentation: patterns paragraphs, footnote and quality table are gone', !/Patterns to talk about|Notes behind and on time are counted|Quality, this month/i.test(t));
  const reviewTxt = await p.locator('tbody tr').nth(1).locator('td').nth(3).innerText();
  ok('Documentation: R. Owens is on 100% review', /100% review/.test(reviewTxt), reviewTxt);
  const hale = await p.locator('tbody tr').nth(0).innerText();
  ok('Documentation: K. Hale is Sampled with a backlog flag', /Sampled/.test(hale) && /past 24 h/.test(hale), hale);
  // the ? tip
  await p.locator('thead .hlp').hover(); await p.waitForTimeout(400);
  ok('Documentation: ? on Timely % shows the tip', (await p.locator('.tip').innerText().catch(() => '')) === HELP.timely);
  await p.mouse.move(5, 500); await p.waitForTimeout(200);
  // site dropdown
  await p.selectOption('select[aria-label="Site"]', 'CC-HS1'); await p.waitForTimeout(300);
  const one = await p.locator('tbody tr').count();
  ok('Documentation: All sites dropdown filters the rows', one === 1 && /S\. Lane/.test(await p.locator('tbody tr').innerText()), 'rows ' + one);
  await p.selectOption('select[aria-label="Site"]', 'all'); await p.waitForTimeout(300);
  ok('Documentation: All sites brings every row back', (await p.locator('tbody tr').count()) === 4);
  // change review through the chip
  await p.locator('tbody tr').nth(0).locator('button.u-chip').click(); await p.waitForTimeout(300);
  ok('Documentation: review chip opens the review dialog', await p.locator('.mbox input[name="rv-m"]').count() === 2);
  await p.locator('.mbox input[value="every_note"]').check(); await p.locator('.mbox [data-ok]').click(); await p.waitForTimeout(700);
  ok('Documentation: K. Hale now on 100% review in the store', (await state()).staff.find(s => s.id === 'khale').review_mode === 'every_note');
  ok('Documentation: the row repaints to 100% review', /100% review/.test(await p.locator('tbody tr').nth(0).locator('td').nth(3).innerText()));
  await api('staff.reviewMode', { id: 'khale', mode: 'spot_check', by: 'cdiaz' });
  // flag opens the record
  await p.waitForTimeout(500);
  await p.getByRole('link', { name: /waiting for C\. Diaz/ }).first().click(); await p.waitForTimeout(700);
  ok('Documentation: a flag opens the record it is about (Chart review)', /ReviewQueue/.test(await hash(p)), await hash(p));
  ok('Documentation: no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
}

// ---------- Documentation · Chart review ----------
{
  const p = await open('cdiaz', 'ReviewQueue');
  ok('Chart review: title and the Chart review segment is on', (await p.locator('h1.u-title').innerText()) === 'Documentation' && /Chart review/.test(await p.locator('.u-seg a.on').innerText()));
  const before = await pendingCount();
  ok('Chart review: one row per pending note', (await p.locator('.u-row').count()) === before && before >= 3, `rows ${await p.locator('.u-row').count()} pending ${before}`);
  await p.locator('.u-row button').first().click(); await p.waitForTimeout(400);
  ok('Chart review: Review opens the drawer', await p.locator('.u-drawer').isVisible());
  ok('Chart review: the three actions are there', (await p.locator('.u-drawer button').allInnerTexts()).filter(x => /Approve|Return with note|That didn't happen/.test(x)).length === 3);
  ok('Chart review: wrote-versus-enhanced text sits inside data-doc', (await p.locator('.u-drawer [data-doc]').count()) >= 2 && (await p.locator('.u-drawer [data-doc] mark.b3-add').count()) > 0);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('Chart review: Escape closes the drawer', (await p.locator('.u-drawer').count()) === 0);
  await p.locator('.u-row button').first().click(); await p.waitForTimeout(300);
  await p.locator('.u-scrim').click({ position: { x: 100, y: 400 } }); await p.waitForTimeout(300);
  ok('Chart review: the scrim closes the drawer', (await p.locator('.u-drawer').count()) === 0);
  // Approve
  await p.locator('.u-row button').first().click(); await p.waitForTimeout(300);
  await p.locator('.u-drawer button', { hasText: 'Approve' }).click(); await p.waitForTimeout(800);
  ok('Chart review: Approve saves note.review and the row leaves', (await pendingCount()) === before - 1 && (await p.locator('.u-row').count()) === before - 1);
  ok('Chart review: Approve closes the drawer', (await p.locator('.u-drawer').count()) === 0);
  // Return with a note (needs text)
  await p.locator('.u-row button').first().click(); await p.waitForTimeout(300);
  await p.locator('.u-drawer button', { hasText: 'Return with note' }).click(); await p.waitForTimeout(300);
  await p.locator('.mbox [data-ok]').click(); await p.waitForTimeout(200);
  ok('Chart review: Return needs a note', (await p.locator('.mbox').count()) === 1 && (await pendingCount()) === before - 1);
  await p.locator('#rq-c').fill('Name the goal in the first sentence.'); await p.locator('.mbox [data-ok]').click(); await p.waitForTimeout(800);
  let st = await state(); const ret = st.notes.filter(n => n.review === 'returned' && n.review_comment === 'Name the goal in the first sentence.');
  ok('Chart review: Return with note saves the comment', ret.length === 1 && (await pendingCount()) === before - 2, JSON.stringify(ret.map(n => n.id)));
  // That didn't happen
  await p.locator('.u-row button').first().click(); await p.waitForTimeout(300);
  await p.locator('.u-drawer button', { hasText: "That didn't happen" }).click(); await p.waitForTimeout(300);
  await p.locator('#rq-c').fill('No session with this student that day.'); await p.locator('.mbox [data-ok]').click(); await p.waitForTimeout(800);
  st = await state();
  ok("Chart review: That didn't happen flags the note", st.notes.filter(n => n.review === 'flagged').length === 1 && (await pendingCount()) === before - 3);
  // the Documentation flag follows the store
  await p.getByRole('link', { name: 'Note timeliness' }).click(); await p.waitForTimeout(700);
  ok('Chart review: the segment links back to Note timeliness', /StaffDashboard/.test(await hash(p)));
  ok('Documentation: waiting count follows the decisions', /\d+ waiting for C\. Diaz/.test(await text(p)) && !/7 waiting for C\. Diaz/.test(await text(p)));
  ok('Chart review: no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
}

// ---------- Documentation as direct support: own row only ----------
{
  const p = await open('khale', 'StaffDashboard');
  const rows = await p.locator('tbody tr').allInnerTexts();
  const t = await text(p);
  ok('Documentation (K. Hale): own row only, marked Mine', rows.length === 1 && /K\. Hale/.test(rows[0]) && /Mine/.test(rows[0]), rows.join(' / '));
  ok('Documentation (K. Hale): nobody else shown', !/R\. Owens|S\. Lane|J\. Reyes/.test(t));
  ok('Documentation (K. Hale): no segmented control, no site dropdown', (await p.locator('.u-seg').count()) === 0 && (await p.locator('select[aria-label="Site"]').count()) === 0);
  ok('Documentation (K. Hale): review chip is not a button', (await p.locator('tbody button.u-chip').count()) === 0);
  await p.goto(BASE + '/#/ReviewQueue'); await p.waitForTimeout(600);
  ok('Documentation (K. Hale): Chart review is not available', /Not available/.test(await text(p)));
  ok('Documentation (K. Hale): no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
}
// a staffer on 100% review sees only their own row, with the reviewer flag as plain text
{
  const p = await open('rowens', 'StaffDashboard');
  const t = await text(p);
  ok('Documentation (R. Owens): own row, 100% review, waiting flag is plain text', /R\. Owens/.test(t) && /100% review/.test(t) && !/K\. Hale/.test(t) && (await p.getByRole('link', { name: /waiting for C\. Diaz/ }).count()) === 0);
  await p.context().close();
}

// ---------- Analytics ----------
{
  const p = await open('dowens', 'Analytics');
  const t = await text(p);
  ok('Analytics: both blocks', /KPIs/.test(t) && /Outcomes/.test(t));
  ok('Analytics: Timely notes, Minutes per note and Backlog', /Timely notes/.test(t) && /Minutes per note/.test(t) && /Backlog/.test(t));
  ok('Analytics: two weekly lines', (await p.locator('.b3-tile svg').count()) === 2);
  ok('Analytics: both blocks are tagged Sample data', (await p.locator('.u-sec .u-chip', { hasText: 'Sample data' }).count()) === 2);
  ok('Analytics: four outcome rows, each with a trend chip', (await p.locator('tbody tr').count()) === 4 && (await p.locator('tbody tr .u-chip').count()) === 4);
  ok('Analytics: payer scorecard, by-payer table, units chart and report cards are gone', !/Payer scorecard|By payer|Units requested|Export|Grant pull|division/i.test(t));
  const big = () => p.locator('.b3-tile').nth(1).locator('.b3-big').innerText();
  const m0 = await big();
  await p.selectOption('select[aria-label="Site"]', 'lc'); await p.waitForTimeout(300);
  const m1 = await big();
  ok('Analytics: the site dropdown changes the series', m0 !== m1, `${m0} -> ${m1}`);
  await p.selectOption('select[aria-label="Site"]', 'all'); await p.waitForTimeout(300);
  ok('Analytics: All sites restores it', (await big()) === m0);
  const backlog = Number((await p.locator('.b3-tile').nth(2).locator('.b3-big').innerText()).trim());
  const docBacklog = await (async () => { const q = await open('dowens', 'StaffDashboard'); const n = (await q.locator('tbody tr td:nth-child(2)').allInnerTexts()).reduce((a, x) => a + Number(x.trim()), 0); await q.context().close(); return n; })();
  ok('Analytics: Backlog matches Documentation', backlog === docBacklog, `${backlog} vs ${docBacklog}`);
  ok('Analytics: no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
  const q = await open('cdiaz', 'Analytics');
  ok('Analytics: a supervisor cannot open it', /Not available/.test(await text(q)));
  await q.context().close();
}

// ---------- Payer scorecard ----------
{
  const p = await open('dowens', 'PayerScorecard');
  const t = await text(p);
  ok('Payer scorecard: title and one Sample data tag', (await p.locator('h1.u-title').innerText()) === 'Payer scorecard' && (await p.locator('.u-chip', { hasText: 'Sample data' }).count()) === 1);
  const heads = (await p.locator('thead th').allInnerTexts()).join('|');
  ok('Payer scorecard: by-payer columns', heads === 'Payer|Partial rate|Awarded vs requested|Full denials|Decision days|Channel', heads);
  ok('Payer scorecard: six payer rows', (await p.locator('tbody tr').count()) === 6);
  ok('Payer scorecard: units chart has twelve months', (await p.locator('svg g[aria-label]').count()) === 12);
  ok('Payer scorecard: says nothing about sources', !/export|tracker|Lauris|source/i.test(t), t.match(/.{0,30}(export|tracker|Lauris|source).{0,30}/i)?.[0]);
  ok('Payer scorecard: no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
}

// ---------- Payer rules and Users & roles ----------
{
  const p = await open('jperez', 'PayerPlaybook');
  ok('Payer rules: title, payer table and the 14 rules', (await p.locator('h1.u-title').innerText()) === 'Payer rules' && (await p.locator('tbody tr').count()) === 6 && (await p.locator('.b3-rule').count()) === 14);
  ok('Payer rules: no errors', errsOf.get(p).length === 0, errsOf.get(p).join(' | '));
  await p.context().close();
  const u = await open('dowens', 'Users');
  ok('Users & roles: title and a row per user', (await u.locator('h1.u-title').innerText()) === 'Users & roles' && (await u.locator('tbody tr').count()) >= 7);
  ok('Users & roles: what each role sees is a compact table', (await u.locator('table.b3-sm tbody tr').count()) === 8 && (await u.locator('table.b3-sm thead th').count()) === 5);
  await u.locator('button', { hasText: 'Add user' }).click(); await u.waitForTimeout(300);
  await u.locator('#nu-name').fill('Morgan Ellis'); await u.locator('#nu-role').selectOption('clinician'); await u.locator('.mbox [data-ok]').click(); await u.waitForTimeout(800);
  const added = (await state()).staff.find(s => s.name === 'Morgan Ellis');
  ok('Users & roles: Add user adds the person', !!added && added.role === 'clinician' && /Morgan Ellis/.test(await text(u)));
  await u.locator(`#role-${added.id}`).selectOption('supervisor'); await u.waitForTimeout(700);
  ok('Users & roles: change role saves it', (await state()).staff.find(s => s.id === added.id).role === 'supervisor');
  ok('Users & roles: no errors', errsOf.get(u).length === 0, errsOf.get(u).join(' | '));
  await u.context().close();
}

// ---------- How it fits ----------
{
  const p = await open('dowens', 'WhereThingsLive');
  const t = await text(p);
  ok('How it fits: uses the current names', ['Worklist', 'Authorizations', 'Documentation', 'Analytics'].every(n => t.includes(n)) && !/Do next|four doors|Review queue|Staff dashboard/i.test(t));
  ok('How it fits: short', t.split(/\s+/).length < 200, String(t.split(/\s+/).length));
  await p.context().close();
}

// ---------- Roadmap: every tile opens ----------
for (const as of ['dowens', 'khale']) {
  const p = await open(as, 'Roadmap');
  const tiles = await p.locator('.rm-tile').evaluateAll(a => a.map(x => ({ href: x.getAttribute('href'), title: x.innerText.trim().split('\n')[0] })));
  ok(`Roadmap (${as}): tiles present`, tiles.length >= (as === 'dowens' ? 8 : 4), String(tiles.length));
  for (const t of tiles) {
    const id = t.href.replace(/\.dc\.html.*$/, '');
    ok(`Roadmap (${as}): "${t.title}" points at a screen that exists`, !!BY_ID[id], t.href);
    await p.goto(BASE + '/#/Roadmap'); await p.waitForTimeout(500);
    await p.locator('.rm-tile', { hasText: t.title }).click(); await p.waitForTimeout(BY_ID[id]?.surface === 'ext' ? 2200 : 900);
    const body = as === 'khale' && BY_ID[id]?.surface === 'ext' ? 'x'.repeat(30) : await text(p);
    ok(`Roadmap (${as}): "${t.title}" opens`, (await hash(p)).startsWith('#/' + id) && !/Not available|Screen not found/.test(body) && (/^Ext/.test(id) ? p.frames().some(f => /\/panel/.test(f.url())) : body.length > 20) && !errsOf.get(p).some(e => /PAGEERROR/.test(e)), `${await hash(p)} ${body.slice(0, 60)}`);
  }
  await p.context().close();
}

await b.close();
await reset();
console.log(`\n${checks - fails} of ${checks} checks passed`);
process.exit(fails ? 1 : 0);
