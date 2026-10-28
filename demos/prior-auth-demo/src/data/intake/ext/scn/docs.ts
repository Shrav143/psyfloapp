import { DAY, HOUR } from "@/lib/time";
import type { IntakeDocument } from "../../types";

/* The source documents of the scenarios, all synthetic and simulated imports. Every organization is marked (fictional), phone numbers are 555-01xx and
   member numbers are masked. The wording is chosen so the simulated evidence reader finds real sentences for the modules each plan uses: a document says
   what a referrer would write, and a person decides what it means. */

/* ------------------------------------------------------------------ A: adult CPST, a person leaving a retiring service */
export const A_CSB: IntakeDocument = {
  id: "doc-b2", name: "Community services board discharge summary (06/2024).pdf", kind: "discharge_summary", origin: "uploaded", moduleId: "psych-history", receivedAt: -5 * DAY - 2 * HOUR, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Tidewater Community Services Board (fictional)", sub: "Mental health case management · discharge summary (simulated import)" },
    { kind: "title", text: "Discharge summary: transfer to skill-building services" },
    { kind: "meta", items: [["Client", "R.H."], ["Case management", "03/2022 to 06/2024"], ["Discharged", "06/14/2024"], ["Reason", "Transferred to Mental Health Skill-Building at Psyflo demo clinic, Site B"]] },
    { kind: "h", text: "Course of case management" },
    { kind: "p", id: "b2-course", text: "Mr. H. started case management after his second psychiatric hospitalization in 2023. He was admitted twice that year, both times after he stopped taking his medications, and he has not been admitted since. His history of schizoaffective disorder, bipolar type, is documented in the chart. He kept most of his weekly appointments." },
    { kind: "h", text: "Functioning at discharge" },
    { kind: "list", id: "b2-func", items: ["Lives alone in an apartment in Norfolk and pays his rent on time", "Needs reminders to take his medications and help with budgeting", "Has difficulty with unstructured time and with phone calls to providers", "Works part time at a grocery store", "Sees his sister every Sunday; few other regular contacts"] },
    { kind: "h", text: "Recommendations" },
    { kind: "p", id: "b2-rec", text: "Continue Mental Health Skill-Building three times a week for medication routines, budgeting and community participation. If skill-building is no longer available, request community support with the same goals and a plan for medication reminders." },
    { kind: "sig", id: "b2-sig", text: "M. Ortega, LCSW, case manager (fictional) · (757) 555-0140" },
  ]],
};
export const A_PSYCH: IntakeDocument = {
  id: "doc-b3", name: "Psychiatric evaluation, Bayview Psychiatry (02/2026).pdf", kind: "other", origin: "uploaded", moduleId: "psych-history", receivedAt: -5 * DAY - HOUR, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Bayview Psychiatry (fictional)", sub: "Annual psychiatric evaluation · 02/17/2026 (simulated import)" },
    { kind: "title", text: "Psychiatric evaluation" },
    { kind: "meta", items: [["Patient", "R.H., 40"], ["Evaluator", "Dr. M. Osei, psychiatrist (fictional)"], ["Visit", "02/17/2026"]] },
    { kind: "h", text: "Presenting concerns" },
    { kind: "p", id: "b3-pres", text: "Annual review. Mr. H. reports a steady mood and no voices for over a year. He worries that his symptoms could return if his skill-building services change. He asks for help with budgeting and wants to keep his apartment." },
    { kind: "h", text: "History" },
    { kind: "p", id: "b3-hist", text: "History of schizoaffective disorder, bipolar type, diagnosed in 2019 and documented in the chart. Two psychiatric hospitalizations in 2023, both after he stopped taking his medications. No admissions since. No substance use disorder is documented." },
    { kind: "h", text: "Medications and adherence" },
    { kind: "table", id: "b3-meds", head: ["Medication", "Dose", "Notes"], rows: [["Aripiprazole", "15 mg daily", "Takes it in the morning with a phone reminder"], ["Lamotrigine", "150 mg daily", "No side effects reported"]] },
    { kind: "p", id: "b3-adh", text: "Adherence is good with reminders from his skill-building worker. He reports no missed doses in the last three months." },
    { kind: "h", text: "Mental status observations" },
    { kind: "p", id: "b3-mse", text: "Alert and cooperative; speech clear. Mood described as steady. No hallucinations during the visit. Insight and judgment fair to good." },
    { kind: "h", text: "Plan" },
    { kind: "p", id: "b3-plan", text: "Continue the current medications. Follow up in six months. Recommends that skill-building services continue; if they change, he should have a plan for medication reminders and budgeting help before the change." },
    { kind: "sig", id: "b3-sig", text: "Dr. M. Osei, psychiatrist (fictional)" },
  ]],
};

