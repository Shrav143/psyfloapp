// 7 · Referral review (Live). ?id=REF-118 (default). Adult referrals from drug court, P&P, self, hospital ED and
// HIV clinic partners. The ASAM panel is fixed logic over the referral; Schedule intake screening / Route to the
// grant program write to the store; the Nevada Medicaid (EVS) check is recorded on Eligibility.
import { register, Screen, M, raw } from '../app.js';
import { stageChip, refStudent, refShort, refSource } from './Referrals.js';

const ICON = {
  shown: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#217A78" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>',
  ask: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F4A05" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>',
  open: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525B66" stroke-width="2.2"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"></circle></svg>',
  no: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A2E1C" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>'
};
const CONCERNS = ['Opioid use', 'Alcohol use', 'Stimulant use', 'Cannabis use', 'Withdrawal risk', 'Overdose history', 'Co-occurring mental health', 'Suicidal ideation', 'Housing instability', 'Legal / court involvement'];
const ATTACH = { court_order: 'Court order / case plan', discharge_summary: 'Hospital discharge summary', prior_treatment: 'Prior treatment records', uds: 'Urine drug screen results', uds_results: 'Urine drug screen results', id_card: 'ID and Medicaid card', medicaid_card: 'ID and Medicaid card', release: 'Signed 42 CFR Part 2 release' };
const yes = v => v === true || /^(y|yes|true|signed|42 CFR)/i.test(String(v ?? ''));
const consentOf = f => f.release_signed ?? f.consent ?? f.release ?? f.client_consented ?? f.guardian_informed;

// Fixed reading of the referral against the six ASAM dimensions the PA will be argued on.
// It only says what the referral shows and what the ASAM assessment must still ask; it decides nothing.
export function readCriteria(s, r) {
  const f = r.form || {};
  const ticked = (f.concerns || []).map(String);
  const has = re => ticked.some(c => re.test(c));
  const pick = re => ticked.filter(c => re.test(c)).join(', ').toLowerCase();
  const att = f.attachments || {};
  const hasUds = Object.entries(att).some(([k, v]) => v && (/uds/i.test(k) || /UDS|drug screen/i.test((f.attachment_labels || {})[k] || '')));
  const tried = String(f.interventions_tried || f.treatment_tried || '').trim();
  const dim = (key, title, test, shownBody, askText, openBody) => {
    const on = test();
    return on ? { key, status: askText ? 'ask' : 'shown', title, body: shownBody(), ask: askText || '' } : { key, status: 'open', title, body: openBody || 'Nothing on the referral yet. ', ask: 'ASAM assessment: ' + (openBody ? '' : 'ask directly so the answer is on record.') };
  };
  const out = [
    dim('d1', 'D1 · Acute intoxication / withdrawal potential', () => has(/withdraw|opioid|alcohol/i),
      () => 'Referral names ' + pick(/withdraw|opioid|alcohol|benzo/i) + '. ', has(/withdraw/i) ? 'ASAM assessment: last use, withdrawal history, whether a medically monitored level is needed first.' : 'ASAM assessment: last use and any withdrawal history.'),
    dim('d2', 'D2 · Biomedical conditions and complications', () => has(/overdose|hiv|hep|medical|pregnan/i) || !!f.medical || /bupren|methadone|naltrex|prescrib|detox/i.test(tried),
      () => [pick(/overdose|hiv|hep|medical|pregnan/i) || String(f.medical || '').toLowerCase(), /bupren/i.test(tried) ? 'on buprenorphine from an outside prescriber' : '', /detox/i.test(tried) ? 'prior detox admissions' : ''].filter(Boolean).join('; ').replace(/^./, c => c.toUpperCase()) + ' (from the referral). ', 'ASAM assessment: current prescriber (MOUD), HIV/HCV care, recent ED visits.'),
    dim('d3', 'D3 · Emotional, behavioral or cognitive conditions', () => has(/mental|depress|anx|suicid|ptsd|trauma/i),
      () => 'Ticked: ' + pick(/mental|depress|anx|suicid|ptsd|trauma/i) + '. Plans want dates and current treatment, not just the tick. ', has(/suicid/i) ? 'Screen for risk at intake the same day; document the safety plan.' : 'ASAM assessment: diagnoses, current MH treatment, who prescribes.'),
    { key: 'd4', status: tried ? 'ask' : 'open', title: 'D4 · Readiness to change', body: tried ? `Treatment already tried: "${tried.replace(/\.$/, '')}". ` : 'Nothing on the referral about prior treatment or motivation. ', ask: 'ASAM assessment: in the client\'s words, why now; court-mandated or voluntary.' },
    dim('d5', 'D5 · Relapse, continued use or continued problem potential', () => has(/opioid|alcohol|stimulant|cannabis|overdose|relapse|positive|screen/i) || !!tried,
      () => 'Use pattern on the referral: ' + (pick(/opioid|alcohol|stimulant|cannabis|overdose|relapse|positive|screen/i) || 'see prior treatment') + (hasUds ? '; UDS results attached. ' : '. '), hasUds ? 'Urine drug screen again at the assessment: SilverSummit wants one dated at the assessment for Level 2.1 initials.' : 'Urine drug screen at the assessment: SilverSummit now denies Level 2.1 initials without it.'),
    dim('d6', 'D6 · Recovery / living environment', () => has(/housing|court|legal|probation|parole|unstable/i),
      () => 'Referral notes ' + pick(/housing|court|legal|probation|parole|unstable/i) + '. ', 'ASAM assessment: housing, supports, people still using, transport to 3 IOP days a week.')
  ];
  return { list: out, shown: out.filter(c => c.status !== 'open').length };
}

