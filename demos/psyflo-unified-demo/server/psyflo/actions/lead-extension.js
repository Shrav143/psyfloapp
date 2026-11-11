// What the extension reports after it SEES something happen on the Lauris page the user has open:
// a person pressed Process Form, Get Signature or Reject, or created a consumer. Psyflo updates its own
// tracker from that. It never reads Lauris any other way.
import { addDays, fmtDate } from '../../../web/js/shared/dates.js';
import { rule, ruleValue } from '../../../web/js/shared/rules.js';
import { screeningFacts, draftScreening } from '../../../web/js/shared/draft.js';
import { refuse, staffFromLauris } from '../gates.js';
import { closeUnitTasks } from './core.js';
import { attest } from '../../attest.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const NOTE_TYPE = { dpn: 'daily', weekly: 'weekly_guardian', collateral: 'monthly_collateral', quarterly: 'quarterly', incident: 'incident', discharge: 'discharge' };
const FORM_NAME = { screening: 'Admission Screening', cna: 'CNA', isp: 'ISP 2.0', dpn: 'Daily Progress Note', weekly: 'Weekly guardian contact', collateral: 'Monthly collateral', time: 'Time Tracker entry', quarterly: 'Quarterly report', incident: 'Incident report', 'sra-initial': 'TDT Initial SRA', 'sra-continued': 'CMHRS Continued Stay', discharge: 'Discharge summary' };

// Wrong-patient protection: a Lauris record is matched to a Psyflo student by the Harvest # ONLY (never by initials), and the
// initials shown on the open page must agree with Psyflo's record (the identity card). Returns { client, status, reason }.
//   ok        the number is Psyflo's and the initials agree
//   unknown   no Psyflo student has that number ("not a Psyflo student": nothing is read, drafted or typed)
//   mismatch  the number is a Psyflo student's but the page shows other initials: a hard stop
export function identity(s, consumer) {
  const no = consumer && consumer.no ? Number(consumer.no) : null;
  if (!no) return { client: null, status: 'unknown', reason: 'The open page shows no Harvest #.' };
  const c = s.clients.find(x => x.lauris_no === no || x.harvest_no === no);
  if (!c) return { client: null, status: 'unknown', reason: `Harvest # ${no} is not a Psyflo student.` };
  const shown = consumer.initials ? String(consumer.initials).replace(/\s+/g, '') : '';
  if (shown && shown !== c.initials.replace(/\s+/g, '')) return { client: c, status: 'mismatch', reason: `Harvest # ${no} is ${c.initials} in Psyflo but the open page shows ${consumer.initials}. Nothing was applied.` };
  return { client: c, status: 'ok', reason: '' };
}
// kept for callers that only need the student: the strict match above, never the initials
export function matchClient(s, consumer) { const r = identity(s, consumer); return r.status === 'ok' ? r.client : null; }

// What the bridge reports is checked before Psyflo believes it (server/attest.js: demo-grade stand-in for a Lauris page session).
export function validateBridgeEvent(store, s, a) {
  if (!['created', 'saved', 'processed', 'signed', 'rejected', 'authorization'].includes(a.event)) refuse('Unknown page event.', { status: 422, audit: false });
  if (!a.user) refuse('The page bridge did not report the Lauris user. Nothing was recorded.', { code: 'no_user' });
  const staff = staffFromLauris(s, a.user);
  if (!staff) refuse(`The Lauris user "${a.user}" is not a Psyflo user. Nothing was recorded.`, { code: 'unknown_user' });
  if (!(a.consumer && a.consumer.no)) refuse('The page bridge did not report the Harvest #. Nothing was recorded.', { code: 'no_consumer' });
  if (['processed', 'signed', 'rejected'].includes(a.event) && !a.session) refuse('The page bridge did not report the session id. Nothing was recorded.', { code: 'no_session' });
  if (attest.lauris) {
    const v = attest.lauris(a);
    if (!v.ok) refuse(`The open Lauris page does not show this event (${v.reason}). Nothing was recorded.`, { code: 'not_attested', record: a.consumer.no });
  }
  return staff;
}

