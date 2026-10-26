// Routes.tsx
import { Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { lazy, Suspense } from "react";
import AppLoadingScreen from "../components/AppLoadingScreen";
import { useSelector } from "react-redux/es/hooks/useSelector";
import { RootState } from "./store";

const PricingPlans = lazy(() => import("../components/Pages/PricingPlans"));
const Features = lazy(() => import("../components/Pages/Features"));
const LoginForm = lazy(() => import("../components/Pages/LoginForm"));
const SmartLanding = lazy(() => import("../components/SmartLanding"));
const SplashPage = lazy(() => import("../components/Pages/SplashPage"));
const About = lazy(() => import("../components/Pages/About/About"));
const ContactUs = lazy(() => import("../components/Pages/ContactUs"));
const PrivacyPolicy = lazy(() => import("../components/Pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../components/Pages/TermsService"));
const CookiesPolicy = lazy(() => import("../components/Pages/CookiesPolicy"));
const HelpSupport = lazy(() => import("../components/Pages/HelpSupport"));
const RequestAccessForm = lazy(
  () => import("../components/Pages/RequestAccessForm"),
);
const RequestSubmitted = lazy(
  () => import("../components/Pages/RequestSubmitted"),
);
const InviteAcceptForm = lazy(
  () => import("../components/Pages/InviteAcceptForm"),
);
const ResetPassword = lazy(
  () => import("../components/Pages/ResetPassword"),
);
const CompanyOnboardingAcceptForm = lazy(
  () => import("../components/Pages/CompanyOnboardingAcceptForm"),
);
const ViewCollection = lazy(
  () => import("../components/Pages/ViewCollection"),
);
const PostViewer = lazy(() => import("../components/Pages/PostViewer"));
const PublicPostViewer = lazy(
  () => import("../components/Pages/ViewPostByLink"),
);
const PageNotFound = lazy(
  () => import("../components/Pages/ErrorPages/PageNotFound"),
);
const AccessDenied = lazy(
  () => import("../components/Pages/ErrorPages/AccessDenied"),
);
const UserHomePage = lazy(() => import("../components/Pages/UserHomePage"));
const Dashboard = lazy(() => import("../components/Pages/Dashboard"));
const CreatePost = lazy(() => import("../components/Pages/CreatePost"));
const BillingDashboard = lazy(
  () => import("../components/Pages/Billing/BillingDashboard"),
);
const DeveloperDashboard = lazy(
  () => import("../components/Pages/DeveloperDashboard"),
);
const NotificationsPage = lazy(
  () => import("../components/Pages/NotificationsPage"),
);

export const AppRoutes = () => {
  const isImpersonating = useSelector((s: RootState) => s.impersonation.active);
  return (
    <Suspense fallback={<AppLoadingScreen show message="Loading page…" />}>
      <Routes>
        <Route path="/" element={<SmartLanding />} />
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-service" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiesPolicy />} />
        <Route path="/help-support" element={<HelpSupport />} />
        <Route
          path="/developer-dashboard"
          element={
            <ProtectedRoute>
              {isImpersonating ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <DeveloperDashboard />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sign-up-login"
          element={<Navigate to="/login" replace />}
        />
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/signup"
          element={<Navigate to="/request-access" replace />}
        />
        <Route path="/request-access" element={<RequestAccessForm />} />
        <Route path="/request-submitted" element={<RequestSubmitted />} />
        <Route
          path="/accept-invite/:companyId/:inviteId"
          element={<InviteAcceptForm />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<PricingPlans />} />
        <Route
          path="/view-collection/:collectionId"
          element={<ViewCollection />}
        />
        <Route path="/post/:postId" element={<PostViewer />} />
        <Route
          path="/user-home-page"
          element={
            <ProtectedRoute>
              <UserHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-post"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/onboard-company/:companyId/:inviteId"
          element={<CompanyOnboardingAcceptForm />}
        />
        <Route
          path="/new-company-invite/:inviteId"
          element={<RequestAccessForm inviteMode={true} />}
        />

        <Route path="/p/:postId" element={<PublicPostViewer />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};
