import type { RuleGroup } from "@/data/workflow/types";
import { RULE_GROUP_LABEL } from "@/data/workflow/types";
import type { PayerTabId } from "@/routes";

export const PAYER_TABS: PayerTabId[] = ["builder", "rules", "test", "history"];
export const TAB_LABEL: Record<PayerTabId, string> = { builder: "Workflow Builder", rules: "Rules & Instructions", test: "Test Workflow", history: "History & Changes" };

const GROUPS = Object.keys(RULE_GROUP_LABEL) as RuleGroup[];

/** The view an address asks for. The four ids are the current ones. The earlier ids still work: process opens the builder, documents opens
    Rules & Instructions with the Clinical documentation group open, changes opens History & Changes. Anything else opens the builder. */
export function resolveTab(raw: string | null, group: string | null): { tab: PayerTabId; group: RuleGroup | null } {
  const asked = GROUPS.includes(group as RuleGroup) ? (group as RuleGroup) : null;
  switch (raw) {
    case "builder":
    case "process":
      return { tab: "builder", group: null };
    case "rules":
      return { tab: "rules", group: asked };
    case "documents":
      return { tab: "rules", group: asked ?? "clinical_documentation" };
    case "test":
      return { tab: "test", group: null };
    case "history":
    case "changes":
      return { tab: "history", group: null };
    default:
      return { tab: "builder", group: null };
  }
}
