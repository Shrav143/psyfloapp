import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Chip, Disclosure, DocumentSheet, Field, FileDrop, FileRow, Modal, type DemoFile } from "@/components/ui";
import { sampleById, type ReferralSample } from "@/data/intake/samples";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { SiteSelect } from "./inputs";
import { draftPath } from "./paths";
import { startFromSample } from "./startDraft";

/** The six documents the demo can read, by what they are. The first is the default. */
export const UPLOAD_SAMPLES: { id: string; title: string }[] = [
  { id: "s-upload-peds", title: "Referral form" },
  { id: "s-fax-ed", title: "Hospital discharge fax" },
  { id: "s-up-school", title: "School referral" },
  { id: "s-up-court", title: "Court or probation letter" },
  { id: "s-emr-psych", title: "EMR summary" },
  { id: "s-up-card", title: "Insurance card" },
];
const MORE: { id: string; title: string }[] = [
  { id: "s-email-pcp", title: "Referral email" },
  { id: "s-web-safety", title: "Caregiver web form" },
  { id: "s-web-dup", title: "Parent web form" },
];

function SampleRow({ sample, title, on, onPick, onPreview }: { sample: ReferralSample; title: string; on: boolean; onPick: () => void; onPreview: () => void }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", on ? "border-forest bg-sage-bg" : "border-edge bg-white")}>
      <button type="button" role="radio" aria-checked={on} data-sample={sample.id} onClick={onPick} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className={cn("mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-forest" : "border-[#D9D6CF]")}>{on ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold">{title}</span>
          <span className="block text-[13px] text-muted">{sample.summary}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <Chip className="border border-dashed border-field bg-white">Synthetic</Chip>
            {sample.tags.map((t) => <Chip key={t}>{t}</Chip>)}
          </span>
        </span>
      </button>
      <Button size="sm" variant="ghost" icon={Eye} onClick={onPreview} aria-label={`Preview ${title}`}>Preview</Button>
    </div>
  );
}

/** Upload Documents. A dropped file is not read: the demo says so and extracts the content of the sample picked beside it. */
export function UploadFlow() {
  const nav = useNavigate();
  const scope = useScope();
  const paused = useStore((s) => s.agentPaused.reader);
  const [pick, setPick] = useState(UPLOAD_SAMPLES[0].id);
  const [files, setFiles] = useState<DemoFile[]>([]);
  const [site, setSite] = useState(scope.sites[0]);
  const [preview, setPreview] = useState<ReferralSample | null>(null);
  const sample = sampleById(pick);
  const start = () => {
    if (!sample) return;
    const id = startFromSample(sample, { site, method: "upload", fileName: files[0]?.name });
    nav(draftPath(id));
  };
  const row = (o: { id: string; title: string }) => {
    const s = sampleById(o.id);
    return s ? <SampleRow key={o.id} sample={s} title={o.title} on={pick === o.id} onPick={() => setPick(o.id)} onPreview={() => setPreview(s)} /> : null;
  };
  return (
    <Card data-flow="upload">
      <CardHeader title="Upload Documents" subtitle="Reader reads the document, finds the fields and links each one to where it came from." />
      <CardBody className="flex flex-col gap-5">
        {paused ? <Banner tone="mid" title="Reader is paused in Settings">Nothing is read until you resume it. You can still enter a referral by hand.</Banner> : null}
        <div>
          {files.length ? (
            <div className="flex flex-col gap-2">{files.map((f) => <FileRow key={f.id} file={f} status="warn" onRemove={() => setFiles((a) => a.filter((x) => x.id !== f.id))} />)}</div>
          ) : (
            <FileDrop variant="panel" title="Drop files here" hint="Drop a referral, a discharge summary or an assessment, or click to choose a file" onFiles={setFiles} />
          )}
          <p className="mt-2 text-[12px] font-medium text-ink2">Simulated: files are not read; sample content is extracted.</p>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink2">Use a sample document</div>
          <div role="radiogroup" aria-label="Sample document" className="grid grid-cols-1 gap-2 min-[1000px]:grid-cols-2">{UPLOAD_SAMPLES.map(row)}</div>
          <Disclosure variant="plain" title="More sample documents" summary="An email, a caregiver form and a parent form" className="mt-3">
            <div role="radiogroup" aria-label="More sample documents" className="grid grid-cols-1 gap-2 px-1 py-3 min-[1000px]:grid-cols-2">{MORE.map(row)}</div>
          </Disclosure>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Site"><SiteSelect value={site} sites={scope.sites} onChange={setSite} /></Field>
        </div>
        <div><Button variant="primary" onClick={start} disabled={paused || !sample} data-start-upload>Read the document</Button></div>
      </CardBody>
      {preview ? (
        <Modal open onClose={() => setPreview(null)} size="lg" title={preview.docName} subtitle="Synthetic document, simulated import" footer={<Button onClick={() => setPreview(null)}>Close preview</Button>}>
          <DocumentSheet blocks={preview.blocks} page={1} pages={1} />
        </Modal>
      ) : null}
    </Card>
  );
}
