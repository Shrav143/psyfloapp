import { Button, Disclosure, Pill } from "@/components/ui";
import type { EmrMapping, EmrSystem, UnmappedField } from "@/data/emr";
import { useStore } from "@/store";
import { ActivityLog } from "./ActivityLog";

function Mappings({ systems, mappings, waiting, onMap }: { systems: EmrSystem[]; mappings: EmrMapping[]; waiting: UnmappedField[]; onMap: (f: UnmappedField) => void }) {
  const nameOf = (id: string) => systems.find((s) => s.id === id)?.name ?? "A system";
  return (
    <section aria-labelledby="mappings-title">
      <h4 id="mappings-title" className="font-serif text-[17px] font-semibold">Field mappings</h4>
      <p className="mt-0.5 text-[13px] text-muted">
        {mappings.length} mapped{waiting.length ? `, ${waiting.length} waiting. A chart pulled in New case leaves the waiting fields blank until you map them.` : ". Every field the agents have met is mapped."}
      </p>
      <ul className="mt-3 overflow-hidden rounded-2xl border border-edge" aria-label="Field mappings">
        {waiting.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-mid-bg/40 px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1 basis-[220px]">
              <div className="font-medium">{u.field} <Pill tone="mid" className="ml-1.5">Not mapped</Pill></div>
              <div className="text-[12.5px] text-muted">{nameOf(u.systemId)} · {u.hint}</div>
            </div>
            <Button size="sm" onClick={() => onMap(u)} aria-label={`Map ${u.field}`}>Map</Button>
          </li>
        ))}
        {mappings.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1 basis-[220px]">
              <div className="font-medium">{m.source} <span className="sr-only"> fills </span><span className="text-muted" aria-hidden="true">→</span> {m.target}</div>
              <div className="text-[12.5px] text-muted">{nameOf(m.systemId)}</div>
            </div>
            <span className="text-[13px] text-muted">{m.by}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Field mappings and the activity log, folded away. A mapping in progress lives in the page's own Map pop-up, so closing this loses nothing and it need not stay mounted. */
export function Advanced({ systems, clock, onMap }: { systems: EmrSystem[]; clock: number; onMap: (f: UnmappedField) => void }) {
  const mappings = useStore((s) => s.emrMappings);
  const waiting = useStore((s) => s.emrUnmapped);
  const activity = useStore((s) => s.emrActivity);
  return (
    <Disclosure
      title="Advanced"
      summary={`${mappings.length} field mappings${waiting.length ? `, ${waiting.length} waiting` : ""}, and the log of every read and write (${activity.length} lines).`}
      right={waiting.length ? <Pill tone="mid">{waiting.length} to map</Pill> : undefined}
    >
      <div className="flex flex-col gap-7 px-6 py-5">
        <Mappings systems={systems} mappings={mappings} waiting={waiting} onMap={onMap} />
        <ActivityLog activity={activity} clock={clock} />
      </div>
    </Disclosure>
  );
}
