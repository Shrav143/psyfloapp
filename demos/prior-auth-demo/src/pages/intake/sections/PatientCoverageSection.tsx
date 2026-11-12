import { useNavigate } from "react-router-dom";
import { UnderlineTabs } from "@/components/ui";
import { sectionParam } from "@/data/assess/nav";
import { isOpen } from "@/data/intake/checklist";
import type { IntakeRecord } from "@/data/intake/types";
import { paths } from "@/routes";
import { useModel } from "../workspace/useWorkspaceModel";
import { CoverageSection } from "./CoverageSection";
import { ProfileSection } from "./ProfileSection";

type Tab = "profile" | "coverage";

/** Patient & coverage: the patient profile and the insurance and eligibility, as two tabs of one section. `?section=patient:coverage` opens the second. */
export function PatientCoverageSection({ record, tab }: { record: IntakeRecord; tab?: string }) {
  const nav = useNavigate();
  const { items } = useModel();
  const current: Tab = tab === "coverage" ? "coverage" : "profile";
  const openIn = (s: "profile" | "coverage") => items.filter((i) => i.section === s && isOpen(i.status)).length;
  const badge = (n: number) => (n ? n : undefined);
  return (
    <div className="flex min-w-0 flex-col gap-4" data-section-view="patient" data-tab={current}>
      <UnderlineTabs<Tab>
        items={[{ id: "profile", label: "Profile", badge: badge(openIn("profile")) }, { id: "coverage", label: "Coverage", badge: badge(openIn("coverage")) }]}
        value={current}
        onChange={(t) => nav(paths.intakeRecord(record.id, sectionParam({ section: "patient", tab: t })), { replace: true })}
      />
      {current === "profile" ? <ProfileSection record={record} /> : <CoverageSection record={record} />}
    </div>
  );
}
