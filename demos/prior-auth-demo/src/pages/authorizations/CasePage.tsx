import { useMemo } from "react";
import { SearchX } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, Crumbs, EmptyState, Page, PageHeader, UnderlineTabs } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { caseIdOf, resolveCase, type CaseDetail } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, checkViews, currentChance, groupRecs, isWithPayer, liveView, projectedChance, type CaseWork, type LiveView } from "@/data/caseModel";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseHeader } from "./CaseHeader";
import { CaseHistory } from "./CaseHistory";
import { TABS, tabOf, type CaseCtx, type TabId } from "./caseTypes";
import { reviewPath } from "./reviewAndSign";
import { ActionsTab } from "./tabs/ActionsTab";
import { CriteriaRiskTab } from "./tabs/CriteriaRiskTab";
import { PictureDraftTab } from "./tabs/PictureDraftTab";

/** Why Send to payer is off, in a few words: it is the button's tooltip. */
function sendReasonOf(detail: CaseDetail, work: CaseWork, live: LiveView | null): string {
  if (live?.sent) return isWithPayer(live.stage) ? "With the payer" : `${live.chip}. Nothing left to send`;
  if (detail.chip) return `${detail.chip.text}. Nothing left to send`;
  if (detail.phase === "payer") return "With the payer";
  if (detail.phase === "denial") return "Denied. Advocate has the next step";
  const checks = checkViews(detail, work);
  return `Integrity ${checks.filter((c) => c.ok).length}/${checks.length}: apply the matching actions`;
}

function CaseView({ detail, work, live }: { detail: CaseDetail; work: CaseWork; live: LiveView | null }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { tab, section } = tabOf(sp.get("tab"));

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
  const sendReason = sendReasonOf(detail, work, live);
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
        {tab === "actions" ? <ActionsTab ctx={ctx} /> : tab === "draft" ? <PictureDraftTab ctx={ctx} section={section} /> : <CriteriaRiskTab ctx={ctx} section={section} />}
      </div>
      <CaseHistory ctx={ctx} />
    </Page>
  );
}

export default function CasePage() {
  const { id = "" } = useParams();
  const scope = useScope();
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
        <PageHeader title="Request not found" />
        <Card>
          <EmptyState
            icon={SearchX} title={`No request ${id}`}
            action={<Link to={paths.authorizations()} className="inline-flex h-[38px] items-center rounded-xl bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark">Back to queue</Link>}
          />
        </Card>
      </Page>
    );
  }
  // A request at the other site is not shown, counted or described: the card names no patient, only the site it belongs to.
  const caseId = caseIdOf(id, requests); // a denial's number can sit at another site than the case it came from; the case decides
  if (!scope.has(caseId)) {
    return (
      <Page>
        <OutOfSite id={caseId} what="case" />
        {scope.restricted ? null : (
          <div className="flex justify-center">
            <Button onClick={() => useStore.getState().setSiteScope("both")}>Show both sites</Button>
          </div>
        )}
      </Page>
    );
  }
  return <CaseView detail={detail} work={work} live={live} />;
}
