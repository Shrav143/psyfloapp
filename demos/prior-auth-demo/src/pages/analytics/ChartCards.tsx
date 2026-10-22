import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Donut, HBars, Meter } from "@/components/ui";
import { band } from "@/lib/format";
import { paths } from "@/routes";
import { NOT_ENOUGH } from "./copy";
import { fmt, PREVENTABLE_COLOR, type View } from "./model";

export function NotEnough() {
  return <div className="px-6 py-10 text-center text-sm text-muted">{NOT_ENOUGH}. Figures based on fewer than 20 decisions stay hidden.</div>;
}

/** " · IOP" after a subtitle when one program is picked. */
const inProgram = (v: View): string => (v.program === "all" ? "" : ` · ${v.programLabel}`);

/** Chart 1: approval rate by payer. One payer is drawn against all payers. */
export function ApprovalCard({ v }: { v: View }) {
  const phrase = v.period.phrase;
  const hiddenBars = v.bars.filter((b) => b.value === null);
  return (
    <Card>
      <CardHeader title="Approval rate by payer" subtitle={`Approved as asked, ${phrase}${inProgram(v)}`} />
      <CardBody>
        <HBars
          labelWidth={120}
          rows={v.bars.map((b) => ({ label: b.label, value: b.value ?? 0, color: b.value === null ? "#E5DCD0" : band(b.value).color, display: b.value === null ? "-" : `${b.value}%` }))}
        />
        <p className="mt-4 text-xs text-muted">
          {fmt(v.decisions)} decisions {phrase}. {hiddenBars.length ? `${hiddenBars.map((b) => b.label).join(", ")}: ${NOT_ENOUGH.toLowerCase()}. ` : ""}Green is 80 and above, ochre 55 to 79, terracotta below 55.
        </p>
      </CardBody>
    </Card>
  );
}

/** Chart 2: the denials the team could have fixed before sending, by reason. The rows add up to the Preventable denials figure. */
export function PreventableCard({ v }: { v: View }) {
  const p = v.preventable;
  const top = Math.max(1, ...p.bars.map((b) => b.count));
  return (
    <Card>
      <CardHeader
        title="Preventable denials by reason"
        subtitle={p.count === null ? v.period.label : `${fmt(p.count)} of ${fmt(p.n)} denials (${p.share}%) could be fixed before sending, ${v.period.phrase}${inProgram(v)}`}
      />
      {p.count === null ? (
        <NotEnough />
      ) : (
        <CardBody>
          <ul className="flex flex-col gap-3.5" aria-label="Preventable denials by reason">
            {p.bars.map((b) => (
              <li key={b.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-[13.5px]">{b.label}</span>
                  <b>{fmt(b.count)}</b>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F0ECE4]" aria-hidden="true">
                  <i className="block h-full rounded-full" style={{ width: `${(b.count / top) * 100}%`, background: b.other ? "#C9B791" : PREVENTABLE_COLOR }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Thin or missing documentation, late notice, an incomplete certification and a duplicate request count as fixable. Each denial is counted once, under its reason.</p>
        </CardBody>
      )}
    </Card>
  );
}

/** Chart 3: how people edit the agents' drafts. */
export function EditsCard({ v }: { v: View }) {
  const phrase = v.period.phrase;
  return (
    <Card>
      <CardHeader title="How people edit agent drafts" subtitle={`Share of drafts, ${phrase}${inProgram(v)}`} />
      {v.edits ? (
        <CardBody>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Donut
              size={140}
              thickness={22}
              parts={v.edits.parts.map((p) => ({ value: p.share, color: p.color, label: p.label }))}
              center={
                <>
                  <span className="block text-[26px] font-semibold leading-none">{v.edits.parts[0].share}%</span>
                  <span className="mt-1 block text-[11px] text-muted">as written</span>
                </>
              }
            />
            <ul className="flex flex-col gap-3">
              {v.edits.parts.map((p) => (
                <li key={p.label} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                  <div>
                    <b>{p.label}</b>
                    <div className="text-xs text-muted">
                      {p.share}% · approved {p.approved}% of the time
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-center text-xs text-muted">{fmt(v.edits.n)} drafts {phrase}.</p>
        </CardBody>
      ) : (
        <NotEnough />
      )}
    </Card>
  );
}

/** Workload: live from the Dashboard's requests, for the payer and program in view. It does not follow the period. */
export function WorkloadCard({ handled, open, needsYou, scope }: { handled: number; open: number; needsYou: number; scope: string }) {
  const total = handled + open;
  return (
    <Card>
      <CardHeader title="Workload" subtitle="Requests on the Dashboard right now" right={<Link to={paths.dashboard()} className="text-sm font-semibold text-forest underline underline-offset-[3px]">Open the Dashboard</Link>} />
      <CardBody>
        <div className="flex items-end gap-10">
          <div>
            <div className="text-[34px] font-semibold leading-none tracking-tight" data-testid="workload-handled">{handled}</div>
            <div className="mt-1 text-[13px] text-muted">handled</div>
          </div>
          <div>
            <div className="text-[34px] font-semibold leading-none tracking-tight" data-testid="workload-open">{open}</div>
            <div className="mt-1 text-[13px] text-muted">still open</div>
          </div>
        </div>
        <Meter className="mt-4" height={8} value={total ? (handled / total) * 100 : 0} color="#2F6F5C" />
        <p className="mt-3 text-xs text-muted">
          {scope}. Handled means the payer has decided. {needsYou === 0 ? "Nothing waits on you." : `${needsYou} of the open ${needsYou === 1 ? "request waits" : "requests wait"} on you.`} Live: it changes when you answer a payer or accept a denial.
        </p>
      </CardBody>
    </Card>
  );
}
