// Routes.tsx
import { Route, Routes } from "react-router-dom";
import { SignUpLogin } from "../components/SignUpLogIn";
import { UserHomePage } from "../components/UserHomePage";
import { UserProfilePage } from "../components/UserProfilePage";
import { CreatePost } from "../components/CreatePost";
import { Dashboard } from "../components/Dashboard";
import DeveloperDashboard from "../components/DeveloperDashboard";
import About from "../components/Abouts";
import Features from "../components/Features";
import ContactUs from "./ContactUs";
import PrivacyPolicy from "../components/PrivacyPolicy";
import TermsOfService from "../components/TermsService";
import HelpSupport from "../components/HelpSupport";
import SplashPage from "../components/SplashPage";
import TutorialPage from "../components/TutorialPage";


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
    </Routes>
  );
};
