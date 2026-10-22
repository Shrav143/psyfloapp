/* Eligibility and Benefits: the patient rows, the verdict rule and the simulated live check.
   The wording of each payment check lives in pages/eligibility/checks.ts. */
import { DAY, HOUR } from "@/lib/time";
import type { SiteId } from "./sites";
import type { PayerId, PayerSummary, Program, Tone } from "./types";

/** "unavailable": the check could not run (Verify is paused in Settings), so nothing is known about coverage. */
export type EligState = "active" | "lapsed" | "ended" | "not_found" | "unavailable";
/** "needs_confirmation": the plan answered for coverage but not for this service, so someone has to confirm the benefit. */
export type BenefitState = "covered" | "limited" | "not_covered" | "needs_confirmation";
/** "unknown": no rule on file says whether this service needs an authorization. */
export type AuthState = "not_required" | "on_file" | "in_progress" | "reviewing" | "retro_open" | "required" | "unknown";
/** "unchecked": the check did not run, so there is no verdict yet. */
export type Verdict = "cleared" | "auth_first" | "fix" | "unchecked";

export const VERDICT_LABEL: Record<Verdict, string> = { cleared: "Cleared to bill", auth_first: "Authorization first", fix: "Fix before billing", unchecked: "Not checked" };
export const VERDICT_TONE: Record<Verdict, Tone> = { cleared: "good", auth_first: "mid", fix: "risk", unchecked: "neutral" };

/** The words for an authorization state, on the list and on the result. */
export const AUTH_LABEL: Record<AuthState, { text: string; tone: Tone }> = {
  not_required: { text: "Not required", tone: "neutral" },
  on_file: { text: "On file", tone: "good" },
  in_progress: { text: "In progress", tone: "neutral" },
  reviewing: { text: "Payer reviewing", tone: "neutral" },
  retro_open: { text: "Retro request open", tone: "mid" },
  required: { text: "Required, not on file", tone: "mid" },
  unknown: { text: "Requirement unknown", tone: "neutral" },
};

/** When the sample members' coverage began. A coverage that ended, or lapsed, carries its own end date. */
export const EFFECTIVE_FROM = "01/01/2026";

/** "Effective 01/01/2026, no end date", or the end date when coverage ended or lapsed. A member nobody found has no dates. The end date has no year of its own, so it takes the service date's. */
export function coverageDates(p: Pick<EbPatient, "eligibility" | "dos">): string | null {
  const { state } = p.eligibility;
  const on = p.eligibility.on ?? "";
  const year = p.dos.slice(-4);
  if (state === "active") return `Effective ${EFFECTIVE_FROM}, no end date`;
  if (state === "not_found" || state === "unavailable") return null;
  return `Effective ${EFFECTIVE_FROM}, ${state === "lapsed" ? "lapsed" : "ended"} ${on}/${year}`;
}

/** What a patient pays, by kind of plan, as sample figures. Ohio Medicaid members usually pay nothing, so it has no entry and the screens say nothing about it instead of "$0". */
interface CostShare {
  copay?: string;
  deductibleLeft?: string;
  coinsurance?: string;
}
const COMMERCIAL: CostShare = { copay: "$40 per day", deductibleLeft: "$350", coinsurance: "20% after the deductible" };
const COST_SHARE: Partial<Record<PayerSummary["group"], CostShare>> = {
  Commercial: COMMERCIAL,
  "Behavioral carve-out": COMMERCIAL,
  "Medicare Advantage": { deductibleLeft: "$85", coinsurance: "20%" },
};
/** "Copay $40 per day, deductible $350 left, coinsurance 20% after the deductible", or null when the plan has none on file. */
export function costShareText(group: PayerSummary["group"]): string | null {
  const c = COST_SHARE[group];
  if (!c) return null;
  const parts = [c.copay && `Copay ${c.copay}`, c.deductibleLeft && `deductible ${c.deductibleLeft} left`, c.coinsurance && `coinsurance ${c.coinsurance}`].filter(Boolean);
  const text = parts.join(", ");
  return text ? text[0].toUpperCase() + text.slice(1) : null;
}

