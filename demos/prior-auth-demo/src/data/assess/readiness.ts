import { docEntries } from "@/pages/newcase/documents";
import { completeness, isOpen } from "../intake/checklist";
import { staffOf, CLINICIAN_AT } from "../intake/seed";
import { ASSESSMENT_SECTIONS, type IntakeRecord } from "../intake/types";
import type { BuiltInPayerId } from "../types";
import { cansFor, lonFor, REDESIGN_START } from "../va/policy";
import { serviceById, type VaServiceId } from "../va/services";
import { isModuleSigned, planGaps, requestedServiceOf, requirementFor, selectedServiceOf, serviceShort } from "./carePlan";
import { isCoreModule } from "./modules";
import { buildAssessmentPlan } from "./plan";
import { programById } from "./programs";
import { recordDocs } from "./recordDocs";
import type { DualReadiness, ModuleId, ReadinessItem, ReadinessStatus, ReadinessTrack } from "./types";

/* Clinical readiness and administrative readiness, kept apart. Clinical readiness is about the assessment, the safety review, the clinician's level-of-care
   confirmation, the care plan and the selected service; administrative readiness is about coverage, consent, documents and what the payer asks. Neither is
   an approval, and neither says that medical necessity is established. There is no blended percentage. Every item names who owns it and where to fix it. */

export const READINESS_NOTE = "Readiness is not an approval and not a finding of medical necessity. A clinician decides the level of care; the payer decides the authorization.";

/** The four states an item shows. `status` keeps the foundation's finer words (missing, verify, pending) for screens that already read them. */
export type ItemState = "ready" | "needs_attention" | "blocked" | "not_applicable";
export interface ReadinessItemX extends ReadinessItem {
  state: ItemState;
  /** Who does it: the site's clinician for clinical items, the assigned coordinator for administrative ones. */
  owner: string;
}
export interface ReadinessTrackX extends ReadinessTrack {
  items: ReadinessItemX[];
}
export interface DualReadinessX extends DualReadiness {
  clinical: ReadinessTrackX;
  administrative: ReadinessTrackX;
}

const STATE_STATUS: Record<ItemState, ReadinessStatus> = { ready: "complete", needs_attention: "missing", blocked: "blocked", not_applicable: "na" };
type Draft = Omit<ReadinessItemX, "status" | "state"> & { state: ItemState; status?: ReadinessStatus };
const make = (d: Draft): ReadinessItemX => ({ ...d, status: d.status ?? STATE_STATUS[d.state] });
const ready = (id: string, label: string, detail: string, owner: string, go?: ReadinessItem["go"]): ReadinessItemX => make({ id, label, detail, owner, go, state: "ready" });
const attention = (id: string, label: string, detail: string, owner: string, go?: ReadinessItem["go"], status: ReadinessStatus = "missing"): ReadinessItemX => make({ id, label, detail, owner, go, state: "needs_attention", status });
const blocked = (id: string, label: string, detail: string, owner: string, go?: ReadinessItem["go"]): ReadinessItemX => make({ id, label, detail, owner, go, state: "blocked" });
const na = (id: string, label: string, detail: string, owner: string): ReadinessItemX => make({ id, label, detail, owner, state: "not_applicable" });

