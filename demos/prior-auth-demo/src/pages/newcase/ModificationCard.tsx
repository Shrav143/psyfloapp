import { Card, CardBody, Dropdown, Field, Pill, TextArea, TextInput } from "@/components/ui";
import type { CaseDraft, ChangeKind, ModificationChange } from "@/data/cases";
import { useStore } from "@/store";
import { CHANGE_KINDS, CHANGE_LABEL } from "./authType";

const MORE: ChangeKind[] = ["more_units", "more_days"];

/** What a modification asks for. It is a request, not an approval: the payer has not approved anything, and nothing about the authorization changes until it does. */
export function ModificationCard({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const change: ModificationChange = draft.change ?? { kind: "more_days", amount: null, detail: "" };
  const edit = (p: Partial<ModificationChange>) => patch(draft.id, { change: { ...change, ...p } });
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[18px] font-semibold tracking-tight">Proposed change</h3>
            <p className="mt-0.5 text-[13px] text-muted">Say what should change and why. The payer decides.</p>
          </div>
          <Pill tone="neutral" dot>Payer approval: not yet. This is a request, not an approval.</Pill>
        </div>
        <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2">
          <Field label="What should change">
            <Dropdown<ChangeKind> variant="field" ariaLabel="What should change" value={change.kind} onChange={(kind) => edit({ kind })} options={CHANGE_KINDS.map((k) => ({ value: k, label: CHANGE_LABEL[k] }))} menuWidth={300} />
          </Field>
          {MORE.includes(change.kind) ? (
            <Field label={change.kind === "more_units" ? "How many more units" : "How many more days"}>
              <TextInput type="number" min={1} max={90} value={change.amount ?? ""} onChange={(e) => edit({ amount: e.target.value ? Number(e.target.value) : null })} placeholder="7" />
            </Field>
          ) : null}
        </div>
        <Field label="Why the change is needed" hint="One or two sentences. Scribe uses it in the justification, and only what the chart supports goes in.">
          <TextArea value={change.detail} onChange={(e) => edit({ detail: e.target.value })} placeholder="For example: progress is steady but the home is still not safe, and the step-down bed opens on 11/09" />
        </Field>
      </CardBody>
    </Card>
  );
}
