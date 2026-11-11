// Denial Intelligence actions (E3). A dispute is the working layer over a request that needs a payer-decision response.
//
//  * request.stage stays the ONLY lifecycle. Every dispute action that changes the request calls the existing request.* actions
//    (partialChoice, partialDecide, p2pLog, infoSend, appealSend, close) and recordDecision / applyAward from core.js, so units, the
//    authorization window, the "enter the units in Lauris" task and the audit trail are the ones F1 built. Nothing here writes units
//    into Lauris, signs, or sends anything on its own: a person presses each button, and references come only from the send stub.
//  * The dispute `status`, `path` and `closed` are DERIVED from the request after every action (syncDisputes, installed on
//    store.changed): a dispute opens by itself when a request enters partial_decide, info_requested, a peer-to-peer stage, denied or
//    appeal_sent, and closes with its outcome when the request leaves them. The queue, the nav count and Analytics all read the result.
//  * Drafts (info reply, peer-to-peer points, appeal letter, reconsideration) are built from stored evidence only (sel/disputes.js),
//    carry the "Simulated" chip, and what is missing prints "Evidence missing — verify …". Outward documents cannot be reviewed or sent
//    while a placeholder remains; processed decisions are write-once.
import { store, loadSeed } from '../store.js';
import { refuse, needDocRef, needUnits, rand, Refusal } from '../gates.js';
import { recordDecision, applyAward } from './core.js';
import { today as clockToday } from '../../../web/js/shared/clock.js';
import { fmtDate } from '../../../web/js/shared/dates.js';
import { rule } from '../../../web/js/shared/rules.js';
import { can } from '../../../web/js/shared/permissions.js';
import {
  ADVERSE, P2P_STAGES, ISSUE_LABEL, PATH_LABEL, DOC_TITLE, isOpen, byDisputeId, byRequest, issueOfRequest, deriveStatus, derivePath, resolutionOf, buildDoc, docText, docMissing,
  evidenceIndex, MISSING_RE, payerFirst
} from '../../../web/js/shared/sel/disputes.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const faxRef = () => 'F-' + (2300 + Math.floor(rand() * 600));
const DOCS = ['info', 'p2p', 'appeal', 'recon'];
const OUTWARD = ['info', 'appeal', 'recon'];
const staffName = (s, id) => (byId(s.staff, id) || {}).name || id;

