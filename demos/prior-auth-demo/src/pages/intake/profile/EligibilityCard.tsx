import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, PauseCircle, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { AgentChip, Banner, Button, Card, CardBody, CardHeader, CheckBox, Pill } from "@/components/ui";
import { simulateEligibility } from "@/data/intake/ext/profile";
import { ROLE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { longDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { SimulatedTag } from "../shared/provenance";
import { followUpsAfterCheck, precheck, STATUS_TONE, STATUS_WORD } from "./coverageModel";
import { RequestDialog } from "./Requests";
import { VerifyDialog } from "./VerifyDialog";

const ACTION = "Check eligibility (simulated)";

/** The status the agent card and the section header show: Paused, Checking, Blocked, Ready or the response's status. */
export function useVerifyStatus(record: IntakeRecord): { word: string; tone: "good" | "mid" | "risk" | "neutral"; checking: boolean; paused: boolean } {
  const paused = useStore((s) => s.agentPaused.verify);
  const checking = record.tasks.some((t) => t.role === "eligibility" && t.action === ACTION && (t.status === "queued" || t.status === "running"));
  const pre = precheck(record);
  const c = record.eligibility;
  if (paused) return { word: "Paused", tone: "mid", checking, paused };
  if (checking) return { word: "Checking", tone: "neutral", checking, paused };
  if (!pre.ready) return { word: "Blocked", tone: "risk", checking, paused };
  if (c.status === "not_checked" || c.checkedAt === undefined) return { word: "Ready to check", tone: "neutral", checking, paused };
  return { word: STATUS_WORD[c.status], tone: STATUS_TONE[c.status], checking, paused };
}

const jump = (field: string) => document.querySelector(`[data-field="${field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });

/** The Identity & Eligibility Agent: is there enough to verify, run the (simulated) check, and what came back. */
export function EligibilityCard({ record, now }: { record: IntakeRecord; now: number }) {
  const status = useVerifyStatus(record);
  const [verifying, setVerifying] = useState(false);
  const [asking, setAsking] = useState(false);
  const pre = precheck(record);
  const c = record.eligibility;
  const checked = c.checkedAt !== undefined && c.status !== "not_checked";
  const plan = vaPlanOf(record.payerId ?? "");
  const svc = serviceById(record.serviceId);
  const staleSvc = checked && c.serviceId && c.serviceId !== record.serviceId ? serviceById(c.serviceId) : null;

  const run = () => {
    runAgent(record.id, {
      role: "eligibility", action: ACTION, section: "coverage", source: `${plan?.name ?? "Medicaid"} eligibility response (simulated)`, approval: "none", ms: 1500,
      work: () => {
        const st = useStore.getState();
        const r = st.intakes.find((x) => x.id === record.id);
        if (!r) return;
        const contract = st.planReadiness.find((p) => p.payerId === r.payerId)?.items.contract?.state === "confirmed";
        const check = simulateEligibility(r, { at: st.clock, now, contractConfirmed: contract });
        st.setEligibilityCheck(r.id, check);
        const follow = followUpsAfterCheck(r, check);
        follow.forEach((f) => st.addCoverageFollowUp(r.id, { ...f, by: "agent" }));
        return `${STATUS_WORD[check.status]}${check.payerId ? ` with ${vaPlanOf(check.payerId)?.name ?? check.payerId}` : ""} (simulated)${follow.length ? `; ${follow.length} follow-up${follow.length === 1 ? "" : "s"} created` : ""}`;
      },
    });
  };

  return (
    <Card data-card="eligibility-agent">
      <CardHeader title={ROLE_LABEL.eligibility} right={<><AgentChip agent="verify" /><Pill tone={status.tone}>{status.word}</Pill></>} />
      <CardBody className="space-y-3">
        {status.paused ? (
          <Banner tone="mid" icon={PauseCircle} title="Verify is paused in Settings" action={<Link to={paths.settings()} className="text-[13px] font-semibold text-forest hover:underline">Open Settings</Link>}>
            The Identity & Eligibility Agent does nothing until it is resumed. Staff can still verify coverage by calling the plan.
          </Banner>
        ) : null}
        {c.status === "inactive" || c.status === "uncertain" ? (
          <Banner tone={c.status === "inactive" ? "risk" : "mid"} title={c.status === "inactive" ? "Coverage inactive" : "Coverage uncertain"}>
            {c.status === "inactive" ? "The simulated response shows no active coverage on the check date." : "The simulated response leaves coverage unclear for the service dates."} Confirm with the plan before relying on it.
          </Banner>
        ) : null}
        {staleSvc ? <Banner tone="mid" title="The service changed after the check">The last check was for {staleSvc.short}. Check again for {svc.short}.</Banner> : null}

        <div>
          <div className="mb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Enough to verify?</div>
          <ul className="divide-y divide-line">
            {pre.items.map((i) => (
              <li key={i.key} data-precheck={i.key} className="flex items-start gap-3 py-2">
                <CheckBox state={i.state === "done" ? "done" : i.state === "warn" ? "warn" : "missing"} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{i.label}</div>
                  <div className={i.state === "done" ? "text-[13px] text-ink2" : "text-[13px] text-mid-ink"}>{i.detail}</div>
                </div>
                {i.state === "missing" && i.key === "medicaidId" ? (
                  <div className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1">
                    <button type="button" onClick={() => jump("coverage.medicaidId")} className="text-[12px] font-semibold text-forest hover:underline">Add below</button>
                    <button type="button" onClick={() => setAsking(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline"><Send size={12} className="ico" />Ask the {record.age !== null && record.age < 18 ? "guardian" : "patient"}</button>
                  </div>
                ) : i.state !== "done" && i.section === "profile" ? (
                  <Link to={paths.intakeRecord(record.id, "profile")} className="shrink-0 text-[12px] font-semibold text-forest hover:underline">Open Patient profile</Link>
                ) : i.state === "missing" && i.key === "plan" ? (
                  <button type="button" onClick={() => document.querySelector('[data-conflict="plan"]')?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 text-[12px] font-semibold text-forest hover:underline">Choose the plan</button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={checked ? RefreshCw : ShieldCheck} loading={status.checking} disabled={!pre.ready} onClick={run}>
            {checked ? "Check again (simulated)" : ACTION}
          </Button>
          {checked && c.status !== "conflict" ? <Button icon={BadgeCheck} onClick={() => setVerifying(true)}>Mark verified</Button> : null}
          {!pre.ready ? <span className="text-[12px] text-risk-ink">Blocked until {pre.missing.join(", ")} {pre.missing.length === 1 ? "is" : "are"} on file.</span> : null}
        </div>

        {checked ? (
          <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl bg-tile/70 px-3.5 py-3 text-[13px]" data-response="eligibility">
            <dt className="text-muted">Response</dt>
            <dd className="flex flex-wrap items-center gap-2"><Pill tone={STATUS_TONE[c.status]}>{STATUS_WORD[c.status]}</Pill><SimulatedTag what="Simulated response" /></dd>
            <dt className="text-muted">Checked</dt>
            <dd>{stamp(c.checkedAt as number)} by Verify</dd>
            <dt className="text-muted">Medicaid ID</dt>
            <dd>{record.coverage.medicaidId?.value || "Not on file"}</dd>
            <dt className="text-muted">Plan in the response</dt>
            <dd>{c.payerId ? `${vaPlanOf(c.payerId)?.name ?? c.payerId} · ${vaPlanOf(c.payerId)?.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care MCO"}` : "Not listed"}</dd>
            <dt className="text-muted">Coverage period</dt>
            <dd>{c.coverageFrom !== undefined ? `${longDate(c.coverageFrom)} to ${c.coverageTo !== undefined ? longDate(c.coverageTo) : "no end date listed"}` : "Not listed"}</dd>
            <dt className="text-muted">Requested service</dt>
            <dd>{svc.label}{svc.code ? ` (${svc.code})` : ""} · planned start {longDate(record.serviceDate)}</dd>
            {c.existingAuth ? (
              <>
                <dt className="text-muted">Existing authorization</dt>
                <dd>{c.existingAuth}</dd>
              </>
            ) : null}
            <dt className="text-muted">Exceptions</dt>
            <dd>{c.exceptions.length || c.conflicts.length ? <ul className="list-disc space-y-0.5 pl-4">{[...c.conflicts, ...c.exceptions].map((x) => <li key={x}>{x}</li>)}</ul> : "None"}</dd>
          </dl>
        ) : null}
      </CardBody>
      {verifying ? <VerifyDialog record={record} onClose={() => setVerifying(false)} /> : null}
      {asking ? <RequestDialog record={record} preset={["medicaidId"]} onClose={() => setAsking(false)} /> : null}
    </Card>
  );
}
