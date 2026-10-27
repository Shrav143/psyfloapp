import type { ReactNode } from "react";

/* The shared way to bring a record in when there is no live connection, or when a person prefers it: pull from a connected EMR,
   import an export file (CSV with field mapping, or a PDF), or paste a screenshot of the chart. Used wherever an EHR record is needed:
   New Case intake and clinical documentation, Eligibility verify, EMR Connect, a denial letter. */

/** What is being brought in: the fields offered for mapping and what a screenshot is read for. */
export type ImportTarget = "patient" | "insurance" | "documents" | "denial_letter";

export type ImportSource = "emr" | "file" | "screenshot";

export interface ImportedField {
  /** A Psyflo field key. The keys of each target and the form of their values are listed in `IMPORT_FIELDS` (fields.ts):
      patient: initials, dob, age, sex, payerId, planType, memberId, program, diagnosis, startDate;
      insurance: payerId, planType, memberId, groupNumber, effectiveFrom, effectiveTo, subscriber;
      denial_letter: payerId, decisionDate, dateFrom, dateTo, unitsRequested, unitsApproved, reason. */
  key: string;
  label: string;
  /** Ready to store: a payer id ("summit"), a program code ("RES"), an ICD-10 code ("F10.20"), a date as yyyy-mm-dd, a sex as F, M or X, or plain text. */
  value: string;
  /** The same value as a person reads it ("Sentara Community Plan", "10/20/2026"). Shown in the review list; left out, `value` is shown. */
  display?: string;
  /** "check" when the reading is uncertain: the field is shown for a person to confirm. */
  confidence: "high" | "check";
}

export interface ImportedDocument {
  title: string;
  /** yyyy-mm-dd */
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
  /** What the form already holds, by field key, in the same form as `ImportedField.value`. A found value that differs says "replaces …" in the review, so nothing is overwritten silently. */
  current?: Partial<Record<string, string>>;
  /** The EMR chart to offer first in Pull from EMR (an `EMR_CHARTS` id), when the case already came from one. */
  emrChart?: string;
  /** Opens straight on one of the three ways in (a Drawer that is opened for one purpose). */
  initial?: ImportSource;
  /** More buttons for the same row (New Case puts Referrals and Known patient here), after the three ways in. */
  extra?: ReactNode;
}
