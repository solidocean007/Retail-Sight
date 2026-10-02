import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { selectUser } from "../../Slices/userSlice";
import { SplashPageHelmet } from "../../utils/helmetConfigurations";
import "./splashPage.css";

const workflowSteps = [
  {
    number: "01",
    title: "Capture",
    copy: "Document the display where the work happens, with the account, brands, quantity, and field context attached.",
  },
  {
    number: "02",
    title: "Organize",
    copy: "Turn individual photos into a searchable visual record your team can filter by market, account, rep, goal, or product.",
  },
  {
    number: "03",
    title: "Act",
    copy: "Share wins, spot gaps, and give managers and partners a clearer view of retail execution while it is still relevant.",
  },
];

const SplashPage = () => {
  const user = useSelector(selectUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryPath = user ? "/user-home-page" : "/request-access";
  const primaryLabel = user ? "Open workspace" : "Request access";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    const revealElements = document.querySelectorAll(".dg-reveal");
    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const year = new Date().getFullYear();

  return (
    <div className="dg-splash-page">
      <SplashPageHelmet />

      <header className="dg-splash-header">
        <Link
          to="/splash"
          className="dg-splash-brand"
          aria-label="Displaygram home"
          onClick={closeMenu}
        >
          <picture>
            <source
              media="(max-width: 560px)"
              srcSet="/logos/displaygram-logo.svg"
            />
            <img src="/displaygram-logo-long-BLUE.png" alt="Displaygram" />
          </picture>
        </Link>

        <button
          type="button"
          className="dg-splash-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="splash-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="splash-navigation"
          className={`dg-splash-nav${menuOpen ? " is-open" : ""}`}
        >
          <a href="#product" onClick={closeMenu}>Product</a>
          <a href="#workflow" onClick={closeMenu}>How it works</a>
          <a href="#goals" onClick={closeMenu}>Goals</a>
          <a href="#sharing" onClick={closeMenu}>Sharing</a>
          <Link to="/pricing" onClick={closeMenu}>Pricing</Link>
          {user ? (
            <Link
              to="/user-home-page"
              className="dg-splash-nav-action"
              onClick={closeMenu}
            >
              Open app
            </Link>
          ) : (
            <Link
              to="/login"
              className="dg-splash-nav-action"
              onClick={closeMenu}
            >
              Log in
            </Link>
          )}
        </nav>
      </header>

      <main className="dg-splash-main">
        <section className="dg-splash-hero dg-reveal">
          <div className="dg-splash-hero-copy">
            <p className="dg-splash-eyebrow">
              Built for beverage teams in the field
            </p>
            <h1>
              Retail execution,
              <span> in focus.</span>
            </h1>
            <p className="dg-splash-lead">
              Capture display activity, keep field work organized, and give
              distributors and supplier partners one shared visual record of
              what is happening in market.
            </p>

            <div className="dg-splash-actions">
              <Link to={primaryPath} className="dg-splash-button is-primary">
                {primaryLabel}
                <span aria-hidden="true">→</span>
              </Link>
              {!user && (
                <Link to="/login" className="dg-splash-button is-secondary">
                  Log in
                </Link>
              )}
            </div>

            <ul className="dg-splash-proof-list" aria-label="Product strengths">
              <li>Photo-first reporting</li>
              <li>Searchable field history</li>
              <li>Partner-ready collaboration</li>
            </ul>
          </div>

          <figure className="dg-splash-hero-media">
            <img
              src="/splash/product/hero-field-audit.jpg"
              alt="A beverage representative reviewing the Displaygram mobile feed in a retail store"
              width="1536"
              height="1024"
              fetchPriority="high"
              decoding="async"
            />
            <figcaption>
              <span className="dg-splash-live-dot" aria-hidden="true" />
              Field activity, visible while it is still actionable
            </figcaption>
          </figure>
        </section>

        <section id="product" className="dg-splash-section dg-splash-product dg-reveal">
          <div className="dg-splash-section-heading">
            <p className="dg-splash-eyebrow">One visual workspace</p>
            <h2>From aisle photo to team visibility.</h2>
            <p>
              Displaygram keeps the image at the center while making the
              surrounding account, product, people, and goal context easy to find.
            </p>
          </div>

          <div className="dg-splash-product-stage">
            <figure className="dg-splash-desktop-shot">
              <div className="dg-splash-window-bar" aria-hidden="true">
                <span /><span /><span /><small>Live activity feed</small>
              </div>
              <img
                src="/splash/product/desktopFeed.PNG"
                alt="Displaygram desktop feed with a retail display and detailed filters"
                width="1705"
                height="939"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <figure className="dg-splash-mobile-shot">
              <img
                src="/splash/product/mobileFeed.PNG"
                alt="Displaygram mobile activity feed"
                width="460"
                height="866"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>

          <div className="dg-splash-feature-rail">
            <article>
              <span>Capture</span>
              <h3>Make the photo useful.</h3>
              <p>
                Connect each display to the right account, rep, products, and
                quantities instead of losing context in a camera roll.
              </p>
            </article>
            <article>
              <span>Find</span>
              <h3>Reach the work that matters.</h3>
              <p>
                Filter the feed by date, brand, account, user, tags, or goals
                without separating the record from the image.
              </p>
            </article>
            <article>
              <span>Collaborate</span>
              <h3>Keep partners aligned.</h3>
              <p>
                Share the right activity across connected companies while
                preserving who created it and where it came from.
              </p>
            </article>
          </div>
        </section>

        <section id="workflow" className="dg-splash-section dg-splash-workflow dg-reveal">
          <div className="dg-splash-section-heading is-compact">
            <p className="dg-splash-eyebrow">A simple field rhythm</p>
            <h2>Capture. Organize. Act.</h2>
          </div>

          <div className="dg-splash-workflow-grid">
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="goals" className="dg-splash-section dg-splash-split-section dg-reveal">
          <div className="dg-splash-split-copy">
            <p className="dg-splash-eyebrow">Goals & accountability</p>
            <h2>Turn activity into measurable execution.</h2>
            <p>
              Give teams a clear objective, see progress against assigned
              accounts, and review the actual submissions behind the number.
            </p>
            <ul className="dg-splash-check-list">
              <li>Live progress tied to field submissions</li>
              <li>Clear coverage and quota context</li>
              <li>Feedback grounded in the display itself</li>
            </ul>
          </div>

          <figure className="dg-splash-goals-shot">
            <img
              src="/splash/product/desktopGoals.PNG"
              alt="Displaygram goals dashboard showing completion and submission progress"
              width="1602"
              height="1009"
              loading="lazy"
              decoding="async"
            />
          </figure>
        </section>

        <section id="sharing" className="dg-splash-section dg-splash-share-section dg-reveal">
          <figure className="dg-splash-export-shot">
            <img
              src="/splash/product/export-display-card.jpg"
              alt="A shareable Displaygram display card with photo, quantity, brands, rep, and company details"
              width="1200"
              height="1571"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="dg-splash-split-copy">
            <p className="dg-splash-eyebrow">Built to travel</p>
            <h2>Take the win beyond the feed.</h2>
            <p>
              Turn a field submission into a polished, shareable display card
              with the image and key execution details already attached.
            </p>
            <div className="dg-splash-share-note">
              <strong>Share context, not just a photo.</strong>
              <span>
                Account, date, rep, company, quantity, and tracked brands stay
                connected to the work.
              </span>
            </div>
          </div>
        </section>

        <section className="dg-splash-trust-band dg-reveal">
          <div>
            <p className="dg-splash-eyebrow">Designed for real operations</p>
            <h2>Visibility with company boundaries intact.</h2>
          </div>
          <div className="dg-splash-trust-grid">
            <article>
              <strong>Company-aware</strong>
              <span>Workspaces keep internal and shared activity distinct.</span>
            </article>
            <article>
              <strong>Role-aware</strong>
              <span>Field, management, and partner workflows stay focused.</span>
            </article>
            <article>
              <strong>History-aware</strong>
              <span>Every display contributes to a durable market record.</span>
            </article>
          </div>
        </section>

        <section className="dg-splash-final-cta dg-reveal">
          <p className="dg-splash-eyebrow">See the market together</p>
          <h2>Ready to bring retail execution into focus?</h2>
          <p>
            Give your team a clearer way to capture, find, and share the work
            already happening in stores.
          </p>
          <div className="dg-splash-actions">
            <Link to={primaryPath} className="dg-splash-button is-primary">
              {primaryLabel}
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/pricing" className="dg-splash-button is-secondary">
              View pricing
            </Link>
          </div>
        </section>
      </main>

      <footer className="dg-splash-footer">
        <Link to="/splash" className="dg-splash-footer-brand">
          <img src="/logos/displaygram-logo.svg" alt="" />
          <span>Displaygram</span>
        </Link>
        <nav aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-service">Terms</Link>
          <Link to="/contact-us">Contact</Link>
        </nav>
        <small>© {year} Displaygram LLC. All rights reserved.</small>
      </footer>
    </div>
  );
};

export default SplashPage;
