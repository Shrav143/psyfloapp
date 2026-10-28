import type { StateCreator } from "zustand";
import { buildAssessmentPlan, initialChoices, reconcileChoices } from "@/data/assess/plan";
import { programById, programForService } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import { canOverride } from "@/data/assess/roles";
import { moduleById } from "@/data/assess/modules";
import type { AssessmentPlan, CareSetting, IntakeConfig, ModuleChoice, ModuleId, Population, ProgramId, PurposeId } from "@/data/assess/types";
import type { BuiltInPayerId } from "@/data/types";
import type { IntakeRecord } from "@/data/intake/types";
import type { AppState } from "./index";
import { meOf, policyNowOf } from "./intake";

/* Intake configuration: choosing the purpose, program, population and setting builds the assessment plan; a person may add optional modules, remove
   recommended ones, and, only with an authorized override and a reason, remove a required one. Every change is audited and kept in the config history. */

export interface ConfigureInput {
  purposeId: PurposeId;
  programId: ProgramId;
  population: Population;
  setting: CareSetting;
}

export interface IntakePlanSlice {
  /** Builds the plan and sets (or changes) the intake's configuration. A person's additions and the work already done are kept. Returns the plan. */
  configureIntake: (id: string, c: ConfigureInput) => AssessmentPlan | null;
  /** Adds or removes an optional or recommended module. A required one needs overrideRequiredModule. */
  setModuleActive: (id: string, moduleId: ModuleId, active: boolean) => void;
  /** An authorized override: a qualified clinician or the clinic owner removes a required module and says why. Returns false when the viewer may not. */
  overrideRequiredModule: (id: string, moduleId: ModuleId, reason: string) => boolean;
  /** Puts a removed required module back. */
  restoreRequiredModule: (id: string, moduleId: ModuleId) => void;
}

/** The plan an intake's configuration produces on a policy date: for the screen to read, not stored. */
export function planFor(r: IntakeRecord, policyDate: number): AssessmentPlan | null {
  const c = r.config;
  if (!c) return null;
  return buildAssessmentPlan({ programId: c.programId, purposeId: c.purposeId, population: c.population, setting: c.setting, state: c.state, payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate });
}
export const planOf = (s: AppState, id: string): AssessmentPlan | null => {
  const r = s.intakes.find((x) => x.id === id);
  return r ? planFor(r, policyNowOf(s)) : null;
};

const hasWork = (r: IntakeRecord, id: ModuleId): boolean => {
  const i = r.instruments?.[id];
  return !!i && (i.status !== "not_started" || Object.keys(i.fields).length > 0);
};

export const createIntakePlanSlice: StateCreator<AppState, [], [], IntakePlanSlice> = (set, get) => {
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => get().patchIntake(id, fn);
  const withConfig = (r: IntakeRecord, fn: (c: IntakeConfig) => IntakeConfig): IntakeRecord => (r.config ? { ...r, config: fn(r.config) } : r);
  const note = (id: string, what: string, detail?: string, ai = false) => {
    const s = get();
    patch(id, (r) => withConfig(r, (c) => ({ ...c, history: [...c.history, { at: s.clock, who: ai ? "system" : meOf(s), what, detail }] })));
    s.addIntakeAudit(id, { actor: meOf(s), action: what, detail });
  };
  const setChoice = (id: string, moduleId: ModuleId, fn: (c: ModuleChoice | undefined, level: ModuleChoice["level"]) => ModuleChoice) => {
    const s = get();
    patch(id, (r) => withConfig(r, (c) => {
      const plan = planFor(r, policyNowOf(s));
      const level = plan?.modules.find((m) => m.id === moduleId)?.level ?? "optional";
      const prev = c.modules.find((m) => m.id === moduleId);
      const next = fn(prev, level);
      return { ...c, modules: prev ? c.modules.map((m) => (m.id === moduleId ? next : m)) : [...c.modules, next] };
    }));
  };

  return {
    configureIntake: (id, input) => {
      const s = get();
      const r = s.intakes.find((x) => x.id === id);
      if (!r) return null;
      const me = meOf(s);
      const plan = buildAssessmentPlan({ ...input, state: "VA", payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: policyNowOf(s) });
      const requested = r.config?.requestedProgramId ?? programForService(r.serviceId)?.id ?? input.programId;
      const first = !r.config;
      patch(id, (rec) => {
        const prev = rec.config;
        const modules = prev ? reconcileChoices(plan, prev.modules, (mid) => hasWork(rec, mid), me, s.clock) : initialChoices(plan, me, s.clock);
        const what = first ? "Configured the intake" : "Changed the intake configuration";
        const detail = `${purposeById(input.purposeId).label} · ${programById(input.programId).label} · ${input.population} · ${input.setting}`;
        const config: IntakeConfig = {
          purposeId: input.purposeId, programId: input.programId, requestedProgramId: requested, population: input.population, setting: input.setting, state: "VA", modules,
          planVersion: plan.version, configuredBy: prev?.configuredBy ?? me, configuredAt: prev?.configuredAt ?? s.clock,
          history: [...(prev?.history ?? []), { at: s.clock, who: me, what, detail }],
        };
        return { ...rec, config };
      });
      s.addIntakeAudit(id, { actor: me, action: first ? "Configured the intake" : "Changed the intake configuration", detail: `${purposeById(input.purposeId).label} · ${programById(input.programId).label}`, section: "assessment" });
      return plan;
    },

    setModuleActive: (id, moduleId, active) => {
      const s = get();
      const r = s.intakes.find((x) => x.id === id);
      const level = planFor(r as IntakeRecord, policyNowOf(s))?.modules.find((m) => m.id === moduleId)?.level;
      if (!r?.config || level === "required") return;
      setChoice(id, moduleId, (prev, lv) => ({ id: moduleId, level: lv, state: active ? "active" : "off", by: "clinician", who: meOf(get()), at: get().clock, reason: prev?.reason }));
      note(id, `${active ? "Added" : "Removed"} ${moduleById(moduleId).label}`, active ? "Chosen by a person" : "Not needed for this person");
    },

    overrideRequiredModule: (id, moduleId, reason) => {
      const s = get();
      if (!canOverride(meOf(s)) || !reason.trim()) return false;
      setChoice(id, moduleId, (_p, lv) => ({ id: moduleId, level: lv, state: "off", by: "override", who: meOf(get()), at: get().clock, reason: reason.trim() }));
      note(id, `Authorized override: removed required ${moduleById(moduleId).label}`, reason.trim());
      return true;
    },

    restoreRequiredModule: (id, moduleId) => {
      setChoice(id, moduleId, (_p, lv) => ({ id: moduleId, level: lv, state: "active", by: "plan", who: meOf(get()), at: get().clock }));
      note(id, `Restored ${moduleById(moduleId).label}`);
    },
  };
};
