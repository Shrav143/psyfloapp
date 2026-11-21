import { useState } from "react";
import { Plus } from "lucide-react";
import { Banner, Button, Chip, Disclosure } from "@/components/ui";
import { planNotices } from "@/data/assess/plan";
import { LEVEL_LABEL, type AssessmentPlan, type ConfigChange, type ModuleId, type PlanContext } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import type { DraftChoice } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { AddModuleDialog } from "./AddModuleDialog";
import { groupRows, rowsOf, type Row } from "./model";
import { OverrideDialog } from "./OverrideDialog";
import { PlanHeader } from "./PlanHeader";
import { PlanRow } from "./PlanRow";

/** One person's choice recorded or taken back. A choice that only repeats the plan's default is dropped, so the draft holds real changes. */
function withChoice(choices: DraftChoice[], row: Row, next: Omit<DraftChoice, "id">): DraftChoice[] {
  const rest = choices.filter((c) => c.id !== row.id);
  const planDefault = row.level === "optional" ? "off" : "active";
  if (next.by !== "override" && (row.added ? next.state === "off" : next.state === planDefault)) return rest;
  return [...rest, { id: row.id, ...next }];
}

/** Step 4: the assessment plan, as it would be saved. Required, recommended and optional modules, each with its sources and status. Nothing is stored until the footer says so. */
export function StepPlan({ plan, ctx, payerId, choices, onChoices, me, dateLabel, withData, history }: {
  plan: AssessmentPlan;
  ctx: PlanContext;
  payerId: string | null;
  choices: DraftChoice[];
  onChoices: (c: DraftChoice[]) => void;
  me: string;
  dateLabel: string;
  /** Modules with saved work from earlier configurations: restored with their data. */
  withData: ModuleId[];
  /** What changed in this intake's configuration so far, oldest first. */
  history: ConfigChange[];
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const rows = rowsOf(plan, choices);
  const groups = groupRows(rows);
  const inUse = rows.filter((r) => r.state === "active").length;
  const notices = planNotices(ctx);
  const loud = notices.filter((n) => n.kind === "availability" || n.kind === "population" || n.kind === "setting");
  const payerNote = notices.find((n) => n.kind === "payer");
  const quiet = notices.filter((n) => !loud.includes(n) && n !== payerNote);
  const now = () => useStore.getState().clock;

  const toggle = (row: Row, on: boolean) => onChoices(withChoice(choices, row, { state: on ? "active" : "off", by: "clinician", who: me, at: now() }));
  const restoreRequired = (row: Row) => onChoices(choices.filter((c) => c.id !== row.id));
  const add = (id: ModuleId) => onChoices([...choices.filter((c) => c.id !== id), { id, state: "active", by: "clinician", who: me, at: now() }]);

  return (
    <div>
      <h2 className="font-serif text-[18px] font-semibold">Review the assessment plan</h2>
      <div className="mt-4 flex flex-col gap-3">
        <PlanHeader plan={plan} payerName={payerId ? vaPlanOf(payerId)?.name ?? null : null} dateLabel={dateLabel} />
        {loud.map((n) => <Banner key={n.text} tone="mid" title={n.kind === "availability" ? "Program availability" : n.kind === "population" ? "Population" : "Setting"}>{n.text}</Banner>)}
        {payerNote ? <Banner title="Payer">{payerNote.text}</Banner> : null}
        {quiet.length ? (
          <Disclosure title="Notes on this plan" summary="Dates, program and rule notes" right={<Chip>{quiet.length}</Chip>} variant="card">
            <ul className="flex flex-col gap-2 px-6 py-4 text-[13px] text-ink2">{quiet.map((n) => <li key={n.text}>{n.text}</li>)}</ul>
          </Disclosure>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-ink2" aria-live="polite">{inUse} of {rows.length} modules in use</p>
        <Button icon={Plus} onClick={() => setAdding(true)}>Add module</Button>
      </div>
      {groups.map((g) => (
        <section key={g.level} className="mt-5" aria-label={LEVEL_LABEL[g.level]}>
          <h3 className="font-serif text-[16px] font-semibold">
            {LEVEL_LABEL[g.level]} <span className="ml-1 text-[13px] font-normal text-muted">{g.rows.length}</span>
          </h3>
          {g.rows.length ? (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {g.rows.map((r) => (
                <PlanRow key={r.id} row={r} onToggle={(on) => toggle(r, on)} onRemove={() => setRemoving(r)} onRestore={() => restoreRequired(r)} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted">None for this configuration.</p>
          )}
        </section>
      ))}
      {history.length ? (
        <Disclosure className="mt-8" title="Configuration history" summary="Every change to this intake's configuration, newest first" right={<Chip>{history.length}</Chip>}>
          <ul className="flex flex-col divide-y divide-line px-6 py-1 text-[13px]">
            {[...history].reverse().map((h, i) => (
              <li key={`${h.at}-${i}`} className="py-2.5">
                <div className="font-medium">{h.what}</div>
                {h.detail ? <div className="text-muted">{h.detail}</div> : null}
                <div className="text-xs text-muted">{staffOf(h.who)?.name ?? h.who} · {stamp(h.at)}</div>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      <AddModuleDialog open={adding} onClose={() => setAdding(false)} listed={rows.map((r) => r.id)} population={ctx.population} withData={withData} onAdd={add} />
      <OverrideDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        moduleLabel={removing?.label ?? ""}
        me={me}
        onConfirm={(reason) => {
          if (removing) onChoices(withChoice(choices, removing, { state: "off", by: "override", who: me, at: now(), reason }));
          setRemoving(null);
        }}
      />
    </div>
  );
}
