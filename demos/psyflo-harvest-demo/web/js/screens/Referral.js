// 7 · Referral (route Referral) · the Intake checklist for one referral (design §6.3). ?id=REF-118 (default).
// Guardian agreement, the school's attachments, the family link and the DMAS eligibility check read as one list; the criteria
// are fixed logic over the school form. Send family link, Book call and the Funding source dropdown write to the store.
// Eligibility is never checked here: the school form has no insurance details (brief rule 5), so Verify waits for the family link.
import { register, Screen, M, esc, modal, toast } from '../app.js';
import { VIEWS, FILTER, PART } from '../shared/labels.js';
import { refStudent, refShort, schoolTag, fundingOf, FUNDING, yes, noop, showProof, B1_CSS } from './Referrals.js';

const CONCERNS = ['Physical aggression', 'Verbal aggression', 'Eloping', 'Inattention', 'Withdrawal / avoidance', 'Depression', 'Suicidal / homicidal ideation', 'Self-harm', 'Defiant / argumentative'];
const ATTACH = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades', iep: 'IEP copy', iep_copy: 'IEP copy' };
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

// Fixed rules over the referral form: DMAS TDT initial SRA, Section I (2 of 3 criteria, 1 of 5 level of care)
export function readCriteria(s, r, today) {
  const f = r.form || {};
  const ticked = (f.concerns || []).map(String);
  const has = re => ticked.some(c => re.test(c));
  const att = f.attachments || {};
  const tried = String(f.interventions_tried || '').trim();
  const sn = (s.school_numbers || {})[r.client];
  const out = [];
  // 1 · interpersonal relationships
  {
    const behaviours = has(/aggress|defian|argu/i);
    let body = '', status = 'open', still = '', ask = '';
    if (behaviours) {
      const bits = [];
      if (att.behaviour_report && sn?.incident_dates?.length) {
        const recent = sn.incident_dates.filter(d => M.daysBetween(d, today) <= 30 && d <= today);
        bits.push(`Behaviour report: aggression on ${recent.length} dated occasion${recent.length === 1 ? '' : 's'} in the last 30 days (${recent.map(d => M.fmtDate(d)).join(', ')})`);
      } else if (att.behaviour_report) bits.push('Behaviour report attached: ' + ticked.filter(c => /aggress|defian|argu/i.test(c)).join(', ').toLowerCase());
      else bits.push('Ticked on the form: ' + ticked.filter(c => /aggress|defian|argu/i.test(c)).join(', ').toLowerCase() + ' · no behaviour report attached');
      const off = tried.match(/(\w+) office referrals?/i);
      if (off) bits.push(`${NUM[off[1].toLowerCase()] ?? off[1]} office referral${(NUM[off[1].toLowerCase()] ?? +off[1]) === 1 ? '' : 's'}`);
      if (att.attendance_log && sn?.iss_days_6mo != null) bits.push(`Attendance log: ${sn.iss_days_6mo} day${sn.iss_days_6mo === 1 ? '' : 's'} ISS`);
      body = bits.join('; ') + '.';
      if (att.schedule_and_grades && sn?.classes) body += ` Schedule and grades: ${sn.unexcused_absences} unexcused absences · passing ${sn.passing} of ${sn.classes} classes.`;
      else still = 'unexcused absences this year and classes taking/passing — both come from the ' + (att.schedule_and_grades === false ? 'missing schedule and grades.' : 'schedule and grades.');
      status = att.behaviour_report ? 'shown' : 'ask';
      if (!att.behaviour_report) ask = 'Ask the counselor for the behaviour report with dates.';
    } else { body = 'No aggression or conflict ticked on the form. '; ask = 'Screening call: how does the student get on with peers and adults?'; }
    out.push({ key: 'c1', status, title: 'Difficulty establishing or maintaining interpersonal relationships', body, still, ask });
  }
  // 2 · repeated interventions that have not worked
  {
    let body, ask, status = 'ask';
    if (!tried) { body = 'Nothing listed under interventions tried. '; ask = 'Screening call: what has the school tried, since when, and what happened?'; }
    else {
      const outcomes = /\b(outcome|did not work|didn't work|no change|not improved|ended|stopped)\b/i.test(tried);
      const outpatientInfo = /information about outpatient|given information/i.test(tried);
      body = outcomes ? 'Interventions named with an outcome on the form. ' : 'Interventions are named but without outcomes' + (outpatientInfo ? '; "information about outpatient" is not a prior service. ' : '. ');
      if (outcomes && !outpatientInfo) status = 'shown';
      ask = 'Screening call: dates, frequency and outcome for each intervention' + (outpatientInfo ? '; whether outpatient ever started, with whom.' : '.');
      if (status === 'shown') ask = '';
    }
    out.push({ key: 'c2', status, title: 'Documented repeated interventions that have not worked', body, ask });
  }
  // 3 · danger to self or others
  {
    let status = 'open', body = 'Not addressed by the referral.', ask = '';
    if (has(/suicid|homicid|self-harm|self harm/i)) { status = 'shown'; body = 'Ticked on the form: ' + ticked.filter(c => /suicid|homicid|self/i.test(c)).join(', ').toLowerCase() + '. '; ask = 'Screening call: when, how often, what the school did.'; }
    else if (has(/elop/i)) { body = 'Not addressed by the referral. Eloping is ticked — '; ask = 'Screening call: where to, how often, how long gone.'; }
    out.push({ key: 'c3', status, title: 'Cognitive ability to recognise danger to self or others', body, ask });
  }
  // level of care
  out.push(f.placement_discussed
    ? { key: 'loc', status: 'shown', title: 'Level of care (1 of 5)', body: 'The school says alternative placement has been discussed.', ask: '' }
    : { key: 'loc', status: 'open', title: 'Level of care (1 of 5)', body: 'Nothing yet on risk of out-of-home placement, hospitalization or a more restrictive setting. ', ask: 'Screening call: has the school discussed alternative placement?' });
  // internalizing
  {
    const int = ticked.filter(c => /withdraw|depress|suicid|self|anx|sad/i.test(c));
    out.push(int.length
      ? { key: 'int', status: 'ask', title: 'Internalizing symptoms', body: `Ticked: ${int.join(', ').toLowerCase()}. Payers want frequency and duration, not just the tick. `, ask: 'Screening call: sleep, withdrawal and sadness — how often, how long, since when.' }
      : { key: 'int', status: 'no', title: 'Internalizing symptoms', body: 'None ticked. Payers treat "not observable" as "not present"; the screening call should ask directly about sleep, withdrawal and sadness so the answer is on record either way.', ask: '' });
  }
  const shown = out.filter(c => ['c1', 'c2', 'c3'].includes(c.key) && c.status === 'shown').length;
  const c3 = out.find(c => c.key === 'c3');
  if (c3.status !== 'shown' && out.find(c => c.key === 'c1').status === 'shown' && out.find(c => c.key === 'c2').status === 'shown') Object.assign(c3, { body: 'Not needed for the form: criteria 1 and 2 are shown, and two of three is enough. Left blank on the SRA.', ask: '' });
  else if (c3.status === 'open' && !c3.ask) c3.ask = 'Screening call: any wandering, unsafe acts or threats — when, how often?';
  return { list: out, shown };
}


const MARK = { ok: '✓', no: '✕', ask: '!', open: '' };
const CRIT_NAME = { c1: 'Relationships', c2: 'Prior services', c3: 'Danger to self or others' };
const CRIT_IC = { shown: 'ok', ask: 'b1-ic-ask', open: '', no: 'no' };

register('Referral', class extends Screen {
  init() { this.state = { dlg: this.params.sched ? 'sched' : null, sched: null }; if (this.params.sched) this._openSched = true; }
  get ref() {
    const s = this.s;
    return M.byId(s.referrals, this.params.id || 'REF-118') || M.byId(s.referrals, 'REF-118') || s.referrals[0];
  }
  schedDefaults(r) {
    const s = this.s; const fl = M.familyLinkFor(s, r.id); const best = String(fl?.answers?.best_time || '');
    const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const who = booked?.who || (this.me?.role === 'clinician' ? this.me.id : 'jperez');
    const date = booked?.when?.slice(0, 10) || s.today;
    const taken = new Set(s.screenings.filter(x => x.status === 'booked' && x.who === who && x.referral !== r.id && x.when?.slice(0, 10) === date).map(x => x.when.slice(11, 16)));
    const prefs = /morning/i.test(best) ? ['10:00', '14:00', '15:30'] : ['14:00', '15:30', '10:00'];
    return { who, date, time: booked?.when?.slice(11, 16) || prefs.find(t => !taken.has(t)) || prefs[0] };
  }
  renderVals() {
    const s = this.s; const r = this.ref; if (!r) return { title: 'No referrals', items: [], crit: [] };
    const f = r.form || {}; const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id);
    const c = M.byId(s.clients, r.client); const student = refStudent(s, r); const school = M.school(s, r.school);
    const sent = !!fl?.sent_at; const submitted = !!fl?.submitted_at; const by = this.me?.id || 'jperez';
    const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const screened = s.screenings.find(x => x.referral === r.id && x.status === 'done');
    const verified = el?.status === 'recorded';
    const closed = ['grant_program', 'declined', 'in_service'].includes(r.stage) && !!r.history;
    const agrees = r.guardian_agrees ?? f.guardian_agrees ?? (f.guardian_informed != null ? yes(f.guardian_informed) : null);
    const att = f.attachments || {};
    const asked = k => r.asked && r.asked[k];
    const ATT_NAME = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades', iep: 'IEP copy', iep_copy: 'IEP copy' };

    const items = [];
    const add = o => items.push({ ic: '', mark: '', note: '', btn: '', fn: noop, off: 'false', tip: '', proof: false, ...o });
    add({ ic: agrees === true ? 'ok' : agrees === false ? 'no' : '', mark: agrees === true ? MARK.ok : agrees === false ? MARK.no : '', label: 'Guardian agrees to the referral' });
    add({ ic: r.form ? 'ok' : '', mark: r.form ? MARK.ok : '', label: 'Referral form' });
    for (const k of Object.keys(att)) {
      const have = !!att[k];
      add({ ic: have ? 'ok' : 'no', mark: have ? MARK.ok : MARK.no, label: ATT_NAME[k] || k.replace(/_/g, ' '),
        ...(have ? {} : asked(k) ? { note: 'Asked ' + M.fmtDate(asked(k).at) } : { btn: 'Ask school', fn: () => this.askSchool(r, k, by) }) });
    }
    const g = fl?.answers || {};
    const waiting = 'waiting on family link';
    add({ ic: submitted ? 'ok' : '', mark: submitted ? MARK.ok : '', label: 'Guardian details', note: submitted ? [g.guardian_name, g.relationship].filter(Boolean).join(', ') : waiting });
    const plan = M.byId(s.payers, el?.plan);
    add({
      ic: verified ? (el.result === 'active' ? 'ok' : 'no') : '', mark: verified ? (el.result === 'active' ? MARK.ok : MARK.no) : '', label: 'Medicaid ID and verification',
      note: verified ? `${el.result === 'active' ? 'Active' : 'Not active'}${plan ? ' · ' + plan.name.split(' ')[0] : ''} · verified ${M.fmtDate(el.checked_at)}` : submitted ? 'Medicaid · not verified' : waiting,
      proof: verified, showProof: () => showProof(s, el, student),
      ...(verified ? {} : { btn: PART.verify, off: submitted ? 'false' : 'true', tip: submitted ? '' : 'After the family link', fn: submitted ? () => this.go('Eligibility.dc.html', { referral: r.id }) : noop })
    });
    add({ ic: submitted ? 'ok' : '', mark: submitted ? MARK.ok : '', label: 'Consent to contact', note: submitted ? (fl.steps?.consent || g.consent_record ? 'Given' : '') : waiting });
    const steps = submitted ? 5 : ['guardian', 'insurance', 'consent', 'best_time', 'transport'].filter(k => fl?.steps?.[k]).length;
    add({ ic: submitted ? 'ok' : '', mark: submitted ? MARK.ok : '', label: `Family link · ${steps} of 5 done` });

    const crit = readCriteria(s, r, s.today);
    const critRows = crit.list.filter(x => CRIT_NAME[x.key]).map(x => ({
      label: CRIT_NAME[x.key], ic: CRIT_IC[x.status], mark: MARK[x.status === 'shown' ? 'ok' : x.status] || '', tip: [x.title, x.body, x.still, x.ask].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    }));
    const link = fl ? `${location.origin}/f/${fl.token}` : '';
    const fund = fundingOf(r);
    const sendPri = !sent && !closed; const bookPri = sent && !booked && !closed;
    return {
      title: `${student} · ${schoolTag(school.name)}`, items, critRows, critChip: `2 needed · ${crit.shown} shown`,
      critHead: 'Criteria (DMAS Section I)', checkHead: screened ? 'Checklist' : 'Before the screening call',
      fundOpts: FUNDING.map(v => ({ v, t: v, sel: fund === v ? 'selected' : '' })), fundLabel: FILTER.funding,
      setFunding: e => this.setFunding(r, e.target.value, by),
      canSend: !submitted && !closed, sendLabel: sent ? 'Resend link' : 'Send family link', sendCls: 'u-btn' + (sendPri ? ' pri' : ''),
      sendLink: async () => { try { await this.do('familyLink.send', { referral: r.id, by }); toast('Family link sent by text'); } catch { } },
      canBook: !closed && !screened, bookLabel: booked ? 'Change call' : 'Book call', bookCls: 'u-btn' + (bookPri ? ' pri' : ''), book: () => this.bookCall(r),
      hasCall: !!booked, callText: booked ? `Call ${M.fmtDateTime(booked.when)}` : '', callHref: 'ExtScreening.dc.html?referral=' + r.id, callLabel: 'Open in Lauris',
      hasLink: sent && !submitted && !!link, link, held: !!r.hold, holdText: r.hold ? 'On hold · ' + r.hold.why : '', lift: async () => { try { await this.do('referral.unhold', { id: r.id, by }); toast('Hold lifted'); } catch { } },
      back: 'Referrals.dc.html', backLabel: VIEWS.authorizations.intake, mine: !!c
    };
  }
  async askSchool(r, item, by) {
    try { await this.do('b1.askSchool', { id: r.id, item, by }); toast('Counselor asked · ' + String(item).replace(/_/g, ' ')); } catch { }
  }
  async setFunding(r, v, by) {
    try {
      if (v === 'SEBS') await this.do('referral.routeGrant', { id: r.id, program: 'SEBS', why: '' });
      else await this.do('b1.setFunding', { id: r.id, funding: v, by });
      toast('Funding source · ' + v);
    } catch { }
  }
  bookCall(r) {
    const s = this.s; const d = this.schedDefaults(r); const fl = M.familyLinkFor(s, r.id); const best = String(fl?.answers?.best_time || '');
    const who = s.staff.filter(x => x.role === 'clinician').map(x => `<option value="${esc(x.id)}"${d.who === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
    const times = [['14:00', '2:00 pm'], ['10:00', '10:00 am'], ['15:30', '3:30 pm']].map(([v, t]) => `<option value="${v}"${d.time === v ? ' selected' : ''}>${t}</option>`).join('');
    modal(`<h2>Book call · ${esc(refShort(s, r))}</h2>
      <label class="b1-lbl" for="b1-who">Clinician</label><select id="b1-who" class="u-sel" style="width:100%">${who}</select>
      <label class="b1-lbl" for="b1-date">Date</label><input id="b1-date" class="u-in" type="date" value="${esc(d.date)}" min="${esc(s.today)}" style="width:100%">
      <label class="b1-lbl" for="b1-time">Time</label><select id="b1-time" class="u-sel" style="width:100%">${times}</select>
      <div class="b1-mact"><button class="mbtn p" data-go>Book call</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => {
        const when = `${box.querySelector('#b1-date').value}T${box.querySelector('#b1-time').value}`; const who = box.querySelector('#b1-who').value;
        if (!box.querySelector('#b1-date').value) return toast('Pick a date', 'err');
        close();
        try { await this.do('referral.scheduleAndText', { id: r.id, who, when, text_guardian: true, by: this.me?.id }); toast('Call booked · ' + M.fmtDateTime(when)); } catch { }
      }; });
  }
  after() { if (this._openSched) { this._openSched = false; const r = this.ref; if (r && !['screening_booked'].includes(r.stage)) this.bookCall(r); } }
  get css() { return B1_CSS + '.b1-check li{flex-wrap:wrap}.b1-check .lab{font-weight:500}.b1-check .u-mut{font-size:13px}.b1-crit{display:flex;flex-wrap:wrap;gap:8px 24px;list-style:none;margin:0;padding:0}.b1-crit li{display:flex;align-items:center;gap:8px;min-height:36px;cursor:default}.b1-url{font-size:13px;word-break:break-all}.b1-fund{display:inline-flex;align-items:center;gap:8px;font-weight:500}'; }
});
