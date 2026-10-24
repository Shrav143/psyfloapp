import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui";

const STEP_MS = 800;
/** The checks Connect and Reconnect both run. */
export const CONNECT_CHECKS = ["Reaching the system", "Signing in with read-only access", "Reading one test record"];

/** A read-only connection test: three checks run one after the other. Calls onPassed when the last one finishes. */
export function ConnectionTest({ checks, onPassed }: { checks: string[]; onPassed: () => void }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= checks.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [done, checks.length]);
  // Reporting twice is harmless: the parent only sets a flag.
  useEffect(() => {
    if (done >= checks.length) onPassed();
  }, [done, checks.length, onPassed]);
  return (
    <ol className="flex flex-col gap-3" aria-label="Connection test">
      {checks.map((c, i) => (
        <li key={c} className="flex items-center gap-3">
          {i < done ? <CheckCircle2 size={18} className="ico text-good" aria-label="Passed" /> : i === done ? <Spinner /> : <span className="h-[18px] w-[18px] rounded-full border border-field" />}
          <span className={i > done ? "text-muted" : undefined}>{c}</span>
        </li>
      ))}
      {done >= checks.length ? <li className="rounded-xl bg-good-bg px-3.5 py-2.5 text-sm text-good-ink">The test passed. Access is read-only, and nothing is written back.</li> : null}
    </ol>
  );
}
