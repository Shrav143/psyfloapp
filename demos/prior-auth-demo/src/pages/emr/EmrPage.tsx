import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { UnmappedField } from "@/data/emr";
import type { AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { ActivityCard } from "./ActivityCard";
import { AskFirst, type Asking } from "./AskFirst";
import { ConnectModal } from "./ConnectModal";
import { EmrTiles } from "./EmrTiles";
import { FixModal } from "./FixModal";
import { agentGate } from "./lib/agentGate";
import { useAlive } from "./lib/useAlive";
import { ManageDrawer } from "./ManageDrawer";
import { MapModal } from "./MapModal";
import { ReconnectModal } from "./ReconnectModal";
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
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);

  /** Settings decides how an agent starts a step here: paused waits, "Ask before acting" asks first, the other levels go ahead. */
  const begin = (agent: AgentKey, verb: string, ask: Omit<Asking, "agent" | "run"> | null, run: () => void) => {
    const gate = agentGate(agent);
    if (gate === "paused") return useStore.getState().toast({ title: `${AGENTS[agent].name} is paused`, body: `Resume it in Settings to ${verb}.`, tone: "mid" });
    if (gate === "ask" && ask) return setAsking({ ...ask, agent, run });
    run();
  };

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
  const reconnectTarget = systems.find((s) => s.id === reconnecting);
  const nameOf = (id: string) => systems.find((s) => s.id === id)?.name ?? "this system";

  const syncAll = () => {
    if (!connected.length) return useStore.getState().toast({ title: "Nothing to sync", body: "No system is connected. Fix or reconnect one first.", tone: "mid" });
    begin("reader", "sync", { title: "Sync every connected system?", body: `Reader will pull new files and charts from ${connected.length} connected ${connected.length === 1 ? "system" : "systems"}.`, label: "Sync now" }, () => sync(connected, true));
  };
  const syncOne = (id: string) => begin("reader", "sync", { title: `Sync ${nameOf(id)}?`, body: "Reader will pull new files and charts from it.", label: "Sync now" }, () => sync([id]));
  const fix = (id: string) => begin("navigator", "fix it", { title: `Fix ${nameOf(id)}?`, body: "Navigator will walk you through renewing the read-only sign-in and testing it. Nothing is written to the system.", label: "Start the fix" }, () => setFixing(id));
  const reconnect = (id: string) => begin("navigator", "reconnect it", { title: `Reconnect ${nameOf(id)}?`, body: systems.find((s) => s.id === id)?.fixIssue ? "Navigator will fix the problem first, then test the connection. It is connected only when the test passes." : "Navigator will test the connection. It is connected only when the test passes.", label: "Start" }, () => setReconnecting(id));

  return (
    <Page>
      <PageHeader
        title="EMR Connect"
        sub="Charts arrive on their own. Nothing is written back until a person approves it."
        actions={<><Button icon={Settings} disabled={!outpatient} onClick={() => outpatient && setManage(outpatient.id)}>Manage mapping</Button><Button variant="primary" icon={Plus} onClick={() => begin("reader", "connect a system", null, () => setConnecting(true))}>Connect a system</Button></>}
      />
      <EmrTiles systems={systems} clock={clock} charts={charts} files={files} unmapped={unmapped.length} />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="flex flex-col gap-4">
          <SystemsCard systems={systems} clock={clock} syncing={syncing} allBusy={allBusy} onSyncAll={syncAll} onSync={syncOne} onManage={setManage} onFix={fix} onReconnect={reconnect} />
          <ActivityCard activity={activity} clock={clock} />
        </div>
        <div className="flex flex-col gap-4">
          <AgentsCanCard />
          <NeedsMappingCard fields={unmapped} onMap={setMapping} />
        </div>
      </div>
      {manage ? <ManageDrawer systemId={manage} clock={clock} onClose={() => setManage(null)} onMap={setMapping} onReconnect={reconnect} /> : null}
      {mapping ? <MapModal field={mapping} onClose={() => setMapping(null)} /> : null}
      {connecting ? <ConnectModal onClose={() => setConnecting(false)} /> : null}
      {fixTarget ? <FixModal system={fixTarget} onClose={() => setFixing(null)} /> : null}
      {reconnectTarget ? <ReconnectModal system={reconnectTarget} onClose={() => setReconnecting(null)} /> : null}
      {asking ? <AskFirst asking={asking} onClose={() => setAsking(null)} /> : null}
    </Page>
  );
}
