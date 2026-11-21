import { ScanSearch } from "lucide-react";
import { fieldByKey } from "@/engine";
import { useStore } from "@/store";
import { StageHeading, count, type ScribeCtx } from "./shared";

/** After typing: what went into the EHR, and the reminder that a person saves. */
export default function Typed({ ctx }: { ctx: ScribeCtx }) {
  const typedKeys = useStore((s) => s.scribe.typedKeys);
  const setTab = useStore((s) => s.setTab);
  const scanRun = useStore((s) => s.scanRun);
  const scribeCancel = useStore((s) => s.scribeCancel);
  const n = typedKeys.length;

  return (
    <div className="psy-body" data-testid="scribe-typed">
      <section className={`p-card${n ? " done" : ""}`}>
        <StageHeading>{n ? `${count(n, "field")} typed into Lauris` : "Nothing was typed into Lauris"}</StageHeading>
        {n ? (
          <>
            <p className="p-sub">They are yellow. Check them, then press Save in Lauris. Psyflo does not save.</p>
            <ul className="scr-typed-list" aria-label="Fields typed into Lauris">
              {typedKeys.map((k) => <li key={k}><span className="p-chip typed">{fieldByKey(ctx.spec, k)?.label ?? k}</span></li>)}
            </ul>
          </>
        ) : (
          <p className="p-sub">No card was ticked with text in it, or the text was already in the document.</p>
        )}
      </section>

      <div className="p-col">
        <button type="button" className="p-btn pri block" data-testid="scribe-to-scan" onClick={() => { setTab("scan"); scanRun(ctx.docId); }}>
          <ScanSearch size={16} aria-hidden="true" />Scan this document
        </button>
        <button type="button" className="p-btn block" data-testid="scribe-another" onClick={scribeCancel}>Start another session</button>
        <button type="button" className="p-btn ghost block" data-testid="scribe-home" onClick={() => setTab("history")}>See it in History</button>
      </div>
    </div>
  );
}
