import { useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { Button, FileDrop, type DemoFile } from "@/components/ui";
import { SAMPLE_COUNT, hash } from "@/data/referrals";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { IncomingReferrals } from "./IncomingReferrals";
import { ReferralReading } from "./ReferralReading";

interface Reading {
  files: DemoFile[];
  /** Which invented referral Reader will find in them. The same file name always gives the same one. */
  sample: number;
}

/** New Case's Referral step: drop the referral documents or use a sample (Reader reads them), with `extra` actions beside the sample (a known patient).
    Below it, the incoming referrals. `onOpen` shows a referral's checklist. */
export function ReferralStart({ onOpen, extra }: { onOpen: (referralId: string) => void; extra?: ReactNode }) {
  const known = useStore((s) => s.referrals.length);
  const add = useStore((s) => s.addReferral);
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
      <section aria-labelledby="start-title" className="flex flex-col gap-3">
        <div>
          <h2 id="start-title" className="font-serif text-[18px] font-semibold tracking-tight">Start with a referral</h2>
          <p className="mt-0.5 text-[13px] text-muted">Drop the referral documents and Reader lists what is missing, or pick one that already arrived. No referral? Start from a known patient, or continue without one.</p>
        </div>
        <FileDrop
          variant="panel"
          title="Drop the referral documents"
          hint="The referral form, the face sheet, the insurance card, any orders. Reader reads them and lists what is missing."
          onFiles={(files) => setReading({ files, sample: hash(files[0].name) % SAMPLE_COUNT })}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2.5">
            <Button icon={FileText} onClick={() => setReading({ files: [{ id: uid("f"), name: "referral.pdf", sizeKb: 212 }], sample: known % SAMPLE_COUNT })}>Use sample referral</Button>
            {extra}
          </div>
          <span className="text-[13px] text-muted">Faxes, PDFs and photos all work.</span>
        </div>
      </section>
      <IncomingReferrals onReview={onOpen} />
    </>
  );
}
