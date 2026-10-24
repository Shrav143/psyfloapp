import { useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button, Drawer, Pill } from "@/components/ui";
import { needsCaller } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type Tone } from "@/data/types";
import { dosRangeText, type VerificationRecord } from "@/data/verification";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { buildResult } from "./checks";
import { patientLabel } from "./chips";
import { verificationHistory } from "./history";
import { DetailSections } from "./ResultDetails";
import { ExceptionList, existingAuthText, lastVerifiedText } from "./VerificationSummary";

function Row({ label, chip, tone, unknown, children }: { label: string; chip?: string; tone?: Tone; unknown?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-baseline gap-x-4 border-b border-line px-5 py-2.5 last:border-b-0 max-[560px]:grid-cols-1">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-ink2">
        {chip ? (
          <Pill tone={unknown ? "neutral" : (tone ?? "neutral")} dot>
            {chip}
          </Pill>
        ) : null}
        <span className="min-w-0">{children}</span>
      </dd>
    </div>
  );
}

/** The full result of one check in a right-hand panel: payment checks, how it was checked and History.
    On the Eligibility result page everything else is already on the page, so the panel holds only that. Elsewhere (New Case) it opens with what the check found
    and the facts, and ends with a button to the full result. */
export function VerificationDetailsPanel({ record, open, onClose }: { record: VerificationRecord; open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const here = useLocation().pathname === paths.eligibilityResult(record.id);
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused.verify);
  const { viewer } = useScope();
  const result = useMemo(() => buildResult(record.row), [record.row]);
  const history = verificationHistory(record, result.nextCheckAt, clock, paused);
  const payer = payerById(record.payerId);
  const { coverage, benefits, auth } = result.summary;
  const facts: [string, string][] = [
    ...(record.planType ? ([["Plan type and routing", `${record.planType}. ${record.routing}`]] as [string, string][]) : []),
    ["Member", record.memberMasked],
    ["Dates of service", dosRangeText(record.row)],
    ["Last verified", lastVerifiedText(record, clock).replace("Last verified ", "")],
    ["Source", needsCaller(record.payerId) ? "Simulated check, confirmed by phone" : "Simulated check against the payer portal"],
  ];
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={640}
      title="Verification details"
      subtitle={`${patientLabel(record.row)} · ${payer?.name ?? ""} · ${record.row.levelLabel ?? PROGRAM_LABEL[record.program]}`}
      footer={
        here ? undefined : (
          <div className="flex justify-end">
            <Button variant="primary" icon={ExternalLink} onClick={() => nav(paths.eligibilityResult(record.id))}>
              Open the full result
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {here ? null : (
          <>
            <dl aria-label="Result" className="overflow-hidden rounded-2xl border border-edge bg-white">
              <Row label="Eligibility" chip={coverage.chip} tone={coverage.tone} unknown={coverage.unknown}>
                {coverage.line}
              </Row>
              <Row label="Benefits" chip={benefits.chip} tone={benefits.tone} unknown={benefits.unknown}>
                {[benefits.line, benefits.limit].filter(Boolean).join(" · ")}
              </Row>
              {benefits.pays ? <Row label="Patient pays">{benefits.pays}</Row> : null}
              <Row label="What this service needs" chip={auth.chip} tone={auth.tone} unknown={auth.unknown}>
                {auth.line}
              </Row>
              {record.existingAuth ? <Row label="Existing authorization">{existingAuthText(record.existingAuth)}</Row> : null}
              {facts.map(([k, v]) => (
                <Row key={k} label={k}>
                  {v}
                </Row>
              ))}
            </dl>
            <ExceptionList record={record} />
          </>
        )}
        <DetailSections result={result} history={history} you={viewer.name} />
      </div>
    </Drawer>
  );
}
