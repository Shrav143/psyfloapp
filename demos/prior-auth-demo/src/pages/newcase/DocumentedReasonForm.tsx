import { useState, type ReactNode } from "react";
import { Undo2 } from "lucide-react";
import { Button, TextArea } from "@/components/ui";
import type { CaseDraft, DocumentedReason } from "@/data/cases";
import { useStore } from "@/store";
import { reasonOf } from "./verificationFor";

/** "Continue with a documented exception": a short reason, kept on the case and written to the request's history. It never traps the person; it only records why they went on. */
export function DocumentedReasonForm({ draft, kind, about, button, prompt, placeholder, extra }: { draft: CaseDraft; kind: DocumentedReason["kind"]; about: string; button: string; prompt: string; placeholder: string; /** Other buttons that sit in the row with this one until the person starts writing. */ extra?: ReactNode }) {
  const say = useStore((s) => s.documentReason);
  const unsay = useStore((s) => s.clearDocumentedReason);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const said = reasonOf(draft, kind);
  const id = `reason-${kind}`;

  if (said) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="min-w-0 flex-1"><b>Documented exception.</b> {said.reason}</span>
        <Button size="sm" variant="ghost" icon={Undo2} onClick={() => unsay(draft.id, kind)}>Undo</Button>
      </div>
    );
  }
  if (!asking) {
    return (
      <div className="flex flex-wrap items-start gap-2.5">
        {extra}
        <Button size="sm" onClick={() => setAsking(true)}>{button}</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-[13px] font-medium">{prompt}</label>
      <TextArea id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} className="min-h-[72px]" />
      <div className="flex gap-2">
        <Button size="sm" variant="primary" disabled={!reason.trim()} onClick={() => { say(draft.id, { kind, reason: reason.trim(), about }); setAsking(false); setReason(""); }}>Document and continue</Button>
        <Button size="sm" onClick={() => setAsking(false)}>Cancel</Button>
      </div>
    </div>
  );
}
