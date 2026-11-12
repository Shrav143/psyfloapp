import { PAYERS } from "../seed";
import { PROGRAM_LABEL } from "../types";
import { DEFAULT_WORKFLOW_FOR } from "./default";
import { REQUEST_TYPE_LABEL, type CaseFacts, type MatchCandidate, type MatchResult, type PayerRule, type Workflow } from "./types";

/* Which published workflow a case follows. Only published workflows count, inside their effective dates, for this payer. Each one that applies is scored on how specific it is: a state,
   a product, a service, a provider type and a request type it names (and the case has) each add a point, and "any" or an empty list adds none. The highest score wins. Two different
   workflows with the highest score are a conflict: none is chosen and both are listed. Nothing matching at all uses the labelled default, which holds no payer rules. */

const list = (xs: string[]): string => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const shortOf = (id: string): string => PAYERS.find((p) => p.id === id)?.shortName ?? id;

/** How well one workflow fits the facts: the points it earns and what they are for, or null when it does not apply (another payer, state, product, service, provider type or request type, or outside its dates). */
export function scoreWorkflow(w: Workflow, f: CaseFacts): { score: number; why: string[] } | null {
  if (w.payerId !== f.payerId) return null;
  if (w.effectiveFrom > f.today || (w.effectiveTo && w.effectiveTo < f.today)) return null;
  const why = ["payer"];
  if (w.state) {
    if (f.state && w.state !== f.state) return null;
    if (f.state) why.push("state");
  }
  if (w.product) {
    if (f.product && w.product !== f.product) return null;
    if (f.product) why.push("product");
  }
  if (w.services.length) {
    if (!w.services.includes(f.service)) return null;
    why.push("service");
  }
  if (w.providerType) {
    if (f.providerType && w.providerType !== f.providerType) return null;
    if (f.providerType) why.push("provider type");
  }
  if (w.requestType !== "any") {
    if (w.requestType !== f.requestType) return null;
    why.push("request type");
  }
  return { score: why.length - 1, why };
}

export function matchWorkflow(facts: CaseFacts, workflows: Workflow[], rules?: PayerRule[]): MatchResult {
  const candidates: MatchCandidate[] = [];
  for (const w of workflows) {
    if (w.status !== "published") continue;
    const s = scoreWorkflow(w, facts);
    if (s) candidates.push({ workflow: w, score: s.score, why: s.why });
  }
  candidates.sort((a, b) => b.score - a.score || a.workflow.name.localeCompare(b.workflow.name) || a.workflow.id.localeCompare(b.workflow.id));
  const who = shortOf(facts.payerId);

  if (!candidates.length) {
    return {
      workflow: DEFAULT_WORKFLOW_FOR(facts.requestType),
      candidates,
      usedDefault: true,
      explanation: `No published workflow matches ${who}, ${PROGRAM_LABEL[facts.service]}, ${REQUEST_TYPE_LABEL[facts.requestType]}. The labelled default is used. It is illustrative and holds no payer rules.`,
    };
  }
  const top = candidates.filter((c) => c.score === candidates[0].score);
  if (top.length > 1) {
    return {
      candidates,
      conflict: top.map((c) => c.workflow),
      usedDefault: false,
      explanation: `${top.length} published workflows match ${who}, ${PROGRAM_LABEL[facts.service]}, ${REQUEST_TYPE_LABEL[facts.requestType]} equally well: ${list(top.map((c) => c.workflow.name))}. None was chosen. Archive or narrow one of them, or pick one by hand.`,
    };
  }
  const best = top[0];
  const w = best.workflow;
  /* The payer's default is the workflow that names no service and no request type. A more specific one takes its place for this case. */
  const defaults = candidates.filter((c) => c.workflow.id !== w.id && c.workflow.services.length === 0 && c.workflow.requestType === "any");
  const isDefault = w.services.length === 0 && w.requestType === "any";
  const dims = best.why;
  const matches = list(dims);
  const over = isDefault ? `this is the ${who} default.` : defaults.length ? `it takes the place of the ${who} default (${defaults[0].workflow.name}) for this case.` : `no override of the ${who} default.`;
  const refs = new Set(w.nodes.flatMap((n) => n.ruleRefs));
  const unverified = rules ? rules.filter((r) => refs.has(r.id) && r.verification !== "verified").length : 0;
  const tail = unverified ? ` ${unverified === 1 ? "One of its rules is" : `${unverified} of its rules are`} not verified.` : "";
  return { workflow: w, candidates, usedDefault: false, explanation: `Applied ${w.name} v${w.version}: matches ${matches}; ${over}${tail}` };
}
