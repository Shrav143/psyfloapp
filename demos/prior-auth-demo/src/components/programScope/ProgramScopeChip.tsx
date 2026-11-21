import { Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProgramScopeState } from "./useProgramScope";

/** The Program menu's preset on a page: a removable chip while it narrows the page, a quiet way back once removed, or one line when the page has no data for the service. */
export function ProgramScopeChip({ state, className }: { state: ProgramScopeState; className?: string }) {
  const { active, note, removed, scope, remove, restore } = state;
  if (note) {
    return (
      <p className={cn("m-0 flex items-center gap-1.5 text-[13px] text-muted", className)} data-testid="program-scope-note">
        <Info size={14} className="ico shrink-0" aria-hidden="true" />
        {note}
      </p>
    );
  }
  if (active) {
    return (
      <span className={cn("inline-flex items-center gap-2 self-start rounded-full border border-forest bg-[#EEF7F6] py-1 pr-1.5 pl-3.5 text-[13px] font-semibold text-forest", className)} data-testid="program-scope-chip">
        Program: {active.short}
        <button type="button" aria-label={`Remove the ${active.short} program filter`} onClick={remove} className="grid h-5 w-5 place-items-center rounded-full hover:bg-forest/10">
          <X size={13} className="ico" />
        </button>
      </span>
    );
  }
  if (removed && scope) {
    return (
      <button type="button" onClick={restore} className={cn("self-start text-[13px] font-semibold text-forest hover:underline", className)} data-testid="program-scope-restore">
        Show only {scope.short}
      </button>
    );
  }
  return null;
}
