import { longDate } from "@/lib/time";
import { availableOn, cansFor, CANS_PENDING, LEGACY_LAST_DAY, lonFor, LON_PENDING, REDESIGN_START, requirementsFor, type PolicyRule } from "../va/policy";
import { vaPlanOf } from "../va/plans";
import { serviceById, type VaServiceId } from "../va/services";
import { FIELD_SPECS, isRequired, specOf, type FieldSection } from "./fields";
import { staffOf } from "./seed";
import { ASSESSMENT_SECTIONS, REFERRAL_OUT_LABEL, TRIAGE_LABEL, type FieldValue, type IntakeRecord, type IntakeSectionId, type Suggestion } from "./types";

/* Intake completeness and authorization readiness, derived from the record on every render, so the checklist follows each field edit at once.
   Completeness asks "is the intake done?"; readiness asks "does this service need an authorization, and does the authorization workflow
   have what it needs?". Neither is an approval: the payer decides. Nothing here is a policy rule; requirements come from requirementsFor(). */

/** "later": applies from a future date (the CANS Lifetime and Level of Need before July 1, 2027); nothing to do yet, and not "not applicable". */
export type CheckStatus = "complete" | "missing" | "verify" | "na" | "later" | "blocked" | "pending";
export const CHECK_LABEL: Record<CheckStatus, string> = {
  complete: "Complete", missing: "Missing", verify: "Needs verification", na: "Not applicable", later: "From July 1, 2027", blocked: "Blocked", pending: "Pending approval",
};
/** Open means a person still has something to do. */
export const isOpen = (s: CheckStatus): boolean => s !== "complete" && s !== "na" && s !== "later";

/** The client's twelve checklist categories, plus Safety. Items are built per section, then filed under these (`fileUnder`). */
export type CheckCategory = "patient" | "referral" | "consent" | "coverage" | "assessment" | "cans" | "lon" | "service" | "signatures" | "documents" | "disposition" | "handoff" | "safety";
export const CATEGORY_ORDER: CheckCategory[] = ["patient", "referral", "consent", "coverage", "assessment", "cans", "lon", "service", "signatures", "documents", "disposition", "handoff", "safety"];
export const CATEGORY_LABEL: Record<CheckCategory, string> = {
  patient: "Patient information", referral: "Referral information", consent: "Consent", coverage: "Coverage verification", assessment: "Clinical assessment",
  cans: "CANS (when applicable)", lon: "Level of Need (when applicable)", service: "Service selection", signatures: "Required signatures",
  documents: "Supporting documents", disposition: "Referral disposition", handoff: "Authorization handoff", safety: "Safety",
};
const CONSENT_FIELDS = new Set(["field:profile.consentTreatment", "field:profile.roi", "field:profile.schoolConsent"]);
/** Where an item is filed, by its id. Items not listed keep the category they were built with. */
function fileUnder(i: CheckItem): CheckCategory {
  if (CONSENT_FIELDS.has(i.id)) return "consent";
  if (i.id === "docs") return "documents";
  if (i.id === "triage" || i.id.startsWith("ref-out:")) return "disposition";
  if (i.id === "assess-sign") return "signatures";
  if (i.id === "lon") return "lon";
  if (i.id === "pathway" || i.id === "service-date") return "service";
  return i.category;
}

export interface CheckItem {
  id: string;
  category: CheckCategory;
  label: string;
  status: CheckStatus;
  /** Where the person fixes it. */
  section: IntakeSectionId;
  field?: string;
  panel?: "scribe" | "voice";
  detail: string;
  /** Part of what the authorization workflow needs (readiness), not only of a complete intake. */
  auth?: boolean;
}

const SECTION_CATEGORY: Record<FieldSection, CheckCategory> = { referral: "referral", profile: "patient", coverage: "coverage" };
/** Fields the authorization workflow needs from the intake. The rest make the intake complete. */
const AUTH_FIELDS = new Set(["reason", "dob", "guardianName", "consentTreatment", "medicaidId", "plan", "coverageType"]);
/** Values that are on file but mean "not yet". */
const NOT_YET: Record<string, Record<string, CheckStatus>> = {
  consentTreatment: { "Not obtained": "missing", "Verbal, to be signed": "verify" },
  schoolConsent: { Needed: "missing" },
};
const DOC_METHODS = new Set(["upload", "fax", "email", "emr", "webform"]);

