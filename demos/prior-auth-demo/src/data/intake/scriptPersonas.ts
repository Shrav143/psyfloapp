import type { ProgramId } from "../assess/types";

/* The people the simulated AI Scribe "hears". Everything here is synthetic. A persona is what one fictional person says in an intake interview;
   scriptBlocks.ts turns it into the conversation for whatever program and modules a record is configured for. What a person said is attributed to
   them (the initials) and is never turned into a diagnosis, a rating or a decision. */

export interface Risk {
  /** What the person said, in the transcript. */
  say: string;
  /** How the scribe files it: attributed, never concluded. */
  text: string;
  /** A statement that may mean risk: it opens a safety alert for a clinician. A plain denial is filed as a draft for the clinician and opens none. */
  alert: boolean;
}
export interface Core {
  reason: string; presenting: string;
  symptoms: string; symptomsNote: string;
  history: string; historyNote: string; prior: string;
  meds: string; medsNote: string;
  functioning: string; functioningNote: string;
  supports: string; supportsNote: string; strengthsNote: string;
  barriers: string; sdohNote: string; transport: string;
  risk: Risk[];
  goals: string; goalsNote: string; needsNote: string;
  summary: string; plan: string;
}
export interface SudFacts {
  /** Spoken, then what the scribe proposes. */
  use: string; useNote: string;
  lastUse: string; lastUseNote: string;
  /** Left vague on purpose in some personas: the scribe lists it as missing and suggests a follow-up. */
  withdrawal: string; withdrawalNote: string; withdrawalClear: boolean;
  treatment: string; treatmentNote: string;
  medical: string; medicalNote: string;
  psych: string; psychNote: string;
  env: string; envNote: string;
  whyRes: string; whyResNote: string;
  person: string; personNote: string;
}
export interface MhFacts {
  history: string; historyNote: string;
  severity: string; severityNote: string;
  recent: string; recentNote: string;
  tried: string; triedNote: string;
}
export interface CommunityFacts {
  needs: string; needsNote: string;
  living: string; livingNote: string;
  services: string; servicesNote: string;
}
export interface YouthFacts {
  school: string; schoolNote: string;
  family: string; familyNote: string;
  coordination: string; coordinationNote: string;
  /** What is said when the clinician asks what else helps or gets in the way, and the two statements the scribe files from it as CANS evidence (a theme each; none is a CANS item). */
  cans: string; cansFunctioning: string; cansFamily: string;
}
export interface CscFacts {
  course: string; courseNote: string;
  changes: string; changesNote: string;
  family: string; familyNote: string;
  coordination: string; coordinationNote: string;
}
export interface AbaFacts {
  development: string; developmentNote: string;
  diagnosis: string; diagnosisNote: string;
  adaptive: string; adaptiveNote: string;
  behaviors: string; behaviorsNote: string;
  caregiver: string; caregiverNote: string;
  goals: string; goalsNote: string;
}
export interface Persona {
  id: string;
  who: string;
  age: number | null;
  /** The person under 18 speaks with a parent or guardian in the room. */
  cg: string | null;
  /** What "have you had times like this before?" is about for this person: it decides which modules the answer is proposed to. */
  historyKind: "psychiatric" | "substance" | "developmental";
  core: Core;
  sud?: SudFacts; mh?: MhFacts; community?: CommunityFacts; youth?: YouthFacts; csc?: CscFacts; aba?: AbaFacts;
}

