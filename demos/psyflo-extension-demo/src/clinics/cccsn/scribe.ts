import type { ScribeScenario } from "../../types";
import { INTERVENTIONS, SUBSTANCES } from "./forms";
import { goalLabel } from "./roster";

/* Scribe scenarios. Every value restates what was said in the lines, or quotes a chart record. A field nothing was said about is `none`.
   Locked fields (signatures, ratings, the admission decision, the diagnosis, the level of care) are never drafted. */

const CBT_RP = INTERVENTIONS[1];
const SEEKING_SAFETY = INTERVENTIONS[3];

export const scribe: ScribeScenario[] = [
  /* M.R. · progress note · live (a check-in after group). Nothing is said about next steps. */
  {
    docId: "dpn-c101",
    mode: "live",
    who: "M.R. and J. Perez",
    consentScript: "I would like to record this check-in so I can write your note afterwards. The audio is deleted once the note is drafted. Is that all right with you?",
    length: "1:52",
    context: ["plan-1", "plan-2", "note-1027", "ind", "collat"],
    lines: [
      { t: "0:04", who: "Clinician", text: "Group ran nine to noon today, three hours, so three units. Tell me about Saturday." },
      { t: "0:16", who: "Client", text: "My old roommate came by the apartment. I wanted to use. It was a strong craving." },
      { t: "0:31", who: "Clinician", text: "What did you do?" },
      { t: "0:35", who: "Client", text: "I used my craving plan. I left and went to a meeting." },
      { t: "0:49", who: "Clinician", text: "In the relapse prevention part of group we mapped that trigger and practiced a refusal." },
      { t: "1:02", who: "Clinician", text: "How are you feeling right now?" },
      { t: "1:07", who: "Client", text: "Anxious when I came in. Steady now." },
      { t: "1:18", who: "Clinician", text: "In Seeking Safety grounding you led part of the exercise." },
      { t: "1:26", who: "Client", text: "Yes, I led part of it." },
      { t: "1:33", who: "Clinician", text: "Good to hear." },
      { t: "1:38", who: "Clinician", text: "We collected your urine screen today too." },
      { t: "1:43", who: "Client", text: "Okay." },
    ],
    draft: {
      time: { value: "9:00 am – 12:00 pm", from: "session", lines: [0] },
      units: { value: "3", from: "session", lines: [0] },
      goal: { value: goalLabel("c101", "plan-1"), from: "chart", chart: "plan-1", note: "From the treatment plan: Goal 1 is the goal that names the craving plan. Check it is the goal this session worked on." },
      ints: { value: [CBT_RP, SEEKING_SAFETY], from: "session", lines: [4, 7] },
      intervention: {
        value: "Facilitated relapse prevention skills (CBT-RP): mapped the Saturday trigger with M.R. and practiced a refusal. Seeking Safety grounding exercise in group.",
        from: "session", lines: [4, 7],
      },
      checkin: { value: "Anxious coming in; steady now. Strong craving on Saturday.", from: "session", lines: [1, 6] },
      response: {
        value: "Described a strong craving on Saturday when an old roommate came by the apartment. Used her craving plan: left and went to a meeting. Led part of the Seeking Safety grounding exercise.",
        from: "session", lines: [1, 3, 8],
      },
      uds: { value: "Yes", from: "session", lines: [10] },
      plan: { value: "", from: "none", note: "Nothing was said about next steps." },
    },
  },

  /* T.W. · admission screening · live. HIV / HCV was offered and the client skipped it: left empty, never drafted. */
  {
    docId: "adm-c102",
    mode: "live",
    who: "T.W. and J. Perez",
    consentScript: "Before we start, I would like to record this so I can fill in the paperwork afterwards instead of typing while we talk. Your treatment records are protected by federal privacy rules (42 CFR Part 2). Is that okay with you?",
    length: "5:24",
    context: ["referral", "elig"],
    lines: [
      { t: "0:05", who: "Clinician", text: "Tell me what is going on, in your own words." },
      { t: "0:12", who: "Client", text: "Drug court after a possession charge in July. I'm in phase one. I check in every Tuesday and get tested. I've missed three check-ins and had four dirty tests since September. I'm tired of it. I want to see my daughter again." },
      { t: "0:51", who: "Clinician", text: "What have you been using?" },
      { t: "0:56", who: "Client", text: "Fentanyl pills, smoked, six to ten a day until August. One slip last Saturday, October 24, half a pill. Beer most days, six to eight, and my last drink was last night. No meth or cocaine, not for years." },
      { t: "1:38", who: "Clinician", text: "When you don't drink, how do you feel in the morning? Any seizures or DTs?" },
      { t: "1:47", who: "Client", text: "Shaky and sweaty, and it goes away when I have a beer. No seizures, no DTs." },
      { t: "2:08", who: "Clinician", text: "Any medications, and have you ever overdosed?" },
      { t: "2:15", who: "Client", text: "Suboxone, sixteen milligrams a day, from Dr. Ahn at Valley Family Medicine since August. I'll sign a release so you can talk to him. One overdose, in January. My sister gave me Narcan and keeps one in the kitchen." },
      { t: "2:58", who: "Clinician", text: "How is your mood? Any thoughts of hurting yourself?" },
      { t: "3:05", who: "Client", text: "Down a lot, and I don't sleep well. No thoughts of hurting myself." },
      { t: "3:24", who: "Clinician", text: "What treatment have you had before?" },
      { t: "3:30", who: "Client", text: "Detox at Mesa Withdrawal Center in February last year, and again in August for five days. After the February one I was using again in two weeks. Outpatient at Canyon Outpatient Services, January to April, nine sessions. I stopped when I lost my ride, and I was using the whole time." },
      { t: "4:22", who: "Clinician", text: "Where are you staying, and who is in your corner? HIV or hepatitis C is optional, and you can skip it." },
      { t: "4:31", who: "Client", text: "My sister's couch in Henderson since September, as long as I'm in treatment. Before that, my car. I work at a warehouse and I want to keep the job. My sister, my daughter. I'll skip the other one for now." },
    ],
    draft: {
      subs: { value: [SUBSTANCES[0], SUBSTANCES[1]], from: "session", lines: [3] },
      use: {
        value: "Opioids: fentanyl pills, smoked, 6 to 10 a day until August; one slip on Saturday, October 24, half a pill, while on buprenorphine. Alcohol: beer most days, 6 to 8; last drink the night before this screening. Stimulants: none reported, not for years.",
        from: "session", lines: [3, 7],
      },
      withdrawal: {
        value: "Alcohol: shaky and sweaty in the morning when he has not had a drink, relieved by drinking; no seizures or DTs. Opioids: takes buprenorphine 16 mg daily.",
        from: "session", lines: [5, 7],
      },
      meds: {
        value: "Buprenorphine/naloxone (Suboxone) 16 mg daily since August, from Dr. Ahn, Valley Family Medicine. Agreed to sign a release so CCCSN can talk with the prescriber.",
        from: "session", lines: [7],
      },
      overdose: { value: "One overdose, in January; his sister gave him naloxone, and one is kept in the kitchen.", from: "session", lines: [7] },
      mh: { value: "Down a lot and not sleeping well; says he has no thoughts of hurting himself.", from: "session", lines: [9] },
      prior: {
        value: "Withdrawal management at Mesa Withdrawal Center: February last year, and again in August (5 days); using again within 2 weeks after the February stay. Outpatient at Canyon Outpatient Services, January to April, 9 sessions; stopped when he lost his ride; using the whole time.",
        from: "session", lines: [11],
      },
      legal: {
        value: "Clark County drug court, phase 1, after a possession charge in July. Checks in every Tuesday and is tested; 3 missed check-ins and 4 positive tests since September.",
        from: "session", lines: [1],
      },
      housing: {
        value: "Staying on his sister's couch in Henderson since September, as long as he is in treatment; slept in his car before that.",
        from: "session", lines: [13],
      },
      reason: { value: "\"I'm tired of it. I want to see my daughter again.\"", from: "session", lines: [1] },
      strengths: { value: "Works at a warehouse and wants to keep the job; his sister; his daughter.", from: "session", lines: [13] },
      hiv: { value: "", from: "none", note: "Offered on the call; the client chose to skip it. Psyflo leaves it blank." },
      summary: {
        value: "Referred by Clark County drug court (phase 1) after a possession charge in July; 3 missed check-ins and 4 positive tests since September. Reports fentanyl pills until August, one slip on October 24, and beer most days. Takes buprenorphine 16 mg daily from Dr. Ahn at Valley Family Medicine. Low mood and poor sleep; says he has no thoughts of hurting himself. Two detox stays and one outpatient episode (9 sessions). Staying with his sister in Henderson. Wants to see his daughter again.",
        from: "session", lines: [1, 3, 5, 7, 9, 11, 13],
      },
    },
  },

  /* T.W. · ASAM assessment · live. Fills only rationale boxes. Nothing was said about D2, D5 or D6, so those stay as they are. */
  {
    docId: "asam-c102",
    mode: "live",
    who: "T.W. and J. Perez",
    consentScript: "I would like to record this assessment so I can write the rationale for each dimension afterwards. Your treatment records are protected by federal privacy rules (42 CFR Part 2). Is that okay with you?",
    length: "4:36",
    context: ["referral", "elig"],
    lines: [
      { t: "0:04", who: "Clinician", text: "I'll go through the six dimensions with you. First, withdrawal. When did you last use?" },
      { t: "0:14", who: "Client", text: "The last fentanyl was last Saturday, October 24, half a pill. My last drink was last night." },
      { t: "0:29", who: "Clinician", text: "How do you feel in the morning when you haven't had a drink?" },
      { t: "0:37", who: "Client", text: "Shaky and sweaty, and it goes away when I have a beer. I never had a seizure or the DTs." },
      { t: "1:02", who: "Clinician", text: "Let's talk about mood and sleep." },
      { t: "1:08", who: "Client", text: "I'm down a lot and I don't sleep well. No thoughts of hurting myself." },
      { t: "1:41", who: "Clinician", text: "What do you want from treatment?" },
      { t: "1:48", who: "Client", text: "I'm tired of it. I want to see my daughter again. The judge said this is my last shot." },
      { t: "2:20", who: "Clinician", text: "Can you come three mornings a week?" },
      { t: "2:26", who: "Client", text: "Mornings work. Court is Tuesday afternoons." },
      { t: "3:10", who: "Clinician", text: "We'll do the urine drug screen now." },
      { t: "3:15", who: "Client", text: "That's fine, court does them anyway." },
    ],
    draft: {
      d1n: {
        value: "Alcohol: shaky and sweaty in the morning without a drink, relieved by drinking; never had a seizure or DTs. Last fentanyl use October 24 (half a pill); last drink the night before the assessment.",
        from: "session", lines: [1, 3],
      },
      d2n: { value: "", from: "none", note: "Nothing was said about biomedical conditions in this recording." },
      d3n: { value: "Reports being down a lot and not sleeping well; says he has no thoughts of hurting himself.", from: "session", lines: [5] },
      d4n: {
        value: "Says he is tired of using and wants to see his daughter again; the judge told him this is his last shot. Agrees to three mornings a week.",
        from: "session", lines: [7, 8, 9],
      },
      d5n: { value: "", from: "none", note: "Nothing was said about relapse or continued use potential in this recording." },
      d6n: { value: "", from: "none", note: "Nothing was said about the living environment in this recording. The box already has text." },
    },
  },

  /* M.R. · continued stay request · dictation. Nothing is said about attendance, UDS, dimension changes or step-down readiness. */
  {
    docId: "sra-c101",
    mode: "dictation",
    who: "J. Perez, dictating",
    length: "1:48",
    context: ["plan-1", "auth", "att", "uds", "dims", "collat"],
    lines: [
      { t: "0:04", who: "Clinician", text: "Continued stay request for M.R., Level 2.1 IOP, Anthem. The authorization ends November 13." },
      { t: "0:14", who: "Clinician", text: "Dimension 5. She has been abstinent since September 24, and that is inside the structure of the program." },
      { t: "0:27", who: "Clinician", text: "On Saturday, October 24, a former roommate who uses came to her door. She had a strong craving, used her written craving plan and went to a community recovery meeting." },
      { t: "0:44", who: "Clinician", text: "Without the Level 2.1 structure the risk of relapse stays high, because she still lives in the shared apartment where two people use." },
      { t: "1:00", who: "Clinician", text: "Dimension 6. The sober-housing waitlist call was made October 27." },
      { t: "1:10", who: "Clinician", text: "Drug court moved her to phase 2 on October 22. The next status hearing is November 12." },
      { t: "1:22", who: "Clinician", text: "Care coordination. CCCSN sends attendance and UDS results to drug court every week under the signed release." },
      { t: "1:34", who: "Clinician", text: "The main barrier is housing." },
    ],
    draft: {
      d5: {
        value: "Abstinent since September 24, inside the structure of the program. On Saturday, October 24, a former roommate who uses came to her door; she had a strong craving, used her written craving plan and went to a community recovery meeting. Relapse risk stays high without the Level 2.1 structure: she still lives in the shared apartment where two people use.",
        from: "session", lines: [1, 2, 3],
      },
      coord: {
        value: "CCCSN sends attendance and UDS results to drug court every week under the signed release. Drug court moved her to phase 2 on October 22; the next status hearing is November 12.",
        from: "session", lines: [5, 6],
      },
      barriers: {
        value: "Housing: she still lives in the shared apartment where two people use; the sober-housing waitlist call was made October 27.",
        from: "session", lines: [3, 4, 7],
      },
      attendance: { value: "", from: "none", note: "Nothing was said about attendance." },
      uds: { value: "", from: "none", note: "Nothing was said about UDS results." },
      dims: { value: "", from: "none", note: "Nothing was said about changes in D1 to D6 since admission." },
      stepdown: { value: "", from: "none", note: "Nothing was said about step-down readiness." },
    },
  },
];
