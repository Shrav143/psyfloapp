// What the extension reports after it SEES something happen on the Client Record page the user has open:
// a person pressed Process Form, Get Signature or Reject, or created a consumer. Psyflo updates its own
// tracker from that. It never reads Client Record any other way.
import { addDays, fmtDate } from '../../../web/js/shared/dates.js';
import { screeningFacts, draftScreening } from '../../../web/js/shared/draft.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const NOTE_TYPE = { dpn: 'daily', weekly: 'weekly_guardian', collateral: 'monthly_collateral', quarterly: 'quarterly', incident: 'incident', discharge: 'discharge' };
const FORM_NAME = { screening: 'Intake screening', cna: 'ASAM assessment', isp: 'Treatment plan', dpn: 'IOP group note', weekly: 'Individual session note', collateral: 'Collateral contact', quarterly: 'ASAM 30-day review', incident: 'Incident report', 'sra-initial': 'Prior authorization request (initial)', 'sra-continued': 'Continued stay request', discharge: 'Discharge / transfer summary' };

// Match the Client Record client to a Psyflo client: by the CCC of SN client # Psyflo already learned, then by initials.
export function matchClient(s, consumer) {
  if (!consumer) return null;
  const no = consumer.no ? Number(consumer.no) : null;
  return s.clients.find(c => no && (c.lauris_no === no || c.harvest_no === no)) || s.clients.find(c => consumer.initials && c.initials === consumer.initials) || null;
}

// picklist value "CBT-RP Relapse prevention (CBT)" → its intervention code (longest code the value starts with)
function codeOf(s, x) {
  const hit = (s.interventions || []).map(i => i.code).filter(code => x === code || x.startsWith(code + ' ')).sort((a, b) => b.length - a.length)[0];
  return hit || x.split(' ')[0];
}

