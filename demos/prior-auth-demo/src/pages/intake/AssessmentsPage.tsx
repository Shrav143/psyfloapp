import { SiteTag } from "@/components/layout/SiteTag";
import { Page, PageHeader } from "@/components/ui";
import { PolicyButton } from "./policy/PolicyButton";
import { AssessmentsWorklist } from "./queue/AssessmentsWorklist";
import { ListSearch } from "./queue/ListSearch";
import { useIntakes } from "./queue/useIntakes";

/** Assessments: every assessment across the intakes, one row each, with who holds it and where it stands. A row opens that assessment in the intake. */
export default function AssessmentsPage() {
  const records = useIntakes();
  return (
    <Page>
      <PageHeader
        title={<>Assessments<SiteTag /></>}
        sub="Every assessment in progress or waiting for sign-off."
        actions={
          <>
            <ListSearch placeholder="Search by patient, ID or assessment" />
            <PolicyButton />
          </>
        }
      />
      <AssessmentsWorklist records={records} />
    </Page>
  );
}
