import { locate, type FieldKey, type Referral, type ReferralDoc } from "@/data/referrals";
import { plural } from "@/lib/format";
import { useStore } from "@/store";
import { FieldRow } from "./FieldRow";

/** Everything Reader pulled out of the documents. Click a row to see its evidence in the document. */
export function ExtractedTab({ r, docs, selected, onSelect }: { r: Referral; docs: ReferralDoc[]; selected: string | null; onSelect: (key: FieldKey) => void }) {
  const edit = useStore((s) => s.editReferralField);
  const edited = r.fields.filter((f) => f.edited).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Reader read {plural(r.plan.pages + 1, "page")} and found {r.fields.length} fields. Click a field to see the evidence in the document{edited ? `. ${edited} ${edited === 1 ? "field was" : "fields were"} edited by you` : ""}.
        {r.fields.some((f) => f.value.startsWith("Not found")) ? <b className="font-semibold text-mid-ink"> Reader could not find every field. Add them by hand with the pencil, or ask the referrer.</b> : null}
      </p>
      {r.fields.map((f) => (
        <FieldRow key={f.key} field={f} evidence={locate(docs, f.key)} selected={selected === f.key} onSelect={() => onSelect(f.key)} onSave={(v) => edit(r.id, f.key, v)} />
      ))}
    </div>
  );
}
