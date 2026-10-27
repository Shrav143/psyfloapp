import type { IntakeRecord, PathwayFit, ServiceRecommendation, SourceRef } from "@/data/intake/types";
import { availableOn, cansFor, LEGACY_LAST_DAY, periodOf, POLICY_VERSIONS, REDESIGN_START, requirementsFor, type PolicyPeriod, type PolicyRule, type PolicyVersion } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate } from "@/lib/time";

/* Care pathway wording and the Care Pathway Agent's simulated refresh. Fit is only ever "Possible fit", "Less likely fit" or "Not assessed":
   never a recommendation, an eligibility finding or a medical-necessity decision. Every date note follows the policy layer. */

export const FIT_LABEL: Record<PathwayFit, string> = { possible: "Possible fit", less_likely: "Less likely fit", not_assessed: "Not assessed" };
export const PW_STATUS_LABEL: Record<ServiceRecommendation["status"], string> = { suggested: "Option for review", under_review: "Under clinical review", selected: "Selected by a clinician", not_selected: "Not selected" };
export const AVAIL_LABEL: Record<ServiceRecommendation["availability"], string> = {
  available: "Offered at this clinic", waitlist: "Waitlist", external: "External program", not_yet: "Not offered until July 1, 2027", unknown: "Availability not confirmed",
};

export const pathwayName = (pw: Pick<ServiceRecommendation, "serviceId" | "externalLabel">): string =>
  pw.serviceId === "external" ? pw.externalLabel ?? "External referral" : serviceById(pw.serviceId).label;

/** current, retiring on June 30, 2027, or starting July 1, 2027. */
export function serviceWindow(serviceId: VaServiceId | "external"): { label: string; tone: "neutral" | "mid" } {
  if (serviceId === "external") return { label: "Outside the Medicaid service list", tone: "neutral" };
  const s = serviceById(serviceId);
  if (s.status === "retiring") return { label: "Retiring June 30, 2027", tone: "mid" };
  if (s.status === "redesign") return { label: "Starting July 1, 2027", tone: "neutral" };
  return { label: "Current service", tone: "neutral" };
}

/** Whether the service can be delivered on the record's planned start, in words. */
export function onPlannedStart(serviceId: VaServiceId | "external", r: IntakeRecord): { ok: boolean | null; text: string } {
  const when = longDate(r.serviceDate);
  if (serviceId === "external") return { ok: null, text: `Planned start ${when}: the program confirms its own start date` };
  const s = serviceById(serviceId);
  if (availableOn(serviceId, r.serviceDate)) return { ok: true, text: `Available on the planned start, ${when}` };
  return { ok: false, text: s.status === "redesign" ? `Not available on ${when}: ${s.short} starts July 1, 2027` : `Not available on ${when}: ${s.short} ends June 30, 2027` };
}

/** The policy period and version that govern an option. A person's current retiring service is a transition; another retiring service
    is only usable as a bridge under today's rules. */
export function pathwayPolicy(pw: ServiceRecommendation, r: IntakeRecord, now: number): { period: PolicyPeriod | null; version: PolicyVersion | null } {
  if (pw.serviceId === "external") return { period: null, version: null };
  const s = serviceById(pw.serviceId);
  if (s.status === "retiring") {
    const legacy = r.legacy?.serviceId === pw.serviceId;
    return { period: legacy ? "transition" : periodOf(pw.serviceId, Math.min(r.serviceDate, LEGACY_LAST_DAY), now), version: POLICY_VERSIONS["va-bh-current"] };
  }
  if (s.status === "redesign") return { period: periodOf(pw.serviceId, Math.max(r.serviceDate, REDESIGN_START), now), version: POLICY_VERSIONS["va-bh-redesign-2027"] };
  const period = periodOf(pw.serviceId, r.serviceDate, now);
  return { period, version: POLICY_VERSIONS[period === "redesign" ? "va-bh-redesign-2027" : "va-bh-current"] };
}

/** Authorization and registration rules on file for the option, as of the date it could start. (Assessments live in the CANS section.) */
export function rulesFor(pw: ServiceRecommendation, r: IntakeRecord): PolicyRule[] {
  if (pw.serviceId === "external") return [];
  const s = serviceById(pw.serviceId);
  const date = s.status === "redesign" ? Math.max(r.serviceDate, REDESIGN_START) : s.status === "retiring" ? Math.min(r.serviceDate, LEGACY_LAST_DAY) : r.serviceDate;
  return requirementsFor({ serviceId: pw.serviceId, payerId: r.payerId, age: r.age, serviceDate: date }).filter((x) => x.kind === "authorization" || x.kind === "registration" || x.kind === "none" || (x.kind === "pending" && /authoriz|rules vary|policy/i.test(x.label)));
}

