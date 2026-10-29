import type { StateCreator } from "zustand";
import { carryForward, hasInstrumentWork } from "@/data/assess/carry";
import { diffChoices, overlayChoices } from "@/data/assess/choices";
import { buildAssessmentPlan, ARCHIVED_REASON, initialChoices, reconcileChoices } from "@/data/assess/plan";
import { defaultsFor, programById, programForRequest } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import { canOverride } from "@/data/assess/roles";
import { moduleById } from "@/data/assess/modules";
import { POPULATION_LABEL, SETTING_LABEL, type AssessmentPlan, type CareSetting, type ConfigChange, type IntakeConfig, type ModuleChoice, type ModuleId, type Population, type ProgramId, type PurposeId } from "@/data/assess/types";
import type { BuiltInPayerId } from "@/data/types";
import type { SiteId } from "@/data/sites";
import { vaPlanOf } from "@/data/va/plans";
import type { ConfigDraft, DraftChoice, EpisodeRef, FieldMap, FieldValue, IntakeRecord } from "@/data/intake/types";
import { DAY } from "@/lib/time";
import type { AppState } from "./index";
import { meOf, policyNowOf } from "./intake";

/* Intake configuration: choosing the purpose, program, population and setting builds the assessment plan; a person may add optional modules, remove
   recommended ones, and, only with an authorized override and a reason, remove a required one. Every change is audited and kept in the config history.
   A configuration can be saved as a draft first: the draft sits beside the record's configuration and changes nothing until Start assessment. */

/** The source a clinical intake started without a referral carries. */
export const NO_REFERRAL_SOURCE = "Clinical intake (no referral)";

export interface ConfigureInput {
  purposeId: PurposeId;
  programId: ProgramId;
  population: Population;
  setting: CareSetting;
  /** A person's own changes to the plan's defaults (a module turned on or off, a required one removed by an authorized override). Left out, the record's earlier choices stay. */
  choices?: DraftChoice[];
  /** The treatment episode a continuing purpose belongs to. The earlier intake's signed assessments are carried forward as a new version. */
  episode?: EpisodeRef | null;
}

export interface NewClinicalIntakeInput {
  initials: string;
  age: number | null;
  site: SiteId;
  payerId: BuiltInPayerId | null;
  /** The person's id in the patient book (data/patients.ts), when they are in it. */
  patientId: string | null;
  /** A new person only: what was typed. Only the last four digits of a member ID are kept. */
  dob?: string;
  legalName?: string;
  memberLast4?: string;
  /** An earlier intake of the same person: the profile is copied from it and the coverage is marked for confirmation. */
  copyFrom?: string | null;
  purposeId: PurposeId;
  episode: EpisodeRef | null;
  /** The program the wizard opens on. */
  programId?: ProgramId;
  population?: Population;
  setting?: CareSetting;
}

export interface IntakePlanSlice {
  /** Builds the plan and sets (or changes) the intake's configuration. A person's additions and the work already done are kept; modules the plan drops are archived with their data. Returns the plan. */
  configureIntake: (id: string, c: ConfigureInput) => AssessmentPlan | null;
  /** Adds or removes an optional or recommended module. A required one needs overrideRequiredModule. */
  setModuleActive: (id: string, moduleId: ModuleId, active: boolean) => void;
  /** An authorized override: a qualified clinician or the clinic owner removes a required module and says why. Returns false when the viewer may not. */
  overrideRequiredModule: (id: string, moduleId: ModuleId, reason: string) => boolean;
  /** Puts a removed required module back. */
  restoreRequiredModule: (id: string, moduleId: ModuleId) => void;
  /** Saves the wizard as it stands, without starting anything. Resume reopens it. */
  saveConfigDraft: (id: string, draft: Omit<ConfigDraft, "savedAt" | "savedBy">) => void;
  discardConfigDraft: (id: string) => void;
  /** New Clinical Intake: an intake record with no referral (status accepted), and a draft configuration that opens the wizard at the program step. Returns its id. */
  createClinicalIntake: (input: NewClinicalIntakeInput) => string;
}

