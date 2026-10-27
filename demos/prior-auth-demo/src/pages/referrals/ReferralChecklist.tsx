import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CheckCircle2, FileText, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { AgentChip, Button, Card, Chip, ChecklistGroup, ChecklistItem, ChecklistProgress } from "@/components/ui";
import { DECLINE_LABEL, buildDocs, isOpen, type CheckKey, type Referral } from "@/data/referrals";
import { PROGRAM_LABEL } from "@/data/types";
import { plural } from "@/lib/format";
import { ago, longDate } from "@/lib/time";
import { stepPatchOf } from "@/pages/newcase/steps";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { acceptBlockers, askable, blockersLine, type AskKey } from "@/store/referralsLogic";
import { buildChecklist, type ChecklistRow } from "./checklist";
import { ChannelTag, StatusPill, UrgencyPill } from "./Chips";
import { AcceptModal } from "./modals/AcceptModal";
import { DeclineModal } from "./modals/DeclineModal";
import { OverrideModal } from "./modals/OverrideModal";
import { RequestInfoModal } from "./modals/RequestInfoModal";
import { caseOf, caseTo } from "./referralCase";
import { useContinueWithReferral } from "./useContinue";

type ModalState = { kind: "accept" } | { kind: "ask"; keys: AskKey[] } | { kind: "decline" } | { kind: "ok"; key: CheckKey } | null;

const LINK = "ml-auto inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-semibold text-forest hover:bg-sage-bg";

