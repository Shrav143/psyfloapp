import { useMemo, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Wand2 } from "lucide-react";
import { ActorBadge, Button, Chance, Drawer, KeyValue, Meter, Pill } from "@/components/ui";
import { EMPTY_WORK } from "@/data/caseModel";
import { resolveCase, type CaseDetail } from "@/data/caseDetail";
import { similarCases } from "@/data/cases";
import { LEDGER_STATUS_LABEL } from "@/data/manager";
import { inWeek, reviewDate, reviewStamp } from "@/data/managerReviews";
import { payerById } from "@/data/seed";
import { SITES, siteOf } from "@/data/sites";
import { PROGRAM_LABEL } from "@/data/types";
import { band } from "@/lib/format";
import { stamp } from "@/lib/time";
import { cn } from "@/lib/cn";
import { documentStatus } from "@/pages/authorizations/facts";
import { draftForRequest, requestDraft } from "@/pages/newcase/fromRequest";
import { usePayerContext } from "@/pages/newcase/payerContext";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useDialogFocus } from "@/pages/denials/lib/useDialogFocus";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, STATUS_TONE, clockText, nextReviewFor, runsOutBeforeReview, usedShare, usedText } from "./helpers";
import { authWindow, latestHistory, nextStep, reviewsOf } from "./ledgerCase";
import type { LedgerRow } from "./ledgerRows";
import { useDraftReviews } from "./useDraftReviews";
import { useWorkflowLine } from "./useWorkflowLine";

/** The documents the payer lists for this case, counted the way the case page counts them. Rendered only for a case that has a case page of its own, so the hooks always run. */
function Documents({ detail }: { detail: CaseDetail }) {
  const clock = useStore((s) => s.clock);
  const work = useStore((s) => s.queueCases[detail.requestId]) ?? EMPTY_WORK;
  const shared = useStore((s) => draftForRequest(s.caseDrafts, detail.requestId, detail.id));
  const payerCtx = usePayerContext(detail);
  const docs = useMemo(() => documentStatus(shared ?? requestDraft(detail, work, clock, payerCtx), payerCtx.items), [shared, detail, work, clock, payerCtx]);
  if (docs.total === 0) return <span className="font-normal text-muted">None listed for this payer</span>;
  if (docs.missing.length === 0) return <>Complete, all {docs.total} in the packet</>;
  return <>{docs.have} of {docs.total}<span className="font-normal text-muted">. Missing: {docs.missing.slice(0, 2).join(", ")}{docs.missing.length > 2 ? ` and ${docs.missing.length - 2} more` : ""}</span></>;
}

/**
 * A tracker row in a right-hand panel: the summary first (what is due next, units or days used and left, the approved window, level of care, payer, site, approval chance, the next review,
 * documents, the three newest lines of history), then Open case and, where it applies, Draft review or Open review. The full case is one button away.
 */
