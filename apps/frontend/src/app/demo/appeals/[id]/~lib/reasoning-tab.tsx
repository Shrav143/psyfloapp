"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReasoningCard } from "@/lib/demo/appeals";
import { cn } from "@/lib/tailwind-utils";

const TONE: Record<
  ReasoningCard["tone"],
  { className: string; icon: typeof Info; label: string }
> = {
  info: {
    className: "border-blue-200 bg-blue-50 text-blue-950",
    icon: Info,
    label: "Context",
  },
  good: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: CircleCheck,
    label: "Supports appeal",
  },
  warn: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    icon: TriangleAlert,
    label: "Fix in packet",
  },
};

export function ReasoningTab({ cards }: { cards: ReasoningCard[] }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-600 text-xs">
        How the Advocate agent judged the denial. Each card cites what it read;
        the clinician can disagree in the letter.
      </p>
      {cards.map((c) => {
        const t = TONE[c.tone];
        const Icon = t.icon;
        return (
          <div
            key={c.title}
            className={cn("rounded-lg border p-4", t.className)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Icon className="size-4" /> {c.title}
              </div>
              <span className="text-[11px] uppercase tracking-wide opacity-70">
                {t.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{c.body}</p>
          </div>
        );
      })}
    </div>
  );
}
