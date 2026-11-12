import type { ReactNode } from "react";
import { ActorBadge } from "./Agent";
import { Pill } from "./Pill";
import { AGENTS } from "@/data/agents";
import type { AgentKey, Tone } from "@/data/types";
import { stamp } from "@/lib/time";

/* One History list for every record (an authorization, a denial): who did what and when, newest first, with one standard flag on the right.
   Flags: Agent (a Psyflo agent did it), Decision (the payer decided), Logged decision (a person logged it by hand), Scheduled (planned, not done). */

export type HistoryFlag = "agent" | "decision" | "logged" | "scheduled";

export interface HistoryItem {
  key: string;
  at: number;
  actor: AgentKey | "you" | "payer" | "system";
  text: string;
  detail?: ReactNode;
  /** Leave it out to let the feed pick: agent actor → Agent, payer → Decision, scheduled → Scheduled. */
  flag?: HistoryFlag | null;
  /** Tone of a Decision flag: good approved, mid part, risk denied. */
  tone?: Tone;
  scheduled?: boolean;
}

export const FLAG_LABEL: Record<HistoryFlag, string> = { agent: "Agent", decision: "Decision", logged: "Logged decision", scheduled: "Scheduled" };

const isAgent = (a: HistoryItem["actor"]): a is AgentKey => a !== "you" && a !== "payer" && a !== "system";

export function flagOf(item: HistoryItem): HistoryFlag | null {
  if (item.flag !== undefined) return item.flag;
  if (item.scheduled) return "scheduled";
  if (item.actor === "payer") return "decision";
  if (isAgent(item.actor)) return "agent";
  return null;
}

export function HistoryFeed({ items, you, label = "History", empty }: { items: HistoryItem[]; you: string; label?: string; empty?: ReactNode }) {
  if (!items.length) return <p className="px-5 py-3 text-[13px] text-muted">{empty ?? "Nothing yet."}</p>;
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-col p-0">
      {items.map((l) => {
        const flag = flagOf(l);
        const who = l.actor === "you" ? you : l.actor === "payer" ? "Payer" : l.actor === "system" ? "Psyflo" : AGENTS[l.actor].name;
        return (
          <li key={l.key} className="flex items-start gap-3 border-b border-line px-5 py-2.5 last:border-b-0">
            <ActorBadge actor={l.actor} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-muted">
                <b className="font-semibold text-ink2">{who}</b> · {l.scheduled ? `Scheduled ${stamp(l.at)}` : stamp(l.at)}
              </div>
              <div className={l.scheduled ? "text-[13px] text-muted" : "text-[13px]"}>{l.text}</div>
              {l.detail ? <div className="mt-1 rounded-lg bg-tile px-2.5 py-1.5 text-[12px] text-ink2">{l.detail}</div> : null}
            </div>
            {flag ? (
              <Pill tone={flag === "decision" ? l.tone ?? "neutral" : flag === "agent" ? "good" : "neutral"} className="mt-0.5 shrink-0">
                {FLAG_LABEL[flag]}
              </Pill>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
