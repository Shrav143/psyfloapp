import type { Elaborated } from "./denialsElaborated";

/* The long text for the denials whose analysis is written by hand (AUTHORED_TEXT in denials.ts): D-3318, D-3306 and D-3297.
   Read denialsElaborated.ts for what each field holds and the rules for the wording. */

/** D-3318: M.C., 38, Cardinal, Residential 3.5, partial approval of 7 of 14 days. */
const D_3318: Elaborated = {
  synthesis:
    "M.C. is a 38-year-old man in residential care for severe alcohol use disorder with depression. Cardinal approved 7 of the 14 days requested and wrote that continued stay is not supported by documented progress. The progress note of 10/14, day 6, says otherwise: craving rated 7 of 10 by the clinician, a depression score of 15 and an anxiety score of 13, both above the clinical cutoff, and full group attendance without a link yet between his cravings and his low mood. Cannabis is still the main way he copes.\n\n" +
    "Both of his medications are new. Naltrexone was started on day 3 and sertraline was raised from 50 to 100 mg on day 5, with the next dose review on 10/17, two days after the approved days end. He has no safe place to step down to: the only partial hospital program has a waitlist with its earliest opening on 10/28, he lives with a roommate who uses, he has no family contact, and his outpatient attempt in 2025 ended in week 3. The chart supports restoring days 8 to 14 with a review at day 14, and using that review to name where he goes next.",
  findings: [
    "The progress note of 10/14, day 6, records craving at 7 of 10 as rated by the clinician, a depression score (PHQ-9) of 15 and an anxiety score (GAD-7) of 13, both above the clinical cutoff of 10. Group attendance is full, which the letter may have read as progress, but the same note records that he does not yet link his cravings to his low mood. That is the point in treatment where the work has begun and has not yet taken hold. Attach the note, read the three scores with their cutoff and ask the reviewer to name the treatment goal that Cardinal considers met on day 6. If the clinician has scores from after 10/14, add them, because the reviewer will ask for the latest.",
    "The medication record for 10/11 to 10/14 shows naltrexone 50 mg started on 10/11 (day 3) and sertraline raised from 50 to 100 mg on 10/13 (day 5), with the next dose review on 10/17 and no adverse effects recorded. A new sertraline dose is usually judged after several weeks, and the effect of naltrexone on craving also builds over the first weeks, so the approved seven days end before either can be assessed. The review on 10/17 falls two days after the approval ends, which means the decision about the next dose would be made without the program. Include the record and point to the three dates. Ask Cardinal how it expects that review to take place if he has left.",
    "The referral log shows a partial hospital referral sent on 10/14, a waitlist with the earliest opening on 10/28, and a home with a roommate who uses, no family contact and no outpatient provider. The letter recommends a step-down, but the one program of that type cannot take him for two weeks, and the alternative is a home where use continues. His outpatient attempt in 2025 ended in week 3, which says that a standard outpatient step is the one that has not held for him before. Send the log, read the 10/28 date aloud and ask Cardinal to name a program with an earlier opening. If it cannot, ask that days 8 to 14 be approved and that the review at day 14 address the days between the end of the stay and 10/28.",
  ],
  recommendations: [
    {
      title: "Confirm the booked call and who joins it",
      text: "The call is booked for Wed 10/21, 9 to 11 am, inside Cardinal's window. Confirm the time in writing, and ask that the reviewer be a physician in addiction medicine or psychiatry. The clinician who saw him this week should join, because the reviewer will ask about the last session and the latest scores. Have the progress note of 10/14, the medication record and the referral log open before the call starts. Write down the reviewer's name and the call reference number as the call begins.",
    },
    {
      title: "Open with the scores and answer the engaged reading",
      text: "Read the sentence in Cardinal's letter about documented progress, then give the scores from day 6: craving 7 of 10 by the clinician, PHQ-9 15 and GAD-7 13, against a cutoff of 10 on both. Concede at once that attendance is full and withdrawal scores are low. Then say what the note says next: he does not yet link his cravings to his low mood, so the work he is attending has started and has not taken hold. Mention the outpatient attempt in 2025, which ended in week 3, as the evidence of how he does with less structure. Ask which treatment goal Cardinal considers met.",
    },
    {
      title: "Set out the two medication changes in date order",
      text: "Give the dates from the medication record: naltrexone 50 mg on 10/11, day 3, and sertraline from 50 to 100 mg on 10/13, day 5, with no adverse effects recorded. The approved days end on day 7, which is 10/15, and the next dose review is on 10/17. Explain that the review decides the next dose, so it cannot be done well after he has left. Neither drug has been at its current dose long enough to judge. Ask Cardinal to restore days 8 to 14 so the review and its result happen in the program.",
    },
    {
      title: "Show that the step-down is not available",
      text: "Read from the referral log: the partial hospital referral sent on 10/14 and the reply that the earliest opening is 10/28, two weeks later. Add that he lives with a roommate who uses, has no family contact and has no outpatient provider. Ask Cardinal to name a program with an earlier opening, since the letter recommends a step-down without naming one. If it cannot, ask that the stay continue until the transfer date. Note that 10/28 falls six days after day 14, so the review at day 14 has to decide how that gap is covered.",
    },
    {
      title: "Cite the dimensions and Cardinal's continued-stay criteria",
      text: "Name the ASAM dimensions that still support Residential 3.5: mood and thinking, with a depression score of 15 and an anxiety score of 13, relapse risk, with craving at 7 of 10 and no outpatient provider, and the home environment, with a roommate who uses. Add the medical dimension, where both medications are mid-titration, and concede withdrawal, where scores are low. Then cite Cardinal's own continued-stay criteria for Residential 3.5, in particular the sections on progress toward goals and on the availability of the next level of care. Ask the reviewer to point to the criterion that is no longer met. A letter that cannot name one is hard to defend on appeal.",
    },
    {
      title: "Ask for days 8 to 14 and a day-14 review",
      text: "State the ask: restore days 8 to 14, with a review at day 14 and the step-down provider named at that review. Offer to send the day-14 plan, including the partial hospital date and a bridge for the days after the stay if the opening stays at 10/28. If the reviewer offers a shorter extension, the chart supports holding out for at least day 10, so that the dose review of 10/17 happens inside the stay. Accept a partial restore only with a review date and a reference number. Ask when the written decision will arrive and who will send it.",
    },
    {
      title: "Prepare the written appeal and keep the step-down moving",
      text: "Have Advocate draft the appeal from the same three findings, and have Integrity check each sentence against the chart before a clinician signs it. If the call does not restore the days, file inside the 60-day appeal window with the progress note, the medication record and the referral log attached, together with any newer note. Ask for a physician reviewer who took no part in the first decision. While the decision is open, the referral coordinator should keep pressing for an earlier partial hospital date and an outpatient intake, and the case manager should look at recovery housing as an alternative to the roommate. Log each answer in the case so the review at day 14 has them.",
    },
  ],
  criteria: [
    "ASAM Criteria for Level 3.5 residential care: dimensions 2 (medical), 3 (mood and thinking), 5 (relapse risk) and 6 (recovery environment)",
    "Cardinal's continued-stay criteria for Residential 3.5: documented progress and availability of the next level of care",
    "The clinical cutoff of 10 for PHQ-9 and GAD-7, as named in the progress note",
    "The appeal-rights notice in Cardinal's letter: the call window and the 60-day appeal window",
  ],
  evidence: [
    "Progress note 10/14 (day 6): craving 7 of 10, PHQ-9 15, GAD-7 13",
    "MAR 10/11–14: naltrexone 50 mg from 10/11, sertraline 50 to 100 mg on 10/13, next dose review 10/17",
    "Referral log: the partial hospital referral of 10/14 and the waitlist reply with the 10/28 opening",
    "Treatment plan with the goals for days 8 to 14",
    "The record of the 2025 outpatient attempt that ended in week 3",
    "Historian's comparison of {similar} similar Cardinal decisions",
    "Cardinal's letter, with the reviewer's reason and the call window",
  ],
  outlook:
    "Expect the reviewer to concede part of the request, most likely a few extra days, and to ask for the step-down plan in writing. The position is firm on the scores and the medication timeline, since both are in the chart with dates. It is less firm on the full seven days, because the partial hospital opening on 10/28 and the home setting do not end at day 14, so a restore through day 14 with a review that names the next provider is a good outcome.",
};

