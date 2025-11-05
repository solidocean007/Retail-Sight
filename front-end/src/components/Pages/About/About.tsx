// import React from 'react';
import { useNavigate } from "react-router-dom";
import "./about.css";
import { AboutPageHelmet } from "../../../utils/helmetConfigurations";

const About = () => {
  const navigate = useNavigate();

  const handleSignUpClick = () => {
    navigate("/signup");
  };

  return (
    <>
      <AboutPageHelmet />

      <div className="about-container">
        <nav className="about-navigation">
          <button
            className="nav-button"
            onClick={() => navigate("/user-home-page")}
          >
            Home
          </button>
          <button className="cta-button" onClick={handleSignUpClick}>
            Sign Up
          </button>
        </nav>
        <section className="about-content">
          <h1>What Is Displaygram?</h1>
          <p>
            Displaygram is a modern platform built to streamline{" "}
            <strong>retail display execution</strong>,
            <strong> photo archiving</strong>, and{" "}
            <strong>brand collaboration</strong>. Designed for distributors,
            suppliers, and field teams, it turns your retail successes into a
            shareable, trackable, and searchable library of results.
          </p>

          <p>
            Whether you're capturing a great beer stack, verifying a new wine
            set, or checking planogram compliance — Displaygram makes it easy to{" "}
            <strong>
              submit photos, document execution, assign tasks, and track goals
            </strong>
            .
          </p>

          <h2>What Makes Displaygram Different?</h2>
          <ul>
            <li>
              <strong>📸 Photo Archiving with Context:</strong> Every display
              submission is geo-tagged, timestamped, and linked to a specific
              product, store, and brand goal.
            </li>
            <li>
              <strong>✅ Field Accountability:</strong> Managers can review,
              grade, and comment on submissions. Know what’s happening in real
              time.
            </li>
            <li>
              <strong>🎯 Brand-Aligned Goals:</strong> Import supplier programs
              or create your own initiatives to guide field focus and track
              progress.
            </li>
            <li>
              <strong>🔐 Smart Visibility Controls:</strong> Posts can be shared
              within your company, across supplier-distributor relationships, or
              kept private.
            </li>
          </ul>

          <h2>Built for Distributors and Suppliers</h2>
          <p>
            Whether you’re a beer rep, a sales manager, or a supplier partner —
            Displaygram helps your team{" "}
            <strong>
              stay aligned, celebrate wins, and drive in-store performance
            </strong>
            . Field reps gain clarity on what’s expected. Admins and suppliers
            gain visibility and proof of execution.
          </p>

          <aside className="about-cta">
            <h2>Start Your Archive Today</h2>
            <p>
              Sign up for free and start capturing your retail success. Join
              your team or request access to unlock full visibility and
              collaboration.
            </p>
            <button className="cta-button" onClick={handleSignUpClick}>
              Create Your Account
            </button>
          </aside>
        </section>
      </div>
    </>
  );
};

export default About;
