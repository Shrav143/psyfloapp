// 38 · Peer-to-peer call notes (by ASAM dimension) — assembled from the request in advance; Print; enter the call date the plan
// agreed by phone; optionally record the call (with everyone's consent; request.p2pRecording keeps the transcript);
// Log the outcome (awaiting decision · approved · partial · denied) moves the request, its note pre-filled from the recording.
import { register, Screen, M, raw, esc, modal, toast } from '../app.js';
import { pickReq, details, clientOf, stamp, openFile, rateFor, evHtml, payerFirst, pron, levelOf, iopRunOut, stageLabel, addIopDays, isIopDay } from './Authorizations.js';
const prevIop = d => { let x = String(d).slice(0, 10); while (!isIopDay(x)) x = addDays(x, -1); return x; };
import { addBusinessDays, addDays, fmtDate, fmtDateTime, daysBetween } from '../shared/dates.js';

// Seeded call notes for the demo's own peer-to-peer (R-0388, T.N., Molina, Level 2.1 continued stay denied
// "abstinent, no longer meets medical necessity"). Synthetic. Organised by ASAM dimension.
const NV_BRIEF = {
  'R-0388': {
    open_with: '"This is Jordan Perez, LCADC, clinical director at Community Counseling Center of Southern Nevada; my NPI is on the request. I\'m calling about a 47-year-old woman in Level 2.1 intensive outpatient whose continued stay was denied as \'abstinent, no longer meets medical necessity.\' She is abstinent because she is in IOP. I\'d like to walk you through Dimension 5."',
    criteria: [
      { title: 'D5 · Relapse, continued use or continued problem potential — rated 3.', text: 'Opioid use disorder, severe (F11.20). Abstinent since Sep 14, all of it inside the Level 2.1 structure. Three relapses in the 12 months before admission, each within two weeks of leaving structured care, and an ED visit for overdose on Aug 30. No trial yet of fewer structured days.' },
      { title: 'D4 · Readiness to change — rated 2.', text: 'Engaged and attends 3 of 3 days, but still ambivalent about medication; naltrexone started Oct 15.' },
      { title: 'D6 · Recovery / living environment — rated 3.', text: 'Lives with a partner who uses. Sober-housing placement not available until about Nov 20.' },
      { title: 'Drug screens, dated.', text: 'UDS negative Sep 21, Sep 28, Oct 5, Oct 12 and Oct 19.' }
    ],
    level_of_care: 'Step-down criteria are not met: D5 and D6 are unchanged. Without Level 2.1 she returns to a home where her partner uses, with no structured days. We ask for Level 2.1 through about Nov 20 (36 units of H0015), then a step-down to Level 1 once housing is secured.',
    questions: [
      ['"She\'s been clean five weeks. Why does she still need IOP?"', 'She has been abstinent inside nine hours a week of structure. D5 asks about the risk without it: her last three relapses each came within two weeks of leaving structured care.'],
      ['"What would change your mind about step-down?"', 'Housing secured (about Nov 20) and a trial of fewer structured days without use. Then she steps down to Level 1.'],
      ['"Why not Level 1 plus peer support?"', 'Peer support (J. Reyes, PRSS) is already in the plan. It does not replace three days of group while home is not safe for recovery.'],
      ['"She is on naltrexone now. Is that not enough?"', 'Two weeks in (started Oct 15). Medication works best with the structure around it while home is unsafe; it is not a reason to drop the level of care.']
    ]
  }
};

const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;

