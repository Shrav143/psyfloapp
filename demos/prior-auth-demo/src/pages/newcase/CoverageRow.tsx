import { useId, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ChecklistItem, Drawer } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { buildResult } from "@/pages/eligibility/checks";
import { PaymentChecks } from "@/pages/eligibility/PaymentChecks";
import { coverageFor } from "./intake";
import type { Row } from "./recordsModel";

/** Verify's answer on coverage. A problem offers another payer; "View checks" opens the same seven checks as the Eligibility tab. */
export function CoverageRow({ row, draft, clock }: { row: Row; draft: CaseDraft; clock: number }) {
  const labelId = useId();
  const [view, setView] = useState(false);
  const patch = useStore((s) => s.patchCaseDraft);
  const setCoverage = useStore((s) => s.setCaseCoverage);
  const p = row.state === "done" || row.state === "warn" ? coverageFor(draft, clock) : null;
  const result = p ? buildResult(p) : null;

  return (
    <ChecklistItem
      state={row.state}
      label={<span id={labelId}>{row.label}</span>}
      detail={row.detail}
      action={
        result ? (
          <>
            {row.state === "warn" ? (
              <Button size="sm" aria-describedby={labelId} onClick={() => patch(draft.id, { payerId: null, planType: "" })}>
                Choose another payer
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => setView(true)}>
              View checks
            </Button>
          </>
        ) : null
      }
    >
      {view && p && result ? (
        <Drawer
          open
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
      ) : null}
    </ChecklistItem>
  );
}
