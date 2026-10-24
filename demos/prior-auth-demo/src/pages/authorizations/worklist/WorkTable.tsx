import { ArrowDown, ArrowUp, ArrowUpDown, PanelRightOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentBadge, Button, Meter, Pill, Table, Td, Th, Tr } from "@/components/ui";
import { InfoTip } from "@/components/ui/InfoTip";
import { AGENTS } from "@/data/agents";
import { isClean } from "@/data/managerReviews";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { band as chanceBand } from "@/lib/format";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/pages/manager/helpers";
import { paths } from "@/routes";
import { reviewLine, type Go, type SortKey, type View, type WorkRow } from "./model";

export const PAGE = 15;

/** The same actions in fewer words, so the button column stays narrow. */
const SHORT: Record<string, string> = { "Open in Denial Intelligence": "Open the denial", "Open on the Dashboard": "Open on Dashboard", "Go to this action": "Go to action" };

function SortTh({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: { key: SortKey | null; dir: 1 | -1 }; onSort: (k: SortKey) => void; className?: string }) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <Th className={className} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1.5 uppercase tracking-[0.09em] hover:text-ink", on && "text-ink")} aria-label={`Sort by ${label}`}>
        {label}
        <Icon size={13} className="ico" />
      </button>
    </Th>
  );
}

/** The one table: who and what, where it stands, what to do next and by when, who has it, the approval chance, and the specific next action as a button.
    A click on the row away from a link or button opens its quick view (a request in the queue, or an approved authorization); the ID opens the full case. */
