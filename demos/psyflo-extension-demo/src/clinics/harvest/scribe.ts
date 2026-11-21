import type { ScribeScenario, SessionLine } from "../../types";
import { AGGRESSION } from "./forms";

/* Five Scribe scenarios (sample conversations, initials only). Each draft restates only what was said, or quotes the chart.
   A field nothing was said about is { from: "none" }: it stays empty and the clinician decides.
   The facts come from the earlier Harvest rounds (68-dpn voice note, 66-screening call, 69-intake interview). */

const L = (t: string, who: string, text: string): SessionLine => ({ t, who, text });

/* ------------------------------------------------------------------------------------------------
   dpn-4471 · M.R. · daily progress note · live (a staff member and the clinician)                */
const dpnLines: SessionLine[] = [
  /* 0 */ L("0:03", "Clinician", "Voice note for M.R., October 29th, 1:42 pm. What did you work on with him?"),
  /* 1 */ L("0:08", "Staff", "We played basketball, 1:10 to 1:40, for frustration tolerance. Movement helps him settle."),
  /* 2 */ L("0:15", "Clinician", "How did it go?"),
  /* 3 */ L("0:18", "Staff", "He got frustrated when he lost and walked off the court."),
  /* 4 */ L("0:24", "Clinician", "What did you do then?"),
  /* 5 */ L("0:27", "Staff", "We did a walk together and he came back."),
  /* 6 */ L("0:33", "Clinician", "How long was he out, and did he need a prompt?"),
  /* 7 */ L("0:38", "Staff", "About six minutes. I prompted him once to use his words with the other player."),
  /* 8 */ L("0:45", "Clinician", "How intense was it?"),
  /* 9 */ L("0:48", "Staff", "Moderate. No one was hurt."),
  /* 10 */ L("0:54", "Clinician", "Did he use a calm-down strategy on his own before he left the court?"),
  /* 11 */ L("0:58", "Staff", "Not this time. The walk and the prompt got him back."),
  /* 12 */ L("1:03", "Clinician", "Thanks. That is all I need for the note."),
];

const dpn4471: ScribeScenario = {
  docId: "dpn-4471", mode: "live",
  consentScript: "I would like to record this note so I can write it accurately. Is that all right with you?",
  who: "K. Hale and Jordan Perez (daily note for M.R.)",
  lines: dpnLines,
  length: "1:08",
  context: ["isp-g1", "note-sep15", "note-oct27", "notes-30d"],
  draft: {
    goal: { value: "Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations", from: "chart", chart: "isp-g1", note: "The plan’s Objective 1, quoted. The Sep 15 and Oct 27 notes cite the same objective." },
    ints: { value: ["Clinical 2.1 Movement", "QMHP 1.9 Solving peer conflict"], from: "session", lines: [1, 7] },
    intervention: {
      value: "Clinical 2.1 Movement: basketball with M.R. for frustration tolerance; movement helps him settle. After he walked off the court, staff walked with him. Staff prompted him once to use his words with the other player (QMHP 1.9 Solving peer conflict).",
      from: "session", lines: [1, 5, 7],
    },
    duration: { value: "30 min (1:10–1:40 pm)", from: "session", lines: [1] },
    response: {
      value: "Frustrated when he lost the game and walked off the court (moderate intensity; no one hurt). Came back after the walk with staff, about 6 minutes out.",
      from: "session", lines: [3, 5, 7, 9],
    },
    progress: {
      value: "Losing a game led to 1 escalation. He did not use a calm-down strategy on his own first (0 of 1); he returned after a walk with staff and 1 prompt.",
      from: "session", lines: [3, 5, 7, 11],
    },
    needs: { value: "", from: "none", note: "Nothing was said about continuing needs." },
  },
};

/* ------------------------------------------------------------------------------------------------
   adm-4492 · T.W. · admission screening · live (a phone call with his grandmother)                */
