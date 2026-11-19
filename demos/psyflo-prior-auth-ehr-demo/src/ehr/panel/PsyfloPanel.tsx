import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { useEhrCase, type LaurisPage } from "@/ehr/model";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthView } from "./AuthView";
import { DenialView } from "./DenialView";
import { HomeView } from "./HomeView";
import { Legend, ViewTabs } from "./parts";

/** The case is not in Lauris: say so and give the way home. */
function NotFoundView() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      <h2 className="m-0 text-[16px] font-semibold">That authorization is not in Lauris</h2>
      <div><Button size="sm" onClick={() => navigate(paths.lauris())}>All consumers</Button></div>
    </div>
  );
}

const pageName = (page: LaurisPage): string => (page.kind === "consumers" ? "Consumers" : page.kind === "authorizations" ? "Authorizations" : `Authorization ${page.caseId}`);

/** The Psyflo browser extension, docked on the right of the mock Lauris. It reads the page that is open and chooses what to show: the home, the suggestions
    for an authorization form, or the corrections for a denied one (`?view=denial`). It types into Lauris's form only when the person asks, and never saves it. */
export function PsyfloPanel({ page }: { page: LaurisPage }) {
  const [sp] = useSearchParams();
  const c = useEhrCase(page.kind === "form" ? page.caseId : undefined);
  const { viewer } = useScope();
  const wantsDenial = sp.get("view") === "denial";
  let view: ReactNode;
  if (page.kind !== "form") view = <HomeView />;
  else if (!c) view = <NotFoundView />;
  else if (wantsDenial && c.denial) view = <DenialView c={c} denial={c.denial} tabs={<ViewTabs current="denial" />} />;
  else view = <AuthView c={c} tabs={c.denial ? <ViewTabs current="auth" /> : null} />;
  return (
    <aside aria-label="Psyflo extension" className="flex h-full w-[400px] shrink-0 flex-col overflow-hidden border-l border-edge bg-white text-ink">
      <header className="on-navy flex shrink-0 items-center gap-2.5 bg-navy px-3.5 py-2.5 text-on-navy">
        <span className="text-[20px] leading-none font-bold tracking-[-0.6px]">psyflo<i className="not-italic text-marigold">.</i></span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="m-0 text-[13px] font-semibold">Psyflo</h1>
            <span className="max-w-[150px] truncate rounded-full border border-navy-line px-2 py-px text-[12px] font-semibold whitespace-nowrap">{viewer.role}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-on-navy-muted">
            <span className="h-2 w-2 shrink-0 rounded-full bg-teal-300" aria-hidden="true" />
            <span className="truncate">Lauris connected · {pageName(page)}</span>
          </div>
        </div>
        <button type="button" onClick={() => useStore.getState().ehrPanel(false)} aria-label="Close the Psyflo panel" title="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-on-navy-muted hover:bg-navy-2 hover:text-on-navy">
          <X size={17} className="ico" />
        </button>
      </header>
      <Legend />
      {view}
    </aside>
  );
}
