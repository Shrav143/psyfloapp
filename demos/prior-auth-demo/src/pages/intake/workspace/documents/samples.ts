import type { DocBlock } from "@/components/ui/DocumentSheet";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeDocument, IntakeRecord } from "@/data/intake/types";

/* Synthetic documents a person can add to an intake in the demo. Every organization is marked (fictional), people appear by initials, phone numbers use
   555-01xx and member IDs are masked. The demo never reads a dropped file: it records the name and type and says so. */

export interface DocSample {
  id: string;
  label: string;
  kind: IntakeDocument["kind"];
  summary: string;
  module?: ModuleId;
  blocks: (r: IntakeRecord) => DocBlock[];
}
const who = (r: IntakeRecord) => `${r.initials || "Patient"}${r.age !== null ? `, ${r.age}` : ""}`;

export const DOC_SAMPLES: DocSample[] = [
  {
    id: "prior-assessment", label: "Prior assessment summary", kind: "other", module: "clinical-history", summary: "An earlier provider's assessment, summarized",
    blocks: (r) => [
      { kind: "letterhead", org: "Harbor Counseling Associates (fictional)", sub: "Prior assessment summary · synthetic sample" },
      { kind: "meta", items: [["Patient", who(r)], ["Assessed", "03/2025"], ["Clinician", "L. Ortiz, LCSW (fictional)"], ["Service", "Outpatient therapy"]] },
      { kind: "h", text: "Summary" },
      { kind: "p", id: "p1", text: "Seen for 11 sessions. Presented with low mood and school or work avoidance. Engaged well. Discharged when coverage changed." },
      { kind: "list", id: "p2", items: ["No hospitalizations", "No medications at the time", "Strengths: supportive family, steady attendance"] },
    ],
  },
  {
    id: "consent", label: "Signed consent form", kind: "consent", module: "patient-referral", summary: "Consent to treatment and to share information",
    blocks: (r) => [
      { kind: "letterhead", org: "Psyflo demo clinic", sub: "Consent form · synthetic sample" },
      { kind: "title", text: "Consent to treatment and release of information" },
      { kind: "meta", items: [["Patient", who(r)], ["Date", "10/19/2026"]] },
      { kind: "p", id: "c1", text: "I agree to behavioral health services and to the sharing of information named below for treatment and payment." },
      { kind: "list", id: "c2", items: ["Treatment team at this clinic", "The Medicaid plan on file, for payment", "No other recipient"] },
      { kind: "sig", id: "c3", text: "Signed by the patient or guardian (synthetic)" },
    ],
  },
  {
    id: "discharge", label: "Discharge summary", kind: "discharge_summary", module: "clinical-history", summary: "A recent stay, as the discharging unit wrote it",
    blocks: (r) => [
      { kind: "letterhead", org: "Valley Regional Hospital (fictional)", sub: "Discharge summary · synthetic sample" },
      { kind: "meta", items: [["Patient", who(r)], ["Admitted", "10/02/2026"], ["Discharged", "10/09/2026"]] },
      { kind: "p", id: "d1", text: "Stayed for stabilization and medication review. Follow-up with outpatient care within seven days was recommended." },
      { kind: "list", id: "d2", items: ["Medication list attached", "Follow-up appointment requested", "Safety plan reviewed with the family"] },
    ],
  },
  {
    id: "insurance", label: "Insurance card", kind: "insurance_card", module: "insurance", summary: "Front and back of the member card",
    blocks: (r) => [
      { kind: "letterhead", org: "Virginia Medicaid plan card (synthetic)", sub: "Member card · image sample" },
      { kind: "meta", items: [["Member", who(r)], ["Member ID", "•••• 4471"], ["Group", "Not shown"]] },
      { kind: "p", id: "i1", text: "Provider services: (804) 555-0150. Prior authorization: use the plan's provider portal." },
    ],
  },
  {
    id: "treatment-plan", label: "Treatment plan from the sending provider", kind: "other", module: "clinical-notes", summary: "Goals and services in place before this referral",
    blocks: (r) => [
      { kind: "letterhead", org: "Harbor Counseling Associates (fictional)", sub: "Treatment plan · synthetic sample" },
      { kind: "meta", items: [["Patient", who(r)], ["Plan date", "02/2026"]] },
      { kind: "list", id: "t1", items: ["Goal 1: attend school or work four days a week", "Goal 2: practice two coping skills a day", "Goal 3: family session every other week"] },
    ],
  },
];

/** The pages of a document the demo could not read: its name and type only. */
export const unreadPages = (name: string): DocBlock[][] => [[
  { kind: "letterhead", org: "Uploaded file (simulated)", sub: "The demo does not read dropped files" },
  { kind: "meta", items: [["File name", name]] },
  { kind: "p", id: "u1", text: "The file name and type are recorded on the intake. Its content was not read, extracted or stored." },
]];
