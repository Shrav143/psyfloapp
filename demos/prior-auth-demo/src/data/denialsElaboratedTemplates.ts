import type { DenialType } from "./denials";
import type { DimLongByTone, Elaborated } from "./denialsElaborated";

/* The long text for the six kinds of denial that are generated from templates (denialsTemplates.ts), and for the six ASAM dimension names
   (GENERIC_DIMS in denials.ts). Read denialsElaborated.ts for what each field holds and the rules for the wording.
   Each Elaborated has one findings paragraph per finding of the same template, in the same order. */

const PARTIAL_APPROVAL: Elaborated = {
  synthesis:
    "{payer} approved {approved} of the {requested} days requested for a {age}-year-old in {program} care and wrote that continued stay is not supported by documented progress. The chart supports a different reading. At the most recent review ({noteDate}) craving and mood scores were both above the clinical cutoff, a medication had been started or adjusted within the last seven days, and the step-down program named in the referral had no opening this week.\n\n" +
    "The approval ends on day {approved}, before the medication changes have had time to show an effect and before any lower level of care can take the patient. What the chart supports is finishing the stay through day {requested} and then moving to a named step-down provider. The case rests on three documents the program already holds: the progress note, the medication record and the referral log.",
  findings: [
    "The letter says progress is not documented, but the progress note of {noteDate} records craving and mood scores both above the clinical cutoff and treatment goals not yet met. Full group attendance is the one favorable line in the note, and it is the line a reviewer is most likely to read as improvement. Attendance shows engagement, which is a reason to continue, and it should not stand in for a change in symptoms. Attach the note, point to the scores and to the sentence on goals, and ask the reviewer to name the goal {payer} considers met. If the note gives a score without its cutoff, have the clinician add an addendum that states both.",
    "The medication record for {rangeDates} shows a medication started or adjusted within the last seven days, with the next dose review falling inside the denied days. Changes of this kind usually need several weeks before the response can be judged, so a stay that ends at day {approved} hands that judgment to a setting that does not yet exist for this patient. A reviewer working from the narrative note may never have seen the record. Include it with the date of the change and the date of the next review marked, and ask {payer} how the dose is to be assessed once the stay ends. Check that the record also shows no adverse effects, because that closes the easy objection that the change was a complication.",
    "The referral log shows that a step-down referral was sent and that the program has no opening this week, while the home setting offers little support for recovery. The letter recommends a lower level of care without naming a program, which leaves a recommendation that nobody can carry out. Send the log with the date the referral went out and the program's reply, and read out the earliest date it offered. Then ask {payer} to name a program that has a place, or to approve days {from} to {requested} until one does. If the log shows only a sent date, ask the referral coordinator to record the reply before the call.",
  ],
  recommendations: [
    {
      title: "Book the peer-to-peer call now",
      text: "The window for a call is short and runs from the date on the letter, so take the first slot offered. Ask {payer} to confirm in writing that the reviewer is a physician, ideally in addiction medicine or psychiatry, who will follow an argument about scores and medication without translation. Send the clinician who saw the patient this week, not a coordinator, because the reviewer will ask about the last session. Write down the reviewer's name and the call reference number as soon as the call begins. If no slot falls inside the window, ask for a written extension of the window before it closes.",
    },
    {
      title: "Open with the gap between the letter and the chart",
      text: "Start by reading the sentence in the letter that says progress is not documented, then read the scores from the progress note of {noteDate}. Give each score together with its cutoff, so the reviewer sees the distance without looking anything up. Say that full group attendance is engagement, and that the chart supports continuing because engagement has begun to work while the symptoms have not yet moved far enough. Ask which treatment goal {payer} considers met. Leave the request for days until the reviewer has had to answer that question, because a reviewer moves more readily once the letter's reasoning has been tested.",
    },
    {
      title: "Show that the medication changes are still in progress",
      text: "Take the reviewer through the medication record for {rangeDates} in date order: what was started or changed, on which day, and when the next dose review is due. Explain that a change of this kind needs several weeks before the response can be judged, and that the next review falls inside days {from} to {requested}. Point out that stopping at day {approved} moves that review to a setting with no scheduled visit and no one to watch for side effects. Offer to send the record the same day if the reviewer does not have it. Ask {payer} to restore the days so the review can happen under the current monitoring.",
    },
    {
      title: "Show that the step-down has no opening",
      text: "Read from the referral log: the program that was contacted, the date the referral went out and the reply, including the earliest opening. Say that the home setting has little support, which makes the gap between programs the riskiest part of the plan. Ask {payer} to name a program with a place this week, since the letter recommends a step-down without naming one. If the reviewer cannot, ask that days {from} to {requested} be approved until the opening date, with the transfer arranged for that day. Have the referral coordinator send a written update afterwards so the opening date is on the record.",
    },
    {
      title: "Cite the criteria and ask which one is no longer met",
      text: "Name the ASAM dimensions that still support {program}, which on this chart are mood and thinking, relapse risk and the home environment, and say which line of the chart supports each. Then cite {payerName}'s own continued-stay criteria for {program}, in particular the sections on progress toward treatment goals and on the availability of the next level of care. Ask the reviewer to point to the criterion that is no longer met. A letter that cannot name one is hard to defend on appeal. Record the answer word for word, and if the reviewer cites a criterion that is not in the policy, ask for the page.",
    },
    {
      title: "Ask for one specific outcome",
      text: "State the ask plainly: restore days {from} to {requested}, hold a review on day {requested}, and name the step-down provider at that review. The review helps the reviewer to approve, because it gives {payer} a date on which to check progress instead of an open-ended stay. If a shorter extension is offered, ask what would have to be true at the next review for a further one, and write the answer down. Do not accept a verbal approval without a reference number. Ask when the written decision will arrive and who will send it.",
    },
    {
      title: "File the written appeal in parallel",
      text: "Do not wait for the call to start the appeal. Advocate can draft the letter from the same three findings, and Integrity checks each sentence against the chart before a clinician signs it. If the call restores the days, withdraw the draft. If it does not, file inside the appeal window with the progress note, the medication record and the referral log attached, and ask for a physician reviewer who took no part in the first decision. Quote the reason the reviewer gave on the call, since the letter should answer it directly.",
    },
  ],
  criteria: [
    "ASAM Criteria, continued-stay review: dimensions 3 (mood and thinking), 5 (relapse risk) and 6 (home environment) for {program}",
    "{payerName} continued-stay criteria for {program}: progress toward treatment goals, and availability of the next level of care",
    "The appeal-rights notice in the denial letter: the window for a call or an appeal, and the specialty required of the reviewer",
    "The clinical cutoffs for the scales used in the progress note, as the note itself states them",
  ],
  evidence: [
    "Progress note {noteDate}: scores above the clinical cutoff and goals not yet met",
    "MAR {rangeDates}: the date of each dose change and the next dose review",
    "Referral log: the step-down referral, its date and the program's reply with the earliest opening",
    "Treatment plan with the goals and the planned end date",
    "The denial letter, with the reviewer's name and the call reference once the call is booked",
    "Historian's comparison of {similar} similar {payer} decisions",
  ],
  outlook:
    "Expect the reviewer to offer a shorter extension of a few days, or to hold the step-down position and invite a written appeal. The position is firm on the scores and the medication changes, which are in the chart with dates, and less firm on the step-down, because a waitlist shows no opening this week and says nothing about next week. A partial restore with a dated review is a reasonable result, and it is worth accepting on the call only with a reference number.",
};

