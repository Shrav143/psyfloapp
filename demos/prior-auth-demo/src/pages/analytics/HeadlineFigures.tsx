import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { InfoTip, Sparkline } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Figure, FigureId } from "./board";

const TONE: Record<FigureId, string> = { approval: "#2F6F5C", denial: "#B5553A", firstPass: "#2F6F5C", time: "#1D4F43", preventable: "#8F6620", appeals: "#2F6F5C" };

function Change({ f }: { f: Figure }) {
  if (!f.change) return <div className="mt-2 text-[12px] text-muted">No earlier period to compare</div>;
  const Icon = f.change.dir === "up" ? TrendingUp : f.change.dir === "down" ? TrendingDown : Minus;
  return (
    <div className={cn("mt-2 flex items-center gap-1.5 text-[12px] font-medium", f.change.good === null ? "text-ink2" : f.change.good ? "text-good" : "text-risk")} data-testid={`change-${f.id}`}>
      <Icon size={15} className="ico" aria-hidden="true" />
      {f.change.text}
    </div>
  );
}

/** The six figures an owner reads first, each with twelve months behind it and the change against the earlier period. A figure opens the cases it counts. */
export function HeadlineFigures({ figures, onOpen }: { figures: Figure[]; onOpen: (f: Figure) => void }) {
  return (
    <section aria-label="Headline figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {figures.map((f) => {
        const [num, unit] = f.value.endsWith(" days") ? [f.value.replace(" days", ""), "days"] : [f.value, ""];
        return (
          <div key={f.id} className="relative" data-testid={`figure-${f.id}`}>
            <button type="button" onClick={() => onOpen(f)} className="flex h-full w-full flex-col rounded-[20px] border border-edge bg-white px-5 py-[18px] text-left transition-colors hover:bg-[#FBF8F3]">
              <span className="pr-8 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{f.label}</span>
              <span className="mt-2.5 flex items-end justify-between gap-4">
                <span className="text-[24px] leading-none font-semibold tracking-tight tabular-nums">
                  {num}
                  {unit ? <span className="ml-1.5 text-[16px] font-medium text-ink2">{unit}</span> : null}
                </span>
                <span className="h-[38px] w-[46%] max-w-[160px]">
                  <Sparkline fluid area data={f.spark} width={160} height={38} color={TONE[f.id]} label={`${f.label}, last 12 months`} />
                </span>
              </span>
              <Change f={f} />
              <span className="mt-1 text-[12px] text-muted">{f.sub}</span>
            </button>
            <div className="absolute top-3 right-3">
              <InfoTip label={`About ${f.label.toLowerCase()}`} align="end">
                {f.info}
              </InfoTip>
            </div>
          </div>
        );
      })}
    </section>
  );
}