const who = (id: string): string => staffOf(id)?.name ?? (id === "system" ? "Psyflo" : id.charAt(0).toUpperCase() + id.slice(1));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[], max = 3) => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} and ${xs.length - max} more`);

/** The status of one field value, from its provenance. A value an agent extracted is never complete until a person reviews it. */
export function fieldStatus(fv: FieldValue | undefined, key?: string): { status: CheckStatus; detail: string } {
  if (!fv || fv.state === "not_collected" || (!fv.value && fv.state !== "not_applicable")) return { status: "missing", detail: "Not collected" };
  if (fv.state === "not_applicable") return { status: "na", detail: "Marked not applicable" };
  const notYet = key ? NOT_YET[key]?.[fv.value] : undefined;
  if (notYet) return { status: notYet, detail: `On file as "${fv.value}"` };
  switch (fv.state) {
    case "verified":
      return { status: "complete", detail: `Verified${fv.reviewedBy ? ` by ${who(fv.reviewedBy)}` : fv.by ? ` by ${who(fv.by)}` : ""}` };
    case "patient_reported":
      return { status: "complete", detail: "Patient reported" };
    case "document_extracted":
      return { status: "verify", detail: `Extracted from ${fv.source?.ref ?? "a document"}; a person confirms it` };
    case "ai_suggested":
      return { status: "verify", detail: "AI suggested; a person confirms it" };
    default:
      return { status: "verify", detail: "Needs confirmation" };
  }
}

const pendingIn = (r: IntakeRecord, section: IntakeSectionId): Suggestion[] => r.suggestions.filter((s) => s.section === section && s.status === "pending");
const fieldMap = (r: IntakeRecord, s: FieldSection) => r[s];

/** The service the authorization would be for: the pathway a clinician selected, or the requested service while none is selected. */
export function serviceFor(r: IntakeRecord): { serviceId: VaServiceId; selected: boolean } {
  const sel = r.pathways.find((p) => p.status === "selected" && p.serviceId !== "external");
  return sel && sel.serviceId !== "external" ? { serviceId: sel.serviceId, selected: true } : { serviceId: r.serviceId, selected: false };
}

function fieldItems(r: IntakeRecord, section: FieldSection, schoolBased: boolean): CheckItem[] {
  const items: CheckItem[] = [];
  const pending = pendingIn(r, section);
  const ctx = { age: r.age, schoolBased };
  for (const spec of FIELD_SPECS.filter((f) => f.section === section && isRequired(f, ctx))) {
    const sg = pending.find((s) => s.field === spec.key);
    const base = fieldStatus(fieldMap(r, section)[spec.key], spec.key);
    const why = spec.required === "minor" ? "Required for a person under 18" : spec.required === "school" ? "Required for a school-based service" : "Required";
    items.push({
      id: `field:${section}.${spec.key}`, category: SECTION_CATEGORY[section], label: spec.label, section, field: spec.key, auth: AUTH_FIELDS.has(spec.key),
      ...(sg
        ? { status: "pending" as const, detail: sg.conflict ? "AI suggestion waits for review; it conflicts with what is on file" : "AI suggestion waits for review" }
        : base.status === "missing"
          ? { status: "missing" as const, detail: `${why}. Not collected` }
          : base),
    });
  }
  const optional = pending.filter((s) => !items.some((i) => i.field === s.field));
  if (optional.length) {
    items.push({
      id: `sugg:${section}`, category: SECTION_CATEGORY[section], label: "AI suggestions to review", status: "pending", section,
      detail: `${plural(optional.length, "suggestion")}: ${list(optional.map((s) => specOf(s.field)?.label.toLowerCase() ?? s.field))}`,
    });
  }
  return items;
}

function referralItems(r: IntakeRecord, school: boolean): CheckItem[] {
  const t = r.triage;
  const triage: CheckItem = {
    id: "triage", category: "referral", label: "Referral disposition", section: "referral", auth: false,
    ...(t === "new" ? { status: "missing", detail: "Not triaged yet" }
      : t === "needs_info" ? { status: "missing", detail: "Needs information from the referrer" }
        : t === "clinical_review" ? { status: "pending", detail: "A clinician reviews the referral" }
          : { status: "complete", detail: `Triaged: ${TRIAGE_LABEL[t].toLowerCase()}${r.triageNote ? `. ${r.triageNote}` : ""}` }),
  };
  const simulated = r.documents.filter((d) => d.simulated).length;
  const docs: CheckItem = {
    id: "docs", category: "referral", label: "Referral documents", section: "referral",
    ...(r.documents.length
      ? { status: "complete", detail: `${plural(r.documents.length, "document")} on the record${simulated ? ` (${simulated === r.documents.length ? "simulated imports" : `${simulated} simulated`})` : ""}` }
      : DOC_METHODS.has(r.method) ? { status: "missing", detail: "No referral document on the record" } : { status: "na", detail: "Entered by staff; no referral document" }),
  };
  return [...fieldItems(r, "referral", school), triage, docs];
}

function patientItems(r: IntakeRecord, school: boolean): CheckItem[] {
  const identity: CheckItem = {
    id: "identity", category: "patient", label: "Initials and age (privacy mode)", section: "profile", auth: true,
    ...(r.initials && r.age !== null ? { status: "complete", detail: `${r.initials}, ${r.age}` } : { status: "missing", detail: "Every screen shows the patient by initials and age" }),
  };
  const items = [identity, ...fieldItems(r, "profile", school)];
  const v = r.voice;
  if (v && v.status !== "idle") {
    const s = v.status;
    items.push({
      id: "voice", category: "patient", label: "Voice intake draft", section: "profile", panel: "voice",
      ...(s === "saved" ? { status: "complete", detail: "Confirmed by a person and saved" }
        : s === "summary" || s === "confirm" ? { status: "pending", detail: "The coordinator confirms the summary before anything is saved" }
          : s === "escalated" || s === "transferred" ? { status: "verify", detail: "Handed to a person; finish the intake with staff" }
            : { status: "verify", detail: "Voice intake in progress (simulated)" }),
    });
  }
  return items;
}

function coverageItems(r: IntakeRecord, school: boolean, now: number): CheckItem[] {
  const plan = r.payerId ? vaPlanOf(r.payerId) : undefined;
  const items: CheckItem[] = [{
    id: "payer", category: "coverage", label: "Medicaid plan on file", section: "coverage", auth: true,
    ...(r.payerId ? { status: "complete", detail: plan?.name ?? r.payerId } : { status: "missing", detail: "No plan on file" }),
  }, ...fieldItems(r, "coverage", school)];
  const e = r.eligibility;
  items.push({
    id: "eligibility", category: "coverage", label: "Medicaid eligibility", section: "coverage",
    ...(e.status === "not_checked" ? { status: "verify", detail: "Not checked" }
      : e.status === "checking" ? { status: "verify", detail: "Checking (simulated)" }
        : e.status === "inactive" ? { status: "blocked", detail: "Not active in the simulated response. Confirm coverage before going on" }
          : e.status === "active" ? { status: "verify", detail: `Active in a simulated response${e.checkedAt !== undefined ? ` on ${longDate(e.checkedAt)}` : ""}. Confirm with the plan before relying on it` }
              : { status: "verify", detail: e.conflicts[0] ?? (e.status === "conflict" ? "Sources disagree about coverage" : "The response was uncertain (simulated)") }),
  });
  if (e.conflicts.length && e.status !== "conflict") items.push({ id: "elig-conflict", category: "coverage", label: "Coverage conflict", section: "coverage", status: "verify", detail: e.conflicts.join(" ") });
  if (r.legacy) {
    const ends = r.legacy.authEnds;
    const short = serviceById(r.legacy.serviceId).short;
    items.push({
      id: "legacy-auth", category: "coverage", label: `Current ${short} authorization`, section: "coverage",
      ...(ends < now ? { status: "blocked", detail: `${r.legacy.authorizationId} ended ${longDate(ends)}. Renew it or plan what comes next` }
        : ends < LEGACY_LAST_DAY ? { status: "verify", detail: `${r.legacy.authorizationId} ends ${longDate(ends)}, before ${short} retires on June 30, 2027. A renewal may be needed; the plan decides` }
          : { status: "complete", detail: `${r.legacy.authorizationId} runs through ${longDate(ends)}` }),
    });
  }
  return items;
}

function assessmentItems(r: IntakeRecord): CheckItem[] {
  const a = r.assessment;
  const filled = ASSESSMENT_SECTIONS.filter((s) => { const fv = a.fields[s.id]; return !!fv && !!fv.value && fv.state !== "not_collected"; });
  const drafts = filled.filter((s) => { const st = a.fields[s.id].state; return st === "ai_suggested" || st === "document_extracted" || st === "needs_confirmation"; });
  const total = ASSESSMENT_SECTIONS.length;
  const signer = a.attestation ? who(a.attestation.by) : undefined;
  const items: CheckItem[] = [
    {
      id: "assess-content", category: "assessment", label: "Assessment content", section: "assessment",
      ...(a.status === "signed" ? { status: "complete", detail: `${filled.length} of ${total} sections, attested` }
        : !filled.length ? { status: "missing", detail: "No section has content yet" }
          : drafts.length ? { status: "verify", detail: `${filled.length} of ${total} sections; ${plural(drafts.length, "draft")} from AI or documents need review` }
            : filled.length === total ? { status: "complete", detail: `All ${total} sections have content` }
              : { status: "missing", detail: `${filled.length} of ${total} sections have content` }),
    },
    {
      id: "assess-sign", category: "assessment", label: "Clinician attestation", section: "assessment", auth: true,
      ...(a.status === "signed" ? { status: "complete", detail: `Attested by ${signer ?? "a clinician"}${a.attestation?.credentials ? `, ${a.attestation.credentials}` : ""}` }
        : a.status === "awaiting_review" ? { status: "pending", detail: "Waits for a qualified clinician's attestation" }
          : { status: "missing", detail: "A qualified clinician attests the assessment" }),
    },
  ];
  const sc = r.scribe;
  if (sc && sc.status !== "consent" && sc.status !== "ready") {
    const n = Object.values(sc.noteDraft).filter(Boolean).length;
    items.push({
      id: "scribe", category: "assessment", label: "AI Scribe note", section: "assessment", panel: "scribe",
      ...(sc.status === "saved" ? { status: "complete", detail: "Reviewed and saved by a person" }
        : sc.status === "recording" || sc.status === "paused" ? { status: "verify", detail: "Recording (simulated audio)" }
          : { status: "pending", detail: n ? `AI-generated draft with ${plural(n, "section")} waits for review` : "Transcript waits for a draft" }),
    });
  }
  const pending = pendingIn(r, "assessment").filter((s) => s.field !== "safety");
  if (pending.length) items.push({ id: "sugg:assessment", category: "assessment", label: "AI drafts to review", status: "pending", section: "assessment", detail: `${plural(pending.length, "draft")}: ${list(pending.map((s) => ASSESSMENT_SECTIONS.find((x) => x.id === s.field)?.label.toLowerCase() ?? s.field))}` });
  return items;
}

function cansItems(r: IntakeRecord, serviceId: VaServiceId, now: number): CheckItem[] {
  const svc = serviceById(serviceId);
  const c = cansFor(serviceId, r.serviceDate, now);
  /* Before July 1, 2027 an intake for a later start is preparation only: the CANS Lifetime and Level of Need are not required yet. */
  const preparing = r.serviceDate >= REDESIGN_START && now < REDESIGN_START;
  const cans = r.cans;
  const items: CheckItem[] = [];
  if (c.applies === "not_applicable") items.push({ id: "cans", category: "cans", label: "CANS Lifetime", section: "cans", status: "na", detail: `Not associated with ${svc.short} in the policy loaded. Psyflo does not apply it` });
  else if (c.applies === "upcoming") items.push({ id: "cans", category: "cans", label: "CANS Lifetime", section: "cans", status: "later", detail: preparing ? `Preparation only until July 1, 2027 (draft policy for ${svc.short}); pending DMAS configuration` : `Applies to ${svc.short} from July 1, 2027 (draft policy); not for a start on ${longDate(r.serviceDate)}` });
  else if (c.applies === "unresolved") items.push({ id: "cans", category: "cans", label: "CANS Lifetime", section: "cans", status: "verify", detail: `Not confirmed for ${svc.short} (unresolved). Psyflo does not apply it until DMAS confirms` });
  else {
    const ev = cans ? cans.evidence.length + cans.items.reduce((n, i) => n + i.evidence.length, 0) : 0;
    items.push({
      id: "cans", category: "cans", label: "CANS Lifetime", section: "cans", auth: true,
      ...(cans?.status === "signed" ? { status: "complete", detail: `Signed${cans.signedBy ? ` by ${who(cans.signedBy)}` : ""}` }
        : cans?.status === "ready_for_review" ? { status: "pending", detail: "Waits for a qualified clinician's signature" }
          : { status: "blocked", detail: `Pending DMAS configuration${ev ? `; ${plural(ev, "evidence item")} gathered` : ""}. ${CANS_PENDING.split(".")[0]}` }),
    });
  }
  const l = lonFor(serviceId);
  if (l.applies === "no") items.push({ id: "lon", category: "cans", label: "Level of Need", section: "cans", status: "na", detail: `Does not apply to ${svc.short} in the policy loaded` });
  else if (l.applies === "unresolved") items.push({ id: "lon", category: "cans", label: "Level of Need", section: "cans", status: "verify", detail: `Applicability to ${svc.short} is not confirmed (unresolved)` });
  else items.push({
    id: "lon", category: "cans", label: "Level of Need", section: "cans", auth: !preparing,
    ...(r.lon?.status === "dispositioned" ? { status: "complete", detail: `Clinician disposition recorded${r.lon.decidedBy ? ` by ${who(r.lon.decidedBy)}` : ""}; no level is calculated` }
      : preparing || r.serviceDate < REDESIGN_START ? { status: "later", detail: `Preparation only until July 1, 2027. ${LON_PENDING}` }
        : { status: "blocked", detail: LON_PENDING }),
  });
  const pending = pendingIn(r, "cans");
  if (pending.length) items.push({ id: "sugg:cans", category: "cans", label: "AI evidence to review", status: "pending", section: "cans", detail: plural(pending.length, "suggestion") });
  return items;
}

function pathwayItems(r: IntakeRecord, serviceId: VaServiceId, selected: boolean): CheckItem[] {
  const svc = serviceById(serviceId);
  const sel = r.pathways.find((p) => p.status === "selected");
  const review = r.pathways.filter((p) => p.status === "under_review").length;
  const items: CheckItem[] = [
    {
      id: "pathway", category: "service", label: "Service selection", section: "pathway", auth: true,
      ...(sel ? { status: "complete", detail: `${sel.serviceId === "external" ? sel.externalLabel ?? "External program" : serviceById(sel.serviceId).short} selected${sel.decidedBy ? ` by ${who(sel.decidedBy)}` : ""}` }
        : review ? { status: "pending", detail: `${plural(review, "option")} under clinical review` }
          : r.pathways.length ? { status: "missing", detail: `${plural(r.pathways.length, "option")} prepared; a clinician selects one` }
            : { status: "missing", detail: "No service options yet" }),
    },
    {
      id: "service-date", category: "service", label: "Service available on the planned start", section: "pathway", auth: true,
      ...(availableOn(serviceId, r.serviceDate)
        ? { status: "complete", detail: `${svc.short}${selected ? "" : " (requested)"} can start on ${longDate(r.serviceDate)}` }
        : { status: "blocked", detail: `${svc.short} is not available on ${longDate(r.serviceDate)}: ${svc.status === "redesign" ? "it starts July 1, 2027" : "it retires June 30, 2027"}` }),
    },
  ];
  for (const o of r.referralsOut) {
    const s = o.status;
    const missingDocs = o.docs.filter((d) => d.required && !d.attached).map((d) => d.name);
    items.push({
      id: `ref-out:${o.id}`, category: "service", label: `Referral to ${o.destination.org}`, section: "pathway",
      ...(s === "draft" ? { status: "missing", detail: missingDocs.length ? `Draft; missing ${list(missingDocs)}` : "Draft; not ready to send" }
        : s === "ready" ? { status: "pending", detail: "Ready; a person approves before it is sent" }
          : s === "accepted" || s === "scheduled" || s === "completed" ? { status: "complete", detail: REFERRAL_OUT_LABEL[s] }
            : s === "declined" ? { status: "verify", detail: `Declined${o.reason ? `: ${o.reason}` : ""}. Choose another destination` }
              : { status: "verify", detail: `${REFERRAL_OUT_LABEL[s]}; waiting for a reply${o.followUpAt !== undefined ? `, follow up ${longDate(o.followUpAt)}` : ""}` }),
    });
  }
  return items;
}

function safetyItems(r: IntakeRecord): CheckItem[] {
  const items: CheckItem[] = [];
  const s = r.safety;
  if (s) {
    items.push({
      id: "safety-alert", category: "safety", label: "Safety alert", section: "assessment", field: "safety", auth: true,
      ...(s.status === "open" ? { status: "blocked", detail: "Open. A clinician reviews it before routine scheduling. Psyflo does not decide that a person is safe" }
        : { status: "complete", detail: `Reviewed by ${s.acknowledgedBy ? who(s.acknowledgedBy) : "a person"}${s.action ? `: ${s.action.replace(/_/g, " ")}` : ""}` }),
    });
  }
  const sg = pendingIn(r, "assessment").find((x) => x.field === "safety");
  const base = fieldStatus(r.assessment.fields.safety);
  items.push({
    id: "safety-screen", category: "safety", label: "Safety and risk screening", section: "assessment", field: "safety",
    ...(sg ? { status: "pending", detail: "An AI draft waits for a clinician's review; it is never approved from the assistant" }
      : base.status === "missing" ? { status: "missing", detail: "Not documented in the clinical assessment" } : base),
  });
  return items;
}

/** The completeness checklist for one record. `now` is the policy "now" (useIntakeNow). */
export function completeness(r: IntakeRecord, now: number): CheckItem[] {
  const { serviceId, selected } = serviceFor(r);
  const school = serviceById(serviceId).setting === "school" || serviceById(r.serviceId).setting === "school";
  return [
    ...referralItems(r, school),
    ...patientItems(r, school),
    ...coverageItems(r, school, now),
    ...assessmentItems(r),
    ...cansItems(r, serviceId, now),
    ...pathwayItems(r, serviceId, selected),
    handoffItem(r, serviceId),
    ...safetyItems(r),
  ].map((i) => ({ ...i, category: fileUnder(i) }));
}

/** The authorization handoff itself: whether this service needs one (from the policy rules), and where the packet stands. */
function handoffItem(r: IntakeRecord, serviceId: VaServiceId): CheckItem {
  const base = { id: "handoff", category: "handoff" as const, label: "Authorization handoff packet", section: "review" as const };
  const svc = serviceById(serviceId);
  const rules = requirementsFor({ serviceId, payerId: r.payerId, age: r.age, setting: svc.setting, serviceDate: r.serviceDate });
  const has = (k: PolicyRule["kind"]) => rules.some((x) => x.kind === k);
  if (r.handoff.status === "sent") return { ...base, status: "complete", detail: `Signed and sent as ${r.handoff.requestId ?? "a request"} (simulated payer submission)` };
  if (r.handoff.status === "in_new_case") return { ...base, status: "complete", detail: "Opened in New Authorization as a draft; nothing was submitted" };
  if (r.handoff.status === "ready") return { ...base, status: "complete", detail: "Approved; open it in New Authorization" };
  if (r.handoff.status === "draft") return { ...base, status: "pending", detail: "Draft packet waits for a person's approval" };
  if (has("authorization")) return { ...base, status: "missing", detail: "No handoff packet yet" };
  if (has("registration")) {
    const done = r.tasks.some((t) => t.kind === "registration" && t.status === "done");
    return { ...base, label: "Registration with the plan", status: done ? "complete" : "missing", detail: done ? "Registered" : "Register within 1 business day; no authorization packet" };
  }
  if (has("none")) return { ...base, status: "na", detail: "No service authorization for this service and plan" };
  return svc.status === "redesign"
    ? { ...base, status: "later", detail: "Authorization requirements for this redesigned service are pending DMAS" }
    : { ...base, status: "verify", detail: "No authorization rule on file for this plan; confirm with the plan" };
}

export const countBy = (items: CheckItem[]): Record<CheckStatus, number> => {
  const c: Record<CheckStatus, number> = { complete: 0, missing: 0, verify: 0, na: 0, later: 0, blocked: 0, pending: 0 };
  for (const i of items) c[i.status] += 1;
  return c;
};
/** For the queue: how many checklist items are Missing. */
export const missingCount = (r: IntakeRecord, now: number): number => completeness(r, now).filter((i) => i.status === "missing").length;
/** For the queue: how many items need a person (missing, to verify, pending approval or blocked). */
export const openCount = (r: IntakeRecord, now: number): number => completeness(r, now).filter((i) => isOpen(i.status)).length;

/* ------------------------------------------------------------------ authorization readiness */

export type ReadinessStatus = "not_needed" | "not_ready" | "ready" | "handed_off";
export const READINESS_LABEL: Record<ReadinessStatus, string> = { not_needed: "Not needed", not_ready: "Not ready", ready: "Ready for handoff", handed_off: "Handed off to New Authorization" };
export const READINESS_NOTE = "Readiness is not approval. The payer decides.";
/** What the policy says the service needs: an authorization, a registration, nothing, or not known yet. */
export type Requirement = "authorization" | "registration" | "none" | "pending";
export const REQUIREMENT_LABEL: Record<Requirement, string> = { authorization: "Authorization required", registration: "Registration, not authorization", none: "No authorization", pending: "Pending policy" };

export interface Readiness {
  status: ReadinessStatus;
  label: string;
  requirement: Requirement;
  serviceId: VaServiceId;
  /** The service comes from the pathway a clinician selected (not only the referral's request). */
  selected: boolean;
  /** The policy rows that apply to this service, plan, age, setting and date. */
  rules: PolicyRule[];
  headline: string;
  /** What stops the handoff: authorization items that are missing, blocked or pending, and any Blocked item. */
  blockers: CheckItem[];
  /** Authorization items that only need verification (simulated eligibility, extracted values). They do not stop the handoff. */
  warnings: CheckItem[];
  /** Everything else still open on the intake. A complete intake is not required for a handoff, and a handoff is not an approval. */
  openIntake: number;
  reviewer?: string;
  channel?: string;
  timing?: string;
  note: string;
}

export function readiness(r: IntakeRecord, now: number): Readiness {
  const { serviceId, selected } = serviceFor(r);
  const svc = serviceById(serviceId);
  const rules = requirementsFor({ serviceId, payerId: r.payerId, age: r.age, setting: svc.setting, serviceDate: r.serviceDate });
  const of = (k: PolicyRule["kind"]) => rules.filter((x) => x.kind === k);
  const requirement: Requirement = of("authorization").length ? "authorization" : of("registration").length ? "registration" : of("pending").length ? "pending" : of("none").length ? "none" : "pending";
  const items = completeness(r, now);
  const blockers = items.filter((i) => (i.auth && (i.status === "missing" || i.status === "pending")) || i.status === "blocked");
  const warnings = items.filter((i) => i.auth && i.status === "verify");
  const openIntake = items.filter((i) => isOpen(i.status) && !blockers.includes(i) && !warnings.includes(i)).length;
  const plan = r.payerId ? vaPlanOf(r.payerId) : undefined;
  const rule = of("authorization")[0] ?? of("registration")[0];
  const base = { requirement, serviceId, selected, rules, blockers, warnings, openIntake, reviewer: plan?.reviewer, channel: plan?.channel, timing: rule?.timing, note: READINESS_NOTE };
  const make = (status: ReadinessStatus, headline: string): Readiness => ({ ...base, status, label: READINESS_LABEL[status], headline });

  if (r.handoff.status === "sent") return make("handed_off", `The authorization request${r.handoff.requestId ? ` ${r.handoff.requestId}` : ""} was signed and sent to the payer (simulated). It is tracked in Authorizations.`);
  if (r.handoff.status === "in_new_case") return make("handed_off", `The packet is a draft in New Authorization${r.handoff.draftId ? ` (${r.handoff.draftId})` : ""}. Nothing was sent to the payer.`);
  if (r.triage === "declined" || r.triage === "closed") return make("not_needed", `The referral was ${r.triage}. No handoff is prepared.`);
  if (requirement === "none") return make("not_needed", `${svc.short} needs no authorization${plan?.coverage === "ffs" ? " under fee-for-service" : ""}. No handoff is needed.`);
  if (requirement === "registration") return make("not_needed", `${svc.short} is registered, not authorized: register with ${plan?.short ?? "the plan"} ${rule?.timing?.toLowerCase() ?? "within 1 business day"}. A person registers; nothing is sent from Intake.`);
  if (requirement === "pending") {
    const p = of("pending")[0];
    return make("not_ready", p ? `${p.label} for ${svc.short} (unresolved policy). Psyflo will not assume a requirement the policy has not settled.` : `No authorization rule is loaded for ${svc.short} on ${longDate(r.serviceDate)}. Psyflo will not assume one.`);
  }
  if (blockers.length) return make("not_ready", `${plural(blockers.length, "item")} to finish before the handoff: ${list(blockers.map((b) => b.label.toLowerCase()))}.`);
  return make("ready", `${svc.short} needs an authorization from ${plan?.reviewer ?? "the plan"}. The intake has what New Authorization needs.`);
}
