import { useState } from "react";
import { Button, Checkbox, Disclosure, Drawer, Dropdown, Field, Switch, TextArea, TextInput } from "@/components/ui";
import { PROGRAM_LABEL, PROGRAMS } from "@/data/types";
import { useStore } from "@/store";
import { REQUEST_TYPE_LABEL, RULE_GROUP_LABEL, type PayerRule, type RequestType, type RuleGroup } from "@/data/workflow/types";
import { Labeled } from "../Labeled";
import { ReasonModal } from "../ReasonModal";
import { fieldsFor, type RuleField } from "./fields";
import { applyDraft, draftOf, ruleChanges, type RuleDraft } from "./ruleEdit";
import { readDate } from "./ruleText";

const REQUEST_TYPES = Object.keys(REQUEST_TYPE_LABEL) as RequestType[];
const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function ValueField({ f, value, onChange }: { f: RuleField; value: string | number | boolean | undefined; onChange: (v: string | number | boolean) => void }) {
  const hint = f.help;
  if (f.kind === "toggle") return <div><Switch checked={value === true} onChange={onChange} label={f.label} />{hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}</div>;
  if (f.kind === "select") return <Labeled label={f.label} hint={hint}><Dropdown variant="field" ariaLabel={f.label} value={String(value ?? "")} options={f.options ?? []} onChange={onChange} placeholder="Not set" /></Labeled>;
  if (f.kind === "number") return <Field label={f.unit ? `${f.label} (${f.unit})` : f.label} hint={hint}><TextInput type="number" min={0} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} /></Field>;
  if (f.kind === "textarea") return <Field label={f.label} hint={hint}><TextArea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="min-h-[76px]" /></Field>;
  return <Field label={f.label} hint={hint}><TextInput value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></Field>;
}

/** A right-hand panel for one rule: title, the group's structured values, free text, who and what it applies to, and its dates. Save asks for a reason (and says the version it becomes).
    Provenance is not edited here: a rule you add starts Unverified, and only Mark as verified changes that. Mounted only while open. */
