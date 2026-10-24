import { authByMrn, visitDatesFor } from "@/lib/demo/dataset";
import { addDays, DEMO_TODAY, fmtDate } from "@/lib/demo/format";
import type { Patient, Payer } from "@/lib/demo/types";
import type { Tone } from "@/lib/demo-ui/status-badge";

/** Effective status of a required document once the coordinator has asked for it. */
export type DocStatus = "attached" | "stale" | "missing" | "requested";

export type DocItem = {
  name: string;
  rule: string;
  status: Exclude<DocStatus, "requested">;
  dated?: string;
  note?: string;
};

export const DOC_TONE: Record<DocStatus, Tone> = {
  attached: "green",
  stale: "red",
  missing: "red",
  requested: "blue",
};

/**
 * Payer-specific checklist. Names match the ledger's packet documents so a
 * gap recorded on the last version carries into the next request.
 */
export function buildDocs(patient: Patient, payer: Payer): DocItem[] {
  const wellcare = payer.id === "wellcare";
  const psychStale = payer.id === "humana";
  const locusDays = wellcare ? 30 : 90;
  const docs: DocItem[] = [
    {
      name: "Cover sheet (criteria crosswalk)",
      rule: "Built from the packet · one row per criterion",
      status: "attached",
      dated: DEMO_TODAY,
    },
    {
      name: "LOCUS assessment",
      rule: `Administered within ${locusDays} days${wellcare ? " · CP-BH-114, was 90" : ""}`,
      status: wellcare ? "stale" : "attached",
      dated: addDays(DEMO_TODAY, -41),
      note: wellcare ? "41 days old · payer now requires 30" : undefined,
    },
    {
      name: "SMI eligibility checklist",
      rule: "Kentucky SMI criteria, signed",
      status: "attached",
      dated: patient.intakeDate,
    },
    {
      name: "Intake / biopsychosocial assessment",
      rule: "From intake · updated at each renewal",
      status: "attached",
      dated: patient.intakeDate,
    },
    {
      name: "Individualized treatment plan (signed)",
      rule: "Reviewed within 90 days · signature page",
      status: "attached",
      dated: addDays(DEMO_TODAY, -19),
    },
    {
      name: "PHQ-9 and GAD-7",
      rule: "Scores within 30 days",
      status: "attached",
      dated: addDays(DEMO_TODAY, -6),
    },
    {
      name: "Psychiatric evaluation (external)",
      rule: "Within 12 months",
      status: psychStale ? "stale" : "attached",
      dated: psychStale ? "2025-08-02" : addDays(DEMO_TODAY, -140),
      note: psychStale
        ? "13 months old · payer rule: within 12 months"
        : undefined,
    },
    {
      name: "Primary care home monthly note",
      rule: "Most recent month",
      status: "attached",
      dated: addDays(DEMO_TODAY, -12),
    },
    {
      name: "Attendance and progress summary",
      rule: "Auto-built from Sunwave attendance",
      status: "attached",
      dated: DEMO_TODAY,
    },
  ];
  const auth = authByMrn(patient.mrn);
  const last = auth?.versions[auth.versions.length - 1];
  for (const d of last?.packet ?? []) {
    const hit =
      d.status === "missing" ? docs.find((x) => x.name === d.name) : undefined;
    if (hit) {
      hit.status = "missing";
      hit.dated = undefined;
      hit.note = "Missing from the last packet too";
    }
  }
  return docs;
}

export function docStatus(doc: DocItem, requested: string[]): DocStatus {
  return requested.includes(doc.name) ? "requested" : doc.status;
}

export type PacketGap = { name: string; status: DocStatus };

export function packetCounts(
  docs: DocItem[],
  requested: string[],
): { attached: number; total: number; gaps: PacketGap[] } {
  const gaps: PacketGap[] = [];
  for (const d of docs) {
    const status = docStatus(d, requested);
    if (status !== "attached") {
      gaps.push({ name: d.name, status });
    }
  }
  return { attached: docs.length - gaps.length, total: docs.length, gaps };
}

export type CoverRow = { criterion: string; evidence: string; source: string };

/** Criteria crosswalk for SMI / TRP, with evidence drawn from the patient's own record. */
export function coverRows(patient: Patient): CoverRow[] {
  const since = addDays(DEMO_TODAY, -90);
  const recent = visitDatesFor(patient.mrn).filter(
    (d) => d >= since && d <= DEMO_TODAY,
  ).length;
  return [
    {
      criterion: "SMI diagnosis present for 12+ months",
      evidence: `${patient.diagnosisCode} ${patient.diagnosisLabel} · documented since ${fmtDate(addDays(patient.intakeDate, -420), true)}`,
      source: "Psychiatric evaluation (external)",
    },
    {
      criterion: "Functional impairment in 2+ life domains",
      evidence:
        "LOCUS dimensions: functional status 4, recovery environment 3, risk of harm 3 · composite 21",
      source: "LOCUS assessment",
    },
    {
      criterion: "Risk of decompensation without structure",
      evidence: `2 crisis contacts in the last 60 days · ${fmtDate(addDays(DEMO_TODAY, -38))} and ${fmtDate(addDays(DEMO_TODAY, -9))}`,
      source: "Primary care home monthly note",
    },
    {
      criterion: "Progress toward treatment-plan goals",
      evidence: `3 of 5 goals partially met · plan reviewed ${fmtDate(addDays(DEMO_TODAY, -19), true)}`,
      source: "Individualized treatment plan (signed)",
    },
    {
      criterion: "Attendance and engagement",
      evidence: `${patient.actualPerWeek} visits/week against ${patient.plannedPerWeek} planned · ${recent} visit days in the last 90 days`,
      source: "Attendance and progress summary",
    },
    {
      criterion: `Medical necessity for ${patient.plannedPerWeek} days/week`,
      evidence: `Clinician recommendation: ${patient.plannedPerWeek} days/week; step-down criteria not met · PHQ-9 18, GAD-7 14`,
      source: "Individualized treatment plan (signed)",
    },
  ];
}
