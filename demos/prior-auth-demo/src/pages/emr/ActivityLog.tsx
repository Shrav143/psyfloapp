import { useState } from "react";
import { AgentBadge, Button, Drawer } from "@/components/ui";
import type { EmrActivity } from "@/data/emr";
import { ago } from "@/lib/time";

const SHOWN = 6;

function Row({ a, clock }: { a: EmrActivity; clock: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <AgentBadge agent={a.agent} size={32} />
      <span className="flex-1">{a.text}</span>
      <span className="text-[13px] whitespace-nowrap text-muted">{ago(a.at, clock)}</span>
    </div>
  );
}

/** What the agents pulled, matched or wrote back. The newest lines come first and the log grows when you sync, map or connect. */
export function ActivityLog({ activity, clock }: { activity: EmrActivity[]; clock: number }) {
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby="activity-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 id="activity-title" className="font-serif text-[16px] font-semibold">Recent activity</h4>
          <p className="mt-0.5 text-[13px] text-muted">Every read and write is logged</p>
        </div>
        {activity.length > SHOWN ? <Button size="sm" variant="ghost" onClick={() => setAll(true)}>See all {activity.length}</Button> : null}
      </div>
      <div className="mt-2">{activity.slice(0, SHOWN).map((a) => <Row key={a.id} a={a} clock={clock} />)}</div>
      <Drawer open={all} onClose={() => setAll(false)} width={640} title="Activity log" subtitle="Every read and write, newest first.">
        <div className="overflow-hidden rounded-2xl border border-edge bg-white px-4">{activity.map((a) => <Row key={a.id} a={a} clock={clock} />)}</div>
      </Drawer>
    </section>
  );
}
