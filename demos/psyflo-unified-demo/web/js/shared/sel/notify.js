// Notifications (R3 · AUTH): a separate system from the work lists. PURE ESM (the bell, the server's notify.read action and the tests import it).
//
//   notificationsFor(s, actor)  -> [{ id, at, kind, sev:'r'|'y'|'n', title, sub, record, to, read, group }]   newest and most urgent first
//   unreadCount(s, actor)       -> number
//
// What produces one (each only for records the role may open; a role never gets an item about a record it cannot see):
//   flag      an open flag raised by somebody else on an authorization
//   payer     a payer information request, a partial offer, a denial, a peer-to-peer, a decision overdue, a follow-up call due (Denial Intelligence
//             items point at the Denial Intelligence case when the role may open it)
//   deadline  a deadline due soon or overdue that is not a payer item: reauth due, appeal window, send-by limit
//   units     75% of the units are used (rules table, units.warn_used_pct) or none are left
//   note      direct support only: a note sent back, a note behind
//   workflow  the enabled workflows (Settings > Workflows, shared/workflows/engine.js workflowItems): the effects meant for the person's role
//             (a notice, a suggested flag, a task for a person), after the guardrails. Group 'Workflows'; source = { workflow, name, node, action }
// Ids are computed from the record and the state that raised the item ("payer:R-0408:info_requested"), so a new situation on the same
// record is unread again. Read state is per person: state.notify_read[personId] (written by the notify.read action).
import * as M from '../model.js';
import { fmtDate } from '../dates.js';
import { can } from '../permissions.js';
import { ruleValue } from '../rules.js';
import { deadline, reqView, DI_STAGES, flagReasonLabel } from './auth.js';
import { workflowItems } from '../workflows/engine.js';

const SEV = { r: 0, y: 1, n: 2 };
const sevOf = d => (d === 'overdue' ? 'r' : d === 'soon' ? 'y' : 'n');
const payerShort = (s, id) => (id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id));
const staffShort = (s, id) => (id && M.byId(s.staff, id) ? M.staffShort(s, id) : id || '');
const toCase = id => `Authorization.dc.html?id=${id}`;

