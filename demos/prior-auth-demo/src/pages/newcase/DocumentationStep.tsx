import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Save, ShieldCheck } from "lucide-react";
import { Button, ChecklistProgress, InfoTip, Pill } from "@/components/ui";
import { RUN_STEPS, type CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { DropPanel } from "./DropPanel";
import { PayerChangeNote } from "./PayerChangeNote";
import { PreparationSection } from "./PreparationSection";
import { RecordsChecklist } from "./RecordsChecklist";
import { StartAgentsModal } from "./StartAgentsModal";
import { StepFooter } from "./StepFooter";
import { PREPARATION_ID, stepPatch } from "./steps";
import { useSaveDraft } from "./useSaveDraft";
import { useUnmetSync } from "./useUnmetSync";
import { foldWorkflow } from "./workflow/fold";

const toSection = (smooth: boolean) => requestAnimationFrame(() => document.getElementById(PREPARATION_ID)?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }));

/** Step 3, Clinical documentation: drop or import what you have, watch the list tick off, then the agents prepare the authorization in the last section.
    The required items come from the payer's saved list for the level of care; what is typical for this type of request is labelled as typical. Nothing here blocks. */
export function DocumentationStep({ draft, env, toPreparation = 0 }: { draft: CaseDraft; env: CaseEnv; /** Counts up when the page should open on the agents' section. */ toPreparation?: number }) {
  const start = useStore((s) => s.startCaseRun);
  const patch = useStore((s) => s.patchCaseDraft);
  const saveDraft = useSaveDraft(draft.id);
  const [confirm, setConfirm] = useState(false);
  useUnmetSync(draft);
  const r = env.readiness;
  const finished = draft.run.done >= RUN_STEPS.length;

  useEffect(() => {
    if (toPreparation > 0) toSection(false);
  }, [toPreparation]);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <PayerChangeNote draft={draft} />
      <DropPanel draft={draft} />
      <RecordsChecklist
        draft={draft}
        groups={["clinical", "documents"]}
        header={
          <ChecklistProgress
            done={r.ready}
            total={r.total}
            right={
              <span className="flex items-center gap-2">
                {r.missingRequired.length === 0 && r.total > 0 && r.ready < r.total ? <Pill tone="good" dot>Required documents are in</Pill> : null}
                <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                  <ShieldCheck size={14} className="ico" aria-hidden="true" />
                  Privacy mode
                  <InfoTip label="Privacy mode" align="end">Names, dates and IDs are swapped for codes before any agent reads the chart.</InfoTip>
                </span>
              </span>
            }
          />
        }
      />
      <PreparationSection draft={draft} env={env} onStart={() => setConfirm(true)} />
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(1))}>
              Back
            </Button>
            <Button icon={Save} onClick={saveDraft}>
              Save as draft
            </Button>
            {finished ? (
              <Button variant="primary" trailing={ArrowRight} onClick={() => patch(draft.id, stepPatch(3))}>
                Continue to Review &amp; submit
              </Button>
            ) : null}
          </>
        }
        hint={foldWorkflow(null, env)}
      />
      <StartAgentsModal
        draft={draft}
        readiness={r}
        open={confirm}
        onClose={() => setConfirm(false)}
        onStart={() => {
          setConfirm(false);
          start(draft.id);
          toSection(true);
        }}
      />
    </div>
  );
}
