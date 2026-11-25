import type { ScribeScenario, SessionLine } from "../../types";

/* Four Scribe scenarios (sample conversations, initials only), one for each kind of document. Each draft restates only what was said, or quotes the chart.
   A field nothing was said about is { from: "none" }: it stays empty and the clinician decides. */

const L = (t: string, who: string, text: string): SessionLine => ({ t, who, text });

/* ---------------- dpn-4042 · J.M. · daily progress note · live (staff and clinician) ---------------- */
const dpn4042: ScribeScenario = {
  docId: "dpn-4042", mode: "live",
  consentScript: "I would like to record this note so I can write it accurately. Is that all right with you?",
  who: "Staff and the clinician (daily note for J.M.)", length: "1:02", context: ["psy5", "nurse"],
  lines: [
    /* 0 */ L("0:03", "Clinician", "Voice note for J.M., October 20th, 11:05 am. What did you work on this morning?"),
    /* 1 */ L("0:08", "Staff", "Individual session, 45 minutes. We worked on his relapse-prevention plan, mostly naming his drinking triggers at home."),
    /* 2 */ L("0:16", "Clinician", "How did he respond?"),
    /* 3 */ L("0:19", "Staff", "He named three triggers himself and agreed to write them on a card. Engaged the whole session."),
    /* 4 */ L("0:28", "Clinician", "Any cravings or withdrawal today?"),
    /* 5 */ L("0:31", "Staff", "Craving 5 out of 10, down from 7 on the 17th. CIWA-Ar was 2 this morning."),
    /* 6 */ L("0:39", "Clinician", "And his mood?"),
    /* 7 */ L("0:42", "Staff", "Sleeping better. Mood a little lower than yesterday."),
    /* 8 */ L("0:49", "Clinician", "Any safety concerns?"),
    /* 9 */ L("0:52", "Staff", "None reported."),
    /* 10 */ L("0:58", "Clinician", "Thanks. That is all I need for the note."),
  ],
  draft: {
    duration: { value: "45 min", from: "session", lines: [1] },
    intervention: { value: "Individual session: relapse-prevention work, naming his drinking triggers at home.", from: "session", lines: [1] },
    response: { value: "Named three triggers himself and agreed to write them on a card. Engaged the whole session.", from: "session", lines: [3] },
    sx: { value: "Craving 5 out of 10 (7 on 10/17). CIWA-Ar 2 this morning. Sleeping better; mood a little lower than yesterday.", from: "session", lines: [5, 7] },
    risk: { value: ["None reported"], from: "session", lines: [9] },
    goal: { value: "", from: "none", note: "Nothing was said about which plan goal this serves." },
    plan: { value: "", from: "none", note: "Nothing was said about the next session." },
  },
};

/* ---------------- adm-4988 · D.L. · admission screening · live (the screening conversation) ---------------- */
const adm4988: ScribeScenario = {
  docId: "adm-4988", mode: "live",
  consentScript: "I record this screening so my notes are accurate. Is that all right with you?",
  who: "D.L. and the screening clinician", length: "1:20", context: [],
  lines: [
    /* 0 */ L("0:05", "Clinician", "Thank you for coming in. Before we start, I record this screening so my notes are accurate. Is that all right?"),
    /* 1 */ L("0:12", "Patient", "Yes, that is fine."),
    /* 2 */ L("0:18", "Clinician", "Who referred you?"),
    /* 3 */ L("0:22", "Patient", "The emergency department. I was there on Sunday."),
    /* 4 */ L("0:29", "Clinician", "What have you been using in the last month?"),
    /* 5 */ L("0:34", "Patient", "Stimulants, most days."),
    /* 6 */ L("0:41", "Clinician", "When was the last time?"),
    /* 7 */ L("0:44", "Patient", "Sunday night, before I went in."),
    /* 8 */ L("0:51", "Clinician", "Any symptoms now, like shaking, sweating, trouble sleeping?"),
    /* 9 */ L("0:56", "Patient", "I have not slept in two nights. My hands shake."),
    /* 10 */ L("1:03", "Clinician", "Any thoughts of hurting yourself or anyone else?"),
    /* 11 */ L("1:07", "Patient", "No."),
    /* 12 */ L("1:12", "Clinician", "Where are you staying?"),
    /* 13 */ L("1:15", "Patient", "With my sister. It is stable."),
  ],
  draft: {
    referral: { value: "Emergency department", from: "session", lines: [3] },
    substances: { value: ["Stimulants"], from: "session", lines: [5] },
    lastuse: { value: "Sunday night, before the emergency department visit", from: "session", lines: [7] },
    withdrawal: { value: "Has not slept in two nights. Hands shake.", from: "session", lines: [9] },
    safety: { value: ["None"], from: "session", lines: [11] },
    housing: { value: "Stable", from: "session", lines: [13] },
    support: { value: "Staying with a sister.", from: "session", lines: [13] },
    loc: { value: "", from: "none", note: "Nothing was said about the level of care." },
    why: { value: "", from: "none", note: "Nothing was said about why this level of care." },
  },
};

