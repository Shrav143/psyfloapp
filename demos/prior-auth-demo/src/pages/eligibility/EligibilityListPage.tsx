import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileClock, CircleCheck, Plus, RefreshCw, SearchX, TriangleAlert } from "lucide-react";
import { Button, Card, CardHeader, Dropdown, EmptyState, Page, PageHeader, SearchInput, Stat } from "@/components/ui";
import { SiteTag } from "@/components/layout/SiteTag";
import { sortPatients, verdictOf, VERDICT_LABEL, type Verdict } from "@/data/eligibility";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectEbRows } from "@/store/eligibility";
import { EbTable } from "./EbTable";
import { patientLabel } from "./chips";
import { InfoTip } from "@/components/ui/InfoTip";

const PAGE = 12;
type VerdictFilter = "all" | Verdict | "recheck";

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
  const tile = (v: VerdictFilter) => () => setVerdict((cur) => (cur === v ? "all" : v));

  return (
    <Page>
      <PageHeader
        title={
          <>
            {`${counts.cleared} of ${patients.length} patients are cleared to bill.`}
            <SiteTag />{" "}
            <InfoTip label="Why we check twice">
              <b>Why we check twice.</b> Eligibility says the patient is covered. Benefits say the service is payable. For Medicaid programs the second one decides whether the clinic is reimbursed, even when the copay is $0.
            </InfoTip>
          </>
        }
        sub="Coverage and benefits are checked before the first day, so you know whether the clinic will be paid. Checks in this demo are simulated."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => nav(paths.eligibilityVerify())}>
            Verify a patient
          </Button>
        }
      />
      <div className="grid grid-cols-4 gap-4">
        <Stat tone="good" icon={CircleCheck} value={counts.cleared} label="Cleared to bill" sub="coverage, service and provider all check out" onClick={tile("cleared")} selected={verdict === "cleared"} />
        <Stat tone="mid" icon={FileClock} value={counts.auth_first} label="Authorization first" sub="covered, but no approval on file yet" onClick={tile("auth_first")} selected={verdict === "auth_first"} />
        <Stat tone="risk" icon={TriangleAlert} value={counts.fix} label="Fix before billing" sub="a coverage or plan problem was found" onClick={tile("fix")} selected={verdict === "fix"} />
        <Stat tone="neutral" icon={RefreshCw} value={counts.recheck} label="Re-check due" sub="this week, done automatically" onClick={tile("recheck")} selected={verdict === "recheck"} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by case ID or initials" className="w-[300px]" />
        <Dropdown<PayerId | "all"> value={payer} defaultValue="all" onChange={setPayer} ariaLabel="Payer" options={[{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <Dropdown<Program | "all"> value={program} defaultValue="all" onChange={setProgram} ariaLabel="Program" options={[{ value: "all", label: "All programs" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))]} />
        <Dropdown<VerdictFilter>
          value={verdict}
          defaultValue="all"
          onChange={setVerdict}
          ariaLabel="Verdict"
          options={[
            { value: "all", label: "All verdicts" },
            { value: "cleared", label: VERDICT_LABEL.cleared },
            { value: "auth_first", label: VERDICT_LABEL.auth_first },
            { value: "fix", label: VERDICT_LABEL.fix },
            ...(counts.unchecked ? [{ value: "unchecked" as const, label: VERDICT_LABEL.unchecked }] : []),
            { value: "recheck", label: "Re-check due" },
          ]}
        />
        {filtered ? (
          <Button variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <Card className="relative overflow-hidden">
        <CardHeader title="Patients" subtitle="Simulated checks against the state and the plan, re-checked on a schedule" right={<span className="text-sm text-muted">{`Showing ${shown.length} of ${patients.length}`}</span>} />
        {rows.length ? (
          <>
            <EbTable rows={shown} />
            {shown.length < rows.length ? (
              <div className="flex justify-center border-t border-line py-4">
                <Button onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, rows.length - shown.length)} more</Button>
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
          >
            The filters hide every row. Clear them to see all {patients.length} patients.
          </EmptyState>
        )}
      </Card>
    </Page>
  );
}
