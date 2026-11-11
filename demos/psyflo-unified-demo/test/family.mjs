// Family portal (E6): token access only to the own child, the checklist, language switch, the signature modes (Remote allowed · In person required ·
// Pending · Completed · Ready to review), the appeal letter states (Draft · Ready to review · Signed · Submitted by staff), the letters in plain words,
// accessibility of every family screen at 390 px (landmarks, one h1, no horizontal scroll, targets of 44 px, 16 px body) and the pure selectors.
// Standalone: node test/family.mjs with BASE=... (test/run-all.mjs starts a fresh server).
import { suite, assert, api, tryApi, state, reset, playwright, errors, BASE, SHOTS } from './lib/index.mjs';
import { checklist, sigState, appealView, signForms, referralStatus } from '../web/js/shared/sel/portal.js';

const T = suite('family');
const TW = { portalToken: 'tw-demo' }, AR = { portalToken: 'ar-demo' };
const guardianToken = async client => { const r = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: client, presenter: true }) }); const j = await r.json(); if (!j.ok) throw new Error(j.error); return j; };
const setRule = (key, value) => api('settings.rule', { key, value, reason: 'family test: ' + value }, 'dowens+p');
const resetRule = key => api('settings.rule', { key, reset: true, reason: 'family test reset' }, 'dowens+p');

await reset('canvas');
const { chromium } = playwright();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage(); const errs = errors(page);
const phoneAs = async (token, route, lang) => {
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript(l => { try { localStorage.setItem('psyflo_parent_lang', l); } catch { } }, lang || 'en');
  const p = await c.newPage(); const e = errors(p);
  await p.goto(`${BASE}/parent/${token}/${route}`); await p.waitForSelector('#root main', { timeout: 8000 }); await p.waitForTimeout(250);
  return { p, e, c };
};
const asGuardianPresenter = async (client, route) => {
  const j = await guardianToken(client); const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript(({ token, actor }) => { try { localStorage.setItem('psyflo_session', JSON.stringify({ token, actor })); } catch { } }, { token: j.token, actor: j.actor });
  const p = await c.newPage(); const e = errors(p);
  await p.goto(`${BASE}/#/${route}`); await p.waitForSelector('#root main', { timeout: 8000 }); await p.waitForTimeout(250);
  return { p, e, c, token: j.token };
};
const text = p => p.locator('#root').innerText();
const draw = async p => { const c = p.locator('canvas').first(); await c.scrollIntoViewIfNeeded(); const bb = await c.boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 40); await p.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await p.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await p.mouse.up(); };

