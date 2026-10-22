/* The seven payment checks and the verdict wording, built from one patient row. Pure, so the list, the result page
   and the intake "Coverage checked" line all say the same thing. */
import { AUTH_LABEL, costShareText, coverageDates, EFFECTIVE_FROM, needsCaller, verdictOf, type EbPatient, type Verdict } from "@/data/eligibility";
import { planInfo } from "@/data/payerConfigPlan";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type Program, type Tone } from "@/data/types";
import { dosRangeText } from "@/data/verification";
import { toDate } from "@/lib/time";

export interface PaymentCheck {
  id: string;
  title: string;
  detail: string;
  chip: string;
  tone: Tone;
  /** "unknown" means the check could not run, for example when no coverage was found. */
  unknown?: boolean;
  /** A warning that stops "Cleared to bill" without being a failure: the headline can name it. */
  blocks?: boolean;
}
export interface AgentLine {
  agent: AgentKey;
  label: string;
  secs: number;
  answer: string;
}
/** One part of the summary at the top of a result: a chip, one line, and for benefits the service limit and what the patient pays. `unknown` when no plan knew the member. */
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
export interface CheckResult {
  verdict: Verdict;
  headline: string;
  reason: string;
  checks: PaymentCheck[];
  summary: ResultSummary;
  /** What the patient pays. Null when no coverage was found or the plan has no cost share on file (Ohio Medicaid): then nothing is said about cost. */
  patientPays: string | null;
  agents: AgentLine[];
  next: string[];
}

export const PROGRAM_CODES: Record<Program, string> = { RES: "H0018 and H0019", IOP: "H0015", PHP: "H0035", WM: "H0010 and H0011" };

const lower = (p: Program): string => (p === "IOP" || p === "PHP" ? PROGRAM_LABEL[p] : PROGRAM_LABEL[p].toLowerCase());

/** Row 1. Coverage is the only row that can run when no plan knows the member. */
function coverageCheck(p: EbPatient): PaymentCheck {
  const payer = payerById(p.payerId);
  const on = p.eligibility.on ?? "";
  if (p.eligibility.state === "unavailable") return { id: "active", title: "Coverage could not be checked", detail: "Verify is paused in Settings, so nothing was asked of the plan. Resume Verify, then check again.", chip: "Not checked", tone: "neutral", unknown: true };
  if (p.eligibility.state === "active" && p.idMismatch) return { id: "active", title: "Coverage is active, but under another member ID", detail: `The plan matched this person to the ID ending ${p.idMismatch.onFile.replace("…", "")}, not the one given. Claims must use the plan's ID. Read the card again to confirm it.`, chip: "ID differs", tone: "risk" };
  if (p.eligibility.state === "active") {
    const detail = payer.group === "Ohio Medicaid" ? `Ohio Medicaid, active since ${EFFECTIVE_FROM} with no end date` : payer.group === "Medicare Advantage" ? `Medicare Advantage through ${payer.name}, active for the 2026 plan year` : `${payer.name}, active since ${EFFECTIVE_FROM} with no end date`;
    return { id: "active", title: "Coverage is active on the service date", detail, chip: "Active", tone: "good" };
  }
  if (p.eligibility.state === "not_found") return { id: "active", title: "Coverage was not found", detail: "We could not find coverage with these details. Check the member ID and date of birth, or read the card again.", chip: "Not found", tone: "risk" };
  const lapsed = p.eligibility.state === "lapsed";
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
  const ended = moved && p.payerChanged ? `Coverage with ${payer.shortName} ended ${on}. The member is with ${moved.name} since ${p.payerChanged.since}. Check coverage with the new plan, and start the request with it.` : `Coverage ended ${on}. Days after that are not payable. The patient may have a new plan, so ask the payer.`;
  return { id: "active", title: "Coverage is not active on the service date", detail: lapsed ? `Coverage lapsed ${on}. Days after that are not payable until eligibility is restored. A retro-eligibility request can cover the gap.` : ended, chip: `${lapsed ? "Lapsed" : "Ended"} ${on}`, tone: "risk" };
}