const LEVEL_OF_CARE_DOWNGRADE: Elaborated = {
  synthesis:
    "{payer} approved a lower level of care than the one requested for a {age}-year-old, and the letter rests on a single fact: withdrawal scores are stable. The ASAM assessment of {noteDate} rates all six dimensions, and it agrees that withdrawal has settled. It also rates mood and thinking, relapse risk and the home setting at the level that supports {program}, which the letter does not mention.\n\n" +
    "That is a difference in method before it is a difference of clinical opinion. A level-of-care decision is made on the whole multidimensional assessment, and {payer}'s own criteria say that withdrawal alone is not a basis to step down. The lower program the letter points to also has a waitlist this week, so the change would open a gap in care as well as lower its intensity.",
  findings: [
    "The assessment rates all six dimensions on the same date. Dimension 1 is stable, which is what the letter reports, while dimensions 3, 5 and 6 sit at the level that supports {program}. Read together, they describe a patient whose acute symptoms have settled and whose risk of relapse has not. Attach the assessment, and mark each rating beside the sentence in the letter that mentions only withdrawal. If any rating has changed since {noteDate}, update the assessment first, because the reviewer will use the most recent date.",
    "{payer}'s own policy states that level-of-care determinations are made on the multidimensional assessment and that withdrawal alone is not a basis to step down. That makes the single reason in the letter a departure from the payer's own criteria, which is a stronger point than any clinical disagreement. Copy the section number and the sentence exactly, and cite them on the call and in any appeal. Ask the reviewer which of the six dimensions the determination weighed and what rating each received. If the reviewer cannot say, the determination was not made the way the policy describes.",
    "The referral log shows that a step-down referral went to the program the letter points to, and that the program has no opening this week. A lower level of care that cannot admit the patient is not an available alternative, whatever the letter says. Send the log with the date of the referral, the reply and the earliest date offered, and read that date aloud on the call. Ask {payer} to confirm in writing which program it expects to take the patient and from what date. If the log has no reply yet, have the coordinator obtain one before the call.",
  ],
  recommendations: [
    {
      title: "Book the call and ask for the reviewer's worksheet",
      text: "Book the first peer-to-peer slot and, in the same message, ask {payer} for the dimension-by-dimension rating that supports the letter. A payer usually holds a worksheet or a clinical rationale that can be sent through the portal the same day. If it arrives, the call starts from the reviewer's own numbers, and if it does not, that fact is worth noting in the record. Ask for a physician reviewer in addiction medicine or psychiatry. Send the clinician who completed the assessment, because the reviewer's first question will be about how each dimension was rated.",
    },
    {
      title: "Walk through all six dimensions in order",
      text: "Begin by agreeing that withdrawal is stable, because the chart says so and conceding it first makes the rest more credible. Then take the other dimensions one by one from the assessment of {noteDate}, with the rating and the line of the chart that supports each: mood and thinking, relapse risk and the home setting. Say which dimensions are favorable as well, so the reviewer hears a full assessment and not a selection. Close by asking what rating {payer} would give each dimension, since a determination made on one dimension has no ratings for the others. Keep the assessment open on screen and read the ratings aloud instead of summarizing them.",
    },
    {
      title: "Put the payer's own policy in front of the reviewer",
      text: "Quote the sentence from {payer}'s criteria that says level-of-care determinations are made on the multidimensional assessment and that withdrawal alone is not a basis to step down. Give the section number and the version date, so the reviewer can find it in seconds. The point is not that the reviewer is wrong clinically but that the letter does not follow the policy it cites. Ask the reviewer to confirm that the policy applies to this request. If the reviewer says the criteria were met on other grounds, ask for those grounds in writing.",
    },
    {
      title: "Answer the offer to start lower and step back up",
      text: "A common reply is that the patient can begin at the lower level and return if symptoms worsen. Respond with the chart: relapse risk is rated at the level that supports {program}, and the lower program has no opening this week, so the trial would begin with a gap and not with treatment. If the history documents an earlier step-down that was followed by a lapse, state the dates, and if it does not, do not suggest it. Add that a return to a higher level is slower than staying, since it needs a new request and a new decision. Ask what objective measure {payer} would use to decide that the step-down had failed.",
    },
    {
      title: "Show that the lower program has no opening",
      text: "Read from the referral log: the program named in the letter, the date the referral went out, the reply and the earliest opening it gave. State that without an opening the decision does not move the patient to a lower level of care, it leaves the patient without one. Ask {payer} to name a program with a place this week. If it cannot, ask that {program} continue until the opening date and that the transfer be planned for that day. Send the coordinator's written update after the call so the date is on the record.",
    },
    {
      title: "Ask for one outcome and a review at day 7",
      text: "State the ask: restore {program} for the requested stay, with a review at day 7 in which all six dimensions are rated again. A dated review answers the concern behind most downgrades, which is that care continues without an end point. Offer to name, in advance, the ratings that would support a step-down at that review. If the reviewer offers a shorter stay, ask for the review date and the criteria for the next step in writing. Do not agree to a lower level on the call without a reference number and a start date for the lower program.",
    },
    {
      title: "Prepare the written appeal and the external review",
      text: "Have Advocate draft the appeal while the call is being booked, built on the same three findings, and have Integrity check each sentence against the chart before a clinician signs. File inside the appeal window with the assessment, the policy page and the referral log attached. Ask for a physician reviewer who was not part of the first decision and for the clinical rationale in writing. If the decision is upheld, the denial letter names the route to external review and its window, and the same documents go with it. Keep the date of each step in the case so the next window is never missed.",
    },
  ],
  criteria: [
    "ASAM Criteria: the six dimensions and the decision rules for {program}, in particular dimensions 3, 5 and 6",
    "{payerName} medical necessity criteria for {program}: the section on multidimensional review and the section on step-down",
    "{payerName}'s conditions for moving to a lower level of care, as stated in its policy",
    "The appeal-rights notice in the denial letter: the windows for a call, an appeal and an external review",
  ],
  evidence: [
    "ASAM assessment {noteDate}: all six dimensions rated",
    "{payer} criteria: the page on multidimensional review, with the section number and the sentence",
    "Referral log: the step-down referral, the reply and the earliest opening",
    "The most recent progress note and medication record, to show the ratings are current",
    "The denial letter, marked at the sentence that cites withdrawal scores",
  ],
  outlook:
    "Expect the reviewer to agree that withdrawal is stable and to propose starting at the lower level with a quick return if needed. The position is firm on method, because the letter rests on one dimension against the payer's own policy, and less firm on the level itself, because dimensions 3 and 5 depend on the scores being current. A dated review at day 7 is the most likely compromise, and a reasonable one to accept.",
};

