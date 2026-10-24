import { Field, TextInput } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { daysRequested } from "@/data/queue";
import { useStore } from "@/store";
import { datesOfService } from "./verificationFor";

const mdy = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

/** The start and the end of the dates a request covers. The end is optional: left empty, the case asks for the level of care's usual length.
    The dates feed the duplicate check and the verification, which checks coverage for these dates. */
export function DatesFields({ draft, from, to, required }: { draft: CaseDraft; from: string; to: string; /** The end date is needed (dates of service). */ required?: boolean }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const usual = datesOfService(draft);
  const bad = !!draft.endDate && !!draft.startDate && draft.endDate < draft.startDate;
  return (
    <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2">
      <Field label={from} required>
        <TextInput type="date" value={draft.startDate} onChange={(e) => patch(draft.id, { startDate: e.target.value })} />
      </Field>
      <Field
        label={to}
        required={required}
        error={bad ? "The end is before the start." : undefined}
        hint={!required && draft.program && usual && !draft.endDate ? `Empty: the usual ${daysRequested(draft.program)} days, through ${mdy(usual.to)}` : undefined}
      >
        <TextInput type="date" value={draft.endDate ?? ""} min={draft.startDate || undefined} onChange={(e) => patch(draft.id, { endDate: e.target.value || undefined })} />
      </Field>
    </div>
  );
}
