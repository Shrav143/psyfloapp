import type { LucideIcon } from "lucide-react";
import {
  Compass,
  FileText,
  PhoneCall,
  Radar,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Agent } from "@/lib/demo/agents";
import { cn } from "@/lib/tailwind-utils";

const ICONS: Record<Agent["icon"], LucideIcon> = {
  shield: ShieldCheck,
  compass: Compass,
  file: FileText,
  radar: Radar,
  phone: PhoneCall,
  scale: Scale,
  sparkles: Sparkles,
};

export function AgentIcon({
  icon,
  className,
}: {
  icon: Agent["icon"];
  className?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
