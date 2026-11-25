import type { ClinicProfile } from "../../types";

/* Clinic profile. Payer "criteria" are the clinic's own working notes (sample wording), never a plan's published policy. */
export const profile: ClinicProfile = {
  name: "Community Counseling Center of Southern Nevada",
  sub: "Substance use treatment · ASAM Levels 1 and 2.1 · Nevada",
  short: "CCCSN",
  programs: [
    {
      name: "IOP 2.1",
      code: "H0015",
      sites: ["Las Vegas", "Henderson"],
      note: "ASAM Level 2.1 intensive outpatient: 3 hours a day, at least 3 days a week (9 hours or more a week). H0015, 1 unit = 1 hour, so 3 units an IOP day. Assessment H0001.",
    },
    {
      name: "Outpatient 1",
      code: "H0004 / H0005",
      sites: ["Las Vegas", "Henderson"],
      note: "ASAM Level 1 outpatient, about one day a week. H0004 individual (per 15 minutes), H0005 group; mental-health therapy 90832, 90834, 90837. Urine drug screen H0048 / 80305: plans do not pay for it.",
    },
  ],
  payers: [
    {
      id: "ffs",
      name: "Nevada Medicaid FFS · DHCFP",
      channel: "Provider portal",
      criteria: "Sample, in the clinic's words: Level 1 needs no authorization for the first 24 sessions. Level 2.1 needs a request from the assessment day and cannot be backdated.",
    },
    {
      id: "silversummit",
      name: "SilverSummit Healthplan",
      channel: "Fax",
      criteria: "Sample, in the clinic's words: a Level 2.1 initial request goes in with the urine drug screen result from the assessment day attached. It is not on the plan's form. Fax receipts have gone missing, so the clinic calls on day 2.",
    },
    {
      id: "anthem",
      name: "Anthem Blue Cross Blue Shield (Nevada Medicaid)",
      channel: "Availity",
      criteria: "Sample, in the clinic's words: attach the ASAM six-dimension summary up front and answer information requests the same day. A mental-health code denied as a provider-type problem goes to reconsideration in writing.",
    },
    {
      id: "molina",
      name: "Molina Healthcare of Nevada",
      channel: "Fax",
      criteria: "Sample, in the clinic's words: Level 2.1 is authorized five sessions at a time, so the next request goes in after session 3. For a client who is abstinent inside the program, lead with Dimension 5.",
    },
    {
      id: "caresource",
      name: "CareSource Nevada",
      channel: "Fax",
      criteria: "Sample, in the clinic's words: use the plan's own form with the six dimension ratings on page 1. The narrative by dimension follows.",
    },
    {
      id: "hpn",
      name: "Health Plan of Nevada (Medicaid)",
      channel: "Provider portal",
      criteria: "Sample, in the clinic's words: ask for authorization on Level 1 before session 24, and paste the per-dimension text into the portal boxes.",
    },
  ],
  accreditations: [
    "Nevada Medicaid enrollment, Provider Type 17 · Specialty 215 (to confirm with the clinic)",
    "DPBH / SAPTA certification for substance use treatment (to confirm with the clinic)",
    "ASAM level-of-care designations 1 and 2.1 (to confirm with the clinic)",
  ],
  verbiage: [
    { rule: "Say what staff did in group, not what staff saw.", example: "Facilitated relapse prevention skills, not Observed client in group." },
    { rule: "Name the treatment plan goal in every note.", example: "Addresses treatment plan Goal 1 (relapse prevention, D5)." },
    { rule: "Say what the client did or said, not only what staff did.", example: "She used her written craving plan and went to a meeting." },
    { rule: "Write progress as a count, not a percentage.", example: "Participated in 2 of 3 exercises." },
    { rule: "Use the clinic's ASAM dimension names.", example: "D5 Relapse, continued use or continued problem potential." },
    { rule: "For a client who is abstinent in treatment, say what the Level 2.1 structure is holding up.", example: "Abstinent since Sep 24 inside the structure of the program; relapse risk stays high without it." },
    { rule: "Call the person a client. Initials only on anything that leaves the clinic.", example: "M.R., not a full name." },
    { rule: "HIV or hepatitis C status is never written into a request.", example: "Offered at screening; the client may skip it." },
  ],
  documentRules: [
    { doc: "dpn", rule: "A progress note names the plan goal, says what staff did with an intervention from the plan, says what the client said or did, gives the time and units (H0015: 1 unit = 1 hour), and ends with next steps." },
    { doc: "admission", rule: "The admission screening covers what each ASAM dimension needs: withdrawal risk (D1), medications and prescriber (D2), mood and safety (D3), the client's own reason for treatment (D4), prior treatment (D5), and housing, supports and legal status (D6). Optional questions such as HIV or hepatitis C status are offered, never drafted." },
    { doc: "assessment", rule: "Each of the six dimensions has a 0 to 4 risk rating and a rationale in words. A rating of 3 or 4 never has a blank rationale, and the words never contradict the rating. Ratings and the level-of-care recommendation are the clinician's decision." },
    { doc: "sra", rule: "A continued-stay request is organised by dimension: attendance with dates, UDS results with dates, what changed by dimension, why Level 2.1 is still needed (D5), and which step-down criteria are not yet met. Level 2.1 cannot be backdated, so it goes in before the units run out." },
  ],
  retention: {
    transcripts: "Audio is deleted once the draft is made; the text is kept 14 days (sample, to confirm with the clinic)",
    documents: "Lauris is the record. Psyflo keeps an edit log between the draft and the saved version for audit (sample)",
  },
  checks: { pauseAt: "severe", onSave: true },
};
