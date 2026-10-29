import type { IntakeSectionId } from "../intake/types";
import type { ModuleId } from "./types";

/* The workspace's navigation. A section of the workspace is what the left column lists; the data sections of the record (IntakeSectionId, used by tasks,
   suggestions and the audit trail) are still where a value lives. `?section=` takes either; the old data-section names map onto the new sections. */

export type WorkspaceSectionId = "overview" | "referral" | "patient" | "clinical" | "instrument" | "signoff" | "care" | "documents" | "activity";
export interface WorkspaceTarget {
  section: WorkspaceSectionId;
  /** For "instrument": the module open. */
  module?: ModuleId;
  /** For "patient": "profile" or "coverage". */
  tab?: string;
}

export const WORKSPACE_LABEL: Record<WorkspaceSectionId, string> = {
  overview: "Overview", referral: "Referral", patient: "Patient & coverage", clinical: "Clinical assessment", instrument: "Assessment instruments",
  signoff: "Review & sign-off", care: "Care planning", documents: "Documents", activity: "Activity",
};
export const WORKSPACE_ORDER: WorkspaceSectionId[] = ["overview", "referral", "patient", "clinical", "instrument", "signoff", "care", "documents", "activity"];

/** The old data sections, as they open in the new workspace. */
export const LEGACY_SECTION: Record<IntakeSectionId, WorkspaceTarget> = {
  referral: { section: "referral" },
  profile: { section: "patient", tab: "profile" },
  coverage: { section: "patient", tab: "coverage" },
  assessment: { section: "clinical" },
  cans: { section: "instrument", module: "cans" },
  pathway: { section: "care" },
  review: { section: "signoff" },
};

/** "overview", "patient", "patient:coverage", "m:asam" (an instrument module), or an old data-section name. Anything else opens the overview. */
export function parseSection(value: string | null | undefined): WorkspaceTarget {
  if (!value) return { section: "overview" };
  if (value.startsWith("m:")) return { section: "instrument", module: value.slice(2) as ModuleId };
  const [head, tab] = value.split(":");
  if ((WORKSPACE_ORDER as string[]).includes(head)) return { section: head as WorkspaceSectionId, ...(tab ? { tab } : {}) };
  const legacy = LEGACY_SECTION[head as IntakeSectionId];
  return legacy ?? { section: "overview" };
}
export function sectionParam(t: WorkspaceTarget): string {
  if (t.section === "instrument") return t.module ? `m:${t.module}` : "instrument";
  return t.tab ? `${t.section}:${t.tab}` : t.section;
}
