// R5 · the workflow engine (web/js/shared/workflows/engine.js): pure, deterministic, never writes.
// Standalone: `BASE=http://localhost:7400 node test/workflows-engine.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves, on the real demo state (the clinician's full projection of the Oct 29 canvas) and small fixtures made from it: every block of the catalog
// (6 triggers, 6 conditions, 3 actions, 7 guardrails), branching (Yes / No, fan-out, chains), the guardrails (roles only, person confirms, alert
// limit, source required, evidence required), validate (every error and warning class), tidy (grid, left to right, Yes above No, the locked
// guardrail bottom right), determinism and "no writes" (a deep-frozen state and workflow), the bell items per role (direct support only their own
// patients, portal actors none), that the engine gives the same answer from the clinician, supervisor and administrator projections, and that the
// five seeded workflows are valid, laid out on the grid and the same graphs as the templates.
import { suite, assert, state, reset, session } from './lib/index.mjs';
import { BLOCKS, KINDS, GRID, portsOf, defaultParams, byKind } from '../web/js/shared/workflows/catalog.js';
import { validate, run, workflowItems, tidy, newId, normalize, ensureLocked, effectiveParams, LOCKED_ID } from '../web/js/shared/workflows/engine.js';
import { TEMPLATES } from '../web/js/shared/workflows/templates.js';
import { notificationsFor } from '../web/js/shared/sel/notify.js';

const T = suite('workflows-engine');
await reset('canvas');
const base = await state('jperez');
const S = () => JSON.parse(JSON.stringify(base));
const actor = async who => (await session(who)).actor;
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };

const mk = (id, block, params = {}, rules = []) => ({ id, block, x: 0, y: 0, params: { ...defaultParams(block), ...params }, rules });
// a workflow from nodes and [from, to, port] links; the locked guardrail is always there
const wf = (nodes, links, extra = {}) => ({ id: 'wf-test', name: 'Test', description: '', enabled: true, version: 1, nodes: [...nodes, mk(LOCKED_ID, 'never_auto')], edges: links.map(([from, to, port = 'out'], i) => ({ id: 'e' + i, from, to, port })), ...extra });
const notify = (id, roles = ['supervisor'], message = '{patient} · {payer}: ' + id) => mk(id, 'notify', { roles, message });
const ids = res => res.matches.map(m => m.record.id);
const textsOf = res => res.matches.flatMap(m => m.effects.map(e => e.text));
const oneTrigger = (trig, extra = [], links = []) => wf([trig, notify('a')].concat(extra), [[trig.id, 'a'], ...links]);

// ------------------------------------------------------------------------------------------------------------------ the catalog
await T.test('the catalog: every kind has blocks, every block has a definition and a parameter shape the engine reads, ports follow the kind', async () => {
  assert.deepEq(KINDS, ['trigger', 'condition', 'action', 'guardrail']);
  assert.deepEq([byKind('trigger').length, byKind('condition').length, byKind('action').length, byKind('guardrail').length], [6, 6, 3, 7]);
  for (const [id, b] of Object.entries(BLOCKS)) {
    assert.ok(b.def && b.def.length > 20, id + ' has a definition');
    assert.ok(KINDS.includes(b.kind), id + ' kind');
    assert.deepEq(portsOf(id), b.kind === 'condition' ? ['yes', 'no'] : b.locked ? [] : ['out'], id + ' ports');
    for (const [k, p] of Object.entries(b.params || {})) assert.ok(['number', 'select', 'multi', 'text', 'roles', 'payers', 'bool'].includes(p.type), `${id}.${k} type`);
  }
  assert.eq(Object.values(BLOCKS).filter(b => b.locked).length, 1, 'one locked guardrail');
  assert.ok(BLOCKS[LOCKED_ID].locked);
});

