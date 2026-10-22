import { Button, Disclosure, Pill, Table, Td, Th, Tr } from "@/components/ui";
import { SITES, siteName } from "@/data/sites";
import { VIEWERS } from "@/data/viewers";
import { useStore } from "@/store";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];

/** Who can see which site. It shows the rule the demo follows on every screen; it is not an admin tool, so the roles are fixed and the only control is "View as",
    which switches the viewer exactly as Viewing as in the Demo menu does (and raises its toast). */
export function SitesAccess() {
  const viewerId = useStore((s) => s.viewerId);
  const setViewer = useStore((s) => s.setViewer);
  return (
    <Disclosure title="Sites and access" summary={`${WORDS[SITES.length]} ${SITES.length === 1 ? "site" : "sites"}, ${WORDS[VIEWERS.length].toLowerCase()} roles`} className="xl:col-span-2">
      <div className="flex flex-col gap-4 py-5">
        <div className="flex flex-col gap-1.5 px-6 text-sm text-ink2">
          <p>Access is by site (minimum necessary). A person sees only the sites they work at, and every view and export respects it: lists, counts, charts, searches and downloads leave out the other site's patients.</p>
          <p className="text-muted">A link to a record at a site someone cannot see opens a notice that names no patient. Agents, payers and these settings are clinic-wide. Roles are fixed in this demo, so use View as to see each one.</p>
        </div>
        <Table>
          <thead>
            <tr>
              <Th scope="col">Person and role</Th>
              <Th scope="col">Can see</Th>
              <Th scope="col">Viewing as</Th>
            </tr>
          </thead>
          <tbody>
            {VIEWERS.map((v) => (
              <Tr key={v.id} data-viewer={v.id}>
                <Td>
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-[13px] text-muted">{v.role}</div>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {v.sites.map((id) => <Pill key={id} tone="good">{siteName(id)}</Pill>)}
                    {v.sites.length === 1 ? <span className="text-[13px] text-muted">only</span> : null}
                  </div>
                </Td>
                <Td>
                  {viewerId === v.id ? <Pill tone="neutral">Viewing now</Pill> : <Button size="sm" onClick={() => setViewer(v.id)} aria-label={`View as ${v.name}`}>View as</Button>}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Disclosure>
  );
}
