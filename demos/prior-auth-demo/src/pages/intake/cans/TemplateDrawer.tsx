import { useState } from "react";
import { FileCog } from "lucide-react";
import { Banner, Button, Drawer, FileDrop, Label, Pill, Spinner } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { CANS_PENDING } from "@/data/va/policy";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { templateOf } from "@/store/intakeCansWork";
import { actorName } from "../shared/provenance";
import { NO_ITEMS, TEMPLATE_VERSION } from "./cansModel";
import { LoadTemplateModal } from "./LoadTemplateModal";
import { DEMO_DOMAINS, DEMO_TEMPLATE_LABEL, DEMO_TEMPLATE_VERSION, OFFICIAL_NEEDS, OFFICIAL_NOT_VERIFIED } from "./template";
import { Facts, SourceCite } from "./ui";

/* The administrator's view of the CANS Lifetime template. It says what DMAS must supply, lets an administrator upload a file (validation always fails in
   the demo: the official item mapping is not available, so no official items are ever created) and lets an administrator load the demo placeholder. */

export function TemplateDrawer({ record, open, onClose }: { record: IntakeRecord; open: boolean; onClose: () => void }) {
  const attempts = useStore((s) => s.cansTemplateAttempts);
  const template = useStore(templateOf);
  const validate = useStore((s) => s.validateCansTemplate);
  const [checking, setChecking] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: string; text: string } | null>(null);
  const [load, setLoad] = useState(false);
  const loaded = template.kind === "demo-placeholder";
  const run = (file: string) => {
    setChecking(file);
    setResult(null);
    window.setTimeout(() => {
      setResult({ file, text: validate(record.id, file) });
      setChecking(null);
    }, 900);
  };
  return (
    <Drawer open={open} onClose={onClose} title="CANS Lifetime template" subtitle="Administrator · applies to every intake that uses the CANS Lifetime" width={600}>
      <div className="space-y-5">
        <Facts items={[["Official template", "Not loaded"], ["Official items configured", "None"], ["Effective date", "Not set"], ["Template in use", loaded ? `${DEMO_TEMPLATE_LABEL}, ${DEMO_TEMPLATE_VERSION}` : TEMPLATE_VERSION]]} />
        <p className="text-[14px] text-ink">{CANS_PENDING}</p>
        <p className="text-[13px] text-ink2">{NO_ITEMS}</p>
        <div>
          <Label>What is needed to configure the official template</Label>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink">
            {OFFICIAL_NEEDS.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <p className="mt-1 text-[12px] text-muted">{OFFICIAL_NOT_VERIFIED}</p>
          <SourceCite id="cansNotice" className="mt-2" />
        </div>
        <div>
          <Label>Demo placeholder template</Label>
          {loaded ? (
            <div className="mt-2 space-y-2">
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink"><Pill tone="neutral">Loaded</Pill> {DEMO_DOMAINS.length} domain headings, {DEMO_DOMAINS.reduce((n, d) => n + d.items.length, 0)} blank prompts. Not CANS content.</p>
              <p className="text-[12px] text-muted">Loaded by {actorName(template.loadedBy)}{template.rolePlay ? " (demo role-play)" : ""} · {stamp(template.loadedAt)}</p>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button icon={FileCog} onClick={() => setLoad(true)}>Load a demo placeholder template</Button>
              <span className="text-[12px] text-muted">Blank prompts, no official wording, no scale.</span>
            </div>
          )}
        </div>
        <div>
          <Label>Upload the official mapping</Label>
          <FileDrop className="mt-2" onFiles={(f) => f[0] && run(f[0].name)} sampleName="dmas-cans-lifetime-item-mapping.xlsx" hint="Drop the DMAS mapping file here, or click to choose it" disabled={!!checking} />
          {checking ? (
            <p className="mt-2 flex items-center gap-2 text-[13px] text-muted"><Spinner size={14} /> Checking {checking} against the DMAS reference…</p>
          ) : null}
          {result ? (
            <Banner tone="risk" className="mt-3" title={result.text}>
              {result.file} was not loaded. No items, domains or scoring options were created.
            </Banner>
          ) : null}
        </div>
        {attempts.length ? (
          <div>
            <Label>Validation attempts</Label>
            <ul className="mt-2 space-y-1.5">
              {attempts.map((a) => (
                <li key={a.id} className="text-[13px] text-ink2">
                  <span className="font-medium text-ink">{a.fileName}</span> · {actorName(a.by)} · {stamp(a.at)} · Failed: official mapping not available
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <LoadTemplateModal record={record} open={load} onClose={() => setLoad(false)} />
    </Drawer>
  );
}
