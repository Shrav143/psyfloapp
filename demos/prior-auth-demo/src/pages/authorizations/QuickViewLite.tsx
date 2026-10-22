import { useMemo, type ReactNode } from "react";
import { PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActorBadge, AgentBadge, Button, Drawer, KeyValue, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { detailForQueueItem } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, rangeOf } from "@/data/caseModel";
import { STATUS_LABEL, type QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import { band as chanceBand } from "@/lib/format";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { historyOf } from "./history";
import { nextActionOf } from "./nextAction";
import { DUE_TONE, PHASE_TONE, chanceOf, dueText, phaseOf } from "./queueLogic";
import { reviewPath } from "./reviewAndSign";
import { useAuthFacts } from "./useAuthFacts";

const SHOWN_EVENTS = 3;

/** The summary of a request that has no Dashboard request yet, in a right-hand panel: status, next action, deadline, who it waits on, units and window when the Case Manager
    ledger has them, documents, the site (only for a viewer who can see both), the approval chance and the last three history lines. Open case goes to the full page;
    Review and sign appears while the request is still being prepared. */
export function QuickViewLite({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const cases = useStore((s) => s.queueCases);
  const work = cases[item.id] ?? EMPTY_WORK;
  const detail = useMemo(() => withFocus(detailForQueueItem(item), work), [item, work]);
  const { facts } = useAuthFacts(detail, work, null);
  const phase = phaseOf(item, cases);
  const chance = chanceOf(item, cases);
  const next = nextActionOf({ detail, work, live: null, canSend: canSend(detail, work) });
  const [lo, hi] = rangeOf(detail, chance);
  const b = chanceBand(chance);
  const payer = payerById(item.payerId);
  const events = useMemo(() => historyOf(undefined, work.log), [work.log]);
  const recent = events.slice(0, SHOWN_EVENTS);
  const unsent = phase === "preparing" || phase === "ready";
  const asks = item.needsInput && phase !== "ready";

  const rows: [string, ReactNode][] = [
    ["Status", <span key="s" className="inline-flex flex-wrap items-center gap-1.5"><Pill tone={PHASE_TONE[phase]}>{STATUS_LABEL[phase]}</Pill>{asks ? <Pill tone="mid">Needs your input</Pill> : null}{item.coverageFix ? <Pill tone="risk" dot>Coverage needs a fix</Pill> : null}</span>],
    ["Deadline", <Pill key="d" tone={DUE_TONE[item.band]} dot={item.band === "now"}>{dueText(item.dueVerb, item.dueAt, clock)}</Pill>],
    ...facts.filter((f) => f.label !== "Request type").map((f): [string, ReactNode] => [f.label, <span key={f.label}>{f.value}{f.note ? <span className="font-normal text-muted"> · {f.note}</span> : null}</span>]),
    ["Approval chance", <span key="c">{Math.round(chance)}% · {b.word}<span className="font-normal text-muted"> · likely {lo} to {hi}%</span></span>],
  ];

  return (
    <Drawer
      open onClose={onClose} width={560} title={`${item.id} · ${payer.name}`}
      subtitle={`${item.initials}, ${item.age} · ${item.levelLabel} ${item.type.toLowerCase()}`}
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant={unsent ? "outline" : "primary"} onClick={() => navigate(paths.case(item.id))}>Open case</Button>
          {unsent ? <Button variant="primary" icon={PenLine} onClick={() => navigate(reviewPath(detail))}>Review and sign</Button> : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <section aria-label="Next action" className="rounded-2xl border border-forest/25 bg-[#F3F7F4] px-4 py-3.5">
          <div className="text-[15px] font-semibold leading-snug"><span className="text-forest">Next:</span> {next.text}</div>
          {next.why ? <div className="mt-0.5 text-[13.5px] text-ink2">{next.why}</div> : null}
        </section>
        <KeyValue className="grid-cols-[130px_1fr] text-[14px]" items={rows} />
        <div>
          <h3 className="mb-3 font-serif text-xl font-semibold">History</h3>
          {recent.length === 0 ? (
            <p className="m-0 text-sm text-muted">Nothing has happened on this request yet. Events appear when an agent or a person acts on it.</p>
          ) : (
            <ol aria-label="Latest history" className="m-0 flex list-none flex-col gap-3 p-0">
              {recent.map((l) => (
                <li key={l.key} className="flex items-start gap-2.5">
                  {l.actor === "you" || l.actor === "payer" || l.actor === "system" ? <ActorBadge actor={l.actor} /> : <AgentBadge agent={l.actor} size={22} />}
                  <div className="min-w-0 text-[14px]">
                    <div className="text-xs text-muted">{l.scheduled ? `Scheduled ${stamp(l.at)}` : stamp(l.at)}{l.actor === "you" ? " · you" : l.actor === "payer" || l.actor === "system" ? "" : ` · ${AGENTS[l.actor].name} (agent)`}</div>
                    <div className={l.scheduled ? "text-muted" : undefined}>{l.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {events.length > SHOWN_EVENTS ? <p className="m-0 mt-3 text-[13px] text-muted">{events.length - SHOWN_EVENTS} earlier on the case page.</p> : null}
        </div>
      </div>
    </Drawer>
  );
}