export default {
  'lauris.observed'(s, a) {
    s.lauris_seen = s.lauris_seen || [];
    const staff = validateBridgeEvent(this, s, a);
    const who = staff.id;
    const key = `${a.event}:${a.session || ''}:${a.consumer?.no || ''}${a.event === 'authorization' ? ':' + String(a.consumer?.units || '') : ''}`;
    if (s.lauris_seen.includes(key)) return { duplicate: true };
    const idn = identity(s, a.consumer);
    if (idn.status === 'mismatch') refuse(idn.reason, { code: 'wrong_patient', record: idn.client.id });
    s.lauris_seen.push(key);
    const c = idn.client;
    if (c && a.consumer?.no && !c.lauris_no) c.lauris_no = Number(a.consumer.no);
    const rec = c ? c.id : 'lauris';
    const v = a.values || {};
    const out = { client: c?.id };
    const info = { type: 'lauris', event: a.event, form: a.form, session: a.session, consumer: a.consumer, user: a.user, values: v, staff, client: c || null };
    const done = () => {
      info.request = out.request; info.note = out.note;
      // any page showing "N units available" for this student can close the "enter the units in Lauris" task (a person entered them)
      if (c && a.consumer && a.consumer.units) { const n = closeUnitTasks(this, s, c.id, a.consumer.units, who); if (n) out.units_task_closed = n; }
      this.hooks.run('observed', this, s, info, out); return out;
    };
    const asBridge = { actor_kind: 'bridge' };

    if (!c) return { ignored: idn.reason };   // not a Psyflo student: nothing is read or recorded
    if (a.event === 'authorization') { this.event(`Authorization saved in Lauris by a person · ${a.consumer.units || ''} (seen by the extension)`, who, rec, asBridge); return done(); }
    if (a.event === 'created') {
      c.lauris_no = Number(a.consumer.no); this.event(`Consumer created in Lauris by a person · Harvest # ${a.consumer.no} (seen by the extension)`, who, c.referral || c.id, asBridge);
      return done();
    }
    if (a.event === 'saved') { this.event(`${FORM_NAME[a.form] || a.form} saved in Lauris (not processed)`, who, rec, asBridge); return done(); }
    if (a.event === 'rejected') { this.event(`${FORM_NAME[a.form] || a.form} rejected in Lauris Forms to Approve`, who, rec, asBridge); return done(); }

    if (a.event === 'signed') {
      const req = s.requests.find(r => r.client === c.id && ['awaiting_signature', 'needs_approval'].includes(r.stage) && r.lauris_session === a.session && ((a.form === 'sra-initial' && r.type === 'initial') || (a.form === 'sra-continued' && r.type !== 'initial')));
      if (req) {
        const lines = (a.preview?.rows || []).map(r => ({ text: `${r.label}: ${r.value}` }));
        lines.unshift({ text: a.preview?.title || FORM_NAME[a.form], bold: true, size: 12 });
        const res = this.actions['request.signed'].call(this, s, { id: req.id, preview: lines, signer: a.user, signer_credential: staff.credential, session: a.session, consumer: a.consumer.no });
        out.request = req.id; out.file = res.file; out.hold = res.hold;
      } else this.event(`${FORM_NAME[a.form] || a.form} signed in Lauris Forms to Approve by ${a.user}`, who, rec, asBridge);
      return done();
    }

    // processed
    this.event(`Process Form pressed in Lauris · ${FORM_NAME[a.form] || a.form}`, who, rec, asBridge);
    const tl = c.timeline = c.timeline || {};
    switch (a.form) {
      case 'screening': {
        const sc = s.screenings.find(x => x.client === c.id) || (s.screenings.push({ client: c.id, referral: c.referral }), s.screenings.at(-1));
        if (sc.processed_at) refuse(`The screening for ${c.initials} was already processed in Lauris; the processed record is not changed. A second processed event was not applied.`, { record: c.id, code: 'write_once' });
        Object.assign(sc, { status: 'done', processed_at: this.now(), values: v, session: a.session });
        if (!sc.when) sc.when = this.now();
        tl.screening = sc.when; c.stage = 'intake'; c.clock30_start = s.today;
        const r = byId(s.referrals, c.referral); if (r) { r.stage = 'in_intake'; r.next = 'Intake / CNA next'; r.screening = { who, when: sc.when }; }
        if (v['Preliminary diagnosis']) c.diagnosis = v['Preliminary diagnosis'];
        { const lim = rule(s, 'initial_sra.send_within_days'); this.event(`Screening processed · ${lim.value}-day send limit counts from ${ruleValue(s, 'initial_sra.start_event', 'intake_processed').replace(/_/g, ' ')} (${lim.verification.toLowerCase()})`, who, c.referral || c.id, asBridge); }
        break;
      }
      case 'cna': tl.intake = this.now(); c.stage = 'intake'; break;
      case 'isp': {
        tl.isp = this.now();
        const goals = [1, 2, 3].map(n => ({ n, name: (c.goals?.[n - 1]?.name) || '', objective: v[`Goal ${n} · Objective`] || '', interventions: [v[`Goal ${n} · Intervention 1`], v[`Goal ${n} · Intervention 2`]].filter(Boolean).map(x => x.split(' ').slice(0, 2).join(' ')) })).filter(g => g.objective);
        if (goals.length) c.goals = goals;
        if (v['Diagnosis 1']) c.diagnosis = v['Diagnosis 1'];
        if (v['Strengths']) c.strengths = v['Strengths'];
        // initial: Psyflo drafts the request after the ISP
        if (c.stage !== 'in_service') {
          const id = c.id === 'TW' ? 'R-0416' : undefined;
          const res = this.actions['request.ensure'].call(this, s, { id, client: c.id, type: 'initial' });
          out.request = res.id;
        }
        break;
      }
      case 'sra-initial': case 'sra-continued': {
        const type = a.form === 'sra-initial' ? 'initial' : 'continued_stay';
        let req = s.requests.find(r => r.client === c.id && r.type === type && ['draft_ready', 'needs_approval', 'awaiting_signature'].includes(r.stage));
        if (!req) { const res = this.actions['request.ensure'].call(this, s, { id: c.id === 'TW' && type === 'initial' ? 'R-0416' : undefined, client: c.id, type }); req = byId(s.requests, res.id); }
        if (req.stage === 'draft_ready') { this.actions['request.processed'].call(this, s, { id: req.id, session: a.session, consumer: a.consumer.no, lauris_user: a.user }); req.typed_boxes = a.typed || []; }
        tl.sra_processed = this.now();
        out.request = req.id;
        break;
      }
      default: {
        const type = NOTE_TYPE[a.form]; if (!type) break;
        const units = parseInt(v['Units'], 10) || (type === 'daily' ? 0 : undefined);
        const dict = s.dictations.find(d => d.client === c.id && d.status === 'waiting');
        const note = this.actions['note.processed'].call(this, s, { client: c.id, staff: who, type, fields: v, session: a.session, consumer: a.consumer.no, enhanced: v['Narrative'] || v['What was discussed'] || v['Information shared / received'] || '', dictation: dict?.spoken, units });
        if (dict && a.form === 'dpn') { dict.status = 'used'; dict.used_at = this.now(); }
        for (const as of s.assessments.filter(x => x.client === c.id && x.status === 'dropped')) as.status = 'used';
        if (type === 'daily' && c.authorization && units) c.authorization.used = (c.authorization.used || 0) + units;
        if (type === 'incident') {
          const inc = s.incidents.find(i => i.client === c.id && i.status === 'file_now');
          if (inc) { inc.lauris_processed = this.now(); this.event('Incident report processed in Lauris · state portal still due ' + (inc.state_portal_due ? fmtDate(inc.state_portal_due) + ' ' + inc.state_portal_due.slice(11) : ''), who, c.id, asBridge); }
        }
        if (type === 'discharge') {
          const plan = s.plans.find(p => p.client === c.id);
          const res = this.actions['request.ensure'].call(this, s, { client: c.id, type: 'early_discharge_new_initial', payer: c.authorization?.payer || c.medicaid?.plan });
          this.event('Discharge summary processed · new initial request drafted' + (plan ? ' (earliest ' + fmtDate(plan.new_initial) + ')' : ''), 'Psyflo', res.id, { actor_kind: 'system' });
          out.request = res.id;
        }
        out.note = note.id;
      }
    }
    return done();
  },

  // the extension read an upload confirmation on the portal page the clinician had open (PS-2: matched to the request AND the issued reference)
  'portal.observed'(s, { ref, request, kind }) {
    if (!ref) refuse('No confirmation number was read from the portal page.', { code: 'no_ref', audit: false });
    const known = attest.portalKnown(ref);
    if (attest.lauris && !known) refuse(`The confirmation ${ref} was not issued by the portal page. Nothing was recorded.`, { code: 'unknown_ref' });
    if (kind === 'incident' || /^VA-INC-/.test(ref) || (known && known.kind === 'incident')) {
      const inc = s.incidents.find(i => i.state_portal_filed && !i.portal_ref);
      if (!inc) return { none: true };
      inc.portal_ref = ref; this.event(`State portal confirmation read from the open page · ref ${ref}`, inc.filed_by || 'bridge', inc.client, { actor_kind: 'bridge' });
      return { incident: true };
    }
    if (!request) refuse('The portal confirmation does not say which request it belongs to. Nothing was attached.', { code: 'no_request', audit: false });
    const r = byId(s.requests, request);
    if (!r || r.stage !== 'portal_open') refuse(`The confirmation ${ref} does not match a request waiting for a portal upload (${request}).`, { code: 'no_match', record: request });
    if (known && known.request && known.request !== request) refuse(`The confirmation ${ref} was issued for ${known.request}, not ${request}.`, { code: 'wrong_request', record: request });
    this.actions['request.portalConfirmed'].call(this, s, { id: r.id, ref });
    this.hooks.run('observed', this, s, { type: 'portal', ref, request: r.id }, {});
    return { request: r.id };
  },

  // the panel shows a draft; Psyflo records which boxes it typed and from which sources (audit for rule 7)
  'panel.filled'(s, { client, form, boxes, sources }) {
    s.fills = s.fills || [];
    s.fills.push({ client, form, at: this.now(), boxes: (boxes || []).map(b => ({ label: b.label, src: b.src, value: b.value })), sources });
    this.event(`Psyflo typed ${boxes.length} box${boxes.length === 1 ? '' : 'es'} into the open ${FORM_NAME[form] || form} (yellow · check them)`, 'Psyflo', client);
  },

  // Flow A: screening draft is computed from the transcript and kept with its sources
  'screening.drafted'(s, { client, referral, transcript }) {
    const c = byId(s.clients, client);
    const fl = s.family_links.find(f => f.referral === referral);
    const d = draftScreening({ transcript, today: s.today, guardianPhone: fl?.answers?.phone || c?.guardian?.phone || '', referral: byId(s.referrals, referral) });
    const sc = s.screenings.find(x => x.client === client) || (s.screenings.push({ client, referral }), s.screenings.at(-1));
    Object.assign(sc, { transcript, facts: d.facts, boxes: d.boxes, drafted_at: this.now(), when: sc.when || this.now() });
    this.event(`Screening call recorded · ${new Set(d.boxes.map(b => b.row || b.label)).size} boxes drafted from the call`, 'Psyflo', referral || client);
    return { boxes: d.boxes.length };
  }
};
