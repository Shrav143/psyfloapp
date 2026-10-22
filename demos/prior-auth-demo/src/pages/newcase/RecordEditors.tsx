import { useEffect, useRef, type ReactNode } from "react";
import { Hash } from "lucide-react";
import { Button, Dropdown, Field, TextArea, TextInput } from "@/components/ui";
import { maskMember, planTypeOf, PLAN_TYPES, type CaseDraft } from "@/data/cases";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program, type RequestType } from "@/data/types";
import { useStore } from "@/store";
import { authType } from "./authType";
import { DatesFields } from "./DatesFields";
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
    case "patient":
      return (
        <Frame onClose={close}>
          <div className="grid grid-cols-[1fr_120px] gap-3.5">
            <Field label="Patient initials" hint="Initials and age only. A name never enters the app.">
              <TextInput value={draft.patient.initials} maxLength={8} placeholder="J.M." onChange={(e) => edit({ patient: { ...draft.patient, initials: e.target.value.toUpperCase() } })} />
            </Field>
            <Field label="Age">
              <TextInput type="number" min={1} max={110} value={draft.patient.age ?? ""} placeholder="34" onChange={(e) => edit({ patient: { ...draft.patient, age: e.target.value ? Number(e.target.value) : null } })} />
            </Field>
          </div>
        </Frame>
      );
    case "payer":
      return (
        <Frame onClose={close}>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Payer">
              <Dropdown<PayerId | ""> variant="field" value={draft.payerId ?? ""} placeholder="Choose a payer" ariaLabel="Payer" onChange={(v) => v && edit({ payerId: v, planType: planTypeOf(v) })} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
            <Field label="Plan type">
              <Dropdown<string> variant="field" value={draft.planType} placeholder="Plan type" ariaLabel="Plan type" onChange={(v) => edit({ planType: v })} options={PLAN_TYPES.map((p) => ({ value: p, label: p }))} />
            </Field>
          </div>
        </Frame>
      );
    case "member":
      return (
        <Frame onClose={close}>
          <Field label="Member ID" hint={draft.memberId ? `Agents see ${maskMember(draft.memberId)} only. The full ID is removed before any agent reads the chart.` : "The full ID is removed before any agent reads the chart."}>
            <TextInput icon={Hash} value={draft.memberId} placeholder="ABC123456789" onChange={(e) => edit({ memberId: e.target.value })} />
          </Field>
        </Frame>
      );
    case "program":
      return (
        <Frame onClose={close} done={false}>
          <Field label="Level of care">
            <Dropdown<Program | ""> variant="field" value={draft.program ?? ""} placeholder="Choose a level of care" ariaLabel="Level of care" onChange={(v) => { if (v) { edit({ program: v, levelLabel: undefined }); close(); } }} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} />
          </Field>
        </Frame>
      );
    case "type":
      return (
        <Frame onClose={close} done={false}>
          <Field label="Request type">
            <Dropdown<RequestType | ""> variant="field" value={draft.type ?? ""} placeholder="Choose a type" ariaLabel="Request type" onChange={(v) => { if (v) { edit({ type: v, what: undefined }); close(); } }} options={authType(draft.kind).types.map((t) => ({ value: t, label: t }))} />
          </Field>
        </Frame>
      );
    case "start":
      return (
        <Frame onClose={close}>
          <DatesFields draft={draft} from={draft.kind === "retro" ? "First date of service" : "Requested start date"} to={draft.kind === "retro" ? "Last date of service" : "Requested end date"} />
        </Frame>
      );
    case "diagnoses":
      return (
        <Frame onClose={close}>
          <DiagnosisPicker value={draft.diagnoses} onChange={(diagnoses) => edit({ diagnoses })} />
        </Frame>
      );
    case "reason":
      return (
        <Frame onClose={close}>
          <Field label="Reason for the request" hint="One or two plain sentences. Scribe uses it in the summary.">
            <TextArea value={draft.reason} placeholder="What changed, and why this level of care" onChange={(e) => edit({ reason: e.target.value })} />
          </Field>
        </Frame>
      );
  }
}
