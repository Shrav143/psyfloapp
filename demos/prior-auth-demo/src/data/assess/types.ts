import type { AgentKey, BuiltInPayerId } from "../types";
import type { FieldMap, SourceRef } from "../intake/types";
import type { SourceId } from "../va/policy";
import type { VaServiceId } from "../va/services";

/* The assessment configuration model. A program, an intake purpose, a population and a care setting (with the state, the payer and the policy date)
   select rules; the rules select modules; the modules draw the workspace. Nothing here is clinical content: it is configuration, each row with its
   source, version, status and reviewer. Licensed instruments (ASAM, LOCUS, CALOCUS-CASII, the CANS Lifetime) are integration-ready placeholders. */

/* ------------------------------------------------------------------ the inputs */
export type Population = "adult" | "adolescent" | "child";
export const POPULATION_LABEL: Record<Population, string> = { adult: "Adult (18 and over)", adolescent: "Adolescent (12 to 17)", child: "Child (under 12)" };
export const POPULATIONS: Population[] = ["adult", "adolescent", "child"];

export type CareSetting = "outpatient" | "community" | "school" | "home" | "residential" | "inpatient" | "telehealth" | "hybrid";
export const SETTING_LABEL: Record<CareSetting, string> = { outpatient: "Outpatient", community: "Community", school: "School", home: "Home", residential: "Residential", inpatient: "Inpatient", telehealth: "Telehealth", hybrid: "Hybrid" };
export const SETTINGS: CareSetting[] = ["outpatient", "community", "school", "home", "residential", "inpatient", "telehealth", "hybrid"];

export type PurposeId = "initial" | "screening" | "transfer" | "readmission" | "loc_change" | "continued_stay" | "reassessment" | "discharge";

/** How an intake purpose reshapes the plan after the program's rules are merged. */
export interface PurposeDef {
  id: PurposeId;
  label: string;
  description: string;
  /** Needs an existing patient and treatment episode: the wizard asks for them first and carries the previous assessment forward as a new version. */
  needsEpisode: boolean;
  /** The authorization request type this purpose usually leads to (New Authorization), or null when it leads to none. */
  requestKind: "initial" | "concurrent" | "reauth" | "modify" | "retro" | null;
  /** Modules of these groups drop to `demoteTo` (the core and screening groups are never demoted). "all" means every program-specific group. */
  demote: ModuleGroup[] | "all";
  demoteTo: Level;
  /** Why a module was demoted, shown under "Why this module". */
  demoteReason: string;
  /** Modules this purpose adds or raises. */
  add: RuleModule[];
}

export type ProgramCategory = "mh" | "sud" | "community" | "children" | "other";
export const CATEGORY_LABEL: Record<ProgramCategory, string> = { mh: "Mental health", sud: "Substance use disorder", community: "Community behavioral health", children: "Children and adolescents", other: "Other" };

export type ProgramId =
  | "mh-op" | "mh-iop" | "mh-php" | "mh-res" | "mh-inpt" | "psr" | "act" | "csc"
  | "sud-op" | "sud-iop" | "sud-php" | "sud-res" | "sud-wm" | "sud-inpt" | "otp" | "obot"
  | "cpst-adult" | "cpst-youth" | "cpst-school" | "clubhouse" | "mhcm" | "cbbh"
  | "youth-iop" | "youth-php" | "school-bh" | "children-intensive" | "aba" | "prtf" | "family-based"
  | "general" | "custom";

export interface ProgramDef {
  id: ProgramId;
  label: string;
  category: ProgramCategory;
  summary: string;
  /** Populations the program serves, and the one it starts with. */
  populations: Population[];
  defaultPopulation: Population;
  settings: CareSetting[];
  defaultSetting: CareSetting;
  /** The Virginia service an authorization for this program is made under (data/va/services.ts). "other-bh" means none is configured: no state or plan requirements are loaded. */
  serviceId: VaServiceId;
  /** True for a program that is the same service as another at a different population (Youth IOP is mental health IOP for a young person). */
  note?: string;
}

export type Verification = "verified" | "draft" | "unverified" | "demo";
export const VERIFICATION_LABEL: Record<Verification, string> = { verified: "Verified", draft: "Draft policy", unverified: "Not verified", demo: "Demo configuration" };
/** From most to least authoritative; the weakest source decides a module's status. */
export const VERIFICATION_RANK: Verification[] = ["verified", "draft", "unverified", "demo"];

