import { Banner } from "@/components/ui";
import { planNotices } from "@/data/assess/plan";
import { POPULATIONS, SETTINGS, POPULATION_LABEL, SETTING_LABEL, type CareSetting, type PlanContext, type Population } from "@/data/assess/types";
import { programById } from "@/data/assess/programs";
import { ageMismatch } from "./model";
import { OptionCard, OptionGroup } from "./OptionCard";

/** Step 3: population and setting, preselected from the program and the person's age. A mismatch is said in a sentence and never blocks. */
export function StepPopulation({ ctx, who, age, onPopulation, onSetting }: { ctx: PlanContext; who: string; age: number | null; onPopulation: (p: Population) => void; onSetting: (s: CareSetting) => void }) {
  const program = programById(ctx.programId);
  const notices = planNotices(ctx).filter((n) => n.kind === "population" || n.kind === "setting");
  const age1 = ageMismatch(age, ctx.population, who);
  const only = program.populations.length === 1;
  return (
    <div>
      <h2 className="font-serif text-[18px] font-semibold">Population and setting</h2>
      <p className="mt-1 text-[13px] text-muted">Preselected from {program.label}{age !== null ? ` and the person's age (${age})` : ""}. Change them if they do not fit.</p>
      {age1 || notices.length ? (
        <div className="mt-4 flex flex-col gap-2.5">
          {age1 ? <Banner tone="mid" title="Population and age differ">{age1}</Banner> : null}
          {notices.map((n) => <Banner key={n.text} tone="mid">{n.text}</Banner>)}
        </div>
      ) : null}
      <h3 className="mt-5 font-serif text-[16px] font-semibold">Patient population</h3>
      <OptionGroup label="Patient population" className="mt-2.5 grid grid-cols-1 gap-3 @min-[640px]:grid-cols-3">
        {POPULATIONS.map((p) => (
          <OptionCard key={p} selected={p === ctx.population} onSelect={() => onPopulation(p)} title={POPULATION_LABEL[p]}>
            {program.populations.includes(p) ? (only ? "Set by the program" : "Usual for this program") : null}
          </OptionCard>
        ))}
      </OptionGroup>
      <h3 className="mt-6 font-serif text-[16px] font-semibold">Care setting</h3>
      <OptionGroup label="Care setting" className="mt-2.5 grid grid-cols-2 gap-3 @min-[640px]:grid-cols-4">
        {SETTINGS.map((s) => (
          <OptionCard key={s} selected={s === ctx.setting} onSelect={() => onSetting(s)} title={SETTING_LABEL[s]}>
            {program.settings.includes(s) ? (s === program.defaultSetting ? "Program default" : "Usual for this program") : null}
          </OptionCard>
        ))}
      </OptionGroup>
    </div>
  );
}