// ------------------------------------------------------------------------------------------------------------- reconcile
const adverse = r => !!r && (ADVERSE.includes(r.stage) || (r.stage === 'portal_open' && !!r.info_reply_pending));
const infoItemsOf = (s, r) => (r.info_items && r.info_items.length ? r.info_items : (((s.request_details || {})[r.id] || {}).info || {}).items) || [];
function noticeFor(s, r) {
  const last = (r.decision_log || []).filter(x => !x.superseded_by).at(-1);
  const stamp = r.stage === 'info_requested' ? r.info_requested_at : r.denied_on ? r.denied_on : r.offer_call || r.p2p_outcome?.at;
  return { date: String(stamp || clockToday(s)).slice(0, 10), via: r.channel === 'portal' ? 'portal' : r.channel, doc_ref: last ? last.doc_ref : null, source: last ? `Recorded decision ${last.id}` : 'Recorded in Psyflo from the payer message' };
}
function concernsFor(s, r) {
  if (r.stage === 'info_requested' || r.stage === 'portal_open') return infoItemsOf(s, r).map((t, i) => ({ text: t, source: `Payer request for information · item ${i + 1}`, date: String(r.info_requested_at || clockToday(s)).slice(0, 10) }));
  if (r.stage === 'denied' || r.stage === 'appeal_sent') return r.denial_reason ? [{ text: `"${r.denial_reason}"`, source: 'Payer determination notice', date: String(r.notice_date || r.denied_on || clockToday(s)).slice(0, 10) }] : [];
  return [{ text: `Offered ${r.units_offered != null ? r.units_offered : r.units_awarded} of ${r.units_requested} units. The payer's reason was not recorded.`, source: 'Recorded decision', date: String(r.offer_call || clockToday(s)).slice(0, 10) }];
}
function openDispute(store, s, r) {
  const prior = s.disputes.filter(d => d.request === r.id).length;
  const base = 'DI-' + String(r.id).replace(/^R-/, '');
  const c = byId(s.clients, r.client) || {};
  const backup = (s.staff || []).find(x => (x.designations || []).includes('payer.decision') && x.id !== (c.clinician || 'jperez'));
  const d = { id: prior ? `${base}-${prior + 1}` : base, request: r.id, client: r.client, payer: r.payer, issue: issueOfRequest(r), status: 'decide', path: null,
    owner: c.clinician || 'jperez', backup: backup ? backup.id : null, opened: clockToday(s), closed: null,
    units: { requested: r.units_requested, offered: r.units_offered != null ? r.units_offered : r.units_awarded != null ? r.units_awarded : null },
    notice: noticeFor(s, r), concerns: concernsFor(s, r), docs: {}, tried: [], excluded: [], included: [], history: [] };
  d.status = deriveStatus(s, d, r); d.path = derivePath(d, r);
  s.disputes.push(d);
  store.event(`Opened in Denial Intelligence · ${ISSUE_LABEL[d.issue].toLowerCase()} · ${d.id} · owner ${staffName(s, d.owner)}`, 'Psyflo', r.id, { actor_kind: 'system' });
  return d;
}
function closeDispute(store, s, d, r) {
  const res = d.pending_outcome ? { ...resolutionOf(s, d, r || {}), ...d.pending_outcome } : resolutionOf(s, d, r || {});
  delete d.pending_outcome;
  // the sent info reply (portal path): the confirmation number arrives from the open portal page
  if (r && d.docs && d.docs.info && r.info_reply && r.info_reply.sent_at) d.docs.info.sent = { ...(d.docs.info.sent || {}), at: r.info_reply.sent_at, ref: r.info_reply.ref || (d.docs.info.sent || {}).ref, via: r.info_reply.via || (d.docs.info.sent || {}).via, by: r.info_reply.by || (d.docs.info.sent || {}).by, pending: false };
  d.status = res.status; d.closed = clockToday(s); d.outcome = res;
  store.event(`Closed in Denial Intelligence · ${res.text}`, 'Psyflo', d.request, { actor_kind: 'system' });
}
// Reconcile the disputes with the requests. Idempotent; run after every action (store.changed) and after a reset.
export function syncDisputes(store, s) {
  if (!Array.isArray(s.disputes)) s.disputes = [];
  for (const r of s.requests || []) if (adverse(r) && !s.disputes.some(d => d.request === r.id && isOpen(d))) openDispute(store, s, r);
  for (const d of s.disputes.filter(isOpen)) {
    const r = byId(s.requests, d.request);
    if (!adverse(r)) { closeDispute(store, s, d, r); continue; }
    // a partial or an information request that ended in a denial is now a denial (the paths already tried stay on the record)
    if (r.stage === 'denied' && d.issue !== 'denial') {
      if (d.path === 'p2p' || r.p2p_outcome) d.tried = [...new Set([...(d.tried || []), 'p2p'])];
      d.issue = 'denial'; d.units = { ...(d.units || {}), offered: 0 }; d.notice = { ...noticeFor(s, r), via: d.notice && d.notice.via || r.channel }; d.concerns = concernsFor(s, r).concat((d.concerns || []).filter(x => !/not recorded/.test(x.text)).map(x => ({ ...x, earlier: true })));
      if (d.path === 'p2p' || d.path === 'info') d.path = null;
      store.event(`Peer-to-peer or reply did not change the decision · ${d.id} is now a denial`, 'Psyflo', r.id, { actor_kind: 'system' });
    }
    if (r.units_offered != null) d.units = { ...(d.units || {}), requested: r.units_requested, offered: r.units_offered };
    if (r.stage === 'info_requested' && !(d.concerns || []).some(x => /request for information/i.test(x.source || ''))) { const items = concernsFor(s, r); if (items.length) d.concerns = items.concat(d.concerns || []); }
    d.payer = r.payer; d.path = derivePath(d, r); d.status = deriveStatus(s, d, r);
  }
}
// install once: after every action (and a reset) the disputes are reconciled before the state is saved and pushed
if (!store.__disputesSync) {
  store.__disputesSync = true;
  const orig = store.changed;
  store.changed = function () { try { syncDisputes(this, this.state); } catch (e) { console.error('disputes reconcile failed:', e); } return orig.call(this); };
  // an older persisted state has no disputes yet: seed them once
  try {
    if (!Array.isArray(store.state.disputes)) { const seed = loadSeed(); for (const k of ['disputes', 'dispute_evidence', 'drafting_rules']) if (!store.state[k]) store.state[k] = JSON.parse(JSON.stringify(seed[k] || [])); syncDisputes(store, store.state); store.save(); }
    else for (const k of ['dispute_evidence', 'drafting_rules']) if (!store.state[k]) store.state[k] = JSON.parse(JSON.stringify(loadSeed()[k] || []));
  } catch (e) { console.error('disputes seed failed:', e); }
}

