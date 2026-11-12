// Workflows (round 5, Settings > Workflows): the administrator draws rules as a map of blocks; the engine (web/js/shared/workflows/engine.js)
// turns the enabled ones into bell items, suggestions and reminders for people. Nothing here, and nothing a workflow does, sends, calls, files,
// signs or texts anyone: a workflow only decides what a person SEES. Documented in docs/BUILD-BRIEF.md ("Workflows (R5)").
//
//   workflow.create  {name, description?, from?}   admin.settings   a new workflow, off. from = a workflow id (duplicate) or a template key
//   workflow.save    {id, workflow, note?}         admin.settings   validated (422 with the problems when a block, link or setting is wrong),
//                                                                   version + 1 and a history entry; the locked guardrail "Nothing is sent, called
//                                                                   or filed on its own" is kept whatever the page sends
//   workflow.enable  {id, enabled}                 admin.settings   refuses to turn on a workflow that has validation errors
//   workflow.delete  {id, reason}                  admin.settings   reason of 4 or more characters
//   workflow.confirm {id, decision}                admin.settings | drafts.clinical   TWO-PERSON: a workflow that holds the "A second person must
//                                                  agree" guardrail keeps a saved change in `pending` (the live version does not change) until a
//                                                  DIFFERENT administrator or clinician approves or declines it; the proposer never confirms their own
//
// State: state.workflows = [{ id, name, description, enabled, version, nodes, edges, updated_at, updated_by, history[], pending? }]
//        state.workflow_confirmations = [{ id (the workflow), name, by, at, note, changes, version }]   (what a clinician sees of a pending change)
// Every action is an audit event ("Workflow saved: Name · v3") under the record 'workflows'. Event text has no quotation marks, so the audit
// view shows it as written. A refusal is audited too (the store does it) except the plain validation ones.
import { refuse } from '../gates.js';
import { validate, normalize, newId } from '../../../web/js/shared/workflows/engine.js';
import { templateByKey } from '../../../web/js/shared/workflows/templates.js';

const MAX_WORKFLOWS = 40;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const clean = (t, n) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, n);
const clone = o => JSON.parse(JSON.stringify(o));
const byId = (arr, id) => (arr || []).find(x => x.id === id);
const hasTwoPerson = w => (w.nodes || []).some(n => n && n.block === 'two_person');
const staffName = (s, id) => (byId(s.staff, id) || {}).name || id;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const authz = {
  'workflow.create': { any: ['admin.settings'] },
  'workflow.save': { any: ['admin.settings'] },
  'workflow.enable': { any: ['admin.settings'] },
  'workflow.delete': { any: ['admin.settings'] },
  'workflow.confirm': { any: ['admin.settings', 'drafts.clinical'] }
};

// Role projection. The administrator reads everything (history, a pending change). Every other staff role reads the enabled workflows only, without
// history or a pending change: the bell computes their items from them and nothing else. Portal actors read none. A clinician (and the
// administrator) also reads the short list of changes that wait for a second person.
const lite = w => { const { history, pending, ...rest } = w; return rest; };
const enabledOnly = (s, actor, val) => (val || []).filter(w => w && w.enabled).map(lite);
export const projection = {
  workflows: { admin: true, supervisor: enabledOnly, clinician: enabledOnly, direct_support: enabledOnly, default: [] },
  workflow_confirmations: { admin: true, clinician: true, default: [] }
};

