import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilterX, PlayCircle, Users } from "lucide-react";
import { Button, Card, CardHeader, Chip, Dropdown, EmptyState, Pill, Stat, Table, Td, Th, Tr } from "@/components/ui";
import type { LegacyClient } from "@/data/intake/seed";
import { siteName } from "@/data/sites";
import { LEGACY_LAST_DAY, PERIOD_LABEL, periodOf, REDESIGN_START, type PolicyPeriod } from "@/data/va/policy";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { intakesInView, rosterInView } from "@/store/intakeSelectors";
import { useIntakeNow } from "../lib/policyNow";
import { LEGACY_STATUS_LABEL, LEGACY_STATUS_OPTIONS } from "../review/TransitionPlanCard";
import { planConfirmed, PlanReadiness } from "./PlanReadiness";
import { StartTransitionModal } from "./StartTransitionModal";

const LEGACY: VaServiceId[] = ["iih", "tdt", "mhss", "psr"];
const PERIOD_TEXT: Record<PolicyPeriod, string> = {
  current: "A planned start before July 1, 2027: today's services and rules.",
  preparation: "An intake now for a redesigned service that starts on or after July 1, 2027. Pathways are prepared; nothing is delivered or authorized before then.",
  redesign: "On or after July 1, 2027: redesigned pathways, following the latest confirmed DMAS policy. Drafts stay labeled as drafts.",
  transition: "A person on IIH, TDT, MHSS or PSR. The service continues through June 30, 2027; a clinical review decides what fits next.",
};
/** Tighter cells so the roster fits at tablet width. */
const CELL = "px-3 first:pl-5 last:pr-5";
const PERIODS: PolicyPeriod[] = ["current", "preparation", "redesign", "transition"];

