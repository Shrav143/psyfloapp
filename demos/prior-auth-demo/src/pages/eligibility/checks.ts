/* The seven payment checks, the verdict and the fact that decides it, built from one patient row. Pure, so the list, the result page,
   the details panel and New Case step 2 all say the same thing. Lines are values, not explanations. */
import { AUTH_LABEL, costShareText, coverageDates, EFFECTIVE_FROM, needsCaller, verdictOf, type EbPatient, type Verdict } from "@/data/eligibility";
import { planInfo } from "@/data/payerConfigPlan";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type Program, type Tone } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { dosRangeText } from "@/data/verification";
import { BASE, toDate } from "@/lib/time";

export interface PaymentCheck {
  id: string;
  title: string;
  detail: string;
  chip: string;
  tone: Tone;
  /** "unknown" means the check could not run, for example when no coverage was found. */
  unknown?: boolean;
  /** A warning that stops "Cleared to bill" without being a failure: the verdict fact can name it. */
  blocks?: boolean;
}
export interface AgentLine {
  agent: AgentKey;
  label: string;
  secs: number;
  answer: string;
}
/** One part of the summary at the top of a result: a chip, one value line, and for benefits the service limit and what the patient pays. `unknown` when no plan knew the member. */
export interface SummaryPart {
  chip: string;
  tone: Tone;
  line: string;
  unknown?: boolean;
}
export interface ResultSummary {
  coverage: SummaryPart;
  benefits: SummaryPart & { limit: string | null; pays: string | null };
  auth: SummaryPart;
}
/** The one fact that decides the verdict, as a label and a value: "Coverage" "Lapsed 10/12". `id` is the payment check it comes from. */
export interface VerdictFact {
  id: string;
  label: string;
  value: string;
}
export interface CheckResult {
  verdict: Verdict;
  fact: VerdictFact;
  checks: PaymentCheck[];
  summary: ResultSummary;
  /** What the patient pays. Null when no coverage was found or the plan has no cost share on file (every Virginia Medicaid plan in the demo): then nothing is said about cost. */
  patientPays: string | null;
  agents: AgentLine[];
  /** The monthly coverage check after this one (demo minutes), or null when there is no coverage to watch. */
  nextCheckAt: number | null;
}

export const PROGRAM_CODES: Record<Program, string> = { RES: "H0018 and H0019", IOP: "H0015", PHP: "H0035", WM: "H0010 and H0011" };

const lower = (p: Program): string => (p === "IOP" || p === "PHP" ? PROGRAM_LABEL[p] : PROGRAM_LABEL[p].toLowerCase());
const tail = (masked: string): string => masked.replace("…", "");

/** Row 1. Coverage is the only row that can run when no plan knows the member. */
function coverageCheck(p: EbPatient): PaymentCheck {
  const payer = payerById(p.payerId);
  const on = p.eligibility.on ?? "";
  if (p.eligibility.state === "unavailable") return { id: "active", title: "Coverage could not be checked", detail: "Not asked: Verify is paused in Settings", chip: "Not checked", tone: "neutral", unknown: true };
  if (p.eligibility.state === "active" && p.idMismatch) return { id: "active", title: "Coverage is active, under another member ID", detail: `The plan has this member under the ID ending ${tail(p.idMismatch.onFile)}`, chip: "ID differs", tone: "risk" };
  if (p.eligibility.state === "active") {
    const detail = `${vaPlanOf(payer.id) ? "Virginia Medicaid" : payer.name}, active since ${EFFECTIVE_FROM}, no end date`;
    return { id: "active", title: "Coverage is active on the service date", detail, chip: "Active", tone: "good" };
  }
  if (p.eligibility.state === "not_found") return { id: "active", title: "Coverage was not found", detail: "No member matched this ID and date of birth", chip: "Not found", tone: "risk" };
  /* The chip carries the date, and a plan the member moved to is the next check, so there is nothing more to say here. */
  return { id: "active", title: "Coverage is not active on the service date", detail: "", chip: `${p.eligibility.state === "lapsed" ? "Lapsed" : "Ended"} ${on}`, tone: "risk" };
}

