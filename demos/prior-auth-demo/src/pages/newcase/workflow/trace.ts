/* What the payer workflow leaves in a case's History: which workflow was applied, how far it ran at each stage change (done, skipped, waiting), the rules it read with their verification state,
   the sign-off, and what was prepared versus what was transmitted. Lines are short; the detail sits under them. Pure, so the same case and the same facts give the same lines (the key stops repeats). */
import type { WorkflowLogEntry } from "@/data/cases";
import { STAGES_ORDER, VERIFICATION_LABEL, type NodeKind, type Stage, type TraceStep, type WfNode } from "@/data/workflow/types";
import { plural } from "@/lib/format";
import { approveAll, runWorkflow } from "./engine";
import { warningsOf, type CaseWorkflow } from "./model";
import { caseStageLabel } from "./stageLabel";

export type Entry = Omit<WorkflowLogEntry, "posted">;

const cut = (s: string, n = 140): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const bare = (s: string): string => s.trim().replace(/[.\s]+$/, "");
const lower = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const stageIdx = (s: Stage): number => STAGES_ORDER.indexOf(s);
/** The agent that does the work of each stage, so a line about the stage names who was working on it. Intake is the person's own. */
const STAGE_ACTOR: Record<Stage, Entry["actor"]> = { intake: "system", eligibility: "verify", documentation: "reader", preparation: "scribe", review: "integrity" };

/** "Submission window (Unverified), Backdating (Demo sample, Unverified)" */
export const rulesLine = (view: Pick<CaseWorkflow, "run">): string =>
  view.run.rulesUsed.length ? `Rules read: ${view.run.rulesUsed.map((r) => `${r.title} (${VERIFICATION_LABEL[r.verification]})`).join(", ")}.` : "";

/** "Workflow applied: Initial Authorization, Residential SUD v3 (Sentara)". The default says it is the default. */
export function appliedEntry(view: Pick<CaseWorkflow, "applied" | "conflict">, payerShort: string, at: number, n: number): Entry {
  const a = view.applied;
  return {
    key: `applied:${a.workflowId}:v${a.version}:${n}`,
    at,
    actor: "system",
    text: a.usedDefault ? `Default workflow applied: ${a.name}` : `Workflow applied: ${a.name} v${a.version} (${payerShort})`,
    detail: cut(a.explanation, 260),
  };
}

const nodeOf = (view: Pick<CaseWorkflow, "workflow">, id: string): WfNode | undefined => view.workflow.nodes.find((n) => n.id === id);
/** The steps that count for "ran to": real steps at or before the stage. The start and the end are not steps a person would count. */
function stepsUpTo(view: Pick<CaseWorkflow, "workflow" | "run">, stage: Stage, steps: TraceStep[] = view.run.steps): TraceStep[] {
  return steps.filter((s) => {
    const node = nodeOf(view, s.nodeId);
    return !!node && stageIdx(node.stage) <= stageIdx(stage) && s.kind !== "start" && s.kind !== "end";
  });
}

