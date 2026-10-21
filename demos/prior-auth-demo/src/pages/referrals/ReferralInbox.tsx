import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { plural } from "@/lib/format";
import { blockedInHosted } from "@/lib/hosted";
import { useStore } from "@/store";
import { FunnelCard, SourceCard, WeeklyCard } from "./Charts";
import { downloadCsv } from "./csv";
import { FilterBar } from "./FilterBar";
import { KpiTiles } from "./KpiTiles";
import { baseFilter, countByView, funnelSteps, inView, matchesQuery, medianDecision, pastTarget, sortReferrals, sourceStats, weeklyCounts } from "./metrics";
import { ReferralsTable } from "./ReferralsTable";

/** The referral inbox, the second tab of New case: what needs a decision now, where referrals come from, and how many become admissions.
    `draftId` is the case it sits in, so opening a referral and continuing comes back to that case. */
export function ReferralInbox({ draftId, onUpload }: { draftId?: string; onUpload: () => void }) {
  const referrals = useStore((s) => s.referrals);
  const f = useStore((s) => s.referralFilters);
  const clock = useStore((s) => s.clock);
  const set = useStore((s) => s.setReferralFilter);
  const clear = useStore((s) => s.clearReferralFilters);
  const toast = useStore((s) => s.toast);
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
    if (blockedInHosted("Export")) return;
    const rows = sortReferrals(m.base.filter((r) => inView(r, f.view) && matchesQuery(r, query)));
    downloadCsv(rows);
    toast({ title: "Exported to CSV", body: `${plural(rows.length, "referral")} in the current view were saved to referrals.csv.`, tone: "good" });
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[320px] flex-1">
          <h2 className="font-serif text-[26px] leading-tight font-semibold">{title}</h2>
          <p className="mt-1 text-muted">Every referral, from the fax that arrived to the person who was admitted. Open one to review and accept it.</p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button icon={Download} onClick={exportCsv}>Export CSV</Button>
          <Button variant="primary" icon={Plus} onClick={onUpload}>Upload a referral</Button>
        </div>
      </div>
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
      <ReferralsTable draftId={draftId} rows={m.rows} counts={m.counts} view={f.view} onView={(v) => set("view", v)} query={query} onQuery={setQuery} onClear={() => { clear(); setQuery(""); }} />
    </div>
  );
}
