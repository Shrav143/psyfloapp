import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, InfoTip, Pill } from "@/components/ui";
import { AUTH_KINDS, authorizationFrom, requirementDate, rulesFor } from "@/data/intake/ext/profile";
import type { EligibilityCheck, EligibilityDetermination, IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { availableOn } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { longDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { actorName, SimulatedTag } from "../shared/provenance";
import { RuleRow, RuleStatus } from "./bits";
import { reviewerOf } from "./model";

type W = { word: string; tone: Tone };
const MEMBER: Record<EligibilityCheck["member"], W> = { yes: { word: "Eligible", tone: "good" }, no: { word: "Not eligible", tone: "risk" }, unknown: { word: "Unknown", tone: "mid" } };
const BENEFIT: Record<EligibilityCheck["benefit"], W> = { yes: { word: "Covered", tone: "good" }, no: { word: "Not covered", tone: "risk" }, unknown: { word: "Unknown", tone: "mid" }, pending_policy: { word: "Pending policy", tone: "mid" } };
const NETWORK: Record<EligibilityCheck["network"], W> = { yes: { word: "In network", tone: "good" }, no: { word: "Out of network", tone: "risk" }, unknown: { word: "Not confirmed", tone: "mid" } };
export const AUTH_WORD: Record<EligibilityCheck["authorization"], W> = {
  required: { word: "Authorization required", tone: "mid" }, registration: { word: "Registration required", tone: "neutral" }, not_required: { word: "No authorization needed", tone: "good" },
  pending_policy: { word: "Pending DMAS policy", tone: "mid" }, existing: { word: "Existing authorization", tone: "good" }, unknown: { word: "Unknown", tone: "neutral" },
};
const NOT_CHECKED: W = { word: "Not checked", tone: "neutral" };

function Row({ n, id, label, value, detail, meta, children }: { n: number; id: string; label: string; value: W; detail: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <li data-determination={id} className="rounded-xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold">
          <span className="mr-1.5 text-muted tabular-nums">{n}.</span>
          {label}
        </span>
        <Pill tone={value.tone}>{value.word}</Pill>
      </div>
      <p className="mt-1 text-[13px] text-ink2">{detail}</p>
      {meta ? <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">{meta}</div> : null}
      {children}
    </li>
  );
}

/** Says, for one determination, whether it is the simulated response or confirmed by a person with the plan. */
function Provenance({ c, k, base }: { c: EligibilityCheck; k: EligibilityDetermination; base: ReactNode }) {
  const v = c.verified?.[k];
  if (v) {
    return (
      <span data-verified={k} className="font-medium text-good-ink">
        Verified by staff: {actorName(v.by)}, by {v.method === "phone" ? "phone" : "plan portal"} · {stamp(v.at)}
        {v.ref ? ` · reference ${v.ref}` : ""}
      </span>
    );
  }
  return <>{base}</>;
}

/** The five separate determinations. They are never merged: an active member does not have a benefit, a network contract, medical necessity or an authorization. */
export function DeterminationsCard({ record, now }: { record: IntakeRecord; now: number }) {
  const preview = useStore((s) => s.policyPreview) === "redesign";
  const c = record.eligibility;
  const checked = c.checkedAt !== undefined && c.status !== "not_checked";
  const svc = serviceById(record.serviceId);
  const date = requirementDate(record, now);
  const rules = rulesFor(record, now);
  const authRules = rules.filter((r) => AUTH_KINDS.includes(r.kind));
  const other = rules.filter((r) => !AUTH_KINDS.includes(r.kind));
  const auth = authorizationFrom(record, rules, date);
  const reviewer = reviewerOf(record.payerId);
  const sim = checked ? (
    <>
      <SimulatedTag what="Simulated response" />
      <span>{stamp(c.checkedAt as number)} · Verify</span>
    </>
  ) : null;
  const pending = "Waits for the eligibility check.";
  return (
    <Card data-card="determinations">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1">
            Coverage determinations
            <InfoTip label="About the five determinations">Member eligibility, benefit coverage, network participation, medical necessity and the authorization requirement are separate. An active Medicaid member does not automatically have an approved service authorization.</InfoTip>
          </span>
        }
        right={<span className="text-[12px] text-muted">5 separate</span>}
      />
      <CardBody>
        <ol className="space-y-2.5">
          <Row n={1} id="member" label="Member eligibility" value={checked ? MEMBER[c.member] : NOT_CHECKED} detail={checked ? (c.notes?.member ?? "As the response gives it.") : pending} meta={checked ? <Provenance c={c} k="member" base={sim} /> : null} />
          <Row n={2} id="benefit" label={`Benefit coverage: ${svc.short}`} value={checked ? BENEFIT[c.benefit] : NOT_CHECKED} detail={checked ? (c.notes?.benefit ?? "As the response gives it.") : pending} meta={checked ? <Provenance c={c} k="benefit" base={sim} /> : null} />
          <Row n={3} id="network" label="Network participation" value={checked ? NETWORK[c.network] : NOT_CHECKED} detail={checked ? (c.notes?.network ?? "As the response gives it.") : pending} meta={checked ? <Provenance c={c} k="network" base={sim} /> : null} />
          <Row n={4} id="necessity" label="Medical necessity" value={{ word: "Not determined", tone: "neutral" }} detail="Not determined. Clinical review and the payer decide." />
          <Row
            n={5}
            id="authorization"
            label="Authorization requirement"
            value={AUTH_WORD[auth]}
            detail={`From Psyflo's policy rules for ${svc.short}, not from the payer. An active member does not have an approved authorization.`}
            meta={
              <>
                <span>Rules in effect on {longDate(date)}{date === record.serviceDate ? " (planned start)" : preview ? " (policy preview)" : " (today)"} ·</span>
                <Provenance c={c} k="authorization" base={<span>not yet confirmed with the plan</span>} />
              </>
            }
          >
            {!availableOn(record.serviceId, date) ? (
              <p className="mt-2 rounded-lg bg-risk-bg px-2.5 py-1.5 text-[12px] text-risk-ink">
                {svc.status === "retiring" ? `${svc.short} is not available on ${longDate(date)}: it ended June 30, 2027.` : `${svc.short} is not available on ${longDate(date)}: it starts July 1, 2027.`}
              </p>
            ) : null}
            {record.legacy && auth === "existing" ? <p className="mt-2 text-[12px] text-ink2">On file: {record.legacy.authorizationId}, through {longDate(record.legacy.authEnds)}.</p> : null}
            {reviewer ? <p className="mt-2 text-[12px] text-ink2"><span className="font-semibold">Who reviews authorizations:</span> {reviewer}</p> : null}
            <ul className="mt-1 divide-y divide-line">
              {authRules.map((r) => <RuleRow key={r.id} rule={r} />)}
            </ul>
            {other.length ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                Also for this service:
                {other.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1">
                    {r.label} <RuleStatus status={r.status} />
                  </span>
                ))}
                <Link to={paths.intakeRecord(record.id, "cans")} className="font-semibold text-forest hover:underline">See CANS & Level of Need</Link>
              </p>
            ) : null}
          </Row>
        </ol>
      </CardBody>
    </Card>
  );
}
