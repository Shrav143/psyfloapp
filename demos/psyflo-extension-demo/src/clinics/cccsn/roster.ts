import type { ChartRecord, Consumer } from "../../types";

/* Six adult consumers, initials only. Facts come from the earlier Nevada demo (seed.json, notes); records marked (sample) are generic.
   Chart record ids repeat across consumers on purpose (plan-1, auth, ...), so a rule or an Ask source can name the same id for whoever is open. */

const mr: ChartRecord[] = [
  { id: "plan-1", label: "Treatment plan · Goal 1", date: "2026-09-08", kind: "plan",
    text: "Goal 1 – D5 relapse prevention: Use a written craving plan before acting on cravings in 4 of 5 reported high-risk situations, with negative UDS on weekly screens. Interventions: CBT-RP, RP-G." },
  { id: "plan-2", label: "Treatment plan · Goal 2", date: "2026-09-08", kind: "plan",
    text: "Goal 2 – D3 trauma-related coping: Use a Seeking Safety coping skill when trauma reminders come up, reported in 4 of 5 groups. Interventions: SS." },
  { id: "plan-3", label: "Treatment plan · Goal 3", date: "2026-09-08", kind: "plan",
    text: "Goal 3 – D6 recovery environment: Move out of the shared apartment where others use, into sober housing, by Dec 15. Interventions: PS, FAM." },
  { id: "auth", label: "Authorization · Anthem Level 2.1", date: "2026-10-09", kind: "auth",
    text: "Anthem authorization for Level 2.1 IOP (H0015): 36 units, Oct 9 – Nov 13, 2026. 27 units used as of Oct 29, at 3 units per IOP day. 9 units left." },
  { id: "att", label: "IOP attendance · Aug 31 – Oct 29", date: "2026-10-29", kind: "note",
    text: "24 IOP days attended Aug 31 – Oct 29. Attendance by period: 78%, 92%, 96%." },
  { id: "uds", label: "UDS results · since Sep 24", date: "2026-10-29", kind: "note",
    text: "Abstinent since Sep 24. 8 of 8 UDS negative since Sep 24. Share of UDS negative by period: 40%, 83%, 100%." },
  { id: "dims", label: "ASAM 30-day review · Oct 29", date: "2026-10-29", kind: "assessment",
    text: "D3: PHQ-9 14, 11, 8 and GAD-7 13, 10, 8 across the three review points. D5: days of use in the past 30 (BAM) 18, 4, 0; UDS negative 40%, 83%, 100%. D6: still living in the shared apartment where two people use; sober-housing waitlist call made Oct 27." },
  { id: "note-1027", label: "IOP group note · Oct 27", date: "2026-10-27", kind: "note",
    text: "IOP group, 9:00 am – 12:00 pm, 3 units (H0015). Addresses Goal 3 (D6 recovery environment): sober-housing waitlist call made Oct 27." },
  { id: "ind", label: "Individual session · Oct 29", date: "2026-10-29", kind: "note",
    text: "Individual session, 50 minutes, in person. Week 9 of IOP. Five weeks abstinent (8 of 8 UDS negative since Sep 24). Still living in the shared apartment where two people use; sober-housing waitlist call made Oct 27. Worried about the Nov 13 authorization end; told the continued-stay request goes out next week. Next individual session Nov 5." },
  { id: "collat", label: "Drug court contact · Oct 29", date: "2026-10-29", kind: "call",
    text: "Phone, 11 minutes, with the drug court case manager (R. Bell); 42 CFR Part 2 release on file. Drug court reports all check-ins kept in October and no sanctions since September. Judge moved M.R. to phase 2 on Oct 22. Next status hearing Nov 12. CCCSN sends attendance and UDS results weekly under the signed release. Treatment plan shared with the case manager Oct 22." },
];

const tw: ChartRecord[] = [
  { id: "referral", label: "Drug court referral · REF-118", date: "2026-10-13", kind: "referral",
    text: "Referral received Oct 13 from the Clark County drug court (case manager R. Bell), for Level 2.1 IOP. Concerns listed: opioid use, alcohol use, missed court check-ins, positive drug screens, housing unstable. Three missed drug court check-ins and four positive drug screens since September. Standard outpatient (Level 1) at another agency Jan–Apr 2026, nine sessions, stopped attending. Two detox admissions (Feb 2025, Aug 2026). Buprenorphine from an outside prescriber since Aug 2026. 42 CFR Part 2 consent to drug court signed Oct 13." },
  { id: "elig", label: "Medicaid eligibility · Oct 15", date: "2026-10-15", kind: "auth",
    text: "Nevada Medicaid eligibility checked Oct 15: active with SilverSummit, effective Jul 1, 2026. No authorization requested yet; Level 2.1 needs one from the assessment day." },
];