/** The plan a choice of purpose, program, population and setting makes for a record's payer on a policy date. Pure: the wizard previews with it before anything is saved. */
export function planForChoice(r: Pick<IntakeRecord, "payerId">, c: Pick<ConfigureInput, "purposeId" | "programId" | "population" | "setting">, policyDate: number): AssessmentPlan {
  return buildAssessmentPlan({ programId: c.programId, purposeId: c.purposeId, population: c.population, setting: c.setting, state: "VA", payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate });
}

/** The plan an intake's configuration produces on a policy date: for the screen to read, not stored. */
export function planFor(r: IntakeRecord, policyDate: number): AssessmentPlan | null {
  const c = r.config;
  return c ? planForChoice(r, c, policyDate) : null;
}
export const planOf = (s: AppState, id: string): AssessmentPlan | null => {
  const r = s.intakes.find((x) => x.id === id);
  return r ? planFor(r, policyNowOf(s)) : null;
};

const popWord = (p: Population): string => POPULATION_LABEL[p].split(" (")[0].toLowerCase();
const lower = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);
const fv = (value: string, state: FieldValue["state"], by: string, at: number, ref: string): FieldValue => ({ value, state, at, by, source: { kind: "staff", ref } });

export const createIntakePlanSlice: StateCreator<AppState, [], [], IntakePlanSlice> = (_set, get) => {
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
      const plan = planForChoice(r, input, policyNowOf(s));
      const purpose = purposeById(input.purposeId);
      const source = purpose.needsEpisode && input.episode?.fromIntakeId && input.episode.fromIntakeId !== id ? s.intakes.find((x) => x.id === input.episode?.fromIntakeId) : undefined;
      const history: ConfigChange[] = [];
      let carried: { found: number; prefilled: number } | null = null;

      patch(id, (rec) => {
        const prev = rec.config;
        /* When the wizard sends the person's choices they replace the earlier ones; otherwise the earlier ones stay. */
        const base = prev ? reconcileChoices(plan, input.choices ? prev.modules.filter((c) => c.by === "plan") : prev.modules, (m) => hasInstrumentWork(rec, m), me, s.clock) : initialChoices(plan, me, s.clock);
        let modules = input.choices ? overlayChoices(base, input.choices, plan) : base;
        /* Nothing is deleted: a module with work that fell out of the plan altogether is archived. */
        if (prev) for (const p of prev.modules) if (!modules.some((m) => m.id === p.id) && hasInstrumentWork(rec, p.id)) modules = [...modules, { id: p.id, level: "optional", state: "off", by: "plan", who: me, at: s.clock, reason: ARCHIVED_REASON }];

        const at = s.clock;
        const add = (what: string, detail?: string) => history.push({ at, who: me, what, detail });
        if (!prev) add("Configured the intake", `${purpose.label} · ${programById(input.programId).label} · ${popWord(input.population)} · ${SETTING_LABEL[input.setting].toLowerCase()}`);
        else {
          if (prev.purposeId !== input.purposeId) add(`Changed purpose from ${purposeById(prev.purposeId).label} to ${purpose.label}`);
          if (prev.programId !== input.programId) add(`Changed program from ${programById(prev.programId).label} to ${programById(input.programId).label}`);
          if (prev.population !== input.population) add(`Changed population from ${popWord(prev.population)} to ${popWord(input.population)}`);
          if (prev.setting !== input.setting) add(`Changed setting from ${SETTING_LABEL[prev.setting].toLowerCase()} to ${SETTING_LABEL[input.setting].toLowerCase()}`);
        }
        /* What a person changed in the plan, against the record's earlier choices or, for a first configuration, against the plan's defaults. */
        for (const ch of diffChoices(prev?.modules ?? initialChoices(plan, me, s.clock), modules)) {
          const label = moduleById(ch.id).label;
          const reason = modules.find((m) => m.id === ch.id)?.reason;
          if (ch.what === "override") add(`Authorized override: removed required ${label}`, reason);
          else if (ch.what === "restored") add(`Restored ${label}`);
          else if (ch.what === "added") add(`Added ${label}`, "Chosen by a person");
          else add(hasInstrumentWork(rec, ch.id) ? `Archived ${label}` : `Removed ${label}`, hasInstrumentWork(rec, ch.id) ? "Its data is kept in the record" : "Not needed for this person");
        }
        if (prev) {
          const was = new Set(prev.modules.filter((m) => m.state === "active").map((m) => m.id));
          const now = modules.filter((m) => m.state === "active");
          const gained = now.filter((m) => !was.has(m.id) && m.by === "plan").length;
          const dropped = [...was].filter((m) => !now.some((x) => x.id === m)).length;
          if (gained || dropped) add("Assessment plan updated", `${gained} module${gained === 1 ? "" : "s"} added by the new plan, ${dropped} no longer in use. Modules with data are archived, never deleted.`);
        }

        const requested = prev?.requestedProgramId ?? programForRequest(rec.serviceId, rec.age)?.id ?? input.programId;
        const config: IntakeConfig = {
          purposeId: input.purposeId, programId: input.programId, requestedProgramId: requested, population: input.population, setting: input.setting, state: "VA", modules,
          planVersion: plan.version, configuredBy: prev?.configuredBy ?? me, configuredAt: prev?.configuredAt ?? s.clock, history: [...(prev?.history ?? []), ...history],
        };
        /* A record with no referral follows its program until a service is selected: it has no requested service of its own. */
        const follows = rec.serviceId === "other-bh" || rec.sourceOrg === NO_REFERRAL_SOURCE;
        const service = programById(input.programId).serviceId;
        let next: IntakeRecord = {
          ...rec, config, configDraft: undefined, serviceId: follows && service !== "other-bh" ? service : rec.serviceId,
          progress: rec.progress ? { ...rec.progress, step: undefined } : rec.progress,
          ...(input.episode ? { patientId: input.episode.patientId ?? rec.patientId, episodeId: input.episode.episodeId ?? rec.episodeId } : {}),
        };
        if (source) {
          const res = carryForward(next, source, plan.modules.map((m) => m.id), s.clock, me);
          next = res.record;
          carried = { found: res.found, prefilled: res.prefilled };
          /* A module that received carried-forward values is put in use, so the new version is where the clinician works; a person's own choice to turn one off stands. */
          if (next.config) next = { ...next, config: { ...next.config, modules: next.config.modules.map((m) => (res.prefilledIds.includes(m.id) && m.state === "off" && m.by === "plan" ? { ...m, state: "active" as const, reason: undefined } : m)) } };
        }
        return next;
      });

      for (const h of history) s.addIntakeAudit(id, { actor: me, action: h.what, detail: h.detail, section: "assessment" });
      const c = carried as { found: number; prefilled: number } | null;
      if (c && c.found) s.addIntakeAudit(id, { actor: me, action: `Carried forward ${c.found} signed assessment${c.found === 1 ? "" : "s"} from ${source?.id}`, detail: `${c.prefilled} prefilled in the modules in use as a new version. Each value needs confirmation.`, section: "assessment" });
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
      const r = s.intakes.find((x) => x.id === id);
      const level = r ? planFor(r, policyNowOf(s))?.modules.find((m) => m.id === moduleId)?.level : undefined;
      if (level !== "required" || !canOverride(meOf(s)) || !reason.trim()) return false;
      setChoice(id, moduleId, (_p, lv) => ({ id: moduleId, level: lv, state: "off", by: "override", who: meOf(get()), at: get().clock, reason: reason.trim() }));
      note(id, `Authorized override: removed required ${moduleById(moduleId).label}`, reason.trim());
      return true;
    },

    restoreRequiredModule: (id, moduleId) => {
      setChoice(id, moduleId, (_p, lv) => ({ id: moduleId, level: lv, state: "active", by: "plan", who: meOf(get()), at: get().clock }));
      note(id, `Restored ${moduleById(moduleId).label}`);
    },

    saveConfigDraft: (id, draft) => {
      const s = get();
      const me = meOf(s);
      patch(id, (r) => ({ ...r, configDraft: { ...draft, savedAt: s.clock, savedBy: me }, progress: { section: r.progress?.section ?? "overview", at: s.clock, step: draft.step } }));
      s.addIntakeAudit(id, { actor: me, action: "Saved a configuration draft", detail: `${purposeById(draft.purposeId).label} · ${programById(draft.programId).label}`, section: "assessment" });
    },

    discardConfigDraft: (id) => {
      const s = get();
      if (!s.intakes.find((x) => x.id === id)?.configDraft) return;
      patch(id, (r) => ({ ...r, configDraft: undefined, progress: r.progress ? { ...r.progress, step: undefined } : r.progress }));
      s.addIntakeAudit(id, { actor: meOf(s), action: "Discarded the configuration draft", section: "assessment" });
    },

    createClinicalIntake: (input) => {
      const s = get();
      const me = meOf(s);
      const at = s.clock;
      const src = input.copyFrom ? s.intakes.find((x) => x.id === input.copyFrom) : undefined;
      const purpose = purposeById(input.purposeId);
      const profile: FieldMap = { ...(src?.profile ?? {}) };
      const coverage: FieldMap = {};
      if (src) {
        /* Coverage may have changed since the earlier intake: it is carried over to be confirmed, never trusted as verified. */
        for (const [k, v] of Object.entries(src.coverage)) coverage[k] = v.value && v.state !== "not_collected" ? { ...v, state: "needs_confirmation", at, by: me, reviewedBy: undefined, reviewedAt: undefined, source: { kind: "form", ref: `Carried from ${src.id}; confirm it is still current` } } : v;
      } else {
        const ref = "Entered at New Clinical Intake";
        if (input.dob) profile.dob = fv(input.dob, "patient_reported", me, at, ref);
        if (input.legalName) profile.legalName = fv(input.legalName, "patient_reported", me, at, ref);
        const plan = input.payerId ? vaPlanOf(input.payerId) : undefined;
        if (plan) {
          coverage.plan = fv(plan.name, "patient_reported", me, at, `${ref}, as reported`);
          coverage.coverageType = fv(plan.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)", "patient_reported", me, at, `${ref}, as reported`);
        }
        if (input.memberLast4) coverage.medicaidId = fv(`•••• ${input.memberLast4}`, "patient_reported", me, at, `${ref}, as reported`);
      }
      const id = s.createIntake({
        serviceId: "other-bh", method: "manual", site: input.site, initials: input.initials, age: input.age, payerId: input.payerId, triage: "accepted", triageNote: "Clinical intake started without a referral.",
        urgency: "routine", sourceOrg: NO_REFERRAL_SOURCE, title: `${purpose.label}: clinical intake`, serviceDate: policyNowOf(s) + 7 * DAY, profile, coverage,
        referral: { sourceOrg: fv(NO_REFERRAL_SOURCE, "verified", me, at, "Clinical intake") }, patientId: input.patientId ?? src?.patientId ?? null, episodeId: input.episode?.episodeId ?? null, legacy: src?.legacy,
      });
      const programId: ProgramId = input.programId ?? (purpose.needsEpisode ? src?.config?.programId : undefined) ?? "general";
      const d = defaultsFor(programId, input.age);
      get().saveConfigDraft(id, { purposeId: input.purposeId, programId, population: input.population ?? src?.config?.population ?? d.population, setting: input.setting ?? src?.config?.setting ?? d.setting, episode: input.episode, choices: [], step: "program" });
      s.addIntakeAudit(id, { actor: me, action: "Started a clinical intake without a referral", detail: `${purpose.label}${input.episode ? ` · ${lower(input.episode.label)}` : ""}` });
      /* The earlier signed assessments are found for the person now; they are prefilled into the modules in use when the configuration starts. */
      const from = purpose.needsEpisode && input.episode?.fromIntakeId ? get().intakes.find((x) => x.id === input.episode?.fromIntakeId) : undefined;
      if (from) {
        let found = 0;
        patch(id, (r) => {
          const res = carryForward(r, from, [], at, me);
          found = res.found;
          return res.record;
        });
        if (found) get().addIntakeAudit(id, { actor: me, action: `Found ${found} signed assessment${found === 1 ? "" : "s"} from ${from.id}`, detail: "Listed under assessments found for this person. They are carried forward as a new version when the assessment starts.", section: "assessment" });
      }
      return id;
    },
  };
};
