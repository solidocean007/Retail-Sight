import { useNavigate } from "react-router-dom";
import "./about.css";
import { AboutPageHelmet } from "../../../utils/helmetConfigurations";
import { useEffect } from "react";

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.setAttribute("data-page", "about");
    return () => document.body.removeAttribute("data-page");
  }, []);

  return (
    <>
      <AboutPageHelmet />

      <div className="about-page free-scroll-page">
        <div className="about-panel">
          <section className="about-hero">
            <h1 className="about-title">
              Built for the people who build retail.
            </h1>
            <p className="about-subtitle">
              Displaygram helps distributors, suppliers, and field teams
              capture, organize, and share retail execution — without the
              clutter of photos, texts, and email chains.
            </p>
          </section>

          <section className="about-section">
            <h2>Our Purpose</h2>
            <p>
              Retail execution is one of the most important — and least
              supported — parts of the beverage industry.
            </p>
            <p>
              Displaygram brings structure and clarity to field execution,
              giving teams a clear, searchable history of their work.
            </p>
          </section>

          <section className="about-section">
            <h2>Why Displaygram Exists</h2>
            <p>
              After years in distribution and supplier roles, our founder saw
              firsthand how scattered workflows slowed teams down.
            </p>
            <p>
              Displaygram was created to solve that with one idea:{" "}
              <strong>make execution visible, organized, and connected.</strong>
            </p>
          </section>

          <section className="about-section">
            <h2>What We Believe</h2>
            <ul className="about-values">
              <li>
                <strong>Clarity beats clutter.</strong> Information should be
                easy to find and share.
              </li>
              <li>
                <strong>Execution deserves visibility.</strong> Wins shouldn't
                disappear into camera rolls.
              </li>
              <li>
                <strong>Suppliers and distributors should collaborate.</strong>
              </li>
              <li>
                <strong>Tools should be simple.</strong> If it isn't easy to use
                in a store, it isn't useful.
              </li>
            </ul>
          </section>

          <section className="about-footer-cta">
            <p>Ready to see your team’s execution come together?</p>
            <button className="cta-button" onClick={() => navigate("/signup")}>
              Create an Account
            </button>
          </section>
        </div>
      </div>
    </>
  );
};

export default About;