/** Rows 2 to 7, for a member the plan knows. */
function planChecks(p: EbPatient): PaymentCheck[] {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const medicaid = payer.group === "Ohio Medicaid";
  const codes = PROGRAM_CODES[p.program];
  const left = p.limit ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used` : "";
  const free = p.limit ? p.limit.of - p.limit.used : null;
  const spent = free !== null && free <= 0;
  const planDetail = planInfo(payer)?.detail ?? `Claims go to ${payer.name}`;
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
  const auth: Record<EbPatient["auth"], PaymentCheck> = {
    not_required: { id: "auth", title: "Authorization", detail: `${who} does not require one for ${lower(p.program)}.`, chip: "Not required", tone: "good" },
    on_file: { id: "auth", title: "Authorization", detail: `On file with ${who}${left ? `. ${left}` : ""}`, chip: "On file", tone: "good" },
    in_progress: { id: "auth", title: "Authorization", detail: "Required before the first day. Not on file yet. A request is being drafted", chip: "Required", tone: "mid" },
    reviewing: { id: "auth", title: "Authorization", detail: `Required. A request is with ${who} and under review`, chip: "Under review", tone: "mid" },
    retro_open: { id: "auth", title: "Authorization", detail: "A retro-authorization request is open. It covers days already delivered", chip: "Retro request open", tone: "mid" },
    required: { id: "auth", title: "Authorization", detail: "Required before the first day. Not on file yet. Start an authorization", chip: "Required", tone: "mid" },
    unknown: { id: "auth", title: "Authorization", detail: `No rule on file says whether ${who} requires one for ${lower(p.program)}. Check with ${who}. Nothing was assumed`, chip: "Unknown", tone: "neutral", unknown: true },
  };
  return [
    moved && p.payerChanged
      ? { id: "plan", title: "The member is with another plan now", detail: `${moved.name}, since ${p.payerChanged.since}. A claim sent to ${payer.name} would be rejected`, chip: "Plan changed", tone: "risk" }
      : { id: "plan", title: "It is the right plan", detail: planDetail, chip: who, tone: "good" },
    p.benefits === "needs_confirmation"
      ? { id: "service", title: "The service is not confirmed", detail: `${who} answered for coverage but not for ${prog}. Caller can confirm the benefit by phone. Codes ${codes}`, chip: "Not confirmed", tone: "mid", blocks: true }
      : p.benefits === "covered"
      ? { id: "service", title: "The service is covered", detail: `${prog} is payable for substance use disorder${p.dx ? ` (${p.dx} on the chart)` : ""}. Codes ${codes}`, chip: "Covered", tone: "good" }
      : p.benefits === "limited"
        ? { id: "service", title: "The service is covered with conditions", detail: `${prog} is payable, with conditions: the diagnosis must be on the plan's list and each day needs an authorization. Codes ${codes}`, chip: "Limited", tone: "mid" }
        : { id: "service", title: "The service is not covered", detail: `${prog} is not a covered benefit under this plan for codes ${codes}. Ask ${who} which program it pays for.`, chip: "Not covered", tone: "risk" },
    auth[p.auth],
    p.networkUnresolved
      ? { id: "bill", title: "The clinic's enrollment is not confirmed", detail: `We could not confirm that the clinic is enrolled with ${who} for ${lower(p.program)}. Navigator can check the enrollment record`, chip: "Not confirmed", tone: "mid", blocks: true }
      : p.inNetwork
      ? { id: "bill", title: "The clinic can bill", detail: `The clinic is enrolled and in network with ${who} for ${lower(p.program)}`, chip: "In network", tone: "good" }
      : { id: "bill", title: "The clinic cannot bill yet", detail: `The clinic is not enrolled with ${who} for ${lower(p.program)}. Claims would be rejected. Navigator can start the enrollment.`, chip: "Not enrolled", tone: "risk" },
    p.limit && free !== null
      ? { id: "limits", title: spent ? `Every authorized ${p.limit.unit === "days" ? "day" : "unit"} is used` : "Limits", detail: `${left} in this authorization period${spent ? `. Nothing is left. Ask ${who} for more ${p.limit.unit} before the next day of service` : ""}`, chip: spent ? "Limit reached" : `${free} ${p.limit.unit} left`, tone: spent ? "risk" : free <= 3 ? "mid" : "good" }
      : { id: "limits", title: "Limits", detail: p.noDayLimit ? `No annual day limit for ${lower(p.program)} care. The authorization sets the days` : "No visit or day limit applies to this program", chip: "No limit", tone: "good" },
    p.otherInsurance
      ? { id: "other", title: "Another plan pays first", detail: "A second plan was found. It must be billed before this one.", chip: "Other plan", tone: "risk" }
      : { id: "other", title: "No other insurance", detail: `None found. ${medicaid ? "Medicaid pays last, so we checked for another payer" : "We checked for another plan that pays first"}`, chip: "None", tone: "good" },
  ];
}

