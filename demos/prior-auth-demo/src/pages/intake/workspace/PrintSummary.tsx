import { useEffect } from "react";
import { createPortal } from "react-dom";
import { programById } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import { READINESS_NOTE, trackSummary } from "@/data/assess/readiness";
import { effectiveStatus } from "@/data/assess/status";
import { staffOf } from "@/data/intake/seed";
import { TRIAGE_LABEL } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { stamp } from "@/lib/time";
import { statusReason } from "./statusReason";
import type { WorkspaceModel } from "./useWorkspaceModel";

/* Print summary: the overview as a clean page, drawn only while printing. It is a portal on <body>, so the print rules can hide the app and show just
   this, whatever the page's scroll containers do. */
const CSS = `@media screen { #ws-print { display: none; } }
@media print { body > *:not(#ws-print) { display: none !important; } #ws-print { display: block; color: #151b24; font-size: 12px; } @page { margin: 14mm; } }`;

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-4 mb-1 border-b border-[#d8d5ce] pb-0.5 text-[13px] font-semibold">{children}</h2>;

export function PrintSummary({ model, runId, onDone }: { model: WorkspaceModel; runId: number; onDone: () => void }) {
  const { record: r, plan, nav, readiness, signoff, next, needs, now } = model;
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const t = window.setTimeout(() => window.print(), 60);
    return () => {
      window.removeEventListener("afterprint", after);
      window.clearTimeout(t);
    };
  }, [runId, onDone]);
  const cfg = r.config;
  const status = effectiveStatus(r);
  const rows = nav.filter((i) => !["overview", "instrument", "documents", "activity"].includes(i.id));
  return createPortal(
    <div id="ws-print" data-print-summary>
      <style>{CSS}</style>
      <h1 className="text-[20px] font-semibold">Intake summary: {r.initials || "No patient yet"}{r.age !== null ? `, ${r.age}` : ""} ({r.id})</h1>
      <p>Synthetic demo record. Names appear as initials and age. Printed {stamp(now)}.</p>
      <H>Intake</H>
      <p>Status: {TRIAGE_LABEL[status]}. {statusReason(r, plan)}</p>
      <p>Next step: {next.text}.</p>
      <p>Payer: {(r.payerId ? vaPlanOf(r.payerId)?.name : undefined) ?? "No plan on file"}{r.coverage.medicaidId?.value ? ` (${r.coverage.medicaidId.value})` : ""}. Program: {cfg ? programById(cfg.programId).label : serviceById(r.serviceId).short}. Purpose: {cfg ? purposeById(cfg.purposeId).label : "Not set"}.</p>
      <p>Assigned to {staffOf(r.assignedTo)?.name ?? "no one"}. {siteName(r.site)}. Referral source: {r.sourceOrg}.</p>
      {plan ? <p>Framework: {plan.framework?.label ?? "None configured"}. Rule version {plan.version}, effective {plan.effective}.</p> : <p>The intake is not configured.</p>}
      <H>Sections and assessments</H>
      <ul className="list-disc pl-5">{rows.map((i) => <li key={i.id}>{i.label}{i.child ? ` (${i.detail?.toLowerCase()})` : ""}: {i.stateLabel || "n/a"}{i.preparation ? ", preparation" : ""}</li>)}</ul>
      <H>Sign-off</H>
      <p>{signoff.signed} of {signoff.total} required items signed. {signoff.overall ? `Signed off by ${staffOf(signoff.overall.by)?.name ?? signoff.overall.by}, ${stamp(signoff.overall.at)}, version ${signoff.overall.version}.` : "The overall sign-off is not signed."}</p>
      <H>Clinical readiness: {trackSummary(readiness.clinical)}</H>
      <ul className="list-disc pl-5">{readiness.clinical.items.filter((i) => i.status !== "complete" && i.status !== "na").map((i) => <li key={i.id}>{i.label}: {i.detail}</li>)}</ul>
      <H>Administrative readiness: {trackSummary(readiness.administrative)}</H>
      <ul className="list-disc pl-5">{readiness.administrative.items.filter((i) => i.status !== "complete" && i.status !== "na").map((i) => <li key={i.id}>{i.label}: {i.detail}</li>)}</ul>
      <p className="mt-1">{READINESS_NOTE}</p>
      <H>Safety</H>
      <p>{r.safety ? (r.safety.status === "open" ? "A safety alert is open. Clinician review required." : "A safety alert is on file and was reviewed.") : "No safety alert is on file."} Psyflo does not decide that a person is safe.</p>
      {needs.length ? <><H>Waiting on a person</H><ul className="list-disc pl-5">{needs.map((n) => <li key={n.key}>{n.text}</li>)}</ul></> : null}
      <H>Documents</H>
      <ul className="list-disc pl-5">{r.documents.length ? r.documents.map((d) => <li key={d.id}>{d.name}{d.attach ? " (attach to the authorization)" : ""}</li>) : <li>None on file</li>}</ul>
    </div>,
    document.body,
  );
}
