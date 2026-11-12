import type { Scope } from "@/lib/scope";
import type { PsyRequest } from "@/data/types";
import { inStage } from "@/store/selectors";
import type { Workload } from "./ProcessSection";
import type { Filters } from "./filters";

/** Requests on the Dashboard right now, for the site view, payer and program in view. Handled = decided (the Dashboard's "Decided today"); open = everything else.
    Live: answering a payer or accepting a denial moves it. */
export function workloadOf(requests: readonly PsyRequest[], f: Filters, scope: Scope): Workload {
  const mine = requests.filter((r) => scope.has(r.caseId) && (f.payer === "all" || r.payerId === f.payer) && (f.program === "all" || r.program === f.program));
  const handled = mine.filter((r) => inStage(r, "decided")).length;
  return { handled, open: mine.length - handled, needsYou: mine.filter((r) => r.needsYou && !inStage(r, "decided")).length };
}
