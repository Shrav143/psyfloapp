import { useState } from "react";
import { Check, Unplug } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Drawer, KeyValue, Modal, Pill, Switch, Table, Td, Th, Tr } from "@/components/ui";
import { SYSTEM_READS, type UnmappedField } from "@/data/emr";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { pullNote, STATUS } from "./lib/status";

/** Connection details, read-only permissions, field mappings and Disconnect for one system. Mounted only while open. */
export function ManageDrawer({ systemId, clock, onClose, onMap, onReconnect }: { systemId: string; clock: number; onClose: () => void; onMap: (f: UnmappedField) => void; onReconnect: (id: string) => void }) {
  const system = useStore((s) => s.emrSystems.find((x) => x.id === systemId));
  const mappings = useStore((s) => s.emrMappings);
  const unmapped = useStore((s) => s.emrUnmapped);
  const setWriteBack = useStore((s) => s.setWriteBack);
  const [confirm, setConfirm] = useState(false);
  if (!system) return null;
  const rows = mappings.filter((m) => m.systemId === system.id);
  const waiting = unmapped.filter((u) => u.systemId === system.id);
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
                <Switch checked={system.writeBack} onChange={(on) => setWriteBack(system.id, on)} label="The Dashboard offers the approval write-back box for this system" />
                <p className="mt-1.5 ml-[50px] text-[13px] text-muted">The box writes only the approval number and dates, and only after a person approves. It shows while at least one connected system has this on.{system.status !== "connected" ? " This system is not connected, so its switch does not count yet." : ""}</p>
              </div>
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Field mappings" subtitle={`${rows.length} mapped${waiting.length ? `, ${waiting.length} waiting. A chart pulled in New case leaves the waiting fields blank.` : ""}`} />
            <Table>
              <thead><tr><Th>Their field</Th><Th>Fills</Th><Th>Mapped by</Th></tr></thead>
              <tbody>
                {rows.map((m) => <Tr key={m.id}><Td>{m.source}</Td><Td>{m.target}</Td><Td className="text-muted">{m.by}</Td></Tr>)}
                {waiting.map((u) => <Tr key={u.id}><Td>{u.field}</Td><Td className="text-muted">Not mapped</Td><Td><Button size="sm" onClick={() => onMap(u)}>Map</Button></Td></Tr>)}
              </tbody>
            </Table>
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
