import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ListPlus } from "lucide-react";
import { Button, TextInput } from "@/components/ui";
import { sectionParam } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { addPersonalTask } from "./actions";
import type { ActionSpec, Context, ContextLine } from "./context";
import { Why } from "./Why";

const DOT: Record<ContextLine["tone"], string> = { risk: "bg-risk", mid: "bg-mid", neutral: "bg-faint" };

/** "What this section needs": the lines for the open section or module, each with where to fix it and why it is asked. */
export function ContextLines({ record, ctx }: { record: IntakeRecord; ctx: Context }) {
  if (!ctx.lines.length) return <p className="px-4 pb-2 text-[13px] text-muted">Nothing is missing here.</p>;
  return (
    <ul className="space-y-2 px-4 pb-1">
      {ctx.lines.map((l) => (
        <li key={l.key} data-context-line={l.key} className="rounded-xl border border-edge bg-tile px-3 py-2.5">
          <div className="flex items-start gap-2">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[l.tone])} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[13px] font-semibold break-words">{l.text}</p>
          </div>
          {l.detail ? <p className="mt-0.5 pl-4 text-[12px] break-words text-ink2">{l.detail}</p> : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-4">
            {l.target ? (
              <Link to={paths.intakeRecord(record.id, sectionParam(l.target))} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">
                {l.toLabel ?? "Open"}
                <ArrowRight size={12} className="ico" />
              </Link>
            ) : null}
          </div>
          <Why className="mt-1 pl-4" explain={l.explain} label={l.text} />
        </li>
      ))}
    </ul>
  );
}

/** The next actions that fit the open section. Each does something visible: it opens Record Intake, starts an agent task, or adds a task. */
export function ContextActions({ record, actions, busy, onRun }: { record: IntakeRecord; actions: ActionSpec[]; busy: Set<string>; onRun: (a: ActionSpec) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    addPersonalTask(record.id, text.trim());
    setText("");
    setAdding(false);
  };
  return (
    <div className="flex flex-col gap-1.5 px-4 pb-1">
      {actions.map((a) => (
        <div key={`${a.id}:${a.module ?? ""}`} data-action={a.id}>
          <div>
            <Button size="sm" className="w-full justify-start" icon={a.id === "task" ? ListPlus : undefined} disabled={!!a.disabled || busy.has(a.id)} loading={busy.has(a.id)} onClick={() => (a.id === "task" ? setAdding((v) => !v) : onRun(a))} title={a.disabled}>
              <span className="truncate">{a.label}</span>
            </Button>
          </div>
          {a.disabled ? <p className="mt-0.5 pl-1 text-[11px] text-muted">{a.disabled}</p> : null}
          <Why className="mt-0.5 pl-1" explain={a.explain} label={a.label} />
        </div>
      ))}
      {adding ? (
        <div className="space-y-1.5 rounded-xl border border-edge p-2.5">
          <TextInput aria-label="Task" placeholder="What needs doing?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={add}>Add the task</Button>
            <Button size="sm" onClick={() => { setAdding(false); setText(""); }}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
