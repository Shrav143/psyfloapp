// Settings actions (E1): people and roles, designations (two-person), family-link questions.
// The rules table is edited through F1's settings.rule (admin.settings, audited, forward only); this file adds nothing to it.
//
// Policy, in one place:
//   · A role change is logged with a reason. Lowering a role applies at once. RAISING a role (towards clinician or administrator,
//     who can see clinical text or change settings) needs a second person (an administrator or a clinician who is not the proposer).
//   · Nobody changes their own role or proposes a designation for themselves.
//   · New users start as direct support or supervisor; more access goes through a role change.
//   · Designations (the D cells of the matrix) reuse F1's user.designate / user.designateApprove so the audit rows stay in one place.
import { refuse } from '../gates.js';
import { STAFF_ROLES } from '../../../web/js/shared/permissions.js';

const RANK = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
const byId = (arr, id) => (arr || []).find(x => x.id === id);
const TITLE = { direct_support: 'Direct support', supervisor: 'Site supervisor', clinician: 'Clinician', admin: 'Administrator' };
const need = (cond, msg, opts = {}) => { if (!cond) refuse(msg, { status: 422, audit: false, ...opts }); };
const reasonOf = r => { const v = String(r || '').trim(); need(v.length >= 4, 'Say why (it is kept in the audit trail).'); return v.slice(0, 240); };
const titleFor = (u, role) => (!u.title || Object.values(TITLE).some(t => String(u.title).startsWith(t)) || u.title === 'Supervisor') ? TITLE[role] : u.title;

function applyRole(store, s, u, role, extra) {
  const from = u.role;
  u.role = role; u.title = titleFor(u, role);
  if (role === 'direct_support' && !u.review_mode) { u.review_mode = 'every_note'; u.reviewer = null; }   // approval required until a supervisor is assigned in Team
  if (role !== 'direct_support') { delete u.review_mode; delete u.reviewer; delete u.review_reason; }
  if (role !== 'supervisor' && role !== 'clinician' && role !== 'admin') u.designations = [];
  store.event(`Role changed: ${u.name} · ${TITLE[from]} → ${TITLE[role]}${extra ? ' · ' + extra : ''}`, store.who(), u.id);
}

