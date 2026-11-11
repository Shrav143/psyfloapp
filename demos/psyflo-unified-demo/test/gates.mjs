// Safety gates (review/05b categories that can be automated server-side): wrong patient, missing signature, finalized-note write,
// unauthorized role, send without approval or signature, simulated integrations, units and clock hazards, disclosure.
import { suite, assert, api, tryApi, state, reset, bridge, lget, lpost, advance, BASE, LAURIS, EXT, session, sleep } from './lib/index.mjs';
import { unitsFor } from '../web/js/shared/rules.js';

const T = suite('gates');
const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];
const ev = (event, session, form, no, initials, user, extra = {}) => ({ event, session, form, consumer: { no: String(no), initials }, values: {}, typed: [], user, ...extra });
const req = async (id, as = 'jperez') => (await state(as)).requests.find(r => r.id === id);
const lastEvents = async (record, as = 'jperez') => (await state(as)).events.filter(e => e.record === record);

// ------------------------------------------------------------------ 1. wrong patient
await reset('live');
await T.test('WPS-01 a Lauris record with an unknown Harvest # is never matched by initials: no draft, no note, dictation stays waiting', async () => {
  await api('dictation.save', { client: 'MR', spoken: 'Practiced the visual timer with M.R. in math, goal 3.' }, 'khale');
  const c = await lpost('/consumers/new', 'jperez', { initials: 'M.R.', program: 'TDT', locality: 'Campbell County', school: 'Campbell County · ES-1', staff: 'K. Hale', no: '9001' });
  const sess = await lpost('/consumers/9001/session/dpn', 'khale', { action: 'process', f9: 'Narrative from another child' });
  const id = sid(sess); assert.ok(id, 'Lauris processed the form for #9001');
  const r = await bridge('lauris.observed', ev('processed', id, 'dpn', 9001, 'M.R.', 'K. Hale'));
  assert.ok(r.ok && r.result.ignored, 'ignored: ' + JSON.stringify(r));
  const s = await state('jperez');
  assert.eq(s.dictations.find(d => d.client === 'MR').status, 'waiting', 'M.R.\'s dictation was not used');
  assert.ok(!s.notes.some(n => n.session === id), 'no note was recorded');
});
await T.test('WPS-02 the right Harvest # with the wrong initials on the page is a hard stop (audited), nothing applied', async () => {
  const sess = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f9: 'x' });
  const id = sid(sess);
  const before = (await state('jperez')).notes.length;
  const j = await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'X.Y.', 'K. Hale'));
  assert.ok(!j.ok && /Harvest # 3310 is M\.R\. in Psyflo but the open page shows X\.Y\./.test(j.error), j.error);
  assert.eq((await state('jperez')).notes.length, before);
  assert.ok((await state('jperez')).events.some(e => e.refused && /X\.Y\./.test(e.what)), 'the refusal is in the audit trail');
});
await T.test('WPS-03 no default person: an unknown or missing Lauris user, Harvest # or session records nothing', async () => {
  const sess = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f9: 'y' }); const id = sid(sess);
  await assert.refused(bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'Pat Nobody')), /not a Psyflo user/);
  await assert.refused(bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', undefined)), /did not report the Lauris user/);
  await assert.refused(bridge('lauris.observed', { ...ev('processed', id, 'dpn', 3310, 'M.R.', 'K. Hale'), consumer: { initials: 'M.R.' } }), /Harvest #/);
  await assert.refused(bridge('lauris.observed', ev('processed', undefined, 'dpn', 3310, 'M.R.', 'K. Hale')), /session id/);
});
await T.test('WPS-04 a forged event (no such session, or another user) is not believed', async () => {
  await assert.refused(bridge('lauris.observed', ev('processed', '99999', 'dpn', 3310, 'M.R.', 'K. Hale')), /does not show this event/);
  const sess = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', f9: 'z' }); const id = sid(sess);
  await assert.refused(bridge('lauris.observed', ev('processed', id, 'dpn', 3315, 'J.T.', 'J. Perez, LPC')), /processed by another user/);
});
await T.test('WPS-05 a timer or dictation for a student off the caseload is refused', async () => {
  await assert.refused(tryApi('timer.start', { client: 'DW' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('dictation.save', { client: 'DW', spoken: 'x' }, 'khale'), /not allowed/i, 403);
  await api('timer.start', { client: 'MR' }, 'khale');
  assert.ok((await state('khale')).timers.khale.started, 'own student: allowed');
  await api('timer.stop', {}, 'khale');
});
await T.test('WPS-08 a portal confirmation needs its request, and an issued reference', async () => {
  await assert.refused(bridge('portal.observed', { ref: 'AV-123456' }), /was not issued/);
  await assert.refused(bridge('portal.observed', {}), /No confirmation number/);
});

// ------------------------------------------------------------------ 2. missing signature, approval, send (availity: M.R. continued stay)
await reset('canvas');
const NO = 3310; let sess1;
await T.test('MCS-01 Process Form (observed) lands in Pending clinical approval; nothing can be signed or sent from a client call', async () => {
  await assert.refused(tryApi('request.processed', { id: 'R-0411', session: '1', consumer: 3310, lauris_user: 'J. Perez' }, 'jperez'), /cannot be called directly/, 403);
  await assert.refused(tryApi('request.signed', { id: 'R-0411', signer: 'Jordan Perez, LPC' }, 'jperez'), /cannot be called directly/, 403);
  await assert.refused(tryApi('request.portalConfirmed', { id: 'R-0411', ref: 'AV-1' }, 'jperez'), /cannot be called directly/, 403);
  await assert.refused(tryApi('request.set', { id: 'R-0411', patch: { stage: 'signed' } }, 'jperez'), /cannot be called directly/, 403);
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, 'jperez'), /approved and signed/, 409);
  const p = await lpost(`/consumers/${NO}/session/sra-continued`, 'jperez', { action: 'process' }); sess1 = sid(p); assert.ok(sess1);
  const j = await bridge('lauris.observed', ev('processed', sess1, 'sra-continued', NO, 'M.R.', 'J. Perez, LPC'));
  assert.ok(j.ok, j.error);
  const r = await req('R-0411'); assert.eq(r.stage, 'needs_approval'); assert.eq(r.lauris_session, sess1);
  assert.eq((await state('dowens')).requests.find(x => x.id === 'R-0411').stage, 'needs_approval');
});
await T.test('MCS-02 a second Process Form for the same request is an anomaly, not a second processed state', async () => {
  const p = await lpost(`/consumers/${NO}/session/sra-continued`, 'jperez', { action: 'process' });
  const second = sid(p);
  const j = await bridge('lauris.observed', ev('processed', second, 'sra-continued', NO, 'M.R.', 'J. Perez, LPC'));
  const r = await req('R-0411'); assert.eq(r.stage, 'needs_approval'); assert.eq(r.lauris_session, sess1, 'the first session stays');
  assert.ok(j.ok || /already/.test(j.error));
});
await T.test('MCS-03 a direct-support user cannot sign in Lauris, and a forged signed event is not believed', async () => {
  const x = await lpost(`/approvals/${sess1}/sign`, 'khale', {});
  assert.match(x.loc, /denied=.*signing%20authority/, 'Lauris refuses');
  await assert.refused(bridge('lauris.observed', ev('signed', sess1, 'sra-continued', NO, 'M.R.', 'K. Hale', { preview: { title: 'x', rows: [] } })), /does not show this event/);
  await assert.refused(bridge('lauris.observed', ev('signed', sess1, 'sra-continued', NO, 'M.R.', 'J. Perez, LPC', { preview: { title: 'x', rows: [] } })), /does not show this event/);
  assert.eq((await req('R-0411')).stage, 'needs_approval');
});
await T.test('MCS-07 signed in Lauris BEFORE the internal approval: held, not marked signed, Send blocked', async () => {
  const x = await lpost(`/approvals/${sess1}/sign`, 'jperez', {}); assert.match(x.loc, /signed=/);
  const j = await bridge('lauris.observed', ev('signed', sess1, 'sra-continued', NO, 'M.R.', 'J. Perez, LPC', { preview: { title: 'CMHRS Continued Stay', rows: [{ label: 'Member', value: 'M.R.' }] } }));
  assert.ok(j.ok && j.result.hold, JSON.stringify(j));
  const r = await req('R-0411'); assert.eq(r.stage, 'needs_approval'); assert.ok(!r.signed_at);
  assert.ok((await lastEvents('R-0411')).some(e => /before the internal approval/.test(e.what)));
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, 'cdiaz'), /approved and signed/);
});
await T.test('MCS-08 approval: only a designated approver; the signer on the signed PDF and the events is the one read from Lauris', async () => {
  await assert.refused(tryApi('request.approve', { id: 'R-0411' }, 'khale'), /not allowed/, 403);
  await assert.refused(tryApi('request.approve', { id: 'R-0411' }, 'cdiaz'), /not allowed/, 403);
  await assert.refused(tryApi('request.approve', { id: 'R-0411' }, 'dowens'), /not allowed/, 403);
  const j = await api('request.approve', { id: 'R-0411', comment: 'Reviewed against the notes' }, 'jperez');
  assert.eq(j.stage, 'signed');
  const r = await req('R-0411'); assert.eq(r.approved_by, 'jperez'); assert.eq(r.signed_by, 'J. Perez, LPC'); assert.ok(r.signed_pdf);
  const s = await session('jperez'); const pdf = await fetch(BASE + r.signed_pdf, { headers: { 'X-Psyflo-Session': s.token } });
  assert.eq(pdf.status, 200); const txt = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
  assert.match(txt, /signed in Lauris by J\. Perez, LPC/, 'signer printed from the Lauris event');
  assert.noMatch(txt, /Jordan Perez/, 'no default name');
  await assert.refused(tryApi('request.approve', { id: 'R-0411' }, 'jperez'), /Pending clinical approval/, 409);
});
await T.test('SIGNED is final: a second signature event or a reject after signing is refused (Lauris and Psyflo)', async () => {
  const r2 = await lpost(`/approvals/${sess1}/reject`, 'jperez', { note: 'oops' });
  assert.match(decodeURIComponent(r2.loc), /signed form is final/i, 'Lauris refuses reject after signing');
  const again = await lpost(`/approvals/${sess1}/sign`, 'jperez', {}); assert.match(again.loc, /denied=/, 'Lauris refuses a second signature');
  assert.ok((await req('R-0411')).signed_by === 'J. Perez, LPC');
});
await T.test('MCS-09 send: a person with send.packet presses it; the actor is the session, never args.by; the event is simulated, not "Sfax"', async () => {
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, 'khale'), /not allowed/, 403);
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, 'dowens'), /not allowed/, 403);
  const j = await api('request.send', { id: 'R-0411', by: 'jperez' }, 'cdiaz');
  assert.eq(j.channel, 'availity');
  const r = await req('R-0411'); assert.eq(r.stage, 'portal_open'); assert.eq(r.sent_by, 'cdiaz', 'sender is the session actor, not args.by');
  const e = (await lastEvents('R-0411')).find(e => /Send pressed/.test(e.what)); assert.eq(e.who, 'cdiaz');
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, 'cdiaz'), /approved and signed/, 409);
});
await T.test('PS-2 the portal confirmation attaches only to its request and an issued reference', async () => {
  await assert.refused(bridge('portal.observed', { ref: 'AV-999999', request: 'R-0411', kind: 'request' }), /was not issued/);
  const p = await fetch(EXT + '/availity/upload', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ request: 'R-0411', kind: 'request', member: 'x', files: 'x' }) });
  const ref = (await p.text()).match(/data-ref="([^"]+)"/)[1];
  await assert.refused(bridge('portal.observed', { ref, request: 'R-0408', kind: 'request' }), /does not match a request waiting|was issued for/);
  await assert.refused(bridge('portal.observed', { ref }), /does not say which request/);
  const j = await bridge('portal.observed', { ref, request: 'R-0411', kind: 'request' }); assert.ok(j.ok, j.error);
  const r = await req('R-0411'); assert.eq(r.stage, 'submitted'); assert.eq(r.portal_ref, ref);
  await assert.refused(bridge('portal.observed', { ref, request: 'R-0411', kind: 'request' }), /does not match a request waiting/);
});
await T.test('PDU-01 the decision clock is "Day N" with the configured window and a source; the date comes from the rules table', async () => {
  const s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0411');
  const lim = s.rules.find(x => x.key === 'decision.overdue_after_days');
  assert.eq(r.decision_due, new Date(Date.parse(r.sent.slice(0, 10) + 'T00:00Z') + lim.value * 86400000).toISOString().slice(0, 10));
  assert.eq(r.decision_basis.rule, 'decision.overdue_after_days'); assert.ok(r.decision_basis.verification);
  assert.eq(r.receipt_check, new Date(Date.parse(r.sent.slice(0, 10) + 'T00:00Z') + s.rules.find(x => x.key === 'submission.receipt_check_day').value * 86400000).toISOString().slice(0, 10), 'one receipt-check rule');
});
await T.test('GT-6 a re-send is a distinct action with a reason; it never resets the first send date', async () => {
  const before = (await req('R-0411')).sent;
  await assert.refused(tryApi('request.resend', { id: 'R-0411' }, 'cdiaz'), /Say why/);
  const j = await api('request.resend', { id: 'R-0411', reason: 'payer says the upload did not arrive' }, 'cdiaz');
  const r = await req('R-0411'); assert.eq(r.sent, before); assert.eq(r.resends.length, 1); assert.ok(j.channel);
});

