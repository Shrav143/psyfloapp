// The five starter workflows of round 5 (Settings > Workflows). PURE DATA, laid out with tidy() so every x, y is a multiple of GRID.
// seed/extra/workflows.json is these five with ids "wf-<key>", two of them on (partial-offer, followup-day) and three off; the screen's
// "New workflow from a template" and the action workflow.create { from: <key> } read this list. test/workflows-engine.mjs checks that the seed
// and the templates describe the same graphs, so they cannot drift.
//
// Every workflow carries the locked guardrail (never_auto): nothing here sends, calls, files or signs. A message may use {patient} (initials),
// {payer} and {date} only. Guardrails are pass-through blocks: they change what comes AFTER them on the path.
import { defaultParams } from './catalog.js';
import { tidy } from './engine.js';

const N = (id, block, params = {}, rules = []) => ({ id, block, x: 0, y: 0, params: { ...defaultParams(block), ...params }, rules });
const E = (id, from, to, port = 'out') => ({ id, from, to, port });
const NEVER = N('never_auto', 'never_auto');

const RAW = [
  { key: 'partial-offer', name: 'Partial offer needs a decision', enabled: true,
    description: 'When a payer offers part of the units, a clinician gets a task to decide and the supervisor is told. The clinician confirms first.',
    nodes: [N('t1', 'payer_reply', { stages: ['partial'] }, ['decision.overdue_after_days']), N('g1', 'person_confirms', { roles: ['clinician'] }),
      N('a1', 'add_task', { roles: ['clinician'], message: 'Decide on the partial offer for {patient} · {payer} (reply by {date})' }),
      N('a2', 'notify', { roles: ['supervisor'], message: '{patient} · {payer} offered part of the units: a clinician decides' }), NEVER],
    edges: [E('e1', 't1', 'g1'), E('e2', 'g1', 'a1'), E('e3', 'a1', 'a2')] },
  { key: 'followup-day', name: 'Follow-up call day', enabled: true,
    description: 'On the follow-up day after a request was sent, the clinician gets a task to call the payer. Only clinicians, at most five a day.',
    nodes: [N('t1', 'followup_day', {}, ['decision.followup_day']), N('g1', 'roles_only', { roles: ['clinician'] }), N('g2', 'max_per_day', { n: 5 }),
      N('a1', 'add_task', { roles: ['clinician'], message: 'Call {payer} about {patient}' }), NEVER],
    edges: [E('e1', 't1', 'g1'), E('e2', 'g1', 'g2'), E('e3', 'g2', 'a1')] },
  { key: 'units-low', name: 'Units running low', enabled: false,
    description: 'When units used reach the warning level: suggest a flag if a quarter or less is left, otherwise tell the supervisor.',
    nodes: [N('t1', 'units_used', {}, ['units.warn_used_pct']), N('c1', 'units_left', { pct: 25 }),
      N('a1', 'suggest_flag', { roles: ['supervisor'], reason: 'units_low' }), N('a2', 'notify', { roles: ['supervisor'], message: '{patient} · {payer}: units are getting low' }), NEVER],
    edges: [E('e1', 't1', 'c1'), E('e2', 'c1', 'a1', 'yes'), E('e3', 'c1', 'a2', 'no')] },
  { key: 'late-notes', name: 'Late notes', enabled: false,
    description: 'When a note is past due, tell the supervisor. At most five alerts a day.',
    nodes: [N('t1', 'note_late', {}, ['notes.daily_due_hours']), N('g1', 'max_per_day', { n: 5 }),
      N('a1', 'notify', { roles: ['supervisor'], message: '{patient}: a note is past due' }), NEVER],
    edges: [E('e1', 't1', 'g1'), E('e2', 'g1', 'a1')] },
  { key: 'evidence-gaps', name: 'Evidence gaps before a renewal', enabled: false,
    description: 'A week before a renewal is due: if the stored evidence has gaps, tell the clinician and stop; if not, tell the supervisor.',
    nodes: [N('t1', 'deadline_near', { days: 7, which: 'renewal' }, ['continued_stay.lead_business_days']), N('c1', 'evidence_missing'),
      N('a1', 'notify', { roles: ['clinician'], message: '{patient} · {payer}: evidence has gaps before the renewal' }), N('g1', 'evidence_required'),
      N('a2', 'notify', { roles: ['supervisor'], message: '{patient} · {payer}: the renewal is near' }), NEVER],
    edges: [E('e1', 't1', 'c1'), E('e2', 'c1', 'a1', 'yes'), E('e3', 'a1', 'g1'), E('e4', 'c1', 'a2', 'no')] }
];

export const TEMPLATES = RAW.map(t => { const laid = tidy({ nodes: t.nodes, edges: t.edges }); return { key: t.key, name: t.name, description: t.description, enabled: t.enabled, nodes: laid.nodes, edges: laid.edges }; });
export const templateByKey = key => TEMPLATES.find(t => t.key === key) || null;