const UNITS_CUT: Elaborated = {
  synthesis:
    "{payer} approved {unitsApproved} of the {unitsRequested} units requested for a {age}-year-old in {program} care and wrote that the remaining units are not supported by the documented frequency of treatment. The chart answers that point directly. The attendance log shows every scheduled group and individual session attended, and the treatment plan sets a weekly frequency that adds up to {unitsRequested} units.\n\n" +
    "This is a dispute about arithmetic and the plan, so the facts needed are in two documents. If the letter has misread the frequency, one conversation can settle it. If the reviewer disputes the frequency itself, the fallback is to show what the later weeks of the plan deliver, and that {payer} has approved this schedule before: {similar} similar decisions were compared, and most were approved at the units requested.",
  findings: [
    "The attendance log records every scheduled group and individual session in the period as attended, with no missed sessions. That matters because a unit reduction is often justified by a gap between the units requested and the sessions delivered, and here there is none. Attach the log for the full period and total the sessions by week, so the sum can be checked against {unitsRequested}. Ask the reviewer which weeks the letter regards as under-attended. If the log has a gap, such as an excused absence, say so before the reviewer finds it.",
    "The treatment plan states the frequency, group four days a week and individual sessions twice a week for the authorized period, and those sessions add up to {unitsRequested} units. The letter's phrase, the documented frequency of treatment, can only refer to this page or to the session log, so ask which one {payer} used. Include the plan page that carries the frequency, with its signature and date. If the plan states the frequency only in general terms, have the clinician sign an addendum with the weekly schedule and the arithmetic. Approving {unitsApproved} units would end the plan part-way through and change the intensity of treatment mid-course.",
    "Historian compared {similar} similar {payer} decisions, with the same frequency and diagnosis, and most were approved at the units requested. The comparison does not decide this case, but it shows that {payer} usually reads this schedule as appropriate. Use it as a question about consistency and ask the reviewer why this request was treated differently. Cite the comparison as a count and not as individual cases, since case details cannot be shared. It carries most weight after the attendance log and the plan, which are the documents that make the request match the similar ones.",
  ],
  recommendations: [
    {
      title: "Ask which frequency the letter used",
      text: "Before the call, phone provider services and ask what weekly frequency and what number of weeks the reviewer counted. A unit cut often comes from a clerical mismatch, such as a frequency taken from an earlier authorization or a plan page that was out of date. Ask for the answer in writing, with the reviewer's worksheet if one exists. If the numbers differ from the plan, the correction may be possible without a formal appeal. Do this the same day the letter arrives, since it costs little and sets the agenda for the call.",
    },
    {
      title: "Reconcile the units to the plan, week by week",
      text: "Build a one-page table from the treatment plan: sessions per week, units per session, weeks in the period, and the total, which should come to {unitsRequested}. Mark the week in which {unitsApproved} units run out, because that is the week the reviewer's number cuts the plan. Check the table against the request that was sent, so the figures on the call match the figures on file. If any week differs from the plan, correct it before anyone else finds it. Give the table to the clinician who will join the call.",
    },
    {
      title: "Attach the attendance log and read its totals",
      text: "Send the attendance log for the whole period and read the totals on the call: sessions scheduled, sessions attended and units delivered. Say plainly that there are no missed sessions, and name any excused absence if there is one. Link the log to the plan, so the reviewer sees that the units requested are the units being delivered and not a forecast. Ask whether {payer} disputes any single date in the log. If it does not, the frequency is settled and the discussion moves to whether the treatment is still supported by the chart.",
    },
    {
      title: "Explain what the cut does to the plan",
      text: "The plan was written for {unitsRequested} units, and {unitsApproved} would stop it part-way through. Name what falls in the {unitsDiff} units that were cut: the last phase of the plan and the sessions in which the goals for the period are scheduled to be met. Ask the reviewer which sessions {payer} would remove, and what the clinician is expected to do instead. A cut that leaves the later goals without sessions to meet them is hard to justify on clinical grounds. Say that a lower frequency mid-plan changes the treatment that was authorized, not only its length.",
    },
    {
      title: "Cite the payer's own guidance and the similar approvals",
      text: "Cite {payerName}'s guidance on the frequency and duration of {program}, in the section that defines units per week and how a plan is to be documented. Match the plan to that section line by line, so the reviewer has to dispute the guidance and not only the chart. Then mention once that {similar} similar {payer} decisions were compared and that most were approved at the units requested. Ask why this request was treated differently from the others. Keep this short, because the comparison supports the documents and does not replace them.",
    },
    {
      title: "Ask for the units, with a review at day 14",
      text: "State the ask: restore the units to {unitsRequested}, so that {unitsDiff} units are added, with a review at day 14. A review gives {payer} a date on which to check that the frequency is still right, which meets the concern behind most unit cuts. If the reviewer will restore only part of the difference, ask for the number of units and the date of the next review in writing. Where the reviewer wants a lower frequency, ask for a step-down in frequency with dates, so the change is planned and not abrupt. Do not accept a verbal result without a reference number.",
    },
    {
      title: "Protect the calendar while the decision is open",
      text: "Check the date on which the {unitsApproved} approved units will run out, and write it on the case. Ask for the continued-stay review to be scheduled before that date, so there is no gap in authorization. Sessions delivered after the units end are not covered, so tell the clinician which date to plan around. If the call does not restore the units, file the written appeal inside the appeal window with the attendance log, the plan page and the unit table attached. Keep treatment on schedule in the meantime, since the approved units are valid.",
    },
  ],
  criteria: [
    "{payerName} guidance on frequency and duration for {program}: the section that defines units per week and the documentation of a plan",
    "ASAM Criteria for {program}: the expected weekly hours of service and the dimensions that support that intensity",
    "The wording of the authorization letter on units, dates and the next review",
    "The payer's documentation rules for a treatment plan: frequency stated, signed and dated",
  ],
  evidence: [
    "Attendance log for the full period, totalled by week",
    "Treatment plan page with the weekly frequency, the signature and the date",
    "The unit table: sessions per week, units per session and the total of {unitsRequested}",
    "Historian's comparison of {similar} similar {payer} decisions",
    "The authorization letter showing {unitsApproved} units and the dates they cover",
  ],
  outlook:
    "Expect the reviewer to offer part of the difference, or to ask for the plan in a form that shows the weekly schedule. The position is firm if the log and the plan agree with each other and with {unitsRequested} units, and weaker if they do not, in which case correct the plan and ask for the difference in units only. A restore of part of the {unitsDiff} units with a review date is a normal result.",
};

