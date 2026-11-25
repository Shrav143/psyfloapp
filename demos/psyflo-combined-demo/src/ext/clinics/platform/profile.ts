import { PAYERS } from "@/data/seed";
import type { ClinicProfile } from "../../types";

/* The clinic behind the Psyflo platform demo: residential, partial hospitalization, intensive outpatient and detox programs, two sites, six payers.
   Everything here is sample data. Payer notes point to the platform, where the real rules and workflows live; nothing is quoted from a plan. */
export const profile: ClinicProfile = {
  name: "Psyflo sample treatment center",
  sub: "Residential, PHP, IOP and detox programs · Ohio (sample)",
  short: "Prior auth",
  programs: [
    { name: "Residential 3.5", code: "RES", sites: ["Site A", "Site B"] },
    { name: "PHP", code: "PHP", sites: ["Site A", "Site B"] },
    { name: "IOP", code: "IOP", sites: ["Site A", "Site B"] },
    { name: "Detox", code: "WM", sites: ["Site A", "Site B"] },
  ],
  payers: PAYERS.map((p) => ({ id: p.id, name: p.name, channel: p.reachedBy, criteria: "This plan's rules and workflow are in Payers in the Psyflo platform." })),
  accreditations: ["Not set up in this demo"],
  verbiage: [
    { rule: "Write about the person first: a person with an alcohol use disorder, not an alcoholic.", example: "Patient reported …, not Patient admitted …" },
    { rule: "Name what staff did, and for how long.", example: "Relapse-prevention work, 45 min" },
  ],
  documentRules: [
    { doc: "dpn", rule: "A note names the plan goal, what was done, the minutes, the craving and withdrawal picture and the response." },
    { doc: "admission", rule: "An admission screening records the safety screen, the last use and why this level of care." },
    { doc: "intake", rule: "An intake records prior treatment and what the person's home and supports are." },
    { doc: "assessment", rule: "Every dimension is rated and every high rating has a reason beside it." },
  ],
  retention: { transcripts: "Rolling, 14 days", documents: "Retained when saved" },
  checks: { pauseAt: "severe", onSave: true },
};
