import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Banner, Button, Card, CardBody, Crumbs, EmptyState, Page, PageHeader } from "@/components/ui";
import { PURPOSES } from "@/data/assess/purposes";
import type { PurposeId } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import { TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { clockTime, toDate } from "@/lib/time";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { ConfigureWizard } from "./ConfigureWizard";
import { parseStep, startOf, type WizardStep } from "./model";

/** The configuration wizard of one intake (/intake/:id/configure?step=purpose|program|population|plan). A saved draft reopens where it was left. */
export default function ConfigurePage() {
  const { id = "" } = useParams();
  const record = useStore((s) => s.intakes.find((r) => r.id === id));
  const scope = useScope();
  const nav = useNavigate();
  /* Discarding a draft starts the wizard over from the record's own configuration, so the page is mounted again. */
  const [epoch, setEpoch] = useState(0);
  if (!record) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="Intake not found" action={<Button onClick={() => nav(paths.referralQueue())}>Back to Referrals & Intake</Button>}>
          There is no intake {id} in this demo.
        </EmptyState>
      </Page>
    );
  }
  if (!scope.sites.includes(record.site)) return <OutOfSite id={record.id} what="intake" />;
  return <Loaded key={`${record.id}:${epoch}`} record={record} onDiscarded={() => setEpoch((e) => e + 1)} />;
}

function Loaded({ record, onDiscarded }: { record: IntakeRecord; onDiscarded: () => void }) {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const discard = useStore((s) => s.discardConfigDraft);
  const purposeParam = params.get("purpose");
  const [start] = useState(() => startOf(record, PURPOSES.some((p) => p.id === purposeParam) ? (purposeParam as PurposeId) : null));
  const step = parseStep(params.get("step")) ?? start.step;
  const onStep = (s: WizardStep) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("step", s);
      return n;
    }, { replace: true });
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const plan = record.payerId ? vaPlanOf(record.payerId) : undefined;
  const sub = [`${record.initials || "No name yet"}${record.age !== null ? `, ${record.age}` : ""}`, record.id, plan?.name ?? "No plan yet"].join(" · ");
  const savedBy = start.savedBy ? staffOf(start.savedBy)?.name ?? start.savedBy : "someone";

  return (
    <Page>
      <Crumbs items={[{ label: "Referrals & Intake", to: paths.referralQueue() }, { label: record.id, to: paths.intakeRecord(record.id) }, { label: "Configure" }]} />
      <PageHeader title={record.config ? "Change the intake configuration" : "Configure the intake"} sub={sub} actions={<Link to={paths.intakeRecord(record.id)} className="text-[13px] font-semibold text-forest hover:underline">Back to the intake</Link>} />
      {["redirected", "declined", "closed"].includes(record.triage) ? (
        <Banner tone="mid" title={`This referral is ${TRIAGE_LABEL[record.triage].toLowerCase()}`}>Configuring the intake does not reopen it. Change the decision on the referral first.</Banner>
      ) : null}
      {start.from === "draft" ? (
        <Banner tone="good" title="Your choices are saved as a draft" action={<Button size="sm" onClick={() => { discard(record.id); onDiscarded(); }}>Discard draft</Button>}>
          Saved {start.savedAt !== undefined ? clockTime(toDate(start.savedAt)) : ""} by {savedBy}. Nothing is active until you start the assessment.
        </Banner>
      ) : null}
      <Card>
        <CardBody className="px-6 py-5">
          <ConfigureWizard record={record} start={start} step={step} onStep={onStep} variant="page" onDone={() => nav(paths.intakeRecord(record.id, "overview"))} onCancel={() => nav(paths.intakeRecord(record.id))} />
        </CardBody>
      </Card>
    </Page>
  );
}
