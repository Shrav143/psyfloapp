import { Eye } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { CHECK_EVIDENCE, DOC_TITLE, issueCount } from "@/data/referrals";
import type { IntakeRecord } from "@/data/intake/types";
import type { ReferralCheck } from "@/data/referralTypes";
import type { Tone } from "@/data/types";
import { longDate } from "@/lib/time";
import type { DocSpot } from "./FieldRow";

const TONE: Record<ReferralCheck["state"], Tone> = { pass: "good", warn: "mid", fail: "risk" };
const WORD: Record<ReferralCheck["state"], string> = { pass: "Present", warn: "Check this", fail: "Not met" };

/** The nine document checks Reader ran on the earlier referral list: whether each required item is in the documents, and what is missing. They carry over
    as they were. Each can point at the evidence in the document. */
export function DocumentChecks({ record, onShow }: { record: IntakeRecord; onShow: (s: DocSpot) => void }) {
  const checks = record.referralChecks;
  if (!checks?.length) return null;
  const open = issueCount(checks);
  return (
    <Card data-card="Document checks">
      <CardHeader title="Document checks" subtitle={`${checks.length - open} of ${checks.length} in order${open ? ` · ${open} to look at` : ""} · from the earlier referral list`} />
      <CardBody className="py-1">
        <ul>
          {checks.map((c) => {
            const spot = { docId: `doc-${record.id}-${c.doc}`, blockId: CHECK_EVIDENCE[c.key] };
            const resolved = c.state !== "pass" && c.resolved;
            return (
              <li key={c.key} data-doc-check={c.key} data-doc-check-state={c.state} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-line py-3 last:border-b-0">
                <div className="min-w-0 flex-1 basis-[240px]">
                  <div className="text-[13px] font-semibold text-ink2">{c.label}</div>
                  <p className="mt-0.5 text-[13px] text-ink2">{c.detail}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {DOC_TITLE[c.doc]}
                    {resolved ? ` · ${c.resolved?.how === "override" ? `Overridden: ${c.resolved.reason ?? "no reason recorded"}` : "Resolved by the referrer's reply"} (${longDate(c.resolved?.at ?? 0)})` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill tone={resolved ? "neutral" : TONE[c.state]}>{resolved ? "Resolved" : WORD[c.state]}</Pill>
                  <Button size="sm" variant="ghost" icon={Eye} onClick={() => onShow(spot)} aria-label={`Show ${c.label} in the document`}>Show</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
