import type { CaseDraft } from "@/data/cases";
import { completeness, isOpen, readiness, type CheckItem, type Readiness } from "@/data/intake/checklist";
import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import { siteName } from "@/data/sites";
import { NOTE_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import type { Program } from "@/data/types";
import { cansFor, lonFor, LON_PENDING, PERIOD_LABEL, periodOf, type PolicyRule } from "@/data/va/policy";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate, toDate } from "@/lib/time";

/* The handoff packet, built from the record every time it is shown, so the draft never goes stale. It carries what the authorization workflow
   needs and what is still open; it is a draft for New Case, never a request to a payer. */

/** New Case's level of care for the services it already handles. Every other service goes over with its label (another engineer is widening Program). */
export const PROGRAM_OF: Partial<Record<VaServiceId, Program>> = { "arts-res": "RES", "arts-wm": "WM", "arts-iop": "IOP", "mh-iop": "IOP", "arts-php": "PHP", "mh-php": "PHP" };

const valueOf = (r: IntakeRecord, s: "referral" | "profile" | "coverage", k: string): string => r[s][k]?.value ?? "";
const name = (id?: string) => (id ? staffOf(id)?.name ?? id : undefined);
const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface Packet {
  readiness: Readiness;
  lines: [string, string][];
  requirements: PolicyRule[];
  documents: string[];
  open: CheckItem[];
}

export function packetOf(r: IntakeRecord, now: number): Packet {
  const rd = readiness(r, now);
  const svc = serviceById(rd.serviceId);
  const plan = r.payerId ? vaPlanOf(r.payerId) : undefined;
  const sel = r.pathways.find((p) => p.status === "selected");
  const cans = cansFor(rd.serviceId, r.serviceDate, now).applies;
  const lon = lonFor(rd.serviceId).applies;
  const a = r.assessment;
  const scribe = r.scribe ? NOTE_SECTIONS.filter((s) => r.scribe?.noteDraft[s.id]).length : 0;
  const lines: [string, string][] = [
    ["Patient", r.initials ? `${r.initials}${r.age !== null ? `, ${r.age}` : ""} (privacy mode)` : "Not entered"],
    ["Service", `${svc.label}${svc.code ? ` (${svc.code})` : ""}${rd.selected ? "" : ", requested; no pathway selected yet"}`],
    ["Plan", plan ? `${plan.name}. Reviewer: ${plan.reviewer}. Channel: ${plan.channel}` : "No plan on file"],
    ["Planned start", `${longDate(r.serviceDate)} · ${PERIOD_LABEL[periodOf(rd.serviceId, r.serviceDate, now, !!r.legacy)]}`],
    ["Provider", `Psyflo demo clinic, ${siteName(r.site)} (synthetic). Clinician: ${staffOf(CLINICIAN_AT[r.site])?.name ?? "not set"}${staffOf(CLINICIAN_AT[r.site])?.credentials ? `, ${staffOf(CLINICIAN_AT[r.site])?.credentials}` : ""}. Intake coordinator: ${name(r.assignedTo) ?? "unassigned"}`],
    ["Referral", `${valueOf(r, "referral", "sourceOrg") || r.sourceOrg}${valueOf(r, "referral", "referringClinician") ? `, ${valueOf(r, "referral", "referringClinician")}` : ""}`],
    ["Assessment", a.status === "signed" ? `Attested by ${name(a.attestation?.by) ?? "a clinician"}` : a.status === "awaiting_review" ? "Waits for attestation" : a.status === "in_progress" ? "In progress, not attested" : "Not started"],
    ["AI drafts", scribe ? `AI Scribe note with ${scribe} sections (${r.scribe?.status === "saved" ? "reviewed" : "waits for review"})` : "None"],
    ["Pathway", sel ? `${sel.serviceId === "external" ? sel.externalLabel ?? "External program" : serviceById(sel.serviceId).short}, selected by ${name(sel.decidedBy) ?? "a clinician"}` : "No option selected"],
    ["CANS Lifetime", cans === "not_applicable" ? "Not applicable" : cans === "unresolved" ? "Not confirmed for this service (unresolved)" : cans === "upcoming" ? "From July 1, 2027 (draft policy); preparation only today" : r.cans?.status === "signed" ? "Signed" : "Pending DMAS configuration"],
    ["Level of Need", lon === "no" ? "Not applicable" : lon === "unresolved" ? "Applicability not confirmed" : r.lon?.status === "dispositioned" ? "Clinician disposition recorded; no level calculated" : cans === "upcoming" ? `Preparation only until July 1, 2027. ${LON_PENDING}` : LON_PENDING],
    ["Supporting records", r.documents.length ? r.documents.map((d) => `${d.name}${d.simulated ? " (simulated import)" : ""}`).join("; ") : "None on file"],
  ];
  if (r.legacy) lines.splice(4, 0, ["Current service", `${serviceById(r.legacy.serviceId).label} (${serviceById(r.legacy.serviceId).code ?? "code not loaded"}), authorization ${r.legacy.authorizationId} through ${longDate(r.legacy.authEnds)}`]);
  return {
    readiness: rd,
    lines,
    requirements: rd.rules,
    documents: r.documents.map((d) => `${d.name}${d.simulated ? " (simulated import)" : ""}`),
    open: completeness(r, now).filter((i) => isOpen(i.status)),
  };
}

/** The status word for a policy row. Draft and unresolved rows stay labeled as such everywhere. */
export const ruleStatusLabel = (r: Pick<PolicyRule, "status">): string => (r.status === "final" ? "Final" : r.status === "draft" ? "Draft" : "Unresolved");

/** What New Case starts from. Intake never submits anything: New Case prepares the request and a person signs and sends it there. */
export function caseDraftInit(r: IntakeRecord, now: number): Partial<CaseDraft> {
  const rd = readiness(r, now);
  const svc = serviceById(rd.serviceId);
  const program = PROGRAM_OF[rd.serviceId] ?? null;
  const plan = r.payerId ? vaPlanOf(r.payerId) : undefined;
  const member = valueOf(r, "coverage", "medicaidId").replace(/[^0-9A-Za-z]/g, "").slice(-4);
  return {
    patient: { initials: r.initials, age: r.age },
    payerId: r.payerId,
    site: r.site,
    referrer: { org: valueOf(r, "referral", "sourceOrg") || r.sourceOrg, clinician: valueOf(r, "referral", "referringClinician") },
    reason: valueOf(r, "referral", "reason") || r.title,
    started: true,
    phase: "intake",
    program,
    ...(program ? {} : { what: `${svc.label} request`, levelLabel: svc.label }),
    state: "Virginia",
    memberId: member ? `…${member}` : "",
    planType: plan ? (plan.coverage === "ffs" ? "Fee-for-service" : "HMO") : "",
    startDate: iso(r.serviceDate),
  };
}