const find = (s, id) => { const w = byId(s.workflows, id); if (!w) refuse('That workflow is not there any more.', { status: 404, audit: false, record: 'workflows' }); return w; };
const problemText = (v, lead) => {
  const errs = v.problems.filter(p => p.level === 'error');
  return `${lead} ${errs.slice(0, 4).map(p => p.text.replace(/\.$/, '')).join(' · ')}${errs.length > 4 ? ` · and ${errs.length - 4} more` : ''}.`;
};
const sameGraph = (a, b) => {
  const k = w => JSON.stringify([w.name, w.description || '', [...w.nodes].sort((x, y) => (x.id < y.id ? -1 : 1)).map(n => [n.id, n.block, n.x, n.y, n.params, [...n.rules].sort()]), [...w.edges].map(e => [e.from, e.port, e.to]).sort()]);
  return k(a) === k(b);
};
function changeText(a, b) {
  const A = new Map(a.nodes.map(n => [n.id, n])), B = new Map(b.nodes.map(n => [n.id, n]));
  const added = [...B.keys()].filter(k => !A.has(k)).length, removed = [...A.keys()].filter(k => !B.has(k)).length;
  const changed = [...B.keys()].filter(k => A.has(k) && JSON.stringify([A.get(k).block, A.get(k).params, [...A.get(k).rules].sort()]) !== JSON.stringify([B.get(k).block, B.get(k).params, [...B.get(k).rules].sort()])).length;
  const ek = e => `${e.from}|${e.port}|${e.to}`; const AE = new Set(a.edges.map(ek)), BE = new Set(b.edges.map(ek));
  const la = [...BE].filter(k => !AE.has(k)).length, lr = [...AE].filter(k => !BE.has(k)).length;
  const parts = [];
  if (added) parts.push(`${plural(added, 'block')} added`); if (removed) parts.push(`${plural(removed, 'block')} removed`); if (changed) parts.push(`${plural(changed, 'block')} changed`);
  if (la) parts.push(`${plural(la, 'link')} added`); if (lr) parts.push(`${plural(lr, 'link')} removed`);
  if (a.name !== b.name) parts.push('renamed'); if ((a.description || '') !== (b.description || '')) parts.push('description changed');
  return parts.join(', ') || 'positions changed';
}
function apply(s, cur, next, by, at, note, confirmedBy) {
  cur.name = next.name; cur.description = next.description; cur.nodes = next.nodes; cur.edges = next.edges;
  cur.version = (cur.version || 1) + 1; cur.updated_at = at; cur.updated_by = by;
  cur.history = (cur.history || []).concat([{ version: cur.version, at, by, note: note || '', ...(confirmedBy ? { confirmed_by: confirmedBy } : {}) }]);
  delete cur.pending; s.workflow_confirmations = (s.workflow_confirmations || []).filter(c => c.id !== cur.id);
}