// ------------------------------------------------------------------------------------------------------------- helpers
function dispute(s, id, { open = true } = {}) {
  const d = byDisputeId(s, id) || byRequest(s, id);
  if (!d) throw new Error('Dispute not found: ' + id);
  if (open && !isOpen(d)) refuse(`${d.id} is closed (${d.outcome ? d.outcome.text : d.status}). A closed case is write-once; a new payer decision opens a new case.`, { record: d.request, code: 'closed' });
  return d;
}
const requestOf = (s, d) => { const r = byId(s.requests, d.request); if (!r) throw new Error('Request not found: ' + d.request); return r; };
function call(st, s, name, args) { return st.actions[name].call(st, s, args, st.ctx); }
const log = (st, s, d, what, extra = {}) => { d.history = (d.history || []).concat([{ at: st.now(), by: st.who(), what }]); st.event(what, st.who(), d.request, extra); };
const needDoc = k => { if (!DOCS.includes(k)) throw new Error('Unknown document: ' + k); return k; };

// The family portal reads state.appeal_drafts[<request id>] (AppealLetter, E6): { en, attached, status: 'draft' | 'ready', prepared_by, prepared_at }.
// A draft is mirrored as { status: 'draft' } with no text; the letter text is published (status 'ready') only after a clinician reviews it.
// The seeded sample letter stays as seeded until staff draft their own. E6's projection decides what the guardian sees of it.
function publishAppeal(s, d, r, st) {
  const doc = d.docs.appeal; s.appeal_drafts = s.appeal_drafts || {};
  if (!doc || !doc.sections || doc.seeded) return;
  s.appeal_drafts[r.id] = doc.reviewed
    ? { en: docText(doc, 'appeal'), attached: doc.attached || 'Decision notice · the request', status: 'ready', prepared_by: doc.reviewed.by, prepared_at: doc.reviewed.at }
    : { status: 'draft', prepared_by: st.who(), prepared_at: st.now() };
}

