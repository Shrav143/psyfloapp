import type { PriorAssessment } from "@/data/assess/types";
import { mirrorCans, mirrorLon } from "@/pages/intake/cans/cansState";
import { DAY, HOUR } from "@/lib/time";
import { vaDate } from "../../va/policy";
import type { IntakeRecord, ServiceRecommendation, SourceRef } from "../types";

/* Seed content for CANS Lifetime, Level of Need, pathways, referral coordination and the assessments found for a person. Records A and B have no CANS
   record (starting one is a staff action); C has a preparation record with evidence gathered from the discharge summary. Pathways get the document
   evidence they rest on. Each record that has a CANS or Level of Need review also gets the instrument instance the workspace navigation reads. */

/** What an assessment found for a person holds, by the prior assessment's id: the summary the source sent, the evidence statements (CANS) or the field
    values (any other module). Only content the source could have sent: no official CANS items, ratings or scoring. */
export interface PriorContent {
  /** What the source's assessment says, in short lines, for the read-only review. */
  summary: string[];
  /** CANS: statements that carry forward as evidence (never as ratings), with their Psyflo theme. */
  evidence: { text: string; theme: string }[];
  /** Any other module: values by field key (data/assess/schemas). */
  fields: Record<string, string>;
  /** One line on what is not included. */
  excluded: string;
}

const PA_CANS: PriorAssessment = {
  id: "PA-3101-cans", moduleId: "cans", label: "CANS from another provider", date: vaDate("2026-03-17"), provider: "Chesterfield youth services team (fictional)", version: "Provider's own CANS form, version not stated",
  clinician: "J. Mercer, LCSW (fictional)", status: "current", reuse: "unverified",
  note: "Completed when the family was first referred for in-home counseling. The provider's ratings stay in its own system; this demo holds the summary and the statements the provider sent.",
};
const PA_PSYCH: PriorAssessment = {
  id: "PA-3102-psych", moduleId: "psych-history", label: "Psychiatric history from an earlier episode", date: vaDate("2025-08-12"), provider: "Psyflo demo clinic, Site B (earlier MHSS episode)", version: "Annual summary 2025",
  clinician: "Heather K., LCSW", status: "current", reuse: "permitted",
  note: "The annual summary from the person's skill-building service. Same organization, so no release is needed; the clinician still reviews it.",
};
const PA_PSYCHIATRIC: PriorAssessment = {
  id: "PA-3115-psychiatric", moduleId: "psychiatric", label: "Psychiatric assessment from the inpatient stay", date: vaDate("2026-10-13"), provider: "Inpatient unit, Shenandoah Health (fictional)", version: "Inpatient evaluation",
  clinician: "Staff psychiatrist (fictional)", status: "current", reuse: "unverified",
  note: "Written during the stay that led to this referral. The inpatient team's wording is kept as theirs; a clinician here confirms what still applies.",
};

const PA_ASAM: PriorAssessment = {
  id: "PA-3112-asam", moduleId: "asam", label: "ASAM documentation from the residential program", date: vaDate("2026-08-07"), provider: "Riverside Recovery Center (fictional)", version: "Program's own ASAM documentation, edition not stated",
  clinician: "Admission counselor, Riverside Recovery Center (fictional)", status: "current", reuse: "unverified",
  note: "Completed at admission to residential care. Her needs have changed since the stay; a clinician here confirms what still applies. The program's ratings and level stay in its own system.",
};