// ------------------------------------------------------------------------------------------------------------------ triggers
await T.test('trigger units_used: the authorizations at the warning share; the rule-bound number is the rule (a stored 99 does not win), and editing the rule moves the line', async () => {
  const s = S(); const r = run(s, oneTrigger(mk('t', 'units_used')));
  assert.deepEq(ids(r), ['MR', 'SB', 'TN'], 'M.R. 75%, S.B. 83%, T.N. 100%');
  assert.deepEq(ids(run(s, oneTrigger(mk('t', 'units_used', { pct: 99 })))), ['MR', 'SB', 'TN'], 'rule-bound: the live rule (75) wins over the stored 99');
  assert.eq(effectiveParams(s, mk('t', 'units_used', { pct: 99 })).pct, 75);
  s.rules.find(x => x.key === 'units.warn_used_pct').value = 90;
  assert.deepEq(ids(run(s, oneTrigger(mk('t', 'units_used')))), ['TN'], 'with the rule at 90 only T.N. (no units left) is left');
  const m = run(S(), oneTrigger(mk('t', 'units_used'))).matches.find(x => x.record.id === 'TN');
  assert.eq(m.record.type, 'client'); assert.eq(m.client, 'TN'); assert.eq(m.label, 'T.N.'); assert.match(m.why, /No units left of 65/);
});
await T.test('trigger payer_reply: one stage group each (info, partial, denied, p2p, overdue); an empty choice starts nothing', async () => {
  const s = S(); const by = stages => ids(run(s, oneTrigger(mk('t', 'payer_reply', { stages }))));
  assert.deepEq(by(['partial']), ['R-0402']); assert.deepEq(by(['info']), ['R-0408']); assert.deepEq(by(['denied']), ['R-0384']);
  assert.deepEq(by(['p2p']), ['R-0388']); assert.deepEq(by(['overdue']), ['R-0399']);
  assert.deepEq(by(['info', 'partial', 'denied']), ['R-0384', 'R-0402', 'R-0408'], 'sorted by record id');
  assert.deepEq(by([]), []);
  assert.eq(run(s, oneTrigger(mk('t', 'payer_reply', { stages: ['partial'] }))).matches[0].record.type, 'request');
});
await T.test('trigger deadline_near: within N days or past it; the kind of deadline narrows it (renewal, decision, appeal)', async () => {
  const s = S(); const by = (days, which = 'any') => ids(run(s, oneTrigger(mk('t', 'deadline_near', { days, which }))));
  assert.ok(by(7, 'renewal').includes('R-0411'), 'M.R. reauth was due Oct 23: past, so near');
  assert.ok(!by(7, 'appeal').includes('R-0384'), 'the appeal window ends Dec 21: 53 days out');
  assert.deepEq(by(60, 'appeal'), ['R-0384']);
  assert.ok(by(7, 'decision').includes('R-0402'), 'the partial offer must be answered by Oct 30');
  assert.ok(by(60).length >= by(7).length && by(7).length >= by(0).length, 'a wider window never finds less');
  assert.ok(!by(60, 'renewal').includes('R-0384') && !by(60, 'decision').includes('R-0411'), 'a kind filter keeps the others out');
});
await T.test('trigger followup_day: a submitted request on or past the follow-up day (the rule), judged on the day given', async () => {
  const s = S(); const w = oneTrigger(mk('t', 'followup_day'));
  assert.deepEq(ids(run(s, w)), [], 'Oct 29: R-0416 is on day 7, R-0391 on day 6');
  const later = run(s, w, { today: '2026-11-02' }); assert.deepEq(ids(later), ['R-0391', 'R-0416'], 'by Nov 2 both are past day 10');
  assert.match(later.matches[0].why, /Day \d+ after sending · follow-up is day 10/);
  assert.eq(s.today, '2026-10-29', 'the state was not moved');
  s.rules.find(x => x.key === 'decision.followup_day').value = 5; assert.deepEq(ids(run(s, w)), ['R-0391', 'R-0416'], 'the rule moves the day');
});
await T.test('trigger note_late: notes behind (daily, weekly guardian, monthly collateral), filtered by type, labelled by initials', async () => {
  const s = S(); const by = type => run(s, oneTrigger(mk('t', 'note_late', { type })));
  assert.eq(by('any').counts.candidates, 4);
  assert.deepEq(ids(by('weekly')), ['MR:weekly_guardian:2026-09-28']); assert.eq(by('dpn').counts.candidates, 3); assert.eq(by('collateral').counts.candidates, 0);
  assert.deepEq(by('weekly').matches.map(m => m.label), ['M.R.']); assert.eq(by('weekly').matches[0].record.type, 'note');
});
await T.test('trigger eligibility_due: a check older than the interval (the rule) is a candidate; a patient with no recorded check is not', async () => {
  const s = S(); const w = oneTrigger(mk('t', 'eligibility_due'));
  const aged = ids(run(s, w)); assert.ok(aged.includes('TW'), 'T.W. was checked Oct 15: 14 days, rule 7');
  s.clients.find(c => c.id === 'TW').medicaid.checked_on = '2026-10-28T08:00'; assert.ok(!ids(run(s, w)).includes('TW'), 'checked yesterday: not due');
  s.clients.find(c => c.id === 'TW').medicaid = { status: 'active' }; assert.ok(!ids(run(s, w)).includes('TW'), 'no check recorded: nothing to age');
});

// ------------------------------------------------------------------------------------------------------------------ conditions: yes and no
const lowRule = () => { const s = S(); s.rules.find(r => r.key === 'units.warn_used_pct').value = 1; return s; };   // a rule-bound number is the rule: lower the rule to start for every authorization
const split = (cond, links, trig = mk('t', 'units_used'), s = lowRule()) => {
  const w = wf([trig, cond, notify('y'), notify('n')], [[trig.id, cond.id], [cond.id, 'y', 'yes'], [cond.id, 'n', 'no'], ...links]);
  const r = run(s, w); const route = id => r.matches.filter(m => m.effects.some(e => e.node === id)).map(m => m.record.id);
  return { yes: route('y'), no: route('n'), r };
};
await T.test('conditions route a record down Yes or No: payer is, service is, units left, partial award, owner is, evidence has gaps', async () => {
  const pr = mk('t', 'payer_reply', { stages: ['info', 'partial', 'denied', 'p2p', 'overdue'] });
  let x = split(mk('c', 'payer_is', { payers: ['sentara'] }), [], pr); assert.deepEq(x.yes, ['R-0388', 'R-0402']); assert.ok(x.no.includes('R-0408') && !x.no.includes('R-0402'));
  x = split(mk('c', 'payer_is', { payers: [] }), [], pr); assert.deepEq(x.yes, [], 'no payer chosen: always No'); assert.eq(x.no.length, 5);
  x = split(mk('c', 'service_is', { service: 'H2016-UG' }), []); assert.deepEq(x.yes, ['LV'], 'the after-school authorization');
  x = split(mk('c', 'service_is', { service: 'H2016' }), []); assert.ok(x.yes.includes('MR') && !x.yes.includes('LV'));
  x = split(mk('c', 'service_is', { service: 'any' }), []); assert.eq(x.no.length, 0);
  x = split(mk('c', 'units_left', { pct: 20 }), []); assert.ok(x.yes.includes('SB') && x.yes.includes('TN') && x.no.includes('MR'), 'S.B. 18% and T.N. 0% left; M.R. 25%');
  x = split(mk('c', 'partial_award'), [], pr); assert.deepEq(x.yes, ['R-0402']); assert.eq(x.no.length, 4);
  x = split(mk('c', 'owner_role', { roles: ['clinician'] }), [], pr); assert.deepEq(x.no, ['R-0399'], 'C. Diaz (supervisor) owns R-0399; the clinician owns the rest');
  x = split(mk('c', 'owner_role', { roles: ['supervisor'] }), [], pr); assert.deepEq(x.yes, ['R-0399']); assert.eq(x.no.length, 4);
  x = split(mk('c', 'owner_role', { roles: ['supervisor', 'clinician'] }), [], pr); assert.eq(x.no.length, 0);
});
await T.test('condition evidence_missing: Yes for a patient whose stored evidence has gaps, No for one without (a one-day window and a note on file)', async () => {
  const s = lowRule(); let x = split(mk('c', 'evidence_missing'), [], mk('t', 'units_used'), s);
  assert.ok(x.yes.includes('MR') && x.yes.includes('TN') && x.no.length === 0, 'the 30-day window has days with no stored note for everyone: ' + JSON.stringify(x));
  s.rules.find(r => r.key === 'evidence.current_window_days').value = 1;
  s.notes.push({ id: 'N-wf-test', client: 'TN', type: 'daily', date: '2026-10-28', staff: 'khale', units: 3, review: 'approved' });
  x = split(mk('c', 'evidence_missing'), [], mk('t', 'units_used'), s);
  assert.ok(x.no.includes('TN'), 'T.N. has a note for the one day in the window'); assert.ok(x.yes.includes('SB'), 'S.B. has none');
});

