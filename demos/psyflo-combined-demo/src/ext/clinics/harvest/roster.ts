import type { ChartRecord, Consumer } from "../../types";

/* The Harvest Outreach roster as Lauris lists it (initials only; sample data). Chart records are the stored words a fix may quote:
   every sentence a "text" fix types is a verbatim part of one of these records. Facts come from the earlier Harvest rounds
   (daily notes, ISP 2.0, school records, authorizations); nothing here is a real person or a real record. */

/* ------------------------------ M.R. (4471) ------------------------------ */
const mr: ChartRecord[] = [
  { id: "isp-g1", label: "ISP 2.0 · Goal 1", date: "2026-08-11", kind: "plan",
    text: "Goal 1 · emotional regulation (5 days a week). Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations. Interventions: Clinical 2.1 Movement; QMHP 1.6 Recognize danger / healthy boundaries; QMHP 1.9 Solving peer conflict." },
  { id: "isp-g2", label: "ISP 2.0 · Goal 2", date: "2026-08-11", kind: "plan",
    text: "Goal 2 · peer conflict (5 days a week). Obj. 2 – wait for a turn without grabbing or shoving in 4 of 5 group activities." },
  { id: "isp-g3", label: "ISP 2.0 · Goal 3", date: "2026-08-11", kind: "plan",
    text: "Goal 3 · staying on task (5 days a week). Obj. 3 – stay on task for 20 of 30 minutes in structured lessons on 4 of 5 school days." },
  { id: "isp-review", label: "ISP review Aug 11", date: "2026-08-11", kind: "plan",
    text: "Last dated review of the Individual Service Plan in Lauris. No discharge or step-down criteria are written in the plan." },
  { id: "isp-oct22", label: "ISP Oct 22", date: "2026-10-22", kind: "plan",
    text: "Lunch and transitions now carry a named staff member and a pre-set regulation break; the safety plan was reviewed with the guardian. The ISP in Lauris has no dated amendment for this change after the Aug 11 review." },
  { id: "note-sep15", label: "Daily note Sep 15", date: "2026-09-15", kind: "note",
    text: "K. Hale · Worked with M.R. during morning group using QMHP 1.2 Coping skills practice to help him wait for his turn. When a peer took his turn he raised his voice; staff prompted him to use his calm-down card and he waited for the next turn (about 3 minutes, mild). Addresses ISP Objective 1. Today: 2 escalations, strategy used after a prompt in 1 of 2." },
  { id: "note-oct6", label: "Daily note Oct 6", date: "2026-10-06", kind: "note",
    text: "K. Hale · Eloped from the building to the parking lot; 1 day of in-school suspension followed. Guardian reached the same day. Today: 1 escalation (elopement)." },
  { id: "note-oct14", label: "Daily note Oct 14", date: "2026-10-14", kind: "note",
    text: "R. Diaz · Observed the client during math; he stayed on task 15 of 30 min." },
  { id: "note-oct21", label: "Daily note Oct 21", date: "2026-10-21", kind: "note",
    text: "K. Hale · Physical aggression toward a peer at lunch (shoved); CPI-informed de-escalation, 20 min; processed with the client using zones of regulation. Safety plan reviewed. 3 units. Today: 1 escalation (shove at lunch)." },
  { id: "note-oct27", label: "Daily note Oct 27", date: "2026-10-27", kind: "note",
    text: "K. Hale · Worked with M.R. using Clinical 2.1 Movement before the reading block to help him settle. He became frustrated with a worksheet and went to the calm-down corner on his own (about 4 minutes, mild), then returned to the reading group. Addresses ISP Objective 1: use a taught coping strategy before leaving the room in 4 of 5 escalations. Today: 1 escalation, strategy used on his own (1 of 1)." },
  { id: "notes-30d", label: "Daily notes, last 30 days (21)", date: "2026-10-28", kind: "note",
    text: "Taught strategy used first in 3 of 5 escalations in the last 30 days, up from 1 of 6 in the prior period. Two escalations ended in physical aggression or elopement: a shove at lunch on Oct 21 and an elopement from the building to the parking lot on Oct 6, followed by 1 day of in-school suspension. Staff presence was needed to return to task every school day." },
  { id: "collateral-oct1", label: "Monthly collateral Oct 1", date: "2026-10-01", kind: "call",
    text: "K. Hale · School counselor: 4 office referrals in September; IEP review set for Nov 4. Pediatrician: no medication change. Earlier contacts Aug 29 and Sep 3." },
  { id: "guardian-weekly", label: "Weekly guardian contacts", date: "2026-10-28", kind: "call",
    text: "The grandmother (guardian) joined 11 of 12 weekly calls since Aug 18 and practices the calm-down corner at home." },
  { id: "guardian-oct16", label: "Weekly guardian contact Oct 16", date: "2026-10-16", kind: "call",
    text: "K. Hale · Reviewed home use of the calm-down corner. The guardian reported a change in the household; it is held back from the request until a clinician decides." },
  { id: "auth", label: "SRA AUTH-4471-B", date: "2026-08-18", kind: "auth",
    text: "Anthem HealthKeepers Plus · TDT school day (H2016) · Aug 18 – Nov 13 · 110 units authorized · 27 units available on Oct 29." },
  { id: "hours-log", label: "Direct-hours log", date: "2026-10-28", kind: "auth",
    text: "Average 14.6 units a week since Aug 18. Oct 28: 5 h 20 of direct time (3 units)." },
  { id: "cna-dx", label: "CNA · diagnosis", date: "2026-09-29", kind: "assessment",
    text: "F90.2 Attention-deficit/hyperactivity disorder, combined type. Trauma history noted by the clinical team. No medications; the pediatrician reviewed on Oct 1 with no change." },
];

