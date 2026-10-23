import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SiteTag } from "@/components/layout/SiteTag";
import { Button, Page, PageHeader } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { emrInView, type UnmappedField } from "@/data/emr";
import type { AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { ActionRequired, needsOf } from "./ActionRequired";
import { Advanced } from "./Advanced";
import { AskFirst, type Asking } from "./AskFirst";
import { ConnectModal } from "./ConnectModal";
import { FixModal } from "./FixModal";
import { HealthCard } from "./HealthCard";
import { agentGate } from "./lib/agentGate";
import { useAlive } from "./lib/useAlive";
import { ManageDrawer } from "./ManageDrawer";
import { MapModal } from "./MapModal";
import { ReconnectModal } from "./ReconnectModal";

const SYNC_MS = 2000;

/** EMR Connect: is the chart flowing in, and what may the agents write back? A status page, not a settings maze.
    Record systems belong to a site, so everything below follows the site view: a Site A viewer sees Site A's record system and the billing system both sites share, never Site B's. */
export default function EmrPage() {
  const alive = useAlive();
  const { sites } = useScope();
  const allSystems = useStore((s) => s.emrSystems);
  const allUnmapped = useStore((s) => s.emrUnmapped);
  const counts = useStore((s) => s.emrCounts);
  const systems = useMemo(() => emrInView(allSystems, sites), [allSystems, sites]);
  const unmapped = useMemo(() => allUnmapped.filter((u) => systems.some((x) => x.id === u.systemId)), [allUnmapped, systems]);
  const charts = sites.reduce((n, id) => n + counts[id].charts, 0);
  const files = sites.reduce((n, id) => n + counts[id].files, 0);
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused);
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

  const needs = needsOf(systems, unmapped, paused, { fix, reconnect, map: setMapping });

  return (
    <Page>
      <PageHeader
        title={<>EMR Connect<SiteTag /></>}
        sub={
          <>
            <span>Charts arrive on their own. Nothing is written back until a person approves it.</span>
            <span className="mt-1.5 block text-[12px]">Simulated connection: this demo does not contact a real record system.</span>
          </>
        }
        actions={<Button variant="primary" icon={Plus} onClick={() => begin("reader", "connect a system", null, () => setConnecting(true))}>Connect a system</Button>}
      />
      <ActionRequired needs={needs} />
      <HealthCard systems={systems} clock={clock} charts={charts} files={files} syncing={syncing} allBusy={allBusy} onSyncAll={syncAll} onSync={syncOne} onManage={setManage} onFix={fix} onReconnect={reconnect} />
      <Advanced systems={systems} clock={clock} onMap={setMapping} />
      {manage && systems.some((x) => x.id === manage) ? <ManageDrawer systemId={manage} clock={clock} onClose={() => setManage(null)} onReconnect={reconnect} /> : null}
      {mapping && unmapped.some((u) => u.id === mapping.id) ? <MapModal field={mapping} onClose={() => setMapping(null)} /> : null}
      {connecting ? <ConnectModal onClose={() => setConnecting(false)} /> : null}
      {fixTarget ? <FixModal system={fixTarget} onClose={() => setFixing(null)} /> : null}
      {reconnectTarget ? <ReconnectModal system={reconnectTarget} onClose={() => setReconnecting(null)} /> : null}
      {asking ? <AskFirst asking={asking} onClose={() => setAsking(null)} /> : null}
    </Page>
  );
}
