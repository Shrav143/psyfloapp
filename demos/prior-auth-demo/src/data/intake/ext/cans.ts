import { HOUR } from "@/lib/time";
import type { IntakeRecord, ServiceRecommendation, SourceRef } from "../types";

/* Seed content for CANS Lifetime, Level of Need, pathways and referral coordination. Records A and B have no CANS record (starting one is a
   staff action); C has a preparation record with evidence gathered from the discharge summary. Pathways get the document evidence they rest on. */

const src = (docId: string, ref: string, blockId: string, quote: string): SourceRef => ({ kind: "document", ref, docId, blockId, quote });

/** Document evidence for the seeded pathways, by record and service. */
const PATHWAY_EVIDENCE: Record<string, Partial<Record<ServiceRecommendation["serviceId"], SourceRef[]>>> = {
  "IN-3101": {
    tdt: [src("doc-a1", "School referral p.1", "a-reason", "leaves class most afternoons, and has had three conflicts with peers")],
    "cpst-school": [src("doc-a1", "School referral p.1", "a-reason", "We are asking for school-based mental health support and a community assessment.")],
    opt: [src("doc-a1", "School referral p.1", "a-supports", "No current therapist."), src("doc-a2", "2025 EMR record p.1", "a-emr", "Seen for 7 sessions for low mood and school avoidance.")],
    "cpst-youth": [src("doc-a1", "School referral p.1", "a-reason", "a community assessment")],
  },
  "IN-3102": {
    "cpst-adult": [src("doc-b1", "Current service record p.1", "b-svc", "daily living skills, medication routines and budgeting")],
    clubhouse: [src("doc-b1", "Current service record p.1", "b-goals", "return to full-time work")],
    mhss: [src("doc-b1", "Current service record p.1", "b-svc", "Receives MHSS 3 times a week since 2024")],
  },
  "IN-3103": {
    csc: [src("doc-c1", "Discharge referral p.1", "c-recs", "Referral to a Coordinated Specialty Care team for first episode psychosis")],
    "mh-iop": [src("doc-c1", "Discharge referral p.1", "c-course", "First psychiatric admission.")],
    mhcm: [src("doc-c1", "Discharge referral p.1", "c-recs", "Psychiatry follow-up within 7 days")],
    external: [src("doc-c1", "Discharge referral p.1", "c-recs", "Referral to a Coordinated Specialty Care team for first episode psychosis")],
  },
};

export const extendCans = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r) => {
    const ev = PATHWAY_EVIDENCE[r.id];
    let next: IntakeRecord = ev ? { ...r, pathways: r.pathways.map((p) => (ev[p.serviceId] && !p.evidence.length ? { ...p, evidence: ev[p.serviceId] ?? [] } : p)) } : r;
    if (r.id === "IN-3103" && next.cans) {
      const at = r.createdAt + 3 * HOUR;
      next = {
        ...next,
        cans: { ...next.cans, startedBy: "ml", startedAt: r.createdAt + 2 * HOUR, evidenceMeta: Object.fromEntries(next.cans.evidence.map((e) => [e.id, { by: "ml", at, from: "agent" as const, agent: "criteria" as const }])) },
        audit: [...next.audit, { id: "ev-c-cans-1", at: r.createdAt + 2 * HOUR, actor: "ml", action: "Started a CANS Lifetime preparation record", detail: "Template awaiting-dmas-mapping: no items configured", section: "cans" }, { id: "ev-c-cans-2", at, actor: "ml", action: "Kept 4 pieces of evidence proposed by the CANS Evidence Agent", section: "cans" }],
      };
      const ext = next.pathways.find((p) => p.serviceId === "external");
      next = {
        ...next,
        referralsOut: next.referralsOut.map((ro) =>
          ro.id === "RO-5101"
            ? {
                ...ro, pathwayId: ext?.id, destinationId: "valley-eps",
                docs: [{ name: "Referral form", attached: true, required: true, generated: true }, ...ro.docs.map((d) => (d.name === "Discharge summary" ? { ...d, docId: "doc-c1" } : d))],
                packet: { preparedAt: ro.createdAt, missing: [], message: "Referral for A.K., 19, after a first psychiatric admission (10/12 to 10/19/2026). The hospital recommends Coordinated Specialty Care. Attached: referral form, discharge summary, release of information. Please confirm receipt and let us know about intake availability." },
              }
            : ro,
        ),
      };
    }
    return next;
  });
