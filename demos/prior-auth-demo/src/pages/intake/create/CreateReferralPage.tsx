import { useSearchParams } from "react-router-dom";
import { Page, PageHeader } from "@/components/ui";
import { DraftsList } from "./DraftsList";
import { EmrFlow } from "./EmrFlow";
import { ManualFlow } from "./ManualFlow";
import { MethodCards, type CreateMethod } from "./MethodCards";
import { PasteFlow } from "./PasteFlow";
import { ReviewPage } from "./ReviewPage";
import { UploadFlow } from "./UploadFlow";
import { VoiceFlow } from "./VoiceFlow";

const METHODS: CreateMethod[] = ["upload", "emr", "manual", "voice", "paste"];

/** Create Referral (/intake/new). Choose how to receive or enter the referral; its steps open below the cards. `?method=` picks one, `?draft=` reviews a referral that was
    just read. The old `?method=screenshot` still opens Paste. */
export default function CreateReferralPage() {
  const [params, setParams] = useSearchParams();
  const draft = params.get("draft");
  const raw = params.get("method");
  const method = (raw === "screenshot" ? "paste" : METHODS.find((m) => m === raw)) as CreateMethod | undefined;
  if (draft) return <ReviewPage draftId={draft} />;
  return (
    <Page>
      <PageHeader title="Create referral" sub="Choose how you would like to receive or enter the referral." />
      <MethodCards value={method ?? null} onChange={(m) => setParams({ method: m }, { replace: true })} />
      {method === "upload" ? <UploadFlow /> : null}
      {method === "emr" ? <EmrFlow /> : null}
      {method === "manual" ? <ManualFlow /> : null}
      {method === "voice" ? <VoiceFlow /> : null}
      {method === "paste" ? <PasteFlow /> : null}
      <DraftsList />
    </Page>
  );
}
