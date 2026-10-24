import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, CircleDashed, FileClock, Plus, RefreshCw, SearchX, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button, Card, Dropdown, EmptyState, Page, SearchInput } from "@/components/ui";
import { SiteTag } from "@/components/layout/SiteTag";
import { sortPatients, verdictOf, VERDICT_LABEL, type Verdict } from "@/data/eligibility";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program, type Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectEbRows } from "@/store/eligibility";
import { EbTable } from "./EbTable";
import { patientLabel } from "./chips";

const PAGE = 12;
type VerdictFilter = "all" | Verdict | "recheck";

const TILE_TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good-ink border-good-edge",
  mid: "bg-mid-bg text-mid-ink border-mid-edge",
  risk: "bg-risk-bg text-risk-ink border-risk-edge",
  neutral: "bg-neutral-bg text-neutral-ink border-neutral-edge",
};

/** One small verdict tile on one line: icon, count, label. It filters the list; the longer meaning is its tooltip. */
function Tile({ tone, icon: Icon, value, label, hint, selected, onClick }: { tone: Tone; icon: LucideIcon; value: number; label: string; hint: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={hint}
      aria-pressed={selected}
      onClick={onClick}
      className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors hover:brightness-[0.98]", TILE_TONE[tone], selected && "outline-2 outline-offset-2 outline-forest")}
    >
      <Icon size={15} className="ico" aria-hidden="true" />
      <span className="text-[18px] font-semibold leading-none tabular-nums">{value}</span>{" "}
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

/** Eligibility and Benefits: will the clinic be paid for each patient? Reads the shared verification records, inside the sites in view,
    so a check made in New Case is a row here and a check made here is the one New Case finds. */
export default function EligibilityListPage() {
  const nav = useNavigate();
  const patients = useStore(selectEbRows);
  const [q, setQ] = useState("");
  const [payer, setPayer] = useState<PayerId | "all">("all");
  const [program, setProgram] = useState<Program | "all">("all");
  const [verdict, setVerdict] = useState<VerdictFilter>("all");
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const c = { cleared: 0, auth_first: 0, fix: 0, unchecked: 0, recheck: patients.filter((p) => p.recheckDue).length };
    for (const p of patients) c[verdictOf(p)] += 1;
    return c;
  }, [patients]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sortPatients(patients).filter((p) => {
      if (payer !== "all" && p.payerId !== payer) return false;
      if (program !== "all" && p.program !== program) return false;
      if (verdict === "recheck" ? !p.recheckDue : verdict !== "all" && verdictOf(p) !== verdict) return false;
      return !needle || p.id.toLowerCase().includes(needle) || patientLabel(p).toLowerCase().includes(needle);
    });
  }, [patients, q, payer, program, verdict]);

  const filtered = q !== "" || payer !== "all" || program !== "all" || verdict !== "all";
  /* With no filter the list opens on the first dozen (every problem sorts to the top); a filter shows all of its matches. */
  const shown = filtered ? rows : rows.slice(0, limit);
  const clear = () => {
    setQ("");
    setPayer("all");
    setProgram("all");
    setVerdict("all");
  };
  const tile = (v: VerdictFilter) => ({ selected: verdict === v, onClick: () => setVerdict((cur) => (cur === v ? "all" : v)) });

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-serif text-[24px] font-semibold leading-[1.2] tracking-tight">
          Eligibility &amp; Benefits
          <SiteTag />
        </h1>
        <Button variant="primary" icon={Plus} onClick={() => nav(paths.eligibilityVerify())}>
          Verify a patient
        </Button>
      </div>
      <div role="group" aria-label="Verdicts" className="-mt-1 flex flex-wrap gap-2.5">
        <Tile tone="good" icon={CircleCheck} value={counts.cleared} label={VERDICT_LABEL.cleared} hint="Coverage, service and provider all check out" {...tile("cleared")} />
        <Tile tone="mid" icon={FileClock} value={counts.auth_first} label={VERDICT_LABEL.auth_first} hint="Covered, no approval on file yet" {...tile("auth_first")} />
        <Tile tone="risk" icon={TriangleAlert} value={counts.fix} label={VERDICT_LABEL.fix} hint="A coverage or plan problem was found" {...tile("fix")} />
        <Tile tone="neutral" icon={RefreshCw} value={counts.recheck} label="Re-check due" hint="This week, run by Verify on its own" {...tile("recheck")} />
        {counts.unchecked ? <Tile tone="neutral" icon={CircleDashed} value={counts.unchecked} label={VERDICT_LABEL.unchecked} hint="The check could not run" {...tile("unchecked")} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by case ID or initials" className="w-[280px] max-w-full" />
        <Dropdown<PayerId | "all"> value={payer} defaultValue="all" onChange={setPayer} ariaLabel="Payer" options={[{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <Dropdown<Program | "all"> value={program} defaultValue="all" onChange={setProgram} ariaLabel="Program" options={[{ value: "all", label: "All programs" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))]} />
        {filtered ? (
          <Button variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
        <span className="ml-auto text-[13px] text-muted">{`Showing ${shown.length} of ${patients.length}`}</span>
      </div>
      <Card className="relative overflow-hidden">
        {rows.length ? (
          <>
            <EbTable rows={shown} />
            {shown.length < rows.length ? (
              <div className="flex justify-center border-t border-line py-3">
                <Button size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, rows.length - shown.length)} more
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No patients match these filters"
            action={
              <Button variant="primary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        )}
      </Card>
    </Page>
  );
}
