import { useMemo, type ReactNode } from "react";
import { PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Drawer, HistoryFeed, KeyValue, Pill } from "@/components/ui";
import { detailForQueueItem } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, rangeOf } from "@/data/caseModel";
import { STATUS_LABEL, type QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import { band as chanceBand } from "@/lib/format";
import { paths } from "@/routes";
import { viewerById } from "@/data/viewers";
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
  const you = viewerById(useStore((s) => s.viewerId)).name;
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
        <section aria-label="Next action" className="rounded-xl border border-forest/20 bg-[#F3F7F4] px-4 py-2.5">
          <div className="text-[14px] font-semibold leading-snug"><span className="text-forest">Next:</span> {next.text}</div>
        </section>
        <KeyValue className="grid-cols-[130px_1fr] text-[13px]" items={rows} />
        <div>
          <h3 className="mb-2 font-serif text-[18px] font-semibold">History</h3>
          <div className="rounded-xl border border-edge bg-white">
            <HistoryFeed items={recent} you={you} label="Latest history" />
          </div>
          {events.length > SHOWN_EVENTS ? <p className="m-0 mt-2 text-[13px] text-muted">{events.length - SHOWN_EVENTS} more on the case page</p> : null}
        </div>
      </div>
    </Drawer>
  );
}