/* ------------------------------------------------------------------ C: SUD IOP, a step-down from residential */
export const C_DISCHARGE: IntakeDocument = {
  id: "doc-IN-3112-2", name: "Residential discharge summary, Riverside Recovery Center.pdf", kind: "discharge_summary", origin: "referral", moduleId: "sud-history", receivedAt: -1 * DAY - HOUR, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Riverside Recovery Center (fictional)", sub: "Residential substance use treatment · discharge summary (simulated import)" },
    { kind: "title", text: "Discharge summary and step-down recommendation" },
    { kind: "meta", items: [["Patient", "N.G., 28"], ["Admitted", "08/05/2026"], ["Discharged", "10/09/2026"], ["Prescriber", "Dr. K. Mbeki, addiction medicine (fictional)"]] },
    { kind: "h", text: "Reason for admission" },
    { kind: "p", id: "c2-reason", text: "Admitted after eight months of daily opioid use, including fentanyl, and one overdose in June 2026 that was reversed with naloxone. She had tried outpatient care twice and relapsed within weeks each time." },
    { kind: "h", text: "Course of treatment" },
    { kind: "p", id: "c2-course", text: "She started buprenorphine-naloxone on day 3 and has taken it daily since. Cravings were strong in the first month and have been mild since September. She attended groups regularly, completed her relapse prevention plan and has been abstinent from opioids since 08/05/2026." },
    { kind: "table", id: "c2-meds", head: ["Medication", "As written"], rows: [["Buprenorphine-naloxone", "Daily. The current dose is recorded in the prescriber's own chart and is not stated here"], ["Naloxone kit", "Given at discharge"]] },
    { kind: "h", text: "Medical and psychiatric" },
    { kind: "p", id: "c2-med", text: "Hepatitis C antibody positive; follow-up with primary care arranged. No other active medical problems. Last use was on 08/04/2026, the day before admission." },
    { kind: "p", id: "c2-psy", text: "Anxiety and low mood in the first month, improved with groups. No psychiatric hospitalizations. She sees a therapist weekly through the program and has asked to continue." },
    { kind: "h", text: "Recovery environment" },
    { kind: "p", id: "c2-env", text: "She will be living with her mother and younger brother in Richmond. Her mother is supportive and does not use substances. Her former friends still use and she has chosen to avoid them. She works part time at a warehouse and needs a treatment schedule that fits her shifts. She has no car and transportation to treatment is a barrier." },
    { kind: "h", text: "Recommendations" },
    { kind: "list", id: "c2-rec", items: ["Step down to intensive outpatient treatment, three days a week", "Continue buprenorphine through an outpatient prescriber", "Peer recovery support", "Return to part-time work with a flexible schedule"] },
    { kind: "sig", id: "c2-sig", text: "Dr. K. Mbeki, addiction medicine (fictional)" },
  ]],
};
export const C_UDS: IntakeDocument = {
  id: "doc-IN-3112-3", name: "Urine drug screen note, Richmond treatment program lab.pdf", kind: "other", origin: "referral", moduleId: "sud-history", receivedAt: -1 * DAY - HOUR + 5, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Richmond treatment program laboratory (fictional)", sub: "Urine drug screen note (simulated import)" },
    { kind: "meta", items: [["Patient", "N.G., 28"], ["Collected", "10/14/2026"], ["Ordered by", "Outpatient prescriber at the referring program (fictional)"]] },
    { kind: "p", id: "c3-uds", text: "Urine drug screen collected 10/14/2026, five days after discharge: buprenorphine detected, consistent with the prescribed medication. No other opioids detected. No stimulants, benzodiazepines or alcohol metabolites detected." },
    { kind: "p", id: "c3-note", text: "The result is recorded for the clinician's review. It does not by itself decide a level of care." },
  ]],
};