export type RequirementSource = "state_policy" | "payer_policy" | "org_protocol" | "clinician" | "demo";
export const SOURCE_LABEL: Record<RequirementSource, string> = { state_policy: "State policy", payer_policy: "Payer policy", org_protocol: "Organization protocol", clinician: "Clinician selected", demo: "Demo configuration" };

export type Availability = "available" | "starts" | "retired" | "unverified";
export interface ProgramAvailability {
  status: Availability;
  /** One sentence for the program picker and the plan. */
  note: string;
  verification: Verification;
  /** ISO dates from the policy sources. */
  from?: string;
  to?: string;
}

/* ------------------------------------------------------------------ modules */
export type ModuleKind = "section" | "framework" | "instrument" | "review";
export type ModuleGroup = "core" | "sud" | "mh" | "community" | "children" | "screening";
export const MODULE_GROUP_LABEL: Record<ModuleGroup, string> = { core: "Core modules", sud: "Substance use", mh: "Mental health", community: "Community services", children: "Children and families", screening: "Screening instruments" };
export type Level = "required" | "recommended" | "optional";
export const LEVEL_LABEL: Record<Level, string> = { required: "Required", recommended: "Recommended", optional: "Optional" };

export type ModuleId =
  /* core: one per workspace area */
  | "patient-referral" | "insurance" | "clinical-history" | "safety" | "social-functional" | "clinical-notes" | "review-signoff"
  /* substance use */
  | "sud-history" | "asam" | "withdrawal" | "medical-stability" | "psych-history" | "recovery-env" | "treatment-history" | "functional-assessment"
  | "loc-review" | "residential-admission" | "discharge-planning" | "continued-stay"
  /* mental health */
  | "psychiatric" | "symptom-severity" | "acute-symptoms" | "biopsychosocial"
  /* screening and criteria instruments (score entry; licensed content is not reproduced) */
  | "phq9" | "gad7" | "cssrs" | "audit" | "dast10" | "cows" | "ciwa" | "locus" | "calocus"
  /* community services */
  | "functional-needs" | "community-living" | "school-functioning" | "family-community" | "caregiver-coordination" | "cans" | "lon" | "cpst-review" | "school-family"
  /* coordinated specialty care */
  | "psychosis-course" | "functional-changes" | "family-supports" | "csc-criteria" | "multidisciplinary-plan" | "referral-coordination"
  /* applied behavior analysis */
  | "developmental-history" | "diagnostic-info" | "adaptive-functioning" | "behavioral-assessment" | "fba" | "aba-goals" | "caregiver-participation" | "aba-intensity";

export type FieldKind = "text" | "long" | "select" | "multi" | "date" | "number" | "check";
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  hint?: string;
  /** Needed before the module can be marked complete. */
  required?: boolean;
  /** Words an evidence reader looks for in the record to propose this field (simulated reading; never a rating). */
  evidence?: string[];
}
export interface SectionDef {
  id: string;
  label: string;
  hint?: string;
  fields: FieldDef[];
  /** "loc-review" draws the level-of-care review: requested level, findings so far, criteria status, missing evidence, recommendation, clinician-confirmed level. */
  type?: "fields" | "loc-review";
  /** For a loc-review section: the levels a clinician can confirm (names only; no criteria). */
  locOptions?: string[];
}
export interface ModuleSchema {
  sections: SectionDef[];
  /** A score-entry instrument: the name the clinician enters a result for. Psyflo records the result; it never computes an official score. */
  scoreEntry?: { name: string; unit: string; note: string };
}

export interface ModuleDef {
  id: ModuleId;
  label: string;
  kind: ModuleKind;
  group: ModuleGroup;
  description: string;
  /** A licensed or official instrument: the module is an integration-ready placeholder with documentation fields; no item text, scoring or algorithm. */
  licensed?: boolean;
  /** Populations it applies to; left out means all. */
  populations?: Population[];
  /** A module with its own renderer. */
  special?: "cans" | "lon";
}

