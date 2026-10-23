import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button, Drawer, Label, Pill } from "@/components/ui";
import { needsCaller } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { dosRangeText, type VerificationRecord } from "@/data/verification";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { buildResult } from "./checks";
import { patientLabel } from "./chips";
import { autoState, DUE_AT } from "./recheck";
import { DetailSections } from "./ResultDetails";
import { ExceptionList, existingAuthText, lastVerifiedText } from "./VerificationSummary";

function Part({ label, chip, tone, unknown, children }: { label: string; chip: string; tone: "good" | "mid" | "risk" | "neutral"; unknown?: boolean; children: string }) {
  return (
    <div className="border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[14px]">
        <Pill tone={unknown ? "neutral" : tone} dot>
          {chip}
        </Pill>
        <span className="min-w-0 text-ink2">{children}</span>
      </div>
    </div>
  );
}

/** The full result of one check in a right-hand panel: what it found, the warnings, the payment checks, how it was checked and what it is about.
    On the Eligibility result page the summary is already there, so the panel opens on the secondary detail only. Elsewhere it ends with a button to open the full result. */
export function VerificationDetailsPanel({ record, open, onClose }: { record: VerificationRecord; open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const here = useLocation().pathname === paths.eligibilityResult(record.id);
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused.verify);
  const result = useMemo(() => buildResult(record.row), [record.row]);
  const payer = payerById(record.payerId);
  const auto = autoState(record.row, clock, paused);
  const next = auto && auto.kind !== "done" ? [`${DUE_AT(auto.at)}, ${auto.kind === "paused" ? "waiting for Verify to be resumed" : "done by Verify on its own"}`, ...result.next] : result.next;
  const { coverage, benefits, auth } = result.summary;
  const facts: [string, string][] = [
    ["Payer", payer ? `${payer.name} (${payer.group})` : record.payerId],
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-muted">This panel is a summary. The full result has the actions.</span>
            <Button variant="primary" icon={ExternalLink} onClick={() => nav(paths.eligibilityResult(record.id))}>
              Open the full result
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-6">
        {here ? null : (
          <section aria-label="Result" className="rounded-[20px] border border-edge bg-white px-6 py-5">
            <Part label="Eligibility" chip={coverage.chip} tone={coverage.tone} unknown={coverage.unknown}>
              {coverage.line}
            </Part>
            <Part label="Benefits" chip={benefits.chip} tone={benefits.tone} unknown={benefits.unknown}>
              {[benefits.line, benefits.limit, benefits.pays ? `Patient pays: ${benefits.pays}` : null].filter(Boolean).join(". ")}
            </Part>
            <Part label="What this service needs" chip={auth.chip} tone={auth.tone} unknown={auth.unknown}>
              {auth.line}
            </Part>
            {record.existingAuth ? (
              <div className="pt-3 text-[13px] text-muted">
                <b className="font-semibold text-ink2">Existing authorization.</b> {existingAuthText(record.existingAuth)}
              </div>
            ) : null}
          </section>
        )}
        {record.exceptions.length ? <ExceptionList record={record} /> : null}
        <DetailSections result={result} nextLines={next} />
        <section aria-label="About this check">
          <h3 className="font-serif text-[18px] font-semibold leading-tight">About this check</h3>
          <dl className="mt-3 flex flex-col gap-1.5 rounded-[20px] border border-edge bg-white px-6 py-4 text-[13px]">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[150px_1fr] gap-x-4 max-[560px]:grid-cols-1">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 text-ink2">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">Active coverage does not mean this service is covered. Check the benefits and the authorization requirement.</p>
        </section>
      </div>
    </Drawer>
  );
}
