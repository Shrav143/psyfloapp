import { FileText, RefreshCw, TriangleAlert, Users } from "lucide-react";
import { Stat } from "@/components/ui";
import type { EmrSystem } from "@/data/emr";
import { lastSyncTile } from "./lib/status";

/** Four tinted tiles that follow the state below them: sync, matched charts, files, fields that need a mapping. */
export function EmrTiles({ systems, clock, charts, files, unmapped }: { systems: EmrSystem[]; clock: number; charts: number; files: number; unmapped: number }) {
  const sync = lastSyncTile(systems, clock);
  return (
    <div className="grid grid-cols-4 gap-4">
      <Stat tone={sync.tone} icon={RefreshCw} value={sync.value} label="Last sync" sub={sync.sub} />
      <Stat tone="neutral" icon={Users} value={charts} label="Charts matched today" sub="to open cases" />
      <Stat tone="neutral" icon={FileText} value={files} label="Files pulled" sub="this week" />
      <Stat tone={unmapped ? "mid" : "good"} icon={TriangleAlert} value={unmapped} label="Need a mapping" sub={unmapped ? "fields the agents could not place" : "every field is mapped"} />
    </div>
  );
}
