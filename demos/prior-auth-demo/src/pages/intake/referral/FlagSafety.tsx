import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button, Dropdown, Field, Modal, TextArea } from "@/components/ui";
import type { IntakeRecord, SourceRef } from "@/data/intake/types";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";

/** Any staff member can raise a safety concern at once. It alerts the site's clinician and puts the risk banner on the record. */
export function FlagSafety({ record }: { record: IntakeRecord }) {
  const me = useStore((s) => meOf(s));
  const raise = useStore((s) => s.raiseSafety);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [where, setWhere] = useState("call");
  const [tried, setTried] = useState(false);
  if (record.safety?.status === "open") {
    return (
      <Button size="sm" variant="danger" icon={ShieldAlert} onClick={() => {
          const el = document.getElementById("safety-alert");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus({ preventScroll: true });
        }}>
        Safety alert open
      </Button>
    );
  }
  const sources = [
    { value: "call", label: "Phone call" },
    { value: "person", label: "In person" },
    ...record.documents.map((d) => ({ value: d.id, label: d.name })),
  ];
  const submit = () => {
    setTried(true);
    if (!text.trim()) return;
    const doc = record.documents.find((d) => d.id === where);
    const source: SourceRef = doc ? { kind: "document", ref: doc.name, docId: doc.id } : { kind: "staff", ref: where === "call" ? "Phone call, reported by staff" : "In person, reported by staff" };
    raise(record.id, { raisedBy: me, text: text.trim(), source });
    toast({ title: "Safety alert raised", body: "The site's clinician was notified. Use the escalation steps on the banner if anyone is in danger now.", tone: "risk" });
    setOpen(false);
    setText("");
    setTried(false);
  };
  return (
    <>
      <Button size="sm" variant="danger" icon={ShieldAlert} onClick={() => setOpen(true)} data-flag-safety>Flag a safety concern</Button>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Flag a safety concern"
          subtitle="This alerts the site's clinician now. It does not decide anything about the person's safety."
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" icon={ShieldAlert} onClick={submit}>Raise the alert</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="What did you see or hear?" required error={tried && !text.trim() ? "Describe the concern in a few words." : undefined}>
              <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="In the person's or the caller's words, where possible." autoFocus />
            </Field>
            <Field label="Where">
              <Dropdown<string> variant="field" ariaLabel="Where the concern came from" value={where} onChange={setWhere} options={sources} menuWidth={360} />
            </Field>
            <p className="text-[13px] text-ink2">If anyone is in immediate danger, call 911. The 988 Suicide and Crisis Lifeline is available by call or text.</p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
