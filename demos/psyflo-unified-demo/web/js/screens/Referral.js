// 7 · Referral case shell (E2). ?id=REF-118&panel=form|criteria|link|eligibility|consent. One state-driven primary action, then accordions.
// The criteria panel is fixed logic over the school's form; Schedule screening call / Send the family link / Route to grant program write
// to the store. Eligibility is never checked from the school's form: it follows the family link (the five-state panel below).
import { register, Screen, M, raw, esc, ui, toast, session, api } from '../app.js';
import { fmtDate, fmtDateTime } from '../shared/dates.js';
import { can } from '../shared/permissions.js';
import { ruleValue } from '../shared/rules.js';
import { eligibilityPanel, clock30, consentOf } from '../shared/sel/auth.js';
import { stageChip, refStudent, refShort, refChip, refElig } from './Referrals.js';
import { A_CSS } from './a-css.js';

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


const PANELS = ['form', 'criteria', 'link', 'eligibility', 'consent'];
const CRIT_ICON = { shown: 'check', ask: 'alert', open: 'dot', no: 'x' };
const PANEL_TITLE = { form: 'Referral form', criteria: 'Insurance criteria', link: 'Family link', eligibility: 'Eligibility check', consent: 'Consent and clock' };

register('Referral', class extends Screen {
  get css() { return A_CSS; }
  get me() { return session.actor; }
  init() {
    this.panel = PANELS.includes(this.params.panel) ? this.params.panel : null;
    this.state = { open: null, el: null, sched: null, why: 'No Medicaid', recheck: false };
  }
  get ref() { const s = this.s; return M.byId(s.referrals, this.params.id || 'REF-118') || M.byId(s.referrals, 'REF-118') || s.referrals[0]; }
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

  // ---------------------------------------------------------------------------------------------------------- the model
  model() {
    const s = this.s; const r = this.ref; if (!r) return null;
    const fl = this.fl(r); const el = this.el(r); const c = M.byId(s.clients, r.client);
    const booked = s.screenings.find(x => x.referral === r.id && x.status === 'booked');
    const screened = s.screenings.find(x => x.referral === r.id && x.status === 'done');
    return { s, r, fl, el, c, booked, screened, student: refStudent(s, r), short: refShort(s, r), school: M.school(s, r.school), elp: eligibilityPanel(s, r.id, this.me), crit: readCriteria(s, r, s.today), can: { run: this.can('eligibility.run'), refer: this.can('referrals') } };
  }
  can(cap) { return !!can(this.me, cap); }
  link(v) { const smsEv = [...v.s.events].reverse().find(e => e.record === v.r.id && e.sms); return smsEv && v.fl ? { to: smsEv.sms.to, at: M.fmtDateTime(smsEv.at), text: smsEv.sms.text, link: `${location.origin}/f/${smsEv.sms.token || v.fl.token}`, expires: ruleValue(v.s, 'family_link.expires_days', 7) } : null; }

  // ---------------------------------------------------------------------------------------------------------- render
  renderVals() {
    const v = this.model();
    if (!v) return { body: raw(`<div class="a-case"><h1 class="a-h1">No referrals yet</h1>${ui.emptyState({ title: 'Nothing to show', action: { label: 'Back to Referrals', href: '#/Referrals' } })}</div>`) };
    this.v = v;
    if (!this.state.open) this.state.open = this.panel ? { [this.panel]: true } : this.defaultOpen(v);
    return { body: raw(`<div class="a-case">${this.crumb(v)}${this.header(v)}${this.nextPanel(v)}<div class="a-secs">${PANELS.map(k => this.section(v, k)).join('')}</div></div>`) };
  }
  defaultOpen(v) {
    const { r, fl, el } = v;
    if (el && el.status === 'details_received') return { eligibility: true };
    if (['needs_screening', 'waiting_on_school'].includes(r.stage) && !(fl && fl.sent_at)) return { link: true };
    return { criteria: true };
  }
  crumb(v) { return `<nav class="a-crumb" aria-label="Breadcrumb"><a href="#/Referrals">Referrals</a><span aria-hidden="true">/</span><span aria-current="page">${esc(v.r.id)}</span></nav>`; }
  header(v) {
    const { r, s, school } = v; const by = M.byId(s.school_users, r.referred_by);
    const meta = [school.name, r.history ? `Received ${M.fmtDate(r.received)} · school portal` : `Received ${M.fmtDateTime(r.received)} · Psyflo link${by ? ' · ' + by.role : ''}`].join(' · ');
    const el = refElig(s, r);
    return `<header class="a-chead"><div class="a-chead__main"><h1 class="a-h1">${esc(v.student)} <span class="a-id">${esc(r.id)}</span></h1><div class="a-chead__meta"><span>${esc(meta)}</span></div></div>
      <div class="a-chead__r">${refChip(r)}${r.hold ? ui.chip('On hold', { tone: 'danger' }) : ''}${el ? ui.chip('Eligibility · ' + el.text, { tone: el.tone }) : ''}${ui.maturity('route.Referrals')}</div></header>`;
  }
  btn(x, label, o = {}) { return `<button type="button" class="ui-btn ui-btn--${o.tone || 'primary'}${o.sm ? ' ui-btn--sm' : ''}" data-x="${x}" data-ui-return="${x}"${o.data ? ' ' + o.data : ''}${o.disabled ? ' disabled' : ''}>${esc(label)}</button>`; }
  alink(href, label, o = {}) { return `<a class="ui-btn ui-btn--${o.tone || 'secondary'}${o.sm ? ' ui-btn--sm' : ''}" href="${esc(href)}"${o.ext ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`; }
  why(t) { return `<span class="a-why">${esc(t)}</span>`; }

  flow(v) {
    const { r, fl, el, c, booked, screened, s } = v; const elp = v.elp;
    const inService = ['in_service'].includes(r.stage);
    const steps = [
      { label: 'Referral', who: 'School', done: true, detail: `Received ${fmtDate(String(r.received).slice(0, 10))}` },
      { label: 'Family link', who: 'Guardian', done: !!(fl && fl.submitted_at), detail: fl && fl.submitted_at ? fmtDateTime(fl.submitted_at) : fl && fl.opened_at ? 'Opened · not submitted' : fl && fl.sent_at ? 'Sent · not opened' : 'Not sent' },
      { label: 'Eligibility', who: 'Authorized user', done: elp.recorded && elp.active, detail: elp.recorded ? (elp.active ? `Active${elp.el.plan ? ' · ' + M.payerShort(s, elp.el.plan) : ''}` : 'Not active') : elp.status === 'details' ? 'Check required' : 'After the link' },
      { label: 'Screening call', who: 'Clinician', done: !!screened || ['in_intake', 'in_service'].includes(r.stage), detail: screened ? 'Processed in Lauris' : booked ? M.fmtDateTime(booked.when, { dow: true }) : 'Not booked' },
      { label: 'Intake', who: 'Clinician', done: inService || !!(c && c.intake && c.intake.confirmed), detail: c && c.intake ? M.fmtDateTime(c.intake.when, { dow: true }) : inService ? 'In service' : 'After screening' }
    ];
    const cur = steps.findIndex(x => !x.done);
    return `<ol class="a-flow a-flow--5" aria-label="Referral steps">${steps.map((st, i) => `<li class="a-flow__i${st.done ? ' is-done' : ''}${i === cur ? ' is-current' : ''}"${i === cur ? ' aria-current="step"' : ''}><span class="a-flow__dot" aria-hidden="true">${st.done ? ui.icon('check', 14) : i + 1}</span><div class="a-flow__c"><div class="a-flow__l">${esc(st.label)}${st.done ? '<span class="ui-sr"> (done)</span>' : ''}</div><div class="a-flow__w">${esc(st.who)}</div><div class="a-flow__d">${esc(st.detail)}</div></div></li>`).join('')}</ol>`;
  }
  // the state-driven primary action
  primary(v) {
    const { r, fl, el, c, booked, screened, elp } = v; const canAct = ['needs_screening', 'waiting_on_school', 'screening_booked'].includes(r.stage);
    const out = { title: '', buttons: [], chips: '' };
    const schedLabel = booked ? 'Reschedule call' : 'Book the call';
    const grant = r.stage !== 'grant_program' && canAct ? this.btn('grant', 'Route to grant program', { tone: 'secondary' }) : '';
    if (r.hold) { out.title = 'On hold'; out.chips = `<span class="a-sub">${esc(r.next || '')}</span>`; out.buttons = [this.btn('unhold', 'Lift hold')]; return out; }
    if (r.stage === 'draft') { out.title = 'Draft at the school'; return out; }
    if (r.stage === 'grant_program') { out.title = 'Grant program'; out.chips = `<span class="a-sub">${esc(r.next || '')}</span>`; out.buttons = [!r.history ? this.btn('sched', 'Schedule call anyway', { tone: 'secondary' }) : '', this.alink('#/Referrals?status=grant', 'Grant program list')]; return out; }
    if (r.stage === 'declined') { out.title = 'Declined'; out.buttons = [this.alink('#/Referrals?status=all', 'Back to the list')]; return out; }
    if (r.stage === 'in_service') { out.title = 'In service'; out.buttons = [this.alink('#/Authorizations', 'Open Authorizations')]; return out; }
    if (r.stage === 'in_intake') {
      out.title = 'In intake'; const offered = c && c.intake_offer;
      out.chips = c && c.intake ? `<span class="a-sub">Intake booked · ${esc(M.fmtDateTime(c.intake.when, { dow: true }))}${c.intake.ride ? ' · ride needed' : ''}</span>` : offered ? `<span class="a-sub">Family asked to book the intake · ${esc(M.fmtDate(offered.at))}</span>` : '';
      out.buttons = [this.alink('ExtScreening.dc.html?referral=' + r.id, screened ? 'Open in Lauris' : 'Open the screening', { tone: 'primary' }), screened && c && !c.intake && !c.intake_offer ? this.btn('intake', 'Family books intake', { tone: 'secondary' }) : ''];
      return out;
    }
    if (r.stage === 'screening_booked') {
      out.title = 'Screening booked'; out.chips = booked ? `<span class="a-sub">${esc(M.staff(v.s, booked.who).name)} · ${esc(M.fmtDateTime(booked.when, { dow: true }))}</span>` : '';
      out.buttons = [this.alink('ExtScreening.dc.html?referral=' + r.id, 'Open in Lauris', { tone: 'primary' }), this.btn('sched', schedLabel, { tone: 'secondary' }), grant];
      return out;
    }
    // needs_screening / waiting_on_school
    if (!(fl && fl.sent_at)) {
      out.title = 'Reach the guardian'; out.chips = `${ui.maturity('family.link')}`;
      out.buttons = [this.btn('sendlink', 'Send the family link'), this.btn('sched', 'Book it for them', { tone: 'secondary' }), grant];
    } else if (!fl.submitted_at) {
      out.title = 'Waiting for the guardian'; out.chips = `<span class="a-sub">${esc(fl.opened_at ? 'Opened · not submitted' : 'Sent · not opened')}</span>${ui.maturity('family.link')}`;
      out.buttons = [this.btn('sendlink', 'Send the link again', { tone: 'secondary' }), this.btn('sched', 'Book it for them', { tone: 'secondary' }), grant];
    } else if (elp.status === 'details') {
      out.title = 'Check eligibility'; out.buttons = [this.btn('open-sec', 'Run the check', { data: 'data-sec="eligibility"' }), grant];
    } else if (elp.recorded && elp.active) {
      out.title = 'Schedule the screening'; out.chips = `<span class="a-sub">Eligible · ${esc(elp.el.plan ? M.payerShort(v.s, elp.el.plan) : '')}</span>`;
      const offerable = !booked && !r.screening_offer;
      out.buttons = [this.btn('sched', schedLabel), offerable ? this.btn('offer', 'Family books the call', { tone: 'secondary' }) : '', grant];
      if (r.screening_offer) out.chips += `<span class="a-sub">Family asked to book · ${esc(M.fmtDate(r.screening_offer.at))}</span>`;
    } else if (elp.recorded) {
      out.title = 'Not active'; out.buttons = [this.btn('hold', 'Hold and tell the family'), this.btn('grant', 'Route to grant program', { tone: 'secondary' })];
    } else { out.title = 'Next'; out.buttons = [this.btn('sched', 'Book it for them', { tone: 'secondary' }), grant]; }
    return out;
  }
  nextPanel(v) {
    const p = this.primary(v);
    return `<section class="a-card a-next" aria-labelledby="a-next-h"><div class="a-next__h"><h2 id="a-next-h">Next step</h2></div>${this.flow(v)}<div class="a-next__b"><div class="a-next__t">${esc(p.title)}</div>${p.chips ? `<div class="a-next__dl">${p.chips}</div>` : ''}<div class="a-btnrow">${p.buttons.filter(Boolean).join('')}</div></div></section>`;
  }

  // ---- sections
  section(v, key) {
    const open = !!this.state.open[key]; const { sum, body, chip } = this['sec_' + key](v);
    return `<details class="a-card a-sec" data-sec="${key}" id="sec-${key}"${open ? ' open' : ''}><summary><span class="a-sec__t">${esc(PANEL_TITLE[key])}</span>${chip || ''}<span class="a-sec__s">${esc(sum)}</span>${ui.icon('chevD', 16)}</summary><div class="a-sec__b">${body}</div></details>`;
  }
  sec_form(v) {
    const { r, s } = v; const f = r.form || {}; const med = f.medicaid_per_school;
    let medicaidText = '—', medicaidChip = '';
    if (med === 'yes_no_id' || med === 'yes' || med === true) { medicaidText = '"Yes" per the school'; medicaidChip = f.medicaid_id ? 'ID given · checked only after the family link' : 'ID not provided'; }
    else if (med === 'no' || med === false) { medicaidText = '"No" per the school'; medicaidChip = 'ask on the family link'; }
    else if (med) { medicaidText = '"Not sure" per the school'; medicaidChip = 'ask on the family link'; }
    const attKeys = Object.keys(f.attachments || {}); const iepCopy = attKeys.some(k => /iep/i.test(k) && f.attachments[k]);
    const iepText = f.iep == null ? '—' : yes(f.iep) ? (/504/.test(String(f.iep)) ? '504 plan' : 'IEP') + (iepCopy ? ' · copy attached' : '') : 'None';
    const ticked = (f.concerns || []).map(x => String(x).toLowerCase());
    const isOn = name => ticked.some(t => t === name.toLowerCase() || t.split(/[ /]/)[0] === name.toLowerCase().split(/[ /]/)[0]);
    const concerns = CONCERNS.map(name => ({ name, on: isOn(name) })).concat((f.concerns || []).filter(x => !CONCERNS.some(n => n.toLowerCase().split(/[ /]/)[0] === String(x).toLowerCase().split(/[ /]/)[0])).map(name => ({ name, on: true })));
    const attachments = attKeys.map(k => { const val = f.attachments[k]; const name = ATTACH[k] || (typeof val === 'string' ? val : k.replace(/_/g, ' ')); return val ? ui.chip(name + ' · attached', { tone: 'success', size: 'sm' }) : ui.chip(name + ' · missing', { tone: 'danger', size: 'sm' }); });
    const rf = (f.referral_for || []).map(x => String(x).toLowerCase());
    const box = x => `<span class="a-box"><i class="${x.on ? 'on' : ''}" aria-hidden="true"></i>${esc(x.name)}<span class="ui-sr">${x.on ? ' (ticked)' : ' (not ticked)'}</span></span>`;
    const body = !r.form ? ui.emptyState({ title: 'No form answers in the demo data', body: `Only the summary: "${r.next || M.REF_STAGE[r.stage] || r.stage}".` }) :
      `<div class="a-grid3"><div class="a-kv"><div class="a-kv__l">Medicaid</div>${esc(medicaidText)}${medicaidChip ? '<div class="a-sub">' + esc(medicaidChip) + '</div>' : ''}</div><div class="a-kv"><div class="a-kv__l">IEP / 504</div>${esc(iepText)}</div><div class="a-kv"><div class="a-kv__l">Guardian informed</div>${f.guardian_informed == null ? '—' : yes(f.guardian_informed) ? 'Yes' : 'No'}</div></div>
       <h3 class="a-h3">Concerns in the last 30 days</h3><div>${concerns.map(box).join('')}</div>
       <h3 class="a-h3">Interventions already tried</h3><p>${f.interventions_tried ? esc(`"${f.interventions_tried}"`) : '—'}</p>
       <h3 class="a-h3">Attachments</h3><div class="a-chips a-chips--wrap">${attachments.join('') || '<span class="ui-muted">None attached</span>'}</div>
       <h3 class="a-h3">Referral for</h3><div>${['TDT', 'Outpatient counseling', 'SEBS'].map(name => box({ name, on: rf.some(x => x.startsWith(name.toLowerCase().split(' ')[0])) })).join('')}</div>`;
    return { sum: r.form ? `${(f.concerns || []).length} concerns · ${attKeys.filter(k => f.attachments[k]).length} of ${attKeys.length} attachments` : 'Summary only', body };
  }
  missingList(v) {
    const { r, fl, crit } = v; const f = r.form || {}; const attKeys = Object.keys(f.attachments || {}); const missing = [];
    attKeys.filter(k => !f.attachments[k]).forEach(k => missing.push(`${ATTACH[k] || k.replace(/_/g, ' ')} from the school${f.asked_on ? ' (asked ' + M.fmtDate(f.asked_on) + ')' : ''}`));
    if (!fl?.submitted_at) missing.push('Insurance details, from the family link');
    if (!fl?.steps?.guardian && !fl?.submitted_at) missing.push('Guardian details and consent to contact, from the family link');
    if (crit.list.find(x => x.key === 'c2')?.status === 'ask' && f.interventions_tried) missing.push("Outcome of the school's interventions: ask the counselor, not the family");
    return missing;
  }
  sec_criteria(v) {
    const { crit } = v; const missing = this.missingList(v);
    const items = crit.list.map(x => `<li class="a-cr a-cr--${x.status}">${ui.icon(CRIT_ICON[x.status] || 'dot', 18)}<div><b>${esc(x.title)}</b> ${esc(x.body)}${x.still ? ` <span class="a-cr__ask">Still needs ${esc(x.still)}</span>` : ''}${x.ask ? `<div class="a-cr__ask">${esc(x.ask)}</div>` : ''}</div></li>`).join('');
    const miss = missing.length ? `<h3 class="a-h3">Missing</h3><ul class="a-ass">${missing.map(m => `<li>${ui.evidenceChip({ state: 'missing', label: m })}</li>`).join('')}</ul>` : '<p class="ui-muted">Nothing missing: ready for the screening call.</p>';
    return { sum: `2 needed · ${crit.shown} shown`, chip: missing.length ? ui.chip(`${missing.length} missing`, { tone: 'warning', size: 'sm', icon: 'alert' }) : '', body: `<div class="a-chips a-chips--wrap">${ui.chip('DMAS TDT initial SRA, Section I', { tone: 'outline', size: 'sm' })}${ui.sourceChip('official', { source: 'Initial SRA form and Chapter IV', note: '2 of 3 criteria and 1 of 5 level of care' })}</div><ul class="a-crl">${items}</ul>${miss}` };
  }
  sec_link(v) {
    const { r, fl } = v; const sent = !!fl?.sent_at, opened = !!fl?.opened_at, submitted = !!fl?.submitted_at; const done = k => submitted || !!fl?.steps?.[k];
    const chip = ok => ok ? ui.chip('Done', { tone: 'success', size: 'sm' }) : ui.chip('Not yet', { tone: sent ? 'warning' : 'neutral', size: 'sm' });
    const rows = [
      [sent ? `Sent by text to the guardian · ${M.fmtDateTime(fl.sent_at)}` : 'Not sent yet', submitted ? ui.chip('Submitted', { tone: 'success', size: 'sm' }) : opened ? ui.chip('Opened', { tone: 'success', size: 'sm' }) : sent ? ui.chip('Sent · not opened', { tone: 'warning', size: 'sm' }) : ui.chip('Not sent', { tone: 'neutral', size: 'sm' })],
      ['Guardian name, relationship, phone, language', chip(done('guardian'))], ['Medicaid ID and date of birth', chip(done('insurance'))], ['Consent to be contacted · best times', chip(done('consent') && done('best_time'))], ['Transportation to an in-person intake', chip(done('transport'))]
    ];
    const sms = this.link(v);
    const smsHtml = sms ? `<div class="a-sms"><div class="a-sms__l">Text message ${ui.maturity('family.link')}<span>Nothing leaves the demo</span></div><div><b>To:</b> ${esc(sms.to)} · ${esc(sms.at)}</div><div>${esc(sms.text)}<a id="fl-link" href="${esc(sms.link)}" target="_blank" rel="noopener">${esc(sms.link)}</a></div><div class="a-sub">Opens the family link on a phone · expires in ${esc(sms.expires)} days</div></div>` : '';
    const canSend = !submitted && !['grant_program', 'declined', 'in_service'].includes(r.stage);
    const booked = v.booked, screened = v.screened, elp = v.elp;
    const callHref = booked || elp.recorded || screened ? (r.history ? '' : 'ExtScreening.dc.html?referral=' + r.id) : '';
    const acts = [canSend && sent ? this.btn('sendlink', 'Send the link again', { tone: 'secondary', sm: true }) : '', callHref ? this.alink(callHref, 'Fill the rest on the call', { sm: true }) : '', this.alink(fl ? 'FamilyLink.dc.html?t=' + fl.token : 'FamilyLink.dc.html?preview=1', 'See what the family sees', { sm: true })].filter(Boolean).join('');
    return { sum: submitted ? 'Submitted' : opened ? 'Opened' : sent ? 'Sent' : 'Not sent', chip: ui.maturity('family.link'), body: `<ul class="a-docs">${rows.map(([t, c]) => `<li class="a-doc"><div>${esc(t)}</div><div>${c}</div></li>`).join('')}</ul>${smsHtml}<div class="a-btnrow">${acts}</div>` };
  }
  sec_eligibility(v) {
    const { r, s } = v; const e = v.elp; const el = e.el;
    const flow = `<ol class="a-flow a-flow--5" aria-label="Eligibility steps">${e.steps.map((st, i) => `<li class="a-flow__i${st.done ? ' is-done' : ''}${st.current ? ' is-current' : ''}"${st.current ? ' aria-current="step"' : ''}><span class="a-flow__dot" aria-hidden="true">${st.done ? ui.icon('check', 14) : i + 1}</span><div class="a-flow__c"><div class="a-flow__l">${esc(st.label)}${st.done ? '<span class="ui-sr"> (done)</span>' : ''}</div><div class="a-flow__d">${esc(st.detail)}</div></div></li>`).join('')}</ol>`;
    let body = flow;
    const lk = e.lookup || {}; const c = e.client;
    const dmas = `${api.config.extURL}/dmas/lookup?id=${encodeURIComponent(lk.medicaid_id || '')}&dob=${encodeURIComponent(lk.dob || '')}`;
    const showForm = e.status === 'details' || (e.recorded && (this.state.recheck || e.due));
    if (e.status === 'waiting') body += `<p class="ui-muted">The check runs after the guardian submits the family link. Never from the school's form alone.</p>`;
    if (showForm) {
      const f = this.state.el || (this.state.el = { result: 'active', plan: (M.byId(s.payers, v.fl?.answers?.plan) ? v.fl.answers.plan : el?.plan) || '', effective: el?.effective || '' });
      const dob = lk.dob ? (/^\d{4}-\d{2}-\d{2}$/.test(lk.dob) ? M.fmtDate(lk.dob, { year: true }) : lk.dob) : '—';
      body += `<h3 class="a-h3">${e.recorded ? 'Re-check' : 'Lookup details'}</h3><div class="a-grid3"><div class="a-kv"><div class="a-kv__l">Member</div>${esc(c ? `${c.initials}${c.age ? ', ' + c.age : ''}` : v.student)}</div><div class="a-kv"><div class="a-kv__l">Medicaid ID</div>${esc(lk.medicaid_id || 'Not given on the link')}</div><div class="a-kv"><div class="a-kv__l">Date of birth</div>${esc(dob)}</div></div>
        <div class="a-btnrow">${v.can.run ? `<a class="ui-btn ui-btn--secondary" href="${esc(dmas)}" target="_blank" rel="noopener">Open the DMAS lookup${ui.icon('external', 14)}</a>${ui.maturity('route.Eligibility')}` : this.why('Needs an authorized user')}</div>
        ${v.can.run ? `<div class="a-form"><label class="ui-field"><span class="ui-field__l">What DMAS shows</span><select class="ui-select" id="a-el-r"><option value="active"${f.result === 'active' ? ' selected' : ''}>Active</option><option value="inactive"${f.result === 'inactive' ? ' selected' : ''}>Not active</option></select></label>
        <label class="ui-field"><span class="ui-field__l">Plan</span><select class="ui-select" id="a-el-p"><option value="">${f.result === 'active' ? 'Pick the plan DMAS shows' : 'None'}</option>${s.payers.map(p => `<option value="${esc(p.id)}"${f.plan === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="ui-field"><span class="ui-field__l">Effective</span><input class="ui-input" id="a-el-e" type="date" value="${esc(f.effective)}"></label>${this.btn('record', 'Record result')}</div><p class="a-sub">Kept in Psyflo with the date, who checked and a dated proof. A person types the result; Psyflo never logs in to DMAS.</p>` : ''}`;
    }
    if (e.recorded) {
      const plan = el.plan && M.byId(s.payers, el.plan) ? M.payerShort(s, el.plan) : '';
      body += `<h3 class="a-h3">Result</h3><dl class="a-dl2">${[
        ['Result', `${ui.chip(el.result === 'active' ? 'Active' : 'Not active', { tone: el.result === 'active' ? 'success' : 'danger' })}${plan ? ' ' + esc(plan) : ''}${el.effective ? ' · effective ' + esc(M.fmtDate(el.effective, { year: true })) : ''}`],
        ['Checked', `${esc(M.staff(s, el.checked_by).name)} · ${esc(M.fmtDateTime(el.checked_at))}`],
        ['Source', `DMAS lookup, simulated ${ui.maturity('route.Eligibility')} · ${esc(el.screenshot || 'dated proof')}${el.file ? ` <a href="${esc(el.file)}" target="_blank" rel="noopener">Open proof</a>` : ' <button type="button" class="ui-linkbtn" data-x="proof" data-i="' + (e.history.length - 1) + '">View proof</button>'}`],
        ['Next check', el.next_check ? `${esc(M.fmtDate(el.next_check, { dow: true }))} ${ui.sourceChip(e.every)} ${e.due ? ui.chip('Due', { tone: 'warning', size: 'sm' }) : ''}` : 'Not configured']
      ].map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${val}</dd></div>`).join('')}</dl>`;
      const acts = [!e.due && !this.state.recheck ? this.btn('recheck', 'Record a re-check', { tone: 'secondary', sm: true }) : this.state.recheck ? this.btn('recheck', 'Cancel re-check', { tone: 'secondary', sm: true }) : '', v.r.hold ? this.btn('unhold', 'Lift the hold', { tone: 'secondary', sm: true }) : this.btn('hold', 'Hold and tell the family', { tone: 'secondary', sm: true }), el.result === 'inactive' && r.stage !== 'grant_program' ? this.btn('grant', 'Route to grant program', { tone: 'secondary', sm: true }) : ''].filter(Boolean).join('');
      body += `<div class="a-btnrow">${acts}</div>`;
      if (e.history.length) body += `<h3 class="a-h3">Checks</h3><table class="a-hist"><caption class="ui-sr">Eligibility checks</caption><thead><tr><th scope="col">Date</th><th scope="col">Result</th><th scope="col">Plan</th><th scope="col">Proof</th></tr></thead><tbody>${e.history.map(h => `<tr><td>${esc(M.fmtDate(h.at))}</td><td>${ui.chip(h.result === 'active' ? 'Active' : 'Not active', { tone: h.result === 'active' ? 'success' : 'danger', size: 'sm' })}</td><td>${esc(h.plan || '—')}</td><td>${h.file ? `<a href="${esc(h.file)}" target="_blank" rel="noopener">${esc(h.shot || 'Proof')}</a>` : `<button type="button" class="ui-linkbtn" data-x="proof" data-i="${h.i}">${esc(h.shot || 'View')}</button>`}</td></tr>`).join('')}${e.nextCheck ? `<tr><td>${esc(M.fmtDate(e.nextCheck))}</td><td>${ui.chip('Scheduled', { tone: 'neutral', size: 'sm' })}</td><td>—</td><td></td></tr>` : ''}</tbody></table>`;
    }
    const cur = e.steps.find(x => x.current);
    return { sum: e.recorded ? `${e.active ? 'Active' : 'Not active'} · checked ${M.fmtDate(el.checked_at)}` : cur ? cur.label : 'Waiting', chip: ui.maturity('route.Eligibility'), body };
  }
  sec_consent(v) {
    const { r, s } = v; const cid = r.client; const con = consentOf(s, cid); const ck = clock30(s, cid);
    const modeText = { remote_allowed: 'Remote signature allowed', in_person_required: 'In person required', pending_validation: 'Pending validation' }[con.mode] || con.mode;
    const consentRows = [['Consent for services', con.signed ? `${ui.chip('Signed', { tone: 'success', size: 'sm' })} ${esc(con.record.signer)} · ${esc(M.fmtDateTime(con.record.signed_at))}${con.versions > 1 ? ` · ${con.versions} versions kept` : ''}` : ui.chip('Not signed', { tone: 'neutral', size: 'sm' })], ['Signature mode', `${esc(modeText)} ${ui.sourceChip(con.rule)} ${ui.chip('Policy not validated', { tone: 'outline', size: 'sm' })}`]];
    const dl = rows => `<dl class="a-dl2">${rows.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${val}</dd></div>`).join('')}</dl>`;
    const evName = { consent_signed: 'consent signed', screening_processed: 'screening processed', intake_processed: 'intake processed' };
    const clockRows = ck.start ? [['Starts', `${esc(M.fmtDate(ck.start, { year: true }))} · ${esc(evName[ck.event] || ck.event)}${ck.fallback ? ` ${ui.chip(`Wanted: ${evName[ck.want]}`, { tone: 'warning', size: 'sm' })}` : ''} ${ui.sourceChip(ck.startRule)}`], ['Send by', `${esc(M.fmtDate(ck.sendBy, { year: true }))} · ${ck.daysLeft < 0 ? esc(-ck.daysLeft + ' days past') : esc(ck.daysLeft + ' days left')} of ${esc(ck.days)} ${ui.sourceChip(ck.rule)}`]] : [['Starts', `When ${esc(evName[ck.want] || ck.want)} ${ui.sourceChip(ck.startRule)}`], ['Send by', `${esc(ck.days)} days after that ${ui.sourceChip(ck.rule)}`]];
    return { sum: con.signed ? `Consent signed · ${ck.sendBy ? 'send by ' + M.fmtDate(ck.sendBy) : 'clock not started'}` : ck.sendBy ? `Send by ${M.fmtDate(ck.sendBy)}` : 'Clock not started', body: `${dl(consentRows)}<h3 class="a-h3">Initial request clock</h3>${dl(clockRows)}` };
  }

  // ---------------------------------------------------------------------------------------------------------- wiring
  after(root) {
    const H = {
      sendlink: () => this.sendLink(), sched: () => this.sched(), grant: () => this.grant(), offer: () => this.offer(), intake: () => this.offerIntake(), hold: () => this.hold(), unhold: () => this.unhold(),
      record: () => this.record(), recheck: () => this.setState({ recheck: !this.state.recheck, el: null }), proof: b => this.proof(+b.dataset.i),
      'open-sec': b => { const k = b.dataset.sec; this.state.open[k] = true; this.repaint(); setTimeout(() => { const d = document.getElementById('sec-' + k); if (d) d.scrollIntoView({ block: 'start' }); }, 30); }
    };
    root.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => { const fn = H[b.dataset.x]; if (fn) fn(b); }; });
    root.querySelectorAll('details[data-sec]').forEach(d => d.addEventListener('toggle', () => { this.state.open[d.dataset.sec] = d.open; if (d.open) ui.query.writeQuery({ panel: d.dataset.sec }); }));
    const el = this.state.el;
    const bind = (id, k, rep) => { const x = root.querySelector(id); if (x) x.onchange = () => { this.state.el = { ...(this.state.el || {}), [k]: x.value }; if (rep) this.repaint(); }; };
    bind('#a-el-r', 'result', true); bind('#a-el-p', 'plan'); bind('#a-el-e', 'effective');
    if (this.panel) { const k = this.panel; this.panel = null; setTimeout(() => { const d = document.getElementById('sec-' + k); if (d) d.scrollIntoView({ block: 'start' }); }, 60); }
  }
  async run(action, args, ok) { try { const res = await this.do(action, args); if (ok) toast(ok); return res === undefined ? true : res; } catch { return null; } }   // null = refused (the server's reason was toasted)
  form(o) { return ui.modal({ title: o.title, size: o.size || 'md', body: o.body, initialFocus: o.focus, onMount: o.onMount, actions: [{ label: 'Cancel', tone: 'secondary' }, { label: o.label, tone: o.tone || 'primary', onClick: async h => { try { return await o.run(h.dialog, h); } catch { return false; } } }] }); }
  async sendLink() { const v = this.v; this.state.open.link = true; const r = await this.run('familyLink.send', { referral: v.r.id }, 'Family link sent by text (SMS stub, simulated) · see it below'); if (r) this.repaint(); }
  sched() {
    const v = this.v; const r = v.r; const s = this.s; const sch = this.state.sched || (this.state.sched = this.schedDefaults(r));
    const fl = v.fl; const best = String(fl?.answers?.best_time || ''); const g = fl?.submitted_at ? fl.answers : null; const guardian = v.c?.guardian || {};
    const callWho = (g?.relationship || guardian.relationship || 'Guardian').replace(/^\w/, ch => ch.toUpperCase()); const callPhone = g?.phone || guardian.phone || 'phone from the family link';
    const timeOpts = [['14:00', '2:00 pm'], ['10:00', '10:00 am'], ['15:30', '3:30 pm']].map(([val, t]) => `<option value="${val}"${sch.time === val ? ' selected' : ''}>${esc(t + ((/afternoon/i.test(best) && val === '14:00') || (/morning/i.test(best) && val === '10:00') ? ` (guardian said ${/afternoon/i.test(best) ? 'afternoons' : 'mornings'})` : ''))}</option>`).join('');
    const whoOpts = s.staff.filter(x => x.role === 'clinician').map(x => `<option value="${esc(x.id)}"${sch.who === x.id ? ' selected' : ''}>${esc(x.name + (x.credential ? ', ' + x.credential : ''))}</option>`).join('');
    this.form({ title: `${v.booked ? 'Reschedule' : 'Schedule'} the screening call · ${v.short}`, label: 'Save and text the guardian', focus: '#sc-who',
      body: `<div class="a-form"><label class="ui-field"><span class="ui-field__l">Who makes the call</span><select class="ui-select" id="sc-who">${whoOpts}</select></label><label class="ui-field"><span class="ui-field__l">Date</span><input class="ui-input" id="sc-date" type="date" min="${esc(s.today)}" value="${esc(sch.date)}"></label><label class="ui-field"><span class="ui-field__l">Time</span><select class="ui-select" id="sc-time">${timeOpts}</select></label></div>
        <p class="a-sub">${esc(callWho)} · ${esc(callPhone)} · ${g ? 'from the family link' : 'from the school'} · 30–45 min by phone</p>
        <label class="a-check"><input type="checkbox" id="sc-text" checked> Text the guardian a confirmation and a reminder the morning of ${ui.maturity('family.link')}</label>
        <label class="a-check"><input type="checkbox" id="sc-ask" checked> Ask the counselor for schedule and grades before the call</label>`,
      run: async d => {
        const date = d.querySelector('#sc-date').value; if (!date) { toast('Pick a date', 'err'); return false; }
        const x = await this.run('referral.scheduleAndText', { id: r.id, who: d.querySelector('#sc-who').value, when: `${date}T${d.querySelector('#sc-time').value}`, text_guardian: d.querySelector('#sc-text').checked, ask_counselor: d.querySelector('#sc-ask').checked }, 'Screening call saved · it is on My Work and in the Lauris panel');
        if (x) this.state.sched = null; return x ? undefined : false;
      } });
  }
  grant() {
    const v = this.v; const r = v.r; const school = v.school.name.split('·').pop().trim();
    this.form({ title: 'Route to the grant program', label: 'Route and notify', focus: '#gr-why',
      body: `<p class="ui-muted">For students without Medicaid. Grant program: no Medicaid needed, no diagnosis required.</p><label class="ui-field"><span class="ui-field__l">Reason</span><select class="ui-select" id="gr-why">${['No Medicaid', 'Medicaid lapsed', 'Family declined Medicaid service'].map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
        <dl class="ui-dl"><div class="ui-dl__r"><dt>Told</dt><dd>Grant program lead by email with a secure link · site supervisor, ${esc(school)}, by email and text · the counselor</dd></div><div class="ui-dl__r"><dt>Then</dt><dd>Moves to the Grant program list · no request is created</dd></div></dl><p class="a-sub">Emails and texts are stubs (Simulated) and are logged on the referral.</p>`,
      run: async d => { const x = await this.run('referral.routeAndNotify', { id: r.id, why: d.querySelector('#gr-why').value }, 'Routed to the grant program · notices logged (stubs)'); return x ? undefined : false; } });
  }
  hold() {
    const v = this.v; const r = v.r;
    this.form({ title: `Hold ${r.id} and tell the family`, label: 'Hold and text the guardian', focus: '#hd-why',
      body: `<p class="ui-muted">The referral stays in Referrals with a hold. Psyflo texts the guardian that Harvest will call about coverage (SMS stub, logged on the referral).</p><label class="ui-field"><span class="ui-field__l">Why</span><select class="ui-select" id="hd-why"><option>Medicaid not active</option><option>Medicaid ID did not match · ask the guardian</option><option>Waiting for the guardian to renew coverage</option></select></label>`,
      run: async d => { const x = await this.run('referral.hold', { id: r.id, why: d.querySelector('#hd-why').value }, 'Referral held · guardian texted (SMS stub, simulated)'); return x ? undefined : false; } });
  }
  async unhold() { await this.run('referral.unhold', { id: this.v.r.id }, 'Hold lifted'); }
  async offer() { const r = await this.run('screening.offer', { referral: this.v.r.id }, "Texted the guardian a link to book the screening call (SMS stub, simulated). Open times come from the clinicians' calendars."); if (r) this.repaint(); }
  async offerIntake() { const v = this.v; await this.run('intake.offer', { client: v.c.id, referral: v.r.id }, 'Texted the guardian a link to book the in-person intake (SMS stub, simulated). A ride request lands on My Work.'); }
  async record() {
    const v = this.v; const f = this.state.el || {};
    if (f.result !== 'inactive' && !f.plan) return toast('Pick the plan DMAS shows', 'err');
    if (f.result !== 'inactive' && !f.effective) return toast('Add the effective date DMAS shows', 'err');
    const res = await this.run('eligibility.recordProof', { referral: v.r.id, result: f.result || 'active', plan: f.plan || null, effective: f.effective || null }, null);
    if (res) { this.state.recheck = false; this.state.el = null; toast(`Recorded · ${res.screenshot} stored in Psyflo · re-check reminder set`); this.repaint(); }
  }
  proof(i) {
    const h = this.v.elp.history[i]; if (!h) return; const rec = h.record; const s = this.s;
    if (rec.file) { window.open(rec.file, '_blank', 'noopener'); return; }
    const payer = M.byId(s.payers, rec.plan);
    ui.modal({ title: rec.screenshot || 'DMAS screenshot', body: `<p class="ui-muted">Proof kept in Psyflo, not in Lauris. Seeded record: the demo has no image for checks made before it started.</p><div class="a-letter"><b>Virginia Medicaid (DMAS) · eligibility lookup</b>\nResult: ${esc(rec.result)}${payer ? ' · ' + esc(payer.name) : ''}${rec.effective ? ' · effective ' + esc(M.fmtDate(rec.effective, { year: true })) : ''}\nLooked up ${esc(M.fmtDateTime(rec.checked_at, { year: true }))} by ${esc(M.staff(s, rec.checked_by).name)} in their own DMAS login</div>`, actions: [{ label: 'Close', tone: 'primary' }] });
  }
});
