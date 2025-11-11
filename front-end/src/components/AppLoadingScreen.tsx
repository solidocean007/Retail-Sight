// components/AppLoadingScreen.tsx
import React from "react";
import "./appLoadingScreen.css";

export default function AppLoadingScreen() {
  return (
    <div className="app-loading-screen">
      <div className="loading-logo">Displaygram</div>
      <div className="loading-text">Syncing your data…</div>
    </div>
  );
}
