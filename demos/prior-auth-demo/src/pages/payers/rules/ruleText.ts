import type { PayerRule, RuleGroup, Verification } from "@/data/workflow/types";
import { fieldsFor, type RuleField } from "./fields";

/** A value as a person reads it: Yes and No, a number with its unit, a choice by its label. */
export function readValue(field: RuleField, value: string | number | boolean | undefined): string {
  if (value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.kind === "select") return field.options?.find((o) => o.value === value)?.label ?? String(value);
  if (field.kind === "number") return `${value}${field.unit ? ` ${value === 1 ? field.unit.replace(/s$/, "") : field.unit}` : ""}`;
  return String(value);
}

/** The structured values of a rule as label and reading, in the order of the group's fields. The window and its day type read together: "2 business days".
    How far back backdating reaches is left out when backdating is not allowed. */
export function readValues(rule: Pick<PayerRule, "group" | "values">): { key: string; label: string; text: string }[] {
  const out: { key: string; label: string; text: string }[] = [];
  const fields = fieldsFor(rule.group, rule.values);
  const dayType = rule.values.dayType;
  for (const f of fields) {
    if (f.key === "unit") continue;
    if (f.key === "dayType" && fields.some((x) => x.kind === "number" && x.unit === "days" && x.key in rule.values)) continue;
    if (f.key === "maxDaysBack" && rule.values.allowed === false) continue;
    const v = rule.values[f.key];
    if (v === undefined || v === "") continue;
    let text = readValue(f, v);
    if (f.key === "units" && typeof rule.values.unit === "string") text = `${v} ${rule.values.unit}`;
    if (f.kind === "number" && f.unit === "days" && dayType !== undefined) text = `${v} ${dayType === "calendar" ? "calendar" : "business"} ${v === 1 ? "day" : "days"}`;
    out.push({ key: f.key, label: f.label, text });
  }
  return out;
}

const oneLine = (t: string, max = 150): string => {
  const flat = t.split("\n").map((l) => l.trim()).filter(Boolean).join("; ");
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

/** One line for a closed row: the first three readings on one line each, or the start of the free text when the rule has no structured values. */
export function valuesLine(rule: Pick<PayerRule, "group" | "values" | "instructions">): string {
  const v = readValues(rule);
  if (v.length) return oneLine(v.slice(0, 3).map((x) => `${x.label}: ${x.text}`).join(" · "));
  return rule.instructions?.trim() ? oneLine(rule.instructions) : "No structured values yet";
}

export const VERIFICATION_TONE: Record<Verification, "good" | "mid" | "neutral"> = { verified: "good", needs_review: "mid", unverified: "neutral", superseded: "neutral" };

/** A date as the rules show it ("Oct 20, 2026"); an empty one as "none". ISO input only. */
export function readDate(iso: string | undefined): string {
  if (!iso) return "none";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const GROUP_NOUN: Record<RuleGroup, string> = {
  auth_requirements: "requirement",
  submission_windows: "window",
  backdating: "rule",
  clinical_documentation: "rule",
  concurrent_reauth: "rule",
  submission_methods: "rule",
  appeals_p2p: "rule",
  agent_instructions: "instruction",
};