register('PeerBrief', class extends Screen {
  init() { this.state = { consent: false, rec: false, text: null, err: '' }; }
  req() { return pickReq(this.s, this.params.id, ['R-0388'], r => ['peer_to_peer_booked', 'peer_to_peer_requested', 'p2p_awaiting'].includes(r.stage)); }
  brief() {
    const s = this.s; const r = this.req(); if (!r) return null;
    const c = clientOf(s, r); const a = c?.authorization; const b = details(s, r.id).brief || NV_BRIEF[r.id] || null;
    const [she, her] = pron(c);
    const rate = rateFor(r, s) || 3; const pf = payerFirst(s, r.payer);
    const awarded = r.units_awarded || r.units_offered || a?.units || 0;
    const days = Math.ceil(awarded / rate);
    const call = r.p2p_at || null;
    const out = a?.exhausted || iopRunOut((a && a.payer === r.payer && a.start) || r.decision?.at || s.today, awarded, rate);
    const outBeforeCall = call && out < call.slice(0, 10);
    const end = (r.dates || '').split(' to ')[1];
    const clin = M.staff(s, c?.clinician || 'jperez');
    const lvl = levelOf(s, r);
    const openWith = b?.open_with || `"This is ${clin.name}${clin.credential ? ', ' + clin.credential : ''}, Community Counseling Center of Southern Nevada; my NPI is on the request. I'm calling about a ${c?.age ? c.age + '-year-old ' : ''}client in ${lvl === '2.1' ? 'Level 2.1 intensive outpatient' : 'Level 1 outpatient'} who was approved for ${awarded} of the ${r.units_requested} units we requested."`;
    // attendance, dated: the IOP days the last authorization covered (3 units a day, Mon · Wed · Fri)
    let attend = null;
    if (lvl === '2.1' && a?.units && (a.used || 0) > 0) {
      const n = Math.round((a.used || a.units) / 3);
      const last = a.exhausted ? prevIop(a.exhausted) : prevIop(s.today);
      const days = []; let d = last; for (let i = 0; i < n; i++) { days.unshift(d); d = addIopDays(d, -1); }
      attend = { title: 'Attendance, dated.', text: `${n} of ${n} authorized IOP days attended, 3 hours each: ${days.map(x => fmtDate(x)).join(', ')}.${c?.abstinent_since ? ' Abstinent since ' + fmtDate(c.abstinent_since) + '.' : ''}` };
    }
    const criteria = [...(b?.criteria || [
      { title: 'ASAM dimensions as submitted.', text: `Read from the signed request${r.signed_name ? ' (' + r.signed_name + ')' : ''}; the call repeats what was sent, dimension by dimension, and adds nothing new.` },
      { title: 'Dated evidence.', text: 'Attendance dates and urine drug screen results from the record, as on the request.' }
    ]), ...(attend ? [attend] : [])];
    const unitsText = lvl === '2.1'
      ? `At 3 units a day, 3 days a week, ${awarded} units is ${days} IOP days (${Math.round(days / 3 * 10) / 10} weeks). ${outBeforeCall ? `They ran out ${fmtDate(out)}. IOP days cannot be backdated, so since then CCC of SN has kept ${her} in group without payment.` : `They last until about ${fmtDate(out)}.`}${r.units_requested > awarded ? ` We are asking for the remaining ${r.units_requested - awarded} units${end ? ' through ' + fmtDate(end) : ''}.` : ''}`
      : `${awarded} weekly Level 1 sessions${end ? ' through ' + fmtDate(end) : ''}.`;
    const questions = b?.questions ? b.questions.map(([q, a2]) => ({ q, a: a2 })) : [
      { q: '"Why does the client still need this level?"', a: 'Answer by dimension from the request: D5 first, then D4 and D6.' },
      { q: '"What would step-down look like?"', a: 'The step-down criteria in the treatment plan and the date of the next ASAM review.' }
    ];
    return { r, c, b, she, her, rate, pf, awarded, days, call, out, outBeforeCall, openWith, criteria, unitsText, questions, lvl,
      criteriaTitle: b ? 'Medical necessity by ASAM dimension, with dates' : 'The ASAM dimensions in the request, with dates',
      levelOfCare: b?.level_of_care || 'As written in the level-of-care section of the submitted request.' };
  }
  renderVals() {
    const s = this.s; const x = this.brief();
    if (!x) return { none: true, has: false, crumb: 'Peer-to-peer', callChip: 'no call booked', unitsChip: 'nothing to count down', unitsCls: 'chip n', denial: '' };
    const { r, pf, call, out } = x;
    const cl = M.clientLabel(s, r.client);
    const dBefore = call ? daysBetween(out, call) : 0;
    const past = out <= s.today;
    // before the call: the audit trail plus the dates the countdown implies
    const items = M.eventsFor(s, r.id).map(e => ({ at: e.at, html: evHtml(s, e) }));
    if (x.outBeforeCall) items.push({ at: out + 'T23:59', html: raw(past ? 'Units ran out. IOP continued, unpaid (no backdating).' : 'Units run out. IOP continues, unpaid, until the call.') });
    if (call && !r.p2p_outcome && call.slice(0, 10) >= s.today) items.push({ at: addBusinessDays(call, -1) + 'T23:58', html: raw('Reminder: this is the one chance. A reschedule is another month.') });
    if (call && !r.p2p_outcome) items.push({ at: call, html: raw(`<b>The call</b> with ${esc(pf)}'s medical director.`) });
    items.sort((a, b) => a.at < b.at ? -1 : 1);
    if (!call) items.push({ at: '~', dt: 'Next', html: raw(`<b>Enter the call date.</b> ${esc(pf)} calls to agree a time; that happens outside Psyflo. Enter it here when it is set.`) });
    const before = items.map((e, i) => ({ dt: e.dt || (e.at.endsWith('T23:59') || e.at.endsWith('T23:58') ? fmtDate(e.at) : stamp(s, e.at)), html: e.html, st: i === 0 ? 'border-top:0' : '' }));
    const o = r.p2p_outcome;
    const OUT = { awaiting: 'call held · awaiting decision', approved: 'approved', partial: 'approved in part', denied: 'denial upheld' };
    return {
      has: true, none: false, crumb: `${r.id} · ${cl}`,
      callChip: call ? `Peer-to-peer · ${pf} · ${fmtDateTime(call, { dow: true })}` : `Peer-to-peer · ${pf} · call date to be set`,
      dateBtn: call ? 'Change the call date' : 'Enter the call date and time',
      dateText: call ? `Agreed with ${pf} by phone: ${fmtDateTime(call, { dow: true })}, with the plan's medical director.` : `Not set yet. ${pf} calls to agree a time; enter it here when they do.`,
      unitsChip: x.outBeforeCall ? `units ${past ? 'ran' : 'run'} out ${fmtDate(out)} — ${dBefore} days before the call` : `units last until about ${fmtDate(out)}`,
      unitsCls: x.outBeforeCall ? 'chip r' : 'chip n',
      title: `Call notes · ${cl} · ${pf} peer-to-peer${call ? ' · ' + fmtDateTime(call) : ''}`, denial: r.denial_reason ? `Denied: "${r.denial_reason}"` : '',
      openWith: x.openWith, criteriaTitle: x.criteriaTitle, criteria: x.criteria, levelOfCare: x.levelOfCare,
      units: x.awarded + (x.lvl === '2.1' ? ' units' : ' sessions'), unitsText: x.unitsText, questions: x.questions, before,
      afterText: o ? `Logged ${stamp(s, o.at)}: ${OUT[o.outcome] || o.outcome}${o.units ? ' · ' + o.units + ' units' : ''}${o.notes ? ' · "' + o.notes + '"' : ''}. The request is now ${String(stageLabel(r.stage)).toLowerCase()}.` : 'Log the outcome right after the call. If the medical director has not decided yet, log "awaiting decision" and come back when it arrives.',
      outcomeBtn: o?.outcome === 'awaiting' ? 'Log the decision' : o ? 'Change the outcome' : 'Log the outcome',
      rec: this.recVals(r)
    };
  }
  get anchors() { return { print: () => this.print(), outcome: () => this.outcome(), schedule: () => this.schedule() }; }
  // the insurer calls and a time is agreed outside the platform; staff enter it here
  schedule() {
    const x = this.brief(); if (!x) return;
    const r = x.r;
    modal(`<h2>${r.p2p_at ? 'Change the call date' : 'Enter the call date'} · ${esc(r.id)}</h2>
      <p style="margin:0 0 10px;color:#525B66">The date and time ${esc(x.pf)} agreed with you by phone.</p>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="p2pd">Date and time of the call</label>
      <input id="p2pd" type="datetime-local" value="${esc((r.p2p_at || '').slice(0, 16))}" style="min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
      <p class="err" style="color:#8A2E1C;font-size:13px;margin:6px 0 0" hidden>Enter a date and time.</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Save the call date</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const when = box.querySelector('#p2pd').value;
        if (!when) { box.querySelector('.err').hidden = false; return; }
        close();
        await this.do('request.p2pSchedule', { id: r.id, when });
        toast(`Call set · ${fmtDateTime(when, { dow: true })} · logged on ${r.id}`);
      });
  }
  print() {
    const s = this.s; const x = this.brief(); if (!x) return;
    const v = this.renderVals();
    const blocks = [
      { text: 'Peer-to-peer call notes · ' + v.crumb, size: 14, bold: true },
      { text: v.callChip + ' · ' + v.unitsChip, size: 10 },
      { text: 'Open with', bold: true, gap: 10 }, { text: x.openWith },
      { text: x.criteriaTitle, bold: true, gap: 10 }, ...x.criteria.map(c => ({ text: c.title + ' ' + c.text })),
      { text: 'Level of care', bold: true, gap: 10 }, { text: x.levelOfCare },
      { text: `What ${x.awarded} ${x.lvl === '2.1' ? 'units' : 'sessions'} means`, bold: true, gap: 10 }, { text: x.unitsText },
      { text: 'Questions they usually ask · short answers', bold: true, gap: 10 }, ...x.questions.map(q => ({ text: q.q + ' — ' + q.a })),
      { text: 'Assembled in advance from the submitted request, the ASAM assessment, the attendance log and the UDS log. Synthetic demo data.', size: 9, gap: 14 }
    ];
    openFile(this, 'file.pdf', { name: `${x.r.id}_peer_to_peer_call_notes.pdf`, title: 'Peer-to-peer call notes', blocks, kind: 'p2p_brief', record: x.r.id });
  }
  recVals(r) {
    const st = this.state; const saved = r.p2p_recording;
    if (st.text == null) st.text = saved?.transcript || '';
    const can = !!SR();
    return {
      consentChecked: st.consent || saved?.consent ? 'checked' : '', setConsent: e => { this.state.consent = e.target.checked; },
      btn: st.rec ? 'Stop recording' : 'Record (microphone)', btnCls: st.rec ? 'p' : 'o',
      status: st.rec ? '● recording' : st.err || (can ? '' : 'speech-to-text needs Chrome; type notes below'), statusCls: st.rec ? 'r' : 'n',
      textLabel: st.rec ? 'Transcript (live)' : 'Transcript, or notes typed during the call',
      text: st.text, setText: e => { this.state.text = e.target.value; },
      saved: saved ? `Saved ${stamp(this.s, saved.at)}${saved.typed ? ' · typed notes' : ' · recorded with consent'}. Used as the note when you log the outcome.` : '',
      toggle: () => this.toggleRec(), save: () => this.saveRec(r)
    };
  }
  toggleRec() {
    if (this.state.rec) { this._sr?.stop(); return; }
    if (!this.state.consent && !this.req()?.p2p_recording?.consent) return toast('Confirm that everyone on the call agreed to be recorded first', 'err');
    const C = SR(); if (!C) return this.setState({ err: 'speech-to-text needs Chrome; type notes below' });
    const sr = new C(); sr.continuous = true; sr.interimResults = true; sr.lang = 'en-US';
    const base = (this.state.text || '').trim(); let finals = '';
    sr.onresult = e => { this._heard = true; let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finals += t + ' '; else interim += t; } this.state.text = [base, finals + interim].filter(Boolean).join(' ').trim(); const ta = document.getElementById('p2ptext'); if (ta) ta.value = this.state.text; };
    sr.onerror = ev => { this.setState({ rec: false, err: ev.error === 'not-allowed' ? 'microphone blocked · type notes below' : 'recording stopped · ' + ev.error }); };
    sr.onend = () => { if (this.state.rec) this.setState({ rec: false }); };
    this._sr = sr; try { sr.start(); this.setState({ rec: true, err: '' }); } catch (e) { this.setState({ err: 'could not start the microphone' }); }
  }
  async saveRec(r) {
    const text = (this.state.text || '').trim();
    if (!text) return toast('Record the call or type notes first', 'err');
    const consent = this.state.consent || !!r.p2p_recording?.consent;
    const typed = !this._heard;
    await this.do('request.p2pRecording', { id: r.id, transcript: text, consent, typed, by: this.me?.id || 'jperez' });
    toast(typed ? 'Call notes saved to ' + r.id : 'Recording saved to ' + r.id + ' · used as the outcome note');
    this.setState({});
  }
  outcome() {
    const x = this.brief(); if (!x) return;
    const r = x.r;
    modal(`<h2>Log the outcome · ${esc(r.id)}</h2>
      <p style="margin:0 0 10px;color:#525B66">What did ${esc(x.pf)}'s medical director decide on the call?</p>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px">
        <label><input type="radio" name="oc" value="awaiting"${r.stage === 'p2p_awaiting' ? '' : ' checked'}> Awaiting decision (the medical director will decide later)</label>
        <label><input type="radio" name="oc" value="approved"${r.stage === 'p2p_awaiting' ? ' checked' : ''}> Approved the full request (${r.units_requested} units)</label>
        <label><input type="radio" name="oc" value="partial"> Approved more, but not all</label>
        <label><input type="radio" name="oc" value="denied"> Upheld the denial</label>
      </div>
      <div id="ocuw"${r.stage === 'p2p_awaiting' ? '' : ' hidden'}><label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="ocu">Units awarded after the call</label>
      <input id="ocu" type="number" min="0" max="300" value="${r.units_requested}" style="width:140px;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit"></div>
      <label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="ocn">Note (optional: medical director's name, what they asked)</label>
      <textarea id="ocn" rows="3" style="width:100%;border:1px solid #D9D4CC;border-radius:8px;padding:8px 10px;font:inherit">${esc(r.p2p_recording ? 'From the call: ' + r.p2p_recording.transcript.slice(0, 400) : '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Log the outcome</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const u = box.querySelector('#ocu');
        const uw = box.querySelector('#ocuw');
        box.querySelectorAll('[name=oc]').forEach(el => el.onchange = () => { uw.hidden = ['awaiting', 'denied'].includes(el.value); u.value = el.value === 'approved' ? r.units_requested : ''; });
        box.querySelector('[data-go]').onclick = async () => {
          const outcome = box.querySelector('[name=oc]:checked').value; const units = +u.value || undefined; const notes = box.querySelector('#ocn').value.trim();
          close();
          await this.do('request.p2pLog', { id: r.id, outcome, units: ['awaiting', 'denied'].includes(outcome) ? undefined : units, notes });
          toast(`Outcome logged · ${r.id} is now ${stageLabel(M.byId(this.s.requests, r.id)?.stage) || ''}`);
        };
      });
  }
});
