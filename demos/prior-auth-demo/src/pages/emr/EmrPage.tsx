import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import type { UnmappedField } from "@/data/emr";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { ActivityCard } from "./ActivityCard";
import { ConnectModal } from "./ConnectModal";
import { EmrTiles } from "./EmrTiles";
import { FixModal } from "./FixModal";
import { useAlive } from "./lib/useAlive";
import { ManageDrawer } from "./ManageDrawer";
import { MapModal } from "./MapModal";
import { AgentsCanCard, NeedsMappingCard } from "./SidePanels";
import { SystemsCard } from "./SystemsCard";

const SYNC_MS = 2000;

/** EMR Connect: is the chart flowing in, and what may the agents write back? A status page, not a settings maze. */
export default function EmrPage() {
  const alive = useAlive();
  const systems = useStore((s) => s.emrSystems);
  const activity = useStore((s) => s.emrActivity);
  const unmapped = useStore((s) => s.emrUnmapped);
  const charts = useStore((s) => s.emrCharts);
  const files = useStore((s) => s.emrFiles);
  const clock = useStore((s) => s.clock);
  const [syncing, setSyncing] = useState<string[]>([]);
  const [allBusy, setAllBusy] = useState(false);
  const [manage, setManage] = useState<string | null>(null);
  const [mapping, setMapping] = useState<UnmappedField | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);

  const sync = async (ids: string[], all = false) => {
    if (syncing.length) return;
    setSyncing(ids);
    setAllBusy(all);
    await sleep(SYNC_MS);
    if (!alive.current) return;
    useStore.getState().syncSystems(ids);
    setSyncing([]);
    setAllBusy(false);
  };
  const connected = systems.filter((s) => s.status === "connected").map((s) => s.id);
  const outpatient = systems.find((s) => s.id === "sys-out") ?? systems[0];
  const fixTarget = systems.find((s) => s.id === fixing);

  return (
    <Page>
      <PageHeader
        title="EMR Connect"
        sub="Charts arrive on their own. Nothing is written back until a person approves it."
        actions={<><Button icon={Settings} disabled={!outpatient} onClick={() => outpatient && setManage(outpatient.id)}>Manage mapping</Button><Button variant="primary" icon={Plus} onClick={() => setConnecting(true)}>Connect a system</Button></>}
      />
      <EmrTiles systems={systems} clock={clock} charts={charts} files={files} unmapped={unmapped.length} />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="flex flex-col gap-4">
          <SystemsCard systems={systems} clock={clock} syncing={syncing} allBusy={allBusy} onSyncAll={() => sync(connected, true)} onSync={(id) => sync([id])} onManage={setManage} onFix={setFixing} onReconnect={(id) => useStore.getState().reconnectSystem(id)} />
          <ActivityCard activity={activity} clock={clock} />
        </div>
        <div className="flex flex-col gap-4">
          <AgentsCanCard />
          <NeedsMappingCard fields={unmapped} onMap={setMapping} />
        </div>
      </div>
      {manage ? <ManageDrawer systemId={manage} clock={clock} onClose={() => setManage(null)} onMap={setMapping} /> : null}
      {mapping ? <MapModal field={mapping} onClose={() => setMapping(null)} /> : null}
      {connecting ? <ConnectModal onClose={() => setConnecting(false)} /> : null}
      {fixTarget ? <FixModal system={fixTarget} onClose={() => setFixing(null)} /> : null}
    </Page>
  );
}