/** One line for the stage the person just opened (or signed from), a second one when the workflow waits for something. */
export function stageEntries(view: CaseWorkflow, stage: Stage, at: number, run = view.run): Entry[] {
  const steps = stepsUpTo({ workflow: view.workflow, run }, stage, run.steps);
  const done = steps.filter((s) => s.outcome === "done");
  const skipped = steps.filter((s) => s.outcome === "skipped");
  const waiting = steps.filter((s) => s.outcome === "waiting" || s.outcome === "manual_review" || s.outcome === "failed");
  const sig = `${view.applied.workflowId}@${view.applied.version}:${done.length}/${skipped.length}/${waiting.map((w) => w.nodeId).join(",")}:${run.status}`;
  const skip = skipped[0] ? ` (${skipped[0].title}: ${lower(bare(skipped[0].message))}${skipped.length > 1 ? ` and ${skipped.length - 1} more` : ""})` : "";
  const out: Entry[] = [
    {
      key: `stage:${stage}:${sig}`,
      at,
      actor: STAGE_ACTOR[stage],
      text: `Workflow ran to ${caseStageLabel(stage)}: ${plural(done.length, "step")} done${skipped.length ? `, ${skipped.length} skipped${skip}` : ""}`,
      detail: cut([done.length ? `Done: ${done.slice(0, 4).map((s) => s.title).join(", ")}${done.length > 4 ? ` and ${done.length - 4} more` : ""}.` : "", run.pending?.length ? `${plural(run.pending.length, "step")} still ahead.` : "", rulesLine({ run }), warningsOf(run).length ? `Warnings: ${warningsOf(run).join(" ")}` : ""].filter(Boolean).join(" "), 400) || undefined,
    },
  ];
  const stop = waiting[0];
  if (stop) {
    const what = bare(stop.message).replace(/^waiting for (a |an |the )?/i, "").replace(/^./, (c) => c.toUpperCase()) || stop.title;
    out.push({ key: `waiting:${stage}:${sig}`, at, actor: STAGE_ACTOR[stage], text: `Waiting: ${cut(what, 100)}`, detail: what.length > 100 ? `${what}.` : undefined });
  }
  return out;
}

const PREPARES: NodeKind[] = ["act_portal_prep", "act_fax_prep", "act_call_prep", "act_document"];
const REACHES_OUT: NodeKind[] = ["int_payer_portal", "int_api", "int_webhook", "int_fax", "int_email", "act_notify"];

/** The lines for the signature and the send. Prepared and transmitted are told apart: the packet is prepared, and the one send is the demo's simulated one, so nothing is transmitted on its own. */
export function signEntries(view: CaseWorkflow, p: { signer: string; payerShort: string; at: number; acknowledged: string[]; /** Lines the case already has, so the same words are not written twice. */ known?: string[] }): Entry[] {
  const approved = approveAll(view.workflow);
  const run = runWorkflow(view.workflow, { ...view.facts, approvals: approved }, view.library.rules);
  const prepared = view.workflow.nodes.filter((n) => PREPARES.includes(n.kind)).map((n) => n.title);
  const reaches = view.workflow.nodes.filter((n) => REACHES_OUT.includes(n.kind)).map((n) => n.title);
  const out: Entry[] = [];
  const gates = view.workflow.nodes.filter((n) => approved[n.id]).map((n) => n.title);
  out.push({ key: `sign:approved:${view.applied.workflowId}@${view.applied.version}`, at: p.at, actor: "you", text: `Workflow approval recorded: ${p.signer}`, detail: gates.length ? `Approval given for: ${gates.join(", ")}.` : "The workflow has no step of its own that asks for an approval. The clinician sign-off is the gate." });
  out.push(...stageEntries(view, "review", p.at, run).map((e) => ({ ...e, key: `sign:${e.key}` })));
  if (p.acknowledged.length) out.push({ key: `sign:override:${p.acknowledged.join("|")}`, at: p.at, actor: "you", text: `Override: signed with ${plural(p.acknowledged.length, "warning")} acknowledged`, detail: p.acknowledged.join(". ") });
  out.push({
    key: "sign:prepared",
    at: p.at,
    actor: "packet",
    text: `Prepared for ${p.payerShort} (demo simulation). Nothing was transmitted outside this app`,
    detail: cut([prepared.length ? `Prepared by the workflow: ${prepared.join(", ")}.` : "The packet was prepared by the agents.", reaches.length ? `Not transmitted on their own: ${reaches.join(", ")}. The send is the one simulated by Sign and send to payer (demo).` : "The one send is simulated by Sign and send to payer (demo)."].join(" "), 300),
  });
  return out.filter((e) => !p.known?.includes(e.text)).map((e) => ({ ...e, text: cap(e.text) }));
}
