// Nevada SUD request actions (screens 35 Partials, 36 Step-down, 39 Reconsideration letter).
// Choices on a partial approval are logged on the request; nothing is sent to the plan by these actions.
// A person signs the reconsideration letter; Psyflo saves the signed PDF and never signs on its own.
import { addDays, fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf } from '../../pdf.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const short = (s, id) => ({ humana: 'SilverSummit', anthem: 'Anthem', sentara: 'Molina', aetna: 'CareSource', uhc: 'HPN', ffs: 'Nevada Medicaid FFS' }[id] || (byId(s.payers, id) || {}).name || id);
const staffName = (s, id) => { const p = byId(s.staff, id); return p ? p.name + (p.credential ? ', ' + p.credential : '') : id; };

export default {
  // choice: 'accept_next' (accept the sessions offered; Psyflo drafts the next request at session 3)
  //       | 'reconsider' (Psyflo drafts a reconsideration from the chart for a clinician to review and sign)
  //       | 'p2p' (ask for a peer-to-peer with the plan's medical director) | 'step_down' (plan the move to Level 1)
  'request.nvPartial'(s, { id, choice, plan = {}, by = 'jperez' }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage !== 'partial_decide') throw new Error('Only an open partial approval can be decided');
    const pf = short(s, r.payer);
    const units = r.units_offered || r.units_awarded || 0;
    const sessions = plan.sessions || (units <= 5 ? units : Math.round(units / 3));
    const hours = units <= 5 ? units * 3 : units;
    r.decision = { door: choice, at: this.now(), by, plan };
    if (choice === 'accept_next') {
      r.stage = 'active'; r.units_awarded = hours;
      r.next_request = { at_session: 3, due: plan.next || null, last_day: plan.last || null };
      const c = byId(s.clients, r.client);
      if (c && plan.start) c.authorization = { ...(c.authorization || {}), payer: r.payer, units: hours, used: 0, start: plan.start, end: plan.last || c.authorization?.end };
      if (plan.next) s.reminders.push({ id: 'rem-' + Math.random().toString(36).slice(2, 7), record: id, for: by, kind: 'next_request', due: plan.next, text: `Next ${pf} request for ${c?.initials || r.client} · drafted after session 3 so it is approved before session 5` });
      this.event(`Decision logged: accept ${sessions} sessions (${hours} units of H0015)${plan.last ? ' through ' + fmtDate(plan.last) : ''} · Psyflo drafts the next request after session 3${plan.next ? ' (' + fmtDate(plan.next) + ')' : ''}`, by, id);
      return { stage: r.stage };
    }
    if (choice === 'reconsider') {
      r.stage = 'draft_ready'; r.reconsideration = { at: this.now(), by };
      this.event(`Reconsideration chosen · Psyflo drafts it from the chart (ASAM dimensions, attendance, UDS) for a clinician to review and sign in Client Record · nothing sent to ${pf} yet`, by, id);
      return { stage: r.stage };
    }
    if (choice === 'p2p') {
      if (plan.when) { r.stage = 'peer_to_peer_booked'; r.p2p_at = String(plan.when).slice(0, 16); this.event(`Asked ${pf} for a peer-to-peer with the medical director · call set for ${fmtDateTime(r.p2p_at, { dow: true })}`, by, id); }
      else { r.stage = 'peer_to_peer_requested'; delete r.p2p_at; this.event(`Asked ${pf} for a peer-to-peer with the medical director · date to be set when ${pf} calls back`, by, id); }
      return { stage: r.stage };
    }
    if (choice === 'step_down') {
      r.stage = 'early_discharge'; r.units_awarded = hours;
      this.event(`Decision logged: accept ${sessions} sessions and plan the step-down to Level 1 · not sent to ${pf}`, by, id);
      return { stage: r.stage };
    }
    throw new Error('Unknown choice: ' + choice);
  },

  // Step-down 2.1 → Level 1: last IOP day, first Level 1 session, the new Level 1 initial and its decision date
  'request.stepDownPlan'(s, { request, client, last_iop, first_l1, send, decision, reminders = [], by = 'jperez' }) {
    s.plans = (s.plans || []).filter(p => p.request !== request);
    s.plans.push({ request, client, discharge: last_iop, intake: first_l1, new_initial: send, decision, step_down: true, at: this.now() });
    const r = byId(s.requests, request);
    if (r) {
      if (r.stage === 'partial_decide') { r.stage = 'early_discharge'; if (!r.units_awarded && r.units_offered) r.units_awarded = r.units_offered; }
      r.step_down = { last_iop, first_l1, send, decision };
    }
    for (const rm of reminders) s.reminders.push({ id: 'rem-' + Math.random().toString(36).slice(2, 7), record: request, ...rm });
    this.event(`Step-down plan set · last Level 2.1 IOP day ${fmtDate(last_iop)} · first Level 1 session ${fmtDate(first_l1)} · new Level 1 initial ${fmtDate(send)}`, by, request);
  },

  // A person signs the reconsideration / appeal letter. Psyflo saves the signed PDF; the signer sends it.
  'request.reconsiderSign'(s, { id, text, signer, by = 'jperez' }) {
    const r = need(byId(s.requests, id), 'Request');
    const name = signer || staffName(s, by);
    const pf = byId(s.payers, r.payer)?.name || short(s, r.payer);
    const file = this.writeFile(`${id}_reconsideration_signed.pdf`, makePdf([
      { text: 'Request for reconsideration of a denied claim / authorization', size: 14, bold: true },
      { text: 'Community Counseling Center of Southern Nevada · Las Vegas, Nevada · Provider Type 17 / Specialty 215', size: 10 },
      { text: 'To: ' + pf + ' · Provider disputes / reconsiderations', gap: 8 },
      { text: text || '', gap: 10 },
      { text: 'Signed by ' + name + ' · ' + fmtDateTime(this.now(), { year: true }), bold: true, gap: 12 },
      { text: 'Synthetic demo data · nothing is real.', size: 9, gap: 10 }
    ], { title: 'Reconsideration ' + id }));
    s.files.push({ ...file, kind: 'reconsideration', record: id, at: this.now() });
    Object.assign(r, { stage: 'appeal_sent', appeal: { text, signer: name, signed_at: this.now(), file: file.url, kind: 'reconsideration', due: addDays(s.today, 30) } });
    this.event(`Reconsideration letter signed by ${name} · signed PDF saved · ${r.channel === 'fax' ? 'faxed to ' + short(s, r.payer) : 'ready for the signer to upload in ' + (r.channel === 'availity' ? 'Availity' : 'the plan portal') + ' in their own session'}`, by, id);
    return { file };
  }
};
