// R5 · the workflow actions (server/psyflo/actions/x-workflows.js): create, save, enable, delete, confirm; their authority, validation, audit,
// versions, the locked guardrail, the two-person rule, the role projection and the bell.
// Standalone: `BASE=http://localhost:7400 node test/workflows-actions.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: only the administrator writes workflows (workflow.confirm: an administrator or a clinician); a workflow with a block, link or setting
// that is wrong is refused with 422 and what is wrong; the locked "Nothing is sent, called or filed on its own" guardrail is kept on every save
// whatever the page sends; every save bumps the version and adds a history entry; enable refuses an invalid workflow; delete needs a reason; with
// the "A second person must agree" guardrail a saved change waits in `pending` until a DIFFERENT administrator or clinician approves or declines it
// (the proposer cannot); the projection (administrator all, other staff only the enabled ones without history or pending, portal actors none);
// every action writes an audit event; and the bell shows a workflow item for the right role after enabling and not after disabling.
import { suite, assert, api, tryApi, state, reset, session, login, playwright, errors, sleep, BASE, SHOTS } from './lib/index.mjs';
import { LOCKED_ID } from '../web/js/shared/workflows/engine.js';
import { notificationsFor } from '../web/js/shared/sel/notify.js';

const T = suite('workflows-actions');
await reset('canvas');
const actor = async who => (await session(who)).actor;
const wfs = async (who = 'dowens') => (await state(who)).workflows;
const wfOf = async (id, who = 'dowens') => (await wfs(who)).find(w => w.id === id);
const events = async () => (await state('dowens')).events.filter(e => e.record === 'workflows');
const clone = o => JSON.parse(JSON.stringify(o));
const edit = (w, fn) => { const c = clone(w); fn(c); return c; };
const mk = (id, block, params = {}, rules = []) => ({ id, block, x: 0, y: 0, params, rules });
const wire = (nodes, links) => ({ nodes, edges: links.map(([from, to, port = 'out'], i) => ({ id: 'e' + (i + 1), from, to, port })) });