/* ------------------------------------------------------------------ N.G., 28: SUD IOP step-down (scenario C) */
const NG: Persona = {
  id: "ng", who: "N.G.", age: 28, cg: null, historyKind: "substance",
  core: {
    reason: "I finished the residential program last week. I'm on buprenorphine and doing okay, but I'm worried about going home without the structure.",
    presenting: "Step-down from residential treatment (completed last week) for opioid use; on buprenorphine; worried about going home without daily structure (N.G.).",
    symptoms: "Cravings come in waves, mostly in the evening. I'm sleeping about six hours. My mood is okay, but I get anxious when I'm alone.",
    symptomsNote: "Cravings in waves, mostly in the evening; sleeping about six hours; anxious when alone; mood okay (N.G.).",
    history: "I started with pills at nineteen and moved to heroin by twenty-two. It got worse after my dad died.",
    historyNote: "Opioid use began with pills at 19 and heroin by 22; use increased after the death of a parent (N.G.).",
    prior: "A 28-day program in 2024 (relapse within two months); residential treatment completed last week; buprenorphine since residential (N.G.).",
    meds: "Buprenorphine and naloxone once a day, and ibuprofen when I need it. I'm not sure of the dose. The program doctor has it.",
    medsNote: "Buprenorphine-naloxone once a day; ibuprofen as needed; dose not stated, confirm with the prescriber (N.G.).",
    functioning: "I lost my warehouse job last year. I live with my cousin now. I can handle my day, but I fall apart when I'm bored.",
    functioningNote: "Lost a warehouse job last year; lives with a cousin; manages the day but struggles with unstructured time (N.G.).",
    supports: "My cousin is supportive. I go to a recovery meeting twice a week, and my sponsor is someone I met there.",
    supportsNote: "A cousin he lives with; a recovery meeting twice a week; a sponsor from the meeting (N.G.).",
    strengthsNote: "Completed residential treatment; takes medication daily; goes to meetings twice a week; has a supportive cousin and a sponsor (N.G.).",
    barriers: "I don't have a car. The program has to fit around a part-time job I'm trying to get.",
    sdohNote: "No car; looking for part-time work that the program schedule has to fit around (N.G.).",
    transport: "No car; needs rides or a bus route",
    risk: [{ say: "When it gets bad I think, what's the point of staying clean. I don't think about hurting myself, though.", text: "N.G. said: \"When it gets bad I think, what's the point of staying clean.\" N.G. said he does not think about hurting himself.", alert: true }],
    goals: "Stay clean, get a job, and get my license back.",
    goalsNote: "Stay clean, get a job and get a driver's license back (N.G.).",
    needsNote: "Wants structure after residential and help getting to appointments. Level of care and service options are for the clinician to consider.",
    summary: "N.G., 28, finished residential treatment last week and takes buprenorphine. N.G. describes cravings in the evening, a good recovery routine and worry about going home without structure. N.G. said \"what's the point of staying clean\" when it gets bad; a clinician reviews this with the safety alert. The scribe makes no diagnosis and does not select a level of care.",
    plan: "Clinician to document the safety screening and review the alert. Confirm the buprenorphine dose with the prescriber. Review the proposals in each assessment module before anything is accepted.",
  },
  sud: {
    use: "Opioids, mostly pills and then heroin, almost every day for about six years before residential. Mostly smoked, and I injected a few times early on.",
    useNote: "Opioids (pills, then heroin), almost daily for about six years before residential; mostly smoked, injected a few times early on (N.G.).",
    lastUse: "About seven weeks ago, the day before I started residential.",
    lastUseNote: "Last use about seven weeks ago, the day before entering residential (N.G.).",
    withdrawal: "The first time I quit it was terrible. I was sick for days. I don't remember much about it.",
    withdrawalNote: "Reports a very hard first withdrawal, sick for days; details not remembered (N.G.).", withdrawalClear: false,
    treatment: "The twenty-eight-day program in 2024, then residential this year. I've been on buprenorphine since residential. Never methadone.",
    treatmentNote: "28-day program in 2024; residential this year; buprenorphine since residential; no methadone (N.G.).",
    medical: "I was told I tested positive for hepatitis C in 2023 and never followed up. Nothing else.",
    medicalNote: "Reports a positive hepatitis C test in 2023 with no follow-up; no other conditions mentioned (N.G.). Confirm with records.",
    psych: "Anxiety, mostly. A counselor in residential talked with me about trauma. I've never been in a psychiatric hospital.",
    psychNote: "Anxiety; trauma discussed with a counselor in residential; no psychiatric hospital stays (N.G.).",
    env: "I live with my cousin, who doesn't use. A few people from my old crowd still text me. The bus runs near his place.",
    envNote: "Lives with a cousin who does not use; a few former using contacts still text; a bus line near the home (N.G.).",
    whyRes: "I think I can do a day program if I have a schedule. Mornings at home are the hardest.",
    whyResNote: "Thinks a scheduled day program could work; mornings at home are hardest (N.G.).",
    person: "I want to keep the medication. And I'd like to get my license back and work again.",
    personNote: "Wants to continue medication, regain a driver's license and return to work (N.G.).",
  },
};