const LATE_NOTICE: Elaborated = {
  synthesis:
    "{payer} denied the request because notice of admission was not received inside the required window. The portal receipt shows a submission inside the 24-hour window, with a confirmation number saved to the case, and the payer's own call log shows that its record of the notice was entered later than the receipt. The dispute is about which timestamp counts, not about the clinical content of the request.\n\n" +
    "There are two routes. If the receipt holds, the request is reprocessed using its date and the denial lapses. If the receipt falls outside the window on a second reading, the remaining route is the payer's backdating rule, which accepts a late request only when coverage was pending, and that needs the eligibility check from admission. The steps below start with the receipt, since everything else depends on it.",
  findings: [
    "The portal receipt shows that notice of admission was submitted inside the 24-hour window, and the confirmation number is saved to the case. It is the strongest document in the file because the payer's own system created it at the moment of submission. Attach it whole, with the date, the time and the time zone visible, since portals sometimes show server time. Check the receipt against the admission time recorded in the chart before the call, so the first answer to a question about the window is a number and not a search. If the receipt shows a time outside the window, the other two findings carry the case and this one should not be presented as proof.",
    "The payer's record shows the notice entered later than the receipt time, and the caller asked for the date to be corrected. A date that reflects a later data-entry step is a request for correction and not a dispute about whether notice was given. Send the call log with the representative's name, the date and the answer given. Quote the sentence in which the representative agrees that the entry came later, if the log has one. If the log records no answer, ask the caller to phone again and log it before the appeal window closes.",
    "The Backdating rule on this payer's page accepts a request within 72 hours of admission when coverage was pending. It applies here only if the eligibility check from admission shows a pending status, so find that check before citing the rule. Quote the rule as written and give its location on the payer page. Used this way it is a second line of defense: even if the notice were judged late, the payer's own rule would allow it. If no admission-day check is on file, leave the rule out of the call and note that in the case.",
  ],
  recommendations: [
    {
      title: "Check the dates against the letter",
      text: "Start with a one-page timeline: the date and time of admission, the window as the letter states it, the time on the portal receipt and the date the payer logged. Note how the letter counts the window, from admission, from the first service or from the payer's own entry. This decides whether the case is a correction or an exception, and each needs a different conversation. Check the time zone on the receipt against the chart. Finish it the day the letter arrives, because every later step uses these dates.",
    },
    {
      title: "Save the portal receipt and its confirmation number",
      text: "Download the receipt as a PDF and confirm that the confirmation number is also recorded in the case. Read it for the date, the time and the time zone, and for what was submitted, which should be notice of admission and not a different form. Keep a second copy with the call log, so both can be sent together. If the receipt is missing, ask Navigator to retrieve it from the portal history and say so in the case. Without it the argument depends on the payer's records and not on ours.",
    },
    {
      title: "Ask the payer for its own intake record",
      text: "Phone provider services and ask when the notice was entered in the payer's system, by whom and from what source. Ask for the audit trail or a written statement of the entry date. Say that the receipt shows an earlier submission, and ask that the difference be explained and not just corrected. Record the representative's name, the date and the reference number in the call log. If the representative cannot see the entry history, ask for a supervisor.",
    },
    {
      title: "Ask for reprocessing before filing an appeal",
      text: "Request that the payer reprocess the request using the receipt date as the date of notice. This goes through provider relations or the corrections route and is usually quicker than a formal appeal. Give the confirmation number, the receipt time and the call reference in the first sentence of the request. Ask for the date by which a decision will be made. File the written appeal in parallel if that date falls close to the end of the appeal window.",
    },
    {
      title: "Use the Backdating rule only if the eligibility check supports it",
      text: "The rule accepts a request within 72 hours of admission when coverage was pending, so it helps only if the eligibility check from the admission date shows that status. Find the check and read its date and result before the rule is mentioned. If it shows pending coverage, cite the rule as a second ground, in case the payer holds to its own entry date. If it shows active coverage or no check was run, leave the rule out. Citing a rule the chart does not support invites the reviewer to examine the rest of the file more closely.",
    },
    {
      title: "Say so plainly if the notice was late",
      text: "Where the receipt falls outside the window and coverage was not pending, the chart does not support an argument that notice was on time. In that case do not argue the point on the call. Ask whether the payer considers late notice for good cause, name any documented reason, and offer the clinical records for the days that were affected. If nothing in the file supports a reason, accept the denial for those days, record why, and ask only for the days after the notice date. Telling the clinic this early saves time that is better spent on denials the chart supports.",
    },
    {
      title: "File the appeal in the window, then fix the process",
      text: "File the written appeal inside the window in the denial letter, with the receipt, the call log, the timeline and, if it applies, the eligibility check and the rule page. Ask for a decision date, and note the date for the next level in case the decision is upheld. Once the case is settled, add a reminder on the admission day so that notice is sent with margin to spare. Navigator can flag any admission whose window is within a few hours of closing. Send the corrected process note to the admissions team so the same error does not recur.",
    },
  ],
  criteria: [
    "{payerName} notification requirements: the window after admission and how the payer counts it (from admission, from the first service or from its own entry)",
    "The Backdating rule on the payer's page: a request is accepted within 72 hours of admission when coverage was pending",
    "The provider agreement's section on notice of admission and on corrections to dates of record",
    "The appeal-rights notice in the denial letter and its filing window",
  ],
  evidence: [
    "Portal receipt with the confirmation number, date, time and time zone",
    "Payer call log with the representative's name, the date and the answer on correcting the entry date",
    "Payer rules, Backdating: the rule text and its location on the payer page",
    "Eligibility check from the admission date, if it shows pending coverage",
    "The admission record with the date and time of admission",
  ],
  outlook:
    "Expect the payer to defend its entry date at first and to correct it once it sees the receipt, because the receipt is a record of its own system. The position is firm if the receipt falls inside the window. If it does not, the position is weak, the Backdating rule is the only route, and accepting the denial for the affected days is a reasonable choice.",
};

