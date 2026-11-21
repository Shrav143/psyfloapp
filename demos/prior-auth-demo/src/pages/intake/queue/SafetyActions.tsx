import { useState } from "react";
import { Ambulance, LifeBuoy, PhoneCall, Stethoscope, type LucideIcon } from "lucide-react";
import { Button, Field, Modal, TextArea } from "@/components/ui";
import type { IntakeRecord, SafetyAlert } from "@/data/intake/types";
import { useStore } from "@/store";
import { SignOffDialog } from "../shared/SignOff";

export type Escalation = Exclude<NonNullable<SafetyAlert["action"]>, "documented">;

/** The escalation steps any staff member can take at once. The demo places no calls: it records that a person did. */
export const ESCALATIONS: { id: Escalation; label: string; done: string; icon: LucideIcon; confirm: string }[] = [
  { id: "clinician_now", label: "Clinician reviewing now", done: "Clinician reviewing now", icon: Stethoscope, confirm: "Record that a clinician is reviewing this person's safety now. The alert stays open until a clinician documents the review." },
  { id: "mobile_crisis", label: "Contact mobile crisis", done: "Mobile crisis contacted", icon: Ambulance, confirm: "Call the regional mobile crisis team, then record it here. The demo places no call." },
  { id: "crisis_line_988", label: "Connect to 988", done: "Connected to the 988 Suicide and Crisis Lifeline", icon: LifeBuoy, confirm: "Connect the person to the 988 Suicide and Crisis Lifeline (call or text 988), then record it here. The demo places no call." },
  { id: "emergency_911", label: "Call 911", done: "911 called", icon: PhoneCall, confirm: "If anyone is in immediate danger, call 911 now, then record it here. The demo places no call." },
];
export const ACTION_DONE: Record<NonNullable<SafetyAlert["action"]>, string> = {
  ...Object.fromEntries(ESCALATIONS.map((e) => [e.id, e.done])) as Record<Escalation, string>,
  documented: "Reviewed and documented",
};

/** One escalation button with its confirm and note. */
export function EscalateButton({ record, action, size = "md" }: { record: IntakeRecord; action: (typeof ESCALATIONS)[number]; size?: "sm" | "md" }) {
  const resolve = useStore((s) => s.resolveSafety);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const confirm = () => {
    resolve(record.id, action.id, note.trim() || undefined);
    toast({ title: `Recorded: ${action.done}`, body: action.id === "clinician_now" ? "Saved to the audit trail. The alert stays open until the review is documented." : "Saved to the audit trail. No call was placed by the demo.", tone: "neutral" });
    setOpen(false);
    setNote("");
  };
  return (
    <>
      <Button size={size} variant={action.id === "emergency_911" ? "danger" : "outline"} icon={action.icon} onClick={() => setOpen(true)} data-escalate={action.id}>{action.label}</Button>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          size="sm"
          title={action.label}
          subtitle={`${record.id} · ${record.initials || "No name yet"}`}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant={action.id === "emergency_911" ? "danger" : "primary"} onClick={confirm}>Confirm and record</Button>
            </>
          }
        >
          <p className="text-[14px]">{action.confirm}</p>
          <Field label="Note" className="mt-3" hint="Who you spoke with, what happened, what comes next.">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </Field>
        </Modal>
      ) : null}
    </>
  );
}

/** Closing the alert as reviewed is a clinician's step: a note, then the sign-off gate. */
export function CloseReviewButton({ record }: { record: IntakeRecord }) {
  const close = useStore((s) => s.closeSafetyReview);
  const toast = useStore((s) => s.toast);
  const [step, setStep] = useState<"idle" | "note" | "sign">("idle");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setStep("note")} data-close-safety>Close as reviewed</Button>
      {step === "note" ? (
        <Modal
          open
          onClose={() => setStep("idle")}
          title="Document the safety review"
          subtitle="A qualified clinician closes a safety alert. Psyflo does not decide that a person is safe."
          footer={
            <>
              <Button onClick={() => setStep("idle")}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setTried(true);
                  if (note.trim()) setStep("sign");
                }}
              >
                Continue to sign-off
              </Button>
            </>
          }
        >
          <Field label="Clinician's review" required error={tried && !note.trim() ? "Write what was reviewed and the plan." : undefined}>
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Who reviewed, with whom, what was found, the plan and follow-up." />
          </Field>
        </Modal>
      ) : null}
      <SignOffDialog
        open={step === "sign"}
        onClose={() => setStep("idle")}
        record={record}
        title="Close the safety alert as reviewed"
        attestation="I reviewed this safety concern myself and documented my clinical judgment and plan. Psyflo did not decide that this person is safe."
        signLabel="Sign and close"
        onSign={(signer) => {
          close(record.id, signer.id, note.trim());
          toast({ title: "Safety alert closed", body: `Reviewed by ${signer.name}.`, tone: "good" });
          setNote("");
          setTried(false);
        }}
      />
    </>
  );
}