/** With no coverage found there is no plan to ask, so one line says so instead of six grey rows. A check that did not run says why instead. */
const notChecked = (p: EbPatient): PaymentCheck => ({
  id: "rest",
  title: "Nothing else could be checked",
  detail: p.eligibility.state === "unavailable" ? "Nothing was asked of the plan, so there is nothing to show. Resume Verify in Settings, then check again." : "The plan, benefits, authorization, enrollment, limits and other insurance all need a plan that knows this member. Fix the member ID or date of birth, then check again.",
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
  /* The summary says what the state of coverage means: eligible, not eligible, or a problem that can be fixed (a lapse the state can restore, a member ID to correct). */
  const word = { active: p.idMismatch ? "Needs a fix" : "Eligible", ended: "Not eligible", lapsed: "Needs a fix", not_found: "Needs a fix", unavailable: "Not checked" }[p.eligibility.state];
  const unavailable = p.eligibility.state === "unavailable";
  const coverage: SummaryPart = {
    chip: word,
    tone: cover.tone,
    line: unavailable ? "Verify is paused in Settings, so nothing was asked of the plan." : p.idMismatch ? `Active, under the member ID ending ${p.idMismatch.onFile.replace("…", "")}` : (coverageDates(p) ?? "No coverage was found for these details. Check the member ID and date of birth, or read the card again."),
    unknown: unavailable || undefined,
  };
  if (!found) {
    const none: SummaryPart = { chip: "Not checked", tone: "neutral", line: unavailable ? "Not asked while Verify is paused" : "Needs a plan that knows this member", unknown: true };
    return { coverage, benefits: { ...none, limit: null, pays: null }, auth: none };
  }
  const service = checks.find((c) => c.id === "service");
  const codes = PROGRAM_CODES[p.program];
  const free = p.limit ? p.limit.of - p.limit.used : null;
  const limit = p.limit && free !== null ? (free <= 0 ? `All ${p.limit.of} ${p.limit.unit} used. Nothing left` : `${p.limit.used} of ${p.limit.of} ${p.limit.unit} used, ${free} left`) : p.noDayLimit ? `No annual day limit for ${lower(p.program)}. The authorization sets the days` : null;
  const benefitLine = p.benefits === "covered" ? `${prog} is payable. Codes ${codes}` : p.benefits === "limited" ? `${prog} is payable with conditions. Codes ${codes}` : p.benefits === "needs_confirmation" ? `${who} did not confirm ${prog}. Codes ${codes}` : `${prog} is not a covered benefit. Codes ${codes}`;
  const authLine: Record<EbPatient["auth"], string> = {
    not_required: `${who} does not require one for ${lower(p.program)}, for dates of service ${dosRangeText(p)}.`,
    unknown: `No rule on file for ${who} and ${lower(p.program)}. Check with ${who}.`,
    on_file: `On file with ${who}.`,
    in_progress: "Required before the first day. A request is being drafted.",
    reviewing: `Required. A request is with ${who} and under review.`,
    retro_open: "A retro-authorization request is open. It covers days already delivered.",
    required: "Required before the first day. Not on file yet.",
  };
  return {
    coverage,
    benefits: { chip: service?.chip ?? "Covered", tone: service?.tone ?? "good", line: benefitLine, limit, pays: costShareText(payer.group) },
    auth: { chip: AUTH_LABEL[p.auth].text, tone: AUTH_LABEL[p.auth].tone, line: authLine[p.auth], unknown: p.auth === "unknown" || undefined },
  };
}

/** "11/01": the first of the month after the check, when coverage is looked at again. */
const nextMonthFirst = (at: number): string => {
  const d = toDate(at);
  return `${String(((d.getMonth() + 1) % 12) + 1).padStart(2, "0")}/01`;
};

export function buildResult(p: EbPatient): CheckResult {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const medicaid = payer.group === "Ohio Medicaid";
  const found = p.eligibility.state !== "not_found" && p.eligibility.state !== "unavailable";
  const on = p.eligibility.on ?? "";
  const checks = [coverageCheck(p), ...(found ? planChecks(p) : [notChecked(p)])];

  const verdict = verdictOf(p);
  const firstFail = checks.find((c) => c.tone === "risk" || c.blocks);
  const lost = p.eligibility.state === "lapsed" || p.eligibility.state === "ended";
  const moved = p.payerChanged ? payerById(p.payerChanged.to) : null;
  const headline =
    verdict === "unchecked"
      ? "Could not verify: Verify is paused in Settings."
      : verdict === "cleared"
        ? "Cleared to bill: the clinic will be paid."
        : verdict === "auth_first"
          ? p.auth === "unknown"
            ? "Covered, but we do not know whether it needs an authorization."
            : "Covered, but you need an authorization first."
          : !found
            ? "We could not find coverage."
            : lost
              ? `Fix before billing: coverage ${p.eligibility.state} ${on}${moved ? `, the member is with ${moved.shortName} now` : ""}.`
              : `Fix before billing: ${firstFail ? firstFail.title.charAt(0).toLowerCase() + firstFail.title.slice(1) : "a check failed"}.`;
  const reason =
    verdict === "unchecked"
      ? "Nothing was asked of the plan, so there is no answer yet. Resume Verify in Settings, then check again. The check is saved and shows in the list."
      : verdict === "cleared"
        ? `Coverage, benefits, authorization and enrollment all check out. The clinic can bill ${who} for ${prog} on ${p.dos}.`
        : verdict === "auth_first"
          ? p.auth === "unknown"
            ? `Everything else checks out, but no rule on file says whether ${who} requires an authorization for ${prog}. Check with ${who} before the first day.`
            : `Everything checks out except the authorization. Billing is safe as soon as ${who} approves.`
          : firstFail?.detail ?? "A check failed.";

  const state = medicaid ? "Ohio Medicaid" : who;
  const agents: AgentLine[] = [
    {
      agent: "verify",
      label: `Eligibility with ${state}`,
      secs: p.eligibility.state === "unavailable" ? 0 : 3,
      answer: p.eligibility.state === "unavailable" ? "Verify is paused in Settings, so nothing was asked" : p.eligibility.state === "active" ? `Coverage active, effective ${EFFECTIVE_FROM}, no end date${p.idMismatch ? `. The plan has the member under the ID ending ${p.idMismatch.onFile.replace("…", "")}` : ""}` : !found ? "No member matched the ID and date of birth" : `Coverage ${p.eligibility.state} ${on}${moved ? `. The member is with ${moved.name} since ${p.payerChanged?.since}` : ""}`,
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
    headline,
    reason,
    checks,
    summary: summaryOf(p, checks, found),
    patientPays: found ? costShareText(payer.group) : null,
    agents,
    next:
      p.eligibility.state === "unavailable"
        ? ["Check again once Verify is resumed in Settings"]
        : found
          ? [...(p.refreshFailed !== undefined ? ["Refresh again once Verify is resumed in Settings"] : []), `Coverage again on ${nextMonthFirst(p.checkedAt)}, then every month`, "Before each recertification", "3 days before the first claim"]
          : ["Check again once the member ID or date of birth is fixed"],
  };
}

/** The short chips shown on the intake screen: eligible, benefits, authorization. A member nobody found has only the first. */
export function coverageChips(p: EbPatient): { text: string; tone: Tone }[] {
  const label: Record<string, string> = { active: "Eligibility", service: "Benefits", auth: "Authorization" };
  return buildResult(p).checks.filter((c) => c.id in label).map((c) => ({ text: `${label[c.id]}: ${c.chip.toLowerCase()}`, tone: c.tone }));
}
