import { vaDate } from "../va/policy";
import { ORG_REVIEWER, RULES, RULES_UPDATED } from "./rules";
import { isCoreModule, moduleById, moduleOrder } from "./modules";
import { programAvailability, programById } from "./programs";
import { purposeById } from "./purposes";
import {
  SETTING_LABEL, VERIFICATION_RANK, type AssessmentPlan, type AssessmentRule, type Level, type ModuleChoice, type ModuleGroup, type ModuleId, type PlanContext, type PlanModule, type PlanSource, type Population, type ProgramAvailability, type ProgramDef, type RuleModule, type Verification,
} from "./types";

/* buildAssessmentPlan: the one function that turns a program, a purpose, a population, a setting, a state, a payer and a date into the list of modules an
   intake needs, each with the rows that asked for it. Pure: the same inputs give the same plan. Rules are data (rules.ts); nothing here names a program. */

const LEVEL_RANK: Level[] = ["required", "recommended", "optional"];
const stronger = (a: Level, b: Level): Level => (LEVEL_RANK.indexOf(a) <= LEVEL_RANK.indexOf(b) ? a : b);
const weakest = (xs: Verification[]): Verification => xs.reduce((w, x) => (VERIFICATION_RANK.indexOf(x) > VERIFICATION_RANK.indexOf(w) ? x : w), "verified" as Verification);
const GROUP_ORDER: ModuleGroup[] = ["core", "sud", "mh", "community", "children", "screening"];

function matches(rule: AssessmentRule, c: PlanContext): boolean {
  if (!rule.states.includes(c.state)) return false;
  if (rule.programs !== "all" && !rule.programs.includes(c.programId)) return false;
  if (rule.payers && (!c.payerId || !rule.payers.includes(c.payerId))) return false;
  if (rule.populations && !rule.populations.includes(c.population)) return false;
  if (rule.settings && !rule.settings.includes(c.setting)) return false;
  if (rule.purposes && !rule.purposes.includes(c.purposeId)) return false;
  if (rule.to && c.policyDate > vaDate(rule.to)) return false;
  return true;
}
const appliesWhen = (m: RuleModule, c: PlanContext): boolean =>
  (!m.when?.populations || m.when.populations.includes(c.population)) && (!m.when?.settings || m.when.settings.includes(c.setting)) && (!m.when?.purposes || m.when.purposes.includes(c.purposeId));

/** What a reader of the plan should know, with what each is about so a screen can put it where it belongs. The plan's `warnings` are these texts. */
export interface PlanNotice {
  kind: "availability" | "population" | "setting" | "payer" | "early" | "program" | "rule" | "epsdt";
  text: string;
}
const POP_WORD: Record<Population, string> = { adult: "adults", adolescent: "adolescents", child: "children" };

function noticesFor(c: PlanContext, program: ProgramDef, availability: ProgramAvailability, rules: AssessmentRule[]): PlanNotice[] {
  const out: PlanNotice[] = [];
  const add = (kind: PlanNotice["kind"], text: string) => {
    if (!out.some((n) => n.text === text)) out.push({ kind, text });
  };
  if (availability.status !== "available") add("availability", availability.note);
  if (program.populations.length && !program.populations.includes(c.population)) add("population", `${program.label} usually serves ${program.populations.map((p) => POP_WORD[p]).join(" and ")}. Confirm the population before going on.`);
  if (c.setting !== program.defaultSetting && !program.settings.includes(c.setting)) add("setting", `${program.label} is not usually delivered in a ${SETTING_LABEL[c.setting].toLowerCase()} setting. Confirm the setting.`);
  /* A demonstration row is not a plan's policy: only a payer-policy row settles the payer's requirement. */
  const payerRows = rules.filter((r) => r.payers);
  if (!payerRows.some((r) => r.source === "payer_policy")) {
    add("payer", !c.payerId
      ? "No plan is selected: the plan below follows state and organization defaults. Select the payer to look for plan-specific rules. Payer requirement not yet verified."
      : payerRows.length
        ? "The only payer row for this plan is a demonstration, not the plan's policy. Payer requirement not yet verified."
        : "No payer-specific assessment rule is configured for this plan: the plan below follows state and organization defaults. Payer requirement not yet verified.");
  }
  const early = rules.filter((r) => r.from && c.policyDate < vaDate(r.from));
  if (early.length) add("early", `Rules for ${program.label} take effect ${early[0].from === "2027-07-01" ? "July 1, 2027" : early[0].from}. They are shown for preparation and do not hold up readiness before then.`);
  if (program.note) add("program", program.note);
  for (const r of rules) if (r.note) add("rule", r.note);
  if (c.population !== "adult") add("epsdt", "People under 21 on Medicaid have a broader medical necessity standard (EPSDT). Configured and not verified.");
  return out;
}

