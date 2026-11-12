import { SiteTag } from "@/components/layout/SiteTag";
import { Page, PageHeader } from "@/components/ui";
import { PolicyButton } from "./policy/PolicyButton";
import { CoordinationWorklist } from "./queue/CoordinationWorklist";
import { ListSearch } from "./queue/ListSearch";
import { useIntakes } from "./queue/useIntakes";

/** Care coordination: referrals out to other programs, replies we wait on, closed-loop reminders, and the intakes ready for their next step. */
export default function CoordinationPage() {
  const records = useIntakes();
  return (
    <Page>
      <PageHeader
        title={<>Care coordination<SiteTag /></>}
        sub="Referrals out, pending replies and the intakes ready for their next step."
        actions={
          <>
            <ListSearch placeholder="Search by patient, ID or organization" />
            <PolicyButton />
          </>
        }
      />
      <CoordinationWorklist records={records} />
    </Page>
  );
}
