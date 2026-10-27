/* The demo's built-in exports and screenshots, and the simulated reading of a screenshot or a PDF. All invented.
   The reading is deterministic: the same image or file always gives the same fields, and the sample screenshot gives what it shows. */
import { makeDoc, toField, isField } from "./fields";
import type { ImportTarget, ImportedDocument, ImportedField } from "./types";

/* ------------------------------------------------------------------ sample exports */
export const SAMPLE_CSV: Record<ImportTarget, { name: string; text: string }> = {
  patient: {
    name: "patients-export.csv",
    text: [
      "MRN,Patient,DOB,Sex,Primary payer,Plan type,Member ID,Level of care,Primary Dx,Admit date,Last note,Prior dx",
      "A-30418,K.L.,06/14/1989,F,Virginia Medicaid fee-for-service,Fee-for-service,BP4417209358,Intensive outpatient,F11.20 Opioid dependence,10/26/2026,10/16/2026,F41.1",
      "A-30422,R.D.,11/02/1978,M,Anthem HealthKeepers Plus,Medicaid MCO,CH5520318874,Residential 3.5,F10.20 Alcohol dependence,10/21/2026,10/19/2026,F33.2",
      "A-30431,N.P.,04/09/2010,F,Sentara Community Plan,Medicaid MCO,SM7408813302,Partial hospitalization,F33.1 Major depressive disorder,10/22/2026,10/18/2026,F43.10",
    ].join("\n"),
  },
  insurance: {
    name: "coverage-export.csv",
    text: ["Patient,Payer,Plan type,Member ID,Group,Effective,Termination,Subscriber", "K.L.,Virginia Medicaid fee-for-service,Fee-for-service,BP4417209358,GRP-55120,01/01/2026,12/31/2026,Self", "R.D.,Anthem HealthKeepers Plus,Medicaid MCO,CH5520318874,VAMCD-07,07/01/2026,06/30/2027,Self"].join("\n"),
  },
  documents: {
    name: "documents-export.csv",
    text: ["Document,Date,Author", "Psychiatric evaluation,10/18/2026,Attending psychiatrist", "Progress note,10/19/2026,Group therapist", "Medication list,10/19/2026,Nursing", "Treatment plan,10/12/2026,Primary clinician"].join("\n"),
  },
  denial_letter: {
    name: "denials-export.csv",
    text: ["Payer,Letter date,Service from,Service to,Days requested,Days approved,Reason", "Anthem HealthKeepers Plus,10/19/2026,10/13/2026,10/26/2026,14,7,Continued-stay criteria not met after day 7: the record does not show a daily need for 24-hour structure"].join("\n"),
  },
};

/* ------------------------------------------------------------------ simulated readings */
interface Reading {
  fields: [key: string, raw: string, check?: boolean][];
  documents: ImportedDocument[];
}
/** What FLO finds on a screenshot of each kind. The first of each list is what the sample screenshot shows. */
const READINGS: Record<ImportTarget, Reading[]> = {
  patient: [
    {
      fields: [["initials", "K.L."], ["dob", "06/14/1989"], ["sex", "F"], ["payerId", "Virginia Medicaid fee-for-service"], ["planType", "Fee-for-service"], ["memberId", "BP4417209358", true], ["program", "IOP"], ["diagnosis", "F11.20"], ["startDate", "10/26/2026", true]],
      documents: [makeDoc("Progress note", "2026-10-16"), makeDoc("Diagnosis history (F11.20, F41.1)", "2026-10-16")],
    },
    {
      fields: [["initials", "R.D."], ["dob", "11/02/1978", true], ["sex", "M"], ["payerId", "Anthem HealthKeepers Plus"], ["planType", "Medicaid MCO"], ["memberId", "CH5520318874"], ["program", "Residential 3.5"], ["diagnosis", "F10.20"], ["startDate", "10/21/2026"]],
      documents: [makeDoc("Progress note", "2026-10-19")],
    },
    {
      fields: [["initials", "N.P."], ["dob", "04/09/2010"], ["sex", "F", true], ["payerId", "Sentara Community Plan"], ["planType", "Medicaid MCO"], ["memberId", "SM7408813302", true], ["program", "PHP"], ["diagnosis", "F33.1"], ["startDate", "10/22/2026"]],
      documents: [makeDoc("Psychiatric evaluation", "2026-10-18")],
    },
  ],
  insurance: [
    { fields: [["payerId", "Virginia Medicaid fee-for-service"], ["planType", "Fee-for-service"], ["memberId", "BP4417209358", true], ["groupNumber", "GRP-55120"], ["effectiveFrom", "01/01/2026"], ["effectiveTo", "12/31/2026"], ["subscriber", "Self"]], documents: [] },
    { fields: [["payerId", "Anthem HealthKeepers Plus"], ["planType", "Medicaid MCO"], ["memberId", "CH5520318874"], ["groupNumber", "VAMCD-07", true], ["effectiveFrom", "07/01/2026"], ["effectiveTo", "06/30/2027"], ["subscriber", "Self"]], documents: [] },
  ],
  documents: [
    { fields: [], documents: [makeDoc("Progress note", "2026-10-19")] },
    { fields: [], documents: [makeDoc("Psychiatric evaluation", "2026-10-18")] },
    { fields: [], documents: [makeDoc("Medication list", "2026-10-19")] },
  ],
  denial_letter: [
    {
      fields: [["payerId", "Anthem HealthKeepers Plus"], ["decisionDate", "10/19/2026"], ["dateFrom", "10/13/2026"], ["dateTo", "10/26/2026"], ["unitsRequested", "14"], ["unitsApproved", "7", true], ["reason", "Continued-stay criteria not met after day 7: the record does not show a daily need for 24-hour structure."]],
      documents: [makeDoc("Denial letter", "2026-10-19")],
    },
  ],
};

