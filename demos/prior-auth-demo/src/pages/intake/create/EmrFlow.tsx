import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banner, Button, Card, CardBody, CardHeader, Chip, EmptyState, Field, SearchInput } from "@/components/ui";
import { sampleById, type ReferralSample } from "@/data/intake/samples";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { SiteSelect } from "./inputs";
import { draftPath } from "./paths";
import { startFromSample } from "./startDraft";
import { Search } from "lucide-react";

const PATIENTS = ["s-emr-gn", "s-emr-cd", "s-emr-rt"];

/** Import from EMR: three fictional systems and three sample charts. Picking a chart reads its referral order into the same review as any other referral. */
export function EmrFlow() {
  const nav = useNavigate();
  const scope = useScope();
  const paused = useStore((s) => s.agentPaused.reader);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(PATIENTS[0]);
  const [site, setSite] = useState(scope.sites[0]);
  const samples = useMemo(() => PATIENTS.flatMap((id) => (sampleById(id) ? [sampleById(id) as ReferralSample] : [])), []);
  const shown = samples.filter((s) => `${s.initials} ${s.label} ${s.emrSystem} ${s.summary}`.toLowerCase().includes(q.trim().toLowerCase()));
  const chosen = samples.find((s) => s.id === pick);
  return (
    <Card data-flow="emr">
      <CardHeader title="Import from EMR" subtitle="Choose a patient in the EMR. Reader imports the referral order and the chart summary." right={<Chip className="border border-dashed border-field bg-white">Simulated EMR import</Chip>} />
      <CardBody className="flex flex-col gap-4">
        <Banner tone="neutral">No EMR is connected. These are sample charts from three fictional systems.</Banner>
        {paused ? <Banner tone="mid" title="Reader is paused in Settings">Nothing is read until you resume it.</Banner> : null}
        <SearchInput value={q} onChange={setQ} placeholder="Search patients by initials or system" />
        {shown.length ? (
          <div role="radiogroup" aria-label="EMR patient" className="flex flex-col gap-2">
            {shown.map((s) => {
              const on = s.id === pick;
              return (
                <button key={s.id} type="button" role="radio" aria-checked={on} data-emr-patient={s.id} onClick={() => setPick(s.id)} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-left", on ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}>
                  <span className={cn("mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-forest" : "border-[#D9D6CF]")}>{on ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{s.label}</span>
                    <span className="block text-[13px] text-muted">{s.summary}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5"><Chip>{s.emrSystem}</Chip>{s.tags.map((t) => <Chip key={t}>{t}</Chip>)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Search} title="No patient matches" action={<Button onClick={() => setQ("")}>Clear search</Button>}>Try initials or the name of an EMR system.</EmptyState>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Site"><SiteSelect value={site} sites={scope.sites} onChange={setSite} /></Field></div>
        <div>
          <Button variant="primary" disabled={paused || !chosen} onClick={() => chosen && nav(draftPath(startFromSample(chosen, { site, method: "emr", label: `EMR import · ${chosen.label}` })))} data-start-emr>Import the referral</Button>
        </div>
      </CardBody>
    </Card>
  );
}