// ------------------------------------------------------------------------------------------------------------------ authority
await T.test('authority: only the administrator creates, saves, enables or deletes a workflow (403 for clinician, supervisor, direct support); anonymous is 401', async () => {
  for (const who of ['jperez', 'cdiaz', 'khale']) {
    for (const [action, args] of [['workflow.create', { name: 'Nope' }], ['workflow.save', { id: 'wf-late-notes', workflow: {} }], ['workflow.enable', { id: 'wf-late-notes', enabled: true }], ['workflow.delete', { id: 'wf-late-notes', reason: 'not mine' }]]) {
      await assert.refused(tryApi(action, args, who), /not allowed to do this/i, 403);
    }
  }
  await assert.refused(tryApi('workflow.create', { name: 'Nope' }, null), /Sign in/i, 401);
  assert.eq((await wfs()).length, 5, 'nothing was written');
  await assert.refused(tryApi('workflow.confirm', { id: 'wf-late-notes' }, 'cdiaz'), /not allowed to do this/i, 403); await assert.refused(tryApi('workflow.confirm', { id: 'wf-late-notes' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('workflow.confirm', { id: 'wf-late-notes' }, { portalToken: 'tw-demo' }), null, 403);
});

// ------------------------------------------------------------------------------------------------------------------ create
await T.test('create: blank (off, with only the locked guardrail), duplicate of a workflow, from a template key; a name is required; unknown source is 404; every create is audited', async () => {
  const n0 = (await events()).length;
  const a = await api('workflow.create', { name: '  My   new workflow ', description: 'A draft' }, 'dowens'); assert.match(a.id, /^wf-[0-9a-z]{4}$/);
  const w = await wfOf(a.id); assert.eq(w.name, 'My new workflow'); assert.eq(w.enabled, false); assert.eq(w.version, 1); assert.deepEq(w.nodes.map(n => n.block), [LOCKED_ID]); assert.deepEq(w.edges, []);
  assert.deepEq([w.history.length, w.history[0].by, w.history[0].note, w.updated_by], [1, 'dowens', 'Created', 'dowens']); assert.ok(w.updated_at);
  const b = await api('workflow.create', { name: 'Units copy', from: 'wf-units-low' }, 'dowens'); const copy = await wfOf(b.id); const src = await wfOf('wf-units-low');
  assert.deepEq([copy.nodes, copy.edges], [src.nodes, src.edges], 'a duplicate has the same graph'); assert.eq(copy.enabled, false); assert.match(copy.history[0].note, /Copied from Units running low/);
  const c = await api('workflow.create', { from: 'evidence-gaps' }, 'dowens'); const tpl = await wfOf(c.id); assert.eq(tpl.name, 'Evidence gaps before a renewal (copy)'); assert.eq(tpl.nodes.length, 6); assert.eq(tpl.enabled, false);
  await assert.refused(tryApi('workflow.create', { name: '' }, 'dowens'), /Give the workflow a name/, 422); await assert.refused(tryApi('workflow.create', { name: 'x' }, 'dowens'), /Give the workflow a name/, 422);
  await assert.refused(tryApi('workflow.create', { name: 'Ghost', from: 'no-such' }, 'dowens'), /not there/, 404);
  const ev = (await events()).slice(n0); assert.eq(ev.length, 3, 'one audit event per create'); assert.ok(ev.every(e => e.who === 'dowens' && e.actor_kind === 'person' && e.record === 'workflows' && e.at));
  assert.match(ev[0].what, /^Workflow created: My new workflow · off$/); assert.match(ev[1].what, /copied from Units running low/);
  for (const id of [a.id, b.id, c.id]) await api('workflow.delete', { id, reason: 'test cleanup' }, 'dowens');
});

// ------------------------------------------------------------------------------------------------------------------ save
await T.test('save: version + 1 and a history entry with who, when and the note; the audit event says what changed; an identical save changes nothing', async () => {
  const w0 = await wfOf('wf-late-notes'); assert.eq(w0.version, 1); const n0 = (await events()).length;
  const w1 = edit(w0, w => { w.nodes.find(n => n.id === 'g1').params.n = 3; w.description = 'Three a day'; });
  const r = await api('workflow.save', { id: 'wf-late-notes', workflow: w1, note: '  Fewer alerts  ' }, 'dowens'); assert.eq(r.version, 2); assert.deepEq(r.problems, []);
  const w = await wfOf('wf-late-notes'); assert.eq(w.version, 2); assert.eq(w.nodes.find(n => n.id === 'g1').params.n, 3); assert.eq(w.description, 'Three a day');
  assert.eq(w.history.length, 2); assert.deepEq([w.history[1].version, w.history[1].by, w.history[1].note], [2, 'dowens', 'Fewer alerts']); assert.ok(w.history[1].at); assert.eq(w.updated_by, 'dowens'); assert.eq(w.enabled, false, 'a save does not turn it on');
  const ev = (await events()).slice(n0); assert.eq(ev.length, 1); assert.match(ev[0].what, /^Workflow saved: Late notes · v2 · 1 block changed, description changed \(Fewer alerts\)$/); assert.eq(ev[0].who, 'dowens');
  const again = await api('workflow.save', { id: 'wf-late-notes', workflow: w, note: 'same' }, 'dowens'); assert.eq(again.unchanged, true); assert.eq(again.version, 2); assert.eq((await events()).length, n0 + 1, 'no event for no change');
  assert.eq((await wfOf('wf-late-notes')).history.length, 2);
  const w3 = edit(w, c => { c.name = 'Late notes v3'; c.nodes.find(n => n.id === 't1').x += 20; }); const r3 = await api('workflow.save', { id: 'wf-late-notes', workflow: w3 }, 'dowens'); assert.eq(r3.version, 3);
  assert.eq((await wfOf('wf-late-notes')).name, 'Late notes v3'); assert.match((await events()).at(-1).what, /renamed/);
  await api('workflow.save', { id: 'wf-late-notes', workflow: { ...w, name: 'Late notes' }, note: 'back' }, 'dowens');
});
await T.test('save keeps the locked guardrail on every save: dropped, moved, given settings, doubled or linked, there is exactly one with no links and no settings', async () => {
  const w0 = await wfOf('wf-late-notes'); const locked0 = w0.nodes.find(n => n.block === LOCKED_ID); assert.ok(locked0);
  // 1. the page drops it
  const dropped = edit(w0, w => { w.nodes = w.nodes.filter(n => n.block !== LOCKED_ID); w.description = 'dropped'; });
  await api('workflow.save', { id: 'wf-late-notes', workflow: dropped }, 'dowens'); let w = await wfOf('wf-late-notes');
  assert.eq(w.nodes.filter(n => n.block === LOCKED_ID).length, 1, 'put back'); assert.deepEq(w.nodes.find(n => n.block === LOCKED_ID).params, {});
  // 2. the page doubles it, gives it settings and a link
  const abused = edit(w, c => { c.description = 'abused'; c.nodes.push({ id: 'second-lock', block: LOCKED_ID, x: 0, y: 0, params: { off: true }, rules: ['units.warn_used_pct'] }); c.nodes.find(n => n.block === LOCKED_ID).params = { off: true }; c.edges.push({ id: 'ex', from: 'second-lock', to: 'a1', port: 'out' }); });
  await api('workflow.save', { id: 'wf-late-notes', workflow: abused }, 'dowens'); w = await wfOf('wf-late-notes');
  assert.eq(w.nodes.filter(n => n.block === LOCKED_ID).length, 1); assert.deepEq(w.nodes.find(n => n.block === LOCKED_ID).params, {}); assert.deepEq(w.nodes.find(n => n.block === LOCKED_ID).rules, []); assert.ok(!w.edges.some(e => e.id === 'ex'));
  // 3. a link into it is refused as a validation error only if it survives normalisation: a link from a block into the locked one is dropped, never stored
  const into = edit(w, c => { c.description = 'into'; c.edges.push({ id: 'ey', from: 'a1', to: LOCKED_ID, port: 'out' }); });
  await api('workflow.save', { id: 'wf-late-notes', workflow: into }, 'dowens'); w = await wfOf('wf-late-notes'); assert.ok(!w.edges.some(e => e.to === LOCKED_ID || e.from === LOCKED_ID), 'the locked guardrail has no links');
  // 4. a brand-new blank workflow already has it, and a save with no nodes at all is refused for the missing trigger (the locked one is not enough)
  const blank = await api('workflow.create', { name: 'Blank one' }, 'dowens'); assert.eq((await wfOf(blank.id)).nodes.filter(n => n.block === LOCKED_ID).length, 1);
  await assert.refused(tryApi('workflow.save', { id: blank.id, workflow: { name: 'Blank one', nodes: [], edges: [] } }, 'dowens'), /Add a "When" block/, 422);
  assert.eq((await wfOf(blank.id)).nodes.filter(n => n.block === LOCKED_ID).length, 1); await api('workflow.delete', { id: blank.id, reason: 'cleanup' }, 'dowens');
});
await T.test('save refuses with 422 and says what is wrong: no trigger, unknown block, a link to nothing, a cycle, an unreachable block, a setting out of range, an unknown rule, a bad name', async () => {
  const w0 = await wfOf('wf-late-notes'); const v0 = w0.version; const bad = (fn, re) => assert.refused(tryApi('workflow.save', { id: 'wf-late-notes', workflow: edit(w0, fn) }, 'dowens'), re, 422).then(j => { assert.eq(j.code, 'workflow_invalid'); return j; });
  const j = await bad(w => { w.nodes = w.nodes.filter(n => n.id !== 't1'); w.edges = []; }, /This workflow cannot be saved yet: .*Add a "When" block/);
  assert.match(j.error, /Notify is not connected/);
  await bad(w => w.nodes.push({ id: 'z', block: 'send_fax', x: 0, y: 0, params: {}, rules: [] }), /Unknown block "send_fax"/);
  await bad(w => w.edges.push({ id: 'ez', from: 'a1', to: 'ghost', port: 'out' }), /goes to a block that is not there/);
  await bad(w => { w.nodes.push(mk('b1', 'notify', { roles: ['supervisor'], message: 'x' })); w.edges.push({ id: 'eb1', from: 'a1', to: 'b1', port: 'out' }, { id: 'eb2', from: 'b1', to: 'a1', port: 'out' }); }, /go round in a circle/);
  await bad(w => w.nodes.push(mk('lost', 'notify', { roles: ['supervisor'], message: 'x' })), /Notify is not connected to a "When" block/);
  await bad(w => (w.nodes.find(n => n.id === 'g1').params.n = 99), /At most must be between 1 and 50/);
  await bad(w => (w.nodes.find(n => n.id === 'a1').params.roles = ['pilot']), /Who must be chosen from the roles/);
  await bad(w => (w.nodes.find(n => n.id === 't1').rules = ['no.such.rule']), /"no\.such\.rule" is not in the rules table/);
  await assert.refused(tryApi('workflow.save', { id: 'wf-late-notes', workflow: edit(w0, w => (w.name = 'x')) }, 'dowens'), /Give the workflow a name/, 422);
  await bad(w => (w.nodes.find(n => n.id === 'a1').id = 'bad id'), /block id may use/);
  await assert.refused(tryApi('workflow.save', { id: 'wf-late-notes', workflow: 'nope' }, 'dowens'), /Send the workflow/, 422); await assert.refused(tryApi('workflow.save', { id: 'wf-ghost', workflow: w0 }, 'dowens'), /not there any more/, 404);
  await assert.refused(tryApi('workflow.save', { id: 'wf-late-notes', workflow: { ...w0, nodes: Array.from({ length: 70 }, (_, i) => mk('x' + i, 'notify')).concat(w0.nodes) } }, 'dowens'), /up to 60 blocks/, 422);
  assert.eq((await wfOf('wf-late-notes')).version, v0, 'nothing was saved');
  const many = (await events()).filter(e => /Refused/.test(e.what)); assert.eq(many.length, 0, 'plain validation refusals are not audit noise');
});
await T.test('a warning does not stop a save: it comes back with the result (a Yes exit that leads nowhere)', async () => {
  const w0 = await wfOf('wf-units-low'); const w = edit(w0, c => { c.edges = c.edges.filter(e => e.port !== 'no'); c.nodes = c.nodes.filter(n => n.id !== 'a2'); });
  const r = await api('workflow.save', { id: 'wf-units-low', workflow: w }, 'dowens'); assert.ok(r.problems.some(p => p.level === 'warn' && /"No" exit of Units left leads nowhere/.test(p.text))); assert.eq(r.version, 2);
});

// ------------------------------------------------------------------------------------------------------------------ enable and the bell
await T.test('enable: refuses a workflow with validation errors (a blank one), turns a valid one on and off, audits both; the bell shows the workflow item for the named role only while it is on', async () => {
  const blank = await api('workflow.create', { name: 'Needs a trigger' }, 'dowens');
  await assert.refused(tryApi('workflow.enable', { id: blank.id, enabled: true }, 'dowens'), /cannot be turned on yet: .*Add a "When" block/, 422); assert.eq((await wfOf(blank.id)).enabled, false);
  await api('workflow.delete', { id: blank.id, reason: 'cleanup' }, 'dowens');
  await assert.refused(tryApi('workflow.enable', { id: 'wf-ghost', enabled: true }, 'dowens'), /not there any more/, 404);
  const sup = await actor('cdiaz'), clin = await actor('jperez'); const items = async who => (await notificationsFor(await state(who), await actor(who))).filter(n => n.kind === 'workflow');
  const supBefore = (await items('cdiaz')).filter(n => n.source.workflow === 'wf-units-low'); assert.eq(supBefore.length, 0, 'off: nothing');
  assert.eq((await wfs('cdiaz')).some(w => w.id === 'wf-units-low'), false, 'a workflow that is off is not even sent to the supervisor');
  const n0 = (await events()).length; const on = await api('workflow.enable', { id: 'wf-units-low', enabled: true }, 'dowens'); assert.deepEq(on, { id: 'wf-units-low', enabled: true });
  const supOn = (await items('cdiaz')).filter(n => n.source.workflow === 'wf-units-low'); assert.eq(supOn.length, 3, 'M.R., S.B. and T.N. (units at or past the warning level)');
  assert.ok(supOn.every(n => n.group === 'Workflows' && n.read === false && /^wf:wf-units-low:(MR|SB|TN):a[12]$/.test(n.id)), supOn.map(n => n.id).join(' '));
  assert.deepEq((await items('jperez')).filter(n => n.source.workflow === 'wf-units-low'), [], 'the clinician is not a role of this workflow'); assert.deepEq((await items('khale')), [], 'direct support: none');
  const unreadOn = notificationsFor(await state('cdiaz'), sup).filter(n => !n.read).length;
  await api('notify.read', { ids: [supOn[0].id] }, 'cdiaz'); assert.eq(notificationsFor(await state('cdiaz'), sup).filter(n => !n.read).length, unreadOn - 1, 'a workflow item is read like any other');
  assert.deepEq(await api('workflow.enable', { id: 'wf-units-low', enabled: true }, 'dowens'), { id: 'wf-units-low', enabled: true }, 'turning on twice is a no-op');
  await api('workflow.enable', { id: 'wf-units-low', enabled: false }, 'dowens');
  assert.deepEq((await items('cdiaz')).filter(n => n.source.workflow === 'wf-units-low'), [], 'off again: gone from the bell'); assert.eq(clin.role, 'clinician'); assert.eq(sup.role, 'supervisor');
  const ev = (await events()).slice(n0); assert.deepEq(ev.map(e => e.what), ['Workflow turned on: Units running low', 'Workflow turned off: Units running low']); assert.ok(ev.every(e => e.who === 'dowens'));
});

// ------------------------------------------------------------------------------------------------------------------ delete
await T.test('delete: needs a reason of four or more characters, removes the workflow, audits who and why; a missing workflow is 404', async () => {
  const a = await api('workflow.create', { name: 'Delete me' }, 'dowens');
  await assert.refused(tryApi('workflow.delete', { id: a.id }, 'dowens'), /Say why the workflow is deleted/, 422); await assert.refused(tryApi('workflow.delete', { id: a.id, reason: ' a ' }, 'dowens'), /Say why/, 422);
  assert.ok(await wfOf(a.id), 'still there'); const n0 = (await events()).length;
  assert.deepEq(await api('workflow.delete', { id: a.id, reason: 'Not needed any more' }, 'dowens'), { id: a.id }); assert.eq(await wfOf(a.id), undefined);
  const ev = (await events()).slice(n0); assert.eq(ev.length, 1); assert.eq(ev[0].what, 'Workflow deleted: Delete me (Not needed any more)'); assert.eq(ev[0].who, 'dowens');
  await assert.refused(tryApi('workflow.delete', { id: a.id, reason: 'again please' }, 'dowens'), /not there any more/, 404);
  const on = await wfOf('wf-partial-offer'); assert.eq(on.enabled, true); await api('workflow.delete', { id: 'wf-followup-day', reason: 'Replaced by the evidence workflow' }, 'dowens');
  assert.deepEq((await wfs()).map(w => w.id), ['wf-partial-offer', 'wf-units-low', 'wf-late-notes', 'wf-evidence-gaps'], 'an enabled workflow can be deleted too');
});
await T.test('there can be up to 40 workflows', async () => {
  let made = 0; for (; made < 60; made++) { const j = await tryApi('workflow.create', { name: 'Filler ' + made }, 'dowens'); if (!j.ok) { assert.eq(j.status, 422); assert.match(j.error, /up to 40 workflows/); assert.eq(j.code, 'workflow_limit'); break; } }
  const all = await wfs(); assert.eq(all.length, 40); for (const w of all.filter(w => /^Filler/.test(w.name))) await api('workflow.delete', { id: w.id, reason: 'cleanup after the limit test' }, 'dowens');
  assert.eq((await wfs()).length, 4);
});

// ------------------------------------------------------------------------------------------------------------------ two-person
await T.test('two-person: a change to a workflow with the "second person" guardrail waits in pending (the live version stays), the proposer cannot confirm, a clinician can, the history says who proposed and who confirmed', async () => {
  const c = await api('workflow.create', { name: 'Guarded alerts', from: 'wf-late-notes' }, 'dowens'); const id = c.id; const w0 = await wfOf(id);
  const guarded = edit(w0, w => { w.nodes.push(mk('g9', 'two_person')); w.edges = [{ id: 'e1', from: 't1', to: 'g1', port: 'out' }, { id: 'e2', from: 'g1', to: 'g9', port: 'out' }, { id: 'e3', from: 'g9', to: 'a1', port: 'out' }]; });
  const n0 = (await events()).length; const r = await api('workflow.save', { id, workflow: guarded, note: 'Add the second-person guardrail' }, 'dowens');
  assert.eq(r.pending, true); assert.eq(r.version, 1, 'the live version did not change');
  let w = await wfOf(id); assert.eq(w.version, 1); assert.ok(!w.nodes.some(n => n.id === 'g9'), 'the live graph is the old one'); assert.ok(w.pending && w.pending.by === 'dowens' && w.pending.version === 2 && w.pending.workflow.nodes.some(n => n.id === 'g9'));
  assert.match((await events()).at(-1).what, /^Workflow change proposed: Guarded alerts · 1 block added, 2 links added, 1 link removed · needs a second person to confirm$/); assert.eq((await events()).length, n0 + 1);
  // who sees what
  const cl = await state('jperez'); assert.ok(!cl.workflows.some(x => x.id === id), 'a clinician reads enabled workflows only'); const conf = cl.workflow_confirmations.find(x => x.id === id);
  assert.deepEq([conf.name, conf.by, conf.changes, conf.version], ['Guarded alerts', 'dowens', '1 block added, 2 links added, 1 link removed', 2]); assert.ok(!('workflow' in conf) && !('nodes' in conf), 'the clinician gets a summary, not the graph');
  assert.deepEq((await state('cdiaz')).workflow_confirmations, []); assert.deepEq((await state('khale')).workflow_confirmations, []); assert.eq((await state('dowens')).workflow_confirmations.length, 1);
  // the proposer cannot confirm; nobody else without the capability can
  const own = await assert.refused(tryApi('workflow.confirm', { id, decision: 'approve' }, 'dowens'), /A different person must confirm/, 403); assert.eq(own.code, 'two_person');
  assert.ok((await events()).some(e => /^Refused · A different person must confirm a workflow change\.$/.test(e.what) && e.who === 'dowens'), 'the refusal is audited');
  await assert.refused(tryApi('workflow.confirm', { id, decision: 'approve' }, 'dowens+p'), /A different person/, 403);
  await assert.refused(tryApi('workflow.confirm', { id, decision: 'approve' }, 'cdiaz'), /not allowed/, 403);
  await assert.refused(tryApi('workflow.confirm', { id, decision: 'maybe' }, 'jperez'), /Choose approve or decline/, 422);
  // another save while one waits: the proposer may replace it, nobody else may
  await assert.refused(tryApi('workflow.save', { id, workflow: edit(w0, c2 => (c2.description = 'other')) }, 'jperez'), /not allowed/, 403);
  // a clinician approves
  const ok = await api('workflow.confirm', { id, decision: 'approve' }, 'jperez'); assert.deepEq(ok, { id, status: 'approved', version: 2 });
  w = await wfOf(id); assert.eq(w.version, 2); assert.ok(w.nodes.some(n => n.id === 'g9'), 'now live'); assert.ok(!w.pending); assert.deepEq((await state('dowens')).workflow_confirmations, []);
  assert.deepEq([w.history.length, w.history[1].version, w.history[1].by, w.history[1].confirmed_by, w.history[1].note], [2, 2, 'dowens', 'jperez', 'Add the second-person guardrail']);
  assert.match((await events()).at(-1).what, /^Workflow change approved: Guarded alerts · v2 · .* · proposed by .+$/); assert.eq((await events()).at(-1).who, 'jperez');
  await assert.refused(tryApi('workflow.confirm', { id, decision: 'approve' }, 'jperez'), /Nothing is waiting/, 409);
  // the guardrail now governs every later change: a second proposal, declined
  const next = edit(w, c2 => (c2.nodes.find(n => n.id === 'g1').params.n = 2)); const r2 = await api('workflow.save', { id, workflow: next, note: 'Two a day' }, 'dowens'); assert.eq(r2.pending, true);
  const liveN = (await wfOf(id)).nodes.find(n => n.id === 'g1').params.n; assert.eq(liveN, 3, 'live is untouched (the copy came from Late notes, saved with 3 a day above)');
  const re = await api('workflow.save', { id, workflow: edit(next, c2 => (c2.nodes.find(n => n.id === 'g1').params.n = 4)), note: 'Four a day' }, 'dowens'); assert.eq(re.pending, true); assert.eq((await wfOf(id)).pending.workflow.nodes.find(n => n.id === 'g1').params.n, 4, 'the proposer replaced their own proposal');
  assert.eq((await state('dowens')).workflow_confirmations.length, 1, 'still one waiting');
  const wd = await api('workflow.save', { id, workflow: await wfOf(id) }, 'dowens'); assert.eq(wd.withdrawn, true); assert.ok(!(await wfOf(id)).pending); assert.deepEq((await state('jperez')).workflow_confirmations, [], 'saving the live graph again withdraws the waiting change');
  assert.match((await events()).at(-1).what, /^Workflow change withdrawn: Guarded alerts · back to v2$/);
  await api('workflow.save', { id, workflow: next, note: 'Two a day again' }, 'dowens');
  const no = await api('workflow.confirm', { id, decision: 'decline' }, 'jperez'); assert.deepEq(no, { id, status: 'declined', version: 2 });
  w = await wfOf(id); assert.eq(w.version, 2); assert.eq(w.nodes.find(n => n.id === 'g1').params.n, 3); assert.ok(!w.pending); assert.match((await events()).at(-1).what, /^Workflow change declined: Guarded alerts · proposed by /);
  await api('workflow.delete', { id, reason: 'cleanup after the two-person test' }, 'dowens'); assert.deepEq((await state('jperez')).workflow_confirmations, []);
});
await T.test('two-person: removing the guardrail is a guarded change too, and a pending change blocks other people\'s saves (409) but not a decision', async () => {
  const c = await api('workflow.create', { name: 'Second pair', from: 'wf-late-notes' }, 'dowens'); const id = c.id; const w0 = await wfOf(id);
  const g = edit(w0, w => { w.nodes.push(mk('g9', 'two_person')); w.edges = [{ id: 'e1', from: 't1', to: 'g9', port: 'out' }, { id: 'e2', from: 'g9', to: 'g1', port: 'out' }, { id: 'e3', from: 'g1', to: 'a1', port: 'out' }]; });
  await api('workflow.save', { id, workflow: g }, 'dowens'); await api('workflow.confirm', { id, decision: 'approve' }, 'jperez'); const live = await wfOf(id); assert.ok(live.nodes.some(n => n.id === 'g9'));
  const drop = edit(live, w => { w.nodes = w.nodes.filter(n => n.id !== 'g9'); w.edges = [{ id: 'e1', from: 't1', to: 'g1', port: 'out' }, { id: 'e3', from: 'g1', to: 'a1', port: 'out' }]; });
  const r = await api('workflow.save', { id, workflow: drop, note: 'Remove it' }, 'dowens'); assert.eq(r.pending, true, 'you cannot remove the second-person guardrail on your own');
  assert.ok((await wfOf(id)).nodes.some(n => n.id === 'g9'), 'still live');
  await api('workflow.confirm', { id, decision: 'approve' }, 'jperez'); assert.ok(!(await wfOf(id)).nodes.some(n => n.id === 'g9'), 'a second person agreed');
  const plain = edit(await wfOf(id), w => (w.description = 'plain')); const r2 = await api('workflow.save', { id, workflow: plain }, 'dowens'); assert.ok(!r2.pending, 'without the guardrail a save is live at once'); assert.eq(r2.version, 4);
  await api('workflow.delete', { id, reason: 'cleanup' }, 'dowens');
});

// ------------------------------------------------------------------------------------------------------------------ projection
await T.test('projection: the administrator reads every workflow with its history; supervisor, clinician and direct support read the enabled ones without history or pending; portal actors read none', async () => {
  const adm = await wfs('dowens'); assert.ok(adm.length >= 4 && adm.some(w => !w.enabled) && adm.every(w => Array.isArray(w.history) && w.history.length >= 1));
  const enabled = adm.filter(w => w.enabled).map(w => w.id); assert.ok(enabled.includes('wf-partial-offer'));
  for (const who of ['jperez', 'cdiaz', 'khale', 'slane']) {
    const w = await wfs(who); assert.deepEq(w.map(x => x.id), enabled, who + ': the enabled ones'); assert.ok(w.every(x => x.enabled && !('history' in x) && !('pending' in x)), who + ': no history, no pending');
    assert.ok(w.every(x => Array.isArray(x.nodes) && Array.isArray(x.edges)), 'the bell needs the graph');
  }
  assert.deepEq((await state({ portalToken: 'tw-demo' })).workflows, [], 'a guardian'); assert.deepEq((await state({ portalToken: 'sch-rbell-demo' })).workflows, [], 'a school user');
  assert.deepEq((await state({ portalToken: 'tw-demo' })).workflow_confirmations, []); assert.deepEq((await state({ portalToken: 'sch-rbell-demo' })).workflow_confirmations, []);
  const s = await state('dowens'); const sup = await state('cdiaz'); assert.ok(!JSON.stringify([sup.workflows, sup.workflow_confirmations]).includes('Second pair'), 'no definition of a workflow that is off or gone');
  assert.ok(s.workflows.length >= 4);
});
await T.test('audit: every write is an event with who, when and the record "workflows", and the event text carries no message text from a workflow', async () => {
  const ev = await events(); assert.ok(ev.length >= 15, 'events: ' + ev.length);
  for (const e of ev) { assert.ok(e.at && e.who && e.what, JSON.stringify(e)); assert.ok(/^(Workflow |Refused · )/.test(e.what), e.what); assert.ok(['dowens', 'jperez'].includes(e.who), e.who); }
  assert.ok(!ev.some(e => /\{patient\}|\{payer\}/.test(e.what)), 'no template text in the audit');
  const adm = await state('dowens'); assert.ok(adm.events.filter(e => e.record === 'workflows').length === ev.length);
  const sup = await state('cdiaz'); assert.ok(sup.events.every(e => e.record !== 'workflows' || !/"/.test(e.what)), 'nothing in the event text is masked by the privacy filter');
});

// ------------------------------------------------------------------------------------------------------------------ the bell on screen
const { chromium } = playwright(); const b = await chromium.launch();
const mkPage = async (as, w = 1440, h = 900) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
const openBell = async p => { await p.locator('[data-topbar="bell"]').click(); await p.waitForSelector('.bell'); await sleep(400); };
try {
  await T.test('bell: the clinician sees a Workflows group with "From workflow: <name>" and a "Needs your confirmation" mark; the supervisor sees the notice without the mark; turning the workflow off removes them live', async () => {
    await reset('canvas'); const { p, errs } = await mkPage('jperez'); await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900); await openBell(p);
    const groups = await p.locator('.bell__g').allInnerTexts(); assert.ok(groups.some(g => /^Workflows/.test(g)), groups.join('|'));
    const item = p.locator('.bell__i[data-kind="workflow"]'); assert.eq(await item.count(), 1);
    const txt = await item.innerText(); assert.match(txt, /Decide on the partial offer for D\.W\. · Sentara \(reply by Oct 30\)/); assert.match(txt, /From workflow: Partial offer needs a decision/); assert.match(txt, /Needs your confirmation/); assert.match(txt, /Task · /);
    assert.match(await item.locator('a.bell__t').getAttribute('href'), /#\/(DenialCase|Authorization)\?id=R-0402/); assert.eq(await item.locator('[data-bell-from]').count(), 1);
    await item.scrollIntoViewIfNeeded(); await sleep(200); await p.screenshot({ path: SHOTS + '/r5-bell-workflows-1440.png' });
    assert.eq(await item.getByRole('button', { name: /^Confirm: Decide on the partial offer/ }).count(), 1, 'the person in the guardrail\'s role confirms with a Confirm button');
    await item.getByRole('button', { name: /^Confirm: / }).click(); await p.waitForTimeout(900);
    const after = await p.locator('.bell__i[data-kind="workflow"]').innerText(); assert.noMatch(after, /Needs your confirmation/, 'confirmed: the mark is gone'); assert.eq(await p.locator('.bell__i[data-kind="workflow"] button').count(), 0, 'and the item is read');
    await api('workflow.enable', { id: 'wf-partial-offer', enabled: false }, 'dowens'); await p.waitForTimeout(1500);
    assert.eq(await p.locator('.bell__i[data-kind="workflow"]').count(), 0, 'off: the item leaves the open drawer'); assert.ok(!(await p.locator('.bell__g').allInnerTexts()).some(g => /^Workflows/.test(g)));
    await api('workflow.enable', { id: 'wf-partial-offer', enabled: true }, 'dowens'); await p.waitForTimeout(1500); assert.eq(await p.locator('.bell__i[data-kind="workflow"]').count(), 1, 'on again: it is back');
    assert.deepEq(errs.filter(x => !/Parent|MyWork|LANG_OFF|DenialIntelligence|DenialCase/.test(x)), []); await p.context().close();
    const s = await mkPage('cdiaz'); await s.p.goto(BASE + '/#/Authorizations'); await s.p.waitForTimeout(900); await openBell(s.p);
    const st = await s.p.locator('.bell__i[data-kind="workflow"]').innerText(); assert.match(st, /D\.W\. · Sentara offered part of the units: a clinician decides/); assert.match(st, /From workflow: Partial offer needs a decision/); assert.noMatch(st, /Needs your confirmation/); await s.p.context().close();
  });
  await T.test('bell at 390 px: the workflow item fits (no horizontal page scroll) and its link and Mark read targets are at least 24 px', async () => {
    await reset('canvas'); const { p } = await mkPage('jperez', 390, 800); await p.goto(BASE + '/#/Authorizations'); await p.waitForTimeout(900); await openBell(p);
    const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); assert.ok(w.sw <= w.cw + 1, JSON.stringify(w));
    const box = await p.locator('.bell__i[data-kind="workflow"] button').first().boundingBox(); assert.ok(box.height >= 24 && box.width >= 24, JSON.stringify(box));
    await p.locator('.bell__i[data-kind="workflow"]').first().scrollIntoViewIfNeeded(); await sleep(200); await p.screenshot({ path: SHOTS + '/r5-bell-workflows-390.png' });
    await p.context().close();
  });
} finally { await b.close(); }

await T.test('a rule-bound number is the rule: editing units.warn_used_pct through settings.rule changes what the workflow shows in the bell (and the Dashboard warning with it)', async () => {
  await api('workflow.enable', { id: 'wf-units-low', enabled: true }, 'dowens');
  const items = async () => notificationsFor(await state('cdiaz'), await actor('cdiaz')).filter(n => n.source && n.source.workflow === 'wf-units-low').map(n => n.id);
  assert.eq((await items()).length, 3);
  await api('settings.rule', { key: 'units.warn_used_pct', value: 90, reason: 'Test: raise the warning level' }, 'dowens');
  assert.deepEq(await items(), ['wf:wf-units-low:TN:a1'], 'only T.N. (no units left) is past 90%');
  await api('settings.rule', { key: 'units.warn_used_pct', reset: true, reason: 'Test: back to the default' }, 'dowens'); assert.eq((await items()).length, 3);
  const w = await wfOf('wf-units-low'); assert.eq(w.nodes.find(n => n.block === 'units_used').params.pct, 75, 'the stored copy is untouched: the rule is the source');
});

// ------------------------------------------------------------------------------------------------------------------ reset
await T.test('a reset rebuilds the five seeded workflows (two on) and clears pending confirmations', async () => {
  await reset('canvas'); const w = await wfs(); assert.eq(w.length, 5); assert.deepEq(w.filter(x => x.enabled).map(x => x.id), ['wf-partial-offer', 'wf-followup-day']); assert.deepEq((await state('dowens')).workflow_confirmations, []);
  assert.ok(w.every(x => x.version === 1));
});

await T.done();
