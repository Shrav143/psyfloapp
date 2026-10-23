import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import type { EmrSystem } from "@/data/emr";
import { useStore } from "@/store";
import { CONNECT_CHECKS, ConnectionTest } from "./ConnectionTest";
import { FixModal } from "./FixModal";

/** Bring a disconnected system back. A system that had a problem when it was disconnected goes through Fix first, then every
    system runs the same read-only test as Connect. Only a passed test makes it connected. Mounted only while open. */
export function ReconnectModal({ system, onClose }: { system: EmrSystem; onClose: () => void }) {
  const [passed, setPassed] = useState(false);
  if (system.fixIssue) {
    return <FixModal system={system} onClose={onClose} onFinish={() => useStore.getState().renewSignIn(system.id)} finishLabel="Next: test the connection" />;
  }
  return (
    <Modal open onClose={onClose} title={`Reconnect ${system.name}`} subtitle="Read-only. Nothing is written back until a person approves it." footer={
      <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!passed} onClick={() => { useStore.getState().reconnectSystem(system.id); onClose(); }}>Reconnect {system.name}</Button>
      </>
    }>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted">It is connected again only when the test passes. Until then New Case cannot pull a chart from it.</p>
        <ConnectionTest checks={CONNECT_CHECKS} onPassed={() => setPassed(true)} />
      </div>
    </Modal>
  );
}
