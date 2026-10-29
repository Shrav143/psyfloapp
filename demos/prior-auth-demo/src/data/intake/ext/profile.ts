import { DAY, HOUR, longDate } from "@/lib/time";
import type { BuiltInPayerId, PayerId } from "../../types";
import { LEGACY_LAST_DAY, requirementsFor, vaDate, type PolicyRule } from "../../va/policy";
import { vaPlanOf } from "../../va/plans";
import { serviceById } from "../../va/services";
import type { EligibilityCheck, FieldState, FieldValue, IntakeRecord, SourceRef, Suggestion } from "../types";

/* Patient profile, coverage and eligibility seed, and the simulated payer system the Identity & Eligibility Agent (Verify) "calls".
   Nothing here is a live payer response: every result is built from PAYER_FILES and the policy rules, and the screens label it simulated.
   Member IDs are masked; legal names are synthetic and appear only in the legal-name field. */

/** What the simulated eligibility system holds for a member. Records not listed are active with the plan on file. */
interface PayerFile {
  payerId: BuiltInPayerId;
  status: "active" | "inactive" | "uncertain";
  from: string;
  to?: string;
  note?: string;
}
const PAYER_FILES: Record<string, PayerFile> = {
  /* Scenario A: Sentara since the Aetna coverage on the 2025 EMR record ended. */
  "IN-3101": { payerId: "summit", status: "active", from: "2026-07-01" },
  "IN-3102": { payerId: "cardinal", status: "active", from: "2024-03-01" },
  "IN-3103": { payerId: "evergreen", status: "active", from: "2025-09-01" },
  "IN-3104": { payerId: "beacon", status: "active", from: "2026-02-01" },
  "IN-3110": { payerId: "cardinal", status: "active", from: "2025-04-01" },
  "IN-3112": { payerId: "summit", status: "inactive", from: "2025-10-01", to: "2026-09-30", note: "Sentara Community Plan coverage ended 09/30/2026. The member's annual Medicaid renewal may not have been processed." },
  "IN-3115": { payerId: "beacon", status: "active", from: "2026-03-01" },
  "IN-3118": { payerId: "lakeshore", status: "uncertain", from: "2025-11-01", to: "2026-10-31", note: "Enrollment with UnitedHealthcare Community Plan ends 10/31/2026 and the response shows no plan from 11/01/2026. A plan change may be pending." },
  "IN-3122": { payerId: "beacon", status: "active", from: "2023-06-01" },
};
const payerFileOf = (r: IntakeRecord): PayerFile => PAYER_FILES[r.id] ?? { payerId: (r.payerId as BuiltInPayerId | null) ?? "cardinal", status: "active", from: "2026-01-01" };
const planName = (id?: PayerId | null) => (id ? (vaPlanOf(id)?.name ?? String(id)) : "no plan");

/** The rule kinds that answer "is an authorization needed": the others (CANS, Level of Need) belong to the CANS section. */
export const AUTH_KINDS: PolicyRule["kind"][] = ["authorization", "registration", "none", "pending", "channel", "service_window"];

/** The policy date for a request: the planned start, or "now" when that is later (a service cannot start in the past). */
export const requirementDate = (r: IntakeRecord, now: number): number => Math.max(r.serviceDate, now);
export const rulesFor = (r: IntakeRecord, now: number): PolicyRule[] => requirementsFor({ serviceId: r.serviceId, payerId: r.payerId, age: r.age, serviceDate: requirementDate(r, now) });

/** The authorization requirement for the requested service, from the policy rules (not from a payer). */
export function authorizationFrom(r: IntakeRecord, rules: PolicyRule[], date: number): EligibilityCheck["authorization"] {
  if (r.legacy && r.legacy.serviceId === r.serviceId && r.legacy.authEnds >= date) return "existing";
  const has = (k: PolicyRule["kind"]) => rules.some((x) => x.kind === k);
  if (has("authorization")) return "required";
  if (has("registration")) return "registration";
  if (has("pending")) return "pending_policy";
  if (has("none")) return "not_required";
  return "unknown";
}

