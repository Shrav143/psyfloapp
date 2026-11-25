import { Toaster } from "@/components/ui";
import BrowserFrame from "./BrowserFrame";
import LaurisApp from "./lauris/LaurisApp";
import Panel from "./panel/Panel";
import { useStore } from "./store";
import "./tokens.css";
import "./panel/base.css";
import "./app.css";

/** The Lauris + extension tab: a browser window around the mock EHR with the Psyflo extension docked on its right. The Psyflo platform is the other tab (the first one in the frame). */
export default function LaurisShell() {
  const panelOpen = useStore((s) => s.panelOpen);
  return (
    <div className="shell" data-testid="lauris-shell">
      <BrowserFrame />
      <div className="shell-body">
        <div className="shell-ehr"><LaurisApp /></div>
        {panelOpen ? <aside className="shell-panel" aria-label="Psyflo extension"><Panel /></aside> : null}
      </div>
      <Toaster />
    </div>
  );
}
