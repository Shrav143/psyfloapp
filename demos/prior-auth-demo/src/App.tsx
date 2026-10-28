import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
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
import EmrPage from "@/pages/emr/EmrPage";
import HelpPage from "@/pages/help/HelpPage";
import ActiveIntakesPage from "@/pages/intake/ActiveIntakesPage";
import AssessmentsPage from "@/pages/intake/AssessmentsPage";
import ConfigurePage from "@/pages/intake/configure/ConfigurePage";
import CoordinationPage from "@/pages/intake/CoordinationPage";
import CreateReferralPage from "@/pages/intake/create/CreateReferralPage";
import IntakePage from "@/pages/intake/IntakePage";
import NewClinicalIntakePage from "@/pages/intake/configure/NewClinicalIntakePage";
import IntakeRecordPage from "@/pages/intake/IntakeRecordPage";
import CaseRoute from "@/pages/manager/CaseRoute";
import ManagerRedirect from "@/pages/manager/ManagerRedirect";
import NewCasePage from "@/pages/newcase/NewCasePage";
import PayersPage from "@/pages/payers/PayersPage";
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

/** Referrals used to have their own tab. Old links land on the referral inside New Authorization. */

/** Links from before a referral had its own place in Referrals & Intake land on the intake made from it. */
function OldReferralLink() {
  const { id = "" } = useParams();
  return <Navigate to={paths.referral(id)} replace />;
}

/** The older /authorizations/intake addresses (round 9) open the same page under /intake, with the same query. */
function KeepSearch({ to, withId }: { to: string; withId?: boolean }) {
  const { id = "" } = useParams();
  const { search } = useLocation();
  return <Navigate to={`${to}${withId ? `/${id}` : ""}${search}`} replace />;
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
          <Route path="/authorizations" element={<AuthorizationsPage />} />
          <Route path="/authorizations/case/:id" element={<CaseRoute />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/intake/active" element={<ActiveIntakesPage />} />
          <Route path="/intake/assessments" element={<AssessmentsPage />} />
          <Route path="/intake/coordination" element={<CoordinationPage />} />
          <Route path="/intake/new" element={<CreateReferralPage />} />
          <Route path="/intake/start" element={<NewClinicalIntakePage />} />
          <Route path="/intake/:id/configure" element={<ConfigurePage />} />
          <Route path="/intake/:id" element={<IntakeRecordPage />} />
          <Route path="/authorizations/intake" element={<KeepSearch to="/intake" />} />
          <Route path="/authorizations/intake/:id" element={<KeepSearch to="/intake" withId />} />
          <Route path="/authorizations/new" element={<NewCasePage />} />
          <Route path="/authorizations/new/referral/:id" element={<OldReferralLink />} />
          <Route path="/authorizations/new/:draftId" element={<NewCasePage />} />
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
          <Route path="/emr" element={<EmrPage />} />
          <Route path="/payers" element={<PayersPage />} />
          <Route path="/payers/:id" element={<PayersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
