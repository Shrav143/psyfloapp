import { needsCaller, simulateCheck } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type PayerId, type Program } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { codesText } from "@/data/programTables";

export interface VerifyStep {
  id: string;
  agent: AgentKey;
  /** What is asked, as a label: shown while waiting and while checking. */
  label: string;
  /** The answer, shown when the step is done. */
  done: string;
  ms: number;
}
export interface VerifyForm {
  payerId: PayerId | "";
  member: string;
  dob: string;
  program: Program;
  dos: string;
  /** Where the details came from when they were imported ("From a pasted screenshot"), or null when typed. */
  source: string | null;
}

/** The ordered questions of one live check, about 10 seconds. Caller joins only when the plan's system does not answer (Aetna).
    While Verify is paused in Settings nothing is asked: the check still runs through its steps and says so on each. */
export function verifySteps(f: VerifyForm, paused = false): VerifyStep[] {
  /* Before a payer is chosen the steps name the questions in general terms, so the card is never empty. */
  const payer = f.payerId ? payerById(f.payerId) : null;
  const who = payer?.shortName ?? "the payer";
  const source = payer && vaPlanOf(payer.id) ? "Virginia Medicaid" : "the state";
  const prog = PROGRAM_LABEL[f.program];
  const found = simulateCheck({ payerId: f.payerId || "summit", program: f.program, memberId: f.member, dos: f.dos });
  const e = found.eligibility;
  const moved = found.payerChanged ? payerById(found.payerChanged.to) : null;
  const coverage =
    e.state === "active"
      ? found.idMismatch
        ? `Active under the member ID ending ${found.idMismatch.onFile.replace("…", "")}`
        : `Active on ${f.dos}`
      : e.state === "not_found"
        ? "No coverage found"
        : `${e.state === "lapsed" ? "Lapsed" : "Ended"} ${e.on}${moved ? `, with ${moved.name} since ${found.payerChanged?.since}` : ""}`;
  /* With no coverage found there is no plan to ask: the later questions are not asked, as on the result. */
  const noPlan = e.state === "not_found";
  const notAsked = "Not asked: no coverage found";
  const caller = !!f.payerId && needsCaller(f.payerId);
  const steps: VerifyStep[] = [
    { id: "reader", agent: "reader", label: "Member details", done: f.source ?? "As typed", ms: 1400 },
    { id: "state", agent: "verify", label: `Coverage with ${source}`, done: `${coverage}${found.otherInsurance ? ". Another plan pays first" : ""}`, ms: 2400 },
    {
      id: "benefits",
      agent: "verify",
      label: `${prog} benefits with ${who}`,
      done: noPlan ? notAsked : caller ? "No answer online" : found.benefits === "not_covered" ? "Not covered" : found.benefits === "needs_confirmation" ? `Not confirmed by ${who}` : `Covered (${codesText(f.program)})${found.limit ? (found.limit.used >= found.limit.of ? `. All ${found.limit.of} ${found.limit.unit} used` : `. ${found.limit.used} of ${found.limit.of} ${found.limit.unit} used`) : ""}`,
      ms: 2600,
    },
  ];
  if (caller) steps.push({ id: "caller", agent: "caller", label: `Phone call to ${who}`, done: "Answers confirmed, call logged", ms: 2600 });
  steps.push(
    { id: "auth", agent: "criteria", label: "Authorization rule", done: noPlan ? notAsked : found.auth === "unknown" ? "No rule on file. Nothing was assumed" : found.auth === "not_required" ? "Not required" : found.auth === "on_file" ? `On file with ${who}` : "Required before the first day", ms: 1600 },
    { id: "enroll", agent: "navigator", label: `Enrollment with ${who}`, done: noPlan ? notAsked : found.networkUnresolved ? "Not confirmed" : found.inNetwork ? "Enrolled, in network" : "Not enrolled for this program", ms: 1800 },
  );
  /* A paused Verify asks nothing: every question after the member details says why it was not asked. */
  return paused ? steps.map((x) => (x.id === "reader" ? x : { ...x, done: "Not asked: Verify is paused in Settings" })) : steps;
}

/** A birth date that matches the age, so a case, a referral or a sample pre-fills the whole form. The date is never shown elsewhere. */
export const dobFor = (age: number | null | undefined): string => (age ? `01/15/${2026 - age}` : "");

export const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
export const formReady = (f: VerifyForm): boolean => !!f.payerId && f.member.replace(/\W/g, "").length >= 4 && DOB_RE.test(f.dob) && DOB_RE.test(f.dos);
export const clockText = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
