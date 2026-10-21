import { useEffect, useRef, useState } from "react";
import { Hash, Paperclip } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Dropdown, Field, FileDrop, Pill, Spinner, TextInput, type DemoFile } from "@/components/ui";
import { maskMember, PLAN_TYPE, PLAN_TYPES, type CaseDraft } from "@/data/cases";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { useStore } from "@/store";

export const SAMPLE_INSURANCE_CARD = "Insurance card (Summit Medicaid HMO).jpg";
const READ_MS = 1100;

/** The payer, plan and member ID. A card can fill them in; every field stays editable. */
export function InsuranceCard({ draft }: { draft: CaseDraft }) {
  const edit = useStore((s) => s.patchCaseDraft);
  const [reading, setReading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const read = (files: DemoFile[]) => {
    const name = files[0]?.name ?? SAMPLE_INSURANCE_CARD;
    setReading(true);
    timer.current = setTimeout(() => {
      const matched = PAYERS.find((p) => name.toLowerCase().includes(p.shortName.toLowerCase()))?.id;
      const payerId: PayerId = draft.payerId ?? matched ?? "summit";
      edit(draft.id, { payerId, planType: PLAN_TYPE[payerId], memberId: draft.memberId || "SM7403964821", cardRead: true });
      setReading(false);
    }, READ_MS);
  };

  return (
    <Card>
      <CardHeader title="Insurance" subtitle="Filled in from the insurance card, all editable" right={draft.cardRead ? <Pill tone="neutral">Read from card</Pill> : null} />
      <CardBody className="flex flex-col gap-4">
        {reading ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-good-edge bg-[#F3F7F4] px-4 py-3.5 text-sm font-medium">
            <Spinner />
            Reader is reading the card
          </div>
        ) : draft.cardRead ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-good-edge bg-[#F3F7F4] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Card read just now</div>
              <div className="text-[13px] text-muted">Carrier, plan type and member ID are filled in below</div>
            </div>
            <Button size="sm" icon={Paperclip} onClick={() => edit(draft.id, { cardRead: false })}>
              Replace
            </Button>
          </div>
        ) : (
          <FileDrop onFiles={read} sampleName={SAMPLE_INSURANCE_CARD} hint="Drag and drop the insurance card, or click to select a file" />
        )}
        <Field label="Insurance carrier" required>
          <Dropdown<PayerId | ""> variant="field" value={draft.payerId ?? ""} placeholder="Choose a payer" onChange={(v) => v && edit(draft.id, { payerId: v, planType: PLAN_TYPE[v] })} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Insurance carrier" />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Plan type">
            <Dropdown<string> variant="field" value={draft.planType} placeholder="Plan type" onChange={(v) => edit(draft.id, { planType: v })} options={PLAN_TYPES.map((p) => ({ value: p, label: p }))} ariaLabel="Plan type" />
          </Field>
          <Field label="State">
            <Dropdown<string> variant="field" value="Ohio" onChange={() => undefined} options={[{ value: "Ohio", label: "Ohio" }]} ariaLabel="State" />
          </Field>
        </div>
        <Field label="Member ID (removed before analysis)" hint={draft.memberId ? `Agents see ${maskMember(draft.memberId)} only` : undefined}>
          <TextInput aria-label="Member ID" icon={Hash} value={draft.memberId} placeholder="ABC123456789" onChange={(e) => edit(draft.id, { memberId: e.target.value })} />
        </Field>
      </CardBody>
    </Card>
  );
}