const admLines: SessionLine[] = [
  /* 0 */ L("0:14", "Clinician", "Thank you for calling in. This is Jordan Perez, screening clinician at Harvest Outreach. Before we start, I record this call so my notes are accurate. Is that okay with you?"),
  /* 1 */ L("0:31", "Guardian", "Yes, that is fine."),
  /* 2 */ L("1:20", "Clinician", "I have the school's referral from October 13th. In your own words, what has been happening with T.W. at school?"),
  /* 3 */ L("2:05", "Guardian", "He hits and shoves other kids, and he has been sent to the office more than once."),
  /* 4 */ L("6:10", "Clinician", "Does he ever leave the room or the building?"),
  /* 5 */ L("6:40", "Guardian", "Yes. On October 6th he walked out to the parking lot and got a day of in-school suspension. He doesn’t see what could happen out there."),
  /* 6 */ L("10:25", "Clinician", "How is he with adults, at school and at home?"),
  /* 7 */ L("10:52", "Guardian", "He argues about everything, and it is always somebody else’s fault. It has been like this since last school year, at home too."),
  /* 8 */ L("15:30", "Clinician", "What does the school have in place?"),
  /* 9 */ L("15:58", "Guardian", "He has an IEP, and a behavior interventionist sees him two times a week since September. Nothing has changed. The school brought up a different school twice this year."),
  /* 10 */ L("20:20", "Clinician", "Has he seen anyone outside of school? Any health problems or medicines?"),
  /* 11 */ L("20:48", "Guardian", "Piedmont Counseling, March to June last year. We lost our ride and it stopped, and it had not changed anything. He has asthma, an albuterol inhaler when he needs it. No other medicines."),
  /* 12 */ L("26:05", "Clinician", "Has he ever talked about hurting himself or anyone?"),
  /* 13 */ L("26:30", "Guardian", "Not himself, no. He hits other kids, like I said."),
  /* 14 */ L("31:10", "Clinician", "Thank you. I have what I need for now."),
];

const adm4492: ScribeScenario = {
  docId: "adm-4492", mode: "live",
  consentScript: "Before we start, I record this call so my notes are accurate. Is that okay with you?",
  who: "Jordan Perez and T.W.’s grandmother (phone call)",
  lines: admLines,
  length: "38:12",
  context: ["ref-oct13", "counselor-oct15", "school-oct15", "incident-oct6"],
  draft: {
    completed: { value: "Jordan Perez, screening clinician (phone call with the guardian)", from: "session", lines: [0] },
    concerns: {
      value: "He hits and shoves other kids, and he has been sent to the office more than once. He walked out to the parking lot on October 6 and got a day of in-school suspension; his grandmother says he does not see what could happen out there. He argues about everything, and it is always somebody else’s fault, at school and at home since last school year. He has an IEP, and a behavior interventionist sees him two times a week since September; nothing has changed. The school has brought up a different school twice this year. He saw Piedmont Counseling from March to June last year; it stopped when the family lost their ride and it had not changed anything.",
      from: "session", lines: [3, 5, 7, 9, 11],
    },
    iep: { value: "Yes", from: "session", lines: [9] },
    risk: {
      value: [AGGRESSION], from: "session", lines: [13],
      note: "Ticked what the guardian named when asked about risk. Leaving the building came up in another answer (line 5); whether it is a risk box is your call.",
    },
    meds: { value: "Albuterol inhaler as needed (asthma). No other medicines.", from: "session", lines: [11] },
    trauma: { value: "", from: "none", note: "Nothing was said about trauma. Psyflo does not draft this box." },
    safety: { value: "", from: "none", note: "A safety plan was not discussed on the call." },
  },
};

/* ------------------------------------------------------------------------------------------------
   intake-4492 · T.W. · Comprehensive Needs Assessment · live (an interview with his grandmother)  */
