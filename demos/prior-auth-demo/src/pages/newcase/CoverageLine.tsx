import { useEffect, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Banner, Button, Drawer, Pill, Spinner } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { verdictOf } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { buildResult, coverageChips } from "@/pages/eligibility/checks";
import { PaymentChecks } from "@/pages/eligibility/PaymentChecks";
import { coverageFor, coverageKey } from "./intake";

const CHECK_MS = 1200;

/** "Coverage checked": Verify runs the same check as the Eligibility tab as soon as the payer, level of care and member ID are set. */
export function CoverageLine({ draft }: { draft: CaseDraft }) {
  const clock = useStore((s) => s.clock);
  const setCoverage = useStore((s) => s.setCaseCoverage);
  const patch = useStore((s) => s.patchCaseDraft);
  const [view, setView] = useState(false);
  const key = coverageKey(draft);
  const pending = key !== null && draft.coverage?.key !== key;

  useEffect(() => {
    if (!key || !pending) return;
    const t = setTimeout(() => {
      const p = coverageFor(draft, clock);
      if (p) setCoverage(draft.id, { key, verdict: verdictOf(p), at: clock });
    }, CHECK_MS);
    return () => clearTimeout(t);
    // The check is keyed on what the person typed; re-running on every other change of the draft would restart the timer.
  }, [key, pending]);

  if (!key) {
    return (
      <Banner icon={Info}>
        <b>Coverage is checked for you.</b> Add the payer, level of care and member ID and Verify will check it.
      </Banner>
    );
  }
  if (pending) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-bg px-[18px] py-3.5 text-sm text-neutral-ink" role="status">
        <Spinner />
        <span>
          <b>Verify is checking coverage</b> with {payerById(draft.payerId ?? "summit").shortName}
        </span>
      </div>
    );
  }
  const p = coverageFor(draft, clock);
  if (!p) return null;
  const result = buildResult(p);
  const verdict = result.verdict;
  return (
    <>
      <Banner
        tone={verdict === "fix" ? "risk" : "good"}
        title={verdict === "fix" ? "Coverage needs a fix" : "Coverage checked"}
        action={
          <Button size="sm" variant="ghost" aria-label="View coverage checks" onClick={() => setView(true)}>
            View
          </Button>
        }
      >
        {verdict === "fix" ? result.reason : verdict === "cleared" ? "Active, service covered, no authorization needed." : "Active, service covered, authorization required."}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coverageChips(p).map((c) => (
            <Pill key={c.text} tone={c.tone}>
              {c.text}
            </Pill>
          ))}
        </div>
        {verdict === "fix" ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => patch(draft.id, { payerId: null, planType: "" })}>
              Choose another payer
            </Button>
            <Button size="sm" icon={RefreshCw} onClick={() => setCoverage(draft.id, null)}>
              Check again
            </Button>
          </div>
        ) : null}
      </Banner>
      <Drawer
        open={view}
        onClose={() => setView(false)}
        title="Coverage checked"
        subtitle={`${payerById(p.payerId).name} · ${result.headline}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              icon={RefreshCw}
              onClick={() => {
                setCoverage(draft.id, null);
                setView(false);
              }}
            >
              Check again
            </Button>
            <Button variant="primary" onClick={() => setView(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="rounded-[20px] border border-edge bg-white">
          <PaymentChecks result={result} />
        </div>
      </Drawer>
    </>
  );
}