/* ------------------------------------------------------------------ J.B., 36: SUD residential (scenario D) */
const JB: Persona = {
  id: "jb", who: "J.B.", age: 36, cg: null, historyKind: "substance",
  core: {
    reason: "I finished withdrawal management on the sixteenth. The doctor there said I need residential treatment for my drinking.",
    presenting: "Completed withdrawal management on 10/16; referred for residential treatment for alcohol use (J.B.).",
    symptoms: "No shakes now. I'm sleeping better. Cravings are strongest at night. I feel ashamed and tired.",
    symptomsNote: "No tremor now; sleep improved; cravings strongest at night; ashamed and tired (J.B.).",
    history: "I've drunk heavily for about ten years. It got worse after my divorce.",
    historyNote: "Heavy drinking for about ten years, increasing after a divorce (J.B.).",
    prior: "Outpatient counseling twice in the past year; withdrawal management completed 10/16 without complications (J.B.).",
    meds: "Naltrexone from the withdrawal center and a multivitamin. Nothing else.",
    medsNote: "Naltrexone started at the withdrawal center; multivitamin (J.B.). Confirm dose with the prescriber.",
    functioning: "I missed a lot of work this year. I'm on leave now. My apartment is a mess and I haven't been paying bills.",
    functioningNote: "Missed many days of work; on leave now; trouble with housekeeping and bills (J.B.).",
    supports: "My brother calls every day. My landlord is patient with me.",
    supportsNote: "A brother who calls daily; a patient landlord (J.B.).",
    strengthsNote: "Completed withdrawal management; motivated to enter residential treatment; a brother in daily contact (J.B.).",
    barriers: "My place is full of bottles. I can't go back there yet. I don't have a car.",
    sdohNote: "Home environment has alcohol in it; no car (J.B.).",
    transport: "No car",
    risk: [{ say: "No. I haven't thought about hurting myself. I just want to stop drinking.", text: "When asked, J.B. denied thoughts of hurting himself.", alert: false }],
    goals: "Get sober, keep my job, and fix things with my brother.",
    goalsNote: "Get sober, keep the job and repair the relationship with a brother (J.B.).",
    needsNote: "Wants a structured place to stay while recovering. Level of care and service options are for the clinician to consider.",
    summary: "J.B., 36, completed withdrawal management on 10/16 and asks for residential treatment for alcohol use. J.B. describes heavy drinking for about ten years, two relapses in the past year and a home with alcohol in it. J.B. denied thoughts of self-harm when asked; a clinician documents the safety screening. The scribe makes no diagnosis and does not select a level of care.",
    plan: "Clinician to document the safety screening and medical clearance. Confirm the naltrexone dose. Review the proposals in each assessment module before anything is accepted.",
  },
  sud: {
    use: "Beer and then liquor, most days, about a pint of liquor a day at the worst. For about ten years.",
    useNote: "Alcohol (beer, then liquor), most days for about ten years; about a pint of liquor daily at the heaviest (J.B.).",
    lastUse: "October 12th. I went to the withdrawal center that night.",
    lastUseNote: "Last drink 10/12, the night before entering withdrawal management (J.B.).",
    withdrawal: "The first couple of days were bad, shaking and sweating. No seizures and no hospital. The center says I went through it fine.",
    withdrawalNote: "Shaking and sweating in the first days; no seizures and no hospital stay for withdrawal reported (J.B.).", withdrawalClear: true,
    treatment: "Outpatient counseling twice this year, a few visits each time. The withdrawal center. No residential before.",
    treatmentNote: "Outpatient counseling twice this year, a few visits each; withdrawal management 10/12 to 10/16; no residential treatment before (J.B.).",
    medical: "High blood pressure, on a pill for it. My liver tests were high at the center. They want me to see my doctor.",
    medicalNote: "Reports high blood pressure on medication and high liver tests at the withdrawal center (J.B.). Medical clearance is documented by a clinician.",
    psych: "Depression on and off. I saw a counselor about it once. No hospital stays.",
    psychNote: "Depression on and off; one visit with a counselor; no psychiatric hospital stays (J.B.).",
    env: "I live alone and there's alcohol in the apartment. My coworkers drink after work. My brother lives across town.",
    envNote: "Lives alone with alcohol in the home; coworkers who drink after work; a brother across town (J.B.).",
    whyRes: "Both times I tried outpatient I was drinking within a month. I can't be in that apartment right now.",
    whyResNote: "Returned to drinking within a month of both outpatient attempts; cannot return to the current home yet (J.B.).",
    person: "I want a place where I can focus and then go back to work.",
    personNote: "Wants a place to focus on recovery and a plan to return to work (J.B.).",
  },
};