const intakeLines: SessionLine[] = [
  /* 0 */ L("0:12", "Clinician", "Thank you both for coming in. You each signed the consent, so I am recording now. Tell me if you want a break."),
  /* 1 */ L("0:41", "Guardian", "That is fine. Ask whatever you need."),
  /* 2 */ L("2:10", "Clinician", "Let us start with why you are here. What has been going on?"),
  /* 3 */ L("2:34", "Guardian", "The school keeps calling about him pushing and shoving other kids, and about him leaving the building. I want help keeping him in school."),
  /* 4 */ L("3:10", "Clinician", "Which school, what grade, and does he have an IEP?"),
  /* 5 */ L("3:32", "Guardian", "Lynchburg City, middle school, sixth grade. He has an IEP. It was reviewed in March. A behavior interventionist sees him two times a week since September."),
  /* 6 */ L("9:05", "Clinician", "How have his grades and attendance been this fall?"),
  /* 7 */ L("9:28", "Guardian", "Down. He got a day of in-school suspension. He misses a lot of days."),
  /* 8 */ L("18:20", "Clinician", "Who lives at home with T.W., and what does a normal day look like?"),
  /* 9 */ L("18:52", "Guardian", "Just the two of us. I have raised him since he was four. We are in a steady place in Lynchburg. We get up at six thirty and he rides to school. He is home about three thirty. Homework, then basketball. Nights are the hard part. He is up most nights."),
  /* 10 */ L("31:15", "Clinician", "Any medical problems or medicines? Anything in the family?"),
  /* 11 */ L("31:44", "Guardian", "Asthma. He uses an albuterol inhaler when he needs it and it stays with the school nurse. No other medicines. A family member has had depression."),
  /* 12 */ L("44:30", "Clinician", "Has he seen anyone for counseling before? Any hospital stays or diagnoses?"),
  /* 13 */ L("44:58", "Guardian", "Piedmont Counseling, March to June last year, six visits. We lost our ride and it stopped. No hospital stays and no diagnoses."),
  /* 14 */ L("58:10", "Clinician", "Is there anything else about home or school you want me to know?"),
  /* 15 */ L("58:36", "Guardian", "No. I just want him to stay in school."),
  /* 16 */ L("1:12:05", "Clinician", "Thank you. I will write the plan next. Please sign the releases for the school and Piedmont."),
];

const intake4492: ScribeScenario = {
  docId: "intake-4492", mode: "live",
  consentScript: "You each signed the consent, so I am recording now. Tell me if you want a break.",
  who: "Jordan Perez, T.W. and his grandmother (intake interview)",
  lines: intakeLines,
  length: "1:12:30",
  context: ["ref-oct13", "school-oct15", "counselor-oct15", "call-oct14"],
  draft: {
    reason: {
      value: "The school keeps calling about him pushing and shoving other kids and about him leaving the building. His grandmother asks for help keeping him in school.",
      from: "session", lines: [2, 3],
    },
    mhhx: { value: "No hospital stays and no diagnoses before (guardian).", from: "session", lines: [12, 13] },
    mhfam: { value: "A family member has had depression (guardian).", from: "session", lines: [11] },
    medh: { value: "Asthma, treated with an albuterol inhaler as needed; the inhaler stays with the school nurse. No other medicines.", from: "session", lines: [10, 11] },
    housing: { value: "Lives with his grandmother, who has raised him since he was four. Steady housing in Lynchburg.", from: "session", lines: [8, 9] },
    routine: { value: "Up at 6:30 and rides to school. Home about 3:30; homework, then basketball. Up most nights.", from: "session", lines: [9] },
    iep: { value: "IEP in place, last reviewed in March. A behavior interventionist sees him 2 times a week since September.", from: "session", lines: [4, 5] },
    abs: { value: "Misses a lot of days (guardian).", from: "session", lines: [6, 7], note: "No count was given. The school record may have one." },
    susp: { value: "1 day of in-school suspension (guardian).", from: "session", lines: [7] },
    classes: { value: "", from: "none", note: "Nothing was said about classes passing." },
    prior: { value: "Piedmont Counseling, March to June 2025, 6 visits. Ended when the family lost their ride.", from: "session", lines: [12, 13] },
    strengths: { value: "", from: "none", note: "Nothing was said about strengths." },
    risk: { value: [], from: "none", note: "No risk box was named in the interview." },
  },
};

/* ------------------------------------------------------------------------------------------------
   cans-4492 · T.W. · CANS · live (a guardian interview); fills the narrative boxes ONLY            */
const cansLines: SessionLine[] = [
  /* 0 */ L("0:10", "Clinician", "Before we start I am recording, so the narrative boxes match what you say. Is that all right?"),
  /* 1 */ L("0:25", "Guardian", "Yes."),
  /* 2 */ L("1:05", "Clinician", "Tell me about school: how is he in class and with the other kids?"),
  /* 3 */ L("1:30", "Guardian", "He pushes and shoves other kids when he is frustrated. The school says it is mostly at lunch and between classes. He is passing four of his seven classes."),
  /* 4 */ L("3:10", "Clinician", "What about attendance?"),
  /* 5 */ L("3:25", "Guardian", "He misses a lot of days. The school counted nine so far this year."),
  /* 6 */ L("5:00", "Clinician", "Does he ever leave the building?"),
  /* 7 */ L("5:20", "Guardian", "About once a week. On October 6th he walked out to the parking lot. He doesn’t see what could happen out there."),
  /* 8 */ L("7:10", "Clinician", "How are things at home, with you?"),
  /* 9 */ L("7:30", "Guardian", "We are close. I have raised him since he was four. Nights are hard; he is up most nights. I do not drive at night, so rides are hard for us."),
  /* 10 */ L("10:00", "Clinician", "Has he hurt anyone badly?"),
  /* 11 */ L("10:20", "Guardian", "No one has been badly hurt. The school says moderate."),
  /* 12 */ L("12:00", "Clinician", "What is he good at?"),
  /* 13 */ L("12:20", "Guardian", "Basketball and drawing. He listens to one teacher he trusts."),
  /* 14 */ L("14:00", "Clinician", "Thank you. That is what I need for the narratives."),
];