export interface EbPatient {
  id: string; // the case ID, or V-xxxx for a check that has no case yet
  initials: string | null;
  age: number | null;
  payerId: PayerId;
  program: Program;
  levelLabel?: string;
  memberMasked: string;
  eligibility: { state: EligState; on?: string };
  benefits: BenefitState;
  auth: AuthState;
  limit?: { used: number; of: number; unit: "days" | "units" };
  noDayLimit?: boolean;
  inNetwork: boolean;
  /** The clinic's enrollment with this plan could not be confirmed. `inNetwork` is not known either way. */
  networkUnresolved?: boolean;
  otherInsurance: boolean;
  /** The plan now covering the member, when it is not the plan on the case. Coverage with the plan on the case has ended. */
  payerChanged?: { to: PayerId; since: string };
  /** The plan matched this person under another member ID (the one it has on file, masked). */
  idMismatch?: { onFile: string };
  dx?: string;
  dos: string;
  /** The last day the check covers (mm/dd/yyyy). Without it a check covers the rest of the month of `dos`. */
  dosTo?: string;
  /** A check made at no case yet belongs to one site, the one in view when it was made. A case's rows take the case's site (see data/sites.ts). */
  site?: SiteId;
  /** When a refresh was tried and the service was unavailable (Verify paused), so the facts here are older than the last try. */
  refreshFailed?: number;
  checkedAt: number; // demo minutes
  /** A re-check is scheduled this week. Verify runs it on its own when the demo clock reaches `recheckAt`. */
  recheckDue: boolean;
  recheckAt?: number; // demo minutes
  /** Set when the last check was one of those automatic re-checks: the time it ran. */
  autoAt?: number;
}

/** Cleared: everything passes. Authorization first: only the authorization is missing. Fix: coverage, plan, benefits, network, other insurance or a limit failed. */
export function verdictOf(p: EbPatient): Verdict {
  if (p.eligibility.state === "unavailable") return "unchecked";
  const exhausted = !!p.limit && p.limit.used >= p.limit.of;
  if (p.eligibility.state !== "active" || p.benefits === "not_covered" || p.benefits === "needs_confirmation" || !p.inNetwork || p.networkUnresolved || p.otherInsurance || !!p.idMismatch || exhausted) return "fix";
  if (p.auth === "required" || p.auth === "in_progress" || p.auth === "reviewing" || p.auth === "retro_open" || p.auth === "unknown") return "auth_first";
  return "cleared";
}

/** Sort: Fix before billing first, then Authorization first, then checks that did not run, then the oldest check. */
export function sortPatients(list: EbPatient[]): EbPatient[] {
  const rank: Record<Verdict, number> = { fix: 0, auth_first: 1, unchecked: 2, cleared: 3 };
  return [...list].sort((a, b) => rank[verdictOf(a)] - rank[verdictOf(b)] || a.checkedAt - b.checkedAt);
}

/* ------------------------------------------------------------------ the live check (simulated) */
export interface CheckInput {
  payerId: PayerId;
  program: Program;
  memberId: string;
  dos: string;
}
type Findings = Pick<EbPatient, "eligibility" | "benefits" | "auth" | "limit" | "noDayLimit" | "inNetwork" | "networkUnresolved" | "otherInsurance" | "payerChanged" | "idMismatch">;

const NO_AUTH: [PayerId, Program][] = [["beacon", "IOP"], ["beacon", "PHP"]];
/** The days or units one authorization allows, by level of care. */
const LIMIT_OF: Record<Program, [number, "days" | "units"]> = { RES: [14, "days"], IOP: [48, "units"], PHP: [15, "days"], WM: [5, "days"] };

/** Member ID endings that script a result. The Verify page's sample chips fill them in, so nothing is hidden. */
export const TAIL = { lapsed: "1012", notFound: "9999", notCovered: "3030", otherPlan: "6060", limitReached: "9090", payerChanged: "7070", idMismatch: "8080", benefitUnconfirmed: "5050", providerUnresolved: "4040", requirementUnknown: "2020" } as const;
/** The plan a member moved to, for the "payer changed" answer: any other plan than the one on the case. */
const MOVED_TO = (from: PayerId): PayerId => (from === "cardinal" ? "summit" : "cardinal");

/** What the state and the plan "answer". Scripted so the demo is predictable: a member ID ending 1012 is lapsed, 9999 is not found,
    3030 is a plan that does not cover the service, 6060 has another plan that pays first and 9090 has used every authorized day.
    7070 moved to another plan on 10/01, 8080 is known to the plan under another member ID, 5050 is a service the plan did not confirm,
    4040 is a clinic enrollment nobody could confirm and 2020 is a service with no authorization rule on file.
    Evergreen is reached by phone and is not enrolled for detox. */
