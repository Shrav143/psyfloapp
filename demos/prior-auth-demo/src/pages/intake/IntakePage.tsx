import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { SiteTag } from "@/components/layout/SiteTag";
import { Page, PageHeader, UnderlineTabs } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { rosterInView } from "@/store/intakeSelectors";
import { PolicyButton } from "./policy/PolicyButton";
import { IntakeWorklist } from "./queue/IntakeWorklist";
import { ListSearch } from "./queue/ListSearch";
import { useIntakes } from "./queue/useIntakes";
import { StartScribeButton } from "./scribe/StartScribeButton";
import { TransitionView } from "./transition/TransitionView";

type View = "queue" | "transition";

/** Referrals & Intake: the Referral Queue, the landing page of the group. The six status cards and the worklist below them, or the July 2027 transition view.
    Where the demo's policy date comes from (post-transition by default) is the chip in the top bar. */
export default function IntakePage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "transition" ? "transition" : "queue";
  const records = useIntakes();
  const roster = useStore((s) => s.legacyRoster);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
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
        title={<>Referrals &amp; Intake<SiteTag /></>}
        sub="Manage incoming referrals, complete clinical assessments, and coordinate patients into appropriate care."
        actions={
          <>
            <ListSearch alsoClear={["view"]} />
            <Link to={paths.createReferral()} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl border border-transparent bg-forest px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-forest-dark">
              <Plus size={16} className="ico" />
              New referral
            </Link>
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UnderlineTabs<View> items={[{ id: "queue", label: "Referral queue", badge: records.length }, { id: "transition", label: "July 2027 transition", badge: legacyCount }]} value={view} onChange={setView} />
        <div className="flex items-center gap-2">
          <StartScribeButton />
          <PolicyButton />
        </div>
      </div>
      {view === "queue" ? <IntakeWorklist records={records} scope="queue" /> : <TransitionView />}
    </Page>
  );
}
