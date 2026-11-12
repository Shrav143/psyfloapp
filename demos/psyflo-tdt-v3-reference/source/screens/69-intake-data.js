/* F2: content of the Intake (Comprehensive Needs Assessment) in Lauris: the scripted intake conversation, what the Scribe types,
   and the recommendations Scan & Enhance shows. Fictional: initials only, no IDs. Demo values.
   PSY.cna = { TW, lines(c), values(c), recs(c) }   (used by 69-intake-form.js; safe to load before or after it) */
(function () {
  'use strict';
  const PSY = window.PSY; if (!PSY) return;
  const TW = '4492';
  const D = (PSY.cna = PSY.cna || {}); D.TW = TW;

  /* ------------------------------------------------------------------ the conversation (T.W. and his grandmother) */
  const J = 'Jordan'; const G = 'Grandmother'; const T = 'T.W.';
  const TW_LINES = [
    { t: '0:12', who: J, text: 'Thank you both for coming in. You each signed the consent, so I am recording now. This takes a couple of hours and I will ask about a lot of things. Tell me if you want a break.' },
    { t: '0:41', who: G, text: 'That is fine. Ask whatever you need.' },
    { t: '3:10', who: J, text: 'Let us start with school. Which school, what grade, and does he have an IEP?' },
    { t: '3:32', who: G, text: 'Lynchburg City, middle school, sixth grade. He has an IEP. It was reviewed in March.' },
    { t: '9:05', who: J, text: 'How have his grades and attendance been this fall?' },
    { t: '9:28', who: G, text: 'Down. The school keeps calling about him pushing and shoving other kids and being out of class. He got a day of in-school suspension. He misses a lot of days. He does best with one adult.' },
    { t: '18:20', who: J, text: 'Who lives at home with T.W., and what does a normal day look like? How are things with housing and money?' },
    { t: '18:52', who: G, text: 'Just the two of us. I have raised him since he was four. We are in a steady place in Lynchburg. I live on a fixed income and he has Medicaid. We get up at six thirty, he rides to school, he is home about three thirty. Homework, then basketball. Nights are the hard part. He is up most nights.' },
    { t: '31:15', who: J, text: 'How was he as a baby and a toddler? Any trouble walking or talking?' },
    { t: '31:44', who: G, text: 'A calm baby. He loved being held. He walked at thirteen months. His speech was slow and the school speech teacher worked with him until first grade. Full term, no problems at birth.' },
    { t: '44:30', who: J, text: 'Any medical problems, medicines or allergies? Anything in the family?' },
    { t: '44:58', who: G, text: 'Asthma. He uses an albuterol inhaler when he needs it and it stays with the school nurse. No allergies, no other medicines. The pediatrician has the rest. A family member has had depression.' },
    { t: '58:10', who: J, text: 'Has he had psychiatry, case management, in-home therapy, mentoring or a placement away from home?' },
    { t: '58:36', who: G, text: 'No, none of those. He saw Piedmont Counseling from March to June last year, six visits. We lost our ride and it stopped. It had not changed anything.' },
    { t: '1:12:05', who: J, text: 'And at school, besides the IEP?' },
    { t: '1:12:30', who: G, text: 'A behavior interventionist sees him two times a week since September. The counselor says nothing has changed. The check-in helps in class but not at lunch or between classes.' },
    { t: '1:28:40', who: J, text: 'I need to ask about hard things. Has anything happened that has been difficult for him?' },
    { t: '1:29:08', who: G, text: 'There was a change in the household earlier this year. It has been hard on him. I would rather not say more than that today.' },
    { t: '1:29:40', who: J, text: 'That is fine. We do not need details today.' },
    { t: '1:42:20', who: J, text: 'Any alcohol, drugs or vaping, for him or in the family? Any court or legal trouble?' },
    { t: '1:42:46', who: G, text: 'None, for him or for us. No court, no police. I am his legal guardian.' },
    { t: '1:55:15', who: J, text: 'T.W., what do you like to do?' },
    { t: '1:55:30', who: T, text: 'Basketball. And I draw.' },
    { t: '1:56:12', who: G, text: 'He listens to his coach and to one teacher he trusts. We go to church on Sundays. A neighbor helps with pickup when I cannot. I do not drive at night.' },
    { t: '2:08:00', who: J, text: 'Now the PHQ-9, the nine questions about the last two weeks. How is your mood and your sleep? Any thoughts of hurting yourself?' },
    { t: '2:08:30', who: T, text: 'Okay. I do not sleep good. No. I would not do that.' },
    { t: '2:20:40', who: J, text: 'For my notes: oriented, neat and clean, cooperative and polite. Restless in his seat, speech clear. Mood okay, affect brightens when we talk about basketball. Thinking is clear, no hallucinations. Insight is limited. Judgment and impulse control are poor when he is frustrated.' },
    { t: '2:41:10', who: J, text: 'The PHQ-9 comes to eight, which is mild, and the cross-cutting measure is done. I will write the plan next. Please sign the releases for the school and Piedmont.' },
  ];
  const genLines = (c) => [
    { t: '0:15', who: J, text: 'Thank you for coming in. You signed the consent, so I am recording now.' },
    { t: '0:40', who: 'Guardian', text: 'That is fine.' },
    { t: '4:10', who: J, text: 'Tell me about ' + c.ini + ' at school and at home.' },
    { t: '4:35', who: 'Guardian', text: 'The school keeps calling about behavior. It is getting in the way of class and we would like help.' },
    { t: '20:05', who: J, text: 'Any medical problems, medicines or allergies?' },
    { t: '20:30', who: 'Guardian', text: 'None that I can think of.' },
    { t: '35:10', who: J, text: 'What does ' + c.ini + ' do well? What does ' + c.ini + ' like?' },
    { t: '35:40', who: 'Guardian', text: 'Sports and drawing. ' + c.ini + ' does best with one adult.' },
    { t: '50:20', who: J, text: 'Any alcohol, drugs or legal trouble in the family?' },
    { t: '50:44', who: 'Guardian', text: 'No.' },
    { t: '1:10:30', who: J, text: 'For my notes: ' + c.ini + ' is cooperative and polite. Speech is clear and mood is okay.' },
  ];
  D.lines = (c) => (c.id === TW ? TW_LINES : genLines(c));

  /* ------------------------------------------------------------------ what the Scribe types (non-human boxes only) */
  const DISCH = 'Once the individual no longer demonstrates meeting the eligibility criteria for services or the level of functioning has improved with respect to the goals outlined in the treatment plan (improve frustration tolerance, improve peer conflict skills, improve staying in class), the individual will be discharged from the program. Service collaboration will occur before discharge and referrals will be made, if needed. Other interventions from outside providers may continue as needed.';
  const TW_VALUES = {
    atype: 'Initial', setting: 'HOC',
    reason: 'Referred 10/13/2026 by the school counselor at Lynchburg City MS-2 for physical aggression toward peers on 6 dated occasions in the 30 days before the referral, verbal aggression, leaving the building (Oct 6, 1 day in-school suspension) and falling grades. His grandmother, his legal guardian, confirms the pattern and asks for daily help at school.',
    mhhx: 'No psychiatric hospitalizations, ER visits for behavior or diagnoses given before. Outpatient counseling at Piedmont Counseling (Mar to Jun 2025). School behavior interventionist since Sep 2026. Poor sleep and withdrawn at times since a change in the household earlier this year.',
    mhfam: 'Grandmother reports a family member with depression. No other mental health history reported in the family.',
    'prev.0.1': 'None', 'prev.1.1': 'None',
    'prev.2.1': 'Piedmont Counseling', 'prev.2.2': 'Mar to Jun 2025', 'prev.2.3': 'Ended when transport fell through',
    'prev.3.1': 'None', 'prev.4.1': 'None', 'prev.5.1': 'None', 'prev.6.1': 'None',
    'prev.8.1': 'School behavior interventionist, MS-2', 'prev.8.2': 'Sep 2026 to now',
    'prev.9.1': 'IEP supports, MS-2 (check-in/check-out)', 'prev.9.2': 'Since 2024', 'prev.9.3': 'Helps in class. Not at lunch or transitions.',
    medh: 'Asthma, treated with an albuterol inhaler as needed. The inhaler stays with the school nurse. No other medical problems, injuries or hospital stays. No current physical complaints. Pediatrician on file.',
    medfam: 'None reported by the guardian.',
    allergy: 'No known food, drug or other allergies.',
    fall: 'No fall risk. No communication, mobility or adaptive equipment needs. English; the guardian prefers text messages.',
    'meds.0.1': 'Albuterol inhaler', 'meds.0.2': 'As directed', 'meds.0.3': 'As needed', 'meds.0.4': 'Pediatrician, on file',
    devirr: 'Calm baby, easy to soothe. More easily frustrated from about age 3, when his speech was slow.',
    devhold: 'Enjoyed being held and played with. His grandmother has raised him since age 4 and met his needs, with a neighbor helping.',
    devview: 'His grandmother describes a happy early childhood with some speech trouble and no other worries until this year.',
    devdelay: 'Walked at 13 months. Speech was slow at age 3. Worked with the school speech teacher until 1st grade.',
    devbirth: 'None reported. Full term.',
    iep: 'IEP in place, last review Mar 2026. Behavior plan with check-in/check-out. No 504 plan.',
    acad: 'Grades have fallen this fall and he is behind in several classes. He is out of class and absent often. He pushes and shoves peers several times a week and has made verbal threats to peers and adults when frustrated. He has had office referrals and an in-school suspension, and no expulsions. Teachers say he does best with one trusted adult. Concerns grew after a change in the household earlier this year.',
    routine: 'Up at 6:30 and rides to school. Home about 3:30, homework with his grandmother, then basketball. Up at night most nights and tired in the morning. Appetite normal.',
    housing: 'Lives with his grandmother, his legal guardian, in stable housing in Lynchburg. No other children in the home.',
    finance: 'Grandmother’s fixed income. T.W. has Medicaid through Humana Healthy Horizons in Virginia. No other benefits reported. Transportation is limited: she does not drive at night.',
    famhx: 'Close bond with his grandmother, who has raised him since age 4. A change in the household earlier this year has been hard on him. No conflict at home is described. Details are not recorded here.',
    legal: 'Grandmother is his legal guardian. No charges, court hearings, probation or convictions for T.W. or the family.',
    subs: 'None reported by T.W. or his grandmother. No substance use treatment.',
    famsubs: 'None reported by the guardian.',
    strengths: 'Enjoys basketball and drawing. Responds to one trusted adult and listens to his coach. Needs help with anger, peer conflict and staying in class. Does best with short, direct instructions.',
    extra: 'School basketball. Church group on Sundays.',
    extfam: 'A neighbor helps with pickup when needed. His coach and the school counselor are steady adults.',
    culture: 'Faith is important to the family; they attend church on Sundays. No cultural needs that would change services.',
    'ms.ori': 'Oriented to person, place, time and situation.',
    'ms.app': 'Neat and clean, looks his age.',
    'ms.dress': 'Clean, weather-appropriate.',
    'ms.motor': 'Restless in his seat at times. No tics.',
    'ms.insight': 'Limited. He does not see the risks of leaving the building.',
    'ms.judg': 'Poor impulse control when frustrated.',
    'ms.mem': 'Intact, recent and remote.',
    'ms.att': 'Easily distracted. Redirects with a prompt.',
    'ms.thought': 'Linear and goal-directed.',
    'ms.interview': 'Cooperative and polite. Brief answers. Warmed up when talking about basketball.',
    'ms.speech': 'Normal rate and volume, clear.',
    'ms.mood': '“Okay.” Irritable at times per his grandmother.',
    'ms.affect': 'Constricted. Brightens when talking about basketball.',
    'ms.content': 'No thoughts of self-harm (asked directly). No thoughts of harming others voiced. No delusions.',
    'ms.percep': 'No hallucinations reported or observed.',
    'ms.func': 'Independent in self-care. Needs adult prompts to stay in class and manage anger.',
    'src.0': '1', 'src.1': '1', 'src.3': '1', 'src.4': '1',
    barr: 'Transportation. His grandmother does not drive at night, and that ended outpatient care in 2025.',
    disch: DISCH,
  };
  const genValues = (c) => ({
    atype: 'Initial', setting: 'HOC',
    reason: 'Referred for behavior at school. Details are from the intake conversation with the family.',
    mhhx: 'No psychiatric hospitalizations reported.',
    medh: 'No significant medical problems reported.', allergy: 'No known allergies.',
    devdelay: 'No developmental delays reported.',
    iep: 'IEP status as described by the family at intake.',
    routine: 'Daily routine as described by the family at intake.',
    legal: 'No legal involvement reported.', subs: 'None reported by the family.',
    strengths: 'Sports and drawing. ' + c.ini + ' does best with one adult.',
    'ms.ori': 'Oriented to person, place, time and situation.', 'ms.interview': 'Cooperative and polite.', 'ms.speech': 'Clear.', 'ms.mood': 'Okay.',
    'src.0': '1', 'src.3': '1',
    disch: DISCH.replace('(improve frustration tolerance, improve peer conflict skills, improve staying in class)', '(goals from the treatment plan)'),
  });
  D.values = (c) => (c.id === TW ? TW_VALUES : genValues(c));

  /* ------------------------------------------------------------------ recommendations (Scan & Enhance) */
  const SUMMARY = 'T.W. is a 12-year-old 6th grader at Lynchburg City MS-2 who lives with his grandmother, his legal guardian since age 4. He was referred for physical and verbal aggression toward peers (6 dated incidents in 30 days, 2 to 3 times a week), leaving the building and falling grades. The behaviors grew after a change in the household earlier this year, on a background of early speech delay, poor sleep and few coping skills when he is frustrated. He does not see the risks of leaving the building. His strengths are basketball, drawing, a committed grandmother and a good response to one trusted adult.\n\n' +
    'The IEP, a school behavior interventionist 2 times a week since Sep 2026 and outpatient counseling at Piedmont (Mar to Jun 2025, 6 sessions, ended when transportation was lost) have not reduced the behavior. Outpatient alone is hard for the family to reach. Therapeutic Day Treatment during the school day can reach him at lunch and transitions, where the incidents happen, and work with the school and his grandmother. Expected outcome: fewer incidents, staying in class, then a step-down to outpatient counseling and school supports.';
  const TRAUMA = 'His grandmother describes “a change in the household earlier this year.” Details are not recorded in this form. She will tell the clinician more if and when she chooses.';
  const ACAD = 'Grades have fallen this fall. Classes taking: 7. Classes passing: 4 (school record, Oct 15). Unexcused absences this school year: 9. In-school suspension: 1 day (Oct 6); out-of-school suspension: 0 days. 2 office referrals this term. No expulsions. He pushes and shoves peers several times a week and has made verbal threats to peers and adults when frustrated. Teachers say he does best with one trusted adult. IEP in place. Concerns grew after a change in the household earlier this year.';
  const BARR = 'Transportation ended the last outpatient episode: his grandmother does not drive at night. Unstructured periods (lunch, transitions) are the highest-risk times at school. He is up most nights. He does not see the danger when he leaves the building. The school has raised alternative placement twice this year.';

  /* the diagnosis and its justification are the LPC's: Psyflo never suggests a diagnosis (Part 20.1), so there is no diagnosis recommendation */
  const twRecs = [
    { id: 'summ', title: 'Your decision: the clinical formulation summary',
      value: { summ: SUMMARY },
      },
    { id: 'svc', title: 'Your decision: recommend Therapeutic Day Treatment',
      value: { 'svc.0': '1' }, copy: 'Service Recommendations: Therapeutic Day Treatment',
      },
    { id: 'trauma', title: 'Trauma History: in the family’s words, kept generic',
      value: { trauma: TRAUMA },
      req: 'form-init', addr: 'Section III · trauma-informed care' },
    { id: 'prev', title: 'Add dates and outcomes to Outpatient Counseling and School Counseling',
      value: { 'prev.2.2': 'Mar 2025 to Jun 2025 · 6 sessions', 'prev.2.3': 'Behavior did not change. Ended when the family lost transportation.', 'prev.8.2': 'Sep 2026 to present · 2 times a week', 'prev.8.3': 'No reduction in incidents (school counselor, Oct 15).' },
      copy: 'Outpatient Counseling (Piedmont Counseling): Mar 2025 to Jun 2025, 6 sessions. Behavior did not change. Ended when the family lost transportation.\nSchool Counseling (school behavior interventionist, MS-2): Sep 2026 to present, 2 times a week. No reduction in incidents (school counselor, Oct 15).',
      req: 'tdt-clin2', addr: 'Clinical necessity · criterion 2' },
    { id: 'acad', title: 'Add the school counts to the academic performance box',
      value: { acad: ACAD },
      req: 'tdt-clin2', addr: 'Clinical necessity · criterion 1' },
    { id: 'barr', title: 'Add the barriers to progress',
      value: { barr: BARR },
      },
  ];
  const genRecs = (c) => [
    { id: 'summ', title: 'Your decision: the clinical formulation summary',
      value: { summ: c.ini + ' is a ' + c.age + '-year-old at ' + c.school + '. The family reports behavior concerns at school and asks for help. School supports are in place and have not been enough. Therapeutic Day Treatment during the school day is recommended, with a step-down to outpatient counseling and school supports when the goals are met.' },
      },
    { id: 'trauma', title: 'Trauma History: write it in the family’s words, kept generic',
      value: { trauma: 'The family did not report a trauma history at intake. Details are not recorded in this form.' },
      req: 'form-init', addr: 'Section III · trauma-informed care' },
    { id: 'svc', title: 'Your decision: recommend Therapeutic Day Treatment',
      value: { 'svc.0': '1' }, copy: 'Service Recommendations: Therapeutic Day Treatment',
      },
  ];
  D.recs = (c) => (c.id === TW ? twRecs : genRecs(c));
})();
