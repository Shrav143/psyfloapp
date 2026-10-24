import { payerScorecard } from "./analytics";
import { getDataset, visitDatesFor } from "./dataset";
import { clocksFor, renewalInFlight, renewalLane } from "./derive";
import { fmtDate, money } from "./format";
import { coverageToday, leakageReport } from "./leakage";
import { PAYER_BY_ID } from "./payers";
import type { AskMessage } from "./store";

export const SUGGESTED_QUESTIONS = [
  "What are the next 12 renewals coming due?",
  "Which payer is cutting our units the most?",
  "How much did we lose to late renewals in the last 90 days?",
  "Who on today's schedule can't we bill for?",
  "Which appeals have no receipt confirmation?",
];

/** Canned, ledger-backed answers for the Ask Psyflo panel. */
export function answer(question: string): AskMessage {
  const q = question.toLowerCase();
  const ds = getDataset();
  if (
    q.includes("renewal") ||
    q.includes("coming due") ||
    q.includes("october")
  ) {
    const rows = ds.patients
      .map((p) => {
        const auth = ds.authorizations.find((a) => a.mrn === p.mrn);
        if (!auth || renewalInFlight(auth)) {
          return undefined;
        }
        const c = clocksFor(p, auth, visitDatesFor(p.mrn));
        return c
          ? {
              mrn: p.mrn,
              payer: PAYER_BY_ID[p.payerId].short,
              fileBy: c.fileBy,
              binding: c.binding,
            }
          : undefined;
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => (a.fileBy < b.fileBy ? -1 : 1))
      .slice(0, 12);
    return {
      role: "psyflo",
      text: `The next 12 renewals to file, ordered by the clock that binds first:\n${rows.map((r, i) => `${i + 1}. ${r.mrn} · ${r.payer} · file by ${fmtDate(r.fileBy)} (${r.binding} bind first)`).join("\n")}`,
      sources: [
        "Authorization ledger",
        "Attendance (Sunwave)",
        "Payer turnaround medians",
      ],
    };
  }
  if (
    q.includes("payer") &&
    (q.includes("cut") || q.includes("units") || q.includes("partial"))
  ) {
    const rows = payerScorecard().sort((a, b) => b.partial - a.partial);
    const top = rows[0];
    return {
      role: "psyflo",
      text: `${top?.short} has the highest partial-approval rate at ${Math.round((top?.partial ?? 0) * 100)}% this quarter, granting an average of ${top?.avgGranted} of 60 units asked. First-pass approval is ${Math.round((top?.firstPass ?? 0) * 100)}%, ${top?.trendPts} points versus three quarters ago. The clinic aggregate hides it because the other four payers are steady.`,
      sources: [
        "Payer scorecard · last 6 quarters",
        "Authorization versions (never overwritten)",
      ],
    };
  }
  if (q.includes("late renewal") || q.includes("lose") || q.includes("leak")) {
    const r = leakageReport(90);
    const late = r.rows.filter(
      (x) => x.key === "units_exhausted" || x.key === "window_expired",
    );
    return {
      role: "psyflo",
      text: `Late renewals cost ${money(late.reduce((n, x) => n + x.value, 0))} in the last 90 days: ${late.map((x) => `${x.visits} visits ${x.label.toLowerCase()} (${money(x.value)})`).join(" and ")}. Both are tagged preventable. The full preventable subtotal is ${money(r.totals.preventable)}.`,
      sources: [
        "Leakage report · 90 days",
        `Visit value ${money(244.29, { cents: true })} (KY H2020)`,
      ],
    };
  }
  if (q.includes("today") || q.includes("bill")) {
    const c = coverageToday();
    const parts = Object.entries(c.buckets)
      .filter(([k]) => k !== "covered")
      .map(([k, v]) => `${v.length} ${k.replaceAll("_", " ")}`);
    return {
      role: "psyflo",
      text: `${c.covered} of ${c.scheduled} patients on today's schedule are covered by an active authorization. The ${c.scheduled - c.covered} who are not: ${parts.join(", ")}. Value at risk today is ${money(c.atRisk)}.`,
      sources: ["Today's schedule", "Authorization ledger"],
    };
  }
  if (q.includes("receipt") || q.includes("appeal")) {
    return {
      role: "psyflo",
      text: "One appeal is filed without a confirmed receipt: the Anthem appeal faxed 3 days ago. Caller is scheduled to confirm tomorrow at 9:00. Every other filed appeal has a payer reference and a decision-due date on record.",
      sources: ["Appeals workspace", "Caller run log"],
    };
  }
  const lanes = ds.patients.reduce<Record<string, number>>((acc, p) => {
    const auth = ds.authorizations.find((a) => a.mrn === p.mrn);
    const c = auth ? clocksFor(p, auth, visitDatesFor(p.mrn)) : undefined;
    const lane = c ? renewalLane(c.fileBy) : undefined;
    if (lane) {
      acc[lane] = (acc[lane] ?? 0) + 1;
    }
    return acc;
  }, {});
  return {
    role: "psyflo",
    text: `I can answer questions over the authorization ledger, attendance and payer history. Right now: ${lanes["overdue"] ?? 0} renewals overdue, ${lanes["this_week"] ?? 0} due this week, ${lanes["next_30"] ?? 0} in the next 30 days. Try one of the suggested questions.`,
    sources: ["Authorization ledger"],
  };
}
