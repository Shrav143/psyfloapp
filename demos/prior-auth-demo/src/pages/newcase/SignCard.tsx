import { useEffect, useState } from "react";
import { PenLine, Undo2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Dropdown, Field, Modal, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { useStore } from "@/store";
import type { IntegrityCheck } from "./checks";

export type Signer = "jordan" | "rivera";
export const SIGNERS: Record<Signer, { name: string; role: string; clinician: boolean }> = {
  jordan: { name: "Jordan Perez", role: "UR coordinator", clinician: false },
  rivera: { name: "Dr. Rivera", role: "clinician", clinician: true },
};
const ATTEST = "I reviewed this summary and it reflects the record. The level of care is my clinical judgment.";
const QUICK = ["Say more about the risk at home", "Shorten the clinical picture", "Mention the lower levels of care that were tried"];

/** The sign-off gate: only a clinician signs. Needs the attestation, and an acknowledgement when a check warns. */
export function SignCard({ draft, checks, chance, backSignal, onSign }: { draft: CaseDraft; checks: IntegrityCheck[]; chance: number; /** Counts up when "What is missing" asks to send the draft back to Scribe. */ backSignal: number; onSign: (signedBy: string) => void }) {
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
  const warns = checks.filter((c) => c.state === "warn");
  const blocked = checks.some((c) => c.state === "block" || c.state === "checking");
  const canSign = who.clinician && attest && !blocked && (warns.length === 0 || ack);

  return (
    <>
      <Card className="border-good-edge">
        <CardHeader title="Sign" subtitle={`${who.name}, ${who.role} · approval chance ${chance}%`} />
        <CardBody className="flex flex-col gap-3.5">
          <Field label="Signing as">
            <Dropdown<Signer> variant="field" value={signer} onChange={setSigner} options={(Object.keys(SIGNERS) as Signer[]).map((k) => ({ value: k, label: `${SIGNERS[k].name} (${SIGNERS[k].role})` }))} menuWidth={300} ariaLabel="Signing as" />
          </Field>
          {!who.clinician ? <p className="-mt-1 text-[13px] text-muted">{who.name} is a UR coordinator. Only a licensed clinician can sign, so switch to Dr. Rivera.</p> : null}
          {warns.length ? <Checkbox checked={ack} onChange={setAck} label={`I reviewed ${warns.length === 1 ? "the warning" : "the warnings"} under What is missing and want to sign anyway.`} className="items-start" /> : null}
          <Checkbox checked={attest} onChange={setAttest} label={ATTEST} className="items-start" />
          <Button variant="primary" size="lg" icon={PenLine} disabled={!canSign} onClick={() => setConfirm(true)}>
            Sign and send to payer
          </Button>
          <Button icon={Undo2} onClick={() => setBack(true)}>
            Send back to Scribe
          </Button>
          <p className="text-xs text-muted">After you sign, Navigator files it, Caller confirms receipt, and Cadence books the first review.</p>
        </CardBody>
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Sign and send to payer?"
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
              Sign and send to payer
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted">Patient</dt>
          <dd className="font-medium">{draft.patient.initials}, {draft.patient.age}</dd>
          <dt className="text-muted">Payer</dt>
          <dd className="font-medium">{payer?.name}</dd>
          <dt className="text-muted">Level of care</dt>
          <dd className="font-medium">{draft.levelLabel ?? (draft.program ? PROGRAM_LABEL[draft.program] : "")} · {draft.type}</dd>
          <dt className="text-muted">Approval chance</dt>
          <dd className="font-medium">{chance}%</dd>
          <dt className="text-muted">Attachments</dt>
          <dd className="font-medium">{draft.documents.length} documents</dd>
        </dl>
        <p className="mt-4 text-sm text-ink2">Navigator sends this to {payer?.shortName} through its portal and saves the receipt to the case. Nothing was sent before this.</p>
      </Modal>

      <Modal
        open={back}
        onClose={() => setBack(false)}
        title="Send back to Scribe"
        subtitle="Scribe, Integrity, Packet and Scrubber run again with your note. It takes a few seconds."
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
        <Field label="What should Scribe change?" hint="Optional. Your note is added to the plan section.">
          <TextArea aria-label="What should Scribe change?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: say more about the risk at home" />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setNote(q)} className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-medium text-neutral-ink hover:bg-[#EADFD0]">
              {q}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
