import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { siteName, siteOf, sitesLabel, type SiteId } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { Button, Card, CardBody } from "@/components/ui";
import { useStore } from "@/store";

/** Shown instead of a record that belongs to a site the viewer is not looking at. It names no patient and no detail of the record.
    A viewer limited to one site is told why; a viewer who may see both sites can show them with one click.
    `site` is the record's own site when it is not a function of its id (an intake or a draft); without it the id places the record. */
export function OutOfSite({ id, what = "record", site }: { id: string; what?: string; site?: SiteId }) {
  const { viewer, label, restricted } = useScope();
  const setScope = useStore((s) => s.setSiteScope);
  const home = site ?? siteOf(id);
  return (
    <Card className="mx-auto mt-10 max-w-[560px]">
      <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-neutral-bg"><Lock size={20} className="ico text-muted" aria-hidden="true" /></span>
        <h1 className="font-serif text-[18px] font-semibold">This {what} is not available at {label}</h1>
        <p className="max-w-[420px] text-[14px] text-muted">
          {restricted
            ? `${id} belongs to ${siteName(home)}. ${viewer.name} can see ${sitesLabel(viewer.sites)} only. Access follows the site, so staff see only the patients they work with.`
            : `${id} belongs to ${siteName(home)}, and the view is set to ${label}. ${viewer.name} can see both sites.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {restricted ? null : <Button variant="primary" onClick={() => setScope(home)}>Show {siteName(home)}</Button>}
          <Link to={paths.dashboard()} className="text-[14px] font-medium text-forest underline underline-offset-[3px]">Back to the Dashboard</Link>
        </div>
      </CardBody>
    </Card>
  );
}
