import { AGENTS, CREW } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import { cn } from "@/lib/cn";

/** The small tinted circle with the agent's icon. */
export function AgentBadge({ agent, size = 32, className }: { agent: AgentKey; size?: number; className?: string }) {
  const a = AGENTS[agent];
  const c = CREW[a.crew];
  const Icon = a.icon;
  return (
    <span title={`${a.name}: ${a.role}`} className={cn("inline-grid shrink-0 place-items-center rounded-full", className)} style={{ width: size, height: size, background: c.bg, color: c.color }}>
      <Icon size={Math.round(size * 0.5)} className="ico" />
    </span>
  );
}

/** Circle plus name, used where an agent is acting ("Navigator"). */
export function AgentChip({ agent, className }: { agent: AgentKey; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-neutral-bg py-0.5 pr-2.5 pl-[3px]", className)}>
      <AgentBadge agent={agent} size={20} />
      <span className="text-xs font-semibold">{AGENTS[agent].name}</span>
    </span>
  );
}

/** Icon for non-agent actors in a timeline. */
export function ActorBadge({ actor, size = 22 }: { actor: AgentKey | "you" | "payer" | "system"; size?: number }) {
  if (actor !== "you" && actor !== "payer" && actor !== "system") return <AgentBadge agent={actor} size={size} />;
  const label = actor === "you" ? "You" : actor === "payer" ? "Payer" : "Psyflo";
  return (
    <span title={label} className="inline-grid shrink-0 place-items-center rounded-full bg-forest text-[10px] font-semibold text-white" style={{ width: size, height: size, background: actor === "payer" ? "#6B4E3A" : "#1D4F43" }}>
      {actor === "you" ? "JP" : actor === "payer" ? "P" : "Ps"}
    </span>
  );
}
