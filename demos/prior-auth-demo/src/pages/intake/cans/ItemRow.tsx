import { useState } from "react";
import { Pill, TextArea, TextInput } from "@/components/ui";
import type { CansAssessment, CansItem, IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName, SourceLink } from "../shared/provenance";
import { itemStatus } from "./cansState";

/** One placeholder item: a blank prompt, the assessor's own rating label and note, the evidence tied to it with its sources, its status, and who set it and when.
    There is no scale and no anchor: the label is whatever the assessor types, and nothing is computed from it. */
export function ItemRow({ record, cans, item, pendingForItem }: { record: IntakeRecord; cans: CansAssessment; item: CansItem; pendingForItem: number }) {
  const set = useStore((s) => s.setCansItem);
  const locked = cans.status === "signed";
  const [resp, setResp] = useState(item.response ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [seen, setSeen] = useState({ r: item.response ?? "", n: item.note ?? "" });
  /* A change that came from the store (a carried-forward record, an amendment) replaces what is typed here. */
  if (seen.r !== (item.response ?? "") || seen.n !== (item.note ?? "")) {
    setSeen({ r: item.response ?? "", n: item.note ?? "" });
    setResp(item.response ?? "");
    setNote(item.note ?? "");
  }
  const status = itemStatus(item, pendingForItem, locked);
  const evidence = cans.evidence.filter((e) => e.itemId === item.id);
  return (
    <div id={`cans-item-${item.id}`} data-cans-item={item.id} className="border-b border-line py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{item.name}</p>
          <p className="text-[12px] text-muted">Placeholder prompt · no official wording, no scale</p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div>
          <label htmlFor={`rating-${item.id}`} className="mb-1 block text-[12px] font-medium text-ink2">Rating label (you type it)</label>
          <TextInput
            id={`rating-${item.id}`} value={resp} disabled={locked} placeholder="Your own label" maxLength={60}
            onChange={(e) => setResp(e.target.value)} onBlur={() => set(record.id, item.id, { response: resp })} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          />
        </div>
        <div>
          <label htmlFor={`note-${item.id}`} className="mb-1 block text-[12px] font-medium text-ink2">Note</label>
          <TextArea id={`note-${item.id}`} rows={2} value={note} disabled={locked} className="min-h-[38px] py-2" placeholder="In the assessor's words" onChange={(e) => setNote(e.target.value)} onBlur={() => set(record.id, item.id, { note })} />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {evidence.length ? (
          evidence.map((e) => (
            <p key={e.id} className="text-[12px] text-ink2">
              <span className="font-semibold text-ink">Evidence:</span> {e.text} <SourceLink record={record} source={e.source} className="ml-1" />
            </p>
          ))
        ) : (
          <p className="text-[12px] text-muted">No evidence tied to this item.</p>
        )}
        {item.reviewer && item.reviewedAt !== undefined ? <p className="text-[12px] text-muted">Reviewer {actorName(item.reviewer)} · {stamp(item.reviewedAt)}</p> : null}
      </div>
    </div>
  );
}