/* ------------------------------------------------------------------ D: SUD residential, after withdrawal management */
export const D_ED: IntakeDocument = {
  id: "doc-IN-3110-2", name: "Emergency department note, Tidewater General.pdf", kind: "other", origin: "referral", moduleId: "medical-stability", receivedAt: -3 * DAY + 30, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Tidewater General Emergency Department (fictional)", sub: "Emergency department note, 10/14/2026 (simulated import)" },
    { kind: "meta", items: [["Patient", "J.B., 36"], ["Arrived", "10/14/2026, by ambulance"], ["Disposition", "Transferred to withdrawal management at Valley Withdrawal Center"]] },
    { kind: "h", text: "Presentation" },
    { kind: "p", id: "d2-pres", text: "Brought in after a fall at home. He reports daily heavy drinking, about eight to ten drinks a day, and his last drink was the morning of 10/14. Tremor and sweating on arrival; no seizure. A head CT was negative." },
    { kind: "h", text: "Medical findings" },
    { kind: "p", id: "d2-med", text: "Hypertension, on lisinopril 10 mg daily and controlled. Liver enzymes were raised on the admission labs. Thiamine given in the department. Observed for six hours and medically evaluated before transfer." },
    { kind: "p", id: "d2-hx", text: "Alcohol use since age 19. He had two outpatient treatment episodes, in 2025 and in the spring of 2026, and relapsed within a month each time. He lost his job in August." },
    { kind: "sig", id: "d2-sig", text: "Emergency physician, Tidewater General (fictional)" },
  ]],
};
export const D_DETOX: IntakeDocument = {
  id: "doc-IN-3110-3", name: "Withdrawal management summary, Valley Withdrawal Center.pdf", kind: "discharge_summary", origin: "referral", moduleId: "withdrawal", receivedAt: -3 * DAY + 60, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Valley Withdrawal Center (fictional)", sub: "Withdrawal management · discharge summary (simulated import)" },
    { kind: "title", text: "Withdrawal management summary and referral for residential care" },
    { kind: "meta", items: [["Patient", "J.B., 36"], ["Admitted", "10/14/2026"], ["Completed", "10/16/2026"], ["Physician", "Dr. L. Okoye, addiction medicine (fictional)"]] },
    { kind: "h", text: "Withdrawal course" },
    { kind: "p", id: "d3-course", text: "Tremor and sweating on days one to three, resolved by 10/16. No seizures and no complications. Monitored by nursing with a symptom-triggered protocol and thiamine. Naltrexone 50 mg daily was started on 10/15." },
    { kind: "h", text: "Why residential care" },
    { kind: "p", id: "d3-why", text: "He lives alone and has no sober supports at home. Two outpatient episodes ended in relapse within a month. A sister checks in weekly. Transportation to outpatient visits is a barrier and he lost his job in August. We recommend a structured, substance-free setting after withdrawal management." },
    { kind: "h", text: "Current medications" },
    { kind: "table", id: "d3-meds", head: ["Medication", "Dose"], rows: [["Lisinopril", "10 mg daily"], ["Thiamine", "100 mg daily"], ["Naltrexone", "50 mg daily from 10/15"]] },
    { kind: "p", id: "d3-psy", text: "Low mood while drinking; no psychiatric hospitalization and no current psychiatric treatment." },
    { kind: "sig", id: "d3-sig", text: "Dr. L. Okoye, addiction medicine (fictional)" },
  ]],
};

/* ------------------------------------------------------------------ E: mental health PHP, a hospital step-down */
export const E_STEPDOWN: IntakeDocument = {
  id: "doc-IN-3115-2", name: "Step-down summary, Shenandoah Health inpatient psychiatry.pdf", kind: "discharge_summary", origin: "referral", moduleId: "psychiatric", receivedAt: -1 * DAY - 2 * HOUR, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Shenandoah Health (fictional)", sub: "Inpatient psychiatry · discharge and step-down summary (simulated import)" },
    { kind: "title", text: "Discharge summary and step-down request" },
    { kind: "meta", items: [["Patient", "H.T., 45"], ["Admitted", "10/02/2026"], ["Discharged", "10/14/2026"], ["Attending", "Dr. A. Lindqvist (fictional)"]] },
    { kind: "h", text: "Reason for admission" },
    { kind: "p", id: "e2-reason", text: "Admitted after three weeks of worsening low mood, poor sleep and low energy, with missed work since early September. She could no longer cook or manage her bills at home. Her outpatient prescriber was concerned about the change and sent her to the emergency department." },
    { kind: "h", text: "Hospital course" },
    { kind: "p", id: "e2-course", text: "Sertraline was increased to 150 mg daily and mirtazapine 15 mg at night was added. Mood and sleep improved since admission, from about two hours to four to five hours a night. She attended unit groups and met the social worker. Symptoms are better than at admission but not resolved." },
    { kind: "p", id: "e2-safety", text: "A safety plan was completed with the patient before discharge. The treating team asks the receiving clinician to repeat the safety review." },
    { kind: "h", text: "Functioning" },
    { kind: "list", id: "e2-func", items: ["Off work since September; family helps with transportation", "Has not been able to cook or manage bills since the stay began", "Needs structure during the day"] },
    { kind: "h", text: "Prior treatment" },
    { kind: "p", id: "e2-prior", text: "She has seen an outpatient prescriber for two years and an outpatient therapist in 2025. Outpatient treatment helped for a time but stopped working as her symptoms worsened. This was her first inpatient stay." },
    { kind: "h", text: "Recommendations" },
    { kind: "list", id: "e2-rec", items: ["Step down to a partial hospitalization program for daily structure and medication monitoring", "If a day program is not available, intensive outpatient care", "Outpatient prescriber follow-up within 7 days", "Return-to-work planning after symptoms improve"] },
    { kind: "sig", id: "e2-sig", text: "Dr. A. Lindqvist, attending psychiatrist (fictional)" },
  ]],
};