/* ------------------------------ D.W. (4458) ------------------------------ */
const dw: ChartRecord[] = [
  { id: "isp-g1", label: "ISP 2.0 · Goal 1", date: "2026-09-24", kind: "plan",
    text: "Goal 1 · emotional regulation (5 days a week). Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations. Interventions: Clinical 2.1 Movement; QMHP 1.3 Psychoeducation." },
  { id: "isp-g2", label: "ISP 2.0 · Goal 2", date: "2026-09-24", kind: "plan",
    text: "Goal 2 · peer conflict (5 days a week). Obj. 2 – respond to peer conflict without physical contact in 4 of 5 incidents." },
  { id: "isp-g3", label: "ISP 2.0 · Goal 3", date: "2026-09-24", kind: "plan",
    text: "Goal 3 · staying in class (5 days a week). Obj. 3 – stay in class for the full period on 4 of 5 school days." },
  { id: "isp-sep24", label: "ISP change Sep 24", date: "2026-09-24", kind: "plan",
    text: "A named staff member joins lunch twice a week and a check-in at the door each morning." },
  { id: "guardian-weekly", label: "Weekly guardian contacts", date: "2026-10-23", kind: "call",
    text: "D.W.'s mother joined 9 of 12 weekly calls; practiced the calm-down plan at home. Continuing need: consistent morning routine." },
  { id: "auth", label: "SRA AUTH-4458-C", date: "2026-08-18", kind: "auth",
    text: "Sentara Community Plan · TDT school day (H2016) · Aug 18 – Nov 6 · 90 units authorized · 18 units available on Oct 29." },
  { id: "decision-oct27", label: "Sentara call Oct 27", date: "2026-10-27", kind: "auth",
    text: "Sentara Community Plan called Oct 27: 120 of 150 units offered for the next period. Reply by Oct 30." },
];

/* ------------------------------ T.W. (4492) ------------------------------ */
const tw: ChartRecord[] = [
  { id: "ref-oct13", label: "School referral Oct 13", date: "2026-10-13", kind: "referral",
    text: "Referral from the Lynchburg City MS-2 school counselor, Oct 13, for physical aggression toward peers that is interfering with learning. In the 30 days before the referral the school documented 6 dated incidents of physical aggression toward peers, 2 to 3 times a week, lasting 5 to 20 minutes, at moderate intensity, with 2 office referrals." },
  { id: "incident-oct6", label: "School incident Oct 6", date: "2026-10-06", kind: "school",
    text: "T.W. left the building and went to the parking lot (about 20 minutes, high intensity). 1 day of in-school suspension followed." },
  { id: "school-oct15", label: "School record Oct 15", date: "2026-10-15", kind: "school",
    text: "Classes taking: 7. Classes passing: 4 (school record, Oct 15). Unexcused absences this school year: 9. In-school suspension: 1 day (Oct 6); out-of-school suspension: 0 days. 2 office referrals this term. No expulsions." },
  { id: "counselor-oct15", label: "School counselor report Oct 15", date: "2026-10-15", kind: "school",
    text: "Behavior interventionist 2 times a week since Sep 2026: no reduction in incidents. The school has raised alternative placement twice this school year, last on Oct 15." },
  { id: "call-oct14", label: "Referral contact Oct 14", date: "2026-10-14", kind: "call",
    text: "Phone contact with the grandmother (legal guardian) after the referral. She confirmed the time for the screening and said she would join. On leaving the building she said: “He doesn’t see what could happen out there.” On outpatient counseling at Piedmont Counseling, March to June 2025, 6 visits, she said: “We lost our ride and it stopped. It had not changed anything.”" },
];

const auth = (label: string, date: string, text: string): ChartRecord[] => [{ id: "auth", label, date, kind: "auth", text }];

