import { Card, CardBody, CardHeader, CHART, HBarChart, Table, Td, Th, Tr } from "@/components/ui";
import { SITES } from "@/data/sites";
import type { Board, SiteSplit } from "./board";
import type { CaseQuery } from "./query";
import { avgDays, fmt, pctOf, type Stats } from "./stats";

interface Line {
  key: string;
  label: string;
  show: (s: Stats) => string;
  /** The number a cell is made of, so A plus B can be checked against both sites. */
  count?: (s: Stats) => number;
  query?: Partial<CaseQuery>;
}
const pc = (a: number, b: number): string => {
  const v = pctOf(a, b);
  return v === null ? "-" : `${v}%`;
};
const LINES: Line[] = [
  { key: "n", label: "Decisions", show: (s) => fmt(s.n), count: (s) => s.n },
  { key: "approval", label: "Approval rate", show: (s) => `${pc(s.approved, s.n)} (${fmt(s.approved)})`, count: (s) => s.approved, query: { outcome: "approved" } },
  { key: "denial", label: "Denial rate", show: (s) => `${pc(s.notApproved, s.n)} (${fmt(s.notApproved)})`, count: (s) => s.notApproved, query: { outcome: "notApproved" } },
  { key: "firstPass", label: "First-pass approval", show: (s) => `${pc(s.firstPass, s.n)} (${fmt(s.firstPass)})`, count: (s) => s.firstPass, query: { flag: "firstPass" } },
  { key: "time", label: "Average decision time", show: (s) => (avgDays(s) === null ? "-" : `${avgDays(s)?.toFixed(1)} days${s.cmsN ? ` · ${pc(s.pastCms, s.cmsN)} past CMS` : ""}`), query: { slowest: true } },
  { key: "preventable", label: "Preventable denials", show: (s) => `${fmt(s.preventable)} (${pc(s.preventable, s.notApproved)} of denials)`, count: (s) => s.preventable, query: { flag: "preventable" } },
  { key: "appeals", label: "Appeals overturned", show: (s) => (s.rulings ? `${pc(s.overturned, s.rulings)} (${s.overturned} of ${s.rulings})` : "-"), count: (s) => s.overturned, query: { flag: "ruled" } },
];

/** Site A against Site B on the headline figures, for the same period and filters. Counts add up to Both sites. Shown only to someone who can see both. */
export function SiteCard({ board, onOpen }: { board: Board; onOpen: (q: CaseQuery) => void }) {
  const split: SiteSplit | null = board.sites;
  if (!split) return null;
  const gap = (pctOf(split.A.approved, split.A.n) ?? 0) - (pctOf(split.B.approved, split.B.n) ?? 0);
  const cols: { id: "A" | "B" | "all"; label: string }[] = [{ id: "A", label: SITES[0].name }, { id: "B", label: SITES[1].name }, { id: "all", label: "Both sites" }];
  const summary = `Site A: ${pc(split.A.approved, split.A.n)} approved as requested of ${split.A.n} decisions. Site B: ${pc(split.B.approved, split.B.n)} of ${split.B.n}. Both sites: ${pc(split.all.approved, split.all.n)} of ${split.all.n}.`;
  return (
    <Card data-testid="site-card">
      <CardHeader title="Site A and Site B" subtitle={`The same figures for each site, ${board.period.phrase}. Counts add up: ${fmt(split.A.n)} + ${fmt(split.B.n)} = ${fmt(split.all.n)} decisions.`} />
      <CardBody className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1.1fr]">
          <HBarChart
            ariaLabel="Site A and Site B compared"
            rows={[
              { key: "approval", label: "Approval rate", value: pctOf(split.A.approved, split.A.n), value2: pctOf(split.B.approved, split.B.n) },
              { key: "firstPass", label: "First-pass approval", value: pctOf(split.A.firstPass, split.A.n), value2: pctOf(split.B.firstPass, split.B.n) },
              { key: "appeals", label: "Appeals overturned", value: pctOf(split.A.overturned, split.A.rulings), value2: pctOf(split.B.overturned, split.B.rulings) },
            ]}
            labelWidth={140}
            legend={[{ name: "Site A", color: CHART.good }, { name: "Site B", color: CHART.sage }]}
            summary={summary}
            table={{ caption: "Site A and Site B", head: ["Figure", "Site A", "Site B", "Both sites"], rows: LINES.map((l) => [l.label, l.show(split.A), l.show(split.B), l.show(split.all)]) }}
          />
          <p className="self-center text-[14px] leading-relaxed text-ink2">
            {gap === 0 ? "Both sites approve at the same rate." : `${gap > 0 ? "Site A" : "Site B"} approves ${Math.abs(gap)} ${Math.abs(gap) === 1 ? "point" : "points"} more often as requested.`} Open a figure to list the cases for one site and see which reasons drive the difference.
          </p>
        </div>
        <div className="rounded-xl border border-line">
          <Table>
            <thead>
              <tr>
                <Th className="px-3 py-3 first:pl-5">Figure</Th>
                {cols.map((c) => (
                  <Th key={c.id} className="px-3 py-3 text-right last:pr-5">
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <Tr key={l.key} data-site-line={l.key}>
                  <Td className="px-3 py-3 first:pl-5">{l.label}</Td>
                  {cols.map((c) => {
                    const s = split[c.id];
                    const q = l.query;
                    return (
                      <Td key={c.id} className="px-3 py-3 text-right tabular-nums last:pr-5" data-site={c.id}>
                        {q && c.id !== "all" ? (
                          <button type="button" onClick={() => onOpen({ ...q, site: c.id as "A" | "B", title: `${l.label}, ${c.label}`, note: `${c.label} only, ${board.period.phrase}.` })} className="underline decoration-dotted underline-offset-[3px] hover:text-forest">
                            {l.show(s)}
                          </button>
                        ) : (
                          l.show(s)
                        )}
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
}
