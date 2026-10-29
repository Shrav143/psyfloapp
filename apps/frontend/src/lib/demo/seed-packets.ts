import { PAYER_BY_ID } from "./payers";
import type { Rng } from "./seed";
import type {
  AuthEvent,
  Authorization,
  AuthVersion,
  DenialCategory,
  PacketDoc,
  PayerId,
} from "./types";

export const CLINICIANS = ["Heather M., LCSW", "Marcus D., LPCC"];
export const OWNERS = ["Jordan P.", "Priya S.", "Tracy C."];

const DENIAL_TEXT: Record<DenialCategory, string[]> = {
  medical_necessity: [
    "Does not meet criteria for continued TRP level of care; symptoms stable per submitted LOCUS.",
    "Not medically necessary. Member functioning does not support 3+ days per week programming.",
  ],
  documentation: [
    "Clinical documentation insufficient to establish SMI diagnosis duration.",
    "Submitted assessments do not document functional impairment in two or more life domains.",
  ],
  missing_element: [
    "Treatment plan signature page not included.",
    "Psychiatric evaluation older than 12 months.",
  ],
  eligibility: ["Member not eligible on requested start date."],
  policy_change: [
    "Request does not include LOCUS administered within 30 days (policy CP-BH-114).",
  ],
  no_reason: ["Adverse determination. No reason supplied on notice."],
};

export function pickDenial(
  rng: Rng,
  payerId: PayerId,
): { category: DenialCategory; reason: string } {
  const weights: [DenialCategory, number][] =
    payerId === "wellcare"
      ? [
          ["medical_necessity", 0.3],
          ["documentation", 0.4],
          ["missing_element", 0.12],
          ["no_reason", 0.13],
          ["policy_change", 0.05],
        ]
      : [
          ["medical_necessity", 0.5],
          ["documentation", 0.22],
          ["missing_element", 0.14],
          ["eligibility", 0.04],
          ["no_reason", 0.1],
        ];
  const r = rng.next();
  let acc = 0;
  for (const [cat, w] of weights) {
    acc += w;
    if (r < acc) {
      return { category: cat, reason: rng.pick(DENIAL_TEXT[cat]) };
    }
  }
  return { category: "no_reason", reason: DENIAL_TEXT.no_reason[0] as string };
}

export function standardPacket(
  rng: Rng,
  submittedAt: string,
  opts: { missing?: boolean } = {},
): PacketDoc[] {
  const docs: PacketDoc[] = [
    {
      name: "Cover sheet (criteria crosswalk)",
      kind: "cover_sheet",
      status: "attached",
    },
    { name: "LOCUS assessment", kind: "assessment", status: "attached" },
    {
      name: "SMI eligibility checklist",
      kind: "assessment",
      status: "attached",
    },
    {
      name: "Intake / biopsychosocial assessment",
      kind: "assessment",
      status: "attached",
    },
    {
      name: "Individualized treatment plan (signed)",
      kind: "treatment_plan",
      status: "attached",
    },
    { name: "PHQ-9 and GAD-7", kind: "assessment", status: "attached" },
    {
      name: "Psychiatric evaluation (external)",
      kind: "medical_record",
      status: "attached",
    },
    {
      name: "Primary care home monthly note",
      kind: "medical_record",
      status: "attached",
    },
    {
      name: "Attendance and progress summary",
      kind: "form",
      status: "attached",
    },
  ];
  for (const d of docs) {
    d.updatedAt = submittedAt;
  }
  if (opts.missing) {
    const idx = rng.int(1, docs.length - 1);
    (docs[idx] as PacketDoc).status = "missing";
  }
  return docs;
}

export function criteriaFor(payerId: PayerId): string {
  const set = PAYER_BY_ID[payerId].criteriaSet;
  return set === "unconfirmed"
    ? "Payer policy (set unconfirmed)"
    : `${set} level 3+`;
}

let eventSeq = 0;
export function ev(
  at: string,
  type: AuthEvent["type"],
  actor: AuthEvent["actor"],
  title: string,
  detail?: string,
  versionNumber?: number,
): AuthEvent {
  eventSeq += 1;
  return {
    id: `ev-${eventSeq}`,
    at,
    type,
    actor,
    title,
    detail,
    versionNumber,
  };
}

/** Events that every submitted-and-decided version leaves behind. */
export function eventsForVersion(
  v: AuthVersion,
  payerId: PayerId,
): AuthEvent[] {
  const payer = PAYER_BY_ID[payerId];
  const label =
    v.kind === "initial"
      ? "Initial request"
      : v.kind === "renewal"
        ? "Renewal request"
        : v.kind === "p2p"
          ? "Peer-to-peer outcome"
          : "Written appeal";
  const out: AuthEvent[] = [];
  if (v.kind === "initial" || v.kind === "renewal") {
    out.push(
      ev(
        v.submittedAt,
        "signed",
        "clinician",
        `${label} signed by ${v.signedBy}`,
        `${v.unitsAsked} units asked · ${v.packet.length} documents`,
        v.number,
      ),
      ev(
        v.submittedAt,
        "submitted",
        "agent",
        `Submitted via ${payer.authChannel}`,
        `Reference ${v.reference}`,
        v.number,
      ),
    );
  }
  if (v.decidedAt) {
    const gotWhat =
      v.decision === "approved"
        ? `Approved ${v.unitsGranted} of ${v.unitsAsked} units`
        : v.decision === "partial"
          ? `Partial: ${v.unitsGranted} of ${v.unitsAsked} units`
          : "Denied";
    out.push(
      ev(
        v.decidedAt,
        "decided",
        "payer",
        `${gotWhat} · ${payer.short}`,
        v.reason ??
          (v.criteriaCited ? `Criteria: ${v.criteriaCited}` : undefined),
        v.number,
      ),
    );
  }
  return out;
}

/** Replace a version's signed/submitted/decided events after its dates were reshaped. */
export function resyncVersionEvents(
  auth: Authorization,
  v: AuthVersion,
  payerId: PayerId,
): void {
  const kinds = new Set(["signed", "submitted", "decided"]);
  auth.events = auth.events.filter(
    (e) => e.versionNumber !== v.number || !kinds.has(e.type),
  );
  auth.events.push(...eventsForVersion(v, payerId));
}
