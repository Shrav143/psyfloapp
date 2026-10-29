import {
  authByMrn,
  getDataset,
  patientByMrn,
  visitDatesFor,
} from "@/lib/demo/dataset";
import { type Clocks, clocksFor } from "@/lib/demo/derive";
import { addDays, DEMO_TODAY } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type { Authorization, Patient, Payer } from "@/lib/demo/types";
import { buildDocs, type DocItem } from "./packet-model";

export type RequestKind = "initial" | "renewal";

export const STEPS = [
  { key: "patient", title: "Patient & service" },
  { key: "requirements", title: "Payer requirements" },
  { key: "packet", title: "Packet & cover sheet" },
  { key: "signoff", title: "Clinician sign-off" },
  { key: "submit", title: "Submit & track" },
] as const;

export const SIGNOFF_STEP = 3;
export const SUBMIT_STEP = 4;

export const SIGNERS = ["Heather M., LCSW", "Marcus D., LPCC"];
export const COORDINATOR = "Jordan P.";

export type Signature = { by: string; at: string };
export type Submission = { reference: string; at: string; due: string };

export type WizardState = {
  step: number;
  mrn: string;
  kind: RequestKind;
  units: number;
  windowStart: string;
  requested: string[];
  approved: boolean;
  signer: string;
  signature?: Signature;
  submission?: Submission;
};

export type Patch = (p: Partial<WizardState>) => void;

/** Everything a step needs that derives from the chosen patient. */
export type RequestContext = {
  patient: Patient;
  payer: Payer;
  auth?: Authorization;
  clocks?: Clocks;
  docs: DocItem[];
  windowEnd: string;
  nextVersion: number;
};

export type StepProps = {
  state: WizardState;
  ctx: RequestContext;
  patch: Patch;
};

export function defaultUnits(payer: Payer): number {
  return payer.unitCap ?? 60;
}

export function initialState(
  mrnParam: string | null,
  kindParam: string | null,
): WizardState {
  const first = getDataset().patients[0]?.mrn ?? "";
  const mrn = mrnParam && patientByMrn(mrnParam) ? mrnParam : first;
  const patient = patientByMrn(mrn);
  return {
    step: 0,
    mrn,
    kind: kindParam === "renewal" ? "renewal" : "initial",
    units: patient ? defaultUnits(PAYER_BY_ID[patient.payerId]) : 60,
    windowStart: DEMO_TODAY,
    requested: [],
    approved: false,
    signer: SIGNERS[0] ?? "",
  };
}

export function buildContext(
  mrn: string,
  windowStart: string,
): RequestContext | undefined {
  const patient = patientByMrn(mrn);
  if (!patient) {
    return undefined;
  }
  const payer = PAYER_BY_ID[patient.payerId];
  const auth = authByMrn(patient.mrn);
  const clocks = auth
    ? clocksFor(patient, auth, visitDatesFor(patient.mrn))
    : undefined;
  return {
    patient,
    payer,
    auth,
    clocks,
    docs: buildDocs(patient, payer),
    windowEnd: addDays(windowStart, payer.typicalWindowDays),
    nextVersion: (auth?.versions.length ?? 0) + 1,
  };
}

/** The id the session store tracks: the ledger authorization when one exists, else the MRN. */
export function ledgerId(ctx: RequestContext): string {
  return ctx.auth?.id ?? ctx.patient.mrn;
}

export function channelLabel(payer: Payer): string {
  return payer.authChannel === "Availity" ? "Availity" : payer.authPortal;
}

export function referenceFor(payer: Payer): string {
  return `${payer.short.slice(0, 3).toUpperCase()}-7311K`;
}

export function kindLabel(kind: RequestKind, nextVersion: number): string {
  return `${kind === "renewal" ? "Renewal" : "Initial"} · v${nextVersion}`;
}

export function clockTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