// ------------------------------------------------------------------ 3. fax path (T.W. initial SRA via scenario s3)
await T.test('SVR-01 fax: Send by a person -> simulated Sfax; events carry sim:true and the person, never an actor called "Sfax"', async () => {
  const sc = await api('demo.scenario', { id: 's3' }, 'dowens+p'); assert.eq(sc.role, 'clinician'); assert.match(sc.route, /Authorization\?id=R-0416/);
  assert.eq((await req('R-0416')).stage, 'draft_ready');
  const p = await lpost('/consumers/4492/session/sra-initial', 'jperez', { action: 'process' }); const id = sid(p);
  assert.ok((await bridge('lauris.observed', ev('processed', id, 'sra-initial', 4492, 'T.W.', 'J. Perez, LPC'))).ok);
  assert.eq((await req('R-0416')).stage, 'needs_approval');
  await lpost(`/approvals/${id}/sign`, 'jperez', {});
  assert.ok((await bridge('lauris.observed', ev('signed', id, 'sra-initial', 4492, 'T.W.', 'J. Perez, LPC', { preview: { title: 'TDT Initial SRA', rows: [{ label: 'Member', value: 'T.W.' }] } }))).result.hold);
  await api('request.approve', { id: 'R-0416' }, 'jperez');
  assert.eq((await req('R-0416')).stage, 'signed');
  await api('request.send', { id: 'R-0416' }, 'jperez'); await sleep(3600);
  const r = await req('R-0416'); assert.eq(r.stage, 'submitted'); assert.match(r.fax_ref, /^F-\d+/);
  const evs = await lastEvents('R-0416');
  assert.ok(!evs.some(e => e.who === 'Sfax'), 'no actor called Sfax');
  const sent = evs.filter(e => /Sfax/.test(e.what)); assert.ok(sent.length >= 2 && sent.every(e => e.sim === true && e.who === 'jperez'), JSON.stringify(sent.map(e => [e.who, e.sim])));
  assert.ok(sent.every(e => /simulated/i.test(e.what)), 'the words say simulated');
  assert.ok(evs.every(e => 'actor_kind' in e && 'sim' in e), 'every event has actor_kind and sim');
});
await T.test('PS-1 an overdue notice or a guardian signature is not a send: "sent" is recorded only when the Send stub ran', async () => {
  const s = await state('jperez');
  const overdue = s.requests.find(r => r.stage === 'overdue');   // R-0399
  assert.ok(overdue, 'a seeded overdue request exists');
  const j = await api('request.overdueNotice', { id: overdue.id }, 'cdiaz');
  const r = await req(overdue.id); assert.match(r.overdue_notice_ref, /^F-\d+/);
  const e = (await lastEvents(overdue.id)).find(e => /Overdue notice sent/.test(e.what)); assert.ok(e.sim && /simulated/i.test(e.what) && e.who === 'cdiaz');
  await assert.refused(tryApi('request.overdueNotice', { id: overdue.id }, 'cdiaz'), /already sent/, 409);
});

