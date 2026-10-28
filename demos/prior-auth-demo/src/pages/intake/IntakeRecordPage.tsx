import { useNavigate, useParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button, Card, CardBody, EmptyState, Page } from "@/components/ui";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { Workspace } from "./workspace/Workspace";

/** One intake record: its patient-centered workspace. The address is /intake/:id and `?section=` picks the section (overview, referral, patient,
    clinical, m:<module>, signoff, care, documents, activity; the older section names still work); `?panel=scribe|voice` opens the AI Scribe or the Voice
    Intake Assistant over it. Access follows the sites the viewer may see. */
export default function IntakeRecordPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const record = useStore((s) => s.intakes.find((r) => r.id === id));
  const scope = useScope();

  if (!record) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="Intake not found" action={<Button onClick={() => nav(paths.referralQueue())}>Back to Referrals & Intake</Button>}>
          There is no intake {id} in this demo.
        </EmptyState>
      </Page>
    );
  }
  if (!scope.sites.includes(record.site)) {
    return (
      <Page>
        <Card className="mx-auto mt-10 max-w-[560px]">
          <CardBody className="py-10 text-center">
            <h2 className="text-[18px] font-semibold">This intake is not available at {scope.label}</h2>
            <p className="mt-2 text-[14px] text-ink2">It belongs to another site. Access follows the sites you may see (minimum necessary).</p>
            <Button className="mt-4" onClick={() => nav(paths.referralQueue())}>Back to Referrals & Intake</Button>
          </CardBody>
        </Card>
      </Page>
    );
  }
  return <Workspace key={record.id} record={record} />;
}
