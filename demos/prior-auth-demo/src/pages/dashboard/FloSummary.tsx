import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { summaryLines } from "@/lib/floFacts";
import { useStore } from "@/store";

/** Two or three plain lines FLO works out from the demo data each time the requests, the queue, the ledger or the clock change. A recommendation, never a payer fact. */
export function FloSummary() {
  const requests = useStore((s) => s.requests);
  const queueItems = useStore((s) => s.queueItems);
  const ledger = useStore((s) => s.ledger);
  const clock = useStore((s) => s.clock);
  const lines = useMemo(() => summaryLines({ requests, queueItems, ledger, clock }), [requests, queueItems, ledger, clock]);
  return (
    <section aria-labelledby="flo-summary" className="rounded-[20px] border border-edge bg-white px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-white">
          <Sparkles size={14} className="ico" />
        </span>
        <h2 id="flo-summary" className="font-serif text-[19px] font-semibold leading-tight tracking-tight">
          Summary from FLO
        </h2>
        <span className="text-xs text-muted" title="FLO's reading of the demo data. A recommendation for a person to check, not a payer fact.">
          From today's demo data
        </span>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {lines.map((l) => (
          <li key={l.id} data-line={l.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 text-[14.5px] text-ink2">{l.text}</span>
            <Link to={l.link.to} className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-forest hover:underline">
              {l.link.label}
              <ArrowRight size={14} className="ico" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
