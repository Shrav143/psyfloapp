import type { DocBlock } from "@/components/ui/DocumentSheet";
import { ageFromDob } from "@/data/intake/referralFacts";
import type { SampleExtract } from "@/data/intake/samples";
import type { FieldMap, FieldState, FieldValue, IntakeDocument, IntakeRecord, ReferralMethod, SourceRef } from "@/data/intake/types";
import type { SiteId } from "@/data/sites";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import { REDESIGN_START } from "@/data/va/policy";
import { VA_PLANS } from "@/data/va/plans";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { DAY, longDate } from "@/lib/time";
import { URGENCY_LABEL } from "../referral/labels";

/* Turns what was read from a source (a sample document, an EMR chart, pasted text, typed values) into the draft record the review screen shows.
   Every value keeps where it came from. Nothing is invented: a value the source does not give is left out and shows as Missing. The extraction
   itself is simulated; the screens say so. */

/** Where the words came from: a document, an EMR chart, something the person or caregiver wrote, or a staff member typing. */
export type Origin = "document" | "emr" | "patient" | "staff";
/** Whether the source names the service it asks for, or the Referral Agent infers it from the reason, or nothing says. */
export type ServiceBasis = "stated" | "inferred" | "unstated";

export interface DraftSource {
  method: ReferralMethod;
  origin: Origin;
  docs: IntakeDocument[];
  extract: SampleExtract[];
  initials: string;
  age: number | null;
  serviceId: VaServiceId;
  serviceBasis: ServiceBasis;
  urgency: Urgency;
  payerId: BuiltInPayerId | null;
  sourceOrg: string;
  site: SiteId;
  /** The date the source carries, as written. */
  dated?: string;
}

/** The first planned start: a week out, and never before July 1, 2027 for a redesigned service. */
export function defaultServiceDate(serviceId: VaServiceId, clock: number): number {
  const week = clock + 7 * DAY;
  return serviceById(serviceId).status === "redesign" ? Math.max(week, REDESIGN_START) : week;
}

const blockIdsOf = (page: DocBlock[]): string[] => page.flatMap((b) => ("id" in b && b.id ? [b.id] : []));
const refName = (doc: IntakeDocument) => doc.name.replace(/\.(pdf|txt|eml)$/i, "");

/** The state a value starts in: a conflict or a low-confidence reading needs a person, a summary is an AI suggestion, and the rest is as the source gave it. */
export function stateOf(e: Pick<SampleExtract, "conflict" | "confidence" | "inferred">, origin: Origin): FieldState {
  if (origin === "staff") return "verified";
  if (e.conflict || e.confidence === "low") return "needs_confirmation";
  if (e.inferred) return "ai_suggested";
  return origin === "patient" ? "patient_reported" : "document_extracted";
}

const SOURCE_KIND: Record<Origin, SourceRef["kind"]> = { document: "document", emr: "emr", patient: "form", staff: "staff" };

export function buildDraftRecord(id: string, src: DraftSource, ctx: { clock: number; me: string }): IntakeRecord {
  const at = ctx.clock;
  const typed = src.origin === "staff";

  /** A reference to a block of whichever attached document holds it (the first document when none is named). */
  const ref = (blockId?: string, quote?: string): SourceRef | undefined => {
    if (typed && !src.docs.length) return { kind: "staff", ref: "Manual entry" };
    const doc = (blockId ? src.docs.find((d) => d.pages.some((p) => blockIdsOf(p).includes(blockId))) : undefined) ?? src.docs[0];
    if (!doc) return undefined;
    const page = blockId ? Math.max(1, doc.pages.findIndex((p) => blockIdsOf(p).includes(blockId)) + 1) : 1;
    return { kind: SOURCE_KIND[src.origin], ref: `${src.origin === "emr" ? "EMR chart summary" : refName(doc)} p.${page}`, docId: doc.id, blockId, quote };
  };

  const maps: Record<"referral" | "profile" | "coverage", FieldMap> = { referral: {}, profile: {}, coverage: {} };
  for (const e of src.extract) {
    const state = stateOf(e, src.origin);
    maps[e.section][e.field] = { value: e.value, state, at, by: typed ? ctx.me : "reader", source: ref(e.block, e.quote), confidence: e.confidence, ...(e.conflict ? { conflict: e.conflict } : {}), ...(state === "verified" ? { reviewedBy: ctx.me, reviewedAt: at } : {}) };
  }

  /* The coverage type follows the plan, as a suggestion until a person confirms it. */
  const plan = VA_PLANS.find((p) => p.name === maps.coverage.plan?.value);
  if (plan) maps.coverage.coverageType = { value: plan.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)", state: "ai_suggested", at, by: "verify", source: maps.coverage.plan?.source, confidence: "medium" };

  const asGiven: FieldState = src.origin === "patient" ? "patient_reported" : "document_extracted";
  const reasonSource = maps.referral.reason?.source ?? ref();
  const entered = typed ? { reviewedBy: ctx.me, reviewedAt: at } : {};
  maps.referral.referralDate = src.dated
    ? { value: src.dated, state: asGiven, at, by: "reader", source: ref(), confidence: "high" }
    : { value: longDate(at), state: "verified", at, by: "system", source: { kind: "staff", ref: "Date received" }, reviewedBy: "system", reviewedAt: at };
  if (src.serviceBasis !== "unstated") {
    maps.referral.requestedService = {
      value: serviceById(src.serviceId).label, at, by: typed ? ctx.me : "reader", source: reasonSource, confidence: src.serviceBasis === "stated" ? "high" : "medium",
      state: typed ? "verified" : src.serviceBasis === "stated" ? asGiven : "ai_suggested", ...entered,
    };
  }
  if (src.initials.trim()) maps.referral.person = { value: `${src.initials}${src.age !== null ? `, ${src.age}` : ""}`, state: typed ? "verified" : asGiven, at, by: typed ? ctx.me : "reader", source: ref(), confidence: "high", ...entered };
  maps.referral.urgency = { value: URGENCY_LABEL[src.urgency], state: typed ? "verified" : "ai_suggested", at, by: typed ? ctx.me : "reader", source: reasonSource, confidence: "medium", ...entered };

  const dob = maps.profile.dob?.value;
  const age = (dob ? ageFromDob(dob, at) : null) ?? src.age;
  return {
    id, site: src.site, createdAt: at, title: `${src.sourceOrg}: ${serviceById(src.serviceId).short}`, serviceId: src.serviceId, serviceDate: defaultServiceDate(src.serviceId, at),
    method: src.method, sourceOrg: src.sourceOrg, triage: "new", urgency: src.urgency, priority: src.urgency !== "routine", assignedTo: ctx.me, payerId: src.payerId, initials: src.initials, age,
    referral: maps.referral, profile: maps.profile, coverage: maps.coverage,
    eligibility: { status: "not_checked", simulated: true, member: "unknown", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: [] },
    assessment: { mode: "manual", status: "not_started", fields: {} }, cans: null, lon: null, pathways: [], referralsOut: [], documents: src.docs, suggestions: [], tasks: [],
    audit: src.docs.length ? [{ id: `ev-${id}-read`, at, actor: "reader", action: `Read ${src.docs.map((d) => d.name).join(", ")} (simulated extraction)`, detail: `${src.extract.length} fields found`, section: "referral", ai: true }] : [],
    scribe: null, voice: null, safety: null, handoff: { status: "not_started" },
  };
}
