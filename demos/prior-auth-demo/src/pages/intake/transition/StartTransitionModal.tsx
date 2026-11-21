import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { Button, ChoiceCard, Modal } from "@/components/ui";
import type { LegacyClient } from "@/data/intake/seed";
import { availableOn, REDESIGN_START } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { DAY, longDate, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";

const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromIso = (s: string) => {
  const t = new Date(`${s}T00:00:00`).getTime();
  return Number.isNaN(t) ? null : Math.round((t - toDate(0).getTime()) / 60_000);
};

/** Opens a transition intake for one client: a first option to review (never a mapping) and its planned start. The intake lists every candidate
    on its care pathway for a clinician to review. */
export function StartTransitionModal({ client, onClose }: { client: LegacyClient; onClose: () => void }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const start = useStore((s) => s.startTransitionIntake);
  const toast = useStore((s) => s.toast);
  const options = client.candidates.filter((c): c is VaServiceId => c !== "external");
  const defaultDate = (svc: VaServiceId) => (serviceById(svc).status === "redesign" ? REDESIGN_START : Math.max(clock, client.authEnds + DAY));
  const [svc, setSvc] = useState<VaServiceId>(options[0]);
  const [date, setDate] = useState(iso(defaultDate(options[0])));
  const at = fromIso(date);
  const ok = at !== null && availableOn(svc, at);
  const go = () => {
    if (!ok || at === null) return;
    const id = start(client.id, svc, at);
    if (!id) return;
    toast({ title: `Transition intake ${id} started`, body: `${client.initials}: ${serviceById(svc).short} is the first option to review. A clinician decides what fits.`, tone: "good" });
    onClose();
    nav(paths.intakeRecord(id));
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Start a transition intake for ${client.initials}, ${client.age}`}
      subtitle={`${serviceById(client.serviceId).label} (${serviceById(client.serviceId).code}) · ${client.authorizationId} through ${longDate(client.authEnds)}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={PlayCircle} disabled={!ok} onClick={go}>Start transition intake</Button>
        </>
      }
    >
      <p className="text-[13px] text-ink2">Options to review, not a mapping. The intake lists every option on its care pathway; a clinician decides what fits.</p>
      {client.candidates.includes("external") ? <p className="mt-1 text-[13px] text-muted">An external program is also an option; it is added to the care pathway to be named there.</p> : null}
      <div role="radiogroup" aria-label="First option to review" className="mt-3 grid gap-2">
        {options.map((o) => (
          <ChoiceCard key={o} selected={svc === o} onClick={() => { setSvc(o); setDate(iso(defaultDate(o))); }} title={serviceById(o).label}>
            <span className="text-[12px] text-muted">{serviceById(o).status === "redesign" ? "Starts July 1, 2027" : "Available now"}</span>
          </ChoiceCard>
        ))}
      </div>
      <label htmlFor="transition-start" className="mt-4 mb-1 block text-[13px] font-medium text-ink2">Planned start</label>
      <input id="transition-start" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[38px] rounded-xl border border-field bg-white px-3 text-[14px]" />
      {!ok ? <p className="mt-1 text-[12px] text-risk-ink">{serviceById(svc).short} {serviceById(svc).status === "redesign" ? "cannot start before July 1, 2027." : "cannot start on that date."}</p> : null}
    </Modal>
  );
}