// ------------------------------------------------------------------------------------------------------------------ actions
await T.test('actions: notify, add a task and suggest a flag each give one effect with its roles; messages fill only {patient}, {payer}, {date}', async () => {
  const s = S(); const t = mk('t', 'payer_reply', { stages: ['partial'] });
  const w = wf([t, mk('a1', 'notify', { roles: ['supervisor', 'admin'], message: '{patient} · {payer} · {date} · {name} · {x}' }), mk('a2', 'add_task', { roles: ['clinician'], message: 'Call {payer} about {patient}' }), mk('a3', 'suggest_flag', { roles: ['supervisor'], reason: 'needs_decision' })], [['t', 'a1'], ['a1', 'a2'], ['a2', 'a3']]);
  const m = run(s, w).matches[0]; assert.deepEq(m.effects.map(e => e.action), ['notify', 'add_task', 'suggest_flag']); assert.deepEq(m.path, ['t', 'a1', 'a2', 'a3']);
  assert.eq(m.effects[0].text, 'D.W. · Sentara · Oct 30 · {name} · {x}', 'initials, payer, the date from the record; an unknown placeholder stays as typed (validate warns)');
  assert.eq(m.effects[1].text, 'Call Sentara about D.W.'); assert.deepEq(m.effects[0].roles, ['supervisor', 'admin']);
  assert.match(m.effects[2].text, /D\.W\. · Sentara: consider flagging \(Needs a decision\)/);
  const full = JSON.stringify(s.clients.find(c => c.id === 'DW')); assert.ok(!/Wilson|Dennis|Dawn|Devon/.test(m.effects.map(e => e.text).join(' ')), 'no names, only initials');
  assert.ok(full.length > 10);
  const blank = run(s, wf([t, mk('a', 'notify', { roles: ['supervisor'], message: '   ' })], [['t', 'a']])).matches[0]; assert.match(blank.effects[0].text, /D\.W\. · Sentara: needs a look/, 'an empty message falls back to the default');
});
await T.test('branching: a fan-out reaches every branch once; a chain passes through guardrails; a record that falls off the map is counted, not matched', async () => {
  const s = S(); const t = mk('t', 'payer_reply', { stages: ['partial'] });
  const fan = run(s, wf([t, notify('a'), notify('b')], [['t', 'a'], ['t', 'b']])); assert.deepEq(fan.matches[0].effects.map(e => e.node), ['a', 'b']);
  const diamond = run(s, wf([t, notify('a'), notify('b'), notify('c')], [['t', 'a'], ['t', 'b'], ['a', 'c'], ['b', 'c']])); assert.deepEq(diamond.matches[0].effects.map(e => e.node), ['a', 'c', 'b'], 'c is reached twice and emitted once');
  const off = run(s, wf([t, mk('c', 'partial_award'), notify('a')], [['t', 'c'], ['c', 'a', 'no']])); assert.eq(off.counts.candidates, 1); assert.eq(off.counts.matched, 0); assert.eq(off.matches.length, 0, 'Yes goes nowhere');
  assert.deepEq(run(s, wf([], [])).counts, { candidates: 0, matched: 0, stopped: 0, effects: 0, limited: 0 }, 'no trigger, nothing');
});

