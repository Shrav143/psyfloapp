import { RefreshCw } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import type { EmrSystem } from "@/data/emr";
import { plural } from "@/lib/format";
import { lastSyncTile, syncFailures } from "./lib/status";
import { SystemRow } from "./SystemRow";

interface Props {
  systems: EmrSystem[];
  clock: number;
  charts: number;
  files: number;
  syncing: string[];
  /** The header Sync now is running (as opposed to one row). */
  allBusy: boolean;
  onSyncAll: () => void;
  onSync: (id: string) => void;
  onManage: (id: string) => void;
  onFix: (id: string) => void;
  onReconnect: (id: string) => void;
}

function Figure({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold leading-tight tracking-tight">{value}</div>
      <div className="text-[12.5px] text-muted">{label}</div>
      {note ? <div className="text-[12px] text-muted opacity-80">{note}</div> : null}
    </div>
  );
}

/** The top of the page: is the chart flowing in? Four figures that follow the state below them, then one row per system. */
export function HealthCard({ systems, clock, charts, files, syncing, allBusy, onSyncAll, onSync, onManage, onFix, onReconnect }: Props) {
  const sync = lastSyncTile(systems, clock);
  const connected = systems.filter((s) => s.status === "connected").length;
  const failures = systems.reduce((n, s) => n + (syncFailures(s, clock) ?? 0), 0);
  return (
    <Card>
      <CardHeader
        title="Connection health"
        subtitle={`${connected} of ${plural(systems.length, "system")} connected. Read access for charts, insurance details and medications.`}
        right={<Button size="sm" variant="primary" icon={RefreshCw} loading={allBusy} disabled={syncing.length > 0} onClick={onSyncAll}>Sync now</Button>}
      />
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-6 py-4 lg:grid-cols-4">
        <Figure value={sync.value} label="Last sync" note={sync.sub} />
        <Figure value={charts} label="Charts matched today" />
        <Figure value={files} label="Files pulled this week" />
        <Figure value={failures} label="Sync failures" />
      </div>
      {systems.map((s) => (
        <SystemRow key={s.id} system={s} clock={clock} busy={syncing.includes(s.id)} anySyncing={syncing.length > 0} onSync={onSync} onManage={onManage} onFix={onFix} onReconnect={onReconnect} />
      ))}
      {!systems.length ? <div className="px-6 py-8 text-sm text-muted">Connect your record system to let charts arrive on their own.</div> : null}
    </Card>
  );
}
