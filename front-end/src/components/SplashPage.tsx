// SplashPage.tsx
import { useNavigate } from "react-router-dom";
import "./splashPage.css"; // Make sure this reflects the styles below
import { MutableRefObject, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { SplashPageHelmet } from "../utils/helmetConfigurations";

const SplashPage = () => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const numberOfSections = 6;
  const sectionRefs = Array.from({ length: numberOfSections }, () =>
    useRef<HTMLElement | null>(null),
  );

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  const scrollToRef = (index: number) => {
    sectionRefs[index].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // skip this page if a user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/user-home-page");
    }
  }, [user, navigate]);

  return (
    <>
      <SplashPageHelmet />

      <div className="splash-container">
        <nav className="top-nav">
          <div className="logo-box">
            <Link to="/">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fdisplaygramlogo.svg?alt=media&token=991cea53-8831-422b-b9cd-2a308040d7bd"
                alt="blue-background"
              />
              <h1>Displaygram</h1>
            </Link>
          </div>
          <div className="navbar">
            <ul className={isMenuOpen ? "isMenuOpen" : ""}>
              <li
                onClick={() => {
                  // handleLoginClick();
                  navigate("/sign-up-login");
                }}
              >
                Login
              </li>
              <li
                onClick={() => {
                  toggleMenu();
                  scrollToRef(1);
                }}
              >
                The Objective
              </li>
              <li
                onClick={() => {
                  toggleMenu();
                  scrollToRef(2);
                }}
              >
                Features
              </li>
              <li
                onClick={() => {
                  toggleMenu();
                  scrollToRef(3);
                }}
              >
                Pricing
              </li>
              <li
                onClick={() => {
                  toggleMenu();
                  scrollToRef(4);
                }}
              >
                Security
              </li>
            </ul>
          </div>

          <div className="splash-menu-button" onClick={toggleMenu}>
            <button>{isMenuOpen ? "✕" : "☰"}</button>
          </div>
        </nav>
        <main className="splash-main">
          <section className="first-section">
            <div className="first-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2FabstractImageinsert.png?alt=media&token=2951defe-f44f-425c-b9f9-4c6cd8edbd60"
                alt=""
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
                <Link to="/user-home-page" className="enter-site-btn">
                  Start Now
                </Link>
              </div>
            </div>
          </section>

          <section ref={sectionRefs[1]} className="second-section">
            <div className="second-content">
              <h3>The Objective</h3>
              <p>
                Capture in-store displays. Upload images along with critical
                details like product names and quantities. Share with your team
                in real-time. Opt for company-exclusive visibility or share your
                success broadly with unique star tags. It’s your choice, your
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
                alt=""
              />
            </div>
          </section>

          <section ref={sectionRefs[2]} className="section-three">
            <div className="hero-content-left">
              <div className="features-image-box">
                <img
                  className="features-image"
                  // src="https://images.unsplash.com/photo-1563906267088-b029e7101114?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fgrocery-products.jpg?alt=media&token=67eb96e6-1a55-482d-92c3-5b3901ce4b3e"
                  alt=""
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
                beer to bread and everything in between..
              </p>
            </div>
          </section>

          <section
            ref={sectionRefs[3]}
            className="hero-content hero-full fourth-block"
            id="pricing"
          >
            <div className="hero-content-left fourth-insert">
              <h3>Pricing:</h3>
              <p>
                Our platform is committed to providing value at no cost to you.
                Premium features may become available in the future.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
                  Join for free
                </Link>
              </div>
            </div>
          </section>

          <section ref={sectionRefs[4]} className="fifth-section">
            <div className="fifth-content">
              <h3>Security and Compliance</h3>
              <p>
                Your security is our priority. Passwords are protected by
                Firebase, Google's trusted authentication service. Images are
                securely stored in Firestore, ensuring your data rests on
                reliable, world-class infrastructure.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
                  Sign Up Now
                </Link>
              </div>
            </div>
            <div className="fifth-image-box">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/retail-sight.appspot.com/o/assets%2Fearthdesign.png?alt=media&token=65c60866-6c35-4587-997b-a07042b900df"
                alt="secure earth"
              />
            </div>
          </section>

          <section ref={sectionRefs[5]} className="last-block">
            <div className="last-block">
              <h3>Start Now</h3>
              <p>
                Elevate your team’s performance, share your retail story today.
              </p>
              <div className="content-button-box">
                <Link to="/sign-up-login" className="enter-site-btn">
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
