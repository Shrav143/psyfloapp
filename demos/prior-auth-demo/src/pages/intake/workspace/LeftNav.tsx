import { Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { WorkspaceTarget } from "@/data/assess/nav";
import { cn } from "@/lib/cn";
import { PreparationTag, StateMark } from "./bits";
import { navIdOf, workspaceHref, type NavItem } from "./nav";

/** The workspace's navigation: the sections of an intake, with the assessment instruments of this person's plan under Assessment instruments. Each item
    shows where it stands (a shape and a word). Below 1024 px it becomes a menu. */
export function LeftNav({ recordId, items, target, compact }: { recordId: string; items: NavItem[]; target: WorkspaceTarget; compact: boolean }) {
  const nav = useNavigate();
  const current = navIdOf(target);
  if (compact) return <NavSelect recordId={recordId} items={items} current={current} onPick={(i) => nav(workspaceHref(recordId, i.target))} />;
  return (
    <nav aria-label="Intake sections" className="min-h-0 overflow-y-auto pr-1">
      <ul className="flex flex-col gap-0.5">
        {items.map((i) => {
          const on = i.id === current || (i.id === "instrument" && target.section === "instrument" && !target.module);
          return (
            <li key={i.id}>
              <Link
                to={workspaceHref(recordId, i.target)}
                aria-current={on ? "page" : undefined}
                data-nav={i.id}
                className={cn("flex items-start gap-2 rounded-xl py-1.5 pr-2.5 text-left", i.child ? "ml-3 pl-2.5" : "pl-3", on ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13px] leading-snug", i.child ? "font-normal" : "font-medium")}>{i.label}</span>
                  {i.detail ? (
                    <span className={cn("flex flex-wrap items-center gap-x-1.5 text-[11px] leading-snug", on ? "text-white/85" : "text-muted")}>
                      <span>{i.detail}</span>
                      {i.child && i.state ? <span>· {i.stateLabel}</span> : null}
                      {i.preparation ? <PreparationTag onDark={on} /> : null}
                    </span>
                  ) : null}
                </span>
                {i.state ? <span className="mt-0.5"><StateMark state={i.state} label={i.stateLabel} onDark={on} /></span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The same list as a native menu, for narrow windows. The instruments are their own group. */
function NavSelect({ recordId, items, current, onPick }: { recordId: string; items: NavItem[]; current: string; onPick: (i: NavItem) => void }) {
  const groups: { head?: NavItem; rows: NavItem[] }[] = [];
  for (const i of items) {
    if (i.child) groups[groups.length - 1].rows.push(i);
    else groups.push({ rows: [i], ...(i.id === "instrument" ? { head: i } : {}) });
  }
  const opt = (i: NavItem) => <option key={i.id} value={i.id}>{i.id === "instrument" ? "All assessment instruments" : i.label}{i.state ? ` (${i.stateLabel.toLowerCase()})` : ""}</option>;
  return (
    <div>
      <label htmlFor={`ws-nav-${recordId}`} className="sr-only">Go to a section of this intake</label>
      <select
        id={`ws-nav-${recordId}`}
        value={current}
        onChange={(e) => {
          const hit = items.find((i) => i.id === e.target.value);
          if (hit) onPick(hit);
        }}
        className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
      >
        {groups.map((g, n) =>
          g.head ? (
            <optgroup key={n} label="Assessment instruments">{g.rows.map(opt)}</optgroup>
          ) : (
            <Fragment key={n}>{g.rows.map(opt)}</Fragment>
          ),
        )}
      </select>
    </div>
  );
}
