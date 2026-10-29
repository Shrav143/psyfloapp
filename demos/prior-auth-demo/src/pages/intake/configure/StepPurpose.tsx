import { PURPOSES } from "@/data/assess/purposes";
import type { PurposeId } from "@/data/assess/types";
import type { EpisodeRef } from "@/data/intake/types";
import { EpisodePicker } from "./EpisodePicker";
import { OptionCard, OptionGroup } from "./OptionCard";
import type { CarryInfo, EpisodeOption } from "./people";

/** Step 1: the purpose. A purpose that continues an episode asks which one, below the cards. */
export function StepPurpose({ purposeId, onPurpose, episodes, episode, onEpisode }: {
  purposeId: PurposeId | null;
  onPurpose: (id: PurposeId) => void;
  episodes: { options: EpisodeOption[]; none: EpisodeOption; carry: CarryInfo };
  episode: EpisodeRef | null;
  onEpisode: (e: EpisodeRef) => void;
}) {
  const current = PURPOSES.find((p) => p.id === purposeId);
  return (
    <div>
      <h2 className="font-serif text-[18px] font-semibold">What type of intake are you completing?</h2>
      <OptionGroup label="Intake purpose" className="mt-4 grid grid-cols-1 gap-3 @min-[640px]:grid-cols-2">
        {PURPOSES.map((p) => (
          <OptionCard key={p.id} selected={p.id === purposeId} onSelect={() => onPurpose(p.id)} title={p.label}>
            {p.description}
          </OptionCard>
        ))}
      </OptionGroup>
      {current?.needsEpisode ? <EpisodePicker options={episodes.options} none={episodes.none} carry={episodes.carry} value={episode} onPick={onEpisode} onInitial={() => onPurpose("initial")} /> : null}
    </div>
  );
}
