import type { ReactNode } from "react";
import { ActorBadge } from "./Agent";
import type { RequestEvent } from "@/data/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";

/** Vertical line, a dot per event (green when done, dashed when scheduled), the actor and one line of text. */
export function Timeline({ events, empty }: { events: RequestEvent[]; empty?: ReactNode }) {
  if (!events.length) return <div className="text-sm text-muted">{empty ?? "Nothing yet."}</div>;
  const sorted = [...events].sort((a, b) => a.at - b.at);
  return (
    <ol className="relative pl-[26px]">
      <span className="absolute top-2 bottom-6 left-[5px] w-0.5 bg-[#EADFD2]" aria-hidden="true" />
      {sorted.map((e) => (
        <li key={e.id} className="relative pb-[18px] last:pb-0">
          <span className={cn("absolute top-[3px] -left-[26px] h-3 w-3 rounded-full", e.done ? "bg-good" : "border-2 border-dashed border-faint bg-white")} />
          <div className="text-xs text-muted">{e.done ? stamp(e.at) : `Scheduled · ${stamp(e.at)}`}</div>
          <div className="mt-0.5 flex items-start gap-2">
            <ActorBadge actor={e.actor} />
            <div className={cn("pt-px", !e.done && "text-muted")}>
              {e.text}
              {e.detail ? <div className="mt-1 rounded-lg bg-tile px-2.5 py-1.5 text-[13px] text-ink2">{e.detail}</div> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
