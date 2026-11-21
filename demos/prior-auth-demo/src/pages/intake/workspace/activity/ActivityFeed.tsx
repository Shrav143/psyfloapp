import { ActorBadge, Pill } from "@/components/ui";
import type { AgentKey } from "@/data/types";
import { stamp } from "@/lib/time";
import { KIND_LABEL, isAgentActor, type ActivityEntry } from "../activityLog";
import { staffOf } from "@/data/intake/seed";

/** Who, what, when and why for each entry, with the marker that tells a person's action from an agent's. */
export function ActivityFeed({ entries, label = "Activity", empty }: { entries: ActivityEntry[]; label?: string; empty?: string }) {
  if (!entries.length) return <p className="px-5 py-4 text-[13px] text-muted">{empty ?? "Nothing yet."}</p>;
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-col p-0">
      {entries.map((e) => {
        const staff = staffOf(e.actor);
        return (
          <li key={e.id} data-activity={e.kind} data-by={e.ai ? "agent" : "person"} className="flex items-start gap-2.5 border-b border-line px-5 py-2.5 last:border-b-0">
            {isAgentActor(e.actor) ? <ActorBadge actor={e.actor as AgentKey} size={22} /> : staff ? <span title={staff.name} className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-forest text-[11px] font-semibold text-white">{staff.initials}</span> : <ActorBadge actor={e.actor === "payer" ? "payer" : "system"} size={22} />}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-muted"><b className="font-semibold text-ink2">{e.who}</b> · {stamp(e.at)} · {KIND_LABEL[e.kind]}</div>
              <div className="text-[13px] break-words">{e.what}</div>
              {e.why ? <div className="mt-1 rounded-lg bg-tile px-2.5 py-1.5 text-[12px] break-words text-ink2"><span className="font-semibold">Why: </span>{e.why}</div> : null}
            </div>
            <Pill tone={e.ai ? "good" : "neutral"} className="mt-0.5 shrink-0">{e.ai ? "AI agent" : "Person"}</Pill>
          </li>
        );
      })}
    </ol>
  );
}
