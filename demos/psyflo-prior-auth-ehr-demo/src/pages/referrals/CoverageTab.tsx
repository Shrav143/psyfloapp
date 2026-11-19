import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentChip, Banner, Button, Card, CardBody, CardHeader, Pill, Spinner } from "@/components/ui";
import type { CoverageKind, Referral } from "@/data/referrals";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { clockTime, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";

const KIND: Record<CoverageKind, { tone: "good" | "mid" | "risk"; text: string }> = {
  cleared: { tone: "good", text: "Everything checks out. The referral can be admitted as soon as it is accepted." },
  auth_first: { tone: "mid", text: "Everything checks out except the authorization. Billing is safe once the payer approves. Accept the referral, then continue with it from this page." },
  lapsed: { tone: "risk", text: "Coverage ended before the service date. Do not bill until the plan is confirmed. Ask the referrer or the patient about a renewal." },
  unconfirmed: { tone: "mid", text: "There is no insurance on the referral, so Verify has nothing to look up." },
};
const ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;
const ICON_COLOR = { pass: "text-good", warn: "text-mid", fail: "text-risk" } as const;
const PILL = { pass: "good", warn: "mid", fail: "risk" } as const;

function Running({ started, payerName }: { started: number; payerName: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const step = Math.min(3, Math.floor((now - started) / 1000));
  const steps = [`Eligibility with ${payerName}`, "Benefits and plan", "Authorization rule and network status"];
  return (
    <Card>
      <CardHeader title="Verify is checking coverage" subtitle="This takes a few seconds." right={<AgentChip agent="verify" />} />
      <CardBody>
        <ul className="flex flex-col gap-3.5" aria-live="polite">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3", i > step && "text-faint")}>
              {i < step ? <span className="grid h-5 w-5 place-items-center rounded-full bg-good-bg text-good"><Check size={13} className="ico" /></span> : i === step ? <Spinner size={20} /> : <span className="h-5 w-5 rounded-full border-[1.5px] border-[#D9D0C3]" />}
              <span className={cn(i === step && "font-semibold")}>{s}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/** Verify's answer: is the patient covered, what does the plan need before admission. */
export function CoverageTab({ r }: { r: Referral }) {
  const nav = useNavigate();
  const run = useStore((s) => s.runCoverageCheck);
  const started = useStore((s) => s.coverageRunning[r.id]);
  // Once the referral is a request, Eligibility can lead back to the request as well as to the referral.
  const requestId = useStore((s) => s.requests.find((x) => x.referralId === r.id)?.id ?? r.requestId);
  const payerName = r.payerId ? payerById(r.payerId).name : "the payer";
  const full = (
    <Button trailing={ArrowRight} onClick={() => nav(paths.eligibilityVerify({ referral: r.id, ...(requestId ? { case: requestId } : {}) }))}>Open full Eligibility &amp; Benefits check</Button>
  );

  if (started !== undefined) return <Running started={started} payerName={payerName} />;

  if (!r.coverage) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 py-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-neutral-bg text-ink2"><ShieldCheck size={22} className="ico" /></span>
          <h3 className="font-serif text-[18px] font-semibold">Coverage has not been checked</h3>
          <p className="max-w-md text-sm text-muted">
            Verify looks up eligibility, the plan, the authorization rule and the program's network status.
            {r.payerId ? ` It will check ${payerName} for ${r.patient.initials}.` : " This referral lists no insurance, so Verify will report that it cannot confirm coverage."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={ShieldCheck} onClick={() => run(r.id)}>Run coverage check</Button>
            {full}
          </div>
          <AgentChip agent="verify" />
        </CardBody>
      </Card>
    );
  }

  const c = r.coverage;
  const k = KIND[c.kind];
  return (
    <div className="flex flex-col gap-4">
      <Banner tone={k.tone} title={c.headline}>{k.text}</Banner>
      <div className="flex flex-wrap gap-3">
        <Button icon={RefreshCw} onClick={() => run(r.id)}>Check again</Button>
        {full}
      </div>
      <Card>
        <CardHeader title="Payment checks" subtitle="Every line has to pass for the program to be reimbursed" right={<Pill tone="neutral" dot>Checked live at {clockTime(toDate(c.at))}</Pill>} />
        <ul>
          {c.lines.map((l) => {
            const Icon = ICON[l.state];
            return (
              <li key={l.label} className="flex items-start gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
                <Icon size={22} className={cn("ico mt-0.5", ICON_COLOR[l.state])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{l.label}</div>
                  <div className="text-[13px] text-muted">{l.detail}</div>
                </div>
                <Pill tone={PILL[l.state]} dot>{l.chip}</Pill>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line px-6 py-3.5 text-[13px] text-ink2">{c.note}</div>
      </Card>
    </div>
  );
}
