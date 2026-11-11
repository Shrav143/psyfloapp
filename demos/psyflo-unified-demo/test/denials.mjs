// Denial Intelligence (E3): partial -> dispute -> resolve -> request stage and queues reconcile; the four seeded cases walk their path;
// documents are grounded and gated; decisions are write-once; admin never reads clinical text; references come only from the stub or the page.
// Run: BASE=http://localhost:4840 node test/denials.mjs
import { suite, assert, api, tryApi, state, reset, bridge, BASE, LAURIS, EXT } from './lib/index.mjs';
import { appealView } from '../web/js/shared/sel/portal.js';
import { queueRows, caseView, evidenceIndex, buildDoc, docText, docMissing, MISSING_RE, deriveStatus, nextAction } from '../web/js/shared/sel/disputes.js';

const T = suite('denials');
const gview = async tok => { const gs = await state(tok); return appealView(gs, gs.requests.find(x => x.id === 'R-0384')); };
const dispute = async (req, as = 'jperez') => (await state(as)).disputes.find(d => d.request === req);
const request = async (id, as = 'jperez') => (await state(as)).requests.find(r => r.id === id);
const snapLauris = async () => { const r = await fetch(LAURIS + '/__test/lauris'); return r.ok ? JSON.stringify((await r.json()).consumers.map(c => [c.no, c.auth])) : null; };
const guardianToken = async client => { const r = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: client, presenter: true }) }); const j = await r.json(); if (!j.ok) throw new Error(j.error); return { token: j.token }; };

await reset('canvas');

await T.test('four seeded cases match their requests (D.W. R-0402, K.T. R-0408, T.N. R-0388, E.C. R-0384)', async () => {
  const s = await state('jperez');
  const want = { 'R-0402': ['partial', 'decide', 'partial_decide'], 'R-0408': ['info', 'info-req', 'info_requested'], 'R-0388': ['partial', 'p2p', 'peer_to_peer_booked'], 'R-0384': ['denial', 'appeal-prep', 'denied'] };
  assert.eq(s.disputes.length, 4);
  for (const [rid, [issue, status, stage]] of Object.entries(want)) {
    const d = s.disputes.find(x => x.request === rid); assert.ok(d, rid); assert.eq(d.issue, issue, rid); assert.eq(d.status, status, rid); assert.eq(d.closed, null, rid);
    assert.eq(s.requests.find(r => r.id === rid).stage, stage, rid); assert.eq(d.id, 'DI-' + rid.slice(2), 'id'); assert.eq(d.owner, 'jperez');
  }
  assert.ok(s.drafting_rules.length === 14, 'the 14 drafting rules are data (Settings reads state.drafting_rules)');
});

await T.test('the queue selector: columns, filters, deadline with its source, sorted by deadline', async () => {
  const s = await state('jperez'); const rows = queueRows(s, {});
  assert.eq(rows.length, 4);
  assert.deepEq(rows.map(r => r.request).sort(), ['R-0384', 'R-0388', 'R-0402', 'R-0408']);
  for (const r of rows) { assert.ok(r.deadline && r.deadline.source, r.request + ' has a deadline source'); assert.ok(['PAYER-SPECIFIC', 'UNVERIFIED-DEMO-ASSUMPTION', 'HARVEST-REPORTED', 'OFFICIAL-VERIFIED'].includes(r.deadline.category)); }
  assert.eq(rows.find(r => r.request === 'R-0384').deadline.category, 'UNVERIFIED-DEMO-ASSUMPTION', 'the appeal window is not stated as law');
  assert.deepEq(queueRows(s, { decision: 'partial' }).map(r => r.request).sort(), ['R-0388', 'R-0402']);
  assert.deepEq(queueRows(s, { decision: 'denied' }).map(r => r.request), ['R-0384']);
  assert.deepEq(queueRows(s, { decision: 'info' }).map(r => r.request), ['R-0408']);
  assert.deepEq(queueRows(s, { q: 'sentara' }).map(r => r.request).sort(), ['R-0388', 'R-0402']);
  assert.eq(queueRows(s, { status: 'closed' }).length, 0);
});

await T.test('a request that enters a decision stage opens a case by itself, once (the receive-reply simulation)', async () => {
  await api('request.demoReply', { id: 'R-0416', kind: 'partial', units: 90 }, 'dowens+p');
  const s = await state('jperez'); const ds = s.disputes.filter(d => d.request === 'R-0416');
  assert.eq(ds.length, 1); assert.eq(ds[0].issue, 'partial'); assert.eq(ds[0].status, 'decide'); assert.eq(ds[0].units.offered, 90);
  assert.eq(s.events.filter(e => e.record === 'R-0416' && /Opened in Denial Intelligence/.test(e.what)).length, 1, 'one opening event');
  await api('request.demoReply', { id: 'R-0416', kind: 'denied' }, 'dowens+p').then(() => assert.ok(false)).catch(e => assert.match(e.message, /already recorded|write-once|decision is already/i));
});

