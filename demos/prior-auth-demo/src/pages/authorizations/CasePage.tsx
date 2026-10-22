import { useMemo } from "react";
import { SearchX } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, Crumbs, EmptyState, Page, PageHeader, UnderlineTabs } from "@/components/ui";
import { resolveCase, type CaseDetail } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, checkViews, currentChance, groupRecs, isWithPayer, liveView, projectedChance, sendBlockedReason, type CaseWork, type LiveView } from "@/data/caseModel";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseHeader } from "./CaseHeader";
import { CaseHistory } from "./CaseHistory";
import { TABS, type CaseCtx, type TabId } from "./caseTypes";
import { reviewPath } from "./reviewAndSign";
import { ActionsTab } from "./tabs/ActionsTab";
import { CriteriaTab } from "./tabs/CriteriaTab";
import { DraftTab } from "./tabs/DraftTab";
import { PictureTab } from "./tabs/PictureTab";
import { RiskTab } from "./tabs/RiskTab";

function CaseView({ detail, work, live }: { detail: CaseDetail; work: CaseWork; live: LiveView | null }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const param = sp.get("tab");
  const tab: TabId = TABS.some((t) => t.id === param) ? (param as TabId) : "actions";

  const goTab = (t: TabId, rec?: string) =>
    setSp((p) => {
      const n = new URLSearchParams(p);
      n.set("tab", t);
      if (rec) n.set("rec", rec);
      else n.delete("rec");
      return n;
    });
  // A request that already left Preparing has nothing to send, whatever its checks say.
  const sent = live?.sent === true || detail.phase === "payer";
  const sendReason = live?.sent ? (isWithPayer(live.stage) ? "Already with the payer. Navigator is tracking it." : `${live.chip}. Nothing is left to send.`) : sendBlockedReason(detail, work);
  const ctx: CaseCtx = {
    detail, work, key: detail.requestId, chance: currentChance(detail, work), projected: projectedChance(detail, work), canSend: !sent && canSend(detail, work), sendReason, sent, live,
    send: () => navigate(reviewPath(detail)), goTab, focusRec: tab === "actions" ? sp.get("rec") : null,
  };
  const openRecs = groupRecs(detail, work).open.length;
  const failing = checkViews(detail, work).filter((c) => !c.ok).length;

  return (
    <Page>
      <Crumbs items={[{ label: "Authorizations", to: paths.authorizations() }, { label: detail.id }]} />
      <CaseHeader ctx={ctx} />
      <UnderlineTabs
        value={tab} onChange={(t) => goTab(t)}
        items={TABS.map((t) => ({ ...t, badge: t.id === "actions" && openRecs > 0 ? openRecs : t.id === "draft" && failing > 0 ? failing : undefined }))}
      />
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="psy-fade-up">
        {tab === "actions" ? <ActionsTab ctx={ctx} /> : tab === "picture" ? <PictureTab ctx={ctx} /> : tab === "criteria" ? <CriteriaTab ctx={ctx} /> : tab === "risk" ? <RiskTab ctx={ctx} /> : <DraftTab ctx={ctx} />}
      </div>
      <CaseHistory ctx={ctx} />
    </Page>
  );
}

export default function CasePage() {
  const { id = "" } = useParams();
  const requests = useStore((s) => s.requests);
  const base = useMemo(() => resolveCase(id, requests), [id, requests]);
  const stored = useStore((s) => (base ? s.queueCases[base.requestId] : undefined));
  const work = stored ?? EMPTY_WORK;
  const detail = useMemo(() => (base ? withFocus(base, work) : null), [base, work]);
  const live = useMemo(() => (base ? liveView(base, requests) : null), [base, requests]);
  if (!detail) {
    return (
      <Page>
        <Crumbs items={[{ label: "Authorizations", to: paths.authorizations() }, { label: id || "Request" }]} />
        <PageHeader title="Request not found" sub={`There is no request with the ID ${id}.`} />
        <Card>
          <EmptyState
            icon={SearchX} title="Nothing to show here"
            action={<Link to={paths.authorizations()} className="inline-flex h-[38px] items-center rounded-xl bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark">Back to queue</Link>}
          >
            Check the ID, or open a request from the queue.
          </EmptyState>
        </Card>
      </Page>
    );
  }
  return <CaseView detail={detail} work={work} live={live} />;
}
