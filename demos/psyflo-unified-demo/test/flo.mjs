// FLO, the assistant (round Nov 12). The engine (web/js/shared/flo-engine.js) against each role's projected state: counts equal the selectors the
// screens use, no leakage across roles, clinical text refused, honest limits, links only to screens the role may open, never mutates.
// Then the drawer in a browser: opens from the top bar's `psyflo:topbar` event on every platform route, focus and keyboard, answers with a source
// line, history for the session, "New chat", read-only against /api/state, phone width.
import fs from 'node:fs';
import { suite, assert, api, state, reset, playwright, errors, login, session, BASE, SHOTS } from './lib/index.mjs';
import { floAsk, floSuggestions, floScope, floAvailable, STAGE_MEANING, FLO_NAME } from '../web/js/shared/flo-engine.js';
import { rosterRows, clientsInScope } from '../web/js/shared/sel/roster.js';
import { routeAllowed } from '../web/js/shared/permissions.js';
import * as M from '../web/js/shared/model.js';

const T = suite('flo');
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, designations: a.designations || u.designations || [], presenter: !!a.presenter, role: u.role } }; };
const ROLES = ['khale', 'cdiaz', 'jperez', 'dowens'];
const ASKS = ['Who is behind on notes?', 'Which notes are waiting for review?', 'Which authorizations are running low?', 'What are the deadlines this week?', 'Which denials are open?', 'How many patients do I have?', 'What does "Partial — decide" mean?',
  'Where does the 75% units flag come from?', 'What do the Dashboard icons mean?', 'intake forms due', 'tell me about M.R.', 'How many units does T.N. have left?'];
const labelsOf = r => { const out = []; const walk = c => { if (c == null) return; out.push(typeof c === 'string' ? c : c.t); }; for (const row of (r.table && r.table.rows) || []) walk(row[0]); return out; };

await reset('live');

