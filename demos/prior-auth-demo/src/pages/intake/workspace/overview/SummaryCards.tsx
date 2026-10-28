import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, Pill } from "@/components/ui";
import { programById } from "@/data/assess/programs";
import { documentsOnRecord } from "@/data/assess/readiness";
import { CONSENT_LABEL, type ConsentEntry } from "@/data/assess/types";
import { specOf } from "@/data/intake/fields";
import { staffOf } from "@/data/intake/seed";
import { METHOD_LABEL, type IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { serviceById } from "@/data/va/services";
import { longDate, stamp } from "@/lib/time";
import { workspaceHref } from "../nav";
import type { AuthState } from "../progress";

const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="flex gap-3 py-1.5 text-[13px]">
    <dt className="w-[96px] shrink-0 text-muted">{k}</dt>
    <dd className="min-w-0 flex-1 font-medium break-words">{children}</dd>
  </div>
);
const Open = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="inline-flex items-center gap-1 px-5 pb-3 text-[12px] font-semibold text-forest hover:underline">{children}<ArrowRight size={13} className="ico" /></Link>
);

export function ReferralSummary({ record: r }: { record: IntakeRecord }) {
  const reason = r.referral.reason?.value;
  return (
    <Card data-card="referral-summary" className="min-w-0">
      <CardHeader title="Referral" right={<Pill tone={r.urgency === "routine" ? "neutral" : r.urgency === "emergent" ? "risk" : "mid"}>{r.urgency === "routine" ? "Routine" : r.urgency === "emergent" ? "Emergent" : "Urgent"}</Pill>} />
      <dl className="divide-y divide-line px-5 py-2">
        <Row k="Source">{r.sourceOrg}</Row>
        <Row k="Received">{longDate(r.createdAt)} · {METHOD_LABEL[r.method]}</Row>
        <Row k="Reason">{reason ? <span className="line-clamp-3 font-normal">{reason}</span> : <span className="font-normal text-muted">Not entered yet</span>}</Row>
        <Row k="Documents">{documentsOnRecord(r) ? `${documentsOnRecord(r)} on the record` : "None on the record"}</Row>
      </dl>
      <Open to={workspaceHref(r.id, { section: "referral" })}>Open the referral</Open>
    </Card>
  );
}

/** The safety status in words that never say a person is safe: an open alert needs a clinician, a reviewed one says who reviewed it. */
export function SafetyStatus({ record: r }: { record: IntakeRecord }) {
  const a = r.safety;
  const tone: Tone = !a ? "neutral" : a.status === "open" ? "risk" : a.status === "escalated" ? "mid" : "good";
  const reviewer = a?.acknowledgedBy ? staffOf(a.acknowledgedBy)?.name ?? a.acknowledgedBy : undefined;
  return (
    <Card data-card="safety-status" className="min-w-0">
      <CardHeader title="Safety" right={<Pill tone={tone}>{!a ? "No alert on file" : a.status === "open" ? "Clinician review required" : a.status === "escalated" ? "Escalated, review not documented" : "Alert reviewed"}</Pill>} />
      <div className="px-5 py-3 text-[13px]">
        {!a ? <p>No safety alert is on file. A clinician documents the safety and risk screening in the clinical assessment.</p> : a.status === "acknowledged" ? <p>Reviewed by {reviewer ?? "staff"}{a.acknowledgedAt !== undefined ? `, ${stamp(a.acknowledgedAt)}` : ""}.</p> : <p>A clinician reviews the alert before routine scheduling.</p>}
        <p className="mt-1.5 text-[12px] text-muted">Psyflo does not decide that a person is safe.</p>
      </div>
      <Open to={workspaceHref(r.id, { section: "clinical" })}>Open the clinical assessment</Open>
    </Card>
  );
}

const CONSENT_TONE: Record<ConsentEntry["status"], Tone> = { on_file: "good", needed: "mid", declined: "risk", revoked: "risk", expired: "mid" };
const CONSENT_WORD: Record<ConsentEntry["status"], string> = { on_file: "On file", needed: "Needed", declined: "Declined", revoked: "Revoked", expired: "Expired" };
const PROFILE_CONSENTS = ["consentTreatment", "roi", "schoolConsent"] as const;