const RETRO_AUTHORIZATION_DENIED: Elaborated = {
  synthesis:
    "{payer} denied the retro-authorization on the ground that coverage was not pending at admission. The eligibility check taken on the day of admission ({noteDate}) shows the opposite, a pending status with an effective date entered later by the payer. The retro-request form went in with proof of pending eligibility inside 72 hours, and the payer's own eligibility update now makes coverage effective on or before the admission date.\n\n" +
    "Each of the three facts answers part of the denial, and all three have to agree on the dates. Before anyone calls, set the admission date, the form date and the effective date side by side on one page. If they agree, the ask is for the retro days from admission. If the effective date turns out to be later than admission, the ask narrows to the days after it, and it is better to say so first than to be told so.",
  findings: [
    "The eligibility check taken on the admission date shows coverage as pending, and the effective date was entered later by the payer. That is the fact the denial letter gets wrong, so it is the first document to attach. Check that the result carries a date and a time, and that the member and plan identifiers match the request. Attach the saved result as well as any printed copy, since the saved result shows when the check was run. If the check was run after admission, say so, because a later check does not prove what the status was on the day.",
    "The retro-authorization form was submitted with proof of pending eligibility within 72 hours of admission, which is the condition in the payer's rule. The form and its submission receipt together show when and how it was filed. Send both and read the submission time aloud on the call. Packet filed the form, so ask for its confirmation number and do not rely on the portal's status screen. If the receipt shows a time beyond 72 hours, count again from the payer's own definition of the admission time before conceding the point.",
    "The payer's eligibility update shows coverage effective from a date on or before the admission date. It turns a pending status into covered days and comes from the payer, which makes it hard to dispute. Include it and read the effective date aloud. If the date is the admission date, ask the payer to apply it to every day of the stay. If the date is later than admission, limit the request to the days from that date and say so at the start of the call.",
  ],
  recommendations: [
    {
      title: "Set the three dates side by side",
      text: "Make a one-page table with the admission date and time, the time the retro form was submitted and the effective date in the payer's update. Count the hours between admission and submission, using the payer's definition of admission. The table is the script for the call, and it shows whether the ask is for the full stay or for part of it. Give a copy to whoever will speak to the payer. Complete it before any call, since a wrong date said aloud is hard to take back.",
    },
    {
      title: "Pull the eligibility check from the day of admission",
      text: "Find the check that was run on the admission date and confirm that it shows a pending status, with its date and time. If the front desk or Verify holds a saved result, attach it. This is the document the denial letter contradicts, and the case is weak without it. If the check cannot be found, say so in the case notes and do not describe coverage as pending on the call. A request that rests on an unverifiable status gives the reviewer a reason to ignore the rest.",
    },
    {
      title: "Attach the retro form with its receipt",
      text: "Attach the retro-request form together with the submission receipt and confirmation number. Read the time of submission and the number of hours since admission. State that proof of pending eligibility went with the form, as the rule requires. If the form was filed near the end of the window, expect the reviewer to check the count, and have the calculation ready. Ask Packet for the confirmation number if the portal shows only a status.",
    },
    {
      title: "Quote the payer's own retro rule",
      text: "Read the rule from the payer's page: a retro request is accepted within 72 hours of admission, or later when coverage was pending and the eligibility check is on file. The reason in the letter is a factual claim, that coverage was not pending, and the eligibility record contradicts it. Ask the reviewer to point to the line of the rule that the request did not meet. If the reviewer cites the effective date, ask which date the payer used and where it appears in its own update. Write the answer down with the reference number.",
    },
    {
      title: "Ask for a correction before an appeal",
      text: "Call provider services and ask whether the pending-status record can be corrected without a formal appeal. Denials of this kind sometimes come from a mismatch between the payer's eligibility system and its authorization system. Give the member identifier, the dates and the reference of the eligibility update, and ask for a supervisor if the first representative cannot see the history. Ask how long a correction takes and what will be sent in writing. Keep the appeal window in view while waiting, and do not let the correction request run past it.",
    },
    {
      title: "File the written appeal inside the window",
      text: "Prepare the appeal while the correction is pending: the letter, the eligibility check, the retro form with its receipt and the payer's update. Ask for the retro days from the admission date to the date of the first approved authorization, and name both dates. Request a physician reviewer who took no part in the first decision, and a decision date. Note the filing deadline on the case, since a missed window ends the argument more surely than a weak one. If the decision is upheld, the same documents go forward to the next level.",
    },
    {
      title: "Narrow the ask if coverage began after admission",
      text: "If the payer's update shows an effective date after admission, the chart supports asking only for the days from that date. Say so plainly and do not argue for the earlier days, since the payer's own record shows no coverage for them. Ask whether the days from the effective date can be authorized, and check whether another coverage source or the facility's own policy applies to the earlier days. Record the reason for accepting those days. Then ask admissions to run the eligibility check and file the retro form on the day of admission whenever coverage is pending.",
    },
  ],
  criteria: [
    "{payerName} retro-authorization rule: a request within 72 hours of admission, or later when coverage was pending on the admission date and the check is on file",
    "The payer's definition of an effective date and of a pending status",
    "The provider agreement's section on retroactive eligibility",
    "The appeal-rights notice in the denial letter: filing window and reviewer",
  ],
  evidence: [
    "Eligibility check {noteDate}: pending status on the day of admission",
    "Retro-request form with its submission receipt and confirmation number",
    "Eligibility update from the payer showing the effective date",
    "The admission record with the date and time of admission",
    "The denial letter, marked at the sentence that says coverage was not pending",
  ],
  outlook:
    "Expect the reviewer to check the dates closely and to hold the denial for any day before the effective date. The position is firm when the three dates agree, because the payer's own update and its own rule both support the request. If the effective date is later than admission, it holds only for the days after it, and accepting the earlier days is reasonable.",
};

