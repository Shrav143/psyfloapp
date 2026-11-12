import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";
import { GROUP_LABEL, SERVICE_GROUPS, serviceById, servicesIn, type ProgramFocus } from "@/data/va/services";
import { useStore } from "@/store";

/** The program the demo is personalized to. Intake narrows its queue and defaults New Intake to it; the transition view, payer rules and the
    worklist follow where they have records for it. Every Virginia service can be chosen; "All programs" shows everything. */
export function ProgramSwitcher() {
  const focus = useStore((s) => s.programFocus);
  const setFocus = useStore((s) => s.setProgramFocus);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const pick = (f: ProgramFocus) => {
    setFocus(f);
    setOpen(false);
  };
  const label = focus === "all" ? "All programs" : serviceById(focus).short;
  const item = (f: ProgramFocus, text: string, sub?: string) => (
    <button key={f} type="button" role="menuitemradio" aria-checked={focus === f} onClick={() => pick(f)} className="flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-tile">
      <span className="mt-0.5 w-4 shrink-0">{focus === f ? <Check size={15} className="ico text-forest" /> : null}</span>
      <span className="min-w-0">
        <span className={cn("block", focus === f && "font-semibold text-forest")}>{text}</span>
        {sub ? <span className="block text-[12px] text-muted">{sub}</span> : null}
      </span>
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Program: ${label}. Change program`} className={cn("flex h-9 max-w-[220px] items-center gap-2 rounded-xl border bg-white px-3 text-[13px] font-medium whitespace-nowrap text-ink2 hover:bg-tile", focus === "all" ? "border-field" : "border-forest")}>
        <Layers size={15} className="ico" />
        <span className="max-xl:sr-only text-muted">Program</span>
        <span className={cn("truncate", focus !== "all" && "text-forest")}>{label}</span>
        <ChevronDown size={14} className="ico shrink-0" />
      </button>
      {open ? (
        <div role="menu" aria-label="Program" className="psy-fade-up absolute top-11 left-0 z-40 max-h-[calc(100vh-76px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-2xl border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
          {item("all", "All programs", "Every service in every list")}
          {SERVICE_GROUPS.map((g) => (
            <div key={g} role="group" aria-label={GROUP_LABEL[g]}>
              <div className="px-3 pt-2.5 pb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{GROUP_LABEL[g]}</div>
              {servicesIn(g).map((s) => item(s.id, s.label, s.code ? `${s.code}` : undefined))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
