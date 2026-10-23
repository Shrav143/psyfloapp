import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes, useSearchParams } from "react-router-dom";
import "./index.css";
import { Toaster } from "@/components/ui";
import { SEED_WORKFLOWS, SEED_WORKFLOW_VERSIONS } from "@/data/workflow/seeds";
import { useStore } from "@/store";
import { TestWorkflowTab, WorkflowBuilderTab } from "@/pages/payers/studio";

useStore.setState({ workflows: SEED_WORKFLOWS, workflowVersions: SEED_WORKFLOW_VERSIONS });

function Page() {
  const [p] = useSearchParams();
  return (
    <div className="mx-auto w-[1128px]">
      <div id="payer-panel">{p.get("tab") === "test" ? <TestWorkflowTab payerId="summit" /> : <WorkflowBuilderTab payerId="summit" />}</div>
      <Toaster />
    </div>
  );
}
createRoot(document.getElementById("root") as HTMLElement).render(
  <HashRouter>
    <Routes>
      <Route path="*" element={<Page />} />
    </Routes>
  </HashRouter>,
);
