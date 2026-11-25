import { HashRouter, MemoryRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Shell } from "@/components/layout";
import { EmptyState, Page, PageHeader } from "@/components/ui";
import { HOSTED } from "@/lib/hosted";
import { paths } from "@/routes";
import AnalyticsPage from "@/pages/analytics/AnalyticsPage";
import AuthorizationsPage from "@/pages/authorizations/AuthorizationsPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import BriefPage from "@/pages/denials/BriefPage";
import DenialPage from "@/pages/denials/DenialPage";
import DenialsPage from "@/pages/denials/DenialsPage";
import ReportPage from "@/pages/denials/ReportPage";
import EligibilityListPage from "@/pages/eligibility/EligibilityListPage";
import ResultPage from "@/pages/eligibility/ResultPage";
import VerifyPage from "@/pages/eligibility/VerifyPage";
import CaseRoute from "@/pages/manager/CaseRoute";
import ManagerRedirect from "@/pages/manager/ManagerRedirect";
import PayersPage from "@/pages/payers/PayersPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import LaurisShell from "@/ext/LaurisShell";
import { SearchX } from "lucide-react";

function NotFound() {
  return (
    <Page>
      <PageHeader title="Page not found" sub="That address is not part of the demo." />
      <EmptyState icon={SearchX} title="Nothing here">Use the sidebar to get back on track.</EmptyState>
    </Page>
  );
}

/** Hash routing keeps the single-file build working when opened straight from disk. The hosted preview runs in a frame that has no address bar of its own, so it keeps the route in memory. */
const Router = HOSTED ? MemoryRouter : HashRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Lauris is a different app in its own browser tab, with the Psyflo extension docked in it: it has none of the Psyflo shell. The demo opens here. */}
        <Route path="/lauris/*" element={<LaurisShell />} />
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/lauris" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/authorizations" element={<AuthorizationsPage />} />
          <Route path="/authorizations/case/:id" element={<CaseRoute />} />
          <Route path="/authorizations/eligibility" element={<EligibilityListPage />} />
          <Route path="/authorizations/eligibility/verify" element={<VerifyPage />} />
          <Route path="/authorizations/eligibility/:id" element={<ResultPage />} />
          <Route path="/denials" element={<DenialsPage />} />
          <Route path="/denials/:id" element={<DenialPage />} />
          <Route path="/denials/:id/brief" element={<BriefPage />} />
          <Route path="/denials/:id/report" element={<ReportPage />} />
          <Route path="/active" element={<ManagerRedirect />} />
          <Route path="/manager" element={<ManagerRedirect />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/payers" element={<PayersPage />} />
          <Route path="/payers/:id" element={<PayersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
