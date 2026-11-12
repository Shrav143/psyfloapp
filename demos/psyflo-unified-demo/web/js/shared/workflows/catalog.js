// The block catalog for Settings > Workflows (round 5). PURE DATA + tiny helpers, imported by the server, the app and the tests.
// A workflow is a map of blocks: Triggers ("When"), Conditions ("If", two outputs yes and no), Actions ("Then") and Guardrails ("Always").
// Every block has a definition (shown on hover), parameters, and may be bound to rows of the rules table (so its numbers carry a source and a
// verification label, and an edit goes through settings.rule with a reason). Nothing here sends, calls, files or signs: those steps stay with a
// person, and the palette shows them locked (LOCKED_ACTIONS) so the limit is visible.
//
//   workflow = { id, name, description, enabled, version, nodes:[node], edges:[edge], updated_at, updated_by }
//   node     = { id, block, x, y, params:{}, rules:[ruleKey] }        x, y in canvas pixels (multiples of GRID)
//   edge     = { id, from, to, port }                                 port: 'out' (trigger, action, guardrail) | 'yes' | 'no' (condition)
//
// Param types: number {min,max,unit} · select {options:[[value,label]]} · multi {options} · text {max} · roles (multi over ROLE_OPTIONS) · payers · bool.
export const GRID = 20;
export const KINDS = ['trigger', 'condition', 'action', 'guardrail'];
export const KIND_LABEL = { trigger: 'When', condition: 'If', action: 'Then', guardrail: 'Always' };
export const KIND_ICON = { trigger: 'bolt', condition: 'branch', action: 'check', guardrail: 'shield' };
export const ROLE_OPTIONS = [['direct_support', 'Direct support'], ['supervisor', 'Site supervisor'], ['clinician', 'Clinician'], ['admin', 'Administrator']];
export const STAGE_GROUPS = [['info', 'Payer asked for information'], ['partial', 'Partial award'], ['denied', 'Denied'], ['p2p', 'Peer-to-peer'], ['overdue', 'Decision overdue']];

const roles = def => ({ type: 'roles', label: 'Who', default: def });
const note = { type: 'text', label: 'Message', max: 120, help: 'Shown in the bell. {patient}, {payer} and {date} fill in from the record.' };

