import { useState } from "react";
import { CheckCircle2, Circle, Phone, ShieldAlert } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Dropdown, TextArea, TextInput } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { VA_PLANS } from "@/data/va/plans";
import { useStore } from "@/store";
import type { FieldSectionKey } from "@/store/intake";
import { isMissingValue } from "../queue/metrics";

interface Item {
  section: FieldSectionKey;
  key: string;
  label: string;
  kind: "text" | "long" | "plan" | "last4";
}
const ITEMS: Item[] = [
  { section: "referral", key: "referringClinician", label: "Who is calling, and their relationship", kind: "text" },
  { section: "referral", key: "referrerContact", label: "Call-back number", kind: "text" },
  { section: "referral", key: "reason", label: "Reason for the call", kind: "long" },
  { section: "referral", key: "concerns", label: "Presenting concerns", kind: "long" },
  { section: "referral", key: "symptoms", label: "Current symptoms", kind: "long" },
  { section: "coverage", key: "plan", label: "Medicaid plan", kind: "plan" },
  { section: "coverage", key: "medicaidId", label: "Medicaid ID, last 4 digits", kind: "last4" },
  { section: "referral", key: "preferences", label: "Preferences (times, language, interpreter)", kind: "text" },
];

const valueOn = (r: IntakeRecord, it: Item) => (it.section === "assessment" ? r.assessment.fields[it.key] : r[it.section][it.key]);

/** Staff-assisted phone intake: the questions to ask on the call. Each answer is saved as patient reported, with the call as its source. */
export function PhoneChecklist({ record }: { record: IntakeRecord }) {
  const setField = useStore((s) => s.setIntakeField);
  const patch = useStore((s) => s.patchIntake);
  const toast = useStore((s) => s.toast);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const done = ITEMS.filter((it) => !isMissingValue(valueOn(record, it))).length;
  const filled = ITEMS.filter((it) => (draft[it.key] ?? "").trim());

  const save = (its: Item[]) => {
    for (const it of its) {
      const raw = draft[it.key].trim();
      const value = it.kind === "last4" ? `•••• ${raw.replace(/\D/g, "").slice(-4)}` : raw;
      setField(record.id, it.section, it.key, value, "patient_reported", { kind: "patient", ref: "Staff-assisted phone intake" });
      /* The queue shows the plan the caller named until eligibility confirms it. */
      const plan = it.key === "plan" ? VA_PLANS.find((p) => p.name === value) : undefined;
      if (plan) patch(record.id, (r) => ({ ...r, payerId: plan.payerId }));
    }
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !its.some((i) => i.key === k))));
    toast({ title: `Saved ${its.length} answer${its.length === 1 ? "" : "s"} as patient reported`, tone: "good" });
  };

  return (
    <Card data-phone-checklist>
      <CardHeader title={<span className="inline-flex items-center gap-2"><Phone size={18} className="ico" />Call checklist</span>} subtitle={`${done} of ${ITEMS.length} asked · answers are saved as patient reported`} right={filled.length ? <Button size="sm" variant="primary" onClick={() => save(filled)}>Save {filled.length} answer{filled.length === 1 ? "" : "s"}</Button> : null} />
      <CardBody className="flex flex-col gap-3">
        <p className="flex items-start gap-2 rounded-xl bg-risk-bg px-3 py-2 text-[13px] text-risk-ink">
          <ShieldAlert size={16} className="ico mt-0.5 shrink-0" />
          Ask about safety on every call. If the caller describes danger now, stop the checklist, flag a safety concern and use the escalation steps.
        </p>
        <ol className="flex flex-col gap-2.5">
          {ITEMS.map((it) => {
            const fv = valueOn(record, it);
            const has = !isMissingValue(fv);
            const v = draft[it.key] ?? "";
            const set = (x: string) => setDraft((d) => ({ ...d, [it.key]: x }));
            return (
              <li key={it.key} data-check={it.key} className="flex items-start gap-2.5">
                {has ? <CheckCircle2 size={18} className="ico mt-2 text-good" aria-label="Asked" /> : <Circle size={18} className="ico mt-2 text-faint" aria-label="Not asked yet" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink2">{it.label}</div>
                  {has && !v ? <p className="text-[13px] text-muted">{fv?.value}</p> : null}
                  <div className="mt-1">
                    {it.kind === "long" ? (
                      <TextArea aria-label={it.label} value={v} onChange={(e) => set(e.target.value)} rows={2} className="min-h-[60px]" placeholder={has ? "Replace the answer" : "In the caller's words"} />
                    ) : it.kind === "plan" ? (
                      <Dropdown<string> variant="field" ariaLabel={it.label} value={v} placeholder={has ? "Change the plan" : "Choose the plan the caller names"} onChange={set} options={[...VA_PLANS.map((p) => ({ value: p.name, label: p.name }))]} menuWidth={340} />
                    ) : (
                      <TextInput aria-label={it.label} value={v} onChange={(e) => set(e.target.value)} inputMode={it.kind === "last4" ? "numeric" : undefined} maxLength={it.kind === "last4" ? 4 : undefined} placeholder={has ? "Replace the answer" : ""} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