/** The plan's notices with their kinds (the same texts as `plan.warnings`, in the same order). */
export function planNotices(c: PlanContext): PlanNotice[] {
  const program = programById(c.programId);
  return noticesFor(c, program, programAvailability(c.programId, c.state, c.policyDate), RULES.filter((r) => matches(r, c)));
}

export function buildAssessmentPlan(c: PlanContext): AssessmentPlan {
  const program = programById(c.programId);
  const purpose = purposeById(c.purposeId);
  const availability = programAvailability(c.programId, c.state, c.policyDate);
  const rules = RULES.filter((r) => matches(r, c));

  const labels = new Map<ModuleId, string>();
  const levels = new Map<ModuleId, Level>();
  const sources = new Map<ModuleId, PlanSource[]>();
  const add = (rule: AssessmentRule | null, m: RuleModule, over?: Partial<PlanSource>) => {
    if (!appliesWhen(m, c)) return;
    const def = moduleById(m.id);
    if (def.populations && !def.populations.includes(c.population)) return;
    levels.set(m.id, stronger(levels.get(m.id) ?? "optional", m.level));
    if (m.label && (!labels.has(m.id) || m.level === "required")) labels.set(m.id, m.label);
    const src: PlanSource = {
      ruleId: rule?.id ?? `purpose:${c.purposeId}`, ruleLabel: rule?.label ?? purpose.label, source: rule?.source ?? "org_protocol", status: rule?.status ?? "demo",
      level: m.level, reason: m.reason, version: rule?.version ?? "purpose", reviewer: rule?.reviewer ?? ORG_REVIEWER, updated: rule?.updated ?? RULES_UPDATED,
      preparation: !!rule?.from && c.policyDate < vaDate(rule.from), ...over,
    };
    sources.set(m.id, [...(sources.get(m.id) ?? []), src]);
  };
  for (const rule of rules) for (const m of rule.modules) add(rule, m);

  /* the purpose reshapes what the program asked for: it demotes program modules and adds its own */
  const demoteGroups = purpose.demote === "all" ? (["sud", "mh", "community", "children"] as ModuleGroup[]) : purpose.demote;
  if (demoteGroups.length) {
    for (const [id, level] of levels) {
      const def = moduleById(id);
      if (!demoteGroups.includes(def.group) || isCoreModule(id)) continue;
      const to = purpose.demoteTo;
      if (LEVEL_RANK.indexOf(level) < LEVEL_RANK.indexOf(to)) {
        levels.set(id, to);
        sources.set(id, [...(sources.get(id) ?? []).map((s) => ({ ...s, level: to })), { ruleId: `purpose:${c.purposeId}`, ruleLabel: purpose.label, source: "org_protocol", status: "demo", level: to, reason: purpose.demoteReason, version: "purpose", reviewer: ORG_REVIEWER, updated: RULES_UPDATED }]);
      }
    }
  }
  for (const m of purpose.add) {
    add(null, m);
  }

  const modules: PlanModule[] = [...levels.entries()].map(([id, level]) => {
    const def = moduleById(id);
    const srcs = sources.get(id) ?? [];
    return { id, label: labels.get(id) ?? def.label, kind: def.kind, group: def.group, level, sources: srcs, removable: level !== "required", status: weakest(srcs.map((s) => s.status)), preparation: srcs.length > 0 && srcs.every((s) => s.preparation) };
  });
  modules.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || moduleOrder(a.id) - moduleOrder(b.id));

  const withFramework = rules.filter((r) => r.framework);
  const fw = withFramework.length ? withFramework[withFramework.length - 1].framework ?? null : null;
  const withCred = rules.filter((r) => r.credentials);
  const withSign = rules.filter((r) => r.signoff);
  const versionRule = rules.reduce<AssessmentRule | null>((best, r) => (!best || r.updated > best.updated || (r.from ?? "") > (best.from ?? "") ? r : best), null);
  const requiredStatus = weakest(modules.filter((x) => x.level === "required").map((x) => x.status));

  const warnings = noticesFor(c, program, availability, rules).map((n) => n.text);

  return {
    context: c,
    framework: fw,
    modules,
    credentials: withCred.length ? withCred[withCred.length - 1].credentials ?? "" : "A licensed clinician completes and signs the assessment.",
    signoff: withSign.length ? withSign[withSign.length - 1].signoff ?? "" : "Clinician attestation is required before care planning.",
    version: versionRule?.version ?? "none",
    effective: versionRule?.from ?? "2026-10-19",
    status: requiredStatus,
    availability,
    warnings,
    appliedRuleIds: rules.map((r) => r.id),
  };
}

