import { Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";

/** A quiet pill that names the site a page is showing, to sit beside the page title:
    `<PageHeader title={<>Case Manager <SiteTag /></>} />`.
    It shows only when a viewer who may see both sites has narrowed the view to one. With Both sites there is nothing to say, and a viewer limited to one site
    already reads "Site A only" in the top bar, so it returns nothing there. */
export function SiteTag({ className }: { className?: string }) {
  const { scope, restricted, label } = useScope();
  if (restricted || scope === "both") return null;
  return <Pill className={cn("ml-3 align-middle font-sans text-[12px] tracking-normal", className)}>{label}</Pill>;
}
