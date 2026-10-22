/* The shared verification record. One check of coverage and benefits for a patient, a payer, a program and dates of service.
   Eligibility & Benefits shows it as a row and a result; New case (step 2) reads and writes the same record, so a check made in
   either place is the one the other finds. Everything here is simulated and built from data the demo already has: the seeded
   patients and the scripted live check (data/eligibility.ts), the payer's plan type and cost share, the saved Payers rules for the
   authorization requirement, and the Case Manager ledger for an authorization that exists. No store state is changed here. */
import type { AppState } from "@/store";
import { AGENTS } from "./agents";
import {
  costShareText,
  EFFECTIVE_FROM,
  SEED_EB_PATIENTS,
  simulateCheck,
  type EbPatient,
} from "./eligibility";
import { SEED_LEDGER } from "./manager";
import type { PayerConfig } from "./payerConfig";
import { seedPayerConfig } from "./payerConfigSeed";
import { planInfo } from "./payerConfigPlan";
import { payerById } from "./seed";
import { buildPatientBook, isoOf as bookIso } from "./patients";
import { siteOf, type SiteId } from "./sites";
import type { AgentKey, PayerId, Program } from "./types";
import { HOUR } from "@/lib/time";

export type AuthRequirement = "required" | "concurrent" | "not_required" | "unknown";

export type VerificationException =
  | "coverage_inactive"
  | "payer_changed"
  | "member_id_mismatch"
  | "benefit_unconfirmed"
  | "service_not_covered"
  | "provider_unresolved"
  | "service_unavailable"
  | "requirement_unknown";

export interface VerificationRecord {
  /** The case id, or V-xxxx for a check made on the Verify form before any case exists. One record per case. */
  id: string;
  caseId: string;
  initials: string | null;
  age: number | null;
  memberMasked: string;
  payerId: PayerId;
  program: Program;
  /** The dates of service the check covers, as ISO yyyy-mm-dd. */
  dosFrom: string;
  dosTo: string;
  /** Demo minutes (see lib/time). */
  checkedAt: number;
  source: "simulated";
  coverage: { state: "active" | "inactive" | "unable" | "pending"; effective?: string; ended?: string };
  planType?: string;
  routing?: string;
  benefits: "covered" | "limited" | "not_covered" | "needs_confirmation";
  authRequirement: AuthRequirement;
  provider: "in_network" | "out_of_network" | "unconfirmed";
  existingAuth?: { ref: string; service: string; from: string; to: string; approved: number; used: number; unit: "days" | "units"; status: string };
  /** What the patient pays, only when the plan has a cost share on file. */
  costShare: string | null;
  exceptions: VerificationException[];
  /* Extras beyond the shared shape. */
  /** The Eligibility & Benefits row this record was built from: the full finding behind the summary above. */
  row: EbPatient;
  /** A check made at no case yet belongs to the site in view when it was made. Read it with `siteOfVerification`. */
  site?: SiteId;
}

/** What `verify` reads from the store. The whole `AppState` satisfies it. */
export type VerifyContext = Pick<AppState, "payerConfig" | "customPayers" | "ledger" | "agentPaused" | "clock" | "ebPatients">;

export interface VerifyInput {
  caseId: string;
  payerId: PayerId;
  program: Program;
  /** Dates of service. ISO yyyy-mm-dd or mm/dd/yyyy. */
  dosFrom: string;
  dosTo: string;
  initials?: string | null;
  age?: number | null;
  memberId?: string;
  /** For a check at no case yet: the site it belongs to. */
  site?: SiteId;
}