await reset('canvas');
await T.test('S5: D.W. partial -> peer-to-peer -> outcome 130 -> Active, 130 units to the tracker, a task for Lauris, case closed', async () => {
  const lauris0 = await snapLauris();
  const before = (await state('jperez')).clients.find(c => c.id === 'DW').authorization;
  assert.eq(before.units, 110);
  await api('dispute.choose', { id: 'R-0402', path: 'p2p' }, 'jperez');
  let r = await request('R-0402'); assert.eq(r.stage, 'peer_to_peer_requested'); assert.eq((await dispute('R-0402')).status, 'p2p-prep');
  const g = await api('dispute.genDoc', { id: 'R-0402', doc: 'p2p' }, 'jperez'); assert.ok(g.sections >= 5);
  await api('dispute.reviewDoc', { id: 'R-0402', doc: 'p2p' }, 'jperez');           // internal talking points may carry Evidence-missing prompts
  await api('dispute.schedule', { id: 'R-0402', when: '2026-11-19T14:00', ref: 'SEN-5521', reviewer: 'Reviewer' }, 'jperez');
  r = await request('R-0402'); assert.eq(r.stage, 'peer_to_peer_booked'); assert.eq(r.p2p_at, '2026-11-19T14:00'); assert.eq((await dispute('R-0402')).status, 'p2p');
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0402', outcome: 'partial', units: 130 }, 'jperez'), /document reference/, 422);   // a decision needs its document
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0402', outcome: 'partial', units: 151, doc_ref: 'Sentara letter' }, 'jperez'), /whole number|units/i);
  await api('dispute.resolve', { id: 'R-0402', outcome: 'partial', units: 130, doc_ref: 'Sentara decision letter 2026-11-19' }, 'jperez');
  const s = await state('jperez'); r = s.requests.find(x => x.id === 'R-0402'); const d = s.disputes.find(x => x.request === 'R-0402');
  assert.eq(r.stage, 'active'); assert.eq(r.units_awarded, 130);
  assert.eq(d.status, 'partover'); assert.ok(d.closed); assert.match(d.outcome.text, /130 of 150/); assert.eq(d.outcome.doc_ref, 'Sentara decision letter 2026-11-19');
  const c = s.clients.find(x => x.id === 'DW'); assert.eq(c.authorization.units, 130, 'tracker'); assert.eq(c.authorization.award, 'R-0402');
  const t = s.lauris_tasks.find(x => x.client === 'DW' && x.status === 'open'); assert.ok(t && t.units === 130 && /Enter 130 units/.test(t.text), 'a human task');
  assert.eq(await snapLauris(), lauris0, 'Psyflo wrote nothing into Lauris');
  assert.ok(r.decision_log.some(x => x.kind === 'p2p' && x.doc_ref === 'Sentara decision letter 2026-11-19'), 'the decision is in the write-once ledger');
  assert.eq(queueRows(s, {}).filter(x => x.request === 'R-0402').length, 0, 'gone from the open queue');
  assert.eq(queueRows(s, { status: 'closed' })[0].request, 'R-0402', 'listed under Closed');
  assert.ok(s.events.some(e => e.record === 'R-0402' && /Closed in Denial Intelligence/.test(e.what)));
});

await T.test('closed cases and recorded decisions are write-once', async () => {
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0402', outcome: 'approved', units: 150, doc_ref: 'x-letter' }, 'jperez'), /closed/, 409);
  await assert.refused(tryApi('dispute.choose', { id: 'R-0402', path: 'recon' }, 'jperez'), /closed/);
  await assert.refused(tryApi('request.p2pLog', { id: 'R-0402', outcome: 'approved', units: 150, doc_ref: 'second letter' }, 'jperez'), /already recorded|correction needs a reason/i);
});

await reset('canvas');
await T.test('D.W. decision document: a phone offer has none until a person records it; stored once', async () => {
  let d = await dispute('R-0402'); assert.eq(d.notice.doc_ref, null);
  const cv = caseView(await state('jperez'), 'R-0402', { role: 'clinician', id: 'jperez' }); assert.ok(cv.decision.docRefMissing);
  await assert.refused(tryApi('dispute.recordDecision', { id: 'R-0402', doc_ref: 'x' }, 'jperez'), /document reference/, 422);
  await api('dispute.recordDecision', { id: 'R-0402', doc_ref: 'Sentara letter Oct 30' }, 'jperez');
  d = await dispute('R-0402'); assert.eq(d.notice.doc_ref, 'Sentara letter Oct 30');
  await assert.refused(tryApi('dispute.recordDecision', { id: 'R-0402', doc_ref: 'Another letter' }, 'jperez'), /already recorded/);
  await api('dispute.recordDecision', { id: 'R-0402', doc_ref: 'Sentara corrected letter', reason: 'First letter had the wrong date' }, 'jperez');
  assert.eq((await request('R-0402')).decision_log.length, 2);
});

