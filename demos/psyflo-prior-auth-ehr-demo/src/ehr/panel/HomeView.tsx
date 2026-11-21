import { useState } from "react";
import { ArrowRight, ClipboardList, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Pill } from "@/components/ui";
import { payerById } from "@/data/seed";
import type { Tone } from "@/data/types";
import { useDenialEdits, useEditQueue, type EditRow } from "@/ehr/model";
import { useScope } from "@/lib/scope";
import { HOUR, toDate } from "@/lib/time";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { PANEL_DEMO_LINE, PCard, PanelTitle } from "./parts";

const SHOWN = 5;
const DENIALS_SHOWN = 3;

function greeting(clock: number): string {
  const h = toDate(clock).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function EditRowCard({ row, onOpen }: { row: EditRow; onOpen: () => void }) {
  const payer = payerById(row.item.payerId).shortName;
  const who = `${row.item.initials}, ${row.item.age}`;
  return (
    <li>
      <PCard className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[14px]">{who}</b>
          <span className="text-[13px] text-ink2">{payer} · {row.item.levelLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          <span>{row.due}</span>
          <span aria-hidden="true">·</span>
          <span>{plural(row.open, "suggestion")} · +{row.points} pts</span>
          {row.needsInput ? <Pill tone="mid">Needs your words</Pill> : null}
        </div>
        <div>
          <Button size="sm" variant="primary" icon={ArrowRight} onClick={onOpen} aria-label={`Open the form for ${who}, ${payer}`}>Open the form</Button>
        </div>
      </PCard>
    </li>
  );
}

/** The extension on the Consumers and Authorizations pages of Lauris: what to edit in Lauris, what to correct, and the way back to Psyflo. */
export function HomeView() {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const { viewer } = useScope();
  const queue = useEditQueue();
  const denials = useDenialEdits();
  const [all, setAll] = useState(false);
  const [allDenials, setAllDenials] = useState(false);
  const rows = all ? queue : queue.slice(0, SHOWN);
  const denialRows = allDenials ? denials : denials.slice(0, DENIALS_SHOWN);
  const top = queue[0];
  const topLeft = top ? top.item.dueAt - clock : 0;
  const topTone: Tone = topLeft < 6 * HOUR ? "risk" : "mid";
  const openForm = (caseId: string, view?: "denial") => navigate(paths.lauris({ case: caseId, view }));
  const openPsyflo = () => navigate(useStore.getState().ehr.returnTo ?? paths.dashboard());
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
        <div>
          <h2 className="m-0 text-[20px] leading-tight font-semibold">{greeting(clock)}, {viewer.name.split(" ")[0]}.</h2>
          <div className="text-[13px] text-muted">{toDate(clock).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
        </div>

        {top ? (
          <PCard tone={topTone === "risk" ? "alert" : "warn"} className="flex flex-col gap-1.5">
            <div className="text-[14px] font-semibold">{top.due} · {top.item.initials}, {top.item.age}</div>
            <div className="text-[13px] text-ink2">{payerById(top.item.payerId).shortName} · {top.item.levelLabel} · {plural(top.open, "suggestion")} waiting</div>
            <div>
              <Button size="sm" variant="primary" icon={ArrowRight} onClick={() => openForm(top.caseId)}>Open the authorization form</Button>
            </div>
          </PCard>
        ) : null}

        <section aria-label="To edit in Lauris" className="flex flex-col gap-2">
          <PanelTitle count={queue.length}><ClipboardList size={15} className="ico text-forest" aria-hidden="true" />To edit in Lauris</PanelTitle>
          {queue.length ? (
            <>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {rows.map((r) => <EditRowCard key={r.caseId} row={r} onOpen={() => openForm(r.caseId)} />)}
              </ul>
              {queue.length > SHOWN ? (
                <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="self-start rounded-md px-1 text-[13px] font-semibold text-forest hover:underline">
                  {all ? "Show fewer" : `Show all ${queue.length}`}
                </button>
              ) : null}
            </>
          ) : (
            <div className="text-[13px] text-muted">Nothing is waiting to be edited.</div>
          )}
        </section>

        {denials.length ? (
          <section aria-label="Denials to correct" className="flex flex-col gap-2">
            <PanelTitle count={denials.length}><Scale size={15} className="ico text-forest" aria-hidden="true" />Denials to correct</PanelTitle>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {denialRows.map((d) => (
                <li key={d.row.id}>
                  <PCard className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <b className="text-[14px]">{d.row.who}</b>
                      <span className="text-[13px] text-ink2">{d.row.payer} · {d.row.denied}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      <span>{d.row.id}</span>
                      {d.row.deadline ? <Pill tone={d.row.deadline.tone} dot>{d.row.deadline.text} {d.row.deadline.what}</Pill> : null}
                      {d.typed ? <Pill tone="mid">{d.typed} typed in Lauris</Pill> : null}
                    </div>
                    <div>
                      <Button size="sm" onClick={() => openForm(d.caseId, "denial")} aria-label={`Re-edit the authorization for ${d.row.who}, ${d.row.payer}`}>Re-edit the authorization</Button>
                    </div>
                  </PCard>
                </li>
              ))}
            </ul>
            {denials.length > DENIALS_SHOWN ? (
              <button type="button" aria-expanded={allDenials} onClick={() => setAllDenials(!allDenials)} className="self-start rounded-md px-1 text-[13px] font-semibold text-forest hover:underline">
                {allDenials ? "Show fewer" : `Show all ${denials.length} denials`}
              </button>
            ) : null}
          </section>
        ) : null}

        <div>
          <Button size="sm" trailing={ArrowRight} onClick={openPsyflo}>Open Psyflo</Button>
        </div>
      </div>
      <footer className="flex shrink-0 items-start gap-2 border-t border-edge bg-white px-4 py-3 text-[12px] text-muted">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-marigold" aria-hidden="true" />
        {PANEL_DEMO_LINE}
      </footer>
    </>
  );
}
