import { useId, useMemo, useState } from "react";
import { ChevronDown, Flag, FileText, GitBranch, Plug, Scale, Search, Send, ShieldCheck, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, SUPPORT_LABEL, type NodeCategory, type NodeDef, type NodeKind } from "@/data/workflow/types";
import { DND_KIND } from "./WorkflowCanvas";
import { NODE_DEFS } from "./lib/engine";
import { iconFor } from "./lib/icons";
import { categoryClass, SUPPORT_WORD } from "./WfNodeView";

/* The left palette: search, collapsible categories, and items that can be dragged onto the canvas or added with a click or Enter. */

const ORDER: NodeCategory[] = ["flow", "trigger", "verification", "documents", "condition", "rule", "action", "agent", "integration"];
const GROUP_ICON: Record<NodeCategory, LucideIcon> = { flow: Flag, trigger: Zap, verification: ShieldCheck, documents: FileText, condition: GitBranch, rule: Scale, action: Send, agent: Sparkles, integration: Plug };

export interface NodeLibraryProps {
  onAdd: (kind: NodeKind) => void;
  /** A workflow has one Start, so Start is offered only when there is none. */
  hasStart: boolean;
  className?: string;
}

export function NodeLibrary({ onAdd, hasStart, className }: NodeLibraryProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ flow: true, trigger: true, verification: true });
  const id = useId();
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const defs = NODE_DEFS.filter((d) => !(d.kind === "start" && hasStart));
    return ORDER.map((cat) => ({
      cat,
      items: defs.filter((d) => d.category === cat && (!query || `${d.title} ${d.purpose} ${CATEGORY_LABEL[cat]}`.toLowerCase().includes(query))),
    })).filter((g) => g.items.length);
  }, [query, hasStart]);

  return (
    <div className={cn("flex min-h-0 flex-col rounded-[20px] border border-edge bg-white", className)}>
      <div className="border-b border-line px-4 pt-4 pb-3">
        <h3 className="font-serif text-[18px] leading-tight font-semibold">Steps</h3>
        <p className="mt-0.5 text-[12px] text-muted">Drag a step onto the canvas, or select it and press Enter.</p>
        <div className="relative mt-3">
          <Search size={15} className="ico pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search steps" aria-label="Search steps" className="h-9 w-full rounded-xl border border-field bg-white pr-3 pl-9 text-[13px] placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-forest/15 focus:outline-none" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2" role="list" aria-label="Available steps">
        {groups.length === 0 ? <p className="px-3 py-6 text-center text-[13px] text-muted">No step matches “{q}”.</p> : null}
        {groups.map(({ cat, items }) => {
          const Icon = GROUP_ICON[cat];
          const isOpen = query ? true : !!open[cat];
          const panel = `${id}-${cat}`;
          return (
            <section key={cat} role="listitem" className="mb-0.5">
              <h4 className="m-0">
                <button type="button" aria-expanded={isOpen} aria-controls={panel} onClick={() => setOpen((o) => ({ ...o, [cat]: !isOpen }))} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-tile">
                  <Icon size={15} className="ico text-sage" aria-hidden="true" />
                  <span className="flex-1 text-[13px] font-semibold text-ink2">{CATEGORY_LABEL[cat]}</span>
                  <span className="text-[11px] text-muted">{items.length}</span>
                  <ChevronDown size={15} className={cn("ico text-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
              </h4>
              <ul id={panel} hidden={!isOpen} className="m-0 flex list-none flex-col gap-0.5 p-0 pb-1.5">
                {isOpen ? items.map((d) => <Item key={d.kind} def={d} onAdd={onAdd} />) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Item({ def, onAdd }: { def: NodeDef; onAdd: (k: NodeKind) => void }) {
  const Icon = iconFor(def.icon);
  const flagged = def.support !== "live";
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DND_KIND, def.kind);
          e.dataTransfer.setData("text/plain", def.title);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => onAdd(def.kind)}
        aria-label={`Add ${def.title}. ${def.purpose}${flagged ? ` ${SUPPORT_WORD[def.support]}.` : ""}`}
        title={def.purpose}
        className="flex w-full cursor-grab items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-tile active:cursor-grabbing"
      >
        <span className={cn("mt-px grid h-7 w-7 shrink-0 place-items-center rounded-[9px]", categoryClass(def.category))}>
          <Icon size={15} className="ico" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-[1.3] font-medium text-ink">{def.title}</span>
          {flagged ? (
            <span title={SUPPORT_LABEL[def.support]} className={cn("mt-0.5 inline-block rounded-full px-1.5 py-px text-[11px] font-semibold", def.support === "simulated" ? "bg-mid-bg text-mid-ink" : "bg-neutral-bg text-neutral-ink")}>
              {SUPPORT_WORD[def.support]}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
