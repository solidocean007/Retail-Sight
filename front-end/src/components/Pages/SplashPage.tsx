// SplashPage.tsx — modern, clean, mobile-first, dark-mode-only splash
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useEffect, useState } from "react";
import { SplashPageHelmet } from "../../utils/helmetConfigurations";
import "./splashPage.css";

const SplashPage = () => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileLogo, setIsMobileLogo] = useState(false);

  /* --------------------------------------
     Redirect authenticated users
  --------------------------------------- */
  useEffect(() => {
    if (user) navigate("/user-home-page");
  }, [user, navigate]);

  /* --------------------------------------
     Detect small screens for logo swap
  --------------------------------------- */
  useEffect(() => {
    const check = () => setIsMobileLogo(window.innerWidth <= 520);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* --------------------------------------
     Fade-in intersection animations
  --------------------------------------- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
  }, []);

  return (
    <>
      <SplashPageHelmet />

      {/* HEADER */}
      <header className="splash-header">
        <Link to="/" className="brand-link">
          <img
            src={
              isMobileLogo
                ? "/icons/icon-512-maskable.png"
                : "/displaygram-logo-long-BLUE.svg"
            }
            alt="Displaygram"
            className="brand-logo"
          />
        </Link>

        <button
          className="splash-header__menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={`splash-nav ${menuOpen ? "open" : ""}`}>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
          <a href="#objective" onClick={() => setMenuOpen(false)}>Objective</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="splash">

        {/* HERO */}
        <section className="hero section fade-in">
          <div className="hero__text">
            <p className="hero-kicker">
              Retail Execution • Display Tracking • Collaboration
            </p>

            <h1>Discover and share retail success.</h1>

            <p>
              Capture displays, tag stores, and instantly share results with your
              team and trusted partners — without the clutter of group texts or
              email chains.
            </p>

            <Link to="/request-access" className="btn-primary hero__cta">
              Start Now
            </Link>
          </div>

          <div className="hero__image">
            <img
              src="/splash/hero.png"
              alt="Retail illustration"
              loading="lazy"
            />
          </div>
        </section>

        {/* OBJECTIVE */}
        <section id="objective" className="section fade-in">
          <div className="section__text">
            <h2>The Objective</h2>
            <p>
              Displaygram helps teams <strong>capture, archive, and evaluate</strong>{" "}
              retail execution. Field reps upload photos tied to the correct
              account, brand, and timing — creating a visual history your entire
              team can learn from.
            </p>

            <p>
              Managers and suppliers can track completion, verify execution, and
              celebrate great work in real time — all in one place.
            </p>
          </div>

          <div className="section__image">
            <img
              src="/splash/objective.png"
              alt="Objective Illustration"
              loading="lazy"
            />
          </div>
        </section>

        {/* FEATURES PREVIEW */}
        <section id="features" className="section fade-in features-preview">
          <div className="section__image">
            <img
              src="/splash/features.png"
              alt="Features Overview"
              loading="lazy"
            />
          </div>

          <div className="section__text">
            <h2>Features</h2>

            <p>
              Filter displays by store, category, brand, or rep. Find the work
              that matters most — whether you're a distributor, supplier partner,
              or manager.
            </p>

            <Link to="/features" className="btn-secondary">
              Explore Features
            </Link>
          </div>
        </section>

        {/* PRICING PREVIEW */}
        {/* <section id="pricing" className="section fade-in pricing-preview"> */}
        <section id="pricing" className="fade-in pricing-preview">
          <h2>Get Started Free — Upgrade Anytime</h2>

          <div className="pricing-columns">
            <div className="pricing-col">
              <p>
                Displaygram is <strong>free to explore</strong> with limited
                access. Unlock advanced features when your team is ready.
              </p>
            </div>

            <div className="pricing-col">
              <ul className="pricing-preview__list">
                <li>✔ Create & view posts in your company</li>
                <li>✔ No credit card required</li>
                <li>🔒 Cross-company visibility</li>
                <li>🔒 Goal tracking & execution insights</li>
              </ul>
            </div>

            <div className="pricing-col"></div>
          </div>

          <Link to="/pricing" className="btn-primary pricing-cta">
            View Plans & Pricing
          </Link>
        </section>

        {/* SECURITY */}
        <section id="security" className="section fade-in">
          <div className="section__text">
            <h2>Security & Compliance</h2>

            <p>
              Displaygram is built on secure Firebase authentication and cloud
              infrastructure. Images and data are stored safely and reliably using
              industry-standard encryption.
            </p>

            <Link to="/request-access" className="btn-secondary">
              Sign Up Now
            </Link>
          </div>

          <div className="section__image">
            <img
              src="/splash/security.png"
              alt="Security Illustration"
              loading="lazy"
            />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section fade-in final-cta">
          <h2>Ready to get started?</h2>
          <p>Unlock clearer retail execution today.</p>

          <Link to="/request-access" className="btn-primary">
            Sign Up Now
          </Link>
        </section>

      </main>
    </>
  );
};

export default SplashPage;
