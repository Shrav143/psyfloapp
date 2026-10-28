import { useState } from "react";
import { Modal } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { ConfigureWizard } from "./ConfigureWizard";
import { startOf, type WizardStep } from "./model";

/** Change an intake's configuration from the workspace: the same four steps as the page, in a dialog. Applying reconciles the modules (those with work are
    kept with their data, the ones the new plan drops are archived) and writes the change to the history. */
export function ConfigureDialog({ open, onClose, record, onDone }: { open: boolean; onClose: () => void; record: IntakeRecord; onDone?: () => void }) {
  if (!open) return null;
  return <Body record={record} onClose={onClose} onDone={onDone} />;
}

function Body({ record, onClose, onDone }: { record: IntakeRecord; onClose: () => void; onDone?: () => void }) {
  const [start] = useState(() => startOf(record));
  const [step, setStep] = useState<WizardStep>(start.step);
  return (
    <Modal open onClose={onClose} size="lg" title={record.config ? "Change configuration" : "Configure the intake"} subtitle={`${record.initials || "No name yet"}${record.age !== null ? `, ${record.age}` : ""} · ${record.id}`}>
      <ConfigureWizard
        record={record} start={start} step={step} onStep={setStep} variant="dialog"
        onDone={() => {
          onDone?.();
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