/* ------------------------------------------------------------------ dates */
const pad = (n: number): string => String(n).padStart(2, "0");
const MDY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "10/21/2026" or "2026-10-21" to "2026-10-21". Anything else is returned as it came. */
export const isoOf = (s: string): string => {
  const m = s.match(MDY);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : s;
};
/** "2026-10-21" to "10/21/2026". */
export const mdyOf = (s: string): string => {
  const m = s.match(ISO);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
};
const parts = (iso: string): [number, number, number] => {
  const m = iso.match(ISO);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [2026, 10, 21];
};
const fromDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const endOfMonth = (iso: string): string => {
  const [y, m] = parts(iso);
  return fromDate(new Date(y, m, 0));
};
const shiftDays = (iso: string, n: number): string => {
  const [y, m, d] = parts(iso);
  return fromDate(new Date(y, m - 1, d + n));
};

/** "10/21/2026 to 10/31/2026": the dates of service a check covers. */
export function dosRangeText(p: Pick<EbPatient, "dos" | "dosTo">): string {
  const from = isoOf(p.dos);
  const to = p.dosTo ? isoOf(p.dosTo) : endOfMonth(from);
  return `${mdyOf(from)} to ${mdyOf(to < from ? from : to)}`;
}

const EFFECTIVE_ISO = isoOf(EFFECTIVE_FROM);
const last4 = (s: string): string => s.replace(/\W/g, "").slice(-4);

/** A check made at no case yet belongs to one site. Read the site of any record through this, not through `siteOf` alone. */
export const siteOfVerification = (rec: Pick<VerificationRecord, "caseId" | "site">): SiteId => rec.site ?? siteOf(rec.caseId);

/* ------------------------------------------------------------------ the record from a row */
const WORDS: Record<Program, string[]> = { RES: ["residential"], IOP: ["iop", "intensive outpatient"], PHP: ["php", "partial hosp"], WM: ["detox", "withdrawal management"] };
/** True when the payer's saved "No authorization needed" rule names this level of care. */
const ruleSaysNoAuth = (cfg: PayerConfig | undefined, program: Program): boolean => (cfg?.rules.find((r) => r.id === "noauth")?.lines ?? []).some((l) => WORDS[program].some((w) => l.toLowerCase().includes(w)));

/** Required, concurrent review (an authorization is on file and each stay is reviewed), not required, or unknown when the payer has no rule on file for this level of care. */
function requirementOf(p: EbPatient, state: VerifyContext): AuthRequirement {
  if (p.eligibility.state === "unavailable" || p.auth === "unknown") return "unknown";
  if (p.auth === "not_required") return "not_required";
  const cfg = state.payerConfig[p.payerId];
  if (!cfg) return "unknown";
  const added = state.customPayers.find((c) => c.id === p.payerId);
  if (added && !added.programs.includes(p.program)) return "unknown";
  if (ruleSaysNoAuth(cfg, p.program)) return "not_required";
  return p.auth === "on_file" ? "concurrent" : "required";
}

function existingAuthOf(p: EbPatient, state: VerifyContext): VerificationRecord["existingAuth"] {
  if (p.eligibility.state === "not_found" || p.eligibility.state === "unavailable") return undefined;
  const led = state.ledger.find((c) => c.id === p.id || c.caseId === p.id);
  const count = p.limit ? { used: p.limit.used, approved: p.limit.of, unit: p.limit.unit } : led && led.total !== null ? { used: led.used ?? 0, approved: led.total, unit: led.unit } : null;
  if (!count) return undefined;
  /* A unit is about one visit, three a week; a day is a day. The window is worked back from the date of service so the numbers agree. */
  const per = count.unit === "units" ? 7 / 3 : 1;
  /* When the Case Manager ledger has an approved window for this case, the reference and the dates are the ledger's, so Intake in New case and this check show the same authorization. */
  const book = led ? buildPatientBook([led], [], state.clock).authorizations.find((a) => a.approvedFrom !== null && a.approvedTo !== null) : undefined;
  const from = book?.approvedFrom != null ? bookIso(book.approvedFrom) : shiftDays(isoOf(p.dos), -Math.round(count.used * per));
  const digits = p.id.replace(/\D/g, "");
  return {
    ref: book?.id ?? `AU-${digits || "0000"}`,
    service: p.levelLabel ?? PROGRAM_NAME[p.program],
    from,
    to: book?.approvedTo != null ? bookIso(book.approvedTo) : shiftDays(from, Math.round(count.approved * per)),
    approved: count.approved,
    used: count.used,
    unit: count.unit,
    status: count.used >= count.approved ? "All used" : "Active",
  };
}
const PROGRAM_NAME: Record<Program, string> = { RES: "Residential 3.5", IOP: "IOP", PHP: "PHP", WM: "Detox" };