// ------------------------------------------------------------------------------------------------------------------ guardrails
await T.test('guardrail roles_only: only those roles receive what follows; no role left stops the path and says why', async () => {
  const s = S(); const t = mk('t', 'payer_reply', { stages: ['partial'] });
  const a = mk('a', 'notify', { roles: ['supervisor', 'clinician'], message: 'x {patient}' });
  let m = run(s, wf([t, mk('g', 'roles_only', { roles: ['clinician'] }), a], [['t', 'g'], ['g', 'a']])).matches[0];
  assert.deepEq(m.effects[0].roles, ['clinician']);
  m = run(s, wf([t, mk('g', 'roles_only', { roles: ['admin'] }), a], [['t', 'g'], ['g', 'a']])).matches[0];
  assert.eq(m.effects.length, 0); assert.eq(m.stopped.node, 'a'); assert.match(m.stopped.why, /No role named in the guardrail/);
  m = run(s, wf([t, mk('g1', 'roles_only', { roles: ['clinician', 'supervisor'] }), mk('g2', 'roles_only', { roles: ['supervisor'] }), a], [['t', 'g1'], ['g1', 'g2'], ['g2', 'a']])).matches[0];
  assert.deepEq(m.effects[0].roles, ['supervisor'], 'two role guardrails intersect');
});
await T.test('guardrail person_confirms: the item waits for the named roles ("needs your confirmation"); other roles are not asked', async () => {
  const s = S(); s.workflows = [wf([mk('t', 'payer_reply', { stages: ['partial'] }), mk('g', 'person_confirms', { roles: ['clinician'] }), notify('a', ['clinician', 'supervisor'])], [['t', 'g'], ['g', 'a']])];
  const clin = workflowItems(s, await actor('jperez')), sup = workflowItems(s, await actor('cdiaz'));
  assert.eq(clin.length, 1); assert.eq(clin[0].needsConfirm, true); assert.eq(sup.length, 1); assert.eq(sup[0].needsConfirm, false);
});
await T.test('guardrail max_per_day: at most n items per role; the most urgent stay, the rest are counted as limited and not shown', async () => {
  const s = S(); const w = wf([mk('t', 'units_used', {}), mk('g', 'max_per_day', { n: 2 }), notify('a')], [['t', 'g'], ['g', 'a']]);
  const r = run(s, w); assert.eq(r.counts.effects, 3); assert.eq(r.counts.limited, 1);
  const kept = r.matches.filter(m => !m.effects[0].limited).map(m => m.record.id); assert.deepEq(kept, ['MR', 'TN'], 'T.N. has no units left (urgent); M.R. before S.B. by record');
  s.workflows = [w]; assert.eq(workflowItems(s, await actor('cdiaz')).length, 2, 'the bell shows two');
  assert.eq(workflowItems(s, await actor('jperez')).length, 0, 'the clinician is not in the roles and gets nothing');
});
await T.test('guardrail source_required: stops a path whose rule is an unverified demo assumption (and says which); lets a Harvest-reported or verified one through', async () => {
  const s = S(); const t = mk('t', 'units_used', {}, ['units.warn_used_pct']);
  let r = run(s, wf([t, mk('g', 'source_required'), notify('a')], [['t', 'g'], ['g', 'a']]));
  assert.eq(r.counts.effects, 0); assert.eq(r.counts.stopped, 3); assert.match(r.matches[0].stopped.why, /has no verified source/); assert.eq(r.matches[0].stopped.node, 'g');
  assert.match(r.matches[0].stopped.why, /unverified demo assumption/);
  const t2 = mk('t', 'payer_reply', { stages: ['partial'] }, ['decision.overdue_after_days']);   // Harvest-reported
  r = run(s, wf([t2, mk('g', 'source_required'), notify('a')], [['t', 'g'], ['g', 'a']])); assert.eq(r.counts.effects, 1); assert.eq(r.counts.stopped, 0);
  const t3 = mk('t', 'payer_reply', { stages: ['partial'] }, ['decision.overdue_after_days', 'appeal.window_days']);   // adds an unverified rule
  assert.eq(run(s, wf([t3, mk('g', 'source_required'), notify('a')], [['t', 'g'], ['g', 'a']])).counts.stopped, 1);
});
await T.test('guardrail evidence_required: stops a record with evidence gaps and keeps the one without', async () => {
  const s = S(); s.rules.find(r => r.key === 'evidence.current_window_days').value = 1;
  s.notes.push({ id: 'N-wf-test', client: 'TN', type: 'daily', date: '2026-10-28', staff: 'khale', units: 3, review: 'approved' });
  const r = run(s, wf([mk('t', 'units_used', {}), mk('g', 'evidence_required'), notify('a')], [['t', 'g'], ['g', 'a']]));
  const kept = r.matches.filter(m => m.effects.length).map(m => m.record.id); assert.ok(kept.includes('TN') && !kept.includes('SB'), 'kept: ' + kept);
  const stopped = r.matches.find(m => m.record.id === 'SB'); assert.ok(stopped && stopped.stopped && stopped.stopped.node === 'g'); assert.match(stopped.stopped.why, /evidence/i); assert.eq(r.counts.stopped, r.counts.candidates - kept.length);
});
await T.test('two_person and the locked never_auto have no effect at run time: the locked guardrail takes no links and is never walked', async () => {
  const s = S(); const w = wf([mk('t', 'payer_reply', { stages: ['partial'] }), mk('g', 'two_person'), notify('a')], [['t', 'g'], ['g', 'a']]);
  const m = run(s, w).matches[0]; assert.deepEq(m.path, ['t', 'g', 'a']); assert.ok(!m.path.includes(LOCKED_ID));
});