/* ---------------- int-4207 · T.R. · biopsychosocial intake · live (the intake interview) ---------------- */
const int4207: ScribeScenario = {
  docId: "int-4207", mode: "live",
  consentScript: "I would like to record this interview to write your intake. Is that all right with you?",
  who: "T.R. and the intake clinician", length: "1:25", context: [],
  lines: [
    /* 0 */ L("0:06", "Clinician", "I would like to record this interview so the intake is accurate. Is that all right?"),
    /* 1 */ L("0:11", "Patient", "Yes."),
    /* 2 */ L("0:16", "Clinician", "Tell me about your use."),
    /* 3 */ L("0:20", "Patient", "Opioids for about two years. I stopped in the spring and started again in August."),
    /* 4 */ L("0:30", "Clinician", "Have you been in treatment before?"),
    /* 5 */ L("0:34", "Patient", "A detox stay two years ago and then this program."),
    /* 6 */ L("0:42", "Clinician", "Anything medical, any medications?"),
    /* 7 */ L("0:46", "Patient", "No medical problems. I take no medications."),
    /* 8 */ L("0:54", "Clinician", "How are your home and work?"),
    /* 9 */ L("0:58", "Patient", "I live with my mother and I work part-time at a warehouse."),
    /* 10 */ L("1:07", "Clinician", "Any legal trouble?"),
    /* 11 */ L("1:10", "Patient", "No."),
    /* 12 */ L("1:16", "Clinician", "What do you want from treatment?"),
    /* 13 */ L("1:20", "Patient", "To stay stopped this time and keep my job."),
  ],
  draft: {
    usehx: { value: "Opioids for about two years. Stopped in the spring and started again in August.", from: "session", lines: [3] },
    prior: { value: "A detox stay two years ago and then this program.", from: "session", lines: [5] },
    medical: { value: "No medical problems. Takes no medications.", from: "session", lines: [7] },
    social: { value: "Lives with their mother and works part-time at a warehouse.", from: "session", lines: [9] },
    legal: { value: "No", from: "session", lines: [11] },
    goals: { value: "To stay stopped this time and keep their job.", from: "session", lines: [13] },
    mh: { value: "", from: "none", note: "Nothing was said about mental health history." },
    strengths: { value: "", from: "none", note: "Nothing was said about strengths." },
  },
};

/* ---------------- asm-4042 · J.M. · assessment summary · dictation (the clinician dictates) ---------------- */
const asm4042: ScribeScenario = {
  docId: "asm-4042", mode: "dictation",
  who: "A. Morgan, dictating the assessment summary for J.M.", length: "1:15", context: ["nurse", "psy5", "soc4"],
  lines: [
    /* 0 */ L("0:04", "Clinician", "Assessment summary for J.M., October 20th."),
    /* 1 */ L("0:10", "Clinician", "Dimension two: no acute medical conditions. Rating one, low risk."),
    /* 2 */ L("0:19", "Clinician", "Dimension three: PHQ-9 17, GAD-7 14. Rating three, high risk."),
    /* 3 */ L("0:29", "Clinician", "Dimension four: he asked for residential care himself. Rating one, low risk."),
    /* 4 */ L("0:39", "Clinician", "Dimension five: relapse on 9/28 after eleven months, and craving 7 out of 10. Rating three, high risk."),
    /* 5 */ L("0:50", "Clinician", "Dimension six: lives with a partner who drinks daily and has no reliable transport. Rating four, severe risk."),
    /* 6 */ L("1:02", "Clinician", "Recommended level of care is residential, level 3.5."),
  ],
  draft: {
    d2: { value: "1 – Low risk", from: "session", lines: [1] },
    n2: { value: "No acute medical conditions.", from: "session", lines: [1] },
    n3: { value: "PHQ-9 17, GAD-7 14.", from: "session", lines: [2] },
    d4: { value: "1 – Low risk", from: "session", lines: [3] },
    n4: { value: "Asked for residential care himself.", from: "session", lines: [3] },
    d5: { value: "3 – High risk", from: "session", lines: [4] },
    n5: { value: "Relapse on 9/28 after eleven months, craving 7 out of 10.", from: "session", lines: [4] },
    d6: { value: "4 – Severe risk", from: "session", lines: [5] },
    n6: { value: "Lives with a partner who drinks daily; no reliable transport.", from: "session", lines: [5] },
    loc: { value: "Residential 3.5", from: "session", lines: [6] },
    rationale: { value: "", from: "none", note: "The rationale was not dictated." },
  },
};

export const scribe: ScribeScenario[] = [dpn4042, adm4988, int4207, asm4042];
