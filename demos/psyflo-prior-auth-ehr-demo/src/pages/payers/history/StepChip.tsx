import { FileUp, GitBranch, Globe, ListChecks, Phone, type LucideIcon } from "lucide-react";
import { STEP_KIND_LABEL, type StepKind } from "@/data/payerConfig";
import { cn } from "@/lib/cn";

const ICON: Record<StepKind, LucideIcon> = { check: ListChecks, file: FileUp, portal: Globe, phone: Phone };

/** Step-type chip: Checklist, File, Portal or Phone step. */
export function StepChip({ kind, className }: { kind: StepKind; className?: string }) {
  const Icon = ICON[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-bg py-0.5 pr-2.5 pl-2 text-xs font-semibold text-neutral-ink", className)}>
      <Icon size={13} className="ico" />
      {STEP_KIND_LABEL[kind]}
    </span>
  );
}

export function ConditionChip() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-tile-edge bg-tile py-0.5 pr-2.5 pl-2 text-xs font-semibold text-neutral-ink">
      <GitBranch size={13} className="ico" />
      Condition
    </span>
  );
}
