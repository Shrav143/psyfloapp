import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileText, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentChip, Banner, Button, Card, CardBody, CardHeader, FileDrop, FileRow, KeyValue, Spinner, type DemoFile } from "@/components/ui";
import { CHECK_PROBLEM, SAMPLE_COUNT, hash, issueCount, sampleReferral } from "@/data/referrals";
import { CHECK_LABEL, CHECK_ORDER } from "@/data/referralLabels";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ChannelTag } from "./Chips";

const STEPS = ["Reader is scanning the uploaded document", "Checking the program's requirements", "Verifying required components", "Confirming the data is complete"];
const STEP_MS = 1000;

/** Drop a referral, watch the agents validate it for about four seconds, then add it to the inbox and open it. `draftId` is the case it belongs to. */
export function ReferralUploader({ draftId }: { draftId?: string }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const count = useStore((s) => s.referrals.length);
  const add = useStore((s) => s.addReferral);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [pick, setPick] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!file || step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [file, step]);

  const take = (f: DemoFile, index: number) => {
    setFile(f);
    setPick(index);
    setStep(0);
  };
  const reset = () => {
    setFile(null);
    setStep(0);
  };
  const preview = useMemo(() => (file ? sampleReferral(pick, "RF-NEW", clock) : null), [file, pick, clock]);
  const done = !!file && step >= STEPS.length;
  const issues = preview ? preview.checks.filter((c) => c.state !== "pass") : [];

  const confirm = () => {
    const id = add(pick);
    nav(paths.referral(id, draftId));
  };

  return (
    <Card>
      <CardHeader
        title={file && !done ? `Validating ${file.name}` : "Upload the referral"}
        subtitle={file ? undefined : "Drop the document that came in. Reader reads it and checks it against the program's requirements."}
        right={done ? <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset}>Choose another file</Button> : undefined}
      />
      <CardBody className="flex flex-col gap-4">
        {!file ? (
          <>
            <FileDrop hint="Drag and drop the referral here, or click to choose a file" onFiles={(files) => take(files[0], hash(files[0].name) % SAMPLE_COUNT)} />
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="ghost" icon={FileText} onClick={() => take({ id: uid("f"), name: "referral.pdf", sizeKb: 212 }, count % SAMPLE_COUNT)}>
                Use sample referral
              </Button>
              <span className="text-[13px] text-muted">Faxes, PDFs and photos all work. Reader pulls out the patient, payer, level of care, diagnoses and the referring clinician.</span>
            </div>
            <div className="rounded-2xl border border-edge bg-tile px-5 py-4">
              <div className="mb-3 flex items-center gap-2.5">
                <AgentChip agent="reader" />
                <span className="font-medium">Reader checks nine things before anything goes further</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13.5px] text-ink2">
                {CHECK_ORDER.map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <Check size={14} className="ico shrink-0 text-good" />
                    {CHECK_LABEL[k]}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : !done ? (
          <ul className="flex flex-col gap-3.5 rounded-2xl border border-edge px-5 py-4">
            {STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-3", i > step && "text-faint")}>
                {i < step ? <span className="grid h-5 w-5 place-items-center rounded-full bg-good-bg text-good"><Check size={13} className="ico" /></span> : i === step ? <Spinner size={20} /> : <span className="h-5 w-5 rounded-full border-[1.5px] border-[#D9D0C3]" />}
                <span className={cn(i === step && "font-semibold")}>{s}</span>
              </li>
            ))}
          </ul>
        ) : preview ? (
          <>
            <FileRow file={file} status={issues.length ? "warn" : "ok"} />
            <Banner tone={issues.length ? "mid" : "good"} icon={issues.length ? AlertTriangle : Check} title={issues.length ? `Reader found ${issues.length} ${issues.length === 1 ? "thing" : "things"} to check` : "Reader found nothing to fix"}>
              {issues.length ? issues.map((c) => CHECK_PROBLEM[c.key]).join(". ") + "." : "All 9 checks passed. You can accept it as soon as it is added."}
            </Banner>
            <div className="rounded-2xl border border-edge px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <AgentChip agent="reader" />
                <span className="text-xs text-muted">{preview.fields.length} fields · {preview.plan.pages + 1} pages · {issueCount(preview.checks)} open</span>
              </div>
              <KeyValue
                items={[
                  ["Patient", `${preview.patient.initials}, ${preview.patient.age}`],
                  ["Source", <span key="s" className="inline-flex flex-wrap items-center gap-x-2">{preview.source.name}<ChannelTag channel={preview.channel} /></span>],
                  ["Referring clinician", `${preview.plan.clinician.name}, ${preview.plan.clinician.credentials}`],
                  ["Requested service", preview.fields.find((f) => f.key === "service")?.value ?? ""],
                  ["Urgency", preview.fields.find((f) => f.key === "urgency")?.value ?? ""],
                  ["Diagnoses", preview.fields.find((f) => f.key === "diagnoses")?.value ?? ""],
                  ["Insurance", preview.fields.find((f) => f.key === "insurance")?.value ?? ""],
                ]}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={confirm}>Add and review the referral</Button>
            </div>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
