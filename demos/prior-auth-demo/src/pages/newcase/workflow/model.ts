/* Which payer workflow a case follows, and where it stands. Pure: the store, the clock and the draft go in, one description comes out.
   New Case is execution: it never edits a workflow. It matches the published ones by payer, product, state, service, request type and date, runs the one it follows against the case's facts, and
   tells the person what the workflow does next. Until the workflow has run past Intake the case follows the best match; after that the version is pinned and only a person's review changes it. */
import type { CaseDraft } from "@/data/cases";
import type { AppliedWorkflow, CaseFacts, MatchResult, PayerRule, RunResult, Stage, WfNode, Workflow, WorkflowVersion } from "@/data/workflow/types";
import { DEFAULT_NOTE, defaultWorkflowFor, matchWorkflow, runWorkflow } from "./engine";
import { approvalsFor } from "./facts";

/** The workflows and rules the engine reads. */
export interface WorkflowLibrary {
  workflows: Workflow[];
  versions: WorkflowVersion[];
  /** The rules of the payer the case is for. */
  rules: PayerRule[];
}

export interface CaseWorkflow {
  facts: CaseFacts;
  /** A fresh match of today's facts against the published workflows. */
  match: MatchResult;
  /** Two or more equally specific workflows matched and nobody has chosen between them. The labelled default stands in until someone does. */
  conflict: Workflow[] | null;
  /** What a fresh match applies now: the best match, the one a person chose between equals, or the default. */
  target: AppliedWorkflow;
  /** What the case follows. The same as `target` until the version is pinned. */
  applied: AppliedWorkflow;
  /** The graph of the version the case follows. */
  workflow: Workflow;
  run: RunResult;
  /** Where the workflow is: the stage of the step it stopped at, or the last one it reached. */
  stage: Stage;
  /** The same workflow has a later published version than the one the case is pinned to. */
  newer: Workflow | null;
  /** The case is pinned, its payer, level of care or type changed since the workflow was matched, and a fresh match is a different workflow. */
  differs: boolean;
  /** What the match was made for: "summit|RES|initial". */
  forKey: string;
  pinned: boolean;
  /** The workflows, saved versions and rules this was worked out from. */
  library: WorkflowLibrary;
  /** One sentence for the step header: "Paused for documentation: the treatment plan is missing." */
  hint: string;
  /** The workflow ends in "No authorization required". */
  noAuth: boolean;
  /** The case has a coverage check (see hasVerification). */
  checked: boolean;
  /** What the workflow adds that the person can act on, one sentence each. Rules that are only unverified are listed in the trace, not here. */
  warnings: string[];
}

export const sameApplied = (a: Pick<AppliedWorkflow, "workflowId" | "version" | "usedDefault">, b: Pick<AppliedWorkflow, "workflowId" | "version" | "usedDefault">): boolean =>
  a.workflowId === b.workflowId && a.version === b.version && a.usedDefault === b.usedDefault;

/** The default is labelled as what it is, per request type: "Default process for a concurrent review". No payer workflow matches. Illustrative, not payer policy. */
export const defaultName = (type: CaseFacts["requestType"]): string => defaultWorkflowFor(type).name;
export const defaultLabel = (type: CaseFacts["requestType"]): string => `${defaultName(type)}. ${DEFAULT_NOTE}`;

/** A saved snapshot as the workflow it was. */
export function workflowOfVersion(v: WorkflowVersion): Workflow {
  return { ...v.meta, id: v.workflowId, version: v.version, status: v.status, nodes: v.nodes, edges: v.edges, updatedAt: v.savedAt, updatedBy: v.savedBy };
}

/** The graph of one version. A snapshot is preferred to the working copy, which may hold edits nobody published. */
function graphOf(applied: AppliedWorkflow, lib: WorkflowLibrary, type: CaseFacts["requestType"]): Workflow {
  if (applied.usedDefault) return defaultWorkflowFor(type);
  const snap = lib.versions.find((v) => v.workflowId === applied.workflowId && v.version === applied.version && v.status !== "draft");
  if (snap) return workflowOfVersion(snap);
  const live = lib.workflows.find((w) => w.id === applied.workflowId && w.version === applied.version);
  return live ?? defaultWorkflowFor(type);
}

/** The newest published version of a workflow. */
export function latestPublished(id: string, lib: Pick<WorkflowLibrary, "workflows" | "versions">): Workflow | null {
  const fromSnaps = lib.versions.filter((v) => v.workflowId === id && v.status === "published").map(workflowOfVersion);
  const live = lib.workflows.filter((w) => w.id === id && w.status === "published");
  return [...fromSnaps, ...live].sort((a, b) => b.version - a.version)[0] ?? null;
}

const stageAt = (workflow: Workflow, run: RunResult): Stage => {
  const nodeOf = (id: string | undefined): WfNode | undefined => (id ? workflow.nodes.find((n) => n.id === id) : undefined);
  const stop = nodeOf(run.stoppedAt ?? run.visited[run.visited.length - 1]);
  /* A path that ends in a person's review or in "no authorization needed" stopped where the step before it was, not at the End step's own stage. */
  if (stop?.kind === "end" && run.endResult !== "completed" && run.endResult !== "denial") {
    const before = [...run.steps].reverse().find((s) => s.nodeId !== stop.id && s.kind !== "end");
    return nodeOf(before?.nodeId)?.stage ?? stop.stage;
  }
  if (stop) return stop.stage;
  return run.status === "completed" || run.status === "no_authorization" ? "review" : "intake";
};

