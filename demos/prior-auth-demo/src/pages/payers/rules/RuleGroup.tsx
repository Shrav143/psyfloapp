import { useEffect, useRef, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button, Disclosure } from "@/components/ui";
import type { PayerRule, RuleGroup as Group } from "@/data/workflow/types";
import { RULE_GROUP_LABEL } from "@/data/workflow/types";
import { RuleRow } from "./RuleRow";

export interface RuleActions {
  usedBy: (ruleId: string) => number;
  onEdit: (r: PayerRule) => void;
  onVerify: (r: PayerRule) => void;
  onArchive: (r: PayerRule) => void;
  onAdd: (g: Group) => void;
}

/** "3 rules, 3 unverified": how many are in force and how many of those nobody has verified. Archived rules are not counted. */
export function groupSummary(rules: PayerRule[], noun: string): string {
  const live = rules.filter((r) => r.verification !== "superseded");
  if (!live.length) return `No ${noun}s yet.`;
  const bad = live.filter((r) => r.verification === "unverified").length;
  const review = live.filter((r) => r.verification === "needs_review").length;
  const tail = [bad ? `${bad} unverified` : "", review ? `${review} need review` : "", !bad && !review ? "all verified" : ""].filter(Boolean).join(", ");
  return `${live.length} ${noun}${live.length === 1 ? "" : "s"}, ${tail}.`;
}

/** One Rules & Instructions group: a closed section with a one-line summary and a count; open it shows the rule rows, then whatever the group adds (document lists, the Caller script)
    and an Add a rule button. `open` opens it on arrival and scrolls to it (a link to the Clinical documentation group does this). */
export function RuleGroupSection({ group, summary, count, rules, actions, open, before, after, canAdd = true }: { group: Group; summary: ReactNode; count: number; rules: PayerRule[]; actions: RuleActions; open: boolean; before?: ReactNode; after?: ReactNode; canAdd?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [open]);
  const label = RULE_GROUP_LABEL[group];
  const live = rules.filter((r) => r.verification !== "superseded");
  const gone = rules.filter((r) => r.verification === "superseded");
  return (
    <div ref={ref} id={`group-${group}`} className="scroll-mt-4">
      <Disclosure title={label} summary={summary} defaultOpen={open} right={<span className="text-xs text-muted" aria-label={`${count} in ${label}`}>{count}</span>}>
        {before}
        {live.map((r) => <RuleRow key={r.id} rule={r} usedBy={actions.usedBy(r.id)} onEdit={() => actions.onEdit(r)} onVerify={() => actions.onVerify(r)} onArchive={() => actions.onArchive(r)} />)}
        {!live.length && !before ? <p className="px-6 py-5 text-sm text-muted">No rules here yet. Add one, and it starts Unverified.</p> : null}
        {gone.map((r) => <RuleRow key={r.id} rule={r} usedBy={actions.usedBy(r.id)} onEdit={() => actions.onEdit(r)} onVerify={() => actions.onVerify(r)} onArchive={() => actions.onArchive(r)} />)}
        {after}
        {canAdd ? (
          <div className="border-t border-line px-6 py-3">
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => actions.onAdd(group)} aria-label={`Add a rule to ${label}`}>Add a rule</Button>
          </div>
        ) : null}
      </Disclosure>
    </div>
  );
}
