// Routes.tsx
import { Route, Routes } from "react-router-dom";
import { SignUpLogin } from "../components/SignUpLogIn";
import { UserHomePage } from "../components/UserHomePage";
import { UserProfilePage } from "../components/UserProfilePage";
import { CreatePost } from "../components/Create-Post/CreatePost";
import { Dashboard } from "../components/Dashboard";
import DeveloperDashboard from "../components/DeveloperDashboard";
import About from "../components/About/About";
import Features from "../components/Features";
import ContactUs from "../components/ContactUs";
import PrivacyPolicy from "../components/PrivacyPolicy";
import TermsOfService from "../components/TermsService";
import HelpSupport from "../components/HelpSupport";
import SplashPage from "../components/SplashPage";
import TutorialPage from "../components/TutorialPage";
import CollectionsPage from "../components/CollectionsPage";
import { ViewCollection } from "../components/ViewCollection";
import { PageNotFound } from "../components/ErrorPages/PageNotFound";
import { AccessDenied } from "../components/ErrorPages/AccessDenied";
import { ViewSharedPost } from "../components/ViewSharedPost";


export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />}/>
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact-us" element={<ContactUs />}/>
      <Route path="/privacy-policy" element={<PrivacyPolicy />}/>
      <Route path="/terms-service" element={<TermsOfService />}/>
      <Route path="/help-support" element={<HelpSupport />}/>
      <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
      <Route path="/sign-up-login" element={<SignUpLogin />} />
      <Route path="user-home-page" element={<UserHomePage />} />
      <Route path="/profile-page" element={<UserProfilePage />} />
      <Route path="/createPost" element={<CreatePost />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tutorial" element={<TutorialPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/view-collection/:collectionId" element={<ViewCollection />} />
      <Route path="/view-shared-post" element={<ViewSharedPost />} />
      <Route path="/access-denied" element={<AccessDenied/>}/>
      <Route path="/page-not-found" element={<PageNotFound/>} />
    </Routes>
  );
};