// ------------------------------------------------------------------ 4. finalized records are write-once
await reset('live');
await T.test('EFN-01..03 Lauris: a processed session cannot be written, processed again, or opened for editing', async () => {
  const p = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', f9: 'first text' }); const id = sid(p);
  const w = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'save', session_id: id, f9: 'rewritten text' });
  assert.match(w.loc, /blocked=.*read-only/, 'save is blocked');
  const w2 = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', session_id: id, f2: '1', f3: '3' });
  assert.match(w2.loc, /blocked=/, 'a second process is blocked');
  const g = await lget(`/consumers/3315/session/dpn?id=${id}`, 'khale'); assert.eq(g.status, 303); assert.match(g.loc, /\/sessions\/\d+/, 'opens read-only');
  const view = await lget(g.loc, 'khale'); assert.match(view.text, /first text/); assert.noMatch(view.text, /rewritten text/);
});
await T.test('EFN-04 Psyflo: a repeated processed event for a session changes nothing; the note stays unchanged', async () => {
  const p = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', f2: '220 min', f3: '2', f9: 'Narrative one' }); const id = sid(p);
  const e = ev('processed', id, 'dpn', 3315, 'J.T.', 'K. Hale', { values: { Narrative: 'Narrative one', Units: '2', 'Direct time': '220 min' } });
  const a = await bridge('lauris.observed', e); assert.ok(a.ok && a.result.note, JSON.stringify(a));
  const n1 = (await state('jperez')).notes.filter(n => n.session === id); assert.eq(n1.length, 1);
  const b = await bridge('lauris.observed', { ...e, values: { Narrative: 'CHANGED', Units: '3' } });
  assert.ok(b.ok && b.result.duplicate, 'duplicate event');
  const n2 = (await state('jperez')).notes.filter(n => n.session === id); assert.eq(n2.length, 1); assert.eq(n2[0].fields.Narrative, 'Narrative one');
});
await T.test('IIU-09 units must follow the recorded direct time: a note with 3 units on 100 minutes is flagged for review', async () => {
  const p = await lpost('/consumers/3320/session/dpn', 'khale', { action: 'process', f2: '100 min', f3: '3', f9: 'x' }); const id = sid(p);
  const j = await bridge('lauris.observed', ev('processed', id, 'dpn', 3320, 'D.P.', 'K. Hale', { values: { 'Direct time': '100 min', Units: '3', Narrative: 'x' } }));
  assert.ok(j.ok, j.error);
  const n = (await state('jperez')).notes.find(n => n.session === id);
  assert.ok(n.flags.length && /exceed/.test(n.flags[0]), JSON.stringify(n.flags)); assert.eq(n.review, 'pending');
  assert.eq(unitsFor({ rules: (await state('jperez')).rules }, 'tdt', 100), 0, 'official band: below 120 minutes = 0 units');
});
await T.test('EFN-05 consent: a second signature is kept as a new version, the first record and file stay', async () => {
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  const as = { portalToken: link.token };
  await api('consent.sign', { client: 'TW', form: 'Consent for services', signer: 'Anyone At All' }, as);
  await api('consent.sign', { client: 'TW', form: 'Consent for services' }, as);
  const rows = (await state('jperez')).consents.filter(c => c.client === 'TW' && c.form === 'Consent for services');
  assert.eq(rows.length, 2); assert.ok(rows[0].file !== rows[1].file); assert.eq(rows[1].version, 2);
  assert.ok(rows.every(r => r.signer !== 'Anyone At All'), 'the signer is the guardian behind the link, never a typed name');
  await assert.refused(tryApi('consent.sign', { client: 'DW', form: 'Consent for services' }, as), /different child/, 403);
  await assert.refused(tryApi('consent.sign', { client: 'TW', form: 'Consent for services' }), /valid|Sign in/, 401);
});
await T.test('EFN-06/07 a sent reply is write-once; patch actions and record rewrites are refused', async () => {
  await reset('canvas');
  await api('request.infoReply', { id: 'R-0408', text: 'Draft reply one.' }, 'jperez');
  await api('request.infoSend', { id: 'R-0408', via: 'fax' }, 'jperez');
  let r = await req('R-0408'); assert.ok(r.info_reply.sent_at && r.info_reply.ref); const keep = r.info_reply.sent_at;
  await assert.refused(tryApi('request.infoReply', { id: 'R-0408', text: 'Rewritten' }, 'jperez'), /already sent/, 409);
  await assert.refused(tryApi('request.infoSend', { id: 'R-0408', text: 'again' }, 'jperez'), /open information request|already sent/, 409);
  r = await req('R-0408'); assert.eq(r.info_reply.sent_at, keep); assert.eq(r.info_reply.text, 'Draft reply one.');
  await assert.refused(tryApi('client.update', { id: 'MR', patch: { diagnosis: 'F99' } }, 'jperez'), /cannot be changed here/, 422);
  await assert.refused(tryApi('request.set', { id: 'R-0416', patch: { units_requested: 1 } }, 'jperez'), /cannot be called directly/, 403);
});
await T.test('payer decisions need a document reference and are write-once (a correction needs a reason and appends)', async () => {
  await assert.refused(tryApi('request.p2pLog', { id: 'R-0388', outcome: 'approved', units: 80 }, 'jperez'), /document reference/, 422);
  await api('request.p2pLog', { id: 'R-0388', outcome: 'approved', units: 80, doc_ref: 'Sentara letter 2026-11-02' }, 'jperez');
  await assert.refused(tryApi('request.p2pLog', { id: 'R-0388', outcome: 'denied', doc_ref: 'letter-2' }, 'jperez'), /already recorded/, 409);
  await api('request.p2pLog', { id: 'R-0388', outcome: 'partial', units: 70, doc_ref: 'Corrected letter', reason: 'payer corrected the award' }, 'jperez');
  const r = await req('R-0388'); assert.eq(r.decision_log.length, 2); assert.eq(r.decision_log[0].superseded_by, r.decision_log[1].id); assert.eq(r.decision_log[0].units, 80);
});
await T.test('IIU-03/04/05/06 invalid units, dates and results are refused', async () => {
  for (const u of [-5, 'abc', 10000]) await assert.refused(tryApi('request.p2pLog', { id: 'R-0384', outcome: 'approved', units: u, doc_ref: 'letter-x1' }, 'jperez'), /whole number/, 422);
  await assert.refused(tryApi('request.partialChoice', { id: 'R-0402', choice: 'stretch', plan: { until: '2020-01-01', per_week: -3 } }, 'jperez'), /whole number|past/, 422);
  await assert.refused(tryApi('plan.set', { request: 'R-0402', client: 'DW', discharge: '2020-01-01', intake: '2019-12-01', new_initial: '2019-12-05' }, 'jperez'), /past/, 422);
  await assert.refused(tryApi('plan.set', { request: 'R-0402', client: 'DW', discharge: '2026-12-18', intake: '2026-12-10', new_initial: '2026-12-20' }, 'jperez'), /intake cannot be before/, 422);
  await assert.refused(tryApi('eligibility.record', { referral: 'REF-118', result: 'banana', plan: 'nonexistent' }, 'jperez'), /active or inactive/, 422);
  await assert.refused(tryApi('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'nonexistent' }, 'jperez'), /Pick the plan/, 422);
});

// ------------------------------------------------------------------ 5. unauthorized roles
await T.test('URA note review: not your own note; a decision is write-once; only the assigned reviewer or a supervisor', async () => {
  await reset('live');
  const own = await lpost('/consumers/3310/session/dpn', 'jperez', { action: 'process', f2: '220 min', f3: '2', f9: 'clinician note' }); const id = sid(own);
  assert.ok((await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'J. Perez, LPC', { values: { 'Direct time': '220 min', Units: '2', Narrative: 'clinician note' } }))).ok);
  const note = (await state('jperez')).notes.find(n => n.session === id);
  await assert.refused(tryApi('note.review', { id: note.id, decision: 'approved' }, 'jperez'), /own note/, 403);
  await assert.refused(tryApi('note.review', { id: 'rq-lb-1029', decision: 'approved' }, 'khale'), /not allowed/, 403);
  await api('note.review', { id: 'rq-lb-1029', decision: 'returned', comment: 'name the objective' }, 'cdiaz');
  await assert.refused(tryApi('note.review', { id: 'rq-lb-1029', decision: 'approved' }, 'cdiaz'), /already reviewed/, 409);
  await api('note.review', { id: 'rq-lb-1029', decision: 'approved', reason: 'staff added the objective' }, 'cdiaz');
  assert.eq((await state('cdiaz')).notes.find(n => n.id === 'rq-lb-1029').review_history.length, 1);
});
await T.test('presenter actions are refused without presenter mode; the demo reply is recorded as simulated with a demo reference', async () => {
  await reset('canvas');
  await assert.refused(tryApi('request.demoReply', { id: 'R-0408', kind: 'approved' }, 'jperez'), /demo\.controls/, 403);
  await api('request.demoReply', { id: 'R-0408', kind: 'approved', units: 90 }, 'dowens+p');
  const r = await req('R-0408'); assert.eq(r.stage, 'active'); assert.match(r.decision_log[0].doc_ref, /^DEMO-/); assert.eq(r.decision_log[0].sim, true);
  const e = (await lastEvents('R-0408')).find(e => /Demo: approved/.test(e.what)); assert.ok(e.sim && e.actor_kind === 'demo');
});
await T.test('DSL-04 the internal quarterly is staff only: absent from every other projection', async () => {
  await api('quarterly.internalSave', { client: 'MR', period: 'Q4', fields: { concerns: 'private concern' } }, 'jperez');
  assert.ok((await state('jperez')).internal_quarterlies.length > 0);
  for (const as of ['dowens', 'cdiaz', 'khale']) assert.eq((await state(as)).internal_quarterlies.length, 0, as);
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  assert.eq((await state({ portalToken: link.token })).internal_quarterlies.length, 0);
  assert.eq((await state({ portalToken: 'sch-rbell-demo' })).internal_quarterlies.length, 0);
});
await T.test('RE-4 guardian appeal: signing is not sending; a person presses Send and the stub returns the reference', async () => {
  await reset('canvas');
  await api('request.demoReply', { id: 'R-0416', kind: 'denied' }, 'dowens+p');   // T.W. has a family link; deny his request so there is something to appeal
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  const as = { portalToken: link.token };
  await assert.refused(tryApi('request.appealSign', { id: 'R-0402' }, as), /not for your child/, 403);
  await api('request.appealSign', { id: 'R-0416', text: 'Please reconsider.', signer: 'Someone Else' }, as);
  let r = await req('R-0416'); assert.eq(r.stage, 'denied'); assert.eq(r.appeal.status, 'signed'); assert.ok(r.appeal.signer !== 'Someone Else');
  const evs = await lastEvents('R-0416'); assert.ok(!evs.some(e => /faxed|Sfax/.test(e.what) && /appeal/i.test(e.what)), 'signing logs no send');
  await assert.refused(tryApi('request.appealSign', { id: 'R-0416' }, as), /already signed/, 409);
  await assert.refused(tryApi('request.appealSend', { id: 'R-0416' }, 'khale'), /not allowed/, 403);
  await api('request.appealSend', { id: 'R-0416' }, 'jperez');
  r = await req('R-0416'); assert.eq(r.stage, 'appeal_sent'); assert.match(r.appeal.ref, /^F-/);
  const e = (await lastEvents('R-0416')).find(e => /Appeal letter sent/.test(e.what)); assert.ok(e.sim && e.who === 'jperez' && /simulated/i.test(e.what));
  await assert.refused(tryApi('request.appealSend', { id: 'R-0416' }, 'jperez'), /already sent|no signed appeal/, 409);
});

await T.done();
