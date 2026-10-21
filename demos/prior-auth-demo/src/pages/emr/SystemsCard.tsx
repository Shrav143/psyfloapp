import { Database, RefreshCw, Wrench } from "lucide-react";
import { Button, Card, CardHeader, IconBubble, Pill } from "@/components/ui";
import type { EmrSystem } from "@/data/emr";
import { ago } from "@/lib/time";
import { pullNote, STATUS } from "./lib/status";

interface Props {
  systems: EmrSystem[];
  clock: number;
  syncing: string[];
  /** The header Sync now is running (as opposed to one row). */
  allBusy: boolean;
  onSyncAll: () => void;
  onSync: (id: string) => void;
  onManage: (id: string) => void;
  onFix: (id: string) => void;
  onReconnect: (id: string) => void;
}

/** One row per connected system. A system that is not connected says why and that New case cannot pull from it. Sync now is in the header and on each healthy row. */
export function SystemsCard({ systems, clock, syncing, allBusy, onSyncAll, onSync, onManage, onFix, onReconnect }: Props) {
  return (
    <Card>
      <CardHeader title="Connected systems" subtitle="Read access for charts, insurance details and medications" right={<Button size="sm" variant="primary" icon={RefreshCw} loading={allBusy} disabled={syncing.length > 0} onClick={onSyncAll}>Sync now</Button>} />
      {systems.map((s) => {
        const st = STATUS[s.status];
        const busy = syncing.includes(s.id);
        return (
          <div key={s.id} className="border-b border-line px-6 py-4 last:border-b-0">
            <div className="flex items-center gap-3.5">
              <IconBubble icon={Database} size={38} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.name}</div>
                <div className="text-[13px] text-muted">{s.holds}</div>
              </div>
              <span className="text-[13px] whitespace-nowrap text-muted">{s.status === "disconnected" ? "Not syncing" : busy ? "Syncing" : ago(s.lastSyncAt, clock)}</span>
              <Pill tone={st.tone} dot>{st.label}</Pill>
              {s.status === "connected" ? <Button size="sm" icon={RefreshCw} loading={busy} disabled={syncing.length > 0} onClick={() => onSync(s.id)} aria-label={`Sync ${s.name} now`}>Sync now</Button> : null}
              {s.status === "attention" ? <Button size="sm" variant="primary" icon={Wrench} onClick={() => onFix(s.id)} aria-label={`Fix ${s.name}`}>Fix</Button> : null}
              {s.status === "disconnected" ? <Button size="sm" variant="primary" onClick={() => onReconnect(s.id)} aria-label={`Reconnect ${s.name}`}>Reconnect</Button> : null}
              <Button size="sm" onClick={() => onManage(s.id)} aria-label={`Manage ${s.name}`}>Manage</Button>
            </div>
            {s.status !== "connected" ? <p className="mt-2 ml-[52px] text-[13px] text-mid-ink">{pullNote(s)}</p> : null}
          </div>
        );
      })}
      {!systems.length ? <div className="px-6 py-8 text-sm text-muted">Connect your record system to let charts arrive on their own.</div> : null}
    </Card>
  );
}