// ------------------------------------------------------------------------------------------------ engine
await T.test('fail closed: no actor, a guardian and a school user get no answers; FLO exists for the four staff roles only', async () => {
  const { s } = await actorOf('jperez');
  for (const who of [null, undefined, { id: 'g', role: 'guardian' }, { id: 'x', role: 'school' }, { id: 'y', role: 'wizard' }]) { assert.ok(!floAvailable(who)); const r = floAsk(s, who, 'Who is behind on notes?'); assert.eq(r.kind, 'blocked'); assert.ok(!r.table); }
  for (const id of ROLES) assert.ok(floAvailable((await actorOf(id)).actor), id);
  assert.eq(FLO_NAME, 'FLO');
});
await T.test('counts equal the selectors the screens use: notes behind, notes in review, units flagged, patients, per role', async () => {
  for (const id of ROLES) {
    const { s, actor } = await actorOf(id); const rows = rosterRows(s, actor).rows;
    const behind = rows.reduce((n, r) => n + r.items.filter(i => i.kind === 'note' && i.sev === 'r').length, 0);
    const b = floAsk(s, actor, 'Who is behind on notes?'); assert.eq(b.kind, 'answer', id);
    if (behind) { assert.match(b.summary[0], new RegExp('^' + behind + ' notes? ')); assert.eq(b.table.rows.length, rows.filter(r => r.items.some(i => i.kind === 'note' && i.sev === 'r')).length, id + ' rows'); } else assert.match(b.summary[0], /Nothing is behind/);
    const rv = floAsk(s, actor, 'Which notes are waiting for review?'); const nrv = rosterRows(s, actor).counts.review;
    if (nrv) assert.eq(rv.table.rows.length, nrv, id + ' review rows'); else assert.match(rv.summary[0], /No notes/);
    const lo = floAsk(s, actor, 'Which authorizations are running low?'); const warn = rosterRows(s, actor, { units: 'warn' }).shown;
    if (warn) assert.eq(lo.table.rows.length, warn, id + ' flagged rows'); else assert.match(lo.summary[0], /No authorization/);
    const n = floAsk(s, actor, 'How many patients do I have?'); assert.match(n.summary[0], new RegExp('^' + rows.length + ' patients? ')); assert.eq(rows.length, clientsInScope(s, actor).length);
  }
});
await T.test('scope: direct support only hears about their own patients; every table row is a patient on the role\'s own roster', async () => {
  for (const id of ROLES) {
    const { s, actor } = await actorOf(id); const own = new Set(rosterRows(s, actor).rows.map(r => r.label));
    for (const q of ASKS.filter(q => !/T\.N|M\.R/.test(q))) { const r = floAsk(s, actor, q); if (r.intent === 'denials' || r.intent === 'rule' || r.intent === 'stage' || !r.table) continue; for (const l of labelsOf(r)) if (l) assert.ok(own.has(l), `${id} · "${q}" names ${l}, which is not on the roster`); }
  }
  const ds = await actorOf('khale'); const mine = new Set(rosterRows(ds.s, ds.actor).rows.map(r => r.id));
  assert.ok(mine.size >= 5 && [...mine].every(id => clientsInScope(ds.s, ds.actor).some(c => c.id === id)));
  const other = floAsk(ds.s, ds.actor, 'How many units does T.N. have left?'); assert.ok(!/0 of 65/.test(JSON.stringify(other)), 'T.N. is not on khale\'s caseload: nothing about T.N.');
  assert.match(floScope(ds.s, ds.actor), /^Your caseload · \d+ patients$/);
  const sup = await actorOf('cdiaz'); assert.match(floScope(sup.s, sup.actor), /manage/); const ad = await actorOf('dowens'); assert.match(floScope(ad.s, ad.actor), /no note text/);
});
await T.test('role limits: direct support has no denials and no intake forms; administrator is told note text is hidden by design', async () => {
  const ds = await actorOf('khale'); for (const q of ['Which denials are open?', 'intake forms due']) { const r = floAsk(ds.s, ds.actor, q); assert.eq(r.kind, 'blocked', q); assert.ok(!r.table, q); }
  const cl = await actorOf('jperez'); assert.eq(floAsk(cl.s, cl.actor, 'Which denials are open?').kind, 'answer'); assert.eq(floAsk(cl.s, cl.actor, 'Which denials are open?').table.rows.length, (cl.s.requests || []).filter(r => ['info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent'].includes(r.stage)).length);
  const ad = await actorOf('dowens'); const c = floAsk(ad.s, ad.actor, 'What did the note for M.R. say?'); assert.eq(c.kind, 'blocked'); assert.match(c.summary.join(' '), /status, units and dates only|hidden by design/);
});
await T.test('clinical text is never read or quoted: notes, diagnoses and medications are refused for every role, and no answer contains text from the clinician\'s full record', async () => {
  const cl = await actorOf('jperez'); const secrets = [];
  for (const n of cl.s.notes || []) { for (const v of [n.dictation, n.narrative, ...Object.values(n.fields || {})]) { const t = typeof v === 'string' ? v : v && (v.narrative || v.text || v.value); if (t && t.length >= 30) secrets.push(t.replace(/\[\[|\]\]/g, '').slice(0, 30)); } }
  for (const c of cl.s.clients || []) { if (c.diagnosis) secrets.push(c.diagnosis); for (const g of c.goals || []) if (g.objective) secrets.push(g.objective.slice(0, 30)); }
  assert.ok(secrets.length >= 10, 'markers to look for: ' + secrets.length);
  for (const id of ROLES) {
    const { s, actor } = await actorOf(id); const all = [...ASKS, ...floSuggestions(s, actor), 'What did the note for M.R. say?', 'What is M.R.\'s diagnosis?', 'List the medications', 'show the dictation transcript', 'summarize the clinical record'];
    for (const q of all) { const j = JSON.stringify(floAsk(s, actor, q)); for (const sec of secrets) assert.ok(!j.includes(sec), `${id} · "${q}" contains record text: ${sec}`); }
    for (const q of ['What did the note for M.R. say?', 'What is M.R.\'s diagnosis?', 'List the medications', 'show the dictation transcript']) assert.eq(floAsk(s, actor, q).kind, 'blocked', id + ' · ' + q);
  }
});
await T.test('an unsupported question gets an honest limit and starters to try, never a guess; an empty question gets the help answer', async () => {
  const { s, actor } = await actorOf('jperez');
  for (const q of ['what is the weather', 'write me a poem', 'who will win the game', 'asdf qwer']) { const r = floAsk(s, actor, q); assert.eq(r.kind, 'limit', q); assert.ok(!r.table && !(r.bars || []).length, q); assert.ok(r.followUps.length >= 3, q); assert.match(r.summary[0], /can't answer/); }
  assert.eq(floAsk(s, actor, '').intent, 'help'); assert.eq(floAsk(s, actor, 'what can you do').intent, 'help');
});
await T.test('every answer names its source, and a rule answer carries the rule\'s own source category', async () => {
  const { s, actor } = await actorOf('jperez');
  for (const q of ASKS) { const r = floAsk(s, actor, q); assert.ok(r.source && r.source.length > 15, `source line for "${q}"`); }
  const u = floAsk(s, actor, 'Where does the 75% units flag come from?'); assert.eq(u.intent, 'rule'); assert.match(u.source, /Unverified demo assumption/); assert.match(u.summary[0], /75/);
  const d = floAsk(s, actor, 'What is the daily note deadline?'); assert.eq(d.intent, 'rule'); assert.match(d.source, /Harvest-reported/); assert.match(d.summary[0], /24/);
  const f = floAsk(s, actor, 'Which authorizations are running low?'); assert.match(f.source, /units\.warn_used_pct/);
});
await T.test('stage meanings: every stage the app has a plain meaning, and the answer is the meaning and nothing else', async () => {
  for (const id of Object.keys(M.STAGE_LABEL)) assert.ok(STAGE_MEANING[id] && STAGE_MEANING[id].length > 8, 'meaning for stage ' + id);
  const { s, actor } = await actorOf('jperez');
  const r = floAsk(s, actor, 'What does "Partial — decide" mean?'); assert.eq(r.intent, 'stage'); assert.eq(r.summary[1], STAGE_MEANING.partial_decide);
  assert.eq(floAsk(s, actor, 'what is info requested').summary[1], STAGE_MEANING.info_requested); assert.eq(floAsk(s, actor, 'explain awaiting signature').summary[1], STAGE_MEANING.awaiting_signature);
});
await T.test('the Dashboard legend is read from the Dashboard\'s own icon map, so it cannot drift', async () => {
  const src = fs.readFileSync(new URL('../web/js/screens/Dashboard.js', import.meta.url), 'utf8'); const m = /const ALERT_ICON = \{([^}]*)\}/.exec(src); assert.ok(m, 'ALERT_ICON found');
  const icons = [...m[1].matchAll(/:\s*'([a-z]+)'/g)].map(x => x[1]); assert.ok(icons.length >= 6);
  const { s, actor } = await actorOf('jperez'); const lg = floAsk(s, actor, 'What do the Dashboard icons mean?'); assert.eq(lg.intent, 'legend');
  const keys = lg.legend.map(x => x.k.toLowerCase()); for (const ic of icons) assert.ok(keys.some(k => k.includes(ic.replace('alert', 'triangle'))), 'the legend names the ' + ic + ' icon');
});
await T.test('links go only to screens the role may open', async () => {
  for (const id of ROLES) {
    const { s, actor } = await actorOf(id);
    for (const q of [...ASKS, ...floSuggestions(s, actor)]) { const r = floAsk(s, actor, q); for (const l of r.links || []) { const route = /^#\/([A-Za-z]+)/.exec(l.to); assert.ok(route, l.to); assert.ok(routeAllowed(actor.role, route[1], actor), `${id} · "${q}" links to ${route[1]}, which this role may not open`); }
      for (const row of (r.table && r.table.rows) || []) for (const c of row) if (c && c.to) { const rt = /^#\/([A-Za-z]+)/.exec(c.to); assert.ok(routeAllowed(actor.role, rt[1], actor), `${id} · cell link to ${rt[1]}`); } }
  }
});
await T.test('read-only: asking anything never changes the state it is given', async () => {
  for (const id of ROLES) { const { s, actor } = await actorOf(id); const before = JSON.stringify(s); for (const q of [...ASKS, 'gibberish', 'flag M.R.', 'send the packet for K.T.', 'approve all notes', 'call the payer']) floAsk(s, actor, q); assert.ok(JSON.stringify(s) === before, id + ' state unchanged'); }
  const { s, actor } = await actorOf('jperez'); for (const q of ['send the packet for K.T.', 'approve all notes', 'call the payer']) { const r = floAsk(s, actor, q); assert.ok(!/\b(sent|approved|called|flagged)\b/i.test(r.summary[0]), 'FLO claims no action: ' + q + ' -> ' + r.summary[0]); }
});

// ------------------------------------------------------------------------------------------------ the drawer in a browser
const { chromium } = playwright(); const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  await login(page, user, { presenter: false });
  await page.goto(BASE + path); await page.reload();
  await page.waitForFunction(() => window.psyflo && psyflo.current && psyflo.current.id && !document.querySelector('#root .sh-loading') && document.querySelectorAll('#root h1').length >= 1, null, { timeout: 15000 });
  await page.waitForTimeout(300); return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
// the top bar button when the shell has one ([data-topbar="flo"]); the event it dispatches otherwise (same contract)
async function openFlo(page) {
  const btn = page.locator('[data-topbar="flo"]');
  if (await btn.count()) await btn.first().click(); else await page.evaluate(() => window.dispatchEvent(new CustomEvent('psyflo:topbar', { detail: { id: 'flo' } })));
  await page.waitForSelector('.flo-drawer #flo-in', { timeout: 5000 });
}
const ask = async (page, q) => { const n = await page.locator('.flo-m--f').count(); await page.fill('#flo-in', q); await page.keyboard.press('Enter'); await page.waitForFunction(k => document.querySelectorAll('.flo-m--f').length > k, n, { timeout: 5000 }); };
const ROUTES = {
  khale: ['Dashboard', 'Patient?id=MR'], cdiaz: ['Dashboard', 'Documentation', 'Authorizations', 'Analytics', 'Patient?id=MR'],
  jperez: ['Dashboard', 'Documentation', 'Authorizations', 'DenialIntelligence', 'Analytics', 'Referrals', 'Patient?id=MR'], dowens: ['Dashboard', 'Documentation', 'Authorizations', 'DenialIntelligence', 'Analytics', 'Settings']
};

try {
  for (const [who, routes] of Object.entries(ROUTES)) {
    await T.test(`${who}: FLO opens on every platform page the role can open (${routes.length}), focus lands in the input, Escape closes it, no console errors`, async () => {
      const p = await open(who, '/#/' + routes[0]);
      for (const r of routes) {
        await p.goto(BASE + '/#/' + r); await p.waitForFunction(id => psyflo.current && psyflo.current.id === id && !document.querySelector('#root .sh-loading'), r.split('?')[0], { timeout: 10000 }); await p.waitForTimeout(250);
        await openFlo(p);
        const st = await p.evaluate(() => ({ title: document.querySelector('.flo-drawer .ui-dialog__t').innerText.trim(), focus: document.activeElement && document.activeElement.id, label: !!document.querySelector('label[for="flo-in"]'), chip: (document.querySelector('.flo [data-flo-tag]') || {}).innerText, log: document.getElementById('flo-log').getAttribute('role'), live: document.getElementById('flo-log').getAttribute('aria-live'), modal: document.querySelector('.flo-drawer').getAttribute('aria-modal') }));
        assert.eq(st.title, 'FLO', r); assert.eq(st.focus, 'flo-in', r + ' focus'); assert.ok(st.label, r + ' label'); assert.match(st.chip, /Simulated/, r); assert.eq(st.log, 'log'); assert.eq(st.live, 'polite'); assert.eq(st.modal, 'true');
        await p.keyboard.press('Escape'); await p.waitForTimeout(150); assert.eq(await p.locator('.flo-drawer').count(), 0, r + ' closes on Escape');
      }
      assert.deepEq(fatal(p), [], 'console errors'); await done();
    });
  }
  await T.test('asking in the drawer: Enter sends, the answer has a summary, a table, links and a source line; a follow-up chip asks again; history survives closing and reopening; New chat clears', async () => {
    const p = await open('jperez', '/#/Dashboard'); await openFlo(p);
    assert.match(await p.locator('[data-flo-scope]').innerText(), /All patients · 19/); assert.ok((await p.locator('.flo-empty [data-flo="q"]').count()) >= 6, 'starter questions');
    await p.locator('.flo-empty [data-flo="q"]', { hasText: 'Who is behind on notes?' }).click(); await p.waitForSelector('.flo-m--f');
    const a = p.locator('.flo-m--f').first(); assert.match(await a.locator('.flo-sum').innerText(), /notes? (is|are) behind/); assert.ok(await a.locator('table.flo-t').count(), 'a table'); assert.ok(await a.locator('.flo-ln a').count(), 'a link'); assert.match(await a.locator('.flo-src').innerText(), /source/i); assert.ok(await a.locator('.flo-fu button').count(), 'follow-ups');
    await ask(p, 'Which authorizations are running low?'); assert.ok(await p.locator('.flo-bars').count(), 'bars for units'); assert.match(await p.locator('.flo-m--f').nth(1).locator('.flo-src').innerText(), /75/);
    await p.waitForTimeout(600); await p.screenshot({ path: SHOTS + '/flo-clinician-1440.png' });
    await p.keyboard.press('Escape'); await openFlo(p); assert.eq(await p.locator('.flo-m--f').count(), 2, 'the conversation is still there'); assert.eq(await p.locator('.flo-m--u').count(), 2);
    await p.locator('.flo-fu button').last().click(); await p.waitForFunction(() => document.querySelectorAll('.flo-m--f').length === 3); await p.click('[data-flo="new"]'); await p.waitForSelector('[data-flo-empty]'); assert.eq(await p.locator('.flo-m').count(), 0);
    assert.eq(await p.evaluate(() => document.activeElement.id), 'flo-in', 'focus stays in the input');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('a link in an answer opens its screen and closes the drawer', async () => {
    const p = await open('jperez', '/#/Dashboard'); await openFlo(p); await ask(p, 'Which notes are waiting for review?');
    await p.locator('.flo-ln a', { hasText: 'Documentation' }).first().click(); await p.waitForTimeout(500);
    assert.eq(await p.evaluate(() => psyflo.current.id), 'Documentation'); assert.match(await p.evaluate(() => location.hash), /status=pending_review/); assert.eq(await p.locator('.flo-drawer').count(), 0, 'drawer closed');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('read-only in the browser: asking questions (including "do this" requests) leaves /api/state exactly as it was', async () => {
    const before = await state('jperez'); const p = await open('jperez', '/#/Dashboard'); await openFlo(p);
    for (const q of ['Who is behind on notes?', 'Which denials are open?', 'flag M.R.', 'send the overdue notice for A.L.', 'approve every note']) await ask(p, q);
    const after = await state('jperez'); assert.eq(after.rev, before.rev, 'rev unchanged'); assert.eq(after.events.length, before.events.length, 'no audit event written'); assert.eq(JSON.stringify(after.requests), JSON.stringify(before.requests)); assert.eq(JSON.stringify(after.notes.map(n => n.review)), JSON.stringify(before.notes.map(n => n.review)));
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('direct support in the browser: own caseload only, denials answered as not part of the role', async () => {
    const p = await open('khale', '/#/Dashboard'); await openFlo(p);
    assert.match(await p.locator('[data-flo-scope]').innerText(), /^Your caseload/); const ds = await actorOf('khale'); const own = new Set(rosterRows(ds.s, ds.actor).rows.map(r => r.label));
    await ask(p, 'Which of my notes are behind?'); const names = await p.locator('.flo-m--f').last().locator('tbody th a').allInnerTexts(); assert.ok(names.length >= 1 && names.every(n => own.has(n.trim())), 'only own patients: ' + names);
    await ask(p, 'Which denials are open?'); assert.eq(await p.locator('.flo-m--f').last().getAttribute('data-kind'), 'blocked'); assert.ok(!(await p.locator('.flo-m--f').last().locator('table').count()));
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('administrator in the browser: units and status answered, note text refused, nothing from a note on the page', async () => {
    const cl = await actorOf('jperez'); const secret = ((cl.s.notes || []).map(n => [n.dictation, n.narrative].map(v => (typeof v === 'string' ? v : v && (v.narrative || v.text))).find(t => t && t.length >= 40)).find(Boolean) || '').slice(0, 40);
    const p = await open('dowens', '/#/Dashboard'); await openFlo(p);
    await ask(p, 'Which authorizations are running low?'); assert.ok(await p.locator('.flo-m--f').last().locator('table').count()); await ask(p, 'What did the note for M.R. say?'); assert.eq(await p.locator('.flo-m--f').last().getAttribute('data-kind'), 'blocked');
    await p.waitForTimeout(600); await p.screenshot({ path: SHOTS + '/flo-admin-1440.png' });
    if (secret) assert.ok(!(await p.evaluate(() => document.body.innerText)).includes(secret), 'no note text on the page');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('phone width (390 px): the drawer fits, the input and Send are reachable, tables scroll inside the answer, no sideways page scroll', async () => {
    const p = await open('cdiaz', '/#/Dashboard', { w: 390, h: 844 }); await openFlo(p); await ask(p, 'Who is behind on notes?');
    const g = await p.evaluate(() => { const d = document.querySelector('.flo-drawer').getBoundingClientRect(), i = document.getElementById('flo-in').getBoundingClientRect(), b = document.querySelector('.flo__form button').getBoundingClientRect(); return { dw: d.width, iw: innerWidth, sx: document.documentElement.scrollWidth, ib: Math.round(i.bottom), ih: innerHeight, bh: Math.round(b.height), bw: Math.round(b.width) }; });
    assert.ok(g.dw <= g.iw + 1, 'drawer fits: ' + JSON.stringify(g)); assert.ok(g.sx <= g.iw + 1, 'no horizontal page scroll'); assert.ok(g.ib <= g.ih, 'input on screen'); assert.ok(g.bh >= 24 && g.bw >= 24, 'Send target size');
    await p.waitForTimeout(600); await p.screenshot({ path: SHOTS + '/flo-supervisor-390.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
} finally { await done(); await browser.close(); }
const r = await T.done(); process.exit(r.fail ? 1 : 0);
