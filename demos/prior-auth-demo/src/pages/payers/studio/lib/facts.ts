import { PROGRAM_LABEL, PROGRAMS } from "@/data/types";
import { REQUEST_TYPE_LABEL, type FactKey, type Operator } from "@/data/workflow/types";

/* What a condition can read, in the words a person uses, and which operators and values make sense for each fact.
   Values that come from a fixed set are offered as a list, so nobody types "Active" and means "active". */

export type FactKind = "choice" | "number" | "date" | "text" | "yesno" | "document";
export interface FactMeta {
  key: FactKey;
  label: string;
  kind: FactKind;
  options?: { value: string; label: string }[];
  unit?: string;
}

const o = (pairs: [string, string][]): { value: string; label: string }[] => pairs.map(([value, label]) => ({ value, label }));

export const FACTS: FactMeta[] = [
  { key: "service", label: "Service", kind: "choice", options: PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] })) },
  { key: "request_type", label: "Request type", kind: "choice", options: Object.entries(REQUEST_TYPE_LABEL).map(([value, label]) => ({ value, label })) },
  { key: "payer", label: "Payer", kind: "text" },
  { key: "product", label: "Plan or product", kind: "text" },
  { key: "state", label: "State", kind: "text" },
  { key: "coverage", label: "Coverage", kind: "choice", options: o([["active", "Active"], ["inactive", "Inactive"], ["unknown", "Unknown"]]) },
  { key: "benefit", label: "Benefit for the service", kind: "choice", options: o([["covered", "Covered"], ["limited", "Limited"], ["not_covered", "Not covered"], ["unknown", "Unknown"]]) },
  { key: "auth_requirement", label: "Authorization requirement", kind: "choice", options: o([["required", "Required"], ["concurrent", "Concurrent review required"], ["not_required", "Not required"], ["unknown", "Unknown"]]) },
  { key: "in_network", label: "Provider in network", kind: "choice", options: o([["yes", "Yes"], ["no", "No"], ["unknown", "Unknown"]]) },
  { key: "has_existing_auth", label: "Has an existing authorization", kind: "yesno" },
  { key: "units_remaining", label: "Units remaining", kind: "number", unit: "units" },
  { key: "days_to_expiry", label: "Days until the authorization expires", kind: "number", unit: "days" },
  { key: "requested_units", label: "Requested units", kind: "number", unit: "units" },
  { key: "requested_start", label: "Requested start date", kind: "date" },
  { key: "days_since_service", label: "Days since the service started", kind: "number", unit: "days" },
  { key: "documents_complete", label: "All required documents are in", kind: "yesno" },
  { key: "payer_response", label: "Payer response", kind: "choice", options: o([["none", "No answer yet"], ["approved", "Approved"], ["partial", "Approved in part"], ["denied", "Denied"], ["more_info", "Asked for more information"]]) },
  { key: "portal_status", label: "Payer portal", kind: "choice", options: o([["up", "Up"], ["down", "Down"]]) },
  { key: "waiting_days", label: "Business days waiting for an answer", kind: "number", unit: "days" },
];

const BY_KEY = new Map<string, FactMeta>(FACTS.map((f) => [f.key, f]));

/** A document fact reads one item of the payer's list: `doc:<id>`. `title` comes from that list when it is known. */
export const isDocFact = (k: string): boolean => k.startsWith("doc:");
export const factMeta = (key: FactKey, docTitle?: (id: string) => string | undefined): FactMeta =>
  BY_KEY.get(key) ?? { key, label: isDocFact(key) ? `Document: ${docTitle?.(key.slice(4)) ?? key.slice(4)}` : key, kind: isDocFact(key) ? "document" : "text" };

/** The operators that mean something for a fact, in the order a person would reach for them. */
export function operatorsFor(meta: FactMeta): Operator[] {
  switch (meta.kind) {
    case "choice":
    case "yesno":
      return ["equals", "not_equals"];
    case "number":
      return ["equals", "not_equals", "gt", "lt"];
    case "date":
      return ["before", "after", "equals"];
    case "document":
      return ["exists", "not_exists"];
    case "text":
      return ["equals", "not_equals", "contains", "exists", "not_exists"];
  }
}

export const needsValue = (op: Operator): boolean => op !== "exists" && op !== "not_exists";
