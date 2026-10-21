import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentChip, Banner, Button, FileDrop, FileRow, KeyValue, Modal, Spinner, type DemoFile } from "@/components/ui";
import { CHECK_PROBLEM, SAMPLE_COUNT, hash, issueCount, sampleReferral } from "@/data/referrals";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ChannelTag } from "./Chips";

const STEPS = ["Reader is scanning the uploaded document", "Checking the program's requirements", "Verifying required components", "Confirming the data is complete"];
const STEP_MS = 1000;

/** Drop a referral, watch the agents validate it for about four seconds, then add it to the pipeline. */
export function NewReferralModal({ onClose }: { onClose: () => void }) {
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
  const preview = useMemo(() => (file ? sampleReferral(pick, "RF-NEW", clock) : null), [file, pick, clock]);
  const done = !!file && step >= STEPS.length;
  const issues = preview ? preview.checks.filter((c) => c.state !== "pass") : [];

  const confirm = () => {
    const id = add(pick);
    onClose();
    nav(paths.referral(id));
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={file && !done ? `Validating ${file.name}` : "New referral"}
      subtitle={file ? undefined : "Drop the document that came in. Reader reads it and checks it against the program's requirements."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {done ? <Button variant="primary" onClick={confirm}>Add to referrals</Button> : null}
        </>
      }
    >
      {!file ? (
        <div className="flex flex-col gap-3">
          <FileDrop hint="Drag and drop the referral here, or click to choose a file" onFiles={(files) => take(files[0], hash(files[0].name) % SAMPLE_COUNT)} />
          <div>
            <Button size="sm" variant="ghost" icon={FileText} onClick={() => take({ id: uid("f"), name: "referral.pdf", sizeKb: 212 }, count % SAMPLE_COUNT)}>
              Use sample referral
            </Button>
          </div>
        </div>
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
        <div className="flex flex-col gap-4">
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
        </div>
      ) : null}
    </Modal>
  );
}
