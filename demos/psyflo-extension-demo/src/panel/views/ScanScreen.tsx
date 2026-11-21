import { useEffect, useState } from "react";
import { useStore } from "@/store";
import AskView from "./AskView";
import ScanView from "./ScanView";
import "../panel-nav.css";

/** The fourth icon. Scan & Enhance checks a document that is already saved and offers fixes. Ask Psyflo, beside it, answers from the chart and the clinic's own rules when a fix needs evidence. */
export default function ScanScreen() {
  const pause = useStore((s) => s.pause);
  const focus = useStore((s) => s.focus);
  const [pane, setPane] = useState<"check" | "ask">("check");
  // a paused save or a chip clicked in Lauris always shows the alerts
  useEffect(() => { if (pause || focus) setPane("check"); }, [pause, focus]);
  return (
    <>
      <div className="sc-seg">
        <div className="p-seg" role="group" aria-label="Scan and Ask">
          <button type="button" data-testid="scan-pane-check" aria-pressed={pane === "check"} onClick={() => setPane("check")}>Scan &amp; Enhance</button>
          <button type="button" data-testid="scan-pane-ask" aria-pressed={pane === "ask"} onClick={() => setPane("ask")}>Ask Psyflo</button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{pane === "check" ? <ScanView /> : <AskView />}</div>
    </>
  );
}