export default {
  'workflow.create'(s, { name, description = '', from } = {}) {
    s.workflows = s.workflows || [];
    if (s.workflows.length >= MAX_WORKFLOWS) refuse(`There can be up to ${MAX_WORKFLOWS} workflows. Delete one first.`, { status: 422, audit: false, record: 'workflows', code: 'workflow_limit' });
    let src = null;
    if (from != null && from !== '') { src = byId(s.workflows, String(from)) || templateByKey(String(from)); if (!src) refuse('That workflow or template is not there.', { status: 404, audit: false, record: 'workflows' }); }
    const nm = clean(name, 80) || (src ? clean(`${src.name} (copy)`, 80) : '');
    if (nm.length < 2) refuse('Give the workflow a name.', { status: 422, audit: false, record: 'workflows', code: 'workflow_name' });
    const id = newId('wf', s.workflows.map(w => w.id));
    const w = normalize({ name: nm, description: clean(description, 240) || (src ? clean(src.description, 240) : ''), nodes: src ? clone(src.nodes) : [], edges: src ? clone(src.edges) : [] });
    const at = this.now(), by = this.who();
    s.workflows.push({ id, name: nm, description: w.description, enabled: false, version: 1, nodes: w.nodes, edges: w.edges, updated_at: at, updated_by: by, history: [{ version: 1, at, by, note: src ? `Copied from ${src.name}` : 'Created' }] });
    this.event(`Workflow created: ${nm}${src ? ` · copied from ${src.name}` : ''} · off`, by, 'workflows', { kind: 'workflow' });
    return { id };
  },

  'workflow.save'(s, { id, workflow, note = '' } = {}) {
    const cur = find(s, id);
    if (!isObj(workflow)) refuse('Send the workflow to save.', { status: 422, audit: false, record: 'workflows', code: 'workflow_invalid' });
    const nm = clean(workflow.name == null ? cur.name : workflow.name, 80);
    if (nm.length < 2) refuse('Give the workflow a name.', { status: 422, audit: false, record: 'workflows', code: 'workflow_name' });
    if ((Array.isArray(workflow.nodes) && workflow.nodes.length > 200) || (Array.isArray(workflow.edges) && workflow.edges.length > 400)) refuse('This workflow is too big to save.', { status: 422, audit: false, record: 'workflows', code: 'workflow_invalid' });
    // the stored shape: positions on the grid, settings from the catalog, and the locked guardrail always present (a page cannot drop it)
    const next = normalize({ name: nm, description: clean(workflow.description == null ? cur.description : workflow.description, 240), nodes: workflow.nodes, edges: workflow.edges });
    const v = validate(next, s);
    if (!v.ok) refuse(problemText(v, 'This workflow cannot be saved yet:'), { status: 422, audit: false, record: 'workflows', code: 'workflow_invalid' });
    const who = this.who(), at = this.now(), why = clean(note, 140);
    const live = normalize(cur);
    if (cur.pending && cur.pending.by !== who) refuse(`A change by ${staffName(s, cur.pending.by)} is waiting for a second person. Confirm or decline it first.`, { status: 409, audit: false, record: 'workflows', code: 'two_person_pending' });
    if (sameGraph(live, next) && !cur.pending) return { id, version: cur.version, problems: v.problems, unchanged: true };
    if (hasTwoPerson(live) || hasTwoPerson(next)) {
      cur.pending = { by: who, at, note: why, version: (cur.version || 1) + 1, workflow: { name: next.name, description: next.description, nodes: next.nodes, edges: next.edges } };
      s.workflow_confirmations = (s.workflow_confirmations || []).filter(c => c.id !== cur.id).concat([{ id: cur.id, name: next.name, by: who, at, note: why, changes: changeText(live, next), version: cur.pending.version }]);
      this.event(`Workflow change proposed: ${next.name} · ${changeText(live, next)} · needs a second person to confirm`, who, 'workflows', { kind: 'workflow' });
      return { id, version: cur.version, pending: true, problems: v.problems };
    }
    const text = changeText(live, next);
    apply(s, cur, next, who, at, why);
    this.event(`Workflow saved: ${cur.name} · v${cur.version} · ${text}${why ? ` (${why.slice(0, 80)})` : ''}`, who, 'workflows', { kind: 'workflow' });
    return { id, version: cur.version, problems: v.problems };
  },

  'workflow.enable'(s, { id, enabled } = {}) {
    const cur = find(s, id); const on = !!enabled;
    if (on === !!cur.enabled) return { id, enabled: on };
    if (on) { const v = validate(normalize(cur), s); if (!v.ok) refuse(problemText(v, `${cur.name} cannot be turned on yet:`), { status: 422, audit: false, record: 'workflows', code: 'workflow_invalid' }); }
    cur.enabled = on; cur.updated_at = this.now(); cur.updated_by = this.who();
    this.event(`Workflow turned ${on ? 'on' : 'off'}: ${cur.name}`, this.who(), 'workflows', { kind: 'workflow' });
    return { id, enabled: on };
  },

  'workflow.delete'(s, { id, reason } = {}) {
    const cur = find(s, id); const why = clean(reason, 140);
    if (why.length < 4) refuse('Say why the workflow is deleted (it is kept in the audit trail).', { status: 422, audit: false, record: 'workflows', code: 'reason_required' });
    s.workflows = s.workflows.filter(w => w.id !== id); s.workflow_confirmations = (s.workflow_confirmations || []).filter(c => c.id !== id);
    this.event(`Workflow deleted: ${cur.name} (${why.slice(0, 80)})`, this.who(), 'workflows', { kind: 'workflow' });
    return { id };
  },

  // two-person: the person who proposed a change never confirms it; an administrator or a clinician does (the capability entry above)
  'workflow.confirm'(s, { id, decision = 'approve' } = {}) {
    const cur = find(s, id); const p = cur.pending;
    if (!['approve', 'decline'].includes(decision)) refuse('Choose approve or decline.', { status: 422, audit: false, record: 'workflows' });
    if (!p) refuse('Nothing is waiting for a second person on this workflow.', { status: 409, audit: false, record: 'workflows', code: 'not_pending' });
    const who = this.who();
    if (p.by === who) refuse('A different person must confirm a workflow change.', { status: 403, record: 'workflows', code: 'two_person' });
    const at = this.now();
    if (decision === 'decline') {
      delete cur.pending; s.workflow_confirmations = (s.workflow_confirmations || []).filter(c => c.id !== id);
      this.event(`Workflow change declined: ${cur.name} · proposed by ${staffName(s, p.by)}`, who, 'workflows', { kind: 'workflow' });
      return { id, status: 'declined', version: cur.version };
    }
    const next = normalize({ ...p.workflow }); const v = validate(next, s);
    if (!v.ok) refuse(problemText(v, 'This change can no longer be applied:'), { status: 422, audit: false, record: 'workflows', code: 'workflow_invalid' });
    const text = changeText(normalize(cur), next);
    apply(s, cur, next, p.by, at, p.note, who);
    this.event(`Workflow change approved: ${cur.name} · v${cur.version} · ${text} · proposed by ${staffName(s, p.by)}`, who, 'workflows', { kind: 'workflow' });
    return { id, status: 'approved', version: cur.version };
  }
};
