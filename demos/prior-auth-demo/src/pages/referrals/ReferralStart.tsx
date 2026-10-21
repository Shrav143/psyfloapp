import { useState } from "react";
import { FileText } from "lucide-react";
import { Button, FileDrop, type DemoFile } from "@/components/ui";
import { SAMPLE_COUNT, hash } from "@/data/referrals";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { ArrivedList } from "./ArrivedList";
import { ReferralReading } from "./ReferralReading";

interface Reading {
  files: DemoFile[];
  /** Which invented referral Reader will find in them. The same file name always gives the same one. */
  sample: number;
}

/** Nothing loaded yet: drop the documents, or check one that already arrived. `onOpen` shows a referral's checklist. */
export function ReferralStart({ draftId, onOpen }: { draftId: string; onOpen: (referralId: string) => void }) {
  const known = useStore((s) => s.referrals.length);
  const add = useStore((s) => s.addReferral);
  const patch = useStore((s) => s.patchCaseDraft);
  const [reading, setReading] = useState<Reading | null>(null);

  if (reading) {
    return (
      <ReferralReading
        files={reading.files}
        onDone={() => {
          const id = add(reading.sample);
          setReading(null);
          onOpen(id);
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <FileDrop
          variant="panel"
          title="Drop the referral documents"
          hint="The referral form, the face sheet, the insurance card, any orders. Reader reads them and lists what is missing."
          onFiles={(files) => setReading({ files, sample: hash(files[0].name) % SAMPLE_COUNT })}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button icon={FileText} onClick={() => setReading({ files: [{ id: uid("f"), name: "referral.pdf", sizeKb: 212 }], sample: known % SAMPLE_COUNT })}>Use sample referral</Button>
          <span className="text-[13px] text-muted">Faxes, PDFs and photos all work.</span>
        </div>
      </div>
      <ArrivedList onCheck={onOpen} />
      <div className="flex justify-center">
        <button type="button" onClick={() => patch(draftId, { phase: "records" })} className="rounded-lg px-3 py-1.5 text-[13.5px] text-muted underline underline-offset-4 hover:text-ink">
          No referral? Continue without one
        </button>
      </div>
    </>
  );
}
