// import React from 'react';
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import "./about.css";

const About = () => {
  const navigate = useNavigate();

  const handleSignUpClick = () => {
    navigate("/sign-up-login");
  };

  return (
    <>
      <Helmet>
        <title>About Displaygram | Retail Display Management</title>
        <meta
          name="description"
          content="Discover Displaygram, the innovative platform for retail professionals. Manage and archive retail displays with ease, utilize location tagging, and enhance posts with rich descriptions. Join our community and streamline your display management today."
        />
      </Helmet>

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
        <div className="about-content">
          <h1>About Displaygram</h1>
          <p>
            Welcome to Displaygram.com - your premier solution for retail
            display management and archiving.
          </p>
          <div className="about-features">
            <h2>Key Features</h2>
            <ul>
              <li>
                <strong>Display Posting:</strong> Share and manage your retail
                displays with high-quality images.
              </li>
              <li>
                <strong>Location Tagging:</strong> Store locations are
                pinpointed with precision thanks to Google Maps integration.
              </li>
              <li>
                <strong>Rich Descriptions:</strong> Enhance your posts with
                detailed narratives and searchable hashtags.
              </li>
            </ul>
          </div>
          <div className="about-cta">
            <h2>Get Started</h2>
            <p>
              Join the community of retail professionals revolutionizing the way
              displays are managed.
            </p>
            <button className="cta-button" onClick={handleSignUpClick}>
              Create Your Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;