export function notificationsFor(s, actor) {
  if (!s || !actor || !actor.role) return [];
  const out = []; const today = s.today; const read = new Set(((s.notify_read || {})[actor.id]) || []);
  const add = n => out.push({ sev: 'y', kind: 'deadline', ...n, read: read.has(n.id) });
  const canAuth = can(actor, 'authorizations'); const canDI = can(actor, 'denials');

  if (canAuth) {
    // flags raised by somebody else
    for (const f of s.flags || []) {
      if (f.status !== 'open' || f.by === actor.id) continue; const r = M.byId(s.requests, f.request); if (!r) continue;
      add({ id: 'flag:' + f.id, at: f.at, kind: 'flag', sev: 'y', title: `${staffShort(s, f.by)} flagged ${M.clientLabel(s, r.client, false)}`, sub: [flagReasonLabel(f.reason), f.note].filter(Boolean).join(' · '), record: r.id, to: toCase(r.id), group: 'Flags' });
    }
    // payer items and deadlines
    for (const q of s.requests || []) {
      const r = reqView(s, q); const lbl = M.clientLabel(s, r.client, false); const pay = payerShort(s, r.payer); const dl = deadline(s, r);
      const dlText = dl && dl.kind !== 'none' ? [dl.text, dl.sub].filter(Boolean).join(' · ') : '';
      const di = DI_STAGES.includes(r.stage); const to = di && canDI ? `DenialCase.dc.html?id=${r.id}` : toCase(r.id);
      const payer = (key, at, title, sev, sub) => add({ id: `payer:${r.id}:${key}`, at: String(at || today).length === 10 ? at + 'T00:00' : at, kind: 'payer', sev, title, sub: sub || dlText, record: r.id, to, group: 'Payer' });
      if (r.stage === 'info_requested') payer('info_requested', r.info_requested_at, `${lbl} · ${pay} asked for information`, dl.sev === 'overdue' ? 'r' : 'y');
      else if (r.stage === 'partial_decide') payer('partial', r.offer_call, `${lbl} · ${pay} offered ${r.units_offered} of ${r.units_requested} units`, dl.sev === 'overdue' ? 'r' : 'y');
      else if (r.stage === 'denied') payer('denied', r.denied_on, `${lbl} · ${pay} denied the request`, dl.sev === 'overdue' ? 'r' : 'y');
      else if (r.stage === 'peer_to_peer_requested' || r.stage === 'peer_to_peer_booked') payer('p2p:' + (r.p2p_at || ''), r.p2p_at || r.offer_call, `${lbl} · peer-to-peer with ${pay}`, dl.sev === 'overdue' ? 'r' : 'y');
      else if (r.stage === 'overdue') payer('overdue', r.sent, `${lbl} · ${pay} decision is overdue`, 'r');
      else if (r.stage === 'submitted' && dl.kind === 'followup' && dl.sev !== 'ok') payer('followup', r.sent, `${lbl} · follow-up call to ${pay} is due`, sevOf(dl.sev));
      else if (dl && dl.sev !== 'none' && dl.sev !== 'ok' && dl.date) add({ id: `deadline:${r.id}:${String(dl.date).slice(0, 10)}`, at: String(dl.date).slice(0, 10) + 'T00:00', kind: 'deadline', sev: sevOf(dl.sev), title: `${lbl} · ${dl.text}`, sub: dl.sub, record: r.id, to: toCase(r.id), group: 'Deadlines' });
    }
  }

  // units: the clients whose authorization is at the warning threshold (status only; nothing clinical)
  const warn = ruleValue(s, 'units.warn_used_pct', 75);
  for (const c of s.clients || []) {
    const a = c.authorization; if (!a || !(a.units > 0) || a.used == null) continue;
    if (actor.role === 'direct_support' && c.staff !== actor.id) continue;
    if (actor.role === 'guardian' || actor.role === 'school') continue;
    const used = Math.round(100 * a.used / a.units); if (used < warn) continue;
    const left = Math.max(0, a.units - a.used); const req = (s.requests || []).find(x => x.client === c.id && x.stage !== 'closed');
    add({ id: `units:${c.id}:${a.units}:${a.used}`, at: (a.exhausted ? a.exhausted : today) + 'T00:00', kind: 'units', sev: left === 0 ? 'r' : 'y', title: `${M.clientLabel(s, c.id, false)} · ${left === 0 ? 'no units left' : used + '% of units used'}`, sub: `${left} left of ${a.units}${a.end ? ' · ends ' + fmtDate(a.end) : ''}`, record: req ? req.id : c.id, to: req && canAuth ? toCase(req.id) : `Patient?id=${c.id}&section=authorization`, group: 'Units' });
  }

  // direct support: notes sent back and notes behind, for their own patients
  if (actor.role === 'direct_support') {
    for (const n of s.notes || []) {
      if (n.staff !== actor.id || !['returned', 'flagged'].includes(n.review)) continue;
      add({ id: `note:${n.id}:${n.review}`, at: (n.reviewed_at || n.date) + (String(n.reviewed_at || n.date).length === 10 ? 'T00:00' : ''), kind: 'note', sev: 'r', title: `${M.clientLabel(s, n.client, false)} · note sent back`, sub: n.review_comment ? `"${String(n.review_comment).slice(0, 90)}"` : fmtDate(n.date), record: n.client, to: `Patient?id=${n.client}&section=documentation`, group: 'Notes' });
    }
  }

  // the enabled workflows' items for this role (an administrator's own workflows included); each is computed from the same state, never stored
  for (const n of workflowItems(s, actor)) add(n);

  // newest first within urgency; unread before read
  return out.sort((a, b) => (a.read - b.read) || (SEV[a.sev] - SEV[b.sev]) || String(b.at).localeCompare(String(a.at)) || String(a.id).localeCompare(String(b.id)));
}
export const unreadCount = (s, actor) => notificationsFor(s, actor).filter(n => !n.read).length;