export default {
  // Open the case of a request that needs a payer-decision response (it also opens by itself; this is the explicit form).
  'dispute.open'(s, { request }) {
    const r = byId(s.requests, request); if (!r) throw new Error('Request not found');
    if (!adverse(r)) refuse(`${request} is ${r.stage.replace(/_/g, ' ')}. Denial Intelligence works requests that need a payer-decision response (partial, information request, peer-to-peer, denied, appeal).`, { record: request, code: 'bad_stage' });
    let d = byRequest(s, request);
    if (!d || !isOpen(d)) d = openDispute(this, s, r);
    return { id: d.id };
  },

  'dispute.assign'(s, { id, owner, backup }) {
    const d = dispute(s, id);
    const o = byId(s.staff, owner); if (!o) throw new Error('Owner not found');
    if (!can(o, 'payer.reply')) refuse(`${o.name} cannot own a payer-decision case: replying to a payer needs a licensed clinician.`, { record: d.request, status: 422, code: 'owner_role' });
    const b = backup ? byId(s.staff, backup) : null; if (backup && !b) throw new Error('Backup not found');
    if (b && b.role === 'direct_support') refuse('A backup owner must be a clinician, site supervisor or administrator.', { record: d.request, status: 422 });
    const was = d.owner; d.owner = owner; d.backup = b ? b.id : null;
    log(this, s, d, `Owner ${was === owner ? 'confirmed' : 'changed'}: ${o.name}${b ? ' · backup ' + b.name : ''}`);
    return { id: d.id, owner: d.owner };
  },

  // Choose a path. accept | p2p | info | recon | appeal | none. The request moves through its own actions.
  'dispute.choose'(s, { id, path, plan = {} }) {
    const d = dispute(s, id); const r = requestOf(s, d); const pf = payerFirst(s, r.payer);
    if (path === 'accept') {
      if (r.stage === 'partial_decide') {
        const mode = plan.mode || 'plain';
        if (mode === 'stretch') call(this, s, 'request.partialChoice', { id: r.id, choice: 'stretch', plan });
        else if (mode === 'use_up') call(this, s, 'request.partialChoice', { id: r.id, choice: 'use_up', plan });
        else call(this, s, 'request.partialDecide', { id: r.id, door: 'accept' });
      } else if (r.stage === 'denied') {
        d.pending_outcome = { status: 'accepted', text: 'Denial accepted · no appeal or reconsideration', at: this.now() };
        call(this, s, 'request.close', { id: r.id, why: 'Denial accepted' });
      } else refuse(`${r.id} is ${r.stage.replace(/_/g, ' ')}; there is nothing to accept yet.`, { record: r.id, code: 'bad_stage' });
    } else if (path === 'p2p') {
      if (r.stage !== 'partial_decide') refuse(`A peer-to-peer is requested while a partial offer is open; ${r.id} is ${r.stage.replace(/_/g, ' ')}. Whether ${pf} takes one after a final denial is not verified.`, { record: r.id, code: 'bad_stage' });
      call(this, s, 'request.partialChoice', { id: r.id, choice: 'p2p', plan: plan.when ? { when: plan.when } : {} });
    } else if (path === 'info') {
      if (r.stage !== 'partial_decide') refuse(`${r.id} is ${r.stage.replace(/_/g, ' ')}.`, { record: r.id, code: 'bad_stage' });
      if (!(r.info_items && r.info_items.length) && !(d.concerns || []).some(x => /request for information/i.test(x.source || ''))) refuse(`${pf} has not asked for information on this decision, so there is no reply to prepare.`, { record: r.id, code: 'not_asked' });
      call(this, s, 'request.partialDecide', { id: r.id, door: 'info' });
    } else if (path === 'recon') {
      if (!['partial_decide', 'denied'].includes(r.stage)) refuse(`${r.id} is ${r.stage.replace(/_/g, ' ')}; reconsideration is asked for on an open partial or a denial.`, { record: r.id, code: 'bad_stage' });
      if ((d.tried || []).includes('recon')) refuse('Reconsideration was already requested for this decision.', { record: r.id, code: 'tried' });
      d.path = 'recon';
      log(this, s, d, `Reconsideration chosen · not sent · the payer rule is not verified (${rule(s, 'appeal.reconsideration_days').verification.toLowerCase()})`);
    } else if (path === 'appeal') {
      if (r.stage !== 'denied') refuse(`An appeal follows a final denial; ${r.id} is ${r.stage.replace(/_/g, ' ')}. Whether a partial offer can be appealed is not verified.`, { record: r.id, code: 'bad_stage' });
      d.path = 'appeal';
      log(this, s, d, `Appeal chosen · guardian-led: Psyflo prepares, the guardian reviews and signs, staff press Send (${rule(s, 'appeal.window_days').verification.toLowerCase()})`);
    } else if (path === 'none') {
      if (!['recon', 'appeal'].includes(d.path)) refuse('There is no chosen path to clear.', { record: r.id, code: 'no_path' });
      if (d.docs[d.path] && d.docs[d.path].sent) refuse('That document was already sent; the path cannot be cleared.', { record: r.id, code: 'write_once' });
      log(this, s, d, `Path cleared: ${PATH_LABEL[d.path]} not pursued`); d.path = null;
    } else throw new Error('Unknown path: ' + path);
    d.choice = { path, at: this.now(), by: this.who() };
    return { id: d.id, stage: requestOf(s, d).stage };
  },

  // Generate (or regenerate) a draft from stored evidence. Rule-based: Simulated. A sent document is write-once.
  'dispute.genDoc'(s, { id, doc }) {
    const d = dispute(s, id); const r = requestOf(s, d); const kind = needDoc(doc);
    const ok = { info: ['info_requested'], p2p: ['partial_decide', ...P2P_STAGES], appeal: ['denied'], recon: ['partial_decide', 'denied'] }[kind];
    if (!ok.includes(r.stage) || (kind === 'recon' && d.path !== 'recon') || (kind === 'appeal' && d.path !== 'appeal')) refuse(`${DOC_TITLE[kind]} is not part of this case right now (${r.id} is ${r.stage.replace(/_/g, ' ')}${d.path ? ', path ' + PATH_LABEL[d.path].toLowerCase() : ''}).`, { record: r.id, code: 'bad_doc' });
    const cur = d.docs[kind];
    if (cur && cur.sent) refuse(`${DOC_TITLE[kind]} was already sent; a sent document is write-once.`, { record: r.id, code: 'write_once' });
    const next = buildDoc(s, d, r, kind, this.who());
    next.versions = (cur ? cur.versions || [] : []).concat([{ at: this.now(), by: this.who(), what: cur ? 'Regenerated from stored evidence' : 'Generated from stored evidence (Simulated)', previous: cur && cur.sections ? docText(cur, kind).slice(0, 400) : undefined }]);
    d.docs[kind] = next;
    log(this, s, d, `Draft ${cur ? 'regenerated' : 'generated'}: ${DOC_TITLE[kind]} · ${next.gen.sources} stored record${next.gen.sources === 1 ? '' : 's'} cited · ${docMissing(next).length} item${docMissing(next).length === 1 ? '' : 's'} marked Evidence missing (rule-based, Simulated)`, { sim: true });
    if (kind === 'appeal') publishAppeal(s, d, r, this);
    return { id: d.id, sections: next.sections.length, missing: docMissing(next).length };
  },

  // A clinician edits one section. The evidence links stay; the review is withdrawn; the earlier text is kept as a version.
  'dispute.editDoc'(s, { id, doc, section, text }) {
    const d = dispute(s, id); const r = requestOf(s, d); const kind = needDoc(doc); const cur = d.docs[kind];
    if (!cur || !cur.sections) refuse('Generate the draft first.', { record: r.id, status: 422, audit: false });
    if (cur.sent) refuse(`${DOC_TITLE[kind]} was already sent; the sent text cannot be changed.`, { record: r.id, code: 'write_once' });
    const sec = cur.sections.find(x => x.key === section); if (!sec) throw new Error('Section not found: ' + section);
    const t = String(text ?? '').trim(); if (!t) refuse('A section cannot be empty. Delete the draft instead, or write the sentence.', { record: r.id, status: 422, audit: false });
    cur.versions = (cur.versions || []).concat([{ at: this.now(), by: this.who(), what: `Edited · ${sec.title}`, previous: sec.text.slice(0, 300) }]);
    sec.text = t; sec.edited = { by: this.who(), at: this.now() }; sec.missing = (t.match(MISSING_RE) || []).map(m => m.replace(/^\[Evidence missing — verify |\]$/g, ''));
    cur.reviewed = null; cur.stale = cur.stale || false;
    log(this, s, d, `Clinician edited draft: ${DOC_TITLE[kind]} · ${sec.title}`);
    if (kind === 'appeal') publishAppeal(s, d, r, this);
    return { id: d.id };
  },

  // A clinician reviews the draft. An outward document cannot be reviewed while a placeholder remains.
  'dispute.reviewDoc'(s, { id, doc }) {
    const d = dispute(s, id); const r = requestOf(s, d); const kind = needDoc(doc); const cur = d.docs[kind];
    if (!cur || !cur.sections) refuse('Generate the draft first.', { record: r.id, status: 422, audit: false });
    if (cur.sent) refuse(`${DOC_TITLE[kind]} was already sent.`, { record: r.id, code: 'write_once' });
    const gaps = docMissing(cur);
    if (OUTWARD.includes(kind) && gaps.length) refuse(`${gaps.length} item${gaps.length === 1 ? ' is' : 's are'} still marked Evidence missing. Add the record or write the sentence yourself, then review: this document goes to ${kind === 'appeal' ? 'the guardian and the payer' : 'the payer'}.`, { record: r.id, code: 'gaps', status: 422 });
    if (cur.seeded && !cur.sections.some(x => x.edited)) refuse('This is a seeded sample letter. Draft it again from stored evidence, or edit it, before it is reviewed.', { record: r.id, code: 'seeded', status: 422 });
    cur.reviewed = { by: this.who(), at: this.now(), gaps: gaps.length };
    log(this, s, d, `Clinician reviewed: ${DOC_TITLE[kind]}${gaps.length ? ` · ${gaps.length} item${gaps.length === 1 ? '' : 's'} still marked Evidence missing (internal use)` : ''}`);
    if (kind === 'appeal') publishAppeal(s, d, r, this);
    return { id: d.id };
  },

  // Keep a stored record out of drafts (or put a sensitive one in). Drafts built before the change are marked stale.
  'dispute.includeEvidence'(s, { id, ref, include }) {
    const d = dispute(s, id); const r = requestOf(s, d);
    const idx = evidenceIndex(s, d, r); const ev = idx.items.find(e => e.id === ref); if (!ev) throw new Error('Evidence not found: ' + ref);
    d.excluded = (d.excluded || []).filter(x => x !== ref); d.included = (d.included || []).filter(x => x !== ref);
    if (include) { if (ev.sensitivity === 'sensitive') d.included.push(ref); } else d.excluded.push(ref);
    for (const k of Object.keys(d.docs)) if (d.docs[k] && !d.docs[k].sent) { d.docs[k].stale = true; d.docs[k].reviewed = null; }
    if (d.docs.appeal) publishAppeal(s, d, r, this);
    log(this, s, d, `Evidence ${include ? 'included in' : 'excluded from'} drafts: ${ev.label} (${fmtDate(ev.date)})${ev.sensitivity === 'sensitive' ? ' · sensitive' : ''}`);
    return { id: d.id };
  },

  // Record the call date the payer agreed by phone (the payer calls; this happens outside Psyflo).
  'dispute.schedule'(s, { id, when, ref, reviewer }) {
    const d = dispute(s, id); const r = requestOf(s, d);
    if (!when) refuse('Enter the date and time of the call.', { record: r.id, status: 422, audit: false });
    if (!['partial_decide', ...P2P_STAGES].includes(r.stage)) refuse(`${r.id} is ${r.stage.replace(/_/g, ' ')}; a peer-to-peer call is scheduled while a decision is open.`, { record: r.id, code: 'bad_stage' });
    if (r.stage === 'partial_decide') call(this, s, 'request.partialChoice', { id: r.id, choice: 'p2p', plan: { when } });
    else call(this, s, 'request.p2pSchedule', { id: r.id, when });
    d.p2p = { ...(d.p2p || {}), ref: String(ref || '').trim() || (d.p2p || {}).ref || null, reviewer: String(reviewer || '').trim() || (d.p2p || {}).reviewer || null, scheduled_at: this.now(), scheduled_by: this.who() };
    return { id: d.id, stage: requestOf(s, d).stage };
  },

  // Send a reviewed document. The send stub records its reference (fax) or the portal opens in the clinician's own login.
  'dispute.send'(s, { id, doc, ref }) {
    const d = dispute(s, id); const r = requestOf(s, d); const kind = needDoc(doc); const cur = d.docs[kind];
    if (!OUTWARD.includes(kind)) refuse('The peer-to-peer talking points are for the call; they are not sent.', { record: r.id, code: 'not_sendable' });
    if (!cur || !cur.sections) refuse('Generate and review the draft first.', { record: r.id, status: 422, audit: false });
    if (!cur.reviewed) refuse(`A clinician reviews ${DOC_TITLE[kind].toLowerCase()} before it is sent.`, { record: r.id, code: 'not_reviewed', status: 422 });
    if (cur.sent) refuse(`${DOC_TITLE[kind]} was already sent (${cur.sent.ref || 'portal'}).`, { record: r.id, code: 'write_once' });
    if (docMissing(cur).length) refuse('The draft still has items marked Evidence missing.', { record: r.id, code: 'gaps', status: 422 });
    const by = this.who(); const text = docText(cur, kind);
    if (kind === 'info') {
      if (!can(this.actor, 'payer.reply')) refuse('Only a licensed clinician replies to an information request.', { record: r.id, status: 403 });
      const res = call(this, s, 'request.infoSend', { id: r.id, text, via: r.channel === 'fax' ? 'fax' : undefined });
      cur.sent = { at: this.now(), by, ref: res && res.ref || undefined, via: r.channel === 'fax' ? 'fax' : 'portal', pending: !(res && res.ref) };
      return { id: d.id, ...(res || {}) };
    }
    if (kind === 'appeal') {
      if (!can(this.actor, 'send.packet')) refuse('Press Send needs the send capability.', { record: r.id, status: 403 });
      const res = call(this, s, 'request.appealSend', { id: r.id });
      cur.sent = { at: this.now(), by, ref: res && res.ref, via: r.channel === 'fax' ? 'fax' : 'portal' };
      return { id: d.id, ...(res || {}) };
    }
    // reconsideration: fax runs the stub; a portal is opened in the clinician's own login and the confirmation is entered by them
    if (!can(this.actor, 'payer.reply') || !can(this.actor, 'send.packet')) refuse('Sending a reconsideration request needs a clinician with the send capability.', { record: r.id, status: 403 });
    const pf = payerFirst(s, r.payer);
    if (r.channel === 'fax') {
      const fr = faxRef(); cur.sent = { at: this.now(), by, ref: fr, via: 'fax' };
      log(this, s, d, `Reconsideration request sent through simulated Sfax · ref ${fr} · ${pf} (not verified as a payer process)`, { sim: true });
      return { id: d.id, ref: fr };
    }
    const entered = String(ref || '').trim();
    if (entered.length < 4) { return { id: d.id, open: `/${r.channel}/upload?request=${r.id}&kind=reply`, needsRef: true }; }
    cur.sent = { at: this.now(), by, ref: entered, via: r.channel, manual: true };
    log(this, s, d, `Reconsideration request sent in ${r.channel === 'availity' ? 'Availity' : 'the UHC portal'} · confirmation ${entered} entered by ${staffName(s, by)} (read from the portal page)`);
    return { id: d.id, ref: entered };
  },

  // Record the document that states the payer's original decision (an offer that arrived by phone has none yet). Write-once.
  'dispute.recordDecision'(s, { id, doc_ref, reason }) {
    const d = dispute(s, id); const r = requestOf(s, d);
    if (d.issue === 'info') refuse('An information request is not a decision; the decision follows the reply.', { record: r.id, code: 'bad_issue' });
    const ref = needDocRef(doc_ref, 'the payer decision');
    const units = d.issue === 'denial' ? 0 : r.units_offered != null ? r.units_offered : r.units_awarded;
    const row = recordDecision(this, s, r, { kind: 'initial', outcome: d.issue === 'denial' ? 'denied' : 'partial', units, doc_ref: ref, reason });
    d.notice = { ...(d.notice || {}), doc_ref: ref };
    log(this, s, d, `Payer decision document recorded: ${ref} (${row.outcome}${units != null ? ', ' + units + ' units' : ''}) · write-once`);
    return { id: d.id, decision: row.id };
  },

  // Record the payer's outcome of the chosen path, with the document that states it. Approved units go through applyAward
  // (Psyflo's tracker and a human task for Lauris); Psyflo never writes units into Lauris.
  'dispute.resolve'(s, { id, outcome, units, doc_ref, notes, reason }) {
    const d = dispute(s, id); const r = requestOf(s, d);
    if (P2P_STAGES.includes(r.stage)) {
      if (outcome === 'awaiting' && !can(this.actor, 'payer.reply')) refuse('Only a licensed clinician records that a peer-to-peer call was held.', { record: r.id, status: 403 });
      return call(this, s, 'request.p2pLog', { id: r.id, outcome, units: outcome === 'approved' ? (units ?? r.units_requested) : units, notes, doc_ref, reason });
    }
    const kind = r.stage === 'appeal_sent' ? 'appeal' : d.path === 'recon' ? 'recon' : null;
    if (!kind) refuse(`There is no peer-to-peer, reconsideration or appeal in progress on ${r.id} to record an outcome for. Choose a path first.`, { record: r.id, code: 'no_path' });
    if (kind === 'recon' && !(d.docs.recon && d.docs.recon.sent)) refuse('Send the reconsideration request before recording the payer answer.', { record: r.id, code: 'not_sent' });
    if (!['approved', 'partial', 'denied'].includes(outcome)) refuse('Outcome must be approved, partial or denied.', { status: 422, audit: false });
    const ref = needDocRef(doc_ref, kind === 'appeal' ? 'the appeal decision' : 'the reconsideration decision');
    const prior = d.units && d.units.offered != null ? d.units.offered : 0;
    const u = outcome === 'denied' ? 0 : needUnits(outcome === 'approved' ? (units ?? r.units_requested) : units, { min: 1, max: r.units_requested, what: 'Units' });
    if (outcome === 'partial' && u >= r.units_requested) refuse(`A partial outcome is fewer than the ${r.units_requested} units requested; record it as approved.`, { record: r.id, status: 422, audit: false });
    recordDecision(this, s, r, { kind, outcome, units: u, doc_ref: ref, notes, reason });
    r[kind + '_outcome'] = { outcome, units: u, doc_ref: ref, notes: notes || undefined, at: this.now(), by: this.who() };
    this.event(`${kind === 'appeal' ? 'Appeal' : 'Reconsideration'} outcome logged · ${outcome}${u ? ' · ' + u + ' units' : ''} · document ${ref}`, this.who(), r.id);
    if (outcome === 'denied') {
      if (kind === 'recon') { d.tried = [...new Set([...(d.tried || []), 'recon'])]; d.path = null; log(this, s, d, `Reconsideration upheld the decision · back to the decision options (${ref})`); }
      else { d.pending_outcome = { status: 'upheld', text: `Appeal upheld the denial · document ${ref}`, at: this.now() }; call(this, s, 'request.close', { id: r.id, why: `Appeal upheld · document ${ref}` }); }
    } else {
      r.stage = 'active'; r.units_awarded = u; applyAward(this, s, r, u, kind === 'appeal' ? 'appeal overturned' : 'reconsideration');
    }
    return { id: d.id, stage: r.stage };
  }
};

