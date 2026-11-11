// Foundation actions (F1): the rules table editor, scenarios for the presenter dock, and two-person designations.
// Documented in docs/BUILD-BRIEF.md ("Foundation notes (F1)").
import { addDays } from '../../../web/js/shared/dates.js';
import { MATRIX, CAP_LIST } from '../../../web/js/shared/permissions.js';
import { Refusal, refuse } from '../gates.js';
import { rule } from '../../../web/js/shared/rules.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Scenario table (seed/extra/scenarios.json -> state.scenarios). Tweaks reshape the preset for one scenario.
const TWEAKS = {
  // s3: the initial SRA for T.W. is drafted but not yet processed, approved, signed or sent (canvas snapshot minus its tail)
  's3-draft'(store, s) {
    const r = byId(s.requests, 'R-0416'); if (!r) return;
    for (const k of ['sent', 'fax_ref', 'decision_due', 'decision_basis', 'receipt_check', 'receipt_confirmed', 'receipt_by', 'delivery_receipt', 'signed_at', 'signed_by', 'signed_credential', 'signed_session', 'signed_pdf', 'signed_name', 'pages', 'approval', 'approved_by', 'approved_at', 'processed_at', 'lauris_session', 'lauris_consumer', 'processed_by', 'sent_by', 'send_pressed_at', 'signature_hold_event', 'signature_flag']) delete r[k];
    r.stage = 'draft_ready'; r.drafted_at = store.now();
    s.events = s.events.filter(e => !(e.record === 'R-0416' && /processed|Signed|signed|Send pressed|Sfax|receipt|Receipt|Packet assembled|Approved/i.test(e.what)));
    const c = byId(s.clients, 'TW'); if (c && c.timeline) { delete c.timeline.sra_processed; delete c.timeline.sra_signed; delete c.timeline.sent; }
    store.event('Initial SRA drafted from the record (scenario start)', 'Psyflo', 'R-0416', { actor_kind: 'system' });
  }
};

