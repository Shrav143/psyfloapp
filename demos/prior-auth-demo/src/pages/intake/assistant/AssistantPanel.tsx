import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { AgentBadge, Card, Pill } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import { sectionParam, type WorkspaceTarget } from "@/data/assess/nav";
import type { ModuleId } from "@/data/assess/types";
import { AGENTS } from "@/data/agents";
import { completeness, isOpen, readiness } from "@/data/intake/checklist";
import { ROLE_AGENT, ROLE_LABEL, type IntakeAgentRole, type IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useFindEvidence } from "../instruments/useFindEvidence";
import { useIntakeNow } from "../lib/policyNow";
import { usePlan } from "../lib/usePlan";
import { AuditFeed } from "../review/AuditFeed";
import { CheckRow } from "../review/ChecklistCard";
import { runCansEvidence, runFeed, runQuick, type QuickKind } from "./actions";
import { Chat } from "./Chat";
import { ContextActions, ContextLines } from "./ContextCard";
import { contextOf, type ActionSpec } from "./context";
import { NeedsList } from "./NeedsList";
import { needsOf, summaryOf } from "./needs";
import { TaskRow } from "./TaskRow";

const ROLES = Object.keys(ROLE_LABEL) as IntakeAgentRole[];
const OVERVIEW: WorkspaceTarget = { section: "overview" };
const H = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1.5">
    <h3 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{children}</h3>
    {right}
  </div>
);

/** The one contextual PsyFlo AI Assistant. What it shows follows the section (and the module) that is open: what that section needs, the next actions that fit it, the agent
    work in progress, a chat that answers only from the record and the policy rows, and an explanation behind every suggestion. Agents suggest; people approve. */
export function AssistantPanel({ record, target = OVERVIEW }: { record: IntakeRecord; target?: WorkspaceTarget }) {
  const now = useIntakeNow();
  const plan = usePlan(record);
  const paused = useStore((s) => s.agentPaused);
  const closeCleared = useStore((s) => s.closeClearedTasks);
  const [, setParams] = useSearchParams();
  const [showMissing, setShowMissing] = useState(false);
  const [allTasks, setAllTasks] = useState(false);
  const [allEvents, setAllEvents] = useState(false);
  const moduleId: ModuleId = target.module ?? "patient-referral";
  const moduleLabel = plan?.modules.find((m) => m.id === moduleId)?.label ?? moduleById(moduleId).label;
  const evidence = useFindEvidence(record, moduleId, moduleLabel);
  const items = useMemo(() => completeness(record, now), [record, now]);
  const rd = useMemo(() => readiness(record, now), [record, now]);
  const needs = useMemo(() => needsOf(record, rd, now), [record, rd, now]);
  const ctx = useMemo(() => contextOf(record, plan, target, now), [record, plan, target, now]);
  const tasks = [...record.tasks].reverse();
  const events = [...record.audit].reverse();
  const open = items.filter((i) => isOpen(i.status));
  const missingRun = record.tasks.filter((t) => t.kind === "missing" && t.status !== "cancelled" && t.status !== "blocked").at(-1);
  const busy = new Set<string>([
    ...(evidence.running ? ["find-evidence"] : []),
    ...record.tasks.filter((t) => t.status === "queued" || t.status === "running").flatMap((t) => (t.kind ? [t.kind] : [])),
  ]);

  /* A task that waited on a person closes once that person decided where it belongs (suggestions reviewed, pathway selected, handoff approved). */
  useEffect(() => {
    closeCleared(record.id, now);
  }, [record, now, closeCleared]);

  const run = (a: ActionSpec) => {
    switch (a.id) {
      case "record-intake":
        setParams((p) => { const n = new URLSearchParams(p); n.set("panel", "scribe"); return n; });
        return;
      case "feed": runFeed(record.id); return;
      case "find-evidence": evidence.run(); return;
      case "cans-evidence": runCansEvidence(record.id); return;
      case "task": return;
      default:
        runQuick(a.id as QuickKind, record.id, now);
        if (a.id === "missing") setShowMissing(true);
    }
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
    <Card data-panel="assistant" data-target={sectionParam(target)} className="min-[1280px]:max-h-[calc(100vh-6rem)] min-[1280px]:overflow-y-auto">
      <div className="border-b border-line px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-bg text-forest"><Sparkles size={15} className="ico" /></span>
          <h2 className="font-serif text-[18px] leading-tight font-semibold">Psyflo AI Assistant</h2>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-forest">
          <Pill tone="neutral">AI suggested · simulated</Pill>
          Agents suggest. People approve.
        </p>
        <p data-testid="assistant-summary" className="mt-2 text-[13px] text-ink2">{summaryOf(record, items, rd)}</p>
      </div>

      <H right={ctx.lines.length ? <Pill tone="mid">{ctx.lines.length}</Pill> : null}>On this screen</H>
      <h3 data-testid="assistant-context-title" className="px-4 pb-1.5 text-[14px] font-semibold">{ctx.title}</h3>
      <ContextLines record={record} ctx={ctx} />

      <H>Suggested next actions</H>
      <ContextActions record={record} actions={ctx.actions} busy={busy} onRun={run} />
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

      <H>Ask</H>
      <Chat ctx={{ record, plan, target, lines: ctx.lines, title: ctx.title }} recordId={record.id} />

      <H right={needs.length ? <Pill tone="mid">{needs.length}</Pill> : null}>Needs you</H>
      <NeedsList record={record} needs={needs} />

      <H right={<span className="text-[12px] text-muted">{tasks.length}</span>}>Agent tasks</H>
      {tasks.length ? (
        <ul className="border-t border-line">{(allTasks ? tasks : tasks.slice(0, 4)).map((t) => <TaskRow key={t.id} record={record} task={t} />)}</ul>
      ) : (
        <p className="px-4 pb-2 text-[13px] text-muted">No agent has worked on this intake yet. Try "What's missing?".</p>
      )}
      {tasks.length > 4 ? <button type="button" className="px-4 py-2 text-[12px] font-semibold text-forest hover:underline" onClick={() => setAllTasks((v) => !v)}>{allTasks ? "Show fewer" : `Show all ${tasks.length}`}</button> : null}

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

      <H right={<span className="text-[12px] text-muted">{events.length}</span>}>Timeline</H>
      <div className={cn("border-t border-line")}>
        <AuditFeed events={allEvents ? events : events.slice(0, 5)} label="Intake timeline" />
      </div>
      {events.length > 5 ? <button type="button" className="px-4 py-2 text-[12px] font-semibold text-forest hover:underline" onClick={() => setAllEvents((v) => !v)}>{allEvents ? "Show fewer" : `Show all ${events.length}`}</button> : null}
    </Card>
  );
}
