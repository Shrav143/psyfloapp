import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteTag } from "@/components/layout/SiteTag";
import { Page, PageHeader, Segmented, UnderlineTabs } from "@/components/ui";
import { serviceById } from "@/data/va/services";
import { REDESIGN_START } from "@/data/va/policy";
import { useStore } from "@/store";
import { intakesInView, rosterInView } from "@/store/intakeSelectors";
import { PolicyButton } from "./policy/PolicyButton";
import { IntakeMetrics } from "./queue/IntakeMetrics";
import { IntakeQueue } from "./queue/IntakeQueue";
import { NewIntakeButton } from "./queue/NewIntakeButton";
import { StartScribeButton } from "./scribe/StartScribeButton";
import { TransitionView } from "./transition/TransitionView";

type View = "queue" | "transition";

/** Intake: the front door. The queue of referrals and intakes (with its figures and filters), or the July 2027 transition view.
    The program in the top bar narrows both; the policy switch previews the workspace as of July 1, 2027 without moving the demo clock. */
export default function IntakePage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "transition" ? "transition" : "queue";
  const all = useStore((s) => s.intakes);
  const focus = useStore((s) => s.programFocus);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  const preview = useStore((s) => s.policyPreview);
  const setPreview = useStore((s) => s.setPolicyPreview);
  const clock = useStore((s) => s.clock);
  const records = useMemo(() => intakesInView(useStore.getState()), [all, focus, viewerId, siteScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const roster = useStore((s) => s.legacyRoster);
  const legacyCount = useMemo(() => rosterInView(useStore.getState()).length, [roster, viewerId, siteScope]); // eslint-disable-line react-hooks/exhaustive-deps

  const setView = (v: View) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v === "transition") n.set("view", "transition");
      else n.delete("view");
      return n;
    });

  return (
    <Page>
      <PageHeader
        title={<>Intake<SiteTag /></>}
        sub={focus === "all" ? undefined : `Program: ${serviceById(focus).label}`}
        actions={
          <>
            <StartScribeButton />
            <NewIntakeButton />
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UnderlineTabs<View> items={[{ id: "queue", label: "Intake queue", badge: records.length }, { id: "transition", label: "July 2027 transition", badge: legacyCount }]} value={view} onChange={setView} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Policy as of</span>
          <Segmented<"today" | "redesign">
            items={[{ id: "today", label: "Today" }, { id: "redesign", label: `July 1, 2027 (preview)` }]}
            value={preview}
            onChange={setPreview}
          />
          <PolicyButton />
        </div>
      </div>
      {preview === "redesign" && clock < REDESIGN_START ? (
        <p className="-mt-2 text-[13px] text-mid-ink">Preview: pathways and requirements are shown as they would apply on July 1, 2027, using draft redesign policy. Nothing is saved as of that date.</p>
      ) : null}
      {view === "queue" ? (
        <>
          <IntakeMetrics records={records} />
          <IntakeQueue records={records} />
        </>
      ) : (
        <TransitionView />
      )}
    </Page>
  );
}
