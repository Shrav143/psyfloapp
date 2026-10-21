import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button, Page, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";
import { useStore } from "@/store";
import { FunnelCard, SourceCard, WeeklyCard } from "./Charts";
import { downloadCsv } from "./csv";
import { FilterBar } from "./FilterBar";
import { KpiTiles } from "./KpiTiles";
import { baseFilter, countByView, funnelSteps, inView, matchesQuery, medianDecision, pastTarget, sortReferrals, sourceStats, weeklyCounts } from "./metrics";
import { NewReferralModal } from "./NewReferralModal";
import { ReferralsTable } from "./ReferralsTable";

/** The referral pipeline: what needs a decision now, where referrals come from, and how many become admissions. */
export default function ReferralsPage() {
  const referrals = useStore((s) => s.referrals);
  const f = useStore((s) => s.referralFilters);
  const clock = useStore((s) => s.clock);
  const set = useStore((s) => s.setReferralFilter);
  const clear = useStore((s) => s.clearReferralFilters);
  const toast = useStore((s) => s.toast);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const m = useMemo(() => {
    const base = baseFilter(referrals, f, clock);
    const counts = countByView(base);
    const steps = funnelSteps(base);
    const rows = sortReferrals(base.filter((r) => inView(r, f.view) && matchesQuery(r, query)));
    return {
      base,
      counts,
      steps,
      rows,
      intakeBooked: base.filter((r) => r.status === "scheduled").length,
      medianMin: medianDecision(base),
      decided: base.filter((r) => r.decidedAt !== undefined).length,
      late: base.filter((r) => pastTarget(r, clock)).length,
      sources: sourceStats(baseFilter(referrals, f, clock, { source: true })),
      weekly: weeklyCounts(baseFilter(referrals, f, clock, { period: true }), clock),
    };
  }, [referrals, f, clock, query]);

  // The headline is about the whole pipeline, so it ignores the filters.
  const open = referrals.filter((r) => r.status === "new" || r.status === "in_review");
  const urgent = open.filter((r) => r.urgency !== "routine").length;
  const title = open.length ? `${plural(open.length, "referral")} ${open.length === 1 ? "needs" : "need"} review. ${urgent === 0 ? "None are urgent." : urgent === open.length && open.length > 1 ? "All are urgent." : `${urgent} ${urgent === 1 ? "is" : "are"} urgent.`}` : "Every referral has been looked at.";

  const exportCsv = () => {
    const rows = sortReferrals(m.base.filter((r) => inView(r, f.view) && matchesQuery(r, query)));
    downloadCsv(rows);
    toast({ title: "Exported to CSV", body: `${plural(rows.length, "referral")} in the current view were saved to referrals.csv.`, tone: "good" });
  };

  return (
    <Page>
      <PageHeader
        title={title}
        sub="Where every referral stands, from the fax that arrived to the person who was admitted."
        actions={
          <>
            <Button icon={Download} onClick={exportCsv}>Export CSV</Button>
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>New referral</Button>
          </>
        }
      />
      <FilterBar />
      <KpiTiles
        counts={m.counts}
        intakeBooked={m.intakeBooked}
        view={f.view}
        onView={(v) => set("view", v)}
        medianMin={m.medianMin}
        decided={m.decided}
        conversion={m.steps[0].value ? (m.steps[3].value / m.steps[0].value) * 100 : undefined}
        admitted={m.steps[3].value}
        received={m.steps[0].value}
        late={m.late}
        lateOn={f.late}
        onLate={() => set("late", !f.late)}
      />
      <div className="grid grid-cols-2 gap-[22px] min-[1400px]:grid-cols-3">
        <FunnelCard steps={m.steps} />
        <SourceCard stats={m.sources} selected={f.source} onPick={(k) => set("source", k)} />
        <WeeklyCard data={m.weekly} />
      </div>
      <ReferralsTable rows={m.rows} counts={m.counts} view={f.view} onView={(v) => set("view", v)} query={query} onQuery={setQuery} onClear={() => { clear(); setQuery(""); }} />
      {adding ? <NewReferralModal onClose={() => setAdding(false)} /> : null}
    </Page>
  );
}
