/* Recommended actions for every case: PSY.data.reco[caseId].
   Contract: see the top of src/reco.js. Every action is done on the DMAS authorization form in Lauris (route lauris-dmas), in Scan & Enhance (76-enhance.js).
   `lauris` therefore names a box of the DMAS form: the initial TDT form ('sra', July 2021) or the CMHRS continued stay form ('sra-cs', Dec 2021).
   Optional keys on top of the contract (read by src/screens/72-dmas-reco-panel.js, which also defines PSY.reco.target(case, action)):
     action.short / .why / .bullets   not shown by Scan & Enhance (a card is its title, the input, its provenance label and citations); still read by the case page (20-case.js) and 79-flow-decision.js
     action.need                true: Clinician Input Required. Scan & Enhance shows an empty box or unpicked options and never drafts it (also: crit 'trauma')
     action.cites               record labels Scan & Enhance cites on the card (PSY.ev.cite); otherwise the case hub's draft sources for the same criterion
     action.lauris.key          box of the DMAS form (see FIELDS in 70-l2-content.js), e.g. 'sec3', 'crit2.r2.out', 'g1.lack', 'notes'
     action.lauris.mode         'replace' (default: the typed text replaces the box text) | 'append' (typed text is added after the box text)
     action.lauris.write        template for the text typed into the box; {value} is the clinician's input (default: the input as is)
     action.lauris.writes       for type 'choice': one typed text per option (same order as input.options); '' = type nothing (a decision only)
     action.lauris.yn           key of a Yes/No tick that the typed text turns to Yes (e.g. 'crit3.yn')
     action.lauris.link         { go, label }: another Lauris page the clinician may open for this action
     input.pick                 for type 'choice': index of the option Psyflo may copy as the drafted text before the clinician chooses (only where the record settles it)
     input.type 'date'          input.suggestion is an ISO date ('2026-10-22'); the value handed to PSY.reco.complete is 'Oct 22, 2026'
     input.type 'chips'         input.suggestion is the comma-separated list of options that start selected
   After an action is marked done the extension also stores PSY.state.actions[key].typed = the text now in the DMAS box and .field = the field name.
     action.open                true when the action addresses a requirement that is still open on the form (Process Form lists these before it runs)
     action.req                 optional rule id (PSY.data.r5.rules) the action addresses; otherwise PSY.reco.requirement(case, action) derives it from crit
   No approval probabilities or points: each action names the requirement it addresses and that requirement's source.
   Every fact is fictional (initials only). */
