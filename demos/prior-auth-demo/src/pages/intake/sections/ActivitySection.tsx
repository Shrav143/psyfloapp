import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, CardHeader, Disclosure, EmptyState, Segmented } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { blockedInHosted } from "@/lib/hosted";
import { stamp } from "@/lib/time";
import { recordExport } from "../workspace/actions";
import { ActivityFeed } from "../workspace/activity/ActivityFeed";
import { activityOf, activityText, actorLabel, actorsIn, filterActivity, KIND_LABEL, KINDS, NO_FILTER, versionsOf, type ActivityFilter } from "../workspace/activityLog";
import { useModel } from "../workspace/useWorkspaceModel";
import { StatusPill } from "../workspace/bits";

type By = ActivityFilter["by"];
const select = "h-8 rounded-[10px] border border-field bg-white px-2 text-[13px] text-ink focus:border-forest focus:outline-none";

/** Downloads the text as a file. The browser saves it; nothing is sent anywhere. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Activity: the audit trail and the versions. Filter by type, person, or by whether a person or an agent did it; export what is shown as a text file. */
export function ActivitySection({ record }: { record: IntakeRecord }) {
  const { now } = useModel();
  const [f, setF] = useState<ActivityFilter>(NO_FILTER);
  const all = useMemo(() => activityOf(record), [record]);
  const versions = useMemo(() => versionsOf(record), [record]);
  const shown = useMemo(() => filterActivity(all, f), [all, f]);
  const actors = useMemo(() => actorsIn(all), [all]);
  const active = f.kind !== "all" || f.actor !== "all" || f.by !== "all";
  const set = (p: Partial<ActivityFilter>) => setF((x) => ({ ...x, ...p }));

  const exportText = () => {
    if (blockedInHosted("Export as text")) return;
    download(`activity-${record.id}.txt`, activityText(record, shown, versions, now));
    recordExport(record.id, "the activity summary", shown.length);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4" data-section-view="activity">
      <Card>
        <CardHeader title="Activity" subtitle={active ? `${shown.length} of ${all.length} entries` : `${all.length} entries, newest first`} right={<Button size="sm" icon={Download} onClick={exportText} data-export>Export as text</Button>} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3">
          <label className="flex items-center gap-2 text-[13px] text-muted">Type
            <select className={select} value={f.kind} onChange={(e) => set({ kind: e.target.value as ActivityFilter["kind"] })} data-filter="kind">
              <option value="all">All types</option>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">Person
            <select className={select} value={f.actor} onChange={(e) => set({ actor: e.target.value })} data-filter="actor">
              <option value="all">Everyone</option>
              {actors.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <Segmented<By> items={[{ id: "all", label: "All" }, { id: "people", label: "People" }, { id: "agents", label: "AI agents" }]} value={f.by} onChange={(by) => set({ by })} />
          {active ? <Button size="sm" variant="ghost" onClick={() => setF(NO_FILTER)}>Clear filters</Button> : null}
        </div>
        {shown.length ? (
          <ActivityFeed entries={shown} label="Intake activity" />
        ) : (
          <EmptyState title="No activity matches" action={<Button size="sm" onClick={() => setF(NO_FILTER)}>Clear filters</Button>}>Try another type or person.</EmptyState>
        )}
      </Card>
      <Disclosure title="Versions" summary={versions.length ? `${versions.filter((v) => !v.current).length} earlier versions kept. Nothing signed is overwritten` : "No assessment has been started"} defaultOpen={versions.some((v) => !v.current)}>
        {versions.length ? (
          <ul className="divide-y divide-line" data-versions>
            {versions.map((v) => (
              <li key={v.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
                <span className="min-w-0 flex-1 basis-[180px] text-[13px] font-medium">{v.label} <span className="font-normal text-muted">version {v.version}</span></span>
                <StatusPill status={v.state} />
                <span className="text-[12px] text-muted">{v.current ? "In use" : `Superseded${v.supersededAt !== undefined ? ` ${stamp(v.supersededAt)}` : ""}`}{v.by ? ` · ${actorLabel(v.by)}${v.at !== undefined ? `, ${stamp(v.at)}` : ""}` : ""}</span>
                {v.why ? <span className="basis-full text-[12px] text-ink2"><span className="font-semibold">Why: </span>{v.why}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[13px] text-muted">Versions appear when an assessment is started.</p>
        )}
      </Disclosure>
    </div>
  );
}
