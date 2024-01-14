// Routes.tsx
import { Route, Routes } from "react-router-dom";
import { SignUpLogin } from "../components/SignUpLogIn";
import { UserHomePage } from "../components/UserHomePage";
import { UserProfilePage } from "../components/UserProfilePage";
import { CreatePost } from "../components/CreatePost";
import { Dashboard } from "../components/Dashboard";
import DeveloperDashboard from "../components/DeveloperDashboard";
import About from "../components/Abouts";
import ContactUs from "./ContactUs";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsService";
import HelpSupport from "../components/HelpSupport";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/about" element={<About />} />
      <Route path="/contact-us" element={<ContactUs />}/>
      <Route path="/privacy-policy" element={<PrivacyPolicy />}/>
      <Route path="/terms-service" element={<TermsOfService />}/>
      <Route path="/help-support" element={<HelpSupport />}/>
      {/* add a privacy and security page  */}
      <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
      <Route path="/sign-up-login" element={<SignUpLogin />} />
      <Route path="/" element={<UserHomePage />} />
      <Route path="/profile-page" element={<UserProfilePage />} />
      <Route path="/createPost" element={<CreatePost />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};
