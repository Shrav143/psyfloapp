import "./app.css";
import BrowserFrame from "./BrowserFrame";
import LaurisApp from "./lauris/LaurisApp";
import Panel from "./panel/Panel";
import { useStore } from "./store";

export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);
  return (
    <div className="shell">
      <BrowserFrame />
      <div className="shell-body">
        <div className="shell-ehr"><LaurisApp /></div>
        {panelOpen ? <aside className="shell-panel" aria-label="Psyflo extension"><Panel /></aside> : null}
      </div>
    </div>
  );
}