/** The warnings a check raises, most important first. A check that did not run raises only that. */
export function exceptionsOf(p: EbPatient, requirement: AuthRequirement): VerificationException[] {
  if (p.eligibility.state === "unavailable") return ["service_unavailable"];
  const out: VerificationException[] = [];
  if (p.refreshFailed !== undefined) out.push("service_unavailable");
  if (p.eligibility.state === "not_found" || p.idMismatch) out.push("member_id_mismatch");
  if (p.eligibility.state === "lapsed" || p.eligibility.state === "ended") out.push("coverage_inactive");
  if (p.payerChanged) out.push("payer_changed");
  if (p.benefits === "needs_confirmation") out.push("benefit_unconfirmed");
  if (p.benefits === "not_covered") out.push("service_not_covered");
  if (p.networkUnresolved) out.push("provider_unresolved");
  if (requirement === "unknown") out.push("requirement_unknown");
  return out;
}

/** A standalone row and a New case check are the same shape: this builds it from a row. */
export function recordFromEb(p: EbPatient, state: VerifyContext): VerificationRecord {
  const payer = payerById(p.payerId);
  const plan = payer ? planInfo(payer) : null;
  const e = p.eligibility;
  const dosFrom = isoOf(p.dos);
  const through = p.dosTo ? isoOf(p.dosTo) : endOfMonth(dosFrom);
  const requirement = requirementOf(p, state);
  const known = e.state !== "not_found" && e.state !== "unavailable";
  return {
    id: p.id,
    caseId: p.id,
    initials: p.initials,
    age: p.age,
    memberMasked: p.memberMasked,
    payerId: p.payerId,
    program: p.program,
    dosFrom,
    dosTo: through < dosFrom ? dosFrom : through,
    checkedAt: p.checkedAt,
    source: "simulated",
    coverage:
      e.state === "active"
        ? { state: "active", effective: EFFECTIVE_ISO }
        : e.state === "lapsed" || e.state === "ended"
          ? { state: "inactive", effective: EFFECTIVE_ISO, ended: `${dosFrom.slice(0, 4)}-${(e.on ?? "").replace("/", "-")}` }
          : { state: "unable" },
    planType: known ? plan?.label : undefined,
    routing: known ? plan?.routing : undefined,
    benefits: p.benefits,
    authRequirement: requirement,
    provider: p.networkUnresolved ? "unconfirmed" : p.inNetwork ? "in_network" : "out_of_network",
    existingAuth: existingAuthOf(p, state),
    costShare: known && payer ? costShareText(payer.group) : null,
    exceptions: exceptionsOf(p, requirement),
    row: p,
    site: p.site,
  };
}

/* ------------------------------------------------------------------ verify and reuse */
/** The payer's saved rules decide the one thing the scripted check does not: a level of care a payer's own "No authorization needed" rule names needs none,
    and a payer added on Payers that does not cover the level of care has no rule on file. Only a plain "required" is changed. */
function withRules(p: EbPatient, state: VerifyContext): EbPatient {
  if (p.auth !== "required") return p;
  if (ruleSaysNoAuth(state.payerConfig[p.payerId], p.program)) return { ...p, auth: "not_required" };
  const added = state.customPayers.find((c) => c.id === p.payerId);
  return added && !added.programs.includes(p.program) ? { ...p, auth: "unknown" } : p;
}

/** One check, run on the demo clock. Pure: the same input and state give the same record. A patient the demo knows (a seeded case) keeps what the plan said;
    anyone else is answered by the scripted live check from the member ID. While the Verify agent is paused in Settings nothing can be asked:
    a known patient keeps the last result with a "service unavailable" warning, anyone else has no result. */
