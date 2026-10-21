import { useState } from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { useStore } from "@/store";
import { DropPanel } from "./DropPanel";
import { intakeMissing } from "./intake";
import { RecordsChecklist } from "./RecordsChecklist";
import { StepFooter } from "./StepFooter";

/** Step 2, Medical records: drop what you have, watch the list tick off, add what is missing. Continue starts the agents after a confirm. */
export function IntakeStep({ draft }: { draft: CaseDraft }) {
  const toast = useStore((s) => s.toast);
  const save = useStore((s) => s.saveCaseDraft);
  const start = useStore((s) => s.startCaseRun);
  const patch = useStore((s) => s.patchCaseDraft);
  const [confirm, setConfirm] = useState(false);
  const missing = intakeMissing(draft);
  const payer = draft.payerId ? payerById(draft.payerId) : null;

  const onContinue = () => {
    if (draft.run.done > 0) patch(draft.id, { step: 1 });
    else setConfirm(true);
  };
  const saveDraft = () => {
    save(draft.id);
    const id = useStore.getState().caseDrafts.find((d) => d.id === draft.id)?.caseId;
    toast({ title: "Draft saved", body: `${id ?? "The draft"} is in Case Manager. Pick it up whenever you like.`, tone: "good" });
  };
  const needed = missing.slice(0, 3).join(", ") + (missing.length > 3 ? ` and ${missing.length - 3} more` : "");

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <DropPanel draft={draft} />
      <RecordsChecklist draft={draft} />
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, { phase: "referral" })}>
              Back
            </Button>
            <Button icon={Save} onClick={saveDraft}>
              Save as draft
            </Button>
            <Button variant="primary" trailing={ArrowRight} disabled={missing.length > 0} onClick={onContinue}>
              Continue
            </Button>
          </>
        }
        hint={missing.length ? `Still needed: ${needed}.` : "Nothing is sent to the payer until a clinician signs."}
      />
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Start the agents?"
        subtitle={`${draft.patient.initials}, ${draft.program ? PROGRAM_LABEL[draft.program] : ""} · ${payer?.name ?? ""}`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirm(false);
                start(draft.id);
              }}
            >
              Start the agents
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">Reader swaps names, dates and IDs for codes and reads the chart. Verify, Criteria, Historian and Placement check coverage, rules and how {payer?.shortName ?? "the payer"} has ruled. Scribe drafts the case and may ask you up to three questions.</p>
        <p className="mt-3 text-sm font-medium">Nothing is sent to the payer until a clinician signs.</p>
      </Modal>
    </div>
  );
}
