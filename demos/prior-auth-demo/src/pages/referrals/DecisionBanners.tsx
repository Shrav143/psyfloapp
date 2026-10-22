import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Banner, Button, Pill } from "@/components/ui";
import { CHECK_PROBLEM, DECLINE_LABEL, REPLY_VIA_LABEL, issueCount, staffById, type Referral } from "@/data/referrals";
import { PROGRAM_LABEL } from "@/data/types";
import { longDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useContinueWithReferral } from "./useContinue";

export type DetailTab = "extracted" | "validation" | "coverage" | "fit" | "activity";

/** The state of the referral in words, with the next step as a button. Only the most important one shows, so the page has one alert at a time:
    a decision (declined, accepted), then lapsed coverage, a wait on the referrer, then findings. The Coverage and Fit tabs carry their own headline, and the Validation tab lists the findings, so those banners step aside there. */
export function DecisionBanners({ r, onTab, draftId, tab }: { r: Referral; onTab: (t: DetailTab) => void; draftId?: string; tab: DetailTab }) {
  const nav = useNavigate();
  const reopen = useStore((s) => s.reopenReferral);
  const requests = useStore((s) => s.requests);
  const { go: goOn, dialog } = useContinueWithReferral(r.id, draftId);
  const linked = requests.find((x) => x.referralId === r.id) ?? (r.requestId ? requests.find((x) => x.id === r.requestId) : undefined);
  const issues = issueCount(r.checks);
  const out: React.ReactElement[] = [];

  if (r.status === "declined" && r.decline) {
    out.push(
      <Banner key="declined" tone="risk" title={`Declined: ${DECLINE_LABEL[r.decline.reason]}`} action={<Button size="sm" onClick={() => reopen(r.id)}>Reopen</Button>}>
        {r.decline.note ? `${r.decline.note} ` : ""}
        {r.decline.courtesy ? "A courtesy reply went to the referrer." : "No reply was sent to the referrer."}
      </Banner>,
    );
  }

  if ((r.status === "accepted" || r.status === "scheduled" || r.status === "admitted") && r.accepted) {
    const a = r.accepted;
    out.push(
      <Banner
        key="accepted"
        tone="good"
        title={r.status === "admitted" ? `Admitted into ${PROGRAM_LABEL[a.program]}` : `Accepted into ${PROGRAM_LABEL[a.program]}`}
        action={
          linked ? (
            <Button size="sm" onClick={() => nav(paths.dashboard({ request: linked.id }))}>Open {linked.id}</Button>
          ) : r.status !== "admitted" ? (
            <Button variant="primary" trailing={ArrowRight} onClick={goOn}>Continue to medical records</Button>
          ) : undefined
        }
      >
        {r.status === "admitted" && r.admittedAt !== undefined ? `Admitted ${stamp(r.admittedAt)}.` : `Target admission ${longDate(a.admitBy)}. Owner ${staffById(a.by).name}.`}
        {r.status === "scheduled" && r.intakeAt !== undefined ? ` Intake visit ${stamp(r.intakeAt)}.` : ""}
        {linked ? (
          <span className="mt-1 flex flex-wrap items-center gap-2">
            Linked request <Link to={paths.dashboard({ request: linked.id })} className="font-semibold underline underline-offset-[3px]">{linked.id}</Link>
            <Pill tone={linked.tone}>{linked.chip}</Pill>
          </span>
        ) : r.status !== "admitted" ? (
          <span className="block">No request is linked yet. Continue to the medical records to build the authorization for this patient.</span>
        ) : null}
      </Banner>,
    );
  }

  if (r.status === "awaiting_info") {
    out.push(
      <Banner key="awaiting" tone="mid" title="Waiting on the referrer">
        {r.infoAskedAt !== undefined ? `You asked ${r.source.name} by ${REPLY_VIA_LABEL[r.infoRequest?.via ?? "fax"].toLowerCase()} ${stamp(r.infoAskedAt)}. ` : ""}
        Reader reads the reply as soon as it arrives. For the demo, open More and choose "Demo: simulate the referrer's reply".
      </Banner>,
    );
  }

  if ((r.status === "new" || r.status === "in_review") && issues > 0) {
    out.push(
      <Banner key="issues" tone="mid" icon={AlertTriangle} title={`Reader found ${issues} ${issues === 1 ? "thing" : "things"} to check`} action={<Button size="sm" onClick={() => onTab("validation")}>Review findings</Button>}>
        {r.checks.filter((c) => c.state !== "pass" && !c.resolved).map((c) => CHECK_PROBLEM[c.key]).join(". ")}.
      </Banner>,
    );
  }

  if (r.coverage?.kind === "lapsed" && (r.status === "new" || r.status === "in_review" || r.status === "awaiting_info")) {
    out.push(
      <Banner key="lapsed" tone="risk" icon={ShieldAlert} title="Verify found that coverage has lapsed" action={<Button size="sm" onClick={() => onTab("coverage")}>Open coverage</Button>}>
        Fix this before billing. Ask the referrer about a renewal or a new plan.
      </Banner>,
    );
  }

  const RANK = ["declined", "accepted", "lapsed", "awaiting", "issues"];
  const quiet = tab === "coverage" || tab === "fit" ? ["lapsed", "awaiting", "issues"] : tab === "validation" ? ["issues"] : [];
  const shown = out.filter((b) => !quiet.includes(String(b.key))).sort((a, b) => RANK.indexOf(String(a.key)) - RANK.indexOf(String(b.key)))[0];
  return (
    <>
      {shown ?? null}
      {dialog}
    </>
  );
}