export function trackOf(items: ReadinessItemX[]): ReadinessTrackX {
  const open = items.filter((i) => i.state === "needs_attention" || i.state === "blocked").length;
  const applicable = items.filter((i) => i.state !== "not_applicable");
  const started = items.some((i) => i.state === "ready");
  const stuck = items.some((i) => i.state === "blocked");
  return { items, open, state: stuck ? "blocked" : open === 0 && applicable.length > 0 ? "complete" : started ? "in_progress" : "not_started" };
}
/** "Complete", "2 items pending" or "Blocked: 1 item": what a track says in one line. */
export function trackSummary(t: ReadinessTrack): string {
  if (t.state === "complete") return "Complete";
  const blockedCount = t.items.filter((i) => i.status === "blocked").length;
  if (t.state === "blocked") return `Blocked: ${blockedCount} ${blockedCount === 1 ? "item" : "items"}${t.open > blockedCount ? `, ${t.open - blockedCount} pending` : ""}`;
  return `${t.open} ${t.open === 1 ? "item" : "items"} pending`;
}
/** Where the person goes to fix an item: a workspace address for the intake record. */
export function fixPath(recordId: string, go: ReadinessItem["go"]): string {
  if (!go) return `/intake/${recordId}`;
  if (go.section === "configure") return `/intake/${recordId}/configure`;
  const section = go.module ? `m:${go.module}` : go.section;
  return `/intake/${recordId}?section=${encodeURIComponent(section)}`;
}