/* ------------------------------------------------------------------ H.T., 45: mental health PHP step-down (scenario E) */
const HT: Persona = {
  id: "ht", who: "H.T.", age: 45, cg: null, historyKind: "psychiatric",
  core: {
    reason: "I was in the hospital for two weeks. I'm home now, but I can't be alone all day. They said a day program might help.",
    presenting: "Step-down after a two-week inpatient stay; asks for a day program because being alone all day is hard (H.T.).",
    symptoms: "Low mood most days, no energy. I wake at four and can't get back to sleep. My appetite is poor.",
    symptomsNote: "Low mood most days; low energy; early waking around 4 am; poor appetite (H.T.).",
    history: "I was on medication for depression in my thirties for a couple of years. Then this fall got bad after my mother died.",
    historyNote: "Treated with medication for depression in her thirties; this fall's symptoms followed her mother's death (H.T.). The chart documents the diagnosis; the scribe does not diagnose.",
    prior: "Outpatient psychiatry with medication in her thirties; weekly therapy for six months last year; inpatient stay this month (H.T.).",
    meds: "Sertraline and something for sleep. The hospital changed the dose. I don't have the list with me.",
    medsNote: "Sertraline and a sleep medicine; the dose was changed in the hospital; names and doses to confirm from the discharge summary (H.T.).",
    functioning: "I stopped working in September. I haven't cooked or paid a bill in weeks. My sister helps.",
    functioningNote: "Stopped working in September; not cooking or paying bills for weeks; a sister helps (H.T.).",
    supports: "My sister drives me everywhere. A neighbor checks in.",
    supportsNote: "A sister who drives her; a neighbor who checks in (H.T.).",
    strengthsNote: "Engaged in follow-up care; a sister and a neighbor who help; worked steadily until September (H.T.).",
    barriers: "I can't drive right now. The day program needs to be close to my sister's house.",
    sdohNote: "Not driving at present; needs a program near her sister's home (H.T.).",
    transport: "Not driving at present; a sister drives her",
    risk: [{ say: "Some days I wish I wouldn't wake up. I don't have a plan.", text: "H.T. said: \"Some days I wish I wouldn't wake up.\" H.T. said there is no plan.", alert: true }],
    goals: "Sleep through the night, get back to work part time, and not be afraid of being alone.",
    goalsNote: "Sleep through the night, return to work part time and feel less afraid of being alone (H.T.).",
    needsNote: "Wants structured daytime support after the hospital. Level of care and service options are for the clinician to consider.",
    summary: "H.T., 45, home after a two-week inpatient stay and asking for a day program. H.T. describes low mood, early waking, poor appetite, trouble with daily tasks and fear of being alone. H.T. said \"some days I wish I wouldn't wake up\" and that there is no plan; a clinician reviews this with the safety alert. The scribe makes no diagnosis and makes no statement about medical necessity or level of care.",
    plan: "Clinician to document the safety screening and review the alert. Get the discharge summary and the current medication list. Review the proposals in each assessment module before anything is accepted.",
  },
  mh: {
    history: "Depression, that's what they told me. Two weeks in the hospital this fall, my first time. No other stays.",
    historyNote: "Told she has depression; one inpatient stay this fall, her first, and no others (H.T.).",
    severity: "Most days now, and worst in the morning. Compared with last spring it's more days and heavier.",
    severityNote: "Symptoms on most days, worst in the morning; more frequent and heavier than last spring (H.T.).",
    recent: "Two weeks in the hospital after I stopped eating and couldn't get out of bed. I came home last week. No ER visits or crisis calls before this.",
    recentNote: "Two weeks inpatient after she stopped eating and could not get out of bed; home last week; no earlier ER visits or crisis calls (H.T.).",
    tried: "Weekly therapy for six months last year helped a little, then I stopped. The medication helped before, but not this time.",
    triedNote: "Weekly therapy for six months last year helped a little and was stopped; medication helped before but not this time (H.T.).",
  },
};

