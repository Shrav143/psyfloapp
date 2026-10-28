import { moduleCompletion } from "@/data/assess/completion";
import { moduleById, moduleOrder, schemaOf } from "@/data/assess/modules";
import { programById } from "@/data/assess/programs";
import { RULES } from "@/data/assess/rules";
import type { AssessmentPlan, FieldDef, InstrumentInstance, Level, ModuleId, ModuleSchema, PlanSource, SectionDef, Verification } from "@/data/assess/types";
import type { FieldState, IntakeRecord } from "@/data/intake/types";
import { toDate } from "@/lib/time";
import { vaDate } from "@/data/va/policy";

/* Pure helpers for the schema renderer: what the plan says about a module, which fields link to another module, what the level-of-care review pulls
   together, and the small conversions the forms need. No React here, so the logic can be tested on its own. */

export interface ModuleContext {
  label: string;
  level: Level;
  /** False for a module a person added that the plan does not list. */
  planned: boolean;
  sources: PlanSource[];
  status: Verification | null;
  /** Every source takes effect after the policy date. */
  preparation: boolean;
  /** The date a preparation-only module takes effect, as written in its rule (ISO). */
  effectiveFrom?: string;
}

/** What the plan says about one module: its name for this program, its level, and the rows that asked for it. */
export function moduleContext(plan: AssessmentPlan | null, record: IntakeRecord, moduleId: ModuleId): ModuleContext {
  const pm = plan?.modules.find((m) => m.id === moduleId);
  const choice = record.config?.modules.find((c) => c.id === moduleId);
  const def = moduleById(moduleId);
  const from = pm?.preparation ? pm.sources.map((s) => RULES.find((r) => r.id === s.ruleId)?.from).find((d): d is string => !!d) : undefined;
  return {
    label: pm?.label ?? def.label,
    level: pm?.level ?? choice?.level ?? "optional",
    planned: !!pm,
    sources: pm?.sources ?? [],
    status: pm?.status ?? null,
    preparation: !!pm?.preparation,
    effectiveFrom: from,
  };
}

/** "2027-07-01" as "July 1, 2027". */
export const fmtIso = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** Demo minutes as the yyyy-mm-dd a date input uses, and back. */
export const isoOfMinutes = (m: number): string => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const minutesOfIso = (iso: string): number => vaDate(iso);

/* ------------------------------------------------------------------ fields */
export const STAFF_SOURCES: FieldState[] = ["verified", "patient_reported", "needs_confirmation", "not_applicable"];

export const filledOf = (f: FieldDef, inst: InstrumentInstance | undefined): boolean => {
  const v = inst?.fields[f.key];
  return !!v && (v.state === "not_applicable" || v.value.trim().length > 0);
};

/** A multi-select field keeps its choices in one string. */
export const MULTI_SEP = "; ";
export const splitMulti = (v: string): string[] => (v ? v.split(MULTI_SEP).filter(Boolean) : []);

/** A value another module already holds, offered under a field so the same fact is never typed twice. */
export type FieldLink = { kind: "score"; moduleId: ModuleId } | { kind: "field"; moduleId: ModuleId; key: string };
export const FIELD_LINKS: Record<string, FieldLink> = {
  "wd.ciwa.result": { kind: "score", moduleId: "ciwa" },
  "wd.cows.result": { kind: "score", moduleId: "cows" },
  "ra.clearance": { kind: "field", moduleId: "medical-stability", key: "ms.clearance" },
};

/** Fields that only apply in some situations. The rest always show. */
const VISIBLE: Record<string, (r: IntakeRecord) => boolean> = {
  /* The certification-of-need placeholder is for a person under 21 in a psychiatric facility. */
  "ra.con": (r) => (!!r.config && r.config.population !== "adult") || r.config?.programId === "prtf" || (r.age !== null && r.age < 21),
};
export const isVisible = (f: FieldDef, r: IntakeRecord): boolean => VISIBLE[f.key]?.(r) ?? true;

export const sectionFields = (s: SectionDef, r: IntakeRecord): FieldDef[] => s.fields.filter((f) => isVisible(f, r));

/* ------------------------------------------------------------------ the level-of-care review */
export interface LocFinding {
  label: string;
  text: string;
  /** A section of this module, or another module, where the finding lives. */
  sectionId?: string;
  moduleId?: ModuleId;
}
/** The field that best stands for a section in a summary: a findings field, then the first required one, then the first written one. */
const bestField = (filled: FieldDef[]): FieldDef | undefined =>
  filled.find((f) => f.key.endsWith(".findings")) ?? filled.find((f) => f.required && (f.kind === "long" || f.kind === "text")) ?? filled.find((f) => f.kind === "long" || f.kind === "text") ?? filled[0];
const excerpt = (t: string, n = 200): string => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, "")}...` : t);

/** The findings recorded so far: the module's own sections when it has them (the ASAM dimensions), otherwise the other modules of the record. */
export function locFindings(record: IntakeRecord, moduleId: ModuleId, schema: ModuleSchema, inst: InstrumentInstance | undefined): LocFinding[] {
  const own: LocFinding[] = [];
  for (const s of schema.sections) {
    if (s.type === "loc-review") continue;
    const filled = s.fields.filter((f) => inst?.fields[f.key]?.value.trim());
    const pick = bestField(filled);
    if (pick) own.push({ label: s.label, text: excerpt(inst!.fields[pick.key].value), sectionId: s.id });
  }
  if (own.length) return own;
  const out: LocFinding[] = [];
  for (const [id, other] of Object.entries(record.instruments ?? {})) {
    if (id === moduleId) continue;
    const fields = schemaOf(id as ModuleId).sections.flatMap((s) => s.fields);
    const filled = fields.filter((f) => other.fields[f.key]?.value.trim());
    const pick = bestField(filled);
    if (!pick) continue;
    out.push({ label: `${moduleById(id as ModuleId).label}${other.status === "signed" ? " (signed)" : ""}`, text: excerpt(other.fields[pick.key].value), moduleId: id as ModuleId });
  }
  return out.sort((a, b) => moduleOrder(a.moduleId as ModuleId) - moduleOrder(b.moduleId as ModuleId)).slice(0, 8);
}

export interface MissingItem {
  label: string;
  fieldKey?: string;
  /** What a person wrote under "Information still needed". */
  text?: string;
}
/** What is still missing: required fields, what the clinician listed as still needed, and evidence waiting for a decision. */
export function locMissing(moduleId: ModuleId, schema: ModuleSchema, inst: InstrumentInstance | undefined): MissingItem[] {
  const out: MissingItem[] = moduleCompletion(moduleId, inst).missing.map((f) => ({ label: f.label, fieldKey: f.key }));
  for (const s of schema.sections) {
    for (const f of s.fields) {
      const v = inst?.fields[f.key]?.value.trim();
      if (f.key.endsWith(".needed") && v) out.push({ label: `${s.label.replace(/^\d+\.\s*/, "")}: ${f.label.toLowerCase()}`, fieldKey: f.key, text: excerpt(v, 160) });
    }
  }
  const pending = inst?.evidence.filter((e) => e.status === "pending").length ?? 0;
  if (pending) out.push({ label: `${pending} piece${pending === 1 ? "" : "s"} of evidence wait${pending === 1 ? "s" : ""} for a decision` });
  return out;
}

/** The level the referral asked for, as the program's name. */
export function requestedLevel(record: IntakeRecord, inst: InstrumentInstance | undefined): string {
  if (inst?.loc?.requested) return inst.loc.requested;
  return record.config ? programById(record.config.requestedProgramId).label : "Not recorded";
}