const FULL_DENIAL: Elaborated = {
  synthesis:
    "{payer} denied the request for a {age}-year-old in {program} care and wrote that the information sent did not show its criteria were met. The original packet, with the multidimensional assessment, the treatment plan and the medication list, went through the portal and the receipt is saved, so the claim that evidence was missing is partly wrong. One document was not in that packet: the most recent progress note, which shows craving and mood scores above the clinical cutoff and treatment goals not yet met.\n\n" +
    "That points to a resubmission that adds the missing note and proves what was sent the first time. The assessment and the note belong side by side, since the assessment sets the level and the note shows that the need for it has not changed. A call can settle this today if the reviewer has the packet open, and a written appeal is the same argument with a deadline.",
  findings: [
    "The letter says the information did not show the criteria were met, but the original packet went through the portal with the multidimensional assessment, the treatment plan and the medication list, and the receipt is saved. That makes the reason partly a question of records: either the reviewer did not open the attachments or they did not reach the reviewer. Attach the receipt with its date and time, and list the attachments by name. Ask {payer} to confirm which documents it holds for this request. If the receipt shows fewer attachments than expected, resend the missing pages and say so.",
    "The progress note of {noteDate} was not in the original packet, and it is the document that shows where the patient is now: craving and mood scores both above the clinical cutoff and treatment goals not yet met. A reviewer who sees only the assessment sees the level that was requested, not whether the need for it has persisted. Add the note to the resubmission and point to the scores and to the sentence on goals. Ask the clinician to check that the note gives each score with its cutoff, and to add an addendum if it does not. State on the call that the note is new, so the reviewer reads it as an update and not as a repeat.",
    "Historian found {similar} similar {payer} decisions with the same assessment profile, and most were approved at the level requested. The comparison does not decide this case, but it shows that the profile in the packet is one {payer} usually accepts. Use it as a question about consistency, in one sentence: why was this request treated differently from similar ones. Quote the count and not the cases, since individual decisions cannot be shared. It carries more weight once the new progress note is already on the table.",
  ],
  recommendations: [
    {
      title: "Read the letter for what it says is missing",
      text: "Go through the letter line by line and write down the exact criterion or document it says was not shown. Match each statement to a document in the original packet, and mark any statement that has no match. Note the date on the letter and the windows for a call and an appeal, because the choice of route depends on them. A letter that says only that criteria were not shown has not told the clinic what to fix, and that is worth saying on the call. Finish this within a day, since every later step uses it.",
    },
    {
      title: "Prove what was sent the first time",
      text: "Pull the portal receipt for the original packet and list every attachment with its file name. Send the receipt to {payer} and ask it to confirm in writing which documents it holds for this request. If an attachment is missing on its side, resend it with a note that it was in the first submission. If the receipt lists everything, the letter's statement is wrong on the facts, and that can be put politely and plainly. Packet can pull the receipt and the attachment list in a few minutes.",
    },
    {
      title: "Add the latest progress note",
      text: "Attach the progress note of {noteDate} and read the scores aloud with their cutoffs. Say that it was not part of the first packet and that it shows the symptoms the assessment described are still present. Ask the clinician to add an addendum if the note gives a score without its cutoff or without its date. Check that the medication list in the packet matches the doses in the note. A mismatch between two documents is the easiest reason for a reviewer to doubt both.",
    },
    {
      title: "Set the assessment beside the criteria",
      text: "Make a one-page table with {payerName}'s criteria for {program} on the left and the line of the chart that meets each on the right. Use the six dimensions of the assessment as the frame, and mark any criterion the chart does not yet meet instead of leaving it out. The reviewer then sees the case in the payer's own terms, and the reply to the letter writes itself. Keep the table to one page so it can be read on the call and attached to an appeal. Have the clinician check each line before it is sent.",
    },
    {
      title: "Choose between a call and a resubmission",
      text: "If the call window is open, call first: a reviewer with the packet and the new note in front of them can often change the decision in one conversation. If the window has closed, send the table and the new note as a resubmission, which is quicker than a formal appeal and stays on the record. Ask for the decision date in either case. Note which route was taken and why, so the next review follows the same pattern. If neither the call nor the resubmission is possible, go straight to the written appeal.",
    },
    {
      title: "Cite similar approvals once, then ask for the outcome",
      text: "Mention once that {similar} similar {payer} decisions with the same assessment profile were compared, and that most were approved at the level requested. Then ask why this request was treated differently. Move straight to the ask: overturn the denial and approve the requested stay, with a review at day 7. A review date gives the reviewer a reason to agree, because it limits the commitment. If the reviewer offers a shorter stay, ask for the review date and the criteria for extending it in writing.",
    },
    {
      title: "Keep the written appeal ready",
      text: "Have the appeal drafted by the time of the call, built on the table, the receipt and the new note. If the reviewer holds the denial, ask for the specific criterion that was not met, in writing, and file inside the appeal window. Request a physician reviewer who took no part in the first decision. If the appeal is upheld, the denial letter names the route to external review and its window, and the same documents go forward. Keep the date of each step in the case.",
    },
  ],
  criteria: [
    "{payerName} medical necessity criteria for {program}, each one matched to a document in the packet",
    "ASAM Criteria: the six dimensions and the level of care they support",
    "The payer's submission requirements for this request type: which documents must accompany it",
    "The appeal-rights notice in the denial letter: window, reviewer and route to external review",
  ],
  evidence: [
    "Original packet receipt, with the date, the time and the list of attachments",
    "Multidimensional assessment and treatment plan from the original packet",
    "Progress note {noteDate}: scores above the clinical cutoff and goals not yet met",
    "Medication list with current doses",
    "Historian's comparison of {similar} similar {payer} decisions",
    "The denial letter, marked at the sentence that says information was missing",
  ],
  outlook:
    "Expect the reviewer to say that the new note is the first time the scores were seen, and to ask for a formal resubmission or an appeal. The position is reasonably firm because the packet receipt and the new note answer the letter's one reason. It is less firm if the receipt shows missing attachments, in which case resend them and say so, and if the reviewer still holds the denial, ask for the criterion not met in writing and appeal.",
};