export function nextActionOf(pw: ServiceRecommendation, r: IntakeRecord): string {
  if (pw.status === "suggested") return "A clinician reviews this option";
  if (pw.status === "under_review") return "A clinician selects it or marks it not selected";
  if (pw.status === "not_selected") return "No action";
  return r.referralsOut.some((x) => x.pathwayId === pw.id) ? "Track the referral below" : "Create a referral, or make it the requested service";
}

/* ---------------------------------------------------------------- the Care Pathway Agent's refresh (simulated) */

const KEYWORDS: Partial<Record<VaServiceId | "external", RegExp>> = {
  csc: /coordinated specialty care|first episode|hearing voices|psychosis/i,
  external: /coordinated specialty care|first episode|early psychosis/i,
  "mh-iop": /discharge|hospital|admission|intensive/i,
  "mh-php": /partial hospital|day program/i,
  mhcm: /coordinat|follow-up|housing|benefits/i,
  "cpst-school": /school-based|school/i,
  "cpst-youth": /community assessment|community/i,
  "cpst-adult": /daily living|skills|community/i,
  tdt: /school|class/i,
  opt: /therapist|outpatient|counsel/i,
  clubhouse: /full-time work|work|employment/i,
  mhss: /skill-building|daily living|medication routines/i,
  psr: /psychosocial/i,
  "arts-iop": /buprenorphine|opioid|alcohol|methamphetamine/i,
};

/** Up to two document statements that relate to a service, as source links. */
export function evidenceFor(r: IntakeRecord, serviceId: VaServiceId | "external"): SourceRef[] {
  const re = KEYWORDS[serviceId];
  if (!re) return [];
  const out: SourceRef[] = [];
  for (const d of r.documents) {
    d.pages.forEach((blocks, pi) => {
      for (const b of blocks) {
        if ((b.kind !== "p" && b.kind !== "list") || !b.id) continue;
        const hit = (b.kind === "p" ? [b.text] : b.items).find((t) => re.test(t));
        if (hit && out.length < 2) out.push({ kind: "document", ref: `${d.name.replace(/\.(pdf|txt)$/i, "")} p.${pi + 1}`, docId: d.id, blockId: b.id, quote: hit.length > 90 ? `${hit.slice(0, 88)}…` : hit });
      }
    });
  }
  return out;
}

const mentionsJuly = (s: string) => /July 1, 2027/.test(s);
const mentionsJune = (s: string) => /June 30, 2027/.test(s);

/** Date notes an option must carry: a redesigned service is never offered before July 1, 2027 without saying so, a retiring one never after June 30, 2027. */
export function dateNotes(serviceId: VaServiceId, r: IntakeRecord, now: number, current: string[]): string[] {
  const s = serviceById(serviceId);
  let items = [...current];
  if (s.status === "redesign") {
    if (now >= REDESIGN_START) items = items.filter((x) => !mentionsJuly(x)).concat(r.serviceDate < REDESIGN_START ? [] : ["In effect from July 1, 2027; authorization requirements still pending DMAS"]);
    else if (!items.some(mentionsJuly)) items.push(r.serviceDate < REDESIGN_START ? `Cannot start before July 1, 2027 (planned start ${longDate(r.serviceDate)})` : "Starts July 1, 2027");
  }
  if (s.status === "retiring") {
    if (now > LEGACY_LAST_DAY) items = items.filter((x) => !mentionsJune(x)).concat("Ended June 30, 2027");
    else if (!items.some(mentionsJune)) items.push("Available only through June 30, 2027");
  }
  return [...new Set(items)];
}