/** D-3306: S.K., 41, Summit, IOP, retro-authorization denied. The chart is thin on purpose, and the text says so. */
const D_3306: Elaborated = {
  synthesis:
    "{payer} denied the retro-authorization for S.K., 41, in {program} care because the request reached it on day 9 after admission, outside the 72-hour window, and coverage was not pending on the admission date. The chart confirms both facts. The portal receipt shows the day the request was sent, and {payer}'s eligibility update shows coverage effective from three days after admission, with no pending status recorded for the admission date.\n\n" +
    "That leaves a narrower case than the denial letter suggests, and a stronger one for part of the stay. The first three days fall before coverage began, and the only exception in {payer}'s backdating rule needs an eligibility check from the admission date that is not on file. The days after the effective date are a different question, because coverage existed on them. The chart supports a limited request for those days, and it does not yet support a challenge to the first three.",
  findings: [
    "{payer}'s eligibility update shows coverage effective from the fourth day of the stay, and no pending status is recorded for the admission date. That settles the first three days: there was no coverage to authorize, so a retro request for them has nothing to attach to. It also gives the case its one firm footing, since from the effective date coverage existed and the request can be read as a late authorization for covered days. Attach the update and read the effective date aloud on the call. Ask {payer} whether the days from that date can be reviewed on their merits, and ask for its answer in writing.",
    "{payer}'s Backdating rule accepts a retro request within 72 hours of admission, or later when coverage was pending on the admission date and the eligibility check is on file. The request reached {payer} on day 9, so the first route is closed, and the second needs a check from the admission date that nobody has found. Until that check turns up, the rule is not an argument this chart can make, and citing it would invite a question about the missing document. Ask the admissions team whether an eligibility check was run on the day of admission and where its result was saved. If it exists and shows pending coverage, the case changes and the steps below should be revisited, and if it does not, set the rule aside.",
  ],
  recommendations: [
    {
      title: "Start from what the chart does and does not support",
      text: "The chart supports two things: the request was sent on day 9, and {payer}'s own update shows coverage starting three days after admission. It does not support the claim that coverage was pending at admission, because no check from that day is on file. A call that argues the whole denial would rest on a document nobody has seen, and a reviewer who finds that early tends to discount the rest. Decide before anyone phones whether the aim is the whole stay or the days after the effective date. On this chart, the second is the realistic aim.",
    },
    {
      title: "Set the dates out on one page",
      text: "List the admission date, the effective date in {payer}'s update, the day the request was sent according to the portal receipt and the date of the denial. Mark which days of the stay fall before the effective date, days 1 to 3, and which fall after it, from day 4. Count the hours between admission and the portal receipt, and note that the receipt shows the date the request was sent and not the date {payer} entered it. Give the page to whoever will speak to {payer} and to billing, so both work from the same days. If any date is uncertain, confirm it before the call.",
    },
    {
      title: "Look once for the admission-day eligibility check",
      text: "Ask admissions and Verify whether an eligibility check was run on the day of admission, and where the result was saved. This is the only document that could change the answer, because the rule accepts a late request when coverage was pending and the check is on file. Give the search a short limit, such as one working day, so it does not delay the other steps. If the check exists and shows a pending status, tell the clinician at once, since the case then supports a challenge to the first three days. If it does not exist, record that and set the rule aside.",
    },
    {
      title: "Ask for a review of the days after the effective date",
      text: "Call or write to provider services and ask for a review of the days from the effective date onward, naming the first covered day. Give the portal receipt, the eligibility update and the clinical reason for the stay, and say that the request is limited to days when coverage existed. The argument is that a clock which began on a day when the member had no coverage should not decide days when coverage existed. {payer} may disagree, so ask for the text of the rule it applies to those days. Record the reference number and the date on which a written answer is due.",
    },
    {
      title: "Accept the first three days and record why",
      text: "The first three days fall before coverage began, and the chart gives nothing to build an argument on. Accepting them is a reasonable choice, and it costs less than a call that cannot be won. Record the reason in the case: coverage effective three days after admission, request sent on day 9, no pending status on file. Before writing the days off, ask billing whether another payer, an earlier plan or the facility's own policy covers them. Analytics counts the write-off, so the reason should be clear enough to read later.",
    },
    {
      title: "Set a limit on the effort, then decide",
      text: "Give the request for the later days one call and one written follow-up, and set the date by which {payer}'s answer is due. If {payer} approves them, the outcome is better than the chart first suggested. If it refuses, accept the whole decision and close the case, because a longer pursuit would use time that the denials the chart supports need more. Note the decision and the reason in the case so that Analytics reflects it. The window for a call is still open, so the choice does not have to be made today, but it should be made before the window closes.",
    },
    {
      title: "Fix the step that failed",
      text: "The denial began with a missed step: no eligibility check on the day of admission and no retro form within 72 hours. Ask admissions to run the check on the day of admission for every patient whose coverage is unconfirmed, and to save the result to the chart. When coverage is pending, the retro form goes out the same day. Navigator can flag any admission that could fall outside {payer}'s window, so the reminder does not depend on one person's memory. Add the step to the admissions checklist before the next admission.",
    },
  ],
  criteria: [
    "{payer}'s Backdating rule: a retro request within 72 hours of admission, or later when coverage was pending on the admission date and the eligibility check is on file",
    "{payer}'s definition of an effective date of coverage, as it appears in the eligibility update",
    "The provider agreement's section on retroactive eligibility and on late requests",
    "The appeal-rights notice in the denial letter: the call window and the filing window",
  ],
  evidence: [
    "Eligibility update: coverage effective three days after admission, with no pending status for the admission date",
    "Portal receipt showing the day the request was sent",
    "Payer rules, Backdating: the rule text and its location on the payer page",
    "The admission record with the date and time of admission",
    "Any eligibility check from the admission date, if one is found",
    "The denial letter, marked at the sentence on the 72-hour window",
  ],
  outlook:
    "Expect {payer} to hold the 72-hour rule for the first three days and, for the later days, to say that the request was still late. The request for the days after the effective date has a real chance, but a smaller one than the chart's other denials, and it is not worth a long pursuit. Accepting the decision is reasonable, and the time saved is better spent on denials the chart supports.",
};

