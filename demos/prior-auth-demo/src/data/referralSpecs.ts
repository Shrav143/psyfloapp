import { DAY, HOUR } from "@/lib/time";
import { KNOWN_ICD } from "./referralLabels";
import type { SourceDef } from "./referralTypes";
import type { ReferralSpec } from "./referralBuild";

const clin = (name: string, credentials: string, n: number) => ({ name, credentials, npi: `19900111${String(n).padStart(2, "0")}` });

/** Invented referrers. None of these is a real organization. */
export const SRC = {
  mercyEd: { key: "mercyEd", name: "Mercy General Hospital ED", kind: "ed", org: "Mercy General Hospital", orgSub: "Emergency Department · Richmond, VA", fax: "(804) 555-0118", clinician: clin("Dr. Amara Osei", "MD, Emergency Medicine", 1) },
  stBrigid: { key: "stBrigid", name: "St. Brigid Medical Center", kind: "hospital", org: "St. Brigid Medical Center", orgSub: "Behavioral Health Liaison · Norfolk, VA", fax: "(757) 555-0142", clinician: clin("Dr. Marcus Hale", "MD, Addiction Medicine", 2) },
  drugCourt: { key: "drugCourt", name: "County Drug Court", kind: "court", org: "County Drug Court", orgSub: "Court Services · Roanoke, VA", fax: "(540) 555-0167", clinician: clin("Renee Castillo", "LCSW, Court clinical liaison", 3) },
  probation: { key: "probation", name: "Eastgate Probation Services", kind: "court", org: "Eastgate Probation Services", orgSub: "Clinical Liaison Unit · Richmond, VA", fax: "(804) 555-0191", clinician: clin("Dale Whitaker", "LPC, Probation clinical liaison", 4) },
  okafor: { key: "okafor", name: "Dr. Okafor, Primary Care", kind: "primary", org: "Okafor Primary Care", orgSub: "Internal Medicine · Richmond, VA", fax: "(804) 555-0133", clinician: clin("Dr. Chidi Okafor", "MD, Internal Medicine", 5) },
  lindqvist: { key: "lindqvist", name: "Dr. Lindqvist, Family Medicine", kind: "primary", org: "Lindqvist Family Medicine", orgSub: "Family Medicine · Alexandria, VA", fax: "(703) 555-0124", clinician: clin("Dr. Ingrid Lindqvist", "DO, Family Medicine", 6) },
  riverbend: { key: "riverbend", name: "Riverbend Community Clinic", kind: "clinic", org: "Riverbend Community Clinic", orgSub: "Behavioral Health · Lynchburg, VA", fax: "(434) 555-0176", clinician: clin("Soo-jin Park", "PMHNP, Psychiatric NP", 7) },
  northfield: { key: "northfield", name: "Northfield Counseling Associates", kind: "clinic", org: "Northfield Counseling Associates", orgSub: "Outpatient Counseling · Roanoke, VA", fax: "(540) 555-0109", clinician: clin("Dr. Helen Brandt", "PhD, Clinical Psychology", 8) },
  crisis: { key: "crisis", name: "Crisis line 988 follow-up", kind: "crisis", org: "988 Crisis Line, Virginia follow-up team", orgSub: "Regional Crisis Center · Richmond, VA", fax: "(804) 555-0100", clinician: clin("Tamika Reed", "LCSW, Crisis follow-up", 9) },
  westlake: { key: "westlake", name: "Westlake High School Counseling", kind: "school", org: "Westlake High School", orgSub: "Student Counseling Office · Chesapeake, VA", fax: "(757) 555-0153", clinician: clin("Dana Whitfield", "LPC, School counselor", 10) },
  selfWeb: { key: "selfWeb", name: "Self-referral (web form)", kind: "self", org: "Self-referral through the web form", orgSub: "Reviewed by Admissions intake", fax: "", clinician: clin("Jamie Ortiz", "LCSW, Admissions intake", 11) },
} satisfies Record<string, SourceDef>;

const ago = (d: number, h = 0, m = 0): number => d * DAY + h * HOUR + m;
export const dx = (...codes: string[]): { code: string; label: string }[] => codes.map((code) => ({ code, label: KNOWN_ICD[code] ?? "As written by the referrer" }));