export function RuleDrawer({ rule, group, onClose, onSave }: { rule: PayerRule; group: RuleGroup; onClose: () => void; onSave: (next: PayerRule, reason: string, changes: ReturnType<typeof ruleChanges>) => void }) {
  const isNew = rule.version === 0;
  const fixed = rule.origin === "payer_config";
  const [draft, setDraft] = useState<RuleDraft>(() => draftOf(rule));
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const set = (p: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...p }));
  const setValue = (key: string, v: string | number | boolean) => setDraft((d) => ({ ...d, values: { ...d.values, [key]: v } }));
  const changes = isNew ? [{ what: `Added ${draft.title || "a rule"}`, before: "", after: draft.title }] : ruleChanges(rule, draft);
  const all = fieldsFor(group, draft.values);
  // A rule shows the values it holds; the rest of the group's values are one click away, so a payer's rule is not buried under fields that do not apply to it.
  const held = isNew ? all : all.filter((f) => f.key in rule.values);
  const rest = isNew ? [] : all.filter((f) => !(f.key in rule.values));

  const trySave = () => {
    if (!draft.title.trim()) return setMissing(true);
    if (!changes.length) {
      useStore.getState().toast({ title: "Nothing changed", body: "Change a value or the text first.", tone: "neutral" });
      return onClose();
    }
    setSaving(true);
  };
  return (
    <>
      <Drawer open onClose={onClose} width={560} title={isNew ? "Add a rule" : "Edit rule"} subtitle={`${RULE_GROUP_LABEL[group]}${isNew ? ". It starts Unverified." : `. Version ${rule.version} now, ${rule.version + 1} when you save.`}`}
        footer={<div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{isNew ? "Not saved yet" : changes.length ? `${changes.length} ${changes.length === 1 ? "change" : "changes"} not saved yet` : "No changes yet"}</span><div className="flex gap-2.5"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={trySave}>{isNew ? "Add rule" : "Save rule"}</Button></div></div>}>
        <div className="flex flex-col gap-5">
          <Field label="Title" required error={missing ? "Add a title." : undefined} hint={fixed ? "This rule is read from the payer's saved rules, so its title stays." : undefined}><TextInput value={draft.title} disabled={fixed} onChange={(e) => { set({ title: e.target.value }); setMissing(false); }} placeholder="For example: Notice of admission" /></Field>
          <Field label="What it says"><TextArea value={draft.description} disabled={fixed} onChange={(e) => set({ description: e.target.value })} className="min-h-[64px]" placeholder="One or two plain sentences." /></Field>
          {held.length || rest.length ? (
            <section aria-label="Structured values" className="flex flex-col gap-3.5 rounded-2xl border border-edge bg-white p-4">
              <h3 className="font-serif text-[17px] font-semibold">Structured values</h3>
              {held.map((f) => <ValueField key={f.key} f={f} value={draft.values[f.key]} onChange={(v) => setValue(f.key, v)} />)}
              {rest.length ? (
                <Disclosure variant="plain" title={<span className="text-[14px]">Other values for this group</span>} summary={rest.map((f) => f.label).join(", ")}>
                  <div className="flex flex-col gap-3.5 px-1 py-4">{rest.map((f) => <ValueField key={f.key} f={f} value={draft.values[f.key]} onChange={(v) => setValue(f.key, v)} />)}</div>
                </Disclosure>
              ) : null}
            </section>
          ) : null}
          <Field label="Instructions" hint="Optional free text for people and agents. It adds to the structured values and never replaces them."><TextArea value={draft.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value })} className="min-h-[96px]" /></Field>
          <Disclosure variant="card" title="Applies to and dates" summary={`${draft.services.length ? draft.services.map((p) => PROGRAM_LABEL[p]).join(", ") : "Every service"} · ${draft.requestTypes.length ? `${draft.requestTypes.length} request ${draft.requestTypes.length === 1 ? "type" : "types"}` : "Every request type"} · from ${readDate(draft.effectiveFrom)}`}>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink2">Services (none ticked means every service)</div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">{PROGRAMS.map((p) => <Checkbox key={p} checked={draft.services.includes(p)} onChange={() => set({ services: toggle(draft.services, p) })} label={PROGRAM_LABEL[p]} />)}</div>
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink2">Request types (none ticked means every type)</div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">{REQUEST_TYPES.map((t) => <Checkbox key={t} checked={draft.requestTypes.includes(t)} onChange={() => set({ requestTypes: toggle(draft.requestTypes, t) })} label={REQUEST_TYPE_LABEL[t]} />)}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                <Field label="Effective from"><TextInput type="date" value={draft.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></Field>
                <Field label="Effective until" hint="Empty means no end date."><TextInput type="date" value={draft.effectiveTo ?? ""} onChange={(e) => set({ effectiveTo: e.target.value })} /></Field>
                <Field label="Product" hint="Empty means every product."><TextInput value={draft.product ?? ""} onChange={(e) => set({ product: e.target.value })} /></Field>
                <Field label="Provider type" hint="Empty means every provider."><TextInput value={draft.providerType ?? ""} onChange={(e) => set({ providerType: e.target.value })} /></Field>
              </div>
            </div>
          </Disclosure>
        </div>
      </Drawer>
      {saving ? (
        <ReasonModal
          title={isNew ? "Add this rule?" : "Save the rule?"}
          subtitle={isNew ? "It is added Unverified. Workflows send it to manual review until a person marks it verified with a source." : `This becomes version ${rule.version + 1}.${rule.verification === "verified" ? " A verified rule goes back to Needs review, because it no longer matches its source." : ""} Workflows that use it read the new version; History & Changes lists what it touches.`}
          onClose={() => setSaving(false)}
          onSave={(reason) => onSave(applyDraft(rule, draft), reason, changes)}
        >
          <ul className="max-h-[200px] list-disc overflow-auto rounded-xl bg-tile py-3 pr-4 pl-8 text-[13px] text-ink2">
            {changes.map((c) => <li key={c.what + c.after}>{c.what}</li>)}
          </ul>
        </ReasonModal>
      ) : null}
    </>
  );
}
