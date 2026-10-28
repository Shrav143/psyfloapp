import { Card, CardBody, ChoiceCard, Label, Pill, Chip } from "@/components/ui";
import { authorizationsOf, episodesOf, payerNameOf, windowText, AUTH_STATUS_LABEL, AUTH_STATUS_TONE } from "@/data/patients";
import { useStore } from "@/store";
import { AuthorizationCard } from "../AuthorizationCard";
import { authType } from "../authType";
import type { CaseEnv } from "../caseEnv";

/** The treatment episode and authorization this request belongs to. A continued stay, a reauthorization or a modification reuses the episode that exists (it never makes a second one); an initial or retroactive request starts a new stay. */
export function EpisodeSection({ env }: { env: CaseEnv }) {
  const draft = env.draft;
  const choose = useStore((s) => s.chooseCasePatient);
  const patient = env.patient;
  const def = authType(draft.kind);
  if (!patient) return null;
  const episodes = episodesOf(env.book, patient.id);
  const episode = episodes.find((e) => e.id === draft.episodeId);
  const auths = episode ? authorizationsOf(env.book, episode.id) : [];
  const auth = env.authorization;

  if (!def.existing) {
    return (
      <p className="px-1 text-[13px] text-muted" data-testid="episode-note">
        {episode ? `Treatment episode ${episode.id}: ${episode.levelLabel}. ` : ""}{draft.kind === "retro" ? "A retroactive request is made for care that already happened." : "A new stay starts its own treatment episode when the request is sent."}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4" data-testid="episode-section">
      {episodes.length > 1 ? (
        <div role="radiogroup" aria-label="Treatment episode" className="flex flex-col gap-2.5">
          <Label>Which treatment episode?</Label>
          {episodes.map((e) => (
            <ChoiceCard key={e.id} selected={e.id === draft.episodeId} onClick={() => choose(draft.id, { patientId: patient.id, episodeId: e.id })} title={`${e.levelLabel} · ${e.label}`}>
              {payerNameOf(e.payerId)} · {authorizationsOf(env.book, e.id).map((a) => `${AUTH_STATUS_LABEL[a.status]}${windowText(a) ? `, ${windowText(a)}` : ""}`).join("; ")}
            </ChoiceCard>
          ))}
        </div>
      ) : null}
      {episode && auths.length > 1 ? (
        <div role="radiogroup" aria-label="Authorization" className="flex flex-col gap-2.5">
          <Label>Which authorization?</Label>
          {auths.map((a) => (
            <ChoiceCard key={a.id} selected={a.id === draft.authorizationId} onClick={() => choose(draft.id, { patientId: patient.id, episodeId: episode.id, authorizationId: a.id })} title={`${a.label} · ${a.id}`} right={<Pill tone={AUTH_STATUS_TONE[a.status]}>{AUTH_STATUS_LABEL[a.status]}</Pill>}>
              {windowText(a) ?? "Not approved yet"}
            </ChoiceCard>
          ))}
        </div>
      ) : null}
      {episode && auth ? (
        <>
          <Card className="px-5 py-3"><div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="text-muted">Reusing the treatment episode</span><Chip>{episode.id}</Chip><span className="text-muted">No new episode is made.</span></div></Card>
          <AuthorizationCard patient={patient} episode={episode} auth={auth} />
        </>
      ) : !episode ? (
        <Card><CardBody><p className="text-[14px] text-ink2">This request reviews an episode that exists. {episodes.length ? "Choose it above." : "This patient has no treatment episode on file: change the authorization type to an initial authorization, or link the episode in the intake's Care planning."}</p></CardBody></Card>
      ) : (
        <p className="px-1 text-[13px] text-muted">This patient has no authorization on file.</p>
      )}
    </div>
  );
}
