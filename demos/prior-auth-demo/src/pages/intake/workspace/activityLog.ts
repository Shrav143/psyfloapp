import { AGENTS } from "@/data/agents";
import { moduleById } from "@/data/assess/modules";
import type { InstrumentStatus } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import type { AuditEvent, IntakeRecord, IntakeSectionId } from "@/data/intake/types";
import { stamp } from "@/lib/time";

/* The activity of one intake: who did what, when and why. It merges the audit trail with the configuration history and the care plan history (an
   entry that is in both is shown once), classifies each entry by type, and marks every entry as made by a person or by an agent. Pure. */

export type ActivityKind = "status" | "referral" | "patient" | "config" | "assessment" | "care" | "documents" | "safety";
export const KIND_LABEL: Record<ActivityKind, string> = {
  status: "Status and assignment", referral: "Referral", patient: "Patient and coverage", config: "Configuration", assessment: "Assessments", care: "Care plan and authorization", documents: "Documents", safety: "Safety",
};
export const KINDS = Object.keys(KIND_LABEL) as ActivityKind[];

export interface ActivityEntry {
  id: string;
  at: number;
  /** A staff id, an agent key, "system" or "payer". */
  actor: string;
  who: string;
  what: string;
  /** The reason or detail, when there is one. */
  why?: string;
  kind: ActivityKind;
  /** Made by an agent, as opposed to a person. */
  ai: boolean;
}

const BY_TEXT: [RegExp, ActivityKind][] = [
  [/safety/i, "safety"],
  [/^(Added a document|Generated|Exported|Marked .+ (to attach|not to attach))/i, "documents"],
  [/^(Triage|Assigned|Reassigned|Closed|Reopened|Intake created|Marked high priority|Removed high priority|Urgency|Changed the requested service|Changed the planned start)/i, "status"],
  [/^(Configured the intake|Changed the intake configuration|Added |Removed |Authorized override|Restored )/i, "config"],
];
const BY_SECTION: Record<IntakeSectionId, ActivityKind> = { referral: "referral", profile: "patient", coverage: "patient", assessment: "assessment", cans: "assessment", pathway: "care", review: "care" };

export function kindOf(e: Pick<AuditEvent, "action" | "section">): ActivityKind {
  const hit = BY_TEXT.find(([re]) => re.test(e.action));
  if (hit) return hit[1];
  if (e.section) return BY_SECTION[e.section];
  return /care plan|pathway|handoff|authorization/i.test(e.action) ? "care" : /sign|attest|amend|evidence|assessment|CANS|Level of Need|version/i.test(e.action) ? "assessment" : "status";
}

export function actorLabel(actor: string): string {
  if (actor === "system") return "Psyflo";
  if (actor === "payer") return "Payer";
  const staff = staffOf(actor);
  if (staff) return staff.name;
  return (AGENTS as Record<string, { name: string } | undefined>)[actor]?.name ?? actor;
}
export const isAgentActor = (actor: string): boolean => actor in AGENTS;

/** "Assigned" carries a staff id as its detail; show the person. */
function readable(e: AuditEvent): { what: string; why?: string } {
  if (e.action === "Assigned" && e.detail && staffOf(e.detail)) return { what: `Assigned to ${staffOf(e.detail)?.name}` };
  return { what: e.action, why: e.detail };
}

export function activityOf(r: IntakeRecord): ActivityEntry[] {
  const out: ActivityEntry[] = r.audit.map((e) => {
    const { what, why } = readable(e);
    return { id: e.id, at: e.at, actor: e.actor, who: actorLabel(e.actor), what, why, kind: kindOf(e), ai: !!e.ai || isAgentActor(e.actor) };
  });
  /* An entry the audit trail already has (same minute, same person, same kind) is not shown twice. */
  const seen = new Set(out.map((e) => `${e.at}|${e.actor}|${e.kind}`));
  r.config?.history.forEach((c, i) => {
    if (seen.has(`${c.at}|${c.who}|config`)) return;
    out.push({ id: `cfg-${i}`, at: c.at, actor: c.who, who: actorLabel(c.who), what: c.what, why: c.detail, kind: "config", ai: isAgentActor(c.who) });
  });
  r.carePlan?.history.forEach((c, i) => {
    if (seen.has(`${c.at}|${c.who}|care`)) return;
    out.push({ id: `care-${i}`, at: c.at, actor: c.who, who: actorLabel(c.who), what: c.what, kind: "care", ai: isAgentActor(c.who) });
  });
  /* Newest first; entries at the same minute keep the order they were made in (the later one first). */
  return out.map((e, i) => ({ e, i })).sort((a, b) => b.e.at - a.e.at || b.i - a.i).map((x) => x.e);
}

