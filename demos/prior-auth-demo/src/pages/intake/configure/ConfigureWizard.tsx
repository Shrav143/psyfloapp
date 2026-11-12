import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { Button, Stepper } from "@/components/ui";
import { purposeById } from "@/data/assess/purposes";
import { hasInstrumentWork } from "@/data/assess/carry";
import type { ModuleId, PurposeId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { isoOf } from "@/data/patients";
import { selectPatientBookInView as selectBook } from "@/store/patients";
import { clockTime, toDate } from "@/lib/time";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { planForChoice } from "@/store/intakePlan";
import { useIntakeNow } from "../lib/policyNow";
import { dateWords, requestedFor, sameState, STEPS, stepIndex, toDraft, withProgram, type Start, type WizardState, type WizardStep } from "./model";
import { defaultEpisode, episodeOptions, personOfRecord } from "./people";
import { StepPlan } from "./StepPlan";
import { StepPopulation } from "./StepPopulation";
import { StepProgram } from "./StepProgram";
import { StepPurpose } from "./StepPurpose";

/** The four steps of the configuration wizard, with their state, the stepper and the sticky footer (Back, Save draft, Continue or Start). The page and the
    dialog both draw this; they differ in where it sits and what happens when it is done. Nothing is stored until Save draft or the last step. */
export function ConfigureWizard({ record, start, step, onStep, variant, onDone, onCancel }: {
  record: IntakeRecord;
  start: Start;
  step: WizardStep;
  onStep: (s: WizardStep) => void;
  variant: "page" | "dialog";
  /** Called once the intake is configured. */
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<WizardState>(start.state);
  const [saved, setSaved] = useState<{ state: WizardState; at: number } | null>(start.from === "draft" ? { state: start.state, at: start.savedAt ?? 0 } : null);
  const now = useIntakeNow();
  const preview = useStore((s) => s.policyPreview);
  const me = useStore((s) => meOf(s));
  const book = useStore(selectBook);
  const allIntakes = useStore((s) => s.intakes);
  const scope = useScope();
  const configure = useStore((s) => s.configureIntake);
  const saveDraft = useStore((s) => s.saveConfigDraft);
  const toast = useStore((s) => s.toast);

  /* Only the records the viewer may see take part: another site's records of the same person are not offered. */
  const intakes = useMemo(() => allIntakes.filter((r) => scope.sites.includes(r.site)), [allIntakes, scope.sites]);
  const person = useMemo(() => personOfRecord(record), [record]);
  const episodes = useMemo(() => episodeOptions(person, book, intakes, record.id), [person, book, intakes, record.id]);
  const needsEpisode = purposeById(state.purposeId).needsEpisode;
  const episode = needsEpisode ? state.episode ?? defaultEpisode(episodes) : null;
  const effective: WizardState = { ...state, episode };
  const plan = useMemo(() => planForChoice(record, effective, now), [record.payerId, effective.purposeId, effective.programId, effective.population, effective.setting, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const withData = useMemo(() => Object.keys(record.instruments ?? {}).filter((id) => hasInstrumentWork(record, id as ModuleId)) as ModuleId[], [record]);
  const who = record.initials || "This person";
  const idx = stepIndex(step);
  const last = idx === STEPS.length - 1;
  const blocked = step === "purpose" && needsEpisode && !episode;
  const isSaved = !!saved && sameState(effective, saved.state);
  const changed = !sameState(effective, start.state);
  const configured = !!record.config;

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }));
  const setPurpose = (id: PurposeId) => patch({ purposeId: id, episode: purposeById(id).needsEpisode ? state.episode : null });
  const chooseProgram = (to: WizardState["programId"]) => setState((s) => withProgram(s, to, record.age));

  const save = () => {
    saveDraft(record.id, toDraft(effective, step));
    setSaved({ state: effective, at: useStore.getState().clock });
    toast({ title: "Draft saved", body: "Nothing is active yet. Resume from this intake any time.", tone: "good" });
  };
  const finish = () => {
    configure(record.id, { purposeId: effective.purposeId, programId: effective.programId, population: effective.population, setting: effective.setting, choices: effective.choices, episode });
    toast({ title: configured ? "Configuration changed" : "Intake configured", body: `${purposeById(effective.purposeId).label} · ${plan.modules.length} modules in the plan. Modules with saved data are kept.`, tone: "good" });
    onDone();
  };

  return (
    <div className="@container">
      <Stepper steps={STEPS.map((s) => s.label)} current={idx} onGo={(i) => onStep(STEPS[i].id)} className="flex-wrap gap-y-2 text-[14px]" />
      <div className="mt-6">
        {step === "purpose" ? <StepPurpose purposeId={state.purposeId} onPurpose={setPurpose} episodes={episodes} episode={episode} onEpisode={(e) => patch({ episode: e })} /> : null}
        {step === "program" ? <StepProgram programId={state.programId} onProgram={chooseProgram} now={now} requestedId={requestedFor(record)} /> : null}
        {step === "population" ? <StepPopulation ctx={plan.context} who={who} age={record.age} onPopulation={(p) => patch({ population: p, populationTouched: true })} onSetting={(s) => patch({ setting: s, settingTouched: true })} /> : null}
        {step === "plan" ? (
          <StepPlan
            plan={plan} ctx={plan.context} payerId={record.payerId} choices={state.choices} onChoices={(c) => patch({ choices: c })} me={me}
            dateLabel={`${dateWords(isoOf(now))}, ${preview === "redesign" ? "post-transition demo environment" : "today"}`} withData={withData} history={record.config?.history ?? []}
          />
        ) : null}
      </div>
      <footer className={cn("sticky bottom-0 z-10 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-edge bg-white py-4", "-mx-6 -mb-5 px-6", variant === "page" && "rounded-b-[20px]")}>
        <div className="flex items-center gap-3">
          {idx > 0 ? <Button icon={ArrowLeft} onClick={() => onStep(STEPS[idx - 1].id)}>Back</Button> : <Button onClick={onCancel}>Cancel</Button>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-[13px] text-muted" aria-live="polite">
            {blocked ? "Choose a treatment episode to continue." : isSaved && saved ? `Draft saved ${clockTime(toDate(saved.at))}` : changed ? "Not saved yet" : ""}
          </span>
          <Button icon={Save} onClick={save}>Save draft</Button>
          {last ? (
            <Button variant="primary" icon={Check} onClick={finish}>{configured ? "Apply changes" : "Start assessment"}</Button>
          ) : (
            <Button variant="primary" trailing={ArrowRight} disabled={blocked} onClick={() => onStep(STEPS[idx + 1].id)}>Continue</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