await reset('canvas');
await T.test('accept as offered / stretch / use them up reconcile through the request actions', async () => {
  await api('dispute.choose', { id: 'R-0402', path: 'accept', plan: { mode: 'stretch', until: '2027-01-29', per_week: 8 } }, 'jperez');
  let s = await state('jperez'); assert.eq(s.requests.find(r => r.id === 'R-0402').stage, 'active'); assert.eq(s.requests.find(r => r.id === 'R-0402').stretch.units, 110);
  const d = s.disputes.find(x => x.request === 'R-0402'); assert.eq(d.status, 'accepted'); assert.match(d.outcome.text, /Accepted 110 of 150/);
  assert.ok(s.lauris_tasks.some(t => t.client === 'DW' && t.units === 110 && t.status === 'open'));
  await reset('canvas');
  await api('dispute.choose', { id: 'R-0402', path: 'accept', plan: { mode: 'use_up', runout: '2026-12-18' } }, 'jperez');
  s = await state('jperez'); assert.eq(s.requests.find(r => r.id === 'R-0402').stage, 'early_discharge'); assert.eq(s.disputes.find(x => x.request === 'R-0402').status, 'accepted');
});

await reset('canvas');
await T.test('K.T. information request: grounded draft, placeholders block review, the portal send waits for the page, then the case closes', async () => {
  const g = await api('dispute.genDoc', { id: 'R-0408', doc: 'info' }, 'jperez'); assert.eq(g.sections, 3); assert.ok(g.missing >= 1, 'the IEP argument is left to the clinician');
  let d = await dispute('R-0408'); const doc = d.docs.info; assert.eq(doc.sections.length, 3);
  assert.match(doc.sections[0].text, /seven incidents of physical aggression \(Oct 2, 6, 9, 14, 17, 22 and 27\)/, 'counts and dates computed from stored records');
  assert.match(doc.sections[0].text, /5 to 15 minutes at moderate intensity/);
  assert.match(doc.sections[1].text, /Piedmont Counseling.*nine sessions\. Outcome:/);
  assert.ok(doc.sections.every(x => x.evidence.length || x.missing.length), 'every statement has a source or says it is missing');
  await assert.refused(tryApi('dispute.reviewDoc', { id: 'R-0408', doc: 'info' }, 'jperez'), /Evidence missing/, 422);
  await assert.refused(tryApi('dispute.send', { id: 'R-0408', doc: 'info' }, 'jperez'), /reviews|review/, 422);
  const sec3 = doc.sections[2]; await api('dispute.editDoc', { id: 'R-0408', doc: 'info', section: sec3.key, text: sec3.text.replace(MISSING_RE, 'The supports are classroom-based and the clinician states they do not include de-escalation in unstructured periods.') }, 'jperez');
  await api('dispute.reviewDoc', { id: 'R-0408', doc: 'info' }, 'jperez'); d = await dispute('R-0408'); assert.eq(d.status, 'drafted');
  const res = await api('dispute.send', { id: 'R-0408', doc: 'info' }, 'jperez'); assert.match(res.open, /\/availity\/upload\?request=R-0408&kind=reply/);
  let r = await request('R-0408'); assert.eq(r.stage, 'portal_open'); d = await dispute('R-0408'); assert.eq(d.closed, null, 'still open until the portal confirms'); assert.eq(d.status, 'drafted');
  await assert.refused(tryApi('dispute.editDoc', { id: 'R-0408', doc: 'info', section: sec3.key, text: 'late change' }, 'jperez'), /already sent|write-once/i);
  const ref = 'AV-' + (400000 + Math.floor(Math.random() * 99999));
  // a made-up reference is not believed: the portal must have issued it
  assert.ok(!(await bridge('portal.observed', { event: 'confirmation', request: 'R-0408', ref: 'AV-000000', kind: 'reply' })).ok);
  const portal = await fetch(BASE.replace(/:\d+$/, m => ':' + (+m.slice(1) + 2)) + '/availity/upload', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ request: 'R-0408', kind: 'reply', member: 'x', reply: 'x' }) });
  const m = (await portal.text()).match(/data-ref="(AV-\d+)"/); assert.ok(m, 'the mock portal issued a confirmation');
  const ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0408', ref: m[1], kind: 'reply' }); assert.ok(ob.ok, ob.error);
  r = await request('R-0408'); d = await dispute('R-0408');
  assert.eq(r.stage, 'submitted'); assert.eq(r.info_reply.ref, m[1]); assert.ok(d.closed); assert.eq(d.status, 'resolved'); assert.eq(d.docs.info.sent.ref, m[1]); assert.ok(!d.docs.info.sent.pending);
  assert.match(d.outcome.text, /Reply sent/);
});

