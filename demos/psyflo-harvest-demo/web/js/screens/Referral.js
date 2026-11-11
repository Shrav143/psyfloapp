// 7 · Referral review (Live). ?id=REF-118 (default). The criteria panel is fixed logic over the school's
// form; Schedule screening call / Send the family link / Route to grant program write to the store.
// Eligibility is never checked here: the school form has no insurance details (brief rule 5).
import { register, Screen, M, raw } from '../app.js';
import { stageChip, refStudent, refShort } from './Referrals.js';

const ICON = {
  shown: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#217A78" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>',
  ask: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F4A05" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>',
  open: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525B66" stroke-width="2.2"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle></svg>',
  no: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A2E1C" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>'
};
const CONCERNS = ['Physical aggression', 'Verbal aggression', 'Eloping', 'Inattention', 'Withdrawal / avoidance', 'Depression', 'Suicidal / homicidal ideation', 'Self-harm', 'Defiant / argumentative'];
const ATTACH = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades', iep: 'IEP copy', iep_copy: 'IEP copy' };
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const yes = v => v === true || /^(y|yes|true)/i.test(String(v ?? ''));

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

register('Referral', class extends Screen {
  init() {
    this.state = { dlg: this.params.grant ? 'grant' : this.params.sched ? 'sched' : null, done: null, sched: null, why: 'No Medicaid', text: true, ask: true };
  }
  get ref() {
    const s = this.s;
    return M.byId(s.referrals, this.params.id || 'REF-118') || M.byId(s.referrals, 'REF-118') || s.referrals[0];
  }
  fl(r) { return M.familyLinkFor(this.s, r.id); }
  el(r) { return M.eligibilityFor(this.s, r.id); }
  schedDefaults(r) {
    const fl = this.fl(r); const best = String(fl?.answers?.best_time || '');
    const booked = this.s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const who = booked?.who || (this.me?.role === 'clinician' ? this.me.id : 'jperez');
    const date = booked?.when?.slice(0, 10) || this.s.today;
    const taken = new Set(this.s.screenings.filter(x => x.status === 'booked' && x.who === who && x.referral !== r.id && x.when?.slice(0, 10) === date).map(x => x.when.slice(11, 16)));
    const prefs = /morning/i.test(best) ? ['10:00', '14:00', '15:30'] : ['14:00', '15:30', '10:00'];
    const time = booked?.when?.slice(11, 16) || prefs.find(t => !taken.has(t)) || prefs[0];
    return { who, date, time };
  }
  renderVals() {
    const s = this.s; const r = this.ref; if (!r) return { title: 'No referrals yet', crumb: '—', criteria: [] };
    const f = r.form || {}; const fl = this.fl(r); const el = this.el(r);
    const c = M.byId(s.clients, r.client);
    const student = refStudent(s, r); const short = refShort(s, r);
    const school = M.school(s, r.school);
    const [stageLabel, stageCls] = stageChip(r);
    const by = M.byId(s.school_users, r.referred_by);
    const sched = this.state.sched || (this.state.sched = this.schedDefaults(r));
    const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const screened = s.screenings.find(x => x.referral === r.id && x.status === 'done');
    const st = this.state;

    // eligibility chip (live)
    let eligChip = '', eligCls = 'n';
    if (el?.status === 'recorded') { eligChip = 'Eligibility ' + (r.eligibility || el.result); eligCls = el.result === 'active' ? 'g' : 'r'; }
    else if (el?.status === 'details_received') { eligChip = 'Eligibility · details received — run the check'; eligCls = 'y'; }
    else if (fl?.sent_at) { eligChip = 'Eligibility · waiting for the family link'; eligCls = 'n'; }

    // form
    const med = f.medicaid_per_school;
    let medicaidText = '—', medicaidChip = '', medicaidCls = 'y';
    if (med === 'yes_no_id' || med === 'yes' || med === true) { medicaidText = '"Yes" per the school'; medicaidChip = f.medicaid_id ? 'ID given — still checked only after the family link' : 'ID not provided'; }
    else if (med === 'no' || med === false) { medicaidText = '"No" per the school'; medicaidChip = 'ask on the family link'; medicaidCls = 'n'; }
    else if (med) { medicaidText = '"Not sure" per the school'; medicaidChip = 'ask on the family link'; }
    const attKeys = Object.keys(f.attachments || {});
    const iepCopy = attKeys.some(k => /iep/i.test(k) && f.attachments[k]);
    const iepText = f.iep == null ? '—' : yes(f.iep) ? (/504/.test(String(f.iep)) ? '504 plan' : 'IEP') + (iepCopy ? ' · copy attached' : '') : 'None';
    const ticked = (f.concerns || []).map(x => String(x).toLowerCase());
    const isOn = name => ticked.some(t => t === name.toLowerCase() || t.split(/[ /]/)[0] === name.toLowerCase().split(/[ /]/)[0]);
    const concerns = CONCERNS.map(name => ({ name, on: isOn(name) ? 'on' : '' }))
      .concat((f.concerns || []).filter(x => !CONCERNS.some(n => n.toLowerCase().split(/[ /]/)[0] === String(x).toLowerCase().split(/[ /]/)[0])).map(name => ({ name, on: 'on' })));
    const attachments = attKeys.map(k => { const v = f.attachments[k]; const name = ATTACH[k] || (typeof v === 'string' ? v : k.replace(/_/g, ' ')); return v ? { cls: 'g', text: name + ' ✓' } : { cls: 'r', text: name + ' — missing' }; });
    if (!attachments.length) attachments.push({ cls: 'n', text: r.form ? 'None attached' : '—' });
    const rf = (f.referral_for || []).map(x => String(x).toLowerCase());
    const referralFor = ['TDT', 'Outpatient counseling', 'SEBS'].map(name => ({ name, on: rf.some(x => x.startsWith(name.toLowerCase().split(' ')[0])) ? 'on' : '' }));

    // criteria
    const crit = readCriteria(s, r, s.today);
    const criteria = crit.list.map((x, i) => ({ ...x, icon: raw(ICON[x.status]), style: i === 0 ? 'margin-top:6px' : '' }));
    const missing = [];
    attKeys.filter(k => !f.attachments[k]).forEach(k => missing.push(`${ATTACH[k] || k.replace(/_/g, ' ')} from the school${r.form?.asked_on ? ' (asked ' + M.fmtDate(r.form.asked_on) + ')' : ''}`));
    if (!fl?.submitted_at) missing.push('Insurance details — from the family link (the eligibility check runs when it is submitted)');
    if (!fl?.steps?.guardian && !fl?.submitted_at) missing.push('Guardian details and consent to contact (family link)');
    if (crit.list.find(x => x.key === 'c2')?.status === 'ask' && f.interventions_tried) missing.push('Outcome of the school\'s interventions — ask the counselor, not the family');
    const missingText = missing.length ? missing.map((m, i) => `${i + 1}. ${m}`).join('  ·  ') : 'Nothing — ready for the screening call.';

    // family link card
    const sent = !!fl?.sent_at, opened = !!fl?.opened_at, submitted = !!fl?.submitted_at;
    const done = k => submitted || !!fl?.steps?.[k];
    const stepChip = ok => ok ? { chip: 'done', cls: 'g' } : sent ? { chip: 'not yet', cls: 'y' } : { chip: 'not yet', cls: 'n' };
    const flRows = [
      { text: sent ? 'Sent by SMS to the guardian · ' + M.fmtDateTime(fl.sent_at) : 'Not sent yet · the guardian gets a text with the link', ...(submitted ? { chip: 'submitted', cls: 'g' } : opened ? { chip: 'opened', cls: 'g' } : sent ? { chip: 'sent · not opened yet', cls: 'y' } : { chip: 'not sent', cls: 'n' }), style: 'border-top:0' },
      { text: 'Guardian name, relationship, phone, address, preferred language', ...stepChip(done('guardian')) },
      { text: 'Member Medicaid ID · DOB', ...stepChip(done('insurance')) },
      { text: 'Consent to be contacted by Harvest · best times to call', ...stepChip(done('consent') && done('best_time')) },
      { text: 'Transportation: can you get to an in-person intake?', ...stepChip(done('transport')) }
    ];
    const smsEv = [...s.events].reverse().find(e => e.record === r.id && e.sms);
    const sms = smsEv && fl ? { to: smsEv.sms.to, at: M.fmtDateTime(smsEv.at), text: smsEv.sms.text, link: `${location.origin}/f/${smsEv.sms.token || fl.token}`, expires: s.settings?.family_link?.expires_days || 7 } : null;
    const familyHref = fl ? 'FamilyLink.dc.html?t=' + fl.token : 'FamilyLink.dc.html?preview=1';

    // eligibility card
    const elRows = [];
    if (el?.lookup?.medicaid_id || el?.status === 'recorded') elRows.push({ text: 'Medicaid ID', chip: (el.lookup?.medicaid_id || fl?.answers?.medicaid_id || 'on file') + ' · from the family link', cls: 'g' });
    else elRows.push({ text: 'Medicaid ID', chip: 'not yet · asked on the family link (step 2)', cls: 'y' });
    if (el?.status === 'recorded') elRows.push({ text: 'Check result', chip: `${r.eligibility || el.result} · checked ${M.fmtDate(el.checked_at)} by ${M.staffShort(s, el.checked_by)}`, cls: el.result === 'active' ? 'g' : 'r' });
    else if (el?.status === 'details_received') elRows.push({ text: 'Check result', chip: 'details received — run the check', cls: 'y' });
    else elRows.push({ text: 'Check result', chip: 'waiting for the family link', cls: 'n' });
    elRows.push(el?.status === 'recorded' ? { text: 'Where the proof is kept', chip: `${el.screenshot} · in Psyflo, not in Lauris`, cls: 'g' } : { text: 'Where the proof is kept', chip: 'in Psyflo, with date and screenshot — not in Lauris', cls: 'n' });
    if (el?.status === 'recorded') elRows.push({ text: 'Next weekly re-check', chip: M.fmtDate(el.next_check, { dow: true }), cls: 'n' });
    elRows.push({ text: 'If no Medicaid: route to the DOE grant program (no diagnosis required)', chip: r.stage === 'grant_program' ? 'routed' : el?.result === 'inactive' ? 'route to the grant program' : 'n/a', cls: r.stage === 'grant_program' ? 'n' : el?.result === 'inactive' ? 'r' : 'n' });
    elRows[0].style = 'border-top:0';
    const elRecorded = el?.status === 'recorded';
    const screenHref = 'ExtScreening.dc.html?referral=' + r.id;

    // call details for the dialog
    const g = submitted ? fl.answers : null;
    const guardian = c?.guardian || {};
    const callWho = (g?.relationship || guardian.relationship || 'Guardian').replace(/^\w/, ch => ch.toUpperCase());
    const callPhone = g?.phone || guardian.phone || 'phone from the family link';
    const best = String(fl?.answers?.best_time || '');
    const timeOpts = [['14:00', '2:00 pm'], ['10:00', '10:00 am'], ['15:30', '3:30 pm']].map(([v, t]) => ({ v, t: t + ((/afternoon/i.test(best) && v === '14:00') || (/morning/i.test(best) && v === '10:00') ? ` (guardian said ${/afternoon/i.test(best) ? 'afternoons' : 'mornings'})` : ''), sel: sched.time === v ? 'selected' : '' }));
    if (!timeOpts.some(o => o.sel)) timeOpts.push({ v: sched.time, t: M.fmtTime('2000-01-01T' + sched.time), sel: 'selected' });
    const whoOpts = s.staff.filter(x => x.role === 'clinician').map(x => ({ v: x.id, t: x.name + (x.credential ? ', ' + x.credential : ''), sel: sched.who === x.id ? 'selected' : '' }));

    const canAct = ['needs_screening', 'waiting_on_school', 'screening_booked'].includes(r.stage);
    const doneTexts = {
      sched: () => { const b = booked; return b ? `Screening call saved: ${M.staff(s, b.who).name}, ${M.fmtDateTime(b.when, { dow: true })}.${st.text ? ' Guardian texted (SMS stub).' : ''}${st.ask ? ' Counselor asked for schedule and grades.' : ''} To-do added to Do next and to the Lauris panel.` : 'Screening call saved.'; },
      grant: () => `Routed to the DOE grant program. Emailed the grant program lead (secure link); emailed and texted the ${school.name.split('·').pop().trim()} site supervisor; told the school counselor (email stubs, logged). Now under Referrals › Grant program.`,
      offer: () => `Texted ${sms?.to || 'the guardian'} a link to book the screening call on the parent portal (SMS stub). The open times come from the clinicians' calendars; when the family picks one it lands on Do next and in the Lauris panel.`,
      intake: () => `Texted ${sms?.to || 'the guardian'} a link to book the in-person intake on the parent portal (SMS stub). They can ask for a ride there; a ride request lands on Do next.`,
      link: () => `Family link sent by text to ${sms?.to || 'the guardian'} (SMS stub). When the guardian submits it, the eligibility check opens with the lookup details prepared.`
    };
    return {
      crumb: `${r.id} · ${c && !['needs_screening', 'waiting_on_school', 'screening_booked'].includes(r.stage) ? 'student' : 'new student'} · ${school.name}`,
      stageLabel, stageCls, eligChip, eligCls,
      receivedText: r.history ? `Received ${M.fmtDate(r.received)} · school portal` : `Submitted via Psyflo link · ${M.fmtDateTime(r.received)}${by ? ' · ' + by.role : ''}`,
      title: `Referral ${r.id} · ${student} · ${school.name.replace(' · ', ' ')}`,
      canAct, canGrant: r.stage !== 'grant_program',
      // Nov 7: the family books the screening call (and later the intake) on the parent portal; booking for them stays as a fallback
      canOffer: !booked && !r.screening_offer && ['needs_screening', 'waiting_on_school'].includes(r.stage),
      offerNote: !booked && r.screening_offer ? 'Family asked to book · ' + M.fmtDate(r.screening_offer.at) : '',
      schedCls: !booked && ['needs_screening', 'waiting_on_school'].includes(r.stage) ? 'o' : 'p',
      schedLabel: booked ? 'Reschedule screening call' : r.screening_offer ? 'Book it for them' : 'Book it for them instead',
      canIntakeOffer: !!(screened && c && !c.intake && !c.intake_offer && ['in_intake'].includes(r.stage)),
      intakeNote: c?.intake ? `Intake booked · ${M.fmtDateTime(c.intake.when, { dow: true })}${c.intake.ride ? ' · ride needed' : ''}` : c?.intake_offer ? 'Family asked to book the intake · ' + M.fmtDate(c.intake_offer.at) : '',
      offerFamily: async () => { await this.do('screening.offer', { referral: r.id, by: this.me?.id || 'jperez' }); this.setState({ dlg: null, done: 'offer' }); },
      offerIntake: async () => { await this.do('intake.offer', { client: c.id, referral: r.id, by: this.me?.id || 'jperez' }); this.setState({ dlg: null, done: 'intake' }); },
      grantUndo: r.stage === 'grant_program' && !r.history,
      laterHref: r.stage === 'grant_program' ? 'Referrals.dc.html?f=grant' : (r.stage === 'declined' || r.history) ? 'Referrals.dc.html?f=all' : screenHref,
      laterLabel: r.stage === 'grant_program' ? 'Grant program list' : (r.stage === 'declined' || r.history) ? 'Back to the list' : (screened ? 'Screening in Lauris' : 'Open in Lauris'),
      showSched: st.dlg === 'sched', showGrant: st.dlg === 'grant', showDone: !!st.done && !st.dlg,
      doneText: st.done ? doneTexts[st.done]() : '', doneHref: st.done === 'grant' ? 'Referrals.dc.html?f=grant' : 'ExtHome.dc.html', doneLink: st.done === 'grant' ? 'see the Grant program list →' : 'see it in the Lauris panel →',
      short, today: s.today, sched, whoOpts, timeOpts, callWho, callPhone,
      callSrc: submitted ? 'from family link' : 'from the school', callCls: submitted ? 'g' : 'n',
      textChecked: st.text ? 'checked' : '', askChecked: st.ask ? 'checked' : '',
      saveSchedLabel: st.text ? 'Save and text the guardian' : 'Save',
      whyOpts: ['No Medicaid', 'Medicaid lapsed', 'Family declined Medicaid service'].map(t => ({ t, sel: st.why === t ? 'selected' : '' })),
      schoolShort: school.name.split('·').pop().trim(),
      noForm: r.form ? '' : `The school's form answers for ${r.id} are not in the demo data — only the summary: "${r.next || M.REF_STAGE[r.stage] || r.stage}".`,
      medicaidText, medicaidChip, medicaidCls, iepText, informedText: f.guardian_informed == null ? '—' : yes(f.guardian_informed) ? 'Yes' : 'No',
      concerns, triedText: f.interventions_tried ? `"${f.interventions_tried}"` : '—', attachments, referralFor,
      criteria, critChip: `2 criteria needed · ${crit.shown} shown`, critCls: crit.shown >= 2 ? 'g' : 'y',
      missingTitle: screened ? 'Still open from the referral' : missing.length ? 'Missing before the screening call' : 'Before the screening call', missingText,
      flRows, sms, canSend: !submitted && !['grant_program', 'declined', 'in_service'].includes(r.stage), sendCls: sent ? 'o' : 'p', sendLabel: sent ? 'Send the link again' : 'Send the family link',
      callHref: booked || elRecorded || screened ? (r.history ? '' : screenHref) : canAct ? '#sched' : '', familyHref,
      elRows, elHref: 'Eligibility.dc.html?referral=' + r.id, elBtn: elRecorded ? 'Open the eligibility check' : el?.status === 'details_received' ? 'Run the eligibility check' : 'Open the eligibility check', elBtnCls: el?.status === 'details_received' ? 'p' : 'o',
      laurisHref: elRecorded ? screenHref : '',
      openSched: () => this.setState({ dlg: 'sched', done: null, sched: this.schedDefaults(r) }),
      openGrant: () => this.setState({ dlg: 'grant', done: null }),
      closeAll: () => this.setState({ dlg: null }),
      setWho: e => { sched.who = e.target.value; }, setDate: e => { sched.date = e.target.value; }, setTime: e => { sched.time = e.target.value; },
      setText: e => this.setState({ text: e.target.checked }), setAsk: e => { this.state.ask = e.target.checked; },
      setWhy: e => { this.state.why = e.target.value; },
      saveSched: async () => {
        if (!sched.date) return this.toast('Pick a date', 'err');
        await this.do('referral.scheduleAndText', { id: r.id, who: sched.who, when: `${sched.date}T${sched.time}`, text_guardian: st.text, ask_counselor: st.ask, by: this.me?.id });
        this.setState({ dlg: null, done: 'sched' });
      },
      saveGrant: async () => { await this.do('referral.routeAndNotify', { id: r.id, why: st.why, by: this.me?.id || 'jperez' }); this.setState({ dlg: null, done: 'grant' }); }
    };
  }
  get anchors() {
    return {
      sendlink: async () => {
        const r = this.ref;
        await this.do('familyLink.send', { referral: r.id, by: this.me?.id || 'jperez' });
        this.setState({ done: 'link', dlg: null });
      },
      sched: () => this.setState({ dlg: 'sched', done: null, sched: this.schedDefaults(this.ref) })
    };
  }
  set anchors(v) { }
});
