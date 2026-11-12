import { BASE } from "@/lib/time";
import type { PayerId } from "../types";
import { vaPlanOf } from "./plans";
import { serviceById, type AgeGroup, type VaServiceId } from "./services";

/* The policy layer. Every requirement the Intake workspace shows is a row in POLICY_RULES, matched by state, service, age group, payer or coverage
   type, provider setting and effective dates, and tied to a policy version with its status and sources. A policy change is a change to these rows,
   not to a screen. Nothing here is a final DMAS determination: final rows restate published dates and the one-pager's summary of current rules;
   draft rows come from draft service descriptions; unresolved rows say what is not known yet. */

/** Minutes on the demo clock for a calendar date (midnight, local time). */
export const vaDate = (iso: string): number => Math.round((new Date(`${iso}T00:00:00`).getTime() - BASE.getTime()) / 60_000);
/** The redesigned services start on this date; the four retiring services end the day before. */
export const REDESIGN_START = vaDate("2027-07-01");
export const LEGACY_LAST_DAY = vaDate("2027-06-30");

export type PolicyStatus = "final" | "draft" | "unresolved";
export type SourceId = "implDates" | "redesignPage" | "bhServices" | "cansNotice" | "qa2025" | "cpstDraft" | "schoolDraft" | "cscDraft" | "onePager";

export interface PolicySource {
  id: SourceId;
  title: string;
  /** Only official addresses that were given or found; drafts point at the DMAS redesign page where they are posted. */
  url?: string;
  date?: string;
  kind: "bulletin" | "page" | "notice" | "qa" | "draft" | "psyflo";
}

export const SOURCES: Record<SourceId, PolicySource> = {
  implDates: { id: "implDates", title: "DMAS bulletin: Behavioral Health Services Redesign implementation dates", url: "https://vamedicaid.dmas.virginia.gov/bulletin/behavioral-health-services-redesign-implementation-dates", date: "2026", kind: "bulletin" },
  redesignPage: { id: "redesignPage", title: "DMAS: Medicaid Behavioral Health Services Redesign", url: "https://www.dmas.virginia.gov/for-providers/benefits-services-for-providers/behavioral-health/medicaid-behavioral-health-services-redesign/", kind: "page" },
  bhServices: { id: "bhServices", title: "DMAS: Behavioral health services for providers", url: "https://www.dmas.virginia.gov/for-providers/benefits-services-for-providers/behavioral-health/", kind: "page" },
  cansNotice: { id: "cansNotice", title: "Virginia Regulatory Town Hall: CANS Lifetime public notice", url: "https://www.townhall.virginia.gov/L/ViewNotice.cfm?GNid=3488", kind: "notice" },
  qa2025: { id: "qa2025", title: "DMAS redesign public webinar Q&A (July 21, 2025; dated, written for the earlier July 1, 2026 start)", url: "https://www.dmas.virginia.gov/media/nerh4wp0/redesign-public-webinar-qa-7212025.pdf", date: "2025-07-21", kind: "qa" },
  cpstDraft: { id: "cpstDraft", title: "Revised draft CPST service description (posted for comment June 9, 2026)", date: "2026-06-09", kind: "draft" },
  schoolDraft: { id: "schoolDraft", title: "Revised draft CPST: Youth, School Setting service description (posted for comment September 2, 2026)", date: "2026-09-02", kind: "draft" },
  cscDraft: { id: "cscDraft", title: "Draft Coordinated Specialty Care service description (comment period October 28 to November 17, 2025)", date: "2025-10-28", kind: "draft" },
  onePager: { id: "onePager", title: "Psyflo one-pager: Virginia's behavioral health redesign (Fall 2026), from DMAS bulletins and provider manual appendices as of October 2026", date: "2026-10", kind: "psyflo" },
};

export type PolicyVersionId = "va-bh-current" | "va-bh-redesign-2027";
export interface PolicyVersion {
  id: PolicyVersionId;
  label: string;
  /** null: in effect now. */
  effectiveFrom: string | null;
  effectiveTo?: string;
  status: PolicyStatus;
  statusNote: string;
  sources: SourceId[];
}

export const POLICY_VERSIONS: Record<PolicyVersionId, PolicyVersion> = {
  "va-bh-current": {
    id: "va-bh-current",
    label: "Virginia Medicaid behavioral health, current services",
    effectiveFrom: null,
    status: "final",
    statusNote: "In effect. Summarized from DMAS bulletins and provider manual appendices as of October 2026; check DMAS for the latest.",
    sources: ["onePager", "bhServices"],
  },
  "va-bh-redesign-2027": {
    id: "va-bh-redesign-2027",
    label: "Behavioral Health Services Redesign",
    effectiveFrom: "2027-07-01",
    status: "draft",
    statusNote: "The dates are published (the 2026 Appropriation Act moved the start from July 1, 2026 to July 1, 2027). Service descriptions are drafts; the CANS Lifetime items and the Level of Need model are not final.",
    sources: ["implDates", "redesignPage", "cansNotice", "cpstDraft", "schoolDraft", "cscDraft", "qa2025"],
  },
};