// ------------------------------------------------------------------------------------------------------------- authority (server-side; fail closed)
const docCheck = (s, a, actor) => {
  const kind = a.doc;
  if (kind === 'info' && !can(actor, 'payer.reply')) throw new Refusal('Only a licensed clinician replies to an information request.', { status: 403 });
  if (kind === 'appeal' && !can(actor, 'send.packet')) throw new Refusal('Sending the appeal needs the send capability.', { status: 403 });
  if (kind === 'recon' && !(can(actor, 'payer.reply') && can(actor, 'send.packet'))) throw new Refusal('Sending a reconsideration request needs a clinician with the send capability.', { status: 403 });
};
export const authz = {
  'dispute.open': { any: ['payer.reply'] },
  'dispute.assign': { any: ['denials'] },
  'dispute.choose': { any: ['payer.reply'] },
  'dispute.genDoc': { any: ['payer.reply'] },
  'dispute.editDoc': { any: ['payer.reply'] },
  'dispute.reviewDoc': { any: ['payer.reply'] },
  'dispute.includeEvidence': { any: ['payer.reply'] },
  'dispute.schedule': { any: ['payer.reply'] },
  'dispute.send': { any: ['payer.reply', 'send.packet'], check: docCheck },
  'dispute.recordDecision': { any: ['payer.decision'] },
  'dispute.resolve': { any: ['payer.decision'] }
};

