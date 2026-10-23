import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chance, Chip, Crumbs, Disclosure, KeyValue, Meter, Page, PageHeader, Pill, Timeline } from "@/components/ui";
import { LEDGER_STATUS_LABEL } from "@/data/manager";
import { reviewDate, reviewStamp } from "@/data/managerReviews";
import { similarCases } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { band } from "@/lib/format";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, STATUS_TONE, clockText, reviewLink, runsOutBeforeReview, usedShare, usedText } from "./helpers";
import { authWindow, caseHistory, nextStep, reviewsOf } from "./ledgerCase";
import type { LedgerRow } from "./ledgerRows";
import { useWorkflowLine } from "./useWorkflowLine";

/** A case that is in the Case Manager ledger but has no request in the queue: a calm summary from the ledger record, with the one action that fits. */
export default function LedgerCasePage({ row }: { row: LedgerRow }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const all = useStore((s) => s.reviews);
  const mine = useMemo(() => reviewsOf(row, all), [row, all]);
  const workflow = useWorkflowLine(row);
  const history = useMemo(() => [...caseHistory(row, mine, clock), ...(workflow?.events ?? [])], [row, mine, clock, workflow]);

  const payer = payerById(row.payerId);
  const win = authWindow(row);
  const share = usedShare(row);
  const clk = clockText(row, clock);
  const b = band(row.chance);
  const { due, signed, next } = mine;
  const runsOut = runsOutBeforeReview(row, all, clock);
  /* Lines at the same minute keep the order they were written in, so the one written last is the latest. */
  const latest = history.map((e, i) => ({ e, i })).filter((x) => x.e.done).sort((a, b) => b.e.at - a.e.at || b.i - a.i)[0]?.e;

  return (
    <Page>
      <Crumbs items={[{ label: "Case Manager", to: paths.manager() }, { label: row.id }]} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Chip className="font-sans tracking-normal">{PROGRAM_LABEL[row.program]}</Chip>
            <span>{row.id}</span>
            <Chip className="font-sans tracking-normal">{row.note}</Chip>
            <Pill tone={STATUS_TONE[row.status]} dot className="font-sans tracking-normal">{LEDGER_STATUS_LABEL[row.status]}</Pill>
          </span>
        }
        sub={`${row.initials}, ${row.age} · ${payer.name} · ${PROGRAM_LABEL[row.program]}`}
        actions={
          <>
            {due ? <Button variant="primary" icon={FileText} onClick={() => navigate(reviewLink(due.id))}>Open the review</Button> : null}
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(paths.manager())}>Back to Case Manager</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Case summary" subtitle="From the Case Manager ledger" right={<Pill tone="neutral" dot>Privacy mode on</Pill>} />
          <CardBody>
            <KeyValue
              items={[
                ["Patient", `${row.initials}, ${row.age}`],
                ["Payer", payer.name],
                ["Service", `${row.note} · ${PROGRAM_LABEL[row.program]}`],
                ...(workflow ? ([["Workflow", <span key="wf" data-testid="case-workflow">{workflow.text}{workflow.usedDefault ? <span className="font-normal text-muted"> · illustrative default</span> : null}</span>]] as [string, ReactNode][]) : []),
                ["Authorization", win ? `${reviewDate(win.start)} to ${reviewDate(win.end)}` : <span className="font-normal text-muted">Not approved yet</span>],
                [
                  "Units used",
                  share === null ? (
                    <span className="font-normal text-muted">Not approved yet. Units count from the first approved day.</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Meter value={share * 100} color={share >= 0.75 ? "#B5553A" : "#1D4F43"} height={6} className="w-[120px]" />
                      <span>{usedText(row)}{runsOut ? <span className="ml-2 text-[13px] font-semibold text-risk-ink">Runs out before review</span> : null}</span>
                    </div>
                  ),
                ],
                [
                  "Reviews due",
                  due ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      Review {due.reviewNo}, {reviewStamp(due.dueAt)}
                      <Pill tone={REVIEW_STATUS_TONE[due.status]}>{REVIEW_STATUS_LABEL[due.status]}</Pill>
                    </span>
                  ) : (
                    <span className="font-normal text-muted">{signed ? `Review ${signed.reviewNo} is signed` : win ? "None this week" : "None until the request is approved"}</span>
                  ),
                ],
                ...(next ? ([["Next review", reviewStamp(next.dueAt)]] as [string, string][]) : []),
                ["Next on the clock", <span key="clk" className={cn(clk.urgent && "text-risk-ink")}>{clk.text}</span>],
                [
                  "Approval chance",
                  <div key="ch" className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <Chance value={row.chance} />
                      <Pill tone={b.tone} dot>{b.word} · likely range {row.chance - 6}–{Math.min(99, row.chance + 6)}%</Pill>
                    </div>
                    <span className="text-[13px] font-normal text-muted">Based on {similarCases(row.payerId, row.program).total.toLocaleString("en-US")} similar decisions. It never blocks a request.</span>
                  </div>,
                ],
              ]}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Next step" />
            <CardBody className="py-4">
              <p>{nextStep(row, mine)}</p>
            </CardBody>
          </Card>
          <Disclosure title="History" summary={latest ? `${history.length} ${history.length === 1 ? "entry" : "entries"}. Latest: ${latest.text}` : `${history.length} ${history.length === 1 ? "entry" : "entries"}`}>
            <CardBody>
              <Timeline events={history} />
            </CardBody>
          </Disclosure>
        </div>
      </div>
    </Page>
  );
}