export function CaseQuickView({ row, from, onClose, onOpenReview }: { row: LedgerRow; from: RefObject<HTMLElement | null>; onClose: () => void; onOpenReview: (id: string) => void }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const reviews = useStore((s) => s.reviews);
  const requests = useStore((s) => s.requests);
  const mine = useMemo(() => reviewsOf(row, reviews), [row, reviews]);
  const review = nextReviewFor(row, reviews);
  const toDraft = !!review && review.status === "due" && inWeek(review);
  const { drafting, draft } = useDraftReviews(review ? [review.id] : []);
  const detail = useMemo(() => resolveCase(row.caseId, requests), [row.caseId, requests]);
  const workflow = useWorkflowLine(row);
  const history = useMemo(() => [...latestHistory(row, requests, mine, clock), ...(workflow?.events ?? [])].sort((a, b) => b.at - a.at).slice(0, 3), [row, requests, mine, clock, workflow]);
  const body = useDialogFocus(from, ["[data-quick-first]"]);

  const payer = payerById(row.payerId);
  const site = SITES.find((s) => s.id === siteOf(row.caseId));
  const win = authWindow(row);
  const share = usedShare(row);
  const clk = clockText(row, clock);
  const b = band(row.chance);
  const runsOut = runsOutBeforeReview(row, reviews, clock);

  const items: [string, ReactNode][] = [
    [
      "Units or days",
      share === null ? (
        <span className="font-normal text-muted">Not approved yet. Units count from the first approved day.</span>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span>{usedText(row)}</span>
          <Meter value={share * 100} color={share >= 0.75 ? "#B5553A" : "#217A78"} height={6} className="w-[160px]" />
          {runsOut ? <span className="text-[13px] font-semibold text-risk-ink">Runs out before review</span> : null}
        </div>
      ),
    ],
    ["Approved window", win ? `${reviewDate(win.start)} to ${reviewDate(win.end)}` : <span key="w" className="font-normal text-muted">Not approved yet</span>],
    ["Level of care", `${PROGRAM_LABEL[row.program]} · ${row.note}`],
    ["Payer", payer.name],
    ...(workflow ? ([["Workflow", <span key="wf">{workflow.text}</span>]] as [string, ReactNode][]) : []),
    ["Site", site ? `${site.name} · ${site.sub}` : siteOf(row.caseId)],
    [
      "Approval chance",
      <div key="ch" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <Chance value={row.chance} />
          <Pill tone={b.tone} dot>{b.word} · likely {row.chance - 6}–{Math.min(99, row.chance + 6)}%</Pill>
        </div>
        <span className="text-[13px] font-normal text-muted">From {similarCases(row.payerId, row.program).total.toLocaleString("en-US")} similar decisions. It never blocks a request.</span>
      </div>,
    ],
    [
      "Next review",
      review ? (
        <span key="rv" className="inline-flex flex-wrap items-center gap-2">
          Review {review.reviewNo}, {reviewStamp(review.dueAt)}
          <Pill tone={REVIEW_STATUS_TONE[review.status]}>{REVIEW_STATUS_LABEL[review.status]}</Pill>
        </span>
      ) : (
        <span key="rv" className="font-normal text-muted">{win ? "None booked" : "None until the request is approved"}</span>
      ),
    ],
    ...(detail ? ([["Documents", <Documents key="docs" detail={detail} />]] as [string, ReactNode][]) : []),
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={`${row.id} · ${payer.shortName}`}
      subtitle={`${row.initials}, ${row.age} · ${PROGRAM_LABEL[row.program]} · ${row.note}`}
      right={<Pill tone={STATUS_TONE[row.status]} dot>{LEDGER_STATUS_LABEL[row.status]}</Pill>}
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary" data-quick-first onClick={() => navigate(paths.case(row.caseId))}>Open case</Button>
          {toDraft ? <Button icon={Wand2} loading={drafting} onClick={draft}>Draft review</Button> : null}
          {review && (review.status === "drafted" || review.status === "needs_update") ? <Button icon={FileText} onClick={() => onOpenReview(review.id)}>Open review</Button> : null}
        </div>
      }
    >
      <div ref={body} tabIndex={-1} className="flex flex-col gap-6 outline-none">
        <div>
          <div className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Next due</div>
          <div className={cn("mt-1 font-serif text-[18px] leading-tight font-semibold", clk.urgent && "text-risk-ink")}>{clk.text}</div>
          <p className="mt-1.5 text-[14px] text-ink2">{nextStep(row, mine)}</p>
        </div>
        <KeyValue className="grid-cols-[130px_1fr] text-[14px]" items={items} />
        <div>
          <h3 className="mb-3 font-serif text-[18px] font-semibold">Latest history</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Nothing has happened on this case yet.</p>
          ) : (
            <ol aria-label="Latest history" className="m-0 flex list-none flex-col gap-3 p-0">
              {history.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <ActorBadge actor={e.actor} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted">{stamp(e.at)}</div>
                    <div className="text-[14px]">{e.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Drawer>
  );
}
