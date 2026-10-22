import { siteOf, type SiteId } from "./sites";
import type { AgentKey } from "./types";

/* EMR Connect seed data: the connected systems, what the agents did there, and the fields still waiting for a mapping.
   A clinical record system belongs to one site; the billing system serves both. A viewer sees only the systems of the sites they may see. */

export type SystemKind = "Clinical record" | "Billing system" | "Practice management" | "Lab results";
export type SystemStatus = "connected" | "attention" | "disconnected";

export interface EmrSystem {
  id: string;
  name: string;
  kind: SystemKind;
  holds: string;
  /** The sites this system serves. A clinical record is one site; the billing system serves both. */
  sites: SiteId[];
  status: SystemStatus;
  /** Demo minutes of the last sync. */
  lastSyncAt: number;
  connectedSince: string;
  contact: string;
  /** Write back the approval number and dates, after a person approves. */
  writeBack: boolean;
  /** Plain words about what needs a look. */
  issue?: string;
  /** The problem it had when it was disconnected. While this is set, Reconnect starts with Fix. */
  fixIssue?: string;
}

/** `sites` are the sites the line is about, so a viewer who cannot see a site never reads its line. */
export interface EmrActivity { id: string; at: number; agent: AgentKey; text: string; sites: SiteId[] }
export interface EmrMapping { id: string; systemId: string; source: string; target: string; by: string }
export interface MapOption { value: string; label: string }
export interface UnmappedField {
  id: string;
  systemId: string;
  /** "Level of care" */
  field: string;
  where: string;
  hint: string;
  question: string;
  options: MapOption[];
}

export const SEED_SYSTEMS: EmrSystem[] = [
  { id: "sys-res", name: "Clinical record · Site A", kind: "Clinical record", holds: "All programs at Site A", sites: ["A"], status: "connected", lastSyncAt: -6, connectedSince: "03/14", contact: "Site administrator, Site A", writeBack: true },
  { id: "sys-out", name: "Clinical record · Site B", kind: "Clinical record", holds: "All programs at Site B", sites: ["B"], status: "connected", lastSyncAt: -11, connectedSince: "03/14", contact: "Site administrator, Site B", writeBack: true },
  { id: "sys-bill", name: "Billing system", kind: "Billing system", holds: "Serves both sites", sites: ["A", "B"], status: "attention", lastSyncAt: -120, connectedSince: "04/02", contact: "Billing lead", writeBack: false, issue: "The read-only sign-in expired 2 hours ago, so remittances are not arriving." },
];

/** Lines that name a case sit at that case's site; the others are placed by hand, so each site's log reads true on its own. */
export const SEED_ACTIVITY: EmrActivity[] = [
  { id: "ea-1", at: -6, agent: "reader", text: "Pulled 8 files for R-1042 and matched the insurance card", sites: [siteOf("R-1042")] },
  { id: "ea-2", at: -21, agent: "reader", text: "Pulled the latest progress notes for 14 active stays", sites: ["A"] },
  { id: "ea-3", at: -60, agent: "verify", text: "Re-checked coverage for 6 members whose plans changed", sites: ["B"] },
  { id: "ea-4", at: -180, agent: "navigator", text: "Wrote back the approval for I-2144, after sign-off", sites: [siteOf("I-2144")] },
  { id: "ea-5", at: -240, agent: "reader", text: "Matched 4 charts to open cases after the morning sync", sites: ["B"] },
  { id: "ea-6", at: -420, agent: "reader", text: "Read the new admission for R-1101 and proposed a case", sites: [siteOf("R-1101")] },
  { id: "ea-7", at: -1500, agent: "verify", text: "Re-checked coverage for 3 members before their reviews", sites: ["B"] },
  { id: "ea-8", at: -1560, agent: "navigator", text: "Wrote back the approval for R-0960, after sign-off", sites: [siteOf("R-0960")] },
];

