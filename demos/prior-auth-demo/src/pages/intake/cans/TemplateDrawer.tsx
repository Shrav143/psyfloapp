import { useState } from "react";
import { Banner, Drawer, FileDrop, Label, Spinner } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { CANS_PENDING } from "@/data/va/policy";
import { NO_ITEMS, TEMPLATE_VERSION } from "./cansModel";
import { Facts, SourceCite } from "./ui";

/* The administrator's view of the CANS Lifetime template. It says what DMAS must supply and lets an administrator upload a file, but validation
   always fails plainly in the demo: the official item mapping is not available, so no items are ever created. */

const NEEDED = [
  "The official DMAS CANS Lifetime item mapping: domains, items, scoring options and rating instructions",
  "Its version and its effective date",
  "Age applicability, rating frequency and assessor qualifications, where DMAS sets them",
];

export function TemplateDrawer({ record, open, onClose }: { record: IntakeRecord; open: boolean; onClose: () => void }) {
  const attempts = useStore((s) => s.cansTemplateAttempts);
  const validate = useStore((s) => s.validateCansTemplate);
  const [checking, setChecking] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: string; text: string } | null>(null);
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
        <Facts items={[["Template version", TEMPLATE_VERSION], ["Items configured", "None"], ["Status", "Not configured"], ["Effective date", "Not set"]]} />
        <p className="text-[14px] text-ink">{CANS_PENDING}</p>
        <p className="text-[13px] text-ink2">{NO_ITEMS}</p>
        <div>
          <Label>What is needed to configure it</Label>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink">
            {NEEDED.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <SourceCite id="cansNotice" className="mt-2" />
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
    </Drawer>
  );
}
