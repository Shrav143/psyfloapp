import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardPlus, Settings2 } from "lucide-react";
import { Banner, Button, Card, CardBody, Chip, UnderlineTabs } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { PriorAssessmentsCard } from "../instruments/PriorAssessments";
import { AppliesInstead, CansApplicability } from "./CansApplicability";
import { cansApplies } from "./cansModel";
import { pendingEvidence } from "./cansState";
import { EvidenceTab } from "./EvidenceTab";
import { ItemsTab } from "./ItemsTab";
import { NarrativeCard } from "./NarrativeCard";
import { SummaryTab } from "./SummaryTab";
import { TemplateDrawer } from "./TemplateDrawer";
import { DEMO_TEMPLATE_LABEL } from "./template";

type TabId = "items" | "evidence" | "summary";
const TAB_IDS: TabId[] = ["items", "evidence", "summary"];

/** The CANS Lifetime module: three tabs, Assessment Items, Evidence Review and Assessment Summary. Whether it applies comes from the policy layer for the
    configured program (cansFor): required from July 1, 2027 (a draft rule), preparation before. No official item, scale or score is ever shown. */
export function CansModule({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const [params] = useSearchParams();
  const start = useStore((s) => s.startCans);
  const { applies, rule } = cansApplies(record, now);
  const initial = params.get("tab");
  const [tab, setTab] = useState<TabId>(TAB_IDS.includes(initial as TabId) ? (initial as TabId) : "items");
  const [drawer, setDrawer] = useState(false);
  const cans = record.cans;
  const active = applies === "required" || applies === "upcoming";
  const waiting = pendingEvidence(record).length;
  return (
    <div className="space-y-5" data-module="cans" data-section="cans">
      <CansApplicability record={record} applies={applies} rule={rule}>
        {cans?.template ? <Chip>{DEMO_TEMPLATE_LABEL}</Chip> : null}
        <Button size="sm" icon={Settings2} onClick={() => setDrawer(true)}>Template</Button>
      </CansApplicability>
      <PriorAssessmentsCard record={record} moduleId="cans" />
      {active && !cans ? (
        <Card data-cans-start>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">No CANS record yet</p>
              <p className="text-[13px] text-ink2">Starting one lets staff gather evidence and, once a template is loaded, enter rating labels. It creates no official items and no ratings.</p>
            </div>
            <Button variant="primary" icon={ClipboardPlus} onClick={() => start(record.id)}>Start the CANS record</Button>
          </CardBody>
        </Card>
      ) : null}
      {active && cans ? (
        <>
          <UnderlineTabs
            items={[{ id: "items" as const, label: "Assessment Items" }, { id: "evidence" as const, label: "Evidence Review", badge: waiting || undefined }, { id: "summary" as const, label: "Assessment Summary" }]}
            value={tab}
            onChange={setTab}
            className="overflow-x-auto"
          />
          {tab === "items" ? <ItemsTab record={record} cans={cans} onGo={setTab} /> : null}
          {tab === "evidence" ? <EvidenceTab record={record} cans={cans} /> : null}
          {tab === "summary" ? <SummaryTab record={record} cans={cans} onGo={setTab} /> : null}
        </>
      ) : null}
      {!active && cans ? (
        <>
          <Banner tone="neutral" title="A CANS record exists from an earlier service">It is kept, read-only, for the audit trail. It is not used for this service.</Banner>
          <NarrativeCard record={record} cans={cans} readOnly />
        </>
      ) : null}
      {!active && !cans && applies === "not_applicable" ? <AppliesInstead record={record} /> : null}
      <TemplateDrawer record={record} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
