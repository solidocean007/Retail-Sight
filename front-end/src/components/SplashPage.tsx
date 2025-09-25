// SplashPage.tsx
import { useNavigate } from "react-router-dom";
import "./splashPage.css"; // Make sure this reflects the styles below
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { Link } from "react-router-dom";
import { SplashPageHelmet } from "../utils/helmetConfigurations";

const SplashPage = () => {
  const user = useSelector(selectUser);
  const authLoaded = user !== undefined;
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoaded && user) navigate("/user-home-page");
  }, [authLoaded, user, navigate]);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  const handleAnchor = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; // adjust for your sticky nav height
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
    if (!el) {
      window.location.hash = id;
      return;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 750 && isMenuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMenuOpen]);

  return (
    <>
      <SplashPageHelmet />
      <nav className="top-nav">
        <div className="logo-box">
          <Link to="/">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fdisplaygramlogo.svg?alt=media&token=991cea53-8831-422b-b9cd-2a308040d7bd"
              alt="Displaygram logo"
              width={140}
              height={40}
              decoding="async"
              loading="eager"
            />
            <span className="brand">Displaygram</span>
          </Link>
        </div>
        <div className="navbar">
          <ul id="splash-nav" className={isMenuOpen ? "isMenuOpen" : ""}>
            <li>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            </li>
            <li>
              <a href="#objective" onClick={handleAnchor("objective")}>
                Objective
              </a>
            </li>
            <li>
              <a href="#features" onClick={handleAnchor("features")}>
                Features
              </a>
            </li>
            <li>
              <a href="#pricing" onClick={handleAnchor("pricing")}>
                Pricing
              </a>
            </li>
            <li>
              <a href="#security" onClick={handleAnchor("security")}>
                Security
              </a>
            </li>
          </ul>
        </div>

        <div className="splash-menu-button">
          <button
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="splash-nav"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      <div className="splash-container">
        <main className="splash-main">
          <section className="first-section">
            <div className="first-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2FabstractImageinsert.png?alt=media&token=2951defe-f44f-425c-b9f9-4c6cd8edbd60"
                alt="abstract retail"
                width={720}
                height={480} // any consistent pair that matches your design ratio
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="first-content">
              <hgroup>
                <h2>Welcome to Displaygram</h2>
                <h3>Discover and share retail success.</h3>
              </hgroup>
              <p>
                Our platform revolutionizes how retail teams, suppliers, and
                networks exchange merchandising success. Skip the clutter of
                texts and emails; quickly archive and replicate winning store
                displays at no cost. Your digital portfolio for retail
                excellence – accessible anytime, by your whole team.
              </p>
              <div className="content-button-box">
                <Link to="/request-access" className="enter-site-btn">
                  Start Now
                </Link>
              </div>
            </div>
          </section>

          <section id="objective" className="second-section">
            <div className="second-content">
              <h3>The Objective</h3>
              <p>
                Displaygram helps teams{" "}
                <strong>capture, archive, and evaluate</strong> retail
                execution. Field reps upload photos of store displays along with
                product details, location, and timing — creating a permanent
                visual history your entire team can learn from.
              </p>
              <p>
                Managers and suppliers can <strong>grade performance</strong>,{" "}
                <strong>assign tasks</strong>, and{" "}
                <strong>track goal completion</strong> in real time. Whether
                it’s verifying planogram compliance, launching promotional sets,
                or simply celebrating great work — Displaygram makes execution
                visible and actionable.
              </p>
              <p>
                Keep submissions private to your company, or share highlights
                across your brand network using tags and connections. You’re in
                control.
              </p>

              <div className="content-button-box">
                <Link to="/about" className="enter-site-btn">
                  Learn More
                </Link>
              </div>
            </div>
            <div className="second-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-line-drawing-edited_200x200.png?alt=media&token=055681ef-0cd1-4049-9dd5-57d935e30b6b"
                alt="grocery line drawing"
              />
            </div>
          </section>

          <section id="features" className="section-three">
            <div className="hero-content-left">
              <div className="features-image-box">
                <img
                  className="features-image"
                  // src="https://images.unsplash.com/photo-1563906267088-b029e7101114?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-products.jpg?alt=media&token=67eb96e6-1a55-482d-92c3-5b3901ce4b3e"
                  alt="grocery products"
                  width={1200}
                  height={800} // any consistent pair that matches your design ratio
                  loading="lazy"
                  decoding="async"
                />
                <Link to="/features" className="features-button enter-site-btn">
                  See Our Features
                </Link>
              </div>
            </div>
            <div className="hero-content-right features-text-box">
              <h3>Features</h3>
              <p>
                Find displays that matter to you. Our intuitive filters allow
                you to search by location, retail channel, or product category.
                Whatever you are looking for, find exactly what you need — from
                beer to bread and everything in between.
              </p>
            </div>
          </section>

          <section className="hero-content hero-full fourth-block" id="pricing">
            <div className="hero-content-left fourth-insert">
              <h3>Get Started Instantly - or Request Full Access</h3>
              <p>
                Displaygram is <strong>free to explore</strong> for all
                companies with limited access.
              </p>
              <ul>
                <li>✔️ Sign up instantly — no credit card required</li>
                <li>✔️ Create and view posts within your company</li>
                <li>🔒 Request verification to unlock:</li>
                <ul>
                  <li>– Cross-company visibility</li>
                  <li>– Goal tracking</li>
                  <li>– Supplier-distributor collaboration</li>
                </ul>
              </ul>

              <div className="content-button-box">
                <Link to="/request-access" className="enter-site-btn">
                  Join for free
                </Link>
              </div>
            </div>
          </section>

          <section id="security" className="fifth-section">
            <div className="fifth-content">
              <h3>Security and Compliance</h3>
              <p>
                Your security is our priority. Passwords are protected by
                Firebase, Google's trusted authentication service. Images are
                securely stored in Firebase Storage, ensuring your data rests on
                reliable, world-class infrastructure.
              </p>
              <div className="content-button-box">
                <Link to="/request-access" className="enter-site-btn">
                  Sign Up Now
                </Link>
              </div>
            </div>
            <div className="fifth-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fearthdesign.png?alt=media&token=65c60866-6c35-4587-997b-a07042b900df"
                alt="secure earth"
                width={600}
                height={600}
                loading="lazy"
                decoding="async"
              />
            </div>
          </section>

          <section className="last-block">
            <div className="last-block">
              <h3>Start Now</h3>
              <p>
                Elevate your team’s performance, share your retail story today.
              </p>
              <div className="content-button-box">
                <Link to="/request-access" className="enter-site-btn">
                  Sign Up Now
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default SplashPage;