await reset('canvas');
await T.test('a fax payer: the reference comes only from the send stub (simulated Sfax), never from the caller', async () => {
  await api('request.demoReply', { id: 'R-0399', kind: 'info' }, 'dowens+p');
  let d = await dispute('R-0399'); assert.eq(d.issue, 'info'); assert.eq(d.status, 'info-req');
  const g = await api('dispute.genDoc', { id: 'R-0399', doc: 'info' }, 'jperez'); assert.ok(g.sections >= 3);
  d = await dispute('R-0399');
  for (const sec of d.docs.info.sections) await api('dispute.editDoc', { id: 'R-0399', doc: 'info', section: sec.key, text: 'Answered from the chart by the clinician with dated counts.' }, 'jperez');
  await api('dispute.reviewDoc', { id: 'R-0399', doc: 'info' }, 'jperez');
  const res = await api('dispute.send', { id: 'R-0399', doc: 'info', ref: 'F-9999' }, 'jperez');
  assert.match(res.ref, /^F-\d{4}$/); assert.ok(res.ref !== 'F-9999', 'a caller-supplied reference is ignored');
  const r = await request('R-0399'); assert.eq(r.stage, 'submitted'); assert.eq(r.info_reply.ref, res.ref);
  const s = await state('jperez'); assert.ok(s.events.some(e => e.record === 'R-0399' && /simulated Sfax · ref/.test(e.what) && e.sim === true), 'the event says Simulated');
  d = await dispute('R-0399'); assert.eq(d.status, 'resolved'); assert.eq(d.docs.info.sent.ref, res.ref);
});