// ------------------------------------------------------------------------------------------------------------------ validate
const problems = (w, s) => validate(w, s || base).problems;
const has = (w, level, re) => problems(w).some(p => p.level === level && re.test(p.text));
await T.test('validate: a good workflow is ok; errors for no trigger, an unknown block, a link to a missing block, a port the block lacks, a link into a trigger or the locked block', async () => {
  const good = wf([mk('t', 'units_used'), mk('c', 'units_left'), notify('y'), notify('n')], [['t', 'c'], ['c', 'y', 'yes'], ['c', 'n', 'no']]); assert.deepEq(validate(good, base), { ok: true, problems: [] });
  assert.ok(has(wf([notify('a')], []), 'error', /Add a "When" block/));
  assert.ok(has(wf([mk('t', 'units_used'), { id: 'z', block: 'send_fax', x: 0, y: 0, params: {}, rules: [] }], [['t', 'z']]), 'error', /Unknown block "send_fax"/), 'a locked step is not a block');
  assert.ok(has({ ...good, edges: [...good.edges, { id: 'ex', from: 'c', to: 'ghost', port: 'yes' }] }, 'error', /goes to a block that is not there/));
  assert.ok(has({ ...good, edges: [...good.edges, { id: 'ex', from: 'ghost', to: 'y', port: 'out' }] }, 'error', /starts from a block that is not there/));
  assert.ok(has(wf([mk('t', 'units_used'), notify('a')], [['t', 'a', 'yes']]), 'error', /has no "Yes" exit/));
  assert.ok(has(wf([mk('t', 'units_used'), mk('c', 'units_left')], [['t', 'c'], ['c', 't', 'yes']]), 'error', /nothing can link into/));
  assert.ok(has(wf([mk('t', 'units_used'), notify('a')], [['t', 'a'], ['a', LOCKED_ID]]), 'error', /locked guardrail/));
  assert.ok(has(wf([mk('t', 'units_used'), notify('a')], [['t', 'a'], [LOCKED_ID, 'a']]), 'error', /takes no links/));
  assert.ok(has({ ...good, nodes: [...good.nodes, { ...good.nodes[0] }] }, 'error', /share the id/));
  assert.ok(has({ ...good, nodes: [...good.nodes, mk('z2', 'never_auto')] }, 'error', /locked guardrail is in the workflow once/));
  assert.ok(has({ ...good, nodes: [...good.nodes, { ...mk('bad id!', 'notify'), id: 'bad id!' }] }, 'error', /block id may use/));
  assert.eq(validate(null).ok, false);
});
await T.test('validate: a cycle, a block no trigger reaches (the locked guardrail needs no link), a rule key that is not in the rules table', async () => {
  assert.ok(has(wf([mk('t', 'units_used'), notify('a'), notify('b')], [['t', 'a'], ['a', 'b'], ['b', 'a']]), 'error', /go round in a circle/));
  assert.ok(has(wf([mk('t', 'units_used'), notify('a'), notify('lost')], [['t', 'a']]), 'error', /Notify is not connected to a "When" block/));
  assert.ok(!problems(wf([mk('t', 'units_used'), notify('a')], [['t', 'a']])).some(p => p.node === LOCKED_ID), 'the locked guardrail is exempt');
  assert.ok(has(wf([mk('t', 'units_used', {}, ['no.such.rule']), notify('a')], [['t', 'a']]), 'error', /"no\.such\.rule" is not in the rules table/));
  assert.ok(!problems(wf([mk('t', 'units_used', {}, ['no.such.rule']), notify('a')], [['t', 'a']]), { today: base.today }).some(p => /rules table/.test(p.text)), 'without a rules table the key is not checked');
});
await T.test('validate: a parameter out of range or of the wrong type (number, whole number, select, multi, roles, payers, text, bool)', async () => {
  const bad = (block, params, re, level = 'error') => assert.ok(has(wf([mk('t', 'units_used'), mk('a', block, params)], [['t', 'a']]), level, re), `${block} ${JSON.stringify(params)}`);
  const cond = (params, re, level = 'error') => assert.ok(has(wf([mk('t', 'units_used'), mk('c', 'units_left', params)], [['t', 'c']]), level, re), JSON.stringify(params));
  cond({ pct: 101 }, /between 0 and 100/); cond({ pct: -1 }, /between 0 and 100/); cond({ pct: '25' }, /must be a number/); cond({ pct: 2.5 }, /whole number/); cond({ pct: null }, /must be a number/);
  assert.ok(has(wf([mk('t', 'units_used', { pct: 0 })], []), 'error', /between 1 and 100/));
  assert.ok(has(wf([mk('t', 'deadline_near', { days: 7, which: 'soon' })], []), 'error', /Which deadline must be one of the choices/));
  assert.ok(has(wf([mk('t', 'payer_reply', { stages: ['partial', 'weird'] })], []), 'error', /Reply type must be chosen from the list/));
  assert.ok(has(wf([mk('t', 'payer_reply', { stages: ['partial', 'partial'] })], []), 'error', /lists a choice twice/));
  assert.ok(has(wf([mk('t', 'payer_reply', { stages: [] })], []), 'warn', /Pick at least one/));
  bad('notify', { roles: ['pilot'], message: 'x' }, /must be chosen from the roles/); bad('notify', { roles: [], message: 'x' }, /Pick at least one role/, 'warn');
  bad('notify', { roles: ['clinician'], message: 'x'.repeat(121) }, /longer than 120/); bad('notify', { roles: ['clinician'], message: 7 }, /must be text/);
  bad('notify', { roles: ['clinician'], message: 'hello {name}' }, /only \{patient\}, \{payer\} and \{date\} fill in/, 'warn'); bad('notify', { roles: ['clinician'], message: ' ' }, /is empty/, 'warn');
  bad('notify', { roles: ['clinician'], message: 'x', extra: 1 }, /"extra" is not a setting/, 'warn');
  assert.ok(has(wf([mk('t', 'units_used'), mk('c', 'payer_is', { payers: ['nobody'] })], [['t', 'c']]), 'error', /payer that is not in the list/));
  assert.ok(has(wf([mk('t', 'units_used'), mk('c', 'payer_is', { payers: [] })], [['t', 'c']]), 'warn', /always No/));
  assert.ok(has(wf([mk('t', 'units_used'), mk('g', 'max_per_day', { n: 0 }), notify('a')], [['t', 'g'], ['g', 'a']]), 'error', /between 1 and 50/));
  assert.ok(has(wf([mk('t', 'units_used'), mk('g', 'max_per_day', { n: 51 })], [['t', 'g']]), 'error', /between 1 and 50/));
});
await T.test('validate warns (does not refuse): nothing after a trigger, a Yes or No exit that leads nowhere', async () => {
  const lone = validate(wf([mk('t', 'units_used')], []), base); assert.eq(lone.ok, true); assert.ok(lone.problems.some(p => p.level === 'warn' && p.node === 't' && /Nothing happens after Units used/.test(p.text)));
  const half = validate(wf([mk('t', 'units_used'), mk('c', 'units_left'), notify('y')], [['t', 'c'], ['c', 'y', 'yes']]), base);
  assert.eq(half.ok, true); assert.deepEq(half.problems.filter(p => p.level === 'warn').map(p => p.text), ['The "No" exit of Units left leads nowhere.']);
  assert.ok(half.problems.every(p => p.level === 'warn' || p.node || p.edge || p.text), 'every problem carries text');
});