/** The simulated eligibility response for one record. `contractConfirmed`: the plan confirmed (Transition view, plan readiness) that its contract covers the redesigned services. */
export function simulateEligibility(r: IntakeRecord, o: { at: number; now: number; contractConfirmed: boolean }): EligibilityCheck {
  const file = payerFileOf(r);
  const svc = serviceById(r.serviceId);
  const date = requirementDate(r, o.now);
  const rules = rulesFor(r, o.now);
  const inResponse = planName(file.payerId);
  const period = { coverageFrom: vaDate(file.from), coverageTo: file.to ? vaDate(file.to) : undefined };
  const common = { simulated: true as const, checkedAt: o.at, necessity: "not_determined" as const, payerId: file.payerId, serviceId: r.serviceId, existingAuth: r.legacy ? `${r.legacy.authorizationId} through ${longDate(r.legacy.authEnds)}` : undefined, ...period };

  if (r.payerId && r.payerId !== file.payerId) {
    return {
      ...common, status: "conflict", member: "yes", benefit: "unknown", network: "unknown", authorization: "unknown", exceptions: [],
      conflicts: [`The response lists ${inResponse} for this member from ${longDate(period.coverageFrom)}. The plan on file is ${planName(r.payerId)}.`],
      notes: { member: `Eligible, but with ${inResponse}, not the plan on file.`, benefit: "Not checked until the plan is resolved.", network: "Not checked until the plan is resolved.", authorization: "Depends on the plan. Resolve the plan first." },
    };
  }
  const authorization = authorizationFrom(r, rules, date);
  const exceptions: string[] = [];
  if (r.legacy && r.legacy.authEnds < LEGACY_LAST_DAY && r.legacy.authEnds >= o.now) exceptions.push(`The current authorization ${r.legacy.authorizationId} ends ${longDate(r.legacy.authEnds)}, before ${serviceById(r.legacy.serviceId).short} retires on June 30, 2027. A renewal may be needed.`);
  if (file.status !== "active") {
    return {
      ...common, status: file.status, member: file.status === "inactive" ? "no" : "unknown", benefit: "unknown", network: "unknown", authorization, conflicts: [], exceptions: [file.note ?? "", ...exceptions].filter(Boolean),
      notes: {
        member: file.status === "inactive" ? `Not eligible on the check date. ${inResponse} coverage ended ${file.to ? longDate(vaDate(file.to)) : ""}.` : `Unclear. ${file.note ?? ""}`,
        benefit: "Not known while member eligibility is not confirmed.",
        network: "Not known while member eligibility is not confirmed.",
      },
    };
  }
  const redesign = svc.status === "redesign";
  const ended = svc.status === "retiring" && date > LEGACY_LAST_DAY;
  const benefit: EligibilityCheck["benefit"] = redesign ? "pending_policy" : ended ? "no" : "yes";
  const network: EligibilityCheck["network"] = redesign && !o.contractConfirmed ? "unknown" : "yes";
  return {
    ...common, status: "active", member: "yes", benefit, network, authorization, conflicts: [], exceptions,
    notes: {
      member: `Active with ${inResponse} from ${longDate(period.coverageFrom)}${period.coverageTo ? ` to ${longDate(period.coverageTo)}` : ", no end date listed"}.`,
      benefit: redesign ? `${svc.short} becomes a Medicaid service on July 1, 2027. ${inResponse} has not published its benefit and authorization rules for it.` : ended ? `${svc.short} ends June 30, 2027. There is no benefit after that date.` : `${svc.short} is a covered benefit for this member.`,
      network: network === "yes" ? (vaPlanOf(file.payerId)?.coverage === "ffs" ? "The clinic is an enrolled Virginia Medicaid provider." : `The clinic is in network with ${inResponse}.`) : `In network with ${inResponse} for current services. Whether the contract covers ${svc.short} is not confirmed (plan readiness).`,
    },
  };
}

/* ---------------------------------------------------------------- seed additions */

let seq = 0;
const F = (value: string, state: FieldState, at: number, by: string, source?: SourceRef, confidence?: FieldValue["confidence"]): FieldValue => ({ value, state, at, by, source, confidence });

/** Light records: a masked member ID for all but one walk-in, and identity details where a check already ran. */
const LIGHT: Record<string, { member?: string; dob?: string; name?: string; checkedAfter?: number }> = {
  "IN-3110": { member: "6620", dob: "1990-02-11", name: "Jamal Bennett", checkedAfter: 2 * HOUR },
  "IN-3111": { member: "3307" },
  "IN-3112": { member: "5182", dob: "1998-03-17", name: "Nathan Garcia", checkedAfter: 3 * DAY },
  /* IN-3113: a walk-in who did not bring a Medicaid card. No member ID yet. */
  "IN-3114": { member: "7419" },
  "IN-3115": { member: "2056", dob: "1981-06-03", name: "Helen Tran", checkedAfter: 3 * HOUR },
  "IN-3116": { member: "8143" },
  "IN-3117": { member: "9021" },
  "IN-3118": { member: "4410", dob: "1968-04-09", name: "Yvonne Ortiz", checkedAfter: DAY },
  "IN-3119": { member: "1288" },
  "IN-3120": { member: "6034" },
  "IN-3121": { member: "3765" },
  "IN-3122": { member: "5590", dob: "1979-08-30", name: "Gloria Nash", checkedAfter: DAY },
  "IN-3123": { member: "2649" },
  "IN-3124": { member: "7781" },
};