await reset('canvas');
await T.test('E.C. appeal (Availity): seeded sample cannot be reviewed; the guardian signs; Mark ready for upload is not a send; the send is recorded only when the portal page confirms; the answer is recorded with its document', async () => {
  let d = await dispute('R-0384'); assert.eq(d.path, 'appeal'); assert.ok(d.docs.appeal.seeded);
  await assert.refused(tryApi('dispute.reviewDoc', { id: 'R-0384', doc: 'appeal' }, 'jperez'), /seeded sample/, 422);
  const g = await api('dispute.genDoc', { id: 'R-0384', doc: 'appeal' }, 'jperez'); assert.ok(g.missing >= 1);
  const drafted = (await state(await guardianToken('EC'))).appeal_drafts['R-0384']; assert.eq(drafted.status, 'draft', 'a draft reaches the family only as a status'); assert.ok(!drafted.en && !JSON.stringify(drafted).includes('office referrals'), 'no letter text before a clinician reviews it');
  d = await dispute('R-0384'); assert.ok(!d.docs.appeal.seeded); assert.match(d.docs.appeal.sections[0].text, /I am Ethan's guardian\. I am appealing Anthem's decision of October 22, 2026\./);
  assert.match(d.docs.appeal.sections[2].text, /Four office referrals in the last 30 days \(Oct 5, 12, 19 and 26\)/);
  assert.noMatch(JSON.stringify(d.docs.appeal), /only the guardian|Only a guardian/i);
  for (const sec of d.docs.appeal.sections.filter(x => x.missing.length)) await api('dispute.editDoc', { id: 'R-0384', doc: 'appeal', section: sec.key, text: sec.text.replace(MISSING_RE, 'The clinician adds the dated record before this goes out.') }, 'jperez');
  await api('dispute.reviewDoc', { id: 'R-0384', doc: 'appeal' }, 'jperez');
  const st = await state('jperez'); assert.eq(st.appeal_drafts['R-0384'].status, 'ready', 'published to the family portal after review');
  assert.ok(!/4 office referrals this month/.test(st.appeal_drafts['R-0384'].en), 'the seeded sample text is gone');
  await assert.refused(tryApi('dispute.send', { id: 'R-0384', doc: 'appeal' }, 'jperez'), /no signed appeal letter/, 409);   // signing is the guardian's
  const gt = await guardianToken('EC'); const gs = await state(gt);
  assert.ok(gs.appeal_drafts['R-0384'] && gs.appeal_drafts['R-0384'].en && gs.appeal_drafts['R-0384'].status === 'ready', 'the guardian can read the reviewed letter'); assert.ok(!gs.disputes.length && !gs.dispute_evidence.length, 'and nothing else of the case');
  await api('request.appealSign', { id: 'R-0384', text: gs.appeal_drafts['R-0384'].en, signer: 'ignored' }, gt);
  let r = await request('R-0384'); assert.ok(r.appeal.signed_at); assert.eq(r.stage, 'denied', 'signing is not sending');
  // a direct API call can never record a portal payer's appeal as sent (core.js + authz.js): only the observed portal confirmation does
  await assert.refused(tryApi('request.appealSend', { id: 'R-0384' }, 'jperez'), /Mark ready for upload, then upload in the payer portal/, 409);
  r = await request('R-0384'); assert.eq(r.stage, 'denied'); assert.ok(!r.appeal.sent_at && r.appeal.status === 'signed', 'the refused direct call changed nothing');
  // Availity payer: "Mark ready for upload" is a person's note, NOT a send. Sent only after the portal page confirms (QA2 D3).
  const sent = await api('dispute.send', { id: 'R-0384', doc: 'appeal' }, 'jperez'); assert.ok(sent.ready && !sent.ref, 'marking ready returns no reference: ' + JSON.stringify(sent));
  r = await request('R-0384'); assert.eq(r.stage, 'denied', 'still denied: nothing was uploaded'); assert.eq(r.appeal.status, 'ready_to_upload'); assert.ok(!r.appeal.sent_at && !r.appeal.ref, 'no sent time and no reference before the portal confirms');
  d = await dispute('R-0384'); assert.eq(d.status, 'appeal-prep'); assert.ok(d.docs.appeal.ready && !d.docs.appeal.sent); const na = nextAction(await state('jperez'), d, r); assert.match(na.label, /Upload the signed letter in Availity/); assert.eq(na.group, 'wait', 'no Send button while the upload is pending');
  let evs = (await state('jperez')).events.filter(e => e.record === 'R-0384'); const rdy = evs.filter(e => /Appeal letter ready for the clinician to upload in Availity/.test(e.what));
  assert.ok(rdy.length === 1 && rdy[0].sim === true && rdy[0].who === 'jperez', 'one simulated event by the person who pressed it'); assert.ok(!evs.some(e => /Appeal uploaded|Sfax|faxed/.test(e.what)), 'no sent language before the confirmation');
  assert.eq((await gview(gt)).status, 'signed', 'the guardian page still says Signed, not Submitted by staff');
  await assert.refused(tryApi('dispute.send', { id: 'R-0384', doc: 'appeal' }, 'jperez'), /already marked ready/, 409);
  await assert.refused(tryApi('dispute.editDoc', { id: 'R-0384', doc: 'appeal', section: d.docs.appeal.sections[0].key, text: 'late' }, 'jperez'), /marked ready to upload/, 409);
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0384', outcome: 'approved', units: 90, doc_ref: 'x' }, 'jperez'), /in progress/, 409);
  // the confirmation must be one the portal issued, for this request and for an appeal
  const issue = async (request, kind) => { const pr = await fetch(EXT + '/availity/upload', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ request, kind, member: 'x' }) }); const m = (await pr.text()).match(/data-ref="(AV-\d+)"/); assert.ok(m, 'the mock portal issued a confirmation'); return m[1]; };
  let ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0384', ref: 'AV-000000', kind: 'appeal' }); assert.ok(!ob.ok && /not issued/.test(ob.error), 'a made-up reference is not believed: ' + ob.error);
  ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0384', ref: await issue('R-0384', 'request'), kind: 'appeal' }); assert.ok(!ob.ok && /different upload/.test(ob.error), 'the confirmation of another upload is not the appeal: ' + ob.error);
  ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0384', ref: await issue('R-0408', 'appeal'), kind: 'appeal' }); assert.ok(!ob.ok && /issued for R-0408/.test(ob.error), 'the confirmation of another request is refused: ' + ob.error);
  r = await request('R-0384'); assert.eq(r.stage, 'denied'); assert.eq(r.appeal.status, 'ready_to_upload', 'still not sent after three refused confirmations');
  const ref = await issue('R-0384', 'appeal'); ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0384', ref, kind: 'appeal' }); assert.ok(ob.ok, ob.error);
  r = await request('R-0384'); assert.eq(r.stage, 'appeal_sent'); assert.eq(r.appeal.status, 'sent'); assert.eq(r.appeal.ref, ref, 'the reference is the one the portal page showed'); assert.ok(r.appeal.sent_at);
  d = await dispute('R-0384'); assert.eq(d.status, 'appeal'); assert.eq(d.docs.appeal.sent.ref, ref);
  evs = (await state('jperez')).events.filter(e => e.record === 'R-0384'); assert.ok(evs.some(e => new RegExp(`Appeal uploaded in Availity · confirmation ${ref} \\(read from the open portal page\\)`).test(e.what) && e.actor_kind === 'bridge'), 'the send event cites the page confirmation');
  ob = await bridge('portal.observed', { event: 'confirmation', request: 'R-0384', ref, kind: 'appeal' }); assert.ok(!ob.ok, 'the same confirmation cannot be applied twice');
  assert.eq((await gview(gt)).status, 'submitted', 'the guardian page says Submitted by staff only now');
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0384', outcome: 'approved', units: 90 }, 'jperez'), /document reference/, 422);
  await api('dispute.resolve', { id: 'R-0384', outcome: 'approved', units: 90, doc_ref: 'Anthem appeal decision Dec 2' }, 'jperez');
  const s2 = await state('jperez'); r = s2.requests.find(x => x.id === 'R-0384'); d = s2.disputes.find(x => x.request === 'R-0384');
  assert.eq(r.stage, 'active'); assert.eq(r.units_awarded, 90); assert.eq(d.status, 'overturned'); assert.ok(s2.lauris_tasks.some(t => t.client === 'EC' && t.units === 90 && t.status === 'open'));
});

