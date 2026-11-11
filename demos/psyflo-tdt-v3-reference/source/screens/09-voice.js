/* Round 13 (owner HIST13): PSY.voice — Psyflo's voice agent (simulated). It calls the payer's provider line about an SRA or a
   payer decision, asks for what staff need (status, the reference number, what the reviewer needs, a peer-to-peer) and records it.
     PSY.voice.start(caseId, { purpose: 'sra-status'|'denial-followup'|'reference'|'p2p', scope })  → POST /voice-calls → the live call
             pop-up (Dialing → Phone menu → On hold → Speaking with a representative → Summary), sped up for the demo. On finish:
             PATCH /voice-calls/:id, a History event (actor voice, pop call), an audit entry, a toast; the pop-up shows the result.
     PSY.voice.button(caseId, { purpose, scope, label })  → html of the button (default "Call payer · voice agent"); data-act="vc-start"
     PSY.voice.open(callId)            the call pop-up: header (plan, purpose, date and time, duration, outcome, reference number ·
                                       Simulated) + tabs Summary | Transcript + Copy summary + Add note to History
     PSY.voice.get(callId) · list(caseId) · active(caseId) · stepMs (ms per step; tests set it low) · PURPOSES
   Routes: POST /voice-calls { case, purpose, scope } · GET /voice-calls/:id · GET /voice-calls?case= · PATCH /voice-calls/:id { status }
   Scripts come from each case's own facts (status, the payer's stated reasons, units, the dates the demo shows). The agent says it is
   an automated assistant calling on behalf of Harvest; no PHI beyond initials and the references the demo already shows; never a
   Medicaid ID; the representative never states a rule, a deadline or a rate the demo does not already cite. Reference numbers are
   fictional and marked Simulated; no phone number is shown. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const V = (PSY.voice = PSY.voice || {});
  const API = PSY.api; const H = PSY.hist;
  const A = () => PSY.auth;
  V.stepMs = 2300; // a sped-up step (the whole live call takes about 12 seconds)
  V.PURPOSES = {
    'sra-status': { label: 'SRA status call', short: 'status call', ask: 'Status of the SRA and a reference number' },
    'denial-followup': { label: 'Denial follow-up call', short: 'denial follow-up', ask: 'The decision’s reference number, what the reviewer needs, and whether a peer-to-peer can be scheduled' },
    reference: { label: 'Reference number call', short: 'reference call', ask: 'A reference number for the request on file' },
    p2p: { label: 'Peer-to-peer request call', short: 'peer-to-peer call', ask: 'Whether a peer-to-peer review can be scheduled' },
  };
  V.STEPS = ['Dialing the payer’s provider line', 'Phone menu', 'On hold', 'Speaking with a representative', 'Summary'];
  const CODE = { anthem: 'ANT', sentara: 'SEN', aetna: 'AET', humana: 'HUM', uhc: 'UHC' };

  /* ---------------- state ---------------- */
  const st = () => { const s = PSY.state; s.voice13 = s.voice13 || { calls: {}, n: 0 }; s.voice13.calls = s.voice13.calls || {}; return s.voice13; };
  const RUN = {}; // live timers per call id
  let PENDING = null; // a call the presenter's scenario starts once its page is open
  const stopAll = () => { clearTimeout(PENDING); PENDING = null; Object.keys(RUN).forEach((id) => { (RUN[id].t || []).forEach(clearTimeout); delete RUN[id]; }); };
  if (!PSY.reset.__v13) { const r0 = PSY.reset; PSY.reset = function () { stopAll(); return r0.apply(this, arguments); }; PSY.reset.__v13 = true; }

  /* ---------------- facts of a case (what the script may say) ---------------- */
  function facts(cid) {
    const c = PSY.caseView(cid) || {}; const m = A() ? A().meta(cid) : {}; const u = A() ? A().units(cid) : {}; const pay = PSY.data.payers[c.payer] || {};
    const ch = PSY.rules && PSY.rules.channel ? PSY.rules.channel(c.payer) : { method: pay.channel, label: pay.channel };
    const sub = PSY.p1 && PSY.p1.submissionOf ? PSY.p1.submissionOf(cid) : null;
    const d = m.decision || null; const reasons = d && d.said ? String(d.said).split(' · ').map((x) => x.trim().replace(/^[“"]|[”"]$/g, '')).filter(Boolean) : [];
    return { cid, c, m, u, pay, ch, sub, d, reasons, ini: c.ini, plan: pay.name || '', short: pay.short || '', code: CODE[c.payer] || 'PAY', ref: m.ref || '', req: u.requested, period: u.period || '', units: (u.service && u.service.units) || 'units', kind: m.kind === 'continued' ? 'concurrent SRA' : 'initial SRA', status: A() ? A().status(cid) : '' };
  }
  V.facts = facts;
  /* a fictional call reference: plan code · date · case digits (· n for later calls the same day) */
  const refFor = (f, ts, n) => f.code + '-' + ts.slice(5, 7) + ts.slice(8, 10) + '-' + f.cid.slice(-3) + (n > 1 ? '-' + n : '');
  const stop = (x) => (/[.?!][”"]?$/.test(x) ? x : x + '.'); // end a sentence once
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---------------- the script ----------------
     sit = what the payer has on file at the time of the call:
       received (in review, no decision) · info (more information asked) · denied · partial · offer (fewer units offered by phone) ·
       p2p (a peer-to-peer on file) · none (no request on file under that reference) · approved (current authorization in force) */
  V.situation = (cid) => {
    const s = A() ? A().status(cid) : ''; const m = A() ? A().meta(cid) : {}; const d = m.decision || {};
    if (s === 'info') return 'info';
    if (s === 'denied') return 'denied';
    if (s === 'partial') return d.type === 'reduction' ? 'offer' : (cid === 'R-0388' ? 'p2p' : 'partial');
    if (s === 'submitted' || s === 'pending') return 'received';
    if (s === 'recon' || s === 'appeal') return 'review2';
    if (s === 'approved') return 'approved';
    return 'none';
  };
  function script(o) {
    const f = facts(o.case); const P = V.PURPOSES[o.purpose] || V.PURPOSES['sra-status']; const sit = o.sit || V.situation(o.case);
    const T = []; let t = 0; const say = (who, text, dt) => { T.push({ at: mmss(t), who, text }); t += dt != null ? dt : Math.max(6, Math.round(text.length / 14)); };
    const sentWhen = String(o.sent || (f.sub && f.sub.date) || '').replace(/ · .*$/, '').replace(/, \d{4}$/, '');
    const via = (f.sub && f.sub.method) || f.ch.label || f.ch.method || '';
    const reasonQ = f.reasons.length ? f.reasons.map((x) => '“' + x + '”').join(' and ') : '';
    const hold = o.hold || 12; const ref = o.ref;
    /* dialing, phone menu, hold */
    say('sys', 'Dialing ' + f.plan + ' · provider services line (number on file)', 18);
    say('ivr', 'Thank you for calling ' + f.plan + '. Please listen closely to the following options.', 22);
    say('agent', 'Selected: Provider. Then: Authorizations / utilization management.', 30);
    say('ivr', 'All representatives are assisting other callers. Please stay on the line.', 4);
    say('hold', 'On hold · ' + hold + ' min. The voice agent waited; no staff time used.', hold * 60);
    /* greeting and verification */
    say('rep', 'Thank you for holding. Provider services, how can I help you?');
    say('agent', 'Hello. I am an automated assistant calling on behalf of Harvest Outreach Center about a service authorization request (SRA). This call may be recorded. Is it all right to continue?');
    say('rep', 'Yes, go ahead. I’ll need the member’s information.');
    if (o.verifier) {
      say('agent', 'One moment. A member of Harvest staff will verify the member.', 6);
      say('sys', 'The ' + o.verifier + ' joined and verified the member · identifiers not shown in the demo.', 50);
      say('sys', 'The ' + o.verifier + ' left the call; the voice agent continues.', 4);
    } else {
      say('agent', 'Reading the member ID and date of birth from the request on file.', 8);
      say('sys', 'Member identifiers read from the request on file · not shown in the demo.', 10);
    }
    say('rep', 'Thank you. I have the member, ' + f.ini + ' What do you need?');
    if (o.prev) say('agent', 'This follows up on an earlier call, reference ' + o.prev + '.');
    const sum = []; let outcome = ''; let next = '';
    const askRef = () => { say('agent', 'May I have a reference number for this call?'); say('rep', 'Yes. The reference number is ' + ref + '.'); say('agent', 'Thank you. I have ' + ref + '.', 5); };
    const pOk = ['denial-followup', 'p2p'].indexOf(o.purpose) >= 0;
    if (o.purpose === 'sra-status' || o.purpose === 'reference') {
      say('agent', 'I am checking the status of the ' + f.kind + ' for ' + f.req + ' ' + f.units + (f.period ? ', ' + f.period : '') + (sentWhen ? ', sent ' + String(sentWhen).replace(/ · .*$/, '') + (via ? ' by ' + via : '') : '') + '.');
      if (sit === 'received') {
        say('rep', 'I see it. It was received' + (sentWhen ? ' on ' + String(sentWhen).replace(/ · .*$/, '') : '') + ' and it is in clinical review. There is no decision on it yet.');
        say('agent', 'Is anything missing from the request?');
        say('rep', 'Nothing is flagged as missing on my screen.');
        outcome = 'Received · in clinical review · no decision yet';
        sum.push('Asked ' + f.short + ' for the status of the ' + f.kind + ' (' + f.req + ' ' + f.units + ').', f.short + ' confirmed receipt' + (sentWhen ? ' (sent ' + String(sentWhen).replace(/ · .*$/, '') + ')' : '') + '; it is in clinical review with no decision yet.', 'Nothing flagged as missing.');
        next = 'Psyflo keeps checking; the decision is recorded here when it arrives.';
      } else if (sit === 'info') {
        say('rep', 'It is pended. A request for more information went out ' + (f.d && f.d.date ? 'on ' + f.d.date : 'earlier') + ' through ' + (f.d && f.d.via ? f.d.via.replace(/ message$/, '') : 'the portal') + '. The reviewer is waiting for that reply.');
        say('agent', 'Is the time to reply the one stated in the message?');
        say('rep', 'Yes, please go by the time in the message.');
        outcome = 'Pended · waiting for Harvest’s reply to the request for information';
        sum.push('Asked ' + f.short + ' for the status of the ' + f.kind + '.', f.short + ' said it is pended until the reply to the ' + (f.d ? f.d.date : '') + ' request for information.', 'Reply time: as stated in ' + f.short + '’s message' + (f.d && f.d.due ? ' (' + f.d.due + ')' : '') + '.');
        next = 'Send the drafted reply (Denial Intelligence).';
      } else if (sit === 'none') {
        say('rep', 'I don’t see a new request on file for that period.');
        outcome = 'No new request on file';
        sum.push('Asked ' + f.short + ' whether a new request is on file.', f.short + ' has no new request on file for that period.');
        next = 'Submit the SRA when it is signed in Lauris.';
      } else if (sit === 'approved') {
        const cur = f.u.current;
        say('rep', 'I see an approved authorization' + (cur ? ' through ' + cur.end : '') + '. I don’t see a new request after it yet.');
        outcome = 'Current authorization on file · no new request yet';
        sum.push('Asked ' + f.short + ' about the authorization on file.', f.short + ' confirmed the current authorization' + (cur ? ' (' + cur.start + ' – ' + cur.end + ')' : '') + ' and no new request after it.');
        next = 'Prepare the concurrent SRA before ' + (cur ? cur.end : 'the end date') + '.';
      } else {
        const what = sit === 'denied' ? 'denied' : sit === 'offer' ? 'offered ' + (f.d ? f.d.approved : '') + ' of ' + f.req + ' ' + f.units : 'partially approved, ' + (f.d ? f.d.approved : '') + ' of ' + f.req + ' ' + f.units;
        say('rep', 'A decision is on file' + (f.d && f.d.date ? ', dated ' + f.d.date : '') + ': ' + what + '.');
        outcome = 'Decision on file: ' + what;
        sum.push('Asked ' + f.short + ' for the status of the ' + f.kind + '.', f.short + ' confirmed the decision on file' + (f.d ? ' (' + f.d.date + ')' : '') + ': ' + what + '.');
        next = 'Review the decision in Denial Intelligence.';
      }
      askRef();
      sum.push('Reference number ' + ref + ' (Simulated).');
    } else {
      /* denial follow-up and peer-to-peer requests */
      const dl = f.d || {}; const p2pOnly = o.purpose === 'p2p';
      const what = sit === 'denied' ? 'the denial' : sit === 'info' ? 'the request for more information' : sit === 'offer' ? 'the offer of ' + dl.approved + ' ' + f.units : 'the partial approval';
      const dated = dl.date ? ' dated ' + String(dl.date).replace(/,.*$/, '') : '';
      if (p2pOnly) say('agent', 'I am calling about a peer-to-peer review for ' + what + dated + ' on the ' + f.kind + '.');
      else say('agent', 'I am following up on ' + what + dated + ' for the ' + f.kind + '. I have three questions: the reference number for the decision, what the reviewer needs, and whether a peer-to-peer review can be scheduled.');
      const askP2p = () => {
        if (sit === 'p2p') {
          say('agent', 'Is the peer-to-peer on ' + (dl.due || 'file') + ' still the first available, or has an earlier slot opened?');
          say('rep', 'The peer-to-peer on file is ' + (dl.due || '') + '. I don’t see an earlier slot today.');
        } else {
          say('agent', 'Can a peer-to-peer review be scheduled?');
          say('rep', 'I can’t schedule that from this line. I’ve noted on the case that you asked for one.');
        }
      };
      if (sit === 'denied' || sit === 'partial' || sit === 'p2p' || sit === 'offer') {
        if (!p2pOnly || sit !== 'p2p') {
          say('rep', 'I see it. ' + (sit === 'denied' ? 'The request was denied.' : sit === 'offer' ? 'The reviewer offered ' + dl.approved + ' of the ' + f.req + ' units.' : dl.approved + ' of the ' + f.req + ' units were approved.') + (reasonQ ? ' The reviewer’s note says ' + stop(reasonQ) : ''));
          if (!p2pOnly) { say('agent', 'Does the note say what documentation would change the decision?'); say('rep', 'No. The note doesn’t list specific documents.'); }
        } else say('rep', 'I see the partial approval and the peer-to-peer on file.');
        if (sit === 'denied' && !p2pOnly) { say('agent', 'Can you confirm the appeal deadline?'); say('rep', 'Please use the date in the letter.'); }
        if (sit === 'offer' && dl.due) { say('agent', 'Is the reply date still the one given on the ' + String(dl.date).replace(/,.*$/, '') + ' call?'); say('rep', 'Yes, please go by the date you were given.'); }
        askP2p();
      } else if (sit === 'info') {
        say('rep', 'I see the request for more information sent ' + (dl.date ? dl.date : 'earlier') + '. The reviewer is waiting for the three items in that message.');
        say('agent', 'Does the reviewer need anything beyond those items?');
        say('rep', 'No, just what’s in the message. Please reply by the time in the message.');
      } else {
        say('rep', 'I don’t see an adverse decision on file for that request.');
      }
      askRef();
      outcome = sit === 'p2p' ? 'Peer-to-peer on file confirmed (' + (dl.due || '') + ') · no earlier slot' : sit === 'info' ? 'Reviewer needs only the three items in the message' : sit === 'denied' || sit === 'partial' || sit === 'offer' ? 'Reason confirmed as ' + (sit === 'offer' ? 'on the call log' : 'in the letter') + ' · peer-to-peer request noted' : 'No adverse decision on file';
      sum.push(p2pOnly ? 'Asked ' + f.short + ' about the peer-to-peer review for ' + what + '.' : 'Asked ' + f.short + ' for the decision’s reference number, what the reviewer needs, and whether a peer-to-peer can be scheduled.');
      if (sit === 'info') sum.push(f.short + ': the reviewer needs only the three items in the ' + (dl.date || '') + ' message; reply by the time in the message' + (dl.due ? ' (' + dl.due + ')' : '') + '.');
      else if (reasonQ && !p2pOnly) sum.push(f.short + ' read the reviewer’s note: ' + stop(reasonQ) + ' No specific documents are listed.');
      if (sit === 'denied' && !p2pOnly) sum.push('Appeal deadline: the date in the letter' + (dl.due ? ' (' + dl.due + ' in Psyflo)' : '') + '.');
      if (sit === 'offer' && dl.due) sum.push('Reply by ' + dl.due + ' (date given on the ' + String(dl.date).replace(/,.*$/, '') + ' call).');
      if (sit === 'p2p') sum.push('Peer-to-peer on file: ' + (dl.due || '') + '; no earlier slot showing.');
      else if (sit !== 'info') sum.push('Peer-to-peer: not scheduled from this line; the request is noted on the case. ' + ((PSY.rules && PSY.rules.VERIFY) || 'Payer requirement verification needed') + '.');
      sum.push('Reference number ' + ref + ' (Simulated).');
      next = sit === 'info' ? 'Send the drafted reply before the time in the message.' : sit === 'p2p' ? 'Hold the peer-to-peer on ' + (dl.due || 'the date on file') + ' with the call notes.' : sit === 'denied' ? 'Finish the appeal letter for the guardian.' : 'Decide how to respond in Denial Intelligence.';
    }
    say('agent', 'That’s everything. Thank you for your help.', 4);
    say('rep', 'You’re welcome. Have a good day.', 4);
    say('sys', 'Call ended · summary written to History.', 0);
    sum.push('Next step: ' + next);
    return { transcript: T, summary: sum.slice(0, 6), outcome, next, durationSec: t, holdMin: hold, ask: P.ask };
  }
  V.script = script;

  /* ---------------- calls ---------------- */
  /* seed calls (backdated), each placed where the case's own records put a call or a check: id → { case, purpose, scope, ts, sit, hold, sent, verifier } */
  V.SEED = V.SEED || {};
  const SEEDS = [
    ['VC-0384-S', 'R-0384', 'sra-status', 'auth', 'Oct 19 · 10:20 am', 'received', 11, { sent: 'Oct 12' }],
    ['VC-0384-F', 'R-0384', 'denial-followup', 'denial', 'Oct 23 · 9:35 am', 'denied', 17, {}],
    ['VC-0408-S', 'R-0408', 'sra-status', 'auth', 'Oct 27 · 11:05 am', 'received', 9, { sent: 'Oct 21' }],
    ['VC-0408-F', 'R-0408', 'denial-followup', 'denial', 'Oct 29 · 8:15 am', 'info', 7, {}],
    ['VC-0402-S', 'R-0402', 'sra-status', 'auth', 'Oct 22 · 1:40 pm', 'received', 16, { sent: 'Oct 13' }],
    ['VC-0402-F', 'R-0402', 'denial-followup', 'denial', 'Oct 28 · 10:10 am', 'offer', 23, {}],
    ['VC-0399-S', 'R-0399', 'sra-status', 'auth', 'Oct 29 · 10:12 am', 'received', 14, { sent: 'Oct 19', verifier: 'site supervisor' }],
    ['VC-0391-S', 'R-0391', 'sra-status', 'auth', 'Oct 27 · 2:25 pm', 'received', 13, { sent: 'Oct 22' }],
    ['VC-0388-S', 'R-0388', 'sra-status', 'auth', 'Oct 9 · 11:30 am', 'received', 21, { sent: 'Sep 29' }],
    ['VC-0388-F', 'R-0388', 'p2p', 'denial', 'Oct 28 · 9:05 am', 'p2p', 34, {}],
  ];
  SEEDS.forEach(([id, cid, purpose, scope, when, sit, hold, x]) => {
    const ts = H.toTs(when);
    V.SEED[id] = Object.assign({ id, case: cid, purpose, scope, ts, sit, hold, seed: true, get ref() { return refFor(facts(cid), ts, 1); } }, x);
  });
  function build(def) {
    const s = script(def); const f = facts(def.case);
    return Object.assign({ status: 'done', plan: f.plan, payer: f.c.payer, ini: f.ini, sim: true }, def, s);
  }
  V.get = (id) => { const c = st().calls[id]; if (c) return c; const d = V.SEED[id]; return d ? build(d) : null; };
  V.list = (cid) => Object.values(st().calls).filter((c) => !cid || c.case === cid).concat(Object.values(V.SEED).filter((d) => !cid || d.case === cid).map(build));
  V.active = (cid) => Object.values(st().calls).find((c) => c.case === cid && c.status !== 'done') || null;

  API.route('POST', '/voice-calls', (q) => {
    const b = q.body || {}; const cid = b.case;
    if (!cid || !PSY.caseById(cid)) throw API.error(400, 'case is required');
    if (!V.PURPOSES[b.purpose]) throw API.error(400, 'purpose must be one of ' + Object.keys(V.PURPOSES).join(', '));
    const c = PSY.caseView(cid); if (!CODE[c.payer]) throw API.error(400, 'No Virginia Medicaid MCO on this case');
    if (V.active(cid)) throw API.error(409, 'A call for ' + c.ini + ' is already in progress');
    const S = st(); S.n = (S.n || 0) + 1;
    const ts = H.nowTs(); const f = facts(cid);
    const sameDay = V.list(cid).filter((x) => x.ts && x.ts.slice(0, 10) === ts.slice(0, 10)).length + 1;
    const hold = 6 + ((+cid.slice(-3) + S.n * 7) % 17);
    const prev = V.list(cid).filter((x) => x.status === 'done').sort((a2, b2) => (a2.ts < b2.ts ? 1 : -1))[0];
    const def = { id: 'VC-' + cid.slice(2) + '-' + S.n, case: cid, purpose: b.purpose, scope: b.scope === 'denial' ? 'denial' : 'auth', ts, sit: V.situation(cid), hold, ref: refFor(f, ts, sameDay), prev: prev ? prev.ref : '', live: true, by: (PSY.user && PSY.user().name) || PSY.r5.ME };
    const call = Object.assign(build(def), { status: 'dialing' });
    S.calls[call.id] = call; PSY.save();
    q.note(call.id + ' · ' + f.short + ' · ' + V.PURPOSES[b.purpose].label);
    return call;
  }, { desc: 'Start a voice agent call to the payer (simulated)', owner: 'HIST13' });
  API.route('GET', '/voice-calls', (q) => V.list(q.query.case || '').map((c) => ({ id: c.id, case: c.case, purpose: c.purpose, ts: c.ts, status: c.status, outcome: c.outcome, ref: c.ref })),
    { desc: 'Voice agent calls (?case=)', owner: 'HIST13', summary: (d) => d.length + ' calls' });
  API.route('GET', '/voice-calls/:id', (q) => { const c = V.get(q.params.id); if (!c) throw API.error(404, 'No call ' + q.params.id); return c; },
    { desc: 'One call: summary, transcript, reference number', owner: 'HIST13', summary: (d) => d.id + ' · ' + d.status + (d.ref ? ' · ref ' + d.ref : '') });
  API.route('PATCH', '/voice-calls/:id', (q) => {
    const c = st().calls[q.params.id]; if (!c) throw API.error(404, 'No live call ' + q.params.id);
    const s = (q.body || {}).status; const OKS = ['dialing', 'menu', 'hold', 'rep', 'done'];
    if (OKS.indexOf(s) < 0) throw API.error(400, 'status must be one of ' + OKS.join(', '));
    if (c.status === 'done') { if (s === 'done') return c; throw API.error(409, 'The call has ended'); }
    c.status = s; if (s === 'done') c.endedAt = PSY.now(); PSY.save();
    q.note(c.id + ' → ' + s);
    return c;
  }, { desc: 'Advance a live call (dialing → menu → hold → rep → done)', owner: 'HIST13' });

  /* ---------------- start a call ---------------- */
  const toast = (m, o) => PSY.ui.toast(m, o);
  V.start = (cid, o) => {
    o = o || {}; const purpose = o.purpose || 'sra-status';
    const run = V.active(cid); if (run) { V.open(run.id); return Promise.resolve(run); }
    return API.post('/voice-calls', { case: cid, purpose, scope: o.scope || (purpose === 'denial-followup' || purpose === 'p2p' ? 'denial' : 'auth') }).then((call) => {
      drive(call.id); V.open(call.id); refreshButtons(cid); return call;
    }).catch((e) => { toast((e && e.message) || 'Call could not start', { err: true }); throw e; });
  };
  const STAGE = ['dialing', 'menu', 'hold', 'rep', 'done'];
  /* the live call: dialing (set by the POST) → menu → hold → rep → done, one PATCH per step, each after the previous one answered */
  function drive(id) {
    const R = (RUN[id] = { t: [] }); const ms = Math.max(30, +V.stepMs || 2300);
    const plan = [['menu', ms], ['hold', ms], ['rep', ms], ['done', ms * 1.6]];
    const step = (i) => {
      if (i >= plan.length) return;
      R.t.push(setTimeout(() => {
        if (!RUN[id]) return;
        API.patch('/voice-calls/' + id, { status: plan[i][0] }).then((c) => {
          if (!RUN[id]) return; paintLive(id);
          if (plan[i][0] === 'rep') stream(id, ms * 1.6);
          if (plan[i][0] === 'done') finish(c); else step(i + 1);
        }).catch((e) => { console.error('voice', e); delete RUN[id]; });
      }, plan[i][1]));
    };
    step(0);
  }
  function stream(id, total) {
    const c = V.get(id); const R = RUN[id]; if (!c || !R) return;
    const h = c.transcript.findIndex((l) => l.who === 'hold'); const from = h + 1; const to = c.transcript.length - 1; const n = Math.max(1, to - from);
    R.shown = from + 1;
    const tick = () => { if (!RUN[id] || R.shown >= to) return; R.shown++; paintLines(id); R.t.push(setTimeout(tick, total / n)); };
    R.t.push(setTimeout(tick, total / n));
  }
  function finish(c) {
    delete RUN[c.id];
    const P = V.PURPOSES[c.purpose] || {}; const f = facts(c.case);
    const evId = 'ev-' + c.id;
    try {
      H.addNow({ id: evId, case: c.case, scope: c.scope, ts: c.ts, actor: { kind: 'voice' }, action: P.label + ' · ' + f.short, detail: c.outcome, ref: c.ref, sim: true, pop: { kind: 'call', id: c.id } });
    } catch (e) { console.error('voice history', e); }
    PSY.audit.add({ case: c.case, action: 'Voice agent ' + P.short + ' to ' + f.plan + ': ' + c.outcome, by: 'Psyflo voice agent', doc: 'Call ref ' + c.ref + ' (simulated)', status: A() ? A().status(c.case) : '', hist: evId });
    PSY.save();
    toast('Call complete · reference recorded.');
    const m = document.getElementById('modal');
    if (m && m.querySelector('[data-vc="' + c.id + '"]')) V.open(c.id);
    refreshButtons(c.case);
  }

  /* ---------------- the pop-up ---------------- */
  const SIM = () => (PSY.ev ? PSY.ev.label('illustrative', 'Simulated') : '<b>Simulated</b>');
  const WHO = { agent: 'Voice agent', rep: 'Representative', ivr: 'Phone menu', hold: 'Hold', sys: 'Call' };
  const durLabel = (s) => { const m = Math.round(s / 60); return m < 1 ? '< 1 min' : m + ' min'; };
  function header(c, liveNow) {
    const P = V.PURPOSES[c.purpose] || {};
    const cells = [['Payer', esc(c.plan)], ['Purpose', esc(P.label || c.purpose)], ['Date and time', esc(H.when(c.ts))],
      ['Duration', liveNow ? '<span class="vc-mut">In progress</span>' : esc(durLabel(c.durationSec)) + ' <span class="vc-mut">(' + c.holdMin + ' min on hold)</span>'],
      ['Outcome', liveNow ? '<span class="vc-mut">—</span>' : esc(c.outcome)], ['Reference number', liveNow ? '<span class="vc-mut">Asked at the end of the call</span>' : '<b data-psy="vc-ref">' + esc(c.ref) + '</b> ' + SIM()]];
    return '<dl class="vc-g">' + cells.map((x) => '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>').join('') + '</dl>';
  }
  function lines(T, n) {
    return '<ol class="vc-tr" data-psy="vc-transcript">' + T.slice(0, n == null ? T.length : n).map((l) => '<li class="w-' + l.who + '"><time>' + esc(l.at) + '</time><b>' + esc(WHO[l.who] || l.who) + '</b><span>' + esc(l.text) + '</span></li>').join('') + '</ol>';
  }
  function stepper(i) {
    return '<ol class="vc-st" data-psy="vc-steps">' + V.STEPS.map((s, k) => '<li class="' + (k < i ? 'done' : k === i ? 'on' : '') + '"><i aria-hidden="true">' + (k < i ? '✓' : k + 1) + '</i><span>' + esc(s) + '</span></li>').join('') + '</ol>';
  }
  /* how far the transcript has got at each stage (dialing · menu · hold · rep) */
  const cut = (c, i) => { const T = c.transcript; const h = T.findIndex((l) => l.who === 'hold'); const R = RUN[c.id]; return i <= 0 ? 1 : i === 1 ? Math.max(1, h - 1) : i === 2 ? h + 1 : Math.min(T.length - 1, (R && R.shown) || h + 2); };
  function liveBody(c) {
    const i = Math.max(0, STAGE.indexOf(c.status)); const left = Math.max(1, Math.round(((STAGE.length - 1 - i + (i <= 3 ? 0.6 : 0)) * (+V.stepMs || 2300)) / 1000));
    return '<div class="vc" data-vc="' + esc(c.id) + '" data-live="1">' +
      '<div class="vc-chips">' + SIM() + '<span class="vc-fast">Sped up for the demo</span><span class="vc-mut">' + esc(V.PURPOSES[c.purpose].ask) + '</span></div>' +
      stepper(i) + '<div class="vc-eta" data-psy="vc-eta"><span class="vc-dot" aria-hidden="true"></span>' + esc(V.STEPS[i]) + '… <span class="vc-mut">about ' + left + ' s left · a real call like this takes about ' + Math.round(c.durationSec / 60) + ' min</span></div>' +
      '<div class="vc-line">' + esc(c.plan) + ' · ' + esc(V.PURPOSES[c.purpose].label) + ' · ' + esc(H.when(c.ts)) + '</div>' +
      '<div class="vc-cap">Live transcript</div><div class="vc-box live">' + lines(c.transcript, cut(c, i)) + '</div></div>';
  }
  function resultBody(c, tab) {
    tab = tab || 'sum';
    return '<div class="vc" data-vc="' + esc(c.id) + '" data-tab="' + tab + '">' +
      '<div class="vc-chips">' + SIM() + (c.live ? '<span class="vc-fast">Sped up for the demo</span>' : '') + '<span class="vc-mut">Automated assistant calling on behalf of Harvest</span></div>' +
      header(c, false) +
      '<div class="vc-tabs" role="tablist"><button type="button" role="tab" class="' + (tab === 'sum' ? 'on' : '') + '" aria-selected="' + (tab === 'sum') + '" data-act="vc-tab" data-tab="sum" data-id="' + esc(c.id) + '">Summary</button>' +
      '<button type="button" role="tab" class="' + (tab === 'tr' ? 'on' : '') + '" aria-selected="' + (tab === 'tr') + '" data-act="vc-tab" data-tab="tr" data-id="' + esc(c.id) + '">Transcript <span>' + c.transcript.length + '</span></button></div>' +
      (tab === 'sum' ? '<ul class="vc-sum" data-psy="vc-summary">' + c.summary.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<div class="vc-box">' + lines(c.transcript) + '</div>') + '</div>';
  }
  const summaryText = (c) => [V.PURPOSES[c.purpose].label + ' · ' + c.plan + ' · ' + H.when(c.ts), 'Reference number: ' + c.ref + ' (simulated)', 'Outcome: ' + c.outcome].concat(c.summary.map((x) => '- ' + x)).join('\n');
  V.open = (id, o) => {
    const c = V.get(id); if (!c) return;
    if (c.status !== 'done' && !RUN[id] && c.live) { st().calls[id].status = 'done'; PSY.save(); finish(st().calls[id]); return; } // a call interrupted by a reload ends at once
    const f = facts(c.case); const P = V.PURPOSES[c.purpose] || {};
    const liveNow = c.status !== 'done';
    PSY.ui.modal({ wide: true, title: (liveNow ? 'Voice agent calling ' : P.label + ' · ') + (liveNow ? f.short : f.ini), sub: (liveNow ? f.ini + ' · ' : '') + c.plan + (f.ref ? ' · ' + f.ref : ''),
      body: liveNow ? liveBody(c) : resultBody(c, (o && o.tab) || 'sum'),
      actions: liveNow ? [{ label: 'Keep running in background' }] : [
        { label: 'Copy summary', onClick: () => { try { navigator.clipboard.writeText(summaryText(c)).then(() => toast('Summary copied.'), () => toast('Copy not available.', { err: true })); } catch (e) { toast('Copy not available.', { err: true }); } return false; } },
        { label: 'Add note to History', onClick: () => { setTimeout(() => noteEditor(c), 0); } },
        { label: 'Close', primary: true }] });
  };
  function noteEditor(c) {
    const f = facts(c.case);
    PSY.ui.modal({ title: 'Add note to History', sub: f.ini + ' · ' + c.plan + ' · call ref ' + c.ref,
      body: '<label for="vc-note">Note</label><textarea id="vc-note" data-psy="vc-note" rows="6">' + esc(c.summary.join('\n')) + '</textarea>',
      actions: [{ label: 'Cancel' }, { label: 'Add note', primary: true, onClick: (m) => {
        const t = (m.querySelector('#vc-note') || {}).value || ''; if (!t.trim()) { toast('Write a note first.', { err: true }); return false; }
        const me = (PSY.user && PSY.user().name) || PSY.r5.ME;
        H.add({ case: c.case, scope: c.scope, actor: { kind: 'staff', name: me }, action: 'Note added from the voice agent call', detail: t.split('\n')[0].slice(0, 140), ref: c.ref, sim: false,
          pop: { kind: 'note', id: 'note-' + c.id, title: 'Note from the call', facts: [['Call', V.PURPOSES[c.purpose].label + ' · ' + H.when(c.ts)], ['Call reference', c.ref + ' (Simulated)']], items: t.split('\n').filter((x) => x.trim()) } })
          .then(() => toast('Note added to History.')).catch((e) => toast(e.message || 'Not saved', { err: true }));
      } }] });
  }
  function paintLines(id) {
    const m = document.getElementById('modal'); const box = m && m.querySelector('[data-vc="' + id + '"][data-live] .vc-box'); const c = V.get(id); if (!box || !c) return;
    box.innerHTML = lines(c.transcript, cut(c, STAGE.indexOf(c.status))); box.scrollTop = box.scrollHeight;
  }
  function paintLive(id) {
    const m = document.getElementById('modal'); const box = m && m.querySelector('[data-vc="' + id + '"][data-live]'); const c = V.get(id); if (!box || !c) return;
    if (c.status === 'done') return;
    box.outerHTML = liveBody(c);
    const tr = m.querySelector('[data-vc="' + id + '"] .vc-box'); if (tr) tr.scrollTop = tr.scrollHeight;
    const h3 = m.querySelector('h3'); if (h3) h3.textContent = 'Voice agent calling ' + facts(c.case).short;
  }
  PSY.acts['vc-tab'] = (el) => {
    const id = el.getAttribute('data-id'); const c = V.get(id); const m = document.getElementById('modal'); const box = m && m.querySelector('[data-vc="' + id + '"]'); if (!c || !box) return;
    box.outerHTML = resultBody(c, el.getAttribute('data-tab'));
  };
  PSY.acts['vc-start'] = (el) => { V.start(el.getAttribute('data-case'), { purpose: el.getAttribute('data-purpose') || 'sra-status', scope: el.getAttribute('data-scope') || '' }).catch(() => {}); };
  PSY.acts['vc-open'] = (el) => V.open(el.getAttribute('data-id'));

  /* ---------------- the button ---------------- */
  const PHONE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2 4 1.6V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
  V.button = (cid, o) => {
    o = o || {}; const purpose = o.purpose || 'sra-status'; const run = V.active(cid);
    const cls = 'btn ' + (o.primary ? 'p' : 'o') + (o.small ? ' s' : '') + ' vc13-btn';
    return '<button type="button" class="' + cls + '" data-act="vc-start" data-case="' + esc(cid) + '" data-purpose="' + esc(purpose) + '" data-scope="' + esc(o.scope || '') + '" data-psy="voice-btn" data-vc-case="' + esc(cid) + '"' +
      ' title="Psyflo’s voice agent calls ' + esc((PSY.data.payers[(PSY.caseView(cid) || {}).payer] || {}).name || 'the payer') + ' (simulated)">' + PHONE + '<span>' + esc(run ? 'Call in progress…' : (o.label || 'Call payer · voice agent')) + '</span></button>';
  };
  function refreshButtons(cid) {
    const r = PSY.activeRoot && PSY.activeRoot(); if (!r) return;
    r.querySelectorAll('[data-psy="voice-btn"][data-vc-case="' + cid + '"]').forEach((b) => { const s = b.querySelector('span'); if (s) s.textContent = V.active(cid) ? 'Call in progress…' : (b.getAttribute('data-label') || 'Call payer · voice agent'); });
  }

  /* ---------------- styles ---------------- */
  const BTN = '.vc13-btn svg{width:16px;height:16px;flex:0 0 16px}';
  PSY.css.platform = (PSY.css.platform || '') + BTN;
  PSY.css.lauris = (PSY.css.lauris || '') + BTN;
  const CSS = `
#modal .vc{display:flex;flex-direction:column;gap:12px}
#modal .vc-chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px}
#modal .vc-fast{display:inline-flex;align-items:center;border:1px dashed #B8B2A7;color:#6B665E;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:600}
#modal .vc-mut{color:#6B665E}
#modal .vc-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 16px;margin:0;background:#FAF6F1;border:1px solid #EFE8DE;border-radius:12px;padding:12px 14px}
#modal .vc-g dt{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#6B665E;font-weight:700;margin-bottom:2px}
#modal .vc-g dd{margin:0;font-size:13px;line-height:1.4;color:#1B1B19}
#modal .vc-g dd b{font:700 13.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em}
#modal .vc-st{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
#modal .vc-st li{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:#6B665E;line-height:1.3;border-top:3px solid #E5DCD0;padding-top:7px}
#modal .vc-st li i{font-style:normal;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#EFE8DE;color:#4A453D;font-size:11px;font-weight:700}
#modal .vc-st li.done{border-top-color:#2F6F5E;color:#1B1B19}#modal .vc-st li.done i{background:#2F6F5E;color:#fff}
#modal .vc-st li.on{border-top-color:#4E3584;color:#1B1B19;font-weight:600}#modal .vc-st li.on i{background:#4E3584;color:#fff}
#modal .vc-eta{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600}
#modal .vc-dot{width:9px;height:9px;border-radius:50%;background:#4E3584;box-shadow:0 0 0 0 rgba(78,53,132,.5);animation:vc13p 1.4s infinite}
@keyframes vc13p{0%{box-shadow:0 0 0 0 rgba(78,53,132,.45)}70%{box-shadow:0 0 0 8px rgba(78,53,132,0)}100%{box-shadow:0 0 0 0 rgba(78,53,132,0)}}
#modal .vc-line{font-size:13px;color:#4A453D;background:#FAF6F1;border:1px solid #EFE8DE;border-radius:10px;padding:8px 12px}
#modal .vc-box.live{max-height:30vh}
#modal .vc-cap{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#6B665E;font-weight:700;margin-bottom:-6px}
#modal .vc-box{border:1px solid #EFE8DE;border-radius:12px;max-height:40vh;overflow:auto;background:#fff}
#modal .vc-tr{list-style:none;margin:0;padding:6px 0}
#modal .vc-tr li{display:grid;grid-template-columns:42px 112px minmax(0,1fr);gap:10px;padding:6px 14px;font-size:13px;line-height:1.5}
#modal .vc-tr time{color:#9A9388;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;padding-top:2px}
#modal .vc-tr b{font-size:12px;font-weight:700;padding-top:1px}
#modal .vc-tr .w-agent b{color:#4E3584}#modal .vc-tr .w-rep b{color:#8A2E1C}
#modal .vc-tr .w-ivr,#modal .vc-tr .w-hold,#modal .vc-tr .w-sys{color:#6B665E;font-size:12.5px}
#modal .vc-tr .w-ivr b,#modal .vc-tr .w-hold b,#modal .vc-tr .w-sys b{color:#6B665E;font-weight:600}
#modal .vc-tr .w-hold span,#modal .vc-tr .w-sys span{font-style:italic}
#modal .vc-tr .w-agent{background:#FBF9FE}
#modal .vc-tabs{display:flex;gap:22px;border-bottom:1px solid #E5DCD0}
#modal .vc-tabs button{background:none;border:0;padding:8px 0;margin-bottom:-1px;border-bottom:2px solid transparent;font:inherit;font-size:14px;color:#6B665E;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
#modal .vc-tabs button.on{color:#1D4F43;border-bottom-color:#1D4F43;font-weight:600}
#modal .vc-tabs button span{background:#EFE8DE;color:#4A453D;border-radius:999px;padding:0 7px;font-size:11.5px;font-weight:600}
#modal .vc-sum{margin:0;padding:2px 0 0 18px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.5}
#modal .vc-sum li::marker{color:#4E3584}
`;
  const stEl = document.createElement('style'); stEl.textContent = CSS; document.head.appendChild(stEl);

  /* ---------------- presenter scenario 11: the voice agent follows up on E.C.'s denial ----------------
     Opens E.C.'s denial page and starts the denial follow-up call, so the live call pop-up shows. */
  const PR = (PSY.presenter = PSY.presenter || {}); PR.prep = PR.prep || {};
  PR.prep.s11 = () => {
    clearTimeout(PENDING);
    PENDING = setTimeout(() => { PENDING = null; const cur = PSY.current(); if (cur.id === 'di-case' && cur.params.case === 'R-0384') V.start('R-0384', { purpose: 'denial-followup', scope: 'denial' }).catch(() => {}); }, 450);
    return 'di-case?case=R-0384';
  };
})();
