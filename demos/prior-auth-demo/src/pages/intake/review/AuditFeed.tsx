import { ActorBadge, FLAG_LABEL, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { staffOf } from "@/data/intake/seed";
import type { AuditEvent } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { stamp } from "@/lib/time";

/* The intake's audit trail, in HistoryFeed's look. HistoryFeed names one "you"; an intake is worked by several people, so each staff entry
   carries that person's own name and initials, and every agent action keeps the Agent flag. */

const isAgent = (id: string): id is AgentKey => id in AGENTS;

export function AuditFeed({ events, empty, label = "Intake history" }: { events: AuditEvent[]; empty?: string; label?: string }) {
  if (!events.length) return <p className="px-4 py-3 text-[13px] text-muted">{empty ?? "Nothing yet."}</p>;
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-col p-0">
      {events.map((e) => {
        const staff = staffOf(e.actor);
        const agent = isAgent(e.actor) ? e.actor : null;
        const who = agent ? AGENTS[agent].name : staff?.name ?? (e.actor === "payer" ? "Payer" : "Psyflo");
        return (
          <li key={e.id} className="flex items-start gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0">
            {agent ? (
              <ActorBadge actor={agent} size={22} />
            ) : staff ? (
              <span title={staff.name} className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-forest text-[11px] font-semibold text-white">{staff.initials}</span>
            ) : (
              <ActorBadge actor={e.actor === "payer" ? "payer" : "system"} size={22} />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-muted">
                <b className="font-semibold text-ink2">{who}</b> · {stamp(e.at)}
              </div>
              <div className="text-[13px] break-words">{e.action}</div>
              {e.detail ? <div className="mt-1 rounded-lg bg-tile px-2.5 py-1.5 text-[12px] break-words text-ink2">{e.detail}</div> : null}
            </div>
            {e.ai || agent ? <Pill tone="good" className="mt-0.5 shrink-0">{FLAG_LABEL.agent}</Pill> : null}
          </li>
        );
      })}
    </ol>
  );
}
