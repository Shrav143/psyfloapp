import { Drawer, Timeline } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import type { RequestEvent } from "@/data/types";

/** What the payer workflow did on this case so far, newest last. These are the lines that go to the request's History when it is signed. */
export function WorkflowTraceDrawer({ draft, open, onClose }: { draft: CaseDraft; open: boolean; onClose: () => void }) {
  const events: RequestEvent[] = (draft.workflowLog ?? []).map((e) => ({ id: e.key, at: e.at, actor: e.actor, text: e.text, detail: e.detail, done: true }));
  return (
    <Drawer open={open} onClose={onClose} width={520} title="Workflow trace" subtitle={draft.appliedWorkflow ? `${draft.appliedWorkflow.name}, version ${draft.appliedWorkflow.version}` : undefined}>
      <p className="mb-4 text-[13px] text-muted">
        {(draft.workflowLog ?? []).every((e) => e.posted) ? "These lines are in the request's History on the case page." : "These lines are written to the request's History when it is signed and sent."}
      </p>
      <Timeline events={events} empty="The workflow has not recorded anything yet." />
    </Drawer>
  );
}
