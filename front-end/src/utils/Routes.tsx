// Routes.tsx
import { Route, Routes } from "react-router-dom";
// import { SignUpLogin } from "../components/SignUpLogIn";
import { UserHomePage } from "../components/Pages/UserHomePage";
import { CreatePost } from "../components/Pages/CreatePost";
import { Dashboard } from "../components/Pages/Dashboard";
import About from "../components/Pages/About/About";
import Features from "../components/Pages/Features";
import ContactUs from "../components/Pages/ContactUs";
import PrivacyPolicy from "../components/Pages/PrivacyPolicy";
import TermsOfService from "../components/Pages/TermsService";
import HelpSupport from "../components/Pages/HelpSupport";
import SplashPage from "../components/Pages/SplashPage";
import ViewCollection from "../components/Pages/ViewCollection";
import { PageNotFound } from "../components/Pages/ErrorPages/PageNotFound";
import { AccessDenied } from "../components/Pages/ErrorPages/AccessDenied";
import { ViewSharedPost } from "../components/Pages/ViewSharedPost";
import DeveloperDashboard from "../components/Pages/DeveloperDashboard";
import NotificationsPage from "../components/Pages/NotificationsPage";
import LoginForm from "../components/Pages/LoginForm";
// import SignupRequestForm from "../components/Auth/SignUpRequestForm";
import RequestAccessForm from "../components/Pages/RequestAccessForm";
import { Navigate } from "react-router-dom"; // add this import
import InviteAcceptForm from "../components/Pages/InviteAcceptForm";
import ViewPostByLink from "../components/Pages/ViewPostByLink";
import ResetPassword from "../components/Pages/ResetPassword";
import PricingPlans from "../components/Pages/PricingPlans";
import BillingDashboard from "../components/Pages/Billing/BillingDashboard";
import RequestSubmitted from "../components/Pages/RequestSubmitted";
import CompanyOnboardingAcceptForm from "../components/Pages/CompanyOnboardingAcceptForm";
import ProtectedRoute from "../components/ProtectedRoute";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-service" element={<TermsOfService />} />
      <Route path="/help-support" element={<HelpSupport />} />
      <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/sign-up-login" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<RequestAccessForm />} />
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
      <Route
        path="/view-shared-post/:postId/:token"
        element={<ViewSharedPost />}
      />
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

      <Route path="/view-post-by-link/:postId" element={<ViewPostByLink />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};
