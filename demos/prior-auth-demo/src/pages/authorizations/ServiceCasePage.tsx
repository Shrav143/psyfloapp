import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Crumbs, Disclosure, HistoryFeed, KeyValue, Page, PageHeader, Pill } from "@/components/ui";
import { NOT_ENOUGH_CASES, serviceOfProgram, VA_CRITERIA_PENDING } from "@/data/programTables";
import { payerById } from "@/data/seed";
import { isCoreProgram, PROGRAM_LABEL, type PsyRequest, type Tone } from "@/data/types";
import { requirementsFor, SOURCES, type PolicyRule } from "@/data/va/policy";
import { viewerById } from "@/data/viewers";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { historyOf } from "./history";

const STATUS: Record<PolicyRule["status"], { text: string; tone: Tone }> = {
  final: { text: "Final", tone: "good" },
  draft: { text: "Draft", tone: "mid" },
  unresolved: { text: "Not final", tone: "neutral" },
};

/** A request for a Virginia service other than the four core levels of care (CPST, ACT, ABA and the rest), made in New Case. The case page's tabs read
    criteria, documents and a forecast that exist only for the core levels of care, so this page shows what is known and nothing more: the request,
    what the Virginia policy rows (data/va/policy.ts) say for the service today, the framework and approval chance lines, and the request's history. */
export function ServiceCasePage({ request: r }: { request: PsyRequest }) {
  const clock = useStore((s) => s.clock);
  const you = viewerById(useStore((s) => s.viewerId)).name;
  const service = isCoreProgram(r.program) ? undefined : serviceOfProgram(r.program);
  const payer = payerById(r.payerId);
  const rules = useMemo(() => (service ? requirementsFor({ serviceId: service.id, payerId: r.payerId, age: r.patient.age, serviceDate: clock }) : []), [service, r.payerId, r.patient.age, clock]);
  const items = useMemo(() => historyOf(r, []), [r]);
  return (
    <Page>
      <Crumbs items={[{ label: "Authorizations", to: paths.authorizations() }, { label: r.id }]} />
      <PageHeader
        title={`${r.id} · ${PROGRAM_LABEL[r.program]}`}
        sub={`${r.patient.initials}, ${r.patient.age} · ${payer.name} · ${r.type}`}
        actions={
          <Link to={paths.dashboard({ request: r.id })} className="inline-flex h-[38px] items-center rounded-xl border border-field bg-white px-4 text-sm font-medium text-ink hover:bg-tile">
            Open on the Dashboard
          </Link>
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="What Virginia policy says for this service" />
          {rules.length ? (
            <ul aria-label="Virginia policy for this service">
              {rules.map((rule) => (
                <li key={rule.id} className="border-b border-line px-5 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">{rule.label}</span>
                    <Pill tone={STATUS[rule.status].tone}>{STATUS[rule.status].text}</Pill>
                  </div>
                  <p className="mt-1 text-[13px] text-ink2">{rule.detail}</p>
                  <p className="mt-1 text-[12px] text-muted">Source: {SOURCES[rule.source].title}</p>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-[13px] text-muted">No Virginia policy row is configured for this service.</p>
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Request" />
          <CardBody>
            <KeyValue
              className="text-[14px]"
              items={[
                ["Status", <Pill key="s" tone={r.tone}>{r.chip}</Pill>],
                ["Service", service?.label ?? PROGRAM_LABEL[r.program]],
                ["Framework", <span key="f" className="font-normal text-mid-ink">{VA_CRITERIA_PENDING}</span>],
                ["Approval chance", <span key="c" className="font-normal text-mid-ink">{NOT_ENOUGH_CASES}</span>],
              ]}
            />
          </CardBody>
        </Card>
      </div>
      <Disclosure title="History" summary={items.length ? `${items.length} ${items.length === 1 ? "line" : "lines"}` : "Nothing yet"}>
        <HistoryFeed items={items} you={you} label="Request history" />
      </Disclosure>
    </Page>
  );
}
