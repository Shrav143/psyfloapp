import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader, Chip, Disclosure, Page, PageHeader, Pill } from "@/components/ui";
import { canOverride, canSign } from "@/data/assess/roles";
import { EXTRA_SCENARIOS, SCENARIOS } from "@/data/assess/scenarios";
import { CLINICIAN_AT, INTAKE_STAFF, staffOf, VIEWER_STAFF } from "@/data/intake/seed";
import { siteName, type SiteId } from "@/data/sites";
import { VIEWERS } from "@/data/viewers";
import { paths } from "@/routes";

/** Simulated (labeled in the UI) beside real in the demo, row by row. The same table as REFERRALS-INTAKE.md. */
const SIM_ROWS: [simulated: string, real: string][] = [
  ["Document, fax, email, EMR and file imports (samples; a file you drop is not read)", "State changes, the audit trail, approvals and sign-offs"],
  ["Extraction, the evidence reader, eligibility responses and service options", "The configuration rules, with their dates, sources and versions"],
  ["AI Scribe audio and transcripts, and voice calls (scripted)", "Completeness, status and the two readiness tracks"],
  ["Referral notices and replies (a person approves a draft; delivery is simulated)", "The handoff into a New Authorization draft"],
  ["Payer submission", "Site and viewer access rules, and saving in this browser"],
];

/** The site or sites where this person is the clinician who signs. */
const sitesOf = (staffId: string): string => (Object.entries(CLINICIAN_AT) as [SiteId, string][]).filter(([, who]) => who === staffId).map(([site]) => siteName(site)).join(" and ") || "their own site";

const th = "border-b border-line px-5 py-2.5 text-left text-[11px] font-medium tracking-[0.09em] text-muted uppercase";
const td = "border-b border-line px-5 py-3 align-top text-[13px] last:border-b-0";

/** Help: three plain sections, written from the demo's own data (the scenarios, the staff and the viewers), so it cannot drift from what the screens do. */
export default function HelpPage() {
  const scenarios = [...SCENARIOS, ...EXTRA_SCENARIOS];
  const signers = INTAKE_STAFF.filter((s) => canSign(s.id));
  return (
    <Page>
      <PageHeader title="Help" sub="How to try the demo, what is simulated and who signs." />

      <Card data-help="try">
        <CardHeader title="How to try the demo" subtitle={`${scenarios.length} fictional people on different programs. The intake changes with the program.`} />
        <ul className="divide-y divide-line">
          {scenarios.map((sc) => (
            <li key={sc.key} data-scenario={sc.key} className="px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-bg text-[11px] font-semibold">{sc.key}</span>
                    <span className="text-[14px] font-semibold">{sc.label}</span>
                    <Chip>{sc.intakeId}</Chip>
                    <Chip>{siteName(sc.site)}</Chip>
                  </div>
                  <p className="mt-1 text-[13px] text-ink2">{sc.shows}</p>
                  <p className="mt-0.5 text-[12px] text-muted">Starts at: {sc.stage}</p>
                </div>
                <Link to={paths.intakeRecord(sc.intakeId)} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-forest hover:underline">
                  Open {sc.intakeId}<ArrowRight size={14} className="ico" aria-hidden="true" />
                </Link>
              </div>
              <Disclosure variant="plain" className="mt-1 border-t-0" title={<span className="font-sans text-[13px] font-semibold">Steps ({sc.walk.length})</span>}>
                <ol className="space-y-1.5 px-1 pt-2 pb-1">
                  {sc.walk.map((w, i) => (
                    <li key={w.label} className="flex gap-2 text-[13px]">
                      <span className="w-4 shrink-0 text-muted">{i + 1}.</span>
                      <span className="min-w-0"><Link to={w.path} className="font-semibold text-forest hover:underline">{w.label}</Link><span className="text-ink2">. {w.doing}</span></span>
                    </li>
                  ))}
                </ol>
              </Disclosure>
            </li>
          ))}
        </ul>
        <CardBody className="border-t border-line text-[13px] text-ink2">
          <p>Start a referral, an intake, an authorization or an eligibility check from <b className="font-semibold">+ New</b>. The Demo menu (top right) moves the clock, lists these scenarios, views the demo as another person and resets the data. The Environment chip switches between the post-transition policy date (July 1, 2027) and today's policy.</p>
        </CardBody>
      </Card>

      <Card data-help="simulated">
        <CardHeader title="What is simulated and what is real" subtitle="Every simulation is labeled where it appears." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr><th className={th} scope="col">Simulated</th><th className={th} scope="col">Real in the demo</th></tr>
            </thead>
            <tbody>
              {SIM_ROWS.map(([sim, real]) => (
                <tr key={sim}><td className={td}>{sim}</td><td className={td}>{real}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardBody className="border-t border-line text-[13px] text-ink2">
          <p>All records are synthetic. Policy rows are labeled with their source and status, and a missing payer rule reads "Payer requirement not yet verified." No licensed assessment content is included, and Psyflo scores nothing: a clinician records the result. The demo claims no HIPAA certification and no production compliance.</p>
        </CardBody>
      </Card>

      <Card data-help="roles">
        <CardHeader title="Roles and sign-off" subtitle="People decide. Agents suggest." />
        <CardBody className="space-y-3 text-[13px] text-ink2">
          <p><b className="font-semibold text-ink">Who can sign.</b> Only a qualified clinician signs an assessment, a module, a service selection or a care plan. In the demo, {signers.map((s) => `${s.name}${s.credentials ? ` (${s.credentials})` : ""} signs at ${sitesOf(s.id)}`).join(" and ")}. A coordinator triages and accepts referrals but cannot sign. Removing a required module needs an authorized override: a qualified clinician or the clinic owner, with a reason.</p>
          <p><b className="font-semibold text-ink">The overall sign-off.</b> A clinician signs off the whole assessment once every required module is signed. Care planning follows it.</p>
          <p><b className="font-semibold text-ink">Role-play.</b> When you are not the clinician, the sign-off dialog offers to send the request for signature, or to sign as the site's clinician in the demo. The audit trail records that as role-play.</p>
          <p><b className="font-semibold text-ink">Agents.</b> They never sign, select a service or a level of care, decide that a person is safe, or submit anything.</p>
        </CardBody>
        <div className="border-t border-line">
          <div className="px-5 pt-3 pb-1 text-[13px]"><b className="font-semibold text-ink">Demo, then Viewing as</b><span className="text-ink2"> switches who is looking. Access follows the sites a person may see.</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr><th className={th} scope="col">Viewing as</th><th className={th} scope="col">Role</th><th className={th} scope="col">Sites</th><th className={th} scope="col">Signs</th></tr>
              </thead>
              <tbody>
                {VIEWERS.map((v) => {
                  const staff = staffOf(VIEWER_STAFF[v.id] ?? "");
                  return (
                    <tr key={v.id} data-viewer={v.id}>
                      <td className={`${td} font-medium text-ink`}>{v.name}</td>
                      <td className={td}>{v.role}</td>
                      <td className={td}>{v.sites.map(siteName).join(" and ")}</td>
                      <td className={td}>{staff && canSign(staff.id) ? <Pill tone="good">Can sign</Pill> : <Pill tone="neutral">{staff && canOverride(staff.id) ? "Can override, not sign" : "Cannot sign"}</Pill>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </Page>
  );
}
