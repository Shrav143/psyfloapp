import { useId } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import type { DoGo, DoItem } from "@/lib/doNext";
import { cn } from "@/lib/cn";

/** What to do now: a few plain sentences, each with one button. Worked out by FLO from the live data (lib/doNext.ts), so it moves with the clock,
    with every reply and with the site in view. Terracotta marks a time inside a day or already past. */
export function DoNext({ items, moreToday, onGo, onShowMore }: { items: DoItem[]; moreToday: number; onGo: (go: DoGo) => void; onShowMore: () => void }) {
  const uid = useId();
  return (
    <Card>
      <CardHeader title="Do next" subtitle="Suggested by FLO from today's demo data" />
      {items.length === 0 ? (
        <p className="px-6 py-8 text-[14px] text-muted">Nothing needs you right now.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.key} data-do={i.key} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3.5">
              <div className="min-w-0 flex-1 basis-[280px]">
                <p id={`${uid}-${i.key}`} className="text-[14px] font-medium">
                  {i.sentence}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {i.who}
                  {i.when ? (
                    <>
                      {" · "}
                      <span className={cn(i.urgent && "text-risk-ink")}>{i.when}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <Button variant="primary" size="sm" aria-describedby={`${uid}-${i.key}`} onClick={() => onGo(i.go)}>
                {i.button}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {moreToday > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 border-t border-line px-6 py-3 text-[13px] text-muted">
          {moreToday} more {moreToday === 1 ? "needs" : "need"} you today.
          <Button variant="ghost" size="sm" onClick={onShowMore}>
            Show them in the table
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
