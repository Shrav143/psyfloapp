// Core Psyflo actions. Each action is (state, args, ctx) => result; `this` is the store
// (this.now(), this.event(), this.who(), this.writeFile()). The store authorizes (authz.js), runs with rollback, saves and broadcasts.
//
// F1 (foundation) rules applied here:
//  - The actor is always the session actor (this.who()); args.by / staff / signer / who are ignored.
//  - request.processed / request.signed / request.portalConfirmed / note.processed are INTERNAL: they are set only from an
//    observed page event (lauris.observed / portal.observed) that carries the Harvest #, the session id and the Lauris user.
//  - Processed notes, signatures, sends and recorded payer decisions are write-once: a second attempt is a Refusal (audited);
//    a correction appends a version with a reason, never overwrites.
//  - Rules (deadlines, units, signature modes) come from the rules table (web/js/shared/rules.js), with their source chip.
import { addDays, addHours, addBusinessDays, fmtDate, fmtDateTime, daysBetween } from '../../../web/js/shared/dates.js';
import { rule, ruleValue, deadline, unitsFor, signatureMode } from '../../../web/js/shared/rules.js';
import { makePdf, jpegSize } from '../../pdf.js';
import { Refusal, refuse, needUnits, needDocRef, isLmhpCredential } from '../gates.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
export const payerName = (s, id) => (byId(s.payers, id) || {}).name || id;
const staffName = (s, id) => (byId(s.staff, id) || {}).name || id;
const sim = { sim: true };
const withCred = (name, cred) => cred && !String(name).includes(cred) ? `${name}, ${cred}` : name;
const faxRef = () => 'F-' + (2300 + Math.floor(Math.random() * 600));

// which rule governs a guardian signature on a document
const docTypeOf = form => /consent/i.test(form) ? 'consent' : /release/i.test(form) ? 'release' : /quarterly/i.test(form) ? 'quarterly' : /appeal/i.test(form) ? 'appeal' : 'enrollment';

// the date the 30-day clock for the initial request starts, from the ONE configured start event (rule initial_sra.start_event).
// When that event has not happened yet the earlier recorded one is used and the basis says so (never a silent substitution).
function clockStart(s, c) {
  const want = ruleValue(s, 'initial_sra.start_event', 'intake_processed');
  const tl = c?.timeline || {};
  const by = { consent_signed: tl.consent_signed, screening_processed: tl.screening || c?.clock30_start, intake_processed: tl.intake };
  if (by[want]) return { date: String(by[want]).slice(0, 10), event: want, fallback: false };
  const alt = ['intake_processed', 'screening_processed', 'consent_signed'].find(k => by[k]);
  return alt ? { date: String(by[alt]).slice(0, 10), event: alt, fallback: true, wanted: want } : { date: null, event: null, fallback: false, wanted: want };
}

// ---- payer decisions: write-once ledger (a correction appends a version with a reason; the earlier row stays) ----
// kind groups what may be recorded once: 'initial' (first decision on the request) or 'p2p' (peer-to-peer outcome)
export function recordDecision(store, s, r, { kind, outcome, units, doc_ref, notes, reason, simulated = false }) {
  r.decision_log = r.decision_log || [];
  const prior = r.decision_log.filter(d => d.kind === kind && !d.superseded_by).at(-1);
  if (prior && !String(reason || '').trim()) refuse(`A payer decision is already recorded for ${r.id} (${prior.outcome}, document ${prior.doc_ref}). A correction needs a reason and appends a new version; the earlier record stays.`, { record: r.id, code: 'write_once' });
  const row = { id: 'dec-' + (r.decision_log.length + 1), at: store.now(), by: store.who(), kind, outcome, units: units ?? null, doc_ref, notes: notes || undefined, reason: reason || undefined, sim: !!simulated, supersedes: prior ? prior.id : undefined };
  if (prior) prior.superseded_by = row.id;
  r.decision_log.push(row);
  return row;
}