/** D-3297: T.O., 32, Cardinal, IOP, units cut 48 to 30. The worked example: the longest of the three. */
const D_3297: Elaborated = {
  synthesis:
    "T.O. is a 32-year-old man in his second week of intensive outpatient care for PTSD and alcohol use disorder, and this is the first treatment of any kind he has sought. {payer} approved {unitsApproved} of the {unitsRequested} units requested and wrote that regular attendance and a first drop in scores show he is stable. The progress note of {noteDate}, written at session 5, shows otherwise: a PTSD score of 49 against a cutoff of 31, a depression score of 16, an anxiety score of 14 and a sleep index of 21, with nightmares on most nights. His PTSD score has fallen 5 points since intake, half of what counts as a meaningful change, and on 10/17 he drank once to get to sleep.\n\n" +
    "The approved units end after the session on Tuesday 10/27. Prolonged exposure, the evidence-based treatment for his main diagnosis, is scheduled to begin on Wednesday 10/28, the first session {payer} did not approve. Venlafaxine and gabapentin were both raised in the same week, with the next dose review on 10/26, and the two in-network clinics asked about outpatient trauma therapy offered intake no earlier than 11/30. He has no family contact, no sponsor and no recovery group. The chart supports restoring the {unitsDiff} units, which cover sessions 11 to 16, and holding a review at unit 42 to decide what comes next.",
  findings: [
    "The treatment plan divides care into two phases. Phase 1, sessions 1 to 10, covers sleep, alcohol relapse prevention and skills, and phase 2 begins at session 11, on Wednesday 10/28, with prolonged exposure twice a week and a plan review at session 14. {payer} approved exactly the units for phase 1, so the authorization ends the day before the part of the plan that treats his main diagnosis. Attach the plan page that shows the two phases and their dates, and ask the reviewer why the approval stops where it does. If the plan does not yet state the session number at which exposure begins, have the clinician add it before the call.",
    "The progress note of {noteDate}, written at session 5, gives the scores that the letter does not mention. The PTSD score (PCL-5) is 49 against a cutoff of 31, down 5 points from 54 at intake, which is the smallest change that counts as reliable and half of the 10 points usually taken as clinically meaningful. The depression score is 16, the anxiety score is 14 and the sleep index is 21, all above their cutoffs. He drank once on 10/17 to get to sleep, and the clinician rated craving 5 of 10 where he rated it 2. Attendance at every session is documented in the same note, and it is the likely source of the word stable in the letter. Put the note in the packet and ask the reviewer which score {payer} reads as recovered.",
    "The medication record for {rangeDates} shows two dose changes in the same week: venlafaxine XR raised from 75 to 150 mg on 10/19, and gabapentin raised from 300 mg at bedtime to 300 mg three times a day on 10/18. Blood pressure was checked at each change and was in range. An antidepressant is usually judged after four to six weeks at an adequate dose, which here means mid to late November, long after the approved units end. The next dose review is on 10/26, the day before the approved units end, so the effect of any change it makes is seen only in the denied units. Include the record and ask {payer} how the next dose decision is to be made if treatment stops.",
    "The referral log shows that outpatient trauma therapy was requested from two in-network clinics on 10/19, with earliest intake dates of 11/30 and 12/7. This is the first treatment of any kind he has sought, so there is no therapist or prescriber outside the program to carry him between his last session and a first outpatient visit. He lives alone, has no contact with family and has not yet found a sponsor or a recovery group. Send the log with both replies, and ask {payer} to name a clinic that could see him in the week after his last authorized session. If it cannot, the log is the evidence that the step-down it recommends does not exist today.",
  ],
  recommendations: [
    {
      title: "Use the call to challenge the stable reading",
      text: "The call is booked for Fri 10/23, inside the window. Open by reading the sentence in the letter that ties attendance and early gains to stability, then give the scores from the progress note of {noteDate}: PCL-5 49 against 31, PHQ-9 16 and GAD-7 14 against 10, sleep index 21. Say that attendance and stability are different things: he has attended every session, and the PTSD score has moved 5 points, half of what counts as a meaningful change. Ask for a physician reviewer who treats PTSD or addiction, and ask which of the scores {payer} reads as recovered. Send the clinician who saw him this week, and write down the reviewer's name, the reason given and the call reference number.",
    },
    {
      title: "Show that trauma treatment starts the day after the units end",
      text: "Put the plan on the table: phase 1 is sessions 1 to 10 and ends on Tuesday 10/27, and prolonged exposure begins at session 11 on Wednesday 10/28. The approval therefore covers the preparation and not the treatment it prepares for. Explain that the sleep and alcohol work in phase 1 is there to make exposure safe to start, and that stopping at session 10 leaves that work without its purpose. Mention the drinking on 10/17, which followed a night with almost no sleep, because it shows how the two problems feed each other. Ask {payer} to approve through session 16, which is the end of the request, and make clear that this is the treatment as planned and not more of it.",
    },
    {
      title: "Document that both medications are still being titrated",
      text: "Walk through the medication record in date order: venlafaxine XR started at 75 mg on 10/13 and raised to 150 mg on 10/19, gabapentin started at bedtime on 10/14 and raised to three times a day on 10/18, blood pressure in range at both changes. Give the review date, 10/26, and the time a response takes: four to six weeks at an adequate dose, which is mid to late November. Explain that the sleep index of 21 and the drinking on 10/17 are what the doses are meant to move, and that it is too early to say whether they will. Ask that the units cover sessions 11 to 16, so that the doses are watched in the program through 11/5. Offer to send the record the same day.",
    },
    {
      title: "Challenge the step-down: no outpatient provider exists",
      text: "The letter advises standard outpatient care, so answer it with the referral log: two in-network clinics were asked on 10/19, and their earliest intakes are 11/30 and 12/7. This is his first treatment of any kind, so there is no therapist or prescriber outside the program, and he lives alone with no family contact and no recovery group. Say that even the full {unitsRequested} units end on 11/5, which leaves about three and a half weeks before the first outpatient visit, so the plan must include a bridge. Ask {payer} to name a clinic with an earlier opening, or to approve a taper to two sessions a week until intake is booked. If it cannot name one, ask the reviewer to note that in the record.",
    },
    {
      title: "Cite the criteria and ask which one is no longer met",
      text: "Cite ASAM Level 2.1 and the dimensions that still support it: dimension 2 for the two doses still being adjusted, dimension 3 for the PTSD, depression and anxiety scores, dimension 5 for a relapse risk in which drinking is a way to sleep, and dimension 6 for living alone without supports. Concede dimension 1, where there are no withdrawal signs, and dimension 4, where he is engaged. Then cite {payerName}'s own medical necessity criteria for IOP, in particular the sections on progress toward treatment goals and on the availability of a lower level of care, and Ohio Medicaid's behavioral health standards for intensive outpatient services where {payer} applies them. Ask the reviewer to name the criterion that is no longer met. A letter that cannot name one is hard to defend on appeal.",
    },
    {
      title: "Submit a detailed plan for units 31 to 48",
      text: "Send a written plan for the {unitsDiff} units on the day of the call, or before it. Sessions 11 and 12, units 31 to 36, are the opening sessions of prolonged exposure: education about the treatment, breathing retraining and a list of avoided situations. Sessions 13 to 16, units 37 to 48, cover imaginal and in-vivo exposure, with the PCL-5 and the sleep index every week, the PHQ-9 and GAD-7 every two weeks, and breath alcohol at every session. State the review at unit 42, session 14 on Tuesday 11/3, and what it decides: continue, taper or extend. Add the outpatient plan, which names the clinics asked, the date of the first intake once booked and the taper that will cover the gap.",
    },
    {
      title: "Ask for a specific outcome and prepare the written appeal",
      text: "State the ask: restore the {unitsDiff} units to {unitsRequested}, hold a review at unit 42 and name an outpatient clinic and a bridge to its first visit before the last session. If the reviewer offers only part, hold out for at least unit 36, through session 12, so that exposure starts under approved units, and ask for a dated review. Record the reference number and ask when the written decision will arrive. If the denial stands, file the written appeal within the 60-day window with the plan, the progress note, the medication record and the referral log, ask for a physician reviewer who took no part in the first decision, and ask for an expedited review because the approved units end on 10/27. Keep the referral coordinator looking for earlier intake dates, including telehealth trauma therapists.",
    },
  ],
  criteria: [
    "ASAM Criteria Level 2.1 (intensive outpatient): dimensions 2, 3, 5 and 6 at the level on {noteDate}, with dimensions 1 and 4 conceded",
    "{payerName} medical necessity criteria for IOP: progress toward treatment goals and availability of a lower level of care",
    "Ohio Medicaid behavioral health standards for intensive outpatient services, as {payer} applies them to its plan members",
    "Scale cutoffs: PCL-5 31, with 5 points as the smallest reliable change and 10 as a meaningful one; PHQ-9 and GAD-7 10; sleep index 15",
    "The appeal-rights notice in the letter: the call window, the 60-day appeal window and the route to external review",
  ],
  evidence: [
    "Treatment plan: the two phases, with prolonged exposure starting at session 11 on 10/28",
    "Progress note {noteDate} (session 5): PCL-5 49, PHQ-9 16, GAD-7 14, sleep index 21, craving 5 of 10",
    "MAR {rangeDates}: venlafaxine XR 75 to 150 mg on 10/19, gabapentin raised on 10/18, blood pressure checks and the next dose review on 10/26",
    "Referral log: the two outpatient referrals of 10/19 with intake dates of 11/30 and 12/7, and the social history",
    "The written plan for units 31 to 48, with the review at unit 42 and the weekly measures",
    "Historian's comparison of {similar} similar {payer} decisions",
    "The letter from {payer}, with the reviewer's reason, the call window and the appeal rights",
  ],
  outlook:
    "Expect {payer} to offer part of the units, most likely through session 12 or 13, and to ask for the plan in writing. The position is firm on the timing of exposure and on the scores, which sit in dated documents, and less firm on the 11/30 intake, because a reviewer may point to telehealth or a faster clinic, so the coordinator should keep looking. A partial restore that covers the start of exposure, with a review at unit 42, is a good result, and the full {unitsDiff} units is a reasonable ask but not the only acceptable outcome.",
};

