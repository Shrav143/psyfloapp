import type { AskTopic } from "../../types";

/* Ask Psyflo topics. Every answer is written for the demo, in a decision-support tone: it says what the sources say and leaves the decision with the clinician.
   Topics that quote one consumer's chart are limited to the document kind only that consumer has in the demo. Only two topics carry a public reference (title only). */

const ASAM_REF = "The ASAM Criteria, 3rd edition (2013)";

export const ask: AskTopic[] = [
  {
    id: "asam-dimensions",
    q: "What are the six ASAM dimensions?",
    keywords: ["six dimensions", "asam dimensions", "what are the dimensions", "asam"],
    answer: [
      "ASAM describes a person's needs in six dimensions. CCCSN's forms use these names: D1 Acute intoxication / withdrawal potential · D2 Biomedical conditions · D3 Emotional, behavioral or cognitive conditions · D4 Readiness to change · D5 Relapse, continued use or continued problem potential · D6 Recovery / living environment.",
      "Each dimension gets a risk rating from 0 to 4 and a rationale in words. The ratings and the level-of-care recommendation are the clinician's decision. Psyflo restates what was said, quotes the chart, and flags a rating that has no words behind it.",
    ],
    sources: [
      { kind: "reference", label: ASAM_REF, detail: "The public reference for the six-dimension framework and its risk ratings." },
      { kind: "clinic", label: "CCCSN ASAM Assessment form", detail: "Lists D1 to D6 with the clinic's names, a 0 to 4 rating and a rationale box for each." },
    ],
  },
  {
    id: "risk-rating",
    q: "What does a 0 to 4 risk rating need?",
    keywords: ["risk rating", "rating", "0 to 4", "rationale", "contradict"],
    answer: [
      "On CCCSN's form each dimension has a rating from 0 to 4 (0 none, 1 low, 2 moderate, 3 high, 4 severe) and a rationale box.",
      "The clinic's sample standard: every dimension has a rationale in words; a rating of 3 or 4 never has a blank rationale; and the words never contradict the rating, for example \"stable, no concerns\" beside a 3.",
      "The rating is the assessor's judgement. When the words and the rating disagree, Psyflo flags it and leaves the decision with the clinician.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN document rule · ASAM assessment", detail: "A 3 or 4 never has a blank rationale; the words never contradict the rating." },
    ],
    docs: ["assessment"],
  },
  {
    id: "note-needs",
    q: "What does a good progress note need?",
    keywords: ["progress note", "good note", "note need", "what should a note", "write a note"],
    answer: [
      "CCCSN's standard: name the treatment plan goal, say what staff did using an intervention from the plan list, say what the client said or did, give the time and units (H0015: 1 unit = 1 hour), and end with next steps.",
      "Write progress as a count, not a percentage (participated in 2 of 3 exercises). Say what staff did in group, not what staff saw: \"observed\" describes watching, and a reviewer can return the note for it.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN wording rules · progress note", detail: "Name the plan goal; say what staff did, not what staff saw; counts, not percentages." },
      { kind: "clinic", label: "Reviewer feedback on a returned note", detail: "\"Name the plan objective and say what you did in group, not what you saw.\" (C. Diaz, LCSW)" },
    ],
    docs: ["dpn"],
  },
  {
    id: "d5-wording",
    q: "How do I word the D5 rationale?",
    keywords: ["d5", "dimension 5", "relapse potential", "abstinent", "word the"],
    answer: [
      "This is decision support, not a draft. The clinic's sample standard for a client who is abstinent inside the program is to say what the structure is holding up.",
      "State what you can date: abstinent since when, UDS results with dates, what the client did in a high-risk situation, why risk stays high without Level 2.1 (for example the living situation), and which step-down criteria are not met yet.",
      "Avoid \"doing well\" or \"abstinent\" on its own. In the clinic's experience plans have denied continued stay as \"abstinent, no longer meets medical necessity\" when D5 stopped at the abstinence.",
      "Psyflo will not write the rationale. It can quote chart facts you choose and put your own words into a fixed sentence.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN wording rules · D5", detail: "For a client abstinent in treatment, say what the Level 2.1 structure is holding up." },
      { kind: "reference", label: ASAM_REF, detail: "Dimension 5 is about relapse, continued use or continued problem potential." },
    ],
    docs: ["assessment", "sra"],
  },
  {
    id: "continued-stay-needs",
    q: "What does a continued-stay request need?",
    keywords: ["continued stay", "continued-stay", "reauthorization", "what does the request need"],
    answer: [
      "CCCSN's sample checklist for a continued-stay request, by ASAM dimension: attendance with dates; UDS results with dates; what changed in each dimension since admission; D5, why Level 2.1 is still needed; step-down readiness, meaning which criteria are not met yet; care coordination and barriers.",
      "Level 2.1 cannot be backdated, so the request goes in before the units run out.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN document rule · continued stay request (sample)", detail: "Attendance, UDS, change by dimension, D5, step-down readiness, coordination, barriers." },
    ],
    docs: ["sra"],
  },
  {
    id: "sessions-left",
    q: "How many IOP days are left on the authorization?",
    keywords: ["units left", "days left", "sessions left", "how many days", "how many sessions", "left on"],
    answer: [
      "{ini} has 9 units left on the Anthem authorization: 36 authorized (Oct 9 to Nov 13, 2026), 27 used as of Oct 29.",
      "At 3 units an IOP day (3 hours, 1 unit = 1 hour) that is 3 IOP days, so the units run out before the authorization ends.",
      "Level 2.1 cannot be backdated: a day after the units run out is unbillable until the plan decides. Whether to send the request now is your call.",
    ],
    sources: [
      { kind: "chart", label: "Authorization · Anthem Level 2.1", detail: "36 units, Oct 9 – Nov 13, 2026; 27 used as of Oct 29; 9 left.", chart: "auth" },
    ],
    docs: ["sra"],
  },
  {
    id: "uds-facts",
    q: "What do the UDS results say?",
    keywords: ["uds results", "uds", "urine", "drug screen", "screens"],
    answer: [
      "From the chart (Oct 29): {ini} has been abstinent since Sep 24, and 8 of 8 UDS have been negative since then. By period the share of negative UDS was 40%, 83% and 100%.",
      "Quote these with their dates. The chart gives the count, not the date of each screen, so check Lauris before you write dates into the request.",
    ],
    sources: [
      { kind: "chart", label: "UDS results · since Sep 24", detail: "8 of 8 UDS negative since Sep 24; 40%, 83%, 100% by period.", chart: "uds" },
    ],
    docs: ["sra"],
  },
  {
    id: "five-session",
    q: "What is the five-session renewal?",
    keywords: ["five session", "five-session", "5 session", "molina", "five sessions", "renewal"],
    answer: [
      "In the clinic's words (sample): some plans, Molina in the clinic's experience, authorize Level 2.1 five sessions (15 units) at a time instead of the full request.",
      "IOP runs about 3 days a week, so five sessions last under two weeks. The next request goes in after session 3 so it is decided before session 5.",
      "This is the clinic's working note, not the plan's policy. Confirm the current rule with the plan.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN payer note · Molina (sample)", detail: "Five sessions at a time; the next request after session 3." },
    ],
    docs: ["sra"],
  },
  {
    id: "referral-facts",
    q: "What did the drug court referral say?",
    keywords: ["referral", "drug court", "court", "what did the referral"],
    answer: [
      "The referral (received Oct 13 from the Clark County drug court, case manager R. Bell) lists three missed check-ins and four positive drug screens since September.",
      "It also lists a Level 1 outpatient episode at another agency (Jan–Apr 2026, nine sessions, stopped attending), two detox admissions (Feb 2025, Aug 2026) and buprenorphine from an outside prescriber since Aug 2026. A Part 2 consent to drug court was signed Oct 13.",
      "Ask {ini} about each of these rather than copying them. The referral is a source, not an answer.",
    ],
    sources: [
      { kind: "chart", label: "Drug court referral · REF-118", detail: "Missed check-ins, positive screens, prior treatment, Part 2 consent.", chart: "referral" },
    ],
    docs: ["admission", "assessment"],
  },
  {
    id: "silversummit-uds",
    q: "What does SilverSummit need for a Level 2.1 request?",
    keywords: ["silversummit", "silver summit"],
    answer: [
      "In the clinic's words (sample): SilverSummit has been denying Level 2.1 initial requests that arrive without the urine drug screen result from the assessment. It is not on the plan's form, and the plan does not pay for the test.",
      "Record the assessment-day UDS (date and result) in the assessment and attach it to the request. Fax receipts have gone missing, so the clinic calls on day 2.",
    ],
    sources: [
      { kind: "clinic", label: "CCCSN payer note · SilverSummit (sample)", detail: "UDS result from the assessment day attached to a Level 2.1 initial request." },
    ],
    docs: ["admission", "assessment", "sra"],
  },
  {
    id: "last-notes",
    q: "What did the last notes say?",
    keywords: ["last note", "last notes", "recent notes", "what did the notes", "notes say"],
    answer: [
      "Individual session, Oct 29: week 9 of IOP, five weeks abstinent, still living in the shared apartment, sober-housing waitlist call made Oct 27; worried about the Nov 13 authorization end.",
      "Drug court contact, Oct 29: all check-ins kept in October, no sanctions since September; the judge moved {ini} to phase 2 on Oct 22; next status hearing Nov 12.",
      "Group note, Oct 27: addresses Goal 3 (D6 recovery environment) with the waitlist call.",
    ],
    sources: [
      { kind: "chart", label: "Individual session · Oct 29", detail: "Week 9 of IOP; five weeks abstinent; housing unchanged.", chart: "ind" },
      { kind: "chart", label: "Drug court contact · Oct 29", detail: "Check-ins kept; phase 2 on Oct 22; hearing Nov 12.", chart: "collat" },
      { kind: "chart", label: "IOP group note · Oct 27", detail: "Goal 3 (D6): sober-housing waitlist call.", chart: "note-1027" },
    ],
    docs: ["sra"],
  },
];
