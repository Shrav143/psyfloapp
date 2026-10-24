/* Short lookups the intake form uses: a few ICD-10 codes to search and the charts EMR Connect offers to pull. */
import type { Diagnosis } from "@/data/cases";

export const ICD_CODES: Diagnosis[] = [
  { code: "F10.20", label: "Alcohol dependence, uncomplicated" },
  { code: "F10.239", label: "Alcohol dependence with withdrawal, unspecified" },
  { code: "F11.20", label: "Opioid dependence, uncomplicated" },
  { code: "F11.23", label: "Opioid dependence with withdrawal" },
  { code: "F12.20", label: "Cannabis dependence, uncomplicated" },
  { code: "F13.20", label: "Sedative, hypnotic or anxiolytic dependence, uncomplicated" },
  { code: "F14.20", label: "Cocaine dependence, uncomplicated" },
  { code: "F15.20", label: "Other stimulant dependence, uncomplicated" },
  { code: "F33.2", label: "Major depressive disorder, recurrent, severe without psychotic features" },
  { code: "F33.1", label: "Major depressive disorder, recurrent, moderate" },
  { code: "F41.1", label: "Generalized anxiety disorder" },
  { code: "F43.10", label: "Post-traumatic stress disorder, unspecified" },
  { code: "F31.30", label: "Bipolar disorder, current episode depressed, mild or moderate severity, unspecified" },
  { code: "F31.9", label: "Bipolar disorder, unspecified" },
];

/* The charts EMR Connect offers to pull live with the shared import component. */
export { EMR_CHARTS, type EmrChart } from "@/components/import/emrCharts";