const cans4492: ScribeScenario = {
  docId: "cans-4492", mode: "live",
  consentScript: "Before we start I am recording, so the narrative boxes match what you say. Is that all right?",
  who: "Jordan Perez and T.W.’s grandmother (CANS interview)",
  lines: cansLines,
  length: "14:30",
  context: ["ref-oct13", "school-oct15", "incident-oct6"],
  draft: {
    n_behavioral: { value: "", from: "none", note: "Nothing was said about attention, anger or anxiety. Ratings are never drafted." },
    n_life: {
      value: "He pushes and shoves other kids when he is frustrated; the school says it is mostly at lunch and between classes. He is passing four of his seven classes. He misses a lot of days; the school counted nine so far this year. At home they are close and his grandmother has raised him since he was four. Nights are hard and he is up most nights. His grandmother does not drive at night, so rides are hard.",
      from: "session", lines: [3, 5, 9],
    },
    n_risk: {
      value: "He leaves the building about once a week. On October 6 he walked out to the parking lot; his grandmother says he does not see what could happen out there. No one has been badly hurt when he pushes and shoves; the school says moderate.",
      from: "session", lines: [7, 11],
    },
    n_strengths: { value: "Basketball and drawing. He listens to one teacher he trusts.", from: "session", lines: [13] },
  },
};

/* ------------------------------------------------------------------------------------------------
   sra-4471 · M.R. · continued stay request · dictation (the clinician speaks the progress summary) */
const sraLines: SessionLine[] = [
  /* 0 */ L("0:02", "Clinician", "Dictating for M.R., continued stay request, goal one."),
  /* 1 */ L("0:08", "Clinician", "He is using his strategy more often than he did in the summer, and the walk-offs are shorter."),
  /* 2 */ L("0:17", "Clinician", "He still needs a staff member next to him to get back to task every school day."),
  /* 3 */ L("0:26", "Clinician", "For the lack of progress box: honestly he is doing well. Escalations are down and he walks back on his own most days."),
  /* 4 */ L("0:38", "Clinician", "We changed the plan at the end of October so lunch and transitions have a named staff member and a break set up ahead of time."),
  /* 5 */ L("0:49", "Clinician", "Family involvement. His grandmother is on the weekly call almost every week and practices the calm-down corner at home."),
  /* 6 */ L("0:58", "Clinician", "She asked about keeping the same placement."),
  /* 7 */ L("1:04", "Clinician", "That is all for now. I will do the discharge plan another day."),
];

const sra4471: ScribeScenario = {
  docId: "sra-4471", mode: "dictation",
  who: "Jordan Perez (dictation for M.R.)",
  lines: sraLines,
  length: "1:12",
  context: ["isp-g1", "isp-review", "isp-oct22", "notes-30d", "note-oct21", "note-oct6", "guardian-weekly", "hours-log", "auth"],
  draft: {
    g1_progress: {
      value: "He is using his strategy more often than he did in the summer, and the walk-offs are shorter. He still needs a staff member next to him to get back to task every school day.",
      from: "session", lines: [1, 2],
    },
    g1_lack: {
      value: "He is doing well. Escalations are down and he walks back on his own most days. The plan was changed at the end of October so lunch and transitions have a named staff member and a break set up ahead of time.",
      from: "session", lines: [3, 4],
    },
    family: {
      value: "His grandmother is on the weekly call almost every week and practices the calm-down corner at home. She asked about keeping the same placement.",
      from: "session", lines: [5, 6],
    },
    discharge: { value: "", from: "none", note: "Nothing was said about the discharge plan." },
  },
};

export const scribe: ScribeScenario[] = [dpn4471, adm4492, intake4492, cans4492, sra4471];
