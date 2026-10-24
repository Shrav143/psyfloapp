import { useState } from "react";
import { Button, ChoiceCard, Modal, Pill } from "@/components/ui";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { slotsFor } from "./lib/slots";
import type { DenialView } from "./lib/useDenialView";

/** Confirm gate for the peer-to-peer route: pick one of three call windows, then Cadence books it. Mounted only while open. */
export function BookCallModal({ view, onClose, onBooked }: { view: DenialView; onClose: () => void; onBooked: () => void }) {
  const { req, work } = view;
  const slots = slotsFor(req.clockSub === "peer-to-peer window" ? req.deadlineAt : undefined, view.clock);
  // The time already booked (a seeded one reads like "Wed 10/21, 9–11 am") is still offered only while it is ahead of the demo clock.
  const booked = work.slot ? slots.find((s) => s.id === work.slot?.id) : slots.find((s) => s.label === view.meta.bookedWindow);
  const [slotId, setSlotId] = useState(booked?.id ?? slots[0]?.id);
  const bookCall = useStore((s) => s.bookCall);
  const chosen = slots.find((s) => s.id === slotId);
  const confirm = () => {
    if (!chosen) return;
    bookCall(req.id, chosen);
    onBooked();
  };
  return (
    <Modal open onClose={onClose} title="Confirm the next step: peer-to-peer call" subtitle={`${req.id} · ${payerById(req.payerId).name}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!chosen} onClick={confirm}>Confirm and book the call</Button></>}>
      {slots.length ? (
        <div role="radiogroup" aria-label="Call time" className="flex flex-col gap-2">
          {slots.map((s) => (
            <ChoiceCard key={s.id} selected={slotId === s.id} onClick={() => setSlotId(s.id)} title={s.label} right={booked?.id === s.id ? <Pill>Booked</Pill> : undefined} />
          ))}
        </div>
      ) : (
        <p role="alert" className="text-sm text-risk">No call time is left inside the payer's window. A written appeal is still open.</p>
      )}
    </Modal>
  );
}
