/* The seven payment checks and the verdict wording, built from one patient row. Pure, so the list, the result page
   and the intake "Coverage checked" line all say the same thing. */
import { needsCaller, verdictOf, type EbPatient, type Verdict } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type Program, type Tone } from "@/data/types";

export interface PaymentCheck {
  id: string;
  title: string;
  detail: string;
  chip: string;
  tone: Tone;
  /** "unknown" means the check could not run, for example when no coverage was found. */
  unknown?: boolean;
}
export interface AgentLine {
  agent: AgentKey;
  label: string;
  secs: number;
  answer: string;
}
export interface CheckResult {
  verdict: Verdict;
  headline: string;
  reason: string;
  checks: PaymentCheck[];
  /** What the patient pays. Null when no coverage was found: there is nothing to say about cost. */
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
  if (p.eligibility.state === "active") {
    const detail = payer.group === "Ohio Medicaid" ? "Ohio Medicaid, active since 01/01/2026 with no end date" : payer.group === "Medicare Advantage" ? `Medicare Advantage through ${payer.name}, active for the 2026 plan year` : `${payer.name}, active since 01/01/2026 with no end date`;
    return { id: "active", title: "Coverage is active on the service date", detail, chip: "Active", tone: "good" };
  }
  if (p.eligibility.state === "not_found") return { id: "active", title: "Coverage was not found", detail: "We could not find coverage with these details. Check the member ID and date of birth, or read the card again.", chip: "Not found", tone: "risk" };
  const lapsed = p.eligibility.state === "lapsed";
  return { id: "active", title: "Coverage is not active on the service date", detail: lapsed ? `Coverage lapsed ${on}. Days after that are not payable until eligibility is restored. A retro-eligibility request can cover the gap.` : `Coverage ended ${on}. Days after that are not payable. The patient may have a new plan, so ask the payer.`, chip: `${lapsed ? "Lapsed" : "Ended"} ${on}`, tone: "risk" };
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
  const planDetail = medicaid ? `Managed by ${payer.name}. Claims go to ${who}, not to the state` : payer.group === "Medicare Advantage" ? `A Medicare Advantage plan. Claims go to ${payer.name}, not to Medicare` : payer.group === "Behavioral carve-out" ? `Behavioral health is carved out to ${payer.name}. Claims go to ${who}, not to the medical plan` : `Claims go to ${payer.name}`;
  const auth: Record<EbPatient["auth"], PaymentCheck> = {
    not_required: { id: "auth", title: "Authorization", detail: `${who} does not require one for ${lower(p.program)}.`, chip: "Not required", tone: "good" },
    on_file: { id: "auth", title: "Authorization", detail: `On file with ${who}${left ? `. ${left}` : ""}`, chip: "On file", tone: "good" },
    in_progress: { id: "auth", title: "Authorization", detail: "Required before the first day. Not on file yet. A request is being drafted", chip: "Required", tone: "mid" },
    reviewing: { id: "auth", title: "Authorization", detail: `Required. A request is with ${who} and under review`, chip: "Under review", tone: "mid" },
    retro_open: { id: "auth", title: "Authorization", detail: "A retro-authorization request is open. It covers days already delivered", chip: "Retro request open", tone: "mid" },
    required: { id: "auth", title: "Authorization", detail: "Required before the first day. Not on file yet. Start an authorization", chip: "Required", tone: "mid" },
  };
  return [
    { id: "plan", title: "It is the right plan", detail: planDetail, chip: who, tone: "good" },
    p.benefits === "covered"
      ? { id: "service", title: "The service is covered", detail: `${prog} is payable for substance use disorder${p.dx ? ` (${p.dx} on the chart)` : ""}. Codes ${codes}`, chip: "Covered", tone: "good" }
      : p.benefits === "limited"
        ? { id: "service", title: "The service is covered with conditions", detail: `${prog} is payable, with conditions: the diagnosis must be on the plan's list and each day needs an authorization. Codes ${codes}`, chip: "Limited", tone: "mid" }
        : { id: "service", title: "The service is not covered", detail: `${prog} is not a covered benefit under this plan for codes ${codes}. Ask ${who} which program it pays for.`, chip: "Not covered", tone: "risk" },
    auth[p.auth],
    p.inNetwork
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

/** With no coverage found there is no plan to ask, so one line says so instead of six grey rows. */
const NOT_CHECKED: PaymentCheck = { id: "rest", title: "Nothing else could be checked", detail: "The plan, benefits, authorization, enrollment, limits and other insurance all need a plan that knows this member. Fix the member ID or date of birth, then check again.", chip: "Not checked", tone: "neutral", unknown: true };

export function buildResult(p: EbPatient): CheckResult {
  const payer = payerById(p.payerId);
  const who = payer.shortName;
  const prog = PROGRAM_LABEL[p.program];
  const medicaid = payer.group === "Ohio Medicaid";
  const found = p.eligibility.state !== "not_found";
  const on = p.eligibility.on ?? "";
  const checks = [coverageCheck(p), ...(found ? planChecks(p) : [NOT_CHECKED])];

  const verdict = verdictOf(p);
  const firstFail = checks.find((c) => c.tone === "risk");
  const lost = p.eligibility.state === "lapsed" || p.eligibility.state === "ended";
  const headline =
    verdict === "cleared"
      ? "Cleared to bill: the clinic will be paid."
      : verdict === "auth_first"
        ? "Covered, but you need an authorization first."
        : !found
          ? "We could not find coverage."
          : lost
            ? `Fix before billing: coverage ${p.eligibility.state} ${on}.`
            : `Fix before billing: ${firstFail ? firstFail.title.charAt(0).toLowerCase() + firstFail.title.slice(1) : "a check failed"}.`;
  const reason =
    verdict === "cleared"
      ? `Coverage, benefits, authorization and enrollment all check out. The clinic can bill ${who} for ${prog} on ${p.dos}.`
      : verdict === "auth_first"
        ? `Everything checks out except the authorization. Billing is safe as soon as ${who} approves.`
        : firstFail?.detail ?? "A check failed.";

  const pays = medicaid ? "$0 copay, no deductible, no coinsurance." : payer.group === "Medicare Advantage" ? "20% coinsurance after a deductible with $85 left." : "$40 copay per day, $350 left on the deductible, 20% coinsurance after.";
  const state = medicaid ? "Ohio Medicaid" : who;
  const agents: AgentLine[] = [{ agent: "verify", label: `Eligibility with ${state}`, secs: 3, answer: p.eligibility.state === "active" ? "Coverage active, effective 01/01/2026, no end date" : !found ? "No member matched the ID and date of birth" : `Coverage ${p.eligibility.state} ${on}` }];
  /* The other agents only ran when a plan knew the member. */
  if (found) {
    agents.push(
      { agent: "verify", label: `Benefits with ${who}`, secs: 5, answer: `${prog} ${p.benefits === "not_covered" ? "is not payable" : "is payable"} under codes ${PROGRAM_CODES[p.program]}` },
      { agent: "criteria", label: "Authorization rule", secs: 2, answer: p.auth === "not_required" ? `${who} does not require authorization for ${lower(p.program)}` : `${who} requires authorization for ${lower(p.program)} before the first day` },
      { agent: "navigator", label: "Provider enrollment", secs: 2, answer: p.inNetwork ? `The clinic is enrolled and in network with ${who}` : `No enrollment on file with ${who} for ${lower(p.program)}` },
    );
  }
  if (needsCaller(p.payerId)) agents.push({ agent: "caller", label: `Phone call to ${who}`, secs: 94, answer: `${who}'s system did not answer. Caller phoned and logged the call, reference C-4471` });

  return {
    verdict,
    headline,
    reason,
    checks,
    patientPays: found ? pays : null,
    agents,
    next: found ? ["Coverage again on 11/01, then every month", "Before each recertification", "3 days before the first claim"] : ["Check again once the member ID or date of birth is fixed"],
  };
}

/** The short chips shown on the intake screen: eligible, benefits, authorization. A member nobody found has only the first. */
export function coverageChips(p: EbPatient): { text: string; tone: Tone }[] {
  const label: Record<string, string> = { active: "Eligibility", service: "Benefits", auth: "Authorization" };
  return buildResult(p).checks.filter((c) => c.id in label).map((c) => ({ text: `${label[c.id]}: ${c.chip.toLowerCase()}`, tone: c.tone }));
}
