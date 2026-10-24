import { useEffect, useRef, type ReactNode } from "react";
import { Button, Field, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { DiagnosisPicker } from "./DiagnosisPicker";
import type { FieldId } from "./recordsModel";

/** The editor that opens under a row. It focuses its first control, closes on Done, and Esc closes it from a text box. */
export function Frame({ onClose, done = true, children }: { onClose: () => void; done?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, []);
  return (
    <div
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape" && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) onClose();
      }}
      className="flex flex-col gap-3.5 rounded-2xl border border-tile-edge bg-tile p-4"
    >
      {children}
      {done ? (
        <div>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Every field is edited here and written straight to the draft, so there is nothing to save. */
export function FieldEditor({ id, draft, close }: { id: FieldId; draft: CaseDraft; close: () => void }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const edit = (p: Partial<CaseDraft>) => patch(draft.id, p);

  switch (id) {
    case "diagnoses":
      return (
        <Frame onClose={close}>
          <DiagnosisPicker value={draft.diagnoses} onChange={(diagnoses) => edit({ diagnoses })} />
        </Frame>
      );
    case "reason":
      return (
        <Frame onClose={close}>
          <Field label="Reason for the request">
            <TextArea value={draft.reason} placeholder="What changed, and why this level of care" onChange={(e) => edit({ reason: e.target.value })} />
          </Field>
        </Frame>
      );
  }
}
