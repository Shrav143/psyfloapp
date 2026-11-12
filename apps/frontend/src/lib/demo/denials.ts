import { getDataset, visitDatesFor } from "./dataset";
import { addDays, DEMO_TODAY, daysBetween, VISIT_RATE } from "./format";
import { PAYER_BY_ID } from "./payers";
import type { DenialCategory, PayerId } from "./types";

export type DenialRoute = "p2p" | "appeal" | "resubmit" | "accept";

export type DenialStatus =
  | "new"
  | "p2p_scheduled"
  | "p2p_held"
  | "appeal_drafting"
  | "appeal_signoff"
  | "appeal_filed"
  | "receipt_unconfirmed"
  | "under_review"
  | "won"
  | "lost"
  | "accepted";

export type Denial = {
  id: string;
  mrn: string;
  payerId: PayerId;
  kind: "pa" | "claim";
  receivedAt: string;
  code: string;
  category: DenialCategory | "auth_missing" | "units_exceeded";
  reason: string;
  validity: "invalid" | "valid" | "unclear";
  validityNote: string;
  route: DenialRoute;
  status: DenialStatus;
  deadline: string;
  valueAtRisk: number;
  owner: string;
  appealId?: string;
  appealFiledAt?: string;
  appealReceiptAt?: string;
  appealDecidedAt?: string;
};

export const DENIAL_STATUS_LABEL: Record<DenialStatus, string> = {
  new: "New",
  p2p_scheduled: "P2P scheduled",
  p2p_held: "P2P held",
  appeal_drafting: "Appeal drafting",
  appeal_signoff: "Awaiting sign-off",
  appeal_filed: "Appeal filed",
  receipt_unconfirmed: "Receipt unconfirmed",
  under_review: "Under review",
  won: "Won",
  lost: "Lost",
  accepted: "Accepted",
};

const CLAIM_DENIALS: Denial[] = [
  {
    id: "den-claim-1",
    mrn: "HBH-1233",
    payerId: "aetna",
    kind: "claim",
    receivedAt: addDays(DEMO_TODAY, -4),
    code: "CO-197",
    category: "auth_missing",
    reason: "Precertification/authorization absent for DOS 02 Sep.",
    validity: "invalid",
    validityNote:
      "Authorization AET-4204N covers 28 Aug – 26 Nov. Payer matched the wrong reference. Resubmit with auth number in loop 2300 REF.",
    route: "resubmit",
    status: "new",
    deadline: addDays(DEMO_TODAY, 86),
    valueAtRisk: 3 * VISIT_RATE,
    owner: "Offshore billing",
  },
  {
    id: "den-claim-2",
    mrn: "HBH-1401",
    payerId: "passport",
    kind: "claim",
    receivedAt: addDays(DEMO_TODAY, -2),
    code: "CO-198",
    category: "units_exceeded",
    reason: "Precertification units exceeded for DOS 11–18 Sep.",
    validity: "valid",
    validityNote:
      "Units genuinely exhausted on 10 Sep. Renewal not yet filed. Recoverable only if the renewal is backdated.",
    route: "accept",
    status: "new",
    deadline: addDays(DEMO_TODAY, 88),
    valueAtRisk: 6 * VISIT_RATE,
    owner: "Jordan P.",
  },
];

let cache: Denial[] | undefined;

