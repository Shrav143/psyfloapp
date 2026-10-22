import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { AgentBadge, Card, CardHeader, Pill, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { cn } from "@/lib/cn";
import { checkSummary, type IntegrityCheck } from "./checks";

const COLOR = { pass: "text-good", warn: "text-mid", block: "text-risk", checking: "text-forest" } as const;

/** The four checks. A pass is a green tick, a warning can be signed with an acknowledgement, a block cannot be signed. What each one found is under "What is missing". */
export function ChecksCard({ checks }: { checks: IntegrityCheck[] }) {
  const sum = checkSummary(checks);
  return (
    <Card>
      <CardHeader title="Checks" right={<Pill tone={sum.tone} dot>{sum.text}</Pill>} />
      <ul>
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 border-b border-line px-6 py-3 last:border-b-0">
            {c.state === "checking" ? <Spinner size={18} className="mt-0.5" /> : c.state === "pass" ? <CircleCheck size={18} className={cn("ico mt-0.5", COLOR.pass)} aria-label="Passed" /> : c.state === "warn" ? <CircleAlert size={18} className={cn("ico mt-0.5", COLOR.warn)} aria-label="Warning" /> : <CircleX size={18} className={cn("ico mt-0.5", COLOR.block)} aria-label="Blocked" />}
            <div className="min-w-0 flex-1">
              <div>{c.label}</div>
              {c.state === "checking" ? <div className="mt-0.5 text-[13px] text-muted">{c.details[0]}</div> : null}
            </div>
            <span title={AGENTS[c.agent].name}>
              <AgentBadge agent={c.agent} size={22} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
