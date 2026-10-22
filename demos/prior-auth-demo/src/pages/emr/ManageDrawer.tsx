import { useState } from "react";
import { Check, Unplug } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Drawer, KeyValue, Modal, Pill } from "@/components/ui";
import { SYSTEM_READS } from "@/data/emr";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { pullNote, STATUS } from "./lib/status";

/** Connection details, what the agents may read, and Disconnect for one system. Field mappings are under Advanced on the page, and the write-back switch is on the system's row. Mounted only while open. */
export function ManageDrawer({ systemId, clock, onClose, onReconnect }: { systemId: string; clock: number; onClose: () => void; onReconnect: (id: string) => void }) {
  const system = useStore((s) => s.emrSystems.find((x) => x.id === systemId));
  const [confirm, setConfirm] = useState(false);
  if (!system) return null;
  const st = STATUS[system.status];
  const reads = SYSTEM_READS[system.kind];

  return (
    <>
      <Drawer open onClose={onClose} width={680} title={system.name} subtitle={`${system.kind} · ${system.holds}`} right={<Pill tone={st.tone} dot>{st.label}</Pill>}>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Connection details" />
            <CardBody>
              <KeyValue items={[["Type", system.kind], ["Connected since", system.connectedSince], ["Contact at the practice", system.contact], ["Last sync", system.status === "disconnected" ? "Not syncing" : ago(system.lastSyncAt, clock)], ["Access", "Secure, read-only connection"]]} />
              {system.status !== "connected" ? <p className="mt-3 text-[13px] text-mid-ink">{pullNote(system)}</p> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Permissions" subtitle="What the agents may do in this system" />
            <CardBody className="flex flex-col gap-3">
              <div>
                <div className="mb-1.5 text-[13px] font-semibold">Read</div>
                <ul className="flex flex-wrap gap-2">{reads.map((r) => <li key={r} className="inline-flex items-center gap-1.5 rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-semibold text-good-ink"><Check size={12} className="ico" />{r}</li>)}</ul>
              </div>
              <div>
                <div className="mb-1 text-[13px] font-semibold">{system.writeBack ? "Read and write back" : "Read only"}</div>
                <p className="text-[13px] text-muted">{system.writeBack ? "After a person approves, the Dashboard can write the approval number and dates back, and nothing else." : "Nothing is written to this system."} Change it with the Write back switch on the system's row. Field mappings are under Advanced on the page.</p>
              </div>
            </CardBody>
          </Card>
          {system.status === "disconnected" ? (
            <Button className="self-start" variant="primary" onClick={() => onReconnect(system.id)}>Reconnect</Button>
          ) : (
            <Button className="self-start" variant="danger" icon={Unplug} onClick={() => setConfirm(true)}>Disconnect</Button>
          )}
        </div>
      </Drawer>
      <Modal open={confirm} size="sm" onClose={() => setConfirm(false)} title={`Disconnect ${system.name}?`} subtitle="Charts from it stop arriving. Nothing is deleted." footer={<><Button onClick={() => setConfirm(false)}>Keep it connected</Button><Button variant="danger" onClick={() => { useStore.getState().disconnectSystem(system.id); setConfirm(false); }}>Disconnect</Button></>}>
        <p className="text-sm text-ink2">Requests already on the Dashboard stay where they are. You can reconnect this system at any time.</p>
      </Modal>
    </>
  );
}