export default {
  'lauris.observed'(s, a) {
    s.lauris_seen = s.lauris_seen || [];
    const key = `${a.event}:${a.session || ''}:${a.consumer?.no || ''}`;
    if (s.lauris_seen.includes(key)) return { duplicate: true };
    s.lauris_seen.push(key);
    const c = matchClient(s, a.consumer);
    if (c && a.consumer?.no && !c.lauris_no) c.lauris_no = Number(a.consumer.no);
    const who = (s.staff.find(x => a.user && (a.user.startsWith(x.name.split(' ')[0][0] + '. ' + x.name.split(' ').slice(-1)[0]) || a.user === x.name)) || {}).id || 'jperez';
    const rec = c ? c.id : (a.consumer?.initials || 'lauris');
    const v = a.values || {};
    const out = { client: c?.id };

    if (a.event === 'created') {
      if (c) { c.lauris_no = Number(a.consumer.no); this.event(`Client created in Client Record by a person · CCC of SN client # ${a.consumer.no} (seen by the extension)`, who, c.referral || c.id); }
      return out;
    }
    if (a.event === 'saved') { this.event(`${FORM_NAME[a.form] || a.form} saved in Client Record (not processed)`, who, rec); return out; }
    if (a.event === 'rejected') { this.event(`${FORM_NAME[a.form] || a.form} rejected in Client Record Forms to Approve`, who, rec); return out; }

    if (a.event === 'signed') {
      const req = c && s.requests.find(r => r.client === c.id && r.stage === 'awaiting_signature' && ((a.form === 'sra-initial' && r.type === 'initial') || (a.form === 'sra-continued' && r.type !== 'initial')));
      if (req) {
        const lines = (a.preview?.rows || []).map(r => ({ text: `${r.label}: ${r.value}` }));
        lines.unshift({ text: a.preview?.title || FORM_NAME[a.form], bold: true, size: 12 });
        const res = this.actions['request.signed'].call(this, s, { id: req.id, preview: lines });
        out.request = req.id; out.file = res.file;
      } else this.event(`${FORM_NAME[a.form] || a.form} signed in Client Record Forms to Approve`, who, rec);
      return out;
    }

    if (a.event !== 'processed') return out;
    this.event(`Process Form pressed in Client Record · ${FORM_NAME[a.form] || a.form}`, who, rec);
    if (!c) return out;
    const tl = c.timeline = c.timeline || {};
    switch (a.form) {
      case 'screening': {
        const sc = s.screenings.find(x => x.client === c.id) || (s.screenings.push({ client: c.id, referral: c.referral }), s.screenings.at(-1));
        Object.assign(sc, { status: 'done', processed_at: this.now(), values: v });
        if (!sc.when) sc.when = this.now();
        tl.screening = sc.when; c.stage = 'intake';
        const r = byId(s.referrals, c.referral); if (r) { r.stage = 'in_intake'; r.next = 'ASAM assessment next'; r.screening = { who, when: sc.when }; }
        if (v['Preliminary diagnosis']) c.diagnosis = v['Preliminary diagnosis'];
        this.event('Intake screening saved · ASAM assessment next · Level 2.1 needs PA from the assessment day (no backdating)', who, c.referral || c.id);
        break;
      }
      case 'cna': tl.intake = this.now(); c.stage = 'intake'; break;
      case 'isp': {
        tl.isp = this.now();
        const goals = [1, 2, 3].map(n => ({ n, name: (c.goals?.[n - 1]?.name) || '', objective: v[`Goal ${n} · Objective`] || '', interventions: [v[`Goal ${n} · Intervention 1`], v[`Goal ${n} · Intervention 2`]].filter(Boolean).map(x => codeOf(s, x)) })).filter(g => g.objective);
        if (goals.length) c.goals = goals;
        if (v['Diagnosis 1']) c.diagnosis = v['Diagnosis 1'];
        if (v['Strengths']) c.strengths = v['Strengths'];
        // initial: Psyflo drafts the request after the treatment plan
        if (c.stage !== 'in_service') {
          const id = c.id === 'TW' ? 'R-0416' : undefined;
          const res = this.actions['request.ensure'].call(this, s, { id, client: c.id, type: 'initial' });
          out.request = res.id;
        }
        break;
      }
      case 'sra-initial': case 'sra-continued': {
        const type = a.form === 'sra-initial' ? 'initial' : 'continued_stay';
        let req = s.requests.find(r => r.client === c.id && r.type === type && ['draft_ready', 'awaiting_signature'].includes(r.stage));
        if (!req) { const res = this.actions['request.ensure'].call(this, s, { id: c.id === 'TW' && type === 'initial' ? 'R-0416' : undefined, client: c.id, type }); req = byId(s.requests, res.id); }
        if (req.stage === 'draft_ready') { req.stage = 'awaiting_signature'; req.processed_at = this.now(); req.lauris_session = a.session; req.typed_boxes = a.typed || []; }
        tl.sra_processed = this.now();
        this.event('Now in Forms to Approve · waiting for Get Signature', who, req.id);
        out.request = req.id;
        break;
      }
      default: {
        const type = NOTE_TYPE[a.form]; if (!type) break;
        const units = parseInt(v['Units'], 10) || (type === 'daily' ? 0 : undefined);
        const dict = s.dictations.find(d => d.client === c.id && d.status === 'waiting');
        const note = this.actions['note.processed'].call(this, s, { client: c.id, staff: who, type, fields: v, session: a.session, enhanced: v['Narrative'] || v['What was discussed'] || v['Information shared / received'] || '', dictation: dict?.spoken, units });
        if (dict && a.form === 'dpn') { dict.status = 'used'; dict.used_at = this.now(); }
        for (const as of s.assessments.filter(x => x.client === c.id && x.status === 'dropped')) as.status = 'used';
        if (type === 'daily' && c.authorization && units) c.authorization.used = (c.authorization.used || 0) + units;
        if (type === 'incident') {
          const inc = s.incidents.find(i => i.client === c.id && i.status === 'file_now');
          if (inc) { inc.lauris_processed = this.now(); this.event('Incident report processed in Client Record · DPBH report still due ' + (inc.state_portal_due ? fmtDate(inc.state_portal_due) + ' ' + inc.state_portal_due.slice(11) : ''), who, c.id); }
        }
        if (type === 'discharge') {
          const plan = s.plans.find(p => p.client === c.id);
          const res = this.actions['request.ensure'].call(this, s, { client: c.id, type: 'early_discharge_new_initial', payer: c.authorization?.payer || c.medicaid?.plan });
          this.event('Discharge / transfer summary saved · new Level 1 initial drafted' + (plan ? ' (by ' + fmtDate(plan.new_initial) + ')' : ''), 'Psyflo', res.id);
          out.request = res.id;
        }
        out.note = note.id;
      }
    }
    return out;
  },

  // the extension read an upload confirmation on the portal page the clinician had open
  'portal.observed'(s, { ref, request, kind }) {
    let r = request && byId(s.requests, request);
    if (!r) r = s.requests.find(q => q.stage === 'portal_open');
    if (!r) return { none: true };
    this.actions['request.portalConfirmed'].call(this, s, { id: r.id, ref });
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
