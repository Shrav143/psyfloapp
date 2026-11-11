// Errors (QA1-01): a failed state load is an ERROR the person can see and act on, never an empty "Nothing needs you right now".
// /api/state answering 500 or dropping, and a staff session that ended (401), must render an explicit error state (role=alert, a Retry button,
// or "Sign in again"); a failure after the screen has loaded keeps the last good data and says so; recovery repaints the real screen.
import { suite, assert, login, playwright, BASE } from './lib/index.mjs';

const T = suite('errors');
const { chromium } = playwright();
const browser = await chromium.launch();
const open = async who => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); page.pageErrors = []; page.on('pageerror', e => page.pageErrors.push(e.message));
  if (who) await login(page, who, { presenter: false });
  return { ctx, page };
};
const body = page => page.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').trim(), alert: [...document.querySelectorAll('[role=alert]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), retry: !!document.querySelector('#root [data-retry]'), signin: !!document.querySelector('#root [data-signin-again]'), h1: [...document.querySelectorAll('#root h1')].map(h => h.innerText.trim()), loading: /Loading the demo/.test(document.body.innerText) }));
const calm = /Nothing needs you right now/;

await T.test('/api/state answers 500 on load: an alert says the server cannot be reached, with Retry; never "Nothing needs you right now" or an endless "Loading"', async () => {
  const { ctx, page } = await open('jperez');
  try {
    await page.route('**/api/state', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"down"}' }));
    await page.goto('about:blank'); await page.goto(BASE + '/#/Dashboard'); await page.waitForSelector('#root [data-retry]', { timeout: 10000 });
    const t = await body(page);
    assert.ok(t.alert.some(a => /Can't reach the Psyflo server/.test(a)), 'alert: ' + JSON.stringify(t.alert));
    assert.ok(t.retry, 'a Retry button'); assert.ok(!calm.test(t.text), 'the calm empty state is not shown'); assert.ok(!t.loading, 'not stuck on Loading'); assert.eq(t.h1.length, 1, 'one h1: ' + t.h1);
    // Retry while it is still down: still the error; then the server comes back and Retry paints the real screen
    await page.click('#root [data-retry]'); await page.waitForTimeout(500); assert.ok((await body(page)).retry, 'still down: still an error with Retry');
    await page.unroute('**/api/state'); await page.click('#root [data-retry]'); await page.waitForFunction(() => !document.querySelector('#root [data-retry]') && document.querySelector('#root h1'), null, { timeout: 8000 });
    const ok = await body(page); assert.eq(ok.alert.filter(a => /Can't reach/.test(a)).length, 0); assert.ok(/My work|Today|To do/i.test(ok.text), 'the screen is back: ' + ok.text.slice(0, 120));
    assert.deepEq(page.pageErrors, [], 'no uncaught errors');
  } finally { await ctx.close(); }
});

await T.test('the server does not answer at all (the request is dropped): the same error state', async () => {
  const { ctx, page } = await open('jperez');
  try {
    await page.route('**/api/state', r => r.abort()); await page.route('**/api/roster', r => r.abort());
    await page.goto('about:blank'); await page.goto(BASE + '/#/Dashboard'); await page.waitForSelector('#root [data-retry]', { timeout: 10000 });
    const t = await body(page); assert.ok(t.alert.some(a => /Can't reach the Psyflo server/.test(a)), JSON.stringify(t.alert)); assert.ok(!calm.test(t.text));
  } finally { await ctx.close(); }
});

await T.test('the session ended (401): "Your session ended" with Sign in again, not an empty screen; Sign in again opens the sign-in screen', async () => {
  const { ctx, page } = await open(null);
  try {
    await page.goto(BASE + '/#/Login');
    await page.evaluate(() => { localStorage.setItem('psyflo_session', JSON.stringify({ token: 'not-a-live-token', actor: { kind: 'staff', id: 'jperez', role: 'clinician', name: 'Jordan Perez' } })); localStorage.setItem('psyflo_user', 'jperez'); });
    await page.goto(BASE + '/#/Dashboard'); await page.reload(); await page.waitForSelector('#root [data-signin-again]', { timeout: 10000 });
    const t = await body(page); assert.ok(t.alert.some(a => /Your session ended/.test(a)), JSON.stringify(t.alert)); assert.ok(!calm.test(t.text), 'no calm empty state');
    await page.click('#root [data-signin-again]'); await page.waitForFunction(() => /#\/Login/.test(location.hash) && document.querySelector('#root h1'), null, { timeout: 8000 });
    assert.ok(/Sign in|Who are you|Choose/i.test((await body(page)).text), 'the sign-in screen');
  } finally { await ctx.close(); }
});

await T.test('a failure after the screen loaded keeps the last good data and says so; when the server returns the screen is current again', async () => {
  const { ctx, page } = await open('jperez');
  try {
    await page.goto(BASE + '/#/Dashboard'); await page.waitForSelector('#root h1'); await page.waitForTimeout(600);
    const before = (await body(page)).text;
    await page.route('**/api/state', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
    await page.evaluate(async () => { const { api } = await import('/js/api.js'); await api.refresh(); });
    await page.waitForSelector('#toasts [role=alert], .ui-toast--err, [role=alert]', { timeout: 5000 }); await page.waitForTimeout(300);
    const mid = await body(page); assert.ok(mid.alert.some(a => /Can't reach the Psyflo server/.test(a)), 'announced: ' + JSON.stringify(mid.alert)); assert.ok(!mid.retry, 'the screen was not blanked');
    assert.ok(mid.h1.length >= 1 && !calm.test(mid.text) || calm.test(before), 'the last good screen stays');
    await page.unroute('**/api/state'); await page.evaluate(async () => { const { api } = await import('/js/api.js'); await api.refresh(); });
    assert.eq(await page.evaluate(async () => { const { api } = await import('/js/api.js'); return api.error; }), null, 'the error clears when a load succeeds');
    assert.deepEq(page.pageErrors, []);
  } finally { await ctx.close(); }
});

await T.test('a signed-out visitor is not shown an error: the sign-in screen loads from the public roster', async () => {
  const { ctx, page } = await open(null);
  try { await page.goto(BASE + '/#/Login'); await page.waitForSelector('#root h1'); const t = await body(page); assert.eq(t.retry, false); assert.eq(t.signin, false); assert.eq(t.alert.filter(a => /Can't reach|session ended/.test(a)).length, 0); } finally { await ctx.close(); }
});

await browser.close();
await T.done();