/* ------------------------------------------------------------------ R.H., 41: adult CPST (scenario A) */
const RH: Persona = {
  id: "rh", who: "R.H.", age: 41, cg: null, historyKind: "psychiatric",
  core: {
    reason: "My skill-building program ends in June. I want to know what comes next. I'm doing well, but I still need help.",
    presenting: "Planning services for after Mental Health Skill-Building retires on June 30, 2027; doing well and still relies on help with medications and bills (R.H.).",
    symptoms: "I haven't heard the voices in over a year. I worry they'll come back if things change. Sleep is fine.",
    symptomsNote: "No voices for over a year; worries symptoms could return if services change; sleep is fine (R.H.).",
    history: "Two hospital stays in 2023, both after I stopped my medications.",
    historyNote: "Two hospitalizations in 2023, both after stopping medications (R.H.). The chart documents schizoaffective disorder, bipolar type; the scribe does not diagnose.",
    prior: "Mental Health Skill-Building since 2024; two hospitalizations in 2023 (R.H.).",
    meds: "Two, one for the voices and one for my mood. I don't remember the names. The pharmacy has them.",
    medsNote: "Two medications (one for psychosis, one for mood); names and doses not stated, confirm with the pharmacy or prescriber (R.H.).",
    functioning: "I keep my apartment. I need reminders for my medications and help with budgeting.",
    functioningNote: "Keeps his apartment; relies on reminders for medications and help with budgeting (R.H.).",
    supports: "My sister on Sundays and my skill-building worker Monday, Wednesday and Friday.",
    supportsNote: "A sister seen every Sunday; a skill-building worker three days a week (R.H.).",
    strengthsNote: "Works 20 hours a week at a grocery store; keeps his apartment; regular contact with his sister and a worker (R.H.).",
    barriers: "Rent is most of my check, and I take the bus everywhere. It's okay as long as nothing changes.",
    sdohNote: "Lives alone; rent takes most of his income; relies on the bus (R.H.).",
    transport: "Relies on the bus",
    risk: [{ say: "Last winter I told my sister I didn't see the point sometimes. It's been better since, and I'm not thinking that now.", text: "R.H. said: \"Last winter I told my sister I didn't see the point sometimes.\" R.H. said it has been better since and he is not thinking that now.", alert: true }],
    goals: "Full-time work, maybe at the store. A friend goes to a clubhouse and they helped him get a job.",
    goalsNote: "Full-time work; interested in a clubhouse (R.H.).",
    needsNote: "Asks for support to continue after MHSS ends and help moving to full-time work. Service options are for the clinician to consider.",
    summary: "R.H., 41, receives Mental Health Skill-Building, which retires on June 30, 2027. R.H. reports no voices for over a year, works 20 hours a week and relies on reminders for medications and help with budgeting. R.H. said he told his sister last winter that he did not see the point sometimes; a clinician reviews this with the safety alert. R.H. wants full-time work and is interested in a clubhouse. The scribe does not decide which service fits.",
    plan: "Clinician to document the safety screening and review the alert. Confirm medications with the pharmacy. Renew the current authorization through June 30, 2027. Review the proposals in each assessment module before anything is accepted.",
  },
  community: {
    needs: "Reminders for my medications, help with the budget, and someone to go with me to appointments when things get stressful.",
    needsNote: "Needs reminders for medications, help budgeting and company at appointments when stressed (R.H.).",
    living: "I live alone in my apartment. I work twenty hours at the grocery store. Sundays I see my sister. I'd like to get out more.",
    livingNote: "Lives alone; works 20 hours a week; sees a sister on Sundays; would like more community activity (R.H.).",
    services: "Something like what I have now, but one that keeps going after June. And help getting more hours at work.",
    servicesNote: "Asks for support like the current program that continues after June, and help getting more work hours (R.H.). Service options are for the clinician to consider.",
  },
};

