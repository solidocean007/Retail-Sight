// Routes.tsx
import { Route, Routes } from "react-router-dom";
// import { SignUpLogin } from "../components/SignUpLogIn";
import { UserHomePage } from "../components/UserHomePage";
import { CreatePost } from "../components/Create-Post/CreatePost";
import { Dashboard } from "../components/Dashboard";
import About from "../components/About/About";
import Features from "../components/Features";
import ContactUs from "../components/ContactUs";
import PrivacyPolicy from "../components/PrivacyPolicy";
import TermsOfService from "../components/TermsService";
import HelpSupport from "../components/HelpSupport";
import SplashPage from "../components/SplashPage";
import ViewCollection from "../components/ViewCollection";
import { PageNotFound } from "../components/ErrorPages/PageNotFound";
import { AccessDenied } from "../components/ErrorPages/AccessDenied";
import { ViewSharedPost } from "../components/ViewSharedPost";
import DeveloperDashboard from "../components/DeveloperDashboard/DeveloperDashboard";
import NotificationsPage from "../components/NotificationsPage";
import LoginForm from "../components/Auth/LoginForm";
// import SignupRequestForm from "../components/Auth/SignUpRequestForm";
import RequestAccessForm from "../components/Auth/RequestAccessForm";
import { Navigate } from "react-router-dom"; // add this import
import InviteAcceptForm from "../components/Auth/InviteAcceptForm";
import ViewPostByLink from "../components/ViewPostByLink";
import ResetPassword from "../components/Auth/ResetPassword";

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
      <Route path="/accept-invite/:companyId/:inviteId" element={<InviteAcceptForm />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/user-home-page" element={<UserHomePage />} />
      <Route path="/create-post" element={<CreatePost />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route
        path="/view-collection/:collectionId"
        element={<ViewCollection />}
      />
      <Route path="/view-shared-post/:postId/:token" element={<ViewSharedPost />} />
      <Route path="/view-post-by-link/:postId" element={<ViewPostByLink />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};