export default {
  // Reset to the scenario's preset, apply its tweaks, return where the presenter dock should go.
  'demo.scenario'(s, { id }) {
    const sc = (s.scenarios || []).find(x => x.id === id);
    if (!sc) throw new Error('Unknown scenario: ' + id);
    // the table lives in state, which reset rebuilds from the seed: keep a reference first
    this.reset(sc.preset || 'live');
    const st = this.state;
    for (const t of sc.tweaks || []) if (TWEAKS[t]) TWEAKS[t](this, st);
    this.hooks.run('scenario', { id, preset: st.preset, state: st });
    this.event(`Demo: scenario ${id} started · ${sc.title}`, this.who(), 'scenario', { demo: true, sim: true, actor_kind: 'demo' });
    return { id, title: sc.title, role: sc.role, staff: sc.staff, surface: sc.surface, route: sc.route, client: sc.case && sc.case.client || null, case: sc.case || null, preset: sc.preset, steps: sc.steps };
  },

  // Edit a row of the rules table. Audited; applies forward only (stored dates are not recomputed). value must keep the type of the default.
  'settings.rule'(s, { key, value, scope = null, enabled, reason, reset = false }) {
    const row = (s.rules || []).find(r => r.key === key && (r.scope || null) === (scope || null));
    if (!row) throw new Error('Unknown rule: ' + key);
    if (String(reason || '').trim().length < 4) refuse('Say why the rule is changing (it is kept in the audit trail).', { status: 422, audit: false });
    const nv = reset ? row.default : value;
    if (nv !== undefined) {
      if (typeof nv !== typeof row.default || Array.isArray(nv) !== Array.isArray(row.default)) refuse(`The value for ${key} must be a ${Array.isArray(row.default) ? 'list' : typeof row.default}.`, { status: 422, audit: false });
      if (key === 'units.tdt.day_tiers' || key === 'units.tdt.alt_tiers') {
        const ok = Array.isArray(nv) && nv.length && nv.every((b, i) => Array.isArray(b) && b.length === 2 && Number.isInteger(b[0]) && Number.isInteger(b[1]) && b[0] > 0 && b[1] > 0 && (i === 0 || (b[0] > nv[i - 1][0] && b[1] > nv[i - 1][1])));
        if (!ok) refuse('Unit bands must be [minutes, units] pairs, both increasing.', { status: 422, audit: false });
      }
      if (typeof nv === 'number' && (!Number.isFinite(nv) || nv < 0)) refuse('A rule number must be zero or more.', { status: 422, audit: false });
    }
    const from = row.value, was = row.enabled;
    row.history = (row.history || []).concat([{ at: this.now(), by: this.who(), from, to: nv !== undefined ? nv : from, enabled: enabled !== undefined ? !!enabled : row.enabled, reason: String(reason).trim() }]);
    if (nv !== undefined) row.value = nv;
    if (enabled !== undefined) row.enabled = !!enabled;
    row.effective_from = s.today; row.changed_by = this.who();
    this.event(`Rule changed: ${row.label} · ${JSON.stringify(from)} → ${JSON.stringify(row.value)}${was !== row.enabled ? (row.enabled ? ' · on' : ' · off') : ''} (${String(reason).trim().slice(0, 80)}) · applies from now on`, this.who(), 'rules');
    return { key, value: row.value, verification: rule(s, key).verification };
  },

  // Two-person designations: one person proposes, a different admin or clinician confirms. Never for demo.controls.
  'user.designate'(s, { id, cap, grant = true, reason }) {
    const u = byId(s.staff, id); if (!u) throw new Error('User not found');
    if (!CAP_LIST.includes(cap)) throw new Error('Unknown capability: ' + cap);
    if (cap === 'demo.controls') refuse('Presenter controls are not a designation.', { status: 422, audit: false });
    if (MATRIX[u.role][cap] !== 'D') refuse(`${cap} cannot be designated to a ${u.role.replace('_', ' ')}: the matrix gives it as ${MATRIX[u.role][cap] === 'N' ? 'never' : MATRIX[u.role][cap] === 'Y' ? 'always' : 'own caseload only'}.`, { status: 422, audit: false });
    if (String(reason || '').trim().length < 4) refuse('Say why (it is kept in the audit trail).', { status: 422, audit: false });
    s.designations = s.designations || [];
    const pid = 'des-' + (s.designations.length + 1);
    s.designations.push({ id: pid, user: id, cap, grant: !!grant, reason: String(reason).trim(), by: this.who(), at: this.now(), status: 'pending' });
    this.event(`Designation proposed: ${grant ? 'grant' : 'remove'} ${cap} for ${u.name} · needs a second person to confirm`, this.who(), id);
    return { id: pid };
  },
  'user.designateApprove'(s, { id, decision = 'approve' }) {
    const d = byId(s.designations || [], id); if (!d) throw new Error('Designation not found');
    if (d.status !== 'pending') refuse('This designation was already decided.', { record: d.user, code: 'write_once' });
    if (d.by === this.who()) refuse('A different person must confirm a designation.', { record: d.user, status: 403, code: 'two_person' });
    const role = this.actor && this.actor.role;
    if (!['admin', 'clinician'].includes(role)) refuse('Only an administrator or a clinician confirms a designation.', { record: d.user, status: 403 });
    const u = byId(s.staff, d.user);
    d.status = decision === 'approve' ? 'approved' : 'rejected'; d.decided_by = this.who(); d.decided_at = this.now();
    if (d.status === 'approved' && u) {
      u.designations = (u.designations || []).filter(x => x !== d.cap);
      if (d.grant) u.designations.push(d.cap);
    }
    this.event(`Designation ${d.status}: ${d.grant ? 'grant' : 'remove'} ${d.cap} for ${u ? u.name : d.user}`, this.who(), d.user);
    return { status: d.status };
  }
};
