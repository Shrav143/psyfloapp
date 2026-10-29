import { GENERIC_DIMS, type AnalysisText, type DenialType } from "./denials";

/* One template per denial type. Placeholders: {payer} {payerName} {program} {age} {who} {approved} {requested} {from}
   {gap} {unitsRequested} {unitsApproved} {unitsDiff} {noteDate} {rangeDates} {similar}. Filled in lib/analysis.ts.
   Wording follows the product rules: "the chart supports", never "the patient needs". */

const ADMIN_DIMS: AnalysisText["dims"] = [];

export const TEMPLATES: Record<DenialType, AnalysisText> = {
  "Partial approval": {
    short: "{payer} approved {approved} of {requested} days",
    quote: "{payer} approved {approved} of the {requested} days requested and wrote that continued stay is not supported by documented progress, recommending a step-down to a lower level of care.",
    chartShows: "Symptom scores are still above the clinical cutoff, medications are being adjusted, and no step-down program has an opening. The chart supports finishing the requested stay.",
    findings: [
      { sev: "Critical", title: "{payer}'s reason conflicts with the chart", detail: "Scores were still above the cutoff at the most recent review, which the letter does not mention.", source: "Progress note {noteDate}", excerpt: "Most recent review. Craving and mood scores both above the clinical cutoff. Full group attendance. Treatment goals not yet met.", fix: "Add the progress note from {noteDate}" },
      { sev: "Critical", title: "Medication changes are still in progress", detail: "A medication was started or adjusted within the last 7 days and has not reached its full effect.", source: "MAR {rangeDates}", excerpt: "Dose changes recorded in the last 7 days. Next dose review is inside the requested dates. No adverse effects recorded.", fix: "Attach the medication record for {rangeDates}" },
      { sev: "Strong", title: "No safe step-down exists this week", detail: "The next level of care has a waitlist and the home setting has little support.", source: "Referral log", excerpt: "Step-down referral sent. Waitlist, no opening this week. Home setting has little support for recovery.", fix: "Attach the referral log showing the waitlist" },
    ],
    dimsSub: "Most recent review",
    dims: GENERIC_DIMS,
    opening: "I am calling about a partial approval for a {age}-year-old in {program} care. {payer} approved {approved} of {requested} days. I would like to review why, and ask you to restore days {from} to {requested}.",
    points: [
      { title: "Scores are still above the clinical cutoff", detail: "The most recent review shows craving and mood above cutoff. Stopping now would end treatment before it works.", source: "Progress note {noteDate}" },
      { title: "Medication changes have not reached full effect", detail: "A dose change inside the last 7 days is still being monitored.", source: "MAR {rangeDates}" },
      { title: "There is no safe step-down this week", detail: "The next program has a waitlist, and the home setting has little support.", source: "Referral log" },
    ],
    pushback: [
      ["“The member is engaged, so outpatient is enough.”", "Engagement is a reason to continue. Scores are still above cutoff, and earlier outpatient care did not hold."],
      ["“{approved} days is the usual first approval.”", "{approved} days ends before the medications take effect. Ask for days {from} to {requested} with a review on day {requested}."],
      ["“Why not a lower level of care now?”", "No program has an opening, and the home setting has little support."],
    ],
    ask: "Restore days {from} to {requested}, with a review on day {requested} and the step-down provider named at that review.",
    regained: "{regain} days regained",
  },

  "Level-of-care downgrade": {
    short: "{payer} approved a lower level of care",
    quote: "{payer} approved a lower level of care than the one requested and wrote that the member no longer meets its criteria for {program}, citing stable withdrawal scores.",
    chartShows: "Withdrawal scores are stable, but mood, craving and home-setting dimensions still meet the criteria for {program}. The letter applies only the withdrawal dimension.",
    findings: [
      { sev: "Critical", title: "The criteria were applied to one dimension only", detail: "The letter cites stable withdrawal scores. The other five dimensions are not addressed.", source: "ASAM assessment {noteDate}", excerpt: "All six dimensions rated. D3, D5 and D6 at the level that supports {program}. D1 stable.", fix: "Add the ASAM assessment dated {noteDate}" },
      { sev: "Critical", title: "{payer}'s own policy asks for all six dimensions", detail: "The policy that Criteria reviewed lists every dimension, not withdrawal alone.", source: "{payer} criteria", excerpt: "Level-of-care determinations are made on the multidimensional assessment. Withdrawal alone is not a basis to step down.", fix: "Cite the payer's section on multidimensional review" },
      { sev: "Strong", title: "The lower level of care has no opening", detail: "The program the letter points to has a waitlist this week.", source: "Referral log", excerpt: "Step-down referral sent. Waitlist, no opening this week.", fix: "Attach the referral log showing the waitlist" },
    ],
    dimsSub: "Most recent review",
    dims: GENERIC_DIMS,
    opening: "I am calling about a level-of-care change for a {age}-year-old in {program} care. {payer} approved a lower level than requested, citing stable withdrawal scores. I would like to walk through the other five dimensions and ask you to restore {program}.",
    points: [
      { title: "Withdrawal is stable, and the other five dimensions are not", detail: "Mood, craving, relapse risk and home setting all meet the criteria for {program}.", source: "ASAM assessment {noteDate}" },
      { title: "The payer's policy asks for the full multidimensional review", detail: "The criteria do not allow a step-down on one dimension alone.", source: "{payer} criteria" },
      { title: "The lower level has no opening this week", detail: "The referral is on a waitlist.", source: "Referral log" },
    ],
    pushback: [
      ["“Withdrawal is resolved, so intensive care is not needed.”", "Withdrawal is one of six dimensions. The other five still meet criteria."],
      ["“The member can start at a lower level and step back up.”", "Stepping down early is the pattern that preceded the last relapse. There is no opening in the lower program."],
    ],
    ask: "Restore {program} for the requested stay, with a review at day 7.",
    regained: "The full requested level of care",
  },

  "Units cut": {
    short: "{payer} cut units from {unitsRequested} to {unitsApproved}",
    quote: "{payer} approved {unitsApproved} of the {unitsRequested} units requested and wrote that the remaining units are not supported by the documented frequency of treatment.",
    chartShows: "Group and individual sessions were attended at the planned frequency, and the treatment plan calls for {unitsRequested} units across the period.",
    findings: [
      { sev: "Critical", title: "Attendance matches the units requested", detail: "Session logs show attendance at the planned frequency.", source: "Attendance log", excerpt: "Attended every scheduled group and individual session in the period. No missed sessions.", fix: "Attach the attendance log" },
      { sev: "Strong", title: "The treatment plan states the frequency", detail: "The plan lists the sessions per week that add up to {unitsRequested} units.", source: "Treatment plan", excerpt: "Frequency: group 4 days a week, individual 2 sessions a week, for the authorized period.", fix: "Attach the treatment plan page with the frequency" },
      { sev: "Strong", title: "Similar requests were approved in full", detail: "Historian found {similar} similar {payer} decisions, most approved at the requested units.", source: "Historian, similar decisions", excerpt: "Most similar requests with the same frequency and diagnosis were approved at the requested units.", fix: "Cite the similar approvals in the appeal" },
    ],
    dimsSub: "Most recent review",
    dims: GENERIC_DIMS,
    opening: "I am calling about a unit reduction for a {age}-year-old in {program} care. {payer} approved {unitsApproved} of {unitsRequested} units. I would like to review the attendance and the treatment plan, and ask you to restore {unitsDiff} units.",
    points: [
      { title: "Attendance matches the planned frequency", detail: "Every scheduled session was attended in the period.", source: "Attendance log" },
      { title: "The treatment plan states the frequency", detail: "The sessions per week add up to {unitsRequested} units.", source: "Treatment plan" },
      { title: "Similar requests were approved in full", detail: "{similar} similar decisions, most at the requested units.", source: "Historian, similar decisions" },
    ],
    pushback: [
      ["“Fewer units would be enough for this member.”", "The plan sets the frequency, and the member has attended all of it."],
      ["“Request the rest at the next review.”", "A cut now would lower the frequency before the next review, mid-plan."],
    ],
    ask: "Restore the units to {unitsRequested}, with a review at day 14.",
    regained: "{unitsDiff} units restored",
  },

  "Late notice": {
    short: "{payer} denied for late notice",
    quote: "{payer} denied the request because notice was not received within the required window after admission.",
    chartShows: "The portal receipt shows notice was given inside the window. The letter counts from the date of the payer's own record, which was entered later.",
    findings: [
      { sev: "Critical", title: "The receipt shows notice on time", detail: "Navigator saved a portal receipt time-stamped inside the window.", source: "Portal receipt", excerpt: "Notice of admission submitted through the provider portal inside the 24-hour window. Confirmation number saved to the case.", fix: "Attach the portal receipt" },
      { sev: "Strong", title: "The payer's date is a later entry", detail: "The payer logged the notice after the receipt time.", source: "Payer call log", excerpt: "Payer record shows the notice entered later than the receipt time. Caller asked for the date to be corrected.", fix: "Attach the call log with the payer's answer" },
      { sev: "Strong", title: "The payer's rule allows late notice when coverage was pending", detail: "The Backdating rule on this payer's page allows it.", source: "Payer rules, Backdating", excerpt: "A retro request is accepted within 72 hours of admission when coverage was pending.", fix: "Cite the rule in the resubmission" },
    ],
    dimsSub: "",
    dims: ADMIN_DIMS,
    opening: "I am calling about a late-notice denial for a {age}-year-old in {program} care. Our portal receipt shows notice inside the window. I would like to reprocess the request using the receipt date.",
    points: [
      { title: "Notice was given inside the window", detail: "The portal receipt is time-stamped inside the 24 hours.", source: "Portal receipt" },
      { title: "The payer's date is a later entry", detail: "The payer's own record was entered after the receipt.", source: "Payer call log" },
      { title: "The payer's rule allows late notice when coverage was pending", detail: "A retro request is accepted within 72 hours.", source: "Payer rules, Backdating" },
    ],
    pushback: [
      ["“We have no record of notice on that date.”", "Here is the confirmation number and the time-stamped receipt."],
      ["“Notice rules are strict.”", "The receipt shows the rule was met. If it was not, the payer's own backdating rule applies."],
    ],
    ask: "Reprocess the request using the receipt date and treat notice as on time.",
    regained: "The request is reviewed on its merits",
  },

  "Retro-authorization denied": {
    short: "{payer} denied the retro-authorization",
    quote: "{payer} denied the retro-authorization request because coverage was not pending at admission.",
    chartShows: "The eligibility check on the day of admission shows coverage pending, with a later effective date. The retro-request form was filed inside the payer's window.",
    findings: [
      { sev: "Critical", title: "Eligibility was pending at admission", detail: "Verify's check on the admission date shows a pending status.", source: "Eligibility check {noteDate}", excerpt: "Coverage status on the admission date: pending. Effective date entered later by the payer.", fix: "Attach the eligibility check from admission" },
      { sev: "Strong", title: "The retro form was filed inside the window", detail: "Packet filed the form within 72 hours of admission.", source: "Retro-request form", excerpt: "Retro-authorization request form submitted with proof of pending eligibility within 72 hours of admission.", fix: "Attach the retro-request form and receipt" },
      { sev: "Strong", title: "Coverage was later made effective back to admission", detail: "The payer's eligibility update shows an effective date on or before admission.", source: "Eligibility update", excerpt: "Member coverage effective from a date on or before the admission date.", fix: "Attach the eligibility update" },
    ],
    dimsSub: "",
    dims: ADMIN_DIMS,
    opening: "I am calling about a retro-authorization denial for a {age}-year-old in {program} care. Coverage was pending at admission and the form was filed inside the window. I would like to overturn the denial and approve the retro days.",
    points: [
      { title: "Coverage was pending on the admission date", detail: "The eligibility check on the day of admission shows pending.", source: "Eligibility check {noteDate}" },
      { title: "The retro form was filed inside the window", detail: "Filed within 72 hours with proof of pending eligibility.", source: "Retro-request form" },
      { title: "Coverage was made effective back to admission", detail: "The payer's own update shows the effective date.", source: "Eligibility update" },
    ],
    pushback: [
      ["“Coverage was not active at admission.”", "It was pending, and the payer's update makes it effective from admission."],
      ["“The form was late.”", "The receipt shows it was filed inside the 72 hours."],
    ],
    ask: "Overturn the denial and approve the retro days from the admission date.",
    regained: "The retro days from admission",
  },

  "Full denial": {
    short: "{payer} denied the request",
    quote: "{payer} denied the request and wrote that the information sent does not show that its criteria for {program} are met.",
    chartShows: "The chart documents the criteria the letter says are missing. The assessment and treatment plan were attached, but the most recent progress note was not.",
    findings: [
      { sev: "Critical", title: "The letter says evidence is missing, but it was sent", detail: "The assessment and treatment plan were in the original packet.", source: "Original packet", excerpt: "Packet sent through the portal with the multidimensional assessment, treatment plan and medication list. Receipt saved.", fix: "Attach the original packet receipt" },
      { sev: "Critical", title: "The latest progress note was not attached", detail: "It shows scores still above the cutoff.", source: "Progress note {noteDate}", excerpt: "Most recent review. Craving and mood scores above the clinical cutoff. Treatment goals not yet met.", fix: "Add the progress note from {noteDate}" },
      { sev: "Strong", title: "Similar requests were approved with the same evidence", detail: "Historian found {similar} similar {payer} decisions.", source: "Historian, similar decisions", excerpt: "Requests with the same assessment profile were approved at the requested level in most similar decisions.", fix: "Cite the similar approvals in the appeal" },
    ],
    dimsSub: "Most recent review",
    dims: GENERIC_DIMS,
    opening: "I am calling about a denial for a {age}-year-old in {program} care. {payer} wrote that the criteria were not shown. The assessment and treatment plan were in the original packet, and I have the latest progress note.",
    points: [
      { title: "The documents the letter asks for were sent", detail: "The assessment and treatment plan are in the original packet.", source: "Original packet" },
      { title: "The latest progress note shows scores above cutoff", detail: "It was not part of the first packet.", source: "Progress note {noteDate}" },
      { title: "Similar requests were approved with the same evidence", detail: "{similar} similar decisions.", source: "Historian, similar decisions" },
    ],
    pushback: [
      ["“The information did not show medical necessity.”", "The assessment does, and the new progress note adds the most recent scores."],
      ["“Submit an appeal instead.”", "We can, but a call can settle it today with the evidence in hand."],
    ],
    ask: "Overturn the denial and approve the requested stay, with a review at day 7.",
    regained: "The full requested stay",
  },
};
