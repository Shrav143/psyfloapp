import { HashRouter, MemoryRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Shell } from "@/components/layout";
import { EmptyState, Page, PageHeader } from "@/components/ui";
import { HOSTED } from "@/lib/hosted";
import { paths } from "@/routes";
import AnalyticsPage from "@/pages/analytics/AnalyticsPage";
import QueuePage from "@/pages/authorizations/QueuePage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import BriefPage from "@/pages/denials/BriefPage";
import DenialsPage from "@/pages/denials/DenialsPage";
import ReportPage from "@/pages/denials/ReportPage";
import EligibilityListPage from "@/pages/eligibility/EligibilityListPage";
import ResultPage from "@/pages/eligibility/ResultPage";
import VerifyPage from "@/pages/eligibility/VerifyPage";
import EmrPage from "@/pages/emr/EmrPage";
import CaseRoute from "@/pages/manager/CaseRoute";
import ManagerPage from "@/pages/manager/ManagerPage";
import NewCasePage from "@/pages/newcase/NewCasePage";
import PayersPage from "@/pages/payers/PayersPage";
import ReferralDetailPage from "@/pages/referrals/ReferralDetailPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import { SearchX } from "lucide-react";

function NotFound() {
  return (
    <Page>
      <PageHeader title="Page not found" sub="That address is not part of the demo." />
      <EmptyState icon={SearchX} title="Nothing here">Use the sidebar to get back on track.</EmptyState>
    </Page>
  );
}

/** Referrals used to have their own tab. Old links land on the referral inside New case. */
function OldReferralLink() {
  const { id = "" } = useParams();
  return <Navigate to={paths.referral(id)} replace />;
}

/** Hash routing keeps the single-file build working when opened straight from disk. The hosted preview runs in a frame that has no address bar of its own, so it keeps the route in memory. */
const Router = HOSTED ? MemoryRouter : HashRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/referrals" element={<Navigate to={paths.referrals()} replace />} />
          <Route path="/referrals/:id" element={<OldReferralLink />} />
          <Route path="/authorizations" element={<QueuePage />} />
          <Route path="/authorizations/case/:id" element={<CaseRoute />} />
          <Route path="/authorizations/new" element={<NewCasePage />} />
          <Route path="/authorizations/new/referral/:id" element={<ReferralDetailPage />} />
          <Route path="/authorizations/new/:draftId" element={<NewCasePage />} />
          <Route path="/authorizations/eligibility" element={<EligibilityListPage />} />
          <Route path="/authorizations/eligibility/verify" element={<VerifyPage />} />
          <Route path="/authorizations/eligibility/:id" element={<ResultPage />} />
          <Route path="/denials" element={<DenialsPage />} />
          <Route path="/denials/:id/brief" element={<BriefPage />} />
          <Route path="/denials/:id/report" element={<ReportPage />} />
          <Route path="/active" element={<Navigate to="/manager" replace />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/emr" element={<EmrPage />} />
          <Route path="/payers" element={<PayersPage />} />
          <Route path="/payers/:id" element={<PayersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
