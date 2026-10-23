import type { ReactNode } from "react";
import { CircleAlert, PanelRightOpen, RefreshCw } from "lucide-react";
import { Button, Label, Pill } from "@/components/ui";
import { payerById } from "@/data/seed";
import type { Tone } from "@/data/types";
import { mdyOf, type VerificationRecord } from "@/data/verification";
import { ago, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { buildResult } from "./checks";
import { exceptionLines, REQUIREMENT_LABEL } from "./exceptions";

const REQUIREMENT_TONE: Record<VerificationRecord["authRequirement"], Tone> = { required: "mid", concurrent: "mid", not_required: "good", unknown: "neutral" };
const PROVIDER: Record<VerificationRecord["provider"], { text: string; tone: Tone }> = {
  in_network: { text: "In network", tone: "good" },
  out_of_network: { text: "Out of network", tone: "risk" },
  unconfirmed: { text: "Not confirmed", tone: "mid" },
};

/** "Last verified Tue 10:44 am, 2 min ago. Simulated source." on the demo clock. */
export function lastVerifiedText(rec: Pick<VerificationRecord, "checkedAt">, clock: number): string {
  return `Last verified ${stamp(rec.checkedAt)}, ${ago(rec.checkedAt, clock)}. Simulated source.`;
}

/** What an authorization on file has left, as one line: "AU-1042 · Residential 3.5 · 10 of 21 days used, 11 left". */
export function existingAuthText(a: NonNullable<VerificationRecord["existingAuth"]>): string {
  const left = Math.max(0, a.approved - a.used);
  return `${a.ref} · ${a.service} · ${mdyOf(a.from)} to ${mdyOf(a.to)} · ${a.used} of ${a.approved} ${a.unit} used, ${left === 0 ? "none left" : `${left} left`}`;
}

/** The warnings of a record, one line each, in a single quiet block. Used under the summary and in the details panel. */
export function ExceptionList({ record }: { record: VerificationRecord }) {
  const lines = exceptionLines(record);
  if (!lines.length) return null;
  return (
    <ul aria-label="Warnings" className="flex flex-col gap-2 rounded-2xl border border-mid-edge bg-mid-bg px-4 py-3 text-mid-ink">
      {lines.map((l) => (
        <li key={l.code} className="flex items-start gap-2.5 text-[13px]">
          <CircleAlert size={16} className="ico mt-[3px] shrink-0" aria-hidden="true" />
          <span>
            <b className="font-semibold">{l.title}.</b> {l.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, chip, tone, children }: { label: string; chip?: string; tone?: Tone; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,150px)_1fr] items-start gap-x-4 gap-y-1 border-b border-line py-2.5 last:border-b-0 max-[640px]:grid-cols-1">
      <dt className="pt-0.5 text-[13px] text-muted">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px]">
        {chip ? <Pill tone={tone ?? "neutral"}>{chip}</Pill> : null}
        {children ? <span className="min-w-0 text-ink2">{children}</span> : null}
      </dd>
    </div>
  );
}

/** What one check found, in the order a person reads it: coverage, plan type and routing, benefits, the authorization requirement, provider participation,
    an authorization already on file, then the warnings. The same record shows on Eligibility & Benefits and in step 2 of New Case.
    `compact` keeps it to the chips and the warnings, for a step that already says the rest. */
export function VerificationSummary({ record, onRefresh, onDetails, compact }: { record: VerificationRecord; onRefresh?: () => void; onDetails?: () => void; compact?: boolean }) {
  const clock = useStore((s) => s.clock);
  const busy = useStore((s) => s.ebRechecking.includes(record.id));
  const { summary } = buildResult(record.row);
  const provider = PROVIDER[record.provider];
  const payer = payerById(record.payerId);
  const buttons =
    onRefresh || onDetails ? (
      <div className="flex flex-wrap items-center gap-2">
        {onRefresh ? (
          <Button size={compact ? "sm" : "md"} icon={RefreshCw} loading={busy} onClick={onRefresh}>
            Refresh verification
          </Button>
        ) : null}
        {onDetails ? (
          <Button size={compact ? "sm" : "md"} icon={PanelRightOpen} onClick={onDetails}>
            View full verification details
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <section aria-label="Verification summary" className="rounded-[20px] border border-edge bg-white px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label>Coverage and benefits{payer ? ` · ${payer.shortName}` : ""}</Label>
          <p className="mt-0.5 text-[12px] text-muted">{lastVerifiedText(record, clock)}</p>
        </div>
        {compact ? null : buttons}
      </div>
      {compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill tone={summary.coverage.tone} dot>
            Coverage: {summary.coverage.chip.toLowerCase()}
          </Pill>
          <Pill tone={summary.benefits.tone}>Benefits: {summary.benefits.chip.toLowerCase()}</Pill>
          <Pill tone={REQUIREMENT_TONE[record.authRequirement]}>Authorization: {REQUIREMENT_LABEL[record.authRequirement].toLowerCase()}</Pill>
          <Pill tone={provider.tone}>Provider: {provider.text.toLowerCase()}</Pill>
        </div>
      ) : (
        <dl aria-label="What the check found" className="mt-3">
          <Row label="Coverage" chip={summary.coverage.chip} tone={summary.coverage.tone}>
            {summary.coverage.line}
          </Row>
          {record.planType ? (
            <Row label="Plan type and routing">
              {record.planType}. {record.routing}
            </Row>
          ) : null}
          <Row label="Benefits" chip={summary.benefits.chip} tone={summary.benefits.tone}>
            {summary.benefits.line}
            {record.costShare ? `. Patient pays: ${record.costShare}` : ""}
          </Row>
          <Row label="Authorization" chip={REQUIREMENT_LABEL[record.authRequirement]} tone={REQUIREMENT_TONE[record.authRequirement]}>
            {record.authRequirement === "concurrent" ? `${payer?.shortName ?? "The payer"} reviews each stay while an authorization is on file. A review is needed to continue.` : summary.auth.line}
          </Row>
          <Row label="Provider" chip={provider.text} tone={provider.tone}>
            {record.provider === "unconfirmed" ? "Enrollment with the plan could not be confirmed" : null}
          </Row>
          <Row label="Existing authorization">{record.existingAuth ? existingAuthText(record.existingAuth) : "None on file"}</Row>
        </dl>
      )}
      {record.exceptions.length ? (
        <div className="mt-3">
          <ExceptionList record={record} />
        </div>
      ) : null}
      {compact && buttons ? <div className="mt-3">{buttons}</div> : null}
    </section>
  );
}