/* ------------------------------------------------------------------ the rules */
export interface RuleModule {
  id: ModuleId;
  level: Level;
  reason: string;
  /** A name for this program ("IOP level-of-care review"), instead of the module's own. */
  label?: string;
  /** Applies only when the plan's population, setting or purpose is one of these. */
  when?: { populations?: Population[]; settings?: CareSetting[]; purposes?: PurposeId[] };
}
export type FrameworkId = "asam" | "cans" | "locus" | "calocus" | "none";
export interface AssessmentRule {
  id: string;
  label: string;
  programs: ProgramId[] | "all";
  states: string[];
  payers?: BuiltInPayerId[];
  populations?: Population[];
  settings?: CareSetting[];
  purposes?: PurposeId[];
  /** ISO dates: the rule applies from `from` and through `to`. */
  from?: string;
  to?: string;
  version: string;
  status: Verification;
  source: RequirementSource;
  /** An official source in data/va/policy.ts. */
  sourceRef?: SourceId;
  reviewer: string;
  /** ISO date of the last change. */
  updated: string;
  modules: RuleModule[];
  /** Who may complete and sign the assessment ("per policy; not verified" when it is not). */
  credentials?: string;
  signoff?: string;
  framework?: { id: FrameworkId; label: string; edition?: string };
  note?: string;
}

/* ------------------------------------------------------------------ the plan */
export interface PlanSource {
  ruleId: string;
  ruleLabel: string;
  source: RequirementSource;
  status: Verification;
  level: Level;
  reason: string;
  version: string;
  /** The row takes effect after the policy date: its module is shown for preparation and does not hold up readiness. */
  preparation?: boolean;
}
export interface PlanModule {
  id: ModuleId;
  label: string;
  kind: ModuleKind;
  group: ModuleGroup;
  /** The strongest level any source gives it. */
  level: Level;
  sources: PlanSource[];
  /** A required module cannot be removed without an authorized override. */
  removable: boolean;
  /** The weakest verification among its sources. */
  status: Verification;
  /** Every source takes effect after the policy date: preparation only. */
  preparation: boolean;
}
export interface PlanContext {
  programId: ProgramId;
  purposeId: PurposeId;
  population: Population;
  setting: CareSetting;
  state: string;
  payerId: BuiltInPayerId | null;
  /** Demo minutes (the policy "now"). */
  policyDate: number;
}
export interface AssessmentPlan {
  context: PlanContext;
  framework: { id: FrameworkId; label: string; edition?: string } | null;
  modules: PlanModule[];
  credentials: string;
  signoff: string;
  /** "va-assess-2027.1": the newest rule version that applied. */
  version: string;
  /** ISO date the newest applicable rule took effect. */
  effective: string;
  /** The weakest verification among the required modules. */
  status: Verification;
  availability: ProgramAvailability;
  /** What the reader should know: an unavailable program, a population mismatch, a missing payer rule. */
  warnings: string[];
  appliedRuleIds: string[];
}

/* ------------------------------------------------------------------ on the record */
/** One module of the plan as the record holds it. "off" is an optional or recommended module that is not in use. */
export interface ModuleChoice {
  id: ModuleId;
  level: Level;
  state: "active" | "off";
  /** plan: the plan's default; clinician: chosen by a person; override: a required module removed by an authorized override. */
  by: "plan" | "clinician" | "override";
  who?: string;
  at?: number;
  reason?: string;
}
export interface ConfigChange {
  at: number;
  who: string;
  what: string;
  detail?: string;
}
export interface IntakeConfig {
  purposeId: PurposeId;
  /** The program the person is being evaluated for now, and the one the referral asked for (kept for the audit trail). */
  programId: ProgramId;
  requestedProgramId: ProgramId;
  population: Population;
  setting: CareSetting;
  state: string;
  modules: ModuleChoice[];
  planVersion: string;
  configuredBy: string;
  configuredAt: number;
  history: ConfigChange[];
}

export type InstrumentStatus = "not_started" | "in_progress" | "awaiting_review" | "signed" | "superseded";
export const INSTRUMENT_STATUS_LABEL: Record<InstrumentStatus, string> = { not_started: "Not started", in_progress: "In progress", awaiting_review: "Awaiting review", signed: "Signed", superseded: "Superseded" };

