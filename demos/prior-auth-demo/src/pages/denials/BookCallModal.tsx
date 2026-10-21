import { useState } from "react";
import { AgentChip, Button, ChoiceCard, Modal } from "@/components/ui";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { slotsFor } from "./lib/slots";
import type { DenialView } from "./lib/useDenialView";

/** Confirm gate for the peer-to-peer route: pick one of three call windows, then Cadence books it. Mounted only while open. */
export function BookCallModal({ view, onClose, onBooked }: { view: DenialView; onClose: () => void; onBooked: () => void }) {
  const { req, analysis, work } = view;
  const slots = slotsFor(req.clockSub === "peer-to-peer window" ? req.deadlineAt : undefined);
  const [slotId, setSlotId] = useState(work.slot?.id ?? slots[0]?.id);
  const bookCall = useStore((s) => s.bookCall);
  const chosen = slots.find((s) => s.id === slotId);
  const confirm = () => {
    if (!chosen) return;
    bookCall(req.id, chosen);
    onBooked();
  };
  return (
    <Modal open onClose={onClose} title="Confirm the next step: peer-to-peer call" subtitle="The agents stop here until you say go." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!chosen} onClick={confirm}>Confirm and book the call</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-tile px-4 py-3.5 text-sm">
          <div className="mb-2 font-semibold">What happens when you confirm</div>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center gap-2"><AgentChip agent="cadence" />books the window with {payerById(req.payerId).shortName} and adds it to the clinician's calendar</li>
            <li className="flex items-center gap-2"><AgentChip agent="advocate" />finishes the brief with three points and the likely pushback</li>
            <li className="flex items-center gap-2"><AgentChip agent="integrity" />checks every sentence against the chart</li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink2">Pick a time. Chance of overturning is {analysis.options[0].chance?.value}% (likely {analysis.options[0].chance?.low}–{analysis.options[0].chance?.high}%).</div>
          {slots.length ? (
            <div role="radiogroup" aria-label="Call time" className="flex flex-col gap-2.5">
              {slots.map((s) => (
                <ChoiceCard key={s.id} selected={slotId === s.id} onClick={() => setSlotId(s.id)} title={s.label}>{work.slot?.id === s.id ? "Booked now" : "Open with the payer's reviewer"}</ChoiceCard>
              ))}
            </div>
          ) : (
            <p className="text-sm text-risk">No call time is left inside the payer's window. Choose a written appeal instead.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
