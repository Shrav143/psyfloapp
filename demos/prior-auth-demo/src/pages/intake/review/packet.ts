import { completeness, isOpen, readiness, type CheckItem, type Readiness } from "@/data/intake/checklist";
import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import { siteName } from "@/data/sites";
import { NOTE_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import { cansFor, lonFor, LON_PENDING, PERIOD_LABEL, periodOf, type PolicyRule } from "@/data/va/policy";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { longDate } from "@/lib/time";

/* The handoff packet, built from the record every time it is shown, so the draft never goes stale. It carries what the authorization workflow
   needs and what is still open; it is a draft for New Case, never a request to a payer. */

const valueOf = (r: IntakeRecord, s: "referral" | "profile" | "coverage", k: string): string => r[s][k]?.value ?? "";
const name = (id?: string) => (id ? staffOf(id)?.name ?? id : undefined);
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
