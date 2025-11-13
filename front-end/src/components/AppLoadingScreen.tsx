// components/AppLoadingScreen.tsx
import React from "react";
import "./appLoadingScreen.css";
// import logo from "../assets/displaygram-logo.png"; // ⬅ Replace with your actual path after adding to project

type Props = {
  message?: string;
};

export default function AppLoadingScreen({ message = "Loading…" }: Props) {
  return (
    <div className="app-loading-container fade-in">
      <div className="app-loading-card">
        {/* <img src={logo} alt="Displaygram" className="loading-logo-img" /> */}

        <div className="loading-message">{message}</div>

        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>
    </div>
  );
}