// ------------------------------------------------------------------------------------------------------------------ tidy, normalize, ids
await T.test('tidy: x and y are multiples of the grid, triggers sit at the left, Yes is above No, the locked guardrail is bottom right, the input is untouched and it is idempotent', async () => {
  const t = mk('t', 'units_used'); const w = wf([t, mk('c', 'units_left'), notify('y'), notify('n'), mk('g', 'max_per_day'), notify('z')], [['t', 'c'], ['c', 'y', 'yes'], ['c', 'g', 'no'], ['g', 'n'], ['t', 'z']]);
  const before = JSON.stringify(w); const out = tidy(w); assert.eq(JSON.stringify(w), before, 'the input is not changed');
  const at = id => out.nodes.find(n => n.id === id);
  for (const n of out.nodes) assert.ok(n.x % GRID === 0 && n.y % GRID === 0, `${n.id} on the grid: ${n.x},${n.y}`);
  assert.eq(at('t').x, Math.min(...out.nodes.map(n => n.x)), 'the trigger is at the left'); assert.ok(at('c').x > at('t').x && at('y').x > at('c').x);
  assert.ok(at('y').y < at('g').y, 'Yes above No'); assert.ok(at('n').x > at('g').x, 'a guardrail on the path sits before what it guards');
  const lk = at(LOCKED_ID); assert.eq(lk.x, Math.max(...out.nodes.map(n => n.x))); assert.ok(lk.y > Math.max(...out.nodes.filter(n => n.id !== LOCKED_ID).map(n => n.y)), 'bottom right');
  assert.deepEq(tidy(out), out, 'idempotent'); assert.deepEq(tidy(w), out, 'deterministic');
  const keys = out.nodes.map(n => n.x + ',' + n.y); assert.eq(new Set(keys).size, keys.length, 'no two blocks on one spot');
  assert.deepEq(out.edges, w.edges, 'links are kept'); assert.ok(validate(out, base).ok);
});
await T.test('tidy: two triggers stack, a block nobody links to is placed (not lost), a cycle does not hang it', async () => {
  const w = wf([mk('t1', 'units_used'), mk('t2', 'note_late'), notify('a'), notify('b'), notify('stray'), notify('p'), notify('q')], [['t1', 'a'], ['t2', 'b'], ['p', 'q'], ['q', 'p']]);
  const out = tidy(w); assert.eq(out.nodes.length, w.nodes.length); assert.ok(out.nodes.find(n => n.id === 't2').y > out.nodes.find(n => n.id === 't1').y);
  assert.ok(out.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});
await T.test('normalize and ensureLocked: positions snap to the grid, settings come from the catalog, one locked guardrail is always present, duplicate links go', async () => {
  const w = normalize({ name: 'x', nodes: [{ id: 't', block: 'units_used', x: 33, y: 47, params: { junk: 1 }, rules: ['a', 'a'] }, { id: 'a', block: 'notify', x: 0, y: 0 }], edges: [{ id: 'e1', from: 't', to: 'a' }, { id: 'e2', from: 't', to: 'a', port: 'out' }] });
  const t = w.nodes.find(n => n.id === 't'); assert.deepEq([t.x, t.y], [40, 40]); assert.deepEq(t.params, defaultParams('units_used')); assert.deepEq(t.rules, ['a']);
  assert.deepEq(w.nodes.find(n => n.id === 'a').params, defaultParams('notify')); assert.eq(w.edges.length, 1);
  const locked = w.nodes.filter(n => n.block === LOCKED_ID); assert.eq(locked.length, 1); assert.ok(locked[0].y > 40);
  const twice = ensureLocked({ nodes: [...w.nodes, { id: 'second', block: LOCKED_ID, x: 0, y: 0, params: {}, rules: [] }], edges: [...w.edges, { id: 'bad', from: 'second', to: 'a', port: 'out' }] });
  assert.eq(twice.nodes.filter(n => n.block === LOCKED_ID).length, 1, 'a second locked guardrail is dropped'); assert.ok(!twice.edges.some(e => e.id === 'bad'), 'with its links');
  assert.deepEq(normalize(null).nodes.map(n => n.block), [LOCKED_ID]);
});
await T.test('newId: n-xxxx, unique among the ids taken', async () => {
  assert.match(newId(), /^n-[0-9a-z]{4}$/); assert.match(newId('wf'), /^wf-[0-9a-z]{4}$/);
  const taken = new Set(); for (let i = 0; i < 400; i++) { const id = newId('n', taken); assert.ok(!taken.has(id)); taken.add(id); }
});

// ------------------------------------------------------------------------------------------------------------------ determinism, no writes, bell items
await T.test('run and workflowItems are deterministic and never write: a deep-frozen state and workflow give the same answer twice', async () => {
  const s = S(); s.workflows = TEMPLATES.map(t => ({ id: 'wf-' + t.key, name: t.name, description: t.description, enabled: true, version: 1, nodes: t.nodes, edges: t.edges }));
  deepFreeze(s);
  for (const w of s.workflows) { const a = run(s, w, { today: '2026-11-02' }), b = run(s, w, { today: '2026-11-02' }); assert.deepEq(a, b, w.id); }
  const me = await actor('jperez'); assert.deepEq(workflowItems(s, me), workflowItems(s, me)); assert.ok(workflowItems(s, me).length >= 2);
  const copy = JSON.stringify(s); run(s, s.workflows[0]); workflowItems(s, me); assert.eq(JSON.stringify(s), copy, 'the state is unchanged');
});
await T.test('the same answer from the clinician, supervisor and administrator projections (the engine reads status, never note text)', async () => {
  const set = async who => { const s = await state(who); s.workflows = TEMPLATES.map(t => ({ id: 'wf-' + t.key, name: t.name, enabled: true, nodes: t.nodes, edges: t.edges })); return JSON.stringify(s.workflows.map(w => { const r = run(s, w); return [w.id, r.counts, r.matches.map(m => [m.record.id, m.effects.map(e => e.node + e.text), m.stopped && m.stopped.node])]; })); };
  const clin = await set('jperez'); assert.eq(await set('cdiaz'), clin, 'supervisor'); assert.eq(await set('dowens'), clin, 'administrator');
});
await T.test('workflowItems: enabled workflows only, items for the role named, ids "wf:<workflow>:<record>:<node>", group Workflows, a source and a link the role may open', async () => {
  const s = S(); const w = wf([mk('t', 'payer_reply', { stages: ['partial'] }), notify('a', ['supervisor', 'clinician', 'admin'], '{patient} · {payer}: needs a look')], [['t', 'a']], { id: 'wf-x', name: 'Offer test' });
  s.workflows = [{ ...w, enabled: false }]; for (const who of ['cdiaz', 'jperez', 'dowens', 'khale']) assert.deepEq(workflowItems(s, await actor(who)), [], who + ': a workflow that is off shows nothing');
  s.workflows = [w];
  const sup = workflowItems(s, await actor('cdiaz')); assert.eq(sup.length, 1); const i = sup[0];
  assert.eq(i.id, 'wf:wf-x:R-0402:a'); assert.eq(i.kind, 'workflow'); assert.eq(i.group, 'Workflows'); assert.deepEq(i.source, { workflow: 'wf-x', name: 'Offer test', node: 'a', action: 'notify' });
  assert.eq(i.title, 'D.W. · Sentara: needs a look'); assert.eq(i.record, 'R-0402'); assert.eq(i.needsConfirm, false); assert.ok(['r', 'y', 'n'].includes(i.sev)); assert.match(i.at, /^\d{4}-\d{2}-\d{2}T/);
  assert.eq(i.to, 'Authorization.dc.html?id=R-0402', 'a supervisor opens the case in Authorizations');
  assert.eq(workflowItems(s, await actor('jperez'))[0].to, 'DenialCase.dc.html?id=R-0402', 'a clinician opens a payer-reply case in Denial Intelligence');
  assert.eq(workflowItems(s, await actor('dowens')).length, 1, 'the administrator is a role too');
  assert.deepEq(workflowItems(s, await actor('khale')), [], 'direct support: no request is theirs');
  assert.deepEq(workflowItems(s, null), []); assert.deepEq(workflowItems(null, sup[0]), []);
  for (const bad of [{ id: 'guardian:TW', role: 'guardian' }, { id: 'school:rbell', role: 'school' }, { id: 'x', role: 'nobody' }]) assert.deepEq(workflowItems(s, bad), [], bad.role);
});
await T.test('workflowItems for direct support: only their own patients, linked to the patient chart', async () => {
  const s = S(); s.workflows = [wf([mk('t', 'units_used', {}), notify('a', ['direct_support'])], [['t', 'a']], { id: 'wf-ds', name: 'Units for me' })];
  const khale = workflowItems(s, await actor('khale')); assert.deepEq(khale.map(i => i.record), ['MR'], 'K. Hale carries M.R.; S.B. and T.N. are not theirs');
  assert.eq(khale[0].to, 'Patient?id=MR&section=authorization', 'no Authorizations route for direct support');
  assert.deepEq(workflowItems(s, await actor('slane')), [], 'S. Lane carries D.W., who is under the warning level');
  assert.deepEq(workflowItems(s, await actor('jperez')), [], 'a clinician is not in the roles');
});
await T.test('notificationsFor appends the workflow items (unread, group Workflows) without changing the others; read state works on their ids', async () => {
  const s = S(); const me = await actor('cdiaz'); const before = notificationsFor(s, me);
  assert.ok(before.some(n => n.kind === 'workflow'), 'the seeded partial-offer workflow is already in the supervisor\'s bell');
  s.workflows = [...s.workflows, wf([mk('t', 'payer_reply', { stages: ['partial'] }), notify('a')], [['t', 'a']], { id: 'wf-n', name: 'Offer' })];
  const after = notificationsFor(s, me); assert.eq(after.length, before.length + 1);
  const w = after.find(n => n.id === 'wf:wf-n:R-0402:a'); assert.eq(w.group, 'Workflows'); assert.eq(w.read, false);
  assert.deepEq(after.filter(n => n.kind !== 'workflow').map(n => n.id), before.filter(n => n.kind !== 'workflow').map(n => n.id), 'every other item is as before');
  s.notify_read = { cdiaz: [w.id] }; assert.eq(notificationsFor(s, me).find(n => n.id === w.id).read, true);
});

// ------------------------------------------------------------------------------------------------------------------ the seeded workflows
await T.test('seed: five workflows (two on, three off), each valid and laid out on the grid with the locked guardrail; the same graphs as the templates', async () => {
  const adm = await state('dowens'); const ws = adm.workflows; assert.eq(ws.length, 5);
  assert.deepEq(ws.map(w => w.id), ['wf-partial-offer', 'wf-followup-day', 'wf-units-low', 'wf-late-notes', 'wf-evidence-gaps']);
  assert.deepEq(ws.filter(w => w.enabled).map(w => w.id), ['wf-partial-offer', 'wf-followup-day']);
  for (const w of ws) {
    const v = validate(w, adm); assert.eq(v.ok, true, w.id + ': ' + JSON.stringify(v.problems)); assert.deepEq(v.problems, [], w.id + ' has no warnings either');
    assert.eq(w.nodes.filter(n => n.block === LOCKED_ID).length, 1, w.id + ' has the locked guardrail');
    for (const n of w.nodes) assert.ok(n.x % GRID === 0 && n.y % GRID === 0, `${w.id}/${n.id} on the grid`);
    assert.eq(w.version, 1); assert.ok(w.history.length === 1 && w.updated_by === 'dowens');
    for (const n of w.nodes) for (const k of n.rules) assert.ok(adm.rules.some(r => r.key === k), `${w.id}/${n.id} rule ${k} exists`);
    const tpl = TEMPLATES.find(t => 'wf-' + t.key === w.id); assert.ok(tpl, w.id + ' has a template');
    assert.deepEq([w.name, w.nodes, w.edges], [tpl.name, tpl.nodes, tpl.edges], w.id + ' = its template');
  }
  const by = id => ws.find(w => w.id === id);
  assert.deepEq(by('wf-partial-offer').nodes.map(n => n.block), ['payer_reply', 'person_confirms', 'add_task', 'notify', 'never_auto']);
  assert.deepEq(by('wf-followup-day').nodes.map(n => n.block), ['followup_day', 'roles_only', 'max_per_day', 'add_task', 'never_auto']);
  assert.deepEq(by('wf-units-low').nodes.map(n => n.block), ['units_used', 'units_left', 'suggest_flag', 'notify', 'never_auto']);
  assert.deepEq(by('wf-late-notes').nodes.map(n => n.block), ['note_late', 'max_per_day', 'notify', 'never_auto']);
  assert.deepEq(by('wf-evidence-gaps').nodes.map(n => n.block), ['deadline_near', 'evidence_missing', 'notify', 'evidence_required', 'notify', 'never_auto']);
  assert.ok(by('wf-followup-day').nodes.find(n => n.block === 'followup_day').rules.includes('decision.followup_day'));
  assert.ok(by('wf-units-low').nodes.find(n => n.block === 'units_used').rules.includes('units.warn_used_pct'));
});
await T.test('seed behaviour on the Oct 29 canvas: the partial offer gives the clinician a task (to confirm) and the supervisor a notice; follow-up day gives nothing yet; templates run when turned on', async () => {
  const s = S(); const clin = workflowItems(s, await actor('jperez')), sup = workflowItems(s, await actor('cdiaz'));
  assert.deepEq(clin.map(i => i.id), ['wf:wf-partial-offer:R-0402:a1']); assert.eq(clin[0].needsConfirm, true); assert.match(clin[0].title, /^Decide on the partial offer for D\.W\. · Sentara \(reply by Oct 30\)$/);
  assert.deepEq(sup.map(i => i.id), ['wf:wf-partial-offer:R-0402:a2']); assert.eq(sup[0].needsConfirm, false);
  assert.deepEq(workflowItems(s, await actor('dowens')), [], 'the administrator is in no role of the two seeded workflows');
  assert.deepEq(workflowItems(s, await actor('khale')), []);
  const later = S(); later.today = '2026-11-02'; later.clock = { ...later.clock, date: '2026-11-02' };
  const tasks = workflowItems(later, await actor('jperez')).filter(i => i.source.workflow === 'wf-followup-day'); assert.ok(tasks.length >= 1, 'on Nov 2 the follow-up day has come for a submitted request');
  assert.ok(tasks.every(i => /^Call .+ about [A-Z]\.[A-Z]\.$/.test(i.title)), tasks.map(i => i.title).join(' | '));
  const on = S(); on.workflows = (await state('dowens')).workflows.map(w => ({ ...w, enabled: true }));   // the clinician's projection holds only the enabled ones
  const units = workflowItems(on, await actor('cdiaz')).filter(i => i.source.workflow === 'wf-units-low'); assert.ok(units.length === 3, 'M.R. (25% left), S.B. and T.N.: ' + units.map(i => i.title).join(' | '));
  assert.ok(units.every(i => i.source.action === 'suggest_flag' || i.source.action === 'notify'));
  const evid = workflowItems(on, await actor('jperez')).filter(i => i.source.workflow === 'wf-evidence-gaps'); assert.deepEq(evid.map(i => i.record), ['R-0411']);
  const r = run(on, on.workflows.find(w => w.id === 'wf-evidence-gaps')); assert.eq(r.counts.stopped, 1, 'the clinician is told and the path stops at the evidence guardrail');
});

await T.done();