export function verify(input: VerifyInput, state: VerifyContext): VerificationRecord {
  const dosFrom = isoOf(input.dosFrom);
  const dosTo = isoOf(input.dosTo) < dosFrom ? dosFrom : isoOf(input.dosTo);
  const through = dosTo > endOfMonth(dosFrom) ? dosTo : endOfMonth(dosFrom);
  const known = state.ebPatients.find((x) => x.id === input.caseId);
  /* A check that never ran has no answers to keep, so asking again is a fresh check. */
  const same = known && known.payerId === input.payerId && known.program === input.program && known.eligibility.state !== "unavailable" ? known : undefined;
  const mark = { dos: mdyOf(dosFrom), dosTo: mdyOf(through) };

  if (state.agentPaused.verify) {
    const row: EbPatient = same ? { ...same, ...mark, refreshFailed: state.clock } : { ...fresh(input, state, mark), eligibility: { state: "unavailable" }, benefits: "needs_confirmation", auth: "unknown", networkUnresolved: true, limit: undefined, noDayLimit: undefined };
    return recordFromEb(row, state);
  }
  const row: EbPatient = same
    ? withRules({ ...same, ...mark, checkedAt: state.clock, recheckDue: false, recheckAt: undefined, autoAt: undefined, refreshFailed: undefined, site: same.site ?? input.site }, state)
    : withRules({ ...fresh(input, state, mark), ...simulateCheck({ payerId: input.payerId, program: input.program, memberId: input.memberId ?? "", dos: mark.dos }) }, state);
  return recordFromEb(row, state);
}

/** The patient and the check, before the plan has answered. */
function fresh(input: VerifyInput, state: VerifyContext, mark: { dos: string; dosTo: string }): EbPatient {
  return {
    id: input.caseId,
    initials: input.initials ?? null,
    age: input.age ?? null,
    payerId: input.payerId,
    program: input.program,
    memberMasked: `…${last4(input.memberId ?? "") || "0000"}`,
    eligibility: { state: "active" },
    benefits: "covered",
    auth: "required",
    inNetwork: true,
    otherInsurance: false,
    ...mark,
    site: input.site,
    checkedAt: state.clock,
    recheckDue: false,
  };
}

/** A check is reused when it is for the same patient, payer and program, the dates asked for fall inside the dates it covers, and it was made within 24 demo hours.
    A check that could not run is never reused. */
export function canReuse(rec: VerificationRecord, want: { caseId: string; payerId: PayerId; program: Program; dosFrom: string; dosTo: string }, clock: number): boolean {
  if (rec.caseId !== want.caseId || rec.payerId !== want.payerId || rec.program !== want.program) return false;
  if (rec.coverage.state === "unable" && rec.exceptions.includes("service_unavailable")) return false;
  const from = isoOf(want.dosFrom);
  const to = isoOf(want.dosTo);
  if (from < rec.dosFrom || (to < from ? from : to) > rec.dosTo) return false;
  const age = clock - rec.checkedAt;
  return age >= 0 && age <= 24 * HOUR;
}

/* ------------------------------------------------------------------ seed */
/** One record per seeded patient, built the way the store builds one after a check. Reads only seed data, so it can run before the store exists. */
export function seedVerifications(): Record<string, VerificationRecord> {
  const ctx: VerifyContext = {
    payerConfig: seedPayerConfig(),
    customPayers: [],
    ledger: SEED_LEDGER,
    agentPaused: Object.fromEntries((Object.keys(AGENTS) as AgentKey[]).map((k) => [k, false])) as Record<AgentKey, boolean>,
    clock: 0,
    ebPatients: SEED_EB_PATIENTS,
  };
  return Object.fromEntries(SEED_EB_PATIENTS.map((p) => [p.id, recordFromEb(p, ctx)]));
}
