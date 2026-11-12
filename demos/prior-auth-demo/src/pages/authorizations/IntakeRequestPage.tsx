import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Chip, Crumbs, Disclosure, HistoryFeed, KeyValue, Page, PageHeader, Pill } from "@/components/ui";
import { isModuleSigned, selectedServiceOf, serviceName } from "@/data/assess/carePlan";
import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { viewerById } from "@/data/viewers";
import { diagnosesOfIntake } from "@/pages/newcase/fromIntake";
import { narrativeOf } from "@/pages/newcase/narrative";
import { AI_DRAFT_TAG, NOT_DOCUMENTED } from "@/pages/newcase/recordNarrative";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { historyOf } from "./history";

const who = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a clinician");

/** What the intake record documents for this request, one line each, every one a link into the workspace. Nothing is made up: what the record does not hold says "Not documented in the intake". */
function recordRows(r: IntakeRecord): [string, React.ReactNode][] {
  const link = (to: string, text: string) => <Link to={to} className="font-medium text-forest hover:underline">{text}</Link>;
  const dx = r.referral.dxDocumented?.value;
  const codes = diagnosesOfIntake(r).map((d) => d.code).join(", ");
  const signed = Object.keys(r.instruments ?? {}).filter((id) => isModuleSigned(r, id as ModuleId));
  const scores = signed.flatMap((id) => {
    const s = r.instruments?.[id]?.score;
    return s?.value ? [`${moduleById(id as ModuleId).label}: ${s.value}`] : [];
  });
  const sel = selectedServiceOf(r);
  const c = r.carePlan;
  return [
    ["Diagnosis as documented", dx ? <>{dx} {link(paths.intakeRecord(r.id, "referral"), "Referral")}</> : codes ? <>Codes the record names: {codes}. {link(paths.intakeRecord(r.id, "referral"), "Referral")}</> : <span className="font-normal text-muted">{NOT_DOCUMENTED}</span>],
    ["Clinical assessment", r.assessment.status === "signed" ? <>Signed by {who(r.assessment.attestation?.by)}. {link(paths.intakeRecord(r.id, "clinical"), "Open it")}</> : <span className="font-normal text-muted">Not signed</span>],
    ["Assessment modules", signed.length ? <>{signed.length} signed. {link(paths.intakeRecord(r.id, "signoff"), "Review & sign-off")}</> : <span className="font-normal text-muted">None signed</span>],
    ["Screener results", scores.length ? scores.join("; ") : <span className="font-normal text-muted">{NOT_DOCUMENTED}</span>],
    ["Care plan", c?.status === "approved" ? <>Version {c.version ?? 1}, approved by {who(c.approvedBy)}{sel ? `. Selected: ${serviceName(sel)}` : ""}. {link(paths.intakeRecord(r.id, "care"), "Open it")}</> : <span className="font-normal text-muted">Not approved</span>],
  ];
}

/** The page of a request that was prepared from an intake record in New Authorization. The case page's other tabs rest on a demo chart (diagnosis, screener scores, criteria and a forecast) that has nothing to do with this person,
    so this page shows the request and the record it came from instead: the documented diagnosis, the signed work, the care plan and the summary as it was sent, each linking back to the workspace. */
export function IntakeRequestPage({ request: r }: { request: PsyRequest }) {
  const you = viewerById(useStore((s) => s.viewerId)).name;
  const intake = useStore((s) => s.intakes.find((x) => x.id === r.intakeId));
  const draft = useStore((s) => s.caseDrafts.find((d) => d.caseId === r.id || d.caseId === r.caseId));
  const payer = payerById(r.payerId);
  const items = useMemo(() => historyOf(r, []), [r]);
  const sections = useMemo(() => (draft && intake ? narrativeOf(draft, [], [], intake) : []), [draft, intake]);
  const service = draft?.levelLabel ?? PROGRAM_LABEL[r.program];
  return (
    <Page>
      <Crumbs items={[{ label: "Authorizations", to: paths.authorizations() }, { label: r.id }]} />
      <PageHeader
        title={`${r.id} · ${service}`}
        sub={`${r.patient.initials}, ${r.patient.age} · ${payer.name} · ${r.type}`}
        actions={
          <>
            {r.intakeId ? <Link to={paths.intakeRecord(r.intakeId)} className="inline-flex h-[38px] items-center rounded-xl border border-field bg-white px-4 text-sm font-medium text-ink hover:bg-tile">Open the intake</Link> : null}
            <Link to={paths.dashboard({ request: r.id })} className="inline-flex h-[38px] items-center rounded-xl border border-field bg-white px-4 text-sm font-medium text-ink hover:bg-tile">Open on the Dashboard</Link>
          </>
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <Card data-card="from-intake">
          <CardHeader title="From the intake record" subtitle={intake ? `Read from ${intake.id}. The request carries no chart of its own.` : "The intake record is not available."} right={intake ? <Link to={paths.intakeRecord(intake.id)} className="text-[13px] font-semibold text-forest hover:underline">Open the workspace</Link> : undefined} />
          <CardBody>{intake ? <KeyValue className="text-[14px] max-[560px]:grid-cols-1" items={recordRows(intake)} /> : <p className="text-[13px] text-muted">This request was prepared from {r.intakeId}, which is not in the demo's data.</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Request" />
          <CardBody>
            <KeyValue
              className="text-[14px]"
              items={[
                ["Status", <Pill key="s" tone={r.tone}>{r.chip}</Pill>],
                ["Service", service],
                ["Sent", "Signed and sent (simulated payer submission)"],
                ["Next", <span key="n" className="font-normal">{r.next}</span>],
                ["Approval", <span key="a" className="font-normal text-muted">No estimate is made for a request prepared from an intake record</span>],
              ]}
            />
          </CardBody>
        </Card>
      </div>
      {sections.length ? (
        <Disclosure title="Medical-necessity summary as sent" summary={`${sections.length} sections`} right={<Chip className="border border-dashed border-edge">{AI_DRAFT_TAG}</Chip>}>
          <div className="flex flex-col gap-3.5 px-6 py-5 text-[14px] leading-[1.7]" data-testid="sent-summary">
            {sections.map((s) => (
              <div key={s.id}>
                <div className="text-[13px] font-semibold">{s.heading}</div>
                <p className="text-ink2">{s.text}</p>
                {s.refs?.length ? (
                  <p className="text-[12px] text-muted">
                    Source: {s.refs.map((ref, i) => <span key={ref.label}>{i ? ", " : ""}{ref.to ? <Link to={ref.to} className="underline underline-offset-2 hover:text-ink">{ref.label}</Link> : ref.label}</span>)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Disclosure>
      ) : null}
      {draft?.documents.length ? (
        <Disclosure title="Documents in the packet" summary={`${draft.documents.length} ${draft.documents.length === 1 ? "document" : "documents"}`}>
          <ul className="divide-y divide-line px-6 py-1 text-[13px]" aria-label="Documents in the packet">
            {draft.documents.map((d) => (
              <li key={d.slot} className="py-2.5">
                <span className="font-medium">{d.file.name}</span>
                <span className="block text-muted">{d.from ?? (d.unread ? "Added by name and type. The file was not read" : "Added in New Authorization")}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      <Disclosure title="History" summary={items.length ? `${items.length} ${items.length === 1 ? "line" : "lines"}` : "Nothing yet"}>
        <HistoryFeed items={items} you={you} label="Request history" />
      </Disclosure>
    </Page>
  );
}