register('Referral', class extends Screen {
  init() {
    this.state = { dlg: this.params.grant ? 'grant' : this.params.sched ? 'sched' : null, done: null, sched: null, why: 'No Medicaid', text: true, ask: true };
  }
  get ref() {
    const s = this.s;
    return M.byId(s.referrals, this.params.id || 'REF-118') || M.byId(s.referrals, 'REF-118') || s.referrals[0];
  }
  el(r) { return M.eligibilityFor(this.s, r.id); }
  schedDefaults(r) {
    const booked = this.s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const who = booked?.who || (this.me?.role === 'clinician' ? this.me.id : 'jperez');
    const date = booked?.when?.slice(0, 10) || this.s.today;
    const taken = new Set(this.s.screenings.filter(x => x.status === 'booked' && x.who === who && x.referral !== r.id && x.when?.slice(0, 10) === date).map(x => x.when.slice(11, 16)));
    const prefs = ['10:00', '14:00', '15:30'];
    const time = booked?.when?.slice(11, 16) || prefs.find(t => !taken.has(t)) || prefs[0];
    return { who, date, time };
  }
  renderVals() {
    const s = this.s; const r = this.ref; if (!r) return { title: 'No referrals yet', crumb: '—', criteria: [] };
    const f = r.form || {}; const el = this.el(r);
    const c = M.byId(s.clients, r.client);
    const client = refStudent(s, r); const short = refShort(s, r);
    const program = M.school(s, r.school);
    const source = refSource(s, r);
    const [stageLabel, stageCls] = stageChip(r);
    const by = M.byId(s.school_users, r.referred_by);
    const sched = this.state.sched || (this.state.sched = this.schedDefaults(r));
    const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const screened = s.screenings.find(x => x.referral === r.id && x.status === 'done');
    const st = this.state;
    const elRecorded = el?.status === 'recorded';

    // eligibility chip (live)
    let eligChip = '', eligCls = 'n';
    if (elRecorded) { eligChip = 'Medicaid ' + (r.eligibility || el.result); eligCls = el.result === 'active' ? 'g' : 'r'; }
    else if (r.stage === 'grant_program') { eligChip = 'Grant · no PA'; eligCls = 'n'; }
    else { eligChip = 'EVS check not recorded yet'; eligCls = 'y'; }

    // form
    const med = f.medicaid ?? f.medicaid_per_school ?? f.medicaid_per_partner;
    let medicaidText = '—', medicaidChip = '', medicaidCls = 'y';
    if (med === 'yes_no_id' || med === 'yes_with_id' || med === 'yes' || med === true) { medicaidText = '"Yes" per the referral'; medicaidChip = f.medicaid_id || med === 'yes_with_id' ? 'ID given · confirm in EVS' : 'ID not given · confirm in EVS'; }
    else if (med === 'no' || med === false) { medicaidText = '"No" per the referral'; medicaidChip = 'check EVS · grant if none'; medicaidCls = 'n'; }
    else if (med) { medicaidText = '"Not sure" per the referral'; medicaidChip = 'check EVS'; }
    const attKeys = Object.keys(f.attachments || {});
    const ticked = (f.concerns || []).map(x => String(x).toLowerCase());
    const first = x => String(x).toLowerCase().split(/[ /]/)[0];
    const isOn = name => ticked.some(t => t === name.toLowerCase() || first(t) === first(name));
    const concerns = CONCERNS.map(name => ({ name, on: isOn(name) ? 'on' : '' }))
      .concat((f.concerns || []).filter(x => !CONCERNS.some(n => first(n) === first(x))).map(name => ({ name, on: 'on' })));
    const attLabel = k => (f.attachment_labels || {})[k] || ATTACH[k];
    const attachments = attKeys.map(k => { const v = f.attachments[k]; const name = attLabel(k) || (typeof v === 'string' ? v : k.replace(/_/g, ' ')); return v ? { cls: 'g', text: name + ' ✓' } : { cls: 'r', text: name + ' — missing' }; });
    if (!attachments.length) attachments.push({ cls: 'n', text: r.form ? 'None attached' : '—' });
    const rf = (f.referral_for || []).map(x => String(x).toLowerCase());
    const levelOf = x => /2\.1|iop|intensive/.test(x) ? 'Level 2.1 IOP' : /mental|therapy|mh/.test(x) ? 'Mental health therapy' : /level 1|outpatient|op\b/.test(x) ? 'Level 1 outpatient' : '';
    const wanted = new Set(rf.map(levelOf).filter(Boolean));
    if (!rf.length && c?.level) wanted.add(c.level === '2.1' ? 'Level 2.1 IOP' : 'Level 1 outpatient');
    const referralFor = ['Level 2.1 IOP', 'Level 1 outpatient', 'Mental health therapy'].map(name => ({ name, on: wanted.has(name) ? 'on' : '' }));
    const critLevel = wanted.has('Level 2.1 IOP') ? 'Level 2.1 initial PA (from the assessment)' : 'Level 1 · PA after 24 sessions (FFS)';

    // ASAM read
    const crit = readCriteria(s, r);
    const criteria = crit.list.map((x, i) => ({ ...x, icon: raw(ICON[x.status]), style: i === 0 ? 'margin-top:6px' : '' }));
    const missing = [];
    attKeys.filter(k => !f.attachments[k]).forEach(k => missing.push(`${attLabel(k) || k.replace(/_/g, ' ')} from ${source}${f.asked_on ? ' (asked ' + M.fmtDate(f.asked_on) + ')' : ''}`));
    if (!elRecorded && r.stage !== 'grant_program') missing.push('Nevada Medicaid eligibility: a person checks EVS and records the plan (MCO or FFS)');
    if (!yes(consentOf(f))) missing.push('Signed 42 CFR Part 2 release to talk with the referral partner');
    missing.push('ASAM assessment with a urine drug screen at the visit (SilverSummit denies Level 2.1 initials without it)');
    const missingText = missing.map((m, i) => `${i + 1}. ${m}`).join('  ·  ');

    // referral partner card
    const partner = by ? `${by.name}${by.role ? ' · ' + by.role : ''}` : source;
    const flRows = [
      { text: 'Referred by', chip: partner, cls: 'n', style: 'border-top:0' },
      { text: 'Received', chip: M.fmtDateTime(r.received), cls: 'n' },
      { text: 'Consent to share with the partner (42 CFR Part 2)', ...(yes(consentOf(f)) ? { chip: typeof f.release_signed === 'string' ? f.release_signed.replace(/^42 CFR Part 2 consent to /, 'signed · ') : 'signed', cls: 'g' } : { chip: 'get it at intake', cls: 'y' }) },
      { text: 'Records from the partner', ...(attKeys.length && attKeys.every(k => f.attachments[k]) ? { chip: 'all received', cls: 'g' } : attKeys.length ? { chip: attKeys.filter(k => !f.attachments[k]).length + ' missing', cls: 'y' } : { chip: 'none sent', cls: 'n' }) },
      { text: 'Updates back to the partner', chip: /court|p&p|parole|probation/i.test(source) ? 'attendance + UDS, per the release' : 'only with the client\'s consent', cls: 'n' }
    ];

    // eligibility card
    const elRows = [];
    const mid = [el?.lookup?.medicaid_id, c?.medicaid?.id, f.medicaid_id].find(v => /\d{4}/.test(String(v || '')));
    elRows.push({ text: 'Medicaid ID', chip: mid ? mid + ' · from the referral / intake' : f.medicaid_id ? 'on the referral form · type it into EVS' : 'ask at intake (ID and Medicaid card)', cls: mid || f.medicaid_id ? 'g' : 'y' });
    if (elRecorded) elRows.push({ text: 'EVS result', chip: `${r.eligibility || el.result} · checked ${M.fmtDate(el.checked_at)} by ${M.staffShort(s, el.checked_by)}`, cls: el.result === 'active' ? 'g' : 'r' });
    else elRows.push({ text: 'EVS result', chip: 'not recorded yet · a person checks EVS', cls: 'y' });
    elRows.push(elRecorded ? { text: 'Where the proof is kept', chip: `${el.screenshot} · in Psyflo`, cls: 'g' } : { text: 'Where the proof is kept', chip: 'in Psyflo, with date and screenshot', cls: 'n' });
    if (elRecorded) elRows.push({ text: 'Next re-check', chip: M.fmtDate(el.next_check, { dow: true }), cls: 'n' });
    elRows.push({ text: 'If no Medicaid: Ryan White / SAPTA grant · payer of last resort · no PA', chip: r.stage === 'grant_program' ? 'routed' : el?.result === 'inactive' ? 'route to the grant' : 'n/a', cls: r.stage === 'grant_program' ? 'n' : el?.result === 'inactive' ? 'r' : 'n' });
    elRows[0].style = 'border-top:0';
    const screenHref = c ? 'ExtScreening.dc.html?client=' + c.id : 'ExtScreening.dc.html?referral=' + r.id;

    // contact for the dialog
    const callWho = c ? `${c.initials} (client)` : short + ' (client)';
    const callPhone = c?.phone || f.phone || 'phone from the referral';
    const timeOpts = [['10:00', '10:00 am'], ['14:00', '2:00 pm'], ['15:30', '3:30 pm']].map(([v, t]) => ({ v, t, sel: sched.time === v ? 'selected' : '' }));
    if (!timeOpts.some(o => o.sel)) timeOpts.push({ v: sched.time, t: M.fmtTime('2000-01-01T' + sched.time), sel: 'selected' });
    const whoOpts = s.staff.filter(x => ['clinician', 'supervisor'].includes(x.role) || /LCADC|CADC/.test(x.credential || '')).map(x => ({ v: x.id, t: x.name + (x.credential ? ', ' + x.credential : ''), sel: sched.who === x.id ? 'selected' : '' }));

    const canAct = ['needs_screening', 'waiting_on_school', 'screening_booked'].includes(r.stage);
    const doneTexts = {
      sched: () => { const b = booked; return b ? `Intake screening saved: ${M.staff(s, b.who).name}, ${M.fmtDateTime(b.when, { dow: true })}.${st.text ? ' Client texted (SMS stub).' : ''}${st.ask ? ' Referral partner asked for the missing records (email stub).' : ''} To-do added to Do next and to the Client Record panel.` : 'Intake screening saved.'; },
      grant: () => `Routed to the Ryan White / SAPTA grant: no prior authorization needed. Emailed the grant program coordinator (secure link) and told ${source} (email stubs, logged). Now under Referrals › Grant · no PA.`
    };
    return {
      crumb: `${r.id} · ${c && !canAct ? 'client' : 'new client'} · ${source}`,
      stageLabel, stageCls, eligChip, eligCls,
      receivedText: `Received ${M.fmtDateTime(r.received)} · ${source}`,
      title: `Referral ${r.id} · ${client} · ${program.name || source}`,
      canAct, canGrant: r.stage !== 'grant_program',
      schedCls: !booked && ['needs_screening', 'waiting_on_school'].includes(r.stage) && !elRecorded ? 'o' : 'p',
      schedLabel: booked ? 'Reschedule intake screening' : 'Schedule intake screening',
      grantUndo: r.stage === 'grant_program' && !r.history,
      laterHref: r.stage === 'grant_program' ? 'Referrals.dc.html?f=grant' : (r.stage === 'declined' || r.history) ? 'Referrals.dc.html?f=all' : screenHref,
      laterLabel: r.stage === 'grant_program' ? 'Grant program list' : (r.stage === 'declined' || r.history) ? 'Back to the list' : (screened ? 'Screening in Client Record' : 'Open in Client Record'),
      showSched: st.dlg === 'sched', showGrant: st.dlg === 'grant', showDone: !!st.done && !st.dlg,
      doneText: st.done ? doneTexts[st.done]() : '', doneHref: st.done === 'grant' ? 'Referrals.dc.html?f=grant' : 'ExtHome.dc.html', doneLink: st.done === 'grant' ? 'see the Grant list →' : 'see it in the Client Record panel →',
      short, today: s.today, sched, whoChips: whoOpts.map(o => ({ l: o.t.split(',')[0], on: sched.who === o.v, cls: 'chp' + (sched.who === o.v ? ' on' : ''), pick: () => { sched.who = o.v; this.setState({}); } })), timeChips: timeOpts.map(o => ({ l: o.t, on: sched.time === o.v, cls: 'chp' + (sched.time === o.v ? ' on' : ''), pick: () => { sched.time = o.v; this.setState({}); } })), callWho, callPhone,
      callSrc: c?.phone ? 'from intake' : 'from the referral', callCls: c?.phone ? 'g' : 'n',
      textChecked: st.text ? 'checked' : '', askChecked: st.ask ? 'checked' : '',
      saveSchedLabel: st.text ? 'Save and text the client' : 'Save',
      whyChips: ['No Medicaid', 'Medicaid pending or lapsed', 'Living with HIV · Ryan White eligible'].map((t, i) => ({ l: t, on: (st.why || 'No Medicaid') === t, cls: 'chp' + ((st.why || 'No Medicaid') === t ? ' on' : ''), pick: () => this.setState({ why: t }) })),
      partnerShort: source,
      noForm: r.form ? '' : `The referral's form answers for ${r.id} are not in the demo data — only the summary: "${r.next || M.REF_STAGE?.[r.stage] || r.stage}".`,
      medicaidText, medicaidChip, medicaidCls, iepText: source, informedText: consentOf(f) == null ? '—' : yes(consentOf(f)) ? (typeof f.release_signed === 'string' ? f.release_signed : 'Signed') : 'Not yet',
      concerns, triedText: (f.interventions_tried || f.treatment_tried) ? `"${f.interventions_tried || f.treatment_tried}"` : '—', attachments, referralFor,
      criteria, critChip: `6 dimensions · ${crit.shown} with something on the referral`, critCls: crit.shown >= 4 ? 'g' : 'y', critLevel,
      missingTitle: screened ? 'Still open from the referral' : 'Before the ASAM assessment', missingText,
      flRows,
      callHref: r.history ? '' : (booked || elRecorded || screened ? screenHref : canAct ? '#sched' : ''), callLabel: booked || elRecorded || screened ? 'Intake screening in Client Record' : 'Schedule intake screening',
      elRows, elHref: 'Eligibility.dc.html?referral=' + r.id, elBtn: elRecorded ? 'Open the eligibility check' : 'Record the EVS check', elBtnCls: elRecorded ? 'o' : 'p',
      laurisHref: elRecorded && !r.history ? screenHref : '',
      openSched: () => this.setState({ dlg: 'sched', done: null, sched: this.schedDefaults(r) }),
      openGrant: () => this.setState({ dlg: 'grant', done: null }),
      closeAll: () => this.setState({ dlg: null }),
      setWho: e => { sched.who = e.target.value; }, setDate: e => { sched.date = e.target.value; }, setTime: e => { sched.time = e.target.value; },
      setText: e => this.setState({ text: e.target.checked }), setAsk: e => { this.state.ask = e.target.checked; },
      setWhy: e => { this.state.why = e.target.value; },
      saveSched: async () => {
        if (!sched.date) return this.toast('Pick a date', 'err');
        await this.do('referral.scheduleNV', { id: r.id, who: sched.who, when: `${sched.date}T${sched.time}`, remind_client: st.text, ask_partner: st.ask, by: this.me?.id });
        this.setState({ dlg: null, done: 'sched' });
      },
      saveGrant: async () => { await this.do('referral.routeGrantNV', { id: r.id, why: st.why || 'No Medicaid', by: this.me?.id || 'jperez' }); this.setState({ dlg: null, done: 'grant' }); }
    };
  }
  get anchors() {
    return {
      sched: () => this.setState({ dlg: 'sched', done: null, sched: this.schedDefaults(this.ref) })
    };
  }
  set anchors(v) { }
});
