import { useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { AgentBadge } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { cn } from "@/lib/cn";
import { PaymentChecks } from "./PaymentChecks";
import type { AgentLine, CheckResult } from "./checks";

const secs = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/** One row per agent that took part; a row opens to the answer it gave. One is open at a time. */
export function AgentRows({ agents }: { agents: AgentLine[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul aria-label="What the agents checked">
      {agents.map((a, i) => (
        <li key={a.label} className="border-b border-line">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-6 py-2.5 text-left hover:bg-[#FBF8F3]">
            <AgentBadge agent={a.agent} size={30} />
            <span className="flex-1">{a.label}</span>
            <span className="text-xs text-muted">{secs(a.secs)}</span>
            <ChevronDown size={15} className={cn("ico text-faint transition-transform", open === i && "rotate-180")} aria-hidden="true" />
          </button>
          {open === i ? <div className="psy-fade-up mx-6 mb-3 rounded-lg bg-tile px-3 py-2 text-[13px] text-ink2">{a.answer}</div> : null}
        </li>
      ))}
    </ul>
  );
}

/** "6 of 7 pass" with what did not, in one line. A check that could not run is not counted as a failure. */
export function checksSummary(result: CheckResult): string {
  const real = result.checks.filter((c) => !c.unknown);
  const pass = real.filter((c) => c.tone === "good").length;
  const look = real.filter((c) => c.tone === "mid").length;
  const fail = real.filter((c) => c.tone === "risk").length;
  const skipped = result.checks.length - real.length;
  if (!real.length) return "Nothing could be checked, so there are no payment checks to read yet.";
  const bits = [`${pass} of ${real.length} pass`, look ? `${look} need${look === 1 ? "s" : ""} a look` : "", fail ? `${fail} failed` : "", skipped ? "the rest could not be checked" : ""].filter(Boolean);
  return `${bits.join(", ")}. Every line has to pass for the clinic to be reimbursed.`;
}

/** "Verify, Criteria, Navigator, 0:12 in all. Next check: ..." */
export function howSummary(result: CheckResult, nextLines: string[]): string {
  const names = [...new Set(result.agents.map((a) => AGENTS[a.agent].name))];
  const total = result.agents.reduce((n, a) => n + a.secs, 0);
  return `${names.join(", ")}, ${secs(total)} in all. Next check: ${nextLines[0]}`;
}

/** The two sections behind a summary, for the details panel: the payment checks, and the agents' answers with the next checks. */
export function DetailSections({ result, nextLines }: { result: CheckResult; nextLines: string[] }) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Payment checks">
        <h3 className="font-serif text-[19px] font-semibold leading-tight">Payment checks</h3>
        <p className="mt-0.5 mb-3 text-[13.5px] text-muted">{checksSummary(result)}</p>
        <div className="overflow-hidden rounded-[20px] border border-edge bg-white">
          <PaymentChecks result={result} showPays={false} />
        </div>
      </section>
      <section aria-label="How this was checked">
        <h3 className="font-serif text-[19px] font-semibold leading-tight">How this was checked</h3>
        <p className="mt-0.5 mb-3 text-[13.5px] text-muted">{howSummary(result, nextLines)}</p>
        <div className="overflow-hidden rounded-[20px] border border-edge bg-white">
          <AgentRows agents={result.agents} />
          <ul aria-label="Next checks" className="flex flex-col gap-2.5 px-6 py-[18px]">
            {nextLines.map((n) => (
              <li key={n} className="flex items-center gap-2.5 text-sm">
                <CalendarClock size={16} className="ico text-muted" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