/* ------------------------------------------------------------------ T.W., 14: youth CPST, school setting (scenario B) */
const TW: Persona = {
  id: "tw", who: "T.W.", age: 14, cg: "Mother (guardian)", historyKind: "psychiatric",
  core: {
    reason: "I just don't want to be at school. People keep starting stuff with me.",
    presenting: "School avoidance since September: 9 days missed, leaves class most afternoons, conflicts with peers that ended in removal from class (mother and T.W.).",
    symptoms: "I can't fall asleep. My head just keeps going. Then I'm tired in class and I get in trouble.",
    symptomsNote: "Withdrawn at home; up until 1 or 2 am; trouble falling asleep with racing thoughts; drawing less than before (mother and T.W.).",
    history: "I saw a counselor for a few months last year, before we moved. And I've had a 504 plan since 2024 for attention.",
    historyNote: "Outpatient counseling for a few months in 2025 before the family moved; a 504 plan for attention since 2024 (mother).",
    prior: "Outpatient counseling for a few months in 2025 (the 2025 EMR record shows 7 sessions); 504 plan since 2024 (mother).",
    meds: "No, nothing.",
    medsNote: "None, per mother.",
    functioning: "I'm failing three classes. Art is fine. Ms. Alvarez lets me eat lunch in her room.",
    functioningNote: "Failing 3 of 5 classes; 9 school days missed; removed from class three times after peer conflicts (T.W. and mother).",
    supports: "My mom. And a few friends. Ms. Alvarez, my art teacher.",
    supportsNote: "An engaged mother; a small group of friends; a trusted art teacher (T.W.).",
    strengthsNote: "Does well in art and enjoys drawing; trusted relationship with his art teacher; a small group of friends; an engaged mother.",
    barriers: "I work evenings, and we don't have a car, so it has to be something he can get to.",
    sdohNote: "Mother works evenings; no car, the family relies on the bus; services need to be easy to reach, ideally at school (mother).",
    transport: "No car; relies on the bus",
    risk: [{ say: "Sometimes I think it would be easier if I wasn't around. But I wouldn't do anything.", text: "T.W. said: \"Sometimes I think it would be easier if I wasn't around. But I wouldn't do anything.\"", alert: true }],
    goals: "Get back into art club. And not get kicked out of class.",
    goalsNote: "T.W.: get back into art club and stop being removed from class. Mother: better sleep and going to school every day.",
    needsNote: "Family asks for support at school, and help with sleep and mood now. Service options are for the clinician to consider.",
    summary: "T.W., 14, referred by his school for school avoidance, peer conflicts and falling grades since September. T.W. and his mother describe withdrawal at home and trouble falling asleep. T.W. said it would sometimes be easier if he were not around; a clinician reviews this with the safety alert. Strengths include art, a trusted teacher and an engaged mother. The scribe makes no diagnosis.",
    plan: "Clinician to document the safety screening and the safety plan. Collect guardian consent and the school release. Review the proposals in each assessment module before anything is accepted.",
  },
  community: {
    needs: "Help getting to school every day, and someone to talk to when I get mad, so I don't get kicked out of class.",
    needsNote: "Needs help getting to school every day and someone to talk to when angry, so he is not removed from class (T.W.).",
    living: "I live with my mom. I draw. I hang out with two friends after school sometimes.",
    livingNote: "Lives with his mother; draws; sees two friends after school sometimes (T.W.).",
    services: "Support at school would help. The counselor said they might have something next year.",
    servicesNote: "Family asks for support at school; the school counselor mentioned an option next school year (mother). Service options are for the clinician to consider.",
  },
  youth: {
    school: "I'm failing three classes, and I've missed nine days since September. I leave class most afternoons. I have a 504 plan.",
    schoolNote: "Failing 3 of 5 classes; 9 days missed since September; leaves class most afternoons; a 504 plan since 2024 (T.W. and mother). Rivermont Middle School (fictional).",
    family: "He's quiet at home. His room, his phone until one or two in the morning. His father lives out of state and calls on Sundays.",
    familyNote: "Lives with his mother; his father lives out of state and calls on Sundays; quiet at home, in his room, on his phone late at night (mother).",
    coordination: "Yes, you can talk to the school counselor. I'll sign the release today.",
    coordinationNote: "Mother agrees to contact with the school counselor and will sign the release today (mother). The signed release is not on file yet.",
    cans: "Mornings after a bad night are the hardest. On art days he goes in without a fight. And when his dad calls on Sunday he settles down for the evening.",
    cansFunctioning: "Mornings after a poor night's sleep are the hardest for getting to school; on art days he goes in without a fight (mother).",
    cansFamily: "His father, who lives out of state, calls on Sundays, and he settles down for the evening afterwards (mother).",
  },
};

