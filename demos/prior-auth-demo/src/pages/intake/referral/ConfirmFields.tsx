import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { specOf } from "@/data/intake/fields";
import { riskSentences } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { REFERRAL_STATE_LABEL } from "./labels";
import { unconfirmed } from "./missing";

type Key = ReturnType<typeof unconfirmed>[number];

/** What "Confirm all high-confidence" would take: values read straight from the source with high confidence and no conflict. AI suggested values, values
    that need confirmation, conflicts and risk language are never in it; they stay for one-by-one review. */
export function splitConfirm(r: IntakeRecord): { take: Key[]; left: Key[] } {
  const take: Key[] = [];
  const left: Key[] = [];
  for (const k of unconfirmed(r)) {
    const fv = r[k.section][k.key];
    const direct = fv.state === "document_extracted" || fv.state === "patient_reported";
    if (direct && fv.confidence === "high" && !fv.conflict && !riskSentences(fv.value).length) take.push(k);
    else left.push(k);
  }
  return { take, left };
}

export function ConfirmFields({ record, disabled }: { record: IntakeRecord; disabled?: boolean }) {
  const confirm = useStore((s) => s.confirmIntakeReferralFields);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const { take, left } = useMemo(() => splitConfirm(record), [record]);
  return (
    <>
      <Button size="sm" icon={CheckCheck} onClick={() => setOpen(true)} disabled={disabled || !take.length} data-confirm-all>Confirm all high-confidence ({take.length})</Button>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          size="lg"
          title={`Confirm ${take.length} values?`}
          subtitle="Each value is saved as Verified with you as the reviewer. Check the list first."
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  confirm(record.id, take);
                  toast({ title: `Confirmed ${take.length} values`, body: left.length ? `Still to confirm one by one: ${left.length}.` : undefined, tone: "good" });
                  setOpen(false);
                }}
                data-confirm-all-go
              >
                Confirm these {take.length}
              </Button>
            </>
          }
        >
          <ul className="divide-y divide-line rounded-xl border border-line">
            {take.map((k) => {
              const fv = record[k.section][k.key];
              return (
                <li key={`${k.section}.${k.key}`} className="px-3.5 py-2.5">
                  <div className="text-[12px] text-muted">{specOf(k.key)?.label ?? k.key} · {REFERRAL_STATE_LABEL[fv.state]}{fv.source ? ` · ${fv.source.ref}` : ""}</div>
                  <div className="text-[14px] break-words">{fv.value}</div>
                </li>
              );
            })}
          </ul>
          {left.length ? <p className="mt-3 text-[13px] text-ink2">Not included, to confirm one by one: {left.length} (AI suggested, needs confirmation, a conflict, or below high confidence).</p> : null}
        </Modal>
      ) : null}
    </>
  );
}