// block id -> definition. `rules` lists the rules-table keys the block reads (shown in its inspector with value, source and verification).
export const BLOCKS = {
  // ---------------- triggers: when does it start? (each yields candidate records from the state)
  units_used: { kind: 'trigger', label: 'Units used reach', short: 'Units used', icon: 'hourglass', def: 'Starts for an authorization whose units used reach this share of the units approved.', params: { pct: { type: 'number', label: 'Units used', min: 1, max: 100, unit: '%', default: 75, rule: 'units.warn_used_pct' } }, rules: ['units.warn_used_pct'] },
  deadline_near: { kind: 'trigger', label: 'A deadline is near', short: 'Deadline near', icon: 'calendar', def: 'Starts for a request with a payer, renewal or appeal deadline within this many days (or past it).', params: { days: { type: 'number', label: 'Within', min: 0, max: 60, unit: 'days', default: 7 }, which: { type: 'select', label: 'Which deadline', default: 'any', options: [['any', 'Any'], ['renewal', 'Renewal due'], ['decision', 'Payer decision'], ['appeal', 'Appeal window']] } }, rules: ['continued_stay.lead_business_days', 'appeal.window_days'] },
  payer_reply: { kind: 'trigger', label: 'A payer reply is recorded', short: 'Payer reply', icon: 'inbox', def: 'Starts when a request moves into one of these payer stages, as recorded by a person.', params: { stages: { type: 'multi', label: 'Reply type', default: ['info', 'partial', 'denied'], options: STAGE_GROUPS } }, rules: ['decision.followup_day', 'decision.overdue_after_days'] },
  followup_day: { kind: 'trigger', label: 'Decision follow-up day', short: 'Follow-up day', icon: 'phone', def: 'Starts for a submitted request that reached the follow-up day (Harvest practice, not a payer deadline).', params: { day: { type: 'number', label: 'Day', min: 1, max: 30, unit: 'days after sending', default: 10, rule: 'decision.followup_day' } }, rules: ['decision.followup_day'] },
  note_late: { kind: 'trigger', label: 'A note is past due', short: 'Note past due', icon: 'pencil', def: 'Starts for a daily, weekly or monthly note that is behind.', params: { type: { type: 'select', label: 'Note type', default: 'any', options: [['any', 'Any'], ['dpn', 'Daily note'], ['weekly', 'Weekly guardian call'], ['collateral', 'Monthly collateral']] } }, rules: ['notes.daily_due_hours', 'notes.weekly_guardian_due', 'notes.monthly_collateral_due'] },
  eligibility_due: { kind: 'trigger', label: 'Eligibility recheck is due', short: 'Eligibility due', icon: 'check', def: 'Starts when a patient\'s eligibility check is older than the recheck interval.', params: { days: { type: 'number', label: 'Older than', min: 1, max: 90, unit: 'days', default: 30, rule: 'eligibility.recheck_days' } }, rules: ['eligibility.recheck_days'] },

  // ---------------- conditions: if ... (yes / no)
  payer_is: { kind: 'condition', label: 'The payer is', short: 'Payer is', icon: 'inbox', def: 'Yes when the request\'s payer is one of these.', params: { payers: { type: 'payers', label: 'Payer', default: [] } } },
  service_is: { kind: 'condition', label: 'The service is', short: 'Service is', icon: 'grid', def: 'Yes when the request is for this service.', params: { service: { type: 'select', label: 'Service', default: 'any', options: [['any', 'Any'], ['H2016', 'TDT school day (H2016)'], ['H2016-UG', 'After school (H2016-UG)']] } } },
  units_left: { kind: 'condition', label: 'Units left are', short: 'Units left', icon: 'hourglass', def: 'Yes when the units left are this share of the approved units or less.', params: { pct: { type: 'number', label: 'At most', min: 0, max: 100, unit: '% left', default: 25 } } },
  evidence_missing: { kind: 'condition', label: 'Stored evidence has gaps', short: 'Evidence gaps', icon: 'alert', def: 'Yes when the record behind the request has missing evidence (weekly call, monthly contact, notes in the window).', params: {} },
  partial_award: { kind: 'condition', label: 'The payer offered part of the units', short: 'Partial award', icon: 'branch', def: 'Yes when the request has a partial offer waiting for a decision.', params: {} },
  owner_role: { kind: 'condition', label: 'The owner is', short: 'Owner is', icon: 'user', def: 'Yes when the person who owns the request holds one of these roles.', params: { roles: roles(['clinician']) } },

  // ---------------- actions: then ... (all of them stay inside Psyflo and are seen by a person; none changes a record)
  notify: { kind: 'action', label: 'Notify', short: 'Notify', icon: 'bell', def: 'Adds an item to the bell of the people in these roles, linking to the record. Nothing is sent outside Psyflo.', params: { roles: roles(['supervisor']), message: { ...note, default: '{patient} · {payer}: needs a look' } } },
  suggest_flag: { kind: 'action', label: 'Suggest a flag', short: 'Suggest flag', icon: 'flag', def: 'Adds a bell item with a Flag button. A person decides whether to raise the flag.', params: { roles: roles(['supervisor']), reason: { type: 'select', label: 'Reason', default: 'needs_decision', options: [['needs_decision', 'Needs a decision'], ['units_low', 'Units low'], ['evidence', 'Evidence missing'], ['family', 'Waiting on the family'], ['other', 'Other']] } } },
  add_task: { kind: 'action', label: 'Add a task', short: 'Add task', icon: 'inbox', def: 'Adds a task to the bell of the owner (or the chosen role): a reminder for a person, never done for them.', params: { roles: roles(['clinician']), message: { ...note, default: 'Call the payer about {patient}' } } },

  // ---------------- guardrails: always ... (apply to everything after them on the path)
  never_auto: { kind: 'guardrail', label: 'Nothing is sent, called or filed on its own', short: 'Person acts', icon: 'lock', def: 'A person presses every send, call, file and sign. This guardrail is on in every workflow and cannot be removed.', params: {}, locked: true },
  person_confirms: { kind: 'guardrail', label: 'A person confirms first', short: 'Person confirms', icon: 'user', def: 'The item waits in the bell marked "needs your confirmation" until someone in this role confirms.', params: { roles: roles(['clinician']) } },
  roles_only: { kind: 'guardrail', label: 'Only these roles', short: 'Roles only', icon: 'users', def: 'Only people in these roles receive what comes after this guardrail.', params: { roles: roles(['supervisor', 'clinician']) } },
  two_person: { kind: 'guardrail', label: 'A second person must agree', short: 'Second person', icon: 'users', def: 'A change to this workflow, or what it does, needs a second administrator or clinician to confirm.', params: {} },
  source_required: { kind: 'guardrail', label: 'Stop when a rule has no verified source', short: 'Source needed', icon: 'shield', def: 'Stops the path when a rule it relies on is an unverified demo assumption, and says so.', params: {} },
  evidence_required: { kind: 'guardrail', label: 'Stop when evidence is missing', short: 'Evidence needed', icon: 'file', def: 'Stops the path for a record whose stored evidence has gaps.', params: {} },
  max_per_day: { kind: 'guardrail', label: 'At most this many alerts per person per day', short: 'Alert limit', icon: 'hourglass', def: 'Keeps the bell quiet: later matches are counted but not shown.', params: { n: { type: 'number', label: 'At most', min: 1, max: 50, unit: 'a day', default: 5 } } }
};

// steps that are always a person's: shown locked in the palette with the reason
export const LOCKED_ACTIONS = [
  { id: 'send_fax', label: 'Send by fax', icon: 'send' }, { id: 'call_payer', label: 'Call the payer', icon: 'phone' },
  { id: 'file_appeal', label: 'File an appeal', icon: 'file' }, { id: 'sign_form', label: 'Sign in Lauris', icon: 'pencil' }, { id: 'text_family', label: 'Text the family', icon: 'phone' }
];
export const LOCKED_WHY = 'A person does this step. Psyflo does not send, call, file or sign on its own.';

export const blockOf = node => BLOCKS[node && node.block] || null;
export const byKind = kind => Object.entries(BLOCKS).filter(([, b]) => b.kind === kind).map(([id, b]) => ({ id, ...b }));
export const defaultParams = id => { const b = BLOCKS[id]; return b ? Object.fromEntries(Object.entries(b.params || {}).map(([k, p]) => [k, Array.isArray(p.default) ? p.default.slice() : p.default])) : {}; };
export const newNode = (id, block, x = 0, y = 0) => ({ id, block, x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID, params: defaultParams(block), rules: (BLOCKS[block] && BLOCKS[block].rules ? BLOCKS[block].rules.slice(0, 1) : []) });
export const portsOf = block => (BLOCKS[block] && BLOCKS[block].kind === 'condition' ? ['yes', 'no'] : BLOCKS[block] && BLOCKS[block].kind === 'guardrail' && BLOCKS[block].locked ? [] : ['out']);