/* ------------------------------------------------------------------ A.K., 19: coordinated specialty care (scenario F) */
const AK: Persona = {
  id: "ak", who: "A.K.", age: 19, cg: "Mother", historyKind: "psychiatric",
  core: {
    reason: "I got out of the hospital last week. The voices are less, but I'm tired all the time, and they said a team could help me get back to school.",
    presenting: "Follow-up after a first psychiatric admission (10/12 to 10/19/2026); the hospital referred A.K. to a Coordinated Specialty Care team (A.K. and mother).",
    symptoms: "The voices are less, mostly at night. I still feel like people are watching me sometimes. The medicine makes me sleep until noon.",
    symptomsNote: "Voices less frequent since the hospital, mostly at night; still sometimes feels watched; sleeping until about noon, which he relates to the medication (A.K.).",
    history: "I stopped going to classes in September. I thought my roommates were talking about me. Then the hospital.",
    historyNote: "First psychiatric admission 10/12 to 10/19/2026; symptoms began about six weeks earlier (discharge summary and A.K.).",
    prior: "No outpatient mental health care before this admission (A.K. and mother).",
    meds: "He's taking it every night. I make sure. I don't have the pharmacy name here.",
    medsNote: "Takes the discharge medication nightly with his mother's help; pharmacy not stated (mother).",
    functioning: "I stopped going to classes in September, and I'm not working. I live with my mother since the hospital.",
    functioningNote: "Stopped community college classes in September; not working; living with his mother since discharge (A.K.).",
    supports: "I make beats on my laptop. And my mom is here, whatever I need.",
    supportsNote: "Motivated to return to school; makes music on his laptop; strong support from his mother (A.K. and mother).",
    strengthsNote: "Motivated to return to school; makes music on his laptop; strong support from his mother.",
    barriers: "We need help with the bus pass. He can't drive on this medicine yet.",
    sdohNote: "Lives with his mother; not driving at present; asks for help with the cost of a bus pass (mother).",
    transport: "Not driving at present; needs help with a bus pass",
    risk: [{ say: "He still says what's the point, sometimes, when he's frustrated.", text: "Mother reports A.K. still sometimes says \"what's the point\" when frustrated.", alert: true }],
    goals: "Going back to school in the spring. Feeling normal again.",
    goalsNote: "Return to community college classes in the spring; \"feel normal again\" (A.K.).",
    needsNote: "The hospital recommends Coordinated Specialty Care, psychiatry follow-up within 7 days, family psychoeducation and supported education; A.K. wants help getting back to class. Service options are for the clinician to consider.",
    summary: "A.K., 19, after a first psychiatric admission (10/12 to 10/19/2026). The voices are less frequent on medication and A.K. sleeps until about noon. His mother reports he sometimes says \"what's the point\"; a clinician reviews this with the safety alert. Psychiatry follow-up within 7 days is not scheduled. The scribe makes no diagnosis or service decision.",
    plan: "Schedule psychiatry follow-up within 7 days of discharge. Review the hospital safety plan with A.K. and his mother. Review the proposals in each assessment module before anything is accepted.",
  },
  csc: {
    course: "About six weeks before the hospital. First I couldn't concentrate, then I thought my roommates were talking about me, then I heard voices at night. Nobody treated it before the hospital.",
    courseNote: "Symptoms began about six weeks before the 10/12 admission: trouble concentrating, then a belief that roommates were talking about him, then voices at night; no treatment before the admission (A.K.).",
    changes: "I dropped my classes, I stopped seeing my friends, and I stopped cooking. I used to work at the music store.",
    changesNote: "Dropped his classes, stopped seeing friends and stopped cooking; previously worked at a music store (A.K.).",
    family: "My mother is here every day. My brother calls. They both want to come to the family sessions, if there are any.",
    familyNote: "His mother is involved daily; a brother calls; both are willing to join family sessions (A.K.).",
    coordination: "Yes, the hospital and the college can talk with you. We'll sign what you need.",
    coordinationNote: "A.K. and his mother agree to contact with the hospital and the college; releases are not on file yet (mother).",
  },
};

