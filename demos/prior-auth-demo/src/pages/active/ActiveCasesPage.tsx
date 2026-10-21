import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FolderOpen, MessageCircleQuestion, PenLine, Plus, Send, SearchX } from "lucide-react";
import { Button, Card, CardHeader, Dropdown, EmptyState, Page, PageHeader, Pill, SearchInput, Stat } from "@/components/ui";
import { draftState, needsPerson, type CaseDraft } from "@/data/cases";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseRow } from "./CaseRow";

type Status = "all" | "working" | "input" | "ready";

/** Cases still being prepared: urgent ones first, each with its step, its agent and the one button that moves it on. */
const byUrgency = (a: CaseDraft, b: CaseDraft): number => Number(needsPerson(b)) - Number(needsPerson(a)) || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity);
const statusOf = (d: CaseDraft): Exclude<Status, "all"> => {
  const s = draftState(d);
  return s === "working" ? "working" : s === "ready" ? "ready" : "input";
};

export default function ActiveCasesPage() {
  const nav = useNavigate();
  const drafts = useStore((s) => s.caseDrafts);
  const sentToday = useStore((s) => s.caseSentToday);
  const [q, setQ] = useState("");
  const [payer, setPayer] = useState<PayerId | "all">("all");
  const [status, setStatus] = useState<Status>("all");

  const active = useMemo(() => drafts.filter((d) => d.saved && !d.sent), [drafts]);
  const counts = useMemo(() => ({ working: active.filter((d) => statusOf(d) === "working").length, input: active.filter((d) => statusOf(d) === "input").length, ready: active.filter((d) => statusOf(d) === "ready").length }), [active]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return active
      .filter((d) => (payer === "all" || d.payerId === payer) && (status === "all" || statusOf(d) === status) && (!needle || (d.caseId ?? "").toLowerCase().includes(needle) || d.patient.initials.toLowerCase().includes(needle)))
      .sort(byUrgency);
  }, [active, q, payer, status]);

  const filtered = q !== "" || payer !== "all" || status !== "all";
  const clear = () => {
    setQ("");
    setPayer("all");
    setStatus("all");
  };
  const tile = (s: Exclude<Status, "all">) => () => setStatus((cur) => (cur === s ? "all" : s));
  const n = active.length;

  return (
    <Page>
      <PageHeader
        title={n === 0 ? "No cases are being prepared." : `${n} ${n === 1 ? "case is" : "cases are"} being prepared.`}
        sub="The agents work on each one in the background. Come back when one needs you."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => nav(paths.newCase())}>
            New case
          </Button>
        }
      />
      <div className="grid grid-cols-4 gap-4">
        <Stat tone="neutral" icon={Bot} value={counts.working} label="Agents working" sub="no action needed from you" onClick={tile("working")} selected={status === "working"} />
        <Stat tone="mid" icon={MessageCircleQuestion} value={counts.input} label="Need your input" sub="one answer each" onClick={tile("input")} selected={status === "input"} />
        <Stat tone="good" icon={PenLine} value={counts.ready} label="Ready to sign" sub="checks passed" onClick={tile("ready")} selected={status === "ready"} />
        <Stat tone="neutral" icon={Send} value={sentToday.length} label="Sent today" sub="now on the Dashboard" onClick={() => nav(paths.dashboard({ stage: "received" }))} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by case ID or initials" className="w-[300px]" />
        <Dropdown<PayerId | "all"> value={payer} defaultValue="all" onChange={setPayer} ariaLabel="Payer" options={[{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <Dropdown<Status>
          value={status}
          defaultValue="all"
          onChange={setStatus}
          ariaLabel="Status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "working", label: "Agents working" },
            { value: "input", label: "Needs your input" },
            { value: "ready", label: "Ready to sign" },
          ]}
        />
        {filtered ? (
          <Button variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <Card>
        <CardHeader title="In progress" subtitle="Most urgent first. Each case moves through eight steps; the agents do all but Ask and Sign." right={<Pill>{n === 1 ? "1 case" : `${n} cases`}</Pill>} />
        {n === 0 ? (
          <EmptyState icon={FolderOpen} title="No active cases yet" action={<Button variant="primary" icon={Plus} onClick={() => nav(paths.newCase())}>Start a new case</Button>}>
            Nothing is being prepared right now. Start one and the agents take it from there.
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No cases match these filters" action={<Button variant="primary" onClick={clear}>Clear filters</Button>}>
            The filters hide every case. Clear them to see all {n}.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3.5 p-5">
            {rows.map((d) => (
              <CaseRow key={d.id} draft={d} />
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
