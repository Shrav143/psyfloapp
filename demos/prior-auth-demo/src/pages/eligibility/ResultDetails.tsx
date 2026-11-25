import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AgentBadge, HistoryFeed, type HistoryItem } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { cn } from "@/lib/cn";
import { PaymentChecks } from "./PaymentChecks";
import type { AgentLine, CheckResult } from "./checks";

const secs = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/** One row per agent that took part; a row opens to the answer it gave. One is open at a time. */
export function AgentRows({ agents }: { agents: AgentLine[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul aria-label="What the agents checked" className="[&>li:last-child]:border-b-0">
      {agents.map((a, i) => (
        <li key={a.label} className="border-b border-line">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[14px] hover:bg-[#FAF9F6]">
            <AgentBadge agent={a.agent} size={26} />
            <span className="flex-1">{a.label}</span>
            <span className="text-xs text-muted">{secs(a.secs)}</span>
            <ChevronDown size={15} className={cn("ico text-faint transition-transform", open === i && "rotate-180")} aria-hidden="true" />
          </button>
          {open === i ? <div className="psy-fade-up mx-5 mb-3 rounded-lg bg-tile px-3 py-2 text-[13px] text-ink2">{a.answer}</div> : null}
        </li>
      ))}
    </ul>
  );
}

/** "6 of 7 pass, 1 needs a look". A check that could not run is not counted as a failure. */
export function checksSummary(result: CheckResult): string {
  const real = result.checks.filter((c) => !c.unknown);
  const pass = real.filter((c) => c.tone === "good").length;
  const look = real.filter((c) => c.tone === "mid").length;
  const fail = real.filter((c) => c.tone === "risk").length;
  const skipped = result.checks.length - real.length;
  if (!real.length) return "Nothing could be checked";
  return [`${pass} of ${real.length} pass`, look ? `${look} need${look === 1 ? "s" : ""} a look` : "", fail ? `${fail} failed` : "", skipped ? "the rest not checked" : ""].filter(Boolean).join(", ");
}

/** "Verify, Criteria, Navigator · 0:12" */
export function howSummary(result: CheckResult): string {
  const names = [...new Set(result.agents.map((a) => AGENTS[a.agent].name))];
  return `${names.join(", ")} · ${secs(result.agents.reduce((n, a) => n + a.secs, 0))}`;
}

function Section({ label, summary, children }: { label: string; summary?: string; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-serif text-[16px] font-semibold leading-tight">{label}</h3>
        {summary ? <span className="text-[13px] text-muted">{summary}</span> : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-edge bg-white">{children}</div>
    </section>
  );
}

/** The three sections behind a result, for the details panel: the payment checks, how the agents checked, and History. */
export function DetailSections({ result, history, you }: { result: CheckResult; history: HistoryItem[]; you: string }) {
  return (
    <div className="flex flex-col gap-5">
      <Section label="Payment checks" summary={checksSummary(result)}>
        <PaymentChecks result={result} />
      </Section>
      <Section label="How this was checked" summary={howSummary(result)}>
        <AgentRows agents={result.agents} />
      </Section>
      <Section label="History">
        <HistoryFeed items={history} you={you} />
      </Section>
    </div>
  );
}