export default {
  // Change a person's role with a logged reason. Lowering applies at once; raising waits for a second person.
  'settings.role'(s, { id, role, reason }) {
    const u = byId(s.staff, id); need(u, 'User not found.');
    need(STAFF_ROLES.includes(role), 'Choose one of the four staff roles.');
    need(u.role !== role, `${u.name} is already ${TITLE[role].toLowerCase()}.`);
    if (id === this.who()) refuse('You cannot change your own role. Ask another administrator.', { status: 403, code: 'self_change', record: id });
    const why = reasonOf(reason);
    if (u.role === 'admin' && (s.staff || []).filter(x => x.role === 'admin').length <= 1) refuse('This is the only administrator. Add another before changing this role.', { status: 422, record: id, audit: false });
    s.role_changes = s.role_changes || [];
    const rc = { id: 'rc-' + (s.role_changes.length + 1), user: id, from: u.role, to: role, reason: why, by: this.who(), at: this.now(), status: 'pending' };
    s.role_changes.push(rc);
    if (RANK[role] > RANK[u.role]) {
      this.event(`Role change proposed: ${u.name} · ${TITLE[u.role]} → ${TITLE[role]} · needs a second person to confirm (${why})`, this.who(), id);
      return { id: rc.id, status: 'pending' };
    }
    rc.status = 'applied'; rc.decided_by = this.who(); rc.decided_at = this.now();
    applyRole(this, s, u, role, why);
    return { id: rc.id, status: 'applied' };
  },
  'settings.roleDecide'(s, { id, decision = 'approve' }) {
    const rc = byId(s.role_changes, id); need(rc, 'Role change not found.', { status: 404 });
    if (rc.status !== 'pending') refuse('This role change was already decided.', { record: rc.user, code: 'write_once' });
    if (rc.by === this.who()) refuse('A different person must confirm a role change.', { record: rc.user, status: 403, code: 'two_person' });
    const role = this.actor && this.actor.role;
    if (!['admin', 'clinician'].includes(role)) refuse('Only an administrator or a clinician confirms a role change.', { record: rc.user, status: 403 });
    const u = byId(s.staff, rc.user); need(u, 'User not found.');
    rc.status = decision === 'approve' ? 'approved' : 'declined'; rc.decided_by = this.who(); rc.decided_at = this.now();
    if (rc.status === 'approved') applyRole(this, s, u, rc.to, `confirmed by ${byId(s.staff, this.who())?.name || this.who()}`);
    else this.event(`Role change declined: ${u.name} stays ${TITLE[u.role]}`, this.who(), u.id);
    return { status: rc.status };
  },

  // New users start as direct support or supervisor (more access is a role change with a second person).
  'settings.userAdd'(s, { name, credential = '', role = 'direct_support', sites = ['CC-ES1'], review_mode = 'every_note', reviewer = null }) {
    need(String(name || '').trim().length >= 2, 'Type a name.');
    need(['direct_support', 'supervisor'].includes(role), 'A new user starts as direct support or supervisor. Clinician and administrator access needs a role change confirmed by a second person.');
    const sup = reviewer && byId(s.staff, reviewer);
    if (role === 'direct_support') need(!reviewer || (sup && ['supervisor', 'clinician'].includes(sup.role)), 'The reviewer must be a supervisor or a clinician.');
    return this.actions['user.add'].call(this, s, { name: String(name).trim(), credential: String(credential).trim(), role, sites, review_mode: role === 'direct_support' ? review_mode : null, reviewer: role === 'direct_support' ? reviewer : null });
  },

  // Designations (D cells): nobody proposes one for themselves; the rest is F1's two-person flow.
  'settings.designate'(s, args) {
    if (args && args.id === this.who()) refuse('A designation is never proposed for your own account.', { status: 403, code: 'self_grant', record: args.id });
    const pending = (s.designations || []).find(d => d.status === 'pending' && d.user === args.id && d.cap === args.cap);
    if (pending) refuse('A designation for this person and permission is already waiting for a second person.', { status: 409, record: args.id, audit: false });
    return this.actions['user.designate'].call(this, s, args);
  },
  'settings.designateDecide'(s, args) { return this.actions['user.designateApprove'].call(this, s, args); },

  // Family-link questions: ask and required switches (the guardian link reads them). The insurance question is locked; clinical questions are not allowed.
  'settings.familyQuestion'(s, { key, ask, required }) {
    const fl = ((s.settings = s.settings || {}).family_link = s.settings.family_link || { questions: [] });
    const q = (fl.questions || []).find(x => x.key === key); need(q, 'Unknown question.');
    if (q.locked) refuse('This question runs the eligibility check and stays on.', { status: 422, audit: false });
    const was = { ask: q.ask !== false, required: !!q.required };
    if (ask !== undefined) q.ask = !!ask;
    if (required !== undefined) q.required = !!required;
    if (q.ask === false) q.required = false;
    if (was.ask === (q.ask !== false) && was.required === !!q.required) return { key, ask: q.ask !== false, required: !!q.required };
    this.event(`Family link question ${q.ask === false ? 'turned off' : q.required ? 'required' : 'optional'}: ${q.label}`, this.who(), 'settings');
    return { key, ask: q.ask !== false, required: !!q.required };
  }
};

export const authz = {
  'settings.role': { any: ['admin.users'] },
  'settings.roleDecide': { any: ['admin.users', 'drafts.clinical'] },
  'settings.userAdd': { any: ['admin.users'] },
  'settings.designate': { any: ['admin.users'] },
  'settings.designateDecide': { any: ['admin.users', 'drafts.clinical'] },
  'settings.familyQuestion': { any: ['admin.settings'] }
};
// the two lists below are small and only people with the right to confirm or manage need them; everyone else gets them empty
export const projection = {
  role_changes: { admin: true, clinician: true, default: false }
};