export function ConsentsSummary({ record: r }: { record: IntakeRecord }) {
  const ledger = r.consents ?? [];
  const fromProfile = PROFILE_CONSENTS.map((k) => ({ key: k, label: specOf(k)?.label ?? k, value: r.profile[k]?.value ?? "" })).filter((x) => x.value);
  const part2 = ledger.some((c) => c.type === "part2_disclosure") || (r.config ? programById(r.config.programId).category === "sud" : false);
  return (
    <Card data-card="consents" className="min-w-0">
      <CardHeader title="Consents" />
      {ledger.length || fromProfile.length ? (
        <ul className="divide-y divide-line px-5">
          {ledger.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1"><span className="block font-medium">{CONSENT_LABEL[c.type]}</span><span className="block text-[12px] text-muted">{c.recipient}</span></span>
              <Pill tone={CONSENT_TONE[c.status]}>{CONSENT_WORD[c.status]}</Pill>
            </li>
          ))}
          {fromProfile.map((c) => (
            <li key={c.key} className="flex items-start gap-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 font-medium">{c.label}</span>
              <Pill tone={/^(signed|on file)/i.test(c.value) ? "good" : /not applicable|not needed/i.test(c.value) ? "neutral" : "mid"}>{c.value}</Pill>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-3 text-[13px] text-muted">No consent is recorded yet.</p>
      )}
      {part2 ? <p className="px-5 pt-2 pb-3 text-[12px] text-muted">Substance use records need the patient's consent before they are shared. Organization protocol, not legal advice.</p> : null}
      <Open to={workspaceHref(r.id, { section: "patient", tab: "profile" })}>Open the patient profile</Open>
    </Card>
  );
}

export function CarePlanSummary({ record: r }: { record: IntakeRecord }) {
  const cp = r.carePlan;
  const picked = r.pathways.find((p) => p.status === "selected");
  const selected = cp?.selectedProgramId ? programById(cp.selectedProgramId).label : picked ? (picked.serviceId === "external" ? picked.externalLabel ?? "External program" : serviceById(picked.serviceId).label) : null;
  const status = cp?.status === "approved" ? { word: "Approved", tone: "good" as Tone } : cp?.status === "draft" ? { word: "Draft", tone: "mid" as Tone } : picked ? { word: "Service selected", tone: "neutral" as Tone } : { word: "Not started", tone: "neutral" as Tone };
  return (
    <Card data-card="care-summary" className="min-w-0">
      <CardHeader title="Care plan" right={<Pill tone={status.tone}>{status.word}</Pill>} />
      <dl className="divide-y divide-line px-5 py-2">
        <Row k="Service">{selected ?? <span className="font-normal text-muted">A clinician selects it</span>}</Row>
        {cp ? <Row k="Goals">{cp.goals.length ? `${cp.goals.length} written` : "None yet"}</Row> : null}
        {cp?.status === "approved" ? <Row k="Approved by">{staffOf(cp.approvedBy ?? "")?.name ?? cp.approvedBy ?? "A clinician"}{cp.approvedAt !== undefined ? `, ${stamp(cp.approvedAt)}` : ""}{cp.rolePlay ? " (demo role-play)" : ""}</Row> : null}
      </dl>
      <Open to={workspaceHref(r.id, { section: "care" })}>Open care planning</Open>
    </Card>
  );
}

export function AuthorizationSummary({ record: r, auth }: { record: IntakeRecord; auth: AuthState }) {
  return (
    <Card data-card="authorization-summary" className="min-w-0">
      <CardHeader title="Authorization" right={<Pill tone={auth.tone}>{auth.value}</Pill>} />
      <div className="px-5 py-3 text-[13px]">{auth.detail ?? "Nothing has been sent to a payer. A person prepares and sends the request."}</div>
      {auth.href ? <Open to={auth.href}>Open it</Open> : <Open to={workspaceHref(r.id, { section: "care" })}>Open care planning</Open>}
    </Card>
  );
}
