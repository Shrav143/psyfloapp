import type { PayerRule, RuleGroup } from "@/data/workflow/types";

/* The structured part of a rule, group by group: which values the editor offers and how they read. The engine reads the same keys.
   A rule can carry other keys too (a sample the library was seeded with); the editor and the row list those after these, so nothing a rule holds is hidden. */

export type FieldKind = "toggle" | "number" | "text" | "textarea" | "select";
export interface RuleField {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  unit?: string;
  options?: { value: string; label: string }[];
}

const DAY_TYPE = { key: "dayType", label: "Counted in", kind: "select", options: [{ value: "business", label: "Business days" }, { value: "calendar", label: "Calendar days" }] } satisfies RuleField;
const CHANNEL = [{ value: "portal", label: "Portal" }, { value: "phone", label: "Phone" }, { value: "fax", label: "Fax" }];

export const RULE_FIELDS: Record<RuleGroup, RuleField[]> = {
  auth_requirements: [
    { key: "required", label: "Authorization required", kind: "toggle", help: "Off means the service needs no authorization from this payer." },
    { key: "exceptions", label: "Exceptions", kind: "textarea", help: "Services or situations that do not need authorization. One per line." },
  ],
  submission_windows: [
    { key: "required", label: "A window applies", kind: "toggle" },
    { key: "windowDays", label: "Window", kind: "number", unit: "days" },
    DAY_TYPE,
    { key: "counted_from", label: "Counted from", kind: "text", help: "For example: admission, or the start of service." },
  ],
  backdating: [
    { key: "allowed", label: "Backdating allowed", kind: "toggle" },
    { key: "maxDaysBack", label: "Furthest back", kind: "number", unit: "days" },
    DAY_TYPE,
    { key: "historicalDates", label: "Historical-date rule", kind: "textarea", help: "What the payer says about service dates that are already past." },
    { key: "retroWindowDays", label: "Retro request window", kind: "number", unit: "days", help: "How long after admission a retro request is accepted." },
    { key: "proof", label: "Proof needed", kind: "text" },
  ],
  clinical_documentation: [
    { key: "prerequisites", label: "Documentation prerequisites", kind: "textarea", help: "What must be in the chart before the request goes out. One per line." },
    { key: "datedWithinDays", label: "Dated within", kind: "number", unit: "days" },
  ],
  concurrent_reauth: [
    { key: "units", label: "Service units per request", kind: "number", unit: "units", help: "The most one request may ask for. The unit is set below." },
    { key: "unit", label: "Unit", kind: "select", options: [{ value: "days", label: "Days" }, { value: "units", label: "Units" }] },
    { key: "maxDurationDays", label: "Longest duration", kind: "number", unit: "days" },
    { key: "cadenceDays", label: "Review cadence", kind: "number", unit: "days" },
    { key: "firstReviewDays", label: "First review after", kind: "number", unit: "days" },
    { key: "fileBeforeDays", label: "File before the limit", kind: "number", unit: "days" },
    DAY_TYPE,
  ],
  submission_methods: [
    { key: "portal", label: "Portal", kind: "text" },
    { key: "phone", label: "Phone", kind: "text" },
    { key: "fax", label: "Fax", kind: "text" },
    { key: "preferred", label: "Preferred channel", kind: "select", options: CHANNEL },
    { key: "fallback", label: "Fallback channel", kind: "select", options: CHANNEL },
    { key: "escalation", label: "Escalation path", kind: "text", help: "Who to call or write to when the usual channel fails." },
  ],
  appeals_p2p: [
    { key: "p2pWindowDays", label: "Peer-to-peer window", kind: "number", unit: "days" },
    { key: "appealWindowDays", label: "Written appeal window", kind: "number", unit: "days" },
    { key: "expeditedAppealHours", label: "Expedited appeal decided in", kind: "number", unit: "hours" },
    DAY_TYPE,
    { key: "escalation", label: "Escalation path", kind: "text", help: "What comes after the appeal." },
  ],
  agent_instructions: [],
};

/** Keys a rule holds for the engine and the payer's saved lists, not for a person to read: the agent a script belongs to, and a count of documents. */
const HIDDEN_KEYS = new Set(["agent", "count"]);

/** The fields the editor can show for a rule: the group's own, then any other key the rule holds. */
export function fieldsFor(group: RuleGroup, values: PayerRule["values"]): RuleField[] {
  const known = RULE_FIELDS[group];
  const extra = Object.keys(values).filter((k) => !HIDDEN_KEYS.has(k) && !known.some((f) => f.key === k)).map((k): RuleField => ({ key: k, label: humanKey(k), kind: typeof values[k] === "boolean" ? "toggle" : typeof values[k] === "number" ? "number" : "text" }));
  return [...known, ...extra];
}

/** "windowDays" and "counted_from" as "Window days" and "Counted from". */
export function humanKey(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