/** A stable number from a file's name and size, so the same file reads the same every time. */
export function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export interface SimulatedRead {
  fields: ImportedField[];
  documents: ImportedDocument[];
}
/** FLO's reading of a screenshot or a PDF. `seed` null is the sample screenshot. */
export function simulatedRead(target: ImportTarget, seed: string | null): SimulatedRead {
  const list = READINGS[target];
  const r = seed === null ? list[0] : list[stableHash(seed) % list.length];
  return { fields: r.fields.map(([k, raw, check]) => toField(target, k, raw, check)).filter(isField), documents: r.documents };
}

/* ------------------------------------------------------------------ the sample screenshots, drawn as small SVGs */
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function card(title: string, rows: [string, string][], foot: string): string {
  const h = 54 + rows.length * 26 + 30;
  const lines = rows
    .map(([k, v], i) => `<text x="20" y="${78 + i * 26}" font-size="12" fill="#5d6572">${esc(k)}</text><text x="150" y="${78 + i * 26}" font-size="13" font-weight="600" fill="#151b24">${esc(v)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="${h}" viewBox="0 0 440 ${h}" font-family="Arial, Helvetica, sans-serif"><rect width="440" height="${h}" fill="#ffffff"/><rect width="440" height="40" fill="#e9eef3"/><circle cx="20" cy="20" r="7" fill="#8aa2b8"/><text x="36" y="25" font-size="13" font-weight="700" fill="#33475b">${esc(title)}</text>${lines}<text x="20" y="${h - 12}" font-size="10" fill="#98a0ac">${esc(foot)}</text></svg>`;
}
const SHOT_SVG: Record<ImportTarget, string> = {
  patient: card("Clinical record · Patient header", [["Patient", "K.L."], ["DOB / Sex", "06/14/1989 · F"], ["Insurance", "Virginia Medicaid fee-for-service"], ["Member ID", "BP4417209358"], ["Program", "IOP · admit 10/26/2026"], ["Primary Dx", "F11.20 Opioid dependence"]], "Invented demo chart. Not a real patient."),
  insurance: card("Coverage · Member card", [["Payer", "Virginia Medicaid fee-for-service"], ["Plan type", "Fee-for-service"], ["Member ID", "BP4417209358"], ["Group", "GRP-55120"], ["Effective", "01/01/2026 to 12/31/2026"], ["Subscriber", "Self"]], "Invented demo card."),
  documents: card("Progress note · 10/19/2026", [["Patient", "K.L."], ["Author", "Group therapist"], ["Session", "Group, 90 min"], ["Focus", "Relapse prevention"], ["Signed", "10/19/2026"]], "Invented demo note."),
  denial_letter: card("Notice of adverse determination", [["Payer", "Anthem HealthKeepers Plus"], ["Letter date", "10/19/2026"], ["Service", "Residential 3.5"], ["Dates", "10/13/2026 to 10/26/2026"], ["Days", "14 requested · 7 approved"], ["Reason", "Continued-stay criteria not met"]], "Invented demo letter."),
};
export const sampleShotUrl = (target: ImportTarget): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SHOT_SVG[target])}`;