/** Rows 2 to 7, for a member the plan knows. */
function planChecks(p: EbPatient): PaymentCheck[] {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const codes = PROGRAM_CODES[p.program];
  const left = p.limit ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used` : "";
  const free = p.limit ? p.limit.of - p.limit.used : null;
  const spent = free !== null && free <= 0;
  const planDetail = planInfo(payer)?.detail ?? `Claims go to ${payer.name}`;
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
  const auth: Record<EbPatient["auth"], PaymentCheck> = {
    not_required: { id: "auth", title: "Authorization", detail: `${who} does not require one for ${lower(p.program)}`, chip: "Not required", tone: "good" },
    on_file: { id: "auth", title: "Authorization", detail: `On file with ${who}${left ? `. ${left}` : ""}`, chip: "On file", tone: "good" },
    in_progress: { id: "auth", title: "Authorization", detail: "Required before the first day. A request is being drafted", chip: "Required", tone: "mid" },
    reviewing: { id: "auth", title: "Authorization", detail: `Required. Under review with ${who}`, chip: "Under review", tone: "mid" },
    retro_open: { id: "auth", title: "Authorization", detail: "Retro-authorization request open, for days already delivered", chip: "Retro request open", tone: "mid" },
    required: { id: "auth", title: "Authorization", detail: "Required before the first day. Not on file", chip: "Required", tone: "mid" },
    unknown: { id: "auth", title: "Authorization", detail: `No rule on file for ${who} and ${lower(p.program)}. Nothing was assumed`, chip: "Unknown", tone: "neutral", unknown: true },
  };
  return [
    moved && p.payerChanged
      ? { id: "plan", title: "The member is with another plan now", detail: `${moved.name}, since ${p.payerChanged.since}`, chip: "Plan changed", tone: "risk" }
      : { id: "plan", title: "It is the right plan", detail: planDetail, chip: who, tone: "good" },
    p.benefits === "needs_confirmation"
      ? { id: "service", title: "The service is not confirmed", detail: `${who} answered for coverage, not for ${prog}. Codes ${codes}`, chip: "Not confirmed", tone: "mid", blocks: true }
      : p.benefits === "covered"
      ? { id: "service", title: "The service is covered", detail: `${prog} is payable for substance use disorder${p.dx ? ` (${p.dx} on the chart)` : ""}. Codes ${codes}`, chip: "Covered", tone: "good" }
      : p.benefits === "limited"
        ? { id: "service", title: "The service is covered with conditions", detail: `${prog} is payable when the diagnosis is on the plan's list and each day is authorized. Codes ${codes}`, chip: "Limited", tone: "mid" }
        : { id: "service", title: "The service is not covered", detail: `${prog} is not a covered benefit under this plan. Codes ${codes}`, chip: "Not covered", tone: "risk" },
    auth[p.auth],
    p.networkUnresolved
      ? { id: "bill", title: "The clinic's enrollment is not confirmed", detail: `Enrollment with ${who} for ${lower(p.program)} could not be confirmed`, chip: "Not confirmed", tone: "mid", blocks: true }
      : p.inNetwork
      ? { id: "bill", title: "The clinic can bill", detail: `Enrolled and in network with ${who} for ${lower(p.program)}`, chip: "In network", tone: "good" }
      : { id: "bill", title: "The clinic cannot bill yet", detail: `Not enrolled with ${who} for ${lower(p.program)}`, chip: "Not enrolled", tone: "risk" },
    p.limit && free !== null
      ? { id: "limits", title: spent ? `Every authorized ${p.limit.unit === "days" ? "day" : "unit"} is used` : "Limits", detail: `${left} in this authorization period`, chip: spent ? "Limit reached" : `${free} ${p.limit.unit} left`, tone: spent ? "risk" : free <= 3 ? "mid" : "good" }
      : { id: "limits", title: "Limits", detail: p.noDayLimit ? `No annual day limit for ${lower(p.program)}` : "No visit or day limit for this program", chip: "No limit", tone: "good" },
    p.otherInsurance
      ? { id: "other", title: "Another plan pays first", detail: "A second plan was found. It is billed before this one", chip: "Other plan", tone: "risk" }
      : { id: "other", title: "No other insurance", detail: "None found", chip: "None", tone: "good" },
  ];
}

