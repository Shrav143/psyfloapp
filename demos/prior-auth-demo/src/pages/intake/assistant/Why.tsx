import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Explain } from "./needs";

/** "Why am I suggesting this": the reason, the source it comes from and the rule behind it. Closed until asked. */
export function Why({ explain, label, className }: { explain: Explain; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("block", className)}>
      <button type="button" aria-expanded={open} aria-label={`Why: ${label}`} onClick={() => setOpen((o) => !o)} className="text-[12px] font-semibold text-forest hover:underline">
        {open ? "Hide why" : "Why?"}
      </button>
      {open ? (
        <dl data-why className="mt-1.5 w-full space-y-1 rounded-lg bg-tile px-2.5 py-2 text-[12px] text-ink2">
          <div><dt className="inline font-semibold">Why: </dt><dd className="inline">{explain.why}</dd></div>
          <div><dt className="inline font-semibold">Source: </dt><dd className="inline">{explain.source}</dd></div>
          {explain.rule ? <div><dt className="inline font-semibold">Rule: </dt><dd className="inline">{explain.rule}</dd></div> : null}
          <div className="text-muted">AI suggested. Simulated. A person decides.</div>
        </dl>
      ) : null}
    </div>
  );
}