export function simulateCheck(i: CheckInput): Findings {
  const tail = i.memberId.replace(/\D/g, "").slice(-4);
  const [of, unit] = LIMIT_OF[i.program];
  const exhausted = tail === TAIL.limitReached;
  const moved = tail === TAIL.payerChanged;
  return {
    eligibility: tail === TAIL.lapsed ? { state: "lapsed", on: "10/12" } : tail === TAIL.notFound ? { state: "not_found" } : moved ? { state: "ended", on: "09/30" } : { state: "active" },
    payerChanged: moved ? { to: MOVED_TO(i.payerId), since: "10/01" } : undefined,
    idMismatch: tail === TAIL.idMismatch ? { onFile: "…5521" } : undefined,
    benefits: tail === TAIL.notCovered ? "not_covered" : tail === TAIL.benefitUnconfirmed ? "needs_confirmation" : i.payerId === "harborview" && i.program === "PHP" ? "limited" : "covered",
    auth: tail === TAIL.requirementUnknown ? "unknown" : exhausted ? "on_file" : tail === TAIL.notCovered || NO_AUTH.some(([p, g]) => p === i.payerId && g === i.program) ? "not_required" : "required",
    limit: exhausted ? { used: of, of, unit } : undefined,
    noDayLimit: i.payerId === "summit" && i.program === "RES",
    inNetwork: !(i.payerId === "evergreen" && i.program === "WM"),
    networkUnresolved: tail === TAIL.providerUnresolved ? true : undefined,
    otherInsurance: tail === TAIL.otherPlan,
  };
}
/** Evergreen is the one payer reached by phone: its system does not answer, so Caller phones. */
export const needsCaller = (payerId: PayerId): boolean => payerId === "evergreen";

/* ------------------------------------------------------------------ seed rows: 37 patients, 28 cleared, 4 authorization first, 5 fix, 5 re-checks due.
   The five "fix" rows show every reason: lapsed, ended, not covered, another plan pays first, limit reached. */
type Lim = [number, number, "days" | "units"];
interface Row {
  id: string;
  who: string;
  age: number;
  payer: PayerId;
  prog: Program;
  chk: number; // minutes ago
  auth?: AuthState;
  lim?: Lim;
  o?: Partial<EbPatient>;
}
const R = (id: string, who: string, age: number, payer: PayerId, prog: Program, chk: number, auth: AuthState | undefined, lim?: Lim, o?: Partial<EbPatient>): Row => ({ id, who, age, payer, prog, chk, auth, lim, o });

const tailOf = (id: string): string => String(1000 + ((Number(id.replace(/\D/g, "")) * 7919) % 9000)).padStart(4, "0");