/** A person's choice between equals holds only while the same workflows still compete. */
function choiceOf(draft: CaseDraft, conflict: Workflow[]): Workflow | undefined {
  const c = draft.workflowChoice;
  if (!c) return undefined;
  const ids = conflict.map((w) => w.id).sort().join("|");
  return c.among.slice().sort().join("|") === ids ? conflict.find((w) => w.id === c.workflowId) : undefined;
}

/** Before the coverage check has run, a verification step reads "unknown" because nobody asked yet. The run then waits for the check, where it would otherwise send the case to a person
    for a plan that never answered. The steps after it were never reached, so they are pending. */
function waitForCheck(workflow: Workflow, run: RunResult): RunResult {
  if (run.status !== "manual_review") return run;
  const at = [...run.steps].reverse().find((s) => s.kind.startsWith("ver_") && s.handle === "unknown");
  if (!at) return run;
  const text = "Waiting for the eligibility check: Verify has not checked coverage for this case yet.";
  const steps = run.steps.slice(0, run.steps.findIndex((s) => s === at) + 1).map((s) => (s === at ? { ...s, outcome: "waiting" as const, message: "Waiting for the eligibility check. Verify has not checked this case yet." } : s));
  const visited = [...new Set(steps.map((s) => s.nodeId))];
  const reach = new Set<string>();
  const walk = (id: string) => {
    for (const e of workflow.edges) if (e.from === id && !reach.has(e.to)) { reach.add(e.to); walk(e.to); }
  };
  walk(at.nodeId);
  const unvisited = workflow.nodes.map((n) => n.id).filter((id) => !visited.includes(id));
  return { ...run, status: "paused", reason: text, outcomeText: text, stoppedAt: at.nodeId, endResult: undefined, steps, visited, pending: unvisited.filter((id) => reach.has(id)), skipped: unvisited.filter((id) => !reach.has(id)) };
}

export function resolveCaseWorkflow(draft: CaseDraft, base: CaseFacts, lib: WorkflowLibrary, clock: number, checked: boolean): CaseWorkflow {
  const published = lib.workflows.filter((w) => w.status === "published");
  const match = matchWorkflow(base, published);
  const conflictAll = match.conflict && match.conflict.length > 1 ? match.conflict : null;
  const chosen = conflictAll ? choiceOf(draft, conflictAll) : undefined;
  /* With nothing matching, the engine hands back the default as `workflow` and says so in `usedDefault`; the default is built here from the request type so it is always labelled as one. */
  const best = conflictAll ? chosen : match.usedDefault ? undefined : match.workflow;
  const unresolved = conflictAll && !chosen ? conflictAll : null;

  const names = unresolved ? unresolved.map((w) => w.name) : [];
  const explanation = unresolved
    ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} match equally. The default process is used until someone chooses.`
    : best
      ? chosen
        ? `${best.name} was chosen between ${conflictAll?.length ?? 2} equally specific workflows. ${match.explanation}`
        : match.explanation
      : `${defaultLabel(base.requestType)}`;
  const target: AppliedWorkflow = best
    ? { workflowId: best.id, version: best.version, name: best.name, appliedAt: clock, usedDefault: false, explanation }
    : (() => {
        const def = defaultWorkflowFor(base.requestType);
        return { workflowId: def.id, version: def.version, name: defaultName(base.requestType), appliedAt: clock, usedDefault: true, explanation };
      })();

  const pinned = !!draft.workflowPinned || draft.sent;
  const stored = draft.appliedWorkflow;
  const applied = stored && (pinned || sameApplied(stored, target)) ? stored : target;
  const workflow = graphOf(applied, lib, base.requestType);
  const facts: CaseFacts = { ...base, approvals: approvalsFor(workflow, draft) };
  const raw = runWorkflow(workflow, facts, lib.rules);
  const run = checked ? raw : waitForCheck(workflow, raw);

  const latest = pinned && !applied.usedDefault ? latestPublished(applied.workflowId, lib) : null;
  const newer = latest && latest.version > applied.version ? latest : null;
  const forKey = `${base.payerId}|${base.service}|${base.requestType}`;
  /* A workflow published later does not move a case that follows another one: only a change to the case itself asks for a review. */
  const changed = !!draft.workflowFor && draft.workflowFor !== forKey;
  const differs = pinned && !!stored && changed && (stored.workflowId !== target.workflowId || stored.usedDefault !== target.usedDefault);

  return {
    facts,
    match,
    conflict: unresolved && (!pinned || !stored || changed || stored.usedDefault) ? unresolved : null,
    target,
    applied,
    workflow,
    run,
    library: lib,
    stage: stageAt(workflow, run),
    newer,
    differs,
    forKey,
    pinned,
    hint: run.outcomeText,
    noAuth: run.status === "no_authorization",
    checked,
    warnings: warningsOf(run),
  };
}

/** "Submission window: Rule is unverified: ..." is the engine saying a demo rule has not been checked against a source. Every seeded rule is in that state, so it is shown in the info note and the trace,
    not as a warning on every step. What is left is what a person can act on. */
const UNVERIFIED_RULE = /: Rule is unverified:/;
export function warningsOf(run: RunResult): string[] {
  const out: string[] = [];
  for (const w of run.warnings) if (!UNVERIFIED_RULE.test(w) && !out.includes(w)) out.push(w);
  return out;
}
