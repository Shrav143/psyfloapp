import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { countMetric, METRICS, type MetricId } from "./metrics";

const TILE: Record<Tone, string> = {
  good: "bg-good-bg text-good-ink border-good-edge",
  mid: "bg-mid-bg text-mid-ink border-mid-edge",
  risk: "bg-risk-bg text-risk-ink border-risk-edge",
  neutral: "bg-white text-ink border-edge",
};

/** The eight operational figures, computed from the records in view (site and Program already applied). Each tile filters the queue. */
export function IntakeMetrics({ records }: { records: IntakeRecord[] }) {
  const [params, setParams] = useSearchParams();
  const clock = useStore((s) => s.clock);
  const active = params.get("metric");
  const counts = useMemo(() => METRICS.map((m) => countMetric(m, records, clock)), [records, clock]);
  const toggle = (id: MetricId) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (n.get("metric") === id) n.delete("metric");
      else n.set("metric", id);
      return n;
    });
  return (
    <section aria-label="Intake figures" className="@container">
      <div className="grid grid-cols-2 gap-2.5 @min-[560px]:grid-cols-4 @min-[1060px]:grid-cols-8">
      {METRICS.map((m, i) => {
        const on = active === m.id;
        return (
          <button
            key={m.id}
            type="button"
            data-metric={m.id}
            aria-pressed={on}
            onClick={() => toggle(m.id)}
            className={cn("flex min-h-[92px] flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition-colors hover:brightness-[0.98]", TILE[m.tone], on && "outline-2 outline-offset-2 outline-forest")}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-[18px] leading-tight font-semibold tabular-nums">{counts[i]}</span>
              {on ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Check size={12} className="ico" />
                  Filtering
                </span>
              ) : null}
            </span>
            <span className="mt-1 text-[12px] leading-snug font-semibold">{m.label}</span>
            <span className="mt-auto pt-0.5 text-[11px] opacity-80">{m.sub}</span>
          </button>
        );
      })}
      </div>
    </section>
  );
}