export default {
  // ---------- demo controls (presenter mode only) ----------
  'demo.reset'(s, { preset }) { this.reset(preset); return { ok: true }; },
  // Advances the ONE demo clock: Psyflo and the mock Lauris move together. Default = the next school day; {calendar:true} = +1 calendar day; {days:n}.
  'demo.advanceDay'(s, args = {}) {
    const { from, to } = this.advanceClock({ days: args.days, calendar: !!args.calendar });
    this.event(`Demo: clock advanced ${fmtDate(from, { dow: true })} → ${fmtDate(to, { dow: true })} (Psyflo and the mock Lauris)`, this.who(), 'clock', { demo: true, sim: true, actor_kind: 'demo' });
    return { from, to, today: to };
  },

  // ---------- referrals (school portal → Psyflo) ----------
  'referral.create'(s, { form = {}, draft = false }) {
    const by = this.who().replace(/^school:/, '');
    const nums = s.referrals.map(r => +r.id.split('-')[1]);
    const id = 'REF-' + (Math.max(...nums) + 1);
    const ref = { id, client: form.client || 'New student', school: form.school || this.actor?.school || 'LC-MS2', received: this.now(), referred_by: by,
      stage: draft ? 'draft' : 'needs_screening', next: draft ? 'Draft · not sent yet' : 'Send the family link', form,
      family_link: { sent: false, opened: false, submitted: false } };
    s.referrals.unshift(ref);
    this.event(draft ? 'Referral saved as a draft by the school' : 'Referral received from the school portal', by, id);
    return { id };
  },
  'referral.update'(s, { id, form = {}, submit }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.form = { ...r.form, ...form };
    if (form.client) r.client = form.client;
    if (submit && r.stage === 'draft') { r.stage = 'needs_screening'; r.next = 'Send the family link'; r.received = this.now(); this.event('Referral sent from the school portal', r.referred_by, id); }
    return { id };
  },
  'referral.attach'(s, { id, key, name }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.form = r.form || {}; r.form.attachments = r.form.attachments || {};
    r.form.attachments[key] = name || true;
    if (r.stage === 'waiting_on_school') { r.stage = 'needs_screening'; r.next = 'Attachment received'; }
    this.event('Attachment added by the school: ' + (name || key), r.referred_by || 'school', id);
  },
  'referral.scheduleScreening'(s, { id, who = this.who(), when }) {
    const r = need(byId(s.referrals, id), 'Referral');
    const owner = byId(s.staff, who) ? who : this.who();
    r.screening = { who: owner, when }; r.stage = 'screening_booked';
    r.next = fmtDateTime(when, { dow: true }) + ' · ' + staffShort(s, owner);
    s.screenings.push({ referral: id, client: r.client, who: owner, when, status: 'booked' });
    s.reminders.push({ id: 'rem-' + Date.now(), for: owner, kind: 'screening_call', record: id, due: when, text: 'Screening call · ' + clientLabel(s, r.client) });
    this.event('Screening call booked for ' + fmtDateTime(when, { dow: true }), this.who(), id);
  },
  'referral.routeGrant'(s, { id, program = 'Grant-funded school program', why = '' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.stage = 'grant_program'; r.next = 'Routed ' + fmtDate(s.today) + ' · ' + program;
    this.event('Routed to ' + program + (why ? ' · ' + why : ''), this.who(), id);
  },
  'referral.stage'(s, { id, stage, next }) {
    const r = need(byId(s.referrals, id), 'Referral'); r.stage = stage; if (next) r.next = next;
    this.event('Referral moved to ' + String(stage).replace(/_/g, ' '), this.who(), id);
  },

  // ---------- family link (Flow D) ----------
  'familyLink.send'(s, { referral }) {
    const r = need(byId(s.referrals, referral), 'Referral');
    let fl = s.family_links.find(f => f.referral === referral);
    if (!fl) {
      fl = { referral, client: r.client, token: (r.client === 'TW' ? 'tw-' : 'fl-') + Math.random().toString(36).slice(2, 8), steps: {}, answers: {} };
      s.family_links.push(fl);
    }
    fl.sent_at = this.now();
    r.family_link = { ...(r.family_link || {}), sent: true };
    r.next = 'Family link sent · waiting for the guardian';
    let el = s.eligibility.find(e => e.referral === referral);
    if (!el) s.eligibility.push({ referral, client: r.client, status: 'waiting_link' });
    const c = byId(s.clients, r.client);
    const phone = c?.guardian?.phone || '(434) 555-0100';
    const msg = `Harvest Outreach Center: ${r.form?.counselor || 'Your school counselor'} referred ${c?.first_name || 'your child'} to us. A few details before we call you (about 5 minutes): `;
    this.event('Family link sent by text to ' + phone + ' (SMS stub · not sent)', this.who(), referral, { sms: { to: phone, text: msg, token: fl.token }, sim: true });
    return { token: fl.token, sms: { to: phone, text: msg } };
  },
  'familyLink.open'(s, { token }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    if (!fl.opened_at) { fl.opened_at = this.now(); const r = byId(s.referrals, fl.referral); if (r) { r.family_link.opened = true; r.next = 'Family link opened'; } this.event('Family link opened by the guardian', 'guardian', fl.referral, { actor_kind: 'portal' }); }
  },
  'familyLink.step'(s, { token, step, answers }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    if (fl.submitted_at) refuse('This family link was already submitted. Call Harvest to change an answer.', { record: fl.referral, code: 'write_once' });
    fl.steps[step] = true; Object.assign(fl.answers, answers || {});
  },
  'familyLink.submit'(s, { token }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    if (fl.submitted_at) refuse('This family link was already submitted.', { record: fl.referral, code: 'write_once' });
    fl.submitted_at = this.now();
    const r = byId(s.referrals, fl.referral);
    if (r) { r.family_link = { sent: true, opened: true, submitted: true }; r.next = 'Details received · run the eligibility check'; }
    const c = byId(s.clients, fl.client);
    if (c && fl.answers.guardian_name) c.guardian = { ...(c.guardian || {}), name: fl.answers.guardian_name, relationship: fl.answers.relationship || c.guardian?.relationship, phone: fl.answers.phone || c.guardian?.phone };
    let el = s.eligibility.find(e => e.referral === fl.referral);
    if (!el) { el = { referral: fl.referral, client: fl.client }; s.eligibility.push(el); }
    Object.assign(el, { status: 'details_received', details_at: this.now(), lookup: { medicaid_id: fl.answers.medicaid_id, dob: fl.answers.dob, plan_kind: fl.answers.plan_kind, name: c ? (c.first_name || '') + ' ' + (c.initials || '') : '' } });
    this.event('Family link submitted · insurance details received', fl.answers.guardian_name || 'guardian', fl.referral, { actor_kind: 'portal' });
  },

  // ---------- eligibility (a person runs the DMAS lookup) ----------
  'eligibility.record'(s, { referral, result, plan, effective, screenshot }) {
    const by = this.who();
    const el = need(s.eligibility.find(e => e.referral === referral), 'Eligibility');
    if (el.status === 'waiting_link') throw new Error('Eligibility is checked only after the guardian submits the family link');
    if (!['active', 'inactive'].includes(result)) refuse('Eligibility result must be active or inactive.', { status: 422, audit: false });
    if (result === 'active' && !byId(s.payers, plan)) refuse('Pick the plan DMAS shows (one of the six payers).', { status: 422, audit: false });
    const every = rule(s, 'eligibility.recheck_days');
    const next = every.enabled && every.value ? addDays(s.today, every.value) : null;
    Object.assign(el, { status: 'recorded', checked_at: this.now(), checked_by: by, result, plan, effective, screenshot: screenshot || `DMAS_${el.client}_${s.today}.png`, next_check: next, recheck_basis: next ? `${every.value} days · ${every.verification}` : null });
    const c = byId(s.clients, el.client);
    if (c) c.medicaid = { status: result, plan, effective, checked_on: el.checked_at, checked_by: by, next_check: next };
    const r = byId(s.referrals, referral);
    if (r) { r.eligibility = result === 'active' ? 'active · ' + (byId(s.payers, plan)?.name.split(' ')[0] || plan) : result; r.next = result === 'active' ? 'Schedule the screening call' : 'Not active · talk to the guardian or route to the grant program'; }
    if (next) s.reminders.push({ id: 'rem-' + Date.now(), for: by, kind: 'eligibility_recheck', record: referral, due: next, text: `Eligibility re-check (every ${every.value} days, ${every.verification.toLowerCase()}) · ${clientLabel(s, el.client)}` });
    this.event(`Eligibility recorded · ${result}${plan ? ' · ' + payerName(s, plan) : ''} (DMAS screenshot stored · simulated lookup)`, by, referral);
  },

  // ---------- consents & parent portal ----------
  // The signer is the guardian behind the session (family link); never a name typed by the caller.
  'consent.sign'(s, { client, form = 'Consent for services', signature, lang = 'en', summary }) {
    const c = byId(s.clients, client);
    const signer = this.actor?.name || 'Guardian';
    const dtype = docTypeOf(form);
    const mode = signatureMode(s, dtype);
    if (mode === 'in_person_required') refuse(`Harvest requires an in-person signature for this document (rule signature.mode.${dtype}). Please sign at the intake visit.`, { record: client, status: 422, code: 'in_person_required' });
    const blocks = [
      { text: 'Harvest Outreach Center', size: 16, bold: true },
      { text: form + ' · Therapeutic Day Treatment', size: 12, bold: true },
      { text: 'Child: ' + (c ? `${c.first_name || ''} (${c.initials})` : client) },
      { text: summary ? summary : form === 'Consent for services' ? 'You agree that Harvest can work with your child at school during the day. You can stop at any time. Harvest may record the first conversation to fill in paperwork, with your OK.' : 'Signed on the parent portal: ' + form + '. The full text of this form is on file with Harvest Outreach Center.', gap: 10 },
      { text: 'Signed on the parent portal by ' + signer + ' · ' + fmtDateTime(this.now(), { year: true }), gap: 14, bold: true },
      { text: mode === 'remote_allowed' ? 'Remote signature · Harvest policy on remote signatures is not validated.' : 'Signature mode: ' + mode, size: 9 }
    ];
    if (signature) {
      const buf = Buffer.from(signature.split(',')[1], 'base64'); const sz = jpegSize(buf);
      if (sz) blocks.push({ image: buf, w: sz.w, h: sz.h, width: 240 });
    }
    const prior = s.consents.filter(x => x.client === client && x.form === form);
    const file = this.writeFile(`consent_${client}_${s.today}${prior.length ? '_v' + (prior.length + 1) : ''}.pdf`, makePdf(blocks, { title: form }));
    s.files.push({ ...file, kind: 'consent', record: client, at: this.now() });
    // write-once: a second signature is a new VERSION row; the first record and its file stay
    s.consents.push({ client, form, signed_at: this.now(), signer, file: file.url, status: 'signed', lang, mode, version: prior.length + 1, supersedes: prior.length ? prior.at(-1).file : undefined });
    for (const t of s.portal_tasks.filter(t => t.client === client && t.form === form)) { t.status = 'signed'; t.signed_at = this.now(); }
    if (c && form === 'Consent for services') { c.timeline = c.timeline || {}; if (!c.timeline.consent_signed) c.timeline.consent_signed = s.today; }
    this.event(form + (prior.length ? ` signed again (version ${prior.length + 1}; the first signature is kept)` : ' signed on the parent portal'), 'guardian:' + client, client, { actor_kind: 'portal' });
    return { file };
  },
  'checkin.save'(s, { client, role = 'teacher', answers, week_of }) {
    const by = this.actor?.kind === 'guardian' ? 'guardian' : this.who().replace(/^school:/, '');
    const r = this.actor?.kind === 'guardian' ? 'guardian' : role;
    s.checkins.push({ client, by, role: r, answers, week_of: week_of || s.today, at: this.now() });
    this.event((r === 'guardian' ? 'Guardian' : 'Teacher') + ' check-in saved', by, client, { actor_kind: 'portal' });
  },
  'portalTask.create'(s, { client, form, why }) {
    s.portal_tasks.push({ id: 'pt-' + Date.now(), client, form, why, status: 'waiting', at: this.now() });
    this.event('Signing task sent to the parent portal: ' + form, this.who(), client);
  },

  // ---------- requests ----------
  'request.ensure'(s, { id, client, type = 'initial', payer, service = 'TDT school day · H2016', units = 150 }) {
    let r = id ? byId(s.requests, id) : s.requests.find(q => q.client === client && q.type === type && !['active', 'closed', 'denied'].includes(q.stage));
    if (r) return { id: r.id };
    const c = byId(s.clients, client);
    const p = payer || c?.medicaid?.plan || c?.authorization?.payer || 'humana';
    const channel = byId(s.payers, p)?.channel || 'fax';
    const nid = id || 'R-0' + (Math.max(...s.requests.map(q => +q.id.slice(2))) + 1);
    const start = addBusinessDays(s.today, 1);
    const lim = rule(s, 'initial_sra.send_within_days'); const cs = clockStart(s, c); const from = cs.date;
    r = { id: nid, client, payer: p, channel, service, service_line: 'tdt', type, units_requested: units, stage: 'draft_ready', drafted_at: this.now(), dates: `${start} to ${addDays(start, 88)}`,
      limit_30: type === 'initial' && from ? addDays(from, lim.value) : null, limit_30_basis: type === 'initial' ? { rule: 'initial_sra.send_within_days', days: lim.value, start_event: cs.event, wanted_event: ruleValue(s, 'initial_sra.start_event', 'intake_processed'), fallback: !!cs.fallback, start: from, verification: lim.verification } : null };
    s.requests.unshift(r);
    this.event(`${type === 'initial' ? 'Initial SRA' : 'Continued stay'} drafted from the record`, 'Psyflo', nid, { actor_kind: 'system' });
    return { id: nid };
  },
  // INTERNAL: Process Form was pressed in Lauris (observed). The request lands in "Pending clinical approval".
  'request.processed'(s, { id, session, consumer, lauris_user }) {
    const r = need(byId(s.requests, id), 'Request');
    if (!session || !consumer || !lauris_user) refuse('A processed state needs the Harvest #, the session id and the Lauris user from the open page.', { record: id, code: 'no_evidence' });
    if (r.processed_at && r.lauris_session === session) refuse(`Lauris session ${session} was already recorded as processed for ${id}. A second Process Form is an anomaly and was not applied.`, { record: id, code: 'write_once' });
    if (['signed', 'submitted', 'sending', 'portal_open', 'active'].includes(r.stage)) refuse(`${id} is already past Process Form (${r.stage}); a second processed event was not applied.`, { record: id, code: 'write_once' });
    if (r.stage === 'draft_ready') r.stage = 'needs_approval';
    r.processed_at = this.now(); r.lauris_session = session; r.lauris_consumer = Number(consumer); r.processed_by = this.actor?.id || null;
    this.event('Process Form pressed in Lauris · now Pending clinical approval', this.actor?.id || 'bridge', id, { actor_kind: 'bridge' });
  },
  // A clinical approver (cap approve.sra, designated) records the internal approval; separate people may approve and send.
  'request.approve'(s, { id, comment = '' }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage !== 'needs_approval') refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; approval is recorded only while it is Pending clinical approval (after Process Form).`, { record: id, code: 'bad_stage', status: 409 });
    r.approval = { by: this.who(), by_name: staffName(s, this.who()), at: this.now(), comment: String(comment || '').slice(0, 400) };
    r.approved_by = this.who(); r.approved_at = r.approval.at;
    r.stage = 'awaiting_signature';
    this.event('Approved internally · ready for Get Signature in Lauris', this.who(), id);
    // Get Signature was pressed in Lauris before this approval: Psyflo kept the observed signature on hold; apply it now
    if (r.signature_hold_event) {
      const hold = r.signature_hold_event; delete r.signature_hold_event;
      this.actions['request.signed'].call(this, s, { id, ...hold, late_approval: true });
    }
    return { id, stage: r.stage };
  },
  // INTERNAL: Get Signature observed in Lauris. The signer is read from the Lauris signature event; no default name.
  'request.signed'(s, { id, preview, signer, signer_credential, session, consumer, late_approval }) {
    const r = need(byId(s.requests, id), 'Request');
    const c = byId(s.clients, r.client);
    if (!signer) refuse('No signer was read from the Lauris signature event, so the request was not marked signed.', { record: id, code: 'no_signer' });
    if (!session || !consumer) refuse('A signature needs the session id and the Harvest # from the open page.', { record: id, code: 'no_evidence' });
    if (r.signed_at) refuse(`${id} already carries a signature (${r.signed_by}, ${fmtDateTime(r.signed_at, { year: true })}). A second signature was not applied.`, { record: id, code: 'write_once' });
    if (!isLmhpCredential(signer_credential)) {
      r.signature_flag = { signer, credential: signer_credential || '', at: this.now(), session };
      this.event(`Signature by a non-licensed user (${withCred(signer, signer_credential)}): hold · not marked signed, Send stays blocked`, this.actor?.id || 'bridge', id, { actor_kind: 'bridge' });
      return { hold: true };
    }
    if (r.stage === 'needs_approval' || r.stage === 'draft_ready') {
      // Lauris signed before Psyflo recorded the internal approval: keep the observed fact, do not advance
      r.signature_hold_event = { preview, signer, signer_credential, session, consumer };
      this.event(`Get Signature pressed in Lauris by ${signer} before the internal approval was recorded · on hold until an approver records it`, this.actor?.id || 'bridge', id, { actor_kind: 'bridge' });
      return { hold: true, reason: 'needs_approval' };
    }
    if (r.stage !== 'awaiting_signature') refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; a signature is accepted only while it awaits one.`, { record: id, code: 'bad_stage' });
    const lines = (preview || []).map(p => typeof p === 'string' ? { text: p } : p);
    const file = this.writeFile(`${r.id}_${c?.initials || r.client}_${r.type}_signed.pdf`, makePdf([
      { text: 'Lauris Online · Forms to Approve · signed preview', size: 9 },
      ...lines,
      { text: `Electronically signed in Lauris by ${withCred(signer, signer_credential)} · ${fmtDateTime(this.now(), { year: true })}`, bold: true, gap: 12 },
      { text: 'Generated by Psyflo from the Lauris preview; the signed form itself is in Lauris.', size: 9 }
    ], { title: r.id + ' signed' }));
    s.files.push({ ...file, kind: 'signed_pdf', record: id, at: this.now() });
    Object.assign(r, { stage: 'signed', signed_at: this.now(), signed_by: signer, signed_credential: signer_credential || '', signed_session: session, signed_pdf: file.url, signed_name: file.name, pages: Math.max(2, Math.ceil(lines.length / 40) + 1) });
    this.event(`Get Signature pressed in Lauris · signed by ${withCred(signer, signer_credential)} · signed PDF saved from the preview`, this.actor?.id || 'bridge', id, { actor_kind: 'bridge' });
    this.event('Packet assembled: signed SRA' + (r.payer === 'uhc' ? ', CNA, ISP' : '') + ' · ready for a person to send', 'Psyflo', id, { actor_kind: 'system' });
    return { file };
  },
  // A person presses Send. The request must be signed (observed) and approved; the actor is the session actor.
  'request.send'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request');
    const by = this.who();
    if (r.stage !== 'signed') refuse(`A request is sent only after it is approved and signed; ${id} is ${r.stage.replace(/_/g, ' ')}.`, { record: id, code: 'bad_stage' });
    if (!r.approval || !r.signed_at || !r.signed_by) refuse(`${id} cannot be sent: it needs a recorded approval and a signature read from Lauris.`, { record: id, code: 'no_approval' });
    r.sent_by = by; r.send_pressed_at = this.now();
    if (r.channel === 'fax') {
      r.stage = 'sending';
      this.event('Send pressed · faxing through Harvest\'s Sfax account (simulated)', by, id, { sim: true });
      const ref = faxRef(); const st = this;
      setTimeout(() => {
        const state = st.state; const q = byId(state.requests, id); if (!q || q.stage !== 'sending') return;
        const sentAt = st.now();
        const dd = deadline(state, 'decision.overdue_after_days', sentAt.slice(0, 10), { unit: 'days' });
        Object.assign(q, { stage: 'submitted', sent: sentAt, fax_ref: ref, decision_due: dd.date, decision_basis: { rule: 'decision.overdue_after_days', days: dd.rule.value, verification: dd.verification } });
        q.receipt_check = addDays(sentAt.slice(0, 10), ruleValue(state, 'submission.receipt_check_day', 10));
        st.event('Simulated Sfax accepted the fax · ref ' + ref, by, id, { sim: true, actor_kind: 'integration', via: 'Sfax (simulated)' });
        st.event('Simulated delivery receipt · ' + (q.pages || 11) + ' pages', by, id, { sim: true, actor_kind: 'integration', via: 'Sfax (simulated)' });
        const f = st.writeFile(`${id}_sent_fax_${ref}.pdf`, makePdf([{ text: 'Sfax delivery receipt (SIMULATED)', size: 14, bold: true }, { text: 'Reference ' + ref + ' · ' + fmtDateTime(sentAt, { year: true }) }, { text: 'To: ' + payerName(state, q.payer) + ' · utilization management fax (demo)' }, { text: 'Pages: ' + (q.pages || 11) }, { text: 'Sent by ' + staffName(state, by) }], { title: 'Sfax receipt ' + ref }));
        state.files.push({ ...f, kind: 'fax_receipt', record: id, at: sentAt });
        q.delivery_receipt = f.url;
        st.changed();
      }, 3000);
      return { channel: 'fax' };
    }
    // portal payers: the click opens the portal in the clinician's own login with the packet ready
    r.stage = 'portal_open';
    this.event(`Send pressed · ${r.channel === 'availity' ? 'Availity' : 'UHC portal'} opened in the clinician's own session with the packet ready`, by, id);
    return { channel: r.channel, open: `/${r.channel}/upload?request=${id}` };
  },
  // A distinct, reasoned action: a re-send never resets the decision clock or overwrites the first send.
  'request.resend'(s, { id, reason }) {
    const r = need(byId(s.requests, id), 'Request');
    const by = this.who();
    if (!['submitted', 'overdue', 'info_requested'].includes(r.stage)) refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; only a sent request can be re-sent.`, { record: id, code: 'bad_stage' });
    if (String(reason || '').trim().length < 4) refuse('Say why the packet is being sent again (for example: "payer says the fax did not arrive").', { record: id, status: 422, code: 'reason_required', audit: false });
    const ref = r.channel === 'fax' ? faxRef() : null;
    r.resends = (r.resends || []).concat([{ at: this.now(), by, reason: String(reason).trim(), ref, channel: r.channel }]);
    this.event(`Packet sent again (${String(reason).trim().slice(0, 80)})${ref ? ' · simulated Sfax ref ' + ref : ' · portal opened for the clinician'} · the decision clock keeps its first send date`, by, id, { sim: true });
    return { ref, channel: r.channel, open: r.channel === 'fax' ? undefined : `/${r.channel}/upload?request=${id}` };
  },
  // INTERNAL: the portal confirmation was read on the open portal page (portal.observed validated it)
  'request.portalConfirmed'(s, { id, ref, info_reply }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage !== 'portal_open') refuse(`${id} is not waiting for a portal confirmation (it is ${r.stage.replace(/_/g, ' ')}).`, { record: id, code: 'bad_stage' });
    const at = this.now(); const by = r.sent_by || 'bridge';
    if (r.info_reply_pending) {
      r.info_reply_pending = false;
      r.info_reply = { ...(r.info_reply || {}), sent_at: at, ref, via: 'portal' };
      r.stage = 'submitted';
      this.event('Reply uploaded in Availity · confirmation ' + ref + ' (read from the open portal page)', by, id, { actor_kind: 'bridge' });
      return;
    }
    const dd = deadline(s, 'decision.overdue_after_days', at.slice(0, 10), { unit: 'days' });
    Object.assign(r, { stage: 'submitted', sent: at, portal_ref: ref, decision_due: dd.date, decision_basis: { rule: 'decision.overdue_after_days', days: dd.rule.value, verification: dd.verification } });
    r.receipt_check = addDays(at.slice(0, 10), ruleValue(s, 'submission.receipt_check_day', 10));
    this.event('Upload confirmed in the portal · confirmation ' + ref + ' (read from the open portal page)', by, id, { actor_kind: 'bridge' });
  },
  // "Send the notice": runs the send stub and records its reference. One notice per request; a second needs request.resend.
  'request.overdueNotice'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request');
    const by = this.who();
    if (!['overdue', 'submitted'].includes(r.stage)) refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; an overdue notice applies to a sent request that has no decision.`, { record: id, code: 'bad_stage' });
    if (r.overdue_notice_sent) refuse(`An overdue notice was already sent for ${id} (${r.overdue_notice_ref}).`, { record: id, code: 'write_once' });
    const lim = rule(s, 'decision.overdue_after_days', r.payer);
    const ref = r.channel === 'fax' ? faxRef() : 'portal-message';
    r.overdue_notice_sent = this.now(); r.overdue_notice_ref = ref; r.overdue_notice_by = by;
    this.event(`Overdue notice sent ${r.channel === 'fax' ? 'through simulated Sfax · ref ' + ref : 'in the payer portal (simulated)'} · cites ${r.fax_ref ? 'fax ref ' + r.fax_ref : 'the portal confirmation'} and the ${lim.value}-day window (${lim.verification.toLowerCase()})`, by, id, { sim: true });
  },
  'request.receiptCheck'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request');
    const by = this.who();
    if (r.receipt_confirmed) refuse(`Receipt for ${id} was already confirmed on ${fmtDate(r.receipt_confirmed)} by ${staffName(s, r.receipt_by)}.`, { record: id, code: 'write_once' });
    r.receipt_confirmed = this.now(); r.receipt_by = by;
    this.event('Receipt confirmed by phone', by, id);
  },
  // Demo-only: payer replies cannot arrive during a demo. Presenter mode; recorded as simulated with a demo document reference.
  'request.demoReply'(s, { id, kind, units }) {
    const r = need(byId(s.requests, id), 'Request');
    const at = this.now(); const who = this.who();
    const dref = `DEMO-${id}-${(r.decision_log || []).length + 1}`;
    if (kind === 'approved') {
      const u = needUnits(units ?? r.units_requested, { max: r.units_requested, what: 'Units' });
      recordDecision(this, s, r, { kind: 'initial', outcome: 'approved', units: u, doc_ref: dref, simulated: true });
      r.stage = 'active'; r.units_awarded = u; this.event(`Demo: approved · ${u} units`, who, id, { demo: true, sim: true, actor_kind: 'demo' });
    } else if (kind === 'partial') {
      const u = needUnits(units ?? (Math.round(r.units_requested * 0.6 / 5) * 5 || 90), { min: 1, max: r.units_requested - 1, what: 'Offered units' });
      recordDecision(this, s, r, { kind: 'initial', outcome: 'partial', units: u, doc_ref: dref, simulated: true });
      r.stage = 'partial_decide'; r.units_offered = u; r.offer_call = s.today; r.reply_by = addBusinessDays(s.today, 1); this.event(`Demo: partial offer · ${u} of ${r.units_requested} units`, who, id, { demo: true, sim: true, actor_kind: 'demo' });
    } else if (kind === 'info') {
      const hrs = ruleValue(s, 'info_request.hours', 24);
      r.stage = 'info_requested'; r.info_requested_at = at; r.reply_due = addHours(at, hrs); r.info_items = r.info_items || ['Dates and outcome of prior outpatient services', 'School incident counts for the last 30 days', 'Current ISP goals with baselines'];
      this.event(`Demo: information request received · reply due ${fmtDateTime(r.reply_due, { dow: true })} (${hrs} h calendar; the payer's own message wins)`, who, id, { demo: true, sim: true, actor_kind: 'demo' });
    } else if (kind === 'denied') {
      recordDecision(this, s, r, { kind: 'initial', outcome: 'denied', units: 0, doc_ref: dref, simulated: true });
      const w = rule(s, 'appeal.window_days');
      r.stage = 'denied'; r.denied_on = s.today; r.notice_date = s.today; r.denial_reason = r.denial_reason || 'does not meet medical necessity criteria'; r.appeal_deadline = addDays(s.today, w.value);
      this.event(`Demo: denied · guardian-led appeal window opens (${w.value} days from the notice; ${w.verification.toLowerCase()})`, who, id, { demo: true, sim: true, actor_kind: 'demo' });
    } else throw new Error('Unknown demo reply: ' + kind);
  },
  'request.partialDecide'(s, { id, door, plan }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (r.stage !== 'partial_decide') refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; only an open partial award can be decided.`, { record: id, code: 'bad_stage' });
    r.decision = { door, at: this.now(), by, plan };
    if (door === 'accept') { r.stage = 'active'; r.units_awarded = r.units_offered; this.event(`Accepted ${r.units_offered} units`, by, id); }
    else if (door === 'info') { r.stage = 'info_requested'; r.info_requested_at = this.now(); r.reply_due = addHours(this.now(), ruleValue(s, 'info_request.hours', 24)); this.event('Chose to add information (the payer asked)', by, id); }
    else if (door === 'p2p') { r.stage = 'peer_to_peer_booked'; r.p2p_at = plan?.when || addDays(s.today, 14) + 'T14:00'; this.event('Peer-to-peer requested · call ' + fmtDateTime(r.p2p_at, { dow: true }), by, id); }
    else if (door === 'early_discharge') { r.stage = 'early_discharge'; r.units_awarded = r.units_offered; this.event(`Accepted ${r.units_offered} units with an early-discharge plan`, by, id); }
    else throw new Error('Unknown choice: ' + door);
  },
  // peer-to-peer outcome with its document reference (write-once; a correction needs a reason)
  'request.p2pOutcome'(s, { id, outcome, units, notes, doc_ref, reason }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (!['approved', 'partial', 'denied'].includes(outcome)) refuse('Outcome must be approved, partial or denied.', { status: 422, audit: false });
    const ref = needDocRef(doc_ref, 'the peer-to-peer outcome');
    const u = outcome === 'denied' ? 0 : needUnits(units ?? r.units_awarded ?? r.units_requested, { min: 1, max: r.units_requested, what: 'Units' });
    recordDecision(this, s, r, { kind: 'p2p', outcome, units: u, doc_ref: ref, notes, reason });
    r.p2p_outcome = { outcome, units: u, notes, doc_ref: ref, at: this.now(), by };
    if (outcome === 'approved') { r.stage = 'active'; r.units_awarded = u; }
    else if (outcome === 'partial') { r.stage = 'active'; r.units_awarded = u; }
    else { r.stage = 'denied'; r.denied_on = s.today; r.notice_date = r.notice_date || s.today; r.appeal_deadline = r.appeal_deadline || addDays(r.notice_date, ruleValue(s, 'appeal.window_days', 60)); }
    this.event('Peer-to-peer outcome logged · ' + outcome + (u ? ' · ' + u + ' units' : '') + ' · document ' + ref, by, id);
  },
  // information reply: the draft may be edited until it is sent; a sent reply is write-once
  'request.infoReply'(s, { id, text }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.info_reply?.sent_at) refuse(`The reply for ${id} was already sent (${fmtDateTime(r.info_reply.sent_at, { year: true })}); the sent text cannot be changed.`, { record: id, code: 'write_once' });
    r.info_reply = { text, drafted_at: r.info_reply?.drafted_at || this.now(), edited_at: this.now() };
    this.event('Reply edited', this.who(), id);
  },
  'request.infoSend'(s, { id, text, via }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (r.stage !== 'info_requested') refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; a reply is sent only to an open information request.`, { record: id, code: 'bad_stage' });
    if (r.info_reply?.sent_at) refuse(`The reply for ${id} was already sent.`, { record: id, code: 'write_once' });
    const body = text || r.info_reply?.text;
    if (!String(body || '').trim()) refuse('There is no reply text to send yet.', { status: 422, audit: false });
    if (r.channel === 'fax' || via === 'fax') {
      const ref = faxRef();
      r.info_reply = { ...(r.info_reply || {}), text: body, sent_at: this.now(), ref, via: 'fax', by };
      r.info_replies = (r.info_replies || []).concat([{ text: body, sent_at: r.info_reply.sent_at, ref, by }]);
      r.stage = 'submitted';
      if (ruleValue(s, 'decision.restart_on_info_reply', false)) { r.sent = this.now(); r.decision_due = deadline(s, 'decision.overdue_after_days', s.today, { unit: 'days' }).date; }
      this.event(`Reply sent through simulated Sfax · ref ${ref} · the decision clock keeps its first send date (restart not assumed)`, by, id, { sim: true });
      return { ref };
    }
    r.info_reply = { ...(r.info_reply || {}), text: body, by };
    r.info_reply_pending = true; r.stage = 'portal_open'; r.sent_by = by;
    this.event('"Open in Availity and send" pressed · reply ready to paste in the clinician\'s own session', by, id);
    return { open: `/${r.channel}/upload?request=${id}&kind=reply` };
  },
  // The guardian reviews and signs (their own session). Signing is not sending: staff press Send (request.appealSend).
  'request.appealSign'(s, { id, text, signature, lang = 'en' }) {
    const r = need(byId(s.requests, id), 'Request');
    const signer = this.actor?.name || 'Guardian';
    if (r.stage !== 'denied') refuse(`There is no denial on ${id} to appeal (it is ${r.stage.replace(/_/g, ' ')}).`, { record: id, code: 'bad_stage' });
    if (r.appeal?.signed_at) refuse(`The appeal letter for ${id} was already signed.`, { record: id, code: 'write_once' });
    const blocks = [{ text: 'Appeal of a denied authorization', size: 14, bold: true }, { text: 'To: ' + payerName(s, r.payer) + ' · Appeals' }, { text: text || '', gap: 10 }, { text: 'Signed by ' + signer + ' (guardian) · ' + fmtDateTime(this.now(), { year: true }), bold: true, gap: 12 }];
    if (signature) { const buf = Buffer.from(signature.split(',')[1], 'base64'); const sz = jpegSize(buf); if (sz) blocks.push({ image: buf, w: sz.w, h: sz.h, width: 220 }); }
    const file = this.writeFile(`${id}_appeal_signed.pdf`, makePdf(blocks, { title: 'Appeal ' + id }));
    s.files.push({ ...file, kind: 'appeal', record: id, at: this.now() });
    r.appeal = { text, signer, lang, signed_at: this.now(), file: file.url, status: 'signed' };
    this.event('Guardian signed the appeal letter on the parent portal · ready for a person at Harvest to review and send', 'guardian:' + r.client, id, { actor_kind: 'portal' });
    return { file };
  },
  // A person at Harvest presses Send on the signed appeal letter (the send stub records its reference).
  'request.appealSend'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (r.stage !== 'denied' || !r.appeal?.signed_at) refuse(`${id} has no signed appeal letter ready to send.`, { record: id, code: 'bad_stage' });
    if (r.appeal.sent_at) refuse(`The appeal for ${id} was already sent.`, { record: id, code: 'write_once' });
    const ref = r.channel === 'fax' ? faxRef() : 'portal-upload';
    r.appeal = { ...r.appeal, sent_at: this.now(), sent_by: by, ref, status: 'sent' };
    r.stage = 'appeal_sent';
    this.event(r.channel === 'fax' ? `Appeal letter sent through simulated Sfax · ref ${ref}` : `Appeal letter ready for the clinician to upload in ${r.channel === 'availity' ? 'Availity' : 'the UHC portal'} (simulated)`, by, id, { sim: true });
    return { ref };
  },
  'request.close'(s, { id, why }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage === 'closed') refuse(`${id} is already closed.`, { record: id, code: 'write_once' });
    r.stage = 'closed'; r.closed_by = this.who(); r.closed_at = this.now(); this.event('Closed' + (why ? ' · ' + why : ''), this.who(), id);
  },

  // ---------- early discharge plan ----------
  'plan.set'(s, { request, client, discharge, intake, new_initial, reminders = [] }) {
    const by = this.who();
    const ok = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
    if (!ok(discharge) || !ok(intake) || !ok(new_initial)) refuse('Enter the discharge, intake and new-initial dates.', { status: 422, audit: false });
    if (discharge < s.today) refuse('The discharge date cannot be in the past.', { status: 422, audit: false });
    if (intake < discharge) refuse('The new intake cannot be before the discharge.', { status: 422, audit: false });
    if (new_initial < discharge) refuse('The new initial cannot start before the discharge.', { status: 422, audit: false });
    s.plans = s.plans.filter(p => p.request !== request);
    s.plans.push({ request, client, discharge, intake, new_initial, at: this.now(), by });
    const r = byId(s.requests, request);
    if (r) { r.stage = r.stage === 'partial_decide' ? 'early_discharge' : r.stage; r.early_discharge = { discharge, intake, new_initial }; if (!r.units_awarded && r.units_offered) r.units_awarded = r.units_offered; }
    for (const rm of reminders) s.reminders.push({ id: 'rem-' + Math.random().toString(36).slice(2, 7), record: request, ...rm });
    this.event(`Early-discharge plan set · discharge ${fmtDate(discharge)} · new intake ${fmtDate(intake)} · new initial earliest ${fmtDate(new_initial)}`, by, request);
  },

  // ---------- notes, dictation, timer, assessments (Flow B) ----------
  // staff = the session actor (authz checks the student is on the caseload)
  'timer.start'(s, { client }) {
    const staff = this.who();
    s.timers[staff] = { client, started: this.now(), blocks: s.timers[staff]?.blocks || [] };
    this.event('Timer started with ' + clientLabel(s, client), staff, client);
  },
  'timer.stop'(s) {
    const staff = this.who();
    const t = s.timers[staff]; if (!t || !t.started) return;
    t.blocks = (t.blocks || []).concat([[t.started.slice(11, 16), this.now().slice(11, 16), t.client]]);
    t.started = null;
    this.event('Timer stopped', staff, t.client);
  },
  'dictation.save'(s, { client, spoken, rewritten, chips, checks, ...rest }) {
    const staff = this.who();
    const { staff: _s, by: _b, ...clean } = rest;
    const id = 'dict-' + Date.now();
    s.dictations.push({ ...clean, id, client, staff, at: this.now(), spoken, rewritten, chips, checks, status: 'waiting' });
    this.event('Dictation saved · waits until ' + clientLabel(s, client) + ' is open in Lauris', staff, client);
    return { id };
  },
  'dictation.used'(s, { id }) { const d = byId(s.dictations, id); if (d) { d.status = 'used'; d.used_at = this.now(); } },
  'dictation.discard'(s, { id }) {
    const d = byId(s.dictations, id);
    if (d && d.status === 'used') refuse('A dictation that was used in a note cannot be discarded.', { record: d.client, code: 'write_once' });
    s.dictations = s.dictations.filter(x => x.id !== id);
  },
  'assessment.save'(s, { client, instrument, answers, score }) {
    const by = this.who();
    s.assessments.push({ id: 'as-' + Date.now(), client, instrument, answers, score, date: s.today, by, status: 'waiting' });
    this.event(instrument + ' answers saved · wait until the student is open in Lauris', by, client);
  },
  'assessment.used'(s, { id }) { const a = byId(s.assessments, id); if (a) a.status = 'used'; },
  // INTERNAL: reported after Process Form on a note in Lauris (observed). One note per Lauris session; processed notes are write-once.
  'note.processed'(s, { client, staff, type, fields, session, consumer, enhanced, dictation, units }) {
    if (!session || !consumer) refuse('A processed note needs the session id and the Harvest # from the open page.', { code: 'no_evidence' });
    const dup = s.notes.find(n => n.session === session && n.client === client);
    if (dup) refuse(`Lauris session ${session} is already recorded as a processed ${type} note (${dup.id}). A second processed event is an anomaly: it was not applied and the note is unchanged.`, { record: client, code: 'write_once' });
    const note = { id: 'note-' + Date.now(), client, staff, type, date: s.today, fields, session, consumer: Number(consumer), enhanced, dictation, units, processed_at: this.now(), flags: [] };
    const st = byId(s.staff, staff);
    note.review = st?.review_mode === 'every_note' ? 'pending' : 'approved';
    // units must follow the recorded direct time (rules table); a mismatch is flagged for the reviewer, never silently kept
    if (type === 'daily' && units != null) {
      const direct = parseMinutes(fields && fields['Direct time']);
      const maxU = ruleValue(s, 'units.tdt.max_per_day', 3);
      if (!Number.isInteger(units) || units < 0 || units > maxU) note.flags.push(`Units ${units} is outside 0-${maxU}`);
      else if (direct != null && units > unitsFor(s, 'tdt', direct)) note.flags.push(`Units ${units} exceed what ${direct} direct minutes support (${unitsFor(s, 'tdt', direct)}) under the unit bands (${rule(s, 'units.tdt.day_tiers').verification.toLowerCase()})`);
      if (note.flags.length) note.review = 'pending';
    }
    s.notes.push(note);
    this.event(`${typeLabel(type)} processed in Lauris${note.flags.length ? ' · flagged: ' + note.flags[0] : ''}`, staff || 'bridge', client, { actor_kind: 'bridge' });
    return { id: note.id };
  },
  // review: the reviewer is never the author; a trainee's reviewer or a supervisor decides; a decision is write-once (a change needs a reason and appends history)
  'note.review'(s, { id, decision, comment, reason }) {
    const n = need(byId(s.notes, id), 'Note'); const by = this.who(); const me = this.actor;
    if (!['approved', 'returned', 'flagged'].includes(decision)) refuse('Decision must be approved, returned or flagged.', { status: 422, audit: false });
    if (n.staff === by) refuse('You cannot review your own note.', { record: n.client, status: 403, code: 'own_note' });
    const author = byId(s.staff, n.staff);
    if (!(me && (me.role === 'supervisor' || me.role === 'clinician' || author?.reviewer === by))) refuse('Only the assigned reviewer or a supervisor can review this note.', { record: n.client, status: 403 });
    if (n.reviewed_at && n.review !== 'pending') {
      if (String(reason || '').trim().length < 4) refuse(`This note was already reviewed (${n.review}). A change needs a reason and is kept as history.`, { record: n.client, code: 'write_once' });
      n.review_history = (n.review_history || []).concat([{ review: n.review, comment: n.review_comment, by: n.reviewed_by, at: n.reviewed_at, changed_reason: String(reason).trim() }]);
    }
    n.review = decision; n.review_comment = comment; n.reviewed_by = by; n.reviewed_at = this.now();
    this.event(`Note ${decision === 'approved' ? 'approved' : decision === 'returned' ? 'returned with a note' : 'flagged: "That didn\'t happen"'}`, by, n.client);
  },

  // ---------- screening & drafts (Flow A) ----------
  'screening.done'(s, { client, referral, boxes, transcript, session }) {
    const sc = s.screenings.find(x => (x.referral === referral) || (x.client === client)) || (s.screenings.push({ referral, client }), s.screenings[s.screenings.length - 1]);
    if (sc.status === 'done' && sc.processed_at) refuse('This screening was already processed in Lauris; the processed record is not changed.', { record: referral || client, code: 'write_once' });
    Object.assign(sc, { status: 'done', when: this.now(), boxes, transcript, session });
    const r = byId(s.referrals, referral); if (r) { r.stage = 'in_intake'; r.next = 'Intake / CNA next'; }
    const c = byId(s.clients, client); if (c) { c.stage = 'intake'; c.timeline = { ...(c.timeline || {}), screening: this.now() }; }
    this.event('Screening processed in Lauris · intake next', this.who(), referral || client);
  },
  'draft.save'(s, { key, data }) {
    s.drafts = s.drafts.filter(d => d.key !== key);
    s.drafts.push({ key, data, at: this.now(), by: this.who() });
  },
  // only non-clinical record fields; diagnosis, Medicaid status and goals come from observed Lauris events, never a patch
  'client.update'(s, { id, patch = {}, what }) {
    const c = need(byId(s.clients, id), 'Client');
    const ALLOWED = ['grade', 'language', 'iep', 'guardian'];
    const bad = Object.keys(patch).filter(k => !ALLOWED.includes(k));
    if (bad.length) refuse(`These fields cannot be changed here: ${bad.join(', ')}. Diagnosis, Medicaid status and goals come from the processed Lauris forms.`, { record: id, status: 422 });
    Object.assign(c, patch);
    this.event(what || `Record updated: ${Object.keys(patch).join(', ')}`, this.who(), id);
  },
  'lauris.event'(s, { what, record }) { this.event(what, this.actor?.id || 'bridge', record, { actor_kind: 'bridge' }); },

  // ---------- incidents & compliance ----------
  'incident.filePortal'(s, { index, ref }) {
    const i = s.incidents[index]; if (!i) throw new Error('Incident not found');
    if (i.state_portal_filed) refuse(`This incident was already filed on the state portal (${fmtDateTime(i.state_portal_filed, { year: true })}).`, { record: i.client, code: 'write_once' });
    const by = this.who();
    i.state_portal_filed = this.now(); i.status = 'complete'; i.filed_by = by; i.portal_ref = ref ? String(ref).trim() : null;
    this.event('Level ' + i.level + ' incident ' + (i.portal_ref ? `filed on the state portal · ref ${i.portal_ref}` : 'state portal opened by a person (time logged; no confirmation reference recorded yet)'), by, i.client, { sim: true });
  },
  'incident.save'(s, { incident = {} }) { const by = this.who(); s.incidents.unshift({ ...incident, by, saved_at: this.now() }); this.event('Incident report processed in Lauris', by, incident.client); },

  // ---------- users & settings ----------
  'user.add'(s, { name, credential = '', role = 'direct_support', sites = ['CC-ES1'], review_mode = 'every_note', reviewer = 'cdiaz' }) {
    if (!['direct_support', 'supervisor', 'clinician', 'admin'].includes(role)) refuse('Unknown role.', { status: 422, audit: false });
    let id = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) || 'user'; const base = id; let k = 2; while (s.staff.some(x => x.id === id)) id = base + k++;
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    s.staff.push({ id, name, initials, credential, title: roleTitle(role), role, sites, review_mode, reviewer, designations: [] });
    this.event('User added: ' + name + ' (' + roleTitle(role) + ')', this.who(), id);
    return { id };
  },
  'user.update'(s, { id, patch = {} }) {
    const u = need(byId(s.staff, id), 'User'); const roleTitles = ['Direct support', 'Site supervisor', 'Clinician', 'Admin'];
    const { id: _i, designations: _d, ...clean } = patch;
    if ('role' in clean && !['direct_support', 'supervisor', 'clinician', 'admin'].includes(clean.role)) refuse('Unknown role.', { status: 422, audit: false });
    Object.assign(u, clean); if (clean.role && !clean.title && (!u.title || roleTitles.some(t => u.title.startsWith(t)))) u.title = roleTitle(clean.role);
    this.event('User updated: ' + u.name + (clean.role ? ' → ' + roleTitle(clean.role) : ''), this.who(), id);
  },
  'settings.set'(s, { key, value }) { s.settings[key] = value; this.event('Settings saved: ' + String(key).replace(/_/g, ' '), this.who(), 'settings'); },
  'library.add'(s, { name, kind = 'Knowledge', note = '' }) { s.library.push({ name, kind, note, added: s.today, by: this.who() }); this.event('Library document added: ' + name, this.who(), 'library'); },
  'migration.rerun'(s) { s.migration = { ...s.migration, last_export: s.today, rerun_at: this.now() }; s.exports.push({ run_at: this.now(), run_by: this.who() }); this.event('Lauris export re-read (Harvest admin exports by hand)', this.who(), 'migration'); },
  'reminder.done'(s, { id }) { const r = byId(s.reminders, id); if (r) { r.done = this.now(); r.done_by = this.who(); } },
  'file.pdf'(s, { name, blocks, title, kind = 'document', record }) {
    const file = this.writeFile(name, makePdf(blocks, { title: title || name }));
    s.files.push({ ...file, kind, record, at: this.now() });
    if (record) this.event(`${title || name} saved as PDF`, this.who(), record);
    return { file };
  }
};