/** One referral as a checklist: what Reader found, what is missing, and the decision. `draftId` is the case it belongs to. */
export function ReferralChecklist({ r, draftId, onReplace }: { r: Referral; draftId: string; onReplace: () => void }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const running = useStore((s) => s.coverageRunning[r.id] !== undefined);
  const markOpened = useStore((s) => s.markReferralOpened);
  const runCoverage = useStore((s) => s.runCoverageCheck);
  const reply = useStore((s) => s.simulateReferrerReply);
  const reopen = useStore((s) => s.reopenReferral);
  const requests = useStore((s) => s.requests);
  const drafts = useStore((s) => s.caseDrafts);
  const patch = useStore((s) => s.patchCaseDraft);
  const [modal, setModal] = useState<ModalState>(null);
  const { go: goOn, dialog: attachDialog } = useContinueWithReferral(r.id, draftId);

  useEffect(() => markOpened(r.id), [r.id, markOpened]);

  const docs = useMemo(() => buildDocs(r), [r]);
  const list = useMemo(() => buildChecklist(r, docs, clock, running), [r, docs, clock, running]);
  const open = isOpen(r.status);
  const awaiting = r.status === "awaiting_info";
  const keys = askable(r);
  const marking = modal?.kind === "ok" ? r.checks.find((c) => c.key === modal.key) : undefined;
  const close = () => setModal(null);
  const blockers = open ? acceptBlockers(r) : [];
  const started = caseOf(r, requests, drafts);
  // This case is the one on screen: opening it means going back to its Intake, which now holds the referral.
  const openCase = () => (started?.kind === "draft" && started.id === draftId ? (patch(draftId, stepPatchOf("intake")), nav(paths.newCase({ draft: draftId }))) : started ? nav(caseTo(started)) : undefined);

  const actions = (row: ChecklistRow) => {
    const { ask, markable } = row;
    if (!open || row.state === "done" || row.state === "working") return null;
    if (row.id === "coverage") {
      if (!r.payerId) return null;
      return (
        <Button size="sm" icon={ShieldCheck} aria-label={`${row.state === "warn" ? "Check again" : "Run coverage check"}: ${row.label}`} onClick={() => runCoverage(r.id)}>
          {row.state === "warn" ? "Check again" : "Run coverage check"}
        </Button>
      );
    }
    return (
      <>
        {ask && !row.waiting ? (
          <Button size="sm" data-ask={ask} aria-label={`Ask the referrer: ${row.label}`} onClick={() => setModal({ kind: "ask", keys: [ask] })}>
            Ask the referrer
          </Button>
        ) : null}
        {markable ? (
          <Button size="sm" data-ok={markable} aria-label={`Mark OK: ${row.label}`} onClick={() => setModal({ kind: "ok", key: markable })}>
            Mark OK
          </Button>
        ) : null}
      </>
    );
  };

  const onward = open ? (
    <Button variant="primary" trailing={ArrowRight} disabled={blockers.length > 0} aria-describedby={blockers.length ? "accept-why" : undefined} onClick={() => setModal({ kind: "accept" })}>
      Accept referral and continue
    </Button>
  ) : r.status === "accepted" || r.status === "scheduled" ? (
    <Button variant="primary" trailing={ArrowRight} onClick={goOn}>Continue with this referral</Button>
  ) : r.status === "declined" ? (
    <Button icon={RotateCcw} onClick={() => reopen(r.id)}>Reopen referral</Button>
  ) : started ? (
    <Button variant="primary" trailing={ArrowRight} onClick={openCase}>Open the case</Button>
  ) : (
    <div className="text-right text-[13px] text-muted">
      <div className="font-semibold text-good-ink">Admitted</div>
      <Link to={paths.referral(r.id, draftId)} className="text-forest hover:underline">See the full referral</Link>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <AgentChip agent="reader" />
        <span className="text-[13px] text-muted">read</span>
        {docs.map((d) => (
          <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full border border-field bg-white px-3 py-1.5 text-[13px] font-medium">
            <FileText size={14} className="ico text-muted" />
            {d.title}
            <span className="font-normal text-muted">· {plural(d.pages.length, "page")}</span>
          </span>
        ))}
        <Button size="sm" variant="ghost" icon={RotateCcw} className="ml-auto" onClick={onReplace}>Use different documents</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-6 pt-5">
          <div className="min-w-0">
            <div className="font-semibold">{r.patient.initials}, {r.patient.age} <span className="ml-1 text-xs font-normal text-muted">{r.id}</span></div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[13px] text-muted">
              <span>{r.source.name}</span>
              <ChannelTag channel={r.channel} />
              <span>received {ago(r.receivedAt, clock)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {r.urgency !== "routine" ? <UrgencyPill urgency={r.urgency} /> : null}
            <Chip>{PROGRAM_LABEL[r.program]} requested</Chip>
            {open ? null : <StatusPill status={r.status} />}
          </div>
        </div>
        <div className="px-6 pt-4 pb-5">
          <ChecklistProgress done={list.done} total={list.total} right={onward} />
          {blockers.length ? <p id="accept-why" className="mt-2.5 text-right text-[13px] text-mid-ink">{blockersLine(blockers)}</p> : null}
        </div>

        {r.accepted && r.status !== "declined" ? (
          <div className="flex items-center gap-2.5 border-t border-good-edge bg-good-bg px-6 py-3 text-sm text-good-ink">
            <CheckCircle2 size={18} className="ico" />
            Accepted into {PROGRAM_LABEL[r.accepted.program]}. Target admission {longDate(r.accepted.admitBy)}.
          </div>
        ) : null}
        {r.status === "declined" && r.decline ? (
          <div className="flex items-center gap-2.5 border-t border-risk-edge bg-risk-bg px-6 py-3 text-sm text-risk-ink">
            <XCircle size={18} className="ico" />
            Declined: {DECLINE_LABEL[r.decline.reason]}.{r.decline.note ? ` ${r.decline.note}` : ""}
          </div>
        ) : null}

        {list.sections.map((s) => {
          const counted = s.rows.filter((x) => !x.optional);
          return (
            <ChecklistGroup key={s.title} title={s.title} done={counted.filter((x) => x.state === "done").length} total={counted.length}>
              {s.rows.map((row) => (
                <ChecklistItem key={row.id} state={row.state} label={row.label} detail={row.detail} tag={row.optional ? "Optional" : undefined} action={actions(row)} />
              ))}
            </ChecklistGroup>
          );
        })}

        <div className="flex flex-wrap items-center gap-2.5 border-t border-line px-6 py-4">
          {open && !awaiting && keys.length ? (
            <Button icon={Send} onClick={() => setModal({ kind: "ask", keys })}>
              {keys.length === 1 ? "Ask the referrer for the missing item" : `Ask the referrer for the ${keys.length} missing items`}
            </Button>
          ) : null}
          {open ? <Button variant="danger" onClick={() => setModal({ kind: "decline" })}>Decline</Button> : null}
          {awaiting ? <Button size="sm" variant="ghost" onClick={() => reply(r.id)}>Demo: the referrer replies</Button> : null}
          <Link to={paths.referral(r.id, draftId)} className={LINK}>
            Open the full referral
            <ArrowUpRight size={15} className="ico" />
          </Link>
        </div>
      </Card>

      {modal?.kind === "accept" ? <AcceptModal r={r} onClose={close} onAccepted={goOn} /> : null}
      {modal?.kind === "ask" ? <RequestInfoModal r={r} keys={modal.keys} onClose={close} /> : null}
      {modal?.kind === "decline" ? <DeclineModal ids={[r.id]} onClose={close} /> : null}
      {modal?.kind === "ok" && marking ? <OverrideModal id={r.id} check={marking} onClose={close} /> : null}
      {attachDialog}
    </>
  );
}
