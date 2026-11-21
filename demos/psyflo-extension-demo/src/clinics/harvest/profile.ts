import type { ClinicConfig, PayerProfile } from "../../types";

/* Harvest Outreach: therapeutic day treatment (TDT) in schools, Virginia. Medicaid managed care plus fee-for-service.
   Payer "criteria" below are Harvest's OWN sample wording for this demo. They are not a plan's policy and quote none. */

export const payers: PayerProfile[] = [
  { id: "sentara", name: "Sentara Community Plan", channel: "Sfax",
    criteria: "Sample wording by Harvest, not Sentara’s policy: a continued stay shows the count of escalations from the daily notes, what changed in the plan and when, and why less than daily on-site help would not hold." },
  { id: "anthem", name: "Anthem HealthKeepers Plus", channel: "Availity",
    criteria: "Sample wording by Harvest, not Anthem’s policy: the request gives dates and how long incidents last, says what the IEP does not cover, and says why daily on-site help is still needed." },
  { id: "aetna", name: "Aetna Better Health of Virginia", channel: "Sfax",
    criteria: "Sample wording by Harvest, not Aetna’s policy: when units were used quickly, the request says why, in the notes’ own counts, and what was tried at a lower intensity." },
  { id: "humana", name: "Humana Healthy Horizons in Virginia", channel: "Sfax",
    criteria: "Sample wording by Harvest, not Humana’s policy: an initial request shows each criterion with dates, a prior service with its outcome, and a trauma section written by the clinician. A blank trauma box reads as not assessed." },
  { id: "uhc", name: "UnitedHealthcare Community Plan", channel: "UHC portal",
    criteria: "Sample wording by Harvest, not UnitedHealthcare’s policy: the goals in the request match the current plan, each with a count, and any change to a goal has a date." },
  { id: "ffs", name: "Medicaid FFS · Acentra Health", channel: "Sfax",
    criteria: "Sample wording by Harvest, not Acentra’s policy: the state form is complete and signed by a licensed clinician, and the notes section holds contacts and decisions with their dates." },
];

export const profile: ClinicConfig["profile"] = {
  name: "Harvest Outreach",
  sub: "Therapeutic day treatment in schools · Virginia",
  short: "Harvest",
  programs: [
    { name: "TDT – Campbell ES-1", code: "H2016", sites: ["Campbell County · ES-1"], note: "School day." },
    { name: "TDT – Campbell HS-1", code: "H2016", sites: ["Campbell County · HS-1"], note: "School day. One after-school group bills H2016-UG." },
    { name: "TDT – Campbell MS-1", code: "H2016", sites: ["Campbell County · MS-1"], note: "School day." },
    { name: "TDT – Lynchburg MS-2", code: "H2016", sites: ["Lynchburg City · MS-2"], note: "School day." },
    { name: "TDT – Lynchburg ES-3", code: "H2016", sites: ["Lynchburg City · ES-3"], note: "School day." },
  ],
  payers,
  accreditations: [
    "DBHDS license for therapeutic day treatment (to confirm with Harvest)",
    "DMAS provider enrollment for Medicaid and managed care plans (to confirm with Harvest)",
  ],
  verbiage: [
    { rule: "Psyflo says “patient”. Lauris keeps its own labels, such as “consumer”, and Psyflo never rewrites an EHR label.",
      example: "Psyflo: patient response · Lauris: Consumer response (unchanged)" },
    { rule: "“Observed” is not a billable intervention. Say what staff did.",
      example: "Not: Observed the client during math. Instead: Worked with the client during math using a visual timer and prompted re-entry twice." },
    { rule: "Name the ISP objective by its number and use its words.",
      example: "Addresses ISP Objective 1: use a taught coping strategy before leaving the room in 4 of 5 escalations." },
    { rule: "Name interventions from the approved ISP picklist, spelled as Lauris spells them.",
      example: "Clinical 2.1 Movement · QMHP 1.9 Solving peer conflict" },
    { rule: "Show progress with a count from the notes, written “x of y”, not with a percentage or “doing better”.",
      example: "A taught strategy used first in 3 of 5 escalations, up from 1 of 6." },
    { rule: "Give the date of any change to the plan. An undated change cannot be checked against the notes.",
      example: "ISP amendment dated Oct 22, 2026." },
    { rule: "Write the family’s words as they gave them, and keep it generic where they ask. Details are theirs to share.",
      example: "A change in the household earlier this year. Details are not recorded here." },
  ],
  documentRules: [
    { doc: "dpn", rule: "A daily note names the ISP objective, the intervention staff used (from the picklist), the minutes of direct time and how the child responded. It says what staff did, never “observed”, and states what the child still needs." },
    { doc: "admission", rule: "A screening writes the presenting needs with counts from the school record, ticks the risk boxes that apply, and states evidence of trauma and the plan in the family’s words. A blank trauma box reads as not assessed." },
    { doc: "intake", rule: "The CNA names each prior service with its provider, dates and how it ended, carries the school record’s counts, and leaves the diagnosis, the level of care and the signature to the clinician." },
    { doc: "assessment", rule: "Every CANS item is rated by the clinician. Each domain with a 2 or a 3 has a narrative in the family’s or the clinician’s words. Psyflo never suggests or changes a rating." },
    { doc: "sra", rule: "A continued stay request shows progress with the notes’ own counts, says where progress fell short, dates every change to the plan, states family involvement with a count, and gives step-down criteria." },
  ],
  retention: {
    transcripts: "Rolling: deleted 14 days after the note is saved",
    documents: "Retained when saved",
  },
  checks: { pauseAt: "severe", onSave: true },
};