/** The sixteen referrals on the dashboard, RF-2038 to RF-2053, oldest first. */
export const HAND_SPECS: ReferralSpec[] = [
  {
    id: "RF-2038", ago: ago(9, 4), channel: "eReferral", source: SRC.northfield, initials: "C.B.", age: 31, sex: "F", payer: "lakeshore", last4: "3307", program: "IOP", urgency: "routine",
    status: "admitted", owner: "tb", opened: true, decideAfter: 190, admitAfter: ago(2, 2), coverageRun: true,
    plan: { reason: "Completed six weeks of individual counseling. Two lapses in alcohol use in the last month and a request for more structure. Referred to step up to a three-day intensive outpatient program.", substances: "Alcohol, about six drinks on four days a week. No other substances. Last drink five days ago.", meds: ["Sertraline 100 mg daily"], risk: "No thoughts of self-harm. Stable housing. Employed full time.", dx: dx("F10.20", "F41.1") },
  },
  {
    id: "RF-2039", ago: ago(8, 2), channel: "portal", source: SRC.selfWeb, initials: "G.N.", age: 38, sex: "M", payer: "evergreen", last4: "7710", program: "IOP", urgency: "routine",
    status: "declined", owner: "ml", opened: true, decideAfter: 105, coverageRun: true,
    decline: { reason: "area", note: "Lives about three hours from the program. Emailed the patient two programs near Erie.", courtesy: true },
    plan: { reason: "Seeking intensive outpatient care for opioid use. Lives in Erie, Pennsylvania and cannot travel more than 30 minutes for treatment.", substances: "Prescription opioids, daily for two years. Last use three days ago.", meds: ["None reported"], risk: "No thoughts of self-harm. Stable housing.", dx: dx("F11.20"), phone: "(814) 555-0161", pages: 1 },
  },
  {
    id: "RF-2040", ago: ago(7, 1), channel: "fax", source: SRC.mercyEd, initials: "H.S.", age: 44, sex: "M", payer: "summit", last4: "5588", program: "RES", urgency: "urgent",
    status: "admitted", owner: "jp", opened: true, decideAfter: 80, admitAfter: ago(0, 14), coverageRun: true,
    plan: { reason: "Seen in the emergency department after four days of heavy drinking with tremor and sweating. Withdrawal treated and medically cleared. Has relapsed after two outpatient attempts.", substances: "Alcohol, about a pint of liquor daily for eight years. Last drink two days ago.", meds: ["Thiamine 100 mg daily", "Folic acid 1 mg daily"], risk: "Passive thoughts of death, no plan. Lives alone.", dx: dx("F10.239", "F32.1") },
  },
  {
    id: "RF-2041", ago: ago(4, 5), channel: "fax", source: SRC.probation, initials: "B.F.", age: 27, sex: "F", payer: "cardinal", last4: "2093", program: "RES", urgency: "urgent",
    status: "declined", owner: "tb", opened: true, decideAfter: 120, coverageRun: true,
    decline: { reason: "no_bed", note: "No residential bed until Friday. The probation officer chose another program for the first week.", courtesy: true },
    plan: { reason: "Court-ordered assessment after a second positive screen. The probation officer asks for residential treatment within 72 hours.", substances: "Methamphetamine several times a week for three years. Last use four days ago.", meds: ["None reported"], risk: "No thoughts of self-harm. Housing at risk after an eviction notice.", dx: dx("F15.20") },
  },
  {
    id: "RF-2042", ago: ago(3, 2), channel: "eReferral", source: SRC.okafor, initials: "L.V.", age: 55, sex: "F", payer: "harborview", last4: "9162", program: "PHP", urgency: "routine",
    status: "admitted", owner: "ml", opened: true, decideAfter: 150, admitAfter: ago(1, 3), coverageRun: true,
    plan: { reason: "Daily alcohol use with rising anxiety. A taper at the clinic failed. Needs a structured day program while she keeps her job schedule in the evenings.", substances: "Alcohol, about four glasses of wine daily for five years. Last drink yesterday.", meds: ["Buspirone 10 mg twice daily"], risk: "No thoughts of self-harm. Lives with her husband, who supports treatment.", dx: dx("F10.20", "F41.1") },
  },
  {
    id: "RF-2043", ago: ago(1, 7), channel: "fax", source: SRC.drugCourt, initials: "E.M.", age: 36, sex: "M", payer: "cardinal", last4: "4471", program: "RES", urgency: "routine",
    status: "awaiting_info", owner: "tb", opened: true, infoAskedAgo: ago(1, 5), coverageRun: false,
    infoMessage: "Thank you for referring E.M. Before we can review it please send: the diagnosis with its ICD-10 code, the current medication list and a risk screening. The form asks for ASAM level 3.7. The program delivers 3.5 residential, please confirm that works.",
    notes: [{ by: "tb", ago: ago(1, 3), text: "Called the court coordinator. She will fax the screening tomorrow morning." }],
    plan: { reason: "Participant in drug court. Positive screens for opioids on three visits. The court team asks for residential treatment.", substances: "Fentanyl and heroin, daily. Last use unknown.", meds: [], risk: "", dx: [], asam: "3.7" },
  },
  {
    id: "RF-2044", ago: ago(1, 4), channel: "phone", source: SRC.crisis, initials: "P.T.", age: 41, sex: "F", payer: "evergreen", last4: "6025", program: "RES", urgency: "routine",
    status: "accepted", owner: "jp", opened: true, decideAfter: 120, coverageRun: true,
    overrides: { signature: "Verbal order confirmed by the crisis center supervisor on the call." },
    plan: { reason: "Follow-up after a crisis line call two days ago. Drinking daily since losing her job, low mood, no safe place to stay. Agreed to residential treatment on the call.", substances: "Alcohol, about ten drinks daily for six months. Last drink yesterday.", meds: ["Trazodone 50 mg at night"], risk: "Passive thoughts of death, no plan or intent. Staying with a friend who has asked her to leave.", dx: dx("F10.20", "F33.1"), signed: false, pages: 1 },
  },
  {
    id: "RF-2045", ago: ago(1, 2), channel: "eReferral", source: SRC.northfield, initials: "D.R.", age: 52, sex: "M", payer: "cardinal", last4: "8840", program: "PHP", urgency: "routine",
    status: "in_review", owner: "ml", opened: true, lapsed: true, coverageRun: true,
    notes: [{ by: "ml", ago: ago(0, 6), text: "Called Anthem: coverage ended 9/30. Waiting to hear whether he renewed Medicaid." }],
    plan: { reason: "Recurrent depression with heavy drinking. Stopped working three months ago. Needs a daily structured program and has stable housing.", substances: "Alcohol, about eight drinks daily. Last drink two days ago.", meds: ["Escitalopram 10 mg daily"], risk: "No thoughts of self-harm. Lives with his brother.", dx: dx("F33.1", "F10.20") },
  },
  {
    id: "RF-2046", ago: ago(1, 0), channel: "portal", source: SRC.selfWeb, initials: "T.A.", age: 23, sex: "F", payer: "beacon", last4: "1259", program: "IOP", urgency: "routine",
    status: "declined", owner: "jp", opened: true, decideAfter: 300, coverageRun: true,
    decline: { reason: "withdrew", note: "The patient emailed to say she found a program closer to her school.", courtesy: false },
    plan: { reason: "Seeking evening treatment for cannabis and alcohol use while finishing a degree.", substances: "Cannabis daily, alcohol on weekends. Last use two days ago.", meds: ["None reported"], risk: "No thoughts of self-harm. Lives with roommates.", dx: dx("F12.20"), pages: 1 },
  },
  {
    id: "RF-2047", ago: ago(0, 20), channel: "fax", source: SRC.riverbend, initials: "S.O.", age: 49, sex: "M", payer: "beacon", last4: "5231", program: "PHP", urgency: "urgent",
    status: "awaiting_info", owner: "jp", opened: true, infoAskedAgo: ago(0, 4), coverageRun: true,
    infoMessage: "Thank you for referring S.O. The form arrived without the clinician's signature. Please send a signed copy by fax and we will pick it up right away.",
    plan: { reason: "Moderate depression and alcohol use disorder after a recent job loss. Not safe to be unsupervised during the day and needs a daily program.", substances: "Alcohol, about a fifth of vodka daily. Last drink yesterday.", meds: ["Bupropion 150 mg daily"], risk: "Passive thoughts of death, no plan. His wife is home in the evenings only.", dx: dx("F10.20", "F32.1"), signed: false },
  },
  {
    id: "RF-2048", ago: ago(0, 4, 20), channel: "fax", source: SRC.lindqvist, initials: "A.P.", age: 45, sex: "F", payer: "beacon", last4: "3904", program: "IOP", urgency: "routine",
    status: "in_review", owner: "tb", opened: true, fit: { suggested: "PHP", confidence: 81 },
    plan: { reason: "Daily drinking with two failed attempts at tapering at home. Seen in the clinic last month. Requests an intensive outpatient program.", substances: "Alcohol, about six drinks daily for four years. Last drink this morning.", meds: ["Naltrexone 50 mg daily", "Lisinopril 10 mg daily"], risk: "No thoughts of self-harm. Lives with her partner.", dx: dx("F10.20"), signed: false, orderAt: -ago(40), expiresAt: -ago(10) },
  },
  {
    id: "RF-2049", ago: ago(0, 3, 40), channel: "fax", source: SRC.mercyEd, initials: "R.E.", age: 26, sex: "M", payer: "summit", last4: "7418", program: "WM", urgency: "emergent",
    status: "new", fit: { confidence: 90 },
    plan: { reason: "Presented with opioid withdrawal after three days without fentanyl. Medically stable but in active withdrawal. No safe place to stay tonight.", substances: "Fentanyl, daily for 18 months. Last use six hours ago.", meds: ["Clonidine 0.1 mg, one dose given in the emergency department"], risk: "Passive thoughts of death, no plan. Unstable housing.", dx: dx("F11.23") },
  },
  {
    id: "RF-2050", ago: ago(0, 3, 5), channel: "eReferral", source: SRC.mercyEd, initials: "J.M.", age: 34, sex: "F", payer: "summit", last4: "4821", program: "RES", urgency: "urgent",
    status: "scheduled", owner: "jp", opened: true, decideAfter: 100, intakeIn: ago(2) - 102, coverageRun: true, requestId: "R-1042",
    notes: [{ by: "jp", ago: 75, text: "Authorization R-1042 started. Intake booked for Thursday morning, pending the approval." }],
    plan: { reason: "Alcohol use disorder, severe, with recurrent depression. Seen in the emergency department after a fall while intoxicated. Withdrawal managed in the hospital. Residential treatment requested.", substances: "Alcohol, about a pint of liquor daily for six years. Last drink three days ago.", meds: ["Sertraline 100 mg daily", "Thiamine 100 mg daily"], risk: "Passive thoughts of death, no plan. Lives alone.", dx: dx("F10.20", "F33.1") },
  },
  {
    id: "RF-2051", ago: ago(0, 2, 10), channel: "eReferral", source: SRC.stBrigid, initials: "K.R.", age: 29, sex: "F", payer: "summit", last4: "6672", program: "RES", urgency: "urgent",
    status: "new", fit: { confidence: 88 },
    plan: { reason: "Inpatient stay after a non-fatal opioid overdose nine days ago. Detoxified and started on buprenorphine. Ready for residential treatment and has no safe place to return to.", substances: "Fentanyl, daily for two years. Last use nine days ago.", meds: ["Buprenorphine-naloxone 8 mg daily", "Naloxone nasal spray"], risk: "Non-fatal overdose nine days ago. No thoughts of self-harm now. No safe housing.", dx: dx("F11.20", "F41.1") },
  },
  {
    id: "RF-2052", ago: ago(0, 1, 20), channel: "fax", source: SRC.westlake, initials: "W.H.", age: 16, sex: "M", payer: "beacon", last4: "2290", program: "IOP", urgency: "routine",
    status: "new", fit: { confidence: 62 },
    plan: { reason: "Student referred by the school counselor. Daily cannabis use, falling grades and two suspensions this term. A parent supports treatment.", substances: "Cannabis daily for 14 months. No other substances.", meds: ["None reported"], risk: "No thoughts of self-harm. Lives with both parents.", dx: dx("F12.20"), pages: 1 },
  },
  {
    id: "RF-2053", ago: ago(0, 0, 25), channel: "phone", source: SRC.crisis, initials: "O.D.", age: 33, sex: "M", payer: null, program: "PHP", urgency: "urgent",
    status: "new",
    plan: { reason: "Caller to the 988 line last night after drinking and a fight at home. On the follow-up call this morning he asked for a day program. No insurance details were given.", substances: "Alcohol, daily. Last drink last night.", meds: ["None reported"], risk: "Thoughts of self-harm last night, none today. Staying with a cousin.", dx: [], clinician: { name: "Jules Meyer", credentials: "Crisis counselor (QMHP)", npi: "Not on the call note" }, signed: false, pages: 1 },
  },
];