/* ------------------------------------------------------------------ Z.A., 6: applied behavior analysis (scenario H) */
const ZA: Persona = {
  id: "za", who: "Z.A.", age: 6, cg: "Parent (guardian)", historyKind: "developmental",
  core: {
    reason: "His pediatrician recommended ABA after the autism diagnosis this year. We're hoping it helps with talking and with the meltdowns.",
    presenting: "Parent asks for ABA after an autism diagnosis in 2026; wants help with spoken communication and meltdowns (parent).",
    symptoms: "He doesn't sleep through the night. He's a very picky eater. Loud places are hard.",
    symptomsNote: "Wakes during the night; very selective eating; difficulty in loud places (parent).",
    history: "He didn't talk until three. We had him evaluated last spring. He had speech therapy for a year.",
    historyNote: "First words at about three years; evaluated in spring 2026; speech therapy for about a year (parent).",
    prior: "Speech therapy for about a year; diagnostic evaluation in spring 2026 (parent).",
    meds: "None. Just vitamins.",
    medsNote: "None; vitamins (parent).",
    functioning: "He needs help getting dressed and with the bathroom. At school he stays with an aide.",
    functioningNote: "Needs help with dressing and toileting; has a school aide (parent).",
    supports: "Grandma helps on weekends. His teacher is great. He loves trains.",
    supportsNote: "A grandmother who helps on weekends; a supportive teacher; strong interest in trains (parent).",
    strengthsNote: "Strong interest in trains; learns from pictures; a supportive teacher and grandmother (parent).",
    barriers: "I work days. We can do afternoons or Saturdays. We live twenty minutes from the clinic.",
    sdohNote: "Parent works days; afternoons or Saturdays work best; twenty minutes from the clinic (parent).",
    transport: "Parent drives; twenty minutes from the clinic",
    risk: [{ say: "When he's really upset he hits his head with his hand. Twice a week, maybe. No marks.", text: "Parent reports Z.A. hits his own head with his hand when very upset, about twice a week, without marks.", alert: true }],
    goals: "Talking more. Fewer meltdowns. Going to the store without a crisis.",
    goalsNote: "More spoken language; fewer meltdowns; shopping trips without a crisis (parent).",
    needsNote: "Asks for ABA, as the pediatrician recommended, to help with communication and behavior. Service options and hours are for the clinician to consider.",
    summary: "Z.A., 6, referred for ABA after an autism diagnosis in 2026. The parent describes limited spoken language, meltdowns, picky eating and sleep trouble, and reports Z.A. hits his own head with his hand when very upset; a clinician reviews this with the safety alert. The parent wants help with communication and daily routines. The scribe makes no diagnosis and does not select hours or a level of service.",
    plan: "Clinician to document the safety screening for the head-hitting. Get the 2026 diagnostic evaluation and the school plan. Review the proposals in each assessment module before anything is accepted.",
  },
  aba: {
    development: "First words at three, short phrases at five. He walked at fourteen months. He has always been sensitive to sound.",
    developmentNote: "First words at about three, short phrases at five; walked at 14 months; sensitive to sound (parent).",
    diagnosis: "Dr. Mehta did the evaluation in April. We have the report at home. The pediatrician sent a referral too.",
    diagnosisNote: "Parent reports a diagnostic evaluation in April 2026 by Dr. Mehta (fictional) and has the report; the pediatrician sent a referral (parent). Psyflo does not diagnose: the evaluation on file is the source.",
    adaptive: "He can say a few words to ask for things. He doesn't play with other kids yet. He needs help with brushing teeth and dressing.",
    adaptiveNote: "Asks for things with a few words; does not yet play with other children; needs help with teeth brushing and dressing (parent).",
    behaviors: "Meltdowns when we change plans or leave the park. Crying, dropping to the floor, sometimes hitting. About five a week, ten or fifteen minutes each.",
    behaviorsNote: "Meltdowns when plans change or when leaving a place: crying, dropping to the floor, sometimes hitting; about five a week lasting 10 to 15 minutes (parent).",
    caregiver: "I can come to every session on Saturdays, and Grandma on weekdays. We want to learn what to do at home.",
    caregiverNote: "Parent can attend Saturday sessions and a grandmother weekday sessions; the family wants home strategies (parent).",
    goals: "Asking for what he wants in words. Staying calm when we leave the park. Playing next to another kid.",
    goalsNote: "Asking for wants in words; staying calm when leaving a place; playing alongside another child (parent). Goals are written by the clinician.",
  },
};

/* ------------------------------------------------------------------ which persona a record gets */
const BY_RECORD: Record<string, Persona> = { "IN-3112": NG, "IN-3110": JB, "IN-3115": HT, "IN-3102": RH, "IN-3101": TW, "IN-3103": AK, "IN-3117": ZA };
const SUD: ProgramId[] = ["sud-op", "sud-iop", "sud-php", "sud-res", "sud-wm", "sud-inpt", "otp", "obot"];
const YOUTH: ProgramId[] = ["cpst-youth", "cpst-school", "school-bh", "children-intensive", "family-based", "youth-iop", "youth-php"];
const ADULT_COMMUNITY: ProgramId[] = ["cpst-adult", "mhcm", "clubhouse", "cbbh", "act", "psr"];

/** The fictional person who "speaks" in the interview for a record: the scenario's own person, or the one that fits the program, wearing the record's initials and age. */
export function personaFor(r: { id: string; initials: string; age: number | null }, programId: ProgramId): Persona {
  const own = BY_RECORD[r.id];
  const pick = own ?? (programId === "aba" ? ZA : programId === "csc" ? AK : YOUTH.includes(programId) ? TW : SUD.includes(programId) ? (programId === "sud-res" || programId === "sud-wm" || programId === "sud-inpt" ? JB : NG) : ADULT_COMMUNITY.includes(programId) ? RH : HT);
  if (own) return own;
  const who = r.initials || pick.who;
  const age = r.age ?? pick.age;
  /* The initials and age inside the text follow the record; everything else is the representative person's story. */
  const swap = (text: string): string => text.split(`${pick.who}, ${pick.age}`).join(`${who}, ${age}`).split(pick.who).join(who);
  const retell = <T,>(v: T): T => (typeof v === "string" ? (swap(v) as T) : Array.isArray(v) ? (v.map(retell) as T) : v && typeof v === "object" ? (Object.fromEntries(Object.entries(v).map(([k, x]) => [k, retell(x)])) as T) : v);
  return { ...retell(pick), id: `${pick.id}-${r.id}`, who, age, cg: r.age !== null && r.age < 18 ? (pick.cg ?? "Parent (guardian)") : pick.cg };
}