/** With no coverage found there is no plan to ask, so one line says so instead of six grey rows. */
const notChecked = (p: EbPatient): PaymentCheck => ({
  id: "rest",
  title: "Nothing else could be checked",
  detail: p.eligibility.state === "unavailable" ? "Not asked: Verify is paused in Settings" : "Plan, benefits, authorization, enrollment, limits and other insurance: not asked, no coverage found",
  chip: "Not checked",
  tone: "neutral",
  unknown: true,
});

/** The three parts of the summary at the top of a result: coverage with its dates, benefits with the service limit and what the patient pays, and the authorization. */
function summaryOf(p: EbPatient, checks: PaymentCheck[], found: boolean): ResultSummary {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const cover = checks[0];
  /* The chip says what the state of coverage means: eligible, not eligible, or a problem that can be fixed (a lapse the state can restore, a member ID to correct). */
  const word = { active: p.idMismatch ? "Needs a fix" : "Eligible", ended: "Not eligible", lapsed: "Needs a fix", not_found: "Needs a fix", unavailable: "Not checked" }[p.eligibility.state];
  const unavailable = p.eligibility.state === "unavailable";
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
  const dates = coverageDates(p);
  const coverage: SummaryPart = {
    chip: word,
    tone: cover.tone,
    line: unavailable
      ? "Not asked: Verify is paused in Settings"
      : p.idMismatch
        ? `Active, under the member ID ending ${tail(p.idMismatch.onFile)}`
        : dates
          ? `${dates}${moved && p.payerChanged ? ` · with ${moved.name} since ${p.payerChanged.since}` : ""}`
          : "No coverage found for these details",
    unknown: unavailable || undefined,
  };
  if (!found) {
    const none: SummaryPart = { chip: "Not checked", tone: "neutral", line: "Not asked", unknown: true };
    return { coverage, benefits: { ...none, limit: null, pays: null }, auth: none };
  }
  const service = checks.find((c) => c.id === "service");
  const codes = PROGRAM_CODES[p.program];
  const free = p.limit ? p.limit.of - p.limit.used : null;
  const limit = p.limit && free !== null ? (free <= 0 ? `All ${p.limit.of} ${p.limit.unit} used` : `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used, ${free} left`) : p.noDayLimit ? "No annual day limit" : null;
  const benefitLine = p.benefits === "covered" ? `${prog} · ${codes}` : p.benefits === "limited" ? `${prog}, with conditions · ${codes}` : p.benefits === "needs_confirmation" ? `${prog} not confirmed by ${who} · ${codes}` : `${prog} not covered · ${codes}`;
  const authLine: Record<EbPatient["auth"], string> = {
    not_required: `${who} does not require one for ${lower(p.program)} · ${dosRangeText(p)}`,
    unknown: `No rule on file for ${who} and ${lower(p.program)}`,
    on_file: `On file with ${who}`,
    in_progress: "Before the first day · request being drafted",
    reviewing: `Under review with ${who}`,
    retro_open: "For days already delivered",
    required: "Before the first day",
  };
  return {
    coverage,
    benefits: { chip: service?.chip ?? "Covered", tone: service?.tone ?? "good", line: benefitLine, limit, pays: costShareText(payer.group) },
    auth: { chip: AUTH_LABEL[p.auth].text, tone: AUTH_LABEL[p.auth].tone, line: authLine[p.auth], unknown: p.auth === "unknown" || undefined },
  };
}

const FACT_LABEL: Record<string, string> = { active: "Coverage", plan: "Plan", service: "Benefits", auth: "Authorization", bill: "Enrollment", limits: "Limit", other: "Other insurance", rest: "Coverage" };

