import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Keeps the page behind a full-screen panel from scrolling while the panel is open. */
export function useBodyLock(): void {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

const BARS = 18;
const IDLE = Array.from({ length: BARS }, (_, i) => 0.12 + ((i * 7) % 5) * 0.03);

/** A simulated input level. It moves only while "recording"; no microphone is ever opened. */
export function LevelMeter({ active, className }: { active: boolean; className?: string }) {
  const [levels, setLevels] = useState(IDLE);
  useEffect(() => {
    if (!active || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setLevels(IDLE.map(() => 0.15 + Math.random() * 0.85)), 140);
    return () => window.clearInterval(t);
  }, [active]);
  const shown = active ? levels : IDLE;
  return (
    <div role="img" aria-label={active ? "Simulated audio level, recording" : "Simulated audio level, not recording"} className={cn("flex h-7 w-[90px] items-end gap-[2px]", className)}>
      {shown.map((l, i) => (
        <i key={i} className={cn("block w-[3px] rounded-full transition-[height] duration-100", active ? "bg-forest" : "bg-faint/50")} style={{ height: `${Math.round(l * 100)}%` }} />
      ))}
    </div>
  );
}

/** A round icon in a chosen color (IconBubble's colors cannot be overridden, since class names are not merged). */
export function Bubble({ icon: Icon, size = 34, className }: { icon: LucideIcon; size?: number; className: string }) {
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full", className)} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} className="ico" />
    </span>
  );
}
