import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, Card, CardBody, Crumbs, Page, PageHeader, Stepper } from "@/components/ui";
import { PURPOSES, purposeById } from "@/data/assess/purposes";
import type { PurposeId } from "@/data/assess/types";
import type { EpisodeRef, IntakeRecord } from "@/data/intake/types";
import type { BuiltInPayerId } from "@/data/types";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectPatientBookInView } from "@/store/patients";
import { EMPTY_PERSON, PersonStep, type NewPerson } from "./PersonStep";
import { StepPurpose } from "./StepPurpose";
import { ageOn, candidatesOf, defaultEpisode, duplicatesOf, episodeOptions, initialsFrom, normInitials, type Candidate, type PersonRef } from "./people";

const BLANK: PersonRef = { initials: "", age: null, dob: null, patientId: null, payerId: null, memberLast4: null };
const newest = (rs: IntakeRecord[]): IntakeRecord | undefined => [...rs].sort((a, b) => b.createdAt - a.createdAt)[0];

/** New Clinical Intake (/intake/start): an intake for a person who has no referral. Choose the person (the patient book and the intake records, or someone new,
    with a check for a person already on file), then the purpose, which asks for the treatment episode when it continues one. The intake is then created
    and the configuration wizard opens at the program step. */
export default function NewClinicalIntakePage() {
  const { key } = useLocation();
  /* Opening the page again, or with another person or purpose, starts it over. */
  return <NewClinicalIntake key={key} />;
}

function NewClinicalIntake() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const scope = useScope();
  const clock = useStore((s) => s.clock);
  const book = useStore(selectPatientBookInView);
  const allIntakes = useStore((s) => s.intakes);
  const create = useStore((s) => s.createClinicalIntake);
  const toast = useStore((s) => s.toast);

  const intakes = useMemo(() => allIntakes.filter((r) => scope.sites.includes(r.site)), [allIntakes, scope.sites]);
  const all = useMemo(() => candidatesOf(book, intakes), [book, intakes]);

  const [preset] = useState<Candidate | null>(() => {
    const p = params.get("patient");
    return p ? all.find((c) => c.person.patientId === p || c.intakes.some((r) => r.id === p)) ?? null : null;
  });
  const [picked, setPicked] = useState<Candidate | null>(preset);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<NewPerson>(() => EMPTY_PERSON(scope.sites[0] ?? "A"));
  const [sameOk, setSameOk] = useState(false);
  const [stage, setStage] = useState<"person" | "purpose">(preset ? "purpose" : "person");
  const [purposeId, setPurposeId] = useState<PurposeId | null>(() => (PURPOSES.some((p) => p.id === params.get("purpose")) ? (params.get("purpose") as PurposeId) : null));
  const [episode, setEpisode] = useState<EpisodeRef | null>(null);

  const initials = initialsFrom(form.name);
  const age = ageOn(form.dob, clock);
  const dupes = adding ? duplicatesOf(all, { initials, dob: form.dob, age }) : [];
  const validNew = normInitials(initials).length >= 2 && age !== null;
  const person: PersonRef | null = picked
    ? picked.person
    : adding && validNew ? { initials, age, dob: form.dob, patientId: null, payerId: form.payerId, memberLast4: form.memberLast4 || null } : null;
  const episodes = useMemo(() => episodeOptions(person ?? BLANK, book, intakes, null), [person, book, intakes]);
  const needsEpisode = purposeId ? purposeById(purposeId).needsEpisode : false;
  const chosen = needsEpisode ? episode ?? defaultEpisode(episodes) : null;

  const personReady = !!picked || (adding && validNew && (dupes.length === 0 || sameOk));
  const purposeReady = !!purposeId && (!needsEpisode || !!chosen);
  const hint = stage === "person"
    ? adding && !validNew ? "Enter a name or initials and a date of birth to continue." : adding && dupes.length && !sameOk ? "Confirm whether this person is already on file." : !picked && !adding ? "Choose a person to continue." : ""
    : !purposeId ? "Choose the type of intake to continue." : needsEpisode && !chosen ? "Choose a treatment episode to continue." : "";

  const submit = () => {
    if (!person || !purposeId) return;
    const site = picked ? (scope.sites.includes(picked.site) ? picked.site : scope.sites[0]) : form.site;
    const copyFrom = chosen?.fromIntakeId ?? (picked ? newest(picked.intakes)?.id : null) ?? null;
    const id = create({
      initials: person.initials, age: person.age, site, payerId: (person.payerId as BuiltInPayerId | null) ?? null, patientId: person.patientId,
      dob: picked ? undefined : form.dob, legalName: picked || form.name.trim().split(/\s+/).length < 2 ? undefined : form.name.trim(), memberLast4: person.memberLast4 ?? undefined,
      copyFrom, purposeId, episode: chosen,
    });
    toast({ title: `Clinical intake ${id} started`, body: "Created without a referral. Choose the program next.", tone: "good" });
    nav(paths.configure(id, "program"));
  };

  return (
    <Page>
      <Crumbs items={[{ label: "Referrals & Intake", to: paths.referralQueue() }, { label: "New clinical intake" }]} />
      <PageHeader title="New clinical intake" sub="Start an assessment for someone who has no referral." />
      <Card>
        <CardBody className="px-6 py-5">
          <div className="@container">
            <Stepper steps={["Patient", "Intake purpose"]} current={stage === "person" ? 0 : 1} onGo={() => setStage("person")} className="text-[14px]" />
            <div className="mt-6">
              {stage === "person" ? (
                <PersonStep all={all} picked={picked} onPick={setPicked} adding={adding} onAdding={setAdding} form={form} onForm={setForm} age={age} sites={scope.sites} dupes={dupes} sameConfirmed={sameOk} onSameConfirmed={setSameOk} />
              ) : (
                <StepPurpose purposeId={purposeId} onPurpose={setPurposeId} episodes={episodes} episode={chosen} onEpisode={setEpisode} />
              )}
            </div>
            <footer className="sticky bottom-0 z-10 -mx-6 -mb-5 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-b-[20px] border-t border-edge bg-white px-6 py-4">
              {stage === "person" ? <Button onClick={() => nav(paths.referralQueue())}>Cancel</Button> : <Button icon={ArrowLeft} onClick={() => setStage("person")}>Back</Button>}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-[13px] text-muted" aria-live="polite">{hint}</span>
                {stage === "person" ? (
                  <Button variant="primary" trailing={ArrowRight} disabled={!personReady} onClick={() => setStage("purpose")}>Continue</Button>
                ) : (
                  <Button variant="primary" icon={Check} disabled={!purposeReady} onClick={submit}>Create intake and continue</Button>
                )}
              </div>
            </footer>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
