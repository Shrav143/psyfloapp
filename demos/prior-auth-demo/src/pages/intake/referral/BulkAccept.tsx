import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { SECTION_LABEL, type IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { fieldLabel, referralPending, splitForBulk } from "./logic";

/** "Accept all high-confidence": a confirm that lists exactly what it takes. Conflicts, safety-related items and anything below high
    confidence are never in it; they stay for one-by-one review. */
export function BulkAccept({ record }: { record: IntakeRecord }) {
  const accept = useStore((s) => s.acceptSuggestions);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const split = splitForBulk(record, referralPending(record));
  if (!split.accept.length) return null;
  const left = [
    split.conflicts.length ? `${split.conflicts.length} with a conflict` : null,
    split.safety.length ? `${split.safety.length} safety-related` : null,
    split.lower.length ? `${split.lower.length} below high confidence` : null,
  ].filter(Boolean);
  return (
    <>
      <Button size="sm" icon={CheckCheck} onClick={() => setOpen(true)} data-bulk-accept>Accept all high-confidence ({split.accept.length})</Button>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          size="lg"
          title={`Accept ${split.accept.length} high-confidence suggestions?`}
          subtitle="Each value is saved with you as the reviewer. Check the list first."
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  accept(record.id, split.accept.map((s) => s.id));
                  toast({ title: `Accepted ${split.accept.length} suggestions`, body: left.length ? `Still to review one by one: ${left.join(", ")}.` : undefined, tone: "good" });
                  setOpen(false);
                }}
              >
                Accept these {split.accept.length}
              </Button>
            </>
          }
        >
          <ul className="divide-y divide-line rounded-xl border border-line">
            {split.accept.map((s) => (
              <li key={s.id} className="px-3.5 py-2.5">
                <div className="text-[12px] text-muted">{fieldLabel(s.field)} · {SECTION_LABEL[s.section]} · {s.source.ref}</div>
                <div className="text-[14px]">{s.value}</div>
              </li>
            ))}
          </ul>
          {left.length ? <p className="mt-3 text-[13px] text-ink2">Not included, to review one by one: {left.join(", ")}.</p> : null}
        </Modal>
      ) : null}
    </>
  );
}