/** The default for each kind of denial. */
export const ELABORATED: Record<DenialType, Elaborated> = {
  "Partial approval": PARTIAL_APPROVAL,
  "Level-of-care downgrade": LEVEL_OF_CARE_DOWNGRADE,
  "Units cut": UNITS_CUT,
  "Late notice": LATE_NOTICE,
  "Retro-authorization denied": RETRO_AUTHORIZATION_DENIED,
  "Full denial": FULL_DENIAL,
};

/** The long text for one ASAM dimension, by the dimension's name as it appears in the analysis ("D1 Withdrawal") and its tone
    (good, mid, risk, neutral): what the chart shows, why it matters for the level of care, and what to cite. */
export const DIMS_LONG: Record<string, DimLongByTone> = {
  "D1 Withdrawal": {
    good: "Withdrawal scores are low and craving is reported at a low level. On this dimension alone the chart would not support a higher level of care, and it helps to say so first, because it shows the review was read in full. It does not settle the other five dimensions, which are rated on their own evidence. If the letter rests on withdrawal, cite the scores honestly and then turn to the dimensions where the chart differs.",
    mid: "Withdrawal scores are low, but cravings are still reported at the most recent review. Low scores show that the acute phase has passed, while persistent craving shows that the risk of relapse has not, and that is a different dimension from withdrawal. Cite the craving rating together with the date of the review. Name any medication aimed at craving and the date it was started.",
    risk: "Withdrawal symptoms are still present or recent enough that monitoring is part of the plan. A scale score above the program's threshold, or symptoms treated within the last few days, supports a level of care where nursing observation and medical review are available. Cite the scores with their dates and the medication used to treat withdrawal. A step-down while symptoms are still changing carries the risk of an unplanned return to use.",
    neutral: "Withdrawal was not rated at the most recent review, or it does not apply to this patient's substance use. That is not a weakness in the request, but it means this dimension should not be cited for or against it. If the letter relies on withdrawal, ask the reviewer for the scores it used. Where the chart has no recent rating, ask the clinician to add one.",
  },
  "D2 Medical": {
    good: "No acute medical concern is documented, and medications are monitored. This dimension does not drive the request, but dose changes still in progress count in favor of continuity. Cite the medication record for the date of each change and the next review. State that no adverse effects are recorded, which answers the usual objection that a change was a complication.",
    mid: "A medical condition or a medication change needs monitoring during the requested period. Dose changes take weeks to show their effect, and the review that decides the next dose often falls inside the days that were denied. Cite the medication record with the date of the change and the date of the next review. Ask the reviewer how that review would take place at a lower level of care.",
    risk: "A medical problem is active or unstable, for example abnormal vital signs, an interacting condition or a medication that needs close observation. This supports a level of care with medical staff on site, and it should be cited with the date and the finding. Attach the note that records it and the plan for follow-up. If the issue could be managed at a lower level, say how and by whom.",
    neutral: "No medical issue is recorded for this dimension at the most recent review, and no medication change is pending. It neither helps nor hurts the request, and it can be left out of the argument. If the letter gives a medical reason for the decision, ask for its source. Otherwise concentrate on the dimensions where the chart has findings.",
  },
  "D3 Mood and thinking": {
    good: "Mood and anxiety scores are below the clinical cutoff and moving down, and there is no recent safety concern. On this dimension the chart supports the lower level the letter proposes, and it is better to concede that than to defend a score that does not support it. Cite the scores with their dates so the reviewer sees the same trend. Then move to the dimensions where the chart still supports the requested level.",
    mid: "Scores sit near the cutoff or are mixed: one scale is above it and another below, or scores have moved but not by enough to call a change. Cite each score with its cutoff and its change since the start of treatment, and say what the clinician considers a meaningful change on that scale. The chart supports continuing while the trend is still forming. If the latest note lacks scores, ask for an addendum.",
    risk: "Mood, anxiety or trauma scores are above the clinical cutoff at the most recent review, so the symptoms that brought the patient into treatment are still active. Read the score and the cutoff together, for example a depression score of 15 against a cutoff of 10, and note whether a safety plan is in place. This dimension supports continued intensive care and should lead the call. Cite the progress note by date and ask the reviewer which score the payer reads as recovered.",
    neutral: "Mood and thinking were not scored at the most recent review, or the scores are too old to cite. The chart does not support an argument on this dimension until a current rating is on file. Ask the clinician to add the scales and the date, because a reviewer may treat a missing score as a normal one. Until then, leave the dimension out.",
  },
  "D4 Readiness": {
    good: "The patient attends, takes part and has told the clinician about difficulties, which shows real engagement. A reviewer may read this as stability, so say plainly that engagement is a reason to continue, since it is what allows the next phase of treatment to begin. Cite attendance and any sign of insight from the note. Keep this dimension distinct from symptom change, which is rated elsewhere.",
    mid: "The patient is engaged in treatment, but the link between cravings and mood is still forming, and the insight that treatment depends on is not yet in place. Attendance alone does not show that. Cite the clinician's observation and its date, and say what the plan does next to build it. This supports continuing, because the part of treatment that depends on insight is still ahead.",
    risk: "Engagement is low or uncertain: missed sessions, ambivalence about continuing or reluctance to take part. This is a real weakness in the request, and it should be addressed directly instead of being left for the reviewer to find. Describe what the team has done to re-engage the patient and what has changed. Where the chart does not show improvement, say so and focus the argument on the other dimensions.",
    neutral: "Readiness is not described in enough detail at the most recent review to be cited. It is rated by the clinician in the assessment, and the progress note should record attendance and participation. Ask for a sentence on each before the call. The dimension is better left out of the argument until then.",
  },
  "D5 Relapse risk": {
    good: "The risk of relapse is low: skills are in use, the patient has a plan for triggers and an outpatient provider is lined up. On this dimension the chart supports a step-down, and it is better to say so than to leave the reviewer to say it. Cite the plan and the appointment. The argument for the requested level then rests on other dimensions.",
    mid: "The risk is moderate. Some protective factors are in place, but triggers remain and the outpatient plan is not yet complete. Cite what is in place and what is missing, with dates, and say what the next review will check. The chart supports continuing until the missing pieces are in place, and it helps to name them as the conditions for a step-down.",
    risk: "The risk of relapse is high, with no outpatient provider lined up and earlier lapses documented. Cite the referral log for the missing provider and the history for earlier attempts, including how long each held. Ask the reviewer what protects the patient in the first weeks after the stay ends. The strongest form of this argument names the next provider and the first date on which care resumes.",
    neutral: "Relapse risk was not rated in detail at the most recent review. Ask the clinician to record the triggers, the earlier lapses and the supports in place, with dates. Without that, the reviewer will treat the risk as low. The dimension carries weight in most continued-stay decisions, so it is worth the extra note.",
  },
  "D6 Home": {
    good: "The home setting is stable and supportive: a safe place to live, people who support recovery and no one using in the household. On this dimension the chart supports a lower level of care, and it should be conceded. Cite the details with their date. The argument for the requested level then rests on mood and relapse risk.",
    mid: "The home setting has some supports and some risks, for example a supportive family member alongside a household member who uses, or stable housing without daytime structure. Cite both sides with dates, and say what the plan does to strengthen the supports. The chart supports continuing while the plan is being put in place, with a review that checks it.",
    risk: "The home setting has little support for recovery: someone in the household uses, there is no family or peer support, or housing is unstable. The lower level of care in the letter assumes a home that can hold the patient between sessions. Cite the referral log and the social history, and ask the case manager to look at recovery housing. Ask the reviewer how the lower level would work from this setting.",
    neutral: "The home setting was not described in the most recent review. It is rated in the assessment, and a sentence on housing, household and supports would let it be cited. Ask the clinician or the case manager for it before the call. Until then, leave the dimension out.",
  },
};