await reset('canvas');
await T.test('appeal on a FAX payer: Send records the stub reference at once (simulated Sfax); a caller-supplied reference is ignored', async () => {
  await api('request.demoReply', { id: 'R-0416', kind: 'denied' }, 'dowens+p');
  let d = await dispute('R-0416'); assert.eq(d.issue, 'denial');
  await api('dispute.choose', { id: 'R-0416', path: 'appeal' }, 'jperez'); await api('dispute.genDoc', { id: 'R-0416', doc: 'appeal' }, 'jperez'); d = await dispute('R-0416');
  for (const sec of d.docs.appeal.sections.filter(x => x.missing.length)) await api('dispute.editDoc', { id: 'R-0416', doc: 'appeal', section: sec.key, text: sec.text.replace(MISSING_RE, 'The clinician adds the dated record before this goes out.') }, 'jperez');
  await api('dispute.reviewDoc', { id: 'R-0416', doc: 'appeal' }, 'jperez');
  const gt = await guardianToken('TW'); await api('request.appealSign', { id: 'R-0416', text: (await state(gt)).appeal_drafts['R-0416'].en }, gt);
  let r = await request('R-0416'); assert.eq(r.stage, 'denied', 'signing is not sending');
  const sent = await api('dispute.send', { id: 'R-0416', doc: 'appeal', ref: 'F-9999' }, 'jperez'); assert.match(sent.ref, /^F-\d{4}$/); assert.ok(sent.ref !== 'F-9999', 'a caller-supplied reference is ignored');
  r = await request('R-0416'); assert.eq(r.stage, 'appeal_sent'); assert.eq(r.appeal.status, 'sent'); assert.eq(r.appeal.ref, sent.ref); d = await dispute('R-0416'); assert.eq(d.docs.appeal.sent.via, 'fax'); assert.eq(d.docs.appeal.sent.ref, sent.ref);
  const e = (await state('jperez')).events.find(x => x.record === 'R-0416' && /Appeal letter sent through simulated Sfax · ref F-/.test(x.what)); assert.ok(e && e.sim === true && e.who === 'jperez');
});

await reset('canvas');
await T.test('E.C. appeal upheld closes the request; reconsideration upheld returns to the decision with the path marked tried', async () => {
  await api('dispute.choose', { id: 'R-0384', path: 'recon' }, 'jperez'); let d = await dispute('R-0384'); assert.eq(d.status, 'recon-prep'); assert.eq(d.path, 'recon');
  await api('dispute.genDoc', { id: 'R-0384', doc: 'recon' }, 'jperez'); d = await dispute('R-0384');
  for (const sec of d.docs.recon.sections.filter(x => x.missing.length)) await api('dispute.editDoc', { id: 'R-0384', doc: 'recon', section: sec.key, text: 'Clinician-written sentence.' }, 'jperez');
  await api('dispute.reviewDoc', { id: 'R-0384', doc: 'recon' }, 'jperez');
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0384', outcome: 'denied', doc_ref: 'letter' }, 'jperez'), /Send the reconsideration/);
  const first = await tryApi('dispute.send', { id: 'R-0384', doc: 'recon' }, 'jperez'); assert.ok(first.ok && first.result.needsRef, 'a portal payer asks for the confirmation the person sees');
  await api('dispute.send', { id: 'R-0384', doc: 'recon', ref: 'AV-445566' }, 'jperez'); d = await dispute('R-0384'); assert.eq(d.status, 'recon'); assert.eq(d.docs.recon.sent.manual, true, 'a typed confirmation says entered by a person');
  await api('dispute.resolve', { id: 'R-0384', outcome: 'denied', doc_ref: 'Anthem reconsideration letter Nov 12' }, 'jperez');
  d = await dispute('R-0384'); assert.eq(d.status, 'decide'); assert.eq(d.path, null); assert.ok(d.tried.includes('recon')); assert.eq(d.closed, null);
  await assert.refused(tryApi('dispute.choose', { id: 'R-0384', path: 'recon' }, 'jperez'), /already requested/);
  // accept the denial: the request closes with no appeal
  await api('dispute.choose', { id: 'R-0384', path: 'accept' }, 'jperez'); const s = await state('jperez');
  assert.eq(s.requests.find(r => r.id === 'R-0384').stage, 'closed'); assert.eq(s.disputes.find(x => x.request === 'R-0384').status, 'accepted');
});

