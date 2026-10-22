import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { siteName, siteOf } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { Card, CardBody } from "@/components/ui";

/** Shown instead of a record that belongs to a site the viewer cannot see. It names no patient and no detail of the record. */
export function OutOfSite({ id, what = "record" }: { id: string; what?: string }) {
  const { viewer, label } = useScope();
  return (
    <Card className="mx-auto mt-10 max-w-[560px]">
      <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-neutral-bg"><Lock size={20} className="ico text-muted" aria-hidden="true" /></span>
        <h2 className="font-serif text-[22px] font-semibold">This {what} is not available at {label}</h2>
        <p className="max-w-[420px] text-[14px] text-muted">
          {id} belongs to {siteName(siteOf(id))}. {viewer.name} can see {viewer.sites.map((s) => `Site ${s}`).join(" and ")} only. Access follows the site so staff see only the patients they work with.
        </p>
        <Link to={paths.dashboard()} className="text-[14px] font-medium text-forest underline underline-offset-[3px]">Back to the Dashboard</Link>
      </CardBody>
    </Card>
  );
}