export const SEED_MAPPINGS: EmrMapping[] = [
  { id: "em-1", systemId: "sys-res", source: "Admit date", target: "Admission date", by: "Reader, 03/14" },
  { id: "em-2", systemId: "sys-res", source: "Primary payer", target: "Payer", by: "Reader, 03/14" },
  { id: "em-3", systemId: "sys-res", source: "Member ID", target: "Member ID (masked)", by: "Reader, 03/14" },
  { id: "em-4", systemId: "sys-res", source: "Progress note", target: "Chart documents", by: "Reader, 03/15" },
  { id: "em-5", systemId: "sys-res", source: "MAR", target: "Medication record", by: "Reader, 03/15" },
  { id: "em-6", systemId: "sys-out", source: "Admit date", target: "Admission date", by: "Reader, 03/14" },
  { id: "em-7", systemId: "sys-out", source: "Primary payer", target: "Payer", by: "Reader, 03/14" },
  { id: "em-8", systemId: "sys-out", source: "Group note", target: "Chart documents", by: "Reader, 03/16" },
  { id: "em-9", systemId: "sys-bill", source: "Claim number", target: "Claim reference", by: "Reader, 04/02" },
  { id: "em-10", systemId: "sys-bill", source: "Remittance date", target: "Payment date", by: "Reader, 04/02" },
];

export const SEED_UNMAPPED: UnmappedField[] = [
  { id: "um-1", systemId: "sys-out", field: "Level of care", where: "the Site B record", hint: "Match to IOP or PHP", question: "The Site B record writes “Level of care” as free text, such as “Day program”. Which level should the agents read it as?", options: [{ value: "IOP", label: "IOP" }, { value: "PHP", label: "PHP" }] },
  { id: "um-2", systemId: "sys-out", field: "Referral source", where: "intake", hint: "Match to a payer field", question: "“Referral source” on intake holds a name and sometimes a plan. Which Psyflo field should it fill?", options: [{ value: "Payer name", label: "Payer name" }, { value: "Plan type", label: "Plan type" }, { value: "Referring provider", label: "Referring provider" }] },
];

/** Each Sync now takes the next result in this list, so the activity log reads differently every time. */
export const SYNC_RESULTS: { agent: AgentKey; text: string; files: number; charts: number }[] = [
  { agent: "reader", text: "Pulled 6 new files for 3 open cases and matched the insurance cards", files: 6, charts: 3 },
  { agent: "reader", text: "Read 2 new admissions and proposed cases in Case Manager", files: 7, charts: 2 },
  { agent: "verify", text: "Re-checked coverage for 4 members after the sync", files: 3, charts: 1 },
  { agent: "reader", text: "Pulled the latest progress notes for 9 active stays", files: 9, charts: 2 },
];

export const SYSTEM_KINDS: { value: SystemKind; holds: string }[] = [
  { value: "Clinical record", holds: "Charts, notes and medications" },
  { value: "Billing system", holds: "Claims and remittances" },
  { value: "Practice management", holds: "Schedules and admissions" },
  { value: "Lab results", holds: "Lab orders and results" },
];

/** What the agents may read, by kind of system. */
export const SYSTEM_READS: Record<SystemKind, string[]> = {
  "Clinical record": ["Assessments", "Progress notes", "Labs", "Medications", "Insurance card"],
  "Billing system": ["Claims", "Remittances", "Payment dates"],
  "Practice management": ["Schedules", "Admissions", "Insurance card"],
  "Lab results": ["Lab orders", "Lab results"],
};

/** The systems that serve a site in `view`: a site's record system and the billing system both sites share. */
export const emrInView = (systems: readonly EmrSystem[], view: readonly SiteId[]): EmrSystem[] => systems.filter((x) => x.sites.some((id) => view.includes(id)));

/** Demo value: how often a connected system is asked for new files. A system that needs attention misses one sync for each interval since its last good one. */
export const SYNC_EVERY_MIN = 60;

/** Demo values for the starting counts, per site. They add up to the 23 charts matched today and 142 files pulled this week that EMR Connect shows for both sites. */
export const BASE_COUNTS: Record<SiteId, { charts: number; files: number }> = { A: { charts: 13, files: 80 }, B: { charts: 10, files: 62 } };
export const BASE_CHARTS = BASE_COUNTS.A.charts + BASE_COUNTS.B.charts;
export const BASE_FILES = BASE_COUNTS.A.files + BASE_COUNTS.B.files;