const who = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a clinician");
const list = (xs: string[], max = 3): string => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} and ${xs.length - max} more`);
const plural = (n: number, one: string): string => `${n} ${n === 1 ? one : `${one}s`}`;

/** The service the authorization is for: the clinician's selection, or what was requested while none is selected. */
function serviceOf(r: IntakeRecord): { id: VaServiceId; selected: boolean; external: boolean } {
  const sel = selectedServiceOf(r);
  if (sel && sel !== "external") return { id: sel, selected: true, external: false };
  if (sel === "external") return { id: r.serviceId, selected: true, external: true };
  return { id: r.config ? programById(r.config.programId).serviceId : r.serviceId, selected: false, external: false };
}

/* ------------------------------------------------------------------ clinical */
const SIGNED_ELSEWHERE: ModuleId[] = ["cans", "lon", "loc-review"];

function clinicalItems(r: IntakeRecord, now: number): ReadinessItemX[] {
  const clinician = staffOf(CLINICIAN_AT[r.site])?.name ?? "The site's clinician";
  const items: ReadinessItemX[] = [];
  const a = r.assessment;
  items.push(
    a.status === "signed" ? ready("assessment", "Clinical assessment signed", `Attested by ${who(a.attestation?.by)}${a.attestation?.rolePlay ? " (demo role-play)" : ""}`, clinician, { section: "clinical" })
      : a.status === "awaiting_review" ? attention("assessment", "Clinical assessment signed", "Waits for a qualified clinician's attestation", clinician, { section: "clinical" }, "pending")
        : attention("assessment", "Clinical assessment signed", `${ASSESSMENT_SECTIONS.filter((s) => a.fields[s.id]?.value).length} of ${ASSESSMENT_SECTIONS.length} sections have content; not attested`, clinician, { section: "clinical" }),
  );

  const c = r.config;
  const plan = c ? buildAssessmentPlan({ programId: c.programId, purposeId: c.purposeId, population: c.population, setting: c.setting, state: c.state, payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: now }) : null;
  const active = new Set(c?.modules.filter((m) => m.state === "active").map((m) => m.id) ?? []);
  const required = plan ? plan.modules.filter((m) => active.has(m.id) && m.level === "required" && !m.preparation) : [];

  const modules = required.filter((m) => !isCoreModule(m.id) && !SIGNED_ELSEWHERE.includes(m.id));
  if (!c) items.push(attention("modules", "Assessment modules signed", "The intake is not configured yet, so no modules are listed", clinician, { section: "configure" }));
  else if (!modules.length) items.push(na("modules", "Assessment modules signed", "No required assessment module beyond the clinical assessment", clinician));
  else {
    const open = modules.filter((m) => !isModuleSigned(r, m.id));
    items.push(open.length
      ? attention("modules", "Assessment modules signed", `${modules.length - open.length} of ${modules.length} signed. Not signed: ${list(open.map((m) => m.label))}`, clinician, { section: "instrument", module: open[0].id })
      : ready("modules", "Assessment modules signed", `${plural(modules.length, "required module")} signed`, clinician, { section: "instrument", module: modules[0].id }));
  }

  /* CANS and Level of Need: per the policy for the service on the policy date. Preparation only before July 1, 2027. */
  const svc = serviceOf(r);
  const cansOn = active.has("cans");
  const cansPolicy = cansFor(svc.id, Math.max(r.serviceDate, now), now);
  if (cansOn || cansPolicy.applies === "required") {
    items.push(isModuleSigned(r, "cans") ? ready("cans", "CANS Lifetime signed", `Signed by ${who(r.instruments?.cans?.signedBy ?? r.cans?.signedBy)}. Psyflo shows no rating`, clinician, { section: "instrument", module: "cans" })
      : attention("cans", "CANS Lifetime signed", cansOn ? "Not signed. Official items are not configured; the demo placeholder structure is not CANS content" : "Applies to this service. Add the CANS module to the assessment", clinician, { section: "instrument", module: "cans" }));
  } else items.push(na("cans", "CANS Lifetime", cansPolicy.applies === "upcoming" ? "From July 1, 2027 (draft policy): preparation only" : cansPolicy.applies === "unresolved" ? "Not confirmed for this service. Psyflo does not apply it" : `Not associated with ${serviceShort(svc.id)} in the policy loaded`, clinician));
  const lonOn = active.has("lon");
  const lonPolicy = lonFor(svc.id);
  if (lonOn || (lonPolicy.applies === "yes" && now >= REDESIGN_START)) {
    items.push(isModuleSigned(r, "lon") ? ready("lon", "Level of Need disposition recorded", `Clinician disposition by ${who(r.lon?.decidedBy ?? r.instruments?.lon?.signedBy)}. No level is calculated`, clinician, { section: "instrument", module: "lon" })
      : attention("lon", "Level of Need disposition recorded", "A clinician records the disposition in their own words. No model is configured, so Psyflo shows no level", clinician, { section: "instrument", module: "lon" }));
  } else items.push(na("lon", "Level of Need", lonPolicy.applies === "no" ? `Does not apply to ${serviceShort(svc.id)} in the policy loaded` : lonPolicy.applies === "unresolved" ? "Applicability is not confirmed" : "From July 1, 2027: preparation only", clinician));

  const s = r.safety;
  const safetyDraft = r.suggestions.some((x) => x.section === "assessment" && x.field === "safety" && x.status === "pending");
  items.push(s?.status === "open" ? blocked("safety", "Safety alert reviewed by a clinician", "An alert is open. A clinician reviews it; Psyflo never decides that a person is safe", clinician, { section: "clinical" })
    : safetyDraft ? attention("safety", "Safety alert reviewed by a clinician", "An AI draft of the safety screening waits for a clinician's review", clinician, { section: "clinical" }, "pending")
      : ready("safety", "Safety alert reviewed by a clinician", s ? `Reviewed by ${who(s.acknowledgedBy)}${s.action ? `: ${s.action.replace(/_/g, " ")}` : ""}` : "No alert raised", clinician, { section: "clinical" }));

  const locOn = active.has("loc-review") || (plan?.modules.some((m) => m.id === "loc-review" && m.level === "required") ?? false);
  if (!locOn) items.push(na("loc", "Level of care confirmed by a clinician", "No level-of-care review in this assessment plan", clinician));
  else {
    const loc = r.instruments?.["loc-review"]?.loc;
    items.push(loc?.confirmed ? ready("loc", "Level of care confirmed by a clinician", `${loc.confirmed}, confirmed by ${who(loc.confirmedBy)}. Selected from names only; the licensed criteria are not loaded`, clinician, { section: "instrument", module: "loc-review" })
      : attention("loc", "Level of care confirmed by a clinician", "A clinician confirms the level. Psyflo never assigns it", clinician, { section: "instrument", module: "loc-review" }));
  }

  const cp = r.carePlan;
  const gaps = planGaps(r);
  items.push(cp?.status === "approved" ? ready("care-plan", "Care plan approved", `Version ${cp.version ?? 1}, approved by ${who(cp.approvedBy)}${cp.rolePlay ? " (demo role-play)" : ""}`, clinician, { section: "care" })
    : attention("care-plan", "Care plan approved", cp ? `Draft. ${gaps.length ? `Still needed: ${list(gaps.map((g) => g.toLowerCase()))}` : "Ready for a clinician's approval"}` : "Not started", clinician, { section: "care" }));

  const sel = selectedServiceOf(r);
  const requested = requestedServiceOf(r);
  items.push(sel ? ready("service", "Service selected by a clinician", `${serviceShort(sel, r.pathways.find((p) => p.serviceId === "external" && p.status === "selected")?.externalLabel)}${sel !== requested ? `, not the requested ${serviceShort(requested)}` : ""}${cp?.selectedBy ? `. Selected by ${who(cp.selectedBy)}` : ""}`, clinician, { section: "care" })
    : attention("service", "Service selected by a clinician", `${plural(r.pathways.length, "option")} to consider. A clinician selects one; Psyflo does not`, clinician, { section: "care" }));
  return items;
}

/* ------------------------------------------------------------------ administrative */
function administrativeItems(r: IntakeRecord, now: number): ReadinessItemX[] {
  const owner = staffOf(r.assignedTo)?.name ?? "Intake coordinator";
  const svc = serviceOf(r);
  const def = serviceById(svc.id);
  const items: ReadinessItemX[] = [];
  const e = r.eligibility;

  items.push(
    e.status === "inactive" ? blocked("coverage", "Coverage verified", "Not active in the simulated response. Confirm coverage with the plan before going on", owner, { section: "patient:coverage" })
      : e.status === "not_checked" || e.status === "checking" ? attention("coverage", "Coverage verified", e.status === "checking" ? "Checking (simulated)" : "Not checked", owner, { section: "patient:coverage" }, "verify")
        : e.status === "active" && e.verified?.member ? ready("coverage", "Coverage verified", `Active in a simulated response; member eligibility confirmed with the plan by ${who(e.verified.member.by)}`, owner, { section: "patient:coverage" })
          : e.status === "active" ? attention("coverage", "Coverage verified", "Active in a simulated response. Confirm with the plan before relying on it", owner, { section: "patient:coverage" }, "verify")
            : attention("coverage", "Coverage verified", e.conflicts[0] ?? "The response was uncertain (simulated). Confirm with the plan", owner, { section: "patient:coverage" }, "verify"),
  );
  items.push(
    e.network === "no" ? blocked("provider", "Provider participation confirmed", "Not in the plan's network in the simulated response", owner, { section: "patient:coverage" })
      : e.network === "yes" ? (e.verified?.network ? ready("provider", "Provider participation confirmed", `Confirmed with the plan by ${who(e.verified.network.by)}`, owner, { section: "patient:coverage" }) : attention("provider", "Provider participation confirmed", "In network in a simulated response. Confirm with the plan", owner, { section: "patient:coverage" }, "verify"))
        : attention("provider", "Provider participation confirmed", "Network participation is not confirmed", owner, { section: "patient:coverage" }, "verify"),
  );

  /* Consent: a payment consent is needed before the payer is told anything. A substance use packet also carries the Part 2 flag. */
  const ledger = r.consents ?? [];
  const on = (t: string) => ledger.find((x) => x.type === t && x.status === "on_file");
  const bad = ledger.find((x) => (x.type === "payment" || x.type === "part2_disclosure") && (x.status === "declined" || x.status === "revoked" || x.status === "expired"));
  const sud = def.track === "sud" || def.group === "arts";
  const part2 = sud ? " Part 2 applies: a redisclosure notice goes with the packet. Organization protocol, not legal advice." : "";
  if (bad) items.push(blocked("consent", "Consents on file", `${bad.type === "payment" ? "Payment consent" : "Part 2 disclosure consent"} is ${bad.status}. Nothing is shared with the payer.${part2}`, owner, { section: "patient" }));
  else if (!on("payment")) items.push(sud ? blocked("consent", "Consents on file", `No payment consent on file. A substance use authorization packet is blocked until there is one.${part2}`, owner, { section: "patient" }) : attention("consent", "Consents on file", "No payment consent on file. Record it before the payer is told anything", owner, { section: "patient" }));
  else if (sud && !on("part2_disclosure")) items.push(attention("consent", "Consents on file", `Payment consent is on file. No Part 2 disclosure consent is recorded.${part2}`, owner, { section: "patient" }));
  else items.push(ready("consent", "Consents on file", `Payment consent on file${sud ? ", with the Part 2 disclosure consent" : ""}.${part2}`, owner, { section: "patient" }));

  /* Documents: the payer's usual list for the service, from what the record already holds. The payer's saved list is checked again in New Authorization. */
  const have = new Set(recordDocs(r).map((d) => d.slot));
  const needed = docEntries(r.payerId, def.program, null).filter((x) => x.required);
  const missingDocs = needed.filter((x) => !have.has(x.slot));
  items.push(!needed.length ? na("documents", "Required documents attached", "No required document list for this service", owner)
    : missingDocs.length ? attention("documents", "Required documents attached", `${needed.length - missingDocs.length} of ${needed.length} on the record. Missing: ${list(missingDocs.map((x) => x.label.toLowerCase()))}`, owner, { section: "documents" })
      : ready("documents", "Required documents attached", `${plural(needed.length, "required document")} available from the record. The payer's saved list is checked in New Authorization`, owner, { section: "documents" }));

  const req = requirementFor(svc.id, r, Math.max(r.serviceDate, now));
  const kind = req.rules.find((x) => x.status === "final" && x.kind !== "pending")?.kind;
  items.push(kind === "none" ? na("requirements", "Authorization requirements checked", req.text, owner)
    : kind ? ready("requirements", "Authorization requirements checked", req.text, owner, { section: "overview" })
      : attention("requirements", "Authorization requirements checked", req.text, owner, { section: "overview" }, "verify"));
  items.push(req.status === "on_file" ? ready("payer-rule", "Payer rule status", `A final policy row applies${req.source ? ` (${req.source.title})`  : ""}. It does not say this plan's own rules are confirmed`, owner)
    : attention("payer-rule", "Payer rule status", req.status === "draft" ? "Only a draft or unresolved row applies. Payer requirement not yet verified" : "No row applies. Payer requirement not yet verified", owner, undefined, "verify"));

  const open = referralOpen(r, now);
  items.push(r.triage === "new" || r.triage === "needs_info" ? attention("referral", "Referral information complete", r.triage === "needs_info" ? "Needs information from the referrer" : "Not triaged yet", owner, { section: "referral" })
    : open.length ? attention("referral", "Referral information complete", `${plural(open.length, "item")} not confirmed: ${list(open)}`, owner, { section: "referral" }, "verify")
      : ready("referral", "Referral information complete", "What the authorization needs from the referral and the patient is on file and confirmed", owner, { section: "referral" }));
  return items;
}

/** Referral and patient items the authorization needs that are still open, by label. The rest of the intake checklist does not hold an authorization. */
function referralOpen(r: IntakeRecord, now: number): string[] {
  return completeness(r, now).filter((i) => i.auth && (i.category === "referral" || i.category === "patient") && isOpen(i.status)).map((i) => i.label.toLowerCase());
}

/** The two tracks. `now` is the policy "now" (useIntakeNow). Never one blended number. */
export function dualReadiness(r: IntakeRecord, now: number): DualReadinessX {
  return { clinical: trackOf(clinicalItems(r, now)), administrative: trackOf(administrativeItems(r, now)), note: READINESS_NOTE };
}

/** Whether a clinician has everything done that the authorization review needs: the gate in Care planning. Administrative items do not hold it. */
export const clinicallyReady = (r: IntakeRecord, now: number): boolean => clinicalItems(r, now).every((i) => i.state === "ready" || i.state === "not_applicable");
