import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, FilePlus2, ListPlus, MailQuestion, Sparkles } from "lucide-react";
import { AgentBadge, Button, Card, Pill } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { completeness, readiness } from "@/data/intake/checklist";
import { ROLE_AGENT, ROLE_LABEL, type IntakeAgentRole, type IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { AuditFeed } from "../review/AuditFeed";
import { CheckRow } from "../review/ChecklistCard";
import { requestable, runQuick, type QuickKind } from "./actions";
import { NeedsList } from "./NeedsList";
import { needsOf, summaryOf } from "./needs";
import { TaskRow } from "./TaskRow";

const ROLES = Object.keys(ROLE_LABEL) as IntakeAgentRole[];
const H = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1.5">
    <h3 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{children}</h3>
    {right}
  </div>
);

/** The Psyflo AI Assistant: what each agent is doing, what it finished, what it needs from staff, what is blocked or missing, and the next
    actions. Agents suggest; people approve. Every agent action is a task here and an entry in the timeline. */
export function AssistantPanel({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const paused = useStore((s) => s.agentPaused);
  const closeCleared = useStore((s) => s.closeClearedTasks);
  const [showMissing, setShowMissing] = useState(false);
  const [allTasks, setAllTasks] = useState(false);
  const [allEvents, setAllEvents] = useState(false);
  const items = useMemo(() => completeness(record, now), [record, now]);
  const rd = useMemo(() => readiness(record, now), [record, now]);
  const needs = useMemo(() => needsOf(record, rd, now), [record, rd, now]);
  const tasks = [...record.tasks].reverse();
  const events = [...record.audit].reverse();
  const open = items.filter((i) => i.status !== "complete" && i.status !== "na");
  const ask = requestable(items);
  const missingRun = record.tasks.filter((t) => t.kind === "missing" && t.status !== "cancelled" && t.status !== "blocked").at(-1);

  /* A task that waited on a person closes once that person decided where it belongs (suggestions reviewed, pathway selected, handoff approved). */
  useEffect(() => {
    closeCleared(record.id, now);
  }, [record, now, closeCleared]);

  const run = (k: QuickKind) => {
    runQuick(k, record.id, now);
    if (k === "missing") setShowMissing(true);
  };
  const roleState = (role: IntakeAgentRole): { label: string; tone: "good" | "mid" | "risk" | "neutral" } => {
    if (paused[ROLE_AGENT[role]]) return { label: "Paused", tone: "mid" };
    const mine = record.tasks.filter((t) => t.role === role);
    if (mine.some((t) => t.status === "running" || t.status === "queued")) return { label: "Working", tone: "neutral" };
    if (mine.some((t) => t.status === "needs_you")) return { label: "Needs you", tone: "mid" };
    if (mine.some((t) => t.status === "error" && !t.retriedAs)) return { label: "Error", tone: "risk" };
    if (mine.some((t) => t.status === "blocked")) return { label: "Blocked", tone: "risk" };
    return { label: mine.length ? "Done" : "Ready", tone: mine.length ? "good" : "neutral" };
  };

  return (
    <Card data-panel="assistant" className="@container min-[1280px]:max-h-[calc(100vh-6rem)] min-[1280px]:overflow-y-auto">
      <div className="border-b border-line px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-bg text-forest"><Sparkles size={15} className="ico" /></span>
          <h2 className="font-serif text-[18px] leading-tight font-semibold">Psyflo AI Assistant</h2>
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-forest">Agents suggest. People approve. Nothing leaves the clinic without approval.</p>
        <p data-testid="assistant-summary" className="mt-2 text-[13px] text-ink2">{summaryOf(record, items, rd)}</p>
      </div>

      <div className="grid grid-cols-1 @2xl:grid-cols-2 @2xl:divide-x @2xl:divide-line">
        <div className="min-w-0">
          <H right={needs.length ? <Pill tone="mid">{needs.length}</Pill> : null}>Needs you</H>
          <NeedsList record={record} needs={needs} />

          <H>Suggested next actions</H>
          <div className="flex flex-col gap-1.5 px-4 pb-1">
            <Button size="sm" icon={ClipboardList} className="justify-start" onClick={() => run("missing")}>What's missing?</Button>
            {rd.requirement === "authorization" || rd.requirement === "pending" ? (
              <Button size="sm" icon={FilePlus2} className="justify-start" disabled={record.handoff.status !== "not_started"} onClick={() => run("handoff")}>
                {record.handoff.status === "not_started" ? "Prepare the handoff draft" : "Handoff draft prepared"}
              </Button>
            ) : (
              <p className="px-1 text-[12px] text-muted">{rd.requirement === "registration" ? "Registration, not authorization: see Documentation & review." : "No authorization handoff needed for this service."}</p>
            )}
            <Button size="sm" icon={ListPlus} className="justify-start" disabled={!items.some((i) => i.status === "missing")} onClick={() => run("followups")}>Create follow-up tasks</Button>
            <Button size="sm" icon={MailQuestion} className="justify-start" disabled={!ask.length} onClick={() => run("request")}>Ask the referrer for missing items</Button>
          </div>
          {showMissing || missingRun ? (
            <div className="mx-4 mt-2 rounded-xl border border-edge">
              <div className="flex items-center justify-between gap-2 px-3 pt-2">
                <span className="text-[12px] font-semibold">What's missing ({open.length} open)</span>
                <button type="button" className="text-[12px] font-semibold text-forest hover:underline" onClick={() => setShowMissing((v) => !v)}>{showMissing ? "Hide" : "Show"}</button>
              </div>
              {missingRun?.status === "done" && missingRun.result ? <p className="px-3 pt-1 text-[12px] text-ink2">{AGENTS[missingRun.agent].name}: {missingRun.result}</p> : missingRun ? <p className="px-3 pt-1 text-[12px] text-muted">{AGENTS[missingRun.agent].name} is checking…</p> : null}
              {showMissing ? <ul className="mt-1 max-h-[280px] overflow-y-auto [&>li]:px-3">{open.map((i) => <CheckRow key={i.id} recordId={record.id} item={i} />)}</ul> : <div className="h-2" />}
            </div>
          ) : null}

          <H>Agents</H>
          <ul className="px-4 pb-2">
            {ROLES.map((role) => {
              const s = roleState(role);
              const agent = ROLE_AGENT[role];
              return (
                <li key={role} data-role={role} className="flex items-center gap-2 py-1">
                  <AgentBadge agent={agent} size={22} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-medium">{ROLE_LABEL[role]}</span>
                    <span className="block text-[11px] text-muted">{AGENTS[agent].name}</span>
                  </span>
                  {s.label === "Paused" ? <Link to={paths.settings()} className="shrink-0" aria-label={`${ROLE_LABEL[role]} is paused in Settings`}><Pill tone="mid">Paused</Pill></Link> : <Pill tone={s.tone} className="shrink-0">{s.label}</Pill>}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 border-t border-line @2xl:border-t-0">
          <H right={<span className="text-[12px] text-muted">{tasks.length}</span>}>Activity</H>
          {tasks.length ? (
            <ul className={cn("border-t border-line")}>{(allTasks ? tasks : tasks.slice(0, 5)).map((t) => <TaskRow key={t.id} record={record} task={t} />)}</ul>
          ) : (
            <p className="px-4 pb-2 text-[13px] text-muted">No agent has worked on this intake yet. Try "What's missing?".</p>
          )}
          {tasks.length > 5 ? <button type="button" className="px-4 py-2 text-[12px] font-semibold text-forest hover:underline" onClick={() => setAllTasks((v) => !v)}>{allTasks ? "Show fewer" : `Show all ${tasks.length}`}</button> : null}

          <H right={<span className="text-[12px] text-muted">{events.length}</span>}>Timeline</H>
          <div className="border-t border-line">
            <AuditFeed events={allEvents ? events : events.slice(0, 6)} label="Intake timeline" />
          </div>
          {events.length > 6 ? <button type="button" className="px-4 py-2 text-[12px] font-semibold text-forest hover:underline" onClick={() => setAllEvents((v) => !v)}>{allEvents ? "Show fewer" : `Show all ${events.length}`}</button> : null}
        </div>
      </div>
    </Card>
  );
}
