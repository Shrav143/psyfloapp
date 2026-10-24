import { useEffect, useRef } from "react";
import { runStarted, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { engineStage, stepIndex } from "../steps";
import { sameApplied, type CaseWorkflow } from "./model";
import { appliedEntry, stageEntries, type Entry } from "./trace";

/** Keeps the draft in step with its workflow, from the page that shows the case (never from a render):
    - Before the workflow has run past Intake the case follows the best match, so a changed payer, level of care or Authorization type re-matches. The new match is stored and written to the history.
    - The first time a stage after Intake is open (or the agents have started, or the request was sent) the version is pinned. From then on only a person's review changes it.
    - Each time the person opens a stage, one line says how far the workflow ran (done, skipped, waiting), and a second when it waits for something.
   Records that are not in view (the other site's, or a request already sent) are left alone. */
export function useWorkflowSync(draft: CaseDraft | undefined, view: CaseWorkflow | null, enabled: boolean): void {
  const latest = useRef({ draft, view });
  latest.current = { draft, view };
  const record = useStore((s) => s.recordCaseWorkflow);
  const at = draft ? stepIndex(draft) : 0;
  /* The engine's stage, which tells Clinical documentation before and after the agents start apart. */
  const stage = draft ? engineStage({ ...draft, agentsStarted: runStarted(draft) }) : "intake";
  const executing = !!draft && (at >= 1 || draft.run.done > 0);
  const appliedKey = view ? `${view.applied.workflowId}@${view.applied.version}:${view.applied.usedDefault}` : "";
  const stored = draft?.appliedWorkflow;
  const storedKey = stored ? `${stored.workflowId}@${stored.version}:${stored.usedDefault}` : "";
  const pinnedNow = !!draft?.workflowPinned;
  /* The coverage check landing is a change the trace should show: "Workflow ran to Eligibility & Benefits" is true after Verify answered. */
  const checked = !!view?.checked;
  const id = draft?.id;

  /* Apply or re-apply while the version is free to follow the match, and pin once the workflow has run past Intake. */
  useEffect(() => {
    const { draft: d, view: v } = latest.current;
    if (!enabled || !d || !v || d.sent) return;
    const entries: Entry[] = [];
    let applied: CaseWorkflow["applied"] | undefined;
    if (!d.workflowPinned && (!d.appliedWorkflow || !sameApplied(d.appliedWorkflow, v.applied))) {
      applied = v.applied;
      entries.push(appliedEntry(v, d.payerId ? payerById(d.payerId).shortName : "", useStore.getState().clock, (d.workflowLog ?? []).length));
    }
    const pin = executing && !d.workflowPinned;
    if (applied || pin || entries.length) record(d.id, { applied, forKey: applied ? v.forKey : undefined, pin, entries });
  }, [enabled, id, appliedKey, storedKey, executing, pinnedNow, record]);

  /* One line per stage change, once the workflow follows the case. */
  useEffect(() => {
    const { draft: d, view: v } = latest.current;
    if (!enabled || !d || !v || d.sent || !d.appliedWorkflow || !d.workflowPinned) return;
    record(d.id, { entries: stageEntries(v, stage, useStore.getState().clock) });
  }, [enabled, id, stage, pinnedNow, checked, record]);
}
