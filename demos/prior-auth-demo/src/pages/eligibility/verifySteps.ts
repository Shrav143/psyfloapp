import { needsCaller, simulateCheck } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type PayerId, type Program } from "@/data/types";
import { PROGRAM_CODES } from "./checks";

export interface VerifyStep {
  id: string;
  agent: AgentKey;
  wait: string; // shown while waiting
  doing: string; // shown while working
  done: string; // shown when finished
  ms: number;
}
export interface VerifyForm {
  payerId: PayerId | "";
  member: string;
  dob: string;
  program: Program;
  dos: string;
  cardName: string | null;
}

/** The ordered questions of one live check, about 10 seconds. Caller joins only when the plan's system does not answer (Evergreen). */
export function verifySteps(f: VerifyForm): VerifyStep[] {
  /* Before a payer is chosen the card shows the questions in general terms, so the page is never empty. */
  const payer = f.payerId ? payerById(f.payerId) : null;
  const who = payer?.shortName ?? "the payer";
  const source = !payer ? "the state" : payer.group === "Ohio Medicaid" ? "Ohio Medicaid" : who;
  const prog = PROGRAM_LABEL[f.program];
  const found = simulateCheck({ payerId: f.payerId || "summit", program: f.program, memberId: f.member, dos: f.dos });
  const e = found.eligibility;
  const coverage = e.state === "active" ? `coverage is active on ${f.dos}` : e.state === "not_found" ? "no coverage found for these details" : `coverage ${e.state} ${e.on}`;
  /* With no coverage found there is no plan to ask: the later questions are not asked, as on the result. */
  const noPlan = e.state === "not_found";
  const notAsked = "Not asked: no coverage was found";
  const steps: VerifyStep[] = [
    {
      id: "reader",
      agent: "reader",
      wait: "Will read the card and fill in the details",
      doing: f.cardName ? "Reading the card and filling in the details" : "Taking the member ID and date of birth as typed",
      done: f.cardName ? "Read the card and filled in the details" : "Took the member ID and date of birth as typed",
      ms: 1400,
    },
    { id: "state", agent: "verify", wait: `Will ask ${source} whether coverage is active`, doing: `Asking ${source} whether coverage is active on ${f.dos}`, done: `Asked ${source}: ${coverage}${found.otherInsurance ? ". Another plan pays first" : ""}`, ms: 2400 },
    {
      id: "benefits",
      agent: "verify",
      wait: `Will ask ${who} what ${prog} covers`,
      doing: `Asking ${who} what ${prog} covers`,
      done: noPlan ? notAsked : f.payerId && needsCaller(f.payerId) ? `${who}'s system did not answer` : found.benefits === "not_covered" ? `${who} does not cover ${prog}` : `${who} covers ${prog} (${PROGRAM_CODES[f.program]})${found.limit ? `. All ${found.limit.of} ${found.limit.unit} are used` : ""}`,
      ms: 2600,
    },
  ];
  if (f.payerId && needsCaller(f.payerId)) {
    steps.push({ id: "caller", agent: "caller", wait: "Will phone the payer if a system does not answer", doing: `${who} did not answer online. Caller is phoning`, done: `Caller phoned ${who}, confirmed the answers and logged the call`, ms: 2600 });
  }
  steps.push(
    { id: "auth", agent: "criteria", wait: "Will check whether an authorization is required", doing: "Checking whether an authorization is required", done: noPlan ? notAsked : found.auth === "not_required" ? `${who} does not require an authorization` : found.auth === "on_file" ? `An authorization is on file with ${who}` : "An authorization is required before the first day", ms: 1600 },
    { id: "enroll", agent: "navigator", wait: `Will check that the clinic is enrolled to bill ${who}`, doing: `Checking that the clinic is enrolled to bill ${who}`, done: noPlan ? notAsked : found.inNetwork ? "The clinic is enrolled and in network" : "The clinic is not enrolled for this program", ms: 1800 },
  );
  return steps;
}

/** A birth date that matches the age, so a case, a referral or a sample pre-fills the whole form. The date is never shown elsewhere. */
export const dobFor = (age: number | null | undefined): string => (age ? `01/15/${2026 - age}` : "");

export const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
export const formReady = (f: VerifyForm): boolean => !!f.payerId && f.member.replace(/\W/g, "").length >= 4 && DOB_RE.test(f.dob) && DOB_RE.test(f.dos);
export const clockText = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