export const consumers: Consumer[] = [
  { id: "4492", ini: "T.W.", age: 12, program: "TDT – Lynchburg MS-2", site: "Lynchburg City · MS-2", payer: "humana", clinician: "J. Perez",
    note: "New consumer. Referral 10/13. Admission screening, intake and CANS are open today.",
    units: null, dx: "F91.3 · Oppositional defiant disorder", chart: tw, docs: ["adm-4492", "intake-4492", "cans-4492"] },
  { id: "4471", ini: "M.R.", age: 7, program: "TDT – Campbell ES-1", site: "Campbell County · ES-1", payer: "anthem", clinician: "J. Perez",
    note: "Daily note open for today. Continued stay request in draft; 27 units left.",
    units: { left: 27, ends: "11/13/2026" }, dx: "F90.2 · Attention-deficit/hyperactivity disorder, combined type", chart: mr, docs: ["dpn-4471", "sra-4471"] },
  { id: "4466", ini: "K.T.", age: 9, program: "TDT – Lynchburg MS-2", site: "Lynchburg City · MS-2", payer: "anthem", clinician: "J. Perez",
    note: "Initial SRA sent; the payer asked for more information.", units: null, dx: "F91.9 · Conduct disorder, unspecified", chart: [], docs: [] },
  { id: "4458", ini: "D.W.", age: 14, program: "TDT – Campbell HS-1", site: "Campbell County · HS-1", payer: "sentara", clinician: "J. Perez",
    note: "Oct 27 note saved by R. Diaz, not scanned. Sentara offered 120 of 150 units.",
    units: { left: 18, ends: "11/06/2026" }, dx: "F34.81 · Disruptive mood dysregulation disorder", chart: dw, docs: ["dpn-4458"] },
  { id: "4455", ini: "A.L.", age: 6, program: "TDT – Lynchburg ES-3", site: "Lynchburg City · ES-3", payer: "humana", clinician: "J. Perez",
    note: "Initial SRA faxed 10/19; decision overdue.", units: null, dx: "F43.24 · Adjustment disorder with disturbance of conduct", chart: [], docs: [] },
  { id: "4449", ini: "J.O.", age: 14, program: "TDT – Lynchburg MS-2", site: "Lynchburg City · MS-2", payer: "aetna", clinician: "J. Perez",
    note: "SRA used up in 7 weeks; new initial under review.", units: null, dx: "F91.1 · Conduct disorder, childhood-onset type", chart: [], docs: [] },
  { id: "4441", ini: "T.N.", age: 8, program: "TDT – Campbell ES-1", site: "Campbell County · ES-1", payer: "sentara", clinician: "J. Perez",
    note: "Peer-to-peer booked for Dec 9.", units: { left: 9, ends: "11/20/2026" }, dx: "F91.3 · Oppositional defiant disorder",
    chart: auth("SRA AUTH-4441-A", "2026-10-05", "Sentara Community Plan · TDT school day (H2016) · Oct 5 – Nov 20 · 65 units authorized · 9 units available on Oct 29."), docs: [] },
  { id: "4437", ini: "E.C.", age: 5, program: "TDT – Lynchburg ES-3", site: "Lynchburg City · ES-3", payer: "anthem", clinician: "J. Perez",
    note: "Initial SRA denied 10/22.", units: null, dx: "F43.10 · Post-traumatic stress disorder, unspecified", chart: [], docs: [] },
  { id: "4430", ini: "S.B.", age: 11, program: "TDT – Campbell MS-1", site: "Campbell County · MS-1", payer: "uhc", clinician: "J. Perez",
    note: "14 units left; the next concurrent SRA is due.", units: { left: 14, ends: "11/05/2026" }, dx: "F41.1 · Generalized anxiety disorder",
    chart: auth("SRA AUTH-4430-D", "2026-08-10", "UnitedHealthcare Community Plan · TDT school day (H2016) · Aug 10 – Nov 5 · 80 units authorized (150 requested) · 14 units available on Oct 29."), docs: [] },
  { id: "4426", ini: "L.V.", age: 16, program: "TDT – Campbell HS-1", site: "Campbell County · HS-1", payer: "humana", clinician: "S. Ortiz",
    note: "After-school group (H2016-UG). Renewal due Dec 8.", units: { left: 38, ends: "12/08/2026" }, dx: "F43.23 · Adjustment disorder with mixed anxiety and depressed mood",
    chart: auth("SRA AUTH-4426-A", "2026-09-08", "Humana Healthy Horizons in Virginia · TDT after school (H2016-UG) · Sep 8 – Dec 8 · 60 units authorized · 38 units available on Oct 29."), docs: [] },
  { id: "4419", ini: "P.G.", age: 10, program: "TDT – Lynchburg MS-2", site: "Lynchburg City · MS-2", payer: "aetna", clinician: "S. Ortiz",
    note: "Outpatient services; 19 sessions left.", units: { left: 19, ends: "12/15/2026" },
    chart: auth("SRA AUTH-4419-A", "2026-08-17", "Aetna Better Health of Virginia · Outpatient · Aug 17 – Dec 15 · 24 sessions authorized · 19 sessions available on Oct 29."), docs: [] },
];
