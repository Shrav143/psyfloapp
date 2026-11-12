// R3 · Authorizations: flags, the notification system (the bell) and the History of an authorization.
// Standalone: `BASE=http://localhost:5200 node test/flags.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: a flag is workflow, not clinical (a reason from a short list; the free note is shown only to clinicians and its author); one open flag per
// request; raising and clearing are audit events with who and when; direct support cannot flag; notifications are computed from what a role may
// open, read state is per person, and nothing is sent to anybody; History tags every step with who did it and a person's own entry is audited.
import { suite, assert, api, tryApi, state, reset, session, login, playwright, errors, sleep, BASE } from './lib/index.mjs';
import { notificationsFor, unreadCount } from '../web/js/shared/sel/notify.js';
import { historyOf, authCase, authQueue, normalizeParams, FLAG_REASONS, HIST_ORDER } from '../web/js/shared/sel/auth.js';

const T = suite('flags');
const actor = async who => (await session(who)).actor;
const flagsOf = async (as = 'jperez') => (await state(as)).flags;
const realErrs = e => e.filter(x => !/Parent|MyWork|LANG_OFF/.test(x));

// ------------------------------------------------------------------ the store: request.flag
await reset('canvas');
await T.test('seed: two open flags and one cleared one, each with its audit event; the author sees the note, the administrator does not', async () => {
  const fl = await flagsOf('jperez'); assert.eq(fl.length, 3);
  assert.deepEq(fl.map(f => f.request + ':' + f.status).sort(), ['R-0384:cleared', 'R-0391:open', 'R-0402:open']);
  for (const f of fl) assert.ok(FLAG_REASONS.some(r => r[0] === f.reason), 'a reason from the list: ' + f.reason);
  const s = await state('jperez'); assert.ok(s.events.some(e => e.record === 'R-0402' && /^Flagged for attention · Needs a decision$/.test(e.what) && e.who === 'cdiaz'), 'the audit event says who and why, without the note');
  assert.ok(s.events.some(e => e.record === 'R-0384' && /^Flag cleared/.test(e.what) && e.who === 'jperez'));
  const admin = (await flagsOf('dowens')).find(f => f.request === 'R-0402'); assert.eq(admin.note, ''); assert.eq(admin.note_hidden, true, 'the note is hidden from an administrator');
  assert.match(admin.reason, /decision/, 'the reason is still shown');
  const clin = (await flagsOf('jperez')).find(f => f.request === 'R-0402'); assert.match(clin.note, /Who decides/, 'a clinician reads the note');
  const own = (await flagsOf('cdiaz')).find(f => f.request === 'R-0402'); assert.match(own.note, /Who decides/, 'the author reads their own note');
  const other = (await flagsOf('cdiaz')).find(f => f.request === 'R-0391'); assert.eq(other.note, '', 'a supervisor does not read a clinician\'s note'); assert.eq(other.note_hidden, true);
});
await T.test('direct support has no flags in the projection and cannot flag, clear or add history (403); a missing request is a 404', async () => {
  const s = await state('khale'); assert.eq(s.flags.length, 0); assert.deepEq(s.notify_read, {});
  await assert.refused(tryApi('request.flag', { id: 'R-0411', reason: 'decision' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('history.add', { id: 'R-0411', kind: 'note', text: 'hello there' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('request.flag', { id: 'R-9999', reason: 'decision' }, 'jperez'), /not in the tracker/, 404);
});
await T.test('flag: a reason from the list is required ("other" needs a note); one open flag per request; clear needs a flag; every step is audited with who and when', async () => {
  await assert.refused(tryApi('request.flag', { id: 'R-0411' }, 'cdiaz'), /Pick a reason/, 422);
  await assert.refused(tryApi('request.flag', { id: 'R-0411', reason: 'because' }, 'cdiaz'), /Pick a reason/, 422);
  await assert.refused(tryApi('request.flag', { id: 'R-0411', reason: 'other' }, 'cdiaz'), /Say what the flag is about/, 422);
  const r = await api('request.flag', { id: 'R-0411', reason: 'units', note: '  Only 27 units left,   renewal is next ' }, 'cdiaz'); assert.eq(r.flag.by, 'cdiaz'); assert.eq(r.flag.status, 'open'); assert.eq(r.flag.note, 'Only 27 units left, renewal is next');
  const j = await tryApi('request.flag', { id: 'R-0411', reason: 'decision' }, 'jperez'); await assert.refused(Promise.resolve(j), /already flagged by Carla Diaz/, 409); assert.eq(j.code, 'already_flagged');
  const s = await state('jperez'); const ev = s.events.filter(e => e.record === 'R-0411' && /Flagged for attention/.test(e.what)); assert.eq(ev.length, 1); assert.eq(ev[0].who, 'cdiaz'); assert.ok(ev[0].at && ev[0].kind === 'flag');
  assert.noMatch(ev[0].what, /27 units|renewal is next/, 'the note stays out of the audit text');
  await assert.refused(tryApi('request.flag', { id: 'R-0395', flag: false }, 'jperez'), /no open flag/, 409);
  await api('request.flag', { id: 'R-0411', flag: false }, 'jperez');   // anyone who works authorizations may clear it
  const s2 = await state('jperez'); const f = s2.flags.find(x => x.request === 'R-0411'); assert.eq(f.status, 'cleared'); assert.eq(f.cleared_by, 'jperez');
  assert.ok(s2.events.some(e => e.record === 'R-0411' && /^Flag cleared \(raised by Carla Diaz\)$/.test(e.what) && e.who === 'jperez'), 'clearing somebody else\'s flag says whose it was');
  await api('request.flag', { id: 'R-0411', reason: 'deadline' }, 'jperez');   // a cleared request can be flagged again
  assert.eq((await flagsOf('jperez')).filter(x => x.request === 'R-0411' && x.status === 'open').length, 1);
});
await T.test('the queue knows the flag: a Flagged status, the flag on the row, and nothing for a role that cannot open the queue', async () => {
  const s = await state('jperez'); const me = await actor('jperez');
  const q = authQueue(s, normalizeParams({ status: 'flagged' }), me); assert.deepEq(q.rows.map(r => r.id).sort(), ['R-0391', 'R-0402', 'R-0411']);
  const row = q.rows.find(r => r.id === 'R-0402'); assert.eq(row.flag.reasonLabel, 'Needs a decision'); assert.eq(row.flag.byShort, 'C. Diaz');
  assert.eq(authQueue(s, normalizeParams({}), me).counts.flagged, 3);
});

// ------------------------------------------------------------------ notifications (computed, per person, nothing is sent)
await reset('canvas');
await T.test('notifications: a flag raised by somebody else, payer items, deadlines and units; never your own flag; ids are stable', async () => {
  const s = await state('jperez'); const me = await actor('jperez');
  const n = notificationsFor(s, me); const ids = n.map(x => x.id);
  assert.ok(ids.includes('flag:fl-seed-1'), 'a flag raised by C. Diaz reaches J. Perez'); assert.ok(!ids.includes('flag:fl-seed-2'), 'their own flag is not a notification');
  assert.ok(n.some(x => x.kind === 'payer' && /Sentara offered 110 of 150/.test(x.title)) && n.some(x => x.kind === 'payer' && /overdue/.test(x.title)), 'payer items');
  assert.ok(n.some(x => x.kind === 'units' && /27 left|% of units used|units used/.test(x.title + x.sub)), 'units at the warning threshold');
  for (const x of n) assert.ok(x.id && x.title && x.to && ['r', 'y', 'n'].includes(x.sev) && x.group, 'shape ' + x.id);
  assert.deepEq(notificationsFor(s, me).map(x => x.id), ids, 'the same state gives the same ids in the same order');
  const urgent = n.findIndex(x => x.sev === 'r'), soon = n.findIndex(x => x.sev === 'y'); assert.ok(urgent === -1 || soon === -1 || n.filter(x => !x.read)[0].sev === 'r' || urgent < soon, 'urgent first among the unread');
});
await T.test('roles: direct support gets units and notes only (own patients), no payer or flag items; a role gets no item about a record it cannot open', async () => {
  const s = await state('khale'); const n = notificationsFor(s, await actor('khale'));
  assert.ok(n.every(x => ['units', 'note'].includes(x.kind)), 'direct support: ' + n.map(x => x.kind).join()); assert.ok(n.every(x => !/^payer:|^flag:|^deadline:/.test(x.id)));
  const own = new Set((s.clients || []).filter(c => c.staff === 'khale').map(c => c.id)); assert.ok(n.filter(x => x.kind === 'units').every(x => own.has(x.id.split(':')[1])), 'only their own patients\' units');
  assert.deepEq(notificationsFor(s, null), []);
  const admin = notificationsFor(await state('dowens'), await actor('dowens')); assert.ok(admin.some(x => x.kind === 'flag'), 'the administrator gets flags');
  assert.ok(admin.every(x => !/Who decides|Confirm the new initial/.test(x.title + x.sub)), 'an administrator never reads the free note');
});
await T.test('notify.read: per person, only ids the person has, "all" reads everything; a new situation is unread again; nobody else\'s list is visible; it is not an audit event', async () => {
  const before = await state('cdiaz'); const evN = before.events.length; const me = await actor('cdiaz');
  const u0 = unreadCount(before, me); assert.ok(u0 >= 3, 'unread at the start: ' + u0);
  const r = await api('notify.read', { ids: ['flag:fl-seed-1', 'not-a-real-id'] }, 'cdiaz'); assert.eq(r.read, 0, 'fl-seed-1 is cdiaz\'s own flag: not a notification, nothing to read');
  const first = notificationsFor(before, me).find(x => !x.read); const r2 = await api('notify.read', { ids: [first.id, 'bogus'] }, 'cdiaz'); assert.eq(r2.read, 1);
  const mid = await state('cdiaz'); assert.eq(unreadCount(mid, me), u0 - 1); assert.eq(mid.events.length, evN, 'reading is not an audit event');
  assert.deepEq(Object.keys(mid.notify_read), ['cdiaz'], 'only my own list is in my projection'); assert.deepEq(Object.keys((await state('jperez')).notify_read), [], 'J. Perez has read nothing and sees nobody else\'s list');
  await api('notify.read', { all: true }, 'cdiaz'); assert.eq(unreadCount(await state('cdiaz'), me), 0);
  await api('request.flag', { id: 'R-0395', reason: 'documents' }, 'jperez');
  const after = await state('cdiaz'); assert.eq(unreadCount(after, me), 1, 'a new flag by somebody else is unread for C. Diaz'); assert.eq(unreadCount(await state('jperez'), await actor('jperez')) >= 1, true);
  await assert.refused(tryApi('notify.read', { all: true }, null), /sign in|not allowed|session/i);
});
await T.test('a state change on the same record is a new notification: the payer reply moves R-0402 from "offered" to something else', async () => {
  await reset('canvas'); const me = await actor('jperez'); const ids0 = notificationsFor(await state('jperez'), me).map(x => x.id).filter(x => /R-0402/.test(x));
  assert.ok(ids0.some(x => /partial/.test(x)), 'the offer: ' + ids0.join());
  await api('notify.read', { all: true }, 'jperez'); assert.eq(unreadCount(await state('jperez'), me), 0);
  await api('request.partialChoice', { id: 'R-0402', choice: 'stretch', plan: { per_week: 5, until: '2027-01-30' } }, 'jperez');
  const s = await state('jperez'); assert.ok(notificationsFor(s, me).every(x => !/payer:R-0402:partial/.test(x.id)), 'the offer is decided: no longer a payer item');
});

// ------------------------------------------------------------------ History
await reset('canvas');
await T.test('history: every step has an actor kind from the artifact\'s six; Sfax is the Psyflo agent (simulated), a payer call recorded by staff is Payer, Lauris reads are From Lauris; no upcoming or clock rows', async () => {
  const s = await state('jperez'); const me = await actor('jperez');
  const h399 = historyOf(s, s.requests.find(r => r.id === 'R-0399'), me); for (const e of h399.events) assert.ok(HIST_ORDER.includes(e.kind), e.kind);
  const rc = h399.events.find(e => /Simulated delivery receipt/.test(e.action)); assert.eq(rc.kind, 'agent'); assert.eq(rc.sim, true);
  const h402 = historyOf(s, s.requests.find(r => r.id === 'R-0402'), me); assert.eq(h402.events.find(e => /^Sentara called/.test(e.action)).kind, 'payer'); assert.ok(h402.events.some(e => e.kind === 'staff' && /Send pressed/.test(e.action)));
  const h411 = historyOf(s, s.requests.find(r => r.id === 'R-0411'), me); assert.deepEq(h411.events.map(e => e.kind).sort(), ['lauris', 'psyflo'], 'the draft request has a backdated history');
  for (const r of s.requests) for (const e of historyOf(s, r, me).events) assert.ok(!/^Upcoming/.test(e.action) && !/Follow-up call on the decision|Decision window ends/.test(e.action), 'no schedule rows in History: ' + e.action);
  assert.eq(h399.total, h399.events.length); assert.eq(Object.values(h399.counts).reduce((a, b) => a + b, 0), h399.total);
  const c = authCase(s, 'R-0402', me); assert.eq(c.flag.reasonLabel, 'Needs a decision'); assert.eq(c.caps.flag, true); assert.eq(c.history.total, h402.total);
});
await T.test('history: a voice-agent event (Denial Intelligence logs these) is tagged Voice agent and Simulated, in any role\'s History', async () => {
  const s = JSON.parse(JSON.stringify(await state('jperez'))); s.events.push({ at: '2026-10-28T10:00', what: 'Voice agent called Sentara · asked for the decision status', who: 'Psyflo voice agent', record: 'R-0402', actor_kind: 'voice', sim: true });
  const h = historyOf(s, s.requests.find(r => r.id === 'R-0402'), await actor('jperez')); const v = h.events.find(e => /^Voice agent called/.test(e.action)); assert.ok(v, 'the row is there'); assert.eq(v.kind, 'voice'); assert.eq(v.sim, true); assert.eq(h.counts.voice, 1);
});
await T.test('history.add: a person\'s own entry (call, note, document, payer contact) is an audit event with who and when and sends nothing; short text and unknown kinds are refused', async () => {
  await assert.refused(tryApi('history.add', { id: 'R-0402', kind: 'note', text: 'x' }, 'cdiaz'), /Write what happened/, 422);
  await assert.refused(tryApi('history.add', { id: 'R-0402', kind: 'email', text: 'sent them a note' }, 'cdiaz'), /Pick call, note/, 422);
  await assert.refused(tryApi('history.add', { id: 'R-9999', kind: 'note', text: 'sent them a note' }, 'cdiaz'), /not in the tracker/, 404);
  await api('history.add', { id: 'R-0402', kind: 'call', text: 'Left a message with the payer intake line' }, 'cdiaz');
  const s = await state('cdiaz'); const ev = s.events.find(e => e.record === 'R-0402' && /^Call logged · Left a message/.test(e.what)); assert.ok(ev && ev.who === 'cdiaz' && ev.actor_kind === 'person' && ev.sim === false);
  const h = historyOf(s, s.requests.find(r => r.id === 'R-0402'), await actor('cdiaz')); const row = h.events.find(e => /^Call logged/.test(e.action)); assert.eq(row.kind, 'staff'); assert.eq(row.name, 'C. Diaz'); assert.match(row.popKind, /Call/);
  const admin = historyOf(await state('dowens'), (await state('dowens')).requests.find(r => r.id === 'R-0402'), await actor('dowens'));
  assert.ok(admin.events.every(e => !/Who decides|"[^"]{3,}"/.test(e.action + e.detail) || /…/.test(e.action + e.detail)), 'quoted text stays masked for an administrator');
});

// ------------------------------------------------------------------ the screens
const { chromium } = playwright(); const b = await chromium.launch();
const mk = async (as, w = 1440, h = 900) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
try {
  await T.test('list: a flag button on every row, the flag dialog needs a reason, the row shows the flag and its reason, the other person sees it in the bell; the Flagged status filters', async () => {
    await reset('canvas'); const a = await mk('jperez'); const p = a.p; await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900);
    const nReq = (await state('jperez')).requests.length; assert.eq(await p.locator('tbody [data-flag]').count(), nReq, 'one flag button per row');
    const kt = p.locator('tbody tr[data-ui-row]', { hasText: 'K.T.' });
    assert.eq(await kt.locator('[data-flag]').getAttribute('aria-pressed'), 'false'); await kt.locator('[data-flag]').click(); await p.waitForSelector('.ui-dialog');
    const reasons = await p.locator('#a-fl-r option').allInnerTexts(); assert.deepEq(reasons, FLAG_REASONS.map(x => x[1]));
    await p.selectOption('#a-fl-r', 'other'); await p.getByRole('dialog').getByRole('button', { name: 'Flag it' }).click(); await p.waitForTimeout(300);
    assert.ok((await flagsOf()).every(f => f.request !== 'R-0408'), '"Other" without a note is not saved'); assert.ok(await p.getByRole('dialog').count(), 'the dialog stays open');
    await p.selectOption('#a-fl-r', 'payer'); await p.fill('#a-fl-n', 'Ask intake about the reply window');
    await p.getByRole('dialog').getByRole('button', { name: 'Flag it' }).click(); await p.waitForTimeout(900);
    assert.eq(await p.getByRole('dialog').count(), 0, 'closed'); const f = (await flagsOf()).find(x => x.request === 'R-0408'); assert.eq(f.by, 'jperez'); assert.eq(f.reason, 'payer');
    assert.eq(await kt.locator('[data-flag]').getAttribute('aria-pressed'), 'true'); assert.match(await kt.locator('.a-c-next').innerText(), /Payer follow-up needed/, 'the row names the reason');
    await p.selectOption('select[data-key="status"]', 'flagged'); await p.waitForTimeout(400); const shown = (await p.locator('tbody tr[data-ui-row]').allInnerTexts()).map(x => x.split('\n')[0]).join();
    assert.eq(await p.locator('tbody tr[data-ui-row]').count(), 3, 'flagged rows: ' + shown); assert.match(await p.evaluate(() => location.hash), /status=flagged/);
    await p.context().close();
    const sup = await mk('cdiaz'); await sup.p.goto(BASE + '/#/Authorizations'); await sup.p.waitForTimeout(900);
    await sup.p.locator('[data-topbar="bell"]').click(); await sup.p.waitForSelector('.bell'); await sleep(400);
    assert.match(await sup.p.locator('.bell').innerText(), /J\. Perez flagged K\.T\./); assert.match(await sup.p.locator('.bell').innerText(), /Payer follow-up needed/);
    assert.noMatch(await sup.p.locator('.bell').innerText(), /Ask intake about the reply window/, 'the supervisor does not read a clinician\'s note');
    assert.deepEq(realErrs(a.errs.concat(sup.errs)).filter(x => !/DenialIntelligence|DenialCase/.test(x)), []); await sup.p.context().close();
  });
  await T.test('bell: unread number on the top bar, a drawer grouped by Flags / Payer / Deadlines / Units, Mark read and Mark all read are per person, an item opens its record and reads it; keyboard: Escape closes and focus returns', async () => {
    await reset('canvas'); const { p, errs } = await mk('cdiaz'); await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900);
    const bell = p.locator('[data-topbar="bell"]'); const n0 = await state('cdiaz').then(async s => unreadCount(s, await actor('cdiaz')));
    assert.match(await bell.getAttribute('aria-label'), new RegExp(`${n0} unread`)); assert.match(await p.locator('.sh-top__dot').innerText(), n0 > 9 ? /9\+/ : new RegExp('^' + n0 + '$'));
    await bell.click(); await p.waitForSelector('.bell'); await sleep(400);
    const groups = await p.locator('.bell__g').allInnerTexts(); assert.ok(groups.some(g => /^Flags/.test(g)) && groups.some(g => /^Payer/.test(g)), groups.join());
    assert.match(await p.locator('.bell__sum').first().innerText(), new RegExp(`${n0} unread of`));
    await p.locator('.bell__i.is-unread').first().getByRole('button', { name: /Mark as read/ }).click(); await p.waitForTimeout(600);
    assert.match(await p.locator('.bell__sum').first().innerText(), new RegExp(`${n0 - 1} unread of`)); assert.eq((await state('cdiaz')).notify_read.cdiaz.length >= 2, true);
    await p.locator('.bell__i.is-unread a.bell__t').first().click(); await p.waitForTimeout(900);
    assert.eq(await p.locator('.bell').count(), 0, 'opening an item closes the drawer'); assert.match(await p.evaluate(() => location.hash), /^#\/(Authorization|DenialCase|Patient)/);
    await bell.click(); await p.waitForSelector('.bell'); await sleep(300); await p.getByRole('button', { name: 'Mark all read' }).click(); await p.waitForTimeout(600);
    assert.match(await p.locator('.bell__sum').first().innerText(), /^All \d+ read/); assert.ok(await p.locator('.sh-top__dot').isHidden(), 'the number leaves the bell');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); assert.eq(await p.locator('.bell').count(), 0); assert.eq(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-topbar')), 'bell', 'focus returns to the bell');
    assert.deepEq(realErrs(errs).filter(x => !/DenialIntelligence|DenialCase/.test(x)), []); await p.context().close();
  });
  await T.test('bell for direct support: only their own patients (units, notes sent back), no payer or flag items, and no route to Authorizations', async () => {
    await reset('canvas'); const { p, errs } = await mk('khale'); await p.goto(BASE + '/#/Dashboard'); await p.waitForTimeout(900);
    await p.locator('[data-topbar="bell"]').click(); await p.waitForSelector('.bell, .bell__e'); await sleep(300);
    const t = await p.locator('.ui-dialog').innerText(); assert.noMatch(t, /flagged|Humana|Sentara|Anthem|Aetna|decision|peer-to-peer/i, t.slice(0, 200));
    await p.keyboard.press('Escape'); await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900);
    assert.ok(!/Authorization period/.test(await p.locator('#root').innerText()), 'direct support does not get the queue');
    assert.deepEq(realErrs(errs).filter(x => !/DenialIntelligence|DenialCase/.test(x)), []); await p.context().close();
  });
  await T.test('case page: the flag banner and the flag button open the same dialog; clearing is one click and lands in History; a supervisor may clear a clinician\'s flag', async () => {
    await reset('canvas'); const { p, errs } = await mk('cdiaz'); await p.goto(BASE + '/#/Authorization?id=R-0391'); await p.waitForTimeout(900);
    const ban = await p.locator('#a-fban').innerText(); assert.match(ban, /Flagged for attention/); assert.match(ban, /Waiting on the family/); assert.match(ban, /J\. Perez|Jordan Perez/); assert.noMatch(ban, /Confirm the new initial/, 'the note is not shown to a supervisor');
    assert.eq(await p.locator('.ui-hcard [data-flag]').getAttribute('aria-pressed'), 'true');
    await p.locator('.ui-hcard [data-flag]').click(); await p.waitForSelector('.ui-dialog'); assert.match(await p.locator('.ui-dialog').innerText(), /Visible to clinicians and its author/);
    await p.getByRole('dialog').getByRole('button', { name: 'Keep the flag' }).click(); await p.waitForTimeout(300);
    await p.locator('#a-fban [data-flag]').click(); await p.getByRole('dialog').getByRole('button', { name: 'Clear flag' }).click(); await p.waitForTimeout(900);
    assert.eq(await p.locator('#a-fban').count(), 0, 'the banner is gone'); assert.eq((await flagsOf('cdiaz')).find(f => f.request === 'R-0391').status, 'cleared');
    assert.match(await p.locator('.hx__r').first().innerText(), /Flag cleared/); assert.match(await p.locator('.hx__r').first().innerText(), /Staff · C\. Diaz/);
    assert.eq(await p.locator('.ui-hcard [data-flag]').getAttribute('aria-pressed'), 'false');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('case page History: actor tags, a filter by who with counts, a pop-up per row, Add to history; the Simulated chip on stub steps', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez'); await p.goto(BASE + '/#/Authorization?id=R-0399'); await p.waitForTimeout(900);
    const total = await p.locator('.hx__r').count(); assert.ok(total >= 4, 'rows ' + total);
    assert.match(await p.locator('.hx__n').innerText(), new RegExp(`${total} events`)); assert.ok(await p.locator('.hx__r', { hasText: 'Simulated' }).locator('.hx__g.k-agent').count() >= 1, 'the Sfax receipt is the Psyflo agent and says Simulated');
    const chips = await p.locator('.hx__c').allInnerTexts(); assert.match(chips[0], new RegExp('^All\\s*' + total)); assert.ok(chips.some(c => /^Staff/.test(c)) && chips.some(c => /^Psyflo agent/.test(c)));
    await p.locator('.hx__c', { hasText: /^Psyflo agent/ }).click(); await p.waitForTimeout(300);
    assert.ok(await p.locator('.hx__r').count() < total, 'filtered'); assert.eq(await p.locator('.hx__r .hx__g:not(.k-agent)').count(), 0, 'only the Psyflo agent'); assert.eq(await p.locator('.hx__c[aria-pressed="true"]').count(), 1);
    await p.locator('.hx__c', { hasText: /^All/ }).click(); await p.waitForTimeout(300); assert.eq(await p.locator('.hx__r').count(), total);
    await p.locator('.hx__r').first().focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.ui-dialog'); assert.match(await p.locator('.ui-dialog').innerText(), /What[\s\S]*When[\s\S]*Who/); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.getByRole('button', { name: /Add to history/ }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click(); await p.waitForTimeout(300);
    assert.ok(await p.getByRole('dialog').count(), 'an empty entry is refused'); await p.selectOption('#a-h-k', 'payer'); await p.fill('#a-h-t', 'Humana intake says the packet is in review');
    await p.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click(); await p.waitForTimeout(900);
    assert.eq(await p.locator('.hx__r').count(), total + 1); assert.match(await p.locator('.hx__r').first().innerText(), /Payer contact/); assert.ok(await p.locator('.hx__r').first().locator('.hx__g.k-payer').count(), 'a payer contact is tagged Payer (the artifact tags what the payer said, recorded by staff)');
    await p.locator('.hx__r').first().click(); await p.waitForSelector('.ui-dialog'); assert.match(await p.locator('.ui-dialog').innerText(), /J\. Perez/, 'the pop-up says who recorded it'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    assert.ok((await state('jperez')).events.some(e => e.record === 'R-0399' && /^Payer contact · Humana intake says/.test(e.what) && e.who === 'jperez'), 'audited');
    await p.screenshot({ path: process.env.SHOTS ? process.env.SHOTS + '/authorization-history-1440.png' : undefined, fullPage: true }).catch(() => { });
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('phone width 390: the list, the case page and the bell have no horizontal page scroll; flag and history targets are at least 24 px', async () => {
    await reset('canvas'); const { p, errs } = await mk('cdiaz', 390, 844);
    for (const h of ['/#/Authorizations', '/#/Authorization?id=R-0402']) {
      await p.goto(BASE + h); await p.waitForTimeout(900);
      const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); assert.ok(w.sw <= w.cw + 1, `${h}: no horizontal page scroll ${w.sw} > ${w.cw}`);
      const small = await p.evaluate(() => [...document.querySelectorAll('[data-flag], .hx__c, .hx__r, [data-x="hist-add"]')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(r => r.width < 24 || r.height < 24).length); assert.eq(small, 0, 'targets under 24 px');
    }
    await p.locator('[data-topbar="bell"]').click(); await p.waitForSelector('.bell'); await sleep(400);
    const w2 = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); assert.ok(w2.sw <= w2.cw + 1, 'the bell drawer fits');
    assert.deepEq(realErrs(errs).filter(x => !/DenialIntelligence|DenialCase/.test(x)), []); await p.context().close();
  });
} finally { await b.close(); }
await T.done();