// ------------------------------------------------------------------------------------------------------------- what each role may read
const stripDocs = docs => Object.fromEntries(Object.entries(docs || {}).map(([k, v]) => [k, { gen: !!(v && v.gen), reviewed: v && v.reviewed ? { at: v.reviewed.at } : null, sent: v && v.sent ? { at: v.sent.at, ref: v.sent.ref } : null }]));
const statusOnly = d => ({ id: d.id, request: d.request, client: d.client, payer: d.payer, issue: d.issue, status: d.status, path: d.path, owner: d.owner, backup: d.backup, opened: d.opened, closed: d.closed, units: d.units, notice: { date: d.notice && d.notice.date, via: d.notice && d.notice.via, doc_ref: d.notice && d.notice.doc_ref }, concerns: d.issue === 'info' ? [] : d.concerns, docs: stripDocs(d.docs), tried: d.tried, outcome: d.outcome ? { status: d.outcome.status, text: d.outcome.text, units: d.outcome.units, at: d.outcome.at } : null, provenance: d.provenance });
export const projection = {
  disputes: { clinician: true, admin: (s, actor, v) => (v || []).map(statusOnly), default: false },
  dispute_evidence: { clinician: true, default: false },
  drafting_rules: { clinician: true, admin: true, supervisor: true, direct_support: false, default: false }
};
