import { Link } from "react-router-dom";
import { ArrowRight, Share2 } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { isCoreModule } from "@/data/assess/modules";
import type { AssessmentPlan, ModuleId } from "@/data/assess/types";
import { INSTRUMENT_STATUS_LABEL } from "@/data/assess/types";
import { activeModuleIds } from "@/data/intake/scripts";
import type { IntakeRecord } from "@/data/intake/types";
import { sectionParam } from "@/data/assess/nav";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { feedCount } from "./feed";

/** Nothing is asked twice: what is documented here can be proposed to the modules that read it, as pending evidence a person decides on there. */
export function ReuseBanner({ record }: { record: IntakeRecord }) {
  const feed = useStore((s) => s.feedModulesFromAssessment);
  const toast = useStore((s) => s.toast);
  const n = feedCount(record);
  if (!record.config) {
    return (
      <Banner tone="neutral" title="This intake is not configured yet" action={<Link to={paths.configure(record.id)} className="inline-flex h-8 items-center rounded-[10px] border border-field bg-white px-3 text-[13px] font-semibold text-forest hover:bg-tile">Configure</Link>}>
        The shared interview is below. Configure the intake to see which modules each answer feeds.
      </Banner>
    );
  }
  if (!n) return null;
  return (
    <Banner tone="neutral" icon={Share2} title={`${n} documented ${n === 1 ? "answer" : "answers"} can be reused in the modules`}
      action={<Button size="sm" onClick={() => { const added = feed(record.id); toast({ title: `${added} pieces of evidence proposed`, body: "They wait in their modules as pending evidence. Nothing was filled in.", tone: "neutral" }); }}>Propose to the modules</Button>}>
      Each one goes to the module that reads it as pending evidence, so the question is not asked again. A person accepts, edits or rejects it there.
    </Banner>
  );
}

/** The program-specific questions live in the assessment modules, one place each. */
export function ProgramModulesCard({ record, plan }: { record: IntakeRecord; plan: AssessmentPlan | null }) {
  if (!record.config) return null;
  const ids = activeModuleIds(record.config).filter((m) => !isCoreModule(m));
  if (!ids.length) return null;
  const label = (id: ModuleId) => plan?.modules.find((m) => m.id === id)?.label ?? id;
  return (
    <Card data-testid="program-modules">
      <CardHeader title="Program-specific questions" subtitle="Asked once, in the module for this program." />
      <CardBody className="py-2">
        <ul className="divide-y divide-line">
          {ids.map((id) => {
            const inst = record.instruments?.[id];
            return (
              <li key={id}>
                <Link to={paths.intakeRecord(record.id, sectionParam({ section: "instrument", module: id }))} className="flex items-center gap-3 py-2.5 text-[14px] hover:text-forest">
                  <span className="min-w-0 flex-1">{label(id)}</span>
                  <Pill tone={inst?.status === "signed" ? "good" : inst && inst.status !== "not_started" ? "mid" : "neutral"}>{INSTRUMENT_STATUS_LABEL[inst?.status ?? "not_started"]}</Pill>
                  <ArrowRight size={15} className="ico text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
