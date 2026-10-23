import { useState, type ReactNode } from "react";
import { FileText, PencilLine } from "lucide-react";
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

/** "Start with a referral or patient": drop the referral documents, create the case by hand, or find a patient who is known (`patients`, a search that follows the sites in view).
    Below it, the incoming referrals. `onOpen` shows a referral's checklist. */
export function ReferralStart({ onOpen, onManual, patients }: { onOpen: (referralId: string) => void; onManual: () => void; patients: ReactNode }) {
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
          <h2 id="start-title" className="font-serif text-[18px] font-semibold tracking-tight">Start with a referral or patient</h2>
          <p className="mt-0.5 text-[13px] text-muted">Drop the referral documents and Reader lists what is missing, pick one that already arrived, find a patient who is known, or create the case by hand.</p>
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
            <Button icon={PencilLine} onClick={onManual}>Create case manually</Button>
          </div>
          <span className="text-[13px] text-muted">Faxes, PDFs and photos all work.</span>
        </div>
        {patients}
      </section>
      <IncomingReferrals onReview={onOpen} />
    </>
  );
}