function extendLight(r: IntakeRecord): IntakeRecord {
  const x = LIGHT[r.id];
  if (!x) return r;
  const docu = r.documents[0];
  const staff = r.assignedTo;
  let next: IntakeRecord = { ...r, coverage: { ...r.coverage }, profile: { ...r.profile } };
  if (x.member) {
    if (docu) {
      const blockId = `${r.id}-ins`;
      next.documents = [{ ...docu, pages: [[...docu.pages[0], { kind: "p", id: blockId, text: `Medicaid member ID ending ${x.member} (masked in the demo).` }], ...docu.pages.slice(1)] }, ...r.documents.slice(1)];
      next.coverage.medicaidId = F(`•••• ${x.member}`, "document_extracted", r.createdAt, "reader", { kind: "document", ref: "Referral p.1", docId: docu.id, blockId, quote: `Member ID ending ${x.member}` }, "high");
    } else {
      next.coverage.medicaidId = F(`•••• ${x.member}`, "patient_reported", r.createdAt, staff, { kind: "staff", ref: "Told to staff at intake" });
    }
  }
  if (x.dob) next.profile.dob = F(x.dob, "verified", r.createdAt + HOUR, staff, { kind: "staff", ref: "Photo ID seen by staff" });
  if (x.name) next.profile.legalName = F(x.name, "verified", r.createdAt + HOUR, staff, { kind: "staff", ref: "Photo ID seen by staff" });
  if (r.legacy) next.coverage.existingAuths = F(`${r.legacy.authorizationId}: ${serviceById(r.legacy.serviceId).label}, through ${longDate(r.legacy.authEnds)}`, "verified", r.createdAt, staff, { kind: "emr", ref: "Current service record (EMR import, simulated)" });
  if (x.checkedAfter !== undefined) next = withCheck(next, r.createdAt + x.checkedAfter);
  return next;
}

function withCheck(r: IntakeRecord, at: number): IntakeRecord {
  const eligibility = simulateEligibility(r, { at, now: 0, contractConfirmed: false });
  const summary = eligibility.status === "active" ? `Member active with ${planName(eligibility.payerId)}` : eligibility.status === "inactive" ? "Coverage inactive" : "Coverage uncertain";
  return {
    ...r, eligibility,
    tasks: [...r.tasks, { id: `task-elig-${r.id}-${++seq}`, role: "eligibility", agent: "verify", action: "Check eligibility (simulated)", status: "done", section: "coverage", source: `${planName(eligibility.payerId)} eligibility response (simulated)`, at, approval: "none", result: summary }],
    audit: [...r.audit, { id: `ev-elig-${r.id}-${seq}`, at, actor: "verify", action: "Check eligibility (simulated)", detail: summary, section: "coverage", ai: true }],
  };
}

/** Scenario A: the school says Sentara, the 2025 EMR record says Aetna (ended). Two plan suggestions disagree, and Verify waits for a person. */
function scenarioA(r: IntakeRecord): IntakeRecord {
  const emr = r.documents.find((d) => d.id === "doc-a2");
  const aetna: Suggestion = {
    id: `sg-prof-a-${++seq}`, section: "coverage", field: "plan", value: planName("evergreen"), confidence: "low", agent: "reader", at: emr?.receivedAt ?? r.createdAt, status: "pending",
    source: { kind: "document", ref: "2025 EMR record", docId: "doc-a2", quote: "Coverage then: Aetna Better Health of Virginia (ended 06/30/2026)" },
    conflict: "This 2025 record says the Aetna coverage ended 06/30/2026. The school referral (10/16/2026) lists Sentara Community Plan.",
  };
  return {
    ...r,
    suggestions: [...r.suggestions, aetna],
    eligibility: { ...r.eligibility, status: "conflict", conflicts: ["The school referral (10/16/2026) lists Sentara Community Plan, member ID ending 4471. The 2025 EMR record lists Aetna Better Health of Virginia, ended 06/30/2026."] },
  };
}

/** Scenario B: identity verified at the clinic; the eligibility check from yesterday, rebuilt from the same simulation the agent runs. */
function scenarioB(r: IntakeRecord): IntakeRecord {
  const checked = r.tasks.find((t) => t.role === "eligibility")?.at ?? -DAY;
  return { ...r, eligibility: simulateEligibility(r, { at: checked, now: 0, contractConfirmed: false }) };
}

/** Scenario C: the parent gave the member ID and date of birth on the phone; the check after the fax is rebuilt from the simulation. */
function scenarioC(r: IntakeRecord): IntakeRecord {
  const at = r.eligibility.checkedAt ?? r.createdAt;
  const next: IntakeRecord = {
    ...r,
    profile: { ...r.profile, dob: F("2007-01-05", "patient_reported", r.createdAt + 30, "ml", { kind: "staff", ref: "Phone call with the parent" }) },
    coverage: { ...r.coverage, medicaidId: F("•••• 8830", "patient_reported", r.createdAt + 30, "ml", { kind: "staff", ref: "Phone call with the parent" }) },
  };
  return { ...next, eligibility: simulateEligibility(next, { at, now: 0, contractConfirmed: false }) };
}

export const extendProfile = (records: IntakeRecord[]): IntakeRecord[] => {
  seq = 0;
  return records.map((r) => (r.id === "IN-3101" ? scenarioA(r) : r.id === "IN-3102" ? scenarioB(r) : r.id === "IN-3103" ? scenarioC(r) : extendLight(r)));
};