/** Prior-authorization denials from the last 180 days plus a few claim-level denials. */
export function denials(): Denial[] {
  if (cache) {
    return cache;
  }
  const ds = getDataset();
  const since = addDays(DEMO_TODAY, -180);
  const out: Denial[] = [];
  for (const a of ds.authorizations) {
    const payer = PAYER_BY_ID[a.payerId];
    a.versions.forEach((v, i) => {
      if (v.decision !== "denied" || (v.decidedAt ?? "") < since) {
        return;
      }
      const resolver = a.versions[i + 1];
      const events = a.events.filter(
        (e) =>
          e.versionNumber === v.number || e.versionNumber === resolver?.number,
      );
      const p2pHeld = events.find((e) => e.type === "p2p_held");
      const filed = events.find((e) => e.type === "appeal_filed");
      const receipt = events.find((e) => e.type === "receipt_confirmed");
      const appealDecided = events.find((e) => e.type === "appeal_decided");
      let status: DenialStatus = "new";
      let route: DenialRoute = "p2p";
      if (a.status === "p2p" && i === a.versions.length - 1) {
        status = "p2p_scheduled";
      } else if (a.status === "appeal" && i === a.versions.length - 1) {
        status = "appeal_signoff";
        route = "appeal";
      } else if (resolver?.kind === "p2p") {
        status = "won";
      } else if (resolver?.kind === "appeal") {
        route = "appeal";
        status =
          resolver.decision === "pending"
            ? daysBetween(resolver.submittedAt, DEMO_TODAY) < 4
              ? "receipt_unconfirmed"
              : "under_review"
            : resolver.decision === "approved"
              ? "won"
              : "lost";
      } else if (p2pHeld) {
        status = filed && !appealDecided ? "appeal_filed" : "lost";
        route = "appeal";
      }
      const visitsSince = visitDatesFor(a.mrn).filter(
        (d) => d >= (v.decidedAt as string),
      ).length;
      const category = v.reasonCategory ?? "no_reason";
      const validity =
        category === "no_reason"
          ? "unclear"
          : category === "missing_element" || category === "policy_change"
            ? "valid"
            : "invalid";
      out.push({
        id: `den-${v.id}`,
        mrn: a.mrn,
        payerId: a.payerId,
        kind: "pa",
        receivedAt: v.decidedAt as string,
        code:
          category === "medical_necessity"
            ? "MN-01"
            : category === "documentation"
              ? "DOC-02"
              : category === "missing_element"
                ? "ADM-03"
                : category === "policy_change"
                  ? "POL-04"
                  : "NR-00",
        category,
        reason: v.reason ?? "Adverse determination",
        validity,
        validityNote:
          validity === "invalid"
            ? "Packet met the payer's stated criteria; LOCUS and functional-impairment domains documented. Denial contradicts payer policy."
            : validity === "valid"
              ? "Packet was missing a required element per the payer's current policy. Fix and resubmit or appeal with the corrected document."
              : "No reason supplied on the notice. Agent will call the payer to obtain the specific criteria cited.",
        route,
        status,
        deadline: addDays(v.decidedAt as string, payer.appealDeadlineDays),
        valueAtRisk: Math.round(visitsSince * VISIT_RATE),
        owner: a.owner,
        appealId: route === "appeal" ? `ap-${v.id}` : undefined,
        appealFiledAt: filed?.at,
        appealReceiptAt: receipt?.at,
        appealDecidedAt:
          appealDecided?.at ??
          (resolver?.kind === "appeal" ? resolver.decidedAt : undefined),
      });
    });
  }
  cache = [...out, ...CLAIM_DENIALS].sort((x, y) =>
    x.receivedAt < y.receivedAt ? 1 : -1,
  );
  return cache;
}

export function denialSummary() {
  const all = denials();
  const open = all.filter(
    (d) => !["won", "lost", "accepted"].includes(d.status),
  );
  return {
    open: open.length,
    valueAtRisk: open.reduce((n, d) => n + d.valueAtRisk, 0),
    deadlineSoon: open.filter((d) => daysBetween(DEMO_TODAY, d.deadline) <= 14)
      .length,
    invalidShare: all.length
      ? all.filter((d) => d.validity === "invalid").length / all.length
      : 0,
    won: all.filter((d) => d.status === "won").length,
    lost: all.filter((d) => d.status === "lost").length,
  };
}

export function denialById(id: string): Denial | undefined {
  return denials().find((d) => d.id === id);
}
