import { useState } from "react";
import "./App.css";
import { SignUpLogin } from "./components/SignUpLogIn";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { UserHomePage } from "./components/UserHomePage";
import {UserProfilePage} from "./components/UserProfilePage";
import { CreatePost } from "./components/CreatePost";



function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUpLogin />} />
        <Route path="/profile-page" element={<UserProfilePage />} />
        <Route path="/userHomePage" element={<UserHomePage />} />
        <Route path="/createPost" element={<CreatePost />} />
      </Routes>
    </Router>
  );
}

export default App;

