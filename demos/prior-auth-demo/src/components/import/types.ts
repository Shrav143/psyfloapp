/* The shared way to bring a record in when there is no live connection, or when a person prefers it: pull from a connected EMR,
   import an export file (CSV with field mapping, or a PDF), or paste a screenshot of the chart. Used wherever an EHR record is needed:
   New Case intake and clinical documentation, Eligibility verify, EMR Connect, a denial letter. */

/** What is being brought in: the fields offered for mapping and what a screenshot is read for. */
export type ImportTarget = "patient" | "insurance" | "documents" | "denial_letter";

export type ImportSource = "emr" | "file" | "screenshot";

export interface ImportedField {
  /** A Psyflo field key, e.g. "initials", "dob", "memberId", "payerId", "planType", "program", "diagnosis", "startDate". */
  key: string;
  label: string;
  value: string;
  /** "check" when the reading is uncertain: the field is shown for a person to confirm. */
  confidence: "high" | "check";
}

export interface ImportedDocument {
  title: string;
  date?: string;
  /** A payer document id when it matches one (e.g. "psych_eval"), so a checklist can tick it. */
  docId?: string;
}

export interface ImportResult {
  source: ImportSource;
  /** "Pulled from Site A's EMR", "From export patients-oct.csv", "From a pasted screenshot". */
  sourceLabel: string;
  fields: ImportedField[];
  documents?: ImportedDocument[];
}

export interface ImportSourcesProps {
  target: ImportTarget;
  /** Called after the person reviews what was found and chooses Apply. Nothing is applied without that click. */
  onImport: (result: ImportResult) => void;
  /** Offer "Pull from EMR" (a system is connected at the site in view). */
  emr?: boolean;
  /** One row of three small buttons instead of the larger choice. */
  compact?: boolean;
  className?: string;
}
