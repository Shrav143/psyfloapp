import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import type { ValidationIssue, Workflow } from "@/data/workflow/types";
import { AreaField } from "./fields/controls";

/* The short confirmations around a workflow: publish, archive and leaving with unsaved changes. Centered, because each is a yes or no. */

export function PublishDialog({ workflow, nextVersion, inForce, warnings, unsaved, onConfirm, onClose }: { workflow: Workflow; nextVersion: number; /** The published version this replaces, if there is one. */ inForce?: number; warnings: ValidationIssue[]; unsaved: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const missing = touched && !reason.trim();
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Publish version ${nextVersion}?`}
      subtitle={workflow.name}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (reason.trim()) onConfirm(reason.trim());
            }}
          >
            Publish version {nextVersion}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-ink2">
        <p className="m-0">
          {inForce ? `This replaces published version ${inForce}. ` : "Once published, new cases can use it. "}
          Cases already in progress keep the version they started with. Nothing already sent is changed.
        </p>
        {unsaved ? <p className="m-0 text-muted">Your unsaved changes are saved with it.</p> : null}
        {warnings.length ? (
          <div className="rounded-xl bg-mid-bg px-3.5 py-3 text-mid-ink">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} className="ico" aria-hidden="true" />{warnings.length} {warnings.length === 1 ? "thing to check" : "things to check"}, none of them blocking</div>
            <ul className="mt-1.5 mb-0 list-disc pl-5">
              {warnings.slice(0, 4).map((w, i) => (
                <li key={i}>{w.text}</li>
              ))}
              {warnings.length > 4 ? <li>and {warnings.length - 4} more, listed in the panel</li> : null}
            </ul>
          </div>
        ) : null}
        <AreaField label="Reason for this version" rows={2} value={reason} onChange={setReason} placeholder="What changed and why. It is kept in the version history." hint={missing ? <span className="text-risk">A reason is needed so the history says why.</span> : undefined} />
      </div>
    </Modal>
  );
}

export function ArchiveDialog({ workflow, onConfirm, onClose }: { workflow: Workflow; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open onClose={onClose} size="sm" title="Archive this workflow?" subtitle={workflow.name} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => onConfirm(reason.trim() || "Archived")}>Archive</Button></>}>
      <div className="flex flex-col gap-4 text-sm text-ink2">
        <p className="m-0">An archived workflow is retired: new cases no longer use it. Cases already in progress keep it. It stays in the version history and can be duplicated into a new draft.</p>
        <AreaField label="Reason (optional)" rows={2} value={reason} onChange={setReason} placeholder="For example: replaced by the 2027 workflow." />
      </div>
    </Modal>
  );
}

export function LeaveDialog({ name, onSave, onDiscard, onStay }: { name: string; onSave: () => void; onDiscard: () => void; onStay: () => void }) {
  return (
    <Modal open onClose={onStay} size="sm" title="Leave without saving?" subtitle={name} footer={<><Button onClick={onStay}>Stay</Button><Button variant="danger" onClick={onDiscard}>Leave without saving</Button><Button variant="primary" onClick={onSave}>Save draft and leave</Button></>}>
      <p className="m-0 text-sm text-ink2">You changed this workflow and have not saved it. Changes are kept in this browser only once you save the draft.</p>
    </Modal>
  );
}