export type ReqKind = "authorization" | "registration" | "none" | "assessment" | "level_of_need" | "channel" | "service_window" | "pending";
export type CoverageType = "mco" | "ffs" | "unknown";

export interface PolicyRule {
  id: string;
  state: "VA";
  services: VaServiceId[] | "all";
  ages?: AgeGroup[];
  coverage?: CoverageType[];
  payers?: PayerId[];
  setting?: ("community" | "school" | "facility" | "clinic" | "any")[];
  /** ISO dates; open-ended when left out. */
  from?: string;
  to?: string;
  version: PolicyVersionId;
  status: PolicyStatus;
  kind: ReqKind;
  label: string;
  detail: string;
  timing?: string;
  reviewer?: "plan" | "plan_or_acentra" | "acentra";
  source: SourceId;
}

const ARTS: VaServiceId[] = ["arts-res", "arts-wm", "arts-iop", "arts-php"];
const LEGACY: VaServiceId[] = ["iih", "tdt", "mhss", "psr"];
const CPST: VaServiceId[] = ["cpst-adult", "cpst-youth", "cpst-school"];
const NEW: VaServiceId[] = [...CPST, "csc", "clubhouse"];

export const POLICY_RULES: PolicyRule[] = [
  /* current services, from the one-pager's table */
  { id: "arts-auth", state: "VA", services: ARTS, version: "va-bh-current", status: "final", kind: "authorization", label: "Initial and continued-stay authorization", detail: "ARTS residential (ASAM 3.1 to 3.7), IOP and PHP need an initial authorization and a continued-stay authorization.", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "mh-iop-php-auth", state: "VA", services: ["mh-iop", "mh-php"], version: "va-bh-current", status: "final", kind: "authorization", label: "Service authorization", detail: "Mental health IOP and PHP need a service authorization, requested within 1 business day of admission.", timing: "Within 1 business day of admission", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "act-auth", state: "VA", services: ["act"], version: "va-bh-current", status: "final", kind: "authorization", label: "Service authorization", detail: "Assertive Community Treatment needs a service authorization.", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "aba-auth", state: "VA", services: ["aba"], version: "va-bh-current", status: "final", kind: "authorization", label: "Service authorization (assessment codes exempt)", detail: "ABA treatment needs a service authorization. Assessment codes are exempt.", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "mhcm-reg", state: "VA", services: ["mhcm"], version: "va-bh-current", status: "final", kind: "registration", label: "Registration", detail: "Mental health case management is registered, not authorized, within 1 business day.", timing: "Within 1 business day", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "crisis-reg", state: "VA", services: ["crisis"], version: "va-bh-current", status: "final", kind: "registration", label: "Registration", detail: "Mobile crisis and 23-hour crisis stabilization are registered within 1 business day.", timing: "Within 1 business day", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "opt-ffs", state: "VA", services: ["opt"], coverage: ["ffs"], version: "va-bh-current", status: "final", kind: "none", label: "No authorization (fee-for-service)", detail: "Outpatient therapy needs no authorization under fee-for-service.", source: "onePager" },
  { id: "opt-mco", state: "VA", services: ["opt"], coverage: ["mco", "unknown"], version: "va-bh-current", status: "unresolved", kind: "pending", label: "Plan rules vary", detail: "Outpatient therapy rules vary by MCO. Confirm with the member's Cardinal Care plan.", reviewer: "plan", source: "onePager" },
  { id: "legacy-auth", state: "VA", services: LEGACY, to: "2027-06-30", version: "va-bh-current", status: "final", kind: "authorization", label: "Service authorization", detail: "IIH, TDT, MHSS and PSR need a service authorization while they are in effect.", reviewer: "plan_or_acentra", source: "onePager" },
  { id: "legacy-end", state: "VA", services: LEGACY, version: "va-bh-redesign-2027", status: "final", kind: "service_window", label: "Service ends June 30, 2027", detail: "DMAS retires Intensive In-Home Services, Therapeutic Day Treatment, Mental Health Skill-Building and Psychosocial Rehabilitation on June 30, 2027. A legacy service does not map to one replacement; each person needs a clinical review of what fits next.", timing: "Last day June 30, 2027", source: "implDates" },
  { id: "ffs-channel", state: "VA", services: "all", coverage: ["ffs"], version: "va-bh-current", status: "final", kind: "channel", label: "Fee-for-service requests go to Acentra", detail: "Since August 3, 2026, fee-for-service authorizations go through Atrezzo Next Generation in the DMAS Medicaid Enterprise System (MES) portal.", reviewer: "acentra", source: "onePager" },
  { id: "mhcm-update", state: "VA", services: ["mhcm"], from: "2027-07-01", version: "va-bh-redesign-2027", status: "unresolved", kind: "pending", label: "Updated case management policy", detail: "Mental Health Case Management policy is being updated with the redesign. The updated requirements are not loaded.", source: "implDates" },
  /* the redesign */
  { id: "new-start", state: "VA", services: NEW, version: "va-bh-redesign-2027", status: "final", kind: "service_window", label: "Starts July 1, 2027", detail: "CPST (Adult, Community; Youth, Community; Youth, School Setting), Coordinated Specialty Care for First Episode Psychosis and Mental Health Clubhouse start on July 1, 2027. They cannot be delivered or authorized before then, and a published draft is not in effect.", timing: "First day July 1, 2027", source: "implDates" },
  { id: "new-auth", state: "VA", services: NEW, from: "2027-07-01", version: "va-bh-redesign-2027", status: "unresolved", kind: "pending", label: "Authorization requirements pending", detail: "Authorization and registration requirements for the redesigned services are not final for each Cardinal Care MCO and fee-for-service. Psyflo will not assume them.", reviewer: "plan_or_acentra", source: "redesignPage" },
  { id: "cans-cpst-csc", state: "VA", services: [...CPST, "csc"], from: "2027-07-01", version: "va-bh-redesign-2027", status: "draft", kind: "assessment", label: "CANS Lifetime assessment", detail: "Published redesign materials associate the Virginia Comprehensive Assessment of Needs and Strengths (CANS Lifetime), for youth and adults, with CPST and CSC. The official items, scoring, age applicability, frequency and assessor qualifications are not loaded.", source: "implDates" },
  { id: "cans-club", state: "VA", services: ["clubhouse"], from: "2027-07-01", version: "va-bh-redesign-2027", status: "unresolved", kind: "assessment", label: "CANS Lifetime: not confirmed for Clubhouse", detail: "A July 2025 DMAS webinar Q&A listed Clubhouse with CPST and CSC for the CANS Lifetime. Later materials associate it with CPST and CSC. Psyflo does not apply it to Clubhouse until DMAS confirms.", source: "qa2025" },
  { id: "lon-cpst", state: "VA", services: CPST, from: "2027-07-01", version: "va-bh-redesign-2027", status: "unresolved", kind: "level_of_need", label: "Level of Need Model", detail: "The Level of Need Model is part of the redesign. No validated algorithm is configured, so Psyflo shows no level.", source: "implDates" },
  { id: "lon-other", state: "VA", services: ["csc", "clubhouse"], from: "2027-07-01", version: "va-bh-redesign-2027", status: "unresolved", kind: "level_of_need", label: "Level of Need: applicability not confirmed", detail: "Whether the Level of Need Model applies to this service is not confirmed in the materials loaded.", source: "redesignPage" },
];