await reset('canvas');
await T.test('T.N. peer-to-peer: held awaiting, then denied -> the case becomes a denial with the p2p path tried; then approved 150 elsewhere is overturned', async () => {
  await api('dispute.resolve', { id: 'R-0388', outcome: 'awaiting', notes: 'Call held' }, 'jperez');
  assert.eq((await request('R-0388')).stage, 'p2p_awaiting'); assert.eq((await dispute('R-0388')).status, 'p2p');
  await api('dispute.resolve', { id: 'R-0388', outcome: 'denied', doc_ref: 'Sentara p2p decision letter' }, 'jperez');
  const s = await state('jperez'); const d = s.disputes.find(x => x.request === 'R-0388');
  assert.eq(s.requests.find(r => r.id === 'R-0388').stage, 'denied'); assert.eq(d.issue, 'denial'); assert.eq(d.status, 'decide'); assert.ok(d.tried.includes('p2p')); assert.eq(d.closed, null);
  assert.ok(s.requests.find(r => r.id === 'R-0388').appeal_deadline, 'the appeal window starts from the notice');
  const cv = caseView(s, 'R-0388', { role: 'clinician', id: 'jperez' });
  assert.ok(cv.options.find(o => o.key === 'p2p' && !o.available && /not verified/i.test(o.why)), 'a peer-to-peer after a final denial says it is not verified');
  assert.ok(cv.options.find(o => o.key === 'recon').unverified, 'reconsideration is labelled');
});

await reset('canvas');
await T.test('T.N. p2p approved at 150 -> overturned (the 65 of 65 authorization is kept as history)', async () => {
  await api('dispute.resolve', { id: 'R-0388', outcome: 'approved', doc_ref: 'Sentara letter Dec 9' }, 'jperez');
  const s = await state('jperez'); const d = s.disputes.find(x => x.request === 'R-0388'); assert.eq(d.status, 'overturned'); assert.eq(s.requests.find(r => r.id === 'R-0388').units_awarded, 150);
  assert.eq(s.clients.find(c => c.id === 'TN').authorization_history.at(-1).units, 65);
});

await reset('canvas');
await T.test('evidence is dated, sourced and gated; missing items print "Evidence missing — verify …"; sensitive records stay out of drafts unless included', async () => {
  const s = await state('jperez'); const d = s.disputes.find(x => x.request === 'R-0402'); const r = s.requests.find(x => x.id === 'R-0402');
  const idx = evidenceIndex(s, d, r);
  assert.ok(idx.items.every(e => e.date && e.source), 'every record is dated and has a source');
  assert.ok(idx.needs.some(n => /previous treatment outcome/.test(n.label)), 'Evidence missing — verify previous treatment outcome');
  const sens = idx.items.find(e => e.kind === 'incident_report'); assert.eq(sens.state, 'sensitive'); assert.ok(!idx.usable.some(e => e.id === sens.id));
  const draft = docText(buildDoc(s, d, r, 'p2p'), 'p2p'); assert.noMatch(draft, /hospitali[sz]ation/i, 'the sensitive record is not in the draft');
  assert.match(draft, /two incidents of physical aggression \(Oct 5 and 14\) and one incident of elopement from class \(Oct 21\)/);
  assert.match(draft, /\[Evidence missing — verify previous treatment outcome\]/);
  assert.match(draft, /\(unverified demo assumption\)/, 'the run-out rate is shown with its assumption');
  await api('dispute.includeEvidence', { id: 'R-0402', ref: sens.id, include: true }, 'jperez');
  const s2 = await state('jperez'); assert.ok(evidenceIndex(s2, s2.disputes.find(x => x.request === 'R-0402'), r).usable.some(e => e.id === sens.id));
  assert.match(JSON.stringify(s2.disputes.find(x => x.request === 'R-0402').included), /EV-INC/);
});