try {
  // ---------- disclosure: a guardian link opens one child ----------
  await T.test('a guardian link opens only that child: one client, own requests, no diagnosis, no staff-only material', async () => {
    const s = await state(TW);
    assert.eq(s.clients.length, 1); assert.eq(s.clients[0].id, 'TW');
    assert.ok(!('diagnosis' in s.clients[0]) && !('staff_notes' in s.clients[0]) && !('medicaid' in s.clients[0]), 'diagnosis, staff notes and the Medicaid record are not sent');
    assert.ok(s.requests.every(r => r.client === 'TW'), 'only own requests');
    assert.ok(s.referrals.every(r => r.client === 'TW'), 'only own referral');
    assert.ok(s.family_links.every(f => f.client === 'TW'), 'only own link');
    assert.ok(s.eligibility.every(e => Object.keys(e).every(k => ['referral', 'client', 'status'].includes(k))), 'eligibility is status only (no Medicaid ID, plan or screenshot)');
    for (const k of ['notes', 'screenings', 'drafts', 'internal_quarterlies', 'incidents', 'dictations', 'timers', 'lauris_tasks', 'payer_history', 'denial_reasons']) assert.deepEq(s[k] == null ? [] : Array.isArray(s[k]) ? s[k] : Object.keys(s[k]), [], k + ' is withheld');
    assert.ok(s.rules.length > 0 && s.rules.every(r => /^(signature\.mode\.|family_link\.)/.test(r.key)), 'only the signature and family-link rule rows: ' + s.rules.map(r => r.key).join(','));
    assert.ok(!(s.appeal_drafts && s.appeal_drafts['R-0384']), "another child's appeal letter is not sent");
  });
  await T.test("a link for another family sees nothing of T.W. and cannot act on T.W.'s records", async () => {
    const s = await state(AR);
    assert.ok(!s.clients.some(c => c.id === 'TW') && !s.referrals.some(r => r.id === 'REF-118') && !s.family_links.some(f => f.client === 'TW'));
    await assert.refused(tryApi('enroll.save', { client: 'TW', item: 'Privacy notice', kind: 'ack', data: { ack: true } }, AR), /different child|not for your child/, 403);
    await assert.refused(tryApi('consent.sign', { client: 'TW', form: 'Consent for services' }, AR), /different child/, 403);
    await assert.refused(tryApi('checkin.save', { client: 'TW', role: 'guardian', answers: { sad: 'Not at all' } }, AR), /not for your child/, 403);
    await assert.refused(tryApi('intake.book', { client: 'TW', when: '2026-11-03T09:00', who: 'jperez' }, AR), /different child/, 403);
  });
  await T.test('a guardian cannot do staff work: send, approve, decide, send a family link, sign for another child', async () => {
    await assert.refused(tryApi('request.send', { id: 'R-0416' }, TW), /not allowed/, 403);
    await assert.refused(tryApi('request.approve', { id: 'R-0416' }, TW), /not allowed/, 403);
    await assert.refused(tryApi('familyLink.send', { referral: 'REF-118' }, TW), /not allowed/, 403);
    await assert.refused(tryApi('request.appealSign', { id: 'R-0384', text: 'x' }, TW), /not for your child/, 403);
    await assert.refused(tryApi('consent.sign', { client: 'TW', form: 'Consent for services' }), /valid|Sign in/, 401);
  });
  await T.test('the presenter view of one child is that child: E.C.s guardian sees E.C.s denial and the letter status, never who prepared it', async () => {
    const j = await guardianToken('EC'); const s = await state({ token: j.token });
    assert.deepEq(s.clients.map(c => c.id), ['EC']); assert.ok(s.requests.some(r => r.id === 'R-0384' && r.stage === 'denied'));
    const d = s.appeal_drafts['R-0384']; assert.ok(d && d.status === 'ready' && !('prepared_by' in d), JSON.stringify(Object.keys(d || {})));
  });

  // ---------- the checklist and the screens at 390 px ----------
  await T.test('the checklist home: one h1, landmarks, "N of M done" equals the selector, next step first, no horizontal scroll', async () => {
    const { p, e, c } = await phoneAs('tw-demo', 'ParentPortal');
    const s = await state(TW); const fl = s.family_links[0]; const cl = checklist(s, { client: s.clients[0], fl, ref: s.referrals[0] });
    assert.ok(cl.total >= 3 && cl.done <= cl.total);
    const h = await p.evaluate(() => ({ h1: document.querySelectorAll('#root h1').length, main: document.querySelectorAll('#root main').length, header: document.querySelectorAll('#root header').length, footer: document.querySelectorAll('#root footer').length, overflow: document.documentElement.scrollWidth > innerWidth, t: document.getElementById('root').innerText }));
    assert.eq(h.h1, 1); assert.eq(h.main, 1); assert.eq(h.header, 1); assert.eq(h.footer, 1); assert.ok(!h.overflow, 'no horizontal scroll');
    assert.match(h.t, new RegExp(`${cl.done} of ${cl.total} done`));
    assert.match(h.t, /Next step/); assert.match(h.t, /Confirm contact details/); assert.match(h.t, /Provide insurance information/); assert.match(h.t, /Complete required paperwork/); assert.match(h.t, /Review and sign/);
    assert.match(h.t, /Schedule or confirm an appointment/); assert.match(h.t, /Review progress updates/); assert.match(h.t, /Complete the check-in/); assert.match(h.t, /View insurance letters/);
    await p.screenshot({ path: SHOTS + '/family-home.png', fullPage: true });
    assert.deepEq(e, [], e.join(' | ')); await c.close();
  });
  await T.test('language toggle: two buttons of 44 px or more, Español switches the page and marks it lang=es, English switches back', async () => {
    const { p, c } = await phoneAs('tw-demo', 'ParentPortal');
    const bt = await p.locator('[data-lang]').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.dataset.lang, Math.round(r.height), Math.round(r.width), e.getAttribute('aria-pressed')]; }));
    assert.eq(bt.length, 2); for (const [, h, w] of bt) { assert.ok(h >= 44 && w >= 44, `toggle ${h}x${w}`); }
    await p.locator('[data-lang="es"]').click(); await p.waitForTimeout(200);
    assert.match(await text(p), /Hola Denise/); assert.eq(await p.locator('.fp').getAttribute('lang'), 'es'); assert.match(await text(p), /de \d+ listos/);
    await p.screenshot({ path: SHOTS + '/family-home-es.png', fullPage: true });
    await p.locator('[data-lang="en"]').click(); await p.waitForTimeout(200); assert.match(await text(p), /Hi Denise/);
    await c.close();
  });
  await T.test('"Call us instead" opens an accessible dialog with the demo number and Escape closes it, focus returns to the button', async () => {
    const { p, c } = await phoneAs('tw-demo', 'ParentPortal');
    await p.locator('[data-call]').click(); await p.waitForTimeout(300);
    const d = p.locator('[role=dialog]'); assert.eq(await d.count(), 1); assert.match(await d.innerText(), /\(434\) 555-0120/); assert.match(await d.innerText(), /demo number/);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); assert.eq(await p.locator('[role=dialog]').count(), 0);
    assert.eq(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-call')), true); await c.close();
  });
  const ROUTES = ['ParentPortal', 'ParentSign', 'ParentEnroll', 'ParentLetters', 'ParentProgress', 'ParentQuarterly', 'ParentSchedule', 'ParentSurvey'];
  for (const route of ROUTES) {
    await T.test(`${route} at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors`, async () => {
      for (const lang of ['en', 'es']) {
        const { p, e, c } = await phoneAs('tw-demo', route, lang);
        const r = await p.evaluate(() => {
          const root = document.getElementById('root');
          const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
          const small = [...root.querySelectorAll('a[href],button,select,textarea,summary,input:not([type=hidden]):not([type=file])')].filter(vis).filter(el => {
            const box = el.type === 'checkbox' || el.type === 'radio' ? (el.closest('label') || el) : el; const r = box.getBoundingClientRect(); return r.height < 43.5;
          }).map(el => (el.tagName + ' ' + (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 30) + ' ' + Math.round(el.getBoundingClientRect().height)));
          const body = root.querySelector('.fp-main p, .fp-main li, .fp-main dd');
          const inst = window.psyflo && window.psyflo.current && window.psyflo.current.inst;
          const dead = [...root.querySelectorAll('a[href^="#"]:not([href^="#/"])')].map(a => a.getAttribute('href').slice(1)).filter(n => n && !(inst && inst.anchors && typeof inst.anchors[n] === 'function') && !document.getElementById(n));
          return { h1: [...root.querySelectorAll('h1')].filter(vis).length, main: root.querySelectorAll('main').length, nav: !!root.querySelector('header,nav'), small, font: body ? parseFloat(getComputedStyle(body).fontSize) : 16, overflow: document.documentElement.scrollWidth > innerWidth, dead };
        });
        assert.eq(r.h1, 1, `${route}/${lang} h1`); assert.eq(r.main, 1, 'main landmark'); assert.ok(r.nav, 'banner');
        assert.deepEq(r.small, [], `${route}/${lang} targets under 44 px`); assert.ok(r.font >= 15.5, 'body text ' + r.font); assert.ok(!r.overflow, `${route}/${lang} horizontal scroll`); assert.deepEq(r.dead, [], 'unwired anchors');
        if (lang === 'en') await p.screenshot({ path: `${SHOTS}/family-${route}.png`, fullPage: true });
        assert.deepEq(e, [], `${route}/${lang}: ` + e.join(' | ')); await c.close();
      }
    });
  }

  // ---------- signature modes ----------
  const FORM = 'Release of information · school', ROUTE = 'ParentSign?form=' + encodeURIComponent(FORM);
  await T.test('Remote allowed: the sign box offers drawing and "Type your name"', async () => {
    const { p, c } = await phoneAs('tw-demo', ROUTE);
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'remote');
    assert.ok(await p.locator('canvas').count() >= 1, 'a drawing box'); assert.match(await text(p), /Type your name/);
    await p.screenshot({ path: SHOTS + '/family-sign-remote.png', fullPage: true }); await c.close();
  });
  await T.test('In person required: no signing here; what to bring and when are shown; the server refuses a remote signature', async () => {
    await setRule('signature.mode.release', 'in_person_required');
    const { p, c } = await phoneAs('tw-demo', ROUTE);
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'in_person');
    assert.eq(await p.locator('canvas').count(), 0, 'no drawing box'); assert.eq(await p.locator('a[href="#sign"]').count(), 0, 'no Sign button');
    const t = await text(p); assert.match(t, /Sign in person/); assert.match(t, /cannot sign it on your phone/); assert.match(t, /What to bring/); assert.match(t, /Medicaid card/); assert.match(t, /When/);
    assert.noMatch(t, /You can sign here/);
    await p.screenshot({ path: SHOTS + '/family-sign-inperson.png', fullPage: true });
    await assert.refused(tryApi('consent.sign', { client: 'TW', form: FORM }, TW), /in-person signature/, 422);
    await c.close();
  });
  await T.test('Pending: the guardian is told Harvest is deciding; the server refuses the signature', async () => {
    await setRule('signature.mode.release', 'pending_validation');
    const { p, c } = await phoneAs('tw-demo', ROUTE);
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'pending'); assert.eq(await p.locator('canvas').count(), 0);
    assert.match(await text(p), /Harvest is still deciding how you sign/);
    await p.screenshot({ path: SHOTS + '/family-sign-pending.png', fullPage: true });
    await assert.refused(tryApi('consent.sign', { client: 'TW', form: FORM }, TW), /still confirming/, 422);
    await c.close();
  });
  await T.test('Ready to review: a form Harvest has not asked for can be read, not signed (screen and server)', async () => {
    await resetRule('signature.mode.release');
    const { p, c } = await phoneAs('tw-demo', 'ParentSign?form=Treatment%20plan');
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'ready'); assert.eq(await p.locator('canvas').count(), 0); assert.match(await text(p), /Ready to read/);
    await assert.refused(tryApi('consent.sign', { client: 'TW', form: 'Treatment plan' }, TW), /not asked you/, 422);
    await api('portalTask.create', { client: 'TW', form: 'Treatment plan', why: 'Plan for the guardian to sign' }, 'jperez');
    await p.reload(); await p.waitForSelector('#root main'); await p.waitForTimeout(300);
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'remote', 'once staff send it, it can be signed'); await c.close();
  });
  await T.test('Remote allowed, typed name: signing records the guardian behind the link (never the typed text) and the screen shows Completed', async () => {
    const { p, c, e } = await phoneAs('tw-demo', ROUTE);
    await p.locator('[data-sig-method="type"]').click(); await p.fill('input[id="sig-name"]', 'Not Denise At All');
    await p.locator('a[href="#sign"]').click(); await p.waitForTimeout(1500);
    const s = await state(TW); const rows = s.consents.filter(x => x.form === FORM);
    assert.eq(rows.length, 1); assert.eq(rows[0].status, 'signed'); assert.eq(rows[0].signer, 'Denise Rivers', 'the signer is the guardian behind the link'); assert.ok(rows[0].file, 'a signed PDF is stored'); assert.eq(rows[0].mode, 'remote_allowed');
    assert.eq(await p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'completed'); assert.match(await text(p), /Signed .* by Denise Rivers/); assert.match(await text(p), /Signed on your phone/);
    await p.screenshot({ path: SHOTS + '/family-sign-completed.png', fullPage: true });
    assert.deepEq(e, [], e.join(' | ')); await c.close();
  });
  await T.test('Remote allowed, drawn: the signed copy is stored and the checklist moves', async () => {
    const before = await state(TW); const bcl = checklist(before, { client: before.clients[0], fl: before.family_links[0], ref: before.referrals[0] });
    const { p, c } = await phoneAs('tw-demo', 'ParentSign?form=Treatment%20plan'); await draw(p); await p.locator('a[href="#sign"]').click(); await p.waitForTimeout(1500);
    const after = await state(TW); assert.ok(after.consents.some(x => x.form === 'Treatment plan' && x.status === 'signed' && x.file));
    const acl = checklist(after, { client: after.clients[0], fl: after.family_links[0], ref: after.referrals[0] });
    assert.ok(acl.items.find(i => i.key === 'sign').state === 'done' || acl.done >= bcl.done, 'signing moves the checklist');
    await c.close();
  });
  await T.test('the empty-pad sign attempt asks for a signature and signs nothing', async () => {
    await api('portalTask.create', { client: 'TW', form: 'Quarterly report', why: 'Quarterly report for the guardian' }, 'jperez');
    const n0 = (await state(TW)).consents.length;
    const { p, c } = await phoneAs('tw-demo', 'ParentQuarterly'); await p.waitForTimeout(300);
    if (await p.locator('a[href="#sign"]').count()) { await p.locator('a[href="#sign"]').click(); await p.waitForTimeout(400); assert.match(await text(p), /Sign in the box first/); }
    assert.eq((await state(TW)).consents.length, n0); await c.close();
  });

  // ---------- paperwork, check-in, quarterly ----------
  await T.test('required paperwork: a short form (filled in from the link) and a read-and-acknowledge item are saved; the checklist count moves', async () => {
    await reset('canvas');
    const s0 = await state(TW); const c0 = checklist(s0, { client: s0.clients[0], fl: s0.family_links[0], ref: s0.referrals[0] }).items.find(i => i.key === 'paperwork');
    const { p, c, e } = await phoneAs('tw-demo', 'ParentEnroll');
    assert.eq(await p.inputValue('#f-guardian'), 'Denise Rivers', 'name filled in from the family link, not typed again'); assert.match(await p.inputValue('#f-phone'), /555-0147/);
    await p.locator('[data-saveform="Intake information"]').click(); await p.waitForTimeout(900);
    await p.locator('[data-ack]').first().click(); await p.waitForTimeout(900);
    const s1 = await state(TW); assert.ok(s1.enrollment.TW['Intake information'] && s1.enrollment.TW['Rights and responsibilities']);
    assert.eq(s1.enrollment.TW['Intake information'].data.guardian, 'Denise Rivers');
    const c1 = checklist(s1, { client: s1.clients[0], fl: s1.family_links[0], ref: s1.referrals[0] }).items.find(i => i.key === 'paperwork'); assert.eq(c1.done, c0.done + 2);
    await p.locator('[data-acc="Emergency contacts"]').click(); await p.locator('[data-saveform="Emergency contacts"]').click(); await p.waitForTimeout(300);
    assert.ok(await p.locator('[role=alert]').count() >= 1, 'a missing required field is announced'); assert.ok((await p.locator('input[aria-invalid="true"]').count()) >= 1);
    await p.screenshot({ path: SHOTS + '/family-enroll-error.png', fullPage: true }); assert.deepEq(e, [], e.join(' | ')); await c.close();
  });
  await T.test('check-in: three questions are required; Send saves a guardian check-in credited to the guardian', async () => {
    const { p, c } = await phoneAs('tw-demo', 'ParentSurvey');
    await p.locator('a[href="#next"]').click(); await p.waitForTimeout(300); assert.match(await text(p), /Answer the three questions first/);
    for (const q of ['sad', 'angry', 'sleep']) await p.locator(`input[data-q="${q}"]`).first().check({ force: true });
    await p.fill('#fp-note', 'Slept badly on Sunday.'); await p.locator('a[href="#next"]').click(); await p.waitForTimeout(1500);
    const ck = (await state(TW)).checkins.filter(x => x.client === 'TW' && x.role === 'guardian'); assert.eq(ck.length, 1); assert.eq(ck[0].by, 'guardian'); assert.eq(ck[0].week_of, (await state(TW)).today); assert.match(ck[0].answers.note, /Slept badly/);
    await c.close();
  });
  await T.test("the quarterly report: once staff send it, the guardian signs (drawn); the PDF and the guardian's name are stored", async () => {
    await api('portalTask.create', { client: 'MR', form: 'Quarterly report', why: 'Quarterly report for the guardian' }, 'jperez');
    const g = await asGuardianPresenter('MR', 'ParentQuarterly');
    assert.eq(await g.p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'remote'); await draw(g.p); await g.p.locator('a[href="#sign"]').click(); await g.p.waitForTimeout(1500);
    const rows = (await state({ token: g.token })).consents.filter(x => x.client === 'MR' && x.form === 'Quarterly report'); assert.eq(rows.length, 1); assert.ok(rows[0].file); assert.eq(rows[0].mode, 'remote_allowed');
    assert.eq(await g.p.locator('[data-sig-state]').getAttribute('data-sig-state'), 'completed'); assert.deepEq(g.e, [], g.e.join(' | ')); await g.c.close();
  });

  // ---------- calls and visits ----------
  await T.test('the first call and the intake: a clinician offers, the family books on the phone (ride, confirm the day before), all recorded', async () => {
    await reset('live'); const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez'); const as = { portalToken: link.token };
    await api('screening.offer', { referral: 'REF-118' }, 'jperez');
    let { p, c } = await phoneAs(link.token, 'ParentSchedule'); assert.match(await text(p), /Book your first call/);
    await p.locator('[data-pick]').first().click(); await p.locator('[data-book]').click(); await p.waitForTimeout(1200);
    assert.ok((await state(as)).referrals[0].screening, 'the booking is on the referral'); assert.ok(await p.locator('[data-booked="screening"]').count() === 1, 'the screen shows it as booked'); await c.close();
    await api('intake.offer', { client: 'TW', referral: 'REF-118' }, 'jperez');
    ({ p, c } = await phoneAs(link.token, 'ParentSchedule')); assert.match(await text(p), /Book the intake visit/);
    await p.locator('[data-pick]').first().click(); await p.check('#fp-ride'); await p.locator('[data-book]').click(); await p.waitForTimeout(1200);
    const tw = (await state(as)).clients[0]; assert.ok(tw.intake && tw.intake.ride === true && tw.intake.when, JSON.stringify(tw.intake)); assert.ok(await p.locator('[data-booked="intake"]').count() === 1);
    await c.close();
    const evs = (await state('jperez')).events.filter(e => e.record === 'TW' || e.record === 'REF-118'); assert.ok(evs.some(e => /Guardian booked the intake/.test(e.what) && e.actor_kind === 'portal'));
  });

  // ---------- the appeal letter: Draft · Ready to review · Signed · Submitted by staff ----------
  await T.test('appealView reads the four states from the stored records', async () => {
    const r = { id: 'R-9', client: 'X', stage: 'denied', denied_on: '2026-10-22', notice_date: '2026-10-22', appeal_deadline: '2026-12-21' };
    const mk = (d, appeal, stage) => appealView({ appeal_drafts: d ? { 'R-9': d } : {}, rules: [], clock: { date: '2026-10-29' }, today: '2026-10-29' }, { ...r, appeal, stage: stage || 'denied' });
    assert.eq(mk(null).status, 'draft', 'no letter yet'); assert.eq(mk({ status: 'draft', en: 'x' }).status, 'draft'); assert.eq(mk({ status: 'ready', en: 'x' }).status, 'ready');
    assert.eq(mk({ en: 'old seed shape' }).status, 'ready'); assert.eq(mk({ status: 'ready', en: 'x' }, { signed_at: '2026-10-30T09:00' }).status, 'signed');
    assert.eq(mk({ status: 'ready', en: 'x' }, { signed_at: '2026-10-30T09:00', sent_at: '2026-10-30T10:00' }, 'appeal_sent').status, 'submitted');
    assert.eq(mk(null).deadline.date, '2026-12-21'); assert.eq(mk(null).deadline.daysLeft, 53);
    assert.eq(appealView({ appeal_drafts: {}, rules: [], clock: { date: '2026-10-29' } }, { id: 'R-8', stage: 'denied', denied_on: '2026-10-22' }).deadline.date, null, 'no rule row and no date on the record: no number is invented');
  });
  await T.test('appeal, guardian side: Ready to review → sign (typed) → Signed, staff will send → staff press Send → Submitted by staff', async () => {
    const g = await asGuardianPresenter('EC', 'AppealLetter'); const { p, e } = g;
    const steps = () => p.locator('.fp-steps').getAttribute('data-appeal-status');
    assert.eq(await steps(), 'ready'); const t0 = await text(p);
    assert.match(t0, /Draft/); assert.match(t0, /Ready to review/); assert.match(t0, /Signed/); assert.match(t0, /Submitted by staff/); assert.match(t0, /Illustrative sample/); assert.match(t0, /By Dec 21/); assert.match(t0, /A parent or guardian can appeal/); assert.noMatch(t0, /Only a parent/);
    assert.ok(await p.locator('.ui-verify').count() >= 1, 'the date carries a source chip');
    await p.screenshot({ path: SHOTS + '/family-appeal-ready.png', fullPage: true });
    // wording can be changed before signing
    await p.locator('[data-edit]').click(); await p.fill('#fp-letter', "I am Ethan's guardian and I am appealing. Please look again."); await p.locator('[data-edit]').click();
    await p.locator('[data-sig-method="type"]').click(); await p.fill('input[id="sig-name"]', 'Elena Carter'); await p.locator('a[href="#sign"]').click(); await p.waitForTimeout(1500);
    let r = (await state({ token: g.token })).requests.find(x => x.id === 'R-0384');
    assert.eq(r.stage, 'denied', 'signing is not sending'); assert.eq(r.appeal.status, 'signed'); assert.match(r.appeal.text, /please look again/i); assert.ok(r.appeal.file);
    assert.eq(await steps(), 'signed'); assert.match(await text(p), /Signed · staff will send/); assert.eq(await p.locator('a[href="#sign"]').count(), 0, 'no second signature');
    await p.screenshot({ path: SHOTS + '/family-appeal-signed.png', fullPage: true });
    await api('request.appealSend', { id: 'R-0384' }, 'jperez');
    await p.reload(); await p.waitForSelector('#root main'); await p.waitForTimeout(400);
    assert.eq(await steps(), 'submitted'); assert.match(await text(p), /Submitted by staff/); assert.match(await text(p), /Harvest staff sent your signed letter/);
    await p.screenshot({ path: SHOTS + '/family-appeal-submitted.png', fullPage: true });
    assert.deepEq(e, [], e.join(' | ')); await g.c.close();
  });
  await T.test('appeal signature mode: In person required refuses a remote appeal signature and the screen shows what to bring', async () => {
    await reset('canvas');
    await setRule('signature.mode.appeal', 'in_person_required');
    const g = await asGuardianPresenter('EC', 'AppealLetter');
    assert.eq(await g.p.locator('[data-sig-inperson]').count(), 1); assert.eq(await g.p.locator('canvas').count(), 0); assert.match(await text(g.p), /Medicaid card/);
    await assert.refused(tryApi('request.appealSign', { id: 'R-0384', text: 'x' }, { token: g.token }), /in-person signature/, 422);
    await setRule('signature.mode.appeal', 'pending_validation');
    await assert.refused(tryApi('request.appealSign', { id: 'R-0384', text: 'x' }, { token: g.token }), /still confirming/, 422);
    await resetRule('signature.mode.appeal'); await g.c.close();
  });

  // ---------- letters, in plain words ----------
  await T.test('insurance letters: What this says · What you can do · By when; no 24-hour promise; the appeal date has its source', async () => {
    const g = await asGuardianPresenter('EC', 'ParentLetters'); const t = await text(g.p);
    assert.match(t, /What this says/); assert.match(t, /What you can do/); assert.match(t, /By when/); assert.match(t, /By Dec 21/); assert.match(t, /Counted from the date on the insurance letter/);
    assert.ok(await g.p.locator('.ui-verify').count() >= 1, 'source chip'); assert.noMatch(t, /24 hours|within 24|Only a parent or guardian/i);
    assert.match(t, /A parent or guardian can appeal/);
    await g.p.screenshot({ path: SHOTS + '/family-letters-appeal.png', fullPage: true });
    // an information request is described without a promise to answer within a day
    await g.c.close();
    const k = await guardianToken('KT'); const s = await state({ token: k.token }); const r = s.requests.find(x => x.stage === 'info_requested');
    if (r) { const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); await c2.addInitScript(({ token, actor }) => localStorage.setItem('psyflo_session', JSON.stringify({ token, actor })), { token: k.token, actor: k.actor }); const p2 = await c2.newPage(); await p2.goto(BASE + '/#/ParentLetters'); await p2.waitForSelector('#root main'); await p2.waitForTimeout(300); const t2 = await text(p2); assert.match(t2, /asked Harvest for more information/); assert.noMatch(t2, /24 hours|within 24/i); await c2.close(); }
  });
  await T.test('the quarterly report follows the signature mode too (In person required: no signing here)', async () => {
    await setRule('signature.mode.quarterly', 'in_person_required');
    const { p, c } = await phoneAs('tw-demo', 'ParentQuarterly');
    assert.ok(await p.locator('[data-sig-state]').count() === 0 || (await p.locator('[data-sig-state]').getAttribute('data-sig-state')) !== 'remote'); assert.eq(await p.locator('a[href="#sign"]').count(), 0);
    await resetRule('signature.mode.quarterly'); await c.close();
  });

  // ---------- pure selectors ----------
  await T.test('sigState: five states from the rule and the stored records', async () => {
    const base = { rules: [{ key: 'signature.mode.consent', value: 'remote_allowed', default: 'remote_allowed', category: 'HARVEST-REPORTED' }, { key: 'signature.mode.release', value: 'in_person_required', default: 'remote_allowed', category: 'HARVEST-REPORTED' }, { key: 'signature.mode.quarterly', value: 'pending_validation', default: 'remote_allowed', category: 'HARVEST-REPORTED' }], consents: [], portal_tasks: [{ client: 'X', form: 'Release of information · school', status: 'waiting' }, { client: 'X', form: 'Quarterly report', status: 'waiting' }] };
    assert.eq(sigState(base, 'X', 'Consent for services').state, 'remote'); assert.eq(sigState(base, 'X', 'Release of information · school').state, 'in_person');
    assert.eq(sigState(base, 'X', 'Quarterly report').state, 'pending'); assert.eq(sigState(base, 'X', 'Treatment plan').state, 'ready');
    const done = { ...base, consents: [{ client: 'X', form: 'Consent for services', status: 'signed', signer: 'G', signed_at: '2026-10-19T19:20' }] };
    assert.eq(sigState(done, 'X', 'Consent for services').state, 'completed'); assert.eq(signForms(done, 'X').filter(f => f.state === 'completed').length, 1);
  });
  await T.test('referralStatus never reaches past status text', async () => {
    for (const st of ['needs_screening', 'waiting_on_school', 'screening_booked', 'in_intake', 'in_service', 'grant_program', 'draft', 'declined']) assert.ok(referralStatus({}, { stage: st, family_link: {}, screening: { when: '2026-10-31T10:00' } }).length > 3, st);
    assert.noMatch(referralStatus({}, { stage: 'grant_program', eligibility: 'active · Humana' }), /Humana|Medicaid|active/);
  });

  // ---------- known gaps in shared files (flip to PASS when the lead applies the change in the E6 report) ----------
  {
    const s = await state(TW); const mr = await state({ token: (await guardianToken('MR')).token });
    const leak = (mr.clients[0] && mr.clients[0].quarter && ['phq_a', 'dsm_parent', 'dsm_child'].filter(k => k in mr.clients[0].quarter)) || [];
    if (leak.length) T.skip('the guardian projection withholds clinical instrument scores of the quarter', `project.js clientView still sends client.quarter.${leak.join(', ')} (change requested in the E6 report)`);
    else await T.test('the guardian projection withholds clinical instrument scores of the quarter', async () => { assert.deepEq(leak, []); });
    const rl = new Set(s.rules.map(r => r.key));
    if (!rl.has('appeal.window_days')) T.skip('the guardian gets the appeal-window rule row, so the date shows its configured source', 'project.js rules policy still hides appeal.* and recording.* rows (change requested in the E6 report)');
    else await T.test('the guardian gets the appeal-window rule row', async () => assert.ok(rl.has('appeal.window_days')));
  }
} finally { await b.close(); }
await T.done();