// advance hook: a sent request whose decision window has passed becomes Overdue (the window is the configured rule, not a constant)
export const hooks = {
  advance({ state }) {
    const lim = ruleValue(state, 'decision.overdue_after_days', 14);
    for (const r of state.requests) {
      const limit = r.sent ? addDays(r.sent.slice(0, 10), ruleValue(state, 'decision.overdue_after_days', lim, r.payer)) : r.decision_due;
      if (r.stage === 'submitted' && limit && limit < state.today) {
        r.stage = 'overdue'; r.decision_due = limit;
        state.events.push({ at: nowStamp(state), what: `No decision by day ${lim} · overdue notice drafted for a person to send`, who: 'Psyflo', record: r.id, actor_kind: 'system', sim: false });
      }
    }
  }
};
function nowStamp(state) { return `${state.today}T${state.clock?.fixed || '09:00'}:00`; }

function staffShort(s, id) { const p = byId(s.staff, id); return p ? p.name.replace(/^(\w)\w+ /, '$1. ') : id; }
function clientLabel(s, id) { const c = byId(s.clients, id); return c ? c.initials : id; }
function roleTitle(r) { return { direct_support: 'Direct support', supervisor: 'Site supervisor', clinician: 'Clinician', admin: 'Admin' }[r] || r; }
function typeLabel(t) { return { daily: 'Daily progress note', weekly_guardian: 'Weekly guardian call', monthly_collateral: 'Monthly collateral', quarterly: 'Quarterly report', incident: 'Incident report', discharge: 'Discharge summary' }[t] || t; }
// "5 h 10 min", "310 min", "2:30", "310" -> minutes (null when it cannot be read)
export function parseMinutes(v) {
  const t = String(v ?? '').toLowerCase().trim(); if (!t) return null;
  let m = t.match(/(\d+)\s*h(?:ours?|r)?\s*(?:(\d+)\s*m)?/); if (m) return +m[1] * 60 + (+m[2] || 0);
  m = t.match(/^(\d+):(\d{2})$/); if (m) return +m[1] * 60 + +m[2];
  m = t.match(/(\d+)\s*(?:m|min)/); if (m) return +m[1];
  m = t.match(/^\d+$/); return m ? +t : null;
}
