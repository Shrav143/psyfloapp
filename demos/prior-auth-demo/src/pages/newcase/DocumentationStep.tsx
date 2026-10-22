import { useState } from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button, ChecklistProgress, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { runStarted } from "@/data/cases";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { DropPanel } from "./DropPanel";
import { RecordsChecklist } from "./RecordsChecklist";
import { StartAgentsModal } from "./StartAgentsModal";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useUnmetSync } from "./useUnmetSync";

/** Step 3, Clinical documentation: drop what you have, watch the list tick off, add what is missing. The required items come from the payer's saved list for the level of care;
    what is typical for this type of request is labelled as typical. Nothing here blocks: what is missing is listed again, with a fix, on Review & submit. */
export function DocumentationStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const toast = useStore((s) => s.toast);
  const save = useStore((s) => s.saveCaseDraft);
  const start = useStore((s) => s.startCaseRun);
  const patch = useStore((s) => s.patchCaseDraft);
  const [confirm, setConfirm] = useState(false);
  useUnmetSync(draft);
  const r = env.readiness;
  const names = r.missingRequired.slice(0, 3).map((e) => e.label).join(", ") + (r.missingRequired.length > 3 ? ` and ${r.missingRequired.length - 3} more` : "");

  const onContinue = () => {
    if (runStarted(draft)) patch(draft.id, stepPatch(3));
    else setConfirm(true);
  };
  const saveDraft = () => {
    save(draft.id);
    const id = useStore.getState().caseDrafts.find((d) => d.id === draft.id)?.caseId;
    toast({ title: "Draft saved", body: `${id ?? "The draft"} is in Case Manager. Pick it up whenever you like.`, tone: "good" });
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <DropPanel draft={draft} />
      <RecordsChecklist
        draft={draft}
        groups={["clinical", "documents"]}
        header={<ChecklistProgress done={r.ready} total={r.total} right={r.missingRequired.length === 0 && r.total > 0 ? <Pill tone="good" dot>Required documents are in</Pill> : null} />}
      />
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(1))}>
              Back
            </Button>
            <Button icon={Save} onClick={saveDraft}>
              Save as draft
            </Button>
            <Button variant="primary" trailing={ArrowRight} onClick={onContinue}>
              Continue
            </Button>
          </>
        }
        hint={r.missingRequired.length ? `Not in yet: ${names}. You can go on; Review & submit lists what is missing.` : "Nothing is sent to the payer until a clinician signs."}
      />
      <StartAgentsModal
        draft={draft}
        open={confirm}
        onClose={() => setConfirm(false)}
        onStart={() => {
          setConfirm(false);
          start(draft.id);
        }}
      />
    </div>
  );
}
