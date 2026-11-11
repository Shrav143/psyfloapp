// 38 · P2P call notes — assembled from the request in advance: Opening, Points (dated counts), Ask, Questions to expect,
// Evidence. Print; enter the call date the payer agreed by phone (stage peer_to_peer_requested); optionally record the
// call (with everyone's consent; request.p2pRecording keeps the transcript); Log outcome moves the request, its note
// pre-filled from the recording.
import { register, Screen, M, esc, modal, toast } from '../app.js';
import { STATUS } from '../shared/labels.js';
import { pickReq, details, clientOf, rateFor, runOut, payerFirst, openFile, stamp, todayLine, CSS } from './Partials.js';
import { fmtDate, fmtDateTime, daysBetween } from '../shared/dates.js';

const pron = c => c?.sex === 'F' ? ['she', 'her', 'girl'] : c?.sex === 'M' ? ['he', 'him', 'boy'] : ['the student', 'them', 'student'];
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
const OUT = { awaiting: 'Awaiting decision', approved: 'Approved', partial: 'Approved in part', denied: 'Denied' };

register('PeerBrief', class extends Screen {
  init() { this.state = { consent: false, rec: false, text: null, err: '' }; }
  req() { return pickReq(this.s, this.params.id, ['R-0388'], r => ['peer_to_peer_booked', 'peer_to_peer_requested', 'p2p_awaiting'].includes(r.stage)); }
  brief() {
    const s = this.s; const r = this.req(); if (!r) return null;
    const c = clientOf(s, r); const a = c?.authorization; const b = details(s, r.id).brief || null;
    const [she, her, kid] = pron(c);
    const rate = rateFor(r) || 3; const pf = payerFirst(s, r.payer);
    const awarded = r.units_awarded || r.units_offered || a?.units || 0;
    const days = Math.ceil(awarded / rate);
    const call = r.p2p_at || null;
    const out = a?.exhausted || runOut((a && a.payer === r.payer && a.start) || r.decision?.at || s.today, awarded, rate);
    const outBeforeCall = !!call && out < call.slice(0, 10);
    const end = (r.dates || '').split(' to ')[1];
    const sch = c ? M.school(s, c.school) : null;
    const clin = M.staff(s, c?.clinician || 'jperez');
    const openWith = b?.open_with || `"This is ${clin.name}${clin.credential ? ', ' + clin.credential : ''}, license and NPI on the request. I'm calling about a ${c?.age ? c.age + '-year-old ' : ''}${kid} at ${sch?.level === 'elementary' ? 'an elementary' : sch?.level ? 'a ' + sch.level : 'a'} school in ${sch?.locality || 'our area'} who was approved for ${awarded} of the ${r.units_requested} units we requested."`;
    const n = s.school_numbers?.[r.client];
    const criteria = b?.criteria || [
      { title: 'Criteria as submitted.', text: `Read from the signed request${r.signed_name ? ' (' + r.signed_name + ')' : ''}; the call repeats what was sent and adds nothing new.` },
      { title: 'Dated evidence.', text: n?.incident_dates?.length ? `${n.incident_dates.length} dated incidents (${n.incident_dates.map(d => fmtDate(d)).join(', ')}), reported by the school counselor ${fmtDate(n.reported)}.` : 'Incident dates and counts from the last 30 days of notes, with frequency, duration and intensity, as on the request.' }
    ];
    const rem = Math.max(0, r.units_requested - awarded);
    const unitsText = `At ${rate} units a day, ${awarded} units is ${days} school days. ${outBeforeCall ? `They ${out <= s.today ? 'ran' : 'run'} out ${fmtDate(out)}, ${daysBetween(out, call)} days before the call. Since then Harvest has kept seeing ${her} unpaid.` : `They last until about ${fmtDate(out)}.`}`;
    const questions = b?.questions ? b.questions.map(([q, a2]) => ({ q, a: a2 })) : (s.denial_reasons || []).slice(0, 4).map(d => ({ q: d.reason, a: d.check }));
    const ask = rem > 0 ? `Approve the remaining ${rem} units (${r.units_requested} requested)${end ? ' through ' + fmtDate(end) : ''}.` : `Approve the ${awarded} units as requested.`;
    const points = [...criteria, ...(b?.level_of_care ? [{ title: 'Level of care.', text: b.level_of_care }] : []), { title: 'Units.', text: unitsText }];
    return { r, c, pf, awarded, call, out, outBeforeCall, openWith, points, ask, questions, criteria };
  }
  renderVals() {
    const s = this.s; const x = this.brief(); const today = todayLine(s);
    if (!x) return { today, none: true, has: false, title: 'Call notes', chip: 'None booked', chipCls: 'u-chip info' };
    const { r, pf, call, out } = x;
    const cl = M.clientLabel(s, r.client);
    const o = r.p2p_outcome;
    const d = call ? daysBetween(s.today, call) : null;
    const chip = r.stage === 'p2p_awaiting' ? 'Awaiting decision' : !call ? 'Date needed' : d < 0 ? 'Log outcome' : d === 0 ? 'Call today' : d === 1 ? 'Tomorrow' : `${d} days out`;
    const chipCls = 'u-chip ' + (r.stage === 'p2p_awaiting' ? 'watch' : !call ? 'watch' : d <= 2 ? 'late' : 'info');
    const ev = [{ text: `Signed request ${r.id}`, pdf: true }, { text: 'Timer log · start and stop taps' }, { text: 'Daily notes · last 30 days' }, { text: 'School incident log' }];
    return {
      today, has: true, none: false,
      title: `Call notes · ${cl} · ${pf}${call ? ' · ' + fmtDateTime(call) : ''}`, chip, chipCls,
      callAt: call ? fmtDateTime(call, { dow: true }) : 'Not set', dateBtn: call ? 'Change date' : 'Enter date', schedule: () => this.schedule(),
      unitsChip: `Units out ${fmtDate(out)}`, unitsCls: x.outBeforeCall ? 'u-chip late' : 'u-chip info', unitsSub: x.outBeforeCall ? `${daysBetween(out, call)} days before the call` : '',
      outcome: o ? { text: OUT[o.outcome] || o.outcome, when: stamp(s, o.at) + (o.units ? ' · ' + o.units + ' units' : '') } : null,
      openWith: x.openWith, points: x.points, ask: x.ask, questions: x.questions, evidence: ev, pdf: () => openFile(this, 'request.pdfCopy', { id: r.id }),
      outcomeBtn: o?.outcome === 'awaiting' ? 'Log decision' : o ? 'Change outcome' : 'Log outcome',
      print: () => this.print(), logOutcome: () => this.outcome(),
      rec: this.recVals(r)
    };
  }
  // the payer calls and a time is agreed outside the platform; staff enter it here
  schedule() {
    const x = this.brief(); if (!x) return;
    const r = x.r;
    modal(`<h2>${r.p2p_at ? 'Change date' : 'Enter date'} · ${esc(r.id)}</h2>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="p2pd">Call date and time</label>
      <input id="p2pd" type="datetime-local" value="${esc((r.p2p_at || '').slice(0, 16))}" style="min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
      <p class="err" style="color:#8A2E1C;font-size:13px;margin:6px 0 0" hidden>Enter a date and time.</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Save date</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const when = box.querySelector('#p2pd').value;
        if (!when) { box.querySelector('.err').hidden = false; return; }
        close();
        await this.do('request.p2pSchedule', { id: r.id, when, by: this.me?.id });
        toast(`Call set · ${fmtDateTime(when, { dow: true })}`);
      });
  }
  print() {
    const x = this.brief(); if (!x) return;
    const v = this.renderVals();
    const blocks = [
      { text: `Call notes · ${v.title.replace(/^Call notes · /, '')}`, size: 14, bold: true },
      { text: 'Opening', bold: true, gap: 10 }, { text: x.openWith },
      { text: 'Points', bold: true, gap: 10 }, ...x.points.map(p => ({ text: p.title + ' ' + p.text })),
      { text: 'Ask', bold: true, gap: 10 }, { text: x.ask },
      { text: 'Questions to expect', bold: true, gap: 10 }, ...x.questions.map(q => ({ text: q.q + ' — ' + q.a })),
      { text: 'Evidence', bold: true, gap: 10 }, ...v.evidence.map(e => ({ text: e.text })),
      { text: 'Assembled in advance from the submitted request, the notes and the timer log. Synthetic demo data.', size: 9, gap: 14 }
    ];
    openFile(this, 'file.pdf', { name: `${x.r.id}_p2p_call_notes.pdf`, title: 'P2P call notes', blocks, kind: 'p2p_brief', record: x.r.id });
  }
  recVals(r) {
    const st = this.state; const saved = r.p2p_recording;
    if (st.text == null) st.text = saved?.transcript || '';
    const can = !!SR();
    return {
      consentChecked: st.consent || saved?.consent ? 'checked' : '', setConsent: e => { this.state.consent = e.target.checked; },
      btn: st.rec ? 'Stop' : 'Record', btnCls: st.rec ? 'u-btn pri' : 'u-btn',
      status: st.rec ? 'Recording' : st.err || (can ? '' : 'Needs Chrome · type notes'), statusCls: st.rec ? 'u-chip late' : 'u-chip info',
      text: st.text, setText: e => { this.state.text = e.target.value; },
      saved: saved ? `Saved ${stamp(this.s, saved.at)}${saved.typed ? ' · typed' : ' · recorded'}` : '',
      toggle: () => this.toggleRec(), save: () => this.saveRec(r)
    };
  }
  toggleRec() {
    if (this.state.rec) { this._sr?.stop(); return; }
    if (!this.state.consent && !this.req()?.p2p_recording?.consent) return toast('Confirm that everyone agreed to be recorded first', 'err');
    const C = SR(); if (!C) return this.setState({ err: 'Needs Chrome · type notes' });
    const sr = new C(); sr.continuous = true; sr.interimResults = true; sr.lang = 'en-US';
    const base = (this.state.text || '').trim(); let finals = '';
    sr.onresult = e => { this._heard = true; let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finals += t + ' '; else interim += t; } this.state.text = [base, finals + interim].filter(Boolean).join(' ').trim(); const ta = document.getElementById('p2ptext'); if (ta) ta.value = this.state.text; };
    sr.onerror = ev => { this.setState({ rec: false, err: ev.error === 'not-allowed' ? 'Microphone blocked · type notes' : 'Stopped · ' + ev.error }); };
    sr.onend = () => { if (this.state.rec) this.setState({ rec: false }); };
    this._sr = sr; try { sr.start(); this.setState({ rec: true, err: '' }); } catch (e) { this.setState({ err: 'Microphone did not start' }); }
  }
  async saveRec(r) {
    const text = (this.state.text || '').trim();
    if (!text) return toast('Record the call or type notes first', 'err');
    const consent = this.state.consent || !!r.p2p_recording?.consent;
    const typed = !this._heard;
    await this.do('request.p2pRecording', { id: r.id, transcript: text, consent, typed, by: this.me?.id || 'jperez' });
    toast(typed ? 'Notes saved' : 'Recording saved');
    this.setState({});
  }
  outcome() {
    const x = this.brief(); if (!x) return;
    const r = x.r; const held = r.stage === 'p2p_awaiting';
    modal(`<h2>${held ? 'Log decision' : 'Log outcome'} · ${esc(r.id)}</h2>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px">
        <label><input type="radio" name="oc" value="awaiting"${held ? '' : ' checked'}> Awaiting decision</label>
        <label><input type="radio" name="oc" value="approved"${held ? ' checked' : ''}> Approved in full (${r.units_requested} units)</label>
        <label><input type="radio" name="oc" value="partial"> Approved in part</label>
        <label><input type="radio" name="oc" value="denied"> Denied</label>
      </div>
      <div id="ocuw"${held ? '' : ' hidden'}><label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="ocu">Units awarded</label>
      <input id="ocu" type="number" min="0" max="300" value="${r.units_requested}" style="width:140px;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit"></div>
      <label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="ocn">Note</label>
      <textarea id="ocn" rows="3" style="width:100%;border:1px solid #D9D4CC;border-radius:8px;padding:8px 10px;font:inherit">${esc(r.p2p_recording ? 'From the call: ' + r.p2p_recording.transcript.slice(0, 400) : '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Log outcome</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const u = box.querySelector('#ocu');
        const uw = box.querySelector('#ocuw');
        box.querySelectorAll('[name=oc]').forEach(el => el.onchange = () => { uw.hidden = ['awaiting', 'denied'].includes(el.value); u.value = el.value === 'approved' ? r.units_requested : ''; });
        box.querySelector('[data-go]').onclick = async () => {
          const outcome = box.querySelector('[name=oc]:checked').value; const units = +u.value || undefined; const notes = box.querySelector('#ocn').value.trim();
          close();
          await this.do('request.p2pLog', { id: r.id, outcome, units: ['awaiting', 'denied'].includes(outcome) ? undefined : units, notes, by: this.me?.id });
          toast(`Logged · ${STATUS[M.byId(this.s.requests, r.id)?.stage] || OUT[outcome]}`);
        };
      });
  }
  get css() { return CSS; }
});
