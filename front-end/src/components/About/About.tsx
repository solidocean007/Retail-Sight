// import React from 'react';
import { useNavigate } from "react-router-dom";
import "./about.css";
import { AboutPageHelmet } from "../../utils/helmetConfigurations";

const About = () => {
  const navigate = useNavigate();

  const handleSignUpClick = () => {
    navigate("/sign-up-login");
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
          <h1>The Objective</h1>
          <p>
            At Displaygram, we're driven by a singular mission: to empower
            retail professionals with a state-of-the-art platform for managing,
            sharing, and optimizing retail displays. Our platform is
            meticulously crafted to transform how retail businesses visualize
            success and bring their products to life.
          </p>
          <p>
            From the bustling city storefronts to the intimate boutique shops,
            Displaygram offers an unparalleled toolset designed to amplify your
            display's impact. We believe in the power of visual storytelling,
            and our platform is your canvas for creating immersive and engaging
            retail experiences.
          </p>
          <p>
            Every feature, from our intuitive interface to our robust analytics,
            is engineered with your needs in mind. Whether you're a seasoned
            merchandiser or new to the world of retail, Displaygram is your
            partner in crafting displays that not only capture attention but
            also drive results.
          </p>
          <article className="about-features">
            <h2>Why Displaygram?</h2>
            <ul>
              <li>
                <strong>Collaborative Environment:</strong> Build a community
                with fellow merchandisers, share insights, and learn from the
                best practices of industry leaders.
              </li>
              {/* <li>
                <strong>Advanced Analytics:</strong> Measure the performance of your displays with actionable data that helps refine your approach and strategy.
              </li> */}
              <li>
                <strong>Seamless Archiving:</strong> Keep a detailed history of
                your displays, ensuring that your hard work is preserved and can
                be referenced at any time.
              </li>
            </ul>
          </article>
          <aside className="about-cta">
            <h2>Join Our Vision</h2>
            <p>
              Embrace the future of retail display management with Displaygram.
              Join a community that's reshaping the industry and setting new
              standards for excellence.
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