/** The July 2027 transition: the clients on the four retiring services, the dates that matter, how each date behaves, and what each plan has confirmed. */
export function TransitionView() {
  const nav = useNavigate();
  const now = useIntakeNow();
  const clock = useStore((s) => s.clock);
  const roster = useStore((s) => s.legacyRoster);
  const intakes = useStore((s) => s.intakes);
  const plans = useStore((s) => s.planReadiness);
  const focus = useStore((s) => s.programFocus);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  const setStatus = useStore((s) => s.updateTransitionStatus);
  const toast = useStore((s) => s.toast);
  const inView = useMemo(() => rosterInView(useStore.getState()), [roster, viewerId, siteScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const records = useMemo(() => intakesInView(useStore.getState(), false), [intakes, viewerId, siteScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const [service, setService] = useState<VaServiceId | "all">("all");
  const [status, setStatusFilter] = useState<LegacyClient["status"] | "all">("all");
  const [starting, setStarting] = useState<LegacyClient | null>(null);

  /* The program in the top bar narrows the roster: a retiring service to its clients, any other service to the clients it is an option for. */
  const focused = inView.filter((c) => focus === "all" || (LEGACY.includes(focus) ? c.serviceId === focus : c.candidates.includes(focus)));
  const rows = focused.filter((c) => (service === "all" || c.serviceId === service) && (status === "all" || c.status === status)).sort((a, b) => a.authEnds - b.authEnds);
  const endingBefore = focused.filter((c) => c.authEnds < LEGACY_LAST_DAY).length;
  const started = focused.filter((c) => c.intakeId).length;
  const confirmed = plans.filter(planConfirmed).length;
  const periodCount = (p: PolicyPeriod) => records.filter((r) => periodOf(r.serviceId, r.serviceDate, now, !!r.legacy) === p).length;
  const firstEnd = [...focused].sort((a, b) => a.authEnds - b.authEnds)[0];
  const lastEnd = [...focused].sort((a, b) => b.authEnds - a.authEnds)[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={focused.length} label="Clients on retiring services" sub="IIH, TDT, MHSS, PSR" />
        <Stat tone={endingBefore ? "mid" : "neutral"} value={endingBefore} label="Authorizations end before 6/30/2027" sub="A renewal may be needed" />
        <Stat tone="good" value={started} label="Transition intakes started" sub={`of ${focused.length}`} />
        <Stat value={`${confirmed} of ${plans.length}`} label="Plans confirmed" sub="All five readiness items" />
      </div>

      <Card data-card="key-dates">
        <CardHeader title="Key dates" right={<span className="text-[12px] text-muted">Legacy services are never retired before June 30, 2027</span>} />
        <ol className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-xl border border-edge bg-tile px-3 py-2.5"><div className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Today</div><div className="text-[16px] font-semibold">{longDate(clock)}</div><div className="text-[12px] text-muted">{now !== clock ? "Previewing policy as of July 1, 2027" : "Current workflow"}</div></li>
          <li className="rounded-xl border border-mid-edge bg-mid-bg px-3 py-2.5"><div className="text-[11px] font-medium tracking-[0.1em] text-mid-ink uppercase">Authorizations ending</div><div className="text-[16px] font-semibold">{firstEnd ? `${longDate(firstEnd.authEnds)} to ${longDate(lastEnd.authEnds)}` : "None"}</div><div className="text-[12px] text-mid-ink">{endingBefore} before the last day of service</div></li>
          <li className="rounded-xl border border-edge bg-tile px-3 py-2.5"><div className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Last day of IIH, TDT, MHSS, PSR</div><div className="text-[16px] font-semibold">{longDate(LEGACY_LAST_DAY)}</div><div className="text-[12px] text-muted">June 30, 2027 (DMAS bulletin)</div></li>
          <li className="rounded-xl border border-good-edge bg-good-bg px-3 py-2.5"><div className="text-[11px] font-medium tracking-[0.1em] text-good-ink uppercase">Redesigned services start</div><div className="text-[16px] font-semibold">{longDate(REDESIGN_START)}</div><div className="text-[12px] text-good-ink">CPST, CSC, Clubhouse</div></li>
        </ol>
        <div className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-2">
          {PERIODS.map((p) => (
            <div key={p} data-period={p}>
              <div className="flex items-center gap-2"><Pill tone={p === "transition" ? "mid" : p === "current" || p === "redesign" ? "good" : "neutral"}>{PERIOD_LABEL[p]}</Pill><span className="text-[12px] text-muted">{periodCount(p)} intakes</span></div>
              <p className="mt-1 text-[13px] text-ink2">{PERIOD_TEXT[p]}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card data-card="roster">
        <CardHeader
          title="Clients on retiring services"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Dropdown<VaServiceId | "all"> ariaLabel="Current service" value={service} defaultValue="all" onChange={setService} options={[{ value: "all", label: "All services" }, ...LEGACY.map((s) => ({ value: s, label: `${serviceById(s).short} (${serviceById(s).code})` }))]} />
              <Dropdown<LegacyClient["status"] | "all"> ariaLabel="Transition status filter" value={status} defaultValue="all" onChange={setStatusFilter} options={[{ value: "all", label: "Any status" }, ...LEGACY_STATUS_OPTIONS]} />
            </div>
          }
        />
        {rows.length ? (
          <>
          <ul aria-label="Clients on retiring services" className="divide-y divide-line min-[1180px]:hidden">
            {rows.map((c) => {
              const svc = serviceById(c.serviceId);
              const linked = c.intakeId && intakes.some((r) => r.id === c.intakeId) ? c.intakeId : null;
              return (
                <li key={c.id} data-client-card={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.initials}, {c.age}</span>
                      <span className="text-[13px]">{svc.short} <span className="text-muted">({svc.code})</span></span>
                      {c.authEnds < LEGACY_LAST_DAY ? <Pill tone="mid">{c.authorizationId} ends {longDate(c.authEnds)}</Pill> : <span className="text-[12px] text-muted">{c.authorizationId} ends {longDate(c.authEnds)}</span>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">{vaPlanOf(c.payerId)?.name ?? c.payerId} · {siteName(c.site)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1"><span className="text-[12px] text-muted">Options to review, not a mapping:</span>{c.candidates.map((x) => <Chip key={x}>{x === "external" ? "External program" : serviceById(x).short}</Chip>)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Dropdown<LegacyClient["status"]> ariaLabel={`Status for ${c.initials}`} value={c.status} options={LEGACY_STATUS_OPTIONS} onChange={(v) => { setStatus(c.id, v); toast({ title: "Transition status updated", body: `${c.initials}: ${LEGACY_STATUS_LABEL[v]}`, tone: "good" }); }} />
                    {linked ? <Button size="sm" trailing={ArrowRight} onClick={() => nav(paths.intakeRecord(linked))}>Open intake {linked}</Button> : <Button size="sm" variant="primary" icon={PlayCircle} onClick={() => setStarting(c)}>Start transition intake</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <Table nowrap className="hidden min-[1180px]:table">
            <thead>
              <tr>
                <Th className={CELL}>Client</Th><Th className={CELL}>Current service and plan</Th><Th className={CELL}>Authorization</Th><Th className={`${CELL} whitespace-normal!`}>Options to review, not a mapping</Th><Th className={CELL}>Status and next step</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const svc = serviceById(c.serviceId);
                const linked = c.intakeId && intakes.some((r) => r.id === c.intakeId) ? c.intakeId : null;
                return (
                  <Tr key={c.id} data-client={c.id}>
                    <Td className={CELL}><div className="font-semibold">{c.initials}, {c.age}</div><div className="text-[12px] text-muted">{siteName(c.site)}</div></Td>
                    <Td className={`${CELL} whitespace-normal!`}><div className="whitespace-nowrap">{svc.short} <span className="text-muted">({svc.code})</span></div><div className="min-w-[140px] text-[12px] text-muted">{vaPlanOf(c.payerId)?.name ?? c.payerId}</div></Td>
                    <Td className={`${CELL} tabular-nums`}><div>{c.authorizationId}</div><div className="mt-0.5">{c.authEnds < LEGACY_LAST_DAY ? <Pill tone="mid">Ends {longDate(c.authEnds)}</Pill> : <span className="text-[12px] text-muted">Ends {longDate(c.authEnds)}</span>}</div></Td>
                    <Td className={`${CELL} whitespace-normal!`}><div className="flex min-w-[120px] flex-wrap gap-1">{c.candidates.map((x) => <Chip key={x}>{x === "external" ? "External program" : serviceById(x).short}</Chip>)}</div></Td>
                    <Td className={CELL}>
                      <div className="flex flex-col items-start gap-1.5">
                        <Dropdown<LegacyClient["status"]> ariaLabel={`Status for ${c.initials}`} value={c.status} options={LEGACY_STATUS_OPTIONS} onChange={(v) => { setStatus(c.id, v); toast({ title: "Transition status updated", body: `${c.initials}: ${LEGACY_STATUS_LABEL[v]}`, tone: "good" }); }} />
                        {linked ? (
                          <Button size="sm" trailing={ArrowRight} onClick={() => nav(paths.intakeRecord(linked))}>Open intake {linked}</Button>
                        ) : (
                          <Button size="sm" variant="primary" icon={PlayCircle} onClick={() => setStarting(c)}>Start transition intake</Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          </>
        ) : (
          <EmptyState icon={focused.length ? FilterX : Users} title={focused.length ? "No clients match" : "No clients on retiring services in view"} action={focused.length ? <Button onClick={() => { setService("all"); setStatusFilter("all"); }}>Clear filters</Button> : undefined}>
            {focused.length ? "Try another service or status." : "Change the program in the top bar or the site to see more."}
          </EmptyState>
        )}
      </Card>

      <PlanReadiness />
      {starting ? <StartTransitionModal client={starting} onClose={() => setStarting(null)} /> : null}
    </div>
  );
}
