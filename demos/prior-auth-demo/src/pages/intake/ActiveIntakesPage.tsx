import { SiteTag } from "@/components/layout/SiteTag";
import { Page, PageHeader } from "@/components/ui";
import { PolicyButton } from "./policy/PolicyButton";
import { IntakeWorklist } from "./queue/IntakeWorklist";
import { ListSearch } from "./queue/ListSearch";
import { useIntakes } from "./queue/useIntakes";

/** Active intakes: the people whose assessment has started, through clinical review and care planning to ready for authorization. The same worklist as
    the Referral Queue, limited to those four statuses. */
export default function ActiveIntakesPage() {
  const records = useIntakes();
  return (
    <Page>
      <PageHeader
        title={<>Active intakes<SiteTag /></>}
        sub="Patients in assessment, clinical review, care planning or ready for authorization."
        actions={
          <>
            <ListSearch />
            <PolicyButton />
          </>
        }
      />
      <IntakeWorklist records={records} scope="active" />
    </Page>
  );
}
