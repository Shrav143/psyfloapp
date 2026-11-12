import { useNavigate } from "react-router-dom";
import { ClipboardCheck, FilePlus2 } from "lucide-react";
import { Button, Card, CardHeader, Meter, Pill } from "@/components/ui";
import type { ClockKind } from "@/data/manager";
import type { IntakeRecord } from "@/data/intake/types";
import type { BuiltInPayerId } from "@/data/types";
import { AUTH_STATUS_LABEL, AUTH_STATUS_TONE, authorizationsOf, leftText, payerNameOf, windowText } from "@/data/patients";
import { DAY, longDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectPatientBook } from "@/store/patients";

/* Ongoing care and utilization management, for an intake whose treatment episode has an authorization: what is used against what was authorized, what is due
   next and the two ways to keep care going (a reassessment, a continued-stay authorization). The counts and dates are the demo episode's own (data/patients.ts);
   Psyflo adds no limit and no payer rule, so the reassessment interval says it is not verified. */

const NEXT_LABEL: Record<ClockKind, string> = {
  expiry: "Authorization ends", review: "Continued-stay review due", units: "Units run out", window: "Submission window closes", notice: "Notice due", p2p: "Peer-to-peer window closes",
  answer: "Payer answer expected", decision: "Decision expected", next: "Next step due", stepdown: "Step-down due",
};

export function OngoingCareCard({ record }: { record: IntakeRecord }) {
  const nav = useNavigate();
  const book = useStore(selectPatientBook);
  const clock = useStore((s) => s.clock);
  const create = useStore((s) => s.createClinicalIntake);
  const startCase = useStore((s) => s.startCaseFromIntake);
  const toast = useStore((s) => s.toast);

  const episode = record.episodeId ? book.episodes.find((e) => e.id === record.episodeId) : undefined;
  const auth = episode ? authorizationsOf(book, episode.id)[0] : undefined;
  if (!episode || !auth) return null;

  /* Reassessment and review dates mean something once an approval exists; until then the card shows where the request stands. */
  const approved = auth.authorized !== null && auth.status !== "pending" && auth.status !== "closed";
  const due = auth.next.at;
  const days = Math.ceil((due - clock) / DAY);
  const state = days < 0 ? { word: "Overdue", tone: "risk" as const } : days <= 7 ? { word: "Due soon", tone: "mid" as const } : { word: "Scheduled", tone: "neutral" as const };
  const signedAt = Object.values(record.instruments ?? {}).filter((i) => i.status === "signed" && i.signedAt !== undefined).map((i) => i.signedAt as number).sort((a, b) => b - a)[0];
  const used = auth.used !== null && auth.authorized ? Math.min(100, Math.round((auth.used / auth.authorized) * 100)) : null;
  const when = (m: number): string => `${longDate(m)}${days < 0 ? `, ${-days} ${-days === 1 ? "day" : "days"} ago` : days === 0 ? ", today" : `, in ${days} ${days === 1 ? "day" : "days"}`}`;

  const reassess = () => {
    const id = create({
      initials: record.initials, age: record.age, site: record.site, payerId: record.payerId as BuiltInPayerId | null, patientId: record.patientId ?? episode.patientId, copyFrom: record.id, purposeId: "reassessment",
      episode: { key: `book:${episode.id}`, patientId: episode.patientId, episodeId: episode.id, fromIntakeId: record.id, label: `${episode.levelLabel}, ${episode.label.toLowerCase()}` },
    });
    toast({ title: `Reassessment ${id} started`, body: "The treatment episode and the earlier signed assessments are carried forward as a new version. Choose the program next.", tone: "good" });
    nav(paths.configure(id, "program"));
  };
  const continuedStay = () => {
    const id = startCase(record.id, "concurrent");
    if (!id) return toast({ title: "The authorization could not be prepared", body: "Open care planning and link the treatment episode first.", tone: "mid" });
    nav(paths.newCase({ draft: id, intake: record.id, episode: episode.id }));
  };

  return (
    <Card data-card="ongoing-care" className="min-w-0">
      <CardHeader title="Ongoing care" subtitle={`${episode.levelLabel} · ${episode.label} · ${payerNameOf(auth.payerId)}`} right={<Pill tone={AUTH_STATUS_TONE[auth.status]}>{AUTH_STATUS_LABEL[auth.status]}</Pill>} />
      <dl className="divide-y divide-line px-5 py-1 text-[13px]">
        <div className="flex gap-3 py-2">
          <dt className="w-[150px] shrink-0 text-muted">Authorization</dt>
          <dd className="min-w-0 flex-1 font-medium">{auth.id} · {auth.label}<span className="block font-normal text-muted">{windowText(auth) ?? "Not approved yet"}</span></dd>
        </div>
        <div className="flex gap-3 py-2" data-ongoing="units">
          <dt className="w-[150px] shrink-0 text-muted">Units used</dt>
          <dd className="min-w-0 flex-1 font-medium">
            {auth.used !== null && auth.authorized !== null ? (
              <>
                {auth.used} of {auth.authorized} {auth.unit} used<span className="font-normal text-muted"> · {leftText(auth)}</span>
                {used !== null ? <Meter value={used} className="mt-1.5 max-w-[320px]" height={5} /> : null}
              </>
            ) : <span className="font-normal text-muted">No count on file yet. The authorization has not been approved.</span>}
          </dd>
        </div>
        {approved ? (
          <>
            <div className="flex gap-3 py-2" data-ongoing="reassessment">
              <dt className="w-[150px] shrink-0 text-muted">Reassessment due</dt>
              <dd className="min-w-0 flex-1 font-medium">
                <span className="mr-2">{when(due)}</span><Pill tone={state.tone}>{state.word}</Pill>
                <span className="mt-0.5 block font-normal text-muted">Before the next review. {signedAt !== undefined ? `Last signed work on this record: ${longDate(signedAt)}. ` : ""}The payer's interval is not verified. Payer requirement not yet verified.</span>
              </dd>
            </div>
            <div className="flex gap-3 py-2" data-ongoing="review">
              <dt className="w-[150px] shrink-0 text-muted">Continued-stay review</dt>
              <dd className="min-w-0 flex-1 font-medium">
                {auth.next.kind === "review" ? `Due ${when(due)}` : `Due before the authorization ends${auth.approvedTo !== null ? `, ${longDate(auth.approvedTo)}` : ""}`}
                <span className="mt-0.5 block font-normal text-muted">Next date on the authorization: {NEXT_LABEL[auth.next.kind].toLowerCase()}, {longDate(due)}.</span>
              </dd>
            </div>
          </>
        ) : (
          <div className="flex gap-3 py-2" data-ongoing="request">
            <dt className="w-[150px] shrink-0 text-muted">Where the request stands</dt>
            <dd className="min-w-0 flex-1 font-medium">
              {NEXT_LABEL[auth.next.kind]}, {longDate(due)}
              <span className="mt-0.5 block font-normal text-muted">No approval yet, so there is no reassessment or continued-stay review to schedule. Payer requirement not yet verified.</span>
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-1 pb-4">
        <Button variant="primary" icon={ClipboardCheck} onClick={reassess} data-ongoing-reassess>Start reassessment</Button>
        <Button icon={FilePlus2} onClick={continuedStay} data-ongoing-continued>Prepare continued-stay authorization</Button>
        <span className="text-[12px] text-muted">Nothing is sent to a payer. A person reviews and signs the request in New Authorization.</span>
      </div>
    </Card>
  );
}
