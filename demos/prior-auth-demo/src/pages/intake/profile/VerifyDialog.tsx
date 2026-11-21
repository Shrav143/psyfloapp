import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button, Checkbox, Field, Modal, Segmented, TextInput } from "@/components/ui";
import type { EligibilityDetermination, IntakeRecord, StaffVerification } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { useStore } from "@/store";

export const DETERMINATION_LABEL: Record<EligibilityDetermination, string> = {
  member: "Member eligibility",
  benefit: "Benefit coverage for the requested service",
  network: "Network participation",
  authorization: "Authorization requirement",
};
const ORDER: EligibilityDetermination[] = ["member", "benefit", "network", "authorization"];

/** A person confirms the simulated response with the plan. Only what they tick becomes "verified by staff"; medical necessity is never on the list. */
export function VerifyDialog({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const mark = useStore((s) => s.markEligibilityVerified);
  const plan = vaPlanOf(record.eligibility.payerId ?? record.payerId ?? "");
  const already = record.eligibility.verified ?? {};
  const [items, setItems] = useState<EligibilityDetermination[]>(ORDER.filter((k) => !already[k]));
  const [method, setMethod] = useState<StaffVerification["method"]>("phone");
  const [ref, setRef] = useState("");
  const who = plan ? (plan.coverage === "ffs" ? "Virginia Medicaid (DMAS MES portal or provider helpline)" : `${plan.name} provider services`) : "the plan";
  return (
    <Modal
      open
      onClose={onClose}
      title="Mark verified with the plan"
      subtitle={`After you call or check ${who}. Your name and the time are recorded.`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={BadgeCheck} disabled={!items.length} onClick={() => { mark(record.id, items, method, ref); onClose(); }}>
            Mark {items.length} verified
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink2">How you confirmed it</div>
          <Segmented items={[{ id: "phone", label: "Phone call" }, { id: "portal", label: "Plan portal" }]} value={method} onChange={setMethod} />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink2">What the plan confirmed</div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {ORDER.map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                <Checkbox checked={items.includes(k)} onChange={(v) => setItems((p) => (v ? [...p, k] : p.filter((x) => x !== k)))} label={<span className="text-[13px]">{DETERMINATION_LABEL[k]}</span>} />
                {already[k] ? <span className="text-[12px] text-good-ink">Already verified</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">Medical necessity is not verified here. Clinical review and the payer decide it.</p>
        </div>
        <Field label="Call or portal reference" hint="Optional. The reference number the plan gave.">
          <TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="For example 2026-1020-118" />
        </Field>
      </div>
    </Modal>
  );
}