export interface ReqQuery {
  serviceId: VaServiceId;
  payerId?: PayerId | null;
  age?: number | null;
  setting?: "community" | "school" | "facility" | "clinic" | "any";
  /** Demo minutes of the planned service date. Requirements in effect on that date are returned. */
  serviceDate: number;
}

export const coverageOf = (payerId?: PayerId | null): CoverageType => (payerId ? (vaPlanOf(payerId)?.coverage ?? "unknown") : "unknown");
const ageGroupOf = (age?: number | null): AgeGroup | null => (age == null ? null : age < 18 ? "youth" : "adult");
const inWindow = (r: PolicyRule, date: number) => (!r.from || date >= vaDate(r.from)) && (!r.to || date <= vaDate(r.to));

/** The rules that apply to one request on one date. Rules with no window (a service's start or end) always apply, so the person sees them. */
export function requirementsFor(q: ReqQuery): PolicyRule[] {
  const cov = coverageOf(q.payerId);
  const ag = ageGroupOf(q.age);
  return POLICY_RULES.filter((r) => {
    if (r.services !== "all" && !r.services.includes(q.serviceId)) return false;
    if (r.coverage && !r.coverage.includes(cov)) return false;
    if (r.payers && (!q.payerId || !r.payers.includes(q.payerId))) return false;
    if (r.ages && ag && !r.ages.includes(ag)) return false;
    if (r.setting && q.setting && !r.setting.includes(q.setting)) return false;
    if (r.kind === "service_window") return true;
    return inWindow(r, q.serviceDate);
  });
}