/** Keyed by denial id. A denial listed here uses this instead of the default for its kind. */
export const ELABORATED_AUTHORED: Record<string, Elaborated> = {
  "D-3318": D_3318,
  "D-3306": D_3306,
  "D-3297": D_3297,
};

/** The long text for the dimensions of one denial, keyed by denial id, then by dimension name. Wins over DIMS_LONG. D-3306 has no dimensions. */
export const DIMS_LONG_AUTHORED: Record<string, Record<string, string>> = {
  "D-3318": {
    "D1 Withdrawal": "Withdrawal scores are low on day 6, and that is the one dimension where the chart agrees with the letter. Craving is the difference: the clinician rated it 7 of 10, and cannabis use is still reported even though alcohol withdrawal has settled. Naltrexone, which acts on craving, was started on day 3 and is too new to have changed that rating. Cite the craving rating and the medication start date together, and concede the withdrawal scores at the outset.",
    "D2 Medical": "Naltrexone 50 mg was started on 10/11 (day 3) and sertraline was raised from 50 to 100 mg on 10/13 (day 5). The next dose review is on 10/17, two days after the approved seven days end, and no adverse effects are recorded. Neither drug has been at its current dose long enough to judge, which matters because the review is where the plan decides whether to continue, adjust or add. Cite the medication record for 10/11 to 10/14.",
    "D3 Mood and thinking": "On day 6 the depression score (PHQ-9) is 15 and the anxiety score (GAD-7) is 13, both above the clinical cutoff of 10. The depression score sits in the moderately severe range, and it has to be read next to the sertraline increase of day 5, which has not had time to act. This dimension supports the continued residential level by itself, and it is the one to lead with on the call. Cite the progress note of 10/14 and ask for any later scores to be added.",
    "D4 Readiness": "He attends every group, which the letter reads as progress. The same note records that he does not yet connect his cravings to his low mood, so the part of treatment that depends on that insight has not started. Engagement is a reason to continue, because what he is attending is only beginning to apply. His outpatient attempt in 2025 ended in week 3, and the chart supports keeping the structure around him until the link is made.",
    "D5 Relapse risk": "The risk is high. Cannabis is the main way he copes, craving was 7 of 10 on day 6, and no outpatient provider is lined up to take over. His one outpatient attempt, in 2025, ended in week 3, so the standard step-down has not held for him before. Cite the referral log and the 2025 history, and ask Cardinal what protects him in the first weeks after he leaves.",
    "D6 Home": "He lives with a roommate who uses, and he has no family contact and no support network. The partial hospital program that would carry him between residential care and home has a waitlist, with the earliest opening on 10/28. Going home before then means returning to a setting with active use and no daytime structure. Cite the referral log, and ask the case manager to look at recovery housing in case the home setting cannot change.",
  },
  "D-3297": {
    "D1 Withdrawal": "He shows no withdrawal signs, and breath alcohol was 0.000 at every session through 10/19, so this dimension is not the issue and is worth conceding at the outset. What the chart does show is a drinking episode on 10/17 after a night with almost no sleep, and craving rated 5 of 10 by the clinician against 2 by him. That points to alcohol used as a way to sleep, which is a relapse mechanism and not a withdrawal problem. Cite the progress note of {noteDate} for both readings.",
    "D2 Medical": "Venlafaxine XR was raised from 75 to 150 mg on 10/19 and gabapentin was raised on 10/18, so both medications are mid-titration. Blood pressure was checked at each change and was in range, and the next dose review is on 10/26. A response to venlafaxine is judged after four to six weeks at an adequate dose, which here means mid to late November. Cite the medication record for {rangeDates} and the review date.",
    "D3 Mood and thinking": "At session 5 the PTSD score (PCL-5) is 49 against a cutoff of 31, the depression score (PHQ-9) is 16 and the anxiety score (GAD-7) is 14, both against a cutoff of 10. The sleep index is 21, with nightmares on most nights. The PTSD score has fallen 5 points since intake, half of the 10 points usually taken as meaningful. This dimension supports continued intensive care, so lead the call with it and cite the progress note of {noteDate}.",
    "D4 Readiness": "He attends every session, spoke openly about the drinking on 10/17 and is willing to start trauma therapy. That is real engagement, and the letter reads it as stability. Engagement is what allows exposure work to start, so it argues for continuing and not for stopping. He calls the drinking a sleep aid and has not yet linked it to the trauma, and that link is part of the work planned for phase 2.",
    "D5 Relapse risk": "The risk is high. He drinks to get to sleep, one drinking episode has already happened in week 2, and a sleep index of 21 means the trigger returns most nights. Exposure therapy tends to raise distress before it lowers it, so the first weeks of phase 2 are the period of greatest risk, and contact with the program four days a week is what protects them. Cite the progress note and the treatment plan.",
    "D6 Home": "He lives alone, has no contact with his family and has not yet found a sponsor or a recovery group, so no one would notice a lapse. The two in-network outpatient clinics offered intake on 11/30 and 12/7, and this is his first treatment of any kind, so there is no therapist to fall back on. Even the full 48 units end on 11/5, which leaves about three and a half weeks before the first outpatient visit. Cite the referral log, and ask the coordinator to look for earlier intakes and a recovery group in the meantime.",
  },
};
