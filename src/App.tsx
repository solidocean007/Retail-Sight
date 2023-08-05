import { useState } from "react";
import "./App.css";
import { SignUpLogin } from "./components/SignUpLogIn";
import { TUserInformation } from "./utils/types";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import UserProfilePage from "./components/UserProfilePage";

function App() {
  const [profileData, setProfileData] = useState<TUserInformation | null>(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUpLogin setProfileData={setProfileData} />} />
        <Route path="/profile-page" element={<UserProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;

