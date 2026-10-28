import { completeness, type CheckItem, type CheckStatus } from "../intake/checklist";
import type { IntakeRecord } from "../intake/types";
import type { DualReadiness, ReadinessItem, ReadinessStatus, ReadinessTrack } from "./types";

/* Clinical readiness and administrative readiness, kept apart. Clinical readiness is about the assessment and sign-off; administrative readiness is
   about coverage, consent, documents and the authorization packet. Neither is an approval, and neither says medical necessity is established.
   This first version reads the completeness checklist; the care planning engineer refines it with the plan's instruments. */

const STATUS: Record<CheckStatus, ReadinessStatus> = { complete: "complete", missing: "missing", verify: "verify", na: "na", later: "na", blocked: "blocked", pending: "pending" };
const CLINICAL = new Set(["assessment", "cans", "lon", "safety", "signatures", "service"]);

const toItem = (i: CheckItem): ReadinessItem => ({ id: i.id, label: i.label, status: STATUS[i.status], detail: i.detail, go: { section: i.section } });
const track = (items: ReadinessItem[]): ReadinessTrack => {
  const open = items.filter((i) => !["complete", "na"].includes(i.status)).length;
  const started = items.some((i) => i.status === "complete");
  const blocked = items.some((i) => i.status === "blocked");
  return { items, open, state: blocked ? "blocked" : open === 0 && items.length > 0 ? "complete" : started ? "in_progress" : "not_started" };
};

export const READINESS_NOTE = "Readiness is not an approval and not a finding of medical necessity. A clinician decides the level of care; the payer decides the authorization.";

export function dualReadiness(r: IntakeRecord, now: number): DualReadiness {
  const items = completeness(r, now);
  return {
    clinical: track(items.filter((i) => CLINICAL.has(i.category)).map(toItem)),
    administrative: track(items.filter((i) => !CLINICAL.has(i.category)).map(toItem)),
    note: READINESS_NOTE,
  };
}
