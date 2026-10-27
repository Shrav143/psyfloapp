import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Inbox, PlusCircle } from "lucide-react";
import { SiteTag } from "@/components/layout/SiteTag";
import { Button, Card, CardBody, EmptyState, FileDrop, Page, PageHeader, type DemoFile } from "@/components/ui";
import { SAMPLE_COUNT, hash } from "@/data/referrals";
import { uid } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { arrivedReferrals } from "./arrived";
import { IncomingReferrals } from "./IncomingReferrals";
import { ReferralReading } from "./ReferralReading";

/** Referrals: every referral that came in (fax, e-referral, portal, phone) for the sites in view, and a drop zone for a new one.
    A referral opens on its own page; accepting it starts a New Case with it. The same inbox also appears in New Case's first step. */
export default function ReferralsPage() {
  const nav = useNavigate();
  const scope = useScope();
  const referrals = useStore((s) => s.referrals);
  const add = useStore((s) => s.addReferral);
  const [reading, setReading] = useState<{ files: DemoFile[]; sample: number } | null>(null);
  const open = (id: string) => nav(paths.inboxReferral(id));
  const count = scope.filter(arrivedReferrals(referrals), (r) => r.id).length;

  if (reading) {
    return (
      <Page>
        <PageHeader title={<>Referrals<SiteTag /></>} />
        <ReferralReading
          files={reading.files}
          onDone={() => {
            const id = add(reading.sample);
            setReading(null);
            open(id);
          }}
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={<>Referrals<SiteTag /></>}
        actions={
          <>
            <Button icon={FileText} onClick={() => setReading({ files: [{ id: uid("f"), name: "referral.pdf", sizeKb: 212 }], sample: referrals.length % SAMPLE_COUNT })}>Use sample referral</Button>
            <Button variant="primary" icon={PlusCircle} onClick={() => nav(paths.newCase())}>New Case</Button>
          </>
        }
      />
      <FileDrop
        title="Drop the referral documents"
        hint="Drop a referral form, face sheet, insurance card or order. Reader reads it and lists what is missing."
        onFiles={(files) => setReading({ files, sample: hash(files[0].name) % SAMPLE_COUNT })}
      />
      {count ? (
        <IncomingReferrals onReview={open} limit={Infinity} />
      ) : (
        <Card>
          <CardBody>
            <EmptyState icon={Inbox} title="No open referrals">
              Nothing is waiting at {scope.label.toLowerCase()}. Drop a referral above, or use the sample.
            </EmptyState>
          </CardBody>
        </Card>
      )}
    </Page>
  );
}
