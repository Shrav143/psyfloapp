import { DAY, longDate } from "@/lib/time";
import { PROGRAM_LABEL, type CoreProgram } from "./types";
import { ASAM_DIMS } from "./referralLabels";
import type { Coverage, CoverageKind, CoverageLine, Fit, Referral } from "./referralTypes";
import { costShareText } from "./eligibility";
import { planInfo } from "./payerConfigPlan";
import { payerById } from "./seed";
import { vaPlanOf } from "./va/plans";

export const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/* ------------------------------------------------------------------ coverage (Verify) */
export function buildCoverage(r: Pick<Referral, "payerId" | "program" | "plan">, kind: CoverageKind, at: number): Coverage {
  const payer = r.payerId ? payerById(r.payerId) : null;
  const prog = PROGRAM_LABEL[r.program];
  const code = r.plan.dx[0]?.code ?? "the diagnosis";
  if (!payer) {
    const none: CoverageLine = { label: "Coverage is active on the service date", detail: "There is no insurance on the referral and no member ID, so Verify has nothing to look up.", state: "fail", chip: "Not found" };
    return { at, kind: "unconfirmed", headline: "Coverage cannot be confirmed", note: "Ask the referrer for insurance details, or open the full Eligibility & Benefits check to search by name and date of birth code.", lines: [none] };
  }
  const same = (state: CoverageLine["state"], label: string, detail: string, chip: string): CoverageLine => ({ label, detail, state, chip });
  if (kind === "lapsed") {
    return {
      at,
      kind,
      headline: "Coverage has lapsed. Fix this before billing",
      note: "Ask the referrer or the patient about a renewal or a new plan before any authorization is started.",
      lines: [
        same("fail", "Coverage is active on the service date", `${payer.name} coverage ended ${longDate(-20 * DAY)}. No newer plan was found.`, "Lapsed"),
        same("warn", "It is the right plan", `The plan on file was ${payer.name}. Verify could not confirm a newer plan.`, "Unconfirmed"),
        same("warn", "The service is covered", "Benefits cannot be checked while coverage is lapsed.", "Not checked"),
        same("warn", "Authorization", "An authorization cannot be requested until coverage is active.", "Blocked"),
        same("pass", "The program can bill", `The program is enrolled and in network with ${payer.shortName}.`, "In network"),
        same("pass", "No other insurance", "None found.", "None"),
      ],
    };
  }
  const needsAuth = kind === "auth_first";
  const share = costShareText(payer.group);
  const plan = planInfo(payer);
  return {
    at,
    kind,
    headline: needsAuth ? "Covered, but you need an authorization first" : "Covered and ready to admit",
    note: share ? `${share}. Details are in the full Eligibility & Benefits check.` : "No patient cost share is on file for this plan. This does not change what the program is paid.",
    lines: [
      same("pass", "Coverage is active on the service date", `${vaPlanOf(payer.id) ? "Virginia Medicaid" : payer.type} coverage, active since 01/01/2026 with no end date.`, "Active"),
      same("pass", "It is the right plan", plan ? `${plan.detail}.` : `Claims go to ${payer.name}.`, payer.shortName),
      same("pass", "The service is covered", `${prog} is payable for substance use disorder (${code} on the referral).`, "Covered"),
      needsAuth ? same("warn", "Authorization", `Required before the first day of ${prog}. None on file yet.`, "Required") : same("pass", "Authorization", `Not required for ${prog} under this plan.`, "Not required"),
      same("pass", "The program can bill", `The program is enrolled and in network with ${payer.shortName} for ${prog}.`, "In network"),
      same("pass", "No other insurance", "None found. Medicaid pays last, so Verify looked for another payer.", "None"),
    ],
  };
}

/* ------------------------------------------------------------------ fit (Placement) */
const SEVERITY: Record<CoreProgram, number[]> = { WM: [3, 2, 2, 2, 3, 2], RES: [2, 2, 3, 2, 4, 3], PHP: [1, 1, 2, 2, 3, 2], IOP: [0, 1, 2, 2, 2, 1] };
const NEXT_BEST: Record<CoreProgram, CoreProgram> = { RES: "PHP", PHP: "IOP", IOP: "PHP", WM: "RES" };

export function buildFit(r: Pick<Referral, "id" | "program">, o?: { suggested?: CoreProgram; confidence?: number }): Fit {
  const suggested = o?.suggested ?? r.program;
  const confidence = o?.confidence ?? 78 + (hash(r.id) % 15);
  const severity = SEVERITY[suggested];
  const top = severity
    .map((v, i) => ({ v, name: ASAM_DIMS[i].name.toLowerCase() }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  return {
    suggested,
    confidence,
    alt: NEXT_BEST[suggested],
    altConfidence: Math.max(30, confidence - 24 - (hash(r.id + "alt") % 8)),
    severity,
    summary: `The referral supports ${PROGRAM_LABEL[suggested]}. The highest ratings are ${top[0].name} and ${top[1].name}.`,
  };
}