const lb: ChartRecord[] = [
  { id: "plan-1", label: "Treatment plan · Goal 1 (sample)", date: "2026-09-10", kind: "plan",
    text: "Goal 1 – D5 relapse prevention: Name 3 personal high-risk situations and use a written coping plan in 4 of 5 reported high-risk situations. Interventions: CBT-RP, RP-G." },
  { id: "plan-2", label: "Treatment plan · Goal 2 (sample)", date: "2026-09-10", kind: "plan",
    text: "Goal 2 – D6 recovery environment: Attend 2 community recovery meetings a week. Interventions: PS." },
  { id: "auth", label: "Authorization · none on file", date: "2026-10-29", kind: "auth",
    text: "No Anthem authorization on file for Level 2.1 IOP (H0015) as of Oct 29, 2026. Per the clinic's note, Level 2.1 needs a request from the assessment day and cannot be backdated." },
];

const dw: ChartRecord[] = [
  { id: "auth", label: "Authorization · Molina Level 2.1", date: "2026-10-27", kind: "auth",
    text: "Molina offered 5 sessions (15 units) on Oct 27 against 72 units requested on Oct 26. Authorized Nov 2 – Nov 13, 2026. 0 units used, 15 units left. The next request goes in after session 3." },
  { id: "uds", label: "UDS results · last 30 days", date: "2026-10-28", kind: "note",
    text: "2 positive UDS in the last 30 days." },
];

const sb: ChartRecord[] = [
  { id: "auth", label: "Authorization · HPN Level 1", date: "2026-10-28", kind: "auth",
    text: "HPN authorization for Level 1 outpatient (H0004 / H0005): 48 units, 36 used as of Oct 29, ends Nov 12, 2026. 12 units left. 14 sessions to date." },
];

const pg: ChartRecord[] = [
  { id: "auth", label: "Authorization · CareSource Level 1", date: "2026-10-28", kind: "auth",
    text: "CareSource authorization for Level 1 outpatient (H0004 / H0005): 24 units, 5 used as of Oct 29, ends Dec 9, 2026. 19 units left." },
];

export const consumers: Consumer[] = [
  { id: "c101", ini: "M.R.", age: 41, program: "IOP 2.1", site: "Las Vegas", payer: "anthem", clinician: "J. Perez",
    note: "Continued stay due · 9 units left", units: { left: 9, ends: "11/13/2026" },
    dx: "F15.20 Stimulant use disorder (methamphetamine), severe · F10.20 Alcohol use disorder, moderate",
    chart: mr, docs: ["dpn-c101", "sra-c101"] },
  { id: "c102", ini: "T.W.", age: 34, program: "IOP 2.1", site: "Las Vegas", payer: "silversummit", clinician: "J. Perez",
    note: "New from drug court · admission today", units: null,
    chart: tw, docs: ["adm-c102", "asam-c102"] },
  { id: "c103", ini: "L.B.", age: 28, program: "IOP 2.1", site: "Las Vegas", payer: "anthem", clinician: "J. Perez",
    note: "No authorization on file", units: null,
    dx: "F10.20 Alcohol use disorder, moderate",
    chart: lb, docs: ["dpn-c103"] },
  { id: "c104", ini: "D.W.", age: 52, program: "IOP 2.1", site: "Las Vegas", payer: "molina", clinician: "J. Perez",
    note: "5 sessions authorized from Nov 2", units: { left: 15, ends: "11/13/2026" },
    dx: "F10.20 Alcohol use disorder, severe · F14.10 Cocaine use disorder, mild",
    chart: dw, docs: [] },
  { id: "c105", ini: "S.B.", age: 45, program: "Outpatient 1", site: "Las Vegas", payer: "hpn", clinician: "J. Perez",
    note: "Level 1 · 12 units left", units: { left: 12, ends: "11/12/2026" },
    dx: "F11.20 Opioid use disorder, moderate · F32.1 Major depressive disorder, moderate",
    chart: sb, docs: [] },
  { id: "c106", ini: "P.G.", age: 58, program: "Outpatient 1", site: "Las Vegas", payer: "caresource", clinician: "J. Perez",
    note: "Level 1 · 19 units left", units: { left: 19, ends: "12/09/2026" },
    dx: "F12.20 Cannabis use disorder, moderate · F41.1 Generalized anxiety disorder",
    chart: pg, docs: [] },
];

/** The first words of a treatment plan record, up to the colon: the goal's label, as a note names it. */
export const goalLabel = (consumerId: string, recordId: string): string => {
  const r = consumers.find((c) => c.id === consumerId)?.chart.find((x) => x.id === recordId);
  if (!r) throw new Error(`No chart record ${recordId} for ${consumerId}`);
  return r.text.split(":")[0].trim();
};