export function WorkTable({ rows, view, page, onPage, sort, onSort, quickKey, onQuick, onAct }: {
  rows: WorkRow[];
  view: View;
  page: number;
  onPage: (p: number) => void;
  sort: { key: SortKey | null; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  quickKey: string | null;
  onQuick: (row: WorkRow, from: HTMLElement | null) => void;
  onAct: (row: WorkRow, go: Go) => void;
}) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * PAGE, at * PAGE + PAGE);
  const reviews = view === "reviews";
  return (
    <>
      <Table className="[&_td]:px-2.5 [&_td]:py-3 [&_th]:px-2.5 [&_th]:py-3">
        <thead>
          <tr>
            <SortTh label="Patient / request" k="request" sort={sort} onSort={onSort} />
            <SortTh label="Status" k="status" sort={sort} onSort={onSort} className="hidden min-[1100px]:table-cell" />
            <Th>{reviews ? "Review" : "Next action"}</Th>
            <SortTh label={reviews ? "Due" : "Deadline"} k="due" sort={sort} onSort={onSort} />
            <Th className="hidden min-[1400px]:table-cell">Owner</Th>
            <SortTh label="Chance" k="chance" sort={sort} onSort={onSort} className="hidden text-right min-[1240px]:table-cell" />
            <Th className="relative">
              <span className="sr-only">Action</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const payer = r.payerId ? payerById(r.payerId) : null;
            const quickable = !!(r.src.item || r.src.ledger);
            const b = r.chance === null ? null : chanceBand(r.chance);
            const action = reviews && r.reviewAction ? r.reviewAction : r.action;
            return (
              <Tr
                key={r.key}
                data-row={r.id}
                selected={quickKey === r.key}
                onClick={quickable ? (e) => { if (!(e.target as HTMLElement).closest("button, a")) onQuick(r, e.currentTarget.querySelector<HTMLElement>("[data-quick]")); } : undefined}
              >
                <Td className="min-w-[160px] max-w-[240px]">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    {r.src.draft && !r.src.item && !r.src.ledger && !r.src.request ? (
                      <Link to={paths.newCase({ draft: r.src.draft.id })} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.id}</Link>
                    ) : (
                      <Link to={paths.case(r.caseId)} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.id}</Link>
                    )}
                    <span className="text-[13px] text-muted">· {r.initials || "No patient yet"}{r.age ? `, ${r.age}` : ""}</span>
                    {quickable ? (
                      <button type="button" data-quick aria-label={`Quick view ${r.id}`} title="Quick view" aria-haspopup="dialog" onClick={(e) => onQuick(r, e.currentTarget)} className="inline-grid h-6 w-6 translate-y-[3px] place-items-center rounded-md text-muted hover:bg-black/5 hover:text-ink">
                        <PanelRightOpen size={15} className="ico" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="text-[13px] text-muted">{[r.service, payer?.shortName ?? "No payer yet", r.typeLabel].filter(Boolean).join(" · ")}</div>
                  <div className="mt-1.5 min-[1100px]:hidden">
                    <StatusCell r={r} />
                  </div>
                  {r.notes.map((n) => {
                    const [head, rest] = n.split(": ");
                    return (
                      <div key={n} title={rest ? n : undefined} className={cn("text-[12px] font-medium", n === "New today" ? "text-good-ink" : "text-ink2")}>{head}</div>
                    );
                  })}
                </Td>
                <Td className="hidden min-w-[130px] min-[1100px]:table-cell">
                  <StatusCell r={r} />
                </Td>
                <Td className="min-w-[150px] max-w-[280px] text-[13px]">
                  {r.owner ? (
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[12px] text-muted min-[1400px]:hidden">
                      <AgentBadge agent={r.owner} size={18} />
                      {AGENTS[r.owner].name}
                    </span>
                  ) : null}
                  {reviews && r.review ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <Pill tone={REVIEW_STATUS_TONE[r.review.status]}>{REVIEW_STATUS_LABEL[r.review.status]}</Pill>
                        {r.review.status === "drafted" && !isClean(r.review) ? <Pill tone="mid">Check to look at</Pill> : null}
                      </span>
                      {r.review.status === "needs_update" && r.review.missing ? <span className="line-clamp-2 text-mid-ink">{r.review.missing}</span> : null}
                    </div>
                  ) : (
                    <>
                      <span className="line-clamp-2">{r.next}</span>
                      {r.src.draft && r.src.item && r.life === "progress" ? (
                        <Link to={paths.newCase({ draft: r.src.draft.id })} className="text-[12px] font-semibold text-forest hover:underline">
                          Open the draft in New Case
                        </Link>
                      ) : null}
                    </>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {reviews && r.review ? (
                    <span className="text-[13px]">{reviewLine(r.review)}</span>
                  ) : r.due ? (
                    <Pill tone={r.due.tone} dot={r.band === "now"}>{r.due.text}</Pill>
                  ) : (
                    <span className="text-[13px] text-muted">None</span>
                  )}
                  {b && r.chance !== null ? (
                    <div className="mt-1 text-[12px] font-semibold tabular-nums min-[1240px]:hidden" style={{ color: b.color }}>{Math.round(r.chance)}% chance</div>
                  ) : null}
                </Td>
                <Td className="hidden whitespace-nowrap min-[1400px]:table-cell">
                  {r.owner ? (
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <AgentBadge agent={r.owner} size={22} />
                      {AGENTS[r.owner].name}
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">None</span>
                  )}
                </Td>
                <Td className="hidden text-right whitespace-nowrap min-[1240px]:table-cell">
                  {b && r.chance !== null ? (
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: b.color }} aria-label={`Approval chance ${Math.round(r.chance)} percent`}>{Math.round(r.chance)}%</span>
                  ) : (
                    <span className="text-[13px] text-muted">None</span>
                  )}
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {action ? (
                    <Button size="sm" variant={action.primary ? "primary" : "outline"} onClick={() => onAct(r, action.go)} aria-label={`${action.label} ${r.id}`} title={SHORT[action.label] ? action.label : undefined}>
                      {SHORT[action.label] ?? action.label}
                    </Button>
                  ) : null}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {rows.length > PAGE ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-[13px] text-muted" aria-live="polite">
            {at * PAGE + 1} to {Math.min(rows.length, at * PAGE + PAGE)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={at === 0} onClick={() => onPage(at - 1)}>Previous</Button>
            <span className="text-[13px] text-muted">Page {at + 1} of {pages}</span>
            <Button size="sm" disabled={at >= pages - 1} onClick={() => onPage(at + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The status chip, the extra chips and, on an approved authorization, the units used and left. */
function StatusCell({ r }: { r: WorkRow }) {
  return (
    <>
      <div className="flex flex-wrap items-start gap-1">
        <Pill tone={r.status.tone}>{r.status.text}</Pill>
        {r.flags.map((f) =>
          f.to === "eligibility" ? (
            <Link key={f.text} to={paths.eligibilityVerify({ case: r.id })} aria-label={`${f.text} for ${r.id}. Open Eligibility and Benefits`}>
              <Pill tone={f.tone} dot>{f.text}</Pill>
            </Link>
          ) : (
            <Pill key={f.text} tone={f.tone}>{f.text}</Pill>
          ),
        )}
      </div>
      {r.units ? (
        <div className="mt-1.5 flex flex-col gap-1">
          <span className="text-[12px] text-ink2">{r.units.text}</span>
          <Meter value={r.units.share * 100} color={r.units.share >= 0.75 ? "#B5553A" : "#1D4F43"} height={4} className="w-[110px]" />
          {r.units.runsOut ? <span className="text-[12px] font-semibold text-risk-ink">Runs out before review</span> : null}
        </div>
      ) : null}
    </>
  );
}

/** The open requests' average approval chance and the help for the units and chance figures, at the right of the table's header. */
export function TableHelp({ avgChance }: { avgChance: number | null }) {
  const b = avgChance === null ? null : chanceBand(avgChance);
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted">
      {b && avgChance !== null ? (
        <>
          Approval chance, open requests <b className="font-semibold tabular-nums" style={{ color: b.color }}>{avgChance}%</b>
        </>
      ) : null}
      <InfoTip label="About units and approval chance" align="end">
        Units or days left are worked out at the usual pace: a day of care a day, about three units a week for IOP. "Runs out before review" appears only when that pace uses the approval up before the next review. Approval chance estimates how well the paperwork fits the payer's past decisions, a range of about 6 points either way: Strong is 80 and above, Moderate 55 to 79, At risk below 55. It never blocks a request.
      </InfoTip>
    </span>
  );
}
