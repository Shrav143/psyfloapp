import { useMemo } from "react";
import { ActorBadge, AgentBadge, Disclosure } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { USER_NAME } from "@/data/payerConfig";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import type { CaseCtx } from "./caseTypes";
import { historyOf, type HistoryLine } from "./history";

const nameOf = (a: HistoryLine["actor"]): string => (a === "you" ? USER_NAME : a === "payer" ? "Payer" : a === "system" ? "Psyflo" : AGENTS[a].name);

/** Read-only History, closed by default: the request's events from the store, then what was done on this page. Each line says who did it, a person or a named agent. */
export function CaseHistory({ ctx }: { ctx: CaseCtx }) {
  const { detail, work } = ctx;
  const request = useStore((s) => s.requests.find((r) => r.id === detail.requestId));
  const lines = useMemo(() => historyOf(request, work.log), [request, work.log]);
  const last = lines.find((l) => !l.scheduled);
  return (
    <Disclosure
      title="History"
      summary={last ? `${lines.length} ${lines.length === 1 ? "event" : "events"} · latest: ${last.text}` : "Nothing has happened on this request yet"}
    >
      {lines.length === 0 ? (
        <p className="px-6 py-4 text-sm text-muted">Events appear here when an agent or a person acts on this request: drafts, applied actions, signatures, payer answers.</p>
      ) : (
        <ol aria-label="Request history" className="m-0 flex list-none flex-col p-0">
          {lines.map((l) => (
            <li key={l.key} className="flex items-start gap-3 border-b border-line px-6 py-3 last:border-b-0">
              {l.actor === "you" || l.actor === "payer" || l.actor === "system" ? <ActorBadge actor={l.actor} size={26} /> : <AgentBadge agent={l.actor} size={26} />}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">
                  <b className="font-semibold text-ink2">{nameOf(l.actor)}</b>
                  {l.actor === "you" ? " (you)" : l.actor === "payer" || l.actor === "system" ? "" : " (agent)"} · {l.scheduled ? `Scheduled ${stamp(l.at)}` : stamp(l.at)}
                </div>
                <div className={l.scheduled ? "text-[14px] text-muted" : "text-[14px]"}>{l.text}</div>
                {l.detail ? <div className="mt-1 rounded-lg bg-tile px-2.5 py-1.5 text-[13px] text-ink2">{l.detail}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Disclosure>
  );
}
