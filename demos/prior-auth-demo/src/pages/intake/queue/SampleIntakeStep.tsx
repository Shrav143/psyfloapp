import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button, Chip, DocumentSheet, Field, FileDrop, FileRow, Modal, type DemoFile } from "@/components/ui";
import { samplesFor, type ReferralSample, type SampleMethod } from "@/data/intake/samples";
import { METHOD_LABEL } from "@/data/intake/types";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { intakesInView } from "@/store/intakeSelectors";
import { attachSample, createFromSample } from "./createFlows";
import { DuplicateNotice } from "./DuplicateNotice";
import { findDuplicates } from "./duplicates";
import { ServiceSelect, SiteSelect } from "./IntakeInputs";

const PICK: Record<SampleMethod, string> = {
  upload: "Choose a sample referral to upload",
  fax: "Choose a fax from the fax inbox (simulated)",
  email: "Choose an email from the referral inbox (simulated)",
  emr: "Choose a referral order from the EMR (simulated)",
  webform: "Choose a web form submission (simulated)",
};

/** Upload, fax, email, EMR or web form: a synthetic sample (or any dropped file, which the demo does not read) becomes the record's document,
    and the Referral Agent reads it into suggestions for review. */
export function SampleIntakeStep({ method, onBack, onClose }: { method: SampleMethod; onBack: () => void; onClose: () => void }) {
  const nav = useNavigate();
  const scope = useScope();
  const focus = useStore((s) => s.programFocus);
  const toast = useStore((s) => s.toast);
  const all = useStore((s) => s.intakes);
  const samples = samplesFor(method);
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const [picked, setPicked] = useState<VaServiceId | null>(null);
  const serviceId: VaServiceId = picked ?? (focus === "all" ? sample.serviceId : focus);
  const [site, setSite] = useState(scope.sites[0]);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [preview, setPreview] = useState<ReferralSample | null>(null);
  const visible = useMemo(() => intakesInView(useStore.getState(), false), [all, scope.sites]); // eslint-disable-line react-hooks/exhaustive-deps
  const dups = useMemo(() => findDuplicates(visible, { initials: sample.initials, age: sample.age, memberLast4: sample.memberLast4 }), [visible, sample]);

  const done = (id: string, body: string) => {
    onClose();
    nav(paths.intakeRecord(id, "referral"));
    toast({ title: id, body, tone: "good" });
  };
  const create = () => done(createFromSample(sample, { serviceId, site }, file?.name), "Intake created. Reader is reading the referral (simulated import).");
  const addTo = (id: string) => {
    attachSample(id, sample, file?.name);
    done(id, "Document added. Reader is reading it for anything new.");
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={METHOD_LABEL[method]}
        subtitle="The Referral Agent suggests fields from the document. Nothing is saved to the record until a person accepts it."
        footer={
          <>
            <Button icon={ArrowLeft} variant="ghost" onClick={onBack} className="mr-auto">Back</Button>
            <Button onClick={onClose}>Cancel</Button>
            {dups.length ? <Button onClick={() => addTo(dups[0].record.id)}>Add to {dups[0].record.id} instead</Button> : null}
            <Button variant="primary" onClick={create}>{dups.length ? "Create anyway" : "Create intake and read it"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink2">{PICK[method]}</div>
            <div role="radiogroup" aria-label="Sample referral" className="flex flex-col gap-2">
              {samples.map((s) => {
                const on = s.id === sample.id;
                return (
                  <div key={s.id} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", on ? "border-forest bg-sage-bg" : "border-edge bg-white")}>
                    <button type="button" role="radio" aria-checked={on} data-sample={s.id} onClick={() => setSampleId(s.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <span className={cn("mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-forest" : "border-[#D9D6CF]")}>{on ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold">{s.label}</span>
                        <span className="block text-[13px] text-muted">{s.summary}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Chip className="border border-dashed border-field bg-white">Synthetic</Chip>
                          {s.tags.map((t) => <Chip key={t}>{t}</Chip>)}
                        </span>
                      </span>
                    </button>
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreview(s)} aria-label={`Preview ${s.label}`}>Preview</Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink2">Or drop your own file</div>
            {file ? (
              <FileRow file={file} onRemove={() => setFile(null)} status="warn" />
            ) : (
              <FileDrop onFiles={(f) => setFile(f[0] ?? null)} hint="Drop a file or click to choose one" />
            )}
            <p className="mt-1.5 text-[12px] text-muted">The demo does not read your file. It attaches the selected sample instead and the record says so.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Requested service" hint={serviceId !== sample.serviceId ? `The referral asks for ${serviceById(sample.serviceId).short}.` : undefined}>
              <ServiceSelect value={serviceId} onChange={setPicked} />
            </Field>
            <Field label="Site">
              <SiteSelect value={site} sites={scope.sites} onChange={setSite} />
            </Field>
          </div>
          {dups.length ? <DuplicateNotice hits={dups} onOpen={onClose} /> : null}
        </div>
      </Modal>
      {preview ? (
        <Modal open onClose={() => setPreview(null)} size="lg" title={preview.docName} subtitle="Synthetic document, simulated import" footer={<Button onClick={() => setPreview(null)}>Close preview</Button>}>
          <DocumentSheet blocks={preview.blocks} page={1} pages={1} />
        </Modal>
      ) : null}
    </>
  );
}