await T.test('roles: admin sees status and deadlines but no clinical text; only a clinician works the case; DS and supervisor see nothing', async () => {
  const a = await state('dowens');
  assert.eq(a.disputes.length, 4, 'admin sees the queue'); assert.eq(a.dispute_evidence.length, 0, 'no evidence records'); assert.eq(a.request_details && Object.keys(a.request_details).length, 0);
  for (const d of a.disputes) { for (const doc of Object.values(d.docs || {})) assert.ok(!('sections' in doc), 'no draft text for admin'); assert.ok(!('excluded' in d) && !('included' in d)); }
  assert.noMatch(JSON.stringify(a.disputes), /Piedmont|physical aggression|hospital/i, 'no clinical words in the admin projection');
  assert.eq(queueRows(a, {}).length, 4, 'the queue selector works on the admin projection');
  // after some work on a case, the admin's queue still agrees with the clinician's row for row (status, next action, deadline)
  await api('dispute.genDoc', { id: 'R-0384', doc: 'appeal' }, 'jperez'); await api('dispute.choose', { id: 'R-0402', path: 'p2p' }, 'jperez');
  const cl = queueRows(await state('jperez'), { status: 'all' }), ad = queueRows(await state('dowens'), { status: 'all' });
  assert.deepEq(ad.map(r => [r.id, r.status, r.next.label, r.deadline && r.deadline.date]), cl.map(r => [r.id, r.status, r.next.label, r.deadline && r.deadline.date]), 'admin and clinician see the same queue');
  const cvA = caseView(a, 'R-0402', { role: 'admin', id: 'dowens' }); assert.ok(cvA.options.every(o => o.needsClinician));
  for (const who of ['khale', 'cdiaz']) { const x = await state(who); assert.eq(x.disputes.length, 0, who); assert.eq(x.dispute_evidence.length, 0, who); }
  for (const [act, args] of [['dispute.choose', { id: 'R-0402', path: 'p2p' }], ['dispute.genDoc', { id: 'R-0402', doc: 'p2p' }], ['dispute.reviewDoc', { id: 'R-0402', doc: 'p2p' }], ['dispute.send', { id: 'R-0408', doc: 'info' }], ['dispute.schedule', { id: 'R-0402', when: '2026-11-19T14:00' }], ['dispute.includeEvidence', { id: 'R-0402', ref: 'EV-DW-01', include: false }]]) {
    await assert.refused(tryApi(act, args, 'dowens'), /not allowed|needs/, 403);
    await assert.refused(tryApi(act, args, 'khale'), /not allowed|needs/, 403);
  }
  await assert.refused(tryApi('dispute.resolve', { id: 'R-0402', outcome: 'partial', units: 130, doc_ref: 'x-letter' }, 'khale'), /not allowed/, 403);
  await assert.refused(tryApi('dispute.choose', { id: 'R-0402', path: 'p2p' }), /Sign in/, 401);
  assert.ok((await tryApi('dispute.assign', { id: 'R-0402', owner: 'jperez', backup: 'cdiaz' }, 'dowens')).ok, 'admin may assign the owner (status, no clinical text)');
  await assert.refused(tryApi('dispute.assign', { id: 'R-0402', owner: 'cdiaz' }, 'dowens'), /licensed clinician/, 422);
  await assert.refused(tryApi('dispute.assign', { id: 'R-0402', owner: 'khale' }, 'jperez'), /licensed clinician/, 422);
});

await T.test('guardian: only the reviewed appeal letter of their own child; no dispute, evidence or other child', async () => {
  const gt = await guardianToken('EC'); const gs = await state(gt);
  assert.eq(gs.disputes.length, 0); assert.eq(gs.dispute_evidence.length, 0); assert.eq(gs.drafting_rules.length, 0);
  assert.ok(Object.keys(gs.appeal_drafts).every(k => k === 'R-0384'), 'own request only');
  const other = await guardianToken('TW'); assert.eq(Object.keys((await state(other)).appeal_drafts).length, 0, "another child's guardian sees no appeal draft");
});

await T.test('reconcile is idempotent and survives a day advance; no second case opens; presets both seed four cases', async () => {
  await reset('canvas'); const n0 = (await state('jperez')).disputes.length;
  await api('demo.advanceDay', {}, 'dowens+p'); await api('demo.advanceDay', {}, 'dowens+p');
  let s = await state('jperez'); assert.eq(s.disputes.length, n0); assert.ok(s.disputes.every(d => d.closed == null || d.outcome));
  const rows = queueRows(s, {}); assert.ok(rows.find(r => r.request === 'R-0408').deadline.sev === 'overdue', 'the 24-hour reply is shown as missed after the clock moves');
  await reset('live'); s = await state('jperez'); assert.eq(s.disputes.length, 4, 'live preset');
});

await T.test('the status is derived from the request, never stored out of step (selector agrees with the stored status for every case)', async () => {
  await reset('canvas'); const s = await state('jperez');
  for (const d of s.disputes) assert.eq(deriveStatus(s, d, s.requests.find(r => r.id === d.request)), d.status, d.id);
});

await T.done();
