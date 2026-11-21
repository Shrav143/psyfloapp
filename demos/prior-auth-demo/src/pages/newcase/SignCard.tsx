import { useEffect, useState } from "react";
import { PenLine, Undo2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Dropdown, Field, Modal, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { NOT_ENOUGH_CASES } from "@/data/programTables";
import { PROGRAM_LABEL } from "@/data/types";
import { useStore } from "@/store";
import { authType } from "./authType";
import type { IntegrityCheck } from "./checks";
import type { MissingItem } from "./missing";

export type Signer = "jordan" | "rivera";
export const SIGNERS: Record<Signer, { name: string; role: string; clinician: boolean }> = {
  jordan: { name: "Jordan Perez", role: "UR coordinator", clinician: false },
  rivera: { name: "Dr. Rivera", role: "clinician", clinician: true },
};
const ATTEST = "I reviewed this summary and it reflects the record. The level of care is my clinical judgment.";
const QUICK = ["Say more about the risk at home", "Shorten the clinical picture", "Mention the lower levels of care that were tried"];

/** The sign-off gate: only a clinician signs. Needs the attestation, an acknowledgement when something warns, and nothing blocking (no patient, payer, service or dates;
    coverage confirmed inactive with no documented exception; an unanswered duplicate). The send is simulated in the demo and says so. */
export function SignCard({ draft, checks, missing, chance, ready, backSignal, onSign }: {
  draft: CaseDraft;
  checks: IntegrityCheck[];
  /** What is missing, so the card knows what blocks and what needs an acknowledgement. */
  missing: MissingItem[];
  /** Null for a Virginia service: no similar decisions to rest a chance on. */
  chance: number | null;
  /** The agents finished, so there is something to sign. */
  ready: boolean;
  /** Counts up when "What is missing" asks to send the draft back to Scribe. */
  backSignal: number;
  onSign: (signedBy: string) => void;
}) {
  const rerun = useStore((s) => s.rerunFromScribe);
  const toast = useStore((s) => s.toast);
  const [signer, setSigner] = useState<Signer>("jordan");
  const [attest, setAttest] = useState(false);
  const [ack, setAck] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [back, setBack] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (backSignal > 0) setBack(true);
  }, [backSignal]);
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const who = SIGNERS[signer];
  const blocking = missing.filter((m) => m.severity === "block");
  const warns = missing.filter((m) => m.severity === "ack").length;
  const rechecking = checks.some((c) => c.state === "checking");
  const canSign = ready && who.clinician && attest && blocking.length === 0 && !rechecking && (warns === 0 || ack);
  const why = !ready ? "After the agents finish" : blocking.length ? `Fix first: ${blocking.map((b) => b.label.toLowerCase()).join(", ")}` : !who.clinician ? "Only a clinician signs. Switch to Dr. Rivera." : null;

  return (
    <>
      <Card className="border-good-edge">
        <CardHeader title="Sign" />
        <CardBody className="flex flex-col gap-3">
          <Field label="Signing as">
            <Dropdown<Signer> variant="field" value={signer} onChange={setSigner} options={(Object.keys(SIGNERS) as Signer[]).map((k) => ({ value: k, label: `${SIGNERS[k].name} (${SIGNERS[k].role})` }))} menuWidth={300} ariaLabel="Signing as" />
          </Field>
          {why ? <p role="status" className="-mt-1 text-[13px] text-muted">{why}</p> : null}
          {warns > 0 ? <Checkbox checked={ack} onChange={setAck} label={`I reviewed ${warns === 1 ? "the warning" : "the warnings"} under What is missing and want to sign anyway.`} className="items-start" /> : null}
          <Checkbox checked={attest} onChange={setAttest} label={ATTEST} className="items-start" />
          <Button variant="primary" size="lg" icon={PenLine} disabled={!canSign} onClick={() => setConfirm(true)}>
            Sign and send to payer (demo)
          </Button>
          <Button icon={Undo2} disabled={!ready} onClick={() => setBack(true)}>
            Send back to Scribe
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Sign and send to payer (demo)?"
        subtitle={`Signing as ${who.name}, ${who.role}`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon={PenLine}
              onClick={() => {
                setConfirm(false);
                onSign(`${who.name} (${who.role})`);
              }}
            >
              Sign and send to payer (demo)
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted">Patient</dt>
          <dd className="font-medium">{draft.patient.initials}, {draft.patient.age}</dd>
          <dt className="text-muted">Payer</dt>
          <dd className="font-medium">{payer?.name}</dd>
          <dt className="text-muted">Request</dt>
          <dd className="font-medium">{authType(draft.kind).label} · {draft.type}</dd>
          <dt className="text-muted">Level of care</dt>
          <dd className="font-medium">{draft.levelLabel ?? (draft.program ? PROGRAM_LABEL[draft.program] : "")}</dd>
          {draft.intakeId ? null : (
            <>
              <dt className="text-muted">Approval chance</dt>
              <dd className="font-medium">{chance === null ? NOT_ENOUGH_CASES : `${chance}%`}</dd>
            </>
          )}
          <dt className="text-muted">Attachments</dt>
          <dd className="font-medium">{draft.documents.length} documents</dd>
        </dl>
        <p className="mt-4 text-[13px] text-muted">Demo: the send is simulated.</p>
      </Modal>

      <Modal
        open={back}
        onClose={() => setBack(false)}
        title="Send back to Scribe"
        footer={
          <>
            <Button onClick={() => setBack(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon={Undo2}
              onClick={() => {
                rerun(draft.id, note);
                setBack(false);
                setNote("");
                setAttest(false);
                setAck(false);
                toast({ title: "Sent back to Scribe", body: "The agents are re-drafting. You will see the new draft in a moment.", tone: "neutral" });
              }}
            >
              Send back
            </Button>
          </>
        }
      >
        <Field label="What should Scribe change?">
          <TextArea aria-label="What should Scribe change?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: say more about the risk at home" />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setNote(q)} className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-medium text-neutral-ink hover:bg-[#E8E5DF]">
              {q}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
