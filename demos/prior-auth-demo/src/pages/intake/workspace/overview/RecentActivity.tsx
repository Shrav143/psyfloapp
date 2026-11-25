import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { ActivityFeed } from "../activity/ActivityFeed";
import { activityOf } from "../activityLog";
import { workspaceHref } from "../nav";
import { useMemo } from "react";

/** The last five events; the Activity section has the rest. */
export function RecentActivity({ record }: { record: IntakeRecord }) {
  const entries = useMemo(() => activityOf(record), [record]);
  return (
    <Card data-card="recent-activity">
      <CardHeader title="Recent activity" right={<Link to={workspaceHref(record.id, { section: "activity" })} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">See all {entries.length}<ArrowRight size={13} className="ico" /></Link>} />
      <ActivityFeed entries={entries.slice(0, 5)} label="Recent activity" empty="No activity yet." />
    </Card>
  );
}