(function () {
  const PSY = window.PSY;
  if (!PSY || !PSY.data) return;
  const R = (PSY.data.reco = PSY.data.reco || {});

  /* ---------------- R-0416 · T.W., 12 · initial · Humana ---------------- */
  R['R-0416'] = {
    actions: [
      {
        id: 'a1', short: 'A blank box reads as “not assessed”.', crit: 'trauma', title: 'Write Section III · trauma-informed care', open: true, need: true, agent: 'Extension', needs: 'your words',
        cites: ['Intake with the guardian Oct 20', 'CNA Oct 20'],
        bullets: [
          'Section III is blank on the request. It is the only box Psyflo does not draft: it is clinical judgement.',
          'The intake on Oct 20 notes that the trauma section was discussed at 1:48 pm, but no content was recorded.',
          'The DMAS initial form asks for evidence of trauma and the plan (Section III). A blank section reads as “not assessed”.',
        ],
        why: 'The DMAS form asks whether there is evidence of trauma and what the plan is. A blank box reads as “not assessed”.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'sec3', mode: 'replace',
          section: 'Section III · Trauma-informed care', field: 'What is your plan to assess, refer and address the current and potential effects of that trauma?',
          before: 'Empty.' },
        input: { type: 'text', label: 'Evidence of trauma and the plan, in your words',
          placeholder: 'e.g. Raised by his grandmother since age 4 after … ; plan: predictable routine, one trusted adult at transitions …', suggestion: '' },
        result: 'Section III written in the DMAS form',
      },
      {
        id: 'a2', short: 'Makes criterion 2 count as a failed prior service.', crit: 'crit2', title: 'State the outpatient outcome in criterion 2', agent: 'Extension', needs: 'one choice',
        cites: ['Prior-services conversation Oct 16', 'CNA Oct 20'],
        bullets: [
          'The CNA (Oct 20) records that the outpatient episode (Piedmont Counseling, Mar–Jun 2025, 6 sessions) ended when transportation fell through.',
          'Criterion 2 rests on it. The school interventionist is “ongoing”, and the DMAS row only says “Ended: transportation”, which an insurer can read as the family’s choice, not a failed service.',
          'One choice settles what the outcome box says: who ended it and whether behaviours changed.',
        ],
        why: 'Insurers deny with “no documented failed prior service”. A dated outcome is what makes criterion 2 count.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit2.r2.out', mode: 'replace',
          section: 'Section I · Criterion 2 · prior services', field: 'Provider table, row 2 (Piedmont Counseling): Outcomes/Current Progress',
          before: 'Ended: transportation (CNA, Oct 20). Whether behaviours changed is not written here.',
          writes: [
            'Ended when the family lost transportation (guardian, Oct 20). Behaviours did not change during or after the 6 sessions.',
            'Ended by the provider in Jun 2025 for not making progress (guardian, Oct 20).',
            'Stopped by the family in Jun 2025; no reason given (guardian, Oct 20). Behaviours continued.',
          ] },
        input: { type: 'choice', label: 'How did the outpatient therapy end?', pick: 0,
          options: ['Ended when transportation fell through (no change in behaviour)', 'Discharged by the provider: not making progress', 'Family stopped; no reason given'], suggestion: '' },
        result: 'Outcome written in the DMAS form, criterion 2',
      },
      {
        id: 'a3', short: 'A third criterion, in the guardian’s own words.', crit: 'crit3', title: 'Write the guardian’s words in criterion 3', agent: 'Extension', needs: 'check her words',
        cites: ['Screening call Oct 16'],
        bullets: [
          'Two of the three criteria are already met (relationships, interventions). Criterion 3 was asked and answered on the Oct 16 screening call.',
          'The guardian said “He doesn’t see what could happen out there.” It is in the call, but not yet written as evidence in the criterion 3 box of the DMAS form. He also left for the parking lot on Oct 6 (1 day in-school suspension).',
          'Optional: skip it if two criteria are enough for Humana.',
        ],
        why: 'Eligibility needs 2 of 3. A third, in the guardian’s words, is hard to argue with if one of the others is challenged.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit3.sub', mode: 'replace',
          section: 'Section I · Criterion 3 · danger to self or others', field: 'Describe current symptoms and behaviors (frequency, intensity, duration)',
          before: 'Empty. Asked and answered on the Oct 16 call, not yet written here.',
          yn: 'crit3.yn',
          write: '{value} — grandmother (legal guardian), screening call Oct 16. T.W. left the building on Oct 6 (about 20 minutes, high intensity) and was given 1 day of in-school suspension.' },
        input: { type: 'text', label: 'What does his grandmother say when he leaves the building?',
          placeholder: 'In her words, one sentence', suggestion: '“He doesn’t see what could happen out there.”' },
        result: 'Guardian’s words written in the DMAS form, criterion 3',
      },
    ],
  };

  /* ---------------- R-0411 · M.R., 7 · concurrent SRA · Anthem ---------------- */
  R['R-0411'] = {
    actions: [
      {
        id: 'a1', short: '“Observed” can void a unit in an audit.', crit: 'wording', title: 'Replace “Observed” in the Oct 14 note', open: true, agent: 'Extension', needs: 'one sentence',
        cites: ['Daily note Oct 14'],
        bullets: [
          'The Oct 14 note by R. Diaz says “Observed the client during math”.',
          '“Observed” describes watching, not treatment. In an audit it can void the unit for that day.',
          'The concurrent SRA draft already uses the corrected sentence. The note in Lauris has to match it.',
        ],
        why: 'Anthem’s auditors read the daily notes. A note that only watches the consumer does not show a billable intervention.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'notes', mode: 'append',
          section: 'Notes section · Daily note Oct 14 (R. Diaz)', field: 'Notes section: the wording of the Oct 14 daily note',
          before: 'Empty.',
          link: { go: 'lauris-dpn?c=4471', label: 'Open the Oct 14 note' },
          write: 'Daily note Oct 14 (R. Diaz): the narrative should read “{value}”' },
        input: { type: 'text', label: 'Say what staff did, in one sentence',
          placeholder: 'e.g. Worked with the client during math using …',
          suggestion: 'Worked with the client during math using a visual timer and prompted re-entry twice; on task 15 of 30 min.' },
        result: 'Oct 14 note wording written in the Notes section',
      },
      {
        id: 'a2', short: 'Only you decide what the payer sees about a family.', crit: 'family', title: 'Decide whether the Oct 16 family detail goes to Anthem', open: true, need: true, agent: 'Extension', needs: 'a decision',
        cites: ['Weekly guardian contact Oct 16'],
        bullets: [
          'The Oct 16 guardian call includes a family detail (a change in the household). It is held out of the form until you decide.',
          'Including it strengthens “lack of progress”: the Oct 21 shove came five days later.',
          'Once the request is processed, Anthem keeps it. Only you can decide what a payer sees about a family.',
        ],
        why: 'The “lack of progress” box has to explain why more units are needed. A family event can be the reason, but it is the guardian’s story.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'g1.lack', mode: 'append',
          section: 'Section II · Goal 1 · Lack of progress and changes made to the ISP', field: 'Lack of Progress and Changes made to ISP to address this',
          before: 'Two escalations still ended in physical aggression or elopement (Oct 21 shove at lunch; Oct 6 elopement with 1 day ISS), both in unstructured time. ISP changed: lunch and transitions now carry a named staff member and a pre-set regulation break.',
          writes: [
            'The guardian reported a change in the household on Oct 16 that coincided with the Oct 21 incident; the clinical team has adjusted supports accordingly.',
            '',
          ] },
        input: { type: 'choice', label: 'Does the household change the guardian told you about on Oct 16 go in the request?',
          options: ['Include it: it explains the Oct 21 incident', 'Leave it out: Anthem does not need it'], suggestion: '' },
        result: 'Family detail decision written in the concurrent SRA form',
      },
      {
        id: 'a3', short: 'An undated ISP change cannot be checked against the notes.', crit: 'progress', title: 'Add the date of the Oct 22 ISP change', agent: 'Extension', needs: 'one date',
        cites: ['ISP Oct 22', 'Daily note Oct 21'],
        bullets: [
          'The request says “ISP changed Oct 22”, but the plan in Lauris has no dated amendment after the Aug 11 review.',
          'The Oct 21 incident note and the Oct 22 note both mention the new lunch support.',
          'The form asks what changed in the plan and when. An undated change cannot be checked against the notes.',
        ],
        why: 'The form asks what changed in the plan because progress stalled. An undated change cannot be checked against the notes.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'g1.lack', mode: 'append',
          section: 'Section II · Goal 1 · Lack of progress and changes made to the ISP', field: 'Lack of Progress and Changes made to ISP to address this',
          before: 'ISP changed (no date written): lunch and transitions now carry a named staff member and a pre-set regulation break.',
          link: { go: 'lauris-isp?c=4471', label: 'Open the plan' },
          write: 'ISP amendment dated {value}.' },
        input: { type: 'date', label: 'Date the team made the change', suggestion: '2026-10-22' },
        result: 'Amendment date written in the concurrent SRA form',
      },
    ],
  };

  /* ---------------- R-0408 · K.T., 9 · info request · Anthem ---------------- */
  R['R-0408'] = {
    actions: [
      {
        id: 'a1', short: 'Dates make the count checkable.', crit: 'crit1', title: 'List the dated incidents Anthem asked about', open: true, agent: 'Extension', needs: 'pick the dates',
        bullets: [
          'Anthem asked for how often and how long, in the last 30 days. Lauris says “2–3× a week” with no dates.',
          'The daily notes hold seven dated incidents (Oct 2 to Oct 27), 5–15 minutes each.',
          'The reply is due 5:40 pm today. The record in Lauris should say the same thing as the reply.',
        ],
        why: 'Anthem asked for frequency and duration within 30 days. Dates make the count checkable; “2–3 times a week” reads as a guess.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit1.sub', mode: 'append',
          section: 'Section I · Criterion 1 · symptoms and behaviors', field: 'Describe current symptoms and behaviors (frequency, intensity, duration)',
          before: 'Shoved a classmate at lunch; 2 office referrals this month. Frequency “2–3 times a week”, no dates.',
          write: 'Dated incidents, last 30 days: {value}. 5–15 min each, moderate intensity, staff de-escalation (daily notes).' },
        input: { type: 'chips', label: 'Which incidents go in the record?', options: ['Oct 2', 'Oct 6', 'Oct 9', 'Oct 14', 'Oct 17', 'Oct 22', 'Oct 27'], suggestion: 'Oct 2,Oct 6,Oct 9,Oct 14,Oct 17,Oct 22,Oct 27' },
        result: 'Dated incidents written in the DMAS form, criterion 1',
      },
      {
        id: 'a2', short: 'The record has to say what the IEP does not cover.', crit: 'crit2', title: 'Say what the IEP covers and why it is not enough alone', open: true, agent: 'Extension', needs: 'your words',
        bullets: [
          'The CNA lists the IEP supports (behaviour plan, seating, check-in/check-out) but not what they do not cover.',
          'Anthem’s third question is “current IEP supports and why they are insufficient”.',
          '5 of the 7 incidents happened at lunch and in transitions, when no IEP support is in the room.',
        ],
        why: 'Insurers deny with “can be addressed through the IEP”. The record has to say what the IEP does not provide.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit2.r2.out', mode: 'append',
          section: 'Section I · Criterion 2 · IEP supports', field: 'Provider table, row 2 (IEP supports): Outcomes/Current Progress',
          before: 'Behaviour plan, preferential seating, check-in/check-out (reviewed Mar 2026).' },
        input: { type: 'text', label: 'Why can’t the IEP supports meet this need on their own?',
          placeholder: 'What the IEP does not give him',
          suggestion: 'The IEP supports are classroom-based and delivered by school staff. They do not include daily clinical intervention or de-escalation at lunch and transitions, where 5 of the 7 incidents happened.' },
        result: 'IEP gap written in the DMAS form, criterion 2',
      },
    ],
  };

  /* ---------------- R-0402 · D.W., 14 · partial · Sentara ---------------- */
  R['R-0402'] = {
    actions: [
      {
        id: 'a1', short: 'The record should hold what happened since Oct 27.', crit: 'crit1', title: 'Log the 3 school incidents since the Oct 27 call', open: true, agent: 'Extension', needs: 'confirm with the counselor',
        bullets: [
          'Three daily notes since Oct 27 describe an escalation: left class, shove in the hallway, chair thrown at lunch.',
          'The last collateral with the school counselor is Oct 1. Nothing since Sentara’s call is on the school’s side of the record.',
          'Do not send them to Sentara unasked. Last time, more evidence produced a smaller award (110).',
        ],
        why: 'If Sentara asks for more, or you take the peer-to-peer, the reviewer asks what happened since the request. The record needs it first.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'notes', mode: 'append',
          section: 'Notes section · school counselor contact since Oct 27', field: 'Notes section: collateral contact with the school counselor',
          before: 'Empty. Last collateral Oct 1; no entry since the Sentara call.' },
        input: { type: 'text', label: 'What did the school counselor tell you?', placeholder: 'Dates, what happened, how staff responded',
          suggestion: 'Spoke with the school counselor by phone (10 min). Since Oct 27: Oct 27 left class after the afternoon bell and was found in the stairwell (20 min); Oct 28 shoved a peer in the hallway, office referral; Oct 29 threw a chair at lunch, 1 day ISS. Staff used co-regulation walks each time.' },
        result: 'Collateral contact written in the Notes section',
      },
      {
        id: 'a2', short: 'One sentence in her words answers “can less work?”.', crit: 'family', title: 'Write the guardian’s words for the peer-to-peer', agent: 'Extension', needs: 'her words, 1–2 sentences',
        bullets: [
          'The family-involvement box says how often the guardian joins, but has no statement from her about the need.',
          'If you ask for a peer-to-peer, the reviewer asks how the family sees it. One sentence in her words answers that.',
          'D.W.’s mother joined 9 of 12 weekly calls: the most reliable family evidence in the file.',
        ],
        why: 'Sentara’s question is “can this be handled with less?”. The guardian’s own words about daily life are hard to dismiss.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'family', mode: 'append',
          section: 'Section II · Family involvement (TDT / IIH only)', field: 'Overview of family involvement during the service period',
          before: 'Mother joined 9 of 12 weekly calls; practised the calm-down plan at home. Continuing need: consistent morning routine.',
          write: '{value} — mother (guardian), weekly call Oct 23.' },
        input: { type: 'text', label: 'What does D.W.’s mother say would happen if daily support stopped?',
          placeholder: 'In her words', suggestion: '“If it goes back to school counseling once a week, I know how it ends. He shuts down, then he blows up on someone.”' },
        result: 'Guardian’s words written in the concurrent SRA form',
      },
    ],
  };

  /* ---------------- R-0399 · A.L., 6 · submitted · Humana ---------------- */
  R['R-0399'] = {
    actions: [
      {
        id: 'a1', short: 'A dated note answers “we never got it”.', crit: 'docs', title: 'Put the Oct 29 receipt call in the chart', req: 'day10', agent: 'Extension', needs: 'check, then confirm',
        bullets: [
          'Psyflo called Humana on day 10. A person confirmed receipt and the site supervisor checked the member ID.',
          'The call is recorded in Psyflo, not in the chart. There is no Humana entry in Lauris since the Oct 19 fax.',
          'The decision is 3 days overdue. If Humana says “not received”, a dated note shows who confirmed it.',
        ],
        why: 'A dated note with the Sfax reference answers “we never got it” and backs the overdue notice.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'notes', mode: 'append',
          section: 'Notes section · insurance contact Oct 29', field: 'Notes section: receipt call to Humana',
          before: 'Empty. No Humana entry since the request was faxed Oct 19.' },
        input: { type: 'text', label: 'Is this what the call confirmed?', placeholder: 'Who confirmed what, and when',
          suggestion: 'Called Humana provider services Oct 29, 10:12 am (14 min on hold). Rep (first name on file) confirmed receipt of the Oct 19 initial SRA, Sfax ref F-2291, and said it is in clinical review. Site supervisor checked the member ID.' },
        result: 'Receipt call written in the Notes section',
      },
    ],
  };

  /* ---------------- R-0391 · J.O., 14 · early discharge + new initial · Aetna ---------------- */
  R['R-0391'] = {
    actions: [
      {
        id: 'a1', short: 'Fast use of units looks like overuse without a reason.', crit: 'crit2', title: 'Explain why the 80 units were used in 7 weeks', open: true, agent: 'Extension', needs: 'your words',
        bullets: [
          'The SRA of 80 units ran out in 7 weeks. The new request does not say why.',
          'The notes show 3 units a day on 27 of 35 school days, and a step-down to 2 units on Sep 22 that failed within 3 days.',
          'Aetna called on Oct 29 offering 110 units. Expect the question “why were units used early?”',
        ],
        why: 'Payers now question an early discharge followed by a new initial SRA. Without a reason, fast use looks like overuse.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit2.r1.out', mode: 'append',
          section: 'Section I · Criterion 2 · prior TDT authorization', field: 'Provider table, row 1 (prior TDT, 80 units): Outcomes/Current Progress',
          before: 'Prior TDT authorization: 80 units awarded, all used in 7 weeks. Outcome not stated.' },
        input: { type: 'text', label: 'Why did J.O. need the units this fast?',
          placeholder: 'What made fewer hours a day unsafe',
          suggestion: 'Used 3 units a day on 27 of 35 school days after the Sep 8 suspension. Stepping down to 2 units was tried the week of Sep 22 and incidents returned within 3 days. Discharged to a monitoring plan when the units ended.' },
        result: 'Reason for early use written in the DMAS form, criterion 2',
      },
      {
        id: 'a2', short: 'Shows the discharge was clinical, not a restart.', crit: 'goals', title: 'Choose the monitoring plan for the gap after discharge', open: true, agent: 'Extension', needs: 'one choice',
        bullets: [
          'An early discharge followed by a new initial SRA counts as new only after 30 days without service.',
          'There is no monitoring plan in the plan in Lauris. Aetna will ask what happened in between.',
          'All three options are clinical. Psyflo does not pick one.',
        ],
        why: 'A monitoring plan shows the discharge was clinical, not a way to restart units. It is also what a reviewer asks about the gap.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'dsch.r1.plan', mode: 'replace',
          section: 'Section V · Discharge planning · monitoring plan', field: 'Discharge plan, row 1: Plan to assist in transition',
          before: 'No monitoring plan on file for the 30 days without service.',
          writes: [
            'Monitoring for 30 days after discharge: weekly call with the guardian and a school counselor report every 2 weeks. No TDT is billed in this period.',
            'Monitoring for 30 days after discharge: school counselor check-in once a week. No TDT is billed in this period.',
            'Monitoring for 30 days after discharge: guardian call every 2 weeks. TDT restarts if J.O. has 2 incidents in one week. No TDT is billed in this period.',
          ] },
        input: { type: 'choice', label: 'How will you keep watch while J.O. is not in service?',
          options: ['Guardian call every week; school counselor report every 2 weeks', 'School counselor check-in once a week only', 'Guardian call every 2 weeks; restart TDT after 2 incidents in a week'], suggestion: '' },
        result: 'Monitoring plan written in the DMAS form, Section V',
      },
    ],
  };

  /* ---------------- R-0388 · T.N., 8 · peer-to-peer · Sentara ---------------- */
  R['R-0388'] = {
    actions: [
      {
        id: 'a1', short: 'A closing date and the provider’s reason make it count.', crit: 'crit2', title: 'Add when outpatient therapy ended and the provider’s reason', open: true, agent: 'Extension', needs: 'one date',
        bullets: [
          'The prior-services box says “Outpatient Jan–May 2026, 11 sessions” with no end date and no reason.',
          'The peer-to-peer notes say the provider ended it as “not making progress”. The record has to say the same.',
          'The call is Dec 9. A reviewer can ask for the closing date in the first minute.',
        ],
        why: 'One failed prior service is what makes criterion 2 count. A date and the provider’s own reason show it was tried and did not help.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit2.r2.out', mode: 'replace',
          section: 'Section I · Criterion 2 · prior services', field: 'Provider table, row 2 (Piedmont Counseling): Outcomes/Current Progress',
          before: 'Closed by the provider as “not making progress”; end date not written.',
          write: 'Closed by the provider on {value} as “not making progress” (provider’s letter on file).' },
        input: { type: 'date', label: 'Date the provider closed the outpatient case', suggestion: '2026-05-22' },
        result: 'Outpatient end date and reason written in the DMAS form, criterion 2',
      },
    ],
  };

  /* ---------------- R-0384 · E.C., 5 · denied · Anthem ---------------- */
  R['R-0384'] = {
    actions: [
      {
        id: 'a1', short: 'Frequency and the gap answer “already connected”.', crit: 'coord', title: 'State how often each current service happens and why it is not enough', open: true, agent: 'Extension', needs: 'your words',
        bullets: [
          'Anthem denied on Oct 22: “already connected to other services”. That reason came up 6 times this year (demo values).',
          'The current-services list names three services but no frequency, and nothing on why each is not enough alone.',
          'The appeal letter quotes this box. The guardian signs what the record says.',
        ],
        why: 'A list of services reads as proof the child is covered. Naming the frequency and the gap answers “already connected” in one field.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'coordplan', mode: 'append',
          section: 'Section II · Care coordination · other current services', field: 'Plan to coordinate; current services, how often, and why each is not enough alone',
          before: 'Current services: school counseling, behaviour interventionist, IEP check-in/check-out. How often each happens, and why each is not enough alone: not stated.' },
        input: { type: 'text', label: 'For each service: how often, and why it is not enough alone',
          placeholder: 'Service: how often, how long, what it does not cover',
          suggestion: 'School counseling: 1×/week, 20 min, small group, not clinical. Behaviour interventionist: 2×/week, 30 min, classroom only. IEP check-in/check-out: daily, 5 min. None gives clinical help at lunch and transitions, where 4 of 6 incidents happened.' },
        result: 'Current services completed in the DMAS form, Section II',
      },
      {
        id: 'a2', short: 'A blank outcome means the service does not count.', crit: 'crit2', title: 'Fill the outcome for the prior service', open: true, agent: 'Extension', needs: 'one choice',
        bullets: [
          'The prior-services row has a provider and dates (Valley Child Services, Feb–Jun 2026, 8 sessions) but an empty outcome.',
          'Insurers read a blank outcome as “no failed prior service”.',
          'The guardian named the provider on Oct 8 but was not asked how it ended.',
        ],
        why: 'Anthem looks for one prior service that was tried and did not work. A blank outcome means it does not count.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'crit2.r1.out', mode: 'replace',
          section: 'Section I · Criterion 2 · prior services', field: 'Provider table, row 1 (Valley Child Services): Outcomes/Current Progress',
          before: 'Outcome blank.',
          writes: [
            'Ended when the family moved out of the clinic’s area (guardian, Oct 29). Behaviours had not changed.',
            'Discharged by the provider for not making progress (guardian, Oct 29).',
            'Ended by the family (guardian, Oct 29). Behaviours continued.',
          ] },
        input: { type: 'choice', label: 'How did the play therapy end?',
          options: ['Ended when the family moved out of the clinic’s area', 'Discharged by the provider: not making progress', 'Ended by the family; behaviours continued'], suggestion: '' },
        result: 'Outcome written in the DMAS form, criterion 2',
      },
      {
        id: 'a3', short: 'The guardian’s consent to the appeal is dated in the record.', crit: 'docs', title: 'Record the guardian’s consent for the appeal letter', req: 'guardian-appeal', agent: 'Extension', needs: 'one choice',
        bullets: [
          'In Harvest’s experience the guardian files the appeal (Harvest-reported). Federal rules also allow a provider to appeal with her written consent (42 CFR 438.402(c)(1)(ii)).',
          'The letter is drafted and waiting. Lauris has no record that the guardian agreed to receive it.',
          'An appeal is due within 60 calendar days of the date on the notice (42 CFR 438.402(c)(2)(ii)); confirm the date printed on Anthem’s letter. Harvest keeps serving E.C. meanwhile.',
        ],
        why: 'The appeal is filed by the guardian, or by Harvest with her written consent. A dated consent in the record shows what she decided.',
        lauris: { form: 'sra', formTitle: 'TDT (H2016) Initial Service Authorization Request', key: 'notes', mode: 'replace',
          section: 'Notes section · guardian consent to the appeal', field: 'Notes section: consent to receive and sign the appeal letter',
          before: 'Empty.',
          writes: [
            'Guardian (grandmother) agreed by phone on Oct 29 to receive the appeal letter by text and to sign it herself. Harvest keeps serving E.C. meanwhile.',
            'Guardian asked for time to decide. Harvest will call back Nov 2. Service continues.',
            'Guardian chose not to appeal (Oct 29). Service continues.',
          ] },
        input: { type: 'choice', label: 'What did the guardian say?',
          options: ['Yes: send the letter to her by text and she signs it', 'She wants to think about it: call back Nov 2', 'She does not want to appeal'], suggestion: '' },
        result: 'Guardian consent written in the Notes section',
      },
    ],
  };

  /* ---------------- R-0395 · S.B., 11 · concurrent SRA · UnitedHealthcare ---------------- */
  R['R-0395'] = {
    actions: [
      {
        id: 'a1', short: 'The request must match the current plan.', crit: 'goals', title: 'Confirm the school-year goals still apply', open: true, agent: 'Extension', needs: 'one choice',
        bullets: [
          'S.B. has 14 units left, about 5 school days. The next concurrent SRA should already be in progress.',
          'The last plan review in Lauris is Aug 11. The request copies the goals from the plan as written.',
          'If a goal is met or changed, the request has to say so, with a date.',
        ],
        why: 'The concurrent SRA form asks for progress on each goal. UnitedHealthcare checks that the goals in the request match the current plan.',
        lauris: { form: 'sra-cs', formTitle: 'CMHRS Continued Stay Service Authorization Request', key: 'g1.progress', mode: 'append',
          section: 'Section II · Treatment progress · goals reviewed this school year', field: 'Progress toward Goal/Objective',
          before: 'Last plan review Aug 11, 2026. Goals 1–3 unchanged since Feb.',
          writes: [
            'Reviewed Oct 29 with the guardian: Goals 1–3 still apply for the school year. Objectives unchanged (counts stated as “x of 5”).',
            'Reviewed Oct 29 with the guardian: Goal 1 is met (4 of 5 for 6 weeks). Replaced with a new goal; Goals 2–3 still apply.',
            'Reviewed Oct 29 with the guardian: goals still apply. Objective wording to be updated in the plan before the request.',
          ] },
        input: { type: 'choice', label: 'After talking with the guardian, which is true?',
          options: ['All three goals still apply', 'Goal 1 is met: replace it with a new goal', 'The goals apply, but the objective wording must change'], suggestion: '' },
        result: 'Plan review written in the concurrent SRA form',
      },
    ],
  };

  /* ---------------- R-0380 · L.V. and R-0377 · P.G.: nothing to do ---------------- */
  R['R-0380'] = { actions: [] };
  R['R-0377'] = { actions: [] };
})();
