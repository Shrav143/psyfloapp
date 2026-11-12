import { Database, RefreshCw, Wrench } from "lucide-react";
import { Button, IconBubble, Pill, Switch } from "@/components/ui";
import { SYSTEM_READS, type EmrSystem } from "@/data/emr";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { pullNote, STATUS, syncFailures } from "./lib/status";

/** What write back means, in one sentence, next to the switch that turns it on. The whole line is the row's header: it says whether this system is read only or read and write back. */
function WriteBackLine({ system }: { system: EmrSystem }) {
  const setWriteBack = useStore((s) => s.setWriteBack);
  const on = system.writeBack;
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl bg-tile px-3.5 py-2.5">
      <p className="min-w-0 flex-1 basis-[260px] text-[13px] text-ink2">
        <b className="font-semibold text-ink">{on ? "Read and write back" : "Read only"}.</b>{" "}
        {on
          ? `After a person approves, the Dashboard can write the approval number and dates back to this system, and nothing else.${system.status === "connected" ? "" : " It counts once the system is connected."}`
          : "Agents only read here, and nothing is written to this system."}
      </p>
      <Switch
        checked={on}
        onChange={(v) => setWriteBack(system.id, v)}
        label={
          <>
            Write back<span className="sr-only"> for {system.name}</span>
          </>
        }
      />
    </div>
  );
}

interface Props {
  system: EmrSystem;
  clock: number;
  busy: boolean;
  /** Any sync is running, so every Sync now waits. */
  anySyncing: boolean;
  onSync: (id: string) => void;
  onManage: (id: string) => void;
  onFix: (id: string) => void;
  onReconnect: (id: string) => void;
}

/** One connected system: name, status, last sync, what it reads, failed syncs, its actions, and whether it is read only or write back. */
export function SystemRow({ system: s, clock, busy, anySyncing, onSync, onManage, onFix, onReconnect }: Props) {
  const st = STATUS[s.status];
  const failures = syncFailures(s, clock);
  return (
    <div className="border-b border-line px-6 py-4 last:border-b-0" data-system={s.id}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <IconBubble icon={Database} size={38} />
        <div className="min-w-0 flex-1 basis-[240px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{s.name}</span>
            <Pill tone={st.tone} dot>{st.label}</Pill>
          </div>
          <div className="mt-0.5 text-[13px] text-muted">{s.holds}. Reads {SYSTEM_READS[s.kind].join(", ").toLowerCase()}</div>
        </div>
        <div className="flex flex-col text-[13px] whitespace-nowrap text-muted">
          <span>{s.status === "disconnected" ? "Not syncing" : busy ? "Syncing" : `Last sync ${ago(s.lastSyncAt, clock)}`}</span>
          <span>{failures === null ? "Sync paused" : `${failures} sync ${failures === 1 ? "failure" : "failures"}`}</span>
        </div>
        <div className="flex items-center gap-2">
          {s.status === "connected" ? <Button size="sm" icon={RefreshCw} loading={busy} disabled={anySyncing} onClick={() => onSync(s.id)} aria-label={`Sync ${s.name} now`}>Sync now</Button> : null}
          {s.status === "attention" ? <Button size="sm" variant="primary" icon={Wrench} onClick={() => onFix(s.id)} aria-label={`Fix ${s.name}`}>Fix</Button> : null}
          {s.status === "disconnected" ? <Button size="sm" variant="primary" onClick={() => onReconnect(s.id)} aria-label={`Reconnect ${s.name}`}>Reconnect</Button> : null}
          <Button size="sm" onClick={() => onManage(s.id)} aria-label={`Manage ${s.name}`}>Manage</Button>
        </div>
      </div>
      <WriteBackLine system={s} />
      {s.status !== "connected" ? <p className="mt-2 text-[13px] text-mid-ink">{pullNote(s)}</p> : null}
    </div>
  );
}