type Candidate = { serviceId: VaServiceId; fit: PathwayFit; rationale: string };
function candidates(r: IntakeRecord): Candidate[] {
  const text = [
    ...r.documents.flatMap((d) => d.pages.flat().map((b) => (b.kind === "p" ? b.text : b.kind === "list" ? b.items.join(" ") : ""))),
    ...Object.values(r.referral).map((f) => f.value),
    ...Object.values(r.assessment.fields).map((f) => f.value),
  ].join(" ");
  const youth = r.age !== null && r.age < 18;
  const list: Candidate[] = [];
  if (/psychos|hearing voices|first episode/i.test(text)) {
    list.push({ serviceId: "csc", fit: "possible", rationale: "The record describes a first episode of psychosis." });
    list.push({ serviceId: "mh-iop", fit: "possible", rationale: "Structured care now, while CSC is not yet a Medicaid service." });
  }
  if (youth) {
    if (/school/i.test(text)) list.push({ serviceId: "cpst-school", fit: "possible", rationale: "The referral comes from a school and asks for school-based support." });
    list.push({ serviceId: "mhcm", fit: "not_assessed", rationale: "Care coordination could connect school, family and appointments." });
    list.push({ serviceId: "cpst-youth", fit: "not_assessed", rationale: "Community-based support for a young person." });
    list.push({ serviceId: "opt", fit: "not_assessed", rationale: "Outpatient therapy is available now." });
  } else {
    if (/\bwork|employment/i.test(text)) list.push({ serviceId: "clubhouse", fit: "possible", rationale: "The person's goals include work; a clubhouse focuses on work and community." });
    list.push({ serviceId: "cpst-adult", fit: "not_assessed", rationale: "Community-based support for an adult." });
    list.push({ serviceId: "mhcm", fit: "not_assessed", rationale: "Care coordination alongside another service." });
    list.push({ serviceId: "opt", fit: "not_assessed", rationale: "Outpatient therapy is available now." });
  }
  if (/alcohol|opioid|methamphetamine|substance use/i.test(text)) list.push({ serviceId: "arts-iop", fit: "not_assessed", rationale: "Substance use is mentioned in the record." });
  return list;
}

export interface PathwayRefresh {
  updates: ServiceRecommendation[];
  added: Omit<ServiceRecommendation, "id">[];
  summary: string;
}

/** Updates only options that are still suggestions (a clinician's review is never touched) and adds at most two new ones. */
export function refreshPathways(r: IntakeRecord, now: number, at: number): PathwayRefresh {
  const updates: ServiceRecommendation[] = [];
  for (const pw of r.pathways) {
    if (pw.status !== "suggested" || pw.serviceId === "external") continue;
    const s = serviceById(pw.serviceId);
    const outstanding = dateNotes(pw.serviceId, r, now, pw.outstanding);
    const ended = s.status === "retiring" && now > LEGACY_LAST_DAY;
    const fit: PathwayFit = ended ? "less_likely" : pw.fit;
    const availability = s.status === "redesign" && now >= REDESIGN_START && pw.availability === "not_yet" ? "unknown" : pw.availability;
    const evidence = pw.evidence.length ? pw.evidence : evidenceFor(r, pw.serviceId);
    const changed = fit !== pw.fit || availability !== pw.availability || evidence.length !== pw.evidence.length || outstanding.join("|") !== pw.outstanding.join("|");
    if (changed) updates.push({ ...pw, fit, availability, evidence, outstanding, refreshedAt: at, rationale: ended && !mentionsJune(pw.rationale) ? `${pw.rationale} The service ended June 30, 2027.` : pw.rationale });
  }
  const have = new Set(r.pathways.map((p) => p.serviceId));
  const added: Omit<ServiceRecommendation, "id">[] = [];
  for (const c of candidates(r)) {
    if (added.length >= 2 || have.has(c.serviceId)) continue;
    const s = serviceById(c.serviceId);
    if (s.status === "retiring") continue;
    have.add(c.serviceId);
    const base = ["Clinical review"];
    if (s.status === "redesign") base.push("Authorization requirements pending DMAS");
    if (cansFor(c.serviceId, Math.max(r.serviceDate, REDESIGN_START)).applies === "required") base.push("CANS Lifetime (official items not configured)");
    added.push({
      serviceId: c.serviceId, fit: c.fit, rationale: s.status === "redesign" && now < REDESIGN_START ? `${c.rationale} It starts July 1, 2027 and cannot be delivered or authorized before then.` : c.rationale,
      evidence: evidenceFor(r, c.serviceId), outstanding: dateNotes(c.serviceId, r, now, base), availability: s.status === "redesign" && now < REDESIGN_START ? "not_yet" : "unknown",
      referralReqs: [], status: "suggested", suggestedBy: "placement", refreshedAt: at,
    });
  }
  const names = added.map((a) => serviceById(a.serviceId as VaServiceId).short);
  const summary = !updates.length && !added.length
    ? "No changes: the options already match the planned start and the policy dates. Nothing is selected."
    : `Refreshed ${updates.length} option${updates.length === 1 ? "" : "s"} for the planned start ${longDate(r.serviceDate)}${added.length ? `; added ${names.join(" and ")}` : ""}. Nothing is selected.`;
  return { updates, added, summary };
}
