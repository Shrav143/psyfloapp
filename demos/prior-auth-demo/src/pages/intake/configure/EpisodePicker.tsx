import { History } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import type { EpisodeRef } from "@/data/intake/types";
import { carrySentence, type CarryInfo, type EpisodeOption } from "./people";
import { OptionCard, OptionGroup } from "./OptionCard";

/** The treatment episode a continuing intake belongs to. The earlier signed assessments are carried forward as a new version; choosing "no episode" carries nothing. */
export function EpisodePicker({ options, none, carry, value, onPick, onInitial }: {
  options: EpisodeOption[];
  none: EpisodeOption;
  carry: CarryInfo;
  value: EpisodeRef | null;
  onPick: (e: EpisodeRef) => void;
  onInitial: () => void;
}) {
  const choices = [...options, none];
  return (
    <section aria-labelledby="episode-title" className="mt-6 rounded-2xl border border-edge bg-tile px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="episode-title" className="flex items-center gap-2 font-serif text-[16px] font-semibold">
            <History size={16} className="ico text-forest" aria-hidden="true" />
            Which treatment episode is this for?
          </h3>
          <p className="mt-1 text-[13px] text-muted">{carrySentence(carry)}</p>
        </div>
        {options.length === 0 ? <Button size="sm" onClick={onInitial}>Choose initial assessment instead</Button> : null}
      </div>
      {options.length === 0 ? <p className="mt-3 text-[13px] text-ink2">No treatment episode was found for this person.</p> : null}
      <OptionGroup label="Treatment episode" className="mt-3 grid gap-3">
        {choices.map((o) => (
          <OptionCard key={o.ref.key} selected={value?.key === o.ref.key} onSelect={() => onPick(o.ref)} title={o.title} badge={o.tags.map((t) => <Pill key={t.text} tone={t.tone}>{t.text}</Pill>)}>
            {o.detail}
          </OptionCard>
        ))}
      </OptionGroup>
    </section>
  );
}
