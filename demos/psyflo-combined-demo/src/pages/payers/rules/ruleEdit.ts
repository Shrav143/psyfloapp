import type { LogChange } from "@/data/payerConfig";
import { PROGRAM_LABEL } from "@/data/types";
import { REQUEST_TYPE_LABEL, type PayerRule } from "@/data/workflow/types";
import { fieldsFor } from "./fields";
import { readDate, readValue } from "./ruleText";

/** What the drawer edits: the parts of a rule a person changes by hand. Provenance (source, verification, owner, version, history) is not here: only Mark as verified touches it. */
export type RuleDraft = Pick<PayerRule, "title" | "description" | "values" | "instructions" | "services" | "requestTypes" | "effectiveFrom" | "effectiveTo" | "product" | "providerType">;

export const draftOf = (r: PayerRule): RuleDraft => ({ title: r.title, description: r.description, values: { ...r.values }, instructions: r.instructions ?? "", services: [...r.services], requestTypes: [...r.requestTypes], effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo ?? "", product: r.product ?? "", providerType: r.providerType ?? "" });

const list = (xs: string[]): string => (xs.length ? xs.join(", ") : "Every one");

/** One line per change, for the edit audit: what, the old reading, the new reading. */
export function ruleChanges(before: PayerRule, after: RuleDraft): LogChange[] {
  const out: LogChange[] = [];
  const add = (what: string, b: string, a: string) => b !== a && out.push({ what: `${before.title}: ${what}`, before: b, after: a });
  add("title", before.title, after.title);
  add("description", before.description, after.description);
  for (const f of fieldsFor(before.group, { ...before.values, ...after.values })) add(f.label, readValue(f, before.values[f.key]), readValue(f, after.values[f.key]));
  add("instructions", before.instructions ?? "", after.instructions ?? "");
  add("services", list(before.services.map((p) => PROGRAM_LABEL[p])), list(after.services.map((p) => PROGRAM_LABEL[p])));
  add("request types", list(before.requestTypes.map((t) => REQUEST_TYPE_LABEL[t])), list(after.requestTypes.map((t) => REQUEST_TYPE_LABEL[t])));
  add("effective from", readDate(before.effectiveFrom), readDate(after.effectiveFrom));
  add("effective to", readDate(before.effectiveTo), readDate(after.effectiveTo || undefined));
  add("product", before.product ?? "", after.product ?? "");
  add("provider type", before.providerType ?? "", after.providerType ?? "");
  return out;
}

/** The rule with the draft applied. A blank optional value is left off, so a rule never holds an empty string where it meant nothing. */
export function applyDraft(rule: PayerRule, d: RuleDraft): PayerRule {
  const values: PayerRule["values"] = {};
  for (const [k, v] of Object.entries(d.values)) if (v !== "" && v !== undefined) values[k] = v;
  const { effectiveTo, instructions, product, providerType, ...rest } = d;
  return { ...rule, ...rest, values, instructions: instructions?.trim() || undefined, effectiveTo: effectiveTo || undefined, product: product || undefined, providerType: providerType || undefined };
}