/** The choices a new record starts with: required and recommended modules on, optional ones off. */
export function initialChoices(plan: AssessmentPlan, who: string, at: number): ModuleChoice[] {
  return plan.modules.map((m) => ({ id: m.id, level: m.level, state: m.level === "optional" ? "off" : "active", by: "plan", who, at }));
}

/** Why a module left the plan but stays on the record: its work is kept and shown, never deleted. */
export const ARCHIVED_REASON = "Archived: not in the new plan. Its data is kept.";

/** A new plan carried onto a record that already has choices: a person's additions and the work already done are kept; the rest follows the new plan.
    A module the new plan drops is archived (off, its instrument and history untouched) when work was done in it. A required module a person turned off
    without an override comes back, and an override only stands while the module is still required. */
export function reconcileChoices(plan: AssessmentPlan, previous: ModuleChoice[], keep: (id: ModuleId) => boolean, who: string, at: number): ModuleChoice[] {
  const prev = new Map(previous.map((c) => [c.id, c]));
  const fresh = (m: AssessmentPlan["modules"][number]): ModuleChoice => ({ id: m.id, level: m.level, state: m.level === "optional" ? "off" : "active", by: "plan", who, at });
  const out: ModuleChoice[] = plan.modules.map((m) => {
    const p = prev.get(m.id);
    if (p?.by === "override") return m.level === "required" ? { ...p, level: m.level } : { ...p, level: m.level, by: "clinician" as const };
    if (p?.by === "clinician") return m.level === "required" && p.state === "off" ? fresh(m) : { ...p, level: m.level };
    if (p && keep(m.id)) return { ...p, level: m.level, state: "active" as const };
    return fresh(m);
  });
  for (const p of previous) {
    if (out.some((o) => o.id === p.id)) continue;
    if (p.by === "clinician") out.push({ ...p, level: "optional" });
    else if (keep(p.id)) out.push({ id: p.id, level: "optional", state: "off", by: "plan", who, at, reason: ARCHIVED_REASON });
  }
  return out;
}

/** The modules in use: active choices, in the plan's order, then any a person added that the plan does not list. */
export function activeModules(plan: AssessmentPlan, choices: ModuleChoice[]): { id: ModuleId; label: string; level: Level; planned: boolean }[] {
  const on = new Set(choices.filter((c) => c.state === "active").map((c) => c.id));
  const inPlan = plan.modules.filter((m) => on.has(m.id)).map((m) => ({ id: m.id, label: m.label, level: m.level, planned: true }));
  const extra = choices.filter((c) => c.state === "active" && !plan.modules.some((m) => m.id === c.id)).map((c) => ({ id: c.id, label: moduleById(c.id).label, level: c.level, planned: false }));
  return [...inPlan, ...extra];
}