/** current: today's pathways. preparation: an intake now for a redesigned service that starts later. redesign: a redesigned pathway in effect.
    transition: a person on a retiring service who needs a new pathway. */
export type PolicyPeriod = "current" | "preparation" | "redesign" | "transition";
export const PERIOD_LABEL: Record<PolicyPeriod, string> = { current: "Current workflow", preparation: "Redesign preparation", redesign: "Redesigned workflow", transition: "Transitioning existing patient" };

/** `now` is the demo clock, or July 1, 2027 when the policy preview is on. */
export function periodOf(serviceId: VaServiceId, serviceDate: number, now: number, legacyClient = false): PolicyPeriod {
  const s = serviceById(serviceId);
  if (legacyClient || (s.status === "retiring" && serviceDate > LEGACY_LAST_DAY)) return "transition";
  if (s.status === "redesign") return now >= REDESIGN_START && serviceDate >= REDESIGN_START ? "redesign" : "preparation";
  if (s.status === "retiring") return "current";
  return serviceDate >= REDESIGN_START && now >= REDESIGN_START ? "redesign" : "current";
}

/** Whether the service can be delivered on that date: a redesigned service only from July 1, 2027, a retiring one only through June 30, 2027. */
export function availableOn(serviceId: VaServiceId, date: number): boolean {
  const s = serviceById(serviceId);
  if (s.status === "redesign") return date >= REDESIGN_START;
  if (s.status === "retiring") return date <= LEGACY_LAST_DAY;
  return true;
}

export type CansApplies = "required" | "not_applicable" | "unresolved" | "upcoming";
/** Whether the CANS Lifetime section shows. Never for IOP, PHP, residential SUD, ABA or other services; unresolved for Clubhouse. */
/** Whether the CANS Lifetime applies. Before July 1, 2027 ("now", the policy date) it is preparation only ("upcoming"), even for a service that
    starts later: nothing can be rated before the assessment is in effect. Without `now`, only the planned start decides. */
export function cansFor(serviceId: VaServiceId, serviceDate: number, now?: number): { applies: CansApplies; rule?: PolicyRule } {
  const rule = POLICY_RULES.find((r) => r.kind === "assessment" && r.services !== "all" && r.services.includes(serviceId));
  if (!rule) return { applies: "not_applicable" };
  if (rule.status === "unresolved") return { applies: "unresolved", rule };
  const inEffect = serviceDate >= REDESIGN_START && (now === undefined || now >= REDESIGN_START);
  return { applies: inEffect ? "required" : "upcoming", rule };
}

export function lonFor(serviceId: VaServiceId): { applies: "yes" | "unresolved" | "no"; rule?: PolicyRule } {
  const rule = POLICY_RULES.find((r) => r.kind === "level_of_need" && r.services !== "all" && r.services.includes(serviceId));
  if (!rule) return { applies: "no" };
  return { applies: rule.id === "lon-cpst" ? "yes" : "unresolved", rule };
}

/** What only DMAS can settle. Shown in the policy panel and in the implementation notes. */
export const UNRESOLVED: { id: string; text: string; source: SourceId }[] = [
  { id: "cans-items", text: "The official CANS Lifetime domains, items, scoring options, age applicability, assessment frequency and assessor qualifications. The DMAS reference guide and documentation template are not loaded.", source: "cansNotice" },
  { id: "lon-algorithm", text: "The Level of Need Model's algorithm and thresholds. A July 2025 DMAS Q&A described tentative levels; Psyflo does not calculate a level from them.", source: "qa2025" },
  { id: "new-auth", text: "Authorization and registration requirements for CPST, CSC and Clubhouse under each Cardinal Care MCO and fee-for-service.", source: "redesignPage" },
  { id: "club-cans", text: "Whether Mental Health Clubhouse requires the CANS Lifetime.", source: "qa2025" },
  { id: "mhcm-policy", text: "The updated Mental Health Case Management policy.", source: "implDates" },
  { id: "mapping", text: "How each retiring service's clients move to new services. There is no one-to-one mapping; each person needs a clinical review.", source: "implDates" },
  { id: "mco-ready", text: "Whether each Cardinal Care MCO is ready for the new service codes on July 1, 2027.", source: "onePager" },
];

/** The latest Level of Need wording the screens show when no validated model is configured. */
export const LON_PENDING = "Level of Need determination pending validated policy configuration.";
export const CANS_PENDING = "Awaiting official DMAS CANS Lifetime item mapping. Items, scoring options and instructions load from the state's reference guide when it is configured.";