/** A piece of evidence the reader proposes for one field. It never fills the field until a person accepts it. */
export interface InstrumentEvidence {
  id: string;
  fieldKey: string;
  text: string;
  source: SourceRef;
  explanation: string;
  confidence: "high" | "medium" | "low";
  status: "pending" | "accepted" | "edited" | "rejected";
  agent: AgentKey;
  at: number;
  decidedBy?: string;
  decidedAt?: number;
  editedText?: string;
}
export interface InstrumentVersion {
  version: number;
  status: InstrumentStatus;
  fields: FieldMap;
  signedBy?: string;
  signedAt?: number;
  supersededAt?: number;
  /** Why a new version was made (an amendment, a reassessment). */
  note?: string;
}
export interface InstrumentInstance {
  moduleId: ModuleId;
  version: number;
  status: InstrumentStatus;
  fields: FieldMap;
  notes: string;
  evidence: InstrumentEvidence[];
  /** A score-entry instrument: the result the clinician entered from the administered instrument. */
  score?: { value: string; administeredBy: string; administeredAt: number; note?: string };
  /** A level-of-care review: what the clinician recommended and confirmed. Never assigned by software. */
  loc?: { requested?: string; recommendation?: string; confirmed?: string; confirmedBy?: string; confirmedAt?: number };
  startedAt?: number;
  updatedAt: number;
  reviewedBy?: string;
  signedBy?: string;
  signedAt?: number;
  /** A signature given by a non-clinician viewer playing the site's clinician in the demo. */
  rolePlay?: boolean;
  /** Earlier versions, kept. Nothing submitted is overwritten. */
  history: InstrumentVersion[];
}

export interface CarePlan {
  status: "not_started" | "draft" | "approved";
  /** What the referral asked for, kept for the audit trail, and what the clinician selected. */
  requestedProgramId: ProgramId;
  selectedProgramId: ProgramId | null;
  selectedBy?: string;
  selectedAt?: number;
  /** Why the selected program differs from the requested one. */
  changeReason?: string;
  rationale: string;
  goals: { id: string; text: string }[];
  interventions: string;
  frequency: string;
  coordination: string;
  approvedBy?: string;
  approvedAt?: number;
  rolePlay?: boolean;
  history: { at: number; who: string; what: string }[];
}

export type ConsentType = "treatment" | "payment" | "operations" | "part2_disclosure" | "recording" | "release";
export const CONSENT_LABEL: Record<ConsentType, string> = { treatment: "Consent to treatment", payment: "Consent for payment (payer disclosure)", operations: "Health care operations", part2_disclosure: "Substance use records disclosure (42 CFR Part 2)", recording: "Recording (AI Scribe, voice)", release: "Release of information" };
export interface ConsentEntry {
  id: string;
  type: ConsentType;
  /** Who receives the information, and what for. */
  recipient: string;
  purpose: string;
  status: "on_file" | "needed" | "declined" | "revoked" | "expired";
  at?: number;
  expires?: number;
  by?: string;
}

/** An assessment found for the person from another provider or an earlier episode. Reuse depends on policy, consent and clinical appropriateness. */
export interface PriorAssessment {
  id: string;
  moduleId: ModuleId;
  label: string;
  date: number;
  provider: string;
  version: string;
  clinician: string;
  status: "current" | "outdated" | "incomplete";
  /** Whether the configured policy allows reuse. "unverified" means no rule says so. */
  reuse: "permitted" | "unverified" | "not_permitted";
  note: string;
  /** Set once a person decides what to do with it. */
  decision?: { action: "reviewed" | "reused" | "update_requested" | "new_started"; by: string; at: number };
}

/* ------------------------------------------------------------------ readiness */
export type ReadinessStatus = "complete" | "missing" | "verify" | "pending" | "blocked" | "na";
export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  /** Where in the workspace the person fixes it. */
  go?: { section: string; module?: ModuleId };
}
export interface ReadinessTrack {
  state: "complete" | "in_progress" | "not_started" | "blocked";
  items: ReadinessItem[];
  /** Open items (missing, verify, pending or blocked). */
  open: number;
}
export interface DualReadiness {
  clinical: ReadinessTrack;
  administrative: ReadinessTrack;
  /** Readiness is never an approval and never a medical necessity finding. */
  note: string;
}
