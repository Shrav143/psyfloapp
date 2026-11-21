import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, FileDrop, Pill } from "@/components/ui";
import type { IntakeRecord, ReferralOut } from "@/data/intake/types";
import { useStore } from "@/store";
import { Select } from "../../cans/ui";
import { SourceLink } from "../../shared/provenance";
import { isGenerated } from "./referralModel";

/** The packet's documents: each slot, whether it is required and attached, and (while the referral is a draft or ready) attach or upload. */
export function ReferralDocs({ record, ro }: { record: IntakeRecord; ro: ReferralOut }) {
  const update = useStore((s) => s.updateReferralOut);
  const upload = useStore((s) => s.uploadReferralDoc);
  const [uploading, setUploading] = useState<string | null>(null);
  const editable = ro.status === "draft" || ro.status === "ready";
  const attach = (slot: string, docId: string) => {
    const d = record.documents.find((x) => x.id === docId);
    update(record.id, ro.id, { docs: ro.docs.map((x) => (x.name === slot ? { ...x, attached: !!docId, docId: docId || undefined } : x)) }, { action: docId ? `Attached ${d?.name ?? "a document"} as ${slot}` : `Removed the attachment for ${slot}` });
  };
  return (
    <ul className="space-y-2" aria-label="Documents">
      {ro.docs.map((d) => {
        const gen = d.generated || isGenerated(d.name);
        const docu = d.docId ? record.documents.find((x) => x.id === d.docId) : undefined;
        return (
          <li key={d.name} className="rounded-xl border border-line px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">{d.name}</span>
              <Pill tone={d.attached ? "good" : d.required ? "mid" : "neutral"}>{d.attached ? "Attached" : d.required ? "Required, missing" : "Optional"}</Pill>
              {gen ? <span className="text-[12px] text-muted">{d.attached ? "Generated with the packet" : "Generated when the packet is prepared"}</span> : null}
              {docu ? <SourceLink record={record} source={{ kind: "document", ref: docu.name, docId: docu.id }} /> : null}
            </div>
            {editable && !gen ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select label={`Attach ${d.name}`} className="max-w-[320px] flex-1" value={d.docId ?? ""} onChange={(v) => attach(d.name, v)} options={[{ value: "", label: "Not attached" }, ...record.documents.map((x) => ({ value: x.id, label: x.name }))]} />
                <Button size="sm" variant="ghost" icon={Upload} onClick={() => setUploading((u) => (u === d.name ? null : d.name))}>Upload</Button>
              </div>
            ) : null}
            {uploading === d.name ? (
              <FileDrop
                className="mt-2"
                hint="Drop the signed file here, or click to choose it (simulated: only the name is kept)"
                sampleName={`${d.name.toLowerCase().replace(/\W+/g, "-")}-signed.pdf`}
                onFiles={(f) => { if (f[0]) upload(record.id, ro.id, d.name, f[0].name); setUploading(null); }}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
