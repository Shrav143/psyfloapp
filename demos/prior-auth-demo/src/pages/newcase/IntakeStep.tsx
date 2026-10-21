import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Inbox, Save, ShieldCheck } from "lucide-react";
import { Banner, Button, Modal } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { DocumentsCard } from "./DocumentsCard";
import { InsuranceCard } from "./InsuranceCard";
import { intakeMissing } from "./intake";
import { PatientCard } from "./PatientCard";
import { RequestCard } from "./RequestCard";
import { StepFooter } from "./StepFooter";

/** Step 2, Medical records: the patient, the insurance, the request and the chart. Continue starts the agents after a confirm. */
export function IntakeStep({ draft }: { draft: CaseDraft }) {
  const nav = useNavigate();
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

  return (
    <>
      {draft.referralId ? (
        <Banner tone="good" icon={Inbox} title={`Started from referral ${draft.referralId}`} action={<Button size="sm" onClick={() => nav(paths.referral(draft.referralId ?? "", draft.id))}>View referral</Button>}>
          Patient, payer, program, diagnoses and the reason were filled in from the referral, and the referral is the first document. Check them, then add the rest of the chart.
        </Banner>
      ) : (
        <Banner icon={Inbox} title="No referral in this case" action={<Button size="sm" onClick={() => patch(draft.id, { phase: "referral" })}>Add a referral</Button>}>
          You are adding the patient yourself. You can still go back and attach a referral.
        </Banner>
      )}
      <Banner icon={ShieldCheck}>
        <b>Privacy mode is on.</b> Names, dates and IDs are swapped for codes before any agent reads the chart.
      </Banner>
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start gap-5">
        <div className="flex flex-col gap-5">
          <PatientCard draft={draft} />
          <DocumentsCard draft={draft} />
        </div>
        <div className="flex flex-col gap-5">
          <InsuranceCard draft={draft} />
          <RequestCard draft={draft} />
        </div>
      </div>
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
        hint={missing.length ? `Still needed: ${missing.join(", ")}.` : "Nothing is sent to the payer until a clinician signs."}
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
    </>
  );
}
