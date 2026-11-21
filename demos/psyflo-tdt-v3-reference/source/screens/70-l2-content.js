/* Content of the DMAS authorization forms in Lauris, per case. Fictional: initials only, no IDs. Demo values.
   PSY.l2.content(caseId) -> { 'crit1.sub': { t:'text', tone:'g'|'a'|'', g:'group' }, ... }
     tone 'g'  Lauris filled it from the record (green)
     tone 'a'  typed by Psyflo from the draft the clinician approved (amber)
     tone ''   text Lauris already saved
     g         drafted-box group: a box with a group stays empty until the draft is typed into the form (T.W. and M.R. only)
   For Yes/No ticks the value is 'y' or 'n' in .t. Keys are the field keys of 71-dmas-form.js.
   Boxes that a recommended action writes into take their starting text from the action's `lauris.before` (30-reco-data.js) unless this file sets it. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const G = (t) => ({ t, tone: 'g' });
  const A = (t, g) => ({ t, tone: 'a', g });
  const P = (t) => ({ t, tone: '' });

  /* drafted-box groups ("Fill all N boxes") */
  L2.GROUPS = {
    'R-0416': [['request', 'Request dates and units'], ['crit1', 'Criterion 1 · relationships'], ['crit2', 'Criterion 2 · interventions tried'], ['loc', 'Level of care'], ['coord', 'Section II · care coordination'], ['strengths', 'Resources and strengths'], ['barriers', 'Barriers to treatment'], ['schoolfam', 'School and family coordination'], ['discharge', 'Section V · discharge plan']],
    'R-0411': [['request', 'Request dates, units and hours'], ['coordsince', 'Care coordination since the last authorization'], ['g1', 'Goal 1 · progress and lack of progress'], ['g23', 'Goals 2 and 3'], ['strengths', 'Resources and strengths'], ['family', 'Family involvement'], ['discharge', 'Discharge planning']],
  };

  const META = {
    'R-0416': { first: 'T.', last: 'W.', age: 12, gender: 'Male', guard: 'Grandmother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F91.3 · Oppositional defiant disorder', assess: '10/20/2026', sent: '' },
    'R-0411': { first: 'M.', last: 'R.', age: 7, gender: 'Male', guard: 'Grandmother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F90.2 · Attention-deficit/hyperactivity disorder, combined type', assess: '09/29/2026', admit: 'Feb 3, 2026', avg: '14.6 (direct-hours log)', sent: '' },
    'R-0408': { first: 'K.', last: 'T.', age: 9, gender: 'Female', guard: 'Mother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F91.9 · Conduct disorder, unspecified', assess: '10/14/2026', sent: '10/21/2026' },
    'R-0402': { first: 'D.', last: 'W.', age: 12, gender: 'Male', guard: 'Mother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F34.81 · Disruptive mood dysregulation disorder', assess: '09/22/2026', admit: 'Mar 10, 2026', avg: '13.9 (direct-hours log)', sent: '10/13/2026' },
    'R-0399': { first: 'A.', last: 'L.', age: 6, gender: 'Female', guard: 'Parent (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F43.24 · Adjustment disorder with disturbance of conduct', assess: '10/08/2026', sent: '10/19/2026' },
    'R-0391': { first: 'J.', last: 'O.', age: 14, gender: 'Male', guard: 'Mother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F91.1 · Conduct disorder, childhood-onset type', assess: '10/12/2026', sent: '10/20/2026', meds: [['Guanfacine', 'as prescribed', 'daily']] },
    'R-0388': { first: 'T.', last: 'N.', age: 8, gender: 'Female', guard: 'Mother (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F91.3 · Oppositional defiant disorder', assess: '09/30/2026', sent: '10/09/2026' },
    'R-0384': { first: 'E.', last: 'C.', age: 5, gender: 'Female', guard: 'Grandmother (legal guardian)', proc: 'H2016', units: 90, hours: 15, dx: 'F43.10 · Post-traumatic stress disorder, unspecified', assess: '10/08/2026', sent: '10/12/2026' },
    'R-0395': { first: 'S.', last: 'B.', age: 11, gender: 'Male', guard: 'Father (legal guardian)', proc: 'H2016', units: 150, hours: 15, dx: 'F41.1 · Generalized anxiety disorder', assess: '10/21/2026', admit: 'Jan 12, 2026', avg: '12.0 (direct-hours log)', sent: '' },
    'R-0380': { first: 'L.', last: 'V.', age: 16, gender: 'Female', guard: 'Parent (legal guardian)', proc: 'UG', units: 60, hours: 5, dx: 'F43.23 · Adjustment disorder with mixed anxiety and depressed mood', assess: '09/15/2026', admit: 'Sep 8, 2025', avg: '5.0 (direct-hours log)', sent: '' },
  };
  /* school data for criterion 1 (initial form): IEP, unexcused absences, in-school and out-of-school days, classes */
  const SCHOOL = {
    'R-0416': ['y', '9', '1 day (Oct 6)', '0', '7 taking · 4 passing'], 'R-0408': ['y', '2', '0', '0', '6 taking · 5 passing'], 'R-0399': ['n', '4', '0', '0', '5 subjects · 3 passing'],
    'R-0391': ['y', '6', '3 days', '1 day', '7 taking · 4 passing'], 'R-0388': ['y', '2', '0', '0', '6 taking · 3 passing'], 'R-0384': ['y', '4', '0', '0', '5 taking · 5 passing'],
  };
  const RISK = {
    'R-0416': 'The school has raised alternative placement twice this school year. T.W. is at risk of removal from his current setting to a more restrictive school placement if the behaviour continues without daily on-site intervention.',
    'R-0408': 'Office referrals are rising. Further incidents put K.T. at risk of suspension and of a move to a more restrictive school setting.',
    'R-0399': 'The school has asked for a classroom aide twice. Without daily on-site intervention A.L. is at risk of removal from the classroom.',
    'R-0391': 'The school has raised alternative placement after the latest incident. Without daily support J.O. is at risk of removal from the setting.',
    'R-0388': 'An alternative placement was raised at the Oct 14 IEP meeting. Without daily intervention T.N. is at risk of a move to a more restrictive setting.',
    'R-0384': 'Four early pickups and running from the classroom. Without daily help at lunch and transitions E.C. is at risk of removal from the classroom.',
  };
  const LOC = {
    'R-0416': 'The school has raised alternative placement twice this school year. Weekly elopement from the building (10–30 minutes) and the Oct 6 suspension place T.W. at risk of removal from his current setting without daily on-site intervention. TDT programming during the school day is needed to keep him in his classroom.',
    'R-0408': 'Behaviours happen mostly in unstructured periods, where the IEP supports are not in the room. TDT programming during the school day is needed to supplement the IEP and keep K.T. in his classroom.',
    'R-0399': 'Daily aggression toward peers and staff at arrival and transitions; the school has asked for a classroom aide twice. Without TDT during the school day A.L. risks removal from the classroom.',
    'R-0391': 'J.O. cannot be kept in class safely without daily clinical support: a step-down to 2 units a day failed within 3 days (week of Sep 22).',
    'R-0388': 'The school raised an alternative placement at the Oct 14 IEP meeting. Without daily TDT intervention she is at risk of being moved.',
    'R-0384': 'The IEP gives 5 minutes of check-in a day. It gives no clinical help at lunch and transitions, where 4 of 6 incidents happened. Without TDT E.C. cannot stay in the classroom safely.',
  };
  const STRENGTHS = {
    'R-0416': 'T.W. enjoys basketball and drawing and responds to one-to-one adult attention. His grandmother has raised him since age 4 and joined the screening call, the intake and the treatment plan meeting.',
    'R-0408': 'K.T. responds to a quiet one-to-one check-in and likes drawing. His mother is reachable by text and joined the screening call.',
    'R-0399': 'A.L. warms up quickly to a familiar adult and enjoys building games. The family answers every school call.',
    'R-0391': 'J.O. is good with younger students and likes woodworking. His mother joined 5 of 8 weekly calls.',
    'R-0388': 'T.N. is motivated by earning time with the school librarian. Her mother joins the weekly calls and the IEP meetings.',
    'R-0384': 'E.C. loves animals and music class. Her grandmother is committed and picks up on time every day.',
  };
  const BARRIERS = {
    'R-0416': 'Unstructured periods (lunch, transitions) are the highest-risk times. Transportation ended the last outpatient episode.',
    'R-0408': 'Unstructured periods are the highest-risk times: 5 of the 7 incidents happened there. Transportation ended the last outpatient episode.',
    'R-0399': 'Arrival and transitions are the highest-risk times of the day. No IEP yet; the school asked for an evaluation in September.',
    'R-0391': 'Unstructured periods (lunch, transitions) are the highest-risk times of day. Transportation is reliable. The family is reachable by phone every week.',
    'R-0388': 'Lunch and transitions: 6 of the 9 incidents in the last 30 days.',
    'R-0384': 'Lunch and transitions: 4 of 6 incidents. The family has one car and appointments are hard to keep.',
  };

  function head(cid, M, c) {
    const pay = (PSY.data.payers[c.payer] || {}).name || '';
    const camp = c.loc === 'campbell';
    const sch = (c.school || '').replace(' · ', ' · ');
    return {
      'm.first': G(M.first), 'm.last': G(M.last), 'm.medicaid': G('on file'), 'm.dob': G('on file · age ' + M.age), 'm.gender': { t: M.gender, tone: 'g' }, 'm.plan': G('on file · ' + pay),
      'm.addr': G('on file'), 'm.city': G(camp ? 'Rustburg, VA' : 'Lynchburg, VA'), 'm.guard': G(M.guard), 'm.gcontact': G('phone on file'),
      'p.org': G('Harvest Outreach Center'), 'p.npi': G('on file'), 'p.tax': G('on file'), 'p.phone': G('on file'), 'p.email': G('on file'), 'p.addr': G('on file'), 'p.city': G('on file'), 'p.fax': G('on file'),
      'p.contact': G('Jordan Perez, LPC'), 'p.cphone': G('on file'), 'p.provnpi': G('on file · J. Perez, LPC'),
      proc: G(M.proc), school: G(sch), svc: G('TDT'),
      icd1: G(M.dx), icd2: G('None'),
      'att.assess': G(M.assess), 'att.name': G('Jordan Perez, LPC'), 'att.cred': G('LPC · NPI on file in the Lauris user record'),
    };
  }
  function meds(M, out) {
    const ms = M.meds || [];
    for (let i = 1; i <= 4; i++) { const r = ms[i - 1] || ['', '', '']; out['med.r' + i + '.name'] = G(r[0]); out['med.r' + i + '.dose'] = G(r[1]); out['med.r' + i + '.freq'] = G(r[2]); }
  }
  const behaviours = (h) => ((h.picture || {}).behaviours || []).map((b) => b.name + ': ' + b.freq + ', ' + b.dur + ', ' + String(b.int || '').toLowerCase() + ' intensity.').join(' ');
  const isCurrent = (ps) => /since|weekly|× a week|now|ongoing|present|reviewed/i.test((ps.when || '') + ' ' + (ps.out || ''));

  /* ------------------------------------------------------------------ T.W. · initial · authored in full */
  function buildTW(cid, M, c) {
    const o = head(cid, M, c);
    Object.assign(o, {
      'req.from': A('10/27/2026', 'request'), 'req.to': A('01/23/2027', 'request'), 'req.units': A('150', 'request'), 'req.hours': A('15', 'request'), 'req.retro': G('n'), 'req.new': G('y'),
      'crit1.yn': A('y', 'crit1'),
      'crit1.risk': A(RISK[cid], 'crit1'),
      'crit1.sub': A('In the 30 days before referral T.W. was physically aggressive toward peers on 6 dated occasions (shoving, hitting), 2–3 times a week, lasting 5–20 minutes, moderate intensity; 2 office referrals and 1 day of in-school suspension followed. Verbal aggression toward peers and adults occurs daily. He left the building about weekly (10–30 minutes, high intensity); last on Oct 6.', 'crit1'),
      'sch.iep': G('y'), 'sch.unexc': G('9'), 'sch.iss': G('1 day (Oct 6)'), 'sch.oss': G('0'), 'sch.classes': G('7 taking · 4 passing'),
      'crit2.yn': A('y', 'crit2'),
      'crit2.r1.prov': A('School behaviour interventionist, 2×/week (MS-2)', 'crit2'), 'crit2.r1.cur': A('y', 'crit2'), 'crit2.r1.dates': A('Sep 2026 – present', 'crit2'), 'crit2.r1.out': A('No reduction in incidents (school counselor, Oct 15).', 'crit2'),
      'crit2.r2.prov': A('Outpatient therapy, Piedmont Counseling', 'crit2'), 'crit2.r2.cur': A('n', 'crit2'), 'crit2.r2.dates': A('Mar – Jun 2025 · 6 sessions', 'crit2'), 'crit2.r2.out': A('Ended: transportation (CNA, Oct 20). Whether behaviours changed is not written here.', 'crit2'),
      'crit3.yn': { t: '', tone: '' }, 'crit3.sub': P(''),
      'loc.b.yn': A('y', 'loc'), 'loc.b.sub': A(LOC[cid], 'loc'),
      pcp: G('Pediatrician on file (name in the consumer record)'),
      'other.yn': A('y', 'coord'), 'other.sub': A('Asthma; the inhaler is kept with the school nurse. No substance use, personality disorder or cognitive concern reported.', 'coord'),
      'svc.r1.name': A('School behaviour interventionist', 'coord'), 'svc.r1.who': A('MS-2 · school counselor on file', 'coord'), 'svc.r1.freq': A('2×/week', 'coord'),
      'svc.r2.name': A('Pediatrician', 'coord'), 'svc.r2.who': A('on file', 'coord'), 'svc.r2.freq': A('As needed', 'coord'),
      'svc.r3.name': A('IEP team: behaviour plan, check-in/check-out', 'coord'), 'svc.r3.who': A('MS-2 case manager', 'coord'), 'svc.r3.freq': A('Daily check-in; plan reviewed Mar 2026', 'coord'),
      coordplan: A('Monthly collateral contact with the school counselor and the pediatrician; attend IEP meetings; weekly contact with the grandmother (guardian) by phone.', 'coord'),
      'trauma.yn': { t: '', tone: '' }, sec3: P(''),
      strengths: A(STRENGTHS[cid], 'strengths'), barriers: A(BARRIERS[cid], 'barriers'),
      schoolfam: A('Daily check-in with the school counselor and teachers at drop-off and pick-up; a weekly progress summary to the school and the IEP case manager; attendance at IEP meetings; weekly phone contact with his grandmother.', 'schoolfam'),
      'g1.obj': G('Use a taught coping strategy before leaving the room, 4 of 5 times'), 'g1.days': G('5'), 'g1.int': G('Movement, Psychoeducation'), 'g1.lmhp': G('1 hour per week of on-site supervision and counseling'), 'g1.noc': G('Not applicable: an LMHP provides it on site.'),
      'g2.obj': G('Respond to peer conflict without physical contact, 4 of 5 times'), 'g2.days': G('5'), 'g2.int': G('Solving peer conflict'), 'g2.lmhp': G('1 hour per week of on-site supervision and counseling'), 'g2.noc': G('Not applicable: an LMHP provides it on site.'),
      'g3.obj': G('Stay in class for the full period, 4 of 5 days'), 'g3.days': G('5'), 'g3.int': G('Recognize danger / healthy boundaries'), 'g3.lmhp': G('1 hour per week of on-site supervision and counseling'), 'g3.noc': G('Not applicable: an LMHP provides it on site.'),
      'dsch.r1.step': A('Outpatient counseling', 'discharge'), 'dsch.r1.who': A('Piedmont Counseling, if the guardian agrees', 'discharge'), 'dsch.r1.plan': A('Warm hand-off in the last two weeks; the school counselor joins the transition meeting.', 'discharge'),
      'dsch.r2.step': A('School supports (IEP, check-in/check-out)', 'discharge'), 'dsch.r2.who': A('MS-2 school counselor', 'discharge'), 'dsch.r2.plan': A('Share the safety plan and the strategies that worked; first month checked weekly.', 'discharge'),
      dloc: A('Outpatient counseling plus school supports', 'discharge'), ddate: A('June 2027', 'discharge'),
      addl: G('None'),
    });
    meds({ meds: [['Albuterol inhaler (asthma)', 'as directed', 'as needed']] }, o);
    return o;
  }

  /* ------------------------------------------------------------------ M.R. · concurrent SRA · authored in full */
  function buildMR(cid, M, c) {
    const o = head(cid, M, c);
    Object.assign(o, {
      'svc.tdt': G('y'), admit: G(M.admit), avg: G(M.avg),
      'req.from': A('11/16/2026', 'request'), 'req.to': A('02/13/2027', 'request'), 'req.units': A('150', 'request'), 'req.hours': A('15', 'request'),
      'svc.r1.name': G('School counselor, weekly'), 'svc.r1.who': G('ES-1 · counselor on file'), 'svc.r1.freq': G('Weekly; monthly collateral'),
      'svc.r2.name': G('Pediatrician'), 'svc.r2.who': G('on file'), 'svc.r2.freq': G('Reviewed Oct 1; no change'),
      coordsince: A('Monthly contact with the school counselor (Oct 1, Sep 3, Aug 29) and the pediatrician; IEP review scheduled Nov 4 at Harvest’s request. No medication change. His grandmother participates weekly by phone.', 'coordsince'),
      strengths: A('M.R. responds to visual timers and one-to-one tasks with a trusted adult. His grandmother joins the weekly calls and uses the calm-down corner at home.', 'strengths'),
      /* saved text carried over in Lauris from the last request: its second sentence is a population finding, not M.R.'s record (Scan & Enhance flags it) */
      barriers: P('Unstructured periods (lunch, transitions) remain the highest-risk time of day. Children with severe behavioural dysregulation are at increased risk of academic failure and social rejection (citation library, reviewed Oct 2026).'),
      'g1.obj': G('M.R. will use a taught coping strategy before leaving the room in 4 of 5 escalations.'), 'g1.days': G('5'), 'g1.int': G('Taught coping strategy, visual timer, re-entry prompts by staff'), 'g1.measure': G('Daily notes: count of escalations, and whether the strategy was used first.'),
      'g1.progress': A('In the last 30 days M.R. used a taught strategy before leaving the room in 3 of 5 escalations, up from 1 of 6 in the prior period. On-task time in math rose from about 10 to 15 of 30 minutes with a visual timer and two re-entry prompts. He needed staff presence to return to task every school day.', 'g1'),
      'g1.lack': A('Two escalations still ended in physical aggression or elopement (Oct 21 shove at lunch; Oct 6 elopement with 1 day ISS), both in unstructured time. ISP changed: lunch and transitions now carry a named staff member and a pre-set regulation break; the safety plan was reviewed with the guardian.', 'g1'),
      'g2.obj': G('M.R. will wait for a turn without grabbing or shoving in 4 of 5 group activities.'), 'g2.days': G('5'), 'g2.int': G('Turn-taking practice in structured group games'), 'g2.measure': G('Daily notes: count per group activity.'),
      'g2.progress': A('Waited for a turn in 3 of 5 group activities, up from 2 of 5 (23 notes).', 'g23'),
      'g2.lack': A('No lack of progress. The quiet week of Oct 12–16 is written as maintenance, not “goals met”.', 'g23'),
      'g3.obj': G('M.R. will stay on task for 20 of 30 minutes in structured lessons on 4 of 5 school days.'), 'g3.days': G('5'), 'g3.int': G('Visual supports, structured problem solving'), 'g3.measure': G('Daily notes: minutes on task in a structured lesson.'),
      'g3.progress': A('On task for 15 of 30 minutes in math on 3 of 5 school days, up from about 10 minutes (23 notes).', 'g23'),
      'g3.lack': A('He still needs a staff prompt to re-enter a task after a break; the visual timer is being faded in steps.', 'g23'),
      family: A('His grandmother (guardian) joined 11 of 12 weekly calls, practiced the calm-down corner at home and asked about continuity of placement. Continuing need: a consistent bedtime routine.', 'family'),
      'dsch.r1.step': A('Outpatient counseling plus school supports', 'discharge'), 'dsch.r1.who': A('to be identified with the guardian', 'discharge'), 'dsch.r1.plan': A('Warm hand-off in the last two weeks; school counselor joins the transition meeting.', 'discharge'),
      dloc: A('Outpatient counseling plus school supports', 'discharge'), ddate: A('June 2027', 'discharge'),
      addl: G('None'),
    });
    meds({ meds: [] }, o);
    return o;
  }

  /* ------------------------------------------------------------------ the other cases: built from the case hub (what Psyflo read from Lauris) */
  function buildAuto(cid, M, c) {
    const o = head(cid, M, c); const h = (PSY.data.hub || {})[cid] || {}; const pic = h.picture || {}; const init = L2.kind(cid) === 'init';
    const sentTxt = P;
    o.addl = G('None');
    meds({ meds: M.meds || [] }, o);
    const ps = (pic.priorServices || []).slice(0, 4);
    if (init) {
      const sc = SCHOOL[cid] || ['n', '', '', '', ''];
      Object.assign(o, {
        'req.from': sentTxt(L2.dates(cid)[0]), 'req.to': sentTxt(L2.dates(cid)[1]), 'req.units': sentTxt(String(M.units)), 'req.hours': sentTxt(String(M.hours)), 'req.retro': G('n'), 'req.new': G(cid === 'R-0391' ? 'n' : 'y'),
        'crit1.yn': P('y'), 'crit1.risk': P(RISK[cid] || ''), 'crit1.sub': P(behaviours(h)),
        'sch.iep': G(sc[0]), 'sch.unexc': G(sc[1]), 'sch.iss': G(sc[2]), 'sch.oss': G(sc[3]), 'sch.classes': G(sc[4]),
        'crit2.yn': P('y'), 'crit3.yn': P(''), 'crit3.sub': P(''),
        'loc.b.yn': P('y'), 'loc.b.sub': P(LOC[cid] || ''),
        pcp: G('Pediatrician on file'), 'other.yn': P('n'), 'other.sub': P(''),
        coordplan: P('Monthly collateral contact with the school counselor and the pediatrician; attend IEP meetings; weekly contact with the guardian by phone.'),
        'trauma.yn': P(cid === 'R-0384' ? 'y' : ''), sec3: P(cid === 'R-0384' ? 'Evidence of trauma is in the CNA. Plan: trauma-informed routine at arrival and transitions, a consistent trusted adult, referral to a trauma-focused outpatient therapist when the family is ready.' : cid === 'R-0399' ? 'No evidence of trauma identified at intake. Staff will watch for changes at arrival and refer if that changes.' : 'Written by the clinician in the request as sent (Section III).'),
        strengths: P(STRENGTHS[cid] || ''), barriers: P(BARRIERS[cid] || ''),
        schoolfam: P('Daily check-in with the school counselor and teachers; weekly progress summary to the school; attendance at IEP meetings; weekly phone contact with the guardian.'),
        'g1.obj': P('Use a taught coping strategy before leaving the room, 4 of 5 times'), 'g1.days': P('5'), 'g1.int': P('Movement, Psychoeducation'), 'g1.lmhp': P('1 hour per week of on-site supervision and counseling'), 'g1.noc': P('Not applicable: an LMHP provides it on site.'),
        'g2.obj': P('Respond to peer conflict without physical contact, 4 of 5 times'), 'g2.days': P('5'), 'g2.int': P('Solving peer conflict'), 'g2.lmhp': P('1 hour per week of on-site supervision and counseling'), 'g2.noc': P('Not applicable: an LMHP provides it on site.'),
        'g3.obj': P('Stay in class for the full period, 4 of 5 days'), 'g3.days': P('5'), 'g3.int': P('Recognize danger / healthy boundaries'), 'g3.lmhp': P('1 hour per week of on-site supervision and counseling'), 'g3.noc': P('Not applicable: an LMHP provides it on site.'),
        'dsch.r1.step': P('Outpatient counseling plus school supports'), 'dsch.r1.who': P('to be identified with the guardian'), 'dsch.r1.plan': P('Warm hand-off in the last two weeks; school counselor joins the transition meeting.'),
        dloc: P('Outpatient counseling plus school supports'), ddate: P('June 2027'),
      });
      ps.forEach((x, i) => {
        const n = i + 1;
        o['crit2.r' + n + '.prov'] = P(x.who); o['crit2.r' + n + '.cur'] = P(isCurrent(x) ? 'y' : 'n'); o['crit2.r' + n + '.dates'] = P(x.when); o['crit2.r' + n + '.out'] = P(x.out);
      });
      ps.slice(0, 3).forEach((x, i) => { const n = i + 1; o['svc.r' + n + '.name'] = P(x.who); o['svc.r' + n + '.who'] = P('on file'); o['svc.r' + n + '.freq'] = P(x.when); });
    } else {
      Object.assign(o, {
        'svc.tdt': G('y'), admit: G(M.admit), avg: G(M.avg),
        'req.from': P(L2.dates(cid)[0]), 'req.to': P(L2.dates(cid)[1]), 'req.units': P(String(M.units)), 'req.hours': P(String(M.hours)),
        coordsince: P(((h.draft || []).find((d) => d.crit === 'coord') || {}).text || 'Monthly contact with the school counselor and pediatrician. No medication change. The guardian participates weekly by phone.'),
        strengths: P(STRENGTHS[cid] || 'Responds to one-to-one adult attention. The guardian joins most weekly calls.'), barriers: P('Unstructured periods (lunch, transitions) remain the highest-risk time of day.'),
        'g1.obj': P('Use a taught coping strategy before leaving the room, 4 of 5 times'), 'g1.days': P('5'), 'g1.int': P('Taught coping strategy, re-entry prompts by staff'), 'g1.measure': P('Daily notes: count of escalations, and whether the strategy was used first.'),
        'g2.obj': P('Respond to peer conflict without physical contact, 4 of 5 times'), 'g2.days': P('5'), 'g2.int': P('Solving peer conflict'), 'g2.measure': P('Daily notes: count per incident.'),
        'g3.obj': P('Stay in class for the full period, 4 of 5 days'), 'g3.days': P('5'), 'g3.int': P('Check-in at the door; named staff at transitions'), 'g3.measure': P('Daily notes: count of school days in class.'),
        'dsch.r1.step': P('Outpatient counseling plus school supports'), 'dsch.r1.who': P('to be identified with the guardian'), 'dsch.r1.plan': P('Warm hand-off in the last two weeks.'),
        dloc: P('Outpatient counseling plus school supports'), ddate: P('June 2027'),
      });
      if (cid === 'R-0402') {
        Object.assign(o, {
          'g1.progress': P('Used a taught strategy before leaving the room in 3 of 5 escalations, up from 1 of 6.'), 'g1.lack': P('Two escalations in September still ended with D.W. leaving the building. ISP changed Sep 24: a named staff member joins lunch twice a week and a check-in at the door each morning.'),
          'g2.progress': P('Shoves fell from 3 a week to 1.'), 'g2.lack': P('No lack of progress.'), 'g3.progress': P('Stayed for the full period on 3 of 5 days, up from 1.'), 'g3.lack': P('Still leaves class after unstructured periods.'),
          family: P('Mother joined 9 of 12 weekly calls; practised the calm-down plan at home. Continuing need: consistent morning routine.'),
        });
      } else {
        Object.assign(o, {
          'g1.progress': P(cid === 'R-0395' ? 'Nurse visits fell from 5 to 3 a week; avoided class for a presentation 2 times a week (was 3).' : 'Steady; mood and attendance stable.'), 'g1.lack': P('No lack of progress.'),
          'g2.progress': P('Steady.'), 'g2.lack': P('No lack of progress.'), 'g3.progress': P('Steady.'), 'g3.lack': P('No lack of progress.'),
          family: P(cid === 'R-0395' ? 'His father joins most weekly calls.' : 'The guardian joins most weekly calls.'),
        });
      }
      ps.slice(0, 2).forEach((x, i) => { const n = i + 1; o['svc.r' + n + '.name'] = P(x.who); o['svc.r' + n + '.who'] = P('on file'); o['svc.r' + n + '.freq'] = P(x.when); });
    }
    return o;
  }

  const CACHE = {};
  /* the text a box starts with is the action's `before` when the action writes into it and this file did not set it */
  const blankBefore = (b) => !b || /^(Empty|Not |No |Outcome blank|Last collateral)/.test(b);
  L2.content = (cid) => {
    if (CACHE[cid]) return CACHE[cid];
    const c = PSY.caseView(cid); const M = META[cid]; if (!c || !M) return (CACHE[cid] = {});
    const fill = cid === 'R-0416' ? buildTW(cid, M, c) : cid === 'R-0411' ? buildMR(cid, M, c) : buildAuto(cid, M, c);
    if (cid !== 'R-0416' && cid !== 'R-0411' && PSY.reco) {
      const seen = {};
      PSY.reco.raw(cid).actions.forEach((a) => {
        const k = (a.lauris || {}).key; if (!k || seen[k]) return; seen[k] = 1;
        fill[k] = { t: blankBefore(a.lauris.before) ? '' : a.lauris.before, tone: (fill[k] && fill[k].tone) || '' };
      });
    }
    return (CACHE[cid] = fill);
  };
  L2.meta = (cid) => META[cid] || null;
  L2.sentDate = (cid) => (META[cid] || {}).sent || '';
})();