const ROWS: Row[] = [
  /* authorization first (4) */
  R("R-1042", "J.M.", 34, "summit", "RES", 2, "in_progress", undefined, { noDayLimit: true, memberMasked: "…4821", dx: "F10.20" }),
  R("I-2262", "S.N.", 31, "lakeshore", "IOP", 35, "in_progress"),
  R("I-2190", "R.P.", 31, "lakeshore", "IOP", 240, "reviewing"),
  R("I-2231", "S.B.", 37, "cardinal", "IOP", 310, "reviewing"),
  /* fix before billing (5) */
  R("R-1101", "K.W.", 26, "summit", "RES", 6, "retro_open", undefined, { eligibility: { state: "lapsed", on: "10/12" }, levelLabel: "Detox → Residential", memberMasked: "…1012" }),
  R("R-0975", "B.N.", 53, "evergreen", "RES", 180, "on_file", [9, 14, "days"], { eligibility: { state: "ended", on: "09/30" }, payerChanged: { to: "cardinal", since: "10/01" } }),
  R("R-1118", "A.F.", 42, "beacon", "RES", 50, "not_required", undefined, { benefits: "not_covered", memberMasked: `…${TAIL.notCovered}` }),
  R("I-2275", "E.K.", 27, "summit", "IOP", 120, "required", undefined, { otherInsurance: true, memberMasked: `…${TAIL.otherPlan}` }),
  R("R-0921", "J.D.", 45, "cardinal", "RES", 300, "on_file", [14, 14, "days"], { memberMasked: `…${TAIL.limitReached}` }),
  /* cleared to bill (28) */
  R("D-3318", "M.C.", 38, "cardinal", "RES", 60, "on_file", [7, 14, "days"]),
  R("I-2207", "T.R.", 29, "cardinal", "IOP", 4320, "on_file", [38, 48, "units"], { recheckDue: true, recheckAt: 50 }),
  R("R-0988", "D.L.", 41, "beacon", "RES", 1440, "on_file", [10, 21, "days"]),
  R("P-1573", "A.S.", 51, "harborview", "PHP", 1440, "on_file", [8, 15, "days"]),
  R("I-2144", "G.N.", 33, "summit", "IOP", 2880, "on_file", [16, 48, "units"], { recheckDue: true, recheckAt: 5 * HOUR }),
  R("R-1021", "V.P.", 48, "cardinal", "RES", 1900, "on_file", [11, 14, "days"]),
  R("P-1602", "R.H.", 39, "cardinal", "PHP", 600, "on_file", [9, 15, "days"]),
  R("I-2236", "B.J.", 30, "cardinal", "IOP", 2200, "on_file", [24, 48, "units"]),
  R("I-2158", "D.O.", 43, "summit", "IOP", 4000, "on_file", [30, 48, "units"]),
  R("P-1580", "F.L.", 35, "summit", "PHP", 420, "on_file", [6, 15, "days"]),
  R("R-0902", "G.W.", 50, "summit", "RES", 900, "on_file", [19, 21, "days"]),
  R("R-0934", "E.Y.", 38, "beacon", "RES", 1300, "on_file", [14, 21, "days"]),
  R("P-1590", "Z.T.", 46, "harborview", "PHP", 2500, "on_file", [12, 15, "days"], { benefits: "limited" }),
  R("R-0912", "C.D.", 44, "evergreen", "RES", 70, "on_file", [12, 14, "days"]),
  R("P-1499", "E.S.", 42, "harborview", "PHP", 1600, "on_file", [10, 15, "days"], { benefits: "limited" }),
  R("I-2218", "O.H.", 28, "cardinal", "IOP", 500, "on_file", [33, 48, "units"]),
  R("R-0951", "F.W.", 47, "evergreen", "RES", 90, "on_file", [2, 14, "days"]),
  R("R-0944", "M.B.", 40, "beacon", "RES", 200, "on_file", [3, 14, "days"]),
  R("I-2171", "Q.Z.", 25, "lakeshore", "IOP", 150, "on_file", [4, 30, "units"]),
  R("R-0960", "H.V.", 39, "summit", "RES", 200, "on_file", [5, 14, "days"]),
  R("I-2102", "W.H.", 36, "summit", "IOP", 5000, "on_file", [22, 48, "units"], { recheckDue: true, recheckAt: DAY + 3 * HOUR }),
  R("P-1519", "C.M.", 41, "beacon", "PHP", 3000, "not_required"),
  R("R-0866", "T.S.", 29, "summit", "RES", 3600, "on_file", [12, 21, "days"], { recheckDue: true, recheckAt: 2 * DAY }),
  R("I-2120", "J.B.", 33, "lakeshore", "IOP", 1700, "on_file", [30, 60, "units"]),
  R("P-1550", "N.D.", 47, "harborview", "PHP", 2600, "on_file", [5, 15, "days"], { benefits: "limited" }),
  R("R-0889", "P.K.", 52, "evergreen", "RES", 800, "on_file", [6, 14, "days"]),
  R("I-2133", "L.O.", 27, "cardinal", "IOP", 1200, "on_file", [20, 48, "units"]),
  R("R-0871", "V.A.", 35, "summit", "RES", 3900, "on_file", [9, 14, "days"], { recheckDue: true, recheckAt: 4 * DAY }),
];

export const SEED_EB_PATIENTS: EbPatient[] = ROWS.map((r) => ({
  id: r.id,
  initials: r.who,
  age: r.age,
  payerId: r.payer,
  program: r.prog,
  memberMasked: `…${tailOf(r.id)}`,
  eligibility: { state: "active" },
  benefits: "covered",
  auth: r.auth ?? "on_file",
  limit: r.lim ? { used: r.lim[0], of: r.lim[1], unit: r.lim[2] } : undefined,
  inNetwork: true,
  otherInsurance: false,
  dos: "10/21/2026",
  checkedAt: -r.chk,
  recheckDue: false,
  ...r.o,
}));
