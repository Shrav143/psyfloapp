import { useState } from "react";
import { Button, ChoiceCard, Chip } from "@/components/ui";
import { authorizationsOf, episodesOf, payerNameOf, AUTH_STATUS_LABEL } from "@/data/patients";
import type { IntakeRecord } from "@/data/intake/types";
import { PatientSearch } from "@/pages/newcase/PatientSearch";
import { useStore } from "@/store";
import { selectPatientBookInView } from "@/store/patients";

/** A continued stay, a reauthorization or a change of level of care reviews a treatment episode that already exists. This links the intake to it, so the request reuses it and no second episode is made. */
export function EpisodeLink({ record }: { record: IntakeRecord }) {
  const book = useStore(selectPatientBookInView);
  const [patientId, setPatientId] = useState<string | null>(record.patientId ?? null);
  const [changing, setChanging] = useState(false);
  const linked = record.episodeId ? book.episodes.find((e) => e.id === record.episodeId) : undefined;
  const episodes = patientId ? episodesOf(book, patientId) : [];
  const link = (episodeId: string, pid: string) => {
    useStore.getState().linkIntakeEpisode(record.id, pid, episodeId);
    setChanging(false);
  };

  if (linked && !changing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px]" data-testid="episode-linked">
        <span className="text-muted">Treatment episode:</span>
        <Chip>{linked.id}</Chip>
        <span>{linked.levelLabel} · {linked.label}</span>
        <Button size="sm" variant="ghost" onClick={() => setChanging(true)}>Change</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5 rounded-xl border border-line bg-tile/50 px-4 py-3" data-testid="episode-picker">
      <p className="text-[13px] font-semibold text-ink">Link the treatment episode</p>
      {!patientId ? (
        <PatientSearch book={book} label="Find the patient" onPick={(p) => setPatientId(p.id)} />
      ) : (
        <div role="radiogroup" aria-label="Treatment episode" className="flex flex-col gap-2">
          {episodes.length ? episodes.map((e) => (
            <ChoiceCard key={e.id} selected={false} onClick={() => link(e.id, patientId)} title={`${e.levelLabel} · ${e.label}`}>
              {payerNameOf(e.payerId)} · {authorizationsOf(book, e.id).map((a) => AUTH_STATUS_LABEL[a.status]).join("; ") || "No authorization"}
            </ChoiceCard>
          )) : <p className="text-[13px] text-muted">This patient has no treatment episode on file.</p>}
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setPatientId(null)}>Choose a different patient</Button>
        </div>
      )}
    </div>
  );
}
