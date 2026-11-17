// Core Psyflo actions. Each action is (state, args, ctx) => result; `this` is the store
// (this.now(), this.event(), this.writeFile()). The store saves and broadcasts after each action.
import { addDays, addHours, addBusinessDays, fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf, jpegSize } from '../../pdf.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
export const payerName = (s, id) => (byId(s.payers, id) || {}).name || id;
// plan decision timeframe in days (per contract · confirm); used for every decision clock
export const decideDays = (s, id) => (byId(s.payers, id) || {}).decides_in_days || 7;
export const portalName = (s, r) => r.channel === 'availity' ? 'Availity' : r.payer === 'uhc' ? 'the HPN provider portal' : r.payer === 'ffs' ? 'the Nevada Medicaid provider portal' : 'the plan portal';
const orgName = s => s.org?.name || 'Community Counseling Center of Southern Nevada';

export default {
  // ---------- demo controls ----------
  'demo.reset'(s, { preset }) { this.reset(preset); return { ok: true }; },
  'demo.advanceDay'(s) {
    s.today = addDays(s.today, 1);
    this.event('Demo: clock advanced to ' + fmtDate(s.today, { dow: true }), 'demo', 'clock', { demo: true });
    for (const r of s.requests) {
      if (r.stage === 'submitted' && r.decision_due && r.decision_due < s.today) { r.stage = 'overdue'; this.event('No reply by the due date · overdue notice drafted for a clinician to send', 'Psyflo', r.id); }
    }
  },

  // ---------- referrals (drug court, P&P, ED, HIV clinic, self → Psyflo) ----------
  'referral.create'(s, { form, by = 'rbell', draft = false }) {
    const nums = s.referrals.map(r => +r.id.split('-')[1]);
    const id = 'REF-' + (Math.max(...nums) + 1);
    const ref = { id, client: form.client || 'New client', school: form.school || 'LC-MS2', received: this.now(), referred_by: by,
      stage: draft ? 'draft' : 'needs_screening', next: draft ? 'Draft · not sent yet' : 'Run the Nevada Medicaid (EVS) eligibility check', form,
      family_link: { sent: false, opened: false, submitted: false } };
    s.referrals.unshift(ref);
    this.event(draft ? 'Referral saved as a draft by the referral partner' : 'Referral received from the referral partner', by, id);
    return { id };
  },
  'referral.update'(s, { id, form, submit }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.form = { ...r.form, ...form };
    if (form.client) r.client = form.client;
    if (submit && r.stage === 'draft') { r.stage = 'needs_screening'; r.next = 'Run the Nevada Medicaid (EVS) eligibility check'; r.received = this.now(); this.event('Referral sent by the referral partner', r.referred_by, id); }
    return { id };
  },
  'referral.attach'(s, { id, key, name }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.form = r.form || {}; r.form.attachments = r.form.attachments || {};
    r.form.attachments[key] = name || true;
    if (r.stage === 'waiting_on_school') { r.stage = 'needs_screening'; r.next = 'Attachment received'; }
    this.event('Attachment added by the referral partner: ' + (name || key), r.referred_by || 'referral partner', id);
  },
  'referral.scheduleScreening'(s, { id, who = 'jperez', when }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.screening = { who, when }; r.stage = 'screening_booked';
    r.next = fmtDateTime(when, { dow: true }) + ' · ' + staffShort(s, who);
    s.screenings.push({ referral: id, client: r.client, who, when, status: 'booked' });
    s.reminders.push({ id: 'rem-' + Date.now(), for: who, kind: 'screening_call', record: id, due: when, text: 'Screening call · ' + clientLabel(s, r.client) });
    this.event('Screening call booked for ' + fmtDateTime(when, { dow: true }), who, id);
  },
  'referral.routeGrant'(s, { id, program = 'Ryan White / SAPTA grant program (no PA)', why = '' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.stage = 'grant_program'; r.next = 'Routed ' + fmtDate(s.today) + ' · ' + program;
    this.event('Routed to ' + program + (why ? ' · ' + why : ''), 'jperez', id);
  },
  'referral.stage'(s, { id, stage, next }) {
    const r = need(byId(s.referrals, id), 'Referral'); r.stage = stage; if (next) r.next = next;
    this.event('Referral moved to ' + stage.replace(/_/g, ' '), 'jperez', id);
  },

  // ---------- intake link (hidden in the Nevada build: adults are called directly; kept for older flows) ----------
  'familyLink.send'(s, { referral, by = 'jperez' }) {
    const r = need(byId(s.referrals, referral), 'Referral');
    let fl = s.family_links.find(f => f.referral === referral);
    if (!fl) {
      fl = { referral, client: r.client, token: (r.client === 'TW' ? 'tw-' : 'fl-') + Math.random().toString(36).slice(2, 8), steps: {}, answers: {} };
      s.family_links.push(fl);
    }
    fl.sent_at = this.now();
    r.family_link = { ...(r.family_link || {}), sent: true };
    r.next = 'Intake link sent · waiting for the client';
    let el = s.eligibility.find(e => e.referral === referral);
    if (!el) s.eligibility.push({ referral, client: r.client, status: 'waiting_link' });
    const c = byId(s.clients, r.client);
    const phone = c?.phone || '702-555-0100';
    const msg = `${orgName(s)}: ${r.form?.case_manager || r.source_label || 'Your referral source'} referred you to us. A few details before we call you (about 5 minutes): `;
    this.event('Intake link sent by text to ' + phone + ' (SMS stub)', by, referral, { sms: { to: phone, text: msg, token: fl.token } });
    return { token: fl.token, sms: { to: phone, text: msg } };
  },
  'familyLink.open'(s, { token }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    if (!fl.opened_at) { fl.opened_at = this.now(); const r = byId(s.referrals, fl.referral); if (r) { r.family_link.opened = true; r.next = 'Intake link opened'; } this.event('Intake link opened by the client', 'client', fl.referral); }
  },
  'familyLink.step'(s, { token, step, answers }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    fl.steps[step] = true; Object.assign(fl.answers, answers || {});
  },
  'familyLink.submit'(s, { token }) {
    const fl = need(s.family_links.find(f => f.token === token), 'Family link');
    fl.submitted_at = this.now();
    const r = byId(s.referrals, fl.referral);
    if (r) { r.family_link = { sent: true, opened: true, submitted: true }; r.next = 'Details received · run the eligibility check'; }
    const c = byId(s.clients, fl.client);
    if (c && fl.answers.phone) c.phone = fl.answers.phone;
    let el = s.eligibility.find(e => e.referral === fl.referral);
    if (!el) { el = { referral: fl.referral, client: fl.client }; s.eligibility.push(el); }
    Object.assign(el, { status: 'details_received', details_at: this.now(), lookup: { medicaid_id: fl.answers.medicaid_id, dob: fl.answers.dob, plan_kind: fl.answers.plan_kind, name: c ? (c.first_name || '') + ' ' + (c.initials || '') : '' } });
    this.event('Intake link submitted · insurance details received', 'client', fl.referral);
  },

  // ---------- eligibility (a person runs the Nevada Medicaid EVS lookup) ----------
  'eligibility.record'(s, { referral, result, plan, effective, by = 'jperez', screenshot }) {
    const el = need(s.eligibility.find(e => e.referral === referral), 'Eligibility');
    Object.assign(el, { status: 'recorded', checked_at: this.now(), checked_by: by, result, plan, effective, screenshot: screenshot || `EVS_${el.client}_${s.today}.png`, next_check: addDays(s.today, 7) });
    const c = byId(s.clients, el.client);
    if (c) c.medicaid = { status: result, plan, effective, checked_on: el.checked_at, checked_by: by, next_check: el.next_check };
    const r = byId(s.referrals, referral);
    if (r) { r.eligibility = result === 'active' ? 'active · ' + (byId(s.payers, plan)?.short || byId(s.payers, plan)?.name.split(' ')[0] || plan) : result; r.next = result === 'active' ? 'Schedule the intake screening call' : 'Not active · talk to the client or route to the grant program (Ryan White / SAPTA)'; }
    s.reminders.push({ id: 'rem-' + Date.now(), for: by, kind: 'eligibility_recheck', record: referral, due: el.next_check, text: 'Weekly eligibility re-check · ' + clientLabel(s, el.client) });
    this.event(`Eligibility recorded · ${result}${plan ? ' · ' + payerName(s, plan) : ''} (Nevada Medicaid EVS screenshot stored)`, by, referral);
  },

  // ---------- consents & signing tasks ----------
  'consent.sign'(s, { client, form = 'Consent for treatment', signer, signature, lang = 'en', summary }) {
    const c = byId(s.clients, client);
    const blocks = [
      { text: orgName(s), size: 16, bold: true },
      { text: form + ' · substance use treatment (ASAM)', size: 12, bold: true },
      { text: 'Client: ' + (c ? `${c.first_name || ''} (${c.initials})` : client) },
      { text: summary ? summary : /consent for (treatment|services)/i.test(form) ? `You agree to receive substance use treatment at ${orgName(s)}. You can stop at any time. Your records are protected by 42 CFR Part 2 and are shared only with your written consent. ${orgName(s)} may record the first conversation to fill in paperwork, with your OK.` : 'Signed electronically: ' + form + '. The full text of this form is on file with ' + orgName(s) + '.', gap: 10 },
      { text: 'Signed electronically by ' + signer + ' · ' + fmtDateTime(this.now(), { year: true }), gap: 14, bold: true }
    ];
    if (signature) {
      const buf = Buffer.from(signature.split(',')[1], 'base64'); const sz = jpegSize(buf);
      if (sz) blocks.push({ image: buf, w: sz.w, h: sz.h, width: 240 });
    }
    const file = this.writeFile(`consent_${client}_${s.today}.pdf`, makePdf(blocks, { title: form }));
    s.files.push({ ...file, kind: 'consent', record: client, at: this.now() });
    const existing = s.consents.find(x => x.client === client && x.form === form);
    const rec = { client, form, signed_at: this.now(), signer, file: file.url, status: 'signed', lang };
    if (existing) Object.assign(existing, rec); else s.consents.push(rec);
    for (const t of s.portal_tasks.filter(t => t.client === client && t.form === form)) { t.status = 'signed'; t.signed_at = this.now(); }
    this.event(form + ' signed electronically', signer, client);
    return { file };
  },
  'checkin.save'(s, { client, by, role = 'referral_partner', answers, week_of }) {
    s.checkins.push({ client, by, role, answers, week_of: week_of || s.today, at: this.now() });
    this.event((role === 'client' ? 'Client' : 'Referral partner') + ' check-in saved', by, client);
  },
  'portalTask.create'(s, { client, form, why }) {
    s.portal_tasks.push({ id: 'pt-' + Date.now(), client, form, why, status: 'waiting', at: this.now() });
    this.event('Signing task sent to the client: ' + form, 'dowens', client);
  },

  // ---------- requests ----------
  'request.ensure'(s, { id, client, type = 'initial', payer, service, units }) {
    let r = id ? byId(s.requests, id) : s.requests.find(q => q.client === client && q.type === type && !['active', 'closed', 'denied'].includes(q.stage));
    if (r) return { id: r.id };
    const c = byId(s.clients, client);
    const p = payer || c?.medicaid?.plan || c?.authorization?.payer || 'humana';
    const channel = byId(s.payers, p)?.channel || 'fax';
    const nid = id || 'R-0' + (Math.max(...s.requests.map(q => +q.id.slice(2))) + 1);
    // Level 1 for a step-down's new initial or a Level 1 client; otherwise Level 2.1 IOP (H0015, 9 units a week × 8 weeks)
    const lvl1 = type === 'early_discharge_new_initial' || c?.level === '1';
    service = service || (lvl1 ? 'Level 1 outpatient · H0004/H0005' : 'Level 2.1 IOP · H0015');
    units = units || (lvl1 ? 48 : type === 'initial' ? 72 : 36);
    const start = addBusinessDays(s.today, 1);
    r = { id: nid, client, payer: p, channel, service, level: lvl1 ? '1' : '2.1', type, units_requested: units, stage: 'draft_ready', drafted_at: this.now(), dates: `${start} to ${addDays(start, lvl1 ? 83 : 55)}` };
    s.requests.unshift(r);
    this.event(`${type === 'initial' ? 'Initial prior authorization' : type === 'early_discharge_new_initial' ? 'Step-down · new Level 1 initial' : 'Continued stay'} drafted from the record`, 'Psyflo', nid);
    return { id: nid };
  },
  // reported by the extension panel when it sees Process Form complete on the open Client Record form
  'request.processed'(s, { id, session }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage === 'draft_ready') r.stage = 'awaiting_signature';
    r.processed_at = this.now(); r.lauris_session = session;
    this.event('Process Form pressed in Client Record · now in Forms to Approve', 'jperez', id);
  },
  'request.signed'(s, { id, preview, signer = 'Jordan Perez, LCADC' }) {
    const r = need(byId(s.requests, id), 'Request');
    const c = byId(s.clients, r.client);
    const lines = (preview || []).map(p => typeof p === 'string' ? { text: p } : p);
    const file = this.writeFile(`${r.id}_${c?.initials || r.client}_${r.type}_signed.pdf`, makePdf([
      { text: 'Client Record · Forms to Approve · signed preview', size: 9 },
      ...lines,
      { text: 'Electronically signed in Client Record by ' + signer + ' · ' + fmtDateTime(this.now(), { year: true }), bold: true, gap: 12 }
    ], { title: r.id + ' signed' }));
    s.files.push({ ...file, kind: 'signed_pdf', record: id, at: this.now() });
    Object.assign(r, { stage: 'signed', signed_at: this.now(), signed_pdf: file.url, signed_name: file.name, pages: Math.max(2, Math.ceil(lines.length / 40) + 1) });
    this.event('Get Signature pressed in Client Record · signed PDF saved from the preview', 'jperez', id);
    this.event('Packet assembled: signed prior authorization request' + ({ humana: ', ASAM summary, treatment plan, assessment-day UDS', aetna: " on CareSource's own form, ASAM ratings on page 1", uhc: ' · text ready to paste into the HPN portal boxes' }[r.payer] || ', ASAM summary, treatment plan') + ' · ready to send', 'Psyflo', id);
    return { file };
  },
  'request.send'(s, { id, by = 'jperez' }) {
    const r = need(byId(s.requests, id), 'Request');
    if (!['signed', 'info_requested', 'overdue', 'submitted'].includes(r.stage) && !r.resend) throw new Error('A request is sent only after it is signed');
    if (r.channel === 'fax') {
      r.stage = 'sending'; r.send_pressed_at = this.now();
      this.event('Send pressed · faxing through ' + orgName(s) + '\'s Sfax account', by, id);
      const ref = 'F-' + (2300 + Math.floor(Math.random() * 90));
      setTimeout(() => {
        const st = this.state; const q = byId(st.requests, id); if (!q) return;
        const sentAt = this.now();
        Object.assign(q, { stage: 'submitted', sent: sentAt, fax_ref: ref, decision_due: addDays(sentAt, decideDays(st, q.payer)) });
        if (q.payer === 'humana') q.receipt_check = addDays(sentAt, 2);
        this.event('Sfax accepted the fax · ref ' + ref, 'Sfax', id);
        this.event('Delivery receipt · ' + (q.pages || 11) + ' pages delivered', 'Sfax', id);
        const f = this.writeFile(`${id}_sent_fax_${ref}.pdf`, makePdf([{ text: 'Sfax delivery receipt', size: 14, bold: true }, { text: 'Reference ' + ref + ' · ' + fmtDateTime(sentAt, { year: true }) }, { text: 'To: ' + payerName(st, q.payer) + ' · utilization management fax (demo)' }, { text: 'Pages: ' + (q.pages || 11) }], { title: 'Sfax receipt ' + ref }));
        st.files.push({ ...f, kind: 'fax_receipt', record: id, at: sentAt });
        q.delivery_receipt = f.url;
        this.changed();
      }, 3000);
      return { channel: 'fax' };
    }
    // portal payers: the click opens the portal in the clinician's own login with the packet ready
    r.stage = 'portal_open'; r.send_pressed_at = this.now();
    this.event(`Send pressed · ${portalName(s, r)} opened in the clinician's own session with the packet ready`, by, id);
    return { channel: r.channel, open: `/${r.channel}/upload?request=${id}` };
  },
  'request.portalConfirmed'(s, { id, ref }) {
    const r = need(byId(s.requests, id), 'Request');
    const at = this.now();
    Object.assign(r, { stage: 'submitted', sent: at, portal_ref: ref, decision_due: addDays(at, decideDays(s, r.payer)) });
    if (r.info_reply_pending) { r.info_reply_pending = false; this.event('Reply uploaded in ' + portalName(s, r) + ' · confirmation ' + ref + ' · decision clock restarts', 'jperez', id); }
    else this.event('Upload confirmed in the portal · confirmation ' + ref + ' (read by the extension)', 'jperez', id);
  },
  'request.overdueNotice'(s, { id }) {
    const r = need(byId(s.requests, id), 'Request');
    r.overdue_notice_sent = this.now();
    this.event('Overdue notice sent (cites the plan decision timeframe and ' + (r.fax_ref ? 'fax ref ' + r.fax_ref : 'the portal confirmation') + ')', 'jperez', id);
  },
  'request.receiptCheck'(s, { id, by = 'cdiaz' }) {
    const r = need(byId(s.requests, id), 'Request');
    r.receipt_confirmed = this.now(); r.receipt_by = by;
    this.event('Receipt confirmed by phone', by, id);
  },
  // Demo-only: payer replies cannot arrive during a demo
  'request.demoReply'(s, { id, kind, units }) {
    const r = need(byId(s.requests, id), 'Request');
    const at = this.now();
    if (kind === 'approved') { r.stage = 'active'; r.units_awarded = units || r.units_requested; this.event(`Demo: approved · ${r.units_awarded} units`, 'payer (demo)', id, { demo: true }); }
    if (kind === 'partial') { r.stage = 'partial_decide'; r.units_offered = units || (r.payer === 'sentara' && /H0015/.test(r.service || '') ? 15 : Math.round(r.units_requested * 0.6 / 3) * 3 || 36); if (r.payer === 'sentara' && r.units_offered === 15) r.sessions_offered = 5; r.offer_call = s.today; r.reply_by = addBusinessDays(s.today, 1); this.event(`Demo: partial offer · ${r.units_offered} of ${r.units_requested} units`, 'payer (demo)', id, { demo: true }); }
    if (kind === 'info') { r.stage = 'info_requested'; r.info_requested_at = at; r.reply_due = addHours(at, 24); r.info_items = r.info_items || ['ASAM six-dimension summary with risk ratings', 'Dated UDS results for the last 30 days', 'Prior treatment episodes and outcomes']; this.event('Demo: information request received · 24 h clock started', 'payer (demo)', id, { demo: true }); }
    if (kind === 'denied') { r.stage = 'denied'; r.denied_on = s.today; r.denial_reason = r.denial_reason || 'does not meet medical necessity criteria'; r.appeal_deadline = addDays(s.today, 60); this.event('Demo: denied · reconsideration / appeal window opens (60 days · confirm per plan)', 'payer (demo)', id, { demo: true }); }
  },
  'request.partialDecide'(s, { id, door, plan }) {
    const r = need(byId(s.requests, id), 'Request');
    r.decision = { door, at: this.now(), plan };
    if (door === 'accept') { r.stage = 'active'; r.units_awarded = r.units_offered; this.event(`Accepted ${r.units_offered} units`, 'jperez', id); }
    if (door === 'info') { r.stage = 'info_requested'; r.info_requested_at = this.now(); r.reply_due = addHours(this.now(), 24); this.event('Chose to add information (the payer asked)', 'jperez', id); }
    if (door === 'p2p') { r.stage = 'peer_to_peer_booked'; r.p2p_at = plan?.when || addDays(s.today, 14) + 'T14:00'; this.event('Peer-to-peer requested · call ' + fmtDateTime(r.p2p_at, { dow: true }), 'jperez', id); }
    if (door === 'early_discharge') { r.stage = 'early_discharge'; r.units_awarded = r.units_offered; this.event(`Accepted ${r.units_offered} units with a step-down plan`, 'jperez', id); }
  },
  'request.p2pOutcome'(s, { id, outcome, units, notes }) {
    const r = need(byId(s.requests, id), 'Request');
    r.p2p_outcome = { outcome, units, notes, at: this.now() };
    if (outcome === 'approved') { r.stage = 'active'; r.units_awarded = units || r.units_requested; }
    else if (outcome === 'partial') { r.stage = 'active'; r.units_awarded = units || r.units_awarded; }
    else r.stage = 'denied';
    this.event('Peer-to-peer outcome logged · ' + outcome + (units ? ' · ' + units + ' units' : ''), 'jperez', id);
  },
  'request.infoReply'(s, { id, text }) {
    const r = need(byId(s.requests, id), 'Request');
    r.info_reply = { text, drafted_at: r.info_reply?.drafted_at || this.now(), edited_at: this.now() };
    this.event('Reply edited', 'jperez', id);
  },
  'request.infoSend'(s, { id, text, via }) {
    const r = need(byId(s.requests, id), 'Request');
    r.info_reply = { ...(r.info_reply || {}), text: text || r.info_reply?.text, sent_at: this.now() };
    // Nov 8: replies go by fax through Sfax by default (one place for the whole history); the payer portal stays an option
    if (r.channel === 'fax' || via === 'fax') { r.stage = 'submitted'; r.sent = this.now(); r.decision_due = addDays(s.today, decideDays(s, r.payer)); this.event('Reply faxed through Sfax · decision clock restarts', 'jperez', id); return {}; }
    r.info_reply_pending = true; r.stage = 'portal_open';
    this.event(`"Open in ${portalName(s, r)} and send" pressed · reply ready to paste in the clinician's own session`, 'jperez', id);
    return { open: `/${r.channel}/upload?request=${id}&kind=reply` };
  },
  'request.appealSign'(s, { id, text, signer, signature, lang = 'en' }) {
    const r = need(byId(s.requests, id), 'Request');
    const blocks = [{ text: 'Request for reconsideration / appeal of a denied authorization', size: 14, bold: true }, { text: 'From: ' + orgName(s) }, { text: 'To: ' + payerName(s, r.payer) + ' · Appeals' }, { text: text || '', gap: 10 }, { text: 'Signed by ' + signer + ' · ' + fmtDateTime(this.now(), { year: true }), bold: true, gap: 12 }];
    if (signature) { const buf = Buffer.from(signature.split(',')[1], 'base64'); const sz = jpegSize(buf); if (sz) blocks.push({ image: buf, w: sz.w, h: sz.h, width: 220 }); }
    const file = this.writeFile(`${id}_appeal_signed.pdf`, makePdf(blocks, { title: 'Appeal ' + id }));
    s.files.push({ ...file, kind: 'appeal', record: id, at: this.now() });
    Object.assign(r, { stage: 'appeal_sent', appeal: { text, signer, lang, signed_at: this.now(), file: file.url } });
    this.event('Reconsideration / appeal letter signed · ' + (r.channel === 'fax' ? 'faxed through Sfax' : 'ready for the clinician to upload in ' + portalName(s, r)), signer, id);
    return { file };
  },
  'request.close'(s, { id, why }) { const r = need(byId(s.requests, id), 'Request'); r.stage = 'closed'; this.event('Closed' + (why ? ' · ' + why : ''), 'jperez', id); },
  'request.set'(s, { id, patch, what }) { const r = need(byId(s.requests, id), 'Request'); Object.assign(r, patch); if (what) this.event(what, 'jperez', id); },

  // ---------- step-down plan (Level 2.1 → Level 1) ----------
  'plan.set'(s, { request, client, discharge, intake, new_initial, reminders = [] }) {
    s.plans = s.plans.filter(p => p.request !== request);
    s.plans.push({ request, client, discharge, intake, new_initial, at: this.now() });
    const r = byId(s.requests, request);
    if (r) { r.stage = r.stage === 'partial_decide' ? 'early_discharge' : r.stage; r.early_discharge = { discharge, intake, new_initial }; if (!r.units_awarded && r.units_offered) r.units_awarded = r.units_offered; }
    for (const rm of reminders) s.reminders.push({ id: 'rem-' + Math.random().toString(36).slice(2, 7), record: request, ...rm });
    this.event(`Step-down plan set · last Level 2.1 day ${fmtDate(discharge)} · first Level 1 session ${fmtDate(intake)} · new Level 1 initial by ${fmtDate(new_initial)}`, 'jperez', request);
  },

  // ---------- notes, dictation, timer, assessments (Flow B) ----------
  'timer.start'(s, { staff, client }) {
    s.timers[staff] = { client, started: this.now(), blocks: s.timers[staff]?.blocks || [] };
    this.event('Timer started with ' + clientLabel(s, client), staff, client);
  },
  'timer.stop'(s, { staff }) {
    const t = s.timers[staff]; if (!t || !t.started) return;
    t.blocks = (t.blocks || []).concat([[t.started.slice(11, 16), this.now().slice(11, 16), t.client]]);
    t.started = null;
    this.event('Timer stopped', staff, t.client);
  },
  'dictation.save'(s, { client, staff, spoken, rewritten, chips, checks, ...rest }) {
    const id = 'dict-' + Date.now();
    s.dictations.push({ ...rest, id, client, staff, at: this.now(), spoken, rewritten, chips, checks, status: 'waiting' });
    this.event('Dictation saved · waits until ' + clientLabel(s, client) + ' is open in Client Record', staff, client);
    return { id };
  },
  'dictation.used'(s, { id }) { const d = byId(s.dictations, id); if (d) { d.status = 'used'; d.used_at = this.now(); } },
  'dictation.discard'(s, { id }) { s.dictations = s.dictations.filter(d => d.id !== id); },
  'assessment.save'(s, { client, instrument, answers, score, by }) {
    s.assessments.push({ id: 'as-' + Date.now(), client, instrument, answers, score, date: s.today, by, status: 'waiting' });
    this.event(instrument + ' answers saved · wait until the client is open in Client Record', by, client);
  },
  'assessment.used'(s, { id }) { const a = byId(s.assessments, id); if (a) a.status = 'used'; },
  // reported by the panel after Process Form on a note in Client Record
  'note.processed'(s, { client, staff, type, fields, session, enhanced, dictation, units }) {
    const note = { id: 'note-' + Date.now(), client, staff, type, date: s.today, fields, session, enhanced, dictation, units, processed_at: this.now() };
    const st = byId(s.staff, staff);
    note.review = st?.review_mode === 'every_note' ? 'pending' : 'approved';
    s.notes.push(note);
    this.event(`${typeLabel(type)} processed in Client Record`, staff, client);
    return { id: note.id };
  },
  'note.review'(s, { id, decision, comment, by = 'cdiaz' }) {
    const n = need(byId(s.notes, id), 'Note');
    n.review = decision; n.review_comment = comment; n.reviewed_by = by; n.reviewed_at = this.now();
    this.event(`Note ${decision === 'approved' ? 'approved' : decision === 'returned' ? 'returned with a note' : 'flagged: "That didn\'t happen"'}`, by, n.client);
  },

  // ---------- screening & drafts (Flow A) ----------
  'screening.done'(s, { client, referral, boxes, transcript, session }) {
    const sc = s.screenings.find(x => (x.referral === referral) || (x.client === client)) || (s.screenings.push({ referral, client }), s.screenings[s.screenings.length - 1]);
    Object.assign(sc, { status: 'done', when: this.now(), boxes, transcript, session });
    const r = byId(s.referrals, referral); if (r) { r.stage = 'in_intake'; r.next = 'ASAM assessment next'; }
    const c = byId(s.clients, client); if (c) { c.stage = 'intake'; c.timeline = { ...(c.timeline || {}), screening: this.now() }; }
    this.event('Intake screening saved in Client Record · ASAM assessment next', 'jperez', referral || client);
  },
  'draft.save'(s, { key, data }) {
    s.drafts = s.drafts.filter(d => d.key !== key);
    s.drafts.push({ key, data, at: this.now() });
  },
  'client.update'(s, { id, patch, what, who = 'jperez' }) {
    const c = need(byId(s.clients, id), 'Client'); Object.assign(c, patch);
    if (what) this.event(what, who, id);
  },
  'lauris.event'(s, { what, record, who }) { this.event(what, who || 'jperez', record); },

  // ---------- incidents & compliance ----------
  'incident.filePortal'(s, { index, by = 'cdiaz' }) {
    const i = s.incidents[index]; if (!i) throw new Error('Incident not found');
    i.state_portal_filed = this.now(); i.status = 'complete';
    this.event('Level ' + i.level + ' incident reported to DPBH (time logged)', by, i.client);
  },
  'incident.save'(s, { incident }) { s.incidents.unshift({ ...incident, saved_at: this.now() }); this.event('Incident report processed in Client Record', incident.by || 'slane', incident.client); },

  // ---------- users & settings ----------
  'user.add'(s, { name, credential = '', role = 'direct_support', sites = ['CC-ES1'], review_mode = 'every_note', reviewer = 'cdiaz' }) {
    let id = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) || 'user'; const base = id; let k = 2; while (s.staff.some(x => x.id === id)) id = base + k++;
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    s.staff.push({ id, name, initials, credential, title: roleTitle(role), role, sites, review_mode, reviewer });
    this.event('User added: ' + name + ' (' + roleTitle(role) + ')', 'dowens', id);
    return { id };
  },
  'user.update'(s, { id, patch }) { const u = need(byId(s.staff, id), 'User'); const roleTitles = ['Counselor', 'Clinical supervisor', 'Clinician', 'Billing & admin', 'Direct support', 'Site supervisor', 'Admin'];
    Object.assign(u, patch); if (patch.role && !patch.title && (!u.title || roleTitles.some(t => u.title.startsWith(t)))) u.title = roleTitle(patch.role); this.event('User updated: ' + u.name + (patch.role ? ' → ' + roleTitle(patch.role) : ''), 'dowens', id); },
  'settings.set'(s, { key, value }) { s.settings[key] = value; this.event('Settings saved: ' + key.replace(/_/g, ' '), 'dowens', 'settings'); },
  'library.add'(s, { name, kind = 'Knowledge', note = '' }) { s.library.push({ name, kind, note, added: s.today, by: 'dowens' }); this.event('Library document added: ' + name, 'dowens', 'library'); },
  'migration.rerun'(s) { s.migration = { ...s.migration, last_export: s.today, rerun_at: this.now() }; s.exports.push({ run_at: this.now(), run_by: 'dowens' }); this.event('Client Record export re-read (' + orgName(s) + ' admin exports by hand)', 'dowens', 'migration'); },
  'reminder.done'(s, { id }) { const r = byId(s.reminders, id); if (r) r.done = this.now(); },
  'file.pdf'(s, { name, blocks, title, kind = 'document', record }) {
    const file = this.writeFile(name, makePdf(blocks, { title: title || name }));
    s.files.push({ ...file, kind, record, at: this.now() });
    if (record) this.event(`${title || name} saved as PDF`, 'Psyflo', record);
    return { file };
  }
};

function staffShort(s, id) { const p = byId(s.staff, id); return p ? p.name.replace(/^(\w)\w+ /, '$1. ') : id; }
function clientLabel(s, id) { const c = byId(s.clients, id); return c ? c.initials : id; }
function roleTitle(r) { return { direct_support: 'Direct support staff', supervisor: 'Clinician', clinician: 'Clinician', admin: 'Administrator' }[r] || r; }
function typeLabel(t) { return { daily: 'IOP group note', weekly_guardian: 'Weekly individual session', monthly_collateral: 'Collateral contact', quarterly: 'ASAM 30-day review', incident: 'Incident report', discharge: 'Discharge / transfer summary' }[t] || t; }
