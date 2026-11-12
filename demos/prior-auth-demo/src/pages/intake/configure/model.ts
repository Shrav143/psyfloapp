import { initialChoices } from "@/data/assess/plan";
import { overlayChoices, choicesFromConfig } from "@/data/assess/choices";
import { defaultsFor, populationForAge, programAvailability, programById, programForRequest } from "@/data/assess/programs";
import { moduleById } from "@/data/assess/modules";
import {
  POPULATION_LABEL, type AssessmentPlan, type Availability, type CareSetting, type Level, type ModuleGroup, type ModuleId, type ModuleKind, type Population, type PlanSource, type ProgramId, type PurposeId, type Verification,
} from "@/data/assess/types";
import type { ConfigDraft, DraftChoice, EpisodeRef, IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { fromISO } from "@/lib/dates";
import { NO_REFERRAL_SOURCE } from "@/store/intakePlan";

/* The configuration wizard's state and the pure rules around it: what a record starts with, what a program's availability looks like, and the plan's
   rows once a person's choices are laid over the plan's defaults. Nothing here reads the store, so the page and the dialog share it. */

export type WizardStep = ConfigDraft["step"];
export const STEPS: { id: WizardStep; label: string }[] = [
  { id: "purpose", label: "Intake purpose" },
  { id: "program", label: "Program" },
  { id: "population", label: "Population and setting" },
  { id: "plan", label: "Assessment plan" },
];
export const stepIndex = (s: WizardStep): number => STEPS.findIndex((x) => x.id === s);
export const parseStep = (v: string | null | undefined): WizardStep | null => (STEPS.some((s) => s.id === v) ? (v as WizardStep) : null);

export interface WizardState {
  purposeId: PurposeId;
  programId: ProgramId;
  population: Population;
  setting: CareSetting;
  /** The person chose the population or setting themselves, so choosing another program keeps it. */
  populationTouched: boolean;
  settingTouched: boolean;
  /** The treatment episode of a continuing purpose. Null until one is chosen. */
  episode: EpisodeRef | null;
  /** A person's changes to the plan's defaults. */
  choices: DraftChoice[];
}

export interface Start {
  state: WizardState;
  step: WizardStep;
  /** Where the state came from: a saved draft, the record's configuration, or the defaults of an unconfigured record. */
  from: "draft" | "config" | "new";
  savedAt?: number;
  savedBy?: string;
}

/** The program a record starts on: what the referral asked for (the one made for the person's age when several share a service), else the general intake. */
export const requestedProgramOf = (r: Pick<IntakeRecord, "serviceId" | "age">): ProgramId => programForRequest(r.serviceId, r.age)?.id ?? "general";
/** The program the referral asked for, for the "Requested by the referral" mark. A clinical intake with no referral, or a referral for no particular service, asked for none. */
export const requestedFor = (r: IntakeRecord): ProgramId | null => (r.sourceOrg === NO_REFERRAL_SOURCE || r.serviceId === "other-bh" ? null : r.config?.requestedProgramId ?? programForRequest(r.serviceId, r.age)?.id ?? null);

/** What the wizard opens with for a record: its saved draft, else its configuration, else the defaults. `purpose` (from the address) picks the purpose of an unconfigured record. */
export function startOf(r: IntakeRecord, purpose?: PurposeId | null): Start {
  const d = r.configDraft;
  if (d) {
    return {
      from: "draft", step: d.step, savedAt: d.savedAt, savedBy: d.savedBy,
      state: { purposeId: d.purposeId, programId: d.programId, population: d.population, setting: d.setting, populationTouched: !!d.populationTouched, settingTouched: !!d.settingTouched, episode: d.episode ?? null, choices: d.choices },
    };
  }
  const c = r.config;
  if (c) {
    const episode: EpisodeRef | null = r.episodeId ? { key: `book:${r.episodeId}`, patientId: r.patientId ?? null, episodeId: r.episodeId, fromIntakeId: null, label: `Episode ${r.episodeId}` } : null;
    return { from: "config", step: "purpose", state: { purposeId: c.purposeId, programId: c.programId, population: c.population, setting: c.setting, populationTouched: true, settingTouched: true, episode, choices: choicesFromConfig(c.modules) } };
  }
  const programId = requestedProgramOf(r);
  const d2 = defaultsFor(programId, r.age);
  return { from: "new", step: "purpose", state: { purposeId: purpose ?? "initial", programId, population: d2.population, setting: d2.setting, populationTouched: false, settingTouched: false, episode: null, choices: [] } };
}

export function toDraft(s: WizardState, step: WizardStep): Omit<ConfigDraft, "savedAt" | "savedBy"> {
  return { purposeId: s.purposeId, programId: s.programId, population: s.population, setting: s.setting, populationTouched: s.populationTouched, settingTouched: s.settingTouched, episode: s.episode, choices: s.choices, step };
}

/** Choosing a program: the population and setting follow it unless the person already chose them. */
export function withProgram(s: WizardState, programId: ProgramId, age: number | null): WizardState {
  const d = defaultsFor(programId, age);
  return { ...s, programId, population: s.populationTouched ? s.population : d.population, setting: s.settingTouched ? s.setting : d.setting };
}

/** Two states that would configure the same intake. The step and the save time do not count. */
export function sameState(a: WizardState, b: WizardState): boolean {
  const key = (s: WizardState) => JSON.stringify([s.purposeId, s.programId, s.population, s.setting, s.episode?.key ?? null, s.episode?.fromIntakeId ?? null, [...s.choices].map((c) => [c.id, c.state, c.by, c.reason ?? ""]).sort()]);
  return key(a) === key(b);
}

/* ------------------------------------------------------------------ programs */
export interface AvailabilityView {
  status: Availability;
  label: string;
  tone: Tone;
  /** A sentence under the label, left out for a program with nothing to add. */
  note: string | null;
  /** A retired program cannot be chosen; one that starts later or is not verified can, for preparation. */
  selectable: boolean;
  /** Said when the program is chosen though it is not available yet or not verified. */
  warning: string | null;
}

export const dateWords = (iso: string): string => fromISO(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function availabilityView(id: ProgramId, now: number): AvailabilityView {
  const a = programAvailability(id, "VA", now);
  /* The label already says "Available" or "Configuration not verified"; a note is added only for what the label leaves out. */
  const note = a.status === "available" ? (a.from ? `In effect since ${dateWords(a.from)}. Service rules are still draft.` : a.to ? `Ends ${dateWords(a.to)}.` : null) : a.status === "unverified" ? null : a.status === "starts" ? "Draft service rules; not available before then." : a.note;
  switch (a.status) {
    case "available": return { status: a.status, label: "Available", tone: "good", note, selectable: true, warning: null };
    case "starts": return { status: a.status, label: `Starts ${dateWords(a.from ?? "2027-07-01")}`, tone: "mid", note, selectable: true, warning: `${programById(id).label} starts ${dateWords(a.from ?? "2027-07-01")}. You can prepare the assessment now; nothing can be requested before then.` };
    case "retired": return { status: a.status, label: "Not available in this policy period", tone: "neutral", note, selectable: false, warning: null };
    case "unverified": return { status: a.status, label: "Configuration not verified", tone: "mid", note, selectable: true, warning: "This program's availability and coverage are not verified. You can assess the person; it does not mean a plan covers it." };
  }
}

/* ------------------------------------------------------------------ population and age */
export const populationWord = (p: Population): string => POPULATION_LABEL[p].split(" (")[0].toLowerCase();
const WORD: Record<Population, { noun: string; adj: string }> = { adult: { noun: "an adult", adj: "Adult" }, adolescent: { noun: "an adolescent", adj: "Adolescent" }, child: { noun: "a child", adj: "Child" } };
/** A mismatch between the chosen population and the person's age, in a sentence; null when they agree or the age is not known. Never blocks. */
export function ageMismatch(age: number | null, population: Population, who: string): string | null {
  const byAge = populationForAge(age);
  if (age === null || !byAge || byAge === population) return null;
  return `${who} is ${age}, ${WORD[byAge].noun}. ${WORD[population].adj} is chosen. You can keep it; check that it is intended.`;
}

/* ------------------------------------------------------------------ the plan's rows */
export interface Row {
  id: ModuleId;
  label: string;
  kind: ModuleKind;
  group: ModuleGroup;
  level: Level;
  sources: PlanSource[];
  /** The weakest verification among its sources; null for a module a person added (a clinician's choice has none). */
  status: Verification | null;
  preparation: boolean;
  /** Not in the plan: a person added it. */
  added: boolean;
  state: "active" | "off";
  by: "plan" | "clinician" | "override";
  who?: string;
  reason?: string;
}

/** The plan's modules, then the ones a person added, each with whether it is in use once the person's choices are laid over the plan's defaults. */
export function rowsOf(plan: AssessmentPlan, choices: DraftChoice[]): Row[] {
  const merged = overlayChoices(initialChoices(plan, "", 0), choices, plan);
  const by = new Map(merged.map((c) => [c.id, c]));
  const rows: Row[] = plan.modules.map((m) => {
    const c = by.get(m.id);
    return { id: m.id, label: m.label, kind: m.kind, group: m.group, level: m.level, sources: m.sources, status: m.status, preparation: m.preparation, added: false, state: c?.state ?? "active", by: c?.by ?? "plan", who: c?.who, reason: c?.reason };
  });
  for (const c of merged) {
    if (plan.modules.some((m) => m.id === c.id)) continue;
    const def = moduleById(c.id);
    rows.push({ id: c.id, label: def.label, kind: def.kind, group: def.group, level: "optional", sources: [], status: null, preparation: false, added: true, state: c.state, by: c.by, who: c.who, reason: c.reason });
  }
  return rows;
}

export const LEVELS: Level[] = ["required", "recommended", "optional"];
export const groupRows = (rows: Row[]): { level: Level; rows: Row[] }[] => LEVELS.map((level) => ({ level, rows: rows.filter((r) => r.level === level) }));

/** Whether a row's choices show as removed by an authorized override. */
export const isOverridden = (r: Row): boolean => r.by === "override" && r.state === "off";
