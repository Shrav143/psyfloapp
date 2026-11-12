import type { EligibilityCheck, FieldState, IntakeRecord, SourceRef } from "@/data/intake/types";
import type { PayerId, Tone } from "@/data/types";
import { VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { longDate } from "@/lib/time";
import type { CoverageFollowUp } from "@/store/intakeProfile";

/* What the Identity & Eligibility Agent needs before it checks, which insurance records disagree, and what it asks staff to follow up. */

export interface PrecheckItem {
  key: "medicaidId" | "dob" | "legalName" | "plan";
  label: string;
  state: "done" | "missing" | "warn";
  detail: string;
  /** Missing items keep the agent blocked; warnings let it run. */
  blocks: boolean;
  section: "profile" | "coverage";
}

export interface PlanCandidate {
  payerId: PayerId;
  name: string;
  from: "on_file" | "suggestion" | "response";
  source?: SourceRef;
  note?: string;
  state?: FieldState;
  at?: number;
}

const planByName = (name?: string) => (name ? VA_PLANS.find((p) => p.name === name) : undefined);

/** Every distinct plan the record points to: the plan on file, plans waiting as suggestions, and the plan in the last response. Two or more is a conflict. */
export function planCandidates(r: IntakeRecord): PlanCandidate[] {
  const out: PlanCandidate[] = [];
  const add = (c: PlanCandidate) => {
    if (!out.some((x) => x.payerId === c.payerId)) out.push(c);
  };
  r.suggestions
    .filter((x) => x.status === "pending" && x.section === "coverage" && x.field === "plan")
    .forEach((x) => {
      const p = planByName(x.value);
      if (p) add({ payerId: p.payerId, name: p.name, from: "suggestion", source: x.source, note: x.conflict, at: x.at, state: "ai_suggested" });
    });
  const onFile = planByName(r.coverage.plan?.value);
  if (onFile) add({ payerId: onFile.payerId, name: onFile.name, from: "on_file", source: r.coverage.plan.source, state: r.coverage.plan.state, at: r.coverage.plan.at });
  else if (r.payerId && !out.length) add({ payerId: r.payerId, name: vaPlanOf(r.payerId)?.name ?? String(r.payerId), from: "on_file", note: "On the intake record" });
  const e = r.eligibility;
  if (e.payerId && e.checkedAt !== undefined && e.status !== "not_checked") add({ payerId: e.payerId, name: vaPlanOf(e.payerId)?.name ?? String(e.payerId), from: "response", source: { kind: "payer", ref: "Eligibility response (simulated)" }, at: e.checkedAt, note: e.coverageFrom !== undefined ? `Enrolled from ${longDate(e.coverageFrom)}${e.coverageTo !== undefined ? ` to ${longDate(e.coverageTo)}` : ""}` : undefined });
  return out;
}
export const hasPlanConflict = (r: IntakeRecord): boolean => planCandidates(r).length > 1;

const present = (r: IntakeRecord, section: "profile" | "coverage", key: string) => {
  const fv = r[section][key];
  return fv && fv.value.trim() && fv.state !== "not_collected" && fv.state !== "not_applicable" ? fv : undefined;
};

/** Enough to verify: a member ID, a date of birth and a legal name, and no open disagreement about the plan. */
export function precheck(r: IntakeRecord): { items: PrecheckItem[]; ready: boolean; missing: string[] } {
  const id = present(r, "coverage", "medicaidId");
  const dob = present(r, "profile", "dob");
  const name = present(r, "profile", "legalName");
  const unsure = (s: FieldState) => s === "needs_confirmation" || s === "ai_suggested";
  const conflict = hasPlanConflict(r);
  const plan = planByName(r.coverage.plan?.value) ?? (r.payerId ? vaPlanOf(r.payerId) : undefined);
  const items: PrecheckItem[] = [
    { key: "medicaidId", label: "Medicaid member ID", section: "coverage", blocks: !id, state: !id ? "missing" : unsure(id.state) ? "warn" : "done", detail: !id ? "Missing" : unsure(id.state) ? `${id.value}, needs confirmation` : id.value },
    { key: "dob", label: "Date of birth", section: "profile", blocks: !dob, state: !dob ? "missing" : unsure(dob.state) ? "warn" : "done", detail: !dob ? "Missing" : unsure(dob.state) ? `${dob.value}, needs confirmation` : dob.value },
    { key: "legalName", label: "Legal name", section: "profile", blocks: !name, state: !name ? "missing" : unsure(name.state) ? "warn" : "done", detail: !name ? "Missing" : unsure(name.state) ? "On file, needs confirmation before relying on the result" : "On file" },
    { key: "plan", label: "Current plan", section: "coverage", blocks: conflict, state: conflict ? "missing" : plan ? "done" : "warn", detail: conflict ? "Insurance records disagree. Choose the current plan first." : plan ? plan.name : "Not on file. The response will list the plan." },
  ];
  const missing = items.filter((i) => i.blocks).map((i) => (i.key === "plan" ? "the current plan" : i.label.toLowerCase().replace("medicaid member id", "Medicaid member ID")));
  return { items, ready: !missing.length, missing };
}

export const STATUS_WORD: Record<EligibilityCheck["status"], string> = { not_checked: "Not checked", checking: "Checking", active: "Active", inactive: "Inactive", uncertain: "Uncertain", conflict: "Conflict" };
export const STATUS_TONE: Record<EligibilityCheck["status"], Tone> = { not_checked: "neutral", checking: "neutral", active: "good", inactive: "risk", uncertain: "mid", conflict: "risk" };

/** The follow-ups Verify creates after a check, for what is missing, conflicting or not confirmed. */
export function followUpsAfterCheck(r: IntakeRecord, c: EligibilityCheck): CoverageFollowUp[] {
  const plan = vaPlanOf(c.payerId ?? r.payerId ?? "")?.name ?? "the plan";
  const svc = serviceById(r.serviceId);
  const who = r.age !== null && r.age < 18 ? "guardian" : "patient";
  const out: CoverageFollowUp[] = [];
  const result = "Created by Verify after the eligibility check (simulated)";
  if (c.status === "inactive") out.push({ action: `Ask the ${who} about the Medicaid renewal or new coverage: ${plan} coverage ended${c.coverageTo !== undefined ? ` ${longDate(c.coverageTo)}` : ""}`, result });
  if (c.status === "uncertain") out.push({ action: `Call ${plan} to confirm coverage${c.coverageTo !== undefined ? ` after ${longDate(c.coverageTo)}` : ""}`, result });
  if (c.status === "conflict") out.push({ action: `Confirm the current plan with the ${who}`, result });
  if (c.status === "active" && c.network === "unknown") out.push({ action: `Confirm ${plan} network participation for ${svc.short}`, result });
  if (c.status === "active" && (c.benefit === "pending_policy" || c.authorization === "pending_policy")) out.push({ action: `Confirm ${plan}'s benefit and authorization rules for ${svc.short} before July 1, 2027`, result });
  if (r.profile.legalName?.state === "needs_confirmation") out.push({ action: `Confirm the legal name with the ${who}`, result });
  return out;
}