export interface ActivityFilter { kind: ActivityKind | "all"; actor: string | "all"; by: "all" | "people" | "agents" }
export const NO_FILTER: ActivityFilter = { kind: "all", actor: "all", by: "all" };
export function filterActivity(xs: ActivityEntry[], f: ActivityFilter): ActivityEntry[] {
  return xs.filter((e) => (f.kind === "all" || e.kind === f.kind) && (f.actor === "all" || e.actor === f.actor) && (f.by === "all" || (f.by === "agents" ? e.ai : !e.ai)));
}
/** The people and agents that appear in the activity, for the Person filter. */
export function actorsIn(xs: ActivityEntry[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of xs) if (!seen.has(e.actor)) seen.set(e.actor, e.who);
  return [...seen].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
}

/* ------------------------------------------------------------------ versions */
export interface VersionRow {
  key: string;
  label: string;
  version: number;
  /** The version in use, or an earlier one kept after an amendment. */
  current: boolean;
  state: InstrumentStatus;
  by?: string;
  at?: number;
  supersededAt?: number;
  why?: string;
}

/** Every started assessment with the versions it has: the one in use and the earlier ones, which are kept and never overwritten. */
export function versionsOf(r: IntakeRecord): VersionRow[] {
  const rows: VersionRow[] = [];
  const a = r.assessment;
  if (a.status !== "not_started") {
    const amendments = a.amendments ?? [];
    amendments.forEach((m, i) => rows.push({ key: `assessment-v${i + 1}`, label: "Clinical assessment", version: i + 1, current: false, state: "superseded", by: m.priorSigner, at: m.priorSignedAt, supersededAt: m.at, why: m.reason }));
    rows.push({ key: `assessment-v${amendments.length + 1}`, label: "Clinical assessment", version: amendments.length + 1, current: true, state: a.status, by: a.attestation?.by, at: a.attestation?.at });
  }
  for (const i of Object.values(r.instruments ?? {})) {
    if (i.status === "not_started" && !i.history.length) continue;
    const label = moduleById(i.moduleId).label;
    for (const h of i.history) rows.push({ key: `${i.moduleId}-v${h.version}`, label, version: h.version, current: false, state: "superseded", by: h.signedBy, at: h.signedAt, supersededAt: h.supersededAt, why: h.note });
    rows.push({ key: `${i.moduleId}-v${i.version}`, label, version: i.version, current: true, state: i.status, by: i.signedBy, at: i.signedAt });
  }
  return rows.sort((x, y) => x.label.localeCompare(y.label) || y.version - x.version);
}

/** The plain-text summary a person downloads. */
export function activityText(r: IntakeRecord, xs: ActivityEntry[], versions: VersionRow[], now: number): string {
  const lines = [
    `Activity summary for ${r.id} (${r.initials || "no patient yet"}${r.age !== null ? `, ${r.age}` : ""})`,
    `Prepared ${stamp(now)}. Synthetic demo record. Names appear as initials and age.`,
    "",
    `Entries: ${xs.length}`,
    ...xs.map((e) => `${stamp(e.at)} | ${e.who}${e.ai ? " (AI agent)" : ""} | ${KIND_LABEL[e.kind]} | ${e.what}${e.why ? ` | Why: ${e.why}` : ""}`),
  ];
  if (versions.length) {
    lines.push("", "Versions");
    for (const v of versions) lines.push(`${v.label} v${v.version} | ${v.current ? "In use" : "Superseded"} | ${v.state.replace("_", " ")}${v.by ? ` | ${actorLabel(v.by)}${v.at !== undefined ? ` ${stamp(v.at)}` : ""}` : ""}${v.why ? ` | Why: ${v.why}` : ""}`);
  }
  return lines.join("\n");
}
