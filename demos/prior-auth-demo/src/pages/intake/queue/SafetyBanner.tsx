import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { ROLE_AGENT, ROLE_LABEL, type IntakeAgentRole, type IntakeRecord, type SafetyAlert } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { actorName, SourceLink } from "../shared/provenance";
import { ACTION_DONE, CloseReviewButton, EscalateButton, ESCALATIONS } from "./SafetyActions";

const NOT_SAFE = "Psyflo does not decide that a person is safe.";

/** "Reader (Referral Agent)" for an agent, the person's name otherwise. */
function raisedByLabel(id: string): string {
  if (!(id in AGENTS)) return actorName(id);
  const role = (Object.keys(ROLE_AGENT) as IntakeAgentRole[]).find((k) => ROLE_AGENT[k] === id);
  return `${actorName(id)}${role ? ` (${ROLE_LABEL[role]})` : ", an agent"}`;
}

function Provenance({ record, a }: { record: IntakeRecord; a: SafetyAlert }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      {a.source ? (
        <span className="inline-flex items-center gap-1">
          Source: <SourceLink record={record} source={a.source} />
        </span>
      ) : null}
      <span>Raised by {raisedByLabel(a.raisedBy)} · {stamp(a.raisedAt)}</span>
    </div>
  );
}

/** The human-review safety alert. Open: a risk banner with the evidence, who raised it and the escalation steps. Escalated: one line that stays,
    still waiting for a clinician to document the review. Reviewed: one line that stays. No agent can close or downgrade it. */
export function SafetyBanner({ record }: { record: IntakeRecord }) {
  const [more, setMore] = useState(false);
  const a = record.safety;
  if (!a) return null;
  const text = a.text.replace(/\s*Psyflo does not decide that a person is safe\.?/i, "").trim();
  const who = a.acknowledgedBy ? actorName(a.acknowledgedBy) : "staff";
  const when = a.acknowledgedAt !== undefined ? stamp(a.acknowledgedAt) : "";

  if (a.status === "acknowledged") {
    return (
      <div data-safety="reviewed" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-good-edge bg-good-bg px-5 py-2.5 text-[13px] text-good-ink">
        <CheckCircle2 size={16} className="ico" />
        <span className="font-semibold">Safety reviewed by {who} at {when}</span>
        {a.note ? <span className="min-w-0 text-ink2">{a.note}</span> : null}
        <span className="text-muted">Raised {stamp(a.raisedAt)} by {raisedByLabel(a.raisedBy)}</span>
      </div>
    );
  }

  if (a.status === "escalated") {
    return (
      <section data-safety="escalated" aria-label="Safety alert" className="rounded-2xl border border-risk-edge bg-risk-bg px-5 py-3 text-risk-ink">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ShieldAlert size={18} className="ico shrink-0" />
          <span className="text-[14px] font-semibold">Escalated: {a.action ? ACTION_DONE[a.action] : "in progress"}</span>
          <span className="text-[13px]">by {who} at {when}{a.note ? ` · ${a.note}` : ""}</span>
          <Pill tone="risk">Review not documented</Pill>
          <span className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>{more ? "Hide escalation steps" : "More escalation steps"}</Button>
            <CloseReviewButton record={record} />
          </span>
        </div>
        {more ? <div className="mt-2.5 flex flex-wrap gap-2">{ESCALATIONS.map((e) => <EscalateButton key={e.id} record={record} action={e} size="sm" />)}</div> : null}
        <p className="mt-1.5 text-[13px] text-ink">{text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3">
          <Provenance record={record} a={a} />
          <span className="text-[12px] font-semibold">{NOT_SAFE}</span>
        </div>
      </section>
    );
  }

  return (
    <section data-safety="open" role="alert" aria-label="Safety alert" className="rounded-2xl border border-risk-edge bg-risk-bg px-5 py-4 text-risk-ink">
      <div className="flex items-start gap-3">
        <ShieldAlert size={20} className="ico mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] leading-tight font-semibold">Safety concern: a clinician must review now</h2>
            <Pill tone="risk">Open</Pill>
          </div>
          <p className="mt-1.5 text-[14px] text-ink">{text}</p>
          <div className="mt-1.5">
            <Provenance record={record} a={a} />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold">{NOT_SAFE} A person reviews every safety concern.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ESCALATIONS.map((e) => <EscalateButton key={e.id} record={record} action={e} />)}
            <span className="hidden h-6 w-px bg-risk-edge sm:inline-block" aria-hidden="true" />
            <CloseReviewButton record={record} />
          </div>
        </div>
      </div>
    </section>
  );
}