export const PRIOR_CONTENT: Record<string, PriorContent> = {
  [PA_ASAM.id]: {
    summary: ["Completed 8/7/2026, two days after admission to residential care.", "Daily opioid use for eight months; withdrawal managed at admission.", "Lived with her mother before admission; no stable work."],
    evidence: [],
    fields: {
      "asam.d1.findings": "At admission in August 2026: daily opioid use for eight months, last use 08/04/2026. Withdrawal was managed at the program.",
      "asam.d4.findings": "One overdose in June 2026, reversed with naloxone. Two earlier outpatient attempts ended in relapse within weeks.",
      "asam.d5.findings": "Lived with her mother and younger brother before admission; part-time warehouse work; no car.",
    },
    excluded: "Dimension ratings and the level the program recorded are not included: they are in the program's own system, and the licensed criteria are not loaded here.",
  },
  [PA_CANS.id]: {
    summary: [
      "Completed 3/17/2026, after the family moved to the area.",
      "Concerns noted then: low mood and school avoidance.",
      "Strengths noted then: art, a trusted teacher and a small group of friends.",
      "Caregiver: mother, engaged and attended both sessions.",
    ],
    evidence: [
      { text: "Low mood and school avoidance noted in March 2026.", theme: "Symptoms" },
      { text: "Strengths in March 2026: art, a trusted teacher and a small group of friends.", theme: "Supports and strengths" },
      { text: "Mother was engaged and attended both sessions in March 2026.", theme: "Family" },
      { text: "A 504 plan for attention concerns was in place at the time.", theme: "School" },
    ],
    fields: {},
    excluded: "Item ratings are not included: they are in the provider's own system, and the official item mapping is not loaded here.",
  },
  [PA_PSYCH.id]: {
    summary: ["Two psychiatric hospitalizations in 2023, none since.", "Stable for 18 months on the current medication and skill-building service.", "Diagnosis as documented in the chart: schizoaffective disorder, bipolar type."],
    evidence: [],
    fields: {
      "psych-history.summary": "Two psychiatric hospitalizations in 2023. No admissions since. Stable for 18 months on the current medication and skill-building service.",
      "psych-history.diagnoses": "Schizoaffective disorder, bipolar type, as documented in the chart.",
      "psych-history.hospitalizations": "Two in 2023; none since.",
      "psych-history.current": "Mental Health Skill-Building three times a week since 2024; medication management through the clinic.",
    },
    excluded: "Safety information is not included. A clinician documents it again.",
  },
  [PA_PSYCHIATRIC.id]: {
    summary: ["Admitted for a major depressive episode; poor sleep, low energy and missed work before admission.", "Discharge plan: a day program and outpatient psychiatry follow-up.", "Medication changes were made during the stay."],
    evidence: [],
    fields: {
      "psychiatric.presenting": "Major depressive episode with poor sleep, low energy and missed work, leading to an inpatient stay.",
      "psychiatric.symptoms": "Low mood, poor sleep and low energy before admission; improving at discharge, per the inpatient team.",
      "psychiatric.impressions": "As documented by the inpatient team: major depressive disorder, recurrent, severe. The clinician here confirms or changes it.",
      "psychiatric.medications": "Medication changes during the stay; the inpatient team's list is attached to the discharge summary.",
    },
    excluded: "The mental status examination and the safety assessment are not included. A clinician here repeats them.",
  },
};
export const priorContentOf = (id: string): PriorContent | undefined => PRIOR_CONTENT[id];

/** The assessments found, by record. Applied inside extendCans (the hook seed.ts calls), merged and never overwritten: a record keeps any prior assessment
    someone else already gave it. */
const PRIORS_BY_RECORD: Record<string, Partial<IntakeRecord>> = {
  "IN-3101": { priorAssessments: [PA_CANS] },
  "IN-3102": { priorAssessments: [PA_PSYCH] },
  "IN-3112": { priorAssessments: [PA_ASAM] },
  "IN-3115": { priorAssessments: [PA_PSYCHIATRIC] },
};

/** Adds what the extension holds to a record without overwriting: the list of assessments found gains the entries whose id is new; any other value the
    record already has stays. */
function mergeExt(r: IntakeRecord, ext: Partial<IntakeRecord> | undefined): IntakeRecord {
  if (!ext) return r;
  const { priorAssessments, ...rest } = ext;
  const have = r.priorAssessments ?? [];
  const added = (priorAssessments ?? []).filter((p) => !have.some((x) => x.id === p.id));
  return { ...rest, ...r, ...(added.length || priorAssessments ? { priorAssessments: [...have, ...added] } : {}) };
}

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
  records.map((r0) => {
    const r = mergeExt(r0, PRIORS_BY_RECORD[r0.id]);
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
    return mirrorLon(mirrorCans(next, r.createdAt), r.createdAt);
  });