/** The one fact behind the verdict. Fix: the first check that fails or blocks. Authorization first: where the authorization stands. Cleared: the authorization on file, with what is left. */
function factOf(p: EbPatient, checks: PaymentCheck[], verdict: Verdict): VerdictFact {
  if (verdict === "unchecked") return { id: "active", label: "Coverage", value: "Not checked" };
  if (verdict === "fix") {
    const c = checks.find((x) => x.tone === "risk" || x.blocks) ?? checks[0];
    const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
    const value =
      c.id === "active" && p.idMismatch
        ? `Plan has ID ending ${tail(p.idMismatch.onFile)}`
        : c.id === "active" && moved
          ? `${c.chip}, now with ${moved.shortName}`
          : c.id === "limits" && p.limit
            ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used`
            : c.id === "other"
              ? "Another plan pays first"
              : c.chip;
    return { id: c.id, label: c.id === "active" && p.idMismatch ? "Member ID" : FACT_LABEL[c.id], value };
  }
  const free = p.limit ? p.limit.of - p.limit.used : null;
  const left = verdict === "cleared" && p.limit && free !== null ? `, ${free} ${p.limit.unit} left` : "";
  return { id: "auth", label: "Authorization", value: `${AUTH_LABEL[p.auth].text}${left}` };
}

/** 6:00 am on the first of the month after the check, in demo minutes: when coverage is looked at again. */
const nextMonthFirst = (at: number): number => {
  const d = toDate(at);
  return Math.round((new Date(d.getFullYear(), d.getMonth() + 1, 1, 6, 0).getTime() - BASE.getTime()) / 60_000);
};

export function buildResult(p: EbPatient): CheckResult {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const found = p.eligibility.state !== "not_found" && p.eligibility.state !== "unavailable";
  const on = p.eligibility.on ?? "";
  const checks = [coverageCheck(p), ...(found ? planChecks(p) : [notChecked(p)])];
  const verdict = verdictOf(p);
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;

  const state = vaPlanOf(payer.id) ? "Virginia Medicaid" : who;
  const agents: AgentLine[] = [
    {
      agent: "verify",
      label: `Eligibility with ${state}`,
      secs: p.eligibility.state === "unavailable" ? 0 : 3,
      answer: p.eligibility.state === "unavailable" ? "Not asked: Verify is paused in Settings" : p.eligibility.state === "active" ? `Coverage active, effective ${EFFECTIVE_FROM}, no end date${p.idMismatch ? `. The plan has the member under the ID ending ${tail(p.idMismatch.onFile)}` : ""}` : !found ? "No member matched the ID and date of birth" : `Coverage ${p.eligibility.state} ${on}${moved ? `. The member is with ${moved.name} since ${p.payerChanged?.since}` : ""}`,
    },
  ];
  /* The other agents only ran when a plan knew the member. */
  if (found) {
    agents.push(
      { agent: "verify", label: `Benefits with ${who}`, secs: 5, answer: p.benefits === "needs_confirmation" ? `${who} did not confirm ${prog} under codes ${PROGRAM_CODES[p.program]}` : `${prog} ${p.benefits === "not_covered" ? "is not payable" : "is payable"} under codes ${PROGRAM_CODES[p.program]}` },
      { agent: "criteria", label: "Authorization rule", secs: 2, answer: p.auth === "unknown" ? `No rule on file for ${who} and ${lower(p.program)}. Nothing was assumed` : p.auth === "not_required" ? `${who} does not require authorization for ${lower(p.program)}` : `${who} requires authorization for ${lower(p.program)} before the first day` },
      { agent: "navigator", label: "Provider enrollment", secs: 2, answer: p.networkUnresolved ? `Could not confirm the clinic's enrollment with ${who} for ${lower(p.program)}` : p.inNetwork ? `The clinic is enrolled and in network with ${who}` : `No enrollment on file with ${who} for ${lower(p.program)}` },
    );
  }
  if (needsCaller(p.payerId)) agents.push({ agent: "caller", label: `Phone call to ${who}`, secs: 94, answer: `${who}'s system did not answer. Caller phoned and logged the call, reference C-4471` });

  return {
    verdict,
    fact: factOf(p, checks, verdict),
    checks,
    summary: summaryOf(p, checks, found),
    patientPays: found ? costShareText(payer.group) : null,
    agents,
    nextCheckAt: found ? nextMonthFirst(p.checkedAt) : null,
  };
}
